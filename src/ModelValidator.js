import Model from './Model';
import StateTracker from './ValidationTracker';
import { SuccessState, WarningState } from './states';
import utils from './utils';

export default class ModelValidator {
  model;
  rules;
  stateTracker;

  constructor(model, rules) {
    if (!(model instanceof Model)) {
      throw new Error('ModelValidator.construct() - model must be an instance of Model');
    }

    if (!utils.isObject(rules)) {
      throw new Error('ModelValidator.construct() - rules must be an object of rules');
    }

    this.model = model;
    this.rules = rules;
    this.stateTracker = new StateTracker();
  }

  validate() {
    const jobs = [];

    Object.entries(this.rules).forEach(([attribute, validator]) => {
      if (validator) {
        jobs.push(this.stateTracker.validateAttribute(this.model, attribute, validator));
      }
    });

    return Promise.all(jobs).then((states) => {
      if (states.find(state => !(state instanceof SuccessState || state instanceof WarningState))) {
        return Promise.resolve(false);
      }
      return Promise.resolve(true);
    });
  }
}
