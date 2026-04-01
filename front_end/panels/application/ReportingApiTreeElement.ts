// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import {createIcon} from '../../ui/kit/kit.js';

import {ApplicationPanelTreeElement} from './ApplicationPanelTreeElement.js';
import {CrashReportContextView} from './CrashReportContextView.js';
import {ReportingApiView} from './ReportingApiView.js';
import type {ResourcesPanel} from './ResourcesPanel.js';

const UIStrings = {
  /**
   * @description Label for an item in the Application Panel Sidebar of the Application panel
   */
  reportingApi: 'Reporting API',
  /**
   * @description Label for the Crash Report Context child item in the Reporting API section.
   */
  crashReportContext: 'Crash Report Context',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/application/ReportingApiTreeElement.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class ReportingApiTreeElement extends ApplicationPanelTreeElement {
  private view?: ReportingApiView;
  #childrenInitialized = false;

  constructor(storagePanel: ResourcesPanel) {
    super(storagePanel, i18nString(UIStrings.reportingApi), true, 'reporting-api');
    const icon = createIcon('document');
    this.setLeadingIcons([icon]);
  }

  override onattach(): void {
    super.onattach();
    if (!this.#childrenInitialized) {
      this.#childrenInitialized = true;
      this.appendChild(new CrashReportContextTreeElement(this.resourcesPanel));
    }
  }

  override get itemURL(): Platform.DevToolsPath.UrlString {
    return 'reportingApi://' as Platform.DevToolsPath.UrlString;
  }

  override onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    if (!this.view) {
      this.view = new ReportingApiView();
    }
    this.showView(this.view);
    Host.userMetrics.panelShown('reporting-api');
    return false;
  }
}

export class CrashReportContextTreeElement extends ApplicationPanelTreeElement {
  private view?: CrashReportContextView;

  constructor(storagePanel: ResourcesPanel) {
    super(storagePanel, i18nString(UIStrings.crashReportContext), false, 'crash-report-context');
    const icon = createIcon('table');
    this.setLeadingIcons([icon]);
  }

  override get itemURL(): Platform.DevToolsPath.UrlString {
    return 'reportingApi://crash-report-context' as Platform.DevToolsPath.UrlString;
  }

  override onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    if (!this.view) {
      this.view = new CrashReportContextView();
    }
    this.view.requestUpdate();
    this.showView(this.view);
    Host.userMetrics.panelShown('crash-report-context');
    return false;
  }
}
