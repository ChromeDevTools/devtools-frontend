var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/application/preloading/helper/PreloadingForward.js
var PreloadingForward_exports = {};
__export(PreloadingForward_exports, {
  AttemptViewWithFilter: () => AttemptViewWithFilter,
  RuleSetView: () => RuleSetView,
  preloadStatusCode: () => preloadStatusCode
});
import * as SDK from "./../../../../core/sdk/sdk.js";
import * as Logs from "./../../../../models/logs/logs.js";
var RuleSetView = class {
  ruleSetId;
  constructor(ruleSetId) {
    this.ruleSetId = ruleSetId;
  }
};
var AttemptViewWithFilter = class {
  ruleSetId;
  constructor(ruleSetId) {
    this.ruleSetId = ruleSetId;
  }
};
function preloadStatusCode(attempt) {
  switch (attempt.action) {
    case "Prefetch":
      return prefetchStatusCode(attempt.requestId);
    case "Prerender":
    case "PrerenderUntilScript":
      return prerenderStatusCode(attempt.key.loaderId);
  }
  return void 0;
}
function prefetchStatusCode(requestId) {
  const networkLog = Logs.NetworkLog.NetworkLog.instance();
  const requests = networkLog.requestsForId(requestId);
  if (requests.length > 0) {
    return requests[requests.length - 1].statusCode;
  }
  return void 0;
}
function prerenderStatusCode(loaderId) {
  const frame = SDK.ResourceTreeModel.ResourceTreeModel.frames().find((f) => f.loaderId === loaderId);
  if (!frame) {
    return void 0;
  }
  const networkManager = frame.resourceTreeModel().target().model(SDK.NetworkManager.NetworkManager);
  const request = networkManager?.requestForLoaderId(loaderId);
  return request?.statusCode === 0 ? void 0 : request?.statusCode;
}
export {
  PreloadingForward_exports as PreloadingForward
};
//# sourceMappingURL=helper.js.map
