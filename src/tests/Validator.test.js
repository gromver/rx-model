import { Validator, NumberValidator } from '../validators';
import { is } from 'immutable';

describe('Test Validator.js', () => {
  test('Validator.construct() test', () => {
    const validator = new Validator();

    expect(validator).toBeInstanceOf(Validator);
  });

  test('Immutable is() test', async () => {
    const validatorA = new Validator();
    let validatorB = new Validator();

    validatorA.foo = validatorB.foo = 'bar';

    expect(is(validatorA, validatorB)).toBe(true);
    expect(is(validatorA, validatorB.cache(false))).toBe(false);

    validatorB.duration(250);

    const fn = jest.fn();

    await new Promise((resolve) => {
      let steps = 6;

      const tick = () => {
        if (steps--) {
          setTimeout(() => {
            fn(is(validatorA, validatorB));

            tick();
          }, 50);
        } else {
          resolve();
        }
      };

      tick();
    });

    expect(fn.mock.calls).toEqual([[true], [false], [false], [false], [false], [true]]);

    expect(is(validatorA, validatorB.cache(true))).toBe(true);

    validatorB = new Validator();
    validatorB.foo = 'abc';

    expect(is(validatorA, validatorB)).toBe(false);
  });

  test('Validator is() test', () => {
    const validatorA = new Validator();
    let validatorB = new Validator();

    validatorA.foo = validatorB.foo = 'bar';

    expect(Validator.is(validatorA, validatorB)).toBe(true);
    expect(Validator.is(validatorA, validatorB.cache(false))).toBe(false);
    expect(Validator.is(validatorA, validatorB.cache(true))).toBe(true);

    validatorB = new Validator();
    validatorB.foo = 'abc';

    expect(Validator.is(validatorA, validatorB)).toBe(false);
  });
});

describe('Test NumberValidator.js', () => {
  test('greaterThan', async () => {
    const validator = new NumberValidator({
      greaterThan: 0
    });

    let result = await validator.validate(0, 'test').then(() => true).catch(() => false);
    expect(result).toBe(false);

    result = await validator.validate(-1, 'test').then(() => true).catch(() => false);
    expect(result).toBe(false);

    result = await validator.validate(1, 'test').then(() => true).catch(() => false);
    expect(result).toBe(true);
  });

  test('greaterThanOrEqual', async () => {
    const validator = new NumberValidator({
      greaterThanOrEqualTo: 0
    });

    let result = await validator.validate(0, 'test').then(() => true).catch(() => false);
    expect(result).toBe(true);

    result = await validator.validate(-1, 'test').then(() => true).catch(() => false);
    expect(result).toBe(false);

    result = await validator.validate(1, 'test').then(() => true).catch(() => false);
    expect(result).toBe(true);
  });

  test('lessThan', async () => {
    const validator = new NumberValidator({
      lessThan: 0
    });

    let result = await validator.validate(0, 'test').then(() => true).catch(() => false);
    expect(result).toBe(false);

    result = await validator.validate(-1, 'test').then(() => true).catch(() => false);
    expect(result).toBe(true);

    result = await validator.validate(1, 'test').then(() => true).catch(() => false);
    expect(result).toBe(false);
  });

  test('lessThanOrEqual', async () => {
    const validator = new NumberValidator({
      lessThanOrEqualTo: 0
    });

    let result = await validator.validate(0, 'test').then(() => true).catch(() => false);
    expect(result).toBe(true);

    result = await validator.validate(-1, 'test').then(() => true).catch(() => false);
    expect(result).toBe(true);

    result = await validator.validate(1, 'test').then(() => true).catch(() => false);
    expect(result).toBe(false);
  });

  test('equalTo', async () => {
    const validator = new NumberValidator({
      equalTo: 0
    });

    let result = await validator.validate(0, 'test').then(() => true).catch(() => false);
    expect(result).toBe(true);

    result = await validator.validate(-1, 'test').then(() => true).catch(() => false);
    expect(result).toBe(false);

    result = await validator.validate(1, 'test').then(() => true).catch(() => false);
    expect(result).toBe(false);
  });

  test('divisibleBy', async () => {
    const validator = new NumberValidator({
      divisibleBy: 2
    });

    let result = await validator.validate(2, 'test').then(() => true).catch(() => false);
    expect(result).toBe(true);

    result = await validator.validate(-1, 'test').then(() => true).catch(() => false);
    expect(result).toBe(false);

    result = await validator.validate(1, 'test').then(() => true).catch(() => false);
    expect(result).toBe(false);

    result = await validator.validate(0, 'test').then(() => true).catch(() => false);
    expect(result).toBe(true);
  });

  test('odd', async () => {
    const validator = new NumberValidator({
      odd: true
    });

    let result = await validator.validate(0, 'test').then(() => true).catch(() => false);
    expect(result).toBe(false);

    result = await validator.validate(2, 'test').then(() => true).catch(() => false);
    expect(result).toBe(false);

    result = await validator.validate(-1, 'test').then(() => true).catch(() => false);
    expect(result).toBe(true);

    result = await validator.validate(1, 'test').then(() => true).catch(() => false);
    expect(result).toBe(true);
  });

  test('even', async () => {
    const validator = new NumberValidator({
      even: true
    });

    let result = await validator.validate(0, 'test').then(() => true).catch(() => false);
    expect(result).toBe(true);

    result = await validator.validate(2, 'test').then(() => true).catch(() => false);
    expect(result).toBe(true);

    result = await validator.validate(-1, 'test').then(() => true).catch(() => false);
    expect(result).toBe(false);

    result = await validator.validate(1, 'test').then(() => true).catch(() => false);
    expect(result).toBe(false);
  });

  test('onlyInteger', async () => {
    const validator = new NumberValidator({
      onlyInteger: true
    });

    let result = await validator.validate('-1', 'test').then(() => true).catch(() => false);
    expect(result).toBe(true);

    result = await validator.validate('1', 'test').then(() => true).catch(() => false);
    expect(result).toBe(true);

    result = await validator.validate('-1.5', 'test').then(() => true).catch(() => false);
    expect(result).toBe(false);

    result = await validator.validate('1.5', 'test').then(() => true).catch(() => false);
    expect(result).toBe(false);
  });

  test('strict', async () => {
    const validator = new NumberValidator({
      strict: true
    });

    let result = await validator.validate('-1', 'test').then(() => true).catch(() => false);
    expect(result).toBe(false);

    result = await validator.validate('1df', 'test').then(() => true).catch(() => false);
    expect(result).toBe(false);

    result = await validator.validate('-1.5', 'test').then(() => true).catch(() => false);
    expect(result).toBe(false);

    result = await validator.validate('+1.5', 'test').then(() => true).catch(() => false);
    expect(result).toBe(false);

    result = await validator.validate('0.1', 'test').then(() => true).catch(() => false);
    expect(result).toBe(false);

    result = await validator.validate('1.01', 'test').then(() => true).catch(() => false);
    expect(result).toBe(false);

    result = await validator.validate('1', 'test').then(() => true).catch(() => false);
    expect(result).toBe(true);
  });
});