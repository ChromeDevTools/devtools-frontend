// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, type LitTemplate, nothing, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {AffectedItem, AffectedResourcesView} from './AffectedResourcesView.js';
import * as IssuesComponents from './components/components.js';
import type {IssueView} from './IssueView.js';

const {widget} = UI.Widget;

export interface SourceLocationData {
  target: SDK.Target.Target|null;
  scriptId: Protocol.Runtime.ScriptId|null;
  url: Platform.DevToolsPath.UrlString;
  lineNumber: number;
  columnNumber?: number;
}

export interface DirectiveRow {
  violatedDirective: string;
  isReportOnly: boolean;
  blockedURL: Platform.DevToolsPath.UrlString;
  sourceLocation?: SourceLocationData;
  hasModel: boolean;
  elementsPanelLinkData?: IssuesComponents.ElementsPanelLink.ElementsPanelLinkData;
}

export interface ViewInput {
  issueCode: string;
  rows: DirectiveRow[];
  linkifier: Components.Linkifier.Linkifier;
}

export type View = (input: ViewInput, _output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  const renderStatus = (isReportOnly: boolean): LitTemplate => html`
    <td class=${isReportOnly ? 'affected-resource-report-only-status' : 'affected-resource-blocked-status'}>
      ${isReportOnly ? i18nString(UIStrings.reportonly) : i18nString(UIStrings.blocked)}
    </td>
  `;

  const renderViolatedDirective = (directive: string): LitTemplate => html`<td>${directive}</td>`;

  const renderSourceLocation = (location: SourceLocationData|undefined): LitTemplate => {
    if (!location) {
      return html`<td class="affected-source-location"></td>`;
    }
    const sourceAnchor = input.linkifier.linkifyScriptLocation(
        location.target, location.scriptId, location.url, location.lineNumber, {columnNumber: location.columnNumber});
    sourceAnchor.setAttribute('jslog', `${VisualLogging.link('source-location').track({click: true})}`);
    return html`<td class="affected-source-location">${sourceAnchor}</td>`;
  };

  const renderBlockedElement =
      (data: IssuesComponents.ElementsPanelLink.ElementsPanelLinkData|undefined): LitTemplate => {
        if (!data) {
          return html`<td class="affected-resource-csp-info-node"></td>`;
        }
        // clang-format off
        return html`
          <td class="affected-resource-csp-info-node">
            <devtools-widget
              title=${i18nString(UIStrings.clickToRevealTheViolatingDomNode)}
              ${widget(IssuesComponents.ElementsPanelLink.ElementsPanelLink, data)}
            ></devtools-widget>
          </td>
        `;
        // clang-format on
      };

  // clang-format off
  render(html`
    ${input.issueCode === IssuesManager.ContentSecurityPolicyIssue.inlineViolationCode ? html`
      <tr>
        <td class="affected-resource-header">${i18nString(UIStrings.directiveC)}</td>
        <td class="affected-resource-header">${i18nString(UIStrings.element)}</td>
        <td class="affected-resource-header">${i18nString(UIStrings.sourceLocation)}</td>
        <td class="affected-resource-header">${i18nString(UIStrings.status)}</td>
      </tr>
      ${input.rows.map(row => row.hasModel ? html`
        <tr class="affected-resource-directive">
          ${renderViolatedDirective(row.violatedDirective)}
          ${renderBlockedElement(row.elementsPanelLinkData)}
          ${renderSourceLocation(row.sourceLocation)}
          ${renderStatus(row.isReportOnly)}
        </tr>
      ` : nothing)}
    ` : input.issueCode === IssuesManager.ContentSecurityPolicyIssue.urlViolationCode ? html`
      <tr>
        <td class="affected-resource-header affected-resource-directive-info-header">${i18nString(UIStrings.resourceC)}</td>
        <td class="affected-resource-header">${i18nString(UIStrings.status)}</td>
        <td class="affected-resource-header">${i18nString(UIStrings.directiveC)}</td>
        <td class="affected-resource-header">${i18nString(UIStrings.sourceLocation)}</td>
      </tr>
      ${input.rows.map(row => html`
        <tr class="affected-resource-directive">
          <td class="affected-resource-directive-info">${row.blockedURL}</td>
          ${renderStatus(row.isReportOnly)}
          ${renderViolatedDirective(row.violatedDirective)}
          ${renderSourceLocation(row.sourceLocation)}
        </tr>
      `)}
    ` : (input.issueCode === IssuesManager.ContentSecurityPolicyIssue.evalViolationCode ||
         input.issueCode === IssuesManager.ContentSecurityPolicyIssue.trustedTypesPolicyViolationCode) ? html`
      <tr>
        <td class="affected-resource-header">${i18nString(UIStrings.sourceLocation)}</td>
        <td class="affected-resource-header">${i18nString(UIStrings.directiveC)}</td>
        <td class="affected-resource-header">${i18nString(UIStrings.status)}</td>
      </tr>
      ${input.rows.map(row => html`
        <tr class="affected-resource-directive">
          ${renderSourceLocation(row.sourceLocation)}
          ${renderViolatedDirective(row.violatedDirective)}
          ${renderStatus(row.isReportOnly)}
        </tr>
      `)}
    ` : input.issueCode === IssuesManager.ContentSecurityPolicyIssue.trustedTypesSinkViolationCode ? html`
      <tr>
        <td class="affected-resource-header">${i18nString(UIStrings.sourceLocation)}</td>
        <td class="affected-resource-header">${i18nString(UIStrings.status)}</td>
      </tr>
      ${input.rows.map(row => html`
        <tr class="affected-resource-directive">
          ${renderSourceLocation(row.sourceLocation)}
          ${renderStatus(row.isReportOnly)}
        </tr>
      `)}
    ` : nothing}
  `, target);
  // clang-format on
};

const UIStrings = {
  /**
   * @description Label in the Issues panel for the number of affected Content
   * Security Policy (CSP) directives. See
   * https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP.
   */
  nDirectives: '{n, plural, =1 {# directive} other {# directives}}',
  /**
   * @description Resolution status in the Issues panel indicating that a
   * Content Security Policy violation is report-only.
   */
  reportonly: 'Report-only',
  /**
   * @description Resolution status in the Issues panel indicating that a
   * Content Security Policy violation was blocked.
   */
  blocked: 'Blocked',
  /**
   * @description Tooltip in the Issues panel for the button to reveal a
   * violating DOM node in the Elements panel.
   */
  clickToRevealTheViolatingDomNode: 'Click to reveal the violating DOM node in the Elements panel',
  /**
   * @description Column header in the Issues panel for Content Security Policy
   * directives in the affected directives table.
   */
  directiveC: 'Directive',
  /**
   * @description Column header in the Issues panel for DOM elements in the
   * affected directives table.
   */
  element: 'Element',
  /**
   * @description Column header in the Issues panel for source locations in the
   * affected directives table.
   */
  sourceLocation: 'Source location',
  /**
   * @description Column header in the Issues panel for violation status in the
   * affected directives table.
   */
  status: 'Status',
  /**
   * @description Column header in the Issues panel for blocked resources in the
   * affected directives table.
   */
  resourceC: 'Resource',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/issues/AffectedDirectivesView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class AffectedDirectivesView extends AffectedResourcesView {
  readonly #view: View;
  readonly #linkifier = new Components.Linkifier.Linkifier(UI.UIUtils.MaxLengthForDisplayedURLsInConsole);

  constructor(parent: IssueView, issue: IssuesManager.IssueAggregator.AggregatedIssue, jslogContext: string,
              view: View = DEFAULT_VIEW) {
    super(parent, issue, jslogContext);
    this.#view = view;
  }

  protected getResourceNameWithCount(count: number): Platform.UIString.LocalizedString {
    return i18nString(UIStrings.nDirectives, {n: count});
  }

  #appendAffectedContentSecurityPolicyDetails(
      cspIssues: Iterable<IssuesManager.ContentSecurityPolicyIssue.ContentSecurityPolicyIssue>): void {
    const issueCode = this.issue.code();
    if (issueCode !== IssuesManager.ContentSecurityPolicyIssue.inlineViolationCode &&
        issueCode !== IssuesManager.ContentSecurityPolicyIssue.urlViolationCode &&
        issueCode !== IssuesManager.ContentSecurityPolicyIssue.evalViolationCode &&
        issueCode !== IssuesManager.ContentSecurityPolicyIssue.trustedTypesSinkViolationCode &&
        issueCode !== IssuesManager.ContentSecurityPolicyIssue.trustedTypesPolicyViolationCode) {
      this.#view({issueCode, rows: [], linkifier: this.#linkifier}, undefined, this.affectedResources);
      this.updateAffectedResourceCount(0);
      return;
    }

    const rows: DirectiveRow[] = [];
    for (const cspIssue of cspIssues) {
      rows.push(this.#createDirectiveRow(cspIssue));
    }
    this.#view({issueCode, rows, linkifier: this.#linkifier}, undefined, this.affectedResources);
    this.updateAffectedResourceCount(rows.length);
  }

  #createDirectiveRow(cspIssue: IssuesManager.ContentSecurityPolicyIssue.ContentSecurityPolicyIssue): DirectiveRow {
    const cspIssueDetails = cspIssue.details();
    const location = IssuesManager.Issue.toZeroBasedLocation(cspIssueDetails.sourceCodeLocation);
    const model = cspIssue.model();
    const maybeTarget = model?.getTargetIfNotDisposed();
    let sourceLocation: SourceLocationData|undefined;
    if (location) {
      sourceLocation = {
        target: maybeTarget || null,
        scriptId: location.scriptId || null,
        url: location.url as Platform.DevToolsPath.UrlString,
        lineNumber: location.lineNumber,
        columnNumber: location.columnNumber,
      };
    }
    const blockedURL = cspIssueDetails.blockedURL ? cspIssueDetails.blockedURL as Platform.DevToolsPath.UrlString :
                                                    Platform.DevToolsPath.EmptyUrlString;
    const nodeId = cspIssueDetails.violatingNodeId;
    let elementsPanelLinkData: IssuesComponents.ElementsPanelLink.ElementsPanelLinkData|undefined;
    if (model && nodeId) {
      const category = this.issue.getCategory();
      elementsPanelLinkData = {
        onElementRevealIconClick: () => {
          const sdkTarget = model.getTargetIfNotDisposed();
          if (sdkTarget) {
            Host.userMetrics.issuesPanelResourceOpened(category, AffectedItem.ELEMENT);
            const deferredDOMNode = new SDK.DOMModel.DeferredDOMNode(sdkTarget, nodeId);
            void Common.Revealer.reveal(deferredDOMNode);
          }
        },
        onElementRevealIconMouseEnter: () => {
          const sdkTarget = model.getTargetIfNotDisposed();
          if (sdkTarget) {
            const deferredDOMNode = new SDK.DOMModel.DeferredDOMNode(sdkTarget, nodeId);
            if (deferredDOMNode) {
              deferredDOMNode.highlight();
            }
          }
        },
        onElementRevealIconMouseLeave: () => {
          SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight(SDK.TargetManager.TargetManager.instance());
        },
      };
    }
    return {
      violatedDirective: cspIssueDetails.violatedDirective,
      isReportOnly: cspIssueDetails.isReportOnly,
      blockedURL,
      sourceLocation,
      hasModel: Boolean(model),
      elementsPanelLinkData,
    };
  }

  update(): void {
    this.requestResolver.clear();
    this.#linkifier.reset();
    this.#appendAffectedContentSecurityPolicyDetails(this.issue.getCspIssues());
  }
}
