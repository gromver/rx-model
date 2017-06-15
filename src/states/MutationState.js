import State from './State';

export default class MutationState extends State {
  /**
   * @type {*}
   */
  value;

  constructor({ attribute, value }) {
    super({ attribute });

    this.value = value;
  }
}
