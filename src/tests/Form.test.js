import TestForm from './__forms/TestForm';

describe('Test Form.js', () => {
  test('construct()', () => {
    const form = new TestForm();

    expect(form).toBeInstanceOf(TestForm);
  });

  test('setStateValue() & getStateValue()', () => {
    const form = new TestForm();

    form.setStateValue('foo', 'bar');

    expect(form.getStateValue('foo')).toBe('bar');
  });

  test('setState()', () => {
    const form = new TestForm();

    form.setStateValue('a', 'a');
    form.setState({
      a: 'A',
      b: 'B',
    });

    expect(form.getStateValue('a')).toBe('A');
    expect(form.getStateValue('b')).toBe('B');
  });

  test('setAttribute() and getAttribute()', () => {
    const form = new TestForm();
    const fn = jest.fn();

    form.getAttributeObservable().subscribe(fn);

    form.setAttribute('name', 'John');

    expect(form.getAttribute('name')).toEqual('John');

    expect(form.get('name')).toEqual('John');

    form.setAttribute('name', 'Paul');

    expect(fn).toHaveBeenCalledTimes(2);

    form.setAttribute('nested.value', 123);

    expect(form.get('nested')).toEqual({
      value: 123,
    });
  });


  test('setAttributes() and getAttributes()', () => {
    const form = new TestForm();

    form.setAttributes({
      name: 'Peter',
      password: 123,
    });

    expect(form.getAttributes()).toEqual({
      name: 'Peter',
      password: 123,
    });

    form.setAttribute('nested.value', 123);

    expect(form.getAttributes()).toEqual({
      name: 'Peter',
      nested: {
        value: 123,
      },
      password: 123,
    });
  });

  test('isFormDirty', () => {
    let form = new TestForm();

    expect(form.isFormDirty()).toBe(false);

    form.setAttribute('name', '');

    expect(form.isFormDirty()).toBe(true);

    form = new TestForm();

    form.setAttributes({
      name: '',
      password: '',
    });

    expect(form.isFormDirty()).toBe(true);
  });

  test('isFormValid()', async () => {
    const form = new TestForm();

    expect(form.isFormValid()).toBe(true);

    form.setAttribute('name', 'John');

    let result = await form.isFormValid();

    expect(result).toBe(true);

    await form.validate();

    result = await form.isFormValid();

    expect(result).toBe(false);

    form.setAttribute('password', '123qwe');

    await form.validate();

    result = await form.isFormValid();

    expect(result).toBe(true);
  });

  test('isFormChanged()', () => {
    const form = new TestForm();

    expect(form.isFormChanged()).toBe(false);

    form.setAttribute('name', '');

    expect(form.isFormChanged()).toBe(false);

    form.setAttribute('name', 'John');

    expect(form.isFormChanged()).toBe(false);

    form.setStateValue('name', '');

    expect(form.isFormChanged()).toBe(true);
  });

  test('isAttributeDirty()', () => {
    const form = new TestForm();

    expect(form.isAttributeDirty('name')).toBe(false);

    form.setAttribute('name', '');

    expect(form.isAttributeDirty('name')).toBe(true);
  });

  test('isAttributeChanged()', () => {
    const form = new TestForm();

    expect(form.isAttributeChanged('name')).toBe(false);

    form.setAttribute('name', '');

    expect(form.isAttributeChanged('name')).toBe(false);

    form.setAttribute('name', 'abc');

    expect(form.isAttributeChanged('name')).toBe(true);
  });

  test('validate()', async () => {
    const form = new TestForm();

    let result = await form.validate();

    expect(result).toBe(false);

    form.setAttributes({
      name: 'John',
      password: '123',
    });

    result = await form.validate();

    expect(result).toBe(false);

    form.setAttribute('password', '123qwe');

    result = await form.validate();

    expect(result).toBe(true);
  });

  test('validate and dirtyAttributes', () => {
    const form = new TestForm();

    form.setAttribute('name', '');
    expect(form.dirtyAttributes).toEqual(['name']);

    form.validate();

    expect(form.dirtyAttributes).toEqual(['name', 'password', 'nested.value']);
  });

  test('validateAttributes()', async () => {
    const validate = jest.fn(() => Promise.resolve(true));

    const form = new TestForm();
    form.validate = validate;

    form.setAttributes({
      name: 'John',
    });

    await form.validateAttributes('name');

    await form.validateAttributes(['name', 'password']);

    form.setAttribute('password', '123qwe');

    await form.validateAttributes(['name', 'password']);

    expect(validate.mock.calls).toEqual([[['name']], [['name']], [['name', 'password']]]);
  });
});

describe('StateMutationSubject', async () => {
  test('subscribe', async () => {
    const form = new TestForm();
    const observer = jest.fn();

    const observable = form.getStateObservable();
    observable.subscribe(observer);

    form.setState({ a: '' });
    form.setAttribute('name', '');
    await form.validate();
    expect(observer).toHaveBeenCalledTimes(1);

    observer.mockClear();

    observable.when(['a']);
    form.setState({ a: '' });
    form.setState({ b: '' });
    form.setAttribute('name', '');
    await form.validate();

    expect(observer).toHaveBeenCalledTimes(1);
  });

  test('when with restrictions', async () => {
    const form = new TestForm();
    const observer = jest.fn();

    const observable = form.getStateObservable().when(['a']);
    observable.subscribe(observer);

    form.setState({ a: '' });
    form.setState({ b: '' });
    form.setState({ c: '' });
    form.setState({ a: '', b: '' });
    form.setAttribute('name', '');
    await form.validate();

    expect(observer).toHaveBeenCalledTimes(2);
  });

  test('whenSubscribed', async () => {
    const form = new TestForm();
    const observer = jest.fn();

    const observable = form.getStateObservable();
    observable.whenSubscribed().subscribe(observer);

    expect(observer).toHaveBeenCalledTimes(1);
  });
});