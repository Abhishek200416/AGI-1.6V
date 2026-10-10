/**
 * agi/finance/paper-trading-simulator.js
 * AGI 0.7 — Paper-Trading & Market Intelligence Simulator
 * 
 * Strict simulated paper-trading safe harbor with realistic order execution,
 * slippage modeling, risk limits, and emergency kill switches.
 * ZERO REAL-MONEY BROKERAGE KEYS OR LIVE TRADING PERMITTED.
 */

class PaperTradingSimulator {
  constructor(initialCash = 100000) {
    this.initialCash = initialCash;
    this.cash = initialCash;
    this.positions = {};
    this.orderHistory = [];
    this.tradeLog = [];
    this.emergencyKillSwitchActive = false;
    this.maxPositionAllocationPercent = 0.20; // Max 20% capital in single asset
  }

  activateKillSwitch() {
    this.emergencyKillSwitchActive = true;
    return { killSwitch: true, message: 'EMERGENCY_KILL_SWITCH_ACTIVE: All simulated market activity halted.' };
  }

  deactivateKillSwitch() {
    this.emergencyKillSwitchActive = false;
    return { killSwitch: false, message: 'Kill switch cleared.' };
  }

  /**
   * Submit simulated order with realistic slippage and broker fees
   */
  submitOrder({
    symbol,
    side, // 'BUY' | 'SELL'
    orderType = 'MARKET', // 'MARKET' | 'LIMIT'
    units,
    currentPrice,
    limitPrice = null,
    slippageRate = 0.0005, // 5 bps default slippage
    feeRate = 0.001        // 10 bps broker fee
  }) {
    if (this.emergencyKillSwitchActive) {
      return { success: false, reason: 'EMERGENCY_KILL_SWITCH_ACTIVE' };
    }

    if (!symbol || !units || units <= 0 || !currentPrice || currentPrice <= 0) {
      return { success: false, reason: 'INVALID_ORDER_PARAMETERS' };
    }

    // Limit order check
    if (orderType === 'LIMIT') {
      if (side === 'BUY' && currentPrice > limitPrice) {
        return { success: false, reason: 'LIMIT_PRICE_UNFILLED', currentPrice, limitPrice };
      }
      if (side === 'SELL' && currentPrice < limitPrice) {
        return { success: false, reason: 'LIMIT_PRICE_UNFILLED', currentPrice, limitPrice };
      }
    }

    const effectivePrice = side === 'BUY' 
      ? currentPrice * (1 + slippageRate) 
      : currentPrice * (1 - slippageRate);
    
    const grossValue = units * effectivePrice;
    const fee = grossValue * feeRate;

    // Capital & position checks
    if (side === 'BUY') {
      const totalCost = grossValue + fee;
      if (this.cash < totalCost) {
        return { success: false, reason: 'INSUFFICIENT_FUNDS', required: totalCost, available: this.cash };
      }

      const totalEquity = this.getPortfolioValue({ [symbol]: currentPrice });
      if (grossValue > totalEquity * this.maxPositionAllocationPercent) {
        return { success: false, reason: 'EXCEEDS_MAX_POSITION_ALLOCATION', maxAllowed: totalEquity * this.maxPositionAllocationPercent };
      }

      this.cash -= totalCost;
      this.positions[symbol] = (this.positions[symbol] || 0) + units;
    } else {
      const currentHoldings = this.positions[symbol] || 0;
      if (currentHoldings < units) {
        return { success: false, reason: 'INSUFFICIENT_HOLDINGS', currentHoldings, requested: units };
      }

      this.positions[symbol] -= units;
      this.cash += (grossValue - fee);
    }

    const tradeRecord = {
      orderId: `ORD-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      symbol,
      side,
      orderType,
      units,
      executionPrice: Math.round(effectivePrice * 100) / 100,
      fee: Math.round(fee * 100) / 100,
      timestamp: new Date().toISOString()
    };

    this.tradeLog.push(tradeRecord);
    return {
      success: true,
      tradeRecord,
      portfolio: {
        cash: Math.round(this.cash * 100) / 100,
        positions: { ...this.positions }
      }
    };
  }

  getPortfolioValue(marketPrices = {}) {
    let positionValue = 0;
    for (const [sym, units] of Object.entries(this.positions)) {
      const price = marketPrices[sym] || 0;
      positionValue += units * price;
    }
    return this.cash + positionValue;
  }

  calculateRiskMetrics({ winRate = 0.55, payoffRatio = 1.5, riskPerTradePercent = 0.02 }) {
    const lossRate = 1 - winRate;
    const edge = (winRate * payoffRatio) - lossRate;
    const kellyFraction = edge / payoffRatio;

    // Mathematical risk of ruin
    const a = (1 - edge) / (1 + edge);
    const unitsOfCapital = Math.floor(1 / riskPerTradePercent);
    const riskOfRuin = Math.min(1.0, Math.pow(Math.max(0.01, a), Math.min(unitsOfCapital, 50)));

    return {
      winRate,
      payoffRatio,
      expectedEdge: Math.round(edge * 1000) / 1000,
      kellyFraction: Math.round(kellyFraction * 1000) / 1000,
      riskOfRuinPercent: Math.round(riskOfRuin * 10000) / 100,
      verdict: edge > 0 ? 'POSITIVE_EXPECTANCY' : 'NEGATIVE_EXPECTANCY'
    };
  }
}

module.exports = { PaperTradingSimulator };
