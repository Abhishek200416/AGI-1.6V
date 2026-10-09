/**
 * matrix/evaluation/outcome-verifier.js
 * MATRIX X1.1 — Empirical Outcome Verifier
 * 
 * Verifies final deliverable against ground truth assertions:
 * - Exact string / object equality
 * - Numerical tolerance checks
 * - Regex pattern matches
 * - Executable test validation
 * - Anti-fabrication & groundability audit
 */

class OutcomeVerifier {
  /**
   * Verify an outcome against a specification
   */
  verify(actual, expectedCriteria = {}) {
    const checks = [];
    let passed = true;

    // 1. Exact Value Check
    if (expectedCriteria.exact !== undefined) {
      const match = JSON.stringify(actual) === JSON.stringify(expectedCriteria.exact);
      checks.push({ type: 'EXACT_MATCH', passed: match, expected: expectedCriteria.exact, actual });
      if (!match) passed = false;
    }

    // 2. Numerical Tolerance Check
    if (expectedCriteria.numericTarget !== undefined) {
      const actualNum = typeof actual === 'number' ? actual : parseFloat(actual);
      const targetNum = expectedCriteria.numericTarget;
      const tolerance = expectedCriteria.tolerance || 0.001;
      const diff = Math.abs(actualNum - targetNum);
      const isWithin = !isNaN(actualNum) && diff <= tolerance;
      checks.push({
        type: 'NUMERIC_TOLERANCE',
        passed: isWithin,
        target: targetNum,
        actual: actualNum,
        diff,
        tolerance
      });
      if (!isWithin) passed = false;
    }

    // 3. Regex Match Check
    if (expectedCriteria.regexPattern) {
      const re = new RegExp(expectedCriteria.regexPattern);
      const strActual = typeof actual === 'string' ? actual : JSON.stringify(actual);
      const matches = re.test(strActual);
      checks.push({ type: 'REGEX_PATTERN', passed: matches, pattern: expectedCriteria.regexPattern });
      if (!matches) passed = false;
    }

    // 4. Required Substrings / Keywords Check
    if (Array.isArray(expectedCriteria.requiredKeywords)) {
      const strActual = (typeof actual === 'string' ? actual : JSON.stringify(actual)).toLowerCase();
      const missingKeywords = [];
      for (const kw of expectedCriteria.requiredKeywords) {
        if (!strActual.includes(kw.toLowerCase())) {
          missingKeywords.push(kw);
        }
      }
      const allFound = missingKeywords.length === 0;
      checks.push({
        type: 'REQUIRED_KEYWORDS',
        passed: allFound,
        missing: missingKeywords
      });
      if (!allFound) passed = false;
    }

    // 5. Custom Evaluator Function
    if (typeof expectedCriteria.customVerifier === 'function') {
      try {
        const customRes = expectedCriteria.customVerifier(actual);
        const customPass = customRes === true || (customRes && customRes.passed === true);
        checks.push({ type: 'CUSTOM_VERIFIER', passed: customPass, details: customRes });
        if (!customPass) passed = false;
      } catch (err) {
        checks.push({ type: 'CUSTOM_VERIFIER', passed: false, error: err.message });
        passed = false;
      }
    }

    // 6. Anti-Hallucination / Groundability Check
    if (expectedCriteria.groundingContext) {
      const groundPass = this.verifyGrounding(actual, expectedCriteria.groundingContext);
      checks.push({ type: 'GROUNDING_AUDIT', passed: groundPass.passed, score: groundPass.groundingScore });
      if (!groundPass.passed) passed = false;
    }

    const totalChecks = checks.length;
    const passedChecks = checks.filter(c => c.passed).length;
    const score = totalChecks > 0 ? (passedChecks / totalChecks) : (passed ? 1.0 : 0.0);

    return {
      passed: passed && score >= 0.99,
      verdict: passed ? 'PASS' : (passedChecks > 0 ? 'PARTIAL' : 'FAIL'),
      score: Number(score.toFixed(4)),
      totalChecks,
      passedChecks,
      checks
    };
  }

  /**
   * Verify output claims are supported by context without hallucinated fabrications
   */
  verifyGrounding(output, context) {
    if (!context || !output) return { passed: true, groundingScore: 1.0 };
    const strContext = typeof context === 'string' ? context.toLowerCase() : JSON.stringify(context).toLowerCase();
    const strOutput = typeof output === 'string' ? output : JSON.stringify(output);

    // Extract capitalized proper nouns or specific numbers > 3 digits, excluding common stop words
    const stopWords = new Set(['the', 'a', 'an', 'this', 'that', 'these', 'those', 'it', 'its', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'and', 'or', 'if', 'then']);
    const rawMatches = strOutput.match(/\b([A-Z][a-z0-9_]+|\d{4,})\b/g) || [];
    const specificEntities = rawMatches.filter(m => !stopWords.has(m.toLowerCase()));
    if (specificEntities.length === 0) return { passed: true, groundingScore: 1.0 };

    let groundedCount = 0;
    for (const ent of specificEntities) {
      if (strContext.includes(ent.toLowerCase())) {
        groundedCount++;
      }
    }

    const score = groundedCount / specificEntities.length;
    return {
      passed: score >= 0.70,
      groundingScore: Number(score.toFixed(4)),
      totalEntities: specificEntities.length,
      groundedEntities: groundedCount
    };
  }
}

const outcomeVerifier = new OutcomeVerifier();

module.exports = {
  OutcomeVerifier,
  outcomeVerifier
};
