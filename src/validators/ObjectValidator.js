import Validator from './Validator';
import utils from '../utils';

export default class ObjectValidator extends Validator {
  static MESSAGE = '{attribute} - must be an object';

  validate(value, attribute, model) {
    // Undefined values are fine
    if (value === undefined) {
      return Promise.resolve();
    }

    if (value.constructor !== Object) {
      return Promise.reject(this.createMessage(this.message || ObjectValidator.MESSAGE, {
        attribute,
      }));
    }

    return Promise.resolve();
  }
}

