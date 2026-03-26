// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../ui/components/markdown_view/markdown_view.js';
import '../../../ui/kit/kit.js';
import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Root from '../../../core/root/root.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as AiAssistanceModel from '../../../models/ai_assistance/ai_assistance.js';
import * as ComputedStyle from '../../../models/computed_style/computed_style.js';
import * as Trace from '../../../models/trace/trace.js';
import * as PanelsCommon from '../../../panels/common/common.js';
import * as Marked from '../../../third_party/marked/marked.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Input from '../../../ui/components/input/input.js';
import * as UIHelpers from '../../../ui/helpers/helpers.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import * as Elements from '../../elements/elements.js';
import * as TimelineComponents from '../../timeline/components/components.js';
import * as TimelineInsights from '../../timeline/components/insights/insights.js';
import * as Timeline from '../../timeline/timeline.js';
import * as TimelineUtils from '../../timeline/utils/utils.js';
import { PanelUtils } from '../../utils/utils.js';
import chatMessageStyles from './chatMessage.css.js';
import { walkthroughCloseTitle, walkthroughTitle, WalkthroughView } from './WalkthroughView.js';
const { html, Directives: { ref, ifDefined } } = Lit;
const lockedString = i18n.i18n.lockedString;
const { widget } = UI.Widget;
const REPORT_URL = 'https://crbug.com/364805393';
const SCROLL_ROUNDING_OFFSET = 1;
/*
* Strings that don't need to be translated at this time.
*/
const UIStringsNotTranslate = {
    /**
     * @description The title of the button that allows submitting positive
     * feedback about the response for AI assistance.
     */
    thumbsUp: 'Good response',
    /**
     * @description The title of the button that allows submitting negative
     * feedback about the response for AI assistance.
     */
    thumbsDown: 'Bad response',
    /**
     * @description The placeholder text for the feedback input.
     */
    provideFeedbackPlaceholder: 'Provide additional feedback',
    /**
     * @description The disclaimer text that tells the user what will be shared
     * and what will be stored.
     */
    disclaimer: 'Submitted feedback will also include your conversation',
    /**
     * @description The button text for the action of submitting feedback.
     */
    submit: 'Submit',
    /**
     * @description The header of the feedback form asking.
     */
    whyThisRating: 'Why did you choose this rating? (optional)',
    /**
     * @description The button text for the action that hides the feedback form.
     */
    close: 'Close',
    /**
     * @description The title of the button that opens a page to report a legal
     * issue with the AI assistance message.
     */
    report: 'Report legal issue',
    /**
     * @description The title of the button for scrolling to see next suggestions
     */
    scrollToNext: 'Scroll to next suggestions',
    /**
     * @description The title of the button for scrolling to see previous suggestions
     */
    scrollToPrevious: 'Scroll to previous suggestions',
    /**
     * @description The title of the button that copies the AI-generated response to the clipboard.
     */
    copyResponse: 'Copy response',
    /**
     * @description The error message when the request to the LLM failed for some reason.
     */
    systemError: 'Something unforeseen happened and I can no longer continue. Try your request again and see if that resolves the issue. If this keeps happening, update Chrome to the latest version.',
    /**
     * @description The error message when the LLM gets stuck in a loop (max steps reached).
     */
    maxStepsError: 'Seems like I am stuck with the investigation. It would be better if you start over.',
    /**
     * @description The error message when the LLM selects context from a different origin.
     */
    crossOriginError: 'I have selected the new context but you will have to start a new chat.',
    /**
     * @description Displayed when the user stop the response
     */
    stoppedResponse: 'You stopped this response',
    /**
     * @description Button text that confirm code execution that may affect the page.
     */
    confirmActionRequestApproval: 'Continue',
    /**
     * @description Button text that cancels code execution that may affect the page.
     */
    declineActionRequestApproval: 'Cancel',
    /**
     * @description The generic name of the AI agent (do not translate)
     */
    ai: 'AI',
    /**
     * @description Gemini (do not translate)
     */
    gemini: 'Gemini',
    /**
     * @description The fallback text when a step has no title yet
     */
    investigating: 'Investigating',
    /**
     * @description Prefix to the title of each thinking step of a user action is required to continue
     */
    paused: 'Paused',
    /**
     * @description Heading text for the code block that shows the executed code.
     */
    codeExecuted: 'Code executed',
    /**
     * @description Heading text for the code block that shows the code to be executed after side effect confirmation.
     */
    codeToExecute: 'Code to execute',
    /**
     * @description Heading text for the code block that shows the returned data.
     */
    dataReturned: 'Data returned',
    /**
     * @description Aria label for the check mark icon to be read by screen reader
     */
    completed: 'Completed',
    /**
     * @description Aria label for the cancel icon to be read by screen reader
     */
    canceled: 'Canceled',
    /**
     * @description Alt text for the image input (displayed in the chat messages) that has been sent to the model.
     */
    imageInputSentToTheModel: 'Image input sent to the model',
    /**
     * @description Title for the link which wraps the image input rendered in chat messages.
     */
    openImageInNewTab: 'Open image in a new tab',
    /**
     * @description Alt text for image when it is not available.
     */
    imageUnavailable: 'Image unavailable',
    /**
     * @description Title for the button that takes the user into other DevTools panels to reveal items the AI references.
     */
    reveal: 'Reveal',
    /**
     * @description Title used for revealing the performance trace.
     */
    revealTrace: 'Reveal trace',
    /**
     * @description Title for the core web vitals widget.
     */
    coreVitals: 'Core Web Vitals',
    /**
     * @description Title for the LCP breakdown widget.
     */
    lcpBreakdown: 'LCP breakdown',
    /**
     * @description Title for the LCP element widget.
     */
    lcpElement: 'LCP element',
    /**
     * @description Title for the performance summary widget.
     */
    performanceSummary: 'Performance summary'
};
export const DEFAULT_VIEW = (input, output, target) => {
    const message = input.message;
    if (message.entity === "user" /* ChatMessageEntity.USER */) {
        const imageInput = message.imageInput && 'inlineData' in message.imageInput ?
            renderImageChatMessage(message.imageInput.inlineData) :
            Lit.nothing;
        // clang-format off
        Lit.render(html `
      <style>${Input.textInputStyles}</style>
      <style>${chatMessageStyles}</style>
      <section
        class="chat-message query ${input.isLastMessage ? 'is-last-message' : ''}"
        jslog=${VisualLogging.section('question')}
      >
        ${imageInput}
        <div class="message-content">${renderTextAsMarkdown(message.text, input.markdownRenderer)}</div>
      </section>
    `, target);
        // clang-format on
        return;
    }
    const steps = message.parts.filter(part => part.type === 'step').map(part => part.step);
    const icon = AiAssistanceModel.AiUtils.getIconName();
    const aiAssistanceV2 = Root.Runtime.hostConfig.devToolsAiAssistanceV2?.enabled;
    // clang-format off
    Lit.render(html `
    <style>${Input.textInputStyles}</style>
    <style>${chatMessageStyles}</style>
    <section
      class="chat-message answer ${input.isLastMessage ? 'is-last-message' : ''}"
      jslog=${VisualLogging.section('answer')}
    >
      <div class="message-info">
        <devtools-icon name=${icon}></devtools-icon>
        <div class="message-name">
          <h2>${AiAssistanceModel.AiUtils.isGeminiBranding() ? lockedString(UIStringsNotTranslate.gemini) : lockedString(UIStringsNotTranslate.ai)}</h2>
        </div>
      </div>
      ${aiAssistanceV2 ? renderWalkthroughUI(input, steps) : Lit.nothing}
      ${Lit.Directives.repeat(message.parts, (_, index) => index, (part, index) => {
        const isLastPart = index === message.parts.length - 1;
        if (part.type === 'answer') {
            return html `<p>${renderTextAsMarkdown(part.text, input.markdownRenderer, { animate: !input.isReadOnly && input.isLoading && isLastPart && input.isLastMessage })}</p>`;
        }
        if (part.type === 'widget') {
            return html `${Lit.Directives.until(renderWidgets(part.widgets, { wrapperClass: 'main-widgets-wrapper' }))}`;
        }
        if (!aiAssistanceV2 && part.type === 'step') {
            return renderStep({
                step: part.step,
                isLoading: input.isLoading,
                markdownRenderer: input.markdownRenderer,
                isLast: isLastPart,
            });
        }
        return Lit.nothing;
    })}
      ${renderError(message)}
      ${input.showActions ? renderActions(input, output) : Lit.nothing}
    </section>
  `, target);
    // clang-format on
};
function renderTextAsMarkdown(text, markdownRenderer, { animate, ref: refFn } = {}) {
    let tokens = [];
    try {
        tokens = Marked.Marked.lexer(text);
        for (const token of tokens) {
            // Try to render all the tokens to make sure that
            // they all have a template defined for them. If there
            // isn't any template defined for a token, we'll fallback
            // to rendering the text as plain text instead of markdown.
            markdownRenderer.renderToken(token);
        }
    }
    catch {
        // The tokens were not parsed correctly or
        // one of the tokens are not supported, so we
        // continue to render this as text.
        return html `${text}`;
    }
    // clang-format off
    return html `<devtools-markdown-view
    .data=${{ tokens, renderer: markdownRenderer, animationEnabled: animate }}
    ${refFn ? ref(refFn) : Lit.nothing}>
  </devtools-markdown-view>`;
    // clang-format on
}
export function titleForStep(step) {
    return step.title ?? `${lockedString(UIStringsNotTranslate.investigating)}…`;
}
function renderTitle(step) {
    const paused = step.requestApproval ?
        html `<span class="paused">${lockedString(UIStringsNotTranslate.paused)}: </span>` :
        Lit.nothing;
    return html `<span class="title">${paused}${titleForStep(step)}</span>`;
}
function renderStepCode(step) {
    if (!step.code && !step.output) {
        return Lit.nothing;
    }
    // If there is no "output" yet, it means we didn't execute the code yet (e.g. maybe it is still waiting for confirmation from the user)
    // thus we show "Code to execute" text rather than "Code executed" text on the heading of the code block.
    const codeHeadingText = (step.output && !step.canceled) ? lockedString(UIStringsNotTranslate.codeExecuted) :
        lockedString(UIStringsNotTranslate.codeToExecute);
    // If there is output, we don't show notice on this code block and instead show
    // it in the data returned code block.
    // clang-format off
    const code = step.code ? html `<div class="action-result">
      <devtools-code-block
        .code=${step.code.trim()}
        .codeLang=${'js'}
        .displayNotice=${!Boolean(step.output)}
        .header=${codeHeadingText}
        .showCopyButton=${true}
      ></devtools-code-block>
  </div>` :
        Lit.nothing;
    const output = step.output ? html `<div class="js-code-output">
    <devtools-code-block
      .code=${step.output}
      .codeLang=${'js'}
      .displayNotice=${true}
      .header=${lockedString(UIStringsNotTranslate.dataReturned)}
      .showCopyButton=${false}
    ></devtools-code-block>
  </div>` :
        Lit.nothing;
    return html `<div class="step-code">${code}${output}</div>`;
    // clang-format on
}
function renderStepDetails({ step, markdownRenderer, isLast, }) {
    const sideEffects = isLast && step.requestApproval ? renderSideEffectConfirmationUi(step) : Lit.nothing;
    const thought = step.thought ? html `<p>${renderTextAsMarkdown(step.thought, markdownRenderer)}</p>` : Lit.nothing;
    // clang-format off
    const contextDetails = step.contextDetails ?
        html `${Lit.Directives.repeat(step.contextDetails, contextDetail => {
            return html `<div class="context-details">
      <devtools-code-block
        .code=${contextDetail.text}
        .codeLang=${contextDetail.codeLang || ''}
        .displayNotice=${false}
        .header=${contextDetail.title}
        .showCopyButton=${true}
      ></devtools-code-block>
    </div>`;
        })}` : Lit.nothing;
    return html `<div class="step-details">
    ${thought}
    ${renderStepCode(step)}
    ${sideEffects}
    ${contextDetails}
  </div>`;
    // clang-format on
}
function renderWalkthroughSidebarButton(input, steps) {
    const { message, walkthrough } = input;
    const lastStep = steps.at(-1);
    if (walkthrough.isInlined || !lastStep) {
        return Lit.nothing;
    }
    const hasOneStepWithWidget = steps.some(step => step.widgets?.length);
    const isExpanded = walkthrough.isExpanded && input.message === input.walkthrough.activeSidebarMessage;
    const title = isExpanded ? walkthroughCloseTitle({ hasWidgets: hasOneStepWithWidget }) : walkthroughTitle({
        isLoading: input.isLoading,
        hasWidgets: hasOneStepWithWidget,
        lastStep,
    });
    // The button should be tonal when there are widgets, but we only
    // want to change it visually at the end once everything has stopped
    // loading.
    const variant = hasOneStepWithWidget && !input.isLoading ? "tonal" /* Buttons.Button.Variant.TONAL */ : "text" /* Buttons.Button.Variant.TEXT */;
    // clang-format off
    return html `
    <div class="walkthrough-toggle-container">
      ${input.isLoading ? html `<devtools-spinner></devtools-spinner>` : Lit.nothing}
      <devtools-button
        .variant=${variant}
        .size=${"SMALL" /* Buttons.Button.Size.SMALL */}
        .title=${lastStep.isLoading ? titleForStep(lastStep) : title}
        .jslogContext=${walkthrough.isExpanded ? 'ai-hide-walkthrough-sidebar' : 'ai-show-walkthrough-sidebar'}
        data-show-walkthrough
        @click=${() => {
        if (walkthrough.activeSidebarMessage === input.message && walkthrough.isExpanded) {
            walkthrough.onToggle(false, message);
        }
        else {
            // Can't just toggle the visibility here; we need to ensure we
            // update the state with this message as the user could have had
            // the walkthrough open with an alternative message.
            walkthrough.onOpen(message);
        }
    }}
      >
        ${title}<devtools-icon class="chevron" .name=${'chevron-right'}></devtools-icon>
      </devtools-button>
    </div>
  `;
    // clang-format on
}
/**
 * Responsible for rendering the AI Walkthrough UI. This can take different
 * shapes and involve different parts depending on if the walkthrough is
 * inlined, expanded, or if we have side-effect steps. In cases where the
 * walkthrough is closed, side-effect steps are rendered inline in the chat.
 */
function renderWalkthroughUI(input, steps) {
    const lastStep = steps.at(-1);
    if (!lastStep) {
        // No steps = no walkthrough UI in the chat view.
        return Lit.nothing;
    }
    const sideEffectSteps = steps.filter(s => s.requestApproval);
    // If the walkthrough is in the sidebar, we render a button into the
    // ChatView to open it.
    const openWalkThroughSidebarButton = !input.walkthrough.isInlined ? renderWalkthroughSidebarButton(input, steps) : Lit.nothing;
    // A message's walkthrough is considered expanded if the walkthrough is
    // open and it is specifically targeting this message. This is necessary
    // because the walkthrough state is shared across all messages in the chat.
    const isExpanded = input.walkthrough.isInlined ?
        input.walkthrough.inlineExpandedMessages.includes(input.message) :
        (input.walkthrough.isExpanded && input.walkthrough.activeSidebarMessage === input.message);
    // When a side-effect step is present, it's shown in the main chat UI if the
    // walkthrough is closed, allowing the user to approve it without opening
    // the walkthrough. If the walkthrough is already open, the side-effect
    // step is displayed within the walkthrough instead.
    // clang-format off
    const sideEffectStepsUI = !isExpanded && sideEffectSteps.length > 0 ? sideEffectSteps.map(step => html `
    <div class="side-effect-container">
      ${renderStep({
        step,
        isLoading: input.isLoading,
        markdownRenderer: input.markdownRenderer,
        isLast: true
    })}
    </div> `) : Lit.nothing;
    // clang-format on
    // clang-format off
    const walkthroughInline = input.walkthrough.isInlined ? html `
    <div class="walkthrough-container">
      ${widget(WalkthroughView, {
        message: input.message,
        isLoading: input.isLoading && input.isLastMessage,
        markdownRenderer: input.markdownRenderer,
        isInlined: true,
        isExpanded,
        onToggle: input.walkthrough.onToggle,
        onOpen: input.walkthrough.onOpen,
    })}
    </div>
  ` : Lit.nothing;
    return html `
    ${openWalkThroughSidebarButton}
    ${walkthroughInline}
    ${sideEffectStepsUI}
  `;
    // clang-format on
}
function renderStepBadge({ step, isLoading, isLast }) {
    if (isLoading && isLast && !step.requestApproval) {
        return html `<devtools-spinner></devtools-spinner>`;
    }
    let iconName = 'checkmark';
    let ariaLabel = lockedString(UIStringsNotTranslate.completed);
    let role = 'button';
    if (isLast && step.requestApproval) {
        role = undefined;
        ariaLabel = undefined;
        iconName = 'pause-circle';
    }
    else if (step.canceled) {
        ariaLabel = lockedString(UIStringsNotTranslate.canceled);
        iconName = 'cross';
    }
    return html `<devtools-icon
      class="indicator"
      role=${ifDefined(role)}
      aria-label=${ifDefined(ariaLabel)}
      .name=${iconName}
    ></devtools-icon>`;
}
export function renderStep({ step, isLoading, markdownRenderer, isLast }) {
    const stepClasses = Lit.Directives.classMap({
        step: true,
        empty: !step.thought && !step.code && !step.contextDetails && !step.requestApproval,
        paused: Boolean(step.requestApproval),
        canceled: Boolean(step.canceled),
    });
    // clang-format off
    return html `
    <details class=${stepClasses}
      jslog=${VisualLogging.section('step')}
      .open=${Boolean(step.requestApproval)}>
      <summary>
        <div class="summary">
          ${renderStepBadge({ step, isLoading, isLast })}
          ${renderTitle(step)}
          <devtools-icon
            class="arrow"
            name="chevron-down"
          ></devtools-icon>
        </div>
      </summary>
      ${renderStepDetails({ step, markdownRenderer, isLast })}
    </details>
    ${Lit.Directives.until(renderWidgets(step.widgets, { wrapperClass: 'step-widgets-wrapper' }))}
    `;
    // clang-format on
}
const nodeCache = new Map();
async function resolveNode(backendNodeId) {
    const cachedNode = nodeCache.get(backendNodeId);
    if (cachedNode) {
        return cachedNode;
    }
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!target) {
        return null;
    }
    const node = new SDK.DOMModel.DeferredDOMNode(target, backendNodeId);
    const resolved = await node.resolvePromise();
    if (resolved) {
        nodeCache.set(backendNodeId, resolved);
    }
    return resolved;
}
async function makeComputedStyleWidget(widgetData) {
    const domNodeForId = await resolveNode(widgetData.data.backendNodeId);
    if (!domNodeForId) {
        return null;
    }
    const styles = new ComputedStyle.ComputedStyleModel.ComputedStyle(domNodeForId, widgetData.data.computedStyles);
    // clang-format off
    const renderedWidget = html `<devtools-widget
      class="computed-styles-widget" ${widget(Elements.ComputedStyleWidget.ComputedStyleWidget, {
        nodeStyle: styles,
        matchedStyles: widgetData.data.matchedCascade,
        // This disables showing the nested traces and detailed information in the widget.
        propertyTraces: null,
        allowUserControl: false,
        filterText: new RegExp(widgetData.data.properties.join('|'), 'i'),
        enableNarrowViewResizing: false,
    })}></devtools-widget>`;
    // clang-format on
    return {
        renderedWidget,
        revealable: new Elements.ElementsPanel.NodeComputedStyles(domNodeForId),
        title: html `<devtools-widget
      ${widget(PanelsCommon.DOMLinkifier.DOMNodeLink, {
            node: domNodeForId,
        })}
    ></devtools-widget>`,
    };
}
async function makeCoreVitalsWidget(widgetData) {
    // clang-format off
    const renderedWidget = html `<devtools-widget
      class="core-vitals-widget" ${widget(TimelineComponents.CWVMetrics.CWVMetrics, { data: widgetData.data })}>
  </devtools-widget>`;
    // clang-format on
    return {
        renderedWidget,
        revealable: new TimelineUtils.Helpers.RevealableCoreVitals(widgetData.data.insightSetKey),
        title: lockedString(UIStringsNotTranslate.coreVitals),
    };
}
async function makeStylePropertiesWidget(widgetData) {
    const domNodeForId = await resolveNode(widgetData.data.backendNodeId);
    if (!domNodeForId) {
        return null;
    }
    // clang-format off
    const renderedWidget = html `<devtools-widget
      class="styling-preview-widget"
      ${widget(Elements.StandaloneStylesContainer.StandaloneStylesContainer, {
        domNode: domNodeForId,
        filter: widgetData.data.selector ? new RegExp(widgetData.data.selector) : null,
    })}>
  </devtools-widget>`;
    // clang-format on
    return {
        renderedWidget,
        revealable: domNodeForId,
        title: html `<devtools-widget
      ${widget(PanelsCommon.DOMLinkifier.DOMNodeLink, {
            node: domNodeForId,
        })}
    ></devtools-widget>`,
    };
}
async function makeLcpBreakdownWidget(widgetData) {
    const insight = widgetData.data.lcpData;
    if (!insight) {
        return null;
    }
    // clang-format off
    const renderedWidget = html `<devtools-widget
    class="lcp-breakdown-widget"
    ${widget(TimelineInsights.LCPBreakdown.LCPBreakdown, {
        model: insight,
        minimal: true,
    })}></devtools-widget>`;
    // clang-format on
    return {
        renderedWidget,
        revealable: new TimelineUtils.Helpers.RevealableInsight(insight),
        title: lockedString(UIStringsNotTranslate.lcpBreakdown),
    };
}
function renderWidgetResponse(response) {
    if (response === null) {
        return Lit.nothing;
    }
    function onReveal() {
        if (response === null) {
            return;
        }
        void Common.Revealer.reveal(response?.revealable);
    }
    const classes = Lit.Directives.classMap({
        'widget-and-revealer-container': true,
        'revealer-only': response.renderedWidget === null,
    });
    const revealButton = html `
    <devtools-button class="widget-reveal-button"
      .variant=${"text" /* Buttons.Button.Variant.TEXT */}
      @click=${onReveal}
    >
      ${response.customRevealTitle ?? lockedString(UIStringsNotTranslate.reveal)}
      <devtools-icon name='tab-move'></devtools-icon>
    </devtools-button>
  `;
    // clang-format off
    return html `
    <div class=${classes}>
      ${response.title ? html `
        <div class="widget-header">
          <div class="widget-name">${response.title}</div>
          <div class="widget-reveal-container">
            ${revealButton}
          </div>
        </div>
      ` : Lit.nothing}
      ${response.renderedWidget ? html `
        <div class="widget-content-container">
          ${response.renderedWidget}
        </div>` : Lit.nothing}
      ${!response.title ? html `
        <div class="widget-reveal-container">
          ${revealButton}
        </div>
      ` : Lit.nothing}
    </div>
    `;
    // clang-format on
}
async function makePerformanceTraceWidget(widgetData) {
    return {
        renderedWidget: null,
        title: null,
        revealable: new Timeline.TimelinePanel.ParsedTraceRevealable(widgetData.data.parsedTrace),
        customRevealTitle: lockedString(UIStringsNotTranslate.revealTrace),
    };
}
function renderNetworkRequestPreview(networkRequest) {
    const filename = networkRequest.url.split('/').pop() || networkRequest.url;
    const size = i18n.ByteUtilities.bytesToString(networkRequest.size);
    const resourceType = Common.ResourceType.resourceTypes[networkRequest.resourceType];
    const { iconName, color } = PanelUtils.iconDataForResourceType(resourceType);
    return html `
    <div class="network-request-preview">
      <div class="network-request-header">
        <div class="network-request-icon">
          ${resourceType.isImage() ? html `<img src=${networkRequest.imageUrl ?? networkRequest.url} alt=${filename} />` :
        html `<devtools-icon name=${iconName} style=${Lit.Directives.styleMap({
            color: color ?? ''
        })}></devtools-icon>`}
        </div>
        <div class="network-request-details">
          <div class="network-request-name" title=${networkRequest.url}>${filename}</div>
          <div class="network-request-size">${size}</div>
        </div>
      </div>
    </div>
  `;
}
async function makeDomTreeWidget(widgetData) {
    const root = widgetData.data.root;
    if (!(root instanceof SDK.DOMModel.DOMNodeSnapshot)) {
        return null;
    }
    const networkRequest = widgetData.data.networkRequest;
    // clang-format off
    const renderedWidget = html `
    ${networkRequest ? renderNetworkRequestPreview(networkRequest) : Lit.nothing}
    <devtools-widget class="dom-tree-widget" ${widget(Elements.ElementsTreeOutline.DOMTreeWidget, {
        maxTreeDepth: 2,
        enableContextMenu: false,
        showComments: false,
        showAIButton: false,
        disableEdits: true,
        expandRoot: true,
        rootDOMNode: root,
        visibleWidth: 400,
        wrap: true,
    })}></devtools-widget>
  `;
    // clang-format on
    return {
        renderedWidget,
        revealable: new SDK.DOMModel.DeferredDOMNode(root.domModel().target(), root.backendNodeId()),
        title: lockedString(UIStringsNotTranslate.lcpElement),
    };
}
/**
 * Renders AI-defined UI widgets.
 * When a ModelChatMessage contains a WidgetPart, or a Step has widgets,
 * the ChatMessage component iterates through the \`widgets\` array.
 * For each widget, it determines the appropriate rendering logic based on
 * the \`widgetData.name\`.
 *
 * Currently, 'COMPUTED_STYLES', 'CORE_VITALS' and 'STYLE_PROPERTIES' widgets are supported.
 * For these, the corresponding \`make...Widget\` functions are called to construct the necessary
 * data and configuration for the UI components. The widget is then rendered using the
 * \`<devtools-widget>\` custom element, which dynamically instantiates and displays the
 * specified UI.Widget subclass with the provided configuration.
 *
 * This allows for a flexible and extensible system where new widget types
 * can be added to the AI responses and rendered in DevTools by adding
 * corresponding \`make...Widget\` functions and handling them here.
 */
async function renderWidgets(widgets, options = {}) {
    if (!Root.Runtime.hostConfig.devToolsAiAssistanceV2?.enabled || !widgets || widgets.length === 0) {
        return Lit.nothing;
    }
    const ui = await Promise.all(widgets.map(async (widgetData) => {
        let response = null;
        switch (widgetData.name) {
            case 'COMPUTED_STYLES':
                response = await makeComputedStyleWidget(widgetData);
                break;
            case 'CORE_VITALS':
                response = await makeCoreVitalsWidget(widgetData);
                break;
            case 'STYLE_PROPERTIES':
                response = await makeStylePropertiesWidget(widgetData);
                break;
            case 'DOM_TREE':
                response = await makeDomTreeWidget(widgetData);
                break;
            case 'PERFORMANCE_TRACE':
                response = await makePerformanceTraceWidget(widgetData);
                break;
            case 'LCP_BREAKDOWN':
                response = await makeLcpBreakdownWidget(widgetData);
                break;
            case 'TIMELINE_RANGE_SUMMARY':
                response = await makeTimelineRangeSummaryWidget(widgetData);
                break;
            default:
                Platform.assertNever(widgetData, 'Unknown AiWidget name');
        }
        return renderWidgetResponse(response);
    }));
    if (options.wrapperClass) {
        return html `<div class=${options.wrapperClass}>${ui}</div>`;
    }
    return html `${ui}`;
}
function renderSideEffectConfirmationUi(step) {
    if (!step.requestApproval) {
        return Lit.nothing;
    }
    // clang-format off
    return html `<div
    class="side-effect-confirmation"
    jslog=${VisualLogging.section('side-effect-confirmation')}
  >
    ${step.requestApproval.description ? html `<p>${step.requestApproval.description}</p>` : Lit.nothing}
    <div class="side-effect-buttons-container">
      <devtools-button
        .data=${{
        variant: "outlined" /* Buttons.Button.Variant.OUTLINED */,
        jslogContext: 'decline-execute-code',
    }}
        @click=${() => step.requestApproval?.onAnswer(false)}
      >${lockedString(UIStringsNotTranslate.declineActionRequestApproval)}</devtools-button>
      <devtools-button
        .data=${{
        variant: "primary" /* Buttons.Button.Variant.PRIMARY */,
        jslogContext: 'accept-execute-code',
        iconName: 'play',
    }}
        @click=${() => step.requestApproval?.onAnswer(true)}
      >${lockedString(UIStringsNotTranslate.confirmActionRequestApproval)}</devtools-button>
    </div>
  </div>`;
    // clang-format on
}
function renderError(message) {
    if (message.error) {
        let errorMessage;
        switch (message.error) {
            case "unknown" /* AiAssistanceModel.AiAgent.ErrorType.UNKNOWN */:
            case "block" /* AiAssistanceModel.AiAgent.ErrorType.BLOCK */:
                errorMessage = UIStringsNotTranslate.systemError;
                break;
            case "max-steps" /* AiAssistanceModel.AiAgent.ErrorType.MAX_STEPS */:
                errorMessage = UIStringsNotTranslate.maxStepsError;
                break;
            case "cross-origin" /* AiAssistanceModel.AiAgent.ErrorType.CROSS_ORIGIN */:
                errorMessage = UIStringsNotTranslate.crossOriginError;
                break;
            case "abort" /* AiAssistanceModel.AiAgent.ErrorType.ABORT */:
                return html `<p class="aborted" jslog=${VisualLogging.section('aborted')}>${lockedString(UIStringsNotTranslate.stoppedResponse)}</p>`;
        }
        return html `<p class="error" jslog=${VisualLogging.section('error')}>${lockedString(errorMessage)}</p>`;
    }
    return Lit.nothing;
}
function renderImageChatMessage(inlineData) {
    if (inlineData.data === AiAssistanceModel.AiConversation.NOT_FOUND_IMAGE_DATA) {
        // clang-format off
        return html `<div class="unavailable-image" title=${UIStringsNotTranslate.imageUnavailable}>
      <devtools-icon name='file-image'></devtools-icon>
    </div>`;
        // clang-format on
    }
    const imageUrl = `data:${inlineData.mimeType};base64,${inlineData.data}`;
    // clang-format off
    return html `<devtools-link
      class="image-link" title=${UIStringsNotTranslate.openImageInNewTab}
      href=${imageUrl}
    >
      <img src=${imageUrl} alt=${UIStringsNotTranslate.imageInputSentToTheModel} />
    </devtools-link>`;
    // clang-format on
}
function renderActions(input, output) {
    // clang-format off
    return html `
    <div class="ai-assistance-feedback-row">
      <div class="action-buttons">
        ${input.showRateButtons ? html `
          <devtools-button
            .data=${{
        variant: "icon" /* Buttons.Button.Variant.ICON */,
        size: "SMALL" /* Buttons.Button.Size.SMALL */,
        iconName: 'thumb-up',
        toggledIconName: 'thumb-up-filled',
        toggled: input.currentRating === "POSITIVE" /* Host.AidaClient.Rating.POSITIVE */,
        toggleType: "primary-toggle" /* Buttons.Button.ToggleType.PRIMARY */,
        title: lockedString(UIStringsNotTranslate.thumbsUp),
        jslogContext: 'thumbs-up',
    }}
            @click=${() => input.onRatingClick("POSITIVE" /* Host.AidaClient.Rating.POSITIVE */)}
          ></devtools-button>
          <devtools-button
            .data=${{
        variant: "icon" /* Buttons.Button.Variant.ICON */,
        size: "SMALL" /* Buttons.Button.Size.SMALL */,
        iconName: 'thumb-down',
        toggledIconName: 'thumb-down-filled',
        toggled: input.currentRating === "NEGATIVE" /* Host.AidaClient.Rating.NEGATIVE */,
        toggleType: "primary-toggle" /* Buttons.Button.ToggleType.PRIMARY */,
        title: lockedString(UIStringsNotTranslate.thumbsDown),
        jslogContext: 'thumbs-down',
    }}
            @click=${() => input.onRatingClick("NEGATIVE" /* Host.AidaClient.Rating.NEGATIVE */)}
          ></devtools-button>
          <div class="vertical-separator"></div>
        ` : Lit.nothing}
        <devtools-button
          .data=${{
        variant: "icon" /* Buttons.Button.Variant.ICON */,
        size: "SMALL" /* Buttons.Button.Size.SMALL */,
        title: lockedString(UIStringsNotTranslate.report),
        iconName: 'report',
        jslogContext: 'report',
    }}
          @click=${input.onReportClick}
        ></devtools-button>
        <div class="vertical-separator"></div>
          <devtools-button
            .data=${{
        variant: "icon" /* Buttons.Button.Variant.ICON */,
        size: "SMALL" /* Buttons.Button.Size.SMALL */,
        title: lockedString(UIStringsNotTranslate.copyResponse),
        iconName: 'copy',
        jslogContext: 'copy-ai-response',
    }}
            aria-label=${lockedString(UIStringsNotTranslate.copyResponse)}
            @click=${input.onCopyResponseClick}></devtools-button>
      </div>
      ${input.suggestions ? html `<div class="suggestions-container">
        <div class="scroll-button-container left hidden" ${ref(element => { output.suggestionsLeftScrollButtonContainer = element; })}>
          <devtools-button
            class='scroll-button'
            .data=${{
        variant: "icon" /* Buttons.Button.Variant.ICON */,
        size: "SMALL" /* Buttons.Button.Size.SMALL */,
        iconName: 'chevron-left',
        title: lockedString(UIStringsNotTranslate.scrollToPrevious),
        jslogContext: 'chevron-left',
    }}
            @click=${() => input.scrollSuggestionsScrollContainer('left')}
          ></devtools-button>
        </div>
        <div class="suggestions-scroll-container" @scroll=${input.onSuggestionsScrollOrResize} ${ref(element => { output.suggestionsScrollContainer = element; })}>
          ${input.suggestions.map(suggestion => html `<devtools-button
            class='suggestion'
            .data=${{
        variant: "outlined" /* Buttons.Button.Variant.OUTLINED */,
        title: suggestion,
        jslogContext: 'suggestion',
    }}
            @click=${() => input.onSuggestionClick(suggestion)}
          >${suggestion}</devtools-button>`)}
        </div>
        <div class="scroll-button-container right hidden" ${ref(element => { output.suggestionsRightScrollButtonContainer = element; })}>
          <devtools-button
            class='scroll-button'
            .data=${{
        variant: "icon" /* Buttons.Button.Variant.ICON */,
        size: "SMALL" /* Buttons.Button.Size.SMALL */,
        iconName: 'chevron-right',
        title: lockedString(UIStringsNotTranslate.scrollToNext),
        jslogContext: 'chevron-right',
    }}
            @click=${() => input.scrollSuggestionsScrollContainer('right')}
          ></devtools-button>
        </div>
      </div>` : Lit.nothing}
    </div>
    ${input.isShowingFeedbackForm ? html `
      <form class="feedback-form" @submit=${input.onSubmit}>
        <div class="feedback-header">
          <h4 class="feedback-title">${lockedString(UIStringsNotTranslate.whyThisRating)}</h4>
          <devtools-button
            aria-label=${lockedString(UIStringsNotTranslate.close)}
            @click=${input.onClose}
            .data=${{
        variant: "icon" /* Buttons.Button.Variant.ICON */,
        iconName: 'cross',
        size: "SMALL" /* Buttons.Button.Size.SMALL */,
        title: lockedString(UIStringsNotTranslate.close),
        jslogContext: 'close',
    }}
          ></devtools-button>
        </div>
        <input
          type="text"
          class="devtools-text-input feedback-input"
          @input=${(event) => input.onInputChange(event.target.value)}
          placeholder=${lockedString(UIStringsNotTranslate.provideFeedbackPlaceholder)}
          jslog=${VisualLogging.textField('feedback').track({ keydown: 'Enter' })}
        >
        <span class="feedback-disclaimer">${lockedString(UIStringsNotTranslate.disclaimer)}</span>
        <div>
          <devtools-button
          aria-label=${lockedString(UIStringsNotTranslate.submit)}
          .data=${{
        type: 'submit',
        disabled: input.isSubmitButtonDisabled,
        variant: "outlined" /* Buttons.Button.Variant.OUTLINED */,
        size: "SMALL" /* Buttons.Button.Size.SMALL */,
        title: lockedString(UIStringsNotTranslate.submit),
        jslogContext: 'send',
    }}
          >${lockedString(UIStringsNotTranslate.submit)}</devtools-button>
        </div>
      </div>
    </form>
    ` : Lit.nothing}
  `;
    // clang-format on
}
export class ChatMessage extends UI.Widget.Widget {
    message = { entity: "user" /* ChatMessageEntity.USER */, text: '' };
    isLoading = false;
    isReadOnly = false;
    canShowFeedbackForm = false;
    isLastMessage = false;
    markdownRenderer;
    onSuggestionClick = () => { };
    onFeedbackSubmit = () => { };
    onCopyResponseClick = () => { };
    walkthrough = {
        onOpen: () => { },
        onToggle: () => { },
        isInlined: false,
        isExpanded: false,
        activeSidebarMessage: null,
        inlineExpandedMessages: [],
    };
    #suggestionsResizeObserver = new ResizeObserver(() => this.#handleSuggestionsScrollOrResize());
    #suggestionsEvaluateLayoutThrottler = new Common.Throttler.Throttler(50);
    #feedbackValue = '';
    #currentRating;
    #isShowingFeedbackForm = false;
    #isSubmitButtonDisabled = true;
    #view;
    #viewOutput = {};
    constructor(element, view) {
        super(element);
        this.#view = view ?? DEFAULT_VIEW;
    }
    wasShown() {
        super.wasShown();
        void this.performUpdate();
        this.#evaluateSuggestionsLayout();
        if (this.#viewOutput.suggestionsScrollContainer) {
            this.#suggestionsResizeObserver.observe(this.#viewOutput.suggestionsScrollContainer);
        }
    }
    performUpdate() {
        this.#view({
            message: this.message,
            isLoading: this.isLoading,
            isReadOnly: this.isReadOnly,
            canShowFeedbackForm: this.canShowFeedbackForm,
            markdownRenderer: this.markdownRenderer,
            isLastMessage: this.isLastMessage,
            onSuggestionClick: this.onSuggestionClick,
            onRatingClick: this.#handleRateClick.bind(this),
            onReportClick: () => UIHelpers.openInNewTab(REPORT_URL),
            onCopyResponseClick: () => {
                if (this.message.entity === "model" /* ChatMessageEntity.MODEL */) {
                    this.onCopyResponseClick(this.message);
                }
            },
            scrollSuggestionsScrollContainer: this.#scrollSuggestionsScrollContainer.bind(this),
            onSuggestionsScrollOrResize: this.#handleSuggestionsScrollOrResize.bind(this),
            onSubmit: this.#handleSubmit.bind(this),
            onClose: this.#handleClose.bind(this),
            onInputChange: this.#handleInputChange.bind(this),
            isSubmitButtonDisabled: this.#isSubmitButtonDisabled,
            // Props for actions logic
            showActions: !(this.isLastMessage && this.isLoading),
            showRateButtons: this.message.entity === "model" /* ChatMessageEntity.MODEL */ && !!this.message.rpcId,
            suggestions: (this.isLastMessage && this.message.entity === "model" /* ChatMessageEntity.MODEL */ && !this.isReadOnly &&
                this.message.parts.at(-1)?.type === 'answer') ?
                this.message.parts.at(-1).suggestions :
                undefined,
            currentRating: this.#currentRating,
            isShowingFeedbackForm: this.#isShowingFeedbackForm,
            onFeedbackSubmit: this.onFeedbackSubmit,
            walkthrough: this.walkthrough,
        }, this.#viewOutput, this.contentElement);
    }
    #handleInputChange(value) {
        this.#feedbackValue = value;
        const disableSubmit = !value;
        if (disableSubmit !== this.#isSubmitButtonDisabled) {
            this.#isSubmitButtonDisabled = disableSubmit;
            void this.performUpdate();
        }
    }
    #evaluateSuggestionsLayout = () => {
        const suggestionsScrollContainer = this.#viewOutput.suggestionsScrollContainer;
        const leftScrollButtonContainer = this.#viewOutput.suggestionsLeftScrollButtonContainer;
        const rightScrollButtonContainer = this.#viewOutput.suggestionsRightScrollButtonContainer;
        if (!suggestionsScrollContainer || !leftScrollButtonContainer || !rightScrollButtonContainer) {
            return;
        }
        const shouldShowLeftButton = suggestionsScrollContainer.scrollLeft > SCROLL_ROUNDING_OFFSET;
        const shouldShowRightButton = suggestionsScrollContainer.scrollLeft +
            suggestionsScrollContainer.offsetWidth + SCROLL_ROUNDING_OFFSET <
            suggestionsScrollContainer.scrollWidth;
        leftScrollButtonContainer.classList.toggle('hidden', !shouldShowLeftButton);
        rightScrollButtonContainer.classList.toggle('hidden', !shouldShowRightButton);
    };
    willHide() {
        super.willHide();
        this.#suggestionsResizeObserver.disconnect();
    }
    #handleSuggestionsScrollOrResize() {
        void this.#suggestionsEvaluateLayoutThrottler.schedule(() => {
            this.#evaluateSuggestionsLayout();
            return Promise.resolve();
        });
    }
    #scrollSuggestionsScrollContainer(direction) {
        const suggestionsScrollContainer = this.#viewOutput.suggestionsScrollContainer;
        if (!suggestionsScrollContainer) {
            return;
        }
        suggestionsScrollContainer.scroll({
            top: 0,
            left: direction === 'left' ? suggestionsScrollContainer.scrollLeft - suggestionsScrollContainer.clientWidth :
                suggestionsScrollContainer.scrollLeft + suggestionsScrollContainer.clientWidth,
            behavior: 'smooth',
        });
    }
    #handleRateClick(rating) {
        if (this.#currentRating === rating) {
            this.#currentRating = undefined;
            this.#isShowingFeedbackForm = false;
            this.#isSubmitButtonDisabled = true;
            // This effectively reset the user rating
            if (this.message.entity === "model" /* ChatMessageEntity.MODEL */ && this.message.rpcId) {
                this.onFeedbackSubmit(this.message.rpcId, "SENTIMENT_UNSPECIFIED" /* Host.AidaClient.Rating.SENTIMENT_UNSPECIFIED */);
            }
            void this.performUpdate();
            return;
        }
        this.#currentRating = rating;
        this.#isShowingFeedbackForm = this.canShowFeedbackForm;
        if (this.message.entity === "model" /* ChatMessageEntity.MODEL */ && this.message.rpcId) {
            this.onFeedbackSubmit(this.message.rpcId, rating);
        }
        void this.performUpdate();
    }
    #handleClose() {
        this.#isShowingFeedbackForm = false;
        this.#isSubmitButtonDisabled = true;
        void this.performUpdate();
    }
    #handleSubmit(ev) {
        ev.preventDefault();
        const input = this.#feedbackValue;
        if (!this.#currentRating || !input) {
            return;
        }
        if (this.message.entity === "model" /* ChatMessageEntity.MODEL */ && this.message.rpcId) {
            this.onFeedbackSubmit(this.message.rpcId, this.#currentRating, input);
        }
        this.#isShowingFeedbackForm = false;
        this.#isSubmitButtonDisabled = true;
        void this.performUpdate();
    }
}
async function makeTimelineRangeSummaryWidget(widgetData) {
    const { bounds, parsedTrace, track } = widgetData.data;
    let events = [];
    if (track === 'main') {
        const flameChartView = Timeline.TimelinePanel.TimelinePanel.instance().getFlameChart();
        const mainDataProvider = flameChartView.getMainDataProvider();
        const mainTrack = mainDataProvider.timelineData().groups.find((group) => group.name.startsWith('Main \u2014 '));
        if (mainTrack) {
            events = mainDataProvider.groupTreeEvents(mainTrack) ?? [];
        }
    }
    const eventsArray = Array.from(events);
    eventsArray.sort((a, b) => a.ts - b.ts);
    const thirdPartyTree = new Timeline.ThirdPartyTreeView.ThirdPartyTreeViewWidget();
    const mapper = new Trace.EntityMapper.EntityMapper(parsedTrace);
    thirdPartyTree.setModelWithEvents(eventsArray, parsedTrace, mapper);
    thirdPartyTree.updateContents(Timeline.TimelineSelection.selectionFromRangeMicroSeconds(bounds.min, bounds.max));
    thirdPartyTree.refreshTree(true);
    // clang-format off
    const template = html `
    <devtools-widget
      ${widget(TimelineComponents.TimelineRangeSummaryView.TimelineRangeSummaryView, {
        data: {
            parsedTrace,
            events,
            startTime: Trace.Helpers.Timing.microToMilli(bounds.min),
            endTime: Trace.Helpers.Timing.microToMilli(bounds.max),
            thirdPartyTreeTemplate: html `<devtools-performance-third-party-tree-view
            max-rows="10"
            .treeView=${thirdPartyTree}></devtools-performance-third-party-tree-view>`,
        },
    })}
    ></devtools-widget>`;
    // clang-format on
    return {
        renderedWidget: template,
        revealable: new TimelineUtils.Helpers.RevealableTimeRange(bounds),
        title: lockedString(UIStringsNotTranslate.performanceSummary),
    };
}
//# sourceMappingURL=ChatMessage.js.map