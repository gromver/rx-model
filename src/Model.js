import { fromJS, Iterable, Map } from 'immutable';
import { Subject } from 'rxjs/Subject';
import { SuccessState, WarningState, ErrorState, PendingState, PristineState } from './states';
import StateTracker from './StateTracker';
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
   * @type {StateTracker}
   */
  stateTracker;

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
    this.observable.next(state);
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
   * @param scenario <Array<string>|string>
   */
  setScenario(scenario) {
    this.currentScenarios = typeof scenario === 'string' ? [scenario] : scenario;

    this.stateTracker = new StateTracker(this.onStateChange);

    this.invalidateValidators();
  }

  /**
   * @returns {Array.<string>}
   */
  getScenario() {
    return this.currentScenarios;
  }

  /**
   * Работает ли модель по данному сценарию
   * @param scenario {string}
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
   * Возвращает список доступных для редактирования полей
   * либо undefined если нет ограничений
   * @returns {Array<string>|undefined}
   */
  getEditableAttributes() {
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

    const editableAttributes = this.getEditableAttributes();

    Object.entries(this.rules()).forEach(([attribute, validator]) => {
      if (editableAttributes && editableAttributes.indexOf(attribute) === -1) {
        return;
      }

      const normalizedValidator = this.normalizeValidator(validator);

      if (normalizedValidator) {
        rules[attribute] = normalizedValidator;
      }
    });

    return rules;
  }

  normalizeValidator(validator) {
    if (validator instanceof Validator) {
      return validator;
    } else if (typeof validator === 'function') {
      return this.normalizeValidator(validator.call(this));
    } else if (validator instanceof Scenario) {
      if (validator.apply === Scenario.APPLY_IN ? validator.scenarios.indexOf(this.currentScenarios) !== -1 : validator.scenarios.indexOf(this.currentScenarios) === -1) {
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
  }

  /**
   * Get attribute value
   * attribute name can be deep: this.get('foo.bar', value)
   * @param attribute
   * @returns {*}
   */
  get(attribute) {
    const { attributes } = this;

    const value = attributes.getIn(utils.resolveAttribute(attribute));

    return Iterable.isIterable(value) ? value.toJS() : value;
  }

  /**
   * Set attributes
   * @param values
   */
  setAttributes(values) {
    const editableAttributes = this.getEditableAttributes();

    this.attributes = this.attributes.withMutations((model) => {
      Object.entries(values).forEach(([attribute, value]) => {
        if (editableAttributes && editableAttributes.indexOf(attribute) === -1) {
          return;
        }

        model.setIn(utils.resolveAttribute(attribute), value);

        this.stateTracker.changingAttribute(attribute);
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

  getAttributeState(attribute) {
    return this.stateTracker.getAttributeState(attribute);
  }

  getInitialAttribute(attribute) {
    const { initialAttributes: model } = this;

    const value = model.getIn(utils.resolveAttribute(attribute));

    return Iterable.isIterable(value) ? value.toJS() : value;
  }

  /**
   * Attribute validation state getters
   */

  /**
   * Returns current attribute state object or null
   * @param attribute
   * @returns {PendingState|WarningState|SuccessState|ErrorState|null}
   */
  getValidationState(attribute) {
    const state = this.stateTracker.getAttributeState(attribute);

    return state && state.state || null;
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
    const state = this.stateTracker.getAttributeState(attribute);

    return state && (state instanceof ErrorState) && state.message || null;
  }

  /**
   *
   * @returns {Array.<SuccessState|WarningState|ErrorState|PendingState>}
   */
  getValidationErrors() {
    return Object.values(this.stateTracker.state).filter(state => state instanceof ErrorState);
  }

    // сообщение вне зависимости от типа состояния
  /**
   * Get attributes's any validation message
   * @param attribute
   * @returns {Message|string|null}
   */
  getValidationMessage(attribute) {
    const state = this.stateTracker.getAttributeState(attribute);

    return state && state.message || null;
  }

  /**
   * Get attributes's warning validation message
   * @param attribute
   * @returns {Message|string|null}
   */
  getValidationWarning(attribute) {
    const state = this.stateTracker.getAttributeState(attribute);

    return state && (state instanceof WarningState) && state.message || null;
  }

  /**
   * Get first error state is exists
   * @returns {ErrorState|undefined}
   */
  getFirstError() {
    const errors = Object.values(this.stateTracker.state).filter(state => state instanceof ErrorState).map(state => state.attribute);
    const rules = Object.keys(this.getValidators());
    const firstErrorAttribute = rules.find(attribute => errors.indexOf(attribute) !== -1);

    return firstErrorAttribute ? this.stateTracker.getAttributeState(firstErrorAttribute) : undefined;
  }

  hasErrors() {
    return !!Object.values(this.stateTracker.state).find(state => state instanceof ErrorState);
  }

  /**
   * Is model valid
   * TODO: учитывать наличие состояния для всех аттрибутов у которых есть валидаторы
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
    const editableAttributes = this.getEditableAttributes();

    return editableAttributes ? editableAttributes.indexOf(attribute) !== -1 : true;
  }

  /**
   * Validate model
   * @param attributes{Array|string}
   * @returns {Promise.<boolean>}
   */
  validate(attributes = []) {
    const validators = this.getValidators();

    let attrsToCheck = typeof attributes === 'string' ? [attributes] : attributes;

    if (!attrsToCheck.length) {
      attrsToCheck = this.scenarios[this.currentScenarios] || Object.keys(validators);
    }

    const jobs = [];

    attrsToCheck.forEach((attribute) => {
      const validator = validators[attribute];

      if (validator) {
        jobs.push(this.stateTracker.validateAttribute(this.attributes, attribute, validator));
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
   * @param attributes{Array<string>}
   */
  markAsPristine(attributes) {
    attributes.forEach(attribute => {
      const state = new PristineState({
        attribute
      });
      
      this.stateTracker.setAttributeState(attribute, state);
      
      this.stateTracker.pushState(state);
    })
  }

  /**
   * Change the attributes states to PendingState
   * @param attributes{Array<string>}
   */
  markAsPending(attributes) {
    attributes.forEach(attribute => {
      const state = new PendingState({
        attribute
      });

      this.stateTracker.setAttributeState(attribute, state);

      this.stateTracker.pushState(state);
    })
  }

  /**
   * Change the attributes states to SuccessState
   * @param attributes{Array<string>}
   */
  markAsSuccess(attributes) {
    attributes.forEach(attribute => {
      const state = new SuccessState({
        attribute
      });

      this.stateTracker.setAttributeState(attribute, state);

      this.stateTracker.pushState(state);
    })
  }

  /**
   * Change the attributes states to WarningState
   * @param attributes{Array<string>}
   */
  markAsWarning(attributes) {
    attributes.forEach(attribute => {
      const state = new WarningState({
        attribute
      });

      this.stateTracker.setAttributeState(attribute, state);

      this.stateTracker.pushState(state);
    })
  }

  /**
   * Change the attributes states to ErrorState
   * @param attributes{Array<string>}
   */
  markAsError(attributes) {
    attributes.forEach(attribute => {
      const state = new ErrorState({
        attribute
      });

      this.stateTracker.setAttributeState(attribute, state);

      this.stateTracker.pushState(state);
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

  whenError(attributes, fn) {
    return this.getObservable().when(attributes).whenError(attributes).subscribe(fn.bind(this));
  }
};