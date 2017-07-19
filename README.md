# rx-model
Model powered by RxJs and Immutable Js

Библиотека для создания валидируемых моделей и валидаторов. 

## Возможности
- Описание структуры данных любой вложенности
- Контроль доступа к полям модели
- Простое и управляемое валидирование данных
- Динамическое подстраивание бизнес логики модели под внутренние либо внешние изменения
- Aсинхронная валидция
- Поддержка сценариев, возможность использовать несколько сценариев одновременно 
- Встроенные валидаторы
- Inline валидаторы (CustomValidator)
- Создание валидаторов
- RxJs трекинг состояния модели (изменение значений и статуса валидации полей)
- Не зависит от окружения, применима как для фронтенда (реактивные формы) так и бэкенда

## Применение
#### Загрузка и валидация данных
```javascript
import { Model } from 'rx-model';
import { PresenceValidator, EmailValidator, StringValidator } from 'rx-model/validators';

// Модель представляет из себя данные и бизнес логику по работе с ними.
class BasicModel extends Model {
  // правила валидации
  rules() {
    return {
      // name - обязательное поле
      name: new PresenceValidator(),
      // email - обязательное поле, с проверкой на правильность емейла
      email: [
        new PresenceValidator(),
        new EmailValidator(),
      ],
      // password - обязательное поле, длиною не менее 6 символов
      password: [
        new PresenceValidator(),
        new StringValidator({
          minLength: 6
        }),
      ],
    }
  }

  prepareSourceData(data) {
    // здесь можно указать значения по умолчанию, a также нормализовать входные данные при создании модели
    return {
      name: '',
      email: '',
      password: '',
      ...data,
    }
  }
}

async function run() {
  // создадим модель с начальными данными
  let model = new BasicModel({
    // объект с начальными данными (например редактируемая сущность из БД)
    name: 'Guest'
  });
  // после создания модель имеет значения по умолчанию слитые с начальными данными (см. prepareSourceData)
  console.log(model.getAttributes()); // { name: 'Guest', email: '', password: '' }

  /**
   * Запись и валидация данных
   */
  model.setAttributes({
    name: 'John',
    email: 'john@mail.com',
    password: '123456'
  });
  let isValid = await model.validate();
  console.log(isValid); // true
  console.log(model.getAttributes()); // { name: 'John', email: 'john@mail.com', password: '123456' }

  // установим короткий пароль
  model.set('password', '123');
  isValid = await model.validate();
  console.log(isValid); // false
  console.log(model.getFirstError().message.toString()); // password - is too short (minimum is 6 characters)

  /**
   * Контроль доступа к полям модели
   */
  // по умолчанию только к безопасным (валидируемым) полям есть доступ на изменение
  model.setAttributes({
    email: 'new@mail.com',  // ok
    someValue1: 'value1',   // no access
    someValue2: 'value2',   // no access
  });
  model.set('someValue3', 'value3');  // no access

  console.log(model.getAttributes()); // { name: 'John', email: 'new@mail.com', password: '123' }

  // тем не менее можно записать не валидируемые значения в "небезопасном" режиме
  model.setAttributes({
    someValue1: 'value1',   // ok
    someValue2: 'value2',   // ok
  }, false);
  model.set('someValue3', 'value3', false);  // ok

  console.log(model.getAttributes()); // { name: 'John', email: 'new@mail.com', password: '123', someValue1: 'value1', someValue2: 'value2', someValue3: 'value3 }
}

run().then(() => console.log('end'));
```

#### Сценарии
```javascript
import { Model, Scenario } from 'rx-model';
import { PresenceValidator, EmailValidator, StringValidator, CompareValidator, CustomValidator } from 'rx-model/validators';

// Создадим модель для авторизации, регистрации пользователя
class UserModel extends Model {
  // правила валидации
  rules() {
    return {
      name: new PresenceValidator(),
      email: [
        new PresenceValidator(),
        new EmailValidator(),
        // данное правило будет применено только при авторизации
        Scenario.in([UserModel.SCENARIO_AUTHORIZE], new CustomValidator({
          // "inline" валидатор
          func: (value, attribute, model) => {
            return value === 'admin@example.com' ? Promise.resolve() : Promise.reject('Unknown email!');
          }
        }))
      ],
      password: [
        new PresenceValidator(),
        new StringValidator({
          minLength: 6
        }),
        // данное правило будет применено только при авторизации
        Scenario.in([UserModel.SCENARIO_AUTHORIZE], new CustomValidator({
          // "inline" валидатор
          func: (value, attribute, model) => {
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

  // сценарии работы с моделью, обычные константы (префикс SCENARIO_ опционален)
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

async function run() {
  // создадим пустую модель
  let model = new UserModel();

  /**
   * Авторизация
   */
  model.setScenario(UserModel.SCENARIO_AUTHORIZE);

  // авторизация фэйкового пользователя
  model.setAttributes({ email: 'user@fake.com', password: '123456' });
  let isValid = await model.validate();
  console.log(isValid); // false
  console.log(model.getFirstError().message.toString()); // Unknown email!

  // авторизация пользователя
  model.setAttributes({ email: 'admin@example.com', password: 'swordfish' });
  isValid = await model.validate();
  console.log(isValid); // true

  /**
   * Регистрация
   */
  model.setScenario(UserModel.SCENARIO_REGISTER);
  model.setAttributes({
    name: 'Guest',
    email: 'guest@example.com',
    password: '123',
  });
  isValid = await model.validate();
  console.log(isValid); // false
  console.log(model.getFirstError().message.toString()); // password - is too short (minimum is 6 characters)

  model.set('password', '123456');
  isValid = await model.validate();
  console.log(isValid); // true
  console.log(model.getAttributes()); // { email: 'guest@example.com', password: '123456', name: 'Guest' }

  /**
   * Изменение пользователя
   */
  model.setScenario(UserModel.SCENARIO_EDIT);
  model.set('name', 'newName');
  model.set('email', 'newEmail@example.com');
  model.set('password', 'newPassword');
  isValid = await model.validate();
  console.log(isValid); // true
  console.log(model.getAttributes()); // { email: 'guest@example.com', password: '123456', name: 'newName' }

  /**
   * Изменить пароль
   */
  model.setScenario(UserModel.SCENARIO_CHANGE_PASSWORD);
  model.set('name', 'newName');
  model.set('email', 'newEmail@example.com');
  model.set('password', 'newPassword');
  isValid = await model.validate();
  console.log(isValid); // false
  console.log(model.getFirstError().message.toString()); // confirmPassword - can't be blank

  model.set('confirmPassword', 'notEqualPassword');
  isValid = await model.validate();
  console.log(isValid); // false
  console.log(model.getFirstError().message.toString()); // must equals "newPassword" value

  model.set('confirmPassword', 'newPassword');
  isValid = await model.validate();
  console.log(isValid); // true
  console.log(model.getAttributes()); // { email: 'guest@example.com', name: 'Guest', newPassword: '123456', confirmPassword: 'newPassword' }
}

run().then(() => console.log('end'));
```

## Документация
Детально ознакомиться с библиотекой можно в разделе [Wiki].

## License

rx-model is released under the MIT license.
See the [LICENSE file][] for license text and copyright information.

[LICENSE file]: https://github.com/gromver/rx-model/blob/master/LICENSE
[Wiki]: https://github.com/gromver/rx-model/wiki