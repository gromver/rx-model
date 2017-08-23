import { Scenario } from '..'

describe('constructor', () => {
  test('set initial props', () => {
    const instance = new Scenario(Scenario.APPLY_IN, ['foo', 'bar'], false);

    expect(instance).toEqual({
      apply: Scenario.APPLY_IN,
      scenarios: ['foo', 'bar'],
      validator: false,
    })
  });

  test('throws an error if the "scenarios" property is not an array', () => {
    expect(() => {
      new Scenario(Scenario.APPLY_IN, 'foo', false);
    }).toThrow()
  });

  test('throws an error if the "apply" property is wrong', () => {
    expect(() => {
      new Scenario('abc', ['foo', 'bar'], false);
    }).toThrow()
  });
});

describe('in and except', () => {
  test('in', () => {
    const instance = new Scenario(Scenario.APPLY_IN, ['foo', 'bar'], false);

    expect(Scenario.in(['foo', 'bar'], false)).toEqual(instance);
  });

  test('except', () => {
    const instance = new Scenario(Scenario.APPLY_EXCEPT, ['foo', 'bar'], false);

    expect(Scenario.except(['foo', 'bar'], false)).toEqual(instance);
  });
});