/**
 * Base validation state class
 */
export default class State {
  static STATUS = undefined;

  /**
   * @type {string}
   */
  attribute;
  /**
   * @type {Message|string}
   */
  message;

  constructor({ attribute, message }) {
    this.attribute = attribute;
    this.message = message;
  }

  getStatus() {
    return State.STATUS;
  }
}
