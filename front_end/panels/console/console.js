var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../front_end/panels/console/ConsoleContextSelector.ts
var ConsoleContextSelector_exports = {};
__export(ConsoleContextSelector_exports, {
  ConsoleContextSelector: () => ConsoleContextSelector,
  ConsoleContextSelectorElement: () => ConsoleContextSelectorElement
});
import * as Common from "../../core/common/common.js";
import * as i18n from "../../core/i18n/i18n.js";
import * as Platform from "../../core/platform/platform.js";
import * as SDK from "../../core/sdk/sdk.js";
import * as StackTrace from "../../models/stack_trace/stack_trace.js";
import * as UI from "../../ui/legacy/legacy.js";
import * as Lit from "../../ui/lit/lit.js";

// gen/front_end/panels/console/consoleContextSelector.css.js
var consoleContextSelector_css_default = `/*
 * Copyright 2017 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.widget {
  .console-context-selector-element{
    padding: var(--sys-size-2) var(--sys-size-1) var(--sys-size-2) var(--sys-size-2);
    white-space: nowrap;
    display: flex;
    flex-direction: column;
    height: 36px;
    justify-content: center;
    overflow-y: auto;

    .title {
      overflow: hidden;
      text-overflow: ellipsis;
      flex-grow: 0;
    }

    .subtitle {
      color: var(--sys-color-token-subtle);
      margin-right: 3px;
      overflow: hidden;
      text-overflow: ellipsis;
      flex-grow: 0;
    }

    .badge {
      pointer-events: none;
      margin-right: var(--sys-size-3);
      display: inline-block;
      height: 15px;
    }
  }

  &.highlighted .console-context-selector-element .subtitle {
    color: inherit;
  }
}

/*# sourceURL=${import.meta.resolve("./consoleContextSelector.css")} */`;

// ../../front_end/panels/console/ConsoleContextSelector.ts
var { render, nothing, html } = Lit;
var UIStrings = {
  /**
   * @description Title of toolbar item in Console context selector of the Console panel.
   */
  javascriptContextNotSelected: "JavaScript context: Not selected",
  /**
   * @description Text in Console context selector of the Console panel.
   */
  extension: "Extension",
  /**
   * @description Text in Console context selector of the Console panel.
   * @example {top} PH1
   */
  javascriptContextS: "JavaScript context: {PH1}"
};
var str_ = i18n.i18n.registerUIStrings("panels/console/ConsoleContextSelector.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var ConsoleContextSelector = class {
  items;
  dropDown;
  #toolbarItem;
  constructor() {
    this.items = new UI.ListModel.ListModel();
    this.dropDown = new UI.SoftDropDown.SoftDropDown(this.items, this, "javascript-context");
    this.dropDown.setRowHeight(36);
    this.#toolbarItem = new UI.Toolbar.ToolbarItem(this.dropDown.element);
    this.#toolbarItem.setEnabled(false);
    this.#toolbarItem.setTitle(i18nString(UIStrings.javascriptContextNotSelected));
    this.items.addEventListener(
      UI.ListModel.Events.ITEMS_REPLACED,
      () => this.#toolbarItem.setEnabled(Boolean(this.items.length))
    );
    this.#toolbarItem.element.classList.add("toolbar-has-dropdown");
    SDK.TargetManager.TargetManager.instance().addModelListener(
      SDK.RuntimeModel.RuntimeModel,
      SDK.RuntimeModel.Events.ExecutionContextCreated,
      this.onExecutionContextCreated,
      this,
      { scoped: true }
    );
    SDK.TargetManager.TargetManager.instance().addModelListener(
      SDK.RuntimeModel.RuntimeModel,
      SDK.RuntimeModel.Events.ExecutionContextChanged,
      this.onExecutionContextChanged,
      this,
      { scoped: true }
    );
    SDK.TargetManager.TargetManager.instance().addModelListener(
      SDK.RuntimeModel.RuntimeModel,
      SDK.RuntimeModel.Events.ExecutionContextDestroyed,
      this.onExecutionContextDestroyed,
      this,
      { scoped: true }
    );
    SDK.TargetManager.TargetManager.instance().addModelListener(
      SDK.ResourceTreeModel.ResourceTreeModel,
      SDK.ResourceTreeModel.Events.FrameNavigated,
      this.frameNavigated,
      this,
      { scoped: true }
    );
    UI.Context.Context.instance().addFlavorChangeListener(
      SDK.RuntimeModel.ExecutionContext,
      this.executionContextChangedExternally,
      this
    );
    UI.Context.Context.instance().addFlavorChangeListener(
      StackTrace.StackTrace.DebuggableFrameFlavor,
      this.callFrameSelectedInUI,
      this
    );
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.RuntimeModel.RuntimeModel, this, { scoped: true });
    SDK.TargetManager.TargetManager.instance().addModelListener(
      SDK.DebuggerModel.DebuggerModel,
      SDK.DebuggerModel.Events.CallFrameSelected,
      this.callFrameSelectedInModel,
      this
    );
  }
  toolbarItem() {
    return this.#toolbarItem;
  }
  highlightedItemChanged(_from, to, fromElement, toElement) {
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight(SDK.TargetManager.TargetManager.instance());
    if (to?.frameId) {
      const frame = SDK.FrameManager.FrameManager.instance().getFrame(to.frameId);
      if (frame && !frame.isOutermostFrame()) {
        void frame.highlight();
      }
    }
    if (fromElement) {
      fromElement.classList.remove("highlighted");
    }
    if (toElement) {
      toElement.classList.add("highlighted");
    }
  }
  titleFor(executionContext) {
    const target = executionContext.target();
    const maybeLabel = executionContext.label();
    let label = maybeLabel ? target.decorateLabel(maybeLabel) : "";
    if (executionContext.frameId) {
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      const frame = resourceTreeModel?.frameForId(executionContext.frameId);
      if (frame) {
        label = label || frame.displayName();
      }
    }
    label = label || executionContext.origin;
    return label;
  }
  depthFor(executionContext) {
    let target = executionContext.target();
    let depth = 0;
    if (!executionContext.isDefault) {
      depth++;
    }
    if (executionContext.frameId) {
      let frame = SDK.FrameManager.FrameManager.instance().getFrame(executionContext.frameId);
      while (frame) {
        frame = frame.parentFrame();
        if (frame) {
          depth++;
          target = frame.resourceTreeModel().target();
        }
      }
    }
    let targetDepth = 0;
    let parentTarget = target.parentTarget();
    while (parentTarget && target.type() !== SDK.Target.Type.ServiceWorker) {
      targetDepth++;
      target = parentTarget;
      parentTarget = target.parentTarget();
    }
    depth += targetDepth;
    return depth;
  }
  executionContextCreated(executionContext) {
    this.items.insertWithComparator(executionContext, executionContext.runtimeModel.executionContextComparator());
    if (executionContext === UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext)) {
      this.dropDown.selectItem(executionContext);
    }
  }
  onExecutionContextCreated(event) {
    const executionContext = event.data;
    this.executionContextCreated(executionContext);
  }
  onExecutionContextChanged(event) {
    const executionContext = event.data;
    if (this.items.indexOf(executionContext) === -1) {
      return;
    }
    this.executionContextDestroyed(executionContext);
    this.executionContextCreated(executionContext);
  }
  executionContextDestroyed(executionContext) {
    const index = this.items.indexOf(executionContext);
    if (index === -1) {
      return;
    }
    this.items.remove(index);
  }
  onExecutionContextDestroyed(event) {
    const executionContext = event.data;
    this.executionContextDestroyed(executionContext);
  }
  executionContextChangedExternally({
    data: executionContext
  }) {
    if (executionContext && !SDK.TargetManager.TargetManager.instance().isInScope(executionContext.target())) {
      return;
    }
    this.dropDown.selectItem(executionContext);
  }
  isTopContext(executionContext) {
    if (!executionContext?.isDefault) {
      return false;
    }
    const resourceTreeModel = executionContext.target().model(SDK.ResourceTreeModel.ResourceTreeModel);
    const frame = executionContext.frameId && resourceTreeModel?.frameForId(executionContext.frameId);
    if (!frame) {
      return false;
    }
    return frame.isOutermostFrame();
  }
  hasTopContext() {
    return this.items.some((executionContext) => this.isTopContext(executionContext));
  }
  modelAdded(runtimeModel) {
    runtimeModel.executionContexts().forEach(this.executionContextCreated, this);
  }
  modelRemoved(runtimeModel) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      if (this.items.at(i).runtimeModel === runtimeModel) {
        this.executionContextDestroyed(this.items.at(i));
      }
    }
  }
  createElementForItem(item2) {
    const consoleContextSelectorElement = new ConsoleContextSelectorElement();
    consoleContextSelectorElement.title = this.titleFor(item2);
    consoleContextSelectorElement.subtitle = this.subtitleFor(item2);
    consoleContextSelectorElement.itemDepth = this.depthFor(item2);
    consoleContextSelectorElement.markAsRoot();
    return consoleContextSelectorElement.contentElement;
  }
  subtitleFor(executionContext) {
    const target = executionContext.target();
    let frame = null;
    if (executionContext.frameId) {
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      frame = resourceTreeModel?.frameForId(executionContext.frameId) ?? null;
    }
    if (Common.ParsedURL.schemeIs(executionContext.origin, "chrome-extension:")) {
      return i18nString(UIStrings.extension);
    }
    const sameTargetParentFrame = frame?.sameTargetParentFrame();
    if (!frame || !sameTargetParentFrame || sameTargetParentFrame.securityOrigin !== executionContext.origin) {
      const url = Common.ParsedURL.ParsedURL.fromString(executionContext.origin);
      if (url) {
        return url.domain();
      }
    }
    if (frame?.securityOrigin) {
      const domain = new Common.ParsedURL.ParsedURL(frame.securityOrigin).domain();
      if (domain) {
        return domain;
      }
    }
    return "IFrame";
  }
  isItemSelectable(item2) {
    const callFrame = item2.debuggerModel.selectedCallFrame();
    const callFrameContext = callFrame?.script.executionContext();
    return !callFrameContext || item2 === callFrameContext;
  }
  itemSelected(item2) {
    this.#toolbarItem.element.classList.toggle("highlight", !this.isTopContext(item2) && this.hasTopContext());
    const title = item2 ? i18nString(UIStrings.javascriptContextS, { PH1: this.titleFor(item2) }) : i18nString(UIStrings.javascriptContextNotSelected);
    this.#toolbarItem.setTitle(title);
    UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, item2);
  }
  callFrameSelectedInUI() {
    const callFrame = UI.Context.Context.instance().flavor(StackTrace.StackTrace.DebuggableFrameFlavor);
    const callFrameContext = callFrame?.sdkFrame.script.executionContext();
    if (callFrameContext) {
      UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, callFrameContext);
    }
  }
  callFrameSelectedInModel(event) {
    const debuggerModel = event.data;
    for (const executionContext of this.items) {
      if (executionContext.debuggerModel === debuggerModel) {
        this.dropDown.refreshItem(executionContext);
      }
    }
  }
  frameNavigated(event) {
    const frame = event.data;
    const runtimeModel = frame.resourceTreeModel().target().model(SDK.RuntimeModel.RuntimeModel);
    if (!runtimeModel) {
      return;
    }
    for (const executionContext of runtimeModel.executionContexts()) {
      if (frame.id === executionContext.frameId) {
        this.dropDown.refreshItem(executionContext);
      }
    }
  }
};
var DEFAULT_VIEW = (input, _output, target) => {
  if (!input.title) {
    render(nothing, target);
    return;
  }
  const paddingLeft = input.itemDepth ? 8 + input.itemDepth * 15 + "px" : void 0;
  render(
    html`
      <style>${consoleContextSelector_css_default}</style>
      <div class="console-context-selector-element" style="padding-left: ${paddingLeft};">
        <div class="title">${Platform.StringUtilities.trimEndWithMaxLength(input.title, 100)}</div>
        <div class="subtitle">${input.subtitle}</div>
      </div>
    `,
    target
  );
};
var ConsoleContextSelectorElement = class extends UI.Widget.Widget {
  #view;
  #title;
  #subtitle;
  #itemDepth;
  constructor(element, view) {
    super(element, { useShadowDom: true });
    this.#view = view ?? DEFAULT_VIEW;
    this.requestUpdate();
  }
  set title(title) {
    this.#title = title;
    this.requestUpdate();
  }
  set subtitle(subtitle) {
    this.#subtitle = subtitle;
    this.requestUpdate();
  }
  set itemDepth(itemDepth) {
    this.#itemDepth = itemDepth;
    this.requestUpdate();
  }
  async performUpdate() {
    const viewInput = {
      title: this.#title,
      subtitle: this.#subtitle,
      itemDepth: this.#itemDepth
    };
    this.#view(viewInput, void 0, this.contentElement);
  }
};

// ../../front_end/panels/console/ConsoleFilter.ts
var ConsoleFilter_exports = {};
__export(ConsoleFilter_exports, {
  ConsoleFilter: () => ConsoleFilter,
  FilterType: () => FilterType
});
import * as SDK2 from "../../core/sdk/sdk.js";
import * as TextUtils from "../../core/text_utils/text_utils.js";

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
var CSS;
((CSS2) => {
  let StyleSheetOrigin;
  ((StyleSheetOrigin2) => {
    StyleSheetOrigin2["Injected"] = "injected";
    StyleSheetOrigin2["UserAgent"] = "user-agent";
    StyleSheetOrigin2["Inspector"] = "inspector";
    StyleSheetOrigin2["Regular"] = "regular";
  })(StyleSheetOrigin = CSS2.StyleSheetOrigin || (CSS2.StyleSheetOrigin = {}));
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
  })(CSSRuleType = CSS2.CSSRuleType || (CSS2.CSSRuleType = {}));
  let CSSMediaSource;
  ((CSSMediaSource2) => {
    CSSMediaSource2["MediaRule"] = "mediaRule";
    CSSMediaSource2["ImportRule"] = "importRule";
    CSSMediaSource2["LinkedSheet"] = "linkedSheet";
    CSSMediaSource2["InlineSheet"] = "inlineSheet";
  })(CSSMediaSource = CSS2.CSSMediaSource || (CSS2.CSSMediaSource = {}));
  let CSSAtRuleType;
  ((CSSAtRuleType2) => {
    CSSAtRuleType2["FontFace"] = "font-face";
    CSSAtRuleType2["FontFeatureValues"] = "font-feature-values";
    CSSAtRuleType2["FontPaletteValues"] = "font-palette-values";
    CSSAtRuleType2["CounterStyle"] = "counter-style";
  })(CSSAtRuleType = CSS2.CSSAtRuleType || (CSS2.CSSAtRuleType = {}));
  let CSSAtRuleSubsection;
  ((CSSAtRuleSubsection2) => {
    CSSAtRuleSubsection2["Swash"] = "swash";
    CSSAtRuleSubsection2["Annotation"] = "annotation";
    CSSAtRuleSubsection2["Ornaments"] = "ornaments";
    CSSAtRuleSubsection2["Stylistic"] = "stylistic";
    CSSAtRuleSubsection2["Styleset"] = "styleset";
    CSSAtRuleSubsection2["CharacterVariant"] = "character-variant";
  })(CSSAtRuleSubsection = CSS2.CSSAtRuleSubsection || (CSS2.CSSAtRuleSubsection = {}));
})(CSS || (CSS = {}));
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
((Input2) => {
  let GestureSourceType;
  ((GestureSourceType2) => {
    GestureSourceType2["Default"] = "default";
    GestureSourceType2["Touch"] = "touch";
    GestureSourceType2["Mouse"] = "mouse";
  })(GestureSourceType = Input2.GestureSourceType || (Input2.GestureSourceType = {}));
  let MouseButton;
  ((MouseButton2) => {
    MouseButton2["None"] = "none";
    MouseButton2["Left"] = "left";
    MouseButton2["Middle"] = "middle";
    MouseButton2["Right"] = "right";
    MouseButton2["Back"] = "back";
    MouseButton2["Forward"] = "forward";
  })(MouseButton = Input2.MouseButton || (Input2.MouseButton = {}));
  let DispatchDragEventRequestType;
  ((DispatchDragEventRequestType2) => {
    DispatchDragEventRequestType2["DragEnter"] = "dragEnter";
    DispatchDragEventRequestType2["DragOver"] = "dragOver";
    DispatchDragEventRequestType2["Drop"] = "drop";
    DispatchDragEventRequestType2["DragCancel"] = "dragCancel";
  })(DispatchDragEventRequestType = Input2.DispatchDragEventRequestType || (Input2.DispatchDragEventRequestType = {}));
  let DispatchKeyEventRequestType;
  ((DispatchKeyEventRequestType2) => {
    DispatchKeyEventRequestType2["KeyDown"] = "keyDown";
    DispatchKeyEventRequestType2["KeyUp"] = "keyUp";
    DispatchKeyEventRequestType2["RawKeyDown"] = "rawKeyDown";
    DispatchKeyEventRequestType2["Char"] = "char";
  })(DispatchKeyEventRequestType = Input2.DispatchKeyEventRequestType || (Input2.DispatchKeyEventRequestType = {}));
  let DispatchMouseEventRequestType;
  ((DispatchMouseEventRequestType2) => {
    DispatchMouseEventRequestType2["MousePressed"] = "mousePressed";
    DispatchMouseEventRequestType2["MouseReleased"] = "mouseReleased";
    DispatchMouseEventRequestType2["MouseMoved"] = "mouseMoved";
    DispatchMouseEventRequestType2["MouseWheel"] = "mouseWheel";
  })(DispatchMouseEventRequestType = Input2.DispatchMouseEventRequestType || (Input2.DispatchMouseEventRequestType = {}));
  let DispatchMouseEventRequestPointerType;
  ((DispatchMouseEventRequestPointerType2) => {
    DispatchMouseEventRequestPointerType2["Mouse"] = "mouse";
    DispatchMouseEventRequestPointerType2["Pen"] = "pen";
  })(DispatchMouseEventRequestPointerType = Input2.DispatchMouseEventRequestPointerType || (Input2.DispatchMouseEventRequestPointerType = {}));
  let DispatchTouchEventRequestType;
  ((DispatchTouchEventRequestType2) => {
    DispatchTouchEventRequestType2["TouchStart"] = "touchStart";
    DispatchTouchEventRequestType2["TouchEnd"] = "touchEnd";
    DispatchTouchEventRequestType2["TouchMove"] = "touchMove";
    DispatchTouchEventRequestType2["TouchCancel"] = "touchCancel";
  })(DispatchTouchEventRequestType = Input2.DispatchTouchEventRequestType || (Input2.DispatchTouchEventRequestType = {}));
  let EmulateTouchFromMouseEventRequestType;
  ((EmulateTouchFromMouseEventRequestType2) => {
    EmulateTouchFromMouseEventRequestType2["MousePressed"] = "mousePressed";
    EmulateTouchFromMouseEventRequestType2["MouseReleased"] = "mouseReleased";
    EmulateTouchFromMouseEventRequestType2["MouseMoved"] = "mouseMoved";
    EmulateTouchFromMouseEventRequestType2["MouseWheel"] = "mouseWheel";
  })(EmulateTouchFromMouseEventRequestType = Input2.EmulateTouchFromMouseEventRequestType || (Input2.EmulateTouchFromMouseEventRequestType = {}));
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
((Network2) => {
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
  })(ResourceType = Network2.ResourceType || (Network2.ResourceType = {}));
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
  })(ErrorReason = Network2.ErrorReason || (Network2.ErrorReason = {}));
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
  })(ConnectionType = Network2.ConnectionType || (Network2.ConnectionType = {}));
  let CookieSameSite;
  ((CookieSameSite2) => {
    CookieSameSite2["Strict"] = "Strict";
    CookieSameSite2["Lax"] = "Lax";
    CookieSameSite2["None"] = "None";
  })(CookieSameSite = Network2.CookieSameSite || (Network2.CookieSameSite = {}));
  let CookiePriority;
  ((CookiePriority2) => {
    CookiePriority2["Low"] = "Low";
    CookiePriority2["Medium"] = "Medium";
    CookiePriority2["High"] = "High";
  })(CookiePriority = Network2.CookiePriority || (Network2.CookiePriority = {}));
  let CookieSourceScheme;
  ((CookieSourceScheme2) => {
    CookieSourceScheme2["Unset"] = "Unset";
    CookieSourceScheme2["NonSecure"] = "NonSecure";
    CookieSourceScheme2["Secure"] = "Secure";
  })(CookieSourceScheme = Network2.CookieSourceScheme || (Network2.CookieSourceScheme = {}));
  let ResourcePriority;
  ((ResourcePriority2) => {
    ResourcePriority2["VeryLow"] = "VeryLow";
    ResourcePriority2["Low"] = "Low";
    ResourcePriority2["Medium"] = "Medium";
    ResourcePriority2["High"] = "High";
    ResourcePriority2["VeryHigh"] = "VeryHigh";
  })(ResourcePriority = Network2.ResourcePriority || (Network2.ResourcePriority = {}));
  let RenderBlockingBehavior;
  ((RenderBlockingBehavior2) => {
    RenderBlockingBehavior2["Blocking"] = "Blocking";
    RenderBlockingBehavior2["InBodyParserBlocking"] = "InBodyParserBlocking";
    RenderBlockingBehavior2["NonBlocking"] = "NonBlocking";
    RenderBlockingBehavior2["NonBlockingDynamic"] = "NonBlockingDynamic";
    RenderBlockingBehavior2["PotentiallyBlocking"] = "PotentiallyBlocking";
  })(RenderBlockingBehavior = Network2.RenderBlockingBehavior || (Network2.RenderBlockingBehavior = {}));
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
  })(RequestReferrerPolicy = Network2.RequestReferrerPolicy || (Network2.RequestReferrerPolicy = {}));
  let CertificateTransparencyCompliance;
  ((CertificateTransparencyCompliance2) => {
    CertificateTransparencyCompliance2["Unknown"] = "unknown";
    CertificateTransparencyCompliance2["NotCompliant"] = "not-compliant";
    CertificateTransparencyCompliance2["Compliant"] = "compliant";
  })(CertificateTransparencyCompliance = Network2.CertificateTransparencyCompliance || (Network2.CertificateTransparencyCompliance = {}));
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
  })(BlockedReason = Network2.BlockedReason || (Network2.BlockedReason = {}));
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
  })(CorsError = Network2.CorsError || (Network2.CorsError = {}));
  let ServiceWorkerResponseSource;
  ((ServiceWorkerResponseSource2) => {
    ServiceWorkerResponseSource2["CacheStorage"] = "cache-storage";
    ServiceWorkerResponseSource2["HttpCache"] = "http-cache";
    ServiceWorkerResponseSource2["FallbackCode"] = "fallback-code";
    ServiceWorkerResponseSource2["Network"] = "network";
  })(ServiceWorkerResponseSource = Network2.ServiceWorkerResponseSource || (Network2.ServiceWorkerResponseSource = {}));
  let TrustTokenParamsRefreshPolicy;
  ((TrustTokenParamsRefreshPolicy2) => {
    TrustTokenParamsRefreshPolicy2["UseCached"] = "UseCached";
    TrustTokenParamsRefreshPolicy2["Refresh"] = "Refresh";
  })(TrustTokenParamsRefreshPolicy = Network2.TrustTokenParamsRefreshPolicy || (Network2.TrustTokenParamsRefreshPolicy = {}));
  let TrustTokenOperationType;
  ((TrustTokenOperationType2) => {
    TrustTokenOperationType2["Issuance"] = "Issuance";
    TrustTokenOperationType2["Redemption"] = "Redemption";
    TrustTokenOperationType2["Signing"] = "Signing";
  })(TrustTokenOperationType = Network2.TrustTokenOperationType || (Network2.TrustTokenOperationType = {}));
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
  })(AlternateProtocolUsage = Network2.AlternateProtocolUsage || (Network2.AlternateProtocolUsage = {}));
  let ServiceWorkerRouterSource;
  ((ServiceWorkerRouterSource2) => {
    ServiceWorkerRouterSource2["Network"] = "network";
    ServiceWorkerRouterSource2["Cache"] = "cache";
    ServiceWorkerRouterSource2["FetchEvent"] = "fetch-event";
    ServiceWorkerRouterSource2["RaceNetworkAndFetchHandler"] = "race-network-and-fetch-handler";
    ServiceWorkerRouterSource2["RaceNetworkAndCache"] = "race-network-and-cache";
  })(ServiceWorkerRouterSource = Network2.ServiceWorkerRouterSource || (Network2.ServiceWorkerRouterSource = {}));
  let InitiatorType;
  ((InitiatorType2) => {
    InitiatorType2["Parser"] = "parser";
    InitiatorType2["Script"] = "script";
    InitiatorType2["Preload"] = "preload";
    InitiatorType2["SignedExchange"] = "SignedExchange";
    InitiatorType2["Preflight"] = "preflight";
    InitiatorType2["FedCM"] = "FedCM";
    InitiatorType2["Other"] = "other";
  })(InitiatorType = Network2.InitiatorType || (Network2.InitiatorType = {}));
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
  })(SetCookieBlockedReason = Network2.SetCookieBlockedReason || (Network2.SetCookieBlockedReason = {}));
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
  })(CookieBlockedReason = Network2.CookieBlockedReason || (Network2.CookieBlockedReason = {}));
  let CookieExemptionReason;
  ((CookieExemptionReason2) => {
    CookieExemptionReason2["None"] = "None";
    CookieExemptionReason2["UserSetting"] = "UserSetting";
    CookieExemptionReason2["EnterprisePolicy"] = "EnterprisePolicy";
    CookieExemptionReason2["StorageAccess"] = "StorageAccess";
    CookieExemptionReason2["TopLevelStorageAccess"] = "TopLevelStorageAccess";
    CookieExemptionReason2["Scheme"] = "Scheme";
    CookieExemptionReason2["SameSiteNoneCookiesInSandbox"] = "SameSiteNoneCookiesInSandbox";
  })(CookieExemptionReason = Network2.CookieExemptionReason || (Network2.CookieExemptionReason = {}));
  let AuthChallengeSource;
  ((AuthChallengeSource2) => {
    AuthChallengeSource2["Server"] = "Server";
    AuthChallengeSource2["Proxy"] = "Proxy";
  })(AuthChallengeSource = Network2.AuthChallengeSource || (Network2.AuthChallengeSource = {}));
  let AuthChallengeResponseResponse;
  ((AuthChallengeResponseResponse2) => {
    AuthChallengeResponseResponse2["Default"] = "Default";
    AuthChallengeResponseResponse2["CancelAuth"] = "CancelAuth";
    AuthChallengeResponseResponse2["ProvideCredentials"] = "ProvideCredentials";
  })(AuthChallengeResponseResponse = Network2.AuthChallengeResponseResponse || (Network2.AuthChallengeResponseResponse = {}));
  let SignedExchangeErrorField;
  ((SignedExchangeErrorField2) => {
    SignedExchangeErrorField2["SignatureSig"] = "signatureSig";
    SignedExchangeErrorField2["SignatureIntegrity"] = "signatureIntegrity";
    SignedExchangeErrorField2["SignatureCertUrl"] = "signatureCertUrl";
    SignedExchangeErrorField2["SignatureCertSha256"] = "signatureCertSha256";
    SignedExchangeErrorField2["SignatureValidityUrl"] = "signatureValidityUrl";
    SignedExchangeErrorField2["SignatureTimestamps"] = "signatureTimestamps";
  })(SignedExchangeErrorField = Network2.SignedExchangeErrorField || (Network2.SignedExchangeErrorField = {}));
  let DirectSocketDnsQueryType;
  ((DirectSocketDnsQueryType2) => {
    DirectSocketDnsQueryType2["Ipv4"] = "ipv4";
    DirectSocketDnsQueryType2["Ipv6"] = "ipv6";
  })(DirectSocketDnsQueryType = Network2.DirectSocketDnsQueryType || (Network2.DirectSocketDnsQueryType = {}));
  let LocalNetworkAccessRequestPolicy;
  ((LocalNetworkAccessRequestPolicy2) => {
    LocalNetworkAccessRequestPolicy2["Allow"] = "Allow";
    LocalNetworkAccessRequestPolicy2["BlockFromInsecureToMorePrivate"] = "BlockFromInsecureToMorePrivate";
    LocalNetworkAccessRequestPolicy2["WarnFromInsecureToMorePrivate"] = "WarnFromInsecureToMorePrivate";
    LocalNetworkAccessRequestPolicy2["PermissionBlock"] = "PermissionBlock";
    LocalNetworkAccessRequestPolicy2["PermissionWarn"] = "PermissionWarn";
  })(LocalNetworkAccessRequestPolicy = Network2.LocalNetworkAccessRequestPolicy || (Network2.LocalNetworkAccessRequestPolicy = {}));
  let IPAddressSpace;
  ((IPAddressSpace2) => {
    IPAddressSpace2["Loopback"] = "Loopback";
    IPAddressSpace2["Local"] = "Local";
    IPAddressSpace2["Public"] = "Public";
    IPAddressSpace2["Unknown"] = "Unknown";
  })(IPAddressSpace = Network2.IPAddressSpace || (Network2.IPAddressSpace = {}));
  let CrossOriginOpenerPolicyValue;
  ((CrossOriginOpenerPolicyValue2) => {
    CrossOriginOpenerPolicyValue2["SameOrigin"] = "SameOrigin";
    CrossOriginOpenerPolicyValue2["SameOriginAllowPopups"] = "SameOriginAllowPopups";
    CrossOriginOpenerPolicyValue2["RestrictProperties"] = "RestrictProperties";
    CrossOriginOpenerPolicyValue2["UnsafeNone"] = "UnsafeNone";
    CrossOriginOpenerPolicyValue2["SameOriginPlusCoep"] = "SameOriginPlusCoep";
    CrossOriginOpenerPolicyValue2["RestrictPropertiesPlusCoep"] = "RestrictPropertiesPlusCoep";
    CrossOriginOpenerPolicyValue2["NoopenerAllowPopups"] = "NoopenerAllowPopups";
  })(CrossOriginOpenerPolicyValue = Network2.CrossOriginOpenerPolicyValue || (Network2.CrossOriginOpenerPolicyValue = {}));
  let CrossOriginEmbedderPolicyValue;
  ((CrossOriginEmbedderPolicyValue2) => {
    CrossOriginEmbedderPolicyValue2["None"] = "None";
    CrossOriginEmbedderPolicyValue2["Credentialless"] = "Credentialless";
    CrossOriginEmbedderPolicyValue2["RequireCorp"] = "RequireCorp";
  })(CrossOriginEmbedderPolicyValue = Network2.CrossOriginEmbedderPolicyValue || (Network2.CrossOriginEmbedderPolicyValue = {}));
  let ContentSecurityPolicySource;
  ((ContentSecurityPolicySource2) => {
    ContentSecurityPolicySource2["HTTP"] = "HTTP";
    ContentSecurityPolicySource2["Meta"] = "Meta";
  })(ContentSecurityPolicySource = Network2.ContentSecurityPolicySource || (Network2.ContentSecurityPolicySource = {}));
  let ReportStatus;
  ((ReportStatus2) => {
    ReportStatus2["Queued"] = "Queued";
    ReportStatus2["Pending"] = "Pending";
    ReportStatus2["MarkedForRemoval"] = "MarkedForRemoval";
    ReportStatus2["Success"] = "Success";
  })(ReportStatus = Network2.ReportStatus || (Network2.ReportStatus = {}));
  let DeviceBoundSessionWithUsageUsage;
  ((DeviceBoundSessionWithUsageUsage2) => {
    DeviceBoundSessionWithUsageUsage2["NotInScope"] = "NotInScope";
    DeviceBoundSessionWithUsageUsage2["InScopeRefreshNotYetNeeded"] = "InScopeRefreshNotYetNeeded";
    DeviceBoundSessionWithUsageUsage2["InScopeRefreshNotAllowed"] = "InScopeRefreshNotAllowed";
    DeviceBoundSessionWithUsageUsage2["ProactiveRefreshNotPossible"] = "ProactiveRefreshNotPossible";
    DeviceBoundSessionWithUsageUsage2["ProactiveRefreshAttempted"] = "ProactiveRefreshAttempted";
    DeviceBoundSessionWithUsageUsage2["Deferred"] = "Deferred";
  })(DeviceBoundSessionWithUsageUsage = Network2.DeviceBoundSessionWithUsageUsage || (Network2.DeviceBoundSessionWithUsageUsage = {}));
  let DeviceBoundSessionUrlRuleRuleType;
  ((DeviceBoundSessionUrlRuleRuleType2) => {
    DeviceBoundSessionUrlRuleRuleType2["Exclude"] = "Exclude";
    DeviceBoundSessionUrlRuleRuleType2["Include"] = "Include";
  })(DeviceBoundSessionUrlRuleRuleType = Network2.DeviceBoundSessionUrlRuleRuleType || (Network2.DeviceBoundSessionUrlRuleRuleType = {}));
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
  })(DeviceBoundSessionFetchResult = Network2.DeviceBoundSessionFetchResult || (Network2.DeviceBoundSessionFetchResult = {}));
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
  })(RefreshEventDetailsRefreshResult = Network2.RefreshEventDetailsRefreshResult || (Network2.RefreshEventDetailsRefreshResult = {}));
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
  })(TerminationEventDetailsDeletionReason = Network2.TerminationEventDetailsDeletionReason || (Network2.TerminationEventDetailsDeletionReason = {}));
  let ChallengeEventDetailsChallengeResult;
  ((ChallengeEventDetailsChallengeResult2) => {
    ChallengeEventDetailsChallengeResult2["Success"] = "Success";
    ChallengeEventDetailsChallengeResult2["NoSessionId"] = "NoSessionId";
    ChallengeEventDetailsChallengeResult2["NoSessionMatch"] = "NoSessionMatch";
    ChallengeEventDetailsChallengeResult2["CantSetBoundCookie"] = "CantSetBoundCookie";
  })(ChallengeEventDetailsChallengeResult = Network2.ChallengeEventDetailsChallengeResult || (Network2.ChallengeEventDetailsChallengeResult = {}));
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
  })(TrustTokenOperationDoneEventStatus = Network2.TrustTokenOperationDoneEventStatus || (Network2.TrustTokenOperationDoneEventStatus = {}));
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
var Target2;
((Target3) => {
  let WindowState;
  ((WindowState2) => {
    WindowState2["Normal"] = "normal";
    WindowState2["Minimized"] = "minimized";
    WindowState2["Maximized"] = "maximized";
    WindowState2["Fullscreen"] = "fullscreen";
  })(WindowState = Target3.WindowState || (Target3.WindowState = {}));
})(Target2 || (Target2 = {}));
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
((Runtime6) => {
  let SerializationOptionsSerialization;
  ((SerializationOptionsSerialization2) => {
    SerializationOptionsSerialization2["Deep"] = "deep";
    SerializationOptionsSerialization2["Json"] = "json";
    SerializationOptionsSerialization2["IdOnly"] = "idOnly";
  })(SerializationOptionsSerialization = Runtime6.SerializationOptionsSerialization || (Runtime6.SerializationOptionsSerialization = {}));
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
  })(DeepSerializedValueType = Runtime6.DeepSerializedValueType || (Runtime6.DeepSerializedValueType = {}));
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
  })(RemoteObjectType = Runtime6.RemoteObjectType || (Runtime6.RemoteObjectType = {}));
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
  })(RemoteObjectSubtype = Runtime6.RemoteObjectSubtype || (Runtime6.RemoteObjectSubtype = {}));
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
  })(ObjectPreviewType = Runtime6.ObjectPreviewType || (Runtime6.ObjectPreviewType = {}));
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
  })(ObjectPreviewSubtype = Runtime6.ObjectPreviewSubtype || (Runtime6.ObjectPreviewSubtype = {}));
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
  })(PropertyPreviewType = Runtime6.PropertyPreviewType || (Runtime6.PropertyPreviewType = {}));
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
  })(PropertyPreviewSubtype = Runtime6.PropertyPreviewSubtype || (Runtime6.PropertyPreviewSubtype = {}));
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
  })(ConsoleAPICalledEventType = Runtime6.ConsoleAPICalledEventType || (Runtime6.ConsoleAPICalledEventType = {}));
})(Runtime || (Runtime = {}));

// ../../front_end/panels/console/ConsoleFilter.ts
var ConsoleFilter = class _ConsoleFilter {
  name;
  parsedFilters;
  executionContext;
  levelsMask;
  constructor(name, parsedFilters, executionContext, levelsMask) {
    this.name = name;
    this.parsedFilters = parsedFilters;
    this.executionContext = executionContext;
    this.levelsMask = levelsMask || _ConsoleFilter.defaultLevelsFilterValue();
  }
  static allLevelsFilterValue() {
    const result = {};
    const logLevels = {
      Verbose: Log.LogEntryLevel.Verbose,
      Info: Log.LogEntryLevel.Info,
      Warning: Log.LogEntryLevel.Warning,
      Error: Log.LogEntryLevel.Error
    };
    for (const name of Object.values(logLevels)) {
      result[name] = true;
    }
    return result;
  }
  static defaultLevelsFilterValue() {
    const result = _ConsoleFilter.allLevelsFilterValue();
    result[Log.LogEntryLevel.Verbose] = false;
    return result;
  }
  static singleLevelMask(level) {
    const result = {};
    result[level] = true;
    return result;
  }
  clone() {
    const parsedFilters = this.parsedFilters.map(TextUtils.TextUtils.FilterParser.cloneFilter);
    const levelsMask = Object.assign({}, this.levelsMask);
    return new _ConsoleFilter(this.name, parsedFilters, this.executionContext, levelsMask);
  }
  shouldBeVisible(viewMessage) {
    const message = viewMessage.consoleMessage();
    if (this.executionContext && (this.executionContext.runtimeModel !== message.runtimeModel() || this.executionContext.id !== message.getExecutionContextId())) {
      return false;
    }
    if (message.type === SDK2.ConsoleModel.FrontendMessageType.Command || message.type === SDK2.ConsoleModel.FrontendMessageType.Result || message.type === Runtime.ConsoleAPICalledEventType.EndGroup) {
      return true;
    }
    if (message.level && !this.levelsMask[message.level]) {
      return false;
    }
    return this.applyFilter(viewMessage) || this.parentGroupHasMatch(viewMessage.consoleGroup());
  }
  // A message is visible if there is a match in any of the parent groups' titles.
  parentGroupHasMatch(viewMessage) {
    if (viewMessage === null) {
      return false;
    }
    return this.applyFilter(viewMessage) || this.parentGroupHasMatch(viewMessage.consoleGroup());
  }
  applyFilter(viewMessage) {
    const message = viewMessage.consoleMessage();
    for (const filter of this.parsedFilters) {
      if (!filter.key) {
        if (filter.regex && viewMessage.matchesFilterRegex(filter.regex) === filter.negative) {
          return false;
        }
        if (filter.text && viewMessage.matchesFilterText(filter.text) === filter.negative) {
          return false;
        }
      } else {
        switch (filter.key) {
          case "context" /* Context */: {
            if (!passesFilter(
              filter,
              message.context,
              false
              /* exactMatch */
            )) {
              return false;
            }
            break;
          }
          case "source" /* Source */: {
            const sourceNameForMessage = message.source ? SDK2.ConsoleModel.MessageSourceDisplayName.get(message.source) : message.source;
            if (!passesFilter(
              filter,
              sourceNameForMessage,
              true
              /* exactMatch */
            )) {
              return false;
            }
            break;
          }
          case "url" /* Url */: {
            if (!passesFilter(
              filter,
              message.url,
              false
              /* exactMatch */
            )) {
              return false;
            }
            break;
          }
        }
      }
    }
    return true;
    function passesFilter(filter, value, exactMatch) {
      if (!filter.text) {
        return Boolean(value) === filter.negative;
      }
      if (!value) {
        return !filter.text === !filter.negative;
      }
      const filterText = filter.text.toLowerCase();
      const lowerCaseValue = value.toLowerCase();
      if (exactMatch && lowerCaseValue === filterText === filter.negative) {
        return false;
      }
      if (!exactMatch && lowerCaseValue.includes(filterText) === filter.negative) {
        return false;
      }
      return true;
    }
  }
};
var FilterType = /* @__PURE__ */ ((FilterType2) => {
  FilterType2["Context"] = "context";
  FilterType2["Source"] = "source";
  FilterType2["Url"] = "url";
  return FilterType2;
})(FilterType || {});

// ../../front_end/panels/console/ConsoleFormat.ts
var ConsoleFormat_exports = {};
__export(ConsoleFormat_exports, {
  format: () => format,
  updateStyle: () => updateStyle
});
import * as ObjectUI from "../../ui/legacy/components/object_ui/object_ui.js";
var ANSI_COLORS = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "gray"];
var ANSI_BRIGHT_COLORS = ["darkgray", "lightred", "lightgreen", "lightyellow", "lightblue", "lightmagenta", "lightcyan", "white"];
var format = (fmt, args) => {
  const tokens = [];
  const currentStyle = /* @__PURE__ */ new Map();
  function addTextDecoration(value) {
    const textDecoration = currentStyle.get("text-decoration") ?? "";
    if (!textDecoration.includes(value)) {
      currentStyle.set("text-decoration", `${textDecoration} ${value}`);
    }
  }
  function removeTextDecoration(value) {
    const textDecoration = currentStyle.get("text-decoration")?.replace(` ${value}`, "");
    if (textDecoration) {
      currentStyle.set("text-decoration", textDecoration);
    } else {
      currentStyle.delete("text-decoration");
    }
  }
  function addStringToken(value) {
    if (!value) {
      return;
    }
    if (tokens.length && tokens[tokens.length - 1].type === "string") {
      tokens[tokens.length - 1].value += value;
      return;
    }
    tokens.push({ type: "string", value });
  }
  let argIndex = 0;
  const re = /%([%_Oocsdfi])|\x1B\[([\d;]*)m/;
  for (let match = re.exec(fmt); match !== null; match = re.exec(fmt)) {
    addStringToken(match.input.substring(0, match.index));
    let substitution = void 0;
    const specifier = match[1];
    switch (specifier) {
      case "%":
        addStringToken("%");
        substitution = "";
        break;
      case "s":
        if (argIndex < args.length) {
          const { description } = args[argIndex++];
          substitution = description ?? "";
        }
        break;
      case "c":
        if (argIndex < args.length) {
          const type = "style";
          const value = args[argIndex++].description ?? "";
          tokens.push({ type, value });
          substitution = "";
        }
        break;
      case "o":
      case "O":
        if (argIndex < args.length) {
          const type = specifier === "O" ? "generic" : "optimal";
          const value = args[argIndex++];
          tokens.push({ type, value });
          substitution = "";
        }
        break;
      case "_":
        if (argIndex < args.length) {
          argIndex++;
          substitution = "";
        }
        break;
      case "d":
      case "f":
      case "i":
        if (argIndex < args.length) {
          const { value } = args[argIndex++];
          substitution = typeof value !== "number" ? NaN : value;
          if (specifier !== "f") {
            substitution = Math.floor(substitution);
          }
        }
        break;
      case void 0: {
        const codes = (match[2] || "0").split(";").map((code) => code ? parseInt(code, 10) : 0);
        while (codes.length) {
          const code = codes.shift();
          switch (code) {
            case 0:
              currentStyle.clear();
              break;
            case 1:
              currentStyle.set("font-weight", "bold");
              break;
            case 2:
              currentStyle.set("font-weight", "lighter");
              break;
            case 3:
              currentStyle.set("font-style", "italic");
              break;
            case 4:
              addTextDecoration("underline");
              break;
            case 9:
              addTextDecoration("line-through");
              break;
            case 22:
              currentStyle.delete("font-weight");
              break;
            case 23:
              currentStyle.delete("font-style");
              break;
            case 24:
              removeTextDecoration("underline");
              break;
            case 29:
              removeTextDecoration("line-through");
              break;
            case 38:
            case 48:
              if (codes.shift() === 2) {
                const r = codes.shift() ?? 0, g = codes.shift() ?? 0, b = codes.shift() ?? 0;
                currentStyle.set(code === 38 ? "color" : "background-color", `rgb(${r},${g},${b})`);
              }
              break;
            case 39:
            case 49:
              currentStyle.delete(code === 39 ? "color" : "background-color");
              break;
            case 53:
              addTextDecoration("overline");
              break;
            case 55:
              removeTextDecoration("overline");
              break;
            default: {
              const color = ANSI_COLORS[code - 30] ?? ANSI_BRIGHT_COLORS[code - 90];
              if (color !== void 0) {
                currentStyle.set("color", `var(--console-color-${color})`);
              } else {
                const background = ANSI_COLORS[code - 40] ?? ANSI_BRIGHT_COLORS[code - 100];
                if (background !== void 0) {
                  currentStyle.set("background-color", `var(--console-color-${background})`);
                }
              }
              break;
            }
          }
        }
        const value = [...currentStyle.entries()].map(([key, val]) => `${key}:${val.trimStart()}`).join(";");
        const type = "style";
        tokens.push({ type, value });
        substitution = "";
        break;
      }
    }
    if (substitution === void 0) {
      addStringToken(match[0]);
      substitution = "";
    }
    fmt = substitution + match.input.substring(match.index + match[0].length);
  }
  addStringToken(fmt);
  return { tokens, args: args.slice(argIndex) };
};
var updateStyle = (currentStyle, styleToAdd) => {
  ObjectUI.CSSStyleSanitizer.sanitizeStyle(currentStyle, styleToAdd);
};

// ../../front_end/panels/console/ConsoleInsightTeaser.ts
var ConsoleInsightTeaser_exports = {};
__export(ConsoleInsightTeaser_exports, {
  ConsoleInsightTeaser: () => ConsoleInsightTeaser,
  DEFAULT_VIEW: () => DEFAULT_VIEW3
});
import "../../ui/components/tooltips/tooltips.js";
import "../../ui/kit/kit.js";
import * as Common3 from "../../core/common/common.js";
import * as Host2 from "../../core/host/host.js";
import * as i18n5 from "../../core/i18n/i18n.js";
import * as Root from "../../core/root/root.js";
import * as AiAssistanceModel3 from "../../models/ai_assistance/ai_assistance.js";
import * as Buttons from "../../ui/components/buttons/buttons.js";
import * as Dialogs from "../../ui/components/dialogs/dialogs.js";
import * as UI5 from "../../ui/legacy/legacy.js";
import * as Lit3 from "../../ui/lit/lit.js";
import * as VisualLogging2 from "../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/console/consoleInsightTeaser.css.js
var consoleInsightTeaser_css_default = `/*
 * Copyright 2025 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
  .teaser-tooltip-container {
    width: var(--sys-size-31);
    padding: var(--sys-size-1) var(--sys-size-3) var(--sys-size-3);
    margin-top: var(--sys-size-2);
  }

  .response-container {
    height: 85px;
    display: flex;
    flex-direction: column;
  }

  @keyframes gradient {
    0% { background-position: 100% 0; }
    100% { background-position: -100% 0; }
  }

  .loader {
    background-size: 400% 100%;
    animation: gradient 4s infinite linear;
    margin-top: var(--sys-size-5);
  }

  @media (prefers-color-scheme: light) {
    .loader {
      background-image: linear-gradient(
        70deg,
        color-mix(in srgb, var(--sys-color-on-surface) 5%, transparent) 0%,
        color-mix(in srgb, var(--sys-color-on-surface) 5%, transparent) 30%,
        color-mix(in srgb, var(--sys-color-on-surface) 15%, transparent) 50%,
        color-mix(in srgb, var(--sys-color-on-surface) 5%, transparent) 70%,
        color-mix(in srgb, var(--sys-color-on-surface) 5%, transparent) 100%
      );
    }
  }

  @media (prefers-color-scheme: dark) {
    .loader {
      background-image: linear-gradient(
        70deg,
        color-mix(in srgb, var(--sys-color-on-surface) 10%, transparent) 0%,
        color-mix(in srgb, var(--sys-color-on-surface) 10%, transparent) 30%,
        color-mix(in srgb, var(--sys-color-on-surface) 30%, transparent) 50%,
        color-mix(in srgb, var(--sys-color-on-surface) 10%, transparent) 70%,
        color-mix(in srgb, var(--sys-color-on-surface) 10%, transparent) 100%
      );
    }
  }

  h2 {
    font: var(--sys-typescale-body4-bold);
    margin: 0 0 var(--sys-size-3);
    line-clamp: 1;
    -webkit-line-clamp: 1;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .main-text {
    line-clamp: 4;
    -webkit-line-clamp: 4;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .lightbulb-icon {
    color: var(--sys-color-on-primary);
    height: var(--sys-size-7);
    margin-left: calc(-1 * var(--sys-size-4));
  }

  .learn-more {
    padding-top: 7px;
  }

  .info-tooltip-text {
    max-width: var(--sys-size-26);
  }

  .tooltip-footer {
    padding: var(--sys-size-5) 0 0;
    display: flex;
    align-items: center;
    height: 34px;

    devtools-checkbox {
      margin-left: auto;
    }
  }

  .progress-line {
    display: flex;
    align-items: center;
    flex-grow: 1;

    .label {
      margin-right: var(--sys-size-6);
    }

    .indicator-container {
      height: var(--sys-size-5);
      background-color: var(--sys-color-surface5);
      flex-grow: 1
    }

    .indicator {
      background-color: var(--sys-color-primary);
      height: 100%;
    }
  }
}

/*# sourceURL=${import.meta.resolve("./consoleInsightTeaser.css")} */`;

// ../../front_end/panels/console/ConsoleViewMessage.ts
var ConsoleViewMessage_exports = {};
__export(ConsoleViewMessage_exports, {
  ConsoleCommand: () => ConsoleCommand,
  ConsoleCommandResult: () => ConsoleCommandResult,
  ConsoleGroupViewMessage: () => ConsoleGroupViewMessage,
  ConsoleTableMessageView: () => ConsoleTableMessageView,
  ConsoleViewMessage: () => ConsoleViewMessage,
  getLongStringVisibleLength: () => getLongStringVisibleLength,
  getMaxTokenizableStringLength: () => getMaxTokenizableStringLength,
  getMessageForElement: () => getMessageForElement,
  setLongStringVisibleLength: () => setLongStringVisibleLength,
  setMaxTokenizableStringLength: () => setMaxTokenizableStringLength
});
import * as Common2 from "../../core/common/common.js";
import * as Host from "../../core/host/host.js";
import * as i18n3 from "../../core/i18n/i18n.js";
import * as Platform2 from "../../core/platform/platform.js";
import * as SDK3 from "../../core/sdk/sdk.js";
import * as TextUtils3 from "../../core/text_utils/text_utils.js";
import * as AiAssistanceModel from "../../models/ai_assistance/ai_assistance.js";
import * as Bindings2 from "../../models/bindings/bindings.js";
import * as Logs from "../../models/logs/logs.js";
import * as Workspace from "../../models/workspace/workspace.js";
import * as CodeHighlighter from "../../ui/components/code_highlighter/code_highlighter.js";
import * as Highlighting from "../../ui/components/highlighting/highlighting.js";
import * as IssueCounter from "../../ui/components/issue_counter/issue_counter.js";
import * as RequestLinkIcon from "../../ui/components/request_link_icon/request_link_icon.js";
import { createIcon, Icon } from "../../ui/kit/kit.js";
import * as DataGrid from "../../ui/legacy/components/data_grid/data_grid.js";
import * as ObjectUI2 from "../../ui/legacy/components/object_ui/object_ui.js";

// gen/front_end/ui/legacy/components/object_ui/objectValue.css.js
var objectValue_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.value.object-value-node:hover {
  background-color: var(--sys-color-state-hover-on-subtle);
}

.object-value-function-prefix,
.object-value-boolean {
  color: var(--sys-color-token-attribute-value);
}

.object-value-function {
  font-style: italic;
}

.object-value-function.linkified:hover {
  --override-linkified-hover-background: rgb(0 0 0 / 10%);

  background-color: var(--override-linkified-hover-background);
  cursor: pointer;
}

.theme-with-dark-background .object-value-function.linkified:hover,
:host-context(.theme-with-dark-background) .object-value-function.linkified:hover {
  --override-linkified-hover-background: rgb(230 230 230 / 10%);
}

.object-value-number {
  color: var(--sys-color-token-attribute-value);
}

.object-value-bigint {
  color: var(--sys-color-token-comment);
}

.object-value-string,
.object-value-regexp,
.object-value-symbol {
  white-space: pre;
  unicode-bidi: isolate;
  color: var(--sys-color-token-property-special);
}

.object-value-node {
  position: relative;
  vertical-align: baseline;
  color: var(--sys-color-token-variable);
  white-space: nowrap;
}

.object-value-null,
.object-value-undefined {
  color: var(--sys-color-state-disabled);
}

.object-value-unavailable {
  color: var(--sys-color-token-tag);
}

.object-value-calculate-value-button:hover {
  text-decoration: underline;
}

.object-properties-section-custom-section {
  display: inline-flex;
  flex-direction: column;
}

.theme-with-dark-background .object-value-number,
:host-context(.theme-with-dark-background) .object-value-number,
.theme-with-dark-background .object-value-boolean,
:host-context(.theme-with-dark-background) .object-value-boolean {
  --override-primitive-dark-mode-color: hsl(252deg 100% 75%);

  color: var(--override-primitive-dark-mode-color);
}

.object-properties-section .object-description {
  color: var(--sys-color-token-subtle);
}

.value .object-properties-preview {
  white-space: nowrap;
}

.name {
  color: var(--sys-color-token-tag);
  flex-shrink: 0;
  unicode-bidi: isolate;
}

.object-properties-preview .name {
  color: var(--sys-color-token-subtle);
}

@media (forced-colors: active) {
  .object-value-calculate-value-button:hover {
    forced-color-adjust: none;
    color: Highlight;
  }
}

/*# sourceURL=${import.meta.resolve("./objectValue.css")} */`;

// ../../front_end/panels/console/ConsoleViewMessage.ts
import * as Components2 from "../../ui/legacy/components/utils/utils.js";
import * as UI3 from "../../ui/legacy/legacy.js";
import { html as html3, nothing as nothing3, render as render3 } from "../../ui/lit/lit.js";
import * as Settings2 from "../../ui/settings/settings.js";
import * as VisualLogging from "../../ui/visual_logging/visual_logging.js";
import * as Elements from "../elements/elements.js";

// gen/front_end/panels/console/consoleView.css.js
var consoleView_css_default = `/* Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 *
 * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2009 Anthony Ricaud <rik@webkit.org>
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

.console-view {
  background-color: var(--sys-color-cdt-base-container);
  overflow: hidden;

  --override-error-text-color: var(--sys-color-on-error-container);
  --message-corner-rounder-background: var(--sys-color-cdt-base-container);
}

.console-toolbar-container {
  display: flex;
  flex: none;
}

.console-main-toolbar {
  flex: 1 1 auto;
}

.console-sidebar-levels-info {
  margin-left: var(--sys-size-3);
  width: var(--sys-size-8);
  height: var(--sys-size-8);
}

#console-issues-counter {
  margin-top: 0;
}

.console-toolbar-container > devtools-toolbar {
  background-color: var(--sys-color-cdt-base-container);
  border-bottom: var(--sys-size-1) solid var(--sys-color-divider);
}

.console-view-fix-select-all {
  height: 0;
  overflow: hidden;
}

.console-settings-pane {
  display: grid;
  grid-template-columns: 50% 50%;
  flex: none;
  background-color: var(--sys-color-cdt-base-container);
  border-bottom: var(--sys-size-1) solid var(--sys-color-divider);
}

#console-messages {
  flex: 1 1;
  overflow-y: auto;
  overflow-wrap: break-word;
  user-select: text;
  transform: translateZ(0);
  overflow-anchor: none;  /* Chrome-specific scroll-anchoring opt-out */
  background-color: var(--sys-color-cdt-base-container);
}

#console-prompt {
  clear: right;
  position: relative;
  margin: 0 var(--sys-size-10) 0 var(--sys-size-9);
}

.console-prompt-editor-container {
  min-height: 21px;
  padding-left: var(--sys-size-2);
  padding-top: var(--sys-size-1);
}

.console-message,
.console-user-command {
  clear: right;
  position: relative;
  padding: var(--sys-size-1) var(--sys-size-10) var(--sys-size-1) 0;
  margin-left: var(--sys-size-11);
  min-height: 18px;
  flex: auto;
  display: flex;
  align-items: flex-end;
}

.console-message > * {
  flex: auto;
}

.console-timestamp {
  color: var(--sys-color-token-subtle);
  user-select: none;
  flex: none;
  margin-right: 5px;
}

.message-level-icon,
.command-result-icon {
  position: absolute;
  left: -17px;
  top: var(--sys-size-2);
  user-select: none;
}

.console-message-repeat-count {
  margin: 1.4px 0 0 10px;
  flex: none;
}

.repeated-message {
  margin-left: var(--sys-size-3);
}

.repeated-message .message-level-icon {
  display: none;
}

.console-message-stack-trace-toggle {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  margin-top: calc(-1 * var(--sys-size-1));
}

.console-error-level .repeated-message,
.console-warning-level .repeated-message,
.console-verbose-level .repeated-message,
.console-info-level .repeated-message {
  display: flex;
}

.console-info {
  color: var(--sys-color-token-subtle);
  font-style: italic;
  padding-bottom: var(--sys-size-2);
}

.console-group .console-group > .console-group-messages {
  margin-left: var(--sys-size-8);
}

.console-group-title.console-from-api {
  font-weight: bold;
}

.console-group-title .console-message {
  margin-left: var(--sys-size-6);
}

.expand-group-icon {
  user-select: none;
  flex: none;
  position: relative;
  left: var(--sys-size-5);
  top: 3px;
  margin-right: var(--sys-size-2);
}

.console-group-title .message-level-icon {
  display: none;
}

.console-message-repeat-count .expand-group-icon {
  position: static;
  color: var(--sys-color-cdt-base-container);
  margin-left: calc(-1 * var(--sys-size-1));
}

.console-group {
  position: relative;
}

.console-message-wrapper {
  display: flex;
  flex-direction: column;
  margin: var(--sys-size-3);
  border-radius: 5px;

  /* Console ANSI color */
  --console-color-black: #000;
  --console-color-red: #a00;
  --console-color-green: #0a0;
  --console-color-yellow: #a50;
  --console-color-blue: #00a;
  --console-color-magenta: #a0a;
  --console-color-cyan: #0aa;
  --console-color-gray: #aaa;
  --console-color-darkgray: #555;
  --console-color-lightred: #f55;
  --console-color-lightgreen: #5f5;
  --console-color-lightyellow: #ff5;
  --console-color-lightblue: #55f;
  --console-color-ightmagenta: #f5f;
  --console-color-lightcyan: #5ff;
  --console-color-white: #fff;

  &:focus {
    background-image: linear-gradient(to bottom, var(--sys-color-state-focus-highlight), var(--sys-color-state-focus-highlight));
  }
}

.console-row-wrapper {
  display: flex;
  flex-direction: row;
}

.theme-with-dark-background .console-message-wrapper {
  /* Dark theme console ANSI color */
  --console-color-red: rgb(237 78 76);
  --console-color-green: rgb(1 200 1);
  --console-color-yellow: rgb(210 192 87);
  --console-color-blue: rgb(39 116 240);
  --console-color-magenta: rgb(161 66 244);
  --console-color-cyan: rgb(18 181 203);
  --console-color-gray: rgb(207 208 208);
  --console-color-darkgray: rgb(137 137 137);
  --console-color-lightred: rgb(242 139 130);
  --console-color-lightgreen: rgb(161 247 181);
  --console-color-lightyellow: rgb(221 251 85);
  --console-color-lightblue: rgb(102 157 246);
  --console-color-lightmagenta: rgb(214 112 214);
  --console-color-lightcyan: rgb(132 240 255);
}

.console-message-wrapper.console-warning-level + .console-message-wrapper,
.console-message-wrapper.console-error-level + .console-message-wrapper {
  & .console-message::before,
  & .console-user-command::before {
    display: none !important; /* stylelint-disable-line declaration-no-important */
  }
}

.console-message-wrapper:not(.console-error-level, .console-warning-level) {
  & .console-message::before,
  & .console-user-command::before {
    width: calc(100% - 25px);
    content: "";
    display: block;
    position: absolute;
    top: calc(-1 * var(--sys-size-2));
    border-top: var(--sys-size-1) solid var(--sys-color-divider);
  }

  &:first-of-type .console-message::before,
  &:first-of-type .console-user-command::before {
    display: none;
  }
}

.console-message-wrapper.console-adjacent-user-command-result:not(.console-error-level, .console-warning-level) {
  border-top-width: 0;
}

.console-message-wrapper:focus + .console-message-wrapper {
  border-top-color: transparent;
}

.console-message-wrapper.console-adjacent-user-command-result:not(.console-error-level, .console-warning-level):focus {
  border-top-width: var(--sys-size-1);
}

.console-message-wrapper.console-adjacent-user-command-result:not(.console-error-level, .console-warning-level):focus .console-message {
  padding-top: var(--sys-size-2);
  min-height: var(--sys-size-8);
}

.console-message-wrapper.console-adjacent-user-command-result:not(.console-error-level, .console-warning-level):focus .command-result-icon {
  top: 3px;
}

.console-message-wrapper .nesting-level-marker {
  width: var(--sys-size-7);
  flex: 0 0 auto;
  position: relative;
  margin-bottom: calc(-1 * var(--sys-size-1));
  margin-top: calc(-1 * var(--sys-size-1));
  background-color: var(--sys-color-cdt-base-container);
}

.console-message-wrapper .nesting-level-marker + .console-message::after {
  position: absolute;
  left: -30px;
  top: 0;
  width: var(--sys-size-4);
  height: 100%;
  box-sizing: border-box;
  background-color: var(--sys-color-surface-yellow);
  border-top-left-radius: 5px;
  border-bottom-left-radius: 5px;
  content: "";
}

.console-error-level {
  background-color: var(--sys-color-surface-error);

  --message-corner-rounder-background: var(--sys-color-surface-error);
}

.console-warning-level {
  background-color: var(--sys-color-surface-yellow);

  --message-corner-rounder-background: var(--sys-color-surface-yellow);
}

.console-view-object-properties-section {
  padding: 0;
  position: relative;
  color: inherit;
  display: inline-block;
  overflow-wrap: break-word;
  max-width: 100%;
  margin-top: -1.5px;
}

/* Console content is rendered in "Noto Sans Mono" on Linux, which has a
 * different actual line-height than the fonts used on Windows or MacOS.
 * "vertical-align: middle" breaks the layout when expanding an object such
 * that it spans multiple lines. We therefore align to the top, and use a
 * different "margin-top" on Linux to compensate for the line-height difference.
 */
.platform-linux .console-view-object-properties-section {
  margin-top: 0;
}

.info-note {
  background-color: var(--sys-color-tonal-container);
}

.info-note::before {
  content: "i";
}

.console-view-object-properties-section:not(.expanded) .info-note,
.object-properties-section-root-element:not(.expanded) .info-note {
  display: none;
}

.console-system-type.console-info-level {
  color: var(--sys-color-primary);
}

#console-messages .link {
  cursor: pointer;
  text-decoration: underline;
}

#console-messages .link,
#console-messages .devtools-link:not(.invalid-link) {
  color: var(--sys-color-primary);
  word-break: break-all;
}

#console-messages .devtools-link:focus-visible {
  background-color: transparent;
}

#console-messages .resource-links {
  margin-top: calc(-1 * var(--sys-size-1));
  margin-bottom: calc(-1 * var(--sys-size-2));
}

.console-object-preview,
.console-object-preview + .info-note {
  white-space: normal;
  overflow-wrap: break-word;
  font-style: italic;
}

.console-object-preview .name {
  flex-shrink: 0;
}

.console-message-text {
  .object-value-node {
    display: inline-block;
  }

  .object-value-string,
  .object-value-regexp,
  .object-value-symbol {
    white-space: pre-wrap;
    word-break: break-all;
  }

  .formatted-stack-frame {
    display: var(--display-formatted-stack-frame-default);

    &:has(.ignore-list-link) {
      display: var(--display-ignored-formatted-stack-frame);
      opacity: 60%;

      /* Subsequent builtin stack frames are also treated as ignored */
      & + .formatted-builtin-stack-frame {
        display: var(--display-ignored-formatted-stack-frame);
        opacity: 60%;
      }
    }
  }
}

.console-message-stack-trace-wrapper {
  --override-display-stack-preview-toggle-link: none;
  --display-formatted-stack-frame-default: block;

  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;

  &:has(div > .stack-preview-container.show-hidden-rows) {
    --display-ignored-formatted-stack-frame: var(--display-formatted-stack-frame-default);
  }

  &:has(.formatted-stack-frame .ignore-list-link):has(.formatted-stack-frame .devtools-link:not(.ignore-list-link)),
  &:has(.formatted-stack-frame .ignore-list-link):has(.stack-preview-container.has-non-ignored-links) {
    /* If there are ignored frames and unignored frames, then we want
    to enable the show more/less links. To do that we override some
    variables to always display the structured stack trace, but possibly
    only the links at the bottom of it, as we share its show more/less links.
    We also check the structured stack trace (StackTracePreviewContent) for
    non-ignored links, so that when all inline Error frames are ignored but
    the console.error() call stack has non-ignored frames (e.g. in async
    traces), the toggle is still shown. See crbug.com/379788109. */
    --override-display-stack-preview-toggle-link: table-row;
    --override-display-stack-preview-hidden-div: block;

    &:not(:has(div > .stack-preview-container.show-hidden-rows)) {
      --display-ignored-formatted-stack-frame: none;
    }
  }

  & > .hidden-stack-trace {
    /* Always hide the body of the structured stack trace if this class
    is set, but we may still show it for the Show more/less links at the bottom. */
    display: var(--override-display-stack-preview-hidden-div, none);

    --override-display-stack-preview-tbody: none;
  }
}

.repeated-message .console-message-stack-trace-toggle,
.repeated-message > .console-message-text {
  flex: 1;
}

.console-warning-level .console-message-text {
  color: var(--sys-color-on-surface-yellow);
}

.console-error-level .console-message-text,
.console-error-level .console-view-object-properties-section {
  color: var(--override-error-text-color) !important; /* stylelint-disable-line declaration-no-important */
}

.console-message-formatted-table {
  clear: both;
}

.console-message .source-code {
  line-height: 1.2;
}

.console-message-anchor {
  float: right;
  text-align: right;
  max-width: 100%;
  margin-left: var(--sys-size-3);
}

.console-message-nowrap-below,
.console-message-nowrap-below div,
.console-message-nowrap-below span {
  white-space: nowrap !important; /* stylelint-disable-line declaration-no-important */
}

.object-state-note {
  display: inline-block;
  width: 11px;
  height: 11px;
  color: var(--sys-color-on-tonal-container);
  text-align: center;
  border-radius: 3px;
  line-height: 13px;
  margin: 0 var(--sys-size-4);
  font-size: 9px;
}

.console-object {
  white-space: pre-wrap;
  word-break: break-all;
}

.console-message-stack-trace-wrapper > * {
  flex: none;
}

.console-message-expand-icon {
  margin-bottom: calc(-1 * var(--sys-size-3));
}

.console-searchable-view {
  max-height: 100%;
}

.console-view-pinpane {
  max-height: 50%;
}

/* We are setting width and height to 0px to essentially hide the html element on the UI but visible to the screen reader.
 This html element is used by screen readers when console messages are filtered, instead of screen readers reading
 contents of the filtered messages we only want the screen readers to read the count of filtered messages. */
.message-count {
  width: 0;
  height: 0;
}

.devtools-console-insight {
  margin: 9px var(--sys-size-10) 11px var(--sys-size-11);
}

.hover-button {
  --width: var(--sys-size-11);

  align-items: center;
  border-radius: 50%;
  border: none;
  /* todo: extract to global styles and make it work with dark mode. */
  box-shadow: 0 1px 3px 1px rgb(0 0 0 / 15%), 0 1px 2px 0 rgb(0 0 0 / 30%); /* stylelint-disable-line plugin/use_theme_colors */
  box-sizing: border-box;
  background-color: var(--sys-color-tonal-container);
  color: var(--sys-color-on-tonal-container);
  font: var(--sys-typescale-body4-medium);
  height: var(--width);
  justify-content: center;
  margin: 0;
  max-height: var(--width);
  max-width: var(--width);
  min-height: var(--width);
  min-width: var(--width);
  overflow: hidden;
  padding: var(--sys-size-3) var(--sys-size-4);
  position: absolute;
  right: var(--sys-size-4);
  display: none;
  width: var(--width);
  z-index: 1;

  .theme-with-dark-background & {
    border: var(--sys-size-1) solid var(--sys-color-neutral-outline);
    background-color: var(--sys-color-primary);
    color: var(--sys-color-on-primary);
  }

  & devtools-icon {
    box-sizing: border-box;
    flex-shrink: 0;
    height: var(--sys-size-8);
    min-height: var(--sys-size-8);
    min-width: var(--sys-size-8);
    width: var(--sys-size-8);

    --devtools-icon-color: var(--sys-color-on-tonal-container);
  }

  .theme-with-dark-background & devtools-icon {
    --devtools-icon-color: var(--sys-color-on-primary);
  }
}

.hover-button:focus,
.hover-button:hover {
  border-radius: var(--sys-shape-corner-extra-small);
  max-width: 200px;
  transition:
    max-width var(--sys-motion-duration-short4) var(--sys-motion-easing-emphasized),
    border-radius 50ms linear;
  width: fit-content;
  gap: var(--sys-size-3);
}

.hover-button:focus-visible {
  outline: var(--sys-size-2) solid var(--sys-color-primary);
  outline-offset: var(--sys-size-2);
}

.button-label {
  display: block;
  overflow: hidden;
  white-space: nowrap;

  & div {
    display: inline-block;
    vertical-align: calc(-1 * var(--sys-size-1));

    &::after {
      content: attr(data-text);
    }
  }
}

.console-message-wrapper:not(.has-insight) {
  &:hover,
  &:focus,
  &.console-selected {
    .hover-button {
      display: flex;

      &:focus,
      &:hover {
        display: inline-flex;
      }
    }
  }
}

.ai-code-completion-summary-toolbar-container {
  container-type: inline-size;
}

@media (forced-colors: active) {
  .console-message-expand-icon,
  .console-warning-level .expand-group-icon {
    forced-color-adjust: none;
    color: ButtonText;
  }

  .console-message-wrapper:focus,
  .console-message-wrapper:focus:last-of-type {
    forced-color-adjust: none;
    background-color: Highlight;
    border-top-color: Highlight;
    border-bottom-color: Highlight;
  }

  .console-message-wrapper:focus *,
  .console-message-wrapper:focus:last-of-type *,
  .console-message-wrapper:focus .devtools-link,
  .console-message-wrapper:focus:last-of-type .devtools-link {
    color: HighlightText !important; /* stylelint-disable-line declaration-no-important */
  }

  #console-messages .devtools-link,
  #console-messages .devtools-link:hover {
    color: linktext;
  }

  #console-messages .link:focus-visible,
  #console-messages .devtools-link:focus-visible {
    background: Highlight;
    color: HighlightText;
  }

  .console-message-wrapper:focus devtools-icon {
    color: HighlightText;
  }

  .console-message-wrapper.console-error-level:focus,
  .console-message-wrapper.console-error-level:focus:last-of-type {
    --override-error-text-color: HighlightText;
  }
}

/*# sourceURL=${import.meta.resolve("./consoleView.css")} */`;

// ../../front_end/panels/console/SymbolizedErrorWidget.ts
var SymbolizedErrorWidget_exports = {};
__export(SymbolizedErrorWidget_exports, {
  SymbolizedErrorWidget: () => SymbolizedErrorWidget
});
import * as Bindings from "../../models/bindings/bindings.js";
import * as Components from "../../ui/legacy/components/utils/utils.js";
import * as UI2 from "../../ui/legacy/legacy.js";
import * as Lit2 from "../../ui/lit/lit.js";
var { html: html2, render: render2 } = Lit2;
function renderHeader(content, isCause) {
  if (isCause) {
    return html2`<div class="symbolized-error-header"><span>Caused by: </span><span class="error-message-text">${content}</span></div>`;
  }
  return html2`<span class="error-message-text">${content}</span>`;
}
function formatName(frame) {
  const isInline = frame.isInline;
  let name = isInline ? frame.name || "" : frame.rawName || frame.name || "";
  const shouldAppendMethodAlias = !isInline && frame.methodName && name && name !== frame.methodName && !name.endsWith("." + frame.methodName) && !name.endsWith(" " + frame.methodName);
  if (shouldAppendMethodAlias) {
    name += ` [as ${frame.methodName}]`;
  }
  return name;
}
function renderLinkElement(frame, options) {
  if (frame.url || frame.uiSourceCode) {
    const link = Components.Linkifier.Linkifier.linkifyStackTraceFrame(frame, options);
    link.tabIndex = -1;
    return link;
  }
  return html2`<span>&lt;anonymous&gt;</span>`;
}
function renderEvalOrigin(frame, options) {
  const name = formatName(frame);
  const linkElement = renderLinkElement(frame, options);
  const asyncPrefix = frame.isAsync ? "async " : "";
  const constructorPrefix = frame.isConstructor ? "new " : "";
  if (frame.isEval) {
    const evalOrigin = frame.evalOrigin ? renderEvalOrigin(frame.evalOrigin, options) : "<anonymous>";
    if (name) {
      return html2`${asyncPrefix}${constructorPrefix}eval at ${name} (${evalOrigin})`;
    }
    return html2`${asyncPrefix}${constructorPrefix}eval at ${evalOrigin}`;
  }
  if (name) {
    return html2`${asyncPrefix}${constructorPrefix}eval at ${name} (${linkElement})`;
  }
  return html2`${asyncPrefix}${constructorPrefix}eval at ${linkElement}`;
}
function renderFramePrefix(frame, options) {
  const asyncPrefix = frame.isAsync ? "async " : "";
  if (frame.promiseIndex !== void 0) {
    const name2 = frame.name || "Promise.all";
    return html2`${asyncPrefix}${name2} (index ${frame.promiseIndex})`;
  }
  const constructorPrefix = frame.isConstructor ? "new " : "";
  const name = formatName(frame);
  if (frame.isEval) {
    const evalOrigin = frame.evalOrigin ? renderEvalOrigin(frame.evalOrigin, options) : "<anonymous>";
    if (name) {
      return html2`${asyncPrefix}${constructorPrefix}${name} (${evalOrigin}, `;
    }
    return html2`${asyncPrefix}${constructorPrefix}${evalOrigin}, `;
  }
  if (name) {
    return html2`${asyncPrefix}${constructorPrefix}${name} (`;
  }
  return html2`${asyncPrefix}${constructorPrefix}`;
}
function renderFrameSuffix(frame) {
  if (frame.promiseIndex !== void 0) {
    return Lit2.nothing;
  }
  const name = formatName(frame);
  if (name) {
    return html2`)`;
  }
  return Lit2.nothing;
}
var DEFAULT_VIEW2 = (input, _output, target) => {
  const renderError2 = (error, isCause) => {
    if (error instanceof Bindings.SymbolizedError.UnparsableError) {
      const fragment = ConsoleViewMessage.linkifyWithCustomLinkifier(
        error.errorStack,
        (text, url, lineNumber, columnNumber) => {
          const options = { text, lineNumber, columnNumber, ignoreListManager: input.ignoreListManager };
          const linkElement = Components.Linkifier.Linkifier.linkifyURL(url, options);
          linkElement.tabIndex = -1;
          return linkElement;
        }
      );
      const header2 = renderHeader(fragment, isCause);
      return html2`
        <span class=${isCause ? "console-message-stack-trace-wrapper" : ""}>${header2}</span>
      `;
    }
    const linkOptions = {
      showColumnNumber: true,
      maxLength: UI2.UIUtils.MaxLengthForDisplayedURLsInConsole,
      ignoreListManager: input.ignoreListManager
    };
    let headerContent = html2`${error.message}`;
    if (error.syntaxErrorLocation) {
      const linkElement = Components.Linkifier.Linkifier.linkifyUILocation(error.syntaxErrorLocation, linkOptions);
      linkElement.tabIndex = -1;
      headerContent = html2`${error.message} (at ${linkElement})`;
    }
    const header = renderHeader(headerContent, isCause);
    const syncFrames = error.stackTrace.syncFragment.frames;
    return html2`
      <span class=${isCause ? "console-message-stack-trace-wrapper" : ""}
      >${header}${syncFrames.length > 0 ? "\n" : ""}${syncFrames.map((frame, i) => {
      const isBuiltin = frame.promiseIndex !== void 0 || !frame.url && !frame.uiSourceCode;
      const linkElement = frame.promiseIndex !== void 0 ? Lit2.nothing : renderLinkElement(frame, linkOptions);
      const newline = i < error.stackTrace.syncFragment.frames.length - 1 ? "\n" : "";
      const frameClass = isBuiltin ? "formatted-builtin-stack-frame" : "formatted-stack-frame";
      return html2`
            <span class=${frameClass}>${"    at "}${renderFramePrefix(frame, linkOptions)}${linkElement}${renderFrameSuffix(frame)}${newline}</span>
          `;
    })}
      </span>
      ${error.cause ? renderError2(error.cause, true) : Lit2.nothing}
    `;
  };
  render2(html2`<span class="symbolized-error-widget">${renderError2(input.error, false)}</span>`, target);
};
var SymbolizedErrorWidget = class extends UI2.Widget.Widget {
  #error;
  #view;
  #ignoreListManager;
  constructor(element, view = DEFAULT_VIEW2) {
    const host = element || document.createElement("span");
    super(host, { classes: ["symbolized-error-widget-host"] });
    this.#view = view;
  }
  get linkElements() {
    return [...this.contentElement.querySelectorAll(".devtools-link")];
  }
  set ignoreListManager(ignoreListManager) {
    this.#ignoreListManager = ignoreListManager;
    this.requestUpdate();
  }
  get ignoreListManager() {
    return this.#ignoreListManager;
  }
  set error(error) {
    this.#error?.removeEventListener(Bindings.SymbolizedError.Events.UPDATED, this.requestUpdate, this);
    this.#error = error;
    if (this.isShowing()) {
      this.#error?.addEventListener(Bindings.SymbolizedError.Events.UPDATED, this.requestUpdate, this);
    }
    this.requestUpdate();
  }
  get error() {
    return this.#error;
  }
  wasShown() {
    super.wasShown();
    this.#error?.addEventListener(Bindings.SymbolizedError.Events.UPDATED, this.requestUpdate, this);
    this.requestUpdate();
  }
  willHide() {
    super.willHide();
    this.#error?.removeEventListener(Bindings.SymbolizedError.Events.UPDATED, this.requestUpdate, this);
  }
  performUpdate() {
    if (!this.#error) {
      return;
    }
    const input = {
      error: this.#error,
      ignoreListManager: this.#ignoreListManager
    };
    this.#view(input, {}, this.contentElement);
  }
};

// ../../front_end/panels/console/ConsoleViewMessage.ts
var UIStrings2 = {
  /**
   * @description Message element text content in Console view message of the Console panel. Shown
   * when the user tried to run console.clear() but the 'Keep log' option is enabled, which stops
   * the log from being cleared.
   */
  consoleclearWasPreventedDueTo: "`console.clear()` was prevented due to 'Keep log'",
  /**
   * @description Text shown in the Console panel after the user has cleared the console, which
   * removes all messages from the console so that it is empty.
   */
  consoleWasCleared: "Console was cleared",
  /**
   * @description Message element title in Console view message of the Console panel.
   * @example {Ctrl+L} PH1
   */
  clearAllMessagesWithS: "Clear all messages with {PH1}",
  /**
   * @description Message prefix in Console view message of the Console panel.
   */
  assertionFailed: "Assertion failed: ",
  /**
   * @description Message text in Console view message of the Console panel.
   * @example {console.log(1)} PH1
   */
  violationS: "`[Violation]` {PH1}",
  /**
   * @description Message text in Console view message of the Console panel.
   * @example {console.log(1)} PH1
   */
  interventionS: "`[Intervention]` {PH1}",
  /**
   * @description Message text in Console view message of the Console panel.
   * @example {console.log(1)} PH1
   */
  deprecationS: "`[Deprecation]` {PH1}",
  /**
   * @description Note title in Console view message of the Console panel.
   */
  thisValueWillNotBeCollectedUntil: "This value won\u2019t be collected until console is cleared.",
  /**
   * @description Note title in Console view message of the Console panel.
   */
  thisValueWasEvaluatedUponFirst: "This value was evaluated upon first expanding. It may have changed since then.",
  /**
   * @description Note title in Console view message of the Console panel.
   */
  functionWasResolvedFromBound: "Function was resolved from bound function.",
  /**
   * @description Shown in the Console panel when an exception is thrown when trying to access a
   * property on an object. Should be translated.
   */
  exception: "<exception>",
  /**
   * @description Text to indicate an item is a warning.
   */
  warning: "Warning",
  /**
   * @description Text for errors.
   */
  error: "Error",
  /**
   * @description Accessible label for an icon. The icon is used to mark console messages that
   * originate from a logpoint. Logpoints are special breakpoints that log a user-provided JavaScript
   * expression to the DevTools Console.
   */
  logpoint: "Logpoint",
  /**
   * @description Accessible label for an icon. The icon is used to mark console messages that
   * originate from conditional breakpoints.
   */
  cndBreakpoint: "Conditional breakpoint",
  /**
   * @description Announced by the screen reader to indicate how many times a particular message in
   * the console was repeated.
   */
  repeatS: "{n, plural, =1 {Repeated # time} other {Repeated # times}}",
  /**
   * @description Announced by the screen reader to indicate how many times a particular warning
   * message in the console was repeated.
   */
  warningS: "{n, plural, =1 {Warning, Repeated # time} other {Warning, Repeated # times}}",
  /**
   * @description Announced by the screen reader to indicate how many times a particular error
   * message in the console was repeated.
   */
  errorS: "{n, plural, =1 {Error, Repeated # time} other {Error, Repeated # times}}",
  /**
   * @description Text appended to grouped console messages that are related to URL requests.
   */
  url: "<URL>",
  /**
   * @description Text appended to grouped console messages about tasks that took longer than N ms.
   */
  tookNms: "took <N>ms",
  /**
   * @description Text appended to grouped console messages about tasks that are related to some DOM event.
   */
  someEvent: "<some> event",
  /**
   * @description Text appended to grouped console messages about tasks that are related to a particular milestone.
   */
  Mxx: " M<XX>",
  /**
   * @description Text appended to grouped console messages about tasks that are related to autofill completions.
   */
  attribute: "<attribute>",
  /**
   * @description Text for the index of something.
   */
  index: "(index)",
  /**
   * @description Text for the value of something.
   */
  value: "Value",
  /**
   * @description Title of the Console tool.
   */
  console: "Console",
  /**
   * @description Message to indicate a console message with a stack table is expanded.
   */
  stackMessageExpanded: "Stack table expanded",
  /**
   * @description Message to indicate a console message with a stack table is collapsed.
   */
  stackMessageCollapsed: "Stack table collapsed",
  /**
   * @description Message to offer insights for a console error message.
   */
  explainThisError: "Understand this error",
  /**
   * @description Message to offer insights for a console warning message.
   */
  explainThisWarning: "Understand this warning",
  /**
   * @description Message to offer insights for a console message.
   */
  explainThisMessage: "Understand this message",
  /**
   * @description Message to offer insights for a console error message.
   */
  explainThisErrorWithAI: "Understand this error",
  /**
   * @description Message to offer insights for a console warning message.
   */
  explainThisWarningWithAI: "Understand this warning",
  /**
   * @description Message to offer insights for a console message.
   */
  explainThisMessageWithAI: "Understand this message",
  /**
   * @description Element text content in Object properties section.
   */
  dots: "(...)",
  /**
   * @description Element title in Object properties section.
   */
  invokePropertyGetter: "Invoke property getter",
  /**
   * @description Context menu item to copy table data.
   */
  copyTableAs: "Copy table as",
  /**
   * @description Submenu item to copy table as Markdown.
   */
  copyAsMarkdown: "Copy as Markdown",
  /**
   * @description Submenu item to copy table as CSV.
   */
  copyAsCsv: "Copy as CSV",
  /**
   * @description Text to expand something recursively
   */
  expandRecursively: "Expand recursively",
  /**
   * @description Text to collapse children of a parent group
   */
  collapseChildren: "Collapse children"
};
var str_2 = i18n3.i18n.registerUIStrings("panels/console/ConsoleViewMessage.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var elementToMessage = /* @__PURE__ */ new WeakMap();
var getMessageForElement = (element) => {
  return elementToMessage.get(element);
};
var defaultConsoleRowHeight = 18;
var parameterToRemoteObject = (runtimeModel) => (parameter) => {
  if (parameter instanceof SDK3.RemoteObject.RemoteObject) {
    return parameter;
  }
  if (!runtimeModel) {
    return SDK3.RemoteObject.RemoteObject.fromLocalObject(parameter);
  }
  if (typeof parameter === "object") {
    return runtimeModel.createRemoteObject(parameter);
  }
  return runtimeModel.createRemoteObjectFromPrimitiveValue(parameter);
};
var EXPLAIN_HOVER_ACTION_ID = "explain.console-message.hover";
var EXPLAIN_CONTEXT_ERROR_ACTION_ID = "explain.console-message.context.error";
var EXPLAIN_CONTEXT_WARNING_ACTION_ID = "explain.console-message.context.warning";
var EXPLAIN_CONTEXT_OTHER_ACTION_ID = "explain.console-message.context.other";
var hoverButtonObserver = new IntersectionObserver((results) => {
  for (const result of results) {
    if (result.intersectionRatio > 0) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightHoverButtonShown);
    }
  }
});
function appendOrShow(parent, child) {
  if (child instanceof UI3.Widget.Widget) {
    child.show(
      parent,
      null,
      /* suppressOprhanWidgetError=*/
      true
    );
  } else {
    parent.appendChild(child);
  }
}
var ConsoleViewMessage = class _ConsoleViewMessage {
  message;
  linkifier;
  repeatCountInternal;
  closeGroupDecorationCount;
  consoleGroupInternal;
  selectableChildren;
  messageResized;
  // The wrapper that contains consoleRowWrapper and other elements in a column.
  elementInternal;
  // The element that wraps console message elements in a row.
  consoleRowWrapper = null;
  previewFormatter;
  searchRegexInternal;
  messageIcon;
  traceExpanded;
  expandTrace;
  hasStackTrace;
  anchorElement;
  contentElementInternal;
  nestingLevelMarkers;
  searchHighlightNodes;
  searchHighlightNodeChanges;
  isVisibleInternal;
  cachedHeight;
  messagePrefix;
  timestampElement;
  inSimilarGroup;
  similarGroupMarker;
  lastInSimilarGroup;
  groupKeyInternal;
  repeatCountElement;
  requestResolver;
  issueResolver;
  #adjacentUserCommandResult = false;
  #teaser = void 0;
  /** Formatting Error#stack is asynchronous. Allow tests to wait for the result */
  #formatErrorStackPromiseForTest = Promise.resolve();
  constructor(consoleMessage, linkifier, requestResolver, issueResolver, onResize) {
    this.message = consoleMessage;
    this.linkifier = linkifier;
    this.requestResolver = requestResolver;
    this.issueResolver = issueResolver;
    this.repeatCountInternal = 1;
    this.closeGroupDecorationCount = 0;
    this.selectableChildren = [];
    this.messageResized = onResize;
    this.elementInternal = null;
    this.previewFormatter = new ObjectUI2.RemoteObjectPreviewFormatter.RemoteObjectPreviewFormatter();
    this.searchRegexInternal = null;
    this.messageIcon = null;
    this.traceExpanded = false;
    this.expandTrace = null;
    this.hasStackTrace = false;
    this.anchorElement = null;
    this.contentElementInternal = null;
    this.nestingLevelMarkers = null;
    this.searchHighlightNodes = [];
    this.searchHighlightNodeChanges = [];
    this.isVisibleInternal = false;
    this.cachedHeight = 0;
    this.messagePrefix = "";
    this.timestampElement = null;
    this.inSimilarGroup = false;
    this.similarGroupMarker = null;
    this.lastInSimilarGroup = false;
    this.groupKeyInternal = "";
    this.repeatCountElement = null;
    this.consoleGroupInternal = null;
  }
  setInsight(insight) {
    if (this.elementInternal) {
      render3(insight, this.elementInternal);
      this.elementInternal.classList.toggle("has-insight", true);
      this.elementInternal.addEventListener("closeinsight", () => {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightClosed);
        if (this.elementInternal) {
          this.elementInternal.classList.toggle("has-insight", false);
          render3(nothing3, this.elementInternal);
        }
        this.#teaser?.setInactive(false);
      }, { once: true });
      this.#teaser?.setInactive(true);
    }
  }
  element() {
    return this.toMessageElement();
  }
  wasShown() {
    this.isVisibleInternal = true;
  }
  onResize() {
  }
  willHide() {
    this.isVisibleInternal = false;
    this.cachedHeight = this.element().offsetHeight;
  }
  isVisible() {
    return this.isVisibleInternal;
  }
  fastHeight() {
    if (this.cachedHeight) {
      return this.cachedHeight;
    }
    return this.approximateFastHeight();
  }
  approximateFastHeight() {
    return defaultConsoleRowHeight;
  }
  consoleMessage() {
    return this.message;
  }
  formatErrorStackPromiseForTest() {
    return this.#formatErrorStackPromiseForTest;
  }
  buildMessage() {
    let messageElement;
    let messageText = this.message.messageText;
    if (this.message.source === Common2.Console.FrontendMessageSource.ConsoleAPI) {
      switch (this.message.type) {
        case Runtime.ConsoleAPICalledEventType.Trace:
          messageElement = this.format(this.message.parameters || ["console.trace"]);
          break;
        case Runtime.ConsoleAPICalledEventType.Clear:
          messageElement = document.createElement("span");
          messageElement.classList.add("console-info");
          if (Common2.Settings.Settings.instance().resolve(SDK3.SDKSettings.preserveConsoleLogSettingDescriptor).get()) {
            messageElement.textContent = i18nString2(UIStrings2.consoleclearWasPreventedDueTo);
          } else {
            messageElement.textContent = i18nString2(UIStrings2.consoleWasCleared);
          }
          UI3.Tooltip.Tooltip.install(
            messageElement,
            i18nString2(UIStrings2.clearAllMessagesWithS, {
              PH1: String(UI3.ShortcutRegistry.ShortcutRegistry.instance().shortcutTitleForAction("console.clear"))
            })
          );
          break;
        case Runtime.ConsoleAPICalledEventType.Dir: {
          const obj = this.message.parameters ? this.message.parameters[0] : void 0;
          const args = ["%O", obj];
          messageElement = this.format(args);
          break;
        }
        case Runtime.ConsoleAPICalledEventType.Profile:
        case Runtime.ConsoleAPICalledEventType.ProfileEnd:
          messageElement = this.format([messageText]);
          break;
        default: {
          if (this.message.type === Runtime.ConsoleAPICalledEventType.Assert) {
            this.messagePrefix = i18nString2(UIStrings2.assertionFailed);
          }
          if (this.message.parameters?.length === 1) {
            const parameter = this.message.parameters[0];
            if (typeof parameter !== "string" && parameter.type === "string") {
              const value = parameter.value;
              const runtimeModel = this.message.runtimeModel();
              if (runtimeModel && Bindings2.SymbolizedError.isErrorLike(value)) {
                const remoteObj = parameter instanceof SDK3.RemoteObject.RemoteObject ? parameter : runtimeModel.createRemoteObject(parameter);
                messageElement = this.renderSymbolizedError(remoteObj);
              }
            }
          }
          const args = this.message.parameters || [messageText];
          messageElement = messageElement || this.format(args);
        }
      }
    } else if (this.message.source === Log.LogEntrySource.Network) {
      messageElement = this.formatAsNetworkRequest() || this.format([messageText]);
    } else {
      const messageInParameters = this.message.parameters && messageText === this.message.parameters[0];
      if (this.message.source === Log.LogEntrySource.Violation) {
        messageText = i18nString2(UIStrings2.violationS, { PH1: messageText });
      } else if (this.message.source === Log.LogEntrySource.Intervention) {
        messageText = i18nString2(UIStrings2.interventionS, { PH1: messageText });
      } else if (this.message.source === Log.LogEntrySource.Deprecation) {
        messageText = i18nString2(UIStrings2.deprecationS, { PH1: messageText });
      }
      const args = this.message.parameters || [messageText];
      if (messageInParameters) {
        args[0] = messageText;
      }
      messageElement = this.format(args);
    }
    messageElement.classList.add("console-message-text");
    const formattedMessage = document.createElement("span");
    formattedMessage.classList.add("source-code");
    this.anchorElement = this.buildMessageAnchor();
    if (this.anchorElement) {
      formattedMessage.appendChild(this.anchorElement);
    }
    formattedMessage.appendChild(messageElement);
    return formattedMessage;
  }
  formatAsNetworkRequest() {
    const request = Logs.NetworkLog.NetworkLog.requestForConsoleMessage(this.message);
    if (!request) {
      return null;
    }
    const messageElement = document.createElement("span");
    if (this.message.level === Log.LogEntryLevel.Error) {
      UI3.UIUtils.createTextChild(messageElement, request.requestMethod + " ");
      const linkElement = Components2.Linkifier.Linkifier.linkifyRevealable(
        request,
        request.url(),
        request.url(),
        void 0,
        void 0,
        "network-request"
      );
      linkElement.tabIndex = -1;
      this.selectableChildren.push({ element: linkElement, forceSelect: () => linkElement.focus() });
      messageElement.appendChild(linkElement);
      if (request.failed) {
        UI3.UIUtils.createTextChildren(messageElement, " ", request.localizedFailDescription || "");
      }
      if (request.statusCode !== 0) {
        UI3.UIUtils.createTextChildren(messageElement, " ", String(request.statusCode));
      }
      const statusText = request.getInferredStatusText();
      if (statusText) {
        UI3.UIUtils.createTextChildren(messageElement, " (", statusText, ")");
      }
    } else {
      const messageText = this.message.messageText;
      const fragment = _ConsoleViewMessage.linkifyWithCustomLinkifier(messageText, (text, url, lineNumber, columnNumber) => {
        const linkElement = url === request.url() ? Components2.Linkifier.Linkifier.linkifyRevealable(
          request,
          url,
          request.url(),
          void 0,
          void 0,
          "network-request"
        ) : Components2.Linkifier.Linkifier.linkifyURL(
          url,
          { text, lineNumber, columnNumber }
        );
        linkElement.tabIndex = -1;
        this.selectableChildren.push({ element: linkElement, forceSelect: () => linkElement.focus() });
        return linkElement;
      });
      appendOrShow(messageElement, fragment);
    }
    return messageElement;
  }
  createAffectedResourceLinks() {
    const elements = [];
    const requestId = this.message.getAffectedResources()?.requestId;
    if (requestId) {
      const icon = new RequestLinkIcon.RequestLinkIcon.RequestLinkIcon();
      icon.classList.add("resource-links");
      icon.data = {
        affectedRequest: { requestId },
        requestResolver: this.requestResolver,
        displayURL: false
      };
      elements.push(icon);
    }
    const issueId = this.message.getAffectedResources()?.issueId;
    if (issueId) {
      const icon = new IssueCounter.IssueLinkIcon.IssueLinkIcon();
      icon.classList.add("resource-links");
      icon.data = { issueId, issueResolver: this.issueResolver };
      elements.push(icon);
    }
    return elements;
  }
  #getLinkifierMetric() {
    const request = Logs.NetworkLog.NetworkLog.requestForConsoleMessage(this.message);
    if (request?.resourceType().isStyleSheet()) {
      return Host.UserMetrics.Action.StyleSheetInitiatorLinkClicked;
    }
    return void 0;
  }
  buildMessageAnchor() {
    const runtimeModel = this.message.runtimeModel();
    if (!runtimeModel) {
      return null;
    }
    const linkify = ({ stackFrameWithBreakpoint, scriptId, stackTrace, url, line, column }) => {
      const userMetric = this.#getLinkifierMetric();
      if (stackFrameWithBreakpoint) {
        return this.linkifier.maybeLinkifyConsoleCallFrame(runtimeModel.target(), stackFrameWithBreakpoint, {
          revealBreakpoint: true,
          userMetric
        });
      }
      if (scriptId) {
        return this.linkifier.linkifyScriptLocation(
          runtimeModel.target(),
          scriptId,
          url || Platform2.DevToolsPath.EmptyUrlString,
          line,
          { columnNumber: column, userMetric }
        );
      }
      if (stackTrace?.callFrames.length) {
        return this.linkifier.linkifyStackTraceTopFrame(runtimeModel.target(), stackTrace);
      }
      if (url && url !== "undefined") {
        return this.linkifier.linkifyScriptLocation(
          runtimeModel.target(),
          /* scriptId */
          null,
          url,
          line,
          { columnNumber: column, userMetric }
        );
      }
      return null;
    };
    const anchorElement = linkify(this.message);
    if (anchorElement) {
      anchorElement.tabIndex = -1;
      this.selectableChildren.push({
        element: anchorElement,
        forceSelect: () => anchorElement.focus()
      });
      const anchorWrapperElement = document.createElement("span");
      anchorWrapperElement.classList.add("console-message-anchor");
      anchorWrapperElement.appendChild(anchorElement);
      for (const element of this.createAffectedResourceLinks()) {
        UI3.UIUtils.createTextChild(anchorWrapperElement, " ");
        anchorWrapperElement.append(element);
      }
      UI3.UIUtils.createTextChild(anchorWrapperElement, " ");
      return anchorWrapperElement;
    }
    const affectedResourceElements = this.createAffectedResourceLinks();
    if (affectedResourceElements.length) {
      const anchorWrapperElement = document.createElement("span");
      anchorWrapperElement.classList.add("console-message-anchor");
      for (const element of affectedResourceElements) {
        anchorWrapperElement.append(element);
      }
      UI3.UIUtils.createTextChild(anchorWrapperElement, " ");
      return anchorWrapperElement;
    }
    return null;
  }
  buildMessageWithStackTrace(runtimeModel) {
    const icon = createIcon("triangle-right", "console-message-expand-icon");
    const { stackTraceElement, contentElement, messageElement, clickableElement, toggleElement } = this.buildMessageHelper(runtimeModel.target(), this.message.stackTrace, icon);
    const DEBOUNCE_MS = 300;
    let debounce;
    this.expandTrace = (expand) => {
      if (expand) {
        debounce = window.setTimeout(() => {
          Host.userMetrics.actionTaken(Host.UserMetrics.Action.TraceExpanded);
        }, DEBOUNCE_MS);
      } else {
        clearTimeout(debounce);
      }
      icon.name = expand ? "triangle-down" : "triangle-right";
      stackTraceElement.classList.toggle("hidden-stack-trace", !expand);
      const stackTableState = expand ? i18nString2(UIStrings2.stackMessageExpanded) : i18nString2(UIStrings2.stackMessageCollapsed);
      UI3.ARIAUtils.setLabel(contentElement, `${messageElement.textContent} ${stackTableState}`);
      UI3.ARIAUtils.LiveAnnouncer.alert(stackTableState);
      UI3.ARIAUtils.setExpanded(clickableElement, expand);
      this.traceExpanded = expand;
    };
    const toggleStackTrace = (event) => {
      if (UI3.UIUtils.isEditing() || contentElement.hasSelection()) {
        return;
      }
      this.expandTrace?.(stackTraceElement.classList.contains("hidden-stack-trace"));
      event.consume();
    };
    clickableElement.addEventListener("click", toggleStackTrace, false);
    if (this.message.type === Runtime.ConsoleAPICalledEventType.Trace && Common2.Settings.Settings.instance().resolve(Settings2.ConsoleSettings.consoleTraceExpandSettingDescriptor).get()) {
      this.expandTrace(true);
    }
    this.hasStackTrace = true;
    toggleElement._expandStackTraceForTest = this.expandTrace.bind(this, true);
    return toggleElement;
  }
  buildMessageWithIgnoreLinks() {
    const { toggleElement } = this.buildMessageHelper(null, void 0, null);
    return toggleElement;
  }
  buildMessageHelper(target, stackTrace, icon) {
    const toggleElement = document.createElement("div");
    toggleElement.classList.add("console-message-stack-trace-toggle");
    const contentElement = toggleElement.createChild("div", "console-message-stack-trace-wrapper");
    const messageElement = this.buildMessage();
    const clickableElement = contentElement.createChild("div");
    UI3.ARIAUtils.setExpanded(clickableElement, false);
    if (icon) {
      clickableElement.appendChild(icon);
    }
    if (stackTrace) {
      clickableElement.tabIndex = -1;
    }
    clickableElement.appendChild(messageElement);
    const stackTraceElement = contentElement.createChild("div", "hidden-stack-trace");
    const targetManager = SDK3.TargetManager.TargetManager.instance();
    const stackTraceTarget = target ?? targetManager.primaryPageTarget() ?? targetManager.rootTarget();
    const stackTracePreview = new Components2.JSPresentationUtils.StackTracePreviewContent();
    stackTracePreview.options = { widthConstrained: true };
    if (stackTraceTarget && stackTrace) {
      const selectableChildIndex = this.selectableChildren.length;
      const stackTracePromise = Bindings2.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().createStackTraceFromProtocolRuntime(stackTrace, stackTraceTarget).then((stackTrace2) => {
        stackTracePreview.stackTrace = stackTrace2;
        return stackTracePreview.updateComplete;
      }).then(() => {
        const selectableLinks = stackTracePreview.linkElements.map(
          (element) => ({ element, forceSelect: () => element.focus() })
        );
        this.selectableChildren.splice(selectableChildIndex, 0, ...selectableLinks);
      });
      this.#formatErrorStackPromiseForTest = Promise.all([this.#formatErrorStackPromiseForTest, stackTracePromise]).then(() => {
      });
    }
    stackTracePreview.markAsRoot();
    stackTracePreview.show(stackTraceElement);
    UI3.ARIAUtils.setLabel(
      contentElement,
      `${messageElement.textContent} ${i18nString2(UIStrings2.stackMessageCollapsed)}`
    );
    UI3.ARIAUtils.markAsGroup(stackTraceElement);
    return { stackTraceElement, contentElement, messageElement, clickableElement, toggleElement };
  }
  format(rawParameters) {
    const formattedResult = document.createElement("span");
    if (this.messagePrefix) {
      formattedResult.createChild("span").textContent = this.messagePrefix;
    }
    if (!rawParameters.length) {
      return formattedResult;
    }
    let parameters = rawParameters.map(parameterToRemoteObject(this.message.runtimeModel()));
    const shouldFormatMessage = SDK3.RemoteObject.RemoteObject.type(parameters[0]) === "string" && (this.message.type !== SDK3.ConsoleModel.FrontendMessageType.Result || this.message.level === Log.LogEntryLevel.Error);
    if (shouldFormatMessage) {
      parameters = this.formatWithSubstitutionString(
        parameters[0].description,
        parameters.slice(1),
        formattedResult
      );
      if (parameters.length) {
        UI3.UIUtils.createTextChild(formattedResult, " ");
      }
    }
    for (let i = 0; i < parameters.length; ++i) {
      if (shouldFormatMessage && parameters[i].type === "string") {
        appendOrShow(formattedResult, this.linkifyStringAsFragment(parameters[i].description || ""));
      } else {
        appendOrShow(formattedResult, this.formatParameter(parameters[i], false, true));
      }
      if (i < parameters.length - 1) {
        UI3.UIUtils.createTextChild(formattedResult, " ");
      }
    }
    return formattedResult;
  }
  formatParameter(output, forceObjectFormat, includePreview) {
    if (output.customPreview()) {
      const component = new ObjectUI2.CustomPreviewComponent.CustomPreviewComponent();
      component.object = output;
      return component;
    }
    const outputType = forceObjectFormat ? "object" : output.subtype || output.type;
    let element;
    switch (outputType) {
      case "error":
        element = this.renderSymbolizedError(output);
        break;
      case "function":
        element = this.formatParameterAsFunction(output, includePreview);
        break;
      case "array":
      case "arraybuffer":
      case "blob":
      case "dataview":
      case "generator":
      case "iterator":
      case "map":
      case "object":
      case "promise":
      case "proxy":
      case "set":
      case "typedarray":
      case "wasmvalue":
      case "weakmap":
      case "weakset":
      case "webassemblymemory":
        element = this.formatParameterAsObject(output, includePreview);
        break;
      case "node":
        element = output.isNode() ? this.formatParameterAsNode(output) : this.formatParameterAsObject(output, false);
        break;
      case "trustedtype":
        element = this.formatParameterAsObject(output, false);
        break;
      case "string":
        element = this.formatParameterAsString(output);
        break;
      case "boolean":
      case "date":
      case "null":
      case "number":
      case "regexp":
      case "symbol":
      case "undefined":
      case "bigint":
        element = this.formatParameterAsValue(output);
        break;
      default:
        element = this.formatParameterAsValue(output);
        console.error(`Tried to format remote object of unknown type ${outputType}.`);
    }
    element.classList.add(`object-value-${outputType}`);
    element.classList.add("source-code");
    return element;
  }
  formatParameterAsValue(obj) {
    const result = document.createElement("span");
    const description = obj.description || "";
    if (description.length > getMaxTokenizableStringLength()) {
      const propertyValue = new ObjectUI2.ObjectPropertiesSection.ExpandableTextPropertyValue();
      propertyValue.text = description;
      propertyValue.maxLength = getLongStringVisibleLength();
      propertyValue.show(
        result,
        null,
        /* suppressOprhanWidgetError=*/
        true
      );
    } else {
      UI3.UIUtils.createTextChild(result, description);
    }
    result.addEventListener("contextmenu", this.contextMenuEventFired.bind(this, obj), false);
    return result;
  }
  formatParameterAsTrustedType(obj) {
    const result = document.createElement("span");
    const trustedContentSpan = document.createElement("span");
    trustedContentSpan.appendChild(this.formatParameterAsString(obj));
    trustedContentSpan.classList.add("object-value-string");
    UI3.UIUtils.createTextChild(result, `${obj.className} `);
    result.appendChild(trustedContentSpan);
    return result;
  }
  formatParameterAsObject(obj, includePreview) {
    const titleElement = document.createElement("span");
    titleElement.tabIndex = -1;
    titleElement.classList.add("console-object");
    const renderPreview = (includeNullOrUndefined) => {
      if (obj.preview) {
        titleElement.classList.add("console-object-preview");
        render3(
          html3`${this.previewFormatter.renderObjectPreview(obj.preview, includeNullOrUndefined)}${ObjectUI2.ObjectPropertiesSection.getMemoryIcon(obj)}`,
          titleElement
        );
      }
    };
    if (includePreview && obj.preview) {
      renderPreview(true);
    } else if (obj.type === "function") {
      titleElement.classList.add("object-value-function");
      void ObjectUI2.ObjectPropertiesSection.formatObjectAsFunction(obj, false).then((t) => {
        const fragment = document.createDocumentFragment();
        render3(t, fragment, { host: this });
        titleElement.insertBefore(fragment, titleElement.firstChild);
      });
    } else if (obj.subtype === "trustedtype") {
      titleElement.appendChild(this.formatParameterAsTrustedType(obj));
    } else {
      UI3.UIUtils.createTextChild(titleElement, obj.description || "");
    }
    if (!obj.hasChildren || obj.customPreview()) {
      return titleElement;
    }
    const container = document.createElement("span");
    const section = new ObjectUI2.ObjectPropertiesSection.ObjectPropertiesSectionWidget();
    section.markAsRoot();
    const treeElement = section.element;
    treeElement.classList.add("console-view-object-properties-section");
    titleElement.addEventListener("contextmenu", (event) => {
      event.consume(true);
      const contextMenu = new UI3.ContextMenu.ContextMenu(event);
      contextMenu.appendApplicableItems(obj);
      if (obj instanceof SDK3.RemoteObject.LocalJSONObject) {
        contextMenu.viewSection().appendItem(
          i18nString2(UIStrings2.expandRecursively),
          () => section.objectTree?.expandRecursively(ObjectUI2.ObjectPropertiesSection.EXPANDABLE_MAX_DEPTH),
          { jslogContext: "expand-recursively" }
        );
        contextMenu.viewSection().appendItem(
          i18nString2(UIStrings2.collapseChildren),
          () => section.objectTree?.collapseRecursively(),
          { jslogContext: "collapse-children" }
        );
      }
      void contextMenu.show();
    });
    section.root = obj;
    section.title = html3`<style>${consoleView_css_default}</style>${titleElement}<span class="object-state-note info-note" title=${this.message.type === SDK3.ConsoleModel.FrontendMessageType.QueryObjectResult ? i18nString2(UIStrings2.thisValueWillNotBeCollectedUntil) : i18nString2(UIStrings2.thisValueWasEvaluatedUponFirst)}></span>`;
    section.linkifier = this.linkifier;
    this.selectableChildren.push({
      element: treeElement,
      forceSelect: () => {
      }
    });
    if (section.objectTree) {
      const resizeEvent = { data: treeElement };
      section.objectTree.addEventListener(
        ObjectUI2.ObjectPropertiesSection.ObjectTreeNodeBase.Events.CHILDREN_CHANGED,
        () => this.messageResized(resizeEvent)
      );
      section.objectTree.addEventListener(
        ObjectUI2.ObjectPropertiesSection.ObjectTreeNodeBase.Events.EXPANDED_CHANGED,
        () => this.messageResized(resizeEvent)
      );
      section.objectTree.addEventListener(
        ObjectUI2.ObjectPropertiesSection.ObjectTreeNodeBase.Events.FILTER_CHANGED,
        () => renderPreview(section.objectTree?.includeNullOrUndefinedValues || false)
      );
    }
    section.show(container);
    return container;
  }
  formatParameterAsFunction(originalFunction, includePreview) {
    const result = document.createElement("span");
    void SDK3.RemoteObject.RemoteFunction.objectAsFunction(originalFunction).targetFunction().then(formatTargetFunction.bind(this));
    return result;
    function formatTargetFunction(targetFunction) {
      const promise = ObjectUI2.ObjectPropertiesSection.formatObjectAsFunction(targetFunction, true, includePreview);
      if (targetFunction !== originalFunction) {
        const note = result.createChild("span", "object-state-note info-note");
        UI3.Tooltip.Tooltip.install(note, i18nString2(UIStrings2.functionWasResolvedFromBound));
      }
      result.addEventListener("contextmenu", this.contextMenuEventFired.bind(this, originalFunction), false);
      void promise.then((t) => {
        const fragment = document.createDocumentFragment();
        render3(t, fragment, { host: this });
        result.insertBefore(fragment, result.firstChild);
        this.formattedParameterAsFunctionForTest();
      });
    }
  }
  formattedParameterAsFunctionForTest() {
  }
  contextMenuEventFired(obj, event) {
    const contextMenu = new UI3.ContextMenu.ContextMenu(event);
    contextMenu.appendApplicableItems(obj);
    void contextMenu.show();
  }
  renderPropertyPreviewOrAccessor(object, property, propertyPath) {
    if (property.type === "accessor") {
      return this.formatAsAccessorProperty(object, propertyPath.map((property2) => property2.name.toString()), false);
    }
    return this.renderPropertyPreview(
      property.type,
      "subtype" in property ? property.subtype : void 0,
      null,
      property.value
    );
  }
  formatParameterAsNode(remoteObject) {
    const result = document.createElement("span");
    const domModel = remoteObject.runtimeModel().target().model(SDK3.DOMModel.DOMModel);
    if (!domModel) {
      return result;
    }
    void domModel.pushObjectAsNodeToFrontend(remoteObject).then((node) => {
      if (!node) {
        result.appendChild(this.formatParameterAsObject(remoteObject, false));
        return;
      }
      const treeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline(
        /* omitRootDOMNode: */
        false,
        /* selectEnabled: */
        true,
        /* hideGutter: */
        true
      );
      treeOutline.rootDOMNode = node;
      treeOutline.deindentSingleNode();
      treeOutline.setVisible(true);
      treeOutline.element.treeElementForTest = treeOutline.firstChild();
      treeOutline.setShowSelectionOnKeyboardFocus(
        /* show: */
        true,
        /* preventTabOrder: */
        true
      );
      this.selectableChildren.push({
        element: treeOutline.element,
        forceSelect: treeOutline.forceSelect.bind(treeOutline)
      });
      const dispatchDimensionChange = () => {
        this.messageResized({ data: treeOutline.element });
      };
      treeOutline.addEventListener(UI3.TreeOutline.Events.ElementAttached, dispatchDimensionChange);
      treeOutline.addEventListener(UI3.TreeOutline.Events.ElementExpanded, dispatchDimensionChange);
      treeOutline.addEventListener(UI3.TreeOutline.Events.ElementCollapsed, dispatchDimensionChange);
      result.appendChild(treeOutline.element);
      this.formattedParameterAsNodeForTest();
    });
    return result;
  }
  formattedParameterAsNodeForTest() {
  }
  formatParameterAsString(output) {
    const description = output.description ?? "";
    const text = Platform2.StringUtilities.formatAsJSLiteral(description);
    const result = document.createElement("span");
    result.addEventListener("contextmenu", this.contextMenuEventFired.bind(this, output), false);
    appendOrShow(result, this.linkifyStringAsFragment(text));
    return result;
  }
  renderSymbolizedError(errorRemoteObject) {
    const container = document.createElement("span");
    const widget2 = new SymbolizedErrorWidget();
    widget2.ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance();
    const selectableChildIndex = this.selectableChildren.length;
    const format2 = async () => {
      const error = await Bindings2.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().createSymbolizedError(
        errorRemoteObject,
        this.message.exceptionDetails
      );
      if (error) {
        widget2.error = error;
      }
      await widget2.updateComplete;
      const selectableLinks = widget2.linkElements.map((element) => ({ element, forceSelect: () => element.focus() }));
      this.selectableChildren.splice(selectableChildIndex, 0, ...selectableLinks);
    };
    this.#formatErrorStackPromiseForTest = Promise.all([this.#formatErrorStackPromiseForTest, format2()]).then(() => {
    });
    widget2.markAsRoot();
    widget2.show(container);
    return container;
  }
  formatAsArrayEntry(output) {
    return this.renderPropertyPreview(output.type, output.subtype, output.className, output.description);
  }
  renderPropertyPreview(type, subtype, className, description) {
    const fragment = document.createDocumentFragment();
    render3(this.previewFormatter.renderPropertyPreview(type, subtype, className, description), fragment);
    return fragment;
  }
  createRemoteObjectAccessorPropertySpan(object, propertyPath, callback) {
    const rootElement = document.createElement("span");
    const element = rootElement.createChild("span");
    element.textContent = i18nString2(UIStrings2.dots);
    if (!object) {
      return rootElement;
    }
    element.classList.add("object-value-calculate-value-button");
    UI3.Tooltip.Tooltip.install(element, i18nString2(UIStrings2.invokePropertyGetter));
    element.addEventListener("click", onInvokeGetterClick, false);
    function onInvokeGetterClick(event) {
      event.consume();
      if (object) {
        void object.callFunction(invokeGetter, [{ value: JSON.stringify(propertyPath) }]).then(callback);
      }
    }
    function invokeGetter(arrayStr) {
      let result = this;
      const properties = JSON.parse(arrayStr);
      for (let i = 0, n = properties.length; i < n; ++i) {
        result = result[properties[i]];
      }
      return result;
    }
    return rootElement;
  }
  formatAsAccessorProperty(object, propertyPath, isArrayEntry) {
    const rootElement = this.createRemoteObjectAccessorPropertySpan(object, propertyPath, onInvokeGetterClick.bind(this));
    function onInvokeGetterClick(result) {
      const wasThrown = result.wasThrown;
      const object2 = result.object;
      if (!object2) {
        return;
      }
      rootElement.removeChildren();
      if (wasThrown) {
        const element = rootElement.createChild("span");
        element.textContent = i18nString2(UIStrings2.exception);
        UI3.Tooltip.Tooltip.install(element, object2.description);
      } else if (isArrayEntry) {
        rootElement.appendChild(this.formatAsArrayEntry(object2));
      } else {
        const maxLength = 100;
        const type = object2.type;
        const subtype = object2.subtype;
        let description = "";
        if (type !== "function" && object2.description) {
          if (type === "string" || subtype === "regexp" || subtype === "trustedtype") {
            description = Platform2.StringUtilities.trimMiddle(object2.description, maxLength);
          } else {
            description = Platform2.StringUtilities.trimEndWithMaxLength(object2.description, maxLength);
          }
        }
        rootElement.appendChild(this.renderPropertyPreview(type, subtype, object2.className, description));
      }
    }
    return rootElement;
  }
  formatWithSubstitutionString(formatString, parameters, formattedResult) {
    const currentStyle = /* @__PURE__ */ new Map();
    const { tokens, args } = format(formatString, parameters);
    for (const token of tokens) {
      switch (token.type) {
        case "generic": {
          appendOrShow(
            formattedResult,
            this.formatParameter(
              token.value,
              true,
              false
              /* includePreview */
            )
          );
          break;
        }
        case "optimal": {
          appendOrShow(
            formattedResult,
            this.formatParameter(
              token.value,
              false,
              true
              /* includePreview */
            )
          );
          break;
        }
        case "string": {
          if (currentStyle.size === 0) {
            appendOrShow(formattedResult, this.linkifyStringAsFragment(token.value));
          } else {
            const lines = token.value.split("\n");
            for (let i = 0; i < lines.length; i++) {
              if (i > 0) {
                formattedResult.append(document.createElement("br"));
              }
              const wrapper = document.createElement("span");
              wrapper.style.setProperty("contain", "paint");
              wrapper.style.setProperty("display", "inline-block");
              wrapper.style.setProperty("max-width", "100%");
              appendOrShow(wrapper, this.linkifyStringAsFragment(lines[i]));
              for (const [property, { value, priority }] of currentStyle) {
                wrapper.style.setProperty(property, value, priority);
              }
              formattedResult.append(wrapper);
            }
          }
          break;
        }
        case "style":
          updateStyle(currentStyle, token.value);
          break;
      }
    }
    return args;
  }
  matchesFilterRegex(regexObject) {
    regexObject.lastIndex = 0;
    const contentElement = this.contentElement();
    const anchorText = this.anchorElement ? this.anchorElement.deepTextContent() : "";
    return Boolean(anchorText) && regexObject.test(anchorText.trim()) || regexObject.test(contentElement.deepTextContent().slice(anchorText.length));
  }
  matchesFilterText(filter) {
    const text = this.contentElement().deepTextContent() + this.message.messageText;
    return text.toLowerCase().includes(filter.toLowerCase());
  }
  updateTimestamp() {
    if (!this.contentElementInternal) {
      return;
    }
    if (Common2.Settings.Settings.instance().resolve(Settings2.ConsoleSettings.consoleTimestampsEnabledSettingDescriptor).get()) {
      if (!this.timestampElement) {
        this.timestampElement = document.createElement("span");
        this.timestampElement.classList.add("console-timestamp");
      }
      this.timestampElement.textContent = UI3.UIUtils.formatTimestamp(this.message.timestamp, false) + " ";
      UI3.Tooltip.Tooltip.install(this.timestampElement, UI3.UIUtils.formatTimestamp(this.message.timestamp, true));
      this.contentElementInternal.insertBefore(this.timestampElement, this.contentElementInternal.firstChild);
    } else if (this.timestampElement) {
      this.timestampElement.remove();
      this.timestampElement = null;
    }
  }
  nestingLevel() {
    let nestingLevel = 0;
    for (let group = this.consoleGroup(); group !== null; group = group.consoleGroup()) {
      nestingLevel++;
    }
    return nestingLevel;
  }
  setConsoleGroup(group) {
    this.consoleGroupInternal = group;
  }
  clearConsoleGroup() {
    this.consoleGroupInternal = null;
  }
  consoleGroup() {
    return this.consoleGroupInternal;
  }
  isTraceExpanded() {
    return this.traceExpanded;
  }
  isExpandableTrace() {
    return this.hasStackTrace;
  }
  setTraceExpanded(expanded) {
    if (this.expandTrace && this.traceExpanded !== expanded) {
      this.expandTrace(expanded);
    }
  }
  setInSimilarGroup(inSimilarGroup, isLast) {
    this.inSimilarGroup = inSimilarGroup;
    this.lastInSimilarGroup = inSimilarGroup && Boolean(isLast);
    if (this.similarGroupMarker && !inSimilarGroup) {
      this.similarGroupMarker.remove();
      this.similarGroupMarker = null;
    } else if (this.elementInternal && !this.similarGroupMarker && inSimilarGroup) {
      this.similarGroupMarker = document.createElement("div");
      this.similarGroupMarker.classList.add("nesting-level-marker");
      this.consoleRowWrapper?.insertBefore(this.similarGroupMarker, this.consoleRowWrapper.firstChild);
      this.similarGroupMarker.classList.toggle("group-closed", this.lastInSimilarGroup);
    }
  }
  isLastInSimilarGroup() {
    return Boolean(this.inSimilarGroup) && Boolean(this.lastInSimilarGroup);
  }
  resetCloseGroupDecorationCount() {
    if (!this.closeGroupDecorationCount) {
      return;
    }
    this.closeGroupDecorationCount = 0;
    this.updateCloseGroupDecorations();
  }
  incrementCloseGroupDecorationCount() {
    ++this.closeGroupDecorationCount;
    this.updateCloseGroupDecorations();
  }
  updateCloseGroupDecorations() {
    if (!this.nestingLevelMarkers) {
      return;
    }
    for (let i = 0, n = this.nestingLevelMarkers.length; i < n; ++i) {
      const marker = this.nestingLevelMarkers[i];
      marker.classList.toggle("group-closed", n - i <= this.closeGroupDecorationCount);
    }
  }
  focusedChildIndex() {
    if (!this.selectableChildren.length) {
      return -1;
    }
    return this.selectableChildren.findIndex((child) => child.element.hasFocus());
  }
  onKeyDown(event) {
    if (UI3.UIUtils.isEditing() || !this.elementInternal || !this.elementInternal.hasFocus() || this.elementInternal.hasSelection()) {
      return;
    }
    if (this.maybeHandleOnKeyDown(event)) {
      event.consume(true);
    }
  }
  maybeHandleOnKeyDown(event) {
    const focusedChildIndex = this.focusedChildIndex();
    const isWrapperFocused = focusedChildIndex === -1;
    if (this.expandTrace && isWrapperFocused) {
      if (event.key === "ArrowLeft" && this.traceExpanded || event.key === "ArrowRight" && !this.traceExpanded) {
        this.expandTrace(!this.traceExpanded);
        return true;
      }
    }
    if (!this.selectableChildren.length) {
      return false;
    }
    if (event.key === "ArrowLeft") {
      this.elementInternal?.focus();
      return true;
    }
    if (event.key === "ArrowRight") {
      if (isWrapperFocused && this.selectNearestVisibleChild(0)) {
        return true;
      }
    }
    if (event.key === "ArrowUp") {
      const firstVisibleChild = this.nearestVisibleChild(0);
      if (this.selectableChildren[focusedChildIndex] === firstVisibleChild && firstVisibleChild) {
        this.elementInternal?.focus();
        return true;
      }
      if (this.selectNearestVisibleChild(
        focusedChildIndex - 1,
        true
        /* backwards */
      )) {
        return true;
      }
    }
    if (event.key === "ArrowDown") {
      if (isWrapperFocused && this.selectNearestVisibleChild(0)) {
        return true;
      }
      if (!isWrapperFocused && this.selectNearestVisibleChild(focusedChildIndex + 1)) {
        return true;
      }
    }
    return false;
  }
  selectNearestVisibleChild(fromIndex, backwards) {
    const nearestChild = this.nearestVisibleChild(fromIndex, backwards);
    if (nearestChild) {
      nearestChild.forceSelect();
      return true;
    }
    return false;
  }
  nearestVisibleChild(fromIndex, backwards) {
    const childCount = this.selectableChildren.length;
    if (fromIndex < 0 || fromIndex >= childCount) {
      return null;
    }
    const direction = backwards ? -1 : 1;
    let index = fromIndex;
    while (!this.selectableChildren[index].element.offsetParent) {
      index += direction;
      if (index < 0 || index >= childCount) {
        return null;
      }
    }
    return this.selectableChildren[index];
  }
  focusLastChildOrSelf() {
    if (this.elementInternal && !this.selectNearestVisibleChild(
      this.selectableChildren.length - 1,
      true
      /* backwards */
    )) {
      this.elementInternal.focus();
    }
  }
  setContentElement(element) {
    console.assert(!this.contentElementInternal, "Cannot set content element twice");
    this.contentElementInternal = element;
  }
  getContentElement() {
    return this.contentElementInternal;
  }
  contentElement() {
    if (this.contentElementInternal) {
      return this.contentElementInternal;
    }
    const contentElement = document.createElement("div");
    contentElement.classList.add("console-message");
    if (this.messageIcon) {
      contentElement.appendChild(this.messageIcon);
    }
    this.contentElementInternal = contentElement;
    const runtimeModel = this.message.runtimeModel();
    let formattedMessage;
    const shouldIncludeTrace = Boolean(this.message.stackTrace) && (this.message.source === Log.LogEntrySource.Network || this.message.source === Log.LogEntrySource.Violation || this.message.level === Log.LogEntryLevel.Error || this.message.level === Log.LogEntryLevel.Warning || this.message.type === Runtime.ConsoleAPICalledEventType.Trace);
    if (runtimeModel && shouldIncludeTrace) {
      formattedMessage = this.buildMessageWithStackTrace(runtimeModel);
    } else {
      formattedMessage = this.buildMessageWithIgnoreLinks();
    }
    contentElement.appendChild(formattedMessage);
    this.updateTimestamp();
    return this.contentElementInternal;
  }
  #startTeaserGeneration() {
    if (!this.elementInternal) {
      return;
    }
    if (this.shouldShowTeaser()) {
      if (!this.#teaser) {
        const uuid = crypto.randomUUID();
        this.elementInternal.setAttribute("aria-details", `teaser-${uuid}`);
        this.#teaser = new ConsoleInsightTeaser(uuid, this);
        this.#teaser.show(this.elementInternal, this.consoleRowWrapper);
      }
      this.#teaser.maybeGenerateTeaser();
    } else {
      this.#teaser?.detach();
      this.#teaser = void 0;
    }
  }
  #abortTeaserGeneration() {
    if (this.#teaser) {
      const { okToRemove } = this.#teaser.abortTeaserGeneration();
      if (okToRemove) {
        this.#teaser.detach();
        this.#teaser = void 0;
      }
    }
  }
  toMessageElement() {
    if (this.elementInternal) {
      return this.elementInternal;
    }
    this.elementInternal = document.createElement("div");
    this.elementInternal.tabIndex = -1;
    this.elementInternal.addEventListener("keydown", this.onKeyDown.bind(this));
    this.elementInternal.addEventListener("mouseenter", this.#startTeaserGeneration.bind(this));
    this.elementInternal.addEventListener("focusin", this.#startTeaserGeneration.bind(this));
    this.elementInternal.addEventListener("mouseleave", this.#abortTeaserGeneration.bind(this));
    this.elementInternal.addEventListener("focusout", this.#abortTeaserGeneration.bind(this));
    this.updateMessageElement();
    this.elementInternal.classList.toggle("console-adjacent-user-command-result", this.#adjacentUserCommandResult);
    return this.elementInternal;
  }
  updateMessageElement() {
    if (!this.elementInternal) {
      return;
    }
    this.elementInternal.className = "console-message-wrapper";
    this.elementInternal.setAttribute("jslog", `${VisualLogging.item("console-message").track({
      click: true,
      resize: true,
      keydown: "ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Enter|Space|Home|End"
    })}`);
    this.elementInternal.removeChildren();
    this.consoleRowWrapper = this.elementInternal.createChild("div");
    this.consoleRowWrapper.classList.add("console-row-wrapper");
    if (this.message.isGroupStartMessage()) {
      this.elementInternal.classList.add("console-group-title");
    }
    if (this.message.source === Common2.Console.FrontendMessageSource.ConsoleAPI) {
      this.elementInternal.classList.add("console-from-api");
    }
    if (this.inSimilarGroup) {
      this.similarGroupMarker = this.consoleRowWrapper.createChild("div", "nesting-level-marker");
      this.similarGroupMarker.classList.toggle("group-closed", this.lastInSimilarGroup);
    }
    this.nestingLevelMarkers = [];
    for (let i = 0; i < this.nestingLevel(); ++i) {
      this.nestingLevelMarkers.push(this.consoleRowWrapper.createChild("div", "nesting-level-marker"));
    }
    this.updateCloseGroupDecorations();
    elementToMessage.set(this.elementInternal, this);
    switch (this.message.level) {
      case Log.LogEntryLevel.Verbose:
        this.elementInternal.classList.add("console-verbose-level");
        UI3.ARIAUtils.setLabel(this.elementInternal, this.text);
        break;
      case Log.LogEntryLevel.Info:
        this.elementInternal.classList.add("console-info-level");
        if (this.message.type === SDK3.ConsoleModel.FrontendMessageType.System) {
          this.elementInternal.classList.add("console-system-type");
        }
        UI3.ARIAUtils.setLabel(this.elementInternal, this.text);
        break;
      case Log.LogEntryLevel.Warning:
        this.elementInternal.classList.add("console-warning-level");
        this.elementInternal.role = "log";
        UI3.ARIAUtils.setLabel(this.elementInternal, this.text);
        break;
      case Log.LogEntryLevel.Error:
        this.elementInternal.classList.add("console-error-level");
        this.elementInternal.role = "log";
        UI3.ARIAUtils.setLabel(this.elementInternal, this.text);
        break;
    }
    this.updateMessageIcon();
    if (this.shouldRenderAsWarning()) {
      this.elementInternal.classList.add("console-warning-level");
    }
    this.consoleRowWrapper.appendChild(this.contentElement());
    if (UI3.ActionRegistry.ActionRegistry.instance().hasAction(EXPLAIN_HOVER_ACTION_ID) && this.shouldShowInsights()) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightConsoleMessageShown);
      this.consoleRowWrapper.append(this.#createHoverButton());
    }
    if (this.repeatCountInternal > 1) {
      this.showRepeatCountElement();
    }
  }
  shouldShowInsights() {
    if (this.message.source === Common2.Console.FrontendMessageSource.ConsoleAPI && this.message.stackTrace?.callFrames[0]?.url === "") {
      return false;
    }
    if (this.message.messageText === "" || this.message.source === Common2.Console.FrontendMessageSource.SELF_XSS) {
      return false;
    }
    return this.message.level === Log.LogEntryLevel.Error || this.message.level === Log.LogEntryLevel.Warning;
  }
  shouldShowTeaser() {
    if (!this.shouldShowInsights()) {
      return false;
    }
    if (!Common2.Settings.Settings.instance().moduleSetting("console-insight-teasers-enabled").get() || !AiAssistanceModel.BuiltInAi.BuiltInAi.instance().isEventuallyAvailable()) {
      return false;
    }
    const devtoolsLocale = i18n3.DevToolsLocale.DevToolsLocale.instance();
    if (!devtoolsLocale.locale.startsWith("en-")) {
      return false;
    }
    return true;
  }
  getExplainLabel() {
    if (this.message.level === Log.LogEntryLevel.Error) {
      return i18nString2(UIStrings2.explainThisError);
    }
    if (this.message.level === Log.LogEntryLevel.Warning) {
      return i18nString2(UIStrings2.explainThisWarning);
    }
    return i18nString2(UIStrings2.explainThisMessage);
  }
  #getExplainAriaLabel() {
    if (this.message.level === Log.LogEntryLevel.Error) {
      return i18nString2(UIStrings2.explainThisErrorWithAI);
    }
    if (this.message.level === Log.LogEntryLevel.Warning) {
      return i18nString2(UIStrings2.explainThisWarningWithAI);
    }
    return i18nString2(UIStrings2.explainThisMessageWithAI);
  }
  getExplainActionId() {
    if (this.message.level === Log.LogEntryLevel.Error) {
      return EXPLAIN_CONTEXT_ERROR_ACTION_ID;
    }
    if (this.message.level === Log.LogEntryLevel.Warning) {
      return EXPLAIN_CONTEXT_WARNING_ACTION_ID;
    }
    return EXPLAIN_CONTEXT_OTHER_ACTION_ID;
  }
  #createHoverButton() {
    const icon = new Icon();
    icon.name = "lightbulb-spark";
    icon.style.color = "var(--devtools-icon-color)";
    icon.classList.add("medium");
    const button = document.createElement("button");
    button.append(icon);
    button.onclick = (event) => {
      event.stopPropagation();
      UI3.Context.Context.instance().setFlavor(_ConsoleViewMessage, this);
      const action2 = UI3.ActionRegistry.ActionRegistry.instance().getAction(EXPLAIN_HOVER_ACTION_ID);
      void action2.execute();
    };
    const label = document.createElement("div");
    label.classList.add("button-label");
    const text = document.createElement("div");
    text.setAttribute("data-text", this.getExplainLabel());
    label.append(text);
    button.append(label);
    button.classList.add("hover-button");
    button.ariaLabel = this.#getExplainAriaLabel();
    button.tabIndex = 0;
    button.setAttribute("jslog", `${VisualLogging.action(EXPLAIN_HOVER_ACTION_ID).track({ click: true })}`);
    hoverButtonObserver.observe(button);
    return button;
  }
  shouldRenderAsWarning() {
    return (this.message.level === Log.LogEntryLevel.Verbose || this.message.level === Log.LogEntryLevel.Info) && (this.message.source === Log.LogEntrySource.Violation || this.message.source === Log.LogEntrySource.Deprecation || this.message.source === Log.LogEntrySource.Intervention || this.message.source === Log.LogEntrySource.Recommendation);
  }
  updateMessageIcon() {
    if (this.messageIcon) {
      this.messageIcon.remove();
      this.messageIcon = null;
    }
    const color = "";
    let iconName = "";
    let accessibleName = "";
    if (this.message.level === Log.LogEntryLevel.Warning) {
      iconName = "warning-filled";
      accessibleName = i18nString2(UIStrings2.warning);
    } else if (this.message.level === Log.LogEntryLevel.Error) {
      iconName = "cross-circle-filled";
      accessibleName = i18nString2(UIStrings2.error);
    } else if (this.message.originatesFromLogpoint) {
      iconName = "console-logpoint";
      accessibleName = i18nString2(UIStrings2.logpoint);
    } else if (this.message.originatesFromConditionalBreakpoint) {
      iconName = "console-conditional-breakpoint";
      accessibleName = i18nString2(UIStrings2.cndBreakpoint);
    }
    if (!iconName) {
      return;
    }
    this.messageIcon = new Icon();
    this.messageIcon.name = iconName;
    this.messageIcon.style.color = color;
    this.messageIcon.classList.add("message-level-icon", "small");
    if (this.contentElementInternal) {
      this.contentElementInternal.insertBefore(this.messageIcon, this.contentElementInternal.firstChild);
    }
    UI3.ARIAUtils.setLabel(this.messageIcon, accessibleName);
  }
  setAdjacentUserCommandResult(adjacentUserCommandResult) {
    this.#adjacentUserCommandResult = adjacentUserCommandResult;
    this.elementInternal?.classList.toggle("console-adjacent-user-command-result", this.#adjacentUserCommandResult);
  }
  repeatCount() {
    return this.repeatCountInternal || 1;
  }
  resetIncrementRepeatCount() {
    this.repeatCountInternal = 1;
    if (!this.repeatCountElement) {
      return;
    }
    this.repeatCountElement.remove();
    if (this.contentElementInternal) {
      this.contentElementInternal.classList.remove("repeated-message");
    }
    this.repeatCountElement = null;
  }
  incrementRepeatCount() {
    this.repeatCountInternal++;
    this.showRepeatCountElement();
  }
  setRepeatCount(repeatCount) {
    this.repeatCountInternal = repeatCount;
    this.showRepeatCountElement();
  }
  showRepeatCountElement() {
    if (!this.elementInternal) {
      return;
    }
    if (!this.repeatCountElement) {
      this.repeatCountElement = document.createElement("dt-small-bubble");
      this.repeatCountElement.classList.add("console-message-repeat-count");
      switch (this.message.level) {
        case Log.LogEntryLevel.Warning:
          this.repeatCountElement.type = "warning";
          break;
        case Log.LogEntryLevel.Error:
          this.repeatCountElement.type = "error";
          break;
        case Log.LogEntryLevel.Verbose:
          this.repeatCountElement.type = "verbose";
          break;
        default:
          this.repeatCountElement.type = "info";
      }
      if (this.shouldRenderAsWarning()) {
        this.repeatCountElement.type = "warning";
      }
      this.consoleRowWrapper?.insertBefore(this.repeatCountElement, this.contentElementInternal);
      this.contentElement().classList.add("repeated-message");
    }
    this.repeatCountElement.textContent = `${this.repeatCountInternal}`;
    let accessibleName;
    if (this.message.level === Log.LogEntryLevel.Warning) {
      accessibleName = i18nString2(UIStrings2.warningS, { n: this.repeatCountInternal });
    } else if (this.message.level === Log.LogEntryLevel.Error) {
      accessibleName = i18nString2(UIStrings2.errorS, { n: this.repeatCountInternal });
    } else {
      accessibleName = i18nString2(UIStrings2.repeatS, { n: this.repeatCountInternal });
    }
    UI3.ARIAUtils.setLabel(this.repeatCountElement, accessibleName);
  }
  get text() {
    return this.message.messageText;
  }
  toExportString() {
    const lines = [];
    const nodes = this.contentElement().childTextNodes();
    const messageContent = nodes.map(Components2.Linkifier.Linkifier.untruncatedNodeText).join("");
    for (let i = 0; i < this.repeatCount(); ++i) {
      lines.push(messageContent);
    }
    return lines.join("\n");
  }
  toMessageTextString() {
    const root = this.contentElement();
    const consoleText = root.querySelector(".console-message-text");
    if (consoleText) {
      return consoleText.deepTextContent().trim();
    }
    return this.consoleMessage().messageText;
  }
  setSearchRegex(regex) {
    if (this.searchHighlightNodeChanges?.length) {
      Highlighting.revertDomChanges(this.searchHighlightNodeChanges);
    }
    this.searchRegexInternal = regex;
    this.searchHighlightNodes = [];
    this.searchHighlightNodeChanges = [];
    if (!this.searchRegexInternal) {
      return;
    }
    const text = this.contentElement().deepTextContent();
    let match;
    this.searchRegexInternal.lastIndex = 0;
    const sourceRanges = [];
    while ((match = this.searchRegexInternal.exec(text)) && match[0]) {
      sourceRanges.push(new TextUtils3.TextRange.SourceRange(match.index, match[0].length));
    }
    if (sourceRanges.length) {
      this.searchHighlightNodes = Highlighting.highlightRangesWithStyleClass(
        this.contentElement(),
        sourceRanges,
        Highlighting.highlightedSearchResultClassName,
        this.searchHighlightNodeChanges
      );
    }
  }
  searchRegex() {
    return this.searchRegexInternal;
  }
  searchCount() {
    return this.searchHighlightNodes.length;
  }
  searchHighlightNode(index) {
    return this.searchHighlightNodes[index];
  }
  static linkifyWithCustomLinkifier(string, linkifier) {
    if (string.length > getMaxTokenizableStringLength()) {
      const propertyValue = new ObjectUI2.ObjectPropertiesSection.ExpandableTextPropertyValue();
      propertyValue.text = string;
      propertyValue.maxLength = getLongStringVisibleLength();
      return propertyValue;
    }
    const container = document.createDocumentFragment();
    const tokens = _ConsoleViewMessage.tokenizeMessageText(string);
    let isBlob = false;
    for (const token of tokens) {
      if (!token.text) {
        continue;
      }
      if (isBlob) {
        token.text = `blob:${token.text}`;
        isBlob = !isBlob;
      }
      if (token.text === "'blob:" && token === tokens[0]) {
        isBlob = true;
        token.text = "'";
      }
      switch (token.type) {
        case "url": {
          const realURL = token.text.startsWith("www.") ? "http://" + token.text : token.text;
          const splitResult = Common2.ParsedURL.ParsedURL.splitLineAndColumn(realURL);
          const sourceURL = Common2.ParsedURL.ParsedURL.removeWasmFunctionInfoFromURL(splitResult.url);
          let linkNode;
          if (splitResult) {
            linkNode = linkifier(token.text, sourceURL, splitResult.lineNumber, splitResult.columnNumber);
          } else {
            linkNode = linkifier(token.text, Platform2.DevToolsPath.EmptyUrlString);
          }
          container.appendChild(linkNode);
          break;
        }
        default:
          container.appendChild(document.createTextNode(token.text));
          break;
      }
    }
    return container;
  }
  linkifyStringAsFragment(string) {
    return _ConsoleViewMessage.linkifyWithCustomLinkifier(string, (text, url, lineNumber, columnNumber) => {
      const options = { text, lineNumber, columnNumber };
      const linkElement = Components2.Linkifier.Linkifier.linkifyURL(url, options);
      linkElement.tabIndex = -1;
      this.selectableChildren.push({ element: linkElement, forceSelect: () => linkElement.focus() });
      return linkElement;
    });
  }
  static tokenizeMessageText(string) {
    const { tokenizerRegexes: tokenizerRegexes2, tokenizerTypes: tokenizerTypes2 } = getOrCreateTokenizers();
    if (string.length > getMaxTokenizableStringLength()) {
      return [{ text: string, type: void 0 }];
    }
    const results = TextUtils3.TextUtils.Utils.splitStringByRegexes(string, tokenizerRegexes2);
    return results.map((result) => ({ text: result.value, type: tokenizerTypes2[result.regexIndex] }));
  }
  groupKey() {
    if (!this.groupKeyInternal) {
      this.groupKeyInternal = this.message.groupCategoryKey() + ":" + this.groupTitle();
    }
    return this.groupKeyInternal;
  }
  groupTitle() {
    const tokens = _ConsoleViewMessage.tokenizeMessageText(this.message.messageText);
    const result = tokens.reduce((acc, token) => {
      let text = token.text;
      if (token.type === "url") {
        text = i18nString2(UIStrings2.url);
      } else if (token.type === "time") {
        text = i18nString2(UIStrings2.tookNms);
      } else if (token.type === "event") {
        text = i18nString2(UIStrings2.someEvent);
      } else if (token.type === "milestone") {
        text = i18nString2(UIStrings2.Mxx);
      } else if (token.type === "autofill") {
        text = i18nString2(UIStrings2.attribute);
      }
      return acc + text;
    }, "");
    return result.replace(/[%]o/g, "");
  }
};
var tokenizerRegexes = null;
var tokenizerTypes = null;
function getOrCreateTokenizers() {
  if (!tokenizerRegexes || !tokenizerTypes) {
    const controlCodes = "\\u0000-\\u0020\\u007f-\\u009f";
    const linkStringRegex = new RegExp(
      "(?:[a-zA-Z][a-zA-Z0-9+.-]{2,}:\\/\\/|data:|www\\.)[^\\s" + controlCodes + '"]{2,}[^\\s' + controlCodes + `"')}\\],:;.!?]`,
      "u"
    );
    const pathLineRegex = /(?:\/[\w\.-]*)+\:[\d]+/;
    const timeRegex = /took [\d]+ms/;
    const eventRegex = /'\w+' event/;
    const milestoneRegex = /\sM[6-7]\d/;
    const autofillRegex = /\(suggested: \"[\w-]+\"\)/;
    const handlers = /* @__PURE__ */ new Map();
    handlers.set(linkStringRegex, "url");
    handlers.set(pathLineRegex, "url");
    handlers.set(timeRegex, "time");
    handlers.set(eventRegex, "event");
    handlers.set(milestoneRegex, "milestone");
    handlers.set(autofillRegex, "autofill");
    tokenizerRegexes = Array.from(handlers.keys());
    tokenizerTypes = Array.from(handlers.values());
    return { tokenizerRegexes, tokenizerTypes };
  }
  return { tokenizerRegexes, tokenizerTypes };
}
var ConsoleGroupViewMessage = class extends ConsoleViewMessage {
  collapsedInternal;
  expandGroupIcon;
  onToggle;
  groupEndMessageInternal;
  constructor(consoleMessage, linkifier, requestResolver, issueResolver, onToggle, onResize) {
    console.assert(consoleMessage.isGroupStartMessage());
    super(consoleMessage, linkifier, requestResolver, issueResolver, onResize);
    this.collapsedInternal = consoleMessage.type === Runtime.ConsoleAPICalledEventType.StartGroupCollapsed;
    this.expandGroupIcon = null;
    this.onToggle = onToggle;
    this.groupEndMessageInternal = null;
  }
  setCollapsed(collapsed) {
    this.setCollapsedSilent(collapsed);
    this.onToggle.call(null);
  }
  setCollapsedSilent(collapsed) {
    this.collapsedInternal = collapsed;
    if (this.expandGroupIcon) {
      this.expandGroupIcon.name = this.collapsedInternal ? "triangle-right" : "triangle-down";
    }
  }
  collapsed() {
    return this.collapsedInternal;
  }
  maybeHandleOnKeyDown(event) {
    const focusedChildIndex = this.focusedChildIndex();
    if (focusedChildIndex === -1) {
      if (event.key === "ArrowLeft" && !this.collapsedInternal || event.key === "ArrowRight" && this.collapsedInternal) {
        this.setCollapsed(!this.collapsedInternal);
        return true;
      }
    }
    return super.maybeHandleOnKeyDown(event);
  }
  toMessageElement() {
    let element = this.elementInternal || null;
    if (!element) {
      element = super.toMessageElement();
      const iconType = this.collapsedInternal ? "triangle-right" : "triangle-down";
      this.expandGroupIcon = createIcon(iconType, "expand-group-icon");
      this.contentElement().tabIndex = -1;
      if (this.repeatCountElement) {
        this.repeatCountElement.insertBefore(this.expandGroupIcon, this.repeatCountElement.firstChild);
      } else {
        this.consoleRowWrapper?.insertBefore(this.expandGroupIcon, this.contentElementInternal);
      }
      element.addEventListener("click", () => this.setCollapsed(!this.collapsedInternal));
    }
    return element;
  }
  showRepeatCountElement() {
    super.showRepeatCountElement();
    if (this.repeatCountElement && this.expandGroupIcon) {
      this.repeatCountElement.insertBefore(this.expandGroupIcon, this.repeatCountElement.firstChild);
    }
  }
  messagesHidden() {
    if (this.collapsed()) {
      return true;
    }
    const parent = this.consoleGroup();
    return Boolean(parent?.messagesHidden());
  }
  setGroupEnd(viewMessage) {
    if (viewMessage.consoleMessage().type !== Runtime.ConsoleAPICalledEventType.EndGroup) {
      throw new Error("Invalid console message as group end");
    }
    if (this.groupEndMessageInternal !== null) {
      throw new Error("Console group already has an end");
    }
    this.groupEndMessageInternal = viewMessage;
  }
  groupEnd() {
    return this.groupEndMessageInternal;
  }
};
var ConsoleCommand = class extends ConsoleViewMessage {
  formattedCommand;
  constructor(consoleMessage, linkifier, requestResolver, issueResolver, onResize) {
    super(consoleMessage, linkifier, requestResolver, issueResolver, onResize);
    this.formattedCommand = null;
  }
  contentElement() {
    const contentElement = this.getContentElement();
    if (contentElement) {
      return contentElement;
    }
    const newContentElement = document.createElement("div");
    this.setContentElement(newContentElement);
    newContentElement.classList.add("console-user-command");
    const userCommandIcon = new Icon();
    userCommandIcon.name = "chevron-right";
    userCommandIcon.classList.add("command-result-icon", "medium");
    newContentElement.appendChild(userCommandIcon);
    elementToMessage.set(newContentElement, this);
    this.formattedCommand = document.createElement("span");
    this.formattedCommand.classList.add("source-code");
    this.formattedCommand.textContent = Platform2.StringUtilities.replaceControlCharacters(this.text);
    newContentElement.appendChild(this.formattedCommand);
    if (this.formattedCommand.textContent.length < MaxLengthToIgnoreHighlighter) {
      void CodeHighlighter.CodeHighlighter.highlightNode(this.formattedCommand, "text/javascript").then(this.updateSearch.bind(this));
    } else {
      this.updateSearch();
    }
    this.updateTimestamp();
    return newContentElement;
  }
  updateSearch() {
    this.setSearchRegex(this.searchRegex());
  }
};
var ConsoleCommandResult = class extends ConsoleViewMessage {
  contentElement() {
    const element = super.contentElement();
    if (!element.classList.contains("console-user-command-result")) {
      element.classList.add("console-user-command-result");
      if (this.consoleMessage().level === Log.LogEntryLevel.Info) {
        const icon = new Icon();
        icon.name = "chevron-left-dot";
        icon.classList.add("command-result-icon", "medium");
        element.insertBefore(icon, element.firstChild);
      }
    }
    return element;
  }
};
var ConsoleTableMessageView = class extends ConsoleViewMessage {
  dataGrid;
  constructor(consoleMessage, linkifier, requestResolver, issueResolver, onResize) {
    super(consoleMessage, linkifier, requestResolver, issueResolver, onResize);
    console.assert(consoleMessage.type === Runtime.ConsoleAPICalledEventType.Table);
    this.dataGrid = null;
  }
  wasShown() {
    if (this.dataGrid) {
      this.dataGrid.updateWidths();
    }
    super.wasShown();
  }
  onResize() {
    if (!this.isVisible()) {
      return;
    }
    if (this.dataGrid) {
      this.dataGrid.onResize();
    }
  }
  contentElement() {
    const contentElement = this.getContentElement();
    if (contentElement) {
      return contentElement;
    }
    const newContentElement = document.createElement("div");
    newContentElement.classList.add("console-message");
    if (this.messageIcon) {
      newContentElement.appendChild(this.messageIcon);
    }
    this.setContentElement(newContentElement);
    newContentElement.appendChild(this.buildTableMessage());
    this.updateTimestamp();
    return newContentElement;
  }
  buildTableMessage() {
    const formattedMessage = document.createElement("span");
    formattedMessage.classList.add("source-code");
    this.anchorElement = this.buildMessageAnchor();
    if (this.anchorElement) {
      formattedMessage.appendChild(this.anchorElement);
    }
    const table = this.message.parameters?.length ? this.message.parameters[0] : null;
    if (!table) {
      return this.buildMessage();
    }
    const actualTable = parameterToRemoteObject(this.message.runtimeModel())(table);
    if (!actualTable?.preview) {
      return this.buildMessage();
    }
    const rawValueColumnSymbol = /* @__PURE__ */ Symbol("rawValueColumn");
    const columnNames = [];
    const preview = actualTable.preview;
    const rows = [];
    for (let i = 0; i < preview.properties.length; ++i) {
      const rowProperty = preview.properties[i];
      let rowSubProperties;
      if (rowProperty.valuePreview?.properties.length) {
        rowSubProperties = rowProperty.valuePreview.properties;
      } else if (rowProperty.value || rowProperty.value === "") {
        rowSubProperties = [{ name: rawValueColumnSymbol, type: rowProperty.type, value: rowProperty.value }];
      } else {
        continue;
      }
      const rowValue = /* @__PURE__ */ new Map();
      const maxColumnsToRender = 20;
      for (let j = 0; j < rowSubProperties.length; ++j) {
        const cellProperty = rowSubProperties[j];
        let columnRendered = columnNames.indexOf(cellProperty.name) !== -1;
        if (!columnRendered) {
          if (columnNames.length === maxColumnsToRender) {
            continue;
          }
          columnRendered = true;
          columnNames.push(cellProperty.name);
        }
        if (columnRendered) {
          const cellElement = this.renderPropertyPreviewOrAccessor(actualTable, cellProperty, [rowProperty, cellProperty]).firstElementChild;
          cellElement.classList.add("console-message-nowrap-below");
          rowValue.set(cellProperty.name, cellElement);
        }
      }
      rows.push({ rowName: rowProperty.name, rowValue });
    }
    const flatValues = [];
    for (const { rowName, rowValue } of rows) {
      flatValues.push(rowName);
      for (let j = 0; j < columnNames.length; ++j) {
        flatValues.push(rowValue.get(columnNames[j]));
      }
    }
    columnNames.unshift(i18nString2(UIStrings2.index));
    const columnDisplayNames = columnNames.map((name) => name === rawValueColumnSymbol ? i18nString2(UIStrings2.value) : name.toString());
    if (flatValues.length) {
      this.dataGrid = DataGrid.SortableDataGrid.SortableDataGrid.create(
        columnDisplayNames,
        flatValues,
        i18nString2(UIStrings2.console)
      );
      if (this.dataGrid) {
        this.dataGrid.setStriped(true);
        this.dataGrid.setFocusable(false);
        this.dataGrid.setTableContextMenuCallback(this.populateTableContextMenu.bind(this));
        const formattedResult = document.createElement("span");
        formattedResult.classList.add("console-message-text");
        const tableElement = formattedResult.createChild("div", "console-message-formatted-table");
        const dataGridContainer = tableElement.createChild("span");
        appendOrShow(tableElement, this.formatParameter(actualTable, true, false));
        const shadowRoot = dataGridContainer.attachShadow({ mode: "open" });
        const dataGridWidget = this.dataGrid.asWidget();
        dataGridWidget.markAsRoot();
        dataGridWidget.show(shadowRoot);
        dataGridWidget.registerRequiredCSS(consoleView_css_default, objectValue_css_default);
        formattedMessage.appendChild(formattedResult);
        this.dataGrid.renderInline();
      }
    }
    return formattedMessage;
  }
  approximateFastHeight() {
    const table = this.message.parameters?.[0];
    if (table && typeof table !== "string" && table.preview) {
      return defaultConsoleRowHeight * table.preview.properties.length;
    }
    return defaultConsoleRowHeight;
  }
  populateTableContextMenu(contextMenu) {
    const copySubMenu = contextMenu.clipboardSection().appendSubMenuItem(i18nString2(UIStrings2.copyTableAs));
    copySubMenu.defaultSection().appendItem(
      i18nString2(UIStrings2.copyAsMarkdown),
      this.copyTableAsMarkdown.bind(this),
      { jslogContext: "copy-as-markdown" }
    );
    copySubMenu.defaultSection().appendItem(
      i18nString2(UIStrings2.copyAsCsv),
      this.copyTableAsCSV.bind(this),
      { jslogContext: "copy-as-csv" }
    );
  }
  copyTableAsMarkdown() {
    if (!this.dataGrid) {
      return;
    }
    const markdown = DataGrid.DataGridExporter.exportToMarkdown(this.dataGrid);
    UI3.UIUtils.copyTextToClipboard(markdown);
  }
  copyTableAsCSV() {
    if (!this.dataGrid) {
      return;
    }
    const csv = DataGrid.DataGridExporter.exportToCSV(this.dataGrid);
    UI3.UIUtils.copyTextToClipboard(csv);
  }
  getDataGridForTest() {
    return this.dataGrid;
  }
  populateTableContextMenuForTest(contextMenu) {
    this.populateTableContextMenu(contextMenu);
  }
};
var MaxLengthToIgnoreHighlighter = 1e4;
var maxTokenizableStringLength = 1e4;
var longStringVisibleLength = 5e3;
var getMaxTokenizableStringLength = () => {
  return maxTokenizableStringLength;
};
var setMaxTokenizableStringLength = (length) => {
  maxTokenizableStringLength = length;
};
var getLongStringVisibleLength = () => {
  return longStringVisibleLength;
};
var setLongStringVisibleLength = (length) => {
  longStringVisibleLength = length;
};

// ../../front_end/panels/console/PromptBuilder.ts
var PromptBuilder_exports = {};
__export(PromptBuilder_exports, {
  PromptBuilder: () => PromptBuilder,
  SourceType: () => SourceType,
  allowHeader: () => allowHeader,
  formatConsoleMessage: () => formatConsoleMessage,
  formatNetworkRequest: () => formatNetworkRequest,
  formatRelatedCode: () => formatRelatedCode,
  lineWhitespace: () => lineWhitespace
});
import * as SDK4 from "../../core/sdk/sdk.js";
import * as TextUtils5 from "../../core/text_utils/text_utils.js";
import * as AiAssistanceModel2 from "../../models/ai_assistance/ai_assistance.js";
import * as Bindings3 from "../../models/bindings/bindings.js";
import * as Formatter from "../../models/formatter/formatter.js";
import * as Logs2 from "../../models/logs/logs.js";
import * as Components3 from "../../ui/legacy/components/utils/utils.js";
import * as UI4 from "../../ui/legacy/legacy.js";
var MAX_MESSAGE_SIZE = 1e3;
var MAX_STACK_TRACE_SIZE = 1e3;
var MAX_CODE_SIZE = 1e3;
var SourceType = /* @__PURE__ */ ((SourceType2) => {
  SourceType2["MESSAGE"] = "message";
  SourceType2["STACKTRACE"] = "stacktrace";
  SourceType2["NETWORK_REQUEST"] = "networkRequest";
  SourceType2["RELATED_CODE"] = "relatedCode";
  return SourceType2;
})(SourceType || {});
var PromptBuilder = class {
  #consoleMessage;
  constructor(consoleMessage) {
    this.#consoleMessage = consoleMessage;
  }
  async getNetworkRequest() {
    const requestId = this.#consoleMessage.consoleMessage().getAffectedResources()?.requestId;
    if (!requestId) {
      return;
    }
    const log = Logs2.NetworkLog.NetworkLog.instance();
    return log.requestsForId(requestId)[0];
  }
  /**
   * Gets the source file associated with the top of the message's stacktrace.
   * Returns an empty string if the source is not available for any reasons.
   */
  async getMessageSourceCode() {
    const callframe = this.#consoleMessage.consoleMessage().stackTrace?.callFrames[0];
    const runtimeModel = this.#consoleMessage.consoleMessage().runtimeModel();
    const debuggerModel = runtimeModel?.debuggerModel();
    if (!debuggerModel || !runtimeModel || !callframe) {
      return { text: "", columnNumber: 0, lineNumber: 0 };
    }
    const rawLocation = new SDK4.DebuggerModel.Location(debuggerModel, callframe.scriptId, callframe.lineNumber, callframe.columnNumber);
    const mappedLocation = await Bindings3.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().rawLocationToUILocation(
      rawLocation
    );
    const content = await mappedLocation?.uiSourceCode.requestContentData().then(
      (contentDataOrError) => TextUtils5.ContentData.ContentData.asDeferredContent(contentDataOrError)
    );
    const text = !content?.isEncoded && content?.content ? content.content : "";
    const firstNewline = text.indexOf("\n");
    if (text.length > MAX_CODE_SIZE && (firstNewline < 0 || firstNewline > MAX_CODE_SIZE)) {
      const settings = runtimeModel.target().targetManager().settings;
      const { formattedContent, formattedMapping } = await Formatter.ScriptFormatter.formatScriptContent(
        settings,
        mappedLocation?.uiSourceCode.mimeType() ?? "text/javascript",
        text
      );
      const [lineNumber, columnNumber] = formattedMapping.originalToFormatted(mappedLocation?.lineNumber ?? 0, mappedLocation?.columnNumber ?? 0);
      return { text: formattedContent, columnNumber, lineNumber };
    }
    return { text, columnNumber: mappedLocation?.columnNumber ?? 0, lineNumber: mappedLocation?.lineNumber ?? 0 };
  }
  async buildPrompt(sourcesTypes = Object.values(SourceType)) {
    const [sourceCode, request] = await Promise.all([
      sourcesTypes.includes("relatedCode" /* RELATED_CODE */) ? this.getMessageSourceCode() : void 0,
      sourcesTypes.includes("networkRequest" /* NETWORK_REQUEST */) ? this.getNetworkRequest() : void 0
    ]);
    const relatedCode = sourceCode?.text ? formatRelatedCode(sourceCode) : "";
    const relatedRequest = request ? formatNetworkRequest(request) : "";
    const stacktrace = sourcesTypes.includes("stacktrace" /* STACKTRACE */) ? await formatStackTrace(this.#consoleMessage) : "";
    const message = formatConsoleMessage(this.#consoleMessage);
    const prompt = this.formatPrompt({
      message: [message, stacktrace].join("\n").trim(),
      relatedCode,
      relatedRequest
    });
    const sources = [
      {
        type: "message" /* MESSAGE */,
        value: message
      }
    ];
    if (stacktrace) {
      sources.push({
        type: "stacktrace" /* STACKTRACE */,
        value: stacktrace
      });
    }
    if (relatedCode) {
      sources.push({
        type: "relatedCode" /* RELATED_CODE */,
        value: relatedCode
      });
    }
    if (relatedRequest) {
      sources.push({
        type: "networkRequest" /* NETWORK_REQUEST */,
        value: relatedRequest
      });
    }
    return {
      prompt,
      sources,
      isPageReloadRecommended: sourcesTypes.includes("networkRequest" /* NETWORK_REQUEST */) && Boolean(this.#consoleMessage.consoleMessage().getAffectedResources()?.requestId) && !relatedRequest
    };
  }
  formatPrompt({ message, relatedCode, relatedRequest }) {
    let prompt = `Please explain the following console error or warning:

\`\`\`
${message}
\`\`\``;
    if (relatedCode) {
      prompt += `
For the following code:

\`\`\`
${relatedCode}
\`\`\``;
    }
    if (relatedRequest) {
      prompt += `
For the following network request:

\`\`\`
${relatedRequest}
\`\`\``;
    }
    return prompt;
  }
  getSearchQuery() {
    let message = this.#consoleMessage.toMessageTextString();
    if (message) {
      message = message.split("\n")[0];
    }
    return message;
  }
};
function allowHeader(header) {
  const normalizedName = header.name.toLowerCase().trim();
  if (normalizedName.startsWith("x-")) {
    return false;
  }
  if (normalizedName === "cookie" || normalizedName === "set-cookie") {
    return false;
  }
  if (normalizedName === "authorization") {
    return false;
  }
  return true;
}
function lineWhitespace(line) {
  const matches = /^\s*/.exec(line);
  if (!matches?.length) {
    return null;
  }
  const whitespace = matches[0];
  if (whitespace === line) {
    return null;
  }
  return whitespace;
}
function formatRelatedCode({ text, columnNumber, lineNumber }, maxCodeSize = MAX_CODE_SIZE) {
  const lines = text.split("\n");
  if (lines[lineNumber].length >= maxCodeSize / 2) {
    const start = Math.max(columnNumber - maxCodeSize / 2, 0);
    const end = Math.min(columnNumber + maxCodeSize / 2, lines[lineNumber].length);
    return lines[lineNumber].substring(start, end);
  }
  let relatedCodeSize = 0;
  let currentLineNumber = lineNumber;
  let currentWhitespace = lineWhitespace(lines[lineNumber]);
  const startByPrefix = /* @__PURE__ */ new Map();
  while (lines[currentLineNumber] !== void 0 && relatedCodeSize + lines[currentLineNumber].length <= maxCodeSize / 2) {
    const whitespace = lineWhitespace(lines[currentLineNumber]);
    if (whitespace !== null && currentWhitespace !== null && (whitespace === currentWhitespace || !whitespace.startsWith(currentWhitespace))) {
      if (!/^\s*[\}\)\]]/.exec(lines[currentLineNumber])) {
        startByPrefix.set(whitespace, currentLineNumber);
      }
      currentWhitespace = whitespace;
    }
    relatedCodeSize += lines[currentLineNumber].length + 1;
    currentLineNumber--;
  }
  currentLineNumber = lineNumber + 1;
  let startLine = lineNumber;
  let endLine = lineNumber;
  currentWhitespace = lineWhitespace(lines[lineNumber]);
  while (lines[currentLineNumber] !== void 0 && relatedCodeSize + lines[currentLineNumber].length <= maxCodeSize) {
    relatedCodeSize += lines[currentLineNumber].length;
    const whitespace = lineWhitespace(lines[currentLineNumber]);
    if (whitespace !== null && currentWhitespace !== null && (whitespace === currentWhitespace || !whitespace.startsWith(currentWhitespace))) {
      const nextLine = lines[currentLineNumber + 1];
      const nextWhitespace = nextLine ? lineWhitespace(nextLine) : null;
      if (!nextWhitespace || nextWhitespace === whitespace || !nextWhitespace.startsWith(whitespace)) {
        if (startByPrefix.has(whitespace)) {
          startLine = startByPrefix.get(whitespace) ?? 0;
          endLine = currentLineNumber;
        }
      }
      currentWhitespace = whitespace;
    }
    currentLineNumber++;
  }
  return lines.slice(startLine, endLine + 1).join("\n");
}
function formatLines(title, lines, maxLength) {
  let result = "";
  for (const line of lines) {
    if (result.length + line.length > maxLength) {
      break;
    }
    result += line;
  }
  result = result.trim();
  return result && title ? title + "\n" + result : result;
}
function formatNetworkRequest(request) {
  return `Request: ${request.url()}

${AiAssistanceModel2.NetworkRequestFormatter.NetworkRequestFormatter.formatHeaders(
    "Request headers:",
    request.requestHeaders()
  )}

${AiAssistanceModel2.NetworkRequestFormatter.NetworkRequestFormatter.formatHeaders(
    "Response headers:",
    request.responseHeaders
  )}

Response status: ${request.statusCode} ${request.statusText}`;
}
function formatConsoleMessage(message) {
  return message.toMessageTextString().substr(0, MAX_MESSAGE_SIZE);
}
async function formatStackTrace(message) {
  const previewContainer = message.contentElement().querySelector(".stack-preview-container");
  if (!previewContainer) {
    return "";
  }
  const widget2 = UI4.Widget.Widget.get(previewContainer);
  if (!widget2) {
    return "";
  }
  await widget2.updateComplete;
  const preview = widget2.contentElement.querySelector(".stack-preview-container");
  const nodes = preview.childTextNodes();
  const messageContent = nodes.filter((n) => {
    return !n.parentElement?.closest(".show-all-link,.show-less-link,.hidden-row");
  }).map(Components3.Linkifier.Linkifier.untruncatedNodeText);
  return formatLines("", messageContent, MAX_STACK_TRACE_SIZE);
}

// ../../front_end/panels/console/ConsoleInsightTeaser.ts
var { render: render4, html: html4, Directives: { ref } } = Lit3;
var BUILT_IN_AI_DOCUMENTATION = "https://developer.chrome.com/docs/ai/built-in";
var UIStringsNotTranslate = {
  /**
   * @description Link text in the disclaimer dialog, linking to a settings page containing more information
   */
  learnMore: "Learn more",
  /**
   * @description Link text in the Console Insights Teaser info tooltip, linking to an explainer on how data is being used in this feature
   */
  learnMoreAboutAiSummaries: "Learn more about AI summaries",
  /**
   * @description Description of the console insights feature
   */
  freDisclaimerHeader: "Get explanations for console warnings and errors",
  /**
   * @description First item in the first-run experience dialog
   */
  freDisclaimerTextAiWontAlwaysGetItRight: "This feature uses AI and won\u2019t always get it right",
  /**
   * @description Explainer for which data is being sent by the console insights feature
   */
  consoleInsightsSendsData: "To generate explanations, the console message, associated stack trace, related source code, and the associated network headers are sent to Google. This data may be seen by human reviewers to improve this feature.",
  /**
   * @description Explainer for which data is being sent by the console insights feature
   */
  consoleInsightsSendsDataNoLogging: "To generate explanations, the console message, associated stack trace, related source code, and the associated network headers are sent to Google. This data will not be used to improve Google\u2019s AI models. Your organization may change these settings at any time.",
  /**
   * @description Third item in the first-run experience dialog
   */
  freDisclaimerTextUseWithCaution: "Use generated code snippets with caution",
  /**
   * @description Tooltip text for the console insights teaser
   */
  infoTooltipText: "The text above has been generated with AI on your local device. Clicking the button will send the console message, stack trace, related source code, and the associated network headers to Google to generate a more detailed explanation.",
  /**
   * @description Header text during loading state while an AI summary is being generated
   */
  summarizing: "Summarizing\u2026",
  /**
   * @description Header text during longer lasting loading state while an AI summary is being generated
   */
  summarizingTakesABitLonger: "Summarizing takes a bit longer\u2026",
  /**
   * @description Label for an animation shown while an AI response is being generated
   */
  loading: "Loading",
  /**
   * @description Label for a button which generates a more detailed explanation
   */
  tellMeMore: "Tell me more",
  /**
   * @description Label for a checkbox which turns off the teaser explanation feature
   */
  dontShow: "Don\u2019t show",
  /**
   * @description Aria-label for an infor-button triggering a tooltip with more info about data usage
   */
  learnDataUsage: "Learn more about how your data is used",
  /**
   * @description Header text if there was an error during AI summary generation
   */
  summaryNotAvailable: "Summary not available",
  /**
   * @description Header text informing the user that they can get an AI-generated explanation
   */
  getHelpForWarning: "Get help understanding this warning",
  /**
   * @description Header text informing the user that they can get an AI-generated explanation
   */
  getHelpForError: "Get help understanding this error",
  /**
   * @description Call to action for downloading an AI model
   */
  toUseDownload: "To use Chrome\u2019s Built-in AI here and elsewhere, download the AI model (~4 GB).",
  /**
   * @description Button text to trigger model download
   */
  downloadModel: "Download model",
  /**
   * @description Header text while the model download is in progress
   */
  downloadingAiModel: "Downloading AI model",
  /**
   * @description Label for a progress bar for the AI model download
   */
  progress: "Progress",
  /**
   * @description Progress indicator when the progress status is unknown. If the
   * progress status is known, this is replaced by a progress bar.
   */
  progressUnknown: "Progress: unknown"
};
var lockedString = i18n5.i18n.lockedString;
var CODE_SNIPPET_WARNING_URL = "https://support.google.com/legal/answer/13505487";
var DATA_USAGE_URL = "https://developer.chrome.com/docs/devtools/ai-assistance/get-started#data-use";
var EXPLAIN_TEASER_ACTION_ID = "explain.console-message.teaser";
var SLOW_GENERATION_CUTOFF_MILLISECONDS = 3500;
function renderNoModel(input) {
  return html4`
    <div class="teaser-tooltip-container">
      <div class="response-container">
        <h2>${input.isForWarning ? lockedString(UIStringsNotTranslate.getHelpForWarning) : lockedString(UIStringsNotTranslate.getHelpForError)}
        </h2>
        <div>You can get quick answers from <devtools-link
            jslogcontext="insights-teaser-built-in-ai-documentation"
            class="link"
            href=${BUILT_IN_AI_DOCUMENTATION}
          >
            Chrome’s Built-in AI
          </devtools-link>
          , without any data leaving your device.
        </div>
        <div>${lockedString(UIStringsNotTranslate.toUseDownload)}</div>
      </div>
      <div class="tooltip-footer">
        <devtools-button
          title=${lockedString(UIStringsNotTranslate.downloadModel)}
          .jslogContext=${"insights-teaser-download-model"}
          .variant=${Buttons.Button.Variant.PRIMARY}
          @click=${input.onDownloadModelClick}
          @focusout=${(e) => {
    e.stopPropagation();
  }}
        >
          ${lockedString(UIStringsNotTranslate.downloadModel)}
        </devtools-button>
        ${renderDontShowCheckbox(input)}
      </div>
    </div>
  `;
}
function renderDownloading(input) {
  const percent = ((input.downloadProgress || 0) * 100).toFixed(0);
  return html4`
    <div class="teaser-tooltip-container">
      <div class="response-container">
        <h2>${lockedString(UIStringsNotTranslate.downloadingAiModel)}</h2>
        <div class="progress-line">
          ${input.downloadProgress === null ? html4`
              <div class="label">${lockedString(UIStringsNotTranslate.progressUnknown)}</div>
            ` : html4`
              <div class="label">${lockedString(UIStringsNotTranslate.progress)}</div>
              <div class="indicator-container">
                <div
                  class="indicator"
                  role="progressbar"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-valuenow=${percent}
                  style="width: ${percent}%"
                ></div>
              </div>
          `}
        </div>
      </div>
      <div class="tooltip-footer">
        <devtools-button
          title=${lockedString(UIStringsNotTranslate.downloadModel)}
          .jslogContext=${"insights-teaser-download-model"}
          .variant=${Buttons.Button.Variant.PRIMARY}
          .disabled=${true}
        >
          ${lockedString(UIStringsNotTranslate.downloadModel)}
        </devtools-button>
      </div>
    </div>
  `;
}
function renderGenerating(input) {
  return html4`
    <div class="teaser-tooltip-container">
      <div class="response-container">
        <h2>${input.isSlowGeneration ? lockedString(UIStringsNotTranslate.summarizingTakesABitLonger) : lockedString(UIStringsNotTranslate.summarizing)}</h2>
        <div
          role="presentation"
          aria-label=${lockedString(UIStringsNotTranslate.loading)}
          class="loader"
          style="clip-path: url(${"#clipPath-" + input.uuid});"
        >
          <svg width="100%" height="58">
            <defs>
            <clipPath id=${"clipPath-" + input.uuid}>
              <rect x="0" y="0" width="100%" height="12" rx="8"></rect>
              <rect x="0" y="20" width="100%" height="12" rx="8"></rect>
              <rect x="0" y="40" width="100%" height="12" rx="8"></rect>
            </clipPath>
          </defs>
          </svg>
        </div>
      </div>
      ${renderFooter(input)}
    </div>
  `;
}
function renderError(input) {
  return html4`
    <div class="teaser-tooltip-container">
      <h2>${lockedString(UIStringsNotTranslate.summaryNotAvailable)}</h2>
      ${renderFooter(input)}
    </div>
  `;
}
function renderDontShowCheckbox(input) {
  return html4`
    <devtools-checkbox
      aria-label=${lockedString(UIStringsNotTranslate.dontShow)}
      @change=${input.dontShowChanged}
      jslog=${VisualLogging2.toggle("explain.teaser.dont-show").track({ change: true })}>
      ${lockedString(UIStringsNotTranslate.dontShow)}
    </devtools-checkbox>
  `;
}
function renderFooter(input) {
  return html4`
    <div class="tooltip-footer">
      ${input.hasTellMeMoreButton ? html4`
        <devtools-button
          title=${lockedString(UIStringsNotTranslate.tellMeMore)}
          .jslogContext=${"insights-teaser-tell-me-more"}
          .variant=${Buttons.Button.Variant.PRIMARY}
          @click=${input.onTellMeMoreClick}
        >
          <devtools-icon class="lightbulb-icon" name="lightbulb-spark"></devtools-icon>
          ${lockedString(UIStringsNotTranslate.tellMeMore)}
        </devtools-button>
      ` : Lit3.nothing}
      <devtools-button
        .iconName=${"info"}
        .variant=${Buttons.Button.Variant.ICON}
        aria-details=${"teaser-info-tooltip-" + input.uuid}
        .accessibleLabel=${lockedString(UIStringsNotTranslate.learnDataUsage)}
      ></devtools-button>
      <devtools-tooltip
        id=${"teaser-info-tooltip-" + input.uuid}
        variant="rich"
        jslogContext="teaser-info-tooltip"
        trigger="both"
        hover-delay=500
      >
        <div class="info-tooltip-text">${lockedString(UIStringsNotTranslate.infoTooltipText)}</div>
        <div class="learn-more">
          <devtools-link
            class="devtools-link"
            title=${lockedString(UIStringsNotTranslate.learnMoreAboutAiSummaries)}
            href=${DATA_USAGE_URL}
            jslogcontext="explain.teaser.learn-more"
          >${lockedString(UIStringsNotTranslate.learnMoreAboutAiSummaries)}</devtools-link>
        </div>
      </devtools-tooltip>
      ${renderDontShowCheckbox(input)}
    </div>
  `;
}
function renderTeaser(input) {
  return html4`
    <div class="teaser-tooltip-container">
      <div class="response-container">
        <h2>${input.headerText}</h2>
        <div class="main-text">${input.mainText}</div>
      </div>
      ${renderFooter(input)}
    </div>
  `;
}
var DEFAULT_VIEW3 = (input, output, target) => {
  if (input.isInactive) {
    render4(Lit3.nothing, target);
    return;
  }
  render4(html4`
    <style>${consoleInsightTeaser_css_default}</style>
    <devtools-tooltip
      ${ref((element) => {
    output.tooltip = element;
  })}
      id=${"teaser-" + input.uuid}
      hover-delay=1000
      variant="rich"
      vertical-distance-increase=-6
      prefer-span-left
      jslogContext="console-insight-teaser"
    >
      ${(() => {
    switch (input.state) {
      case "no-model" /* NO_MODEL */:
        return renderNoModel(input);
      case "downloading" /* DOWNLOADING */:
        return renderDownloading(input);
      case "ready" /* READY */:
      case "generating" /* GENERATING */:
        return renderGenerating(input);
      case "error" /* ERROR */:
        return renderError(input);
      case "partial-teaser" /* PARTIAL_TEASER */:
      case "teaser" /* TEASER */:
        return renderTeaser(input);
    }
  })()}
    </devtools-tooltip>
  `, target);
};
var ConsoleInsightTeaser = class extends UI5.Widget.Widget {
  #view;
  #uuid;
  #builtInAi;
  #promptBuilder;
  #headerText = "";
  #mainText = "";
  #consoleViewMessage;
  #isInactive = false;
  #abortController = null;
  #isSlow = false;
  #timeoutId = null;
  #aidaAvailability;
  #boundOnAidaAvailabilityChange;
  #boundOnDownloadProgressChange;
  #boundOnSessionCreation;
  #downloadProgress = null;
  #state;
  #eventListeners = [];
  #isForWarning;
  #callShowTooltip = false;
  #startTime = 0;
  constructor(uuid, consoleViewMessage, element, view, builtInAi = AiAssistanceModel3.BuiltInAi.BuiltInAi.instance()) {
    super(element);
    this.#view = view ?? DEFAULT_VIEW3;
    this.#uuid = uuid;
    this.#promptBuilder = new PromptBuilder(consoleViewMessage);
    this.#consoleViewMessage = consoleViewMessage;
    this.#isForWarning = this.#consoleViewMessage.consoleMessage().level === Log.LogEntryLevel.Warning;
    this.#boundOnAidaAvailabilityChange = this.#onAidaAvailabilityChange.bind(this);
    this.#boundOnDownloadProgressChange = this.#onDownloadProgressChange.bind(this);
    this.#boundOnSessionCreation = this.#onSessionCreation.bind(this);
    this.#builtInAi = builtInAi;
    this.#state = this.#builtInAi.hasSession() ? "ready" /* READY */ : "no-model" /* NO_MODEL */;
    this.#callShowTooltip = true;
    this.requestUpdate();
  }
  #getConsoleInsightsEnabledSetting() {
    return new AiAssistanceModel3.AiSetting.AiSetting(
      AiAssistanceModel3.AiUtils.consoleInsightsEnabledSettingDescriptor,
      Host2.AidaClient.HostConfigTracker.instance(),
      Common3.Settings.Settings.instance()
    );
  }
  #getOnboardingCompletedSetting() {
    return Common3.Settings.Settings.instance().createLocalSetting("console-insights-onboarding-finished", true);
  }
  #updateAidaAvailability(aidaAvailability) {
    if (aidaAvailability !== this.#aidaAvailability) {
      this.#aidaAvailability = aidaAvailability;
      this.requestUpdate();
    }
  }
  #onAidaAvailabilityChange(ev) {
    this.#updateAidaAvailability(ev.data);
  }
  #executeConsoleInsightAction() {
    UI5.Context.Context.instance().setFlavor(ConsoleViewMessage, this.#consoleViewMessage);
    const action2 = UI5.ActionRegistry.ActionRegistry.instance().getAction(EXPLAIN_TEASER_ACTION_ID);
    void action2.execute();
  }
  #onTellMeMoreClick(event) {
    event.stopPropagation();
    if (this.#getConsoleInsightsEnabledSetting()?.getIfNotDisabled() && this.#getOnboardingCompletedSetting()?.get()) {
      this.#executeConsoleInsightAction();
      return;
    }
    void this.#showFreDialog();
  }
  #onDownloadModelClick(event) {
    event.stopPropagation();
    this.#state = "downloading" /* DOWNLOADING */;
    this.#builtInAi.startDownloadingModel();
    Host2.userMetrics.actionTaken(Host2.UserMetrics.Action.InsightTeaserModelDownloadStarted);
    this.requestUpdate();
  }
  #onDownloadProgressChange(event) {
    this.#downloadProgress = event.data;
    this.requestUpdate();
  }
  #onSessionCreation() {
    if (this.#builtInAi.hasSession() && (this.#state === "no-model" /* NO_MODEL */ || this.#state === "downloading" /* DOWNLOADING */)) {
      this.#state = "ready" /* READY */;
      Host2.userMetrics.actionTaken(Host2.UserMetrics.Action.InsightTeaserModelDownloadCompleted);
      this.maybeGenerateTeaser();
    }
  }
  async #showFreDialog() {
    const noLogging = Root.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue === Root.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING;
    const iconName = AiAssistanceModel3.AiUtils.getIconName();
    const result = await Dialogs.FreDialog.FreDialog.show({
      header: { iconName, text: lockedString(UIStringsNotTranslate.freDisclaimerHeader) },
      reminderItems: [
        {
          iconName: "psychiatry",
          content: lockedString(UIStringsNotTranslate.freDisclaimerTextAiWontAlwaysGetItRight)
        },
        {
          iconName: "google",
          content: noLogging ? lockedString(UIStringsNotTranslate.consoleInsightsSendsDataNoLogging) : lockedString(UIStringsNotTranslate.consoleInsightsSendsData)
        },
        {
          iconName: "warning",
          // clang-format off
          content: html4`<devtools-link
            href=${CODE_SNIPPET_WARNING_URL}
            class="link devtools-link"
            jslogcontext="explain.teaser.code-snippets-explainer"
          >${lockedString(UIStringsNotTranslate.freDisclaimerTextUseWithCaution)}</devtools-link>`
          // clang-format on
        }
      ],
      onLearnMoreClick: () => {
        void UI5.ViewManager.ViewManager.instance().showView("chrome-ai");
      },
      ariaLabel: lockedString(UIStringsNotTranslate.freDisclaimerHeader),
      learnMoreButtonText: lockedString(UIStringsNotTranslate.learnMore)
    });
    if (result) {
      this.#getConsoleInsightsEnabledSetting()?.set(true);
      this.#getOnboardingCompletedSetting()?.set(true);
      this.#executeConsoleInsightAction();
    }
  }
  maybeGenerateTeaser() {
    const startGeneratingTeaser = () => {
      if (!this.#isInactive && Common3.Settings.Settings.instance().moduleSetting("console-insight-teasers-enabled").get()) {
        void this.#generateTeaserText();
      }
    };
    const hasSession = this.#builtInAi.hasSession();
    switch (this.#state) {
      case "no-model" /* NO_MODEL */:
      case "downloading" /* DOWNLOADING */:
        if (hasSession) {
          this.#state = "ready" /* READY */;
          startGeneratingTeaser();
        } else {
          if (this.#eventListeners.length === 0) {
            this.#eventListeners = [
              this.#builtInAi.addEventListener(
                AiAssistanceModel3.BuiltInAi.Events.DOWNLOAD_PROGRESS_CHANGED,
                this.#boundOnDownloadProgressChange
              ),
              this.#builtInAi.addEventListener(
                AiAssistanceModel3.BuiltInAi.Events.DOWNLOADED_AND_SESSION_CREATED,
                this.#boundOnSessionCreation
              )
            ];
          }
          if (this.#builtInAi.isDownloading()) {
            this.#state = "downloading" /* DOWNLOADING */;
            this.#downloadProgress = this.#builtInAi.getDownloadProgress();
          }
        }
        this.requestUpdate();
        return;
      case "ready" /* READY */:
        startGeneratingTeaser();
        this.requestUpdate();
        return;
      case "generating" /* GENERATING */:
        console.error('Trying trigger teaser generation when state is "GENERATING"');
        return;
      case "partial-teaser" /* PARTIAL_TEASER */:
        console.error('Trying trigger teaser generation when state is "PARTIAL_TEASER"');
        return;
      // These are terminal states. No need to update anything.
      case "teaser" /* TEASER */:
      case "error" /* ERROR */:
        return;
    }
  }
  abortTeaserGeneration() {
    if (this.#abortController) {
      this.#abortController.abort();
    }
    if (this.#state === "generating" /* GENERATING */ || this.#state === "partial-teaser" /* PARTIAL_TEASER */) {
      if (this.#startTime) {
        if (this.#mainText) {
          Host2.userMetrics.consoleInsightTeaserAbortedAfterFirstCharacter(performance.now() - this.#startTime);
        } else {
          Host2.userMetrics.consoleInsightTeaserAbortedBeforeFirstCharacter(performance.now() - this.#startTime);
        }
      }
      this.#mainText = "";
      this.#state = "ready" /* READY */;
      Host2.userMetrics.actionTaken(Host2.UserMetrics.Action.InsightTeaserGenerationAborted);
    }
    if (this.#timeoutId) {
      clearTimeout(this.#timeoutId);
    }
    Common3.EventTarget.removeEventListeners(this.#eventListeners);
    return { okToRemove: this.#state !== "teaser" /* TEASER */ };
  }
  setInactive(isInactive) {
    if (this.#isInactive === isInactive) {
      return;
    }
    this.#isInactive = isInactive;
    this.requestUpdate();
  }
  #setSlow() {
    this.#isSlow = true;
    this.requestUpdate();
  }
  async #generateTeaserText() {
    this.#headerText = this.#consoleViewMessage.toMessageTextString().substring(0, 70);
    this.#state = "generating" /* GENERATING */;
    Host2.userMetrics.actionTaken(Host2.UserMetrics.Action.InsightTeaserGenerationStarted);
    this.#timeoutId = setTimeout(this.#setSlow.bind(this), SLOW_GENERATION_CUTOFF_MILLISECONDS);
    this.#startTime = performance.now();
    let teaserText = "";
    let firstChunkReceived = false;
    let firstChunkTime = 0;
    try {
      for await (const chunk of this.#getOnDeviceInsight()) {
        teaserText += chunk;
        this.#mainText = teaserText;
        this.#state = "partial-teaser" /* PARTIAL_TEASER */;
        this.requestUpdate();
        if (!firstChunkReceived) {
          firstChunkReceived = true;
          firstChunkTime = performance.now();
          Host2.userMetrics.consoleInsightTeaserFirstChunkGenerated(firstChunkTime - this.#startTime);
          Host2.userMetrics.consoleInsightTeaserFirstChunkGeneratedMedium(firstChunkTime - this.#startTime);
        }
      }
    } catch (err) {
      if (err.name === "AbortError") {
        this.#state = "ready" /* READY */;
      } else {
        console.error(err.name, err.message);
        this.#state = "error" /* ERROR */;
        Host2.userMetrics.actionTaken(Host2.UserMetrics.Action.InsightTeaserGenerationErrored);
      }
      clearTimeout(this.#timeoutId);
      this.requestUpdate();
      return;
    }
    clearTimeout(this.#timeoutId);
    const duration = performance.now() - this.#startTime;
    Host2.userMetrics.consoleInsightTeaserGenerated(duration);
    Host2.userMetrics.consoleInsightTeaserGeneratedMedium(duration);
    Host2.userMetrics.consoleInsightTeaserChunkToEndMedium(performance.now() - firstChunkTime);
    if (teaserText.length > 300) {
      Host2.userMetrics.consoleInsightLongTeaserGenerated(duration);
    } else {
      Host2.userMetrics.consoleInsightShortTeaserGenerated(duration);
    }
    this.#state = "teaser" /* TEASER */;
    this.#mainText = teaserText;
    Host2.userMetrics.actionTaken(Host2.UserMetrics.Action.InsightTeaserGenerationCompleted);
    this.requestUpdate();
  }
  async *#getOnDeviceInsight() {
    const { prompt } = await this.#promptBuilder.buildPrompt();
    this.#abortController = new AbortController();
    const stream = this.#builtInAi.getConsoleInsight(prompt, this.#abortController);
    for await (const chunk of stream) {
      yield chunk;
    }
    this.#abortController = null;
  }
  #dontShowChanged(e) {
    const showTeasers = !e.target.checked;
    Common3.Settings.Settings.instance().moduleSetting("console-insight-teasers-enabled").set(showTeasers);
  }
  #hasTellMeMoreButton() {
    if (!UI5.ActionRegistry.ActionRegistry.instance().hasAction(EXPLAIN_TEASER_ACTION_ID)) {
      return false;
    }
    if (Root.Runtime.hostConfig.aidaAvailability?.blockedByAge || Root.Runtime.hostConfig.isOffTheRecord) {
      return false;
    }
    if (this.#aidaAvailability !== Host2.AidaClient.AidaAccessPreconditions.AVAILABLE) {
      return false;
    }
    return true;
  }
  performUpdate() {
    const output = {};
    this.#view(
      {
        onTellMeMoreClick: this.#onTellMeMoreClick.bind(this),
        uuid: this.#uuid,
        headerText: this.#headerText,
        mainText: this.#mainText,
        isInactive: this.#isInactive || !Common3.Settings.Settings.instance().moduleSetting("console-insight-teasers-enabled").get(),
        dontShowChanged: this.#dontShowChanged.bind(this),
        hasTellMeMoreButton: this.#hasTellMeMoreButton(),
        isSlowGeneration: this.#isSlow,
        onDownloadModelClick: this.#onDownloadModelClick.bind(this),
        downloadProgress: this.#downloadProgress,
        state: this.#state,
        isForWarning: this.#isForWarning
      },
      output,
      this.contentElement
    );
    if (this.#callShowTooltip && output.tooltip?.hasAttribute("popover")) {
      output.tooltip.showTooltip();
    }
    this.#callShowTooltip = false;
  }
  wasShown() {
    super.wasShown();
    Host2.AidaClient.HostConfigTracker.instance().addEventListener(
      Host2.AidaClient.Events.AIDA_AVAILABILITY_CHANGED,
      this.#boundOnAidaAvailabilityChange
    );
    const initialAvailability = Host2.AidaClient.HostConfigTracker.instance().aidaAvailability;
    if (initialAvailability !== void 0) {
      this.#updateAidaAvailability(initialAvailability);
    }
  }
  willHide() {
    super.willHide();
    Host2.AidaClient.HostConfigTracker.instance().removeEventListener(
      Host2.AidaClient.Events.AIDA_AVAILABILITY_CHANGED,
      this.#boundOnAidaAvailabilityChange
    );
  }
};

// ../../front_end/panels/console/ConsolePinPane.ts
var ConsolePinPane_exports = {};
__export(ConsolePinPane_exports, {
  ConsolePin: () => ConsolePin,
  ConsolePinEvent: () => ConsolePinEvent,
  ConsolePinModel: () => ConsolePinModel,
  ConsolePinPane: () => ConsolePinPane,
  ConsolePinPresenter: () => ConsolePinPresenter,
  DEFAULT_PANE_VIEW: () => DEFAULT_PANE_VIEW,
  DEFAULT_VIEW: () => DEFAULT_VIEW4
});
import * as Common4 from "../../core/common/common.js";
import * as Host3 from "../../core/host/host.js";
import * as i18n7 from "../../core/i18n/i18n.js";
import * as Platform3 from "../../core/platform/platform.js";
import * as Root2 from "../../core/root/root.js";
import * as SDK5 from "../../core/sdk/sdk.js";
import * as CodeMirror from "../../third_party/codemirror.next/codemirror.next.js";
import * as Buttons2 from "../../ui/components/buttons/buttons.js";
import * as Dialogs2 from "../../ui/components/dialogs/dialogs.js";
import * as TextEditor from "../../ui/components/text_editor/text_editor.js";
import * as ObjectUI3 from "../../ui/legacy/components/object_ui/object_ui.js";
import * as UI6 from "../../ui/legacy/legacy.js";
import { Directives, html as html5, nothing as nothing5, render as render5 } from "../../ui/lit/lit.js";
import * as VisualLogging3 from "../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/console/consolePinPane.css.js
var consolePinPane_css_default = `/*
 * Copyright 2018 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.close-button {
  position: absolute;
  top: var(--sys-size-4);
  left: var(--sys-size-2);
}

.console-pins {
  max-height: 200px;
  overflow-y: auto;
  background: var(--sys-color-cdt-base-container);

  --override-error-text-color: var(--sys-color-on-error-container);
}

.console-pins:not(:empty) {
  border-bottom: var(--sys-size-1) solid var(--sys-color-divider);
}

.console-pin {
  position: relative;
  user-select: text;
  flex: none;
  padding: var(--sys-size-2) 0 var(--sys-size-4) var(--sys-size-11);
}

.console-pin:not(:last-child) {
  border-bottom: var(--sys-size-1) solid var(--sys-color-divider);
}

.console-pin.error-level:not(:focus-within) {
  background-color: var(--sys-color-surface-error);
  color: var(--override-error-text-color);
}

.console-pin:not(:last-child).error-level:not(:focus-within) {
  border-top: var(--sys-size-1) solid var(--sys-color-error-outline);
  border-bottom: var(--sys-size-1) solid var(--sys-color-error-outline);
  margin-top: calc(-1 * var(--sys-size-1));
}

.console-pin-name {
  margin-left: -5px;
  margin-bottom: var(--sys-size-1);
  height: auto;
}

.console-pin-name,
.console-pin-preview {
  width: 100%;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-height: 13px;
}

.console-pin-preview {
  overflow: hidden;
}

.console-pin-name:focus-within {
  background: var(--sys-color-cdt-base-container);
  border-radius: var(--sys-shape-corner-extra-small);
  border: var(--sys-size-1) solid var(--sys-color-state-focus-ring);
}

.console-pin:focus-within .console-pin-preview,
.console-pin-name:not(:focus-within, :hover) {
  opacity: 60%;
}

/*# sourceURL=${import.meta.resolve("./consolePinPane.css")} */`;

// ../../front_end/panels/console/ConsolePinPane.ts
var { createRef, ref: ref2, repeat } = Directives;
var { widget } = UI6.Widget;
var UIStrings3 = {
  /**
   * @description A context menu item in the live expressions section of the Console panel.
   */
  removeExpression: "Remove expression",
  /**
   * @description A context menu item in the live expressions section of the Console panel.
   */
  removeAllExpressions: "Remove all expressions",
  /**
   * @description Screen reader label for delete button on a non-blank live expression.
   * @example {document} PH1
   */
  removeExpressionS: "Remove expression: {PH1}",
  /**
   * @description Screen reader label for delete button on a blank live expression.
   */
  removeBlankExpression: "Remove blank expression",
  /**
   * @description Text in the live expressions section of the Console panel.
   */
  liveExpressionEditor: "Live expression editor",
  /**
   * @description Text in the live expressions section of the Console panel.
   */
  expression: "Expression",
  /**
   * @description Side effect label title in the live expressions section of the Console panel.
   */
  evaluateAllowingSideEffects: "Evaluate, allowing side effects",
  /**
   * @description Text of a DOM element in the live expressions section of the Console panel.
   */
  notAvailable: "not available",
  /**
   * @description Headline of warning shown to users when pasting text/code into DevTools.
   */
  doYouTrustThisCode: "Do you trust this code?",
  /**
   * @description Warning shown to users when pasting text/code into DevTools. IMPORTANT: keep double quotes around PH1 and do not use single quotes.
   * @example {allow pasting} PH1
   */
  doNotPaste: 'Don\u2019t paste code you don\u2019t understand or haven\u2019t reviewed yourself into DevTools. This could allow attackers to steal your identity or take control of your computer. Type "{PH1}" below to allow pasting.',
  /**
   * @description Text a user needs to type in order to confirm that they are aware of the danger of pasting code into the DevTools Console.
   */
  allowPasting: "allow pasting",
  /**
   * @description Input box placeholder which instructs the user to type 'allow pasting' into the input box. IMPORTANT: keep double quotes around PH1 and do not use single quotes.
   * @example {allow pasting} PH1
   */
  typeAllowPasting: 'Type "{PH1}"'
};
var str_3 = i18n7.i18n.registerUIStrings("panels/console/ConsolePinPane.ts", UIStrings3);
var i18nString3 = i18n7.i18n.getLocalizedString.bind(void 0, str_3);
var DEFAULT_PANE_VIEW = (input, _output, target) => {
  render5(html5`
    <style>${consolePinPane_css_default}</style>
    <div class='console-pins monospace' jslog=${VisualLogging3.pane("console-pins")} @contextmenu=${input.onContextMenu}>
    ${repeat(
    input.pins,
    (pin) => pin,
    (pin) => widget(ConsolePinPresenter, {
      pin,
      focusOut: input.focusOut,
      onRemove: () => input.onRemove(pin)
    })
  )}
    </div>`, target);
};
var ConsolePinPane = class extends UI6.Widget.VBox {
  #view;
  /** When creating a new pin, we'll focus it after rendering the editor */
  #newPin;
  #pinModel;
  #focusOut;
  constructor(focusOut, view = DEFAULT_PANE_VIEW) {
    super({ useShadowDom: true });
    this.#focusOut = focusOut;
    this.#view = view;
    this.#pinModel = new ConsolePinModel(Common4.Settings.Settings.instance());
  }
  willHide() {
    super.willHide();
    this.#pinModel.stopPeriodicEvaluate();
  }
  contextMenuEventFired(event) {
    const contextMenu = new UI6.ContextMenu.ContextMenu(event);
    const target = UI6.UIUtils.deepElementFromEvent(event);
    if (target) {
      const targetPinElement = target.enclosingNodeOrSelfWithClass("widget");
      if (targetPinElement) {
        const targetPin = UI6.Widget.Widget.get(targetPinElement);
        if (targetPin instanceof ConsolePinPresenter) {
          contextMenu.editSection().appendItem(
            i18nString3(UIStrings3.removeExpression),
            () => targetPin.pin ? this.removePin(targetPin.pin) : void 0,
            { jslogContext: "remove-expression" }
          );
          targetPin.appendToContextMenu(contextMenu);
        }
      }
    }
    contextMenu.editSection().appendItem(
      i18nString3(UIStrings3.removeAllExpressions),
      this.removeAllPins.bind(this),
      { jslogContext: "remove-all-expressions" }
    );
    void contextMenu.show();
  }
  removeAllPins() {
    this.#pinModel.removeAll();
    this.requestUpdate();
  }
  removePin(pin) {
    this.#pinModel.remove(pin);
    this.requestUpdate();
  }
  addPin(expression, userGesture) {
    const pin = this.#pinModel.add(expression);
    if (userGesture) {
      this.#newPin = pin;
    }
    this.requestUpdate();
  }
  wasShown() {
    super.wasShown();
    this.#pinModel.startPeriodicEvaluate();
    this.requestUpdate();
  }
  performUpdate() {
    this.#view(
      {
        pins: [...this.#pinModel.pins],
        focusOut: this.#focusOut,
        onRemove: (pin) => this.removePin(pin),
        onContextMenu: this.contextMenuEventFired.bind(this)
      },
      {},
      this.contentElement
    );
    for (const child of this.children()) {
      if (child instanceof ConsolePinPresenter && child.pin === this.#newPin) {
        void child.updateComplete.then(() => child.focus());
      }
    }
    this.#newPin = void 0;
  }
};
var DEFAULT_VIEW4 = (input, output, target) => {
  const deleteIconLabel = input.expression ? i18nString3(UIStrings3.removeExpressionS, { PH1: input.expression }) : i18nString3(UIStrings3.removeBlankExpression);
  const deleteRef = createRef();
  const editorRef = createRef();
  const isError = input.result && !("error" in input.result) && input.result?.exceptionDetails && !SDK5.RuntimeModel.RuntimeModel.isSideEffectFailure(input.result);
  render5(html5`
    <style>${consolePinPane_css_default}</style>
    <style>${objectValue_css_default}</style>
    <div class='console-pin ${isError ? "error-level" : ""}'>
      <devtools-button class='close-button'
          .iconName=${"cross"}
          .variant=${Buttons2.Button.Variant.ICON}
          .size=${Buttons2.Button.Size.MICRO}
          tabindex=0
          aria-label=${deleteIconLabel}
          @click=${(event) => {
    input.onDelete();
    event.consume(true);
  }}
          @keydown=${(event) => {
    if (Platform3.KeyboardUtilities.isEnterOrSpaceKey(event)) {
      input.onDelete();
      event.consume(true);
    }
  }}
          ${ref2(deleteRef)}
      ></devtools-button>
      <div class='console-pin-name'
          title=${input.expression}
          jslog=${VisualLogging3.textField().track({ change: true })}
          @keydown=${(event) => {
    if (event.key === "Escape") {
      event.consume();
    }
  }}
      >
        <devtools-text-editor .state=${input.editorState} ${ref2(editorRef)} tabindex=0
        ></devtools-text-editor>
      </div>
      <div class='console-pin-preview'
          @mouseenter=${() => input.onPreviewHoverChange(true)}
          @mouseleave=${() => input.onPreviewHoverChange(false)}
          @click=${(event) => input.onPreviewClick(event)}
      >
        ${renderResult(input.result, input.isEditing)}
      </div>
    </div>
    `, target);
  Object.assign(output, {
    deletePinIcon: deleteRef.value,
    editor: editorRef.value
  });
};
var FORMATTER = new ObjectUI3.RemoteObjectPreviewFormatter.RemoteObjectPreviewFormatter();
function renderResult(result, isEditing) {
  if (!result) {
    return nothing5;
  }
  if (result && SDK5.RuntimeModel.RuntimeModel.isSideEffectFailure(result)) {
    return html5`<span class='object-value-calculate-value-button' title=${i18nString3(UIStrings3.evaluateAllowingSideEffects)}>(…)</span>`;
  }
  const renderedPreview = FORMATTER.renderEvaluationResultPreview(result, !isEditing);
  if (renderedPreview === nothing5 && !isEditing) {
    return html5`${i18nString3(UIStrings3.notAvailable)}`;
  }
  return renderedPreview;
}
var ConsolePinPresenter = class extends UI6.Widget.Widget {
  #pin;
  #focusOut;
  #onRemove;
  #view;
  #pinEditor;
  #editor;
  #hovered = false;
  #lastNode = null;
  #deletePinIcon;
  #selfXssWarningDisabledSetting;
  constructor(element, view = DEFAULT_VIEW4) {
    super(element);
    this.#view = view;
    this.#selfXssWarningDisabledSetting = Common4.Settings.Settings.instance().createSetting(
      "disable-self-xss-warning",
      false,
      Common4.Settings.SettingStorageType.SYNCED
    );
    this.#pinEditor = {
      workingCopy: () => this.#editor?.state.doc.toString() ?? "",
      workingCopyWithHint: () => this.#editor ? TextEditor.Config.contentIncludingHint(this.#editor.editor) : "",
      isEditing: () => Boolean(this.#editor?.editor.hasFocus)
    };
  }
  wasShown() {
    super.wasShown();
    this.#pin?.addEventListener("EVALUATE_RESULT_READY" /* EVALUATE_RESULT_READY */, this.requestUpdate, this);
    this.requestUpdate();
  }
  willHide() {
    super.willHide();
    this.#pin?.removeEventListener("EVALUATE_RESULT_READY" /* EVALUATE_RESULT_READY */, this.requestUpdate, this);
    this.setHovered(false);
  }
  set pin(pin) {
    this.#pin?.removeEventListener("EVALUATE_RESULT_READY" /* EVALUATE_RESULT_READY */, this.requestUpdate, this);
    this.#pin = pin;
    this.#editor = void 0;
    this.#pin.setEditor(this.#pinEditor);
    this.#pin.addEventListener("EVALUATE_RESULT_READY" /* EVALUATE_RESULT_READY */, this.requestUpdate, this);
    this.requestUpdate();
  }
  get pin() {
    return this.#pin;
  }
  set focusOut(focusOut) {
    this.#focusOut = focusOut;
  }
  set onRemove(onRemove) {
    this.#onRemove = onRemove;
  }
  #createInitialEditorState(doc) {
    const extensions = [
      CodeMirror.EditorView.contentAttributes.of({ "aria-label": i18nString3(UIStrings3.liveExpressionEditor) }),
      CodeMirror.EditorView.lineWrapping,
      CodeMirror.javascript.javascriptLanguage,
      TextEditor.Config.showCompletionHint,
      CodeMirror.placeholder(i18nString3(UIStrings3.expression)),
      CodeMirror.keymap.of([
        {
          key: "Escape",
          run: (view) => {
            view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: this.#pin?.expression ?? "" } });
            this.#focusOut?.();
            return true;
          }
        },
        {
          key: "Enter",
          run: () => {
            this.#focusOut?.();
            return true;
          }
        },
        {
          key: "Mod-Enter",
          run: () => {
            this.#focusOut?.();
            return true;
          }
        },
        {
          key: "Tab",
          run: (view) => {
            if (CodeMirror.completionStatus(view.state) !== null) {
              return false;
            }
            view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: this.#pin?.expression ?? "" } });
            this.#focusOut?.();
            return true;
          }
        },
        {
          key: "Shift-Tab",
          run: (view) => {
            if (CodeMirror.completionStatus(view.state) !== null) {
              return false;
            }
            view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: this.#pin?.expression ?? "" } });
            this.#editor?.blur();
            this.#deletePinIcon.focus();
            return true;
          }
        }
      ]),
      CodeMirror.EditorView.domEventHandlers({
        blur: (_e, view) => this.#onBlur(view),
        paste: () => this.#onPaste(),
        drop: (event) => event.preventDefault()
      }),
      TextEditor.Config.baseConfiguration(doc),
      TextEditor.Config.closeBrackets.instance(),
      TextEditor.Config.autocompletion.instance()
    ];
    if (Root2.Runtime.Runtime.queryParam("noJavaScriptCompletion") !== "true") {
      extensions.push(TextEditor.JavaScript.completion());
    }
    return CodeMirror.EditorState.create({ doc, extensions });
  }
  #onBlur(editor) {
    if (!this.#pin) {
      return;
    }
    const commitedAsIs = this.#pin.commit();
    editor.dispatch({
      selection: { anchor: this.#pin.expression.length },
      changes: !commitedAsIs ? { from: 0, to: editor.state.doc.length, insert: this.#pin.expression } : void 0
    });
    this.requestUpdate();
  }
  #onPaste() {
    if (Root2.Runtime.Runtime.queryParam("isChromeForTesting") || Root2.Runtime.Runtime.queryParam("disableSelfXssWarnings") || this.#selfXssWarningDisabledSetting.get()) {
      return false;
    }
    void this.#showSelfXssWarning();
    return true;
  }
  async #showSelfXssWarning() {
    const allowPasting = await Dialogs2.TypeToAllowDialog.TypeToAllowDialog.show({
      jslogContext: {
        dialog: "self-xss-warning",
        input: "allow-pasting"
      },
      header: i18nString3(UIStrings3.doYouTrustThisCode),
      message: i18nString3(UIStrings3.doNotPaste, { PH1: i18nString3(UIStrings3.allowPasting) }),
      typePhrase: i18nString3(UIStrings3.allowPasting),
      inputPlaceholder: i18nString3(UIStrings3.typeAllowPasting, { PH1: i18nString3(UIStrings3.allowPasting) })
    });
    if (allowPasting) {
      this.#selfXssWarningDisabledSetting.set(true);
      Host3.userMetrics.actionTaken(Host3.UserMetrics.Action.SelfXssAllowPastingInDialog);
    }
  }
  setHovered(hovered) {
    if (this.#hovered === hovered) {
      return;
    }
    this.#hovered = hovered;
    if (!hovered && this.#lastNode) {
      SDK5.OverlayModel.OverlayModel.hideDOMNodeHighlight(SDK5.TargetManager.TargetManager.instance());
    }
  }
  async focus() {
    const editor = this.#editor;
    if (editor) {
      editor.editor.focus();
      editor.dispatch({ selection: { anchor: editor.state.doc.length } });
    }
  }
  appendToContextMenu(contextMenu) {
    if (!this.#pin) {
      return;
    }
    const { lastResult } = this.#pin;
    if (lastResult && !("error" in lastResult) && lastResult.object) {
      contextMenu.appendApplicableItems(lastResult.object);
      this.#pin.skipReleaseLastResult();
    }
  }
  performUpdate() {
    if (!this.#pin) {
      return;
    }
    const output = {};
    this.#view(
      {
        expression: this.#pin.expression,
        editorState: this.#editor?.state ?? this.#createInitialEditorState(this.#pin.expression),
        result: this.#pin.lastResult,
        isEditing: this.#pinEditor.isEditing(),
        onDelete: () => this.#onRemove?.(),
        onPreviewHoverChange: (hovered) => this.setHovered(hovered),
        onPreviewClick: (event) => {
          if (this.#lastNode) {
            void Common4.Revealer.reveal(this.#lastNode);
            event.consume();
          }
        }
      },
      output,
      this.contentElement
    );
    const { deletePinIcon, editor } = output;
    if (!deletePinIcon || !editor) {
      throw new Error("Broken view function, expected output");
    }
    this.#deletePinIcon = deletePinIcon;
    this.#editor = editor;
    const node = this.#pin.lastNode;
    if (this.#hovered) {
      if (node) {
        SDK5.OverlayModel.OverlayModel.highlightObjectAsDOMNode(node);
      } else if (this.#lastNode) {
        SDK5.OverlayModel.OverlayModel.hideDOMNodeHighlight(SDK5.TargetManager.TargetManager.instance());
      }
    }
    this.#lastNode = node || null;
  }
};
var ConsolePinModel = class {
  #setting;
  #pins = /* @__PURE__ */ new Set();
  #throttler = new Common4.Throttler.Throttler(250);
  #active = false;
  constructor(settings) {
    this.#setting = settings.createLocalSetting("console-pins", []);
    for (const expression of this.#setting.get()) {
      this.add(expression);
    }
  }
  get pins() {
    return this.#pins;
  }
  add(expression) {
    const pin = new ConsolePin(expression, () => this.#save());
    this.#pins.add(pin);
    this.#save();
    return pin;
  }
  remove(pin) {
    this.#pins.delete(pin);
    this.#save();
  }
  removeAll() {
    this.#pins.clear();
    this.#save();
  }
  startPeriodicEvaluate() {
    this.#active = true;
    void this.#evaluateAllPins();
  }
  stopPeriodicEvaluate() {
    this.#active = false;
  }
  async #evaluateAllPins() {
    if (!this.#active) {
      return;
    }
    const executionContext = UI6.Context.Context.instance().flavor(SDK5.RuntimeModel.ExecutionContext);
    if (executionContext) {
      await Promise.all(this.#pins.values().map((pin) => pin.evaluate(executionContext)));
    }
    void this.#throttler.schedule(this.#evaluateAllPins.bind(this));
  }
  #save() {
    const expressions = this.#pins.values().map((pin) => pin.expression).toArray();
    this.#setting.set(expressions);
  }
};
var ConsolePin = class extends Common4.ObjectWrapper.ObjectWrapper {
  #expression;
  #onCommit;
  #editor;
  // We track the last evaluation result for this pin so we can release the RemoteObject.
  #lastResult = null;
  #lastNode = null;
  #lastExecutionContext = null;
  #releaseLastResult = true;
  constructor(expression, onCommit) {
    super();
    this.#expression = expression;
    this.#onCommit = onCommit;
  }
  get expression() {
    return this.#expression;
  }
  get lastResult() {
    return this.#lastResult;
  }
  /** A short cut in case `lastResult` is a DOM node */
  get lastNode() {
    return this.#lastNode;
  }
  skipReleaseLastResult() {
    this.#releaseLastResult = false;
  }
  setEditor(editor) {
    this.#editor = editor;
  }
  /**
   * Commit the current working copy from the editor.
   * @returns true, iff the working copy was commited as-is.
   */
  commit() {
    if (!this.#editor) {
      return false;
    }
    const text = this.#editor.workingCopy();
    const trimmedText = text.trim();
    this.#expression = trimmedText;
    this.#onCommit();
    return this.#expression === text;
  }
  /** Evaluates the current working copy of the pinned expression. If the result is a DOM node, we return that separately for convenience.  */
  async evaluate(executionContext) {
    const editorText = this.#editor?.workingCopyWithHint() ?? "";
    const throwOnSideEffect = Boolean(this.#editor?.isEditing()) && editorText !== this.#expression;
    const timeout = throwOnSideEffect ? 250 : void 0;
    const result = await ObjectUI3.JavaScriptREPL.JavaScriptREPL.evaluate(
      editorText,
      executionContext,
      throwOnSideEffect,
      /* replMode*/
      true,
      timeout,
      "live-expression",
      /* awaitPromise */
      true,
      /* silent */
      true
    );
    if (this.#lastResult && this.#releaseLastResult) {
      this.#lastExecutionContext?.runtimeModel.releaseEvaluationResult(this.#lastResult);
    }
    this.#lastResult = result;
    this.#lastExecutionContext = executionContext;
    this.#releaseLastResult = true;
    if (result && !("error" in result) && result.object.type === "object" && result.object.subtype === "node") {
      this.#lastNode = result.object;
    } else {
      this.#lastNode = null;
    }
    this.dispatchEventToListeners("EVALUATE_RESULT_READY" /* EVALUATE_RESULT_READY */, this);
  }
};
var ConsolePinEvent = /* @__PURE__ */ ((ConsolePinEvent2) => {
  ConsolePinEvent2["EVALUATE_RESULT_READY"] = "EVALUATE_RESULT_READY";
  return ConsolePinEvent2;
})(ConsolePinEvent || {});

// ../../front_end/panels/console/ConsoleSidebar.ts
var ConsoleSidebar_exports = {};
__export(ConsoleSidebar_exports, {
  ConsoleFilterGroup: () => ConsoleFilterGroup,
  ConsoleSidebar: () => ConsoleSidebar,
  DEFAULT_VIEW: () => DEFAULT_VIEW5,
  Events: () => Events,
  GroupName: () => GroupName
});
import * as Common5 from "../../core/common/common.js";
import * as i18n9 from "../../core/i18n/i18n.js";
import * as SDK6 from "../../core/sdk/sdk.js";
import * as UI7 from "../../ui/legacy/legacy.js";
import * as Lit4 from "../../ui/lit/lit.js";
import * as VisualLogging4 from "../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/console/consoleSidebar.css.js
var consoleSidebar_css_default = `/*
 * Copyright 2017 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  overflow: auto;
}

.count {
  flex: none;
  margin: 0 var(--sys-size-3);
}

devtools-icon {
  margin-right: var(--sys-size-3);

  &[name="cross-circle"] {
    color: var(--sys-color-error-bright);
  }

  &[name="warning"] {
    color: var(--icon-warning);
  }

  &[name="info"] {
    color: var(--icon-info);
  }
}

.tree-element-title {
  flex-grow: 1;
}

/*# sourceURL=${import.meta.resolve("./consoleSidebar.css")} */`;

// ../../front_end/panels/console/ConsoleSidebar.ts
var UIStrings4 = {
  /**
   * @description Filter name in Console sidebar of the Console panel. This is shown when we fail to
   * parse a URL when trying to display console messages from each URL separately. This might be
   * because the console message does not come from any particular URL. This should be translated as
   * a term that indicates 'not one of the other URLs listed here'.
   */
  other: "<other>",
  /**
   * @description Text in Console sidebar of the Console panel to show how many user messages exist.
   */
  dUserMessages: "{n, plural, =0 {No user messages} =1 {# user message} other {# user messages}}",
  /**
   * @description Text in Console sidebar of the Console panel to show how many messages exist.
   */
  dMessages: "{n, plural, =0 {No messages} =1 {# message} other {# messages}}",
  /**
   * @description Text in Console sidebar of the Console panel to show how many errors exist.
   */
  dErrors: "{n, plural, =0 {No errors} =1 {# error} other {# errors}}",
  /**
   * @description Text in Console sidebar of the Console panel to show how many warnings exist.
   */
  dWarnings: "{n, plural, =0 {No warnings} =1 {# warning} other {# warnings}}",
  /**
   * @description Text in Console sidebar of the Console panel to show how many info messages exist.
   */
  dInfo: "{n, plural, =0 {No info} =1 {# info} other {# info}}",
  /**
   * @description Text in Console sidebar of the Console panel to show how many verbose messages exist.
   */
  dVerbose: "{n, plural, =0 {No verbose} =1 {# verbose} other {# verbose}}"
};
var str_4 = i18n9.i18n.registerUIStrings("panels/console/ConsoleSidebar.ts", UIStrings4);
var i18nString4 = i18n9.i18n.getLocalizedString.bind(void 0, str_4);
var { render: render6, html: html6, nothing: nothing6 } = Lit4;
var GroupName = /* @__PURE__ */ ((GroupName2) => {
  GroupName2["CONSOLE_API"] = "user message";
  GroupName2["ALL"] = "message";
  GroupName2["ERROR"] = "error";
  GroupName2["WARNING"] = "warning";
  GroupName2["INFO"] = "info";
  GroupName2["VERBOSE"] = "verbose";
  return GroupName2;
})(GroupName || {});
var GROUP_ICONS = {
  ["message" /* ALL */]: { icon: "list", label: UIStrings4.dMessages },
  ["user message" /* CONSOLE_API */]: { icon: "profile", label: UIStrings4.dUserMessages },
  ["error" /* ERROR */]: { icon: "cross-circle", label: UIStrings4.dErrors },
  ["warning" /* WARNING */]: { icon: "warning", label: UIStrings4.dWarnings },
  ["info" /* INFO */]: { icon: "info", label: UIStrings4.dInfo },
  ["verbose" /* VERBOSE */]: { icon: "bug", label: UIStrings4.dVerbose }
};
var DEFAULT_VIEW5 = (input, output, target) => {
  render6(
    html6`<devtools-tree
        navigation-variant
        hide-overflow
        .template=${html6`
          <ul role="tree">
            ${input.groups.map((group) => html6`
              <li
                role="treeitem"
                @select=${() => input.onSelectionChanged(group.filter)}
                ?selected=${group.filter === input.selectedFilter}>
                  <style>${consoleSidebar_css_default}</style>
                  <devtools-icon name=${GROUP_ICONS[group.name].icon}></devtools-icon>
                  ${/* eslint-disable-next-line @devtools/l10n-i18nString-call-only-with-uistrings */
    i18nString4(GROUP_ICONS[group.name].label, {
      n: group.messageCount
    })}
                  ${group.messageCount === 0 ? nothing6 : html6`
                  <ul role="group">
                    ${group.urlGroups.values().map((urlGroup) => html6`
                      <li
                        @select=${() => input.onSelectionChanged(urlGroup.filter)}
                        role="treeitem"
                        ?selected=${urlGroup.filter === input.selectedFilter}
                        title=${urlGroup.url ?? ""}>
                          <devtools-icon name=document></devtools-icon>
                          ${urlGroup.filter.name} <span class=count>${urlGroup.count}</span>
                      </li>`)}
                  </ul>`}
              </li>`)}
        </ul>`}
        ></devtools-tree>`,
    target,
    { container: { attributes: { jslog: `${VisualLogging4.pane("sidebar").track({ resize: true })}` } } }
  );
};
var ConsoleFilterGroup = class {
  urlGroups = /* @__PURE__ */ new Map();
  messageCount = 0;
  name;
  filter;
  constructor(name, parsedFilters, levelsMask) {
    this.name = name;
    this.filter = new ConsoleFilter(name, parsedFilters, null, levelsMask);
  }
  onMessage(viewMessage) {
    const message = viewMessage.consoleMessage();
    const shouldIncrementCounter = message.type !== SDK6.ConsoleModel.FrontendMessageType.Command && message.type !== SDK6.ConsoleModel.FrontendMessageType.Result && !message.isGroupMessage();
    if (!this.filter.shouldBeVisible(viewMessage) || !shouldIncrementCounter) {
      return;
    }
    const child = this.#getUrlGroup(message.url || null);
    child.count++;
    this.messageCount++;
  }
  clear() {
    this.messageCount = 0;
    this.urlGroups.clear();
  }
  #getUrlGroup(url) {
    let child = this.urlGroups.get(url);
    if (child) {
      return child;
    }
    const filter = this.filter.clone();
    child = { filter, url, count: 0 };
    const parsedURL = url ? Common5.ParsedURL.ParsedURL.fromString(url) : null;
    if (url) {
      filter.name = parsedURL ? parsedURL.displayName : url;
    } else {
      filter.name = i18nString4(UIStrings4.other);
    }
    filter.parsedFilters.push({ key: "url" /* Url */, text: url, negative: false, regex: void 0 });
    this.urlGroups.set(url, child);
    return child;
  }
};
var CONSOLE_API_PARSED_FILTERS = [{
  key: "source" /* Source */,
  text: Common5.Console.FrontendMessageSource.ConsoleAPI,
  negative: false,
  regex: void 0
}];
var ConsoleSidebarBase = Common5.ObjectWrapper.eventMixin(
  UI7.Widget.VBox
);
var ConsoleSidebar = class extends ConsoleSidebarBase {
  #view;
  #groups = [
    new ConsoleFilterGroup("message" /* ALL */, [], ConsoleFilter.allLevelsFilterValue()),
    new ConsoleFilterGroup("user message" /* CONSOLE_API */, CONSOLE_API_PARSED_FILTERS, ConsoleFilter.allLevelsFilterValue()),
    new ConsoleFilterGroup("error" /* ERROR */, [], ConsoleFilter.singleLevelMask(Log.LogEntryLevel.Error)),
    new ConsoleFilterGroup("warning" /* WARNING */, [], ConsoleFilter.singleLevelMask(Log.LogEntryLevel.Warning)),
    new ConsoleFilterGroup("info" /* INFO */, [], ConsoleFilter.singleLevelMask(Log.LogEntryLevel.Info)),
    new ConsoleFilterGroup("verbose" /* VERBOSE */, [], ConsoleFilter.singleLevelMask(Log.LogEntryLevel.Verbose))
  ];
  #selectedFilterSetting = Common5.Settings.Settings.instance().createSetting("console.sidebar-selected-filter", null);
  #selectedFilter = this.#groups.find((group) => group.name === this.#selectedFilterSetting.get())?.filter;
  constructor(element, view = DEFAULT_VIEW5) {
    super(element, {
      useShadowDom: "pure"
    });
    this.#view = view;
    this.setMinimumSize(125, 0);
    this.performUpdate();
  }
  performUpdate() {
    const input = {
      groups: this.#groups,
      selectedFilter: this.#selectedFilter ?? this.#groups[0].filter,
      onSelectionChanged: (filter) => {
        this.#selectedFilter = filter;
        this.#selectedFilterSetting.set(filter.name);
        this.dispatchEventToListeners("FilterSelected" /* FILTER_SELECTED */);
      }
    };
    this.#view(input, {}, this.contentElement);
  }
  clear() {
    for (const group of this.#groups) {
      group.clear();
    }
    this.requestUpdate();
  }
  onMessageAdded(viewMessage) {
    for (const group of this.#groups) {
      group.onMessage(viewMessage);
    }
    this.requestUpdate();
  }
  shouldBeVisible(viewMessage) {
    return this.#selectedFilter?.shouldBeVisible(viewMessage) ?? true;
  }
};
var Events = /* @__PURE__ */ ((Events3) => {
  Events3["FILTER_SELECTED"] = "FilterSelected";
  return Events3;
})(Events || {});

// ../../front_end/panels/console/ConsoleViewport.ts
var ConsoleViewport_exports = {};
__export(ConsoleViewport_exports, {
  ConsoleViewport: () => ConsoleViewport
});
import * as Platform4 from "../../core/platform/platform.js";
import * as Components4 from "../../ui/legacy/components/utils/utils.js";
import * as UI8 from "../../ui/legacy/legacy.js";
var ConsoleViewport = class {
  element;
  topGapElement;
  topGapElementActive;
  #contentElement;
  bottomGapElement;
  bottomGapElementActive;
  provider;
  virtualSelectedIndex;
  firstActiveIndex;
  lastActiveIndex;
  renderedItems;
  anchorSelection;
  headSelection;
  itemCount;
  cumulativeHeights;
  muteCopyHandler;
  observer;
  observerConfig;
  #stickToBottom;
  selectionIsBackward;
  lastSelectedElement;
  cachedProviderElements;
  constructor(provider) {
    this.element = document.createElement("div");
    this.element.style.overflow = "auto";
    this.topGapElement = this.element.createChild("div");
    this.topGapElement.style.height = "0px";
    this.topGapElement.style.color = "transparent";
    this.topGapElementActive = false;
    this.#contentElement = this.element.createChild("div");
    this.bottomGapElement = this.element.createChild("div");
    this.bottomGapElement.style.height = "0px";
    this.bottomGapElement.style.color = "transparent";
    this.bottomGapElementActive = false;
    this.topGapElement.textContent = "\uFEFF";
    this.bottomGapElement.textContent = "\uFEFF";
    UI8.ARIAUtils.setHidden(this.topGapElement, true);
    UI8.ARIAUtils.setHidden(this.bottomGapElement, true);
    this.provider = provider;
    this.element.addEventListener("scroll", this.onScroll.bind(this), false);
    this.element.addEventListener("copy", this.onCopy.bind(this), false);
    this.element.addEventListener("dragstart", this.onDragStart.bind(this), false);
    this.#contentElement.addEventListener("focusin", this.onFocusIn.bind(this), false);
    this.#contentElement.addEventListener("focusout", this.onFocusOut.bind(this), false);
    this.#contentElement.addEventListener("keydown", this.onKeyDown.bind(this), false);
    this.virtualSelectedIndex = -1;
    this.#contentElement.tabIndex = -1;
    this.firstActiveIndex = -1;
    this.lastActiveIndex = -1;
    this.renderedItems = [];
    this.anchorSelection = null;
    this.headSelection = null;
    this.itemCount = 0;
    this.cumulativeHeights = new Int32Array(0);
    this.muteCopyHandler = false;
    this.observer = new MutationObserver(this.refresh.bind(this));
    this.observerConfig = { childList: true, subtree: true };
    this.#stickToBottom = false;
    this.selectionIsBackward = false;
  }
  stickToBottom() {
    return this.#stickToBottom;
  }
  setStickToBottom(value) {
    this.#stickToBottom = value;
    if (this.#stickToBottom) {
      this.observer.observe(this.#contentElement, this.observerConfig);
    } else {
      this.observer.disconnect();
    }
  }
  hasVirtualSelection() {
    return this.virtualSelectedIndex !== -1;
  }
  copyWithStyles() {
    this.muteCopyHandler = true;
    this.element.ownerDocument.execCommand("copy");
    this.muteCopyHandler = false;
  }
  onCopy(event) {
    if (this.muteCopyHandler) {
      return;
    }
    const text = this.selectedText();
    if (!text) {
      return;
    }
    event.preventDefault();
    if (this.selectionContainsTable()) {
      this.copyWithStyles();
    } else if (event.clipboardData) {
      event.clipboardData.setData("text/plain", text);
    }
  }
  onFocusIn(event) {
    const renderedIndex = this.renderedItems.findIndex((item2) => item2.element().isSelfOrAncestor(event.target));
    if (renderedIndex !== -1) {
      this.virtualSelectedIndex = this.firstActiveIndex + renderedIndex;
    }
    let focusLastChild = false;
    if (this.virtualSelectedIndex === -1 && this.isOutsideViewport(event.relatedTarget) && event.target === this.#contentElement && this.itemCount) {
      focusLastChild = true;
      this.virtualSelectedIndex = this.itemCount - 1;
      this.refresh();
      this.scrollItemIntoView(this.virtualSelectedIndex);
    }
    this.updateFocusedItem(focusLastChild);
  }
  onFocusOut(event) {
    if (this.isOutsideViewport(event.relatedTarget)) {
      this.virtualSelectedIndex = -1;
    }
    this.updateFocusedItem();
  }
  isOutsideViewport(element) {
    return element !== null && !element.isSelfOrDescendant(this.#contentElement);
  }
  onDragStart(event) {
    const text = this.selectedText();
    if (!text) {
      return false;
    }
    if (event.dataTransfer) {
      event.dataTransfer.clearData();
      event.dataTransfer.setData("text/plain", text);
      event.dataTransfer.effectAllowed = "copy";
    }
    return true;
  }
  onKeyDown(event) {
    if (UI8.UIUtils.isEditing() || !this.itemCount || event.shiftKey) {
      return;
    }
    let isArrowUp = false;
    switch (event.key) {
      case "ArrowUp":
        if (this.virtualSelectedIndex > 0) {
          isArrowUp = true;
          this.virtualSelectedIndex--;
        } else {
          return;
        }
        break;
      case "ArrowDown":
        if (this.virtualSelectedIndex < this.itemCount - 1) {
          this.virtualSelectedIndex++;
        } else {
          return;
        }
        break;
      case "Home":
        this.virtualSelectedIndex = 0;
        break;
      case "End":
        this.virtualSelectedIndex = this.itemCount - 1;
        break;
      default:
        return;
    }
    event.consume(true);
    this.scrollItemIntoView(this.virtualSelectedIndex);
    this.updateFocusedItem(isArrowUp);
  }
  updateFocusedItem(focusLastChild) {
    const selectedElement = this.renderedElementAt(this.virtualSelectedIndex);
    const changed = this.lastSelectedElement !== selectedElement;
    const containerHasFocus = this.#contentElement === UI8.DOMUtilities.deepActiveElement(this.element.ownerDocument);
    if (this.lastSelectedElement && changed) {
      this.lastSelectedElement.classList.remove("console-selected");
    }
    if (selectedElement && (focusLastChild || changed || containerHasFocus) && this.element.hasFocus()) {
      selectedElement.classList.add("console-selected");
      const consoleViewMessage = getMessageForElement(selectedElement);
      if (consoleViewMessage) {
        UI8.Context.Context.instance().setFlavor(ConsoleViewMessage, consoleViewMessage);
      }
      if (focusLastChild) {
        this.setStickToBottom(false);
        this.renderedItems[this.virtualSelectedIndex - this.firstActiveIndex].focusLastChildOrSelf();
      } else if (!selectedElement.hasFocus()) {
        selectedElement.focus({ preventScroll: true });
      }
    }
    if (this.itemCount && !this.#contentElement.hasFocus()) {
      this.#contentElement.tabIndex = 0;
    } else {
      this.#contentElement.tabIndex = -1;
    }
    this.lastSelectedElement = selectedElement;
  }
  contentElement() {
    return this.#contentElement;
  }
  invalidate() {
    delete this.cachedProviderElements;
    this.itemCount = this.provider.itemCount();
    if (this.virtualSelectedIndex > this.itemCount - 1) {
      this.virtualSelectedIndex = this.itemCount - 1;
    }
    this.rebuildCumulativeHeights();
    this.refresh();
  }
  providerElement(index) {
    if (!this.cachedProviderElements) {
      this.cachedProviderElements = new Array(this.itemCount);
    }
    let element = this.cachedProviderElements[index];
    if (!element) {
      element = this.provider.itemElement(index);
      this.cachedProviderElements[index] = element;
    }
    return element;
  }
  rebuildCumulativeHeights() {
    const firstActiveIndex = this.firstActiveIndex;
    const lastActiveIndex = this.lastActiveIndex;
    let height = 0;
    this.cumulativeHeights = new Int32Array(this.itemCount);
    for (let i = 0; i < this.itemCount; ++i) {
      if (firstActiveIndex <= i && i - firstActiveIndex < this.renderedItems.length && i <= lastActiveIndex) {
        height += this.renderedItems[i - firstActiveIndex].element().offsetHeight;
      } else {
        height += this.provider.fastHeight(i);
      }
      this.cumulativeHeights[i] = height;
    }
  }
  rebuildCumulativeHeightsIfNeeded() {
    let totalCachedHeight = 0;
    let totalMeasuredHeight = 0;
    for (let i = 0; i < this.renderedItems.length; ++i) {
      const cachedItemHeight = this.cachedItemHeight(this.firstActiveIndex + i);
      const measuredHeight = this.renderedItems[i].element().offsetHeight;
      if (Math.abs(cachedItemHeight - measuredHeight) > 1) {
        this.rebuildCumulativeHeights();
        return;
      }
      totalMeasuredHeight += measuredHeight;
      totalCachedHeight += cachedItemHeight;
      if (Math.abs(totalCachedHeight - totalMeasuredHeight) > 1) {
        this.rebuildCumulativeHeights();
        return;
      }
    }
  }
  cachedItemHeight(index) {
    return index === 0 ? this.cumulativeHeights[0] : this.cumulativeHeights[index] - this.cumulativeHeights[index - 1];
  }
  isSelectionBackwards(selection) {
    if (!selection?.rangeCount || !selection.anchorNode || !selection.focusNode) {
      return false;
    }
    const range = document.createRange();
    range.setStart(selection.anchorNode, selection.anchorOffset);
    range.setEnd(selection.focusNode, selection.focusOffset);
    return range.collapsed;
  }
  createSelectionModel(itemIndex, node, offset) {
    return { item: itemIndex, node, offset };
  }
  updateSelectionModel(selection) {
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (!range || (!selection || selection.isCollapsed) || !this.element.hasSelection()) {
      this.headSelection = null;
      this.anchorSelection = null;
      return false;
    }
    let firstSelectedIndex = Number.MAX_VALUE;
    let lastSelectedIndex = -1;
    let hasVisibleSelection = false;
    for (let i = 0; i < this.renderedItems.length; ++i) {
      if (range.intersectsNode(this.renderedItems[i].element())) {
        const index = i + this.firstActiveIndex;
        firstSelectedIndex = Math.min(firstSelectedIndex, index);
        lastSelectedIndex = Math.max(lastSelectedIndex, index);
        hasVisibleSelection = true;
      }
    }
    const topOverlap = range.intersectsNode(this.topGapElement) && this.topGapElementActive;
    const bottomOverlap = range.intersectsNode(this.bottomGapElement) && this.bottomGapElementActive;
    if (!topOverlap && !bottomOverlap && !hasVisibleSelection) {
      this.headSelection = null;
      this.anchorSelection = null;
      return false;
    }
    if (!this.anchorSelection || !this.headSelection) {
      this.anchorSelection = this.createSelectionModel(0, this.element, 0);
      this.headSelection = this.createSelectionModel(this.itemCount - 1, this.element, this.element.children.length);
      this.selectionIsBackward = false;
    }
    const isBackward = this.isSelectionBackwards(selection);
    const startSelection = this.selectionIsBackward ? this.headSelection : this.anchorSelection;
    const endSelection = this.selectionIsBackward ? this.anchorSelection : this.headSelection;
    let firstSelected = null;
    let lastSelected = null;
    if (hasVisibleSelection) {
      firstSelected = this.createSelectionModel(firstSelectedIndex, range.startContainer, range.startOffset);
      lastSelected = this.createSelectionModel(lastSelectedIndex, range.endContainer, range.endOffset);
    }
    if (topOverlap && bottomOverlap && hasVisibleSelection) {
      firstSelected = firstSelected && firstSelected.item < startSelection.item ? firstSelected : startSelection;
      lastSelected = lastSelected && lastSelected.item > endSelection.item ? lastSelected : endSelection;
    } else if (!hasVisibleSelection) {
      firstSelected = startSelection;
      lastSelected = endSelection;
    } else if (topOverlap) {
      firstSelected = isBackward ? this.headSelection : this.anchorSelection;
    } else if (bottomOverlap) {
      lastSelected = isBackward ? this.anchorSelection : this.headSelection;
    }
    if (isBackward) {
      this.anchorSelection = lastSelected;
      this.headSelection = firstSelected;
    } else {
      this.anchorSelection = firstSelected;
      this.headSelection = lastSelected;
    }
    this.selectionIsBackward = isBackward;
    return true;
  }
  restoreSelection(selection) {
    if (!selection || !this.anchorSelection || !this.headSelection) {
      return;
    }
    const clampSelection = (selection2, isSelectionBackwards) => {
      if (this.firstActiveIndex <= selection2.item && selection2.item <= this.lastActiveIndex) {
        return { element: selection2.node, offset: selection2.offset };
      }
      const element = selection2.item < this.firstActiveIndex ? this.topGapElement : this.bottomGapElement;
      return { element, offset: isSelectionBackwards ? 1 : 0 };
    };
    const { element: anchorElement, offset: anchorOffset } = clampSelection(this.anchorSelection, Boolean(this.selectionIsBackward));
    const { element: headElement, offset: headOffset } = clampSelection(this.headSelection, !this.selectionIsBackward);
    selection.setBaseAndExtent(anchorElement, anchorOffset, headElement, headOffset);
  }
  selectionContainsTable() {
    if (!this.anchorSelection || !this.headSelection) {
      return false;
    }
    const start = this.selectionIsBackward ? this.headSelection.item : this.anchorSelection.item;
    const end = this.selectionIsBackward ? this.anchorSelection.item : this.headSelection.item;
    for (let i = start; i <= end; i++) {
      const element = this.providerElement(i);
      if (element?.consoleMessage().type === "table") {
        return true;
      }
    }
    return false;
  }
  refresh() {
    this.observer.disconnect();
    this.#refresh();
    if (this.#stickToBottom) {
      this.observer.observe(this.#contentElement, this.observerConfig);
    }
  }
  #refresh() {
    if (!this.visibleHeight()) {
      return;
    }
    if (!this.itemCount) {
      for (let i = 0; i < this.renderedItems.length; ++i) {
        this.renderedItems[i].willHide();
      }
      this.renderedItems = [];
      this.#contentElement.removeChildren();
      this.topGapElement.style.height = "0px";
      this.bottomGapElement.style.height = "0px";
      this.firstActiveIndex = -1;
      this.lastActiveIndex = -1;
      this.updateFocusedItem();
      return;
    }
    const selection = this.element.getComponentSelection();
    const shouldRestoreSelection = this.updateSelectionModel(selection);
    const visibleFrom = this.element.scrollTop;
    const visibleHeight = this.visibleHeight();
    const activeHeight = visibleHeight * 2;
    this.rebuildCumulativeHeightsIfNeeded();
    if (this.#stickToBottom) {
      this.firstActiveIndex = Math.max(this.itemCount - Math.ceil(activeHeight / this.provider.minimumRowHeight()), 0);
      this.lastActiveIndex = this.itemCount - 1;
    } else {
      this.firstActiveIndex = Math.max(
        Platform4.ArrayUtilities.lowerBound(
          this.cumulativeHeights,
          visibleFrom + 1 - (activeHeight - visibleHeight) / 2,
          Platform4.ArrayUtilities.DEFAULT_COMPARATOR
        ),
        0
      );
      this.lastActiveIndex = this.firstActiveIndex + Math.ceil(activeHeight / this.provider.minimumRowHeight()) - 1;
      this.lastActiveIndex = Math.min(this.lastActiveIndex, this.itemCount - 1);
    }
    const topGapHeight = this.cumulativeHeights[this.firstActiveIndex - 1] || 0;
    const bottomGapHeight = this.cumulativeHeights[this.cumulativeHeights.length - 1] - this.cumulativeHeights[this.lastActiveIndex];
    function prepare() {
      this.topGapElement.style.height = topGapHeight + "px";
      this.bottomGapElement.style.height = bottomGapHeight + "px";
      this.topGapElementActive = Boolean(topGapHeight);
      this.bottomGapElementActive = Boolean(bottomGapHeight);
      this.#contentElement.style.setProperty("height", "10000000px");
    }
    this.partialViewportUpdate(prepare.bind(this));
    this.#contentElement.style.removeProperty("height");
    if (shouldRestoreSelection) {
      this.restoreSelection(selection);
    }
    if (this.#stickToBottom) {
      this.element.scrollTop = 1e7;
    }
  }
  partialViewportUpdate(prepare) {
    const itemsToRender = /* @__PURE__ */ new Set();
    for (let i = this.firstActiveIndex; i <= this.lastActiveIndex; ++i) {
      const providerElement = this.providerElement(i);
      console.assert(Boolean(providerElement), "Expected provider element to be defined");
      if (providerElement) {
        itemsToRender.add(providerElement);
      }
    }
    const willBeHidden = this.renderedItems.filter((item2) => !itemsToRender.has(item2));
    for (let i = 0; i < willBeHidden.length; ++i) {
      willBeHidden[i].willHide();
    }
    prepare();
    let hadFocus = false;
    for (let i = 0; i < willBeHidden.length; ++i) {
      hadFocus = hadFocus || willBeHidden[i].element().hasFocus();
      willBeHidden[i].element().remove();
    }
    const wasShown = [];
    let anchor = this.#contentElement.firstChild;
    for (const viewportElement of itemsToRender) {
      const element = viewportElement.element();
      if (element !== anchor) {
        const shouldCallWasShown = !element.parentElement;
        if (shouldCallWasShown) {
          wasShown.push(viewportElement);
        }
        this.#contentElement.insertBefore(element, anchor);
      } else {
        anchor = anchor.nextSibling;
      }
    }
    for (let i = 0; i < wasShown.length; ++i) {
      wasShown[i].wasShown();
    }
    this.renderedItems = Array.from(itemsToRender);
    if (hadFocus) {
      this.#contentElement.focus();
    }
    this.updateFocusedItem();
  }
  selectedText() {
    this.updateSelectionModel(this.element.getComponentSelection());
    if (!this.headSelection || !this.anchorSelection) {
      return null;
    }
    let startSelection = null;
    let endSelection = null;
    if (this.selectionIsBackward) {
      startSelection = this.headSelection;
      endSelection = this.anchorSelection;
    } else {
      startSelection = this.anchorSelection;
      endSelection = this.headSelection;
    }
    const textLines = [];
    for (let i = startSelection.item; i <= endSelection.item; ++i) {
      const providerElement = this.providerElement(i);
      console.assert(Boolean(providerElement));
      if (!providerElement) {
        continue;
      }
      const element = providerElement.element();
      const lineContent = element.childTextNodes().map(Components4.Linkifier.Linkifier.untruncatedNodeText).join("");
      textLines.push(lineContent);
    }
    const endProviderElement = this.providerElement(endSelection.item);
    const endSelectionElement = endProviderElement?.element();
    if (endSelectionElement && endSelection.node?.isSelfOrDescendant(endSelectionElement)) {
      const itemTextOffset = this.textOffsetInNode(endSelectionElement, endSelection.node, endSelection.offset);
      if (textLines.length > 0) {
        textLines[textLines.length - 1] = textLines[textLines.length - 1].substring(0, itemTextOffset);
      }
    }
    const startProviderElement = this.providerElement(startSelection.item);
    const startSelectionElement = startProviderElement?.element();
    if (startSelectionElement && startSelection.node?.isSelfOrDescendant(startSelectionElement)) {
      const itemTextOffset = this.textOffsetInNode(startSelectionElement, startSelection.node, startSelection.offset);
      textLines[0] = textLines[0].substring(itemTextOffset);
    }
    return textLines.join("\n");
  }
  textOffsetInNode(itemElement, selectionNode, offset) {
    const textContentLength = selectionNode.textContent ? selectionNode.textContent.length : 0;
    if (selectionNode.nodeType !== Node.TEXT_NODE) {
      if (offset < selectionNode.childNodes.length) {
        selectionNode = selectionNode.childNodes.item(offset);
        offset = 0;
      } else {
        offset = textContentLength;
      }
    }
    let chars = 0;
    let node = itemElement;
    while ((node = node.traverseNextNode(itemElement)) && node !== selectionNode) {
      if (node.nodeType !== Node.TEXT_NODE || node.parentNode && (node.parentNode.nodeName === "STYLE" || node.parentNode.nodeName === "SCRIPT" || node.parentNode.nodeName === "#document-fragment")) {
        continue;
      }
      chars += Components4.Linkifier.Linkifier.untruncatedNodeText(node).length;
    }
    const untruncatedContainerLength = Components4.Linkifier.Linkifier.untruncatedNodeText(selectionNode).length;
    if (offset > 0 && untruncatedContainerLength !== textContentLength) {
      offset = untruncatedContainerLength;
    }
    return chars + offset;
  }
  onScroll(_event) {
    this.refresh();
  }
  firstVisibleIndex() {
    if (!this.cumulativeHeights.length) {
      return -1;
    }
    this.rebuildCumulativeHeightsIfNeeded();
    return Platform4.ArrayUtilities.lowerBound(
      this.cumulativeHeights,
      this.element.scrollTop + 1,
      Platform4.ArrayUtilities.DEFAULT_COMPARATOR
    );
  }
  lastVisibleIndex() {
    if (!this.cumulativeHeights.length) {
      return -1;
    }
    this.rebuildCumulativeHeightsIfNeeded();
    const scrollBottom = this.element.scrollTop + this.element.clientHeight;
    const right = this.itemCount - 1;
    return Platform4.ArrayUtilities.lowerBound(
      this.cumulativeHeights,
      scrollBottom,
      Platform4.ArrayUtilities.DEFAULT_COMPARATOR,
      void 0,
      right
    );
  }
  renderedElementAt(index) {
    if (index === -1 || index < this.firstActiveIndex || index > this.lastActiveIndex) {
      return null;
    }
    return this.renderedItems[index - this.firstActiveIndex].element();
  }
  scrollItemIntoView(index, makeLast) {
    const firstVisibleIndex = this.firstVisibleIndex();
    const lastVisibleIndex = this.lastVisibleIndex();
    if (index > firstVisibleIndex && index < lastVisibleIndex) {
      return;
    }
    if (index === lastVisibleIndex && this.cumulativeHeights[index] <= this.element.scrollTop + this.visibleHeight()) {
      return;
    }
    if (makeLast) {
      this.forceScrollItemToBeLast(index);
    } else if (index <= firstVisibleIndex) {
      this.forceScrollItemToBeFirst(index);
    } else if (index >= lastVisibleIndex) {
      this.forceScrollItemToBeLast(index);
    }
  }
  forceScrollItemToBeFirst(index) {
    console.assert(index >= 0 && index < this.itemCount, "Cannot scroll item at invalid index");
    this.setStickToBottom(false);
    this.rebuildCumulativeHeightsIfNeeded();
    this.element.scrollTop = index > 0 ? this.cumulativeHeights[index - 1] : 0;
    if (UI8.UIUtils.isScrolledToBottom(this.element)) {
      this.setStickToBottom(true);
    }
    this.refresh();
    const renderedElement = this.renderedElementAt(index);
    if (renderedElement) {
      renderedElement.scrollIntoView(
        true
        /* alignTop */
      );
    }
  }
  forceScrollItemToBeLast(index) {
    console.assert(index >= 0 && index < this.itemCount, "Cannot scroll item at invalid index");
    this.setStickToBottom(false);
    this.rebuildCumulativeHeightsIfNeeded();
    this.element.scrollTop = this.cumulativeHeights[index] - this.visibleHeight();
    if (UI8.UIUtils.isScrolledToBottom(this.element)) {
      this.setStickToBottom(true);
    }
    this.refresh();
    const renderedElement = this.renderedElementAt(index);
    if (renderedElement) {
      renderedElement.scrollIntoView(
        false
        /* alignTop */
      );
    }
  }
  visibleHeight() {
    return this.element.offsetHeight;
  }
};

// ../../front_end/panels/console/ConsolePrompt.ts
var ConsolePrompt_exports = {};
__export(ConsolePrompt_exports, {
  ConsolePrompt: () => ConsolePrompt,
  Events: () => Events2
});
import * as Common7 from "../../core/common/common.js";
import * as Host5 from "../../core/host/host.js";
import * as i18n13 from "../../core/i18n/i18n.js";
import * as Root4 from "../../core/root/root.js";
import * as SDK8 from "../../core/sdk/sdk.js";
import * as Badges from "../../models/badges/badges.js";
import * as Bindings5 from "../../models/bindings/bindings.js";
import * as Formatter2 from "../../models/formatter/formatter.js";
import * as SourceMapScopes from "../../models/source_map_scopes/source_map_scopes.js";
import * as CodeMirror2 from "../../third_party/codemirror.next/codemirror.next.js";
import * as TextEditor2 from "../../ui/components/text_editor/text_editor.js";
import { Icon as Icon2 } from "../../ui/kit/kit.js";
import * as ObjectUI4 from "../../ui/legacy/components/object_ui/object_ui.js";
import * as UI11 from "../../ui/legacy/legacy.js";
import * as Settings9 from "../../ui/settings/settings.js";
import * as VisualLogging7 from "../../ui/visual_logging/visual_logging.js";

// ../../front_end/panels/console/ConsolePanel.ts
var ConsolePanel_exports = {};
__export(ConsolePanel_exports, {
  ConsolePanel: () => ConsolePanel,
  ConsoleRevealer: () => ConsoleRevealer,
  WrapperView: () => WrapperView
});
import * as UI10 from "../../ui/legacy/legacy.js";
import * as VisualLogging6 from "../../ui/visual_logging/visual_logging.js";

// ../../front_end/panels/console/ConsoleView.ts
var ConsoleView_exports = {};
__export(ConsoleView_exports, {
  ActionDelegate: () => ActionDelegate,
  ConsoleView: () => ConsoleView,
  ConsoleViewFilter: () => ConsoleViewFilter
});
import "../../ui/legacy/legacy.js";
import * as Common6 from "../../core/common/common.js";
import * as Host4 from "../../core/host/host.js";
import * as i18n11 from "../../core/i18n/i18n.js";
import * as Platform5 from "../../core/platform/platform.js";
import * as Root3 from "../../core/root/root.js";
import * as SDK7 from "../../core/sdk/sdk.js";
import * as TextUtils6 from "../../core/text_utils/text_utils.js";
import * as AiCodeCompletion from "../../models/ai_code_completion/ai_code_completion.js";
import * as AiCodeGeneration from "../../models/ai_code_generation/ai_code_generation.js";
import * as Bindings4 from "../../models/bindings/bindings.js";
import * as IssuesManager from "../../models/issues_manager/issues_manager.js";
import * as Logs3 from "../../models/logs/logs.js";
import * as Workspace2 from "../../models/workspace/workspace.js";
import * as CodeHighlighter3 from "../../ui/components/code_highlighter/code_highlighter.js";
import * as Highlighting2 from "../../ui/components/highlighting/highlighting.js";
import * as IssueCounter2 from "../../ui/components/issue_counter/issue_counter.js";
import { createIcon as createIcon2 } from "../../ui/kit/kit.js";
import * as SettingsUI from "../../ui/legacy/components/settings_ui/settings_ui.js";
import * as Components5 from "../../ui/legacy/components/utils/utils.js";
import * as UI9 from "../../ui/legacy/legacy.js";
import * as Settings7 from "../../ui/settings/settings.js";
import * as VisualLogging5 from "../../ui/visual_logging/visual_logging.js";
import { AiCodeCompletionSummaryToolbar } from "../common/common.js";

// gen/front_end/panels/console/symbolizedErrorWidget.css.js
var symbolizedErrorWidget_css_default = `/*
 * Copyright 2026 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.symbolized-error-widget {
  white-space: pre-wrap;
  word-break: break-all;

  --display-formatted-stack-frame-default: block;
  --display-ignored-formatted-stack-frame-local: var(--display-ignored-formatted-stack-frame, none);

  &.show-hidden-rows {
    --display-ignored-formatted-stack-frame-local: var(--display-formatted-stack-frame-default);
  }
}

.symbolized-error-widget .formatted-stack-frame {
  display: var(--display-formatted-stack-frame-default);

  &:has(.ignore-list-link) {
    display: var(--display-ignored-formatted-stack-frame-local);
    opacity: 60%;

    /* Subsequent builtin stack frames are also treated as ignored */
    & + .formatted-builtin-stack-frame {
      display: var(--display-ignored-formatted-stack-frame-local);
      opacity: 60%;
    }
  }
}

.symbolized-error-widget .formatted-builtin-stack-frame {
  display: var(--display-formatted-stack-frame-default);
}

.symbolized-error-widget-host {
  display: inline;
}

.symbolized-error-header {
  display: block;
}

.error-message-text {
  display: inline;
}

/*# sourceURL=${import.meta.resolve("./symbolizedErrorWidget.css")} */`;

// ../../front_end/panels/console/ConsoleView.ts
var UIStrings5 = {
  /**
   * @description Label for button which links to Issues tab, specifying how many issues there are.
   */
  issuesWithColon: "{n, plural, =0 {No issues} =1 {# issue:} other {# issues:}}",
  /**
   * @description Text for the tooltip of the issue counter toolbar item.
   */
  issueToolbarTooltipGeneral: "Some problems no longer generate console messages, but are surfaced in the Issues tab.",
  /**
   * @description Text for the tooltip of the issue counter toolbar item. The placeholder indicates how many issues
   * there are in the Issues tab broken down by kind.
   * @example {1 page error, 2 breaking changes} issueEnumeration
   */
  issueToolbarClickToView: "Click to view {issueEnumeration}",
  /**
   * @description Text for the tooltip of the issue counter toolbar item. The placeholder indicates how many issues
   * there are in the Issues tab broken down by kind.
   */
  issueToolbarClickToGoToTheIssuesTab: "Click to go to the Issues tab",
  /**
   * @description Label for the search box input field in the Console view.
   */
  findStringInLogs: "Find string in logs",
  /**
   * @description Tooltip text that appears when hovering over the largeicon settings gear in show settings pane setting in Console view of the Console panel.
   */
  consoleSettings: "Console settings",
  /**
   * @description Title of a setting under the Console category that can be invoked through the command menu.
   */
  groupSimilarMessagesInConsole: "Group similar messages",
  /**
   * @description Title of a setting under the Console category that can be invoked through the command menu.
   */
  showCorsErrorsInConsole: "CORS errors in console",
  /**
   * @description Tooltip for the the Console sidebar toggle in the Console panel. Command to
   * open/show the sidebar.
   */
  showConsoleSidebar: "Show Console sidebar",
  /**
   * @description Tooltip for the the Console sidebar toggle in the Console panel. Command to
   * open/show the sidebar.
   */
  hideConsoleSidebar: "Hide Console sidebar",
  /**
   * @description Screen reader announcement when the sidebar is shown in the Console panel.
   */
  consoleSidebarShown: "Console sidebar shown",
  /**
   * @description Screen reader announcement when the sidebar is hidden in the Console panel.
   */
  consoleSidebarHidden: "Console sidebar hidden",
  /**
   * @description Tooltip text that appears on the setting to preserve log when hovering over the item.
   */
  doNotClearLogOnPageReload: "Don\u2019t clear log on page reload / navigation",
  /**
   * @description Text to preserve the log after refreshing.
   */
  preserveLog: "Keep log",
  /**
   * @description Title of a setting under the Console category to show network requests in the console.
   */
  networkMessages: "Network messages",
  /**
   * @description Tooltip text that appears on the setting when hovering over it in Console view of the Console panel.
   */
  onlyShowMessagesFromTheCurrentContext: "Only show messages from the current context (`top`, `iframe`, `worker`, extension)",
  /**
   * @description Alternative title text of a setting in Console view of the Console panel.
   */
  selectedContextOnly: "Selected context only",
  /**
   * @description Description of a setting that controls whether XMLHttpRequests are logged in the console.
   */
  logXMLHttpRequests: "Log XMLHttpRequests",
  /**
   * @description Tooltip text that appears on the setting when hovering over it in Console view of the Console panel.
   */
  eagerlyEvaluateTextInThePrompt: "Eagerly evaluate text in the prompt",
  /**
   * @description Description of a setting that controls whether text typed in the console should be autocompleted from commands executed in the local console history.
   */
  autocompleteFromHistory: "Autocomplete from history",
  /**
   * @description Description of a setting that controls whether user activation is triggered by evaluation'.
   */
  treatEvaluationAsUserActivation: "Treat evaluation as user activation",
  /**
   * @description Text in Console view of the Console panel, indicating that a number of console
   * messages have been hidden.
   */
  sHidden: "{n, plural, =1 {# hidden} other {# hidden}}",
  /**
   * @description Alert message for screen readers when the console is cleared.
   */
  consoleCleared: "Console cleared",
  /**
   * @description Context menu item to filter out console messages originating from a specific script or file.
   * @example {index.js} PH1
   */
  hideMessagesFromS: "Hide messages from {PH1}",
  /**
   * @description Text to save content as a specific file type.
   */
  saveAs: "Save as\u2026",
  /**
   * @description Text to copy console log to clipboard.
   */
  copyConsole: "Copy console",
  /**
   * @description A context menu item in the Console view of the Console panel.
   */
  copyVisibleStyledSelection: "Copy visible styled selection",
  /**
   * @description Text to resend a network request.
   */
  resend: "Resend",
  /**
   * @description Text to indicate DevTools is writing to a file.
   */
  writingFile: "Writing file\u2026",
  /**
   * @description Text to indicate the searching is in progress.
   */
  searching: "Searching\u2026",
  /**
   * @description Placeholder hint text inside the filter input box in the Console view.
   */
  egEventdCdnUrlacom: "e.g. `/eventd/ -cdn url:a.com`",
  /**
   * @description Label for the verbose log level option in the filter dropdown in the Console view.
   */
  verbose: "Verbose",
  /**
   * @description Label for the info log level option in the filter dropdown in the Console view.
   */
  info: "Info",
  /**
   * @description Label for the warning log level option in the filter dropdown in the Console view.
   */
  warnings: "Warnings",
  /**
   * @description Label for the error log level option in the filter dropdown in the Console view.
   */
  errors: "Errors",
  /**
   * @description Tooltip text of the info icon shown next to the filter drop down
   *              in the Console panels main toolbar when the sidebar is active.
   */
  overriddenByFilterSidebar: "Log levels are controlled by the Console sidebar.",
  /**
   * @description Label for the custom log levels option in the filter dropdown in the Console view.
   */
  customLevels: "Custom levels",
  /**
   * @description Option in the log level filter menu to show only a specific log level.
   * @example {Warnings} PH1
   */
  sOnly: "{PH1} only",
  /**
   * @description Option in the log level filter menu to show all log levels.
   */
  allLevels: "All levels",
  /**
   * @description Option in the log level filter menu to show default log levels.
   */
  defaultLevels: "Default levels",
  /**
   * @description Option in the log level filter menu to hide all log levels.
   */
  hideAll: "Hide all",
  /**
   * @description Title of level menu button in Console view of the Console panel.
   * @example {All levels} PH1
   */
  logLevelS: "Log level: {PH1}",
  /**
   * @description A context menu item in the Console view of the Console panel.
   */
  default: "Default",
  /**
   * @description Text summary to indicate total number of messages in console for accessibility/screen readers.
   * @example {5} PH1
   */
  filteredMessagesInConsole: "{PH1} messages in console",
  /**
   * @description Tooltip for the collapse all button in the Console panel toolbar.
   * Clicking this button will collapse all groups and stack traces.
   */
  collapseAll: "Collapse all",
  /**
   * @description Tooltip for the expand all button in the Console panel toolbar.
   * Clicking this button will expand all groups and stack traces.
   */
  expandAll: "Expand all"
};
var str_5 = i18n11.i18n.registerUIStrings("panels/console/ConsoleView.ts", UIStrings5);
var i18nString5 = i18n11.i18n.getLocalizedString.bind(void 0, str_5);
var consoleViewInstance;
var MIN_HISTORY_LENGTH_FOR_DISABLING_SELF_XSS_WARNING = 5;
var DISCLAIMER_TOOLTIP_ID = "console-ai-code-completion-disclaimer-tooltip";
var SPINNER_TOOLTIP_ID = "console-ai-code-completion-spinner-tooltip";
var CITATIONS_TOOLTIP_ID = "console-ai-code-completion-citations-tooltip";
var ConsoleView = class _ConsoleView extends UI9.Widget.VBox {
  #searchableView;
  sidebar;
  isSidebarOpen;
  filter;
  consoleToolbarContainer;
  splitWidget;
  contentsElement;
  visibleViewMessages;
  hiddenByFilterCount;
  shouldBeHiddenCache;
  lastShownHiddenByFilterCount;
  currentMatchRangeIndex;
  searchRegex;
  groupableMessages;
  groupableMessageTitle;
  shortcuts;
  regexMatchRanges;
  consoleContextSelector;
  filterStatusText;
  showSettingsPaneSetting;
  showSettingsPaneButton;
  progressToolbarItem;
  groupSimilarSetting;
  showCorsErrorsSetting;
  timestampsSetting;
  consoleHistoryAutocompleteSetting;
  selfXssWarningDisabledSetting;
  pinPane;
  viewport;
  messagesElement;
  messagesCountElement;
  viewportThrottler;
  pendingBatchResize;
  onMessageResizedBound;
  promptElement;
  linkifier;
  consoleMessages;
  consoleGroupStarts;
  prompt;
  immediatelyFilterMessagesForTest;
  maybeDirtyWhileMuted;
  scheduledRefreshPromiseForTest;
  needsFullUpdate;
  buildHiddenCacheTimeout;
  searchShouldJumpBackwards;
  searchProgressIndicator;
  #searchTimeoutId;
  muteViewportUpdates;
  waitForScrollTimeout;
  issueCounter;
  pendingSidebarMessages = [];
  userHasOpenedSidebarAtLeastOnce = false;
  issueToolbarThrottle;
  requestResolver = new Logs3.RequestResolver.RequestResolver(Logs3.NetworkLog.NetworkLog.instance());
  issueResolver = new IssuesManager.IssueResolver.IssueResolver(IssuesManager.IssuesManager.IssuesManager.instance());
  #isDetached = false;
  #onIssuesCountUpdateBound = this.#onIssuesCountUpdate.bind(this);
  #collapseAllButton;
  #allCollapsed = false;
  aiCodeCompletionConfig;
  aiCodeCompletionSummaryToolbarContainer;
  aiCodeCompletionSummaryToolbar;
  constructor(viewportThrottlerTimeout) {
    super();
    this.setMinimumSize(0, 35);
    this.registerRequiredCSS(
      consoleView_css_default,
      symbolizedErrorWidget_css_default,
      objectValue_css_default,
      CodeHighlighter3.codeHighlighterStyles
    );
    this.#searchableView = new UI9.SearchableView.SearchableView(this, null);
    this.#searchableView.element.classList.add("console-searchable-view");
    this.#searchableView.setPlaceholder(i18nString5(UIStrings5.findStringInLogs));
    this.#searchableView.setMinimalSearchQuerySize(0);
    this.sidebar = new ConsoleSidebar();
    this.sidebar.addEventListener("FilterSelected" /* FILTER_SELECTED */, this.onFilterChanged.bind(this));
    this.isSidebarOpen = false;
    this.filter = new ConsoleViewFilter(this.onFilterChanged.bind(this));
    this.consoleToolbarContainer = this.element.createChild("div", "console-toolbar-container");
    this.consoleToolbarContainer.role = "toolbar";
    this.splitWidget = new UI9.SplitWidget.SplitWidget(
      true,
      false,
      "console.sidebar.width",
      100
    );
    this.splitWidget.setMainWidget(this.#searchableView);
    this.splitWidget.setSidebarWidget(this.sidebar);
    this.splitWidget.show(this.element);
    this.splitWidget.hideSidebar();
    this.splitWidget.enableShowModeSaving();
    this.isSidebarOpen = this.splitWidget.showMode() === UI9.SplitWidget.ShowMode.BOTH;
    this.filter.setLevelMenuOverridden(this.isSidebarOpen);
    this.splitWidget.addEventListener(UI9.SplitWidget.Events.SHOW_MODE_CHANGED, (event) => {
      this.isSidebarOpen = event.data === UI9.SplitWidget.ShowMode.BOTH;
      if (this.isSidebarOpen) {
        if (!this.userHasOpenedSidebarAtLeastOnce) {
          Host4.userMetrics.actionTaken(Host4.UserMetrics.Action.ConsoleSidebarOpened);
          this.userHasOpenedSidebarAtLeastOnce = true;
        }
        this.pendingSidebarMessages.forEach((message) => {
          this.sidebar.onMessageAdded(message);
        });
        this.pendingSidebarMessages = [];
      }
      this.filter.setLevelMenuOverridden(this.isSidebarOpen);
      this.onFilterChanged();
    });
    this.contentsElement = this.#searchableView.element;
    this.element.classList.add("console-view");
    this.visibleViewMessages = [];
    this.hiddenByFilterCount = 0;
    this.shouldBeHiddenCache = /* @__PURE__ */ new Set();
    this.groupableMessages = /* @__PURE__ */ new Map();
    this.groupableMessageTitle = /* @__PURE__ */ new Map();
    this.shortcuts = /* @__PURE__ */ new Map();
    this.regexMatchRanges = [];
    this.consoleContextSelector = new ConsoleContextSelector();
    this.filterStatusText = new UI9.Toolbar.ToolbarText();
    this.filterStatusText.element.classList.add("dimmed");
    this.showSettingsPaneSetting = Common6.Settings.Settings.instance().createSetting("console-show-settings-toolbar", false);
    this.showSettingsPaneButton = new UI9.Toolbar.ToolbarSettingToggle(
      this.showSettingsPaneSetting,
      "gear",
      i18nString5(UIStrings5.consoleSettings),
      "gear-filled"
    );
    this.showSettingsPaneButton.element.setAttribute(
      "jslog",
      `${VisualLogging5.toggleSubpane("console-settings").track({ click: true })}`
    );
    this.progressToolbarItem = new UI9.Toolbar.ToolbarItem(document.createElement("div"));
    this.groupSimilarSetting = Common6.Settings.Settings.instance().resolve(Settings7.ConsoleSettings.consoleGroupSimilarSettingDescriptor);
    this.groupSimilarSetting.addChangeListener(() => this.updateMessageList());
    this.showCorsErrorsSetting = Common6.Settings.Settings.instance().resolve(Settings7.ConsoleSettings.consoleShowsCorsErrorsSettingDescriptor);
    this.showCorsErrorsSetting.addChangeListener(() => this.updateMessageList());
    const toolbar2 = this.consoleToolbarContainer.createChild("devtools-toolbar", "console-main-toolbar");
    toolbar2.setAttribute("jslog", `${VisualLogging5.toolbar()}`);
    toolbar2.role = "presentation";
    toolbar2.wrappable = true;
    toolbar2.appendToolbarItem(this.splitWidget.createShowHideSidebarButton(
      i18nString5(UIStrings5.showConsoleSidebar),
      i18nString5(UIStrings5.hideConsoleSidebar),
      i18nString5(UIStrings5.consoleSidebarShown),
      i18nString5(UIStrings5.consoleSidebarHidden),
      "console-sidebar"
    ));
    toolbar2.appendToolbarItem(UI9.Toolbar.Toolbar.createActionButton("console.clear"));
    this.#collapseAllButton = new UI9.Toolbar.ToolbarButton(i18nString5(UIStrings5.collapseAll), "compress", void 0, "console.collapse-all");
    this.#collapseAllButton.addEventListener(UI9.Toolbar.ToolbarButton.Events.CLICK, this.#toggleCollapseAll, this);
    toolbar2.appendToolbarItem(this.#collapseAllButton);
    toolbar2.appendSeparator();
    toolbar2.appendToolbarItem(this.consoleContextSelector.toolbarItem());
    toolbar2.appendSeparator();
    const liveExpressionButton = UI9.Toolbar.Toolbar.createActionButton("console.create-pin");
    toolbar2.appendToolbarItem(liveExpressionButton);
    toolbar2.appendSeparator();
    toolbar2.appendToolbarItem(this.filter.textFilterUI);
    toolbar2.appendToolbarItem(this.filter.levelMenuButton);
    toolbar2.appendToolbarItem(this.filter.levelMenuButtonInfo);
    toolbar2.appendToolbarItem(this.progressToolbarItem);
    toolbar2.appendSeparator();
    this.issueCounter = new IssueCounter2.IssueCounter.IssueCounter();
    this.issueCounter.id = "console-issues-counter";
    this.issueCounter.setAttribute("jslog", `${VisualLogging5.counter("issues").track({ click: true })}`);
    const issuesToolbarItem = new UI9.Toolbar.ToolbarItem(this.issueCounter);
    this.issueCounter.data = {
      clickHandler: () => {
        Host4.userMetrics.issuesPanelOpenedFrom(Host4.UserMetrics.IssueOpener.STATUS_BAR_ISSUES_COUNTER);
        void UI9.ViewManager.ViewManager.instance().showView("issues-pane");
      },
      issuesManager: IssuesManager.IssuesManager.IssuesManager.instance(),
      accessibleName: i18nString5(UIStrings5.issueToolbarTooltipGeneral),
      displayMode: IssueCounter2.IssueCounter.DisplayMode.OMIT_EMPTY
    };
    toolbar2.appendToolbarItem(issuesToolbarItem);
    toolbar2.appendSeparator();
    toolbar2.appendToolbarItem(this.filterStatusText);
    toolbar2.appendToolbarItem(this.showSettingsPaneButton);
    const monitoringXHREnabledSetting = Common6.Settings.Settings.instance().resolve(SDK7.SDKSettings.monitoringXHREnabledSettingDescriptor);
    this.timestampsSetting = Common6.Settings.Settings.instance().resolve(Settings7.ConsoleSettings.consoleTimestampsEnabledSettingDescriptor);
    this.consoleHistoryAutocompleteSetting = Common6.Settings.Settings.instance().resolve(
      Settings7.ConsoleSettings.consoleHistoryAutocompleteSettingDescriptor
    );
    this.selfXssWarningDisabledSetting = Common6.Settings.Settings.instance().createSetting(
      "disable-self-xss-warning",
      false,
      Common6.Settings.SettingStorageType.SYNCED
    );
    const settingsPane = this.contentsElement.createChild("div", "console-settings-pane");
    UI9.ARIAUtils.setLabel(settingsPane, i18nString5(UIStrings5.consoleSettings));
    UI9.ARIAUtils.markAsGroup(settingsPane);
    const consoleEagerEvalSetting = Common6.Settings.Settings.instance().resolve(Settings7.ConsoleSettings.consoleEagerEvalSettingDescriptor);
    const preserveConsoleLogSetting = Common6.Settings.Settings.instance().resolve(SDK7.SDKSettings.preserveConsoleLogSettingDescriptor);
    const userActivationEvalSetting = Common6.Settings.Settings.instance().resolve(SDK7.SDKSettings.consoleUserActivationEvalSettingDescriptor);
    settingsPane.append(
      SettingsUI.SettingsUI.createSettingCheckbox(
        i18nString5(UIStrings5.networkMessages),
        this.filter.networkMessagesSetting,
        Settings7.SettingUIRegistration.resolve(this.filter.networkMessagesSetting.descriptor()).title
      ),
      SettingsUI.SettingsUI.createSettingCheckbox(
        i18nString5(UIStrings5.logXMLHttpRequests),
        monitoringXHREnabledSetting
      ),
      SettingsUI.SettingsUI.createSettingCheckbox(
        i18nString5(UIStrings5.preserveLog),
        preserveConsoleLogSetting,
        i18nString5(UIStrings5.doNotClearLogOnPageReload)
      ),
      SettingsUI.SettingsUI.createSettingCheckbox(
        Settings7.SettingUIRegistration.resolve(consoleEagerEvalSetting.descriptor()).title,
        consoleEagerEvalSetting,
        i18nString5(UIStrings5.eagerlyEvaluateTextInThePrompt)
      ),
      SettingsUI.SettingsUI.createSettingCheckbox(
        i18nString5(UIStrings5.selectedContextOnly),
        this.filter.filterByExecutionContextSetting,
        i18nString5(UIStrings5.onlyShowMessagesFromTheCurrentContext)
      ),
      SettingsUI.SettingsUI.createSettingCheckbox(
        Settings7.SettingUIRegistration.resolve(this.consoleHistoryAutocompleteSetting.descriptor()).title,
        this.consoleHistoryAutocompleteSetting,
        i18nString5(UIStrings5.autocompleteFromHistory)
      ),
      SettingsUI.SettingsUI.createSettingCheckbox(
        Settings7.SettingUIRegistration.resolve(this.groupSimilarSetting.descriptor()).title,
        this.groupSimilarSetting,
        i18nString5(UIStrings5.groupSimilarMessagesInConsole)
      ),
      SettingsUI.SettingsUI.createSettingCheckbox(
        Settings7.SettingUIRegistration.resolve(userActivationEvalSetting.descriptor()).title,
        userActivationEvalSetting,
        i18nString5(UIStrings5.treatEvaluationAsUserActivation)
      ),
      SettingsUI.SettingsUI.createSettingCheckbox(
        Settings7.SettingUIRegistration.resolve(this.showCorsErrorsSetting.descriptor()).title,
        this.showCorsErrorsSetting,
        i18nString5(UIStrings5.showCorsErrorsInConsole)
      )
    );
    if (!this.showSettingsPaneSetting.get()) {
      settingsPane.classList.add("hidden");
    }
    this.showSettingsPaneSetting.addChangeListener(
      () => settingsPane.classList.toggle("hidden", !this.showSettingsPaneSetting.get())
    );
    this.pinPane = new ConsolePinPane(() => this.prompt.focus());
    this.pinPane.element.classList.add("console-view-pinpane");
    this.pinPane.element.classList.remove("flex-auto");
    this.pinPane.show(this.contentsElement);
    this.viewport = new ConsoleViewport(this);
    this.viewport.setStickToBottom(true);
    this.viewport.contentElement().classList.add("console-group", "console-group-messages");
    this.contentsElement.appendChild(this.viewport.element);
    this.messagesElement = this.viewport.element;
    this.messagesElement.id = "console-messages";
    this.messagesElement.classList.add("monospace");
    this.messagesElement.addEventListener("click", this.messagesClicked.bind(this), false);
    ["paste", "clipboard-paste", "drop"].forEach((type) => {
      this.messagesElement.addEventListener(type, this.messagesPasted.bind(this), true);
    });
    this.messagesCountElement = this.consoleToolbarContainer.createChild("div", "message-count");
    UI9.ARIAUtils.markAsPoliteLiveRegion(this.messagesCountElement, false);
    this.viewportThrottler = new Common6.Throttler.Throttler(viewportThrottlerTimeout);
    this.pendingBatchResize = false;
    this.onMessageResizedBound = (e) => {
      void this.onMessageResized(e);
    };
    this.promptElement = this.messagesElement.createChild("div", "source-code");
    this.promptElement.id = "console-prompt";
    const selectAllFixer = this.messagesElement.createChild("div", "console-view-fix-select-all");
    selectAllFixer.textContent = ".";
    UI9.ARIAUtils.setHidden(selectAllFixer, true);
    this.registerShortcuts();
    this.messagesElement.addEventListener("contextmenu", this.handleContextMenuEvent.bind(this), false);
    const throttler = new Common6.Throttler.Throttler(100);
    const refilterMessages = () => throttler.schedule(async () => this.onFilterChanged());
    this.linkifier = new Components5.Linkifier.Linkifier(UI9.UIUtils.MaxLengthForDisplayedURLsInConsole);
    this.linkifier.addEventListener(Components5.Linkifier.Events.LIVE_LOCATION_UPDATED, refilterMessages);
    this.consoleMessages = [];
    this.consoleGroupStarts = [];
    this.aiCodeCompletionConfig = AiCodeCompletion.AiCodeCompletion.AiCodeCompletion.isAiCodeCompletionAvailable() ? {
      completionContext: {
        getPrefix: this.getConsoleMessageHistory.bind(this),
        additionalFiles: [{
          path: "devtools-console-context.js",
          content: AiCodeCompletion.AiCodeCompletion.consoleAdditionalContextFileContent,
          included_reason: Host4.AidaClient.Reason.RELATED_FILE
        }],
        stopSequences: ["\n\n"]
      },
      generationContext: {
        additionalPreambleContext: AiCodeGeneration.AiCodeGeneration.additionalContextForConsole
      },
      onFeatureEnabled: () => {
        this.setupAiCodeCompletion();
      },
      onFeatureDisabled: () => {
        this.cleanupAiCodeCompletion();
      },
      onSuggestionAccepted: this.#onAiCodeCompletionSuggestionAccepted.bind(this),
      onRequestTriggered: this.#onAiCodeCompletionRequestTriggered.bind(this),
      onResponseReceived: this.#onAiCodeCompletionResponseReceived.bind(this),
      disclaimerTooltipId: "console-ai-code-generation-disclaimer-tooltip",
      disclaimerTextVariant: "console"
    } : void 0;
    this.prompt = new ConsolePrompt(this.aiCodeCompletionConfig);
    this.prompt.show(this.promptElement);
    this.prompt.element.addEventListener("keydown", this.promptKeyDown.bind(this), true);
    this.prompt.addEventListener("TextChanged" /* TEXT_CHANGED */, this.promptTextChanged, this);
    this.messagesElement.addEventListener("keydown", this.messagesKeyDown.bind(this), false);
    this.prompt.element.addEventListener("focusin", () => {
      if (this.isScrolledToBottom()) {
        this.viewport.setStickToBottom(true);
      }
    });
    this.consoleHistoryAutocompleteSetting.addChangeListener(this.consoleHistoryAutocompleteChanged, this);
    this.consoleHistoryAutocompleteChanged();
    this.updateFilterStatus();
    this.timestampsSetting.addChangeListener(this.consoleTimestampsSettingChanged, this);
    this.registerWithMessageSink();
    UI9.Context.Context.instance().addFlavorChangeListener(
      SDK7.RuntimeModel.ExecutionContext,
      this.executionContextChanged,
      this
    );
    this.messagesElement.addEventListener(
      "mousedown",
      (event) => this.updateStickToBottomOnPointerDown(event.button === 2),
      false
    );
    this.messagesElement.addEventListener("mouseup", this.updateStickToBottomOnPointerUp.bind(this), false);
    this.messagesElement.addEventListener("mouseleave", this.updateStickToBottomOnPointerUp.bind(this), false);
    this.messagesElement.addEventListener("wheel", this.updateStickToBottomOnWheel.bind(this), false);
    this.messagesElement.addEventListener("touchstart", this.updateStickToBottomOnPointerDown.bind(this, false), false);
    this.messagesElement.addEventListener("touchend", this.updateStickToBottomOnPointerUp.bind(this), false);
    this.messagesElement.addEventListener("touchcancel", this.updateStickToBottomOnPointerUp.bind(this), false);
    SDK7.TargetManager.TargetManager.instance().addModelListener(
      SDK7.ConsoleModel.ConsoleModel,
      SDK7.ConsoleModel.Events.ConsoleCleared,
      this.consoleCleared,
      this,
      { scoped: true }
    );
    SDK7.TargetManager.TargetManager.instance().addModelListener(
      SDK7.ConsoleModel.ConsoleModel,
      SDK7.ConsoleModel.Events.MessageAdded,
      this.onConsoleMessageAdded,
      this,
      { scoped: true }
    );
    SDK7.TargetManager.TargetManager.instance().addModelListener(
      SDK7.ConsoleModel.ConsoleModel,
      SDK7.ConsoleModel.Events.MessageUpdated,
      this.onConsoleMessageUpdated,
      this,
      { scoped: true }
    );
    SDK7.TargetManager.TargetManager.instance().addModelListener(
      SDK7.ConsoleModel.ConsoleModel,
      SDK7.ConsoleModel.Events.CommandEvaluated,
      this.commandEvaluated,
      this,
      { scoped: true }
    );
    SDK7.TargetManager.TargetManager.instance().observeModels(SDK7.ConsoleModel.ConsoleModel, this, { scoped: true });
    const issuesManager = IssuesManager.IssuesManager.IssuesManager.instance();
    this.issueToolbarThrottle = new Common6.Throttler.Throttler(100);
    issuesManager.addEventListener(
      IssuesManager.IssuesManager.Events.ISSUES_COUNT_UPDATED,
      this.#onIssuesCountUpdateBound
    );
  }
  static clearConsoleViewInstanceForTest() {
    consoleViewInstance = null;
  }
  static instance(opts) {
    if (!consoleViewInstance || opts?.forceNew) {
      consoleViewInstance = new _ConsoleView(opts?.viewportThrottlerTimeout ?? 50);
    }
    return consoleViewInstance;
  }
  createAiCodeCompletionSummaryToolbar() {
    if (this.aiCodeCompletionSummaryToolbar) {
      return;
    }
    this.aiCodeCompletionSummaryToolbar = new AiCodeCompletionSummaryToolbar.AiCodeCompletionSummaryToolbar({
      citationsTooltipId: CITATIONS_TOOLTIP_ID,
      disclaimerTooltipId: DISCLAIMER_TOOLTIP_ID,
      spinnerTooltipId: SPINNER_TOOLTIP_ID,
      disclaimerTextVariant: "console"
    });
    this.aiCodeCompletionSummaryToolbarContainer = this.element.createChild("div", "ai-code-completion-summary-toolbar-container");
    this.aiCodeCompletionSummaryToolbar.show(this.aiCodeCompletionSummaryToolbarContainer, void 0, true);
  }
  #onAiCodeCompletionSuggestionAccepted(citations) {
    if (!this.aiCodeCompletionSummaryToolbar || citations.length === 0) {
      return;
    }
    const citationsUri = citations.map((citation) => citation.uri).filter((uri) => Boolean(uri));
    this.aiCodeCompletionSummaryToolbar.updateCitations(citationsUri);
  }
  #onAiCodeCompletionRequestTriggered() {
    this.aiCodeCompletionSummaryToolbar?.setLoading(true);
  }
  #onAiCodeCompletionResponseReceived() {
    this.aiCodeCompletionSummaryToolbar?.setLoading(false);
  }
  clearConsole() {
    SDK7.ConsoleModel.ConsoleModel.requestClearMessages(SDK7.TargetManager.TargetManager.instance());
    this.prompt.clearAiCodeCompletionCache();
  }
  collapseAll() {
    for (const message of this.consoleMessages) {
      if (message instanceof ConsoleGroupViewMessage) {
        message.setCollapsedSilent(true);
      }
      message.setTraceExpanded(false);
    }
    this.updateMessageList();
  }
  expandAll() {
    for (const message of this.consoleMessages) {
      if (message instanceof ConsoleGroupViewMessage) {
        message.setCollapsedSilent(false);
      }
      message.setTraceExpanded(true);
    }
    this.updateMessageList();
  }
  #toggleCollapseAll() {
    if (this.#allCollapsed) {
      this.expandAll();
    } else {
      this.collapseAll();
    }
    this.#allCollapsed = !this.#allCollapsed;
    this.#updateCollapseAllButton();
  }
  #updateCollapseAllButton() {
    let hasExpandedMessages = false;
    let hasCollapsedMessages = false;
    for (const message of this.visibleViewMessages) {
      if (message instanceof ConsoleGroupViewMessage) {
        hasExpandedMessages = hasExpandedMessages || !message.collapsed();
        hasCollapsedMessages = hasCollapsedMessages || message.collapsed();
      }
      if (message.isExpandableTrace()) {
        hasExpandedMessages = hasExpandedMessages || message.isTraceExpanded();
        hasCollapsedMessages = hasCollapsedMessages || !message.isTraceExpanded();
      }
      if (hasExpandedMessages && hasCollapsedMessages) {
        break;
      }
    }
    this.#allCollapsed = !hasExpandedMessages && hasCollapsedMessages;
    if (this.#allCollapsed) {
      this.#collapseAllButton.setGlyph("expand");
      this.#collapseAllButton.setTitle(i18nString5(UIStrings5.expandAll));
    } else {
      this.#collapseAllButton.setGlyph("compress");
      this.#collapseAllButton.setTitle(i18nString5(UIStrings5.collapseAll));
    }
  }
  #onIssuesCountUpdate() {
    void this.issueToolbarThrottle.schedule(async () => this.updateIssuesToolbarItem());
    this.issuesCountUpdatedForTest();
  }
  issuesCountUpdatedForTest() {
  }
  modelAdded(model) {
    model.messages().forEach(this.addConsoleMessage, this);
  }
  modelRemoved(model) {
    if (!Common6.Settings.Settings.instance().resolve(SDK7.SDKSettings.preserveConsoleLogSettingDescriptor).get() && model.target().outermostTarget() === model.target()) {
      this.consoleCleared();
    }
  }
  onFilterChanged() {
    this.filter.currentFilter.levelsMask = this.isSidebarOpen ? ConsoleFilter.allLevelsFilterValue() : this.filter.messageLevelFiltersSetting.get();
    this.cancelBuildHiddenCache();
    if (this.immediatelyFilterMessagesForTest) {
      for (const viewMessage of this.consoleMessages) {
        this.computeShouldMessageBeVisible(viewMessage);
      }
      this.updateMessageList();
      return;
    }
    this.buildHiddenCache(0, this.consoleMessages.slice());
  }
  setImmediatelyFilterMessagesForTest() {
    this.immediatelyFilterMessagesForTest = true;
  }
  searchableView() {
    return this.#searchableView;
  }
  clearHistory() {
    this.prompt.history().clear();
    this.prompt.clearAiCodeCompletionCache();
  }
  consoleHistoryAutocompleteChanged() {
    this.prompt.setAddCompletionsFromHistory(this.consoleHistoryAutocompleteSetting.get());
  }
  itemCount() {
    return this.visibleViewMessages.length;
  }
  itemElement(index) {
    return this.visibleViewMessages[index];
  }
  fastHeight(index) {
    return this.visibleViewMessages[index].fastHeight();
  }
  minimumRowHeight() {
    return 16;
  }
  registerWithMessageSink() {
    Common6.Console.Console.instance().messages().forEach(this.addSinkMessage, this);
    Common6.Console.Console.instance().addEventListener(Common6.Console.Events.MESSAGE_ADDED, ({ data: message }) => {
      this.addSinkMessage(message);
    }, this);
  }
  addSinkMessage(message) {
    let level = Log.LogEntryLevel.Verbose;
    switch (message.level) {
      case Common6.Console.MessageLevel.INFO:
        level = Log.LogEntryLevel.Info;
        break;
      case Common6.Console.MessageLevel.ERROR:
        level = Log.LogEntryLevel.Error;
        break;
      case Common6.Console.MessageLevel.WARNING:
        level = Log.LogEntryLevel.Warning;
        break;
    }
    const source = message.source || Log.LogEntrySource.Other;
    const consoleMessage = new SDK7.ConsoleModel.ConsoleMessage(
      null,
      source,
      level,
      message.text,
      { type: SDK7.ConsoleModel.FrontendMessageType.System, timestamp: message.timestamp }
    );
    this.addConsoleMessage(consoleMessage);
  }
  consoleTimestampsSettingChanged() {
    this.updateMessageList();
    this.consoleMessages.forEach((viewMessage) => viewMessage.updateTimestamp());
    this.groupableMessageTitle.forEach((viewMessage) => viewMessage.updateTimestamp());
  }
  executionContextChanged() {
    this.prompt.clearAutocomplete();
  }
  willHide() {
    super.willHide();
    this.hidePromptSuggestBox();
  }
  dispose() {
    SDK7.TargetManager.TargetManager.instance().removeModelListener(
      SDK7.ConsoleModel.ConsoleModel,
      SDK7.ConsoleModel.Events.ConsoleCleared,
      this.consoleCleared,
      this
    );
    SDK7.TargetManager.TargetManager.instance().removeModelListener(
      SDK7.ConsoleModel.ConsoleModel,
      SDK7.ConsoleModel.Events.MessageAdded,
      this.onConsoleMessageAdded,
      this
    );
    SDK7.TargetManager.TargetManager.instance().removeModelListener(
      SDK7.ConsoleModel.ConsoleModel,
      SDK7.ConsoleModel.Events.MessageUpdated,
      this.onConsoleMessageUpdated,
      this
    );
    SDK7.TargetManager.TargetManager.instance().removeModelListener(
      SDK7.ConsoleModel.ConsoleModel,
      SDK7.ConsoleModel.Events.CommandEvaluated,
      this.commandEvaluated,
      this
    );
    SDK7.TargetManager.TargetManager.instance().unobserveModels(SDK7.ConsoleModel.ConsoleModel, this);
    const issuesManager = IssuesManager.IssuesManager.IssuesManager.instance();
    issuesManager.removeEventListener(
      IssuesManager.IssuesManager.Events.ISSUES_COUNT_UPDATED,
      this.#onIssuesCountUpdateBound
    );
  }
  wasShown() {
    super.wasShown();
    if (this.#isDetached) {
      const issuesManager = IssuesManager.IssuesManager.IssuesManager.instance();
      issuesManager.addEventListener(
        IssuesManager.IssuesManager.Events.ISSUES_COUNT_UPDATED,
        this.#onIssuesCountUpdateBound
      );
    }
    this.#isDetached = false;
    this.updateIssuesToolbarItem();
    this.viewport.refresh();
  }
  focus() {
    if (this.viewport.hasVirtualSelection()) {
      this.viewport.contentElement().focus();
    } else {
      this.focusPrompt();
    }
  }
  focusPrompt() {
    if (!this.prompt.hasFocus()) {
      const oldStickToBottom = this.viewport.stickToBottom();
      const oldScrollTop = this.viewport.element.scrollTop;
      this.prompt.focus();
      this.viewport.setStickToBottom(oldStickToBottom);
      this.viewport.element.scrollTop = oldScrollTop;
    }
  }
  /**
   * Inserts text into the console prompt (replacing any existing content)
   * and focuses the prompt. Used by cross-panel features such as
   * "Edit and resend as fetch".
   */
  insertIntoPrompt(text) {
    this.prompt.insertText(text);
    this.focusPrompt();
  }
  restoreScrollPositions() {
    if (this.viewport.stickToBottom()) {
      this.immediatelyScrollToBottom();
    } else {
      super.restoreScrollPositions();
    }
  }
  onResize() {
    this.scheduleViewportRefresh();
    this.hidePromptSuggestBox();
    if (this.viewport.stickToBottom()) {
      this.immediatelyScrollToBottom();
    }
    for (let i = 0; i < this.visibleViewMessages.length; ++i) {
      this.visibleViewMessages[i].onResize();
    }
  }
  hidePromptSuggestBox() {
    this.prompt.clearAutocomplete();
  }
  async invalidateViewport() {
    this.updateIssuesToolbarItem();
    if (this.muteViewportUpdates) {
      this.maybeDirtyWhileMuted = true;
      return;
    }
    if (this.needsFullUpdate) {
      this.updateMessageList();
      delete this.needsFullUpdate;
    } else {
      this.viewport.invalidate();
    }
    return;
  }
  onDetach() {
    this.#isDetached = true;
    const issuesManager = IssuesManager.IssuesManager.IssuesManager.instance();
    issuesManager.removeEventListener(
      IssuesManager.IssuesManager.Events.ISSUES_COUNT_UPDATED,
      this.#onIssuesCountUpdateBound
    );
  }
  updateIssuesToolbarItem() {
    if (this.#isDetached) {
      return;
    }
    const manager = IssuesManager.IssuesManager.IssuesManager.instance();
    const issueEnumeration = IssueCounter2.IssueCounter.getIssueCountsEnumeration(manager);
    const issuesTitleGotoIssues = manager.numberOfIssues() === 0 ? i18nString5(UIStrings5.issueToolbarClickToGoToTheIssuesTab) : i18nString5(UIStrings5.issueToolbarClickToView, { issueEnumeration });
    const issuesTitleGeneral = i18nString5(UIStrings5.issueToolbarTooltipGeneral);
    const issuesTitle = `${issuesTitleGeneral} ${issuesTitleGotoIssues}`;
    UI9.Tooltip.Tooltip.install(this.issueCounter, issuesTitle);
    this.issueCounter.data = {
      ...this.issueCounter.data,
      leadingText: i18nString5(UIStrings5.issuesWithColon, { n: manager.numberOfIssues() }),
      accessibleName: issuesTitle
    };
  }
  scheduleViewportRefresh() {
    if (this.muteViewportUpdates) {
      this.maybeDirtyWhileMuted = true;
      return;
    }
    this.scheduledRefreshPromiseForTest = this.viewportThrottler.schedule(this.invalidateViewport.bind(this));
  }
  getScheduledRefreshPromiseForTest() {
    return this.scheduledRefreshPromiseForTest;
  }
  immediatelyScrollToBottom() {
    this.viewport.setStickToBottom(true);
    this.promptElement.scrollIntoView(true);
  }
  updateFilterStatus() {
    if (this.hiddenByFilterCount === this.lastShownHiddenByFilterCount) {
      return;
    }
    this.filterStatusText.setText(i18nString5(UIStrings5.sHidden, { n: this.hiddenByFilterCount }));
    this.filterStatusText.setVisible(Boolean(this.hiddenByFilterCount));
    this.lastShownHiddenByFilterCount = this.hiddenByFilterCount;
  }
  onConsoleMessageAdded(event) {
    const message = event.data;
    this.addConsoleMessage(message);
  }
  addConsoleMessage(message) {
    const viewMessage = this.createViewMessage(message);
    consoleMessageToViewMessage.set(message, viewMessage);
    if (message.type === SDK7.ConsoleModel.FrontendMessageType.Command || message.type === SDK7.ConsoleModel.FrontendMessageType.Result) {
      const lastMessage = this.consoleMessages[this.consoleMessages.length - 1];
      const newTimestamp = lastMessage && messagesSortedBySymbol.get(lastMessage) || 0;
      messagesSortedBySymbol.set(viewMessage, newTimestamp);
    } else {
      messagesSortedBySymbol.set(viewMessage, viewMessage.consoleMessage().timestamp);
    }
    let insertAt;
    if (!this.consoleMessages.length || timeComparator(viewMessage, this.consoleMessages[this.consoleMessages.length - 1]) > 0) {
      insertAt = this.consoleMessages.length;
    } else {
      insertAt = Platform5.ArrayUtilities.upperBound(this.consoleMessages, viewMessage, timeComparator);
    }
    const insertedInMiddle = insertAt < this.consoleMessages.length;
    this.consoleMessages.splice(insertAt, 0, viewMessage);
    if (message.type === SDK7.ConsoleModel.FrontendMessageType.Command) {
      this.prompt.history().pushHistoryItem(message.messageText);
      if (this.prompt.history().length() >= MIN_HISTORY_LENGTH_FOR_DISABLING_SELF_XSS_WARNING && !this.selfXssWarningDisabledSetting.get()) {
        this.selfXssWarningDisabledSetting.set(true);
      }
    } else if (message.type !== SDK7.ConsoleModel.FrontendMessageType.Result) {
      const consoleGroupStartIndex = Platform5.ArrayUtilities.upperBound(this.consoleGroupStarts, viewMessage, timeComparator) - 1;
      if (consoleGroupStartIndex >= 0) {
        const currentGroup = this.consoleGroupStarts[consoleGroupStartIndex];
        addToGroup(viewMessage, currentGroup);
      }
      if (message.isGroupStartMessage()) {
        insertAt = Platform5.ArrayUtilities.upperBound(this.consoleGroupStarts, viewMessage, timeComparator);
        this.consoleGroupStarts.splice(insertAt, 0, viewMessage);
      }
    }
    this.filter.onMessageAdded(message);
    if (this.isSidebarOpen) {
      this.sidebar.onMessageAdded(viewMessage);
    } else {
      this.pendingSidebarMessages.push(viewMessage);
    }
    let shouldGoIntoGroup = false;
    const shouldGroupSimilar = this.groupSimilarSetting.get();
    if (message.isGroupable()) {
      const groupKey = viewMessage.groupKey();
      shouldGoIntoGroup = shouldGroupSimilar && this.groupableMessages.has(groupKey);
      let list = this.groupableMessages.get(groupKey);
      if (!list) {
        list = [];
        this.groupableMessages.set(groupKey, list);
      }
      list.push(viewMessage);
    }
    this.computeShouldMessageBeVisible(viewMessage);
    if (!shouldGoIntoGroup && !insertedInMiddle) {
      this.appendMessageToEnd(
        viewMessage,
        !shouldGroupSimilar
        /* crbug.com/1082963: prevent collapse of same messages when "Group similar" is false */
      );
      this.updateFilterStatus();
      this.#searchableView.updateSearchMatchesCount(this.regexMatchRanges.length);
    } else {
      this.needsFullUpdate = true;
    }
    this.scheduleViewportRefresh();
    this.consoleMessageAddedForTest(viewMessage);
    function addToGroup(viewMessage2, currentGroup) {
      const currentEnd = currentGroup.groupEnd();
      if (currentEnd !== null) {
        if (timeComparator(viewMessage2, currentEnd) > 0) {
          const parent = currentGroup.consoleGroup();
          if (parent === null) {
            return;
          }
          addToGroup(viewMessage2, parent);
          return;
        }
      }
      if (viewMessage2.consoleMessage().type === Runtime.ConsoleAPICalledEventType.EndGroup) {
        currentGroup.setGroupEnd(viewMessage2);
      } else {
        viewMessage2.setConsoleGroup(currentGroup);
      }
    }
    function timeComparator(viewMessage1, viewMessage2) {
      return (messagesSortedBySymbol.get(viewMessage1) || 0) - (messagesSortedBySymbol.get(viewMessage2) || 0);
    }
  }
  onConsoleMessageUpdated(event) {
    const message = event.data;
    const viewMessage = consoleMessageToViewMessage.get(message);
    if (viewMessage) {
      viewMessage.updateMessageElement();
      this.computeShouldMessageBeVisible(viewMessage);
      this.updateMessageList();
    }
  }
  consoleMessageAddedForTest(_viewMessage) {
  }
  shouldMessageBeVisible(viewMessage) {
    return !this.shouldBeHiddenCache.has(viewMessage);
  }
  computeShouldMessageBeVisible(viewMessage) {
    if (this.filter.shouldBeVisible(viewMessage) && (!this.isSidebarOpen || this.sidebar.shouldBeVisible(viewMessage))) {
      this.shouldBeHiddenCache.delete(viewMessage);
    } else {
      this.shouldBeHiddenCache.add(viewMessage);
    }
  }
  appendMessageToEnd(viewMessage, preventCollapse) {
    if (viewMessage.consoleMessage().category === Log.LogEntryCategory.Cors && !this.showCorsErrorsSetting.get()) {
      return;
    }
    const lastMessage = this.visibleViewMessages[this.visibleViewMessages.length - 1];
    if (viewMessage.consoleMessage().type === Runtime.ConsoleAPICalledEventType.EndGroup) {
      if (lastMessage) {
        const group = lastMessage.consoleGroup();
        if (group && !group.messagesHidden()) {
          lastMessage.incrementCloseGroupDecorationCount();
        }
      }
      return;
    }
    if (!this.shouldMessageBeVisible(viewMessage)) {
      this.hiddenByFilterCount++;
      return;
    }
    if (!preventCollapse && this.tryToCollapseMessages(viewMessage, this.visibleViewMessages[this.visibleViewMessages.length - 1])) {
      return;
    }
    const currentGroup = viewMessage.consoleGroup();
    showGroup(currentGroup, this.visibleViewMessages);
    if (!currentGroup?.messagesHidden()) {
      const originatingMessage = viewMessage.consoleMessage().originatingMessage();
      const adjacent = Boolean(originatingMessage && lastMessage?.consoleMessage() === originatingMessage);
      viewMessage.setAdjacentUserCommandResult(adjacent);
      this.visibleViewMessages.push(viewMessage);
      this.searchMessage(this.visibleViewMessages.length - 1);
    }
    this.messageAppendedForTests();
    function showGroup(currentGroup2, visibleViewMessages) {
      if (currentGroup2 === null) {
        return;
      }
      if (visibleViewMessages.includes(currentGroup2)) {
        return;
      }
      const parentGroup = currentGroup2.consoleGroup();
      if (parentGroup) {
        if (parentGroup.messagesHidden()) {
          return;
        }
        showGroup(parentGroup, visibleViewMessages);
      }
      visibleViewMessages.push(currentGroup2);
    }
  }
  messageAppendedForTests() {
  }
  createViewMessage(message) {
    switch (message.type) {
      case SDK7.ConsoleModel.FrontendMessageType.Command:
        return new ConsoleCommand(
          message,
          this.linkifier,
          this.requestResolver,
          this.issueResolver,
          this.onMessageResizedBound
        );
      case SDK7.ConsoleModel.FrontendMessageType.Result:
        return new ConsoleCommandResult(
          message,
          this.linkifier,
          this.requestResolver,
          this.issueResolver,
          this.onMessageResizedBound
        );
      case Runtime.ConsoleAPICalledEventType.StartGroupCollapsed:
      case Runtime.ConsoleAPICalledEventType.StartGroup:
        return new ConsoleGroupViewMessage(
          message,
          this.linkifier,
          this.requestResolver,
          this.issueResolver,
          this.updateMessageList.bind(this),
          this.onMessageResizedBound
        );
      case Runtime.ConsoleAPICalledEventType.Table:
        return new ConsoleTableMessageView(
          message,
          this.linkifier,
          this.requestResolver,
          this.issueResolver,
          this.onMessageResizedBound
        );
      default:
        return new ConsoleViewMessage(
          message,
          this.linkifier,
          this.requestResolver,
          this.issueResolver,
          this.onMessageResizedBound
        );
    }
  }
  async onMessageResized(event) {
    const treeElement = event.data instanceof UI9.TreeOutline.TreeElement ? event.data.treeOutline?.element : event.data;
    if (this.pendingBatchResize || !treeElement) {
      return;
    }
    this.pendingBatchResize = true;
    await Promise.resolve();
    this.viewport.setStickToBottom(this.isScrolledToBottom());
    if (treeElement.offsetHeight <= this.messagesElement.offsetHeight) {
      treeElement.scrollIntoViewIfNeeded();
    }
    this.pendingBatchResize = false;
  }
  getConsoleMessageHistory() {
    const currentExecutionContext = UI9.Context.Context.instance().flavor(SDK7.RuntimeModel.ExecutionContext);
    let consoleMessages = "";
    if (currentExecutionContext) {
      const consoleModel = currentExecutionContext.target().model(SDK7.ConsoleModel.ConsoleModel);
      if (consoleModel) {
        let lastMessage = "";
        for (const message of consoleModel.messages()) {
          if (message.type !== SDK7.ConsoleModel.FrontendMessageType.Command || message.messageText === lastMessage) {
            continue;
          }
          lastMessage = message.messageText;
          consoleMessages = consoleMessages + message.messageText + "\n\n";
        }
      }
    }
    return consoleMessages;
  }
  consoleCleared() {
    const hadFocus = this.viewport.element.hasFocus();
    this.cancelBuildHiddenCache();
    this.currentMatchRangeIndex = -1;
    this.consoleMessages = [];
    this.groupableMessages.clear();
    this.groupableMessageTitle.clear();
    this.sidebar.clear();
    this.pendingSidebarMessages = [];
    this.updateMessageList();
    this.hidePromptSuggestBox();
    this.viewport.setStickToBottom(true);
    this.linkifier.reset();
    this.filter.clear();
    this.requestResolver.clear();
    this.consoleGroupStarts = [];
    this.aiCodeCompletionSummaryToolbar?.clearCitations();
    if (hadFocus) {
      this.prompt.focus();
    }
    UI9.ARIAUtils.LiveAnnouncer.alert(i18nString5(UIStrings5.consoleCleared));
  }
  handleContextMenuEvent(event) {
    const contextMenu = new UI9.ContextMenu.ContextMenu(event);
    const eventTarget = event.target;
    if (eventTarget.isSelfOrDescendant(this.promptElement)) {
      void contextMenu.show();
      return;
    }
    const sourceElement = eventTarget.enclosingNodeOrSelfWithClass("console-message-wrapper");
    const consoleViewMessage = sourceElement && getMessageForElement(sourceElement);
    const consoleMessage = consoleViewMessage ? consoleViewMessage.consoleMessage() : null;
    if (consoleViewMessage) {
      UI9.Context.Context.instance().setFlavor(ConsoleViewMessage, consoleViewMessage);
    }
    if (consoleMessage && !consoleViewMessage?.element()?.matches(".has-insight") && consoleViewMessage?.shouldShowInsights()) {
      contextMenu.headerSection().appendAction(
        consoleViewMessage?.getExplainActionId(),
        void 0,
        /* optional=*/
        true
      );
    }
    if (consoleMessage?.url) {
      const menuTitle = i18nString5(
        UIStrings5.hideMessagesFromS,
        { PH1: new Common6.ParsedURL.ParsedURL(consoleMessage.url).displayName }
      );
      contextMenu.headerSection().appendItem(
        menuTitle,
        this.filter.addMessageURLFilter.bind(this.filter, consoleMessage.url),
        { jslogContext: "hide-messages-from" }
      );
    }
    contextMenu.defaultSection().appendAction("console.clear");
    contextMenu.defaultSection().appendAction("console.clear.history");
    contextMenu.saveSection().appendItem(
      i18nString5(UIStrings5.copyConsole),
      this.copyConsole.bind(this),
      { jslogContext: "copy-console" }
    );
    contextMenu.saveSection().appendItem(
      i18nString5(UIStrings5.saveAs),
      this.saveConsole.bind(this),
      { jslogContext: "save-as" }
    );
    if (this.element.hasSelection()) {
      contextMenu.clipboardSection().appendItem(
        i18nString5(UIStrings5.copyVisibleStyledSelection),
        this.viewport.copyWithStyles.bind(this.viewport),
        { jslogContext: "copy-visible-styled-selection" }
      );
    }
    if (consoleMessage) {
      const request = Logs3.NetworkLog.NetworkLog.requestForConsoleMessage(consoleMessage);
      if (request && SDK7.NetworkManager.NetworkManager.canResendRequest(request, true)) {
        contextMenu.debugSection().appendItem(
          i18nString5(UIStrings5.resend),
          SDK7.NetworkManager.NetworkManager.replayRequest.bind(null, request),
          { jslogContext: "resend" }
        );
      }
    }
    void contextMenu.show();
  }
  async saveConsole() {
    const url = SDK7.TargetManager.TargetManager.instance().scopeTarget().inspectedURL();
    const parsedURL = Common6.ParsedURL.ParsedURL.fromString(url);
    const filename = Platform5.StringUtilities.sprintf("%s-%d.log", parsedURL ? parsedURL.host : "console", Date.now());
    const stream = new Bindings4.FileUtils.FileOutputStream(Workspace2.FileManager.FileManager.instance());
    const progressIndicator = document.createElement("devtools-progress");
    progressIndicator.title = i18nString5(UIStrings5.writingFile);
    progressIndicator.totalWork = this.itemCount();
    const chunkSize = 350;
    if (!await stream.open(filename)) {
      return;
    }
    this.progressToolbarItem.element.appendChild(progressIndicator);
    let messageIndex = 0;
    while (messageIndex < this.itemCount() && !progressIndicator.canceled) {
      const messageContents = [];
      let i;
      for (i = 0; i < chunkSize && i + messageIndex < this.itemCount(); ++i) {
        const message = this.itemElement(messageIndex + i);
        messageContents.push(message.toExportString());
      }
      messageIndex += i;
      await stream.write(messageContents.join("\n") + "\n");
      progressIndicator.worked = messageIndex;
    }
    void stream.close();
    progressIndicator.done = true;
  }
  async copyConsole() {
    const messageContents = [];
    for (let i = 0; i < this.itemCount(); i++) {
      const message = this.itemElement(i);
      messageContents.push(message.toExportString());
    }
    Host4.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(messageContents.join("\n") + "\n");
  }
  tryToCollapseMessages(viewMessage, lastMessage) {
    const timestampsShown = this.timestampsSetting.get();
    if (!timestampsShown && lastMessage && !viewMessage.consoleMessage().isGroupMessage() && viewMessage.consoleMessage().type !== SDK7.ConsoleModel.FrontendMessageType.Command && viewMessage.consoleMessage().type !== SDK7.ConsoleModel.FrontendMessageType.Result && viewMessage.consoleMessage().isEqual(lastMessage.consoleMessage())) {
      lastMessage.incrementRepeatCount();
      if (viewMessage.isLastInSimilarGroup()) {
        lastMessage.setInSimilarGroup(true, true);
      }
      return true;
    }
    return false;
  }
  buildHiddenCache(startIndex, viewMessages) {
    const startTime = Date.now();
    let i;
    for (i = startIndex; i < viewMessages.length; ++i) {
      this.computeShouldMessageBeVisible(viewMessages[i]);
      if (i % 10 === 0 && Date.now() - startTime > 12) {
        break;
      }
    }
    if (i === viewMessages.length) {
      this.updateMessageList();
      return;
    }
    this.buildHiddenCacheTimeout = this.element.window().requestAnimationFrame(this.buildHiddenCache.bind(this, i + 1, viewMessages));
  }
  cancelBuildHiddenCache() {
    this.shouldBeHiddenCache.clear();
    if (this.buildHiddenCacheTimeout) {
      this.element.window().cancelAnimationFrame(this.buildHiddenCacheTimeout);
      delete this.buildHiddenCacheTimeout;
    }
  }
  updateMessageList() {
    this.regexMatchRanges = [];
    this.hiddenByFilterCount = 0;
    for (const visibleViewMessage of this.visibleViewMessages) {
      visibleViewMessage.resetCloseGroupDecorationCount();
      visibleViewMessage.resetIncrementRepeatCount();
    }
    this.visibleViewMessages = [];
    if (this.groupSimilarSetting.get()) {
      this.addGroupableMessagesToEnd();
    } else {
      for (const consoleMessage of this.consoleMessages) {
        consoleMessage.setInSimilarGroup(false);
        if (consoleMessage.consoleMessage().isGroupable()) {
          const group = consoleMessage.consoleGroup();
          if (group && !this.consoleGroupStarts.includes(group)) {
            consoleMessage.clearConsoleGroup();
          }
        }
        this.appendMessageToEnd(
          consoleMessage,
          true
          /* crbug.com/1082963: prevent collapse of same messages when "Group similar" is false */
        );
      }
    }
    this.updateFilterStatus();
    this.#searchableView.updateSearchMatchesCount(this.regexMatchRanges.length);
    this.highlightMatch(this.currentMatchRangeIndex, false);
    this.#updateCollapseAllButton();
    this.viewport.invalidate();
    this.messagesCountElement.setAttribute(
      "aria-label",
      i18nString5(UIStrings5.filteredMessagesInConsole, { PH1: this.visibleViewMessages.length })
    );
  }
  addGroupableMessagesToEnd() {
    const alreadyAdded = /* @__PURE__ */ new Set();
    const processedGroupKeys = /* @__PURE__ */ new Set();
    for (const viewMessage of this.consoleMessages) {
      const message = viewMessage.consoleMessage();
      if (alreadyAdded.has(message)) {
        continue;
      }
      if (!message.isGroupable()) {
        this.appendMessageToEnd(viewMessage);
        alreadyAdded.add(message);
        continue;
      }
      const key = viewMessage.groupKey();
      const viewMessagesInGroup = this.groupableMessages.get(key);
      if (!viewMessagesInGroup || viewMessagesInGroup.length < 5) {
        viewMessage.setInSimilarGroup(false);
        this.appendMessageToEnd(viewMessage);
        alreadyAdded.add(message);
        continue;
      }
      if (processedGroupKeys.has(key)) {
        continue;
      }
      if (!viewMessagesInGroup.find((x) => this.shouldMessageBeVisible(x))) {
        for (const viewMessageInGroup of viewMessagesInGroup) {
          alreadyAdded.add(viewMessageInGroup.consoleMessage());
        }
        processedGroupKeys.add(key);
        continue;
      }
      let startGroupViewMessage = this.groupableMessageTitle.get(key);
      if (!startGroupViewMessage) {
        const startGroupMessage = new SDK7.ConsoleModel.ConsoleMessage(
          null,
          message.source,
          message.level,
          viewMessage.groupTitle(),
          { type: Runtime.ConsoleAPICalledEventType.StartGroupCollapsed }
        );
        startGroupViewMessage = this.createViewMessage(startGroupMessage);
        this.groupableMessageTitle.set(key, startGroupViewMessage);
      }
      startGroupViewMessage.setRepeatCount(viewMessagesInGroup.length);
      this.appendMessageToEnd(startGroupViewMessage);
      for (const viewMessageInGroup of viewMessagesInGroup) {
        viewMessageInGroup.setInSimilarGroup(
          true,
          viewMessagesInGroup[viewMessagesInGroup.length - 1] === viewMessageInGroup
        );
        viewMessageInGroup.setConsoleGroup(startGroupViewMessage);
        this.appendMessageToEnd(viewMessageInGroup, true);
        alreadyAdded.add(viewMessageInGroup.consoleMessage());
      }
      const endGroupMessage = new SDK7.ConsoleModel.ConsoleMessage(
        null,
        message.source,
        message.level,
        message.messageText,
        { type: Runtime.ConsoleAPICalledEventType.EndGroup }
      );
      this.appendMessageToEnd(this.createViewMessage(endGroupMessage));
    }
  }
  messagesClicked(event) {
    const target = event.target;
    if (!this.messagesElement.hasSelection()) {
      const clickedOutsideMessageList = target === this.messagesElement || this.prompt.belowEditorElement().isSelfOrAncestor(target);
      if (clickedOutsideMessageList) {
        this.prompt.moveCaretToEndOfPrompt();
        this.focusPrompt();
      }
    }
  }
  messagesKeyDown(event) {
    const keyEvent = event;
    const hasActionModifier = keyEvent.ctrlKey || keyEvent.altKey || keyEvent.metaKey;
    if (hasActionModifier || keyEvent.key.length !== 1 || UI9.UIUtils.isEditing() || this.messagesElement.hasSelection()) {
      return;
    }
    this.prompt.moveCaretToEndOfPrompt();
    this.focusPrompt();
  }
  messagesPasted(event) {
    if (!Root3.Runtime.Runtime.queryParam("isChromeForTesting") && !Root3.Runtime.Runtime.queryParam("disableSelfXssWarnings") && !this.selfXssWarningDisabledSetting.get()) {
      event.preventDefault();
      this.prompt.showSelfXssWarning();
    }
    if (UI9.UIUtils.isEditing()) {
      return;
    }
    this.prompt.focus();
  }
  registerShortcuts() {
    this.shortcuts.set(
      UI9.KeyboardShortcut.KeyboardShortcut.makeKey("u", UI9.KeyboardShortcut.Modifiers.Ctrl.value),
      this.clearPromptBackwards.bind(this)
    );
  }
  clearPromptBackwards(e) {
    this.prompt.clear();
    void VisualLogging5.logKeyDown(e.currentTarget, e, "clear-prompt");
  }
  promptKeyDown(event) {
    const keyboardEvent = event;
    if (keyboardEvent.key === "PageUp") {
      this.updateStickToBottomOnWheel();
      return;
    }
    const shortcut = UI9.KeyboardShortcut.KeyboardShortcut.makeKeyFromEvent(keyboardEvent);
    const handler = this.shortcuts.get(shortcut);
    if (handler) {
      handler(keyboardEvent);
      keyboardEvent.preventDefault();
    }
  }
  printResult(result, originatingConsoleMessage, exceptionDetails) {
    if (!result) {
      return;
    }
    const level = Boolean(exceptionDetails) ? Log.LogEntryLevel.Error : Log.LogEntryLevel.Info;
    let message;
    if (!exceptionDetails) {
      message = new SDK7.ConsoleModel.ConsoleMessage(
        result.runtimeModel(),
        Log.LogEntrySource.Javascript,
        level,
        "",
        { type: SDK7.ConsoleModel.FrontendMessageType.Result, parameters: [result] }
      );
    } else {
      message = SDK7.ConsoleModel.ConsoleMessage.fromException(
        result.runtimeModel(),
        exceptionDetails,
        SDK7.ConsoleModel.FrontendMessageType.Result,
        void 0,
        void 0
      );
    }
    message.setOriginatingMessage(originatingConsoleMessage);
    result.runtimeModel().target().model(SDK7.ConsoleModel.ConsoleModel)?.addMessage(message);
  }
  commandEvaluated(event) {
    const { data } = event;
    this.printResult(data.result, data.commandMessage, data.exceptionDetails);
  }
  elementsToRestoreScrollPositionsFor() {
    return [this.messagesElement];
  }
  onSearchCanceled() {
    this.cleanupAfterSearch();
    for (const message of this.visibleViewMessages) {
      message.setSearchRegex(null);
    }
    this.currentMatchRangeIndex = -1;
    this.regexMatchRanges = [];
    this.searchRegex = null;
    this.viewport.refresh();
  }
  performSearch(searchConfig, shouldJump, jumpBackwards) {
    this.onSearchCanceled();
    this.#searchableView.updateSearchMatchesCount(0);
    this.searchRegex = searchConfig.toSearchRegex(true).regex;
    this.regexMatchRanges = [];
    this.currentMatchRangeIndex = -1;
    if (shouldJump) {
      this.searchShouldJumpBackwards = Boolean(jumpBackwards);
    }
    this.searchProgressIndicator = document.createElement("devtools-progress");
    this.searchProgressIndicator.title = i18nString5(UIStrings5.searching);
    this.searchProgressIndicator.totalWork = this.visibleViewMessages.length;
    this.progressToolbarItem.element.appendChild(this.searchProgressIndicator);
    this.#search(0);
  }
  cleanupAfterSearch() {
    delete this.searchShouldJumpBackwards;
    if (this.#searchTimeoutId) {
      clearTimeout(this.#searchTimeoutId);
      this.#searchTimeoutId = void 0;
    }
    if (this.searchProgressIndicator) {
      this.searchProgressIndicator.done = true;
      delete this.searchProgressIndicator;
    }
  }
  searchFinishedForTests() {
  }
  #search(index) {
    this.#searchTimeoutId = void 0;
    if (this.searchProgressIndicator?.canceled) {
      this.cleanupAfterSearch();
      return;
    }
    const startTime = Date.now();
    for (; index < this.visibleViewMessages.length && Date.now() - startTime < 100; ++index) {
      this.searchMessage(index);
    }
    this.#searchableView.updateSearchMatchesCount(this.regexMatchRanges.length);
    if (typeof this.searchShouldJumpBackwards !== "undefined" && this.regexMatchRanges.length) {
      this.highlightMatch(this.searchShouldJumpBackwards ? -1 : 0);
      delete this.searchShouldJumpBackwards;
    }
    if (index === this.visibleViewMessages.length) {
      this.cleanupAfterSearch();
      window.setTimeout(this.searchFinishedForTests.bind(this), 0);
      return;
    }
    this.#searchTimeoutId = window.setTimeout(this.#search.bind(this, index), 100);
    if (this.searchProgressIndicator) {
      this.searchProgressIndicator.worked = index;
    }
  }
  searchMessage(index) {
    const message = this.visibleViewMessages[index];
    message.setSearchRegex(this.searchRegex);
    for (let i = 0; i < message.searchCount(); ++i) {
      this.regexMatchRanges.push({ messageIndex: index, matchIndex: i });
    }
  }
  jumpToNextSearchResult() {
    this.highlightMatch(this.currentMatchRangeIndex + 1);
  }
  jumpToPreviousSearchResult() {
    this.highlightMatch(this.currentMatchRangeIndex - 1);
  }
  supportsCaseSensitiveSearch() {
    return true;
  }
  supportsWholeWordSearch() {
    return true;
  }
  supportsRegexSearch() {
    return true;
  }
  highlightMatch(index, scrollIntoView = true) {
    if (!this.regexMatchRanges.length) {
      return;
    }
    let matchRange;
    if (this.currentMatchRangeIndex >= 0) {
      matchRange = this.regexMatchRanges[this.currentMatchRangeIndex];
      const message2 = this.visibleViewMessages[matchRange.messageIndex];
      message2.searchHighlightNode(matchRange.matchIndex).classList.remove(Highlighting2.highlightedCurrentSearchResultClassName);
    }
    index = Platform5.NumberUtilities.mod(index, this.regexMatchRanges.length);
    this.currentMatchRangeIndex = index;
    this.#searchableView.updateCurrentMatchIndex(index);
    matchRange = this.regexMatchRanges[index];
    const message = this.visibleViewMessages[matchRange.messageIndex];
    const highlightNode = message.searchHighlightNode(matchRange.matchIndex);
    highlightNode.classList.add(Highlighting2.highlightedCurrentSearchResultClassName);
    if (scrollIntoView) {
      this.viewport.scrollItemIntoView(matchRange.messageIndex);
      highlightNode.scrollIntoViewIfNeeded();
    }
  }
  updateStickToBottomOnPointerDown(isRightClick) {
    this.muteViewportUpdates = !isRightClick;
    this.viewport.setStickToBottom(false);
    if (this.waitForScrollTimeout) {
      clearTimeout(this.waitForScrollTimeout);
      delete this.waitForScrollTimeout;
    }
  }
  updateStickToBottomOnPointerUp() {
    if (!this.muteViewportUpdates) {
      return;
    }
    this.waitForScrollTimeout = window.setTimeout(updateViewportState.bind(this), 200);
    function updateViewportState() {
      this.muteViewportUpdates = false;
      if (this.isShowing()) {
        this.viewport.setStickToBottom(this.isScrolledToBottom());
      }
      if (this.maybeDirtyWhileMuted) {
        this.scheduleViewportRefresh();
        delete this.maybeDirtyWhileMuted;
      }
      delete this.waitForScrollTimeout;
      this.updateViewportStickinessForTest();
    }
  }
  updateViewportStickinessForTest() {
  }
  updateStickToBottomOnWheel() {
    this.updateStickToBottomOnPointerDown();
    this.updateStickToBottomOnPointerUp();
  }
  promptTextChanged() {
    const oldStickToBottom = this.viewport.stickToBottom();
    const willStickToBottom = this.isScrolledToBottom();
    this.viewport.setStickToBottom(willStickToBottom);
    if (willStickToBottom && !oldStickToBottom) {
      this.scheduleViewportRefresh();
    }
    this.promptTextChangedForTest();
  }
  promptTextChangedForTest() {
  }
  isScrolledToBottom() {
    const distanceToPromptEditorBottom = this.messagesElement.scrollHeight - this.messagesElement.scrollTop - this.messagesElement.clientHeight - this.prompt.belowEditorElement().offsetHeight;
    return distanceToPromptEditorBottom <= 2;
  }
  setupAiCodeCompletion() {
    this.createAiCodeCompletionSummaryToolbar();
  }
  cleanupAiCodeCompletion() {
    this.aiCodeCompletionSummaryToolbarContainer?.remove();
    this.aiCodeCompletionSummaryToolbarContainer = void 0;
    this.aiCodeCompletionSummaryToolbar = void 0;
  }
};
globalThis.Console = globalThis.Console || {};
globalThis.Console.ConsoleView = ConsoleView;
var ConsoleViewFilter = class _ConsoleViewFilter {
  filterChanged;
  messageLevelFiltersSetting;
  networkMessagesSetting;
  filterByExecutionContextSetting;
  suggestionBuilder;
  textFilterUI;
  textFilterSetting;
  filterParser;
  currentFilter;
  levelLabels;
  levelMenuButton;
  levelMenuButtonInfo;
  constructor(filterChangedCallback) {
    this.filterChanged = filterChangedCallback;
    this.messageLevelFiltersSetting = _ConsoleViewFilter.levelFilterSetting();
    this.networkMessagesSetting = Common6.Settings.Settings.instance().resolve(Settings7.ConsoleSettings.networkMessagesSettingDescriptor);
    this.filterByExecutionContextSetting = Common6.Settings.Settings.instance().resolve(
      Settings7.ConsoleSettings.selectedContextFilterEnabledSettingDescriptor
    );
    this.messageLevelFiltersSetting.addChangeListener(this.onFilterChanged.bind(this));
    this.networkMessagesSetting.addChangeListener(this.onFilterChanged.bind(this));
    this.filterByExecutionContextSetting.addChangeListener(this.onFilterChanged.bind(this));
    UI9.Context.Context.instance().addFlavorChangeListener(
      SDK7.RuntimeModel.ExecutionContext,
      this.onFilterChanged,
      this
    );
    const filterKeys = Object.values(FilterType);
    this.suggestionBuilder = new UI9.FilterSuggestionBuilder.FilterSuggestionBuilder(filterKeys);
    this.textFilterUI = new UI9.Toolbar.ToolbarFilter(
      void 0,
      1,
      1,
      i18nString5(UIStrings5.egEventdCdnUrlacom),
      this.suggestionBuilder.completions.bind(this.suggestionBuilder),
      true
    );
    this.textFilterSetting = Common6.Settings.Settings.instance().createSetting("console.text-filter", "");
    if (this.textFilterSetting.get()) {
      this.textFilterUI.setValue(this.textFilterSetting.get());
    }
    this.textFilterUI.addEventListener(UI9.Toolbar.ToolbarInput.Event.TEXT_CHANGED, () => {
      this.textFilterSetting.set(this.textFilterUI.value());
      this.onFilterChanged();
    });
    this.filterParser = new TextUtils6.TextUtils.FilterParser(filterKeys);
    this.currentFilter = new ConsoleFilter("", [], null, this.messageLevelFiltersSetting.get());
    this.updateCurrentFilter();
    this.levelLabels = /* @__PURE__ */ new Map([
      [Log.LogEntryLevel.Verbose, i18nString5(UIStrings5.verbose)],
      [Log.LogEntryLevel.Info, i18nString5(UIStrings5.info)],
      [Log.LogEntryLevel.Warning, i18nString5(UIStrings5.warnings)],
      [Log.LogEntryLevel.Error, i18nString5(UIStrings5.errors)]
    ]);
    this.levelMenuButton = new UI9.Toolbar.ToolbarMenuButton(this.appendLevelMenuItems.bind(this), void 0, void 0, "log-level");
    const levelMenuButtonInfoIcon = createIcon2("info", "console-sidebar-levels-info");
    levelMenuButtonInfoIcon.title = i18nString5(UIStrings5.overriddenByFilterSidebar);
    this.levelMenuButtonInfo = new UI9.Toolbar.ToolbarItem(levelMenuButtonInfoIcon);
    this.levelMenuButtonInfo.setVisible(false);
    this.updateLevelMenuButtonText();
    this.messageLevelFiltersSetting.addChangeListener(this.updateLevelMenuButtonText.bind(this));
  }
  onMessageAdded(message) {
    if (message.type === SDK7.ConsoleModel.FrontendMessageType.Command || message.type === SDK7.ConsoleModel.FrontendMessageType.Result || message.isGroupMessage()) {
      return;
    }
    if (message.context) {
      this.suggestionBuilder.addItem("context" /* Context */, message.context);
    }
    if (message.source) {
      this.suggestionBuilder.addItem("source" /* Source */, message.source);
    }
    if (message.url) {
      this.suggestionBuilder.addItem("url" /* Url */, message.url);
    }
  }
  setLevelMenuOverridden(overridden) {
    this.levelMenuButton.setEnabled(!overridden);
    this.levelMenuButtonInfo.setVisible(overridden);
    if (overridden) {
      this.levelMenuButton.setText(i18nString5(UIStrings5.customLevels));
    } else {
      this.updateLevelMenuButtonText();
    }
  }
  static levelFilterSetting() {
    return Common6.Settings.Settings.instance().createSetting(
      "message-level-filters",
      ConsoleFilter.defaultLevelsFilterValue()
    );
  }
  updateCurrentFilter() {
    const parsedFilters = this.filterParser.parse(this.textFilterUI.value());
    for (const { key } of parsedFilters) {
      switch (key) {
        case "context" /* Context */:
          Host4.userMetrics.actionTaken(Host4.UserMetrics.Action.ConsoleFilterByContext);
          break;
        case "source" /* Source */:
          Host4.userMetrics.actionTaken(Host4.UserMetrics.Action.ConsoleFilterBySource);
          break;
        case "url" /* Url */:
          Host4.userMetrics.actionTaken(Host4.UserMetrics.Action.ConsoleFilterByUrl);
          break;
      }
    }
    if (!this.networkMessagesSetting.get()) {
      parsedFilters.push(
        { key: "source" /* Source */, text: Log.LogEntrySource.Network, negative: true, regex: void 0 }
      );
    }
    this.currentFilter.executionContext = this.filterByExecutionContextSetting.get() ? UI9.Context.Context.instance().flavor(SDK7.RuntimeModel.ExecutionContext) : null;
    this.currentFilter.parsedFilters = parsedFilters;
    this.currentFilter.levelsMask = this.messageLevelFiltersSetting.get();
  }
  onFilterChanged() {
    this.updateCurrentFilter();
    this.filterChanged();
  }
  updateLevelMenuButtonText() {
    let isAll = true;
    let isDefault = true;
    const allValue = ConsoleFilter.allLevelsFilterValue();
    const defaultValue = ConsoleFilter.defaultLevelsFilterValue();
    let text = null;
    const levels = this.messageLevelFiltersSetting.get();
    const allLevels = {
      Verbose: Log.LogEntryLevel.Verbose,
      Info: Log.LogEntryLevel.Info,
      Warning: Log.LogEntryLevel.Warning,
      Error: Log.LogEntryLevel.Error
    };
    for (const name of Object.values(allLevels)) {
      isAll = isAll && levels[name] === allValue[name];
      isDefault = isDefault && levels[name] === defaultValue[name];
      if (levels[name]) {
        text = text ? i18nString5(UIStrings5.customLevels) : i18nString5(UIStrings5.sOnly, { PH1: String(this.levelLabels.get(name)) });
      }
    }
    if (isAll) {
      text = i18nString5(UIStrings5.allLevels);
    } else if (isDefault) {
      text = i18nString5(UIStrings5.defaultLevels);
    } else {
      text = text || i18nString5(UIStrings5.hideAll);
    }
    this.levelMenuButton.element.classList.toggle("warning", !isAll && !isDefault);
    this.levelMenuButton.setText(text);
    this.levelMenuButton.setTitle(i18nString5(UIStrings5.logLevelS, { PH1: text }));
  }
  appendLevelMenuItems(contextMenu) {
    const setting = this.messageLevelFiltersSetting;
    const levels = setting.get();
    contextMenu.headerSection().appendItem(
      i18nString5(UIStrings5.default),
      () => setting.set(ConsoleFilter.defaultLevelsFilterValue()),
      { jslogContext: "default" }
    );
    for (const [level, levelText] of this.levelLabels.entries()) {
      contextMenu.defaultSection().appendCheckboxItem(
        levelText,
        toggleShowLevel.bind(null, level),
        { checked: levels[level], jslogContext: level }
      );
    }
    function toggleShowLevel(level) {
      levels[level] = !levels[level];
      setting.set(levels);
    }
  }
  addMessageURLFilter(url) {
    if (!url) {
      return;
    }
    const suffix = this.textFilterUI.value() ? ` ${this.textFilterUI.value()}` : "";
    this.textFilterUI.setValue(`-url:${url}${suffix}`);
    this.textFilterSetting.set(this.textFilterUI.value());
    this.onFilterChanged();
  }
  shouldBeVisible(viewMessage) {
    return this.currentFilter.shouldBeVisible(viewMessage);
  }
  clear() {
    this.suggestionBuilder.clear();
  }
  reset() {
    this.messageLevelFiltersSetting.set(ConsoleFilter.defaultLevelsFilterValue());
    this.filterByExecutionContextSetting.set(false);
    this.networkMessagesSetting.set(true);
    this.textFilterUI.setValue("");
    this.onFilterChanged();
  }
};
var ActionDelegate = class {
  handleAction(_context, actionId) {
    switch (actionId) {
      case "console.toggle": {
        const inspectorView = UI9.InspectorView.InspectorView.instance();
        const consoleView = ConsoleView.instance();
        if (inspectorView.drawerVisible() && !inspectorView.isDrawerMinimized() && consoleView.isShowing() && consoleView.hasFocus()) {
          inspectorView.minimizeDrawer();
          return true;
        }
        if (inspectorView.drawerVisible() && inspectorView.isDrawerMinimized()) {
          inspectorView.setDrawerMinimized(false);
        }
        Host4.InspectorFrontendHost.InspectorFrontendHostInstance.bringToFront();
        Common6.Console.Console.instance().show();
        consoleView.focusPrompt();
        return true;
      }
      case "console.clear":
        ConsoleView.instance().clearConsole();
        return true;
      case "console.clear.history":
        ConsoleView.instance().clearHistory();
        return true;
      case "console.create-pin":
        ConsoleView.instance().pinPane.addPin(
          "",
          true
          /* userGesture */
        );
        return true;
    }
    return false;
  }
};
var messagesSortedBySymbol = /* @__PURE__ */ new WeakMap();
var consoleMessageToViewMessage = /* @__PURE__ */ new WeakMap();

// ../../front_end/panels/console/ConsolePanel.ts
var consolePanelInstance;
var ConsolePanel = class _ConsolePanel extends UI10.Panel.Panel {
  view;
  #drawerWasMinimized = false;
  constructor() {
    super("console");
    this.view = ConsoleView.instance();
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!consolePanelInstance || forceNew) {
      consolePanelInstance = new _ConsolePanel();
    }
    return consolePanelInstance;
  }
  static updateContextFlavor() {
    const consoleView = _ConsolePanel.instance().view;
    UI10.Context.Context.instance().setFlavor(ConsoleView, consoleView.isShowing() ? consoleView : null);
  }
  wasShown() {
    super.wasShown();
    const inspectorView = UI10.InspectorView.InspectorView.instance();
    this.#drawerWasMinimized = inspectorView.isDrawerMinimized();
    const wrapper = wrapperViewInstance;
    if (wrapper?.isShowing()) {
      inspectorView.setDrawerMinimized(true);
    }
    this.view.show(this.element);
    _ConsolePanel.updateContextFlavor();
  }
  willHide() {
    super.willHide();
    const inspectorView = UI10.InspectorView.InspectorView.instance();
    inspectorView.setDrawerMinimized(false);
    if (wrapperViewInstance) {
      wrapperViewInstance.showViewInWrapper();
    }
    if (this.#drawerWasMinimized) {
      inspectorView.setDrawerMinimized(true);
    }
    _ConsolePanel.updateContextFlavor();
  }
  searchableView() {
    return ConsoleView.instance().searchableView();
  }
};
var wrapperViewInstance = null;
var WrapperView = class _WrapperView extends UI10.Widget.VBox {
  view;
  constructor() {
    super({ jslog: `${VisualLogging6.panel("console").track({ resize: true })}` });
    this.view = ConsoleView.instance();
  }
  static instance() {
    if (!wrapperViewInstance) {
      wrapperViewInstance = new _WrapperView();
    }
    return wrapperViewInstance;
  }
  wasShown() {
    super.wasShown();
    if (!ConsolePanel.instance().isShowing()) {
      this.showViewInWrapper();
    } else {
      UI10.InspectorView.InspectorView.instance().setDrawerMinimized(true);
    }
    ConsolePanel.updateContextFlavor();
  }
  willHide() {
    super.willHide();
    ConsolePanel.updateContextFlavor();
  }
  showViewInWrapper() {
    this.view.show(this.element);
  }
  insertIntoPrompt(text) {
    this.view.insertIntoPrompt(text);
  }
};
var ConsoleRevealer = class {
  async reveal(_object) {
    const consoleView = ConsoleView.instance();
    if (consoleView.isShowing()) {
      consoleView.focus();
      return;
    }
    await UI10.ViewManager.ViewManager.instance().showView("console-view");
  }
};

// gen/front_end/panels/console/consolePrompt.css.js
var consolePrompt_css_default = `/*
 * Copyright 2018 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

#console-prompt .CodeMirror {
  padding: 3px 0 1px;
}

#console-prompt .CodeMirror-line {
  padding-top: 0;
}

#console-prompt .CodeMirror-lines {
  padding-top: 0;
}

#console-prompt .console-prompt-icon {
  position: absolute;
  left: -9px;
  top: var(--sys-size-3);
  user-select: none;
}

.console-eager-preview {
  padding-bottom: var(--sys-size-2);
  margin-left: var(--sys-size-3);
  opacity: 60%;
  position: relative;
}

.console-eager-inner-preview {
  text-overflow: ellipsis;
  overflow: hidden;
  margin-left: var(--sys-size-3);
  height: 100%;
  white-space: nowrap;
}

.preview-result-icon {
  position: absolute;
  left: -13px;
  top: calc(-1 * var(--sys-size-1));
}

.console-eager-inner-preview:empty,
.console-eager-inner-preview:empty + .preview-result-icon {
  opacity: 0%;
}

.console-prompt-icon.console-prompt-incomplete {
  opacity: 65%;
}

/*# sourceURL=${import.meta.resolve("./consolePrompt.css")} */`;

// ../../front_end/panels/console/ConsolePrompt.ts
var { Direction } = TextEditor2.TextEditorHistory;
var UIStrings6 = {
  /**
   * @description Text in Console prompt of the Console panel.
   */
  consolePrompt: "Console prompt",
  /**
   * @description Warning shown to users when pasting text into the DevTools Console. IMPORTANT: keep double quotes around PH1 and do not use single quotes.
   * @example {allow pasting} PH1
   */
  selfXssWarning: 'Warning: Don\u2019t paste code into the DevTools Console that you don\u2019t understand or haven\u2019t reviewed yourself. This could allow attackers to steal your identity or take control of your computer. Type "{PH1}" below and press Enter to allow pasting.',
  /**
   * @description Text a user needs to type in order to confirm that they are aware of the danger of pasting code into the DevTools Console.
   */
  allowPasting: "allow pasting"
};
var str_6 = i18n13.i18n.registerUIStrings("panels/console/ConsolePrompt.ts", UIStrings6);
var i18nString6 = i18n13.i18n.getLocalizedString.bind(void 0, str_6);
var ConsolePromptBase = Common7.ObjectWrapper.eventMixin(
  UI11.Widget.Widget
);
var ConsolePrompt = class extends ConsolePromptBase {
  addCompletionsFromHistory;
  #history;
  initialText;
  editor;
  eagerPreviewElement;
  textChangeThrottler;
  requestPreviewBound;
  requestPreviewCurrent = 0;
  innerPreviewElement;
  promptIcon;
  iconThrottler;
  eagerEvalSetting;
  previewRequestForTest;
  highlightingNode;
  // The CodeMirror state field that controls whether the argument hints are showing.
  // If they are, the escape key will clear them. However, if they aren't, then the
  // console drawer should be hidden as a whole.
  #argumentHintsState;
  #editorHistory;
  #selfXssWarningShown = false;
  #javaScriptCompletionCompartment = new CodeMirror2.Compartment();
  aiCodeCompletionConfig;
  aiCodeCompletionProvider;
  #getJavaScriptCompletionExtensions() {
    if (this.#selfXssWarningShown) {
      return [];
    }
    if (Root4.Runtime.Runtime.queryParam("noJavaScriptCompletion") !== "true") {
      return [
        CodeMirror2.javascript.javascript(),
        TextEditor2.JavaScript.completion()
      ];
    }
    return [CodeMirror2.javascript.javascriptLanguage];
  }
  #updateJavaScriptCompletionCompartment() {
    const extensions = this.#getJavaScriptCompletionExtensions();
    const effects = this.#javaScriptCompletionCompartment.reconfigure(extensions);
    this.editor.dispatch({ effects });
  }
  constructor(aiCodeCompletionConfig) {
    super({
      jslog: `${VisualLogging7.textField("console-prompt").track({
        change: true,
        keydown: "Enter|ArrowUp|ArrowDown|PageUp"
      })}`
    });
    this.registerRequiredCSS(consolePrompt_css_default);
    this.addCompletionsFromHistory = true;
    this.#history = new TextEditor2.AutocompleteHistory.AutocompleteHistory(
      Common7.Settings.Settings.instance().createLocalSetting("console-history", [])
    );
    this.initialText = "";
    this.eagerPreviewElement = document.createElement("div");
    this.eagerPreviewElement.classList.add("console-eager-preview");
    this.textChangeThrottler = new Common7.Throttler.Throttler(150);
    this.requestPreviewBound = this.requestPreview.bind(this);
    this.innerPreviewElement = this.eagerPreviewElement.createChild("div", "console-eager-inner-preview");
    const previewIcon = new Icon2();
    previewIcon.name = "chevron-left-dot";
    previewIcon.classList.add("preview-result-icon", "medium");
    this.eagerPreviewElement.appendChild(previewIcon);
    const editorContainerElement = this.element.createChild("div", "console-prompt-editor-container");
    this.element.appendChild(this.eagerPreviewElement);
    this.promptIcon = new Icon2();
    this.promptIcon.name = "chevron-right";
    this.promptIcon.style.color = "var(--icon-action)";
    this.promptIcon.classList.add("console-prompt-icon", "medium");
    this.element.appendChild(this.promptIcon);
    this.iconThrottler = new Common7.Throttler.Throttler(0);
    this.eagerEvalSetting = Common7.Settings.Settings.instance().resolve(Settings9.ConsoleSettings.consoleEagerEvalSettingDescriptor);
    this.eagerEvalSetting.addChangeListener(this.eagerSettingChanged.bind(this));
    this.eagerPreviewElement.classList.toggle("hidden", !this.eagerEvalSetting.get());
    this.element.tabIndex = 0;
    this.previewRequestForTest = null;
    this.highlightingNode = false;
    const argumentHints = TextEditor2.JavaScript.argumentHints();
    this.#argumentHintsState = argumentHints[0];
    const autocompleteOnEnter = TextEditor2.Config.DynamicSetting.bool(
      Settings9.ConsoleSettings.consoleAutocompleteOnEnterSettingDescriptor,
      [],
      TextEditor2.Config.conservativeCompletion
    );
    const extensions = [
      CodeMirror2.keymap.of(this.editorKeymap()),
      CodeMirror2.EditorView.updateListener.of((update) => this.editorUpdate(update)),
      argumentHints,
      autocompleteOnEnter.instance(),
      TextEditor2.Config.showCompletionHint,
      TextEditor2.Config.baseConfiguration(this.initialText),
      TextEditor2.Config.autocompletion.instance(),
      CodeMirror2.javascript.javascriptLanguage.data.of({
        autocomplete: (context) => this.addCompletionsFromHistory ? this.#editorHistory.historyCompletions(context) : null
      }),
      CodeMirror2.EditorView.contentAttributes.of({ "aria-label": i18nString6(UIStrings6.consolePrompt) }),
      CodeMirror2.EditorView.lineWrapping,
      CodeMirror2.autocompletion({ aboveCursor: true }),
      this.#javaScriptCompletionCompartment.of(this.#getJavaScriptCompletionExtensions())
    ];
    this.aiCodeCompletionConfig = aiCodeCompletionConfig;
    if (this.aiCodeCompletionConfig) {
      this.aiCodeCompletionProvider = TextEditor2.AiCodeCompletionProvider.AiCodeCompletionProvider.createInstance(this.aiCodeCompletionConfig);
      extensions.push(...this.aiCodeCompletionProvider.extension());
    }
    const doc = this.initialText;
    const editorState = CodeMirror2.EditorState.create({ doc, extensions });
    this.editor = new TextEditor2.TextEditor.TextEditor(editorState);
    if (this.aiCodeCompletionProvider) {
      this.aiCodeCompletionProvider.editorInitialized(this.editor);
      this.editor.editor.dispatch({
        effects: TextEditor2.AiCodeCompletionProvider.setAiCodeCompletionTeaserMode.of(
          TextEditor2.AiCodeCompletionProvider.AiCodeCompletionTeaserMode.ONLY_SHOW_ON_EMPTY
        )
      });
    }
    this.editor.addEventListener("keydown", (event) => {
      if (event.defaultPrevented) {
        event.stopPropagation();
      }
    });
    editorContainerElement.appendChild(this.editor);
    this.#editorHistory = new TextEditor2.TextEditorHistory.TextEditorHistory(this.editor, this.#history);
    if (this.hasFocus()) {
      this.focus();
    }
    this.element.removeAttribute("tabindex");
    this.editorSetForTest();
    UI11.UIUserMetrics.UIUserMetrics.instance().panelLoaded("console", "DevTools.Launch.Console");
  }
  eagerSettingChanged() {
    const enabled = this.eagerEvalSetting.get();
    this.eagerPreviewElement.classList.toggle("hidden", !enabled);
    if (enabled) {
      void this.requestPreview();
    }
  }
  belowEditorElement() {
    return this.eagerPreviewElement;
  }
  onTextChanged() {
    if (this.eagerEvalSetting.get()) {
      const asSoonAsPossible = !TextEditor2.Config.contentIncludingHint(this.editor.editor);
      this.previewRequestForTest = this.textChangeThrottler.schedule(
        this.requestPreviewBound,
        asSoonAsPossible ? Common7.Throttler.Scheduling.AS_SOON_AS_POSSIBLE : Common7.Throttler.Scheduling.DEFAULT
      );
    }
    this.updatePromptIcon();
    this.dispatchEventToListeners("TextChanged" /* TEXT_CHANGED */);
  }
  async requestPreview() {
    const id = ++this.requestPreviewCurrent;
    const text = TextEditor2.Config.contentIncludingHint(this.editor.editor).trim();
    const executionContext = UI11.Context.Context.instance().flavor(SDK8.RuntimeModel.ExecutionContext);
    const { preview, result } = await ObjectUI4.JavaScriptREPL.JavaScriptREPL.evaluateAndBuildPreview(
      text,
      true,
      true,
      500
      /* timeout */
    );
    if (this.requestPreviewCurrent !== id) {
      return;
    }
    this.innerPreviewElement.removeChildren();
    if (preview.deepTextContent() !== TextEditor2.Config.contentIncludingHint(this.editor.editor).trim()) {
      this.innerPreviewElement.appendChild(preview);
    }
    if (result && "object" in result && result.object?.subtype === "node") {
      this.highlightingNode = true;
      SDK8.OverlayModel.OverlayModel.highlightObjectAsDOMNode(result.object);
    } else if (this.highlightingNode) {
      this.highlightingNode = false;
      SDK8.OverlayModel.OverlayModel.hideDOMNodeHighlight(SDK8.TargetManager.TargetManager.instance());
    }
    if (result && executionContext) {
      executionContext.runtimeModel.releaseEvaluationResult(result);
    }
  }
  willHide() {
    super.willHide();
    if (this.highlightingNode) {
      this.highlightingNode = false;
      SDK8.OverlayModel.OverlayModel.hideDOMNodeHighlight(SDK8.TargetManager.TargetManager.instance());
    }
  }
  history() {
    return this.#history;
  }
  clearAutocomplete() {
    CodeMirror2.closeCompletion(this.editor.editor);
  }
  clearAiCodeCompletionCache() {
    this.aiCodeCompletionProvider?.clearCache();
  }
  moveCaretToEndOfPrompt() {
    this.editor.dispatch({
      selection: CodeMirror2.EditorSelection.cursor(this.editor.state.doc.length)
    });
  }
  clear() {
    this.editor.dispatch({
      changes: { from: 0, to: this.editor.state.doc.length }
    });
  }
  /**
   * Replaces the full prompt content with the given text, places the caret
   * at the end, and scrolls the editor into view.
   */
  insertText(text) {
    this.editor.dispatch({
      changes: { from: 0, to: this.editor.state.doc.length, insert: text },
      selection: { anchor: text.length },
      scrollIntoView: true
    });
  }
  text() {
    return this.editor.state.doc.toString();
  }
  setAddCompletionsFromHistory(value) {
    this.addCompletionsFromHistory = value;
  }
  editorKeymap() {
    return [
      {
        // Handle the KeyboardEvent manually.
        any: (_view, event) => {
          if (event.repeat) {
            return false;
          }
          if (event.key === "ArrowUp") {
            return this.#editorHistory.moveHistory(Direction.BACKWARD);
          }
          if (event.key === "ArrowDown") {
            return this.#editorHistory.moveHistory(Direction.FORWARD);
          }
          return false;
        }
      },
      { mac: "Ctrl-p", run: () => this.#editorHistory.moveHistory(Direction.BACKWARD, true) },
      { mac: "Ctrl-n", run: () => this.#editorHistory.moveHistory(Direction.FORWARD, true) },
      {
        key: "Escape",
        run: () => {
          return TextEditor2.JavaScript.closeArgumentsHintsTooltip(this.editor.editor, this.#argumentHintsState);
        }
      },
      {
        key: "Ctrl-Enter",
        run: () => {
          void this.handleEnter(
            /* forceEvaluate */
            true
          );
          return true;
        }
      },
      {
        key: "Enter",
        run: () => {
          void this.handleEnter();
          return true;
        },
        shift: CodeMirror2.insertNewlineAndIndent
      }
    ];
  }
  async enterWillEvaluate(forceEvaluate) {
    const { doc, selection } = this.editor.state;
    if (!doc.length) {
      return false;
    }
    if (forceEvaluate || selection.main.head < doc.length) {
      return true;
    }
    const currentExecutionContext = UI11.Context.Context.instance().flavor(SDK8.RuntimeModel.ExecutionContext);
    const isExpressionComplete = await TextEditor2.JavaScript.isExpressionComplete(doc.toString());
    if (currentExecutionContext !== UI11.Context.Context.instance().flavor(SDK8.RuntimeModel.ExecutionContext)) {
      return false;
    }
    return isExpressionComplete;
  }
  showSelfXssWarning() {
    Common7.Console.Console.instance().warn(
      i18nString6(UIStrings6.selfXssWarning, { PH1: i18nString6(UIStrings6.allowPasting) }),
      Common7.Console.FrontendMessageSource.SELF_XSS
    );
    this.#selfXssWarningShown = true;
    Host5.userMetrics.actionTaken(Host5.UserMetrics.Action.SelfXssWarningConsoleMessageShown);
    this.#updateJavaScriptCompletionCompartment();
  }
  async handleEnter(forceEvaluate) {
    if (this.#selfXssWarningShown && (this.text() === i18nString6(UIStrings6.allowPasting) || this.text() === `'${i18nString6(UIStrings6.allowPasting)}'`)) {
      Common7.Console.Console.instance().log(this.text());
      this.editor.dispatch({
        changes: { from: 0, to: this.editor.state.doc.length },
        scrollIntoView: true
      });
      Common7.Settings.Settings.instance().createSetting("disable-self-xss-warning", false, Common7.Settings.SettingStorageType.SYNCED).set(true);
      this.#selfXssWarningShown = false;
      Host5.userMetrics.actionTaken(Host5.UserMetrics.Action.SelfXssAllowPastingInConsole);
      this.#updateJavaScriptCompletionCompartment();
      return;
    }
    if (await this.enterWillEvaluate(forceEvaluate)) {
      this.appendCommand(this.text(), true);
      TextEditor2.JavaScript.closeArgumentsHintsTooltip(this.editor.editor, this.#argumentHintsState);
      this.editor.dispatch({
        changes: { from: 0, to: this.editor.state.doc.length },
        scrollIntoView: true
      });
      if (this.aiCodeCompletionProvider) {
        const teaserMode = this.editor.editor.state.field(TextEditor2.AiCodeCompletionProvider.aiCodeCompletionTeaserModeState);
        if (teaserMode !== TextEditor2.AiCodeCompletionProvider.AiCodeCompletionTeaserMode.OFF) {
          this.editor.editor.dispatch({
            effects: TextEditor2.AiCodeCompletionProvider.setAiCodeCompletionTeaserMode.of(
              TextEditor2.AiCodeCompletionProvider.AiCodeCompletionTeaserMode.OFF
            )
          });
        }
      }
    } else if (this.editor.state.doc.length) {
      CodeMirror2.insertNewlineAndIndent(this.editor.editor);
    } else {
      this.editor.dispatch({ scrollIntoView: true });
    }
  }
  updatePromptIcon() {
    void this.iconThrottler.schedule(async () => {
      this.promptIcon.classList.toggle("console-prompt-incomplete", !await this.enterWillEvaluate());
    });
  }
  appendCommand(text, useCommandLineAPI) {
    const currentExecutionContext = UI11.Context.Context.instance().flavor(SDK8.RuntimeModel.ExecutionContext);
    if (currentExecutionContext) {
      const executionContext = currentExecutionContext;
      const consoleModel = executionContext.target().model(SDK8.ConsoleModel.ConsoleModel);
      if (consoleModel) {
        const message = consoleModel.addCommandMessage(executionContext, text);
        const expression = ObjectUI4.JavaScriptREPL.JavaScriptREPL.wrapObjectLiteral(text);
        void this.evaluateCommandInConsole(executionContext, message, expression, useCommandLineAPI);
        if (ConsolePanel.instance().isShowing()) {
          Host5.userMetrics.actionTaken(Host5.UserMetrics.Action.CommandEvaluatedInConsolePanel);
          Badges.UserBadges.instance().recordAction(Badges.BadgeAction.CONSOLE_PROMPT_EXECUTED);
        }
      }
    }
  }
  async evaluateCommandInConsole(executionContext, message, expression, useCommandLineAPI) {
    const callFrame = executionContext.debuggerModel.selectedCallFrame();
    if (callFrame?.script.isJavaScript()) {
      const nameMap = await SourceMapScopes.NamesResolver.allVariablesInCallFrame(
        callFrame,
        Bindings5.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance()
      );
      expression = await this.substituteNames(expression, nameMap);
    }
    await executionContext.target().model(SDK8.ConsoleModel.ConsoleModel)?.evaluateCommandInConsole(executionContext, message, expression, useCommandLineAPI);
  }
  async substituteNames(expression, mapping) {
    try {
      return await Formatter2.FormatterWorkerPool.formatterWorkerPool().javaScriptSubstitute(expression, mapping);
    } catch {
      return expression;
    }
  }
  editorUpdate(update) {
    if (update.docChanged || CodeMirror2.selectedCompletion(update.state) !== CodeMirror2.selectedCompletion(update.startState)) {
      this.onTextChanged();
    } else if (update.selectionSet) {
      this.updatePromptIcon();
    }
  }
  focus() {
    this.editor.focus();
  }
  editorSetForTest() {
  }
};
var Events2 = /* @__PURE__ */ ((Events3) => {
  Events3["TEXT_CHANGED"] = "TextChanged";
  return Events3;
})(Events2 || {});
export {
  ConsoleContextSelector_exports as ConsoleContextSelector,
  ConsoleFilter_exports as ConsoleFilter,
  ConsoleFormat_exports as ConsoleFormat,
  ConsoleInsightTeaser_exports as ConsoleInsightTeaser,
  ConsolePanel_exports as ConsolePanel,
  ConsolePinPane_exports as ConsolePinPane,
  ConsolePrompt_exports as ConsolePrompt,
  ConsoleSidebar_exports as ConsoleSidebar,
  ConsoleView_exports as ConsoleView,
  ConsoleViewMessage_exports as ConsoleViewMessage,
  ConsoleViewport_exports as ConsoleViewport,
  PromptBuilder_exports as PromptBuilder,
  SymbolizedErrorWidget_exports as SymbolizedErrorWidget
};
//# sourceMappingURL=console.js.map
