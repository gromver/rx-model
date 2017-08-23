import { Model } from '../..';
import { PresenceValidator, UrlValidator } from '../../validators';

export default class RulesTestModel extends Model {
  prepareSourceData(data) {
    return {
      ...data,
    };
  }

  rules() {
    return {
      instance: new PresenceValidator(),
      func: () => {
        return new PresenceValidator();
      },
      skip: false,
      array: [
        new PresenceValidator(),
        new UrlValidator()
      ],
      arrayWithFunc: [
        false,
        new PresenceValidator(),
        () => new UrlValidator()
      ],
      funcWithFunc: () => {
        return () => {
          return new PresenceValidator()
        }
      },
      funcWithFunc2: () => [
        () => new PresenceValidator()
      ]
    };
  }
}
