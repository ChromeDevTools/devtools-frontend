export type Options = {
	/**
	Custom alphabet containing exactly 62 unique characters.

	@default '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
	*/
	readonly alphabet?: string;
};

/**
A Base62 encoder/decoder that supports custom alphabets.

@example
```
import {Base62} from '@sindresorhus/base62';

// Use default alphabet
const base62 = new Base62();
console.log(base62.encodeInteger(1337));
//=> 'LZ'

// Use custom alphabet
const customBase62 = new Base62({
	alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
});
console.log(customBase62.encodeInteger(1337));
//=> 'Vj'
```
*/
export class Base62 {
	/**
	Create a new Base62 encoder/decoder.

	@param options - Options for the encoder/decoder.
	*/
	constructor(options?: Options);

	/**
	Encodes a string to a Base62 string.

	@param string - The string to encode.
	@returns The Base62 encoded string.
	*/
	encodeString(string: string): string;

	/**
	Decodes a Base62 encoded string created with `encodeString()` back to the original string.

	@param encodedString - The Base62 encoded string to decode.
	@returns The decoded string.
	*/
	decodeString(encodedString: string): string;

	/**
	Encodes bytes to a Base62 string.

	@param bytes - The bytes to encode.
	@returns The Base62 encoded string.
	*/
	encodeBytes(bytes: Uint8Array): string;

	/**
	Decodes a Base62 string created with `encodeBytes()` back to bytes.

	@param encodedString - The Base62 encoded string to decode.
	@returns The decoded bytes as Uint8Array.
	*/
	decodeBytes(encodedString: string): Uint8Array;

	/**
	Encodes a non-negative integer to a Base62 string.

	@param integer - The integer to encode.
	@returns The Base62 encoded string.
	*/
	encodeInteger(integer: number): string;

	/**
	Decodes a Base62 encoded string to an integer.

	@param encodedString - The Base62 string to decode.
	@returns The decoded integer.
	*/
	decodeInteger(encodedString: string): number;

	/**
	Encodes a non-negative bigint to a Base62 string.

	@param bigint - The bigint to encode.
	@returns The Base62 encoded string.
	*/
	encodeBigInt(bigint: bigint): string;

	/**
	Decodes a Base62 encoded string to a bigint.

	@param encodedString - The Base62 string to decode.
	@returns The decoded bigint.
	*/
	decodeBigInt(encodedString: string): bigint;
}

/**
Encodes a string to a Base62 string.

@param string - The string to encode.
@returns The Base62 encoded string.

@example
```
import base62 from '@sindresorhus/base62';

const encodedString = base62.encodeString('Hello world!');
console.log(encodedString);
//=> '28B5ymDkgSU62aA0v'

console.log(base62.decodeString(encodedString));
//=> 'Hello world!'

console.log(base62.encodeString('🦄'));
//=> '95s3vg'

console.log(base62.encodeInteger(1337));
//=> 'LZ'
```
*/
export function encodeString(string: string): string;

/**
Decodes a Base62 encoded string created with `encodeString()` back to the original string.

@param encodedString - The Base62 encoded string to decode.
@returns The decoded string.

@example
```
import base62 from '@sindresorhus/base62';

const encodedString = base62.encodeString('Hello world!');
console.log(encodedString);
//=> '28B5ymDkgSU62aA0v'

console.log(base62.decodeString(encodedString));
//=> 'Hello world!'

console.log(base62.encodeString('🦄'));
//=> '95s3vg'
```
*/
export function decodeString(encodedString: string): string;

/**
Encodes bytes to a Base62 string.

@param bytes - The bytes to encode.
@returns The Base62 encoded string.
*/
export function encodeBytes(bytes: Uint8Array): string;

/**
Decodes a Base62 string created with `encodeBytes()` back to bytes.

@param encodedString - The Base62 encoded string to decode.
@returns The decoded bytes as Uint8Array.
*/
export function decodeBytes(encodedString: string): Uint8Array;

/**
Encodes a non-negative integer to a Base62 string.

@param integer - The integer to encode.
@returns The Base62 encoded string.

@example
```
import base62 from '@sindresorhus/base62';

console.log(base62.encodeInteger(1337));
//=> 'LZ'
```
*/
export function encodeInteger(integer: number): string;

/**
Decodes a Base62 encoded string to an integer.

@param encodedString - The Base62 string to decode.
@returns The decoded integer.
*/
export function decodeInteger(encodedString: string): number;

/**
Encodes a non-negative bigint to a Base62 string.

@param bigint - The bigint to encode.
@returns The Base62 encoded string.
*/
export function encodeBigInt(bigint: bigint): string;

/**
Decodes a Base62 encoded string to a bigint.

@param encodedString - The Base62 string to decode.
@returns The decoded bigint.
*/
export function decodeBigInt(encodedString: string): bigint;
