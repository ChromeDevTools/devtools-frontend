var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/models/stack_trace/StackTraceImpl.js
var StackTraceImpl_exports = {};
__export(StackTraceImpl_exports, {
  AsyncFragmentImpl: () => AsyncFragmentImpl,
  FragmentImpl: () => FragmentImpl,
  FrameImpl: () => FrameImpl,
  StackTraceImpl: () => StackTraceImpl
});
import * as Common from "./../../core/common/common.js";
var StackTraceImpl = class extends Common.ObjectWrapper.ObjectWrapper {
  syncFragment;
  asyncFragments;
  constructor(syncFragment, asyncFragments) {
    super();
    this.syncFragment = syncFragment;
    this.asyncFragments = asyncFragments;
    syncFragment.stackTraces.add(this);
    this.asyncFragments.forEach((asyncFragment) => asyncFragment.fragment.stackTraces.add(this));
  }
};
var FragmentImpl = class _FragmentImpl {
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
    const frames = [];
    for (const node of this.node.getCallStack()) {
      frames.push(...node.frames);
    }
    return frames;
  }
};
var AsyncFragmentImpl = class {
  description;
  fragment;
  constructor(description, fragment) {
    this.description = description;
    this.fragment = fragment;
  }
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
  constructor(url, uiSourceCode, name, line, column, missingDebugInfo) {
    this.url = url;
    this.uiSourceCode = uiSourceCode;
    this.name = name;
    this.line = line;
    this.column = column;
    this.missingDebugInfo = missingDebugInfo;
  }
};

// gen/front_end/models/stack_trace/StackTraceModel.js
var StackTraceModel_exports = {};
__export(StackTraceModel_exports, {
  StackTraceModel: () => StackTraceModel
});
import * as SDK from "./../../core/sdk/sdk.js";
import * as StackTrace from "./stack_trace.js";

// gen/front_end/models/stack_trace/Trie.js
var Trie_exports = {};
__export(Trie_exports, {
  FrameNode: () => FrameNode,
  Trie: () => Trie,
  compareRawFrames: () => compareRawFrames,
  isBuiltinFrame: () => isBuiltinFrame
});
function isBuiltinFrame(rawFrame) {
  return rawFrame.lineNumber === -1 && rawFrame.columnNumber === -1 && !Boolean(rawFrame.scriptId) && !Boolean(rawFrame.url);
}
var FrameNode = class {
  parent;
  children = [];
  rawFrame;
  frames = [];
  fragment;
  constructor(rawFrame, parent) {
    this.rawFrame = rawFrame;
    this.parent = parent;
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

// gen/front_end/models/stack_trace/StackTraceModel.js
var StackTraceModel = class _StackTraceModel extends SDK.SDKModel.SDKModel {
  #trie = new Trie();
  /** @returns the {@link StackTraceModel} for the target, or the model for the primaryPageTarget when passing null/undefined */
  static #modelForTarget(target) {
    const model = (target ?? SDK.TargetManager.TargetManager.instance().primaryPageTarget())?.model(_StackTraceModel);
    if (!model) {
      throw new Error("Unable to find StackTraceModel");
    }
    return model;
  }
  async createFromProtocolRuntime(stackTrace, rawFramesToUIFrames) {
    const translatePromises = [];
    const fragment = this.#createFragment(stackTrace.callFrames);
    translatePromises.push(this.#translateFragment(fragment, rawFramesToUIFrames));
    const asyncFragments = [];
    const debuggerModel = this.target().model(SDK.DebuggerModel.DebuggerModel);
    if (debuggerModel) {
      for await (const { stackTrace: asyncStackTrace, target } of debuggerModel.iterateAsyncParents(stackTrace)) {
        if (asyncStackTrace.callFrames.length === 0) {
          continue;
        }
        const model = _StackTraceModel.#modelForTarget(target);
        const asyncFragment = model.#createFragment(asyncStackTrace.callFrames);
        translatePromises.push(model.#translateFragment(asyncFragment, rawFramesToUIFrames));
        asyncFragments.push(new AsyncFragmentImpl(asyncStackTrace.description ?? "", asyncFragment));
      }
    }
    await Promise.all(translatePromises);
    return new StackTraceImpl(fragment, asyncFragments);
  }
  /** Trigger re-translation of all fragments with the provide script in their call stack */
  async scriptInfoChanged(script, translateRawFrames) {
    const translatePromises = [];
    let stackTracesToUpdate = /* @__PURE__ */ new Set();
    for (const fragment of this.#affectedFragments(script)) {
      if (fragment.node.children.length === 0) {
        translatePromises.push(this.#translateFragment(fragment, translateRawFrames));
      }
      stackTracesToUpdate = stackTracesToUpdate.union(fragment.stackTraces);
    }
    await Promise.all(translatePromises);
    for (const stackTrace of stackTracesToUpdate) {
      stackTrace.dispatchEventToListeners(
        "UPDATED"
        /* StackTrace.StackTrace.Events.UPDATED */
      );
    }
  }
  #createFragment(frames) {
    return FragmentImpl.getOrCreate(this.#trie.insert(frames));
  }
  async #translateFragment(fragment, rawFramesToUIFrames) {
    const rawFrames = fragment.node.getCallStack().map((node) => node.rawFrame).toArray();
    const uiFrames = await rawFramesToUIFrames(rawFrames, this.target());
    console.assert(rawFrames.length === uiFrames.length, "Broken rawFramesToUIFrames implementation");
    let i = 0;
    for (const node of fragment.node.getCallStack()) {
      node.frames = uiFrames[i++].map((frame) => new FrameImpl(frame.url, frame.uiSourceCode, frame.name, frame.line, frame.column, frame.missingDebugInfo));
    }
  }
  #affectedFragments(script) {
    const affectedBranches = /* @__PURE__ */ new Set();
    this.#trie.walk(null, (node) => {
      if (node.rawFrame.scriptId === script.scriptId || !node.rawFrame.scriptId && node.rawFrame.url === script.sourceURL) {
        affectedBranches.add(node);
        return false;
      }
      return true;
    });
    const fragments = /* @__PURE__ */ new Set();
    for (const branch of affectedBranches) {
      this.#trie.walk(branch, (node) => {
        if (node.fragment) {
          fragments.add(node.fragment);
        }
        return true;
      });
    }
    return fragments;
  }
};
SDK.SDKModel.SDKModel.register(StackTraceModel, { capabilities: 0, autostart: false });
export {
  StackTraceImpl_exports as StackTraceImpl,
  StackTraceModel_exports as StackTraceModel,
  Trie_exports as Trie
};
//# sourceMappingURL=stack_trace_impl.js.map
