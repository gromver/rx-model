import State from './State';

export default class PristineState extends State {
  static STATUS = undefined;

  getStatus() {
    return PristineState.STATUS;
  }
}
