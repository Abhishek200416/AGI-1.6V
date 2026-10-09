/**
 * matrix/terminal/terminal-fabric.js
 * MATRIX X1.1 — Real Terminal & Persistent Shell Fabric
 * 
 * Manages persistent CLI / terminal sessions with:
 * - Real stdout/stderr stream buffering
 * - Working directory tracking across directory changes
 * - Process lifecycle & timeout recovery
 * - Platform detection (PowerShell on Windows, bash/sh on POSIX)
 */

const os = require('os');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');
const { eventBus } = require('../events/event-bus');

class TerminalFabric {
  constructor() {
    this.platform = os.platform();
    this.defaultShell = this.platform === 'win32' ? 'powershell.exe' : '/bin/bash';
    this.sessions = new Map();
  }

  /**
   * Create or retrieve a persistent terminal session
   */
  getOrCreateSession(sessionId = 'default', initialCwd = null) {
    if (this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId);
    }

    const sessionCwd = initialCwd && fs.existsSync(initialCwd) ? initialCwd : process.cwd();
    const session = {
      sessionId,
      cwd: sessionCwd,
      shell: this.defaultShell,
      history: [],
      activeProcess: null,
      createdAt: new Date().toISOString()
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Execute a command within the persistent session context
   */
  async executeCommand(sessionId = 'default', command, options = {}) {
    const session = this.getOrCreateSession(sessionId, options.cwd);
    const timeoutMs = options.timeoutMs || 20000;
    const startTime = Date.now();

    if (eventBus && typeof eventBus.emitEvent === 'function') {
      eventBus.emitEvent('terminal.command.started', { sessionId, command, cwd: session.cwd });
    }

    // Check for explicit directory change command: 'cd path'
    const trimmed = command.trim();
    if (trimmed.startsWith('cd ') || trimmed.startsWith('Set-Location ')) {
      const targetPath = trimmed.replace(/^(cd|Set-Location)\s+["']?([^"']+)["']?$/i, '$2').trim();
      const resolved = path.isAbsolute(targetPath) ? targetPath : path.resolve(session.cwd, targetPath);
      if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
        session.cwd = resolved;
        const result = {
          command,
          stdout: `Changed directory to ${session.cwd}\n`,
          stderr: '',
          code: 0,
          cwd: session.cwd,
          durationMs: Date.now() - startTime
        };
        session.history.push(result);
        return result;
      }
    }

    return new Promise((resolve) => {
      let stdoutBuf = '';
      let stderrBuf = '';
      let timedOut = false;

      const shellArgs = this.platform === 'win32'
        ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command]
        : ['-c', command];

      let child;
      try {
        child = spawn(session.shell, shellArgs, {
          cwd: session.cwd,
          env: { ...process.env, ...(options.env || {}) },
          windowsHide: true
        });
      } catch (err) {
        return resolve({
          command,
          stdout: '',
          stderr: err.message,
          code: 1,
          cwd: session.cwd,
          error: err.message,
          durationMs: Date.now() - startTime
        });
      }

      session.activeProcess = child;

      const timer = setTimeout(() => {
        timedOut = true;
        try {
          if (this.platform === 'win32') {
            execSync(`taskkill /F /T /PID ${child.pid}`, { stdio: 'ignore' });
          } else {
            child.kill('SIGKILL');
          }
        } catch (e) {}
      }, timeoutMs);

      child.stdout.on('data', (data) => {
        stdoutBuf += data.toString();
        if (typeof options.onStdout === 'function') {
          options.onStdout(data.toString());
        }
      });

      child.stderr.on('data', (data) => {
        stderrBuf += data.toString();
        if (typeof options.onStderr === 'function') {
          options.onStderr(data.toString());
        }
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        session.activeProcess = null;
        resolve({
          command,
          stdout: stdoutBuf,
          stderr: stderrBuf + '\n' + err.message,
          code: 1,
          cwd: session.cwd,
          error: err.message,
          durationMs: Date.now() - startTime
        });
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        session.activeProcess = null;
        const durationMs = Date.now() - startTime;
        const finalCode = timedOut ? 124 : (code ?? 0);

        const executionRecord = {
          command,
          stdout: stdoutBuf,
          stderr: timedOut ? (stderrBuf + '\n[ERROR: COMMAND_TIMED_OUT]') : stderrBuf,
          code: finalCode,
          cwd: session.cwd,
          timedOut,
          durationMs
        };

        session.history.push(executionRecord);

        if (eventBus && typeof eventBus.emitEvent === 'function') {
          eventBus.emitEvent('terminal.command.completed', {
            sessionId,
            command,
            code: finalCode,
            durationMs
          });
        }

        resolve(executionRecord);
      });
    });
  }

  /**
   * Abort stuck process in session
   */
  abortSession(sessionId = 'default') {
    const session = this.sessions.get(sessionId);
    if (session && session.activeProcess) {
      try {
        if (this.platform === 'win32') {
          execSync(`taskkill /F /T /PID ${session.activeProcess.pid}`, { stdio: 'ignore' });
        } else {
          session.activeProcess.kill('SIGKILL');
        }
        session.activeProcess = null;
        return { aborted: true };
      } catch (e) {
        return { aborted: false, error: e.message };
      }
    }
    return { aborted: false, reason: 'NO_ACTIVE_PROCESS' };
  }

  getSessionCwd(sessionId = 'default') {
    const session = this.sessions.get(sessionId);
    return session ? session.cwd : process.cwd();
  }

  getSessionHistory(sessionId = 'default') {
    const session = this.sessions.get(sessionId);
    return session ? session.history : [];
  }
}

const terminalFabric = new TerminalFabric();

module.exports = {
  TerminalFabric,
  terminalFabric
};
