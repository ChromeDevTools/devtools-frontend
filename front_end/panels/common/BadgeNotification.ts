// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import badgeNotificationStyles from './badgeNotification.css.js';

const {html, render} = Lit;

const UIStrings = {
  /**
   * @description Title for close button
   */
  dismiss: 'Dismiss',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/common/BadgeNotification.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface BadgeNotificationAction {
  label: string;
  jslogContext?: string;
  title?: string;
  onClick: () => void;
}

export interface BadgeNotificationProperties {
  message: Lit.LitTemplate;
  imageUri: string;
  actions: BadgeNotificationAction[];
}

export interface ViewInput extends BadgeNotificationProperties {
  onCloseClick: () => void;
}

// clang-format off
const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  const actionButtons = input.actions.map(property => {
    return html`<devtools-button
        class="notification-button"
        @click=${() => property.onClick()}
        jslog=${VisualLogging.action(property.jslogContext).track({click: true})}
        .variant=${Buttons.Button.Variant.TEXT}
        .title=${property.title ?? ''}
        .inverseColorTheme=${true}
    >${property.label}</devtools-button>`;
  });

  const crossButton = html`<devtools-button
        class="dismiss notification-button"
        @click=${input.onCloseClick}
        jslog=${VisualLogging.action('badge-notification.dismiss').track({click: true})}
        aria-label=${i18nString(UIStrings.dismiss)}
        .iconName=${'cross'}
        .variant=${Buttons.Button.Variant.ICON}
        .title=${i18nString(UIStrings.dismiss)}
        .inverseColorTheme=${true}
    ></devtools-button>`;

  render(html`
    <style>${badgeNotificationStyles}</style>
    <div class="container">
        <div class="label-container">
            <img class="badge-image" src=${input.imageUri}>
            <div class="message">${input.message}</div>
            ${crossButton}
        </div>
        <div class="long-action-container">${actionButtons}</div>
    </div>
  `, target);
};
// clang-format on

type View = typeof DEFAULT_VIEW;

export class BadgeNotification extends UI.Widget.Widget {
  message: Lit.LitTemplate = html``;
  imageUri = '';
  actions: BadgeNotificationAction[] = [];

  #view: View;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  static show(properties: BadgeNotificationProperties): BadgeNotification {
    const widget = new BadgeNotification();
    widget.message = properties.message;
    widget.imageUri = properties.imageUri;
    widget.actions = properties.actions;
    widget.show(UI.InspectorView.InspectorView.instance().element);
    return widget;
  }

  #close = (): void => {
    this.detach();
  };

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  override performUpdate(): void {
    const viewInput: ViewInput = {
      message: this.message,
      imageUri: this.imageUri,
      actions: this.actions,
      onCloseClick: this.#close,
    };
    this.#view(viewInput, undefined, this.contentElement);
  }
}
