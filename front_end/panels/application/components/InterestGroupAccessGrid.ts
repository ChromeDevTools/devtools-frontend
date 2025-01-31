// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/legacy/components/data_grid/data_grid.js';

import * as i18n from '../../../core/i18n/i18n.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as Lit from '../../../ui/lit/lit.js';

import interestGroupAccessGridStylesRaw from './interestGroupAccessGrid.css.legacy.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const interestGroupAccessGridStyles = new CSSStyleSheet();
interestGroupAccessGridStyles.replaceSync(interestGroupAccessGridStylesRaw.cssContent);

const {html} = Lit;

const UIStrings = {
  /**
   *@description Hover text for an info icon in the Interest Group Event panel
   * An interest group is an ad targeting group stored on the browser that can
   * be used to show a certain set of advertisements in the future as the
   * outcome of a FLEDGE auction.
   */
  allInterestGroupStorageEvents: 'All interest group storage events.',
  /**
   *@description Text in InterestGroupStorage Items View of the Application panel
   * Date and time of an Interest Group storage event in a locale-
   * dependent format.
   */
  eventTime: 'Event Time',
  /**
   *@description Text in InterestGroupStorage Items View of the Application panel
   * Type of interest group event such as 'join', 'bid', 'win', or 'leave'.
   */
  eventType: 'Access Type',
  /**
   *@description Text in InterestGroupStorage Items View of the Application panel
   * Owner of the interest group. The origin that controls the
   * content of information associated with the interest group such as which
   * ads get displayed.
   */
  groupOwner: 'Owner',
  /**
   *@description Text in InterestGroupStorage Items View of the Application panel
   * Name of the interest group. The name is unique per-owner and identifies the
   * interest group.
   */
  groupName: 'Name',
  /**
   *@description Text shown instead of a table when the table would be empty.
   */
  noEvents: 'No interest group events recorded.',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/components/InterestGroupAccessGrid.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class InterestGroupAccessGrid extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #datastores: Array<Protocol.Storage.InterestGroupAccessedEvent> = [];

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [interestGroupAccessGridStyles];
    this.#render();
  }

  set data(data: Array<Protocol.Storage.InterestGroupAccessedEvent>) {
    this.#datastores = data;
    this.#render();
  }

  #render(): void {
    // clang-format off
    Lit.render(html`
      <div>
        <span class="heading">Interest Groups</span>
        <devtools-icon class="info-icon"
                       title=${i18nString(UIStrings.allInterestGroupStorageEvents)}
                       .data=${{iconName: 'info', color: 'var(--icon-default)', width: '16px'}}>
        </devtools-icon>
        ${this.#renderGridOrNoDataMessage()}
      </div>
    `, this.#shadow, {host: this});
    // clang-format on
  }

  #renderGridOrNoDataMessage(): Lit.TemplateResult {
    if (this.#datastores.length === 0) {
      return html`<div class="no-events-message">${i18nString(UIStrings.noEvents)}</div>`;
    }

    return html`
      <devtools-new-data-grid @select=${this.#onSelect} striped inline>
        <table>
          <tr>
            <th id="event-time" sortable weight="10">${i18nString(UIStrings.eventTime)}</td>
            <th id="event-type" sortable weight="5">${i18nString(UIStrings.eventType)}</td>
            <th id="event-group-owner" sortable weight="10">${i18nString(UIStrings.groupOwner)}</td>
            <th id="event-group-name" sortable weight="10">${i18nString(UIStrings.groupName)}</td>
          </tr>
          ${this.#datastores.map((event, index) => html`
          <tr data-index=${index}>
            <td>${new Date(1e3 * event.accessTime).toLocaleString()}</td>
            <td>${event.type}</td>
            <td>${event.ownerOrigin}</td>
            <td>${event.name}</td>
          </tr>
        `)}
        </table>
      </devtools-new-data-grid>
    `;
  }

  #onSelect(event: CustomEvent<HTMLElement|null>): void {
    if (event.detail) {
      this.dispatchEvent(new CustomEvent('select', {detail: this.#datastores[Number(event.detail.dataset.index)]}));
    }
  }
}

customElements.define('devtools-interest-group-access-grid', InterestGroupAccessGrid);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-interest-group-access-grid': InterestGroupAccessGrid;
  }
}
