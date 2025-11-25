import reservedIdentifiers_ from 'reserved-identifiers';
import base62 from '@sindresorhus/base62';

const reservedIdentifiers = reservedIdentifiers_({includeGlobalProperties: true});

const encodeCodePoint = x => `$${base62.encodeInteger(x.codePointAt(0))}$`;

export default function toValidIdentifier(value) {
	if (typeof value !== 'string') {
		throw new TypeError(`Expected a string, got \`${typeof value}\`.`);
	}

	if (reservedIdentifiers.has(value)) {
		// We prefix with underscore to avoid any potential conflicts with the Base62 encoded string.
		return `$_${value}$`;
	}

	return value.replaceAll(/(?<!^)\P{ID_Continue}/gu, encodeCodePoint)
		.replaceAll(/^[^_\p{ID_Start}]/gu, encodeCodePoint);
}
