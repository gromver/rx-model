import { SuccessState, PendingState, WarningState, ErrorState, PristineState } from '../states';
import { MultiValidator, PresenceValidator, UrlValidator, CustomValidator } from '../validators';
import { Map } from 'immutable';
import ValidatorsModel from './models/ValidatorsModel';
import RulesTestModel from './models/RulesTestModel';

describe('Test Model.js', () => {
  const data = { presence: 'bar' };

  const model = new ValidatorsModel(data);

  test('construct()', () => {
    expect(model.attributes).toBeInstanceOf(Map);

    expect(model.getAttributes()).toMatchObject({
      ...data,
      url: '',
    });
  });

  test('getValidators', () => {
    const model = new RulesTestModel();

    const validators = model.getValidators();

    expect(validators).toEqual({
      instance: new PresenceValidator(),
      func: new PresenceValidator(),
      array: new MultiValidator({
        validators: [
          new PresenceValidator(),
          new UrlValidator()
        ]
      }),
      arrayWithFunc: new MultiValidator({
        validators: [
          new PresenceValidator(),
          new UrlValidator()
        ]
      }),
      funcWithFunc: new PresenceValidator(),
      funcWithFunc2: new MultiValidator({
        validators: [
          new PresenceValidator(),
        ]
      }),
    })
  });

  test('setAttributes', () => {
    model.setAttributes({
      presence: 'bar',
      url: 'http://yandex.ru',
      multi: 'http://google.com',
    });

    expect(model.attributes.toJS()).toMatchObject({
      presence: 'bar',
      url: 'http://yandex.ru',
      multi: 'http://google.com',
    });
  });

  test('validate', () => {
    const subscriber = jest.fn(/*state => console.log('ST', state)*/);

    const subscription = model.subscribe(subscriber);

    return model.validate(['presence', 'url', 'multi']).catch(() => {
      expect(subscriber.mock.calls[0][0]).toEqual(expect.any(SuccessState));
      expect(subscriber.mock.calls[1][0]).toEqual(expect.any(PendingState));
      expect(subscriber.mock.calls[2][0]).toEqual(expect.any(ErrorState));

      subscription.unsubscribe();
    });
  });
});

describe('getFirstError life cycle', () => {
  const model = new ValidatorsModel();

  model.set('url', 'not valid');

  test('check url', async () => {
    await model.validate('url').catch(() => Promise.resolve());

    const error = model.getFirstError();

    expect(error).toBeInstanceOf(ErrorState);
    expect(error.attribute).toBe('url');
  });

  test('check order', async () => {
    model.set('multi', 'not valid');

    await model.validate('multi').catch(() => Promise.resolve());

    let error = model.getFirstError();

    expect(error).toBeInstanceOf(ErrorState);
    expect(error.attribute).toBe('url');

    await model.validate().catch(() => Promise.resolve());

    error = model.getFirstError();

    expect(error).toBeInstanceOf(ErrorState);
    expect(error.attribute).toBe('presence');
  });

  test('isModelChanged()', () => {
    const model = new ValidatorsModel();

    expect(model.isModelChanged()).toBe(false);

    model.set('url', '');

    expect(model.isModelChanged()).toBe(false);

    model.set('url', 'abc');

    expect(model.isModelChanged()).toBe(true);
  })
});
