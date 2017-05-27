import {Model} from '../..'
import {MultiValidator, PresenceValidator, UrlValidator, CustomValidator} from '../../validators'

export default class ValidatorsModel extends Model {
  prepareSourceData(data) {
    return {
      ...data,
      url: ''
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
                resolve()
              }
              else {
                reject(`${value} is wrong!`)
              }
            }, 500)
          })
        })
      ]
    }
  }
}
