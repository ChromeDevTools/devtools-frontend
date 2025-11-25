export type Options = {
	/**
	Include the [global properties](https://tc39.es/ecma262/#sec-value-properties-of-the-global-object) `globalThis`, `Infinity`, `NaN`, and `undefined`. Although not officially reserved, they should typically [not be used as identifiers](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/undefined#sect1).

	@default false
	*/
	readonly includeGlobalProperties?: boolean;
};

/**
Provides a list of [reserved identifiers](https://262.ecma-international.org/14.0/#sec-keywords-and-reserved-words) for JavaScript.

@example
```
import reservedIdentifiers from 'reserved-identifiers';

const identifiers = reservedIdentifiers();
const isReserved = identifier => identifiers.has(identifier);

console.log(isReserved('await'));
//=> true
```
*/
export default function reservedIdentifiers(options?: Options): Set<string>;

/**
TypeScript's built-in types that are reserved and cannot be used for type names (interfaces, type aliases, enums, classes, type parameters).
*/
export type TypeScriptReservedType =
	| 'any'
	| 'bigint'
	| 'boolean'
	| 'never'
	| 'null'
	| 'number'
	| 'object'
	| 'string'
	| 'symbol'
	| 'undefined'
	| 'unknown'
	| 'void';

/**
Provides a list of TypeScript's built-in types that are reserved and cannot be used for type names (interfaces, type aliases, enums, classes, type parameters).

@example
```
import {typeScriptReservedTypes} from 'reserved-identifiers';

const types = typeScriptReservedTypes();

console.log(types.has('any'));
//=> true

console.log(types.has('unknown'));
//=> true
```
*/
export function typeScriptReservedTypes(): Set<string>;
