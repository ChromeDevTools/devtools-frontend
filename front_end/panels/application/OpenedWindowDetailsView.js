// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import { createIcon } from '../../ui/kit/kit.js';
import * as UI from '../../ui/legacy/legacy.js';
import openedWindowDetailsViewStyles from './openedWindowDetailsView.css.js';
const UIStrings = {
    /**
     * @description Text indicating that the opened window has access to its opener.
     */
    yes: 'Yes',
    /**
     * @description Text indicating that the opened window does not have access to its opener.
     */
    no: 'No',
    /**
     * @description Tooltip for the button to reveal the opener frame DOM node in the Elements panel.
     */
    clickToOpenInElementsPanel: 'Click to open in Elements panel',
    /**
     * @description Section header for document details in the opened window details view and worker details view.
     */
    document: 'Document',
    /**
     * @description Field label for the URL in the opened window details view and worker details view.
     */
    url: 'URL',
    /**
     * @description Section header for security information in the opened window details view.
     */
    security: 'Security',
    /**
     * @description Field label for the link to the opener frame in the opened window details view.
     */
    openerFrame: 'Opener frame',
    /**
     * @description Field label indicating whether the opened window has access to its opener in the opened window details view.
     */
    accessToOpener: 'Access to opener',
    /**
     * @description Tooltip explaining whether the opened window has access to its opener in the opened window details view.
     */
    showsWhetherTheOpenedWindowIs: 'Shows whether the opened window is able to access its opener and vice versa',
    /**
     * @description Fallback title for an opened window without a title in the opened window details view.
     */
    windowWithoutTitle: 'Window without title',
    /**
     * @description Suffix for the title of an opened window that has been closed in the opened window details view.
     */
    closed: 'closed',
    /**
     * @description Fallback title for a worker in the worker details view.
     */
    worker: 'worker',
    /**
     * @description Field label for the worker type in the worker details view.
     */
    type: 'Type',
    /**
     * @description Section header for security and isolation in the worker details view.
     */
    securityIsolation: 'Security & isolation',
    /**
     * @description Field label for the Cross-Origin Embedder Policy in the worker details view.
     */
    crossoriginEmbedderPolicy: 'Cross-Origin Embedder Policy',
    /**
     * @description Value for dedicated Web Worker type in the worker details view.
     */
    webWorker: 'Web Worker',
    /**
     * @description Value for an unknown worker type in the worker details view.
     */
    unknown: 'Unknown',
    /**
     * @description Prefix for the reporting endpoint in the security & isolation section of the worker details view.
     */
    reportingTo: 'reporting to',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/OpenedWindowDetailsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const booleanToYesNo = (b) => b ? i18nString(UIStrings.yes) : i18nString(UIStrings.no);
function linkifyIcon(iconType, title, eventHandler) {
    const icon = createIcon(iconType, 'icon-link devtools-link');
    const button = document.createElement('button');
    UI.Tooltip.Tooltip.install(button, title);
    button.classList.add('devtools-link', 'link-style', 'text-button');
    button.appendChild(icon);
    button.addEventListener('click', event => {
        event.consume(true);
        void eventHandler();
    });
    return button;
}
async function maybeCreateLinkToElementsPanel(opener) {
    let openerFrame = null;
    if (opener instanceof SDK.ResourceTreeModel.ResourceTreeFrame) {
        openerFrame = opener;
    }
    else if (opener) {
        openerFrame = SDK.FrameManager.FrameManager.instance().getFrame(opener);
    }
    if (!openerFrame) {
        return null;
    }
    const linkTargetDOMNode = await openerFrame.getOwnerDOMNodeOrDocument();
    if (!linkTargetDOMNode) {
        return null;
    }
    const linkElement = linkifyIcon('code-circle', i18nString(UIStrings.clickToOpenInElementsPanel), () => Common.Revealer.reveal(linkTargetDOMNode));
    const label = document.createElement('span');
    label.textContent = `<${linkTargetDOMNode.nodeName().toLocaleLowerCase()}>`;
    linkElement.insertBefore(label, linkElement.firstChild);
    linkElement.addEventListener('mouseenter', () => {
        if (openerFrame) {
            void openerFrame.highlight();
        }
    });
    linkElement.addEventListener('mouseleave', () => {
        SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight(SDK.TargetManager.TargetManager.instance());
    });
    return linkElement;
}
export class OpenedWindowDetailsView extends UI.Widget.VBox {
    targetInfo;
    isWindowClosed;
    reportView;
    documentSection;
    #urlFieldValue;
    securitySection;
    openerElementField;
    hasDOMAccessValue;
    constructor(targetInfo, isWindowClosed) {
        super();
        this.registerRequiredCSS(openedWindowDetailsViewStyles);
        this.targetInfo = targetInfo;
        this.isWindowClosed = isWindowClosed;
        this.contentElement.classList.add('frame-details-container');
        // TODO(crbug.com/1156978): Replace UI.ReportView.ReportView with ReportView.ts web component.
        this.reportView = new UI.ReportView.ReportView(this.buildTitle());
        this.reportView.show(this.contentElement);
        this.reportView.registerRequiredCSS(openedWindowDetailsViewStyles);
        this.reportView.element.classList.add('frame-details-report-container');
        this.documentSection = this.reportView.appendSection(i18nString(UIStrings.document));
        this.#urlFieldValue =
            this.documentSection.appendField(i18nString(UIStrings.url)).createChild('div', 'text-ellipsis');
        this.securitySection = this.reportView.appendSection(i18nString(UIStrings.security));
        this.openerElementField = this.securitySection.appendField(i18nString(UIStrings.openerFrame));
        this.securitySection.setFieldVisible(i18nString(UIStrings.openerFrame), false);
        this.hasDOMAccessValue = this.securitySection.appendField(i18nString(UIStrings.accessToOpener));
        UI.Tooltip.Tooltip.install(this.hasDOMAccessValue, i18nString(UIStrings.showsWhetherTheOpenedWindowIs));
        this.requestUpdate();
    }
    async performUpdate() {
        this.reportView.setTitle(this.buildTitle());
        this.#urlFieldValue.textContent = this.targetInfo.url;
        this.#urlFieldValue.title = this.targetInfo.url;
        this.hasDOMAccessValue.textContent = booleanToYesNo(this.targetInfo.canAccessOpener);
        void this.maybeDisplayOpenerFrame();
    }
    async maybeDisplayOpenerFrame() {
        this.openerElementField.removeChildren();
        const linkElement = await maybeCreateLinkToElementsPanel(this.targetInfo.openerFrameId);
        if (linkElement) {
            this.openerElementField.append(linkElement);
            this.securitySection.setFieldVisible(i18nString(UIStrings.openerFrame), true);
            return;
        }
        this.securitySection.setFieldVisible(i18nString(UIStrings.openerFrame), false);
    }
    buildTitle() {
        let title = this.targetInfo.title || i18nString(UIStrings.windowWithoutTitle);
        if (this.isWindowClosed) {
            title += ` (${i18nString(UIStrings.closed)})`;
        }
        return title;
    }
    setIsWindowClosed(isWindowClosed) {
        this.isWindowClosed = isWindowClosed;
    }
    setTargetInfo(targetInfo) {
        this.targetInfo = targetInfo;
    }
}
export class WorkerDetailsView extends UI.Widget.VBox {
    targetInfo;
    reportView;
    documentSection;
    isolationSection;
    coepPolicy;
    constructor(targetInfo) {
        super();
        this.registerRequiredCSS(openedWindowDetailsViewStyles);
        this.targetInfo = targetInfo;
        this.contentElement.classList.add('frame-details-container');
        // TODO(crbug.com/1156978): Replace UI.ReportView.ReportView with ReportView.ts web component.
        this.reportView =
            new UI.ReportView.ReportView(this.targetInfo.title || this.targetInfo.url || i18nString(UIStrings.worker));
        this.reportView.show(this.contentElement);
        this.reportView.registerRequiredCSS(openedWindowDetailsViewStyles);
        this.reportView.element.classList.add('frame-details-report-container');
        this.documentSection = this.reportView.appendSection(i18nString(UIStrings.document));
        const URLFieldValue = this.documentSection.appendField(i18nString(UIStrings.url)).createChild('div', 'text-ellipsis');
        URLFieldValue.textContent = this.targetInfo.url;
        URLFieldValue.title = this.targetInfo.url;
        const workerType = this.documentSection.appendField(i18nString(UIStrings.type));
        workerType.textContent = this.workerTypeToString(this.targetInfo.type);
        this.isolationSection = this.reportView.appendSection(i18nString(UIStrings.securityIsolation));
        this.coepPolicy = this.isolationSection.appendField(i18nString(UIStrings.crossoriginEmbedderPolicy));
        this.requestUpdate();
    }
    workerTypeToString(type) {
        if (type === 'worker') {
            return i18nString(UIStrings.webWorker);
        }
        if (type === 'service_worker') {
            return i18n.i18n.lockedString('Service Worker');
        }
        return i18nString(UIStrings.unknown);
    }
    async updateCoopCoepStatus() {
        const target = SDK.TargetManager.TargetManager.instance().targetById(this.targetInfo.targetId);
        if (!target) {
            return;
        }
        const model = target.model(SDK.NetworkManager.NetworkManager);
        const info = model && await model.getSecurityIsolationStatus(null);
        if (!info) {
            return;
        }
        const coepIsEnabled = (value) => value !== "None" /* Protocol.Network.CrossOriginEmbedderPolicyValue.None */;
        this.fillCrossOriginPolicy(this.coepPolicy, coepIsEnabled, info.coep);
    }
    fillCrossOriginPolicy(field, isEnabled, info) {
        if (!info) {
            field.textContent = '';
            return;
        }
        const enabled = isEnabled(info.value);
        field.textContent = enabled ? info.value : info.reportOnlyValue;
        if (!enabled && isEnabled(info.reportOnlyValue)) {
            const reportOnly = document.createElement('span');
            reportOnly.classList.add('inline-comment');
            reportOnly.textContent = 'report-only';
            field.appendChild(reportOnly);
        }
        const endpoint = enabled ? info.reportingEndpoint : info.reportOnlyReportingEndpoint;
        if (endpoint) {
            const reportingEndpointPrefix = field.createChild('span', 'inline-name');
            reportingEndpointPrefix.textContent = i18nString(UIStrings.reportingTo);
            const reportingEndpointName = field.createChild('span');
            reportingEndpointName.textContent = endpoint;
        }
    }
    async performUpdate() {
        await this.updateCoopCoepStatus();
    }
}
//# sourceMappingURL=OpenedWindowDetailsView.js.map