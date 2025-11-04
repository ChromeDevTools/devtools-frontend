// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../ui/components/chrome_link/chrome_link.js';
import '../../../ui/components/expandable_list/expandable_list.js';
import '../../../ui/components/report_view/report_view.js';
import '../../../ui/legacy/legacy.js';
import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Components from '../../../ui/legacy/components/utils/utils.js';
import * as UI from '../../../ui/legacy/legacy.js';
import { html, nothing, render } from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import { NotRestoredReasonDescription } from './BackForwardCacheStrings.js';
import backForwardCacheViewStyles from './backForwardCacheView.css.js';
const UIStrings = {
    /**
     * @description Title text in back/forward cache view of the Application panel
     */
    mainFrame: 'Main Frame',
    /**
     * @description Title text in back/forward cache view of the Application panel
     */
    backForwardCacheTitle: 'Back/forward cache',
    /**
     * @description Status text for the status of the main frame
     */
    unavailable: 'unavailable',
    /**
     * @description Entry name text in the back/forward cache view of the Application panel
     */
    url: 'URL',
    /**
     * @description Status text for the status of the back/forward cache status
     */
    unknown: 'Unknown Status',
    /**
     * @description Status text for the status of the back/forward cache status indicating that
     * the back/forward cache was not used and a normal navigation occurred instead.
     */
    normalNavigation: 'Not served from back/forward cache: to trigger back/forward cache, use Chrome\'s back/forward buttons, or use the test button below to automatically navigate away and back.',
    /**
     * @description Status text for the status of the back/forward cache status indicating that
     * the back/forward cache was used to restore the page instead of reloading it.
     */
    restoredFromBFCache: 'Successfully served from back/forward cache.',
    /**
     * @description Label for a list of reasons which prevent the page from being eligible for
     * back/forward cache. These reasons are actionable i.e. they can be cleaned up to make the
     * page eligible for back/forward cache.
     */
    pageSupportNeeded: 'Actionable',
    /**
     * @description Label for the completion of the back/forward cache test
     */
    testCompleted: 'Back/forward cache test completed.',
    /**
     * @description Explanation for actionable items which prevent the page from being eligible
     * for back/forward cache.
     */
    pageSupportNeededExplanation: 'These reasons are actionable i.e. they can be cleaned up to make the page eligible for back/forward cache.',
    /**
     * @description Label for a list of reasons which prevent the page from being eligible for
     * back/forward cache. These reasons are circumstantial / not actionable i.e. they cannot be
     * cleaned up by developers to make the page eligible for back/forward cache.
     */
    circumstantial: 'Not Actionable',
    /**
     * @description Explanation for circumstantial/non-actionable items which prevent the page from being eligible
     * for back/forward cache.
     */
    circumstantialExplanation: 'These reasons are not actionable i.e. caching was prevented by something outside of the direct control of the page.',
    /**
     * @description Label for a list of reasons which prevent the page from being eligible for
     * back/forward cache. These reasons are pending support by chrome i.e. in a future version
     * of chrome they will not prevent back/forward cache usage anymore.
     */
    supportPending: 'Pending Support',
    /**
     * @description Label for the button to test whether BFCache is available for the page
     */
    runTest: 'Test back/forward cache',
    /**
     * @description Label for the disabled button while the test is running
     */
    runningTest: 'Running test',
    /**
     * @description Link Text about explanation of back/forward cache
     */
    learnMore: 'Learn more: back/forward cache eligibility',
    /**
     * @description Link Text about unload handler
     */
    neverUseUnload: 'Learn more: Never use unload handler',
    /**
     * @description Explanation for 'pending support' items which prevent the page from being eligible
     * for back/forward cache.
     */
    supportPendingExplanation: 'Chrome support for these reasons is pending i.e. they will not prevent the page from being eligible for back/forward cache in a future version of Chrome.',
    /**
     * @description Text that precedes displaying a link to the extension which blocked the page from being eligible for back/forward cache.
     */
    blockingExtensionId: 'Extension id: ',
    /**
     * @description Label for the 'Frames' section of the back/forward cache view, which shows a frame tree of the
     * page with reasons why the frames can't be cached.
     */
    framesTitle: 'Frames',
    /**
     * @description Top level summary of the total number of issues found in a single frame.
     */
    issuesInSingleFrame: '{n, plural, =1 {# issue found in 1 frame.} other {# issues found in 1 frame.}}',
    /**
     * @description Top level summary of the total number of issues found and the number of frames they were found in.
     * 'm' is never less than 2.
     * @example {3} m
     */
    issuesInMultipleFrames: '{n, plural, =1 {# issue found in {m} frames.} other {# issues found in {m} frames.}}',
    /**
     * @description Shows the number of frames with a particular issue.
     */
    framesPerIssue: '{n, plural, =1 {# frame} other {# frames}}',
    /**
     * @description Title for a frame in the frame tree that doesn't have a URL. Placeholder indicates which number frame with a blank URL it is.
     * @example {3} PH1
     */
    blankURLTitle: 'Blank URL [{PH1}]',
    /**
     * @description Shows the number of files with a particular issue.
     */
    filesPerIssue: '{n, plural, =1 {# file} other {# files}}',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/components/BackForwardCacheView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
function renderMainFrameInformation(frame, frameTreeData, reasonToFramesMap, screenStatus, navigateAwayAndBack) {
    if (!frame) {
        // clang-format of
        return html `
      <devtools-report-key>
        ${i18nString(UIStrings.mainFrame)}
      </devtools-report-key>
      <devtools-report-value>
        ${i18nString(UIStrings.unavailable)}
      </devtools-report-value>`;
        // clang-format on
    }
    const isTestRunning = (screenStatus === "Running" /* ScreenStatusType.RUNNING */);
    // Prevent running BFCache test on the DevTools window itself via DevTools on DevTools
    const isTestingForbidden = Common.ParsedURL.schemeIs(frame.url, 'devtools:');
    // clang-format off
    return html `
    ${renderBackForwardCacheStatus(frame.backForwardCacheDetails.restoredFromCache)}
    <devtools-report-key>${i18nString(UIStrings.url)}</devtools-report-key>
    <devtools-report-value>${frame.url}</devtools-report-value>
    ${maybeRenderFrameTree(frameTreeData)}
    <devtools-report-section>
      <devtools-button
        aria-label=${i18nString(UIStrings.runTest)}
        .disabled=${isTestRunning || isTestingForbidden}
        .spinner=${isTestRunning}
        .variant=${"primary" /* Buttons.Button.Variant.PRIMARY */}
        @click=${navigateAwayAndBack}
        jslog=${VisualLogging.action('back-forward-cache.run-test').track({ click: true })}>
        ${isTestRunning ? html `
          ${i18nString(UIStrings.runningTest)}` : `
          ${i18nString(UIStrings.runTest)}
        `}
      </devtools-button>
    </devtools-report-section>
    <devtools-report-divider>
    </devtools-report-divider>
    ${maybeRenderExplanations(frame.backForwardCacheDetails.explanations, frame.backForwardCacheDetails.explanationsTree, reasonToFramesMap)}
    <devtools-report-section>
      <x-link href="https://web.dev/bfcache/" class="link"
      jslog=${VisualLogging.action('learn-more.eligibility').track({ click: true })}>
        ${i18nString(UIStrings.learnMore)}
      </x-link>
    </devtools-report-section>`;
    // clang-format on
}
function maybeRenderFrameTree(frameTreeData) {
    if (!frameTreeData || (frameTreeData.frameCount === 0 && frameTreeData.issueCount === 0)) {
        return nothing;
    }
    function renderFrameTreeNode(node) {
        // clang-format off
        return html `
      <li role="treeitem" class="text-ellipsis">
        ${node.iconName ? html `
          <devtools-icon class="inline-icon extra-large" .name=${node.iconName} style="margin-bottom: -3px;">
          </devtools-icon>
        ` : nothing}
        ${node.text}
        ${node.children?.length ? html `
          <ul role="group" hidden>
            ${node.children.map(child => renderFrameTreeNode(child))}
          </ul>` : nothing}
      </li>`;
        // clang-format on
    }
    let title = '';
    // The translation pipeline does not support nested plurals. We avoid this
    // here by pulling out the logic for one of the plurals into code instead.
    if (frameTreeData.frameCount === 1) {
        title = i18nString(UIStrings.issuesInSingleFrame, { n: frameTreeData.issueCount });
    }
    else {
        title = i18nString(UIStrings.issuesInMultipleFrames, { n: frameTreeData.issueCount, m: frameTreeData.frameCount });
    }
    // clang-format off
    return html `
    <devtools-report-key jslog=${VisualLogging.section('frames')}>${i18nString(UIStrings.framesTitle)}</devtools-report-key>
    <devtools-report-value>
      <devtools-tree .template=${html `
        <ul role="tree">
          <li role="treeitem" class="text-ellipsis">
            ${title}
            <ul role="group">
              ${renderFrameTreeNode(frameTreeData.node)}
            </ul>
          </li>
        </ul>
      `}>
      </devtools-tree>
    </devtools-report-value>`;
    // clang-format on
}
function renderBackForwardCacheStatus(status) {
    switch (status) {
        case true:
            // clang-format off
            return html `
        <devtools-report-section autofocus tabindex="-1">
          <div class="status extra-large">
            <devtools-icon class="inline-icon extra-large" name="check-circle" style="color: var(--icon-checkmark-green);">
            </devtools-icon>
          </div>
          ${i18nString(UIStrings.restoredFromBFCache)}
        </devtools-report-section>`;
        // clang-format on
        case false:
            // clang-format off
            return html `
        <devtools-report-section autofocus tabindex="-1">
          <div class="status">
            <devtools-icon class="inline-icon extra-large" name="clear">
            </devtools-icon>
          </div>
          ${i18nString(UIStrings.normalNavigation)}
        </devtools-report-section>`;
        // clang-format on
    }
    // clang-format off
    return html `
    <devtools-report-section autofocus tabindex="-1">
      ${i18nString(UIStrings.unknown)}
    </devtools-report-section>`;
    // clang-format on
}
function maybeRenderExplanations(explanations, explanationTree, reasonToFramesMap) {
    if (explanations.length === 0) {
        return nothing;
    }
    const pageSupportNeeded = explanations.filter(explanation => explanation.type === "PageSupportNeeded" /* Protocol.Page.BackForwardCacheNotRestoredReasonType.PageSupportNeeded */);
    const supportPending = explanations.filter(explanation => explanation.type === "SupportPending" /* Protocol.Page.BackForwardCacheNotRestoredReasonType.SupportPending */);
    const circumstantial = explanations.filter(explanation => explanation.type === "Circumstantial" /* Protocol.Page.BackForwardCacheNotRestoredReasonType.Circumstantial */);
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html `
    ${renderExplanations(i18nString(UIStrings.pageSupportNeeded), i18nString(UIStrings.pageSupportNeededExplanation), pageSupportNeeded, reasonToFramesMap)}
    ${renderExplanations(i18nString(UIStrings.supportPending), i18nString(UIStrings.supportPendingExplanation), supportPending, reasonToFramesMap)}
    ${renderExplanations(i18nString(UIStrings.circumstantial), i18nString(UIStrings.circumstantialExplanation), circumstantial, reasonToFramesMap)}`;
    // clang-format on
}
function renderExplanations(category, explainerText, explanations, reasonToFramesMap) {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html `
    ${explanations.length > 0 ? html `
      <devtools-report-section-header>
        ${category}
        <div class="help-outline-icon">
          <devtools-icon class="inline-icon medium" name="help" title=${explainerText}>
          </devtools-icon>
        </div>
      </devtools-report-section-header>
      ${explanations.map(explanation => renderReason(explanation, reasonToFramesMap.get(explanation.reason)))}
    ` : nothing}`;
    // clang-format on
}
function maybeRenderReasonContext(explanation) {
    if (explanation.reason ===
        "EmbedderExtensionSentMessageToCachedFrame" /* Protocol.Page.BackForwardCacheNotRestoredReason.EmbedderExtensionSentMessageToCachedFrame */ &&
        explanation.context) {
        const link = 'chrome://extensions/?id=' + explanation.context;
        // clang-format off
        return html `${i18nString(UIStrings.blockingExtensionId)}
      <devtools-chrome-link .href=${link}>${explanation.context}</devtools-chrome-link>`;
        // clang-format on
    }
    return nothing;
}
function renderFramesPerReason(frames) {
    if (frames === undefined || frames.length === 0) {
        return nothing;
    }
    const rows = [html `<div>${i18nString(UIStrings.framesPerIssue, { n: frames.length })}</div>`];
    rows.push(...frames.map(url => html `<div class="text-ellipsis" title=${url}
    jslog=${VisualLogging.treeItem()}>${url}</div>`));
    return html `
      <div class="details-list"
      jslog=${VisualLogging.tree('frames-per-issue')}>
        <devtools-expandable-list .data=${{
        rows,
        title: i18nString(UIStrings.framesPerIssue, { n: frames.length }),
    }}
        jslog=${VisualLogging.treeItem()}></devtools-expandable-list>
      </div>
    `;
}
function maybeRenderDeepLinkToUnload(explanation) {
    if (explanation.reason === "UnloadHandlerExistsInMainFrame" /* Protocol.Page.BackForwardCacheNotRestoredReason.UnloadHandlerExistsInMainFrame */ ||
        explanation.reason === "UnloadHandlerExistsInSubFrame" /* Protocol.Page.BackForwardCacheNotRestoredReason.UnloadHandlerExistsInSubFrame */) {
        return html `
        <x-link href="https://web.dev/bfcache/#never-use-the-unload-event" class="link"
        jslog=${VisualLogging.action('learn-more.never-use-unload').track({
            click: true,
        })}>
          ${i18nString(UIStrings.neverUseUnload)}
        </x-link>`;
    }
    return nothing;
}
function maybeRenderJavaScriptDetails(details) {
    if (details === undefined || details.length === 0) {
        return nothing;
    }
    const maxLengthForDisplayedURLs = 50;
    const linkifier = new Components.Linkifier.Linkifier(maxLengthForDisplayedURLs);
    const rows = [html `<div>${i18nString(UIStrings.filesPerIssue, { n: details.length })}</div>`];
    rows.push(...details.map(detail => html `${linkifier.linkifyScriptLocation(null, null, detail.url, detail.lineNumber, {
        columnNumber: detail.columnNumber,
        showColumnNumber: true,
        inlineFrameIndex: 0,
    })}`));
    return html `
      <div class="details-list">
        <devtools-expandable-list .data=${{ rows }}></devtools-expandable-list>
      </div>
    `;
}
function renderReason(explanation, frames) {
    // clang-format off
    return html `
    <devtools-report-section>
      ${(explanation.reason in NotRestoredReasonDescription) ?
        html `
          <div class="circled-exclamation-icon">
            <devtools-icon class="inline-icon medium" style="color: var(--icon-warning)" name="warning">
            </devtools-icon>
          </div>
          <div>
            ${NotRestoredReasonDescription[explanation.reason].name()}
            ${maybeRenderDeepLinkToUnload(explanation)}
            ${maybeRenderReasonContext(explanation)}
          </div>` :
        nothing}
    </devtools-report-section>
    <div class="gray-text">
      ${explanation.reason}
    </div>
    ${maybeRenderJavaScriptDetails(explanation.details)}
    ${renderFramesPerReason(frames)}`;
    // clang-format on
}
const DEFAULT_VIEW = (input, output, target) => {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html `
    <style>${backForwardCacheViewStyles}</style>
    <devtools-report .data=${{ reportTitle: i18nString(UIStrings.backForwardCacheTitle) }} jslog=${VisualLogging.pane('back-forward-cache')}>

      ${renderMainFrameInformation(input.frame, input.frameTreeData, input.reasonToFramesMap, input.screenStatus, input.navigateAwayAndBack)}
    </devtools-report>
  `, target);
    // clang-format on
};
export class BackForwardCacheView extends UI.Widget.Widget {
    #screenStatus = "Result" /* ScreenStatusType.RESULT */;
    #historyIndex = 0;
    #view;
    constructor(view = DEFAULT_VIEW) {
        super({ useShadowDom: true, delegatesFocus: true });
        this.#view = view;
        this.#getMainResourceTreeModel()?.addEventListener(SDK.ResourceTreeModel.Events.PrimaryPageChanged, this.requestUpdate, this);
        this.#getMainResourceTreeModel()?.addEventListener(SDK.ResourceTreeModel.Events.BackForwardCacheDetailsUpdated, this.requestUpdate, this);
        this.requestUpdate();
    }
    #getMainResourceTreeModel() {
        const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        return mainTarget?.model(SDK.ResourceTreeModel.ResourceTreeModel) || null;
    }
    #getMainFrame() {
        return this.#getMainResourceTreeModel()?.mainFrame || null;
    }
    async performUpdate() {
        const reasonToFramesMap = new Map();
        const frame = this.#getMainFrame();
        const explanationTree = frame?.backForwardCacheDetails?.explanationsTree;
        if (explanationTree) {
            this.#buildReasonToFramesMap(explanationTree, { blankCount: 1 }, reasonToFramesMap);
        }
        const frameTreeData = this.#buildFrameTreeDataRecursive(explanationTree, { blankCount: 1 });
        // Override the icon for the outermost frame.
        frameTreeData.node.iconName = 'frame';
        const viewInput = {
            frame,
            frameTreeData,
            reasonToFramesMap,
            screenStatus: this.#screenStatus,
            navigateAwayAndBack: this.#navigateAwayAndBack.bind(this),
        };
        this.#view(viewInput, undefined, this.contentElement);
    }
    #renderBackForwardCacheTestResult() {
        SDK.TargetManager.TargetManager.instance().removeModelListener(SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.FrameNavigated, this.#renderBackForwardCacheTestResult, this);
        this.#screenStatus = "Result" /* ScreenStatusType.RESULT */;
        this.requestUpdate();
        void this.updateComplete.then(() => {
            UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.testCompleted));
            this.contentElement.focus();
        });
    }
    async #onNavigatedAway() {
        SDK.TargetManager.TargetManager.instance().removeModelListener(SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.FrameNavigated, this.#onNavigatedAway, this);
        await this.#waitAndGoBackInHistory(50);
    }
    async #waitAndGoBackInHistory(delay) {
        const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        const resourceTreeModel = mainTarget?.model(SDK.ResourceTreeModel.ResourceTreeModel);
        const historyResults = await resourceTreeModel?.navigationHistory();
        if (!resourceTreeModel || !historyResults) {
            return;
        }
        // The navigation history can be delayed. If this is the case we wait and
        // check again later. Otherwise it would be possible to press the 'Test
        // BFCache' button again too soon, leading to the browser stepping back in
        // history without returning to the correct page.
        if (historyResults.currentIndex === this.#historyIndex) {
            window.setTimeout(this.#waitAndGoBackInHistory.bind(this, delay * 2), delay);
        }
        else {
            SDK.TargetManager.TargetManager.instance().addModelListener(SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.FrameNavigated, this.#renderBackForwardCacheTestResult, this);
            resourceTreeModel.navigateToHistoryEntry(historyResults.entries[historyResults.currentIndex - 1]);
        }
    }
    async #navigateAwayAndBack() {
        // Checking BFCache Compatibility
        const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        const resourceTreeModel = mainTarget?.model(SDK.ResourceTreeModel.ResourceTreeModel);
        const historyResults = await resourceTreeModel?.navigationHistory();
        if (!resourceTreeModel || !historyResults) {
            return;
        }
        this.#historyIndex = historyResults.currentIndex;
        this.#screenStatus = "Running" /* ScreenStatusType.RUNNING */;
        this.requestUpdate();
        // This event listener is removed inside of onNavigatedAway().
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.FrameNavigated, this.#onNavigatedAway, this);
        // We can know whether the current page can use BFCache
        // as the browser navigates to another unrelated page and goes back to the current page.
        // We chose "chrome://terms" because it must be cross-site.
        // Ideally, We want to have our own testing page like "chrome: //bfcache-test".
        void resourceTreeModel.navigate('chrome://terms');
    }
    // Builds a subtree of the frame tree, conaining only frames with BFCache issues and their ancestors.
    // Returns the root node, the number of frames in the subtree, and the number of issues in the subtree.
    #buildFrameTreeDataRecursive(explanationTree, nextBlankURLCount) {
        if (!explanationTree) {
            return { node: { text: '' }, frameCount: 0, issueCount: 0 };
        }
        let frameCount = 1;
        let issueCount = 0;
        const children = [];
        let nodeUrlText = '';
        if (explanationTree.url.length) {
            nodeUrlText = explanationTree.url;
        }
        else {
            nodeUrlText = i18nString(UIStrings.blankURLTitle, { PH1: nextBlankURLCount.blankCount });
            nextBlankURLCount.blankCount += 1;
        }
        for (const explanation of explanationTree.explanations) {
            const child = { text: explanation.reason };
            issueCount += 1;
            children.push(child);
        }
        for (const child of explanationTree.children) {
            const frameTreeData = this.#buildFrameTreeDataRecursive(child, nextBlankURLCount);
            if (frameTreeData.issueCount > 0) {
                children.push(frameTreeData.node);
                issueCount += frameTreeData.issueCount;
                frameCount += frameTreeData.frameCount;
            }
        }
        let node = {
            text: `(${issueCount}) ${nodeUrlText}`,
        };
        if (children.length) {
            node = { ...node, children };
            node.iconName = 'iframe';
        }
        else if (!explanationTree.url.length) {
            // If the current node increased the blank count, but it has no children and
            // is therefore not shown, decrement the blank count again.
            nextBlankURLCount.blankCount -= 1;
        }
        return { node, frameCount, issueCount };
    }
    #buildReasonToFramesMap(explanationTree, nextBlankURLCount, outputMap) {
        let url = explanationTree.url;
        if (url.length === 0) {
            url = i18nString(UIStrings.blankURLTitle, { PH1: nextBlankURLCount.blankCount });
            nextBlankURLCount.blankCount += 1;
        }
        explanationTree.explanations.forEach(explanation => {
            let frames = outputMap.get(explanation.reason);
            if (frames === undefined) {
                frames = [url];
                outputMap.set(explanation.reason, frames);
            }
            else {
                frames.push(url);
            }
        });
        explanationTree.children.map(child => {
            this.#buildReasonToFramesMap(child, nextBlankURLCount, outputMap);
        });
    }
}
//# sourceMappingURL=BackForwardCacheView.js.map