// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/legacy/components/data_grid/data_grid.js';

import * as i18n from '../../../core/i18n/i18n.js';
import type * as Protocol from '../../../generated/protocol.js';
// inspectorCommonStyles is imported for the empty state styling that is used for the start view
// eslint-disable-next-line rulesdir/es-modules-import
import inspectorCommonStylesRaw from '../../../ui/legacy/inspectorCommon.css.js';
import * as Lit from '../../../ui/lit/lit.js';

import interestGroupAccessGridStylesRaw from './interestGroupAccessGrid.css.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const inspectorCommonStyles = new CSSStyleSheet();
inspectorCommonStyles.replaceSync(inspectorCommonStylesRaw.cssContent);

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
   *@description Text shown when no interest groups are detected.
   * An interest group is an ad targeting group stored on the browser that can
   * be used to show a certain set of advertisements in the future as the
   * outcome of a FLEDGE auction.
   */
  noEvents: 'No interest group events detected',
  /**
   *@description Text shown when no interest groups are detected and explains what this page is about.
   * An interest group is an ad targeting group stored on the browser that can
   * be used to show a certain set of advertisements in the future as the
   * outcome of a FLEDGE auction.
   */
  interestGroupDescription: 'On this page you can inspect and analyze interest groups',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/components/InterestGroupAccessGrid.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class InterestGroupAccessGrid extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #datastores: Protocol.Storage.InterestGroupAccessedEvent[] = [];

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [interestGroupAccessGridStyles, inspectorCommonStyles];
    this.#render();
  }

  // eslint-disable-next-line rulesdir/set-data-type-reference
  set data(data: Protocol.Storage.InterestGroupAccessedEvent[]) {
    this.#datastores = data;
    this.#render();
  }

  #render(): void {
    if (this.#datastores.length === 0) {
      Lit.render(this.#renderEmptyState(), this.#shadow, {host: this});
      return;
    }
    // clang-format off
    Lit.render(html`
      <div>
        <span class="heading">Interest Groups</span>
        <devtools-icon class="info-icon"
                       title=${i18nString(UIStrings.allInterestGroupStorageEvents)}
                       .data=${{iconName: 'info', color: 'var(--icon-default)', width: '16px'}}>
        </devtools-icon>
        ${this.#renderGrid()}
      </div>
    `, this.#shadow, {host: this});
    // clang-format on
  }

  #renderEmptyState(): Lit.TemplateResult {
    return html`
      <div class="empty-state">
        <span class="empty-state-header">${i18nString(UIStrings.noEvents)}</span>
        <span class="empty-state-description">${i18nString(UIStrings.interestGroupDescription)}</span>
      </div>
    `;
  }

  #renderGrid(): Lit.TemplateResult {
    return html`
      <devtools-data-grid @select=${this.#onSelect} striped inline>
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
      </devtools-data-grid>
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
