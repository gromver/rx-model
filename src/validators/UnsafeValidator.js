import Validator from './Validator';

/**
 * Наличие этого валидатора спорно, скорее всего он лишний, и будет убран
 */
export default class UnsafeValidator extends Validator {
  isSafe() {
    return false;
  }
}

