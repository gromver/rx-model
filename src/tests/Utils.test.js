import utils from '../utils';

describe('Test utils.js', () => {
  test('resolveAttribute()', () => {
    expect(utils.resolveAttribute('foo.bar')).toEqual(['foo', 'bar']);
    expect(utils.resolveAttribute('foo.bar[0][1][2]')).toEqual(['foo', 'bar', 0, 1, 2]);
  });
});
