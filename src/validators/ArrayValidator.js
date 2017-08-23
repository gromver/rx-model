import Validator from './Validator';
import utils from '../utils';

export default class ArrayValidator extends Validator {
  static MESSAGE = '{attribute} - must be an array';
  static MESSAGE_MIN_LENGTH = '{attribute} - has not enough elements in the array (minimum is {count})';
  static MESSAGE_MAX_LENGTH = '{attribute} - has too many elements in the array (maximum is {count})';

  constructor({
                    message,
                    messageMaxLength,
                    messageMinLength,
                    maxLength,
                    minLength,
    } = {}) {
    super();

    this.message = message;
    this.messageMaxLength = messageMaxLength;
    this.messageMinLength = messageMinLength;
    this.maxLength = maxLength;
    this.minLength = minLength;
  }

  validate(value, attribute, model) {
    // Undefined values are fine
    if (value === undefined) {
      return Promise.resolve();
    }

    if (!utils.isArray(value)) {
      return Promise.reject(this.createMessage(this.message || ArrayValidator.MESSAGE, {
        attribute,
      }));
    }

    const length = value.length;

    if (this.minLength && utils.isNumber(this.minLength) && !(length >= this.minLength)) {
      return Promise.reject(this.createMessage(this.messageMinLength || ArrayValidator.MESSAGE_MIN_LENGTH, {
        attribute,
        count: this.minLength,
      }));
    }

    if (this.maxLength && utils.isNumber(this.maxLength) && !(length <= this.maxLength)) {
      return Promise.reject(this.createMessage(this.messageMaxLength || ArrayValidator.MESSAGE_MAX_LENGTH, {
        attribute,
        count: this.maxLength,
      }));
    }

    return Promise.resolve();
  }
}