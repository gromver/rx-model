import { is } from 'immutable';
import { PendingState, SuccessState, WarningState, ErrorState, PristineState } from './states';
import utils from './utils';

/**
 * Хелпер для валидации атрибутов модели, запускает процес валидации аттрибута модели,
 * если валидатор асинхронный то устанавливается PendingState, после окончания валидации,
 * устанавливается соответсующий стейт {ErrorState, SuccessState, WarningState}
 * Если валидируется аттрибут который в данный момент все еще валидируется предыдущим вызовом -
 * предыдущая валидация отменяется
 * Если у атрибута его значение и результат валидации не менялись с последнего вызова -
 * возвращается закешированный результат валидации
 */
export default class ValidationTracker {
  constructor(onPushState) {
    this.onPushState = onPushState;
  }

  cache = {};
  state = {};

  onPushState;

  validateAttribute(model, attribute, validator) {
    const cached = this.cache[attribute];
    const value = utils.getModelAttribute(model, attribute);

    let isChanged = true;

    if (cached) {
      const [cachedValue, cachedValidator] = cached;

      isChanged = !is(value, cachedValue) || !is(validator, cachedValidator);
    }

    if (isChanged) {
      let skip = false;

      const curState = this.getAttributeState(attribute);

      if (curState instanceof PendingState) {
        curState.abort();
      }

      const job = validator.validate(value, attribute, model).then((warningMessage) => {
        if (!skip) {
          const state = warningMessage ? new WarningState({
            attribute,
            message: warningMessage,
          }) : new SuccessState({
            attribute,
          });

          this.cache[attribute] = [value, validator];

          this.setAttributeState(attribute, state);

          this.pushState(state);

          return state;
        }
      }).catch((errorMessage) => {
        if (!skip) {
          const state = new ErrorState({
            attribute,
            message: errorMessage,
          });

          this.cache[attribute] = [value, validator];

          this.setAttributeState(attribute, state);

          this.pushState(state);

          return state;
        }
      });

      Promise.race([job, new Promise(r => setTimeout(() => r(new PendingState({
        attribute,
      }, () => skip = true)), 0))]).then((state) => {
        if (state instanceof PendingState) {
          this.setAttributeState(attribute, state);

          this.pushState(state);
        }
      });

      return job;
    }

    const cachedState = this.getAttributeState(attribute);

    this.pushState(cachedState);

    return Promise.resolve(cachedState);
  }

  pushState(changes) {
    this.onPushState && this.onPushState(changes);
  }

  setAttributeState(attr, state) {
    this.state[attr] = state;
  }

  getAttributeState(attribute) {
    return this.state[attribute];
  }
}