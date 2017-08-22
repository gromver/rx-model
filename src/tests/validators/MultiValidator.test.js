import { MultiValidator, SafeValidator, UnsafeValidator, PresenceValidator, EmailValidator } from '../../validators';

describe('construct', () => {
  test('set initial properties', () => {
    const validators = [new SafeValidator(), new UnsafeValidator()];
    const instance = new MultiValidator({
      isAny: true,
      validators,
    });

    expect(instance).toEqual({
      __isCached: true,
      isAny: true,
      validators,
    });
  });
});

describe('isSafe', () => {
  test('should return false if the validators is empty', () => {
    const validator = new MultiValidator({});

    expect(validator.isSafe()).toBe(false);
  });

  test('should return true if the validators is set', () => {
    const validator = new MultiValidator({
      validators: [ new SafeValidator() ]
    });

    expect(validator.isSafe()).toBe(true);
  });

  test('should return false if the validators is set and at least one validator is unsafe', () => {
    const validator = new MultiValidator({
      validators: [ new SafeValidator(), new UnsafeValidator(), new SafeValidator() ]
    });

    expect(validator.isSafe()).toBe(false);
  });
});

describe('validate', () => {
  test('should return true if the validators is empty', async () => {
    const validator = new MultiValidator({});

    const isValid = await validator.validate().then(() => true);

    expect(isValid).toBe(true);
  });


  test('should return false', async () => {
    const validator = new MultiValidator({
      validators: [ new PresenceValidator() ]
    });

    const isValid = await validator.validate('').then(() => true).catch(() => false);

    expect(isValid).toBe(false);
  });

  test('should return true', async () => {
    const validator = new MultiValidator({
      validators: [ new PresenceValidator() ]
    });

    const isValid = await validator.validate('abc').then(() => true).catch(() => false);

    expect(isValid).toBe(true);
  });

  test('should return false', async () => {
    const validator = new MultiValidator({
      validators: [ new PresenceValidator(), new EmailValidator() ]
    });

    const isValid = await validator.validate('abc').catch(() => false);

    expect(isValid).toBe(false);
  });

  test('should return email error message', async () => {
    const validator = new MultiValidator({
      validators: [ new PresenceValidator(), new EmailValidator() ]
    });

    const attribute = 'attr';
    const error = await validator.validate('abc', attribute).catch(error => error);

    expect(error.toString()).toBe(EmailValidator.createMessage(EmailValidator.MESSAGE, {
      attribute
    }).toString());
  });
});
