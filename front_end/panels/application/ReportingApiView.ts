// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import * as ApplicationComponents from './components/components.js';

const {widgetConfig} = UI.Widget;

const UIStrings = {
  /**
   * @description Placeholder text that shows if no report or endpoint was detected.
   *             A report contains information on issues or events that were encountered by a web browser.
   *             An endpoint is a URL where the report is sent to.
   *             (https://developer.chrome.com/docs/capabilities/web-apis/reporting-api)
   */
  noReportOrEndpoint: 'No report or endpoint',
  /**
   * @description Placeholder text that shows if no report or endpoint was detected.
   *             A report contains information on issues or events that were encountered by a web browser.
   *             An endpoint is a URL where the report is sent to.
   *             (https://developer.chrome.com/docs/capabilities/web-apis/reporting-api)
   */
  reportingApiDescription: 'On this page you will be able to inspect `Reporting API` reports and endpoints.',
  /**
   * @description Placeholder text that shows if no report was selected for viewing
   *report body (https://developers.google.com/web/updates/2018/09/reportingapi#sending).
   */
  noReportSelected: 'No report selected',
  /**
   * @description Placeholder text instructing the user how to display a Reporting API
   *report body (https://developers.google.com/web/updates/2018/09/reportingapi#sending).
   */
  clickToDisplayBody: 'Click on any report to display its body',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/application/ReportingApiView.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const REPORTING_API_EXPLANATION_URL =
    'https://developer.chrome.com/docs/capabilities/web-apis/reporting-api' as Platform.DevToolsPath.UrlString;

interface ViewInput {
  hasReports: boolean;
  hasEndpoints: boolean;
  // TODO (crbug.com/407940329): port EndpointsGrid to a UI Widget and instantiate it in the view
  endpointsGrid: ApplicationComponents.EndpointsGrid.EndpointsGrid;
  // TODO (crbug.com/407940381): port ReportsGrid to a UI Widget and instantiate it in the view
  reportsGrid: ApplicationComponents.ReportsGrid.ReportsGrid;
  focusedReport?: Protocol.Network.ReportingApiReport;
}

type View = (input: ViewInput, output: object, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  if (input.hasReports || input.hasEndpoints) {
    // clang-format off
    render(html`
      <devtools-split-view sidebar-position="second" sidebar-initial-size="150" jslog=${
          VisualLogging.pane('reporting-api')}>
        ${input.hasReports ? html`
          <devtools-split-view slot="main" sidebar-position="second" sidebar-initial-size="150">
            <div slot="main">
              ${input.reportsGrid}
            </div>
            <div slot="sidebar" class="vbox" jslog=${VisualLogging.pane('preview').track({resize: true})}>
              ${input.focusedReport ? html`
                <devtools-widget .widgetConfig=${widgetConfig(
                  element => SourceFrame.JSONView.JSONView.createViewSync(input.focusedReport?.body || '', element)
                )}></devtools-widget>
              ` : html`
                <devtools-widget .widgetConfig=${widgetConfig(UI.EmptyWidget.EmptyWidget, {
                  header: i18nString(UIStrings.noReportSelected),
                  text: i18nString(UIStrings.clickToDisplayBody),
                })}></devtools-widget>
              `}
            </div>
          </devtools-split-view>
        ` : html`
          <div slot="main">
            ${input.reportsGrid}
          </div>
        `}
        <div slot="sidebar">
          ${input.endpointsGrid}
        </div>
      </devtools-split-view>
    `, target);
    // clang-format on
  } else {
    // clang-format off
    render(html`
      <devtools-widget .widgetConfig=${widgetConfig(UI.EmptyWidget.EmptyWidget, {
        header: i18nString(UIStrings.noReportOrEndpoint),
        text: i18nString(UIStrings.reportingApiDescription),
        link: REPORTING_API_EXPLANATION_URL,
      })} jslog=${VisualLogging.pane('reporting-api-empty')}></devtools-widget>
    `, target);
    // clang-format on
  }
};

export class ReportingApiView extends UI.Widget.VBox implements
    SDK.TargetManager.SDKModelObserver<SDK.NetworkManager.NetworkManager> {
  readonly #endpointsGrid: ApplicationComponents.EndpointsGrid.EndpointsGrid;
  #endpoints: Map<string, Protocol.Network.ReportingApiEndpoint[]>;
  #view: View;
  #networkManager?: SDK.NetworkManager.NetworkManager;
  #reportsGrid = new ApplicationComponents.ReportsGrid.ReportsGrid();
  #reports: Protocol.Network.ReportingApiReport[] = [];
  #focusedReport?: Protocol.Network.ReportingApiReport;

  constructor(endpointsGrid: ApplicationComponents.EndpointsGrid.EndpointsGrid, view = DEFAULT_VIEW) {
    super();
    this.#view = view;
    this.#endpointsGrid = endpointsGrid;
    this.#endpoints = new Map();
    this.#reportsGrid.addEventListener('select', this.#onFocus.bind(this));
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.NetworkManager.NetworkManager, this);
    this.requestUpdate();
  }

  modelAdded(networkManager: SDK.NetworkManager.NetworkManager): void {
    if (networkManager.target() !== SDK.TargetManager.TargetManager.instance().primaryPageTarget()) {
      return;
    }
    this.#networkManager = networkManager;
    this.#networkManager.addEventListener(
        SDK.NetworkManager.Events.ReportingApiEndpointsChangedForOrigin, this.#onEndpointsChangedForOrigin, this);
    this.#networkManager.addEventListener(SDK.NetworkManager.Events.ReportingApiReportAdded, this.#onReportAdded, this);
    this.#networkManager.addEventListener(
        SDK.NetworkManager.Events.ReportingApiReportUpdated, this.#onReportUpdated, this);
    void this.#networkManager.enableReportingApi();
    this.requestUpdate();
  }

  modelRemoved(networkManager: SDK.NetworkManager.NetworkManager): void {
    if (!this.#networkManager || this.#networkManager !== networkManager) {
      return;
    }
    this.#networkManager.removeEventListener(
        SDK.NetworkManager.Events.ReportingApiEndpointsChangedForOrigin, this.#onEndpointsChangedForOrigin, this);
    this.#networkManager.removeEventListener(
        SDK.NetworkManager.Events.ReportingApiReportAdded, this.#onReportAdded, this);
    this.#networkManager.removeEventListener(
        SDK.NetworkManager.Events.ReportingApiReportUpdated, this.#onReportUpdated, this);
    this.#networkManager = undefined;
  }

  override performUpdate(): void {
    const viewInput = {
      hasReports: this.#reports.length > 0,
      hasEndpoints: this.#endpoints.size > 0,
      endpointsGrid: this.#endpointsGrid,
      reportsGrid: this.#reportsGrid,
      focusedReport: this.#focusedReport,
    };
    this.#view(viewInput, {}, this.element);
  }

  #onEndpointsChangedForOrigin({data}: {data: Protocol.Network.ReportingApiEndpointsChangedForOriginEvent}): void {
    this.#endpoints.set(data.origin, data.endpoints);
    this.#endpointsGrid.data = {endpoints: this.#endpoints};
    this.requestUpdate();
  }

  #onReportAdded({data: report}: {data: Protocol.Network.ReportingApiReport}): void {
    this.#reports.push(report);
    this.#reportsGrid.data = {reports: this.#reports};
    this.requestUpdate();
  }

  #onReportUpdated({data: report}: {data: Protocol.Network.ReportingApiReport}): void {
    const index = this.#reports.findIndex(oldReport => oldReport.id === report.id);
    this.#reports[index] = report;
    this.#reportsGrid.data = {reports: this.#reports};
    this.requestUpdate();
  }

  async #onFocus(event: Event): Promise<void> {
    const selectEvent = event as CustomEvent<string>;
    const report = this.#reports.find(report => report.id === selectEvent.detail);
    if (report) {
      this.#focusedReport = report;
      this.requestUpdate();
    }
  }
}
