import Validator from './Validator';

export default class UnsafeValidator extends Validator {
  isSafe() {
    return false;
  }
}

