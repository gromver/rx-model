import { fromJS, Iterable, Map, Set, List } from 'immutable';
import { Subject } from 'rxjs/Subject';
import {
  AttributeMutation,
  SuccessState, WarningState, ErrorState, PendingState, PristineState, UnvalidatedState,
} from './states';
import ValidationTracker from './ValidationTracker';
import Scenario from './Scenario';
import { Message, Validator, MultiValidator, PresenceValidator } from './validators';
import ValidationStateSubject from './rx/ValidationStateSubject';
import AttributeMutationSubject from './rx/AttributeMutationSubject';
import utils from './utils';

const escapeExp = /[!@#$%^&*()+=\-[\]\\';,./{}|":<>?~_]/g;

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
  attributeObservable = new Subject();

  /**
   * A list of normalized validators
   * @type {{}}
   */
  validators;

  /**
   * invalidateWhen subscription
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
    this.currentScenarios = typeof scenario === 'string' ? [scenario] : scenario;

    const map = fromJS(this.prepareSourceData(data));

    this.attributes = map;
    this.initialAttributes = map;

    this.onValidationStateChange = this.onValidationStateChange.bind(this);

    this.validationState = {};
    this.validationTracker = new ValidationTracker(this.onValidationStateChange);

    this.startSession();
  }

  /**
   * Extendable methods
   */

  /**
   * Get validation rules
   * @returns {{}}
   */
  rules() {
    return {};
  }

  /**
   * Get model's scenarios
   * ключ сценарий => значение [ ...список аттрибутов валидируемых для этого сценария ]
   * если по ключу нет сценария то все аттрибуты валидируются если нет спец условий
   * (Scenario.in(...), Scenario.except(...))
   * @returns {{}}
   */
  scenarios() {
    return {};
  }

  /**
   * Invalidate rules cases
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
   * Prepare model's initialAttributes, used by constructor()
   * Note! Returned object must be a plane Object or an instance of Immutable.Map
   * @param data
   * @returns {{}|Immutable.Map}
   */
  prepareSourceData(data) {
    return {
      ...data,
    };
  }

  /**
   * Prepare model's attributes, used by getAttributes()
   * @param data
   * @returns {{}}
   */
  prepareResultData(data) {
    return data;
  }

  /**
   * Prepare custom model's logic
   * @param {Subject} onCleanup Subscribe to this subject for any cleanup work if needed
   */
  prepare(onCleanup) {
    // some custom logic here
    // ...
    // onCleanup.subscribe(() => {
    //   // cleanup here
    // });
  }

  /**
   * Session
   */
  cleanupSession;

  startSession() {
    if (this.cleanupSession) {
      this.cleanupSession.next();

      this.cleanupSession.unsubscribe();
    }

    this.cleanupSession = new Subject();

    this.prepare(this.cleanupSession);

    if (this.iwSubscription) {
      this.iwSubscription.unsubscribe();

      this.iwSubscription = null;
    }

    const invalidateWhen = this.normalizeInvalidateWhen();

    if (invalidateWhen.length) {
      this.iwSubscription = this.getAttributeObservable().when(invalidateWhen).subscribe(() => {
        this.invalidateValidators();
      });
    }
  }

  normalizeInvalidateWhen() {
    const attributes = this.invalidateWhen();

    if (Array.isArray(attributes)) {
      return attributes;
    } else {
      let normalized = [];

      Object.entries(attributes).forEach(([scenario, attributes]) => {
        if (this.isScenario(scenario)) {
          normalized = [...normalized, ...attributes];
        }
      });

      return [...new Set(normalized)];
    }
  }

  /**
   * Invalidate validators
   */
  invalidateValidators() {
    Object.entries(this.validationState).forEach(([attribute, state]) => {
      if (!(state instanceof PristineState)) {
        this.onValidationStateChange(new UnvalidatedState({
          attribute
        }));
      }
    });

    this.validators = undefined;
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
   * Model's attribute mutation state stream
   * @returns {AttributeMutationSubject}
   */
  getAttributeObservable() {
    return new AttributeMutationSubject(this);
  }

  /**
   * Save validation state changes and forward them to the validationObservable
   * @param state
   */
  onValidationStateChange(state) {
    this.setValidationState(state);

    this.validationObservable.next(state);
  }

  /**
   * Set validation state
   * @param state
   */
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
   * Context
   */

  /**
   * Set external context params
   * @param {{}} context
   */
  setContext(context) {
    this.context = context;

    this.startSession();

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
   * Set scenario
   * @param {Array<string>|string} scenario
   */
  setScenario(scenario) {
    this.currentScenarios = typeof scenario === 'string' ? [scenario] : scenario;

    this.startSession();

    this.invalidateValidators();
  }

  /**
   * @returns {Array<string>}
   */
  getScenario() {
    return this.currentScenarios;
  }

  /**
   * Add scenario
   * @param {Array<string>|string} scenario
   */
  addScenario(scenario) {
    const newSc = typeof scenario === 'string' ? [scenario] : scenario;
    const curSc = this.currentScenarios;

    newSc.forEach(sc => curSc.indexOf(sc) === -1 && curSc.push(sc));

    this.invalidateValidators();
  }

  /**
   * Remove scenario
   * @param {Array<string>|string} scenario
   */
  removeScenario(scenario) {
    const remSc = typeof scenario === 'string' ? [scenario] : scenario;

    this.currentScenarios = this.currentScenarios.filter(sc => remSc.indexOf(sc) === -1);

    this.invalidateValidators();
  }

  /**
   * Does the model has a scenario?
   * @param {string} scenario
   * @returns {boolean}
   */
  isScenario(scenario) {
    return this.currentScenarios.indexOf(scenario) !== -1;
  }

  /**
   * Validators
   */

  /**
   * Get normalized validators
   * @returns {*}
   */
  getValidators() {
    if (this.validators) {
      return this.validators;
    }

    const rules = this.normalizeRules();

    this.setValidators(rules);

    return rules;
  }

  /**
   * Set normalized validators
   * @param rules
   */
  setValidators(rules) {
    this.validators = rules;
  }

  /**
   * Returns a validator for the attribute
   * @param attribute
   * @returns {*}
   */
  getAttributeValidator(attribute) {
    return this.getValidators()[this.attrPathToRulePath(attribute)];
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
    // todo throw warning with a list of attributes which needs to be filed with rules
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
    } else if (value && (value.constructor === Object)) {
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

    this.attributeObservable.next(new AttributeMutation(attribute, value));
  }

  /**
   * Transforms the attribute's path to the rule suitable path
   * a.b[0][1].c => a.b[][].c
   * @param {string} attrPath
   * @returns {XML|string|void|*}
   */
  attrPathToRulePath(attrPath) {
    return attrPath.replace(/\[\d+]/g, '[]');
  }

  /**
   * Does the attribute with an object typed value has a validation rule for it?
   * @param {string} attribute
   * @returns {boolean}
   */
  lookupObjectRules(attribute) {
    const attributes = Object.keys(this.getValidators());

    // экранируем спец символы
    const attrPathString = this.attrPathToRulePath(attribute).replace(escapeExp, "\\$&");

    const regExp = new RegExp(`^${attrPathString}\\.([a-zA-Z_0-9]+)$`);

    return !!attributes.find(attr => regExp.test(attr));
  }

  /**
   * Does the attribute with an array typed value has a validation rule for it?
   * @param {string} attribute
   * @returns {boolean}
   */
  lookupArrayRule(attribute) {
    const attributes = Object.keys(this.getValidators());

    // экранируем спец символы
    const attrPathString = this.attrPathToRulePath(attribute).replace(escapeExp, "\\$&");

    const regExp = new RegExp(`^${attrPathString}\\[]$`);

    return !!attributes.find(attr => regExp.test(attr));
  }

  /**
   * Get attribute value
   * attribute path can be deep: this.get('a.b[1][0].c')
   * @param {string} attribute path
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
   * Get attributes object processed by prepareResultData()
   * @param {boolean} isPrepared - is prepare model attributes's data
   * @returns {{}}
   */
  getAttributes(isPrepared = true) {
    return isPrepared ? this.prepareResultData(this.attributes.toJS()) : this.attributes.toJS();
  }

  /**
   * State getters/setters
   */

  /**
   * Get initial attributes object
   * @returns {{}}
   */
  getInitialAttributes() {
    return this.initialAttributes.toJS();
  }

  /**
   * Get initial attribute value
   * attribute path can be deep: this.getInitialAttribute('a.b[1][0].c')
   * @param {string} attribute
   * @returns {*}
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
    return this.getValidationState(attribute).getStatus();
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
    const errors = Object.values(this.validationState)
      .filter(state => state instanceof ErrorState)
      .map(state => state.attribute);
    const rules = Object.keys(this.getValidators());
    let firstErrorAttribute;

    const matched = rules.find(attribute => errors.find(_attribute => {
      return this.attrPathToRulePath(_attribute) === attribute && (firstErrorAttribute = _attribute);
    }));

    return matched ? this.getValidationState(firstErrorAttribute) : undefined;
  }

  /**
   * Is the model has errors?
   * @returns {boolean}
   */
  isModelHasErrors() {
    return !!Object.values(this.validationState).find(state => state instanceof ErrorState);
  }

  /**
   * Is the model's attributes has been changed?
   * @returns {boolean}
   */
  isModelChanged() {
    const { attributes, initialAttributes } = this;

    return !attributes.equals(initialAttributes);
  }

  /**
   * Is the attribute has been changed?
   * @param attribute
   * @returns {boolean}
   */
  isAttributeChanged(attribute) {
    return this.get(attribute) !== this.getInitialAttribute(attribute);
  }

  /**
   * Is the attribute safe?
   * @param attribute
   * @returns {boolean}
   */
  isAttributeSafe(attribute) {
    const validators = this.getValidators();

    const validator = validators[this.attrPathToRulePath(attribute)];

    if (validator) {
      return validator.isSafe();
    }

    return false;
  }

  /**
   * Does the attribute has a certain validator?
   * Nested validators will be checked too.
   * @param attribute
   * @param validatorClass
   * @returns {boolean}
   */
  isAttributeHasValidator(attribute, validatorClass) {
    function check(validator) {
      if (!validator) return false;

      if (validator instanceof validatorClass) return true;

      if (validator instanceof MultiValidator) {
        if (validator.validators.find((validator) => check(validator))) {
          return true;
        }
      }

      return false;
    }

    this.getAttributeValidator(attribute);

    return check(this.getAttributeValidator(attribute));
  }

  /**
   * Is the attribute required?
   * @param attribute
   * @returns {boolean}
   */
  isAttributeRequired(attribute) {
    return this.isAttributeHasValidator(attribute, PresenceValidator);
  }

  /**
   * Does the attribute has a success state?
   * @param attribute
   * @returns {boolean}
   */
  isAttributeSuccess(attribute) {
    return this.getValidationState(attribute) instanceof SuccessState;
  }

  /**
   * Does the attribute has a warning state?
   * @param attribute
   * @returns {boolean}
   */
  isAttributeWarning(attribute) {
    return this.getValidationState(attribute) instanceof WarningState;
  }

  /**
   * Does the attribute has an error state?
   * @param attribute
   * @returns {boolean}
   */
  isAttributeError(attribute) {
    return this.getValidationState(attribute) instanceof ErrorState;
  }

  /**
   * Is the attribute pending?
   * @param attribute
   * @returns {boolean}
   */
  isAttributePending(attribute) {
    return this.getValidationState(attribute) instanceof PendingState;
  }

  /**
   * Validate model
   * @param {Array<string>|string} attributes
   * @returns {Promise<boolean>}
   */
  validate(attributes = []) {
    const validators = this.getValidators();

    let attrsToCheck = typeof attributes === 'string'
      ? [attributes]
      : (attributes.length ? attributes : this.calcAttrsToCheck());

    const jobs = [];

    attrsToCheck.forEach((attribute) => {
      const validator = validators[this.attrPathToRulePath(attribute)] || new Validator();

      jobs.push(this.validationTracker.validateAttribute(this, attribute, validator));
    });

    return Promise.all(jobs).then((states) => {
      if (states.find(state => !(state instanceof SuccessState || state instanceof WarningState))) {
        return Promise.resolve(false);
      }

      return Promise.resolve(true);
    });
  }

  /**
   * Determines a list of attributes which should be validated
   * @returns {Array}
   */
  calcAttrsToCheck() {
    const attrs = [];

    const _this = this;

    function calc(value, path) {
      if (path) {
        attrs.push(path);
      }

      if (Array.isArray(value)) {
        value.forEach((v, k) => {
          calc(v, path + `[${k}]`);
        });
      } else if (value && (value.constructor === Object)) {
        _this.extractObjectRules(path).forEach((k) => {
          const _path = path + (path && '.') + k;

          calc(value[k], _path);
        });
      }
    }

    calc(this.attributes.toJS(), '');

    return attrs;
  }

  extractObjectRules(path) {
    const v = Object.keys(this.getValidators());

    const regExp = new RegExp(`^${path ? this.attrPathToRulePath(path).replace(escapeExp, "\\$&") + '\\.' : ''}([a-zA-Z_0-9]+)$`);

    return v.map(i => {
      const res = regExp.exec(i);

      return res ? res[1] : false;
    }).filter(i => i);
  }

  /**
   * Attribute state management (is not necessary, should be removed)
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