import { is } from 'immutable';
import { PendingState, SuccessState, WarningState, ErrorState } from './states';

/**
 * ValidationTracker validates models's attribute and caches last state of validation for each
 * processed attribute. ValidationTracker re-uses cached states when both conditions are passed:
 * 1. Attribute's values are not changed
 * 2. Attribute's validators are not changed (see Validator.is())
 */
export default class ValidationTracker {
  constructor(onPushState) {
    this.onPushState = onPushState;
  }

  cache = {};
  state = {};

  onPushState;

  /**
   * Validate model's attribute. If at the moment of validation previous validation process
   * for the same attribute is not finished (PendingState), that process is skipped.
   * @param {Model} model
   * @param {string} attribute
   * @param {Validator} validator
   * @returns {Promise<State>}
   */
  validateAttribute(model, attribute, validator) {
    const cached = this.getAttributeCache(attribute);
    const value = model.get(attribute);

    let isChanged = true;

    if (cached) {
      const [cachedValue, cachedValidator] = cached;

      isChanged = !is(value, cachedValue) || !is(validator, cachedValidator);
    }

    if (isChanged) {
      let skip = false;

      const curState = this.getAttributeState(attribute);

      if (curState instanceof PendingState) {
        curState.abort();
      }

      const job = validator.validate(value, attribute, model).then((warningMessage) => {
        if (!skip) {
          const state = warningMessage ? new WarningState({
            attribute,
            message: warningMessage,
          }) : new SuccessState({
            attribute,
          });

          this.setAttributeCache(attribute, value, validator);

          this.setAttributeState(attribute, state);

          this.pushState(state);

          return state;
        }
      }).catch((errorMessage) => {
        if (!skip) {
          const state = new ErrorState({
            attribute,
            message: errorMessage,
          });

          this.setAttributeCache(attribute, value, validator);

          this.setAttributeState(attribute, state);

          this.pushState(state);

          return state;
        }
      });

      Promise.race([job, new Promise(r => setTimeout(() => r(new PendingState({
        attribute,
      }, () => skip = true)), 0))]).then((state) => {
        if (state instanceof PendingState) {
          this.setAttributeState(attribute, state);

          this.pushState(state);
        }
      });

      return job;
    }

    const cachedState = this.getAttributeState(attribute);

    this.pushState(cachedState);

    return Promise.resolve(cachedState);
  }

  /**
   * Push new validation state
   * @param {State} changes
   */
  pushState(changes) {
    this.onPushState && this.onPushState(changes);
  }

  /**
   * Set attribute validation state
   * @param {string} attribute
   * @param {PendingState|SuccessState|WarningState|ErrorState} state
   */
  setAttributeState(attribute, state) {
    this.state[attribute] = state;
  }

  /**
   * Get attribute validation state
   * @param {string} attribute
   * @returns {PendingState|SuccessState|WarningState|ErrorState}
   */
  getAttributeState(attribute) {
    return this.state[attribute];
  }


  /**
   * Set attribute cache
   * @param {string} attribute
   * @param {*} value
   * @param {Validator} validator
   */
  setAttributeCache(attribute, value, validator) {
    this.cache[attribute] = [value, validator];
  }

  /**
   * Get attribute cache
   * @param {string} attribute
   * @return {Array} [attrValue, attrValidator]
   */
  getAttributeCache(attribute) {
    return this.cache[attribute];
  }
}