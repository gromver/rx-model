import { Subject } from 'rxjs/Subject';
import { Set } from 'immutable';
import { SuccessState, WarningState, ErrorState, PendingState, PristineState } from '../states';

export default class ModelStateSubject extends Subject {
  changedFields = [];
  validFields = [];
  successFields = [];
  warningFields = [];
  pendingFields = [];
  pristineFields = [];
  errorFields = [];

  model;
  subscription;

  constructor(model) {
    super();

    this.model = model;
    this.subscription = model.observable.subscribe(this);
  }

  unsubscribe() {
    super.unsubscribe();

    this.subscription.unsubscribe();
  }

  next(state) {
    if (this.changedFields.length) {
      if (this.changedFields.indexOf(state.attribute) === -1) return;
    }

    if (this.validFields.length) {
      if (this.validFields.find((attribute) => {
        const curState = this.model.getAttributeState(attribute);

        return !((curState instanceof SuccessState) || (curState instanceof WarningState));
      })) return;
    }

    if (this.successFields.length) {
      if (this.successFields.find((attribute) => {
        const curState = this.model.getAttributeState(attribute);

        return !(curState instanceof SuccessState);
      })) return;
    }

    if (this.warningFields.length) {
      if (this.warningFields.find((attribute) => {
        const curState = this.model.getAttributeState(attribute);

        return !(curState instanceof WarningState);
      })) return;
    }

    if (this.pendingFields.length) {
      if (this.pendingFields.find((attribute) => {
        const curState = this.model.getAttributeState(attribute);

        return !(curState instanceof PendingState);
      })) return;
    }

    if (this.pristineFields.length) {
      if (this.pristineFields.find((attribute) => {
          const curState = this.model.getAttributeState(attribute);

          return !(curState instanceof PristineState);
        })) return;
    }

    if (this.errorFields.length) {
      if (this.errorFields.find((attribute) => {
        const curState = this.model.getAttributeState(attribute);

        return !(curState instanceof ErrorState);
      })) return;
    }

    super.next(state);
  }

  when(attributes) {
    this.changedFields = new Set([...this.changedFields, ...attributes]).toArray();

    return this;
  }

  whenValid(attributes) {
    this.validFields = new Set([...this.validFields, ...attributes]).toArray();

    return this;
  }

  whenSuccess(attributes) {
    this.successFields = new Set([...this.successFields, ...attributes]).toArray();

    return this;
  }

  whenWarning(attributes) {
    this.warningFields = new Set([...this.warningFields, ...attributes]).toArray();

    return this;
  }

  whenPending(attributes) {
    this.pendingFields = new Set([...this.pendingFields, ...attributes]).toArray();

    return this;
  }

  whenPristine(attributes) {
    this.pristineFields = new Set([...this.pristineFields, ...attributes]).toArray();

    return this;
  }

  whenError(attributes) {
    this.errorFields = new Set([...this.errorFields, ...attributes]).toArray();

    return this;
  }
}
