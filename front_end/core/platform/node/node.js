var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/core/platform/node/HostRuntime.js
var HostRuntime_exports = {};
__export(HostRuntime_exports, {
  HOST_RUNTIME: () => HOST_RUNTIME,
  IS_NODE: () => IS_NODE
});
var IS_NODE = typeof process !== "undefined" && process.versions?.node !== null;
var HOST_RUNTIME = {
  createWorker() {
    throw new Error("unimplemented");
  }
};
export {
  HostRuntime_exports as HostRuntime
};
//# sourceMappingURL=node.js.map
