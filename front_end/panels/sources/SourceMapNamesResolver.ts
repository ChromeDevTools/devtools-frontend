// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Formatter from '../../models/formatter/formatter.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import type * as Workspace from '../../models/workspace/workspace.js';
import * as Protocol from '../../generated/protocol.js';

interface CachedScopeMap {
  sourceMap: SDK.SourceMap.SourceMap|null;
  identifiersPromise: Promise<Map<string, string>>;
}

const scopeToCachedIdentifiersMap = new WeakMap<SDK.DebuggerModel.ScopeChainEntry, CachedScopeMap>();
const cachedMapByCallFrame = new WeakMap<SDK.DebuggerModel.CallFrame, Map<string, string>>();

export class Identifier {
  name: string;
  lineNumber: number;
  columnNumber: number;
  constructor(name: string, lineNumber: number, columnNumber: number) {
    this.name = name;
    this.lineNumber = lineNumber;
    this.columnNumber = columnNumber;
  }
}

export const scopeIdentifiers = async function(scope: SDK.DebuggerModel.ScopeChainEntry): Promise<Identifier[]> {
  if (scope.type() === Protocol.Debugger.ScopeType.Global) {
    return [];
  }
  const startLocation = scope.startLocation();
  const endLocation = scope.endLocation();
  if (!startLocation || !endLocation) {
    return [];
  }
  const script = startLocation.script();
  if (!script || !script.sourceMapURL || script !== endLocation.script()) {
    return [];
  }
  const {content} = await script.requestContent();
  if (!content) {
    return [];
  }

  const text = new TextUtils.Text.Text(content);
  const scopeRange = new TextUtils.TextRange.TextRange(
      startLocation.lineNumber, startLocation.columnNumber, endLocation.lineNumber, endLocation.columnNumber);
  const scopeText = text.extract(scopeRange);
  const scopeStart = text.toSourceRange(scopeRange).offset;
  const prefix = 'function fui';
  const identifiers =
      await Formatter.FormatterWorkerPool.formatterWorkerPool().javaScriptIdentifiers(prefix + scopeText);
  const result = [];
  const cursor = new TextUtils.TextCursor.TextCursor(text.lineEndings());
  for (const id of identifiers) {
    if (id.offset < prefix.length) {
      continue;
    }
    const start = scopeStart + id.offset - prefix.length;
    cursor.resetTo(start);
    result.push(new Identifier(id.name, cursor.lineNumber(), cursor.columnNumber()));
  }
  return result;
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

export const resolveScope = async(scope: SDK.DebuggerModel.ScopeChainEntry): Promise<Map<string, string>> => {
  let cachedScopeMap = scopeToCachedIdentifiersMap.get(scope);
  const script = scope.callFrame().script;
  const sourceMap = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().sourceMapForScript(script);

  if (!cachedScopeMap || cachedScopeMap.sourceMap !== sourceMap) {
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const identifiersPromise = (async(): Promise<Map<any, any>> => {
      const namesMapping = new Map<string, string>();
      if (sourceMap) {
        const textCache = new Map<string, TextUtils.Text.Text>();
        // Extract as much as possible from SourceMap and resolve
        // missing identifier names from SourceMap ranges.
        const promises = [];
        for (const id of await scopeIdentifiers(scope)) {
          const entry = sourceMap.findEntry(id.lineNumber, id.columnNumber);
          if (entry && entry.name) {
            namesMapping.set(id.name, entry.name);
          } else {
            promises.push(resolveSourceName(script, sourceMap, id, textCache).then(sourceName => {
              if (sourceName) {
                namesMapping.set(id.name, sourceName);
              }
            }));
          }
        }
        await Promise.all(promises).then(getScopeResolvedForTest());
      }
      return namesMapping;
    })();
    cachedScopeMap = {sourceMap, identifiersPromise};
    scopeToCachedIdentifiersMap.set(scope, {sourceMap, identifiersPromise});
  }
  return await cachedScopeMap.identifiersPromise;

  async function resolveSourceName(
      script: SDK.Script.Script, sourceMap: SDK.SourceMap.SourceMap, id: Identifier,
      textCache: Map<string, TextUtils.Text.Text>): Promise<string|null> {
    const startEntry = sourceMap.findEntry(id.lineNumber, id.columnNumber);
    const endEntry = sourceMap.findEntry(id.lineNumber, id.columnNumber + id.name.length);
    if (!startEntry || !endEntry || !startEntry.sourceURL || startEntry.sourceURL !== endEntry.sourceURL ||
        !startEntry.sourceLineNumber || !startEntry.sourceColumnNumber || !endEntry.sourceLineNumber ||
        !endEntry.sourceColumnNumber) {
      return null;
    }
    const sourceTextRange = new TextUtils.TextRange.TextRange(
        startEntry.sourceLineNumber, startEntry.sourceColumnNumber, endEntry.sourceLineNumber,
        endEntry.sourceColumnNumber);
    const uiSourceCode =
        Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().uiSourceCodeForSourceMapSourceURL(
            script.debuggerModel, startEntry.sourceURL, script.isContentScript());
    if (!uiSourceCode) {
      return null;
    }
    const {content} = await uiSourceCode.requestContent();
    if (!content) {
      return null;
    }
    let text = textCache.get(content);
    if (!text) {
      text = new TextUtils.Text.Text(content);
      textCache.set(content, text);
    }
    const originalIdentifier = text.extract(sourceTextRange).trim();
    return /[a-zA-Z0-9_$]+/.test(originalIdentifier) ? originalIdentifier : null;
  }
};

export const allVariablesInCallFrame = async(callFrame: SDK.DebuggerModel.CallFrame): Promise<Map<string, string>> => {
  const cachedMap = cachedMapByCallFrame.get(callFrame);
  if (cachedMap) {
    return cachedMap;
  }

  const scopeChain = callFrame.scopeChain();
  const nameMappings = await Promise.all(scopeChain.map(resolveScope));
  const reverseMapping = new Map<string, string>();
  for (const map of nameMappings) {
    for (const [compiledName, originalName] of map) {
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
  const sourceMap =
      (Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().sourceMapForScript(script) as
       SDK.SourceMap.TextSourceMap);
  if (!sourceMap) {
    return '';
  }
  const {content} = await script.requestContent();
  if (!content) {
    return '';
  }
  const text = new TextUtils.Text.Text(content);
  const textRange = sourceMap.reverseMapTextRange(
      uiSourceCode.url(),
      new TextUtils.TextRange.TextRange(lineNumber, startColumnNumber, lineNumber, endColumnNumber));
  if (!textRange) {
    return '';
  }
  const subjectText = text.extract(textRange);
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

  const namesMapping = await resolveScope(scopeChain[0]);
  const thisMappings = Platform.MapUtilities.inverse(namesMapping).get('this');
  if (!thisMappings || thisMappings.size !== 1) {
    return callFrame.thisObject();
  }

  const [expression] = thisMappings.values();
  const result = await callFrame.evaluate(({
    expression,
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
    const namesMapping = await resolveScope(this.scope);

    const properties = allProperties.properties;
    const internalProperties = allProperties.internalProperties;
    const newProperties = [];
    if (properties) {
      for (let i = 0; i < properties.length; ++i) {
        const property = properties[i];
        const name = namesMapping.get(property.name) || properties[i].name;
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
    const namesMapping = await resolveScope(this.scope);

    let name;
    if (typeof argumentName === 'string') {
      name = argumentName;
    } else {
      name = (argumentName.value as string);
    }

    let actualName: string = name;
    for (const compiledName of namesMapping.keys()) {
      if (namesMapping.get(compiledName) === name) {
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
