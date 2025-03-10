// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';

import commonStyles from './common.css.js';

const {html} = Lit;

const UIStrings = {
  /**
   *@description Header text for the feature reminder dialog.
   */
  thingsToConsider: 'Things to consider',
  /**
   *@description Text for the learn more button in the feature reminder dialog.
   */
  learnMore: 'Learn more',
  /**
   *@description Text for the cancel button in the feature reminder dialog.
   */
  cancel: 'Cancel',
  /**
   *@description Text for the got it button in the feature reminder dialog.
   */
  gotIt: 'Got it',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/common/common.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export function showFreDialog({
  header,
  reminderItems,
  learnMoreHref,
}: {
  header: {
    iconName: string,
    text: Platform.UIString.LocalizedString,
  },
  reminderItems: Array<{
    iconName: string,
    content: Platform.UIString.LocalizedString | Lit.LitTemplate,
  }>,
  learnMoreHref: Platform.DevToolsPath.UrlString,
}): Promise<boolean> {
  const dialog = new UI.Dialog.Dialog();
  const result = Promise.withResolvers<boolean>();
  // clang-format off
  Lit.render(html`
    <div class="fre-disclaimer">
      <style>
        ${commonStyles.cssContent}
      </style>
      <header>
        <div class="header-icon-container">
          <devtools-icon name=${header.iconName}></devtools-icon>
        </div>
        <h2 tabindex="-1">
          ${header.text}
        </h2>
      </header>
      <main class="reminder-container">
        <h3>${i18nString(UIStrings.thingsToConsider)}</h3>
        ${reminderItems.map(reminderItem => html`
          <div class="reminder-item">
            <devtools-icon class="reminder-icon" name=${reminderItem.iconName}></devtools-icon>
            <span>${reminderItem.content}</span>
          </div>
        `)}
      </main>
      <footer>
        <devtools-button
          @click=${() => {
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(learnMoreHref);
          }}
          .jslogContext=${'fre-disclaimer.learn-more'}
          .variant=${Buttons.Button.Variant.OUTLINED}>
          ${i18nString(UIStrings.learnMore)}
        </devtools-button>
        <div class="right-buttons">
          <devtools-button
            @click=${() => {
              dialog.hide();
              result.resolve(false);
            }}
            .jslogContext=${'fre-disclaimer.cancel'}
            .variant=${Buttons.Button.Variant.TONAL}>
            ${i18nString(UIStrings.cancel)}
          </devtools-button>
          <devtools-button
            @click=${() => {
              dialog.hide();
              result.resolve(true);
            }}
            .jslogContext=${'fre-disclaimer.continue'}
            .variant=${Buttons.Button.Variant.PRIMARY}>
            ${i18nString(UIStrings.gotIt)}
          </devtools-button>
        </div>
      </footer>
    </div>`, dialog.contentElement);
  // clang-format on

  dialog.setOutsideClickCallback(ev => {
    ev.consume();
    dialog.hide();
    result.resolve(false);
  });
  dialog.setSizeBehavior(UI.GlassPane.SizeBehavior.MEASURE_CONTENT);
  dialog.setMaxContentSize(new UI.Geometry.Size(448, 600));
  dialog.setDimmed(true);
  dialog.show();

  return result.promise;
}
