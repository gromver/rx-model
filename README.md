# rx-model
Model powered by RxJs

Библиотека для создания валидируемых моделей, форм и валидаторов.

## Install
```
npm install rx-model --save
```

## Overview
Библиотека представляет из себя 3 основных класса:
- Model - базовый класс для работы с данными, применим на стороне сервера
- Form - унаследован от Model, предназначен для создания форм на клиенте
- Validator - базовый класс для создания валидаторов
Также в библиотеку входят валидаторы:
- PresenceValidator
- StringValidator
- NumberValidator
- DateValidator
- EmailValidator
- RangeValidator
- UrlValidator
- CompareValidator
- CustomValidator
- ObjectValidator
- ArrayValidator
- SafeValidator
- UnsafeValidator

## Features
- Описание структуры данных любой вложенности
- Контроль доступа к полям модели
- Простое и управляемое валидирование данных
- Динамическое подстраивание бизнес логики модели под внутренние, либо внешние изменения
- Aсинхронная валидция
- Поддержка сценариев, возможность использовать несколько сценариев одновременно 
- Встроенные валидаторы
- Inline валидаторы (CustomValidator)
- RxJs трекинг состояния модели (изменение значений и статуса валидации полей)
- Не зависит от окружения, библиотека применима как для фронтенда (реактивные формы) так и бэкенда

## Demo
[https://gromver.github.io/rx-model](https://gromver.github.io/rx-model)

## Documentation
- [Russian](docs/ru/index.md)

## Usage
### Backend environment
Model - базовый класс для работы с данными, описывает структуру данных и правила валидации.
```javascript
import { Model } from 'rx-model';
import { PresenceValidator, EmailValidator, StringValidator, NumberValidator, SafeValidator } from 'rx-model/validators';

class UserModel extends Model {
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
      // открываем доступ к записи в поле profile
      profile: new SafeValidator(),
      // так как поле profile типа Object, можно описать его структуру (вложенность бесконечная)
      'profile.age': [
        new NumberValidator({
          greaterThan: 0,
        }),
      ],
      'profile.phone': [
        new StringValidator({
          pattern: /^\d{10}$/
        }),
      ]
    }
  }
}

/**
 * Создание пользователя
 * @param data
 * @returns {Promise} возвращает промис с объектом пользователя (resolve) либо текст первой ошибки (reject)
 */
function createUser(data) {
  const model = new UserModel();

  /**
   * Запись и валидация данных
   */
  model.setAttributes(data);
  return model.validate().then(isValid => {
    if (isValid) {
      const data = model.getAttributes();

      /**
       * далее некая логика по работе с этими данными (например сохранение в БД)
       * в нашем случае просто вернем объект с валидными данными
       */

      return data;
    } else {
      throw model.getFirstError().message.toString();
    }
  });
}

/**
 * Изменяет пользователя
 * @param {{}} user текущий пользователь
 * @param {{}} data объект с изменениями
 * @returns {Promise} возвращает промис с объектом пользователя (resolve) либо текст первой ошибки (reject)
 */
function updateUser(user, data) {
  const model = new UserModel(user);

  /**
   * Запись новых значений и валидация данных
   */
  model.setAttributes(data);
  return model.validate().then(isValid => {
    if (isValid) {
      const data = model.getAttributes();

      /**
       * далее некая логика по работе с этими данными (например сохранение в БД)
       * в нашем случае просто вернем объект с валидными данными
       */

      return data;
    } else {
      throw model.getFirstError().message.toString();
    }
  });
}
```

### Client side
Для создания форм на клиенте предусмотрен класс Form. Этот класс расширяет Model, довабляя 
специфический для фронта функционал. Отображать UI формы будем с помощью [ReactJS], 
для связки с Form объектом воспользуемся специальным react компонентом [FormConnect].
Суть компонента FormConnect - подписка на интересующие изменения формы 
(поля формы, состояния валидации, стейт формы) и отрисовка элемента формы.
```jsx harmony
import React from 'react';
import { Form } from 'rx-model';
import { PresenceValidator, EmailValidator, StringValidator, NumberValidator, SafeValidator } from 'rx-model/validators';
import { FormConnect } from 'react-rx-form';

class UserForm extends Form {
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
      // открываем доступ к записи в поле profile
      profile: new SafeValidator(),
      // так как поле profile типа Object, можно описать его структуру (вложенность бесконечная)
      'profile.age': [
        new NumberValidator({
          greaterThan: 0,
        }),
      ],
      'profile.phone': [
        new StringValidator({
          pattern: /^\d{10}$/
        }),
      ]
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

class UserFormComponent extends React.Component {
  constructor(props, context) {
    super(props, context);

    this.state = {
      form: new UserForm()
    }
  }

  handleSubmit() {
    const { form } = this.props.state;

    form.validate().then(isValid => {
      if (isValid) {
        // данные верны
        const attributes = form.getAttributes();

        // сохраняем данные, либо другие действия
        // ...
      } else {
        // ошибка валидации
        const error = form.getFirstError().message.toString();
        
        alert(error);
      }
    })
  }
  
  render() {
    const { form } = this.state;

    return (
      <div>
        <FormConnect
          form={form}
          whenModel={['name']}
        >{() => {
          return <div
            className={`status-${form.getValidationStatus('name')}`}
          >
            <div className="label">Name:</div>

            <div className="control">
              <input
                ref="input"
                value={form.getAttribute('name')}
                onChange={(e) => form.setAttribute('name', e.target.value)}
                onBlur={() => form.validateAttributes(['name'])}
                disabled={!form.isAttributeSafe('name')}
              />
            </div>

            <div className="error">{form.getValidationError('name')}</div>
          </div>
        }}
        </FormConnect>

        <FormConnect
          form={form}
          whenModel={['email']}
        >{() => {
          return <div
            className={`status-${form.getValidationStatus('email')}`}
          >
            <div className="label">Email:</div>

            <div className="control">
              <input
                ref="input"
                value={form.getAttribute('email')}
                onChange={(e) => form.setAttribute('email', e.target.value)}
                onBlur={() => form.validateAttributes(['email'])}
                disabled={!form.isAttributeSafe('email')}
              />
            </div>

            <div className="error">{form.getValidationError('email')}</div>
          </div>
        }}
        </FormConnect>

        <FormConnect
          form={form}
          whenModel={['password']}
        >{() => {
          return <div
            className={`status-${form.getValidationStatus('password')}`}
          >
            <div className="label">Password:</div>

            <div className="control">
              <input
                ref="input"
                type="password"
                value={form.getAttribute('password')}
                onChange={(e) => form.setAttribute('password', e.target.value)}
                onBlur={() => form.validateAttributes(['password'])}
                disabled={!form.isAttributeSafe('password')}
              />
            </div>

            <div className="error">{form.getValidationError('password')}</div>
          </div>
        }}
        </FormConnect>

        <FormConnect
          form={form}
          whenModel={['profile.age']}
        >{() => {
          return <div
            className={`status-${form.getValidationStatus('profile.age')}`}
          >
            <div className="label">Age:</div>

            <div className="control">
              <input
                ref="input"
                value={form.getAttribute('profile.age')}
                onChange={(e) => form.setAttribute('profile.age', e.target.value)}
                onBlur={() => form.validateAttributes(['profile.age'])}
                disabled={!form.isAttributeSafe('profile.age')}
              />
            </div>

            <div className="error">{form.getValidationError('profile.age')}</div>
          </div>
        }}
        </FormConnect>

        <FormConnect
          form={form}
          whenModel={['profile.phone']}
        >{() => {
          return <div
            className={`status-${form.getValidationStatus('profile.phone')}`}
          >
            <div className="label">Phone:</div>

            <div className="control">
              <input
                ref="input"
                value={form.getAttribute('profile.phone')}
                onChange={(e) => form.setAttribute('profile.phone', e.target.value)}
                onBlur={() => form.validateAttributes(['profile.phone'])}
                disabled={!form.isAttributeSafe('profile.phone')}
              />
            </div>

            <div className="error">{form.getValidationError('profile.phone')}</div>
          </div>
        }}
        </FormConnect>

        <div>
          <button onClick={this.handleSubmit.bind(this)}>Submit</button>
        </div>
      </div>
    );
  }
}
```

## Links
- [Demo]
- [Documentation]

## License
rx-model is released under the MIT license.
See the [LICENSE file] for license text and copyright information.

[LICENSE file]: https://github.com/gromver/rx-model/blob/master/LICENSE
[Wiki]: https://github.com/gromver/rx-model/wiki
[FormConnect]: https://github.com/gromver/react-rx-form
[Discord]: https://discord.gg/MAAqSJ
[Demo]: https://gromver.github.io/rx-model
[Documentation]: https://github.com/gromver/rx-model/blob/master/docs/ru/index.md
[ReactJS]: https://facebook.github.io/react/