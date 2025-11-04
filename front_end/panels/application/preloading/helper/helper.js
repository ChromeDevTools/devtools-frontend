var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/application/preloading/helper/PreloadingForward.js
var PreloadingForward_exports = {};
__export(PreloadingForward_exports, {
  AttemptViewWithFilter: () => AttemptViewWithFilter,
  RuleSetView: () => RuleSetView
});
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
export {
  PreloadingForward_exports as PreloadingForward
};
//# sourceMappingURL=helper.js.map
