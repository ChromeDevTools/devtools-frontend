// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/kit/kit.js';

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as Protocol from '../../generated/protocol.js';
import type * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import {html, i18nTemplate, type LitTemplate, nothing, render} from '../../ui/lit/lit.js';

import {AffectedResourcesView} from './AffectedResourcesView.js';
import type {IssueView} from './IssueView.js';

const UIStrings = {
  /**
   * @description Label in the Issues panel for the number of affected websites allowed to access cookies. See https://developer.mozilla.org/en-US/docs/Glossary/eTLD.
   */
  nAllowedSites: '{n, plural, =1 {1 website allowed to access cookies} other {# websites allowed to access cookies}}',
  /**
   * @description Details shown next to a website in the Issues panel: the percentage of users for which the website opted out of being allowed to access cookies, followed by a link to documentation.
   * @example {50} PH1
   * @example {learn more} PH2
   */
  optOutDetails: '(opt-out: {PH1}% - {PH2})',
  /**
   * @description Text of a link to documentation about the opt-out percentage shown next to a website in the Issues panel.
   */
  learnMore: 'learn more',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/issues/AffectedMetadataAllowedSitesView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const OPT_OUT_LEARN_MORE_URL = 'https://developers.google.com/privacy-sandbox/blog/grace-period-opt-out';

export interface ViewInput {
  issueDetails: readonly Protocol.Audits.CookieDeprecationMetadataIssueDetails[];
}

export type View = (input: ViewInput, output: object, target: HTMLElement) => void;

function renderOptOut(details: Protocol.Audits.CookieDeprecationMetadataIssueDetails): LitTemplate {
  if (details.isOptOutTopLevel || details.optOutPercentage <= 0) {
    return nothing;
  }
  // clang-format off
  const learnMoreLink = html`<devtools-link
      class="devtools-link" href=${OPT_OUT_LEARN_MORE_URL}
      jslogcontext="learn-more">${i18nString(UIStrings.learnMore)}</devtools-link>`;
  // The single space is intentional: it separates the details from the list of sites in the cell's text.
  return html`<span> ${i18nTemplate(str_, UIStrings.optOutDetails, {
    PH1: String(details.optOutPercentage),
    PH2: learnMoreLink,
  })}</span>`;
  // clang-format on
}

export const DEFAULT_VIEW: View = (input, _output, target) => {
  const siteListFormatter =
      new Intl.ListFormat(i18n.DevToolsLocale.DevToolsLocale.instance().locale, {type: 'unit', style: 'short'});
  // clang-format off
  render(html`
      <tbody>
        ${input.issueDetails.map(details => html`
          <tr class="affected-resource-directive">
            <td><div><span>${siteListFormatter.format(details.allowedSites)}</span>${renderOptOut(details)}</div></td>
          </tr>
        `)}
      </tbody>
    `, target);
  // clang-format on
};

export class AffectedMetadataAllowedSitesView extends AffectedResourcesView {
  readonly #view: View;

  constructor(parent: IssueView, issue: IssuesManager.IssueAggregator.AggregatedIssue, jslogContext: string,
              view: View = DEFAULT_VIEW) {
    super(parent, issue, jslogContext);
    this.#view = view;
  }

  protected override getResourceNameWithCount(count: number): Platform.UIString.LocalizedString {
    return i18nString(UIStrings.nAllowedSites, {n: count});
  }

  override update(): void {
    const issueDetails = Array.from(this.issue.getCookieDeprecationMetadataIssues(), issue => issue.details());
    this.#view({issueDetails}, {}, this.affectedResources);
    this.updateAffectedResourceCount(issueDetails.length);
  }
}
