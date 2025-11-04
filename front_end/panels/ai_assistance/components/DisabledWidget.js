// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Root from '../../../core/root/root.js';
import * as uiI18n from '../../../ui/i18n/i18n.js';
import * as UI from '../../../ui/legacy/legacy.js';
import { html, render } from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import disabledWidgetStyles from './disabledWidget.css.js';
const UIStrings = {
    /**
     * @description The error message when the user is not logged in into Chrome.
     */
    notLoggedIn: 'This feature is only available when you are signed into Chrome with your Google account',
    /**
     * @description Message shown when the user is offline.
     */
    offline: 'Check your internet connection and try again',
    /**
     * @description Text for a link to Chrome DevTools Settings.
     */
    settingsLink: 'AI assistance in Settings',
    /**
     * @description Text for asking the user to turn the AI assistance feature in settings first before they are able to use it.
     * @example {AI assistance in Settings} PH1
     */
    turnOnForStyles: 'Turn on {PH1} to get help with understanding CSS styles',
    /**
     * @description Text for asking the user to turn the AI assistance feature in settings first before they are able to use it.
     * @example {AI assistance in Settings} PH1
     */
    turnOnForStylesAndRequests: 'Turn on {PH1} to get help with styles and network requests',
    /**
     * @description Text for asking the user to turn the AI assistance feature in settings first before they are able to use it.
     * @example {AI assistance in Settings} PH1
     */
    turnOnForStylesRequestsAndFiles: 'Turn on {PH1} to get help with styles, network requests, and files',
    /**
     * @description Text for asking the user to turn the AI assistance feature in settings first before they are able to use it.
     * @example {AI assistance in Settings} PH1
     */
    turnOnForStylesRequestsPerformanceAndFiles: 'Turn on {PH1} to get help with styles, network requests, performance, and files',
    /**
     * @description Text informing the user that AI assistance is not available in Incognito mode or Guest mode.
     */
    notAvailableInIncognitoMode: 'AI assistance is not available in Incognito mode or Guest mode',
};
const str_ = i18n.i18n.registerUIStrings('panels/ai_assistance/components/DisabledWidget.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
function renderAidaUnavailableContents(aidaAvailability) {
    switch (aidaAvailability) {
        case "no-account-email" /* Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL */:
        case "sync-is-paused" /* Host.AidaClient.AidaAccessPreconditions.SYNC_IS_PAUSED */: {
            return html `${i18nString(UIStrings.notLoggedIn)}`;
        }
        case "no-internet" /* Host.AidaClient.AidaAccessPreconditions.NO_INTERNET */: {
            return html `${i18nString(UIStrings.offline)}`;
        }
    }
}
function renderConsentViewContents(hostConfig) {
    if (hostConfig.isOffTheRecord) {
        return html `${i18nString(UIStrings.notAvailableInIncognitoMode)}`;
    }
    // eslint-disable-next-line @devtools/no-imperative-dom-api
    const settingsLink = document.createElement('span');
    settingsLink.textContent = i18nString(UIStrings.settingsLink);
    settingsLink.classList.add('link');
    UI.ARIAUtils.markAsLink(settingsLink);
    settingsLink.addEventListener('click', () => {
        void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
    });
    settingsLink.setAttribute('jslog', `${VisualLogging.action('open-ai-settings').track({ click: true })}`);
    let consentViewContents;
    if (hostConfig.devToolsAiAssistancePerformanceAgent?.enabled) {
        consentViewContents = uiI18n.getFormatLocalizedString(str_, UIStrings.turnOnForStylesRequestsPerformanceAndFiles, { PH1: settingsLink });
    }
    else if (hostConfig.devToolsAiAssistanceFileAgent?.enabled) {
        consentViewContents =
            uiI18n.getFormatLocalizedString(str_, UIStrings.turnOnForStylesRequestsAndFiles, { PH1: settingsLink });
    }
    else if (hostConfig.devToolsAiAssistanceNetworkAgent?.enabled) {
        consentViewContents =
            uiI18n.getFormatLocalizedString(str_, UIStrings.turnOnForStylesAndRequests, { PH1: settingsLink });
    }
    else {
        consentViewContents = uiI18n.getFormatLocalizedString(str_, UIStrings.turnOnForStyles, { PH1: settingsLink });
    }
    return html `${consentViewContents}`;
}
export const DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
      <style>
        ${disabledWidgetStyles}
      </style>
      <div class="disabled-view">
        <div class="disabled-view-icon-container">
          <devtools-icon name="smart-assistant"></devtools-icon>
        </div>
        <div>
          ${input.aidaAvailability ===
        "available" /* Host.AidaClient.AidaAccessPreconditions.AVAILABLE */
        ? renderConsentViewContents(input.hostConfig)
        : renderAidaUnavailableContents(input.aidaAvailability)}
        </div>
      </div>
    `, target);
    // clang-format on
};
export class DisabledWidget extends UI.Widget.Widget {
    aidaAvailability = "no-account-email" /* Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL */;
    #view;
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
    }
    wasShown() {
        super.wasShown();
        void this.requestUpdate();
    }
    performUpdate() {
        const hostConfig = Root.Runtime.hostConfig;
        this.#view({
            aidaAvailability: this.aidaAvailability,
            hostConfig,
        }, {}, this.contentElement);
    }
}
//# sourceMappingURL=DisabledWidget.js.map