import { Model } from '../..';
import {
  PresenceValidator, NumberValidator, ObjectValidator, ArrayValidator,
} from '../../validators';

export default class ComplexDataModel extends Model {
  // правила валидации
  rules() {
    return {
      'simple': new PresenceValidator(),
      'object': new ObjectValidator(),
      'object.a': new PresenceValidator(),
      'object.b': new PresenceValidator(),
      'array': new ArrayValidator(),
      'array[]': new ObjectValidator(),
      'array[].a': new PresenceValidator(),
      'array[].b': [
        new PresenceValidator(),
        new NumberValidator(),
      ],
    }
  }

  // prepareSourceData(data) {
  //   return {
  //     object: {},
  //     array: [],
  //     ...data,
  //   };
  // }
}