/**
 * Parses destructuring assignment.
 */
export const parseDestructuring = (sourceStartsWithDestructuring) => {
    const openBracket = sourceStartsWithDestructuring[0];
    const closeBracket = openBracket === '{' ? '}' : ']';
    const names = [];
    var bracketsDepth = 1;
    var index = 1;
    var isInsideSinglelineComment = false;
    var isInsideMultilineComment = false;
    for (; index < sourceStartsWithDestructuring.length; index += 1) {
        const char = sourceStartsWithDestructuring[index];
        if (isInsideSinglelineComment) {
            if (char === '\n') {
                isInsideSinglelineComment = false;
            }
            continue;
        }
        else if (isInsideMultilineComment) {
            if (char === '*' && sourceStartsWithDestructuring[index + 1] === '/') {
                isInsideMultilineComment = false;
                index += 1;
            }
            continue;
        }
        if (char === openBracket) {
            bracketsDepth += 1;
        }
        else if (char === closeBracket) {
            bracketsDepth -= 1;
            if (bracketsDepth === 0) {
                return { endIndex: index, names };
            }
        }
        else if (char === ':') {
            names.pop();
        }
        else if (char === '/') {
            const nextChar = sourceStartsWithDestructuring[index + 1];
            if (nextChar === '/') {
                isInsideSinglelineComment = true;
                index += 1;
            }
            else if (nextChar === '*') {
                isInsideMultilineComment = true;
                index += 1;
            }
        }
        else if (char in identifierStartCharacters) {
            const nameIndex = parseIdentifier(sourceStartsWithDestructuring.slice(index));
            if (nameIndex === 0) {
                return;
            }
            names.push(sourceStartsWithDestructuring.slice(index, index + nameIndex));
            index += nameIndex - 1;
        }
    }
    return;
};
/**
 * Parses string literal after `from` at the end of the source string.
 */
export const parseFrom = (quoteCharacter, sourceWithString) => {
    var hasBackslash = false;
    var index = sourceWithString.length - 1;
    for (; index !== -1; index -= 1) {
        const char = sourceWithString[index];
        if (char === '\\') {
            hasBackslash = true;
        }
        if (char === quoteCharacter && sourceWithString[index - 1] !== '\\') {
            break;
        }
    }
    var from = sourceWithString.slice(index + 1);
    if (hasBackslash) {
        from = from.replace(backslashesRegExp, stripFirstCharacter);
    }
    return { from, index };
};
/**
 * Parses identifier from the start of the source string.
 */
export const parseIdentifier = (sourceStartsWithIdentifier) => {
    if (!identifierStartCharacters[sourceStartsWithIdentifier[0]]) {
        return 0;
    }
    for (let index = 1; index < sourceStartsWithIdentifier.length; index += 1) {
        if (!identifierCharacters[sourceStartsWithIdentifier[index]]) {
            return index;
        }
    }
    return sourceStartsWithIdentifier.length;
};
/**
 * Parses import/reexport attributes in `with`-part of import/reexport (like `with { type: "json" }`).
 */
export const parseWith = (startIndex, source) => {
    const endIndex = source.indexOf('}', startIndex);
    if (endIndex === -1) {
        return;
    }
    const withAttributes = { __proto__: null };
    const attributesSource = source.slice(startIndex, endIndex).trim();
    if (attributesSource === '') {
        return { endIndex, with: withAttributes };
    }
    const attributes = attributesSource.split(',');
    for (const attribute of attributes) {
        const parts = attribute.split(':');
        if (parts.length !== 2) {
            return { endIndex };
        }
        let key = parts[0].trim();
        if (key[0] === "'" || key[0] === '"') {
            key = trimQuotes(key);
        }
        if (!key) {
            return { endIndex };
        }
        const value = trimQuotes(parts[1].trim());
        if (!value || key in withAttributes) {
            return { endIndex };
        }
        withAttributes[key] = value;
    }
    return { endIndex, with: withAttributes };
};
/**
 * Regexp that find all backslashes.
 */
const backslashesRegExp = /\\+/g;
/**
 * Hash with start characters of identifiers.
 */
const identifierStartCharacters = { __proto__: null };
for (const character of 'abcdefghijklmnopqrstuvwxyz_$') {
    identifierStartCharacters[character] = true;
    identifierStartCharacters[character.toUpperCase()] = true;
}
/**
 * Hash with characters of identifiers.
 */
const identifierCharacters = { __proto__: null, ...identifierStartCharacters };
for (const character of '0123456789') {
    identifierCharacters[character] = true;
}
/**
 * Strips first character from string.
 */
const stripFirstCharacter = (someString) => someString.slice(1);
/**
 * Trims single or double quotes around the string value.
 * If string is not quoted, returns `undefined`.
 */
const trimQuotes = (value) => {
    if (value.length < 2) {
        return;
    }
    var firstChar = value[0];
    if (firstChar !== "'" && firstChar !== '"') {
        return;
    }
    if (firstChar !== value[value.length - 1]) {
        return;
    }
    return value.slice(1, -1);
};
