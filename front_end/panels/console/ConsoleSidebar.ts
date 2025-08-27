// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import type * as TextUtils from '../../models/text_utils/text_utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {ConsoleFilter, FilterType, type LevelsMask} from './ConsoleFilter.js';
import consoleSidebarStyles from './consoleSidebar.css.js';
import type {ConsoleViewMessage} from './ConsoleViewMessage.js';

const UIStrings = {
  /**
   * @description Filter name in Console Sidebar of the Console panel. This is shown when we fail to
   * parse a URL when trying to display console messages from each URL separately. This might be
   * because the console message does not come from any particular URL. This should be translated as
   * a term that indicates 'not one of the other URLs listed here'.
   */
  other: '<other>',
  /**
   * @description Text in Console Sidebar of the Console panel to show how many user messages exist.
   */
  dUserMessages: '{n, plural, =0 {No user messages} =1 {# user message} other {# user messages}}',
  /**
   * @description Text in Console Sidebar of the Console panel to show how many messages exist.
   */
  dMessages: '{n, plural, =0 {No messages} =1 {# message} other {# messages}}',
  /**
   * @description Text in Console Sidebar of the Console panel to show how many errors exist.
   */
  dErrors: '{n, plural, =0 {No errors} =1 {# error} other {# errors}}',
  /**
   * @description Text in Console Sidebar of the Console panel to show how many warnings exist.
   */
  dWarnings: '{n, plural, =0 {No warnings} =1 {# warning} other {# warnings}}',
  /**
   * @description Text in Console Sidebar of the Console panel to show how many info messages exist.
   */
  dInfo: '{n, plural, =0 {No info} =1 {# info} other {# info}}',
  /**
   * @description Text in Console Sidebar of the Console panel to show how many verbose messages exist.
   */
  dVerbose: '{n, plural, =0 {No verbose} =1 {# verbose} other {# verbose}}',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/console/ConsoleSidebar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const {render, html, nothing, Directives} = Lit;

const enum GroupName {
  CONSOLE_API = 'user message',
  ALL = 'message',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  VERBOSE = 'verbose',
}

const GROUP_ICONS = {
  [GroupName.ALL]: {icon: 'list', label: UIStrings.dMessages},
  [GroupName.CONSOLE_API]: {icon: 'profile', label: UIStrings.dUserMessages},
  [GroupName.ERROR]: {icon: 'cross-circle', label: UIStrings.dErrors},
  [GroupName.WARNING]: {icon: 'warning', label: UIStrings.dWarnings},
  [GroupName.INFO]: {icon: 'info', label: UIStrings.dInfo},
  [GroupName.VERBOSE]: {icon: 'bug', label: UIStrings.dVerbose},
};

interface ViewInput {
  groups: ConsoleFilterGroup[];
  selectedFilter: ConsoleFilter;
  onSelectionChanged: (selectedFilter: ConsoleFilter) => void;
}

export type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export const DEFAULT_VIEW: View = (input, output, target) => {
  const nodeFilterMap = new WeakMap<Element, ConsoleFilter>();
  const onSelectionChanged = (event: UI.TreeOutline.TreeViewElement.SelectEvent): void => {
    const filter = nodeFilterMap.get(event.detail);
    if (filter) {
      input.onSelectionChanged(filter);
    }
  };
  render(
      html`<devtools-tree
        navigation-variant
        hide-overflow
        @select=${onSelectionChanged}
        .template=${
          html`
          <ul role="tree">
            ${
              input.groups.map(
                  group => html`
              <li
                role="treeitem"
                ${Directives.ref(element => element && nodeFilterMap.set(element, group.filter))}
                ?selected=${group.filter === input.selectedFilter}>
                  <style>${consoleSidebarStyles}</style>
                  <devtools-icon name=${GROUP_ICONS[group.name].icon}></devtools-icon>
                  ${
                      /* eslint-disable-next-line rulesdir/l10n-i18nString-call-only-with-uistrings */
                      i18nString(GROUP_ICONS[group.name].label, {

                        n: group.messageCount
                      })}
                  ${group.messageCount === 0 ? nothing : html`
                  <ul role="group" ?hidden=${group.filter !== input.selectedFilter}>
                    ${group.urlGroups.values().map(urlGroup => html`
                      <li
                        ${Directives.ref(element => element && nodeFilterMap.set(element, group.filter))}
                        role="treeitem"
                        ?selected=${urlGroup.filter === input.selectedFilter}
                        title=${urlGroup.url ?? ''}>
                          <devtools-icon name=document></devtools-icon>
                          ${urlGroup.filter.name} <span class=count>${urlGroup.count}</span>
                      </li>`)}
                  </ul>`}
              </li>`)}
        </ul>`}
        ></devtools-tree>`,
      target);
};

class ConsoleFilterGroup {
  readonly urlGroups = new Map<string|null, {filter: ConsoleFilter, url: string|null, count: number}>();
  messageCount = 0;
  readonly name: GroupName;
  readonly filter: ConsoleFilter;
  constructor(name: GroupName, parsedFilters: TextUtils.TextUtils.ParsedFilter[], levelsMask: LevelsMask) {
    this.name = name;
    this.filter = new ConsoleFilter(name, parsedFilters, null, levelsMask);
  }

  onMessage(viewMessage: ConsoleViewMessage): void {
    const message = viewMessage.consoleMessage();
    const shouldIncrementCounter = message.type !== SDK.ConsoleModel.FrontendMessageType.Command &&
        message.type !== SDK.ConsoleModel.FrontendMessageType.Result && !message.isGroupMessage();
    if (!this.filter.shouldBeVisible(viewMessage) || !shouldIncrementCounter) {
      return;
    }
    const child = this.#getUrlGroup(message.url || null);
    child.count++;
    this.messageCount++;
  }

  clear(): void {
    this.messageCount = 0;
    this.urlGroups.clear();
  }

  #getUrlGroup(url: string|null): {filter: ConsoleFilter, url: string|null, count: number} {
    let child = this.urlGroups.get(url);
    if (child) {
      return child;
    }

    const filter = this.filter.clone();
    child = {filter, url, count: 0};
    const parsedURL = url ? Common.ParsedURL.ParsedURL.fromString(url) : null;
    if (url) {
      filter.name = parsedURL ? parsedURL.displayName : url;
    } else {
      filter.name = i18nString(UIStrings.other);
    }
    filter.parsedFilters.push({key: FilterType.Url, text: url, negative: false, regex: undefined});

    this.urlGroups.set(url, child);
    return child;
  }
}

const CONSOLE_API_PARSED_FILTERS = [{
  key: FilterType.Source,
  text: Common.Console.FrontendMessageSource.ConsoleAPI,
  negative: false,
  regex: undefined,
}];

export class ConsoleSidebar extends Common.ObjectWrapper.eventMixin<EventTypes, typeof UI.Widget.VBox>(UI.Widget.VBox) {
  #view: View;
  readonly #groups = [
    new ConsoleFilterGroup(GroupName.ALL, [], ConsoleFilter.allLevelsFilterValue()),
    new ConsoleFilterGroup(GroupName.CONSOLE_API, CONSOLE_API_PARSED_FILTERS, ConsoleFilter.allLevelsFilterValue()),
    new ConsoleFilterGroup(GroupName.ERROR, [], ConsoleFilter.singleLevelMask(Protocol.Log.LogEntryLevel.Error)),
    new ConsoleFilterGroup(GroupName.WARNING, [], ConsoleFilter.singleLevelMask(Protocol.Log.LogEntryLevel.Warning)),
    new ConsoleFilterGroup(GroupName.INFO, [], ConsoleFilter.singleLevelMask(Protocol.Log.LogEntryLevel.Info)),
    new ConsoleFilterGroup(GroupName.VERBOSE, [], ConsoleFilter.singleLevelMask(Protocol.Log.LogEntryLevel.Verbose)),
  ];
  readonly #selectedFilterSetting =
      Common.Settings.Settings.instance().createSetting<string|null>('console.sidebar-selected-filter', null);
  #selectedFilter = this.#groups.find(group => group.name === this.#selectedFilterSetting.get())?.filter;

  constructor(element?: HTMLElement, view = DEFAULT_VIEW) {
    super(element, {
      jslog: `${VisualLogging.pane('sidebar').track({resize: true})}`,
      useShadowDom: true,
    });
    this.#view = view;
    this.setMinimumSize(125, 0);

    this.performUpdate();
  }

  override performUpdate(): void {
    const input: ViewInput = {
      groups: this.#groups,
      selectedFilter: this.#selectedFilter ?? this.#groups[0].filter,
      onSelectionChanged: filter => {
        this.#selectedFilter = filter;
        this.#selectedFilterSetting.set(filter.name);
        this.dispatchEventToListeners(Events.FILTER_SELECTED);
      },
    };
    this.#view(input, {}, this.contentElement);
  }

  clear(): void {
    for (const group of this.#groups) {
      group.clear();
    }
    this.requestUpdate();
  }

  onMessageAdded(viewMessage: ConsoleViewMessage): void {
    for (const group of this.#groups) {
      group.onMessage(viewMessage);
    }
    this.requestUpdate();
  }

  shouldBeVisible(viewMessage: ConsoleViewMessage): boolean {
    return this.#selectedFilter?.shouldBeVisible(viewMessage) ?? true;
  }
}

export const enum Events {
  FILTER_SELECTED = 'FilterSelected',
}

export interface EventTypes {
  [Events.FILTER_SELECTED]: void;
}
