// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import type * as DataGrid from '../../ui/components/data_grid/data_grid.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import * as ApplicationComponents from './components/components.js';
import reportingApiReportsViewStyles from './reportingApiReportsView.css.js';

const UIStrings = {
  /**
   *@description Placeholder text instructing the user how to display a Reporting API
   *report body (https://developers.google.com/web/updates/2018/09/reportingapi#sending).
   */
  clickToDisplayBody: 'Click on any report to display its body',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/ReportingApiReportsView.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class ReportingApiReportsView extends UI.SplitWidget.SplitWidget {
  private readonly reportsGrid = new ApplicationComponents.ReportsGrid.ReportsGrid();
  private reports: Protocol.Network.ReportingApiReport[] = [];

  constructor(networkManager: SDK.NetworkManager.NetworkManager) {
    super(/* isVertical: */ false, /* secondIsSidebar: */ true);
    const topPanel = new UI.Widget.VBox();
    const bottomPanel = new UI.Widget.VBox();
    topPanel.setMinimumSize(0, 80);
    this.setMainWidget(topPanel);
    bottomPanel.setMinimumSize(0, 40);
    bottomPanel.element.setAttribute('jslog', `${VisualLogging.pane('preview').track({resize: true})}`);
    this.setSidebarWidget(bottomPanel);

    topPanel.contentElement.appendChild(this.reportsGrid);
    this.reportsGrid.addEventListener('cellfocused', this.onFocus.bind(this));

    bottomPanel.contentElement.classList.add('placeholder');
    const centered = bottomPanel.contentElement.createChild('div');
    centered.textContent = i18nString(UIStrings.clickToDisplayBody);

    networkManager.addEventListener(
        SDK.NetworkManager.Events.ReportingApiReportAdded, event => this.onReportAdded(event.data), this);
    networkManager.addEventListener(
        SDK.NetworkManager.Events.ReportingApiReportUpdated, event => this.onReportUpdated(event.data), this);
  }

  override wasShown(): void {
    super.wasShown();
    const sbw = this.sidebarWidget();
    if (sbw) {
      sbw.registerCSSFiles([reportingApiReportsViewStyles]);
    }
  }

  private onReportAdded(report: Protocol.Network.ReportingApiReport): void {
    this.reports.push(report);
    this.reportsGrid.data = {reports: this.reports};
  }

  private onReportUpdated(report: Protocol.Network.ReportingApiReport): void {
    const index = this.reports.findIndex(oldReport => oldReport.id === report.id);
    this.reports[index] = report;
    this.reportsGrid.data = {reports: this.reports};
  }

  private async onFocus(event: Event): Promise<void> {
    const focusedEvent = event as DataGrid.DataGridEvents.BodyCellFocusedEvent;
    const cell = focusedEvent.data.row.cells.find(cell => cell.columnId === 'id');
    const report = cell && this.reports.find(report => report.id === cell.value);
    if (report) {
      const jsonView = await SourceFrame.JSONView.JSONView.createView(JSON.stringify(report.body));
      jsonView?.setMinimumSize(0, 40);
      if (jsonView) {
        this.setSidebarWidget(jsonView);
      }
    }
  }

  getReports(): Protocol.Network.ReportingApiReport[] {
    return this.reports;
  }

  getReportsGrid(): ApplicationComponents.ReportsGrid.ReportsGrid {
    return this.reportsGrid;
  }
}
