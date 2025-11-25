/* eslint-disable no-bitwise */

const BASE = 62;
const BASE_BIGINT = 62n;
const DEFAULT_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

const cachedEncoder = new globalThis.TextEncoder();
const cachedDecoder = new globalThis.TextDecoder();

function assertString(value, label) {
	if (typeof value !== 'string') {
		throw new TypeError(`The \`${label}\` parameter must be a string, got \`${value}\` (${typeof value}).`);
	}
}

function validateAlphabet(alphabet) {
	if (typeof alphabet !== 'string') {
		throw new TypeError(`The alphabet must be a string, got \`${alphabet}\` (${typeof alphabet}).`);
	}

	if (alphabet.length !== BASE) {
		throw new TypeError(`The alphabet must be exactly ${BASE} characters long, got ${alphabet.length}.`);
	}

	const uniqueCharacters = new Set(alphabet);
	if (uniqueCharacters.size !== BASE) {
		throw new TypeError(`The alphabet must contain ${BASE} unique characters, got ${uniqueCharacters.size}.`);
	}
}

export class Base62 {
	constructor(options = {}) {
		const alphabet = options.alphabet ?? DEFAULT_ALPHABET;
		validateAlphabet(alphabet);
		this.alphabet = [...alphabet];
		this.indices = new Map(this.alphabet.map((character, index) => [character, index]));
	}

	#getIndex(character) {
		const index = this.indices.get(character);

		if (index === undefined) {
			throw new TypeError(`Unexpected character for Base62 encoding: \`${character}\`.`);
		}

		return index;
	}

	encodeString(string) {
		assertString(string, 'string');
		return this.encodeBytes(cachedEncoder.encode(string));
	}

	decodeString(encodedString) {
		assertString(encodedString, 'encodedString');
		return cachedDecoder.decode(this.decodeBytes(encodedString));
	}

	encodeBytes(bytes) {
		if (!(bytes instanceof Uint8Array)) {
			throw new TypeError('The `bytes` parameter must be an instance of Uint8Array.');
		}

		if (bytes.length === 0) {
			return '';
		}

		// Prepend 0x01 to the byte array before encoding to ensure the BigInt conversion
		// does not strip any leading zeros and to prevent any byte sequence from being
		// interpreted as a numerically zero value.
		let value = 1n;

		for (const byte of bytes) {
			value = (value << 8n) | BigInt(byte);
		}

		return this.encodeBigInt(value);
	}

	decodeBytes(encodedString) {
		assertString(encodedString, 'encodedString');

		if (encodedString.length === 0) {
			return new Uint8Array();
		}

		let value = this.decodeBigInt(encodedString);

		const byteArray = [];
		while (value > 0n) {
			byteArray.push(Number(value & 0xFFn));
			value >>= 8n;
		}

		// Remove the 0x01 that was prepended during encoding.
		return Uint8Array.from(byteArray.reverse().slice(1));
	}

	encodeInteger(integer) {
		if (!Number.isInteger(integer)) {
			throw new TypeError(`Expected an integer, got \`${integer}\` (${typeof integer}).`);
		}

		if (integer < 0) {
			throw new TypeError('The integer must be non-negative.');
		}

		if (integer === 0) {
			return this.alphabet[0];
		}

		let encodedString = '';
		while (integer > 0) {
			encodedString = this.alphabet[integer % BASE] + encodedString;
			integer = Math.floor(integer / BASE);
		}

		return encodedString;
	}

	decodeInteger(encodedString) {
		assertString(encodedString, 'encodedString');

		let integer = 0;
		for (const character of encodedString) {
			integer = (integer * BASE) + this.#getIndex(character);
		}

		return integer;
	}

	encodeBigInt(bigint) {
		if (typeof bigint !== 'bigint') {
			throw new TypeError(`Expected a bigint, got \`${bigint}\` (${typeof bigint}).`);
		}

		if (bigint < 0) {
			throw new TypeError('The bigint must be non-negative.');
		}

		if (bigint === 0n) {
			return this.alphabet[0];
		}

		let encodedString = '';
		while (bigint > 0n) {
			encodedString = this.alphabet[Number(bigint % BASE_BIGINT)] + encodedString;
			bigint /= BASE_BIGINT;
		}

		return encodedString;
	}

	decodeBigInt(encodedString) {
		assertString(encodedString, 'encodedString');

		let bigint = 0n;
		for (const character of encodedString) {
			bigint = (bigint * BASE_BIGINT) + BigInt(this.#getIndex(character));
		}

		return bigint;
	}
}

// Create default instance with standard alphabet
const defaultBase62 = new Base62();

// Export convenience functions using the default alphabet for backward compatibility
export const encodeString = string => defaultBase62.encodeString(string);
export const decodeString = encodedString => defaultBase62.decodeString(encodedString);
export const encodeBytes = bytes => defaultBase62.encodeBytes(bytes);
export const decodeBytes = encodedString => defaultBase62.decodeBytes(encodedString);
export const encodeInteger = integer => defaultBase62.encodeInteger(integer);
export const decodeInteger = encodedString => defaultBase62.decodeInteger(encodedString);
export const encodeBigInt = bigint => defaultBase62.encodeBigInt(bigint);
export const decodeBigInt = encodedString => defaultBase62.decodeBigInt(encodedString);
