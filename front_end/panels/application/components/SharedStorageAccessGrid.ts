// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/legacy/components/data_grid/data_grid.js';

import * as i18n from '../../../core/i18n/i18n.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as Lit from '../../../ui/lit/lit.js';

import sharedStorageAccessGridStylesRaw from './sharedStorageAccessGrid.css.legacy.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const sharedStorageAccessGridStyles = new CSSStyleSheet();
sharedStorageAccessGridStyles.replaceSync(sharedStorageAccessGridStylesRaw.cssContent);

const {render, html} = Lit;

const UIStrings = {
  /**
   *@description Text in Shared Storage Events View of the Application panel
   */
  sharedStorage: 'Shared storage',
  /**
   *@description Hover text for an info icon in the Shared Storage Events panel
   */
  allSharedStorageEvents: 'All shared storage events for this page.',
  /**
   *@description Text in Shared Storage Events View of the Application panel
   * Date and time of an Shared Storage event in a locale-
   * dependent format.
   */
  eventTime: 'Event Time',
  /**
   *@description Text in Shared Storage Events View of the Application panel
   * Type of shared storage event such as 'documentAddModule', 'documentRun',
   * 'documentSet', 'workletDelete', or 'workletGet'.
   */
  eventType: 'Access Type',
  /**
   *@description Text in Shared Storage Events View of the Application panel
   * Owner origin of the shared storage for this access event.
   */
  ownerOrigin: 'Owner Origin',
  /**
   *@description Text in Shared Storage Events View of the Application panel
   * Event parameters whose presence/absence depend on the access type.
   */
  eventParams: 'Optional Event Params',
  /**
   *@description Text shown instead of a table when the table would be empty.
   */
  noEvents: 'No shared storage events recorded.',
};

const str_ = i18n.i18n.registerUIStrings('panels/application/components/SharedStorageAccessGrid.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class SharedStorageAccessGrid extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #datastores: Array<Protocol.Storage.SharedStorageAccessedEvent> = [];

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [sharedStorageAccessGridStyles];
    this.#render();
  }

  set data(data: Array<Protocol.Storage.SharedStorageAccessedEvent>) {
    this.#datastores = data.sort((a, b) => a.accessTime - b.accessTime);
    this.#render();
  }

  #render(): void {
    // clang-format off
    render(html`
      <div>
        <span class="heading">${i18nString(UIStrings.sharedStorage)}</span>
        <devtools-icon class="info-icon"
                       title=${i18nString(UIStrings.allSharedStorageEvents)}
                       .data=${{iconName: 'info', color: 'var(--icon-default)', width: '16px'}}>
        </devtools-icon>
        ${this.#renderGridOrNoDataMessage()}
      </div>
    `, this.#shadow, {host: this});
    // clang-format on
  }

  #renderGridOrNoDataMessage(): Lit.TemplateResult {
    if (this.#datastores.length === 0) {
      return html`<div
        class="no-events-message">${i18nString(UIStrings.noEvents)}</div>`;
    }
    return html`
      <devtools-data-grid striped inline @select=${this.#onSelect}>
        <table>
          <tr>
            <th id="event-time" weight="10" sortable>
              ${i18nString(UIStrings.eventTime)}
            </th>
            <th id="event-type" weight="10" sortable>
              ${i18nString(UIStrings.eventType)}
            </th>
            <th id="event-owner-origin" weight="10" sortable>
              ${i18nString(UIStrings.ownerOrigin)}
            </th>
            <th id="event-params" weight="10" sortable>
              ${i18nString(UIStrings.eventParams)}
            </th>
          </tr>
          ${this.#datastores.map((event, index) => html`
            <tr data-index=${index}>
              <td data-value=${event.accessTime}>
                ${new Date(1e3 * event.accessTime).toLocaleString()}
              </td>
              <td>${event.type}</td>
              <td>${event.ownerOrigin}</td>
              <td>${JSON.stringify(event.params)}</td>
            </tr>
          `)}
        </table>
      </devtools-data-grid>
    `;
  }

  #onSelect(event: CustomEvent<HTMLElement>): void {
    const index = parseInt(event.detail.dataset.index || '', 10);
    const datastore = isNaN(index) ? undefined : this.#datastores[index];
    if (datastore) {
      this.dispatchEvent(new CustomEvent('select', {detail: datastore}));
    }
  }
}

customElements.define('devtools-shared-storage-access-grid', SharedStorageAccessGrid);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-shared-storage-access-grid': SharedStorageAccessGrid;
  }
}
