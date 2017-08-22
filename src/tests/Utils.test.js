import moment from 'moment';
import utils from '../utils';

describe('isNumber', function() {
  test("returns true for numbers", function() {
    expect(utils.isNumber(0)).toBe(true);
    expect(utils.isNumber(1)).toBe(true);
    expect(utils.isNumber(Math.PI)).toBe(true);
  });

  test("returns false for non numbers", function() {
    expect(utils.isNumber(null)).toBe(false);
    expect(utils.isNumber(true)).toBe(false);
    expect(utils.isNumber("1")).toBe(false);
  });
});

describe('isInteger', function() {
  test("returns true for integers", function() {
    expect(utils.isInteger(0)).toBe(true);
    expect(utils.isInteger(1)).toBe(true);
  });

  test("returns false for floats and other types ", function() {
    expect(utils.isInteger(Math.PI)).toBe(false);
    expect(utils.isInteger(null)).toBe(false);
    expect(utils.isInteger("1")).toBe(false);
  });
});

describe('isBoolean', function() {
  test("returns true for booleans", function() {
    expect(utils.isBoolean(true)).toBe(true);
    expect(utils.isBoolean(false)).toBe(true);
  });

  test("returns false for non booleans ", function() {
    expect(utils.isBoolean(null)).toBe(false);
    expect(utils.isBoolean({})).toBe(false);
    expect(utils.isBoolean({foo: "bar"})).toBe(false);
    expect(utils.isBoolean([])).toBe(false);
    expect(utils.isBoolean("")).toBe(false);
    expect(utils.isBoolean(function() {})).toBe(false);
  });
});

describe('isObject', function() {
  test("returns true for objects", function() {
    expect(utils.isObject({})).toBe(true);
    expect(utils.isObject({foo: "bar"})).toBe(true);
    expect(utils.isObject([])).toBe(true);
    expect(utils.isObject(function() {})).toBe(true);
  });

  test("returns false for non objects", function() {
    expect(utils.isObject(null)).toBe(false);
    expect(utils.isObject(1)).toBe(false);
    expect(utils.isObject("")).toBe(false);
    expect(utils.isObject(false)).toBe(false);
  });
});

describe('isDefined', function() {
  test("returns false for null and undefined", function() {
    expect(utils.isDefined(null)).toBe(false);
    expect(utils.isDefined(undefined)).toBe(false);
  });

  test("returns true for other values", function() {
    expect(utils.isDefined(true)).toBe(true);
    expect(utils.isDefined(0)).toBe(true);
    expect(utils.isDefined("")).toBe(true);
  });
});

describe("isPromise", function() {
  test("returns false for null and undefined", function() {
    expect(utils.isPromise(null)).toBe(false);
    expect(utils.isPromise(undefined)).toBe(false);
  });

  test("returns false for objects", function() {
    expect(utils.isPromise({})).toBe(false);
  });

  test("returns true for objects with a then function", function() {
    expect(utils.isPromise({then: "that"})).toBe(false);
    expect(utils.isPromise({then: function() {}})).toBe(true);
  });
});

describe('isString', function() {
  test("returns true for strings", function() {
    expect(utils.isString("foobar")).toBe(true);
    expect(utils.isString("")).toBe(true);
  });

  test("returns false for non strings", function() {
    const obj = {toString: function() { return "foobar"; }};
    expect(utils.isString(obj)).toBe(false);
    expect(utils.isString(null)).toBe(false);
    expect(utils.isString(true)).toBe(false);
  });
});

describe('isArray', function() {
  const isArray = utils.isArray;

  test("returns true for arrays", function() {
    expect(isArray([])).toBe(true);
    expect(isArray([1])).toBe(true);
    expect(isArray([1, 2])).toBe(true);
  });

  test("returns false for non arrays", function() {
    expect(isArray({})).toBe(false);
    expect(isArray(null)).toBe(false);
    expect(isArray(1)).toBe(false);
    expect(isArray(true)).toBe(false);
  });
});

describe('isHash', function() {
  test("returns true for hashes", function() {
    expect(utils.isHash({})).toBe(true);
    expect(utils.isHash({foo: "bar"})).toBe(true);
  });

  test("returns false for non hashes", function() {
    expect(utils.isHash([])).toBe(false);
    expect(utils.isHash(function() {})).toBe(false);
    expect(utils.isHash(null)).toBe(false);
    expect(utils.isHash(1)).toBe(false);
    expect(utils.isHash("")).toBe(false);
    expect(utils.isHash(false)).toBe(false);
  });
});

describe('isFunction', function() {
  const isFunction = utils.isFunction;

  test("returns true for functions", function() {
    expect(isFunction(function() {})).toBe(true);
  });

  test("returns false for non functions", function() {
    expect(isFunction({})).toBe(false);
    expect(isFunction(null)).toBe(false);
    expect(isFunction(1)).toBe(false);
    expect(isFunction(true)).toBe(false);
  });
});

describe("isDate", function() {
  test("returns true for dates", function() {
    expect(utils.isDate(new Date())).toBe(true);
  });

  test("returns false for non dates", function() {
    expect(utils.isDate(Date.now())).toBe(false);
    expect(utils.isDate({})).toBe(false);
  });
});

describe("isMoment", function() {
  test("returns true for moments", function() {
    expect(utils.isMoment(moment())).toBe(true);
  });

  test("returns false for non moments", function() {
    expect(utils.isMoment(new Date())).toBe(false);
    expect(utils.isMoment({})).toBe(false);
  });
});

describe("isEmpty", function() {
  test("considers null and undefined values empty", function() {
    expect(utils.isEmpty(null)).toBe(true);
    expect(utils.isEmpty(undefined)).toBe(true);
  });

  test("considers functions non empty", function() {
    expect(utils.isEmpty(function(){})).toBe(false);
  });

  test("considers whitespace only strings empty", function() {
    expect(utils.isEmpty("")).toBe(true);
    expect(utils.isEmpty(" ")).toBe(true);
    expect(utils.isEmpty("         ")).toBe(true);
    expect(utils.isEmpty("foo")).toBe(false);
  });

  test("considers empty arrays empty", function() {
    expect(utils.isEmpty([])).toBe(true);
    expect(utils.isEmpty([1])).toBe(false);
  });

  test("considers empty objects empty", function() {
    expect(utils.isEmpty({})).toBe(true);
    expect(utils.isEmpty({foo: "bar"})).toBe(false);
  });

  test("considers false and 0 non empty", function() {
    expect(utils.isEmpty(false)).toBe(false);
    expect(utils.isEmpty(0)).toBe(false);
  });

  test("considers date non empty", function() {
    const _utils = { ...utils };

    expect(_utils.isEmpty(new Date())).toBe(false);

    _utils.isDate = jest.fn();
    _utils.isEmpty(new Date());

    expect(_utils.isDate).toHaveBeenCalled();
  });
});

describe("isDomElement", function() {
  test("returns true of DOM elements", function() {
    const form = document.createElement("form")
      , div = document.createElement("div")
      , a = document.createElement("a");

    expect(utils.isDomElement(form)).toBe(true);
    expect(utils.isDomElement(div)).toBe(true);
    expect(utils.isDomElement(a)).toBe(true);
    expect(utils.isDomElement(document)).toBe(true);
  });

  test("returns false for other objects", function() {
    expect(utils.isDomElement({})).toBe(false);
    expect(utils.isDomElement(0)).toBe(false);
    expect(utils.isDomElement(true)).toBe(false);
    expect(utils.isDomElement("foo")).toBe(false);
    expect(utils.isDomElement("")).toBe(false);
    expect(utils.isDomElement([])).toBe(false);
  });
});

describe('contains', function() {
  test("returns false when not passing in a target object", function() {
    expect(utils.contains(null, "foo")).toBe(false);
    expect(utils.contains(undefined, "foo")).toBe(false);
  });

  describe("arrays", function() {
    test("returns true if the value is in the specified array", function() {
      expect(utils.contains(["foo", "bar", "baz"], "foo")).toBe(true);
      expect(utils.contains(["foo", "bar", "baz"], "bar")).toBe(true);
      expect(utils.contains(["foo", "bar", "baz"], "baz")).toBe(true);
    });

    test("returns false if the value is not in the specified array", function() {
      expect(utils.contains(["foo", "bar", "baz"], "quux")).toBe(false);
      expect(utils.contains(["foo", "bar", "baz"], false)).toBe(false);
      expect(utils.contains(["foo", "bar", "baz"], 0)).toBe(false);
      expect(utils.contains(["foo", "bar", "baz"], null)).toBe(false);
    });

    test("works with empty arrays", function() {
      expect(utils.contains([], "foo")).toBe(false);
    });
  });

  describe("objects", function() {
    test("returns true if the value is a key in the object", function() {
      expect(utils.contains({foo: false, bar: "bar"}, "foo")).toBe(true);
      expect(utils.contains({foo: false, bar: "bar"}, "bar")).toBe(true);
    });

    test("returns false if the value is not a key in the object", function() {
      expect(utils.contains({foo: false, bar: "bar"}, "quux")).toBe(false);
      expect(utils.contains({foo: false, bar: "bar"}, null)).toBe(false);
      expect(utils.contains({foo: false, bar: "bar"}, 1)).toBe(false);
      expect(utils.contains({foo: false, bar: "bar"}, true)).toBe(false);
    });

    test("works with empty objects", function() {
      expect(utils.contains({}, "foo")).toBe(false);
    });
  });
});

describe("unique", function() {
  test("handles empty and single value arrays", function() {
    expect(utils.unique(null)).toEqual(null);
    expect(utils.unique([])).toEqual([]);
    expect(utils.unique([1])).toEqual([1]);
    expect(utils.unique(["foo"])).toEqual(["foo"]);
    expect(utils.unique("foo")).toEqual("foo");
  });

  test("filters non unique values", function() {
    expect(utils.unique(["foo", "bar", "bar", "foo", "baz"]))
      .toEqual(["foo", "bar", "baz"]);

    expect(utils.unique(["foo", "foo", "foo"]))
      .toEqual(["foo"]);

    expect(utils.unique([1, 2, 3, 3, 2, 1]))
      .toEqual([1, 2, 3]);
  });

  test("returns a copy", function() {
    const a = ["foo"];
    expect(utils.unique(a)).not.toBe(a);
  });
});

describe('resolveAttribute', () => {
  test(`return normalized attribute\'s path array suitable for immutable setIn/getIn 
  methods from a given string`, () => {
    expect(utils.resolveAttribute('foo.bar')).toEqual(['foo', 'bar']);
    expect(utils.resolveAttribute('foo.bar[0][1][2]')).toEqual(['foo', 'bar', 0, 1, 2]);
  });
});