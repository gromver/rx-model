import { Subject } from 'rxjs/Subject';
import StateMutation from '../states/mutation/StateMutation';
import { merge } from 'rxjs/observable/merge';

export default class FormSubject extends Subject {
  isRunOnSubscribe = false;
  stateMutations = [];
  attributeMutations = [];

  form;
  subscription;

  constructor(form) {
    super();

    this.form = form;
    this.subscription = merge(form.stateObservable, form.attributeObservable, form.validationObservable).subscribe(this);
  }

  unsubscribe() {
    super.unsubscribe();

    this.subscription.unsubscribe();
  }

  subscribe(observer) {
    const subscription = super.subscribe(observer);

    if (this.isRunOnSubscribe) {
      super.next({});
    }

    return subscription;
  }

  /**
   * Extended
   * @param {*} state
   */
  next(state) {
    if (state instanceof StateMutation) {
      if (
        this.stateMutations.length
        && !this.stateMutations.filter(p => Object.hasOwnProperty.call(state.mutations, p)).length
      ) {
        return;
      }
    } else {
      if (
        this.attributeMutations.length
        && this.attributeMutations.indexOf(state.attribute) === -1
      ) {
        return;
      }
    }

    super.next(state);
  }

  /**
   * Run observers when they has been subscribed
   * @returns {FormSubject}
   */
  whenSubscribed() {
    this.isRunOnSubscribe = true;

    return this;
  }

  /**
   * When form state changed
   * @param {Array<string>} properties - a list of filtered by properties
   * @returns {FormSubject}
   */
  whenForm(properties = []) {
    this.stateMutations = [...new Set([...this.stateMutations, ...properties])];

    return this;
  }

  /**
   * When model attributes changed
   * @param {Array<string>} attributes - a list of filtered by attributes
   * @returns {FormSubject}
   */
  whenModel(attributes = []) {
    this.attributeMutations = [...new Set([...this.attributeMutations, ...attributes])];

    return this;
  }
}
