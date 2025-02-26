// Copyright (c) 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/chrome_link/chrome_link.js';
import '../../../ui/components/expandable_list/expandable_list.js';
import '../../../ui/components/report_view/report_view.js';
import '../../../ui/components/tree_outline/tree_outline.js';

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Protocol from '../../../generated/protocol.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import type * as ExpandableList from '../../../ui/components/expandable_list/expandable_list.js';
import type * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as LegacyWrapper from '../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import type * as ReportView from '../../../ui/components/report_view/report_view.js';
import type * as TreeOutline from '../../../ui/components/tree_outline/tree_outline.js';
import * as Components from '../../../ui/legacy/components/utils/utils.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import {NotRestoredReasonDescription} from './BackForwardCacheStrings.js';
import backForwardCacheViewStylesRaw from './backForwardCacheView.css.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const backForwardCacheViewStyles = new CSSStyleSheet();
backForwardCacheViewStyles.replaceSync(backForwardCacheViewStylesRaw.cssContent);

const {html} = Lit;

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
  url: 'URL:',
  /**
   * @description Status text for the status of the back/forward cache status
   */
  unknown: 'Unknown Status',
  /**
   * @description Status text for the status of the back/forward cache status indicating that
   * the back/forward cache was not used and a normal navigation occured instead.
   */
  normalNavigation:
      'Not served from back/forward cache: to trigger back/forward cache, use Chrome\'s back/forward buttons, or use the test button below to automatically navigate away and back.',
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
   * @description Explanation for actionable items which prevent the page from being eligible
   * for back/forward cache.
   */
  pageSupportNeededExplanation:
      'These reasons are actionable i.e. they can be cleaned up to make the page eligible for back/forward cache.',
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
  circumstantialExplanation:
      'These reasons are not actionable i.e. caching was prevented by something outside of the direct control of the page.',
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
  supportPendingExplanation:
      'Chrome support for these reasons is pending i.e. they will not prevent the page from being eligible for back/forward cache in a future version of Chrome.',
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
   *@description Title for a frame in the frame tree that doesn't have a URL. Placeholder indicates which number frame with a blank URL it is.
   *@example {3} PH1
   */
  blankURLTitle: 'Blank URL [{PH1}]',
  /**
   * @description Shows the number of files with a particular issue.
   */
  filesPerIssue: '{n, plural, =1 {# file} other {# files}}',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/application/components/BackForwardCacheView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const enum ScreenStatusType {
  RUNNING = 'Running',
  RESULT = 'Result',
}

export class BackForwardCacheView extends LegacyWrapper.LegacyWrapper.WrappableComponent {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #screenStatus = ScreenStatusType.RESULT;
  #nextNodeId = 0;
  #historyIndex = 0;

  constructor() {
    super();
    this.#getMainResourceTreeModel()?.addEventListener(
        SDK.ResourceTreeModel.Events.PrimaryPageChanged, this.render, this);
    this.#getMainResourceTreeModel()?.addEventListener(
        SDK.ResourceTreeModel.Events.BackForwardCacheDetailsUpdated, this.render, this);
  }

  #getMainResourceTreeModel(): SDK.ResourceTreeModel.ResourceTreeModel|null {
    const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    return mainTarget?.model(SDK.ResourceTreeModel.ResourceTreeModel) || null;
  }

  #getMainFrame(): SDK.ResourceTreeModel.ResourceTreeFrame|null {
    return this.#getMainResourceTreeModel()?.mainFrame || null;
  }
  connectedCallback(): void {
    this.parentElement?.classList.add('overflow-auto');
    this.#shadow.adoptedStyleSheets = [backForwardCacheViewStyles];
  }

  override async render(): Promise<void> {
    await RenderCoordinator.write('BackForwardCacheView render', () => {
      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      Lit.render(html`
        <devtools-report .data=${
            {reportTitle: i18nString(UIStrings.backForwardCacheTitle)} as ReportView.ReportView.ReportData
        } jslog=${VisualLogging.pane('back-forward-cache')}>

          ${this.#renderMainFrameInformation()}
        </devtools-report>
      `, this.#shadow, {host: this});
      // clang-format on
    });
  }

  #renderBackForwardCacheTestResult(): void {
    SDK.TargetManager.TargetManager.instance().removeModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.FrameNavigated,
        this.#renderBackForwardCacheTestResult, this);
    this.#screenStatus = ScreenStatusType.RESULT;
    void this.render();
  }

  async #onNavigatedAway(): Promise<void> {
    SDK.TargetManager.TargetManager.instance().removeModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.FrameNavigated, this.#onNavigatedAway,
        this);
    await this.#waitAndGoBackInHistory(50);
  }

  async #waitAndGoBackInHistory(delay: number): Promise<void> {
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
    } else {
      SDK.TargetManager.TargetManager.instance().addModelListener(
          SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.FrameNavigated,
          this.#renderBackForwardCacheTestResult, this);
      resourceTreeModel.navigateToHistoryEntry(historyResults.entries[historyResults.currentIndex - 1]);
    }
  }

  async #navigateAwayAndBack(): Promise<void> {
    // Checking BFCache Compatibility

    const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    const resourceTreeModel = mainTarget?.model(SDK.ResourceTreeModel.ResourceTreeModel);
    const historyResults = await resourceTreeModel?.navigationHistory();
    if (!resourceTreeModel || !historyResults) {
      return;
    }
    this.#historyIndex = historyResults.currentIndex;
    this.#screenStatus = ScreenStatusType.RUNNING;
    void this.render();

    // This event listener is removed inside of onNavigatedAway().
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.FrameNavigated, this.#onNavigatedAway,
        this);

    // We can know whether the current page can use BFCache
    // as the browser navigates to another unrelated page and goes back to the current page.
    // We chose "chrome://terms" because it must be cross-site.
    // Ideally, We want to have our own testing page like "chrome: //bfcache-test".
    void resourceTreeModel.navigate('chrome://terms' as Platform.DevToolsPath.UrlString);
  }

  #renderMainFrameInformation(): Lit.TemplateResult {
    const frame = this.#getMainFrame();
    if (!frame) {
      // clang-format off
      return html`
        <devtools-report-key>
          ${i18nString(UIStrings.mainFrame)}
        </devtools-report-key>
        <devtools-report-value>
          ${i18nString(UIStrings.unavailable)}
        </devtools-report-value>
      `;
      // clang-format on
    }
    const isTestRunning = (this.#screenStatus === ScreenStatusType.RUNNING);
    // Prevent running BFCache test on the DevTools window itself via DevTools on DevTools
    const isTestingForbidden = Common.ParsedURL.schemeIs(frame.url, 'devtools:');
    // clang-format off
    return html`
      ${this.#renderBackForwardCacheStatus(frame.backForwardCacheDetails.restoredFromCache)}
      <div class="report-line">
        <div class="report-key">
          ${i18nString(UIStrings.url)}
        </div>
        <div class="report-value" title=${frame.url}>
          ${frame.url}
        </div>
      </div>
      ${this.#maybeRenderFrameTree(frame.backForwardCacheDetails.explanationsTree)}
      <devtools-report-section>
        <devtools-button
          aria-label=${i18nString(UIStrings.runTest)}
          .disabled=${isTestRunning || isTestingForbidden}
          .spinner=${isTestRunning}
          .variant=${Buttons.Button.Variant.PRIMARY}
          @click=${this.#navigateAwayAndBack}
          jslog=${VisualLogging.action('back-forward-cache.run-test').track({click: true})}>
          ${isTestRunning ? html`
            ${i18nString(UIStrings.runningTest)}`:`
            ${i18nString(UIStrings.runTest)}
          `}
        </devtools-button>
      </devtools-report-section>
      <devtools-report-divider>
      </devtools-report-divider>
      ${this.#maybeRenderExplanations(frame.backForwardCacheDetails.explanations,
          frame.backForwardCacheDetails.explanationsTree)}
      <devtools-report-section>
        <x-link href="https://web.dev/bfcache/" class="link"
        jslog=${VisualLogging.action('learn-more.eligibility').track({click: true})}>
          ${i18nString(UIStrings.learnMore)}
        </x-link>
      </devtools-report-section>
    `;
    // clang-format on
  }

  #maybeRenderFrameTree(explanationTree: Protocol.Page.BackForwardCacheNotRestoredExplanationTree|
                        undefined): Lit.LitTemplate {
    if (!explanationTree || (explanationTree.explanations.length === 0 && explanationTree.children.length === 0)) {
      return Lit.nothing;
    }

    function treeNodeRenderer(node: TreeOutline.TreeOutlineUtils.TreeNode<FrameTreeNodeData>): Lit.TemplateResult {
      // clang-format off
      return html`
        <div class="text-ellipsis">
          ${node.treeNodeData.iconName ? html`
            <devtools-icon class="inline-icon" style="margin-bottom: -3px;" .data=${{
              iconName: node.treeNodeData.iconName,
              color: 'var(--icon-default)',
              width: '20px',
              height: '20px',
            } as IconButton.Icon.IconData}>
            </devtools-icon>
          ` : Lit.nothing}
          ${node.treeNodeData.text}
        </div>
      `;
      // clang-format on
    }

    const frameTreeData = this.#buildFrameTreeDataRecursive(explanationTree, {blankCount: 1});
    // Override the icon for the outermost frame.
    frameTreeData.node.treeNodeData.iconName = 'frame';
    let title = '';
    // The translation pipeline does not support nested plurals. We avoid this
    // here by pulling out the logic for one of the plurals into code instead.
    if (frameTreeData.frameCount === 1) {
      title = i18nString(UIStrings.issuesInSingleFrame, {n: frameTreeData.issueCount});
    } else {
      title = i18nString(UIStrings.issuesInMultipleFrames, {n: frameTreeData.issueCount, m: frameTreeData.frameCount});
    }
    const root: TreeOutline.TreeOutlineUtils.TreeNode<FrameTreeNodeData> = {
      treeNodeData: {
        text: title,
      },
      id: 'root',
      children: () => Promise.resolve([frameTreeData.node]),
    };

    // clang-format off
    return html`
      <div class="report-line"
      jslog=${VisualLogging.section('frames')}>
        <div class="report-key">
          ${i18nString(UIStrings.framesTitle)}
        </div>
        <div class="report-value">
          <devtools-tree-outline .data=${{
            tree: [root],
            defaultRenderer: treeNodeRenderer,
            compact: true,
          } as TreeOutline.TreeOutline.TreeOutlineData<FrameTreeNodeData>}>
          </devtools-tree-outline>
        </div>
      </div>
    `;
    // clang-format on
  }

  // Builds a subtree of the frame tree, conaining only frames with BFCache issues and their ancestors.
  // Returns the root node, the number of frames in the subtree, and the number of issues in the subtree.
  #buildFrameTreeDataRecursive(
      explanationTree: Protocol.Page.BackForwardCacheNotRestoredExplanationTree,
      nextBlankURLCount: {blankCount: number}):
      {node: TreeOutline.TreeOutlineUtils.TreeNode<FrameTreeNodeData>, frameCount: number, issueCount: number} {
    let frameCount = 1;
    let issueCount = 0;
    const children: Array<TreeOutline.TreeOutlineUtils.TreeNode<FrameTreeNodeData>> = [];

    let nodeUrlText = '';
    if (explanationTree.url.length) {
      nodeUrlText = explanationTree.url;
    } else {
      nodeUrlText = i18nString(UIStrings.blankURLTitle, {PH1: nextBlankURLCount.blankCount});
      nextBlankURLCount.blankCount += 1;
    }

    for (const explanation of explanationTree.explanations) {
      const child = {treeNodeData: {text: explanation.reason}, id: String(this.#nextNodeId++)};
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

    let node: TreeOutline.TreeOutlineUtils.TreeNode<FrameTreeNodeData> = {
      treeNodeData: {
        text: `(${issueCount}) ${nodeUrlText}`,
      },
      id: String(this.#nextNodeId++),
    };
    if (children.length) {
      node = {
        ...node,
        children: () => Promise.resolve(children),
      };
      node.treeNodeData.iconName = 'iframe';
    } else if (!explanationTree.url.length) {
      // If the current node increased the blank count, but it has no children and
      // is therefore not shown, decrement the blank count again.
      nextBlankURLCount.blankCount -= 1;
    }
    return {node, frameCount, issueCount};
  }

  #renderBackForwardCacheStatus(status: boolean|undefined): Lit.TemplateResult {
    switch (status) {
      case true:
        // clang-format off
        return html`
          <devtools-report-section>
            <div class="status">
              <devtools-icon class="inline-icon" .data=${{
                iconName: 'check-circle',
                color: 'var(--icon-checkmark-green)',
                width: '20px',
                height: '20px',
                } as IconButton.Icon.IconData}>
              </devtools-icon>
            </div>
            ${i18nString(UIStrings.restoredFromBFCache)}
          </devtools-report-section>
        `;
        // clang-format on
      case false:
        // clang-format off
        return html`
          <devtools-report-section>
            <div class="status">
              <devtools-icon class="inline-icon" .data=${{
                  iconName: 'clear',
                  color: 'var(--icon-default)',
                  width: '20px',
                  height: '20px',
                  } as IconButton.Icon.IconData}>
              </devtools-icon>
            </div>
            ${i18nString(UIStrings.normalNavigation)}
          </devtools-report-section>
        `;
        // clang-format on
    }
    // clang-format off
    return html`
    <devtools-report-section>
      ${i18nString(UIStrings.unknown)}
    </devtools-report-section>
    `;
    // clang-format on
  }

  #buildReasonToFramesMap(
      explanationTree: Protocol.Page.BackForwardCacheNotRestoredExplanationTree,
      nextBlankURLCount: {blankCount: number},
      outputMap: Map<Protocol.Page.BackForwardCacheNotRestoredReason, string[]>): void {
    let url = explanationTree.url;
    if (url.length === 0) {
      url = i18nString(UIStrings.blankURLTitle, {PH1: nextBlankURLCount.blankCount});
      nextBlankURLCount.blankCount += 1;
    }
    explanationTree.explanations.forEach(explanation => {
      let frames: string[]|undefined = outputMap.get(explanation.reason);
      if (frames === undefined) {
        frames = [url];
        outputMap.set(explanation.reason, frames);
      } else {
        frames.push(url);
      }
    });
    explanationTree.children.map(child => {
      this.#buildReasonToFramesMap(child, nextBlankURLCount, outputMap);
    });
  }

  #maybeRenderExplanations(
      explanations: Protocol.Page.BackForwardCacheNotRestoredExplanation[],
      explanationTree: Protocol.Page.BackForwardCacheNotRestoredExplanationTree|undefined): Lit.LitTemplate {
    if (explanations.length === 0) {
      return Lit.nothing;
    }

    const pageSupportNeeded = explanations.filter(
        explanation => explanation.type === Protocol.Page.BackForwardCacheNotRestoredReasonType.PageSupportNeeded);
    const supportPending = explanations.filter(
        explanation => explanation.type === Protocol.Page.BackForwardCacheNotRestoredReasonType.SupportPending);
    const circumstantial = explanations.filter(
        explanation => explanation.type === Protocol.Page.BackForwardCacheNotRestoredReasonType.Circumstantial);

    const reasonToFramesMap = new Map<Protocol.Page.BackForwardCacheNotRestoredReason, string[]>();
    if (explanationTree) {
      this.#buildReasonToFramesMap(explanationTree, {blankCount: 1}, reasonToFramesMap);
    }
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      ${this.#renderExplanations(i18nString(UIStrings.pageSupportNeeded), i18nString(UIStrings.pageSupportNeededExplanation), pageSupportNeeded, reasonToFramesMap)}
      ${this.#renderExplanations(i18nString(UIStrings.supportPending), i18nString(UIStrings.supportPendingExplanation), supportPending, reasonToFramesMap)}
      ${this.#renderExplanations(i18nString(UIStrings.circumstantial), i18nString(UIStrings.circumstantialExplanation), circumstantial, reasonToFramesMap)}
    `;
    // clang-format on
  }

  #renderExplanations(
      category: Platform.UIString.LocalizedString, explainerText: Platform.UIString.LocalizedString,
      explanations: Protocol.Page.BackForwardCacheNotRestoredExplanation[],
      reasonToFramesMap: Map<Protocol.Page.BackForwardCacheNotRestoredReason, string[]>): Lit.TemplateResult {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      ${explanations.length > 0 ? html`
        <devtools-report-section-header>
          ${category}
          <div class="help-outline-icon">
            <devtools-icon class="inline-icon" .data=${{
              iconName: 'help',
              color: 'var(--icon-default)',
              width: '16px',
              height: '16px',
              } as IconButton.Icon.IconData} title=${explainerText}>
            </devtools-icon>
          </div>
        </devtools-report-section-header>
        ${explanations.map(explanation => this.#renderReason(explanation, reasonToFramesMap.get(explanation.reason)))}
      ` : Lit.nothing}
    `;
    // clang-format on
  }

  #maybeRenderReasonContext(explanation: Protocol.Page.BackForwardCacheNotRestoredExplanation): Lit.LitTemplate {
    if (explanation.reason ===
            Protocol.Page.BackForwardCacheNotRestoredReason.EmbedderExtensionSentMessageToCachedFrame &&
        explanation.context) {
      const link = 'chrome://extensions/?id=' + explanation.context as Platform.DevToolsPath.UrlString;
      // clang-format off
    return html`${i18nString(UIStrings.blockingExtensionId)}
      <devtools-chrome-link .href=${link}>${explanation.context}</devtools-chrome-link>`;
      // clang-format on
    }
    return Lit.nothing;
  }

  #renderFramesPerReason(frames: string[]|undefined): Lit.LitTemplate {
    if (frames === undefined || frames.length === 0) {
      return Lit.nothing;
    }
    const rows = [html`<div>${i18nString(UIStrings.framesPerIssue, {n: frames.length})}</div>`];
    rows.push(...frames.map(url => html`<div class="text-ellipsis" title=${url}
    jslog=${VisualLogging.treeItem()}>${url}</div>`));
    return html`
      <div class="details-list"
      jslog=${VisualLogging.tree('frames-per-issue')}>
        <devtools-expandable-list .data=${{
      rows,
      title: i18nString(UIStrings.framesPerIssue, {n: frames.length}),
    } as ExpandableList.ExpandableList.ExpandableListData}
        jslog=${VisualLogging.treeItem()}></devtools-expandable-list>
      </div>
    `;
  }

  #maybeRenderDeepLinkToUnload(explanation: Protocol.Page.BackForwardCacheNotRestoredExplanation): Lit.LitTemplate {
    if (explanation.reason === Protocol.Page.BackForwardCacheNotRestoredReason.UnloadHandlerExistsInMainFrame ||
        explanation.reason === Protocol.Page.BackForwardCacheNotRestoredReason.UnloadHandlerExistsInSubFrame) {
      return html`
        <x-link href="https://web.dev/bfcache/#never-use-the-unload-event" class="link"
        jslog=${VisualLogging.action('learn-more.never-use-unload').track({
        click: true,
      })}>
          ${i18nString(UIStrings.neverUseUnload)}
        </x-link>`;
    }
    return Lit.nothing;
  }

  #maybeRenderJavaScriptDetails(details: Protocol.Page.BackForwardCacheBlockingDetails[]|undefined): Lit.LitTemplate {
    if (details === undefined || details.length === 0) {
      return Lit.nothing;
    }
    const maxLengthForDisplayedURLs = 50;
    const linkifier = new Components.Linkifier.Linkifier(maxLengthForDisplayedURLs);
    const rows = [html`<div>${i18nString(UIStrings.filesPerIssue, {n: details.length})}</div>`];
    rows.push(...details.map(
        detail => html`${
            linkifier.linkifyScriptLocation(
                null, null, detail.url as Platform.DevToolsPath.UrlString, detail.lineNumber, {
                  columnNumber: detail.columnNumber,
                  showColumnNumber: true,
                  inlineFrameIndex: 0,
                })}`));
    return html`
      <div class="details-list">
        <devtools-expandable-list .data=${
        {rows} as ExpandableList.ExpandableList.ExpandableListData}></devtools-expandable-list>
      </div>
    `;
  }

  #renderReason(explanation: Protocol.Page.BackForwardCacheNotRestoredExplanation, frames: string[]|undefined):
      Lit.TemplateResult {
    // clang-format off
    return html`
      <devtools-report-section>
        ${(explanation.reason in NotRestoredReasonDescription) ?
          html`
            <div class="circled-exclamation-icon">
              <devtools-icon class="inline-icon" .data=${{
                iconName: 'warning',
                color: 'var(--icon-warning)',
                width: '16px',
                height: '16px',
              } as IconButton.Icon.IconData}>
              </devtools-icon>
            </div>
            <div>
              ${NotRestoredReasonDescription[explanation.reason].name()}
              ${this.#maybeRenderDeepLinkToUnload(explanation)}
              ${this.#maybeRenderReasonContext(explanation)}
           </div>` :
            Lit.nothing}
      </devtools-report-section>
      <div class="gray-text">
        ${explanation.reason}
      </div>
      ${this.#maybeRenderJavaScriptDetails(explanation.details)}
      ${this.#renderFramesPerReason(frames)}
    `;
    // clang-format on
  }
}

interface FrameTreeNodeData {
  text: string;
  iconName?: string;
}

customElements.define('devtools-resources-back-forward-cache-view', BackForwardCacheView);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-resources-back-forward-cache-view': BackForwardCacheView;
  }
}
