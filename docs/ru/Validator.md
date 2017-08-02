# Validator
Validator - базовый класс описывающий логику валидации. С его помощью можно создавать 
новые валидаторы, так же можно воспользоваться CustomValidator для создания inline валидаторов.
Validator содержит 2 метода, которые можно переопределить.

#### validate()
Метод содержит логику валидации, результатом его выполнения будет Promise. 
В случае resolve - успех, при этом если было передано значение (как правило текстовое 
предупреждение), то результат будет интерпретирован как успех с предупреждением 
(например: пароль валидный но не достаточно сложный). В случае reject - 
ошибка - значение не прошло валидацию (переданное значение используется в качестве 
сообщения об ошибке).
```js
validate(
  value: any, 
  attribute: string, 
  model: Model
): Promise<string?|Message?>;
```

#### isSafe()
Метод определяет - есть ли доступ на запись значений в поле к которому относится валидатор.
```js
isSafe(): boolean;
```
> UnsafeValidator - единственный валидатор, isSafe() метод которого возвращает false, он
  используется не для валидации, а для запрета доступа к полю модели

> В 99% случаев этот метод нет нужны переопределять

#### Пример
```js
import { Validator } from 'rx-model/validators';

class PasswordValidator extends Validator {
  validate(value, attribute, model) {
     if(value && value.length >= 6) {
       if (value.length <= 8) {
         return Promise.resolve('Слабый пароль'); // ok with warning
       } else {
         return Promise.resolve(); // ok         
       }
     }
     
     return Promise.reject('Пароль должен содержать более 6 символов'); // error
  }
}
```
