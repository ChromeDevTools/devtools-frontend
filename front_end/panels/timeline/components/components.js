var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../front_end/panels/timeline/components/Breadcrumbs.ts
var Breadcrumbs_exports = {};
__export(Breadcrumbs_exports, {
  Breadcrumbs: () => Breadcrumbs,
  flattenBreadcrumbs: () => flattenBreadcrumbs
});
import * as TraceBounds from "../../../services/trace_bounds/trace_bounds.js";
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
    TraceBounds.TraceBounds.BoundsManager.instance().setMiniMapBounds(
      activeBreadcrumb.window
    );
    if (options.updateVisibleWindow) {
      TraceBounds.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(
        activeBreadcrumb.window
      );
    }
  }
};

// ../../front_end/panels/timeline/components/BreadcrumbsUI.ts
var BreadcrumbsUI_exports = {};
__export(BreadcrumbsUI_exports, {
  BreadcrumbActivatedEvent: () => BreadcrumbActivatedEvent,
  BreadcrumbsUI: () => BreadcrumbsUI
});
import * as i18n from "../../../core/i18n/i18n.js";
import * as Trace from "../../../models/trace/trace.js";
import * as ComponentHelpers from "../../../ui/components/helpers/helpers.js";
import * as UI from "../../../ui/legacy/legacy.js";
import * as Lit from "../../../ui/lit/lit.js";
import * as VisualLogging from "../../../ui/visual_logging/visual_logging.js";

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
  padding: var(--sys-size-2) var(--sys-size-4);
  border-radius: var(--sys-shape-corner-extra-small);
}

.breadcrumb:hover {
  background-color: var(--sys-color-state-hover-on-subtle);
}

.range {
  font-size: var(--sys-typescale-body4-size);
  white-space: nowrap;
}

.active-breadcrumb {
  font-weight: bold;
  color: var(--app-color-active-breadcrumb);
}

/*# sourceURL=${import.meta.resolve("./breadcrumbsUI.css")} */`;

// ../../front_end/panels/timeline/components/BreadcrumbsUI.ts
var { render, html } = Lit;
var UIStrings = {
  /**
   * @description Context menu item in the Performance panel to activate the selected breadcrumb.
   */
  activateBreadcrumb: "Activate breadcrumb",
  /**
   * @description Context menu item in the Performance panel to remove all child breadcrumbs and activate the selected breadcrumb.
   */
  removeChildBreadcrumbs: "Remove child breadcrumbs"
};
var str_ = i18n.i18n.registerUIStrings("panels/timeline/components/BreadcrumbsUI.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var BreadcrumbActivatedEvent = class _BreadcrumbActivatedEvent extends Event {
  constructor(breadcrumb, childBreadcrumbsRemoved) {
    super(_BreadcrumbActivatedEvent.eventName);
    this.breadcrumb = breadcrumb;
    this.childBreadcrumbsRemoved = childBreadcrumbsRemoved;
  }
  breadcrumb;
  childBreadcrumbsRemoved;
  static eventName = "breadcrumbactivated";
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
          jslog=${VisualLogging.item("timeline.breadcrumb-select").track({ click: true, resize: true })}>
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

// ../../front_end/panels/timeline/components/CWVMetrics.ts
var CWVMetrics_exports = {};
__export(CWVMetrics_exports, {
  CWVMetrics: () => CWVMetrics,
  getFieldMetrics: () => getFieldMetrics
});
import * as i18n5 from "../../../core/i18n/i18n.js";
import * as Platform2 from "../../../core/platform/platform.js";
import * as CrUXManager from "../../../models/crux-manager/crux-manager.js";
import * as Trace2 from "../../../models/trace/trace.js";
import * as Buttons from "../../../ui/components/buttons/buttons.js";
import * as UI2 from "../../../ui/legacy/legacy.js";
import * as Lit2 from "../../../ui/lit/lit.js";
import * as VisualLogging3 from "../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/timeline/components/cwvMetrics.css.js
var cwvMetrics_css_default = `/*
 * Copyright 2026 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

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

.soft-nav-badge-row {
  display: contents;
}

/*# sourceURL=${import.meta.resolve("./cwvMetrics.css")} */`;

// ../../front_end/panels/timeline/components/CWVMetrics.ts
import * as Insights2 from "./insights/insights.js";

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

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  height: var(--sys-size-8);
  border-radius: var(--sys-shape-corner-extra-small);
  padding: 0 var(--sys-size-3);
  border: var(--sys-size-1) solid var(--sys-color-primary);
  color: var(--sys-color-primary);
  font-weight: var(--ref-typeface-weight-bold);
  font-size: var(--sys-size-5);
  text-align: center;
  margin-top: var(--sys-size-5);
  margin-bottom: var(--sys-size-5);
}

/*# sourceURL=${import.meta.resolve("./metricValueStyles.css")} */`;

// ../../front_end/panels/timeline/components/Utils.ts
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
  isFieldWorseThanLocal: () => isFieldWorseThanLocal,
  networkResourceCategory: () => networkResourceCategory,
  rateMetric: () => rateMetric,
  renderMetricValue: () => renderMetricValue
});
import * as i18n3 from "../../../core/i18n/i18n.js";
import * as Platform from "../../../core/platform/platform.js";

// ../../front_end/generated/protocol.ts
var Accessibility;
((Accessibility2) => {
  let AXValueType;
  ((AXValueType2) => {
    AXValueType2["Boolean"] = "boolean";
    AXValueType2["Tristate"] = "tristate";
    AXValueType2["BooleanOrUndefined"] = "booleanOrUndefined";
    AXValueType2["Idref"] = "idref";
    AXValueType2["IdrefList"] = "idrefList";
    AXValueType2["Integer"] = "integer";
    AXValueType2["Node"] = "node";
    AXValueType2["NodeList"] = "nodeList";
    AXValueType2["Number"] = "number";
    AXValueType2["String"] = "string";
    AXValueType2["ComputedString"] = "computedString";
    AXValueType2["Token"] = "token";
    AXValueType2["TokenList"] = "tokenList";
    AXValueType2["DomRelation"] = "domRelation";
    AXValueType2["Role"] = "role";
    AXValueType2["InternalRole"] = "internalRole";
    AXValueType2["ValueUndefined"] = "valueUndefined";
  })(AXValueType = Accessibility2.AXValueType || (Accessibility2.AXValueType = {}));
  let AXValueSourceType;
  ((AXValueSourceType2) => {
    AXValueSourceType2["Attribute"] = "attribute";
    AXValueSourceType2["Implicit"] = "implicit";
    AXValueSourceType2["Style"] = "style";
    AXValueSourceType2["Contents"] = "contents";
    AXValueSourceType2["Placeholder"] = "placeholder";
    AXValueSourceType2["RelatedElement"] = "relatedElement";
  })(AXValueSourceType = Accessibility2.AXValueSourceType || (Accessibility2.AXValueSourceType = {}));
  let AXValueNativeSourceType;
  ((AXValueNativeSourceType2) => {
    AXValueNativeSourceType2["Description"] = "description";
    AXValueNativeSourceType2["Figcaption"] = "figcaption";
    AXValueNativeSourceType2["Label"] = "label";
    AXValueNativeSourceType2["Labelfor"] = "labelfor";
    AXValueNativeSourceType2["Labelwrapped"] = "labelwrapped";
    AXValueNativeSourceType2["Legend"] = "legend";
    AXValueNativeSourceType2["Rubyannotation"] = "rubyannotation";
    AXValueNativeSourceType2["Tablecaption"] = "tablecaption";
    AXValueNativeSourceType2["Title"] = "title";
    AXValueNativeSourceType2["Other"] = "other";
  })(AXValueNativeSourceType = Accessibility2.AXValueNativeSourceType || (Accessibility2.AXValueNativeSourceType = {}));
  let AXPropertyName;
  ((AXPropertyName2) => {
    AXPropertyName2["Actions"] = "actions";
    AXPropertyName2["Busy"] = "busy";
    AXPropertyName2["Disabled"] = "disabled";
    AXPropertyName2["Editable"] = "editable";
    AXPropertyName2["Focusable"] = "focusable";
    AXPropertyName2["Focused"] = "focused";
    AXPropertyName2["Hidden"] = "hidden";
    AXPropertyName2["HiddenRoot"] = "hiddenRoot";
    AXPropertyName2["Invalid"] = "invalid";
    AXPropertyName2["Keyshortcuts"] = "keyshortcuts";
    AXPropertyName2["Settable"] = "settable";
    AXPropertyName2["Roledescription"] = "roledescription";
    AXPropertyName2["Live"] = "live";
    AXPropertyName2["Atomic"] = "atomic";
    AXPropertyName2["Relevant"] = "relevant";
    AXPropertyName2["Root"] = "root";
    AXPropertyName2["Autocomplete"] = "autocomplete";
    AXPropertyName2["HasPopup"] = "hasPopup";
    AXPropertyName2["Level"] = "level";
    AXPropertyName2["Multiselectable"] = "multiselectable";
    AXPropertyName2["Orientation"] = "orientation";
    AXPropertyName2["Multiline"] = "multiline";
    AXPropertyName2["Readonly"] = "readonly";
    AXPropertyName2["Required"] = "required";
    AXPropertyName2["Valuemin"] = "valuemin";
    AXPropertyName2["Valuemax"] = "valuemax";
    AXPropertyName2["Valuetext"] = "valuetext";
    AXPropertyName2["Checked"] = "checked";
    AXPropertyName2["Expanded"] = "expanded";
    AXPropertyName2["Modal"] = "modal";
    AXPropertyName2["Pressed"] = "pressed";
    AXPropertyName2["Selected"] = "selected";
    AXPropertyName2["Activedescendant"] = "activedescendant";
    AXPropertyName2["Controls"] = "controls";
    AXPropertyName2["Describedby"] = "describedby";
    AXPropertyName2["Details"] = "details";
    AXPropertyName2["Errormessage"] = "errormessage";
    AXPropertyName2["Flowto"] = "flowto";
    AXPropertyName2["Labelledby"] = "labelledby";
    AXPropertyName2["Owns"] = "owns";
    AXPropertyName2["Url"] = "url";
    AXPropertyName2["ActiveFullscreenElement"] = "activeFullscreenElement";
    AXPropertyName2["ActiveModalDialog"] = "activeModalDialog";
    AXPropertyName2["ActiveAriaModalDialog"] = "activeAriaModalDialog";
    AXPropertyName2["AriaHiddenElement"] = "ariaHiddenElement";
    AXPropertyName2["AriaHiddenSubtree"] = "ariaHiddenSubtree";
    AXPropertyName2["EmptyAlt"] = "emptyAlt";
    AXPropertyName2["EmptyText"] = "emptyText";
    AXPropertyName2["InertElement"] = "inertElement";
    AXPropertyName2["InertSubtree"] = "inertSubtree";
    AXPropertyName2["LabelContainer"] = "labelContainer";
    AXPropertyName2["LabelFor"] = "labelFor";
    AXPropertyName2["NotRendered"] = "notRendered";
    AXPropertyName2["NotVisible"] = "notVisible";
    AXPropertyName2["PresentationalRole"] = "presentationalRole";
    AXPropertyName2["ProbablyPresentational"] = "probablyPresentational";
    AXPropertyName2["InactiveCarouselTabContent"] = "inactiveCarouselTabContent";
    AXPropertyName2["Uninteresting"] = "uninteresting";
  })(AXPropertyName = Accessibility2.AXPropertyName || (Accessibility2.AXPropertyName = {}));
})(Accessibility || (Accessibility = {}));
var Animation;
((Animation2) => {
  let AnimationType;
  ((AnimationType2) => {
    AnimationType2["CSSTransition"] = "CSSTransition";
    AnimationType2["CSSAnimation"] = "CSSAnimation";
    AnimationType2["WebAnimation"] = "WebAnimation";
  })(AnimationType = Animation2.AnimationType || (Animation2.AnimationType = {}));
})(Animation || (Animation = {}));
var Audits;
((Audits2) => {
  let CookieExclusionReason;
  ((CookieExclusionReason2) => {
    CookieExclusionReason2["ExcludeSameSiteUnspecifiedTreatedAsLax"] = "ExcludeSameSiteUnspecifiedTreatedAsLax";
    CookieExclusionReason2["ExcludeSameSiteNoneInsecure"] = "ExcludeSameSiteNoneInsecure";
    CookieExclusionReason2["ExcludeSameSiteLax"] = "ExcludeSameSiteLax";
    CookieExclusionReason2["ExcludeSameSiteStrict"] = "ExcludeSameSiteStrict";
    CookieExclusionReason2["ExcludeDomainNonASCII"] = "ExcludeDomainNonASCII";
    CookieExclusionReason2["ExcludeThirdPartyCookieBlockedInFirstPartySet"] = "ExcludeThirdPartyCookieBlockedInFirstPartySet";
    CookieExclusionReason2["ExcludeThirdPartyPhaseout"] = "ExcludeThirdPartyPhaseout";
    CookieExclusionReason2["ExcludePortMismatch"] = "ExcludePortMismatch";
    CookieExclusionReason2["ExcludeSchemeMismatch"] = "ExcludeSchemeMismatch";
  })(CookieExclusionReason = Audits2.CookieExclusionReason || (Audits2.CookieExclusionReason = {}));
  let CookieWarningReason;
  ((CookieWarningReason2) => {
    CookieWarningReason2["WarnSameSiteUnspecifiedCrossSiteContext"] = "WarnSameSiteUnspecifiedCrossSiteContext";
    CookieWarningReason2["WarnSameSiteNoneInsecure"] = "WarnSameSiteNoneInsecure";
    CookieWarningReason2["WarnSameSiteUnspecifiedLaxAllowUnsafe"] = "WarnSameSiteUnspecifiedLaxAllowUnsafe";
    CookieWarningReason2["WarnSameSiteStrictLaxDowngradeStrict"] = "WarnSameSiteStrictLaxDowngradeStrict";
    CookieWarningReason2["WarnSameSiteStrictCrossDowngradeStrict"] = "WarnSameSiteStrictCrossDowngradeStrict";
    CookieWarningReason2["WarnSameSiteStrictCrossDowngradeLax"] = "WarnSameSiteStrictCrossDowngradeLax";
    CookieWarningReason2["WarnSameSiteLaxCrossDowngradeStrict"] = "WarnSameSiteLaxCrossDowngradeStrict";
    CookieWarningReason2["WarnSameSiteLaxCrossDowngradeLax"] = "WarnSameSiteLaxCrossDowngradeLax";
    CookieWarningReason2["WarnAttributeValueExceedsMaxSize"] = "WarnAttributeValueExceedsMaxSize";
    CookieWarningReason2["WarnDomainNonASCII"] = "WarnDomainNonASCII";
    CookieWarningReason2["WarnThirdPartyPhaseout"] = "WarnThirdPartyPhaseout";
    CookieWarningReason2["WarnCrossSiteRedirectDowngradeChangesInclusion"] = "WarnCrossSiteRedirectDowngradeChangesInclusion";
    CookieWarningReason2["WarnDeprecationTrialMetadata"] = "WarnDeprecationTrialMetadata";
    CookieWarningReason2["WarnThirdPartyCookieHeuristic"] = "WarnThirdPartyCookieHeuristic";
  })(CookieWarningReason = Audits2.CookieWarningReason || (Audits2.CookieWarningReason = {}));
  let CookieOperation;
  ((CookieOperation2) => {
    CookieOperation2["SetCookie"] = "SetCookie";
    CookieOperation2["ReadCookie"] = "ReadCookie";
  })(CookieOperation = Audits2.CookieOperation || (Audits2.CookieOperation = {}));
  let InsightType;
  ((InsightType2) => {
    InsightType2["GitHubResource"] = "GitHubResource";
    InsightType2["GracePeriod"] = "GracePeriod";
    InsightType2["Heuristics"] = "Heuristics";
  })(InsightType = Audits2.InsightType || (Audits2.InsightType = {}));
  let PerformanceIssueType;
  ((PerformanceIssueType2) => {
    PerformanceIssueType2["DocumentCookie"] = "DocumentCookie";
  })(PerformanceIssueType = Audits2.PerformanceIssueType || (Audits2.PerformanceIssueType = {}));
  let MixedContentResolutionStatus;
  ((MixedContentResolutionStatus2) => {
    MixedContentResolutionStatus2["MixedContentBlocked"] = "MixedContentBlocked";
    MixedContentResolutionStatus2["MixedContentAutomaticallyUpgraded"] = "MixedContentAutomaticallyUpgraded";
    MixedContentResolutionStatus2["MixedContentWarning"] = "MixedContentWarning";
  })(MixedContentResolutionStatus = Audits2.MixedContentResolutionStatus || (Audits2.MixedContentResolutionStatus = {}));
  let MixedContentResourceType;
  ((MixedContentResourceType2) => {
    MixedContentResourceType2["Audio"] = "Audio";
    MixedContentResourceType2["Beacon"] = "Beacon";
    MixedContentResourceType2["CSPReport"] = "CSPReport";
    MixedContentResourceType2["Download"] = "Download";
    MixedContentResourceType2["EventSource"] = "EventSource";
    MixedContentResourceType2["Favicon"] = "Favicon";
    MixedContentResourceType2["Font"] = "Font";
    MixedContentResourceType2["Form"] = "Form";
    MixedContentResourceType2["Frame"] = "Frame";
    MixedContentResourceType2["Image"] = "Image";
    MixedContentResourceType2["Import"] = "Import";
    MixedContentResourceType2["JSON"] = "JSON";
    MixedContentResourceType2["Manifest"] = "Manifest";
    MixedContentResourceType2["Ping"] = "Ping";
    MixedContentResourceType2["PluginData"] = "PluginData";
    MixedContentResourceType2["PluginResource"] = "PluginResource";
    MixedContentResourceType2["Prefetch"] = "Prefetch";
    MixedContentResourceType2["Resource"] = "Resource";
    MixedContentResourceType2["Script"] = "Script";
    MixedContentResourceType2["ServiceWorker"] = "ServiceWorker";
    MixedContentResourceType2["SharedWorker"] = "SharedWorker";
    MixedContentResourceType2["SpeculationRules"] = "SpeculationRules";
    MixedContentResourceType2["Stylesheet"] = "Stylesheet";
    MixedContentResourceType2["Track"] = "Track";
    MixedContentResourceType2["Video"] = "Video";
    MixedContentResourceType2["Worker"] = "Worker";
    MixedContentResourceType2["XMLHttpRequest"] = "XMLHttpRequest";
    MixedContentResourceType2["XSLT"] = "XSLT";
  })(MixedContentResourceType = Audits2.MixedContentResourceType || (Audits2.MixedContentResourceType = {}));
  let BlockedByResponseReason;
  ((BlockedByResponseReason2) => {
    BlockedByResponseReason2["CoepFrameResourceNeedsCoepHeader"] = "CoepFrameResourceNeedsCoepHeader";
    BlockedByResponseReason2["CoopSandboxedIFrameCannotNavigateToCoopPage"] = "CoopSandboxedIFrameCannotNavigateToCoopPage";
    BlockedByResponseReason2["CorpNotSameOrigin"] = "CorpNotSameOrigin";
    BlockedByResponseReason2["CorpNotSameOriginAfterDefaultedToSameOriginByCoep"] = "CorpNotSameOriginAfterDefaultedToSameOriginByCoep";
    BlockedByResponseReason2["CorpNotSameOriginAfterDefaultedToSameOriginByDip"] = "CorpNotSameOriginAfterDefaultedToSameOriginByDip";
    BlockedByResponseReason2["CorpNotSameOriginAfterDefaultedToSameOriginByCoepAndDip"] = "CorpNotSameOriginAfterDefaultedToSameOriginByCoepAndDip";
    BlockedByResponseReason2["CorpNotSameSite"] = "CorpNotSameSite";
    BlockedByResponseReason2["SRIMessageSignatureMismatch"] = "SRIMessageSignatureMismatch";
  })(BlockedByResponseReason = Audits2.BlockedByResponseReason || (Audits2.BlockedByResponseReason = {}));
  let HeavyAdResolutionStatus;
  ((HeavyAdResolutionStatus2) => {
    HeavyAdResolutionStatus2["HeavyAdBlocked"] = "HeavyAdBlocked";
    HeavyAdResolutionStatus2["HeavyAdWarning"] = "HeavyAdWarning";
  })(HeavyAdResolutionStatus = Audits2.HeavyAdResolutionStatus || (Audits2.HeavyAdResolutionStatus = {}));
  let HeavyAdReason;
  ((HeavyAdReason2) => {
    HeavyAdReason2["NetworkTotalLimit"] = "NetworkTotalLimit";
    HeavyAdReason2["CpuTotalLimit"] = "CpuTotalLimit";
    HeavyAdReason2["CpuPeakLimit"] = "CpuPeakLimit";
  })(HeavyAdReason = Audits2.HeavyAdReason || (Audits2.HeavyAdReason = {}));
  let ContentSecurityPolicyViolationType;
  ((ContentSecurityPolicyViolationType2) => {
    ContentSecurityPolicyViolationType2["KInlineViolation"] = "kInlineViolation";
    ContentSecurityPolicyViolationType2["KEvalViolation"] = "kEvalViolation";
    ContentSecurityPolicyViolationType2["KURLViolation"] = "kURLViolation";
    ContentSecurityPolicyViolationType2["KSRIViolation"] = "kSRIViolation";
    ContentSecurityPolicyViolationType2["KTrustedTypesSinkViolation"] = "kTrustedTypesSinkViolation";
    ContentSecurityPolicyViolationType2["KTrustedTypesPolicyViolation"] = "kTrustedTypesPolicyViolation";
    ContentSecurityPolicyViolationType2["KWasmEvalViolation"] = "kWasmEvalViolation";
  })(ContentSecurityPolicyViolationType = Audits2.ContentSecurityPolicyViolationType || (Audits2.ContentSecurityPolicyViolationType = {}));
  let SharedArrayBufferIssueType;
  ((SharedArrayBufferIssueType2) => {
    SharedArrayBufferIssueType2["TransferIssue"] = "TransferIssue";
    SharedArrayBufferIssueType2["CreationIssue"] = "CreationIssue";
  })(SharedArrayBufferIssueType = Audits2.SharedArrayBufferIssueType || (Audits2.SharedArrayBufferIssueType = {}));
  let SharedDictionaryError;
  ((SharedDictionaryError2) => {
    SharedDictionaryError2["UseErrorCrossOriginNoCorsRequest"] = "UseErrorCrossOriginNoCorsRequest";
    SharedDictionaryError2["UseErrorDictionaryLoadFailure"] = "UseErrorDictionaryLoadFailure";
    SharedDictionaryError2["UseErrorMatchingDictionaryNotUsed"] = "UseErrorMatchingDictionaryNotUsed";
    SharedDictionaryError2["UseErrorUnexpectedContentDictionaryHeader"] = "UseErrorUnexpectedContentDictionaryHeader";
    SharedDictionaryError2["WriteErrorCossOriginNoCorsRequest"] = "WriteErrorCossOriginNoCorsRequest";
    SharedDictionaryError2["WriteErrorDisallowedBySettings"] = "WriteErrorDisallowedBySettings";
    SharedDictionaryError2["WriteErrorExpiredResponse"] = "WriteErrorExpiredResponse";
    SharedDictionaryError2["WriteErrorFeatureDisabled"] = "WriteErrorFeatureDisabled";
    SharedDictionaryError2["WriteErrorInsufficientResources"] = "WriteErrorInsufficientResources";
    SharedDictionaryError2["WriteErrorInvalidMatchField"] = "WriteErrorInvalidMatchField";
    SharedDictionaryError2["WriteErrorInvalidStructuredHeader"] = "WriteErrorInvalidStructuredHeader";
    SharedDictionaryError2["WriteErrorInvalidTTLField"] = "WriteErrorInvalidTTLField";
    SharedDictionaryError2["WriteErrorNavigationRequest"] = "WriteErrorNavigationRequest";
    SharedDictionaryError2["WriteErrorNoMatchField"] = "WriteErrorNoMatchField";
    SharedDictionaryError2["WriteErrorNonIntegerTTLField"] = "WriteErrorNonIntegerTTLField";
    SharedDictionaryError2["WriteErrorNonListMatchDestField"] = "WriteErrorNonListMatchDestField";
    SharedDictionaryError2["WriteErrorNonSecureContext"] = "WriteErrorNonSecureContext";
    SharedDictionaryError2["WriteErrorNonStringIdField"] = "WriteErrorNonStringIdField";
    SharedDictionaryError2["WriteErrorNonStringInMatchDestList"] = "WriteErrorNonStringInMatchDestList";
    SharedDictionaryError2["WriteErrorInvalidMatchDestList"] = "WriteErrorInvalidMatchDestList";
    SharedDictionaryError2["WriteErrorNonStringMatchField"] = "WriteErrorNonStringMatchField";
    SharedDictionaryError2["WriteErrorNonTokenTypeField"] = "WriteErrorNonTokenTypeField";
    SharedDictionaryError2["WriteErrorRequestAborted"] = "WriteErrorRequestAborted";
    SharedDictionaryError2["WriteErrorShuttingDown"] = "WriteErrorShuttingDown";
    SharedDictionaryError2["WriteErrorTooLongIdField"] = "WriteErrorTooLongIdField";
    SharedDictionaryError2["WriteErrorUnsupportedType"] = "WriteErrorUnsupportedType";
  })(SharedDictionaryError = Audits2.SharedDictionaryError || (Audits2.SharedDictionaryError = {}));
  let SRIMessageSignatureError;
  ((SRIMessageSignatureError2) => {
    SRIMessageSignatureError2["MissingSignatureHeader"] = "MissingSignatureHeader";
    SRIMessageSignatureError2["MissingSignatureInputHeader"] = "MissingSignatureInputHeader";
    SRIMessageSignatureError2["InvalidSignatureHeader"] = "InvalidSignatureHeader";
    SRIMessageSignatureError2["InvalidSignatureInputHeader"] = "InvalidSignatureInputHeader";
    SRIMessageSignatureError2["SignatureHeaderValueIsNotByteSequence"] = "SignatureHeaderValueIsNotByteSequence";
    SRIMessageSignatureError2["SignatureHeaderValueIsParameterized"] = "SignatureHeaderValueIsParameterized";
    SRIMessageSignatureError2["SignatureHeaderValueIsIncorrectLength"] = "SignatureHeaderValueIsIncorrectLength";
    SRIMessageSignatureError2["SignatureInputHeaderMissingLabel"] = "SignatureInputHeaderMissingLabel";
    SRIMessageSignatureError2["SignatureInputHeaderValueNotInnerList"] = "SignatureInputHeaderValueNotInnerList";
    SRIMessageSignatureError2["SignatureInputHeaderValueMissingComponents"] = "SignatureInputHeaderValueMissingComponents";
    SRIMessageSignatureError2["SignatureInputHeaderInvalidComponentType"] = "SignatureInputHeaderInvalidComponentType";
    SRIMessageSignatureError2["SignatureInputHeaderInvalidComponentName"] = "SignatureInputHeaderInvalidComponentName";
    SRIMessageSignatureError2["SignatureInputHeaderInvalidHeaderComponentParameter"] = "SignatureInputHeaderInvalidHeaderComponentParameter";
    SRIMessageSignatureError2["SignatureInputHeaderInvalidDerivedComponentParameter"] = "SignatureInputHeaderInvalidDerivedComponentParameter";
    SRIMessageSignatureError2["SignatureInputHeaderKeyIdLength"] = "SignatureInputHeaderKeyIdLength";
    SRIMessageSignatureError2["SignatureInputHeaderInvalidParameter"] = "SignatureInputHeaderInvalidParameter";
    SRIMessageSignatureError2["SignatureInputHeaderMissingRequiredParameters"] = "SignatureInputHeaderMissingRequiredParameters";
    SRIMessageSignatureError2["ValidationFailedSignatureExpired"] = "ValidationFailedSignatureExpired";
    SRIMessageSignatureError2["ValidationFailedInvalidLength"] = "ValidationFailedInvalidLength";
    SRIMessageSignatureError2["ValidationFailedSignatureMismatch"] = "ValidationFailedSignatureMismatch";
    SRIMessageSignatureError2["ValidationFailedIntegrityMismatch"] = "ValidationFailedIntegrityMismatch";
    SRIMessageSignatureError2["SignatureBaseUnknownDerivedComponent"] = "SignatureBaseUnknownDerivedComponent";
    SRIMessageSignatureError2["SignatureBaseMissingHeader"] = "SignatureBaseMissingHeader";
    SRIMessageSignatureError2["SignatureBaseInvalidUnencodedDigest"] = "SignatureBaseInvalidUnencodedDigest";
    SRIMessageSignatureError2["SignatureBaseUnsupportedComponent"] = "SignatureBaseUnsupportedComponent";
  })(SRIMessageSignatureError = Audits2.SRIMessageSignatureError || (Audits2.SRIMessageSignatureError = {}));
  let UnencodedDigestError;
  ((UnencodedDigestError2) => {
    UnencodedDigestError2["MalformedDictionary"] = "MalformedDictionary";
    UnencodedDigestError2["UnknownAlgorithm"] = "UnknownAlgorithm";
    UnencodedDigestError2["IncorrectDigestType"] = "IncorrectDigestType";
    UnencodedDigestError2["IncorrectDigestLength"] = "IncorrectDigestLength";
  })(UnencodedDigestError = Audits2.UnencodedDigestError || (Audits2.UnencodedDigestError = {}));
  let ConnectionAllowlistError;
  ((ConnectionAllowlistError2) => {
    ConnectionAllowlistError2["InvalidHeader"] = "InvalidHeader";
    ConnectionAllowlistError2["MoreThanOneList"] = "MoreThanOneList";
    ConnectionAllowlistError2["ItemNotInnerList"] = "ItemNotInnerList";
    ConnectionAllowlistError2["InvalidAllowlistItemType"] = "InvalidAllowlistItemType";
    ConnectionAllowlistError2["ReportingEndpointNotToken"] = "ReportingEndpointNotToken";
    ConnectionAllowlistError2["InvalidUrlPattern"] = "InvalidUrlPattern";
    ConnectionAllowlistError2["IFrameAttributeLoosensEmbeddingRequirement"] = "IFrameAttributeLoosensEmbeddingRequirement";
    ConnectionAllowlistError2["InvalidAllowConnectionAllowlistFrom"] = "InvalidAllowConnectionAllowlistFrom";
    ConnectionAllowlistError2["EmbeddingRequirementNotSatisfied"] = "EmbeddingRequirementNotSatisfied";
  })(ConnectionAllowlistError = Audits2.ConnectionAllowlistError || (Audits2.ConnectionAllowlistError = {}));
  let GenericIssueErrorType;
  ((GenericIssueErrorType2) => {
    GenericIssueErrorType2["FormLabelForNameError"] = "FormLabelForNameError";
    GenericIssueErrorType2["FormDuplicateIdForInputError"] = "FormDuplicateIdForInputError";
    GenericIssueErrorType2["FormInputWithNoLabelError"] = "FormInputWithNoLabelError";
    GenericIssueErrorType2["FormAutocompleteAttributeEmptyError"] = "FormAutocompleteAttributeEmptyError";
    GenericIssueErrorType2["FormEmptyIdAndNameAttributesForInputError"] = "FormEmptyIdAndNameAttributesForInputError";
    GenericIssueErrorType2["FormAriaLabelledByToNonExistingIdError"] = "FormAriaLabelledByToNonExistingIdError";
    GenericIssueErrorType2["FormInputAssignedAutocompleteValueToIdOrNameAttributeError"] = "FormInputAssignedAutocompleteValueToIdOrNameAttributeError";
    GenericIssueErrorType2["FormLabelHasNeitherForNorNestedInputError"] = "FormLabelHasNeitherForNorNestedInputError";
    GenericIssueErrorType2["FormLabelForMatchesNonExistingIdError"] = "FormLabelForMatchesNonExistingIdError";
    GenericIssueErrorType2["FormInputHasWrongButWellIntendedAutocompleteValueError"] = "FormInputHasWrongButWellIntendedAutocompleteValueError";
    GenericIssueErrorType2["ResponseWasBlockedByORB"] = "ResponseWasBlockedByORB";
    GenericIssueErrorType2["NavigationEntryMarkedSkippable"] = "NavigationEntryMarkedSkippable";
    GenericIssueErrorType2["BackUINavigationWouldSkipAd"] = "BackUINavigationWouldSkipAd";
    GenericIssueErrorType2["AutofillAndManualTextPolicyControlledFeaturesInfo"] = "AutofillAndManualTextPolicyControlledFeaturesInfo";
    GenericIssueErrorType2["AutofillPolicyControlledFeatureInfo"] = "AutofillPolicyControlledFeatureInfo";
    GenericIssueErrorType2["ManualTextPolicyControlledFeatureInfo"] = "ManualTextPolicyControlledFeatureInfo";
    GenericIssueErrorType2["FormModelContextParameterMissingTitleAndDescription"] = "FormModelContextParameterMissingTitleAndDescription";
    GenericIssueErrorType2["FormModelContextMissingToolName"] = "FormModelContextMissingToolName";
    GenericIssueErrorType2["FormModelContextMissingToolDescription"] = "FormModelContextMissingToolDescription";
    GenericIssueErrorType2["FormModelContextRequiredParameterMissingName"] = "FormModelContextRequiredParameterMissingName";
    GenericIssueErrorType2["FormModelContextParameterMissingName"] = "FormModelContextParameterMissingName";
  })(GenericIssueErrorType = Audits2.GenericIssueErrorType || (Audits2.GenericIssueErrorType = {}));
  let ClientHintIssueReason;
  ((ClientHintIssueReason2) => {
    ClientHintIssueReason2["MetaTagAllowListInvalidOrigin"] = "MetaTagAllowListInvalidOrigin";
    ClientHintIssueReason2["MetaTagModifiedHTML"] = "MetaTagModifiedHTML";
  })(ClientHintIssueReason = Audits2.ClientHintIssueReason || (Audits2.ClientHintIssueReason = {}));
  let FederatedAuthRequestIssueReason;
  ((FederatedAuthRequestIssueReason2) => {
    FederatedAuthRequestIssueReason2["ShouldEmbargo"] = "ShouldEmbargo";
    FederatedAuthRequestIssueReason2["TooManyRequests"] = "TooManyRequests";
    FederatedAuthRequestIssueReason2["WellKnownHttpNotFound"] = "WellKnownHttpNotFound";
    FederatedAuthRequestIssueReason2["WellKnownNoResponse"] = "WellKnownNoResponse";
    FederatedAuthRequestIssueReason2["WellKnownBlockedByConnectionAllowlist"] = "WellKnownBlockedByConnectionAllowlist";
    FederatedAuthRequestIssueReason2["WellKnownInvalidResponse"] = "WellKnownInvalidResponse";
    FederatedAuthRequestIssueReason2["WellKnownListEmpty"] = "WellKnownListEmpty";
    FederatedAuthRequestIssueReason2["WellKnownInvalidContentType"] = "WellKnownInvalidContentType";
    FederatedAuthRequestIssueReason2["ConfigNotInWellKnown"] = "ConfigNotInWellKnown";
    FederatedAuthRequestIssueReason2["WellKnownTooBig"] = "WellKnownTooBig";
    FederatedAuthRequestIssueReason2["ConfigHttpNotFound"] = "ConfigHttpNotFound";
    FederatedAuthRequestIssueReason2["ConfigNoResponse"] = "ConfigNoResponse";
    FederatedAuthRequestIssueReason2["ConfigBlockedByConnectionAllowlist"] = "ConfigBlockedByConnectionAllowlist";
    FederatedAuthRequestIssueReason2["ConfigInvalidResponse"] = "ConfigInvalidResponse";
    FederatedAuthRequestIssueReason2["ConfigInvalidContentType"] = "ConfigInvalidContentType";
    FederatedAuthRequestIssueReason2["IdpNotPotentiallyTrustworthy"] = "IdpNotPotentiallyTrustworthy";
    FederatedAuthRequestIssueReason2["DisabledInSettings"] = "DisabledInSettings";
    FederatedAuthRequestIssueReason2["DisabledInFlags"] = "DisabledInFlags";
    FederatedAuthRequestIssueReason2["ErrorFetchingSignin"] = "ErrorFetchingSignin";
    FederatedAuthRequestIssueReason2["InvalidSigninResponse"] = "InvalidSigninResponse";
    FederatedAuthRequestIssueReason2["AccountsHttpNotFound"] = "AccountsHttpNotFound";
    FederatedAuthRequestIssueReason2["AccountsNoResponse"] = "AccountsNoResponse";
    FederatedAuthRequestIssueReason2["AccountsBlockedByConnectionAllowlist"] = "AccountsBlockedByConnectionAllowlist";
    FederatedAuthRequestIssueReason2["AccountsInvalidResponse"] = "AccountsInvalidResponse";
    FederatedAuthRequestIssueReason2["AccountsListEmpty"] = "AccountsListEmpty";
    FederatedAuthRequestIssueReason2["AccountsInvalidContentType"] = "AccountsInvalidContentType";
    FederatedAuthRequestIssueReason2["IdTokenHttpNotFound"] = "IdTokenHttpNotFound";
    FederatedAuthRequestIssueReason2["IdTokenNoResponse"] = "IdTokenNoResponse";
    FederatedAuthRequestIssueReason2["IdTokenBlockedByConnectionAllowlist"] = "IdTokenBlockedByConnectionAllowlist";
    FederatedAuthRequestIssueReason2["IdTokenInvalidResponse"] = "IdTokenInvalidResponse";
    FederatedAuthRequestIssueReason2["IdTokenIdpErrorResponse"] = "IdTokenIdpErrorResponse";
    FederatedAuthRequestIssueReason2["IdTokenCrossSiteIdpErrorResponse"] = "IdTokenCrossSiteIdpErrorResponse";
    FederatedAuthRequestIssueReason2["IdTokenInvalidRequest"] = "IdTokenInvalidRequest";
    FederatedAuthRequestIssueReason2["IdTokenInvalidContentType"] = "IdTokenInvalidContentType";
    FederatedAuthRequestIssueReason2["ErrorIdToken"] = "ErrorIdToken";
    FederatedAuthRequestIssueReason2["Canceled"] = "Canceled";
    FederatedAuthRequestIssueReason2["RpPageNotVisible"] = "RpPageNotVisible";
    FederatedAuthRequestIssueReason2["SilentMediationFailure"] = "SilentMediationFailure";
    FederatedAuthRequestIssueReason2["NotSignedInWithIdp"] = "NotSignedInWithIdp";
    FederatedAuthRequestIssueReason2["MissingTransientUserActivation"] = "MissingTransientUserActivation";
    FederatedAuthRequestIssueReason2["ReplacedByActiveMode"] = "ReplacedByActiveMode";
    FederatedAuthRequestIssueReason2["RelyingPartyOriginIsOpaque"] = "RelyingPartyOriginIsOpaque";
    FederatedAuthRequestIssueReason2["TypeNotMatching"] = "TypeNotMatching";
    FederatedAuthRequestIssueReason2["UiDismissedNoEmbargo"] = "UiDismissedNoEmbargo";
    FederatedAuthRequestIssueReason2["CorsError"] = "CorsError";
    FederatedAuthRequestIssueReason2["SuppressedBySegmentationPlatform"] = "SuppressedBySegmentationPlatform";
  })(FederatedAuthRequestIssueReason = Audits2.FederatedAuthRequestIssueReason || (Audits2.FederatedAuthRequestIssueReason = {}));
  let FederatedAuthUserInfoRequestIssueReason;
  ((FederatedAuthUserInfoRequestIssueReason2) => {
    FederatedAuthUserInfoRequestIssueReason2["NotSameOrigin"] = "NotSameOrigin";
    FederatedAuthUserInfoRequestIssueReason2["NotIframe"] = "NotIframe";
    FederatedAuthUserInfoRequestIssueReason2["NotPotentiallyTrustworthy"] = "NotPotentiallyTrustworthy";
    FederatedAuthUserInfoRequestIssueReason2["NoAPIPermission"] = "NoApiPermission";
    FederatedAuthUserInfoRequestIssueReason2["NotSignedInWithIdp"] = "NotSignedInWithIdp";
    FederatedAuthUserInfoRequestIssueReason2["NoAccountSharingPermission"] = "NoAccountSharingPermission";
    FederatedAuthUserInfoRequestIssueReason2["InvalidConfigOrWellKnown"] = "InvalidConfigOrWellKnown";
    FederatedAuthUserInfoRequestIssueReason2["InvalidAccountsResponse"] = "InvalidAccountsResponse";
    FederatedAuthUserInfoRequestIssueReason2["NoReturningUserFromFetchedAccounts"] = "NoReturningUserFromFetchedAccounts";
  })(FederatedAuthUserInfoRequestIssueReason = Audits2.FederatedAuthUserInfoRequestIssueReason || (Audits2.FederatedAuthUserInfoRequestIssueReason = {}));
  let EmailVerificationRequestIssueReason;
  ((EmailVerificationRequestIssueReason2) => {
    EmailVerificationRequestIssueReason2["InvalidEmail"] = "InvalidEmail";
    EmailVerificationRequestIssueReason2["DnsFetchFailed"] = "DnsFetchFailed";
    EmailVerificationRequestIssueReason2["DnsInvalidRecord"] = "DnsInvalidRecord";
    EmailVerificationRequestIssueReason2["WellKnownHttpNotFound"] = "WellKnownHttpNotFound";
    EmailVerificationRequestIssueReason2["WellKnownNoResponse"] = "WellKnownNoResponse";
    EmailVerificationRequestIssueReason2["WellKnownInvalidResponse"] = "WellKnownInvalidResponse";
    EmailVerificationRequestIssueReason2["WellKnownListEmpty"] = "WellKnownListEmpty";
    EmailVerificationRequestIssueReason2["WellKnownInvalidContentType"] = "WellKnownInvalidContentType";
    EmailVerificationRequestIssueReason2["WellKnownMissingIssuanceEndpoint"] = "WellKnownMissingIssuanceEndpoint";
    EmailVerificationRequestIssueReason2["WellKnownIssuanceEndpointCrossOrigin"] = "WellKnownIssuanceEndpointCrossOrigin";
    EmailVerificationRequestIssueReason2["WellKnownUnsupportedSigningAlgorithm"] = "WellKnownUnsupportedSigningAlgorithm";
    EmailVerificationRequestIssueReason2["TokenHttpNotFound"] = "TokenHttpNotFound";
    EmailVerificationRequestIssueReason2["TokenNoResponse"] = "TokenNoResponse";
    EmailVerificationRequestIssueReason2["TokenInvalidResponse"] = "TokenInvalidResponse";
    EmailVerificationRequestIssueReason2["TokenInvalidContentType"] = "TokenInvalidContentType";
    EmailVerificationRequestIssueReason2["TokenMalformedSdJwt"] = "TokenMalformedSdJwt";
    EmailVerificationRequestIssueReason2["TokenInvalidSdJwt"] = "TokenInvalidSdJwt";
    EmailVerificationRequestIssueReason2["KeyBindingSigningFailed"] = "KeyBindingSigningFailed";
    EmailVerificationRequestIssueReason2["RpOriginIsOpaque"] = "RpOriginIsOpaque";
    EmailVerificationRequestIssueReason2["WellKnownMissingAccountsEndpoint"] = "WellKnownMissingAccountsEndpoint";
    EmailVerificationRequestIssueReason2["UserLoggedOut"] = "UserLoggedOut";
    EmailVerificationRequestIssueReason2["WellKnownAccountsEndpointCrossOrigin"] = "WellKnownAccountsEndpointCrossOrigin";
    EmailVerificationRequestIssueReason2["AccountsHttpNotFound"] = "AccountsHttpNotFound";
    EmailVerificationRequestIssueReason2["AccountsNoResponse"] = "AccountsNoResponse";
    EmailVerificationRequestIssueReason2["AccountsInvalidResponse"] = "AccountsInvalidResponse";
    EmailVerificationRequestIssueReason2["AccountsInvalidContentType"] = "AccountsInvalidContentType";
    EmailVerificationRequestIssueReason2["AccountsEmptyList"] = "AccountsEmptyList";
    EmailVerificationRequestIssueReason2["EmailVerificationWellKnownHttpNotFound"] = "EmailVerificationWellKnownHttpNotFound";
    EmailVerificationRequestIssueReason2["EmailVerificationWellKnownNoResponse"] = "EmailVerificationWellKnownNoResponse";
    EmailVerificationRequestIssueReason2["EmailVerificationWellKnownInvalidResponse"] = "EmailVerificationWellKnownInvalidResponse";
    EmailVerificationRequestIssueReason2["EmailVerificationWellKnownInvalidContentType"] = "EmailVerificationWellKnownInvalidContentType";
    EmailVerificationRequestIssueReason2["JwksHttpNotFound"] = "JwksHttpNotFound";
    EmailVerificationRequestIssueReason2["JwksInvalidResponse"] = "JwksInvalidResponse";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtUnsupportedHeaderAlg"] = "TokenVerificationSdJwtUnsupportedHeaderAlg";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtInvalidTyp"] = "TokenVerificationSdJwtInvalidTyp";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtMissingIss"] = "TokenVerificationSdJwtMissingIss";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtMissingIat"] = "TokenVerificationSdJwtMissingIat";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtMissingCnf"] = "TokenVerificationSdJwtMissingCnf";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtMissingEmail"] = "TokenVerificationSdJwtMissingEmail";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtInvalidIssuedAt"] = "TokenVerificationSdJwtInvalidIssuedAt";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtInvalidIssuer"] = "TokenVerificationSdJwtInvalidIssuer";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtJwksMissingKeys"] = "TokenVerificationSdJwtJwksMissingKeys";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtSignatureFailed"] = "TokenVerificationSdJwtSignatureFailed";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtInvalidEmailVerified"] = "TokenVerificationSdJwtInvalidEmailVerified";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtInvalidEmail"] = "TokenVerificationSdJwtInvalidEmail";
    EmailVerificationRequestIssueReason2["TokenVerificationSdJwtInvalidHolderKey"] = "TokenVerificationSdJwtInvalidHolderKey";
    EmailVerificationRequestIssueReason2["TokenVerificationKbInvalidTyp"] = "TokenVerificationKbInvalidTyp";
    EmailVerificationRequestIssueReason2["TokenVerificationKbMissingAud"] = "TokenVerificationKbMissingAud";
    EmailVerificationRequestIssueReason2["TokenVerificationKbMissingNonce"] = "TokenVerificationKbMissingNonce";
    EmailVerificationRequestIssueReason2["TokenVerificationKbMissingIat"] = "TokenVerificationKbMissingIat";
    EmailVerificationRequestIssueReason2["TokenVerificationKbMissingSdHash"] = "TokenVerificationKbMissingSdHash";
    EmailVerificationRequestIssueReason2["TokenVerificationKbInvalidIssuedAt"] = "TokenVerificationKbInvalidIssuedAt";
    EmailVerificationRequestIssueReason2["TokenVerificationKbInvalidAudience"] = "TokenVerificationKbInvalidAudience";
    EmailVerificationRequestIssueReason2["TokenVerificationKbInvalidNonce"] = "TokenVerificationKbInvalidNonce";
    EmailVerificationRequestIssueReason2["TokenVerificationKbInvalidSdHash"] = "TokenVerificationKbInvalidSdHash";
    EmailVerificationRequestIssueReason2["TokenVerificationKbMissingCnf"] = "TokenVerificationKbMissingCnf";
    EmailVerificationRequestIssueReason2["TokenVerificationKbSignatureFailed"] = "TokenVerificationKbSignatureFailed";
  })(EmailVerificationRequestIssueReason = Audits2.EmailVerificationRequestIssueReason || (Audits2.EmailVerificationRequestIssueReason = {}));
  let PartitioningBlobURLInfo;
  ((PartitioningBlobURLInfo2) => {
    PartitioningBlobURLInfo2["BlockedCrossPartitionFetching"] = "BlockedCrossPartitionFetching";
    PartitioningBlobURLInfo2["EnforceNoopenerForNavigation"] = "EnforceNoopenerForNavigation";
  })(PartitioningBlobURLInfo = Audits2.PartitioningBlobURLInfo || (Audits2.PartitioningBlobURLInfo = {}));
  let ElementAccessibilityIssueReason;
  ((ElementAccessibilityIssueReason2) => {
    ElementAccessibilityIssueReason2["DisallowedSelectChild"] = "DisallowedSelectChild";
    ElementAccessibilityIssueReason2["DisallowedOptGroupChild"] = "DisallowedOptGroupChild";
    ElementAccessibilityIssueReason2["NonPhrasingContentOptionChild"] = "NonPhrasingContentOptionChild";
    ElementAccessibilityIssueReason2["InteractiveContentOptionChild"] = "InteractiveContentOptionChild";
    ElementAccessibilityIssueReason2["InteractiveContentLegendChild"] = "InteractiveContentLegendChild";
    ElementAccessibilityIssueReason2["InteractiveContentSummaryDescendant"] = "InteractiveContentSummaryDescendant";
  })(ElementAccessibilityIssueReason = Audits2.ElementAccessibilityIssueReason || (Audits2.ElementAccessibilityIssueReason = {}));
  let StyleSheetLoadingIssueReason;
  ((StyleSheetLoadingIssueReason2) => {
    StyleSheetLoadingIssueReason2["LateImportRule"] = "LateImportRule";
    StyleSheetLoadingIssueReason2["RequestFailed"] = "RequestFailed";
  })(StyleSheetLoadingIssueReason = Audits2.StyleSheetLoadingIssueReason || (Audits2.StyleSheetLoadingIssueReason = {}));
  let PropertyRuleIssueReason;
  ((PropertyRuleIssueReason2) => {
    PropertyRuleIssueReason2["InvalidSyntax"] = "InvalidSyntax";
    PropertyRuleIssueReason2["InvalidInitialValue"] = "InvalidInitialValue";
    PropertyRuleIssueReason2["InvalidInherits"] = "InvalidInherits";
    PropertyRuleIssueReason2["InvalidName"] = "InvalidName";
  })(PropertyRuleIssueReason = Audits2.PropertyRuleIssueReason || (Audits2.PropertyRuleIssueReason = {}));
  let UserReidentificationIssueType;
  ((UserReidentificationIssueType2) => {
    UserReidentificationIssueType2["BlockedFrameNavigation"] = "BlockedFrameNavigation";
    UserReidentificationIssueType2["BlockedSubresource"] = "BlockedSubresource";
    UserReidentificationIssueType2["NoisedCanvasReadback"] = "NoisedCanvasReadback";
  })(UserReidentificationIssueType = Audits2.UserReidentificationIssueType || (Audits2.UserReidentificationIssueType = {}));
  let PermissionElementIssueType;
  ((PermissionElementIssueType2) => {
    PermissionElementIssueType2["InvalidType"] = "InvalidType";
    PermissionElementIssueType2["FencedFrameDisallowed"] = "FencedFrameDisallowed";
    PermissionElementIssueType2["CspFrameAncestorsMissing"] = "CspFrameAncestorsMissing";
    PermissionElementIssueType2["PermissionsPolicyBlocked"] = "PermissionsPolicyBlocked";
    PermissionElementIssueType2["PaddingRightUnsupported"] = "PaddingRightUnsupported";
    PermissionElementIssueType2["PaddingBottomUnsupported"] = "PaddingBottomUnsupported";
    PermissionElementIssueType2["InsetBoxShadowUnsupported"] = "InsetBoxShadowUnsupported";
    PermissionElementIssueType2["RequestInProgress"] = "RequestInProgress";
    PermissionElementIssueType2["UntrustedEvent"] = "UntrustedEvent";
    PermissionElementIssueType2["RegistrationFailed"] = "RegistrationFailed";
    PermissionElementIssueType2["TypeNotSupported"] = "TypeNotSupported";
    PermissionElementIssueType2["InvalidTypeActivation"] = "InvalidTypeActivation";
    PermissionElementIssueType2["SecurityChecksFailed"] = "SecurityChecksFailed";
    PermissionElementIssueType2["ActivationDisabled"] = "ActivationDisabled";
    PermissionElementIssueType2["GeolocationDeprecated"] = "GeolocationDeprecated";
    PermissionElementIssueType2["InvalidDisplayStyle"] = "InvalidDisplayStyle";
    PermissionElementIssueType2["NonOpaqueColor"] = "NonOpaqueColor";
    PermissionElementIssueType2["LowContrast"] = "LowContrast";
    PermissionElementIssueType2["FontSizeTooSmall"] = "FontSizeTooSmall";
    PermissionElementIssueType2["FontSizeTooLarge"] = "FontSizeTooLarge";
    PermissionElementIssueType2["InvalidSizeValue"] = "InvalidSizeValue";
    PermissionElementIssueType2["NonSecureContext"] = "NonSecureContext";
    PermissionElementIssueType2["MissingTransientUserActivation"] = "MissingTransientUserActivation";
  })(PermissionElementIssueType = Audits2.PermissionElementIssueType || (Audits2.PermissionElementIssueType = {}));
  let InspectorIssueCode;
  ((InspectorIssueCode2) => {
    InspectorIssueCode2["CookieIssue"] = "CookieIssue";
    InspectorIssueCode2["MixedContentIssue"] = "MixedContentIssue";
    InspectorIssueCode2["BlockedByResponseIssue"] = "BlockedByResponseIssue";
    InspectorIssueCode2["HeavyAdIssue"] = "HeavyAdIssue";
    InspectorIssueCode2["ContentSecurityPolicyIssue"] = "ContentSecurityPolicyIssue";
    InspectorIssueCode2["SharedArrayBufferIssue"] = "SharedArrayBufferIssue";
    InspectorIssueCode2["CorsIssue"] = "CorsIssue";
    InspectorIssueCode2["QuirksModeIssue"] = "QuirksModeIssue";
    InspectorIssueCode2["PartitioningBlobURLIssue"] = "PartitioningBlobURLIssue";
    InspectorIssueCode2["NavigatorUserAgentIssue"] = "NavigatorUserAgentIssue";
    InspectorIssueCode2["GenericIssue"] = "GenericIssue";
    InspectorIssueCode2["DeprecationIssue"] = "DeprecationIssue";
    InspectorIssueCode2["ClientHintIssue"] = "ClientHintIssue";
    InspectorIssueCode2["FederatedAuthRequestIssue"] = "FederatedAuthRequestIssue";
    InspectorIssueCode2["BounceTrackingIssue"] = "BounceTrackingIssue";
    InspectorIssueCode2["CookieDeprecationMetadataIssue"] = "CookieDeprecationMetadataIssue";
    InspectorIssueCode2["StylesheetLoadingIssue"] = "StylesheetLoadingIssue";
    InspectorIssueCode2["FederatedAuthUserInfoRequestIssue"] = "FederatedAuthUserInfoRequestIssue";
    InspectorIssueCode2["PropertyRuleIssue"] = "PropertyRuleIssue";
    InspectorIssueCode2["SharedDictionaryIssue"] = "SharedDictionaryIssue";
    InspectorIssueCode2["ElementAccessibilityIssue"] = "ElementAccessibilityIssue";
    InspectorIssueCode2["SRIMessageSignatureIssue"] = "SRIMessageSignatureIssue";
    InspectorIssueCode2["UnencodedDigestIssue"] = "UnencodedDigestIssue";
    InspectorIssueCode2["ConnectionAllowlistIssue"] = "ConnectionAllowlistIssue";
    InspectorIssueCode2["UserReidentificationIssue"] = "UserReidentificationIssue";
    InspectorIssueCode2["PermissionElementIssue"] = "PermissionElementIssue";
    InspectorIssueCode2["PerformanceIssue"] = "PerformanceIssue";
    InspectorIssueCode2["SelectivePermissionsInterventionIssue"] = "SelectivePermissionsInterventionIssue";
    InspectorIssueCode2["EmailVerificationRequestIssue"] = "EmailVerificationRequestIssue";
    InspectorIssueCode2["LazyLoadImageIssue"] = "LazyLoadImageIssue";
  })(InspectorIssueCode = Audits2.InspectorIssueCode || (Audits2.InspectorIssueCode = {}));
  let GetEncodedResponseRequestEncoding;
  ((GetEncodedResponseRequestEncoding2) => {
    GetEncodedResponseRequestEncoding2["Webp"] = "webp";
    GetEncodedResponseRequestEncoding2["Jpeg"] = "jpeg";
    GetEncodedResponseRequestEncoding2["Png"] = "png";
  })(GetEncodedResponseRequestEncoding = Audits2.GetEncodedResponseRequestEncoding || (Audits2.GetEncodedResponseRequestEncoding = {}));
})(Audits || (Audits = {}));
var Autofill;
((Autofill2) => {
  let FillingStrategy;
  ((FillingStrategy2) => {
    FillingStrategy2["AutocompleteAttribute"] = "autocompleteAttribute";
    FillingStrategy2["AutofillInferred"] = "autofillInferred";
  })(FillingStrategy = Autofill2.FillingStrategy || (Autofill2.FillingStrategy = {}));
})(Autofill || (Autofill = {}));
var BackgroundService;
((BackgroundService2) => {
  let ServiceName;
  ((ServiceName2) => {
    ServiceName2["BackgroundFetch"] = "backgroundFetch";
    ServiceName2["BackgroundSync"] = "backgroundSync";
    ServiceName2["PushMessaging"] = "pushMessaging";
    ServiceName2["Notifications"] = "notifications";
    ServiceName2["PaymentHandler"] = "paymentHandler";
    ServiceName2["PeriodicBackgroundSync"] = "periodicBackgroundSync";
  })(ServiceName = BackgroundService2.ServiceName || (BackgroundService2.ServiceName = {}));
})(BackgroundService || (BackgroundService = {}));
var BluetoothEmulation;
((BluetoothEmulation2) => {
  let CentralState;
  ((CentralState2) => {
    CentralState2["Absent"] = "absent";
    CentralState2["PoweredOff"] = "powered-off";
    CentralState2["PoweredOn"] = "powered-on";
  })(CentralState = BluetoothEmulation2.CentralState || (BluetoothEmulation2.CentralState = {}));
  let GATTOperationType;
  ((GATTOperationType2) => {
    GATTOperationType2["Connection"] = "connection";
    GATTOperationType2["Discovery"] = "discovery";
  })(GATTOperationType = BluetoothEmulation2.GATTOperationType || (BluetoothEmulation2.GATTOperationType = {}));
  let CharacteristicWriteType;
  ((CharacteristicWriteType2) => {
    CharacteristicWriteType2["WriteDefaultDeprecated"] = "write-default-deprecated";
    CharacteristicWriteType2["WriteWithResponse"] = "write-with-response";
    CharacteristicWriteType2["WriteWithoutResponse"] = "write-without-response";
  })(CharacteristicWriteType = BluetoothEmulation2.CharacteristicWriteType || (BluetoothEmulation2.CharacteristicWriteType = {}));
  let CharacteristicOperationType;
  ((CharacteristicOperationType2) => {
    CharacteristicOperationType2["Read"] = "read";
    CharacteristicOperationType2["Write"] = "write";
    CharacteristicOperationType2["SubscribeToNotifications"] = "subscribe-to-notifications";
    CharacteristicOperationType2["UnsubscribeFromNotifications"] = "unsubscribe-from-notifications";
  })(CharacteristicOperationType = BluetoothEmulation2.CharacteristicOperationType || (BluetoothEmulation2.CharacteristicOperationType = {}));
  let DescriptorOperationType;
  ((DescriptorOperationType2) => {
    DescriptorOperationType2["Read"] = "read";
    DescriptorOperationType2["Write"] = "write";
  })(DescriptorOperationType = BluetoothEmulation2.DescriptorOperationType || (BluetoothEmulation2.DescriptorOperationType = {}));
})(BluetoothEmulation || (BluetoothEmulation = {}));
var Browser;
((Browser2) => {
  let WindowState;
  ((WindowState2) => {
    WindowState2["Normal"] = "normal";
    WindowState2["Minimized"] = "minimized";
    WindowState2["Maximized"] = "maximized";
    WindowState2["Fullscreen"] = "fullscreen";
  })(WindowState = Browser2.WindowState || (Browser2.WindowState = {}));
  let PermissionType;
  ((PermissionType2) => {
    PermissionType2["Ar"] = "ar";
    PermissionType2["AudioCapture"] = "audioCapture";
    PermissionType2["AutomaticFullscreen"] = "automaticFullscreen";
    PermissionType2["BackgroundFetch"] = "backgroundFetch";
    PermissionType2["BackgroundSync"] = "backgroundSync";
    PermissionType2["CameraPanTiltZoom"] = "cameraPanTiltZoom";
    PermissionType2["CapturedSurfaceControl"] = "capturedSurfaceControl";
    PermissionType2["ClipboardReadWrite"] = "clipboardReadWrite";
    PermissionType2["ClipboardSanitizedWrite"] = "clipboardSanitizedWrite";
    PermissionType2["DisplayCapture"] = "displayCapture";
    PermissionType2["DurableStorage"] = "durableStorage";
    PermissionType2["Geolocation"] = "geolocation";
    PermissionType2["HandTracking"] = "handTracking";
    PermissionType2["IdleDetection"] = "idleDetection";
    PermissionType2["KeyboardLock"] = "keyboardLock";
    PermissionType2["LocalFonts"] = "localFonts";
    PermissionType2["LocalNetwork"] = "localNetwork";
    PermissionType2["LocalNetworkAccess"] = "localNetworkAccess";
    PermissionType2["LoopbackNetwork"] = "loopbackNetwork";
    PermissionType2["Midi"] = "midi";
    PermissionType2["MidiSysex"] = "midiSysex";
    PermissionType2["Nfc"] = "nfc";
    PermissionType2["Notifications"] = "notifications";
    PermissionType2["PaymentHandler"] = "paymentHandler";
    PermissionType2["PeriodicBackgroundSync"] = "periodicBackgroundSync";
    PermissionType2["PointerLock"] = "pointerLock";
    PermissionType2["ProtectedMediaIdentifier"] = "protectedMediaIdentifier";
    PermissionType2["Sensors"] = "sensors";
    PermissionType2["SmartCard"] = "smartCard";
    PermissionType2["SpeakerSelection"] = "speakerSelection";
    PermissionType2["StorageAccess"] = "storageAccess";
    PermissionType2["TopLevelStorageAccess"] = "topLevelStorageAccess";
    PermissionType2["VideoCapture"] = "videoCapture";
    PermissionType2["Vr"] = "vr";
    PermissionType2["WakeLockScreen"] = "wakeLockScreen";
    PermissionType2["WakeLockSystem"] = "wakeLockSystem";
    PermissionType2["WebAppInstallation"] = "webAppInstallation";
    PermissionType2["WebPrinting"] = "webPrinting";
    PermissionType2["WindowManagement"] = "windowManagement";
  })(PermissionType = Browser2.PermissionType || (Browser2.PermissionType = {}));
  let PermissionSetting;
  ((PermissionSetting2) => {
    PermissionSetting2["Granted"] = "granted";
    PermissionSetting2["Denied"] = "denied";
    PermissionSetting2["Prompt"] = "prompt";
  })(PermissionSetting = Browser2.PermissionSetting || (Browser2.PermissionSetting = {}));
  let BrowserCommandId;
  ((BrowserCommandId2) => {
    BrowserCommandId2["OpenTabSearch"] = "openTabSearch";
    BrowserCommandId2["CloseTabSearch"] = "closeTabSearch";
    BrowserCommandId2["OpenGlic"] = "openGlic";
  })(BrowserCommandId = Browser2.BrowserCommandId || (Browser2.BrowserCommandId = {}));
  let SetDownloadBehaviorRequestBehavior;
  ((SetDownloadBehaviorRequestBehavior2) => {
    SetDownloadBehaviorRequestBehavior2["Deny"] = "deny";
    SetDownloadBehaviorRequestBehavior2["Allow"] = "allow";
    SetDownloadBehaviorRequestBehavior2["AllowAndName"] = "allowAndName";
    SetDownloadBehaviorRequestBehavior2["Default"] = "default";
  })(SetDownloadBehaviorRequestBehavior = Browser2.SetDownloadBehaviorRequestBehavior || (Browser2.SetDownloadBehaviorRequestBehavior = {}));
  let DownloadProgressEventState;
  ((DownloadProgressEventState2) => {
    DownloadProgressEventState2["InProgress"] = "inProgress";
    DownloadProgressEventState2["Completed"] = "completed";
    DownloadProgressEventState2["Canceled"] = "canceled";
  })(DownloadProgressEventState = Browser2.DownloadProgressEventState || (Browser2.DownloadProgressEventState = {}));
})(Browser || (Browser = {}));
var CSS2;
((CSS3) => {
  let StyleSheetOrigin;
  ((StyleSheetOrigin2) => {
    StyleSheetOrigin2["Injected"] = "injected";
    StyleSheetOrigin2["UserAgent"] = "user-agent";
    StyleSheetOrigin2["Inspector"] = "inspector";
    StyleSheetOrigin2["Regular"] = "regular";
  })(StyleSheetOrigin = CSS3.StyleSheetOrigin || (CSS3.StyleSheetOrigin = {}));
  let CSSRuleType;
  ((CSSRuleType2) => {
    CSSRuleType2["MediaRule"] = "MediaRule";
    CSSRuleType2["SupportsRule"] = "SupportsRule";
    CSSRuleType2["ContainerRule"] = "ContainerRule";
    CSSRuleType2["LayerRule"] = "LayerRule";
    CSSRuleType2["ScopeRule"] = "ScopeRule";
    CSSRuleType2["StyleRule"] = "StyleRule";
    CSSRuleType2["StartingStyleRule"] = "StartingStyleRule";
    CSSRuleType2["NavigationRule"] = "NavigationRule";
  })(CSSRuleType = CSS3.CSSRuleType || (CSS3.CSSRuleType = {}));
  let CSSMediaSource;
  ((CSSMediaSource2) => {
    CSSMediaSource2["MediaRule"] = "mediaRule";
    CSSMediaSource2["ImportRule"] = "importRule";
    CSSMediaSource2["LinkedSheet"] = "linkedSheet";
    CSSMediaSource2["InlineSheet"] = "inlineSheet";
  })(CSSMediaSource = CSS3.CSSMediaSource || (CSS3.CSSMediaSource = {}));
  let CSSAtRuleType;
  ((CSSAtRuleType2) => {
    CSSAtRuleType2["FontFace"] = "font-face";
    CSSAtRuleType2["FontFeatureValues"] = "font-feature-values";
    CSSAtRuleType2["FontPaletteValues"] = "font-palette-values";
    CSSAtRuleType2["CounterStyle"] = "counter-style";
  })(CSSAtRuleType = CSS3.CSSAtRuleType || (CSS3.CSSAtRuleType = {}));
  let CSSAtRuleSubsection;
  ((CSSAtRuleSubsection2) => {
    CSSAtRuleSubsection2["Swash"] = "swash";
    CSSAtRuleSubsection2["Annotation"] = "annotation";
    CSSAtRuleSubsection2["Ornaments"] = "ornaments";
    CSSAtRuleSubsection2["Stylistic"] = "stylistic";
    CSSAtRuleSubsection2["Styleset"] = "styleset";
    CSSAtRuleSubsection2["CharacterVariant"] = "character-variant";
  })(CSSAtRuleSubsection = CSS3.CSSAtRuleSubsection || (CSS3.CSSAtRuleSubsection = {}));
})(CSS2 || (CSS2 = {}));
var CacheStorage;
((CacheStorage2) => {
  let CachedResponseType;
  ((CachedResponseType2) => {
    CachedResponseType2["Basic"] = "basic";
    CachedResponseType2["Cors"] = "cors";
    CachedResponseType2["Default"] = "default";
    CachedResponseType2["Error"] = "error";
    CachedResponseType2["OpaqueResponse"] = "opaqueResponse";
    CachedResponseType2["OpaqueRedirect"] = "opaqueRedirect";
  })(CachedResponseType = CacheStorage2.CachedResponseType || (CacheStorage2.CachedResponseType = {}));
})(CacheStorage || (CacheStorage = {}));
var DOM;
((DOM2) => {
  let PseudoType;
  ((PseudoType2) => {
    PseudoType2["FirstLine"] = "first-line";
    PseudoType2["FirstLetter"] = "first-letter";
    PseudoType2["Checkmark"] = "checkmark";
    PseudoType2["Before"] = "before";
    PseudoType2["After"] = "after";
    PseudoType2["ExpandIcon"] = "expand-icon";
    PseudoType2["PickerIcon"] = "picker-icon";
    PseudoType2["InterestButton"] = "interest-button";
    PseudoType2["Marker"] = "marker";
    PseudoType2["Backdrop"] = "backdrop";
    PseudoType2["Column"] = "column";
    PseudoType2["Selection"] = "selection";
    PseudoType2["SearchText"] = "search-text";
    PseudoType2["TargetText"] = "target-text";
    PseudoType2["SpellingError"] = "spelling-error";
    PseudoType2["GrammarError"] = "grammar-error";
    PseudoType2["Highlight"] = "highlight";
    PseudoType2["FirstLineInherited"] = "first-line-inherited";
    PseudoType2["ScrollMarker"] = "scroll-marker";
    PseudoType2["ScrollMarkerGroup"] = "scroll-marker-group";
    PseudoType2["ScrollButton"] = "scroll-button";
    PseudoType2["Scrollbar"] = "scrollbar";
    PseudoType2["ScrollbarThumb"] = "scrollbar-thumb";
    PseudoType2["ScrollbarButton"] = "scrollbar-button";
    PseudoType2["ScrollbarTrack"] = "scrollbar-track";
    PseudoType2["ScrollbarTrackPiece"] = "scrollbar-track-piece";
    PseudoType2["ScrollbarCorner"] = "scrollbar-corner";
    PseudoType2["Resizer"] = "resizer";
    PseudoType2["InputListButton"] = "input-list-button";
    PseudoType2["ViewTransition"] = "view-transition";
    PseudoType2["ViewTransitionGroup"] = "view-transition-group";
    PseudoType2["ViewTransitionImagePair"] = "view-transition-image-pair";
    PseudoType2["ViewTransitionGroupChildren"] = "view-transition-group-children";
    PseudoType2["ViewTransitionOld"] = "view-transition-old";
    PseudoType2["ViewTransitionNew"] = "view-transition-new";
    PseudoType2["Placeholder"] = "placeholder";
    PseudoType2["FileSelectorButton"] = "file-selector-button";
    PseudoType2["DetailsContent"] = "details-content";
    PseudoType2["Picker"] = "picker";
    PseudoType2["SelectListbox"] = "select-listbox";
    PseudoType2["PermissionIcon"] = "permission-icon";
    PseudoType2["OverscrollAreaParent"] = "overscroll-area-parent";
    PseudoType2["OverscrollBackdrop"] = "overscroll-backdrop";
    PseudoType2["Skeleton"] = "skeleton";
  })(PseudoType = DOM2.PseudoType || (DOM2.PseudoType = {}));
  let ShadowRootType;
  ((ShadowRootType2) => {
    ShadowRootType2["UserAgent"] = "user-agent";
    ShadowRootType2["Open"] = "open";
    ShadowRootType2["Closed"] = "closed";
  })(ShadowRootType = DOM2.ShadowRootType || (DOM2.ShadowRootType = {}));
  let CompatibilityMode;
  ((CompatibilityMode2) => {
    CompatibilityMode2["QuirksMode"] = "QuirksMode";
    CompatibilityMode2["LimitedQuirksMode"] = "LimitedQuirksMode";
    CompatibilityMode2["NoQuirksMode"] = "NoQuirksMode";
  })(CompatibilityMode = DOM2.CompatibilityMode || (DOM2.CompatibilityMode = {}));
  let PhysicalAxes;
  ((PhysicalAxes2) => {
    PhysicalAxes2["Horizontal"] = "Horizontal";
    PhysicalAxes2["Vertical"] = "Vertical";
    PhysicalAxes2["Both"] = "Both";
  })(PhysicalAxes = DOM2.PhysicalAxes || (DOM2.PhysicalAxes = {}));
  let LogicalAxes;
  ((LogicalAxes2) => {
    LogicalAxes2["Inline"] = "Inline";
    LogicalAxes2["Block"] = "Block";
    LogicalAxes2["Both"] = "Both";
  })(LogicalAxes = DOM2.LogicalAxes || (DOM2.LogicalAxes = {}));
  let ScrollOrientation;
  ((ScrollOrientation2) => {
    ScrollOrientation2["Horizontal"] = "horizontal";
    ScrollOrientation2["Vertical"] = "vertical";
  })(ScrollOrientation = DOM2.ScrollOrientation || (DOM2.ScrollOrientation = {}));
  let EnableRequestIncludeWhitespace;
  ((EnableRequestIncludeWhitespace2) => {
    EnableRequestIncludeWhitespace2["None"] = "none";
    EnableRequestIncludeWhitespace2["All"] = "all";
  })(EnableRequestIncludeWhitespace = DOM2.EnableRequestIncludeWhitespace || (DOM2.EnableRequestIncludeWhitespace = {}));
  let GetElementByRelationRequestRelation;
  ((GetElementByRelationRequestRelation2) => {
    GetElementByRelationRequestRelation2["PopoverTarget"] = "PopoverTarget";
    GetElementByRelationRequestRelation2["InterestTarget"] = "InterestTarget";
    GetElementByRelationRequestRelation2["CommandFor"] = "CommandFor";
  })(GetElementByRelationRequestRelation = DOM2.GetElementByRelationRequestRelation || (DOM2.GetElementByRelationRequestRelation = {}));
})(DOM || (DOM = {}));
var DOMDebugger;
((DOMDebugger2) => {
  let DOMBreakpointType;
  ((DOMBreakpointType2) => {
    DOMBreakpointType2["SubtreeModified"] = "subtree-modified";
    DOMBreakpointType2["AttributeModified"] = "attribute-modified";
    DOMBreakpointType2["NodeRemoved"] = "node-removed";
  })(DOMBreakpointType = DOMDebugger2.DOMBreakpointType || (DOMDebugger2.DOMBreakpointType = {}));
  let CSPViolationType;
  ((CSPViolationType2) => {
    CSPViolationType2["TrustedtypeSinkViolation"] = "trustedtype-sink-violation";
    CSPViolationType2["TrustedtypePolicyViolation"] = "trustedtype-policy-violation";
  })(CSPViolationType = DOMDebugger2.CSPViolationType || (DOMDebugger2.CSPViolationType = {}));
})(DOMDebugger || (DOMDebugger = {}));
var DigitalCredentials;
((DigitalCredentials2) => {
  let VirtualWalletAction;
  ((VirtualWalletAction2) => {
    VirtualWalletAction2["Respond"] = "respond";
    VirtualWalletAction2["Decline"] = "decline";
    VirtualWalletAction2["Wait"] = "wait";
    VirtualWalletAction2["Clear"] = "clear";
  })(VirtualWalletAction = DigitalCredentials2.VirtualWalletAction || (DigitalCredentials2.VirtualWalletAction = {}));
})(DigitalCredentials || (DigitalCredentials = {}));
var Emulation;
((Emulation2) => {
  let ScreenOrientationType;
  ((ScreenOrientationType2) => {
    ScreenOrientationType2["PortraitPrimary"] = "portraitPrimary";
    ScreenOrientationType2["PortraitSecondary"] = "portraitSecondary";
    ScreenOrientationType2["LandscapePrimary"] = "landscapePrimary";
    ScreenOrientationType2["LandscapeSecondary"] = "landscapeSecondary";
  })(ScreenOrientationType = Emulation2.ScreenOrientationType || (Emulation2.ScreenOrientationType = {}));
  let DisplayFeatureOrientation;
  ((DisplayFeatureOrientation2) => {
    DisplayFeatureOrientation2["Vertical"] = "vertical";
    DisplayFeatureOrientation2["Horizontal"] = "horizontal";
  })(DisplayFeatureOrientation = Emulation2.DisplayFeatureOrientation || (Emulation2.DisplayFeatureOrientation = {}));
  let DevicePostureType;
  ((DevicePostureType2) => {
    DevicePostureType2["Continuous"] = "continuous";
    DevicePostureType2["Folded"] = "folded";
  })(DevicePostureType = Emulation2.DevicePostureType || (Emulation2.DevicePostureType = {}));
  let VirtualTimePolicy;
  ((VirtualTimePolicy2) => {
    VirtualTimePolicy2["Advance"] = "advance";
    VirtualTimePolicy2["Pause"] = "pause";
    VirtualTimePolicy2["PauseIfNetworkFetchesPending"] = "pauseIfNetworkFetchesPending";
  })(VirtualTimePolicy = Emulation2.VirtualTimePolicy || (Emulation2.VirtualTimePolicy = {}));
  let SensorType;
  ((SensorType2) => {
    SensorType2["AbsoluteOrientation"] = "absolute-orientation";
    SensorType2["Accelerometer"] = "accelerometer";
    SensorType2["AmbientLight"] = "ambient-light";
    SensorType2["Gravity"] = "gravity";
    SensorType2["Gyroscope"] = "gyroscope";
    SensorType2["LinearAcceleration"] = "linear-acceleration";
    SensorType2["Magnetometer"] = "magnetometer";
    SensorType2["RelativeOrientation"] = "relative-orientation";
  })(SensorType = Emulation2.SensorType || (Emulation2.SensorType = {}));
  let PressureSource;
  ((PressureSource2) => {
    PressureSource2["Cpu"] = "cpu";
  })(PressureSource = Emulation2.PressureSource || (Emulation2.PressureSource = {}));
  let PressureState;
  ((PressureState2) => {
    PressureState2["Nominal"] = "nominal";
    PressureState2["Fair"] = "fair";
    PressureState2["Serious"] = "serious";
    PressureState2["Critical"] = "critical";
  })(PressureState = Emulation2.PressureState || (Emulation2.PressureState = {}));
  let DisabledImageType;
  ((DisabledImageType2) => {
    DisabledImageType2["Avif"] = "avif";
    DisabledImageType2["Jxl"] = "jxl";
    DisabledImageType2["Webp"] = "webp";
  })(DisabledImageType = Emulation2.DisabledImageType || (Emulation2.DisabledImageType = {}));
  let SetDeviceMetricsOverrideRequestScrollbarType;
  ((SetDeviceMetricsOverrideRequestScrollbarType2) => {
    SetDeviceMetricsOverrideRequestScrollbarType2["Overlay"] = "overlay";
    SetDeviceMetricsOverrideRequestScrollbarType2["Default"] = "default";
  })(SetDeviceMetricsOverrideRequestScrollbarType = Emulation2.SetDeviceMetricsOverrideRequestScrollbarType || (Emulation2.SetDeviceMetricsOverrideRequestScrollbarType = {}));
  let SetEmitTouchEventsForMouseRequestConfiguration;
  ((SetEmitTouchEventsForMouseRequestConfiguration2) => {
    SetEmitTouchEventsForMouseRequestConfiguration2["Mobile"] = "mobile";
    SetEmitTouchEventsForMouseRequestConfiguration2["Desktop"] = "desktop";
  })(SetEmitTouchEventsForMouseRequestConfiguration = Emulation2.SetEmitTouchEventsForMouseRequestConfiguration || (Emulation2.SetEmitTouchEventsForMouseRequestConfiguration = {}));
  let SetEmulatedVisionDeficiencyRequestType;
  ((SetEmulatedVisionDeficiencyRequestType2) => {
    SetEmulatedVisionDeficiencyRequestType2["None"] = "none";
    SetEmulatedVisionDeficiencyRequestType2["BlurredVision"] = "blurredVision";
    SetEmulatedVisionDeficiencyRequestType2["ReducedContrast"] = "reducedContrast";
    SetEmulatedVisionDeficiencyRequestType2["Achromatopsia"] = "achromatopsia";
    SetEmulatedVisionDeficiencyRequestType2["Deuteranopia"] = "deuteranopia";
    SetEmulatedVisionDeficiencyRequestType2["Protanopia"] = "protanopia";
    SetEmulatedVisionDeficiencyRequestType2["Tritanopia"] = "tritanopia";
  })(SetEmulatedVisionDeficiencyRequestType = Emulation2.SetEmulatedVisionDeficiencyRequestType || (Emulation2.SetEmulatedVisionDeficiencyRequestType = {}));
  let SetCPUPerformanceOverrideRequestPerformanceTier;
  ((SetCPUPerformanceOverrideRequestPerformanceTier2) => {
    SetCPUPerformanceOverrideRequestPerformanceTier2["Unknown"] = "unknown";
    SetCPUPerformanceOverrideRequestPerformanceTier2["Low"] = "low";
    SetCPUPerformanceOverrideRequestPerformanceTier2["Mid"] = "mid";
    SetCPUPerformanceOverrideRequestPerformanceTier2["High"] = "high";
    SetCPUPerformanceOverrideRequestPerformanceTier2["Ultra"] = "ultra";
  })(SetCPUPerformanceOverrideRequestPerformanceTier = Emulation2.SetCPUPerformanceOverrideRequestPerformanceTier || (Emulation2.SetCPUPerformanceOverrideRequestPerformanceTier = {}));
})(Emulation || (Emulation = {}));
var Extensions;
((Extensions2) => {
  let StorageArea;
  ((StorageArea2) => {
    StorageArea2["Session"] = "session";
    StorageArea2["Local"] = "local";
    StorageArea2["Sync"] = "sync";
    StorageArea2["Managed"] = "managed";
  })(StorageArea = Extensions2.StorageArea || (Extensions2.StorageArea = {}));
})(Extensions || (Extensions = {}));
var FedCm;
((FedCm2) => {
  let LoginState;
  ((LoginState2) => {
    LoginState2["SignIn"] = "SignIn";
    LoginState2["SignUp"] = "SignUp";
  })(LoginState = FedCm2.LoginState || (FedCm2.LoginState = {}));
  let DialogType;
  ((DialogType2) => {
    DialogType2["AccountChooser"] = "AccountChooser";
    DialogType2["AutoReauthn"] = "AutoReauthn";
    DialogType2["ConfirmIdpLogin"] = "ConfirmIdpLogin";
    DialogType2["Error"] = "Error";
  })(DialogType = FedCm2.DialogType || (FedCm2.DialogType = {}));
  let DialogButton;
  ((DialogButton2) => {
    DialogButton2["ConfirmIdpLoginContinue"] = "ConfirmIdpLoginContinue";
    DialogButton2["ErrorGotIt"] = "ErrorGotIt";
    DialogButton2["ErrorMoreDetails"] = "ErrorMoreDetails";
  })(DialogButton = FedCm2.DialogButton || (FedCm2.DialogButton = {}));
  let AccountUrlType;
  ((AccountUrlType2) => {
    AccountUrlType2["TermsOfService"] = "TermsOfService";
    AccountUrlType2["PrivacyPolicy"] = "PrivacyPolicy";
  })(AccountUrlType = FedCm2.AccountUrlType || (FedCm2.AccountUrlType = {}));
})(FedCm || (FedCm = {}));
var Fetch;
((Fetch2) => {
  let RequestStage;
  ((RequestStage2) => {
    RequestStage2["Request"] = "Request";
    RequestStage2["Response"] = "Response";
  })(RequestStage = Fetch2.RequestStage || (Fetch2.RequestStage = {}));
  let AuthChallengeSource;
  ((AuthChallengeSource2) => {
    AuthChallengeSource2["Server"] = "Server";
    AuthChallengeSource2["Proxy"] = "Proxy";
  })(AuthChallengeSource = Fetch2.AuthChallengeSource || (Fetch2.AuthChallengeSource = {}));
  let AuthChallengeResponseResponse;
  ((AuthChallengeResponseResponse2) => {
    AuthChallengeResponseResponse2["Default"] = "Default";
    AuthChallengeResponseResponse2["CancelAuth"] = "CancelAuth";
    AuthChallengeResponseResponse2["ProvideCredentials"] = "ProvideCredentials";
  })(AuthChallengeResponseResponse = Fetch2.AuthChallengeResponseResponse || (Fetch2.AuthChallengeResponseResponse = {}));
})(Fetch || (Fetch = {}));
var HeadlessExperimental;
((HeadlessExperimental2) => {
  let ScreenshotParamsFormat;
  ((ScreenshotParamsFormat2) => {
    ScreenshotParamsFormat2["Jpeg"] = "jpeg";
    ScreenshotParamsFormat2["Png"] = "png";
    ScreenshotParamsFormat2["Webp"] = "webp";
  })(ScreenshotParamsFormat = HeadlessExperimental2.ScreenshotParamsFormat || (HeadlessExperimental2.ScreenshotParamsFormat = {}));
})(HeadlessExperimental || (HeadlessExperimental = {}));
var IndexedDB;
((IndexedDB2) => {
  let KeyType;
  ((KeyType2) => {
    KeyType2["Number"] = "number";
    KeyType2["String"] = "string";
    KeyType2["Date"] = "date";
    KeyType2["Array"] = "array";
  })(KeyType = IndexedDB2.KeyType || (IndexedDB2.KeyType = {}));
  let KeyPathType;
  ((KeyPathType2) => {
    KeyPathType2["Null"] = "null";
    KeyPathType2["String"] = "string";
    KeyPathType2["Array"] = "array";
  })(KeyPathType = IndexedDB2.KeyPathType || (IndexedDB2.KeyPathType = {}));
})(IndexedDB || (IndexedDB = {}));
var Input;
((Input3) => {
  let GestureSourceType;
  ((GestureSourceType2) => {
    GestureSourceType2["Default"] = "default";
    GestureSourceType2["Touch"] = "touch";
    GestureSourceType2["Mouse"] = "mouse";
  })(GestureSourceType = Input3.GestureSourceType || (Input3.GestureSourceType = {}));
  let MouseButton;
  ((MouseButton2) => {
    MouseButton2["None"] = "none";
    MouseButton2["Left"] = "left";
    MouseButton2["Middle"] = "middle";
    MouseButton2["Right"] = "right";
    MouseButton2["Back"] = "back";
    MouseButton2["Forward"] = "forward";
  })(MouseButton = Input3.MouseButton || (Input3.MouseButton = {}));
  let DispatchDragEventRequestType;
  ((DispatchDragEventRequestType2) => {
    DispatchDragEventRequestType2["DragEnter"] = "dragEnter";
    DispatchDragEventRequestType2["DragOver"] = "dragOver";
    DispatchDragEventRequestType2["Drop"] = "drop";
    DispatchDragEventRequestType2["DragCancel"] = "dragCancel";
  })(DispatchDragEventRequestType = Input3.DispatchDragEventRequestType || (Input3.DispatchDragEventRequestType = {}));
  let DispatchKeyEventRequestType;
  ((DispatchKeyEventRequestType2) => {
    DispatchKeyEventRequestType2["KeyDown"] = "keyDown";
    DispatchKeyEventRequestType2["KeyUp"] = "keyUp";
    DispatchKeyEventRequestType2["RawKeyDown"] = "rawKeyDown";
    DispatchKeyEventRequestType2["Char"] = "char";
  })(DispatchKeyEventRequestType = Input3.DispatchKeyEventRequestType || (Input3.DispatchKeyEventRequestType = {}));
  let DispatchMouseEventRequestType;
  ((DispatchMouseEventRequestType2) => {
    DispatchMouseEventRequestType2["MousePressed"] = "mousePressed";
    DispatchMouseEventRequestType2["MouseReleased"] = "mouseReleased";
    DispatchMouseEventRequestType2["MouseMoved"] = "mouseMoved";
    DispatchMouseEventRequestType2["MouseWheel"] = "mouseWheel";
  })(DispatchMouseEventRequestType = Input3.DispatchMouseEventRequestType || (Input3.DispatchMouseEventRequestType = {}));
  let DispatchMouseEventRequestPointerType;
  ((DispatchMouseEventRequestPointerType2) => {
    DispatchMouseEventRequestPointerType2["Mouse"] = "mouse";
    DispatchMouseEventRequestPointerType2["Pen"] = "pen";
  })(DispatchMouseEventRequestPointerType = Input3.DispatchMouseEventRequestPointerType || (Input3.DispatchMouseEventRequestPointerType = {}));
  let DispatchTouchEventRequestType;
  ((DispatchTouchEventRequestType2) => {
    DispatchTouchEventRequestType2["TouchStart"] = "touchStart";
    DispatchTouchEventRequestType2["TouchEnd"] = "touchEnd";
    DispatchTouchEventRequestType2["TouchMove"] = "touchMove";
    DispatchTouchEventRequestType2["TouchCancel"] = "touchCancel";
  })(DispatchTouchEventRequestType = Input3.DispatchTouchEventRequestType || (Input3.DispatchTouchEventRequestType = {}));
  let EmulateTouchFromMouseEventRequestType;
  ((EmulateTouchFromMouseEventRequestType2) => {
    EmulateTouchFromMouseEventRequestType2["MousePressed"] = "mousePressed";
    EmulateTouchFromMouseEventRequestType2["MouseReleased"] = "mouseReleased";
    EmulateTouchFromMouseEventRequestType2["MouseMoved"] = "mouseMoved";
    EmulateTouchFromMouseEventRequestType2["MouseWheel"] = "mouseWheel";
  })(EmulateTouchFromMouseEventRequestType = Input3.EmulateTouchFromMouseEventRequestType || (Input3.EmulateTouchFromMouseEventRequestType = {}));
})(Input || (Input = {}));
var LayerTree;
((LayerTree2) => {
  let ScrollRectType;
  ((ScrollRectType2) => {
    ScrollRectType2["RepaintsOnScroll"] = "RepaintsOnScroll";
    ScrollRectType2["TouchEventHandler"] = "TouchEventHandler";
    ScrollRectType2["WheelEventHandler"] = "WheelEventHandler";
  })(ScrollRectType = LayerTree2.ScrollRectType || (LayerTree2.ScrollRectType = {}));
})(LayerTree || (LayerTree = {}));
var Log;
((Log2) => {
  let LogEntrySource;
  ((LogEntrySource2) => {
    LogEntrySource2["XML"] = "xml";
    LogEntrySource2["Javascript"] = "javascript";
    LogEntrySource2["Network"] = "network";
    LogEntrySource2["Storage"] = "storage";
    LogEntrySource2["Appcache"] = "appcache";
    LogEntrySource2["Rendering"] = "rendering";
    LogEntrySource2["Security"] = "security";
    LogEntrySource2["Deprecation"] = "deprecation";
    LogEntrySource2["Worker"] = "worker";
    LogEntrySource2["Violation"] = "violation";
    LogEntrySource2["Intervention"] = "intervention";
    LogEntrySource2["Recommendation"] = "recommendation";
    LogEntrySource2["Other"] = "other";
  })(LogEntrySource = Log2.LogEntrySource || (Log2.LogEntrySource = {}));
  let LogEntryLevel;
  ((LogEntryLevel2) => {
    LogEntryLevel2["Verbose"] = "verbose";
    LogEntryLevel2["Info"] = "info";
    LogEntryLevel2["Warning"] = "warning";
    LogEntryLevel2["Error"] = "error";
  })(LogEntryLevel = Log2.LogEntryLevel || (Log2.LogEntryLevel = {}));
  let LogEntryCategory;
  ((LogEntryCategory2) => {
    LogEntryCategory2["Cors"] = "cors";
  })(LogEntryCategory = Log2.LogEntryCategory || (Log2.LogEntryCategory = {}));
  let ViolationSettingName;
  ((ViolationSettingName2) => {
    ViolationSettingName2["LongTask"] = "longTask";
    ViolationSettingName2["LongLayout"] = "longLayout";
    ViolationSettingName2["BlockedEvent"] = "blockedEvent";
    ViolationSettingName2["BlockedParser"] = "blockedParser";
    ViolationSettingName2["DiscouragedAPIUse"] = "discouragedAPIUse";
    ViolationSettingName2["Handler"] = "handler";
    ViolationSettingName2["RecurringHandler"] = "recurringHandler";
  })(ViolationSettingName = Log2.ViolationSettingName || (Log2.ViolationSettingName = {}));
})(Log || (Log = {}));
var Media;
((Media2) => {
  let PlayerMessageLevel;
  ((PlayerMessageLevel2) => {
    PlayerMessageLevel2["Error"] = "error";
    PlayerMessageLevel2["Warning"] = "warning";
    PlayerMessageLevel2["Info"] = "info";
    PlayerMessageLevel2["Debug"] = "debug";
  })(PlayerMessageLevel = Media2.PlayerMessageLevel || (Media2.PlayerMessageLevel = {}));
})(Media || (Media = {}));
var Memory;
((Memory2) => {
  let PressureLevel;
  ((PressureLevel2) => {
    PressureLevel2["Moderate"] = "moderate";
    PressureLevel2["Critical"] = "critical";
  })(PressureLevel = Memory2.PressureLevel || (Memory2.PressureLevel = {}));
})(Memory || (Memory = {}));
var Network;
((Network3) => {
  let ResourceType;
  ((ResourceType2) => {
    ResourceType2["Document"] = "Document";
    ResourceType2["Stylesheet"] = "Stylesheet";
    ResourceType2["Image"] = "Image";
    ResourceType2["Media"] = "Media";
    ResourceType2["Font"] = "Font";
    ResourceType2["Script"] = "Script";
    ResourceType2["TextTrack"] = "TextTrack";
    ResourceType2["XHR"] = "XHR";
    ResourceType2["Fetch"] = "Fetch";
    ResourceType2["Prefetch"] = "Prefetch";
    ResourceType2["EventSource"] = "EventSource";
    ResourceType2["WebSocket"] = "WebSocket";
    ResourceType2["Manifest"] = "Manifest";
    ResourceType2["SignedExchange"] = "SignedExchange";
    ResourceType2["Ping"] = "Ping";
    ResourceType2["CSPViolationReport"] = "CSPViolationReport";
    ResourceType2["Preflight"] = "Preflight";
    ResourceType2["FedCM"] = "FedCM";
    ResourceType2["Other"] = "Other";
  })(ResourceType = Network3.ResourceType || (Network3.ResourceType = {}));
  let ErrorReason;
  ((ErrorReason2) => {
    ErrorReason2["Failed"] = "Failed";
    ErrorReason2["Aborted"] = "Aborted";
    ErrorReason2["TimedOut"] = "TimedOut";
    ErrorReason2["AccessDenied"] = "AccessDenied";
    ErrorReason2["ConnectionClosed"] = "ConnectionClosed";
    ErrorReason2["ConnectionReset"] = "ConnectionReset";
    ErrorReason2["ConnectionRefused"] = "ConnectionRefused";
    ErrorReason2["ConnectionAborted"] = "ConnectionAborted";
    ErrorReason2["ConnectionFailed"] = "ConnectionFailed";
    ErrorReason2["NameNotResolved"] = "NameNotResolved";
    ErrorReason2["InternetDisconnected"] = "InternetDisconnected";
    ErrorReason2["AddressUnreachable"] = "AddressUnreachable";
    ErrorReason2["BlockedByClient"] = "BlockedByClient";
    ErrorReason2["BlockedByResponse"] = "BlockedByResponse";
  })(ErrorReason = Network3.ErrorReason || (Network3.ErrorReason = {}));
  let ConnectionType;
  ((ConnectionType2) => {
    ConnectionType2["None"] = "none";
    ConnectionType2["Cellular2g"] = "cellular2g";
    ConnectionType2["Cellular3g"] = "cellular3g";
    ConnectionType2["Cellular4g"] = "cellular4g";
    ConnectionType2["Bluetooth"] = "bluetooth";
    ConnectionType2["Ethernet"] = "ethernet";
    ConnectionType2["Wifi"] = "wifi";
    ConnectionType2["Wimax"] = "wimax";
    ConnectionType2["Other"] = "other";
  })(ConnectionType = Network3.ConnectionType || (Network3.ConnectionType = {}));
  let CookieSameSite;
  ((CookieSameSite2) => {
    CookieSameSite2["Strict"] = "Strict";
    CookieSameSite2["Lax"] = "Lax";
    CookieSameSite2["None"] = "None";
  })(CookieSameSite = Network3.CookieSameSite || (Network3.CookieSameSite = {}));
  let CookiePriority;
  ((CookiePriority2) => {
    CookiePriority2["Low"] = "Low";
    CookiePriority2["Medium"] = "Medium";
    CookiePriority2["High"] = "High";
  })(CookiePriority = Network3.CookiePriority || (Network3.CookiePriority = {}));
  let CookieSourceScheme;
  ((CookieSourceScheme2) => {
    CookieSourceScheme2["Unset"] = "Unset";
    CookieSourceScheme2["NonSecure"] = "NonSecure";
    CookieSourceScheme2["Secure"] = "Secure";
  })(CookieSourceScheme = Network3.CookieSourceScheme || (Network3.CookieSourceScheme = {}));
  let ResourcePriority;
  ((ResourcePriority2) => {
    ResourcePriority2["VeryLow"] = "VeryLow";
    ResourcePriority2["Low"] = "Low";
    ResourcePriority2["Medium"] = "Medium";
    ResourcePriority2["High"] = "High";
    ResourcePriority2["VeryHigh"] = "VeryHigh";
  })(ResourcePriority = Network3.ResourcePriority || (Network3.ResourcePriority = {}));
  let RenderBlockingBehavior;
  ((RenderBlockingBehavior2) => {
    RenderBlockingBehavior2["Blocking"] = "Blocking";
    RenderBlockingBehavior2["InBodyParserBlocking"] = "InBodyParserBlocking";
    RenderBlockingBehavior2["NonBlocking"] = "NonBlocking";
    RenderBlockingBehavior2["NonBlockingDynamic"] = "NonBlockingDynamic";
    RenderBlockingBehavior2["PotentiallyBlocking"] = "PotentiallyBlocking";
  })(RenderBlockingBehavior = Network3.RenderBlockingBehavior || (Network3.RenderBlockingBehavior = {}));
  let RequestReferrerPolicy;
  ((RequestReferrerPolicy2) => {
    RequestReferrerPolicy2["UnsafeUrl"] = "unsafe-url";
    RequestReferrerPolicy2["NoReferrerWhenDowngrade"] = "no-referrer-when-downgrade";
    RequestReferrerPolicy2["NoReferrer"] = "no-referrer";
    RequestReferrerPolicy2["Origin"] = "origin";
    RequestReferrerPolicy2["OriginWhenCrossOrigin"] = "origin-when-cross-origin";
    RequestReferrerPolicy2["SameOrigin"] = "same-origin";
    RequestReferrerPolicy2["StrictOrigin"] = "strict-origin";
    RequestReferrerPolicy2["StrictOriginWhenCrossOrigin"] = "strict-origin-when-cross-origin";
  })(RequestReferrerPolicy = Network3.RequestReferrerPolicy || (Network3.RequestReferrerPolicy = {}));
  let CertificateTransparencyCompliance;
  ((CertificateTransparencyCompliance2) => {
    CertificateTransparencyCompliance2["Unknown"] = "unknown";
    CertificateTransparencyCompliance2["NotCompliant"] = "not-compliant";
    CertificateTransparencyCompliance2["Compliant"] = "compliant";
  })(CertificateTransparencyCompliance = Network3.CertificateTransparencyCompliance || (Network3.CertificateTransparencyCompliance = {}));
  let BlockedReason;
  ((BlockedReason2) => {
    BlockedReason2["Other"] = "other";
    BlockedReason2["Csp"] = "csp";
    BlockedReason2["MixedContent"] = "mixed-content";
    BlockedReason2["Origin"] = "origin";
    BlockedReason2["Inspector"] = "inspector";
    BlockedReason2["Integrity"] = "integrity";
    BlockedReason2["SubresourceFilter"] = "subresource-filter";
    BlockedReason2["ContentType"] = "content-type";
    BlockedReason2["CoepFrameResourceNeedsCoepHeader"] = "coep-frame-resource-needs-coep-header";
    BlockedReason2["CoopSandboxedIframeCannotNavigateToCoopPage"] = "coop-sandboxed-iframe-cannot-navigate-to-coop-page";
    BlockedReason2["CorpNotSameOrigin"] = "corp-not-same-origin";
    BlockedReason2["CorpNotSameOriginAfterDefaultedToSameOriginByCoep"] = "corp-not-same-origin-after-defaulted-to-same-origin-by-coep";
    BlockedReason2["CorpNotSameOriginAfterDefaultedToSameOriginByDip"] = "corp-not-same-origin-after-defaulted-to-same-origin-by-dip";
    BlockedReason2["CorpNotSameOriginAfterDefaultedToSameOriginByCoepAndDip"] = "corp-not-same-origin-after-defaulted-to-same-origin-by-coep-and-dip";
    BlockedReason2["CorpNotSameSite"] = "corp-not-same-site";
    BlockedReason2["SriMessageSignatureMismatch"] = "sri-message-signature-mismatch";
  })(BlockedReason = Network3.BlockedReason || (Network3.BlockedReason = {}));
  let CorsError;
  ((CorsError2) => {
    CorsError2["DisallowedByMode"] = "DisallowedByMode";
    CorsError2["InvalidResponse"] = "InvalidResponse";
    CorsError2["WildcardOriginNotAllowed"] = "WildcardOriginNotAllowed";
    CorsError2["MissingAllowOriginHeader"] = "MissingAllowOriginHeader";
    CorsError2["MultipleAllowOriginValues"] = "MultipleAllowOriginValues";
    CorsError2["InvalidAllowOriginValue"] = "InvalidAllowOriginValue";
    CorsError2["AllowOriginMismatch"] = "AllowOriginMismatch";
    CorsError2["InvalidAllowCredentials"] = "InvalidAllowCredentials";
    CorsError2["CorsDisabledScheme"] = "CorsDisabledScheme";
    CorsError2["PreflightInvalidStatus"] = "PreflightInvalidStatus";
    CorsError2["PreflightDisallowedRedirect"] = "PreflightDisallowedRedirect";
    CorsError2["PreflightWildcardOriginNotAllowed"] = "PreflightWildcardOriginNotAllowed";
    CorsError2["PreflightMissingAllowOriginHeader"] = "PreflightMissingAllowOriginHeader";
    CorsError2["PreflightMultipleAllowOriginValues"] = "PreflightMultipleAllowOriginValues";
    CorsError2["PreflightInvalidAllowOriginValue"] = "PreflightInvalidAllowOriginValue";
    CorsError2["PreflightAllowOriginMismatch"] = "PreflightAllowOriginMismatch";
    CorsError2["PreflightInvalidAllowCredentials"] = "PreflightInvalidAllowCredentials";
    CorsError2["PreflightMissingAllowExternal"] = "PreflightMissingAllowExternal";
    CorsError2["PreflightInvalidAllowExternal"] = "PreflightInvalidAllowExternal";
    CorsError2["InvalidAllowMethodsPreflightResponse"] = "InvalidAllowMethodsPreflightResponse";
    CorsError2["InvalidAllowHeadersPreflightResponse"] = "InvalidAllowHeadersPreflightResponse";
    CorsError2["MethodDisallowedByPreflightResponse"] = "MethodDisallowedByPreflightResponse";
    CorsError2["HeaderDisallowedByPreflightResponse"] = "HeaderDisallowedByPreflightResponse";
    CorsError2["RedirectContainsCredentials"] = "RedirectContainsCredentials";
    CorsError2["InsecureLocalNetwork"] = "InsecureLocalNetwork";
    CorsError2["InvalidLocalNetworkAccess"] = "InvalidLocalNetworkAccess";
    CorsError2["NoCorsRedirectModeNotFollow"] = "NoCorsRedirectModeNotFollow";
    CorsError2["LocalNetworkAccessPermissionDenied"] = "LocalNetworkAccessPermissionDenied";
  })(CorsError = Network3.CorsError || (Network3.CorsError = {}));
  let ServiceWorkerResponseSource;
  ((ServiceWorkerResponseSource2) => {
    ServiceWorkerResponseSource2["CacheStorage"] = "cache-storage";
    ServiceWorkerResponseSource2["HttpCache"] = "http-cache";
    ServiceWorkerResponseSource2["FallbackCode"] = "fallback-code";
    ServiceWorkerResponseSource2["Network"] = "network";
  })(ServiceWorkerResponseSource = Network3.ServiceWorkerResponseSource || (Network3.ServiceWorkerResponseSource = {}));
  let TrustTokenParamsRefreshPolicy;
  ((TrustTokenParamsRefreshPolicy2) => {
    TrustTokenParamsRefreshPolicy2["UseCached"] = "UseCached";
    TrustTokenParamsRefreshPolicy2["Refresh"] = "Refresh";
  })(TrustTokenParamsRefreshPolicy = Network3.TrustTokenParamsRefreshPolicy || (Network3.TrustTokenParamsRefreshPolicy = {}));
  let TrustTokenOperationType;
  ((TrustTokenOperationType2) => {
    TrustTokenOperationType2["Issuance"] = "Issuance";
    TrustTokenOperationType2["Redemption"] = "Redemption";
    TrustTokenOperationType2["Signing"] = "Signing";
  })(TrustTokenOperationType = Network3.TrustTokenOperationType || (Network3.TrustTokenOperationType = {}));
  let AlternateProtocolUsage;
  ((AlternateProtocolUsage2) => {
    AlternateProtocolUsage2["AlternativeJobWonWithoutRace"] = "alternativeJobWonWithoutRace";
    AlternateProtocolUsage2["AlternativeJobWonRace"] = "alternativeJobWonRace";
    AlternateProtocolUsage2["MainJobWonRace"] = "mainJobWonRace";
    AlternateProtocolUsage2["MappingMissing"] = "mappingMissing";
    AlternateProtocolUsage2["Broken"] = "broken";
    AlternateProtocolUsage2["DnsAlpnH3JobWonWithoutRace"] = "dnsAlpnH3JobWonWithoutRace";
    AlternateProtocolUsage2["DnsAlpnH3JobWonRace"] = "dnsAlpnH3JobWonRace";
    AlternateProtocolUsage2["UnspecifiedReason"] = "unspecifiedReason";
  })(AlternateProtocolUsage = Network3.AlternateProtocolUsage || (Network3.AlternateProtocolUsage = {}));
  let ServiceWorkerRouterSource;
  ((ServiceWorkerRouterSource2) => {
    ServiceWorkerRouterSource2["Network"] = "network";
    ServiceWorkerRouterSource2["Cache"] = "cache";
    ServiceWorkerRouterSource2["FetchEvent"] = "fetch-event";
    ServiceWorkerRouterSource2["RaceNetworkAndFetchHandler"] = "race-network-and-fetch-handler";
    ServiceWorkerRouterSource2["RaceNetworkAndCache"] = "race-network-and-cache";
  })(ServiceWorkerRouterSource = Network3.ServiceWorkerRouterSource || (Network3.ServiceWorkerRouterSource = {}));
  let InitiatorType;
  ((InitiatorType2) => {
    InitiatorType2["Parser"] = "parser";
    InitiatorType2["Script"] = "script";
    InitiatorType2["Preload"] = "preload";
    InitiatorType2["SignedExchange"] = "SignedExchange";
    InitiatorType2["Preflight"] = "preflight";
    InitiatorType2["FedCM"] = "FedCM";
    InitiatorType2["Other"] = "other";
  })(InitiatorType = Network3.InitiatorType || (Network3.InitiatorType = {}));
  let SetCookieBlockedReason;
  ((SetCookieBlockedReason2) => {
    SetCookieBlockedReason2["SecureOnly"] = "SecureOnly";
    SetCookieBlockedReason2["SameSiteStrict"] = "SameSiteStrict";
    SetCookieBlockedReason2["SameSiteLax"] = "SameSiteLax";
    SetCookieBlockedReason2["SameSiteUnspecifiedTreatedAsLax"] = "SameSiteUnspecifiedTreatedAsLax";
    SetCookieBlockedReason2["SameSiteNoneInsecure"] = "SameSiteNoneInsecure";
    SetCookieBlockedReason2["UserPreferences"] = "UserPreferences";
    SetCookieBlockedReason2["ThirdPartyPhaseout"] = "ThirdPartyPhaseout";
    SetCookieBlockedReason2["ThirdPartyBlockedInFirstPartySet"] = "ThirdPartyBlockedInFirstPartySet";
    SetCookieBlockedReason2["SyntaxError"] = "SyntaxError";
    SetCookieBlockedReason2["SchemeNotSupported"] = "SchemeNotSupported";
    SetCookieBlockedReason2["OverwriteSecure"] = "OverwriteSecure";
    SetCookieBlockedReason2["InvalidDomain"] = "InvalidDomain";
    SetCookieBlockedReason2["InvalidPrefix"] = "InvalidPrefix";
    SetCookieBlockedReason2["UnknownError"] = "UnknownError";
    SetCookieBlockedReason2["SchemefulSameSiteStrict"] = "SchemefulSameSiteStrict";
    SetCookieBlockedReason2["SchemefulSameSiteLax"] = "SchemefulSameSiteLax";
    SetCookieBlockedReason2["SchemefulSameSiteUnspecifiedTreatedAsLax"] = "SchemefulSameSiteUnspecifiedTreatedAsLax";
    SetCookieBlockedReason2["NameValuePairExceedsMaxSize"] = "NameValuePairExceedsMaxSize";
    SetCookieBlockedReason2["DisallowedCharacter"] = "DisallowedCharacter";
    SetCookieBlockedReason2["NoCookieContent"] = "NoCookieContent";
  })(SetCookieBlockedReason = Network3.SetCookieBlockedReason || (Network3.SetCookieBlockedReason = {}));
  let CookieBlockedReason;
  ((CookieBlockedReason2) => {
    CookieBlockedReason2["SecureOnly"] = "SecureOnly";
    CookieBlockedReason2["NotOnPath"] = "NotOnPath";
    CookieBlockedReason2["DomainMismatch"] = "DomainMismatch";
    CookieBlockedReason2["SameSiteStrict"] = "SameSiteStrict";
    CookieBlockedReason2["SameSiteLax"] = "SameSiteLax";
    CookieBlockedReason2["SameSiteUnspecifiedTreatedAsLax"] = "SameSiteUnspecifiedTreatedAsLax";
    CookieBlockedReason2["SameSiteNoneInsecure"] = "SameSiteNoneInsecure";
    CookieBlockedReason2["UserPreferences"] = "UserPreferences";
    CookieBlockedReason2["ThirdPartyPhaseout"] = "ThirdPartyPhaseout";
    CookieBlockedReason2["ThirdPartyBlockedInFirstPartySet"] = "ThirdPartyBlockedInFirstPartySet";
    CookieBlockedReason2["UnknownError"] = "UnknownError";
    CookieBlockedReason2["SchemefulSameSiteStrict"] = "SchemefulSameSiteStrict";
    CookieBlockedReason2["SchemefulSameSiteLax"] = "SchemefulSameSiteLax";
    CookieBlockedReason2["SchemefulSameSiteUnspecifiedTreatedAsLax"] = "SchemefulSameSiteUnspecifiedTreatedAsLax";
    CookieBlockedReason2["NameValuePairExceedsMaxSize"] = "NameValuePairExceedsMaxSize";
    CookieBlockedReason2["PortMismatch"] = "PortMismatch";
    CookieBlockedReason2["SchemeMismatch"] = "SchemeMismatch";
    CookieBlockedReason2["AnonymousContext"] = "AnonymousContext";
  })(CookieBlockedReason = Network3.CookieBlockedReason || (Network3.CookieBlockedReason = {}));
  let CookieExemptionReason;
  ((CookieExemptionReason2) => {
    CookieExemptionReason2["None"] = "None";
    CookieExemptionReason2["UserSetting"] = "UserSetting";
    CookieExemptionReason2["EnterprisePolicy"] = "EnterprisePolicy";
    CookieExemptionReason2["StorageAccess"] = "StorageAccess";
    CookieExemptionReason2["TopLevelStorageAccess"] = "TopLevelStorageAccess";
    CookieExemptionReason2["Scheme"] = "Scheme";
    CookieExemptionReason2["SameSiteNoneCookiesInSandbox"] = "SameSiteNoneCookiesInSandbox";
  })(CookieExemptionReason = Network3.CookieExemptionReason || (Network3.CookieExemptionReason = {}));
  let AuthChallengeSource;
  ((AuthChallengeSource2) => {
    AuthChallengeSource2["Server"] = "Server";
    AuthChallengeSource2["Proxy"] = "Proxy";
  })(AuthChallengeSource = Network3.AuthChallengeSource || (Network3.AuthChallengeSource = {}));
  let AuthChallengeResponseResponse;
  ((AuthChallengeResponseResponse2) => {
    AuthChallengeResponseResponse2["Default"] = "Default";
    AuthChallengeResponseResponse2["CancelAuth"] = "CancelAuth";
    AuthChallengeResponseResponse2["ProvideCredentials"] = "ProvideCredentials";
  })(AuthChallengeResponseResponse = Network3.AuthChallengeResponseResponse || (Network3.AuthChallengeResponseResponse = {}));
  let SignedExchangeErrorField;
  ((SignedExchangeErrorField2) => {
    SignedExchangeErrorField2["SignatureSig"] = "signatureSig";
    SignedExchangeErrorField2["SignatureIntegrity"] = "signatureIntegrity";
    SignedExchangeErrorField2["SignatureCertUrl"] = "signatureCertUrl";
    SignedExchangeErrorField2["SignatureCertSha256"] = "signatureCertSha256";
    SignedExchangeErrorField2["SignatureValidityUrl"] = "signatureValidityUrl";
    SignedExchangeErrorField2["SignatureTimestamps"] = "signatureTimestamps";
  })(SignedExchangeErrorField = Network3.SignedExchangeErrorField || (Network3.SignedExchangeErrorField = {}));
  let DirectSocketDnsQueryType;
  ((DirectSocketDnsQueryType2) => {
    DirectSocketDnsQueryType2["Ipv4"] = "ipv4";
    DirectSocketDnsQueryType2["Ipv6"] = "ipv6";
  })(DirectSocketDnsQueryType = Network3.DirectSocketDnsQueryType || (Network3.DirectSocketDnsQueryType = {}));
  let LocalNetworkAccessRequestPolicy;
  ((LocalNetworkAccessRequestPolicy2) => {
    LocalNetworkAccessRequestPolicy2["Allow"] = "Allow";
    LocalNetworkAccessRequestPolicy2["BlockFromInsecureToMorePrivate"] = "BlockFromInsecureToMorePrivate";
    LocalNetworkAccessRequestPolicy2["WarnFromInsecureToMorePrivate"] = "WarnFromInsecureToMorePrivate";
    LocalNetworkAccessRequestPolicy2["PermissionBlock"] = "PermissionBlock";
    LocalNetworkAccessRequestPolicy2["PermissionWarn"] = "PermissionWarn";
  })(LocalNetworkAccessRequestPolicy = Network3.LocalNetworkAccessRequestPolicy || (Network3.LocalNetworkAccessRequestPolicy = {}));
  let IPAddressSpace;
  ((IPAddressSpace2) => {
    IPAddressSpace2["Loopback"] = "Loopback";
    IPAddressSpace2["Local"] = "Local";
    IPAddressSpace2["Public"] = "Public";
    IPAddressSpace2["Unknown"] = "Unknown";
  })(IPAddressSpace = Network3.IPAddressSpace || (Network3.IPAddressSpace = {}));
  let CrossOriginOpenerPolicyValue;
  ((CrossOriginOpenerPolicyValue2) => {
    CrossOriginOpenerPolicyValue2["SameOrigin"] = "SameOrigin";
    CrossOriginOpenerPolicyValue2["SameOriginAllowPopups"] = "SameOriginAllowPopups";
    CrossOriginOpenerPolicyValue2["RestrictProperties"] = "RestrictProperties";
    CrossOriginOpenerPolicyValue2["UnsafeNone"] = "UnsafeNone";
    CrossOriginOpenerPolicyValue2["SameOriginPlusCoep"] = "SameOriginPlusCoep";
    CrossOriginOpenerPolicyValue2["RestrictPropertiesPlusCoep"] = "RestrictPropertiesPlusCoep";
    CrossOriginOpenerPolicyValue2["NoopenerAllowPopups"] = "NoopenerAllowPopups";
  })(CrossOriginOpenerPolicyValue = Network3.CrossOriginOpenerPolicyValue || (Network3.CrossOriginOpenerPolicyValue = {}));
  let CrossOriginEmbedderPolicyValue;
  ((CrossOriginEmbedderPolicyValue2) => {
    CrossOriginEmbedderPolicyValue2["None"] = "None";
    CrossOriginEmbedderPolicyValue2["Credentialless"] = "Credentialless";
    CrossOriginEmbedderPolicyValue2["RequireCorp"] = "RequireCorp";
  })(CrossOriginEmbedderPolicyValue = Network3.CrossOriginEmbedderPolicyValue || (Network3.CrossOriginEmbedderPolicyValue = {}));
  let ContentSecurityPolicySource;
  ((ContentSecurityPolicySource2) => {
    ContentSecurityPolicySource2["HTTP"] = "HTTP";
    ContentSecurityPolicySource2["Meta"] = "Meta";
  })(ContentSecurityPolicySource = Network3.ContentSecurityPolicySource || (Network3.ContentSecurityPolicySource = {}));
  let ReportStatus;
  ((ReportStatus2) => {
    ReportStatus2["Queued"] = "Queued";
    ReportStatus2["Pending"] = "Pending";
    ReportStatus2["MarkedForRemoval"] = "MarkedForRemoval";
    ReportStatus2["Success"] = "Success";
  })(ReportStatus = Network3.ReportStatus || (Network3.ReportStatus = {}));
  let DeviceBoundSessionWithUsageUsage;
  ((DeviceBoundSessionWithUsageUsage2) => {
    DeviceBoundSessionWithUsageUsage2["NotInScope"] = "NotInScope";
    DeviceBoundSessionWithUsageUsage2["InScopeRefreshNotYetNeeded"] = "InScopeRefreshNotYetNeeded";
    DeviceBoundSessionWithUsageUsage2["InScopeRefreshNotAllowed"] = "InScopeRefreshNotAllowed";
    DeviceBoundSessionWithUsageUsage2["ProactiveRefreshNotPossible"] = "ProactiveRefreshNotPossible";
    DeviceBoundSessionWithUsageUsage2["ProactiveRefreshAttempted"] = "ProactiveRefreshAttempted";
    DeviceBoundSessionWithUsageUsage2["Deferred"] = "Deferred";
  })(DeviceBoundSessionWithUsageUsage = Network3.DeviceBoundSessionWithUsageUsage || (Network3.DeviceBoundSessionWithUsageUsage = {}));
  let DeviceBoundSessionUrlRuleRuleType;
  ((DeviceBoundSessionUrlRuleRuleType2) => {
    DeviceBoundSessionUrlRuleRuleType2["Exclude"] = "Exclude";
    DeviceBoundSessionUrlRuleRuleType2["Include"] = "Include";
  })(DeviceBoundSessionUrlRuleRuleType = Network3.DeviceBoundSessionUrlRuleRuleType || (Network3.DeviceBoundSessionUrlRuleRuleType = {}));
  let DeviceBoundSessionFetchResult;
  ((DeviceBoundSessionFetchResult2) => {
    DeviceBoundSessionFetchResult2["Success"] = "Success";
    DeviceBoundSessionFetchResult2["SigningKeyGenerationError"] = "SigningKeyGenerationError";
    DeviceBoundSessionFetchResult2["AttestationKeyGenerationError"] = "AttestationKeyGenerationError";
    DeviceBoundSessionFetchResult2["SigningError"] = "SigningError";
    DeviceBoundSessionFetchResult2["TransientSigningError"] = "TransientSigningError";
    DeviceBoundSessionFetchResult2["ServerRequestedTermination"] = "ServerRequestedTermination";
    DeviceBoundSessionFetchResult2["InvalidSessionId"] = "InvalidSessionId";
    DeviceBoundSessionFetchResult2["InvalidChallenge"] = "InvalidChallenge";
    DeviceBoundSessionFetchResult2["TooManyChallenges"] = "TooManyChallenges";
    DeviceBoundSessionFetchResult2["InvalidFetcherUrl"] = "InvalidFetcherUrl";
    DeviceBoundSessionFetchResult2["InvalidRefreshUrl"] = "InvalidRefreshUrl";
    DeviceBoundSessionFetchResult2["TransientHttpError"] = "TransientHttpError";
    DeviceBoundSessionFetchResult2["ScopeOriginSameSiteMismatch"] = "ScopeOriginSameSiteMismatch";
    DeviceBoundSessionFetchResult2["RefreshUrlSameSiteMismatch"] = "RefreshUrlSameSiteMismatch";
    DeviceBoundSessionFetchResult2["MismatchedSessionId"] = "MismatchedSessionId";
    DeviceBoundSessionFetchResult2["MissingScope"] = "MissingScope";
    DeviceBoundSessionFetchResult2["NoCredentials"] = "NoCredentials";
    DeviceBoundSessionFetchResult2["SubdomainRegistrationWellKnownUnavailable"] = "SubdomainRegistrationWellKnownUnavailable";
    DeviceBoundSessionFetchResult2["SubdomainRegistrationUnauthorized"] = "SubdomainRegistrationUnauthorized";
    DeviceBoundSessionFetchResult2["SubdomainRegistrationWellKnownMalformed"] = "SubdomainRegistrationWellKnownMalformed";
    DeviceBoundSessionFetchResult2["SessionProviderWellKnownUnavailable"] = "SessionProviderWellKnownUnavailable";
    DeviceBoundSessionFetchResult2["RelyingPartyWellKnownUnavailable"] = "RelyingPartyWellKnownUnavailable";
    DeviceBoundSessionFetchResult2["FederatedKeyThumbprintMismatch"] = "FederatedKeyThumbprintMismatch";
    DeviceBoundSessionFetchResult2["InvalidFederatedSessionUrl"] = "InvalidFederatedSessionUrl";
    DeviceBoundSessionFetchResult2["InvalidFederatedKey"] = "InvalidFederatedKey";
    DeviceBoundSessionFetchResult2["TooManyRelyingOriginLabels"] = "TooManyRelyingOriginLabels";
    DeviceBoundSessionFetchResult2["BoundCookieSetForbidden"] = "BoundCookieSetForbidden";
    DeviceBoundSessionFetchResult2["NetError"] = "NetError";
    DeviceBoundSessionFetchResult2["ProxyError"] = "ProxyError";
    DeviceBoundSessionFetchResult2["EmptySessionConfig"] = "EmptySessionConfig";
    DeviceBoundSessionFetchResult2["InvalidCredentialsConfig"] = "InvalidCredentialsConfig";
    DeviceBoundSessionFetchResult2["InvalidCredentialsType"] = "InvalidCredentialsType";
    DeviceBoundSessionFetchResult2["InvalidCredentialsEmptyName"] = "InvalidCredentialsEmptyName";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookie"] = "InvalidCredentialsCookie";
    DeviceBoundSessionFetchResult2["PersistentHttpError"] = "PersistentHttpError";
    DeviceBoundSessionFetchResult2["RegistrationAttemptedChallenge"] = "RegistrationAttemptedChallenge";
    DeviceBoundSessionFetchResult2["InvalidScopeOrigin"] = "InvalidScopeOrigin";
    DeviceBoundSessionFetchResult2["ScopeOriginContainsPath"] = "ScopeOriginContainsPath";
    DeviceBoundSessionFetchResult2["RefreshInitiatorNotString"] = "RefreshInitiatorNotString";
    DeviceBoundSessionFetchResult2["RefreshInitiatorInvalidHostPattern"] = "RefreshInitiatorInvalidHostPattern";
    DeviceBoundSessionFetchResult2["InvalidScopeSpecification"] = "InvalidScopeSpecification";
    DeviceBoundSessionFetchResult2["MissingScopeSpecificationType"] = "MissingScopeSpecificationType";
    DeviceBoundSessionFetchResult2["EmptyScopeSpecificationDomain"] = "EmptyScopeSpecificationDomain";
    DeviceBoundSessionFetchResult2["EmptyScopeSpecificationPath"] = "EmptyScopeSpecificationPath";
    DeviceBoundSessionFetchResult2["InvalidScopeSpecificationType"] = "InvalidScopeSpecificationType";
    DeviceBoundSessionFetchResult2["InvalidScopeIncludeSite"] = "InvalidScopeIncludeSite";
    DeviceBoundSessionFetchResult2["MissingScopeIncludeSite"] = "MissingScopeIncludeSite";
    DeviceBoundSessionFetchResult2["FederatedNotAuthorizedByProvider"] = "FederatedNotAuthorizedByProvider";
    DeviceBoundSessionFetchResult2["FederatedNotAuthorizedByRelyingParty"] = "FederatedNotAuthorizedByRelyingParty";
    DeviceBoundSessionFetchResult2["SessionProviderWellKnownMalformed"] = "SessionProviderWellKnownMalformed";
    DeviceBoundSessionFetchResult2["SessionProviderWellKnownHasProviderOrigin"] = "SessionProviderWellKnownHasProviderOrigin";
    DeviceBoundSessionFetchResult2["RelyingPartyWellKnownMalformed"] = "RelyingPartyWellKnownMalformed";
    DeviceBoundSessionFetchResult2["RelyingPartyWellKnownHasRelyingOrigins"] = "RelyingPartyWellKnownHasRelyingOrigins";
    DeviceBoundSessionFetchResult2["InvalidFederatedSessionProviderSessionMissing"] = "InvalidFederatedSessionProviderSessionMissing";
    DeviceBoundSessionFetchResult2["InvalidFederatedSessionWrongProviderOrigin"] = "InvalidFederatedSessionWrongProviderOrigin";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookieCreationTime"] = "InvalidCredentialsCookieCreationTime";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookieName"] = "InvalidCredentialsCookieName";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookieParsing"] = "InvalidCredentialsCookieParsing";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookieUnpermittedAttribute"] = "InvalidCredentialsCookieUnpermittedAttribute";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookieInvalidDomain"] = "InvalidCredentialsCookieInvalidDomain";
    DeviceBoundSessionFetchResult2["InvalidCredentialsCookiePrefix"] = "InvalidCredentialsCookiePrefix";
    DeviceBoundSessionFetchResult2["InvalidScopeRulePath"] = "InvalidScopeRulePath";
    DeviceBoundSessionFetchResult2["InvalidScopeRuleHostPattern"] = "InvalidScopeRuleHostPattern";
    DeviceBoundSessionFetchResult2["ScopeRuleOriginScopedHostPatternMismatch"] = "ScopeRuleOriginScopedHostPatternMismatch";
    DeviceBoundSessionFetchResult2["ScopeRuleSiteScopedHostPatternMismatch"] = "ScopeRuleSiteScopedHostPatternMismatch";
    DeviceBoundSessionFetchResult2["SigningQuotaExceeded"] = "SigningQuotaExceeded";
    DeviceBoundSessionFetchResult2["InvalidConfigJson"] = "InvalidConfigJson";
    DeviceBoundSessionFetchResult2["InvalidFederatedSessionProviderFailedToRestoreKey"] = "InvalidFederatedSessionProviderFailedToRestoreKey";
    DeviceBoundSessionFetchResult2["FailedToUnwrapKey"] = "FailedToUnwrapKey";
    DeviceBoundSessionFetchResult2["SessionDeletedDuringRefresh"] = "SessionDeletedDuringRefresh";
    DeviceBoundSessionFetchResult2["CrossOriginRegistrationSiteNotIncluded"] = "CrossOriginRegistrationSiteNotIncluded";
    DeviceBoundSessionFetchResult2["InvalidPreProvisionedKeyInitiatorMissing"] = "InvalidPreProvisionedKeyInitiatorMissing";
    DeviceBoundSessionFetchResult2["PreProvisionedKeyAccessNotGranted"] = "PreProvisionedKeyAccessNotGranted";
    DeviceBoundSessionFetchResult2["PreProvisionedKeyNotFound"] = "PreProvisionedKeyNotFound";
    DeviceBoundSessionFetchResult2["AttestationCertificationError"] = "AttestationCertificationError";
    DeviceBoundSessionFetchResult2["AttestationSigningError"] = "AttestationSigningError";
  })(DeviceBoundSessionFetchResult = Network3.DeviceBoundSessionFetchResult || (Network3.DeviceBoundSessionFetchResult = {}));
  let RefreshEventDetailsRefreshResult;
  ((RefreshEventDetailsRefreshResult2) => {
    RefreshEventDetailsRefreshResult2["Refreshed"] = "Refreshed";
    RefreshEventDetailsRefreshResult2["InitializedService"] = "InitializedService";
    RefreshEventDetailsRefreshResult2["Unreachable"] = "Unreachable";
    RefreshEventDetailsRefreshResult2["ServerError"] = "ServerError";
    RefreshEventDetailsRefreshResult2["FatalError"] = "FatalError";
    RefreshEventDetailsRefreshResult2["SigningQuotaExceeded"] = "SigningQuotaExceeded";
    RefreshEventDetailsRefreshResult2["RefreshedAsWaiter"] = "RefreshedAsWaiter";
    RefreshEventDetailsRefreshResult2["TransientSigningError"] = "TransientSigningError";
    RefreshEventDetailsRefreshResult2["InScopeRefreshNotYetNeeded"] = "InScopeRefreshNotYetNeeded";
  })(RefreshEventDetailsRefreshResult = Network3.RefreshEventDetailsRefreshResult || (Network3.RefreshEventDetailsRefreshResult = {}));
  let TerminationEventDetailsDeletionReason;
  ((TerminationEventDetailsDeletionReason2) => {
    TerminationEventDetailsDeletionReason2["Expired"] = "Expired";
    TerminationEventDetailsDeletionReason2["FailedToRestoreKey"] = "FailedToRestoreKey";
    TerminationEventDetailsDeletionReason2["FailedToUnwrapKey"] = "FailedToUnwrapKey";
    TerminationEventDetailsDeletionReason2["StoragePartitionCleared"] = "StoragePartitionCleared";
    TerminationEventDetailsDeletionReason2["ClearBrowsingData"] = "ClearBrowsingData";
    TerminationEventDetailsDeletionReason2["ServerRequested"] = "ServerRequested";
    TerminationEventDetailsDeletionReason2["InvalidSessionParams"] = "InvalidSessionParams";
    TerminationEventDetailsDeletionReason2["RefreshFatalError"] = "RefreshFatalError";
    TerminationEventDetailsDeletionReason2["DevTools"] = "DevTools";
  })(TerminationEventDetailsDeletionReason = Network3.TerminationEventDetailsDeletionReason || (Network3.TerminationEventDetailsDeletionReason = {}));
  let ChallengeEventDetailsChallengeResult;
  ((ChallengeEventDetailsChallengeResult2) => {
    ChallengeEventDetailsChallengeResult2["Success"] = "Success";
    ChallengeEventDetailsChallengeResult2["NoSessionId"] = "NoSessionId";
    ChallengeEventDetailsChallengeResult2["NoSessionMatch"] = "NoSessionMatch";
    ChallengeEventDetailsChallengeResult2["CantSetBoundCookie"] = "CantSetBoundCookie";
  })(ChallengeEventDetailsChallengeResult = Network3.ChallengeEventDetailsChallengeResult || (Network3.ChallengeEventDetailsChallengeResult = {}));
  let TrustTokenOperationDoneEventStatus;
  ((TrustTokenOperationDoneEventStatus2) => {
    TrustTokenOperationDoneEventStatus2["Ok"] = "Ok";
    TrustTokenOperationDoneEventStatus2["InvalidArgument"] = "InvalidArgument";
    TrustTokenOperationDoneEventStatus2["MissingIssuerKeys"] = "MissingIssuerKeys";
    TrustTokenOperationDoneEventStatus2["FailedPrecondition"] = "FailedPrecondition";
    TrustTokenOperationDoneEventStatus2["ResourceExhausted"] = "ResourceExhausted";
    TrustTokenOperationDoneEventStatus2["AlreadyExists"] = "AlreadyExists";
    TrustTokenOperationDoneEventStatus2["ResourceLimited"] = "ResourceLimited";
    TrustTokenOperationDoneEventStatus2["Unauthorized"] = "Unauthorized";
    TrustTokenOperationDoneEventStatus2["BadResponse"] = "BadResponse";
    TrustTokenOperationDoneEventStatus2["InternalError"] = "InternalError";
    TrustTokenOperationDoneEventStatus2["UnknownError"] = "UnknownError";
    TrustTokenOperationDoneEventStatus2["FulfilledLocally"] = "FulfilledLocally";
    TrustTokenOperationDoneEventStatus2["SiteIssuerLimit"] = "SiteIssuerLimit";
  })(TrustTokenOperationDoneEventStatus = Network3.TrustTokenOperationDoneEventStatus || (Network3.TrustTokenOperationDoneEventStatus = {}));
})(Network || (Network = {}));
var Overlay;
((Overlay2) => {
  let LineStylePattern;
  ((LineStylePattern2) => {
    LineStylePattern2["Dashed"] = "dashed";
    LineStylePattern2["Dotted"] = "dotted";
  })(LineStylePattern = Overlay2.LineStylePattern || (Overlay2.LineStylePattern = {}));
  let ContrastAlgorithm;
  ((ContrastAlgorithm2) => {
    ContrastAlgorithm2["Aa"] = "aa";
    ContrastAlgorithm2["Aaa"] = "aaa";
    ContrastAlgorithm2["Apca"] = "apca";
  })(ContrastAlgorithm = Overlay2.ContrastAlgorithm || (Overlay2.ContrastAlgorithm = {}));
  let ColorFormat;
  ((ColorFormat2) => {
    ColorFormat2["Rgb"] = "rgb";
    ColorFormat2["Hsl"] = "hsl";
    ColorFormat2["Hwb"] = "hwb";
    ColorFormat2["Hex"] = "hex";
  })(ColorFormat = Overlay2.ColorFormat || (Overlay2.ColorFormat = {}));
  let DisplayCutoutShape;
  ((DisplayCutoutShape2) => {
    DisplayCutoutShape2["Pill"] = "pill";
    DisplayCutoutShape2["Notch"] = "notch";
    DisplayCutoutShape2["Circle"] = "circle";
    DisplayCutoutShape2["Rectangle"] = "rectangle";
  })(DisplayCutoutShape = Overlay2.DisplayCutoutShape || (Overlay2.DisplayCutoutShape = {}));
  let InspectMode;
  ((InspectMode2) => {
    InspectMode2["SearchForNode"] = "searchForNode";
    InspectMode2["SearchForUAShadowDOM"] = "searchForUAShadowDOM";
    InspectMode2["CaptureAreaScreenshot"] = "captureAreaScreenshot";
    InspectMode2["None"] = "none";
  })(InspectMode = Overlay2.InspectMode || (Overlay2.InspectMode = {}));
})(Overlay || (Overlay = {}));
var PWA;
((PWA2) => {
  let DisplayMode;
  ((DisplayMode2) => {
    DisplayMode2["Standalone"] = "standalone";
    DisplayMode2["Browser"] = "browser";
  })(DisplayMode = PWA2.DisplayMode || (PWA2.DisplayMode = {}));
})(PWA || (PWA = {}));
var Page;
((Page2) => {
  let AdFrameType;
  ((AdFrameType2) => {
    AdFrameType2["None"] = "none";
    AdFrameType2["Child"] = "child";
    AdFrameType2["Root"] = "root";
  })(AdFrameType = Page2.AdFrameType || (Page2.AdFrameType = {}));
  let AdFrameExplanation;
  ((AdFrameExplanation2) => {
    AdFrameExplanation2["ParentIsAd"] = "ParentIsAd";
    AdFrameExplanation2["CreatedByAdScript"] = "CreatedByAdScript";
    AdFrameExplanation2["MatchedBlockingRule"] = "MatchedBlockingRule";
  })(AdFrameExplanation = Page2.AdFrameExplanation || (Page2.AdFrameExplanation = {}));
  let SecureContextType;
  ((SecureContextType2) => {
    SecureContextType2["Secure"] = "Secure";
    SecureContextType2["SecureLocalhost"] = "SecureLocalhost";
    SecureContextType2["InsecureScheme"] = "InsecureScheme";
    SecureContextType2["InsecureAncestor"] = "InsecureAncestor";
  })(SecureContextType = Page2.SecureContextType || (Page2.SecureContextType = {}));
  let CrossOriginIsolatedContextType;
  ((CrossOriginIsolatedContextType2) => {
    CrossOriginIsolatedContextType2["Isolated"] = "Isolated";
    CrossOriginIsolatedContextType2["NotIsolated"] = "NotIsolated";
    CrossOriginIsolatedContextType2["NotIsolatedFeatureDisabled"] = "NotIsolatedFeatureDisabled";
  })(CrossOriginIsolatedContextType = Page2.CrossOriginIsolatedContextType || (Page2.CrossOriginIsolatedContextType = {}));
  let GatedAPIFeatures;
  ((GatedAPIFeatures2) => {
    GatedAPIFeatures2["SharedArrayBuffers"] = "SharedArrayBuffers";
    GatedAPIFeatures2["SharedArrayBuffersTransferAllowed"] = "SharedArrayBuffersTransferAllowed";
    GatedAPIFeatures2["PerformanceMeasureMemory"] = "PerformanceMeasureMemory";
    GatedAPIFeatures2["PerformanceProfile"] = "PerformanceProfile";
  })(GatedAPIFeatures = Page2.GatedAPIFeatures || (Page2.GatedAPIFeatures = {}));
  let PermissionsPolicyFeature;
  ((PermissionsPolicyFeature2) => {
    PermissionsPolicyFeature2["Accelerometer"] = "accelerometer";
    PermissionsPolicyFeature2["AllScreensCapture"] = "all-screens-capture";
    PermissionsPolicyFeature2["AmbientLightSensor"] = "ambient-light-sensor";
    PermissionsPolicyFeature2["AriaNotify"] = "aria-notify";
    PermissionsPolicyFeature2["Autofill"] = "autofill";
    PermissionsPolicyFeature2["Autoplay"] = "autoplay";
    PermissionsPolicyFeature2["Bluetooth"] = "bluetooth";
    PermissionsPolicyFeature2["BrowsingTopics"] = "browsing-topics";
    PermissionsPolicyFeature2["Camera"] = "camera";
    PermissionsPolicyFeature2["CapturedSurfaceControl"] = "captured-surface-control";
    PermissionsPolicyFeature2["ChDpr"] = "ch-dpr";
    PermissionsPolicyFeature2["ChDeviceMemory"] = "ch-device-memory";
    PermissionsPolicyFeature2["ChDownlink"] = "ch-downlink";
    PermissionsPolicyFeature2["ChEct"] = "ch-ect";
    PermissionsPolicyFeature2["ChPrefersColorScheme"] = "ch-prefers-color-scheme";
    PermissionsPolicyFeature2["ChPrefersReducedMotion"] = "ch-prefers-reduced-motion";
    PermissionsPolicyFeature2["ChPrefersReducedTransparency"] = "ch-prefers-reduced-transparency";
    PermissionsPolicyFeature2["ChRtt"] = "ch-rtt";
    PermissionsPolicyFeature2["ChSaveData"] = "ch-save-data";
    PermissionsPolicyFeature2["ChUa"] = "ch-ua";
    PermissionsPolicyFeature2["ChUaArch"] = "ch-ua-arch";
    PermissionsPolicyFeature2["ChUaBitness"] = "ch-ua-bitness";
    PermissionsPolicyFeature2["ChUaHighEntropyValues"] = "ch-ua-high-entropy-values";
    PermissionsPolicyFeature2["ChUaPlatform"] = "ch-ua-platform";
    PermissionsPolicyFeature2["ChUaModel"] = "ch-ua-model";
    PermissionsPolicyFeature2["ChUaMobile"] = "ch-ua-mobile";
    PermissionsPolicyFeature2["ChUaFormFactors"] = "ch-ua-form-factors";
    PermissionsPolicyFeature2["ChUaFullVersion"] = "ch-ua-full-version";
    PermissionsPolicyFeature2["ChUaFullVersionList"] = "ch-ua-full-version-list";
    PermissionsPolicyFeature2["ChUaPlatformVersion"] = "ch-ua-platform-version";
    PermissionsPolicyFeature2["ChUaWow64"] = "ch-ua-wow64";
    PermissionsPolicyFeature2["ChViewportHeight"] = "ch-viewport-height";
    PermissionsPolicyFeature2["ChViewportWidth"] = "ch-viewport-width";
    PermissionsPolicyFeature2["ChWidth"] = "ch-width";
    PermissionsPolicyFeature2["ClipboardRead"] = "clipboard-read";
    PermissionsPolicyFeature2["ClipboardWrite"] = "clipboard-write";
    PermissionsPolicyFeature2["ComputePressure"] = "compute-pressure";
    PermissionsPolicyFeature2["ControlledFrame"] = "controlled-frame";
    PermissionsPolicyFeature2["CrossOriginIsolated"] = "cross-origin-isolated";
    PermissionsPolicyFeature2["DeferredFetch"] = "deferred-fetch";
    PermissionsPolicyFeature2["DeferredFetchMinimal"] = "deferred-fetch-minimal";
    PermissionsPolicyFeature2["DeviceAttributes"] = "device-attributes";
    PermissionsPolicyFeature2["DigitalCredentialsCreate"] = "digital-credentials-create";
    PermissionsPolicyFeature2["DigitalCredentialsGet"] = "digital-credentials-get";
    PermissionsPolicyFeature2["DirectSockets"] = "direct-sockets";
    PermissionsPolicyFeature2["DirectSocketsMulticast"] = "direct-sockets-multicast";
    PermissionsPolicyFeature2["DisplayCapture"] = "display-capture";
    PermissionsPolicyFeature2["DocumentDomain"] = "document-domain";
    PermissionsPolicyFeature2["EncryptedMedia"] = "encrypted-media";
    PermissionsPolicyFeature2["ExecutionWhileOutOfViewport"] = "execution-while-out-of-viewport";
    PermissionsPolicyFeature2["ExecutionWhileNotRendered"] = "execution-while-not-rendered";
    PermissionsPolicyFeature2["FocusWithoutUserActivation"] = "focus-without-user-activation";
    PermissionsPolicyFeature2["Fullscreen"] = "fullscreen";
    PermissionsPolicyFeature2["Frobulate"] = "frobulate";
    PermissionsPolicyFeature2["Gamepad"] = "gamepad";
    PermissionsPolicyFeature2["Geolocation"] = "geolocation";
    PermissionsPolicyFeature2["Gyroscope"] = "gyroscope";
    PermissionsPolicyFeature2["Haptics"] = "haptics";
    PermissionsPolicyFeature2["Hid"] = "hid";
    PermissionsPolicyFeature2["IdentityCredentialsGet"] = "identity-credentials-get";
    PermissionsPolicyFeature2["IdleDetection"] = "idle-detection";
    PermissionsPolicyFeature2["InterestCohort"] = "interest-cohort";
    PermissionsPolicyFeature2["KeyboardMap"] = "keyboard-map";
    PermissionsPolicyFeature2["LanguageDetector"] = "language-detector";
    PermissionsPolicyFeature2["LanguageModel"] = "language-model";
    PermissionsPolicyFeature2["LocalFonts"] = "local-fonts";
    PermissionsPolicyFeature2["LocalNetwork"] = "local-network";
    PermissionsPolicyFeature2["LocalNetworkAccess"] = "local-network-access";
    PermissionsPolicyFeature2["LoopbackNetwork"] = "loopback-network";
    PermissionsPolicyFeature2["Magnetometer"] = "magnetometer";
    PermissionsPolicyFeature2["ManualText"] = "manual-text";
    PermissionsPolicyFeature2["MediaPlaybackWhileNotVisible"] = "media-playback-while-not-visible";
    PermissionsPolicyFeature2["Microphone"] = "microphone";
    PermissionsPolicyFeature2["Midi"] = "midi";
    PermissionsPolicyFeature2["OnDeviceSpeechRecognition"] = "on-device-speech-recognition";
    PermissionsPolicyFeature2["OtpCredentials"] = "otp-credentials";
    PermissionsPolicyFeature2["Payment"] = "payment";
    PermissionsPolicyFeature2["PictureInPicture"] = "picture-in-picture";
    PermissionsPolicyFeature2["PrivateStateTokenIssuance"] = "private-state-token-issuance";
    PermissionsPolicyFeature2["PrivateStateTokenRedemption"] = "private-state-token-redemption";
    PermissionsPolicyFeature2["PublickeyCredentialsCreate"] = "publickey-credentials-create";
    PermissionsPolicyFeature2["PublickeyCredentialsGet"] = "publickey-credentials-get";
    PermissionsPolicyFeature2["Rewriter"] = "rewriter";
    PermissionsPolicyFeature2["ScreenWakeLock"] = "screen-wake-lock";
    PermissionsPolicyFeature2["Serial"] = "serial";
    PermissionsPolicyFeature2["SharedStorage"] = "shared-storage";
    PermissionsPolicyFeature2["SharedStorageSelectUrl"] = "shared-storage-select-url";
    PermissionsPolicyFeature2["SmartCard"] = "smart-card";
    PermissionsPolicyFeature2["SpeakerSelection"] = "speaker-selection";
    PermissionsPolicyFeature2["StorageAccess"] = "storage-access";
    PermissionsPolicyFeature2["SubApps"] = "sub-apps";
    PermissionsPolicyFeature2["Summarizer"] = "summarizer";
    PermissionsPolicyFeature2["SyncXhr"] = "sync-xhr";
    PermissionsPolicyFeature2["Tools"] = "tools";
    PermissionsPolicyFeature2["Translator"] = "translator";
    PermissionsPolicyFeature2["Unload"] = "unload";
    PermissionsPolicyFeature2["Usb"] = "usb";
    PermissionsPolicyFeature2["UsbUnrestricted"] = "usb-unrestricted";
    PermissionsPolicyFeature2["VerticalScroll"] = "vertical-scroll";
    PermissionsPolicyFeature2["WebAppInstallation"] = "web-app-installation";
    PermissionsPolicyFeature2["Webnn"] = "webnn";
    PermissionsPolicyFeature2["WebPrinting"] = "web-printing";
    PermissionsPolicyFeature2["WebShare"] = "web-share";
    PermissionsPolicyFeature2["WindowManagement"] = "window-management";
    PermissionsPolicyFeature2["Writer"] = "writer";
    PermissionsPolicyFeature2["XrSpatialTracking"] = "xr-spatial-tracking";
  })(PermissionsPolicyFeature = Page2.PermissionsPolicyFeature || (Page2.PermissionsPolicyFeature = {}));
  let PermissionsPolicyBlockReason;
  ((PermissionsPolicyBlockReason2) => {
    PermissionsPolicyBlockReason2["Header"] = "Header";
    PermissionsPolicyBlockReason2["IframeAttribute"] = "IframeAttribute";
    PermissionsPolicyBlockReason2["InFencedFrameTree"] = "InFencedFrameTree";
    PermissionsPolicyBlockReason2["InIsolatedApp"] = "InIsolatedApp";
  })(PermissionsPolicyBlockReason = Page2.PermissionsPolicyBlockReason || (Page2.PermissionsPolicyBlockReason = {}));
  let OriginTrialTokenStatus;
  ((OriginTrialTokenStatus2) => {
    OriginTrialTokenStatus2["Success"] = "Success";
    OriginTrialTokenStatus2["NotSupported"] = "NotSupported";
    OriginTrialTokenStatus2["Insecure"] = "Insecure";
    OriginTrialTokenStatus2["Expired"] = "Expired";
    OriginTrialTokenStatus2["WrongOrigin"] = "WrongOrigin";
    OriginTrialTokenStatus2["InvalidSignature"] = "InvalidSignature";
    OriginTrialTokenStatus2["Malformed"] = "Malformed";
    OriginTrialTokenStatus2["WrongVersion"] = "WrongVersion";
    OriginTrialTokenStatus2["FeatureDisabled"] = "FeatureDisabled";
    OriginTrialTokenStatus2["TokenDisabled"] = "TokenDisabled";
    OriginTrialTokenStatus2["FeatureDisabledForUser"] = "FeatureDisabledForUser";
    OriginTrialTokenStatus2["UnknownTrial"] = "UnknownTrial";
  })(OriginTrialTokenStatus = Page2.OriginTrialTokenStatus || (Page2.OriginTrialTokenStatus = {}));
  let OriginTrialStatus;
  ((OriginTrialStatus2) => {
    OriginTrialStatus2["Enabled"] = "Enabled";
    OriginTrialStatus2["ValidTokenNotProvided"] = "ValidTokenNotProvided";
    OriginTrialStatus2["OSNotSupported"] = "OSNotSupported";
    OriginTrialStatus2["TrialNotAllowed"] = "TrialNotAllowed";
  })(OriginTrialStatus = Page2.OriginTrialStatus || (Page2.OriginTrialStatus = {}));
  let OriginTrialUsageRestriction;
  ((OriginTrialUsageRestriction2) => {
    OriginTrialUsageRestriction2["None"] = "None";
    OriginTrialUsageRestriction2["Subset"] = "Subset";
  })(OriginTrialUsageRestriction = Page2.OriginTrialUsageRestriction || (Page2.OriginTrialUsageRestriction = {}));
  let TransitionType;
  ((TransitionType2) => {
    TransitionType2["Link"] = "link";
    TransitionType2["Typed"] = "typed";
    TransitionType2["Address_bar"] = "address_bar";
    TransitionType2["Auto_bookmark"] = "auto_bookmark";
    TransitionType2["Auto_subframe"] = "auto_subframe";
    TransitionType2["Manual_subframe"] = "manual_subframe";
    TransitionType2["Generated"] = "generated";
    TransitionType2["Auto_toplevel"] = "auto_toplevel";
    TransitionType2["Form_submit"] = "form_submit";
    TransitionType2["Reload"] = "reload";
    TransitionType2["Keyword"] = "keyword";
    TransitionType2["Keyword_generated"] = "keyword_generated";
    TransitionType2["Other"] = "other";
  })(TransitionType = Page2.TransitionType || (Page2.TransitionType = {}));
  let DialogType;
  ((DialogType2) => {
    DialogType2["Alert"] = "alert";
    DialogType2["Confirm"] = "confirm";
    DialogType2["Prompt"] = "prompt";
    DialogType2["Beforeunload"] = "beforeunload";
  })(DialogType = Page2.DialogType || (Page2.DialogType = {}));
  let ClientNavigationReason;
  ((ClientNavigationReason2) => {
    ClientNavigationReason2["AnchorClick"] = "anchorClick";
    ClientNavigationReason2["FormSubmissionGet"] = "formSubmissionGet";
    ClientNavigationReason2["FormSubmissionPost"] = "formSubmissionPost";
    ClientNavigationReason2["HttpHeaderRefresh"] = "httpHeaderRefresh";
    ClientNavigationReason2["InitialFrameNavigation"] = "initialFrameNavigation";
    ClientNavigationReason2["MetaTagRefresh"] = "metaTagRefresh";
    ClientNavigationReason2["Other"] = "other";
    ClientNavigationReason2["PageBlockInterstitial"] = "pageBlockInterstitial";
    ClientNavigationReason2["Reload"] = "reload";
    ClientNavigationReason2["ScriptInitiated"] = "scriptInitiated";
  })(ClientNavigationReason = Page2.ClientNavigationReason || (Page2.ClientNavigationReason = {}));
  let ClientNavigationDisposition;
  ((ClientNavigationDisposition2) => {
    ClientNavigationDisposition2["CurrentTab"] = "currentTab";
    ClientNavigationDisposition2["NewTab"] = "newTab";
    ClientNavigationDisposition2["NewWindow"] = "newWindow";
    ClientNavigationDisposition2["Download"] = "download";
  })(ClientNavigationDisposition = Page2.ClientNavigationDisposition || (Page2.ClientNavigationDisposition = {}));
  let ReferrerPolicy;
  ((ReferrerPolicy2) => {
    ReferrerPolicy2["NoReferrer"] = "noReferrer";
    ReferrerPolicy2["NoReferrerWhenDowngrade"] = "noReferrerWhenDowngrade";
    ReferrerPolicy2["Origin"] = "origin";
    ReferrerPolicy2["OriginWhenCrossOrigin"] = "originWhenCrossOrigin";
    ReferrerPolicy2["SameOrigin"] = "sameOrigin";
    ReferrerPolicy2["StrictOrigin"] = "strictOrigin";
    ReferrerPolicy2["StrictOriginWhenCrossOrigin"] = "strictOriginWhenCrossOrigin";
    ReferrerPolicy2["UnsafeUrl"] = "unsafeUrl";
  })(ReferrerPolicy = Page2.ReferrerPolicy || (Page2.ReferrerPolicy = {}));
  let NavigationType;
  ((NavigationType2) => {
    NavigationType2["Navigation"] = "Navigation";
    NavigationType2["BackForwardCacheRestore"] = "BackForwardCacheRestore";
  })(NavigationType = Page2.NavigationType || (Page2.NavigationType = {}));
  let BackForwardCacheNotRestoredReason;
  ((BackForwardCacheNotRestoredReason2) => {
    BackForwardCacheNotRestoredReason2["NotPrimaryMainFrame"] = "NotPrimaryMainFrame";
    BackForwardCacheNotRestoredReason2["BackForwardCacheDisabled"] = "BackForwardCacheDisabled";
    BackForwardCacheNotRestoredReason2["RelatedActiveContentsExist"] = "RelatedActiveContentsExist";
    BackForwardCacheNotRestoredReason2["HTTPStatusNotOK"] = "HTTPStatusNotOK";
    BackForwardCacheNotRestoredReason2["SchemeNotHTTPOrHTTPS"] = "SchemeNotHTTPOrHTTPS";
    BackForwardCacheNotRestoredReason2["Loading"] = "Loading";
    BackForwardCacheNotRestoredReason2["WasGrantedMediaAccess"] = "WasGrantedMediaAccess";
    BackForwardCacheNotRestoredReason2["DisableForRenderFrameHostCalled"] = "DisableForRenderFrameHostCalled";
    BackForwardCacheNotRestoredReason2["DomainNotAllowed"] = "DomainNotAllowed";
    BackForwardCacheNotRestoredReason2["HTTPMethodNotGET"] = "HTTPMethodNotGET";
    BackForwardCacheNotRestoredReason2["SubframeIsNavigating"] = "SubframeIsNavigating";
    BackForwardCacheNotRestoredReason2["Timeout"] = "Timeout";
    BackForwardCacheNotRestoredReason2["CacheLimit"] = "CacheLimit";
    BackForwardCacheNotRestoredReason2["JavaScriptExecution"] = "JavaScriptExecution";
    BackForwardCacheNotRestoredReason2["RendererProcessKilled"] = "RendererProcessKilled";
    BackForwardCacheNotRestoredReason2["RendererProcessCrashed"] = "RendererProcessCrashed";
    BackForwardCacheNotRestoredReason2["SchedulerTrackedFeatureUsed"] = "SchedulerTrackedFeatureUsed";
    BackForwardCacheNotRestoredReason2["ConflictingBrowsingInstance"] = "ConflictingBrowsingInstance";
    BackForwardCacheNotRestoredReason2["CacheFlushed"] = "CacheFlushed";
    BackForwardCacheNotRestoredReason2["ServiceWorkerVersionActivation"] = "ServiceWorkerVersionActivation";
    BackForwardCacheNotRestoredReason2["SessionRestored"] = "SessionRestored";
    BackForwardCacheNotRestoredReason2["ServiceWorkerPostMessage"] = "ServiceWorkerPostMessage";
    BackForwardCacheNotRestoredReason2["EnteredBackForwardCacheBeforeServiceWorkerHostAdded"] = "EnteredBackForwardCacheBeforeServiceWorkerHostAdded";
    BackForwardCacheNotRestoredReason2["RenderFrameHostReused_SameSite"] = "RenderFrameHostReused_SameSite";
    BackForwardCacheNotRestoredReason2["RenderFrameHostReused_CrossSite"] = "RenderFrameHostReused_CrossSite";
    BackForwardCacheNotRestoredReason2["ServiceWorkerClaim"] = "ServiceWorkerClaim";
    BackForwardCacheNotRestoredReason2["IgnoreEventAndEvict"] = "IgnoreEventAndEvict";
    BackForwardCacheNotRestoredReason2["HaveInnerContents"] = "HaveInnerContents";
    BackForwardCacheNotRestoredReason2["TimeoutPuttingInCache"] = "TimeoutPuttingInCache";
    BackForwardCacheNotRestoredReason2["BackForwardCacheDisabledByLowMemory"] = "BackForwardCacheDisabledByLowMemory";
    BackForwardCacheNotRestoredReason2["BackForwardCacheDisabledByCommandLine"] = "BackForwardCacheDisabledByCommandLine";
    BackForwardCacheNotRestoredReason2["NetworkRequestDatAPIpeDrainedAsBytesConsumer"] = "NetworkRequestDatapipeDrainedAsBytesConsumer";
    BackForwardCacheNotRestoredReason2["NetworkRequestRedirected"] = "NetworkRequestRedirected";
    BackForwardCacheNotRestoredReason2["NetworkRequestTimeout"] = "NetworkRequestTimeout";
    BackForwardCacheNotRestoredReason2["NetworkExceedsBufferLimit"] = "NetworkExceedsBufferLimit";
    BackForwardCacheNotRestoredReason2["NavigationCancelledWhileRestoring"] = "NavigationCancelledWhileRestoring";
    BackForwardCacheNotRestoredReason2["NotMostRecentNavigationEntry"] = "NotMostRecentNavigationEntry";
    BackForwardCacheNotRestoredReason2["BackForwardCacheDisabledForPrerender"] = "BackForwardCacheDisabledForPrerender";
    BackForwardCacheNotRestoredReason2["UserAgentOverrideDiffers"] = "UserAgentOverrideDiffers";
    BackForwardCacheNotRestoredReason2["ForegroundCacheLimit"] = "ForegroundCacheLimit";
    BackForwardCacheNotRestoredReason2["ForwardCacheDisabled"] = "ForwardCacheDisabled";
    BackForwardCacheNotRestoredReason2["BrowsingInstanceNotSwapped"] = "BrowsingInstanceNotSwapped";
    BackForwardCacheNotRestoredReason2["BackForwardCacheDisabledForDelegate"] = "BackForwardCacheDisabledForDelegate";
    BackForwardCacheNotRestoredReason2["UnloadHandlerExistsInMainFrame"] = "UnloadHandlerExistsInMainFrame";
    BackForwardCacheNotRestoredReason2["UnloadHandlerExistsInSubFrame"] = "UnloadHandlerExistsInSubFrame";
    BackForwardCacheNotRestoredReason2["ServiceWorkerUnregistration"] = "ServiceWorkerUnregistration";
    BackForwardCacheNotRestoredReason2["CacheControlNoStore"] = "CacheControlNoStore";
    BackForwardCacheNotRestoredReason2["CacheControlNoStoreCookieModified"] = "CacheControlNoStoreCookieModified";
    BackForwardCacheNotRestoredReason2["CacheControlNoStoreHTTPOnlyCookieModified"] = "CacheControlNoStoreHTTPOnlyCookieModified";
    BackForwardCacheNotRestoredReason2["NoResponseHead"] = "NoResponseHead";
    BackForwardCacheNotRestoredReason2["Unknown"] = "Unknown";
    BackForwardCacheNotRestoredReason2["ActivationNavigationsDisallowedForBug1234857"] = "ActivationNavigationsDisallowedForBug1234857";
    BackForwardCacheNotRestoredReason2["ErrorDocument"] = "ErrorDocument";
    BackForwardCacheNotRestoredReason2["FencedFramesEmbedder"] = "FencedFramesEmbedder";
    BackForwardCacheNotRestoredReason2["CookieDisabled"] = "CookieDisabled";
    BackForwardCacheNotRestoredReason2["HTTPAuthRequired"] = "HTTPAuthRequired";
    BackForwardCacheNotRestoredReason2["CookieFlushed"] = "CookieFlushed";
    BackForwardCacheNotRestoredReason2["BroadcastChannelOnMessage"] = "BroadcastChannelOnMessage";
    BackForwardCacheNotRestoredReason2["WebViewSettingsChanged"] = "WebViewSettingsChanged";
    BackForwardCacheNotRestoredReason2["WebViewJavaScriptObjectChanged"] = "WebViewJavaScriptObjectChanged";
    BackForwardCacheNotRestoredReason2["WebViewMessageListenerInjected"] = "WebViewMessageListenerInjected";
    BackForwardCacheNotRestoredReason2["WebViewSafeBrowsingAllowlistChanged"] = "WebViewSafeBrowsingAllowlistChanged";
    BackForwardCacheNotRestoredReason2["WebViewDocumentStartJavascriptChanged"] = "WebViewDocumentStartJavascriptChanged";
    BackForwardCacheNotRestoredReason2["WebSocket"] = "WebSocket";
    BackForwardCacheNotRestoredReason2["WebTransport"] = "WebTransport";
    BackForwardCacheNotRestoredReason2["WebRTC"] = "WebRTC";
    BackForwardCacheNotRestoredReason2["MainResourceHasCacheControlNoStore"] = "MainResourceHasCacheControlNoStore";
    BackForwardCacheNotRestoredReason2["MainResourceHasCacheControlNoCache"] = "MainResourceHasCacheControlNoCache";
    BackForwardCacheNotRestoredReason2["SubresourceHasCacheControlNoStore"] = "SubresourceHasCacheControlNoStore";
    BackForwardCacheNotRestoredReason2["SubresourceHasCacheControlNoCache"] = "SubresourceHasCacheControlNoCache";
    BackForwardCacheNotRestoredReason2["ContainsPlugins"] = "ContainsPlugins";
    BackForwardCacheNotRestoredReason2["DocumentLoaded"] = "DocumentLoaded";
    BackForwardCacheNotRestoredReason2["OutstandingNetworkRequestOthers"] = "OutstandingNetworkRequestOthers";
    BackForwardCacheNotRestoredReason2["RequestedMIDIPermission"] = "RequestedMIDIPermission";
    BackForwardCacheNotRestoredReason2["RequestedAudioCapturePermission"] = "RequestedAudioCapturePermission";
    BackForwardCacheNotRestoredReason2["RequestedVideoCapturePermission"] = "RequestedVideoCapturePermission";
    BackForwardCacheNotRestoredReason2["RequestedBackForwardCacheBlockedSensors"] = "RequestedBackForwardCacheBlockedSensors";
    BackForwardCacheNotRestoredReason2["RequestedBackgroundWorkPermission"] = "RequestedBackgroundWorkPermission";
    BackForwardCacheNotRestoredReason2["BroadcastChannel"] = "BroadcastChannel";
    BackForwardCacheNotRestoredReason2["WebXR"] = "WebXR";
    BackForwardCacheNotRestoredReason2["SharedWorker"] = "SharedWorker";
    BackForwardCacheNotRestoredReason2["SharedWorkerMessage"] = "SharedWorkerMessage";
    BackForwardCacheNotRestoredReason2["SharedWorkerWithNoActiveClient"] = "SharedWorkerWithNoActiveClient";
    BackForwardCacheNotRestoredReason2["WebLocks"] = "WebLocks";
    BackForwardCacheNotRestoredReason2["WebLocksContention"] = "WebLocksContention";
    BackForwardCacheNotRestoredReason2["WebHID"] = "WebHID";
    BackForwardCacheNotRestoredReason2["WebBluetooth"] = "WebBluetooth";
    BackForwardCacheNotRestoredReason2["WebShare"] = "WebShare";
    BackForwardCacheNotRestoredReason2["RequestedStorageAccessGrant"] = "RequestedStorageAccessGrant";
    BackForwardCacheNotRestoredReason2["WebNfc"] = "WebNfc";
    BackForwardCacheNotRestoredReason2["OutstandingNetworkRequestFetch"] = "OutstandingNetworkRequestFetch";
    BackForwardCacheNotRestoredReason2["OutstandingNetworkRequestXHR"] = "OutstandingNetworkRequestXHR";
    BackForwardCacheNotRestoredReason2["AppBanner"] = "AppBanner";
    BackForwardCacheNotRestoredReason2["Printing"] = "Printing";
    BackForwardCacheNotRestoredReason2["WebDatabase"] = "WebDatabase";
    BackForwardCacheNotRestoredReason2["PictureInPicture"] = "PictureInPicture";
    BackForwardCacheNotRestoredReason2["SpeechRecognizer"] = "SpeechRecognizer";
    BackForwardCacheNotRestoredReason2["IdleManager"] = "IdleManager";
    BackForwardCacheNotRestoredReason2["PaymentManager"] = "PaymentManager";
    BackForwardCacheNotRestoredReason2["SpeechSynthesis"] = "SpeechSynthesis";
    BackForwardCacheNotRestoredReason2["KeyboardLock"] = "KeyboardLock";
    BackForwardCacheNotRestoredReason2["WebOTPService"] = "WebOTPService";
    BackForwardCacheNotRestoredReason2["OutstandingNetworkRequestDirectSocket"] = "OutstandingNetworkRequestDirectSocket";
    BackForwardCacheNotRestoredReason2["InjectedJavascript"] = "InjectedJavascript";
    BackForwardCacheNotRestoredReason2["InjectedStyleSheet"] = "InjectedStyleSheet";
    BackForwardCacheNotRestoredReason2["KeepaliveRequest"] = "KeepaliveRequest";
    BackForwardCacheNotRestoredReason2["IndexedDBEvent"] = "IndexedDBEvent";
    BackForwardCacheNotRestoredReason2["Dummy"] = "Dummy";
    BackForwardCacheNotRestoredReason2["JsNetworkRequestReceivedCacheControlNoStoreResource"] = "JsNetworkRequestReceivedCacheControlNoStoreResource";
    BackForwardCacheNotRestoredReason2["WebRTCUsedWithCCNS"] = "WebRTCUsedWithCCNS";
    BackForwardCacheNotRestoredReason2["WebTransportUsedWithCCNS"] = "WebTransportUsedWithCCNS";
    BackForwardCacheNotRestoredReason2["WebSocketUsedWithCCNS"] = "WebSocketUsedWithCCNS";
    BackForwardCacheNotRestoredReason2["SmartCard"] = "SmartCard";
    BackForwardCacheNotRestoredReason2["LiveMediaStreamTrack"] = "LiveMediaStreamTrack";
    BackForwardCacheNotRestoredReason2["UnloadHandler"] = "UnloadHandler";
    BackForwardCacheNotRestoredReason2["ParserAborted"] = "ParserAborted";
    BackForwardCacheNotRestoredReason2["ContentSecurityHandler"] = "ContentSecurityHandler";
    BackForwardCacheNotRestoredReason2["ContentWebAuthenticationAPI"] = "ContentWebAuthenticationAPI";
    BackForwardCacheNotRestoredReason2["ContentFileChooser"] = "ContentFileChooser";
    BackForwardCacheNotRestoredReason2["ContentSerial"] = "ContentSerial";
    BackForwardCacheNotRestoredReason2["ContentFileSystemAccess"] = "ContentFileSystemAccess";
    BackForwardCacheNotRestoredReason2["ContentMediaDevicesDispatcherHost"] = "ContentMediaDevicesDispatcherHost";
    BackForwardCacheNotRestoredReason2["ContentWebBluetooth"] = "ContentWebBluetooth";
    BackForwardCacheNotRestoredReason2["ContentWebUSB"] = "ContentWebUSB";
    BackForwardCacheNotRestoredReason2["ContentMediaSessionService"] = "ContentMediaSessionService";
    BackForwardCacheNotRestoredReason2["ContentScreenReader"] = "ContentScreenReader";
    BackForwardCacheNotRestoredReason2["ContentDiscarded"] = "ContentDiscarded";
    BackForwardCacheNotRestoredReason2["EmbedderPopupBlockerTabHelper"] = "EmbedderPopupBlockerTabHelper";
    BackForwardCacheNotRestoredReason2["EmbedderSafeBrowsingTriggeredPopupBlocker"] = "EmbedderSafeBrowsingTriggeredPopupBlocker";
    BackForwardCacheNotRestoredReason2["EmbedderSafeBrowsingThreatDetails"] = "EmbedderSafeBrowsingThreatDetails";
    BackForwardCacheNotRestoredReason2["EmbedderAppBannerManager"] = "EmbedderAppBannerManager";
    BackForwardCacheNotRestoredReason2["EmbedderDomDistillerViewerSource"] = "EmbedderDomDistillerViewerSource";
    BackForwardCacheNotRestoredReason2["EmbedderDomDistillerSelfDeletingRequestDelegate"] = "EmbedderDomDistillerSelfDeletingRequestDelegate";
    BackForwardCacheNotRestoredReason2["EmbedderOomInterventionTabHelper"] = "EmbedderOomInterventionTabHelper";
    BackForwardCacheNotRestoredReason2["EmbedderOfflinePage"] = "EmbedderOfflinePage";
    BackForwardCacheNotRestoredReason2["EmbedderChromePasswordManagerClientBindCredentialManager"] = "EmbedderChromePasswordManagerClientBindCredentialManager";
    BackForwardCacheNotRestoredReason2["EmbedderPermissionRequestManager"] = "EmbedderPermissionRequestManager";
    BackForwardCacheNotRestoredReason2["EmbedderModalDialog"] = "EmbedderModalDialog";
    BackForwardCacheNotRestoredReason2["EmbedderExtensions"] = "EmbedderExtensions";
    BackForwardCacheNotRestoredReason2["EmbedderExtensionMessaging"] = "EmbedderExtensionMessaging";
    BackForwardCacheNotRestoredReason2["EmbedderExtensionMessagingForOpenPort"] = "EmbedderExtensionMessagingForOpenPort";
    BackForwardCacheNotRestoredReason2["EmbedderExtensionSentMessageToCachedFrame"] = "EmbedderExtensionSentMessageToCachedFrame";
    BackForwardCacheNotRestoredReason2["EmbedderExtensionFrame"] = "EmbedderExtensionFrame";
    BackForwardCacheNotRestoredReason2["EmbedderPrivilegedWebContents"] = "EmbedderPrivilegedWebContents";
    BackForwardCacheNotRestoredReason2["RequestedByWebViewClient"] = "RequestedByWebViewClient";
    BackForwardCacheNotRestoredReason2["PostMessageByWebViewClient"] = "PostMessageByWebViewClient";
    BackForwardCacheNotRestoredReason2["CacheControlNoStoreDeviceBoundSessionTerminated"] = "CacheControlNoStoreDeviceBoundSessionTerminated";
    BackForwardCacheNotRestoredReason2["CacheLimitPrunedOnModerateMemoryPressure"] = "CacheLimitPrunedOnModerateMemoryPressure";
    BackForwardCacheNotRestoredReason2["CacheLimitPrunedOnCriticalMemoryPressure"] = "CacheLimitPrunedOnCriticalMemoryPressure";
  })(BackForwardCacheNotRestoredReason = Page2.BackForwardCacheNotRestoredReason || (Page2.BackForwardCacheNotRestoredReason = {}));
  let BackForwardCacheNotRestoredReasonType;
  ((BackForwardCacheNotRestoredReasonType2) => {
    BackForwardCacheNotRestoredReasonType2["SupportPending"] = "SupportPending";
    BackForwardCacheNotRestoredReasonType2["PageSupportNeeded"] = "PageSupportNeeded";
    BackForwardCacheNotRestoredReasonType2["Circumstantial"] = "Circumstantial";
  })(BackForwardCacheNotRestoredReasonType = Page2.BackForwardCacheNotRestoredReasonType || (Page2.BackForwardCacheNotRestoredReasonType = {}));
  let CaptureScreenshotRequestFormat;
  ((CaptureScreenshotRequestFormat2) => {
    CaptureScreenshotRequestFormat2["Jpeg"] = "jpeg";
    CaptureScreenshotRequestFormat2["Png"] = "png";
    CaptureScreenshotRequestFormat2["Webp"] = "webp";
  })(CaptureScreenshotRequestFormat = Page2.CaptureScreenshotRequestFormat || (Page2.CaptureScreenshotRequestFormat = {}));
  let CaptureSnapshotRequestFormat;
  ((CaptureSnapshotRequestFormat2) => {
    CaptureSnapshotRequestFormat2["MHTML"] = "mhtml";
  })(CaptureSnapshotRequestFormat = Page2.CaptureSnapshotRequestFormat || (Page2.CaptureSnapshotRequestFormat = {}));
  let PrintToPDFRequestTransferMode;
  ((PrintToPDFRequestTransferMode2) => {
    PrintToPDFRequestTransferMode2["ReturnAsBase64"] = "ReturnAsBase64";
    PrintToPDFRequestTransferMode2["ReturnAsStream"] = "ReturnAsStream";
  })(PrintToPDFRequestTransferMode = Page2.PrintToPDFRequestTransferMode || (Page2.PrintToPDFRequestTransferMode = {}));
  let SetDownloadBehaviorRequestBehavior;
  ((SetDownloadBehaviorRequestBehavior2) => {
    SetDownloadBehaviorRequestBehavior2["Deny"] = "deny";
    SetDownloadBehaviorRequestBehavior2["Allow"] = "allow";
    SetDownloadBehaviorRequestBehavior2["Default"] = "default";
  })(SetDownloadBehaviorRequestBehavior = Page2.SetDownloadBehaviorRequestBehavior || (Page2.SetDownloadBehaviorRequestBehavior = {}));
  let SetTouchEmulationEnabledRequestConfiguration;
  ((SetTouchEmulationEnabledRequestConfiguration2) => {
    SetTouchEmulationEnabledRequestConfiguration2["Mobile"] = "mobile";
    SetTouchEmulationEnabledRequestConfiguration2["Desktop"] = "desktop";
  })(SetTouchEmulationEnabledRequestConfiguration = Page2.SetTouchEmulationEnabledRequestConfiguration || (Page2.SetTouchEmulationEnabledRequestConfiguration = {}));
  let StartScreencastRequestFormat;
  ((StartScreencastRequestFormat2) => {
    StartScreencastRequestFormat2["Jpeg"] = "jpeg";
    StartScreencastRequestFormat2["Png"] = "png";
  })(StartScreencastRequestFormat = Page2.StartScreencastRequestFormat || (Page2.StartScreencastRequestFormat = {}));
  let SetWebLifecycleStateRequestState;
  ((SetWebLifecycleStateRequestState2) => {
    SetWebLifecycleStateRequestState2["Frozen"] = "frozen";
    SetWebLifecycleStateRequestState2["Active"] = "active";
  })(SetWebLifecycleStateRequestState = Page2.SetWebLifecycleStateRequestState || (Page2.SetWebLifecycleStateRequestState = {}));
  let SetSPCTransactionModeRequestMode;
  ((SetSPCTransactionModeRequestMode2) => {
    SetSPCTransactionModeRequestMode2["None"] = "none";
    SetSPCTransactionModeRequestMode2["AutoAccept"] = "autoAccept";
    SetSPCTransactionModeRequestMode2["AutoChooseToAuthAnotherWay"] = "autoChooseToAuthAnotherWay";
    SetSPCTransactionModeRequestMode2["AutoReject"] = "autoReject";
    SetSPCTransactionModeRequestMode2["AutoOptOut"] = "autoOptOut";
  })(SetSPCTransactionModeRequestMode = Page2.SetSPCTransactionModeRequestMode || (Page2.SetSPCTransactionModeRequestMode = {}));
  let SetRPHRegistrationModeRequestMode;
  ((SetRPHRegistrationModeRequestMode2) => {
    SetRPHRegistrationModeRequestMode2["None"] = "none";
    SetRPHRegistrationModeRequestMode2["AutoAccept"] = "autoAccept";
    SetRPHRegistrationModeRequestMode2["AutoReject"] = "autoReject";
  })(SetRPHRegistrationModeRequestMode = Page2.SetRPHRegistrationModeRequestMode || (Page2.SetRPHRegistrationModeRequestMode = {}));
  let FileChooserOpenedEventMode;
  ((FileChooserOpenedEventMode2) => {
    FileChooserOpenedEventMode2["SelectSingle"] = "selectSingle";
    FileChooserOpenedEventMode2["SelectMultiple"] = "selectMultiple";
  })(FileChooserOpenedEventMode = Page2.FileChooserOpenedEventMode || (Page2.FileChooserOpenedEventMode = {}));
  let FrameDetachedEventReason;
  ((FrameDetachedEventReason2) => {
    FrameDetachedEventReason2["Remove"] = "remove";
    FrameDetachedEventReason2["Swap"] = "swap";
  })(FrameDetachedEventReason = Page2.FrameDetachedEventReason || (Page2.FrameDetachedEventReason = {}));
  let FrameStartedNavigatingEventNavigationType;
  ((FrameStartedNavigatingEventNavigationType2) => {
    FrameStartedNavigatingEventNavigationType2["Reload"] = "reload";
    FrameStartedNavigatingEventNavigationType2["ReloadBypassingCache"] = "reloadBypassingCache";
    FrameStartedNavigatingEventNavigationType2["Restore"] = "restore";
    FrameStartedNavigatingEventNavigationType2["RestoreWithPost"] = "restoreWithPost";
    FrameStartedNavigatingEventNavigationType2["HistorySameDocument"] = "historySameDocument";
    FrameStartedNavigatingEventNavigationType2["HistoryDifferentDocument"] = "historyDifferentDocument";
    FrameStartedNavigatingEventNavigationType2["SameDocument"] = "sameDocument";
    FrameStartedNavigatingEventNavigationType2["DifferentDocument"] = "differentDocument";
  })(FrameStartedNavigatingEventNavigationType = Page2.FrameStartedNavigatingEventNavigationType || (Page2.FrameStartedNavigatingEventNavigationType = {}));
  let DownloadProgressEventState;
  ((DownloadProgressEventState2) => {
    DownloadProgressEventState2["InProgress"] = "inProgress";
    DownloadProgressEventState2["Completed"] = "completed";
    DownloadProgressEventState2["Canceled"] = "canceled";
  })(DownloadProgressEventState = Page2.DownloadProgressEventState || (Page2.DownloadProgressEventState = {}));
  let NavigatedWithinDocumentEventNavigationType;
  ((NavigatedWithinDocumentEventNavigationType2) => {
    NavigatedWithinDocumentEventNavigationType2["Fragment"] = "fragment";
    NavigatedWithinDocumentEventNavigationType2["HistoryAPI"] = "historyApi";
    NavigatedWithinDocumentEventNavigationType2["Other"] = "other";
  })(NavigatedWithinDocumentEventNavigationType = Page2.NavigatedWithinDocumentEventNavigationType || (Page2.NavigatedWithinDocumentEventNavigationType = {}));
})(Page || (Page = {}));
var Performance;
((Performance2) => {
  let EnableRequestTimeDomain;
  ((EnableRequestTimeDomain2) => {
    EnableRequestTimeDomain2["TimeTicks"] = "timeTicks";
    EnableRequestTimeDomain2["ThreadTicks"] = "threadTicks";
  })(EnableRequestTimeDomain = Performance2.EnableRequestTimeDomain || (Performance2.EnableRequestTimeDomain = {}));
  let SetTimeDomainRequestTimeDomain;
  ((SetTimeDomainRequestTimeDomain2) => {
    SetTimeDomainRequestTimeDomain2["TimeTicks"] = "timeTicks";
    SetTimeDomainRequestTimeDomain2["ThreadTicks"] = "threadTicks";
  })(SetTimeDomainRequestTimeDomain = Performance2.SetTimeDomainRequestTimeDomain || (Performance2.SetTimeDomainRequestTimeDomain = {}));
})(Performance || (Performance = {}));
var Preload;
((Preload2) => {
  let RuleSetErrorType;
  ((RuleSetErrorType2) => {
    RuleSetErrorType2["SourceIsNotJsonObject"] = "SourceIsNotJsonObject";
    RuleSetErrorType2["InvalidRulesSkipped"] = "InvalidRulesSkipped";
    RuleSetErrorType2["InvalidRulesetLevelTag"] = "InvalidRulesetLevelTag";
  })(RuleSetErrorType = Preload2.RuleSetErrorType || (Preload2.RuleSetErrorType = {}));
  let SpeculationAction;
  ((SpeculationAction2) => {
    SpeculationAction2["Prefetch"] = "Prefetch";
    SpeculationAction2["Prerender"] = "Prerender";
    SpeculationAction2["PrerenderUntilScript"] = "PrerenderUntilScript";
  })(SpeculationAction = Preload2.SpeculationAction || (Preload2.SpeculationAction = {}));
  let SpeculationTargetHint;
  ((SpeculationTargetHint2) => {
    SpeculationTargetHint2["Blank"] = "Blank";
    SpeculationTargetHint2["Self"] = "Self";
  })(SpeculationTargetHint = Preload2.SpeculationTargetHint || (Preload2.SpeculationTargetHint = {}));
  let PrerenderFinalStatus;
  ((PrerenderFinalStatus2) => {
    PrerenderFinalStatus2["Activated"] = "Activated";
    PrerenderFinalStatus2["Destroyed"] = "Destroyed";
    PrerenderFinalStatus2["LowEndDevice"] = "LowEndDevice";
    PrerenderFinalStatus2["InvalidSchemeRedirect"] = "InvalidSchemeRedirect";
    PrerenderFinalStatus2["InvalidSchemeNavigation"] = "InvalidSchemeNavigation";
    PrerenderFinalStatus2["NavigationRequestBlockedByCsp"] = "NavigationRequestBlockedByCsp";
    PrerenderFinalStatus2["MojoBinderPolicy"] = "MojoBinderPolicy";
    PrerenderFinalStatus2["RendererProcessCrashed"] = "RendererProcessCrashed";
    PrerenderFinalStatus2["RendererProcessKilled"] = "RendererProcessKilled";
    PrerenderFinalStatus2["Download"] = "Download";
    PrerenderFinalStatus2["TriggerDestroyed"] = "TriggerDestroyed";
    PrerenderFinalStatus2["NavigationNotCommitted"] = "NavigationNotCommitted";
    PrerenderFinalStatus2["NavigationBadHttpStatus"] = "NavigationBadHttpStatus";
    PrerenderFinalStatus2["ClientCertRequested"] = "ClientCertRequested";
    PrerenderFinalStatus2["NavigationRequestNetworkError"] = "NavigationRequestNetworkError";
    PrerenderFinalStatus2["CancelAllHostsForTesting"] = "CancelAllHostsForTesting";
    PrerenderFinalStatus2["DidFailLoad"] = "DidFailLoad";
    PrerenderFinalStatus2["Stop"] = "Stop";
    PrerenderFinalStatus2["SslCertificateError"] = "SslCertificateError";
    PrerenderFinalStatus2["LoginAuthRequested"] = "LoginAuthRequested";
    PrerenderFinalStatus2["UaChangeRequiresReload"] = "UaChangeRequiresReload";
    PrerenderFinalStatus2["BlockedByClient"] = "BlockedByClient";
    PrerenderFinalStatus2["AudioOutputDeviceRequested"] = "AudioOutputDeviceRequested";
    PrerenderFinalStatus2["MixedContent"] = "MixedContent";
    PrerenderFinalStatus2["TriggerBackgrounded"] = "TriggerBackgrounded";
    PrerenderFinalStatus2["MemoryLimitExceeded"] = "MemoryLimitExceeded";
    PrerenderFinalStatus2["DataSaverEnabled"] = "DataSaverEnabled";
    PrerenderFinalStatus2["TriggerUrlHasEffectiveUrl"] = "TriggerUrlHasEffectiveUrl";
    PrerenderFinalStatus2["ActivatedBeforeStarted"] = "ActivatedBeforeStarted";
    PrerenderFinalStatus2["InactivePageRestriction"] = "InactivePageRestriction";
    PrerenderFinalStatus2["StartFailed"] = "StartFailed";
    PrerenderFinalStatus2["TimeoutBackgrounded"] = "TimeoutBackgrounded";
    PrerenderFinalStatus2["CrossSiteRedirectInInitialNavigation"] = "CrossSiteRedirectInInitialNavigation";
    PrerenderFinalStatus2["CrossSiteNavigationInInitialNavigation"] = "CrossSiteNavigationInInitialNavigation";
    PrerenderFinalStatus2["SameSiteCrossOriginRedirectNotOptInInInitialNavigation"] = "SameSiteCrossOriginRedirectNotOptInInInitialNavigation";
    PrerenderFinalStatus2["SameSiteCrossOriginNavigationNotOptInInInitialNavigation"] = "SameSiteCrossOriginNavigationNotOptInInInitialNavigation";
    PrerenderFinalStatus2["ActivationNavigationParameterMismatch"] = "ActivationNavigationParameterMismatch";
    PrerenderFinalStatus2["ActivatedInBackground"] = "ActivatedInBackground";
    PrerenderFinalStatus2["EmbedderHostDisallowed"] = "EmbedderHostDisallowed";
    PrerenderFinalStatus2["ActivationNavigationDestroyedBeforeSuccess"] = "ActivationNavigationDestroyedBeforeSuccess";
    PrerenderFinalStatus2["TabClosedByUserGesture"] = "TabClosedByUserGesture";
    PrerenderFinalStatus2["TabClosedWithoutUserGesture"] = "TabClosedWithoutUserGesture";
    PrerenderFinalStatus2["PrimaryMainFrameRendererProcessCrashed"] = "PrimaryMainFrameRendererProcessCrashed";
    PrerenderFinalStatus2["PrimaryMainFrameRendererProcessKilled"] = "PrimaryMainFrameRendererProcessKilled";
    PrerenderFinalStatus2["ActivationFramePolicyNotCompatible"] = "ActivationFramePolicyNotCompatible";
    PrerenderFinalStatus2["PreloadingDisabled"] = "PreloadingDisabled";
    PrerenderFinalStatus2["BatterySaverEnabled"] = "BatterySaverEnabled";
    PrerenderFinalStatus2["ActivatedDuringMainFrameNavigation"] = "ActivatedDuringMainFrameNavigation";
    PrerenderFinalStatus2["PreloadingUnsupportedByWebContents"] = "PreloadingUnsupportedByWebContents";
    PrerenderFinalStatus2["CrossSiteRedirectInMainFrameNavigation"] = "CrossSiteRedirectInMainFrameNavigation";
    PrerenderFinalStatus2["CrossSiteNavigationInMainFrameNavigation"] = "CrossSiteNavigationInMainFrameNavigation";
    PrerenderFinalStatus2["SameSiteCrossOriginRedirectNotOptInInMainFrameNavigation"] = "SameSiteCrossOriginRedirectNotOptInInMainFrameNavigation";
    PrerenderFinalStatus2["SameSiteCrossOriginNavigationNotOptInInMainFrameNavigation"] = "SameSiteCrossOriginNavigationNotOptInInMainFrameNavigation";
    PrerenderFinalStatus2["MemoryPressureOnTrigger"] = "MemoryPressureOnTrigger";
    PrerenderFinalStatus2["MemoryPressureAfterTriggered"] = "MemoryPressureAfterTriggered";
    PrerenderFinalStatus2["PrerenderingDisabledByDevTools"] = "PrerenderingDisabledByDevTools";
    PrerenderFinalStatus2["SpeculationRuleRemoved"] = "SpeculationRuleRemoved";
    PrerenderFinalStatus2["ActivatedWithAuxiliaryBrowsingContexts"] = "ActivatedWithAuxiliaryBrowsingContexts";
    PrerenderFinalStatus2["MaxNumOfRunningEagerPrerendersExceeded"] = "MaxNumOfRunningEagerPrerendersExceeded";
    PrerenderFinalStatus2["MaxNumOfRunningNonEagerPrerendersExceeded"] = "MaxNumOfRunningNonEagerPrerendersExceeded";
    PrerenderFinalStatus2["MaxNumOfRunningEmbedderPrerendersExceeded"] = "MaxNumOfRunningEmbedderPrerendersExceeded";
    PrerenderFinalStatus2["PrerenderingUrlHasEffectiveUrl"] = "PrerenderingUrlHasEffectiveUrl";
    PrerenderFinalStatus2["RedirectedPrerenderingUrlHasEffectiveUrl"] = "RedirectedPrerenderingUrlHasEffectiveUrl";
    PrerenderFinalStatus2["ActivationUrlHasEffectiveUrl"] = "ActivationUrlHasEffectiveUrl";
    PrerenderFinalStatus2["JavaScriptInterfaceAdded"] = "JavaScriptInterfaceAdded";
    PrerenderFinalStatus2["JavaScriptInterfaceRemoved"] = "JavaScriptInterfaceRemoved";
    PrerenderFinalStatus2["AllPrerenderingCanceled"] = "AllPrerenderingCanceled";
    PrerenderFinalStatus2["WindowClosed"] = "WindowClosed";
    PrerenderFinalStatus2["SlowNetwork"] = "SlowNetwork";
    PrerenderFinalStatus2["OtherPrerenderedPageActivated"] = "OtherPrerenderedPageActivated";
    PrerenderFinalStatus2["V8OptimizerDisabled"] = "V8OptimizerDisabled";
    PrerenderFinalStatus2["PrerenderFailedDuringPrefetch"] = "PrerenderFailedDuringPrefetch";
    PrerenderFinalStatus2["BrowsingDataRemoved"] = "BrowsingDataRemoved";
    PrerenderFinalStatus2["PrerenderHostReused"] = "PrerenderHostReused";
    PrerenderFinalStatus2["FormSubmitWhenPrerendering"] = "FormSubmitWhenPrerendering";
    PrerenderFinalStatus2["CrossDocumentRestart"] = "CrossDocumentRestart";
  })(PrerenderFinalStatus = Preload2.PrerenderFinalStatus || (Preload2.PrerenderFinalStatus = {}));
  let PreloadingStatus;
  ((PreloadingStatus2) => {
    PreloadingStatus2["Pending"] = "Pending";
    PreloadingStatus2["Running"] = "Running";
    PreloadingStatus2["Ready"] = "Ready";
    PreloadingStatus2["Success"] = "Success";
    PreloadingStatus2["Failure"] = "Failure";
    PreloadingStatus2["NotSupported"] = "NotSupported";
  })(PreloadingStatus = Preload2.PreloadingStatus || (Preload2.PreloadingStatus = {}));
  let PrefetchStatus;
  ((PrefetchStatus2) => {
    PrefetchStatus2["PrefetchAllowed"] = "PrefetchAllowed";
    PrefetchStatus2["PrefetchFailedIneligibleRedirect"] = "PrefetchFailedIneligibleRedirect";
    PrefetchStatus2["PrefetchFailedInvalidRedirect"] = "PrefetchFailedInvalidRedirect";
    PrefetchStatus2["PrefetchFailedMIMENotSupported"] = "PrefetchFailedMIMENotSupported";
    PrefetchStatus2["PrefetchFailedNetError"] = "PrefetchFailedNetError";
    PrefetchStatus2["PrefetchFailedNon2XX"] = "PrefetchFailedNon2XX";
    PrefetchStatus2["PrefetchEvictedAfterBrowsingDataRemoved"] = "PrefetchEvictedAfterBrowsingDataRemoved";
    PrefetchStatus2["PrefetchEvictedAfterCandidateRemoved"] = "PrefetchEvictedAfterCandidateRemoved";
    PrefetchStatus2["PrefetchEvictedForNewerPrefetch"] = "PrefetchEvictedForNewerPrefetch";
    PrefetchStatus2["PrefetchHeldback"] = "PrefetchHeldback";
    PrefetchStatus2["PrefetchIneligibleRetryAfter"] = "PrefetchIneligibleRetryAfter";
    PrefetchStatus2["PrefetchIsPrivacyDecoy"] = "PrefetchIsPrivacyDecoy";
    PrefetchStatus2["PrefetchIsStale"] = "PrefetchIsStale";
    PrefetchStatus2["PrefetchNotEligibleBlockedByConnectionAllowlist"] = "PrefetchNotEligibleBlockedByConnectionAllowlist";
    PrefetchStatus2["PrefetchNotEligibleBrowserContextOffTheRecord"] = "PrefetchNotEligibleBrowserContextOffTheRecord";
    PrefetchStatus2["PrefetchNotEligibleCrossOrigin"] = "PrefetchNotEligibleCrossOrigin";
    PrefetchStatus2["PrefetchNotEligibleDataSaverEnabled"] = "PrefetchNotEligibleDataSaverEnabled";
    PrefetchStatus2["PrefetchNotEligibleExistingProxy"] = "PrefetchNotEligibleExistingProxy";
    PrefetchStatus2["PrefetchNotEligibleHostIsNonUnique"] = "PrefetchNotEligibleHostIsNonUnique";
    PrefetchStatus2["PrefetchNotEligibleNonDefaultStoragePartition"] = "PrefetchNotEligibleNonDefaultStoragePartition";
    PrefetchStatus2["PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy"] = "PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy";
    PrefetchStatus2["PrefetchNotEligibleSchemeIsNotHttps"] = "PrefetchNotEligibleSchemeIsNotHttps";
    PrefetchStatus2["PrefetchNotEligibleUserHasCookies"] = "PrefetchNotEligibleUserHasCookies";
    PrefetchStatus2["PrefetchNotEligibleUserHasServiceWorker"] = "PrefetchNotEligibleUserHasServiceWorker";
    PrefetchStatus2["PrefetchNotEligibleUserHasServiceWorkerNoFetchHandler"] = "PrefetchNotEligibleUserHasServiceWorkerNoFetchHandler";
    PrefetchStatus2["PrefetchNotEligibleRedirectFromServiceWorker"] = "PrefetchNotEligibleRedirectFromServiceWorker";
    PrefetchStatus2["PrefetchNotEligibleRedirectToServiceWorker"] = "PrefetchNotEligibleRedirectToServiceWorker";
    PrefetchStatus2["PrefetchNotEligibleBatterySaverEnabled"] = "PrefetchNotEligibleBatterySaverEnabled";
    PrefetchStatus2["PrefetchNotEligiblePreloadingDisabled"] = "PrefetchNotEligiblePreloadingDisabled";
    PrefetchStatus2["PrefetchNotFinishedInTime"] = "PrefetchNotFinishedInTime";
    PrefetchStatus2["PrefetchNotStarted"] = "PrefetchNotStarted";
    PrefetchStatus2["PrefetchNotUsedCookiesChanged"] = "PrefetchNotUsedCookiesChanged";
    PrefetchStatus2["PrefetchProxyNotAvailable"] = "PrefetchProxyNotAvailable";
    PrefetchStatus2["PrefetchResponseUsed"] = "PrefetchResponseUsed";
    PrefetchStatus2["PrefetchSuccessfulButNotUsed"] = "PrefetchSuccessfulButNotUsed";
    PrefetchStatus2["PrefetchNotUsedProbeFailed"] = "PrefetchNotUsedProbeFailed";
    PrefetchStatus2["PrefetchCancelledOnUserNavigation"] = "PrefetchCancelledOnUserNavigation";
  })(PrefetchStatus = Preload2.PrefetchStatus || (Preload2.PrefetchStatus = {}));
})(Preload || (Preload = {}));
var Security;
((Security2) => {
  let MixedContentType;
  ((MixedContentType2) => {
    MixedContentType2["Blockable"] = "blockable";
    MixedContentType2["OptionallyBlockable"] = "optionally-blockable";
    MixedContentType2["None"] = "none";
  })(MixedContentType = Security2.MixedContentType || (Security2.MixedContentType = {}));
  let SecurityState;
  ((SecurityState2) => {
    SecurityState2["Unknown"] = "unknown";
    SecurityState2["Neutral"] = "neutral";
    SecurityState2["Insecure"] = "insecure";
    SecurityState2["Secure"] = "secure";
    SecurityState2["Info"] = "info";
    SecurityState2["InsecureBroken"] = "insecure-broken";
  })(SecurityState = Security2.SecurityState || (Security2.SecurityState = {}));
  let SafetyTipStatus;
  ((SafetyTipStatus2) => {
    SafetyTipStatus2["BadReputation"] = "badReputation";
    SafetyTipStatus2["Lookalike"] = "lookalike";
  })(SafetyTipStatus = Security2.SafetyTipStatus || (Security2.SafetyTipStatus = {}));
  let CertificateErrorAction;
  ((CertificateErrorAction2) => {
    CertificateErrorAction2["Continue"] = "continue";
    CertificateErrorAction2["Cancel"] = "cancel";
  })(CertificateErrorAction = Security2.CertificateErrorAction || (Security2.CertificateErrorAction = {}));
})(Security || (Security = {}));
var ServiceWorker;
((ServiceWorker2) => {
  let ServiceWorkerVersionRunningStatus;
  ((ServiceWorkerVersionRunningStatus2) => {
    ServiceWorkerVersionRunningStatus2["Stopped"] = "stopped";
    ServiceWorkerVersionRunningStatus2["Starting"] = "starting";
    ServiceWorkerVersionRunningStatus2["Running"] = "running";
    ServiceWorkerVersionRunningStatus2["Stopping"] = "stopping";
  })(ServiceWorkerVersionRunningStatus = ServiceWorker2.ServiceWorkerVersionRunningStatus || (ServiceWorker2.ServiceWorkerVersionRunningStatus = {}));
  let ServiceWorkerVersionStatus;
  ((ServiceWorkerVersionStatus2) => {
    ServiceWorkerVersionStatus2["New"] = "new";
    ServiceWorkerVersionStatus2["Installing"] = "installing";
    ServiceWorkerVersionStatus2["Installed"] = "installed";
    ServiceWorkerVersionStatus2["Activating"] = "activating";
    ServiceWorkerVersionStatus2["Activated"] = "activated";
    ServiceWorkerVersionStatus2["Redundant"] = "redundant";
  })(ServiceWorkerVersionStatus = ServiceWorker2.ServiceWorkerVersionStatus || (ServiceWorker2.ServiceWorkerVersionStatus = {}));
  let ServiceWorkerRouterSourceType;
  ((ServiceWorkerRouterSourceType2) => {
    ServiceWorkerRouterSourceType2["Cache"] = "cache";
    ServiceWorkerRouterSourceType2["FetchEvent"] = "fetchEvent";
    ServiceWorkerRouterSourceType2["Network"] = "network";
    ServiceWorkerRouterSourceType2["RaceNetworkAndFetchHandler"] = "raceNetworkAndFetchHandler";
    ServiceWorkerRouterSourceType2["RaceNetworkAndCache"] = "raceNetworkAndCache";
    ServiceWorkerRouterSourceType2["SourceDict"] = "sourceDict";
  })(ServiceWorkerRouterSourceType = ServiceWorker2.ServiceWorkerRouterSourceType || (ServiceWorker2.ServiceWorkerRouterSourceType = {}));
})(ServiceWorker || (ServiceWorker = {}));
var SmartCardEmulation;
((SmartCardEmulation2) => {
  let ResultCode;
  ((ResultCode2) => {
    ResultCode2["Success"] = "success";
    ResultCode2["RemovedCard"] = "removed-card";
    ResultCode2["ResetCard"] = "reset-card";
    ResultCode2["UnpoweredCard"] = "unpowered-card";
    ResultCode2["UnresponsiveCard"] = "unresponsive-card";
    ResultCode2["UnsupportedCard"] = "unsupported-card";
    ResultCode2["ReaderUnavailable"] = "reader-unavailable";
    ResultCode2["SharingViolation"] = "sharing-violation";
    ResultCode2["NotTransacted"] = "not-transacted";
    ResultCode2["NoSmartcard"] = "no-smartcard";
    ResultCode2["ProtoMismatch"] = "proto-mismatch";
    ResultCode2["SystemCancelled"] = "system-cancelled";
    ResultCode2["NotReady"] = "not-ready";
    ResultCode2["Cancelled"] = "cancelled";
    ResultCode2["InsufficientBuffer"] = "insufficient-buffer";
    ResultCode2["InvalidHandle"] = "invalid-handle";
    ResultCode2["InvalidParameter"] = "invalid-parameter";
    ResultCode2["InvalidValue"] = "invalid-value";
    ResultCode2["NoMemory"] = "no-memory";
    ResultCode2["Timeout"] = "timeout";
    ResultCode2["UnknownReader"] = "unknown-reader";
    ResultCode2["UnsupportedFeature"] = "unsupported-feature";
    ResultCode2["NoReadersAvailable"] = "no-readers-available";
    ResultCode2["ServiceStopped"] = "service-stopped";
    ResultCode2["NoService"] = "no-service";
    ResultCode2["CommError"] = "comm-error";
    ResultCode2["InternalError"] = "internal-error";
    ResultCode2["ServerTooBusy"] = "server-too-busy";
    ResultCode2["Unexpected"] = "unexpected";
    ResultCode2["Shutdown"] = "shutdown";
    ResultCode2["UnknownCard"] = "unknown-card";
    ResultCode2["Unknown"] = "unknown";
  })(ResultCode = SmartCardEmulation2.ResultCode || (SmartCardEmulation2.ResultCode = {}));
  let ShareMode;
  ((ShareMode2) => {
    ShareMode2["Shared"] = "shared";
    ShareMode2["Exclusive"] = "exclusive";
    ShareMode2["Direct"] = "direct";
  })(ShareMode = SmartCardEmulation2.ShareMode || (SmartCardEmulation2.ShareMode = {}));
  let Disposition;
  ((Disposition2) => {
    Disposition2["LeaveCard"] = "leave-card";
    Disposition2["ResetCard"] = "reset-card";
    Disposition2["UnpowerCard"] = "unpower-card";
    Disposition2["EjectCard"] = "eject-card";
  })(Disposition = SmartCardEmulation2.Disposition || (SmartCardEmulation2.Disposition = {}));
  let ConnectionState;
  ((ConnectionState2) => {
    ConnectionState2["Absent"] = "absent";
    ConnectionState2["Present"] = "present";
    ConnectionState2["Swallowed"] = "swallowed";
    ConnectionState2["Powered"] = "powered";
    ConnectionState2["Negotiable"] = "negotiable";
    ConnectionState2["Specific"] = "specific";
  })(ConnectionState = SmartCardEmulation2.ConnectionState || (SmartCardEmulation2.ConnectionState = {}));
  let Protocol;
  ((Protocol2) => {
    Protocol2["T0"] = "t0";
    Protocol2["T1"] = "t1";
    Protocol2["Raw"] = "raw";
  })(Protocol = SmartCardEmulation2.Protocol || (SmartCardEmulation2.Protocol = {}));
})(SmartCardEmulation || (SmartCardEmulation = {}));
var Storage;
((Storage2) => {
  let StorageType;
  ((StorageType2) => {
    StorageType2["Cookies"] = "cookies";
    StorageType2["File_systems"] = "file_systems";
    StorageType2["Indexeddb"] = "indexeddb";
    StorageType2["Local_storage"] = "local_storage";
    StorageType2["Shader_cache"] = "shader_cache";
    StorageType2["Websql"] = "websql";
    StorageType2["Service_workers"] = "service_workers";
    StorageType2["Cache_storage"] = "cache_storage";
    StorageType2["Storage_buckets"] = "storage_buckets";
    StorageType2["All"] = "all";
    StorageType2["Other"] = "other";
  })(StorageType = Storage2.StorageType || (Storage2.StorageType = {}));
  let StorageBucketsDurability;
  ((StorageBucketsDurability2) => {
    StorageBucketsDurability2["Relaxed"] = "relaxed";
    StorageBucketsDurability2["Strict"] = "strict";
  })(StorageBucketsDurability = Storage2.StorageBucketsDurability || (Storage2.StorageBucketsDurability = {}));
})(Storage || (Storage = {}));
var SystemInfo;
((SystemInfo2) => {
  let SubsamplingFormat;
  ((SubsamplingFormat2) => {
    SubsamplingFormat2["Yuv420"] = "yuv420";
    SubsamplingFormat2["Yuv422"] = "yuv422";
    SubsamplingFormat2["Yuv444"] = "yuv444";
  })(SubsamplingFormat = SystemInfo2.SubsamplingFormat || (SystemInfo2.SubsamplingFormat = {}));
  let ImageType;
  ((ImageType2) => {
    ImageType2["Jpeg"] = "jpeg";
    ImageType2["Webp"] = "webp";
    ImageType2["Unknown"] = "unknown";
  })(ImageType = SystemInfo2.ImageType || (SystemInfo2.ImageType = {}));
})(SystemInfo || (SystemInfo = {}));
var Target;
((Target2) => {
  let WindowState;
  ((WindowState2) => {
    WindowState2["Normal"] = "normal";
    WindowState2["Minimized"] = "minimized";
    WindowState2["Maximized"] = "maximized";
    WindowState2["Fullscreen"] = "fullscreen";
  })(WindowState = Target2.WindowState || (Target2.WindowState = {}));
})(Target || (Target = {}));
var Tracing;
((Tracing2) => {
  let TraceConfigRecordMode;
  ((TraceConfigRecordMode2) => {
    TraceConfigRecordMode2["RecordUntilFull"] = "recordUntilFull";
    TraceConfigRecordMode2["RecordContinuously"] = "recordContinuously";
    TraceConfigRecordMode2["RecordAsMuchAsPossible"] = "recordAsMuchAsPossible";
    TraceConfigRecordMode2["EchoToConsole"] = "echoToConsole";
  })(TraceConfigRecordMode = Tracing2.TraceConfigRecordMode || (Tracing2.TraceConfigRecordMode = {}));
  let StreamFormat;
  ((StreamFormat2) => {
    StreamFormat2["Json"] = "json";
    StreamFormat2["Proto"] = "proto";
  })(StreamFormat = Tracing2.StreamFormat || (Tracing2.StreamFormat = {}));
  let StreamCompression;
  ((StreamCompression2) => {
    StreamCompression2["None"] = "none";
    StreamCompression2["Gzip"] = "gzip";
  })(StreamCompression = Tracing2.StreamCompression || (Tracing2.StreamCompression = {}));
  let MemoryDumpLevelOfDetail;
  ((MemoryDumpLevelOfDetail2) => {
    MemoryDumpLevelOfDetail2["Background"] = "background";
    MemoryDumpLevelOfDetail2["Light"] = "light";
    MemoryDumpLevelOfDetail2["Detailed"] = "detailed";
  })(MemoryDumpLevelOfDetail = Tracing2.MemoryDumpLevelOfDetail || (Tracing2.MemoryDumpLevelOfDetail = {}));
  let TracingBackend;
  ((TracingBackend2) => {
    TracingBackend2["Auto"] = "auto";
    TracingBackend2["Chrome"] = "chrome";
    TracingBackend2["System"] = "system";
  })(TracingBackend = Tracing2.TracingBackend || (Tracing2.TracingBackend = {}));
  let StartRequestTransferMode;
  ((StartRequestTransferMode2) => {
    StartRequestTransferMode2["ReportEvents"] = "ReportEvents";
    StartRequestTransferMode2["ReturnAsStream"] = "ReturnAsStream";
  })(StartRequestTransferMode = Tracing2.StartRequestTransferMode || (Tracing2.StartRequestTransferMode = {}));
})(Tracing || (Tracing = {}));
var WebAudio;
((WebAudio2) => {
  let ContextType;
  ((ContextType2) => {
    ContextType2["Realtime"] = "realtime";
    ContextType2["Offline"] = "offline";
  })(ContextType = WebAudio2.ContextType || (WebAudio2.ContextType = {}));
  let ContextState;
  ((ContextState2) => {
    ContextState2["Suspended"] = "suspended";
    ContextState2["Running"] = "running";
    ContextState2["Closed"] = "closed";
    ContextState2["Interrupted"] = "interrupted";
  })(ContextState = WebAudio2.ContextState || (WebAudio2.ContextState = {}));
  let ChannelCountMode;
  ((ChannelCountMode2) => {
    ChannelCountMode2["ClampedMax"] = "clamped-max";
    ChannelCountMode2["Explicit"] = "explicit";
    ChannelCountMode2["Max"] = "max";
  })(ChannelCountMode = WebAudio2.ChannelCountMode || (WebAudio2.ChannelCountMode = {}));
  let ChannelInterpretation;
  ((ChannelInterpretation2) => {
    ChannelInterpretation2["Discrete"] = "discrete";
    ChannelInterpretation2["Speakers"] = "speakers";
  })(ChannelInterpretation = WebAudio2.ChannelInterpretation || (WebAudio2.ChannelInterpretation = {}));
  let AutomationRate;
  ((AutomationRate2) => {
    AutomationRate2["ARate"] = "a-rate";
    AutomationRate2["KRate"] = "k-rate";
  })(AutomationRate = WebAudio2.AutomationRate || (WebAudio2.AutomationRate = {}));
})(WebAudio || (WebAudio = {}));
var WebAuthn;
((WebAuthn2) => {
  let AuthenticatorProtocol;
  ((AuthenticatorProtocol2) => {
    AuthenticatorProtocol2["U2f"] = "u2f";
    AuthenticatorProtocol2["Ctap2"] = "ctap2";
  })(AuthenticatorProtocol = WebAuthn2.AuthenticatorProtocol || (WebAuthn2.AuthenticatorProtocol = {}));
  let Ctap2Version;
  ((Ctap2Version2) => {
    Ctap2Version2["Ctap2_0"] = "ctap2_0";
    Ctap2Version2["Ctap2_1"] = "ctap2_1";
    Ctap2Version2["Ctap2_2"] = "ctap2_2";
  })(Ctap2Version = WebAuthn2.Ctap2Version || (WebAuthn2.Ctap2Version = {}));
  let AuthenticatorTransport;
  ((AuthenticatorTransport2) => {
    AuthenticatorTransport2["Usb"] = "usb";
    AuthenticatorTransport2["Nfc"] = "nfc";
    AuthenticatorTransport2["Ble"] = "ble";
    AuthenticatorTransport2["Cable"] = "cable";
    AuthenticatorTransport2["Hybrid"] = "hybrid";
    AuthenticatorTransport2["SmartCard"] = "smart-card";
    AuthenticatorTransport2["Internal"] = "internal";
  })(AuthenticatorTransport = WebAuthn2.AuthenticatorTransport || (WebAuthn2.AuthenticatorTransport = {}));
})(WebAuthn || (WebAuthn = {}));
var WebMCP;
((WebMCP2) => {
  let InvocationStatus;
  ((InvocationStatus2) => {
    InvocationStatus2["Completed"] = "Completed";
    InvocationStatus2["Canceled"] = "Canceled";
    InvocationStatus2["Error"] = "Error";
  })(InvocationStatus = WebMCP2.InvocationStatus || (WebMCP2.InvocationStatus = {}));
})(WebMCP || (WebMCP = {}));
var Debugger;
((Debugger2) => {
  let ScopeType;
  ((ScopeType2) => {
    ScopeType2["Global"] = "global";
    ScopeType2["Local"] = "local";
    ScopeType2["With"] = "with";
    ScopeType2["Closure"] = "closure";
    ScopeType2["Catch"] = "catch";
    ScopeType2["Block"] = "block";
    ScopeType2["Script"] = "script";
    ScopeType2["Eval"] = "eval";
    ScopeType2["Module"] = "module";
    ScopeType2["WasmExpressionStack"] = "wasm-expression-stack";
  })(ScopeType = Debugger2.ScopeType || (Debugger2.ScopeType = {}));
  let BreakLocationType;
  ((BreakLocationType2) => {
    BreakLocationType2["DebuggerStatement"] = "debuggerStatement";
    BreakLocationType2["Call"] = "call";
    BreakLocationType2["Return"] = "return";
  })(BreakLocationType = Debugger2.BreakLocationType || (Debugger2.BreakLocationType = {}));
  let ScriptLanguage;
  ((ScriptLanguage2) => {
    ScriptLanguage2["JavaScript"] = "JavaScript";
    ScriptLanguage2["WebAssembly"] = "WebAssembly";
  })(ScriptLanguage = Debugger2.ScriptLanguage || (Debugger2.ScriptLanguage = {}));
  let DebugSymbolsType;
  ((DebugSymbolsType2) => {
    DebugSymbolsType2["SourceMap"] = "SourceMap";
    DebugSymbolsType2["EmbeddedDWARF"] = "EmbeddedDWARF";
    DebugSymbolsType2["ExternalDWARF"] = "ExternalDWARF";
  })(DebugSymbolsType = Debugger2.DebugSymbolsType || (Debugger2.DebugSymbolsType = {}));
  let ContinueToLocationRequestTargetCallFrames;
  ((ContinueToLocationRequestTargetCallFrames2) => {
    ContinueToLocationRequestTargetCallFrames2["Any"] = "any";
    ContinueToLocationRequestTargetCallFrames2["Current"] = "current";
  })(ContinueToLocationRequestTargetCallFrames = Debugger2.ContinueToLocationRequestTargetCallFrames || (Debugger2.ContinueToLocationRequestTargetCallFrames = {}));
  let RestartFrameRequestMode;
  ((RestartFrameRequestMode2) => {
    RestartFrameRequestMode2["StepInto"] = "StepInto";
  })(RestartFrameRequestMode = Debugger2.RestartFrameRequestMode || (Debugger2.RestartFrameRequestMode = {}));
  let SetInstrumentationBreakpointRequestInstrumentation;
  ((SetInstrumentationBreakpointRequestInstrumentation2) => {
    SetInstrumentationBreakpointRequestInstrumentation2["BeforeScriptExecution"] = "beforeScriptExecution";
    SetInstrumentationBreakpointRequestInstrumentation2["BeforeScriptWithSourceMapExecution"] = "beforeScriptWithSourceMapExecution";
  })(SetInstrumentationBreakpointRequestInstrumentation = Debugger2.SetInstrumentationBreakpointRequestInstrumentation || (Debugger2.SetInstrumentationBreakpointRequestInstrumentation = {}));
  let SetPauseOnExceptionsRequestState;
  ((SetPauseOnExceptionsRequestState2) => {
    SetPauseOnExceptionsRequestState2["None"] = "none";
    SetPauseOnExceptionsRequestState2["Caught"] = "caught";
    SetPauseOnExceptionsRequestState2["Uncaught"] = "uncaught";
    SetPauseOnExceptionsRequestState2["All"] = "all";
  })(SetPauseOnExceptionsRequestState = Debugger2.SetPauseOnExceptionsRequestState || (Debugger2.SetPauseOnExceptionsRequestState = {}));
  let SetScriptSourceResponseStatus;
  ((SetScriptSourceResponseStatus2) => {
    SetScriptSourceResponseStatus2["Ok"] = "Ok";
    SetScriptSourceResponseStatus2["CompileError"] = "CompileError";
    SetScriptSourceResponseStatus2["BlockedByActiveGenerator"] = "BlockedByActiveGenerator";
    SetScriptSourceResponseStatus2["BlockedByActiveFunction"] = "BlockedByActiveFunction";
    SetScriptSourceResponseStatus2["BlockedByTopLevelEsModuleChange"] = "BlockedByTopLevelEsModuleChange";
  })(SetScriptSourceResponseStatus = Debugger2.SetScriptSourceResponseStatus || (Debugger2.SetScriptSourceResponseStatus = {}));
  let PausedEventReason;
  ((PausedEventReason2) => {
    PausedEventReason2["Ambiguous"] = "ambiguous";
    PausedEventReason2["Assert"] = "assert";
    PausedEventReason2["CSPViolation"] = "CSPViolation";
    PausedEventReason2["DebugCommand"] = "debugCommand";
    PausedEventReason2["DOM"] = "DOM";
    PausedEventReason2["EventListener"] = "EventListener";
    PausedEventReason2["Exception"] = "exception";
    PausedEventReason2["Instrumentation"] = "instrumentation";
    PausedEventReason2["OOM"] = "OOM";
    PausedEventReason2["Other"] = "other";
    PausedEventReason2["PromiseRejection"] = "promiseRejection";
    PausedEventReason2["XHR"] = "XHR";
    PausedEventReason2["Step"] = "step";
  })(PausedEventReason = Debugger2.PausedEventReason || (Debugger2.PausedEventReason = {}));
})(Debugger || (Debugger = {}));
var Runtime;
((Runtime3) => {
  let SerializationOptionsSerialization;
  ((SerializationOptionsSerialization2) => {
    SerializationOptionsSerialization2["Deep"] = "deep";
    SerializationOptionsSerialization2["Json"] = "json";
    SerializationOptionsSerialization2["IdOnly"] = "idOnly";
  })(SerializationOptionsSerialization = Runtime3.SerializationOptionsSerialization || (Runtime3.SerializationOptionsSerialization = {}));
  let DeepSerializedValueType;
  ((DeepSerializedValueType2) => {
    DeepSerializedValueType2["Undefined"] = "undefined";
    DeepSerializedValueType2["Null"] = "null";
    DeepSerializedValueType2["String"] = "string";
    DeepSerializedValueType2["Number"] = "number";
    DeepSerializedValueType2["Boolean"] = "boolean";
    DeepSerializedValueType2["Bigint"] = "bigint";
    DeepSerializedValueType2["Regexp"] = "regexp";
    DeepSerializedValueType2["Date"] = "date";
    DeepSerializedValueType2["Symbol"] = "symbol";
    DeepSerializedValueType2["Array"] = "array";
    DeepSerializedValueType2["Object"] = "object";
    DeepSerializedValueType2["Function"] = "function";
    DeepSerializedValueType2["Map"] = "map";
    DeepSerializedValueType2["Set"] = "set";
    DeepSerializedValueType2["Weakmap"] = "weakmap";
    DeepSerializedValueType2["Weakset"] = "weakset";
    DeepSerializedValueType2["Error"] = "error";
    DeepSerializedValueType2["Proxy"] = "proxy";
    DeepSerializedValueType2["Promise"] = "promise";
    DeepSerializedValueType2["Typedarray"] = "typedarray";
    DeepSerializedValueType2["Arraybuffer"] = "arraybuffer";
    DeepSerializedValueType2["Node"] = "node";
    DeepSerializedValueType2["Window"] = "window";
    DeepSerializedValueType2["Generator"] = "generator";
  })(DeepSerializedValueType = Runtime3.DeepSerializedValueType || (Runtime3.DeepSerializedValueType = {}));
  let RemoteObjectType;
  ((RemoteObjectType2) => {
    RemoteObjectType2["Object"] = "object";
    RemoteObjectType2["Function"] = "function";
    RemoteObjectType2["Undefined"] = "undefined";
    RemoteObjectType2["String"] = "string";
    RemoteObjectType2["Number"] = "number";
    RemoteObjectType2["Boolean"] = "boolean";
    RemoteObjectType2["Symbol"] = "symbol";
    RemoteObjectType2["Bigint"] = "bigint";
  })(RemoteObjectType = Runtime3.RemoteObjectType || (Runtime3.RemoteObjectType = {}));
  let RemoteObjectSubtype;
  ((RemoteObjectSubtype2) => {
    RemoteObjectSubtype2["Array"] = "array";
    RemoteObjectSubtype2["Null"] = "null";
    RemoteObjectSubtype2["Node"] = "node";
    RemoteObjectSubtype2["Regexp"] = "regexp";
    RemoteObjectSubtype2["Date"] = "date";
    RemoteObjectSubtype2["Map"] = "map";
    RemoteObjectSubtype2["Set"] = "set";
    RemoteObjectSubtype2["Weakmap"] = "weakmap";
    RemoteObjectSubtype2["Weakset"] = "weakset";
    RemoteObjectSubtype2["Iterator"] = "iterator";
    RemoteObjectSubtype2["Generator"] = "generator";
    RemoteObjectSubtype2["Error"] = "error";
    RemoteObjectSubtype2["Proxy"] = "proxy";
    RemoteObjectSubtype2["Promise"] = "promise";
    RemoteObjectSubtype2["Typedarray"] = "typedarray";
    RemoteObjectSubtype2["Arraybuffer"] = "arraybuffer";
    RemoteObjectSubtype2["Dataview"] = "dataview";
    RemoteObjectSubtype2["Webassemblymemory"] = "webassemblymemory";
    RemoteObjectSubtype2["Wasmvalue"] = "wasmvalue";
    RemoteObjectSubtype2["Trustedtype"] = "trustedtype";
  })(RemoteObjectSubtype = Runtime3.RemoteObjectSubtype || (Runtime3.RemoteObjectSubtype = {}));
  let ObjectPreviewType;
  ((ObjectPreviewType2) => {
    ObjectPreviewType2["Object"] = "object";
    ObjectPreviewType2["Function"] = "function";
    ObjectPreviewType2["Undefined"] = "undefined";
    ObjectPreviewType2["String"] = "string";
    ObjectPreviewType2["Number"] = "number";
    ObjectPreviewType2["Boolean"] = "boolean";
    ObjectPreviewType2["Symbol"] = "symbol";
    ObjectPreviewType2["Bigint"] = "bigint";
  })(ObjectPreviewType = Runtime3.ObjectPreviewType || (Runtime3.ObjectPreviewType = {}));
  let ObjectPreviewSubtype;
  ((ObjectPreviewSubtype2) => {
    ObjectPreviewSubtype2["Array"] = "array";
    ObjectPreviewSubtype2["Null"] = "null";
    ObjectPreviewSubtype2["Node"] = "node";
    ObjectPreviewSubtype2["Regexp"] = "regexp";
    ObjectPreviewSubtype2["Date"] = "date";
    ObjectPreviewSubtype2["Map"] = "map";
    ObjectPreviewSubtype2["Set"] = "set";
    ObjectPreviewSubtype2["Weakmap"] = "weakmap";
    ObjectPreviewSubtype2["Weakset"] = "weakset";
    ObjectPreviewSubtype2["Iterator"] = "iterator";
    ObjectPreviewSubtype2["Generator"] = "generator";
    ObjectPreviewSubtype2["Error"] = "error";
    ObjectPreviewSubtype2["Proxy"] = "proxy";
    ObjectPreviewSubtype2["Promise"] = "promise";
    ObjectPreviewSubtype2["Typedarray"] = "typedarray";
    ObjectPreviewSubtype2["Arraybuffer"] = "arraybuffer";
    ObjectPreviewSubtype2["Dataview"] = "dataview";
    ObjectPreviewSubtype2["Webassemblymemory"] = "webassemblymemory";
    ObjectPreviewSubtype2["Wasmvalue"] = "wasmvalue";
    ObjectPreviewSubtype2["Trustedtype"] = "trustedtype";
  })(ObjectPreviewSubtype = Runtime3.ObjectPreviewSubtype || (Runtime3.ObjectPreviewSubtype = {}));
  let PropertyPreviewType;
  ((PropertyPreviewType2) => {
    PropertyPreviewType2["Object"] = "object";
    PropertyPreviewType2["Function"] = "function";
    PropertyPreviewType2["Undefined"] = "undefined";
    PropertyPreviewType2["String"] = "string";
    PropertyPreviewType2["Number"] = "number";
    PropertyPreviewType2["Boolean"] = "boolean";
    PropertyPreviewType2["Symbol"] = "symbol";
    PropertyPreviewType2["Accessor"] = "accessor";
    PropertyPreviewType2["Bigint"] = "bigint";
  })(PropertyPreviewType = Runtime3.PropertyPreviewType || (Runtime3.PropertyPreviewType = {}));
  let PropertyPreviewSubtype;
  ((PropertyPreviewSubtype2) => {
    PropertyPreviewSubtype2["Array"] = "array";
    PropertyPreviewSubtype2["Null"] = "null";
    PropertyPreviewSubtype2["Node"] = "node";
    PropertyPreviewSubtype2["Regexp"] = "regexp";
    PropertyPreviewSubtype2["Date"] = "date";
    PropertyPreviewSubtype2["Map"] = "map";
    PropertyPreviewSubtype2["Set"] = "set";
    PropertyPreviewSubtype2["Weakmap"] = "weakmap";
    PropertyPreviewSubtype2["Weakset"] = "weakset";
    PropertyPreviewSubtype2["Iterator"] = "iterator";
    PropertyPreviewSubtype2["Generator"] = "generator";
    PropertyPreviewSubtype2["Error"] = "error";
    PropertyPreviewSubtype2["Proxy"] = "proxy";
    PropertyPreviewSubtype2["Promise"] = "promise";
    PropertyPreviewSubtype2["Typedarray"] = "typedarray";
    PropertyPreviewSubtype2["Arraybuffer"] = "arraybuffer";
    PropertyPreviewSubtype2["Dataview"] = "dataview";
    PropertyPreviewSubtype2["Webassemblymemory"] = "webassemblymemory";
    PropertyPreviewSubtype2["Wasmvalue"] = "wasmvalue";
    PropertyPreviewSubtype2["Trustedtype"] = "trustedtype";
  })(PropertyPreviewSubtype = Runtime3.PropertyPreviewSubtype || (Runtime3.PropertyPreviewSubtype = {}));
  let ConsoleAPICalledEventType;
  ((ConsoleAPICalledEventType2) => {
    ConsoleAPICalledEventType2["Log"] = "log";
    ConsoleAPICalledEventType2["Debug"] = "debug";
    ConsoleAPICalledEventType2["Info"] = "info";
    ConsoleAPICalledEventType2["Error"] = "error";
    ConsoleAPICalledEventType2["Warning"] = "warning";
    ConsoleAPICalledEventType2["Dir"] = "dir";
    ConsoleAPICalledEventType2["DirXML"] = "dirxml";
    ConsoleAPICalledEventType2["Table"] = "table";
    ConsoleAPICalledEventType2["Trace"] = "trace";
    ConsoleAPICalledEventType2["Clear"] = "clear";
    ConsoleAPICalledEventType2["StartGroup"] = "startGroup";
    ConsoleAPICalledEventType2["StartGroupCollapsed"] = "startGroupCollapsed";
    ConsoleAPICalledEventType2["EndGroup"] = "endGroup";
    ConsoleAPICalledEventType2["Assert"] = "assert";
    ConsoleAPICalledEventType2["Profile"] = "profile";
    ConsoleAPICalledEventType2["ProfileEnd"] = "profileEnd";
    ConsoleAPICalledEventType2["Count"] = "count";
    ConsoleAPICalledEventType2["TimeEnd"] = "timeEnd";
  })(ConsoleAPICalledEventType = Runtime3.ConsoleAPICalledEventType || (Runtime3.ConsoleAPICalledEventType = {}));
})(Runtime || (Runtime = {}));

// ../../front_end/panels/timeline/components/Utils.ts
import * as ThemeSupport from "../../../ui/legacy/theme_support/theme_support.js";
import * as VisualLogging2 from "../../../ui/visual_logging/visual_logging.js";
var UIStrings2 = {
  /**
   * @description Short formatted milliseconds string in the Performance panel.
   * @example {2.14} PH1
   */
  fms: "{PH1}[ms]()",
  /**
   * @description Short formatted seconds string in the Performance panel.
   * @example {2.14} PH1
   */
  fs: "{PH1}[s]()"
};
var str_2 = i18n3.i18n.registerUIStrings("panels/timeline/components/Utils.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var NetworkCategory = /* @__PURE__ */ ((NetworkCategory2) => {
  NetworkCategory2["DOC"] = "Doc";
  NetworkCategory2["CSS"] = "CSS";
  NetworkCategory2["JS"] = "JS";
  NetworkCategory2["FONT"] = "Font";
  NetworkCategory2["IMG"] = "Img";
  NetworkCategory2["MEDIA"] = "Media";
  NetworkCategory2["WASM"] = "Wasm";
  NetworkCategory2["OTHER"] = "Other";
  return NetworkCategory2;
})(NetworkCategory || {});
function networkResourceCategory(request) {
  const { mimeType } = request.args.data;
  switch (request.args.data.resourceType) {
    case Network.ResourceType.Document:
      return "Doc" /* DOC */;
    case Network.ResourceType.Stylesheet:
      return "CSS" /* CSS */;
    case Network.ResourceType.Image:
      return "Img" /* IMG */;
    case Network.ResourceType.Media:
      return "Media" /* MEDIA */;
    case Network.ResourceType.Font:
      return "Font" /* FONT */;
    case Network.ResourceType.Script:
    case Network.ResourceType.WebSocket:
      return "JS" /* JS */;
    default:
      return mimeType === void 0 ? "Other" /* OTHER */ : mimeType.endsWith("/css") ? "CSS" /* CSS */ : mimeType.endsWith("javascript") ? "JS" /* JS */ : mimeType.startsWith("image/") ? "Img" /* IMG */ : mimeType.startsWith("audio/") || mimeType.startsWith("video/") ? "Media" /* MEDIA */ : mimeType.startsWith("font/") || mimeType.includes("font-") ? "Font" /* FONT */ : mimeType === "application/wasm" ? "Wasm" /* WASM */ : mimeType.startsWith("text/") ? "Doc" /* DOC */ : (
        // Ultimate fallback:
        "Other" /* OTHER */
      );
  }
}
function colorForNetworkCategory(category) {
  let cssVarName = "--app-color-system";
  switch (category) {
    case "Doc" /* DOC */:
      cssVarName = "--app-color-doc";
      break;
    case "JS" /* JS */:
      cssVarName = "--app-color-scripting";
      break;
    case "CSS" /* CSS */:
      cssVarName = "--app-color-css";
      break;
    case "Img" /* IMG */:
      cssVarName = "--app-color-image";
      break;
    case "Media" /* MEDIA */:
      cssVarName = "--app-color-media";
      break;
    case "Font" /* FONT */:
      cssVarName = "--app-color-font";
      break;
    case "Wasm" /* WASM */:
      cssVarName = "--app-color-wasm";
      break;
    case "Other" /* OTHER */:
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
function rateMetric(value2, thresholds) {
  if (value2 <= thresholds[0]) {
    return "good";
  }
  if (value2 <= thresholds[1]) {
    return "needs-improvement";
  }
  return "poor";
}
function renderMetricValue(jslogContext, value2, thresholds, format, options) {
  const metricValueEl = document.createElement("span");
  metricValueEl.classList.add("metric-value");
  if (value2 === void 0) {
    metricValueEl.classList.add("waiting");
    metricValueEl.textContent = "-";
    return metricValueEl;
  }
  metricValueEl.textContent = format(value2);
  const rating = rateMetric(value2, thresholds);
  metricValueEl.classList.add(rating);
  metricValueEl.setAttribute("jslog", `${VisualLogging2.section(jslogContext)}`);
  if (options?.dim) {
    metricValueEl.classList.add("dim");
  }
  return metricValueEl;
}
var NumberWithUnit;
((NumberWithUnit2) => {
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
    const milliseconds = Platform.Timing.microSecondsToMilliSeconds(time);
    const seconds = Platform.Timing.milliSecondsToSeconds(milliseconds);
    const text = i18nString2(UIStrings2.fs, { PH1: seconds.toFixed(2) });
    const result = parse(text);
    if (!result) {
      element.textContent = i18n3.TimeUtilities.formatMicroSecondsAsSeconds(time);
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
    return { text: element.textContent, element };
  }
  NumberWithUnit2.formatMicroSecondsAsSeconds = formatMicroSecondsAsSeconds;
  function formatMicroSecondsAsMillisFixed(time, fractionDigits = 0) {
    const element = document.createElement("span");
    element.classList.add("number-with-unit");
    const milliseconds = Platform.Timing.microSecondsToMilliSeconds(time);
    const text = i18nString2(UIStrings2.fms, { PH1: milliseconds.toFixed(fractionDigits) });
    const result = parse(text);
    if (!result) {
      element.textContent = i18n3.TimeUtilities.formatMicroSecondsAsMillisFixed(time);
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
    return { text: element.textContent, element };
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
      Platform.assertNever(metric, `Unknown metric: ${metric}`);
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
function isFieldWorseThanLocal(local, field) {
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

// ../../front_end/panels/timeline/components/CWVMetrics.ts
var { html: html2 } = Lit2.StaticHtml;
var UIStrings3 = {
  /**
   * @description Tooltip and aria label for a metric value indicating its score classification in the Performance panel.
   * @example {INP} PH1
   * @example {1.2s} PH2
   * @example {poor} PH3
   */
  metricScore: "{PH1}: {PH2} {PH3} score",
  /**
   * @description Tooltip and aria label for a metric value indicating that the data is unavailable in the Performance panel.
   * @example {INP} PH1
   */
  metricScoreUnavailable: "{PH1}: unavailable",
  /**
   * @description Label denoting that metrics were observed in the field from real user data (CrUX), and whether the data is from the URL or origin dataset in the Performance panel.
   * @example {URL} PH1
   */
  fieldScoreLabel: "Field ({PH1})",
  /**
   * @description Label for an option that selects the specific URL in the Performance panel.
   */
  urlOption: "URL",
  /**
   * @description Label for an option that selects the entire origin in the Performance panel.
   */
  originOption: "Origin",
  /**
   * @description Tooltip text for the dismiss button that closes a warning popup in the Performance panel.
   */
  dismissTitle: "Dismiss",
  /**
   * @description Title shown in a warning dialog when field metrics are worse than locally observed metrics in the Performance panel.
   */
  fieldMismatchTitle: "Field & local metrics mismatch",
  /**
   * @description Warning notice shown when field metrics are worse than locally observed metrics in the Performance panel.
   */
  fieldMismatchNotice: "Local and field metrics [may not match](https://web.dev/articles/lab-and-field-data-differences) for several reasons. Adjust [throttling settings and device emulation](https://developer.chrome.com/docs/devtools/device-mode) to analyze traces more similar to the average user\u2019s environment."
};
var str_3 = i18n5.i18n.registerUIStrings("panels/timeline/components/CWVMetrics.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
function getLocalMetrics(parsedTrace, insightSetKey) {
  if (!parsedTrace || !insightSetKey) {
    return null;
  }
  const insightSet = parsedTrace.insights?.get(insightSetKey);
  if (!insightSet) {
    return null;
  }
  const lcp = Trace2.Insights.Common.getLCP(insightSet);
  const cls = Trace2.Insights.Common.getCLS(insightSet);
  const inp = Trace2.Insights.Common.getINP(insightSet);
  return { lcp, cls, inp };
}
function getFieldMetrics(parsedTrace, insightSetKey) {
  if (!parsedTrace || !parsedTrace.metadata?.cruxFieldData || !insightSetKey) {
    return null;
  }
  const insightSet = parsedTrace.insights?.get(insightSetKey);
  if (!insightSet) {
    return null;
  }
  let scope = null;
  try {
    scope = CrUXManager.CrUXManager.instance().getSelectedScope();
  } catch {
  }
  const fieldMetricsResults = Trace2.Insights.Common.getFieldMetricsForInsightSet(insightSet, parsedTrace.metadata, scope);
  if (!fieldMetricsResults) {
    return null;
  }
  return fieldMetricsResults;
}
var CWV_METRICS_VIEW = (input, _output, target) => {
  const {
    parsedTrace,
    insightSetKey,
    didDismissFieldMismatchNotice,
    onDismisFieldMismatchNotice,
    onClickMetric
  } = input;
  const local = getLocalMetrics(parsedTrace, insightSetKey);
  const field = getFieldMetrics(parsedTrace, insightSetKey);
  const localValues = {
    lcp: local?.lcp?.value !== void 0 ? Trace2.Helpers.Timing.microToMilli(local?.lcp.value) : void 0,
    inp: local?.inp?.value !== void 0 ? Trace2.Helpers.Timing.microToMilli(local?.inp.value) : void 0
  };
  const fieldValues = field && {
    lcp: field.lcp?.value !== void 0 ? Trace2.Helpers.Timing.microToMilli(field.lcp.value) : void 0,
    inp: field.inp?.value !== void 0 ? Trace2.Helpers.Timing.microToMilli(field.inp.value) : void 0
  };
  const showFieldMismatchNotice = !didDismissFieldMismatchNotice && !!fieldValues && isFieldWorseThanLocal(localValues, fieldValues);
  function renderMetricValue2(metric, value2, relevantEvent) {
    let valueText;
    let valueDisplay;
    let classification;
    if (value2 === null) {
      valueText = valueDisplay = "-";
      classification = Trace2.Handlers.ModelHandlers.PageLoadMetrics.ScoreClassification.UNCLASSIFIED;
    } else if (metric === "LCP") {
      const micros = value2;
      const { text, element } = NumberWithUnit.formatMicroSecondsAsSeconds(micros);
      valueText = text;
      valueDisplay = element;
      classification = Trace2.Handlers.ModelHandlers.PageLoadMetrics.scoreClassificationForLargestContentfulPaint(micros);
    } else if (metric === "CLS") {
      valueText = valueDisplay = value2 ? value2.toFixed(2) : "0";
      classification = Trace2.Handlers.ModelHandlers.LayoutShifts.scoreClassificationForLayoutShift(value2);
    } else if (metric === "INP") {
      const micros = value2;
      const { text, element } = NumberWithUnit.formatMicroSecondsAsMillisFixed(micros);
      valueText = text;
      valueDisplay = element;
      classification = Trace2.Handlers.ModelHandlers.UserInteractions.scoreClassificationForInteractionToNextPaint(micros);
    } else {
      Platform2.TypeScriptUtilities.assertNever(metric, `Unexpected metric ${metric}`);
    }
    const title = value2 !== null ? i18nString3(UIStrings3.metricScore, { PH1: metric, PH2: valueText, PH3: classification }) : i18nString3(UIStrings3.metricScoreUnavailable, { PH1: metric });
    return html2`
      <button class="metric"
        @click=${relevantEvent ? onClickMetric.bind(relevantEvent) : null}
        title=${title}
        aria-label=${title}
      >
        <div class="metric-value metric-value-${classification}">${valueDisplay}</div>
      </button>
    `;
  }
  const lcpEl = renderMetricValue2("LCP", local?.lcp?.value ?? null, local?.lcp?.event ?? null);
  const inpEl = renderMetricValue2("INP", local?.inp?.value ?? null, local?.inp?.event ?? null);
  const clsEl = renderMetricValue2("CLS", local?.cls?.value ?? null, local?.cls?.worstClusterEvent ?? null);
  const navigation = parsedTrace?.insights?.get(insightSetKey ?? "")?.navigation;
  const isSoftNav = navigation && Trace2.Types.Events.isSoftNavigationStart(navigation);
  const softNavBadgeTemplate = isSoftNav ? html2`
    <div class="metrics-row soft-nav-badge-row">
      <span class="badge">SOFT NAV</span>
    </div>
  ` : Lit2.nothing;
  const localMetricsTemplateResult = html2`
    <div class="metrics-row">
      <span>${lcpEl}</span>
      <span>${inpEl}</span>
      <span>${clsEl}</span>
      <span class="row-label">Local</span>
    </div>
    ${!field ? softNavBadgeTemplate : Lit2.nothing}
    ${!field && input.skipBottomBorder ? Lit2.nothing : html2`<span class="row-border"></span>`}
  `;
  let fieldMetricsTemplateResult;
  if (field) {
    const { lcp, inp, cls } = field;
    const lcpEl2 = renderMetricValue2("LCP", lcp?.value ?? null, null);
    const inpEl2 = renderMetricValue2("INP", inp?.value ?? null, null);
    const clsEl2 = renderMetricValue2("CLS", cls?.value ?? null, null);
    let scope = i18nString3(UIStrings3.originOption);
    if (lcp?.pageScope === "url" || inp?.pageScope === "url") {
      scope = i18nString3(UIStrings3.urlOption);
    }
    fieldMetricsTemplateResult = html2`
      <div class="metrics-row">
        <span>${lcpEl2}</span>
        <span>${inpEl2}</span>
        <span>${clsEl2}</span>
        <span class="row-label">${i18nString3(UIStrings3.fieldScoreLabel, { PH1: scope })}</span>
      </div>
      ${softNavBadgeTemplate}
      ${input.skipBottomBorder ? Lit2.nothing : html2`<span class="row-border"></span>`}
    `;
  }
  let fieldIsDifferentEl;
  if (showFieldMismatchNotice) {
    fieldIsDifferentEl = html2`
      <div class="field-mismatch-notice" jslog=${VisualLogging3.section("timeline.insights.field-mismatch")}>
        <h3>${i18nString3(UIStrings3.fieldMismatchTitle)}</h3>
        <devtools-button
          title=${i18nString3(UIStrings3.dismissTitle)}
          .iconName=${"cross"}
          .variant=${Buttons.Button.Variant.ICON}
          .jslogContext=${"timeline.insights.dismiss-field-mismatch"}
          @click=${onDismisFieldMismatchNotice}
        ></devtools-button>
        <div class="field-mismatch-notice__body">${Insights2.Helpers.md(i18nString3(UIStrings3.fieldMismatchNotice))}</div>
      </div>
    `;
  }
  const classes = { metrics: true, "metrics--field": Boolean(fieldMetricsTemplateResult) };
  const metricsTableEl = html2`<div class=${Lit2.Directives.classMap(classes)}>
    <div class="metrics-row">
      <span class="metric-label">LCP</span>
      <span class="metric-label">INP</span>
      <span class="metric-label">CLS</span>
      <span class="row-label"></span>
    </div>
    ${localMetricsTemplateResult}
    ${fieldMetricsTemplateResult}
  </div>`;
  Lit2.render(
    html2`
    <style>${cwvMetrics_css_default}</style>
    <style>${metricValueStyles_css_default}</style>
    ${metricsTableEl}
    ${fieldIsDifferentEl}
  `,
    target
  );
};
var CWVMetrics = class extends UI2.Widget.Widget {
  #view;
  #data = {
    insightSetKey: null,
    parsedTrace: null
  };
  #didDismissFieldMismatchNotice = false;
  #skipBottomBorder = false;
  constructor(element, view = CWV_METRICS_VIEW) {
    super(element, { useShadowDom: true });
    this.#view = view;
  }
  set data(data) {
    this.#data = data;
    this.requestUpdate();
  }
  get skipBottomBorder() {
    return this.#skipBottomBorder;
  }
  set skipBottomBorder(x) {
    if (x === this.#skipBottomBorder) {
      return;
    }
    this.#skipBottomBorder = x;
    this.requestUpdate();
  }
  #onClickMetric(traceEvent) {
    this.element.dispatchEvent(new Insights2.EventRef.EventReferenceClick(traceEvent));
  }
  #onDismisFieldMismatchNotice() {
    this.#didDismissFieldMismatchNotice = true;
    this.requestUpdate();
  }
  performUpdate() {
    const {
      parsedTrace,
      insightSetKey
    } = this.#data;
    if (!parsedTrace?.insights || !insightSetKey || !(parsedTrace.insights instanceof Map)) {
      return;
    }
    const insightSet = parsedTrace.insights.get(insightSetKey);
    if (!insightSet) {
      return;
    }
    const input = {
      parsedTrace,
      insightSetKey,
      didDismissFieldMismatchNotice: this.#didDismissFieldMismatchNotice,
      onDismisFieldMismatchNotice: this.#onDismisFieldMismatchNotice.bind(this),
      onClickMetric: this.#onClickMetric.bind(this),
      skipBottomBorder: this.#skipBottomBorder
    };
    this.#view(input, void 0, this.contentElement);
  }
};

// ../../front_end/panels/timeline/components/DetailsView.ts
var DetailsView_exports = {};
__export(DetailsView_exports, {
  buildRowsForWebSocketEvent: () => buildRowsForWebSocketEvent,
  buildWarningElementsForEvent: () => buildWarningElementsForEvent,
  generateInvalidationsList: () => generateInvalidationsList
});
import * as i18n7 from "../../../core/i18n/i18n.js";
import * as Platform3 from "../../../core/platform/platform.js";
import * as Trace3 from "../../../models/trace/trace.js";
import * as uiI18n from "../../../ui/i18n/i18n.js";
import { Link } from "../../../ui/kit/kit.js";
var UIStrings4 = {
  /**
   * @description Text in the Performance panel for a forced style and layout calculation of elements in a page.
   */
  forcedReflow: "Forced reflow",
  /**
   * @description Warning message indicating that an event is likely a performance bottleneck in the Performance panel.
   * @example {Forced reflow} PH1
   */
  sIsALikelyPerformanceBottleneck: "{PH1} is a likely performance bottleneck.",
  /**
   * @description Warning message in the Performance panel for an idle callback function that took longer to execute than its predefined deadline.
   * @example {10ms} PH1
   */
  idleCallbackExecutionExtended: "Idle callback execution extended beyond deadline by {PH1}",
  /**
   * @description Warning message in the Performance panel describing how long a task took.
   * @example {Task} PH1
   * @example {10ms} PH2
   */
  sTookS: "{PH1} took {PH2}.",
  /**
   * @description Label in the Performance panel for a task that took a long time.
   */
  longTask: "Long task",
  /**
   * @description Label in the Performance panel for an interaction that took a long time.
   */
  longInteractionINP: "Long interaction",
  /**
   * @description Warning message in the Performance panel indicating that an interaction caused poor responsiveness.
   * @example {Long interaction} PH1
   */
  sIsLikelyPoorPageResponsiveness: "{PH1} indicates poor page responsiveness.",
  /**
   * @description Label for the WebSocket sub-protocol in the event details view of the Performance panel.
   */
  websocketProtocol: "WebSocket protocol",
  /**
   * @description Details text indicating how many bytes were transferred in a WebSocket message in the Performance panel.
   * @example {1024} PH1
   */
  webSocketBytes: "{PH1} byte(s)",
  /**
   * @description Details label indicating the data length of a WebSocket message in the Performance panel.
   */
  webSocketDataLength: "Data length"
};
var str_4 = i18n7.i18n.registerUIStrings("panels/timeline/components/DetailsView.ts", UIStrings4);
var i18nString4 = i18n7.i18n.getLocalizedString.bind(void 0, str_4);
function buildWarningElementsForEvent(event, parsedTrace) {
  const warnings = parsedTrace.data.Warnings.perEvent.get(event);
  const warningElements = [];
  if (!warnings) {
    return warningElements;
  }
  for (const warning of warnings) {
    const duration = Trace3.Helpers.Timing.microToMilli(Trace3.Types.Timing.Micro(event.dur || 0));
    const span = document.createElement("span");
    switch (warning) {
      case "FORCED_REFLOW": {
        const forcedReflowLink = Link.create(
          "https://developers.google.com/web/fundamentals/performance/rendering/avoid-large-complex-layouts-and-layout-thrashing#avoid-forced-synchronous-layouts",
          i18nString4(UIStrings4.forcedReflow),
          void 0,
          "forced-reflow"
        );
        span.appendChild(
          uiI18n.getFormatLocalizedString(str_4, UIStrings4.sIsALikelyPerformanceBottleneck, { PH1: forcedReflowLink })
        );
        break;
      }
      case "IDLE_CALLBACK_OVER_TIME": {
        if (!Trace3.Types.Events.isFireIdleCallback(event)) {
          break;
        }
        const exceededMs = i18n7.TimeUtilities.millisToString((duration || 0) - event.args.data["allottedMilliseconds"], true);
        span.textContent = i18nString4(UIStrings4.idleCallbackExecutionExtended, { PH1: exceededMs });
        break;
      }
      case "LONG_TASK": {
        const longTaskLink = Link.create(
          "https://web.dev/optimize-long-tasks/",
          i18nString4(UIStrings4.longTask),
          void 0,
          "long-tasks"
        );
        span.appendChild(uiI18n.getFormatLocalizedString(
          str_4,
          UIStrings4.sTookS,
          { PH1: longTaskLink, PH2: i18n7.TimeUtilities.millisToString(duration || 0, true) }
        ));
        break;
      }
      case "LONG_INTERACTION": {
        const longInteractionINPLink = Link.create("https://web.dev/inp", i18nString4(UIStrings4.longInteractionINP), void 0, "long-interaction");
        span.appendChild(uiI18n.getFormatLocalizedString(
          str_4,
          UIStrings4.sIsLikelyPoorPageResponsiveness,
          { PH1: longInteractionINPLink }
        ));
        break;
      }
      default: {
        Platform3.assertNever(warning, `Unhandled warning type ${warning}`);
      }
    }
    warningElements.push(span);
  }
  return warningElements;
}
function buildRowsForWebSocketEvent(event, parsedTrace) {
  const rows = [];
  const initiator = parsedTrace.data.Initiators.eventToInitiator.get(event);
  if (initiator && Trace3.Types.Events.isWebSocketCreate(initiator)) {
    rows.push({ key: i18n7.i18n.lockedString("URL"), value: initiator.args.data.url });
    if (initiator.args.data.websocketProtocol) {
      rows.push({ key: i18nString4(UIStrings4.websocketProtocol), value: initiator.args.data.websocketProtocol });
    }
  } else if (Trace3.Types.Events.isWebSocketCreate(event)) {
    rows.push({ key: i18n7.i18n.lockedString("URL"), value: event.args.data.url });
    if (event.args.data.websocketProtocol) {
      rows.push({ key: i18nString4(UIStrings4.websocketProtocol), value: event.args.data.websocketProtocol });
    }
  }
  if (Trace3.Types.Events.isWebSocketTransfer(event)) {
    if (event.args.data.dataLength) {
      rows.push({
        key: i18nString4(UIStrings4.webSocketDataLength),
        value: `${i18nString4(UIStrings4.webSocketBytes, { PH1: event.args.data.dataLength })}`
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
    if (reason === "unknown" && Trace3.Types.Events.isScheduleStyleInvalidationTracking(invalidation) && invalidation.args.data.invalidatedSelectorId) {
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
    if (reason === "PseudoClass" && Trace3.Types.Events.isStyleRecalcInvalidationTracking(invalidation) && invalidation.args.data.extraData) {
      reason += invalidation.args.data.extraData;
    }
    if (reason === "Attribute" && Trace3.Types.Events.isStyleRecalcInvalidationTracking(invalidation) && invalidation.args.data.extraData) {
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

// ../../front_end/panels/timeline/components/ExportTraceOptions.ts
var ExportTraceOptions_exports = {};
__export(ExportTraceOptions_exports, {
  ExportTraceOptions: () => ExportTraceOptions
});
import "../../../ui/kit/kit.js";
import "../../../ui/components/tooltips/tooltips.js";
import "../../../ui/components/buttons/buttons.js";
import * as Common from "../../../core/common/common.js";
import * as Host from "../../../core/host/host.js";
import * as i18n9 from "../../../core/i18n/i18n.js";
import * as Buttons2 from "../../../ui/components/buttons/buttons.js";
import * as Dialogs from "../../../ui/components/dialogs/dialogs.js";
import * as ComponentHelpers2 from "../../../ui/components/helpers/helpers.js";
import * as UI3 from "../../../ui/legacy/legacy.js";
import * as Lit3 from "../../../ui/lit/lit.js";

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
    height: var(--sys-size-11);
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

devtools-link {
  color: var(--sys-color-primary);
  text-decoration-line: underline;
}

/*# sourceURL=${import.meta.resolve("./exportTraceOptions.css")} */`;

// ../../front_end/panels/timeline/components/ExportTraceOptions.ts
var { html: html3 } = Lit3;
var UIStrings5 = {
  /**
   * @description Dialog title for saving a performance trace in the Performance panel.
   */
  exportTraceOptionsDialogTitle: "Save performance trace",
  /**
   * @description Tooltip text for the toolbar button that opens the save trace dialog in the Performance panel.
   */
  showExportTraceOptionsDialogTitle: "Save trace\u2026",
  /**
   * @description Checkbox label to include resource content when saving a trace in the Performance panel.
   */
  includeResourceContent: "Include resource content",
  /**
   * @description Checkbox label to include script source maps when saving a trace in the Performance panel.
   */
  includeSourcemap: "Include script source maps",
  /**
   * @description Checkbox label to include annotations when saving a trace in the Performance panel.
   */
  includeAnnotations: "Include annotations",
  /**
   * @description Checkbox label to compress the saved trace with gzip in the Performance panel.
   */
  shouldCompress: "Compress with gzip",
  /**
   * @description Link text to documentation explaining trace export options in the Performance panel.
   */
  explanation: "Explanation",
  /**
   * @description Button label to save the trace in the Performance panel.
   */
  saveButtonTitle: "Save",
  /**
   * @description Tooltip text explaining the privacy implications of including resource content when saving a trace in the Performance panel.
   */
  resourceContentPrivacyInfo: "Includes the full content of all loaded HTML, CSS, and scripts (except extensions).",
  /**
   * @description Tooltip text explaining the privacy implications of including script source maps when saving a trace in the Performance panel.
   */
  sourceMapsContentPrivacyInfo: "Includes available source maps, which may expose authored code.",
  /**
   * @description Accessible label prefix for the information button in the Performance panel.
   */
  moreInfoLabel: "More information:"
};
var str_5 = i18n9.i18n.registerUIStrings("panels/timeline/components/ExportTraceOptions.ts", UIStrings5);
var i18nString5 = i18n9.i18n.getLocalizedString.bind(void 0, str_5);
var checkboxesWithInfoDialog = /* @__PURE__ */ new Set(["resource-content", "script-source-maps"]);
var ExportTraceOptions = class _ExportTraceOptions extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #data = null;
  static #includeAnnotationsSettingString = "export-performance-trace-include-annotations";
  static #includeResourceContentSettingString = "export-performance-trace-include-resources";
  static #includeSourceMapsSettingString = "export-performance-trace-include-sourcemaps";
  static #shouldCompressSettingString = "export-performance-trace-should-compress";
  #includeAnnotationsSetting = Common.Settings.Settings.instance().createSetting(
    _ExportTraceOptions.#includeAnnotationsSettingString,
    true,
    Common.Settings.SettingStorageType.SESSION
  );
  #includeResourceContentSetting = Common.Settings.Settings.instance().createSetting(
    _ExportTraceOptions.#includeResourceContentSettingString,
    false,
    Common.Settings.SettingStorageType.SESSION
  );
  #includeSourceMapsSetting = Common.Settings.Settings.instance().createSetting(
    _ExportTraceOptions.#includeSourceMapsSettingString,
    false,
    Common.Settings.SettingStorageType.SESSION
  );
  #shouldCompressSetting = Common.Settings.Settings.instance().createSetting(
    _ExportTraceOptions.#shouldCompressSettingString,
    true,
    Common.Settings.SettingStorageType.SYNCED
  );
  #state = {
    dialogState: Dialogs.Dialog.DialogState.COLLAPSED,
    includeAnnotations: this.#includeAnnotationsSetting.get(),
    includeResourceContent: this.#includeResourceContentSetting.get(),
    includeSourceMaps: this.#includeSourceMapsSetting.get(),
    shouldCompress: this.#shouldCompressSetting.get()
  };
  #includeAnnotationsCheckbox = UI3.UIUtils.CheckboxLabel.create(
    /* title*/
    i18nString5(UIStrings5.includeAnnotations),
    /* checked*/
    this.#state.includeAnnotations,
    /* subtitle*/
    void 0,
    /* jslogContext*/
    "timeline.export-trace-options.annotations-checkbox"
  );
  #includeResourceContentCheckbox = UI3.UIUtils.CheckboxLabel.create(
    /* title*/
    i18nString5(UIStrings5.includeResourceContent),
    /* checked*/
    this.#state.includeResourceContent,
    /* subtitle*/
    void 0,
    /* jslogContext*/
    "timeline.export-trace-options.resource-content-checkbox"
  );
  #includeSourceMapsCheckbox = UI3.UIUtils.CheckboxLabel.create(
    /* title*/
    i18nString5(UIStrings5.includeSourcemap),
    /* checked*/
    this.#state.includeSourceMaps,
    /* subtitle*/
    void 0,
    /* jslogContext*/
    "timeline.export-trace-options.source-maps-checkbox"
  );
  #shouldCompressCheckbox = UI3.UIUtils.CheckboxLabel.create(
    /* title*/
    i18nString5(UIStrings5.shouldCompress),
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
    const newState = Object.assign({}, this.#state, { dialogState: Dialogs.Dialog.DialogState.EXPANDED });
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
      return i18nString5(UIStrings5.moreInfoLabel) + " " + i18nString5(UIStrings5.sourceMapsContentPrivacyInfo);
    }
    if (checkboxId === "resource-content") {
      return i18nString5(UIStrings5.moreInfoLabel) + " " + i18nString5(UIStrings5.resourceContentPrivacyInfo);
    }
    return "";
  }
  #renderCheckbox(checkboxId, checkboxWithLabel, title, checked) {
    UI3.Tooltip.Tooltip.install(checkboxWithLabel, title);
    checkboxWithLabel.ariaLabel = title;
    checkboxWithLabel.checked = checked;
    checkboxWithLabel.addEventListener(
      "change",
      this.#checkboxOptionChanged.bind(this, checkboxWithLabel, !checked),
      false
    );
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
              .variant=${Buttons2.Button.Variant.ICON}
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
        ${checkboxId === "resource-content" ? i18nString5(UIStrings5.resourceContentPrivacyInfo) : Lit3.nothing}
        ${checkboxId === "script-source-maps" ? i18nString5(UIStrings5.sourceMapsContentPrivacyInfo) : Lit3.nothing}
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
      variant: Buttons2.Button.Variant.TOOLBAR,
      iconName: "download",
      disabled: !this.#data?.buttonEnabled,
      iconTitle: i18nString5(UIStrings5.showExportTraceOptionsDialogTitle),
      horizontalAlignment: Dialogs.Dialog.DialogHorizontalAlignment.AUTO,
      closeButton: false,
      dialogTitle: i18nString5(UIStrings5.exportTraceOptionsDialogTitle),
      state: this.#state.dialogState,
      closeOnESC: true
    }}>
        <div class='export-trace-options-content'>

          ${this.#state.displayAnnotationsCheckbox ? this.#renderCheckbox(
      "annotations",
      this.#includeAnnotationsCheckbox,
      i18nString5(UIStrings5.includeAnnotations),
      this.#state.includeAnnotations
    ) : ""}
          ${this.#state.displayResourceContentCheckbox ? this.#renderCheckbox(
      "resource-content",
      this.#includeResourceContentCheckbox,
      i18nString5(UIStrings5.includeResourceContent),
      this.#state.includeResourceContent
    ) : ""}
          ${this.#state.displayResourceContentCheckbox && this.#state.displaySourceMapsCheckbox ? this.#renderCheckbox(
      "script-source-maps",
      this.#includeSourceMapsCheckbox,
      i18nString5(UIStrings5.includeSourcemap),
      this.#state.includeSourceMaps
    ) : ""}
          ${this.#renderCheckbox("compress-with-gzip", this.#shouldCompressCheckbox, i18nString5(UIStrings5.shouldCompress), this.#state.shouldCompress)}
          <div class='export-trace-options-row export-trace-options-row-last'>
            <div class="export-trace-explanation">
              <devtools-link
                href="https://developer.chrome.com/docs/devtools/performance/save-trace"
                class=devtools-link
                .jslogContext=${"save-trace-explanation"}>
                  ${i18nString5(UIStrings5.explanation)}
              </devtools-link>
            </div>
            <devtools-button
                  class="setup-button"
                  data-export-button
                  @click=${this.#onExportClick.bind(this)}
                  .data=${{
      variant: Buttons2.Button.Variant.PRIMARY,
      title: i18nString5(UIStrings5.saveButtonTitle)
    }}
                >${i18nString5(UIStrings5.saveButtonTitle)}</devtools-button>
                </div>
          ${this.#state.displayResourceContentCheckbox ? this.#renderInfoTooltip("resource-content") : Lit3.nothing}
          ${this.#state.displayResourceContentCheckbox && this.#state.displaySourceMapsCheckbox ? this.#renderInfoTooltip("script-source-maps") : Lit3.nothing}
        </div>
      </devtools-button-dialog>
    `;
    Lit3.render(output, this.#shadow, { host: this });
  }
  async #onButtonDialogClick() {
    this.state = Object.assign({}, this.#state, { dialogState: Dialogs.Dialog.DialogState.EXPANDED });
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
    this.state = Object.assign({}, this.#state, { dialogState: Dialogs.Dialog.DialogState.COLLAPSED });
  }
};
customElements.define("devtools-perf-export-trace-options", ExportTraceOptions);

// ../../front_end/panels/timeline/components/FieldSettingsDialog.ts
var FieldSettingsDialog_exports = {};
__export(FieldSettingsDialog_exports, {
  FieldSettingsDialog: () => FieldSettingsDialog,
  ShowDialog: () => ShowDialog
});
import "../../../ui/kit/kit.js";
import * as i18n13 from "../../../core/i18n/i18n.js";
import * as CrUXManager5 from "../../../models/crux-manager/crux-manager.js";
import * as Buttons3 from "../../../ui/components/buttons/buttons.js";
import * as Dialogs2 from "../../../ui/components/dialogs/dialogs.js";
import * as ComponentHelpers3 from "../../../ui/components/helpers/helpers.js";
import * as Input2 from "../../../ui/components/input/input.js";
import * as uiI18n2 from "../../../ui/i18n/i18n.js";
import * as UI5 from "../../../ui/legacy/legacy.js";
import * as Lit5 from "../../../ui/lit/lit.js";
import * as VisualLogging4 from "../../../ui/visual_logging/visual_logging.js";

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
  margin: var(--sys-size-5) 0;
}

.url-override {
  margin: var(--sys-size-5) 0;
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
  border: var(--sys-size-1) solid var(--sys-color-divider);
  margin-top: var(--sys-size-5);
}

.origin-mapping-description {
  margin-bottom: var(--sys-size-5);
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
  margin: var(--sys-size-3) 0 var(--sys-size-7);
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
  height: var(--sys-size-6);
  width: var(--sys-size-6);
  min-height: var(--sys-size-6);
  min-width: var(--sys-size-6);
  margin: var(--sys-size-4);
}

input[type="text"][disabled] {
  color: var(--sys-color-state-disabled);
}

.warning {
  margin: var(--sys-size-2) var(--sys-size-5);
  color: var(--color-error-text);
}

devtools-link {
  color: var(--sys-color-primary);
  text-decoration-line: underline;
}

.divider {
  margin: 10px 0;
  border: none;
  border-top: var(--sys-size-1) solid var(--sys-color-divider);
}

/*# sourceURL=${import.meta.resolve("./fieldSettingsDialog.css")} */`;

// ../../front_end/panels/timeline/components/OriginMap.ts
var OriginMap_exports = {};
__export(OriginMap_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW,
  OriginMap: () => OriginMap
});
import "../../../ui/kit/kit.js";
import "../../../ui/legacy/components/data_grid/data_grid.js";
import * as i18n11 from "../../../core/i18n/i18n.js";
import * as SDK from "../../../core/sdk/sdk.js";
import * as CrUXManager3 from "../../../models/crux-manager/crux-manager.js";
import * as RenderCoordinator from "../../../ui/components/render_coordinator/render_coordinator.js";
import * as UI4 from "../../../ui/legacy/legacy.js";
import * as Lit4 from "../../../ui/lit/lit.js";

// gen/front_end/panels/timeline/components/originMap.css.js
var originMap_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.origin-warning-icon {
  width: var(--sys-size-8);
  height: var(--sys-size-8);
  margin-right: var(--sys-size-3);
  color: var(--icon-warning);
}

.origin {
  text-overflow: ellipsis;
  overflow-x: hidden;
}

.error-message {
  color: var(--sys-color-error);
  margin-top: var(--sys-size-5);
  font-weight: var(--ref-typeface-weight-medium);
  white-space: pre-wrap;
}

/*# sourceURL=${import.meta.resolve("./originMap.css")} */`;

// ../../front_end/panels/timeline/components/OriginMap.ts
var { html: html4 } = Lit4;
var UIStrings6 = {
  /**
   * @description Column header for development origin in the origin mapping table of the Performance panel.
   */
  developmentOrigin: "Development origin",
  /**
   * @description Column header for production origin in the origin mapping table of the Performance panel.
   */
  productionOrigin: "Production origin",
  /**
   * @description Warning message explaining that an entered origin is not a valid origin or URL in the Performance panel.
   * @example {http//malformed.com} PH1
   */
  invalidOrigin: '"{PH1}" isn\u2019t a valid origin or URL.',
  /**
   * @description Warning message explaining that a development origin is already mapped to a production origin in the Performance panel.
   * @example {https://example.com} PH1
   */
  alreadyMapped: '"{PH1}" is already mapped to a production origin.',
  /**
   * @description Warning message explaining that a page does not have enough real user data in the Performance panel.
   */
  pageHasNoData: "The Chrome UX Report doesn\u2019t have enough real user data for this page."
};
var str_6 = i18n11.i18n.registerUIStrings("panels/timeline/components/OriginMap.ts", UIStrings6);
var i18nString6 = i18n11.i18n.getLocalizedString.bind(void 0, str_6);
var DEV_ORIGIN_CONTROL = "developmentOrigin";
var PROD_ORIGIN_CONTROL = "productionOrigin";
function renderOriginWarning(input, url) {
  return RenderCoordinator.write(async () => {
    if (!input.isCrUXEnabled) {
      return Lit4.nothing;
    }
    const result = await input.getFieldDataForPage(url);
    const hasFieldData = Object.entries(result).some(([key, value2]) => {
      if (key === "warnings") {
        return false;
      }
      return Boolean(value2);
    });
    if (hasFieldData) {
      return Lit4.nothing;
    }
    return html4`
      <devtools-icon
        class="origin-warning-icon"
        name="warning-filled"
        title=${i18nString6(UIStrings6.pageHasNoData)}
      ></devtools-icon>
    `;
  });
}
function renderItem(input, originMapping, index) {
  const warningIcon = Lit4.Directives.until(renderOriginWarning(input, originMapping.productionOrigin));
  return html4`
    <tr data-index=${index} @edit=${input.onCommitEdit} @delete=${input.onRemoveItemRequested}>
      <td data-value=${originMapping.developmentOrigin}>
        <div class="origin" title=${originMapping.developmentOrigin}>${originMapping.developmentOrigin}</div>
      </td>
      <td data-value=${originMapping.productionOrigin}>
        ${warningIcon}
        <div class="origin" title=${originMapping.productionOrigin}>${originMapping.productionOrigin}</div>
      </td>
    </tr>
  `;
}
var DEFAULT_VIEW = (input, _output, target) => {
  if (!input.prefillDevelopmentOrigin && input.mappings.length === 0) {
    Lit4.render(Lit4.nothing, target);
    return;
  }
  Lit4.render(html4`
    <devtools-data-grid striped inline
        @click=${(e) => {
    e.stopPropagation();
  }}
        @create=${input.onCreate}>
      <table>
        <tr>
          <th id=${DEV_ORIGIN_CONTROL} editable weight="1">${i18nString6(UIStrings6.developmentOrigin)}</th>
          <th id=${PROD_ORIGIN_CONTROL} editable weight="1">${i18nString6(UIStrings6.productionOrigin)}</th>
        </tr>
        ${input.mappings.map((mapping, index) => renderItem(input, mapping, index))}
        ${input.prefillDevelopmentOrigin ? html4`
          <tr placeholder>
            <td>${input.prefillDevelopmentOrigin}</td>
            <td></td>
          </tr>` : Lit4.nothing}
      </table>
    </devtools-data-grid>
    ${input.errorMessage ? html4`<div class="error-message">${input.errorMessage}</div>` : Lit4.nothing}
  `, target);
};
var OriginMap = class extends UI4.Widget.VBox {
  #view;
  #errorMessage = "";
  #prefillDevelopmentOrigin = "";
  constructor(element, view = DEFAULT_VIEW) {
    super(element, { useShadowDom: true });
    this.#view = view;
    this.registerRequiredCSS(originMap_css_default);
    CrUXManager3.CrUXManager.instance().getConfigSetting().addChangeListener(this.requestUpdate, this);
    this.requestUpdate();
  }
  performUpdate() {
    const input = {
      mappings: this.#pullMappingsFromSetting(),
      prefillDevelopmentOrigin: this.#prefillDevelopmentOrigin,
      errorMessage: this.#errorMessage,
      isCrUXEnabled: CrUXManager3.CrUXManager.instance().isEnabled(),
      getFieldDataForPage: (url) => CrUXManager3.CrUXManager.instance().getFieldDataForPage(url),
      onCommitEdit: this.#commitEdit.bind(this),
      onRemoveItemRequested: this.#removeItemRequested.bind(this),
      onCreate: this.#onCreate.bind(this)
    };
    this.#view(input, void 0, this.contentElement);
  }
  #pullMappingsFromSetting() {
    return CrUXManager3.CrUXManager.instance().getConfigSetting().get().originMappings || [];
  }
  #pushMappingsToSetting(originMappings) {
    const setting = CrUXManager3.CrUXManager.instance().getConfigSetting();
    const settingCopy = { ...setting.get() };
    settingCopy.originMappings = originMappings;
    setting.set(settingCopy);
  }
  #getOrigin(url) {
    try {
      return new URL(url).origin;
    } catch {
      return null;
    }
  }
  startCreation() {
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const inspectedURL = targetManager.inspectedURL();
    const currentOrigin = this.#getOrigin(inspectedURL) || "";
    this.#prefillDevelopmentOrigin = currentOrigin;
    this.requestUpdate();
  }
  #removeItemRequested(event) {
    const target = event.currentTarget;
    const index = Number.parseInt(target.dataset.index ?? "-1", 10);
    if (index < 0) {
      return;
    }
    const mappings = this.#pullMappingsFromSetting();
    mappings.splice(index, 1);
    this.#pushMappingsToSetting(mappings);
  }
  #commitEdit(event) {
    const target = event.currentTarget;
    const index = Number.parseInt(target.dataset.index ?? "-1", 10);
    if (index < 0) {
      return;
    }
    const mappings = this.#pullMappingsFromSetting();
    const originMapping = mappings[index];
    const isDevOrigin = event.detail.columnId === DEV_ORIGIN_CONTROL;
    let errorMessage = null;
    if (isDevOrigin) {
      errorMessage = this.#developmentValidator(event.detail.newText, index);
    } else {
      errorMessage = this.#productionValidator(event.detail.newText);
    }
    if (errorMessage) {
      this.#errorMessage = errorMessage;
      this.requestUpdate();
      return;
    }
    this.#errorMessage = "";
    if (isDevOrigin) {
      originMapping.developmentOrigin = this.#getOrigin(event.detail.newText) || "";
    } else {
      originMapping.productionOrigin = this.#getOrigin(event.detail.newText) || "";
    }
    this.#pushMappingsToSetting(mappings);
  }
  #developmentValidator(value2, indexToIgnore) {
    const origin = this.#getOrigin(value2);
    if (!origin) {
      return i18nString6(UIStrings6.invalidOrigin, { PH1: value2 });
    }
    const mappings = this.#pullMappingsFromSetting();
    for (let i = 0; i < mappings.length; ++i) {
      if (i === indexToIgnore) {
        continue;
      }
      const mapping = mappings[i];
      if (mapping.developmentOrigin === origin) {
        return i18nString6(UIStrings6.alreadyMapped, { PH1: origin });
      }
    }
    return null;
  }
  #productionValidator(value2) {
    const origin = this.#getOrigin(value2);
    if (!origin) {
      return i18nString6(UIStrings6.invalidOrigin, { PH1: value2 });
    }
    return null;
  }
  #onCreate(event) {
    const devOrigin = event.detail[DEV_ORIGIN_CONTROL] ?? "";
    const prodOrigin = event.detail[PROD_ORIGIN_CONTROL] ?? "";
    if (!devOrigin && !prodOrigin || devOrigin === this.#prefillDevelopmentOrigin && !prodOrigin) {
      this.#prefillDevelopmentOrigin = "";
      this.#errorMessage = "";
      this.requestUpdate();
      return;
    }
    const errors = [this.#developmentValidator(devOrigin), this.#productionValidator(prodOrigin)].filter(Boolean);
    if (errors.length > 0) {
      this.#errorMessage = errors.join("\n");
      this.requestUpdate();
      return;
    }
    this.#errorMessage = "";
    this.#prefillDevelopmentOrigin = "";
    const mappings = this.#pullMappingsFromSetting();
    mappings.push({
      developmentOrigin: this.#getOrigin(devOrigin) || "",
      productionOrigin: this.#getOrigin(prodOrigin) || ""
    });
    this.#pushMappingsToSetting(mappings);
  }
};

// ../../front_end/panels/timeline/components/FieldSettingsDialog.ts
var UIStrings7 = {
  /**
   * @description Button label that opens a dialog to set up field metrics in the Performance panel.
   */
  setUp: "Set up",
  /**
   * @description Button label that opens a dialog to configure field metrics in the Performance panel.
   */
  configure: "Configure",
  /**
   * @description Button label that enables the collection of field metrics in the Performance panel.
   */
  ok: "Ok",
  /**
   * @description Button label that opts out of the collection of field metrics in the Performance panel.
   */
  optOut: "Opt out",
  /**
   * @description Button label that cancels the setup of field metrics collection in the Performance panel.
   */
  cancel: "Cancel",
  /**
   * @description Checkbox label that controls if a manual URL override is enabled for field metrics in the Performance panel.
   */
  onlyFetchFieldData: "Always show field metrics for the below URL",
  /**
   * @description Label for a text input that contains the manual override URL for fetching field metrics in the Performance panel.
   */
  url: "URL",
  /**
   * @description Warning message explaining that the Chrome UX Report could not find enough real-world speed data for the page in the Performance panel.
   */
  doesNotHaveSufficientData: "The Chrome UX Report doesn\u2019t have enough real-world speed data for this page.",
  /**
   * @description Title for a dialog that contains settings related to fetching field metrics in the Performance panel.
   */
  configureFieldData: "Configure field metrics fetching",
  /**
   * @description Explanation of where field metrics come from and how they can be used in the Performance panel.
   * @example {Chrome UX Report} PH1
   */
  fetchAggregated: "Fetch aggregated field metrics from the {PH1} to help you contextualize local measurements with what real users experience on the site.",
  /**
   * @description Heading for a section that explains what user data needs to be collected to fetch field metrics in the Performance panel.
   */
  privacyDisclosure: "Privacy disclosure",
  /**
   * @description Explanation of what data is sent to Google to fetch field metrics in the Performance panel.
   */
  whenPerformanceIsShown: "When DevTools is open, the URLs you visit will be sent to Google to query field metrics. These requests aren\u2019t tied to your Google account.",
  /**
   * @description Header for a section containing advanced settings in the Performance panel.
   */
  advanced: "Advanced",
  /**
   * @description Explanation of how associating a development origin with a production origin works for fetching real user data in the Performance panel.
   */
  mapDevelopmentOrigins: "Set a development origin to automatically get relevant field metrics for its production origin.",
  /**
   * @description Button label to add a new editable row to the origin mapping table in the Performance panel.
   */
  new: "New",
  /**
   * @description Warning message explaining that an entered origin is not a valid origin or URL in the Performance panel.
   * @example {http//malformed.com} PH1
   */
  invalidOrigin: '"{PH1}" isn\u2019t a valid origin or URL.'
};
var str_7 = i18n13.i18n.registerUIStrings("panels/timeline/components/FieldSettingsDialog.ts", UIStrings7);
var i18nString7 = i18n13.i18n.getLocalizedString.bind(void 0, str_7);
var { html: html5, nothing: nothing5, Directives: { ifDefined } } = Lit5;
var { widget, widgetRef } = UI5.Widget;
var ShowDialog = class _ShowDialog extends Event {
  static eventName = "showdialog";
  constructor() {
    super(_ShowDialog.eventName);
  }
};
var FieldSettingsDialog = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #dialog;
  #configSetting = CrUXManager5.CrUXManager.instance().getConfigSetting();
  #urlOverride = "";
  #urlOverrideEnabled = false;
  #urlOverrideWarning = "";
  #originMap;
  constructor() {
    super();
    const cruxManager = CrUXManager5.CrUXManager.instance();
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
    const value2 = this.#configSetting.get();
    this.#configSetting.set({
      ...value2,
      enabled,
      override: this.#urlOverride,
      overrideEnabled: this.#urlOverrideEnabled
    });
  }
  #onSettingsChanged() {
    void ComponentHelpers3.ScheduledRender.scheduleRender(this, this.#render);
  }
  async #urlHasFieldData(url) {
    const cruxManager = CrUXManager5.CrUXManager.instance();
    const result = await cruxManager.getFieldDataForPage(url);
    return Object.entries(result).some(([key, value2]) => {
      if (key === "warnings") {
        return false;
      }
      return Boolean(value2);
    });
  }
  async #submit(enabled) {
    if (enabled && this.#urlOverrideEnabled) {
      const origin = this.#getOrigin(this.#urlOverride);
      if (!origin) {
        this.#urlOverrideWarning = i18nString7(UIStrings7.invalidOrigin, { PH1: this.#urlOverride });
        void ComponentHelpers3.ScheduledRender.scheduleRender(this, this.#render);
        return;
      }
      const hasFieldData = await this.#urlHasFieldData(this.#urlOverride);
      if (!hasFieldData) {
        this.#urlOverrideWarning = i18nString7(UIStrings7.doesNotHaveSufficientData);
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
        variant: Buttons3.Button.Variant.OUTLINED,
        title: i18nString7(UIStrings7.configure)
      }}
        jslog=${VisualLogging4.action("timeline.field-data.configure").track({ click: true })}
        >${i18nString7(UIStrings7.configure)}</devtools-button>
      `;
    }
    return html5`
      <devtools-button
        class="setup-button"
        @click=${this.#showDialog}
        .data=${{
      variant: Buttons3.Button.Variant.PRIMARY,
      title: i18nString7(UIStrings7.setUp)
    }}
        jslog=${VisualLogging4.action("timeline.field-data.setup").track({ click: true })}
        data-field-data-setup
      >${i18nString7(UIStrings7.setUp)}</devtools-button>
    `;
  }
  #renderEnableButton() {
    return html5`
      <devtools-button
        @click=${() => {
      void this.#submit(true);
    }}
        .data=${{
      variant: Buttons3.Button.Variant.PRIMARY,
      title: i18nString7(UIStrings7.ok)
    }}
        class="enable"
        jslog=${VisualLogging4.action("timeline.field-data.enable").track({ click: true })}
        data-field-data-enable
      >${i18nString7(UIStrings7.ok)}</devtools-button>
    `;
  }
  #renderDisableButton() {
    const label = this.#configSetting.get().enabled ? i18nString7(UIStrings7.optOut) : i18nString7(UIStrings7.cancel);
    return html5`
      <devtools-button
        @click=${() => {
      void this.#submit(false);
    }}
        .data=${{
      variant: Buttons3.Button.Variant.OUTLINED,
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
      <div class="origin-mapping-description">${i18nString7(UIStrings7.mapDevelopmentOrigins)}</div>
      <devtools-widget ${widget(OriginMap)} ${widgetRef(OriginMap, (el) => {
      this.#originMap = el;
    })}>
      </devtools-widget>
      <div class="origin-mapping-button-section">
        <devtools-button
          @click=${() => this.#originMap?.startCreation()}
          .data=${{
      variant: Buttons3.Button.Variant.TEXT,
      title: i18nString7(UIStrings7.new),
      iconName: "plus"
    }}
          jslogContext="new-origin-mapping"
        >${i18nString7(UIStrings7.new)}</devtools-button>
      </div>
    `;
  }
  #render = () => {
    const output = html5`
      <style>${fieldSettingsDialog_css_default}</style>
      <style>${Input2.textInputStyles}</style>
      <style>${Input2.checkboxStyles}</style>
      <div class="open-button-section">${this.#renderOpenButton()}</div>
      <devtools-dialog
        @clickoutsidedialog=${this.#closeDialog}
        .position=${Dialogs2.Dialog.DialogVerticalPosition.AUTO}
        .horizontalAlignment=${Dialogs2.Dialog.DialogHorizontalAlignment.CENTER}
        .jslogContext=${"timeline.field-data.settings"}
        .expectedMutationsSelector=${".timeline-settings-pane option"}
        .dialogTitle=${i18nString7(UIStrings7.configureFieldData)}
        ${Lit5.Directives.ref((el) => {
      if (el instanceof HTMLElement) {
        this.#dialog = el;
      }
    })}
      >
        <div class="content">
          <div>
            ${uiI18n2.getFormatLocalizedStringTemplate(
      str_7,
      UIStrings7.fetchAggregated,
      {
        PH1: html5`<devtools-link
                  href="https://developer.chrome.com/docs/crux"
                  >${i18n13.i18n.lockedString("Chrome UX Report")}</devtools-link
                >`
      }
    )}
          </div>
          <div class="privacy-disclosure">
            <h3 class="section-title">${i18nString7(UIStrings7.privacyDisclosure)}</h3>
            <div>${i18nString7(UIStrings7.whenPerformanceIsShown)}</div>
          </div>
          <details aria-label=${i18nString7(UIStrings7.advanced)}>
            <summary>${i18nString7(UIStrings7.advanced)}</summary>
            <div class="advanced-section-contents">
              ${this.#renderOriginMapGrid()}
              <hr class="divider">
              <label class="url-override">
                <input
                  type="checkbox"
                  .checked=${this.#urlOverrideEnabled}
                  @change=${this.#onUrlOverrideEnabledChange}
                  aria-label=${i18nString7(UIStrings7.onlyFetchFieldData)}
                  jslog=${VisualLogging4.toggle().track({ click: true }).context("field-url-override-enabled")}
                />
                ${i18nString7(UIStrings7.onlyFetchFieldData)}
              </label>
              <input
                type="text"
                @keyup=${this.#onUrlOverrideChange}
                @change=${this.#onUrlOverrideChange}
                class="devtools-text-input"
                .disabled=${!this.#urlOverrideEnabled}
                .value=${this.#urlOverride}
                placeholder=${ifDefined(this.#urlOverrideEnabled ? i18nString7(UIStrings7.url) : void 0)}
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

// ../../front_end/panels/timeline/components/IgnoreListSetting.ts
var IgnoreListSetting_exports = {};
__export(IgnoreListSetting_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW2,
  IgnoreListSetting: () => IgnoreListSetting,
  regexInputIsValid: () => regexInputIsValid
});
import "../../../ui/components/menus/menus.js";
import * as Common2 from "../../../core/common/common.js";
import * as i18n15 from "../../../core/i18n/i18n.js";
import * as Platform4 from "../../../core/platform/platform.js";
import * as Workspace from "../../../models/workspace/workspace.js";
import * as Buttons4 from "../../../ui/components/buttons/buttons.js";
import * as Dialogs3 from "../../../ui/components/dialogs/dialogs.js";
import * as UI6 from "../../../ui/legacy/legacy.js";
import * as Lit6 from "../../../ui/lit/lit.js";

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
    height: var(--sys-size-11);
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
    border: var(--sys-size-1) solid var(--sys-color-neutral-outline);
    border-radius: var(--sys-shape-corner-extra-small);
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

// ../../front_end/panels/timeline/components/IgnoreListSetting.ts
var { html: html6, Directives: Directives4 } = Lit6;
var { live } = Directives4;
var UIStrings8 = {
  /**
   * @description Tooltip text for the button to open the ignore list settings dialog in the Performance panel.
   */
  showIgnoreListSettingDialog: "Show ignore list setting dialog",
  /**
   * @description Header title for the ignore list settings dialog in the Performance panel.
   */
  ignoreList: "Ignore list",
  /**
   * @description Description text in the ignore list settings dialog of the Performance panel.
   */
  ignoreListDescription: "Add regular expression rules to remove matching scripts from the flame chart.",
  /**
   * @description Label for a pattern rule in the ignore list settings dialog of the Performance panel.
   * @example {ad.*?} regex
   */
  ignoreScriptsWhoseNamesMatchS: "Ignore scripts whose names match ''{regex}''",
  /**
   * @description Accessible label for the button to remove a regular expression rule in the ignore list settings dialog of the Performance panel.
   * @example {ad.*?} regex
   */
  removeRegex: "Remove the regex: ''{regex}''",
  /**
   * @description Accessible label for the text input to add a regular expression rule in the ignore list settings dialog of the Performance panel.
   */
  addNewRegex: "Add a regular expression rule for the script\u2019s URL",
  /**
   * @description Accessible label for the checkbox to enable a new regular expression rule in the ignore list settings dialog of the Performance panel.
   */
  ignoreScriptsWhoseNamesMatchNewRegex: "Ignore scripts whose names match the new regex"
};
var str_8 = i18n15.i18n.registerUIStrings("panels/timeline/components/IgnoreListSetting.ts", UIStrings8);
var i18nString8 = i18n15.i18n.getLocalizedString.bind(void 0, str_8);
var DEFAULT_VIEW2 = (input, output, target) => {
  const {
    ignoreListEnabled,
    regexes,
    newRegexValue,
    newRegexChecked,
    onExistingRegexEnableToggle,
    onRemoveRegexByIndex,
    onNewRegexInputBlur,
    onNewRegexInputChange,
    onNewRegexInputFocus,
    onNewRegexAdd,
    onNewRegexCancel
  } = input;
  function renderItem2(regex, index) {
    const helpText = i18nString8(UIStrings8.ignoreScriptsWhoseNamesMatchS, { regex: regex.pattern });
    return html6`
      <div class='regex-row'>
        <devtools-checkbox title=${helpText} aria-label=${helpText} ?checked=${!regex.disabled}
          @change=${(event) => onExistingRegexEnableToggle(regex, event.currentTarget.checked)}
          .jslogContext=${"timeline.ignore-list-pattern"}>${regex.pattern}</devtools-checkbox>
        <devtools-button
            @click=${() => onRemoveRegexByIndex(index)}
            .data=${{
      variant: Buttons4.Button.Variant.ICON,
      iconName: "bin",
      title: i18nString8(UIStrings8.removeRegex, { regex: regex.pattern }),
      jslogContext: "timeline.ignore-list-pattern.remove"
    }}>
        </devtools-button>
      </div>
    `;
  }
  Lit6.render(html6`
    <style>${ignoreListSetting_css_default}</style>
    <devtools-button-dialog
      @contextmenu=${(e) => e.stopPropagation()}
      .data=${{
    openOnRender: false,
    jslogContext: "timeline.ignore-list",
    variant: Buttons4.Button.Variant.TOOLBAR,
    iconName: "compress",
    disabled: !ignoreListEnabled,
    iconTitle: i18nString8(UIStrings8.showIgnoreListSettingDialog),
    horizontalAlignment: Dialogs3.Dialog.DialogHorizontalAlignment.AUTO,
    closeButton: true,
    dialogTitle: i18nString8(UIStrings8.ignoreList)
  }}>
      <div class='ignore-list-setting-content'>
        <div class='ignore-list-setting-description'>${i18nString8(UIStrings8.ignoreListDescription)}</div>
        ${regexes.map(renderItem2)}

        <div class='new-regex-row'>
          <devtools-checkbox
            title=${i18nString8(UIStrings8.ignoreScriptsWhoseNamesMatchNewRegex)}
            .jslogContext=${"timeline.ignore-list-new-regex.checkbox"}
            .checked=${newRegexChecked}
          >
          </devtools-checkbox>
          <input
            @blur=${(event) => onNewRegexInputBlur(event.currentTarget.value)}
            @input=${(event) => onNewRegexInputChange(event.currentTarget.value)}
            @focus=${(event) => onNewRegexInputFocus(event.currentTarget.value)}
            @keydown=${(event) => {
    const el = event.currentTarget;
    if (event.key === Platform4.KeyboardUtilities.ENTER_KEY) {
      onNewRegexAdd(el.value);
    } else if (event.key === Platform4.KeyboardUtilities.ESCAPE_KEY) {
      onNewRegexCancel();
      el.blur();
      event.stopImmediatePropagation();
    }
  }}
            class="harmony-input new-regex-text-input"
            title=${i18nString8(UIStrings8.addNewRegex)}
            placeholder='/framework\\.js$'
            .value=${live(newRegexValue)}
            .jslogContext=${"timeline.ignore-list-new-regex.text"}>
        </div>
      </div>
    </devtools-button-dialog>
  `, target);
};
var IgnoreListSetting = class _IgnoreListSetting extends UI6.Widget.Widget {
  static createWidgetElement() {
    const widgetElement = document.createElement("devtools-widget");
    new _IgnoreListSetting(widgetElement);
    return widgetElement;
  }
  #view;
  #ignoreListEnabled = Common2.Settings.Settings.instance().resolve(Workspace.IgnoreListManager.enableIgnoreListingSettingDescriptor);
  #regexPatterns = this.#getSkipStackFramesPatternSetting().getAsArray();
  #newRegexValue = "";
  #newRegexChecked = false;
  #editingRegexSetting = null;
  constructor(element, view = DEFAULT_VIEW2) {
    super(element, { useShadowDom: true });
    this.#view = view;
    this.element.classList.remove("vbox", "flex-auto");
    Common2.Settings.Settings.instance().resolve(Workspace.IgnoreListManager.skipStackFramesPatternSettingDescriptor).addChangeListener(this.requestUpdate.bind(this));
    Common2.Settings.Settings.instance().resolve(Workspace.IgnoreListManager.enableIgnoreListingSettingDescriptor).addChangeListener(this.requestUpdate.bind(this));
    this.requestUpdate();
  }
  #getSkipStackFramesPatternSetting() {
    return Common2.Settings.Settings.instance().resolve(
      Workspace.IgnoreListManager.skipStackFramesPatternSettingDescriptor
    );
  }
  #onNewRegexInputFocus(value2) {
    this.#editingRegexSetting = { pattern: value2, disabled: false };
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
    this.#newRegexValue = "";
    this.#newRegexChecked = false;
    this.requestUpdate();
  }
  #onNewRegexInputBlur(value2) {
    const newRegex = value2.trim();
    this.#finishEditing();
    if (!regexInputIsValid(newRegex)) {
      return;
    }
    Workspace.IgnoreListManager.IgnoreListManager.instance().addRegexToIgnoreList(newRegex);
    this.#resetInput();
  }
  #onNewRegexAdd(value2) {
    this.#onNewRegexInputBlur(value2);
    this.#onNewRegexInputFocus("");
  }
  #onNewRegexCancel() {
    this.#finishEditing();
    this.#resetInput();
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
  #onNewRegexInputChange(value2) {
    const newRegex = value2.trim();
    this.#newRegexValue = newRegex;
    if (this.#editingRegexSetting && regexInputIsValid(newRegex)) {
      this.#editingRegexSetting.pattern = newRegex;
      this.#editingRegexSetting.disabled = !Boolean(newRegex);
      this.#getSkipStackFramesPatternSetting().setAsArray(this.#regexPatterns);
    }
  }
  /**
   * Deal with an existing regex being toggled. Note that this handler only
   * deals with enabling/disabling regexes already in the ignore list, it does
   * not deal with enabling/disabling the new regex.
   */
  #onExistingRegexEnableToggle(regex, checked) {
    regex.disabled = !checked;
    this.#getSkipStackFramesPatternSetting().setAsArray(this.#regexPatterns);
  }
  #onRemoveRegexByIndex(index) {
    this.#regexPatterns.splice(index, 1);
    this.#getSkipStackFramesPatternSetting().setAsArray(this.#regexPatterns);
  }
  performUpdate() {
    const input = {
      ignoreListEnabled: this.#ignoreListEnabled.get(),
      regexes: this.#getExistingRegexes(),
      newRegexValue: this.#newRegexValue,
      newRegexChecked: this.#newRegexChecked,
      onExistingRegexEnableToggle: this.#onExistingRegexEnableToggle.bind(this),
      onRemoveRegexByIndex: this.#onRemoveRegexByIndex.bind(this),
      onNewRegexInputBlur: this.#onNewRegexInputBlur.bind(this),
      onNewRegexInputChange: this.#onNewRegexInputChange.bind(this),
      onNewRegexInputFocus: this.#onNewRegexInputFocus.bind(this),
      onNewRegexAdd: this.#onNewRegexAdd.bind(this),
      onNewRegexCancel: this.#onNewRegexCancel.bind(this)
    };
    this.#view(input, void 0, this.contentElement);
  }
};
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

// ../../front_end/panels/timeline/components/InteractionBreakdown.ts
var InteractionBreakdown_exports = {};
__export(InteractionBreakdown_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW3,
  InteractionBreakdown: () => InteractionBreakdown
});
import * as i18n17 from "../../../core/i18n/i18n.js";
import * as UI7 from "../../../ui/legacy/legacy.js";
import * as Lit7 from "../../../ui/lit/lit.js";

// gen/front_end/panels/timeline/components/interactionBreakdown.css.js
var interactionBreakdown_css_default = `/*
 * Copyright 2023 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
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
}

/*# sourceURL=${import.meta.resolve("./interactionBreakdown.css")} */`;

// ../../front_end/panels/timeline/components/InteractionBreakdown.ts
var { html: html7 } = Lit7;
var UIStrings9 = {
  /**
   * @description Label for the input delay phase of an interaction event in the event details view of the Performance panel.
   */
  inputDelay: "Input delay",
  /**
   * @description Label for the processing duration phase of an interaction event in the event details view of the Performance panel.
   */
  processingDuration: "Processing duration",
  /**
   * @description Label for the presentation delay phase of an interaction event in the event details view of the Performance panel.
   */
  presentationDelay: "Presentation delay"
};
var str_9 = i18n17.i18n.registerUIStrings("panels/timeline/components/InteractionBreakdown.ts", UIStrings9);
var i18nString9 = i18n17.i18n.getLocalizedString.bind(void 0, str_9);
var DEFAULT_VIEW3 = (input, output, target) => {
  const { entry } = input;
  const inputDelay = i18n17.TimeUtilities.formatMicroSecondsAsMillisFixed(entry.inputDelay);
  const mainThreadTime = i18n17.TimeUtilities.formatMicroSecondsAsMillisFixed(entry.mainThreadHandling);
  const presentationDelay = i18n17.TimeUtilities.formatMicroSecondsAsMillisFixed(entry.presentationDelay);
  Lit7.render(
    html7`<style>${interactionBreakdown_css_default}</style>
      <ul class="breakdown">
        <li data-entry="input-delay">${i18nString9(UIStrings9.inputDelay)}<span class="value">${inputDelay}</span></li>
        <li data-entry="processing-duration">${i18nString9(UIStrings9.processingDuration)}<span class="value">${mainThreadTime}</span></li>
        <li data-entry="presentation-delay">${i18nString9(UIStrings9.presentationDelay)}<span class="value">${presentationDelay}</span></li>
      </ul>
  `,
    target
  );
};
var InteractionBreakdown = class _InteractionBreakdown extends UI7.Widget.Widget {
  static createWidgetElement(entry) {
    const widgetElement = document.createElement("devtools-widget");
    const widget7 = new _InteractionBreakdown(widgetElement);
    widget7.entry = entry;
    return widgetElement;
  }
  #view;
  #entry = null;
  constructor(element, view = DEFAULT_VIEW3) {
    super(element, { useShadowDom: true });
    this.#view = view;
  }
  set entry(entry) {
    if (entry === this.#entry) {
      return;
    }
    this.#entry = entry;
    this.requestUpdate();
  }
  performUpdate() {
    if (!this.#entry) {
      return;
    }
    const input = {
      entry: this.#entry
    };
    this.#view(input, void 0, this.contentElement);
  }
};

// ../../front_end/panels/timeline/components/LayoutShiftDetails.ts
var LayoutShiftDetails_exports = {};
__export(LayoutShiftDetails_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW4,
  LayoutShiftDetails: () => LayoutShiftDetails
});
import * as i18n19 from "../../../core/i18n/i18n.js";
import * as SDK2 from "../../../core/sdk/sdk.js";
import * as Helpers5 from "../../../models/trace/helpers/helpers.js";
import * as Trace4 from "../../../models/trace/trace.js";
import * as Buttons5 from "../../../ui/components/buttons/buttons.js";
import * as LegacyComponents from "../../../ui/legacy/components/utils/utils.js";
import * as UI8 from "../../../ui/legacy/legacy.js";
import * as Lit8 from "../../../ui/lit/lit.js";
import * as VisualLogging5 from "../../../ui/visual_logging/visual_logging.js";
import * as Insights3 from "./insights/insights.js";

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

// ../../front_end/panels/timeline/components/LayoutShiftDetails.ts
var { html: html8, render: render8 } = Lit8;
var MAX_URL_LENGTH = 20;
var UIStrings10 = {
  /**
   * @description Label for the start time of an event in the layout shift details view of the Performance panel.
   */
  startTime: "Start time",
  /**
   * @description Table column header for the score of a layout shift event in the layout shift details view of the Performance panel.
   */
  shiftScore: "Shift score",
  /**
   * @description Table column header for the shifted DOM elements in the layout shift details view of the Performance panel.
   */
  elementsShifted: "Elements shifted",
  /**
   * @description Table column header for the root cause/culprit of a layout shift event in the layout shift details view of the Performance panel.
   */
  culprit: "Culprit",
  /**
   * @description Root cause culprit type indicating an injected iframe in the layout shift details view of the Performance panel.
   */
  injectedIframe: "Injected iframe",
  /**
   * @description Root cause culprit type indicating a web font request in the layout shift details view of the Performance panel.
   */
  fontRequest: "Font request",
  /**
   * @description Root cause culprit type indicating a non-composited animation in the layout shift details view of the Performance panel.
   */
  nonCompositedAnimation: "Non-composited animation",
  /**
   * @description Label for an animation culprit in the layout shift details view of the Performance panel.
   */
  animation: "Animation",
  /**
   * @description Link label to navigate to the parent cluster in the layout shift details view of the Performance panel.
   */
  parentCluster: "Parent cluster",
  /**
   * @description Header title for a layout shift cluster and its start time in the layout shift details view of the Performance panel.
   * @example {32 ms} PH1
   */
  cluster: "Layout shift cluster @ {PH1}",
  /**
   * @description Title and table row label for an individual layout shift and its start time in the layout shift details view of the Performance panel.
   * @example {32 ms} PH1
   */
  layoutShift: "Layout shift @ {PH1}",
  /**
   * @description Label for the total cumulative score row in the layout shift cluster table of the Performance panel.
   */
  total: "Total",
  /**
   * @description Root cause culprit type indicating an unsized image in the layout shift details view of the Performance panel.
   */
  unsizedImage: "Unsized image"
};
var str_10 = i18n19.i18n.registerUIStrings("panels/timeline/components/LayoutShiftDetails.ts", UIStrings10);
var i18nString10 = i18n19.i18n.getLocalizedString.bind(void 0, str_10);
var LayoutShiftDetails = class extends UI8.Widget.Widget {
  #view;
  #event = null;
  #parsedTrace = null;
  #isFreshRecording = false;
  constructor(element, view = DEFAULT_VIEW4) {
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
    this.contentElement.dispatchEvent(new Insights3.EventRef.EventReferenceClick(event));
  }
  #togglePopover(e) {
    const show = e.type === "mouseover";
    if (e.type === "mouseleave") {
      this.contentElement.dispatchEvent(
        new CustomEvent("toggle-popover", { detail: { show }, bubbles: true, composed: true })
      );
    }
    if (!(e.target instanceof HTMLElement) || !this.#event) {
      return;
    }
    const rowEl = e.target.closest("tbody tr");
    if (!rowEl?.parentElement) {
      return;
    }
    const event = Trace4.Types.Events.isSyntheticLayoutShift(this.#event) ? this.#event : this.#event.events.find((e2) => e2.ts === parseInt(rowEl.getAttribute("data-ts") ?? "", 10));
    this.contentElement.dispatchEvent(
      new CustomEvent("toggle-popover", { detail: { event, show }, bubbles: true, composed: true })
    );
  }
  performUpdate() {
    this.#view(
      {
        event: this.#event,
        parsedTrace: this.#parsedTrace,
        isFreshRecording: this.#isFreshRecording,
        togglePopover: (e) => this.#togglePopover(e),
        onEventClick: (e) => this.#handleTraceEventClick(e)
      },
      {},
      this.contentElement
    );
  }
};
var DEFAULT_VIEW4 = (input, _output, target) => {
  if (!input.event || !input.parsedTrace) {
    render8(Lit8.nothing, target);
    return;
  }
  const title = Trace4.Name.forEntry(input.event);
  render8(html8`
        <style>${layoutShiftDetails_css_default}</style>
        <style>${Buttons5.textButtonStyles}</style>

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
        ${Trace4.Types.Events.isSyntheticLayoutShift(input.event) ? renderLayoutShiftDetails(
    input.event,
    input.parsedTrace.insights,
    input.parsedTrace,
    input.isFreshRecording,
    input.onEventClick
  ) : renderLayoutShiftClusterDetails(
    input.event,
    input.parsedTrace.insights,
    input.parsedTrace,
    input.onEventClick
  )}
        </div>
      </div>
      `, target);
};
function findInsightSet(insightSets, navigationId) {
  return insightSets?.values().find(
    (insightSet) => navigationId ? navigationId === insightSet.navigation?.args.data?.navigationId : !insightSet.navigation
  );
}
function renderLayoutShiftDetails(layoutShift, insightSets, parsedTrace, isFreshRecording, onEventClick) {
  if (!insightSets) {
    return Lit8.nothing;
  }
  const clsInsight = findInsightSet(insightSets, layoutShift.args.data?.navigationId)?.model.CLSCulprits;
  if (!clsInsight) {
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
      <table class="layout-shift-details-table" jslog=${VisualLogging5.section("layout-shift-details")}>
        <thead class="table-title">
          <tr>
            <th>${i18nString10(UIStrings10.startTime)}</th>
            <th>${i18nString10(UIStrings10.shiftScore)}</th>
            ${hasShiftedElements ? html8`
              <th>${i18nString10(UIStrings10.elementsShifted)}</th>` : Lit8.nothing}
            ${hasCulprits ? html8`
              <th>${i18nString10(UIStrings10.culprit)}</th> ` : Lit8.nothing}
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
  if (!clsInsight) {
    return Lit8.nothing;
  }
  const clusterCulprits = Array.from(clsInsight.shifts.entries()).filter(([key]) => cluster.events.includes(key)).map(([, value2]) => value2).flatMap((x) => Object.values(x)).flat();
  const hasCulprits = Boolean(clusterCulprits.length);
  return html8`
    <table class="layout-shift-details-table" jslog=${VisualLogging5.section("layout-shift-details")}>
      <thead class="table-title">
        <tr>
          <th>${i18nString10(UIStrings10.startTime)}</th>
          <th>${i18nString10(UIStrings10.shiftScore)}</th>
          <th>${i18nString10(UIStrings10.elementsShifted)}</th>
          ${hasCulprits ? html8`
            <th>${i18nString10(UIStrings10.culprit)}</th> ` : Lit8.nothing}
        </tr>
      </thead>
      <tbody>
        ${cluster.events.map((shift) => {
    const rootCauses = clsInsight.shifts.get(shift);
    const elementsShifted = shift.args.data?.impacted_nodes ?? [];
    return renderShiftRow(shift, false, parsedTrace, elementsShifted, onEventClick, rootCauses);
  })}

        <tr>
          <td class="total-row">${i18nString10(UIStrings10.total)}</td>
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
  const hasCulprits = Boolean(
    rootCauses && (rootCauses.webFonts.length || rootCauses.iframes.length || rootCauses.nonCompositedAnimations.length || rootCauses.unsizedImages.length)
  );
  return html8`
      <tr class="shift-row" data-ts=${currentShift.ts} jslog=${VisualLogging5.tableRow("shift-row")}>
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
  const ts = Trace4.Types.Timing.Micro(shift.ts - parsedTrace.data.Meta.traceBounds.min);
  if (userHasSingleShiftSelected) {
    return html8`${i18n19.TimeUtilities.preciseMillisToString(Helpers5.Timing.microToMilli(ts))}`;
  }
  const shiftTs = i18n19.TimeUtilities.formatMicroSecondsTime(ts);
  return html8`
         <button type="button" class="timeline-link" @click=${() => onEventClick(shift)}>${i18nString10(UIStrings10.layoutShift, { PH1: shiftTs })}</button>`;
}
function renderParentCluster(cluster, onEventClick, parsedTrace) {
  if (!cluster) {
    return Lit8.nothing;
  }
  const ts = Trace4.Types.Timing.Micro(cluster.ts - (parsedTrace.data.Meta.traceBounds.min ?? 0));
  const clusterTs = i18n19.TimeUtilities.formatMicroSecondsTime(ts);
  return html8`
      <span class="parent-cluster">${i18nString10(UIStrings10.parentCluster)}:<button type="button" class="timeline-link parent-cluster-link" @click=${() => onEventClick(cluster)}>${i18nString10(UIStrings10.cluster, { PH1: clusterTs })}</button>
      </span>`;
}
function renderShiftedElements(shift, elementsShifted) {
  return html8`
      ${elementsShifted?.map((el) => {
    if (el.node_id !== void 0) {
      return Insights3.NodeLink.nodeLink({
        backendNodeId: el.node_id,
        frame: shift.args.frame,
        fallbackHtmlSnippet: el.debug_name
      });
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
        <span class="culprit-type">${i18nString10(UIStrings10.nonCompositedAnimation)}: </span>
        <button type="button" class="culprit-value timeline-link" @click=${() => onEventClick(event)}>${i18nString10(UIStrings10.animation)}</button>
      </span>`;
}
function renderUnsizedImage(frame, unsizedImage) {
  const nodeLinkEl = Insights3.NodeLink.nodeLink({
    backendNodeId: unsizedImage.backendNodeId,
    frame,
    fallbackUrl: unsizedImage.paintImageEvent.args.data.url
  });
  return html8`
    <span class="culprit">
      <span class="culprit-type">${i18nString10(UIStrings10.unsizedImage)}: </span>
      <span class="culprit-value">${nodeLinkEl}</span>
    </span>`;
}
function renderFontRequest(request) {
  const linkifiedURL = linkifyURL(request.args.data.url);
  return html8`
      <span class="culprit">
        <span class="culprit-type">${i18nString10(UIStrings10.fontRequest)}: </span>
        <span class="culprit-value">${linkifiedURL}</span>
      </span>`;
}
function linkifyURL(url) {
  return LegacyComponents.Linkifier.Linkifier.linkifyURL(url, {
    tabStop: true,
    showColumnNumber: false,
    maxLength: MAX_URL_LENGTH
  });
}
function renderIframe(iframeRootCause) {
  const domLoadingId = iframeRootCause.frame;
  const domLoadingFrame = SDK2.FrameManager.FrameManager.instance().getFrame(domLoadingId);
  let el;
  if (domLoadingFrame) {
    el = LegacyComponents.Linkifier.Linkifier.linkifyRevealable(domLoadingFrame, domLoadingFrame.displayName());
  } else {
    el = linkifyURL(iframeRootCause.url);
  }
  return html8`
      <span class="culprit">
        <span class="culprit-type"> ${i18nString10(UIStrings10.injectedIframe)}: </span>
        <span class="culprit-value">${el}</span>
      </span>`;
}

// ../../front_end/panels/timeline/components/LiveMetricsView.ts
var LiveMetricsView_exports = {};
__export(LiveMetricsView_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW5,
  LiveMetricsView: () => LiveMetricsView
});
import "../../../ui/components/settings/settings.js";
import "../../../ui/kit/kit.js";
import "../../../ui/components/menus/menus.js";

// ../../front_end/panels/timeline/components/MetricCard.ts
var MetricCard_exports = {};
__export(MetricCard_exports, {
  MetricCard: () => MetricCard
});
import * as i18n23 from "../../../core/i18n/i18n.js";
import * as Platform5 from "../../../core/platform/platform.js";
import * as CrUXManager7 from "../../../models/crux-manager/crux-manager.js";
import * as Buttons6 from "../../../ui/components/buttons/buttons.js";
import * as ComponentHelpers4 from "../../../ui/components/helpers/helpers.js";
import * as UIHelpers from "../../../ui/helpers/helpers.js";
import * as Lit9 from "../../../ui/lit/lit.js";
import * as VisualLogging6 from "../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/timeline/components/metricCard.css.js
var metricCard_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.metric-card {
  border-radius: var(--sys-shape-corner-small);
  padding: var(--sys-size-7) var(--sys-size-8);
  background-color: var(--sys-color-surface3);
  height: 100%;
  box-sizing: border-box;
}

.title {
  display: flex;
  justify-content: space-between;
  font-size: var(--sys-typescale-headline5-size);
  line-height: var(--sys-typescale-headline5-line-height);
  font-weight: var(--ref-typeface-weight-medium);
  margin: 0;
  margin-bottom: var(--sys-size-4);
}

.title-help {
  height: var(--sys-typescale-headline5-line-height);
  margin-left: var(--sys-size-3);
}

.metric-values-section {
  position: relative;
  display: flex;
  column-gap: var(--sys-size-5);
  margin-bottom: var(--sys-size-5);
}

.metric-values-section:focus-visible {
  outline: var(--sys-size-2) solid -webkit-focus-ring-color;
}

.metric-source-block {
  flex: 1;
}

.metric-source-value {
  font-size: var(--sys-size-13);
  line-height: 36px;
  font-weight: var(--ref-typeface-weight-regular);
}

.metric-source-label {
  font-weight: var(--ref-typeface-weight-medium);
}

.warning {
  margin-top: var(--sys-size-3);
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
    margin-right: var(--sys-size-3);
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
  border-bottom: var(--sys-size-1) solid var(--sys-color-divider);
  margin: var(--sys-size-5) 0;
  box-sizing: border-box;
}

.compare-text {
  margin-top: var(--sys-size-5);
}

.environment-recs-intro {
  margin-top: var(--sys-size-5);
}

.environment-recs {
  margin: 9px 0;
}

.environment-recs > summary {
  font-weight: var(--ref-typeface-weight-medium);
  margin-bottom: var(--sys-size-3);
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
    margin-right: var(--sys-size-3);
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
  margin-bottom: var(--sys-size-5);
}

.bucket-summaries {
  margin-top: var(--sys-size-5);
  white-space: nowrap;
}

.bucket-summaries.histogram {
  display: grid;
  grid-template-columns: minmax(min-content, auto) minmax(var(--sys-size-14), 60px) max-content;
  grid-auto-rows: 1fr;
  column-gap: var(--sys-size-5);
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
  height: var(--sys-size-4);
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

.subpart-table {
  display: grid;
  column-gap: var(--sys-size-3);
  white-space: nowrap;
}

.subpart-table-row {
  display: contents;
}

.subpart-table-value {
  text-align: right;
}

.subpart-table-header-row {
  font-weight: var(--ref-typeface-weight-medium);
}

/*# sourceURL=${import.meta.resolve("./metricCard.css")} */`;

// ../../front_end/panels/timeline/components/MetricCompareStrings.ts
import * as i18n21 from "../../../core/i18n/i18n.js";
import * as uiI18n3 from "../../../ui/i18n/i18n.js";
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

// ../../front_end/panels/timeline/components/MetricCard.ts
var { html: html9, nothing: nothing8 } = Lit9;
var UIStrings12 = {
  /**
   * @description Label for a metric value measured in the local environment in the live metrics view of the Performance panel.
   */
  localValue: "Local",
  /**
   * @description Label for the 75th percentile of real user field metrics in the live metrics view of the Performance panel.
   */
  field75thPercentile: "Field 75th percentile",
  /**
   * @description Column header for the 75th percentile field metrics in the live metrics view of the Performance panel.
   */
  fieldP75: "Field p75",
  /**
   * @description Label for metric values classified as good in the live metrics view of the Performance panel.
   */
  good: "Good",
  /**
   * @description Label for metric values classified as needs improvement in the live metrics view of the Performance panel.
   */
  needsImprovement: "Needs improvement",
  /**
   * @description Label for metric values classified as poor in the live metrics view of the Performance panel.
   */
  poor: "Poor",
  /**
   * @description Label for a range of values that are less than or equal to a threshold in the live metrics view of the Performance panel.
   * @example {500 ms} PH1
   */
  leqRange: "(\u2264{PH1})",
  /**
   * @description Label for a range of values between two thresholds in the live metrics view of the Performance panel.
   * @example {500 ms} PH1
   * @example {800 ms} PH2
   */
  betweenRange: "({PH1}-{PH2})",
  /**
   * @description Label for a range of values greater than a threshold in the live metrics view of the Performance panel.
   * @example {500 ms} PH1
   */
  gtRange: "(>{PH1})",
  /**
   * @description Percentage value format string in the live metrics view of the Performance panel.
   * @example {13} PH1
   */
  percentage: "{PH1}%",
  /**
   * @description Prompt instructing the user to interact with the page to measure INP in the live metrics view of the Performance panel.
   */
  interactToMeasure: "Interact with the page to measure INP.",
  /**
   * @description Tooltip label to expand more details in the metric card of the Performance panel.
   */
  viewCardDetails: "View card details",
  /**
   * @description Header recommending the user inspect their local test environment in the live metrics view of the Performance panel.
   */
  considerTesting: "Consider your local test conditions",
  /**
   * @description Recommendation explaining how network throttling affects LCP page loads in the Performance panel.
   */
  recThrottlingLCP: "Real users may experience longer page loads due to slower network conditions. Increasing network throttling will simulate slower network conditions.",
  /**
   * @description Recommendation explaining how CPU throttling affects INP interaction delays in the Performance panel.
   */
  recThrottlingINP: "Real users may experience longer interactions due to slower CPU speeds. Increasing CPU throttling will simulate a slower device.",
  /**
   * @description Recommendation explaining how viewport size affects the LCP element in the Performance panel.
   */
  recViewportLCP: "Screen size can influence what the LCP element is. Ensure you are testing common viewport sizes.",
  /**
   * @description Recommendation explaining how viewport size affects layout shifts in the Performance panel.
   */
  recViewportCLS: "Screen size can influence what layout shifts happen. Ensure you are testing common viewport sizes.",
  /**
   * @description Recommendation explaining how user interaction journeys affect layout shifts in the Performance panel.
   */
  recJourneyCLS: "How a user interacts with the page can influence layout shifts. Ensure you are testing common interactions like scrolling the page.",
  /**
   * @description Recommendation explaining how user interaction journeys affect interaction delays in the Performance panel.
   */
  recJourneyINP: "How a user interacts with the page influences interaction delays. Ensure you are testing common interactions.",
  /**
   * @description Recommendation explaining how dynamic content affects LCP in the Performance panel.
   */
  recDynamicContentLCP: "The LCP element can vary between page loads if content is dynamic.",
  /**
   * @description Recommendation explaining how dynamic content affects layout shifts in the Performance panel.
   */
  recDynamicContentCLS: "Dynamic content can influence what layout shifts happen.",
  /**
   * @description Table column header for subpart stage names in the live metrics view of the Performance panel.
   */
  subpart: "Subpart",
  /**
   * @description Tooltip text explaining the Largest Contentful Paint (LCP) metric in the live metrics view of the Performance panel.
   */
  lcpHelpTooltip: "LCP reports the render time of the largest image, text block, or video visible in the viewport. Click here to learn more about LCP.",
  /**
   * @description Tooltip text explaining the Cumulative Layout Shift (CLS) metric in the live metrics view of the Performance panel.
   */
  clsHelpTooltip: "CLS measures the amount of unexpected shifted content. Click here to learn more about CLS.",
  /**
   * @description Tooltip text explaining the Interaction to Next Paint (INP) metric in the live metrics view of the Performance panel.
   */
  inpHelpTooltip: "INP measures the overall responsiveness to all click, tap, and keyboard interactions. Click here to learn more about INP."
};
var str_12 = i18n23.i18n.registerUIStrings("panels/timeline/components/MetricCard.ts", UIStrings12);
var i18nString11 = i18n23.i18n.getLocalizedString.bind(void 0, str_12);
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
    void ComponentHelpers4.ScheduledRender.scheduleRender(this, this.#render);
  }
  connectedCallback() {
    void ComponentHelpers4.ScheduledRender.scheduleRender(this, this.#render);
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
        return i18n23.i18n.lockedString("Largest Contentful Paint (LCP)");
      case "CLS":
        return i18n23.i18n.lockedString("Cumulative Layout Shift (CLS)");
      case "INP":
        return i18n23.i18n.lockedString("Interaction to Next Paint (INP)");
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
          return i18n23.TimeUtilities.formatMicroSecondsAsSeconds(micro);
        };
      case "CLS":
        return (v) => v === 0 ? "0" : v.toFixed(2);
      case "INP":
        return (v) => i18n23.TimeUtilities.preciseMillisToString(v);
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
        return i18nString11(UIStrings12.lcpHelpTooltip);
      case "CLS":
        return i18nString11(UIStrings12.clsHelpTooltip);
      case "INP":
        return i18nString11(UIStrings12.inpHelpTooltip);
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
        return html9`
          <div class="compare-text">${i18nString11(UIStrings12.interactToMeasure)}</div>
        `;
      }
      return Lit9.nothing;
    }
    const compare = this.#getCompareRating();
    const rating = rateMetric(localValue, this.#getThresholds());
    const valueEl = renderMetricValue(
      this.#getMetricValueLogContext(true),
      localValue,
      this.#getThresholds(),
      this.#getFormatFn(),
      { dim: true }
    );
    return html9`
      <div class="compare-text">
        ${renderCompareText({
      metric: i18n23.i18n.lockedString(this.#data.metric),
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
      return Lit9.nothing;
    }
    const recs = [];
    const metric = this.#data.metric;
    if (metric === "LCP" && compare === "better") {
      recs.push(i18nString11(UIStrings12.recThrottlingLCP));
    } else if (metric === "INP" && compare === "better") {
      recs.push(i18nString11(UIStrings12.recThrottlingINP));
    }
    if (metric === "LCP") {
      recs.push(i18nString11(UIStrings12.recViewportLCP));
    } else if (metric === "CLS") {
      recs.push(i18nString11(UIStrings12.recViewportCLS));
    }
    if (metric === "CLS") {
      recs.push(i18nString11(UIStrings12.recJourneyCLS));
    } else if (metric === "INP") {
      recs.push(i18nString11(UIStrings12.recJourneyINP));
    }
    if (metric === "LCP") {
      recs.push(i18nString11(UIStrings12.recDynamicContentLCP));
    } else if (metric === "CLS") {
      recs.push(i18nString11(UIStrings12.recDynamicContentCLS));
    }
    if (!recs.length) {
      return Lit9.nothing;
    }
    return html9`
      <details class="environment-recs">
        <summary>${i18nString11(UIStrings12.considerTesting)}</summary>
        <ul class="environment-recs-list">${recs.map((rec) => html9`<li>${rec}</li>`)}</ul>
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
        return html9`
          <div class="detailed-compare-text">${i18nString11(UIStrings12.interactToMeasure)}</div>
        `;
      }
      return Lit9.nothing;
    }
    const localRating = rateMetric(localValue, this.#getThresholds());
    const fieldValue = this.#getFieldValue();
    const fieldRating = fieldValue !== void 0 ? rateMetric(fieldValue, this.#getThresholds()) : void 0;
    const localValueEl = renderMetricValue(
      this.#getMetricValueLogContext(true),
      localValue,
      this.#getThresholds(),
      this.#getFormatFn(),
      { dim: true }
    );
    const fieldValueEl = renderMetricValue(
      this.#getMetricValueLogContext(false),
      fieldValue,
      this.#getThresholds(),
      this.#getFormatFn(),
      { dim: true }
    );
    return html9`
      <div class="detailed-compare-text">${renderDetailedCompareText({
      metric: i18n23.i18n.lockedString(this.#data.metric),
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
    return i18nString11(UIStrings12.percentage, { PH1: percent });
  }
  #renderFieldHistogram() {
    const fieldEnabled = CrUXManager7.CrUXManager.instance().getConfigSetting().get().enabled;
    const format = this.#getFormatFn();
    const thresholds = this.#getThresholds();
    const goodLabel = html9`
      <div class="bucket-label">
        <span>${i18nString11(UIStrings12.good)}</span>
        <span class="bucket-range"> ${i18nString11(UIStrings12.leqRange, { PH1: format(thresholds[0]) })}</span>
      </div>
    `;
    const needsImprovementLabel = html9`
      <div class="bucket-label">
        <span>${i18nString11(UIStrings12.needsImprovement)}</span>
        <span class="bucket-range"> ${i18nString11(UIStrings12.betweenRange, { PH1: format(thresholds[0]), PH2: format(thresholds[1]) })}</span>
      </div>
    `;
    const poorLabel = html9`
      <div class="bucket-label">
        <span>${i18nString11(UIStrings12.poor)}</span>
        <span class="bucket-range"> ${i18nString11(UIStrings12.gtRange, { PH1: format(thresholds[1]) })}</span>
      </div>
    `;
    if (!fieldEnabled) {
      return html9`
        <div class="bucket-summaries">
          ${goodLabel}
          ${needsImprovementLabel}
          ${poorLabel}
        </div>
      `;
    }
    return html9`
      <div class="bucket-summaries histogram" jslog=${VisualLogging6.canvas("metric-histogram")}>
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
  #renderSubpartTable(subparts) {
    const hasFieldData = subparts.every((subpart) => subpart[2] !== void 0);
    return html9`
      <hr class="divider">
      <div class="subpart-table" role="table">
        <div class="subpart-table-row subpart-table-header-row" role="row">
          <div role="columnheader" style="grid-column: 1">${i18nString11(UIStrings12.subpart)}</div>
          <div role="columnheader" class="subpart-table-value" style="grid-column: 2">${i18nString11(UIStrings12.localValue)}</div>
          ${hasFieldData ? html9`
            <div
              role="columnheader"
              class="subpart-table-value"
              style="grid-column: 3"
              title=${i18nString11(UIStrings12.field75thPercentile)}>${i18nString11(UIStrings12.fieldP75)}</div>
          ` : nothing8}
        </div>
        ${subparts.map((subpart) => html9`
          <div class="subpart-table-row" role="row" jslog=${VisualLogging6.tableRow("metric-subpart")}>
            <div role="cell">${subpart[0]}</div>
            <div role="cell" class="subpart-table-value">${i18n23.TimeUtilities.preciseMillisToString(subpart[1])}</div>
            ${subpart[2] !== void 0 ? html9`
              <div role="cell" class="subpart-table-value">${i18n23.TimeUtilities.preciseMillisToString(subpart[2])}</div>
            ` : nothing8}
          </div>
        `)}
      </div>
    `;
  }
  #render = () => {
    const fieldEnabled = CrUXManager7.CrUXManager.instance().getConfigSetting().get().enabled;
    const helpLink = this.#getHelpLink();
    const localValue = this.#getLocalValue();
    const fieldValue = this.#getFieldValue();
    const thresholds = this.#getThresholds();
    const formatFn = this.#getFormatFn();
    const localValueEl = renderMetricValue(this.#getMetricValueLogContext(true), localValue, thresholds, formatFn);
    const fieldValueEl = renderMetricValue(this.#getMetricValueLogContext(false), fieldValue, thresholds, formatFn);
    const output = html9`
      <style>${metricCard_css_default}</style>
      <style>${metricValueStyles_css_default}</style>
      <div class="metric-card" jslog=${VisualLogging6.section(Platform5.StringUtilities.toKebabCase(this.#data.metric))}>
        <h3 class="title">
          ${this.#getTitle()}
          <devtools-button
            class="title-help"
            title=${this.#getHelpTooltip()}
            .iconName=${"help"}
            .variant=${Buttons6.Button.Variant.ICON}
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
            ${fieldEnabled ? html9`<div class="metric-source-label">${i18nString11(UIStrings12.localValue)}</div>` : nothing8}
          </div>
          ${fieldEnabled ? html9`
            <div class="metric-source-block">
              <div class="metric-source-value" id="field-value">${fieldValueEl}</div>
              <div class="metric-source-label">${i18nString11(UIStrings12.field75thPercentile)}</div>
            </div>
          ` : nothing8}
          <div
            id="tooltip"
            class="tooltip"
            role="tooltip"
            aria-label=${i18nString11(UIStrings12.viewCardDetails)}
            ${Lit9.Directives.ref((el) => {
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
                  ${localValue && this.#data.subparts ? this.#renderSubpartTable(this.#data.subparts) : nothing8}
                </div>
              </div>
            </div>
          </div>
        </div>
        ${fieldEnabled ? html9`<hr class="divider">` : nothing8}
        ${this.#renderCompareString()}
        ${this.#data.warnings?.map((warning) => html9`
          <div class="warning">${warning}</div>
        `)}
        ${this.#renderEnvironmentRecommendations()}
        <slot name="extra-info"></slot>
      </div>
    `;
    Lit9.render(output, this.#shadow, { host: this });
  };
  // clang-format on
};
customElements.define("devtools-metric-card", MetricCard);

// ../../front_end/panels/timeline/components/LiveMetricsView.ts
import * as Common3 from "../../../core/common/common.js";
import * as i18n25 from "../../../core/i18n/i18n.js";
import * as Root from "../../../core/root/root.js";
import * as SDK3 from "../../../core/sdk/sdk.js";
import * as CrUXManager9 from "../../../models/crux-manager/crux-manager.js";
import * as EmulationModel from "../../../models/emulation/emulation.js";
import * as LiveMetrics from "../../../models/live-metrics/live-metrics.js";
import * as Trace5 from "../../../models/trace/trace.js";
import * as Buttons7 from "../../../ui/components/buttons/buttons.js";
import * as uiI18n4 from "../../../ui/i18n/i18n.js";
import * as UI9 from "../../../ui/legacy/legacy.js";
import * as Lit10 from "../../../ui/lit/lit.js";
import * as VisualLogging7 from "../../../ui/visual_logging/visual_logging.js";
import * as PanelsCommon from "../../common/common.js";
import * as MobileThrottling from "../../mobile_throttling/mobile_throttling.js";
import * as Insights4 from "./insights/insights.js";

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
  padding: var(--sys-size-8);
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
}

.live-metrics {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.live-metrics > * {
  flex-shrink: 0;
}

.next-steps {
  flex: 0 0 336px;
  box-sizing: border-box;
  border: none;
  border-left: var(--sys-size-1) solid var(--sys-color-divider);
}

@container (max-width: 650px) {
  .live-metrics-view {
    flex-direction: column;
  }

  .next-steps {
    flex-basis: 40%;
    border: none;
    border-top: var(--sys-size-1) solid var(--sys-color-divider);
  }
}

.metric-cards {
  display: grid;
  gap: var(--sys-size-8);
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
  padding: var(--sys-size-7) var(--sys-size-8) var(--sys-size-8);
  background-color: var(--sys-color-surface3);
  margin-bottom: var(--sys-size-8);
}

.record-action-card {
  border-radius: var(--sys-shape-corner-small);
  padding: var(--sys-size-6) var(--sys-size-8) var(--sys-size-6) var(--sys-size-6);
  background-color: var(--sys-color-surface3);
  margin-bottom: var(--sys-size-8);
}

.card-title {
  font-size: var(--sys-typescale-headline5-size);
  line-height: var(--sys-typescale-headline5-line-height);
  font-weight: var(--ref-typeface-weight-medium);
  margin: 0;
}

.settings-card .card-title {
  margin-bottom: var(--sys-size-3);
}

.device-toolbar-description {
  margin-bottom: var(--sys-size-6);
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
  margin-top: var(--sys-size-5);
  display: flex;
}

.related-info-label {
  font-weight: var(--ref-typeface-weight-medium);
  margin-right: var(--sys-size-3);
}

.related-info-link {
  background-color: var(--sys-color-cdt-base-container);
  border-radius: var(--sys-size-2);
  padding: 0 var(--sys-size-2);
  min-width: 0;
}

.local-field-link {
  display: inline-block;
  width: fit-content;
  margin-top: var(--sys-size-5);
}

.logs-section {
  margin-top: var(--sys-size-11);
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
  margin-left: var(--sys-size-3);
  vertical-align: sub;
}

.log {
  padding: 0;
  margin: 0;
  overflow: auto;
}

.log-item {
  border: none;
  border-bottom: var(--sys-size-1) solid var(--sys-color-divider);

  &.highlight {
    animation: highlight-fadeout 2s;
  }
}

.interaction {
  --subpart-table-margin: 120px;
  --details-indicator-width: 18px;

  summary {
    display: flex;
    align-items: center;
    padding: 7px var(--sys-size-3);

    &::before {
      content: " ";
      height: var(--sys-size-7);
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
  width: calc(var(--subpart-table-margin) - var(--details-indicator-width));
  flex-shrink: 0;
}

.interaction-inp-chip {
  background-color: var(--sys-color-yellow-container);
  color: var(--sys-color-on-yellow-container);
  padding: 0 var(--sys-size-2);
}

.interaction-node {
  flex-grow: 1;
  margin-right: var(--sys-size-13);
  min-width: 0;
}

.interaction-info {
  width: var(--sys-typescale-body4-line-height);
  height: var(--sys-typescale-body4-line-height);
  margin-right: var(--sys-size-4);
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
  margin-right: var(--sys-size-8);
  padding: 7px 0;
  width: 150px;
  box-sizing: border-box;
}

.layout-shift-nodes {
  flex: 1;
  min-width: 0;
}

.layout-shift-node {
  border-bottom: var(--sys-size-1) solid var(--sys-color-divider);
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
  gap: var(--sys-size-5);
}

.shortcut-label {
  width: max-content;
  flex-shrink: 0;
}

.field-data-option {
  margin: var(--sys-size-5) 0;
  max-width: 100%;
}

.field-setup-buttons {
  margin-top: var(--sys-size-7);
}

.field-data-message {
  margin-bottom: var(--sys-size-6);
}

.field-data-warning {
  margin-top: var(--sys-size-3);
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
    margin-right: var(--sys-size-3);
    flex-shrink: 0;
  }
}

.collection-period-range {
  font-weight: var(--ref-typeface-weight-medium);
}

devtools-link {
  color: var(--sys-color-primary);
  text-decoration-line: underline;
}

.environment-option {
  display: flex;
  align-items: center;
  margin-top: var(--sys-size-5);
  gap: var(--sys-size-2);
}

.environment-option-label {
  display: flex;
  align-items: center;
  gap: var(--sys-size-2);
}

.environment-recs-list {
  margin: 0;
  padding-left: var(--sys-size-9);
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

.subpart-table {
  border-top: var(--sys-size-1) solid var(--sys-color-divider);
  padding: 7px var(--sys-size-3);
  margin-left: var(--subpart-table-margin);
}

.subpart-table-row {
  display: flex;
  justify-content: space-between;
}

.subpart-table-header-row {
  font-weight: var(--ref-typeface-weight-medium);
  margin-bottom: var(--sys-size-3);
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
      margin-bottom: var(--sys-size-3);
    }
  }
}

.node-description {
  margin-bottom: var(--sys-size-6);
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--sys-size-5);
  margin-bottom: 10px;
}

.section-header .section-title {
  margin-bottom: 0;
}

/*# sourceURL=${import.meta.resolve("./liveMetricsView.css")} */`;

// ../../front_end/panels/timeline/components/LiveMetricsView.ts
var { html: html10, nothing: nothing10, Directives: { live: live2 } } = Lit10;
var { widget: widget2 } = UI9.Widget;
var DEVICE_OPTION_LIST = ["AUTO", ...CrUXManager9.DEVICE_SCOPE_LIST];
var RTT_MINIMUM = 60;
var UIStrings13 = {
  /**
   * @description Badge label indicating that the metrics are for a soft navigation in the Performance panel.
   */
  softNavigationPillText: "SOFT NAV",
  /**
   * @description Title of a view that shows performance metrics from the local environment and field metrics collected from real users in the Performance panel.
   */
  localAndFieldMetrics: "Local and field metrics",
  /**
   * @description Title of a view that shows performance metrics from the local environment in the Performance panel.
   */
  localMetrics: "Local metrics",
  /**
   * @description Link text to historical field data in the Performance panel.
   */
  fieldDataHistoryLink: "View history",
  /**
   * @description Tooltip for the link to historical field data in the Performance panel.
   */
  fieldDataHistoryTooltip: "View field data history in CrUX Vis",
  /**
   * @description Accessible label for the section that logs user interactions and layout shifts in the Performance panel.
   */
  eventLogs: "Interaction and layout shift logs section",
  /**
   * @description Section title for user interactions in the live metrics view of the Performance panel.
   */
  interactions: "Interactions",
  /**
   * @description Section title for layout shifts in the live metrics view of the Performance panel.
   */
  layoutShifts: "Layout shifts",
  /**
   * @description Title of a sidebar section that shows next step options in the Performance panel.
   */
  nextSteps: "Next steps",
  /**
   * @description Section title for field metrics in the live metrics view of the Performance panel.
   */
  fieldMetricsTitle: "Field metrics",
  /**
   * @description Section title for local environment settings in the live metrics view of the Performance panel.
   */
  environmentSettings: "Environment settings",
  /**
   * @description Label for a select dropdown to choose the device type for field metrics in the Performance panel.
   * @example {Mobile} PH1
   */
  showFieldDataForDevice: "Show field metrics for device type: {PH1}",
  /**
   * @description Text indicating that there is not enough data to report real user statistics in the Performance panel.
   */
  notEnoughData: "Not enough data",
  /**
   * @description Label for real user network conditions in the live metrics view of the Performance panel.
   * @example {75th percentile is similar to Slow 4G throttling} PH1
   */
  network: "Network: {PH1}",
  /**
   * @description Label for a select dropdown to choose the device form factor in the Performance panel.
   * @example {Mobile} PH1
   */
  device: "Device: {PH1}",
  /**
   * @description Label for an option to select all device form factors in the Performance panel.
   */
  allDevices: "All devices",
  /**
   * @description Label for an option to select the desktop form factor in the Performance panel.
   */
  desktop: "Desktop",
  /**
   * @description Label for an option to select the mobile form factor in the Performance panel.
   */
  mobile: "Mobile",
  /**
   * @description Label for an option to select the tablet form factor in the Performance panel.
   */
  tablet: "Tablet",
  /**
   * @description Label for an option to automatically select the form factor in the Performance panel.
   * @example {Desktop} PH1
   */
  auto: "Auto ({PH1})",
  /**
   * @description Label for an option that is currently loading in the Performance panel.
   * @example {Desktop} PH1
   */
  loadingOption: "{PH1} - Loading\u2026",
  /**
   * @description Label for an option that lacks enough data in the Performance panel.
   * @example {Desktop} PH1
   */
  needsDataOption: "{PH1} - No data",
  /**
   * @description Label for an option that selects the page specific URL in the Performance panel.
   */
  urlOption: "URL",
  /**
   * @description Label for an option that selects the entire origin in the Performance panel.
   */
  originOption: "Origin",
  /**
   * @description Label for an option that selects the specific URL with the URL displayed in the Performance panel.
   * @example {https://example.com/} PH1
   */
  urlOptionWithKey: "URL: {PH1}",
  /**
   * @description Label for an option that selects the entire origin with the origin displayed in the Performance panel.
   * @example {https://example.com} PH1
   */
  originOptionWithKey: "Origin: {PH1}",
  /**
   * @description Label for a dropdown indicating whether field metrics are shown for the URL or origin in the Performance panel.
   * @example {Origin: https://example.com} PH1
   */
  showFieldDataForPage: "Show field metrics for {PH1}",
  /**
   * @description Tooltip text explaining that real user connections are too fast to simulate with network throttling in the Performance panel.
   */
  tryDisablingThrottling: "75th percentile is too fast to simulate with throttling",
  /**
   * @description Tooltip text explaining that real user connections are similar to a specific network throttling preset in the Performance panel.
   * @example {Slow 4G} PH1
   */
  tryUsingThrottling: "75th percentile is similar to {PH1} throttling",
  /**
   * @description Text block listing the distribution of real users across device form factors in the Performance panel.
   * @example {60%} PH1
   * @example {30%} PH2
   */
  percentDevices: "{PH1}% mobile, {PH2}% desktop",
  /**
   * @description Text block explaining how to simulate different mobile and desktop devices in the Performance panel.
   */
  useDeviceToolbar: "Use the [device toolbar](https://developer.chrome.com/docs/devtools/device-mode) and configure throttling to simulate real user environments and identify more performance issues.",
  /**
   * @description Checkbox label that controls if the network cache is disabled in the Performance panel.
   */
  disableNetworkCache: "Disable network cache",
  /**
   * @description Label for the CPU throttling dropdown in the live metrics view of the Performance panel.
   */
  cpuThrottling: "CPU:",
  /**
   * @description Link label to the Largest Contentful Paint (LCP) page element in the live metrics view of the Performance panel.
   */
  lcpElement: "LCP element",
  /**
   * @description Button label to reveal the user interaction associated with INP in the live metrics view of the Performance panel.
   */
  inpInteractionLink: "INP interaction",
  /**
   * @description Button label to reveal the worst layout shift cluster in the live metrics view of the Performance panel.
   */
  worstCluster: "Worst cluster",
  /**
   * @description [ICU Syntax] Button label indicating the number of shifts in the worst layout shift cluster in the live metrics view of the Performance panel.
   * @example {3} shiftCount
   */
  numShifts: `{shiftCount, plural,
    =1 {{shiftCount} shift}
    other {{shiftCount} shifts}
  }`,
  /**
   * @description Label for the date range representing the collection period for field metrics in the Performance panel.
   * @example {Oct 1, 2024 - Nov 1, 2024} PH1
   */
  collectionPeriod: "Collection period: {PH1}",
  /**
   * @description Date range format string in the live metrics view of the Performance panel.
   * @example {Oct 1, 2024} PH1
   * @example {Nov 1, 2024} PH2
   */
  dateRange: "{PH1} - {PH2}",
  /**
   * @description Text banner explaining how to compare local metrics to real user data in the Performance panel.
   * @example {Chrome UX Report} PH1
   */
  seeHowYourLocalMetricsCompare: "See how your local metrics compare to real user data in the {PH1}.",
  /**
   * @description Link text for documentation about local and field metrics in the Performance panel.
   */
  localFieldLearnMoreLink: "Learn more about local and field metrics",
  /**
   * @description Tooltip text explaining the difference between local and field metrics in the Performance panel.
   */
  localFieldLearnMoreTooltip: "Local metrics are captured from the current page using your network connection and device. Field metrics are measured by real users using many different network connections and devices.",
  /**
   * @description Tooltip text explaining why an interaction was excluded from the INP calculation in the Performance panel.
   */
  interactionExcluded: "INP is calculated using the 98th percentile of interaction delays, so some interaction delays may be larger than the INP value.",
  /**
   * @description Tooltip for the button to clear the currently selected log in the live metrics view of the Performance panel.
   */
  clearCurrentLog: "Clear current log",
  /**
   * @description Label for the time to first byte subpart in the live metrics view of the Performance panel.
   */
  timeToFirstByte: "Time to first byte",
  /**
   * @description Label for the resource load delay subpart in the live metrics view of the Performance panel.
   */
  resourceLoadDelay: "Resource load delay",
  /**
   * @description Label for the resource load duration subpart in the live metrics view of the Performance panel.
   */
  resourceLoadDuration: "Resource load duration",
  /**
   * @description Label for the element render delay subpart in the live metrics view of the Performance panel.
   */
  elementRenderDelay: "Element render delay",
  /**
   * @description Label for the input delay subpart of an interaction in the live metrics view of the Performance panel.
   */
  inputDelay: "Input delay",
  /**
   * @description Label for the processing duration subpart of an interaction in the live metrics view of the Performance panel.
   */
  processingDuration: "Processing duration",
  /**
   * @description Label for the presentation delay subpart of an interaction in the live metrics view of the Performance panel.
   */
  presentationDelay: "Presentation delay",
  /**
   * @description Tooltip text for an interaction status chip indicating that it represents the 98th percentile INP interaction in the Performance panel.
   */
  inpInteraction: "The INP interaction is at the 98th percentile of interaction delays.",
  /**
   * @description Tooltip text for the button to reveal the INP interaction in the live metrics view of the Performance panel.
   */
  showInpInteraction: "Go to the INP interaction.",
  /**
   * @description Tooltip text for the button to reveal the worst layout shift cluster in the live metrics view of the Performance panel.
   */
  showClsCluster: "Go to worst layout shift cluster.",
  /**
   * @description Table column header for subpart stage names in the live metrics view of the Performance panel.
   */
  subpart: "Subpart",
  /**
   * @description Table column header for local duration values in milliseconds in the live metrics view of the Performance panel.
   */
  duration: "Local duration (ms)",
  /**
   * @description Tooltip text for the button to log interaction details to the console in the live metrics view of the Performance panel.
   */
  logToConsole: "Log more interaction data to the console",
  /**
   * @description Section title for Node process performance in the Performance panel.
   */
  nodePerformanceTimeline: "Node performance",
  /**
   * @description Description text for recording a performance timeline of a connected Node process in the Performance panel.
   */
  nodeClickToRecord: "Record a performance timeline of the connected Node process.",
  /**
   * @description Label for the network throttling dropdown in the live metrics view of the Performance panel.
   */
  networkThrottling: "Network:",
  /**
   * @description Tooltip text explaining why the user should adjust throttling settings in the Performance panel.
   */
  recommendedThrottlingReason: "Consider changing setting to simulate real user environments"
};
var str_13 = i18n25.i18n.registerUIStrings("panels/timeline/components/LiveMetricsView.ts", UIStrings13);
var i18nString12 = i18n25.i18n.getLocalizedString.bind(void 0, str_13);
function getLcpFieldSubparts(cruxManager) {
  const ttfb = cruxManager.getSelectedFieldMetricData("largest_contentful_paint_image_time_to_first_byte")?.percentiles?.p75;
  const loadDelay = cruxManager.getSelectedFieldMetricData("largest_contentful_paint_image_resource_load_delay")?.percentiles?.p75;
  const loadDuration = cruxManager.getSelectedFieldMetricData("largest_contentful_paint_image_resource_load_duration")?.percentiles?.p75;
  const renderDelay = cruxManager.getSelectedFieldMetricData("largest_contentful_paint_image_element_render_delay")?.percentiles?.p75;
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
function getNetworkRecTitle(cruxManager) {
  const response = cruxManager.getSelectedFieldMetricData("round_trip_time");
  if (!response?.percentiles) {
    return null;
  }
  const rtt = Number(response.percentiles.p75);
  if (!Number.isFinite(rtt)) {
    return null;
  }
  if (rtt < RTT_MINIMUM) {
    return i18nString12(UIStrings13.tryDisablingThrottling);
  }
  const conditions = SDK3.NetworkManager.getRecommendedNetworkPreset(rtt);
  if (!conditions) {
    return null;
  }
  const title = typeof conditions.title === "function" ? conditions.title() : conditions.title;
  return i18nString12(UIStrings13.tryUsingThrottling, { PH1: title });
}
function getDeviceRec(cruxManager) {
  const fractions = cruxManager.getFieldResponse(cruxManager.fieldPageScope, "ALL")?.record.metrics.form_factors?.fractions;
  if (!fractions) {
    return null;
  }
  return i18nString12(UIStrings13.percentDevices, {
    PH1: Math.round(fractions.phone * 100),
    PH2: Math.round(fractions.desktop * 100)
  });
}
function getPageScopeLabel(cruxManager, pageScope) {
  const key = cruxManager.pageResult?.[`${pageScope}-ALL`]?.record.key[pageScope];
  if (key) {
    return pageScope === "url" ? i18nString12(UIStrings13.urlOptionWithKey, { PH1: key }) : i18nString12(UIStrings13.originOptionWithKey, { PH1: key });
  }
  const baseLabel = pageScope === "url" ? i18nString12(UIStrings13.urlOption) : i18nString12(UIStrings13.originOption);
  return i18nString12(UIStrings13.needsDataOption, { PH1: baseLabel });
}
function getDeviceScopeDisplayName(deviceScope) {
  switch (deviceScope) {
    case "ALL":
      return i18nString12(UIStrings13.allDevices);
    case "DESKTOP":
      return i18nString12(UIStrings13.desktop);
    case "PHONE":
      return i18nString12(UIStrings13.mobile);
    case "TABLET":
      return i18nString12(UIStrings13.tablet);
  }
}
function getLabelForDeviceOption(cruxManager, deviceOption) {
  let baseLabel;
  if (deviceOption === "AUTO") {
    const deviceScope = cruxManager.resolveDeviceOptionToScope(deviceOption);
    const deviceScopeLabel = getDeviceScopeDisplayName(deviceScope);
    baseLabel = i18nString12(UIStrings13.auto, { PH1: deviceScopeLabel });
  } else {
    baseLabel = getDeviceScopeDisplayName(deviceOption);
  }
  if (!cruxManager.pageResult) {
    return i18nString12(UIStrings13.loadingOption, { PH1: baseLabel });
  }
  const result = cruxManager.getSelectedFieldResponse();
  if (!result) {
    return i18nString12(UIStrings13.needsDataOption, { PH1: baseLabel });
  }
  return baseLabel;
}
function getCollectionPeriodRange(cruxManager) {
  const selectedResponse = cruxManager.getSelectedFieldResponse();
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
  return i18nString12(UIStrings13.dateRange, {
    PH1: formattedFirstDate.toLocaleDateString(void 0, options),
    PH2: formattedLastDate.toLocaleDateString(void 0, options)
  });
}
function createMetricCardRef(cardData) {
  return Lit10.Directives.ref((el) => {
    if (el instanceof HTMLElement) {
      el.data = {
        ...cardData,
        tooltipContainer: el.closest(".metric-cards") || void 0
      };
    }
  });
}
function renderLcpCard(input) {
  const fieldData = input.cruxManager.getSelectedFieldMetricData("largest_contentful_paint");
  const nodeLink = input.lcpValue?.nodeRef && PanelsCommon.DOMLinkifier.Linkifier.instance().linkify(input.lcpValue?.nodeRef);
  const subparts = input.lcpValue?.subparts;
  const fieldSubparts = getLcpFieldSubparts(input.cruxManager);
  return html10`
    <devtools-metric-card ${createMetricCardRef({
    metric: "LCP",
    localValue: input.lcpValue?.value,
    fieldValue: fieldData?.percentiles?.p75,
    histogram: fieldData?.histogram,
    warnings: input.lcpValue?.warnings,
    subparts: subparts && [
      [i18nString12(UIStrings13.timeToFirstByte), subparts.timeToFirstByte, fieldSubparts?.timeToFirstByte],
      [i18nString12(UIStrings13.resourceLoadDelay), subparts.resourceLoadDelay, fieldSubparts?.resourceLoadDelay],
      [i18nString12(UIStrings13.resourceLoadDuration), subparts.resourceLoadTime, fieldSubparts?.resourceLoadTime],
      [i18nString12(UIStrings13.elementRenderDelay), subparts.elementRenderDelay, fieldSubparts?.elementRenderDelay]
    ]
  })}>
      ${nodeLink ? html10`
          <div class="related-info" slot="extra-info">
            <span class="related-info-label">${i18nString12(UIStrings13.lcpElement)}</span>
            <span class="related-info-link">
             ${widget2(PanelsCommon.DOMLinkifier.DOMNodeLink, { node: input.lcpValue?.nodeRef })}
            </span>
          </div>
        ` : nothing10}
    </devtools-metric-card>
  `;
}
function renderClsCard(input) {
  const fieldData = input.cruxManager.getSelectedFieldMetricData("cumulative_layout_shift");
  const clusterIds = new Set(input.clsValue?.clusterShiftIds || []);
  const clusterIsVisible = clusterIds.size > 0 && input.layoutShifts.some((layoutShift) => clusterIds.has(layoutShift.uniqueLayoutShiftId));
  return html10`
    <devtools-metric-card ${createMetricCardRef({
    metric: "CLS",
    localValue: input.clsValue?.value,
    fieldValue: fieldData?.percentiles?.p75,
    histogram: fieldData?.histogram,
    warnings: input.clsValue?.warnings
  })}>
      ${clusterIsVisible ? html10`
        <div class="related-info" slot="extra-info">
          <span class="related-info-label">${i18nString12(UIStrings13.worstCluster)}</span>
          <button
            class="link-to-log"
            title=${i18nString12(UIStrings13.showClsCluster)}
            @click=${() => input.revealLayoutShiftCluster(clusterIds)}
            jslog=${VisualLogging7.action("timeline.landing.show-cls-cluster").track({ click: true })}
          >${i18nString12(UIStrings13.numShifts, { shiftCount: clusterIds.size })}</button>
        </div>
      ` : nothing10}
    </devtools-metric-card>
  `;
}
function renderInpCard(input) {
  const fieldData = input.cruxManager.getSelectedFieldMetricData("interaction_to_next_paint");
  const subparts = input.inpValue?.subparts;
  const interaction = input.inpValue?.interactionId ? input.interactions.get(input.inpValue.interactionId) : void 0;
  return html10`
    <devtools-metric-card ${createMetricCardRef({
    metric: "INP",
    localValue: input.inpValue?.value,
    fieldValue: fieldData?.percentiles?.p75,
    histogram: fieldData?.histogram,
    warnings: input.inpValue?.warnings,
    subparts: subparts && [
      [i18nString12(UIStrings13.inputDelay), subparts.inputDelay],
      [i18nString12(UIStrings13.processingDuration), subparts.processingDuration],
      [i18nString12(UIStrings13.presentationDelay), subparts.presentationDelay]
    ]
  })}>
      ${interaction ? html10`
        <div class="related-info" slot="extra-info">
          <span class="related-info-label">${i18nString12(UIStrings13.inpInteractionLink)}</span>
          <button
            class="link-to-log"
            title=${i18nString12(UIStrings13.showInpInteraction)}
            @click=${() => input.revealInteraction(interaction)}
            jslog=${VisualLogging7.action("timeline.landing.show-inp-interaction").track({ click: true })}
          >${interaction.interactionType}</button>
        </div>
      ` : nothing10}
    </devtools-metric-card>
  `;
}
function renderRecordAction(action4) {
  function onClick() {
    void action4.execute();
  }
  return html10`
    <div class="record-action">
      <devtools-button @click=${onClick} .data=${{
    variant: Buttons7.Button.Variant.TEXT,
    size: Buttons7.Button.Size.REGULAR,
    iconName: action4.icon(),
    title: action4.title(),
    jslogContext: action4.id()
  }}>
        ${action4.title()}
      </devtools-button>
      <span class="shortcut-label">${UI9.ShortcutRegistry.ShortcutRegistry.instance().shortcutTitleForAction(action4.id())}</span>
    </div>
  `;
}
function renderRecordingSettings(input) {
  const fieldEnabled = input.cruxManager.getConfigSetting().get().enabled;
  const deviceRec = getDeviceRec(input.cruxManager) || i18nString12(UIStrings13.notEnoughData);
  const networkRec = getNetworkRecTitle(input.cruxManager) || i18nString12(UIStrings13.notEnoughData);
  return html10`
    <h3 class="card-title">${i18nString12(UIStrings13.environmentSettings)}</h3>
    <div class="device-toolbar-description">${Insights4.Helpers.md(i18nString12(UIStrings13.useDeviceToolbar))}</div>
    ${fieldEnabled ? html10`
      <ul class="environment-recs-list">
        <li>${uiI18n4.getFormatLocalizedStringTemplate(str_13, UIStrings13.device, { PH1: html10`<span class="environment-rec">${deviceRec}</span>` })}</li>
        <li>${uiI18n4.getFormatLocalizedStringTemplate(str_13, UIStrings13.network, { PH1: html10`<span class="environment-rec">${networkRec}</span>` })}</li>
      </ul>
    ` : nothing10}
    <div class="environment-option">
      <label class="environment-option-label">
        ${i18nString12(UIStrings13.cpuThrottling)}
        <select ${widget2(MobileThrottling.CPUThrottlingSelector.CPUThrottlingSelector)}></select>
      </label>
      <devtools-icon title=${i18nString12(UIStrings13.recommendedThrottlingReason)} name="info"></devtools-icon>
    </div>
    <div class="environment-option">
      <label class="environment-option-label">
        ${i18nString12(UIStrings13.networkThrottling)}
        <select
          ${widget2(MobileThrottling.NetworkThrottlingSelector.NetworkThrottlingSelect, {
    bindToGlobalConditions: true
  })}
        ></select>
      </label>
      <devtools-icon title=${i18nString12(UIStrings13.recommendedThrottlingReason)} name="info"></devtools-icon>
    </div>
    <div class="environment-option">
      <setting-checkbox
        class="network-cache-setting"
        .data=${{
    setting: Common3.Settings.Settings.instance().resolve(SDK3.SDKSettings.cacheDisabledSettingDescriptor),
    textOverride: i18nString12(UIStrings13.disableNetworkCache)
  }}
      ></setting-checkbox>
    </div>
  `;
}
function renderPageScopeSetting(input) {
  if (!input.cruxManager.getConfigSetting().get().enabled) {
    return Lit10.nothing;
  }
  const urlLabel = getPageScopeLabel(input.cruxManager, "url");
  const originLabel = getPageScopeLabel(input.cruxManager, "origin");
  const buttonTitle = input.cruxManager.fieldPageScope === "url" ? urlLabel : originLabel;
  const accessibleTitle = i18nString12(UIStrings13.showFieldDataForPage, { PH1: buttonTitle });
  const shouldDisable = !input.cruxManager.pageResult?.["url-ALL"] && !input.cruxManager.pageResult?.["origin-ALL"];
  return html10`
    <devtools-select-menu
      id="page-scope-select"
      class="field-data-option"
      @selectmenuselected=${input.handlePageScopeSelected}
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
        .selected=${input.cruxManager.fieldPageScope === "url"}
      >
        ${urlLabel}
      </devtools-menu-item>
      <devtools-menu-item
        .value=${"origin"}
        .selected=${input.cruxManager.fieldPageScope === "origin"}
      >
        ${originLabel}
      </devtools-menu-item>
    </devtools-select-menu>
  `;
}
function renderDeviceScopeSetting(input) {
  if (!input.cruxManager.getConfigSetting().get().enabled) {
    return Lit10.nothing;
  }
  const shouldDisable = !input.cruxManager.getFieldResponse(input.cruxManager.fieldPageScope, "ALL");
  const currentDeviceLabel = getLabelForDeviceOption(input.cruxManager, input.cruxManager.fieldDeviceOption);
  return html10`
    <devtools-select-menu
      id="device-scope-select"
      class="field-data-option"
      @selectmenuselected=${input.handleDeviceOptionSelected}
      .showDivider=${true}
      .showArrow=${true}
      .sideButton=${false}
      .showSelectedItem=${true}
      .buttonTitle=${i18nString12(UIStrings13.device, { PH1: currentDeviceLabel })}
      .disabled=${shouldDisable}
      title=${i18nString12(UIStrings13.showFieldDataForDevice, { PH1: currentDeviceLabel })}
    >
      ${DEVICE_OPTION_LIST.map((deviceOption) => {
    return html10`
          <devtools-menu-item
            .value=${deviceOption}
            .selected=${input.cruxManager.fieldDeviceOption === deviceOption}
          >
            ${getLabelForDeviceOption(input.cruxManager, deviceOption)}
          </devtools-menu-item>
        `;
  })}
    </devtools-select-menu>
  `;
}
function renderFieldDataHistoryLink(cruxManager) {
  if (!cruxManager.getConfigSetting().get().enabled) {
    return Lit10.nothing;
  }
  const normalizedUrl = cruxManager.pageResult?.normalizedUrl;
  if (!normalizedUrl) {
    return Lit10.nothing;
  }
  const tmp = new URL("https://cruxvis.withgoogle.com/");
  tmp.searchParams.set("view", "cwvsummary");
  tmp.searchParams.set("url", normalizedUrl);
  const identifier = cruxManager.fieldPageScope;
  tmp.searchParams.set("identifier", identifier);
  const device = cruxManager.getSelectedDeviceScope();
  tmp.searchParams.set("device", device);
  const cruxVis = `${tmp.origin}/#/${tmp.search}`;
  return html10`
      (<devtools-link href=${cruxVis}
               class="local-field-link"
               title=${i18nString12(UIStrings13.fieldDataHistoryTooltip)}
      >${i18nString12(UIStrings13.fieldDataHistoryLink)}</devtools-link>)
    `;
}
function renderCollectionPeriod(cruxManager) {
  const range = getCollectionPeriodRange(cruxManager);
  const dateText = range || i18nString12(UIStrings13.notEnoughData);
  const fieldDataHistoryLink = range ? renderFieldDataHistoryLink(cruxManager) : Lit10.nothing;
  const warnings = cruxManager.pageResult?.warnings || [];
  return html10`
    <div class="field-data-message">
      <div>${uiI18n4.getFormatLocalizedStringTemplate(str_13, UIStrings13.collectionPeriod, {
    PH1: html10`<span class="collection-period-range">${dateText}</span>`
  })} ${fieldDataHistoryLink}</div>
      ${warnings.map((warning) => html10`
        <div class="field-data-warning">${warning}</div>
      `)}
    </div>
  `;
}
function renderFieldDataMessage(cruxManager) {
  if (cruxManager.getConfigSetting().get().enabled) {
    return renderCollectionPeriod(cruxManager);
  }
  return html10`
    <div class="field-data-message">
      ${uiI18n4.getFormatLocalizedStringTemplate(
    str_13,
    UIStrings13.seeHowYourLocalMetricsCompare,
    { PH1: html10`<devtools-link href="https://developer.chrome.com/docs/crux">${i18n25.i18n.lockedString("Chrome UX Report")}</devtools-link>` }
  )}
    </div>
  `;
}
var listIsScrolling = /* @__PURE__ */ new WeakMap();
function shouldKeepScrolledToBottom(listEl) {
  if (!listEl.checkVisibility()) {
    return false;
  }
  const isAtBottom = Math.abs(listEl.scrollHeight - listEl.clientHeight - listEl.scrollTop) <= 1;
  return isAtBottom || Boolean(listIsScrolling.get(listEl));
}
function keepScrolledToBottom(listEl) {
  requestAnimationFrame(() => {
    listIsScrolling.set(listEl, true);
    listEl.addEventListener("scrollend", () => {
      listIsScrolling.set(listEl, false);
    }, { once: true });
    listEl.scrollTo({ top: listEl.scrollHeight, behavior: "smooth" });
  });
}
function renderInteractionsLog(input, output) {
  if (!input.interactions.size) {
    return Lit10.nothing;
  }
  return html10`
    <ol class="log"
      slot="interactions-log-content"
      ${Lit10.Directives.ref((el) => {
    if (el instanceof HTMLElement) {
      output.shouldKeepInteractionsScrolledToBottom = () => {
        return shouldKeepScrolledToBottom(el);
      };
      output.keepInteractionsScrolledToBottom = () => {
        keepScrolledToBottom(el);
      };
    }
  })}
    >
      ${input.interactions.values().map((interaction) => {
    const metricValue = renderMetricValue(
      "timeline.landing.interaction-event-timing",
      interaction.duration,
      INP_THRESHOLDS,
      (v) => i18n25.TimeUtilities.preciseMillisToString(v),
      { dim: true }
    );
    const isP98Excluded = input.inpValue && input.inpValue.value < interaction.duration;
    const isInp = input.inpValue?.interactionId === interaction.interactionId;
    return html10`
          <li id=${interaction.interactionId} class="log-item interaction" tabindex="-1">
            <details>
              <summary>
                <span class="interaction-type">
                  ${interaction.interactionType} ${isInp ? html10`<span class="interaction-inp-chip" title=${i18nString12(UIStrings13.inpInteraction)}>INP</span>` : nothing10}
                </span>
                <span class="interaction-node">
                  ${widget2(PanelsCommon.DOMLinkifier.DOMNodeLink, { node: interaction.nodeRef })}
                </span>
                ${isP98Excluded ? html10`<devtools-icon
                  class="interaction-info"
                  name="info"
                  title=${i18nString12(UIStrings13.interactionExcluded)}
                ></devtools-icon>` : nothing10}
                <span class="interaction-duration">${metricValue}</span>
              </summary>
              <div class="subpart-table" role="table">
                <div class="subpart-table-row subpart-table-header-row" role="row">
                  <div role="columnheader">${i18nString12(UIStrings13.subpart)}</div>
                  <div role="columnheader">
                    ${interaction.longAnimationFrameTimings.length ? html10`
                       <button
                         class="log-extra-details-button"
                         title=${i18nString12(UIStrings13.logToConsole)}
                         @click=${() => input.logExtraInteractionDetails(interaction)}
                       >${i18nString12(UIStrings13.duration)}</button>
                     ` : i18nString12(UIStrings13.duration)}
                  </div>
                </div>
                <div class="subpart-table-row" role="row">
                  <div role="cell">${i18nString12(UIStrings13.inputDelay)}</div>
                  <div role="cell">${Math.round(interaction.subparts.inputDelay)}</div>
                </div>
                <div class="subpart-table-row" role="row">
                  <div role="cell">${i18nString12(UIStrings13.processingDuration)}</div>
                  <div role="cell">${Math.round(interaction.subparts.processingDuration)}</div>
                </div>
                <div class="subpart-table-row" role="row">
                  <div role="cell">${i18nString12(UIStrings13.presentationDelay)}</div>
                  <div role="cell">${Math.round(interaction.subparts.presentationDelay)}</div>
                </div>
              </div>
            </details>
          </li>
        `;
  })}
    </ol>
  `;
}
function renderLayoutShiftsLog(input, output) {
  if (!input.layoutShifts.length) {
    return Lit10.nothing;
  }
  return html10`
    <ol class="log"
      slot="layout-shifts-log-content"
      ${Lit10.Directives.ref((el) => {
    if (el instanceof HTMLElement) {
      output.shouldKeepLayoutShiftsScrolledToBottom = () => {
        return shouldKeepScrolledToBottom(el);
      };
      output.keepLayoutShiftsScrolledToBottom = () => {
        keepScrolledToBottom(el);
      };
    }
  })}
    >
      ${input.layoutShifts.map((layoutShift) => {
    const metricValue = renderMetricValue(
      "timeline.landing.layout-shift-event-score",
      layoutShift.score,
      CLS_THRESHOLDS,
      // CLS value is 2 decimal places, but individual shift scores tend to be much smaller
      // so we expand the precision here.
      (v) => v.toFixed(4),
      { dim: true }
    );
    return html10`
          <li id=${layoutShift.uniqueLayoutShiftId} class="log-item layout-shift" tabindex="-1">
            <div class="layout-shift-score">Layout shift score: ${metricValue}</div>
            <div class="layout-shift-nodes">
              ${layoutShift.affectedNodeRefs.map((node) => html10`
                <div class="layout-shift-node">
                  ${widget2(PanelsCommon.DOMLinkifier.DOMNodeLink, { node })}
                </div>
              `)}
            </div>
          </li>
        `;
  })}
    </ol>
  `;
}
function renderLogSection(input, output) {
  return html10`
    <section
      class="logs-section"
      aria-label=${i18nString12(UIStrings13.eventLogs)}
    >
      <devtools-widget ${widget2(LiveMetricsLogs, {
    selectedTab: input.highlightedInteractionId ? "interactions" : input.highlightedLayoutShiftClusterIds?.size ? "layout-shifts" : void 0
  })}>
        ${renderInteractionsLog(input, output)}
        ${renderLayoutShiftsLog(input, output)}
      </devtools-widget>
    </section>
  `;
}
function renderNodeView(input) {
  return html10`
    <style>${liveMetricsView_css_default}</style>
    <style>${metricValueStyles_css_default}</style>
    <div class="node-view">
      <main>
        <h2 class="section-title">${i18nString12(UIStrings13.nodePerformanceTimeline)}</h2>
        <div class="node-description">${i18nString12(UIStrings13.nodeClickToRecord)}</div>
        <div class="record-action-card">${renderRecordAction(input.toggleRecordAction)}</div>
      </main>
    </div>
  `;
}
var DEFAULT_VIEW5 = (input, output, target) => {
  if (input.isNode) {
    Lit10.render(renderNodeView(input), target);
    return;
  }
  const fieldEnabled = input.cruxManager.getConfigSetting().get().enabled;
  const liveMetricsTitle = fieldEnabled ? i18nString12(UIStrings13.localAndFieldMetrics) : i18nString12(UIStrings13.localMetrics);
  const helpLink = "https://web.dev/articles/lab-and-field-data-differences#lab_data_versus_field_data";
  const outputTemplate = html10`
    <style>${liveMetricsView_css_default}</style>
    <style>${metricValueStyles_css_default}</style>
    <div class="container">
      <div class="live-metrics-view">
        <main class="live-metrics">
          <div class="section-header">
            <h2 class="section-title">${liveMetricsTitle}</h2>
            ${input.navigationType === "soft-navigation" ? html10`<span class="badge">${i18nString12(UIStrings13.softNavigationPillText)}</span>` : nothing10}
          </div>
          <div class="metric-cards">
            <div id="lcp">
              ${renderLcpCard(input)}
            </div>
            <div id="cls">
              ${renderClsCard(input)}
            </div>
            <div id="inp">
              ${renderInpCard(input)}
            </div>
          </div>
          <devtools-link
            href=${helpLink}
            class="local-field-link"
            title=${i18nString12(UIStrings13.localFieldLearnMoreTooltip)}
          >${i18nString12(UIStrings13.localFieldLearnMoreLink)}</devtools-link>
          ${renderLogSection(input, output)}
        </main>
        <aside class="next-steps" aria-labelledby="next-steps-section-title">
          <h2 id="next-steps-section-title" class="section-title">${i18nString12(UIStrings13.nextSteps)}</h2>
          <div id="field-setup" class="settings-card">
            <h3 class="card-title">${i18nString12(UIStrings13.fieldMetricsTitle)}</h3>
            ${renderFieldDataMessage(input.cruxManager)}
            ${renderPageScopeSetting(input)}
            ${renderDeviceScopeSetting(input)}
            <div class="field-setup-buttons">
              <devtools-field-settings-dialog></devtools-field-settings-dialog>
            </div>
          </div>
          <div id="recording-settings" class="settings-card">
            ${renderRecordingSettings(input)}
          </div>
          <div id="record" class="record-action-card">
            ${renderRecordAction(input.toggleRecordAction)}
          </div>
          <div id="record-page-load" class="record-action-card">
            ${renderRecordAction(input.recordReloadAction)}
          </div>
        </aside>
      </div>
    </div>
  `;
  Lit10.render(outputTemplate, target);
  if (input.highlightedInteractionId) {
    const interactionEl = target.querySelector("#" + CSS.escape(input.highlightedInteractionId));
    if (interactionEl) {
      requestAnimationFrame(() => {
        interactionEl.scrollIntoView({
          block: "center"
        });
        interactionEl.focus();
        UI9.UIUtils.runCSSAnimationOnce(interactionEl, "highlight");
      });
    }
  }
  if (input.highlightedLayoutShiftClusterIds?.size) {
    const layoutShiftEls = [];
    for (const shiftId of input.highlightedLayoutShiftClusterIds) {
      const layoutShiftEl = target.querySelector("#" + CSS.escape(shiftId));
      if (layoutShiftEl) {
        layoutShiftEls.push(layoutShiftEl);
      }
    }
    if (layoutShiftEls.length) {
      requestAnimationFrame(() => {
        layoutShiftEls[0].scrollIntoView({
          block: "start"
        });
        layoutShiftEls[0].focus();
        for (const layoutShiftEl of layoutShiftEls) {
          UI9.UIUtils.runCSSAnimationOnce(layoutShiftEl, "highlight");
        }
      });
    }
  }
};
var LiveMetricsView = class extends UI9.Widget.Widget {
  isNode = Root.Runtime.Runtime.isNode();
  #lcpValue;
  #clsValue;
  #inpValue;
  #navigationType;
  #interactions = /* @__PURE__ */ new Map();
  #layoutShifts = [];
  #highlightedInteractionId = "";
  #highlightedLayoutShiftClusterIds = /* @__PURE__ */ new Set();
  #cruxManager = CrUXManager9.CrUXManager.instance();
  #toggleRecordAction;
  #recordReloadAction;
  #view;
  #viewOutput = {};
  #deviceModeModel = EmulationModel.DeviceModeModel.DeviceModeModel.tryInstance();
  constructor(element, view = DEFAULT_VIEW5) {
    super(element, { useShadowDom: true });
    this.#view = view;
    this.#toggleRecordAction = UI9.ActionRegistry.ActionRegistry.instance().getAction("timeline.toggle-recording");
    this.#recordReloadAction = UI9.ActionRegistry.ActionRegistry.instance().getAction("timeline.record-reload");
  }
  async #onMetricStatus(event) {
    this.#lcpValue = event.data.lcp;
    this.#clsValue = event.data.cls;
    this.#inpValue = event.data.inp;
    this.#navigationType = event.data.navigationType;
    const hasNewLS = this.#layoutShifts.length < event.data.layoutShifts.length;
    this.#layoutShifts = [...event.data.layoutShifts];
    const hasNewInteraction = this.#interactions.size < event.data.interactions.size;
    this.#interactions = new Map(event.data.interactions);
    const shouldScrollInteractions = hasNewInteraction && this.#viewOutput.shouldKeepInteractionsScrolledToBottom?.();
    const shouldScrollLS = hasNewLS && this.#viewOutput.shouldKeepLayoutShiftsScrolledToBottom?.();
    this.requestUpdate();
    await this.updateComplete;
    if (shouldScrollInteractions) {
      this.#viewOutput.keepInteractionsScrolledToBottom?.();
    }
    if (shouldScrollLS) {
      this.#viewOutput.keepLayoutShiftsScrolledToBottom?.();
    }
  }
  #onFieldDataChanged() {
    this.requestUpdate();
  }
  #onEmulationChanged() {
    this.requestUpdate();
  }
  async #refreshFieldDataForCurrentPage() {
    if (!this.isNode) {
      await this.#cruxManager.refresh();
    }
    this.requestUpdate();
  }
  wasShown() {
    super.wasShown();
    const liveMetrics = LiveMetrics.LiveMetrics.instance();
    liveMetrics.addEventListener(LiveMetrics.Events.STATUS, this.#onMetricStatus, this);
    const cruxManager = CrUXManager9.CrUXManager.instance();
    cruxManager.addEventListener(CrUXManager9.Events.FIELD_DATA_CHANGED, this.#onFieldDataChanged, this);
    this.#deviceModeModel?.addEventListener(
      EmulationModel.DeviceModeModel.Events.UPDATED,
      this.#onEmulationChanged,
      this
    );
    if (cruxManager.getConfigSetting().get().enabled) {
      void this.#refreshFieldDataForCurrentPage();
    }
    this.#lcpValue = liveMetrics.lcpValue;
    this.#clsValue = liveMetrics.clsValue;
    this.#inpValue = liveMetrics.inpValue;
    this.#interactions = liveMetrics.interactions;
    this.#layoutShifts = liveMetrics.layoutShifts;
    this.#navigationType = liveMetrics.navigationType;
    this.requestUpdate();
  }
  willHide() {
    super.willHide();
    LiveMetrics.LiveMetrics.instance().removeEventListener(LiveMetrics.Events.STATUS, this.#onMetricStatus, this);
    const cruxManager = CrUXManager9.CrUXManager.instance();
    cruxManager.removeEventListener(CrUXManager9.Events.FIELD_DATA_CHANGED, this.#onFieldDataChanged, this);
    this.#deviceModeModel?.removeEventListener(
      EmulationModel.DeviceModeModel.Events.UPDATED,
      this.#onEmulationChanged,
      this
    );
  }
  #onPageScopeMenuItemSelected(event) {
    if (event.itemValue === "url") {
      this.#cruxManager.fieldPageScope = "url";
    } else {
      this.#cruxManager.fieldPageScope = "origin";
    }
    this.requestUpdate();
  }
  #onDeviceOptionMenuItemSelected(event) {
    this.#cruxManager.fieldDeviceOption = event.itemValue;
    this.requestUpdate();
  }
  async #revealInteraction(interaction) {
    this.#highlightedInteractionId = interaction.interactionId;
    this.requestUpdate();
    await this.updateComplete;
    this.#highlightedInteractionId = "";
  }
  async #logExtraInteractionDetails(interaction) {
    const success = await LiveMetrics.LiveMetrics.instance().logInteractionScripts(interaction);
    if (success) {
      await Common3.Console.Console.instance().showPromise();
    }
  }
  async #revealLayoutShiftCluster(clusterIds) {
    this.#highlightedLayoutShiftClusterIds = clusterIds;
    this.requestUpdate();
    await this.updateComplete;
    this.#highlightedLayoutShiftClusterIds = /* @__PURE__ */ new Set();
  }
  performUpdate() {
    const viewInput = {
      isNode: this.isNode,
      lcpValue: this.#lcpValue,
      clsValue: this.#clsValue,
      inpValue: this.#inpValue,
      interactions: this.#interactions,
      layoutShifts: this.#layoutShifts,
      toggleRecordAction: this.#toggleRecordAction,
      recordReloadAction: this.#recordReloadAction,
      cruxManager: this.#cruxManager,
      handlePageScopeSelected: this.#onPageScopeMenuItemSelected.bind(this),
      handleDeviceOptionSelected: this.#onDeviceOptionMenuItemSelected.bind(this),
      revealLayoutShiftCluster: this.#revealLayoutShiftCluster.bind(this),
      revealInteraction: this.#revealInteraction.bind(this),
      logExtraInteractionDetails: this.#logExtraInteractionDetails.bind(this),
      highlightedInteractionId: this.#highlightedInteractionId,
      highlightedLayoutShiftClusterIds: this.#highlightedLayoutShiftClusterIds,
      navigationType: this.#navigationType
    };
    this.#view(viewInput, this.#viewOutput, this.contentElement);
  }
};
var LIVE_METRICS_LOGS_VIEW = (input, output, target) => {
  Lit10.render(html10`
    <style>
      /* Any children of the root element will be matched to the slots defined within the container
         widget's shadow DOM. */
      :host,
      .widget {
        display: contents;
      }
    </style>
    <devtools-tabbed-pane @select=${(event) => input.onTabSelected(event.detail.tabId)}>
      <devtools-toolbar slot="right">
        <devtools-button .iconName=${"clear"} .variant=${Buttons7.Button.Variant.TOOLBAR}
                         title=${i18nString12(UIStrings13.clearCurrentLog)} @click=${input.onClear}
                         .jslogContext=${"timeline.landing.clear-log"}>
        </devtools-button>
      </devtools-toolbar>
      <!-- Taking advantage of web component slots allows us to render updates in the lit templates defined in the
      main component. This should be more performant and doesn't require us to inject live metrics styles twice. -->
      <slot name="interactions-log-content" id="interactions" ?selected=${live2(input.selectedTab === "interactions")}
            title=${i18nString12(UIStrings13.interactions)} jslogcontext="timeline.landing.interactions-log">
      </slot>
      <slot name="layout-shifts-log-content" id="layout-shifts" ?selected=${live2(input.selectedTab === "layout-shifts")}
            title=${i18nString12(UIStrings13.layoutShifts)} jslogcontext="timeline.landing.layout-shifts-log">
      </slot>
    </devtools-tabbed-pane>
  `, target);
};
var LiveMetricsLogs = class extends UI9.Widget.Widget {
  #view;
  #selectedTab = "interactions";
  set selectedTab(tabId) {
    if (!tabId || this.#selectedTab === tabId) {
      return;
    }
    this.#selectedTab = tabId;
    this.requestUpdate();
  }
  #clearCurrentLog() {
    const liveMetrics = LiveMetrics.LiveMetrics.instance();
    switch (this.#selectedTab) {
      case "interactions":
        liveMetrics.clearInteractions();
        break;
      case "layout-shifts":
        liveMetrics.clearLayoutShifts();
        break;
    }
  }
  constructor(element, view = LIVE_METRICS_LOGS_VIEW) {
    super(element, { useShadowDom: true });
    this.#view = view;
    this.requestUpdate();
  }
  performUpdate() {
    const viewInput = {
      onClear: this.#clearCurrentLog.bind(this),
      selectedTab: this.#selectedTab,
      onTabSelected: (tabId) => {
        this.selectedTab = tabId;
      }
    };
    this.#view(viewInput, void 0, this.contentElement);
  }
};

// ../../front_end/panels/timeline/components/NetworkRequestDetails.ts
var NetworkRequestDetails_exports = {};
__export(NetworkRequestDetails_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW7,
  NetworkRequestDetails: () => NetworkRequestDetails
});
import "../../../ui/components/request_link_icon/request_link_icon.js";
import * as Common4 from "../../../core/common/common.js";
import * as i18n29 from "../../../core/i18n/i18n.js";
import * as SDK5 from "../../../core/sdk/sdk.js";
import * as Helpers9 from "../../../models/trace/helpers/helpers.js";
import * as Trace7 from "../../../models/trace/trace.js";
import * as LegacyComponents2 from "../../../ui/legacy/components/utils/utils.js";
import * as UI11 from "../../../ui/legacy/legacy.js";
import * as Lit12 from "../../../ui/lit/lit.js";
import * as VisualLogging8 from "../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/timeline/components/networkRequestDetails.css.js
var networkRequestDetails_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
  .network-request-details-title {
    font-size: var(--sys-typescale-body3-size);
    padding: var(--sys-size-5);
    display: flex;
    align-items: center;
  }

  .network-request-details-title > div {
    box-sizing: border-box;
    width: var(--sys-size-7);
    height: var(--sys-size-7);
    border: var(--sys-size-1) solid var(--sys-color-divider);
    display: inline-block;
    margin-right: var(--sys-size-3);
  }

  .network-request-details-content {
    border-bottom: var(--sys-size-1) solid var(--sys-color-divider);
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
    border-left: var(--sys-size-1) solid var(--sys-color-divider);
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
    outline-offset: var(--sys-size-2);
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
    border: var(--sys-size-1) solid var(--sys-color-divider);
    display: inline-block;
    margin-right: var(--sys-size-3);
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
    border-top: var(--sys-size-1) solid var(--sys-color-divider);
    margin: 5px 0;
  }

  .timings-row {
    align-self: start;
    display: flex;
    align-items: center;
  }

  .indicator {
    display: inline-block;
    width: var(--sys-size-6);
    height: var(--sys-size-4);
    margin-right: 5px;
    border: var(--sys-size-1) solid var(--sys-color-on-surface-subtle);
    box-sizing: border-box;
  }

  devtools-icon.indicator {
    vertical-align: middle;
    height: var(--sys-size-6);
    width: var(--sys-size-6);
    margin-right: var(--sys-size-3);
    color: var(--sys-color-yellow);
    border: none;
  }


  .whisker-left {
    align-self: center;
    display: inline-flex;
    width: 11px;
    height: var(--sys-size-4);
    margin-right: 5px;
    border-left: var(--sys-size-1) solid var(--sys-color-on-surface-subtle);
    box-sizing: border-box;
  }

  .whisker-right {
    align-self: center;
    display: inline-flex;
    width: 11px;
    height: var(--sys-size-4);
    margin-right: 5px;
    border-right: var(--sys-size-1) solid var(--sys-color-on-surface-subtle);
    box-sizing: border-box;
  }

  .horizontal {
    background-color: var(--sys-color-on-surface-subtle);
    height: var(--sys-size-1);
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

// ../../front_end/panels/timeline/components/NetworkRequestTooltip.ts
var NetworkRequestTooltip_exports = {};
__export(NetworkRequestTooltip_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW6,
  NetworkRequestTooltip: () => NetworkRequestTooltip
});
import "../../../ui/kit/kit.js";
import * as i18n27 from "../../../core/i18n/i18n.js";
import * as Platform6 from "../../../core/platform/platform.js";
import * as SDK4 from "../../../core/sdk/sdk.js";
import * as Trace6 from "../../../models/trace/trace.js";
import * as PerfUI from "../../../ui/legacy/components/perf_ui/perf_ui.js";
import * as UI10 from "../../../ui/legacy/legacy.js";
import * as Lit11 from "../../../ui/lit/lit.js";
import * as TimelineUtils from "../utils/utils.js";
var { html: html11, nothing: nothing12, Directives: { classMap, ifDefined: ifDefined2 } } = Lit11;
var { widget: widget3 } = UI10.Widget;
var MAX_URL_LENGTH2 = 60;
var UIStrings14 = {
  /**
   * @description Label for network request priority in the network request tooltip of the Performance panel.
   */
  priority: "Priority",
  /**
   * @description Label for total duration in the network request tooltip of the Performance panel.
   */
  duration: "Duration",
  /**
   * @description Label for the queuing and connecting phase duration in the network request tooltip of the Performance panel.
   */
  queuingAndConnecting: "Queuing and connecting",
  /**
   * @description Label for the request sent and waiting phase duration in the network request tooltip of the Performance panel.
   */
  requestSentAndWaiting: "Request sent and waiting",
  /**
   * @description Label for the content downloading phase duration in the network request tooltip of the Performance panel.
   */
  contentDownloading: "Content downloading",
  /**
   * @description Label for the main thread waiting phase duration in the network request tooltip of the Performance panel.
   */
  waitingOnMainThread: "Waiting on main thread",
  /**
   * @description Label indicating that the network request is render-blocking in the network request tooltip of the Performance panel.
   */
  renderBlocking: "Render-blocking",
  /**
   * @description Header label for redirect details in the network request tooltip of the Performance panel.
   */
  redirects: "Redirects",
  /**
   * @description Tooltip text indicating that the network request was throttled in the Performance panel.
   * @example {Fast 4G} PH1
   */
  wasThrottled: "Request was throttled ({PH1})"
};
var str_14 = i18n27.i18n.registerUIStrings("panels/timeline/components/NetworkRequestTooltip.ts", UIStrings14);
var i18nString13 = i18n27.i18n.getLocalizedString.bind(void 0, str_14);
var DEFAULT_VIEW6 = (input, output, target) => {
  const {
    networkRequest,
    entityMapper,
    throttlingTitle
  } = input;
  const chipStyle = {
    backgroundColor: `${colorForNetworkRequest(networkRequest)}`
  };
  const url = new URL(networkRequest.args.data.url);
  const entity = entityMapper ? entityMapper.entityForEvent(networkRequest) : null;
  const originWithEntity = TimelineUtils.Helpers.formatOriginWithEntity(url, entity, true);
  const redirectsHtml = NetworkRequestTooltip.renderRedirects(networkRequest);
  Lit11.render(html11`
    <style>${networkRequestTooltip_css_default}</style>
    <div class="performance-card">
      <div class="url">${Platform6.StringUtilities.trimMiddle(url.href.replace(url.origin, ""), MAX_URL_LENGTH2)}</div>
      <div class="url url--host">${originWithEntity}</div>

      <div class="divider"></div>
      <div class="network-category">
        <span class="network-category-chip" style=${Lit11.Directives.styleMap(chipStyle)}>
        </span>${networkResourceCategory(networkRequest)}
      </div>
      <div class="priority-row">${i18nString13(UIStrings14.priority)}: ${NetworkRequestTooltip.renderPriorityValue(networkRequest)}</div>
      ${throttlingTitle ? html11`
        <div class="throttled-row">
          ${i18nString13(UIStrings14.wasThrottled, { PH1: throttlingTitle })}
        </div>` : nothing12}
      ${Trace6.Helpers.Network.isSyntheticNetworkRequestEventRenderBlocking(networkRequest) ? html11`<div class="render-blocking"> ${i18nString13(UIStrings14.renderBlocking)} </div>` : Lit11.nothing}
      <div class="divider"></div>

      ${NetworkRequestTooltip.renderTimings(networkRequest)}

      ${redirectsHtml ? html11`
        <div class="divider"></div>
        ${redirectsHtml}
      ` : Lit11.nothing}
    </div>
  `, target);
};
var NetworkRequestTooltip = class _NetworkRequestTooltip extends UI10.Widget.Widget {
  static createWidgetElement(request, entityMapper) {
    return html11`${widget3(_NetworkRequestTooltip, { networkRequest: request, entityMapper })}`;
  }
  #view;
  #networkRequest;
  #entityMapper;
  constructor(element, view = DEFAULT_VIEW6) {
    super(element, { useShadowDom: true });
    this.#view = view;
  }
  set networkRequest(networkRequest) {
    this.#networkRequest = networkRequest;
    this.requestUpdate();
  }
  set entityMapper(entityMapper) {
    this.#entityMapper = entityMapper;
    this.requestUpdate();
  }
  static renderPriorityValue(networkRequest) {
    if (networkRequest.args.data.priority === networkRequest.args.data.initialPriority) {
      return html11`${PerfUI.NetworkPriorities.uiLabelForNetworkPriority(networkRequest.args.data.priority)}`;
    }
    return html11`${PerfUI.NetworkPriorities.uiLabelForNetworkPriority(networkRequest.args.data.initialPriority)}
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
    const sdkNetworkRequest = SDK4.TraceObject.RevealableNetworkRequest.create(SDK4.TargetManager.TargetManager.instance(), networkRequest);
    const wasThrottled = sdkNetworkRequest && SDK4.NetworkManager.MultitargetNetworkManager.instance().appliedRequestConditions(
      sdkNetworkRequest.networkRequest
    );
    const throttledTitle = wasThrottled ? i18nString13(UIStrings14.wasThrottled, {
      PH1: typeof wasThrottled.conditions.title === "string" ? wasThrottled.conditions.title : wasThrottled.conditions.title()
    }) : void 0;
    const leftWhisker = html11`<span class="whisker-left"> <span class="horizontal"></span> </span>`;
    const rightWhisker = html11`<span class="whisker-right"> <span class="horizontal"></span> </span>`;
    const classes = classMap({
      ["timings-row timings-row--duration"]: true,
      throttled: Boolean(wasThrottled?.urlPattern)
    });
    return html11`
      <div
        class=${classes}
        title=${ifDefined2(throttledTitle)}>
        ${wasThrottled?.urlPattern ? html11`<devtools-icon
          class=indicator
          name=watch
          ></devtools-icon>` : html11`<span class="indicator"></span>`}
        ${i18nString13(UIStrings14.duration)}
         <span class="time"> ${i18n27.TimeUtilities.formatMicroSecondsTime(networkRequest.dur)} </span>
      </div>
      <div class="timings-row">
        ${leftWhisker}
        ${i18nString13(UIStrings14.queuingAndConnecting)}
        <span class="time"> ${i18n27.TimeUtilities.formatMicroSecondsTime(queueing)} </span>
      </div>
      <div class="timings-row">
        <span class="indicator" style=${Lit11.Directives.styleMap(styleForWaiting)}></span>
        ${i18nString13(UIStrings14.requestSentAndWaiting)}
        <span class="time"> ${i18n27.TimeUtilities.formatMicroSecondsTime(requestPlusWaiting)} </span>
      </div>
      <div class="timings-row">
        <span class="indicator" style=${Lit11.Directives.styleMap(styleForDownloading)}></span>
        ${i18nString13(UIStrings14.contentDownloading)}
        <span class="time"> ${i18n27.TimeUtilities.formatMicroSecondsTime(download)} </span>
      </div>
      <div class="timings-row">
        ${rightWhisker}
        ${i18nString13(UIStrings14.waitingOnMainThread)}
        <span class="time"> ${i18n27.TimeUtilities.formatMicroSecondsTime(waitingOnMainThread)} </span>
      </div>
    `;
  }
  static renderRedirects(networkRequest) {
    const redirectRows = [];
    if (networkRequest.args.data.redirects.length > 0) {
      redirectRows.push(html11`
        <div class="redirects-row">
          ${i18nString13(UIStrings14.redirects)}
        </div>
      `);
      for (const redirect of networkRequest.args.data.redirects) {
        redirectRows.push(html11`<div class="redirects-row"> ${redirect.url}</div>`);
      }
      return html11`${redirectRows}`;
    }
    return null;
  }
  performUpdate() {
    if (!this.#networkRequest) {
      return;
    }
    const sdkNetworkRequest = SDK4.TraceObject.RevealableNetworkRequest.create(
      SDK4.TargetManager.TargetManager.instance(),
      this.#networkRequest
    );
    const networkConditions = sdkNetworkRequest && SDK4.NetworkManager.MultitargetNetworkManager.instance().appliedRequestConditions(
      sdkNetworkRequest.networkRequest
    );
    let throttlingTitle = void 0;
    if (networkConditions) {
      throttlingTitle = typeof networkConditions.conditions.title === "string" ? networkConditions.conditions.title : networkConditions.conditions.title();
    }
    const input = {
      networkRequest: this.#networkRequest,
      entityMapper: this.#entityMapper,
      throttlingTitle
    };
    this.#view(input, void 0, this.contentElement);
  }
};

// ../../front_end/panels/timeline/components/NetworkRequestDetails.ts
var { html: html12, render: render12 } = Lit12;
var MAX_URL_LENGTH3 = 100;
var UIStrings15 = {
  /**
   * @description Label for the HTTP request method in the network request details view of the Performance panel.
   */
  requestMethod: "Request method",
  /**
   * @description Label for the network protocol in the network request details view of the Performance panel.
   */
  protocol: "Protocol",
  /**
   * @description Label for the network request priority in the network request details view of the Performance panel.
   */
  priority: "Priority",
  /**
   * @description Label for the encoded data size in the network request details view of the Performance panel.
   */
  encodedData: "Encoded data",
  /**
   * @description Label for the decoded body size in the network request details view of the Performance panel.
   */
  decodedBody: "Decoded body",
  /**
   * @description Value indicating yes in the network request details view of the Performance panel.
   */
  yes: "Yes",
  /**
   * @description Value indicating no in the network request details view of the Performance panel.
   */
  no: "No",
  /**
   * @description Header title for a network request in the network request details view of the Performance panel.
   */
  networkRequest: "Network request",
  /**
   * @description Label indicating whether a network request was served from cache in the network request details view of the Performance panel.
   */
  fromCache: "From cache",
  /**
   * @description Label for the MIME type of a network request in the network request details view of the Performance panel.
   */
  mimeType: "MIME type",
  /**
   * @description Suffix indicating that a network request was served from memory cache in the Performance panel.
   */
  FromMemoryCache: " (from memory cache)",
  /**
   * @description Suffix indicating that a network request was served from disk cache in the Performance panel.
   */
  FromCache: " (from cache)",
  /**
   * @description Suffix indicating that a network request was served from server push in the Performance panel.
   */
  FromPush: " (from push)",
  /**
   * @description Suffix indicating that a network request was served from a service worker in the Performance panel.
   */
  FromServiceWorker: " (from `service worker`)",
  /**
   * @description Label indicating what initiated the network request in the network request details view of the Performance panel.
   */
  initiatedBy: "Initiated by",
  /**
   * @description Label for the render-blocking status of a network request in the network request details view of the Performance panel.
   */
  blocking: "Blocking",
  /**
   * @description Status value indicating that a network request is in-body parser blocking in the Performance panel.
   */
  inBodyParserBlocking: "In-body parser blocking",
  /**
   * @description Status value indicating that a network request is render-blocking in the Performance panel.
   */
  renderBlocking: "Render-blocking",
  /**
   * @description Label for the third-party entity of a network request in the network request details view of the Performance panel.
   */
  entity: "3rd party",
  /**
   * @description Column header for server timing metric names in the network request details view of the Performance panel.
   */
  serverTiming: "Server timing",
  /**
   * @description Column header for server timing duration values in the network request details view of the Performance panel.
   */
  time: "Time",
  /**
   * @description Column header for server timing descriptions in the network request details view of the Performance panel.
   */
  description: "Description"
};
var str_15 = i18n29.i18n.registerUIStrings("panels/timeline/components/NetworkRequestDetails.ts", UIStrings15);
var i18nString14 = i18n29.i18n.getLocalizedString.bind(void 0, str_15);
var NetworkRequestDetails = class extends UI11.Widget.Widget {
  #view;
  #request = null;
  #requestPreviewElements = /* @__PURE__ */ new WeakMap();
  #entityMapper = null;
  #target = null;
  #linkifier = null;
  #serverTimings = null;
  #parsedTrace = null;
  constructor(element, view = DEFAULT_VIEW7) {
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
        this.#serverTimings = SDK5.ServerTiming.ServerTiming.parseHeaders([header], Common4.Console.Console.instance());
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
    this.#view(
      {
        request: this.#request,
        previewElementsCache: this.#requestPreviewElements,
        target: this.#target,
        entityMapper: this.#entityMapper,
        serverTimings: this.#serverTimings,
        linkifier: this.#linkifier,
        parsedTrace: this.#parsedTrace
      },
      {},
      this.contentElement
    );
  }
};
var DEFAULT_VIEW7 = (input, _output, target) => {
  if (!input.request) {
    render12(Lit12.nothing, target);
    return;
  }
  const { request } = input;
  const { data } = request.args;
  const redirectsHtml = NetworkRequestTooltip.renderRedirects(request);
  render12(html12`
        <style>${networkRequestDetails_css_default}</style>
        <style>${networkRequestTooltip_css_default}</style>

        <div class="network-request-details-content"
             data-network-request-id=${input.request.args.data.requestId}
             jslog=${VisualLogging8.section("timeline.network-request-details")}>
          ${renderTitle(input.request)}
          ${renderURL(input.request)}
          <div class="network-request-details-cols">
            ${Lit12.Directives.until(renderPreviewElement(
    input.request,
    input.target,
    input.previewElementsCache
  ))}
            <div class="network-request-details-col">
              ${renderRow(i18nString14(UIStrings15.requestMethod), data.requestMethod)}
              ${renderRow(i18nString14(UIStrings15.protocol), data.protocol)}
              ${renderRow(i18nString14(UIStrings15.priority), NetworkRequestTooltip.renderPriorityValue(request))}
              ${renderRow(i18nString14(UIStrings15.mimeType), data.mimeType)}
              ${renderEncodedDataLength(request)}
              ${renderRow(i18nString14(UIStrings15.decodedBody), i18n29.ByteUtilities.bytesToString(request.args.data.decodedBodyLength))}
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
            ${redirectsHtml ? html12`
              <div class="column-divider"></div>
              <div class="network-request-details-col redirect-details">
                ${redirectsHtml}
              </div>
            ` : Lit12.nothing}
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
  return html12`
    <div class="network-request-details-title">
      <div style=${Lit12.Directives.styleMap(style)}></div>
      ${i18nString14(UIStrings15.networkRequest)}
    </div>
  `;
}
function renderURL(request) {
  const options = {
    tabStop: true,
    showColumnNumber: false,
    maxLength: MAX_URL_LENGTH3
  };
  const linkifiedURL = LegacyComponents2.Linkifier.Linkifier.linkifyURL(
    request.args.data.url,
    options
  );
  const networkRequest = SDK5.TraceObject.RevealableNetworkRequest.create(SDK5.TargetManager.TargetManager.instance(), request);
  if (networkRequest) {
    linkifiedURL.addEventListener("contextmenu", (event) => {
      const contextMenu = new UI11.ContextMenu.ContextMenu(event);
      contextMenu.appendApplicableItems(networkRequest);
      void contextMenu.show();
    });
    const urlElement = html12`
        ${linkifiedURL}
        <devtools-request-link-icon .data=${{ request: networkRequest.networkRequest }}>
        </devtools-request-link-icon>
      `;
    return html12`<div class="network-request-details-item">${urlElement}</div>`;
  }
  return html12`<div class="network-request-details-item">${linkifiedURL}</div>`;
}
async function renderPreviewElement(request, target, previewElementsCache) {
  if (!request.args.data.url || !target) {
    return Lit12.nothing;
  }
  const url = request.args.data.url;
  if (!previewElementsCache.get(request)) {
    const previewOpts = {
      imageAltText: LegacyComponents2.ImagePreview.ImagePreview.defaultAltTextForImageURL(url),
      align: LegacyComponents2.ImagePreview.Align.START,
      hideFileData: true
    };
    const previewElement = await LegacyComponents2.ImagePreview.ImagePreview.build(
      url,
      false,
      previewOpts
    );
    if (previewElement) {
      previewElementsCache.set(request, previewElement);
    }
  }
  const requestPreviewElement = previewElementsCache.get(request);
  if (requestPreviewElement) {
    return html12`
      <div class="network-request-details-col">${requestPreviewElement}</div>
      <div class="column-divider"></div>`;
  }
  return Lit12.nothing;
}
function renderRow(title, value2) {
  if (!value2) {
    return Lit12.nothing;
  }
  return html12`
      <div class="network-request-details-row" jslog=${VisualLogging8.item("detail-row")}>
        <div class="title">${title}</div>
        <div class="value">${value2}</div>
      </div>`;
}
function renderEncodedDataLength(request) {
  let lengthText = "";
  if (request.args.data.syntheticData.isMemoryCached) {
    lengthText += i18nString14(UIStrings15.FromMemoryCache);
  } else if (request.args.data.syntheticData.isDiskCached) {
    lengthText += i18nString14(UIStrings15.FromCache);
  } else if (request.args.data.timing?.pushStart) {
    lengthText += i18nString14(UIStrings15.FromPush);
  }
  if (request.args.data.fromServiceWorker) {
    lengthText += i18nString14(UIStrings15.FromServiceWorker);
  }
  if (request.args.data.encodedDataLength || !lengthText) {
    lengthText = `${i18n29.ByteUtilities.bytesToString(request.args.data.encodedDataLength)}${lengthText}`;
  }
  return renderRow(i18nString14(UIStrings15.encodedData), lengthText);
}
function renderBlockingRow(request) {
  if (!Helpers9.Network.isSyntheticNetworkRequestEventRenderBlocking(request)) {
    return Lit12.nothing;
  }
  let renderBlockingText;
  switch (request.args.data.renderBlocking) {
    case "blocking":
      renderBlockingText = UIStrings15.renderBlocking;
      break;
    case "in_body_parser_blocking":
      renderBlockingText = UIStrings15.inBodyParserBlocking;
      break;
    default:
      return Lit12.nothing;
  }
  return renderRow(i18nString14(UIStrings15.blocking), renderBlockingText);
}
function renderFromCache(request) {
  const cached = request.args.data.syntheticData.isMemoryCached || request.args.data.syntheticData.isDiskCached;
  return renderRow(i18nString14(UIStrings15.fromCache), cached ? i18nString14(UIStrings15.yes) : i18nString14(UIStrings15.no));
}
function renderThirdPartyEntity(request, entityMapper) {
  if (!entityMapper) {
    return Lit12.nothing;
  }
  const entity = entityMapper.entityForEvent(request);
  if (!entity) {
    return Lit12.nothing;
  }
  return renderRow(i18nString14(UIStrings15.entity), entity.name);
}
function renderServerTimings(timings) {
  if (!timings || timings.length === 0) {
    return Lit12.nothing;
  }
  return html12`
    <div class="column-divider"></div>
    <div class="network-request-details-col server-timings">
      <div class="server-timing-column-header">${i18nString14(UIStrings15.serverTiming)}</div>
      <div class="server-timing-column-header">${i18nString14(UIStrings15.description)}</div>
      <div class="server-timing-column-header">${i18nString14(UIStrings15.time)}</div>
      ${timings.map((timing) => {
    const classes = timing.metric.startsWith("(c") ? "synthetic value" : "value";
    return html12`
          <div class=${classes}>${timing.metric || "-"}</div>
          <div class=${classes}>${timing.description || "-"}</div>
          <div class=${classes}>${timing.value || "-"}</div>
        `;
  })}
    </div>`;
}
function renderInitiatedBy(request, parsedTrace, target, linkifier) {
  if (!linkifier) {
    return Lit12.nothing;
  }
  const hasStackTrace = Trace7.Helpers.Trace.stackTraceInEvent(request) !== null;
  let link = null;
  const options = {
    tabStop: true,
    showColumnNumber: true
  };
  if (hasStackTrace) {
    const topFrame = Trace7.Helpers.Trace.getStackTraceTopCallFrameInEventPayload(request) ?? null;
    if (topFrame) {
      link = linkifier.maybeLinkifyConsoleCallFrame(target, topFrame, options);
    }
  }
  const initiator = parsedTrace ? Trace7.Extras.Initiators.getNetworkInitiator(parsedTrace.data, request) : void 0;
  if (initiator && Trace7.Types.Events.isSyntheticNetworkRequest(initiator)) {
    link = linkifier.maybeLinkifyScriptLocation(
      target,
      null,
      // this would be the scriptId, but we don't have one. The linkifier will fallback to using the URL.
      initiator.args.data.url,
      void 0,
      // line number
      options
    );
  }
  if (!link) {
    return Lit12.nothing;
  }
  return html12`
      <div class="network-request-details-item">
        <div class="title">${i18nString14(UIStrings15.initiatedBy)}</div>
        <div class="value focusable-outline">${link}</div>
      </div>`;
}

// ../../front_end/panels/timeline/components/NetworkTrackWidget.ts
var NetworkTrackWidget_exports = {};
__export(NetworkTrackWidget_exports, {
  NetworkTrackWidget: () => NetworkTrackWidget
});
import * as Trace8 from "../../../models/trace/trace.js";
import * as PerfUI2 from "../../../ui/legacy/components/perf_ui/perf_ui.js";
import * as Lit13 from "../../../ui/lit/lit.js";

// gen/front_end/panels/timeline/components/networkTrackWidget.css.js
var networkTrackWidget_css_default = `/* Copyright 2026 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file. */

:host {
  display: flex;
}

.container {
  display: flex;
  width: 100%;
  height: 150px;
  background-color: var(--sys-color-cdt-base-container);
  border-radius: var(--sys-shape-corner-small);
  border: var(--sys-size-1) solid var(--sys-color-divider);
}

.container canvas {
  /* stylelint-disable-next-line declaration-no-important */
  pointer-events: none !important;
}

.flex-auto {
  flex: auto;
}

.vbox {
  display: flex;
  flex-direction: column;
  position: relative;
}

/*# sourceURL=${import.meta.resolve("./networkTrackWidget.css")} */`;

// ../../front_end/panels/timeline/components/NetworkTrackWidget.ts
var { html: html13 } = Lit13;
var NetworkTrackWidget = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #flameChartContainer = document.createElement("div");
  #flameChart = null;
  #dataProvider = null;
  #parsedTrace = null;
  constructor() {
    super();
    this.#flameChartContainer.classList.add("container");
  }
  set data(data) {
    const parsedTrace = data.parsedTrace;
    const dataProvider = data.dataProvider;
    if (!parsedTrace || !dataProvider) {
      return;
    }
    const isDataProviderChanged = dataProvider !== this.#dataProvider;
    this.#dataProvider = dataProvider;
    this.#parsedTrace = parsedTrace;
    this.#render();
    if (isDataProviderChanged || !this.#flameChart) {
      this.#flameChartContainer.innerHTML = "";
      this.#flameChart = new PerfUI2.FlameChart.FlameChart(this.#dataProvider, this);
      this.#flameChart.show(this.#flameChartContainer, void 0, true);
    }
    const entityMapper = Trace8.EntityMapper.EntityMapper.getOrCreate(parsedTrace);
    this.#dataProvider.preparePopoverElement = () => null;
    this.#dataProvider.setModel(parsedTrace, entityMapper);
    const timelineData = this.#dataProvider.timelineData();
    timelineData.groups = [];
    const bounds = Trace8.Helpers.Timing.traceWindowMicroSecondsToMilliSeconds({
      min: Trace8.Types.Timing.Micro(data.bounds.min),
      max: Trace8.Types.Timing.Micro(data.bounds.max),
      range: Trace8.Types.Timing.Micro(data.bounds.range)
    });
    this.#dataProvider.setWindowTimes(bounds.min, bounds.max);
    this.#flameChart.setWindowTimes(bounds.min, bounds.max);
    this.#render();
  }
  #render() {
    if (!this.#parsedTrace) {
      return;
    }
    const output = html13`
        <style>${networkTrackWidget_css_default}</style>
        ${this.#flameChartContainer}
      `;
    Lit13.render(output, this.#shadow, { host: this });
    if (this.#flameChart) {
      this.#flameChart.update();
    }
  }
  windowChanged(_windowStartTime, _windowEndTime, _animate) {
  }
  updateRangeSelection(_startTime, _endTime) {
  }
  updateSelectedGroup(_flameChart, _group) {
  }
};
if (!customElements.get("devtools-performance-agent-network-track")) {
  customElements.define("devtools-performance-agent-network-track", NetworkTrackWidget);
}

// ../../front_end/panels/timeline/components/RelatedInsightChips.ts
var RelatedInsightChips_exports = {};
__export(RelatedInsightChips_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW8,
  RelatedInsightChips: () => RelatedInsightChips
});
import * as i18n31 from "../../../core/i18n/i18n.js";
import * as UI12 from "../../../ui/legacy/legacy.js";
import * as Lit14 from "../../../ui/lit/lit.js";

// gen/front_end/panels/timeline/components/relatedInsightChips.css.js
var relatedInsightChips_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
  :scope {
    display: block;
    border-bottom: var(--sys-size-1) solid var(--sys-color-divider);
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

// ../../front_end/panels/timeline/components/RelatedInsightChips.ts
var { html: html14, render: render14 } = Lit14;
var UIStrings16 = {
  /**
   * @description Prefix shown next to related insight chips in the Performance panel.
   */
  insightKeyword: "Insight",
  /**
   * @description Prefix shown next to related insight chips containing the insight name in the Performance panel.
   * @example {Improve image delivery} PH1
   */
  insightWithName: "Insight: {PH1}"
};
var str_16 = i18n31.i18n.registerUIStrings("panels/timeline/components/RelatedInsightChips.ts", UIStrings16);
var i18nString15 = i18n31.i18n.getLocalizedString.bind(void 0, str_16);
var RelatedInsightChips = class extends UI12.Widget.Widget {
  #view;
  #activeEvent = null;
  #eventToInsightsMap = /* @__PURE__ */ new Map();
  constructor(element, view = DEFAULT_VIEW8) {
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
var DEFAULT_VIEW8 = (input, _output, target) => {
  const { activeEvent, eventToInsightsMap } = input;
  const relatedInsights = activeEvent ? eventToInsightsMap.get(activeEvent) ?? [] : [];
  if (!activeEvent || eventToInsightsMap.size === 0 || relatedInsights.length === 0) {
    render14(Lit14.nothing, target);
    return;
  }
  const insightMessages = relatedInsights.flatMap((insight) => {
    return insight.messages.map((message) => html14`
          <li class="insight-message-box">
            <button type="button" @click=${(event) => {
      event.preventDefault();
      input.onInsightClick(insight);
    }}>
              <div class="insight-label">${i18nString15(UIStrings16.insightWithName, {
      PH1: insight.insightLabel
    })}</div>
              <div class="insight-message">${message}</div>
            </button>
          </li>
        `);
  });
  const insightChips = relatedInsights.flatMap((insight) => {
    return [html14`
          <li class="insight-chip">
            <button type="button" @click=${(event) => {
      event.preventDefault();
      input.onInsightClick(insight);
    }}>
              <span class="keyword">${i18nString15(UIStrings16.insightKeyword)}</span>
              <span class="insight-label">${insight.insightLabel}</span>
            </button>
          </li>
        `];
  });
  render14(
    html14`<style>${relatedInsightChips_css_default}</style>
        <ul>${insightMessages}</ul>
        <ul>${insightChips}</ul>`,
    target
  );
};

// ../../front_end/panels/timeline/components/Sidebar.ts
var Sidebar_exports = {};
__export(Sidebar_exports, {
  AnnotationHoverOut: () => AnnotationHoverOut,
  DEFAULT_SIDEBAR_TAB: () => DEFAULT_SIDEBAR_TAB,
  DEFAULT_SIDEBAR_WIDTH_PX: () => DEFAULT_SIDEBAR_WIDTH_PX,
  HoverAnnotation: () => HoverAnnotation,
  RemoveAnnotation: () => RemoveAnnotation,
  RevealAnnotation: () => RevealAnnotation,
  SidebarTabs: () => SidebarTabs,
  SidebarWidget: () => SidebarWidget
});
import * as Common6 from "../../../core/common/common.js";
import * as UI16 from "../../../ui/legacy/legacy.js";
import * as Insights9 from "./insights/insights.js";

// ../../front_end/panels/timeline/components/SidebarAnnotationsTab.ts
var SidebarAnnotationsTab_exports = {};
__export(SidebarAnnotationsTab_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW9,
  SidebarAnnotationsTab: () => SidebarAnnotationsTab
});
import "../../../ui/components/settings/settings.js";
import * as Common5 from "../../../core/common/common.js";
import * as i18n33 from "../../../core/i18n/i18n.js";
import * as Platform7 from "../../../core/platform/platform.js";
import * as Trace9 from "../../../models/trace/trace.js";
import * as TraceBounds3 from "../../../services/trace_bounds/trace_bounds.js";
import * as UI13 from "../../../ui/legacy/legacy.js";
import * as ThemeSupport3 from "../../../ui/legacy/theme_support/theme_support.js";
import * as Lit15 from "../../../ui/lit/lit.js";
import * as VisualLogging9 from "../../../ui/visual_logging/visual_logging.js";

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
    gap: var(--sys-size-4);
  }

  .annotation-identifier {
    padding: var(--sys-size-3) var(--sys-size-5);
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
    row-gap: var(--sys-size-2);
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
    border: var(--sys-size-1) solid var(--sys-color-divider);
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

// ../../front_end/panels/timeline/components/SidebarAnnotationsTab.ts
var { html: html15, render: render15 } = Lit15;
var diagramImageUrl = new URL("../../../Images/performance-panel-diagram.svg", import.meta.url).toString();
var entryLabelImageUrl = new URL("../../../Images/performance-panel-entry-label.svg", import.meta.url).toString();
var timeRangeImageUrl = new URL("../../../Images/performance-panel-time-range.svg", import.meta.url).toString();
var deleteAnnotationImageUrl = new URL("../../../Images/performance-panel-delete-annotation.svg", import.meta.url).toString();
var UIStrings17 = {
  /**
   * @description Title for the annotations onboarding section in the Performance panel sidebar.
   */
  annotationGetStarted: "Annotate a trace for yourself and others",
  /**
   * @description Header title for the item label tutorial in the Performance panel sidebar.
   */
  entryLabelTutorialTitle: "Label an item",
  /**
   * @description Instructions for how to add an item label in the Performance panel.
   */
  entryLabelTutorialDescription: "Double-click or press Enter on an item and type to add an item label.",
  /**
   * @description Header title for the item connection tutorial in the Performance panel sidebar.
   */
  entryLinkTutorialTitle: "Connect two items",
  /**
   * @description Instructions for how to connect two items in the flame chart of the Performance panel.
   */
  entryLinkTutorialDescription: "Double-click on an item, click on the adjacent rightward arrow, then select the destination item.",
  /**
   * @description Header title for the time range tutorial in the Performance panel sidebar.
   */
  timeRangeTutorialTitle: "Define a time range",
  /**
   * @description Instructions for how to add a time range annotation in the flame chart of the Performance panel.
   */
  timeRangeTutorialDescription: "Shift-drag in the flame chart, then type to add a time range annotation.",
  /**
   * @description Header title for the annotation deletion tutorial in the Performance panel sidebar.
   */
  deleteAnnotationTutorialTitle: "Delete an annotation",
  /**
   * @description Instructions for how to delete an annotation in the Performance panel sidebar.
   */
  deleteAnnotationTutorialDescription: "Hover over the list in the sidebar Annotations tab to delete an annotation.",
  /**
   * @description Accessible label for the delete annotation button in the Performance panel sidebar.
   * @example {A paint event annotated with the text hello world} PH1
   */
  deleteButton: "Delete annotation: {PH1}",
  /**
   * @description Accessible label describing an item annotation in the Performance panel sidebar.
   * @example {Paint} PH1
   * @example {Hello world} PH2
   */
  entryLabelDescriptionLabel: 'A "{PH1}" event annotated with the text "{PH2}"',
  /**
   * @description Accessible label describing a time range annotation in the Performance panel sidebar.
   * @example {2.5 milliseconds} PH1
   * @example {13.5 milliseconds} PH2
   */
  timeRangeDescriptionLabel: "A time range starting at {PH1} and ending at {PH2}",
  /**
   * @description Accessible label describing a link between two events in the Performance panel sidebar.
   * @example {Paint} PH1
   * @example {Recalculate styles} PH2
   */
  entryLinkDescriptionLabel: 'A link between a "{PH1}" event and a "{PH2}" event'
};
var str_17 = i18n33.i18n.registerUIStrings("panels/timeline/components/SidebarAnnotationsTab.ts", UIStrings17);
var i18nString16 = i18n33.i18n.getLocalizedString.bind(void 0, str_17);
var SidebarAnnotationsTab = class extends UI13.Widget.Widget {
  #annotations = [];
  // A map with annotated entries and the colours that are used to display them in the FlameChart.
  // We need this map to display the entries in the sidebar with the same colours.
  #annotationEntryToColorMap = /* @__PURE__ */ new Map();
  #annotationsHiddenSetting;
  #view;
  constructor(view = DEFAULT_VIEW9) {
    super();
    this.#view = view;
    this.#annotationsHiddenSetting = Common5.Settings.Settings.instance().moduleSetting("annotations-hidden");
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
    processedAnnotations.sort(
      (firstAnnotation, secondAnnotation) => this.#getAnnotationTimestamp(firstAnnotation) - this.#getAnnotationTimestamp(secondAnnotation)
    );
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
        Platform7.assertNever(annotation, `Invalid annotation type ${annotation}`);
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
      const name = Trace9.Name.forEntry(annotation.entry);
      return i18nString16(UIStrings17.entryLabelDescriptionLabel, {
        PH1: name,
        PH2: annotation.label
      });
    }
    case "TIME_RANGE": {
      const from = i18n33.TimeUtilities.formatMicroSecondsAsMillisFixedExpanded(annotation.bounds.min);
      const to = i18n33.TimeUtilities.formatMicroSecondsAsMillisFixedExpanded(annotation.bounds.max);
      return i18nString16(UIStrings17.timeRangeDescriptionLabel, {
        PH1: from,
        PH2: to
      });
    }
    case "ENTRIES_LINK": {
      if (!annotation.entryTo) {
        return "";
      }
      const nameFrom = Trace9.Name.forEntry(annotation.entryFrom);
      const nameTo = Trace9.Name.forEntry(annotation.entryTo);
      return i18nString16(UIStrings17.entryLinkDescriptionLabel, {
        PH1: nameFrom,
        PH2: nameTo
      });
    }
    default:
      Platform7.assertNever(annotation, "Unsupported annotation");
  }
}
function findTextColorForContrast(bgColorText) {
  const bgColor = Common5.Color.parse(bgColorText)?.asLegacyColor();
  const darkColorToken = "--app-color-performance-sidebar-label-text-dark";
  const darkColorText = Common5.Color.parse(ThemeSupport3.ThemeSupport.instance().getComputedValue(darkColorToken))?.asLegacyColor();
  if (!bgColor || !darkColorText) {
    return `var(${darkColorToken})`;
  }
  const contrastRatio = Common5.ColorUtils.contrastRatio(bgColor.rgba(), darkColorText.rgba());
  return contrastRatio >= 4.5 ? `var(${darkColorToken})` : "var(--app-color-performance-sidebar-label-text-light)";
}
function renderAnnotationIdentifier(annotation, annotationEntryToColorMap) {
  switch (annotation.type) {
    case "ENTRY_LABEL": {
      const entryName = Trace9.Name.forEntry(annotation.entry);
      const backgroundColor = annotationEntryToColorMap.get(annotation.entry) ?? "";
      const color = findTextColorForContrast(backgroundColor);
      const styleForAnnotationIdentifier = {
        backgroundColor,
        color
      };
      return html15`
            <span class="annotation-identifier" style=${Lit15.Directives.styleMap(styleForAnnotationIdentifier)}>
              ${entryName}
            </span>
      `;
    }
    case "TIME_RANGE": {
      const minTraceBoundsMilli = TraceBounds3.TraceBounds.BoundsManager.instance().state()?.milli.entireTraceBounds.min ?? 0;
      const timeRangeStartInMs = Math.round(Trace9.Helpers.Timing.microToMilli(annotation.bounds.min) - minTraceBoundsMilli);
      const timeRangeEndInMs = Math.round(Trace9.Helpers.Timing.microToMilli(annotation.bounds.max) - minTraceBoundsMilli);
      return html15`
            <span class="annotation-identifier time-range">
              ${timeRangeStartInMs} - ${timeRangeEndInMs} ms
            </span>
      `;
    }
    case "ENTRIES_LINK": {
      const entryFromName = Trace9.Name.forEntry(annotation.entryFrom);
      const fromBackgroundColor = annotationEntryToColorMap.get(annotation.entryFrom) ?? "";
      const fromTextColor = findTextColorForContrast(fromBackgroundColor);
      const styleForFromAnnotationIdentifier = {
        backgroundColor: fromBackgroundColor,
        color: fromTextColor
      };
      return html15`
        <div class="entries-link">
          <span class="annotation-identifier" style=${Lit15.Directives.styleMap(styleForFromAnnotationIdentifier)}>
            ${entryFromName}
          </span>
          <devtools-icon name="arrow-forward" class="inline-icon large">
          </devtools-icon>
          ${renderEntryToIdentifier(annotation, annotationEntryToColorMap)}
        </div>
    `;
    }
    default:
      Platform7.assertNever(annotation, "Unsupported annotation type");
  }
}
function renderEntryToIdentifier(annotation, annotationEntryToColorMap) {
  if (annotation.entryTo) {
    const entryToName = Trace9.Name.forEntry(annotation.entryTo);
    const toBackgroundColor = annotationEntryToColorMap.get(annotation.entryTo) ?? "";
    const toTextColor = findTextColorForContrast(toBackgroundColor);
    const styleForToAnnotationIdentifier = {
      backgroundColor: toBackgroundColor,
      color: toTextColor
    };
    return html15`
      <span class="annotation-identifier" style=${Lit15.Directives.styleMap(styleForToAnnotationIdentifier)}>
        ${entryToName}
      </span>`;
  }
  return Lit15.nothing;
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
      Platform7.assertNever(annotation, "unknown annotation type");
  }
}
function renderTutorial() {
  return html15`<div class="annotation-tutorial-container">
    ${i18nString16(UIStrings17.annotationGetStarted)}
      <div class="tutorial-card">
        <div class="tutorial-image"><img src=${entryLabelImageUrl}></div>
        <div class="tutorial-title">${i18nString16(UIStrings17.entryLabelTutorialTitle)}</div>
        <div class="tutorial-description">${i18nString16(UIStrings17.entryLabelTutorialDescription)}</div>
      </div>
      <div class="tutorial-card">
        <div class="tutorial-image"><img src=${diagramImageUrl}></div>
        <div class="tutorial-title">${i18nString16(UIStrings17.entryLinkTutorialTitle)}</div>
        <div class="tutorial-description">${i18nString16(UIStrings17.entryLinkTutorialDescription)}</div>
      </div>
      <div class="tutorial-card">
        <div class="tutorial-image"><img src=${timeRangeImageUrl}></div>
        <div class="tutorial-title">${i18nString16(UIStrings17.timeRangeTutorialTitle)}</div>
        <div class="tutorial-description">${i18nString16(UIStrings17.timeRangeTutorialDescription)}</div>
      </div>
      <div class="tutorial-card">
        <div class="tutorial-image"><img src=${deleteAnnotationImageUrl}></div>
        <div class="tutorial-title">${i18nString16(UIStrings17.deleteAnnotationTutorialTitle)}</div>
        <div class="tutorial-description">${i18nString16(UIStrings17.deleteAnnotationTutorialDescription)}</div>
      </div>
    </div>`;
}
var DEFAULT_VIEW9 = (input, _output, target) => {
  render15(
    html15`
      <style>${sidebarAnnotationsTab_css_default}</style>
      <span class="annotations">
        ${input.annotations.length === 0 ? renderTutorial() : html15`
            ${input.annotations.map((annotation) => {
      const label = detailedAriaDescriptionForAnnotation(annotation);
      return html15`
                <div class="annotation-container"
                  @click=${() => input.onAnnotationClick(annotation)}
                  @mouseover=${() => annotation.type === "ENTRY_LABEL" ? input.onAnnotationHover(annotation) : null}
                  @mouseout=${() => annotation.type === "ENTRY_LABEL" ? input.onAnnotationHoverOut() : null}
                  aria-label=${label}
                  tabindex="0"
                  jslog=${VisualLogging9.item(`timeline.annotation-sidebar.annotation-${jslogForAnnotation(annotation)}`).track({ click: true, resize: true })}
                >
                  <div class="annotation">
                    ${renderAnnotationIdentifier(annotation, input.annotationEntryToColorMap)}
                    <span class="label">
                      ${annotation.type === "ENTRY_LABEL" || annotation.type === "TIME_RANGE" ? annotation.label : ""}
                    </span>
                  </div>
                  <button class="delete-button" aria-label=${i18nString16(UIStrings17.deleteButton, { PH1: label })} @click=${(event) => {
        event.stopPropagation();
        input.onAnnotationDelete(annotation);
      }} jslog=${VisualLogging9.action("timeline.annotation-sidebar.delete").track({ click: true })}>
                    <devtools-icon class="bin-icon extra-large" name="bin"></devtools-icon>
                  </button>
                </div>`;
    })}
            <setting-checkbox class="visibility-setting" .data=${{
      setting: input.annotationsHiddenSetting,
      textOverride: "Hide annotations"
    }}>
            </setting-checkbox>`}
    </span>`,
    target
  );
};

// ../../front_end/panels/timeline/components/SidebarInsightsTab.ts
var SidebarInsightsTab_exports = {};
__export(SidebarInsightsTab_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW11,
  SidebarInsightsTab: () => SidebarInsightsTab
});
import * as Trace11 from "../../../models/trace/trace.js";
import * as Buttons8 from "../../../ui/components/buttons/buttons.js";
import * as UI15 from "../../../ui/legacy/legacy.js";
import * as Lit17 from "../../../ui/lit/lit.js";
import * as Utils from "../utils/utils.js";
import * as Insights8 from "./insights/insights.js";

// gen/front_end/panels/timeline/components/sidebarInsightsTab.css.js
var sidebarInsightsTab_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
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
      border-bottom: var(--sys-size-1) solid var(--sys-color-divider);
    }

    summary {
      background-color: var(--sys-color-surface2);
      border-bottom: var(--sys-size-1) solid var(--sys-color-divider);
      overflow: hidden;
      padding: var(--sys-size-2) 5px;
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
        font-size: var(--sys-typescale-body5-size);
        line-height: 1;
      }

      /* make sure the first summary has a top border */
      details:first-child & {
        border-top: var(--sys-size-1) solid var(--sys-color-divider);
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
    flex: none;

    &.active devtools-button {
      transform: rotate(90deg);
    }
  }
}

/*# sourceURL=${import.meta.resolve("./sidebarInsightsTab.css")} */`;

// ../../front_end/panels/timeline/components/SidebarSingleInsightSet.ts
var SidebarSingleInsightSet_exports = {};
__export(SidebarSingleInsightSet_exports, {
  SidebarSingleInsightSet: () => SidebarSingleInsightSet
});
import * as i18n35 from "../../../core/i18n/i18n.js";
import * as AIAssistance from "../../../models/ai_assistance/ai_assistance.js";
import * as Trace10 from "../../../models/trace/trace.js";
import * as UI14 from "../../../ui/legacy/legacy.js";
import * as Lit16 from "../../../ui/lit/lit.js";
import * as Insights6 from "./insights/insights.js";

// gen/front_end/panels/timeline/components/sidebarSingleInsightSet.css.js
var sidebarSingleInsightSet_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  display: block;
  padding: 5px var(--sys-size-5);
}

.passed-insights-section {
  margin-top: var(--sys-size-5);

  summary {
    font-weight: var(--ref-typeface-weight-medium);
  }
}

/*# sourceURL=${import.meta.resolve("./sidebarSingleInsightSet.css")} */`;

// ../../front_end/panels/timeline/components/SidebarSingleInsightSet.ts
var { html: html16 } = Lit16.StaticHtml;
var INSIGHT_NAME_TO_COMPONENT = {
  Cache: Insights6.Cache.Cache,
  CharacterSet: Insights6.CharacterSet.CharacterSet,
  CLSCulprits: Insights6.CLSCulprits.CLSCulprits,
  DocumentLatency: Insights6.DocumentLatency.DocumentLatency,
  DOMSize: Insights6.DOMSize.DOMSize,
  DuplicatedJavaScript: Insights6.DuplicatedJavaScript.DuplicatedJavaScript,
  FontDisplay: Insights6.FontDisplay.FontDisplay,
  ForcedReflow: Insights6.ForcedReflow.ForcedReflow,
  ImageDelivery: Insights6.ImageDelivery.ImageDelivery,
  INPBreakdown: Insights6.INPBreakdown.INPBreakdown,
  LCPDiscovery: Insights6.LCPDiscovery.LCPDiscovery,
  LCPBreakdown: Insights6.LCPBreakdown.LCPBreakdown,
  LegacyJavaScript: Insights6.LegacyJavaScript.LegacyJavaScript,
  ModernHTTP: Insights6.ModernHTTP.ModernHTTP,
  NetworkDependencyTree: Insights6.NetworkDependencyTree.NetworkDependencyTree,
  RenderBlocking: Insights6.RenderBlocking.RenderBlocking,
  SlowCSSSelector: Insights6.SlowCSSSelector.SlowCSSSelector,
  ThirdParties: Insights6.ThirdParties.ThirdParties,
  Viewport: Insights6.Viewport.Viewport
};
var UIStrings18 = {
  /**
   * @description Summary text for an expandable dropdown that contains all insights in a passing state in the Performance panel sidebar.
   * @example {4} PH1
   */
  passedInsights: "Passed insights ({PH1})"
};
var str_18 = i18n35.i18n.registerUIStrings("panels/timeline/components/SidebarSingleInsightSet.ts", UIStrings18);
var i18nString17 = i18n35.i18n.getLocalizedString.bind(void 0, str_18);
var { widget: widget4 } = UI14.Widget;
var DEFAULT_VIEW10 = (input, output, target) => {
  const {
    shownInsights,
    passedInsights,
    insightSetKey,
    parsedTrace,
    renderInsightComponent
  } = input;
  function renderMetrics() {
    if (!insightSetKey || !parsedTrace) {
      return Lit16.nothing;
    }
    return html16`${widget4(CWVMetrics, { data: { insightSetKey, parsedTrace } })}`;
  }
  function renderInsights() {
    const shownInsightTemplates = shownInsights.map(renderInsightComponent);
    const passedInsightsTemplates = passedInsights.map(renderInsightComponent);
    return html16`
      ${shownInsightTemplates}
      ${passedInsightsTemplates.length ? html16`
        <details class="passed-insights-section">
          <summary>${i18nString17(UIStrings18.passedInsights, {
      PH1: passedInsightsTemplates.length
    })}</summary>
          ${passedInsightsTemplates}
        </details>
      ` : Lit16.nothing}
    `;
  }
  Lit16.render(html16`
    <style>${sidebarSingleInsightSet_css_default}</style>
    <div class="navigation">
      ${renderMetrics()}
      ${renderInsights()}
    </div>
  `, target);
};
var SidebarSingleInsightSet = class _SidebarSingleInsightSet extends UI14.Widget.Widget {
  #view;
  #isActiveInsightHighlighted = false;
  #activeHighlightTimeout = -1;
  #data = {
    insightSetKey: null,
    activeCategory: Trace10.Insights.Types.InsightCategory.ALL,
    activeInsight: null,
    parsedTrace: null
  };
  constructor(element, view = DEFAULT_VIEW10) {
    super(element, { useShadowDom: true });
    this.#view = view;
  }
  set data(data) {
    this.#data = data;
    this.requestUpdate();
  }
  willHide() {
    super.willHide();
    window.clearTimeout(this.#activeHighlightTimeout);
  }
  async highlightActiveInsight() {
    window.clearTimeout(this.#activeHighlightTimeout);
    this.#isActiveInsightHighlighted = false;
    this.requestUpdate();
    await this.updateComplete;
    this.#isActiveInsightHighlighted = true;
    this.requestUpdate();
    this.#activeHighlightTimeout = window.setTimeout(() => {
      this.#isActiveInsightHighlighted = false;
      this.requestUpdate();
    }, 2e3);
  }
  static categorizeInsights(insightSets, insightSetKey, activeCategory) {
    if (!insightSets || !(insightSets instanceof Map)) {
      return { shownInsights: [], passedInsights: [] };
    }
    const insightSet = insightSets.get(insightSetKey);
    if (!insightSet) {
      return { shownInsights: [], passedInsights: [] };
    }
    const shownInsights = [];
    const passedInsights = [];
    for (const [insightName, model] of Object.entries(insightSet.model)) {
      if (!model || !Insights6.Helpers.shouldRenderForCategory({ activeCategory, insightCategory: model.category })) {
        continue;
      }
      if (model.state === "pass") {
        passedInsights.push({ insightName, model });
      } else {
        shownInsights.push({ insightName, model });
      }
    }
    return { shownInsights, passedInsights };
  }
  #renderInsightComponent(insightSet, insightData, fieldMetrics) {
    if (!this.#data.parsedTrace) {
      return Lit16.nothing;
    }
    const { insightName, model } = insightData;
    const activeInsight = this.#data.activeInsight;
    const agentFocus = AIAssistance.AIContext.AgentFocus.fromInsight(this.#data.parsedTrace, model);
    const isActiveInsight = activeInsight?.model === model;
    const componentClass = INSIGHT_NAME_TO_COMPONENT[insightName];
    const widgetConfig = {
      selected: isActiveInsight,
      // The `model` passed in as a parameter is the base type, but since
      // `componentClass` is the union of every derived insight component, the
      // `model` for the widget config is the union of every model. That can't be
      // satisfied, so disable typescript.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model,
      bounds: insightSet.bounds,
      insightSetKey: insightSet.id,
      agentFocus,
      fieldMetrics
    };
    const items = [{ componentClass, widgetConfig }];
    const output = Lit16.Directives.repeat(items, (data) => data.widgetConfig.model, (data) => {
      return html16`<devtools-widget class="insight-component-widget" ?highlight-insight=${isActiveInsight && this.#isActiveInsightHighlighted}
        ${widget4(data.componentClass, data.widgetConfig)}
      ></devtools-widget>`;
    });
    return html16`${output}`;
  }
  performUpdate() {
    const {
      parsedTrace,
      insightSetKey
    } = this.#data;
    if (!parsedTrace?.insights || !insightSetKey || !(parsedTrace.insights instanceof Map)) {
      return;
    }
    const insightSet = parsedTrace.insights.get(insightSetKey);
    if (!insightSet) {
      return;
    }
    const field = getFieldMetrics(parsedTrace, insightSetKey);
    const { shownInsights, passedInsights } = _SidebarSingleInsightSet.categorizeInsights(
      parsedTrace.insights,
      insightSetKey,
      this.#data.activeCategory
    );
    const input = {
      shownInsights,
      passedInsights,
      insightSetKey,
      parsedTrace,
      renderInsightComponent: (insightData) => this.#renderInsightComponent(insightSet, insightData, field)
    };
    this.#view(input, void 0, this.contentElement);
  }
};

// ../../front_end/panels/timeline/components/SidebarInsightsTab.ts
var { html: html17 } = Lit17;
var { widget: widget5 } = UI15.Widget;
var DEFAULT_VIEW11 = (input, output, target) => {
  const {
    parsedTrace,
    labels,
    activeInsightSet,
    activeInsight,
    selectedCategory,
    onInsightSetToggled,
    onInsightSetHovered,
    onInsightSetUnhovered,
    onZoomClick
  } = input;
  const insights = parsedTrace.insights;
  if (!insights) {
    return;
  }
  const hasMultipleInsightSets = insights.size > 1;
  Lit17.render(html17`
    <style>${sidebarInsightsTab_css_default}</style>
    <div class="insight-sets-wrapper">
      ${[...insights.values()].map((insightSet, index) => {
    const { id, url } = insightSet;
    const data = {
      insightSetKey: id,
      activeCategory: selectedCategory,
      activeInsight,
      parsedTrace
    };
    const selected = insightSet === activeInsightSet;
    const contents = html17`
          <devtools-widget
            data-insight-set-key=${id}
            ${widget5(SidebarSingleInsightSet, { data })}
          ></devtools-widget>
        `;
    if (hasMultipleInsightSets) {
      return html17`<details ?open=${selected}>
            <summary
              @click=${() => onInsightSetToggled(insightSet)}
              @mouseenter=${() => onInsightSetHovered(insightSet)}
              @mouseleave=${() => onInsightSetUnhovered()}
              title=${url.href}>
              ${renderDropdownIcon(selected)}
              <span>${labels[index]}</span>
              <span class='zoom-button'
                @click=${(event) => {
        event.stopPropagation();
        onZoomClick(insightSet);
      }}
              >
                ${renderZoomButton(selected)}
              </span>
            </summary>
            ${contents}
          </details>`;
    }
    return contents;
  })}
    </div>
  `, target);
};
function renderZoomButton(insightSetToggled) {
  const classes = Lit17.Directives.classMap({
    "zoom-icon": true,
    active: insightSetToggled
  });
  return html17`
  <div class=${classes}>
      <devtools-button .data=${{
    variant: Buttons8.Button.Variant.ICON,
    iconName: "center-focus-weak",
    size: Buttons8.Button.Size.SMALL
  }}
    ></devtools-button></div>`;
}
function renderDropdownIcon(insightSetToggled) {
  const containerClasses = Lit17.Directives.classMap({
    "dropdown-icon": true,
    active: insightSetToggled
  });
  return html17`
    <div class=${containerClasses}>
      <devtools-button .data=${{
    variant: Buttons8.Button.Variant.ICON,
    iconName: "chevron-right",
    size: Buttons8.Button.Size.SMALL
  }}
    ></devtools-button></div>
  `;
}
var SidebarInsightsTab = class _SidebarInsightsTab extends UI15.Widget.Widget {
  static createWidgetElement() {
    const widgetElement = document.createElement("devtools-widget");
    new _SidebarInsightsTab(widgetElement);
    return widgetElement;
  }
  #view;
  #parsedTrace = null;
  #activeInsight = null;
  #selectedCategory = Trace11.Insights.Types.InsightCategory.ALL;
  /**
   * When a trace has sets of insights, we show an accordion with each
   * set within. A set can be specific to a single navigation, or include the
   * beginning of the trace up to the first navigation.
   * You can only have one of these open at any time.
   */
  #selectedInsightSet = null;
  constructor(element, view = DEFAULT_VIEW11) {
    super(element, { useShadowDom: true });
    this.#view = view;
  }
  // TODO(paulirish): add back a disconnectedCallback() to avoid memory leaks that doesn't cause b/372943062
  set parsedTrace(data) {
    if (data === this.#parsedTrace) {
      return;
    }
    this.#parsedTrace = data;
    this.#selectedInsightSet = null;
    if (this.#parsedTrace?.insights) {
      this.#selectedInsightSet = [...this.#parsedTrace.insights.values()].at(0) ?? null;
    }
    this.requestUpdate();
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
      this.#selectedInsightSet = this.#parsedTrace?.insights?.get(this.#activeInsight.insightSetKey) ?? null;
    }
    this.requestUpdate();
  }
  setActiveInsightSet(insightSetKey) {
    if (this.#parsedTrace?.insights) {
      const insightSet = this.#parsedTrace.insights.get(insightSetKey);
      if (insightSet) {
        this.#selectedInsightSet = insightSet;
        this.requestUpdate();
      }
    }
  }
  #onInsightSetToggled(insightSet) {
    this.#selectedInsightSet = this.#selectedInsightSet === insightSet ? null : insightSet;
    if (this.#selectedInsightSet?.id !== this.#activeInsight?.insightSetKey) {
      this.element.dispatchEvent(new Insights8.SidebarInsight.InsightDeactivated());
    }
    this.requestUpdate();
  }
  #onInsightSetHovered(insightSet) {
    this.element.dispatchEvent(new Insights8.SidebarInsight.InsightSetHovered(insightSet.bounds));
  }
  #onInsightSetUnhovered() {
    this.element.dispatchEvent(new Insights8.SidebarInsight.InsightSetHovered());
  }
  #onZoomClick(insightSet) {
    this.element.dispatchEvent(new Insights8.SidebarInsight.InsightSetZoom(insightSet.bounds));
  }
  highlightActiveInsight() {
    if (!this.#activeInsight) {
      return;
    }
    const set = this.element.shadowRoot?.querySelector(
      `[data-insight-set-key="${this.#activeInsight.insightSetKey}"]`
    );
    void set?.getWidget()?.highlightActiveInsight();
  }
  performUpdate() {
    if (!this.#parsedTrace?.insights) {
      return;
    }
    const insightSets = [...this.#parsedTrace.insights.values()];
    const input = {
      parsedTrace: this.#parsedTrace,
      labels: Utils.Helpers.createUrlLabels(insightSets.map(({ url }) => url)),
      activeInsightSet: this.#selectedInsightSet,
      activeInsight: this.#activeInsight,
      selectedCategory: this.#selectedCategory,
      onInsightSetToggled: this.#onInsightSetToggled.bind(this),
      onInsightSetHovered: this.#onInsightSetHovered.bind(this),
      onInsightSetUnhovered: this.#onInsightSetUnhovered.bind(this),
      onZoomClick: this.#onZoomClick.bind(this)
    };
    this.#view(input, void 0, this.contentElement);
  }
};

// ../../front_end/panels/timeline/components/Sidebar.ts
var RemoveAnnotation = class _RemoveAnnotation extends Event {
  constructor(removedAnnotation) {
    super(_RemoveAnnotation.eventName, { bubbles: true, composed: true });
    this.removedAnnotation = removedAnnotation;
  }
  removedAnnotation;
  static eventName = "removeannotation";
};
var RevealAnnotation = class _RevealAnnotation extends Event {
  constructor(annotation) {
    super(_RevealAnnotation.eventName, { bubbles: true, composed: true });
    this.annotation = annotation;
  }
  annotation;
  static eventName = "revealannotation";
};
var HoverAnnotation = class _HoverAnnotation extends Event {
  constructor(annotation) {
    super(_HoverAnnotation.eventName, { bubbles: true, composed: true });
    this.annotation = annotation;
  }
  annotation;
  static eventName = "hoverannotation";
};
var AnnotationHoverOut = class _AnnotationHoverOut extends Event {
  static eventName = "annotationhoverout";
  constructor() {
    super(_AnnotationHoverOut.eventName, { bubbles: true, composed: true });
  }
};
var SidebarTabs = /* @__PURE__ */ ((SidebarTabs2) => {
  SidebarTabs2["INSIGHTS"] = "insights";
  SidebarTabs2["ANNOTATIONS"] = "annotations";
  return SidebarTabs2;
})(SidebarTabs || {});
var DEFAULT_SIDEBAR_TAB = "insights" /* INSIGHTS */;
var DEFAULT_SIDEBAR_WIDTH_PX = 240;
var MIN_SIDEBAR_WIDTH_PX = 170;
var SidebarWidget = class extends UI16.Widget.VBox {
  #tabbedPane = new UI16.TabbedPane.TabbedPane();
  #insightsView = new InsightsView();
  #annotationsView = new AnnotationsView();
  /**
   * If the user has an Insight open and then they collapse the sidebar, we
   * deactivate that Insight to avoid it showing overlays etc - as the user has
   * hidden the Sidebar & Insight from view. But we store it because when the
   * user pops the sidebar open, we want to re-activate it.
   */
  #insightToRestoreOnOpen = null;
  /**
   * We track if the user has opened the sidebar once. This is used to
   * automatically show the sidebar for new users when they first record or
   * import a trace, but then persist its state (so if they close it, it stays
   * closed).
   */
  #hasOpenedOnce = Common6.Settings.Settings.instance().createSetting("timeline-sidebar-opened-at-least-once", false);
  constructor() {
    super();
    this.setMinimumSize(MIN_SIDEBAR_WIDTH_PX, 0);
    this.#tabbedPane.appendTab(
      "insights" /* INSIGHTS */,
      "Insights",
      this.#insightsView,
      void 0,
      void 0,
      false,
      false,
      0,
      "timeline.insights-tab"
    );
    this.#tabbedPane.appendTab(
      "annotations" /* ANNOTATIONS */,
      "Annotations",
      this.#annotationsView,
      void 0,
      void 0,
      false,
      false,
      1,
      "timeline.annotations-tab"
    );
    this.#tabbedPane.selectTab("insights" /* INSIGHTS */);
  }
  wasShown() {
    super.wasShown();
    this.#hasOpenedOnce.set(true);
    this.#tabbedPane.show(this.element);
    this.#updateAnnotationsCountBadge();
    if (this.#insightToRestoreOnOpen) {
      this.element.dispatchEvent(new Insights9.SidebarInsight.InsightActivated(
        this.#insightToRestoreOnOpen.model,
        this.#insightToRestoreOnOpen.insightSetKey
      ));
      this.#insightToRestoreOnOpen = null;
    }
    if (this.#tabbedPane.selectedTabId === "insights" /* INSIGHTS */ && this.#tabbedPane.tabIsDisabled("insights" /* INSIGHTS */)) {
      this.#tabbedPane.selectTab("annotations" /* ANNOTATIONS */);
    }
  }
  willHide() {
    super.willHide();
    const currentlyActiveInsight = this.#insightsView.getActiveInsight();
    this.#insightToRestoreOnOpen = currentlyActiveInsight;
    if (currentlyActiveInsight) {
      this.element.dispatchEvent(new Insights9.SidebarInsight.InsightDeactivated());
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
    this.#tabbedPane.setTabEnabled(
      "insights" /* INSIGHTS */,
      Boolean(parsedTrace?.insights && parsedTrace.insights.size > 0)
    );
  }
  setActiveInsight(activeInsight, opts) {
    this.#insightsView.setActiveInsight(activeInsight, opts);
    if (activeInsight) {
      this.#tabbedPane.selectTab("insights" /* INSIGHTS */);
    }
  }
  openInsightsTab() {
    this.#tabbedPane.selectTab("insights" /* INSIGHTS */);
  }
  setActiveInsightSet(insightSetKey) {
    this.#insightsView.setActiveInsightSet(insightSetKey);
  }
  /**
   * True if the sidebar has been visible at least one time. This is persisted
   * to the user settings so it persists across sessions. This is used because
   * we do not force the RPP sidebar open by default; if a user has seen it &
   * then closed it, we will not re-open it automatically. But if a user
   * has never seen it, we want them to see it once to know it exists.
   */
  sidebarHasBeenOpened() {
    return this.#hasOpenedOnce.get();
  }
};
var InsightsView = class extends UI16.Widget.VBox {
  #component = SidebarInsightsTab.createWidgetElement();
  constructor() {
    super();
    this.element.classList.add("sidebar-insights");
    this.#getWidget().show(this.element);
  }
  #getWidget() {
    return UI16.Widget.Widget.get(this.#component);
  }
  setParsedTrace(parsedTrace) {
    const widget7 = this.#getWidget();
    widget7.parsedTrace = parsedTrace;
  }
  getActiveInsight() {
    return this.#getWidget().activeInsight;
  }
  setActiveInsight(active, opts) {
    const widget7 = this.#getWidget();
    widget7.activeInsight = active;
    if (opts.highlight && active) {
      void widget7.updateComplete.then(() => {
        void widget7.highlightActiveInsight();
      });
    }
  }
  setActiveInsightSet(insightSetKey) {
    this.#getWidget().setActiveInsightSet(insightSetKey);
  }
};
var AnnotationsView = class extends UI16.Widget.VBox {
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

// ../../front_end/panels/timeline/components/TimelineRangeSummaryView.ts
var TimelineRangeSummaryView_exports = {};
__export(TimelineRangeSummaryView_exports, {
  TIMELINE_RANGE_SUMMARY_VIEW_DEFAULT_VIEW: () => TIMELINE_RANGE_SUMMARY_VIEW_DEFAULT_VIEW,
  TimelineRangeSummaryView: () => TimelineRangeSummaryView,
  statsForTimeRange: () => statsForTimeRange
});
import * as Platform9 from "../../../core/platform/platform.js";
import * as Trace12 from "../../../models/trace/trace.js";
import * as UI18 from "../../../ui/legacy/legacy.js";
import * as Lit19 from "../../../ui/lit/lit.js";

// gen/front_end/panels/timeline/components/timelineRangeSummaryView.css.js
var timelineRangeSummaryView_css_default = `/*
 * Copyright 2026 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  display: block;
  height: 100%;
  container-type: inline-size;
}

.timeline-details-range-summary {
  display: flex;
  padding: var(--sys-size-4) 0 0;
  height: 100%;
}

.timeline-tree-view {
  border-left: var(--sys-size-1) solid var(--sys-color-divider);
}

@container (max-width: 450px) {
  .timeline-details-range-summary {
    display: grid;
    /* Make sure the 3P table is only as large as the range summary at most */
    grid-template-rows: 1fr minmax(50px, 1fr);
    gap: var(--sys-size-4);
  }

  .timeline-summary {
    width: 100%;
  }

  .timeline-tree-view {
    border-left: none;
  }
}

.timeline-summary {
  flex-grow: 0;
}

/*# sourceURL=${import.meta.resolve("./timelineRangeSummaryView.css")} */`;

// ../../front_end/panels/timeline/components/TimelineSummary.ts
var TimelineSummary_exports = {};
__export(TimelineSummary_exports, {
  CATEGORY_SUMMARY_DEFAULT_VIEW: () => CATEGORY_SUMMARY_DEFAULT_VIEW,
  CategorySummary: () => CategorySummary
});
import * as i18n37 from "../../../core/i18n/i18n.js";
import * as Platform8 from "../../../core/platform/platform.js";
import * as Buttons9 from "../../../ui/components/buttons/buttons.js";
import * as UI17 from "../../../ui/legacy/legacy.js";
import * as Lit18 from "../../../ui/lit/lit.js";
import * as VisualLogging10 from "../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/timeline/components/timelineSummary.css.js
var timelineSummary_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
@scope to (devtools-widget > *){
  .timeline-summary {
    max-height: 100%;
    overflow: hidden auto;
    scrollbar-width: thin; /* ~11px wide reserved for gutter */
    font-size: var(--sys-typescale-body4-size);
    flex-direction: column;
    padding: 0 var(--sys-size-6) var(--sys-size-4) var(--sys-size-8) ;
    /* The category summary can't be more narrow than this, so we'll force a horizontal scrollbar
    */
    min-width: var(--sys-size-25);

    &.is-in-ai-widget {
      padding: 0;
    }
  }

  .summary-range {
    font-weight: var(--ref-typeface-weight-medium);
    height: 24.5px;
    line-height: var(--sys-size-10);
  }

  .category-summary {
    gap: var(--sys-size-4);
    display: flex;
    flex-direction: column;
  }

  .category-row {
    min-height: var(--sys-size-8);
    line-height: var(--sys-size-8);
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
}

/*# sourceURL=${import.meta.resolve("./timelineSummary.css")} */`;

// ../../front_end/panels/timeline/components/TimelineSummary.ts
var { render: render18, html: html18 } = Lit18;
var UIStrings19 = {
  /**
   * @description Label for total duration in the summary view of the Performance panel.
   */
  total: "Total",
  /**
   * @description Time range in the summary view of the Performance panel.
   * @example {1ms} PH1
   * @example {10ms} PH2
   */
  rangeSS: "Range:  {PH1} \u2013 {PH2}"
};
var str_19 = i18n37.i18n.registerUIStrings("panels/timeline/components/TimelineSummary.ts", UIStrings19);
var i18nString18 = i18n37.i18n.getLocalizedString.bind(void 0, str_19);
var CATEGORY_SUMMARY_DEFAULT_VIEW = (input, _output, target) => {
  const summaryClasses = Lit18.Directives.classMap({
    "timeline-summary": true,
    "is-in-ai-widget": Boolean(input.isInAIWidget)
  });
  render18(html18`
        <style>${timelineSummary_css_default}</style>
        <style>@scope to (devtools-widget > *) { ${UI17.inspectorCommonStyles} }</style>
        <style>@scope to (devtools-widget > *) { ${Buttons9.textButtonStyles} }</style>
        <div class=${summaryClasses} jslog=${VisualLogging10.section("timeline-summary")}>
            <div class="summary-range">${i18nString18(UIStrings19.rangeSS, { PH1: i18n37.TimeUtilities.millisToString(input.rangeStart), PH2: i18n37.TimeUtilities.millisToString(input.rangeEnd) })}</div>
            <div class="category-summary">
                ${input.categories.map((category) => {
    return html18`
                        <div class="category-row" jslog=${VisualLogging10.item(category.name || Platform8.StringUtilities.toKebabCase(category.title))}>
                        <div class="category-swatch" style="background-color: ${category.color};"></div>
                        <div class="category-name">${category.title}</div>
                        <div class="category-value" jslog=${VisualLogging10.value()}>
                            ${i18n37.TimeUtilities.preciseMillisToString(category.value)}
                            <div class="background-bar-container">
                                <div class="background-bar" style='width: ${(category.value * 100 / input.total).toFixed(1)}%;'></div>
                            </div>
                        </div>
                        </div>`;
  })}
                <div class="category-row" jslog=${VisualLogging10.item("total")}>
                    <div class="category-swatch"></div>
                    <div class="category-name">${i18nString18(UIStrings19.total)}</div>
                    <div class="category-value" jslog=${VisualLogging10.value()}>
                        ${i18n37.TimeUtilities.preciseMillisToString(input.total)}
                        <div class="background-bar-container">
                            <div class="background-bar"></div>
                        </div>
                    </div>
                </div>
              </div>
        </div>
        </div>

      </div>`, target);
};
var CategorySummary = class extends UI17.Widget.Widget {
  #view;
  #rangeStart = 0;
  #rangeEnd = 0;
  #total = 0;
  #categories = [];
  #isInAIWidget = false;
  constructor(element, view) {
    super(element);
    this.#view = view ?? CATEGORY_SUMMARY_DEFAULT_VIEW;
    this.requestUpdate();
  }
  set data(data) {
    this.#rangeStart = data.rangeStart;
    this.#rangeEnd = data.rangeEnd;
    this.#total = data.total;
    this.#categories = data.categories;
    this.#isInAIWidget = Boolean(data.isInAIWidget);
    this.requestUpdate();
  }
  performUpdate() {
    const viewInput = {
      rangeStart: this.#rangeStart,
      rangeEnd: this.#rangeEnd,
      total: this.#total,
      categories: this.#categories,
      isInAIWidget: this.#isInAIWidget
    };
    this.#view(viewInput, void 0, this.contentElement);
  }
};

// ../../front_end/panels/timeline/components/TimelineRangeSummaryView.ts
var { render: render19, html: html19 } = Lit19;
var { widget: widget6 } = UI18.Widget;
var categoryBreakdownCacheSymbol = /* @__PURE__ */ Symbol("categoryBreakdownCache");
var TIMELINE_RANGE_SUMMARY_VIEW_DEFAULT_VIEW = (input, _output, target) => {
  const { parsedTrace, events, startTime, endTime } = input;
  if (!events || !parsedTrace) {
    render19(html19`<div class="timeline-details-range-summary"></div>`, target);
    return;
  }
  const minBoundsMilli = Trace12.Helpers.Timing.microToMilli(parsedTrace.data.Meta.traceBounds.min);
  const aggregatedStats = statsForTimeRange(events, startTime, endTime);
  const startOffset = startTime - minBoundsMilli;
  const endOffset = endTime - minBoundsMilli;
  let total = 0;
  for (const categoryName in aggregatedStats) {
    total += aggregatedStats[categoryName];
  }
  const categories = [];
  for (const categoryName in Trace12.Styles.getCategoryStyles()) {
    const category = Trace12.Styles.getCategoryStyles()[categoryName];
    if (category.name === Trace12.Styles.EventCategory.IDLE) {
      continue;
    }
    const value2 = aggregatedStats[category.name];
    if (!value2) {
      continue;
    }
    categories.push({ value: value2, color: category.getCSSValue(), title: category.title, name: category.name });
  }
  categories.sort((a, b) => b.value - a.value);
  render19(html19`
    <style>${timelineRangeSummaryView_css_default}</style>
    <div class="timeline-details-range-summary">
      <devtools-widget class="timeline-summary"
        ${widget6(CategorySummary, {
    data: {
      rangeStart: startOffset,
      rangeEnd: endOffset,
      categories,
      total,
      isInAIWidget: input.isInAIWidget
    }
  })}
      ></devtools-widget>
      ${input.thirdPartyTreeTemplate ?? Lit19.nothing}
    </div>
  `, target);
};
var TimelineRangeSummaryView = class extends UI18.Widget.Widget {
  #view;
  #summaryData;
  constructor(element, view = TIMELINE_RANGE_SUMMARY_VIEW_DEFAULT_VIEW) {
    super(element, { useShadowDom: true });
    this.#view = view;
    this.requestUpdate();
  }
  set data(data) {
    this.#summaryData = data;
    this.requestUpdate();
  }
  performUpdate() {
    if (!this.#summaryData) {
      return;
    }
    this.#view(this.#summaryData, void 0, this.contentElement);
  }
};
function statsForTimeRange(events, startTime, endTime) {
  if (!events.length) {
    return { idle: endTime - startTime };
  }
  buildRangeStatsCacheIfNeeded(events);
  const aggregatedStats = subtractStats(aggregatedStatsAtTime(endTime), aggregatedStatsAtTime(startTime));
  const aggregatedTotal = Object.values(aggregatedStats).reduce((a, b) => a + b, 0);
  aggregatedStats["idle"] = Math.max(0, endTime - startTime - aggregatedTotal);
  return aggregatedStats;
  function aggregatedStatsAtTime(time) {
    const stats = {};
    const cache = events[categoryBreakdownCacheSymbol];
    for (const category in cache) {
      const categoryCache = cache[category];
      const index = Platform9.ArrayUtilities.upperBound(categoryCache.time, time, Platform9.ArrayUtilities.DEFAULT_COMPARATOR);
      let value2;
      if (index === 0) {
        value2 = 0;
      } else if (index === categoryCache.time.length) {
        value2 = categoryCache.value[categoryCache.value.length - 1];
      } else {
        const t0 = categoryCache.time[index - 1];
        const t1 = categoryCache.time[index];
        const v0 = categoryCache.value[index - 1];
        const v1 = categoryCache.value[index];
        value2 = v0 + (v1 - v0) * (time - t0) / (t1 - t0);
      }
      stats[category] = value2;
    }
    return stats;
  }
  function subtractStats(a, b) {
    const result = Object.assign({}, a);
    for (const key in b) {
      result[key] -= b[key];
    }
    return result;
  }
  function buildRangeStatsCacheIfNeeded(events2) {
    if (events2[categoryBreakdownCacheSymbol]) {
      return;
    }
    const aggregatedStats2 = {};
    const categoryStack = [];
    let lastTime = 0;
    Trace12.Helpers.Trace.forEachEvent(events2, {
      onStartEvent,
      onEndEvent
    });
    function updateCategory(category, time) {
      let statsArrays = aggregatedStats2[category];
      if (!statsArrays) {
        statsArrays = { time: [], value: [] };
        aggregatedStats2[category] = statsArrays;
      }
      if (statsArrays.time.length && statsArrays.time[statsArrays.time.length - 1] === time || lastTime > time) {
        return;
      }
      const lastValue = statsArrays.value.length > 0 ? statsArrays.value[statsArrays.value.length - 1] : 0;
      statsArrays.value.push(lastValue + time - lastTime);
      statsArrays.time.push(time);
    }
    function categoryChange(from, to, time) {
      if (from) {
        updateCategory(from, time);
      }
      lastTime = time;
      if (to) {
        updateCategory(to, time);
      }
    }
    function onStartEvent(e) {
      const { startTime: startTime2 } = Trace12.Helpers.Timing.eventTimingsMilliSeconds(e);
      const category = Trace12.Styles.getEventStyle(e.name)?.category.name || Trace12.Styles.getCategoryStyles().other.name;
      const parentCategory = categoryStack.length ? categoryStack[categoryStack.length - 1] : null;
      if (category !== parentCategory) {
        categoryChange(parentCategory || null, category, startTime2);
      }
      categoryStack.push(category);
    }
    function onEndEvent(e) {
      const { endTime: endTime2 } = Trace12.Helpers.Timing.eventTimingsMilliSeconds(e);
      const category = categoryStack.pop();
      const parentCategory = categoryStack.length ? categoryStack[categoryStack.length - 1] : null;
      if (category !== parentCategory) {
        categoryChange(category || null, parentCategory || null, endTime2 || 0);
      }
    }
    const obj = events2;
    obj[categoryBreakdownCacheSymbol] = aggregatedStats2;
  }
}
export {
  Breadcrumbs_exports as Breadcrumbs,
  BreadcrumbsUI_exports as BreadcrumbsUI,
  CWVMetrics_exports as CWVMetrics,
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
  NetworkTrackWidget_exports as NetworkTrackWidget,
  OriginMap_exports as OriginMap,
  RelatedInsightChips_exports as RelatedInsightChips,
  Sidebar_exports as Sidebar,
  SidebarAnnotationsTab_exports as SidebarAnnotationsTab,
  SidebarInsightsTab_exports as SidebarInsightsTab,
  SidebarSingleInsightSet_exports as SidebarSingleInsightSet,
  TimelineRangeSummaryView_exports as TimelineRangeSummaryView,
  TimelineSummary_exports as TimelineSummary,
  Utils_exports as Utils
};
//# sourceMappingURL=components.js.map
