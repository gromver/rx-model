import { Validator, Message } from '../../validators';
import { is } from 'immutable';

describe('is', () => {
  test('validators with identical props are equal', async () => {
    const validatorA = new Validator();
    let validatorB = new Validator();

    validatorA.foo = validatorB.foo = 'bar';

    expect(is(validatorA, validatorB)).toBe(true);
  });

  test('validators with different props are not equal', async () => {
    const validatorA = new Validator();
    let validatorB = new Validator();

    validatorA.foo = 1;
    validatorB.foo = 2;

    expect(is(validatorA, validatorB)).toBe(false);
  });
});

describe('cache behavior', () => {
  test('validator with disabled caching is always not equals', async () => {
    const validatorA = new Validator();
    let validatorB = new Validator();

    validatorA.foo = validatorB.foo = 'bar';

    expect(is(validatorA, validatorB)).toBe(true);
    expect(is(validatorA, validatorB.cache(false))).toBe(false);
    expect(is(validatorA, validatorB)).toBe(false);
    expect(is(validatorA, validatorB.cache(true))).toBe(true);
  });
});

describe('duration behavior', () => {
  test(`if any of comparable validators has disabled caching and 
  any of them has a duration value - is() method will return false for equal validators
  each duration milliseconds`, async () => {
    const validatorA = new Validator();
    let validatorB = new Validator();

    validatorA.foo = validatorB.foo = 'bar';
    expect(is(validatorA, validatorB)).toBe(true); // validators are equal

    validatorB.cache(false);  // disable cache
    validatorB.duration(250); // set duration

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

    expect(fn.mock.calls).toEqual([[false], [true], [true], [true], [true], [false]]);
  });
});

describe('createMessage', () => {
  test('returns a Message instance', async () => {
    const validator = new Validator();

    expect(validator.createMessage('aa', {})).toEqual(expect.any(Message));
    expect(Validator.createMessage('aa', {})).toEqual(expect.any(Message));
  });
});