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
  });

  test('getEditableAttributes()', () => {
    const model = new ValidatorsModel();

    model.setScenario(ValidatorsModel.SCENARIO_A);

    expect(model.getValidatableAttributes()).toEqual(['presence', 'multiWithUnsafe']);

    model.setScenario([ValidatorsModel.SCENARIO_A]);

    expect(model.getValidatableAttributes()).toEqual(['presence', 'multiWithUnsafe']);

    model.setScenario([ValidatorsModel.SCENARIO_A, ValidatorsModel.SCENARIO_B]);

    expect(model.getValidatableAttributes()).toEqual(['presence', 'multiWithUnsafe', 'multi', 'notEditable']);
  });

  test('isScenario()', () => {
    const model = new ValidatorsModel();

    model.setScenario(ValidatorsModel.SCENARIO_A);

    expect(model.isScenario(ValidatorsModel.SCENARIO_A)).toBe(true);
    expect(model.isScenario(ValidatorsModel.SCENARIO_B)).toBe(false);

    model.setScenario([ValidatorsModel.SCENARIO_A, ValidatorsModel.SCENARIO_B]);

    expect(model.isScenario(ValidatorsModel.SCENARIO_A)).toBe(true);
    expect(model.isScenario(ValidatorsModel.SCENARIO_B)).toBe(true);
  });

  test('multi scenario validation', async () => {
    const model = new ValidatorsModel();

    model.setScenario(ValidatorsModel.SCENARIO_A);
    let result = await model.validate();
    expect(result).toBe(false);

    model.set('presence', 'value');
    result = await model.validate();
    expect(result).toBe(true);

    model.setScenario([ValidatorsModel.SCENARIO_A, ValidatorsModel.SCENARIO_B]);
    result = await model.validate();
    expect(result).toBe(false);

    model.set('multi', 'http://yandex.ru');
    result = await model.validate();
    expect(result).toBe(true);
  });

  test('isAttributeEditable()', () => {
    const model = new ValidatorsModel();

    expect(model.isAttributeEditable('presence')).toBe(true);
    expect(model.isAttributeEditable('url')).toBe(true);
    expect(model.isAttributeEditable('multi')).toBe(true);
    expect(model.isAttributeEditable('notEditable')).toBe(false);
    expect(model.isAttributeEditable('multiWithUnsafe')).toBe(true);

    model.setScenario(ValidatorsModel.SCENARIO_A);
    expect(model.isAttributeEditable('presence')).toBe(true);
    expect(model.isAttributeEditable('url')).toBe(false);
    expect(model.isAttributeEditable('multi')).toBe(false);
    expect(model.isAttributeEditable('notEditable')).toBe(false);
    expect(model.isAttributeEditable('multiWithUnsafe')).toBe(false);

    model.setScenario(ValidatorsModel.SCENARIO_B);
    expect(model.isAttributeEditable('multiWithUnsafe')).toBe(true);

    model.setScenario([ValidatorsModel.SCENARIO_A, ValidatorsModel.SCENARIO_B]);
    expect(model.isAttributeEditable('presence')).toBe(true);
    expect(model.isAttributeEditable('url')).toBe(false);
    expect(model.isAttributeEditable('multi')).toBe(true);
    expect(model.isAttributeEditable('notEditable')).toBe(false);
    expect(model.isAttributeEditable('multiWithUnsafe')).toBe(true);
  });
});
