import { Form } from '../../index';
import { PresenceValidator, StringValidator, Validator } from '../../validators/index';

export default class TestForm extends Form {
// eslint-disable-next-line class-methods-use-this
  prepareSourceData(data) {
    return {
      name: '',
      password: '',
      ...data,
    };
  }

// eslint-disable-next-line class-methods-use-this
  rules() {
    return {
      name: new PresenceValidator(),
      password: [
        new PresenceValidator(),
        new StringValidator({
          minLength: 6,
        }),
      ],
      'nested.value': new Validator(),
    };
  }
}
