// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import { createIcon } from '../../ui/kit/kit.js';
import * as UI from '../../ui/legacy/legacy.js';
import { ApplicationPanelTreeElement } from './ApplicationPanelTreeElement.js';
import { CrashReportContextView } from './CrashReportContextView.js';
import { ReportingApiView } from './ReportingApiView.js';
const UIStrings = {
    /**
     * @description Label for an item in the sidebar of the Application panel.
     */
    reportingApi: 'Reporting API',
    /**
     * @description Label for the crash report context item in the sidebar of the Application panel.
     */
    crashReportContext: 'Crash report context',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/ReportingApiTreeElement.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ReportingApiTreeElement extends ApplicationPanelTreeElement {
    view;
    #childrenInitialized = false;
    constructor(storagePanel) {
        super(storagePanel, i18nString(UIStrings.reportingApi), true, 'reporting-api');
        const icon = createIcon('document');
        this.setLeadingIcons([icon]);
    }
    onattach() {
        super.onattach();
        if (!this.#childrenInitialized) {
            this.#childrenInitialized = true;
            this.appendChild(new CrashReportContextTreeElement(this.resourcesPanel));
        }
    }
    get itemURL() {
        return 'reportingApi://';
    }
    onselect(selectedByUser) {
        super.onselect(selectedByUser);
        if (!this.view) {
            this.view = new ReportingApiView();
        }
        this.showView(this.view);
        UI.UIUserMetrics.UIUserMetrics.instance().panelShown('reporting-api');
        return false;
    }
}
export class CrashReportContextTreeElement extends ApplicationPanelTreeElement {
    view;
    constructor(storagePanel) {
        super(storagePanel, i18nString(UIStrings.crashReportContext), false, 'crash-report-context');
        const icon = createIcon('table');
        this.setLeadingIcons([icon]);
    }
    get itemURL() {
        return 'reportingApi://crash-report-context';
    }
    onselect(selectedByUser) {
        super.onselect(selectedByUser);
        if (!this.view) {
            this.view = new CrashReportContextView();
        }
        this.view.requestUpdate();
        this.showView(this.view);
        UI.UIUserMetrics.UIUserMetrics.instance().panelShown('crash-report-context');
        return false;
    }
}
//# sourceMappingURL=ReportingApiTreeElement.js.map