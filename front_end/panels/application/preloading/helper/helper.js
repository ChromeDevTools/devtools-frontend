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
  prefetchStatusCode: () => prefetchStatusCode
});
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
function prefetchStatusCode(requestId) {
  const networkLog = Logs.NetworkLog.NetworkLog.instance();
  const requests = networkLog.requestsForId(requestId);
  if (requests.length > 0) {
    return requests[requests.length - 1].statusCode;
  }
  return void 0;
}
export {
  PreloadingForward_exports as PreloadingForward
};
//# sourceMappingURL=helper.js.map
