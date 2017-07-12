import { fromJS, Iterable, Map, Set, List } from 'immutable';
import { Subject } from 'rxjs/Subject';
import { SuccessState, WarningState, ErrorState, PendingState, PristineState, MutationState, UnvalidatedState } from './states';
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
  validationState;

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

  /**
   * External context params
   * @type {{}}
   */
  context;

  /**
   *
   * @param {{}} data
   * @param {{}} context
   * @param {string|[string]} scenario
   */
  constructor(data = {}, context = {}, scenario = Model.SCENARIO_DEFAULT) {
    this.context = context;

    const map = fromJS(this.prepareSourceData(data));

    this.attributes = map;
    this.initialAttributes = map;

    this.onValidationStateChange = this.onValidationStateChange.bind(this);

    this.validationState = {};
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
    this.setValidationState(state);

    this.validationObservable.next(state);
  }

  setValidationState(state) {
    const curState = this.validationState[state.attribute];

    if (curState instanceof PendingState) {
      curState.abort();
    }

    this.validationState[state.attribute] = state;
  }

  /**
   * Returns current attribute's validation state object or null
   * @param attribute
   * @returns {State|PendingState|WarningState|SuccessState|ErrorState|PristineState}
   */
  getValidationState(attribute) {
    let state = this.validationState[attribute];

    if (!state) {
      state = new PristineState({
        attribute,
      });

      this.setValidationState(state);
    }

    return state;
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
   * @param data
   * @returns {{}}
   */
  prepareResultData(data) {
    return data;
  }

  /**
   * Context
   */

  /**
   * Set external context params
   * @param {{}} context
   */
  setContext(context) {
    this.context = context;

    this.invalidateValidators();
  }

  /**
   * Get external context params
   * @returns {{}}
   */
  getContext() {
    return this.context;
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
   * Установка сценария
   * Сценариев может быть несколько
   * @param {Array<string>|string} scenario
   */
  addScenario(scenario) {
    const newSc = typeof scenario === 'string' ? [scenario] : scenario;
    const curSc = this.currentScenarios;

    newSc.forEach(sc => curSc.indexOf(sc) === -1 && curSc.push(sc));

    this.invalidateValidators();
  }

  /**
   * Установка сценария
   * Сценариев может быть несколько
   * @param {Array<string>|string} scenario
   */
  removeScenario(scenario) {
    const remSc = typeof scenario === 'string' ? [scenario] : scenario;

    this.currentScenarios = this.currentScenarios.filter(sc => remSc.indexOf(sc) === -1);

    this.invalidateValidators();
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
    Object.keys(this.validationState).forEach(attribute => {
      this.onValidationStateChange(new UnvalidatedState({
        attribute
      }))
    });

    this.validators = undefined;
  }

  /**
   * Set attribute value
   * @param {string} attribute
   * @param {*} value
   * @param {boolean} safe
   */
  set(attribute, value, safe = true) {
    if (safe && !this.isAttributeSafe(attribute)) {
      return;
    }

    if (Array.isArray(value)) {
      // lookup
      const hasRule = this.lookupArrayRule(attribute);

      if (hasRule) {
        this.attributes = this.attributes.setIn(utils.resolveAttribute(attribute), new List());

        value.forEach((val, index) => {
          this.set(`${attribute}[${index}]`, val, safe);
        });
      } else {
        this.attributes = this.attributes.setIn(utils.resolveAttribute(attribute), value);
      }
    } else if (value === Object(value)) {
      // lookup
      const hasRules = this.lookupObjectRules(attribute);

      if (hasRules) {
        this.attributes = this.attributes.setIn(utils.resolveAttribute(attribute), new Map());

        Object.entries(value).forEach(([attr, val]) => {
          this.set(`${attribute}.${attr}`, val, safe);
        });
      } else {
        this.attributes = this.attributes.setIn(utils.resolveAttribute(attribute), value);
      }
    } else {
      // не объекты и массивы устанавливаются без магии
      this.attributes = this.attributes.setIn(utils.resolveAttribute(attribute), value);
    }

    this.mutationObservable.next(new MutationState({
      attribute,
      value
    }));
  }

  attrPathToRulePath(attrPath) {
    return attrPath.replace(/\[\d+]/g, '[]');
  }

  /**
   * Ищем в правилах валилации, правила для полей вложенных в правило для attribute
   * @param {string} attribute
   * @returns {boolean}
   */
  lookupObjectRules(attribute) {
    const attributes = Object.keys(this.getValidators());

    // экранируем спец символы
    const attrPathString = this.attrPathToRulePath(attribute).replace(/[!@#$%^&*()+=\-[\]\\';,./{}|":<>?~_]/g, "\\$&");

    const regExp = new RegExp(`^${attrPathString}\\.([a-zA-Z_0-9]+)$`);

    return !!attributes.find(attr => regExp.test(attr));
  }

  /**
   * Ищем в правилах валилации, правило для далицации массива вложенное в правило для attribute
   * @param {string} attribute
   * @returns {boolean}
   */
  lookupArrayRule(attribute) {
    const attributes = Object.keys(this.getValidators());

    // экранируем спец символы
    const attrPathString = this.attrPathToRulePath(attribute).replace(/[!@#$%^&*()+=\-[\]\\';,./{}|":<>?~_]/g, "\\$&");

    const regExp = new RegExp(`^${attrPathString}\\[]$`);

    return !!attributes.find(attr => regExp.test(attr));
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
    Object.entries(values).forEach(([attribute, value]) => this.set(attribute, value, safe));
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
   * Returns current attribute state object or null
   * @param {string} attribute
   * @returns {string}
   */
  getValidationStatus(attribute) {
    return this.getValidationState(attribute).status;
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
    const state = this.getValidationState(attribute);

    return state && (state instanceof ErrorState) && state.message || null;
  }

  /**
   * Get attributes's any validation message
   * @param {string} attribute
   * @returns {Message|string|null}
   */
  getValidationMessage(attribute) {
    const state = this.getValidationState(attribute);

    return state && state.message || null;
  }

  /**
   * Get attributes's warning validation message
   * @param {string} attribute
   * @returns {Message|string|null}
   */
  getValidationWarning(attribute) {
    const state = this.getValidationState(attribute);

    return state && (state instanceof WarningState) && state.message || null;
  }

  /**
   * Get attributes's warning validation message
   * @param {string} attribute
   * @returns {boolean}
   */
  getValidationPending(attribute) {
    const state = this.getValidationState(attribute);

    return state && state instanceof PendingState || false;
  }

  /**
   * Returns an array of error states if exists
   * @returns {Array<ErrorState>}
   */
  getValidationErrors() {
    return Object.values(this.validationState).filter(state => state instanceof ErrorState);
  }

  /**
   * Returns an array of warning states if exists
   * @returns {Array<WarningState>}
   */
  getValidationWarnings() {
    return Object.values(this.validationState).filter(state => state instanceof WarningState);
  }

  /**
   * Get first error state is exists
   * @returns {ErrorState|undefined}
   */
  getFirstError() {
    const errors = Object.values(this.validationState).filter(state => state instanceof ErrorState).map(state => state.attribute);
    const rules = Object.keys(this.getValidators());
    const firstErrorAttribute = rules.find(attribute => errors.indexOf(attribute) !== -1);

    return firstErrorAttribute ? this.getValidationState(firstErrorAttribute) : undefined;
  }

  hasErrors() {
    return !!Object.values(this.validationState).find(state => state instanceof ErrorState);
  }

  isModelChanged() {
    const { attributes, initialAttributes } = this;

    return !attributes.equals(initialAttributes);
  }

  isAttributeChanged(attribute) {
    return this.get(attribute) !== this.getInitialAttribute(attribute);
  }

  isAttributeSafe(attribute) {
    const validators = this.getValidators();

    const validator = validators[this.attrPathToRulePath(attribute)];

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