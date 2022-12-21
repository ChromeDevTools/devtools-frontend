// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';

import playerMessagesViewStyles from './playerMessagesView.css.js';

import type * as Protocol from '../../generated/protocol.js';

const UIStrings = {
  /**
   *@description A context menu item in the Console View of the Console panel
   */
  default: 'Default',
  /**
   *@description Text in Network Throttling Selector of the Network panel
   */
  custom: 'Custom',
  /**
   *@description Text for everything
   */
  all: 'All',
  /**
   *@description Text for errors
   */
  error: 'Error',
  /**
   *@description Text to indicate an item is a warning
   */
  warning: 'Warning',
  /**
   *@description Sdk console message message level info of level Labels in Console View of the Console panel
   */
  info: 'Info',
  /**
   *@description Debug log level
   */
  debug: 'Debug',
  /**
   *@description Label for selecting between the set of log levels to show.
   */
  logLevel: 'Log level:',
  /**
   *@description Default text for user-text-entry for searching log messages.
   */
  filterLogMessages: 'Filter log messages',
  /**
   *@description The label for the group name that this error belongs to.
   */
  errorGroupLabel: 'Error Group:',
  /**
   *@description The label for the numeric code associated with this error.
   */
  errorCodeLabel: 'Error Code:',
  /**
   *@description The label for extra data associated with an error.
   */
  errorDataLabel: 'Data:',
  /**
   *@description The label for the stacktrace associated with the error.
   */
  errorStackLabel: 'Stacktrace:',
  /**
   *@description The label for a root cause error associated with this error.
   */
  errorCauseLabel: 'Caused by:',
};
const str_ = i18n.i18n.registerUIStrings('panels/media/PlayerMessagesView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const enum MessageLevelBitfield {
  Error = 0b0001,
  Warning = 0b0010,
  Info = 0b0100,
  Debug = 0b1000,

  Default = 0b0111,  // Error, Warning, Info
  All = 0b1111,      // Error, Warning, Info, Debug
  Custom = 0,
}

interface SelectableLevel {
  title: string;
  value: MessageLevelBitfield;
  stringValue: string;
  selectable?: boolean;
  overwrite?: boolean;
}

class MessageLevelSelector implements UI.SoftDropDown.Delegate<SelectableLevel> {
  private readonly items: UI.ListModel.ListModel<SelectableLevel>;
  private readonly view: PlayerMessagesView;
  private readonly itemMap: Map<number, SelectableLevel>;
  private hiddenLevels: string[];
  private bitFieldValue: MessageLevelBitfield;
  private readonly savedBitFieldValue: MessageLevelBitfield;
  private readonly defaultTitleInternal: Common.UIString.LocalizedString;
  private readonly customTitle: Common.UIString.LocalizedString;
  private readonly allTitle: Common.UIString.LocalizedString;
  elementsForItems: WeakMap<SelectableLevel, HTMLElement>;

  constructor(items: UI.ListModel.ListModel<SelectableLevel>, view: PlayerMessagesView) {
    this.items = items;
    this.view = view;
    this.itemMap = new Map();

    this.hiddenLevels = [];

    this.bitFieldValue = MessageLevelBitfield.Default;
    this.savedBitFieldValue = MessageLevelBitfield.Default;

    this.defaultTitleInternal = i18nString(UIStrings.default);
    this.customTitle = i18nString(UIStrings.custom);
    this.allTitle = i18nString(UIStrings.all);

    this.elementsForItems = new WeakMap();
  }

  defaultTitle(): Common.UIString.LocalizedString {
    return this.defaultTitleInternal;
  }

  setDefault(dropdown: UI.SoftDropDown.SoftDropDown<SelectableLevel>): void {
    dropdown.selectItem(this.items.at(0));
  }

  populate(): void {
    this.items.insert(this.items.length, {
      title: this.defaultTitleInternal,
      overwrite: true,
      stringValue: '',
      value: MessageLevelBitfield.Default,
      selectable: undefined,
    });

    this.items.insert(this.items.length, {
      title: this.allTitle,
      overwrite: true,
      stringValue: '',
      value: MessageLevelBitfield.All,
      selectable: undefined,
    });

    this.items.insert(this.items.length, {
      title: i18nString(UIStrings.error),
      overwrite: false,
      stringValue: 'error',
      value: MessageLevelBitfield.Error,
      selectable: undefined,
    });

    this.items.insert(this.items.length, {
      title: i18nString(UIStrings.warning),
      overwrite: false,
      stringValue: 'warning',
      value: MessageLevelBitfield.Warning,
      selectable: undefined,
    });

    this.items.insert(this.items.length, {
      title: i18nString(UIStrings.info),
      overwrite: false,
      stringValue: 'info',
      value: MessageLevelBitfield.Info,
      selectable: undefined,
    });

    this.items.insert(this.items.length, {
      title: i18nString(UIStrings.debug),
      overwrite: false,
      stringValue: 'debug',
      value: MessageLevelBitfield.Debug,
      selectable: undefined,
    });
  }

  private updateCheckMarks(): void {
    this.hiddenLevels = [];
    for (const [key, item] of this.itemMap) {
      if (!item.overwrite) {
        const elementForItem = this.elementsForItems.get(item as SelectableLevel);
        if (elementForItem && elementForItem.firstChild) {
          elementForItem.firstChild.remove();
        }
        if (elementForItem && key & this.bitFieldValue) {
          UI.UIUtils.createTextChild(elementForItem.createChild('div'), '✓');
        } else {
          this.hiddenLevels.push(item.stringValue);
        }
      }
    }
  }

  titleFor(item: SelectableLevel): string {
    // This would make a lot more sense to have in |itemSelected|, but this
    // method gets called first.
    if (item.overwrite) {
      this.bitFieldValue = item.value;
    } else {
      this.bitFieldValue ^= item.value;
    }

    if (this.bitFieldValue === MessageLevelBitfield.Default) {
      return this.defaultTitleInternal;
    }

    if (this.bitFieldValue === MessageLevelBitfield.All) {
      return this.allTitle;
    }

    const potentialMatch = this.itemMap.get(this.bitFieldValue);
    if (potentialMatch) {
      return potentialMatch.title;
    }

    return this.customTitle;
  }

  createElementForItem(item: SelectableLevel): Element {
    const element = document.createElement('div');
    const shadowRoot = UI.Utils.createShadowRootWithCoreStyles(
        element, {cssFile: [playerMessagesViewStyles], delegatesFocus: undefined});
    const container = shadowRoot.createChild('div', 'media-messages-level-dropdown-element');
    const checkBox = container.createChild('div', 'media-messages-level-dropdown-checkbox') as HTMLElement;
    const text = container.createChild('span', 'media-messages-level-dropdown-text');
    UI.UIUtils.createTextChild(text, item.title);
    this.elementsForItems.set(item, checkBox);
    this.itemMap.set(item.value, item);
    this.updateCheckMarks();
    this.view.regenerateMessageDisplayCss(this.hiddenLevels);
    return element;
  }

  isItemSelectable(_item: SelectableLevel): boolean {
    return true;
  }

  itemSelected(_item: SelectableLevel|null): void {
    this.updateCheckMarks();
    this.view.regenerateMessageDisplayCss(this.hiddenLevels);
  }

  highlightedItemChanged(
      _from: SelectableLevel|null, _to: SelectableLevel|null, _fromElement: Element|null,
      _toElement: Element|null): void {
  }
}

export class PlayerMessagesView extends UI.Widget.VBox {
  private readonly headerPanel: HTMLElement;
  private readonly bodyPanel: HTMLElement;
  private messageLevelSelector?: MessageLevelSelector;

  constructor() {
    super();

    this.headerPanel = this.contentElement.createChild('div', 'media-messages-header');
    this.bodyPanel = this.contentElement.createChild('div', 'media-messages-body');

    this.buildToolbar();
  }

  private buildToolbar(): void {
    const toolbar = new UI.Toolbar.Toolbar('media-messages-toolbar', this.headerPanel);
    toolbar.appendText(i18nString(UIStrings.logLevel));
    toolbar.appendToolbarItem(this.createDropdown());
    toolbar.appendSeparator();
    toolbar.appendToolbarItem(this.createFilterInput());
  }

  private createDropdown(): UI.Toolbar.ToolbarItem {
    const items = new UI.ListModel.ListModel<SelectableLevel>();
    this.messageLevelSelector = new MessageLevelSelector(items, this);
    const dropDown = new UI.SoftDropDown.SoftDropDown<SelectableLevel>(items, this.messageLevelSelector);
    dropDown.setRowHeight(18);

    this.messageLevelSelector.populate();
    this.messageLevelSelector.setDefault(dropDown);

    const dropDownItem = new UI.Toolbar.ToolbarItem(dropDown.element);
    dropDownItem.element.classList.add('toolbar-has-dropdown');
    dropDownItem.setEnabled(true);
    dropDownItem.setTitle(this.messageLevelSelector.defaultTitle());
    return dropDownItem;
  }

  private createFilterInput(): UI.Toolbar.ToolbarInput {
    const filterInput = new UI.Toolbar.ToolbarInput(i18nString(UIStrings.filterLogMessages));
    filterInput.addEventListener(UI.Toolbar.ToolbarInput.Event.TextChanged, (data: {data: string}) => {
      this.filterByString(data as {
        data: string,
      });
    }, this);
    return filterInput;
  }

  regenerateMessageDisplayCss(hiddenLevels: string[]): void {
    const messages = this.bodyPanel.getElementsByClassName('media-messages-message-container');
    for (const message of messages) {
      if (this.matchesHiddenLevels(message, hiddenLevels)) {
        message.classList.add('media-messages-message-unselected');
      } else {
        message.classList.remove('media-messages-message-unselected');
      }
    }
  }

  private matchesHiddenLevels(element: Element, hiddenLevels: string[]): boolean {
    for (const level of hiddenLevels) {
      if (element.classList.contains('media-message-' + level)) {
        return true;
      }
    }
    return false;
  }

  private filterByString(userStringData: {data: string}): void {
    const userString = userStringData.data;
    const messages = this.bodyPanel.getElementsByClassName('media-messages-message-container');

    for (const message of messages) {
      if (userString === '') {
        message.classList.remove('media-messages-message-filtered');
      } else if (message.textContent && message.textContent.includes(userString)) {
        message.classList.remove('media-messages-message-filtered');
      } else {
        message.classList.add('media-messages-message-filtered');
      }
    }
  }

  addMessage(message: Protocol.Media.PlayerMessage): void {
    const container =
        this.bodyPanel.createChild('div', 'media-messages-message-container media-message-' + message.level);
    UI.UIUtils.createTextChild(container, message.message);
  }

  private errorToDiv(error: Protocol.Media.PlayerError): Element {
    const entry = UI.Fragment.Fragment.build`
    <div class="status-error-box">
    <div class="status-error-field-labeled">
      <span class="status-error-field-label" $="status-error-group"></span>
      <span>${error.errorType}</span>
    </div>
    <div class="status-error-field-labeled">
      <span class="status-error-field-label" $="status-error-code"></span>
      <span>${error.code}</span>
    </div>
    <div class="status-error-field-labeled" $="status-error-data">
    </div>
    <div class="status-error-field-labeled" $="status-error-stack">
    </div>
    <div class="status-error-field-labeled" $="status-error-cause">
    </div>
    `;

    entry.$('status-error-group').textContent = i18nString(UIStrings.errorGroupLabel);
    entry.$('status-error-code').textContent = i18nString(UIStrings.errorCodeLabel);

    if (Object.keys(error.data).length !== 0) {
      const label = entry.$('status-error-data').createChild('span', 'status-error-field-label');
      UI.UIUtils.createTextChild(label, i18nString(UIStrings.errorDataLabel));
      const dataContent = entry.$('status-error-data').createChild('div');
      for (const [key, value] of Object.entries(error.data)) {
        const datumContent = dataContent.createChild('div');
        UI.UIUtils.createTextChild(datumContent, `${key}: ${value}`);
      }
    }

    if (error.stack.length !== 0) {
      const label = entry.$('status-error-stack').createChild('span', 'status-error-field-label');
      UI.UIUtils.createTextChild(label, i18nString(UIStrings.errorStackLabel));
      const stackContent = entry.$('status-error-stack').createChild('div');
      for (const stackEntry of error.stack) {
        const frameBox = stackContent.createChild('div');
        UI.UIUtils.createTextChild(frameBox, `${stackEntry.file}:${stackEntry.line}`);
      }
    }

    if (error.cause.length !== 0) {
      const label = entry.$('status-error-cause').createChild('span', 'status-error-field-label');
      UI.UIUtils.createTextChild(label, i18nString(UIStrings.errorCauseLabel));
      entry.$('status-error-cause').appendChild(this.errorToDiv(error.cause[0]));
    }

    return entry.element();
  }

  addError(error: Protocol.Media.PlayerError): void {
    const container = this.bodyPanel.createChild('div', 'media-messages-message-container media-message-error');
    container.appendChild(this.errorToDiv(error));
  }

  wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([playerMessagesViewStyles]);
  }
}
