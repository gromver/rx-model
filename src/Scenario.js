export default class Scenario {
  static APPLY_IN = 'IN';
  static APPLY_EXCEPT = 'EXCEPT';

  /**
   * Determines when to apply or not the validator
   * @type {string}
   */
  apply = Scenario.APPLY_EXCEPT;

  /**
   * A list of scenarios for which provided validator will be applied or not (see apply property)
   * @type {Array}
   */
  scenarios = [];

  /**
   * Rule description
   * @type {Validator|function|boolean}
   */
  validator;

  /**
   *
   * @param {string} apply - one of 'IN' or 'EXCEPT'
   * @param {Array<string>} scenarios
   * @param {Validator|function|boolean} validator - rule description (see Model.rules)
   */
  constructor(apply, scenarios, validator) {
    if (!(apply === Scenario.APPLY_EXCEPT || apply === Scenario.APPLY_IN)) {
      throw new Error('Scenario::constructor apply property has invalid value');
    }

    if (!Array.isArray(scenarios)) {
      throw new Error('Scenario::constructor scenarios property must be an array');
    }

    if (!validator) {
      throw new Error('Scenario::constructor validator property must be set');
    }

    this.apply = apply;
    this.scenarios = scenarios;
    this.validator = validator;
  }

  /**
   * Fast creating of a Scenario instance with the Scenario.APPLY_IN behavior
   * @param {Array<string>} scenarios
   * @param {Validator|function|boolean} validator - rule description (see Model.rules)
   * @returns {Scenario}
   */
  static in(scenarios, validator) {
    return new Scenario(Scenario.APPLY_IN, scenarios, validator);
  }

  /**
   * Fast creating of a Scenario instance with the Scenario.APPLY_EXCEPT behavior
   * @param {Array<string>} scenarios
   * @param {Validator|function|boolean} validator - rule description (see Model.rules)
   * @returns {Scenario}
   */
  static except(scenarios, validator) {
    return new Scenario(Scenario.APPLY_EXCEPT, scenarios, validator);
  }
}
