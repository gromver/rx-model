import { Message } from '../../validators';

describe('construct', () => {
  test('set initial properties', async () => {
    const message = new Message('foo', { bar: 'dar' });

    expect(message).toEqual({
      message: 'foo',
      bindings: { bar: 'dar' },
    });
  });
});

describe('formatMessage', () => {
  test('return a string with applied bindings', async () => {
    expect(Message.formatMessage('{placeholder} bar', { placeholder: 'foo' })).toBe('foo bar');
  });
});


describe('toString', () => {
  test('returns a Message instance', async () => {
    const message = new Message('{placeholder} bar', { placeholder: 'foo' });

    expect(String(message)).toBe('foo bar');
  });
});