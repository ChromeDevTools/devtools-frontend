// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Network from '../network/network.js';
import type * as Protocol from '../../generated/protocol.js';

import {AffectedItem, AffectedResourcesView} from './AffectedResourcesView.js';

import type {AggregatedIssue} from './IssueAggregator.js';
import type {IssueView} from './IssueView.js';

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
};
const str_ = i18n.i18n.registerUIStrings('panels/issues/AffectedCookiesView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class AffectedCookiesView extends AffectedResourcesView {
  private issue: AggregatedIssue;
  constructor(parent: IssueView, issue: AggregatedIssue) {
    super(parent);
    this.issue = issue;
  }

  protected getResourceNameWithCount(count: number): Platform.UIString.LocalizedString {
    return i18nString(UIStrings.nCookies, {n: count});
  }

  private appendAffectedCookies(cookies: Iterable<{cookie: Protocol.Audits.AffectedCookie, hasRequest: boolean}>):
      void {
    const header = document.createElement('tr');
    this.appendColumnTitle(header, i18nString(UIStrings.name));
    this.appendColumnTitle(
        header, i18nString(UIStrings.domain) + ' & ' + i18nString(UIStrings.path),
        'affected-resource-cookie-info-header');

    this.affectedResources.appendChild(header);

    let count = 0;
    for (const cookie of cookies) {
      count++;
      this.appendAffectedCookie(cookie.cookie, cookie.hasRequest);
    }
    this.updateAffectedResourceCount(count);
  }

  private appendAffectedCookie(cookie: Protocol.Audits.AffectedCookie, hasAssociatedRequest: boolean): void {
    const element = document.createElement('tr');
    element.classList.add('affected-resource-cookie');
    const name = document.createElement('td');
    if (hasAssociatedRequest) {
      name.appendChild(UI.UIUtils.createTextButton(cookie.name, () => {
        Host.userMetrics.issuesPanelResourceOpened(this.issue.getCategory(), AffectedItem.Cookie);
        Network.NetworkPanel.NetworkPanel.revealAndFilter([
          {
            filterType: Network.NetworkLogView.FilterType.CookieDomain,
            filterValue: cookie.domain,
          },
          {
            filterType: Network.NetworkLogView.FilterType.CookieName,
            filterValue: cookie.name,
          },
          {
            filterType: Network.NetworkLogView.FilterType.CookiePath,
            filterValue: cookie.path,
          },
        ]);
      }, 'link-style devtools-link'));
    } else {
      name.textContent = cookie.name;
    }
    element.appendChild(name);
    this.appendIssueDetailCell(element, `${cookie.domain}${cookie.path}`, 'affected-resource-cookie-info');

    this.affectedResources.appendChild(element);
  }

  update(): void {
    this.clear();
    this.appendAffectedCookies(this.issue.cookiesWithRequestIndicator());
  }
}
