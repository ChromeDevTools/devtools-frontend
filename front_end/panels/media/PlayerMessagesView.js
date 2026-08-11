// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../ui/legacy/legacy.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import playerMessagesViewStyles from './playerMessagesView.css.js';
const { classMap } = Directives;
const UIStrings = {
    /**
     * @description A context menu item in the Console view of the Console panel.
     */
    default: 'Default',
    /**
     * @description Text in Network throttling selector of the Network panel.
     */
    custom: 'Custom',
    /**
     * @description Text for everything.
     */
    all: 'All',
    /**
     * @description Text for errors.
     */
    error: 'Error',
    /**
     * @description Text to indicate an item is a warning.
     */
    warning: 'Warning',
    /**
     * @description Sdk console message level info in Console view of the Console panel.
     */
    info: 'Info',
    /**
     * @description Debug log level.
     */
    debug: 'Debug',
    /**
     * @description Label for selecting between the set of log levels to show.
     */
    logLevel: 'Log level:',
    /**
     * @description Default text for user text entry for searching log messages.
     */
    filterByLogMessages: 'Filter by log messages',
    /**
     * @description The label for the group name that this error belongs to.
     */
    errorGroupLabel: 'Error group:',
    /**
     * @description The label for the numeric code associated with this error.
     */
    errorCodeLabel: 'Error code:',
    /**
     * @description The label for extra data associated with an error.
     */
    errorDataLabel: 'Data:',
    /**
     * @description The label for the stack trace associated with the error.
     */
    errorStackLabel: 'Stack trace:',
    /**
     * @description The label for a root cause error associated with this error.
     */
    errorCauseLabel: 'Caused by:',
};
const str_ = i18n.i18n.registerUIStrings('panels/media/PlayerMessagesView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
class MessageLevelSelector {
    items;
    view;
    itemMap;
    hiddenLevels;
    bitFieldValue;
    #defaultTitle;
    customTitle;
    allTitle;
    elementsForItems;
    constructor(items, view) {
        this.items = items;
        this.view = view;
        this.itemMap = new Map();
        this.hiddenLevels = [];
        this.bitFieldValue = 7 /* MessageLevelBitfield.DEFAULT */;
        this.#defaultTitle = i18nString(UIStrings.default);
        this.customTitle = i18nString(UIStrings.custom);
        this.allTitle = i18nString(UIStrings.all);
        this.elementsForItems = new WeakMap();
    }
    defaultTitle() {
        return this.#defaultTitle;
    }
    setDefault(dropdown) {
        dropdown.selectItem(this.items.at(0));
    }
    populate() {
        const defaultLevel = {
            title: this.#defaultTitle,
            overwrite: true,
            stringValue: '',
            value: 7 /* MessageLevelBitfield.DEFAULT */,
        };
        this.items.insert(this.items.length, defaultLevel);
        this.itemMap.set(defaultLevel.value, defaultLevel);
        const allLevel = {
            title: this.allTitle,
            overwrite: true,
            stringValue: '',
            value: 15 /* MessageLevelBitfield.ALL */,
        };
        this.items.insert(this.items.length, allLevel);
        this.itemMap.set(allLevel.value, allLevel);
        const errorLevel = {
            title: i18nString(UIStrings.error),
            overwrite: false,
            stringValue: 'error',
            value: 1 /* MessageLevelBitfield.ERROR */,
        };
        this.items.insert(this.items.length, errorLevel);
        this.itemMap.set(errorLevel.value, errorLevel);
        const warningLevel = {
            title: i18nString(UIStrings.warning),
            overwrite: false,
            stringValue: 'warning',
            value: 2 /* MessageLevelBitfield.WARNING */,
        };
        this.items.insert(this.items.length, warningLevel);
        this.itemMap.set(warningLevel.value, warningLevel);
        const infoLevel = {
            title: i18nString(UIStrings.info),
            overwrite: false,
            stringValue: 'info',
            value: 4 /* MessageLevelBitfield.INFO */,
        };
        this.items.insert(this.items.length, infoLevel);
        this.itemMap.set(infoLevel.value, infoLevel);
        const debugLevel = {
            title: i18nString(UIStrings.debug),
            overwrite: false,
            stringValue: 'debug',
            value: 8 /* MessageLevelBitfield.DEBUG */,
        };
        this.items.insert(this.items.length, debugLevel);
        this.itemMap.set(debugLevel.value, debugLevel);
    }
    #renderItem(item, target) {
        const checked = Boolean(item.value & this.bitFieldValue);
        // clang-format off
        render(html `
      <div class="media-messages-level-dropdown-element">
        <div class="media-messages-level-dropdown-checkbox">
          ${!item.overwrite && checked ? html `<div>✓</div>` : nothing}
        </div>
        <span class="media-messages-level-dropdown-text">${item.title}</span>
      </div>
    `, target, { host: this });
        // clang-format on
    }
    updateCheckMarks() {
        this.hiddenLevels = [];
        for (const [key, item] of this.itemMap) {
            if (!item.overwrite) {
                if (!(key & this.bitFieldValue)) {
                    this.hiddenLevels.push(item.stringValue);
                }
                const target = this.elementsForItems.get(item);
                if (target) {
                    this.#renderItem(item, target);
                }
            }
        }
    }
    titleFor(item) {
        // This would make a lot more sense to have in |itemSelected|, but this
        // method gets called first.
        if (item.overwrite) {
            this.bitFieldValue = item.value;
        }
        else {
            this.bitFieldValue ^= item.value;
        }
        if (this.bitFieldValue === 7 /* MessageLevelBitfield.DEFAULT */) {
            return this.#defaultTitle;
        }
        if (this.bitFieldValue === 15 /* MessageLevelBitfield.ALL */) {
            return this.allTitle;
        }
        const potentialMatch = this.itemMap.get(this.bitFieldValue);
        if (potentialMatch) {
            return potentialMatch.title;
        }
        return this.customTitle;
    }
    createElementForItem(item) {
        const element = document.createElement('div');
        const shadowRoot = UI.UIUtils.createShadowRootWithCoreStyles(element, { cssFile: playerMessagesViewStyles });
        this.elementsForItems.set(item, shadowRoot);
        this.itemMap.set(item.value, item);
        this.#renderItem(item, shadowRoot);
        this.updateCheckMarks();
        this.view.regenerateMessageDisplayCss(this.hiddenLevels);
        return element;
    }
    isItemSelectable(_item) {
        return true;
    }
    itemSelected(_item) {
        this.updateCheckMarks();
        this.view.regenerateMessageDisplayCss(this.hiddenLevels);
    }
    highlightedItemChanged(_from, _to, _fromElement, _toElement) {
    }
}
export class PlayerMessagesView extends UI.Widget.VBox {
    headerPanel;
    bodyPanel;
    messageLevelSelector;
    #items = [];
    #hiddenLevels = [];
    #filterString = '';
    #dropDownItem;
    #filterInput;
    constructor() {
        super({ jslog: `${VisualLogging.pane('messages')}` });
        this.registerRequiredCSS(playerMessagesViewStyles);
        this.headerPanel = this.contentElement.createChild('div', 'media-messages-header');
        this.bodyPanel = this.contentElement.createChild('div', 'media-messages-body');
        this.#dropDownItem = this.createDropdown();
        this.#filterInput = this.createFilterInput();
        this.performUpdate();
    }
    createDropdown() {
        const items = new UI.ListModel.ListModel();
        this.messageLevelSelector = new MessageLevelSelector(items, this);
        const dropDown = new UI.SoftDropDown.SoftDropDown(items, this.messageLevelSelector, 'log-level');
        dropDown.setRowHeight(18);
        this.messageLevelSelector.populate();
        this.messageLevelSelector.setDefault(dropDown);
        const dropDownItem = new UI.Toolbar.ToolbarItem(dropDown.element);
        dropDownItem.element.classList.add('toolbar-has-dropdown');
        dropDownItem.setEnabled(true);
        dropDownItem.setTitle(this.messageLevelSelector.defaultTitle());
        UI.ARIAUtils.setLabel(dropDownItem.element, `${i18nString(UIStrings.logLevel)} ${this.messageLevelSelector.defaultTitle()}`);
        return dropDownItem;
    }
    createFilterInput() {
        const filterInput = new UI.Toolbar.ToolbarFilter(i18nString(UIStrings.filterByLogMessages), 1, 1);
        filterInput.addEventListener("TextChanged" /* UI.Toolbar.ToolbarInput.Event.TEXT_CHANGED */, (data) => {
            this.filterByString(data);
        }, this);
        return filterInput;
    }
    performUpdate() {
        this.#renderToolbar();
        this.#renderMessages();
    }
    #renderToolbar() {
        // clang-format off
        render(html `
      <devtools-toolbar class="media-messages-toolbar">
        <div class="toolbar-text">${i18nString(UIStrings.logLevel)}</div>
        ${this.#dropDownItem?.element}
        <div class="toolbar-divider"></div>
        ${this.#filterInput?.element}
      </devtools-toolbar>
    `, this.headerPanel, { host: this });
        // clang-format on
    }
    #renderMessages() {
        // clang-format off
        render(html `
      ${this.#items.map(item => {
            const isUnselected = this.#isLevelHidden(item.level);
            let isFiltered = false;
            if (this.#filterString !== '') {
                if (item.type === 'message') {
                    isFiltered = !item.message.message.includes(this.#filterString);
                }
                else {
                    isFiltered = !this.#errorMatchesFilter(item.error, this.#filterString);
                }
            }
            const classes = {
                'media-messages-message-container': true,
                [`media-message-${item.level}`]: true,
                'media-messages-message-unselected': isUnselected,
                'media-messages-message-filtered': isFiltered,
            };
            return html `
          <div class=${classMap(classes)}>
            ${item.type === 'message' ? item.message.message : this.renderError(item.error)}
          </div>
        `;
        })}
    `, this.bodyPanel, { host: this });
        // clang-format on
    }
    #isLevelHidden(level) {
        return this.#hiddenLevels.includes(level);
    }
    #errorMatchesFilter(error, filter) {
        if (error.errorType.includes(filter) || error.code.toString().includes(filter)) {
            return true;
        }
        for (const [key, value] of Object.entries(error.data)) {
            if (`${key}: ${value}`.includes(filter)) {
                return true;
            }
        }
        for (const stackEntry of error.stack) {
            if (`${stackEntry.file}:${stackEntry.line}`.includes(filter)) {
                return true;
            }
        }
        for (const cause of error.cause) {
            if (this.#errorMatchesFilter(cause, filter)) {
                return true;
            }
        }
        return false;
    }
    regenerateMessageDisplayCss(hiddenLevels) {
        this.#hiddenLevels = hiddenLevels;
        this.performUpdate();
    }
    filterByString(userStringData) {
        this.#filterString = userStringData.data;
        this.performUpdate();
    }
    addMessage(message) {
        this.#items.push({ type: 'message', level: message.level, message });
        this.performUpdate();
    }
    renderError(error) {
        // clang-format off
        return html `
      <div class="status-error-box">
        <div class="status-error-field-labeled">
          <span class="status-error-field-label"
            >${i18nString(UIStrings.errorGroupLabel)}</span
          >
          <span>${error.errorType}</span>
        </div>
        <div class="status-error-field-labeled">
          <span class="status-error-field-label"
            >${i18nString(UIStrings.errorCodeLabel)}</span
          >
          <span>${error.code}</span>
        </div>
        <div class="status-error-field-labeled">
        ${Object.keys(error.data).length !== 0
            ? html `<span class="status-error-field-label"
                  >${i18nString(UIStrings.errorDataLabel)}</span
                >
                <div>
                  ${Object.entries(error.data).map(([key, value]) => html `<div>${key}: ${value}</div>`)}
                </div>`
            : nothing}
        </div>
        <div class="status-error-field-labeled">
          ${error.stack.length !== 0
            ? html `<span class="status-error-field-label"
                    >${i18nString(UIStrings.errorStackLabel)}</span
                  >
                  <div>
                    ${error.stack.map(stackEntry => html `<div>${stackEntry.file}:${stackEntry.line}</div>`)}
                  </div>`
            : nothing}
        </div>
        <div class="status-error-field-labeled">
          ${error.cause.length !== 0
            ? html `
                  <span class="status-error-field-label"
                    >${i18nString(UIStrings.errorCauseLabel)}</span
                  >
                  <div>
                    ${error.cause.map(cause => this.renderError(cause))}
                  </div>
                `
            : nothing}
        </div>
      </div>
    `;
        // clang-format on
    }
    addError(error) {
        this.#items.push({ type: 'error', level: 'error', error });
        this.performUpdate();
    }
}
//# sourceMappingURL=PlayerMessagesView.js.map