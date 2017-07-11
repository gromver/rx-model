import { Model } from '../..';
import { Validator } from '../../validators';

export default class NestedRulesModel extends Model {
  prepareSourceData(data) {
    return {
      ...data,
    };
  }

  rules() {
    return {
      root: new Validator(),
      'root.level1_obj': new Validator(),
      'root.level1_arr': new Validator(),
      'root.level1_arrays': new Validator(),
      'root.level1_obj.level2_1': new Validator(),
      'root.level1_obj.level2_2': new Validator(),
      'root.level1_arr[]': new Validator(),
      'root.level1_arrays[]': new Validator(),
      'root.level1_arrays[][]': new Validator(),
      'root.level1_arr_of_obj': new Validator(),
      'root.level1_arr_of_obj[]': new Validator(),
      'root.level1_arr_of_obj[].level2_1': new Validator(),
      'root.level1_arr_of_obj[].level2_2': new Validator(),
    };
  }
}
