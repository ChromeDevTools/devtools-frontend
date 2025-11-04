var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/console_counters/WarningErrorCounter.js
var WarningErrorCounter_exports = {};
__export(WarningErrorCounter_exports, {
  WarningErrorCounter: () => WarningErrorCounter,
  WarningErrorCounterWidget: () => WarningErrorCounterWidget
});
import * as Common from "./../../core/common/common.js";
import * as Host from "./../../core/host/host.js";
import * as i18n from "./../../core/i18n/i18n.js";
import * as SDK from "./../../core/sdk/sdk.js";
import * as IssuesManager from "./../../models/issues_manager/issues_manager.js";
import * as IssueCounter from "./../../ui/components/issue_counter/issue_counter.js";
import * as UI from "./../../ui/legacy/legacy.js";
import { html, nothing, render } from "./../../ui/lit/lit.js";
import * as VisualLogging from "./../../ui/visual_logging/visual_logging.js";
var UIStrings = {
  /**
   * @description The console error count in the Warning Error Counter shown in the main toolbar (top-left in DevTools). The error count refers to the number of errors currently present in the JavaScript console.
   */
  sErrors: "{n, plural, =1 {# error} other {# errors}}",
  /**
   * @description The console warning count in the Warning Error Counter shown in the main toolbar (top-left in DevTools). The warning count refers to the number of warnings currently present in the JavaScript console.
   */
  sWarnings: "{n, plural, =1 {# warning} other {# warnings}}",
  /**
   * @description Tooltip shown for a main toolbar button that opens the Console panel
   * @example {2 errors, 1 warning} PH1
   */
  openConsoleToViewS: "Open Console to view {PH1}",
  /**
   * @description Title for the issues count in the Issues Error Counter shown in the main toolbar (top-left in DevTools). The issues count refers to the number of issues in the issues tab.
   */
  openIssuesToView: "{n, plural, =1 {Open Issues to view # issue:} other {Open Issues to view # issues:}}"
};
var str_ = i18n.i18n.registerUIStrings("panels/console_counters/WarningErrorCounter.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var DEFAULT_VIEW = (input, _output, target) => {
  const issuesManager = IssuesManager.IssuesManager.IssuesManager.instance();
  const countToText = (c) => c === 0 ? void 0 : `${c}`;
  const { errors, warnings, issues, compact } = input;
  const errorCountTitle = i18nString(UIStrings.sErrors, { n: errors });
  const warningCountTitle = i18nString(UIStrings.sWarnings, { n: warnings });
  let consoleSummary = "";
  if (errors && warnings) {
    consoleSummary = `${errorCountTitle}, ${warningCountTitle}`;
  } else if (errors) {
    consoleSummary = errorCountTitle;
  } else if (warnings) {
    consoleSummary = warningCountTitle;
  }
  const consoleTitle = i18nString(UIStrings.openConsoleToViewS, { PH1: consoleSummary });
  const iconData = {
    clickHandler: Common.Console.Console.instance().show.bind(Common.Console.Console.instance()),
    accessibleName: consoleTitle,
    compact,
    groups: [
      {
        iconName: "cross-circle-filled",
        text: countToText(errors)
      },
      {
        iconName: "warning-filled",
        text: countToText(warnings)
      }
    ]
  };
  const issueEnumeration = IssueCounter.IssueCounter.getIssueCountsEnumeration(issuesManager);
  const issuesTitleLead = i18nString(UIStrings.openIssuesToView, { n: issues });
  const issuesTitle = `${issuesTitleLead} ${issueEnumeration}`;
  const issueCounterData = {
    clickHandler: input.showIssuesHandler,
    issuesManager,
    compact,
    accessibleName: issuesTitle,
    displayMode: "OnlyMostImportant"
  };
  render(html`<div class="status-buttons"
         ><icon-button
            .data=${iconData}
            title=${consoleTitle}
            class=${"small" + warnings || errors ? nothing : "hidden"}
            jslog=${VisualLogging.counter("console").track({
    click: true
  })}
         ></icon-button><devtools-issue-counter
            class=${"main-toolbar" + (issues ? "" : " hidden")}
            title=${issuesTitle}
            .data=${issueCounterData}
            jslog=${VisualLogging.counter("issue").track({
    click: true
  })}
         ></devtools-issue-counter></div>`, target);
};
var WarningErrorCounterWidget = class _WarningErrorCounterWidget extends UI.Widget.Widget {
  setVisibility;
  view;
  throttler;
  updatingForTest;
  compact;
  static instanceForTest = null;
  constructor(element, setVisibility, view = DEFAULT_VIEW) {
    super(element);
    this.setVisibility = setVisibility;
    this.view = view;
    this.throttler = new Common.Throttler.Throttler(100);
    SDK.TargetManager.TargetManager.instance().addModelListener(SDK.ConsoleModel.ConsoleModel, SDK.ConsoleModel.Events.ConsoleCleared, this.update, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(SDK.ConsoleModel.ConsoleModel, SDK.ConsoleModel.Events.MessageAdded, this.update, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(SDK.ConsoleModel.ConsoleModel, SDK.ConsoleModel.Events.MessageUpdated, this.update, this);
    const issuesManager = IssuesManager.IssuesManager.IssuesManager.instance();
    issuesManager.addEventListener("IssuesCountUpdated", this.update, this);
    this.update();
    _WarningErrorCounterWidget.instanceForTest = this;
  }
  onSetCompactLayout(event) {
    this.setCompactLayout(event.data);
  }
  setCompactLayout(enable) {
    this.compact = enable;
    void this.performUpdate();
  }
  updatedForTest() {
  }
  update() {
    this.updatingForTest = true;
    void this.throttler.schedule(this.performUpdate.bind(this));
  }
  get titlesForTesting() {
    const button = this.contentElement.querySelector("icon-button")?.shadowRoot?.querySelector("button");
    return button ? button.getAttribute("aria-label") : null;
  }
  showIssues() {
    Host.userMetrics.issuesPanelOpenedFrom(
      2
      /* Host.UserMetrics.IssueOpener.STATUS_BAR_ISSUES_COUNTER */
    );
    void UI.ViewManager.ViewManager.instance().showView("issues-pane");
  }
  async performUpdate() {
    const errors = SDK.ConsoleModel.ConsoleModel.allErrors();
    const warnings = SDK.ConsoleModel.ConsoleModel.allWarnings();
    const issuesManager = IssuesManager.IssuesManager.IssuesManager.instance();
    const issues = issuesManager.numberOfIssues();
    this.view({ compact: this.compact, errors, warnings, issues, showIssuesHandler: this.showIssues.bind(this) }, {}, this.contentElement);
    this.setVisibility(Boolean(errors || warnings || issues));
    UI.InspectorView.InspectorView.instance().toolbarItemResized();
    this.updatingForTest = false;
    this.updatedForTest();
    return;
  }
};
var warningErrorCounterInstance;
var WarningErrorCounter = class _WarningErrorCounter {
  toolbarItem;
  constructor() {
    const widgetElement = document.createElement("devtools-widget");
    const toolbarItem = new UI.Toolbar.ToolbarItemWithCompactLayout(widgetElement);
    toolbarItem.setVisible(false);
    widgetElement.widgetConfig = UI.Widget.widgetConfig((e) => {
      const widget = new WarningErrorCounterWidget(e, toolbarItem.setVisible.bind(toolbarItem));
      toolbarItem.addEventListener("CompactLayoutUpdated", widget.onSetCompactLayout, widget);
      return widget;
    });
    this.toolbarItem = toolbarItem;
  }
  item() {
    return this.toolbarItem;
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!warningErrorCounterInstance || forceNew) {
      warningErrorCounterInstance = new _WarningErrorCounter();
    }
    return warningErrorCounterInstance;
  }
};
export {
  WarningErrorCounter_exports as WarningErrorCounter
};
//# sourceMappingURL=console_counters.js.map
