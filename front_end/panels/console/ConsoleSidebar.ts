// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import type * as TextUtils from '../../models/text_utils/text_utils.js';
import * as UI from '../../ui/legacy/legacy.js';

import {ConsoleFilter, FilterType, type LevelsMask} from './ConsoleFilter.js';
import {type ConsoleViewMessage} from './ConsoleViewMessage.js';
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

export class ConsoleSidebar extends Common.ObjectWrapper.eventMixin<EventTypes, typeof UI.Widget.VBox>(UI.Widget.VBox) {
  private readonly tree: UI.TreeOutline.TreeOutlineInShadow;
  private selectedTreeElement: UI.TreeOutline.TreeElement|null;
  private readonly treeElements: FilterTreeElement[];

  constructor() {
    super(true);
    this.setMinimumSize(125, 0);

    this.tree = new UI.TreeOutline.TreeOutlineInShadow();
    this.tree.addEventListener(UI.TreeOutline.Events.ElementSelected, this.selectionChanged.bind(this));

    this.contentElement.appendChild(this.tree.element);
    this.selectedTreeElement = null;
    this.treeElements = [];
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
    this.appendGroup(
        GroupName.All, [], ConsoleFilter.allLevelsFilterValue(), UI.Icon.Icon.create('list'), selectedFilterSetting);
    this.appendGroup(
        GroupName.ConsoleAPI, consoleAPIParsedFilters, ConsoleFilter.allLevelsFilterValue(),
        UI.Icon.Icon.create('profile'), selectedFilterSetting);
    this.appendGroup(
        GroupName.Error, [], ConsoleFilter.singleLevelMask(Protocol.Log.LogEntryLevel.Error),
        UI.Icon.Icon.create('cross-circle'), selectedFilterSetting);
    this.appendGroup(
        GroupName.Warning, [], ConsoleFilter.singleLevelMask(Protocol.Log.LogEntryLevel.Warning),
        UI.Icon.Icon.create('warning'), selectedFilterSetting);
    this.appendGroup(
        GroupName.Info, [], ConsoleFilter.singleLevelMask(Protocol.Log.LogEntryLevel.Info), UI.Icon.Icon.create('info'),
        selectedFilterSetting);
    this.appendGroup(
        GroupName.Verbose, [], ConsoleFilter.singleLevelMask(Protocol.Log.LogEntryLevel.Verbose),
        UI.Icon.Icon.create('bug'), selectedFilterSetting);
    const selectedTreeElementName = selectedFilterSetting.get();
    const defaultTreeElement =
        this.treeElements.find(x => x.name() === selectedTreeElementName) || this.treeElements[0];
    defaultTreeElement.select();
  }

  private appendGroup(
      name: string, parsedFilters: TextUtils.TextUtils.ParsedFilter[], levelsMask: LevelsMask, icon: UI.Icon.Icon,
      selectedFilterSetting: Common.Settings.Setting<string>): void {
    const filter = new ConsoleFilter(name, parsedFilters, null, levelsMask);
    const treeElement = new FilterTreeElement(filter, icon, selectedFilterSetting);
    this.tree.appendChild(treeElement);
    this.treeElements.push(treeElement);
  }

  clear(): void {
    for (const treeElement of this.treeElements) {
      treeElement.clear();
    }
  }

  onMessageAdded(viewMessage: ConsoleViewMessage): void {
    for (const treeElement of this.treeElements) {
      treeElement.onMessageAdded(viewMessage);
    }
  }

  shouldBeVisible(viewMessage: ConsoleViewMessage): boolean {
    if (this.selectedTreeElement instanceof ConsoleSidebarTreeElement) {
      return this.selectedTreeElement.filter().shouldBeVisible(viewMessage);
    }
    return true;
  }

  private selectionChanged(event: Common.EventTarget.EventTargetEvent<UI.TreeOutline.TreeElement>): void {
    this.selectedTreeElement = event.data;
    this.dispatchEventToListeners(Events.FilterSelected);
  }

  override wasShown(): void {
    super.wasShown();
    this.tree.registerCSSFiles([consoleSidebarStyles]);
  }
}

export const enum Events {
  FilterSelected = 'FilterSelected',
}

export type EventTypes = {
  [Events.FilterSelected]: void,
};

class ConsoleSidebarTreeElement extends UI.TreeOutline.TreeElement {
  protected filterInternal: ConsoleFilter;

  constructor(title: string|Node, filter: ConsoleFilter) {
    super(title);
    this.filterInternal = filter;
  }

  filter(): ConsoleFilter {
    return this.filterInternal;
  }
}

export class URLGroupTreeElement extends ConsoleSidebarTreeElement {
  private countElement: HTMLElement;
  private messageCount: number;

  constructor(filter: ConsoleFilter) {
    super(filter.name, filter);
    this.countElement = this.listItemElement.createChild('span', 'count');
    const leadingIcons = [UI.Icon.Icon.create('document')];
    this.setLeadingIcons(leadingIcons);
    this.messageCount = 0;
  }

  incrementAndUpdateCounter(): void {
    this.messageCount++;
    this.countElement.textContent = `${this.messageCount}`;
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
  private readonly selectedFilterSetting: Common.Settings.Setting<string>;
  private readonly urlTreeElements: Map<string|null, URLGroupTreeElement>;
  private messageCount: number;
  private uiStringForFilterCount: string;

  constructor(filter: ConsoleFilter, icon: UI.Icon.Icon, selectedFilterSetting: Common.Settings.Setting<string>) {
    super(filter.name, filter);
    this.uiStringForFilterCount = stringForFilterSidebarItemMap.get(filter.name as GroupName) || '';
    this.selectedFilterSetting = selectedFilterSetting;
    this.urlTreeElements = new Map();
    this.setLeadingIcons([icon]);
    this.messageCount = 0;
    this.updateCounter();
  }

  clear(): void {
    this.urlTreeElements.clear();
    this.removeChildren();
    this.messageCount = 0;
    this.updateCounter();
  }

  name(): string {
    return this.filterInternal.name;
  }

  override onselect(selectedByUser?: boolean): boolean {
    this.selectedFilterSetting.set(this.filterInternal.name);
    return super.onselect(selectedByUser);
  }

  private updateCounter(): void {
    this.title = this.updateGroupTitle(this.messageCount);
    this.setExpandable(Boolean(this.childCount()));
  }

  private updateGroupTitle(messageCount: number): string {
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
    if (!this.filterInternal.shouldBeVisible(viewMessage) || !shouldIncrementCounter) {
      return;
    }
    const child = this.childElement(message.url);
    child.incrementAndUpdateCounter();
    this.messageCount++;
    this.updateCounter();
  }

  private childElement(url?: Platform.DevToolsPath.UrlString): URLGroupTreeElement {
    const urlValue = url || null;
    let child = this.urlTreeElements.get(urlValue);
    if (child) {
      return child;
    }

    const filter = this.filterInternal.clone();
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
    this.urlTreeElements.set(urlValue, child);
    this.appendChild(child);
    return child;
  }
}
