import { Subject } from 'rxjs/Subject';
import StateMutation from '../states/mutation/StateMutation';

export default class StateMutationSubject extends Subject {
  isRunOnSubscribe = false;
  mutatedFields = [];

  form;
  subscription;

  constructor(form) {
    super();

    this.form = form;
    this.subscription = form.stateObservable.subscribe(this);
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
   * @param {StateMutation} state
   */
  next(state) {
    if (
      this.mutatedFields.length
      && !this.mutatedFields.filter(p => Object.hasOwnProperty.call(state.mutations, p)).length
    ) {
      return;
    }

    super.next(state);
  }

  /**
   * Run observers when they has been subscribed
   * @returns {StateMutationSubject}
   */
  whenSubscribed() {
    this.isRunOnSubscribe = true;

    return this;
  }

  /**
   * When form state changed
   * @param {Array<string>} properties
   * @returns {StateMutationSubject}
   */
  when(properties = []) {
    this.mutatedFields = [...new Set([...this.mutatedFields, ...properties])];

    return this;
  }
}
