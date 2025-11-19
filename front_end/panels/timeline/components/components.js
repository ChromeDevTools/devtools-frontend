var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/timeline/components/Breadcrumbs.js
var Breadcrumbs_exports = {};
__export(Breadcrumbs_exports, {
  Breadcrumbs: () => Breadcrumbs,
  flattenBreadcrumbs: () => flattenBreadcrumbs
});
import * as TraceBounds from "./../../../services/trace_bounds/trace_bounds.js";
function flattenBreadcrumbs(initialBreadcrumb) {
  const allBreadcrumbs = [initialBreadcrumb];
  let breadcrumbsIter = initialBreadcrumb;
  while (breadcrumbsIter.child !== null) {
    const iterChild = breadcrumbsIter.child;
    if (iterChild !== null) {
      allBreadcrumbs.push(iterChild);
      breadcrumbsIter = iterChild;
    }
  }
  return allBreadcrumbs;
}
var Breadcrumbs = class {
  initialBreadcrumb;
  activeBreadcrumb;
  constructor(initialTraceWindow) {
    this.initialBreadcrumb = {
      window: initialTraceWindow,
      child: null
    };
    let lastBreadcrumb = this.initialBreadcrumb;
    while (lastBreadcrumb.child !== null) {
      lastBreadcrumb = lastBreadcrumb.child;
    }
    this.activeBreadcrumb = lastBreadcrumb;
  }
  add(newBreadcrumbTraceWindow) {
    if (!this.isTraceWindowWithinTraceWindow(newBreadcrumbTraceWindow, this.activeBreadcrumb.window)) {
      throw new Error("Can not add a breadcrumb that is equal to or is outside of the parent breadcrumb TimeWindow");
    }
    const newBreadcrumb = {
      window: newBreadcrumbTraceWindow,
      child: null
    };
    this.activeBreadcrumb.child = newBreadcrumb;
    this.setActiveBreadcrumb(newBreadcrumb, { removeChildBreadcrumbs: false, updateVisibleWindow: true });
    return newBreadcrumb;
  }
  // Breadcumb should be within the bounds of the parent and can not have both start and end be equal to the parent
  isTraceWindowWithinTraceWindow(child, parent) {
    return child.min >= parent.min && child.max <= parent.max && !(child.min === parent.min && child.max === parent.max);
  }
  // Used to set an initial breadcrumbs from modifications loaded from a file
  setInitialBreadcrumbFromLoadedModifications(initialBreadcrumb) {
    this.initialBreadcrumb = initialBreadcrumb;
    let lastBreadcrumb = initialBreadcrumb;
    while (lastBreadcrumb.child !== null) {
      lastBreadcrumb = lastBreadcrumb.child;
    }
    this.setActiveBreadcrumb(lastBreadcrumb, { removeChildBreadcrumbs: false, updateVisibleWindow: true });
  }
  /**
   * Sets a breadcrumb to be active.
   * Doing this will update the minimap bounds and optionally based on the
   * `updateVisibleWindow` parameter, it will also update the active window.
   * The reason `updateVisibleWindow` is configurable is because if we are
   * changing which breadcrumb is active because we want to reveal something to
   * the user, we may have already updated the visible timeline window, but we
   * are activating the breadcrumb to show the user that they are now within
   * this breadcrumb. This is used when revealing insights and annotations.
   */
  setActiveBreadcrumb(activeBreadcrumb, options) {
    if (options.removeChildBreadcrumbs) {
      activeBreadcrumb.child = null;
    }
    this.activeBreadcrumb = activeBreadcrumb;
    TraceBounds.TraceBounds.BoundsManager.instance().setMiniMapBounds(activeBreadcrumb.window);
    if (options.updateVisibleWindow) {
      TraceBounds.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(activeBreadcrumb.window);
    }
  }
};

// gen/front_end/panels/timeline/components/BreadcrumbsUI.js
var BreadcrumbsUI_exports = {};
__export(BreadcrumbsUI_exports, {
  BreadcrumbActivatedEvent: () => BreadcrumbActivatedEvent,
  BreadcrumbsUI: () => BreadcrumbsUI
});
import * as i18n from "./../../../core/i18n/i18n.js";
import * as Trace from "./../../../models/trace/trace.js";
import * as ComponentHelpers from "./../../../ui/components/helpers/helpers.js";
import * as UI from "./../../../ui/legacy/legacy.js";
import * as Lit from "./../../../ui/lit/lit.js";
import * as VisualLogging from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/timeline/components/breadcrumbsUI.css.js
var breadcrumbsUI_css_default = `/*
 * Copyright 2023 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.breadcrumbs {
  display: none;
  align-items: center;
  height: 29px;
  padding: 3px;
  overflow: scroll hidden;
}

.breadcrumbs::-webkit-scrollbar {
  display: none;
}

.breadcrumb {
  padding: 2px 6px;
  border-radius: 4px;
}

.breadcrumb:hover {
  background-color: var(--sys-color-state-hover-on-subtle);
}

.range {
  font-size: 12px;
  white-space: nowrap;
}

.active-breadcrumb {
  font-weight: bold;
  color: var(--app-color-active-breadcrumb);
}

/*# sourceURL=${import.meta.resolve("./breadcrumbsUI.css")} */`;

// gen/front_end/panels/timeline/components/BreadcrumbsUI.js
var { render, html } = Lit;
var UIStrings = {
  /**
   * @description A context menu item in the Minimap Breadcrumb context menu.
   * This context menu option activates the breadcrumb that the context menu was opened on.
   */
  activateBreadcrumb: "Activate breadcrumb",
  /**
   * @description A context menu item in the Minimap Breadcrumb context menu.
   * This context menu option removed all the child breadcrumbs and activates
   * the breadcrumb that the context menu was opened on.
   */
  removeChildBreadcrumbs: "Remove child breadcrumbs"
};
var str_ = i18n.i18n.registerUIStrings("panels/timeline/components/BreadcrumbsUI.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var BreadcrumbActivatedEvent = class _BreadcrumbActivatedEvent extends Event {
  breadcrumb;
  childBreadcrumbsRemoved;
  static eventName = "breadcrumbactivated";
  constructor(breadcrumb, childBreadcrumbsRemoved) {
    super(_BreadcrumbActivatedEvent.eventName);
    this.breadcrumb = breadcrumb;
    this.childBreadcrumbsRemoved = childBreadcrumbsRemoved;
  }
};
var BreadcrumbsUI = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #initialBreadcrumb = null;
  #activeBreadcrumb = null;
  set data(data) {
    this.#initialBreadcrumb = data.initialBreadcrumb;
    this.#activeBreadcrumb = data.activeBreadcrumb;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }
  #activateBreadcrumb(breadcrumb) {
    this.#activeBreadcrumb = breadcrumb;
    this.dispatchEvent(new BreadcrumbActivatedEvent(breadcrumb));
  }
  #showBreadcrumbsAndScrollLastCrumbIntoView() {
    const container = this.#shadow.querySelector(".breadcrumbs");
    if (!container) {
      return;
    }
    container.style.display = "flex";
    requestAnimationFrame(() => {
      if (container.scrollWidth - container.clientWidth > 0) {
        requestAnimationFrame(() => {
          container.scrollLeft = container.scrollWidth - container.clientWidth;
        });
      }
    });
  }
  #onContextMenu(event, breadcrumb) {
    const menu = new UI.ContextMenu.ContextMenu(event);
    menu.defaultSection().appendItem(i18nString(UIStrings.activateBreadcrumb), () => {
      this.dispatchEvent(new BreadcrumbActivatedEvent(breadcrumb));
    });
    menu.defaultSection().appendItem(i18nString(UIStrings.removeChildBreadcrumbs), () => {
      this.dispatchEvent(new BreadcrumbActivatedEvent(breadcrumb, true));
    });
    void menu.show();
  }
  #renderElement(breadcrumb, index) {
    const breadcrumbRange = Trace.Helpers.Timing.microToMilli(breadcrumb.window.range);
    return html`
          <div class="breadcrumb" @contextmenu=${(event) => this.#onContextMenu(event, breadcrumb)} @click=${() => this.#activateBreadcrumb(breadcrumb)}
          jslog=${VisualLogging.item("timeline.breadcrumb-select").track({ click: true })}>
           <span class="${breadcrumb === this.#activeBreadcrumb ? "active-breadcrumb" : ""} range">
            ${index === 0 ? `Full range (${i18n.TimeUtilities.preciseMillisToString(breadcrumbRange, 2)})` : `${i18n.TimeUtilities.preciseMillisToString(breadcrumbRange, 2)}`}
            </span>
          </div>
          ${breadcrumb.child !== null ? html`
            <devtools-icon name="chevron-right" class="medium">` : ""}
      `;
  }
  #render() {
    const output = html`
      <style>${breadcrumbsUI_css_default}</style>
      ${this.#initialBreadcrumb === null ? Lit.nothing : html`<div class="breadcrumbs" jslog=${VisualLogging.section("breadcrumbs")}>
        ${flattenBreadcrumbs(this.#initialBreadcrumb).map((breadcrumb, index) => this.#renderElement(breadcrumb, index))}
      </div>`}
    `;
    render(output, this.#shadow, { host: this });
    if (this.#initialBreadcrumb?.child) {
      this.#showBreadcrumbsAndScrollLastCrumbIntoView();
    }
  }
};
customElements.define("devtools-breadcrumbs-ui", BreadcrumbsUI);

// gen/front_end/panels/timeline/components/CPUThrottlingSelector.js
var CPUThrottlingSelector_exports = {};
__export(CPUThrottlingSelector_exports, {
  CPUThrottlingSelector: () => CPUThrottlingSelector,
  DEFAULT_VIEW: () => DEFAULT_VIEW
});
import "./../../../ui/components/icon_button/icon_button.js";
import "./../../../ui/components/menus/menus.js";
import * as Common from "./../../../core/common/common.js";
import * as i18n3 from "./../../../core/i18n/i18n.js";
import * as SDK from "./../../../core/sdk/sdk.js";
import * as UI2 from "./../../../ui/legacy/legacy.js";
import * as Lit2 from "./../../../ui/lit/lit.js";
import * as VisualLogging2 from "./../../../ui/visual_logging/visual_logging.js";
import * as MobileThrottling from "./../../mobile_throttling/mobile_throttling.js";

// gen/front_end/panels/timeline/components/cpuThrottlingSelector.css.js
var cpuThrottlingSelector_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

 @scope to (devtools-widget > *) {
  :scope {
    display: flex;
    align-items: center;
    max-width: 100%;
    height: 20px;
  }

  devtools-icon[name="info"] {
    margin-left: var(--sys-size-3);
    width: var(--sys-size-8);
    height: var(--sys-size-8);
  }

  devtools-select-menu {
    min-width: 160px;
    max-width: 100%;
    height: 20px;
  }
}

/*# sourceURL=${import.meta.resolve("./cpuThrottlingSelector.css")} */`;

// gen/front_end/panels/timeline/components/CPUThrottlingSelector.js
var { render: render2, html: html2 } = Lit2;
var UIStrings2 = {
  /**
   * @description Text label for a selection box showing which CPU throttling option is applied.
   * @example {No throttling} PH1
   */
  cpu: "CPU: {PH1}",
  /**
   * @description Text label for a selection box showing which CPU throttling option is applied.
   * @example {No throttling} PH1
   */
  cpuThrottling: "CPU throttling: {PH1}",
  /**
   * @description Text label for a selection box showing that a specific option is recommended.
   * @example {4x slowdown} PH1
   */
  recommendedThrottling: "{PH1} \u2013 recommended",
  /**
   * @description Text for why user should change a throttling setting.
   */
  recommendedThrottlingReason: "Consider changing setting to simulate real user environments",
  /**
   * @description Text to prompt the user to run the CPU calibration process.
   */
  calibrate: "Calibrate\u2026",
  /**
   * @description Text to prompt the user to re-run the CPU calibration process.
   */
  recalibrate: "Recalibrate\u2026",
  /**
   * @description Label shown above a list of CPU calibration preset options.
   */
  labelCalibratedPresets: "Calibrated presets"
};
var str_2 = i18n3.i18n.registerUIStrings("panels/timeline/components/CPUThrottlingSelector.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var DEFAULT_VIEW = (input, _output, target) => {
  let recommendedInfoEl;
  if (input.recommendedOption && input.currentOption === SDK.CPUThrottlingManager.NoThrottlingOption) {
    recommendedInfoEl = html2`<devtools-icon
        title=${i18nString2(UIStrings2.recommendedThrottlingReason)}
        name=info></devtools-icon>`;
  }
  const selectionTitle = input.currentOption.title();
  const hasCalibratedOnce = input.throttling.low || input.throttling.mid;
  const calibrationLabel = hasCalibratedOnce ? i18nString2(UIStrings2.recalibrate) : i18nString2(UIStrings2.calibrate);
  const template = html2`
    <style>${cpuThrottlingSelector_css_default}</style>
    <devtools-select-menu
          @selectmenuselected=${input.onMenuItemSelected}
          .showDivider=${true}
          .showArrow=${true}
          .sideButton=${false}
          .showSelectedItem=${true}
          .jslogContext=${"cpu-throttling"}
          .buttonTitle=${i18nString2(UIStrings2.cpu, { PH1: selectionTitle })}
          .title=${i18nString2(UIStrings2.cpuThrottling, { PH1: selectionTitle })}
        >
        ${input.groups.map((group) => {
    return html2`
            <devtools-menu-group .name=${group.name} .title=${group.name}>
              ${group.items.map((option) => {
      const title = option === input.recommendedOption ? i18nString2(UIStrings2.recommendedThrottling, { PH1: option.title() }) : option.title();
      const rate = option.rate();
      return html2`
                  <devtools-menu-item
                    .value=${option.calibratedDeviceType ?? rate}
                    .selected=${input.currentOption === option}
                    .disabled=${rate === 0}
                    .title=${title}
                    jslog=${VisualLogging2.item(option.jslogContext).track({ click: true })}
                  >
                    ${title}
                  </devtools-menu-item>
                `;
    })}
              ${group.name === "Calibrated presets" ? html2`<devtools-menu-item
                .value=${-1}
                .title=${calibrationLabel}
                jslog=${VisualLogging2.action("cpu-throttling-selector-calibrate").track({ click: true })}
                @click=${input.onCalibrateClick}
              >
                ${calibrationLabel}
              </devtools-menu-item>` : Lit2.nothing}
            </devtools-menu-group>`;
  })}
    </devtools-select-menu>
    ${recommendedInfoEl}
  `;
  render2(template, target);
};
var CPUThrottlingSelector = class extends UI2.Widget.Widget {
  #currentOption;
  #recommendedOption = null;
  #groups = [];
  #calibratedThrottlingSetting;
  #view;
  constructor(element, view = DEFAULT_VIEW) {
    super(element);
    this.#currentOption = SDK.CPUThrottlingManager.CPUThrottlingManager.instance().cpuThrottlingOption();
    this.#calibratedThrottlingSetting = Common.Settings.Settings.instance().createSetting(
      "calibrated-cpu-throttling",
      {},
      "Global"
      /* Common.Settings.SettingStorageType.GLOBAL */
    );
    this.#resetGroups();
    this.#view = view;
  }
  set recommendedOption(recommendedOption) {
    this.#recommendedOption = recommendedOption;
    this.requestUpdate();
  }
  wasShown() {
    super.wasShown();
    SDK.CPUThrottlingManager.CPUThrottlingManager.instance().addEventListener("RateChanged", this.#onOptionChange, this);
    this.#calibratedThrottlingSetting.addChangeListener(this.#onCalibratedSettingChanged, this);
    this.#onOptionChange();
  }
  willHide() {
    super.willHide();
    this.#calibratedThrottlingSetting.removeChangeListener(this.#onCalibratedSettingChanged, this);
    SDK.CPUThrottlingManager.CPUThrottlingManager.instance().removeEventListener("RateChanged", this.#onOptionChange, this);
  }
  #onOptionChange() {
    this.#currentOption = SDK.CPUThrottlingManager.CPUThrottlingManager.instance().cpuThrottlingOption();
    this.requestUpdate();
  }
  #onCalibratedSettingChanged() {
    this.#resetGroups();
    this.requestUpdate();
  }
  #onMenuItemSelected(event) {
    let option;
    if (typeof event.itemValue === "string") {
      if (event.itemValue === "low-tier-mobile") {
        option = SDK.CPUThrottlingManager.CalibratedLowTierMobileThrottlingOption;
      } else if (event.itemValue === "mid-tier-mobile") {
        option = SDK.CPUThrottlingManager.CalibratedMidTierMobileThrottlingOption;
      }
    } else {
      const rate = Number(event.itemValue);
      option = MobileThrottling.ThrottlingPresets.ThrottlingPresets.cpuThrottlingPresets.find((option2) => !option2.calibratedDeviceType && option2.rate() === rate);
    }
    if (option) {
      MobileThrottling.ThrottlingManager.throttlingManager().setCPUThrottlingOption(option);
    }
  }
  #onCalibrateClick() {
    void Common.Revealer.reveal(this.#calibratedThrottlingSetting);
  }
  #resetGroups() {
    this.#groups = [
      {
        name: "",
        items: MobileThrottling.ThrottlingPresets.ThrottlingPresets.cpuThrottlingPresets.filter((option) => !option.calibratedDeviceType)
      },
      {
        name: i18nString2(UIStrings2.labelCalibratedPresets),
        items: MobileThrottling.ThrottlingPresets.ThrottlingPresets.cpuThrottlingPresets.filter((option) => option.calibratedDeviceType)
      }
    ];
  }
  async performUpdate() {
    const input = {
      recommendedOption: this.#recommendedOption,
      currentOption: this.#currentOption,
      groups: this.#groups,
      throttling: this.#calibratedThrottlingSetting.get(),
      onMenuItemSelected: this.#onMenuItemSelected.bind(this),
      onCalibrateClick: this.#onCalibrateClick.bind(this)
    };
    this.#view(input, void 0, this.contentElement);
  }
};

// gen/front_end/panels/timeline/components/DetailsView.js
var DetailsView_exports = {};
__export(DetailsView_exports, {
  buildRowsForWebSocketEvent: () => buildRowsForWebSocketEvent,
  buildWarningElementsForEvent: () => buildWarningElementsForEvent,
  generateInvalidationsList: () => generateInvalidationsList
});
import * as i18n5 from "./../../../core/i18n/i18n.js";
import * as Platform from "./../../../core/platform/platform.js";
import * as Trace2 from "./../../../models/trace/trace.js";
import * as uiI18n from "./../../../ui/i18n/i18n.js";
import * as UI3 from "./../../../ui/legacy/legacy.js";
var UIStrings3 = {
  /**
   * @description Text in the Performance panel for a forced style and layout calculation of elements
   * in a page. See https://developer.mozilla.org/en-US/docs/Glossary/Reflow
   */
  forcedReflow: "Forced reflow",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   * @example {Forced reflow} PH1
   */
  sIsALikelyPerformanceBottleneck: "{PH1} is a likely performance bottleneck.",
  /**
   * @description Text in the Performance panel for a function called during a time the browser was
   * idle (inactive), which to longer to execute than a predefined deadline.
   * @example {10ms} PH1
   */
  idleCallbackExecutionExtended: "Idle callback execution extended beyond deadline by {PH1}",
  /**
   * @description Text in the Performance panel which describes how long a task took.
   * @example {task} PH1
   * @example {10ms} PH2
   */
  sTookS: "{PH1} took {PH2}.",
  /**
   * @description Text in the Performance panel for a task that took long. See
   * https://developer.mozilla.org/en-US/docs/Glossary/Long_task
   */
  longTask: "Long task",
  /**
   * @description Text used to highlight a long interaction and link to web.dev/inp
   */
  longInteractionINP: "Long interaction",
  /**
   * @description Text in Timeline UIUtils of the Performance panel when the
   *             user clicks on a long interaction.
   * @example {Long interaction} PH1
   */
  sIsLikelyPoorPageResponsiveness: "{PH1} is indicating poor page responsiveness.",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  websocketProtocol: "WebSocket protocol",
  /**
   * @description Details text indicating how many bytes were received in a WebSocket message
   * @example {1024} PH1
   */
  webSocketBytes: "{PH1} byte(s)",
  /**
   * @description Details text indicating how many bytes were sent in a WebSocket message
   */
  webSocketDataLength: "Data length"
};
var str_3 = i18n5.i18n.registerUIStrings("panels/timeline/components/DetailsView.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
function buildWarningElementsForEvent(event, parsedTrace) {
  const warnings = parsedTrace.data.Warnings.perEvent.get(event);
  const warningElements = [];
  if (!warnings) {
    return warningElements;
  }
  for (const warning of warnings) {
    const duration = Trace2.Helpers.Timing.microToMilli(Trace2.Types.Timing.Micro(event.dur || 0));
    const span = document.createElement("span");
    switch (warning) {
      case "FORCED_REFLOW": {
        const forcedReflowLink = UI3.XLink.XLink.create("https://developers.google.com/web/fundamentals/performance/rendering/avoid-large-complex-layouts-and-layout-thrashing#avoid-forced-synchronous-layouts", i18nString3(UIStrings3.forcedReflow), void 0, void 0, "forced-reflow");
        span.appendChild(uiI18n.getFormatLocalizedString(str_3, UIStrings3.sIsALikelyPerformanceBottleneck, { PH1: forcedReflowLink }));
        break;
      }
      case "IDLE_CALLBACK_OVER_TIME": {
        if (!Trace2.Types.Events.isFireIdleCallback(event)) {
          break;
        }
        const exceededMs = i18n5.TimeUtilities.millisToString((duration || 0) - event.args.data["allottedMilliseconds"], true);
        span.textContent = i18nString3(UIStrings3.idleCallbackExecutionExtended, { PH1: exceededMs });
        break;
      }
      case "LONG_TASK": {
        const longTaskLink = UI3.XLink.XLink.create("https://web.dev/optimize-long-tasks/", i18nString3(UIStrings3.longTask), void 0, void 0, "long-tasks");
        span.appendChild(uiI18n.getFormatLocalizedString(str_3, UIStrings3.sTookS, { PH1: longTaskLink, PH2: i18n5.TimeUtilities.millisToString(duration || 0, true) }));
        break;
      }
      case "LONG_INTERACTION": {
        const longInteractionINPLink = UI3.XLink.XLink.create("https://web.dev/inp", i18nString3(UIStrings3.longInteractionINP), void 0, void 0, "long-interaction");
        span.appendChild(uiI18n.getFormatLocalizedString(str_3, UIStrings3.sIsLikelyPoorPageResponsiveness, { PH1: longInteractionINPLink }));
        break;
      }
      default: {
        Platform.assertNever(warning, `Unhandled warning type ${warning}`);
      }
    }
    warningElements.push(span);
  }
  return warningElements;
}
function buildRowsForWebSocketEvent(event, parsedTrace) {
  const rows = [];
  const initiator = parsedTrace.data.Initiators.eventToInitiator.get(event);
  if (initiator && Trace2.Types.Events.isWebSocketCreate(initiator)) {
    rows.push({ key: i18n5.i18n.lockedString("URL"), value: initiator.args.data.url });
    if (initiator.args.data.websocketProtocol) {
      rows.push({ key: i18nString3(UIStrings3.websocketProtocol), value: initiator.args.data.websocketProtocol });
    }
  } else if (Trace2.Types.Events.isWebSocketCreate(event)) {
    rows.push({ key: i18n5.i18n.lockedString("URL"), value: event.args.data.url });
    if (event.args.data.websocketProtocol) {
      rows.push({ key: i18nString3(UIStrings3.websocketProtocol), value: event.args.data.websocketProtocol });
    }
  }
  if (Trace2.Types.Events.isWebSocketTransfer(event)) {
    if (event.args.data.dataLength) {
      rows.push({
        key: i18nString3(UIStrings3.webSocketDataLength),
        value: `${i18nString3(UIStrings3.webSocketBytes, { PH1: event.args.data.dataLength })}`
      });
    }
  }
  return rows;
}
function generateInvalidationsList(invalidations) {
  const groupedByReason = {};
  const backendNodeIds = /* @__PURE__ */ new Set();
  for (const invalidation of invalidations) {
    backendNodeIds.add(invalidation.args.data.nodeId);
    let reason = invalidation.args.data.reason || "unknown";
    if (reason === "unknown" && Trace2.Types.Events.isScheduleStyleInvalidationTracking(invalidation) && invalidation.args.data.invalidatedSelectorId) {
      switch (invalidation.args.data.invalidatedSelectorId) {
        case "attribute":
          reason = "Attribute";
          if (invalidation.args.data.changedAttribute) {
            reason += ` (${invalidation.args.data.changedAttribute})`;
          }
          break;
        case "class":
          reason = "Class";
          if (invalidation.args.data.changedClass) {
            reason += ` (${invalidation.args.data.changedClass})`;
          }
          break;
        case "id":
          reason = "Id";
          if (invalidation.args.data.changedId) {
            reason += ` (${invalidation.args.data.changedId})`;
          }
          break;
      }
    }
    if (reason === "PseudoClass" && Trace2.Types.Events.isStyleRecalcInvalidationTracking(invalidation) && invalidation.args.data.extraData) {
      reason += invalidation.args.data.extraData;
    }
    if (reason === "Attribute" && Trace2.Types.Events.isStyleRecalcInvalidationTracking(invalidation) && invalidation.args.data.extraData) {
      reason += ` (${invalidation.args.data.extraData})`;
    }
    if (reason === "StyleInvalidator") {
      continue;
    }
    const existing = groupedByReason[reason] || [];
    existing.push(invalidation);
    groupedByReason[reason] = existing;
  }
  return { groupedByReason, backendNodeIds };
}

// gen/front_end/panels/timeline/components/ExportTraceOptions.js
var ExportTraceOptions_exports = {};
__export(ExportTraceOptions_exports, {
  ExportTraceOptions: () => ExportTraceOptions
});
import "./../../../ui/components/tooltips/tooltips.js";
import "./../../../ui/components/buttons/buttons.js";
import * as Common2 from "./../../../core/common/common.js";
import * as Host from "./../../../core/host/host.js";
import * as i18n7 from "./../../../core/i18n/i18n.js";
import * as Buttons from "./../../../ui/components/buttons/buttons.js";
import * as Dialogs from "./../../../ui/components/dialogs/dialogs.js";
import * as ComponentHelpers2 from "./../../../ui/components/helpers/helpers.js";
import * as UI4 from "./../../../ui/legacy/legacy.js";
import * as Lit3 from "./../../../ui/lit/lit.js";
import * as VisualLogging3 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/timeline/components/exportTraceOptions.css.js
var exportTraceOptions_css_default = `/*
 * Copyright 2025 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
.export-trace-options-content {
  max-width: var(--sys-size-36);
}

.export-trace-options-row {
  display: flex;

  /* The tag name of CheckboxLabel element */
  devtools-checkbox {
    flex: auto;
  }

  devtools-button {
    height: 24px;
  }

  .export-trace-explanation {
    flex: 1;
    min-width: var(--sys-size-25);
  }
}

.export-trace-options-row-last {
  align-items: center;
}

.info-tooltip-container {
  max-width: var(--sys-size-28);
  white-space: normal;
}

x-link {
  color: var(--sys-color-primary);
  text-decoration-line: underline;
}

/*# sourceURL=${import.meta.resolve("./exportTraceOptions.css")} */`;

// gen/front_end/panels/timeline/components/ExportTraceOptions.js
var { html: html3 } = Lit3;
var UIStrings4 = {
  /**
   * @description Text title for the Save performance trace dialog.
   */
  exportTraceOptionsDialogTitle: "Save performance trace ",
  /**
   * @description Tooltip for the Save performance trace dialog.
   */
  showExportTraceOptionsDialogTitle: "Save trace\u2026",
  /**
   * @description Text for the include script content option.
   */
  includeResourceContent: "Include resource content",
  /**
   * @description Text for the include script source maps option.
   */
  includeSourcemap: "Include script source maps",
  /**
   * @description Text for the include annotations option.
   */
  includeAnnotations: "Include annotations",
  /**
   * @description Text for the compression option.
   */
  shouldCompress: "Compress with gzip",
  /**
   * @description Text for the explanation link
   */
  explanation: "Explanation",
  /**
   * @description Text for the save trace button
   */
  saveButtonTitle: "Save",
  /**
   * @description Text shown in the information pop-up next to the "Include resource content" option.
   */
  resourceContentPrivacyInfo: "Includes the full content of all loaded HTML, CSS, and scripts (except extensions).",
  /**
   * @description Text shown in the information pop-up next to the "Include script sourcemaps" option.
   */
  sourceMapsContentPrivacyInfo: "Includes available source maps, which may expose authored code.",
  /**
   * @description Text used as the start of the accessible label for the information button which shows additional context when the user focuses / hovers.
   */
  moreInfoLabel: "Additional information:"
};
var str_4 = i18n7.i18n.registerUIStrings("panels/timeline/components/ExportTraceOptions.ts", UIStrings4);
var i18nString4 = i18n7.i18n.getLocalizedString.bind(void 0, str_4);
var checkboxesWithInfoDialog = /* @__PURE__ */ new Set(["resource-content", "script-source-maps"]);
var ExportTraceOptions = class _ExportTraceOptions extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #data = null;
  static #includeAnnotationsSettingString = "export-performance-trace-include-annotations";
  static #includeResourceContentSettingString = "export-performance-trace-include-resources";
  static #includeSourceMapsSettingString = "export-performance-trace-include-sourcemaps";
  static #shouldCompressSettingString = "export-performance-trace-should-compress";
  #includeAnnotationsSetting = Common2.Settings.Settings.instance().createSetting(
    _ExportTraceOptions.#includeAnnotationsSettingString,
    true,
    "Session"
    /* Common.Settings.SettingStorageType.SESSION */
  );
  #includeResourceContentSetting = Common2.Settings.Settings.instance().createSetting(
    _ExportTraceOptions.#includeResourceContentSettingString,
    false,
    "Session"
    /* Common.Settings.SettingStorageType.SESSION */
  );
  #includeSourceMapsSetting = Common2.Settings.Settings.instance().createSetting(
    _ExportTraceOptions.#includeSourceMapsSettingString,
    false,
    "Session"
    /* Common.Settings.SettingStorageType.SESSION */
  );
  #shouldCompressSetting = Common2.Settings.Settings.instance().createSetting(
    _ExportTraceOptions.#shouldCompressSettingString,
    true,
    "Synced"
    /* Common.Settings.SettingStorageType.SYNCED */
  );
  #state = {
    dialogState: "collapsed",
    includeAnnotations: this.#includeAnnotationsSetting.get(),
    includeResourceContent: this.#includeResourceContentSetting.get(),
    includeSourceMaps: this.#includeSourceMapsSetting.get(),
    shouldCompress: this.#shouldCompressSetting.get()
  };
  #includeAnnotationsCheckbox = UI4.UIUtils.CheckboxLabel.create(
    /* title*/
    i18nString4(UIStrings4.includeAnnotations),
    /* checked*/
    this.#state.includeAnnotations,
    /* subtitle*/
    void 0,
    /* jslogContext*/
    "timeline.export-trace-options.annotations-checkbox"
  );
  #includeResourceContentCheckbox = UI4.UIUtils.CheckboxLabel.create(
    /* title*/
    i18nString4(UIStrings4.includeResourceContent),
    /* checked*/
    this.#state.includeResourceContent,
    /* subtitle*/
    void 0,
    /* jslogContext*/
    "timeline.export-trace-options.resource-content-checkbox"
  );
  #includeSourceMapsCheckbox = UI4.UIUtils.CheckboxLabel.create(
    /* title*/
    i18nString4(UIStrings4.includeSourcemap),
    /* checked*/
    this.#state.includeSourceMaps,
    /* subtitle*/
    void 0,
    /* jslogContext*/
    "timeline.export-trace-options.source-maps-checkbox"
  );
  #shouldCompressCheckbox = UI4.UIUtils.CheckboxLabel.create(
    /* title*/
    i18nString4(UIStrings4.shouldCompress),
    /* checked*/
    this.#state.shouldCompress,
    /* subtitle*/
    void 0,
    /* jslogContext*/
    "timeline.export-trace-options.should-compress-checkbox"
  );
  set data(data) {
    this.#data = data;
    this.#scheduleRender();
  }
  set state(state) {
    this.#state = state;
    this.#includeAnnotationsSetting.set(state.includeAnnotations);
    this.#includeResourceContentSetting.set(state.includeResourceContent);
    this.#includeSourceMapsSetting.set(state.includeSourceMaps);
    this.#shouldCompressSetting.set(state.shouldCompress);
    this.#scheduleRender();
  }
  get state() {
    return this.#state;
  }
  updateContentVisibility(options) {
    this.state = {
      ...this.#state,
      displayAnnotationsCheckbox: options.annotationsExist,
      displayResourceContentCheckbox: true,
      displaySourceMapsCheckbox: true
    };
  }
  #scheduleRender() {
    void ComponentHelpers2.ScheduledRender.scheduleRender(this, this.#render);
  }
  #checkboxOptionChanged(checkboxWithLabel, checked) {
    const newState = Object.assign({}, this.#state, {
      dialogState: "expanded"
      /* Dialogs.Dialog.DialogState.EXPANDED */
    });
    switch (checkboxWithLabel) {
      case this.#includeAnnotationsCheckbox: {
        newState.includeAnnotations = checked;
        break;
      }
      case this.#includeResourceContentCheckbox: {
        newState.includeResourceContent = checked;
        if (!newState.includeResourceContent) {
          newState.includeSourceMaps = false;
        }
        break;
      }
      case this.#includeSourceMapsCheckbox: {
        newState.includeSourceMaps = checked;
        break;
      }
      case this.#shouldCompressCheckbox: {
        newState.shouldCompress = checked;
        break;
      }
    }
    this.state = newState;
  }
  #accessibleLabelForInfoCheckbox(checkboxId) {
    if (checkboxId === "script-source-maps") {
      return i18nString4(UIStrings4.moreInfoLabel) + " " + i18nString4(UIStrings4.sourceMapsContentPrivacyInfo);
    }
    if (checkboxId === "resource-content") {
      return i18nString4(UIStrings4.moreInfoLabel) + " " + i18nString4(UIStrings4.resourceContentPrivacyInfo);
    }
    return "";
  }
  #renderCheckbox(checkboxId, checkboxWithLabel, title, checked) {
    UI4.Tooltip.Tooltip.install(checkboxWithLabel, title);
    checkboxWithLabel.ariaLabel = title;
    checkboxWithLabel.checked = checked;
    checkboxWithLabel.addEventListener("change", this.#checkboxOptionChanged.bind(this, checkboxWithLabel, !checked), false);
    this.#includeSourceMapsCheckbox.disabled = !this.#state.includeResourceContent;
    return html3`
        <div class='export-trace-options-row'>
          ${checkboxWithLabel}

          ${checkboxesWithInfoDialog.has(checkboxId) ? html3`
            <devtools-button
              aria-details=${`export-trace-tooltip-${checkboxId}`}
              .accessibleLabel=${this.#accessibleLabelForInfoCheckbox(checkboxId)}
              class="pen-icon"
              .iconName=${"info"}
              .variant=${"icon"}
              ></devtools-button>
            ` : Lit3.nothing}
        </div>
      `;
  }
  #renderInfoTooltip(checkboxId) {
    if (!checkboxesWithInfoDialog.has(checkboxId)) {
      return Lit3.nothing;
    }
    return html3`
    <devtools-tooltip
      variant="rich"
      id=${`export-trace-tooltip-${checkboxId}`}
    >
      <div class="info-tooltip-container">
      <p>
        ${checkboxId === "resource-content" ? i18nString4(UIStrings4.resourceContentPrivacyInfo) : Lit3.nothing}
        ${checkboxId === "script-source-maps" ? i18nString4(UIStrings4.sourceMapsContentPrivacyInfo) : Lit3.nothing}
      </p>
      </div>
    </devtools-tooltip>`;
  }
  #render() {
    if (!ComponentHelpers2.ScheduledRender.isScheduledRender(this)) {
      throw new Error("Export trace options dialog render was not scheduled");
    }
    const output = html3`
      <style>${exportTraceOptions_css_default}</style>
      <devtools-button-dialog class="export-trace-dialog"
      @click=${this.#onButtonDialogClick.bind(this)}
      .data=${{
      openOnRender: false,
      jslogContext: "timeline.export-trace-options",
      variant: "toolbar",
      iconName: "download",
      disabled: !this.#data?.buttonEnabled,
      iconTitle: i18nString4(UIStrings4.showExportTraceOptionsDialogTitle),
      horizontalAlignment: "auto",
      closeButton: false,
      dialogTitle: i18nString4(UIStrings4.exportTraceOptionsDialogTitle),
      state: this.#state.dialogState,
      closeOnESC: true
    }}>
        <div class='export-trace-options-content'>

          ${this.#state.displayAnnotationsCheckbox ? this.#renderCheckbox("annotations", this.#includeAnnotationsCheckbox, i18nString4(UIStrings4.includeAnnotations), this.#state.includeAnnotations) : ""}
          ${this.#state.displayResourceContentCheckbox ? this.#renderCheckbox("resource-content", this.#includeResourceContentCheckbox, i18nString4(UIStrings4.includeResourceContent), this.#state.includeResourceContent) : ""}
          ${this.#state.displayResourceContentCheckbox && this.#state.displaySourceMapsCheckbox ? this.#renderCheckbox("script-source-maps", this.#includeSourceMapsCheckbox, i18nString4(UIStrings4.includeSourcemap), this.#state.includeSourceMaps) : ""}
          ${this.#renderCheckbox("compress-with-gzip", this.#shouldCompressCheckbox, i18nString4(UIStrings4.shouldCompress), this.#state.shouldCompress)}
          <div class='export-trace-options-row export-trace-options-row-last'>
            <div class="export-trace-explanation">
              <x-link
                href="https://developer.chrome.com/docs/devtools/performance/save-trace"
                class=devtools-link
                jslog=${VisualLogging3.link().track({ click: true, keydown: "Enter|Space" }).context("save-trace-explanation")}>
                  ${i18nString4(UIStrings4.explanation)}
              </x-link>
            </div>
            <devtools-button
                  class="setup-button"
                  data-export-button
                  @click=${this.#onExportClick.bind(this)}
                  .data=${{
      variant: "primary",
      title: i18nString4(UIStrings4.saveButtonTitle)
    }}
                >${i18nString4(UIStrings4.saveButtonTitle)}</devtools-button>
                </div>
          ${this.#state.displayResourceContentCheckbox ? this.#renderInfoTooltip("resource-content") : Lit3.nothing}
          ${this.#state.displayResourceContentCheckbox && this.#state.displaySourceMapsCheckbox ? this.#renderInfoTooltip("script-source-maps") : Lit3.nothing}
        </div>
      </devtools-button-dialog>
    `;
    Lit3.render(output, this.#shadow, { host: this });
  }
  async #onButtonDialogClick() {
    this.state = Object.assign({}, this.#state, {
      dialogState: "expanded"
      /* Dialogs.Dialog.DialogState.EXPANDED */
    });
  }
  async #onExportCallback() {
    await this.#data?.onExport({
      includeResourceContent: this.#state.includeResourceContent,
      includeSourceMaps: this.#state.includeSourceMaps,
      // Note: this also includes track configuration ...
      addModifications: this.#state.includeAnnotations,
      shouldCompress: this.#state.shouldCompress
    });
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.PerfPanelTraceExported);
  }
  async #onExportClick() {
    await this.#onExportCallback();
    this.state = Object.assign({}, this.#state, {
      dialogState: "collapsed"
      /* Dialogs.Dialog.DialogState.COLLAPSED */
    });
  }
};
customElements.define("devtools-perf-export-trace-options", ExportTraceOptions);

// gen/front_end/panels/timeline/components/FieldSettingsDialog.js
var FieldSettingsDialog_exports = {};
__export(FieldSettingsDialog_exports, {
  FieldSettingsDialog: () => FieldSettingsDialog,
  ShowDialog: () => ShowDialog
});

// gen/front_end/panels/timeline/components/OriginMap.js
var OriginMap_exports = {};
__export(OriginMap_exports, {
  OriginMap: () => OriginMap
});
import "./../../../ui/components/icon_button/icon_button.js";
import * as i18n9 from "./../../../core/i18n/i18n.js";
import * as SDK2 from "./../../../core/sdk/sdk.js";
import * as CrUXManager from "./../../../models/crux-manager/crux-manager.js";
import * as RenderCoordinator from "./../../../ui/components/render_coordinator/render_coordinator.js";
import * as UI5 from "./../../../ui/legacy/legacy.js";
import * as Lit4 from "./../../../ui/lit/lit.js";

// gen/front_end/panels/timeline/components/originMap.css.js
var originMap_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.list {
  max-height: 200px;
}

.list-item:has(.origin-mapping-row.header) {
  position: sticky;
  top: 0;
  z-index: 1;
  background-color: var(--sys-color-cdt-base-container);
}

.origin-mapping-row {
  display: flex;
  flex-direction: row;
  width: 100%;
  /* Needs to be 30px because list items have a min height of 30px */
  height: 30px;
}

.origin-mapping-row.header {
  font-weight: var(--ref-typeface-weight-medium);
  border-bottom: 1px solid var(--sys-color-divider);
}

.origin-mapping-cell {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 4px;
  border-right: 1px solid var(--sys-color-divider);
}

.origin-warning-icon {
  width: 16px;
  height: 16px;
  margin-right: 4px;
  color: var(--icon-warning);
}

.origin {
  text-overflow: ellipsis;
  overflow-x: hidden;
}

.origin-mapping-cell:last-child {
  border: none;
}

.origin-mapping-editor {
  display: flex;
  flex-direction: row;
  width: 100%;
  padding: 12px 8px;
  gap: 12px;
}

.origin-mapping-editor label {
  flex: 1;
  font-weight: var(--ref-typeface-weight-medium);
}

.origin-mapping-editor input {
  margin-top: 4px;
  width: 100%;
}

/*# sourceURL=${import.meta.resolve("./originMap.css")} */`;

// gen/front_end/panels/timeline/components/OriginMap.js
var { html: html4 } = Lit4;
var UIStrings5 = {
  /**
   * @description Title for a column in a data table representing a site origin used for development
   */
  developmentOrigin: "Development origin",
  /**
   * @description Title for a column in a data table representing a site origin used by real users in a production environment
   */
  productionOrigin: "Production origin",
  /**
   * @description Warning message explaining that an input origin is not a valid origin or URL.
   * @example {http//malformed.com} PH1
   */
  invalidOrigin: '"{PH1}" is not a valid origin or URL.',
  /**
   * @description Warning message explaining that an development origin is already mapped to a productionOrigin.
   * @example {https://example.com} PH1
   */
  alreadyMapped: '"{PH1}" is already mapped to a production origin.',
  /**
   * @description Warning message explaining that a page doesn't have enough real user data to show any information for. "Chrome UX Report" is a product name and should not be translated.
   */
  pageHasNoData: "The Chrome UX Report does not have sufficient real user data for this page."
};
var str_5 = i18n9.i18n.registerUIStrings("panels/timeline/components/OriginMap.ts", UIStrings5);
var i18nString5 = i18n9.i18n.getLocalizedString.bind(void 0, str_5);
var DEV_ORIGIN_CONTROL = "developmentOrigin";
var PROD_ORIGIN_CONTROL = "productionOrigin";
var OriginMap = class extends UI5.Widget.WidgetElement {
  #list;
  #editor;
  constructor() {
    super();
    this.#list = new UI5.ListWidget.ListWidget(
      this,
      false,
      true
      /* isTable */
    );
    CrUXManager.CrUXManager.instance().getConfigSetting().addChangeListener(this.#updateListFromSetting, this);
    this.#updateListFromSetting();
  }
  createWidget() {
    const containerWidget = new UI5.Widget.Widget(this);
    this.#list.registerRequiredCSS(originMap_css_default);
    this.#list.show(containerWidget.contentElement);
    return containerWidget;
  }
  #pullMappingsFromSetting() {
    return CrUXManager.CrUXManager.instance().getConfigSetting().get().originMappings || [];
  }
  #pushMappingsToSetting(originMappings) {
    const setting = CrUXManager.CrUXManager.instance().getConfigSetting();
    const settingCopy = { ...setting.get() };
    settingCopy.originMappings = originMappings;
    setting.set(settingCopy);
  }
  #updateListFromSetting() {
    const mappings = this.#pullMappingsFromSetting();
    this.#list.clear();
    this.#list.appendItem({
      developmentOrigin: i18nString5(UIStrings5.developmentOrigin),
      productionOrigin: i18nString5(UIStrings5.productionOrigin),
      isTitleRow: true
    }, false);
    for (const originMapping of mappings) {
      this.#list.appendItem(originMapping, true);
    }
  }
  #getOrigin(url) {
    try {
      return new URL(url).origin;
    } catch {
      return null;
    }
  }
  #renderOriginWarning(url) {
    return RenderCoordinator.write(async () => {
      if (!CrUXManager.CrUXManager.instance().isEnabled()) {
        return Lit4.nothing;
      }
      const cruxManager = CrUXManager.CrUXManager.instance();
      const result = await cruxManager.getFieldDataForPage(url);
      const hasFieldData = Object.entries(result).some(([key, value]) => {
        if (key === "warnings") {
          return false;
        }
        return Boolean(value);
      });
      if (hasFieldData) {
        return Lit4.nothing;
      }
      return html4`
        <devtools-icon
          class="origin-warning-icon"
          name="warning-filled"
          title=${i18nString5(UIStrings5.pageHasNoData)}
        ></devtools-icon>
      `;
    });
  }
  startCreation() {
    const targetManager = SDK2.TargetManager.TargetManager.instance();
    const inspectedURL = targetManager.inspectedURL();
    const currentOrigin = this.#getOrigin(inspectedURL) || "";
    this.#list.addNewItem(-1, {
      developmentOrigin: currentOrigin,
      productionOrigin: ""
    });
  }
  renderItem(originMapping) {
    const element = document.createElement("div");
    element.classList.add("origin-mapping-row");
    element.role = "row";
    let cellRole;
    let warningIcon;
    if (originMapping.isTitleRow) {
      element.classList.add("header");
      cellRole = "columnheader";
      warningIcon = Lit4.nothing;
    } else {
      cellRole = "cell";
      warningIcon = Lit4.Directives.until(this.#renderOriginWarning(originMapping.productionOrigin));
    }
    Lit4.render(html4`
      <div class="origin-mapping-cell development-origin" role=${cellRole}>
        <div class="origin" title=${originMapping.developmentOrigin}>${originMapping.developmentOrigin}</div>
      </div>
      <div class="origin-mapping-cell production-origin" role=${cellRole}>
        ${warningIcon}
        <div class="origin" title=${originMapping.productionOrigin}>${originMapping.productionOrigin}</div>
      </div>
    `, element, { host: this });
    return element;
  }
  removeItemRequested(_item, index) {
    const mappings = this.#pullMappingsFromSetting();
    mappings.splice(index - 1, 1);
    this.#pushMappingsToSetting(mappings);
  }
  commitEdit(originMapping, editor, isNew) {
    originMapping.developmentOrigin = this.#getOrigin(editor.control(DEV_ORIGIN_CONTROL).value) || "";
    originMapping.productionOrigin = this.#getOrigin(editor.control(PROD_ORIGIN_CONTROL).value) || "";
    const mappings = this.#pullMappingsFromSetting();
    if (isNew) {
      mappings.push(originMapping);
    }
    this.#pushMappingsToSetting(mappings);
  }
  beginEdit(originMapping) {
    const editor = this.#createEditor();
    editor.control(DEV_ORIGIN_CONTROL).value = originMapping.developmentOrigin;
    editor.control(PROD_ORIGIN_CONTROL).value = originMapping.productionOrigin;
    return editor;
  }
  #developmentValidator(_item, index, input) {
    const origin = this.#getOrigin(input.value);
    if (!origin) {
      return { valid: false, errorMessage: i18nString5(UIStrings5.invalidOrigin, { PH1: input.value }) };
    }
    const mappings = this.#pullMappingsFromSetting();
    for (let i = 0; i < mappings.length; ++i) {
      if (i === index - 1) {
        continue;
      }
      const mapping = mappings[i];
      if (mapping.developmentOrigin === origin) {
        return { valid: true, errorMessage: i18nString5(UIStrings5.alreadyMapped, { PH1: origin }) };
      }
    }
    return { valid: true };
  }
  #productionValidator(_item, _index, input) {
    const origin = this.#getOrigin(input.value);
    if (!origin) {
      return { valid: false, errorMessage: i18nString5(UIStrings5.invalidOrigin, { PH1: input.value }) };
    }
    return { valid: true };
  }
  #createEditor() {
    if (this.#editor) {
      return this.#editor;
    }
    const editor = new UI5.ListWidget.Editor();
    this.#editor = editor;
    const content = editor.contentElement().createChild("div", "origin-mapping-editor");
    const devInput = editor.createInput(DEV_ORIGIN_CONTROL, "text", i18nString5(UIStrings5.developmentOrigin), this.#developmentValidator.bind(this));
    const prodInput = editor.createInput(PROD_ORIGIN_CONTROL, "text", i18nString5(UIStrings5.productionOrigin), this.#productionValidator.bind(this));
    Lit4.render(html4`
      <label class="development-origin-input">
        ${i18nString5(UIStrings5.developmentOrigin)}
        ${devInput}
      </label>
      <label class="production-origin-input">
        ${i18nString5(UIStrings5.productionOrigin)}
        ${prodInput}
      </label>
    `, content, { host: this });
    return editor;
  }
};
customElements.define("devtools-origin-map", OriginMap);

// gen/front_end/panels/timeline/components/FieldSettingsDialog.js
import * as i18n11 from "./../../../core/i18n/i18n.js";
import * as CrUXManager3 from "./../../../models/crux-manager/crux-manager.js";
import * as Buttons2 from "./../../../ui/components/buttons/buttons.js";
import * as Dialogs2 from "./../../../ui/components/dialogs/dialogs.js";
import * as ComponentHelpers3 from "./../../../ui/components/helpers/helpers.js";
import * as Input from "./../../../ui/components/input/input.js";
import * as uiI18n2 from "./../../../ui/i18n/i18n.js";
import * as UI6 from "./../../../ui/legacy/legacy.js";
import * as Lit5 from "./../../../ui/lit/lit.js";
import * as VisualLogging4 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/timeline/components/fieldSettingsDialog.css.js
var fieldSettingsDialog_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  display: block;
}

:host * {
  box-sizing: border-box;
}

devtools-dialog {
  --override-transparent: color-mix(in srgb, var(--color-background) 80%, transparent);
}

.section-title {
  font-size: var(--sys-typescale-headline5-size);
  line-height: var(--sys-typescale-headline5-line-height);
  font-weight: var(--ref-typeface-weight-medium);
  margin: 0;
}

.privacy-disclosure {
  margin: 8px 0;
}

.url-override {
  margin: 8px 0;
  display: flex;
  align-items: center;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: max-content;
}

details > summary {
  font-size: var(--sys-typescale-body4-size);
  line-height: var(--sys-typescale-body4-line-height);
  font-weight: var(--ref-typeface-weight-medium);
}

.content {
  max-width: 360px;
  box-sizing: border-box;
}

.open-button-section {
  display: flex;
  flex-direction: row;
}

.origin-mapping-grid {
  border: 1px solid var(--sys-color-divider);
  margin-top: 8px;
}

.origin-mapping-description {
  margin-bottom: 8px;
}

.origin-mapping-button-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: var(--sys-size-6);
}

.config-button {
  margin-left: auto;
}

.advanced-section-contents {
  margin: 4px 0 14px;
}

.buttons-section {
  display: flex;
  justify-content: space-between;
  margin-top: var(--sys-size-6);
  margin-bottom: var(--sys-size-2);

  devtools-button.enable {
    float: right;
  }
}

input[type="checkbox"] {
  height: 12px;
  width: 12px;
  min-height: 12px;
  min-width: 12px;
  margin: 6px;
}

input[type="text"][disabled] {
  color: var(--sys-color-state-disabled);
}

.warning {
  margin: 2px 8px;
  color: var(--color-error-text);
}

x-link {
  color: var(--sys-color-primary);
  text-decoration-line: underline;
}

.divider {
  margin: 10px 0;
  border: none;
  border-top: 1px solid var(--sys-color-divider);
}

/*# sourceURL=${import.meta.resolve("./fieldSettingsDialog.css")} */`;

// gen/front_end/panels/timeline/components/FieldSettingsDialog.js
var UIStrings6 = {
  /**
   * @description Text label for a button that opens a dialog to set up field metrics.
   */
  setUp: "Set up",
  /**
   * @description Text label for a button that opens a dialog to configure field metrics.
   */
  configure: "Configure",
  /**
   * @description Text label for a button that enables the collection of field metrics.
   */
  ok: "Ok",
  /**
   * @description Text label for a button that opts out of the collection of field metrics.
   */
  optOut: "Opt out",
  /**
   * @description Text label for a button that cancels the setup of field metrics collection.
   */
  cancel: "Cancel",
  /**
   * @description Text label for a checkbox that controls if a manual URL override is enabled for field metrics.
   */
  onlyFetchFieldData: "Always show field metrics for the below URL",
  /**
   * @description Text label for a text box that that contains the manual override URL for fetching field metrics.
   */
  url: "URL",
  /**
   * @description Warning message explaining that the Chrome UX Report could not find enough real world speed data for the page. "Chrome UX Report" is a product name and should not be translated.
   */
  doesNotHaveSufficientData: "The Chrome UX Report does not have sufficient real-world speed data for this page.",
  /**
   * @description Title for a dialog that contains information and settings related to fetching field metrics.
   */
  configureFieldData: "Configure field metrics fetching",
  /**
   * @description Paragraph explaining where field metrics comes from and and how it can be used. PH1 will be a link with text "Chrome UX Report" that is untranslated because it is a product name.
   * @example {Chrome UX Report} PH1
   */
  fetchAggregated: "Fetch aggregated field metrics from the {PH1} to help you contextualize local measurements with what real users experience on the site.",
  /**
   * @description Heading for a section that explains what user data needs to be collected to fetch field metrics.
   */
  privacyDisclosure: "Privacy disclosure",
  /**
   * @description Paragraph explaining what data needs to be sent to Google to fetch field metrics, and when that data will be sent.
   */
  whenPerformanceIsShown: "When DevTools is open, the URLs you visit will be sent to Google to query field metrics. These requests are not tied to your Google account.",
  /**
   * @description Header for a section containing advanced settings
   */
  advanced: "Advanced",
  /**
   * @description Paragraph explaining that the user can associate a development origin with a production origin for the purposes of fetching real user data.
   */
  mapDevelopmentOrigins: "Set a development origin to automatically get relevant field metrics for its production origin.",
  /**
   * @description Text label for a button that adds a new editable row to a data table
   */
  new: "New",
  /**
   * @description Warning message explaining that an input origin is not a valid origin or URL.
   * @example {http//malformed.com} PH1
   */
  invalidOrigin: '"{PH1}" is not a valid origin or URL.'
};
var str_6 = i18n11.i18n.registerUIStrings("panels/timeline/components/FieldSettingsDialog.ts", UIStrings6);
var i18nString6 = i18n11.i18n.getLocalizedString.bind(void 0, str_6);
var { html: html5, nothing: nothing5, Directives: { ifDefined } } = Lit5;
var ShowDialog = class _ShowDialog extends Event {
  static eventName = "showdialog";
  constructor() {
    super(_ShowDialog.eventName);
  }
};
var FieldSettingsDialog = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #dialog;
  #configSetting = CrUXManager3.CrUXManager.instance().getConfigSetting();
  #urlOverride = "";
  #urlOverrideEnabled = false;
  #urlOverrideWarning = "";
  #originMap;
  constructor() {
    super();
    const cruxManager = CrUXManager3.CrUXManager.instance();
    this.#configSetting = cruxManager.getConfigSetting();
    this.#resetToSettingState();
    this.#render();
  }
  #resetToSettingState() {
    const configSetting = this.#configSetting.get();
    this.#urlOverride = configSetting.override || "";
    this.#urlOverrideEnabled = configSetting.overrideEnabled || false;
    this.#urlOverrideWarning = "";
  }
  #flushToSetting(enabled) {
    const value = this.#configSetting.get();
    this.#configSetting.set({
      ...value,
      enabled,
      override: this.#urlOverride,
      overrideEnabled: this.#urlOverrideEnabled
    });
  }
  #onSettingsChanged() {
    void ComponentHelpers3.ScheduledRender.scheduleRender(this, this.#render);
  }
  async #urlHasFieldData(url) {
    const cruxManager = CrUXManager3.CrUXManager.instance();
    const result = await cruxManager.getFieldDataForPage(url);
    return Object.entries(result).some(([key, value]) => {
      if (key === "warnings") {
        return false;
      }
      return Boolean(value);
    });
  }
  async #submit(enabled) {
    if (enabled && this.#urlOverrideEnabled) {
      const origin = this.#getOrigin(this.#urlOverride);
      if (!origin) {
        this.#urlOverrideWarning = i18nString6(UIStrings6.invalidOrigin, { PH1: this.#urlOverride });
        void ComponentHelpers3.ScheduledRender.scheduleRender(this, this.#render);
        return;
      }
      const hasFieldData = await this.#urlHasFieldData(this.#urlOverride);
      if (!hasFieldData) {
        this.#urlOverrideWarning = i18nString6(UIStrings6.doesNotHaveSufficientData);
        void ComponentHelpers3.ScheduledRender.scheduleRender(this, this.#render);
        return;
      }
    }
    this.#flushToSetting(enabled);
    this.#closeDialog();
  }
  #showDialog() {
    if (!this.#dialog) {
      throw new Error("Dialog not found");
    }
    this.#resetToSettingState();
    void this.#dialog.setDialogVisible(true);
    void ComponentHelpers3.ScheduledRender.scheduleRender(this, this.#render);
    this.dispatchEvent(new ShowDialog());
  }
  #closeDialog(evt) {
    if (!this.#dialog) {
      throw new Error("Dialog not found");
    }
    void this.#dialog.setDialogVisible(false);
    if (evt) {
      evt.stopImmediatePropagation();
    }
    void ComponentHelpers3.ScheduledRender.scheduleRender(this, this.#render);
  }
  connectedCallback() {
    this.#configSetting.addChangeListener(this.#onSettingsChanged, this);
    void ComponentHelpers3.ScheduledRender.scheduleRender(this, this.#render);
  }
  disconnectedCallback() {
    this.#configSetting.removeChangeListener(this.#onSettingsChanged, this);
  }
  #renderOpenButton() {
    if (this.#configSetting.get().enabled) {
      return html5`
        <devtools-button
          class="config-button"
          @click=${this.#showDialog}
          .data=${{
        variant: "outlined",
        title: i18nString6(UIStrings6.configure)
      }}
        jslog=${VisualLogging4.action("timeline.field-data.configure").track({ click: true })}
        >${i18nString6(UIStrings6.configure)}</devtools-button>
      `;
    }
    return html5`
      <devtools-button
        class="setup-button"
        @click=${this.#showDialog}
        .data=${{
      variant: "primary",
      title: i18nString6(UIStrings6.setUp)
    }}
        jslog=${VisualLogging4.action("timeline.field-data.setup").track({ click: true })}
        data-field-data-setup
      >${i18nString6(UIStrings6.setUp)}</devtools-button>
    `;
  }
  #renderEnableButton() {
    return html5`
      <devtools-button
        @click=${() => {
      void this.#submit(true);
    }}
        .data=${{
      variant: "primary",
      title: i18nString6(UIStrings6.ok)
    }}
        class="enable"
        jslog=${VisualLogging4.action("timeline.field-data.enable").track({ click: true })}
        data-field-data-enable
      >${i18nString6(UIStrings6.ok)}</devtools-button>
    `;
  }
  #renderDisableButton() {
    const label = this.#configSetting.get().enabled ? i18nString6(UIStrings6.optOut) : i18nString6(UIStrings6.cancel);
    return html5`
      <devtools-button
        @click=${() => {
      void this.#submit(false);
    }}
        .data=${{
      variant: "outlined",
      title: label
    }}
        jslog=${VisualLogging4.action("timeline.field-data.disable").track({ click: true })}
        data-field-data-disable
      >${label}</devtools-button>
    `;
  }
  #onUrlOverrideChange(event) {
    event.stopPropagation();
    const input = event.target;
    this.#urlOverride = input.value;
    this.#urlOverrideWarning = "";
    void ComponentHelpers3.ScheduledRender.scheduleRender(this, this.#render);
  }
  #onUrlOverrideEnabledChange(event) {
    event.stopPropagation();
    const input = event.target;
    this.#urlOverrideEnabled = input.checked;
    this.#urlOverrideWarning = "";
    void ComponentHelpers3.ScheduledRender.scheduleRender(this, this.#render);
  }
  #getOrigin(url) {
    try {
      return new URL(url).origin;
    } catch {
      return null;
    }
  }
  #renderOriginMapGrid() {
    return html5`
      <div class="origin-mapping-description">${i18nString6(UIStrings6.mapDevelopmentOrigins)}</div>
      <devtools-origin-map
        ${Lit5.Directives.ref((el) => {
      if (el instanceof HTMLElement) {
        this.#originMap = el;
      }
    })}
      ></devtools-origin-map>
      <div class="origin-mapping-button-section">
        <devtools-button
          @click=${() => this.#originMap?.startCreation()}
          .data=${{
      variant: "text",
      title: i18nString6(UIStrings6.new),
      iconName: "plus"
    }}
          jslogContext="new-origin-mapping"
        >${i18nString6(UIStrings6.new)}</devtools-button>
      </div>
    `;
  }
  #render = () => {
    const linkEl = UI6.XLink.XLink.create("https://developer.chrome.com/docs/crux", i18n11.i18n.lockedString("Chrome UX Report"));
    const descriptionEl = uiI18n2.getFormatLocalizedString(str_6, UIStrings6.fetchAggregated, { PH1: linkEl });
    const output = html5`
      <style>${fieldSettingsDialog_css_default}</style>
      <style>${Input.textInputStyles}</style>
      <style>${Input.checkboxStyles}</style>
      <div class="open-button-section">${this.#renderOpenButton()}</div>
      <devtools-dialog
        @clickoutsidedialog=${this.#closeDialog}
        .position=${"auto"}
        .horizontalAlignment=${"center"}
        .jslogContext=${"timeline.field-data.settings"}
        .expectedMutationsSelector=${".timeline-settings-pane option"}
        .dialogTitle=${i18nString6(UIStrings6.configureFieldData)}
        ${Lit5.Directives.ref((el) => {
      if (el instanceof HTMLElement) {
        this.#dialog = el;
      }
    })}
      >
        <div class="content">
          <div>${descriptionEl}</div>
          <div class="privacy-disclosure">
            <h3 class="section-title">${i18nString6(UIStrings6.privacyDisclosure)}</h3>
            <div>${i18nString6(UIStrings6.whenPerformanceIsShown)}</div>
          </div>
          <details aria-label=${i18nString6(UIStrings6.advanced)}>
            <summary>${i18nString6(UIStrings6.advanced)}</summary>
            <div class="advanced-section-contents">
              ${this.#renderOriginMapGrid()}
              <hr class="divider">
              <label class="url-override">
                <input
                  type="checkbox"
                  .checked=${this.#urlOverrideEnabled}
                  @change=${this.#onUrlOverrideEnabledChange}
                  aria-label=${i18nString6(UIStrings6.onlyFetchFieldData)}
                  jslog=${VisualLogging4.toggle().track({ click: true }).context("field-url-override-enabled")}
                />
                ${i18nString6(UIStrings6.onlyFetchFieldData)}
              </label>
              <input
                type="text"
                @keyup=${this.#onUrlOverrideChange}
                @change=${this.#onUrlOverrideChange}
                class="devtools-text-input"
                .disabled=${!this.#urlOverrideEnabled}
                .value=${this.#urlOverride}
                placeholder=${ifDefined(this.#urlOverrideEnabled ? i18nString6(UIStrings6.url) : void 0)}
              />
              ${this.#urlOverrideWarning ? html5`<div class="warning" role="alert" aria-label=${this.#urlOverrideWarning}>${this.#urlOverrideWarning}</div>` : nothing5}
            </div>
          </details>
          <div class="buttons-section">
            ${this.#renderDisableButton()}
            ${this.#renderEnableButton()}
          </div>
        </div>
      </devtools-dialog>
    `;
    Lit5.render(output, this.#shadow, { host: this });
  };
};
customElements.define("devtools-field-settings-dialog", FieldSettingsDialog);

// gen/front_end/panels/timeline/components/IgnoreListSetting.js
var IgnoreListSetting_exports = {};
__export(IgnoreListSetting_exports, {
  IgnoreListSetting: () => IgnoreListSetting,
  regexInputIsValid: () => regexInputIsValid
});
import "./../../../ui/components/menus/menus.js";
import * as Common3 from "./../../../core/common/common.js";
import * as i18n13 from "./../../../core/i18n/i18n.js";
import * as Platform2 from "./../../../core/platform/platform.js";
import * as Workspace from "./../../../models/workspace/workspace.js";
import * as Buttons3 from "./../../../ui/components/buttons/buttons.js";
import * as Dialogs3 from "./../../../ui/components/dialogs/dialogs.js";
import * as ComponentHelpers4 from "./../../../ui/components/helpers/helpers.js";
import * as UI7 from "./../../../ui/legacy/legacy.js";
import * as Lit6 from "./../../../ui/lit/lit.js";

// gen/front_end/panels/timeline/components/ignoreListSetting.css.js
var ignoreListSetting_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
.ignore-list-setting-content {
  max-width: var(--sys-size-30);
}

.ignore-list-setting-description {
  margin-bottom: 5px;
}

.regex-row {
  display: flex;

  /* The tag name of CheckboxLabel element */
  devtools-checkbox {
    flex: auto;
  }

  devtools-button {
    height: 24px;
  }

  &:not(:hover) devtools-button {
    display: none;
  }
}

.new-regex-row {
  display: flex;

  .new-regex-text-input {
    flex: auto;
  }

  .harmony-input[type="text"] {
    /* padding: 3px 6px; */
    /* height: 24px; */
    border: 1px solid var(--sys-color-neutral-outline);
    border-radius: 4px;
    outline: none;

    &.error-input,
    &:invalid {
      border-color: var(--sys-color-error);
    }

    &:not(.error-input, :invalid):focus {
      border-color: var(--sys-color-state-focus-ring);
    }

    &:not(.error-input, :invalid):hover:not(:focus) {
      background: var(--sys-color-state-hover-on-subtle);
    }
  }
}

/*# sourceURL=${import.meta.resolve("./ignoreListSetting.css")} */`;

// gen/front_end/panels/timeline/components/IgnoreListSetting.js
var { html: html6 } = Lit6;
var UIStrings7 = {
  /**
   * @description Text title for the button to open the ignore list setting.
   */
  showIgnoreListSettingDialog: "Show ignore list setting dialog",
  /**
   * @description Text title for ignore list setting.
   */
  ignoreList: "Ignore list",
  /**
   * @description Text description for ignore list setting.
   */
  ignoreListDescription: "Add regular expression rules to remove matching scripts from the flame chart.",
  /**
   * @description Pattern title in Framework Ignore List Settings Tab of the Settings
   * @example {ad.*?} regex
   */
  ignoreScriptsWhoseNamesMatchS: "Ignore scripts whose names match ''{regex}''",
  /**
   * @description Label for the button to remove an regex
   * @example {ad.*?} regex
   */
  removeRegex: "Remove the regex: ''{regex}''",
  /**
   * @description Aria accessible name in Ignore List Settings Dialog in Performance panel. It labels the input
   * field used to add new or edit existing regular expressions that match file names to ignore in the debugger.
   */
  addNewRegex: "Add a regular expression rule for the script's URL",
  /**
   * @description Aria accessible name in Ignore List Settings Dialog in Performance panel. It labels the checkbox of
   * the input field used to enable the new regular expressions that match file names to ignore in the debugger.
   */
  ignoreScriptsWhoseNamesMatchNewRegex: "Ignore scripts whose names match the new regex"
};
var str_7 = i18n13.i18n.registerUIStrings("panels/timeline/components/IgnoreListSetting.ts", UIStrings7);
var i18nString7 = i18n13.i18n.getLocalizedString.bind(void 0, str_7);
var IgnoreListSetting = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #ignoreListEnabled = Common3.Settings.Settings.instance().moduleSetting("enable-ignore-listing");
  #regexPatterns = this.#getSkipStackFramesPatternSetting().getAsArray();
  #newRegexCheckbox = UI7.UIUtils.CheckboxLabel.create(
    /* title*/
    void 0,
    /* checked*/
    false,
    /* subtitle*/
    void 0,
    /* jslogContext*/
    "timeline.ignore-list-new-regex.checkbox"
  );
  #newRegexInput = UI7.UIUtils.createInput(
    /* className*/
    "new-regex-text-input",
    /* type*/
    "text",
    /* jslogContext*/
    "timeline.ignore-list-new-regex.text"
  );
  #editingRegexSetting = null;
  constructor() {
    super();
    this.#initAddNewItem();
    Common3.Settings.Settings.instance().moduleSetting("skip-stack-frames-pattern").addChangeListener(this.#scheduleRender.bind(this));
    Common3.Settings.Settings.instance().moduleSetting("enable-ignore-listing").addChangeListener(this.#scheduleRender.bind(this));
  }
  connectedCallback() {
    this.#scheduleRender();
    this.addEventListener("contextmenu", (e) => {
      e.stopPropagation();
    });
  }
  #scheduleRender() {
    void ComponentHelpers4.ScheduledRender.scheduleRender(this, this.#render);
  }
  #getSkipStackFramesPatternSetting() {
    return Common3.Settings.Settings.instance().moduleSetting("skip-stack-frames-pattern");
  }
  #startEditing() {
    this.#editingRegexSetting = { pattern: this.#newRegexInput.value, disabled: false, disabledForUrl: void 0 };
    this.#regexPatterns.push(this.#editingRegexSetting);
  }
  #finishEditing() {
    if (!this.#editingRegexSetting) {
      return;
    }
    const lastRegex = this.#regexPatterns.pop();
    if (lastRegex && lastRegex !== this.#editingRegexSetting) {
      console.warn("The last regex is not the editing one.");
      this.#regexPatterns.push(lastRegex);
    }
    this.#editingRegexSetting = null;
    this.#getSkipStackFramesPatternSetting().setAsArray(this.#regexPatterns);
  }
  #resetInput() {
    this.#newRegexCheckbox.checked = false;
    this.#newRegexInput.value = "";
  }
  #addNewRegexToIgnoreList() {
    const newRegex = this.#newRegexInput.value.trim();
    this.#finishEditing();
    if (!regexInputIsValid(newRegex)) {
      return;
    }
    Workspace.IgnoreListManager.IgnoreListManager.instance().addRegexToIgnoreList(newRegex);
    this.#resetInput();
  }
  #handleKeyDown(event) {
    if (event.key === Platform2.KeyboardUtilities.ENTER_KEY) {
      this.#addNewRegexToIgnoreList();
      this.#startEditing();
      return;
    }
    if (event.key === Platform2.KeyboardUtilities.ESCAPE_KEY) {
      event.stopImmediatePropagation();
      this.#finishEditing();
      this.#resetInput();
      this.#newRegexInput.blur();
    }
  }
  /**
   * When it is in the 'preview' mode, the last regex in the array is the editing one.
   * So we want to remove it for some usage, like rendering the existed rules or validating the rules.
   */
  #getExistingRegexes() {
    if (this.#editingRegexSetting) {
      const lastRegex = this.#regexPatterns[this.#regexPatterns.length - 1];
      if (lastRegex && lastRegex === this.#editingRegexSetting) {
        return this.#regexPatterns.slice(0, -1);
      }
    }
    return this.#regexPatterns;
  }
  #handleInputChange() {
    const newRegex = this.#newRegexInput.value.trim();
    if (this.#editingRegexSetting && regexInputIsValid(newRegex)) {
      this.#editingRegexSetting.pattern = newRegex;
      this.#editingRegexSetting.disabled = !Boolean(newRegex);
      this.#getSkipStackFramesPatternSetting().setAsArray(this.#regexPatterns);
    }
  }
  #initAddNewItem() {
    this.#newRegexInput.placeholder = "/framework\\.js$";
    const checkboxHelpText = i18nString7(UIStrings7.ignoreScriptsWhoseNamesMatchNewRegex);
    const inputHelpText = i18nString7(UIStrings7.addNewRegex);
    UI7.Tooltip.Tooltip.install(this.#newRegexCheckbox, checkboxHelpText);
    UI7.Tooltip.Tooltip.install(this.#newRegexInput, inputHelpText);
    this.#newRegexInput.addEventListener("blur", this.#addNewRegexToIgnoreList.bind(this), false);
    this.#newRegexInput.addEventListener("keydown", this.#handleKeyDown.bind(this), false);
    this.#newRegexInput.addEventListener("input", this.#handleInputChange.bind(this), false);
    this.#newRegexInput.addEventListener("focus", this.#startEditing.bind(this), false);
  }
  #renderNewRegexRow() {
    return html6`
      <div class='new-regex-row'>${this.#newRegexCheckbox}${this.#newRegexInput}</div>
    `;
  }
  /**
   * Deal with an existing regex being toggled. Note that this handler only
   * deals with enabling/disabling regexes already in the ignore list, it does
   * not deal with enabling/disabling the new regex.
   */
  #onExistingRegexEnableToggle(regex, checkbox) {
    regex.disabled = !checkbox.checked;
    this.#getSkipStackFramesPatternSetting().setAsArray(this.#regexPatterns);
  }
  #removeRegexByIndex(index) {
    this.#regexPatterns.splice(index, 1);
    this.#getSkipStackFramesPatternSetting().setAsArray(this.#regexPatterns);
  }
  #renderItem(regex, index) {
    const checkboxWithLabel = UI7.UIUtils.CheckboxLabel.createWithStringLiteral(
      regex.pattern,
      !regex.disabled,
      /* jslogContext*/
      "timeline.ignore-list-pattern"
    );
    const helpText = i18nString7(UIStrings7.ignoreScriptsWhoseNamesMatchS, { regex: regex.pattern });
    UI7.Tooltip.Tooltip.install(checkboxWithLabel, helpText);
    checkboxWithLabel.ariaLabel = helpText;
    checkboxWithLabel.addEventListener("change", this.#onExistingRegexEnableToggle.bind(this, regex, checkboxWithLabel), false);
    return html6`
      <div class='regex-row'>
        ${checkboxWithLabel}
        <devtools-button
            @click=${this.#removeRegexByIndex.bind(this, index)}
            .data=${{
      variant: "icon",
      iconName: "bin",
      title: i18nString7(UIStrings7.removeRegex, { regex: regex.pattern }),
      jslogContext: "timeline.ignore-list-pattern.remove"
    }}></devtools-button>
      </div>
    `;
  }
  #render() {
    if (!ComponentHelpers4.ScheduledRender.isScheduledRender(this)) {
      throw new Error("Ignore List setting dialog render was not scheduled");
    }
    const output = html6`
      <style>${ignoreListSetting_css_default}</style>
      <devtools-button-dialog .data=${{
      openOnRender: false,
      jslogContext: "timeline.ignore-list",
      variant: "toolbar",
      iconName: "compress",
      disabled: !this.#ignoreListEnabled.get(),
      iconTitle: i18nString7(UIStrings7.showIgnoreListSettingDialog),
      horizontalAlignment: "auto",
      closeButton: true,
      dialogTitle: i18nString7(UIStrings7.ignoreList)
    }}>
        <div class='ignore-list-setting-content'>
          <div class='ignore-list-setting-description'>${i18nString7(UIStrings7.ignoreListDescription)}</div>
          ${this.#getExistingRegexes().map(this.#renderItem.bind(this))}
          ${this.#renderNewRegexRow()}
        </div>
      </devtools-button-dialog>
    `;
    Lit6.render(output, this.#shadow, { host: this });
  }
};
customElements.define("devtools-perf-ignore-list-setting", IgnoreListSetting);
function regexInputIsValid(inputValue) {
  const pattern = inputValue.trim();
  if (!pattern.length) {
    return false;
  }
  let regex;
  try {
    regex = new RegExp(pattern);
  } catch {
  }
  return Boolean(regex);
}

// gen/front_end/panels/timeline/components/InteractionBreakdown.js
var InteractionBreakdown_exports = {};
__export(InteractionBreakdown_exports, {
  InteractionBreakdown: () => InteractionBreakdown
});
import * as i18n15 from "./../../../core/i18n/i18n.js";
import * as ComponentHelpers5 from "./../../../ui/components/helpers/helpers.js";
import * as Lit7 from "./../../../ui/lit/lit.js";

// gen/front_end/panels/timeline/components/interactionBreakdown.css.js
var interactionBreakdown_css_default = `/*
 * Copyright 2023 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  display: block;
}

.breakdown {
  margin: 0;
  padding: 0;
  list-style: none;
  color: var(--sys-color-token-subtle);
}

.value {
  display: inline-block;
  padding: 0 5px;
  color: var(--sys-color-on-surface);
}

/*# sourceURL=${import.meta.resolve("./interactionBreakdown.css")} */`;

// gen/front_end/panels/timeline/components/InteractionBreakdown.js
var { html: html7 } = Lit7;
var UIStrings8 = {
  /**
   * @description Text shown next to the interaction event's input delay time in the detail view.
   */
  inputDelay: "Input delay",
  /**
   * @description Text shown next to the interaction event's thread processing duration in the detail view.
   */
  processingDuration: "Processing duration",
  /**
   * @description Text shown next to the interaction event's presentation delay time in the detail view.
   */
  presentationDelay: "Presentation delay"
};
var str_8 = i18n15.i18n.registerUIStrings("panels/timeline/components/InteractionBreakdown.ts", UIStrings8);
var i18nString8 = i18n15.i18n.getLocalizedString.bind(void 0, str_8);
var InteractionBreakdown = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #entry = null;
  set entry(entry) {
    if (entry === this.#entry) {
      return;
    }
    this.#entry = entry;
    void ComponentHelpers5.ScheduledRender.scheduleRender(this, this.#render);
  }
  #render() {
    if (!this.#entry) {
      return;
    }
    const inputDelay = i18n15.TimeUtilities.formatMicroSecondsAsMillisFixed(this.#entry.inputDelay);
    const mainThreadTime = i18n15.TimeUtilities.formatMicroSecondsAsMillisFixed(this.#entry.mainThreadHandling);
    const presentationDelay = i18n15.TimeUtilities.formatMicroSecondsAsMillisFixed(this.#entry.presentationDelay);
    Lit7.render(html7`<style>${interactionBreakdown_css_default}</style>
             <ul class="breakdown">
                     <li data-entry="input-delay">${i18nString8(UIStrings8.inputDelay)}<span class="value">${inputDelay}</span></li>
                     <li data-entry="processing-duration">${i18nString8(UIStrings8.processingDuration)}<span class="value">${mainThreadTime}</span></li>
                     <li data-entry="presentation-delay">${i18nString8(UIStrings8.presentationDelay)}<span class="value">${presentationDelay}</span></li>
                   </ul>
                   `, this.#shadow, { host: this });
  }
};
customElements.define("devtools-interaction-breakdown", InteractionBreakdown);

// gen/front_end/panels/timeline/components/LayoutShiftDetails.js
var LayoutShiftDetails_exports = {};
__export(LayoutShiftDetails_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW2,
  LayoutShiftDetails: () => LayoutShiftDetails
});
import * as i18n17 from "./../../../core/i18n/i18n.js";
import * as SDK3 from "./../../../core/sdk/sdk.js";
import * as Helpers3 from "./../../../models/trace/helpers/helpers.js";
import * as Trace3 from "./../../../models/trace/trace.js";
import * as Buttons4 from "./../../../ui/components/buttons/buttons.js";
import * as LegacyComponents from "./../../../ui/legacy/components/utils/utils.js";
import * as UI8 from "./../../../ui/legacy/legacy.js";
import * as Lit8 from "./../../../ui/lit/lit.js";
import * as Insights from "./insights/insights.js";

// gen/front_end/panels/timeline/components/layoutShiftDetails.css.js
var layoutShiftDetails_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
@scope to (devtools-widget > *) {
  .layout-shift-details-title,
  .cluster-details-title {
    padding-bottom: var(--sys-size-5);
    display: flex;
    align-items: center;

    .layout-shift-event-title,
    .cluster-event-title {
      background-color: var(--app-color-rendering);
      width: var(--sys-size-6);
      height: var(--sys-size-6);
      border: var(--sys-size-1) solid var(--sys-color-divider);
      /* so the border adds onto the width/height */
      box-sizing: content-box;
      display: inline-block;
      margin-right: var(--sys-size-3);
    }
  }

  .layout-shift-details-table {
    font: var(--sys-typescale-body4-regular);
    margin-bottom: var(--sys-size-4);
    text-align: left;
    border-block: var(--sys-size-1) solid var(--sys-color-divider);
    border-collapse: collapse;
    font-variant-numeric: tabular-nums;

    th,
    td {
      padding-right: var(--sys-size-4);
      min-width: var(--sys-size-20);
      max-width: var(--sys-size-28);
    }
  }

  .table-title {
    th {
      font: var(--sys-typescale-body4-medium);
    }

    tr {
      border-bottom: var(--sys-size-1) solid var(--sys-color-divider);
    }
  }

  /** TODO: This is duplicated in sidebarInsights.css. Should make a component. */
  .timeline-link {
    cursor: pointer;
    text-decoration: underline;
    color: var(--sys-color-primary);
    /* for a11y reasons this is a button, so we have to remove some default
    * styling */
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    text-align: left;
  }

  .parent-cluster-link {
    margin-left: var(--sys-size-2);
  }

  .timeline-link.invalid-link {
    color: var(--sys-color-state-disabled);
  }

  .details-row {
    display: flex;
    min-height: var(--sys-size-9);
  }

  .title {
    color: var(--sys-color-token-subtle);
    overflow: hidden;
    padding-right: var(--sys-size-5);
    display: inline-block;
    vertical-align: top;
  }

  .culprit {
    display: inline-flex;
    flex-direction: row;
    gap: var(--sys-size-3);
  }

  .value {
    display: inline-block;
    user-select: text;
    text-overflow: ellipsis;
    overflow: hidden;
    padding: 0 var(--sys-size-3);
  }

  .layout-shift-summary-details,
  .layout-shift-cluster-summary-details {
    font: var(--sys-typescale-body4-regular);
    display: flex;
    flex-direction: column;
    column-gap: var(--sys-size-4);
    padding: var(--sys-size-5) var(--sys-size-5) 0 var(--sys-size-5);
  }

  .culprits {
    display: flex;
    flex-direction: column;
  }

  .shift-row:not(:last-child) {
    border-bottom: var(--sys-size-1) solid var(--sys-color-divider);
  }

  .total-row {
    font: var(--sys-typescale-body4-medium);
  }
}

/*# sourceURL=${import.meta.resolve("./layoutShiftDetails.css")} */`;

// gen/front_end/panels/timeline/components/LayoutShiftDetails.js
var { html: html8, render: render8 } = Lit8;
var MAX_URL_LENGTH = 20;
var UIStrings9 = {
  /**
   * @description Text referring to the start time of a given event.
   */
  startTime: "Start time",
  /**
   * @description Text for a table header referring to the score of a Layout Shift event.
   */
  shiftScore: "Shift score",
  /**
   * @description Text for a table header referring to the elements shifted for a Layout Shift event.
   */
  elementsShifted: "Elements shifted",
  /**
   * @description Text for a table header referring to the culprit of a Layout Shift event.
   */
  culprit: "Culprit",
  /**
   * @description Text for a culprit type of Injected iframe.
   */
  injectedIframe: "Injected iframe",
  /**
   * @description Text for a culprit type of Font request.
   */
  fontRequest: "Font request",
  /**
   * @description Text for a culprit type of non-composited animation.
   */
  nonCompositedAnimation: "Non-composited animation",
  /**
   * @description Text referring to an animation.
   */
  animation: "Animation",
  /**
   * @description Text referring to a parent cluster.
   */
  parentCluster: "Parent cluster",
  /**
   * @description Text referring to a layout shift cluster and its start time.
   * @example {32 ms} PH1
   */
  cluster: "Layout shift cluster @ {PH1}",
  /**
   * @description Text referring to a layout shift and its start time.
   * @example {32 ms} PH1
   */
  layoutShift: "Layout shift @ {PH1}",
  /**
   * @description Text referring to the total cumulative score of a layout shift cluster.
   */
  total: "Total",
  /**
   * @description Text for a culprit type of Unsized image.
   */
  unsizedImage: "Unsized image"
};
var str_9 = i18n17.i18n.registerUIStrings("panels/timeline/components/LayoutShiftDetails.ts", UIStrings9);
var i18nString9 = i18n17.i18n.getLocalizedString.bind(void 0, str_9);
var LayoutShiftDetails = class extends UI8.Widget.Widget {
  #view;
  #event = null;
  #parsedTrace = null;
  #isFreshRecording = false;
  constructor(element, view = DEFAULT_VIEW2) {
    super(element);
    this.#view = view;
  }
  set event(event) {
    this.#event = event;
    void this.requestUpdate();
  }
  set parsedTrace(parsedTrace) {
    this.#parsedTrace = parsedTrace;
    void this.requestUpdate();
  }
  set isFreshRecording(isFreshRecording) {
    this.#isFreshRecording = isFreshRecording;
    void this.requestUpdate();
  }
  // TODO(crbug.com/368170718): use eventRef instead
  #handleTraceEventClick(event) {
    this.contentElement.dispatchEvent(new Insights.EventRef.EventReferenceClick(event));
  }
  #togglePopover(e) {
    const show = e.type === "mouseover";
    if (e.type === "mouseleave") {
      this.contentElement.dispatchEvent(new CustomEvent("toggle-popover", { detail: { show }, bubbles: true, composed: true }));
    }
    if (!(e.target instanceof HTMLElement) || !this.#event) {
      return;
    }
    const rowEl = e.target.closest("tbody tr");
    if (!rowEl?.parentElement) {
      return;
    }
    const event = Trace3.Types.Events.isSyntheticLayoutShift(this.#event) ? this.#event : this.#event.events.find((e2) => e2.ts === parseInt(rowEl.getAttribute("data-ts") ?? "", 10));
    this.contentElement.dispatchEvent(new CustomEvent("toggle-popover", { detail: { event, show }, bubbles: true, composed: true }));
  }
  performUpdate() {
    this.#view({
      event: this.#event,
      parsedTrace: this.#parsedTrace,
      isFreshRecording: this.#isFreshRecording,
      togglePopover: (e) => this.#togglePopover(e),
      onEventClick: (e) => this.#handleTraceEventClick(e)
    }, {}, this.contentElement);
  }
};
var DEFAULT_VIEW2 = (input, _output, target) => {
  if (!input.event || !input.parsedTrace) {
    render8(Lit8.nothing, target);
    return;
  }
  const title = Trace3.Name.forEntry(input.event);
  render8(html8`
        <style>${layoutShiftDetails_css_default}</style>
        <style>${Buttons4.textButtonStyles}</style>

      <div class="layout-shift-summary-details">
        <div
          class="event-details"
          @mouseover=${input.togglePopover}
          @mouseleave=${input.togglePopover}
        >
        <div class="layout-shift-details-title">
          <div class="layout-shift-event-title"></div>
          ${title}
        </div>
        ${Trace3.Types.Events.isSyntheticLayoutShift(input.event) ? renderLayoutShiftDetails(input.event, input.parsedTrace.insights, input.parsedTrace, input.isFreshRecording, input.onEventClick) : renderLayoutShiftClusterDetails(input.event, input.parsedTrace.insights, input.parsedTrace, input.onEventClick)}
        </div>
      </div>
      `, target);
};
function findInsightSet(insightSets, navigationId) {
  return insightSets?.values().find((insightSet) => navigationId ? navigationId === insightSet.navigation?.args.data?.navigationId : !insightSet.navigation);
}
function renderLayoutShiftDetails(layoutShift, insightSets, parsedTrace, isFreshRecording, onEventClick) {
  if (!insightSets) {
    return Lit8.nothing;
  }
  const clsInsight = findInsightSet(insightSets, layoutShift.args.data?.navigationId)?.model.CLSCulprits;
  if (!clsInsight || clsInsight instanceof Error) {
    return Lit8.nothing;
  }
  const rootCauses = clsInsight.shifts.get(layoutShift);
  let elementsShifted = layoutShift.args.data?.impacted_nodes ?? [];
  if (!isFreshRecording) {
    elementsShifted = elementsShifted?.filter((el) => el.debug_name);
  }
  const hasCulprits = rootCauses && (rootCauses.webFonts.length || rootCauses.iframes.length || rootCauses.nonCompositedAnimations.length || rootCauses.unsizedImages.length);
  const hasShiftedElements = elementsShifted?.length;
  const parentCluster = clsInsight.clusters.find((cluster) => {
    return cluster.events.find((event) => event === layoutShift);
  });
  return html8`
      <table class="layout-shift-details-table">
        <thead class="table-title">
          <tr>
            <th>${i18nString9(UIStrings9.startTime)}</th>
            <th>${i18nString9(UIStrings9.shiftScore)}</th>
            ${hasShiftedElements ? html8`
              <th>${i18nString9(UIStrings9.elementsShifted)}</th>` : Lit8.nothing}
            ${hasCulprits ? html8`
              <th>${i18nString9(UIStrings9.culprit)}</th> ` : Lit8.nothing}
          </tr>
        </thead>
        <tbody>
          ${renderShiftRow(layoutShift, true, parsedTrace, elementsShifted, onEventClick, rootCauses)}
        </tbody>
      </table>
      ${renderParentCluster(parentCluster, onEventClick, parsedTrace)}
    `;
}
function renderLayoutShiftClusterDetails(cluster, insightSets, parsedTrace, onEventClick) {
  if (!insightSets) {
    return Lit8.nothing;
  }
  const clsInsight = findInsightSet(insightSets, cluster.navigationId)?.model.CLSCulprits;
  if (!clsInsight || clsInsight instanceof Error) {
    return Lit8.nothing;
  }
  const clusterCulprits = Array.from(clsInsight.shifts.entries()).filter(([key]) => cluster.events.includes(key)).map(([, value]) => value).flatMap((x) => Object.values(x)).flat();
  const hasCulprits = Boolean(clusterCulprits.length);
  return html8`
    <table class="layout-shift-details-table">
      <thead class="table-title">
        <tr>
          <th>${i18nString9(UIStrings9.startTime)}</th>
          <th>${i18nString9(UIStrings9.shiftScore)}</th>
          <th>${i18nString9(UIStrings9.elementsShifted)}</th>
          ${hasCulprits ? html8`
            <th>${i18nString9(UIStrings9.culprit)}</th> ` : Lit8.nothing}
        </tr>
      </thead>
      <tbody>
        ${cluster.events.map((shift) => {
    const rootCauses = clsInsight.shifts.get(shift);
    const elementsShifted = shift.args.data?.impacted_nodes ?? [];
    return renderShiftRow(shift, false, parsedTrace, elementsShifted, onEventClick, rootCauses);
  })}

        <tr>
          <td class="total-row">${i18nString9(UIStrings9.total)}</td>
          <td class="total-row">${cluster.clusterCumulativeScore.toFixed(4)}</td>
        </tr>
      </tbody>
    </table>
  `;
}
function renderShiftRow(currentShift, userHasSingleShiftSelected, parsedTrace, elementsShifted, onEventClick, rootCauses) {
  const score = currentShift.args.data?.weighted_score_delta;
  if (!score) {
    return Lit8.nothing;
  }
  const hasCulprits = Boolean(rootCauses && (rootCauses.webFonts.length || rootCauses.iframes.length || rootCauses.nonCompositedAnimations.length || rootCauses.unsizedImages.length));
  return html8`
      <tr class="shift-row" data-ts=${currentShift.ts}>
        <td>${renderStartTime(currentShift, userHasSingleShiftSelected, parsedTrace, onEventClick)}</td>
        <td>${score.toFixed(4)}</td>
        ${elementsShifted.length ? html8`
          <td>
            <div class="elements-shifted">
              ${renderShiftedElements(currentShift, elementsShifted)}
            </div>
          </td>` : Lit8.nothing}
        ${hasCulprits ? html8`
          <td class="culprits">
            ${rootCauses?.webFonts.map((fontReq) => renderFontRequest(fontReq))}
            ${rootCauses?.iframes.map((iframe) => renderIframe(iframe))}
            ${rootCauses?.nonCompositedAnimations.map((failure) => renderAnimation(failure, onEventClick))}
            ${rootCauses?.unsizedImages.map((unsizedImage) => renderUnsizedImage(currentShift.args.frame, unsizedImage))}
          </td>` : Lit8.nothing}
      </tr>`;
}
function renderStartTime(shift, userHasSingleShiftSelected, parsedTrace, onEventClick) {
  const ts = Trace3.Types.Timing.Micro(shift.ts - parsedTrace.data.Meta.traceBounds.min);
  if (userHasSingleShiftSelected) {
    return html8`${i18n17.TimeUtilities.preciseMillisToString(Helpers3.Timing.microToMilli(ts))}`;
  }
  const shiftTs = i18n17.TimeUtilities.formatMicroSecondsTime(ts);
  return html8`
         <button type="button" class="timeline-link" @click=${() => onEventClick(shift)}>${i18nString9(UIStrings9.layoutShift, { PH1: shiftTs })}</button>`;
}
function renderParentCluster(cluster, onEventClick, parsedTrace) {
  if (!cluster) {
    return Lit8.nothing;
  }
  const ts = Trace3.Types.Timing.Micro(cluster.ts - (parsedTrace.data.Meta.traceBounds.min ?? 0));
  const clusterTs = i18n17.TimeUtilities.formatMicroSecondsTime(ts);
  return html8`
      <span class="parent-cluster">${i18nString9(UIStrings9.parentCluster)}:<button type="button" class="timeline-link parent-cluster-link" @click=${() => onEventClick(cluster)}>${i18nString9(UIStrings9.cluster, { PH1: clusterTs })}</button>
      </span>`;
}
function renderShiftedElements(shift, elementsShifted) {
  return html8`
      ${elementsShifted?.map((el) => {
    if (el.node_id !== void 0) {
      return html8`
            <devtools-performance-node-link
              .data=${{
        backendNodeId: el.node_id,
        frame: shift.args.frame,
        fallbackHtmlSnippet: el.debug_name
      }}>
            </devtools-performance-node-link>`;
    }
    return Lit8.nothing;
  })}`;
}
function renderAnimation(failure, onEventClick) {
  const event = failure.animation;
  if (!event) {
    return Lit8.nothing;
  }
  return html8`
        <span class="culprit">
        <span class="culprit-type">${i18nString9(UIStrings9.nonCompositedAnimation)}: </span>
        <button type="button" class="culprit-value timeline-link" @click=${() => onEventClick(event)}>${i18nString9(UIStrings9.animation)}</button>
      </span>`;
}
function renderUnsizedImage(frame, unsizedImage) {
  const el = html8`
      <devtools-performance-node-link
        .data=${{
    backendNodeId: unsizedImage.backendNodeId,
    frame,
    fallbackUrl: unsizedImage.paintImageEvent.args.data.url
  }}>
      </devtools-performance-node-link>`;
  return html8`
      <span class="culprit">
        <span class="culprit-type">${i18nString9(UIStrings9.unsizedImage)}: </span>
        <span class="culprit-value">${el}</span>
      </span>`;
}
function renderFontRequest(request) {
  const linkifiedURL = linkifyURL(request.args.data.url);
  return html8`
      <span class="culprit">
        <span class="culprit-type">${i18nString9(UIStrings9.fontRequest)}: </span>
        <span class="culprit-value">${linkifiedURL}</span>
      </span>`;
}
function linkifyURL(url) {
  return LegacyComponents.Linkifier.Linkifier.linkifyURL(url, {
    tabStop: true,
    showColumnNumber: false,
    inlineFrameIndex: 0,
    maxLength: MAX_URL_LENGTH
  });
}
function renderIframe(iframeRootCause) {
  const domLoadingId = iframeRootCause.frame;
  const domLoadingFrame = SDK3.FrameManager.FrameManager.instance().getFrame(domLoadingId);
  let el;
  if (domLoadingFrame) {
    el = LegacyComponents.Linkifier.Linkifier.linkifyRevealable(domLoadingFrame, domLoadingFrame.displayName());
  } else {
    el = linkifyURL(iframeRootCause.url);
  }
  return html8`
      <span class="culprit">
        <span class="culprit-type"> ${i18nString9(UIStrings9.injectedIframe)}: </span>
        <span class="culprit-value">${el}</span>
      </span>`;
}

// gen/front_end/panels/timeline/components/LiveMetricsView.js
var LiveMetricsView_exports = {};
__export(LiveMetricsView_exports, {
  LiveMetricsView: () => LiveMetricsView
});
import "./../../../ui/components/settings/settings.js";
import "./../../../ui/components/icon_button/icon_button.js";

// gen/front_end/panels/timeline/components/NetworkThrottlingSelector.js
var NetworkThrottlingSelector_exports = {};
__export(NetworkThrottlingSelector_exports, {
  NetworkThrottlingSelector: () => NetworkThrottlingSelector
});
import "./../../../ui/components/icon_button/icon_button.js";
import "./../../../ui/components/menus/menus.js";
import * as Common4 from "./../../../core/common/common.js";
import * as i18n19 from "./../../../core/i18n/i18n.js";
import * as Platform3 from "./../../../core/platform/platform.js";
import * as SDK4 from "./../../../core/sdk/sdk.js";
import * as ComponentHelpers6 from "./../../../ui/components/helpers/helpers.js";
import * as Lit9 from "./../../../ui/lit/lit.js";
import * as VisualLogging5 from "./../../../ui/visual_logging/visual_logging.js";
import * as MobileThrottling2 from "./../../mobile_throttling/mobile_throttling.js";

// gen/front_end/panels/timeline/components/networkThrottlingSelector.css.js
var networkThrottlingSelector_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  display: flex;
  align-items: center;
  max-width: 100%;
  height: 20px;
}

devtools-icon[name="info"] {
  margin-left: var(--sys-size-3);
  width: var(--sys-size-8);
  height: var(--sys-size-8);
}

devtools-select-menu {
  min-width: 160px;
  max-width: 100%;
  height: 20px;
}

/*# sourceURL=${import.meta.resolve("./networkThrottlingSelector.css")} */`;

// gen/front_end/panels/timeline/components/NetworkThrottlingSelector.js
var { html: html9, nothing: nothing7 } = Lit9;
var UIStrings10 = {
  /**
   * @description Text label for a selection box showing which network throttling option is applied.
   * @example {No throttling} PH1
   */
  network: "Network: {PH1}",
  /**
   * @description Text label for a selection box showing which network throttling option is applied.
   * @example {No throttling} PH1
   */
  networkThrottling: "Network throttling: {PH1}",
  /**
   * @description Text label for a selection box showing that a specific option is recommended for network throttling.
   * @example {Fast 4G} PH1
   */
  recommendedThrottling: "{PH1} \u2013 recommended",
  /**
   * @description Text for why user should change a throttling setting.
   */
  recommendedThrottlingReason: "Consider changing setting to simulate real user environments",
  /**
   * @description Text label for a menu group that disables network throttling.
   */
  disabled: "Disabled",
  /**
   * @description Text label for a menu group that contains default presets for network throttling.
   */
  presets: "Presets",
  /**
   * @description Text label for a menu group that contains custom presets for network throttling.
   */
  custom: "Custom",
  /**
   * @description Text label for a menu option to add a new custom throttling preset.
   */
  add: "Add\u2026"
};
var str_10 = i18n19.i18n.registerUIStrings("panels/timeline/components/NetworkThrottlingSelector.ts", UIStrings10);
var i18nString10 = i18n19.i18n.getLocalizedString.bind(void 0, str_10);
var NetworkThrottlingSelector = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #customNetworkConditionsSetting;
  #groups = [];
  #currentConditions;
  #recommendedConditions = null;
  constructor() {
    super();
    this.#customNetworkConditionsSetting = Common4.Settings.Settings.instance().moduleSetting("custom-network-conditions");
    this.#resetPresets();
    this.#currentConditions = SDK4.NetworkManager.MultitargetNetworkManager.instance().networkConditions();
    this.#render();
  }
  set recommendedConditions(recommendedConditions) {
    this.#recommendedConditions = recommendedConditions;
    void ComponentHelpers6.ScheduledRender.scheduleRender(this, this.#render);
  }
  connectedCallback() {
    SDK4.NetworkManager.MultitargetNetworkManager.instance().addEventListener("ConditionsChanged", this.#onConditionsChanged, this);
    this.#onConditionsChanged();
    this.#customNetworkConditionsSetting.addChangeListener(this.#onSettingChanged, this);
  }
  disconnectedCallback() {
    SDK4.NetworkManager.MultitargetNetworkManager.instance().removeEventListener("ConditionsChanged", this.#onConditionsChanged, this);
    this.#customNetworkConditionsSetting.removeChangeListener(this.#onSettingChanged, this);
  }
  #resetPresets() {
    this.#groups = [
      {
        name: i18nString10(UIStrings10.disabled),
        items: [
          SDK4.NetworkManager.NoThrottlingConditions
        ]
      },
      {
        name: i18nString10(UIStrings10.presets),
        items: MobileThrottling2.ThrottlingPresets.ThrottlingPresets.networkPresets
      },
      {
        name: i18nString10(UIStrings10.custom),
        items: this.#customNetworkConditionsSetting.get(),
        showCustomAddOption: true,
        jslogContext: "custom-network-throttling-item"
      }
    ];
  }
  #onConditionsChanged() {
    this.#currentConditions = SDK4.NetworkManager.MultitargetNetworkManager.instance().networkConditions();
    void ComponentHelpers6.ScheduledRender.scheduleRender(this, this.#render);
  }
  #onMenuItemSelected(event) {
    const newConditions = this.#groups.flatMap((g) => g.items).find((item5) => {
      const keyForItem = this.#keyForNetworkConditions(item5);
      return keyForItem === event.itemValue;
    });
    if (newConditions) {
      SDK4.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(newConditions);
    }
  }
  #onSettingChanged() {
    this.#resetPresets();
    void ComponentHelpers6.ScheduledRender.scheduleRender(this, this.#render);
  }
  #getConditionsTitle(conditions) {
    return conditions.title instanceof Function ? conditions.title() : conditions.title;
  }
  #onAddClick() {
    void Common4.Revealer.reveal(this.#customNetworkConditionsSetting);
  }
  /**
   * The key that uniquely identifies the condition setting. All the DevTools
   * presets have the i18nKey, so we rely on that, but for custom user added
   * ones we fallback to using the title (it wouldn't make sense for a user to
   * add presets with the same title)
   */
  #keyForNetworkConditions(conditions) {
    return conditions.i18nTitleKey || this.#getConditionsTitle(conditions);
  }
  #render = () => {
    const selectionTitle = this.#getConditionsTitle(this.#currentConditions);
    const selectedConditionsKey = this.#keyForNetworkConditions(this.#currentConditions);
    let recommendedInfoEl;
    if (this.#recommendedConditions && this.#currentConditions === SDK4.NetworkManager.NoThrottlingConditions) {
      recommendedInfoEl = html9`<devtools-icon
        title=${i18nString10(UIStrings10.recommendedThrottlingReason)}
        name=info></devtools-icon>`;
    }
    const output = html9`
      <style>${networkThrottlingSelector_css_default}</style>
      <devtools-select-menu
        @selectmenuselected=${this.#onMenuItemSelected}
        .showDivider=${true}
        .showArrow=${true}
        .sideButton=${false}
        .showSelectedItem=${true}
        .jslogContext=${"network-conditions"}
        .buttonTitle=${i18nString10(UIStrings10.network, { PH1: selectionTitle })}
        .title=${i18nString10(UIStrings10.networkThrottling, { PH1: selectionTitle })}
      >
        ${this.#groups.map((group) => {
      return html9`
            <devtools-menu-group .name=${group.name} .title=${group.name}>
              ${group.items.map((conditions) => {
        let title = this.#getConditionsTitle(conditions);
        if (conditions === this.#recommendedConditions) {
          title = i18nString10(UIStrings10.recommendedThrottling, { PH1: title });
        }
        const key = this.#keyForNetworkConditions(conditions);
        const jslogContext = group.jslogContext || Platform3.StringUtilities.toKebabCase(conditions.i18nTitleKey || title);
        return html9`
                  <devtools-menu-item
                    .value=${key}
                    .selected=${selectedConditionsKey === key}
                    .title=${title}
                    jslog=${VisualLogging5.item(jslogContext).track({ click: true })}
                  >
                    ${title}
                  </devtools-menu-item>
                `;
      })}
              ${group.showCustomAddOption ? html9`
                <devtools-menu-item
                  .value=${1}
                  .title=${i18nString10(UIStrings10.add)}
                  jslog=${VisualLogging5.action("add").track({ click: true })}
                  @click=${this.#onAddClick}
                >
                  ${i18nString10(UIStrings10.add)}
                </devtools-menu-item>
              ` : nothing7}
            </devtools-menu-group>
          `;
    })}
      </devtools-select-menu>
      ${recommendedInfoEl}
    `;
    Lit9.render(output, this.#shadow, { host: this });
  };
};
customElements.define("devtools-network-throttling-selector", NetworkThrottlingSelector);

// gen/front_end/panels/timeline/components/LiveMetricsView.js
import "./../../../ui/components/menus/menus.js";

// gen/front_end/panels/timeline/components/MetricCard.js
var MetricCard_exports = {};
__export(MetricCard_exports, {
  MetricCard: () => MetricCard
});
import * as i18n25 from "./../../../core/i18n/i18n.js";
import * as Platform5 from "./../../../core/platform/platform.js";
import * as CrUXManager5 from "./../../../models/crux-manager/crux-manager.js";
import * as Buttons5 from "./../../../ui/components/buttons/buttons.js";
import * as ComponentHelpers7 from "./../../../ui/components/helpers/helpers.js";
import * as UIHelpers from "./../../../ui/helpers/helpers.js";
import * as Lit10 from "./../../../ui/lit/lit.js";

// gen/front_end/panels/timeline/components/metricCard.css.js
var metricCard_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.metric-card {
  border-radius: var(--sys-shape-corner-small);
  padding: 14px 16px;
  background-color: var(--sys-color-surface3);
  height: 100%;
  box-sizing: border-box;

  &:not(:hover) .title-help {
    visibility: hidden;
  }
}

.title {
  display: flex;
  justify-content: space-between;
  font-size: var(--sys-typescale-headline5-size);
  line-height: var(--sys-typescale-headline5-line-height);
  font-weight: var(--ref-typeface-weight-medium);
  margin: 0;
  margin-bottom: 6px;
}

.title-help {
  height: var(--sys-typescale-headline5-line-height);
  margin-left: 4px;
}

.metric-values-section {
  position: relative;
  display: flex;
  column-gap: 8px;
  margin-bottom: 8px;
}

.metric-values-section:focus-visible {
  outline: 2px solid -webkit-focus-ring-color;
}

.metric-source-block {
  flex: 1;
}

.metric-source-value {
  font-size: 32px;
  line-height: 36px;
  font-weight: var(--ref-typeface-weight-regular);
}

.metric-source-label {
  font-weight: var(--ref-typeface-weight-medium);
}

.warning {
  margin-top: 4px;
  color: var(--sys-color-error);
  font-size: var(--sys-typescale-body4-size);
  line-height: var(--sys-typescale-body4-line-height);
  display: flex;

  &::before {
    content: " ";
    width: var(--sys-typescale-body4-line-height);
    height: var(--sys-typescale-body4-line-height);
    mask-size: var(--sys-typescale-body4-line-height);
    mask-image: var(--image-file-warning);
    background-color: var(--sys-color-error);
    margin-right: 4px;
    flex-shrink: 0;
  }
}

.good-bg {
  background-color: var(--app-color-performance-good);
}

.needs-improvement-bg {
  background-color: var(--app-color-performance-ok);
}

.poor-bg {
  background-color: var(--app-color-performance-bad);
}

.divider {
  width: 100%;
  border: 0;
  border-bottom: 1px solid var(--sys-color-divider);
  margin: 8px 0;
  box-sizing: border-box;
}

.compare-text {
  margin-top: 8px;
}

.environment-recs-intro {
  margin-top: 8px;
}

.environment-recs {
  margin: 9px 0;
}

.environment-recs > summary {
  font-weight: var(--ref-typeface-weight-medium);
  margin-bottom: 4px;
  font-size: var(--sys-typescale-body4-size);
  line-height: var(--sys-typescale-body4-line-height);
  display: flex;

  &::before {
    content: " ";
    width: var(--sys-typescale-body4-line-height);
    height: var(--sys-typescale-body4-line-height);
    mask-size: var(--sys-typescale-body4-line-height);
    mask-image: var(--image-file-triangle-right);
    background-color: var(--icon-default);
    margin-right: 4px;
    flex-shrink: 0;
  }
}

details.environment-recs[open] > summary::before {
  mask-image: var(--image-file-triangle-down);
}

.environment-recs-list {
  margin: 0;
}

.detailed-compare-text {
  margin-bottom: 8px;
}

.bucket-summaries {
  margin-top: 8px;
  white-space: nowrap;
}

.bucket-summaries.histogram {
  display: grid;
  grid-template-columns: minmax(min-content, auto) minmax(40px, 60px) max-content;
  grid-auto-rows: 1fr;
  column-gap: 8px;
  place-items: center flex-end;
}

.bucket-label {
  justify-self: start;
  font-weight: var(--ref-typeface-weight-medium);
  white-space: wrap;

  > * {
    white-space: nowrap;
  }
}

.bucket-range {
  color: var(--sys-color-token-subtle);
}

.histogram-bar {
  height: 6px;
}

.histogram-percent {
  color: var(--sys-color-token-subtle);
  font-weight: var(--ref-typeface-weight-medium);
}

.tooltip {
  display: none;
  visibility: hidden;
  transition-property: visibility;
  width: min(var(--tooltip-container-width, 350px), 350px);
  max-width: max-content;
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
  box-sizing: border-box;
  padding: var(--sys-size-5) var(--sys-size-6);
  border-radius: var(--sys-shape-corner-small);
  background-color: var(--sys-color-cdt-base-container);
  box-shadow: var(--drop-shadow-depth-3);

  .tooltip-scroll {
    overflow-x: auto;

    .tooltip-contents {
      min-width: min-content;
    }
  }
}

.phase-table {
  display: grid;
  column-gap: var(--sys-size-3);
  white-space: nowrap;
}

.phase-table-row {
  display: contents;
}

.phase-table-value {
  text-align: right;
}

.phase-table-header-row {
  font-weight: var(--ref-typeface-weight-medium);
}

/*# sourceURL=${import.meta.resolve("./metricCard.css")} */`;

// gen/front_end/panels/timeline/components/MetricCompareStrings.js
import * as i18n21 from "./../../../core/i18n/i18n.js";
import * as uiI18n3 from "./../../../ui/i18n/i18n.js";
var UIStrings11 = {
  /**
   * @description Text block that compares a local metric value to real user experiences. "local" refers to a developers local testing environment.
   * @example {LCP} PH1
   * @example {500 ms} PH2
   */
  goodBetterCompare: "Your local {PH1} value of {PH2} is good, but is significantly better than your users\u2019 experience.",
  /**
   * @description Text block that compares a local metric value to real user experiences. "local" refers to a developers local testing environment.
   * @example {LCP} PH1
   * @example {500 ms} PH2
   */
  goodWorseCompare: "Your local {PH1} value of {PH2} is good, but is significantly worse than your users\u2019 experience.",
  /**
   * @description Text block that compares a local metric value to real user experiences. "local" refers to a developers local testing environment.
   * @example {LCP} PH1
   * @example {500 ms} PH2
   */
  goodSimilarCompare: "Your local {PH1} value of {PH2} is good, and is similar to your users\u2019 experience.",
  /**
   * @description Text block that summarize a local metric value. "local" refers to a developers local testing environment.
   * @example {LCP} PH1
   * @example {500 ms} PH2
   */
  goodSummarized: "Your local {PH1} value of {PH2} is good.",
  /**
   * @description Text block that compares a local metric value to real user experiences. "local" refers to a developers local testing environment.
   * @example {LCP} PH1
   * @example {500 ms} PH2
   */
  needsImprovementBetterCompare: "Your local {PH1} value of {PH2} needs improvement, but is significantly better than your users\u2019 experience.",
  /**
   * @description Text block that compares a local metric value to real user experiences. "local" refers to a developers local testing environment.
   * @example {LCP} PH1
   * @example {500 ms} PH2
   */
  needsImprovementWorseCompare: "Your local {PH1} value of {PH2} needs improvement, but is significantly worse than your users\u2019 experience.",
  /**
   * @description Text block that compares a local metric value to real user experiences. "local" refers to a developers local testing environment.
   * @example {LCP} PH1
   * @example {500 ms} PH2
   */
  needsImprovementSimilarCompare: "Your local {PH1} value of {PH2} needs improvement, and is similar to your users\u2019 experience.",
  /**
   * @description Text block that summarize a local metric value. "local" refers to a developers local testing environment.
   * @example {LCP} PH1
   * @example {500 ms} PH2
   */
  needsImprovementSummarized: "Your local {PH1} value of {PH2} needs improvement.",
  /**
   * @description Text block that compares a local metric value to real user experiences. "local" refers to a developers local testing environment.
   * @example {LCP} PH1
   * @example {500 ms} PH2
   */
  poorBetterCompare: "Your local {PH1} value of {PH2} is poor, but is significantly better than your users\u2019 experience.",
  /**
   * @description Text block that compares a local metric value to real user experiences. "local" refers to a developers local testing environment.
   * @example {LCP} PH1
   * @example {500 ms} PH2
   */
  poorWorseCompare: "Your local {PH1} value of {PH2} is poor, but is significantly worse than your users\u2019 experience.",
  /**
   * @description Text block that compares a local metric value to real user experiences. "local" refers to a developers local testing environment.
   * @example {LCP} PH1
   * @example {500 ms} PH2
   */
  poorSimilarCompare: "Your local {PH1} value of {PH2} is poor, and is similar to your users\u2019 experience.",
  /**
   * @description Text block that summarize a local metric value. "local" refers to a developers local testing environment.
   * @example {LCP} PH1
   * @example {500 ms} PH2
   */
  poorSummarized: "Your local {PH1} value of {PH2} is poor.",
  /**
   * @description Text block that compares a local metric value to real user experiences. "field metrics" should be interpreted as "real user data". "local" refers to a developers local testing environment.
   * @example {LCP} PH1
   * @example {500 ms} PH2
   * @example {400 ms} PH3
   * @example {40%} PH4
   */
  goodGoodDetailedCompare: "Your local {PH1} value of {PH2} is good and is rated the same as {PH4} of real-user {PH1} experiences. Additionally, the field metrics 75th percentile {PH1} value of {PH3} is good.",
  /**
   * @description Text block that compares a local metric value to real user experiences. "field metrics" should be interpreted as "real user data". "local" refers to a developers local testing environment.
   * @example {LCP} PH1
   * @example {500 ms} PH2
   * @example {400 ms} PH3
   * @example {40%} PH4
   */
  goodNeedsImprovementDetailedCompare: "Your local {PH1} value of {PH2} is good and is rated the same as {PH4} of real-user {PH1} experiences. However, the field metrics 75th percentile {PH1} value of {PH3} needs improvement.",
  /**
   * @description Text block that compares a local metric value to real user experiences. "field metrics" should be interpreted as "real user data". "local" refers to a developers local testing environment.
   * @example {LCP} PH1
   * @example {500 ms} PH2
   * @example {400 ms} PH3
   * @example {40%} PH4
   */
  goodPoorDetailedCompare: "Your local {PH1} value of {PH2} is good and is rated the same as {PH4} of real-user {PH1} experiences. However, the field metrics 75th percentile {PH1} value of {PH3} is poor.",
  /**
   * @description Text block that compares a local metric value to real user experiences. "field metrics" should be interpreted as "real user data". "local" refers to a developers local testing environment.
   * @example {LCP} PH1
   * @example {500 ms} PH2
   * @example {400 ms} PH3
   * @example {40%} PH4
   */
  needsImprovementGoodDetailedCompare: "Your local {PH1} value of {PH2} needs improvement and is rated the same as {PH4} of real-user {PH1} experiences. However, the field metrics 75th percentile {PH1} value of {PH3} is good.",
  /**
   * @description Text block that compares a local metric value to real user experiences. "field metrics" should be interpreted as "real user data". "local" refers to a developers local testing environment.
   * @example {LCP} PH1
   * @example {500 ms} PH2
   * @example {400 ms} PH3
   * @example {40%} PH4
   */
  needsImprovementNeedsImprovementDetailedCompare: "Your local {PH1} value of {PH2} needs improvement and is rated the same as {PH4} of real-user {PH1} experiences. Additionally, the field metrics 75th percentile {PH1} value of {PH3} needs improvement.",
  /**
   * @description Text block that compares a local metric value to real user experiences. "field metrics" should be interpreted as "real user data". "local" refers to a developers local testing environment.
   * @example {LCP} PH1
   * @example {500 ms} PH2
   * @example {400 ms} PH3
   * @example {40%} PH4
   */
  needsImprovementPoorDetailedCompare: "Your local {PH1} value of {PH2} needs improvement and is rated the same as {PH4} of real-user {PH1} experiences. However, the field metrics 75th percentile {PH1} value of {PH3} is poor.",
  /**
   * @description Text block that compares a local metric value to real user experiences. "field metrics" should be interpreted as "real user data". "local" refers to a developers local testing environment.
   * @example {LCP} PH1
   * @example {500 ms} PH2
   * @example {400 ms} PH3
   * @example {40%} PH4
   */
  poorGoodDetailedCompare: "Your local {PH1} value of {PH2} is poor and is rated the same as {PH4} of real-user {PH1} experiences. However, the field metrics 75th percentile {PH1} value of {PH3} is good.",
  /**
   * @description Text block that compares a local metric value to real user experiences. "field metrics" should be interpreted as "real user data". "local" refers to a developers local testing environment.
   * @example {LCP} PH1
   * @example {500 ms} PH2
   * @example {400 ms} PH3
   * @example {40%} PH4
   */
  poorNeedsImprovementDetailedCompare: "Your local {PH1} value of {PH2} is poor and is rated the same as {PH4} of real-user {PH1} experiences. However, the field metrics 75th percentile {PH1} value of {PH3} needs improvement.",
  /**
   * @description Text block that compares a local metric value to real user experiences. "field metrics" should be interpreted as "real user data". "local" refers to a developers local testing environment.
   * @example {LCP} PH1
   * @example {500 ms} PH2
   * @example {400 ms} PH3
   * @example {40%} PH4
   */
  poorPoorDetailedCompare: "Your local {PH1} value of {PH2} is poor and is rated the same as {PH4} of real-user {PH1} experiences. Additionally, the field metrics 75th percentile {PH1} value of {PH3} is poor."
};
var str_11 = i18n21.i18n.registerUIStrings("panels/timeline/components/MetricCompareStrings.ts", UIStrings11);
function renderCompareText(options) {
  const { rating, compare } = options;
  const values = {
    PH1: options.metric,
    PH2: options.localValue
  };
  if (rating === "good" && compare === "better") {
    return uiI18n3.getFormatLocalizedString(str_11, UIStrings11.goodBetterCompare, values);
  }
  if (rating === "good" && compare === "worse") {
    return uiI18n3.getFormatLocalizedString(str_11, UIStrings11.goodWorseCompare, values);
  }
  if (rating === "good" && compare === "similar") {
    return uiI18n3.getFormatLocalizedString(str_11, UIStrings11.goodSimilarCompare, values);
  }
  if (rating === "good" && !compare) {
    return uiI18n3.getFormatLocalizedString(str_11, UIStrings11.goodSummarized, values);
  }
  if (rating === "needs-improvement" && compare === "better") {
    return uiI18n3.getFormatLocalizedString(str_11, UIStrings11.needsImprovementBetterCompare, values);
  }
  if (rating === "needs-improvement" && compare === "worse") {
    return uiI18n3.getFormatLocalizedString(str_11, UIStrings11.needsImprovementWorseCompare, values);
  }
  if (rating === "needs-improvement" && compare === "similar") {
    return uiI18n3.getFormatLocalizedString(str_11, UIStrings11.needsImprovementSimilarCompare, values);
  }
  if (rating === "needs-improvement" && !compare) {
    return uiI18n3.getFormatLocalizedString(str_11, UIStrings11.needsImprovementSummarized, values);
  }
  if (rating === "poor" && compare === "better") {
    return uiI18n3.getFormatLocalizedString(str_11, UIStrings11.poorBetterCompare, values);
  }
  if (rating === "poor" && compare === "worse") {
    return uiI18n3.getFormatLocalizedString(str_11, UIStrings11.poorWorseCompare, values);
  }
  if (rating === "poor" && compare === "similar") {
    return uiI18n3.getFormatLocalizedString(str_11, UIStrings11.poorSimilarCompare, values);
  }
  if (rating === "poor" && !compare) {
    return uiI18n3.getFormatLocalizedString(str_11, UIStrings11.poorSummarized, values);
  }
  throw new Error("Compare string not found");
}
function renderDetailedCompareText(options) {
  const { localRating, fieldRating } = options;
  const values = {
    PH1: options.metric,
    PH2: options.localValue,
    PH3: options.fieldValue,
    PH4: options.percent
  };
  if (localRating === "good" && fieldRating === "good") {
    return uiI18n3.getFormatLocalizedString(str_11, UIStrings11.goodGoodDetailedCompare, values);
  }
  if (localRating === "good" && fieldRating === "needs-improvement") {
    return uiI18n3.getFormatLocalizedString(str_11, UIStrings11.goodNeedsImprovementDetailedCompare, values);
  }
  if (localRating === "good" && fieldRating === "poor") {
    return uiI18n3.getFormatLocalizedString(str_11, UIStrings11.goodPoorDetailedCompare, values);
  }
  if (localRating === "good" && !fieldRating) {
    return uiI18n3.getFormatLocalizedString(str_11, UIStrings11.goodSummarized, values);
  }
  if (localRating === "needs-improvement" && fieldRating === "good") {
    return uiI18n3.getFormatLocalizedString(str_11, UIStrings11.needsImprovementGoodDetailedCompare, values);
  }
  if (localRating === "needs-improvement" && fieldRating === "needs-improvement") {
    return uiI18n3.getFormatLocalizedString(str_11, UIStrings11.needsImprovementNeedsImprovementDetailedCompare, values);
  }
  if (localRating === "needs-improvement" && fieldRating === "poor") {
    return uiI18n3.getFormatLocalizedString(str_11, UIStrings11.needsImprovementPoorDetailedCompare, values);
  }
  if (localRating === "needs-improvement" && !fieldRating) {
    return uiI18n3.getFormatLocalizedString(str_11, UIStrings11.needsImprovementSummarized, values);
  }
  if (localRating === "poor" && fieldRating === "good") {
    return uiI18n3.getFormatLocalizedString(str_11, UIStrings11.poorGoodDetailedCompare, values);
  }
  if (localRating === "poor" && fieldRating === "needs-improvement") {
    return uiI18n3.getFormatLocalizedString(str_11, UIStrings11.poorNeedsImprovementDetailedCompare, values);
  }
  if (localRating === "poor" && fieldRating === "poor") {
    return uiI18n3.getFormatLocalizedString(str_11, UIStrings11.poorPoorDetailedCompare, values);
  }
  if (localRating === "poor" && !fieldRating) {
    return uiI18n3.getFormatLocalizedString(str_11, UIStrings11.poorSummarized, values);
  }
  throw new Error("Detailed compare string not found");
}

// gen/front_end/panels/timeline/components/metricValueStyles.css.js
var metricValueStyles_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.metric-value {
  text-wrap: nowrap;
}

.metric-value.dim {
  font-weight: var(--ref-typeface-weight-medium);
}

.metric-value.waiting {
  color: var(--sys-color-token-subtle);
}

.metric-value.good {
  color: var(--app-color-performance-good);
}

.metric-value.needs-improvement {
  color: var(--app-color-performance-ok);
}

.metric-value.poor {
  color: var(--app-color-performance-bad);
}

.metric-value.good.dim {
  color: var(--app-color-performance-good-dim);
}

.metric-value.needs-improvement.dim {
  color: var(--app-color-performance-ok-dim);
}

.metric-value.poor.dim {
  color: var(--app-color-performance-bad-dim);
}

/*# sourceURL=${import.meta.resolve("./metricValueStyles.css")} */`;

// gen/front_end/panels/timeline/components/Utils.js
var Utils_exports = {};
__export(Utils_exports, {
  CLS_THRESHOLDS: () => CLS_THRESHOLDS,
  INP_THRESHOLDS: () => INP_THRESHOLDS,
  LCP_THRESHOLDS: () => LCP_THRESHOLDS,
  NetworkCategory: () => NetworkCategory,
  NumberWithUnit: () => NumberWithUnit,
  colorForNetworkCategory: () => colorForNetworkCategory,
  colorForNetworkRequest: () => colorForNetworkRequest,
  determineCompareRating: () => determineCompareRating,
  networkResourceCategory: () => networkResourceCategory,
  rateMetric: () => rateMetric,
  renderMetricValue: () => renderMetricValue
});
import * as i18n23 from "./../../../core/i18n/i18n.js";
import * as Platform4 from "./../../../core/platform/platform.js";
import * as ThemeSupport from "./../../../ui/legacy/theme_support/theme_support.js";
import * as VisualLogging6 from "./../../../ui/visual_logging/visual_logging.js";
var UIStrings12 = {
  /**
   * @description ms is the short form of milli-seconds and the placeholder is a decimal number.
   * The shortest form or abbreviation of milliseconds should be used, as there is
   * limited room in this UI.
   * @example {2.14} PH1
   */
  fms: "{PH1}[ms]()",
  /**
   * @description s is short for seconds and the placeholder is a decimal number
   * The shortest form or abbreviation of seconds should be used, as there is
   * limited room in this UI.
   * @example {2.14} PH1
   */
  fs: "{PH1}[s]()"
};
var str_12 = i18n23.i18n.registerUIStrings("panels/timeline/components/Utils.ts", UIStrings12);
var i18nString11 = i18n23.i18n.getLocalizedString.bind(void 0, str_12);
var NetworkCategory;
(function(NetworkCategory2) {
  NetworkCategory2["DOC"] = "Doc";
  NetworkCategory2["CSS"] = "CSS";
  NetworkCategory2["JS"] = "JS";
  NetworkCategory2["FONT"] = "Font";
  NetworkCategory2["IMG"] = "Img";
  NetworkCategory2["MEDIA"] = "Media";
  NetworkCategory2["WASM"] = "Wasm";
  NetworkCategory2["OTHER"] = "Other";
})(NetworkCategory || (NetworkCategory = {}));
function networkResourceCategory(request) {
  const { mimeType } = request.args.data;
  switch (request.args.data.resourceType) {
    case "Document":
      return NetworkCategory.DOC;
    case "Stylesheet":
      return NetworkCategory.CSS;
    case "Image":
      return NetworkCategory.IMG;
    case "Media":
      return NetworkCategory.MEDIA;
    case "Font":
      return NetworkCategory.FONT;
    case "Script":
    case "WebSocket":
      return NetworkCategory.JS;
    default:
      return mimeType === void 0 ? NetworkCategory.OTHER : mimeType.endsWith("/css") ? NetworkCategory.CSS : mimeType.endsWith("javascript") ? NetworkCategory.JS : mimeType.startsWith("image/") ? NetworkCategory.IMG : mimeType.startsWith("audio/") || mimeType.startsWith("video/") ? NetworkCategory.MEDIA : mimeType.startsWith("font/") || mimeType.includes("font-") ? NetworkCategory.FONT : mimeType === "application/wasm" ? NetworkCategory.WASM : mimeType.startsWith("text/") ? NetworkCategory.DOC : (
        // Ultimate fallback:
        NetworkCategory.OTHER
      );
  }
}
function colorForNetworkCategory(category) {
  let cssVarName = "--app-color-system";
  switch (category) {
    case NetworkCategory.DOC:
      cssVarName = "--app-color-doc";
      break;
    case NetworkCategory.JS:
      cssVarName = "--app-color-scripting";
      break;
    case NetworkCategory.CSS:
      cssVarName = "--app-color-css";
      break;
    case NetworkCategory.IMG:
      cssVarName = "--app-color-image";
      break;
    case NetworkCategory.MEDIA:
      cssVarName = "--app-color-media";
      break;
    case NetworkCategory.FONT:
      cssVarName = "--app-color-font";
      break;
    case NetworkCategory.WASM:
      cssVarName = "--app-color-wasm";
      break;
    case NetworkCategory.OTHER:
    default:
      cssVarName = "--app-color-system";
      break;
  }
  return ThemeSupport.ThemeSupport.instance().getComputedValue(cssVarName);
}
function colorForNetworkRequest(request) {
  const category = networkResourceCategory(request);
  return colorForNetworkCategory(category);
}
var LCP_THRESHOLDS = [2500, 4e3];
var CLS_THRESHOLDS = [0.1, 0.25];
var INP_THRESHOLDS = [200, 500];
function rateMetric(value, thresholds) {
  if (value <= thresholds[0]) {
    return "good";
  }
  if (value <= thresholds[1]) {
    return "needs-improvement";
  }
  return "poor";
}
function renderMetricValue(jslogContext, value, thresholds, format, options) {
  const metricValueEl = document.createElement("span");
  metricValueEl.classList.add("metric-value");
  if (value === void 0) {
    metricValueEl.classList.add("waiting");
    metricValueEl.textContent = "-";
    return metricValueEl;
  }
  metricValueEl.textContent = format(value);
  const rating = rateMetric(value, thresholds);
  metricValueEl.classList.add(rating);
  metricValueEl.setAttribute("jslog", `${VisualLogging6.section(jslogContext)}`);
  if (options?.dim) {
    metricValueEl.classList.add("dim");
  }
  return metricValueEl;
}
var NumberWithUnit;
(function(NumberWithUnit2) {
  function parse(text) {
    const startBracket = text.indexOf("[");
    const endBracket = startBracket !== -1 && text.indexOf("]", startBracket);
    const startParen = endBracket && text.indexOf("(", endBracket);
    const endParen = startParen && text.indexOf(")", startParen);
    if (!endParen || endParen === -1) {
      return null;
    }
    const firstPart = text.substring(0, startBracket);
    const unitPart = text.substring(startBracket + 1, endBracket);
    const lastPart = text.substring(endParen + 1);
    return { firstPart, unitPart, lastPart };
  }
  NumberWithUnit2.parse = parse;
  function formatMicroSecondsAsSeconds(time) {
    const element = document.createElement("span");
    element.classList.add("number-with-unit");
    const milliseconds = Platform4.Timing.microSecondsToMilliSeconds(time);
    const seconds = Platform4.Timing.milliSecondsToSeconds(milliseconds);
    const text = i18nString11(UIStrings12.fs, { PH1: seconds.toFixed(2) });
    const result = parse(text);
    if (!result) {
      element.textContent = i18n23.TimeUtilities.formatMicroSecondsAsSeconds(time);
      return { text, element };
    }
    const { firstPart, unitPart, lastPart } = result;
    if (firstPart) {
      element.append(firstPart);
    }
    element.createChild("span", "unit").textContent = unitPart;
    if (lastPart) {
      element.append(lastPart);
    }
    return { text: element.textContent ?? "", element };
  }
  NumberWithUnit2.formatMicroSecondsAsSeconds = formatMicroSecondsAsSeconds;
  function formatMicroSecondsAsMillisFixed(time, fractionDigits = 0) {
    const element = document.createElement("span");
    element.classList.add("number-with-unit");
    const milliseconds = Platform4.Timing.microSecondsToMilliSeconds(time);
    const text = i18nString11(UIStrings12.fms, { PH1: milliseconds.toFixed(fractionDigits) });
    const result = parse(text);
    if (!result) {
      element.textContent = i18n23.TimeUtilities.formatMicroSecondsAsMillisFixed(time);
      return { text, element };
    }
    const { firstPart, unitPart, lastPart } = result;
    if (firstPart) {
      element.append(firstPart);
    }
    element.createChild("span", "unit").textContent = unitPart;
    if (lastPart) {
      element.append(lastPart);
    }
    return { text: element.textContent ?? "", element };
  }
  NumberWithUnit2.formatMicroSecondsAsMillisFixed = formatMicroSecondsAsMillisFixed;
})(NumberWithUnit || (NumberWithUnit = {}));
function determineCompareRating(metric, localValue, fieldValue) {
  let thresholds;
  let compareThreshold;
  switch (metric) {
    case "LCP":
      thresholds = LCP_THRESHOLDS;
      compareThreshold = 1e3;
      break;
    case "CLS":
      thresholds = CLS_THRESHOLDS;
      compareThreshold = 0.1;
      break;
    case "INP":
      thresholds = INP_THRESHOLDS;
      compareThreshold = 200;
      break;
    default:
      Platform4.assertNever(metric, `Unknown metric: ${metric}`);
  }
  const localRating = rateMetric(localValue, thresholds);
  const fieldRating = rateMetric(fieldValue, thresholds);
  if (localRating === "good" && fieldRating === "good") {
    return "similar";
  }
  if (localValue - fieldValue > compareThreshold) {
    return "worse";
  }
  if (fieldValue - localValue > compareThreshold) {
    return "better";
  }
  return "similar";
}

// gen/front_end/panels/timeline/components/MetricCard.js
var { html: html10, nothing: nothing9 } = Lit10;
var UIStrings13 = {
  /**
   * @description Label for a metric value that was measured in the local environment.
   */
  localValue: "Local",
  /**
   * @description Label for the 75th percentile of a metric according to data collected from real users in the field. This should be interpreted as "75th percentile of real users".
   */
  field75thPercentile: "Field 75th percentile",
  /**
   * @description Column header for the 75th percentile of a metric according to data collected from real users in the field. This should be interpreted as "75th percentile of real users". Width of the column is limited so character length should be as small as possible.
   */
  fieldP75: "Field p75",
  /**
   * @description Text label for values that are classified as "good".
   */
  good: "Good",
  /**
   * @description Text label for values that are classified as "needs improvement".
   */
  needsImprovement: "Needs improvement",
  /**
   * @description Text label for values that are classified as "poor".
   */
  poor: "Poor",
  /**
   * @description Text label for a range of values that are less than or equal to a certain value.
   * @example {500 ms} PH1
   */
  leqRange: "(\u2264{PH1})",
  /**
   * @description Text label for a range of values that are between two values.
   * @example {500 ms} PH1
   * @example {800 ms} PH2
   */
  betweenRange: "({PH1}-{PH2})",
  /**
   * @description Text label for a range of values that are greater than a certain value.
   * @example {500 ms} PH1
   */
  gtRange: "(>{PH1})",
  /**
   * @description Text for a percentage value in the live metrics view.
   * @example {13} PH1
   */
  percentage: "{PH1}%",
  /**
   * @description Text instructing the user to interact with the page because a user interaction is required to measure Interaction to Next Paint (INP).
   */
  interactToMeasure: "Interact with the page to measure INP.",
  /**
   * @description Label for a tooltip that provides more details.
   */
  viewCardDetails: "View card details",
  /**
   * @description Text block recommending a site developer look at their test environment followed by bullet points that highlight specific things about the test environment. "local" refers to the testing setup of the developer as opposed to the conditions experienced by real users.
   */
  considerTesting: "Consider your local test conditions",
  /**
   * @description Text block explaining how network conditions can slow down the page load. "network throttling" refers to artificially slowing down the network to simulate slower network conditions.
   */
  recThrottlingLCP: "Real users may experience longer page loads due to slower network conditions. Increasing network throttling will simulate slower network conditions.",
  /**
   * @description Text block explaining how CPU speed affects how long it takes the page to render after an interaction. "CPU throttling" refers to artificially slowing down the CPU to simulate slower devices.
   */
  recThrottlingINP: "Real users may experience longer interactions due to slower CPU speeds. Increasing CPU throttling will simulate a slower device.",
  /**
   * @description Text block explaining how screen size can affect what content is rendered and therefore affects the LCP performance metric. "viewport" and "screen size" are synonymous in this case. "LCP element" refers to the page element that was the largest content on the page.
   */
  recViewportLCP: "Screen size can influence what the LCP element is. Ensure you are testing common viewport sizes.",
  /**
   * @description Text block explaining viewport size can affect layout shifts. "viewport" and "screen size" are synonymous in this case. "layout shifts" refer to page instability where content moving around can create a jarring experience.
   */
  recViewportCLS: "Screen size can influence what layout shifts happen. Ensure you are testing common viewport sizes.",
  /**
   * @description Text block explaining how a user interacts with the page can cause different amounts of layout shifts. "layout shifts" refer to page instability where content moving around can create a jarring experience.
   */
  recJourneyCLS: "How a user interacts with the page can influence layout shifts. Ensure you are testing common interactions like scrolling the page.",
  /**
   * @description Text block explaining how a user interacts with the page can affect interaction delays. "interaction delay" refers to the delay between an interaction and the page rendering new content.
   */
  recJourneyINP: "How a user interacts with the page influences interaction delays. Ensure you are testing common interactions.",
  /**
   * @description Text block explaining how dynamic content can affect LCP. "LCP" is a performance metric measuring when the largest content was rendered on the page. "LCP element" refers to the page element that was the largest content on the page.
   */
  recDynamicContentLCP: "The LCP element can vary between page loads if content is dynamic.",
  /**
   * @description Text block explaining how dynamic content can affect layout shifts. "layout shifts" refer to page instability where content moving around can create a jarring experience.
   */
  recDynamicContentCLS: "Dynamic content can influence what layout shifts happen.",
  /**
   * @description Column header for table cell values representing the phase/component/stage/section of a larger duration.
   */
  phase: "Phase",
  /**
   * @description Tooltip text for a link that goes to documentation explaining the Largest Contentful Paint (LCP) metric. "LCP" is an acronym and should not be translated.
   */
  lcpHelpTooltip: "LCP reports the render time of the largest image, text block, or video visible in the viewport. Click here to learn more about LCP.",
  /**
   * @description Tooltip text for a link that goes to documentation explaining the Cumulative Layout Shift (CLS) metric. "CLS" is an acronym and should not be translated.
   */
  clsHelpTooltip: "CLS measures the amount of unexpected shifted content. Click here to learn more about CLS.",
  /**
   * @description Tooltip text for a link that goes to documentation explaining the Interaction to Next Paint (INP) metric. "INP" is an acronym and should not be translated.
   */
  inpHelpTooltip: "INP measures the overall responsiveness to all click, tap, and keyboard interactions. Click here to learn more about INP."
};
var str_13 = i18n25.i18n.registerUIStrings("panels/timeline/components/MetricCard.ts", UIStrings13);
var i18nString12 = i18n25.i18n.getLocalizedString.bind(void 0, str_13);
var MetricCard = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  constructor() {
    super();
    this.#render();
  }
  #tooltipEl;
  #data = {
    metric: "LCP"
  };
  set data(data) {
    this.#data = data;
    void ComponentHelpers7.ScheduledRender.scheduleRender(this, this.#render);
  }
  connectedCallback() {
    void ComponentHelpers7.ScheduledRender.scheduleRender(this, this.#render);
  }
  #hideTooltipOnEsc = (event) => {
    if (Platform5.KeyboardUtilities.isEscKey(event)) {
      event.stopPropagation();
      this.#hideTooltip();
    }
  };
  #hideTooltipOnMouseLeave(event) {
    const target = event.target;
    if (target?.hasFocus()) {
      return;
    }
    this.#hideTooltip();
  }
  #hideTooltipOnFocusOut(event) {
    const target = event.target;
    if (target?.hasFocus()) {
      return;
    }
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && target.contains(relatedTarget)) {
      return;
    }
    this.#hideTooltip();
  }
  #hideTooltip() {
    const tooltipEl = this.#tooltipEl;
    if (!tooltipEl) {
      return;
    }
    document.body.removeEventListener("keydown", this.#hideTooltipOnEsc);
    tooltipEl.style.removeProperty("left");
    tooltipEl.style.removeProperty("visibility");
    tooltipEl.style.removeProperty("display");
    tooltipEl.style.removeProperty("transition-delay");
  }
  #showTooltip(delayMs = 0) {
    const tooltipEl = this.#tooltipEl;
    if (!tooltipEl || tooltipEl.style.visibility || tooltipEl.style.display) {
      return;
    }
    document.body.addEventListener("keydown", this.#hideTooltipOnEsc);
    tooltipEl.style.display = "block";
    tooltipEl.style.transitionDelay = `${Math.round(delayMs)}ms`;
    const container = this.#data.tooltipContainer;
    if (!container) {
      return;
    }
    const containerBox = container.getBoundingClientRect();
    tooltipEl.style.setProperty("--tooltip-container-width", `${Math.round(containerBox.width)}px`);
    requestAnimationFrame(() => {
      let offset = 0;
      const tooltipBox = tooltipEl.getBoundingClientRect();
      const rightDiff = tooltipBox.right - containerBox.right;
      const leftDiff = tooltipBox.left - containerBox.left;
      if (leftDiff < 0) {
        offset = Math.round(leftDiff);
      } else if (rightDiff > 0) {
        offset = Math.round(rightDiff);
      }
      tooltipEl.style.left = `calc(50% - ${offset}px)`;
      tooltipEl.style.visibility = "visible";
    });
  }
  #getTitle() {
    switch (this.#data.metric) {
      case "LCP":
        return i18n25.i18n.lockedString("Largest Contentful Paint (LCP)");
      case "CLS":
        return i18n25.i18n.lockedString("Cumulative Layout Shift (CLS)");
      case "INP":
        return i18n25.i18n.lockedString("Interaction to Next Paint (INP)");
    }
  }
  #getThresholds() {
    switch (this.#data.metric) {
      case "LCP":
        return LCP_THRESHOLDS;
      case "CLS":
        return CLS_THRESHOLDS;
      case "INP":
        return INP_THRESHOLDS;
    }
  }
  #getFormatFn() {
    switch (this.#data.metric) {
      case "LCP":
        return (v) => {
          const micro = v * 1e3;
          return i18n25.TimeUtilities.formatMicroSecondsAsSeconds(micro);
        };
      case "CLS":
        return (v) => v === 0 ? "0" : v.toFixed(2);
      case "INP":
        return (v) => i18n25.TimeUtilities.preciseMillisToString(v);
    }
  }
  #getHelpLink() {
    switch (this.#data.metric) {
      case "LCP":
        return "https://web.dev/articles/lcp";
      case "CLS":
        return "https://web.dev/articles/cls";
      case "INP":
        return "https://web.dev/articles/inp";
    }
  }
  #getHelpTooltip() {
    switch (this.#data.metric) {
      case "LCP":
        return i18nString12(UIStrings13.lcpHelpTooltip);
      case "CLS":
        return i18nString12(UIStrings13.clsHelpTooltip);
      case "INP":
        return i18nString12(UIStrings13.inpHelpTooltip);
    }
  }
  #getLocalValue() {
    const { localValue } = this.#data;
    if (localValue === void 0) {
      return;
    }
    return localValue;
  }
  #getFieldValue() {
    let { fieldValue } = this.#data;
    if (fieldValue === void 0) {
      return;
    }
    if (typeof fieldValue === "string") {
      fieldValue = Number(fieldValue);
    }
    if (!Number.isFinite(fieldValue)) {
      return;
    }
    return fieldValue;
  }
  /**
   * Returns if the local value is better/worse/similar compared to field.
   */
  #getCompareRating() {
    const localValue = this.#getLocalValue();
    const fieldValue = this.#getFieldValue();
    if (localValue === void 0 || fieldValue === void 0) {
      return;
    }
    return determineCompareRating(this.#data.metric, localValue, fieldValue);
  }
  #renderCompareString() {
    const localValue = this.#getLocalValue();
    if (localValue === void 0) {
      if (this.#data.metric === "INP") {
        return html10`
          <div class="compare-text">${i18nString12(UIStrings13.interactToMeasure)}</div>
        `;
      }
      return Lit10.nothing;
    }
    const compare = this.#getCompareRating();
    const rating = rateMetric(localValue, this.#getThresholds());
    const valueEl = renderMetricValue(this.#getMetricValueLogContext(true), localValue, this.#getThresholds(), this.#getFormatFn(), { dim: true });
    return html10`
      <div class="compare-text">
        ${renderCompareText({
      metric: i18n25.i18n.lockedString(this.#data.metric),
      rating,
      compare,
      localValue: valueEl
    })}
      </div>
    `;
  }
  #renderEnvironmentRecommendations() {
    const compare = this.#getCompareRating();
    if (!compare || compare === "similar") {
      return Lit10.nothing;
    }
    const recs = [];
    const metric = this.#data.metric;
    if (metric === "LCP" && compare === "better") {
      recs.push(i18nString12(UIStrings13.recThrottlingLCP));
    } else if (metric === "INP" && compare === "better") {
      recs.push(i18nString12(UIStrings13.recThrottlingINP));
    }
    if (metric === "LCP") {
      recs.push(i18nString12(UIStrings13.recViewportLCP));
    } else if (metric === "CLS") {
      recs.push(i18nString12(UIStrings13.recViewportCLS));
    }
    if (metric === "CLS") {
      recs.push(i18nString12(UIStrings13.recJourneyCLS));
    } else if (metric === "INP") {
      recs.push(i18nString12(UIStrings13.recJourneyINP));
    }
    if (metric === "LCP") {
      recs.push(i18nString12(UIStrings13.recDynamicContentLCP));
    } else if (metric === "CLS") {
      recs.push(i18nString12(UIStrings13.recDynamicContentCLS));
    }
    if (!recs.length) {
      return Lit10.nothing;
    }
    return html10`
      <details class="environment-recs">
        <summary>${i18nString12(UIStrings13.considerTesting)}</summary>
        <ul class="environment-recs-list">${recs.map((rec) => html10`<li>${rec}</li>`)}</ul>
      </details>
    `;
  }
  #getMetricValueLogContext(isLocal) {
    return `timeline.landing.${isLocal ? "local" : "field"}-${this.#data.metric.toLowerCase()}`;
  }
  #renderDetailedCompareString() {
    const localValue = this.#getLocalValue();
    if (localValue === void 0) {
      if (this.#data.metric === "INP") {
        return html10`
          <div class="detailed-compare-text">${i18nString12(UIStrings13.interactToMeasure)}</div>
        `;
      }
      return Lit10.nothing;
    }
    const localRating = rateMetric(localValue, this.#getThresholds());
    const fieldValue = this.#getFieldValue();
    const fieldRating = fieldValue !== void 0 ? rateMetric(fieldValue, this.#getThresholds()) : void 0;
    const localValueEl = renderMetricValue(this.#getMetricValueLogContext(true), localValue, this.#getThresholds(), this.#getFormatFn(), { dim: true });
    const fieldValueEl = renderMetricValue(this.#getMetricValueLogContext(false), fieldValue, this.#getThresholds(), this.#getFormatFn(), { dim: true });
    return html10`
      <div class="detailed-compare-text">${renderDetailedCompareText({
      metric: i18n25.i18n.lockedString(this.#data.metric),
      localRating,
      fieldRating,
      localValue: localValueEl,
      fieldValue: fieldValueEl,
      percent: this.#getPercentLabelForRating(localRating)
    })}</div>
    `;
  }
  #bucketIndexForRating(rating) {
    switch (rating) {
      case "good":
        return 0;
      case "needs-improvement":
        return 1;
      case "poor":
        return 2;
    }
  }
  #getBarWidthForRating(rating) {
    const histogram = this.#data.histogram;
    const density = histogram?.[this.#bucketIndexForRating(rating)].density || 0;
    const percent = Math.round(density * 100);
    return `${percent}%`;
  }
  #getPercentLabelForRating(rating) {
    const histogram = this.#data.histogram;
    if (histogram === void 0) {
      return "-";
    }
    const density = histogram[this.#bucketIndexForRating(rating)].density || 0;
    const percent = Math.round(density * 100);
    return i18nString12(UIStrings13.percentage, { PH1: percent });
  }
  #renderFieldHistogram() {
    const fieldEnabled = CrUXManager5.CrUXManager.instance().getConfigSetting().get().enabled;
    const format = this.#getFormatFn();
    const thresholds = this.#getThresholds();
    const goodLabel = html10`
      <div class="bucket-label">
        <span>${i18nString12(UIStrings13.good)}</span>
        <span class="bucket-range"> ${i18nString12(UIStrings13.leqRange, { PH1: format(thresholds[0]) })}</span>
      </div>
    `;
    const needsImprovementLabel = html10`
      <div class="bucket-label">
        <span>${i18nString12(UIStrings13.needsImprovement)}</span>
        <span class="bucket-range"> ${i18nString12(UIStrings13.betweenRange, { PH1: format(thresholds[0]), PH2: format(thresholds[1]) })}</span>
      </div>
    `;
    const poorLabel = html10`
      <div class="bucket-label">
        <span>${i18nString12(UIStrings13.poor)}</span>
        <span class="bucket-range"> ${i18nString12(UIStrings13.gtRange, { PH1: format(thresholds[1]) })}</span>
      </div>
    `;
    if (!fieldEnabled) {
      return html10`
        <div class="bucket-summaries">
          ${goodLabel}
          ${needsImprovementLabel}
          ${poorLabel}
        </div>
      `;
    }
    return html10`
      <div class="bucket-summaries histogram">
        ${goodLabel}
        <div class="histogram-bar good-bg" style="width: ${this.#getBarWidthForRating("good")}"></div>
        <div class="histogram-percent">${this.#getPercentLabelForRating("good")}</div>
        ${needsImprovementLabel}
        <div class="histogram-bar needs-improvement-bg" style="width: ${this.#getBarWidthForRating("needs-improvement")}"></div>
        <div class="histogram-percent">${this.#getPercentLabelForRating("needs-improvement")}</div>
        ${poorLabel}
        <div class="histogram-bar poor-bg" style="width: ${this.#getBarWidthForRating("poor")}"></div>
        <div class="histogram-percent">${this.#getPercentLabelForRating("poor")}</div>
      </div>
    `;
  }
  #renderPhaseTable(phases) {
    const hasFieldData = phases.every((phase) => phase[2] !== void 0);
    return html10`
      <hr class="divider">
      <div class="phase-table" role="table">
        <div class="phase-table-row phase-table-header-row" role="row">
          <div role="columnheader" style="grid-column: 1">${i18nString12(UIStrings13.phase)}</div>
          <div role="columnheader" class="phase-table-value" style="grid-column: 2">${i18nString12(UIStrings13.localValue)}</div>
          ${hasFieldData ? html10`
            <div
              role="columnheader"
              class="phase-table-value"
              style="grid-column: 3"
              title=${i18nString12(UIStrings13.field75thPercentile)}>${i18nString12(UIStrings13.fieldP75)}</div>
          ` : nothing9}
        </div>
        ${phases.map((phase) => html10`
          <div class="phase-table-row" role="row">
            <div role="cell">${phase[0]}</div>
            <div role="cell" class="phase-table-value">${i18n25.TimeUtilities.preciseMillisToString(phase[1])}</div>
            ${phase[2] !== void 0 ? html10`
              <div role="cell" class="phase-table-value">${i18n25.TimeUtilities.preciseMillisToString(phase[2])}</div>
            ` : nothing9}
          </div>
        `)}
      </div>
    `;
  }
  #render = () => {
    const fieldEnabled = CrUXManager5.CrUXManager.instance().getConfigSetting().get().enabled;
    const helpLink = this.#getHelpLink();
    const localValue = this.#getLocalValue();
    const fieldValue = this.#getFieldValue();
    const thresholds = this.#getThresholds();
    const formatFn = this.#getFormatFn();
    const localValueEl = renderMetricValue(this.#getMetricValueLogContext(true), localValue, thresholds, formatFn);
    const fieldValueEl = renderMetricValue(this.#getMetricValueLogContext(false), fieldValue, thresholds, formatFn);
    const output = html10`
      <style>${metricCard_css_default}</style>
      <style>${metricValueStyles_css_default}</style>
      <div class="metric-card">
        <h3 class="title">
          ${this.#getTitle()}
          <devtools-button
            class="title-help"
            title=${this.#getHelpTooltip()}
            .iconName=${"help"}
            .variant=${"icon"}
            @click=${() => UIHelpers.openInNewTab(helpLink)}
          ></devtools-button>
        </h3>
        <div tabindex="0" class="metric-values-section"
          @mouseenter=${() => this.#showTooltip(500)}
          @mouseleave=${this.#hideTooltipOnMouseLeave}
          @focusin=${this.#showTooltip}
          @focusout=${this.#hideTooltipOnFocusOut}
          aria-describedby="tooltip"
        >
          <div class="metric-source-block">
            <div class="metric-source-value" id="local-value">${localValueEl}</div>
            ${fieldEnabled ? html10`<div class="metric-source-label">${i18nString12(UIStrings13.localValue)}</div>` : nothing9}
          </div>
          ${fieldEnabled ? html10`
            <div class="metric-source-block">
              <div class="metric-source-value" id="field-value">${fieldValueEl}</div>
              <div class="metric-source-label">${i18nString12(UIStrings13.field75thPercentile)}</div>
            </div>
          ` : nothing9}
          <div
            id="tooltip"
            class="tooltip"
            role="tooltip"
            aria-label=${i18nString12(UIStrings13.viewCardDetails)}
            ${Lit10.Directives.ref((el) => {
      if (el instanceof HTMLElement) {
        this.#tooltipEl = el;
      }
    })}
          >
            <div class="tooltip-scroll">
              <div class="tooltip-contents">
                <div>
                  ${this.#renderDetailedCompareString()}
                  <hr class="divider">
                  ${this.#renderFieldHistogram()}
                  ${localValue && this.#data.phases ? this.#renderPhaseTable(this.#data.phases) : nothing9}
                </div>
              </div>
            </div>
          </div>
        </div>
        ${fieldEnabled ? html10`<hr class="divider">` : nothing9}
        ${this.#renderCompareString()}
        ${this.#data.warnings?.map((warning) => html10`
          <div class="warning">${warning}</div>
        `)}
        ${this.#renderEnvironmentRecommendations()}
        <slot name="extra-info"></slot>
      </div>
    `;
    Lit10.render(output, this.#shadow, { host: this });
  };
};
customElements.define("devtools-metric-card", MetricCard);

// gen/front_end/panels/timeline/components/LiveMetricsView.js
import * as Common5 from "./../../../core/common/common.js";
import * as i18n27 from "./../../../core/i18n/i18n.js";
import * as Root from "./../../../core/root/root.js";
import * as SDK6 from "./../../../core/sdk/sdk.js";
import * as CrUXManager9 from "./../../../models/crux-manager/crux-manager.js";
import * as EmulationModel from "./../../../models/emulation/emulation.js";
import * as LiveMetrics from "./../../../models/live-metrics/live-metrics.js";
import * as Trace5 from "./../../../models/trace/trace.js";
import * as Buttons6 from "./../../../ui/components/buttons/buttons.js";
import * as ComponentHelpers8 from "./../../../ui/components/helpers/helpers.js";
import * as LegacyWrapper from "./../../../ui/components/legacy_wrapper/legacy_wrapper.js";
import * as RenderCoordinator2 from "./../../../ui/components/render_coordinator/render_coordinator.js";
import * as uiI18n4 from "./../../../ui/i18n/i18n.js";
import * as UI9 from "./../../../ui/legacy/legacy.js";
import * as Lit12 from "./../../../ui/lit/lit.js";
import * as VisualLogging7 from "./../../../ui/visual_logging/visual_logging.js";
import * as PanelsCommon from "./../../common/common.js";

// gen/front_end/panels/timeline/utils/Helpers.js
import * as Platform6 from "./../../../core/platform/platform.js";
import * as SDK5 from "./../../../core/sdk/sdk.js";
import * as CrUXManager7 from "./../../../models/crux-manager/crux-manager.js";
function getThrottlingRecommendations() {
  let cpuOption = SDK5.CPUThrottlingManager.CalibratedMidTierMobileThrottlingOption;
  if (cpuOption.rate() === 0) {
    cpuOption = SDK5.CPUThrottlingManager.MidTierThrottlingOption;
  }
  let networkConditions = null;
  const response = CrUXManager7.CrUXManager.instance().getSelectedFieldMetricData("round_trip_time");
  if (response?.percentiles) {
    const rtt = Number(response.percentiles.p75);
    networkConditions = SDK5.NetworkManager.getRecommendedNetworkPreset(rtt);
  }
  return {
    cpuOption,
    networkConditions
  };
}

// gen/front_end/panels/timeline/components/insights/Helpers.js
import "./../../../ui/components/markdown_view/markdown_view.js";
import * as Trace4 from "./../../../models/trace/trace.js";
import * as Marked from "./../../../third_party/marked/marked.js";
import * as Lit11 from "./../../../ui/lit/lit.js";
var { html: html11 } = Lit11;
function shouldRenderForCategory(options) {
  return options.activeCategory === Trace4.Insights.Types.InsightCategory.ALL || options.activeCategory === options.insightCategory;
}
function md(markdown) {
  const tokens = Marked.Marked.lexer(markdown);
  const data = { tokens };
  return html11`<devtools-markdown-view .data=${data}></devtools-markdown-view>`;
}

// gen/front_end/panels/timeline/components/liveMetricsView.css.js
var liveMetricsView_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.container {
  container-type: inline-size;
  height: 100%;
  font-size: var(--sys-typescale-body4-size);
  line-height: var(--sys-typescale-body4-line-height);
  font-weight: var(--ref-typeface-weight-regular);
  user-select: text;
}

.live-metrics-view {
  --min-main-area-size: 60%;

  background-color: var(--sys-color-cdt-base-container);
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;
}

.live-metrics,
.next-steps {
  padding: 16px;
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
}

.live-metrics {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.next-steps {
  flex: 0 0 336px;
  box-sizing: border-box;
  border: none;
  border-left: 1px solid var(--sys-color-divider);
}

@container (max-width: 650px) {
  .live-metrics-view {
    flex-direction: column;
  }

  .next-steps {
    flex-basis: 40%;
    border: none;
    border-top: 1px solid var(--sys-color-divider);
  }
}

.metric-cards {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  width: 100%;
}

.section-title {
  font-size: var(--sys-typescale-headline4-size);
  line-height: var(--sys-typescale-headline4-line-height);
  font-weight: var(--ref-typeface-weight-medium);
  margin: 0;
  margin-bottom: 10px;
}

.settings-card {
  border-radius: var(--sys-shape-corner-small);
  padding: 14px 16px 16px;
  background-color: var(--sys-color-surface3);
  margin-bottom: 16px;
}

.record-action-card {
  border-radius: var(--sys-shape-corner-small);
  padding: 12px 16px 12px 12px;
  background-color: var(--sys-color-surface3);
  margin-bottom: 16px;
}

.card-title {
  font-size: var(--sys-typescale-headline5-size);
  line-height: var(--sys-typescale-headline5-line-height);
  font-weight: var(--ref-typeface-weight-medium);
  margin: 0;
}

.settings-card .card-title {
  margin-bottom: 4px;
}

.device-toolbar-description {
  margin-bottom: 12px;
  display: flex;
}

.network-cache-setting {
  display: inline-block;
  max-width: max-content;
}

.throttling-recommendation-value {
  font-weight: var(--ref-typeface-weight-medium);
}

.related-info {
  text-wrap: nowrap;
  margin-top: 8px;
  display: flex;
}

.related-info-label {
  font-weight: var(--ref-typeface-weight-medium);
  margin-right: 4px;
}

.related-info-link {
  background-color: var(--sys-color-cdt-base-container);
  border-radius: 2px;
  padding: 0 2px;
  min-width: 0;
}

.local-field-link {
  display: inline-block;
  width: fit-content;
  margin-top: 8px;
}

.logs-section {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  flex: 1 0 300px;
  overflow: hidden;
  max-height: max-content;

  --app-color-toolbar-background: transparent;
}

.logs-section-header {
  display: flex;
  align-items: center;
}

.interactions-clear {
  margin-left: 4px;
  vertical-align: sub;
}

.log {
  padding: 0;
  margin: 0;
  overflow: auto;
}

.log-item {
  border: none;
  border-bottom: 1px solid var(--sys-color-divider);

  &.highlight {
    animation: highlight-fadeout 2s;
  }
}

.interaction {
  --phase-table-margin: 120px;
  --details-indicator-width: 18px;

  summary {
    display: flex;
    align-items: center;
    padding: 7px 4px;

    &::before {
      content: " ";
      height: 14px;
      width: var(--details-indicator-width);
      mask-image: var(--image-file-triangle-right);
      background-color: var(--icon-default);
      flex-shrink: 0;
    }
  }

  details[open] summary::before {
    mask-image: var(--image-file-triangle-down);
  }
}

.interaction-type {
  font-weight: var(--ref-typeface-weight-medium);
  width: calc(var(--phase-table-margin) - var(--details-indicator-width));
  flex-shrink: 0;
}

.interaction-inp-chip {
  background-color: var(--sys-color-yellow-bright);
  color: var(--sys-color-on-yellow);
  padding: 0 2px;
}

.interaction-node {
  flex-grow: 1;
  margin-right: 32px;
  min-width: 0;
}

.interaction-info {
  width: var(--sys-typescale-body4-line-height);
  height: var(--sys-typescale-body4-line-height);
  margin-right: 6px;
}

.interaction-duration {
  text-align: end;
  width: max-content;
  flex-shrink: 0;
  font-weight: var(--ref-typeface-weight-medium);
}

.layout-shift {
  display: flex;
  align-items: flex-start;
}

.layout-shift-score {
  margin-right: 16px;
  padding: 7px 0;
  width: 150px;
  box-sizing: border-box;
}

.layout-shift-nodes {
  flex: 1;
  min-width: 0;
}

.layout-shift-node {
  border-bottom: 1px solid var(--sys-color-divider);
  padding: 7px 0;

  &:last-child {
    border: none;
  }
}

.record-action {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.shortcut-label {
  width: max-content;
  flex-shrink: 0;
}

.field-data-option {
  margin: 8px 0;
  max-width: 100%;
}

.field-setup-buttons {
  margin-top: 14px;
}

.field-data-message {
  margin-bottom: 12px;
}

.field-data-warning {
  margin-top: 4px;
  color: var(--sys-color-error);
  font-size: var(--sys-typescale-body4-size);
  line-height: var(--sys-typescale-body4-line-height);
  display: flex;

  &::before {
    content: " ";
    width: var(--sys-typescale-body4-line-height);
    height: var(--sys-typescale-body4-line-height);
    mask-size: var(--sys-typescale-body4-line-height);
    mask-image: var(--image-file-warning);
    background-color: var(--sys-color-error);
    margin-right: 4px;
    flex-shrink: 0;
  }
}

.collection-period-range {
  font-weight: var(--ref-typeface-weight-medium);
}

x-link {
  color: var(--sys-color-primary);
  text-decoration-line: underline;
}

.environment-option {
  display: flex;
  align-items: center;
  margin-top: 8px;
}

.environment-recs-list {
  margin: 0;
  padding-left: 20px;
}

.environment-rec {
  font-weight: var(--ref-typeface-weight-medium);
}

.link-to-log {
  padding: unset;
  background: unset;
  border: unset;
  font: inherit;
  color: var(--sys-color-primary);
  text-decoration: underline;
  cursor: pointer;
}

@keyframes highlight-fadeout {
  from {
    background-color: var(--sys-color-yellow-container);
  }

  to {
    background-color: transparent;
  }
}

.phase-table {
  border-top: 1px solid var(--sys-color-divider);
  padding: 7px 4px;
  margin-left: var(--phase-table-margin);
}

.phase-table-row {
  display: flex;
  justify-content: space-between;
}

.phase-table-header-row {
  font-weight: var(--ref-typeface-weight-medium);
  margin-bottom: 4px;
}

.log-extra-details-button {
  padding: unset;
  background: unset;
  border: unset;
  font: inherit;
  color: var(--sys-color-primary);
  text-decoration: underline;
  cursor: pointer;
}

.node-view {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: var(--sys-typescale-body4-size);
  line-height: var(--sys-typescale-body4-line-height);
  font-weight: var(--ref-typeface-weight-regular);
  user-select: text;

  main {
    width: 300px;
    max-width: 100%;
    text-align: center;

    .section-title {
      margin-bottom: 4px;
    }
  }
}

.node-description {
  margin-bottom: 12px;
}

/*# sourceURL=${import.meta.resolve("./liveMetricsView.css")} */`;

// gen/front_end/panels/timeline/components/LiveMetricsView.js
var { html: html12, nothing: nothing11 } = Lit12;
var { widgetConfig } = UI9.Widget;
var DEVICE_OPTION_LIST = ["AUTO", ...CrUXManager9.DEVICE_SCOPE_LIST];
var RTT_MINIMUM = 60;
var UIStrings14 = {
  /**
   * @description Title of a view that shows performance metrics from the local environment and field metrics collected from real users. "field metrics" should be interpreted as "real user metrics".
   */
  localAndFieldMetrics: "Local and field metrics",
  /**
   * @description Title of a view that shows performance metrics from the local environment.
   */
  localMetrics: "Local metrics",
  /**
   *@description Text for the link to the historical field data for the specific URL or origin that is shown. This link text appears in parenthesis after the collection period information in the field data dialog. The link opens the CrUX Vis viewer (https://cruxvis.withgoogle.com).
   */
  fieldDataHistoryLink: "View history",
  /**
   *@description Tooltip for the CrUX Vis viewer link which shows the history of the field data for the specific URL or origin.
   */
  fieldDataHistoryTooltip: "View field data history in CrUX Vis",
  /**
   * @description Accessible label for a section that logs user interactions and layout shifts. A layout shift is an event that shifts content in the layout of the page causing a jarring experience for the user.
   */
  eventLogs: "Interaction and layout shift logs section",
  /**
   * @description Title of a section that lists user interactions.
   */
  interactions: "Interactions",
  /**
   * @description Title of a section that lists layout shifts. A layout shift is an event that shifts content in the layout of the page causing a jarring experience for the user.
   */
  layoutShifts: "Layout shifts",
  /**
   * @description Title of a sidebar section that shows options for the user to take after using the main view.
   */
  nextSteps: "Next steps",
  /**
   * @description Title of a section that shows options for how real user data in the field should be fetched. This should be interpreted as "Real user data".
   */
  fieldMetricsTitle: "Field metrics",
  /**
   * @description Title of a section that shows settings to control the developers local testing environment.
   */
  environmentSettings: "Environment settings",
  /**
   * @description Label for an select box that selects which device type field metrics be shown for (e.g. desktop/mobile/all devices/etc). "field metrics" should be interpreted as "real user data".
   * @example {Mobile} PH1
   */
  showFieldDataForDevice: "Show field metrics for device type: {PH1}",
  /**
   * @description Text indicating that there is not enough data to report real user statistics.
   */
  notEnoughData: "Not enough data",
  /**
   * @description Label for a text block that describes the network connections of real users.
   * @example {75th percentile is similar to Slow 4G throttling} PH1
   */
  network: "Network: {PH1}",
  /**
   * @description Label for an select box that selects which device type real user data should be shown for (e.g. desktop/mobile/all devices/etc).
   * @example {Mobile} PH1
   */
  device: "Device: {PH1}",
  /**
   * @description Label for an option to select all device form factors.
   */
  allDevices: "All devices",
  /**
   * @description Label for an option to select the desktop form factor.
   */
  desktop: "Desktop",
  /**
   * @description Label for an option to select the mobile form factor.
   */
  mobile: "Mobile",
  /**
   * @description Label for an option to select the tablet form factor.
   */
  tablet: "Tablet",
  /**
   * @description Label for an option to to automatically select the form factor. The automatic selection will be displayed in PH1.
   * @example {Desktop} PH1
   */
  auto: "Auto ({PH1})",
  /**
   * @description Label for an option that is loading.
   * @example {Desktop} PH1
   */
  loadingOption: "{PH1} - Loading\u2026",
  /**
   * @description Label for an option that does not have enough data and the user should ignore.
   * @example {Desktop} PH1
   */
  needsDataOption: "{PH1} - No data",
  /**
   * @description Label for an option that selects the page's specific URL as opposed to it's entire origin/domain.
   */
  urlOption: "URL",
  /**
   * @description Label for an option that selects the page's entire origin/domain as opposed to it's specific URL.
   */
  originOption: "Origin",
  /**
   * @description Label for an option that selects the page's specific URL as opposed to it's entire origin/domain.
   * @example {https://example.com/} PH1
   */
  urlOptionWithKey: "URL: {PH1}",
  /**
   * @description Label for an option that selects the page's entire origin/domain as opposed to it's specific URL.
   * @example {https://example.com} PH1
   */
  originOptionWithKey: "Origin: {PH1}",
  /**
   * @description Label for an combo-box that indicates if field metrics should be taken from the page's URL or it's origin/domain. "field metrics" should be interpreted as "real user data".
   * @example {Origin: https://example.com} PH1
   */
  showFieldDataForPage: "Show field metrics for {PH1}",
  /**
   * @description Tooltip text explaining that real user connections are similar to a test environment with no throttling. "throttling" is when the network is intentionally slowed down to simulate a slower connection.
   */
  tryDisablingThrottling: "75th percentile is too fast to simulate with throttling",
  /**
   * @description Tooltip text explaining that real user connections are similar to a specif network throttling setup. "throttling" is when the network is intentionally slowed down to simulate a slower connection.
   * @example {Slow 4G} PH1
   */
  tryUsingThrottling: "75th percentile is similar to {PH1} throttling",
  /**
   * @description Text block listing what percentage of real users are on different device form factors.
   * @example {60%} PH1
   * @example {30%} PH2
   */
  percentDevices: "{PH1}% mobile, {PH2}% desktop",
  /**
   * @description Text block explaining how to simulate different mobile and desktop devices.
   */
  useDeviceToolbar: "Use the [device toolbar](https://developer.chrome.com/docs/devtools/device-mode) and configure throttling to simulate real user environments and identify more performance issues.",
  /**
   * @description Text label for a checkbox that controls if the network cache is disabled.
   */
  disableNetworkCache: "Disable network cache",
  /**
   * @description Text label for a link to the Largest Contentful Paint (LCP) related page element. This element represents the largest content on the page. "LCP" should not be translated.
   */
  lcpElement: "LCP element",
  /**
   * @description Text label for a button that reveals the user interaction associated with the Interaction to Next Paint (INP) performance metric. "INP" should not be translated.
   */
  inpInteractionLink: "INP interaction",
  /**
   * @description Text label for a button that reveals the cluster of layout shift events that affected the page content the most. A cluster is a group of layout shift events that occur in quick succession.
   */
  worstCluster: "Worst cluster",
  /**
   * @description [ICU Syntax] Text content of a button that reveals the cluster of layout shift events that affected the page content the most. A layout shift is an event that shifts content in the layout of the page causing a jarring experience for the user. This text will indicate how many shifts were in the cluster.
   * @example {3} shiftCount
   */
  numShifts: `{shiftCount, plural,
    =1 {{shiftCount} shift}
    other {{shiftCount} shifts}
  }`,
  /**
   * @description Label for a a range of dates that represents the period of time a set of field metrics is collected from.
   * @example {Oct 1, 2024 - Nov 1, 2024} PH1
   */
  collectionPeriod: "Collection period: {PH1}",
  /**
   * @description Text showing a range of dates meant to represent a period of time.
   * @example {Oct 1, 2024} PH1
   * @example {Nov 1, 2024} PH2
   */
  dateRange: "{PH1} - {PH2}",
  /**
   * @description Text block telling the user to see how performance metrics measured on their local computer compare to data collected from real users. PH1 will be a link to more information about the Chrome UX Report and the link text will be untranslated because it is a product name.
   * @example {Chrome UX Report} PH1
   */
  seeHowYourLocalMetricsCompare: "See how your local metrics compare to real user data in the {PH1}.",
  /**
   * @description Text for a link that goes to more documentation about local and field metrics. "Local" refers to performance metrics measured in the developers local environment. "field metrics" should be interpreted as "real user data".
   */
  localFieldLearnMoreLink: "Learn more about local and field metrics",
  /**
   * @description Tooltip text for a link that goes to documentation explaining the difference between local and field metrics. "Local metrics" are performance metrics measured in the developers local environment. "field metrics" should be interpreted as "real user data".
   */
  localFieldLearnMoreTooltip: "Local metrics are captured from the current page using your network connection and device. field metrics is measured by real users using many different network connections and devices.",
  /**
   * @description Tooltip text explaining that this user interaction was ignored when calculating the Interaction to Next Paint (INP) metric because the interaction delay fell beyond the 98th percentile of interaction delays on this page. "INP" is an acronym and should not be translated.
   */
  interactionExcluded: "INP is calculated using the 98th percentile of interaction delays, so some interaction delays may be larger than the INP value.",
  /**
   * @description Tooltip for a button that will remove everything from the currently selected log.
   */
  clearCurrentLog: "Clear the current log",
  /**
   * @description Title for a page load phase that measures the time between when the page load starts and the time when the first byte of the initial document is downloaded.
   */
  timeToFirstByte: "Time to first byte",
  /**
   * @description Title for a page load phase that measures the time between when the first byte of the initial document is downloaded and when the request for the largest image content starts.
   */
  resourceLoadDelay: "Resource load delay",
  /**
   * @description Title for a page load phase that measures the time between when the request for the largest image content starts and when it finishes.
   */
  resourceLoadDuration: "Resource load duration",
  /**
   * @description Title for a page load phase that measures the time between when the request for the largest image content finishes and when the largest image element is rendered on the page.
   */
  elementRenderDelay: "Element render delay",
  /**
   * @description Title for a phase during a user interaction that measures the time between when the interaction starts and when the browser starts running interaction handlers.
   */
  inputDelay: "Input delay",
  /**
   * @description Title for a phase during a user interaction that measures the time between when the browser starts running interaction handlers and when the browser finishes running interaction handlers.
   */
  processingDuration: "Processing duration",
  /**
   * @description Title for a phase during a user interaction that measures the time between when the browser finishes running interaction handlers and when the browser renders the next visual frame that shows the result of the interaction.
   */
  presentationDelay: "Presentation delay",
  /**
   * @description Tooltip text for a status chip in a list of user interactions that indicates if the associated interaction is the interaction used in the Interaction to Next Paint (INP) performance metric because it's interaction delay is at the 98th percentile.
   */
  inpInteraction: "The INP interaction is at the 98th percentile of interaction delays.",
  /**
   * @description Tooltip text for a button that reveals the user interaction associated with the Interaction to Next Paint (INP) performance metric.
   */
  showInpInteraction: "Go to the INP interaction.",
  /**
   * @description Tooltip text for a button that reveals the cluster of layout shift events that affected the page content the most. A layout shift is an event that shifts content in the layout of the page causing a jarring experience for the user. A cluster is a group of layout shift events that occur in quick succession.
   */
  showClsCluster: "Go to worst layout shift cluster.",
  /**
   * @description Column header for table cell values representing the phase/component/stage/section of a larger duration.
   */
  phase: "Phase",
  /**
   * @description Column header for table cell values representing a phase duration (in milliseconds) that was measured in the developers local environment.
   */
  duration: "Local duration (ms)",
  /**
   * @description Tooltip text for a button that will open the Chrome DevTools console to and log additional details about a user interaction.
   */
  logToConsole: "Log additional interaction data to the console",
  /**
   * @description Title of a view that can be used to analyze the performance of a Node process as a timeline. "Node" is a product name and should not be translated.
   */
  nodePerformanceTimeline: "Node performance",
  /**
   * @description Description of a view that can be used to analyze the performance of a Node process as a timeline. "Node" is a product name and should not be translated.
   */
  nodeClickToRecord: "Record a performance timeline of the connected Node process."
};
var str_14 = i18n27.i18n.registerUIStrings("panels/timeline/components/LiveMetricsView.ts", UIStrings14);
var i18nString13 = i18n27.i18n.getLocalizedString.bind(void 0, str_14);
var LiveMetricsView = class extends LegacyWrapper.LegacyWrapper.WrappableComponent {
  #shadow = this.attachShadow({ mode: "open" });
  isNode = Root.Runtime.Runtime.isNode();
  #lcpValue;
  #clsValue;
  #inpValue;
  #interactions = /* @__PURE__ */ new Map();
  #layoutShifts = [];
  #cruxManager = CrUXManager9.CrUXManager.instance();
  #toggleRecordAction;
  #recordReloadAction;
  #logsEl;
  #tooltipContainerEl;
  #interactionsListEl;
  #layoutShiftsListEl;
  #listIsScrolling = false;
  #deviceModeModel = EmulationModel.DeviceModeModel.DeviceModeModel.tryInstance();
  constructor() {
    super();
    this.#toggleRecordAction = UI9.ActionRegistry.ActionRegistry.instance().getAction("timeline.toggle-recording");
    this.#recordReloadAction = UI9.ActionRegistry.ActionRegistry.instance().getAction("timeline.record-reload");
  }
  #onMetricStatus(event) {
    this.#lcpValue = event.data.lcp;
    this.#clsValue = event.data.cls;
    this.#inpValue = event.data.inp;
    const hasNewLS = this.#layoutShifts.length < event.data.layoutShifts.length;
    this.#layoutShifts = [...event.data.layoutShifts];
    const hasNewInteraction = this.#interactions.size < event.data.interactions.size;
    this.#interactions = new Map(event.data.interactions);
    const renderPromise = ComponentHelpers8.ScheduledRender.scheduleRender(this, this.#render);
    if (hasNewInteraction && this.#interactionsListEl) {
      this.#keepScrolledToBottom(renderPromise, this.#interactionsListEl);
    }
    if (hasNewLS && this.#layoutShiftsListEl) {
      this.#keepScrolledToBottom(renderPromise, this.#layoutShiftsListEl);
    }
  }
  #keepScrolledToBottom(renderPromise, listEl) {
    if (!listEl.checkVisibility()) {
      return;
    }
    const isAtBottom = Math.abs(listEl.scrollHeight - listEl.clientHeight - listEl.scrollTop) <= 1;
    if (!isAtBottom && !this.#listIsScrolling) {
      return;
    }
    void renderPromise.then(() => {
      requestAnimationFrame(() => {
        this.#listIsScrolling = true;
        listEl.addEventListener("scrollend", () => {
          this.#listIsScrolling = false;
        }, { once: true });
        listEl.scrollTo({ top: listEl.scrollHeight, behavior: "smooth" });
      });
    });
  }
  #onFieldDataChanged() {
    void ComponentHelpers8.ScheduledRender.scheduleRender(this, this.#render);
  }
  #onEmulationChanged() {
    void ComponentHelpers8.ScheduledRender.scheduleRender(this, this.#render);
  }
  async #refreshFieldDataForCurrentPage() {
    if (!this.isNode) {
      await this.#cruxManager.refresh();
    }
    void ComponentHelpers8.ScheduledRender.scheduleRender(this, this.#render);
  }
  connectedCallback() {
    const liveMetrics = LiveMetrics.LiveMetrics.instance();
    liveMetrics.addEventListener("status", this.#onMetricStatus, this);
    const cruxManager = CrUXManager9.CrUXManager.instance();
    cruxManager.addEventListener("field-data-changed", this.#onFieldDataChanged, this);
    this.#deviceModeModel?.addEventListener("Updated", this.#onEmulationChanged, this);
    if (cruxManager.getConfigSetting().get().enabled) {
      void this.#refreshFieldDataForCurrentPage();
    }
    this.#lcpValue = liveMetrics.lcpValue;
    this.#clsValue = liveMetrics.clsValue;
    this.#inpValue = liveMetrics.inpValue;
    this.#interactions = liveMetrics.interactions;
    this.#layoutShifts = liveMetrics.layoutShifts;
    void ComponentHelpers8.ScheduledRender.scheduleRender(this, this.#render);
  }
  disconnectedCallback() {
    LiveMetrics.LiveMetrics.instance().removeEventListener("status", this.#onMetricStatus, this);
    const cruxManager = CrUXManager9.CrUXManager.instance();
    cruxManager.removeEventListener("field-data-changed", this.#onFieldDataChanged, this);
    this.#deviceModeModel?.removeEventListener("Updated", this.#onEmulationChanged, this);
  }
  #getLcpFieldPhases() {
    const ttfb = this.#cruxManager.getSelectedFieldMetricData("largest_contentful_paint_image_time_to_first_byte")?.percentiles?.p75;
    const loadDelay = this.#cruxManager.getSelectedFieldMetricData("largest_contentful_paint_image_resource_load_delay")?.percentiles?.p75;
    const loadDuration = this.#cruxManager.getSelectedFieldMetricData("largest_contentful_paint_image_resource_load_duration")?.percentiles?.p75;
    const renderDelay = this.#cruxManager.getSelectedFieldMetricData("largest_contentful_paint_image_element_render_delay")?.percentiles?.p75;
    if (typeof ttfb !== "number" || typeof loadDelay !== "number" || typeof loadDuration !== "number" || typeof renderDelay !== "number") {
      return null;
    }
    return {
      timeToFirstByte: Trace5.Types.Timing.Milli(ttfb),
      resourceLoadDelay: Trace5.Types.Timing.Milli(loadDelay),
      resourceLoadTime: Trace5.Types.Timing.Milli(loadDuration),
      elementRenderDelay: Trace5.Types.Timing.Milli(renderDelay)
    };
  }
  #renderLcpCard() {
    const fieldData = this.#cruxManager.getSelectedFieldMetricData("largest_contentful_paint");
    const nodeLink = this.#lcpValue?.nodeRef && PanelsCommon.DOMLinkifier.Linkifier.instance().linkify(this.#lcpValue?.nodeRef);
    const phases = this.#lcpValue?.phases;
    const fieldPhases = this.#getLcpFieldPhases();
    return html12`
      <devtools-metric-card .data=${{
      metric: "LCP",
      localValue: this.#lcpValue?.value,
      fieldValue: fieldData?.percentiles?.p75,
      histogram: fieldData?.histogram,
      tooltipContainer: this.#tooltipContainerEl,
      warnings: this.#lcpValue?.warnings,
      phases: phases && [
        [i18nString13(UIStrings14.timeToFirstByte), phases.timeToFirstByte, fieldPhases?.timeToFirstByte],
        [i18nString13(UIStrings14.resourceLoadDelay), phases.resourceLoadDelay, fieldPhases?.resourceLoadDelay],
        [i18nString13(UIStrings14.resourceLoadDuration), phases.resourceLoadTime, fieldPhases?.resourceLoadTime],
        [i18nString13(UIStrings14.elementRenderDelay), phases.elementRenderDelay, fieldPhases?.elementRenderDelay]
      ]
    }}>
        ${nodeLink ? html12`
            <div class="related-info" slot="extra-info">
              <span class="related-info-label">${i18nString13(UIStrings14.lcpElement)}</span>
              <span class="related-info-link">
               <devtools-widget .widgetConfig=${widgetConfig(PanelsCommon.DOMLinkifier.DOMNodeLink, { node: this.#lcpValue?.nodeRef })}>
               </devtools-widget>
              </span>
            </div>
          ` : nothing11}
      </devtools-metric-card>
    `;
  }
  #renderClsCard() {
    const fieldData = this.#cruxManager.getSelectedFieldMetricData("cumulative_layout_shift");
    const clusterIds = new Set(this.#clsValue?.clusterShiftIds || []);
    const clusterIsVisible = clusterIds.size > 0 && this.#layoutShifts.some((layoutShift) => clusterIds.has(layoutShift.uniqueLayoutShiftId));
    return html12`
      <devtools-metric-card .data=${{
      metric: "CLS",
      localValue: this.#clsValue?.value,
      fieldValue: fieldData?.percentiles?.p75,
      histogram: fieldData?.histogram,
      tooltipContainer: this.#tooltipContainerEl,
      warnings: this.#clsValue?.warnings
    }}>
        ${clusterIsVisible ? html12`
          <div class="related-info" slot="extra-info">
            <span class="related-info-label">${i18nString13(UIStrings14.worstCluster)}</span>
            <button
              class="link-to-log"
              title=${i18nString13(UIStrings14.showClsCluster)}
              @click=${() => this.#revealLayoutShiftCluster(clusterIds)}
              jslog=${VisualLogging7.action("timeline.landing.show-cls-cluster").track({ click: true })}
            >${i18nString13(UIStrings14.numShifts, { shiftCount: clusterIds.size })}</button>
          </div>
        ` : nothing11}
      </devtools-metric-card>
    `;
  }
  #renderInpCard() {
    const fieldData = this.#cruxManager.getSelectedFieldMetricData("interaction_to_next_paint");
    const phases = this.#inpValue?.phases;
    const interaction = this.#inpValue && this.#interactions.get(this.#inpValue.interactionId);
    return html12`
      <devtools-metric-card .data=${{
      metric: "INP",
      localValue: this.#inpValue?.value,
      fieldValue: fieldData?.percentiles?.p75,
      histogram: fieldData?.histogram,
      tooltipContainer: this.#tooltipContainerEl,
      warnings: this.#inpValue?.warnings,
      phases: phases && [
        [i18nString13(UIStrings14.inputDelay), phases.inputDelay],
        [i18nString13(UIStrings14.processingDuration), phases.processingDuration],
        [i18nString13(UIStrings14.presentationDelay), phases.presentationDelay]
      ]
    }}>
        ${interaction ? html12`
          <div class="related-info" slot="extra-info">
            <span class="related-info-label">${i18nString13(UIStrings14.inpInteractionLink)}</span>
            <button
              class="link-to-log"
              title=${i18nString13(UIStrings14.showInpInteraction)}
              @click=${() => this.#revealInteraction(interaction)}
              jslog=${VisualLogging7.action("timeline.landing.show-inp-interaction").track({ click: true })}
            >${interaction.interactionType}</button>
          </div>
        ` : nothing11}
      </devtools-metric-card>
    `;
  }
  #renderRecordAction(action6) {
    function onClick() {
      void action6.execute();
    }
    return html12`
      <div class="record-action">
        <devtools-button @click=${onClick} .data=${{
      variant: "text",
      size: "REGULAR",
      iconName: action6.icon(),
      title: action6.title(),
      jslogContext: action6.id()
    }}>
          ${action6.title()}
        </devtools-button>
        <span class="shortcut-label">${UI9.ShortcutRegistry.ShortcutRegistry.instance().shortcutTitleForAction(action6.id())}</span>
      </div>
    `;
  }
  #getNetworkRecTitle() {
    const response = this.#cruxManager.getSelectedFieldMetricData("round_trip_time");
    if (!response?.percentiles) {
      return null;
    }
    const rtt = Number(response.percentiles.p75);
    if (!Number.isFinite(rtt)) {
      return null;
    }
    if (rtt < RTT_MINIMUM) {
      return i18nString13(UIStrings14.tryDisablingThrottling);
    }
    const conditions = SDK6.NetworkManager.getRecommendedNetworkPreset(rtt);
    if (!conditions) {
      return null;
    }
    const title = typeof conditions.title === "function" ? conditions.title() : conditions.title;
    return i18nString13(UIStrings14.tryUsingThrottling, { PH1: title });
  }
  #getDeviceRec() {
    const fractions = this.#cruxManager.getFieldResponse(this.#cruxManager.fieldPageScope, "ALL")?.record.metrics.form_factors?.fractions;
    if (!fractions) {
      return null;
    }
    return i18nString13(UIStrings14.percentDevices, {
      PH1: Math.round(fractions.phone * 100),
      PH2: Math.round(fractions.desktop * 100)
    });
  }
  #renderRecordingSettings() {
    const fieldEnabled = this.#cruxManager.getConfigSetting().get().enabled;
    const deviceRecEl = document.createElement("span");
    deviceRecEl.classList.add("environment-rec");
    deviceRecEl.textContent = this.#getDeviceRec() || i18nString13(UIStrings14.notEnoughData);
    const networkRecEl = document.createElement("span");
    networkRecEl.classList.add("environment-rec");
    networkRecEl.textContent = this.#getNetworkRecTitle() || i18nString13(UIStrings14.notEnoughData);
    const recs = getThrottlingRecommendations();
    return html12`
      <h3 class="card-title">${i18nString13(UIStrings14.environmentSettings)}</h3>
      <div class="device-toolbar-description">${md(i18nString13(UIStrings14.useDeviceToolbar))}</div>
      ${fieldEnabled ? html12`
        <ul class="environment-recs-list">
          <li>${uiI18n4.getFormatLocalizedString(str_14, UIStrings14.device, { PH1: deviceRecEl })}</li>
          <li>${uiI18n4.getFormatLocalizedString(str_14, UIStrings14.network, { PH1: networkRecEl })}</li>
        </ul>
      ` : nothing11}
      <div class="environment-option">
        <devtools-widget .widgetConfig=${widgetConfig(CPUThrottlingSelector, { recommendedOption: recs.cpuOption })}></devtools-widget>
      </div>
      <div class="environment-option">
        <devtools-network-throttling-selector .recommendedConditions=${recs.networkConditions}></devtools-network-throttling-selector>
      </div>
      <div class="environment-option">
        <setting-checkbox
          class="network-cache-setting"
          .data=${{
      setting: Common5.Settings.Settings.instance().moduleSetting("cache-disabled"),
      textOverride: i18nString13(UIStrings14.disableNetworkCache)
    }}
        ></setting-checkbox>
      </div>
    `;
  }
  #getPageScopeLabel(pageScope) {
    const key = this.#cruxManager.pageResult?.[`${pageScope}-ALL`]?.record.key[pageScope];
    if (key) {
      return pageScope === "url" ? i18nString13(UIStrings14.urlOptionWithKey, { PH1: key }) : i18nString13(UIStrings14.originOptionWithKey, { PH1: key });
    }
    const baseLabel = pageScope === "url" ? i18nString13(UIStrings14.urlOption) : i18nString13(UIStrings14.originOption);
    return i18nString13(UIStrings14.needsDataOption, { PH1: baseLabel });
  }
  #onPageScopeMenuItemSelected(event) {
    if (event.itemValue === "url") {
      this.#cruxManager.fieldPageScope = "url";
    } else {
      this.#cruxManager.fieldPageScope = "origin";
    }
    void ComponentHelpers8.ScheduledRender.scheduleRender(this, this.#render);
  }
  #renderPageScopeSetting() {
    if (!this.#cruxManager.getConfigSetting().get().enabled) {
      return Lit12.nothing;
    }
    const urlLabel = this.#getPageScopeLabel("url");
    const originLabel = this.#getPageScopeLabel("origin");
    const buttonTitle = this.#cruxManager.fieldPageScope === "url" ? urlLabel : originLabel;
    const accessibleTitle = i18nString13(UIStrings14.showFieldDataForPage, { PH1: buttonTitle });
    const shouldDisable = !this.#cruxManager.pageResult?.["url-ALL"] && !this.#cruxManager.pageResult?.["origin-ALL"];
    return html12`
      <devtools-select-menu
        id="page-scope-select"
        class="field-data-option"
        @selectmenuselected=${this.#onPageScopeMenuItemSelected}
        .showDivider=${true}
        .showArrow=${true}
        .sideButton=${false}
        .showSelectedItem=${true}
        .buttonTitle=${buttonTitle}
        .disabled=${shouldDisable}
        title=${accessibleTitle}
      >
        <devtools-menu-item
          .value=${"url"}
          .selected=${this.#cruxManager.fieldPageScope === "url"}
        >
          ${urlLabel}
        </devtools-menu-item>
        <devtools-menu-item
          .value=${"origin"}
          .selected=${this.#cruxManager.fieldPageScope === "origin"}
        >
          ${originLabel}
        </devtools-menu-item>
      </devtools-select-menu>
    `;
  }
  #getDeviceScopeDisplayName(deviceScope) {
    switch (deviceScope) {
      case "ALL":
        return i18nString13(UIStrings14.allDevices);
      case "DESKTOP":
        return i18nString13(UIStrings14.desktop);
      case "PHONE":
        return i18nString13(UIStrings14.mobile);
      case "TABLET":
        return i18nString13(UIStrings14.tablet);
    }
  }
  #getLabelForDeviceOption(deviceOption) {
    let baseLabel;
    if (deviceOption === "AUTO") {
      const deviceScope = this.#cruxManager.resolveDeviceOptionToScope(deviceOption);
      const deviceScopeLabel = this.#getDeviceScopeDisplayName(deviceScope);
      baseLabel = i18nString13(UIStrings14.auto, { PH1: deviceScopeLabel });
    } else {
      baseLabel = this.#getDeviceScopeDisplayName(deviceOption);
    }
    if (!this.#cruxManager.pageResult) {
      return i18nString13(UIStrings14.loadingOption, { PH1: baseLabel });
    }
    const result = this.#cruxManager.getSelectedFieldResponse();
    if (!result) {
      return i18nString13(UIStrings14.needsDataOption, { PH1: baseLabel });
    }
    return baseLabel;
  }
  #onDeviceOptionMenuItemSelected(event) {
    this.#cruxManager.fieldDeviceOption = event.itemValue;
    void ComponentHelpers8.ScheduledRender.scheduleRender(this, this.#render);
  }
  #renderDeviceScopeSetting() {
    if (!this.#cruxManager.getConfigSetting().get().enabled) {
      return Lit12.nothing;
    }
    const shouldDisable = !this.#cruxManager.getFieldResponse(this.#cruxManager.fieldPageScope, "ALL");
    const currentDeviceLabel = this.#getLabelForDeviceOption(this.#cruxManager.fieldDeviceOption);
    return html12`
      <devtools-select-menu
        id="device-scope-select"
        class="field-data-option"
        @selectmenuselected=${this.#onDeviceOptionMenuItemSelected}
        .showDivider=${true}
        .showArrow=${true}
        .sideButton=${false}
        .showSelectedItem=${true}
        .buttonTitle=${i18nString13(UIStrings14.device, { PH1: currentDeviceLabel })}
        .disabled=${shouldDisable}
        title=${i18nString13(UIStrings14.showFieldDataForDevice, { PH1: currentDeviceLabel })}
      >
        ${DEVICE_OPTION_LIST.map((deviceOption) => {
      return html12`
            <devtools-menu-item
              .value=${deviceOption}
              .selected=${this.#cruxManager.fieldDeviceOption === deviceOption}
            >
              ${this.#getLabelForDeviceOption(deviceOption)}
            </devtools-menu-item>
          `;
    })}
      </devtools-select-menu>
    `;
  }
  #getCollectionPeriodRange() {
    const selectedResponse = this.#cruxManager.getSelectedFieldResponse();
    if (!selectedResponse) {
      return null;
    }
    const { firstDate, lastDate } = selectedResponse.record.collectionPeriod;
    const formattedFirstDate = new Date(
      firstDate.year,
      // CrUX month is 1-indexed but `Date` month is 0-indexed
      firstDate.month - 1,
      firstDate.day
    );
    const formattedLastDate = new Date(
      lastDate.year,
      // CrUX month is 1-indexed but `Date` month is 0-indexed
      lastDate.month - 1,
      lastDate.day
    );
    const options = {
      year: "numeric",
      month: "short",
      day: "numeric"
    };
    return i18nString13(UIStrings14.dateRange, {
      PH1: formattedFirstDate.toLocaleDateString(void 0, options),
      PH2: formattedLastDate.toLocaleDateString(void 0, options)
    });
  }
  #renderFieldDataHistoryLink() {
    if (!this.#cruxManager.getConfigSetting().get().enabled) {
      return Lit12.nothing;
    }
    const normalizedUrl = this.#cruxManager.pageResult?.normalizedUrl;
    if (!normalizedUrl) {
      return Lit12.nothing;
    }
    const tmp = new URL("https://cruxvis.withgoogle.com/");
    tmp.searchParams.set("view", "cwvsummary");
    tmp.searchParams.set("url", normalizedUrl);
    const identifier = this.#cruxManager.fieldPageScope;
    tmp.searchParams.set("identifier", identifier);
    const device = this.#cruxManager.getSelectedDeviceScope();
    tmp.searchParams.set("device", device);
    const cruxVis = `${tmp.origin}/#/${tmp.search}`;
    return html12`
        (<x-link href=${cruxVis}
                 class="local-field-link"
                 title=${i18nString13(UIStrings14.fieldDataHistoryTooltip)}
        >${i18nString13(UIStrings14.fieldDataHistoryLink)}</x-link>)
      `;
  }
  #renderCollectionPeriod() {
    const range = this.#getCollectionPeriodRange();
    const dateEl = document.createElement("span");
    dateEl.classList.add("collection-period-range");
    dateEl.textContent = range || i18nString13(UIStrings14.notEnoughData);
    const message = uiI18n4.getFormatLocalizedString(str_14, UIStrings14.collectionPeriod, {
      PH1: dateEl
    });
    const fieldDataHistoryLink = range ? this.#renderFieldDataHistoryLink() : Lit12.nothing;
    const warnings = this.#cruxManager.pageResult?.warnings || [];
    return html12`
      <div class="field-data-message">
        <div>${message} ${fieldDataHistoryLink}</div>
        ${warnings.map((warning) => html12`
          <div class="field-data-warning">${warning}</div>
        `)}
      </div>
    `;
  }
  #renderFieldDataMessage() {
    if (this.#cruxManager.getConfigSetting().get().enabled) {
      return this.#renderCollectionPeriod();
    }
    const linkEl = UI9.XLink.XLink.create("https://developer.chrome.com/docs/crux", i18n27.i18n.lockedString("Chrome UX Report"));
    const messageEl = uiI18n4.getFormatLocalizedString(str_14, UIStrings14.seeHowYourLocalMetricsCompare, { PH1: linkEl });
    return html12`
      <div class="field-data-message">${messageEl}</div>
    `;
  }
  #renderLogSection() {
    return html12`
      <section
        class="logs-section"
        aria-label=${i18nString13(UIStrings14.eventLogs)}
      >
        <devtools-live-metrics-logs
          ${Lit12.Directives.ref((el) => {
      if (el instanceof HTMLElement) {
        this.#logsEl = el;
      }
    })}
        >
          ${this.#renderInteractionsLog()}
          ${this.#renderLayoutShiftsLog()}
        </devtools-live-metrics-logs>
      </section>
    `;
  }
  async #revealInteraction(interaction) {
    const interactionEl = this.#shadow.getElementById(interaction.interactionId);
    if (!interactionEl || !this.#logsEl) {
      return;
    }
    const success = this.#logsEl.selectTab("interactions");
    if (!success) {
      return;
    }
    await RenderCoordinator2.write(() => {
      interactionEl.scrollIntoView({
        block: "center"
      });
      interactionEl.focus();
      UI9.UIUtils.runCSSAnimationOnce(interactionEl, "highlight");
    });
  }
  async #logExtraInteractionDetails(interaction) {
    const success = await LiveMetrics.LiveMetrics.instance().logInteractionScripts(interaction);
    if (success) {
      await Common5.Console.Console.instance().showPromise();
    }
  }
  #renderInteractionsLog() {
    if (!this.#interactions.size) {
      return Lit12.nothing;
    }
    return html12`
      <ol class="log"
        slot="interactions-log-content"
        ${Lit12.Directives.ref((el) => {
      if (el instanceof HTMLElement) {
        this.#interactionsListEl = el;
      }
    })}
      >
        ${this.#interactions.values().map((interaction) => {
      const metricValue = renderMetricValue("timeline.landing.interaction-event-timing", interaction.duration, INP_THRESHOLDS, (v) => i18n27.TimeUtilities.preciseMillisToString(v), { dim: true });
      const isP98Excluded = this.#inpValue && this.#inpValue.value < interaction.duration;
      const isInp = this.#inpValue?.interactionId === interaction.interactionId;
      return html12`
            <li id=${interaction.interactionId} class="log-item interaction" tabindex="-1">
              <details>
                <summary>
                  <span class="interaction-type">
                    ${interaction.interactionType} ${isInp ? html12`<span class="interaction-inp-chip" title=${i18nString13(UIStrings14.inpInteraction)}>INP</span>` : nothing11}
                  </span>
                  <span class="interaction-node">
                    <devtools-widget .widgetConfig=${widgetConfig(PanelsCommon.DOMLinkifier.DOMNodeLink, { node: interaction.nodeRef })}>
                    </devtools-widget>
                  </span>
                  ${isP98Excluded ? html12`<devtools-icon
                    class="interaction-info"
                    name="info"
                    title=${i18nString13(UIStrings14.interactionExcluded)}
                  ></devtools-icon>` : nothing11}
                  <span class="interaction-duration">${metricValue}</span>
                </summary>
                <div class="phase-table" role="table">
                  <div class="phase-table-row phase-table-header-row" role="row">
                    <div role="columnheader">${i18nString13(UIStrings14.phase)}</div>
                    <div role="columnheader">
                      ${interaction.longAnimationFrameTimings.length ? html12`
                        <button
                          class="log-extra-details-button"
                          title=${i18nString13(UIStrings14.logToConsole)}
                          @click=${() => this.#logExtraInteractionDetails(interaction)}
                        >${i18nString13(UIStrings14.duration)}</button>
                      ` : i18nString13(UIStrings14.duration)}
                    </div>
                  </div>
                  <div class="phase-table-row" role="row">
                    <div role="cell">${i18nString13(UIStrings14.inputDelay)}</div>
                    <div role="cell">${Math.round(interaction.phases.inputDelay)}</div>
                  </div>
                  <div class="phase-table-row" role="row">
                    <div role="cell">${i18nString13(UIStrings14.processingDuration)}</div>
                    <div role="cell">${Math.round(interaction.phases.processingDuration)}</div>
                  </div>
                  <div class="phase-table-row" role="row">
                    <div role="cell">${i18nString13(UIStrings14.presentationDelay)}</div>
                    <div role="cell">${Math.round(interaction.phases.presentationDelay)}</div>
                  </div>
                </div>
              </details>
            </li>
          `;
    })}
      </ol>
    `;
  }
  async #revealLayoutShiftCluster(clusterIds) {
    if (!this.#logsEl) {
      return;
    }
    const layoutShiftEls = [];
    for (const shiftId of clusterIds) {
      const layoutShiftEl = this.#shadow.getElementById(shiftId);
      if (layoutShiftEl) {
        layoutShiftEls.push(layoutShiftEl);
      }
    }
    if (!layoutShiftEls.length) {
      return;
    }
    const success = this.#logsEl.selectTab("layout-shifts");
    if (!success) {
      return;
    }
    await RenderCoordinator2.write(() => {
      layoutShiftEls[0].scrollIntoView({
        block: "start"
      });
      layoutShiftEls[0].focus();
      for (const layoutShiftEl of layoutShiftEls) {
        UI9.UIUtils.runCSSAnimationOnce(layoutShiftEl, "highlight");
      }
    });
  }
  #renderLayoutShiftsLog() {
    if (!this.#layoutShifts.length) {
      return Lit12.nothing;
    }
    return html12`
      <ol class="log"
        slot="layout-shifts-log-content"
        ${Lit12.Directives.ref((el) => {
      if (el instanceof HTMLElement) {
        this.#layoutShiftsListEl = el;
      }
    })}
      >
        ${this.#layoutShifts.map((layoutShift) => {
      const metricValue = renderMetricValue(
        "timeline.landing.layout-shift-event-score",
        layoutShift.score,
        CLS_THRESHOLDS,
        // CLS value is 2 decimal places, but individual shift scores tend to be much smaller
        // so we expand the precision here.
        (v) => v.toFixed(4),
        { dim: true }
      );
      return html12`
            <li id=${layoutShift.uniqueLayoutShiftId} class="log-item layout-shift" tabindex="-1">
              <div class="layout-shift-score">Layout shift score: ${metricValue}</div>
              <div class="layout-shift-nodes">
                ${layoutShift.affectedNodeRefs.map((node) => html12`
                  <div class="layout-shift-node">
                    <devtools-widget .widgetConfig=${widgetConfig(PanelsCommon.DOMLinkifier.DOMNodeLink, { node })}>
                    </devtools-widget>
                  </div>
                `)}
              </div>
            </li>
          `;
    })}
      </ol>
    `;
  }
  #renderNodeView() {
    return html12`
      <style>${liveMetricsView_css_default}</style>
      <style>${metricValueStyles_css_default}</style>
      <div class="node-view">
        <main>
          <h2 class="section-title">${i18nString13(UIStrings14.nodePerformanceTimeline)}</h2>
          <div class="node-description">${i18nString13(UIStrings14.nodeClickToRecord)}</div>
          <div class="record-action-card">${this.#renderRecordAction(this.#toggleRecordAction)}</div>
        </main>
      </div>
    `;
  }
  #render = () => {
    if (this.isNode) {
      Lit12.render(this.#renderNodeView(), this.#shadow, { host: this });
      return;
    }
    const fieldEnabled = this.#cruxManager.getConfigSetting().get().enabled;
    const liveMetricsTitle = fieldEnabled ? i18nString13(UIStrings14.localAndFieldMetrics) : i18nString13(UIStrings14.localMetrics);
    const helpLink = "https://web.dev/articles/lab-and-field-data-differences#lab_data_versus_field_data";
    const output = html12`
      <style>${liveMetricsView_css_default}</style>
      <style>${metricValueStyles_css_default}</style>
      <div class="container">
        <div class="live-metrics-view">
          <main class="live-metrics">
            <h2 class="section-title">${liveMetricsTitle}</h2>
            <div class="metric-cards"
              ${Lit12.Directives.ref((el) => {
      if (el instanceof HTMLElement) {
        this.#tooltipContainerEl = el;
      }
    })}
            >
              <div id="lcp">
                ${this.#renderLcpCard()}
              </div>
              <div id="cls">
                ${this.#renderClsCard()}
              </div>
              <div id="inp">
                ${this.#renderInpCard()}
              </div>
            </div>
            <x-link
              href=${helpLink}
              class="local-field-link"
              title=${i18nString13(UIStrings14.localFieldLearnMoreTooltip)}
            >${i18nString13(UIStrings14.localFieldLearnMoreLink)}</x-link>
            ${this.#renderLogSection()}
          </main>
          <aside class="next-steps" aria-labelledby="next-steps-section-title">
            <h2 id="next-steps-section-title" class="section-title">${i18nString13(UIStrings14.nextSteps)}</h2>
            <div id="field-setup" class="settings-card">
              <h3 class="card-title">${i18nString13(UIStrings14.fieldMetricsTitle)}</h3>
              ${this.#renderFieldDataMessage()}
              ${this.#renderPageScopeSetting()}
              ${this.#renderDeviceScopeSetting()}
              <div class="field-setup-buttons">
                <devtools-field-settings-dialog></devtools-field-settings-dialog>
              </div>
            </div>
            <div id="recording-settings" class="settings-card">
              ${this.#renderRecordingSettings()}
            </div>
            <div id="record" class="record-action-card">
              ${this.#renderRecordAction(this.#toggleRecordAction)}
            </div>
            <div id="record-page-load" class="record-action-card">
              ${this.#renderRecordAction(this.#recordReloadAction)}
            </div>
          </aside>
        </div>
      </div>
    `;
    Lit12.render(output, this.#shadow, { host: this });
  };
};
var LiveMetricsLogs = class extends UI9.Widget.WidgetElement {
  #tabbedPane;
  constructor() {
    super();
    this.style.display = "contents";
  }
  /**
   * Returns `true` if selecting the tab was successful.
   */
  selectTab(tabId) {
    if (!this.#tabbedPane) {
      return false;
    }
    return this.#tabbedPane.selectTab(tabId);
  }
  #clearCurrentLog() {
    const liveMetrics = LiveMetrics.LiveMetrics.instance();
    switch (this.#tabbedPane?.selectedTabId) {
      case "interactions":
        liveMetrics.clearInteractions();
        break;
      case "layout-shifts":
        liveMetrics.clearLayoutShifts();
        break;
    }
  }
  createWidget() {
    const containerWidget = new UI9.Widget.Widget(this, { useShadowDom: true });
    containerWidget.contentElement.style.display = "contents";
    this.#tabbedPane = new UI9.TabbedPane.TabbedPane();
    const interactionsSlot = document.createElement("slot");
    interactionsSlot.name = "interactions-log-content";
    const interactionsTab = UI9.Widget.Widget.getOrCreateWidget(interactionsSlot);
    this.#tabbedPane.appendTab("interactions", i18nString13(UIStrings14.interactions), interactionsTab, void 0, void 0, void 0, void 0, void 0, "timeline.landing.interactions-log");
    const layoutShiftsSlot = document.createElement("slot");
    layoutShiftsSlot.name = "layout-shifts-log-content";
    const layoutShiftsTab = UI9.Widget.Widget.getOrCreateWidget(layoutShiftsSlot);
    this.#tabbedPane.appendTab("layout-shifts", i18nString13(UIStrings14.layoutShifts), layoutShiftsTab, void 0, void 0, void 0, void 0, void 0, "timeline.landing.layout-shifts-log");
    const clearButton = new UI9.Toolbar.ToolbarButton(i18nString13(UIStrings14.clearCurrentLog), "clear", void 0, "timeline.landing.clear-log");
    clearButton.addEventListener("Click", this.#clearCurrentLog, this);
    this.#tabbedPane.rightToolbar().appendToolbarItem(clearButton);
    this.#tabbedPane.show(containerWidget.contentElement);
    return containerWidget;
  }
};
customElements.define("devtools-live-metrics-view", LiveMetricsView);
customElements.define("devtools-live-metrics-logs", LiveMetricsLogs);

// gen/front_end/panels/timeline/components/NetworkRequestDetails.js
var NetworkRequestDetails_exports = {};
__export(NetworkRequestDetails_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW3,
  NetworkRequestDetails: () => NetworkRequestDetails
});
import "./../../../ui/components/request_link_icon/request_link_icon.js";
import * as i18n31 from "./../../../core/i18n/i18n.js";
import * as SDK8 from "./../../../core/sdk/sdk.js";
import * as Helpers6 from "./../../../models/trace/helpers/helpers.js";
import * as Trace7 from "./../../../models/trace/trace.js";
import * as LegacyComponents2 from "./../../../ui/legacy/components/utils/utils.js";
import * as UI10 from "./../../../ui/legacy/legacy.js";
import * as Lit14 from "./../../../ui/lit/lit.js";

// gen/front_end/panels/timeline/components/networkRequestDetails.css.js
var networkRequestDetails_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
  .network-request-details-title {
    font-size: 13px;
    padding: 8px;
    display: flex;
    align-items: center;
  }

  .network-request-details-title > div {
    box-sizing: border-box;
    width: 14px;
    height: 14px;
    border: 1px solid var(--sys-color-divider);
    display: inline-block;
    margin-right: 4px;
  }

  .network-request-details-content {
    border-bottom: 1px solid var(--sys-color-divider);
  }

  .network-request-details-cols {
    display: flex;
    justify-content: space-between;
    width: fit-content;
  }

  :host {
    display: contents; /* needed to avoid a floating border when scrolling */
  }

  .network-request-details-col {
    max-width: 300px;
  }

  .column-divider {
    border-left: 1px solid var(--sys-color-divider);
  }

  .network-request-details-col.server-timings {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    width: fit-content;
    width: 450px;
    gap: 0;
  }

  .network-request-details-item, .network-request-details-col {
    padding: 5px 10px;
  }

  .server-timing-column-header {
    font-weight: var(--ref-typeface-weight-medium);
  }

  .network-request-details-row {
    min-height: min-content;
    display: flex;
    justify-content: space-between;
  }

  .title {
    color: var(--sys-color-token-subtle);
    overflow: hidden;
    padding-right: 10px;
    display: inline-block;
    vertical-align: top;
  }

  .value {
    display: inline-block;
    user-select: text;
    text-overflow: ellipsis;
    overflow: hidden;

    &.synthetic {
      font-style: italic;
    }
  }

  .focusable-outline {
    overflow: visible;
  }

  .devtools-link,
  .timeline-link {
    color: var(--text-link);
    text-decoration: underline;
    outline-offset: 2px;
    padding: 0;
    text-align: left;

    .elements-disclosure & {
      color: var(--text-link);
    }

    devtools-icon {
      vertical-align: baseline;
      color: var(--sys-color-primary);
    }

    :focus .selected & devtools-icon {
      color: var(--sys-color-tonal-container);
    }

    &:focus-visible {
      outline-width: unset;
    }

    &.invalid-link {
      color: var(--text-disabled);
      text-decoration: none;
    }

    &:not(.devtools-link-prevent-click, .invalid-link) {
      cursor: pointer;
    }

    @media (forced-colors: active) {
      &:not(.devtools-link-prevent-click) {
        forced-color-adjust: none;
        color: linktext;
      }

      &:focus-visible {
        background: Highlight;
        color: HighlightText;
      }
    }
  }

  .text-button.link-style,
  .text-button.link-style:hover,
  .text-button.link-style:active {
    background: none;
    border: none;
    font: inherit;
  }
}

/*# sourceURL=${import.meta.resolve("./networkRequestDetails.css")} */`;

// gen/front_end/panels/timeline/components/networkRequestTooltip.css.js
var networkRequestTooltip_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
  .bold {
    font-weight: bold;
  }

  .url {
    margin-left: 15px;
    margin-right: 5px;
  }

  .url--host {
    color: var(--sys-color-token-subtle);
  }

  .priority-row {
    margin-left: 15px;
  }

  .throttled-row {
    margin-left: 15px;
    color: var(--sys-color-yellow);
  }

  .network-category-chip {
    box-sizing: border-box;
    width: 10px;
    height: 10px;
    border: 1px solid var(--sys-color-divider);
    display: inline-block;
    margin-right: 4px;
  }

  devtools-icon.priority {
    height: 13px;
    width: 13px;
    color: var(--sys-color-on-surface-subtle);
  }

  .render-blocking {
    margin-left: 15px;
    color: var(--sys-color-error);
  }

  .divider {
    border-top: 1px solid var(--sys-color-divider);
    margin: 5px 0;
  }

  .timings-row {
    align-self: start;
    display: flex;
    align-items: center;
  }

  .indicator {
    display: inline-block;
    width: 12px;
    height: 6px;
    margin-right: 5px;
    border: 1px solid var(--sys-color-on-surface-subtle);
    box-sizing: border-box;
  }

  devtools-icon.indicator {
    vertical-align: middle;
    height: 12px;
    width: 12px;
    margin-right: 4px;
    color: var(--sys-color-yellow);
    border: none;
  }


  .whisker-left {
    align-self: center;
    display: inline-flex;
    width: 11px;
    height: 6px;
    margin-right: 5px;
    border-left: 1px solid var(--sys-color-on-surface-subtle);
    box-sizing: border-box;
  }

  .whisker-right {
    align-self: center;
    display: inline-flex;
    width: 11px;
    height: 6px;
    margin-right: 5px;
    border-right: 1px solid var(--sys-color-on-surface-subtle);
    box-sizing: border-box;
  }

  .horizontal {
    background-color: var(--sys-color-on-surface-subtle);
    height: 1px;
    width: 10px;
    align-self: center;
  }

  .time {
    /* Push the time to right. */
    margin-left: auto;
    display: inline-block;
    padding-left: 10px;
  }

  .timings-row--duration {
    .indicator {
      border-color: transparent;
    }

    .time {
      font-weight: var(--ref-typeface-weight-medium);
    }

    &.throttled {
      color: var(--sys-color-yellow);
    }
  }

  .redirects-row {
    margin-left: 15px;
  }
}

/*# sourceURL=${import.meta.resolve("./networkRequestTooltip.css")} */`;

// gen/front_end/panels/timeline/components/NetworkRequestTooltip.js
var NetworkRequestTooltip_exports = {};
__export(NetworkRequestTooltip_exports, {
  NetworkRequestTooltip: () => NetworkRequestTooltip
});
import "./../../../ui/components/icon_button/icon_button.js";
import * as i18n29 from "./../../../core/i18n/i18n.js";
import * as Platform7 from "./../../../core/platform/platform.js";
import * as SDK7 from "./../../../core/sdk/sdk.js";
import * as Trace6 from "./../../../models/trace/trace.js";
import * as PerfUI from "./../../../ui/legacy/components/perf_ui/perf_ui.js";
import * as Lit13 from "./../../../ui/lit/lit.js";
import * as TimelineUtils from "./../utils/utils.js";
var { html: html13, nothing: nothing13, Directives: { classMap, ifDefined: ifDefined2 } } = Lit13;
var MAX_URL_LENGTH2 = 60;
var UIStrings15 = {
  /**
   * @description Text that refers to the priority of network request
   */
  priority: "Priority",
  /**
   * @description Text for the duration of a network request
   */
  duration: "Duration",
  /**
   * @description Text that refers to the queueing and connecting time of a network request
   */
  queuingAndConnecting: "Queuing and connecting",
  /**
   * @description Text that refers to the request sent and waiting time of a network request
   */
  requestSentAndWaiting: "Request sent and waiting",
  /**
   * @description Text that refers to the content downloading time of a network request
   */
  contentDownloading: "Content downloading",
  /**
   * @description Text that refers to the waiting on main thread time of a network request
   */
  waitingOnMainThread: "Waiting on main thread",
  /**
   * @description Text that refers to a network request is render blocking
   */
  renderBlocking: "Render blocking",
  /**
   * @description Text to refer to the list of redirects.
   */
  redirects: "Redirects",
  /**
   * @description Cell title in Network Data Grid Node of the Network panel
   * @example {Fast 4G} PH1
   */
  wasThrottled: "Request was throttled ({PH1})"
};
var str_15 = i18n29.i18n.registerUIStrings("panels/timeline/components/NetworkRequestTooltip.ts", UIStrings15);
var i18nString14 = i18n29.i18n.getLocalizedString.bind(void 0, str_15);
var NetworkRequestTooltip = class _NetworkRequestTooltip extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #data = { networkRequest: null, entityMapper: null };
  connectedCallback() {
    this.#render();
  }
  set data(data) {
    if (this.#data.networkRequest === data.networkRequest) {
      return;
    }
    if (this.#data.entityMapper === data.entityMapper) {
      return;
    }
    this.#data = { networkRequest: data.networkRequest, entityMapper: data.entityMapper };
    this.#render();
  }
  static renderPriorityValue(networkRequest) {
    if (networkRequest.args.data.priority === networkRequest.args.data.initialPriority) {
      return html13`${PerfUI.NetworkPriorities.uiLabelForNetworkPriority(networkRequest.args.data.priority)}`;
    }
    return html13`${PerfUI.NetworkPriorities.uiLabelForNetworkPriority(networkRequest.args.data.initialPriority)}
        <devtools-icon name="arrow-forward" class="priority"></devtools-icon>
        ${PerfUI.NetworkPriorities.uiLabelForNetworkPriority(networkRequest.args.data.priority)}`;
  }
  static renderTimings(networkRequest) {
    const syntheticData = networkRequest.args.data.syntheticData;
    const queueing = syntheticData.sendStartTime - networkRequest.ts;
    const requestPlusWaiting = syntheticData.downloadStart - syntheticData.sendStartTime;
    const download = syntheticData.finishTime - syntheticData.downloadStart;
    const waitingOnMainThread = networkRequest.ts + networkRequest.dur - syntheticData.finishTime;
    const color = colorForNetworkRequest(networkRequest);
    const styleForWaiting = {
      backgroundColor: `color-mix(in srgb, ${color}, hsla(0, 100%, 100%, 0.8))`
    };
    const styleForDownloading = {
      backgroundColor: color
    };
    const sdkNetworkRequest = SDK7.TraceObject.RevealableNetworkRequest.create(networkRequest);
    const wasThrottled = sdkNetworkRequest && SDK7.NetworkManager.MultitargetNetworkManager.instance().appliedRequestConditions(sdkNetworkRequest.networkRequest);
    const throttledTitle = wasThrottled ? i18nString14(UIStrings15.wasThrottled, {
      PH1: typeof wasThrottled.conditions.title === "string" ? wasThrottled.conditions.title : wasThrottled.conditions.title()
    }) : void 0;
    const leftWhisker = html13`<span class="whisker-left"> <span class="horizontal"></span> </span>`;
    const rightWhisker = html13`<span class="whisker-right"> <span class="horizontal"></span> </span>`;
    const classes = classMap({
      ["timings-row timings-row--duration"]: true,
      throttled: Boolean(wasThrottled?.urlPattern)
    });
    return html13`
      <div
        class=${classes}
        title=${ifDefined2(throttledTitle)}>
        ${wasThrottled?.urlPattern ? html13`<devtools-icon
          class=indicator
          name=watch
          ></devtools-icon>` : html13`<span class="indicator"></span>`}
        ${i18nString14(UIStrings15.duration)}
         <span class="time"> ${i18n29.TimeUtilities.formatMicroSecondsTime(networkRequest.dur)} </span>
      </div>
      <div class="timings-row">
        ${leftWhisker}
        ${i18nString14(UIStrings15.queuingAndConnecting)}
        <span class="time"> ${i18n29.TimeUtilities.formatMicroSecondsTime(queueing)} </span>
      </div>
      <div class="timings-row">
        <span class="indicator" style=${Lit13.Directives.styleMap(styleForWaiting)}></span>
        ${i18nString14(UIStrings15.requestSentAndWaiting)}
        <span class="time"> ${i18n29.TimeUtilities.formatMicroSecondsTime(requestPlusWaiting)} </span>
      </div>
      <div class="timings-row">
        <span class="indicator" style=${Lit13.Directives.styleMap(styleForDownloading)}></span>
        ${i18nString14(UIStrings15.contentDownloading)}
        <span class="time"> ${i18n29.TimeUtilities.formatMicroSecondsTime(download)} </span>
      </div>
      <div class="timings-row">
        ${rightWhisker}
        ${i18nString14(UIStrings15.waitingOnMainThread)}
        <span class="time"> ${i18n29.TimeUtilities.formatMicroSecondsTime(waitingOnMainThread)} </span>
      </div>
    `;
  }
  static renderRedirects(networkRequest) {
    const redirectRows = [];
    if (networkRequest.args.data.redirects.length > 0) {
      redirectRows.push(html13`
        <div class="redirects-row">
          ${i18nString14(UIStrings15.redirects)}
        </div>
      `);
      for (const redirect of networkRequest.args.data.redirects) {
        redirectRows.push(html13`<div class="redirects-row"> ${redirect.url}</div>`);
      }
      return html13`${redirectRows}`;
    }
    return null;
  }
  #render() {
    if (!this.#data.networkRequest) {
      return;
    }
    const chipStyle = {
      backgroundColor: `${colorForNetworkRequest(this.#data.networkRequest)}`
    };
    const url = new URL(this.#data.networkRequest.args.data.url);
    const entity = this.#data.entityMapper ? this.#data.entityMapper.entityForEvent(this.#data.networkRequest) : null;
    const originWithEntity = TimelineUtils.Helpers.formatOriginWithEntity(url, entity, true);
    const redirectsHtml = _NetworkRequestTooltip.renderRedirects(this.#data.networkRequest);
    const sdkNetworkRequest = SDK7.TraceObject.RevealableNetworkRequest.create(this.#data.networkRequest);
    const wasThrottled = sdkNetworkRequest && SDK7.NetworkManager.MultitargetNetworkManager.instance().appliedRequestConditions(sdkNetworkRequest.networkRequest);
    const output = html13`
      <style>${networkRequestTooltip_css_default}</style>
      <div class="performance-card">
        <div class="url">${Platform7.StringUtilities.trimMiddle(url.href.replace(url.origin, ""), MAX_URL_LENGTH2)}</div>
        <div class="url url--host">${originWithEntity}</div>

        <div class="divider"></div>
        <div class="network-category">
          <span class="network-category-chip" style=${Lit13.Directives.styleMap(chipStyle)}>
          </span>${networkResourceCategory(this.#data.networkRequest)}
        </div>
        <div class="priority-row">${i18nString14(UIStrings15.priority)}: ${_NetworkRequestTooltip.renderPriorityValue(this.#data.networkRequest)}</div>
        ${wasThrottled ? html13`
        <div class="throttled-row">
          ${i18nString14(UIStrings15.wasThrottled, {
      PH1: typeof wasThrottled.conditions.title === "string" ? wasThrottled.conditions.title : wasThrottled.conditions.title()
    })}
        </div>` : nothing13}
        ${Trace6.Helpers.Network.isSyntheticNetworkRequestEventRenderBlocking(this.#data.networkRequest) ? html13`<div class="render-blocking"> ${i18nString14(UIStrings15.renderBlocking)} </div>` : Lit13.nothing}
        <div class="divider"></div>

        ${_NetworkRequestTooltip.renderTimings(this.#data.networkRequest)}

        ${redirectsHtml ? html13`
          <div class="divider"></div>
          ${redirectsHtml}
        ` : Lit13.nothing}
      </div>
    `;
    Lit13.render(output, this.#shadow, { host: this });
  }
};
customElements.define("devtools-performance-network-request-tooltip", NetworkRequestTooltip);

// gen/front_end/panels/timeline/components/NetworkRequestDetails.js
var { html: html14, render: render13 } = Lit14;
var MAX_URL_LENGTH3 = 100;
var UIStrings16 = {
  /**
   * @description Text that refers to the network request method
   */
  requestMethod: "Request method",
  /**
   * @description Text that refers to the network request protocol
   */
  protocol: "Protocol",
  /**
   * @description Text to show the priority of an item
   */
  priority: "Priority",
  /**
   * @description Text used when referring to the data sent in a network request that is encoded as a particular file format.
   */
  encodedData: "Encoded data",
  /**
   * @description Text used to refer to the data sent in a network request that has been decoded.
   */
  decodedBody: "Decoded body",
  /**
   * @description Text in Timeline indicating that input has happened recently
   */
  yes: "Yes",
  /**
   * @description Text in Timeline indicating that input has not happened recently
   */
  no: "No",
  /**
   * @description Text to indicate to the user they are viewing an event representing a network request.
   */
  networkRequest: "Network request",
  /**
   * @description Text for the data source of a network request.
   */
  fromCache: "From cache",
  /**
   * @description Text used to show the mime-type of the data transferred with a network request (e.g. "application/json").
   */
  mimeType: "MIME type",
  /**
   * @description Text used to show the user that a request was served from the browser's in-memory cache.
   */
  FromMemoryCache: " (from memory cache)",
  /**
   * @description Text used to show the user that a request was served from the browser's file cache.
   */
  FromCache: " (from cache)",
  /**
   * @description Label for a network request indicating that it was a HTTP2 server push instead of a regular network request, in the Performance panel
   */
  FromPush: " (from push)",
  /**
   * @description Text used to show a user that a request was served from an installed, active service worker.
   */
  FromServiceWorker: " (from `service worker`)",
  /**
   * @description Text for the event initiated by another one
   */
  initiatedBy: "Initiated by",
  /**
   * @description Text that refers to if the network request is blocking
   */
  blocking: "Blocking",
  /**
   * @description Text that refers to if the network request is in-body parser render blocking
   */
  inBodyParserBlocking: "In-body parser blocking",
  /**
   * @description Text that refers to if the network request is render blocking
   */
  renderBlocking: "Render blocking",
  /**
   * @description Text to refer to a 3rd Party entity.
   */
  entity: "3rd party",
  /**
   * @description Label for a column containing the names of timings (performance metric) taken in the server side application.
   */
  serverTiming: "Server timing",
  /**
   * @description Label for a column containing the values of timings (performance metric) taken in the server side application.
   */
  time: "Time",
  /**
   * @description Label for a column containing the description of timings (performance metric) taken in the server side application.
   */
  description: "Description"
};
var str_16 = i18n31.i18n.registerUIStrings("panels/timeline/components/NetworkRequestDetails.ts", UIStrings16);
var i18nString15 = i18n31.i18n.getLocalizedString.bind(void 0, str_16);
var NetworkRequestDetails = class extends UI10.Widget.Widget {
  #view;
  #request = null;
  #requestPreviewElements = /* @__PURE__ */ new WeakMap();
  #entityMapper = null;
  #target = null;
  #linkifier = null;
  #serverTimings = null;
  #parsedTrace = null;
  constructor(element, view = DEFAULT_VIEW3) {
    super(element);
    this.#view = view;
    this.requestUpdate();
  }
  set linkifier(linkifier) {
    this.#linkifier = linkifier;
    this.requestUpdate();
  }
  set parsedTrace(parsedTrace) {
    this.#parsedTrace = parsedTrace;
    this.requestUpdate();
  }
  set target(maybeTarget) {
    this.#target = maybeTarget;
    this.requestUpdate();
  }
  set request(event) {
    this.#request = event;
    for (const header of event.args.data.responseHeaders ?? []) {
      const headerName = header.name.toLocaleLowerCase();
      if (headerName === "server-timing" || headerName === "server-timing-test") {
        header.name = "server-timing";
        this.#serverTimings = SDK8.ServerTiming.ServerTiming.parseHeaders([header]);
        break;
      }
    }
    this.requestUpdate();
  }
  set entityMapper(mapper) {
    this.#entityMapper = mapper;
    this.requestUpdate();
  }
  performUpdate() {
    this.#view({
      request: this.#request,
      previewElementsCache: this.#requestPreviewElements,
      target: this.#target,
      entityMapper: this.#entityMapper,
      serverTimings: this.#serverTimings,
      linkifier: this.#linkifier,
      parsedTrace: this.#parsedTrace
    }, {}, this.contentElement);
  }
};
var DEFAULT_VIEW3 = (input, _output, target) => {
  if (!input.request) {
    render13(Lit14.nothing, target);
    return;
  }
  const { request } = input;
  const { data } = request.args;
  const redirectsHtml = NetworkRequestTooltip.renderRedirects(request);
  render13(html14`
        <style>${networkRequestDetails_css_default}</style>
        <style>${networkRequestTooltip_css_default}</style>

        <div class="network-request-details-content">
          ${renderTitle(input.request)}
          ${renderURL(input.request)}
          <div class="network-request-details-cols">
            ${Lit14.Directives.until(renderPreviewElement(input.request, input.target, input.previewElementsCache))}
            <div class="network-request-details-col">
              ${renderRow(i18nString15(UIStrings16.requestMethod), data.requestMethod)}
              ${renderRow(i18nString15(UIStrings16.protocol), data.protocol)}
              ${renderRow(i18nString15(UIStrings16.priority), NetworkRequestTooltip.renderPriorityValue(request))}
              ${renderRow(i18nString15(UIStrings16.mimeType), data.mimeType)}
              ${renderEncodedDataLength(request)}
              ${renderRow(i18nString15(UIStrings16.decodedBody), i18n31.ByteUtilities.bytesToString(request.args.data.decodedBodyLength))}
              ${renderBlockingRow(request)}
              ${renderFromCache(request)}
              ${renderThirdPartyEntity(request, input.entityMapper)}
            </div>
            <div class="column-divider"></div>
            <div class="network-request-details-col">
              <div class="timing-rows">
                ${NetworkRequestTooltip.renderTimings(request)}
              </div>
            </div>
            ${renderServerTimings(input.serverTimings)}
            ${redirectsHtml ? html14`
              <div class="column-divider"></div>
              <div class="network-request-details-col redirect-details">
                ${redirectsHtml}
              </div>
            ` : Lit14.nothing}
            </div>
            ${renderInitiatedBy(request, input.parsedTrace, input.target, input.linkifier)}
          </div>
        </div>
     `, target);
};
function renderTitle(request) {
  const style = {
    backgroundColor: `${colorForNetworkRequest(request)}`
  };
  return html14`
    <div class="network-request-details-title">
      <div style=${Lit14.Directives.styleMap(style)}></div>
      ${i18nString15(UIStrings16.networkRequest)}
    </div>
  `;
}
function renderURL(request) {
  const options = {
    tabStop: true,
    showColumnNumber: false,
    inlineFrameIndex: 0,
    maxLength: MAX_URL_LENGTH3
  };
  const linkifiedURL = LegacyComponents2.Linkifier.Linkifier.linkifyURL(request.args.data.url, options);
  const networkRequest = SDK8.TraceObject.RevealableNetworkRequest.create(request);
  if (networkRequest) {
    linkifiedURL.addEventListener("contextmenu", (event) => {
      const contextMenu = new UI10.ContextMenu.ContextMenu(event);
      contextMenu.appendApplicableItems(networkRequest);
      void contextMenu.show();
    });
    const urlElement = html14`
        ${linkifiedURL}
        <devtools-request-link-icon .data=${{ request: networkRequest.networkRequest }}>
        </devtools-request-link-icon>
      `;
    return html14`<div class="network-request-details-item">${urlElement}</div>`;
  }
  return html14`<div class="network-request-details-item">${linkifiedURL}</div>`;
}
async function renderPreviewElement(request, target, previewElementsCache) {
  if (!request.args.data.url || !target) {
    return Lit14.nothing;
  }
  const url = request.args.data.url;
  if (!previewElementsCache.get(request)) {
    const previewOpts = {
      imageAltText: LegacyComponents2.ImagePreview.ImagePreview.defaultAltTextForImageURL(url),
      precomputedFeatures: void 0,
      align: "start",
      hideFileData: true
    };
    const previewElement = await LegacyComponents2.ImagePreview.ImagePreview.build(url, false, previewOpts);
    if (previewElement) {
      previewElementsCache.set(request, previewElement);
    }
  }
  const requestPreviewElement = previewElementsCache.get(request);
  if (requestPreviewElement) {
    return html14`
      <div class="network-request-details-col">${requestPreviewElement}</div>
      <div class="column-divider"></div>`;
  }
  return Lit14.nothing;
}
function renderRow(title, value) {
  if (!value) {
    return Lit14.nothing;
  }
  return html14`
      <div class="network-request-details-row">
        <div class="title">${title}</div>
        <div class="value">${value}</div>
      </div>`;
}
function renderEncodedDataLength(request) {
  let lengthText = "";
  if (request.args.data.syntheticData.isMemoryCached) {
    lengthText += i18nString15(UIStrings16.FromMemoryCache);
  } else if (request.args.data.syntheticData.isDiskCached) {
    lengthText += i18nString15(UIStrings16.FromCache);
  } else if (request.args.data.timing?.pushStart) {
    lengthText += i18nString15(UIStrings16.FromPush);
  }
  if (request.args.data.fromServiceWorker) {
    lengthText += i18nString15(UIStrings16.FromServiceWorker);
  }
  if (request.args.data.encodedDataLength || !lengthText) {
    lengthText = `${i18n31.ByteUtilities.bytesToString(request.args.data.encodedDataLength)}${lengthText}`;
  }
  return renderRow(i18nString15(UIStrings16.encodedData), lengthText);
}
function renderBlockingRow(request) {
  if (!Helpers6.Network.isSyntheticNetworkRequestEventRenderBlocking(request)) {
    return Lit14.nothing;
  }
  let renderBlockingText;
  switch (request.args.data.renderBlocking) {
    case "blocking":
      renderBlockingText = UIStrings16.renderBlocking;
      break;
    case "in_body_parser_blocking":
      renderBlockingText = UIStrings16.inBodyParserBlocking;
      break;
    default:
      return Lit14.nothing;
  }
  return renderRow(i18nString15(UIStrings16.blocking), renderBlockingText);
}
function renderFromCache(request) {
  const cached = request.args.data.syntheticData.isMemoryCached || request.args.data.syntheticData.isDiskCached;
  return renderRow(i18nString15(UIStrings16.fromCache), cached ? i18nString15(UIStrings16.yes) : i18nString15(UIStrings16.no));
}
function renderThirdPartyEntity(request, entityMapper) {
  if (!entityMapper) {
    return Lit14.nothing;
  }
  const entity = entityMapper.entityForEvent(request);
  if (!entity) {
    return Lit14.nothing;
  }
  return renderRow(i18nString15(UIStrings16.entity), entity.name);
}
function renderServerTimings(timings) {
  if (!timings || timings.length === 0) {
    return Lit14.nothing;
  }
  return html14`
    <div class="column-divider"></div>
    <div class="network-request-details-col server-timings">
      <div class="server-timing-column-header">${i18nString15(UIStrings16.serverTiming)}</div>
      <div class="server-timing-column-header">${i18nString15(UIStrings16.description)}</div>
      <div class="server-timing-column-header">${i18nString15(UIStrings16.time)}</div>
      ${timings.map((timing) => {
    const classes = timing.metric.startsWith("(c") ? "synthetic value" : "value";
    return html14`
          <div class=${classes}>${timing.metric || "-"}</div>
          <div class=${classes}>${timing.description || "-"}</div>
          <div class=${classes}>${timing.value || "-"}</div>
        `;
  })}
    </div>`;
}
function renderInitiatedBy(request, parsedTrace, target, linkifier) {
  if (!linkifier) {
    return Lit14.nothing;
  }
  const hasStackTrace = Trace7.Helpers.Trace.stackTraceInEvent(request) !== null;
  let link2 = null;
  const options = {
    tabStop: true,
    showColumnNumber: true,
    inlineFrameIndex: 0
  };
  if (hasStackTrace) {
    const topFrame = Trace7.Helpers.Trace.getStackTraceTopCallFrameInEventPayload(request) ?? null;
    if (topFrame) {
      link2 = linkifier.maybeLinkifyConsoleCallFrame(target, topFrame, options);
    }
  }
  const initiator = parsedTrace?.data.NetworkRequests.eventToInitiator.get(request);
  if (initiator) {
    link2 = linkifier.maybeLinkifyScriptLocation(
      target,
      null,
      // this would be the scriptId, but we don't have one. The linkifier will fallback to using the URL.
      initiator.args.data.url,
      void 0,
      // line number
      options
    );
  }
  if (!link2) {
    return Lit14.nothing;
  }
  return html14`
      <div class="network-request-details-item">
        <div class="title">${i18nString15(UIStrings16.initiatedBy)}</div>
        <div class="value focusable-outline">${link2}</div>
      </div>`;
}

// gen/front_end/panels/timeline/components/RelatedInsightChips.js
var RelatedInsightChips_exports = {};
__export(RelatedInsightChips_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW4,
  RelatedInsightChips: () => RelatedInsightChips
});
import * as i18n33 from "./../../../core/i18n/i18n.js";
import * as UI11 from "./../../../ui/legacy/legacy.js";
import * as Lit15 from "./../../../ui/lit/lit.js";

// gen/front_end/panels/timeline/components/relatedInsightChips.css.js
var relatedInsightChips_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
  :scope {
    display: block;
    border-bottom: 1px solid var(--sys-color-divider);
    flex: none;
  }

  ul {
    list-style: none;
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: var(--sys-size-4);
    padding: 0 var(--sys-size-4);
    justify-content: flex-start;
    align-items: center;
  }

  .insight-chip button {
    background: none;
    user-select: none;
    font: var(--sys-typescale-body4-regular);
    border: var(--sys-size-1) solid var(--sys-color-primary);
    border-radius: var(--sys-shape-corner-extra-small);
    display: flex;
    margin: var(--sys-size-4) 0;
    padding: var(--sys-size-2) var(--sys-size-4) var(--sys-size-2) var(--sys-size-4);
    width: max-content;
    white-space: pre;

    .keyword {
      color: var(--sys-color-primary);
      padding-right: var(--sys-size-3);
    }
  }

  .insight-chip button:hover {
    background-color: var(--sys-color-state-hover-on-subtle);
    cursor: pointer;
    transition: opacity 0.2s ease;
  }

  .insight-message-box {
    background: var(--sys-color-surface-yellow);
    border-radius: var(--sys-shape-corner-extra-small);
    font: var(--sys-typescale-body4-regular);
    margin: var(--sys-size-4) 0;

    button {
      color: var(--sys-color-on-surface-yellow);
      border: none;
      text-align: left;
      background: none;
      padding: var(--sys-size-4) var(--sys-size-5);
      width: 100%;
      max-width: 500px;

      .insight-label {
        color: var(--sys-color-orange-bright);
        padding-right: var(--sys-size-3);
        font-weight: var(--ref-typeface-weight-medium);
        margin-bottom: var(--sys-size-2);
      }

      &:hover {
        background-color: var(--sys-color-state-hover-on-subtle);
        cursor: pointer;
        transition: opacity 0.2s ease;
      }
    }
  }
}

/*# sourceURL=${import.meta.resolve("./relatedInsightChips.css")} */`;

// gen/front_end/panels/timeline/components/RelatedInsightChips.js
var { html: html15, render: render14 } = Lit15;
var UIStrings17 = {
  /**
   * @description prefix shown next to related insight chips
   */
  insightKeyword: "Insight",
  /**
   * @description Prefix shown next to related insight chips and containing the insight name.
   * @example {Improve image delivery} PH1
   */
  insightWithName: "Insight: {PH1}"
};
var str_17 = i18n33.i18n.registerUIStrings("panels/timeline/components/RelatedInsightChips.ts", UIStrings17);
var i18nString16 = i18n33.i18n.getLocalizedString.bind(void 0, str_17);
var RelatedInsightChips = class extends UI11.Widget.Widget {
  #view;
  #activeEvent = null;
  #eventToInsightsMap = /* @__PURE__ */ new Map();
  constructor(element, view = DEFAULT_VIEW4) {
    super(element);
    this.#view = view;
  }
  set activeEvent(event) {
    if (event === this.#activeEvent) {
      return;
    }
    this.#activeEvent = event;
    this.requestUpdate();
  }
  set eventToInsightsMap(map) {
    this.#eventToInsightsMap = map ?? /* @__PURE__ */ new Map();
    this.requestUpdate();
  }
  performUpdate() {
    const input = {
      activeEvent: this.#activeEvent,
      eventToInsightsMap: this.#eventToInsightsMap,
      onInsightClick(insight) {
        insight.activateInsight();
      }
    };
    this.#view(input, {}, this.contentElement);
  }
};
var DEFAULT_VIEW4 = (input, _output, target) => {
  const { activeEvent, eventToInsightsMap } = input;
  const relatedInsights = activeEvent ? eventToInsightsMap.get(activeEvent) ?? [] : [];
  if (!activeEvent || eventToInsightsMap.size === 0 || relatedInsights.length === 0) {
    render14(Lit15.nothing, target);
    return;
  }
  const insightMessages = relatedInsights.flatMap((insight) => {
    return insight.messages.map((message) => html15`
          <li class="insight-message-box">
            <button type="button" @click=${(event) => {
      event.preventDefault();
      input.onInsightClick(insight);
    }}>
              <div class="insight-label">${i18nString16(UIStrings17.insightWithName, {
      PH1: insight.insightLabel
    })}</div>
              <div class="insight-message">${message}</div>
            </button>
          </li>
        `);
  });
  const insightChips = relatedInsights.flatMap((insight) => {
    return [html15`
          <li class="insight-chip">
            <button type="button" @click=${(event) => {
      event.preventDefault();
      input.onInsightClick(insight);
    }}>
              <span class="keyword">${i18nString16(UIStrings17.insightKeyword)}</span>
              <span class="insight-label">${insight.insightLabel}</span>
            </button>
          </li>
        `];
  });
  render14(html15`<style>${relatedInsightChips_css_default}</style>
        <ul>${insightMessages}</ul>
        <ul>${insightChips}</ul>`, target);
};

// gen/front_end/panels/timeline/components/Sidebar.js
var Sidebar_exports = {};
__export(Sidebar_exports, {
  AnnotationHoverOut: () => AnnotationHoverOut,
  DEFAULT_SIDEBAR_TAB: () => DEFAULT_SIDEBAR_TAB,
  DEFAULT_SIDEBAR_WIDTH_PX: () => DEFAULT_SIDEBAR_WIDTH_PX,
  HoverAnnotation: () => HoverAnnotation,
  RemoveAnnotation: () => RemoveAnnotation,
  RevealAnnotation: () => RevealAnnotation,
  SidebarWidget: () => SidebarWidget
});
import * as RenderCoordinator3 from "./../../../ui/components/render_coordinator/render_coordinator.js";
import * as UI13 from "./../../../ui/legacy/legacy.js";

// gen/front_end/panels/timeline/components/insights/SidebarInsight.js
var InsightActivated = class _InsightActivated extends Event {
  model;
  insightSetKey;
  static eventName = "insightactivated";
  constructor(model, insightSetKey) {
    super(_InsightActivated.eventName, { bubbles: true, composed: true });
    this.model = model;
    this.insightSetKey = insightSetKey;
  }
};
var InsightDeactivated = class _InsightDeactivated extends Event {
  static eventName = "insightdeactivated";
  constructor() {
    super(_InsightDeactivated.eventName, { bubbles: true, composed: true });
  }
};

// gen/front_end/panels/timeline/components/SidebarAnnotationsTab.js
var SidebarAnnotationsTab_exports = {};
__export(SidebarAnnotationsTab_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW5,
  SidebarAnnotationsTab: () => SidebarAnnotationsTab
});
import "./../../../ui/components/settings/settings.js";
import * as Common6 from "./../../../core/common/common.js";
import * as i18n35 from "./../../../core/i18n/i18n.js";
import * as Platform8 from "./../../../core/platform/platform.js";
import * as Trace8 from "./../../../models/trace/trace.js";
import * as TraceBounds3 from "./../../../services/trace_bounds/trace_bounds.js";
import * as UI12 from "./../../../ui/legacy/legacy.js";
import * as ThemeSupport3 from "./../../../ui/legacy/theme_support/theme_support.js";
import * as Lit16 from "./../../../ui/lit/lit.js";
import * as VisualLogging8 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/timeline/components/sidebarAnnotationsTab.css.js
var sidebarAnnotationsTab_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
  :scope {
    display: block;
    height: 100%;
  }

  .annotations {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 0;
  }

  .visibility-setting {
    margin-top: auto;
  }

  .annotation-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 var(--sys-size-4);

    .delete-button {
      visibility: hidden;
      border: none;
      background: none;
    }

    &:hover,
    &:focus-within {
      background-color: var(--sys-color-neutral-container);

      button.delete-button {
        visibility: visible;
      }
    }
  }

  .annotation {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    word-break: normal;
    overflow-wrap: anywhere;
    padding: var(--sys-size-8) 0;
    gap: 6px;
  }

  .annotation-identifier {
    padding: 4px 8px;
    border-radius: 10px;
    font-weight: bold;

    &.time-range {
      background-color: var(--app-color-performance-sidebar-time-range);
      color: var(--app-color-performance-sidebar-label-text-light);
    }
  }

  .entries-link {
    display: flex;
    flex-wrap: wrap;
    row-gap: 2px;
    align-items: center;
  }

  .label {
    font-size: larger;
  }

  .annotation-tutorial-container {
    padding: 10px;
  }

  .tutorial-card {
    display: block;
    position: relative;
    margin: 10px 0;
    padding: 10px;
    border-radius: var(--sys-shape-corner-extra-small);
    overflow: hidden;
    border: 1px solid var(--sys-color-divider);
    background-color: var(--sys-color-base);
  }

  .tutorial-image {
    display: flex;
    justify-content: center;

    & > img {
      max-width: 100%;
      height: auto;
    }
  }

  .tutorial-title,
  .tutorial-description {
    margin: 5px 0;
  }
}

/*# sourceURL=${import.meta.resolve("./sidebarAnnotationsTab.css")} */`;

// gen/front_end/panels/timeline/components/SidebarAnnotationsTab.js
var { html: html16, render: render15 } = Lit16;
var diagramImageUrl = new URL("../../../Images/performance-panel-diagram.svg", import.meta.url).toString();
var entryLabelImageUrl = new URL("../../../Images/performance-panel-entry-label.svg", import.meta.url).toString();
var timeRangeImageUrl = new URL("../../../Images/performance-panel-time-range.svg", import.meta.url).toString();
var deleteAnnotationImageUrl = new URL("../../../Images/performance-panel-delete-annotation.svg", import.meta.url).toString();
var UIStrings18 = {
  /**
   * @description Title for entry label.
   */
  annotationGetStarted: "Annotate a trace for yourself and others",
  /**
   * @description Title for entry label.
   */
  entryLabelTutorialTitle: "Label an item",
  /**
   * @description Text for how to create an entry label.
   */
  entryLabelTutorialDescription: "Double-click or press Enter on an item and type to create an item label.",
  /**
   * @description  Title for diagram.
   */
  entryLinkTutorialTitle: "Connect two items",
  /**
   * @description Text for how to create a diagram between entries.
   */
  entryLinkTutorialDescription: "Double-click on an item, click on the adjacent rightward arrow, then select the destination item.",
  /**
   * @description  Title for time range.
   */
  timeRangeTutorialTitle: "Define a time range",
  /**
   * @description Text for how to create a time range selection and add note.
   */
  timeRangeTutorialDescription: "Shift-drag in the flamechart then type to create a time range annotation.",
  /**
   * @description  Title for deleting annotations.
   */
  deleteAnnotationTutorialTitle: "Delete an annotation",
  /**
   * @description Text for how to access an annotation delete function.
   */
  deleteAnnotationTutorialDescription: "Hover over the list in the sidebar with Annotations tab selected to access the delete function.",
  /**
   * @description Text used to describe the delete button to screen readers.
   * @example {"A paint event annotated with the text hello world"} PH1
   **/
  deleteButton: "Delete annotation: {PH1}",
  /**
   * @description label used to describe an annotation on an entry
   * @example {Paint} PH1
   * @example {"Hello world"} PH2
   */
  entryLabelDescriptionLabel: 'A "{PH1}" event annotated with the text "{PH2}"',
  /**
   * @description label used to describe a time range annotation
   * @example {2.5 milliseconds} PH1
   * @example {13.5 milliseconds} PH2
   */
  timeRangeDescriptionLabel: "A time range starting at {PH1} and ending at {PH2}",
  /**
   * @description label used to describe a link from one entry to another.
   * @example {Paint} PH1
   * @example {Recalculate styles} PH2
   */
  entryLinkDescriptionLabel: 'A link between a "{PH1}" event and a "{PH2}" event'
};
var str_18 = i18n35.i18n.registerUIStrings("panels/timeline/components/SidebarAnnotationsTab.ts", UIStrings18);
var i18nString17 = i18n35.i18n.getLocalizedString.bind(void 0, str_18);
var SidebarAnnotationsTab = class extends UI12.Widget.Widget {
  #annotations = [];
  // A map with annotated entries and the colours that are used to display them in the FlameChart.
  // We need this map to display the entries in the sidebar with the same colours.
  #annotationEntryToColorMap = /* @__PURE__ */ new Map();
  #annotationsHiddenSetting;
  #view;
  constructor(view = DEFAULT_VIEW5) {
    super();
    this.#view = view;
    this.#annotationsHiddenSetting = Common6.Settings.Settings.instance().moduleSetting("annotations-hidden");
  }
  deduplicatedAnnotations() {
    return this.#annotations;
  }
  setData(data) {
    this.#annotations = this.#processAnnotationsList(data.annotations);
    this.#annotationEntryToColorMap = data.annotationEntryToColorMap;
    this.requestUpdate();
  }
  #processAnnotationsList(annotations) {
    const entriesWithNotStartedAnnotation = /* @__PURE__ */ new Set();
    const processedAnnotations = annotations.filter((annotation) => {
      if (this.#isAnnotationCreationStarted(annotation)) {
        return true;
      }
      if (annotation.type === "ENTRIES_LINK" || annotation.type === "ENTRY_LABEL") {
        const annotationEntry = annotation.type === "ENTRIES_LINK" ? annotation.entryFrom : annotation.entry;
        if (entriesWithNotStartedAnnotation.has(annotationEntry)) {
          return false;
        }
        entriesWithNotStartedAnnotation.add(annotationEntry);
      }
      return true;
    });
    processedAnnotations.sort((firstAnnotation, secondAnnotation) => this.#getAnnotationTimestamp(firstAnnotation) - this.#getAnnotationTimestamp(secondAnnotation));
    return processedAnnotations;
  }
  #getAnnotationTimestamp(annotation) {
    switch (annotation.type) {
      case "ENTRY_LABEL": {
        return annotation.entry.ts;
      }
      case "ENTRIES_LINK": {
        return annotation.entryFrom.ts;
      }
      case "TIME_RANGE": {
        return annotation.bounds.min;
      }
      default: {
        Platform8.assertNever(annotation, `Invalid annotation type ${annotation}`);
      }
    }
  }
  #isAnnotationCreationStarted(annotation) {
    switch (annotation.type) {
      case "ENTRY_LABEL": {
        return annotation.label.length > 0;
      }
      case "ENTRIES_LINK": {
        return Boolean(annotation.entryTo);
      }
      case "TIME_RANGE": {
        return annotation.bounds.range > 0;
      }
    }
  }
  performUpdate() {
    const input = {
      annotations: this.#annotations,
      annotationsHiddenSetting: this.#annotationsHiddenSetting,
      annotationEntryToColorMap: this.#annotationEntryToColorMap,
      onAnnotationClick: (annotation) => {
        this.contentElement.dispatchEvent(new RevealAnnotation(annotation));
      },
      onAnnotationHover: (annotation) => {
        this.contentElement.dispatchEvent(new HoverAnnotation(annotation));
      },
      onAnnotationHoverOut: () => {
        this.contentElement.dispatchEvent(new AnnotationHoverOut());
      },
      onAnnotationDelete: (annotation) => {
        this.contentElement.dispatchEvent(new RemoveAnnotation(annotation));
      }
    };
    this.#view(input, {}, this.contentElement);
  }
};
function detailedAriaDescriptionForAnnotation(annotation) {
  switch (annotation.type) {
    case "ENTRY_LABEL": {
      const name = Trace8.Name.forEntry(annotation.entry);
      return i18nString17(UIStrings18.entryLabelDescriptionLabel, {
        PH1: name,
        PH2: annotation.label
      });
    }
    case "TIME_RANGE": {
      const from = i18n35.TimeUtilities.formatMicroSecondsAsMillisFixedExpanded(annotation.bounds.min);
      const to = i18n35.TimeUtilities.formatMicroSecondsAsMillisFixedExpanded(annotation.bounds.max);
      return i18nString17(UIStrings18.timeRangeDescriptionLabel, {
        PH1: from,
        PH2: to
      });
    }
    case "ENTRIES_LINK": {
      if (!annotation.entryTo) {
        return "";
      }
      const nameFrom = Trace8.Name.forEntry(annotation.entryFrom);
      const nameTo = Trace8.Name.forEntry(annotation.entryTo);
      return i18nString17(UIStrings18.entryLinkDescriptionLabel, {
        PH1: nameFrom,
        PH2: nameTo
      });
    }
    default:
      Platform8.assertNever(annotation, "Unsupported annotation");
  }
}
function findTextColorForContrast(bgColorText) {
  const bgColor = Common6.Color.parse(bgColorText)?.asLegacyColor();
  const darkColorToken = "--app-color-performance-sidebar-label-text-dark";
  const darkColorText = Common6.Color.parse(ThemeSupport3.ThemeSupport.instance().getComputedValue(darkColorToken))?.asLegacyColor();
  if (!bgColor || !darkColorText) {
    return `var(${darkColorToken})`;
  }
  const contrastRatio = Common6.ColorUtils.contrastRatio(bgColor.rgba(), darkColorText.rgba());
  return contrastRatio >= 4.5 ? `var(${darkColorToken})` : "var(--app-color-performance-sidebar-label-text-light)";
}
function renderAnnotationIdentifier(annotation, annotationEntryToColorMap) {
  switch (annotation.type) {
    case "ENTRY_LABEL": {
      const entryName = Trace8.Name.forEntry(annotation.entry);
      const backgroundColor = annotationEntryToColorMap.get(annotation.entry) ?? "";
      const color = findTextColorForContrast(backgroundColor);
      const styleForAnnotationIdentifier = {
        backgroundColor,
        color
      };
      return html16`
            <span class="annotation-identifier" style=${Lit16.Directives.styleMap(styleForAnnotationIdentifier)}>
              ${entryName}
            </span>
      `;
    }
    case "TIME_RANGE": {
      const minTraceBoundsMilli = TraceBounds3.TraceBounds.BoundsManager.instance().state()?.milli.entireTraceBounds.min ?? 0;
      const timeRangeStartInMs = Math.round(Trace8.Helpers.Timing.microToMilli(annotation.bounds.min) - minTraceBoundsMilli);
      const timeRangeEndInMs = Math.round(Trace8.Helpers.Timing.microToMilli(annotation.bounds.max) - minTraceBoundsMilli);
      return html16`
            <span class="annotation-identifier time-range">
              ${timeRangeStartInMs} - ${timeRangeEndInMs} ms
            </span>
      `;
    }
    case "ENTRIES_LINK": {
      const entryFromName = Trace8.Name.forEntry(annotation.entryFrom);
      const fromBackgroundColor = annotationEntryToColorMap.get(annotation.entryFrom) ?? "";
      const fromTextColor = findTextColorForContrast(fromBackgroundColor);
      const styleForFromAnnotationIdentifier = {
        backgroundColor: fromBackgroundColor,
        color: fromTextColor
      };
      return html16`
        <div class="entries-link">
          <span class="annotation-identifier" style=${Lit16.Directives.styleMap(styleForFromAnnotationIdentifier)}>
            ${entryFromName}
          </span>
          <devtools-icon name="arrow-forward" class="inline-icon large">
          </devtools-icon>
          ${renderEntryToIdentifier(annotation, annotationEntryToColorMap)}
        </div>
    `;
    }
    default:
      Platform8.assertNever(annotation, "Unsupported annotation type");
  }
}
function renderEntryToIdentifier(annotation, annotationEntryToColorMap) {
  if (annotation.entryTo) {
    const entryToName = Trace8.Name.forEntry(annotation.entryTo);
    const toBackgroundColor = annotationEntryToColorMap.get(annotation.entryTo) ?? "";
    const toTextColor = findTextColorForContrast(toBackgroundColor);
    const styleForToAnnotationIdentifier = {
      backgroundColor: toBackgroundColor,
      color: toTextColor
    };
    return html16`
      <span class="annotation-identifier" style=${Lit16.Directives.styleMap(styleForToAnnotationIdentifier)}>
        ${entryToName}
      </span>`;
  }
  return Lit16.nothing;
}
function jslogForAnnotation(annotation) {
  switch (annotation.type) {
    case "ENTRY_LABEL":
      return "entry-label";
    case "TIME_RANGE":
      return "time-range";
    case "ENTRIES_LINK":
      return "entries-link";
    default:
      Platform8.assertNever(annotation, "unknown annotation type");
  }
}
function renderTutorial() {
  return html16`<div class="annotation-tutorial-container">
    ${i18nString17(UIStrings18.annotationGetStarted)}
      <div class="tutorial-card">
        <div class="tutorial-image"><img src=${entryLabelImageUrl}></img></div>
        <div class="tutorial-title">${i18nString17(UIStrings18.entryLabelTutorialTitle)}</div>
        <div class="tutorial-description">${i18nString17(UIStrings18.entryLabelTutorialDescription)}</div>
      </div>
      <div class="tutorial-card">
        <div class="tutorial-image"><img src=${diagramImageUrl}></img></div>
        <div class="tutorial-title">${i18nString17(UIStrings18.entryLinkTutorialTitle)}</div>
        <div class="tutorial-description">${i18nString17(UIStrings18.entryLinkTutorialDescription)}</div>
      </div>
      <div class="tutorial-card">
        <div class="tutorial-image"><img src=${timeRangeImageUrl}></img></div>
        <div class="tutorial-title">${i18nString17(UIStrings18.timeRangeTutorialTitle)}</div>
        <div class="tutorial-description">${i18nString17(UIStrings18.timeRangeTutorialDescription)}</div>
      </div>
      <div class="tutorial-card">
        <div class="tutorial-image"><img src=${deleteAnnotationImageUrl}></img></div>
        <div class="tutorial-title">${i18nString17(UIStrings18.deleteAnnotationTutorialTitle)}</div>
        <div class="tutorial-description">${i18nString17(UIStrings18.deleteAnnotationTutorialDescription)}</div>
      </div>
    </div>`;
}
var DEFAULT_VIEW5 = (input, _output, target) => {
  render15(html16`
      <style>${sidebarAnnotationsTab_css_default}</style>
      <span class="annotations">
        ${input.annotations.length === 0 ? renderTutorial() : html16`
            ${input.annotations.map((annotation) => {
    const label = detailedAriaDescriptionForAnnotation(annotation);
    return html16`
                <div class="annotation-container"
                  @click=${() => input.onAnnotationClick(annotation)}
                  @mouseover=${() => annotation.type === "ENTRY_LABEL" ? input.onAnnotationHover(annotation) : null}
                  @mouseout=${() => annotation.type === "ENTRY_LABEL" ? input.onAnnotationHoverOut() : null}
                  aria-label=${label}
                  tabindex="0"
                  jslog=${VisualLogging8.item(`timeline.annotation-sidebar.annotation-${jslogForAnnotation(annotation)}`).track({ click: true })}
                >
                  <div class="annotation">
                    ${renderAnnotationIdentifier(annotation, input.annotationEntryToColorMap)}
                    <span class="label">
                      ${annotation.type === "ENTRY_LABEL" || annotation.type === "TIME_RANGE" ? annotation.label : ""}
                    </span>
                  </div>
                  <button class="delete-button" aria-label=${i18nString17(UIStrings18.deleteButton, { PH1: label })} @click=${(event) => {
      event.stopPropagation();
      input.onAnnotationDelete(annotation);
    }} jslog=${VisualLogging8.action("timeline.annotation-sidebar.delete").track({ click: true })}>
                    <devtools-icon class="bin-icon extra-large" name="bin"></devtools-icon>
                  </button>
                </div>`;
  })}
            <setting-checkbox class="visibility-setting" .data=${{
    setting: input.annotationsHiddenSetting,
    textOverride: "Hide annotations"
  }}>
            </setting-checkbox>`}
    </span>`, target);
};

// gen/front_end/panels/timeline/components/SidebarInsightsTab.js
var SidebarInsightsTab_exports = {};
__export(SidebarInsightsTab_exports, {
  SidebarInsightsTab: () => SidebarInsightsTab
});

// gen/front_end/panels/timeline/components/SidebarSingleInsightSet.js
var SidebarSingleInsightSet_exports = {};
__export(SidebarSingleInsightSet_exports, {
  SidebarSingleInsightSet: () => SidebarSingleInsightSet
});
import * as i18n37 from "./../../../core/i18n/i18n.js";
import * as Platform9 from "./../../../core/platform/platform.js";
import * as AIAssistance from "./../../../models/ai_assistance/ai_assistance.js";
import * as CrUXManager11 from "./../../../models/crux-manager/crux-manager.js";
import * as Trace9 from "./../../../models/trace/trace.js";
import * as Buttons7 from "./../../../ui/components/buttons/buttons.js";
import * as ComponentHelpers9 from "./../../../ui/components/helpers/helpers.js";
import * as Lit17 from "./../../../ui/lit/lit.js";
import { nothing as nothing18 } from "./../../../ui/lit/lit.js";
import * as VisualLogging9 from "./../../../ui/visual_logging/visual_logging.js";
import * as Insights4 from "./insights/insights.js";

// gen/front_end/panels/timeline/components/sidebarSingleInsightSet.css.js
var sidebarSingleInsightSet_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  display: block;
  padding: 5px 8px;
}

.metrics {
  display: grid;
  align-items: end;
  grid-template-columns: repeat(3, 1fr) 0.5fr;
  row-gap: 5px;
}

.row-border {
  grid-column: 1/5;
  border-top: var(--sys-size-1) solid var(--sys-color-divider);
}

.row-label {
  visibility: hidden;
  font-size: var(--sys-size-7);
}

.metrics--field .row-label {
  visibility: visible;
}

.metrics-row {
  display: contents;
}

.metric {
  flex: 1;
  user-select: text;
  cursor: pointer;
  /* metric container is a button for a11y reasons, so remove default styles
   * */
  background: none;
  border: none;
  padding: 0;
  display: block;
  text-align: left;
}

.metric-value {
  font-size: var(--sys-size-10);
}

.metric-value-bad {
  color: var(--app-color-performance-bad);
}

.metric-value-ok {
  color: var(--app-color-performance-ok);
}

.metric-value-good {
  color: var(--app-color-performance-good);
}

.metric-score-unclassified {
  color: var(--sys-color-token-subtle);
}

.metric-label {
  font: var(--sys-typescale-body4-medium);
}

.number-with-unit {
  white-space: nowrap;

  .unit {
    font-size: 14px;
    padding: 0 1px;
  }
}

.passed-insights-section {
  margin-top: var(--sys-size-5);

  summary {
    font-weight: var(--ref-typeface-weight-medium);
  }
}

.field-mismatch-notice {
  display: grid;
  grid-template-columns: auto auto;
  align-items: center;
  background-color: var(--sys-color-surface3);
  margin: var(--sys-size-6) 0;
  border-radius: var(--sys-shape-corner-extra-small);
  border: var(--sys-size-1) solid var(--sys-color-divider);

  h3 {
    margin-block: 3px;
    font: var(--sys-typescale-body4-medium);
    color: var(--sys-color-on-base);
    padding: var(--sys-size-5) var(--sys-size-6) 0 var(--sys-size-6);
  }

  .field-mismatch-notice__body {
    padding: var(--sys-size-3) var(--sys-size-6) var(--sys-size-5) var(--sys-size-6);
  }

  button {
    padding: 5px;
    background: unset;
    border: unset;
    font: inherit;
    color: var(--sys-color-primary);
    text-decoration: underline;
    cursor: pointer;
  }
}

/*# sourceURL=${import.meta.resolve("./sidebarSingleInsightSet.css")} */`;

// gen/front_end/panels/timeline/components/SidebarSingleInsightSet.js
var { html: html17 } = Lit17.StaticHtml;
var UIStrings19 = {
  /**
   * @description title used for a metric value to tell the user about its score classification
   * @example {INP} PH1
   * @example {1.2s} PH2
   * @example {poor} PH3
   */
  metricScore: "{PH1}: {PH2} {PH3} score",
  /**
   * @description title used for a metric value to tell the user that the data is unavailable
   * @example {INP} PH1
   */
  metricScoreUnavailable: "{PH1}: unavailable",
  /**
   * @description Summary text for an expandable dropdown that contains all insights in a passing state.
   * @example {4} PH1
   */
  passedInsights: "Passed insights ({PH1})",
  /**
   * @description Label denoting that metrics were observed in the field, from real use data (CrUX). Also denotes if from URL or Origin dataset.
   * @example {URL} PH1
   */
  fieldScoreLabel: "Field ({PH1})",
  /**
   * @description Label for an option that selects the page's specific URL as opposed to it's entire origin/domain.
   */
  urlOption: "URL",
  /**
   * @description Label for an option that selects the page's entire origin/domain as opposed to it's specific URL.
   */
  originOption: "Origin",
  /**
   * @description Title for button that closes a warning popup.
   */
  dismissTitle: "Dismiss",
  /**
   * @description Title shown in a warning dialog when field metrics (collected from real users) is worse than the locally observed metrics.
   */
  fieldMismatchTitle: "Field & local metrics mismatch",
  /**
   * @description Text shown in a warning dialog when field metrics (collected from real users) is worse than the locally observed metrics.
   * Asks user to use features such as throttling and device emulation.
   */
  fieldMismatchNotice: "There are many reasons why local and field metrics [may not match](https://web.dev/articles/lab-and-field-data-differences). Adjust [throttling settings and device emulation](https://developer.chrome.com/docs/devtools/device-mode) to analyze traces more similar to the average user's environment."
};
var str_19 = i18n37.i18n.registerUIStrings("panels/timeline/components/SidebarSingleInsightSet.ts", UIStrings19);
var i18nString18 = i18n37.i18n.getLocalizedString.bind(void 0, str_19);
var INSIGHT_NAME_TO_COMPONENT = {
  Cache: Insights4.Cache.Cache,
  CLSCulprits: Insights4.CLSCulprits.CLSCulprits,
  DocumentLatency: Insights4.DocumentLatency.DocumentLatency,
  DOMSize: Insights4.DOMSize.DOMSize,
  DuplicatedJavaScript: Insights4.DuplicatedJavaScript.DuplicatedJavaScript,
  FontDisplay: Insights4.FontDisplay.FontDisplay,
  ForcedReflow: Insights4.ForcedReflow.ForcedReflow,
  ImageDelivery: Insights4.ImageDelivery.ImageDelivery,
  INPBreakdown: Insights4.INPBreakdown.INPBreakdown,
  LCPDiscovery: Insights4.LCPDiscovery.LCPDiscovery,
  LCPBreakdown: Insights4.LCPBreakdown.LCPBreakdown,
  LegacyJavaScript: Insights4.LegacyJavaScript.LegacyJavaScript,
  ModernHTTP: Insights4.ModernHTTP.ModernHTTP,
  NetworkDependencyTree: Insights4.NetworkDependencyTree.NetworkDependencyTree,
  RenderBlocking: Insights4.RenderBlocking.RenderBlocking,
  SlowCSSSelector: Insights4.SlowCSSSelector.SlowCSSSelector,
  ThirdParties: Insights4.ThirdParties.ThirdParties,
  Viewport: Insights4.Viewport.Viewport
};
var SidebarSingleInsightSet = class _SidebarSingleInsightSet extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #activeInsightElement = null;
  #data = {
    insightSetKey: null,
    activeCategory: Trace9.Insights.Types.InsightCategory.ALL,
    activeInsight: null,
    parsedTrace: null
  };
  #dismissedFieldMismatchNotice = false;
  #activeHighlightTimeout = -1;
  set data(data) {
    this.#data = data;
    void ComponentHelpers9.ScheduledRender.scheduleRender(this, this.#render);
  }
  connectedCallback() {
    this.#render();
  }
  disconnectedCallback() {
    window.clearTimeout(this.#activeHighlightTimeout);
  }
  highlightActiveInsight() {
    if (!this.#activeInsightElement) {
      return;
    }
    this.#activeInsightElement.removeAttribute("highlight-insight");
    window.clearTimeout(this.#activeHighlightTimeout);
    requestAnimationFrame(() => {
      this.#activeInsightElement?.setAttribute("highlight-insight", "true");
      this.#activeHighlightTimeout = window.setTimeout(() => {
        this.#activeInsightElement?.removeAttribute("highlight-insight");
      }, 2e3);
    });
  }
  #metricIsVisible(label) {
    if (this.#data.activeCategory === Trace9.Insights.Types.InsightCategory.ALL) {
      return true;
    }
    return label === this.#data.activeCategory;
  }
  #onClickMetric(traceEvent) {
    this.dispatchEvent(new Insights4.EventRef.EventReferenceClick(traceEvent));
  }
  #renderMetricValue(metric, value, relevantEvent) {
    let valueText;
    let valueDisplay;
    let classification;
    if (value === null) {
      valueText = valueDisplay = "-";
      classification = "unclassified";
    } else if (metric === "LCP") {
      const micros = value;
      const { text, element } = NumberWithUnit.formatMicroSecondsAsSeconds(micros);
      valueText = text;
      valueDisplay = element;
      classification = Trace9.Handlers.ModelHandlers.PageLoadMetrics.scoreClassificationForLargestContentfulPaint(micros);
    } else if (metric === "CLS") {
      valueText = valueDisplay = value ? value.toFixed(2) : "0";
      classification = Trace9.Handlers.ModelHandlers.LayoutShifts.scoreClassificationForLayoutShift(value);
    } else if (metric === "INP") {
      const micros = value;
      const { text, element } = NumberWithUnit.formatMicroSecondsAsMillisFixed(micros);
      valueText = text;
      valueDisplay = element;
      classification = Trace9.Handlers.ModelHandlers.UserInteractions.scoreClassificationForInteractionToNextPaint(micros);
    } else {
      Platform9.TypeScriptUtilities.assertNever(metric, `Unexpected metric ${metric}`);
    }
    const title = value !== null ? i18nString18(UIStrings19.metricScore, { PH1: metric, PH2: valueText, PH3: classification }) : i18nString18(UIStrings19.metricScoreUnavailable, { PH1: metric });
    return this.#metricIsVisible(metric) ? html17`
      <button class="metric"
        @click=${relevantEvent ? this.#onClickMetric.bind(this, relevantEvent) : null}
        title=${title}
        aria-label=${title}
      >
        <div class="metric-value metric-value-${classification}">${valueDisplay}</div>
      </button>
    ` : Lit17.nothing;
  }
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  #getLocalMetrics(insightSetKey) {
    if (!this.#data.parsedTrace) {
      return {};
    }
    const insightSet = this.#data.parsedTrace.insights?.get(insightSetKey);
    if (!insightSet) {
      return {};
    }
    const lcp = Trace9.Insights.Common.getLCP(insightSet);
    const cls = Trace9.Insights.Common.getCLS(insightSet);
    const inp = Trace9.Insights.Common.getINP(insightSet);
    return { lcp, cls, inp };
  }
  #getFieldMetrics(insightSetKey) {
    if (!this.#data.parsedTrace) {
      return null;
    }
    const insightSet = this.#data.parsedTrace.insights?.get(insightSetKey);
    if (!insightSet) {
      return null;
    }
    const fieldMetricsResults = Trace9.Insights.Common.getFieldMetricsForInsightSet(insightSet, this.#data.parsedTrace.metadata, CrUXManager11.CrUXManager.instance().getSelectedScope());
    if (!fieldMetricsResults) {
      return null;
    }
    return fieldMetricsResults;
  }
  /**
   * Returns true if LCP or INP are worse in the field than what was observed locally.
   *
   * CLS is ignored because the guidance of applying throttling or device emulation doesn't
   * correlate as much with observing a more average user experience.
   */
  #isFieldWorseThanLocal(local, field) {
    if (local.lcp !== void 0 && field.lcp !== void 0) {
      if (determineCompareRating("LCP", local.lcp, field.lcp) === "better") {
        return true;
      }
    }
    if (local.inp !== void 0 && field.inp !== void 0) {
      if (determineCompareRating("LCP", local.inp, field.inp) === "better") {
        return true;
      }
    }
    return false;
  }
  #dismissFieldMismatchNotice() {
    this.#dismissedFieldMismatchNotice = true;
    this.#render();
  }
  #renderMetrics(insightSetKey) {
    const local = this.#getLocalMetrics(insightSetKey);
    const field = this.#getFieldMetrics(insightSetKey);
    const lcpEl = this.#renderMetricValue("LCP", local.lcp?.value ?? null, local.lcp?.event ?? null);
    const inpEl = this.#renderMetricValue("INP", local.inp?.value ?? null, local.inp?.event ?? null);
    const clsEl = this.#renderMetricValue("CLS", local.cls?.value ?? null, local.cls?.worstClusterEvent ?? null);
    const localMetricsTemplateResult = html17`
      <div class="metrics-row">
        <span>${lcpEl}</span>
        <span>${inpEl}</span>
        <span>${clsEl}</span>
        <span class="row-label">Local</span>
      </div>
      <span class="row-border"></span>
    `;
    let fieldMetricsTemplateResult;
    if (field) {
      const { lcp, inp, cls } = field;
      const lcpEl2 = this.#renderMetricValue("LCP", lcp?.value ?? null, null);
      const inpEl2 = this.#renderMetricValue("INP", inp?.value ?? null, null);
      const clsEl2 = this.#renderMetricValue("CLS", cls?.value ?? null, null);
      let scope = i18nString18(UIStrings19.originOption);
      if (lcp?.pageScope === "url" || inp?.pageScope === "url") {
        scope = i18nString18(UIStrings19.urlOption);
      }
      fieldMetricsTemplateResult = html17`
        <div class="metrics-row">
          <span>${lcpEl2}</span>
          <span>${inpEl2}</span>
          <span>${clsEl2}</span>
          <span class="row-label">${i18nString18(UIStrings19.fieldScoreLabel, { PH1: scope })}</span>
        </div>
        <span class="row-border"></span>
      `;
    }
    const localValues = {
      lcp: local.lcp?.value !== void 0 ? Trace9.Helpers.Timing.microToMilli(local.lcp.value) : void 0,
      inp: local.inp?.value !== void 0 ? Trace9.Helpers.Timing.microToMilli(local.inp.value) : void 0
    };
    const fieldValues = field && {
      lcp: field.lcp?.value !== void 0 ? Trace9.Helpers.Timing.microToMilli(field.lcp.value) : void 0,
      inp: field.inp?.value !== void 0 ? Trace9.Helpers.Timing.microToMilli(field.inp.value) : void 0
    };
    let fieldIsDifferentEl;
    if (!this.#dismissedFieldMismatchNotice && fieldValues && this.#isFieldWorseThanLocal(localValues, fieldValues)) {
      fieldIsDifferentEl = html17`
        <div class="field-mismatch-notice" jslog=${VisualLogging9.section("timeline.insights.field-mismatch")}>
          <h3>${i18nString18(UIStrings19.fieldMismatchTitle)}</h3>
          <devtools-button
            title=${i18nString18(UIStrings19.dismissTitle)}
            .iconName=${"cross"}
            .variant=${"icon"}
            .jslogContext=${"timeline.insights.dismiss-field-mismatch"}
            @click=${this.#dismissFieldMismatchNotice}
          ></devtools-button>
          <div class="field-mismatch-notice__body">${md(i18nString18(UIStrings19.fieldMismatchNotice))}</div>
        </div>
      `;
    }
    const classes = { metrics: true, "metrics--field": Boolean(fieldMetricsTemplateResult) };
    const metricsTableEl = html17`<div class=${Lit17.Directives.classMap(classes)}>
      <div class="metrics-row">
        <span class="metric-label">LCP</span>
        <span class="metric-label">INP</span>
        <span class="metric-label">CLS</span>
        <span class="row-label"></span>
      </div>
      ${localMetricsTemplateResult}
      ${fieldMetricsTemplateResult}
    </div>`;
    return html17`
      ${metricsTableEl}
      ${fieldIsDifferentEl}
    `;
  }
  static categorizeInsights(insightSets, insightSetKey, activeCategory) {
    const insightSet = insightSets?.get(insightSetKey);
    if (!insightSet) {
      return { shownInsights: [], passedInsights: [] };
    }
    const shownInsights = [];
    const passedInsights = [];
    for (const [name, model] of Object.entries(insightSet.model)) {
      const componentClass = INSIGHT_NAME_TO_COMPONENT[name];
      if (!componentClass) {
        continue;
      }
      if (!model || !shouldRenderForCategory({ activeCategory, insightCategory: model.category })) {
        continue;
      }
      if (model instanceof Error) {
        continue;
      }
      if (model.state === "pass") {
        passedInsights.push({ componentClass, model });
      } else {
        shownInsights.push({ componentClass, model });
      }
    }
    return { shownInsights, passedInsights };
  }
  #renderInsights(insights, insightSetKey) {
    const insightSet = insights?.get(insightSetKey);
    if (!insightSet) {
      return Lit17.nothing;
    }
    const fieldMetrics = this.#getFieldMetrics(insightSetKey);
    const { shownInsights: shownInsightsData, passedInsights: passedInsightsData } = _SidebarSingleInsightSet.categorizeInsights(insights, insightSetKey, this.#data.activeCategory);
    const renderInsightComponent = (insightData) => {
      const { componentClass, model } = insightData;
      if (!this.#data.parsedTrace?.insights) {
        return nothing18;
      }
      const agentFocus = AIAssistance.AIContext.AgentFocus.fromInsight(this.#data.parsedTrace, model);
      return html17`<div>
        <${componentClass.litTagName}
          .selected=${this.#data.activeInsight?.model === model}
          ${Lit17.Directives.ref((elem) => {
        if (this.#data.activeInsight?.model === model && elem) {
          this.#activeInsightElement = elem;
        }
      })}
          .model=${model}
          .bounds=${insightSet.bounds}
          .insightSetKey=${insightSetKey}
          .agentFocus=${agentFocus}
          .fieldMetrics=${fieldMetrics}>
        </${componentClass.litTagName}>
      </div>`;
    };
    const shownInsights = shownInsightsData.map(renderInsightComponent);
    const passedInsights = passedInsightsData.map(renderInsightComponent);
    return html17`
      ${shownInsights}
      ${passedInsights.length ? html17`
        <details class="passed-insights-section">
          <summary>${i18nString18(UIStrings19.passedInsights, {
      PH1: passedInsights.length
    })}</summary>
          ${passedInsights}
        </details>
      ` : Lit17.nothing}
    `;
  }
  #render() {
    const { parsedTrace, insightSetKey } = this.#data;
    if (!parsedTrace?.insights || !insightSetKey) {
      Lit17.render(Lit17.nothing, this.#shadow, { host: this });
      return;
    }
    Lit17.render(html17`
      <style>${sidebarSingleInsightSet_css_default}</style>
      <div class="navigation">
        ${this.#renderMetrics(insightSetKey)}
        ${this.#renderInsights(parsedTrace.insights, insightSetKey)}
        </div>
      `, this.#shadow, { host: this });
  }
};
customElements.define("devtools-performance-sidebar-single-navigation", SidebarSingleInsightSet);

// gen/front_end/panels/timeline/components/SidebarInsightsTab.js
import * as Trace10 from "./../../../models/trace/trace.js";
import * as Buttons8 from "./../../../ui/components/buttons/buttons.js";
import * as ComponentHelpers10 from "./../../../ui/components/helpers/helpers.js";
import * as Lit18 from "./../../../ui/lit/lit.js";
import * as Utils from "./../utils/utils.js";
import * as Insights6 from "./insights/insights.js";

// gen/front_end/panels/timeline/components/sidebarInsightsTab.css.js
var sidebarInsightsTab_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  display: flex;
  flex-flow: column nowrap;
  flex-grow: 1;
}

.insight-sets-wrapper {
  display: flex;
  flex-flow: column nowrap;
  flex-grow: 1; /* so it fills the available vertical height in the sidebar */

  details {
    flex-grow: 0;
  }

  details[open] {
    flex-grow: 1;
    border-bottom: 1px solid var(--sys-color-divider);
  }

  summary {
    background-color: var(--sys-color-surface2);
    border-bottom: 1px solid var(--sys-color-divider);
    overflow: hidden;
    padding: 2px 5px;
    text-overflow: ellipsis;
    white-space: nowrap;
    font: var(--sys-typescale-body4-medium);
    display: flex;
    align-items: center;

    &:focus {
      background-color: var(--sys-color-tonal-container);
    }

    &::marker {
      color: var(--sys-color-on-surface-subtle);
      font-size: 11px;
      line-height: 1;
    }

    /* make sure the first summary has a top border */
    details:first-child & {
      border-top: 1px solid var(--sys-color-divider);
    }
  }
}

.zoom-button {
  margin-left: auto;
}

.zoom-icon {
  visibility: hidden;

  &.active devtools-button {
    visibility: visible;
  }
}

.dropdown-icon {
  &.active devtools-button {
    transform: rotate(90deg);
  }
}

/*# sourceURL=${import.meta.resolve("./sidebarInsightsTab.css")} */`;

// gen/front_end/panels/timeline/components/SidebarInsightsTab.js
var { html: html18 } = Lit18;
var SidebarInsightsTab = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #parsedTrace = null;
  #activeInsight = null;
  #selectedCategory = Trace10.Insights.Types.InsightCategory.ALL;
  /**
   * When a trace has sets of insights, we show an accordion with each
   * set within. A set can be specific to a single navigation, or include the
   * beginning of the trace up to the first navigation.
   * You can only have one of these open at any time, and we track it via this ID.
   */
  #selectedInsightSetKey = null;
  // TODO(paulirish): add back a disconnectedCallback() to avoid memory leaks that doesn't cause b/372943062
  set parsedTrace(data) {
    if (data === this.#parsedTrace) {
      return;
    }
    this.#parsedTrace = data;
    this.#selectedInsightSetKey = null;
    if (this.#parsedTrace?.insights) {
      this.#selectedInsightSetKey = [...this.#parsedTrace.insights.keys()].at(0) ?? null;
    }
    void ComponentHelpers10.ScheduledRender.scheduleRender(this, this.#render);
  }
  get activeInsight() {
    return this.#activeInsight;
  }
  set activeInsight(active) {
    if (active === this.#activeInsight) {
      return;
    }
    this.#activeInsight = active;
    if (this.#activeInsight) {
      this.#selectedInsightSetKey = this.#activeInsight.insightSetKey;
    }
    void ComponentHelpers10.ScheduledRender.scheduleRender(this, this.#render);
  }
  #insightSetToggled(id) {
    this.#selectedInsightSetKey = this.#selectedInsightSetKey === id ? null : id;
    if (this.#selectedInsightSetKey !== this.#activeInsight?.insightSetKey) {
      this.dispatchEvent(new Insights6.SidebarInsight.InsightDeactivated());
    }
    void ComponentHelpers10.ScheduledRender.scheduleRender(this, this.#render);
  }
  #insightSetHovered(id) {
    const data = this.#parsedTrace?.insights?.get(id);
    data && this.dispatchEvent(new Insights6.SidebarInsight.InsightSetHovered(data.bounds));
  }
  #insightSetUnhovered() {
    this.dispatchEvent(new Insights6.SidebarInsight.InsightSetHovered());
  }
  #onZoomClick(event, id) {
    event.stopPropagation();
    const data = this.#parsedTrace?.insights?.get(id);
    if (!data) {
      return;
    }
    this.dispatchEvent(new Insights6.SidebarInsight.InsightSetZoom(data.bounds));
  }
  #renderZoomButton(insightSetToggled) {
    const classes = Lit18.Directives.classMap({
      "zoom-icon": true,
      active: insightSetToggled
    });
    return html18`
    <div class=${classes}>
        <devtools-button .data=${{
      variant: "icon",
      iconName: "center-focus-weak",
      size: "SMALL"
    }}
      ></devtools-button></div>`;
  }
  #renderDropdownIcon(insightSetToggled) {
    const containerClasses = Lit18.Directives.classMap({
      "dropdown-icon": true,
      active: insightSetToggled
    });
    return html18`
      <div class=${containerClasses}>
        <devtools-button .data=${{
      variant: "icon",
      iconName: "chevron-right",
      size: "SMALL"
    }}
      ></devtools-button></div>
    `;
  }
  highlightActiveInsight() {
    if (!this.#activeInsight) {
      return;
    }
    const set = this.#shadow?.querySelector(`devtools-performance-sidebar-single-navigation[data-insight-set-key="${this.#activeInsight.insightSetKey}"]`);
    if (!set) {
      return;
    }
    set.highlightActiveInsight();
  }
  #render() {
    if (!this.#parsedTrace?.insights) {
      Lit18.render(Lit18.nothing, this.#shadow, { host: this });
      return;
    }
    const insights = this.#parsedTrace.insights;
    const hasMultipleInsightSets = insights.size > 1;
    const labels = Utils.Helpers.createUrlLabels([...insights.values()].map(({ url }) => url));
    const contents = (
      // clang-format off
      html18`
      <style>${sidebarInsightsTab_css_default}</style>
      <div class="insight-sets-wrapper">
        ${[...insights.values()].map(({ id, url }, index) => {
        const data = {
          insightSetKey: id,
          activeCategory: this.#selectedCategory,
          activeInsight: this.#activeInsight,
          parsedTrace: this.#parsedTrace
        };
        const contents2 = html18`
            <devtools-performance-sidebar-single-navigation
              data-insight-set-key=${id}
              .data=${data}>
            </devtools-performance-sidebar-single-navigation>
          `;
        if (hasMultipleInsightSets) {
          return html18`<details
              ?open=${id === this.#selectedInsightSetKey}
            >
              <summary
                @click=${() => this.#insightSetToggled(id)}
                @mouseenter=${() => this.#insightSetHovered(id)}
                @mouseleave=${() => this.#insightSetUnhovered()}
                title=${url.href}>
                ${this.#renderDropdownIcon(id === this.#selectedInsightSetKey)}
                <span>${labels[index]}</span>
                <span class='zoom-button' @click=${(event) => this.#onZoomClick(event, id)}>${this.#renderZoomButton(id === this.#selectedInsightSetKey)}</span>
              </summary>
              ${contents2}
            </details>`;
        }
        return contents2;
      })}
      </div>
    `
    );
    const result = Lit18.Directives.repeat([contents], () => this.#parsedTrace, (template) => template);
    Lit18.render(result, this.#shadow, { host: this });
  }
};
customElements.define("devtools-performance-sidebar-insights", SidebarInsightsTab);

// gen/front_end/panels/timeline/components/Sidebar.js
var RemoveAnnotation = class _RemoveAnnotation extends Event {
  removedAnnotation;
  static eventName = "removeannotation";
  constructor(removedAnnotation) {
    super(_RemoveAnnotation.eventName, { bubbles: true, composed: true });
    this.removedAnnotation = removedAnnotation;
  }
};
var RevealAnnotation = class _RevealAnnotation extends Event {
  annotation;
  static eventName = "revealannotation";
  constructor(annotation) {
    super(_RevealAnnotation.eventName, { bubbles: true, composed: true });
    this.annotation = annotation;
  }
};
var HoverAnnotation = class _HoverAnnotation extends Event {
  annotation;
  static eventName = "hoverannotation";
  constructor(annotation) {
    super(_HoverAnnotation.eventName, { bubbles: true, composed: true });
    this.annotation = annotation;
  }
};
var AnnotationHoverOut = class _AnnotationHoverOut extends Event {
  static eventName = "annotationhoverout";
  constructor() {
    super(_AnnotationHoverOut.eventName, { bubbles: true, composed: true });
  }
};
var DEFAULT_SIDEBAR_TAB = "insights";
var DEFAULT_SIDEBAR_WIDTH_PX = 240;
var MIN_SIDEBAR_WIDTH_PX = 170;
var SidebarWidget = class extends UI13.Widget.VBox {
  #tabbedPane = new UI13.TabbedPane.TabbedPane();
  #insightsView = new InsightsView();
  #annotationsView = new AnnotationsView();
  /**
   * If the user has an Insight open and then they collapse the sidebar, we
   * deactivate that Insight to avoid it showing overlays etc - as the user has
   * hidden the Sidebar & Insight from view. But we store it because when the
   * user pops the sidebar open, we want to re-activate it.
   */
  #insightToRestoreOnOpen = null;
  constructor() {
    super();
    this.setMinimumSize(MIN_SIDEBAR_WIDTH_PX, 0);
    this.#tabbedPane.appendTab("insights", "Insights", this.#insightsView, void 0, void 0, false, false, 0, "timeline.insights-tab");
    this.#tabbedPane.appendTab("annotations", "Annotations", this.#annotationsView, void 0, void 0, false, false, 1, "timeline.annotations-tab");
    this.#tabbedPane.selectTab(
      "insights"
      /* SidebarTabs.INSIGHTS */
    );
  }
  wasShown() {
    super.wasShown();
    this.#tabbedPane.show(this.element);
    this.#updateAnnotationsCountBadge();
    if (this.#insightToRestoreOnOpen) {
      this.element.dispatchEvent(new InsightActivated(this.#insightToRestoreOnOpen.model, this.#insightToRestoreOnOpen.insightSetKey));
      this.#insightToRestoreOnOpen = null;
    }
    if (this.#tabbedPane.selectedTabId === "insights" && this.#tabbedPane.tabIsDisabled(
      "insights"
      /* SidebarTabs.INSIGHTS */
    )) {
      this.#tabbedPane.selectTab(
        "annotations"
        /* SidebarTabs.ANNOTATIONS */
      );
    }
  }
  willHide() {
    super.willHide();
    const currentlyActiveInsight = this.#insightsView.getActiveInsight();
    this.#insightToRestoreOnOpen = currentlyActiveInsight;
    if (currentlyActiveInsight) {
      this.element.dispatchEvent(new InsightDeactivated());
    }
  }
  setAnnotations(updatedAnnotations, annotationEntryToColorMap) {
    this.#annotationsView.setAnnotations(updatedAnnotations, annotationEntryToColorMap);
    this.#updateAnnotationsCountBadge();
  }
  #updateAnnotationsCountBadge() {
    const annotations = this.#annotationsView.deduplicatedAnnotations();
    this.#tabbedPane.setBadge("annotations", annotations.length > 0 ? annotations.length.toString() : null);
  }
  setParsedTrace(parsedTrace) {
    this.#insightsView.setParsedTrace(parsedTrace);
    this.#tabbedPane.setTabEnabled("insights", Boolean(parsedTrace?.insights && parsedTrace.insights.size > 0));
  }
  setActiveInsight(activeInsight, opts) {
    this.#insightsView.setActiveInsight(activeInsight, opts);
    if (activeInsight) {
      this.#tabbedPane.selectTab(
        "insights"
        /* SidebarTabs.INSIGHTS */
      );
    }
  }
};
var InsightsView = class extends UI13.Widget.VBox {
  #component = new SidebarInsightsTab();
  constructor() {
    super();
    this.element.classList.add("sidebar-insights");
    this.element.appendChild(this.#component);
  }
  setParsedTrace(parsedTrace) {
    this.#component.parsedTrace = parsedTrace;
  }
  getActiveInsight() {
    return this.#component.activeInsight;
  }
  setActiveInsight(active, opts) {
    this.#component.activeInsight = active;
    if (opts.highlight && active) {
      void RenderCoordinator3.done().then(() => {
        this.#component.highlightActiveInsight();
      });
    }
  }
};
var AnnotationsView = class extends UI13.Widget.VBox {
  #component = new SidebarAnnotationsTab();
  constructor() {
    super();
    this.element.classList.add("sidebar-annotations");
    this.#component.show(this.element);
  }
  setAnnotations(annotations, annotationEntryToColorMap) {
    this.#component.setData({ annotations, annotationEntryToColorMap });
  }
  /**
   * The component "de-duplicates" annotations to ensure implementation details
   * about how we create pending annotations don't leak into the UI. We expose
   * these here because we use this count to show the number of annotations in
   * the small adorner in the sidebar tab.
   */
  deduplicatedAnnotations() {
    return this.#component.deduplicatedAnnotations();
  }
};

// gen/front_end/panels/timeline/components/TimelineSummary.js
var TimelineSummary_exports = {};
__export(TimelineSummary_exports, {
  CategorySummary: () => CategorySummary
});
import * as i18n39 from "./../../../core/i18n/i18n.js";
import * as UI14 from "./../../../ui/legacy/legacy.js";
import * as Lit19 from "./../../../ui/lit/lit.js";

// gen/front_end/panels/timeline/components/timelineSummary.css.js
var timelineSummary_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  max-height: 100%;
  overflow: hidden auto;
  scrollbar-width: thin; /* ~11px wide reserved for gutter */
}

.timeline-summary {
  font-size: var(--sys-typescale-body4-size);
  flex-direction: column;
  padding: 0 var(--sys-size-6) var(--sys-size-4) var(--sys-size-8) ;
}

.summary-range {
  font-weight: var(--ref-typeface-weight-medium);
  height: 24.5px;
  line-height: 22px;
}

.category-summary {
  gap: var(--sys-size-4);
  display: flex;
  flex-direction: column;
}

.category-row {
  min-height: 16px;
  line-height: 16px;
}

.category-swatch {
  display: inline-block;
  width: var(--sys-size-6);
  height: var(--sys-size-6);
  margin-right: var(--sys-size-4);
  top: var(--sys-size-1);
  position: relative;
  border: var(--sys-size-1) solid var(--sys-color-neutral-outline);
}

.category-name {
  display: inline;
  word-break: break-all;
}

.category-value {
  text-align: right;
  position: relative;
  float: right;
  z-index: 0;
  width: var(--sys-size-19);
}

.background-bar-container {
  position: absolute;
  inset: 0 0 0 var(--sys-size-3);
  z-index: -1;
}

.background-bar {
  width: 100%;
  float: right;
  height: var(--sys-size-8);
  background-color: var(--sys-color-surface-yellow);
  border-bottom: var(--sys-size-1) solid var(--sys-color-yellow-outline);
}

/*# sourceURL=${import.meta.resolve("./timelineSummary.css")} */`;

// gen/front_end/panels/timeline/components/TimelineSummary.js
var { render: render18, html: html19 } = Lit19;
var UIStrings20 = {
  /**
   * @description Text for total
   */
  total: "Total",
  /**
   * @description Range in Timeline Details View's Summary
   * @example {1ms} PH1
   * @example {10ms} PH2
   */
  rangeSS: "Range:  {PH1} \u2013 {PH2}"
};
var str_20 = i18n39.i18n.registerUIStrings("panels/timeline/components/TimelineSummary.ts", UIStrings20);
var i18nString19 = i18n39.i18n.getLocalizedString.bind(void 0, str_20);
var CategorySummary = class extends HTMLElement {
  #shadow = UI14.UIUtils.createShadowRootWithCoreStyles(this, { cssFile: timelineSummary_css_default, delegatesFocus: void 0 });
  #rangeStart = 0;
  #rangeEnd = 0;
  #total = 0;
  #categories = [];
  set data(data) {
    this.#total = data.total;
    this.#categories = data.categories;
    this.#rangeStart = data.rangeStart;
    this.#rangeEnd = data.rangeEnd;
    this.#render();
  }
  #render() {
    const output = html19`
          <div class="timeline-summary">
              <div class="summary-range">${i18nString19(UIStrings20.rangeSS, { PH1: i18n39.TimeUtilities.millisToString(this.#rangeStart), PH2: i18n39.TimeUtilities.millisToString(this.#rangeEnd) })}</div>
              <div class="category-summary">
                  ${this.#categories.map((category) => {
      return html19`
                          <div class="category-row">
                          <div class="category-swatch" style="background-color: ${category.color};"></div>
                          <div class="category-name">${category.title}</div>
                          <div class="category-value">
                              ${i18n39.TimeUtilities.preciseMillisToString(category.value)}
                              <div class="background-bar-container">
                                  <div class="background-bar" style='width: ${(category.value * 100 / this.#total).toFixed(1)}%;'></div>
                              </div>
                          </div>
                          </div>`;
    })}
                  <div class="category-row">
                      <div class="category-swatch"></div>
                      <div class="category-name">${i18nString19(UIStrings20.total)}</div>
                      <div class="category-value">
                          ${i18n39.TimeUtilities.preciseMillisToString(this.#total)}
                          <div class="background-bar-container">
                              <div class="background-bar"></div>
                          </div>
                      </div>
                  </div>
                </div>
          </div>
          </div>

        </div>`;
    render18(output, this.#shadow, { host: this });
  }
};
customElements.define("devtools-performance-timeline-summary", CategorySummary);
export {
  Breadcrumbs_exports as Breadcrumbs,
  BreadcrumbsUI_exports as BreadcrumbsUI,
  CPUThrottlingSelector_exports as CPUThrottlingSelector,
  DetailsView_exports as DetailsView,
  ExportTraceOptions_exports as ExportTraceOptions,
  FieldSettingsDialog_exports as FieldSettingsDialog,
  IgnoreListSetting_exports as IgnoreListSetting,
  InteractionBreakdown_exports as InteractionBreakdown,
  LayoutShiftDetails_exports as LayoutShiftDetails,
  LiveMetricsView_exports as LiveMetricsView,
  MetricCard_exports as MetricCard,
  NetworkRequestDetails_exports as NetworkRequestDetails,
  NetworkRequestTooltip_exports as NetworkRequestTooltip,
  NetworkThrottlingSelector_exports as NetworkThrottlingSelector,
  OriginMap_exports as OriginMap,
  RelatedInsightChips_exports as RelatedInsightChips,
  Sidebar_exports as Sidebar,
  SidebarAnnotationsTab_exports as SidebarAnnotationsTab,
  SidebarInsightsTab_exports as SidebarInsightsTab,
  SidebarSingleInsightSet_exports as SidebarSingleInsightSet,
  TimelineSummary_exports as TimelineSummary,
  Utils_exports as Utils
};
//# sourceMappingURL=components.js.map
