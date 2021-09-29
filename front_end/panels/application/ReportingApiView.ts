// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as ApplicationComponents from './components/components.js';

const UIStrings = {
  /**
  *@description Placeholder text when there are no Reporting API reports.
  *(https://developers.google.com/web/updates/2018/09/reportingapi#sending)
  */
  noReportsToDisplay: 'No reports to display',
};

const str_ = i18n.i18n.registerUIStrings('panels/application/ReportingApiView.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class ReportingApiView extends UI.SplitWidget.SplitWidget {
  constructor() {
    super(/* isVertical: */ false, /* secondIsSidebar: */ true);
    const mainTarget = SDK.TargetManager.TargetManager.instance().mainTarget();
    const networkManager = mainTarget && mainTarget.model(SDK.NetworkManager.NetworkManager);
    if (networkManager) {
      const reportingApiReportsView = new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.noReportsToDisplay));
      const resizer = reportingApiReportsView.element.createChild('div');
      const reportingApiEndpointsView = new UI.Widget.VBox();
      reportingApiEndpointsView.contentElement.appendChild(new ApplicationComponents.EndpointsGrid.EndpointsGrid());
      this.setMainWidget(reportingApiReportsView);
      this.setSidebarWidget(reportingApiEndpointsView);
      this.installResizer(resizer);
      networkManager.enableReportingApi();
    }
  }
}
