import { SuccessState, PendingState, WarningState, ErrorState, UnvalidatedState, PristineState } from '../../states/index';
import ValidatorsModel from '../__models/ValidatorsModel';

describe('Test ValidationStateSubject.js', () => {
  test('when()', async () => {
    const model = new ValidatorsModel();
    const observer = jest.fn();

    const observable = model.getValidationObservable();

    observable.when(['presence', 'url']).subscribe(observer);
    await model.validate();

    expect(observer).toHaveBeenCalledTimes(2);
    expect(observer.mock.calls[0][0]).toEqual(expect.any(SuccessState));
    expect(observer.mock.calls[1][0]).toEqual(expect.any(ErrorState));
  });

  test('whenValid()', async () => {
    const model = new ValidatorsModel();
    const observer = jest.fn();

    const observable = model.getValidationObservable();

    observable.whenValid(['presence', 'url']).subscribe(observer);
    await model.validate();

    expect(observer).toHaveBeenCalledTimes(1);
    expect(observer.mock.calls[0][0]).toEqual(expect.any(SuccessState));
  });

  test('whenSuccess()', async () => {
    const model = new ValidatorsModel();
    const observer = jest.fn();

    const observable = model.getValidationObservable();

    observable.whenSuccess(['presence', 'url']).subscribe(observer);
    await model.validate();

    expect(observer).toHaveBeenCalledTimes(1);
    expect(observer.mock.calls[0][0]).toEqual(expect.any(SuccessState));
  });

  test('whenPending()', async () => {
    const model = new ValidatorsModel();
    const observer = jest.fn();

    const observable = model.getValidationObservable();

    observable.whenPending(['presence', 'url', 'multi']).subscribe(observer);
    model.set('multi', 'http://some.url');
    await model.validate();

    expect(observer).toHaveBeenCalledTimes(1);
    expect(observer.mock.calls[0][0]).toEqual(expect.any(PendingState));
  });

  test('whenError()', async () => {
    const model = new ValidatorsModel();
    const observer = jest.fn();

    const observable = model.getValidationObservable();

    observable.whenError(['presence', 'url', 'multi']).subscribe(observer);
    await model.validate();

    expect(observer).toHaveBeenCalledTimes(2);
    expect(observer.mock.calls[0][0]).toEqual(expect.any(ErrorState));
    expect(observer.mock.calls[1][0]).toEqual(expect.any(ErrorState));
  });

  test('whenUnvalidated()', async () => {
    const model = new ValidatorsModel();
    const observer = jest.fn();

    const observable = model.getValidationObservable();

    observable.whenUnvalidated(['presence', 'url', 'multi']).subscribe(observer);
    await model.validate();
    model.invalidateValidators();
    await model.validate();

    expect(observer).toHaveBeenCalledTimes(3);
    expect(observer.mock.calls[0][0]).toEqual(expect.any(UnvalidatedState));
    expect(observer.mock.calls[1][0]).toEqual(expect.any(UnvalidatedState));
    expect(observer.mock.calls[2][0]).toEqual(expect.any(UnvalidatedState));
  });

  // todo whenWarning
});
