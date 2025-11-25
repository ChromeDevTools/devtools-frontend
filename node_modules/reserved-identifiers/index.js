// https://262.ecma-international.org/14.0/#sec-keywords-and-reserved-words
// 14 is ES2023
const identifiers = [
	// Keywords
	'await',
	'break',
	'case',
	'catch',
	'class',
	'const',
	'continue',
	'debugger',
	'default',
	'delete',
	'do',
	'else',
	'enum',
	'export',
	'extends',
	'false',
	'finally',
	'for',
	'function',
	'if',
	'import',
	'in',
	'instanceof',
	'new',
	'null',
	'return',
	'super',
	'switch',
	'this',
	'throw',
	'true',
	'try',
	'typeof',
	'var',
	'void',
	'while',
	'with',
	'yield',

	// Future reserved keywords (strict mode)
	'implements',
	'interface',
	'let',
	'package',
	'private',
	'protected',
	'public',
	'static',

	// Not keywords, but still restricted
	'arguments',
	'eval',
];

// https://262.ecma-international.org/14.0/#sec-value-properties-of-the-global-object
const globalProperties = [
	'globalThis',
	'Infinity',
	'NaN',
	'undefined',
];

// These are TypeScript's built-in types that are reserved and cannot be used for type names
const typeScriptTypes = [
	'any',
	'bigint',
	'boolean',
	'never',
	'null',
	'number',
	'object',
	'string',
	'symbol',
	'undefined',
	'unknown',
	'void',
];

export default function reservedIdentifiers({includeGlobalProperties = false} = {}) {
	return new Set([
		...identifiers,
		...(includeGlobalProperties ? globalProperties : []),
	]);
}

export function typeScriptReservedTypes() {
	return new Set(typeScriptTypes);
}
