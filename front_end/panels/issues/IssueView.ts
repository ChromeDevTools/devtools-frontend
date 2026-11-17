// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/components/adorners/adorners.js';
import '../../ui/components/request_link_icon/request_link_icon.js';
import '../../ui/kit/kit.js';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Protocol from '../../generated/protocol.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import type * as Logs from '../../models/logs/logs.js';
import * as NetworkForward from '../../panels/network/forward/forward.js';
import * as IssueCounter from '../../ui/components/issue_counter/issue_counter.js';
import * as MarkdownView from '../../ui/components/markdown_view/markdown_view.js';
import type * as RequestLinkIcon from '../../ui/components/request_link_icon/request_link_icon.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, type LitTemplate, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {AffectedBlockedByResponseView} from './AffectedBlockedByResponseView.js';
import {AffectedCookiesView, AffectedRawCookieLinesView} from './AffectedCookiesView.js';
import {AffectedDescendantsWithinSelectElementView} from './AffectedDescendantsWithinSelectElementView.js';
import {AffectedDirectivesView} from './AffectedDirectivesView.js';
import {AffectedDocumentsInQuirksModeView} from './AffectedDocumentsInQuirksModeView.js';
import {AffectedElementsView} from './AffectedElementsView.js';
import {AffectedHeavyAdView} from './AffectedHeavyAdView.js';
import {AffectedLazyLoadImagesView} from './AffectedLazyLoadImagesView.js';
import {AffectedMetadataAllowedSitesView} from './AffectedMetadataAllowedSitesView.js';
import {AffectedPartitioningBlobURLView} from './AffectedPartitioningBlobURLView.js';
import {AffectedPermissionElementsView} from './AffectedPermissionElementsView.js';
import {AffectedItem, AffectedResourcesView, extractShortPath} from './AffectedResourcesView.js';
import {AffectedSelectivePermissionsInterventionView} from './AffectedSelectivePermissionsInterventionView.js';
import {AffectedSharedArrayBufferIssueDetailsView} from './AffectedSharedArrayBufferIssueDetailsView.js';
import {AffectedSourcesView} from './AffectedSourcesView.js';
import {AffectedTrackingSitesView} from './AffectedTrackingSitesView.js';
import * as Components from './components/components.js';
import {CorsIssueDetailsView} from './CorsIssueDetailsView.js';
import {GenericIssueDetailsView} from './GenericIssueDetailsView.js';

const {ifDefined} = Directives;
const {widget} = UI.Widget;

const UIStrings = {
  /**
   * @description Column header in the Issues panel for the resource name in the mixed content affected resources table.
   */
  name: 'Name',
  /**
   * @description Resolution status in the Issues panel indicating that a mixed content resource was blocked.
   */
  blocked: 'Blocked',
  /**
   * @description Label in the Issues panel for the number of affected network requests.
   */
  nRequests: '{n, plural, =1 {# request} other {# requests}}',
  /**
   * @description Label in the Issues panel for the number of affected mixed content resources.
   */
  nResources: '{n, plural, =1 {# resource} other {# resources}}',
  /**
   * @description Column header in the Issues panel for the restriction status of a mixed content resource.
   */
  restrictionStatus: 'Restriction status',
  /**
   * @description Resolution status in the Issues panel indicating that a mixed content resource produced a warning.
   */
  warned: 'Warned',
  /**
   * @description Header in the Issues panel for the section listing affected resources for an issue.
   */
  affectedResources: 'Affected resources',
  /**
   * @description Link text in the Issues panel to learn more about an issue.
   * @example {SameSite Cookies Explained} PH1
   */
  learnMoreS: 'Learn more: {PH1}',
  /**
   * @description Resolution status in the Issues panel indicating that a mixed content resource was automatically upgraded to HTTPS.
   */
  automaticallyUpgraded: 'Automatically upgraded',
  /**
   * @description Context menu item in the Issues panel to hide issues of the same type.
   */
  hideIssuesLikeThis: 'Hide issues like this',
  /**
   * @description Context menu item in the Issues panel to unhide issues of the same type.
   */
  unhideIssuesLikeThis: 'Unhide issues like this',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/issues/IssueView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

/**
 * Data needed to render a request link cell in the affected resources tables.
 */
export interface RequestCellData {
  affectedRequest: Protocol.Audits.AffectedRequest;
  networkTab: NetworkForward.UIRequestLocation.UIRequestTabs;
}

function renderRequestCell(request: RequestCellData, requestResolver: Logs.RequestResolver.RequestResolver,
                           onRequestClick: () => void): LitTemplate {
  const data: RequestLinkIcon.RequestLinkIcon.RequestLinkIconData = {
    affectedRequest: request.affectedRequest,
    networkTab: request.networkTab,
    requestResolver,
    displayURL: true,
    additionalOnClickAction: onRequestClick,
  };
  // clang-format off
  return html`
    <td class="affected-resource-cell">
      <devtools-request-link-icon .data=${data}></devtools-request-link-icon>
    </td>
  `;
  // clang-format on
}

export interface RequestRowsViewInput {
  requests: RequestCellData[];
  requestResolver: Logs.RequestResolver.RequestResolver;
  onRequestClick: () => void;
}

export type RequestRowsView = (input: RequestRowsViewInput, output: undefined, target: HTMLElement) => void;

export const REQUEST_ROWS_VIEW: RequestRowsView = (input, _output, target) => {
  // clang-format off
  render(html`
    ${input.requests.map(request => html`
      <tr class="affected-resource-request"
          jslog=${VisualLogging.tableRow('affected-request')}
          data-network-request-id=${ifDefined(request.affectedRequest.requestId)}>
        ${renderRequestCell(request, input.requestResolver, input.onRequestClick)}
      </tr>
    `)}
  `, target);
  // clang-format on
};

class AffectedRequestsView extends AffectedResourcesView {
  readonly #view: RequestRowsView;

  constructor(parent: IssueView, issue: IssuesManager.IssueAggregator.AggregatedIssue, jslogContext: string,
              view: RequestRowsView = REQUEST_ROWS_VIEW) {
    super(parent, issue, jslogContext);
    this.#view = view;
  }

  #renderAffectedRequests(affectedRequests: Iterable<Protocol.Audits.AffectedRequest>): void {
    const category = this.issue.getCategory();
    const networkTab =
        issueTypeToNetworkHeaderMap.get(category) || NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT;
    const requests = Array.from(affectedRequests, affectedRequest => ({affectedRequest, networkTab}));
    const input: RequestRowsViewInput = {
      requests,
      requestResolver: this.requestResolver,
      onRequestClick: () => {
        Host.userMetrics.issuesPanelResourceOpened(category, AffectedItem.REQUEST);
      },
    };
    this.#view(input, undefined, this.affectedResources);
    this.updateAffectedResourceCount(requests.length);
  }

  protected getResourceNameWithCount(count: number): Platform.UIString.LocalizedString {
    return i18nString(UIStrings.nRequests, {n: count});
  }

  update(): void {
    this.requestResolver.clear();
    // If the issue has blockedByResponseDetails, the corresponding AffectedBlockedByResponseView
    // will take care of displaying the request.
    const hasBlockedByResponseDetails = Array.from(this.issue.getBlockedByResponseDetails()).length > 0;
    // The AffectedMixedContentView takes care of displaying the resources.
    const isMixedContent = this.issue.getCategory() === IssuesManager.Issue.IssueCategory.MIXED_CONTENT;
    this.#renderAffectedRequests(hasBlockedByResponseDetails || isMixedContent ? [] : this.issue.requests());
  }
}

const issueTypeToNetworkHeaderMap =
    new Map<IssuesManager.Issue.IssueCategory, NetworkForward.UIRequestLocation.UIRequestTabs>([
      [
        IssuesManager.Issue.IssueCategory.COOKIE,
        NetworkForward.UIRequestLocation.UIRequestTabs.COOKIES,
      ],
      [
        IssuesManager.Issue.IssueCategory.CROSS_ORIGIN_EMBEDDER_POLICY,
        NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT,
      ],
      [
        IssuesManager.Issue.IssueCategory.MIXED_CONTENT,
        NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT,
      ],
    ]);

export interface MixedContentRow {
  // Set when the mixed content resource is backed by a network request.
  request?: RequestCellData;
  insecureURL: string;
  shortPath: string;
  status: Platform.UIString.LocalizedString;
}

export interface MixedContentRowsViewInput {
  rows: MixedContentRow[];
  requestResolver: Logs.RequestResolver.RequestResolver;
  onRequestClick: () => void;
}

export type MixedContentRowsView = (input: MixedContentRowsViewInput, output: undefined, target: HTMLElement) => void;

export const MIXED_CONTENT_ROWS_VIEW: MixedContentRowsView = (input, _output, target) => {
  const renderResourceCell = (row: MixedContentRow): LitTemplate => {
    if (row.request) {
      return renderRequestCell(row.request, input.requestResolver, input.onRequestClick);
    }
    return html`<td class="affected-resource-mixed-content-info" title=${row.insecureURL}>${row.shortPath}</td>`;
  };

  // clang-format off
  render(html`
    <tr>
      <td class="affected-resource-header">${i18nString(UIStrings.name)}</td>
      <td class="affected-resource-header">${i18nString(UIStrings.restrictionStatus)}</td>
    </tr>
    ${input.rows.map(row => html`
      <tr class="affected-resource-mixed-content">
        ${renderResourceCell(row)}
        <td class="affected-resource-mixed-content-info">${row.status}</td>
      </tr>
    `)}
  `, target);
  // clang-format on
};

class AffectedMixedContentView extends AffectedResourcesView {
  readonly #view: MixedContentRowsView;

  constructor(parent: IssueView, issue: IssuesManager.IssueAggregator.AggregatedIssue, jslogContext: string,
              view: MixedContentRowsView = MIXED_CONTENT_ROWS_VIEW) {
    super(parent, issue, jslogContext);
    this.#view = view;
  }

  #renderAffectedMixedContentDetails(mixedContentIssues: Iterable<IssuesManager.MixedContentIssue.MixedContentIssue>):
      void {
    const networkTab = issueTypeToNetworkHeaderMap.get(this.issue.getCategory()) ||
        NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT;
    const rows = Array.from(mixedContentIssues, (issue): MixedContentRow => {
      const details = issue.details();
      return {
        request: details.request ? {affectedRequest: details.request, networkTab} : undefined,
        insecureURL: details.insecureURL,
        shortPath: extractShortPath(details.insecureURL as Platform.DevToolsPath.UrlString),
        status: AffectedMixedContentView.#translateStatus(details.resolutionStatus),
      };
    });
    const input: MixedContentRowsViewInput = {
      rows,
      requestResolver: this.requestResolver,
      onRequestClick: () => {
        Host.userMetrics.issuesPanelResourceOpened(IssuesManager.Issue.IssueCategory.MIXED_CONTENT,
                                                   AffectedItem.REQUEST);
      },
    };
    this.#view(input, undefined, this.affectedResources);
    this.updateAffectedResourceCount(rows.length);
  }

  protected getResourceNameWithCount(count: number): Platform.UIString.LocalizedString {
    return i18nString(UIStrings.nResources, {n: count});
  }

  static #translateStatus(resolutionStatus: Protocol.Audits.MixedContentResolutionStatus):
      Platform.UIString.LocalizedString {
    switch (resolutionStatus) {
      case Protocol.Audits.MixedContentResolutionStatus.MixedContentBlocked:
        return i18nString(UIStrings.blocked);
      case Protocol.Audits.MixedContentResolutionStatus.MixedContentAutomaticallyUpgraded:
        return i18nString(UIStrings.automaticallyUpgraded);
      case Protocol.Audits.MixedContentResolutionStatus.MixedContentWarning:
        return i18nString(UIStrings.warned);
    }
  }

  update(): void {
    this.requestResolver.clear();
    this.#renderAffectedMixedContentDetails(this.issue.getMixedContentIssues());
  }
}

type IssueBodyItemInput =|{
  kind: 'description',
  markdownData: MarkdownView.MarkdownView.MarkdownViewData,
  setSize: number,
}|{
  kind: 'affected-resources',
  setSize: number,
}|{
  kind: 'links',
  links: ReadonlyArray<{link: string, linkTitle: string}>,
};

function renderLinks(links: ReadonlyArray<{link: string, linkTitle: string}>): LitTemplate {
  // clang-format off
  return html`
    <ul class="link-list">
      ${links.map(({link, linkTitle}) => html`
        <li>
          <devtools-link class="link devtools-link" href=${link} jslogcontext="learn-more">${
            i18nString(UIStrings.learnMoreS, {PH1: linkTitle})}</devtools-link>
        </li>
      `)}
    </ul>`;
  // clang-format on
}

function renderIssueBodyItem(input: IssueBodyItemInput, _output: undefined, target: HTMLElement): void {
  switch (input.kind) {
    case 'description':
      render(html`<devtools-markdown-view .data=${input.markdownData}></devtools-markdown-view>`, target, {
        container: {attributes: {'aria-posinset': 1, 'aria-setsize': input.setSize}},
      });
      return;
    case 'affected-resources':
      render(html`${i18nString(UIStrings.affectedResources)}`, target, {
        container: {
          classes: ['affected-resources-label'],
          attributes: {'aria-posinset': 2, 'aria-setsize': input.setSize},
        },
      });
      return;
    case 'links':
      render(renderLinks(input.links), target, {
        container: {classes: ['link-wrapper'], attributes: {'aria-posinset': 3, 'aria-setsize': 3}},
      });
      return;
    default:
      Platform.assertNever(input, `Unhandled IssueBodyItemInput: ${JSON.stringify(input)}`);
  }
}

/**
 * A non-collapsible tree item in the issue body whose row content is rendered
 * declaratively.
 */
class IssueBodyTreeElement extends UI.TreeOutline.TreeElement {
  constructor(input: IssueBodyItemInput, jslogContext?: string) {
    super(undefined, false, jslogContext);
    this.setCollapsible(false);
    this.selectable = false;
    renderIssueBodyItem(input, undefined, this.listItemElement);
  }
}

export interface ViewInput {
  iconName: string;
  iconTitle: Platform.UIString.LocalizedString;
  aggregatedIssuesCount: number;
  title: string;
  isHidden: boolean;
  hideIssuesMenuLabel: Platform.UIString.LocalizedString;
  onToggleHideIssues: () => void;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  render(html`
    <div class="header">
      <devtools-icon class="leading-issue-icon extra-large"
                     .name=${input.iconName}
                     title=${input.iconTitle}></devtools-icon>
      <devtools-adorner class="aggregated-issues-count" .name=${'countWrapper'}>
        <span>${input.aggregatedIssuesCount}</span>
      </devtools-adorner>
      <div class="title">${input.title}</div>
      ${widget(Components.HideIssuesMenu.HideIssuesMenu, {
        menuItemLabel: input.hideIssuesMenuLabel,
        menuItemAction: input.onToggleHideIssues,
      })}
    </div>
  `, target, {container: {classes: input.isHidden ? ['issue', 'hidden-issue'] : ['issue']}});
  // clang-format on
};

export class IssueView extends UI.TreeOutline.TreeElement {
  #issue: IssuesManager.IssueAggregator.AggregatedIssue;
  #description: IssuesManager.MarkdownIssueDescription.IssueDescription;
  override toggleOnClick: boolean;
  affectedResources: UI.TreeOutline.TreeElement;
  readonly #affectedResourceViews: AffectedResourcesView[];
  #hasBeenExpandedBefore = false;
  #throttle: Common.Throttler.Throttler;
  #needsUpdateOnExpand = true;
  #contentCreated = false;
  readonly #view: View;

  constructor(issue: IssuesManager.IssueAggregator.AggregatedIssue,
              description: IssuesManager.MarkdownIssueDescription.IssueDescription, view: View = DEFAULT_VIEW) {
    super(undefined, undefined, Platform.StringUtilities.toKebabCase(issue.getCategory()));
    this.#issue = issue;
    this.#description = description;
    this.#view = view;
    this.#throttle = new Common.Throttler.Throttler(250);

    this.toggleOnClick = true;
    this.childrenListElement.classList.add('issue-body', IssueView.#getBodyCSSClass(this.#issue.getKind()));

    this.affectedResources = this.#createAffectedResources();
    this.#affectedResourceViews = [
      new AffectedCookiesView(this, this.#issue, 'affected-cookies'),
      new AffectedElementsView(this, this.#issue, 'affected-elements'),
      new AffectedRequestsView(this, this.#issue, 'affected-requests'),
      new AffectedMixedContentView(this, this.#issue, 'mixed-content-details'),
      new AffectedSourcesView(this, this.#issue, 'affected-sources'),
      new AffectedHeavyAdView(this, this.#issue, 'heavy-ad-details'),
      new AffectedDirectivesView(this, this.#issue, 'directives-details'),
      new AffectedBlockedByResponseView(this, this.#issue, 'blocked-by-response-details'),
      new AffectedSharedArrayBufferIssueDetailsView(this, this.#issue, 'sab-details'),
      new CorsIssueDetailsView(this, this.#issue, 'cors-details'),
      new GenericIssueDetailsView(this, this.#issue, 'generic-details'),
      new AffectedDocumentsInQuirksModeView(this, this.#issue, 'affected-documents'),
      new AffectedRawCookieLinesView(this, this.#issue, 'affected-raw-cookies'),
      new AffectedTrackingSitesView(this, this.#issue, 'tracking-sites-details'),
      new AffectedMetadataAllowedSitesView(this, this.#issue, 'metadata-allowed-sites-details'),
      new AffectedDescendantsWithinSelectElementView(this, this.#issue, 'disallowed-select-descendants-details'),
      new AffectedPartitioningBlobURLView(this, this.#issue, 'partitioning-blob-url-details'),
      new AffectedPermissionElementsView(this, this.#issue, 'permission-element-elements'),
      new AffectedLazyLoadImagesView(this, this.#issue, 'lazy-load-image-details'),
      new AffectedSelectivePermissionsInterventionView(this, this.#issue, 'selective-permissions-intervention-details'),
    ];
  }

  /**
   * Sets the issue to take the resources from. Assumes that the description
   * this IssueView was initialized with fits the new issue as well, i.e.
   * title and issue description will not be updated.
   */
  setIssue(issue: IssuesManager.IssueAggregator.AggregatedIssue): void {
    if (this.#issue !== issue) {
      this.#needsUpdateOnExpand = true;
    }
    this.#issue = issue;
    this.#affectedResourceViews.forEach(view => view.setIssue(issue));
  }

  static #getBodyCSSClass(issueKind: IssuesManager.Issue.IssueKind): string {
    switch (issueKind) {
      case IssuesManager.Issue.IssueKind.BREAKING_CHANGE:
        return 'issue-kind-breaking-change';
      case IssuesManager.Issue.IssueKind.PAGE_ERROR:
        return 'issue-kind-page-error';
      case IssuesManager.Issue.IssueKind.IMPROVEMENT:
        return 'issue-kind-improvement';
    }
  }

  getIssueTitle(): string {
    return this.#description.title;
  }

  override onattach(): void {
    if (!this.#contentCreated) {
      this.createContent();
      return;
    }
    this.update();
  }

  createContent(): void {
    this.#render();
    this.#createBody();
    this.appendChild(this.affectedResources);
    const visibleAffectedResource: AffectedResourcesView[] = [];
    for (const view of this.#affectedResourceViews) {
      this.appendAffectedResource(view);
      view.update();
      if (!view.isEmpty()) {
        visibleAffectedResource.push(view);
      }
    }
    this.#updateAffectedResourcesPositionAndSize(visibleAffectedResource);

    this.#createReadMoreLinks();
    this.updateAffectedResourceVisibility();
    this.#contentCreated = true;
  }

  appendAffectedResource(resource: UI.TreeOutline.TreeElement): void {
    this.affectedResources.appendChild(resource);
  }

  #updateAffectedResourcesPositionAndSize(visibleAffectedResource: AffectedResourcesView[]): void {
    for (let i = 0; i < visibleAffectedResource.length; i++) {
      const element = visibleAffectedResource[i].listItemElement;
      UI.ARIAUtils.setPositionInSet(element, i + 1);
      UI.ARIAUtils.setSetSize(element, visibleAffectedResource.length);
    }
  }

  #render(): void {
    const kind = this.#issue.getKind();
    const isHidden = this.#issue.isHidden();
    const input: ViewInput = {
      iconName: IssueCounter.IssueCounter.getIssueKindIconName(kind),
      iconTitle: IssuesManager.Issue.getIssueKindDescription(kind),
      aggregatedIssuesCount: this.#issue.getAggregatedIssuesCount(),
      title: this.#description.title,
      isHidden,
      hideIssuesMenuLabel: isHidden ? i18nString(UIStrings.unhideIssuesLikeThis) :
                                      i18nString(UIStrings.hideIssuesLikeThis),
      onToggleHideIssues: this.#onToggleHideIssues,
    };
    this.#view(input, undefined, this.listItemElement);
  }

  readonly #onToggleHideIssues = (): void => {
    const setting = IssuesManager.IssuesManager.getHideIssueByCodeSetting();
    const values = setting.get();
    values[this.#issue.code()] = this.#issue.isHidden() ? IssuesManager.IssuesManager.IssueStatus.UNHIDDEN :
                                                          IssuesManager.IssuesManager.IssueStatus.HIDDEN;
    setting.set(values);
  };

  override onexpand(): void {
    const category = this.#issue.getCategory();

    // Handle sub type for cookie issues.
    if (category === IssuesManager.Issue.IssueCategory.COOKIE) {
      const cookieIssueSubCategory = IssuesManager.CookieIssue.CookieIssue.getSubCategory(this.#issue.code());
      Host.userMetrics.issuesPanelIssueExpanded(cookieIssueSubCategory);
    } else {
      Host.userMetrics.issuesPanelIssueExpanded(category);
    }

    if (this.#needsUpdateOnExpand) {
      this.#doUpdate();
    }

    if (!this.#hasBeenExpandedBefore) {
      this.#hasBeenExpandedBefore = true;
      for (const view of this.#affectedResourceViews) {
        view.expandIfOneResource();
      }
    }
  }

  updateAffectedResourceVisibility(): void {
    const noResources = this.#affectedResourceViews.every(view => view.isEmpty());
    this.affectedResources.hidden = noResources;
  }

  #getBodySetSize(): number {
    return this.#description.links.length === 0 ? 2 : 3;
  }

  #createAffectedResources(): UI.TreeOutline.TreeElement {
    const wrapper =
        new IssueBodyTreeElement({kind: 'affected-resources', setSize: this.#getBodySetSize()}, 'affected-resources');
    wrapper.setExpandable(true);
    wrapper.expand();
    wrapper.childrenListElement.classList.add('affected-resources');
    return wrapper;
  }

  #createBody(): void {
    const messageElement = new IssueBodyTreeElement({
      kind: 'description',
      markdownData: {
        tokens: this.#description.markdown,
        renderer: new MarkdownView.MarkdownPlaceholderLitRenderer.MarkdownPlaceholderLitRenderer(
            this.#description.substitutions),
      },
      setSize: this.#getBodySetSize(),
    },
                                                    'issue-description');
    this.appendChild(messageElement);
  }

  #createReadMoreLinks(): void {
    if (this.#description.links.length === 0) {
      return;
    }
    this.appendChild(new IssueBodyTreeElement({kind: 'links', links: this.#description.links}));
  }

  #doUpdate(): void {
    if (this.expanded) {
      this.#affectedResourceViews.forEach(view => view.update());
      this.updateAffectedResourceVisibility();
    }
    this.#needsUpdateOnExpand = !this.expanded;
    this.#render();
  }

  update(): void {
    void this.#throttle.schedule(async () => this.#doUpdate());
  }

  clear(): void {
    this.#affectedResourceViews.forEach(view => view.clear());
  }

  getIssueKind(): IssuesManager.Issue.IssueKind {
    return this.#issue.getKind();
  }

  isForHiddenIssue(): boolean {
    return this.#issue.isHidden();
  }

  toggle(expand?: boolean): void {
    if (expand || (expand === undefined && !this.expanded)) {
      this.expand();
    } else {
      this.collapse();
    }
  }
}
