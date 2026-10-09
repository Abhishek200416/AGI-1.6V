/**
 * matrix/models/antigravity-provider.js
 * MATRIX X1.1 — Antigravity-Native CLI Model Provider
 * 
 * Invokes the installed Antigravity CLI (`agy.exe`) using safe process spawning
 * with explicit argument arrays (no shell interpolation), streaming JSON responses,
 * token accounting, and strict secret scrubbing.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { securityKernel } = require('../kernel/security-kernel');
const { tokenEconomy } = require('../economy/token-economy');

class AntigravityCliProvider {
  constructor(options = {}) {
    this.cliPath = options.cliPath || this.detectCliPath();
    this.defaultModelSlug = options.defaultModelSlug || 'gemini-3.8-flash-low';
    this.cachedModels = null;
    this.authenticated = null;
  }

  /**
   * Detect installed agy executable path
   */
  detectCliPath() {
    const localAppData = process.env.LOCALAPPDATA || '';
    const candidatePath = path.join(localAppData, 'agy', 'bin', 'agy.exe');
    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }
    return 'agy.exe'; // Fall back to PATH lookup
  }

  /**
   * Discover and list models via `agy models`
   */
  async listModels(timeoutMs = 15000) {
    if (this.cachedModels) return this.cachedModels;

    return new Promise((resolve, reject) => {
      const child = spawn(this.cliPath, ['models'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
        shell: false
      });

      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => {
        child.kill();
        resolve({ success: false, error: 'TIMEOUT_DISCOVERING_MODELS', models: [] });
      }, timeoutMs);

      child.stdout.on('data', d => { stdout += d.toString(); });
      child.stderr.on('data', d => { stderr += d.toString(); });

      child.on('close', code => {
        clearTimeout(timer);
        if (code !== 0) {
          resolve({
            success: false,
            exitCode: code,
            error: securityKernel.scrubSecrets(stderr || stdout),
            models: []
          });
          return;
        }

        const lines = stdout.split('\n');
        const models = [];
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('Fetching')) continue;
          const [slug, ...rest] = trimmed.split('\t');
          if (slug) {
            models.push({ slug: slug.trim(), name: rest.join(' ').trim() || slug.trim() });
          }
        }

        this.cachedModels = models;
        this.authenticated = models.length > 0;
        resolve({
          success: true,
          exitCode: 0,
          models,
          authenticated: this.authenticated
        });
      });

      child.on('error', err => {
        clearTimeout(timer);
        resolve({
          success: false,
          error: securityKernel.scrubSecrets(err.message),
          models: []
        });
      });
    });
  }

  /**
   * Execute headless prompt using Antigravity CLI with JSON output format
   */
  async callModel({
    model = 'gemini-3.8-flash-low',
    prompt = '',
    timeoutMs = null,
    temperature = 0.2
  }) {
    const startTime = Date.now();
    const scrubbedPrompt = securityKernel.scrubSecrets(prompt);

    // Map common aliases to real agy model slugs
    let targetSlug = model;
    if (model === 'gemini-3.8-flash' || model === 'gemini-flash') {
      targetSlug = 'gemini-3.8-flash-low';
    } else if (model === 'gemini-3.8-pro' || model === 'gemini-pro') {
      targetSlug = 'gemini-3.1-pro-high';
    }

    // Calibrate timeout for high-effort reasoning (Directive 0 & ADR-02)
    const effectiveTimeoutMs = timeoutMs !== null ? timeoutMs : (targetSlug.includes('high') || targetSlug.includes('pro') ? 120000 : 60000);

    const args = [
      '--model', targetSlug,
      '--disable-slash-commands',
      '--print', scrubbedPrompt,
      '--output-format', 'json'
    ];

    if (effectiveTimeoutMs > 0) {
      args.push('--print-timeout', `${Math.round(effectiveTimeoutMs / 1000)}s`);
    }

    return new Promise((resolve) => {
      let child;
      try {
        child = spawn(this.cliPath, args, {
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
          shell: false
        });
      } catch (spawnErr) {
        return resolve({
          success: false,
          provider: 'Antigravity CLI',
          actualModelSlug: targetSlug,
          authenticated: false,
          exitCode: -1,
          output: null,
          tokensUsed: 0,
          latencyMs: Date.now() - startTime,
          error: securityKernel.scrubSecrets(spawnErr.message),
          timestamp: new Date().toISOString()
        });
      }

      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => {
        try { child.kill(); } catch (e) {}
        resolve({
          success: false,
          provider: 'Antigravity CLI',
          actualModelSlug: targetSlug,
          authenticated: true,
          exitCode: -1,
          output: null,
          tokensUsed: 0,
          latencyMs: Date.now() - startTime,
          error: `CLI execution timed out after ${effectiveTimeoutMs}ms`,
          timestamp: new Date().toISOString()
        });
      }, effectiveTimeoutMs + 2000);

      child.stdout.on('data', d => { stdout += d.toString(); });
      child.stderr.on('data', d => { stderr += d.toString(); });

      child.on('close', code => {
        clearTimeout(timer);
        const elapsedMs = Date.now() - startTime;

        if (code !== 0) {
          const errMsg = securityKernel.scrubSecrets(stderr || stdout || `Process exited with code ${code}`);
          return resolve({
            success: false,
            provider: 'Antigravity CLI',
            actualModelSlug: targetSlug,
            authenticated: !errMsg.includes('not authenticated') && !errMsg.includes('login'),
            exitCode: code,
            output: null,
            tokensUsed: 0,
            latencyMs: elapsedMs,
            error: errMsg,
            timestamp: new Date().toISOString()
          });
        }

        try {
          const parsed = JSON.parse(stdout.trim());
          const isSuccess = parsed.status === 'SUCCESS';
          let rawResponse = parsed.response || '';
          if (!rawResponse.trim()) {
            if (parsed.denied_actions && parsed.denied_actions.length > 0) {
              const actions = parsed.denied_actions.map(a => a.display_name || a.action).join(', ');
              rawResponse = `[Action executed/denied: ${actions}]`;
            } else if (parsed.usage?.output_tokens > 0) {
              rawResponse = `[Model response completed (${parsed.usage.output_tokens} tokens)]`;
            }
          }
          const scrubbedResponse = securityKernel.scrubSecrets(rawResponse.trim());
          const inputTokens = parsed.usage?.input_tokens || Math.round(prompt.length / 4);
          const outputTokens = parsed.usage?.output_tokens || Math.round(scrubbedResponse.length / 4);
          const totalTokens = parsed.usage?.total_tokens || (inputTokens + outputTokens);
          const durationSeconds = parsed.duration_seconds || (elapsedMs / 1000);
          const reportedLatency = Math.round(durationSeconds * 1000);

          // Record token economy
          tokenEconomy.recordUsage({
            model: targetSlug,
            inputTokens,
            outputTokens
          });

          return resolve({
            success: isSuccess,
            provider: 'Antigravity CLI',
            actualModelSlug: targetSlug,
            authenticated: true,
            exitCode: 0,
            conversationId: parsed.conversation_id,
            output: scrubbedResponse,
            tokensUsed: totalTokens,
            inputTokens,
            outputTokens,
            thinkingTokens: parsed.usage?.thinking_tokens || 0,
            latencyMs: reportedLatency,
            error: isSuccess ? null : (parsed.error || 'Execution status not SUCCESS'),
            timestamp: new Date().toISOString()
          });
        } catch (jsonErr) {
          // If stdout was not JSON, fallback to scrubbed plain text if non-empty
          const rawText = stdout.trim();
          if (rawText) {
            return resolve({
              success: true,
              provider: 'Antigravity CLI',
              actualModelSlug: targetSlug,
              authenticated: true,
              exitCode: 0,
              output: securityKernel.scrubSecrets(rawText),
              tokensUsed: Math.round((prompt.length + rawText.length) / 4),
              latencyMs: elapsedMs,
              error: null,
              timestamp: new Date().toISOString()
            });
          }

          return resolve({
            success: false,
            provider: 'Antigravity CLI',
            actualModelSlug: targetSlug,
            authenticated: true,
            exitCode: code,
            output: null,
            tokensUsed: 0,
            latencyMs: elapsedMs,
            error: `Failed to parse CLI output: ${securityKernel.scrubSecrets(jsonErr.message)}`,
            timestamp: new Date().toISOString()
          });
        }
      });

      child.on('error', err => {
        clearTimeout(timer);
        resolve({
          success: false,
          provider: 'Antigravity CLI',
          actualModelSlug: targetSlug,
          authenticated: false,
          exitCode: -1,
          output: null,
          tokensUsed: 0,
          latencyMs: Date.now() - startTime,
          error: securityKernel.scrubSecrets(err.message),
          timestamp: new Date().toISOString()
        });
      });
    });
  }
}

const antigravityCliProvider = new AntigravityCliProvider();

module.exports = {
  AntigravityCliProvider,
  antigravityCliProvider
};
