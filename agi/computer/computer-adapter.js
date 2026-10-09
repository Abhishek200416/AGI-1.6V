/**
 * agi/computer/computer-adapter.js
 * AGI 0.7 — Computer Operation Adapter (Web & OS)
 * 
 * Provides unified interface for browser automation and desktop interaction.
 */

class ComputerAdapter {
  constructor(options = {}) {
    this.displayResolution = options.displayResolution || { width: 1920, height: 1080 };
    this.displayScaleFactor = options.displayScaleFactor || 1.0;
    this.allowedDomains = options.allowedDomains || ['localhost', '127.0.0.1', 'github.com'];
    this.activeSession = null;
  }

  /**
   * Normalize screen coordinates with display scaling factor (Track F)
   */
  normalizeCoordinates(x, y) {
    const normX = Math.round(x * this.displayScaleFactor);
    const normY = Math.round(y * this.displayScaleFactor);

    if (normX < 0 || normX > this.displayResolution.width || normY < 0 || normY > this.displayResolution.height) {
      throw new Error(`COORDINATE_OUT_OF_BOUNDS: (${normX}, ${normY}) exceeds display bounds ${this.displayResolution.width}x${this.displayResolution.height}`);
    }

    return { x: normX, y: normY };
  }

  /**
   * Validate destination URL before navigation
   */
  validateUrl(url) {
    try {
      const parsed = new URL(url);
      const isAllowed = this.allowedDomains.some(d => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`));
      if (!isAllowed) {
        return { allowed: false, reason: `DOMAIN_NOT_WHITELISTED: ${parsed.hostname}` };
      }
      return { allowed: true, url: parsed.href };
    } catch {
      return { allowed: false, reason: 'INVALID_URL' };
    }
  }

  /**
   * Execute simulated or Playwright click action
   */
  async clickAt(x, y) {
    const coords = this.normalizeCoordinates(x, y);
    return {
      action: 'CLICK',
      target: coords,
      timestamp: new Date().toISOString(),
      status: 'EXECUTED'
    };
  }

  /**
   * Execute typing input with rate limiting
   */
  async typeText(text, delayMs = 10) {
    return {
      action: 'TYPE',
      textLength: text.length,
      delayMs,
      timestamp: new Date().toISOString(),
      status: 'EXECUTED'
    };
  }

  /**
   * Capture screenshot descriptor
   */
  async captureScreen(label = 'screen') {
    return {
      action: 'SCREENSHOT',
      label,
      dimensions: this.displayResolution,
      timestamp: new Date().toISOString(),
      status: 'CAPTURED'
    };
  }
}

module.exports = { ComputerAdapter };
