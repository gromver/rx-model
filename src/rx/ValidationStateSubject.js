import { Subject } from 'rxjs/Subject';
import { Set } from 'immutable';
import { SuccessState, WarningState, ErrorState, PendingState, PristineState, UnvalidatedState } from '../states';

export default class ValidationStateSubject extends Subject {
  changedFields = [];
  validFields = [];
  successFields = [];
  warningFields = [];
  pendingFields = [];
  pristineFields = [];
  errorFields = [];
  unvalidatedFields = [];

  model;
  subscription;

  constructor(model) {
    super();

    this.model = model;
    this.subscription = model.validationObservable.subscribe(this);
  }

  unsubscribe() {
    super.unsubscribe();

    this.subscription.unsubscribe();
  }

  /**
   * Extended
   * @param {SuccessState|WarningState|ErrorState|PendingState|UnvalidatedState} state
   */
  next(state) {
    // console.log('next', state);

    if (this.changedFields.length) {
      if (this.changedFields.indexOf(state.attribute) === -1) return;
    }
    // TODO refactor this and make mother fucking tests!
    if (this.validFields.length) {
      if (this.validFields.find((attribute) => {
        const curState = this.model.getValidationState(attribute);

        return !((curState instanceof SuccessState) || (curState instanceof WarningState));
      })) return;
    }

    if (this.successFields.length) {
      // console.log('whenSuccess', state, this.successFields.find((attribute) => {
      //   const curState = this.model.getValidationState(attribute);
      //
      //   return !(curState instanceof SuccessState);
      // }));
      if (this.successFields.find((attribute) => {
        const curState = this.model.getValidationState(attribute);

        return !(curState instanceof SuccessState);
      })) return;
      console.log('whenSuccess out');
    }

    if (this.warningFields.length) {
      if (this.warningFields.find((attribute) => {
        const curState = this.model.getValidationState(attribute);

        return !(curState instanceof WarningState);
      })) return;
    }

    if (this.pendingFields.length) {
      if (this.pendingFields.find((attribute) => {
        const curState = this.model.getValidationState(attribute);

        return !(curState instanceof PendingState);
      })) return;
    }

    if (this.pristineFields.length) {
      if (this.pristineFields.find((attribute) => {
          const curState = this.model.getValidationState(attribute);

          return !(curState instanceof PristineState);
        })) return;
    }

    if (this.errorFields.length) {
      if (this.errorFields.find((attribute) => {
        const curState = this.model.getValidationState(attribute);

        return !(curState instanceof ErrorState);
      })) return;
    }

    if (this.unvalidatedFields.length) {
      if (this.unvalidatedFields.find((attribute) => {
          const curState = this.model.getValidationState(attribute);

          return !(curState instanceof UnvalidatedState);
        })) return;
    }

    super.next(state);
  }

  /**
   * When model's attribute validation state changed
   * @param {Array<string>} attributes
   * @returns {ValidationStateSubject}
   */
  when(attributes) {
    this.changedFields = new Set([...this.changedFields, ...attributes]).toArray();

    return this;
  }

  /**
   * When model's attribute validation state valid
   * Use in chain with when()
   * @param {Array<string>} attributes
   * @returns {ValidationStateSubject}
   */
  whenValid(attributes) {
    this.validFields = new Set([...this.validFields, ...attributes]).toArray();

    return this;
  }

  /**
   * When model's attribute validation state success
   * Use in chain with when()
   * @param {Array<string>} attributes
   * @returns {ValidationStateSubject}
   */
  whenSuccess(attributes) {
    this.successFields = new Set([...this.successFields, ...attributes]).toArray();

    return this;
  }

  /**
   * When model's attribute validation state warning
   * Use in chain with when()
   * @param {Array<string>} attributes
   * @returns {ValidationStateSubject}
   */
  whenWarning(attributes) {
    this.warningFields = new Set([...this.warningFields, ...attributes]).toArray();

    return this;
  }

  /**
   * When model's attribute validation state pending
   * Use in chain with when()
   * @param {Array<string>} attributes
   * @returns {ValidationStateSubject}
   */
  whenPending(attributes) {
    this.pendingFields = new Set([...this.pendingFields, ...attributes]).toArray();

    return this;
  }

  /**
   * When model's attribute validation state pristine
   * Use in chain with when()
   * @param {Array<string>} attributes
   * @returns {ValidationStateSubject}
   */
  whenPristine(attributes) {
    this.pristineFields = new Set([...this.pristineFields, ...attributes]).toArray();

    return this;
  }

  /**
   * When model's attribute validation state error
   * Use in chain with when()
   * @param {Array<string>} attributes
   * @returns {ValidationStateSubject}
   */
  whenError(attributes) {
    this.errorFields = new Set([...this.errorFields, ...attributes]).toArray();

    return this;
  }

  /**
   * When model's attribute validation state unvalidated
   * Use in chain with when()
   * @param {Array<string>} attributes
   * @returns {ValidationStateSubject}
   */
  whenUnvalidated(attributes) {
    this.unvalidatedFields = new Set([...this.unvalidatedFields, ...attributes]).toArray();

    return this;
  }
}
