// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as Elements from '../elements/elements.js';
import * as Host from '../host/host.js';
import * as i18n from '../i18n/i18n.js';
import * as Network from '../network/network.js';
import * as Platform from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';
import * as WebComponents from '../ui/components/components.js';
import * as UI from '../ui/ui.js';

import {AffectedCookiesView} from './AffectedCookiesView.js';
import {AffectedElementsView} from './AffectedElementsView.js';
import {AffectedElementsWithLowContrastView} from './AffectedElementsWithLowContrastView.js';
import {AffectedItem, AffectedResourcesView, extractShortPath} from './AffectedResourcesView.js';
import {AffectedSharedArrayBufferIssueDetailsView} from './AffectedSharedArrayBufferIssueDetailsView.js';
import {AffectedTrustedWebActivityIssueDetailsView} from './AffectedTrustedWebActivityIssueDetailsView.js';
import {CorsIssueDetailsView} from './CorsIssueDetailsView.js';
import type {AggregatedIssue} from './IssueAggregator.js';
import type {IssueDescription} from './MarkdownIssueDescription.js';

export const UIStrings = {
  /**
  *@description Noun, singular. Label for a column or field containing the name of an entity.
  */
  name: 'Name',
  /**
  *@description Singular label for number of affected directive resource indication in issue view
  */
  directive: 'directive',
  /**
  *@description Plural label for number of affected directive resource indication in issue view
  */
  directives: 'directives',
  /**
  *@description Indicates that a CSP error should be treated as a warning
  */
  reportonly: 'report-only',
  /**
  *@description The kind of resolution for a mixed content issue
  */
  blocked: 'blocked',
  /**
  *@description Tooltip for button linking to the Elements panel
  */
  clickToRevealTheViolatingDomNode: 'Click to reveal the violating DOM node in the Elements panel',
  /**
  *@description Header for the section listing affected directives
  */
  directiveC: 'Directive',
  /**
  *@description Label for the column in the element list in the CSS Overview report
  */
  element: 'Element',
  /**
  *@description Header for the source location column
  */
  sourceLocation: 'Source Location',
  /**
  *@description Text for the status of something
  */
  status: 'Status',
  /**
  *@description Text that refers to the resources of the web page
  */
  resourceC: 'Resource',
  /**
  *@description Label for a type of issue that can appear in the Issues view. Noun for a singular network request.
  */
  request: 'request',
  /**
  *@description Label for a type of issue that can appear in the Issues view. Noun for plural network requests.
  */
  requests: 'requests',
  /**
  *@description Singular label for number of affected source resource indication in issue view
  */
  source: 'source',
  /**
  *@description Plural label for number of affected source resource indication in issue view
  */
  sources: 'sources',
  /**
  *@description Label for number of affected resources indication in issue view
  */
  resource: 'resource',
  /**
  *@description Label for number of affected resources indication in issue view
  */
  resources: 'resources',
  /**
  *@description Label for mixed content issue's restriction status
  */
  restrictionStatus: 'Restriction Status',
  /**
  *@description Title for a column in an Heavy Ads issue view
  */
  limitExceeded: 'Limit exceeded',
  /**
  *@description Title for a column in an Heavy Ads issue view
  */
  resolutionStatus: 'Resolution Status',
  /**
  *@description Title for a column in an Heavy Ads issue view
  */
  frameUrl: 'Frame URL',
  /**
  * @description When there is a Heavy Ad, the browser can choose to deal with it in different ways.
  * This string indicates that the ad was bad enough that it was removed.
  */
  removed: 'Removed',
  /**
  * @description When there is a Heavy Ad, the browser can choose to deal with it in different ways.
  * This string indicates that the ad was only warned, and not removed.
  */
  warned: 'Warned',
  /**
  *@description Reason for a Heavy Ad being flagged in issue view. The Ad has been flagged as a
  *Heavy Ad because it exceeded the set limit for peak CPU usage, e.g. it blocked the main thread
  *for more than 15 seconds in any 30-second window.
  */
  cpuPeakLimit: 'CPU peak limit',
  /**
  *@description Reason for a Heavy Ad being flagged in issue view
  */
  cpuTotalLimit: 'CPU total limit',
  /**
  *@description Reason for a Heavy Ad being flagged in issue view
  */
  networkLimit: 'Network limit',
  /**
  *@description Label for the category of affected resources in issue view
  */
  requestC: 'Request',
  /**
  *@description Title for a column in an issue view
  */
  parentFrame: 'Parent Frame',
  /**
  *@description Title for a column in an issue view
  */
  blockedResource: 'Blocked Resource',
  /**
  *@description Header for the section listing affected resources
  */
  affectedResources: 'Affected Resources',
  /**
  *@description Title for a link to further information in issue view
  *@example {SameSite Cookies Explained} PH1
  */
  learnMoreS: 'Learn more: {PH1}',
  /**
  *@description Link text for opening a survey in the expended view of an Issue in the issue view
  */
  isThisIssueMessageHelpfulToYou: 'Is this issue message helpful to you?',
};
const str_ = i18n.i18n.registerUIStrings('issues/IssueView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

class AffectedDirectivesView extends AffectedResourcesView {
  _issue: AggregatedIssue;
  constructor(parent: IssueView, issue: AggregatedIssue) {
    super(parent, {singular: i18nString(UIStrings.directive), plural: i18nString(UIStrings.directives)});
    this._issue = issue;
  }

  _appendStatus(element: Element, isReportOnly: boolean): void {
    const status = document.createElement('td');
    if (isReportOnly) {
      status.classList.add('affected-resource-report-only-status');
      status.textContent = i18nString(UIStrings.reportonly);
    } else {
      status.classList.add('affected-resource-blocked-status');
      status.textContent = i18nString(UIStrings.blocked);
    }
    element.appendChild(status);
  }

  _appendViolatedDirective(element: Element, directive: string): void {
    const violatedDirective = document.createElement('td');
    violatedDirective.textContent = directive;
    element.appendChild(violatedDirective);
  }

  _appendBlockedURL(element: Element, url: string): void {
    const info = document.createElement('td');
    info.classList.add('affected-resource-directive-info');
    info.textContent = url;
    element.appendChild(info);
  }

  _appendBlockedElement(element: Element, nodeId: number|undefined, model: SDK.IssuesModel.IssuesModel): void {
    const elementsPanelLinkComponent = new Elements.ElementsPanelLink.ElementsPanelLink();
    if (nodeId) {
      const violatingNodeId = nodeId;
      UI.Tooltip.Tooltip.install(elementsPanelLinkComponent, i18nString(UIStrings.clickToRevealTheViolatingDomNode));

      const onElementRevealIconClick: (arg0?: Event|undefined) => void = (): void => {
        const target = model.getTargetIfNotDisposed();
        if (target) {
          Host.userMetrics.issuesPanelResourceOpened(this._issue.getCategory(), AffectedItem.Element);
          const deferredDOMNode = new SDK.DOMModel.DeferredDOMNode(target, violatingNodeId);
          Common.Revealer.reveal(deferredDOMNode);
        }
      };

      const onElementRevealIconMouseEnter: (arg0?: Event|undefined) => void = (): void => {
        const target = model.getTargetIfNotDisposed();
        if (target) {
          const deferredDOMNode = new SDK.DOMModel.DeferredDOMNode(target, violatingNodeId);
          if (deferredDOMNode) {
            deferredDOMNode.highlight();
          }
        }
      };

      const onElementRevealIconMouseLeave: (arg0?: Event|undefined) => void = (): void => {
        SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
      };

      elementsPanelLinkComponent
          .data = {onElementRevealIconClick, onElementRevealIconMouseEnter, onElementRevealIconMouseLeave};
    }

    const violatingNode = document.createElement('td');
    violatingNode.classList.add('affected-resource-csp-info-node');
    violatingNode.appendChild(elementsPanelLinkComponent);
    element.appendChild(violatingNode);
  }

  _appendAffectedContentSecurityPolicyDetails(
      cspIssues: Iterable<SDK.ContentSecurityPolicyIssue.ContentSecurityPolicyIssue>): void {
    const header = document.createElement('tr');
    if (this._issue.code() === SDK.ContentSecurityPolicyIssue.inlineViolationCode) {
      this.appendColumnTitle(header, i18nString(UIStrings.directiveC));
      this.appendColumnTitle(header, i18nString(UIStrings.element));
      this.appendColumnTitle(header, i18nString(UIStrings.sourceLocation));
      this.appendColumnTitle(header, i18nString(UIStrings.status));
    } else if (this._issue.code() === SDK.ContentSecurityPolicyIssue.urlViolationCode) {
      this.appendColumnTitle(header, i18nString(UIStrings.resourceC), 'affected-resource-directive-info-header');
      this.appendColumnTitle(header, i18nString(UIStrings.status));
      this.appendColumnTitle(header, i18nString(UIStrings.directiveC));
      this.appendColumnTitle(header, i18nString(UIStrings.sourceLocation));
    } else if (this._issue.code() === SDK.ContentSecurityPolicyIssue.evalViolationCode) {
      this.appendColumnTitle(header, i18nString(UIStrings.sourceLocation));
      this.appendColumnTitle(header, i18nString(UIStrings.directiveC));
      this.appendColumnTitle(header, i18nString(UIStrings.status));
    } else if (this._issue.code() === SDK.ContentSecurityPolicyIssue.trustedTypesSinkViolationCode) {
      this.appendColumnTitle(header, i18nString(UIStrings.sourceLocation));
      this.appendColumnTitle(header, i18nString(UIStrings.status));
    } else if (this._issue.code() === SDK.ContentSecurityPolicyIssue.trustedTypesPolicyViolationCode) {
      this.appendColumnTitle(header, i18nString(UIStrings.sourceLocation));
      this.appendColumnTitle(header, i18nString(UIStrings.directiveC));
      this.appendColumnTitle(header, i18nString(UIStrings.status));
    } else {
      this.updateAffectedResourceCount(0);
      return;
    }
    this.affectedResources.appendChild(header);
    let count = 0;
    for (const cspIssue of cspIssues) {
      count++;
      this._appendAffectedContentSecurityPolicyDetail(cspIssue);
    }
    this.updateAffectedResourceCount(count);
  }

  _appendAffectedContentSecurityPolicyDetail(cspIssue: SDK.ContentSecurityPolicyIssue.ContentSecurityPolicyIssue):
      void {
    const element = document.createElement('tr');
    element.classList.add('affected-resource-directive');

    const cspIssueDetails = cspIssue.details();
    const model = cspIssue.model();
    const maybeTarget = cspIssue.model()?.getTargetIfNotDisposed();
    if (this._issue.code() === SDK.ContentSecurityPolicyIssue.inlineViolationCode && model) {
      this._appendViolatedDirective(element, cspIssueDetails.violatedDirective);
      this._appendBlockedElement(element, cspIssueDetails.violatingNodeId, model);
      this.appendSourceLocation(element, cspIssueDetails.sourceCodeLocation, maybeTarget);
      this._appendStatus(element, cspIssueDetails.isReportOnly);
    } else if (this._issue.code() === SDK.ContentSecurityPolicyIssue.urlViolationCode) {
      const url = cspIssueDetails.blockedURL ? cspIssueDetails.blockedURL : '';
      this._appendBlockedURL(element, url);
      this._appendStatus(element, cspIssueDetails.isReportOnly);
      this._appendViolatedDirective(element, cspIssueDetails.violatedDirective);
      this.appendSourceLocation(element, cspIssueDetails.sourceCodeLocation, maybeTarget);
    } else if (this._issue.code() === SDK.ContentSecurityPolicyIssue.evalViolationCode) {
      this.appendSourceLocation(element, cspIssueDetails.sourceCodeLocation, maybeTarget);
      this._appendViolatedDirective(element, cspIssueDetails.violatedDirective);
      this._appendStatus(element, cspIssueDetails.isReportOnly);
    } else if (this._issue.code() === SDK.ContentSecurityPolicyIssue.trustedTypesSinkViolationCode) {
      this.appendSourceLocation(element, cspIssueDetails.sourceCodeLocation, maybeTarget);
      this._appendStatus(element, cspIssueDetails.isReportOnly);
    } else if (this._issue.code() === SDK.ContentSecurityPolicyIssue.trustedTypesPolicyViolationCode) {
      this.appendSourceLocation(element, cspIssueDetails.sourceCodeLocation, maybeTarget);
      this._appendViolatedDirective(element, cspIssueDetails.violatedDirective);
      this._appendStatus(element, cspIssueDetails.isReportOnly);
    } else {
      return;
    }

    this.affectedResources.appendChild(element);
  }

  update(): void {
    this.clear();
    this._appendAffectedContentSecurityPolicyDetails(this._issue.getCspIssues());
  }
}

class AffectedRequestsView extends AffectedResourcesView {
  _issue: SDK.Issue.Issue;
  constructor(parent: IssueView, issue: SDK.Issue.Issue) {
    super(parent, {singular: i18nString(UIStrings.request), plural: i18nString(UIStrings.requests)});
    this._issue = issue;
  }

  _appendAffectedRequests(affectedRequests: Iterable<Protocol.Audits.AffectedRequest>): void {
    let count = 0;
    for (const affectedRequest of affectedRequests) {
      for (const request of this.resolveRequestId(affectedRequest.requestId)) {
        count++;
        this._appendNetworkRequest(request);
      }
    }
    this.updateAffectedResourceCount(count);
  }

  _appendNetworkRequest(request: SDK.NetworkRequest.NetworkRequest): void {
    const nameText = Platform.StringUtilities.trimMiddle(request.name(), 100);
    const nameElement = document.createElement('td');
    const tab = issueTypeToNetworkHeaderMap.get(this._issue.getCategory()) || Network.NetworkItemView.Tabs.Headers;
    nameElement.appendChild(UI.UIUtils.createTextButton(nameText, () => {
      Host.userMetrics.issuesPanelResourceOpened(this._issue.getCategory(), AffectedItem.Request);
      Network.NetworkPanel.NetworkPanel.selectAndShowRequest(request, tab);
    }, 'link-style devtools-link'));
    const element = document.createElement('tr');
    element.classList.add('affected-resource-request');
    element.appendChild(nameElement);
    this.affectedResources.appendChild(element);
  }

  update(): void {
    this.clear();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const unused of this._issue.getBlockedByResponseDetails()) {
      // If the issue has blockedByResponseDetails, the corresponding AffectedBlockedByResponseView
      // will take care of displaying the request.
      this.updateAffectedResourceCount(0);
      return;
    }
    this._appendAffectedRequests(this._issue.requests());
  }
}

class AffectedSourcesView extends AffectedResourcesView {
  _issue: SDK.Issue.Issue;
  constructor(parent: IssueView, issue: SDK.Issue.Issue) {
    super(parent, {singular: i18nString(UIStrings.source), plural: i18nString(UIStrings.sources)});
    this._issue = issue;
  }

  _appendAffectedSources(affectedSources: Iterable<SDK.Issue.AffectedSource>): void {
    let count = 0;
    for (const source of affectedSources) {
      this._appendAffectedSource(source);
      count++;
    }
    this.updateAffectedResourceCount(count);
  }

  _appendAffectedSource({url, lineNumber, columnNumber}: SDK.Issue.AffectedSource): void {
    const cellElement = document.createElement('td');
    // TODO(chromium:1072331): Check feasibility of plumping through scriptId for `linkifyScriptLocation`
    //                         to support source maps and formatted scripts.
    const linkifierURLOptions = ({columnNumber, lineNumber, tabStop: true} as Components.Linkifier.LinkifyURLOptions);
    // An element created with linkifyURL can subscribe to the events
    // 'click' neither 'keydown' if that key is the 'Enter' key.
    // Also, this element has a context menu, so we should be able to
    // track when the user use the context menu too.
    // TODO(crbug.com/1108503): Add some mechanism to be able to add telemetry to this element.
    const anchorElement = Components.Linkifier.Linkifier.linkifyURL(url, linkifierURLOptions);
    cellElement.appendChild(anchorElement);
    const rowElement = document.createElement('tr');
    rowElement.classList.add('affected-resource-source');
    rowElement.appendChild(cellElement);
    this.affectedResources.appendChild(rowElement);
  }

  update(): void {
    this.clear();
    this._appendAffectedSources(this._issue.sources());
  }
}

const issueTypeToNetworkHeaderMap = new Map<symbol, string>([
  [SDK.Issue.IssueCategory.SameSiteCookie, Network.NetworkItemView.Tabs.Cookies],
  [SDK.Issue.IssueCategory.CrossOriginEmbedderPolicy, Network.NetworkItemView.Tabs.Headers],
  [SDK.Issue.IssueCategory.MixedContent, Network.NetworkItemView.Tabs.Headers],
]);

class AffectedMixedContentView extends AffectedResourcesView {
  _issue: AggregatedIssue;
  constructor(parent: IssueView, issue: AggregatedIssue) {
    super(parent, {singular: i18nString(UIStrings.resource), plural: i18nString(UIStrings.resources)});
    this._issue = issue;
  }

  _appendAffectedMixedContentDetails(mixedContentIssues: Iterable<SDK.MixedContentIssue.MixedContentIssue>): void {
    const header = document.createElement('tr');
    this.appendColumnTitle(header, i18nString(UIStrings.name));
    this.appendColumnTitle(header, i18nString(UIStrings.restrictionStatus));

    this.affectedResources.appendChild(header);

    let count = 0;
    for (const issue of mixedContentIssues) {
      const details = issue.getDetails();
      if (details.request) {
        this.resolveRequestId(details.request.requestId).forEach(networkRequest => {
          this.appendAffectedMixedContent(details, networkRequest);
          count++;
        });
      } else {
        this.appendAffectedMixedContent(details);
        count++;
      }
    }
    this.updateAffectedResourceCount(count);
  }

  appendAffectedMixedContent(
      mixedContent: Protocol.Audits.MixedContentIssueDetails,
      maybeRequest: SDK.NetworkRequest.NetworkRequest|null = null): void {
    const element = document.createElement('tr');
    element.classList.add('affected-resource-mixed-content');
    const filename = extractShortPath(mixedContent.insecureURL);

    const name = document.createElement('td');
    if (maybeRequest) {
      const request = maybeRequest;  // re-assignment to make type checker happy
      const tab = issueTypeToNetworkHeaderMap.get(this._issue.getCategory()) || Network.NetworkItemView.Tabs.Headers;
      name.appendChild(UI.UIUtils.createTextButton(filename, () => {
        Host.userMetrics.issuesPanelResourceOpened(this._issue.getCategory(), AffectedItem.Request);
        Network.NetworkPanel.NetworkPanel.selectAndShowRequest(request, tab);
      }, 'link-style devtools-link'));
    } else {
      name.classList.add('affected-resource-mixed-content-info');
      name.textContent = filename;
    }
    UI.Tooltip.Tooltip.install(name, mixedContent.insecureURL);
    element.appendChild(name);

    const status = document.createElement('td');
    status.classList.add('affected-resource-mixed-content-info');
    status.textContent = SDK.MixedContentIssue.MixedContentIssue.translateStatus(mixedContent.resolutionStatus);
    element.appendChild(status);

    this.affectedResources.appendChild(element);
  }

  update(): void {
    this.clear();
    this._appendAffectedMixedContentDetails(this._issue.getMixedContentIssues());
  }
}

class AffectedHeavyAdView extends AffectedResourcesView {
  _issue: SDK.Issue.Issue;
  constructor(parent: IssueView, issue: SDK.Issue.Issue) {
    super(parent, {singular: i18nString(UIStrings.resource), plural: i18nString(UIStrings.resources)});
    this._issue = issue;
  }

  _appendAffectedHeavyAds(heavyAds: Iterable<Protocol.Audits.HeavyAdIssueDetails>): void {
    const header = document.createElement('tr');
    this.appendColumnTitle(header, i18nString(UIStrings.limitExceeded));
    this.appendColumnTitle(header, i18nString(UIStrings.resolutionStatus));
    this.appendColumnTitle(header, i18nString(UIStrings.frameUrl));

    this.affectedResources.appendChild(header);

    let count = 0;
    for (const heavyAd of heavyAds) {
      this._appendAffectedHeavyAd(heavyAd);
      count++;
    }
    this.updateAffectedResourceCount(count);
  }

  _statusToString(status: Protocol.Audits.HeavyAdResolutionStatus): string {
    switch (status) {
      case Protocol.Audits.HeavyAdResolutionStatus.HeavyAdBlocked:
        return i18nString(UIStrings.removed);
      case Protocol.Audits.HeavyAdResolutionStatus.HeavyAdWarning:
        return i18nString(UIStrings.warned);
    }
    return '';
  }

  _limitToString(status: Protocol.Audits.HeavyAdReason): string {
    switch (status) {
      case Protocol.Audits.HeavyAdReason.CpuPeakLimit:
        return i18nString(UIStrings.cpuPeakLimit);
      case Protocol.Audits.HeavyAdReason.CpuTotalLimit:
        return i18nString(UIStrings.cpuTotalLimit);
      case Protocol.Audits.HeavyAdReason.NetworkTotalLimit:
        return i18nString(UIStrings.networkLimit);
    }
    return '';
  }

  _appendAffectedHeavyAd(heavyAd: Protocol.Audits.HeavyAdIssueDetails): void {
    const element = document.createElement('tr');
    element.classList.add('affected-resource-heavy-ad');

    const reason = document.createElement('td');
    reason.classList.add('affected-resource-heavy-ad-info');
    reason.textContent = this._limitToString(heavyAd.reason);
    element.appendChild(reason);

    const status = document.createElement('td');
    status.classList.add('affected-resource-heavy-ad-info');
    status.textContent = this._statusToString(heavyAd.resolution);
    element.appendChild(status);

    const frameId = heavyAd.frame.frameId;
    const frameUrl = this.createFrameCell(frameId, this._issue);
    element.appendChild(frameUrl);

    this.affectedResources.appendChild(element);
  }

  update(): void {
    this.clear();
    this._appendAffectedHeavyAds(this._issue.heavyAds());
  }
}

class AffectedBlockedByResponseView extends AffectedResourcesView {
  _issue: SDK.Issue.Issue;
  constructor(parent: IssueView, issue: SDK.Issue.Issue) {
    super(parent, {singular: i18nString(UIStrings.request), plural: i18nString(UIStrings.requests)});
    this._issue = issue;
  }

  _appendDetails(details: Iterable<Protocol.Audits.BlockedByResponseIssueDetails>): void {
    const header = document.createElement('tr');
    this.appendColumnTitle(header, i18nString(UIStrings.requestC));
    this.appendColumnTitle(header, i18nString(UIStrings.parentFrame));
    this.appendColumnTitle(header, i18nString(UIStrings.blockedResource));

    this.affectedResources.appendChild(header);

    let count = 0;
    for (const detail of details) {
      this._appendDetail(detail);
      count++;
    }
    this.updateAffectedResourceCount(count);
  }

  _appendDetail(details: Protocol.Audits.BlockedByResponseIssueDetails): void {
    const element = document.createElement('tr');
    element.classList.add('affected-resource-row');

    const requestCell = this.createRequestCell(details.request);
    element.appendChild(requestCell);

    if (details.parentFrame) {
      const frameUrl = this.createFrameCell(details.parentFrame.frameId, this._issue);
      element.appendChild(frameUrl);
    } else {
      element.appendChild(document.createElement('td'));
    }

    if (details.blockedFrame) {
      const frameUrl = this.createFrameCell(details.blockedFrame.frameId, this._issue);
      element.appendChild(frameUrl);
    } else {
      element.appendChild(document.createElement('td'));
    }

    this.affectedResources.appendChild(element);
  }

  update(): void {
    this.clear();
    this._appendDetails(this._issue.getBlockedByResponseDetails());
  }
}

// These come from chrome/browser/ui/hats/hats_service.cc.
const issueSurveyTriggers = new Map<symbol, string|null>([
  [SDK.Issue.IssueCategory.CrossOriginEmbedderPolicy, 'devtools-issues-coep'],
  [SDK.Issue.IssueCategory.MixedContent, 'devtools-issues-mixed-content'],
  [SDK.Issue.IssueCategory.SameSiteCookie, 'devtools-issues-cookies-samesite'],
  [SDK.Issue.IssueCategory.HeavyAd, 'devtools-issues-heavy-ad'],
  [SDK.Issue.IssueCategory.ContentSecurityPolicy, 'devtools-issues-csp'],
  [SDK.Issue.IssueCategory.Other, null],
]);

export class IssueView extends UI.TreeOutline.TreeElement {
  _parent: UI.Widget.VBox;
  _issue: AggregatedIssue;
  _description: IssueDescription;
  toggleOnClick: boolean;
  affectedResources: UI.TreeOutline.TreeElement;
  _affectedResourceViews: AffectedResourcesView[];
  _aggregatedIssuesCount: HTMLElement|null;
  _hasBeenExpandedBefore: boolean;
  constructor(parent: UI.Widget.VBox, issue: AggregatedIssue, description: IssueDescription) {
    super();
    this._parent = parent;
    this._issue = issue;
    this._description = description;

    this.toggleOnClick = true;
    this.listItemElement.classList.add('issue');
    this.childrenListElement.classList.add('body');

    this.affectedResources = this._createAffectedResources();
    this._affectedResourceViews = [
      new AffectedCookiesView(this, this._issue),
      new AffectedElementsView(this, this._issue),
      new AffectedRequestsView(this, this._issue),
      new AffectedMixedContentView(this, this._issue),
      new AffectedSourcesView(this, this._issue),
      new AffectedHeavyAdView(this, this._issue),
      new AffectedDirectivesView(this, this._issue),
      new AffectedBlockedByResponseView(this, this._issue),
      new AffectedSharedArrayBufferIssueDetailsView(this, this._issue),
      new AffectedElementsWithLowContrastView(this, this._issue),
      new AffectedTrustedWebActivityIssueDetailsView(this, this._issue),
      new CorsIssueDetailsView(this, this._issue),
    ];

    this._aggregatedIssuesCount = null;
    this._hasBeenExpandedBefore = false;
  }

  getIssueTitle(): string {
    return this._description.title;
  }

  onattach(): void {
    this._appendHeader();
    this._createBody();
    this.appendChild(this.affectedResources);
    for (const view of this._affectedResourceViews) {
      this.appendAffectedResource(view);
      view.update();
    }

    this._createReadMoreLinks();
    this.updateAffectedResourceVisibility();
  }

  appendAffectedResource(resource: UI.TreeOutline.TreeElement): void {
    this.affectedResources.appendChild(resource);
  }

  _appendHeader(): void {
    const header = document.createElement('div');
    header.classList.add('header');
    const icon = new WebComponents.Icon.Icon();
    icon.data = {iconName: 'breaking_change_icon', color: '', width: '16px', height: '16px'};
    icon.classList.add('breaking-change');
    this._aggregatedIssuesCount = (document.createElement('span') as HTMLElement);
    const countAdorner = Elements.Adorner.Adorner.create(this._aggregatedIssuesCount, 'countWrapper');
    countAdorner.classList.add('aggregated-issues-count');
    this._aggregatedIssuesCount.textContent = `${this._issue.getAggregatedIssuesCount()}`;
    header.appendChild(icon);
    header.appendChild(countAdorner);

    const title = document.createElement('div');
    title.classList.add('title');
    title.textContent = this._description.title;
    header.appendChild(title);

    this.listItemElement.appendChild(header);
  }

  onexpand(): void {
    const issueCategory = this._issue.getCategory().description;

    Host.userMetrics.issuesPanelIssueExpanded(issueCategory);

    if (!this._hasBeenExpandedBefore) {
      this._hasBeenExpandedBefore = true;
      for (const view of this._affectedResourceViews) {
        view.expandIfOneResource();
      }
    }
  }

  _updateAggregatedIssuesCount(): void {
    if (this._aggregatedIssuesCount) {
      this._aggregatedIssuesCount.textContent = `${this._issue.getAggregatedIssuesCount()}`;
    }
  }

  updateAffectedResourceVisibility(): void {
    const noResources = this._affectedResourceViews.every(view => view.isEmpty());
    this.affectedResources.hidden = noResources;
  }

  _createAffectedResources(): UI.TreeOutline.TreeElement {
    const wrapper = new UI.TreeOutline.TreeElement();
    wrapper.setCollapsible(false);
    wrapper.setExpandable(true);
    wrapper.expand();
    wrapper.selectable = false;
    wrapper.listItemElement.classList.add('affected-resources-label');
    wrapper.listItemElement.textContent = i18nString(UIStrings.affectedResources);
    wrapper.childrenListElement.classList.add('affected-resources');
    return wrapper;
  }

  _createBody(): void {
    const messageElement = new UI.TreeOutline.TreeElement();
    messageElement.setCollapsible(false);
    messageElement.selectable = false;
    messageElement.listItemElement.appendChild(this._description.view);
    this.appendChild(messageElement);
  }

  _createReadMoreLinks(): void {
    const linkWrapper = new UI.TreeOutline.TreeElement();
    linkWrapper.setCollapsible(false);
    linkWrapper.listItemElement.classList.add('link-wrapper');

    const linkList = linkWrapper.listItemElement.createChild('ul', 'link-list');
    for (const description of this._description.links) {
      const link = UI.Fragment.html`<a class="link devtools-link" role="link" tabindex="0" href=${description.link}>${
          i18nString(UIStrings.learnMoreS, {PH1: description.linkTitle})}</a>`;
      const linkIcon = new WebComponents.Icon.Icon();
      linkIcon.data = {iconName: 'link_icon', color: 'var(--issue-link)', width: '16px', height: '16px'};
      linkIcon.classList.add('link-icon');
      link.prepend(linkIcon);
      self.onInvokeElement(link, event => {
        Host.userMetrics.issuesPanelResourceOpened(this._issue.getCategory(), AffectedItem.LearnMore);
        const mainTarget = SDK.SDKModel.TargetManager.instance().mainTarget();
        if (mainTarget) {
          mainTarget.targetAgent().invoke_createTarget({url: description.link});
        }
        event.consume(true);
      });

      const linkListItem = linkList.createChild('li');
      linkListItem.appendChild(link);
    }
    this.appendChild(linkWrapper);

    const surveyTrigger = issueSurveyTriggers.get(this._issue.getCategory());
    if (surveyTrigger) {
      // This part of the UI is async so be careful relying on it being available.
      const surveyLink = new WebComponents.SurveyLink.SurveyLink();
      surveyLink.data = {
        trigger: surveyTrigger,
        promptText: i18nString(UIStrings.isThisIssueMessageHelpfulToYou),
        canShowSurvey: Host.InspectorFrontendHost.InspectorFrontendHostInstance.canShowSurvey,
        showSurvey: Host.InspectorFrontendHost.InspectorFrontendHostInstance.showSurvey,
      };
      linkList.createChild('li').appendChild(surveyLink);
    }
  }

  update(): void {
    this._affectedResourceViews.forEach(view => view.update());
    this.updateAffectedResourceVisibility();
    this._updateAggregatedIssuesCount();
  }

  toggle(expand?: boolean): void {
    if (expand || (expand === undefined && !this.expanded)) {
      this.expand();
    } else {
      this.collapse();
    }
  }
}
