// gen/front_end/models/live-metrics/web-vitals-injected/spec/spec.prebundle.js
var EVENT_BINDING_NAME = "__chromium_devtools_metrics_reporter";
var INTERNAL_KILL_SWITCH = "__chromium_devtools_kill_live_metrics";
var SCRIPTS_PER_LOAF_LIMIT = 10;
var LOAF_LIMIT = 5;
function getUniqueLayoutShiftId(entry) {
  return `layout-shift-${entry.value}-${entry.startTime}`;
}
export {
  EVENT_BINDING_NAME,
  INTERNAL_KILL_SWITCH,
  LOAF_LIMIT,
  SCRIPTS_PER_LOAF_LIMIT,
  getUniqueLayoutShiftId
};
//# sourceMappingURL=spec.js.map
