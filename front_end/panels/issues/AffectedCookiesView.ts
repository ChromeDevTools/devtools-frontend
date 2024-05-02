// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as Protocol from '../../generated/protocol.js';
import * as NetworkForward from '../../panels/network/forward/forward.js';
import * as UI from '../../ui/legacy/legacy.js';

import {AffectedItem, AffectedResourcesView} from './AffectedResourcesView.js';

const UIStrings = {
  /**
   *@description Noun, singular or plural. Label for the kind and number of affected resources associated with a DevTools issue. A cookie is a small piece of data that a server sends to the user's web browser. See https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies.
   */
  nCookies: '{n, plural, =1 {# cookie} other {# cookies}}',
  /**
   *@description Noun, singular. Label for a column in a table which lists cookies in the affected resources section of a DevTools issue. Each cookie has a name.
   */
  name: 'Name',
  /**
   *@description Noun, singular. Label for a column in a table which lists cookies in the affected resources section of a DevTools issue. Cookies may have a 'Domain' attribute: https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies.#define_where_cookies_are_sent
   */
  domain: 'Domain',
  /**
   *@description Noun, singular. Label for a column in a table which lists cookies in the affected resources section of a DevTools issue. Cookies may have a 'Path' attribute: https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies.#define_where_cookies_are_sent
   */
  path: 'Path',
  /**
   *@description Label for the the number of affected `Set-Cookie` lines associated with a DevTools issue. `Set-Cookie` is a specific header line in an HTTP network request and consists of a single line of text.
   */
  nRawCookieLines: '{n, plural, =1 {1 Raw `Set-Cookie` header} other {# Raw `Set-Cookie` headers}}',
  /**
   *@description Title for text button in the Issues panel. Clicking the button navigates the user to the Network Panel. `Set-Cookie` is a specific header line in an HTTP network request and consists of a single line of text.
   */
  filterSetCookieTitle: 'Show network requests that include this `Set-Cookie` header in the network panel',
};
const str_ = i18n.i18n.registerUIStrings('panels/issues/AffectedCookiesView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class AffectedCookiesView extends AffectedResourcesView {
  protected getResourceNameWithCount(count: number): Platform.UIString.LocalizedString {
    return i18nString(UIStrings.nCookies, {n: count});
  }

  #appendAffectedCookies(cookies: Iterable<{cookie: Protocol.Audits.AffectedCookie, hasRequest: boolean}>): void {
    const header = document.createElement('tr');
    this.appendColumnTitle(header, i18nString(UIStrings.name));
    this.appendColumnTitle(
        header, i18nString(UIStrings.domain) + ' & ' + i18nString(UIStrings.path),
        'affected-resource-cookie-info-header');

    this.affectedResources.appendChild(header);

    let count = 0;
    for (const cookie of cookies) {
      count++;
      this.#appendAffectedCookie(cookie.cookie, cookie.hasRequest);
    }
    this.updateAffectedResourceCount(count);
  }

  #appendAffectedCookie(cookie: Protocol.Audits.AffectedCookie, hasAssociatedRequest: boolean): void {
    const element = document.createElement('tr');
    element.classList.add('affected-resource-cookie');
    const name = document.createElement('td');
    if (hasAssociatedRequest) {
      const button = UI.UIUtils.createTextButton(cookie.name, () => {
        Host.userMetrics.issuesPanelResourceOpened(this.issue.getCategory(), AffectedItem.Cookie);
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
      }, {
        className: 'link-style devtools-link',
        jslogContext: 'issues.filter-network-requests-by-cookie',
      });
      name.appendChild(button);
    } else {
      name.textContent = cookie.name;
    }
    element.appendChild(name);
    this.appendIssueDetailCell(element, `${cookie.domain}${cookie.path}`, 'affected-resource-cookie-info');

    this.affectedResources.appendChild(element);
  }

  update(): void {
    this.clear();
    this.#appendAffectedCookies(this.issue.cookiesWithRequestIndicator());
  }
}

export class AffectedRawCookieLinesView extends AffectedResourcesView {
  protected override getResourceNameWithCount(count: number): Platform.UIString.LocalizedString {
    return i18nString(UIStrings.nRawCookieLines, {n: count});
  }

  override update(): void {
    this.clear();
    const cookieLinesWithRequestIndicator = this.issue.getRawCookieLines();
    let count = 0;

    for (const cookie of cookieLinesWithRequestIndicator) {
      const row = document.createElement('tr');
      row.classList.add('affected-resource-directive');
      if (cookie.hasRequest) {
        const cookieLine = document.createElement('td');
        const textButton = UI.UIUtils.createTextButton(cookie.rawCookieLine, () => {
          void Common.Revealer.reveal(NetworkForward.UIFilter.UIRequestFilter.filters([
            {
              filterType: NetworkForward.UIFilter.FilterType.ResponseHeaderValueSetCookie,
              filterValue: cookie.rawCookieLine,
            },
          ]));
        }, {
          className: 'link-style devtools-link',
          jslogContext: 'issues.filter-network-requests-by-raw-cookie',
        });
        textButton.title = i18nString(UIStrings.filterSetCookieTitle);
        cookieLine.appendChild(textButton);
        row.appendChild(cookieLine);
      } else {
        this.appendIssueDetailCell(row, cookie.rawCookieLine);
      }
      this.affectedResources.appendChild(row);
      count++;
    }
    this.updateAffectedResourceCount(count);
  }
}
