// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as SDK from '../sdk/sdk.js';
import type * as TextUtils from '../text_utils/text_utils.js';
import * as UI from '../ui/ui.js';

import {ConsoleFilter, FilterType, LevelsMask} from './ConsoleFilter.js';
import type {ConsoleViewMessage} from './ConsoleViewMessage.js';

export const UIStrings = {
  /**
  * @description Filter name in Console Sidebar of the Console panel. This is shown when we fail to
  * parse a URL when trying to display console messages from each URL separately. This might be
  * because the console message does not come from any particular URL. This should be translated as
  * a term that indicates 'not one of the other URLs listed here'.
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
const str_ = i18n.i18n.registerUIStrings('console/ConsoleSidebar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ConsoleSidebar extends UI.Widget.VBox {
  _tree: UI.TreeOutline.TreeOutlineInShadow;
  _selectedTreeElement: UI.TreeOutline.TreeElement|null;
  _treeElements: FilterTreeElement[];

  constructor() {
    super(true);
    this.setMinimumSize(125, 0);

    this._tree = new UI.TreeOutline.TreeOutlineInShadow();
    this._tree.registerRequiredCSS('console/consoleSidebar.css', {enableLegacyPatching: true});
    this._tree.addEventListener(UI.TreeOutline.Events.ElementSelected, this._selectionChanged.bind(this));
    this.contentElement.appendChild(this._tree.element);
    this._selectedTreeElement = null;
    this._treeElements = [];
    const selectedFilterSetting: Common.Settings.Setting<string> =
        Common.Settings.Settings.instance().createSetting('console.sidebarSelectedFilter', null);

    const Levels = SDK.ConsoleModel.MessageLevel;
    const consoleAPIParsedFilters =
        [{key: FilterType.Source, text: SDK.ConsoleModel.MessageSource.ConsoleAPI, negative: false, regex: undefined}];
    this._appendGroup(
        GroupName.All, [], ConsoleFilter.allLevelsFilterValue(), UI.Icon.Icon.create('mediumicon-list'),
        selectedFilterSetting);
    this._appendGroup(
        GroupName.ConsoleAPI, consoleAPIParsedFilters, ConsoleFilter.allLevelsFilterValue(),
        UI.Icon.Icon.create('mediumicon-account-circle'), selectedFilterSetting);
    this._appendGroup(
        GroupName.Error, [], ConsoleFilter.singleLevelMask(Levels.Error),
        UI.Icon.Icon.create('mediumicon-error-circle'), selectedFilterSetting);
    this._appendGroup(
        GroupName.Warning, [], ConsoleFilter.singleLevelMask(Levels.Warning),
        UI.Icon.Icon.create('mediumicon-warning-triangle'), selectedFilterSetting);
    this._appendGroup(
        GroupName.Info, [], ConsoleFilter.singleLevelMask(Levels.Info), UI.Icon.Icon.create('mediumicon-info-circle'),
        selectedFilterSetting);
    this._appendGroup(
        GroupName.Verbose, [], ConsoleFilter.singleLevelMask(Levels.Verbose), UI.Icon.Icon.create('mediumicon-bug'),
        selectedFilterSetting);
    const selectedTreeElementName = selectedFilterSetting.get();
    const defaultTreeElement =
        this._treeElements.find(x => x.name() === selectedTreeElementName) || this._treeElements[0];
    defaultTreeElement.select();
  }

  _appendGroup(
      name: string, parsedFilters: TextUtils.TextUtils.ParsedFilter[], levelsMask: LevelsMask, icon: UI.Icon.Icon,
      selectedFilterSetting: Common.Settings.Setting<string>): void {
    const filter = new ConsoleFilter(name, parsedFilters, null, levelsMask);
    const treeElement = new FilterTreeElement(filter, icon, selectedFilterSetting);
    this._tree.appendChild(treeElement);
    this._treeElements.push(treeElement);
  }

  clear(): void {
    for (const treeElement of this._treeElements) {
      treeElement.clear();
    }
  }

  onMessageAdded(viewMessage: ConsoleViewMessage): void {
    for (const treeElement of this._treeElements) {
      treeElement.onMessageAdded(viewMessage);
    }
  }

  shouldBeVisible(viewMessage: ConsoleViewMessage): boolean {
    if (this._selectedTreeElement instanceof ConsoleSidebarTreeElement) {
      return this._selectedTreeElement.filter().shouldBeVisible(viewMessage);
    }
    return true;
  }

  _selectionChanged(event: Common.EventTarget.EventTargetEvent): void {
    this._selectedTreeElement = (event.data as UI.TreeOutline.TreeElement);
    this.dispatchEventToListeners(Events.FilterSelected);
  }
}

export const enum Events {
  FilterSelected = 'FilterSelected',
}

class ConsoleSidebarTreeElement extends UI.TreeOutline.TreeElement {
  _filter: ConsoleFilter;

  constructor(title: string|Node, filter: ConsoleFilter) {
    super(title);
    this._filter = filter;
  }

  filter(): ConsoleFilter {
    return this._filter;
  }
}

export class URLGroupTreeElement extends ConsoleSidebarTreeElement {
  _countElement: HTMLElement;
  _messageCount: number;

  constructor(filter: ConsoleFilter) {
    super(filter.name, filter);
    this._countElement = this.listItemElement.createChild('span', 'count');
    const leadingIcons = [UI.Icon.Icon.create('largeicon-navigator-file')];
    this.setLeadingIcons(leadingIcons);
    this._messageCount = 0;
  }

  incrementAndUpdateCounter(): void {
    this._messageCount++;
    this._countElement.textContent = `${this._messageCount}`;
  }
}

export class FilterTreeElement extends ConsoleSidebarTreeElement {
  _selectedFilterSetting: Common.Settings.Setting<string>;
  _urlTreeElements: Map<string|null, URLGroupTreeElement>;
  _messageCount: number;

  constructor(filter: ConsoleFilter, icon: UI.Icon.Icon, selectedFilterSetting: Common.Settings.Setting<string>) {
    super(filter.name, filter);
    this._selectedFilterSetting = selectedFilterSetting;
    this._urlTreeElements = new Map();
    this.setLeadingIcons([icon]);
    this._messageCount = 0;
    this._updateCounter();
  }

  clear(): void {
    this._urlTreeElements.clear();
    this.removeChildren();
    this._messageCount = 0;
    this._updateCounter();
  }

  name(): string {
    return this._filter.name;
  }

  onselect(selectedByUser?: boolean): boolean {
    this._selectedFilterSetting.set(this._filter.name);
    return super.onselect(selectedByUser);
  }

  _updateCounter(): void {
    if (!this._messageCount) {
      this.title = groupNoMessageTitleMap.get(this._filter.name) || '';
    } else if (this._messageCount === 1) {
      this.title = groupSingularTitleMap.get(this._filter.name) || '';
    } else {
      this.title = this._updatePluralTitle(this._filter.name, this._messageCount);
    }

    this.setExpandable(Boolean(this.childCount()));
  }

  _updatePluralTitle(filterName: string, messageCount: number): string {
    const groupPluralTitleMap = new Map([
      [GroupName.ConsoleAPI, i18nString(UIStrings.dUserMessages, {PH1: messageCount})],
      [GroupName.All, i18nString(UIStrings.dMessages, {PH1: messageCount})],
      [GroupName.Error, i18nString(UIStrings.dErrors, {PH1: messageCount})],
      [GroupName.Warning, i18nString(UIStrings.dWarnings, {PH1: messageCount})],
      [GroupName.Info, i18nString(UIStrings.dInfo, {PH1: messageCount})],
      [GroupName.Verbose, i18nString(UIStrings.dVerbose, {PH1: messageCount})],
    ]);
    return groupPluralTitleMap.get(filterName as GroupName) || '';
  }
  onMessageAdded(viewMessage: ConsoleViewMessage): void {
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

  _childElement(url?: string): URLGroupTreeElement {
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

const enum GroupName {
  ConsoleAPI = 'user message',
  All = 'message',
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
  Verbose = 'verbose',
}

const groupSingularTitleMap = new Map<string, string>([
  [GroupName.ConsoleAPI, i18nString(UIStrings.UserMessage)],
  [GroupName.All, i18nString(UIStrings.Message)],
  [GroupName.Error, i18nString(UIStrings.Error)],
  [GroupName.Warning, i18nString(UIStrings.Warning)],
  [GroupName.Info, i18nString(UIStrings.Info)],
  [GroupName.Verbose, i18nString(UIStrings.Verbose)],
]);

const groupNoMessageTitleMap = new Map<string, string>([
  [GroupName.ConsoleAPI, i18nString(UIStrings.noUserMessages)],
  [GroupName.All, i18nString(UIStrings.noMessages)],
  [GroupName.Error, i18nString(UIStrings.noErrors)],
  [GroupName.Warning, i18nString(UIStrings.noWarnings)],
  [GroupName.Info, i18nString(UIStrings.noInfo)],
  [GroupName.Verbose, i18nString(UIStrings.noVerbose)],
]);
