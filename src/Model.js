import { fromJS, Iterable, Map } from 'immutable';
import { Subject } from 'rxjs/Subject';
import { SuccessState, WarningState, ErrorState, PendingState, PristineState } from './states';
import ValidationTracker from './ValidationTracker';
import Scenario from './Scenario';
import { Message, Validator, MultiValidator } from './validators';
import ModelStateSubject from './rx/ModelStateSubject';
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
  observable = new Subject();

  /**
   * Список валидаторов
   * @type {{}}
   */
  validators;

  /**
   * Current model's scenarios
   * @type {Array<string>}
   */
  currentScenarios;

  constructor(data = {}, scenario = Model.SCENARIO_DEFAULT) {
    const map = fromJS(this.prepareSourceData(data));

    this.onStateChange = this.onStateChange.bind(this);

    this.attributes = map;
    this.initialAttributes = map;

    this.validationTracker = new ValidationTracker(this.onStateChange);

    this.setScenario(scenario);

    this.prepareModel();
  }

  /**
   * Rx
   */

  /**
   * Form state stream
   * @returns {ModelStateSubject}
   */
  getObservable() {
    return new ModelStateSubject(this);
  }

  subscribe(cb) {
    return this.observable.subscribe(cb);
  }

  onStateChange(state) {
    this.setState(state);

    this.observable.next(state);
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
   * EXTEND THIS
   * подготовка модели (подписка обработчиков на when... события)
   */
  prepareModel() { }

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
  }

  /**
   * Возвращает список доступных для валидирования полей
   * либо undefined если нет ограничений
   * @returns {Array<string>|undefined}
   */
  getValidatableAttributes() {
    let result = [];
    const scenarios = this.scenarios();

    this.currentScenarios.forEach(item => {
      const attributes = scenarios[item];

      if (attributes) {
        result = [...result, ...attributes];
      }
    });

    return result.length ? [...new Set(result)] : undefined;
  }

  normalizeRules() {
    const rules = {};

    const validatableAttributes = this.getValidatableAttributes();

    Object.entries(this.rules()).forEach(([attribute, validator]) => {
      if (validatableAttributes && validatableAttributes.indexOf(attribute) === -1) {
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

  invalidateValidators() {
    this.state = {};

    this.validators = undefined;
  }

  /**
   * Set attribute value
   * attribute name can be deep: this.set('foo.bar', value)
   * @param attribute
   * @param value
   */
  set(attribute, value) {
    this.attributes = this.attributes.setIn(utils.resolveAttribute(attribute), value);

    this.markAsPristine([attribute]);
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
   */
  setAttributes(values) {
    const validatableAttributes = this.getValidatableAttributes();

    this.attributes = this.attributes.withMutations((model) => {
      Object.entries(values).forEach(([attribute, value]) => {
        if (validatableAttributes && validatableAttributes.indexOf(attribute) === -1) {
          return;
        }

        model.setIn(utils.resolveAttribute(attribute), value);

        this.markAsPristine([attribute]);
      });

      // this.markAsPristine(Object.keys(values));
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
      
      this.onStateChange(state);
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

      this.onStateChange(state);
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

      this.onStateChange(state);
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

      this.onStateChange(state);
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

      this.onStateChange(state);
    })
  }

  /**
   * when... shortcuts
   */

  when(attributes, fn) {
    return this.getObservable().when(attributes).subscribe(fn.bind(this));
  }

  whenValid(attributes, fn) {
    return this.getObservable().when(attributes).whenValid(attributes).subscribe(fn.bind(this));
  }

  whenSuccess(attributes, fn) {
    return this.getObservable().when(attributes).whenSuccess(attributes).subscribe(fn.bind(this));
  }

  whenWarning(attributes, fn) {
    return this.getObservable().when(attributes).whenWarning(attributes).subscribe(fn.bind(this));
  }

  whenPending(attributes, fn) {
    return this.getObservable().when(attributes).whenPending(attributes).subscribe(fn.bind(this));
  }

  whenPristine(attributes, fn) {
    return this.getObservable().when(attributes).whenPristine(attributes).subscribe(fn.bind(this));
  }

  whenError(attributes, fn) {
    return this.getObservable().when(attributes).whenError(attributes).subscribe(fn.bind(this));
  }
};