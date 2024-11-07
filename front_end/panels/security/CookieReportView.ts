// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as LitHtml from '../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import cookieReportViewStyles from './cookieReportView.css.js';

const {render, html, Directives: {ref}} = LitHtml;

const UIStrings = {
  /**
   *@description Title in the header for the third-party cookie report in the Security & Privacy Panel
   */
  title: 'Third-party cookies',
  /**
   *@description Explaination in the header about the cookies listed in the report
   */
  body:
      'Third-party cookies that might be restricted by users, depending on their settings. If a user chooses to restrict cookies, then this site might not work for them.',
  /**
   *@description A link the user can follow to learn more about third party cookie usage
   */
  learnMoreLink: 'Learn more about how third-party cookies are used',
  /**
   *@description Status string in the cookie report for a third-party cookie that is allowed without any sort of exception. This is also used as filter chip text to allow the user to filter the table based on cookie status
   */
  allowed: 'Allowed',
  /**
   *@description Status string in the cookie report for a third-party cookie that is allowed due to a grace period or heuristic exception. Otherwise, this would have been blocked. This is also used as filter chip text to allow the user to filter the table based on cookie status
   */
  allowedByException: 'Allowed By Exception',
  /**
   *@description Status string in the cookie report for a third-party cookie that was blocked. This is also used as filter chip text to allow the user to filter the table based on cookie status
   */
  blocked: 'Blocked',
};
const str_ = i18n.i18n.registerUIStrings('panels/security/CookieReportView.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ViewInput {}
export interface ViewOutput {
  namedBitSetFilterUI?: UI.FilterBar.NamedBitSetFilterUI;
}

export interface CookieReportNodeData {
  name: string;
  domain: string;
  type: string;
  platform: string;
  status: string;
  recommendation: string;
}

export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

const filterItems: UI.FilterBar.Item[] = [
  {
    name: UIStrings.blocked,
    label: () => i18nString(UIStrings.blocked),
    title: UIStrings.blocked,
    jslogContext: UIStrings.blocked,
  },
  {
    name: UIStrings.allowed,
    label: () => i18nString(UIStrings.allowed),
    title: UIStrings.allowed,
    jslogContext: UIStrings.allowed,
  },
  {
    name: UIStrings.allowedByException,
    label: () => i18nString(UIStrings.allowedByException),
    title: UIStrings.allowedByException,
    jslogContext: UIStrings.allowedByException,
  },
];

export class CookieReportView extends UI.Widget.VBox {
  namedBitSetFilterUI?: UI.FilterBar.NamedBitSetFilterUI;
  #view: View;

  constructor(element?: HTMLElement, view: View = (input, output, target) => {
    // clang-format off
    render(html `
        <div class="report overflow-auto">
            <div class="header">
              <div class="title">${i18nString(UIStrings.title)}</div>
              <div class="body">${i18nString(UIStrings.body)} <x-link class="x-link" href="https://developers.google.com/privacy-sandbox/cookies/prepare/audit-cookies" jslog=${VisualLogging.link('learn-more').track({click: true})}>${i18nString(UIStrings.learnMoreLink)}</x-link></div>
            </div>
            <devtools-named-bit-set-filter
              class="filter"
              .options=${{items: filterItems}}
              ${ref((el?: Element) => {
                  if(el instanceof UI.FilterBar.NamedBitSetFilterUIElement){
                    output.namedBitSetFilterUI = el.getOrCreateNamedBitSetFilterUI();
                  }
              })}
            ></devtools-named-bit-set-filter>
        </div>
    `, target, {host: this});
    // clang-format on
  }) {
    super(true, undefined, element);
    this.#view = view;

    this.doUpdate();
  }

  doUpdate(): void {
    this.#view(this, this, this.contentElement);
  }

  override wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([cookieReportViewStyles]);
  }
}
