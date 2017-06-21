# rx-model
Model powered by RxJs and Immutable Js

Библиотека для для создания валидируемых моделей и валидаторов. 

Что дает?

- Простое и управляемое валидирование данных
- Не зависит от окружения, применим как для фронтенда так и бэкенда
- Полностью асинхронная валидция
- Поддержка сценариев, возможность использовать несколько сценариев одновременно 
- Оптимизация валидации данных (полезно для фронта)
- Встроенные валидаторы

# Модель
Модель представляет из себя данные и бизнес логику по работе с ними.

Создадим модель для авторизации, регистрации пользователя

```javascript
import { Model, Scenario } from '../';
import { PresenceValidator, EmailValidator, StringValidator, CompareValidator, CustomValidator } from '../validators';

class UserModel extends Model {
  // опишем правила валидации
  rules() {
    return {
      name: new PresenceValidator(),
      email: [
        new PresenceValidator(),
        new EmailValidator(),
      ],
      password: [
        new PresenceValidator(),
        new StringValidator({
          minLength: 6
        }),
        // данное правило будет применено только при авторизации
        Scenario.in([UserModel.SCENARIO_AUTHORIZE], new CustomValidator({
          func: (value, attribute) => {
            return value === 'swordfish' ? Promise.resolve() : Promise.reject('Unknown password!');
          }
        }))
      ],
      confirmPassword: [
        new PresenceValidator(),
        new CompareValidator({
          compareAttribute: 'password'
        })
      ]
    }
  }

  // добавим сценарии работы с моделью
  // это обычные константы с префиксом SCENARIO_ (префикс опционален)
  static SCENARIO_AUTHORIZE = 'authorize';
  static SCENARIO_REGISTER = 'register';
  static SCENARIO_EDIT = 'edit';
  static SCENARIO_CHANGE_PASSWORD = 'changePassword';

  // определим правила применимые для каждого сценария
  scenarios() {
    return {
      [UserModel.SCENARIO_DEFAULT]: [],
      [UserModel.SCENARIO_AUTHORIZE]: ['email', 'password'],
      [UserModel.SCENARIO_EDIT]: ['name'],
      [UserModel.SCENARIO_REGISTER]: ['name', 'email', 'password'],
      [UserModel.SCENARIO_CHANGE_PASSWORD]: ['password', 'confirmPassword'],
    }
  }
}
```

Применим модель
Авторизация пользователя


