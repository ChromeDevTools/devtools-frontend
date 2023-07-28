// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/legacy/legacy.js';

import * as i18n from '../../../core/i18n/i18n.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import type * as PublicExtensions from '../../../models/extensions/extensions.js';
import * as Extensions from '../extensions/extensions.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';

import extensionViewStyles from './extensionView.css.js';

const UIStrings = {
  /**
   * @description The button label that closes the panel that shows the extension content inside the Recorder panel.
   */
  closeView: 'Close',
  /**
   * @description The label that indicates that the content shown is provided by a browser extension.
   */
  extension: 'Content provided by a browser extension',
};
const str_ = i18n.i18n.registerUIStrings(
    'panels/recorder/components/ExtensionView.ts',
    UIStrings,
);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-recorder-extension-view': ExtensionView;
  }
  interface HTMLElementEventMap {
    recorderextensionviewclosed: ClosedEvent;
  }
}

export class ClosedEvent extends Event {
  static readonly eventName = 'recorderextensionviewclosed';
  constructor() {
    super(ClosedEvent.eventName, {bubbles: true, composed: true});
  }
}

const extensionIcon = new URL(
                          '../images/extension_icon.svg',
                          import.meta.url,
                          )
                          .toString();

export class ExtensionView extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-recorder-extension-view`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  #descriptor?: PublicExtensions.RecorderPluginManager.ViewDescriptor;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [extensionViewStyles];
    this.#render();
  }

  disconnectedCallback(): void {
    if (!this.#descriptor) {
      return;
    }
    Extensions.ExtensionManager.ExtensionManager.instance().getView(this.#descriptor.id).hide();
  }

  set descriptor(
      descriptor: PublicExtensions.RecorderPluginManager.ViewDescriptor,
  ) {
    this.#descriptor = descriptor;
    this.#render();
    Extensions.ExtensionManager.ExtensionManager.instance().getView(descriptor.id).show();
  }

  #closeView(): void {
    this.dispatchEvent(new ClosedEvent());
  }

  #render(): void {
    if (!this.#descriptor) {
      return;
    }
    const iframe = Extensions.ExtensionManager.ExtensionManager.instance().getView(this.#descriptor.id).frame();
    // clang-format off
    LitHtml.render(
      LitHtml.html`
        <div class="extension-view">
          <header>
            <div class="title">
              <${IconButton.Icon.Icon.litTagName}
                class="icon"
                title=${i18nString(UIStrings.extension)}
                .data=${
                  {
                    iconPath: extensionIcon,
                    color: 'var(--sys-color-secondary)',
                  } as IconButton.Icon.IconData
                }>
              </${IconButton.Icon.Icon.litTagName}>
              ${this.#descriptor.title}
            </div>
            <${Buttons.Button.Button.litTagName}
              title=${i18nString(UIStrings.closeView)}
              .data=${
                {
                  variant: Buttons.Button.Variant.ROUND,
                  size: Buttons.Button.Size.TINY,
                  iconName: 'cross',
                } as Buttons.Button.ButtonData
              }
              @click=${this.#closeView}
            ></${Buttons.Button.Button.litTagName}>
          </header>
          <main>
            ${iframe}
          <main>
      </div>
    `,
      this.#shadow,
      { host: this },
    );
    // clang-format on
  }
}

ComponentHelpers.CustomElements.defineComponent(
    'devtools-recorder-extension-view',
    ExtensionView,
);
