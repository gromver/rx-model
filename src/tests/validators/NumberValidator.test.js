import { NumberValidator } from '../../validators';

describe('NumberValidator', () => {
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

  test('onlyInteger false', async () => {
    const validator = new NumberValidator();

    let result = await validator.validate(0, 'test').then(() => true).catch(() => false);
    expect(result).toBe(true);

    result = await validator.validate(-1, 'test').then(() => true).catch(() => false);
    expect(result).toBe(true);

    result = await validator.validate(1, 'test').then(() => true).catch(() => false);
    expect(result).toBe(true);

    result = await validator.validate(1.45, 'test').then(() => true).catch(() => false);
    expect(result).toBe(true);

    result = await validator.validate(-1.45, 'test').then(() => true).catch(() => false);
    expect(result).toBe(true);
  });

  test('onlyInteger true', async () => {
    const validator = new NumberValidator({
      onlyInteger: true
    });

    let result = await validator.validate(0, 'test').then(() => true).catch(() => false);
    expect(result).toBe(true);

    result = await validator.validate(-1, 'test').then(() => true).catch(() => false);
    expect(result).toBe(true);

    result = await validator.validate(1, 'test').then(() => true).catch(() => false);
    expect(result).toBe(true);

    result = await validator.validate(1.45, 'test').then(() => true).catch(() => false);
    expect(result).toBe(false);

    result = await validator.validate(-1.45, 'test').then(() => true).catch(() => false);
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
    expect(result).toBe(true);

    result = await validator.validate('1.01', 'test').then(() => true).catch(() => false);
    expect(result).toBe(true);

    result = await validator.validate('1', 'test').then(() => true).catch(() => false);
    expect(result).toBe(true);
  });

  test('strict and onlyInteger', async () => {
    const validator = new NumberValidator({
      strict: true,
      onlyInteger: true
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