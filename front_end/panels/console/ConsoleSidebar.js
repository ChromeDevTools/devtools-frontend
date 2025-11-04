// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { ConsoleFilter, FilterType } from './ConsoleFilter.js';
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
};
const str_ = i18n.i18n.registerUIStrings('panels/console/ConsoleSidebar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const { render, html, nothing, Directives } = Lit;
const GROUP_ICONS = {
    ["message" /* GroupName.ALL */]: { icon: 'list', label: UIStrings.dMessages },
    ["user message" /* GroupName.CONSOLE_API */]: { icon: 'profile', label: UIStrings.dUserMessages },
    ["error" /* GroupName.ERROR */]: { icon: 'cross-circle', label: UIStrings.dErrors },
    ["warning" /* GroupName.WARNING */]: { icon: 'warning', label: UIStrings.dWarnings },
    ["info" /* GroupName.INFO */]: { icon: 'info', label: UIStrings.dInfo },
    ["verbose" /* GroupName.VERBOSE */]: { icon: 'bug', label: UIStrings.dVerbose },
};
export const DEFAULT_VIEW = (input, output, target) => {
    const nodeFilterMap = new WeakMap();
    const onSelectionChanged = (event) => {
        const filter = nodeFilterMap.get(event.detail);
        if (filter) {
            input.onSelectionChanged(filter);
        }
    };
    render(html `<devtools-tree
        navigation-variant
        hide-overflow
        @select=${onSelectionChanged}
        .template=${html `
          <ul role="tree">
            ${input.groups.map(group => html `
              <li
                role="treeitem"
                ${Directives.ref(element => element && nodeFilterMap.set(element, group.filter))}
                ?selected=${group.filter === input.selectedFilter}>
                  <style>${consoleSidebarStyles}</style>
                  <devtools-icon name=${GROUP_ICONS[group.name].icon}></devtools-icon>
                  ${
    /* eslint-disable-next-line @devtools/l10n-i18nString-call-only-with-uistrings */
    i18nString(GROUP_ICONS[group.name].label, {
        n: group.messageCount
    })}
                  ${group.messageCount === 0 ? nothing : html `
                  <ul role="group" hidden>
                    ${group.urlGroups.values().map(urlGroup => html `
                      <li
                        ${Directives.ref(element => element && nodeFilterMap.set(element, urlGroup.filter))}
                        role="treeitem"
                        ?selected=${urlGroup.filter === input.selectedFilter}
                        title=${urlGroup.url ?? ''}>
                          <devtools-icon name=document></devtools-icon>
                          ${urlGroup.filter.name} <span class=count>${urlGroup.count}</span>
                      </li>`)}
                  </ul>`}
              </li>`)}
        </ul>`}
        ></devtools-tree>`, target);
};
export class ConsoleFilterGroup {
    urlGroups = new Map();
    messageCount = 0;
    name;
    filter;
    constructor(name, parsedFilters, levelsMask) {
        this.name = name;
        this.filter = new ConsoleFilter(name, parsedFilters, null, levelsMask);
    }
    onMessage(viewMessage) {
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
    clear() {
        this.messageCount = 0;
        this.urlGroups.clear();
    }
    #getUrlGroup(url) {
        let child = this.urlGroups.get(url);
        if (child) {
            return child;
        }
        const filter = this.filter.clone();
        child = { filter, url, count: 0 };
        const parsedURL = url ? Common.ParsedURL.ParsedURL.fromString(url) : null;
        if (url) {
            filter.name = parsedURL ? parsedURL.displayName : url;
        }
        else {
            filter.name = i18nString(UIStrings.other);
        }
        filter.parsedFilters.push({ key: FilterType.Url, text: url, negative: false, regex: undefined });
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
export class ConsoleSidebar extends Common.ObjectWrapper.eventMixin(UI.Widget.VBox) {
    #view;
    #groups = [
        new ConsoleFilterGroup("message" /* GroupName.ALL */, [], ConsoleFilter.allLevelsFilterValue()),
        new ConsoleFilterGroup("user message" /* GroupName.CONSOLE_API */, CONSOLE_API_PARSED_FILTERS, ConsoleFilter.allLevelsFilterValue()),
        new ConsoleFilterGroup("error" /* GroupName.ERROR */, [], ConsoleFilter.singleLevelMask("error" /* Protocol.Log.LogEntryLevel.Error */)),
        new ConsoleFilterGroup("warning" /* GroupName.WARNING */, [], ConsoleFilter.singleLevelMask("warning" /* Protocol.Log.LogEntryLevel.Warning */)),
        new ConsoleFilterGroup("info" /* GroupName.INFO */, [], ConsoleFilter.singleLevelMask("info" /* Protocol.Log.LogEntryLevel.Info */)),
        new ConsoleFilterGroup("verbose" /* GroupName.VERBOSE */, [], ConsoleFilter.singleLevelMask("verbose" /* Protocol.Log.LogEntryLevel.Verbose */)),
    ];
    #selectedFilterSetting = Common.Settings.Settings.instance().createSetting('console.sidebar-selected-filter', null);
    #selectedFilter = this.#groups.find(group => group.name === this.#selectedFilterSetting.get())?.filter;
    constructor(element, view = DEFAULT_VIEW) {
        super(element, {
            jslog: `${VisualLogging.pane('sidebar').track({ resize: true })}`,
            useShadowDom: true,
        });
        this.#view = view;
        this.setMinimumSize(125, 0);
        this.performUpdate();
    }
    performUpdate() {
        const input = {
            groups: this.#groups,
            selectedFilter: this.#selectedFilter ?? this.#groups[0].filter,
            onSelectionChanged: filter => {
                this.#selectedFilter = filter;
                this.#selectedFilterSetting.set(filter.name);
                this.dispatchEventToListeners("FilterSelected" /* Events.FILTER_SELECTED */);
            },
        };
        this.#view(input, {}, this.contentElement);
    }
    clear() {
        for (const group of this.#groups) {
            group.clear();
        }
        this.requestUpdate();
    }
    onMessageAdded(viewMessage) {
        for (const group of this.#groups) {
            group.onMessage(viewMessage);
        }
        this.requestUpdate();
    }
    shouldBeVisible(viewMessage) {
        return this.#selectedFilter?.shouldBeVisible(viewMessage) ?? true;
    }
}
//# sourceMappingURL=ConsoleSidebar.js.map