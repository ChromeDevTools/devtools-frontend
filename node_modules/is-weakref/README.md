# is-weakref <sup>[![Version Badge][2]][1]</sup>

[![dependency status][5]][6]
[![dev dependency status][7]][8]
[![License][license-image]][license-url]
[![Downloads][downloads-image]][downloads-url]

[![npm badge][11]][1]

Is this value a JS WeakRef? This module works cross-realm/iframe, and despite ES6 @@toStringTag.

## Example

```js
var isWeakRef = require('is-weakref');
assert(!isWeakRef(function () {}));
assert(!isWeakRef(null));
assert(!isWeakRef(function* () { yield 42; return Infinity; });
assert(!isWeakRef(Symbol('foo')));
assert(!isWeakRef(1n));
assert(!isWeakRef(Object(1n)));

assert(!isWeakRef(new Set()));
assert(!isWeakRef(new WeakSet()));
assert(!isWeakRef(new Map()));
assert(!isWeakRef(new WeakMap()));

assert(isWeakRef(new WeakRef({})));

class MyWeakRef extends WeakRef {}
assert(isWeakRef(new MyWeakRef({})));
```

## Tests
Simply clone the repo, `npm install`, and run `npm test`

[1]: https://npmjs.org/package/is-weakref
[2]: http://versionbadg.es/inspect-js/is-weakref.svg
[5]: https://david-dm.org/inspect-js/is-weakref.svg
[6]: https://david-dm.org/inspect-js/is-weakref
[7]: https://david-dm.org/inspect-js/is-weakref/dev-status.svg
[8]: https://david-dm.org/inspect-js/is-weakref#info=devDependencies
[11]: https://nodei.co/npm/is-weakref.png?downloads=true&stars=true
[license-image]: http://img.shields.io/npm/l/is-weakref.svg
[license-url]: LICENSE
[downloads-image]: http://img.shields.io/npm/dm/is-weakref.svg
[downloads-url]: http://npm-stat.com/charts.html?package=is-weakref
