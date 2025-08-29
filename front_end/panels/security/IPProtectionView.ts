// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import '../../ui/components/switch/switch.js';
import '../../ui/components/cards/cards.js';
import '../../ui/legacy/components/data_grid/data_grid.js';
import '../../ui/components/buttons/buttons.js';

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';

import ipProtectionViewStyles from './ipProtectionView.css.js';

const {render, html} = Lit;
const {widgetConfig} = UI.Widget;

const UIStrings = {
  /**
   *@description Title in the view's header for the IP Protection tool in the Privacy & Security panel
   */
  viewTitle: 'IP Protection Proxy Controls',
  /**
   *@description Explanation in the view's header about the purpose of this IP Protection tool
   */
  viewExplanation: 'Test how this site will perform if IP Proxy is enabled in Chrome',
  /**
   *@description Title in the card within the IP Protection tool
   */
  cardTitle: 'Bypass IP Protection',
  /**
   *@description Description in the card within the IP Protection tool
   */
  cardDescription: 'Only when DevTools is open',
  /**
   * @description Text informing the user that IP Proxy is not available
   */
  notInIncognito: 'IP proxy unavailable',
  /**
   * @description Description in the widget instructing users to open site in incognito
   */
  openIncognito: 'IP proxy is only available within incognito mode. Open site in incognito.',
  /**
   * @description Column header for the ID of a proxy request in the Proxy Request View panel.
   */
  idColumn: 'ID',
  /**
   * @description Column header for the URL of a proxy request in the Proxy Request View panel.
   */
  urlColumn: 'URL',
  /**
   * @description Column header for the HTTP method of a proxy request in the Proxy Request View panel.
   */
  methodColumn: 'Method',
  /**
   * @description Column header for the status code of a proxy request in the Proxy Request View panel.
   */
  statusColumn: 'Status',
  /**
   * @description Title for the grid of proxy requests.
   */
  proxyRequests: 'Proxy Requests',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/security/IPProtectionView.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const INCOGNITO_EXPLANATION_URL = 'https://support.google.com/chrome/answer/95464?hl=en&co=GENIE.Platform%3DDesktop' as
    Platform.DevToolsPath.UrlString;

// A simplified representation of a network request for mock data.
interface MockNetworkRequest {
  requestId: string;
  url: string;
  requestMethod: string;
  statusCode: number;
}

export type View = (input: IPProtectionView, output: IPProtectionView, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _, target) => {
  // clang-format off
  render(html`
    <style>
      ${ipProtectionViewStyles}
    </style>
    <div class="ip-protection">
      <div class="header">
        <h1>${i18nString(UIStrings.viewTitle)}</h1>
        <div class="body">${i18nString(UIStrings.viewExplanation)}</div>
      </div>
      ${Root.Runtime.hostConfig.isOffTheRecord ? html`
        <devtools-card class="card-container">
          <div class="card">
            <div class="card-header">
              <div class="lhs">
                <div class="text">
                  <h2 class="main-text">${i18nString(UIStrings.cardTitle)}</h2>
                  <div class="body-subtext">
                    ${i18nString(UIStrings.cardDescription)}
                  </div>
                </div>
                <div>
                  <devtools-switch></devtools-switch>
                </div>
              </div>
            </div>
          </div>
        </devtools-card>
        <devtools-data-grid striped name=${i18nString(UIStrings.proxyRequests)}>
          <table>
            <thead>
              <tr>
                <th id="id" sortable>${i18nString(UIStrings.idColumn)}</th>
                <th id="url" sortable>${i18nString(UIStrings.urlColumn)}</th>
                <th id="method" sortable>${i18nString(UIStrings.methodColumn)}</th>
                <th id="status" sortable>${i18nString(UIStrings.statusColumn)}</th>
              </tr>
            </thead>
            <tbody id="proxy-requests-body">
              ${input.proxyRequests.map((request, index) => html`
                <tr data-request-id=${request.requestId}>
                  <td>${index + 1}</td>
                  <td>${request.url}</td>
                  <td>${request.requestMethod}</td>
                  <td>${String(request.statusCode)}</td>
                </tr>
              `)}
            </tbody>
          </table>
        </devtools-data-grid>
        ` : html`
        <div class="empty-report">
          <devtools-widget
            class="learn-more"
            .widgetConfig=${widgetConfig(UI.EmptyWidget.EmptyWidget, {
              header: i18nString(UIStrings.notInIncognito),
              text: i18nString(UIStrings.openIncognito),
              link: INCOGNITO_EXPLANATION_URL,
            })}>
          </devtools-widget>
        </div>
      `}
    </div>
  `, target, {host: input});
  // clang-format on
};

export class IPProtectionView extends UI.Widget.VBox {
  #view: View;
  #proxyRequests: MockNetworkRequest[] = [];

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view;
    this.registerRequiredCSS(ipProtectionViewStyles);

    // TODO(crbug.com/429153435): Replace with real data.
    this.#proxyRequests = [
      {requestId: '1', url: 'https://example.com/api/data', requestMethod: 'GET', statusCode: 200},
      {requestId: '2', url: 'https://example.com/api/submit', requestMethod: 'POST', statusCode: 404},
      {requestId: '3', url: 'https://example.com/assets/style.css', requestMethod: 'GET', statusCode: 200},
    ];

    this.requestUpdate();
  }

  get proxyRequests(): readonly MockNetworkRequest[] {
    return this.#proxyRequests;
  }

  override performUpdate(): void {
    this.#view(this, this, this.contentElement);
  }
}
