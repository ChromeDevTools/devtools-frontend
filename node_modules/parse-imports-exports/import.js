import { parseFrom, parseWith } from './partParsers.js';
import { addError, getPosition, spacesRegExp, stripComments } from './utils.js';
/**
 * Adds error of parsing `import` statement.
 */
export const onImportError = (importsExports, _source, { start, end }) => addError(importsExports, 'Cannot find end of `import` statement', start, end);
/**
 * Parses `import` statement.
 */
export const onImportParse = (importsExports, source, { start, end: unparsedStart, comments }, { start: unparsedEnd, end: importEnd, match: endMatch, token: endToken }) => {
    var end = importEnd;
    var unparsed = stripComments(source, unparsedStart, unparsedEnd, comments);
    const quoteCharacter = endToken[0];
    const { from, index } = parseFrom(quoteCharacter, unparsed);
    if (index === -1) {
        return addError(importsExports, 'Cannot find start of `from` string literal of import', start, end);
    }
    unparsed = unparsed.slice(0, index).trim().replace(spacesRegExp, ' ');
    var isType = false;
    if (unparsed.startsWith('type ')) {
        isType = true;
        unparsed = unparsed.slice(5);
    }
    if (unparsed.endsWith(' from')) {
        unparsed = unparsed.slice(0, -5);
    }
    var withAttributes;
    if (endMatch.groups['with'] !== undefined) {
        if (isType) {
            return addError(importsExports, `Cannot use import attributes (\`with {...}\`) in \`import type\` statement for import from \`${from}\``, start, end);
        }
        const attributes = parseWith(importEnd, source);
        if (attributes === undefined) {
            return addError(importsExports, `Cannot find end of import attributes (\`with {...}\`) in \`import\` statement for import from \`${from}\``, start, end);
        }
        end = attributes.endIndex;
        withAttributes = attributes.with;
        if (withAttributes === undefined) {
            return addError(importsExports, `Cannot parse import attributes (\`with {...}\`) in \`import\` statement for import from \`${from}\``, start, end);
        }
    }
    const position = getPosition(importsExports, start, end);
    const parsedImport = withAttributes === undefined ? position : { ...position, with: withAttributes };
    const namespaceIndex = unparsed.indexOf('* as ');
    var key = 'namedImports';
    if (namespaceIndex === -1) {
        const braceIndex = unparsed.indexOf('{');
        if (braceIndex !== -1) {
            let namesString = unparsed.slice(braceIndex + 1);
            const braceCloseIndex = namesString.lastIndexOf('}');
            unparsed = unparsed.slice(0, braceIndex);
            if (braceCloseIndex === -1) {
                return addError(importsExports, `Cannot find end of imports list (\`}\`) for import from \`${from}\``, start, end);
            }
            namesString = namesString.slice(0, braceCloseIndex).trim();
            const namesList = namesString.split(',');
            let names;
            let types;
            for (let name of namesList) {
                let isTypeName = false;
                name = name.trim();
                if (name === '') {
                    continue;
                }
                const nameObject = {};
                if (name.startsWith('type ')) {
                    if (isType) {
                        return addError(importsExports, `Cannot use \`type\` modifier in \`import type\` statement for type \`${name.slice(5)}\` for import from \`${from}\``, start, end);
                    }
                    isTypeName = true;
                    name = name.slice(5);
                }
                const asIndex = name.indexOf(' as ');
                if (asIndex !== -1) {
                    nameObject.by = name.slice(0, asIndex);
                    name = name.slice(asIndex + 4);
                }
                if (isTypeName) {
                    if (types === undefined) {
                        types = { __proto__: null };
                    }
                    else if (name in types) {
                        return addError(importsExports, `Duplicate imported type \`${name}\` for import from \`${from}\``, start, end);
                    }
                    types[name] = nameObject;
                }
                else {
                    if (names === undefined) {
                        names = { __proto__: null };
                    }
                    else if (name in names) {
                        return addError(importsExports, `Duplicate imported name \`${name}\` for import from \`${from}\``, start, end);
                    }
                    names[name] = nameObject;
                }
            }
            if (names !== undefined) {
                parsedImport.names = names;
            }
            if (types !== undefined) {
                parsedImport.types = types;
            }
        }
    }
    else {
        parsedImport.namespace = unparsed.slice(namespaceIndex + 5);
        key = 'namespaceImports';
        unparsed = unparsed.slice(0, namespaceIndex);
    }
    const commaIndex = unparsed.indexOf(',');
    if (commaIndex !== -1) {
        unparsed = unparsed.slice(0, commaIndex).trim();
    }
    else {
        unparsed = unparsed.trim();
    }
    if (unparsed !== '') {
        if (isType && key === 'namespaceImports') {
            return addError(importsExports, `Cannot use default \`${unparsed}\` and namespace \`${parsedImport.namespace}\` together in \`import type\` statement for import from \`${from}\``, start, end);
        }
        parsedImport.default = unparsed;
    }
    if (isType) {
        key = key === 'namedImports' ? 'typeNamedImports' : 'typeNamespaceImports';
    }
    var imports = importsExports[key];
    imports !== null && imports !== void 0 ? imports : (imports = importsExports[key] = { __proto__: null });
    var importsList = imports[from];
    if (importsList === undefined) {
        imports[from] = [parsedImport];
    }
    else {
        importsList.push(parsedImport);
    }
    return end;
};
