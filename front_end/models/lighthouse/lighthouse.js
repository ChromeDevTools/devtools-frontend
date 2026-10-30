var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../front_end/models/lighthouse/LighthouseReporterTypes.ts
var LighthouseReporterTypes_exports = {};
__export(LighthouseReporterTypes_exports, {
  LighthouseReportGenerator: () => LighthouseReportGenerator
});
var LighthouseReportGenerator = class {
  generateReportHtml(_lhr) {
    return "";
  }
};

// ../../front_end/models/lighthouse/RunTypes.ts
var RunTypes_exports = {};
__export(RunTypes_exports, {
  CATEGORY_SUPPORTED_MODES: () => CATEGORY_SUPPORTED_MODES
});
var CATEGORY_SUPPORTED_MODES = {
  performance: ["navigation", "timespan", "snapshot"],
  accessibility: ["navigation", "snapshot"],
  "best-practices": ["navigation", "timespan", "snapshot"],
  seo: ["navigation", "snapshot"],
  "agentic-browsing": ["navigation", "snapshot"]
};
export {
  LighthouseReporterTypes_exports as ReporterTypes,
  RunTypes_exports as RunTypes
};
//# sourceMappingURL=lighthouse.js.map
