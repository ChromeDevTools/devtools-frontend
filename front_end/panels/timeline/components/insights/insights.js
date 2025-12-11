var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/timeline/components/insights/BaseInsightComponent.js
var BaseInsightComponent_exports = {};
__export(BaseInsightComponent_exports, {
  BaseInsightComponent: () => BaseInsightComponent
});
import "./../../../../ui/components/markdown_view/markdown_view.js";
import * as i18n from "./../../../../core/i18n/i18n.js";
import * as Root from "./../../../../core/root/root.js";
import * as AIAssistance from "./../../../../models/ai_assistance/ai_assistance.js";
import * as Badges from "./../../../../models/badges/badges.js";
import * as GreenDev from "./../../../../models/greendev/greendev.js";
import * as Buttons from "./../../../../ui/components/buttons/buttons.js";
import * as UI from "./../../../../ui/legacy/legacy.js";
import * as Lit2 from "./../../../../ui/lit/lit.js";
import * as VisualLogging from "./../../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/timeline/components/insights/baseInsightComponent.css.js
var baseInsightComponent_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@keyframes insight-highlight-fade-out {
  from {
    background-color: var(--sys-color-yellow-container);
  }

  to {
    background-color: transparent;
  }
}

:host([highlight-insight]) {
  .insight {
    animation: insight-highlight-fade-out 2s 0s;
  }
}

.insight {
  display: block;
  position: relative;
  width: auto;
  height: auto;
  margin: var(--sys-size-5) 0;
  border-radius: var(--sys-shape-corner-extra-small);
  overflow: hidden;
  border: var(--sys-size-1) solid var(--sys-color-divider);
  background-color: var(--sys-color-base);

  header:focus-visible {
    outline: none;
  }

  &.closed {
    background-color: var(--sys-color-surface3);
    border: none;

    &:focus-within {
      /* Ensure that if the user tabs to a closed insight, we outline it so they know it's focused. */
      outline: var(--sys-size-2) solid var(--sys-color-state-focus-ring);
    }
  }

  header {
    padding: var(--sys-size-5) var(--sys-size-4);

    h3 {
      font: var(--sys-typescale-body4-medium);
    }
  }

  &:not(.closed) {
    header {
      padding-bottom: var(--sys-size-2);
    }
  }
}

.insight.ai-assistance-context {
  display: block;
  min-width: 200px;
}

.insight-hover-icon {
  position: absolute;
  top: var(--sys-size-5);
  right: var(--sys-size-5);
  border: none;
  width: var(--sys-size-9);
  user-select: none;
  height: var(--sys-size-9);
  box-shadow: var(--sys-elevation-level1);
  border-radius: var(--sys-shape-corner-full);
  background: var(--sys-color-cdt-base-container);
  opacity: 0%;

  /* Ensure that the icon appears when the user hovers, or focuses the header */
  .insight:hover &,
  header:focus-within & {
    opacity: 100%;
  }

  &.active devtools-button {
    transform: rotate(180deg);
  }
}

.insight-description,
.insight-body,
.insight-title {
  user-select: text;
}

.insight-body {
  padding: 0 var(--sys-size-4) var(--sys-size-5);

  .list-title {
    margin-top: var(--sys-size-4);
    margin-bottom: var(--sys-size-3);
  }

  ul {
    /* left padding to bring the list bullets to the right place */
    padding: 0 0 0 var(--sys-size-9);
    margin: 0;
  }
}

.insight-section {
  padding-top: var(--sys-size-5);
  margin-top: var(--sys-size-5);
}

.insight-description:not(:empty) {
  margin-bottom: var(--sys-size-5);
}

.insight-section:not(:empty) {
  border-top: var(--sys-size-1) solid var(--sys-color-divider);
}

.insight-title {
  color: var(--sys-color-on-base);
  margin-block: 3px;
}

.link {
  color: var(--sys-color-primary);
}

.dl-title {
  font-weight: bold;
}

dd.dl-title {
  text-align: right;
}

.dl-value {
  font-weight: bold;
}

.image-ref {
  display: inline-flex;
  align-items: center;

  &:not(:empty) {
    padding-top: var(--sys-size-5);
  }
}

.element-img {
  width: var(--sys-size-13);
  height: var(--sys-size-13);
  object-fit: cover;
  border: var(--sys-size-1) solid var(--sys-color-divider);
  background: var(--sys-color-divider) -0.054px -12px / 100.239% 148.936% no-repeat;
  margin-right: var(--sys-size-5);
}

.element-img-details {
  font: var(--sys-typescale-body4-regular);
  display: flex;
  flex-direction: column;
  word-break: break-all;

  .element-img-details-size {
    color: var(--color-text-secondary);
  }
}

::slotted(*) {
  font: var(--sys-typescale-body4-regular);
}

.insight-savings {
  font: var(--sys-typescale-body4-medium);
  color: var(--sys-color-green);
}

.timeline-link {
  cursor: pointer;
  text-decoration: var(--override-timeline-link-text-decoration, underline);
  color: var(--override-timeline-link-text-color, var(--sys-color-primary));
  /* for a11y reasons this is a button, so we have to remove some default
   * styling */
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  text-align: left;
}

.timeline-link.invalid-link {
  color: var(--sys-color-state-disabled);
}

.ask-ai-btn-wrap {
  border-top: var(--sys-size-1) solid var(--sys-color-divider);
  padding-top: var(--sys-size-5);
  margin-top: var(--sys-size-5);
  text-align: center;
}

/*# sourceURL=${import.meta.resolve("./baseInsightComponent.css")} */`;

// gen/front_end/panels/timeline/components/insights/Helpers.js
var Helpers_exports = {};
__export(Helpers_exports, {
  md: () => md,
  shouldRenderForCategory: () => shouldRenderForCategory
});
import "./../../../../ui/components/markdown_view/markdown_view.js";
import * as Trace from "./../../../../models/trace/trace.js";
import * as Marked from "./../../../../third_party/marked/marked.js";
import * as Lit from "./../../../../ui/lit/lit.js";
var { html } = Lit;
function shouldRenderForCategory(options) {
  return options.activeCategory === Trace.Insights.Types.InsightCategory.ALL || options.activeCategory === options.insightCategory;
}
function md(markdown) {
  const tokens = Marked.Marked.lexer(markdown);
  const data = { tokens };
  return html`<devtools-markdown-view .data=${data}></devtools-markdown-view>`;
}

// gen/front_end/panels/timeline/components/insights/SidebarInsight.js
var SidebarInsight_exports = {};
__export(SidebarInsight_exports, {
  InsightActivated: () => InsightActivated,
  InsightDeactivated: () => InsightDeactivated,
  InsightProvideOverlays: () => InsightProvideOverlays,
  InsightSetHovered: () => InsightSetHovered,
  InsightSetZoom: () => InsightSetZoom
});
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
var InsightSetHovered = class _InsightSetHovered extends Event {
  bounds;
  static eventName = "insightsethovered";
  constructor(bounds) {
    super(_InsightSetHovered.eventName, { bubbles: true, composed: true });
    this.bounds = bounds;
  }
};
var InsightSetZoom = class _InsightSetZoom extends Event {
  bounds;
  static eventName = "insightsetzoom";
  constructor(bounds) {
    super(_InsightSetZoom.eventName, { bubbles: true, composed: true });
    this.bounds = bounds;
  }
};
var InsightProvideOverlays = class _InsightProvideOverlays extends Event {
  overlays;
  options;
  static eventName = "insightprovideoverlays";
  constructor(overlays, options) {
    super(_InsightProvideOverlays.eventName, { bubbles: true, composed: true });
    this.overlays = overlays;
    this.options = options;
  }
};

// gen/front_end/panels/timeline/components/insights/BaseInsightComponent.js
var { html: html2 } = Lit2;
var UIStrings = {
  /**
   * @description Text to tell the user the estimated time or size savings for this insight. "&" means "and" - space is limited to prefer abbreviated terms if possible. Text will still fit if not short, it just won't look very good, so using no abbreviations is fine if necessary.
   * @example {401 ms} PH1
   * @example {112 kB} PH1
   */
  estimatedSavings: "Est savings: {PH1}",
  /**
   * @description Text to tell the user the estimated time and size savings for this insight. "&" means "and", "Est" means "Estimated" - space is limited to prefer abbreviated terms if possible. Text will still fit if not short, it just won't look very good, so using no abbreviations is fine if necessary.
   * @example {401 ms} PH1
   * @example {112 kB} PH2
   */
  estimatedSavingsTimingAndBytes: "Est savings: {PH1} & {PH2}",
  /**
   * @description Text to tell the user the estimated time savings for this insight that is used for screen readers.
   * @example {401 ms} PH1
   * @example {112 kB} PH1
   */
  estimatedSavingsAriaTiming: "Estimated savings for this insight: {PH1}",
  /**
   * @description Text to tell the user the estimated size savings for this insight that is used for screen readers. Value is in terms of "transfer size", aka encoded/compressed data length.
   * @example {401 ms} PH1
   * @example {112 kB} PH1
   */
  estimatedSavingsAriaBytes: "Estimated savings for this insight: {PH1} transfer size",
  /**
   * @description Text to tell the user the estimated time and size savings for this insight that is used for screen readers.
   * @example {401 ms} PH1
   * @example {112 kB} PH2
   */
  estimatedSavingsTimingAndBytesAria: "Estimated savings for this insight: {PH1} and {PH2} transfer size",
  /**
   * @description Used for screen-readers as a label on the button to expand an insight to view details
   * @example {LCP breakdown} PH1
   */
  viewDetails: "View details for {PH1} insight."
};
var str_ = i18n.i18n.registerUIStrings("panels/timeline/components/insights/BaseInsightComponent.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var DEFAULT_VIEW = (input, output, target) => {
  const { internalName, model, selected, estimatedSavingsString, estimatedSavingsAriaLabel, isAIAssistanceContext, showAskAI, dispatchInsightToggle, renderContent, onHeaderKeyDown, onAskAIButtonClick } = input;
  const containerClasses = Lit2.Directives.classMap({
    insight: true,
    closed: !selected || isAIAssistanceContext,
    "ai-assistance-context": isAIAssistanceContext
  });
  let ariaLabel = `${i18nString(UIStrings.viewDetails, { PH1: model.title })}`;
  if (estimatedSavingsAriaLabel) {
    ariaLabel += ` ${estimatedSavingsAriaLabel}`;
  }
  function renderInsightContent() {
    if (!selected) {
      return Lit2.nothing;
    }
    const aiLabel = "Debug with AI";
    const ariaLabel2 = `Ask AI about ${model.title} insight`;
    const content = renderContent();
    return html2`
      <div class="insight-body">
        <div class="insight-description">${md(model.description)}</div>
        <div class="insight-content">${content}</div>
        ${showAskAI ? html2`
          <div class="ask-ai-btn-wrap">
            <devtools-button class="ask-ai"
              .variant=${"outlined"}
              .iconName=${"smart-assistant"}
              data-insights-ask-ai
              jslog=${VisualLogging.action(`timeline.insight-ask-ai.${internalName}`).track({ click: true })}
              @click=${onAskAIButtonClick}
              aria-label=${ariaLabel2}
            >${aiLabel}</devtools-button>
          </div>
        ` : Lit2.nothing}
      </div>`;
  }
  function renderHoverIcon() {
    if (isAIAssistanceContext) {
      return Lit2.nothing;
    }
    const containerClasses2 = Lit2.Directives.classMap({
      "insight-hover-icon": true,
      active: selected
    });
    return html2`
      <div class=${containerClasses2} inert>
        <devtools-button .data=${{
      variant: "icon",
      iconName: "chevron-down",
      size: "SMALL"
    }}
      ></devtools-button>
      </div>
    `;
  }
  Lit2.render(html2`
    <style>${baseInsightComponent_css_default}</style>
    <div class=${containerClasses}>
      <header @click=${dispatchInsightToggle}
        @keydown=${onHeaderKeyDown}
        jslog=${VisualLogging.action(`timeline.toggle-insight.${internalName}`).track({ click: true })}
        data-insight-header-title=${model?.title}
        tabIndex="0"
        role="button"
        aria-expanded=${selected}
        aria-label=${ariaLabel}
      >
        ${renderHoverIcon()}
        <h3 class="insight-title">${model?.title}</h3>
        ${estimatedSavingsString ? html2`
          <slot name="insight-savings" class="insight-savings">
            <span title=${estimatedSavingsAriaLabel ?? ""}>${estimatedSavingsString}</span>
          </slot>
        </div>` : Lit2.nothing}
      </header>
      ${renderInsightContent()}
    </div>
  `, target);
  if (selected) {
    requestAnimationFrame(() => requestAnimationFrame(() => target.scrollIntoViewIfNeeded()));
  }
};
var BaseInsightComponent = class extends UI.Widget.Widget {
  #view;
  // Tracks if this component is rendered withing the AI assistance panel.
  // Currently only relevant to GreenDev.
  #isAIAssistanceContext = false;
  #selected = false;
  #model = null;
  #agentFocus = null;
  #fieldMetrics = null;
  #parsedTrace = null;
  #initialOverlays = null;
  constructor(element, view = DEFAULT_VIEW) {
    super(element, { useShadowDom: true });
    this.#view = view;
  }
  get model() {
    return this.#model;
  }
  data = {
    bounds: null,
    insightSetKey: null
  };
  sharedTableState = {
    selectedRowEl: null,
    selectionIsSticky: false
  };
  // Insights that do support the AI feature can override this to return true.
  // The "Ask AI" button will only be shown for an Insight if this
  // is true and if the feature has been enabled by the user and they meet the
  // requirements to use AI.
  hasAskAiSupport() {
    return false;
  }
  set isAIAssistanceContext(isAIAssistanceContext) {
    this.#isAIAssistanceContext = isAIAssistanceContext;
    this.requestUpdate();
  }
  set selected(selected) {
    if (!this.#selected && selected) {
      const options = this.getOverlayOptionsForInitialOverlays();
      this.element.dispatchEvent(new InsightProvideOverlays(this.getInitialOverlays(), options));
    }
    if (this.#selected !== selected) {
      this.#selected = selected;
      this.requestUpdate();
    }
  }
  get selected() {
    return this.#selected;
  }
  set parsedTrace(trace) {
    this.#parsedTrace = trace;
  }
  set model(model) {
    this.#model = model;
    this.requestUpdate();
  }
  set insightSetKey(insightSetKey) {
    this.data.insightSetKey = insightSetKey;
    this.requestUpdate();
  }
  get bounds() {
    return this.data.bounds;
  }
  set bounds(bounds) {
    this.data.bounds = bounds;
    this.requestUpdate();
  }
  set agentFocus(agentFocus) {
    this.#agentFocus = agentFocus;
  }
  set fieldMetrics(fieldMetrics) {
    this.#fieldMetrics = fieldMetrics;
  }
  get fieldMetrics() {
    return this.#fieldMetrics;
  }
  getOverlayOptionsForInitialOverlays() {
    return { updateTraceWindow: true };
  }
  #dispatchInsightToggle() {
    if (!this.data.insightSetKey || !this.#model) {
      return;
    }
    if (this.#parsedTrace && GreenDev.Prototypes.instance().isEnabled("inDevToolsFloaty")) {
      const floatyHandled = UI.Floaty.onFloatyClick({
        type: "PERFORMANCE_INSIGHT",
        data: {
          insight: this.#model,
          trace: this.#parsedTrace
        }
      });
      if (floatyHandled) {
        return;
      }
    }
    const focus = UI.Context.Context.instance().flavor(AIAssistance.AIContext.AgentFocus);
    if (this.#selected) {
      this.element.dispatchEvent(new InsightDeactivated());
      if (focus) {
        UI.Context.Context.instance().setFlavor(AIAssistance.AIContext.AgentFocus, focus.withInsight(null));
      }
      return;
    }
    if (focus) {
      UI.Context.Context.instance().setFlavor(AIAssistance.AIContext.AgentFocus, focus.withInsight(this.#model));
    }
    Badges.UserBadges.instance().recordAction(Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED);
    this.sharedTableState.selectedRowEl?.classList.remove("selected");
    this.sharedTableState.selectedRowEl = null;
    this.sharedTableState.selectionIsSticky = false;
    this.element.dispatchEvent(new InsightActivated(this.#model, this.data.insightSetKey));
  }
  /**
   * Ensure that if the user presses enter or space on a header, we treat it
   * like a click and toggle the insight.
   */
  #onHeaderKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      this.#dispatchInsightToggle();
    }
  }
  /**
   * Replaces the initial insight overlays with the ones provided.
   *
   * If `overlays` is null, reverts back to the initial overlays.
   *
   * This allows insights to provide an initial set of overlays,
   * and later temporarily replace all of those insights with a different set.
   * This enables the hover/click table interactions.
   */
  toggleTemporaryOverlays(overlays, options) {
    if (!this.#selected) {
      return;
    }
    if (!overlays) {
      this.element.dispatchEvent(new InsightProvideOverlays(this.getInitialOverlays(), this.getOverlayOptionsForInitialOverlays()));
      return;
    }
    this.element.dispatchEvent(new InsightProvideOverlays(overlays, options));
  }
  getInitialOverlays() {
    if (this.#initialOverlays) {
      return this.#initialOverlays;
    }
    this.#initialOverlays = this.createOverlays();
    return this.#initialOverlays;
  }
  createOverlays() {
    return this.#model?.createOverlays?.() ?? [];
  }
  performUpdate() {
    if (!this.#model) {
      return;
    }
    const input = {
      internalName: this.internalName,
      model: this.#model,
      selected: this.#selected,
      estimatedSavingsString: this.getEstimatedSavingsString(),
      estimatedSavingsAriaLabel: this.#getEstimatedSavingsAriaLabel(),
      isAIAssistanceContext: this.#isAIAssistanceContext,
      showAskAI: this.#canShowAskAI(),
      dispatchInsightToggle: () => this.#dispatchInsightToggle(),
      renderContent: () => this.renderContent(),
      onHeaderKeyDown: () => this.#onHeaderKeyDown,
      onAskAIButtonClick: () => this.#onAskAIButtonClick()
    };
    this.#view(input, void 0, this.contentElement);
  }
  getEstimatedSavingsTime() {
    return null;
  }
  getEstimatedSavingsBytes() {
    return this.#model?.wastedBytes ?? null;
  }
  #getEstimatedSavingsTextParts() {
    const savingsTime = this.getEstimatedSavingsTime();
    const savingsBytes = this.getEstimatedSavingsBytes();
    let timeString, bytesString;
    if (savingsTime) {
      timeString = i18n.TimeUtilities.millisToString(savingsTime);
    }
    if (savingsBytes) {
      bytesString = i18n.ByteUtilities.bytesToString(savingsBytes);
    }
    return {
      timeString,
      bytesString
    };
  }
  #getEstimatedSavingsAriaLabel() {
    const { bytesString, timeString } = this.#getEstimatedSavingsTextParts();
    if (timeString && bytesString) {
      return i18nString(UIStrings.estimatedSavingsTimingAndBytesAria, {
        PH1: timeString,
        PH2: bytesString
      });
    }
    if (timeString) {
      return i18nString(UIStrings.estimatedSavingsAriaTiming, {
        PH1: timeString
      });
    }
    if (bytesString) {
      return i18nString(UIStrings.estimatedSavingsAriaBytes, {
        PH1: bytesString
      });
    }
    return null;
  }
  getEstimatedSavingsString() {
    const { bytesString, timeString } = this.#getEstimatedSavingsTextParts();
    if (timeString && bytesString) {
      return i18nString(UIStrings.estimatedSavingsTimingAndBytes, {
        PH1: timeString,
        PH2: bytesString
      });
    }
    if (timeString) {
      return i18nString(UIStrings.estimatedSavings, {
        PH1: timeString
      });
    }
    if (bytesString) {
      return i18nString(UIStrings.estimatedSavings, {
        PH1: bytesString
      });
    }
    return null;
  }
  #onAskAIButtonClick() {
    if (!this.#agentFocus) {
      return;
    }
    const actionId = "drjones.performance-panel-context";
    if (!UI.ActionRegistry.ActionRegistry.instance().hasAction(actionId)) {
      return;
    }
    let focus = UI.Context.Context.instance().flavor(AIAssistance.AIContext.AgentFocus);
    if (focus) {
      focus = focus.withInsight(this.#model);
    } else {
      focus = this.#agentFocus;
    }
    UI.Context.Context.instance().setFlavor(AIAssistance.AIContext.AgentFocus, focus);
    const action3 = UI.ActionRegistry.ActionRegistry.instance().getAction(actionId);
    void action3.execute();
  }
  #canShowAskAI() {
    if (this.#isAIAssistanceContext || !this.hasAskAiSupport()) {
      return false;
    }
    const { devToolsAiAssistancePerformanceAgent } = Root.Runtime.hostConfig;
    const askAiEnabled = Boolean(devToolsAiAssistancePerformanceAgent?.enabled);
    if (!askAiEnabled) {
      return false;
    }
    const { aidaAvailability } = Root.Runtime.hostConfig;
    return aidaAvailability?.enterprisePolicyValue !== Root.Runtime.GenAiEnterprisePolicyValue.DISABLE && aidaAvailability?.enabled === true;
  }
};

// gen/front_end/panels/timeline/components/insights/Cache.js
var Cache_exports = {};
__export(Cache_exports, {
  Cache: () => Cache
});

// gen/front_end/panels/timeline/components/insights/Table.js
var Table_exports = {};
__export(Table_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW3,
  Table: () => Table,
  createLimitedRows: () => createLimitedRows,
  i18nString: () => i18nString2,
  renderOthersLabel: () => renderOthersLabel
});
import * as i18n3 from "./../../../../core/i18n/i18n.js";
import * as UI3 from "./../../../../ui/legacy/legacy.js";
import * as Lit4 from "./../../../../ui/lit/lit.js";

// gen/front_end/panels/timeline/components/insights/EventRef.js
var EventRef_exports = {};
__export(EventRef_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW2,
  EventReferenceClick: () => EventReferenceClick,
  eventRef: () => eventRef
});
import * as Trace2 from "./../../../../models/trace/trace.js";
import * as UI2 from "./../../../../ui/legacy/legacy.js";
import * as Lit3 from "./../../../../ui/lit/lit.js";
import * as Utils from "./../../utils/utils.js";
var { html: html3, Directives: { ifDefined } } = Lit3;
var { widgetConfig } = UI2.Widget;
var EventReferenceClick = class _EventReferenceClick extends Event {
  event;
  static eventName = "eventreferenceclick";
  constructor(event) {
    super(_EventReferenceClick.eventName, { bubbles: true, composed: true });
    this.event = event;
  }
};
var DEFAULT_VIEW2 = (input, output, target) => {
  const { text, event } = input;
  Lit3.render(html3`
    <style>${baseInsightComponent_css_default}</style>
    <button type="button" class="timeline-link" @click=${(e) => {
    e.stopPropagation();
    if (event) {
      target.dispatchEvent(new EventReferenceClick(event));
    }
  }}>${text}</button>
  `, target);
};
var EventRef = class extends UI2.Widget.Widget {
  #view;
  #text = null;
  #event = null;
  constructor(element, view = DEFAULT_VIEW2) {
    super(element, { useShadowDom: true });
    this.#view = view;
  }
  set text(text) {
    this.#text = text;
    this.requestUpdate();
  }
  set event(event) {
    this.#event = event;
    this.requestUpdate();
  }
  performUpdate() {
    if (!this.#text || !this.#event) {
      return;
    }
    const input = {
      text: this.#text,
      event: this.#event
    };
    this.#view(input, void 0, this.contentElement);
  }
};
function eventRef(event, options) {
  let title = options?.title;
  let text = options?.text;
  if (Trace2.Types.Events.isSyntheticNetworkRequest(event)) {
    text = text ?? Utils.Helpers.shortenUrl(new URL(event.args.data.url));
    title = title ?? event.args.data.url;
  } else if (!text) {
    console.warn("No text given for eventRef");
    text = event.name;
  }
  return html3`<devtools-widget title=${ifDefined(title)} .widgetConfig=${widgetConfig(EventRef, {
    event,
    text
  })}></devtools-widget>`;
}

// gen/front_end/panels/timeline/components/insights/table.css.js
var table_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

table {
  width: 100%;
  padding: 5px 0;
  border-collapse: collapse;
}

thead {
  white-space: nowrap;
}

table tr > * {
  text-align: right;
}

table tr > *:first-child {
  text-align: left;
}

table.interactive tbody tr {
  cursor: pointer;
}

table.interactive tbody tr:hover,
table.interactive tbody tr.hover,
table.interactive tbody tr.selected {
  background-color: var(--sys-color-state-hover-on-subtle);
}

table thead th {
  font: var(--sys-typescale-body4-medium);
}

table tbody th {
  font-weight: normal;
}

table th[scope='row'] {
  padding: 3px 0;
  word-break: normal;
  overflow-wrap: anywhere;
}

.devtools-link {
  color: var(--sys-color-primary);
  text-decoration: underline;
  cursor: pointer;
  outline-offset: 2px;
  padding: 0;
  margin-left: var(--sys-size-3);
  white-space: nowrap;;
}

button.devtools-link {
  border: none;
  background: none;
  font-family: inherit;
  font-size: inherit;
  height: 16px;
}

/*# sourceURL=${import.meta.resolve("./table.css")} */`;

// gen/front_end/panels/timeline/components/insights/Table.js
var UIStrings2 = {
  /**
   * @description Table row value representing the remaining items not shown in the table due to size constraints. This row will always represent at least 2 items.
   * @example {5} PH1
   */
  others: "{PH1} others"
};
var str_2 = i18n3.i18n.registerUIStrings("panels/timeline/components/insights/Table.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var { html: html4 } = Lit4;
function renderOthersLabel(numOthers) {
  return i18nString2(UIStrings2.others, { PH1: numOthers });
}
function createLimitedRows(arr, aggregator, limit = 10) {
  if (arr.length === 0 || limit === 0) {
    return [];
  }
  const aggregateStartIndex = limit - 1;
  const items = arr.slice(0, aggregateStartIndex).map(aggregator.mapToRow.bind(aggregator));
  if (arr.length > limit) {
    items.push(aggregator.createAggregatedTableRow(arr.slice(aggregateStartIndex)));
  } else if (arr.length === limit) {
    items.push(aggregator.mapToRow(arr[aggregateStartIndex]));
  }
  return items;
}
var DEFAULT_VIEW3 = (input, output, target) => {
  const { interactive, headers, flattenedRows, onHoverRow, onClickRow, onMouseLeave } = input;
  const numColumns = headers.length;
  function renderRow({ row, depth }) {
    const thStyles = Lit4.Directives.styleMap({
      paddingLeft: `calc(${depth} * var(--sys-size-5))`,
      backgroundImage: `repeating-linear-gradient(
            to right,
            var(--sys-color-tonal-outline) 0 var(--sys-size-1),
            transparent var(--sys-size-1) var(--sys-size-5)
          )`,
      backgroundPosition: "0 0",
      backgroundRepeat: "no-repeat",
      backgroundSize: `calc(${depth} * var(--sys-size-5))`
    });
    const trStyles = Lit4.Directives.styleMap({
      color: depth ? "var(--sys-color-on-surface-subtle)" : ""
    });
    const columnEls = row.values.map((value, i) => i === 0 ? html4`<th
              scope="row"
              colspan=${i === row.values.length - 1 ? numColumns - i : 1}
              style=${thStyles}>${value}
            </th>` : html4`<td>${value}</td>`);
    return html4`<tr style=${trStyles}>${columnEls}</tr>`;
  }
  const findRowAndEl = (el) => {
    const rowEl = el.closest("tr");
    const row = flattenedRows[rowEl.sectionRowIndex].row;
    return { row, rowEl };
  };
  Lit4.render(html4`
    <style>${table_css_default}</style>
    <table
        class=${Lit4.Directives.classMap({
    interactive
  })}
        @mouseleave=${interactive ? onMouseLeave : null}>
      <thead>
        <tr>
          ${headers.map((h) => html4`<th scope="col">${h}</th>`)}
        </tr>
      </thead>
      <tbody
        @mouseover=${interactive ? (e) => {
    const { row, rowEl } = findRowAndEl(e.target);
    onHoverRow(row, rowEl);
  } : null}
        @click=${interactive ? (e) => {
    const { row, rowEl } = findRowAndEl(e.target);
    onClickRow(row, rowEl);
  } : null}
      >${flattenedRows.map(renderRow)}</tbody>
    </table>`, target);
};
var Table = class extends UI3.Widget.Widget {
  #view;
  #insight;
  #state;
  #headers;
  /** The rows as given as by the user, which may include recursive rows via subRows. */
  #rows;
  /** All rows/subRows, in the order that they appear visually. This is the result of traversing `#rows` and any subRows found. */
  #flattenedRows;
  #rowToParentRow = /* @__PURE__ */ new Map();
  #interactive = false;
  #currentHoverRow = null;
  constructor(element, view = DEFAULT_VIEW3) {
    super(element, { useShadowDom: true });
    this.#view = view;
  }
  set data(data) {
    this.#insight = data.insight;
    this.#state = data.insight.sharedTableState;
    this.#headers = data.headers;
    this.#rows = data.rows;
    this.#flattenedRows = this.#createFlattenedRows();
    this.#interactive = this.#rows.some((row) => row.overlays || row.subRows?.length);
    this.requestUpdate();
  }
  #createFlattenedRows() {
    if (!this.#rows) {
      return [];
    }
    const rowToParentRow = this.#rowToParentRow;
    rowToParentRow.clear();
    const flattenedRows = [];
    function traverse(parent, row, depth = 0) {
      if (parent) {
        rowToParentRow.set(row, parent);
      }
      flattenedRows.push({ depth, row });
      for (const subRow of row.subRows ?? []) {
        traverse(row, subRow, depth + 1);
      }
    }
    for (const row of this.#rows) {
      traverse(null, row);
    }
    return flattenedRows;
  }
  #onHoverRow(row, rowEl) {
    if (row === this.#currentHoverRow) {
      return;
    }
    for (const el of this.element.querySelectorAll(".hover")) {
      el.classList.remove("hover");
    }
    let curRow = this.#rowToParentRow.get(row);
    while (curRow) {
      rowEl.classList.add("hover");
      curRow = this.#rowToParentRow.get(row);
    }
    this.#currentHoverRow = row;
    this.#onSelectedRowChanged(row, rowEl, { isHover: true });
  }
  #onClickRow(row, rowEl) {
    const overlays = row.overlays;
    if (overlays?.length === 1 && overlays[0].type === "ENTRY_OUTLINE") {
      this.element.dispatchEvent(new EventReferenceClick(overlays[0].entry));
      return;
    }
    this.#onSelectedRowChanged(row, rowEl, { sticky: true });
  }
  #onMouseLeave() {
    for (const el of this.element.shadowRoot?.querySelectorAll(".hover") ?? []) {
      el.classList.remove("hover");
    }
    this.#currentHoverRow = null;
    this.#onSelectedRowChanged(null, null);
  }
  #onSelectedRowChanged(row, rowEl, opts = {}) {
    if (!this.#state || !this.#insight) {
      return;
    }
    if (this.#state.selectionIsSticky && !opts.sticky) {
      return;
    }
    if (this.#state.selectionIsSticky && rowEl === this.#state.selectedRowEl) {
      rowEl = null;
      opts.sticky = false;
    }
    if (rowEl && row) {
      const overlays = row.overlays;
      if (overlays) {
        this.#insight.toggleTemporaryOverlays(overlays, { updateTraceWindow: !opts.isHover });
      }
    } else {
      this.#insight.toggleTemporaryOverlays(null, { updateTraceWindow: false });
    }
    this.#state.selectedRowEl?.classList.remove("selected");
    rowEl?.classList.add("selected");
    this.#state.selectedRowEl = rowEl;
    this.#state.selectionIsSticky = opts.sticky ?? false;
  }
  performUpdate() {
    if (!this.#headers || !this.#flattenedRows) {
      return;
    }
    const input = {
      interactive: this.#interactive,
      headers: this.#headers,
      flattenedRows: this.#flattenedRows,
      onHoverRow: this.#onHoverRow.bind(this),
      onClickRow: this.#onClickRow.bind(this),
      onMouseLeave: this.#onMouseLeave.bind(this)
    };
    this.#view(input, void 0, this.contentElement);
  }
};

// gen/front_end/panels/timeline/components/insights/Cache.js
import * as i18n5 from "./../../../../core/i18n/i18n.js";
import * as Trace3 from "./../../../../models/trace/trace.js";
import * as UI4 from "./../../../../ui/legacy/legacy.js";
import * as Lit5 from "./../../../../ui/lit/lit.js";
var { UIStrings: UIStrings3, i18nString: i18nString3, createOverlayForRequest } = Trace3.Insights.Models.Cache;
var { html: html5 } = Lit5;
var { widgetConfig: widgetConfig2 } = UI4.Widget;
var Cache = class extends BaseInsightComponent {
  internalName = "cache";
  hasAskAiSupport() {
    return true;
  }
  mapToRow(req) {
    return {
      values: [eventRef(req.request), i18n5.TimeUtilities.secondsToString(req.ttl)],
      overlays: [createOverlayForRequest(req.request)]
    };
  }
  createAggregatedTableRow(remaining) {
    return {
      values: [renderOthersLabel(remaining.length), ""],
      overlays: remaining.flatMap((r) => createOverlayForRequest(r.request))
    };
  }
  renderContent() {
    if (!this.model) {
      return Lit5.nothing;
    }
    const cacheableRequests = [...this.model.requests];
    const topRequests = cacheableRequests.sort((a, b) => b.request.args.data.decodedBodyLength - a.request.args.data.decodedBodyLength);
    const rows = createLimitedRows(topRequests, this);
    if (!rows.length) {
      return html5`<div class="insight-section">${i18nString3(UIStrings3.noRequestsToCache)}</div>`;
    }
    return html5`
      <div class="insight-section">
        <devtools-widget
          .widgetConfig=${widgetConfig2(Table, {
      data: {
        insight: this,
        headers: [i18nString3(UIStrings3.requestColumn), i18nString3(UIStrings3.cacheTTL)],
        rows
      }
    })}>
        </devtools-widget>
      </div>`;
  }
};

// gen/front_end/panels/timeline/components/insights/Checklist.js
var Checklist_exports = {};
__export(Checklist_exports, {
  Checklist: () => Checklist,
  DEFAULT_VIEW: () => DEFAULT_VIEW4
});
import "./../../../../ui/kit/kit.js";
import * as i18n6 from "./../../../../core/i18n/i18n.js";
import * as UI5 from "./../../../../ui/legacy/legacy.js";
import * as Lit6 from "./../../../../ui/lit/lit.js";

// gen/front_end/panels/timeline/components/insights/checklist.css.js
var checklist_css_default = `/*
 * Copyright 2025 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

ul {
  list-style: none;
  margin: 0;
  padding: 0;

  li {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: var(--sys-size-3);
    font: var(--sys-typescale-body4-medium);
    padding-block: var(--sys-size-3);

    span {
      /* push the text down to align slightly better with the icons */
      padding-top: 2px;
    }
  }
}

.check-failed {
  color: var(--app-color-performance-bad);
}

.check-passed {
  color: var(--app-color-performance-good);
}

/*# sourceURL=${import.meta.resolve("./checklist.css")} */`;

// gen/front_end/panels/timeline/components/insights/Checklist.js
var { html: html6 } = Lit6;
var UIStrings4 = {
  /**
   * @description Text for a screen-reader label to tell the user that the icon represents a successful insight check
   * @example {Server response time} PH1
   */
  successAriaLabel: "Insight check passed: {PH1}",
  /**
   * @description Text for a screen-reader label to tell the user that the icon represents an unsuccessful insight check
   * @example {Server response time} PH1
   */
  failedAriaLabel: "Insight check failed: {PH1}"
};
var str_3 = i18n6.i18n.registerUIStrings("panels/timeline/components/insights/Checklist.ts", UIStrings4);
var i18nString4 = i18n6.i18n.getLocalizedString.bind(void 0, str_3);
var DEFAULT_VIEW4 = (input, output, target) => {
  const { checklist } = input;
  function getIcon(check) {
    const icon = check.value ? "check-circle" : "clear";
    const ariaLabel = check.value ? i18nString4(UIStrings4.successAriaLabel, { PH1: check.label }) : i18nString4(UIStrings4.failedAriaLabel, { PH1: check.label });
    return html6`
        <devtools-icon
          aria-label=${ariaLabel}
          name=${icon}
          class=${check.value ? "check-passed" : "check-failed"}
        ></devtools-icon>
      `;
  }
  Lit6.render(html6`
    <style>${checklist_css_default}</style>
    <ul>
      ${Object.values(checklist).map((check) => html6`<li>
          ${getIcon(check)}
          <span data-checklist-label>${check.label}</span>
      </li>`)}
    </ul>
  `, target);
};
var Checklist = class extends UI5.Widget.Widget {
  #view;
  #checklist;
  constructor(element, view = DEFAULT_VIEW4) {
    super(element, { useShadowDom: true });
    this.#view = view;
  }
  set checklist(checklist) {
    this.#checklist = checklist;
    this.requestUpdate();
  }
  performUpdate() {
    if (!this.#checklist) {
      return;
    }
    const input = {
      checklist: this.#checklist
    };
    this.#view(input, void 0, this.contentElement);
  }
};

// gen/front_end/panels/timeline/components/insights/CLSCulprits.js
var CLSCulprits_exports = {};
__export(CLSCulprits_exports, {
  CLSCulprits: () => CLSCulprits
});
import * as i18n8 from "./../../../../core/i18n/i18n.js";
import * as Trace4 from "./../../../../models/trace/trace.js";
import * as Lit8 from "./../../../../ui/lit/lit.js";

// gen/front_end/panels/timeline/components/insights/NodeLink.js
var NodeLink_exports = {};
__export(NodeLink_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW5,
  NodeLink: () => NodeLink,
  nodeLink: () => nodeLink
});
import * as SDK from "./../../../../core/sdk/sdk.js";
import * as Buttons2 from "./../../../../ui/components/buttons/buttons.js";
import * as LegacyComponents from "./../../../../ui/legacy/components/utils/utils.js";
import * as UI6 from "./../../../../ui/legacy/legacy.js";
import * as Lit7 from "./../../../../ui/lit/lit.js";
import * as PanelsCommon from "./../../../common/common.js";
var { html: html7 } = Lit7;
var { widgetConfig: widgetConfig3 } = UI6.Widget;
var DEFAULT_VIEW5 = (input, output, target) => {
  const { relatedNodeEl, fallbackUrl, fallbackHtmlSnippet, fallbackText } = input;
  let template;
  if (relatedNodeEl) {
    template = html7`<div class='node-link'>${relatedNodeEl}</div>`;
  } else if (fallbackUrl) {
    const MAX_URL_LENGTH = 20;
    const options = {
      tabStop: true,
      showColumnNumber: false,
      inlineFrameIndex: 0,
      maxLength: MAX_URL_LENGTH
    };
    const linkEl = LegacyComponents.Linkifier.Linkifier.linkifyURL(fallbackUrl, options);
    template = html7`<div class='node-link'>
      <style>${Buttons2.textButtonStyles}</style>
      ${linkEl}
    </div>`;
  } else if (fallbackHtmlSnippet) {
    template = html7`<pre style='text-wrap: auto'>${fallbackHtmlSnippet}</pre>`;
  } else if (fallbackText) {
    template = html7`<span>${fallbackText}</span>`;
  } else {
    template = Lit7.nothing;
  }
  Lit7.render(template, target);
};
var NodeLink = class extends UI6.Widget.Widget {
  #view;
  #backendNodeId;
  #frame;
  #options;
  #fallbackUrl;
  #fallbackHtmlSnippet;
  #fallbackText;
  /**
   * Track the linkified Node for a given backend NodeID to avoid repeated lookups on re-render.
   * Also tracks if we fail to resolve a node, to ensure we don't try on each subsequent re-render.
   */
  #linkifiedNodeForBackendId = /* @__PURE__ */ new Map();
  constructor(element, view = DEFAULT_VIEW5) {
    super(element, { useShadowDom: true });
    this.#view = view;
  }
  set data(data) {
    this.#backendNodeId = data.backendNodeId;
    this.#frame = data.frame;
    this.#options = data.options;
    this.#fallbackUrl = data.fallbackUrl;
    this.#fallbackHtmlSnippet = data.fallbackHtmlSnippet;
    this.#fallbackText = data.fallbackText;
    this.requestUpdate();
  }
  async #linkify() {
    if (this.#backendNodeId === void 0) {
      return;
    }
    const fromCache = this.#linkifiedNodeForBackendId.get(this.#backendNodeId);
    if (fromCache) {
      if (fromCache === "NO_NODE_FOUND") {
        return void 0;
      }
      return fromCache;
    }
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    const domModel = target?.model(SDK.DOMModel.DOMModel);
    if (!domModel) {
      return void 0;
    }
    const domNodesMap = await domModel.pushNodesByBackendIdsToFrontend(/* @__PURE__ */ new Set([this.#backendNodeId]));
    const node = domNodesMap?.get(this.#backendNodeId);
    if (!node) {
      this.#linkifiedNodeForBackendId.set(this.#backendNodeId, "NO_NODE_FOUND");
      return;
    }
    if (node.frameId() !== this.#frame) {
      this.#linkifiedNodeForBackendId.set(this.#backendNodeId, "NO_NODE_FOUND");
      return;
    }
    const linkedNode = PanelsCommon.DOMLinkifier.Linkifier.instance().linkify(node, this.#options);
    this.#linkifiedNodeForBackendId.set(this.#backendNodeId, linkedNode);
    return linkedNode;
  }
  async performUpdate() {
    const input = {
      relatedNodeEl: await this.#linkify(),
      fallbackUrl: this.#fallbackUrl,
      fallbackHtmlSnippet: this.#fallbackHtmlSnippet,
      fallbackText: this.#fallbackText
    };
    this.#view(input, void 0, this.contentElement);
  }
};
function nodeLink(data) {
  return html7`<devtools-widget .widgetConfig=${widgetConfig3(NodeLink, {
    data
  })}></devtools-widget>`;
}

// gen/front_end/panels/timeline/components/insights/CLSCulprits.js
var { UIStrings: UIStrings5, i18nString: i18nString5 } = Trace4.Insights.Models.CLSCulprits;
var { html: html8 } = Lit8;
var CLSCulprits = class extends BaseInsightComponent {
  internalName = "cls-culprits";
  hasAskAiSupport() {
    return true;
  }
  createOverlays() {
    if (!this.model) {
      return [];
    }
    return this.model.createOverlays?.() ?? [];
  }
  #clickEvent(event) {
    this.element.dispatchEvent(new EventReferenceClick(event));
  }
  #renderCulpritsSection(culprits) {
    if (culprits.length === 0) {
      return html8`<div class="insight-section">${i18nString5(UIStrings5.noCulprits)}</div>`;
    }
    return html8`
      <div class="insight-section">
        <p class="list-title">${i18nString5(UIStrings5.topCulprits)}:</p>
        <ul class="worst-culprits">
          ${culprits.map((culprit) => {
      if (culprit.type === 3) {
        return html8`
                <li>
                  ${culprit.description}
                  ${nodeLink({
          backendNodeId: culprit.backendNodeId,
          frame: culprit.frame,
          fallbackUrl: culprit.url
        })}
                </li>`;
      }
      return html8`<li>${culprit.description}</li>`;
    })}
        </ul>
      </div>`;
  }
  renderContent() {
    if (!this.model || !this.bounds) {
      return Lit8.nothing;
    }
    if (!this.model.clusters.length || !this.model.worstCluster) {
      return html8`<div class="insight-section">${i18nString5(UIStrings5.noLayoutShifts)}</div>`;
    }
    const worstCluster = this.model.worstCluster;
    const culprits = this.model.topCulpritsByCluster.get(worstCluster) ?? [];
    const ts = Trace4.Types.Timing.Micro(worstCluster.ts - this.bounds.min);
    const clusterTs = i18n8.TimeUtilities.formatMicroSecondsTime(ts);
    return html8`
      <div class="insight-section">
        <span class="worst-cluster">${i18nString5(UIStrings5.worstCluster)}: <button type="button" class="timeline-link" @click=${() => this.#clickEvent(worstCluster)}>${i18nString5(UIStrings5.layoutShiftCluster, { PH1: clusterTs })}</button></span>
      </div>
      ${this.#renderCulpritsSection(culprits)}
    `;
  }
};

// gen/front_end/panels/timeline/components/insights/DocumentLatency.js
var DocumentLatency_exports = {};
__export(DocumentLatency_exports, {
  DocumentLatency: () => DocumentLatency
});
import * as UI7 from "./../../../../ui/legacy/legacy.js";
import * as Lit9 from "./../../../../ui/lit/lit.js";
var { html: html9 } = Lit9;
var { widgetConfig: widgetConfig4 } = UI7.Widget;
var DocumentLatency = class extends BaseInsightComponent {
  internalName = "document-latency";
  hasAskAiSupport() {
    return true;
  }
  getEstimatedSavingsTime() {
    return this.model?.metricSavings?.FCP ?? null;
  }
  renderContent() {
    if (!this.model?.data) {
      return Lit9.nothing;
    }
    return html9`<devtools-widget .widgetConfig=${widgetConfig4(Checklist, {
      checklist: this.model.data.checklist
    })}></devtools-widget>`;
  }
};

// gen/front_end/panels/timeline/components/insights/DOMSize.js
var DOMSize_exports = {};
__export(DOMSize_exports, {
  DOMSize: () => DOMSize
});
import "./../../../../ui/kit/kit.js";
import * as i18n9 from "./../../../../core/i18n/i18n.js";
import * as Trace5 from "./../../../../models/trace/trace.js";
import * as UI8 from "./../../../../ui/legacy/legacy.js";
import * as Lit10 from "./../../../../ui/lit/lit.js";
var { UIStrings: UIStrings6, i18nString: i18nString6 } = Trace5.Insights.Models.DOMSize;
var { html: html10 } = Lit10;
var { widgetConfig: widgetConfig5 } = UI8.Widget;
var DOMSize = class extends BaseInsightComponent {
  internalName = "dom-size";
  hasAskAiSupport() {
    return true;
  }
  #renderNodeTable(domStatsData) {
    const rows = [];
    if (domStatsData.maxDepth) {
      const { nodeId, nodeName } = domStatsData.maxDepth;
      const template = nodeLink({
        backendNodeId: nodeId,
        frame: domStatsData.frame,
        fallbackText: nodeName
      });
      rows.push({ values: [i18nString6(UIStrings6.maxDOMDepth), template] });
    }
    if (domStatsData.maxChildren) {
      const { nodeId, nodeName } = domStatsData.maxChildren;
      const template = nodeLink({
        backendNodeId: nodeId,
        frame: domStatsData.frame,
        fallbackText: nodeName
      });
      rows.push({ values: [i18nString6(UIStrings6.maxChildren), template] });
    }
    if (!rows.length) {
      return Lit10.nothing;
    }
    return html10`<div class="insight-section">
      <devtools-widget .widgetConfig=${widgetConfig5(Table, {
      data: {
        insight: this,
        headers: [i18nString6(UIStrings6.statistic), i18nString6(UIStrings6.element)],
        rows
      }
    })}>
      </devtools-widget>
    </div>`;
  }
  #renderLargeUpdatesTable() {
    if (!this.model || !this.model.largeUpdates.length) {
      return null;
    }
    const rows = this.model.largeUpdates.map((update) => {
      return {
        values: [eventRef(update.event, { text: update.label }), i18n9.TimeUtilities.millisToString(update.duration)],
        overlays: [{
          type: "ENTRY_OUTLINE",
          entry: update.event,
          outlineReason: "INFO"
        }]
      };
    });
    return html10`<div class="insight-section">
      <div class="insight-description">${md(i18nString6(UIStrings6.topUpdatesDescription))}</div>
      <devtools-widget .widgetConfig=${widgetConfig5(Table, {
      data: {
        insight: this,
        headers: ["", i18nString6(UIStrings6.duration)],
        rows
      }
    })}>
      </devtools-widget>
    </div>`;
  }
  renderContent() {
    if (!this.model) {
      return Lit10.nothing;
    }
    const domStatsData = this.model.maxDOMStats?.args.data;
    if (!domStatsData) {
      return Lit10.nothing;
    }
    return html10`<div class="insight-section">
      <devtools-widget
        .widgetConfig=${widgetConfig5(Table, {
      data: {
        insight: this,
        headers: [i18nString6(UIStrings6.statistic), i18nString6(UIStrings6.value)],
        rows: [
          { values: [i18nString6(UIStrings6.totalElements), domStatsData.totalElements] },
          { values: [i18nString6(UIStrings6.maxDOMDepth), domStatsData.maxDepth?.depth ?? 0] },
          { values: [i18nString6(UIStrings6.maxChildren), domStatsData.maxChildren?.numChildren ?? 0] }
        ]
      }
    })}>
      </devtools-widget>
    </div>
    ${this.#renderNodeTable(domStatsData)}
    ${this.#renderLargeUpdatesTable()}
    `;
  }
};

// gen/front_end/panels/timeline/components/insights/DuplicatedJavaScript.js
var DuplicatedJavaScript_exports = {};
__export(DuplicatedJavaScript_exports, {
  DuplicatedJavaScript: () => DuplicatedJavaScript
});
import * as i18n10 from "./../../../../core/i18n/i18n.js";
import * as Trace6 from "./../../../../models/trace/trace.js";
import * as Buttons3 from "./../../../../ui/components/buttons/buttons.js";
import * as UI9 from "./../../../../ui/legacy/legacy.js";
import * as Lit11 from "./../../../../ui/lit/lit.js";
import * as VisualLogging2 from "./../../../../ui/visual_logging/visual_logging.js";
import * as Utils2 from "./../../utils/utils.js";

// gen/front_end/panels/timeline/components/insights/ScriptRef.js
import * as Platform from "./../../../../core/platform/platform.js";
import * as TimelineUtils from "./../../utils/utils.js";
function scriptRef(script) {
  if (script.request) {
    if (script.inline) {
      return eventRef(script.request, {
        text: `(inline) ${Platform.StringUtilities.trimEndWithMaxLength(script.content ?? "", 15)}`
      });
    }
    return eventRef(script.request);
  }
  if (script.url) {
    try {
      const parsedUrl = new URL(script.url);
      return TimelineUtils.Helpers.shortenUrl(parsedUrl);
    } catch {
    }
  }
  if (script.inline) {
    return `(inline) ${Platform.StringUtilities.trimEndWithMaxLength(script.content ?? "", 15)}`;
  }
  return `script id: ${script.scriptId}`;
}

// gen/front_end/panels/timeline/components/insights/DuplicatedJavaScript.js
var { UIStrings: UIStrings7, i18nString: i18nString7 } = Trace6.Insights.Models.DuplicatedJavaScript;
var { html: html11 } = Lit11;
var { widgetConfig: widgetConfig6 } = UI9.Widget;
var DuplicatedJavaScript = class extends BaseInsightComponent {
  internalName = "duplicated-javascript";
  #treemapData = null;
  #shouldShowTreemap() {
    if (!this.model) {
      return false;
    }
    return this.model.scripts.some((script) => !!script.url);
  }
  hasAskAiSupport() {
    return true;
  }
  #openTreemap() {
    if (!this.model) {
      return;
    }
    if (!this.#treemapData) {
      this.#treemapData = Utils2.Treemap.createTreemapData({ scripts: this.model.scripts }, this.model.duplication);
    }
    const windowNameSuffix = this.insightSetKey ?? "devtools";
    Utils2.Treemap.openTreemap(this.#treemapData, this.model.mainDocumentUrl, windowNameSuffix);
  }
  getEstimatedSavingsTime() {
    return this.model?.metricSavings?.FCP ?? null;
  }
  renderContent() {
    if (!this.model) {
      return Lit11.nothing;
    }
    const rows = [...this.model.duplicationGroupedByNodeModules.entries()].slice(0, 10).map(([source, data]) => {
      const scriptToOverlay = /* @__PURE__ */ new Map();
      for (const { script } of data.duplicates) {
        scriptToOverlay.set(script, {
          type: "ENTRY_OUTLINE",
          entry: script.request,
          outlineReason: "ERROR"
        });
      }
      return {
        values: [source, i18n10.ByteUtilities.bytesToString(data.estimatedDuplicateBytes)],
        overlays: [...scriptToOverlay.values()],
        subRows: data.duplicates.map(({ script, attributedSize }, index) => {
          let overlays;
          const overlay = scriptToOverlay.get(script);
          if (overlay) {
            overlays = [overlay];
          }
          return {
            values: [
              scriptRef(script),
              index === 0 ? "--" : i18n10.ByteUtilities.bytesToString(attributedSize)
            ],
            overlays
          };
        })
      };
    });
    let treemapButton;
    if (this.#shouldShowTreemap()) {
      treemapButton = html11`<devtools-button
        .variant=${"outlined"}
        jslog=${VisualLogging2.action(`timeline.treemap.${this.internalName}-insight`).track({
        click: true
      })}
        @click=${this.#openTreemap}
      >View Treemap</devtools-button>`;
    }
    return html11`
      ${treemapButton}
      <div class="insight-section">
        <devtools-widget .widgetConfig=${widgetConfig6(Table, {
      data: {
        insight: this,
        headers: [i18nString7(UIStrings7.columnSource), i18nString7(UIStrings7.columnDuplicatedBytes)],
        rows
      }
    })}>
        </devtools-widget>
      </div>
    `;
  }
};

// gen/front_end/panels/timeline/components/insights/FontDisplay.js
var FontDisplay_exports = {};
__export(FontDisplay_exports, {
  FontDisplay: () => FontDisplay
});
import * as i18n11 from "./../../../../core/i18n/i18n.js";
import * as Trace7 from "./../../../../models/trace/trace.js";
import * as UI10 from "./../../../../ui/legacy/legacy.js";
import * as Lit12 from "./../../../../ui/lit/lit.js";
var { UIStrings: UIStrings8, i18nString: i18nString8 } = Trace7.Insights.Models.FontDisplay;
var { html: html12 } = Lit12;
var { widgetConfig: widgetConfig7 } = UI10.Widget;
var FontDisplay = class extends BaseInsightComponent {
  internalName = "font-display";
  #overlayForRequest = /* @__PURE__ */ new Map();
  hasAskAiSupport() {
    return true;
  }
  createOverlays() {
    this.#overlayForRequest.clear();
    if (!this.model) {
      return [];
    }
    const overlays = this.model.createOverlays?.();
    if (!overlays) {
      return [];
    }
    for (const overlay of overlays.filter((overlay2) => overlay2.type === "ENTRY_OUTLINE")) {
      this.#overlayForRequest.set(overlay.entry, overlay);
    }
    return overlays;
  }
  mapToRow(font) {
    const overlay = this.#overlayForRequest.get(font.request);
    return {
      values: [
        eventRef(font.request, { text: font.name }),
        i18n11.TimeUtilities.millisToString(font.wastedTime)
      ],
      overlays: overlay ? [overlay] : []
    };
  }
  createAggregatedTableRow(remaining) {
    return {
      values: [renderOthersLabel(remaining.length), ""],
      overlays: remaining.map((r) => this.#overlayForRequest.get(r.request)).filter((o) => !!o)
    };
  }
  getEstimatedSavingsTime() {
    return this.model?.metricSavings?.FCP ?? null;
  }
  renderContent() {
    if (!this.model) {
      return Lit12.nothing;
    }
    const rows = createLimitedRows(this.model.fonts, this);
    return html12`
      <div class="insight-section">
        ${html12`<devtools-widget .widgetConfig=${widgetConfig7(Table, {
      data: {
        insight: this,
        headers: [i18nString8(UIStrings8.fontColumn), i18nString8(UIStrings8.wastedTimeColumn)],
        rows
      }
    })}>
        </devtools-widget>`}
      </div>`;
  }
};

// gen/front_end/panels/timeline/components/insights/ForcedReflow.js
var ForcedReflow_exports = {};
__export(ForcedReflow_exports, {
  ForcedReflow: () => ForcedReflow
});
import * as i18n12 from "./../../../../core/i18n/i18n.js";
import * as Platform2 from "./../../../../core/platform/platform.js";
import * as Trace8 from "./../../../../models/trace/trace.js";
import * as LegacyComponents2 from "./../../../../ui/legacy/components/utils/utils.js";
import * as UI11 from "./../../../../ui/legacy/legacy.js";
import * as Lit13 from "./../../../../ui/lit/lit.js";
var { UIStrings: UIStrings9, i18nString: i18nString9, createOverlayForEvents } = Trace8.Insights.Models.ForcedReflow;
var { html: html13, nothing: nothing10 } = Lit13;
var { widgetConfig: widgetConfig8 } = UI11.Widget;
var ForcedReflow = class extends BaseInsightComponent {
  internalName = "forced-reflow";
  hasAskAiSupport() {
    return true;
  }
  mapToRow(data) {
    return {
      values: [this.#linkifyUrl(data.bottomUpData)],
      overlays: createOverlayForEvents(data.relatedEvents)
    };
  }
  createAggregatedTableRow(remaining) {
    return {
      values: [renderOthersLabel(remaining.length)],
      overlays: remaining.flatMap((r) => createOverlayForEvents(r.relatedEvents))
    };
  }
  #linkifyUrl(callFrame) {
    const style = "display: flex; gap: 4px; overflow: hidden; white-space: nowrap";
    if (!callFrame) {
      return html13`<div style=${style}>${i18nString9(UIStrings9.unattributed)}</div>`;
    }
    const linkifier = new LegacyComponents2.Linkifier.Linkifier();
    const location = linkifier.linkifyScriptLocation(null, callFrame.scriptId, callFrame.url, callFrame.lineNumber, {
      columnNumber: callFrame.columnNumber,
      showColumnNumber: true,
      inlineFrameIndex: 0,
      tabStop: true
    });
    if (location instanceof HTMLElement) {
      location.style.maxWidth = "max-content";
      location.style.overflow = "hidden";
      location.style.textOverflow = "ellipsis";
      location.style.whiteSpace = "normal";
      location.style.verticalAlign = "top";
      location.style.textAlign = "left";
      location.style.flex = "1";
    }
    const functionName = callFrame.functionName || i18nString9(UIStrings9.anonymous);
    return html13`<div style=${style}>${functionName}<span> @ </span> ${location}</div>`;
  }
  renderContent() {
    if (!this.model) {
      return Lit13.nothing;
    }
    const topLevelFunctionCallData = this.model.topLevelFunctionCallData;
    const bottomUpCallStackData = this.model.aggregatedBottomUpData;
    const time = (us) => i18n12.TimeUtilities.millisToString(Platform2.Timing.microSecondsToMilliSeconds(us));
    const rows = createLimitedRows(bottomUpCallStackData, this);
    return html13`
      ${topLevelFunctionCallData ? html13`
        <div class="insight-section">
          <devtools-widget .widgetConfig=${widgetConfig8(Table, {
      data: {
        insight: this,
        headers: [i18nString9(UIStrings9.topTimeConsumingFunctionCall), i18nString9(UIStrings9.totalReflowTime)],
        rows: [{
          values: [
            this.#linkifyUrl(topLevelFunctionCallData.topLevelFunctionCall),
            time(Trace8.Types.Timing.Micro(topLevelFunctionCallData.totalReflowTime))
          ],
          overlays: createOverlayForEvents(topLevelFunctionCallData.topLevelFunctionCallEvents, "INFO")
        }]
      }
    })}>
          </devtools-widget>
        </div>
      ` : nothing10}
      <div class="insight-section">
        <devtools-widget .widgetConfig=${widgetConfig8(Table, {
      data: {
        insight: this,
        headers: [i18nString9(UIStrings9.reflowCallFrames)],
        rows
      }
    })}>
        </devtools-widget>
      </div>`;
  }
};

// gen/front_end/panels/timeline/components/insights/ImageDelivery.js
var ImageDelivery_exports = {};
__export(ImageDelivery_exports, {
  ImageDelivery: () => ImageDelivery
});
import "./../../../../ui/kit/kit.js";
import * as Trace9 from "./../../../../models/trace/trace.js";
import * as UI13 from "./../../../../ui/legacy/legacy.js";
import * as Lit15 from "./../../../../ui/lit/lit.js";

// gen/front_end/panels/timeline/components/insights/ImageRef.js
import * as i18n13 from "./../../../../core/i18n/i18n.js";
import * as SDK2 from "./../../../../core/sdk/sdk.js";
import * as UI12 from "./../../../../ui/legacy/legacy.js";
import * as Lit14 from "./../../../../ui/lit/lit.js";
var { html: html14 } = Lit14;
var { widgetConfig: widgetConfig9 } = UI12.Widget;
var DEFAULT_VIEW6 = (input, output, target) => {
  const { request, imageDataUrl } = input;
  const img = imageDataUrl ? html14`<img src=${imageDataUrl} class="element-img"/>` : Lit14.nothing;
  Lit14.render(html14`
    <style>${baseInsightComponent_css_default}</style>
    <div class="image-ref">
      ${img}
      <span class="element-img-details">
        ${eventRef(request)}
        <span class="element-img-details-size">${i18n13.ByteUtilities.bytesToString(request.args.data.decodedBodyLength ?? 0)}</span>
      </span>
    </div>
`, target);
};
var ImageRef = class extends UI12.Widget.Widget {
  #view;
  #request;
  #imageDataUrl;
  constructor(element, view = DEFAULT_VIEW6) {
    super(element, { useShadowDom: true });
    this.#view = view;
  }
  set request(request) {
    this.#request = request;
    this.#imageDataUrl = void 0;
    this.requestUpdate();
  }
  /**
   * This only returns a data url if the resource is currently present from the active
   * inspected page.
   */
  async #getOrCreateImageDataUrl() {
    if (!this.#request) {
      return null;
    }
    if (this.#imageDataUrl !== void 0) {
      return this.#imageDataUrl;
    }
    const originalUrl = this.#request.args.data.url;
    const resource = SDK2.ResourceTreeModel.ResourceTreeModel.resourceForURL(originalUrl);
    if (!resource) {
      this.#imageDataUrl = null;
      return this.#imageDataUrl;
    }
    const content = await resource.requestContentData();
    if ("error" in content) {
      this.#imageDataUrl = null;
      return this.#imageDataUrl;
    }
    this.#imageDataUrl = content.asDataUrl();
    return this.#imageDataUrl;
  }
  async performUpdate() {
    if (!this.#request) {
      return;
    }
    const input = {
      request: this.#request,
      imageDataUrl: await this.#getOrCreateImageDataUrl()
    };
    this.#view(input, void 0, this.contentElement);
  }
};
function imageRef(request) {
  return html14`<devtools-widget .widgetConfig=${widgetConfig9(ImageRef, {
    request
  })}></devtools-widget>`;
}

// gen/front_end/panels/timeline/components/insights/ImageDelivery.js
var { UIStrings: UIStrings10, i18nString: i18nString10, createOverlayForRequest: createOverlayForRequest2 } = Trace9.Insights.Models.ImageDelivery;
var { html: html15 } = Lit15;
var { widgetConfig: widgetConfig10 } = UI13.Widget;
var ImageDelivery = class extends BaseInsightComponent {
  internalName = "image-delivery";
  mapToRow(image) {
    return {
      values: [imageRef(image.request)],
      overlays: [createOverlayForRequest2(image.request)]
    };
  }
  hasAskAiSupport() {
    return true;
  }
  createAggregatedTableRow(remaining) {
    return {
      values: [renderOthersLabel(remaining.length)],
      overlays: remaining.map((r) => createOverlayForRequest2(r.request))
    };
  }
  renderContent() {
    if (!this.model) {
      return Lit15.nothing;
    }
    const optimizableImages = [...this.model.optimizableImages];
    const topImages = optimizableImages.sort((a, b) => b.request.args.data.decodedBodyLength - a.request.args.data.decodedBodyLength);
    const rows = createLimitedRows(topImages, this);
    if (!rows.length) {
      return html15`<div class="insight-section">${i18nString10(UIStrings10.noOptimizableImages)}</div>`;
    }
    return html15`
      <div class="insight-section">
        <devtools-widget .widgetConfig=${widgetConfig10(Table, {
      data: {
        insight: this,
        headers: [i18nString10(UIStrings10.optimizeFile)],
        rows
      }
    })}>
        </devtools-widget>
      </div>
    `;
  }
};

// gen/front_end/panels/timeline/components/insights/INPBreakdown.js
var INPBreakdown_exports = {};
__export(INPBreakdown_exports, {
  INPBreakdown: () => INPBreakdown
});
import * as i18n14 from "./../../../../core/i18n/i18n.js";
import * as Platform3 from "./../../../../core/platform/platform.js";
import * as Trace10 from "./../../../../models/trace/trace.js";
import * as UI14 from "./../../../../ui/legacy/legacy.js";
import * as Lit16 from "./../../../../ui/lit/lit.js";
var { UIStrings: UIStrings11, i18nString: i18nString11, createOverlaysForSubpart } = Trace10.Insights.Models.INPBreakdown;
var { html: html16 } = Lit16;
var { widgetConfig: widgetConfig11 } = UI14.Widget;
var INPBreakdown = class extends BaseInsightComponent {
  internalName = "inp";
  hasAskAiSupport() {
    return this.model?.longestInteractionEvent !== void 0;
  }
  renderContent() {
    const event = this.model?.longestInteractionEvent;
    if (!event) {
      return html16`<div class="insight-section">${i18nString11(UIStrings11.noInteractions)}</div>`;
    }
    const time = (us) => i18n14.TimeUtilities.millisToString(Platform3.Timing.microSecondsToMilliSeconds(us));
    return html16`
      <div class="insight-section">
        ${html16`<devtools-widget .widgetConfig=${widgetConfig11(Table, {
      data: {
        insight: this,
        headers: [i18nString11(UIStrings11.subpart), i18nString11(UIStrings11.duration)],
        rows: [
          {
            values: [i18nString11(UIStrings11.inputDelay), time(event.inputDelay)],
            overlays: createOverlaysForSubpart(event, 0)
          },
          {
            values: [i18nString11(UIStrings11.processingDuration), time(event.mainThreadHandling)],
            overlays: createOverlaysForSubpart(event, 1)
          },
          {
            values: [i18nString11(UIStrings11.presentationDelay), time(event.presentationDelay)],
            overlays: createOverlaysForSubpart(event, 2)
          }
        ]
      }
    })}>
        </devtools-widget>`}
      </div>`;
  }
};

// gen/front_end/panels/timeline/components/insights/InsightRenderer.js
var InsightRenderer_exports = {};
__export(InsightRenderer_exports, {
  InsightRenderer: () => InsightRenderer
});
import * as UI22 from "./../../../../ui/legacy/legacy.js";

// gen/front_end/panels/timeline/components/insights/LCPBreakdown.js
var LCPBreakdown_exports = {};
__export(LCPBreakdown_exports, {
  LCPBreakdown: () => LCPBreakdown
});
import * as i18n15 from "./../../../../core/i18n/i18n.js";
import * as Trace11 from "./../../../../models/trace/trace.js";
import * as UI15 from "./../../../../ui/legacy/legacy.js";
import * as Lit17 from "./../../../../ui/lit/lit.js";
var { UIStrings: UIStrings12, i18nString: i18nString12 } = Trace11.Insights.Models.LCPBreakdown;
var { html: html17 } = Lit17;
var { widgetConfig: widgetConfig12 } = UI15.Widget;
var LCPBreakdown = class extends BaseInsightComponent {
  internalName = "lcp-by-phase";
  #overlay = null;
  hasAskAiSupport() {
    return true;
  }
  createOverlays() {
    this.#overlay = null;
    if (!this.model || !this.model.subparts || !this.model.lcpTs) {
      return [];
    }
    const overlays = this.model.createOverlays?.();
    if (!overlays) {
      return [];
    }
    this.#overlay = overlays[0];
    return overlays;
  }
  #renderFieldSubparts() {
    if (!this.fieldMetrics) {
      return null;
    }
    const { ttfb, loadDelay, loadDuration, renderDelay } = this.fieldMetrics.lcpBreakdown;
    if (!ttfb || !loadDelay || !loadDuration || !renderDelay) {
      return null;
    }
    const ttfbMillis = i18n15.TimeUtilities.preciseMillisToString(Trace11.Helpers.Timing.microToMilli(ttfb.value));
    const loadDelayMillis = i18n15.TimeUtilities.preciseMillisToString(Trace11.Helpers.Timing.microToMilli(loadDelay.value));
    const loadDurationMillis = i18n15.TimeUtilities.preciseMillisToString(Trace11.Helpers.Timing.microToMilli(loadDuration.value));
    const renderDelayMillis = i18n15.TimeUtilities.preciseMillisToString(Trace11.Helpers.Timing.microToMilli(renderDelay.value));
    const rows = [
      { values: [i18nString12(UIStrings12.timeToFirstByte), ttfbMillis] },
      { values: [i18nString12(UIStrings12.resourceLoadDelay), loadDelayMillis] },
      { values: [i18nString12(UIStrings12.resourceLoadDuration), loadDurationMillis] },
      { values: [i18nString12(UIStrings12.elementRenderDelay), renderDelayMillis] }
    ];
    return html17`
      <div class="insight-section">
        <devtools-widget .widgetConfig=${widgetConfig12(Table, {
      data: {
        insight: this,
        headers: [i18nString12(UIStrings12.subpart), i18nString12(UIStrings12.fieldDuration)],
        rows
      }
    })}>
        </devtools-widget>
      </div>
    `;
  }
  toggleTemporaryOverlays(overlays, options) {
    super.toggleTemporaryOverlays(overlays, { ...options, updateTraceWindowPercentage: 0 });
  }
  getOverlayOptionsForInitialOverlays() {
    return { updateTraceWindow: true, updateTraceWindowPercentage: 0 };
  }
  renderContent() {
    if (!this.model) {
      return Lit17.nothing;
    }
    const { subparts } = this.model;
    if (!subparts) {
      return html17`<div class="insight-section">${i18nString12(UIStrings12.noLcp)}</div>`;
    }
    const rows = Object.values(subparts).map((subpart) => {
      const section = this.#overlay?.sections.find((section2) => subpart.label === section2.label);
      const timing = Trace11.Helpers.Timing.microToMilli(subpart.range);
      return {
        values: [subpart.label, i18n15.TimeUtilities.preciseMillisToString(timing)],
        overlays: section && [{
          type: "TIMESPAN_BREAKDOWN",
          sections: [section]
        }]
      };
    });
    const sections = [
      html17`
      <div class="insight-section">
        <devtools-widget .widgetConfig=${widgetConfig12(Table, {
        data: {
          insight: this,
          headers: [i18nString12(UIStrings12.subpart), i18nString12(UIStrings12.duration)],
          rows
        }
      })}>
        </devtools-widget>
      </div>`
    ];
    const fieldDataSection = this.#renderFieldSubparts();
    if (fieldDataSection) {
      sections.push(fieldDataSection);
    }
    return html17`${sections}`;
  }
};

// gen/front_end/panels/timeline/components/insights/LCPDiscovery.js
var LCPDiscovery_exports = {};
__export(LCPDiscovery_exports, {
  LCPDiscovery: () => LCPDiscovery
});
import * as i18n16 from "./../../../../core/i18n/i18n.js";
import * as Trace12 from "./../../../../models/trace/trace.js";
import * as uiI18n from "./../../../../ui/i18n/i18n.js";
import * as UI16 from "./../../../../ui/legacy/legacy.js";
import * as Lit18 from "./../../../../ui/lit/lit.js";
var { widgetConfig: widgetConfig13 } = UI16.Widget;
var { UIStrings: UIStrings13, i18nString: i18nString13, getImageData } = Trace12.Insights.Models.LCPDiscovery;
var { html: html18 } = Lit18;
var str_4 = i18n16.i18n.registerUIStrings("models/trace/insights/LCPDiscovery.ts", UIStrings13);
var LCPDiscovery = class extends BaseInsightComponent {
  internalName = "lcp-discovery";
  hasAskAiSupport() {
    return true;
  }
  createOverlays() {
    if (!this.model) {
      return [];
    }
    const overlays = this.model.createOverlays?.();
    if (!overlays) {
      return [];
    }
    const imageResults = getImageData(this.model);
    if (!imageResults?.discoveryDelay) {
      return [];
    }
    const timespanOverlaySection = overlays.find((overlay) => overlay.type === "TIMESPAN_BREAKDOWN")?.sections[0];
    if (timespanOverlaySection) {
      timespanOverlaySection.label = this.#renderDiscoveryDelay(imageResults.discoveryDelay);
    }
    return overlays;
  }
  getEstimatedSavingsTime() {
    if (!this.model) {
      return null;
    }
    return getImageData(this.model)?.estimatedSavings ?? null;
  }
  #renderDiscoveryDelay(delay) {
    const timeWrapper = document.createElement("span");
    timeWrapper.classList.add("discovery-time-ms");
    timeWrapper.innerText = i18n16.TimeUtilities.formatMicroSecondsAsMillisFixed(delay);
    return uiI18n.getFormatLocalizedString(str_4, UIStrings13.lcpLoadDelay, { PH1: timeWrapper });
  }
  renderContent() {
    if (!this.model) {
      return Lit18.nothing;
    }
    const imageData = getImageData(this.model);
    if (!imageData) {
      if (!this.model.lcpEvent) {
        return html18`<div class="insight-section">${i18nString13(UIStrings13.noLcp)}</div>`;
      }
      return html18`<div class="insight-section">${i18nString13(UIStrings13.noLcpResource)}</div>`;
    }
    let delayEl;
    if (imageData.discoveryDelay) {
      delayEl = html18`<div>${this.#renderDiscoveryDelay(imageData.discoveryDelay)}</div>`;
    }
    return html18`
      <div class="insight-section">
        <devtools-widget .widgetConfig=${widgetConfig13(Checklist, {
      checklist: imageData.checklist
    })}></devtools-widget>
        <div class="insight-section">${imageRef(imageData.request)}${delayEl}</div>
      </div>`;
  }
};

// gen/front_end/panels/timeline/components/insights/LegacyJavaScript.js
var LegacyJavaScript_exports = {};
__export(LegacyJavaScript_exports, {
  LegacyJavaScript: () => LegacyJavaScript
});
import * as Common from "./../../../../core/common/common.js";
import * as i18n18 from "./../../../../core/i18n/i18n.js";
import * as SDK3 from "./../../../../core/sdk/sdk.js";
import * as Bindings from "./../../../../models/bindings/bindings.js";
import * as Trace13 from "./../../../../models/trace/trace.js";
import * as UI17 from "./../../../../ui/legacy/legacy.js";
import * as Lit19 from "./../../../../ui/lit/lit.js";
var { UIStrings: UIStrings14, i18nString: i18nString14 } = Trace13.Insights.Models.LegacyJavaScript;
var { html: html19 } = Lit19;
var { widgetConfig: widgetConfig14 } = UI17.Widget;
var LegacyJavaScript = class extends BaseInsightComponent {
  internalName = "legacy-javascript";
  getEstimatedSavingsTime() {
    return this.model?.metricSavings?.FCP ?? null;
  }
  hasAskAiSupport() {
    return true;
  }
  async #revealLocation(script, match) {
    const target = SDK3.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!target) {
      return;
    }
    const debuggerModel = target.model(SDK3.DebuggerModel.DebuggerModel);
    if (!debuggerModel) {
      return;
    }
    const location = new SDK3.DebuggerModel.Location(debuggerModel, script.scriptId, match.line, match.column);
    if (!location) {
      return;
    }
    const uiLocation = await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().rawLocationToUILocation(location);
    await Common.Revealer.reveal(uiLocation);
  }
  renderContent() {
    if (!this.model) {
      return Lit19.nothing;
    }
    const rows = [...this.model.legacyJavaScriptResults.entries()].slice(0, 10).map(([script, result]) => {
      const overlays = [];
      if (script.request) {
        overlays.push({
          type: "ENTRY_OUTLINE",
          entry: script.request,
          outlineReason: "ERROR"
        });
      }
      return {
        values: [scriptRef(script), i18n18.ByteUtilities.bytesToString(result.estimatedByteSavings)],
        overlays,
        subRows: result.matches.map((match) => {
          return {
            values: [html19`<span @click=${() => this.#revealLocation(script, match)} title=${`${script.url}:${match.line}:${match.column}`}>${match.name}</span>`]
          };
        })
      };
    });
    return html19`
      <div class="insight-section">
        <devtools-widget .widgetConfig=${widgetConfig14(Table, {
      data: {
        insight: this,
        headers: [i18nString14(UIStrings14.columnScript), i18nString14(UIStrings14.columnWastedBytes)],
        rows
      }
    })}>
        </devtools-widget>
      </div>
    `;
  }
};

// gen/front_end/panels/timeline/components/insights/ModernHTTP.js
var ModernHTTP_exports = {};
__export(ModernHTTP_exports, {
  ModernHTTP: () => ModernHTTP
});
import * as Trace14 from "./../../../../models/trace/trace.js";
import * as UI18 from "./../../../../ui/legacy/legacy.js";
import * as Lit20 from "./../../../../ui/lit/lit.js";
var { UIStrings: UIStrings15, i18nString: i18nString15, createOverlayForRequest: createOverlayForRequest3 } = Trace14.Insights.Models.ModernHTTP;
var { html: html20 } = Lit20;
var { widgetConfig: widgetConfig15 } = UI18.Widget;
var ModernHTTP = class extends BaseInsightComponent {
  internalName = "modern-http";
  hasAskAiSupport() {
    return true;
  }
  getEstimatedSavingsTime() {
    return this.model?.metricSavings?.LCP ?? null;
  }
  createOverlays() {
    return this.model?.http1Requests.map((req) => createOverlayForRequest3(req)) ?? [];
  }
  mapToRow(req) {
    return { values: [eventRef(req), req.args.data.protocol], overlays: [createOverlayForRequest3(req)] };
  }
  createAggregatedTableRow(remaining) {
    return {
      values: [renderOthersLabel(remaining.length), ""],
      overlays: remaining.map((req) => createOverlayForRequest3(req))
    };
  }
  renderContent() {
    if (!this.model) {
      return Lit20.nothing;
    }
    const rows = createLimitedRows(this.model.http1Requests, this);
    if (!rows.length) {
      return html20`<div class="insight-section">${i18nString15(UIStrings15.noOldProtocolRequests)}</div>`;
    }
    return html20`
      <div class="insight-section">
        <devtools-widget .widgetConfig=${widgetConfig15(Table, {
      data: {
        insight: this,
        headers: [i18nString15(UIStrings15.request), i18nString15(UIStrings15.protocol)],
        rows
      }
    })}>
        </devtools-widget>
      </div>`;
  }
};

// gen/front_end/panels/timeline/components/insights/NetworkDependencyTree.js
var NetworkDependencyTree_exports = {};
__export(NetworkDependencyTree_exports, {
  MAX_CHAINS_TO_SHOW: () => MAX_CHAINS_TO_SHOW,
  NetworkDependencyTree: () => NetworkDependencyTree
});
import "./../../../../ui/kit/kit.js";
import * as i18n19 from "./../../../../core/i18n/i18n.js";
import * as Trace15 from "./../../../../models/trace/trace.js";
import * as UI19 from "./../../../../ui/legacy/legacy.js";
import * as Lit21 from "./../../../../ui/lit/lit.js";

// gen/front_end/panels/timeline/components/insights/networkDependencyTreeInsight.css.js
var networkDependencyTreeInsight_css_default = `/*
 * Copyright 2025 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.insight-body {
  --override-timeline-link-text-decoration: none;
  --override-timeline-link-text-color: var(--sys-color-on-surface);

  .max-time {
    text-align: center;

    .longest {
      color: var(--sys-color-error);
    }
  }

  .section-title{
    font: var(--sys-typescale-body4-bold);
    padding-bottom: var(--sys-size-2);
  }
}

/*# sourceURL=${import.meta.resolve("./networkDependencyTreeInsight.css")} */`;

// gen/front_end/panels/timeline/components/insights/NetworkDependencyTree.js
var { UIStrings: UIStrings16, i18nString: i18nString16 } = Trace15.Insights.Models.NetworkDependencyTree;
var { html: html21 } = Lit21;
var { widgetConfig: widgetConfig16 } = UI19.Widget;
var MAX_CHAINS_TO_SHOW = 5;
var NetworkDependencyTree = class extends BaseInsightComponent {
  internalName = "long-critical-network-tree";
  #relatedRequests = null;
  #countOfChains = 0;
  hasAskAiSupport() {
    return true;
  }
  #createOverlayForChain(requests) {
    const overlays = [];
    requests.forEach((entry) => overlays.push({
      type: "ENTRY_OUTLINE",
      entry,
      outlineReason: "ERROR"
    }));
    return overlays;
  }
  #renderNetworkTreeRow(node) {
    const requestStyles = Lit21.Directives.styleMap({
      display: "flex",
      "--override-timeline-link-text-color": node.isLongest ? "var(--sys-color-error)" : "",
      color: node.isLongest ? "var(--sys-color-error)" : "",
      backgroundColor: this.#relatedRequests?.has(node.request) ? "var(--sys-color-state-hover-on-subtle)" : ""
    });
    const urlStyles = Lit21.Directives.styleMap({
      flex: "auto"
    });
    return html21`
      <div style=${requestStyles}>
        <span style=${urlStyles}>${eventRef(node.request)}</span>
        <span>
          ${i18n19.TimeUtilities.formatMicroSecondsTime(Trace15.Types.Timing.Micro(node.timeFromInitialRequest))}
        </span>
      </div>
    `;
  }
  mapNetworkDependencyToRow(node) {
    if (this.#countOfChains >= MAX_CHAINS_TO_SHOW) {
      if (node.children.length === 0) {
        this.#countOfChains++;
      }
      return null;
    }
    if (node.children.length === 0) {
      this.#countOfChains++;
    }
    return {
      values: [this.#renderNetworkTreeRow(node)],
      overlays: this.#createOverlayForChain(node.relatedRequests),
      // Filter out the empty rows otherwise the `Table`component will render a super short row
      subRows: node.children.map((child) => this.mapNetworkDependencyToRow(child)).filter((row) => row !== null)
    };
  }
  #renderNetworkDependencyTree(nodes) {
    if (nodes.length === 0) {
      return null;
    }
    const rows = [{
      // Add one empty row so the main document request can also has a left border
      values: [],
      // Filter out the empty rows otherwise the `Table` component will render a super short row
      subRows: nodes.map((node) => this.mapNetworkDependencyToRow(node)).filter((row) => row !== null)
    }];
    if (this.#countOfChains > MAX_CHAINS_TO_SHOW) {
      rows.push({
        values: [renderOthersLabel(this.#countOfChains - MAX_CHAINS_TO_SHOW)]
      });
    }
    return html21`
      <devtools-widget .widgetConfig=${widgetConfig16(Table, {
      data: {
        insight: this,
        headers: [i18nString16(UIStrings16.columnRequest), i18nString16(UIStrings16.columnTime)],
        rows
      }
    })}>
      </devtools-widget>
    `;
  }
  #renderNetworkTreeSection() {
    if (!this.model) {
      return Lit21.nothing;
    }
    if (!this.model.rootNodes.length) {
      return html21`
        <style>${networkDependencyTreeInsight_css_default}</style>
        <div class="insight-section">${i18nString16(UIStrings16.noNetworkDependencyTree)}</div>
      `;
    }
    return html21`
      <style>${networkDependencyTreeInsight_css_default}</style>
      <div class="insight-section">
        <div class="max-time">
          ${i18nString16(UIStrings16.maxCriticalPathLatency)}
          <br>
          <span class='longest'> ${i18n19.TimeUtilities.formatMicroSecondsTime(this.model.maxTime)}</span>
        </div>
      </div>
      <div class="insight-section">
        ${this.#renderNetworkDependencyTree(this.model.rootNodes)}
      </div>
    `;
  }
  #renderTooManyPreconnectsWarning() {
    if (!this.model) {
      return Lit21.nothing;
    }
    if (this.model.preconnectedOrigins.length <= Trace15.Insights.Models.NetworkDependencyTree.TOO_MANY_PRECONNECTS_THRESHOLD) {
      return Lit21.nothing;
    }
    const warningStyles = Lit21.Directives.styleMap({
      backgroundColor: "var(--sys-color-surface-yellow)",
      padding: " var(--sys-size-5) var(--sys-size-8);",
      display: "flex"
    });
    return html21`
      <div style=${warningStyles}>
        ${md(i18nString16(UIStrings16.tooManyPreconnectLinksWarning))}
      </div>
    `;
  }
  #renderPreconnectOriginsTable() {
    if (!this.model) {
      return Lit21.nothing;
    }
    const preconnectOriginsTableTitle = html21`
      <style>${networkDependencyTreeInsight_css_default}</style>
      <div class='section-title'>${i18nString16(UIStrings16.preconnectOriginsTableTitle)}</div>
      <div class="insight-description">${md(i18nString16(UIStrings16.preconnectOriginsTableDescription))}</div>
    `;
    if (!this.model.preconnectedOrigins.length) {
      return html21`
        <div class="insight-section">
          ${preconnectOriginsTableTitle}
          ${i18nString16(UIStrings16.noPreconnectOrigins)}
        </div>
      `;
    }
    const rows = this.model.preconnectedOrigins.map((preconnectOrigin) => {
      const subRows = [];
      if (preconnectOrigin.unused) {
        subRows.push({
          values: [md(i18nString16(UIStrings16.unusedWarning))]
        });
      }
      if (preconnectOrigin.crossorigin) {
        subRows.push({
          values: [md(i18nString16(UIStrings16.crossoriginWarning))]
        });
      }
      if (preconnectOrigin.source === "ResponseHeader") {
        return {
          values: [preconnectOrigin.url, eventRef(preconnectOrigin.request, { text: preconnectOrigin.headerText })],
          subRows
        };
      }
      const nodeEl = nodeLink({
        backendNodeId: preconnectOrigin.node_id,
        frame: preconnectOrigin.frame,
        fallbackHtmlSnippet: `<link rel="preconnect" href="${preconnectOrigin.url}">`
      });
      return {
        values: [preconnectOrigin.url, nodeEl],
        subRows
      };
    });
    return html21`
      <div class="insight-section">
        ${preconnectOriginsTableTitle}
        ${this.#renderTooManyPreconnectsWarning()}
        <devtools-widget .widgetConfig=${widgetConfig16(Table, {
      data: {
        insight: this,
        headers: [i18nString16(UIStrings16.columnOrigin), i18nString16(UIStrings16.columnSource)],
        rows
      }
    })}>
        </devtools-widget>
      </div>
    `;
  }
  #renderEstSavingTable() {
    if (!this.model) {
      return Lit21.nothing;
    }
    const estSavingTableTitle = html21`
      <style>${networkDependencyTreeInsight_css_default}</style>
      <div class='section-title'>${i18nString16(UIStrings16.estSavingTableTitle)}</div>
      <div class="insight-description">${md(i18nString16(UIStrings16.estSavingTableDescription))}</div>
    `;
    if (!this.model.preconnectCandidates.length) {
      return html21`
        <div class="insight-section">
          ${estSavingTableTitle}
          ${i18nString16(UIStrings16.noPreconnectCandidates)}
        </div>
      `;
    }
    const rows = this.model.preconnectCandidates.map((candidate) => ({
      values: [candidate.origin, i18n19.TimeUtilities.millisToString(candidate.wastedMs)]
    }));
    return html21`
      <div class="insight-section">
        ${estSavingTableTitle}
        <devtools-widget .widgetConfig=${widgetConfig16(Table, {
      data: {
        insight: this,
        headers: [i18nString16(UIStrings16.columnOrigin), i18nString16(UIStrings16.columnWastedMs)],
        rows
      }
    })}>
        </devtools-widget>
      </div>
    `;
  }
  renderContent() {
    return html21`
      ${this.#renderNetworkTreeSection()}
      ${this.#renderPreconnectOriginsTable()}
      ${this.#renderEstSavingTable()}
    `;
  }
};

// gen/front_end/panels/timeline/components/insights/RenderBlocking.js
var RenderBlocking_exports = {};
__export(RenderBlocking_exports, {
  RenderBlocking: () => RenderBlocking
});
import * as i18n20 from "./../../../../core/i18n/i18n.js";
import * as Trace16 from "./../../../../models/trace/trace.js";
import * as Lit22 from "./../../../../ui/lit/lit.js";
var { UIStrings: UIStrings17, i18nString: i18nString17, createOverlayForRequest: createOverlayForRequest4 } = Trace16.Insights.Models.RenderBlocking;
var { html: html22 } = Lit22;
var RenderBlocking = class extends BaseInsightComponent {
  internalName = "render-blocking-requests";
  mapToRow(request) {
    return {
      values: [
        eventRef(request),
        i18n20.TimeUtilities.formatMicroSecondsTime(request.dur)
      ],
      overlays: [createOverlayForRequest4(request)]
    };
  }
  createAggregatedTableRow(remaining) {
    return {
      values: [renderOthersLabel(remaining.length), ""],
      overlays: remaining.map((r) => createOverlayForRequest4(r))
    };
  }
  hasAskAiSupport() {
    return !!this.model;
  }
  getEstimatedSavingsTime() {
    return this.model?.metricSavings?.FCP ?? null;
  }
  renderContent() {
    if (!this.model) {
      return Lit22.nothing;
    }
    const requests = this.model.renderBlockingRequests;
    if (!requests.length) {
      return html22`<div class="insight-section">${i18nString17(UIStrings17.noRenderBlocking)}</div>`;
    }
    const rows = createLimitedRows(requests, this);
    return html22`
      <div class="insight-section">
        <devtools-widget
          .data=${{
      insight: this,
      headers: [i18nString17(UIStrings17.renderBlockingRequest), i18nString17(UIStrings17.duration)],
      rows
    }}>
        </devtools-widget>
      </div>
    `;
  }
};

// gen/front_end/panels/timeline/components/insights/SlowCSSSelector.js
var SlowCSSSelector_exports = {};
__export(SlowCSSSelector_exports, {
  SlowCSSSelector: () => SlowCSSSelector
});
import "./../../../../ui/components/linkifier/linkifier.js";
import * as i18n21 from "./../../../../core/i18n/i18n.js";
import * as Platform4 from "./../../../../core/platform/platform.js";
import * as SDK4 from "./../../../../core/sdk/sdk.js";
import * as Trace17 from "./../../../../models/trace/trace.js";
import * as UI20 from "./../../../../ui/legacy/legacy.js";
import * as Lit23 from "./../../../../ui/lit/lit.js";
var { UIStrings: UIStrings18, i18nString: i18nString18 } = Trace17.Insights.Models.SlowCSSSelector;
var { html: html23 } = Lit23;
var { widgetConfig: widgetConfig17 } = UI20.Widget;
var SlowCSSSelector = class extends BaseInsightComponent {
  internalName = "slow-css-selector";
  #selectorLocations = /* @__PURE__ */ new Map();
  hasAskAiSupport() {
    return true;
  }
  async toSourceFileLocation(cssModel, selector) {
    if (!cssModel) {
      return void 0;
    }
    const styleSheetHeader = cssModel.styleSheetHeaderForId(selector.style_sheet_id);
    if (!styleSheetHeader?.resourceURL()) {
      return void 0;
    }
    const key = JSON.stringify({ selectorText: selector.selector, styleSheetId: selector.style_sheet_id });
    let ranges = this.#selectorLocations.get(key);
    if (!ranges) {
      const result = await cssModel.agent.invoke_getLocationForSelector({ selectorText: selector.selector, styleSheetId: selector.style_sheet_id });
      if (result.getError() || !result.ranges) {
        return void 0;
      }
      ranges = result.ranges;
      this.#selectorLocations.set(key, ranges);
    }
    const locations = ranges.map((range, itemIndex) => {
      return {
        url: styleSheetHeader.resourceURL(),
        lineNumber: range.startLine,
        columnNumber: range.startColumn,
        linkText: `[${itemIndex + 1}]`,
        title: `${styleSheetHeader.id} line ${range.startLine + 1}:${range.startColumn + 1}`
      };
    });
    return locations;
  }
  async getSelectorLinks(cssModel, selector) {
    if (!cssModel) {
      return Lit23.nothing;
    }
    if (!selector.style_sheet_id) {
      return Lit23.nothing;
    }
    const locations = await this.toSourceFileLocation(cssModel, selector);
    if (!locations) {
      return Lit23.nothing;
    }
    const links = html23`
    ${locations.map((location, itemIndex) => {
      const divider = itemIndex !== locations.length - 1 ? ", " : "";
      return html23`<devtools-linkifier .data=${location}></devtools-linkifier>${divider}`;
    })}`;
    return links;
  }
  renderContent() {
    if (!this.model) {
      return Lit23.nothing;
    }
    const target = SDK4.TargetManager.TargetManager.instance().primaryPageTarget();
    const cssModel = target?.model(SDK4.CSSModel.CSSModel);
    const time = (us) => i18n21.TimeUtilities.millisToString(Platform4.Timing.microSecondsToMilliSeconds(us));
    if (!this.model.topSelectorMatchAttempts && !this.model.topSelectorElapsedMs) {
      return html23`<div class="insight-section">${i18nString18(UIStrings18.enableSelectorData)}</div>`;
    }
    const sections = [html23`
      <div class="insight-section">
        <devtools-widget .widgetConfig=${widgetConfig17(Table, {
      data: {
        insight: this,
        headers: [i18nString18(UIStrings18.total), ""],
        rows: [
          { values: [i18nString18(UIStrings18.matchAttempts), this.model.totalMatchAttempts] },
          { values: [i18nString18(UIStrings18.matchCount), this.model.totalMatchCount] },
          { values: [i18nString18(UIStrings18.elapsed), i18n21.TimeUtilities.millisToString(this.model.totalElapsedMs)] }
        ]
      }
    })}>
        </devtools-widget>
      </div>
    `];
    if (this.model.topSelectorElapsedMs) {
      const selector = this.model.topSelectorElapsedMs;
      sections.push(html23`
        <div class="insight-section">
          <devtools-widget .widgetConfig=${widgetConfig17(Table, {
        data: {
          insight: this,
          headers: [`${i18nString18(UIStrings18.topSelectorElapsedTime)}: ${time(Trace17.Types.Timing.Micro(selector["elapsed (us)"]))}`],
          rows: [{
            values: [html23`${selector.selector} ${Lit23.Directives.until(this.getSelectorLinks(cssModel, selector))}`]
          }]
        }
      })}>
          </devtools-widget>
        </div>
      `);
    }
    if (this.model.topSelectorMatchAttempts) {
      const selector = this.model.topSelectorMatchAttempts;
      sections.push(html23`
        <div class="insight-section">
          <devtools-widget .widgetConfig=${widgetConfig17(Table, {
        data: {
          insight: this,
          headers: [`${i18nString18(UIStrings18.topSelectorMatchAttempt)}: ${selector["match_attempts"]}`],
          rows: [{
            values: [html23`${selector.selector} ${Lit23.Directives.until(this.getSelectorLinks(cssModel, selector))}`]
          }]
        }
      })}>
          </devtools-widget>
        </div>
      `);
    }
    return html23`${sections}`;
  }
};

// gen/front_end/panels/timeline/components/insights/ThirdParties.js
var ThirdParties_exports = {};
__export(ThirdParties_exports, {
  ThirdParties: () => ThirdParties
});
import * as i18n22 from "./../../../../core/i18n/i18n.js";
import * as Trace18 from "./../../../../models/trace/trace.js";
import * as UI21 from "./../../../../ui/legacy/legacy.js";
import * as Lit24 from "./../../../../ui/lit/lit.js";
var { UIStrings: UIStrings19, i18nString: i18nString19, createOverlaysForSummary } = Trace18.Insights.Models.ThirdParties;
var { html: html24 } = Lit24;
var { widgetConfig: widgetConfig18 } = UI21.Widget;
var MAX_TO_SHOW = 5;
var ThirdParties = class extends BaseInsightComponent {
  internalName = "third-parties";
  #mainThreadTimeAggregator = {
    mapToRow: (summary) => ({
      values: [summary.entity.name, i18n22.TimeUtilities.millisToString(summary.mainThreadTime)],
      overlays: createOverlaysForSummary(summary)
    }),
    createAggregatedTableRow: (remaining) => {
      const totalMainThreadTime = remaining.reduce((acc, summary) => acc + summary.mainThreadTime, 0);
      return {
        values: [renderOthersLabel(remaining.length), i18n22.TimeUtilities.millisToString(totalMainThreadTime)],
        overlays: remaining.flatMap((summary) => createOverlaysForSummary(summary) ?? [])
      };
    }
  };
  #transferSizeAggregator = {
    mapToRow: (summary) => ({
      values: [summary.entity.name, i18n22.ByteUtilities.formatBytesToKb(summary.transferSize)],
      overlays: createOverlaysForSummary(summary)
    }),
    createAggregatedTableRow: (remaining) => {
      const totalBytes = remaining.reduce((acc, summary) => acc + summary.transferSize, 0);
      return {
        values: [renderOthersLabel(remaining.length), i18n22.ByteUtilities.formatBytesToKb(totalBytes)],
        overlays: remaining.flatMap((summary) => createOverlaysForSummary(summary) ?? [])
      };
    }
  };
  hasAskAiSupport() {
    return true;
  }
  renderContent() {
    if (!this.model) {
      return Lit24.nothing;
    }
    let result = this.model.entitySummaries ?? [];
    if (this.model.firstPartyEntity) {
      result = result.filter((s) => s.entity !== this.model?.firstPartyEntity || null);
    }
    if (!result.length) {
      return html24`<div class="insight-section">${i18nString19(UIStrings19.noThirdParties)}</div>`;
    }
    const topTransferSizeEntries = result.toSorted((a, b) => b.transferSize - a.transferSize);
    const topMainThreadTimeEntries = result.toSorted((a, b) => b.mainThreadTime - a.mainThreadTime);
    const sections = [];
    if (topTransferSizeEntries.length) {
      const rows = createLimitedRows(topTransferSizeEntries, this.#transferSizeAggregator, MAX_TO_SHOW);
      sections.push(html24`
        <div class="insight-section">
          <devtools-widget .widgetConfig=${widgetConfig18(Table, {
        data: {
          insight: this,
          headers: [i18nString19(UIStrings19.columnThirdParty), i18nString19(UIStrings19.columnTransferSize)],
          rows
        }
      })}>
          </devtools-widget>
        </div>
      `);
    }
    if (topMainThreadTimeEntries.length) {
      const rows = createLimitedRows(topMainThreadTimeEntries, this.#mainThreadTimeAggregator, MAX_TO_SHOW);
      sections.push(html24`
        <div class="insight-section">
          <devtools-widget .widgetConfig=${widgetConfig18(Table, {
        data: {
          insight: this,
          headers: [i18nString19(UIStrings19.columnThirdParty), i18nString19(UIStrings19.columnMainThreadTime)],
          rows
        }
      })}>
          </devtools-widget>
        </div>
      `);
    }
    return html24`${sections}`;
  }
};

// gen/front_end/panels/timeline/components/insights/Viewport.js
var Viewport_exports = {};
__export(Viewport_exports, {
  Viewport: () => Viewport
});
import * as Lit25 from "./../../../../ui/lit/lit.js";
var { html: html25 } = Lit25;
var Viewport = class extends BaseInsightComponent {
  internalName = "viewport";
  hasAskAiSupport() {
    return true;
  }
  getEstimatedSavingsTime() {
    return this.model?.metricSavings?.INP ?? null;
  }
  renderContent() {
    if (!this.model || !this.model.viewportEvent) {
      return Lit25.nothing;
    }
    const backendNodeId = this.model.viewportEvent.args.data.node_id;
    if (backendNodeId === void 0) {
      return Lit25.nothing;
    }
    return html25`
      <div>
        ${nodeLink({
      backendNodeId,
      frame: this.model.viewportEvent.args.data.frame ?? "",
      options: { tooltip: this.model.viewportEvent.args.data.content },
      fallbackHtmlSnippet: `<meta name=viewport content="${this.model.viewportEvent.args.data.content}">`
    })}
      </div>`;
  }
};

// gen/front_end/panels/timeline/components/insights/InsightRenderer.js
var { widgetConfig: widgetConfig19 } = UI22.Widget;
var INSIGHT_NAME_TO_COMPONENT = {
  Cache,
  CLSCulprits,
  DocumentLatency,
  DOMSize,
  DuplicatedJavaScript,
  FontDisplay,
  ForcedReflow,
  ImageDelivery,
  INPBreakdown,
  LCPDiscovery,
  LCPBreakdown,
  LegacyJavaScript,
  ModernHTTP,
  NetworkDependencyTree,
  RenderBlocking,
  SlowCSSSelector,
  ThirdParties,
  Viewport
};
var InsightRenderer = class {
  #insightWidgetCache = /* @__PURE__ */ new WeakMap();
  renderInsightToWidgetElement(parsedTrace, insightSet, model, insightName, options) {
    let widgetElement = this.#insightWidgetCache.get(model);
    if (!widgetElement) {
      widgetElement = document.createElement("devtools-widget");
      widgetElement.classList.add("insight-component-widget");
      this.#insightWidgetCache.set(model, widgetElement);
    }
    const componentClass = INSIGHT_NAME_TO_COMPONENT[insightName];
    widgetElement.widgetConfig = widgetConfig19(componentClass, {
      selected: options.selected ?? false,
      parsedTrace,
      // The `model` passed in as a parameter is the base type, but since
      // `componentClass` is the union of every derived insight component, the
      // `model` for the widget config is the union of every model. That can't be
      // satisfied, so disable typescript.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model,
      bounds: insightSet.bounds,
      insightSetKey: insightSet.id,
      agentFocus: options.agentFocus ?? null,
      fieldMetrics: options.fieldMetrics ?? null,
      isAIAssistanceContext: options.isAIAssistanceContext ?? false
    });
    return widgetElement;
  }
};

// gen/front_end/panels/timeline/components/insights/types.js
var types_exports = {};
export {
  BaseInsightComponent_exports as BaseInsightComponent,
  CLSCulprits_exports as CLSCulprits,
  Cache_exports as Cache,
  Checklist_exports as Checklist,
  DOMSize_exports as DOMSize,
  DocumentLatency_exports as DocumentLatency,
  DuplicatedJavaScript_exports as DuplicatedJavaScript,
  EventRef_exports as EventRef,
  FontDisplay_exports as FontDisplay,
  ForcedReflow_exports as ForcedReflow,
  Helpers_exports as Helpers,
  INPBreakdown_exports as INPBreakdown,
  ImageDelivery_exports as ImageDelivery,
  InsightRenderer_exports as InsightRenderer,
  LCPBreakdown_exports as LCPBreakdown,
  LCPDiscovery_exports as LCPDiscovery,
  LegacyJavaScript_exports as LegacyJavaScript,
  ModernHTTP_exports as ModernHTTP,
  NetworkDependencyTree_exports as NetworkDependencyTree,
  NodeLink_exports as NodeLink,
  RenderBlocking_exports as RenderBlocking,
  SidebarInsight_exports as SidebarInsight,
  SlowCSSSelector_exports as SlowCSSSelector,
  Table_exports as Table,
  ThirdParties_exports as ThirdParties,
  types_exports as Types,
  Viewport_exports as Viewport
};
//# sourceMappingURL=insights.js.map
