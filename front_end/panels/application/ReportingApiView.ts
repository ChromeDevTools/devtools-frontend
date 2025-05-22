// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import type * as ApplicationComponents from './components/components.js';
import {ReportingApiReportsView} from './ReportingApiReportsView.js';

const UIStrings = {
  /**
   *@description Placeholder text that shows if no report or endpoint was detected.
   *             A report contains information on issues or events that were encountered by a web browser.
   *             An endpoint is a URL where the report is sent to.
   *             (https://developer.chrome.com/docs/capabilities/web-apis/reporting-api)
   */
  noReportOrEndpoint: 'No report or endpoint',
  /**
   *@description Placeholder text that shows if no report or endpoint was detected.
   *             A report contains information on issues or events that were encountered by a web browser.
   *             An endpoint is a URL where the report is sent to.
   *             (https://developer.chrome.com/docs/capabilities/web-apis/reporting-api)
   */
  reportingApiDescription: 'On this page you will be able to inspect `Reporting API` reports and endpoints.',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/application/ReportingApiView.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const REPORTING_API_EXPLANATION_URL =
    'https://developer.chrome.com/docs/capabilities/web-apis/reporting-api' as Platform.DevToolsPath.UrlString;

export class ReportingApiView extends UI.SplitWidget.SplitWidget {
  private readonly endpointsGrid: ApplicationComponents.EndpointsGrid.EndpointsGrid;
  private endpoints: Map<string, Protocol.Network.ReportingApiEndpoint[]>;
  #emptyWidget?: UI.EmptyWidget.EmptyWidget;
  #reportingApiReports?: ReportingApiReportsView;

  constructor(endpointsGrid: ApplicationComponents.EndpointsGrid.EndpointsGrid) {
    super(/* isVertical: */ false, /* secondIsSidebar: */ true);
    this.element.setAttribute('jslog', `${VisualLogging.pane('reporting-api')}`);
    this.endpointsGrid = endpointsGrid;
    this.endpoints = new Map();
    const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    const networkManager = mainTarget?.model(SDK.NetworkManager.NetworkManager);
    this.#emptyWidget = new UI.EmptyWidget.EmptyWidget(
        i18nString(UIStrings.noReportOrEndpoint), i18nString(UIStrings.reportingApiDescription));
    this.#emptyWidget.link = REPORTING_API_EXPLANATION_URL;
    this.setMainWidget(this.#emptyWidget);
    if (networkManager) {
      networkManager.addEventListener(
          SDK.NetworkManager.Events.ReportingApiEndpointsChangedForOrigin,
          event => this.onEndpointsChangedForOrigin(event.data), this);

      networkManager.addEventListener(
          SDK.NetworkManager.Events.ReportingApiReportAdded, this.#showReportsAndEndpoints, this);

      this.#reportingApiReports = new ReportingApiReportsView(networkManager);
      const reportingApiEndpointsView = new UI.Widget.VBox();
      reportingApiEndpointsView.setMinimumSize(0, 40);
      reportingApiEndpointsView.contentElement.appendChild(this.endpointsGrid);

      this.setSidebarWidget(reportingApiEndpointsView);
      void networkManager.enableReportingApi();
      this.hideSidebar();
    }
  }

  #showReportsAndEndpoints(): void {
    // Either we don't have reports and endpoints to show (first case), or we have already
    // replaced the empty widget with a different main view (second case).
    if (this.#reportingApiReports === undefined || this.mainWidget() !== this.#emptyWidget) {
      return;
    }

    this.#emptyWidget?.detach();
    this.#emptyWidget = undefined;
    this.setMainWidget(this.#reportingApiReports);
    this.showBoth();
  }

  private onEndpointsChangedForOrigin(data: Protocol.Network.ReportingApiEndpointsChangedForOriginEvent): void {
    this.#showReportsAndEndpoints();
    this.endpoints.set(data.origin, data.endpoints);
    this.endpointsGrid.data = {endpoints: this.endpoints};
  }
}
