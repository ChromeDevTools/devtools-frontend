# omit-deep-lodash
> Omit object key/values recursively

Sometimes we need to omit things from an object recursively. [omit-deep](https://github.com/jonschlinkert/omit-deep) did this
in a great manner but hadn't been updated for quite some time and didn't really work with Arrays. omit-deep-lodash solves
this and uses only lodash as external dependency.

The code for this module uses new features in the Javascript language, but the code is transpiled by Babel to ES2015 so most
projects who needs it should be able to use it.

Note! All non-omitted properties that are objects lose their prototype chains and thus their true type. This implementation 
is thus best used for simple JSON type objects like data objects and not typed object graphs where members have objects 
with constructors.

## Install

Install with [npm](https://www.npmjs.com/)

```sh
$ npm i omit-deep-lodash --save
```

## Usage

```js
const omitDeep = require("omit-deep-lodash");

omitDeep({a: "a", b: "b", c: {b: "b", d: {b: "b", f: "f"}}}, "b");
//=> {a: "a", c: {d: {f: "f"}}}

omitDeep({a: "a", b: "b", c: {b: "b", d: {b: "b", f: "f"}}}, "a", "b");
//=> {c: {d: {f: "f"}}}
```

## Related projects

* [omit-deep](https://github.com/jonschlinkert/omit-deep): The original project for this. [more](https://github.com/jonschlinkert/omit-deep)
* [lodash](https://github.com/lodash/lodash): The only external dependency. [more](https://github.com/lodash/lodash)

## Running tests

Install dev dependencies:

```sh
$ npm i -d && npm test
```

## Contributing

Pull requests and stars are always welcome. For bugs and feature requests, [please create an issue](https://github.com/odynvolk/omit-deep-lodash/issues/new)

## Author

+ [github/jonschlinkert](https://github.com/jonschlinkert)
+ [github/odynvolk](https://github.com/odynvolk)
+ [github.com/mickeek](https://github.com/mickeek)
+ [github.com/InterAl](https://github.com/InterAl)
+ [github.com/mathianasj](https://github.com/mathianasj)

## License

Released under the MIT license.
