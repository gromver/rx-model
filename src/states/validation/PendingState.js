import State from './State';

export default class PendingState extends State {
  static LOADING_MESSAGE = 'Обработка';

  state = null;
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
}
