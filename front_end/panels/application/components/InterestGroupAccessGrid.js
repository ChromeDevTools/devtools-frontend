// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../../ui/legacy/components/data_grid/data_grid.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import interestGroupAccessGridStyles from './interestGroupAccessGrid.css.js';
const { html } = Lit;
const UIStrings = {
    /**
     * @description Hover text for an info icon in the Interest Group Event panel
     * An interest group is an ad targeting group stored on the browser that can
     * be used to show a certain set of advertisements in the future as the
     * outcome of a FLEDGE auction.
     */
    allInterestGroupStorageEvents: 'All interest group storage events.',
    /**
     * @description Text in InterestGroupStorage Items View of the Application panel
     * Date and time of an Interest Group storage event in a locale-
     * dependent format.
     */
    eventTime: 'Event Time',
    /**
     * @description Text in InterestGroupStorage Items View of the Application panel
     * Type of interest group event such as 'join', 'bid', 'win', or 'leave'.
     */
    eventType: 'Access Type',
    /**
     * @description Text in InterestGroupStorage Items View of the Application panel
     * Owner of the interest group. The origin that controls the
     * content of information associated with the interest group such as which
     * ads get displayed.
     */
    groupOwner: 'Owner',
    /**
     * @description Text in InterestGroupStorage Items View of the Application panel
     * Name of the interest group. The name is unique per-owner and identifies the
     * interest group.
     */
    groupName: 'Name',
    /**
     * @description Text shown when no interest groups are detected.
     * An interest group is an ad targeting group stored on the browser that can
     * be used to show a certain set of advertisements in the future as the
     * outcome of a FLEDGE auction.
     */
    noEvents: 'No interest group events detected',
    /**
     * @description Text shown when no interest groups are detected and explains what this page is about.
     * An interest group is an ad targeting group stored on the browser that can
     * be used to show a certain set of advertisements in the future as the
     * outcome of a FLEDGE auction.
     */
    interestGroupDescription: 'On this page you can inspect and analyze interest groups',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/components/InterestGroupAccessGrid.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class InterestGroupAccessGrid extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #datastores = [];
    connectedCallback() {
        this.#render();
    }
    // eslint-disable-next-line @devtools/set-data-type-reference
    set data(data) {
        this.#datastores = data;
        this.#render();
    }
    #render() {
        // clang-format off
        Lit.render(html `
      <style>${interestGroupAccessGridStyles}</style>
      <style>${UI.inspectorCommonStyles}</style>
      ${this.#datastores.length === 0 ?
            html `
          <div class="empty-state">
            <span class="empty-state-header">${i18nString(UIStrings.noEvents)}</span>
            <span class="empty-state-description">${i18nString(UIStrings.interestGroupDescription)}</span>
          </div>` :
            html `
          <div>
            <span class="heading">Interest Groups</span>
            <devtools-icon class="info-icon medium" name="info"
                          title=${i18nString(UIStrings.allInterestGroupStorageEvents)}>
            </devtools-icon>
            ${this.#renderGrid()}
          </div>`}
    `, this.#shadow, { host: this });
        // clang-format on
    }
    #renderGrid() {
        // clang-format off
        return html `
      <devtools-data-grid striped inline>
        <table>
          <tr>
            <th id="event-time" sortable weight="10">${i18nString(UIStrings.eventTime)}</td>
            <th id="event-type" sortable weight="5">${i18nString(UIStrings.eventType)}</td>
            <th id="event-group-owner" sortable weight="10">${i18nString(UIStrings.groupOwner)}</td>
            <th id="event-group-name" sortable weight="10">${i18nString(UIStrings.groupName)}</td>
          </tr>
          ${this.#datastores.map(event => html `
          <tr @select=${() => this.dispatchEvent(new CustomEvent('select', { detail: event }))}>
            <td>${new Date(1e3 * event.accessTime).toLocaleString()}</td>
            <td>${event.type}</td>
            <td>${event.ownerOrigin}</td>
            <td>${event.name}</td>
          </tr>
        `)}
        </table>
      </devtools-data-grid>`;
        // clang-format on
    }
}
customElements.define('devtools-interest-group-access-grid', InterestGroupAccessGrid);
//# sourceMappingURL=InterestGroupAccessGrid.js.map