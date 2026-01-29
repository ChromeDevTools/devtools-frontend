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
  url;
  uiSourceCode;
  name;
  line;
  column;
  missingDebugInfo;
  sdkFrame;
  /** Use the static {@link for}. Only public to satisfy the `setFlavor` Ctor type  */
  constructor(frame) {
    this.url = frame.url;
    this.uiSourceCode = frame.uiSourceCode;
    this.name = frame.name;
    this.line = frame.line;
    this.column = frame.column;
    this.missingDebugInfo = frame.missingDebugInfo;
    this.sdkFrame = frame.sdkFrame;
  }
  /** @returns the same instance of DebuggableFrameFlavor for repeated calls with the same (i.e. deep equal) DebuggableFrame */
  static for(frame) {
    function equals(a, b) {
      return a.url === b.url && a.uiSourceCode === b.uiSourceCode && a.name === b.name && a.line === b.line && a.column === b.column && a.sdkFrame === b.sdkFrame;
    }
    if (!_DebuggableFrameFlavor.#last || !equals(_DebuggableFrameFlavor.#last, frame)) {
      _DebuggableFrameFlavor.#last = new _DebuggableFrameFlavor(frame);
    }
    return _DebuggableFrameFlavor.#last;
  }
};
export {
  StackTrace_exports as StackTrace
};
//# sourceMappingURL=stack_trace.js.map
