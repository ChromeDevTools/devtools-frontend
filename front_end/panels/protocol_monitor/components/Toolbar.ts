// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import toolbarStyles from './toolbar.css.js';

const {html, Decorators, LitElement} = LitHtml;
const {customElement} = Decorators;

const UIStrings = {
  /**
   * @description The title of a the button that sends a CDP command.
   */
  sendCommandCtrlEnter: 'Send command - Ctrl+Enter',
  /**
   * @description The title of a the button that sends a CDP command.
   */
  sendCommandCmdEnter: 'Send command - ⌘+Enter',
  /**
   * @description he title of a the button that copies a CDP command.
   */
  copyCommand: 'Copy command',
};
const str_ = i18n.i18n.registerUIStrings('panels/protocol_monitor/components/Toolbar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-pm-toolbar': Toolbar;
  }
}

const copyIconUrl = new URL('../../../Images/copy.svg', import.meta.url).toString();
const sendIconUrl = new URL('../../../Images/send.svg', import.meta.url).toString();

export class CopyCommandEvent extends Event {
  static readonly eventName = 'copycommand';
  constructor() {
    super(CopyCommandEvent.eventName, {bubbles: true, composed: true});
  }
}

export class SendCommandEvent extends Event {
  static readonly eventName = 'commandsent';
  constructor() {
    super(SendCommandEvent.eventName, {bubbles: true, composed: true});
  }
}

@customElement('devtools-pm-toolbar')
export class Toolbar extends LitElement {
  static override styles = [toolbarStyles];

  #handleCopy = (): void => {
    this.dispatchEvent(new CopyCommandEvent());
  };

  #handleSend = (): void => {
    this.dispatchEvent(new SendCommandEvent());
  };

  override render(): LitHtml.TemplateResult {
    // clang-format off
    return html`
        <div class="toolbar">
          <${Buttons.Button.Button.litTagName}
          title=${i18nString(UIStrings.copyCommand)}
          .size=${Buttons.Button.Size.SMALL}
          .iconUrl=${copyIconUrl}
          .variant=${Buttons.Button.Variant.TOOLBAR}
          @click=${this.#handleCopy}
          jslog=${VisualLogging.action('protocol-monitor.copy-command').track({click: true})}
        ></${Buttons.Button.Button.litTagName}>
        <${Buttons.Button.Button.litTagName}
          .size=${Buttons.Button.Size.REGULAR}
          title=${Host.Platform.isMac() ? i18nString(UIStrings.sendCommandCmdEnter) : i18nString(UIStrings.sendCommandCtrlEnter)}
          .iconUrl=${sendIconUrl}
          .variant=${Buttons.Button.Variant.PRIMARY_TOOLBAR}
          @click=${this.#handleSend}
          jslog=${VisualLogging.action('protocol-monitor.send-command').track({click: true})}
        ></${Buttons.Button.Button.litTagName}>
      </div>
    `;
    // clang-format on
  }
}
