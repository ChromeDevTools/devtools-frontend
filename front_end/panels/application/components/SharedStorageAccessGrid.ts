// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/legacy/components/data_grid/data_grid.js';

import * as i18n from '../../../core/i18n/i18n.js';
import type * as Protocol from '../../../generated/protocol.js';
// inspectorCommonStyles is imported for the empty state styling that is used for the start view
// eslint-disable-next-line rulesdir/es-modules-import
import inspectorCommonStylesRaw from '../../../ui/legacy/inspectorCommon.css.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import sharedStorageAccessGridStylesRaw from './sharedStorageAccessGrid.css.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const sharedStorageAccessGridStyles = new CSSStyleSheet();
sharedStorageAccessGridStyles.replaceSync(sharedStorageAccessGridStylesRaw.cssContent);

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const inspectorCommonStyles = new CSSStyleSheet();
inspectorCommonStyles.replaceSync(inspectorCommonStylesRaw.cssContent);

const SHARED_STORAGE_EXPLANATION_URL =
    'https://developers.google.com/privacy-sandbox/private-advertising/shared-storage';

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
   *@description Text shown when no shared storage event is shown.
   * Shared storage allows to store and access data that can be shared across different sites.
   * A shared storage event is for example an access from a site to that storage.
   */
  noEvents: 'No shared storage events detected',
  /**
   *@description Text shown when no shared storage event is shown. It explains the shared storage event page.
   * Shared storage allows to store and access data that can be shared across different sites.
   * A shared storage event is for example an access from a site to that storage.
   */
  sharedStorageDescription:
      'On this page you can view, add, edit and delete shared storage key-value pairs and view shared storage events.',
  /**
   * @description Text used in a link to learn more about the topic.
   */
  learnMore: 'Learn more',

};

const str_ = i18n.i18n.registerUIStrings('panels/application/components/SharedStorageAccessGrid.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class SharedStorageAccessGrid extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #datastores: Protocol.Storage.SharedStorageAccessedEvent[] = [];

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [sharedStorageAccessGridStyles, inspectorCommonStyles];
    this.#render();
  }

  // eslint-disable-next-line rulesdir/set-data-type-reference
  set data(data: Protocol.Storage.SharedStorageAccessedEvent[]) {
    this.#datastores = data.sort((a, b) => a.accessTime - b.accessTime);
    this.#render();
  }

  #render(): void {
    render(html`${this.#renderGridOrNoDataMessage()}`, this.#shadow, {host: this});
  }

  #renderGridOrNoDataMessage(): Lit.TemplateResult {
    if (this.#datastores.length === 0) {
      return html`
        <div class="empty-state" jslog=${VisualLogging.section().context('empty-view')}>
          <div class="empty-state-header">${i18nString(UIStrings.noEvents)}</div>
          <div class="empty-state-description">
            <span>${i18nString(UIStrings.sharedStorageDescription)}</span>
            ${
          UI.XLink.XLink.create(
              SHARED_STORAGE_EXPLANATION_URL, i18nString(UIStrings.learnMore), 'x-link', undefined, 'learn-more')}
          </div>
        </div>
      `;
    }
    // clang-format off
    return html`
      <div>
        <span class="heading">${i18nString(UIStrings.sharedStorage)}</span>
        <devtools-icon class="info-icon"
                        title=${i18nString(UIStrings.allSharedStorageEvents)}
                        .data=${{iconName: 'info', color: 'var(--icon-default)', width: '16px'}}>
        </devtools-icon>
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
            ${
        this.#datastores.map((event, index) => html`
              <tr data-index=${index}>
                <td data-value=${event.accessTime}>
                  ${
            new Date(1e3 * event.accessTime)
                .toLocaleString()}
                </td>
                <td>${event.type}</td>
                <td>${event.ownerOrigin}</td>
                <td>${JSON.stringify(event.params)}</td>
              </tr>
            `)}
          </table>
        </devtools-data-grid>
      </div>
    `;
    // clang-format on
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
