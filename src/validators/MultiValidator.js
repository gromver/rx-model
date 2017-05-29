import Validator from './Validator';
import promiseAny from 'promise-any';

export default class MultiValidator extends Validator {
  validators;

  isAny;

  constructor({ validators, isAny }) {
    super();

    this.validators = validators || [];
    this.isAny = isAny || false;
  }

  validate(value, attribute, model) {
    const jobs = this.validators.map(validator => validator.validate(value, attribute, model));

    return this.isAny
      ? promiseAny(jobs).then(messages => messages.find(i => i) || null)
      : Promise.all(jobs).then(messages => messages.find(i => i) || null);
  }
}

