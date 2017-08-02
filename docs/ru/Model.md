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

## <a name="scenarios">Сценарии</a>
Сценарии - это механизм позволяющий инкапсулировать различные модели поведения в рамках одной модели

#### scenarios()
Метод определяет сценарии и список полей, чьи правила валидации будут применимы для сценария. 
Возвращает объект вида { scenarioType: listOfAttributes, ... }, 
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

## <a name="rxJs">RxJs</a>
### Стримы getValidationObservable() и getAttributeObservable()
### Реакция на внутренние изменения invalidateWhen()
### Реакция на внешние изменения setContext()

## <a name="immutableJs">ImmutableJs</a>

## <a name="api">API</a>
