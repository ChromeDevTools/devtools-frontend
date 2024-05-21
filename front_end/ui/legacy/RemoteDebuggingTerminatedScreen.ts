// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';

import {Dialog} from './Dialog.js';
import {SizeBehavior} from './GlassPane.js';
import remoteDebuggingTerminatedScreenStyles from './remoteDebuggingTerminatedScreen.css.legacy.js';
import {createTextButton} from './UIUtils.js';
import {VBox} from './Widget.js';

const UIStrings = {
  /**
   * @description Text in a dialog box in DevTools stating why remote debugging has been terminated.
   * "Remote debugging" here means that DevTools on a PC is inspecting a website running on an actual mobile device
   * (see https://developer.chrome.com/docs/devtools/remote-debugging/).
   */
  debuggingConnectionWasClosed: 'Debugging connection was closed. Reason: ',
  /**
   * @description Text in a dialog box showing how to reconnect to DevTools when remote debugging has been terminated.
   * "Remote debugging" here means that DevTools on a PC is inspecting a website running on an actual mobile device
   * (see https://developer.chrome.com/docs/devtools/remote-debugging/).
   * "Reconnect when ready", refers to the state of the mobile device. The developer first has to put the mobile
   * device back in a state where it can be inspected, before DevTools can reconnect to it.
   */
  reconnectWhenReadyByReopening: 'Reconnect when ready by reopening DevTools.',
  /**
   * @description Text on a button to reconnect Devtools when remote debugging terminated.
   * "Remote debugging" here means that DevTools on a PC is inspecting a website running on an actual mobile device
   * (see https://developer.chrome.com/docs/devtools/remote-debugging/).
   */
  reconnectDevtools: 'Reconnect `DevTools`',
  /**
   * @description Label of the FB-only 'send feedback' button.
   */
  sendFeedback: '[FB-only] Send feedback',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/RemoteDebuggingTerminatedScreen.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class RemoteDebuggingTerminatedScreen extends VBox {
  constructor(reason: string) {
    super(true);
    this.registerRequiredCSS(remoteDebuggingTerminatedScreenStyles);
    const message = this.contentElement.createChild('div', 'message');
    const span = message.createChild('span');
    span.append(i18nString(UIStrings.debuggingConnectionWasClosed));
    const reasonElement = span.createChild('span', 'reason');
    reasonElement.textContent = reason;
    this.contentElement.createChild('div', 'message').textContent = i18nString(UIStrings.reconnectWhenReadyByReopening);
    const button = createTextButton(
        i18nString(UIStrings.reconnectDevtools), () => window.location.reload(), {jslogContext: 'reconnect'});
    const buttonRow = this.contentElement.createChild('div', 'button');
    buttonRow.appendChild(button);

    if (globalThis.FB_ONLY__reactNativeFeedbackLink) {
      const feedbackLink = globalThis.FB_ONLY__reactNativeFeedbackLink as Platform.DevToolsPath.UrlString;
      const feedbackButton = createTextButton(i18nString(UIStrings.sendFeedback), () => {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(feedbackLink);
      }, {className: 'primary-button', jslogContext: 'sendFeedback'});
      buttonRow.appendChild(feedbackButton);
    }
  }

  static show(reason: string): void {
    const dialog = new Dialog('remote-debnugging-terminated');
    dialog.setSizeBehavior(SizeBehavior.MeasureContent);
    dialog.addCloseButton();
    dialog.setDimmed(true);
    new RemoteDebuggingTerminatedScreen(reason).show(dialog.contentElement);
    dialog.show();
  }
}
