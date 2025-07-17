'use strict';
exports.onDeclarationExportError = undefined;
exports.onDeclarationExportParse = undefined;
const { parseDestructuring, parseFrom, parseIdentifier, parseWith } = require('./partParsers.cjs');
const { addError, getPosition, stripComments } = require('./utils.cjs');
/**
 * Adds error of parsing `export` statement with declaration.
 */
const onDeclarationExportError = exports.onDeclarationExportError = (importsExports, _source, { start, end }) => addError(importsExports, 'Cannot find end of export with declaration', start, end);
/**
 * Parses `export` statement with declaration.
 */
const onDeclarationExportParse = exports.onDeclarationExportParse = (importsExports, source, { start, end: unparsedStart, comments }, { start: unparsedEnd, end: exportEnd, match: endMatch }) => {
    var end = exportEnd;
    var isDeclare = false;
    var isType = false;
    var unparsed = stripComments(source, unparsedStart, unparsedEnd, comments).trim();
    if (unparsed.startsWith('declare ')) {
        isDeclare = true;
        unparsed = unparsed.slice(8).trim();
    }
    if (unparsed.startsWith('type ')) {
        isType = true;
        unparsed = unparsed.slice(5).trim();
    }
    const modifiers = `${isDeclare ? 'declare ' : ''}${isType ? 'type ' : ''}`;
    if (unparsed[0] === '*') {
        if (isDeclare) {
            return addError(importsExports, `Cannot declare star export (\`export ${modifiers}* ... from ...\`)`, start, end);
        }
        let namespace;
        if (unparsed.startsWith('* as ')) {
            unparsed = unparsed.slice(5).trim();
            const spaceIndex = unparsed.indexOf(' ');
            if (spaceIndex === -1) {
                return addError(importsExports, `Cannot find namespace of \`export ${modifiers}* as ... from ...\` statement`, start, end);
            }
            namespace = unparsed.slice(0, spaceIndex);
            unparsed = unparsed.slice(spaceIndex + 1);
        }
        if (unparsed[unparsed.length - 1] === ';') {
            unparsed = unparsed.slice(0, -1).trim();
        }
        const { groups } = endMatch;
        let quoteCharacter;
        if (groups.with === undefined) {
            quoteCharacter = unparsed[unparsed.length - 1];
            unparsed = unparsed.slice(0, -1);
        }
        else {
            quoteCharacter = groups.with[0];
        }
        const reexportKind = `${namespace === undefined ? 'star' : 'namespace'} reexport`;
        if (quoteCharacter !== "'" && quoteCharacter !== '"') {
            return addError(importsExports, `Cannot find end of \`from\` string literal of ${reexportKind}`, start, end);
        }
        const { from, index } = parseFrom(quoteCharacter, unparsed);
        if (index === -1) {
            return addError(importsExports, `Cannot find start of \`from\` string literal of ${reexportKind}`, start, end);
        }
        let withAttributes;
        if (groups.with !== undefined) {
            if (isType) {
                return addError(importsExports, `Cannot use import attributes (\`with {...}\`) in \`export ${modifiers}\` statement for ${reexportKind} from \`${from}\``, start, end);
            }
            const attributes = parseWith(exportEnd, source);
            if (attributes === undefined) {
                return addError(importsExports, `Cannot find end of import attributes (\`with {...}\`) for ${reexportKind} from \`${from}\``, start, end);
            }
            end = attributes.endIndex;
            withAttributes = attributes.with;
            if (withAttributes === undefined) {
                return addError(importsExports, `Cannot parse import attributes (\`with {...}\`) for ${reexportKind} from \`${from}\``, start, end);
            }
        }
        const position = getPosition(importsExports, start, end);
        const parsedReexport = withAttributes === undefined ? position : { ...position, with: withAttributes };
        let key = 'starReexports';
        if (namespace !== undefined) {
            parsedReexport.namespace = namespace;
            key = 'namespaceReexports';
        }
        if (isType) {
            key = key === 'starReexports' ? 'typeStarReexports' : 'typeNamespaceReexports';
        }
        let reexports = importsExports[key];
        reexports !== null && reexports !== void 0 ? reexports : (reexports = importsExports[key] = { __proto__: null });
        let reexportsList = reexports[from];
        if (reexportsList === undefined) {
            reexports[from] = [parsedReexport];
        }
        else {
            reexportsList.push(parsedReexport);
        }
        return end;
    }
    const identifierIndex = parseIdentifier(unparsed);
    if (identifierIndex === 0) {
        return addError(importsExports, `Cannot parse declaration identifier of \`export ${modifiers}...\` statement`, start, end);
    }
    const identifier = unparsed.slice(0, identifierIndex);
    if (isType) {
        let { typeExports } = importsExports;
        if (typeExports === undefined) {
            importsExports.typeExports = typeExports = { __proto__: null };
        }
        else if (identifier in typeExports) {
            return addError(importsExports, `Duplicate exported type \`${identifier}\``, start, end);
        }
        typeExports[identifier] = getPosition(importsExports, start, end);
        if (isDeclare) {
            typeExports[identifier].isDeclare = true;
        }
        return;
    }
    if (identifier === 'default') {
        if (isDeclare) {
            return addError(importsExports, `Cannot export default with declare (\`export ${modifiers}default ...\`)`, start, end);
        }
        if (importsExports.defaultExport !== undefined) {
            return addError(importsExports, 'Duplicate default export', start, end);
        }
        importsExports.defaultExport = getPosition(importsExports, start, end);
        return;
    }
    unparsed = unparsed.slice(identifierIndex).trim();
    if (identifier === 'interface') {
        const nameIndex = parseIdentifier(unparsed);
        if (nameIndex === 0) {
            return addError(importsExports, `Cannot parse interface identifier of \`export ${modifiers}interface ...\` statement`, start, end);
        }
        const name = unparsed.slice(0, nameIndex);
        let { interfaceExports } = importsExports;
        interfaceExports !== null && interfaceExports !== void 0 ? interfaceExports : (interfaceExports = importsExports.interfaceExports = { __proto__: null });
        const interfaceExport = getPosition(importsExports, start, end);
        if (isDeclare) {
            interfaceExport.isDeclare = true;
        }
        let exportsList = interfaceExports[name];
        if (exportsList === undefined) {
            interfaceExports[name] = [interfaceExport];
        }
        else {
            exportsList.push(interfaceExport);
        }
        return;
    }
    if (identifier === 'namespace') {
        const nameIndex = parseIdentifier(unparsed);
        if (nameIndex === 0) {
            return addError(importsExports, `Cannot parse namespace identifier of \`export ${modifiers}namespace ...\` statement`, start, end);
        }
        const name = unparsed.slice(0, nameIndex);
        let { namespaceExports } = importsExports;
        namespaceExports !== null && namespaceExports !== void 0 ? namespaceExports : (namespaceExports = importsExports.namespaceExports = { __proto__: null });
        const namespaceExport = getPosition(importsExports, start, end);
        if (isDeclare) {
            namespaceExport.isDeclare = true;
        }
        let exportsList = namespaceExports[name];
        if (exportsList === undefined) {
            namespaceExports[name] = [namespaceExport];
        }
        else {
            exportsList.push(namespaceExport);
        }
        return;
    }
    var isAsync = false;
    var kind;
    const names = [];
    switch (identifier) {
        case 'const':
        case 'class':
        case 'enum':
        case 'let':
        case 'var':
            if ((identifier === 'const' || identifier === 'let' || identifier === 'var') &&
                (unparsed[0] === '{' || unparsed[0] === '[')) {
                const destructuring = parseDestructuring(unparsed + source.slice(end));
                if (destructuring === undefined) {
                    return addError(importsExports, `Cannot parse destructuring names in \`export ${modifiers}${identifier} ...\` statement`, start, end);
                }
                const endDiff = destructuring.endIndex - unparsed.length;
                if (endDiff > 0) {
                    end += endDiff;
                }
                names.push(...destructuring.names);
                kind = `destructuring ${identifier}`;
                if (isDeclare) {
                    kind = `declare ${kind}`;
                }
                break;
            }
            const nameIndex = parseIdentifier(unparsed);
            if (nameIndex === 0) {
                return addError(importsExports, `Cannot parse \`${identifier}\` identifier of \`export ${modifiers}${identifier} ...\` statement`, start, end);
            }
            kind = identifier;
            if (isDeclare) {
                kind = `declare ${kind}`;
            }
            names[0] = unparsed.slice(0, nameIndex);
            if (identifier === 'const' && names[0] === 'enum') {
                unparsed = unparsed.slice(4).trim();
                const constEnumNameIndex = parseIdentifier(unparsed);
                if (constEnumNameIndex === 0) {
                    return addError(importsExports, `Cannot parse identifier of \`export ${modifiers}const enum ...\` statement`, start, end);
                }
                kind = 'const enum';
                if (isDeclare) {
                    kind = `declare ${kind}`;
                }
                names[0] = unparsed.slice(0, constEnumNameIndex);
            }
            break;
        case 'abstract':
            if (!unparsed.startsWith('class ')) {
                return addError(importsExports, `Cannot parse declaration of abstract class of \`export ${modifiers}abstract ...\` statement`, start, end);
            }
            unparsed = unparsed.slice(5).trim();
            const abstractClassNameIndex = parseIdentifier(unparsed);
            if (abstractClassNameIndex === 0) {
                return addError(importsExports, `Cannot parse \`${identifier}\` identifier of \`export ${modifiers}abstract class ${identifier} ...\` statement`, start, end);
            }
            kind = 'abstract class';
            if (isDeclare) {
                kind = `declare ${kind}`;
            }
            names[0] = unparsed.slice(0, abstractClassNameIndex);
            break;
        // @ts-expect-error
        case 'async':
            if (isDeclare) {
                return addError(importsExports, `Cannot export async function with declare (\`export ${modifiers}async ...\`)`, start, end);
            }
            if (unparsed.startsWith('function') === false) {
                return addError(importsExports, 'Cannot parse async function in `export async ...` statement', start, end);
            }
            isAsync = true;
            unparsed = unparsed.slice(8).trim();
        case 'function':
            if (unparsed[0] === '*') {
                if (isDeclare) {
                    return addError(importsExports, `Cannot export generator function with declare (\`export ${modifiers}function* ...\`)`, start, end);
                }
                unparsed = unparsed.slice(1).trim();
                kind = 'function*';
            }
            else {
                kind = 'function';
            }
            if (isAsync) {
                kind = `async ${kind}`;
            }
            else if (isDeclare) {
                kind = 'declare function';
            }
            const functionNameIndex = parseIdentifier(unparsed);
            if (functionNameIndex === 0) {
                return addError(importsExports, `Cannot parse \`${kind}\` identifier of \`export ${modifiers}${kind} ...\` statement`, start, end);
            }
            names[0] = unparsed.slice(0, functionNameIndex);
            break;
        default:
            return addError(importsExports, `Cannot parse \`export ${modifiers}${identifier} ...\` statement`, start, end);
    }
    var { declarationExports } = importsExports;
    declarationExports !== null && declarationExports !== void 0 ? declarationExports : (declarationExports = importsExports.declarationExports = {
        __proto__: null,
    });
    for (const name of names) {
        if (name in declarationExports) {
            return addError(importsExports, `Duplicate exported declaration \`${kind} ${name}\``, start, end);
        }
        declarationExports[name] = {
            ...getPosition(importsExports, start, end),
            kind: kind,
        };
    }
    return end;
};
