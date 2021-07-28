// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import type * as TextUtils from '../../models/text_utils/text_utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ConsoleComponents from './components/components.js';

import type {LevelsMask} from './ConsoleFilter.js';
import {ConsoleFilter, FilterType} from './ConsoleFilter.js';
import type {ConsoleViewMessage} from './ConsoleViewMessage.js';
import consoleSidebarStyles from './consoleSidebar.css.js';

const UIStrings = {
  /**
  * @description Filter name in Console Sidebar of the Console panel. This is shown when we fail to
  * parse a URL when trying to display console messages from each URL separately. This might be
  * because the console message does not come from any particular URL. This should be translated as
  * a term that indicates 'not one of the other URLs listed here'.
  */
  other: '<other>',
  /**
  *@description Text in Console Sidebar of the Console panel to show how many user messages exist.
  */
  dUserMessages: '{n, plural, =0 {No user messages} =1 {# user message} other {# user messages}}',
  /**
  *@description Text in Console Sidebar of the Console panel to show how many messages exist.
  */
  dMessages: '{n, plural, =0 {No messages} =1 {# message} other {# messages}}',
  /**
  *@description Text in Console Sidebar of the Console panel to show how many errors exist.
  */
  dErrors: '{n, plural, =0 {No errors} =1 {# error} other {# errors}}',
  /**
  *@description Text in Console Sidebar of the Console panel to show how many warnings exist.
  */
  dWarnings: '{n, plural, =0 {No warnings} =1 {# warning} other {# warnings}}',
  /**
  *@description Text in Console Sidebar of the Console panel to show how many info messages exist.
  */
  dInfo: '{n, plural, =0 {No info} =1 {# info} other {# info}}',
  /**
  *@description Text in Console Sidebar of the Console panel to show how many verbose messages exist.
  */
  dVerbose: '{n, plural, =0 {No verbose} =1 {# verbose} other {# verbose}}',
};
const str_ = i18n.i18n.registerUIStrings('panels/console/ConsoleSidebar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class ConsoleSidebar extends UI.Widget.VBox {
  _tree: UI.TreeOutline.TreeOutlineInShadow;
  _selectedTreeElement: UI.TreeOutline.TreeElement|null;
  _treeElements: FilterTreeElement[];

  constructor() {
    super(true);
    this.setMinimumSize(125, 0);

    this._tree = new UI.TreeOutline.TreeOutlineInShadow();
    this._tree.addEventListener(UI.TreeOutline.Events.ElementSelected, this._selectionChanged.bind(this));

    const deprecationWarning = new ConsoleComponents.SidebarDeprecation.SidebarDeprecation();
    this.contentElement.appendChild(deprecationWarning);
    this.contentElement.appendChild(this._tree.element);
    this._selectedTreeElement = null;
    this._treeElements = [];
    const selectedFilterSetting =
        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
        // @ts-expect-error
        Common.Settings.Settings.instance().createSetting<string>('console.sidebarSelectedFilter', null);

    const consoleAPIParsedFilters = [{
      key: FilterType.Source,
      text: SDK.ConsoleModel.FrontendMessageSource.ConsoleAPI,
      negative: false,
      regex: undefined,
    }];
    this._appendGroup(
        GroupName.All, [], ConsoleFilter.allLevelsFilterValue(), UI.Icon.Icon.create('mediumicon-list'),
        selectedFilterSetting);
    this._appendGroup(
        GroupName.ConsoleAPI, consoleAPIParsedFilters, ConsoleFilter.allLevelsFilterValue(),
        UI.Icon.Icon.create('mediumicon-account-circle'), selectedFilterSetting);
    this._appendGroup(
        GroupName.Error, [], ConsoleFilter.singleLevelMask(Protocol.Log.LogEntryLevel.Error),
        UI.Icon.Icon.create('mediumicon-error-circle'), selectedFilterSetting);
    this._appendGroup(
        GroupName.Warning, [], ConsoleFilter.singleLevelMask(Protocol.Log.LogEntryLevel.Warning),
        UI.Icon.Icon.create('mediumicon-warning-triangle'), selectedFilterSetting);
    this._appendGroup(
        GroupName.Info, [], ConsoleFilter.singleLevelMask(Protocol.Log.LogEntryLevel.Info),
        UI.Icon.Icon.create('mediumicon-info-circle'), selectedFilterSetting);
    this._appendGroup(
        GroupName.Verbose, [], ConsoleFilter.singleLevelMask(Protocol.Log.LogEntryLevel.Verbose),
        UI.Icon.Icon.create('mediumicon-bug'), selectedFilterSetting);
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

  wasShown(): void {
    super.wasShown();
    this._tree.registerCSSFiles([consoleSidebarStyles]);
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

/**
 * Maps the GroupName for a filter to the UIString used to render messages.
 * Stored here so we only construct it once at runtime, rather than everytime we
 * construct a filter or get a new message.
 */
const stringForFilterSidebarItemMap = new Map<GroupName, string>([
  [GroupName.ConsoleAPI, UIStrings.dUserMessages],
  [GroupName.All, UIStrings.dMessages],
  [GroupName.Error, UIStrings.dErrors],
  [GroupName.Warning, UIStrings.dWarnings],
  [GroupName.Info, UIStrings.dInfo],
  [GroupName.Verbose, UIStrings.dVerbose],
]);

export class FilterTreeElement extends ConsoleSidebarTreeElement {
  _selectedFilterSetting: Common.Settings.Setting<string>;
  _urlTreeElements: Map<string|null, URLGroupTreeElement>;
  _messageCount: number;
  private uiStringForFilterCount: string;

  constructor(filter: ConsoleFilter, icon: UI.Icon.Icon, selectedFilterSetting: Common.Settings.Setting<string>) {
    super(filter.name, filter);
    this.uiStringForFilterCount = stringForFilterSidebarItemMap.get(filter.name as GroupName) || '';
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
    this.title = this._updateGroupTitle(this._messageCount);
    this.setExpandable(Boolean(this.childCount()));
  }

  _updateGroupTitle(messageCount: number): string {
    if (this.uiStringForFilterCount) {
      // eslint-disable-next-line rulesdir/l10n_i18nString_call_only_with_uistrings
      return i18nString(this.uiStringForFilterCount, {n: messageCount});
    }
    return '';
  }

  onMessageAdded(viewMessage: ConsoleViewMessage): void {
    const message = viewMessage.consoleMessage();
    const shouldIncrementCounter = message.type !== SDK.ConsoleModel.FrontendMessageType.Command &&
        message.type !== SDK.ConsoleModel.FrontendMessageType.Result && !message.isGroupMessage();
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
