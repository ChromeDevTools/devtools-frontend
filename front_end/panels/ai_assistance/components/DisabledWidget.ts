
// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/kit/kit.js';

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Root from '../../../core/root/root.js';
import * as UI from '../../../ui/legacy/legacy.js';
import {html, i18nTemplate, type LitTemplate, render} from '../../../ui/lit/lit.js';

import disabledWidgetStyles from './disabledWidget.css.js';

const UIStrings = {
  /**
   * @description The error message when the user is not signed in to Chrome.
   */
  notLoggedIn: 'This feature is only available when you are signed in to Chrome with your Google account',
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
  turnOnForStylesRequestsPerformanceAndFiles:
      'Turn on {PH1} to get help with styles, network requests, performance, and files',
  /**
   * @description Text informing the user that AI assistance is not available in Incognito mode or Guest mode.
   */
  notAvailableInIncognitoMode: 'AI assistance isn’t available in Incognito mode or Guest mode',

} as const;

const str_ = i18n.i18n.registerUIStrings('panels/ai_assistance/components/DisabledWidget.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface ViewProps {
  aidaAvailability: Host.AidaClient.AidaAccessPreconditions;
  hostConfig: Root.Runtime.HostConfig;
}

function renderAidaUnavailableContents(
    aidaAvailability:
        Exclude<Host.AidaClient.AidaAccessPreconditions, Host.AidaClient.AidaAccessPreconditions.AVAILABLE>):
    LitTemplate {
  switch (aidaAvailability) {
    case Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL:
    case Host.AidaClient.AidaAccessPreconditions.SYNC_IS_PAUSED: {
      return html`${i18nString(UIStrings.notLoggedIn)}`;
    }
    case Host.AidaClient.AidaAccessPreconditions.NO_INTERNET: {
      return html`${i18nString(UIStrings.offline)}`;
    }
  }
}

function renderConsentViewContents(
    hostConfig: Root.Runtime.HostConfig,
    ): LitTemplate {
  if (hostConfig.isOffTheRecord) {
    return html`${i18nString(UIStrings.notAvailableInIncognitoMode)}`;
  }

  // clang-format off
  const settingsLink = html`<devtools-link
      class="link"
      jslogcontext="open-ai-settings"
      @click=${() => {
        void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
      }}
    >${i18nString(UIStrings.settingsLink)}</devtools-link>`;
  // clang-format on

  let stringId: string;
  if (hostConfig.devToolsAiAssistancePerformanceAgent?.enabled) {
    stringId = UIStrings.turnOnForStylesRequestsPerformanceAndFiles;
  } else if (hostConfig.devToolsAiAssistanceFileAgent?.enabled) {
    stringId = UIStrings.turnOnForStylesRequestsAndFiles;
  } else if (hostConfig.devToolsAiAssistanceNetworkAgent?.enabled) {
    stringId = UIStrings.turnOnForStylesAndRequests;
  } else {
    stringId = UIStrings.turnOnForStyles;
  }

  return i18nTemplate(str_, stringId, {PH1: settingsLink});
}

export const DEFAULT_VIEW = (
    input: ViewProps,
    _output: undefined,
    target: HTMLElement,
    ): void => {
  // clang-format off
  render(
    html`
      <style>
        ${disabledWidgetStyles}
      </style>
      <div class="disabled-view">
        <div class="disabled-view-icon-container">
          <devtools-icon name="smart-assistant"></devtools-icon>
        </div>
        <div>
          ${input.aidaAvailability ===
          Host.AidaClient.AidaAccessPreconditions.AVAILABLE
            ? renderConsentViewContents(input.hostConfig)
            : renderAidaUnavailableContents(input.aidaAvailability)}
        </div>
      </div>
    `,
    target,
  );
  // clang-format on
};

export type View = typeof DEFAULT_VIEW;

export class DisabledWidget extends UI.Widget.Widget {
  aidaAvailability: Host.AidaClient.AidaAccessPreconditions = Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL;

  #view: View;
  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  override wasShown(): void {
    super.wasShown();
    void this.requestUpdate();
  }

  override performUpdate(): Promise<void>|void {
    const hostConfig = Root.Runtime.hostConfig;

    this.#view(
        {
          aidaAvailability: this.aidaAvailability,
          hostConfig,
        },
        undefined,
        this.contentElement,
    );
  }
}
