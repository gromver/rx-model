import { Model } from '../..';
import { PresenceValidator, UrlValidator, CustomValidator } from '../../validators';

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
      [ValidatorsModel.SCENARIO_A]: ['presence'],
      [ValidatorsModel.SCENARIO_B]: ['multi', 'presence']
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
    };
  }
}
