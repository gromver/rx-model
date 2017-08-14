import State from './State';

export default class WarningState extends State {
  static STATUS = 'warning';

  getStatus() {
    return WarningState.STATUS;
  }
}
