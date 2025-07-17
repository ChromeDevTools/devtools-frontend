import { parseFrom, parseWith } from './partParsers.js';
import { addError, getPosition, spacesRegExp, stripComments } from './utils.js';
/**
 * Adds error of parsing named `export` statement.
 */
export const onNamedExportError = (importsExports, _source, { start, end, match: { groups } }) => addError(importsExports, `Cannot find end of \`export ${groups['type'] === undefined ? '' : 'type '}{...} ...\` statement`, start, end);
/**
 * Parses named `export` statement.
 */
export const onNamedExportParse = (importsExports, source, { start, end: unparsedStart, comments, match: startMatch }, { start: unparsedEnd, end: exportEnd, match: endMatch }) => {
    var _a;
    var end = exportEnd;
    var maybeFrom;
    var unparsed = stripComments(source, unparsedStart, unparsedEnd, comments);
    const { groups } = endMatch;
    const quote = (_a = groups.quote) !== null && _a !== void 0 ? _a : groups.with;
    var isType = false;
    if (startMatch.groups['type'] !== undefined) {
        isType = true;
    }
    var withAttributes;
    if (quote !== undefined) {
        const { from, index } = parseFrom(quote[0], unparsed);
        if (index === -1) {
            return addError(importsExports, 'Cannot find start of `from` string literal of reexport', start, end);
        }
        maybeFrom = from;
        unparsed = unparsed.slice(0, index);
        const braceCloseIndex = unparsed.lastIndexOf('}');
        if (braceCloseIndex === -1) {
            return addError(importsExports, `Cannot find end of reexports list (\`}\`) for reexport from \`${maybeFrom}\``, start, end);
        }
        unparsed = unparsed.slice(0, braceCloseIndex);
        if (groups.with !== undefined) {
            if (isType) {
                return addError(importsExports, `Cannot use import attributes (\`with {...}\`) in \`export type\` statement for reexport from \`${from}\``, start, end);
            }
            const attributes = parseWith(exportEnd, source);
            if (attributes === undefined) {
                return addError(importsExports, `Cannot find end of import attributes (\`with {...}\`) for reexport from \`${from}\``, start, end);
            }
            end = attributes.endIndex;
            withAttributes = attributes.with;
            if (withAttributes === undefined) {
                return addError(importsExports, `Cannot parse import attributes (\`with {...}\`) for reexport from \`${from}\``, start, end);
            }
        }
    }
    const namedExport = getPosition(importsExports, start, end);
    const namesString = unparsed.trim().replace(spacesRegExp, ' ');
    const namesList = namesString.split(',');
    var names;
    var types;
    for (let name of namesList) {
        let isTypeName = false;
        name = name.trim();
        if (name === '') {
            continue;
        }
        const nameObject = {};
        if (name.startsWith('type ')) {
            if (isType) {
                return addError(importsExports, `Cannot use \`type\` modifier in \`export type {...}\` statement for type \`${name.slice(5)}\`${maybeFrom === undefined ? '' : ` for reexport from \`${maybeFrom}\``}`, start, end);
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
                return addError(importsExports, `Duplicate exported type \`${name}\` ${maybeFrom === undefined ? 'in named export' : `for reexport from \`${maybeFrom}\``}`, start, end);
            }
            types[name] = nameObject;
        }
        else {
            if (names === undefined) {
                names = { __proto__: null };
            }
            else if (name in names) {
                return addError(importsExports, `Duplicate exported name \`${name}\` ${maybeFrom === undefined ? 'in named export' : `for reexport from \`${maybeFrom}\``}`, start, end);
            }
            names[name] = nameObject;
        }
    }
    if (names !== undefined) {
        namedExport.names = names;
    }
    if (types !== undefined) {
        namedExport.types = types;
    }
    if (maybeFrom === undefined) {
        const key = isType ? 'typeNamedExports' : 'namedExports';
        let exports = importsExports[key];
        if (exports === undefined) {
            importsExports[key] = [namedExport];
        }
        else {
            exports.push(namedExport);
        }
    }
    else {
        const key = isType ? 'typeNamedReexports' : 'namedReexports';
        const namedReexport = withAttributes === undefined ? namedExport : { ...namedExport, with: withAttributes };
        let reexports = importsExports[key];
        reexports !== null && reexports !== void 0 ? reexports : (reexports = importsExports[key] = { __proto__: null });
        let reexportsList = reexports[maybeFrom];
        if (reexportsList === undefined) {
            reexports[maybeFrom] = [namedReexport];
        }
        else {
            reexportsList.push(namedReexport);
        }
    }
    return end;
};
