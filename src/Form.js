import { Subject } from 'rxjs/Subject';
import Model from './Model';
import { StateMutation, UnvalidatedState } from './states';
import StateMutationSubject from './rx/StateMutationSubject';
import FormSubject from './rx/FormSubject';

export default class Form extends Model {
  /**
   * @type {{}}
   */
  state = {};
  /**
   * @type {{}}
   */
  initialState;

  /**
   * @type {Array<string>}
   */
  dirtyAttributes = [];

  stateObservable = new Subject();

  /**
   * Подписка на прослушивание модели. Форма следит за атрибутами
   * Если приходит UnvalidatedState - автоматически перевалидируем аттрибут
   * @type {Subscription}
   */
  validationSubscription;

  /**
   * Create Form instance
   * @param {{}} data
   * @param {{}} context
   * @param {string|[string]} scenario
   */
  constructor(data = {}, context = {}, scenario = Model.SCENARIO_DEFAULT) {
    super(data, context, scenario);

    this.validationSubscription = this.getValidationObservable().subscribe((state) => {
      if (state instanceof UnvalidatedState) {
        return this.validateAttributes([state.attribute]);
      }

      return null;
    });

    this.initialState = this.state;
  }

  /**
   * Form state stream
   * @returns {StateMutationSubject}
   */
  getStateObservable() {
    return new StateMutationSubject(this);
  }

  /**
   * Aggregated stream
   * @returns {FormSubject}
   */
  getObservable() {
    return new FormSubject(this);
  }

  /**
   * Mark attribute as dirty
   * @param attribute
   */
  markAsDirty(attribute) {
    if (this.dirtyAttributes.indexOf(attribute) === -1) {
      this.dirtyAttributes.push(attribute);
    }
  }

  /**
   * Set form state property value
   * @param {string} name
   * @param {*} value
   */
  setStateValue(name, value) {
    this.state = {
      ...this.state,
      [name]: value,
    };

    this.stateObservable.next(new StateMutation({ [name]: value }));
  }

  /**
   * Get form state property value
   * @param {string} name
   * @returns {*}
   */
  getStateValue(name) {
    return this.state[name];
  }

  /**
   * Set state values
   * @param {Object<string, *>} values
   */
  setState(values) {
    this.state = {
      ...this.state,
      ...values,
    };

    this.stateObservable.next(new StateMutation(values));
  }

  /**
   * Set model attribute
   * @param attribute
   * @param value
   * @param {boolean} safe
   */
  setAttribute(attribute, value, safe = true) {
    this.set(attribute, value, safe);

    this.markAsDirty(attribute);
  }

  /**
   * Set model attribute and validate it
   * @param attribute
   * @param value
   * @param {boolean} safe
   * @returns {Promise.<boolean>}
   */
  setAttributeAndValidate(attribute, value, safe = true) {
    this.setAttribute(attribute, value, safe);

    return this.validateAttributes([attribute]);
  }

  /**
   * Get model attribute
   * @param attribute
   * @returns {*}
   */
  getAttribute(attribute) {
    return this.get(attribute);
  }

  /**
   * Set model attributes
   * @param {Object} values
   * @param {boolean} safe
   */
  setAttributes(values, safe = true) {
    Object.entries(values).forEach(([k, v]) => {
      this.set(k, v, safe);

      this.markAsDirty(k);
    });
  }

  /**
   * Set model attributes and validate them
   * @param values
   * @returns {Promise.<boolean>}
   */
  setAttributesAndValidate(values) {
    this.setAttributes(values);

    return this.validateAttributes(Object.keys(values));
  }

  isFormDirty() {
    return !!this.dirtyAttributes.length;
  }

  isFormValid() {
    return !this.hasErrors();
  }

  isFormChanged() {
    return this.initialState !== this.state;
  }

  isAttributeDirty(attribute) {
    return this.isAttributeChanged(attribute) || this.dirtyAttributes.indexOf(attribute) !== -1;
  }

  /**
   * @param {Array<string>|string} attributes
   * @returns {Promise<boolean>}
   */
  validate(attributes = []) {
    if (Array.isArray(attributes) && !attributes.length) {
      // помечаем все безопасные аттрибуты как "грязные"
      Object.keys(this.getValidators()).forEach(attribute => this.markAsDirty(attribute));
    } else {
      // добавляем аттрибуты в список "грязных"
      this.dirtyAttributes = [...new Set([
        ...this.dirtyAttributes,
        ...(typeof attributes === 'string' ? [attributes] : attributes)
      ])];
    }

    return super.validate(attributes);
  }

  /**
   * Validate Form
   * @param attributes {Array<string>|string}
   * @param onlyDirtyAttributes {boolean}
   * @returns {Promise.<boolean>}
   */
  validateAttributes(attributes, onlyDirtyAttributes = true) {
    let attrsToCheck = (typeof attributes === 'string' ? [attributes] : attributes) || [];

    if (onlyDirtyAttributes) {
      attrsToCheck = attrsToCheck.filter(i => this.isAttributeDirty(i));
    }

    if (attrsToCheck.length) {
      return this.validate(attrsToCheck);
    }

    return Promise.resolve(true);
  }

  /**
   * Validate Form's dirty attributes
   * @returns {Promise.<boolean>}
   */
  validateDirtyAttributes() {
    if (this.dirtyAttributes.length) {
      return this.validate(this.dirtyAttributes);
    }

    return Promise.resolve(true);
  }
}
