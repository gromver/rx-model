import { Subject } from 'rxjs/Subject';
import { Set } from 'immutable';

export default class AttributeMutationSubject extends Subject {
  mutatedFields = [];

  model;
  subscription;

  constructor(model) {
    super();

    this.model = model;
    this.subscription = model.attributeObservable.subscribe(this);
  }

  unsubscribe() {
    super.unsubscribe();

    this.subscription.unsubscribe();
  }

  /**
   * Extended
   * @param {AttributeMutation} state
   */
  next(state) {
    if (
      this.mutatedFields.length
      && this.mutatedFields.indexOf(state.attribute) === -1
    ) {
      return;
    }

    super.next(state);
  }

  /**
   * When model attribute state changed
   * @param {Array<string>} attributes
   * @returns {AttributeMutationSubject}
   */
  when(attributes) {
    this.mutatedFields = new Set([...this.mutatedFields, ...attributes]).toArray();

    return this;
  }
}
