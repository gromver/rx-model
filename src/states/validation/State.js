/**
 * Base validation state class
 */
export default class State {
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
}
