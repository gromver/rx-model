import State from './State';

export default class UnvalidatedState extends State {
  static STATUS = undefined;

  getStatus() {
    return UnvalidatedState.STATUS;
  }
}
