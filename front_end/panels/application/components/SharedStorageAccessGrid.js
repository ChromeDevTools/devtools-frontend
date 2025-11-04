// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../ui/legacy/components/data_grid/data_grid.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import sharedStorageAccessGridStyles from './sharedStorageAccessGrid.css.js';
const SHARED_STORAGE_EXPLANATION_URL = 'https://developers.google.com/privacy-sandbox/private-advertising/shared-storage';
const { render, html } = Lit;
const UIStrings = {
    /**
     * @description Text in Shared Storage Events View of the Application panel
     */
    sharedStorage: 'Shared storage',
    /**
     * @description Hover text for an info icon in the Shared Storage Events panel
     */
    allSharedStorageEvents: 'All shared storage events for this page.',
    /**
     * @description Text in Shared Storage Events View of the Application panel
     * Date and time of an Shared Storage event in a locale-
     * dependent format.
     */
    eventTime: 'Event Time',
    /**
     * @description Text in Shared Storage Events View of the Application panel
     * Scope of shared storage event such as 'window', 'sharedStorageWorklet',
     * 'protectedAudienceWorklet', or 'header'.
     */
    eventScope: 'Access Scope',
    /**
     * @description Text in Shared Storage Events View of the Application panel
     * Method of shared storage event such as 'addModule', 'run', 'set', 'delete',
     * or 'get'.
     */
    eventMethod: 'Access Method',
    /**
     * @description Text in Shared Storage Events View of the Application panel
     * Owner origin of the shared storage for this access event.
     */
    ownerOrigin: 'Owner Origin',
    /**
     * @description Text in Shared Storage Events View of the Application panel
     * Owner site of the shared storage for this access event.
     */
    ownerSite: 'Owner Site',
    /**
     * @description Text in Shared Storage Events View of the Application panel
     * Event parameters whose presence/absence depend on the access type.
     */
    eventParams: 'Optional Event Params',
    /**
     * @description Text shown when no shared storage event is shown.
     * Shared storage allows to store and access data that can be shared across different sites.
     * A shared storage event is for example an access from a site to that storage.
     */
    noEvents: 'No shared storage events detected',
    /**
     * @description Text shown when no shared storage event is shown. It explains the shared storage event page.
     * Shared storage allows to store and access data that can be shared across different sites.
     * A shared storage event is for example an access from a site to that storage.
     */
    sharedStorageDescription: 'On this page you can view, add, edit and delete shared storage key-value pairs and view shared storage events.',
    /**
     * @description Text used in a link to learn more about the topic.
     */
    learnMore: 'Learn more',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/components/SharedStorageAccessGrid.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
    <style>${sharedStorageAccessGridStyles}</style>
    ${input.events.length === 0
        ? html `
        <div class="empty-state" jslog=${VisualLogging.section().context('empty-view')}>
          <div class="empty-state-header">${i18nString(UIStrings.noEvents)}</div>
          <div class="empty-state-description">
            <span>${i18nString(UIStrings.sharedStorageDescription)}</span>
            ${UI.XLink.XLink.create(SHARED_STORAGE_EXPLANATION_URL, i18nString(UIStrings.learnMore), 'x-link', undefined, 'learn-more')}
          </div>
        </div>`
        : html `
        <div jslog=${VisualLogging.section('events-table')}>
          <span class="heading">${i18nString(UIStrings.sharedStorage)}</span>
          <devtools-icon class="info-icon medium" name="info"
                          title=${i18nString(UIStrings.allSharedStorageEvents)}>
          </devtools-icon>
          <devtools-data-grid striped inline>
            <table>
              <thead>
                <tr>
                  <th id="event-time" weight="10" sortable>
                    ${i18nString(UIStrings.eventTime)}
                  </th>
                  <th id="event-scope" weight="10" sortable>
                    ${i18nString(UIStrings.eventScope)}
                  </th>
                  <th id="event-method" weight="10" sortable>
                    ${i18nString(UIStrings.eventMethod)}
                  </th>
                  <th id="event-owner-origin" weight="10" sortable>
                    ${i18nString(UIStrings.ownerOrigin)}
                  </th>
                  <th id="event-owner-site" weight="10" sortable>
                    ${i18nString(UIStrings.ownerSite)}
                  </th>
                  <th id="event-params" weight="10" sortable>
                    ${i18nString(UIStrings.eventParams)}
                  </th>
                </tr>
              </thead>
              <tbody>
                ${input.events.map(event => html `
                  <tr @select=${() => input.onSelect(event)}>
                    <td data-value=${event.accessTime}>
                      ${new Date(1e3 * event.accessTime).toLocaleString()}
                    </td>
                    <td>${event.scope}</td>
                    <td>${event.method}</td>
                    <td>${event.ownerOrigin}</td>
                    <td>${event.ownerSite}</td>
                    <td>${JSON.stringify(event.params)}</td>
                  </tr>
                `)}
              </tbody>
            </table>
          </devtools-data-grid>
        </div>`}`, target);
    // clang-format on
};
export class SharedStorageAccessGrid extends UI.Widget.Widget {
    #view;
    #events = [];
    #onSelect = () => { };
    constructor(element, view = DEFAULT_VIEW) {
        super(element, { useShadowDom: true });
        this.#view = view;
        this.performUpdate();
    }
    set events(events) {
        this.#events = events;
        this.performUpdate();
    }
    set onSelect(onSelect) {
        this.#onSelect = onSelect;
        this.performUpdate();
    }
    get onSelect() {
        return this.#onSelect;
    }
    performUpdate() {
        this.#view({
            events: this.#events,
            onSelect: this.#onSelect.bind(this),
        }, {}, this.contentElement);
    }
}
//# sourceMappingURL=SharedStorageAccessGrid.js.map