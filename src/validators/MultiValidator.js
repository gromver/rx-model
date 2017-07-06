import Validator from './Validator';

const reverse = (promise) => {
  return new Promise((resolve, reject) => Promise.resolve(promise).then(reject, resolve));
};

const promiseAny = (iterable) => {
  return reverse(Promise.all([...iterable].map(reverse)));
};

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

  isSafe() {
    if (this.validators.length) {
      const unsafeValidators = this.validators.filter(v => !v.isSafe());

      return !unsafeValidators.length;
    }

    return false;
  }
}

