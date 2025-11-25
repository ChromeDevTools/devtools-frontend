# reserved-identifiers

> Provides a list of [reserved identifiers](https://262.ecma-international.org/14.0/#sec-keywords-and-reserved-words) for JavaScript

It assumes the latest JavaScript version (ES2023) and module context. Supporting older JavaScript versions is a non-goal.

## Install

```sh
npm install reserved-identifiers
```

## Usage

```js
import reservedIdentifiers from 'reserved-identifiers';

const identifiers = reservedIdentifiers();
const isReserved = identifier => identifiers.has(identifier);

console.log(isReserved('await'));
//=> true
```

## API

### reservedIdentifiers(options?)

Returns a `Set` with the identifiers.

#### options

Type: `object`

##### includeGlobalProperties

Type: `boolean`\
Default: `false`

Include the [global properties](https://tc39.es/ecma262/#sec-value-properties-of-the-global-object) `globalThis`, `Infinity`, `NaN`, and `undefined`. Although not officially reserved, they should typically [not be used as identifiers](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/undefined#sect1).

### typeScriptReservedTypes()

Returns a `Set` with TypeScript's built-in types that are reserved and cannot be used for type names (interfaces, type aliases, enums, classes, type parameters).

```js
import {typeScriptReservedTypes} from 'reserved-identifiers';

const types = typeScriptReservedTypes();

console.log(types.has('any'));
//=> true

console.log(types.has('unknown'));
//=> true
```

## Related

- [is-identifier](https://github.com/sindresorhus/is-identifier) - Check if a string is a valid JavaScript identifier
