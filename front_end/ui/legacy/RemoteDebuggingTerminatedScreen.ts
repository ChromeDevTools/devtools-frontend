// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import {html, render} from '../../ui/lit/lit.js';

import {Dialog} from './Dialog.js';
import {SizeBehavior} from './GlassPane.js';
import remoteDebuggingTerminatedScreenStyles from './remoteDebuggingTerminatedScreen.css.js';
import {VBox} from './Widget.js';

const UIStrings = {
  /**
   * @description Text in a dialog box in DevTools stating that remote debugging has been terminated.
   * "Remote debugging" here means that DevTools on a PC is inspecting a website running on an actual mobile device
   * (see https://developer.chrome.com/docs/devtools/remote-debugging/).
   */
  debuggingConnectionWasClosed: 'Debugging connection was closed',
  /**
   * @description Text in a dialog box in DevTools stating the reason for remote debugging being terminated.
   * @example {target_closed} PH1
   */
  connectionClosedReason: 'Reason: {PH1}.',
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
} as const;
const str_ = i18n.i18n.registerUIStrings('ui/legacy/RemoteDebuggingTerminatedScreen.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface ViewInput {
  reason: string;
  onReconnect: () => void;
}

type View = (input: ViewInput, output: object, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  render(html`
    <style>${remoteDebuggingTerminatedScreenStyles}</style>
    <div class="header">${i18nString(UIStrings.debuggingConnectionWasClosed)}</div>
    <div class="content">
      <div class="reason">${i18nString(UIStrings.connectionClosedReason, {PH1: input.reason})}</div>
      <div class="message">${i18nString(UIStrings.reconnectWhenReadyByReopening)}</div>
    </div>
    <div class="button-container">
      <div class="button">
        <devtools-button @click=${input.onReconnect} .jslogContext=${'reconnect'}
            .variant=${Buttons.Button.Variant.OUTLINED}>${i18nString(UIStrings.reconnectDevtools)}</devtools-button>
      </div>
    </div>`,
    target);
  // clang-format on
};

export class RemoteDebuggingTerminatedScreen extends VBox {
  constructor(reason: string, view: View = DEFAULT_VIEW) {
    super({useShadowDom: true});
    const input = {
      reason,
      onReconnect: () => {
        window.location.reload();
      },
    };
    view(input, {}, this.contentElement);
  }

  static show(reason: string): void {
    const dialog = new Dialog('remote-debnugging-terminated');
    dialog.setSizeBehavior(SizeBehavior.MEASURE_CONTENT);
    dialog.addCloseButton();
    dialog.setDimmed(true);
    new RemoteDebuggingTerminatedScreen(reason).show(dialog.contentElement);
    dialog.show();
  }
}
