import { Model, Scenario } from '../..';
import { PresenceValidator, UrlValidator, CustomValidator, UnsafeValidator, Validator } from '../../validators';

export default class ValidatorsModel extends Model {
  static SCENARIO_A = 'a';
  static SCENARIO_B = 'b';

  prepareSourceData(data) {
    return {
      ...data,
      url: '',
    };
  }

  scenarios() {
    return {
      [ValidatorsModel.SCENARIO_A]: ['presence', 'multiWithUnsafe'],
      [ValidatorsModel.SCENARIO_B]: ['multi', 'presence', 'notEditable', 'multiWithUnsafe']
    }
  }

  rules() {
    return {
      presence: new PresenceValidator(),
      url: new UrlValidator(),
      multi: [
        new PresenceValidator(),
        new UrlValidator(),
        new CustomValidator({
          func: (value, attribute) => new Promise((resolve, reject) => {
            setTimeout(() => {
              if (value === 'http://yandex.ru') {
                resolve();
              } else {
                reject(`${value} is wrong!`);
              }
            }, 500);
          }),
        }),
      ],
      notEditable: false,
      multiWithUnsafe: [
        Scenario.in([ValidatorsModel.SCENARIO_A], new UnsafeValidator()),
        Scenario.in([ValidatorsModel.SCENARIO_B, ValidatorsModel.SCENARIO_DEFAULT], new Validator()),
      ]
    };
  }
}
