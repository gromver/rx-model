import State from './State';

export default class PendingState extends State {
  static STATUS = undefined;
  static LOADING_MESSAGE = 'Verification';

  rejectFn = null;

  constructor(options, rejectFn) {
    super({
      message: PendingState.LOADING_MESSAGE,
      ...options,
    });

    this.rejectFn = rejectFn;
  }

  abort() {
    this.rejectFn();
  }


  getStatus() {
    return PendingState.STATUS;
  }
}
