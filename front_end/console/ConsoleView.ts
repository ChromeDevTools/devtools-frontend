// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/* eslint-disable rulesdir/no_underscored_properties */

import * as Bindings from '../bindings/bindings.js';
import * as BrowserSDK from '../browser_sdk/browser_sdk.js';
import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as Host from '../host/host.js';
import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as UIComponents from '../ui/components/components.js';
import * as UI from '../ui/ui.js';

import {ConsoleContextSelector} from './ConsoleContextSelector.js';
import {ConsoleFilter, FilterType, LevelsMask} from './ConsoleFilter.js';
import {ConsolePinPane} from './ConsolePinPane.js';
import {ConsolePrompt, Events as ConsolePromptEvents} from './ConsolePrompt.js';
import {ConsoleSidebar, Events} from './ConsoleSidebar.js';
import {ConsoleCommand, ConsoleCommandResult, ConsoleGroupViewMessage, ConsoleTableMessageView, ConsoleViewMessage, getMessageForElement, MaxLengthForLinks} from './ConsoleViewMessage.js';

import type {ConsoleViewportElement, ConsoleViewportProvider} from './ConsoleViewport.js';
import {ConsoleViewport} from './ConsoleViewport.js';

export const UIStrings = {
  /**
  *@description Label for link to issues tab
  */
  viewIssues: 'View issues',
  /**
  *@description Label for link to issues tab
  */
  noIssue: 'No Issues',
  /**
  *@description Label for link to issues tab
  */
  oneIssue: '1 Issue',
  /**
  *@description Label for link to issues tab
  *@example {13} issueCount
  */
  multipleIssues: '{issueCount} Issues',
  /**
  *@description Text for the tooltip of the issue counter toolbar item
  */
  issueToolbarTooltipGeneral: 'Some problems no longer generate console messages, but are surfaced in the issues tab.',
  /**
   *@description Text for the tooltip of the issue counter toolbar item
   */
  issueToolbarTooltipHaveNoIssues: 'Click to go to the issues tab.',
  /**
  *@description Text for the tooltip of the issue counter toolbar item
  */
  issueToolbarTooltipHaveOneIssues: 'Click to view 1 issue',
  /**
  *@description Text for the tooltip of the issue counter toolbar item
  *@example {12} issueCount
  */
  issueToolbarTooltipHaveMultipleIssues: 'Click to view {issueCount} issues',
  /**
  *@description Infobar text about messages being on the issues tab
  */
  someMessagesHaveBeenMovedToThe: 'Some messages have been moved to the Issues panel.',
  /**
  *@description Text in Console View of the Console panel
  */
  findStringInLogs: 'Find string in logs',
  /**
  *@description Tooltip text that appears when hovering over the largeicon settings gear in show settings pane setting in console view of the console panel
  */
  consoleSettings: 'Console settings',
  /**
  *@description Title of a setting under the Console category that can be invoked through the Command Menu
  */
  groupSimilarMessagesInConsole: 'Group similar messages in console',
  /**
  * @description Tooltip for the the console sidebar toggle in the Console panel. Command to
  * open/show the sidebar.
  */
  showConsoleSidebar: 'Show console sidebar',
  /**
  * @description Tooltip for the the console sidebar toggle in the Console panel. Command to
  * open/show the sidebar.
  */
  hideConsoleSidebar: 'Hide console sidebar',
  /**
  *@description Tooltip text that appears on the setting to preserve log when hovering over the item
  */
  doNotClearLogOnPageReload: 'Do not clear log on page reload / navigation',
  /**
  *@description Text to preserve the log after refreshing
  */
  preserveLog: 'Preserve log',
  /**
  *@description Text in Console View of the Console panel
  */
  hideNetwork: 'Hide network',
  /**
  *@description Tooltip text that appears on the setting when hovering over it in Console View of the Console panel
  */
  onlyShowMessagesFromTheCurrentContext:
      'Only show messages from the current context (`top`, `iframe`, `worker`, extension)',
  /**
  *@description Alternative title text of a setting in Console View of the Console panel
  */
  selectedContextOnly: 'Selected context only',
  /**
  *@description Tooltip text that appears on the setting when hovering over it in Console View of the Console panel
  */
  eagerlyEvaluateTextInThePrompt: 'Eagerly evaluate text in the prompt',
  /**
  * @description Text in Console View of the Console panel, indicating that a number of console
  * messages have been hidden.
  * @example {3} PH1
  */
  sHidden: '{PH1} hidden',
  /**
  *@description Alert message for screen readers when the console is cleared
  */
  consoleCleared: 'Console cleared',
  /**
  *@description Text in Console View of the Console panel
  *@example {index.js} PH1
  */
  hideMessagesFromS: 'Hide messages from {PH1}',
  /**
  *@description Text to save content as a specific file type
  */
  saveAs: 'Save as...',
  /**
  *@description A context menu item in the Console View of the Console panel
  */
  copyVisibleStyledSelection: 'Copy visible styled selection',
  /**
  *@description Text to replay an XHR request
  */
  replayXhr: 'Replay XHR',
  /**
  *@description Text to indicate DevTools is writing to a file
  */
  writingFile: 'Writing file…',
  /**
  *@description Text to indicate the searching is in progress
  */
  searching: 'Searching…',
  /**
  *@description Text to filter result items
  */
  filter: 'Filter',
  /**
  *@description Text in Console View of the Console panel
  */
  egEventdCdnUrlacom: 'e.g. `/event\d/ -cdn url:a.com`',
  /**
  *@description Sdk console message message level verbose of level Labels in Console View of the Console panel
  */
  verbose: 'Verbose',
  /**
  *@description Sdk console message message level info of level Labels in Console View of the Console panel
  */
  info: 'Info',
  /**
  *@description Sdk console message message level warning of level Labels in Console View of the Console panel
  */
  warnings: 'Warnings',
  /**
  *@description Text for errors
  */
  errors: 'Errors',
  /**
  *@description Text in Console View of the Console panel
  */
  logLevels: 'Log levels',
  /**
  *@description Title text of a setting in Console View of the Console panel
  */
  overriddenByFilterSidebar: 'Overridden by filter sidebar',
  /**
  *@description Text in Console View of the Console panel
  */
  customLevels: 'Custom levels',
  /**
  *@description Text in Console View of the Console panel
  *@example {Warnings} PH1
  */
  sOnly: '{PH1} only',
  /**
  *@description Text in Console View of the Console panel
  */
  allLevels: 'All levels',
  /**
  *@description Text in Console View of the Console panel
  */
  defaultLevels: 'Default levels',
  /**
  *@description Text in Console View of the Console panel
  */
  hideAll: 'Hide all',
  /**
  *@description Title of level menu button in console view of the console panel
  *@example {All levels} PH1
  */
  logLevelS: 'Log level: {PH1}',
  /**
  *@description A context menu item in the Console View of the Console panel
  */
  default: 'Default',
};
const str_ = i18n.i18n.registerUIStrings('console/ConsoleView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let consoleViewInstance: ConsoleView;

/**
 * This is a proper `ConsoleViewportElement` for the issue banner which can be inserted into the
 * `ConsoleViewport`. To make it play nicely, it is fakes being {ConsoleViewMessage} by implementing
 * `fastHeight` and `toExportString`.
 */
class IssueMessage implements ConsoleViewportElement {
  _cachedIssueBarHeight: number;
  _issueBar: UI.Infobar.Infobar|null;

  constructor() {
    this._cachedIssueBarHeight = 0;
    this._issueBar = null;
  }

  willHide(): void {
    this._cachedIssueBarHeight = this._issueBar && this._issueBar.element.offsetHeight || 0;
  }

  wasShown(): void {
  }

  element(): HTMLElement {
    if (!this._issueBar) {
      const issueBarAction = ({
        text: i18nString(UIStrings.viewIssues),
        highlight: false,
        delegate: (): void => {
          Host.userMetrics.issuesPanelOpenedFrom(Host.UserMetrics.IssueOpener.ConsoleInfoBar);
          UI.ViewManager.ViewManager.instance().showView('issues-pane');
        },
        dismiss: false,
      } as UI.Infobar.InfobarAction);
      this._issueBar = new UI.Infobar.Infobar(
          UI.Infobar.Type.Issue, i18nString(UIStrings.someMessagesHaveBeenMovedToThe), [issueBarAction]);
      this._issueBar.element.tabIndex = -1;
      this._issueBar.element.classList.add('console-message-wrapper');
    }
    return this._issueBar.element;
  }

  focusLastChildOrSelf(): void {
    if (!this._issueBar) {
      return;
    }
    this._issueBar.element.focus();
  }

  fastHeight(): number {
    return this._cachedIssueBarHeight || 37;
  }

  toExportString(): Common.UIString.LocalizedString {
    return i18nString(UIStrings.someMessagesHaveBeenMovedToThe);
  }
}

export class ConsoleView extends UI.Widget.VBox implements UI.SearchableView.Searchable, ConsoleViewportProvider {
  _searchableView: UI.SearchableView.SearchableView;
  _sidebar: ConsoleSidebar;
  _isSidebarOpen: boolean;
  _filter: ConsoleViewFilter;
  _consoleToolbarContainer: HTMLElement;
  _splitWidget: UI.SplitWidget.SplitWidget;
  _contentsElement: UI.Widget.WidgetElement;
  _visibleViewMessages: ConsoleViewMessage[];
  _hiddenByFilterCount: number;
  _shouldBeHiddenCache: Set<ConsoleViewMessage>;
  _lastShownHiddenByFilterCount!: number;
  _currentMatchRangeIndex!: number;
  _searchRegex!: RegExp|null;
  _groupableMessages: Map<string, ConsoleViewMessage[]>;
  _groupableMessageTitle: Map<string, ConsoleViewMessage>;
  _shortcuts: Map<number, () => void>;
  _regexMatchRanges: RegexMatchRange[];
  _consoleContextSelector: ConsoleContextSelector;
  _filterStatusText: UI.Toolbar.ToolbarText;
  _showSettingsPaneSetting: Common.Settings.Setting<boolean>;
  _showSettingsPaneButton: UI.Toolbar.ToolbarSettingToggle;
  _progressToolbarItem: UI.Toolbar.ToolbarItem;
  _groupSimilarSetting: Common.Settings.Setting<boolean>;
  _preserveLogCheckbox: UI.Toolbar.ToolbarSettingCheckbox;
  _hideNetworkMessagesCheckbox: UI.Toolbar.ToolbarSettingCheckbox;
  _timestampsSetting: Common.Settings.Setting<unknown>;
  _consoleHistoryAutocompleteSetting: Common.Settings.Setting<boolean>;
  _pinPane: ConsolePinPane;
  _viewport: ConsoleViewport;
  _messagesElement: HTMLElement;
  _viewportThrottler: Common.Throttler.Throttler;
  _pendingBatchResize: boolean;
  _onMessageResizedBound: (e: Common.EventTarget.EventTargetEvent) => void;
  _topGroup: ConsoleGroup;
  _currentGroup: ConsoleGroup;
  _promptElement: HTMLElement;
  _linkifier: Components.Linkifier.Linkifier;
  _consoleMessages: ConsoleViewMessage[];
  _viewMessageSymbol: symbol;
  _consoleHistorySetting: Common.Settings.Setting<string[]>;
  _prompt: ConsolePrompt;
  _issueMessage: IssueMessage|undefined;
  _immediatelyFilterMessagesForTest?: boolean;
  _maybeDirtyWhileMuted?: boolean;
  _scheduledRefreshPromiseForTest?: Promise<void>;
  _needsFullUpdate?: boolean;
  _buildHiddenCacheTimeout?: number;
  _searchShouldJumpBackwards?: boolean;
  _searchProgressIndicator?: UI.ProgressIndicator.ProgressIndicator;
  _innerSearchTimeoutId?: number;
  _muteViewportUpdates?: boolean;
  _waitForScrollTimeout?: number;
  _issuesCounter: UIComponents.IconButton.IconButton;

  constructor() {
    super();
    this.setMinimumSize(0, 35);
    this.registerRequiredCSS('console/consoleView.css', {enableLegacyPatching: true});
    this.registerRequiredCSS('object_ui/objectValue.css', {enableLegacyPatching: true});

    this._searchableView = new UI.SearchableView.SearchableView(this, null);
    this._searchableView.element.classList.add('console-searchable-view');
    this._searchableView.setPlaceholder(i18nString(UIStrings.findStringInLogs));
    this._searchableView.setMinimalSearchQuerySize(0);
    this._sidebar = new ConsoleSidebar();
    this._sidebar.addEventListener(Events.FilterSelected, this._onFilterChanged.bind(this));
    this._isSidebarOpen = false;
    this._filter = new ConsoleViewFilter(this._onFilterChanged.bind(this));

    this._consoleToolbarContainer = this.element.createChild('div', 'console-toolbar-container');
    this._splitWidget = new UI.SplitWidget.SplitWidget(
        true /* isVertical */, false /* secondIsSidebar */, 'console.sidebar.width', 100);
    this._splitWidget.setMainWidget(this._searchableView);
    this._splitWidget.setSidebarWidget(this._sidebar);
    this._splitWidget.show(this.element);
    this._splitWidget.hideSidebar();
    this._splitWidget.enableShowModeSaving();
    this._isSidebarOpen = this._splitWidget.showMode() === UI.SplitWidget.ShowMode.Both;
    this._filter.setLevelMenuOverridden(this._isSidebarOpen);
    this._splitWidget.addEventListener(UI.SplitWidget.Events.ShowModeChanged, event => {
      this._isSidebarOpen = event.data === UI.SplitWidget.ShowMode.Both;
      this._filter.setLevelMenuOverridden(this._isSidebarOpen);
      this._onFilterChanged();
    });
    this._contentsElement = this._searchableView.element;
    this.element.classList.add('console-view');

    this._visibleViewMessages = [];
    this._hiddenByFilterCount = 0;
    this._shouldBeHiddenCache = new Set();

    this._groupableMessages = new Map();
    this._groupableMessageTitle = new Map();
    this._shortcuts = new Map();

    this._regexMatchRanges = [];

    this._consoleContextSelector = new ConsoleContextSelector();

    this._filterStatusText = new UI.Toolbar.ToolbarText();
    this._filterStatusText.element.classList.add('dimmed');
    this._showSettingsPaneSetting =
        Common.Settings.Settings.instance().createSetting('consoleShowSettingsToolbar', false);
    this._showSettingsPaneButton = new UI.Toolbar.ToolbarSettingToggle(
        this._showSettingsPaneSetting, 'largeicon-settings-gear', i18nString(UIStrings.consoleSettings));
    this._progressToolbarItem = new UI.Toolbar.ToolbarItem(document.createElement('div'));
    this._groupSimilarSetting = Common.Settings.Settings.instance().moduleSetting('consoleGroupSimilar');
    this._groupSimilarSetting.addChangeListener(() => this._updateMessageList());
    const groupSimilarToggle = new UI.Toolbar.ToolbarSettingCheckbox(
        this._groupSimilarSetting, i18nString(UIStrings.groupSimilarMessagesInConsole));

    const toolbar = new UI.Toolbar.Toolbar('console-main-toolbar', this._consoleToolbarContainer);
    const rightToolbar = new UI.Toolbar.Toolbar('', this._consoleToolbarContainer);
    toolbar.appendToolbarItem(this._splitWidget.createShowHideSidebarButton(
        i18nString(UIStrings.showConsoleSidebar), i18nString(UIStrings.hideConsoleSidebar)));
    toolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButton(
        (UI.ActionRegistry.ActionRegistry.instance().action('console.clear') as UI.ActionRegistration.Action)));
    toolbar.appendSeparator();
    toolbar.appendToolbarItem(this._consoleContextSelector.toolbarItem());
    toolbar.appendSeparator();
    const liveExpressionButton = UI.Toolbar.Toolbar.createActionButton(
        (UI.ActionRegistry.ActionRegistry.instance().action('console.create-pin') as UI.ActionRegistration.Action));
    toolbar.appendToolbarItem(liveExpressionButton);
    toolbar.appendSeparator();
    toolbar.appendToolbarItem(this._filter._textFilterUI);
    toolbar.appendToolbarItem(this._filter._levelMenuButton);
    toolbar.appendToolbarItem(this._progressToolbarItem);
    toolbar.appendSeparator();
    this._issuesCounter = new UIComponents.IconButton.IconButton();
    this._issuesCounter.id = 'console-issues-counter';
    const issuesToolbarItem = new UI.Toolbar.ToolbarItem(this._issuesCounter);
    this._issuesCounter.data = {
      clickHandler: (): void => {
        Host.userMetrics.issuesPanelOpenedFrom(Host.UserMetrics.IssueOpener.StatusBarIssuesCounter);
        UI.ViewManager.ViewManager.instance().showView('issues-pane');
      },
      groups: [{iconName: 'issue-text-icon', iconColor: '#1a73e8'}],
    };
    toolbar.appendToolbarItem(issuesToolbarItem);
    rightToolbar.appendSeparator();
    rightToolbar.appendToolbarItem(this._filterStatusText);
    rightToolbar.appendToolbarItem(this._showSettingsPaneButton);

    this._preserveLogCheckbox = new UI.Toolbar.ToolbarSettingCheckbox(
        Common.Settings.Settings.instance().moduleSetting('preserveConsoleLog'),
        i18nString(UIStrings.doNotClearLogOnPageReload), i18nString(UIStrings.preserveLog));
    this._hideNetworkMessagesCheckbox = new UI.Toolbar.ToolbarSettingCheckbox(
        this._filter._hideNetworkMessagesSetting, this._filter._hideNetworkMessagesSetting.title(),
        i18nString(UIStrings.hideNetwork));
    const filterByExecutionContextCheckbox = new UI.Toolbar.ToolbarSettingCheckbox(
        this._filter._filterByExecutionContextSetting, i18nString(UIStrings.onlyShowMessagesFromTheCurrentContext),
        i18nString(UIStrings.selectedContextOnly));
    const monitoringXHREnabledSetting = Common.Settings.Settings.instance().moduleSetting('monitoringXHREnabled');
    this._timestampsSetting = Common.Settings.Settings.instance().moduleSetting('consoleTimestampsEnabled');
    this._consoleHistoryAutocompleteSetting =
        Common.Settings.Settings.instance().moduleSetting('consoleHistoryAutocomplete');

    const settingsPane = new UI.Widget.HBox();
    settingsPane.show(this._contentsElement);
    settingsPane.element.classList.add('console-settings-pane');

    UI.ARIAUtils.setAccessibleName(settingsPane.element, i18nString(UIStrings.consoleSettings));
    UI.ARIAUtils.markAsGroup(settingsPane.element);
    const settingsToolbarLeft = new UI.Toolbar.Toolbar('', settingsPane.element);
    settingsToolbarLeft.makeVertical();
    settingsToolbarLeft.appendToolbarItem(this._hideNetworkMessagesCheckbox);
    settingsToolbarLeft.appendToolbarItem(this._preserveLogCheckbox);
    settingsToolbarLeft.appendToolbarItem(filterByExecutionContextCheckbox);
    settingsToolbarLeft.appendToolbarItem(groupSimilarToggle);

    const settingsToolbarRight = new UI.Toolbar.Toolbar('', settingsPane.element);
    settingsToolbarRight.makeVertical();
    settingsToolbarRight.appendToolbarItem(new UI.Toolbar.ToolbarSettingCheckbox(monitoringXHREnabledSetting));
    const eagerEvalCheckbox = new UI.Toolbar.ToolbarSettingCheckbox(
        Common.Settings.Settings.instance().moduleSetting('consoleEagerEval'),
        i18nString(UIStrings.eagerlyEvaluateTextInThePrompt));
    settingsToolbarRight.appendToolbarItem(eagerEvalCheckbox);
    settingsToolbarRight.appendToolbarItem(
        new UI.Toolbar.ToolbarSettingCheckbox(this._consoleHistoryAutocompleteSetting));
    const userGestureCheckbox = new UI.Toolbar.ToolbarSettingCheckbox(
        Common.Settings.Settings.instance().moduleSetting('consoleUserActivationEval'));
    settingsToolbarRight.appendToolbarItem(userGestureCheckbox);
    if (!this._showSettingsPaneSetting.get()) {
      settingsPane.element.classList.add('hidden');
    }
    this._showSettingsPaneSetting.addChangeListener(
        () => settingsPane.element.classList.toggle('hidden', !this._showSettingsPaneSetting.get()));

    this._pinPane = new ConsolePinPane(liveExpressionButton);
    this._pinPane.element.classList.add('console-view-pinpane');
    this._pinPane.show(this._contentsElement);
    this._pinPane.element.addEventListener('keydown', event => {
      if ((event.key === 'Enter' &&
           UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlOrMeta((event as KeyboardEvent))) ||
          event.keyCode === UI.KeyboardShortcut.Keys.Esc.code) {
        this._prompt.focus();
        event.consume();
      }
    });

    this._viewport = new ConsoleViewport(this);
    this._viewport.setStickToBottom(true);
    this._viewport.contentElement().classList.add('console-group', 'console-group-messages');
    this._contentsElement.appendChild(this._viewport.element);
    this._messagesElement = this._viewport.element;
    this._messagesElement.id = 'console-messages';
    this._messagesElement.classList.add('monospace');
    this._messagesElement.addEventListener('click', this._messagesClicked.bind(this), false);
    this._messagesElement.addEventListener('paste', this._messagesPasted.bind(this), true);
    this._messagesElement.addEventListener('clipboard-paste', this._messagesPasted.bind(this), true);
    UI.ARIAUtils.markAsGroup(this._messagesElement);

    this._viewportThrottler = new Common.Throttler.Throttler(50);
    this._pendingBatchResize = false;
    this._onMessageResizedBound = (e: Common.EventTarget.EventTargetEvent): void => {
      this._onMessageResized(e);
    };

    this._topGroup = ConsoleGroup.createTopGroup();
    this._currentGroup = this._topGroup;

    this._promptElement = this._messagesElement.createChild('div', 'source-code');
    this._promptElement.id = 'console-prompt';

    // FIXME: This is a workaround for the selection machinery bug. See crbug.com/410899
    const selectAllFixer = this._messagesElement.createChild('div', 'console-view-fix-select-all');
    selectAllFixer.textContent = '.';
    UI.ARIAUtils.markAsHidden(selectAllFixer);

    this._registerShortcuts();

    this._messagesElement.addEventListener('contextmenu', this._handleContextMenuEvent.bind(this), false);

    this._linkifier = new Components.Linkifier.Linkifier(MaxLengthForLinks);

    this._consoleMessages = [];
    this._viewMessageSymbol = Symbol('viewMessage');

    this._consoleHistorySetting = Common.Settings.Settings.instance().createLocalSetting('consoleHistory', []);

    this._prompt = new ConsolePrompt();
    this._prompt.show(this._promptElement);
    this._prompt.element.addEventListener('keydown', this._promptKeyDown.bind(this), true);
    this._prompt.addEventListener(ConsolePromptEvents.TextChanged, this._promptTextChanged, this);

    this._messagesElement.addEventListener('keydown', this._messagesKeyDown.bind(this), false);
    this._prompt.element.addEventListener('focusin', () => {
      if (this._isScrolledToBottom()) {
        this._viewport.setStickToBottom(true);
      }
    });

    this._consoleHistoryAutocompleteSetting.addChangeListener(this._consoleHistoryAutocompleteChanged, this);

    const historyData = this._consoleHistorySetting.get();
    this._prompt.history().setHistoryData(historyData);
    this._consoleHistoryAutocompleteChanged();

    this._updateFilterStatus();
    this._timestampsSetting.addChangeListener(this._consoleTimestampsSettingChanged, this);

    this._registerWithMessageSink();

    UI.Context.Context.instance().addFlavorChangeListener(
        SDK.RuntimeModel.ExecutionContext, this._executionContextChanged, this);

    this._messagesElement.addEventListener(
        'mousedown', (event: Event) => this._updateStickToBottomOnPointerDown((event as MouseEvent).button === 2),
        false);
    this._messagesElement.addEventListener('mouseup', this._updateStickToBottomOnPointerUp.bind(this), false);
    this._messagesElement.addEventListener('mouseleave', this._updateStickToBottomOnPointerUp.bind(this), false);
    this._messagesElement.addEventListener('wheel', this._updateStickToBottomOnWheel.bind(this), false);
    this._messagesElement.addEventListener(
        'touchstart', this._updateStickToBottomOnPointerDown.bind(this, false), false);
    this._messagesElement.addEventListener('touchend', this._updateStickToBottomOnPointerUp.bind(this), false);
    this._messagesElement.addEventListener('touchcancel', this._updateStickToBottomOnPointerUp.bind(this), false);

    SDK.ConsoleModel.ConsoleModel.instance().addEventListener(
        SDK.ConsoleModel.Events.ConsoleCleared, this._consoleCleared, this);
    SDK.ConsoleModel.ConsoleModel.instance().addEventListener(
        SDK.ConsoleModel.Events.MessageAdded, this._onConsoleMessageAdded, this);
    SDK.ConsoleModel.ConsoleModel.instance().addEventListener(
        SDK.ConsoleModel.Events.MessageUpdated, this._onConsoleMessageUpdated, this);
    SDK.ConsoleModel.ConsoleModel.instance().addEventListener(
        SDK.ConsoleModel.Events.CommandEvaluated, this._commandEvaluated, this);
    SDK.ConsoleModel.ConsoleModel.instance().messages().forEach(this._addConsoleMessage, this);

    this._issueMessage = undefined;
    const issuesManager = BrowserSDK.IssuesManager.IssuesManager.instance();
    issuesManager.addEventListener(
        BrowserSDK.IssuesManager.Events.IssuesCountUpdated, this._updateIssuesToolbarItem, this);
  }

  _onIssuesCountChanged(): void {
    if (BrowserSDK.IssuesManager.IssuesManager.instance().numberOfIssues() === 0) {
      if (this._issueMessage) {
        this._issueMessage.element().remove();
        this._issueMessage = undefined;
        this._scheduleViewportRefresh();
      }
    } else if (!this._issueMessage) {
      this._issueMessage = new IssueMessage();
      this._scheduleViewportRefresh();
    }
  }

  static instance(): ConsoleView {
    if (!consoleViewInstance) {
      consoleViewInstance = new ConsoleView();
    }
    return consoleViewInstance;
  }

  static clearConsole(): void {
    const consoleView = ConsoleView.instance();
    if (consoleView._issueMessage) {
      consoleView._issueMessage.element().remove();
      consoleView._issueMessage = undefined;
      consoleView._scheduleViewportRefresh();
    }
    SDK.ConsoleModel.ConsoleModel.instance().requestClearMessages();
  }

  _onFilterChanged(): void {
    this._filter._currentFilter.levelsMask =
        this._isSidebarOpen ? ConsoleFilter.allLevelsFilterValue() : this._filter._messageLevelFiltersSetting.get();
    this._cancelBuildHiddenCache();
    if (this._immediatelyFilterMessagesForTest) {
      for (const viewMessage of this._consoleMessages) {
        this._computeShouldMessageBeVisible(viewMessage);
      }
      this._updateMessageList();
      return;
    }
    this._buildHiddenCache(0, this._consoleMessages.slice());
  }

  _setImmediatelyFilterMessagesForTest(): void {
    this._immediatelyFilterMessagesForTest = true;
  }

  searchableView(): UI.SearchableView.SearchableView {
    return this._searchableView;
  }

  _clearHistory(): void {
    this._consoleHistorySetting.set([]);
    this._prompt.history().setHistoryData([]);
  }

  _consoleHistoryAutocompleteChanged(): void {
    this._prompt.setAddCompletionsFromHistory(this._consoleHistoryAutocompleteSetting.get());
  }

  itemCount(): number {
    if (this._issueMessage) {
      return this._visibleViewMessages.length + 1;
    }
    return this._visibleViewMessages.length;
  }

  itemElement(index: number): ConsoleViewportElement|null {
    const issueMessage = this._issueMessage;
    if (issueMessage) {
      if (index === 0) {
        return issueMessage;
      }
      return this._visibleViewMessages[index - 1];
    }
    return this._visibleViewMessages[index];
  }

  fastHeight(index: number): number {
    const issueMessage = this._issueMessage;
    if (issueMessage) {
      if (index === 0) {
        return issueMessage.fastHeight() || 37;
      }
      return this._visibleViewMessages[index - 1].fastHeight();
    }
    return this._visibleViewMessages[index].fastHeight();
  }

  minimumRowHeight(): number {
    return 16;
  }

  _registerWithMessageSink(): void {
    Common.Console.Console.instance().messages().forEach(this._addSinkMessage, this);
    Common.Console.Console.instance().addEventListener(Common.Console.Events.MessageAdded, messageAdded, this);

    function messageAdded(this: ConsoleView, event: Common.EventTarget.EventTargetEvent): void {
      this._addSinkMessage((event.data as Common.Console.Message));
    }
  }

  _addSinkMessage(message: Common.Console.Message): void {
    let level: Protocol.Log.LogEntryLevel = SDK.ConsoleModel.MessageLevel.Verbose;
    switch (message.level) {
      case Common.Console.MessageLevel.Info:
        level = SDK.ConsoleModel.MessageLevel.Info;
        break;
      case Common.Console.MessageLevel.Error:
        level = SDK.ConsoleModel.MessageLevel.Error;
        break;
      case Common.Console.MessageLevel.Warning:
        level = SDK.ConsoleModel.MessageLevel.Warning;
        break;
    }

    const consoleMessage = new SDK.ConsoleModel.ConsoleMessage(
        null, SDK.ConsoleModel.MessageSource.Other, level, message.text, SDK.ConsoleModel.MessageType.System, undefined,
        undefined, undefined, undefined, undefined, message.timestamp);
    this._addConsoleMessage(consoleMessage);
  }

  _consoleTimestampsSettingChanged(): void {
    this._updateMessageList();
    this._consoleMessages.forEach(viewMessage => viewMessage.updateTimestamp());
    this._groupableMessageTitle.forEach(viewMessage => viewMessage.updateTimestamp());
  }

  _executionContextChanged(): void {
    this._prompt.clearAutocomplete();
  }

  willHide(): void {
    this._hidePromptSuggestBox();
  }

  wasShown(): void {
    this._updateIssuesToolbarItem();
    this._viewport.refresh();
  }

  focus(): void {
    if (this._viewport.hasVirtualSelection()) {
      (this._viewport.contentElement() as HTMLElement).focus();
    } else {
      this._focusPrompt();
    }
  }

  _focusPrompt(): void {
    if (!this._prompt.hasFocus()) {
      const oldStickToBottom = this._viewport.stickToBottom();
      const oldScrollTop = this._viewport.element.scrollTop;
      this._prompt.focus();
      this._viewport.setStickToBottom(oldStickToBottom);
      this._viewport.element.scrollTop = oldScrollTop;
    }
  }

  restoreScrollPositions(): void {
    if (this._viewport.stickToBottom()) {
      this._immediatelyScrollToBottom();
    } else {
      super.restoreScrollPositions();
    }
  }

  onResize(): void {
    this._scheduleViewportRefresh();
    this._hidePromptSuggestBox();
    if (this._viewport.stickToBottom()) {
      this._immediatelyScrollToBottom();
    }
    for (let i = 0; i < this._visibleViewMessages.length; ++i) {
      this._visibleViewMessages[i].onResize();
    }
  }

  _hidePromptSuggestBox(): void {
    this._prompt.clearAutocomplete();
  }

  async _invalidateViewport(): Promise<void> {
    this._updateIssuesToolbarItem();
    if (this._muteViewportUpdates) {
      this._maybeDirtyWhileMuted = true;
      return;
    }
    if (this._needsFullUpdate) {
      this._updateMessageList();
      delete this._needsFullUpdate;
    } else {
      this._viewport.invalidate();
    }
    return;
  }

  _updateIssuesToolbarItem(): void {
    const issueCount = BrowserSDK.IssuesManager.IssuesManager.instance().numberOfIssues();
    let issuesSummary = '';
    let issuesTitleGotoIssues = '';
    if (issueCount === 0) {
      issuesSummary = i18nString(UIStrings.noIssue);
      issuesTitleGotoIssues = i18nString(UIStrings.issueToolbarTooltipHaveNoIssues);
    } else if (issueCount === 1) {
      issuesSummary = i18nString(UIStrings.oneIssue);
      issuesTitleGotoIssues = i18nString(UIStrings.issueToolbarTooltipHaveOneIssues);
    } else {
      issuesSummary = i18nString(UIStrings.multipleIssues, {issueCount});
      issuesTitleGotoIssues = i18nString(UIStrings.issueToolbarTooltipHaveMultipleIssues, {issueCount});
    }
    this._issuesCounter.setTexts([issuesSummary]);
    const issuesTitleGeneral = i18nString(UIStrings.issueToolbarTooltipGeneral);
    const issuesTitle = `${issuesTitleGeneral} ${issuesTitleGotoIssues}`;
    UI.Tooltip.Tooltip.install(this._issuesCounter, issuesTitle);
    UI.ARIAUtils.setAccessibleName(this._issuesCounter, issuesTitle);
  }

  _scheduleViewportRefresh(): void {
    if (this._muteViewportUpdates) {
      this._maybeDirtyWhileMuted = true;
      this._scheduleViewportRefreshForTest(true);
      return;
    }
    this._scheduleViewportRefreshForTest(false);

    this._scheduledRefreshPromiseForTest = this._viewportThrottler.schedule(this._invalidateViewport.bind(this));
  }

  _scheduleViewportRefreshForTest(_muted: boolean): void {
    // This functions is sniffed in tests.
  }

  _immediatelyScrollToBottom(): void {
    // This will scroll viewport and trigger its refresh.
    this._viewport.setStickToBottom(true);
    this._promptElement.scrollIntoView(true);
  }

  _updateFilterStatus(): void {
    if (this._hiddenByFilterCount === this._lastShownHiddenByFilterCount) {
      return;
    }
    this._filterStatusText.setText(i18nString(UIStrings.sHidden, {PH1: this._hiddenByFilterCount}));
    this._filterStatusText.setVisible(Boolean(this._hiddenByFilterCount));
    this._lastShownHiddenByFilterCount = this._hiddenByFilterCount;
  }

  _onConsoleMessageAdded(event: Common.EventTarget.EventTargetEvent): void {
    const message = (event.data as SDK.ConsoleModel.ConsoleMessage);
    this._addConsoleMessage(message);
  }

  _addConsoleMessage(message: SDK.ConsoleModel.ConsoleMessage): void {
    const viewMessage = this._createViewMessage(message);
    consoleMessageToViewMessage.set(message, viewMessage);
    if (message.type === SDK.ConsoleModel.MessageType.Command || message.type === SDK.ConsoleModel.MessageType.Result) {
      const lastMessage = this._consoleMessages[this._consoleMessages.length - 1];
      const newTimestamp = lastMessage && messagesSortedBySymbol.get(lastMessage) || 0;
      messagesSortedBySymbol.set(viewMessage, newTimestamp);
    } else {
      messagesSortedBySymbol.set(viewMessage, viewMessage.consoleMessage().timestamp);
    }

    let insertAt;
    if (!this._consoleMessages.length ||
        timeComparator(viewMessage, this._consoleMessages[this._consoleMessages.length - 1]) > 0) {
      insertAt = this._consoleMessages.length;
    } else {
      insertAt = Platform.ArrayUtilities.upperBound(this._consoleMessages, viewMessage, timeComparator);
    }
    const insertedInMiddle = insertAt < this._consoleMessages.length;
    this._consoleMessages.splice(insertAt, 0, viewMessage);

    this._filter.onMessageAdded(message);
    this._sidebar.onMessageAdded(viewMessage);

    // If we already have similar messages, go slow path.
    let shouldGoIntoGroup = false;
    const shouldGroupSimilar = this._groupSimilarSetting.get();
    if (message.isGroupable()) {
      const groupKey = viewMessage.groupKey();
      shouldGoIntoGroup = shouldGroupSimilar && this._groupableMessages.has(groupKey);
      let list = this._groupableMessages.get(groupKey);
      if (!list) {
        list = [];
        this._groupableMessages.set(groupKey, list);
      }
      list.push(viewMessage);
    }

    this._computeShouldMessageBeVisible(viewMessage);
    if (!shouldGoIntoGroup && !insertedInMiddle) {
      this._appendMessageToEnd(
          viewMessage,
          !shouldGroupSimilar /* crbug.com/1082963: prevent collapse of same messages when "Group similar" is false */);
      this._updateFilterStatus();
      this._searchableView.updateSearchMatchesCount(this._regexMatchRanges.length);
    } else {
      this._needsFullUpdate = true;
    }

    this._scheduleViewportRefresh();
    this._consoleMessageAddedForTest(viewMessage);

    function timeComparator(viewMessage1: ConsoleViewMessage, viewMessage2: ConsoleViewMessage): number {
      return (messagesSortedBySymbol.get(viewMessage1) || 0) - (messagesSortedBySymbol.get(viewMessage2) || 0);
    }
  }

  _onConsoleMessageUpdated(event: Common.EventTarget.EventTargetEvent): void {
    const message = (event.data as SDK.ConsoleModel.ConsoleMessage);
    const viewMessage = consoleMessageToViewMessage.get(message);
    if (viewMessage) {
      viewMessage.updateMessageElement();
      this._computeShouldMessageBeVisible(viewMessage);
      this._updateMessageList();
    }
  }

  _consoleMessageAddedForTest(_viewMessage: ConsoleViewMessage): void {
  }

  _shouldMessageBeVisible(viewMessage: ConsoleViewMessage): boolean {
    return !this._shouldBeHiddenCache.has(viewMessage);
  }

  _computeShouldMessageBeVisible(viewMessage: ConsoleViewMessage): void {
    if (this._filter.shouldBeVisible(viewMessage) &&
        (!this._isSidebarOpen || this._sidebar.shouldBeVisible(viewMessage))) {
      this._shouldBeHiddenCache.delete(viewMessage);
    } else {
      this._shouldBeHiddenCache.add(viewMessage);
    }
  }

  _appendMessageToEnd(viewMessage: ConsoleViewMessage, preventCollapse?: boolean): void {
    if (!this._shouldMessageBeVisible(viewMessage)) {
      this._hiddenByFilterCount++;
      return;
    }

    if (!preventCollapse &&
        this._tryToCollapseMessages(viewMessage, this._visibleViewMessages[this._visibleViewMessages.length - 1])) {
      return;
    }

    const lastMessage = this._visibleViewMessages[this._visibleViewMessages.length - 1];
    if (viewMessage.consoleMessage().type === SDK.ConsoleModel.MessageType.EndGroup) {
      if (lastMessage && !this._currentGroup.messagesHidden()) {
        lastMessage.incrementCloseGroupDecorationCount();
      }
      this._currentGroup = this._currentGroup.parentGroup() || this._currentGroup;
      return;
    }
    if (!this._currentGroup.messagesHidden()) {
      const originatingMessage = viewMessage.consoleMessage().originatingMessage();
      if (lastMessage && originatingMessage && lastMessage.consoleMessage() === originatingMessage) {
        viewMessage.toMessageElement().classList.add('console-adjacent-user-command-result');
      }

      this._visibleViewMessages.push(viewMessage);
      this._searchMessage(this._visibleViewMessages.length - 1);
    }

    if (viewMessage.consoleMessage().isGroupStartMessage()) {
      this._currentGroup = new ConsoleGroup(this._currentGroup, (viewMessage as ConsoleGroupViewMessage));
    }

    this._messageAppendedForTests();
  }

  _messageAppendedForTests(): void {
    // This method is sniffed in tests.
  }

  _createViewMessage(message: SDK.ConsoleModel.ConsoleMessage): ConsoleViewMessage {
    const nestingLevel = this._currentGroup.nestingLevel();
    switch (message.type) {
      case SDK.ConsoleModel.MessageType.Command:
        return new ConsoleCommand(message, this._linkifier, nestingLevel, this._onMessageResizedBound);
      case SDK.ConsoleModel.MessageType.Result:
        return new ConsoleCommandResult(message, this._linkifier, nestingLevel, this._onMessageResizedBound);
      case SDK.ConsoleModel.MessageType.StartGroupCollapsed:
      case SDK.ConsoleModel.MessageType.StartGroup:
        return new ConsoleGroupViewMessage(
            message, this._linkifier, nestingLevel, this._updateMessageList.bind(this), this._onMessageResizedBound);
      case SDK.ConsoleModel.MessageType.Table:
        return new ConsoleTableMessageView(message, this._linkifier, nestingLevel, this._onMessageResizedBound);
      default:
        return new ConsoleViewMessage(message, this._linkifier, nestingLevel, this._onMessageResizedBound);
    }
  }

  async _onMessageResized(event: Common.EventTarget.EventTargetEvent): Promise<void> {
    const treeElement = (event.data as UI.TreeOutline.TreeElement);
    if (this._pendingBatchResize || !treeElement.treeOutline) {
      return;
    }
    this._pendingBatchResize = true;
    await Promise.resolve();
    const treeOutlineElement = treeElement.treeOutline.element;
    this._viewport.setStickToBottom(this._isScrolledToBottom());
    // Scroll, in case mutations moved the element below the visible area.
    if (treeOutlineElement.offsetHeight <= this._messagesElement.offsetHeight) {
      treeOutlineElement.scrollIntoViewIfNeeded();
    }

    this._pendingBatchResize = false;
  }

  _consoleCleared(): void {
    const hadFocus = this._viewport.element.hasFocus();
    this._cancelBuildHiddenCache();
    this._currentMatchRangeIndex = -1;
    this._consoleMessages = [];
    this._groupableMessages.clear();
    this._groupableMessageTitle.clear();
    this._sidebar.clear();
    this._updateMessageList();
    this._hidePromptSuggestBox();
    this._viewport.setStickToBottom(true);
    this._linkifier.reset();
    this._filter.clear();
    if (hadFocus) {
      this._prompt.focus();
    }
    UI.ARIAUtils.alert(i18nString(UIStrings.consoleCleared), this._viewport.element);
  }

  _handleContextMenuEvent(event: Event): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    const eventTarget = (event.target as Node);
    if (eventTarget.isSelfOrDescendant(this._promptElement)) {
      contextMenu.show();
      return;
    }

    const sourceElement = eventTarget.enclosingNodeOrSelfWithClass('console-message-wrapper');
    const consoleViewMessage = sourceElement && getMessageForElement(sourceElement);
    const consoleMessage = consoleViewMessage ? consoleViewMessage.consoleMessage() : null;

    if (consoleMessage && consoleMessage.url) {
      const menuTitle = i18nString(
          UIStrings.hideMessagesFromS, {PH1: new Common.ParsedURL.ParsedURL(consoleMessage.url).displayName});
      contextMenu.headerSection().appendItem(
          menuTitle, this._filter.addMessageURLFilter.bind(this._filter, consoleMessage.url));
    }

    contextMenu.defaultSection().appendAction('console.clear');
    contextMenu.defaultSection().appendAction('console.clear.history');
    contextMenu.saveSection().appendItem(i18nString(UIStrings.saveAs), this._saveConsole.bind(this));
    if (this.element.hasSelection()) {
      contextMenu.clipboardSection().appendItem(
          i18nString(UIStrings.copyVisibleStyledSelection), this._viewport.copyWithStyles.bind(this._viewport));
    }

    if (consoleMessage) {
      const request = SDK.NetworkLog.NetworkLog.requestForConsoleMessage(consoleMessage);
      if (request && SDK.NetworkManager.NetworkManager.canReplayRequest(request)) {
        contextMenu.debugSection().appendItem(
            i18nString(UIStrings.replayXhr), SDK.NetworkManager.NetworkManager.replayRequest.bind(null, request));
      }
    }

    contextMenu.show();
  }

  async _saveConsole(): Promise<void> {
    const url = (SDK.SDKModel.TargetManager.instance().mainTarget() as SDK.SDKModel.Target).inspectedURL();
    const parsedURL = Common.ParsedURL.ParsedURL.fromString(url);
    const filename = Platform.StringUtilities.sprintf('%s-%d.log', parsedURL ? parsedURL.host : 'console', Date.now());
    const stream = new Bindings.FileUtils.FileOutputStream();

    const progressIndicator = new UI.ProgressIndicator.ProgressIndicator();
    progressIndicator.setTitle(i18nString(UIStrings.writingFile));
    progressIndicator.setTotalWork(this.itemCount());

    const chunkSize = 350;

    if (!await stream.open(filename)) {
      return;
    }
    this._progressToolbarItem.element.appendChild(progressIndicator.element);

    let messageIndex = 0;
    while (messageIndex < this.itemCount() && !progressIndicator.isCanceled()) {
      const messageContents = [];
      let i;
      for (i = 0; i < chunkSize && i + messageIndex < this.itemCount(); ++i) {
        const message = (this.itemElement(messageIndex + i) as ConsoleViewMessage);
        messageContents.push(message.toExportString());
      }
      messageIndex += i;
      await stream.write(messageContents.join('\n') + '\n');
      progressIndicator.setWorked(messageIndex);
    }

    stream.close();
    progressIndicator.done();
  }

  _tryToCollapseMessages(viewMessage: ConsoleViewMessage, lastMessage?: ConsoleViewMessage): boolean {
    const timestampsShown = this._timestampsSetting.get();
    if (!timestampsShown && lastMessage && !viewMessage.consoleMessage().isGroupMessage() &&
        viewMessage.consoleMessage().type !== SDK.ConsoleModel.MessageType.Command &&
        viewMessage.consoleMessage().type !== SDK.ConsoleModel.MessageType.Result &&
        viewMessage.consoleMessage().isEqual(lastMessage.consoleMessage())) {
      lastMessage.incrementRepeatCount();
      if (viewMessage.isLastInSimilarGroup()) {
        lastMessage.setInSimilarGroup(true, true);
      }
      return true;
    }

    return false;
  }

  _buildHiddenCache(startIndex: number, viewMessages: ConsoleViewMessage[]): void {
    const startTime = Date.now();
    let i;
    for (i = startIndex; i < viewMessages.length; ++i) {
      this._computeShouldMessageBeVisible(viewMessages[i]);
      if (i % 10 === 0 && Date.now() - startTime > 12) {
        break;
      }
    }

    if (i === viewMessages.length) {
      this._updateMessageList();
      return;
    }
    this._buildHiddenCacheTimeout =
        this.element.window().requestAnimationFrame(this._buildHiddenCache.bind(this, i, viewMessages));
  }

  _cancelBuildHiddenCache(): void {
    this._shouldBeHiddenCache.clear();
    if (this._buildHiddenCacheTimeout) {
      this.element.window().cancelAnimationFrame(this._buildHiddenCacheTimeout);
      delete this._buildHiddenCacheTimeout;
    }
  }

  _updateMessageList(): void {
    this._topGroup = ConsoleGroup.createTopGroup();
    this._currentGroup = this._topGroup;
    this._regexMatchRanges = [];
    this._hiddenByFilterCount = 0;
    for (let i = 0; i < this._visibleViewMessages.length; ++i) {
      this._visibleViewMessages[i].resetCloseGroupDecorationCount();
      this._visibleViewMessages[i].resetIncrementRepeatCount();
    }
    this._visibleViewMessages = [];
    if (this._groupSimilarSetting.get()) {
      this._addGroupableMessagesToEnd();
    } else {
      for (let i = 0; i < this._consoleMessages.length; ++i) {
        this._consoleMessages[i].setInSimilarGroup(false);
        this._appendMessageToEnd(
            this._consoleMessages[i],
            true /* crbug.com/1082963: prevent collapse of same messages when "Group similar" is false */);
      }
    }
    this._updateFilterStatus();
    this._searchableView.updateSearchMatchesCount(this._regexMatchRanges.length);
    this._viewport.invalidate();
  }

  _addGroupableMessagesToEnd(): void {
    const alreadyAdded = new Set<SDK.ConsoleModel.ConsoleMessage>();
    const processedGroupKeys = new Set<string>();
    for (let i = 0; i < this._consoleMessages.length; ++i) {
      const viewMessage = this._consoleMessages[i];
      const message = viewMessage.consoleMessage();
      if (alreadyAdded.has(message)) {
        continue;
      }

      if (!message.isGroupable()) {
        this._appendMessageToEnd(viewMessage);
        alreadyAdded.add(message);
        continue;
      }

      const key = viewMessage.groupKey();
      const viewMessagesInGroup = this._groupableMessages.get(key);
      if (!viewMessagesInGroup || viewMessagesInGroup.length < 5) {
        viewMessage.setInSimilarGroup(false);
        this._appendMessageToEnd(viewMessage);
        alreadyAdded.add(message);
        continue;
      }

      if (processedGroupKeys.has(key)) {
        continue;
      }

      if (!viewMessagesInGroup.find(x => this._shouldMessageBeVisible(x))) {
        // Optimize for speed.
        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
        // @ts-expect-error
        Platform.SetUtilities.addAll(alreadyAdded, viewMessagesInGroup);
        processedGroupKeys.add(key);
        continue;
      }

      // Create artificial group start and end messages.
      let startGroupViewMessage = this._groupableMessageTitle.get(key);
      if (!startGroupViewMessage) {
        const startGroupMessage = new SDK.ConsoleModel.ConsoleMessage(
            null, message.source, message.level, viewMessage.groupTitle(),
            SDK.ConsoleModel.MessageType.StartGroupCollapsed);
        startGroupViewMessage = this._createViewMessage(startGroupMessage);
        this._groupableMessageTitle.set(key, startGroupViewMessage);
      }
      startGroupViewMessage.setRepeatCount(viewMessagesInGroup.length);
      this._appendMessageToEnd(startGroupViewMessage);

      for (const viewMessageInGroup of viewMessagesInGroup) {
        viewMessageInGroup.setInSimilarGroup(
            true, viewMessagesInGroup[viewMessagesInGroup.length - 1] === viewMessageInGroup);
        this._appendMessageToEnd(viewMessageInGroup, true);
        alreadyAdded.add(viewMessageInGroup.consoleMessage());
      }

      const endGroupMessage = new SDK.ConsoleModel.ConsoleMessage(
          null, message.source, message.level, message.messageText, SDK.ConsoleModel.MessageType.EndGroup);
      this._appendMessageToEnd(this._createViewMessage(endGroupMessage));
    }
  }

  _messagesClicked(event: Event): void {
    const target = (event.target as Node | null);
    // Do not focus prompt if messages have selection.
    if (!this._messagesElement.hasSelection()) {
      const clickedOutsideMessageList =
          target === this._messagesElement || this._prompt.belowEditorElement().isSelfOrAncestor(target);
      if (clickedOutsideMessageList) {
        this._prompt.moveCaretToEndOfPrompt();
        this._focusPrompt();
      }
    }
  }

  _messagesKeyDown(event: Event): void {
    const keyEvent = (event as KeyboardEvent);
    const hasActionModifier = keyEvent.ctrlKey || keyEvent.altKey || keyEvent.metaKey;
    if (hasActionModifier || keyEvent.key.length !== 1 || UI.UIUtils.isEditing() ||
        this._messagesElement.hasSelection()) {
      return;
    }
    this._prompt.moveCaretToEndOfPrompt();
    this._focusPrompt();
  }

  _messagesPasted(_event: Event): void {
    if (UI.UIUtils.isEditing()) {
      return;
    }
    this._prompt.focus();
  }

  _registerShortcuts(): void {
    this._shortcuts.set(
        UI.KeyboardShortcut.KeyboardShortcut.makeKey('u', UI.KeyboardShortcut.Modifiers.Ctrl),
        this._clearPromptBackwards.bind(this));
  }

  _clearPromptBackwards(): void {
    this._prompt.setText('');
  }

  _promptKeyDown(event: Event): void {
    const keyboardEvent = (event as KeyboardEvent);
    if (keyboardEvent.key === 'PageUp') {
      this._updateStickToBottomOnWheel();
      return;
    }

    const shortcut = UI.KeyboardShortcut.KeyboardShortcut.makeKeyFromEvent(keyboardEvent);
    const handler = this._shortcuts.get(shortcut);
    if (handler) {
      handler();
      keyboardEvent.preventDefault();
    }
  }

  _printResult(
      result: SDK.RemoteObject.RemoteObject|null, originatingConsoleMessage: SDK.ConsoleModel.ConsoleMessage,
      exceptionDetails?: Protocol.Runtime.ExceptionDetails): void {
    if (!result) {
      return;
    }

    const level = Boolean(exceptionDetails) ? SDK.ConsoleModel.MessageLevel.Error : SDK.ConsoleModel.MessageLevel.Info;
    let message;
    if (!exceptionDetails) {
      message = new SDK.ConsoleModel.ConsoleMessage(
          result.runtimeModel(), SDK.ConsoleModel.MessageSource.Javascript, level, '',
          SDK.ConsoleModel.MessageType.Result, undefined, undefined, undefined, [result]);
    } else {
      message = SDK.ConsoleModel.ConsoleMessage.fromException(
          result.runtimeModel(), exceptionDetails, SDK.ConsoleModel.MessageType.Result, undefined, undefined);
    }
    message.setOriginatingMessage(originatingConsoleMessage);
    SDK.ConsoleModel.ConsoleModel.instance().addMessage(message);
  }

  _commandEvaluated(event: Common.EventTarget.EventTargetEvent): void {
    const data = (event.data as {
      result: SDK.RemoteObject.RemoteObject | null,
      commandMessage: SDK.ConsoleModel.ConsoleMessage,
      exceptionDetails?: Protocol.Runtime.ExceptionDetails,
    });
    this._prompt.history().pushHistoryItem(data.commandMessage.messageText);
    this._consoleHistorySetting.set(this._prompt.history().historyData().slice(-persistedHistorySize));
    this._printResult(data.result, data.commandMessage, data.exceptionDetails);
  }

  elementsToRestoreScrollPositionsFor(): Element[] {
    return [this._messagesElement];
  }

  searchCanceled(): void {
    this._cleanupAfterSearch();
    for (let i = 0; i < this._visibleViewMessages.length; ++i) {
      const message = this._visibleViewMessages[i];
      message.setSearchRegex(null);
    }
    this._currentMatchRangeIndex = -1;
    this._regexMatchRanges = [];
    this._searchRegex = null;
    this._viewport.refresh();
  }

  performSearch(searchConfig: UI.SearchableView.SearchConfig, shouldJump: boolean, jumpBackwards?: boolean): void {
    this.searchCanceled();
    this._searchableView.updateSearchMatchesCount(0);

    this._searchRegex = searchConfig.toSearchRegex(true);

    this._regexMatchRanges = [];
    this._currentMatchRangeIndex = -1;

    if (shouldJump) {
      this._searchShouldJumpBackwards = Boolean(jumpBackwards);
    }

    this._searchProgressIndicator = new UI.ProgressIndicator.ProgressIndicator();
    this._searchProgressIndicator.setTitle(i18nString(UIStrings.searching));
    this._searchProgressIndicator.setTotalWork(this._visibleViewMessages.length);
    this._progressToolbarItem.element.appendChild(this._searchProgressIndicator.element);

    this._innerSearch(0);
  }

  _cleanupAfterSearch(): void {
    delete this._searchShouldJumpBackwards;
    if (this._innerSearchTimeoutId) {
      clearTimeout(this._innerSearchTimeoutId);
      delete this._innerSearchTimeoutId;
    }
    if (this._searchProgressIndicator) {
      this._searchProgressIndicator.done();
      delete this._searchProgressIndicator;
    }
  }

  _searchFinishedForTests(): void {
    // This method is sniffed in tests.
  }

  _innerSearch(index: number): void {
    delete this._innerSearchTimeoutId;
    if (this._searchProgressIndicator && this._searchProgressIndicator.isCanceled()) {
      this._cleanupAfterSearch();
      return;
    }

    const startTime = Date.now();
    for (; index < this._visibleViewMessages.length && Date.now() - startTime < 100; ++index) {
      this._searchMessage(index);
    }

    this._searchableView.updateSearchMatchesCount(this._regexMatchRanges.length);
    if (typeof this._searchShouldJumpBackwards !== 'undefined' && this._regexMatchRanges.length) {
      this._jumpToMatch(this._searchShouldJumpBackwards ? -1 : 0);
      delete this._searchShouldJumpBackwards;
    }

    if (index === this._visibleViewMessages.length) {
      this._cleanupAfterSearch();
      setTimeout(this._searchFinishedForTests.bind(this), 0);
      return;
    }

    this._innerSearchTimeoutId = window.setTimeout(this._innerSearch.bind(this, index), 100);
    if (this._searchProgressIndicator) {
      this._searchProgressIndicator.setWorked(index);
    }
  }

  _searchMessage(index: number): void {
    const message = this._visibleViewMessages[index];
    message.setSearchRegex(this._searchRegex);
    for (let i = 0; i < message.searchCount(); ++i) {
      this._regexMatchRanges.push({messageIndex: index, matchIndex: i});
    }
  }

  jumpToNextSearchResult(): void {
    this._jumpToMatch(this._currentMatchRangeIndex + 1);
  }

  jumpToPreviousSearchResult(): void {
    this._jumpToMatch(this._currentMatchRangeIndex - 1);
  }

  supportsCaseSensitiveSearch(): boolean {
    return true;
  }

  supportsRegexSearch(): boolean {
    return true;
  }

  _jumpToMatch(index: number): void {
    if (!this._regexMatchRanges.length) {
      return;
    }

    let matchRange;
    if (this._currentMatchRangeIndex >= 0) {
      matchRange = this._regexMatchRanges[this._currentMatchRangeIndex];
      const message = this._visibleViewMessages[matchRange.messageIndex];
      message.searchHighlightNode(matchRange.matchIndex)
          .classList.remove(UI.UIUtils.highlightedCurrentSearchResultClassName);
    }

    index = Platform.NumberUtilities.mod(index, this._regexMatchRanges.length);
    this._currentMatchRangeIndex = index;
    this._searchableView.updateCurrentMatchIndex(index);
    matchRange = this._regexMatchRanges[index];
    const message = this._visibleViewMessages[matchRange.messageIndex];
    const highlightNode = message.searchHighlightNode(matchRange.matchIndex);
    highlightNode.classList.add(UI.UIUtils.highlightedCurrentSearchResultClassName);
    const notifyOffset = this._issueMessage ? 1 : 0;
    this._viewport.scrollItemIntoView(matchRange.messageIndex + notifyOffset);
    highlightNode.scrollIntoViewIfNeeded();
  }

  _updateStickToBottomOnPointerDown(isRightClick?: boolean): void {
    this._muteViewportUpdates = !isRightClick;
    this._viewport.setStickToBottom(false);
    if (this._waitForScrollTimeout) {
      clearTimeout(this._waitForScrollTimeout);
      delete this._waitForScrollTimeout;
    }
  }

  _updateStickToBottomOnPointerUp(): void {
    if (!this._muteViewportUpdates) {
      return;
    }

    // Delay querying isScrolledToBottom to give time for smooth scroll
    // events to arrive. The value for the longest timeout duration is
    // retrieved from crbug.com/575409.
    this._waitForScrollTimeout = window.setTimeout(updateViewportState.bind(this), 200);

    function updateViewportState(this: ConsoleView): void {
      this._muteViewportUpdates = false;
      if (this.isShowing()) {
        this._viewport.setStickToBottom(this._isScrolledToBottom());
      }
      if (this._maybeDirtyWhileMuted) {
        this._scheduleViewportRefresh();
        delete this._maybeDirtyWhileMuted;
      }
      delete this._waitForScrollTimeout;
      this._updateViewportStickinessForTest();
    }
  }

  _updateViewportStickinessForTest(): void {
    // This method is sniffed in tests.
  }

  _updateStickToBottomOnWheel(): void {
    this._updateStickToBottomOnPointerDown();
    this._updateStickToBottomOnPointerUp();
  }

  _promptTextChanged(): void {
    const oldStickToBottom = this._viewport.stickToBottom();
    const willStickToBottom = this._isScrolledToBottom();
    this._viewport.setStickToBottom(willStickToBottom);
    if (willStickToBottom && !oldStickToBottom) {
      this._scheduleViewportRefresh();
    }
    this._promptTextChangedForTest();
  }

  _promptTextChangedForTest(): void {
    // This method is sniffed in tests.
  }

  _isScrolledToBottom(): boolean {
    const distanceToPromptEditorBottom = this._messagesElement.scrollHeight - this._messagesElement.scrollTop -
        this._messagesElement.clientHeight - (this._prompt.belowEditorElement() as HTMLElement).offsetHeight;
    return distanceToPromptEditorBottom <= 2;
  }
}

const persistedHistorySize = 300;

export class ConsoleViewFilter {
  _filterChanged: () => void;
  _messageLevelFiltersSetting: Common.Settings.Setting<LevelsMask>;
  _hideNetworkMessagesSetting: Common.Settings.Setting<boolean>;
  _filterByExecutionContextSetting: Common.Settings.Setting<boolean>;
  _suggestionBuilder: UI.FilterSuggestionBuilder.FilterSuggestionBuilder;
  _textFilterUI: UI.Toolbar.ToolbarInput;
  _textFilterSetting: Common.Settings.Setting<string>;
  _filterParser: TextUtils.TextUtils.FilterParser;
  _currentFilter: ConsoleFilter;
  _levelLabels: Map<Protocol.Log.LogEntryLevel, string>;
  _levelMenuButton: UI.Toolbar.ToolbarButton;

  constructor(filterChangedCallback: () => void) {
    this._filterChanged = filterChangedCallback;

    this._messageLevelFiltersSetting = ConsoleViewFilter.levelFilterSetting();
    this._hideNetworkMessagesSetting = Common.Settings.Settings.instance().moduleSetting('hideNetworkMessages');
    this._filterByExecutionContextSetting =
        Common.Settings.Settings.instance().moduleSetting('selectedContextFilterEnabled');

    this._messageLevelFiltersSetting.addChangeListener(this._onFilterChanged.bind(this));
    this._hideNetworkMessagesSetting.addChangeListener(this._onFilterChanged.bind(this));
    this._filterByExecutionContextSetting.addChangeListener(this._onFilterChanged.bind(this));
    UI.Context.Context.instance().addFlavorChangeListener(
        SDK.RuntimeModel.ExecutionContext, this._onFilterChanged, this);

    const filterKeys = Object.values(FilterType);
    this._suggestionBuilder = new UI.FilterSuggestionBuilder.FilterSuggestionBuilder(filterKeys);
    this._textFilterUI = new UI.Toolbar.ToolbarInput(
        i18nString(UIStrings.filter), '', 0.2, 1, i18nString(UIStrings.egEventdCdnUrlacom),
        this._suggestionBuilder.completions.bind(this._suggestionBuilder), true);
    this._textFilterSetting = Common.Settings.Settings.instance().createSetting('console.textFilter', '');
    if (this._textFilterSetting.get()) {
      this._textFilterUI.setValue(this._textFilterSetting.get());
    }
    this._textFilterUI.addEventListener(UI.Toolbar.ToolbarInput.Event.TextChanged, () => {
      this._textFilterSetting.set(this._textFilterUI.value());
      this._onFilterChanged();
    });
    this._filterParser = new TextUtils.TextUtils.FilterParser(filterKeys);
    this._currentFilter = new ConsoleFilter('', [], null, this._messageLevelFiltersSetting.get());
    this._updateCurrentFilter();
    this._levelLabels = new Map(([
      [SDK.ConsoleModel.MessageLevel.Verbose, i18nString(UIStrings.verbose)],
      [SDK.ConsoleModel.MessageLevel.Info, i18nString(UIStrings.info)],
      [SDK.ConsoleModel.MessageLevel.Warning, i18nString(UIStrings.warnings)],
      [SDK.ConsoleModel.MessageLevel.Error, i18nString(UIStrings.errors)],
    ]));

    this._levelMenuButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.logLevels));
    this._levelMenuButton.turnIntoSelect();
    this._levelMenuButton.addEventListener(
        UI.Toolbar.ToolbarButton.Events.Click, this._showLevelContextMenu.bind(this));
    UI.ARIAUtils.markAsMenuButton(this._levelMenuButton.element);

    this._updateLevelMenuButtonText();
    this._messageLevelFiltersSetting.addChangeListener(this._updateLevelMenuButtonText.bind(this));
  }

  onMessageAdded(message: SDK.ConsoleModel.ConsoleMessage): void {
    if (message.type === SDK.ConsoleModel.MessageType.Command || message.type === SDK.ConsoleModel.MessageType.Result ||
        message.isGroupMessage()) {
      return;
    }
    if (message.context) {
      this._suggestionBuilder.addItem(FilterType.Context, message.context);
    }
    if (message.source) {
      this._suggestionBuilder.addItem(FilterType.Source, message.source);
    }
    if (message.url) {
      this._suggestionBuilder.addItem(FilterType.Url, message.url);
    }
  }

  setLevelMenuOverridden(overridden: boolean): void {
    this._levelMenuButton.setEnabled(!overridden);
    if (overridden) {
      this._levelMenuButton.setTitle(i18nString(UIStrings.overriddenByFilterSidebar));
    } else {
      this._updateLevelMenuButtonText();
    }
  }

  static levelFilterSetting(): Common.Settings.Setting<LevelsMask> {
    return Common.Settings.Settings.instance().createSetting(
        'messageLevelFilters', ConsoleFilter.defaultLevelsFilterValue());
  }

  _updateCurrentFilter(): void {
    const parsedFilters = this._filterParser.parse(this._textFilterUI.value());
    if (this._hideNetworkMessagesSetting.get()) {
      parsedFilters.push(
          {key: FilterType.Source, text: SDK.ConsoleModel.MessageSource.Network, negative: true, regex: undefined});
    }

    this._currentFilter.executionContext = this._filterByExecutionContextSetting.get() ?
        UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext) :
        null;
    this._currentFilter.parsedFilters = parsedFilters;
    this._currentFilter.levelsMask = this._messageLevelFiltersSetting.get();
  }

  _onFilterChanged(): void {
    this._updateCurrentFilter();
    this._filterChanged();
  }

  _updateLevelMenuButtonText(): void {
    let isAll = true;
    let isDefault = true;
    const allValue = ConsoleFilter.allLevelsFilterValue();
    const defaultValue = ConsoleFilter.defaultLevelsFilterValue();

    let text: Common.UIString.LocalizedString|null = null;
    const levels = this._messageLevelFiltersSetting.get();
    for (const name of Object.values(SDK.ConsoleModel.MessageLevel)) {
      isAll = isAll && levels[name] === allValue[name];
      isDefault = isDefault && levels[name] === defaultValue[name];
      if (levels[name]) {
        text =
            text ? i18nString(UIStrings.customLevels) : i18nString(UIStrings.sOnly, {PH1: this._levelLabels.get(name)});
      }
    }
    if (isAll) {
      text = i18nString(UIStrings.allLevels);
    } else if (isDefault) {
      text = i18nString(UIStrings.defaultLevels);
    } else {
      text = text || i18nString(UIStrings.hideAll);
    }
    this._levelMenuButton.element.classList.toggle('warning', !isAll && !isDefault);
    this._levelMenuButton.setText(text);
    this._levelMenuButton.setTitle(i18nString(UIStrings.logLevelS, {PH1: text}));
  }

  _showLevelContextMenu(event: Common.EventTarget.EventTargetEvent): void {
    const mouseEvent = (event.data as Event);
    const setting = this._messageLevelFiltersSetting;
    const levels = setting.get();

    const contextMenu = new UI.ContextMenu.ContextMenu(
        mouseEvent, true, this._levelMenuButton.element.totalOffsetLeft(),
        this._levelMenuButton.element.totalOffsetTop() + (this._levelMenuButton.element as HTMLElement).offsetHeight);
    contextMenu.headerSection().appendItem(
        i18nString(UIStrings.default), () => setting.set(ConsoleFilter.defaultLevelsFilterValue()));
    for (const [level, levelText] of this._levelLabels.entries()) {
      contextMenu.defaultSection().appendCheckboxItem(levelText, toggleShowLevel.bind(null, level), levels[level]);
    }
    contextMenu.show();

    function toggleShowLevel(level: string): void {
      levels[level] = !levels[level];
      setting.set(levels);
    }
  }

  addMessageURLFilter(url: string): void {
    if (!url) {
      return;
    }
    const suffix = this._textFilterUI.value() ? ` ${this._textFilterUI.value()}` : '';
    this._textFilterUI.setValue(`-url:${url}${suffix}`);
    this._textFilterSetting.set(this._textFilterUI.value());
    this._onFilterChanged();
  }

  shouldBeVisible(viewMessage: ConsoleViewMessage): boolean {
    return this._currentFilter.shouldBeVisible(viewMessage);
  }

  clear(): void {
    this._suggestionBuilder.clear();
  }

  reset(): void {
    this._messageLevelFiltersSetting.set(ConsoleFilter.defaultLevelsFilterValue());
    this._filterByExecutionContextSetting.set(false);
    this._hideNetworkMessagesSetting.set(false);
    this._textFilterUI.setValue('');
    this._onFilterChanged();
  }
}

export class ConsoleGroup {
  _parentGroup: ConsoleGroup|null;
  _nestingLevel: number;
  _messagesHidden: boolean;

  constructor(parentGroup: ConsoleGroup|null, groupMessage: ConsoleGroupViewMessage|null) {
    this._parentGroup = parentGroup;
    this._nestingLevel = parentGroup ? parentGroup.nestingLevel() + 1 : 0;
    this._messagesHidden =
        groupMessage && groupMessage.collapsed() || this._parentGroup && this._parentGroup.messagesHidden() || false;
  }

  static createTopGroup(): ConsoleGroup {
    return new ConsoleGroup(null, null);
  }

  messagesHidden(): boolean {
    return this._messagesHidden;
  }

  nestingLevel(): number {
    return this._nestingLevel;
  }

  parentGroup(): ConsoleGroup|null {
    return this._parentGroup;
  }
}

let actionDelegateInstance: ActionDelegate;

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(_context: UI.Context.Context, actionId: string): boolean {
    switch (actionId) {
      case 'console.show':
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.bringToFront();
        Common.Console.Console.instance().show();
        ConsoleView.instance()._focusPrompt();
        return true;
      case 'console.clear':
        ConsoleView.clearConsole();
        return true;
      case 'console.clear.history':
        ConsoleView.instance()._clearHistory();
        return true;
      case 'console.create-pin':
        ConsoleView.instance()._pinPane.addPin('', true /* userGesture */);
        return true;
    }
    return false;
  }

  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): ActionDelegate {
    const {forceNew} = opts;
    if (!actionDelegateInstance || forceNew) {
      actionDelegateInstance = new ActionDelegate();
    }

    return actionDelegateInstance;
  }
}

const messagesSortedBySymbol = new WeakMap<ConsoleViewMessage, number>();
const consoleMessageToViewMessage = new WeakMap<SDK.ConsoleModel.ConsoleMessage, ConsoleViewMessage>();
export interface RegexMatchRange {
  messageIndex: number;
  matchIndex: number;
}
