// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../ui/legacy/components/data_grid/data_grid.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import endpointsGridStyles from './endpointsGrid.css.js';
const UIStrings = {
    /**
     * @description Placeholder text when there are no Reporting API endpoints.
     *(https://developers.google.com/web/updates/2018/09/reportingapi#tldr)
     */
    noEndpointsToDisplay: 'No endpoints to display',
    /**
     * @description Placeholder text when there are no Reporting API endpoints.
     *(https://developers.google.com/web/updates/2018/09/reportingapi#tldr)
     */
    endpointsDescription: 'Here you will find the list of endpoints that receive the reports',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/components/EndpointsGrid.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const { render, html } = Lit;
export const DEFAULT_VIEW = (input, output, target) => {
    // clang-format off
    render(html `
    <style>${endpointsGridStyles}</style>
    <style>${UI.inspectorCommonStyles}</style>
    <div class="endpoints-container" jslog=${VisualLogging.section('endpoints')}>
      <div class="endpoints-header">${i18n.i18n.lockedString('Endpoints')}</div>
      ${input.endpoints.size > 0 ? html `
        <devtools-data-grid striped>
         <table>
          <tr>
            <th id="origin" weight="30">${i18n.i18n.lockedString('Origin')}</th>
            <th id="name" weight="20">${i18n.i18n.lockedString('Name')}</th>
            <th id="url" weight="30">${i18n.i18n.lockedString('URL')}</th>
          </tr>
          ${Array.from(input.endpoints).map(([origin, endpointArray]) => endpointArray.map(endpoint => html `<tr>
                <td>${origin}</td>
                <td>${endpoint.groupName}</td>
                <td>${endpoint.url}</td>
              </tr>`))
        .flat()}
          </table>
        </devtools-data-grid>
      ` : html `
        <div class="empty-state">
          <span class="empty-state-header">${i18nString(UIStrings.noEndpointsToDisplay)}</span>
          <span class="empty-state-description">${i18nString(UIStrings.endpointsDescription)}</span>
        </div>
      `}
    </div>
  `, target);
    // clang-format on
};
export class EndpointsGrid extends UI.Widget.Widget {
    endpoints = new Map();
    #view;
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
        this.requestUpdate();
    }
    performUpdate() {
        this.#view({
            endpoints: this.endpoints,
        }, undefined, this.contentElement);
    }
}
//# sourceMappingURL=EndpointsGrid.js.map