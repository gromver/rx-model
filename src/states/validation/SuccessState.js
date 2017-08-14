import State from './State';

export default class SuccessState extends State {
  static STATUS = 'success';

  getStatus() {
    return SuccessState.STATUS;
  }
}
