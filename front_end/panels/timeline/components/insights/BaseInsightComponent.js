// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../../../ui/components/markdown_view/markdown_view.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Root from '../../../../core/root/root.js';
import * as AIAssistance from '../../../../models/ai_assistance/ai_assistance.js';
import * as Badges from '../../../../models/badges/badges.js';
import * as Buttons from '../../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../../ui/components/helpers/helpers.js';
import * as UI from '../../../../ui/legacy/legacy.js';
import * as Lit from '../../../../ui/lit/lit.js';
import * as VisualLogging from '../../../../ui/visual_logging/visual_logging.js';
import baseInsightComponentStyles from './baseInsightComponent.css.js';
import { md } from './Helpers.js';
import * as SidebarInsight from './SidebarInsight.js';
const { html } = Lit;
const UIStrings = {
    /**
     * @description Text to tell the user the estimated time or size savings for this insight. "&" means "and" - space is limited to prefer abbreviated terms if possible. Text will still fit if not short, it just won't look very good, so using no abbreviations is fine if necessary.
     * @example {401 ms} PH1
     * @example {112 kB} PH1
     */
    estimatedSavings: 'Est savings: {PH1}',
    /**
     * @description Text to tell the user the estimated time and size savings for this insight. "&" means "and", "Est" means "Estimated" - space is limited to prefer abbreviated terms if possible. Text will still fit if not short, it just won't look very good, so using no abbreviations is fine if necessary.
     * @example {401 ms} PH1
     * @example {112 kB} PH2
     */
    estimatedSavingsTimingAndBytes: 'Est savings: {PH1} & {PH2}',
    /**
     * @description Text to tell the user the estimated time savings for this insight that is used for screen readers.
     * @example {401 ms} PH1
     * @example {112 kB} PH1
     */
    estimatedSavingsAriaTiming: 'Estimated savings for this insight: {PH1}',
    /**
     * @description Text to tell the user the estimated size savings for this insight that is used for screen readers. Value is in terms of "transfer size", aka encoded/compressed data length.
     * @example {401 ms} PH1
     * @example {112 kB} PH1
     */
    estimatedSavingsAriaBytes: 'Estimated savings for this insight: {PH1} transfer size',
    /**
     * @description Text to tell the user the estimated time and size savings for this insight that is used for screen readers.
     * @example {401 ms} PH1
     * @example {112 kB} PH2
     */
    estimatedSavingsTimingAndBytesAria: 'Estimated savings for this insight: {PH1} and {PH2} transfer size',
    /**
     * @description Used for screen-readers as a label on the button to expand an insight to view details
     * @example {LCP breakdown} PH1
     */
    viewDetails: 'View details for {PH1} insight.',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/insights/BaseInsightComponent.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class BaseInsightComponent extends HTMLElement {
    // So we can use the TypeScript BaseInsight class without getting warnings
    // about litTagName. Every child should overwrite this.
    static litTagName = Lit.StaticHtml.literal ``;
    shadow = this.attachShadow({ mode: 'open' });
    // This flag tracks if the Insights AI feature is enabled within Chrome for
    // the active user.
    #askAiEnabled = false;
    // Tracks if this component is rendered withing the AI assistance panel.
    // Currently only relevant to GreenDev.
    #isAIAssistanceContext = false;
    #selected = false;
    #model = null;
    #agentFocus = null;
    #fieldMetrics = null;
    #parsedTrace = null;
    get model() {
        return this.#model;
    }
    data = {
        bounds: null,
        insightSetKey: null,
    };
    sharedTableState = {
        selectedRowEl: null,
        selectionIsSticky: false,
    };
    #initialOverlays = null;
    scheduleRender() {
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    // Insights that do support the AI feature can override this to return true.
    // The "Ask AI" button will only be shown for an Insight if this
    // is true and if the feature has been enabled by the user and they meet the
    // requirements to use AI.
    hasAskAiSupport() {
        return false;
    }
    connectedCallback() {
        this.setAttribute('jslog', `${VisualLogging.section(`timeline.insights.${this.internalName}`)}`);
        // Used for unit test purposes when querying the DOM.
        this.dataset.insightName = this.internalName;
        const { devToolsAiAssistancePerformanceAgent } = Root.Runtime.hostConfig;
        this.#askAiEnabled = Boolean(devToolsAiAssistancePerformanceAgent?.enabled);
    }
    set isAIAssistanceContext(isAIAssistanceContext) {
        this.#isAIAssistanceContext = isAIAssistanceContext;
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    set selected(selected) {
        if (!this.#selected && selected) {
            const options = this.getOverlayOptionsForInitialOverlays();
            this.dispatchEvent(new SidebarInsight.InsightProvideOverlays(this.getInitialOverlays(), options));
        }
        this.#selected = selected;
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    get selected() {
        return this.#selected;
    }
    set parsedTrace(trace) {
        this.#parsedTrace = trace;
    }
    set model(model) {
        this.#model = model;
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    set insightSetKey(insightSetKey) {
        this.data.insightSetKey = insightSetKey;
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    get bounds() {
        return this.data.bounds;
    }
    set bounds(bounds) {
        this.data.bounds = bounds;
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
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
        if (!this.data.insightSetKey || !this.model) {
            // Shouldn't happen, but needed to satisfy TS.
            return;
        }
        if (this.#parsedTrace && UI.Floaty.enabled()) {
            const floatyHandled = UI.Floaty.onFloatyClick({
                type: "PERFORMANCE_INSIGHT" /* UI.Floaty.FloatyContextTypes.PERFORMANCE_INSIGHT */,
                data: {
                    insight: this.model,
                    trace: this.#parsedTrace,
                }
            });
            if (floatyHandled) {
                return;
            }
        }
        const focus = UI.Context.Context.instance().flavor(AIAssistance.AIContext.AgentFocus);
        if (this.#selected) {
            this.dispatchEvent(new SidebarInsight.InsightDeactivated());
            // Clear agent (but only if currently focused on an insight).
            if (focus) {
                UI.Context.Context.instance().setFlavor(AIAssistance.AIContext.AgentFocus, focus.withInsight(null));
            }
            return;
        }
        if (focus) {
            UI.Context.Context.instance().setFlavor(AIAssistance.AIContext.AgentFocus, focus.withInsight(this.model));
        }
        Badges.UserBadges.instance().recordAction(Badges.BadgeAction.PERFORMANCE_INSIGHT_CLICKED);
        this.sharedTableState.selectedRowEl?.classList.remove('selected');
        this.sharedTableState.selectedRowEl = null;
        this.sharedTableState.selectionIsSticky = false;
        this.dispatchEvent(new SidebarInsight.InsightActivated(this.model, this.data.insightSetKey));
    }
    #renderHoverIcon(insightIsActive) {
        if (this.#isAIAssistanceContext) {
            return Lit.nothing;
        }
        // clang-format off
        const containerClasses = Lit.Directives.classMap({
            'insight-hover-icon': true,
            active: insightIsActive,
        });
        return html `
      <div class=${containerClasses} inert>
        <devtools-button .data=${{
            variant: "icon" /* Buttons.Button.Variant.ICON */,
            iconName: 'chevron-down',
            size: "SMALL" /* Buttons.Button.Size.SMALL */,
        }}
      ></devtools-button>
      </div>

    `;
        // clang-format on
    }
    /**
     * Ensure that if the user presses enter or space on a header, we treat it
     * like a click and toggle the insight.
     */
    #handleHeaderKeyDown(event) {
        if (event.key === 'Enter' || event.key === ' ') {
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
            this.dispatchEvent(new SidebarInsight.InsightProvideOverlays(this.getInitialOverlays(), this.getOverlayOptionsForInitialOverlays()));
            return;
        }
        this.dispatchEvent(new SidebarInsight.InsightProvideOverlays(overlays, options));
    }
    getInitialOverlays() {
        if (this.#initialOverlays) {
            return this.#initialOverlays;
        }
        this.#initialOverlays = this.createOverlays();
        return this.#initialOverlays;
    }
    createOverlays() {
        return this.model?.createOverlays?.() ?? [];
    }
    #render() {
        if (!this.model) {
            return;
        }
        this.#renderWithContent();
    }
    getEstimatedSavingsTime() {
        return null;
    }
    getEstimatedSavingsBytes() {
        return this.model?.wastedBytes ?? null;
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
            bytesString,
        };
    }
    #getEstimatedSavingsAriaLabel() {
        const { bytesString, timeString } = this.#getEstimatedSavingsTextParts();
        if (timeString && bytesString) {
            return i18nString(UIStrings.estimatedSavingsTimingAndBytesAria, {
                PH1: timeString,
                PH2: bytesString,
            });
        }
        if (timeString) {
            return i18nString(UIStrings.estimatedSavingsAriaTiming, {
                PH1: timeString,
            });
        }
        if (bytesString) {
            return i18nString(UIStrings.estimatedSavingsAriaBytes, {
                PH1: bytesString,
            });
        }
        return null;
    }
    #getEstimatedSavingsString() {
        const { bytesString, timeString } = this.#getEstimatedSavingsTextParts();
        if (timeString && bytesString) {
            return i18nString(UIStrings.estimatedSavingsTimingAndBytes, {
                PH1: timeString,
                PH2: bytesString,
            });
        }
        if (timeString) {
            return i18nString(UIStrings.estimatedSavings, {
                PH1: timeString,
            });
        }
        if (bytesString) {
            return i18nString(UIStrings.estimatedSavings, {
                PH1: bytesString,
            });
        }
        return null;
    }
    #askAIButtonClick() {
        if (!this.#agentFocus) {
            return;
        }
        // matches the one in ai_assistance-meta.ts
        const actionId = 'drjones.performance-panel-context';
        if (!UI.ActionRegistry.ActionRegistry.instance().hasAction(actionId)) {
            return;
        }
        let focus = UI.Context.Context.instance().flavor(AIAssistance.AIContext.AgentFocus);
        if (focus) {
            focus = focus.withInsight(this.model);
        }
        else {
            focus = this.#agentFocus;
        }
        UI.Context.Context.instance().setFlavor(AIAssistance.AIContext.AgentFocus, focus);
        // Trigger the AI Assistance panel to open.
        const action = UI.ActionRegistry.ActionRegistry.instance().getAction(actionId);
        void action.execute();
    }
    #canShowAskAI() {
        if (this.#isAIAssistanceContext) {
            return false;
        }
        const aiAvailable = Root.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue !==
            Root.Runtime.GenAiEnterprisePolicyValue.DISABLE &&
            this.#askAiEnabled && Root.Runtime.hostConfig.aidaAvailability?.enabled === true;
        return aiAvailable && this.hasAskAiSupport();
    }
    #renderInsightContent(insightModel) {
        if (!this.#selected) {
            return Lit.nothing;
        }
        const aiLabel = 'Debug with AI';
        const ariaLabel = `Ask AI about ${insightModel.title} insight`;
        // Only render the insight body content if it is selected.
        // To avoid re-rendering triggered from elsewhere.
        const content = this.renderContent();
        // clang-format off
        return html `
      <div class="insight-body">
        <div class="insight-description">${md(insightModel.description)}</div>
        <div class="insight-content">${content}</div>
        ${this.#canShowAskAI() ? html `
          <div class="ask-ai-btn-wrap">
            <devtools-button class="ask-ai"
              .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
              .iconName=${'smart-assistant'}
              data-insights-ask-ai
              jslog=${VisualLogging.action(`timeline.insight-ask-ai.${this.internalName}`).track({ click: true })}
              @click=${this.#askAIButtonClick}
              aria-label=${ariaLabel}
            >${aiLabel}</devtools-button>
          </div>
        ` : Lit.nothing}
      </div>`;
        // clang-format on
    }
    #renderWithContent() {
        if (!this.#model) {
            Lit.render(Lit.nothing, this.shadow, { host: this });
            return;
        }
        const containerClasses = Lit.Directives.classMap({
            insight: true,
            closed: !this.#selected || this.#isAIAssistanceContext,
            'ai-assistance-context': this.#isAIAssistanceContext,
        });
        const estimatedSavingsString = this.#getEstimatedSavingsString();
        const estimatedSavingsAriaLabel = this.#getEstimatedSavingsAriaLabel();
        let ariaLabel = `${i18nString(UIStrings.viewDetails, { PH1: this.#model.title })}`;
        if (estimatedSavingsAriaLabel) {
            // space prefix is deliberate to add a gap after the view details text
            ariaLabel += ` ${estimatedSavingsAriaLabel}`;
        }
        // clang-format off
        const output = html `
      <style>${baseInsightComponentStyles}</style>
      <div class=${containerClasses}>
        <header @click=${this.#dispatchInsightToggle}
          @keydown=${this.#handleHeaderKeyDown}
          jslog=${VisualLogging.action(`timeline.toggle-insight.${this.internalName}`).track({ click: true })}
          data-insight-header-title=${this.#model?.title}
          tabIndex="0"
          role="button"
          aria-expanded=${this.#selected}
          aria-label=${ariaLabel}
        >
          ${this.#renderHoverIcon(this.#selected)}
          <h3 class="insight-title">${this.#model?.title}</h3>
          ${estimatedSavingsString ?
            html `
            <slot name="insight-savings" class="insight-savings">
              <span title=${estimatedSavingsAriaLabel ?? ''}>${estimatedSavingsString}</span>
            </slot>
          </div>`
            : Lit.nothing}
        </header>
        ${this.#renderInsightContent(this.#model)}
      </div>
    `;
        // clang-format on
        Lit.render(output, this.shadow, { host: this });
        if (this.#selected) {
            requestAnimationFrame(() => requestAnimationFrame(() => this.scrollIntoViewIfNeeded()));
        }
    }
}
//# sourceMappingURL=BaseInsightComponent.js.map