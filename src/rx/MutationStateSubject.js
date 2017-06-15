import { Subject } from 'rxjs/Subject';
import { Set } from 'immutable';

export default class MutationStateSubject extends Subject {
  mutatedFields = [];

  model;
  subscription;

  constructor(model) {
    super();

    this.model = model;
    this.subscription = model.mutationObservable.subscribe(this);
  }

  unsubscribe() {
    super.unsubscribe();

    this.subscription.unsubscribe();
  }

  /**
   * Extended
   * @param {MutationState} state
   */
  next(state) {
    if (this.mutatedFields.length) {
      if (this.mutatedFields.indexOf(state.attribute) === -1) return;
    }

    super.next(state);
  }

  when(attributes) {
    this.mutatedFields = new Set([...this.mutatedFields, ...attributes]).toArray();

    return this;
  }
}
