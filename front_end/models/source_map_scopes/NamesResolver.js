// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../bindings/bindings.js';
import * as Formatter from '../formatter/formatter.js';
import * as TextUtils from '../text_utils/text_utils.js';
const scopeToCachedIdentifiersMap = new WeakMap();
const cachedMapByCallFrame = new WeakMap();
export async function getTextFor(contentProvider) {
    const contentData = await contentProvider.requestContentData();
    if (TextUtils.ContentData.ContentData.isError(contentData) || !contentData.isTextContent) {
        return null;
    }
    return contentData.textObj;
}
export class IdentifierPositions {
    name;
    positions;
    constructor(name, positions = []) {
        this.name = name;
        this.positions = positions;
    }
    addPosition(lineNumber, columnNumber) {
        this.positions.push({ lineNumber, columnNumber });
    }
}
const computeScopeTree = async function (script) {
    if (!script.sourceMapURL) {
        return null;
    }
    return await SDK.ScopeTreeCache.scopeTreeForScript(script);
};
/**
 * @returns the scope chain from outer-most to inner-most scope where the inner-most
 * scope either contains or matches the "needle".
 */
const findScopeChain = function (scopeTree, scopeNeedle) {
    if (!contains(scopeTree, scopeNeedle)) {
        return [];
    }
    // Find the corresponding scope in the scope tree.
    let containingScope = scopeTree;
    const scopeChain = [scopeTree];
    while (true) {
        let childFound = false;
        for (const child of containingScope.children) {
            if (contains(child, scopeNeedle)) {
                // We found a nested containing scope, continue with search there.
                scopeChain.push(child);
                containingScope = child;
                childFound = true;
                break;
            }
            // Sanity check: |scope| should not straddle any of the scopes in the tree. That is:
            // Either |scope| is disjoint from |child| or |child| must be inside |scope|.
            // (Or the |scope| is inside |child|, but that case is covered above.)
            if (!disjoint(scopeNeedle, child) && !contains(scopeNeedle, child)) {
                console.error('Wrong nesting of scopes');
                return [];
            }
        }
        if (!childFound) {
            // We found the deepest scope in the tree that contains our scope chain entry.
            break;
        }
    }
    return scopeChain;
    function contains(scope, candidate) {
        return (scope.start <= candidate.start) && (scope.end >= candidate.end);
    }
    function disjoint(scope, other) {
        return (scope.end <= other.start) || (other.end <= scope.start);
    }
};
export async function findScopeChainForDebuggerScope(scope) {
    const startLocation = scope.range()?.start;
    const endLocation = scope.range()?.end;
    if (!startLocation || !endLocation) {
        return [];
    }
    const script = startLocation.script();
    if (!script) {
        return [];
    }
    const scopeTreeAndText = await computeScopeTree(script);
    if (!scopeTreeAndText) {
        return [];
    }
    const { scopeTree, text } = scopeTreeAndText;
    // Compute the offset within the scope tree coordinate space.
    const scopeOffsets = {
        start: text.offsetFromPosition(startLocation.lineNumber, startLocation.columnNumber),
        end: text.offsetFromPosition(endLocation.lineNumber, endLocation.columnNumber),
    };
    return findScopeChain(scopeTree, scopeOffsets);
}
export const scopeIdentifiers = async function (script, scope, ancestorScopes) {
    const text = await getTextFor(script);
    if (!text) {
        return null;
    }
    // Now we have containing scope. Collect all the scope variables.
    const boundVariables = [];
    const cursor = new TextUtils.TextCursor.TextCursor(text.lineEndings());
    for (const variable of scope.variables) {
        // Skip the fixed-kind variable (i.e., 'this' or 'arguments') if we only found their "definition"
        // without any uses.
        if (variable.kind === 3 /* Formatter.FormatterWorkerPool.DefinitionKind.FIXED */ && variable.offsets.length <= 1) {
            continue;
        }
        const identifier = new IdentifierPositions(variable.name);
        for (const offset of variable.offsets) {
            cursor.resetTo(offset);
            identifier.addPosition(cursor.lineNumber(), cursor.columnNumber());
        }
        boundVariables.push(identifier);
    }
    // Compute free variables by collecting all the ancestor variables that are used in |containingScope|.
    const freeVariables = [];
    for (const ancestor of ancestorScopes) {
        for (const ancestorVariable of ancestor.variables) {
            let identifier = null;
            for (const offset of ancestorVariable.offsets) {
                if (offset >= scope.start && offset < scope.end) {
                    if (!identifier) {
                        identifier = new IdentifierPositions(ancestorVariable.name);
                    }
                    cursor.resetTo(offset);
                    identifier.addPosition(cursor.lineNumber(), cursor.columnNumber());
                }
            }
            if (identifier) {
                freeVariables.push(identifier);
            }
        }
    }
    return { boundVariables, freeVariables };
};
const identifierAndPunctuationRegExp = /^\s*([A-Za-z_$][A-Za-z_$0-9]*)\s*([.;,=]?)\s*$/;
const resolveDebuggerScope = async (scope) => {
    if (!Common.Settings.Settings.instance().moduleSetting('js-source-maps-enabled').get()) {
        return { variableMapping: new Map(), thisMapping: null };
    }
    const script = scope.callFrame().script;
    const scopeChain = await findScopeChainForDebuggerScope(scope);
    return await resolveScope(script, scopeChain);
};
const resolveScope = async (script, scopeChain) => {
    const parsedScope = scopeChain[scopeChain.length - 1];
    if (!parsedScope) {
        return { variableMapping: new Map(), thisMapping: null };
    }
    let cachedScopeMap = scopeToCachedIdentifiersMap.get(parsedScope);
    const sourceMap = script.sourceMap();
    if (!cachedScopeMap || cachedScopeMap.sourceMap !== sourceMap) {
        const identifiersPromise = (async () => {
            const variableMapping = new Map();
            let thisMapping = null;
            if (!sourceMap) {
                return { variableMapping, thisMapping };
            }
            // Extract as much as possible from SourceMap and resolve
            // missing identifier names from SourceMap ranges.
            const promises = [];
            const resolveEntry = (id, handler) => {
                // First see if we have a source map entry with a name for the identifier.
                for (const position of id.positions) {
                    const entry = sourceMap.findEntry(position.lineNumber, position.columnNumber);
                    if (entry?.name) {
                        handler(entry.name);
                        return;
                    }
                }
                /** If there is no entry with the name field, try to infer the name from the source positions. **/
                async function resolvePosition() {
                    if (!sourceMap) {
                        return;
                    }
                    // Let us find the first non-empty mapping of |id| and return that. Ideally, we would
                    // try to compute all the mappings and only use the mapping if all the non-empty
                    // mappings agree. However, that can be expensive for identifiers with many uses,
                    // so we iterate sequentially, stopping at the first non-empty mapping.
                    for (const position of id.positions) {
                        const sourceName = await resolveSourceName(script, sourceMap, id.name, position);
                        if (sourceName) {
                            handler(sourceName);
                            return;
                        }
                    }
                }
                promises.push(resolvePosition());
            };
            const parsedVariables = await scopeIdentifiers(script, parsedScope, scopeChain.slice(0, -1));
            if (!parsedVariables) {
                return { variableMapping, thisMapping };
            }
            for (const id of parsedVariables.boundVariables) {
                resolveEntry(id, sourceName => {
                    // Let use ignore 'this' mappings - those are handled separately.
                    if (sourceName !== 'this') {
                        variableMapping.set(id.name, sourceName);
                    }
                });
            }
            for (const id of parsedVariables.freeVariables) {
                resolveEntry(id, sourceName => {
                    if (sourceName === 'this') {
                        thisMapping = id.name;
                    }
                });
            }
            await Promise.all(promises).then(getScopeResolvedForTest());
            return { variableMapping, thisMapping };
        })();
        cachedScopeMap = { sourceMap, mappingPromise: identifiersPromise };
        scopeToCachedIdentifiersMap.set(parsedScope, { sourceMap, mappingPromise: identifiersPromise });
    }
    return await cachedScopeMap.mappingPromise;
    async function resolveSourceName(script, sourceMap, name, position) {
        const ranges = sourceMap.findEntryRanges(position.lineNumber, position.columnNumber);
        if (!ranges) {
            return null;
        }
        // Extract the underlying text from the compiled code's range and make sure that
        // it starts with the identifier |name|.
        const uiSourceCode = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().uiSourceCodeForSourceMapSourceURL(script.debuggerModel, ranges.sourceURL, script.isContentScript());
        if (!uiSourceCode) {
            return null;
        }
        const compiledText = await getTextFor(script);
        if (!compiledText) {
            return null;
        }
        const compiledToken = compiledText.extract(ranges.range);
        const parsedCompiledToken = extractIdentifier(compiledToken);
        if (!parsedCompiledToken) {
            return null;
        }
        const { name: compiledName, punctuation: compiledPunctuation } = parsedCompiledToken;
        if (compiledName !== name) {
            return null;
        }
        // Extract the mapped name from the source code range and ensure that the punctuation
        // matches the one from the compiled code.
        const sourceText = await getTextFor(uiSourceCode);
        if (!sourceText) {
            return null;
        }
        const sourceToken = sourceText.extract(ranges.sourceRange);
        const parsedSourceToken = extractIdentifier(sourceToken);
        if (!parsedSourceToken) {
            return null;
        }
        const { name: sourceName, punctuation: sourcePunctuation } = parsedSourceToken;
        // Accept the source name if it is followed by the same punctuation.
        if (compiledPunctuation === sourcePunctuation) {
            return sourceName;
        }
        // Let us also allow semicolons into commas since that it is a common transformation.
        if (compiledPunctuation === "comma" /* Punctuation.COMMA */ && sourcePunctuation === "semicolon" /* Punctuation.SEMICOLON */) {
            return sourceName;
        }
        return null;
        function extractIdentifier(token) {
            const match = token.match(identifierAndPunctuationRegExp);
            if (!match) {
                return null;
            }
            const name = match[1];
            let punctuation = null;
            switch (match[2]) {
                case '.':
                    punctuation = "dot" /* Punctuation.DOT */;
                    break;
                case ',':
                    punctuation = "comma" /* Punctuation.COMMA */;
                    break;
                case ';':
                    punctuation = "semicolon" /* Punctuation.SEMICOLON */;
                    break;
                case '=':
                    punctuation = "equals" /* Punctuation.EQUALS */;
                    break;
                case '':
                    punctuation = "none" /* Punctuation.NONE */;
                    break;
                default:
                    console.error(`Name token parsing error: unexpected token "${match[2]}"`);
                    return null;
            }
            return { name, punctuation };
        }
    }
};
export const resolveScopeChain = async function (callFrame) {
    const { pluginManager } = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
    let scopeChain = await pluginManager.resolveScopeChain(callFrame);
    if (scopeChain) {
        return scopeChain;
    }
    scopeChain = Root.Runtime.experiments.isEnabled("use-source-map-scopes" /* Root.Runtime.ExperimentName.USE_SOURCE_MAP_SCOPES */) ?
        callFrame.script.sourceMap()?.resolveScopeChain(callFrame) :
        null;
    if (scopeChain) {
        return scopeChain;
    }
    if (callFrame.script.isWasm()) {
        return callFrame.scopeChain();
    }
    const thisObject = await resolveThisObject(callFrame);
    return callFrame.scopeChain().map(scope => new ScopeWithSourceMappedVariables(scope, thisObject));
};
/**
 * @returns A mapping from original name -> compiled name. If the orignal name is unavailable (e.g. because the compiled name was
 * shadowed) we set it to `null`.
 */
export const allVariablesInCallFrame = async (callFrame) => {
    if (!Common.Settings.Settings.instance().moduleSetting('js-source-maps-enabled').get()) {
        return new Map();
    }
    const cachedMap = cachedMapByCallFrame.get(callFrame);
    if (cachedMap) {
        return cachedMap;
    }
    const scopeChain = callFrame.scopeChain();
    const nameMappings = await Promise.all(scopeChain.map(resolveDebuggerScope));
    const reverseMapping = new Map();
    const compiledNames = new Set();
    for (const { variableMapping } of nameMappings) {
        for (const [compiledName, originalName] of variableMapping) {
            if (!originalName) {
                continue;
            }
            if (!reverseMapping.has(originalName)) {
                // An inner scope might have shadowed {compiledName}. Mark it as "unavailable" in that case.
                const compiledNameOrNull = compiledNames.has(compiledName) ? null : compiledName;
                reverseMapping.set(originalName, compiledNameOrNull);
            }
            compiledNames.add(compiledName);
        }
    }
    cachedMapByCallFrame.set(callFrame, reverseMapping);
    return reverseMapping;
};
/**
 * @returns A mapping from original name -> compiled name. If the orignal name is unavailable (e.g. because the compiled name was
 * shadowed) we set it to `null`.
 */
export const allVariablesAtPosition = async (location) => {
    const reverseMapping = new Map();
    if (!Common.Settings.Settings.instance().moduleSetting('js-source-maps-enabled').get()) {
        return reverseMapping;
    }
    const script = location.script();
    if (!script) {
        return reverseMapping;
    }
    const scopeTreeAndText = await computeScopeTree(script);
    if (!scopeTreeAndText) {
        return reverseMapping;
    }
    const { scopeTree, text } = scopeTreeAndText;
    const locationOffset = text.offsetFromPosition(location.lineNumber, location.columnNumber);
    const scopeChain = findScopeChain(scopeTree, { start: locationOffset, end: locationOffset });
    const compiledNames = new Set();
    while (scopeChain.length > 0) {
        const { variableMapping } = await resolveScope(script, scopeChain);
        for (const [compiledName, originalName] of variableMapping) {
            if (!originalName) {
                continue;
            }
            if (!reverseMapping.has(originalName)) {
                // An inner scope might have shadowed {compiledName}. Mark it as "unavailable" in that case.
                const compiledNameOrNull = compiledNames.has(compiledName) ? null : compiledName;
                reverseMapping.set(originalName, compiledNameOrNull);
            }
            compiledNames.add(compiledName);
        }
        scopeChain.pop();
    }
    return reverseMapping;
};
export const resolveThisObject = async (callFrame) => {
    const scopeChain = callFrame.scopeChain();
    if (scopeChain.length === 0) {
        return callFrame.thisObject();
    }
    const { thisMapping } = await resolveDebuggerScope(scopeChain[0]);
    if (!thisMapping) {
        return callFrame.thisObject();
    }
    const result = await callFrame.evaluate(({
        expression: thisMapping,
        objectGroup: 'backtrace',
        includeCommandLineAPI: false,
        silent: true,
        returnByValue: false,
        generatePreview: true,
    }));
    if ('exceptionDetails' in result) {
        return !result.exceptionDetails && result.object ? result.object : callFrame.thisObject();
    }
    return null;
};
export const resolveScopeInObject = function (scope) {
    const endLocation = scope.range()?.end;
    const startLocationScript = scope.range()?.start.script() ?? null;
    if (scope.type() === "global" /* Protocol.Debugger.ScopeType.Global */ || !startLocationScript || !endLocation ||
        !startLocationScript.sourceMapURL) {
        return scope.object();
    }
    return new RemoteObject(scope);
};
/**
 * Wraps a debugger `Scope` but returns a scope object where variable names are
 * mapped to their authored name.
 *
 * This implementation does not utilize source map "Scopes" information but obtains
 * original variable names via parsing + mappings + names.
 */
class ScopeWithSourceMappedVariables {
    #debuggerScope;
    /** The resolved `this` of the current call frame */
    #thisObject;
    constructor(scope, thisObject) {
        this.#debuggerScope = scope;
        this.#thisObject = thisObject;
    }
    callFrame() {
        return this.#debuggerScope.callFrame();
    }
    type() {
        return this.#debuggerScope.type();
    }
    typeName() {
        return this.#debuggerScope.typeName();
    }
    name() {
        return this.#debuggerScope.name();
    }
    range() {
        return this.#debuggerScope.range();
    }
    object() {
        return resolveScopeInObject(this.#debuggerScope);
    }
    description() {
        return this.#debuggerScope.description();
    }
    icon() {
        return this.#debuggerScope.icon();
    }
    extraProperties() {
        const extraProperties = this.#debuggerScope.extraProperties();
        if (this.#thisObject && this.type() === "local" /* Protocol.Debugger.ScopeType.Local */) {
            extraProperties.unshift(new SDK.RemoteObject.RemoteObjectProperty('this', this.#thisObject, undefined, undefined, undefined, undefined, undefined, /* synthetic */ true));
        }
        return extraProperties;
    }
}
export class RemoteObject extends SDK.RemoteObject.RemoteObject {
    scope;
    object;
    constructor(scope) {
        super();
        this.scope = scope;
        this.object = scope.object();
    }
    customPreview() {
        return this.object.customPreview();
    }
    get objectId() {
        return this.object.objectId;
    }
    get type() {
        return this.object.type;
    }
    get subtype() {
        return this.object.subtype;
    }
    get value() {
        return this.object.value;
    }
    get description() {
        return this.object.description;
    }
    get hasChildren() {
        return this.object.hasChildren;
    }
    get preview() {
        return this.object.preview;
    }
    arrayLength() {
        return this.object.arrayLength();
    }
    getOwnProperties(generatePreview) {
        return this.object.getOwnProperties(generatePreview);
    }
    async getAllProperties(accessorPropertiesOnly, generatePreview) {
        const allProperties = await this.object.getAllProperties(accessorPropertiesOnly, generatePreview);
        const { variableMapping } = await resolveDebuggerScope(this.scope);
        const properties = allProperties.properties;
        const internalProperties = allProperties.internalProperties;
        const newProperties = properties?.map(property => {
            const name = variableMapping.get(property.name);
            return name !== undefined ? property.cloneWithNewName(name) : property;
        });
        return { properties: newProperties ?? [], internalProperties };
    }
    async setPropertyValue(argumentName, value) {
        const { variableMapping } = await resolveDebuggerScope(this.scope);
        let name;
        if (typeof argumentName === 'string') {
            name = argumentName;
        }
        else {
            name = argumentName.value;
        }
        let actualName = name;
        for (const compiledName of variableMapping.keys()) {
            if (variableMapping.get(compiledName) === name) {
                actualName = compiledName;
                break;
            }
        }
        return await this.object.setPropertyValue(actualName, value);
    }
    async deleteProperty(name) {
        return await this.object.deleteProperty(name);
    }
    callFunction(functionDeclaration, args) {
        return this.object.callFunction(functionDeclaration, args);
    }
    callFunctionJSON(functionDeclaration, args) {
        return this.object.callFunctionJSON(functionDeclaration, args);
    }
    release() {
        this.object.release();
    }
    debuggerModel() {
        return this.object.debuggerModel();
    }
    runtimeModel() {
        return this.object.runtimeModel();
    }
    isNode() {
        return this.object.isNode();
    }
}
/**
 * Resolve the frame's function name using the name associated with the opening
 * paren that starts the scope. If there is no name associated with the scope
 * start or if the function scope does not start with a left paren (e.g., arrow
 * function with one parameter), the resolution returns null.
 **/
async function getFunctionNameFromScopeStart(script, lineNumber, columnNumber) {
    // To reduce the overhead of resolving function names,
    // we check for source maps first and immediately leave
    // this function if the script doesn't have a sourcemap.
    const sourceMap = script.sourceMap();
    if (!sourceMap) {
        return null;
    }
    const scopeName = sourceMap.findOriginalFunctionName({ line: lineNumber, column: columnNumber });
    if (scopeName !== null) {
        return scopeName;
    }
    const mappingEntry = sourceMap.findEntry(lineNumber, columnNumber);
    if (!mappingEntry?.sourceURL) {
        return null;
    }
    const name = mappingEntry.name;
    if (!name) {
        return null;
    }
    const text = await getTextFor(script);
    if (!text) {
        return null;
    }
    const openRange = new TextUtils.TextRange.TextRange(lineNumber, columnNumber, lineNumber, columnNumber + 1);
    if (text.extract(openRange) !== '(') {
        return null;
    }
    return name;
}
export async function resolveDebuggerFrameFunctionName(frame) {
    const startLocation = frame.localScope()?.range()?.start;
    if (!startLocation) {
        return null;
    }
    return await getFunctionNameFromScopeStart(frame.script, startLocation.lineNumber, startLocation.columnNumber);
}
export async function resolveProfileFrameFunctionName({ scriptId, lineNumber, columnNumber }, target) {
    if (!target || lineNumber === undefined || columnNumber === undefined || scriptId === undefined) {
        return null;
    }
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    const script = debuggerModel?.scriptForId(String(scriptId));
    if (!debuggerModel || !script) {
        return null;
    }
    const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
    const location = new SDK.DebuggerModel.Location(debuggerModel, scriptId, lineNumber, columnNumber);
    const functionInfoFromPlugin = await debuggerWorkspaceBinding.pluginManager.getFunctionInfo(script, location);
    if (functionInfoFromPlugin && 'frames' in functionInfoFromPlugin) {
        const last = functionInfoFromPlugin.frames.at(-1);
        if (last?.name) {
            return last.name;
        }
    }
    return await getFunctionNameFromScopeStart(script, lineNumber, columnNumber);
}
let scopeResolvedForTest = function () { };
export const getScopeResolvedForTest = () => {
    return scopeResolvedForTest;
};
export const setScopeResolvedForTest = (scope) => {
    scopeResolvedForTest = scope;
};
//# sourceMappingURL=NamesResolver.js.map