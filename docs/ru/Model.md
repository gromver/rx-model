# Model
Model - базовый класс для работы с данными.
- [Бизнес логика](#bizlogic)
- [Контроль доступа](#access)
- [Установка значения](#set)
- [Валидация данных](#validate)
- [Сценарии](#scenarios)
- [RxJs](#rxJs)
- [ImmutableJs](#immutableJs)
- [API](#api)

## <a name="bizlogic">Бизнес логика</a>
Бизнес логика модели определяется ее структурой данных, правилами валидации и 
правами доступа.

### rules()
Метод возвращает объект вида `{ fieldPath: validationRule, ... }` с описанием правил валидации 
полей модели, где:

#### fieldPath
строка описывающая путь к полю модели
> Модель может описывать сложные древовидные структуры данных неограниченной вложенности.
Поля этих структур могут быть, как простыми типами, так и объектами, массивами и массивами объектов.
```js
import { Model } from 'rx-model';
import { SafeValidator } from 'rx-model/validators';

// В данном примере модель описывает некий профиль пользователя - структуру данных вида:
const user = {
    // простые строковые поля
    name: 'John',
    // поле типа объект
    settings: {
      property1: '...',
      property2: '...',
    },
    // поле типа массив объектов
    addresses: [
      {
        city: 'City 1',
        address: 'some address 1',
      },
      {
        city: 'City 2',
        address: 'some address 2',
      },
    ],
    orders: [
      {
        id: 'someOrderID1',
        products: [
          {
            id: 'someProductID1',
            name: 'product 1'
          },
          {
            id: 'someProductID2',
            name: 'product 2'
          },
        ]
      },
    ]
  };

// модель описыющая эту структуру данных
class UserModel extends Model {
  rules() {
    return {
      name: new SafeValidator(),
      settings: new SafeValidator(),
      'settings.property1': new SafeValidator(),
      'settings.property2': new SafeValidator(),
      'addresses': new SafeValidator(),
      'addresses[].city': new SafeValidator(),
      'addresses[].address': new SafeValidator(),
      'orders': new SafeValidator(),
      'orders[].id': new SafeValidator(),
      'orders[].products': new SafeValidator(),
      'orders[].products[].id': new SafeValidator(),
      'orders[].products[].name': new SafeValidator(),
    }
  }
}

// пустая модель
const model = new UserModel();

// данные для загрузки сформируем на базе user
const data = { ...user };
// подмешаем несколько неструктурных полей
data.someUnknownField = '...';
data.settings.someUnknownField = '...';
data.addresses[0].someUnknownField = '...';
data.orders[0].someUnknownField = '...';
data.orders[0].products[0].someUnknownField = '...';


// загрузка данных - модель загрузит только те данные, которые были описаны в ее схеме
model.setAttributes(data);

// вернет нормализованные данные
const attributes = model.getAttributes();
expect(attributes).toEqual(user);   // true
```

#### validationRule
правило валидации может быть 5 типов: Validator | Scenario\<Validator> | Array\<**validationRule**> | 
function(): **validationRule** | false
```js
import { Model } from 'rx-model';
import { 
  PresenceValidator, EmailValidator, StringValidator, 
  NumberValidator, SafeValidator, UnsafeValidator,
  MultiValidator,
} from 'rx-model/validators';

class MyModel extends Model {
  rules() {
    return {
      // одиночный валидатор
      email: new EmailValidator(),
      // в массиве можно передать множественные валидоры
      name: [
        new PresenceValidator(),
        new StringValidator()
      ],
      // передача валидаторов через массив - это всего лишь синтаксический сахар 
      // на самом деле - массив валидаторов в итоге приводится к нормальному виду:
      sameAsName: new MultiValidator({
        validators: [
          new PresenceValidator(),
          new StringValidator()          
        ],
        // если этот флаг true то для проверки, достаточно, чтобы хотябы один валидатор был успешен
        isAny: false,
      }),
      // в качестве валидатора можно передать функцию
      field1: () => new SafeValidator(),
      field1: () => [
        new SafeValidator(),
        () => new SafeValidator(),
        () => () => false,
        false,
      ],
      field1: () => () => () => new SafeValidator(),
      // к этим полям нет доступа и они не будут валидироватся
      unknownField1: new UnsafeValidator(),
      unknownField2: false, // false - равносильно отсутсвию валидатора
      unknownField3: () => false,
      unknownField3: () => [
        new SafeValidator(),
        new UnsafeValidator(),
      ],
    }
  }
}
```
rules() - это ключевой метод, практически полностью определяющий бизнес логику модели, он отвечает
за валидацию, а также права доступа к полям. В большинстве случаев, переопределения этого метода 
достаточно чтобы описать модель.

### Особенности rules()
- Метод кешируется
- Метод вызывается при первом изменении поля, либо валидации
- Чтобы сбросить кеш существует метод `this.invalidateValidators()`
- Есть несколько действий при которых автоматически сбрасывается кеш:
    - Изменения сценария модели `this.setScenario(...)`
    - Изменение контекста модели `this.setContext(...)`
    - Автоматическое изменение логики модели при изменении определенных полей (см. invalidateWhen)


## <a name="access">Контроль доступа</a>
Модель контролирует права доступа на запись и валидацию поля. 
Права доступа определяются в методе rules() и применяются при установке значения либо его валидации.

## <a name="set">Установка значения</a>
### set(attribute, value, safe = true)
Метод устанавливает значение **value** в поле модели по пути **attribute**
```js
set(
  attribute: string, 
  value: any,
  safe: boolean = true
);
```
У данного метода есть ряд особенностей:
- значение будет установлено только в том случае если для этого поля определено правило
- значение не будет установлено если для поля правило не определено, либо в качестве валидатора 
возвращено **false** | **new UnsafeValidator()** | **\[ UnsafeValidator(), ...listOfSafeValidators ]**
- значение будет установлено в любом случае если флаг **safe = false**
- если **value** для поля **attribute** имеет тип *object* либо *array* и поле **attribute** имеет 
вложенные правила соответствующего типа, модель не будет записывать **value** как есть, а проведет
распаковку его значений в соответсвии с правилами прописанными для этого поля.
```js
import { Model } from 'rx-model';
import { SafeValidator, NumberValidator, PresenceValidator } from 'rx-model/validators';

class TestModel extends Model {
  rules() {
    return {
      someField: new SafeValidator(),
      object: new SafeValidator(),
      extractableObject: new SafeValidator(),
      'extractableObject.a': new PresenceValidator(),
      'extractableObject.b': new PresenceValidator(),
      numberArray: new SafeValidator(),
      'numberArray[]': new NumberValidator(),
      objectArray: new SafeValidator(),
      'objectArray[]': new SafeValidator(),
      'objectArray[].a': new PresenceValidator(),
      'objectArray[].b': new PresenceValidator(),
    }
  }
}

// пустая модель
const model = new TestModel();

model.set('someField', '123');  // ok
console.log(model.getAttributes()); 
// { someField: '123' }

model.set('someUnknownField', '123');  // nothing do
console.log(model.getAttributes()); 
// { someField: '123' }

model.set('object', { foo:1, bar:2 });  // ok
console.log(model.getAttributes()); 
// { someField: '123', object: { foo:1, bar:2 } }

model.set('someUnknownField', '123', false);  // ok
console.log(model.getAttributes()); 
// { someField: '123', object: { foo:1, bar:2 }, someUnknownField: '123' }

model.set('extractableObject', { a:1, c:3 });  // ok, extract
console.log(model.getAttributes()); 
// { someField: '123', object: { foo:1, bar:2 }, someUnknownField: '123', extractableObject: { a:1 } }

model.set('numberArray', [1, 2, 3]);  // ok, extract
console.log(model.getAttributes()); 
// { someField: '123', object: { foo:1, bar:2 }, someUnknownField: '123', extractableObject: { a:1 }, numberArray: [1, 2, 3] }

model.set('objectArray', [{ a:1, b:2, c:3 }]);  // ok, extract
console.log(model.getAttributes()); 
// { someField: '123', object: { foo:1, bar:2 }, someUnknownField: '123', extractableObject: { a:1 }, numberArray: [1, 2, 3], objectArray: [{ a:1, b:2 }] }

model.set('objectArray', [{ a:1, b:2, c:3 }], false);  // ok, extract
console.log(model.getAttributes()); 
// { someField: '123', object: { foo:1, bar:2 }, someUnknownField: '123', extractableObject: { a:1 }, numberArray: [1, 2, 3], objectArray: [{ a:1, b:2, c:3 }] }
```

## <a name="validate">Валидация данных</a>
### validate(attributes = [])
Метод получает список полей для проверки и возращает Promise с результатом проверки: 
**true** - успех, **false** - ошибка. Если в качестве списка полей передан пустой массив - 
модель проверит все поля к которым есть доступ с учетом активных сценариев.
```js
validate(
  attributes: Array<string>
): Promise<boolean>;
```
#### Пример
UserModel.js 
```js
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
```
controller.js
```js
import UserModel from './UserModel';

function createUser(attributes) {
  // create user with attributes here

  // ...
  
  return Promise.resolve();
}

export default function createUserController(userData, response) {
  const model = new UserModel();
  
  model.setAttributes(userData);
  
  return model.validate().then(isValid => {
    if (isValid) {
      const attributes = model.getAttributes();

      createUser(attributes).then(() => response.send({ status: 'ok' }));
    } else {
      response.send({ status: 'error', message: model.getFirstError().message.toString() });
    }
  });
}
```

## <a name="scenarios">Сценарии</a>
Сценарии - это механизм позволяющий инкапсулировать различные модели поведения в рамках одной модели

#### scenarios()
Метод определяет сценарии и список полей, чьи правила валидации будут применимы для сценария. 
Возвращает объект вида `{ scenarioType: listOfAttributes, ... }`, 
где **scenarioType** - строковой идентификатор сценария 
(как правило идентификаторы хранятся в константах класса модели), **listOfAttributes** - массив
полей модели, чьи правила валидации будут учтены в данном сценарии. 

По умолчанию метод возвращает
```js
class Model {
  static SCENARIO_DEFAULT = 'default';
  
  scenarios() {
    return {
      // пустой массив в качестве списка полей - дает сценарию доступ ко всем правилам валидации
      SCENARIO_DEFAULT: []
    }
  }
}
```
Таким образом все модели по умолчанию используют дефолтный сценарий без ограничений.

#### setScenario(scenario)
Метод устанавливает сценарий, либо сценарии поведения модели.
> Изменение сценария повлечет за собой сброс кеша с бизнес логикой
```js
setScenario(
  scenario: Array<string> | string
);
```
### Пример
```js
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
  
## <a name="rxJs">RxJs</a>
Модель построена с использованием библиотеки RxJs, это позволяет контролировать изменения значений
полей, а так же статусов валидации в режиме реального времени и реагировать на них 
при необходимости (например рассчитывать некоторые поля модели)

### Стримы getValidationObservable() и getAttributeObservable()
TBD
### Реакция на внутренние изменения invalidateWhen()
TBD
### Реакция на внешние изменения setContext()
TBD
## <a name="immutableJs">ImmutableJs</a>
TBD
## <a name="api">API</a>
TBD