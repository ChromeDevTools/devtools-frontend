// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ApplicationComponents from './components/components.js';

import {ReportingApiReportsView} from './ReportingApiReportsView.js';

export class ReportingApiView extends UI.SplitWidget.SplitWidget {
  constructor() {
    super(/* isVertical: */ false, /* secondIsSidebar: */ true);
    const mainTarget = SDK.TargetManager.TargetManager.instance().mainTarget();
    const networkManager = mainTarget && mainTarget.model(SDK.NetworkManager.NetworkManager);
    if (networkManager) {
      const reportingApiReportsView = new ReportingApiReportsView(networkManager);
      const reportingApiEndpointsView = new UI.Widget.VBox();
      reportingApiEndpointsView.setMinimumSize(0, 40);
      reportingApiEndpointsView.contentElement.appendChild(new ApplicationComponents.EndpointsGrid.EndpointsGrid());
      this.setMainWidget(reportingApiReportsView);
      this.setSidebarWidget(reportingApiEndpointsView);
      networkManager.enableReportingApi();
    }
  }
}
