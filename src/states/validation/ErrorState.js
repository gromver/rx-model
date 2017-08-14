import State from './State';

export default class ErrorState extends State {
  static STATUS = 'error';

  getStatus() {
    return ErrorState.STATUS;
  }
}
