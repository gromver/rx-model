import { SuccessState, PendingState, WarningState, ErrorState, PristineState, MutationState } from '../states';
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
});

describe('getFirstError life cycle', () => {
  test('check url', async () => {
    const model = new ValidatorsModel();
    model.set('url', 'not valid');
    await model.validate('url').catch(() => Promise.resolve());

    const error = model.getFirstError();

    expect(error).toBeInstanceOf(ErrorState);
    expect(error.attribute).toBe('url');
  });

  test('check order', async () => {
    const model = new ValidatorsModel();
    model.set('url', 'not valid');
    model.set('multi', 'not valid');

    await model.validate('multi').catch(() => Promise.resolve());

    let error = model.getFirstError();

    expect(error).toBeInstanceOf(ErrorState);
    expect(error.attribute).toBe('multi');

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

    expect(model.getAccessibleAttributes()).toEqual(['presence', 'multiWithUnsafe']);

    model.setScenario([ValidatorsModel.SCENARIO_A]);

    expect(model.getAccessibleAttributes()).toEqual(['presence', 'multiWithUnsafe']);

    model.setScenario([ValidatorsModel.SCENARIO_A, ValidatorsModel.SCENARIO_B]);

    expect(model.getAccessibleAttributes()).toEqual(['presence', 'multiWithUnsafe', 'multi', 'notEditable']);
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
    expect(model.isAttributeEditable('multiWithUnsafe')).toBe(false);
  });

  test('Model and ValidationTracker', async () => {
    const model = new ValidatorsModel();
    const observer = jest.fn();

    model.getValidationObservable().subscribe(observer);

    model.set('multi', 'http://foo.bar');
    model.validate('multi');

    await new Promise(resolve => {
      setTimeout(resolve, 10);
    });

    model.set('multi', 'http://yandex.ru');

    await new Promise(resolve => {
      setTimeout(resolve, 500);
    });

    expect(observer.mock.calls[0][0]).toEqual(expect.any(PendingState));
    expect(observer.mock.calls[1][0]).toEqual(expect.any(ErrorState));
  });

  test('Model and ValidationTracker #2', async () => {
    const model = new ValidatorsModel();
    const observer = jest.fn();

    model.getValidationObservable().subscribe(observer);

    model.set('multi', 'http://foo.bar');
    model.validate('multi');

    await new Promise(resolve => {
      setTimeout(resolve, 10);
    });

    model.set('multi', 'http://yandex.ru');

    await model.validate('multi');

    expect(observer).toHaveBeenCalledTimes(3);
    expect(observer.mock.calls[0][0]).toEqual(expect.any(PendingState));
    expect(observer.mock.calls[1][0]).toEqual(expect.any(PendingState));
    expect(observer.mock.calls[2][0]).toEqual(expect.any(SuccessState));
  });

  test('Mutation observable test', async () => {
    const model = new ValidatorsModel();
    const observer = jest.fn();

    const observable = model.getMutationObservable();

    observable.subscribe(observer);

    model.set('presence', '1');
    model.set('presence', '2');
    model.set('presence', '3');
    model.set('url', '');

    expect(observer).toHaveBeenCalledTimes(4);
    expect(observer.mock.calls[0][0]).toEqual(expect.any(MutationState));
    expect(observer.mock.calls[1][0]).toEqual(expect.any(MutationState));
    expect(observer.mock.calls[2][0]).toEqual(expect.any(MutationState));
    expect(observer.mock.calls[3][0]).toEqual(expect.any(MutationState));

    observer.mockClear();
    observable.when(['presence']);
    model.set('presence', '1');
    model.set('presence', '2');
    model.set('url', '');
    expect(observer).toHaveBeenCalledTimes(2);

    observer.mockClear();
    observable.when(['url']);
    model.set('presence', '1');
    model.set('presence', '2');
    model.set('url', '');
    expect(observer).toHaveBeenCalledTimes(3);
  });

  test('AddScenario and RemoveScenario test', async () => {
    const model = new ValidatorsModel({}, 'a');

    expect(model.getScenario()).toEqual(['a']);

    model.addScenario('b');
    expect(model.getScenario()).toEqual(['a', 'b']);

    model.addScenario(['a', 'b', 'c', 'd']);
    expect(model.getScenario()).toEqual(['a', 'b', 'c', 'd']);

    model.removeScenario(['a', 'd']);
    expect(model.getScenario()).toEqual(['b', 'c']);

    model.addScenario('a');
    expect(model.getScenario()).toEqual(['b', 'c', 'a']);

    model.removeScenario('a');
    expect(model.getScenario()).toEqual(['b', 'c']);

    model.removeScenario(['a', 'b', 'c', 'd']);
    expect(model.getScenario()).toEqual([]);
  });
});
