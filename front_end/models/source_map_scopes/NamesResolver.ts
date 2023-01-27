// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../bindings/bindings.js';
import * as Formatter from '../formatter/formatter.js';
import * as TextUtils from '../text_utils/text_utils.js';
import type * as Workspace from '../workspace/workspace.js';
import * as Protocol from '../../generated/protocol.js';

interface CachedScopeMap {
  sourceMap: SDK.SourceMap.SourceMap|undefined;
  mappingPromise: Promise<{variableMapping: Map<string, string>, thisMapping: string|null}>;
}

const scopeToCachedIdentifiersMap = new WeakMap<SDK.DebuggerModel.ScopeChainEntry, CachedScopeMap>();
const cachedMapByCallFrame = new WeakMap<SDK.DebuggerModel.CallFrame, Map<string, string>>();
const cachedTextByDeferredContent = new WeakMap<TextUtils.ContentProvider.DeferredContent, TextUtils.Text.Text|null>();

async function getTextFor(contentProvider: TextUtils.ContentProvider.ContentProvider):
    Promise<TextUtils.Text.Text|null> {
  // We intentionally cache based on the DeferredContent object rather
  // than the ContentProvider object, which may appear as a more sensible
  // choice, since the content of both Script and UISourceCode objects
  // can change over time.
  const deferredContent = await contentProvider.requestContent();
  let text = cachedTextByDeferredContent.get(deferredContent);
  if (text === undefined) {
    const {content} = deferredContent;
    text = content ? new TextUtils.Text.Text(content) : null;
    cachedTextByDeferredContent.set(deferredContent, text);
  }
  return text;
}

export class IdentifierPositions {
  name: string;
  positions: {lineNumber: number, columnNumber: number}[];

  constructor(name: string, positions: {lineNumber: number, columnNumber: number}[] = []) {
    this.name = name;
    this.positions = positions;
  }

  addPosition(lineNumber: number, columnNumber: number): void {
    this.positions.push({lineNumber, columnNumber});
  }
}

const tryParseScope = async function(scopeText: string): Promise<{
  prefixLength: number, scopeTree: Formatter.FormatterWorkerPool.ScopeTreeNode,
}|null> {
  const prefixSuffixToTry = [
    // We wrap the scope in a class constructor. This handles the case where the
    // scope is a (non-arrow) function and the case where it is a constructor
    // (so that parsing 'super' calls succeeds).
    {prefix: 'class DummyClass extends DummyBase { constructor', suffix: '}'},
    // Next, we try async generator, this handles functions with yield or await keywords.
    {prefix: 'async function* __DEVTOOLS_DUMMY__', suffix: ''},
    // Finally, try parse as an async arrow function.
    {prefix: 'async ', suffix: ''},
  ];
  for (const {prefix, suffix} of prefixSuffixToTry) {
    const scopeTree =
        await Formatter.FormatterWorkerPool.formatterWorkerPool().javaScriptScopeTree(prefix + scopeText + suffix);
    if (scopeTree) {
      return {prefixLength: prefix.length, scopeTree};
    }
  }
  return null;
};

const computeScopeTree = async function(functionScope: SDK.DebuggerModel.ScopeChainEntry): Promise<{
  scopeTree: Formatter.FormatterWorkerPool.ScopeTreeNode, text: TextUtils.Text.Text, slide: number,
}|null> {
  const functionStartLocation = functionScope.startLocation();
  const functionEndLocation = functionScope.endLocation();
  if (!functionStartLocation || !functionEndLocation) {
    return null;
  }
  const script = functionStartLocation.script();
  if (!script || !script.sourceMapURL || script !== functionEndLocation.script()) {
    return null;
  }
  const text = await getTextFor(script);
  if (!text) {
    return null;
  }
  const scopeRange = new TextUtils.TextRange.TextRange(
      functionStartLocation.lineNumber, functionStartLocation.columnNumber, functionEndLocation.lineNumber,
      functionEndLocation.columnNumber);
  const scopeText = text.extract(scopeRange);
  const scopeStart = text.toSourceRange(scopeRange).offset;
  const prefixLengthAndscopeTree = await tryParseScope(scopeText);
  if (!prefixLengthAndscopeTree) {
    return null;
  }
  const {prefixLength, scopeTree} = prefixLengthAndscopeTree;
  return {scopeTree, text, slide: scopeStart - prefixLength};
};

export const scopeIdentifiers = async function(
    functionScope: SDK.DebuggerModel.ScopeChainEntry|null, scope: SDK.DebuggerModel.ScopeChainEntry): Promise<{
  freeVariables: IdentifierPositions[], boundVariables: IdentifierPositions[],
}|null> {
  if (!functionScope) {
    return null;
  }

  const startLocation = scope.startLocation();
  const endLocation = scope.endLocation();
  if (!startLocation || !endLocation) {
    return null;
  }

  // Parse the function scope to get the scope tree.
  const scopeTreeAndStart = await computeScopeTree(functionScope);
  if (!scopeTreeAndStart) {
    return null;
  }
  const {scopeTree, text, slide} = scopeTreeAndStart;

  // Compute the offset within the scope tree coordinate space.
  const scopeOffsets = {
    start: text.offsetFromPosition(startLocation.lineNumber, startLocation.columnNumber) - slide,
    end: text.offsetFromPosition(endLocation.lineNumber, endLocation.columnNumber) - slide,
  };

  if (!contains(scopeTree, scopeOffsets)) {
    return null;
  }

  // Find the corresponding scope in the scope tree.
  let containingScope = scopeTree;
  const ancestorScopes = [];
  while (true) {
    let childFound = false;
    for (const child of containingScope.children) {
      if (contains(child, scopeOffsets)) {
        // We found a nested containing scope, continue with search there.
        ancestorScopes.push(containingScope);
        containingScope = child;
        childFound = true;
        break;
      }
      // Sanity check: |scope| should not straddle any of the scopes in the tree. That is:
      // Either |scope| is disjoint from |child| or |child| must be inside |scope|.
      // (Or the |scope| is inside |child|, but that case is covered above.)
      if (!disjoint(scopeOffsets, child) && !contains(scopeOffsets, child)) {
        console.error('Wrong nesting of scopes');
        return null;
      }
    }
    if (!childFound) {
      // We found the deepest scope in the tree that contains our scope chain entry.
      break;
    }
  }

  // Now we have containing scope. Collect all the scope variables.
  const boundVariables = [];
  const cursor = new TextUtils.TextCursor.TextCursor(text.lineEndings());
  for (const variable of containingScope.variables) {
    // Skip the fixed-kind variable (i.e., 'this' or 'arguments') if we only found their "definition"
    // without any uses.
    if (variable.kind === Formatter.FormatterWorkerPool.DefinitionKind.Fixed && variable.offsets.length <= 1) {
      continue;
    }

    const identifier = new IdentifierPositions(variable.name);
    for (const offset of variable.offsets) {
      const start = offset + slide;
      cursor.resetTo(start);
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
        if (offset >= containingScope.start && offset < containingScope.end) {
          if (!identifier) {
            identifier = new IdentifierPositions(ancestorVariable.name);
          }
          const start = offset + slide;
          cursor.resetTo(start);
          identifier.addPosition(cursor.lineNumber(), cursor.columnNumber());
        }
      }
      if (identifier) {
        freeVariables.push(identifier);
      }
    }
  }
  return {boundVariables, freeVariables};

  function contains(scope: {start: number, end: number}, candidate: {start: number, end: number}): boolean {
    return (scope.start <= candidate.start) && (scope.end >= candidate.end);
  }
  function disjoint(scope: {start: number, end: number}, other: {start: number, end: number}): boolean {
    return (scope.end <= other.start) || (other.end <= scope.start);
  }
};

const identifierAndPunctuationRegExp = /^\s*([A-Za-z_$][A-Za-z_$0-9]*)\s*([.;,=]?)\s*$/;

const enum Punctuation {
  None = 'none',
  Comma = 'comma',
  Dot = 'dot',
  Semicolon = 'semicolon',
  Equals = 'equals',
}

const resolveScope =
    async(scope: SDK.DebuggerModel
              .ScopeChainEntry): Promise<{variableMapping: Map<string, string>, thisMapping: string | null}> => {
  let cachedScopeMap = scopeToCachedIdentifiersMap.get(scope);
  const script = scope.callFrame().script;
  const sourceMap = script.debuggerModel.sourceMapManager().sourceMapForClient(script);

  if (!cachedScopeMap || cachedScopeMap.sourceMap !== sourceMap) {
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const identifiersPromise =
        (async(): Promise<{variableMapping: Map<string, string>, thisMapping: string | null}> => {
          const variableMapping = new Map<string, string>();
          let thisMapping = null;

          if (!sourceMap) {
            return {variableMapping, thisMapping};
          }
          // Extract as much as possible from SourceMap and resolve
          // missing identifier names from SourceMap ranges.
          const promises: Promise<void>[] = [];

          const resolveEntry = (id: IdentifierPositions, handler: (sourceName: string) => void): void => {
            // First see if we have a source map entry with a name for the identifier.
            for (const position of id.positions) {
              const entry = sourceMap.findEntry(position.lineNumber, position.columnNumber);
              if (entry && entry.name) {
                handler(entry.name);
                return;
              }
            }
            // If there is no entry with the name field, try to infer the name from the source positions.
            async function resolvePosition(): Promise<void> {
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

          const functionScope = findFunctionScope();
          const parsedVariables = await scopeIdentifiers(functionScope, scope);
          if (!parsedVariables) {
            return {variableMapping, thisMapping};
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
          return {variableMapping, thisMapping};
        })();
    cachedScopeMap = {sourceMap, mappingPromise: identifiersPromise};
    scopeToCachedIdentifiersMap.set(scope, {sourceMap, mappingPromise: identifiersPromise});
  }
  return await cachedScopeMap.mappingPromise;

  async function resolveSourceName(
      script: SDK.Script.Script, sourceMap: SDK.SourceMap.SourceMap, name: string,
      position: {lineNumber: number, columnNumber: number}): Promise<string|null> {
    const ranges = sourceMap.findEntryRanges(position.lineNumber, position.columnNumber);
    if (!ranges) {
      return null;
    }
    // Extract the underlying text from the compiled code's range and make sure that
    // it starts with the identifier |name|.
    const uiSourceCode =
        Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().uiSourceCodeForSourceMapSourceURL(
            script.debuggerModel, ranges.sourceURL, script.isContentScript());
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
    const {name: compiledName, punctuation: compiledPunctuation} = parsedCompiledToken;
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
    const {name: sourceName, punctuation: sourcePunctuation} = parsedSourceToken;
    // Accept the source name if it is followed by the same punctuation.
    if (compiledPunctuation === sourcePunctuation) {
      return sourceName;
    }
    // Let us also allow semicolons into commas since that it is a common transformation.
    if (compiledPunctuation === Punctuation.Comma && sourcePunctuation === Punctuation.Semicolon) {
      return sourceName;
    }

    return null;

    function extractIdentifier(token: string): {name: string, punctuation: Punctuation}|null {
      const match = token.match(identifierAndPunctuationRegExp);
      if (!match) {
        return null;
      }

      const name = match[1];
      let punctuation: Punctuation|null = null;
      switch (match[2]) {
        case '.':
          punctuation = Punctuation.Dot;
          break;
        case ',':
          punctuation = Punctuation.Comma;
          break;
        case ';':
          punctuation = Punctuation.Semicolon;
          break;
        case '=':
          punctuation = Punctuation.Equals;
          break;
        case '':
          punctuation = Punctuation.None;
          break;
        default:
          console.error(`Name token parsing error: unexpected token "${match[2]}"`);
          return null;
      }

      return {name, punctuation};
    }
  }

  function findFunctionScope(): SDK.DebuggerModel.ScopeChainEntry|null {
    // First find the scope in the callframe's scope chain and then find the containing function scope (closure or local).
    const scopeChain = scope.callFrame().scopeChain();
    let scopeIndex = 0;
    for (scopeIndex; scopeIndex < scopeChain.length; scopeIndex++) {
      if (scopeChain[scopeIndex] === scope) {
        break;
      }
    }
    for (scopeIndex; scopeIndex < scopeChain.length; scopeIndex++) {
      const kind = scopeChain[scopeIndex].type();
      if (kind === Protocol.Debugger.ScopeType.Local || kind === Protocol.Debugger.ScopeType.Closure) {
        break;
      }
    }
    return scopeIndex === scopeChain.length ? null : scopeChain[scopeIndex];
  }
};

export const resolveScopeChain =
    async function(callFrame: SDK.DebuggerModel.CallFrame|null): Promise<SDK.DebuggerModel.ScopeChainEntry[]|null> {
  if (!callFrame) {
    return null;
  }
  const {pluginManager} = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
  if (pluginManager) {
    const scopeChain = await pluginManager.resolveScopeChain(callFrame);
    if (scopeChain) {
      return scopeChain;
    }
  }
  return callFrame.scopeChain();
};

export const allVariablesInCallFrame = async(callFrame: SDK.DebuggerModel.CallFrame): Promise<Map<string, string>> => {
  const cachedMap = cachedMapByCallFrame.get(callFrame);
  if (cachedMap) {
    return cachedMap;
  }

  const scopeChain = callFrame.scopeChain();
  const nameMappings = await Promise.all(scopeChain.map(resolveScope));
  const reverseMapping = new Map<string, string>();
  for (const {variableMapping} of nameMappings) {
    for (const [compiledName, originalName] of variableMapping) {
      if (originalName && !reverseMapping.has(originalName)) {
        reverseMapping.set(originalName, compiledName);
      }
    }
  }
  cachedMapByCallFrame.set(callFrame, reverseMapping);
  return reverseMapping;
};

export const resolveExpression = async(
    callFrame: SDK.DebuggerModel.CallFrame, originalText: string, uiSourceCode: Workspace.UISourceCode.UISourceCode,
    lineNumber: number, startColumnNumber: number, endColumnNumber: number): Promise<string> => {
  if (uiSourceCode.mimeType() === 'application/wasm') {
    // For WebAssembly disassembly, lookup the different possiblities.
    return `memories["${originalText}"] ?? locals["${originalText}"] ?? tables["${originalText}"] ?? functions["${
        originalText}"] ?? globals["${originalText}"]`;
  }
  if (!uiSourceCode.contentType().isFromSourceMap()) {
    return '';
  }
  const reverseMapping = await allVariablesInCallFrame(callFrame);
  if (reverseMapping.has(originalText)) {
    return reverseMapping.get(originalText) as string;
  }
  const rawLocations =
      await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().uiLocationToRawLocations(
          uiSourceCode, lineNumber, startColumnNumber);
  const rawLocation = rawLocations.find(location => location.debuggerModel === callFrame.debuggerModel);
  if (!rawLocation) {
    return '';
  }
  const script = rawLocation.script();
  if (!script) {
    return '';
  }
  const sourceMap = script.debuggerModel.sourceMapManager().sourceMapForClient(script);
  if (!sourceMap) {
    return '';
  }
  const text = await getTextFor(script);
  if (!text) {
    return '';
  }
  const textRanges = sourceMap.reverseMapTextRanges(
      uiSourceCode.url(),
      new TextUtils.TextRange.TextRange(lineNumber, startColumnNumber, lineNumber, endColumnNumber));
  if (textRanges.length !== 1) {
    return '';
  }
  const subjectText = text.extract(textRanges[0]);
  if (!subjectText) {
    return '';
  }
  return await Formatter.FormatterWorkerPool.formatterWorkerPool().evaluatableJavaScriptSubstring(subjectText);
};

export const resolveThisObject =
    async(callFrame: SDK.DebuggerModel.CallFrame|null): Promise<SDK.RemoteObject.RemoteObject|null> => {
  if (!callFrame) {
    return null;
  }
  const scopeChain = callFrame.scopeChain();
  if (scopeChain.length === 0) {
    return callFrame.thisObject();
  }

  const {thisMapping} = await resolveScope(scopeChain[0]);
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
  } as SDK.RuntimeModel.EvaluationOptions));
  if ('exceptionDetails' in result) {
    return !result.exceptionDetails && result.object ? result.object : callFrame.thisObject();
  }
  return null;
};

export const resolveScopeInObject = function(scope: SDK.DebuggerModel.ScopeChainEntry): SDK.RemoteObject.RemoteObject {
  const startLocation = scope.startLocation();
  const endLocation = scope.endLocation();
  const startLocationScript = startLocation ? startLocation.script() : null;

  if (scope.type() === Protocol.Debugger.ScopeType.Global || !startLocationScript || !endLocation ||
      !startLocationScript.sourceMapURL || startLocationScript !== endLocation.script()) {
    return scope.object();
  }

  return new RemoteObject(scope);
};

export class RemoteObject extends SDK.RemoteObject.RemoteObject {
  private readonly scope: SDK.DebuggerModel.ScopeChainEntry;
  private readonly object: SDK.RemoteObject.RemoteObject;
  constructor(scope: SDK.DebuggerModel.ScopeChainEntry) {
    super();
    this.scope = scope;
    this.object = scope.object();
  }

  customPreview(): Protocol.Runtime.CustomPreview|null {
    return this.object.customPreview();
  }

  get objectId(): Protocol.Runtime.RemoteObjectId|undefined {
    return this.object.objectId;
  }

  get type(): string {
    return this.object.type;
  }

  get subtype(): string|undefined {
    return this.object.subtype;
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get value(): any {
    return this.object.value;
  }

  get description(): string|undefined {
    return this.object.description;
  }

  get hasChildren(): boolean {
    return this.object.hasChildren;
  }

  get preview(): Protocol.Runtime.ObjectPreview|undefined {
    return this.object.preview;
  }

  arrayLength(): number {
    return this.object.arrayLength();
  }

  getOwnProperties(generatePreview: boolean): Promise<SDK.RemoteObject.GetPropertiesResult> {
    return this.object.getOwnProperties(generatePreview);
  }

  async getAllProperties(accessorPropertiesOnly: boolean, generatePreview: boolean):
      Promise<SDK.RemoteObject.GetPropertiesResult> {
    const allProperties = await this.object.getAllProperties(accessorPropertiesOnly, generatePreview);
    const {variableMapping} = await resolveScope(this.scope);

    const properties = allProperties.properties;
    const internalProperties = allProperties.internalProperties;
    const newProperties = [];
    if (properties) {
      for (let i = 0; i < properties.length; ++i) {
        const property = properties[i];
        const name = variableMapping.get(property.name) || properties[i].name;
        if (!property.value) {
          continue;
        }
        newProperties.push(new SDK.RemoteObject.RemoteObjectProperty(
            name, property.value, property.enumerable, property.writable, property.isOwn, property.wasThrown,
            property.symbol, property.synthetic));
      }
    }
    return {properties: newProperties, internalProperties: internalProperties};
  }

  async setPropertyValue(argumentName: string|Protocol.Runtime.CallArgument, value: string): Promise<string|undefined> {
    const {variableMapping} = await resolveScope(this.scope);

    let name;
    if (typeof argumentName === 'string') {
      name = argumentName;
    } else {
      name = (argumentName.value as string);
    }

    let actualName: string = name;
    for (const compiledName of variableMapping.keys()) {
      if (variableMapping.get(compiledName) === name) {
        actualName = compiledName;
        break;
      }
    }
    return this.object.setPropertyValue(actualName, value);
  }

  async deleteProperty(name: Protocol.Runtime.CallArgument): Promise<string|undefined> {
    return this.object.deleteProperty(name);
  }

  callFunction<T>(functionDeclaration: (this: Object, ...arg1: unknown[]) => T, args?: Protocol.Runtime.CallArgument[]):
      Promise<SDK.RemoteObject.CallFunctionResult> {
    return this.object.callFunction(functionDeclaration, args);
  }

  callFunctionJSON<T>(
      functionDeclaration: (this: Object, ...arg1: unknown[]) => T,
      args?: Protocol.Runtime.CallArgument[]): Promise<T> {
    return this.object.callFunctionJSON(functionDeclaration, args);
  }

  release(): void {
    this.object.release();
  }

  debuggerModel(): SDK.DebuggerModel.DebuggerModel {
    return this.object.debuggerModel();
  }

  runtimeModel(): SDK.RuntimeModel.RuntimeModel {
    return this.object.runtimeModel();
  }

  isNode(): boolean {
    return this.object.isNode();
  }
}

// Resolve the frame's function name using the name associated with the opening
// paren that starts the scope. If there is no name associated with the scope
// start or if the function scope does not start with a left paren (e.g., arrow
// function with one parameter), the resolution returns null.
async function getFunctionNameFromScopeStart(
    script: SDK.Script.Script, lineNumber: number, columnNumber: number): Promise<string|null> {
  // To reduce the overhead of resolving function names,
  // we check for source maps first and immediately leave
  // this function if the script doesn't have a sourcemap.
  const sourceMap = script.debuggerModel.sourceMapManager().sourceMapForClient(script);
  if (!sourceMap) {
    return null;
  }

  const name = sourceMap.findEntry(lineNumber, columnNumber)?.name;
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

export async function resolveDebuggerFrameFunctionName(frame: SDK.DebuggerModel.CallFrame): Promise<string|null> {
  const startLocation = frame.localScope()?.startLocation();
  if (!startLocation) {
    return null;
  }
  return await getFunctionNameFromScopeStart(frame.script, startLocation.lineNumber, startLocation.columnNumber);
}

export async function resolveProfileFrameFunctionName(
    {scriptId, lineNumber, columnNumber}: Partial<Protocol.Runtime.CallFrame>,
    target: SDK.Target.Target|null): Promise<string|null> {
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
  const functionInfoFromPlugin = await debuggerWorkspaceBinding.pluginManager?.getFunctionInfo(script, location);
  if (functionInfoFromPlugin && 'frames' in functionInfoFromPlugin) {
    const last = functionInfoFromPlugin.frames.at(-1);
    if (last?.name) {
      return last.name;
    }
  }
  return await getFunctionNameFromScopeStart(script, lineNumber, columnNumber);
}

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
// eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-explicit-any
let _scopeResolvedForTest: (...arg0: any[]) => void = function(): void {};

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
// eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-explicit-any
export const getScopeResolvedForTest = (): (...arg0: any[]) => void => {
  return _scopeResolvedForTest;
};

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
// eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-explicit-any
export const setScopeResolvedForTest = (scope: (...arg0: any[]) => void): void => {
  _scopeResolvedForTest = scope;
};
