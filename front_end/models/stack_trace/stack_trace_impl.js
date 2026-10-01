var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../front_end/models/stack_trace/DetailedErrorStackParser.ts
var DetailedErrorStackParser_exports = {};
__export(DetailedErrorStackParser_exports, {
  augmentRawFramesWithScriptIds: () => augmentRawFramesWithScriptIds,
  concatErrorDescriptionAndIssueSummary: () => concatErrorDescriptionAndIssueSummary,
  parseMessage: () => parseMessage,
  parseRawFramesFromErrorStack: () => parseRawFramesFromErrorStack
});
import * as Common from "../../core/common/common.js";
var CALL_FRAME_REGEX = /^\s*at\s+/;
function parseRawFramesFromErrorStack(stack, resolveURL) {
  const lines = stack.split("\n");
  const firstAtLineIndex = findFramesStartLine(lines);
  const rawFrames = [];
  if (firstAtLineIndex === -1) {
    return rawFrames;
  }
  for (let i = firstAtLineIndex; i < lines.length; ++i) {
    const line = lines[i];
    const match = CALL_FRAME_REGEX.exec(line);
    if (!match) {
      if (line.trim() === "") {
        continue;
      }
      return null;
    }
    let lineContent = line.substring(match[0].length);
    let isAsync = false;
    if (lineContent.startsWith("async ")) {
      isAsync = true;
      lineContent = lineContent.substring(6);
    }
    let isConstructor = false;
    if (lineContent.startsWith("new ")) {
      isConstructor = true;
      lineContent = lineContent.substring(4);
    }
    let functionName = "";
    let url = "";
    let lineNumber = -1;
    let columnNumber = -1;
    let typeName;
    let methodName;
    let isEval = false;
    let isWasm = false;
    let wasmModuleName;
    let wasmFunctionIndex;
    let promiseIndex;
    let evalOrigin;
    const openParenIndex = lineContent.indexOf(" (");
    let location = "";
    if (lineContent.endsWith(")") && openParenIndex !== -1) {
      functionName = lineContent.substring(0, openParenIndex).trim();
      location = lineContent.substring(openParenIndex + 2, lineContent.length - 1);
    } else if (lineContent.startsWith("(") && lineContent.endsWith(")")) {
      location = lineContent.substring(1, lineContent.length - 1);
    } else {
      location = lineContent;
    }
    if (location.startsWith("eval at ")) {
      isEval = true;
      const commaIndex = location.lastIndexOf(", ");
      let evalOriginStr = location;
      if (commaIndex !== -1) {
        evalOriginStr = location.substring(0, commaIndex);
        location = location.substring(commaIndex + 2);
      } else {
        location = "";
      }
      if (evalOriginStr.startsWith("eval at ")) {
        evalOriginStr = evalOriginStr.substring(8);
      }
      const innerOpenParen = evalOriginStr.indexOf(" (");
      let evalFunctionName = evalOriginStr;
      let evalLocation = "";
      if (innerOpenParen !== -1) {
        evalFunctionName = evalOriginStr.substring(0, innerOpenParen).trim();
        evalLocation = evalOriginStr.substring(innerOpenParen + 2, evalOriginStr.length - 1);
        evalOrigin = parseRawFramesFromErrorStack(`    at ${evalFunctionName} (${evalLocation})`, resolveURL)?.[0];
      } else {
        evalOrigin = parseRawFramesFromErrorStack(`    at ${evalFunctionName}`, resolveURL)?.[0];
      }
    }
    if (location.startsWith("index ")) {
      promiseIndex = parseInt(location.substring(6), 10);
      url = "";
    } else if (location === "<anonymous>" || location === "native") {
      url = "";
    } else if (location.includes(":wasm-function[")) {
      isWasm = true;
      const wasmMatch = /^(.*):wasm-function\[(\d+)\]:(0x[0-9a-fA-F]+)$/.exec(location);
      if (wasmMatch) {
        url = wasmMatch[1];
        wasmFunctionIndex = parseInt(wasmMatch[2], 10);
        columnNumber = parseInt(wasmMatch[3], 16);
        lineNumber = 0;
      }
    } else if (location) {
      const splitResult = Common.ParsedURL.ParsedURL.splitLineAndColumn(location);
      lineNumber = splitResult.lineNumber ?? -1;
      columnNumber = splitResult.columnNumber ?? -1;
      if (resolveURL && splitResult.url !== "<anonymous>" && splitResult.url !== "native") {
        const resolved = resolveURL(splitResult.url);
        if (!resolved) {
          return null;
        }
        url = resolved;
      } else {
        url = splitResult.url;
      }
    }
    if (functionName) {
      const aliasMatch = /(.*)\s+\[as\s+(.*)\]/.exec(functionName);
      if (aliasMatch) {
        methodName = aliasMatch[2];
        functionName = aliasMatch[1];
      }
      const dotIndex = functionName.indexOf(".");
      if (dotIndex !== -1) {
        typeName = functionName.substring(0, dotIndex);
        methodName = methodName ?? functionName.substring(dotIndex + 1);
      }
      if (isWasm && typeName) {
        wasmModuleName = typeName;
      }
    }
    rawFrames.push({
      url,
      functionName,
      lineNumber,
      columnNumber,
      isWasm,
      parsedFrameInfo: {
        isAsync,
        isConstructor,
        isEval,
        evalOrigin,
        wasmModuleName,
        wasmFunctionIndex,
        typeName,
        methodName,
        promiseIndex
      }
    });
  }
  return rawFrames;
}
function findFramesStartLine(lines) {
  return lines.findIndex((line) => CALL_FRAME_REGEX.test(line));
}
function parseMessage(stack) {
  const lines = stack.split("\n");
  const firstAtLineIndex = findFramesStartLine(lines);
  if (firstAtLineIndex !== -1) {
    return lines.slice(0, firstAtLineIndex).join("\n");
  }
  return stack;
}
function augmentRawFramesWithScriptIds(rawFrames, protocolStackTrace) {
  function augmentFrame(rawFrame) {
    const protocolFrame = protocolStackTrace.callFrames.find((frame) => {
      return rawFrame.url === frame.url && rawFrame.lineNumber === frame.lineNumber && rawFrame.columnNumber === frame.columnNumber;
    });
    if (protocolFrame) {
      rawFrame.scriptId = protocolFrame.scriptId;
    }
    if (rawFrame.parsedFrameInfo?.evalOrigin) {
      augmentFrame(rawFrame.parsedFrameInfo.evalOrigin);
    }
  }
  for (const rawFrame of rawFrames) {
    augmentFrame(rawFrame);
  }
}
function concatErrorDescriptionAndIssueSummary(description, issueSummary) {
  const pos = description.indexOf("\n");
  const prefix = pos === -1 ? description : description.substring(0, pos);
  const suffix = pos === -1 ? "" : description.substring(pos);
  description = `${prefix}. ${issueSummary}${suffix}`;
  return description;
}

// ../../front_end/models/stack_trace/StackTraceImpl.ts
var StackTraceImpl_exports = {};
__export(StackTraceImpl_exports, {
  AsyncFragmentImpl: () => AsyncFragmentImpl,
  DebuggableFragmentImpl: () => DebuggableFragmentImpl,
  DebuggableFrameImpl: () => DebuggableFrameImpl,
  FragmentImpl: () => FragmentImpl,
  FrameImpl: () => FrameImpl,
  ParsedErrorStackFragmentImpl: () => ParsedErrorStackFragmentImpl,
  ParsedErrorStackFrameImpl: () => ParsedErrorStackFrameImpl,
  StackTraceImpl: () => StackTraceImpl,
  consolidate: () => consolidate
});
import * as Common2 from "../../core/common/common.js";

// ../../front_end/models/stack_trace/Trie.ts
var Trie_exports = {};
__export(Trie_exports, {
  EvalOrigin: () => EvalOrigin,
  FrameKind: () => FrameKind,
  FrameNode: () => FrameNode,
  Trie: () => Trie,
  compareRawFrames: () => compareRawFrames,
  isBuiltinFrame: () => isBuiltinFrame
});
function isBuiltinFrame(rawFrame) {
  return rawFrame.lineNumber === -1 && rawFrame.columnNumber === -1 && !Boolean(rawFrame.scriptId) && !Boolean(rawFrame.url);
}
var FrameKind = /* @__PURE__ */ ((FrameKind2) => {
  FrameKind2["VISIBLE"] = "VISIBLE";
  FrameKind2["OUTLINED"] = "OUTLINED";
  FrameKind2["HIDDEN"] = "HIDDEN";
  return FrameKind2;
})(FrameKind || {});
var EvalOrigin = class {
  frames;
  evalOrigin;
  constructor(frames, evalOrigin) {
    this.frames = frames;
    this.evalOrigin = evalOrigin;
  }
};
var FrameNode = class {
  parent;
  children = [];
  rawFrame;
  /** Context-free translation: [top, ...inlinedCallers]. Empty iff `kind === HIDDEN` (or not translated yet). */
  frames = [];
  kind = "VISIBLE" /* VISIBLE */;
  /** Set iff `kind` is OUTLINED, or VISIBLE and translated with scopes information. */
  functionKeys;
  /** True iff the translation shows generated code, i.e. no source map or plugin could map it (incl. builtins). */
  isUnmapped = false;
  /** False until a translation was stored. Stays false if translation threw, so it will be retried. */
  isTranslated = false;
  fragment;
  parsedFrameInfo;
  evalOrigin;
  constructor(rawFrame, parent) {
    this.rawFrame = rawFrame;
    this.parent = parent;
    this.parsedFrameInfo = rawFrame.parsedFrameInfo;
  }
  /**
   * Produces the ancestor chain. Including `this` but excluding the `RootFrameNode`.
   */
  *getCallStack() {
    for (let node = this; node.parent; node = node.parent) {
      yield node;
    }
  }
};
var Trie = class {
  #root = { parent: null, children: [] };
  /**
   * Most sources produce stack traces in "top-to-bottom" order, so that is what this method expects.
   *
   * @returns The {@link FrameNode} corresponding to the top-most stack frame.
   */
  insert(frames) {
    if (frames.length === 0) {
      throw new Error("Trie.insert called with an empty frames array.");
    }
    let currentNode = this.#root;
    for (let i = frames.length - 1; i >= 0; --i) {
      currentNode = this.#insert(currentNode, frames[i]);
    }
    return currentNode;
  }
  /**
   * Inserts `rawFrame` into the children of the provided node if not already there.
   *
   * @returns the child node corresponding to `rawFrame`.
   */
  #insert(node, rawFrame) {
    let i = 0;
    for (; i < node.children.length; ++i) {
      const maybeChild = node.children[i];
      const child = maybeChild instanceof WeakRef ? maybeChild.deref() : maybeChild;
      if (!child) {
        continue;
      }
      const compareResult = compareRawFrames(child.rawFrame, rawFrame);
      if (compareResult === 0) {
        if (rawFrame.parsedFrameInfo && !child.parsedFrameInfo) {
          child.parsedFrameInfo = rawFrame.parsedFrameInfo;
        }
        return child;
      }
      if (compareResult > 0) {
        break;
      }
    }
    const newNode = new FrameNode(rawFrame, node);
    if (node.parent) {
      node.children.splice(i, 0, newNode);
    } else {
      node.children.splice(i, 0, new WeakRef(newNode));
    }
    return newNode;
  }
  /**
   * Traverses the trie in pre-order.
   *
   * @param node Start at `node` or `null` to start with the children of the root.
   * @param visit Called on each node in the trie. Return `true` if the visitor should descend into child nodes of the provided node.
   */
  walk(node, visit) {
    const stack = node ? [node] : [...this.#root.children].map((ref) => ref.deref()).filter((node2) => Boolean(node2));
    for (let node2 = stack.pop(); node2; node2 = stack.pop()) {
      const visitChildren = visit(node2);
      if (visitChildren) {
        for (let i = node2.children.length - 1; i >= 0; --i) {
          stack.push(node2.children[i]);
        }
      }
    }
  }
};
function compareRawFrames(a, b) {
  const scriptIdCompare = (a.scriptId ?? "").localeCompare(b.scriptId ?? "");
  if (scriptIdCompare !== 0) {
    return scriptIdCompare;
  }
  const urlCompare = (a.url ?? "").localeCompare(b.url ?? "");
  if (urlCompare !== 0) {
    return urlCompare;
  }
  const nameCompare = (a.functionName ?? "").localeCompare(b.functionName ?? "");
  if (nameCompare !== 0) {
    return nameCompare;
  }
  if (a.lineNumber !== b.lineNumber) {
    return a.lineNumber - b.lineNumber;
  }
  return a.columnNumber - b.columnNumber;
}

// ../../front_end/models/stack_trace/StackTraceImpl.ts
var StackTraceImpl = class extends Common2.ObjectWrapper.ObjectWrapper {
  syncFragment;
  asyncFragments;
  constructor(syncFragment, asyncFragments) {
    super();
    this.syncFragment = syncFragment;
    this.asyncFragments = asyncFragments;
    const fragment = syncFragment instanceof DebuggableFragmentImpl || syncFragment instanceof ParsedErrorStackFragmentImpl ? syncFragment.fragment : syncFragment;
    fragment.stackTraces.add(this);
    this.asyncFragments.forEach((asyncFragment) => asyncFragment.fragment.stackTraces.add(this));
  }
};
var FragmentImpl = class _FragmentImpl {
  static EMPTY_FRAGMENT = new _FragmentImpl();
  node;
  stackTraces = /* @__PURE__ */ new Set();
  /**
   * Fragments are deduplicated based on the node.
   *
   * In turn, each fragment can be part of multiple stack traces.
   */
  static getOrCreate(node) {
    if (!node.fragment) {
      node.fragment = new _FragmentImpl(node);
    }
    return node.fragment;
  }
  constructor(node) {
    this.node = node;
  }
  get frames() {
    return this.node ? consolidate([...this.node.getCallStack()]).map(({ frame }) => frame) : [];
  }
};
var AsyncFragmentImpl = class {
  constructor(description, fragment) {
    this.description = description;
    this.fragment = fragment;
  }
  description;
  fragment;
  get frames() {
    return this.fragment.frames;
  }
};
var FrameImpl = class {
  url;
  uiSourceCode;
  name;
  line;
  column;
  missingDebugInfo;
  rawName;
  isWasm;
  isInline;
  constructor(url, uiSourceCode, name, line, column, missingDebugInfo, rawName, isWasm, isInline) {
    this.url = url;
    this.uiSourceCode = uiSourceCode;
    this.name = name;
    this.line = line;
    this.column = column;
    this.missingDebugInfo = missingDebugInfo;
    this.rawName = rawName;
    this.isWasm = isWasm;
    this.isInline = isInline;
  }
};
function consolidate(callStack) {
  const result = [];
  for (let i = 0; i < callStack.length; ++i) {
    const node = callStack[i];
    if (node.kind === "HIDDEN" /* HIDDEN */) {
      continue;
    }
    if (node.kind === "VISIBLE" /* VISIBLE */ || !node.functionKeys) {
      node.frames.forEach((frame, inlineIndex) => result.push({
        frame,
        node,
        nodeIndex: i,
        inlineIndex,
        invocationNode: inlineIndex === node.frames.length - 1 ? node : void 0
      }));
      continue;
    }
    const group = node.frames.map((frame, inlineIndex) => ({ frame, node, nodeIndex: i, inlineIndex }));
    let bottom = node.functionKeys.bottom;
    let terminator;
    let lastConsumed = i;
    for (let j = i + 1; j < callStack.length && !terminator; ++j) {
      const caller = callStack[j];
      if (caller.kind === "HIDDEN" /* HIDDEN */ || isNotAuthored(caller)) {
        continue;
      }
      if (!caller.functionKeys || caller.functionKeys.top !== bottom) {
        break;
      }
      for (let k = 1; k < caller.frames.length; ++k) {
        group.push({ frame: caller.frames[k], node: caller, nodeIndex: j, inlineIndex: k });
      }
      bottom = caller.functionKeys.bottom;
      terminator = caller.kind === "VISIBLE" /* VISIBLE */ ? caller : void 0;
      lastConsumed = j;
    }
    i = lastConsumed;
    const rawName = terminator?.rawFrame.functionName;
    group.forEach(({ frame: f, ...rest }, idx) => result.push({
      ...rest,
      frame: new FrameImpl(
        f.url,
        f.uiSourceCode,
        f.name,
        f.line,
        f.column,
        f.missingDebugInfo,
        rawName,
        f.isWasm,
        idx < group.length - 1
      ),
      invocationNode: idx === group.length - 1 ? terminator : void 0
    }));
  }
  return result;
}
function isNotAuthored(node) {
  return node.kind === "VISIBLE" /* VISIBLE */ && !node.functionKeys && (node.isUnmapped || isBuiltinFrame(node.rawFrame));
}
function createParsedErrorStackFrameImplFromEvalOrigin(evalOrigin, parsedFrameInfo) {
  if (!evalOrigin || evalOrigin.frames.length === 0) {
    return void 0;
  }
  const frame = evalOrigin.frames[0];
  const info = parsedFrameInfo?.evalOrigin?.parsedFrameInfo;
  const nestedOrigin = createParsedErrorStackFrameImplFromEvalOrigin(evalOrigin.evalOrigin, info);
  return new ParsedErrorStackFrameImpl(frame, info, info, nestedOrigin);
}
var ParsedErrorStackFragmentImpl = class {
  constructor(fragment) {
    this.fragment = fragment;
  }
  fragment;
  get frames() {
    if (!this.fragment.node) {
      return [];
    }
    const evalOrigins = /* @__PURE__ */ new Map();
    return consolidate([...this.fragment.node.getCallStack()]).map(({ frame, node, invocationNode }) => {
      if (!evalOrigins.has(node)) {
        evalOrigins.set(node, createParsedErrorStackFrameImplFromEvalOrigin(node.evalOrigin, node.parsedFrameInfo));
      }
      return new ParsedErrorStackFrameImpl(
        frame,
        node.parsedFrameInfo,
        invocationNode?.parsedFrameInfo,
        evalOrigins.get(node)
      );
    });
  }
};
var ParsedErrorStackFrameImpl = class {
  #frame;
  #locationInfo;
  #invocationInfo;
  #evalOrigin;
  constructor(frame, locationInfo, invocationInfo, evalOrigin) {
    this.#frame = frame;
    this.#locationInfo = locationInfo;
    this.#invocationInfo = invocationInfo;
    this.#evalOrigin = evalOrigin;
  }
  get url() {
    return this.#frame.url;
  }
  get uiSourceCode() {
    return this.#frame.uiSourceCode;
  }
  get name() {
    return this.#frame.name;
  }
  get line() {
    return this.#frame.line;
  }
  get column() {
    return this.#frame.column;
  }
  get missingDebugInfo() {
    return this.#frame.missingDebugInfo;
  }
  get rawName() {
    return this.#frame.rawName;
  }
  get isAsync() {
    return this.#locationInfo?.isAsync;
  }
  get isConstructor() {
    return this.#invocationInfo?.isConstructor;
  }
  get isEval() {
    return this.#locationInfo?.isEval;
  }
  get evalOrigin() {
    return this.#evalOrigin;
  }
  get isWasm() {
    return this.#frame.isWasm;
  }
  get isInline() {
    return this.#frame.isInline;
  }
  get wasmModuleName() {
    return this.#locationInfo?.wasmModuleName;
  }
  get wasmFunctionIndex() {
    return this.#locationInfo?.wasmFunctionIndex;
  }
  get typeName() {
    return this.#invocationInfo?.typeName;
  }
  get methodName() {
    return this.#invocationInfo?.methodName;
  }
  get promiseIndex() {
    return this.#locationInfo?.promiseIndex;
  }
};
var DebuggableFragmentImpl = class {
  constructor(fragment, callFrames) {
    this.fragment = fragment;
    this.callFrames = callFrames;
  }
  fragment;
  callFrames;
  /**
   * Virtual call frames for inlined frames, so that reading `frames` repeatedly (e.g. after `UPDATED`) yields
   * identical `sdkFrame`s. A new DebuggableFragmentImpl is created per pause, so this lives as long as `callFrames`.
   */
  #virtualCallFrames = /* @__PURE__ */ new Map();
  get frames() {
    if (!this.fragment.node) {
      return [];
    }
    return consolidate([...this.fragment.node.getCallStack()]).map(({ frame, nodeIndex, inlineIndex }) => {
      return new DebuggableFrameImpl(frame, this.#sdkFrameFor(nodeIndex, inlineIndex, frame.name ?? ""));
    });
  }
  #sdkFrameFor(nodeIndex, inlineIndex, name) {
    const physical = this.callFrames[nodeIndex];
    if (inlineIndex === 0) {
      return physical;
    }
    const key = `${nodeIndex}:${inlineIndex}:${name}`;
    let frame = this.#virtualCallFrames.get(key);
    if (!frame) {
      frame = physical.createVirtualCallFrame(inlineIndex, name);
      this.#virtualCallFrames.set(key, frame);
    }
    return frame;
  }
};
var DebuggableFrameImpl = class {
  #frame;
  #sdkFrame;
  constructor(frame, sdkFrame) {
    this.#frame = frame;
    this.#sdkFrame = sdkFrame;
  }
  get url() {
    return this.#frame.url;
  }
  get uiSourceCode() {
    return this.#frame.uiSourceCode;
  }
  get name() {
    return this.#frame.name;
  }
  get line() {
    return this.#frame.line;
  }
  get column() {
    return this.#frame.column;
  }
  get missingDebugInfo() {
    return this.#frame.missingDebugInfo;
  }
  get rawName() {
    return this.#frame.rawName;
  }
  get isWasm() {
    return this.#frame.isWasm;
  }
  get isInline() {
    return this.#frame.isInline;
  }
  get sdkFrame() {
    return this.#sdkFrame;
  }
};

// ../../front_end/models/stack_trace/StackTraceModel.ts
var StackTraceModel_exports = {};
__export(StackTraceModel_exports, {
  StackTraceModel: () => StackTraceModel
});
import * as Common3 from "../../core/common/common.js";
import * as SDK from "../../core/sdk/sdk.js";
import * as StackTrace from "./stack_trace.js";
var StackTraceModel = class _StackTraceModel extends SDK.SDKModel.SDKModel {
  #trie = new Trie();
  #mutex = new Common3.Mutex.Mutex();
  /** @returns the {@link StackTraceModel} for the target. Throws if the target or its model cannot be found. */
  static #modelForTarget(target) {
    const model = target?.model(_StackTraceModel);
    if (!model) {
      throw new Error("Unable to find StackTraceModel");
    }
    return model;
  }
  async createFromProtocolRuntime(stackTrace, rawFramesToUIFrames) {
    const debuggerModel = this.target().model(SDK.DebuggerModel.DebuggerModel);
    const syncFrames = stackTrace.callFrames.map((frame) => {
      const isWasm = debuggerModel?.isWasm(frame.scriptId) ?? false;
      return { ...frame, isWasm };
    });
    const [syncFragment, asyncFragments] = await Promise.all([
      this.#createFragment(syncFrames, rawFramesToUIFrames),
      this.#createAsyncFragments(stackTrace, rawFramesToUIFrames)
    ]);
    return new StackTraceImpl(syncFragment, asyncFragments);
  }
  async createFromErrorStackLikeString(stack, rawFramesToUIFrames, exceptionDetails) {
    const debuggerModel = this.target().model(SDK.DebuggerModel.DebuggerModel);
    const baseURL = this.target().inspectedURL();
    const resolveURL = (url) => {
      let urlWithScheme = parseOrScriptMatch(debuggerModel, url);
      if (!urlWithScheme && Common3.ParsedURL.ParsedURL.isRelativeURL(url)) {
        urlWithScheme = parseOrScriptMatch(debuggerModel, Common3.ParsedURL.ParsedURL.completeURL(baseURL, url));
      }
      return urlWithScheme;
    };
    const rawFrames = parseRawFramesFromErrorStack(stack, resolveURL);
    if (!rawFrames) {
      return null;
    }
    if (exceptionDetails?.stackTrace) {
      augmentRawFramesWithScriptIds(rawFrames, exceptionDetails.stackTrace);
    }
    const [syncFragment, asyncFragments] = await Promise.all([
      this.#createFragment(rawFrames, rawFramesToUIFrames),
      exceptionDetails?.stackTrace ? this.#createAsyncFragments(exceptionDetails.stackTrace, rawFramesToUIFrames) : Promise.resolve([])
    ]);
    return new StackTraceImpl(new ParsedErrorStackFragmentImpl(syncFragment), asyncFragments);
  }
  async createFromDebuggerPaused(pausedDetails, rawFramesToUIFrames) {
    const [syncFragment, asyncFragments] = await Promise.all([
      this.#createDebuggableFragment(pausedDetails, rawFramesToUIFrames),
      this.#createAsyncFragments(pausedDetails, rawFramesToUIFrames)
    ]);
    return new StackTraceImpl(syncFragment, asyncFragments);
  }
  /**
   * Re-translates all trie nodes whose raw frame or eval origin chain is in `script`, and notifies all stack traces
   * that contain such a node.
   */
  async scriptInfoChanged(script, translateRawFrames) {
    const matches = (raw) => raw.scriptId === script.scriptId || !raw.scriptId && raw.url === script.sourceURL;
    const evalMatches = (raw) => Boolean(raw) && (matches(raw) || evalMatches(raw?.parsedFrameInfo?.evalOrigin));
    const release = await this.#mutex.acquire();
    try {
      const affected = [];
      this.#trie.walk(null, (node) => {
        if (matches(node.rawFrame) || evalMatches(node.parsedFrameInfo?.evalOrigin)) {
          affected.push(node);
        }
        return true;
      });
      await this.#translateNodes(
        affected.filter((n) => matches(n.rawFrame)),
        affected.filter((n) => evalMatches(n.parsedFrameInfo?.evalOrigin)),
        translateRawFrames
      );
      const visited = /* @__PURE__ */ new Set();
      let stackTracesToUpdate = /* @__PURE__ */ new Set();
      for (const root of affected) {
        this.#trie.walk(root, (node) => {
          if (visited.has(node)) {
            return false;
          }
          visited.add(node);
          if (node.fragment) {
            stackTracesToUpdate = stackTracesToUpdate.union(node.fragment.stackTraces);
          }
          return true;
        });
      }
      for (const stackTrace of stackTracesToUpdate) {
        stackTrace.dispatchEventToListeners(StackTrace.StackTrace.Events.UPDATED);
      }
    } finally {
      release();
    }
  }
  async #createDebuggableFragment(pausedDetails, rawFramesToUIFrames) {
    const fragment = await this.#createFragment(
      pausedDetails.callFrames.map((frame) => ({
        scriptId: frame.script.scriptId,
        url: frame.script.sourceURL,
        functionName: frame.functionName,
        lineNumber: frame.location().lineNumber,
        columnNumber: frame.location().columnNumber,
        isWasm: frame.script.isWasm()
      })),
      rawFramesToUIFrames
    );
    return new DebuggableFragmentImpl(fragment, pausedDetails.callFrames);
  }
  async #createAsyncFragments(stackTraceOrPausedEvent, rawFramesToUIFrames) {
    const asyncFragments = [];
    const debuggerModel = this.target().model(SDK.DebuggerModel.DebuggerModel);
    if (debuggerModel) {
      for await (const { stackTrace: asyncStackTrace, target } of debuggerModel.iterateAsyncParents(stackTraceOrPausedEvent)) {
        if (asyncStackTrace.callFrames.length === 0) {
          continue;
        }
        const model = _StackTraceModel.#modelForTarget(target ?? this.target().targetManager().primaryPageTarget());
        const targetDebuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
        const asyncFrames = asyncStackTrace.callFrames.map((frame) => {
          const isWasm = targetDebuggerModel?.isWasm(frame.scriptId) ?? false;
          return { ...frame, isWasm };
        });
        const asyncFragmentPromise = model.#createFragment(asyncFrames, rawFramesToUIFrames).then((fragment) => new AsyncFragmentImpl(asyncStackTrace.description ?? "", fragment));
        asyncFragments.push(asyncFragmentPromise);
      }
    }
    return await Promise.all(asyncFragments);
  }
  async #createFragment(frames, rawFramesToUIFrames) {
    if (frames.length === 0) {
      return FragmentImpl.EMPTY_FRAGMENT;
    }
    const release = await this.#mutex.acquire();
    try {
      const node = this.#trie.insert(frames);
      const fragment = FragmentImpl.getOrCreate(node);
      const callStack = [...node.getCallStack()];
      await this.#translateNodes(
        callStack.filter((n) => !n.isTranslated),
        callStack.filter((n) => n.parsedFrameInfo?.evalOrigin && !n.evalOrigin),
        rawFramesToUIFrames
      );
      return fragment;
    } finally {
      release();
    }
  }
  /** Translates `nodes` and the eval origins of `evalNodes`. Writes nothing if any translation throws. */
  async #translateNodes(nodes, evalNodes, rawFramesToUIFrames) {
    if (nodes.length === 0 && evalNodes.length === 0) {
      return;
    }
    const [translations, evalOrigins] = await Promise.all([
      nodes.length ? rawFramesToUIFrames(nodes.map((n) => n.rawFrame), this.target()) : Promise.resolve([]),
      Promise.all(evalNodes.map(
        (n) => translateEvalOrigin(n.parsedFrameInfo?.evalOrigin, rawFramesToUIFrames, this.target())
      ))
    ]);
    if (translations.length !== nodes.length) {
      throw new Error("Broken rawFramesToUIFrames implementation");
    }
    nodes.forEach((node, i) => applyTranslation(node, translations[i]));
    evalNodes.forEach((node, i) => {
      node.evalOrigin = evalOrigins[i];
    });
  }
};
function toFrameImpls(rawFrame, frames) {
  return frames.map((f, index) => new FrameImpl(
    f.url,
    f.uiSourceCode,
    f.name,
    f.line,
    f.column,
    f.missingDebugInfo,
    rawFrame.functionName,
    rawFrame.isWasm,
    index < frames.length - 1
  ));
}
function applyTranslation(node, translation) {
  node.isTranslated = true;
  if (translation.kind === "HIDDEN" /* HIDDEN */ || translation.frames.length === 0) {
    console.assert(translation.kind === "HIDDEN" /* HIDDEN */, "Non-HIDDEN translation without frames");
    node.kind = "HIDDEN" /* HIDDEN */;
    node.frames = [];
    node.functionKeys = void 0;
    node.isUnmapped = false;
    return;
  }
  node.kind = translation.kind;
  node.frames = toFrameImpls(node.rawFrame, translation.frames);
  node.functionKeys = translation.functionKeys;
  node.isUnmapped = translation.kind === "VISIBLE" /* VISIBLE */ && Boolean(translation.unmapped);
}
async function translateEvalOrigin(rawFrame, rawFramesToUIFrames, target) {
  const [translation] = await rawFramesToUIFrames([rawFrame], target);
  const frames = translation.frames.length ? toFrameImpls(rawFrame, translation.frames) : [new FrameImpl(
    rawFrame.url,
    void 0,
    rawFrame.functionName,
    rawFrame.lineNumber,
    rawFrame.columnNumber,
    void 0,
    rawFrame.functionName,
    rawFrame.isWasm,
    false
  )];
  let parentEvalOrigin;
  if (rawFrame.parsedFrameInfo?.evalOrigin) {
    parentEvalOrigin = await translateEvalOrigin(rawFrame.parsedFrameInfo.evalOrigin, rawFramesToUIFrames, target);
  }
  return new EvalOrigin(frames, parentEvalOrigin);
}
function parseOrScriptMatch(debuggerModel, url) {
  if (!url) {
    return null;
  }
  if (Common3.ParsedURL.ParsedURL.isValidUrlString(url)) {
    return url;
  }
  if (debuggerModel.scriptsForSourceURL(url).length) {
    return url;
  }
  try {
    const fileUrl = new URL(url, "file://");
    if (debuggerModel.scriptsForSourceURL(fileUrl.href).length) {
      return fileUrl.href;
    }
  } catch {
  }
  return null;
}
SDK.SDKModel.SDKModel.register(StackTraceModel, { capabilities: SDK.Target.Capability.NONE, autostart: false });
export {
  DetailedErrorStackParser_exports as DetailedErrorStackParser,
  StackTraceImpl_exports as StackTraceImpl,
  StackTraceModel_exports as StackTraceModel,
  Trie_exports as Trie
};
//# sourceMappingURL=stack_trace_impl.js.map
