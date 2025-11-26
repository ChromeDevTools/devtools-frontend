var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/models/source_map_scopes/FunctionCodeResolver.js
var FunctionCodeResolver_exports = {};
__export(FunctionCodeResolver_exports, {
  getFunctionCodeFromLocation: () => getFunctionCodeFromLocation,
  getFunctionCodeFromRawLocation: () => getFunctionCodeFromRawLocation
});
import * as SDK from "./../../core/sdk/sdk.js";
import * as Bindings from "./../bindings/bindings.js";
import * as Formatter from "./../formatter/formatter.js";
import * as TextUtils from "./../text_utils/text_utils.js";
import * as Workspace from "./../workspace/workspace.js";
var inputCache = /* @__PURE__ */ new WeakMap();
async function prepareInput(uiSourceCode, content) {
  const formattedContent = await format(uiSourceCode, content);
  const text = new TextUtils.Text.Text(formattedContent ? formattedContent.formattedContent : content);
  let performanceData = uiSourceCode.getDecorationData(
    "performance"
    /* Workspace.UISourceCode.DecoratorType.PERFORMANCE */
  );
  if (formattedContent && performanceData) {
    performanceData = Workspace.UISourceCode.createMappedProfileData(performanceData, (line, column) => {
      return formattedContent.formattedMapping.originalToFormatted(line, column);
    });
  }
  return { text, formattedContent, performanceData };
}
async function prepareInputAndCache(uiSourceCode, content) {
  let cachedPromise = inputCache.get(uiSourceCode);
  if (cachedPromise) {
    return await cachedPromise;
  }
  cachedPromise = prepareInput(uiSourceCode, content);
  inputCache.set(uiSourceCode, cachedPromise);
  return await cachedPromise;
}
function extractPerformanceDataByLine(textRange, performanceData) {
  const { startLine, startColumn, endLine, endColumn } = textRange;
  const byLine = new Array(endLine - startLine + 1).fill(0);
  for (let line = startLine; line <= endLine; line++) {
    const lineData = performanceData.get(line + 1);
    if (!lineData) {
      continue;
    }
    if (line !== startLine && line !== endLine) {
      byLine[line - startLine] = lineData.values().reduce((acc, cur) => acc + cur);
      continue;
    }
    const column0 = line === startLine ? startColumn + 1 : 0;
    const column1 = line === endLine ? endColumn + 1 : Number.POSITIVE_INFINITY;
    let totalData = 0;
    for (const [column, data] of lineData) {
      if (column >= column0 && column <= column1) {
        totalData += data;
      }
    }
    byLine[line - startLine] = totalData;
  }
  return byLine.map((data) => Math.round(data * 10) / 10);
}
function createFunctionCode(inputData, functionBounds, options) {
  let { startLine, startColumn, endLine, endColumn } = functionBounds.range;
  if (inputData.formattedContent) {
    const startMapped = inputData.formattedContent.formattedMapping.originalToFormatted(startLine, startColumn);
    startLine = startMapped[0];
    startColumn = startMapped[1];
    const endMapped = inputData.formattedContent.formattedMapping.originalToFormatted(endLine, endColumn);
    endLine = endMapped[0];
    endColumn = endMapped[1];
  }
  const text = inputData.text;
  const content = text.value();
  const range = new TextUtils.TextRange.TextRange(startLine, startColumn, endLine, endColumn);
  const functionStartOffset = text.offsetFromPosition(startLine, startColumn);
  const functionEndOffset = text.offsetFromPosition(endLine, endColumn);
  let contextStartOffset = 0;
  if (options?.contextLength !== void 0) {
    const contextLength = options.contextLength;
    contextStartOffset = Math.max(contextStartOffset, functionStartOffset - contextLength);
  }
  if (options?.contextLineLength !== void 0) {
    const contextLineLength = options.contextLineLength;
    const position = text.offsetFromPosition(Math.max(startLine - contextLineLength, 0), 0);
    contextStartOffset = Math.max(contextStartOffset, position);
  }
  let contextEndOffset = content.length;
  if (options?.contextLength !== void 0) {
    const contextLength = options.contextLength;
    contextEndOffset = Math.min(contextEndOffset, functionEndOffset + contextLength);
  }
  if (options?.contextLineLength !== void 0) {
    const contextLineLength = options.contextLineLength;
    const position = text.offsetFromPosition(Math.min(endLine + contextLineLength, text.lineCount() - 1), Number.POSITIVE_INFINITY);
    contextEndOffset = Math.min(contextEndOffset, position);
  }
  const contextStart = text.positionFromOffset(contextStartOffset);
  const contextEnd = text.positionFromOffset(contextEndOffset);
  const rangeWithContext = new TextUtils.TextRange.TextRange(contextStart.lineNumber, contextStart.columnNumber, contextEnd.lineNumber, contextEnd.columnNumber);
  const code = content.substring(functionStartOffset, functionEndOffset);
  const before = content.substring(contextStartOffset, functionStartOffset);
  const after = content.substring(functionEndOffset, contextEndOffset);
  let codeWithContext;
  if (options?.appendProfileData && inputData.performanceData) {
    const performanceDataByLine = extractPerformanceDataByLine(range, inputData.performanceData);
    const lines = performanceDataByLine.map((data, i) => {
      let line = text.lineAt(startLine + i);
      const isLastLine = i === performanceDataByLine.length - 1;
      if (i === 0) {
        if (isLastLine) {
          line = line.substring(startColumn, endColumn);
        } else {
          line = line.substring(startColumn);
        }
      } else if (isLastLine) {
        line = line.substring(0, endColumn);
      }
      if (isLastLine) {
        data = 0;
      }
      return data ? `${line} // ${data} ms` : line;
    });
    const annotatedCode = lines.join("\n");
    codeWithContext = before + `<FUNCTION_START>${annotatedCode}<FUNCTION_END>` + after;
  } else {
    codeWithContext = before + `<FUNCTION_START>${code}<FUNCTION_END>` + after;
  }
  return {
    functionBounds,
    text,
    code,
    range,
    codeWithContext,
    rangeWithContext
  };
}
async function getFunctionCodeFromLocation(target, url, line, column, options) {
  const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
  if (!debuggerModel) {
    throw new Error("missing debugger model");
  }
  let uiSourceCode;
  const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
  const projects = debuggerWorkspaceBinding.workspace.projectsForType(Workspace.Workspace.projectTypes.Network);
  for (const project of projects) {
    uiSourceCode = project.uiSourceCodeForURL(url);
    if (uiSourceCode) {
      break;
    }
  }
  if (!uiSourceCode) {
    return null;
  }
  const rawLocations = await debuggerWorkspaceBinding.uiLocationToRawLocations(uiSourceCode, line, column);
  const rawLocation = rawLocations.at(-1);
  if (!rawLocation) {
    return null;
  }
  return await getFunctionCodeFromRawLocation(rawLocation, options);
}
async function format(uiSourceCode, content) {
  const contentType = uiSourceCode.contentType();
  const shouldFormat = !contentType.isFromSourceMap() && (contentType.isDocument() || contentType.isScript()) && TextUtils.TextUtils.isMinified(content);
  if (!shouldFormat) {
    return null;
  }
  return await Formatter.ScriptFormatter.formatScriptContent(contentType.canonicalMimeType(), content, "	");
}
async function getFunctionCodeFromRawLocation(rawLocation, options) {
  const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
  const functionBounds = await debuggerWorkspaceBinding.functionBoundsAtRawLocation(rawLocation);
  if (!functionBounds) {
    return null;
  }
  await functionBounds.uiSourceCode.requestContentData();
  const content = functionBounds.uiSourceCode.content();
  if (!content) {
    return null;
  }
  const inputData = await prepareInputAndCache(functionBounds.uiSourceCode, content);
  return createFunctionCode(inputData, functionBounds, options);
}

// gen/front_end/models/source_map_scopes/NamesResolver.js
var NamesResolver_exports = {};
__export(NamesResolver_exports, {
  IdentifierPositions: () => IdentifierPositions,
  RemoteObject: () => RemoteObject2,
  allVariablesAtPosition: () => allVariablesAtPosition,
  allVariablesInCallFrame: () => allVariablesInCallFrame,
  findScopeChainForDebuggerScope: () => findScopeChainForDebuggerScope,
  getScopeResolvedForTest: () => getScopeResolvedForTest,
  getTextFor: () => getTextFor,
  resolveDebuggerFrameFunctionName: () => resolveDebuggerFrameFunctionName,
  resolveProfileFrameFunctionName: () => resolveProfileFrameFunctionName,
  resolveScopeChain: () => resolveScopeChain,
  resolveScopeInObject: () => resolveScopeInObject,
  resolveThisObject: () => resolveThisObject,
  scopeIdentifiers: () => scopeIdentifiers,
  setScopeResolvedForTest: () => setScopeResolvedForTest
});
import * as Common from "./../../core/common/common.js";
import * as Root from "./../../core/root/root.js";
import * as SDK2 from "./../../core/sdk/sdk.js";
import * as Bindings2 from "./../bindings/bindings.js";
import * as Formatter2 from "./../formatter/formatter.js";
import * as TextUtils3 from "./../text_utils/text_utils.js";
var scopeToCachedIdentifiersMap = /* @__PURE__ */ new WeakMap();
var cachedMapByCallFrame = /* @__PURE__ */ new WeakMap();
async function getTextFor(contentProvider) {
  const contentData = await contentProvider.requestContentData();
  if (TextUtils3.ContentData.ContentData.isError(contentData) || !contentData.isTextContent) {
    return null;
  }
  return contentData.textObj;
}
var IdentifierPositions = class {
  name;
  positions;
  constructor(name, positions = []) {
    this.name = name;
    this.positions = positions;
  }
  addPosition(lineNumber, columnNumber) {
    this.positions.push({ lineNumber, columnNumber });
  }
};
var computeScopeTree = async function(script) {
  if (!script.sourceMapURL) {
    return null;
  }
  return await SDK2.ScopeTreeCache.scopeTreeForScript(script);
};
var findScopeChain = function(scopeTree, scopeNeedle) {
  if (!contains(scopeTree, scopeNeedle)) {
    return [];
  }
  let containingScope = scopeTree;
  const scopeChain = [scopeTree];
  while (true) {
    let childFound = false;
    for (const child of containingScope.children) {
      if (contains(child, scopeNeedle)) {
        scopeChain.push(child);
        containingScope = child;
        childFound = true;
        break;
      }
      if (!disjoint(scopeNeedle, child) && !contains(scopeNeedle, child)) {
        console.error("Wrong nesting of scopes");
        return [];
      }
    }
    if (!childFound) {
      break;
    }
  }
  return scopeChain;
  function contains(scope, candidate) {
    return scope.start <= candidate.start && scope.end >= candidate.end;
  }
  function disjoint(scope, other) {
    return scope.end <= other.start || other.end <= scope.start;
  }
};
async function findScopeChainForDebuggerScope(scope) {
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
  const scopeOffsets = {
    start: text.offsetFromPosition(startLocation.lineNumber, startLocation.columnNumber),
    end: text.offsetFromPosition(endLocation.lineNumber, endLocation.columnNumber)
  };
  return findScopeChain(scopeTree, scopeOffsets);
}
var scopeIdentifiers = async function(script, scope, ancestorScopes) {
  const text = await getTextFor(script);
  if (!text) {
    return null;
  }
  const boundVariables = [];
  const cursor = new TextUtils3.TextCursor.TextCursor(text.lineEndings());
  for (const variable of scope.variables) {
    if (variable.kind === 3 && variable.offsets.length <= 1) {
      continue;
    }
    const identifier = new IdentifierPositions(variable.name);
    for (const offset of variable.offsets) {
      cursor.resetTo(offset);
      identifier.addPosition(cursor.lineNumber(), cursor.columnNumber());
    }
    boundVariables.push(identifier);
  }
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
var identifierAndPunctuationRegExp = /^\s*([A-Za-z_$][A-Za-z_$0-9]*)\s*([.;,=]?)\s*$/;
var resolveDebuggerScope = async (scope) => {
  if (!Common.Settings.Settings.instance().moduleSetting("js-source-maps-enabled").get()) {
    return { variableMapping: /* @__PURE__ */ new Map(), thisMapping: null };
  }
  const script = scope.callFrame().script;
  const scopeChain = await findScopeChainForDebuggerScope(scope);
  return await resolveScope(script, scopeChain);
};
var resolveScope = async (script, scopeChain) => {
  const parsedScope = scopeChain[scopeChain.length - 1];
  if (!parsedScope) {
    return { variableMapping: /* @__PURE__ */ new Map(), thisMapping: null };
  }
  let cachedScopeMap = scopeToCachedIdentifiersMap.get(parsedScope);
  const sourceMap = script.sourceMap();
  if (!cachedScopeMap || cachedScopeMap.sourceMap !== sourceMap) {
    const identifiersPromise = (async () => {
      const variableMapping = /* @__PURE__ */ new Map();
      let thisMapping = null;
      if (!sourceMap) {
        return { variableMapping, thisMapping };
      }
      const promises = [];
      const resolveEntry = (id, handler) => {
        for (const position of id.positions) {
          const entry = sourceMap.findEntry(position.lineNumber, position.columnNumber);
          if (entry?.name) {
            handler(entry.name);
            return;
          }
        }
        async function resolvePosition() {
          if (!sourceMap) {
            return;
          }
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
        resolveEntry(id, (sourceName) => {
          if (sourceName !== "this") {
            variableMapping.set(id.name, sourceName);
          }
        });
      }
      for (const id of parsedVariables.freeVariables) {
        resolveEntry(id, (sourceName) => {
          if (sourceName === "this") {
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
  async function resolveSourceName(script2, sourceMap2, name, position) {
    const ranges = sourceMap2.findEntryRanges(position.lineNumber, position.columnNumber);
    if (!ranges) {
      return null;
    }
    const uiSourceCode = Bindings2.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().uiSourceCodeForSourceMapSourceURL(script2.debuggerModel, ranges.sourceURL, script2.isContentScript());
    if (!uiSourceCode) {
      return null;
    }
    const compiledText = await getTextFor(script2);
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
    if (compiledPunctuation === sourcePunctuation) {
      return sourceName;
    }
    if (compiledPunctuation === "comma" && sourcePunctuation === "semicolon") {
      return sourceName;
    }
    return null;
    function extractIdentifier(token) {
      const match = token.match(identifierAndPunctuationRegExp);
      if (!match) {
        return null;
      }
      const name2 = match[1];
      let punctuation = null;
      switch (match[2]) {
        case ".":
          punctuation = "dot";
          break;
        case ",":
          punctuation = "comma";
          break;
        case ";":
          punctuation = "semicolon";
          break;
        case "=":
          punctuation = "equals";
          break;
        case "":
          punctuation = "none";
          break;
        default:
          console.error(`Name token parsing error: unexpected token "${match[2]}"`);
          return null;
      }
      return { name: name2, punctuation };
    }
  }
};
var resolveScopeChain = async function(callFrame) {
  const { pluginManager } = Bindings2.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
  let scopeChain = await pluginManager.resolveScopeChain(callFrame);
  if (scopeChain) {
    return scopeChain;
  }
  scopeChain = Root.Runtime.experiments.isEnabled(
    "use-source-map-scopes"
    /* Root.Runtime.ExperimentName.USE_SOURCE_MAP_SCOPES */
  ) ? callFrame.script.sourceMap()?.resolveScopeChain(callFrame) : null;
  if (scopeChain) {
    return scopeChain;
  }
  if (callFrame.script.isWasm()) {
    return callFrame.scopeChain();
  }
  const thisObject = await resolveThisObject(callFrame);
  return callFrame.scopeChain().map((scope) => new ScopeWithSourceMappedVariables(scope, thisObject));
};
var allVariablesInCallFrame = async (callFrame) => {
  if (!Common.Settings.Settings.instance().moduleSetting("js-source-maps-enabled").get()) {
    return /* @__PURE__ */ new Map();
  }
  const cachedMap = cachedMapByCallFrame.get(callFrame);
  if (cachedMap) {
    return cachedMap;
  }
  const scopeChain = callFrame.scopeChain();
  const nameMappings = await Promise.all(scopeChain.map(resolveDebuggerScope));
  const reverseMapping = /* @__PURE__ */ new Map();
  const compiledNames = /* @__PURE__ */ new Set();
  for (const { variableMapping } of nameMappings) {
    for (const [compiledName, originalName] of variableMapping) {
      if (!originalName) {
        continue;
      }
      if (!reverseMapping.has(originalName)) {
        const compiledNameOrNull = compiledNames.has(compiledName) ? null : compiledName;
        reverseMapping.set(originalName, compiledNameOrNull);
      }
      compiledNames.add(compiledName);
    }
  }
  cachedMapByCallFrame.set(callFrame, reverseMapping);
  return reverseMapping;
};
var allVariablesAtPosition = async (location) => {
  const reverseMapping = /* @__PURE__ */ new Map();
  if (!Common.Settings.Settings.instance().moduleSetting("js-source-maps-enabled").get()) {
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
  const compiledNames = /* @__PURE__ */ new Set();
  while (scopeChain.length > 0) {
    const { variableMapping } = await resolveScope(script, scopeChain);
    for (const [compiledName, originalName] of variableMapping) {
      if (!originalName) {
        continue;
      }
      if (!reverseMapping.has(originalName)) {
        const compiledNameOrNull = compiledNames.has(compiledName) ? null : compiledName;
        reverseMapping.set(originalName, compiledNameOrNull);
      }
      compiledNames.add(compiledName);
    }
    scopeChain.pop();
  }
  return reverseMapping;
};
var resolveThisObject = async (callFrame) => {
  const scopeChain = callFrame.scopeChain();
  if (scopeChain.length === 0) {
    return callFrame.thisObject();
  }
  const { thisMapping } = await resolveDebuggerScope(scopeChain[0]);
  if (!thisMapping) {
    return callFrame.thisObject();
  }
  const result = await callFrame.evaluate({
    expression: thisMapping,
    objectGroup: "backtrace",
    includeCommandLineAPI: false,
    silent: true,
    returnByValue: false,
    generatePreview: true
  });
  if ("exceptionDetails" in result) {
    return !result.exceptionDetails && result.object ? result.object : callFrame.thisObject();
  }
  return null;
};
var resolveScopeInObject = function(scope) {
  const endLocation = scope.range()?.end;
  const startLocationScript = scope.range()?.start.script() ?? null;
  if (scope.type() === "global" || !startLocationScript || !endLocation || !startLocationScript.sourceMapURL) {
    return scope.object();
  }
  return new RemoteObject2(scope);
};
var ScopeWithSourceMappedVariables = class {
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
    if (this.#thisObject && this.type() === "local") {
      extraProperties.unshift(new SDK2.RemoteObject.RemoteObjectProperty(
        "this",
        this.#thisObject,
        void 0,
        void 0,
        void 0,
        void 0,
        void 0,
        /* synthetic */
        true
      ));
    }
    return extraProperties;
  }
};
var RemoteObject2 = class extends SDK2.RemoteObject.RemoteObject {
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
    const newProperties = properties?.map((property) => {
      const name = variableMapping.get(property.name);
      return name !== void 0 ? property.cloneWithNewName(name) : property;
    });
    return { properties: newProperties ?? [], internalProperties };
  }
  async setPropertyValue(argumentName, value) {
    const { variableMapping } = await resolveDebuggerScope(this.scope);
    let name;
    if (typeof argumentName === "string") {
      name = argumentName;
    } else {
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
};
async function getFunctionNameFromScopeStart(script, lineNumber, columnNumber) {
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
  const openRange = new TextUtils3.TextRange.TextRange(lineNumber, columnNumber, lineNumber, columnNumber + 1);
  if (text.extract(openRange) !== "(") {
    return null;
  }
  return name;
}
async function resolveDebuggerFrameFunctionName(frame) {
  const startLocation = frame.localScope()?.range()?.start;
  if (!startLocation) {
    return null;
  }
  return await getFunctionNameFromScopeStart(frame.script, startLocation.lineNumber, startLocation.columnNumber);
}
async function resolveProfileFrameFunctionName({ scriptId, lineNumber, columnNumber }, target) {
  if (!target || lineNumber === void 0 || columnNumber === void 0 || scriptId === void 0) {
    return null;
  }
  const debuggerModel = target.model(SDK2.DebuggerModel.DebuggerModel);
  const script = debuggerModel?.scriptForId(String(scriptId));
  if (!debuggerModel || !script) {
    return null;
  }
  const debuggerWorkspaceBinding = Bindings2.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
  const location = new SDK2.DebuggerModel.Location(debuggerModel, scriptId, lineNumber, columnNumber);
  const functionInfoFromPlugin = await debuggerWorkspaceBinding.pluginManager.getFunctionInfo(script, location);
  if (functionInfoFromPlugin && "frames" in functionInfoFromPlugin) {
    const last = functionInfoFromPlugin.frames.at(-1);
    if (last?.name) {
      return last.name;
    }
  }
  return await getFunctionNameFromScopeStart(script, lineNumber, columnNumber);
}
var scopeResolvedForTest = function() {
};
var getScopeResolvedForTest = () => {
  return scopeResolvedForTest;
};
var setScopeResolvedForTest = (scope) => {
  scopeResolvedForTest = scope;
};

// gen/front_end/models/source_map_scopes/ScopeChainModel.js
var ScopeChainModel_exports = {};
__export(ScopeChainModel_exports, {
  ScopeChain: () => ScopeChain,
  ScopeChainModel: () => ScopeChainModel
});
import * as Common2 from "./../../core/common/common.js";
import * as SDK3 from "./../../core/sdk/sdk.js";
var ScopeChainModel = class extends Common2.ObjectWrapper.ObjectWrapper {
  #callFrame;
  /** We use the `Throttler` here to make sure that `#boundUpdate` is not run multiple times simultanously */
  #throttler = new Common2.Throttler.Throttler(5);
  #boundUpdate = this.#update.bind(this);
  constructor(callFrame) {
    super();
    this.#callFrame = callFrame;
    this.#callFrame.debuggerModel.addEventListener(SDK3.DebuggerModel.Events.DebugInfoAttached, this.#debugInfoAttached, this);
    this.#callFrame.debuggerModel.sourceMapManager().addEventListener(SDK3.SourceMapManager.Events.SourceMapAttached, this.#sourceMapAttached, this);
    void this.#throttler.schedule(this.#boundUpdate);
  }
  dispose() {
    this.#callFrame.debuggerModel.removeEventListener(SDK3.DebuggerModel.Events.DebugInfoAttached, this.#debugInfoAttached, this);
    this.#callFrame.debuggerModel.sourceMapManager().removeEventListener(SDK3.SourceMapManager.Events.SourceMapAttached, this.#sourceMapAttached, this);
    this.listeners?.clear();
  }
  async #update() {
    const scopeChain = await resolveScopeChain(this.#callFrame);
    this.dispatchEventToListeners("ScopeChainUpdated", new ScopeChain(scopeChain));
  }
  #debugInfoAttached(event) {
    if (event.data === this.#callFrame.script) {
      void this.#throttler.schedule(this.#boundUpdate);
    }
  }
  #sourceMapAttached(event) {
    if (event.data.client === this.#callFrame.script) {
      void this.#throttler.schedule(this.#boundUpdate);
    }
  }
};
var ScopeChain = class {
  scopeChain;
  constructor(scopeChain) {
    this.scopeChain = scopeChain;
  }
};
export {
  FunctionCodeResolver_exports as FunctionCodeResolver,
  NamesResolver_exports as NamesResolver,
  ScopeChainModel_exports as ScopeChainModel
};
//# sourceMappingURL=source_map_scopes.js.map
