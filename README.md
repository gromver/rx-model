# rx-model
Model powered by RxJs and Immutable Js

Библиотека для создания валидируемых моделей и валидаторов. 

## Возможности
- Описание структуры данных любой вложенности
- Контроль доступа к полям модели
- Простое и управляемое валидирование данных
- Динамическое подстраивание бизнес логики модели под внутренние, либо внешние изменения
- Aсинхронная валидция
- Поддержка сценариев, возможность использовать несколько сценариев одновременно 
- Встроенные валидаторы
- Inline валидаторы (CustomValidator)
- Создание валидаторов
- RxJs трекинг состояния модели (изменение значений и статуса валидации полей)
- Не зависит от окружения, применима как для фронтенда (реактивные формы) так и бэкенда

## Применение
Рассмотрим простейший случай - загрузка и валидация данных на сервере.
```javascript
import { Model } from 'rx-model';
import { PresenceValidator, EmailValidator, StringValidator, NumberValidator, SafeValidator } from 'rx-model/validators';

/**
* Модель описывает структуру данных и правила валидации,
* создается наследованием от класса Model
*/
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
async function createUser(data) {
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

async function run() {
  // Создадим пользователя, и добавим поля не имеющие к нему никакого отношения
  let user = await createUser({
    name: 'John',
    email: 'john@mail.com',
    password: '123456',
    profile: {
      age: 20,
      phone: '7999999999',
      unknownProfileField1: 'upf1', // не безопасные данные
    },
    unknownField1: 'uf1', // не безопасные данные
    unknownField2: 'uf2', // не безопасные данные
  });

  console.log(user);
  // {
  //   name: 'John',
  //   email: 'john@mail.com',
  //   password: '123456',
  //   profile: {
  //     age: 20,
  //     phone: '7999999999'
  //   }
  // }

  // Обновим пользователя
  user = await updateUser(user, {
    name: 'Johny',
    profile: {
      age: 25,
      phone: '7555555555',
    },
  });

  console.log(user);
  // {
  //   name: 'Johny',
  //   email: 'john@mail.com',
  //   password: '123456',
  //   profile: {
  //     age: 25,
  //     phone: '7555555555'
  //   }
  // }

  // Обновим пользователя, с не валидными значениями
  try {
    user = await updateUser(user, {
      email: 'invalid mail',
      password: '111',
      profile: {
        age: 0,
        phone: '7555555555',
      },
    });
  } catch (error) {
    console.log(error); // email - is not a valid email
  }

  // Обновим пользователя, с не валидными значениями
  try {
    user = await updateUser(user, {
      email: 'johny@mail.com',
      password: '111',
      profile: {
        age: 0,
        phone: '7555555555',
      },
    });
  } catch (error) {
    console.log(error); // password - is too short (minimum is 6 characters)
  }

  // Обновим пользователя, с не валидными значениями
  try {
    user = await updateUser(user, {
      email: 'johny@mail.com',
      password: '111111',
      profile: {
        age: 0,
        phone: '7555555555',
      },
    });
  } catch (error) {
    console.log(error); // profile.age - must be greater than 0
  }

  // Исправим все ошибки и обновим пользователя
  try {
    user = await updateUser(user, {
      email: 'johny@mail.com',
      password: '111111',
      profile: {
        age: 30,
        phone: '7555555555',
      },
    });

    console.log(user);
    // {
    //   name: 'Johny',
    //   email: 'johny@mail.com',
    //   password: '111111',
    //   profile: {
    //     age: 30,
    //     phone: '7555555555'
    //   }
    // }
  } catch (error) {
    console.log(error);
  }
}

run().then(() => console.log('end'));
```
> Этот пример, не раскрывает всех возможностей библиотеки. Подробнее о библиотеке будет описано в документации. 

## Документация
Детально ознакомиться с библиотекой и примерами использования можно будет в разделе [Wiki].

## License

rx-model is released under the MIT license.
See the [LICENSE file] for license text and copyright information.

[LICENSE file]: https://github.com/gromver/rx-model/blob/master/LICENSE
[Wiki]: https://github.com/gromver/rx-model/wiki