// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import type * as ApplicationComponents from './components/components.js';
import {ReportingApiReportsView} from './ReportingApiReportsView.js';

export class ReportingApiView extends UI.SplitWidget.SplitWidget {
  private readonly endpointsGrid: ApplicationComponents.EndpointsGrid.EndpointsGrid;
  private endpoints: Map<string, Protocol.Network.ReportingApiEndpoint[]>;

  constructor(endpointsGrid: ApplicationComponents.EndpointsGrid.EndpointsGrid) {
    super(/* isVertical: */ false, /* secondIsSidebar: */ true);
    this.element.setAttribute('jslog', `${VisualLogging.pane('reporting-api')}`);
    this.endpointsGrid = endpointsGrid;
    this.endpoints = new Map();
    const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    const networkManager = mainTarget && mainTarget.model(SDK.NetworkManager.NetworkManager);
    if (networkManager) {
      networkManager.addEventListener(
          SDK.NetworkManager.Events.ReportingApiEndpointsChangedForOrigin,
          event => this.onEndpointsChangedForOrigin(event.data), this);

      const reportingApiReportsView = new ReportingApiReportsView(networkManager);
      const reportingApiEndpointsView = new UI.Widget.VBox();
      reportingApiEndpointsView.setMinimumSize(0, 40);
      reportingApiEndpointsView.contentElement.appendChild(this.endpointsGrid);
      this.setMainWidget(reportingApiReportsView);
      this.setSidebarWidget(reportingApiEndpointsView);
      void networkManager.enableReportingApi();
    }
  }

  private onEndpointsChangedForOrigin(data: Protocol.Network.ReportingApiEndpointsChangedForOriginEvent): void {
    this.endpoints.set(data.origin, data.endpoints);
    this.endpointsGrid.data = {endpoints: this.endpoints};
  }
}
