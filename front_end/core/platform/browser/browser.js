var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/core/platform/browser/HostRuntime.js
var HostRuntime_exports = {};
__export(HostRuntime_exports, {
  HOST_RUNTIME: () => HOST_RUNTIME,
  IS_BROWSER: () => IS_BROWSER
});
var IS_BROWSER = typeof window !== "undefined" || typeof self !== "undefined" && typeof self.postMessage === "function";
var HOST_RUNTIME = {
  createWorker() {
    throw new Error("unimplemented");
  }
};
export {
  HostRuntime_exports as HostRuntime
};
//# sourceMappingURL=browser.js.map
