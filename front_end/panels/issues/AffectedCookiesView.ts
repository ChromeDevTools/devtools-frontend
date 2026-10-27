// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as Protocol from '../../generated/protocol.js';
import type * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as NetworkForward from '../../panels/network/forward/forward.js';
import {html, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {AffectedItem, AffectedResourcesView} from './AffectedResourcesView.js';
import type {IssueView} from './IssueView.js';

export interface CookieViewItem {
  name: string;
  domainAndPath: string;
  hasRequest: boolean;
  onClick: () => void;
}

export interface CookiesViewInput {
  cookies: CookieViewItem[];
}

export type CookiesView = (input: CookiesViewInput, _output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: CookiesView = (input, _output, target) => {
  // clang-format off
  render(html`
    <tr>
      <td class="affected-resource-header">${i18nString(UIStrings.name)}</td>
      <td class="affected-resource-header affected-resource-cookie-info-header">
        ${i18nString(UIStrings.domainAndPath)}
      </td>
    </tr>
    ${input.cookies.map(cookie => html`
      <tr class="affected-resource-cookie" jslog=${VisualLogging.tableRow('affected-cookie')}>
        <td>
          ${cookie.hasRequest ? html`
            <button
              class="link devtools-link"
              tabindex="0"
              jslog=${VisualLogging.link('issues.filter-network-requests-by-cookie').track({click: true})}
              @click=${cookie.onClick}
            >${cookie.name}</button>
          ` : cookie.name}
        </td>
        <td class="affected-resource-cookie-info">${cookie.domainAndPath}</td>
      </tr>
    `)}
  `, target);
  // clang-format on
};

export interface RawCookieLinesViewInput {
  cookieLines: Array<{rawCookieLine: string, hasRequest: boolean}>;
  onRawCookieClick: (rawCookieLine: string) => void;
}

export type RawCookieLinesView = (input: RawCookieLinesViewInput, _output: undefined, target: HTMLElement) => void;

export const RAW_COOKIE_LINES_VIEW: RawCookieLinesView = (input, _output, target) => {
  // clang-format off
  render(html`
    ${input.cookieLines.map(cookie => html`
      <tr class="affected-resource-directive" jslog=${VisualLogging.tableRow('affected-raw-cookie')}>
        <td>
          ${cookie.hasRequest ? html`
            <button
              class="link devtools-link"
              title=${i18nString(UIStrings.filterSetCookieTitle)}
              tabindex="0"
              jslog=${VisualLogging.link('issues.filter-network-requests-by-raw-cookie').track({click: true})}
              @click=${() => input.onRawCookieClick(cookie.rawCookieLine)}
            >${cookie.rawCookieLine}</button>
          ` : cookie.rawCookieLine}
        </td>
      </tr>
    `)}
  `, target);
  // clang-format on
};

const UIStrings = {
  /**
   * @description Label in the Issues panel for the number of affected cookies.
   * See https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies.
   */
  nCookies: '{n, plural, =1 {# cookie} other {# cookies}}',
  /**
   * @description Column header in the Issues panel for cookie names in the
   * affected cookies table.
   */
  name: 'Name',
  /**
   * @description Column header in the Issues panel for cookie domains and paths
   * in the affected cookies table. See
   * https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#define_where_cookies_are_sent.
   */
  domainAndPath: 'Domain & path',
  /**
   * @description Label in the Issues panel for the number of affected raw
   * Set-Cookie headers.
   */
  nRawCookieLines: '{n, plural, =1 {1 raw `Set-Cookie` header} other {# raw `Set-Cookie` headers}}',
  /**
   * @description Tooltip in the Issues panel for the button to filter network
   * requests by this Set-Cookie header in the Network panel.
   */
  filterSetCookieTitle: 'Show network requests that include this `Set-Cookie` header in the Network panel',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/issues/AffectedCookiesView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class AffectedCookiesView extends AffectedResourcesView {
  readonly #view: CookiesView;

  constructor(parent: IssueView, issue: IssuesManager.IssueAggregator.AggregatedIssue, jslogContext: string,
              view: CookiesView = DEFAULT_VIEW) {
    super(parent, issue, jslogContext);
    this.#view = view;
  }

  protected override getResourceNameWithCount(count: number): Platform.UIString.LocalizedString {
    return i18nString(UIStrings.nCookies, {n: count});
  }

  #appendAffectedCookies(cookies: Iterable<{cookie: Protocol.Audits.AffectedCookie, hasRequest: boolean}>): void {
    const cookieList: CookieViewItem[] = Array.from(
        cookies, ({cookie, hasRequest}) => ({
                   name: cookie.name,
                   domainAndPath: `${cookie.domain}${cookie.path}`,
                   hasRequest,
                   onClick: () => {
                     Host.userMetrics.issuesPanelResourceOpened(this.issue.getCategory(), AffectedItem.COOKIE);
                     void Common.Revealer.reveal(NetworkForward.UIFilter.UIRequestFilter.filters([
                       {
                         filterType: NetworkForward.UIFilter.FilterType.CookieDomain,
                         filterValue: cookie.domain,
                       },
                       {
                         filterType: NetworkForward.UIFilter.FilterType.CookieName,
                         filterValue: cookie.name,
                       },
                       {
                         filterType: NetworkForward.UIFilter.FilterType.CookiePath,
                         filterValue: cookie.path,
                       },
                     ]));
                   },
                 }));
    this.#view({cookies: cookieList}, undefined, this.affectedResources);
    this.updateAffectedResourceCount(cookieList.length);
  }

  override update(): void {
    this.requestResolver.clear();
    this.#appendAffectedCookies(this.issue.cookiesWithRequestIndicator());
  }
}

export class AffectedRawCookieLinesView extends AffectedResourcesView {
  readonly #view: RawCookieLinesView;

  constructor(parent: IssueView, issue: IssuesManager.IssueAggregator.AggregatedIssue, jslogContext: string,
              view: RawCookieLinesView = RAW_COOKIE_LINES_VIEW) {
    super(parent, issue, jslogContext);
    this.#view = view;
  }

  protected override getResourceNameWithCount(count: number): Platform.UIString.LocalizedString {
    return i18nString(UIStrings.nRawCookieLines, {n: count});
  }

  override update(): void {
    this.requestResolver.clear();
    const cookieLines = Array.from(this.issue.getRawCookieLines());
    this.#view({
      cookieLines,
      onRawCookieClick: rawCookieLine => {
        void Common.Revealer.reveal(NetworkForward.UIFilter.UIRequestFilter.filters([
          {
            filterType: NetworkForward.UIFilter.FilterType.ResponseHeaderValueSetCookie,
            filterValue: rawCookieLine,
          },
        ]));
      },
    },
               undefined, this.affectedResources);
    this.updateAffectedResourceCount(cookieLines.length);
  }
}
