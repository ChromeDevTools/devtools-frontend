# lodash-deep 
> Lodash mixins for (deep) object accessing / manipulation.

[![Bower version][bower-image]][bower-url] [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Sauce Test Status][sauce-image]][sauce-url] [![Dependency Status][depstat-image]][depstat-url]

## Version 2.x
In 2.0 most of the methods of this module where removed, because Lodash now supports their functionality natively. E.g.:

``` javascript
_.deepGet(object, 'father.name');
// ->
_.get(object, 'father.name');

_.deepPluck(array, 'father.name');
// ->
_.map(array, 'father.name');
```

## Compatibility
lodash-deep is currently compatible with:
- Node.js
- All ES5 compatible browsers (IE9+, Chrome, Firefox, Safari etc)

## Installation
### Bower
1. `bower install lodash-deep`
2. Reference `lodash-deep.min.js` after `lodash.min.js`

### Node.js
1. `npm install lodash`
2. `npm install lodash-deep`
3. 
    ``` javascript

    var _ = require("lodash");
    _.mixin(require("lodash-deep"));
    ```

## Docs
The following mixins are included in `lodash-deep`:
- [_.deepMapValues](#_deepmapvaluesobject-propertypath)

### _.deepMapValues(object, propertyPath)
Maps all values in an object tree and returns a new object with the same structure as the original.

#### object
Type: `Object`

The root object of the object tree.

#### callback
Type: `Function`

The function to be called per iteration on any non-object value in the tree.

Callback is invoked with 2 arguments: `(value, path)`.

`value` the value of the current property.

`path` the path of the current property.

#### returns
Type: `Object`

``` javascript
var object = {
    level1: {
        value: 'value 1'
        level2: {
            value: 'value 2'
            level3: {
                value: 'value 3'
            }
        }
    }
};

_.deepMapValues(object, function(value, path){
    return path + ' is ' + value)
});

/** ->
 *    {
 *        level1: {
 *            value: 'level1.value is value 1'
 *            level2: {
 *                value: 'level1.level2.value is value 2'
 *                level3: {
 *                    value: 'level1.level2.level3.value is value 3'
 *                }
 *            }
 *        }
 *    };
 */
```

## Contributing
Please use the `canary` branch when creating a pull request.

## Contributors
- [Mark Lagendijk](https://github.com/marklagendijk)
- [Andrew Luetgers](https://github.com/andrewluetgers)
- [Nelson Pecora](https://github.com/yoshokatana)
- [Mark Battersby](https://github.com/markalfred)
- [Beau Gunderson](https://github.com/beaugunderson)
- [Spencer](https://github.com/spenceralger)
- [Paul](https://github.com/paulbalomiri)
- [TheHalcyonSavant](https://github.com/TheHalcyonSavant)


[bower-url]: https://github.com/marklagendijk/lodash-deep/releases/latest
[bower-image]: https://badge.fury.io/bo/lodash-deep.svg

[npm-url]: https://www.npmjs.org/package/lodash-deep
[npm-image]: https://badge.fury.io/js/lodash-deep.svg

[travis-url]: http://travis-ci.org/marklagendijk/lodash-deep
[travis-image]: https://secure.travis-ci.org/marklagendijk/lodash-deep.svg?branch=master

[sauce-url]: https://saucelabs.com/u/marklagendijk
[sauce-image]: https://saucelabs.com/buildstatus/marklagendijk

[depstat-url]: https://david-dm.org/marklagendijk/lodash-deep
[depstat-image]: https://david-dm.org/marklagendijk/lodash-deep.svg
