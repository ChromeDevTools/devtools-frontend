var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/models/stack_trace/StackTrace.js
var StackTrace_exports = {};
__export(StackTrace_exports, {
  DebuggableFrameFlavor: () => DebuggableFrameFlavor
});
var DebuggableFrameFlavor = class _DebuggableFrameFlavor {
  static #last;
  frame;
  // TODO(crbug.com/465879478): Remove once this is no longer part of SDK.CallFrame.
  //     We need to stash this separately because DebuggerModel sets this on CallFrame after the
  //     fact so we can't just check it in the `equals` below.
  #missingDebugInfo;
  /** Use the static {@link for}. Only public to satisfy the `setFlavor` Ctor type  */
  constructor(frame) {
    this.frame = frame;
    this.#missingDebugInfo = frame.sdkFrame.missingDebugInfoDetails;
  }
  get sdkFrame() {
    return this.frame.sdkFrame;
  }
  /** @returns the same instance of DebuggableFrameFlavor for repeated calls with the same (i.e. deep equal) DebuggableFrame */
  static for(frame) {
    function equals(a, b) {
      return a.url === b.url && a.uiSourceCode === b.uiSourceCode && a.name === b.name && a.line === b.line && a.column === b.column && a.sdkFrame === b.sdkFrame;
    }
    if (!_DebuggableFrameFlavor.#last || !equals(_DebuggableFrameFlavor.#last.frame, frame) || _DebuggableFrameFlavor.#last.#missingDebugInfo !== frame.sdkFrame.missingDebugInfoDetails) {
      _DebuggableFrameFlavor.#last = new _DebuggableFrameFlavor(frame);
    }
    return _DebuggableFrameFlavor.#last;
  }
};
export {
  StackTrace_exports as StackTrace
};
//# sourceMappingURL=stack_trace.js.map
