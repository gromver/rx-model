export default class AttributeMutation {
  /**
   * @type {string}
   */
  attribute;
  /**
   * @type {*}
   */
  value;

  constructor(attribute, value) {
    this.attribute = attribute;
    this.value = value;
  }
}
