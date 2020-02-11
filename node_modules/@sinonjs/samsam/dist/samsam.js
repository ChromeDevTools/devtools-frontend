(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@sinonjs/commons'), require('type-detect'), require('lodash.get')) :
    typeof define === 'function' && define.amd ? define(['exports', '@sinonjs/commons', 'type-detect', 'lodash.get'], factory) :
    (global = global || self, factory(global.samsam = {}, global.commons, global.typeDetect, global.lodash));
}(this, (function (exports, commons, typeDetect, lodash) { 'use strict';

    commons = commons && commons.hasOwnProperty('default') ? commons['default'] : commons;
    typeDetect = typeDetect && typeDetect.hasOwnProperty('default') ? typeDetect['default'] : typeDetect;
    lodash = lodash && lodash.hasOwnProperty('default') ? lodash['default'] : lodash;

    /**
     * Compares a `value` to `NaN`
     *
     * @private
     * @param {*} value A value to examine
     * @returns {boolean} Returns `true` when `value` is `NaN`
     */
    function isNaN(value) {
        // Unlike global `isNaN`, this function avoids type coercion
        // `typeof` check avoids IE host object issues, hat tip to
        // lodash

        // eslint-disable-next-line no-self-compare
        return typeof value === "number" && value !== value;
    }

    var isNan = isNaN;

    /**
     * Returns `true` when `value` is `-0`
     *
     * @alias module:samsam.isNegZero
     * @param {*} value A value to examine
     * @returns {boolean} Returns `true` when `value` is `-0`
     */
    function isNegZero(value) {
        return value === 0 && 1 / value === -Infinity;
    }

    var isNegZero_1 = isNegZero;

    /**
     * Strict equality check according to EcmaScript Harmony's `egal`.
     *
     * **From the Harmony wiki:**
     * > An `egal` function simply makes available the internal `SameValue` function
     * > from section 9.12 of the ES5 spec. If two values are egal, then they are not
     * > observably distinguishable.
     *
     * `identical` returns `true` when `===` is `true`, except for `-0` and
     * `+0`, where it returns `false`. Additionally, it returns `true` when
     * `NaN` is compared to itself.
     *
     * @alias module:samsam.identical
     * @param {*} obj1 The first value to compare
     * @param {*} obj2 The second value to compare
     * @returns {boolean} Returns `true` when the objects are *egal*, `false` otherwise
     */
    function identical(obj1, obj2) {
        if (obj1 === obj2 || (isNan(obj1) && isNan(obj2))) {
            return obj1 !== 0 || isNegZero_1(obj1) === isNegZero_1(obj2);
        }

        return false;
    }

    var identical_1 = identical;

    var toString = commons.prototypes.object.toString;

    /**
     * Returns the internal `Class` by calling `Object.prototype.toString`
     * with the provided value as `this`. Return value is a `String`, naming the
     * internal class, e.g. "Array"
     *
     * @private
     * @param  {*} value - Any value
     * @returns {string} - A string representation of the `Class` of `value`
     */
    function getClass(value) {
        return toString(value).split(/[ \]]/)[1];
    }

    var getClass_1 = getClass;

    /**
     * Returns `true` when `object` is an `arguments` object, `false` otherwise
     *
     * @alias module:samsam.isArguments
     * @param  {*}  object - The object to examine
     * @returns {boolean} `true` when `object` is an `arguments` object
     */
    function isArguments(object) {
        return getClass_1(object) === "Arguments";
    }

    var isArguments_1 = isArguments;

    var div = typeof document !== "undefined" && document.createElement("div");

    /**
     * Returns `true` when `object` is a DOM element node.
     *
     * Unlike Underscore.js/lodash, this function will return `false` if `object`
     * is an *element-like* object, i.e. a regular object with a `nodeType`
     * property that holds the value `1`.
     *
     * @alias module:samsam.isElement
     * @param {object} object The object to examine
     * @returns {boolean} Returns `true` for DOM element nodes
     */
    function isElement(object) {
        if (!object || object.nodeType !== 1 || !div) {
            return false;
        }
        try {
            object.appendChild(div);
            object.removeChild(div);
        } catch (e) {
            return false;
        }
        return true;
    }

    var isElement_1 = isElement;

    /**
     * Returns `true` when the argument is an instance of Set, `false` otherwise
     *
     * @alias module:samsam.isSet
     * @param  {*}  val - A value to examine
     * @returns {boolean} Returns `true` when the argument is an instance of Set, `false` otherwise
     */
    function isSet(val) {
        return (typeof Set !== "undefined" && val instanceof Set) || false;
    }

    var isSet_1 = isSet;

    /**
     * Returns `true` when `value` is a Map
     *
     * @param {*} value A value to examine
     * @returns {boolean} `true` when `value` is an instance of `Map`, `false` otherwise
     * @private
     */
    function isMap(value) {
        return typeof Map !== "undefined" && value instanceof Map;
    }

    var isMap_1 = isMap;

    /**
     * Returns `true` when `value` is an instance of Date
     *
     * @private
     * @param  {Date}  value The value to examine
     * @returns {boolean}     `true` when `value` is an instance of Date
     */
    function isDate(value) {
        return value instanceof Date;
    }

    var isDate_1 = isDate;

    /**
     * Returns `true` when the value is a regular Object and not a specialized Object
     *
     * This helps speed up deepEqual cyclic checks
     *
     * The premise is that only Objects are stored in the visited array.
     * So if this function returns false, we don't have to do the
     * expensive operation of searching for the value in the the array of already
     * visited objects
     *
     * @private
     * @param  {object}   value The object to examine
     * @returns {boolean}       `true` when the object is a non-specialised object
     */
    function isObject(value) {
        return (
            typeof value === "object" &&
            value !== null &&
            // none of these are collection objects, so we can return false
            !(value instanceof Boolean) &&
            !(value instanceof Date) &&
            !(value instanceof Error) &&
            !(value instanceof Number) &&
            !(value instanceof RegExp) &&
            !(value instanceof String)
        );
    }

    var isObject_1 = isObject;

    var forEach = commons.prototypes.set.forEach;

    /**
     * Returns `true` when `s1` is a subset of `s2`, `false` otherwise
     *
     * @private
     * @param  {Array|Set}  s1      The target value
     * @param  {Array|Set}  s2      The containing value
     * @param  {Function}  compare A comparison function, should return `true` when
     *                             values are considered equal
     * @returns {boolean} Returns `true` when `s1` is a subset of `s2`, `false`` otherwise
     */
    function isSubset(s1, s2, compare) {
        var allContained = true;
        forEach(s1, function(v1) {
            var includes = false;
            forEach(s2, function(v2) {
                if (compare(v2, v1)) {
                    includes = true;
                }
            });
            allContained = allContained && includes;
        });

        return allContained;
    }

    var isSubset_1 = isSubset;

    var valueToString = commons.valueToString;
    var className = commons.className;
    var typeOf = commons.typeOf;
    var arrayProto = commons.prototypes.array;
    var objectProto = commons.prototypes.object;
    var mapForEach = commons.prototypes.map.forEach;












    var concat = arrayProto.concat;
    var every = arrayProto.every;
    var push = arrayProto.push;

    var getTime = Date.prototype.getTime;
    var hasOwnProperty = objectProto.hasOwnProperty;
    var indexOf = arrayProto.indexOf;
    var keys = Object.keys;
    var getOwnPropertySymbols = Object.getOwnPropertySymbols;

    /**
     * Deep equal comparison. Two values are "deep equal" when:
     *
     *   - They are equal, according to samsam.identical
     *   - They are both date objects representing the same time
     *   - They are both arrays containing elements that are all deepEqual
     *   - They are objects with the same set of properties, and each property
     *     in ``actual`` is deepEqual to the corresponding property in ``expectation``
     *
     * Supports cyclic objects.
     *
     * @alias module:samsam.deepEqual
     * @param {*} actual The object to examine
     * @param {*} expectation The object actual is expected to be equal to
     * @param {object} match A value to match on
     * @returns {boolean} Returns true when actual and expectation are considered equal
     */
    function deepEqualCyclic(actual, expectation, match) {
        // used for cyclic comparison
        // contain already visited objects
        var actualObjects = [];
        var expectationObjects = [];
        // contain pathes (position in the object structure)
        // of the already visited objects
        // indexes same as in objects arrays
        var actualPaths = [];
        var expectationPaths = [];
        // contains combinations of already compared objects
        // in the manner: { "$1['ref']$2['ref']": true }
        var compared = {};

        // does the recursion for the deep equal check
        // eslint-disable-next-line complexity
        return (function deepEqual(
            actualObj,
            expectationObj,
            actualPath,
            expectationPath
        ) {
            // If both are matchers they must be the same instance in order to be
            // considered equal If we didn't do that we would end up running one
            // matcher against the other
            if (match && match.isMatcher(expectationObj)) {
                if (match.isMatcher(actualObj)) {
                    return actualObj === expectationObj;
                }
                return expectationObj.test(actualObj);
            }

            var actualType = typeof actualObj;
            var expectationType = typeof expectationObj;

            if (
                actualObj === expectationObj ||
                isNan(actualObj) ||
                isNan(expectationObj) ||
                actualObj === null ||
                expectationObj === null ||
                actualObj === undefined ||
                expectationObj === undefined ||
                actualType !== "object" ||
                expectationType !== "object"
            ) {
                return identical_1(actualObj, expectationObj);
            }

            // Elements are only equal if identical(expected, actual)
            if (isElement_1(actualObj) || isElement_1(expectationObj)) {
                return false;
            }

            var isActualDate = isDate_1(actualObj);
            var isExpectationDate = isDate_1(expectationObj);
            if (isActualDate || isExpectationDate) {
                if (
                    !isActualDate ||
                    !isExpectationDate ||
                    getTime.call(actualObj) !== getTime.call(expectationObj)
                ) {
                    return false;
                }
            }

            if (actualObj instanceof RegExp && expectationObj instanceof RegExp) {
                if (valueToString(actualObj) !== valueToString(expectationObj)) {
                    return false;
                }
            }

            if (actualObj instanceof Error && expectationObj instanceof Error) {
                return actualObj === expectationObj;
            }

            var actualClass = getClass_1(actualObj);
            var expectationClass = getClass_1(expectationObj);
            var actualKeys = keys(actualObj);
            var expectationKeys = keys(expectationObj);
            var actualName = className(actualObj);
            var expectationName = className(expectationObj);
            var expectationSymbols =
                typeOf(getOwnPropertySymbols) === "function"
                    ? getOwnPropertySymbols(expectationObj)
                    : /* istanbul ignore next: cannot collect coverage for engine that doesn't support Symbol */
                      [];
            var expectationKeysAndSymbols = concat(
                expectationKeys,
                expectationSymbols
            );

            if (isArguments_1(actualObj) || isArguments_1(expectationObj)) {
                if (actualObj.length !== expectationObj.length) {
                    return false;
                }
            } else {
                if (
                    actualType !== expectationType ||
                    actualClass !== expectationClass ||
                    actualKeys.length !== expectationKeys.length ||
                    (actualName &&
                        expectationName &&
                        actualName !== expectationName)
                ) {
                    return false;
                }
            }

            if (isSet_1(actualObj) || isSet_1(expectationObj)) {
                if (
                    !isSet_1(actualObj) ||
                    !isSet_1(expectationObj) ||
                    actualObj.size !== expectationObj.size
                ) {
                    return false;
                }

                return isSubset_1(actualObj, expectationObj, deepEqual);
            }

            if (isMap_1(actualObj) || isMap_1(expectationObj)) {
                if (
                    !isMap_1(actualObj) ||
                    !isMap_1(expectationObj) ||
                    actualObj.size !== expectationObj.size
                ) {
                    return false;
                }

                var mapsDeeplyEqual = true;
                mapForEach(actualObj, function(value, key) {
                    mapsDeeplyEqual =
                        mapsDeeplyEqual &&
                        deepEqualCyclic(value, expectationObj.get(key));
                });

                return mapsDeeplyEqual;
            }

            return every(expectationKeysAndSymbols, function(key) {
                if (!hasOwnProperty(actualObj, key)) {
                    return false;
                }

                var actualValue = actualObj[key];
                var expectationValue = expectationObj[key];
                var actualObject = isObject_1(actualValue);
                var expectationObject = isObject_1(expectationValue);
                // determines, if the objects were already visited
                // (it's faster to check for isObject first, than to
                // get -1 from getIndex for non objects)
                var actualIndex = actualObject
                    ? indexOf(actualObjects, actualValue)
                    : -1;
                var expectationIndex = expectationObject
                    ? indexOf(expectationObjects, expectationValue)
                    : -1;
                // determines the new paths of the objects
                // - for non cyclic objects the current path will be extended
                //   by current property name
                // - for cyclic objects the stored path is taken
                var newActualPath =
                    actualIndex !== -1
                        ? actualPaths[actualIndex]
                        : actualPath + "[" + JSON.stringify(key) + "]";
                var newExpectationPath =
                    expectationIndex !== -1
                        ? expectationPaths[expectationIndex]
                        : expectationPath + "[" + JSON.stringify(key) + "]";
                var combinedPath = newActualPath + newExpectationPath;

                // stop recursion if current objects are already compared
                if (compared[combinedPath]) {
                    return true;
                }

                // remember the current objects and their paths
                if (actualIndex === -1 && actualObject) {
                    push(actualObjects, actualValue);
                    push(actualPaths, newActualPath);
                }
                if (expectationIndex === -1 && expectationObject) {
                    push(expectationObjects, expectationValue);
                    push(expectationPaths, newExpectationPath);
                }

                // remember that the current objects are already compared
                if (actualObject && expectationObject) {
                    compared[combinedPath] = true;
                }

                // End of cyclic logic

                // neither actualValue nor expectationValue is a cycle
                // continue with next level
                return deepEqual(
                    actualValue,
                    expectationValue,
                    newActualPath,
                    newExpectationPath
                );
            });
        })(actual, expectation, "$1", "$2");
    }

    deepEqualCyclic.use = function(match) {
        return function deepEqual(a, b) {
            return deepEqualCyclic(a, b, match);
        };
    };

    var deepEqual = deepEqualCyclic;

    var ARRAY_TYPES = [
        Array,
        Int8Array,
        Uint8Array,
        Uint8ClampedArray,
        Int16Array,
        Uint16Array,
        Int32Array,
        Uint32Array,
        Float32Array,
        Float64Array
    ];

    var arrayTypes = ARRAY_TYPES;

    var functionName = commons.functionName;
    var indexOf$1 = commons.prototypes.array.indexOf;
    var map = commons.prototypes.array.map;



    /**
     * Returns `true` when `object` is an array type, `false` otherwise
     *
     * @param  {*}  object - The object to examine
     * @returns {boolean} `true` when `object` is an array type
     * @private
     */
    function isArrayType(object) {
        return indexOf$1(map(arrayTypes, functionName), typeDetect(object)) !== -1;
    }

    var isArrayType_1 = isArrayType;

    var slice = commons.prototypes.string.slice;
    var typeOf$1 = commons.typeOf;
    var valueToString$1 = commons.valueToString;

    /**
     * Creates a string represenation of an iterable object
     *
     * @private
     * @param   {object} obj The iterable object to stringify
     * @returns {string}     A string representation
     */
    function iterableToString(obj) {
        if (typeOf$1(obj) === "map") {
            return mapToString(obj);
        }

        return genericIterableToString(obj);
    }

    /**
     * Creates a string representation of a Map
     *
     * @private
     * @param   {Map} map    The map to stringify
     * @returns {string}     A string representation
     */
    function mapToString(map) {
        var representation = "";

        /* eslint-disable-next-line local-rules/no-prototype-methods */
        map.forEach(function(value, key) {
            representation += "[" + stringify(key) + "," + stringify(value) + "],";
        });

        representation = slice(representation, 0, -1);
        return representation;
    }

    /**
     * Create a string represenation for an iterable
     *
     * @private
     * @param   {object} iterable The iterable to stringify
     * @returns {string}          A string representation
     */
    function genericIterableToString(iterable) {
        var representation = "";

        /* eslint-disable-next-line local-rules/no-prototype-methods */
        iterable.forEach(function(value) {
            representation += stringify(value) + ",";
        });

        representation = slice(representation, 0, -1);
        return representation;
    }

    /**
     * Creates a string representation of the passed `item`
     *
     * @private
     * @param  {object} item The item to stringify
     * @returns {string}      A string representation of `item`
     */
    function stringify(item) {
        return typeof item === "string" ? "'" + item + "'" : valueToString$1(item);
    }

    var iterableToString_1 = iterableToString;

    var matcherPrototype = {
        toString: function() {
            return this.message;
        }
    };

    matcherPrototype.or = function(valueOrMatcher) {
        var createMatcher = createMatcher_1;
        var isMatcher = createMatcher.isMatcher;

        if (!arguments.length) {
            throw new TypeError("Matcher expected");
        }

        var m2 = isMatcher(valueOrMatcher)
            ? valueOrMatcher
            : createMatcher(valueOrMatcher);
        var m1 = this;
        var or = Object.create(matcherPrototype);
        or.test = function(actual) {
            return m1.test(actual) || m2.test(actual);
        };
        or.message = m1.message + ".or(" + m2.message + ")";
        return or;
    };

    matcherPrototype.and = function(valueOrMatcher) {
        var createMatcher = createMatcher_1;
        var isMatcher = createMatcher.isMatcher;

        if (!arguments.length) {
            throw new TypeError("Matcher expected");
        }

        var m2 = isMatcher(valueOrMatcher)
            ? valueOrMatcher
            : createMatcher(valueOrMatcher);
        var m1 = this;
        var and = Object.create(matcherPrototype);
        and.test = function(actual) {
            return m1.test(actual) && m2.test(actual);
        };
        and.message = m1.message + ".and(" + m2.message + ")";
        return and;
    };

    var matcherPrototype_1 = matcherPrototype;

    var isPrototypeOf = commons.prototypes.object.isPrototypeOf;



    /**
     * Returns `true` when `object` is a matcher
     *
     * @private
     * @param {*} object A value to examine
     * @returns {boolean} Returns `true` when `object` is a matcher
     */
    function isMatcher(object) {
        return isPrototypeOf(matcherPrototype_1, object);
    }

    var isMatcher_1 = isMatcher;

    /**
     * Throws a TypeError when `value` is not a matcher
     *
     * @private
     * @param {*} value The value to examine
     */
    function assertMatcher(value) {
        if (!isMatcher_1(value)) {
            throw new TypeError("Matcher expected");
        }
    }

    var assertMatcher_1 = assertMatcher;

    /**
     * Throws a TypeError when expected method doesn't exist
     *
     * @private
     * @param {*} value A value to examine
     * @param {string} method The name of the method to look for
     * @param {name} name A name to use for the error message
     * @param {string} methodPath The name of the method to use for error messages
     * @throws {TypeError} When the method doesn't exist
     */
    function assertMethodExists(value, method, name, methodPath) {
        if (value[method] === null || value[method] === undefined) {
            throw new TypeError(
                "Expected " + name + " to have method " + methodPath
            );
        }
    }

    var assertMethodExists_1 = assertMethodExists;

    var typeOf$2 = commons.typeOf;

    /**
     * Ensures that value is of type
     *
     * @private
     * @param {*} value A value to examine
     * @param {string} type A basic JavaScript type to compare to, e.g. "object", "string"
     * @param {string} name A string to use for the error message
     * @throws {TypeError} If value is not of the expected type
     * @returns {undefined}
     */
    function assertType(value, type, name) {
        var actual = typeOf$2(value);
        if (actual !== type) {
            throw new TypeError(
                "Expected type of " +
                    name +
                    " to be " +
                    type +
                    ", but was " +
                    actual
            );
        }
    }

    var assertType_1 = assertType;

    var typeOf$3 = commons.typeOf;

    /**
     * Returns `true` for iterables
     *
     * @private
     * @param {*} value A value to examine
     * @returns {boolean} Returns `true` when `value` looks like an iterable
     */
    function isIterable(value) {
        return Boolean(value) && typeOf$3(value.forEach) === "function";
    }

    var isIterable_1 = isIterable;

    var every$1 = commons.prototypes.array.every;
    var typeOf$4 = commons.typeOf;

    var deepEqualFactory = deepEqual.use;


    /**
     * Matches `actual` with `expectation`
     *
     * @private
     * @param {*} actual A value to examine
     * @param {object} expectation An object with properties to match on
     * @returns {boolean} Returns true when `actual` matches all properties in `expectation`
     */
    function matchObject(actual, expectation, matcher) {
        var deepEqual = deepEqualFactory(matcher);
        if (actual === null || actual === undefined) {
            return false;
        }

        return every$1(Object.keys(expectation), function(key) {
            var exp = expectation[key];
            var act = actual[key];

            if (isMatcher_1(exp)) {
                if (!exp.test(act)) {
                    return false;
                }
            } else if (typeOf$4(exp) === "object") {
                if (!matchObject(act, exp, matcher)) {
                    return false;
                }
            } else if (!deepEqual(act, exp)) {
                return false;
            }

            return true;
        });
    }

    var matchObject_1 = matchObject;

    var functionName$1 = commons.functionName;
    var join = commons.prototypes.array.join;
    var map$1 = commons.prototypes.array.map;
    var stringIndexOf = commons.prototypes.string.indexOf;
    var valueToString$2 = commons.valueToString;



    var createTypeMap = function(match) {
        return {
            function: function(m, expectation, message) {
                m.test = expectation;
                m.message = message || "match(" + functionName$1(expectation) + ")";
            },
            number: function(m, expectation) {
                m.test = function(actual) {
                    // we need type coercion here
                    return expectation == actual; // eslint-disable-line eqeqeq
                };
            },
            object: function(m, expectation) {
                var array = [];

                if (typeof expectation.test === "function") {
                    m.test = function(actual) {
                        return expectation.test(actual) === true;
                    };
                    m.message = "match(" + functionName$1(expectation.test) + ")";
                    return m;
                }

                array = map$1(Object.keys(expectation), function(key) {
                    return key + ": " + valueToString$2(expectation[key]);
                });

                m.test = function(actual) {
                    return matchObject_1(actual, expectation, match);
                };
                m.message = "match(" + join(array, ", ") + ")";

                return m;
            },
            regexp: function(m, expectation) {
                m.test = function(actual) {
                    return typeof actual === "string" && expectation.test(actual);
                };
            },
            string: function(m, expectation) {
                m.test = function(actual) {
                    return (
                        typeof actual === "string" &&
                        stringIndexOf(actual, expectation) !== -1
                    );
                };
                m.message = 'match("' + expectation + '")';
            }
        };
    };

    var typeMap = createTypeMap;

    var arrayProto$1 = commons.prototypes.array;
    var deepEqual$1 = deepEqual.use(createMatcher); // eslint-disable-line no-use-before-define
    var every$2 = commons.every;
    var functionName$2 = commons.functionName;


    var objectProto$1 = commons.prototypes.object;
    var typeOf$5 = commons.typeOf;
    var valueToString$3 = commons.valueToString;









    var arrayIndexOf = arrayProto$1.indexOf;
    var some = arrayProto$1.some;

    var hasOwnProperty$1 = objectProto$1.hasOwnProperty;
    var objectToString = objectProto$1.toString;

    var TYPE_MAP = typeMap(createMatcher); // eslint-disable-line no-use-before-define

    /**
     * Creates a matcher object for the passed expectation
     *
     * @alias module:samsam.createMatcher
     * @param {*} expectation An expecttation
     * @param {string} message A message for the expectation
     * @returns {object} A matcher object
     */
    function createMatcher(expectation, message) {
        var m = Object.create(matcherPrototype_1);
        var type = typeOf$5(expectation);

        if (message !== undefined && typeof message !== "string") {
            throw new TypeError("Message should be a string");
        }

        if (arguments.length > 2) {
            throw new TypeError(
                "Expected 1 or 2 arguments, received " + arguments.length
            );
        }

        if (type in TYPE_MAP) {
            TYPE_MAP[type](m, expectation, message);
        } else {
            m.test = function(actual) {
                return deepEqual$1(actual, expectation);
            };
        }

        if (!m.message) {
            m.message = "match(" + valueToString$3(expectation) + ")";
        }

        return m;
    }

    createMatcher.isMatcher = isMatcher_1;

    createMatcher.any = createMatcher(function() {
        return true;
    }, "any");

    createMatcher.defined = createMatcher(function(actual) {
        return actual !== null && actual !== undefined;
    }, "defined");

    createMatcher.truthy = createMatcher(function(actual) {
        return Boolean(actual);
    }, "truthy");

    createMatcher.falsy = createMatcher(function(actual) {
        return !actual;
    }, "falsy");

    createMatcher.same = function(expectation) {
        return createMatcher(function(actual) {
            return expectation === actual;
        }, "same(" + valueToString$3(expectation) + ")");
    };

    createMatcher.in = function(arrayOfExpectations) {
        if (typeOf$5(arrayOfExpectations) !== "array") {
            throw new TypeError("array expected");
        }

        return createMatcher(function(actual) {
            return some(arrayOfExpectations, function(expectation) {
                return expectation === actual;
            });
        }, "in(" + valueToString$3(arrayOfExpectations) + ")");
    };

    createMatcher.typeOf = function(type) {
        assertType_1(type, "string", "type");
        return createMatcher(function(actual) {
            return typeOf$5(actual) === type;
        }, 'typeOf("' + type + '")');
    };

    createMatcher.instanceOf = function(type) {
        /* istanbul ignore if */
        if (
            typeof Symbol === "undefined" ||
            typeof Symbol.hasInstance === "undefined"
        ) {
            assertType_1(type, "function", "type");
        } else {
            assertMethodExists_1(
                type,
                Symbol.hasInstance,
                "type",
                "[Symbol.hasInstance]"
            );
        }
        return createMatcher(function(actual) {
            return actual instanceof type;
        }, "instanceOf(" + (functionName$2(type) || objectToString(type)) + ")");
    };

    /**
     * Creates a property matcher
     *
     * @private
     * @param {Function} propertyTest A function to test the property against a value
     * @param {string} messagePrefix A prefix to use for messages generated by the matcher
     * @returns {object} A matcher
     */
    function createPropertyMatcher(propertyTest, messagePrefix) {
        return function(property, value) {
            assertType_1(property, "string", "property");
            var onlyProperty = arguments.length === 1;
            var message = messagePrefix + '("' + property + '"';
            if (!onlyProperty) {
                message += ", " + valueToString$3(value);
            }
            message += ")";
            return createMatcher(function(actual) {
                if (
                    actual === undefined ||
                    actual === null ||
                    !propertyTest(actual, property)
                ) {
                    return false;
                }
                return onlyProperty || deepEqual$1(actual[property], value);
            }, message);
        };
    }

    createMatcher.has = createPropertyMatcher(function(actual, property) {
        if (typeof actual === "object") {
            return property in actual;
        }
        return actual[property] !== undefined;
    }, "has");

    createMatcher.hasOwn = createPropertyMatcher(function(actual, property) {
        return hasOwnProperty$1(actual, property);
    }, "hasOwn");

    createMatcher.hasNested = function(property, value) {
        assertType_1(property, "string", "property");
        var onlyProperty = arguments.length === 1;
        var message = 'hasNested("' + property + '"';
        if (!onlyProperty) {
            message += ", " + valueToString$3(value);
        }
        message += ")";
        return createMatcher(function(actual) {
            if (
                actual === undefined ||
                actual === null ||
                lodash(actual, property) === undefined
            ) {
                return false;
            }
            return onlyProperty || deepEqual$1(lodash(actual, property), value);
        }, message);
    };

    createMatcher.every = function(predicate) {
        assertMatcher_1(predicate);

        return createMatcher(function(actual) {
            if (typeOf$5(actual) === "object") {
                return every$2(Object.keys(actual), function(key) {
                    return predicate.test(actual[key]);
                });
            }

            return (
                isIterable_1(actual) &&
                every$2(actual, function(element) {
                    return predicate.test(element);
                })
            );
        }, "every(" + predicate.message + ")");
    };

    createMatcher.some = function(predicate) {
        assertMatcher_1(predicate);

        return createMatcher(function(actual) {
            if (typeOf$5(actual) === "object") {
                return !every$2(Object.keys(actual), function(key) {
                    return !predicate.test(actual[key]);
                });
            }

            return (
                isIterable_1(actual) &&
                !every$2(actual, function(element) {
                    return !predicate.test(element);
                })
            );
        }, "some(" + predicate.message + ")");
    };

    createMatcher.array = createMatcher.typeOf("array");

    createMatcher.array.deepEquals = function(expectation) {
        return createMatcher(function(actual) {
            // Comparing lengths is the fastest way to spot a difference before iterating through every item
            var sameLength = actual.length === expectation.length;
            return (
                typeOf$5(actual) === "array" &&
                sameLength &&
                every$2(actual, function(element, index) {
                    var expected = expectation[index];
                    return typeOf$5(expected) === "array" &&
                        typeOf$5(element) === "array"
                        ? createMatcher.array.deepEquals(expected).test(element)
                        : deepEqual$1(expected, element);
                })
            );
        }, "deepEquals([" + iterableToString_1(expectation) + "])");
    };

    createMatcher.array.startsWith = function(expectation) {
        return createMatcher(function(actual) {
            return (
                typeOf$5(actual) === "array" &&
                every$2(expectation, function(expectedElement, index) {
                    return actual[index] === expectedElement;
                })
            );
        }, "startsWith([" + iterableToString_1(expectation) + "])");
    };

    createMatcher.array.endsWith = function(expectation) {
        return createMatcher(function(actual) {
            // This indicates the index in which we should start matching
            var offset = actual.length - expectation.length;

            return (
                typeOf$5(actual) === "array" &&
                every$2(expectation, function(expectedElement, index) {
                    return actual[offset + index] === expectedElement;
                })
            );
        }, "endsWith([" + iterableToString_1(expectation) + "])");
    };

    createMatcher.array.contains = function(expectation) {
        return createMatcher(function(actual) {
            return (
                typeOf$5(actual) === "array" &&
                every$2(expectation, function(expectedElement) {
                    return arrayIndexOf(actual, expectedElement) !== -1;
                })
            );
        }, "contains([" + iterableToString_1(expectation) + "])");
    };

    createMatcher.map = createMatcher.typeOf("map");

    createMatcher.map.deepEquals = function mapDeepEquals(expectation) {
        return createMatcher(function(actual) {
            // Comparing lengths is the fastest way to spot a difference before iterating through every item
            var sameLength = actual.size === expectation.size;
            return (
                typeOf$5(actual) === "map" &&
                sameLength &&
                every$2(actual, function(element, key) {
                    return expectation.has(key) && expectation.get(key) === element;
                })
            );
        }, "deepEquals(Map[" + iterableToString_1(expectation) + "])");
    };

    createMatcher.map.contains = function mapContains(expectation) {
        return createMatcher(function(actual) {
            return (
                typeOf$5(actual) === "map" &&
                every$2(expectation, function(element, key) {
                    return actual.has(key) && actual.get(key) === element;
                })
            );
        }, "contains(Map[" + iterableToString_1(expectation) + "])");
    };

    createMatcher.set = createMatcher.typeOf("set");

    createMatcher.set.deepEquals = function setDeepEquals(expectation) {
        return createMatcher(function(actual) {
            // Comparing lengths is the fastest way to spot a difference before iterating through every item
            var sameLength = actual.size === expectation.size;
            return (
                typeOf$5(actual) === "set" &&
                sameLength &&
                every$2(actual, function(element) {
                    return expectation.has(element);
                })
            );
        }, "deepEquals(Set[" + iterableToString_1(expectation) + "])");
    };

    createMatcher.set.contains = function setContains(expectation) {
        return createMatcher(function(actual) {
            return (
                typeOf$5(actual) === "set" &&
                every$2(expectation, function(element) {
                    return actual.has(element);
                })
            );
        }, "contains(Set[" + iterableToString_1(expectation) + "])");
    };

    createMatcher.bool = createMatcher.typeOf("boolean");
    createMatcher.number = createMatcher.typeOf("number");
    createMatcher.string = createMatcher.typeOf("string");
    createMatcher.object = createMatcher.typeOf("object");
    createMatcher.func = createMatcher.typeOf("function");
    createMatcher.regexp = createMatcher.typeOf("regexp");
    createMatcher.date = createMatcher.typeOf("date");
    createMatcher.symbol = createMatcher.typeOf("symbol");

    var createMatcher_1 = createMatcher;

    var valueToString$4 = commons.valueToString;
    var indexOf$2 = commons.prototypes.string.indexOf;
    var forEach$1 = commons.prototypes.array.forEach;


    var engineCanCompareMaps = typeof Array.from === "function";
    var deepEqual$2 = deepEqual.use(match); // eslint-disable-line no-use-before-define




    /**
     * Returns true when `array` contains all of `subset` as defined by the `compare`
     * argument
     *
     * @param  {Array} array   An array to search for a subset
     * @param  {Array} subset  The subset to find in the array
     * @param  {Function} compare A comparison function
     * @returns {boolean}         [description]
     * @private
     */
    function arrayContains(array, subset, compare) {
        if (subset.length === 0) {
            return true;
        }
        var i, l, j, k;
        for (i = 0, l = array.length; i < l; ++i) {
            if (compare(array[i], subset[0])) {
                for (j = 0, k = subset.length; j < k; ++j) {
                    if (i + j >= l) {
                        return false;
                    }
                    if (!compare(array[i + j], subset[j])) {
                        return false;
                    }
                }
                return true;
            }
        }
        return false;
    }

    /* eslint-disable complexity */
    /**
     * Matches an object with a matcher (or value)
     *
     * @alias module:samsam.match
     * @param {object} object The object candidate to match
     * @param {object} matcherOrValue A matcher or value to match against
     * @returns {boolean} true when `object` matches `matcherOrValue`
     */
    function match(object, matcherOrValue) {
        if (matcherOrValue && typeof matcherOrValue.test === "function") {
            return matcherOrValue.test(object);
        }

        switch (typeDetect(matcherOrValue)) {
            case "bigint":
            case "boolean":
            case "number":
            case "symbol":
                return matcherOrValue === object;
            case "function":
                return matcherOrValue(object) === true;
            case "string":
                var notNull = typeof object === "string" || Boolean(object);
                return (
                    notNull &&
                    indexOf$2(
                        valueToString$4(object).toLowerCase(),
                        matcherOrValue.toLowerCase()
                    ) >= 0
                );
            case "null":
                return object === null;
            case "undefined":
                return typeof object === "undefined";
            case "Date":
                /* istanbul ignore else */
                if (typeDetect(object) === "Date") {
                    return object.getTime() === matcherOrValue.getTime();
                }
                /* istanbul ignore next: this is basically the rest of the function, which is covered */
                break;
            case "Array":
            case "Int8Array":
            case "Uint8Array":
            case "Uint8ClampedArray":
            case "Int16Array":
            case "Uint16Array":
            case "Int32Array":
            case "Uint32Array":
            case "Float32Array":
            case "Float64Array":
                return (
                    isArrayType_1(matcherOrValue) &&
                    arrayContains(object, matcherOrValue, match)
                );
            case "Map":
                /* istanbul ignore next: this is covered by a test, that is only run in IE, but we collect coverage information in node*/
                if (!engineCanCompareMaps) {
                    throw new Error(
                        "The JavaScript engine does not support Array.from and cannot reliably do value comparison of Map instances"
                    );
                }

                return (
                    typeDetect(object) === "Map" &&
                    arrayContains(
                        Array.from(object),
                        Array.from(matcherOrValue),
                        match
                    )
                );
        }

        switch (typeDetect(object)) {
            case "null":
                return false;
            case "Set":
                return isSubset_1(matcherOrValue, object, match);
        }

        /* istanbul ignore else */
        if (matcherOrValue && typeof matcherOrValue === "object") {
            if (matcherOrValue === object) {
                return true;
            }
            if (typeof object !== "object") {
                return false;
            }
            var prop;
            // eslint-disable-next-line guard-for-in
            for (prop in matcherOrValue) {
                var value = object[prop];
                if (
                    typeof value === "undefined" &&
                    typeof object.getAttribute === "function"
                ) {
                    value = object.getAttribute(prop);
                }
                if (
                    matcherOrValue[prop] === null ||
                    typeof matcherOrValue[prop] === "undefined"
                ) {
                    if (value !== matcherOrValue[prop]) {
                        return false;
                    }
                } else if (
                    typeof value === "undefined" ||
                    !deepEqual$2(value, matcherOrValue[prop])
                ) {
                    return false;
                }
            }
            return true;
        }

        /* istanbul ignore next */
        throw new Error("Matcher was an unknown or unsupported type");
    }
    /* eslint-enable complexity */

    forEach$1(Object.keys(createMatcher_1), function(key) {
        match[key] = createMatcher_1[key];
    });

    var match_1 = match;

    /**
     * @module samsam
     */







    var deepEqualCyclic$1 = deepEqual.use(match_1);


    var samsam = {
        createMatcher: createMatcher_1,
        deepEqual: deepEqualCyclic$1,
        identical: identical_1,
        isArguments: isArguments_1,
        isElement: isElement_1,
        isMap: isMap_1,
        isNegZero: isNegZero_1,
        isSet: isSet_1,
        match: match_1
    };
    var samsam_1 = samsam.createMatcher;
    var samsam_2 = samsam.deepEqual;
    var samsam_3 = samsam.identical;
    var samsam_4 = samsam.isArguments;
    var samsam_5 = samsam.isElement;
    var samsam_6 = samsam.isMap;
    var samsam_7 = samsam.isNegZero;
    var samsam_8 = samsam.isSet;
    var samsam_9 = samsam.match;

    exports.createMatcher = samsam_1;
    exports.deepEqual = samsam_2;
    exports.default = samsam;
    exports.identical = samsam_3;
    exports.isArguments = samsam_4;
    exports.isElement = samsam_5;
    exports.isMap = samsam_6;
    exports.isNegZero = samsam_7;
    exports.isSet = samsam_8;
    exports.match = samsam_9;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
