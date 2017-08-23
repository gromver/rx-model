import Message from './Message';
import { Map } from 'immutable';

export default class Validator {
  /**
   * Message instance creator
   * @param {string} message
   * @param {{}} bindings
   * @returns {Message}
   */
  static createMessage(message, bindings) {
    return new Message(message, bindings);
  }

  /**
   * Validator.createMessage wrapper for using in object context
   * @param {string} message
   * @param {{}} bindings
   * @returns {Message}
   */
  createMessage(message, bindings) {
    return Validator.createMessage(message, bindings);
  }

  /**
   * Validate the value
   * @param {*} value
   * @param {string} attribute
   * @param {Model} model
   * @returns {Promise.<T>}
   */
  validate(value, attribute, model) {
    return Promise.resolve();
  }

  /**
   * Is the validator safe?
   * @returns {boolean}
   */
  isSafe() {
    return true;
  }

  /**
   * Compare validators
   * @param {Validator} a
   * @param {Validator} b
   * @returns {boolean}
   */
  static is(a, b) {
    if (a === b) return true;

    if (a instanceof Validator && b instanceof Validator && a.constructor === b.constructor) {
      return a.equals(b);
    }

    return false;
  }

  __hash;
  __getTrueValue;
  __isCached = true;

  // behavior modifiers
  /**
   * Enable/disable caching
   * @param bool
   * @returns {Validator}
   */
  cache(bool) {
    this.__isCached = bool;

    return this;
  }

  /**
   * Ignore disabled cache behavior in milliseconds period
   * @param milliseconds
   * @returns {Validator}
   */
  duration(milliseconds) {
    if (milliseconds) {
      this.__getTrueValue = this.throttledTrueValue(milliseconds);
    } else {
      this.__getTrueValue = undefined;
    }

    return this;
  }

  // valueObject interface implementation
  equals(other) {
    if (this.hashCode() === other.hashCode()) {
      const isCached = this.__isCached && other.__isCached,
        getTrueValue = this.__getTrueValue || other.__getTrueValue;

      return isCached ? true : (getTrueValue ? getTrueValue() : false);
    }
    return false;
  }

  throttledTrueValue(duration) {
    let isThrottled = false;

    return () => {
      if (!isThrottled) {
        isThrottled = true;

        setTimeout(() => {
          isThrottled = false;
        }, duration);

        return false;
      }
      return true;
    };
  }

  /**
   * Generate hash code for the validator comparing
   * @returns {*}
   */
  hashCode() {
    if (this.__hash) {
      return this.__hash;
    }
    const props = {};

    const exclude = /^__/;

    Object.entries(this).forEach(([k, v]) => {
      if (!exclude.test(k)) {
        props[k] = v;
      }
    });

    const map = new Map(props);

    return this.__hash = map.hashCode();
  }
}
