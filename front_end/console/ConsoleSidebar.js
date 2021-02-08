// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as SDK from '../sdk/sdk.js';
import * as TextUtils from '../text_utils/text_utils.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';

import {ConsoleFilter, FilterType} from './ConsoleFilter.js';
import {ConsoleViewMessage} from './ConsoleViewMessage.js';  // eslint-disable-line no-unused-vars

export const UIStrings = {
  /**
  *@description Filter name in Console Sidebar of the Console panel
  */
  other: '<other>',
  /**
  *@description Text in Console Sidebar of the Console panel to show that there is 1 user message
  */
  UserMessage: '1 user message',
  /**
  *@description Text in Console Sidebar of the Console panel to show that there is 1 message
  */
  Message: '1 message',
  /**
  *@description Text in Console Sidebar of the Console panel to show that there is 1 error
  */
  Error: '1 error',
  /**
  *@description Text in Console Sidebar of the Console panel to show that there is 1 warning
  */
  Warning: '1 warning',
  /**
  *@description Text in Console Sidebar of the Console panel to show that there is 1 info
  */
  Info: '1 info',
  /**
  *@description Text in Console Sidebar of the Console panel to show that there is 1 verbose message
  */
  Verbose: '1 verbose',
  /**
  *@description Text in Console Sidebar of the Console panel to show that there are more than 1 user messages
  *@example {2} PH1
  */
  dUserMessages: '{PH1} user messages',
  /**
  *@description Text in Console Sidebar of the Console panel to show that there are more than 1 messages
  *@example {2} PH1
  */
  dMessages: '{PH1} messages',
  /**
  *@description Text in Console Sidebar of the Console panel to show that there are more than 1 errors
  *@example {2} PH1
  */
  dErrors: '{PH1} errors',
  /**
  *@description Text in Console Sidebar of the Console panel to show that there are more than 1 warnings
  *@example {2} PH1
  */
  dWarnings: '{PH1} warnings',
  /**
  *@description Text in Console Sidebar of the Console panel to show that there are more than 1 info
  *@example {2} PH1
  */
  dInfo: '{PH1} info',
  /**
  *@description Text in Console Sidebar of the Console panel to show that there are more than 1 verbose messages
  *@example {2} PH1
  */
  dVerbose: '{PH1} verbose',
  /**
  *@description Text in Console Sidebar of the Console panel to show that there are no user messages
  */
  noUserMessages: 'No user messages',
  /**
  *@description Text in Console Sidebar of the Console panel to show that there are no messages
  */
  noMessages: 'No messages',
  /**
  *@description Text in Console Sidebar of the Console panel to show that there are no errors
  */
  noErrors: 'No errors',
  /**
  *@description Text in Console Sidebar of the Console panel to show that there are no warnings
  */
  noWarnings: 'No warnings',
  /**
  *@description Text in Console Sidebar of the Console panel to show that there is no info
  */
  noInfo: 'No info',
  /**
  *@description Text in Console Sidebar of the Console panel to show that there is no verbose messages
  */
  noVerbose: 'No verbose',
};
const str_ = i18n.i18n.registerUIStrings('console/ConsoleSidebar.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ConsoleSidebar extends UI.Widget.VBox {
  constructor() {
    super(true);
    this.setMinimumSize(125, 0);

    this._tree = new UI.TreeOutline.TreeOutlineInShadow();
    this._tree.registerRequiredCSS('console/consoleSidebar.css', {enableLegacyPatching: true});
    this._tree.addEventListener(UI.TreeOutline.Events.ElementSelected, this._selectionChanged.bind(this));
    this.contentElement.appendChild(this._tree.element);
    /** @type {?UI.TreeOutline.TreeElement} */
    this._selectedTreeElement = null;
    /** @type {!Array<!FilterTreeElement>} */
    this._treeElements = [];
    /** @type {!Common.Settings.Setting<string>} */
    const selectedFilterSetting =
        Common.Settings.Settings.instance().createSetting('console.sidebarSelectedFilter', null);

    const Levels = SDK.ConsoleModel.MessageLevel;
    const consoleAPIParsedFilters =
        [{key: FilterType.Source, text: SDK.ConsoleModel.MessageSource.ConsoleAPI, negative: false, regex: undefined}];
    this._appendGroup(
        _groupName.All, [], ConsoleFilter.allLevelsFilterValue(), UI.Icon.Icon.create('mediumicon-list'),
        selectedFilterSetting);
    this._appendGroup(
        _groupName.ConsoleAPI, consoleAPIParsedFilters, ConsoleFilter.allLevelsFilterValue(),
        UI.Icon.Icon.create('mediumicon-account-circle'), selectedFilterSetting);
    this._appendGroup(
        _groupName.Error, [], ConsoleFilter.singleLevelMask(Levels.Error),
        UI.Icon.Icon.create('mediumicon-error-circle'), selectedFilterSetting);
    this._appendGroup(
        _groupName.Warning, [], ConsoleFilter.singleLevelMask(Levels.Warning),
        UI.Icon.Icon.create('mediumicon-warning-triangle'), selectedFilterSetting);
    this._appendGroup(
        _groupName.Info, [], ConsoleFilter.singleLevelMask(Levels.Info), UI.Icon.Icon.create('mediumicon-info-circle'),
        selectedFilterSetting);
    this._appendGroup(
        _groupName.Verbose, [], ConsoleFilter.singleLevelMask(Levels.Verbose), UI.Icon.Icon.create('mediumicon-bug'),
        selectedFilterSetting);
    const selectedTreeElementName = selectedFilterSetting.get();
    const defaultTreeElement =
        this._treeElements.find(x => x.name() === selectedTreeElementName) || this._treeElements[0];
    defaultTreeElement.select();
  }

  /**
   * @param {string} name
   * @param {!Array<!TextUtils.TextUtils.ParsedFilter>} parsedFilters
   * @param {!Object<string, boolean>} levelsMask
   * @param {!UI.Icon.Icon} icon
   * @param {!Common.Settings.Setting<string>} selectedFilterSetting
   */
  _appendGroup(name, parsedFilters, levelsMask, icon, selectedFilterSetting) {
    const filter = new ConsoleFilter(name, parsedFilters, null, levelsMask);
    const treeElement = new FilterTreeElement(filter, icon, selectedFilterSetting);
    this._tree.appendChild(treeElement);
    this._treeElements.push(treeElement);
  }

  clear() {
    for (const treeElement of this._treeElements) {
      treeElement.clear();
    }
  }

  /**
   * @param {!ConsoleViewMessage} viewMessage
   */
  onMessageAdded(viewMessage) {
    for (const treeElement of this._treeElements) {
      treeElement.onMessageAdded(viewMessage);
    }
  }

  /**
   * @param {!ConsoleViewMessage} viewMessage
   * @return {boolean}
   */
  shouldBeVisible(viewMessage) {
    if (this._selectedTreeElement instanceof ConsoleSidebarTreeElement) {
      return this._selectedTreeElement.filter().shouldBeVisible(viewMessage);
    }
    return true;
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _selectionChanged(event) {
    this._selectedTreeElement = /** @type {!UI.TreeOutline.TreeElement} */ (event.data);
    this.dispatchEventToListeners(Events.FilterSelected);
  }
}

/** @enum {symbol} */
export const Events = {
  FilterSelected: Symbol('FilterSelected')
};

class ConsoleSidebarTreeElement extends UI.TreeOutline.TreeElement {
  /**
   * @param {string|!Node} title
   * @param {!ConsoleFilter} filter
   */
  constructor(title, filter) {
    super(title);
    this._filter = filter;
  }

  filter() {
    return this._filter;
  }
}

export class URLGroupTreeElement extends ConsoleSidebarTreeElement {
  /**
   * @param {!ConsoleFilter} filter
   */
  constructor(filter) {
    super(filter.name, filter);
    this._countElement = this.listItemElement.createChild('span', 'count');
    const leadingIcons = [UI.Icon.Icon.create('largeicon-navigator-file')];
    this.setLeadingIcons(leadingIcons);
    this._messageCount = 0;
  }

  incrementAndUpdateCounter() {
    this._messageCount++;
    this._countElement.textContent = `${this._messageCount}`;
  }
}

export class FilterTreeElement extends ConsoleSidebarTreeElement {
  /**
   * @param {!ConsoleFilter} filter
   * @param {!UI.Icon.Icon} icon
   * @param {!Common.Settings.Setting<string>} selectedFilterSetting
   */
  constructor(filter, icon, selectedFilterSetting) {
    super(filter.name, filter);
    this._selectedFilterSetting = selectedFilterSetting;
    /** @type {!Map<?string, !URLGroupTreeElement>} */
    this._urlTreeElements = new Map();
    this.setLeadingIcons([icon]);
    this._messageCount = 0;
    this._updateCounter();
  }

  clear() {
    this._urlTreeElements.clear();
    this.removeChildren();
    this._messageCount = 0;
    this._updateCounter();
  }

  /**
   * @return {string}
   */
  name() {
    return this._filter.name;
  }

  /**
   * @param {boolean=} selectedByUser
   * @return {boolean}
   * @override
   */
  onselect(selectedByUser) {
    this._selectedFilterSetting.set(this._filter.name);
    return super.onselect(selectedByUser);
  }

  _updateCounter() {
    if (!this._messageCount) {
      this.title = _groupNoMessageTitleMap.get(this._filter.name) || '';
    } else if (this._messageCount === 1) {
      this.title = _groupSingularTitleMap.get(this._filter.name) || '';
    } else {
      this.title = this._updatePluralTitle(this._filter.name, this._messageCount);
    }

    this.setExpandable(Boolean(this.childCount()));
  }

  /**
   * @param {string} filterName
   * @param {number} messageCount
   * @return {string}
   */
  _updatePluralTitle(filterName, messageCount) {
    const _groupPluralTitleMap = new Map([
      [_groupName.ConsoleAPI, i18nString(UIStrings.dUserMessages, {PH1: messageCount})],
      [_groupName.All, i18nString(UIStrings.dMessages, {PH1: messageCount})],
      [_groupName.Error, i18nString(UIStrings.dErrors, {PH1: messageCount})],
      [_groupName.Warning, i18nString(UIStrings.dWarnings, {PH1: messageCount})],
      [_groupName.Info, i18nString(UIStrings.dInfo, {PH1: messageCount})],
      [_groupName.Verbose, i18nString(UIStrings.dVerbose, {PH1: messageCount})]
    ]);
    return _groupPluralTitleMap.get(filterName) || '';
  }
  /**
   * @param {!ConsoleViewMessage} viewMessage
   */
  onMessageAdded(viewMessage) {
    const message = viewMessage.consoleMessage();
    const shouldIncrementCounter = message.type !== SDK.ConsoleModel.MessageType.Command &&
        message.type !== SDK.ConsoleModel.MessageType.Result && !message.isGroupMessage();
    if (!this._filter.shouldBeVisible(viewMessage) || !shouldIncrementCounter) {
      return;
    }
    const child = this._childElement(message.url);
    child.incrementAndUpdateCounter();
    this._messageCount++;
    this._updateCounter();
  }

  /**
   * @param {string=} url
   * @return {!URLGroupTreeElement}
   */
  _childElement(url) {
    const urlValue = url || null;
    let child = this._urlTreeElements.get(urlValue);
    if (child) {
      return child;
    }

    const filter = this._filter.clone();
    const parsedURL = urlValue ? Common.ParsedURL.ParsedURL.fromString(urlValue) : null;
    if (urlValue) {
      filter.name = parsedURL ? parsedURL.displayName : urlValue;
    } else {
      filter.name = i18nString(UIStrings.other);
    }
    filter.parsedFilters.push({key: FilterType.Url, text: urlValue, negative: false, regex: undefined});
    child = new URLGroupTreeElement(filter);
    if (urlValue) {
      child.tooltip = urlValue;
    }
    this._urlTreeElements.set(urlValue, child);
    this.appendChild(child);
    return child;
  }
}

/** @enum {string} */
const _groupName = {
  ConsoleAPI: 'user message',
  All: 'message',
  Error: 'error',
  Warning: 'warning',
  Info: 'info',
  Verbose: 'verbose'
};

/** @const {!Map<string, string>} */
const _groupSingularTitleMap = new Map([
  [_groupName.ConsoleAPI, i18nString(UIStrings.UserMessage)], [_groupName.All, i18nString(UIStrings.Message)],
  [_groupName.Error, i18nString(UIStrings.Error)], [_groupName.Warning, i18nString(UIStrings.Warning)],
  [_groupName.Info, i18nString(UIStrings.Info)], [_groupName.Verbose, i18nString(UIStrings.Verbose)]
]);

/** @const {!Map<string, string>} */
const _groupNoMessageTitleMap = new Map([
  [_groupName.ConsoleAPI, i18nString(UIStrings.noUserMessages)], [_groupName.All, i18nString(UIStrings.noMessages)],
  [_groupName.Error, i18nString(UIStrings.noErrors)], [_groupName.Warning, i18nString(UIStrings.noWarnings)],
  [_groupName.Info, i18nString(UIStrings.noInfo)], [_groupName.Verbose, i18nString(UIStrings.noVerbose)]
]);
