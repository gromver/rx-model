import { fromJS, Iterable, Map } from 'immutable';
import { Subject } from 'rxjs/Subject';
import { SuccessState, WarningState, ErrorState, PendingState, PristineState, MutationState } from './states';
import ValidationTracker from './ValidationTracker';
import Scenario from './Scenario';
import { Message, Validator, MultiValidator } from './validators';
import ValidationStateSubject from './rx/ValidationStateSubject';
import MutationStateSubject from './rx/MutationStateSubject';
import utils from './utils';

export default class Model {
  static SCENARIO_DEFAULT = 'default';

  /**
   * Current attributes map
   * @type {Immutable.Map}
   */
  attributes;

  /**
   * Initial attributes map
   * @type {Immutable.Map}
   */
  initialAttributes;

  /**
   * @type {ValidationTracker}
   */
  validationTracker;

  /**
   * Validation state
   * @type {{}}
   */
  state;

  /**
   * Validation state's stream
   * @type {Subject}
   */
  validationObservable = new Subject();

  /**
   * Attribute's mutation stream
   * @type {Subject}
   */
  mutationObservable = new Subject();

  /**
   * Список валидаторов
   * @type {{}}
   */
  validators;

  /**
   * Подписка на перестройку валидаторов при изменении полей модели
   * @type {Subscription}
   */
  iwSubscription;

  /**
   * Current model's scenarios
   * @type {Array<string>}
   */
  currentScenarios;

  constructor(data = {}, scenario = Model.SCENARIO_DEFAULT) {
    const map = fromJS(this.prepareSourceData(data));

    this.onValidationStateChange = this.onValidationStateChange.bind(this);

    this.attributes = map;
    this.initialAttributes = map;

    this.validationTracker = new ValidationTracker(this.onValidationStateChange);

    this.setScenario(scenario);
  }

  /**
   * Rx
   */

  /**
   * Model's validation state stream
   * @returns {ValidationStateSubject}
   */
  getValidationObservable() {
    return new ValidationStateSubject(this);
  }

  /**
   * Model's mutation state stream
   * @returns {MutationStateSubject}
   */
  getMutationObservable() {
    return new MutationStateSubject(this);
  }

  onValidationStateChange(state) {
    this.setState(state);

    this.validationObservable.next(state);
  }

  setState(state) {
    const curState = this.state[state.attribute];

    if (curState instanceof PendingState) {
      curState.abort();
    }

    this.state[state.attribute] = state;
  }

  /**
   * EXTEND THIS
   * get validation rules
   * @returns {{}}
   */
  rules() {
    return {};
  }

  /**
   * EXTEND THIS
   * get model's scenarios
   * ключ сценарий => значение [ ...список аттрибутов валидируемых для этого сценария ]
   * если по ключу нет сценария то все аттрибуты валидируются если нет спец условий
   * (Scenario.in(...), Scenario.except(...))
   * @returns {{}}
   */
  scenarios() {
    return {};
  }

  /**
   * EXTEND THIS
   * invalidate rules cases
   * Если возвращает объект:
   * ключ сценарий => значение [ ...список аттрибутов, изменение которых приводит к изменению правил валидации ]
   * Усли возвращает массив
   * [ ...список аттрибутов, изменение которых приводит к изменению правил валидации не зависимо от сценария ]
   * @returns {{}|[]}
   */
  invalidateWhen() {
    return [];
  }

  /**
   * EXTEND THIS
   * инициализация и подготовка модели с которой будет работать форма
   * Важно! возвращаемый объект должен быть простым -
   * то есть без наследования либо объектом Immutable.Map
   * Важно! описывать логику получения модели исходя из того, что state еще не инициализирован -
   * то есть, писать логику на основе this.props
   * @param data
   * @returns {{}}
   */
  prepareSourceData(data) {
    return {
      ...data,
    };
  }

  /**
   * EXTEND THIS
   * подготовка модели перед событием onSubmit
   * @param model
   * @returns {{}}
   */
  prepareResultData(data) {
    return data;
  }

  /**
   * scenarios
   */

  /**
   * Установка сценария
   * Сценариев может быть несколько
   * @param {Array<string>|string} scenario
   */
  setScenario(scenario) {
    this.currentScenarios = typeof scenario === 'string' ? [scenario] : scenario;

    this.invalidateValidators();
  }

  /**
   * @returns {Array<string>}
   */
  getScenario() {
    return this.currentScenarios;
  }

  /**
   * Работает ли модель по данному сценарию
   * @param {string} scenario
   * @returns {boolean}
   */
  isScenario(scenario) {
    return this.currentScenarios.indexOf(scenario) !== -1;
  }

  /**
   * Validators
   */

  getValidators() {
    if (this.validators) {
      return this.validators;
    }

    const rules = this.normalizeRules();

    this.setValidators(rules);

    return rules;
  }

  setValidators(rules) {
    this.validators = rules;

    if (this.iwSubscription) {
      this.iwSubscription.unsubscribe();

      this.iwSubscription = null;
    }

    const invalidateWhen = this.normalizeInvalidateWhen();

    if (invalidateWhen.length) {
      this.iwSubscription = this.getMutationObservable().when(invalidateWhen).subscribe(() => {
        this.invalidateValidators();
      });
    }
  }

  /**
   * Возвращает список доступных для редактирования полей
   * либо пустой список если нет ограничений
   * @returns {Array<string>}
   */
  getAccessibleAttributes() {
    let result = [];
    const scenarios = this.scenarios();

    this.currentScenarios.forEach(item => {
      const attributes = scenarios[item];

      if (attributes) {
        result = [...result, ...attributes];
      }
    });

    return result.length ? [...new Set(result)] : result;
  }

  normalizeRules() {
    const rules = {};

    const accessibleAttributes = this.getAccessibleAttributes();

    const hasRestrictions = !!accessibleAttributes.length;

    Object.entries(this.rules()).forEach(([attribute, validator]) => {
      if (hasRestrictions && accessibleAttributes.indexOf(attribute) === -1) {
        return;
      }

      const normalizedValidator = this.normalizeValidator(validator);

      if (normalizedValidator) {
        rules[attribute] = normalizedValidator;
      }
    });

    return rules;
  }

  isIntersectedScenarios(a, b) {
    return a.find(i => b.indexOf(i) !== -1);
  }

  normalizeValidator(validator) {
    if (validator instanceof Validator) {
      return validator;
    } else if (typeof validator === 'function') {
      return this.normalizeValidator(validator.call(this));
    } else if (validator instanceof Scenario) {
      if ((validator.apply === Scenario.APPLY_IN && this.isIntersectedScenarios(validator.scenarios, this.currentScenarios))
        || (validator.apply === Scenario.APPLY_EXCEPT && !this.isIntersectedScenarios(validator.scenarios, this.currentScenarios))) {
        return this.normalizeValidator(validator.validator);
      } else {
        return false; // skip
      }
    } else if (Array.isArray(validator)) {
      return new MultiValidator({
        validators: validator.map((item) => this.normalizeValidator(item)).filter(i => i !== false),
      });
    } else if (validator === false) {
      // false etc
      return false; // skip
    } else {
      throw new Error('rules - unknown validator description');
    }
  }

  normalizeInvalidateWhen() {
    const attributes = this.invalidateWhen();

    if (Array.isArray(attributes)) {
      return attributes;
    } else {
      let normalized = [];

      Object.entries(attributes).forEach(([scenario, attributes]) => {
        normalized = [...normalized, ...attributes];
      });

      return [...new Set(normalized)];
    }
  }

  invalidateValidators() {
    this.state = {};

    this.validators = undefined;
  }

  /**
   * Set attribute value
   * attribute name can be deep: this.set('foo.bar', value)
   * @param {string} attribute
   * @param {*} value
   * @param {boolean} safe
   */
  set(attribute, value, safe = true) {
    if (safe && !this.isAttributeEditable(attribute)) {
      return;
    }

    this.attributes = this.attributes.setIn(utils.resolveAttribute(attribute), value);

    this.mutationObservable.next(new MutationState({
      attribute,
      value
    }));
  }

  /**
   * Get attribute value
   * attribute name can be deep: this.get('foo.bar', value)
   * @param {string} attribute
   * @returns {*}
   */
  get(attribute) {
    const { attributes } = this;

    const value = attributes.getIn(utils.resolveAttribute(attribute));

    return Iterable.isIterable(value) ? value.toJS() : value;
  }

  /**
   * Set attributes
   * @param {Object} values
   * @param {boolean} safe
   */
  setAttributes(values, safe = true) {
    this.attributes = this.attributes.withMutations((model) => {
      Object.entries(values).forEach(([attribute, value]) => {
        if (safe && !this.isAttributeEditable(attribute)) {
          return;
        }

        model.setIn(utils.resolveAttribute(attribute), value);

        this.mutationObservable.next(new MutationState({
          attribute,
          value
        }));
      });
    });
  }

  /**
   * Get attributes object
   * @returns {{}}
   */
  getAttributes() {
    return this.prepareResultData(this.attributes.toJS());
  }

  /**
   * State getters/setters
   */

  getInitialAttribute(attribute) {
    const { initialAttributes: model } = this;

    const value = model.getIn(utils.resolveAttribute(attribute));

    return Iterable.isIterable(value) ? value.toJS() : value;
  }

  /**
   * Attribute validation state getters
   */

  /**
   *
   * @param attribute
   * @returns {PendingState|WarningState|SuccessState|ErrorState|PristineState}
   */
  getAttributeState(attribute) {
    let state = this.state[attribute];

    if (!state) {
      state = new PristineState({
        attribute,
      });

      this.setState(state);
    }

    return state;
  }

  /**
   * Returns current attribute state object or null
   * @param {string} attribute
   * @returns {string}
   */
  getValidationState(attribute) {
    return this.getAttributeState(attribute).state;
  }

  /**
   * Attribute validation state helpers
   */

  /**
   * Get attribute's validation error message is exist
   * @param attribute
   * @returns {Message|string|null}
   */
  getValidationError(attribute) {
    const state = this.getAttributeState(attribute);

    return state && (state instanceof ErrorState) && state.message || null;
  }

  /**
   *
   * @returns {Array<ErrorState>}
   */
  getValidationErrors() {
    return Object.values(this.state).filter(state => state instanceof ErrorState);
  }

  /**
   * Get attributes's any validation message
   * @param {string} attribute
   * @returns {Message|string|null}
   */
  getValidationMessage(attribute) {
    const state = this.getAttributeState(attribute);

    return state && state.message || null;
  }

  /**
   * Get attributes's warning validation message
   * @param {string} attribute
   * @returns {Message|string|null}
   */
  getValidationWarning(attribute) {
    const state = this.getAttributeState(attribute);

    return state && (state instanceof WarningState) && state.message || null;
  }

  /**
   * Get first error state is exists
   * @returns {ErrorState|undefined}
   */
  getFirstError() {
    const errors = Object.values(this.state).filter(state => state instanceof ErrorState).map(state => state.attribute);
    const rules = Object.keys(this.getValidators());
    const firstErrorAttribute = rules.find(attribute => errors.indexOf(attribute) !== -1);

    return firstErrorAttribute ? this.getAttributeState(firstErrorAttribute) : undefined;
  }

  hasErrors() {
    return !!Object.values(this.state).find(state => state instanceof ErrorState);
  }

  /**
   * Is model valid
   * TODO?: учитывать наличие состояния для всех аттрибутов у которых есть валидаторы
   * @returns {boolean}
   */
  isModelValid() {
    return !this.hasErrors();
  }

  isModelChanged() {
    const { attributes, initialAttributes } = this;

    return !attributes.equals(initialAttributes);
  }

  isAttributeChanged(attribute) {
    return this.get(attribute) !== this.getInitialAttribute(attribute);
  }

  isAttributeEditable(attribute) {
    const validators = this.getValidators();

    const validator = validators[attribute];

    if (validator) {
      return validator.isSafe();
    }

    return false;
  }

  /**
   * Validate model
   * @param {Array<string>|string} attributes
   * @returns {Promise<boolean>}
   */
  validate(attributes = []) {
    const validators = this.getValidators();

    let attrsToCheck = typeof attributes === 'string' ? [attributes] : attributes;

    if (!attrsToCheck.length) {
      attrsToCheck = Object.keys(validators);
    }

    const jobs = [];

    attrsToCheck.forEach((attribute) => {
      const validator = validators[attribute];

      if (validator) {
        jobs.push(this.validationTracker.validateAttribute(this.attributes, attribute, validator));
      }
    });

    return Promise.all(jobs).then((states) => {
      if (states.find(state => !(state instanceof SuccessState || state instanceof WarningState))) {
        return Promise.resolve(false);
      }

      return Promise.resolve(true);
    });
  }

  /**
   * Attribute state management
   */

  /**
   * Change the attributes states to PristineState
   * @param {Array<string>} attributes
   */
  markAsPristine(attributes) {
    attributes.forEach(attribute => {
      const state = new PristineState({
        attribute
      });
      
      this.onValidationStateChange(state);
    })
  }

  /**
   * Change the attributes states to PendingState
   * @param {Array<string>} attributes
   */
  markAsPending(attributes) {
    attributes.forEach(attribute => {
      const state = new PendingState({
        attribute
      });

      this.onValidationStateChange(state);
    })
  }

  /**
   * Change the attributes states to SuccessState
   * @param {Array<string>} attributes
   */
  markAsSuccess(attributes) {
    attributes.forEach(attribute => {
      const state = new SuccessState({
        attribute
      });

      this.onValidationStateChange(state);
    })
  }

  /**
   * Change the attributes states to WarningState
   * @param {Array<string>} attributes
   */
  markAsWarning(attributes) {
    attributes.forEach(attribute => {
      const state = new WarningState({
        attribute
      });

      this.onValidationStateChange(state);
    })
  }

  /**
   * Change the attributes states to ErrorState
   * @param {Array<string>} attributes
   */
  markAsError(attributes) {
    attributes.forEach(attribute => {
      const state = new ErrorState({
        attribute
      });

      this.onValidationStateChange(state);
    })
  }
};