# base62

> Encode & decode strings, bytes, and integers to [Base62](https://en.wikipedia.org/wiki/Base62)

Base62 is ideal for URL shortening, creating readable codes, and compact data representation, because it compresses large values into shorter, alphanumeric strings, maximizing space efficiency and readability.

## Install

```sh
npm install @sindresorhus/base62
```

## Usage

```js
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

> [!NOTE]
> The output may differ from other Base62 encoders due to variations in alphabet order and byte encoding.

## API

It uses the most common alphabet for Base62: `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz`

### `encodeString(string: string): string`

Encodes a string to a Base62 string.

> [!CAUTION]
> The result format is not yet guaranteed to be stable across package versions. Avoid using it for persistent storage.

### `decodeString(encodedString: string): string`

Decodes a Base62 encoded string created with `encodeString()` back to the original string.

### `encodeBytes(bytes: Uint8Array): string`

Encodes bytes to a Base62 string.

> [!CAUTION]
> The result format is not yet guaranteed to be stable across package versions. Avoid using it for persistent storage.

### `decodeBytes(encodedString: string): Uint8Array`

Decodes a Base62 string created with `encodeBytes()` back to bytes.

### `encodeInteger(integer: number): string`

Encodes a non-negative integer to a Base62 string.

### `decodeInteger(encodedString: string): number`

Decodes a Base62 string to an integer.

### `encodeBigInt(integer: bigint): string`

Encodes a non-negative bigint to a Base62 string.

### `decodeBigInt(encodedString: string): bigint`

Decodes a Base62 string to a bigint.

### Custom alphabets

You can use a custom alphabet by using the `Base62` class:

```js
import {Base62} from '@sindresorhus/base62';

// Create instance with custom alphabet
const customBase62 = new Base62({
	alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
});

console.log(customBase62.encodeInteger(1337));
//=> 'Vj' (different from default 'LZ')

// Or use special characters
const symbolBase62 = new Base62({
	alphabet: '!@#$%^&*()_+-=[]{}|;:,.<>?/~`0123456789ABCDEFGHIJKLMNOPQRSTUVW'
});
console.log(symbolBase62.encodeInteger(42));
//=> 'D'
```

> [!NOTE]
> The alphabet must be exactly 62 unique characters.

### `Base62`

#### `constructor(options?)`

Create a new Base62 encoder/decoder instance.

##### options

Type: `object`

###### alphabet

Type: `string`\
Default: `'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'`

Custom alphabet containing exactly 62 unique characters.

The `Base62` class has the same methods as the exported functions: `encodeString()`, `decodeString()`, `encodeBytes()`, `decodeBytes()`, `encodeInteger()`, `decodeInteger()`, `encodeBigInt()`, and `decodeBigInt()`.
