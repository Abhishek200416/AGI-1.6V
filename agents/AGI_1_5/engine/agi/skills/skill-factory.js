/**
 * agi/skills/skill-factory.js
 * AGI 0.7 — Skill Synthesis Factory
 * 
 * Synthesizes candidate skills from execution traces and generates verification fixtures.
 */

class SkillFactory {
  constructor(registry) {
    this.registry = registry;
  }

  synthesizeSkill({ id, name, description, codeString, testInputs = [], expectedOutputs = [] }) {
    const skill = this.registry.registerSkill({
      id,
      name,
      description,
      implementation: codeString
    });

    this.registry.transitionStatus(id, 'CANDIDATE');

    // Attach tests
    for (let i = 0; i < testInputs.length; i++) {
      this.registry.addTest(id, {
        input: testInputs[i],
        expected: expectedOutputs[i]
      });
    }

    return skill;
  }

  executeSkill(skill, input) {
    // Isolated evaluation
    const fn = new Function('input', `
      ${skill.implementation}
      if (typeof run === 'function') return run(input);
      throw new Error('Skill implementation must define a run(input) function');
    `);
    return fn(input);
  }

  testAndPromote(skillId) {
    const testRunner = (skill, test) => {
      try {
        const actual = this.executeSkill(skill, test.input);
        const pass = JSON.stringify(actual) === JSON.stringify(test.expected);
        return { pass, actual, expected: test.expected };
      } catch (err) {
        return { pass: false, error: err.message };
      }
    };

    this.registry.validateSkill(skillId, testRunner);
    return this.registry.promoteToActive(skillId);
  }
}

module.exports = { SkillFactory };
