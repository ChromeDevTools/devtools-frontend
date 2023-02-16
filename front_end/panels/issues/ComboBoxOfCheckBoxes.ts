// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as i18n from '../../core/i18n/i18n.js';

const UIStrings = {
  /**
   *@description Generic menu name accessibility label
   */
  genericMenuLabel: 'Menu',
};
const str_ = i18n.i18n.registerUIStrings('panels/issues/ComboBoxOfCheckBoxes.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class ComboBoxOfCheckBoxes extends UI.Toolbar.ToolbarButton {
  #options = new Array<MenuOption>();
  #headers = new Array<MenuHeader>();
  #onOptionClicked = (): void => {};
  constructor(title: string) {
    super(title);
    this.turnIntoSelect();
    this.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this.#showLevelContextMenu.bind(this));
    UI.ARIAUtils.markAsMenuButton(this.element);
  }

  addOption(option: string, value: string, defaultEnabled: boolean): void {
    this.#options.push({'title': option, 'value': value, default: defaultEnabled, 'enabled': defaultEnabled});
  }

  setOptionEnabled(index: number, enabled: boolean): void {
    const option = this.#options[index];
    if (!option) {
      return;
    }
    option.enabled = enabled;
    this.#onOptionClicked();
  }

  addHeader(headerName: string, callback: (() => void)): void {
    this.#headers.push({title: headerName, callback: callback});
  }

  setOnOptionClicked(onOptionClicked: (() => void)): void {
    this.#onOptionClicked = onOptionClicked;
  }

  getOptions(): Array<MenuOption> {
    return this.#options;
  }

  async #showLevelContextMenu({data: mouseEvent}: Common.EventTarget.EventTargetEvent<Event>): Promise<void> {
    const contextMenu = new UI.ContextMenu.ContextMenu(mouseEvent, {
      useSoftMenu: true,
      x: this.element.getBoundingClientRect().left,
      y: this.element.getBoundingClientRect().top + this.element.offsetHeight,
    });

    for (const {title, callback} of this.#headers) {
      contextMenu.headerSection().appendItem(title, () => callback());
    }
    for (const [index, {title, enabled}] of this.#options.entries()) {
      contextMenu.defaultSection().appendCheckboxItem(title, () => {
        this.setOptionEnabled(index, !enabled);
      }, enabled);
    }
    contextMenu.setContextMenuLabel(this.title ?? i18nString(UIStrings.genericMenuLabel));
    await contextMenu.show();
    contextMenu.markAsMenuItemCheckBox();
  }
}

interface MenuOption {
  title: string;
  value: string;
  default: boolean;
  enabled: boolean;
}

interface MenuHeader {
  title: string;
  callback: () => void;
}
