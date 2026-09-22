// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as ApplicationComponents from './components/components.js';
const { widget } = UI.Widget;
const UIStrings = {
    /**
     * @description Header text in an empty state view when no report or endpoint has been detected in the reporting API view of the Application panel.
     */
    noReportOrEndpoint: 'No report or endpoint',
    /**
     * @description Explanatory text in an empty state view describing the reporting API view of the Application panel.
     */
    reportingApiDescription: 'Inspect `Reporting API` reports and endpoints',
    /**
     * @description Header text in an empty state view when no report is selected in the reporting API view of the Application panel.
     */
    noReportSelected: 'No report selected',
    /**
     * @description Explanatory text instructing the user how to display a report body in the reporting API view of the Application panel.
     */
    clickToDisplayBody: 'Click any report to display its body',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/ReportingApiView.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const REPORTING_API_EXPLANATION_URL = 'https://developer.chrome.com/docs/capabilities/web-apis/reporting-api';
export const DEFAULT_VIEW = (input, output, target) => {
    if (input.hasReports || input.hasEndpoints) {
        // clang-format off
        render(html `
      <style>${UI.inspectorCommonStyles}</style>
      <devtools-split-view sidebar-position="second" sidebar-initial-size="150" jslog=${VisualLogging.pane('reporting-api')}>
        ${input.hasReports ? html `
          <devtools-split-view slot="main" sidebar-position="second" sidebar-initial-size="150">
            <div slot="main">
              ${widget(ApplicationComponents.ReportsGrid.ReportsGrid, {
            reports: input.reports, onReportSelected: input.onReportSelected,
        })}
            </div>
            <div slot="sidebar" class="vbox" jslog=${VisualLogging.pane('preview').track({ resize: true })}>
              ${input.focusedReport
            ? widget(SourceFrame.JSONView.SearchableJsonView, { jsonObject: input.focusedReport.body })
            : widget(UI.EmptyWidget.EmptyWidget, {
                header: i18nString(UIStrings.noReportSelected),
                text: i18nString(UIStrings.clickToDisplayBody),
            })}
            </div>
          </devtools-split-view>
        ` : html `
          <div slot="main">
            ${widget(ApplicationComponents.ReportsGrid.ReportsGrid, {
            reports: input.reports, onReportSelected: input.onReportSelected,
        })}
          </div>
        `}
        <div slot="sidebar">
          ${widget(ApplicationComponents.EndpointsGrid.EndpointsGrid, {
            endpoints: input.endpoints,
        })}
        </div>
      </devtools-split-view>
    `, target);
        // clang-format on
    }
    else {
        // clang-format off
        render(html `
      <devtools-widget ${widget(UI.EmptyWidget.EmptyWidget, {
            header: i18nString(UIStrings.noReportOrEndpoint),
            text: i18nString(UIStrings.reportingApiDescription),
            link: REPORTING_API_EXPLANATION_URL,
        })} jslog=${VisualLogging.pane('reporting-api-empty')}></devtools-widget>
    `, target);
        // clang-format on
    }
};
export class ReportingApiView extends UI.Widget.VBox {
    #endpoints;
    #view;
    #networkManager;
    #reports = [];
    #focusedReport;
    constructor(view = DEFAULT_VIEW) {
        super();
        this.#view = view;
        this.#endpoints = new Map();
        SDK.TargetManager.TargetManager.instance().observeModels(SDK.NetworkManager.NetworkManager, this);
        this.requestUpdate();
    }
    modelAdded(networkManager) {
        if (networkManager.target() !== SDK.TargetManager.TargetManager.instance().primaryPageTarget()) {
            return;
        }
        this.#networkManager = networkManager;
        this.#networkManager.addEventListener(SDK.NetworkManager.Events.ReportingApiEndpointsChangedForOrigin, this.#onEndpointsChangedForOrigin, this);
        this.#networkManager.addEventListener(SDK.NetworkManager.Events.ReportingApiReportAdded, this.#onReportAdded, this);
        this.#networkManager.addEventListener(SDK.NetworkManager.Events.ReportingApiReportUpdated, this.#onReportUpdated, this);
        void this.#networkManager.enableReportingApi();
        this.requestUpdate();
    }
    modelRemoved(networkManager) {
        if (!this.#networkManager || this.#networkManager !== networkManager) {
            return;
        }
        this.#networkManager.removeEventListener(SDK.NetworkManager.Events.ReportingApiEndpointsChangedForOrigin, this.#onEndpointsChangedForOrigin, this);
        this.#networkManager.removeEventListener(SDK.NetworkManager.Events.ReportingApiReportAdded, this.#onReportAdded, this);
        this.#networkManager.removeEventListener(SDK.NetworkManager.Events.ReportingApiReportUpdated, this.#onReportUpdated, this);
        this.#networkManager = undefined;
    }
    performUpdate() {
        const viewInput = {
            hasReports: this.#reports.length > 0,
            hasEndpoints: this.#endpoints.size > 0,
            endpoints: this.#endpoints,
            reports: this.#reports,
            focusedReport: this.#focusedReport,
            onReportSelected: this.#onReportSelected.bind(this),
        };
        this.#view(viewInput, undefined, this.element);
    }
    #onEndpointsChangedForOrigin({ data }) {
        this.#endpoints.set(data.origin, data.endpoints);
        this.requestUpdate();
    }
    #onReportAdded({ data: report }) {
        this.#reports.push(report);
        this.requestUpdate();
    }
    #onReportUpdated({ data: report }) {
        const index = this.#reports.findIndex(oldReport => oldReport.id === report.id);
        this.#reports[index] = report;
        this.requestUpdate();
    }
    #onReportSelected(id) {
        const report = this.#reports.find(report => report.id === id);
        if (report) {
            this.#focusedReport = report;
            this.requestUpdate();
        }
    }
}
//# sourceMappingURL=ReportingApiView.js.map