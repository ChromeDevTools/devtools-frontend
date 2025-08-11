// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import '../../ui/components/switch/switch.js';
import '../../ui/components/cards/cards.js';

import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';

import ipProtectionViewStyles from './ipProtectionView.css.js';

const {render, html} = Lit;

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
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/security/IPProtectionView.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const i18nFormatString = i18n.i18n.getFormatLocalizedString.bind(undefined, str_);

export type View = (input: object, output: object, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _, target) => {
  // clang-format off
  render(html`
    <style>
      ${ipProtectionViewStyles}
    </style>
    <div class="overflow-auto">
      <div class="ip-protection">
        <div class="header">
          <h1>${i18nString(UIStrings.viewTitle)}</h1>
          <div class="body">${i18nString(UIStrings.viewExplanation)}</div>
        </div>
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
      </div>
    </div>
  `, target);
  // clang-format on
};

export class IPProtectionView extends UI.Widget.VBox {
  #view: View;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view;
    this.requestUpdate();
  }

  override performUpdate(): void {
    this.#view(this, this, this.contentElement);
  }
}
