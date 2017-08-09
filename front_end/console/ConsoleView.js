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
/**
 * @implements {UI.Searchable}
 * @implements {Console.ConsoleViewportProvider}
 * @unrestricted
 */
Console.ConsoleView = class extends UI.VBox {
  constructor() {
    super();
    this.setMinimumSize(0, 35);
    this.registerRequiredCSS('console/consoleView.css');

    this._searchableView = new UI.SearchableView(this);
    this._searchableView.setPlaceholder(Common.UIString('Find string in logs'));
    this._searchableView.setMinimalSearchQuerySize(0);
    this._sidebar = new Console.ConsoleSidebar();

    var toolbar = new UI.Toolbar('', this.element);
    if (Runtime.experiments.isEnabled('logManagement')) {
      this._splitWidget =
          new UI.SplitWidget(true /* isVertical */, false /* secondIsSidebar */, 'console.sidebar.width', 100);
      this._splitWidget.setMainWidget(this._searchableView);
      this._splitWidget.setSidebarWidget(this._sidebar);
      this._splitWidget.hideSidebar();
      this._splitWidget.show(this.element);
      toolbar.appendToolbarItem(this._splitWidget.createShowHideSidebarButton('console sidebar'));
    } else {
      this._searchableView.show(this.element);
    }
    this._contentsElement = this._searchableView.element;
    this.element.classList.add('console-view');

    /** @type {!Array.<!Console.ConsoleViewMessage>} */
    this._visibleViewMessages = [];
    this._urlToMessageCount = {};
    this._hiddenByFilterCount = 0;

    /**
     * @type {!Array.<!Console.ConsoleView.RegexMatchRange>}
     */
    this._regexMatchRanges = [];
    this._filter = new Console.ConsoleViewFilter(this._updateMessageList.bind(this));

    this._consoleContextSelector = new Console.ConsoleContextSelector();

    this._filterStatusText = new UI.ToolbarText();
    this._filterStatusText.element.classList.add('dimmed');
    this._showSettingsPaneSetting = Common.settings.createSetting('consoleShowSettingsToolbar', false);
    this._showSettingsPaneButton = new UI.ToolbarSettingToggle(
        this._showSettingsPaneSetting, 'largeicon-settings-gear', Common.UIString('Console settings'));
    this._progressToolbarItem = new UI.ToolbarItem(createElement('div'));

    toolbar.appendToolbarItem(UI.Toolbar.createActionButton(
        /** @type {!UI.Action }*/ (UI.actionRegistry.action('console.clear'))));
    toolbar.appendSeparator();
    toolbar.appendToolbarItem(this._consoleContextSelector.toolbarItem());
    toolbar.appendSeparator();
    toolbar.appendToolbarItem(this._filter._textFilterUI);
    toolbar.appendToolbarItem(this._filter._levelMenuButton);
    toolbar.appendToolbarItem(this._filter._levelMenuButtonArrow);
    toolbar.appendToolbarItem(this._progressToolbarItem);
    toolbar.appendSpacer();
    toolbar.appendToolbarItem(this._filterStatusText);
    toolbar.appendSeparator();
    toolbar.appendToolbarItem(this._showSettingsPaneButton);

    this._preserveLogCheckbox = new UI.ToolbarSettingCheckbox(
        Common.moduleSetting('preserveConsoleLog'), Common.UIString('Do not clear log on page reload / navigation'),
        Common.UIString('Preserve log'));
    this._hideNetworkMessagesCheckbox = new UI.ToolbarSettingCheckbox(
        this._filter._hideNetworkMessagesSetting, this._filter._hideNetworkMessagesSetting.title(),
        Common.UIString('Hide network'));
    var filterByExecutionContextCheckbox = new UI.ToolbarSettingCheckbox(
        this._filter._filterByExecutionContextSetting,
        Common.UIString('Only show messages from the current context (top, iframe, worker, extension)'),
        Common.UIString('Selected context only'));
    var filterConsoleAPICheckbox = new UI.ToolbarSettingCheckbox(
        Common.moduleSetting('consoleAPIFilterEnabled'), Common.UIString('Only show messages from console API methods'),
        Common.UIString('User messages only'));
    var monitoringXHREnabledSetting = Common.moduleSetting('monitoringXHREnabled');
    this._timestampsSetting = Common.moduleSetting('consoleTimestampsEnabled');
    this._consoleHistoryAutocompleteSetting = Common.moduleSetting('consoleHistoryAutocomplete');

    var settingsPane = new UI.HBox();
    settingsPane.show(this._contentsElement);
    settingsPane.element.classList.add('console-settings-pane');

    var settingsToolbarLeft = new UI.Toolbar('', settingsPane.element);
    settingsToolbarLeft.makeVertical();
    settingsToolbarLeft.appendToolbarItem(this._hideNetworkMessagesCheckbox);
    settingsToolbarLeft.appendToolbarItem(this._preserveLogCheckbox);
    settingsToolbarLeft.appendToolbarItem(filterByExecutionContextCheckbox);
    settingsToolbarLeft.appendToolbarItem(filterConsoleAPICheckbox);

    var settingsToolbarRight = new UI.Toolbar('', settingsPane.element);
    settingsToolbarRight.makeVertical();
    settingsToolbarRight.appendToolbarItem(new UI.ToolbarSettingCheckbox(monitoringXHREnabledSetting));
    settingsToolbarRight.appendToolbarItem(new UI.ToolbarSettingCheckbox(this._timestampsSetting));
    settingsToolbarRight.appendToolbarItem(new UI.ToolbarSettingCheckbox(this._consoleHistoryAutocompleteSetting));
    if (!this._showSettingsPaneSetting.get())
      settingsPane.element.classList.add('hidden');
    this._showSettingsPaneSetting.addChangeListener(
        () => settingsPane.element.classList.toggle('hidden', !this._showSettingsPaneSetting.get()));

    this._viewport = new Console.ConsoleViewport(this);
    this._viewport.setStickToBottom(true);
    this._viewport.contentElement().classList.add('console-group', 'console-group-messages');
    this._contentsElement.appendChild(this._viewport.element);
    this._messagesElement = this._viewport.element;
    this._messagesElement.id = 'console-messages';
    this._messagesElement.classList.add('monospace');
    this._messagesElement.addEventListener('click', this._messagesClicked.bind(this), true);

    this._viewportThrottler = new Common.Throttler(50);

    this._topGroup = Console.ConsoleGroup.createTopGroup();
    this._currentGroup = this._topGroup;

    this._promptElement = this._messagesElement.createChild('div', 'source-code');
    var promptIcon = UI.Icon.create('smallicon-text-prompt', 'console-prompt-icon');
    this._promptElement.appendChild(promptIcon);
    this._promptElement.id = 'console-prompt';

    // FIXME: This is a workaround for the selection machinery bug. See crbug.com/410899
    var selectAllFixer = this._messagesElement.createChild('div', 'console-view-fix-select-all');
    selectAllFixer.textContent = '.';

    this._registerShortcuts();

    this._messagesElement.addEventListener('contextmenu', this._handleContextMenuEvent.bind(this), false);

    this._linkifier = new Components.Linkifier(Console.ConsoleViewMessage.MaxLengthForLinks);
    this._badgePool = new ProductRegistry.BadgePool();

    /** @type {!Array.<!Console.ConsoleViewMessage>} */
    this._consoleMessages = [];
    this._viewMessageSymbol = Symbol('viewMessage');

    this._consoleHistorySetting = Common.settings.createLocalSetting('consoleHistory', []);

    this._prompt = new Console.ConsolePrompt();
    this._prompt.show(this._promptElement);
    this._prompt.element.addEventListener('keydown', this._promptKeyDown.bind(this), true);
    this._prompt.addEventListener(Console.ConsolePrompt.Events.TextChanged, this._promptTextChanged, this);

    this._consoleHistoryAutocompleteSetting.addChangeListener(this._consoleHistoryAutocompleteChanged, this);

    var historyData = this._consoleHistorySetting.get();
    this._prompt.history().setHistoryData(historyData);
    this._consoleHistoryAutocompleteChanged();

    this._updateFilterStatus();
    this._timestampsSetting.addChangeListener(this._consoleTimestampsSettingChanged, this);

    this._registerWithMessageSink();

    UI.context.addFlavorChangeListener(SDK.ExecutionContext, this._executionContextChanged, this);

    this._messagesElement.addEventListener('mousedown', this._updateStickToBottomOnMouseDown.bind(this), false);
    this._messagesElement.addEventListener('mouseup', this._updateStickToBottomOnMouseUp.bind(this), false);
    this._messagesElement.addEventListener('mouseleave', this._updateStickToBottomOnMouseUp.bind(this), false);
    this._messagesElement.addEventListener('wheel', this._updateStickToBottomOnWheel.bind(this), false);

    this._sidebar.addEventListener(Console.ConsoleSidebar.Events.ContextSelected, event => {
      this._filter.setContext(/** @type {string|symbol} */ (event.data));
    });

    ConsoleModel.consoleModel.addEventListener(
        ConsoleModel.ConsoleModel.Events.ConsoleCleared, this._consoleCleared, this);
    ConsoleModel.consoleModel.addEventListener(
        ConsoleModel.ConsoleModel.Events.MessageAdded, this._onConsoleMessageAdded, this);
    ConsoleModel.consoleModel.addEventListener(
        ConsoleModel.ConsoleModel.Events.MessageUpdated, this._onConsoleMessageUpdated, this);
    ConsoleModel.consoleModel.addEventListener(
        ConsoleModel.ConsoleModel.Events.CommandEvaluated, this._commandEvaluated, this);
    ConsoleModel.consoleModel.messages().forEach(this._addConsoleMessage, this);
  }

  /**
   * @return {!Console.ConsoleView}
   */
  static instance() {
    if (!Console.ConsoleView._instance)
      Console.ConsoleView._instance = new Console.ConsoleView();
    return Console.ConsoleView._instance;
  }

  static clearConsole() {
    ConsoleModel.consoleModel.requestClearMessages();
  }

  /**
   * @return {!UI.SearchableView}
   */
  searchableView() {
    return this._searchableView;
  }

  _clearHistory() {
    this._consoleHistorySetting.set([]);
    this._prompt.history().setHistoryData([]);
  }

  _consoleHistoryAutocompleteChanged() {
    this._prompt.setAddCompletionsFromHistory(this._consoleHistoryAutocompleteSetting.get());
  }

  /**
   * @override
   * @return {number}
   */
  itemCount() {
    return this._visibleViewMessages.length;
  }

  /**
   * @override
   * @param {number} index
   * @return {?Console.ConsoleViewportElement}
   */
  itemElement(index) {
    return this._visibleViewMessages[index];
  }

  /**
   * @override
   * @param {number} index
   * @return {number}
   */
  fastHeight(index) {
    return this._visibleViewMessages[index].fastHeight();
  }

  /**
   * @override
   * @return {number}
   */
  minimumRowHeight() {
    return 16;
  }

  _registerWithMessageSink() {
    Common.console.messages().forEach(this._addSinkMessage, this);
    Common.console.addEventListener(Common.Console.Events.MessageAdded, messageAdded, this);

    /**
     * @param {!Common.Event} event
     * @this {Console.ConsoleView}
     */
    function messageAdded(event) {
      this._addSinkMessage(/** @type {!Common.Console.Message} */ (event.data));
    }
  }

  /**
   * @param {!Common.Console.Message} message
   */
  _addSinkMessage(message) {
    var level = ConsoleModel.ConsoleMessage.MessageLevel.Verbose;
    switch (message.level) {
      case Common.Console.MessageLevel.Info:
        level = ConsoleModel.ConsoleMessage.MessageLevel.Info;
        break;
      case Common.Console.MessageLevel.Error:
        level = ConsoleModel.ConsoleMessage.MessageLevel.Error;
        break;
      case Common.Console.MessageLevel.Warning:
        level = ConsoleModel.ConsoleMessage.MessageLevel.Warning;
        break;
    }

    var consoleMessage = new ConsoleModel.ConsoleMessage(
        null, ConsoleModel.ConsoleMessage.MessageSource.Other, level, message.text, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, message.timestamp);
    this._addConsoleMessage(consoleMessage);
  }

  _consoleTimestampsSettingChanged() {
    this._updateMessageList();
    this._consoleMessages.forEach(viewMessage => viewMessage.updateTimestamp());
  }

  _executionContextChanged() {
    this._prompt.clearAutocomplete();
    if (this._filter._filterByExecutionContextSetting.get())
      this._updateMessageList();
  }

  /**
   * @override
   */
  willHide() {
    this._hidePromptSuggestBox();
  }

  /**
   * @override
   */
  wasShown() {
    this._viewport.refresh();
  }

  /**
   * @override
   */
  focus() {
    if (!this._prompt.hasFocus())
      this._prompt.focus();
  }

  /**
   * @override
   */
  restoreScrollPositions() {
    if (this._viewport.stickToBottom())
      this._immediatelyScrollToBottom();
    else
      super.restoreScrollPositions();
  }

  /**
   * @override
   */
  onResize() {
    this._scheduleViewportRefresh();
    this._hidePromptSuggestBox();
    if (this._viewport.stickToBottom())
      this._immediatelyScrollToBottom();
    for (var i = 0; i < this._visibleViewMessages.length; ++i)
      this._visibleViewMessages[i].onResize();
  }

  _hidePromptSuggestBox() {
    this._prompt.clearAutocomplete();
  }

  /**
   * @return {!Promise.<undefined>}
   */
  _invalidateViewport() {
    if (this._muteViewportUpdates) {
      this._maybeDirtyWhileMuted = true;
      return Promise.resolve();
    }
    if (this._needsFullUpdate) {
      this._updateMessageList();
      delete this._needsFullUpdate;
    } else {
      this._sidebar.refresh();
      this._viewport.invalidate();
    }
    return Promise.resolve();
  }

  _scheduleViewportRefresh() {
    if (this._muteViewportUpdates) {
      this._maybeDirtyWhileMuted = true;
      this._scheduleViewportRefreshForTest(true);
      return;
    } else {
      this._scheduleViewportRefreshForTest(false);
    }
    this._viewportThrottler.schedule(this._invalidateViewport.bind(this));
  }

  /**
   * @param {boolean} muted
   */
  _scheduleViewportRefreshForTest(muted) {
    // This functions is sniffed in tests.
  }

  _immediatelyScrollToBottom() {
    // This will scroll viewport and trigger its refresh.
    this._viewport.setStickToBottom(true);
    this._promptElement.scrollIntoView(true);
  }

  _updateFilterStatus() {
    this._filterStatusText.setText(Common.UIString(
        this._hiddenByFilterCount === 1 ? '1 item hidden by filters' :
                                          this._hiddenByFilterCount + ' items hidden by filters'));
    this._filterStatusText.setVisible(!!this._hiddenByFilterCount);
  }

  /**
   * @param {!Common.Event} event
   */
  _onConsoleMessageAdded(event) {
    var message = /** @type {!ConsoleModel.ConsoleMessage} */ (event.data);
    this._addConsoleMessage(message);
  }

  /**
   * @param {!ConsoleModel.ConsoleMessage} message
   */
  _addConsoleMessage(message) {
    var viewMessage = this._createViewMessage(message);
    message[this._viewMessageSymbol] = viewMessage;
    if (message.type === ConsoleModel.ConsoleMessage.MessageType.Command ||
        message.type === ConsoleModel.ConsoleMessage.MessageType.Result) {
      var lastMessage = this._consoleMessages.peekLast();
      viewMessage[Console.ConsoleView._messageSortingTimeSymbol] = lastMessage ? timeForSorting(lastMessage) : 0;
    }
    var insertAt = this._consoleMessages.upperBound(
        viewMessage, (viewMessage1, viewMessage2) => timeForSorting(viewMessage1) - timeForSorting(viewMessage2));
    var insertedInMiddle = insertAt < this._consoleMessages.length;
    this._consoleMessages.splice(insertAt, 0, viewMessage);

    if (this._urlToMessageCount[message.url])
      ++this._urlToMessageCount[message.url];
    else
      this._urlToMessageCount[message.url] = 1;

    if (!insertedInMiddle) {
      this._appendMessageToEnd(viewMessage);
      this._updateFilterStatus();
      this._searchableView.updateSearchMatchesCount(this._regexMatchRanges.length);
    } else {
      this._needsFullUpdate = true;
    }

    this._scheduleViewportRefresh();
    this._consoleMessageAddedForTest(viewMessage);

    /**
     * @param {!Console.ConsoleViewMessage} viewMessage
     * @return {number}
     */
    function timeForSorting(viewMessage) {
      return viewMessage[Console.ConsoleView._messageSortingTimeSymbol] || viewMessage.consoleMessage().timestamp;
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _onConsoleMessageUpdated(event) {
    var message = /** @type {!ConsoleModel.ConsoleMessage} */ (event.data);
    var viewMessage = message[this._viewMessageSymbol];
    if (viewMessage) {
      viewMessage.updateMessageElement();
      this._updateMessageList();
    }
  }

  /**
   * @param {!Console.ConsoleViewMessage} viewMessage
   */
  _consoleMessageAddedForTest(viewMessage) {
  }

  /**
   * @param {!Console.ConsoleViewMessage} viewMessage
   */
  _appendMessageToEnd(viewMessage) {
    var context = viewMessage.consoleMessage().context;
    if (context)
      this._sidebar.addGroup({name: context, context: context});

    if (!this._filter.shouldBeVisible(viewMessage)) {
      this._hiddenByFilterCount++;
      return;
    }

    if (this._tryToCollapseMessages(viewMessage, this._visibleViewMessages.peekLast()))
      return;

    var lastMessage = this._visibleViewMessages.peekLast();
    if (viewMessage.consoleMessage().type === ConsoleModel.ConsoleMessage.MessageType.EndGroup) {
      if (lastMessage && !this._currentGroup.messagesHidden())
        lastMessage.incrementCloseGroupDecorationCount();
      this._currentGroup = this._currentGroup.parentGroup() || this._currentGroup;
      return;
    }
    if (!this._currentGroup.messagesHidden()) {
      var originatingMessage = viewMessage.consoleMessage().originatingMessage();
      if (lastMessage && originatingMessage && lastMessage.consoleMessage() === originatingMessage)
        lastMessage.toMessageElement().classList.add('console-adjacent-user-command-result');

      this._visibleViewMessages.push(viewMessage);
      this._searchMessage(this._visibleViewMessages.length - 1);
    }

    if (viewMessage.consoleMessage().isGroupStartMessage())
      this._currentGroup = new Console.ConsoleGroup(this._currentGroup, viewMessage);

    this._messageAppendedForTests();
  }

  _messageAppendedForTests() {
    // This method is sniffed in tests.
  }

  /**
   * @param {!ConsoleModel.ConsoleMessage} message
   * @return {!Console.ConsoleViewMessage}
   */
  _createViewMessage(message) {
    var nestingLevel = this._currentGroup.nestingLevel();
    switch (message.type) {
      case ConsoleModel.ConsoleMessage.MessageType.Command:
        return new Console.ConsoleCommand(message, this._linkifier, this._badgePool, nestingLevel);
      case ConsoleModel.ConsoleMessage.MessageType.Result:
        return new Console.ConsoleCommandResult(message, this._linkifier, this._badgePool, nestingLevel);
      case ConsoleModel.ConsoleMessage.MessageType.StartGroupCollapsed:
      case ConsoleModel.ConsoleMessage.MessageType.StartGroup:
        return new Console.ConsoleGroupViewMessage(message, this._linkifier, this._badgePool, nestingLevel);
      default:
        return new Console.ConsoleViewMessage(message, this._linkifier, this._badgePool, nestingLevel);
    }
  }

  _consoleCleared() {
    this._currentMatchRangeIndex = -1;
    this._consoleMessages = [];
    this._sidebar.clear();
    this._updateMessageList();
    this._hidePromptSuggestBox();
    this._viewport.setStickToBottom(true);
    this._linkifier.reset();
    this._badgePool.reset();
  }

  _handleContextMenuEvent(event) {
    var contextMenu = new UI.ContextMenu(event);
    if (event.target.isSelfOrDescendant(this._promptElement)) {
      contextMenu.show();
      return;
    }

    function monitoringXHRItemAction() {
      Common.moduleSetting('monitoringXHREnabled').set(!Common.moduleSetting('monitoringXHREnabled').get());
    }
    contextMenu.appendCheckboxItem(
        Common.UIString('Log XMLHttpRequests'), monitoringXHRItemAction,
        Common.moduleSetting('monitoringXHREnabled').get());

    var sourceElement = event.target.enclosingNodeOrSelfWithClass('console-message-wrapper');
    var consoleMessage = sourceElement ? sourceElement.message.consoleMessage() : null;

    var filterSubMenu = contextMenu.appendSubMenuItem(Common.UIString('Filter'));

    if (consoleMessage && consoleMessage.url) {
      var menuTitle = Common.UIString('Hide messages from %s', new Common.ParsedURL(consoleMessage.url).displayName);
      filterSubMenu.appendItem(menuTitle, this._filter.addMessageURLFilter.bind(this._filter, consoleMessage.url));
    }

    filterSubMenu.appendSeparator();
    var unhideAll =
        filterSubMenu.appendItem(Common.UIString('Unhide all'), this._filter.removeMessageURLFilter.bind(this._filter));
    filterSubMenu.appendSeparator();

    var hasFilters = false;

    for (var url in this._filter.messageURLFilters()) {
      filterSubMenu.appendCheckboxItem(
          String.sprintf('%s (%d)', new Common.ParsedURL(url).displayName, this._urlToMessageCount[url]),
          this._filter.removeMessageURLFilter.bind(this._filter, url), true);
      hasFilters = true;
    }

    filterSubMenu.setEnabled(hasFilters || (consoleMessage && consoleMessage.url));
    unhideAll.setEnabled(hasFilters);

    contextMenu.appendSeparator();
    contextMenu.appendAction('console.clear');
    contextMenu.appendAction('console.clear.history');
    contextMenu.appendItem(Common.UIString('Save as...'), this._saveConsole.bind(this));

    var request = consoleMessage ? consoleMessage.request : null;
    if (request && SDK.NetworkManager.canReplayRequest(request)) {
      contextMenu.appendSeparator();
      contextMenu.appendItem(Common.UIString('Replay XHR'), SDK.NetworkManager.replayRequest.bind(null, request));
    }

    contextMenu.show();
  }

  async _saveConsole() {
    var url = SDK.targetManager.mainTarget().inspectedURL();
    var parsedURL = url.asParsedURL();
    var filename = String.sprintf('%s-%d.log', parsedURL ? parsedURL.host : 'console', Date.now());
    var stream = new Bindings.FileOutputStream();

    var progressIndicator = new UI.ProgressIndicator();
    progressIndicator.setTitle(Common.UIString('Writing file…'));
    progressIndicator.setTotalWork(this.itemCount());

    /** @const */
    var chunkSize = 350;

    if (!await stream.open(filename))
      return;
    this._progressToolbarItem.element.appendChild(progressIndicator.element);

    var messageIndex = 0;
    while (messageIndex < this.itemCount() && !progressIndicator.isCanceled()) {
      var messageContents = [];
      for (var i = 0; i < chunkSize && i + messageIndex < this.itemCount(); ++i) {
        var message = this.itemElement(messageIndex + i);
        messageContents.push(message.toExportString());
      }
      messageIndex += i;
      await stream.write(messageContents.join('\n') + '\n');
      progressIndicator.setWorked(messageIndex);
    }

    stream.close();
    progressIndicator.done();
  }

  /**
   * @param {!Console.ConsoleViewMessage} lastMessage
   * @param {?Console.ConsoleViewMessage=} viewMessage
   * @return {boolean}
   */
  _tryToCollapseMessages(lastMessage, viewMessage) {
    var timestampsShown = this._timestampsSetting.get();
    if (!timestampsShown && viewMessage && !lastMessage.consoleMessage().isGroupMessage() &&
        lastMessage.consoleMessage().isEqual(viewMessage.consoleMessage())) {
      viewMessage.incrementRepeatCount();
      return true;
    }

    return false;
  }

  _updateMessageList() {
    this._topGroup = Console.ConsoleGroup.createTopGroup();
    this._currentGroup = this._topGroup;
    this._regexMatchRanges = [];
    this._hiddenByFilterCount = 0;
    for (var i = 0; i < this._visibleViewMessages.length; ++i) {
      this._visibleViewMessages[i].resetCloseGroupDecorationCount();
      this._visibleViewMessages[i].resetIncrementRepeatCount();
    }
    this._visibleViewMessages = [];
    for (var i = 0; i < this._consoleMessages.length; ++i)
      this._appendMessageToEnd(this._consoleMessages[i]);
    this._updateFilterStatus();
    this._searchableView.updateSearchMatchesCount(this._regexMatchRanges.length);
    this._sidebar.refresh();
    this._viewport.invalidate();
  }

  /**
   * @param {!Event} event
   */
  _messagesClicked(event) {
    // Do not focus prompt if messages have selection.
    if (!this._messagesElement.hasSelection()) {
      var clickedOutsideMessageList = event.target === this._messagesElement;
      if (clickedOutsideMessageList)
        this._prompt.moveCaretToEndOfPrompt();
      this.focus();
    }
    var groupMessage = event.target.enclosingNodeOrSelfWithClass('console-group-title');
    if (!groupMessage)
      return;
    var consoleGroupViewMessage = groupMessage.parentElement.message;
    consoleGroupViewMessage.setCollapsed(!consoleGroupViewMessage.collapsed());
    this._updateMessageList();
  }

  _registerShortcuts() {
    this._shortcuts = {};

    var shortcut = UI.KeyboardShortcut;
    var section = UI.shortcutsScreen.section(Common.UIString('Console'));

    var shortcutL = shortcut.makeDescriptor('l', UI.KeyboardShortcut.Modifiers.Ctrl);
    var keys = [shortcutL];
    if (Host.isMac()) {
      var shortcutK = shortcut.makeDescriptor('k', UI.KeyboardShortcut.Modifiers.Meta);
      keys.unshift(shortcutK);
    }
    section.addAlternateKeys(keys, Common.UIString('Clear console'));

    keys = [shortcut.makeDescriptor(shortcut.Keys.Tab), shortcut.makeDescriptor(shortcut.Keys.Right)];
    section.addRelatedKeys(keys, Common.UIString('Accept suggestion'));

    var shortcutU = shortcut.makeDescriptor('u', UI.KeyboardShortcut.Modifiers.Ctrl);
    this._shortcuts[shortcutU.key] = this._clearPromptBackwards.bind(this);
    section.addAlternateKeys([shortcutU], Common.UIString('Clear console prompt'));

    keys = [shortcut.makeDescriptor(shortcut.Keys.Down), shortcut.makeDescriptor(shortcut.Keys.Up)];
    section.addRelatedKeys(keys, Common.UIString('Next/previous line'));

    if (Host.isMac()) {
      keys =
          [shortcut.makeDescriptor('N', shortcut.Modifiers.Alt), shortcut.makeDescriptor('P', shortcut.Modifiers.Alt)];
      section.addRelatedKeys(keys, Common.UIString('Next/previous command'));
    }

    section.addKey(shortcut.makeDescriptor(shortcut.Keys.Enter), Common.UIString('Execute command'));
  }

  _clearPromptBackwards() {
    this._prompt.setText('');
  }

  /**
   * @param {!Event} event
   */
  _promptKeyDown(event) {
    var keyboardEvent = /** @type {!KeyboardEvent} */ (event);
    if (keyboardEvent.key === 'PageUp') {
      this._updateStickToBottomOnWheel();
      return;
    }

    var shortcut = UI.KeyboardShortcut.makeKeyFromEvent(keyboardEvent);
    var handler = this._shortcuts[shortcut];
    if (handler) {
      handler();
      keyboardEvent.preventDefault();
    }
  }

  /**
   * @param {?SDK.RemoteObject} result
   * @param {!ConsoleModel.ConsoleMessage} originatingConsoleMessage
   * @param {!Protocol.Runtime.ExceptionDetails=} exceptionDetails
   */
  _printResult(result, originatingConsoleMessage, exceptionDetails) {
    if (!result)
      return;

    var level = !!exceptionDetails ? ConsoleModel.ConsoleMessage.MessageLevel.Error :
                                     ConsoleModel.ConsoleMessage.MessageLevel.Info;
    var message;
    if (!exceptionDetails) {
      message = new ConsoleModel.ConsoleMessage(
          result.runtimeModel(), ConsoleModel.ConsoleMessage.MessageSource.JS, level, '',
          ConsoleModel.ConsoleMessage.MessageType.Result, undefined, undefined, undefined, undefined, [result]);
    } else {
      message = ConsoleModel.ConsoleMessage.fromException(
          result.runtimeModel(), exceptionDetails, ConsoleModel.ConsoleMessage.MessageType.Result, undefined,
          undefined);
    }
    message.setOriginatingMessage(originatingConsoleMessage);
    ConsoleModel.consoleModel.addMessage(message);
  }

  /**
   * @param {!Common.Event} event
   */
  _commandEvaluated(event) {
    var data =
        /** @type {{result: ?SDK.RemoteObject, commandMessage: !ConsoleModel.ConsoleMessage, exceptionDetails: (!Protocol.Runtime.ExceptionDetails|undefined)}} */
        (event.data);
    this._prompt.history().pushHistoryItem(data.commandMessage.messageText);
    this._consoleHistorySetting.set(
        this._prompt.history().historyData().slice(-Console.ConsoleView.persistedHistorySize));
    this._printResult(data.result, data.commandMessage, data.exceptionDetails);
  }

  /**
   * @override
   * @return {!Array.<!Element>}
   */
  elementsToRestoreScrollPositionsFor() {
    return [this._messagesElement];
  }

  /**
   * @override
   */
  searchCanceled() {
    this._cleanupAfterSearch();
    for (var i = 0; i < this._visibleViewMessages.length; ++i) {
      var message = this._visibleViewMessages[i];
      message.setSearchRegex(null);
    }
    this._currentMatchRangeIndex = -1;
    this._regexMatchRanges = [];
    delete this._searchRegex;
    this._viewport.refresh();
  }

  /**
   * @override
   * @param {!UI.SearchableView.SearchConfig} searchConfig
   * @param {boolean} shouldJump
   * @param {boolean=} jumpBackwards
   */
  performSearch(searchConfig, shouldJump, jumpBackwards) {
    this.searchCanceled();
    this._searchableView.updateSearchMatchesCount(0);

    this._searchRegex = searchConfig.toSearchRegex(true);

    this._regexMatchRanges = [];
    this._currentMatchRangeIndex = -1;

    if (shouldJump)
      this._searchShouldJumpBackwards = !!jumpBackwards;

    this._searchProgressIndicator = new UI.ProgressIndicator();
    this._searchProgressIndicator.setTitle(Common.UIString('Searching…'));
    this._searchProgressIndicator.setTotalWork(this._visibleViewMessages.length);
    this._progressToolbarItem.element.appendChild(this._searchProgressIndicator.element);

    this._innerSearch(0);
  }

  _cleanupAfterSearch() {
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

  _searchFinishedForTests() {
    // This method is sniffed in tests.
  }

  /**
   * @param {number} index
   */
  _innerSearch(index) {
    delete this._innerSearchTimeoutId;
    if (this._searchProgressIndicator.isCanceled()) {
      this._cleanupAfterSearch();
      return;
    }

    var startTime = Date.now();
    for (; index < this._visibleViewMessages.length && Date.now() - startTime < 100; ++index)
      this._searchMessage(index);

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

    this._innerSearchTimeoutId = setTimeout(this._innerSearch.bind(this, index), 100);
    this._searchProgressIndicator.setWorked(index);
  }

  /**
   * @param {number} index
   */
  _searchMessage(index) {
    var message = this._visibleViewMessages[index];
    message.setSearchRegex(this._searchRegex);
    for (var i = 0; i < message.searchCount(); ++i)
      this._regexMatchRanges.push({messageIndex: index, matchIndex: i});
  }

  /**
   * @override
   */
  jumpToNextSearchResult() {
    this._jumpToMatch(this._currentMatchRangeIndex + 1);
  }

  /**
   * @override
   */
  jumpToPreviousSearchResult() {
    this._jumpToMatch(this._currentMatchRangeIndex - 1);
  }

  /**
   * @override
   * @return {boolean}
   */
  supportsCaseSensitiveSearch() {
    return true;
  }

  /**
   * @override
   * @return {boolean}
   */
  supportsRegexSearch() {
    return true;
  }

  /**
   * @param {number} index
   */
  _jumpToMatch(index) {
    if (!this._regexMatchRanges.length)
      return;

    var matchRange;
    if (this._currentMatchRangeIndex >= 0) {
      matchRange = this._regexMatchRanges[this._currentMatchRangeIndex];
      var message = this._visibleViewMessages[matchRange.messageIndex];
      message.searchHighlightNode(matchRange.matchIndex).classList.remove(UI.highlightedCurrentSearchResultClassName);
    }

    index = mod(index, this._regexMatchRanges.length);
    this._currentMatchRangeIndex = index;
    this._searchableView.updateCurrentMatchIndex(index);
    matchRange = this._regexMatchRanges[index];
    var message = this._visibleViewMessages[matchRange.messageIndex];
    var highlightNode = message.searchHighlightNode(matchRange.matchIndex);
    highlightNode.classList.add(UI.highlightedCurrentSearchResultClassName);
    this._viewport.scrollItemIntoView(matchRange.messageIndex);
    highlightNode.scrollIntoViewIfNeeded();
  }

  _updateStickToBottomOnMouseDown() {
    this._muteViewportUpdates = true;
    this._viewport.setStickToBottom(false);
    if (this._waitForScrollTimeout) {
      clearTimeout(this._waitForScrollTimeout);
      delete this._waitForScrollTimeout;
    }
  }

  _updateStickToBottomOnMouseUp() {
    if (!this._muteViewportUpdates)
      return;

    // Delay querying isScrolledToBottom to give time for smooth scroll
    // events to arrive. The value for the longest timeout duration is
    // retrieved from crbug.com/575409.
    this._waitForScrollTimeout = setTimeout(updateViewportState.bind(this), 200);

    /**
     * @this {!Console.ConsoleView}
     */
    function updateViewportState() {
      this._muteViewportUpdates = false;
      this._viewport.setStickToBottom(this._messagesElement.isScrolledToBottom());
      if (this._maybeDirtyWhileMuted) {
        this._scheduleViewportRefresh();
        delete this._maybeDirtyWhileMuted;
      }
      delete this._waitForScrollTimeout;
      this._updateViewportStickinessForTest();
    }
  }

  _updateViewportStickinessForTest() {
    // This method is sniffed in tests.
  }

  _updateStickToBottomOnWheel() {
    this._updateStickToBottomOnMouseDown();
    this._updateStickToBottomOnMouseUp();
  }

  _promptTextChanged() {
    // Scroll to the bottom, except when the prompt is the only visible item.
    if (this.itemCount() !== 0 && this._viewport.firstVisibleIndex() !== this.itemCount())
      this._immediatelyScrollToBottom();

    this._promptTextChangedForTest();
  }

  _promptTextChangedForTest() {
    // This method is sniffed in tests.
  }
};

Console.ConsoleView.persistedHistorySize = 300;

Console.ConsoleViewFilter = class {
  /**
   * @param {function()} filterChangedCallback
   */
  constructor(filterChangedCallback) {
    this._filterChanged = filterChangedCallback;
    this._context = Console.ConsoleSidebar.AllContextsFilter;

    this._messageURLFiltersSetting = Common.settings.createSetting('messageURLFilters', {});
    this._messageLevelFiltersSetting = Console.ConsoleViewFilter.levelFilterSetting();

    this._hideNetworkMessagesSetting = Common.moduleSetting('hideNetworkMessages');
    this._filterByExecutionContextSetting = Common.moduleSetting('selectedContextFilterEnabled');
    this._filterByConsoleAPISetting = Common.moduleSetting('consoleAPIFilterEnabled');

    this._messageURLFiltersSetting.addChangeListener(this._filterChanged);
    this._messageLevelFiltersSetting.addChangeListener(this._filterChanged);
    this._hideNetworkMessagesSetting.addChangeListener(this._filterChanged);
    this._filterByExecutionContextSetting.addChangeListener(this._filterChanged);
    this._filterByConsoleAPISetting.addChangeListener(this._filterChanged);

    this._textFilterUI = new UI.ToolbarInput(Common.UIString('Filter'), 0.2, 1, true);
    this._textFilterUI.addEventListener(UI.ToolbarInput.Event.TextChanged, this._textFilterChanged, this);
    this._filterText = this._textFilterUI.value();
    /** @type {?RegExp} */
    this._filterRegex = null;

    this._levelLabels = {};
    this._levelLabels[ConsoleModel.ConsoleMessage.MessageLevel.Verbose] = Common.UIString('Verbose');
    this._levelLabels[ConsoleModel.ConsoleMessage.MessageLevel.Info] = Common.UIString('Info');
    this._levelLabels[ConsoleModel.ConsoleMessage.MessageLevel.Warning] = Common.UIString('Warnings');
    this._levelLabels[ConsoleModel.ConsoleMessage.MessageLevel.Error] = Common.UIString('Errors');

    this._levelMenuButton = new UI.ToolbarText('');
    this._levelMenuButtonArrow = new UI.ToolbarItem(UI.Icon.create('smallicon-triangle-down'));
    this._levelMenuButton.element.addEventListener('click', this._showLevelContextMenu.bind(this));
    this._levelMenuButtonArrow.element.addEventListener('click', this._showLevelContextMenu.bind(this));

    this._updateLevelMenuButtonText();
    this._messageLevelFiltersSetting.addChangeListener(this._updateLevelMenuButtonText.bind(this));
  }

  /**
   * @return {!Common.Setting}
   */
  static levelFilterSetting() {
    return Common.settings.createSetting('messageLevelFilters', Console.ConsoleViewFilter.defaultLevelsFilterValue());
  }

  /**
   * @return {!Object<string, boolean>}
   */
  static allLevelsFilterValue() {
    var result = {};
    for (var name of Object.values(ConsoleModel.ConsoleMessage.MessageLevel))
      result[name] = true;
    return result;
  }

  /**
   * @return {!Object<string, boolean>}
   */
  static defaultLevelsFilterValue() {
    var result = Console.ConsoleViewFilter.allLevelsFilterValue();
    result[ConsoleModel.ConsoleMessage.MessageLevel.Verbose] = false;
    return result;
  }

  /**
   * @param {string|symbol} context
   */
  setContext(context) {
    if (this._context !== context) {
      this._context = context;
      this._filterChanged();
    }
  }

  _updateLevelMenuButtonText() {
    var isAll = true;
    var isDefault = true;
    var allValue = Console.ConsoleViewFilter.allLevelsFilterValue();
    var defaultValue = Console.ConsoleViewFilter.defaultLevelsFilterValue();

    var text = null;
    var levels = this._messageLevelFiltersSetting.get();
    for (var name of Object.values(ConsoleModel.ConsoleMessage.MessageLevel)) {
      isAll = isAll && levels[name] === allValue[name];
      isDefault = isDefault && levels[name] === defaultValue[name];
      if (levels[name])
        text = text ? Common.UIString('Custom levels') : Common.UIString('%s only', this._levelLabels[name]);
    }
    if (isAll)
      text = Common.UIString('All levels');
    else if (isDefault)
      text = Common.UIString('Default levels');
    else
      text = text || Common.UIString('Hide all');
    this._levelMenuButton.setText(text);
  }

  /**
   * @param {!Event} event
   */
  _showLevelContextMenu(event) {
    var setting = this._messageLevelFiltersSetting;
    var levels = setting.get();

    var contextMenu = new UI.ContextMenu(event, true);
    contextMenu.appendItem(
        Common.UIString('Default'), () => setting.set(Console.ConsoleViewFilter.defaultLevelsFilterValue()));
    contextMenu.appendSeparator();
    for (var level in this._levelLabels)
      contextMenu.appendCheckboxItem(this._levelLabels[level], toggleShowLevel.bind(null, level), levels[level]);
    contextMenu.show();

    /**
     * @param {string} level
     */
    function toggleShowLevel(level) {
      levels[level] = !levels[level];
      setting.set(levels);
    }
  }

  _textFilterChanged() {
    this._filterText = this._textFilterUI.value();
    this._filterRegex = null;
    if (this._filterText.startsWith('/') && this._filterText.endsWith('/')) {
      try {
        this._filterRegex = new RegExp(this._filterText.substring(1, this._filterText.length - 1), 'i');
      } catch (e) {
      }
    }
    this._filterChanged();
  }

  /**
   * @param {string} url
   */
  addMessageURLFilter(url) {
    var value = this._messageURLFiltersSetting.get();
    value[url] = true;
    this._messageURLFiltersSetting.set(value);
  }

  /**
   * @param {string} url
   */
  removeMessageURLFilter(url) {
    var value;
    if (url) {
      value = this._messageURLFiltersSetting.get();
      delete value[url];
    } else {
      value = {};
    }
    this._messageURLFiltersSetting.set(value);
  }

  /**
   * @returns {!Object}
   */
  messageURLFilters() {
    return this._messageURLFiltersSetting.get();
  }

  /**
   * @param {!Console.ConsoleViewMessage} viewMessage
   * @return {boolean}
   */
  shouldBeVisible(viewMessage) {
    var message = viewMessage.consoleMessage();
    var executionContext = UI.context.flavor(SDK.ExecutionContext);

    if (this._filterByExecutionContextSetting.get() && executionContext) {
      if (message.runtimeModel() !== executionContext.runtimeModel)
        return false;
      if (message.executionContextId && message.executionContextId !== executionContext.id)
        return false;
    }

    if (this._hideNetworkMessagesSetting.get() &&
        viewMessage.consoleMessage().source === ConsoleModel.ConsoleMessage.MessageSource.Network)
      return false;

    if (viewMessage.consoleMessage().isGroupMessage())
      return true;

    if (message.type === ConsoleModel.ConsoleMessage.MessageType.Result ||
        message.type === ConsoleModel.ConsoleMessage.MessageType.Command)
      return true;

    if (message.url && this._messageURLFiltersSetting.get()[message.url])
      return false;

    var levels = this._messageLevelFiltersSetting.get();
    if (!levels[message.level])
      return false;

    if (this._filterRegex) {
      if (!viewMessage.matchesFilterRegex(this._filterRegex))
        return false;
    } else if (this._filterText) {
      if (!viewMessage.matchesFilterText(this._filterText))
        return false;
    }

    if (this._filterByConsoleAPISetting.get() &&
        message.source !== ConsoleModel.ConsoleMessage.MessageSource.ConsoleAPI)
      return false;

    if (this._context !== Console.ConsoleSidebar.AllContextsFilter && message.context !== this._context)
      return false;

    return true;
  }

  reset() {
    this._context = Console.ConsoleSidebar.AllContextsFilter;
    this._messageURLFiltersSetting.set({});
    this._messageLevelFiltersSetting.set(Console.ConsoleViewFilter.defaultLevelsFilterValue());
    this._filterByExecutionContextSetting.set(false);
    this._filterByConsoleAPISetting.set(false);
    this._hideNetworkMessagesSetting.set(false);
    this._textFilterUI.setValue('');
    this._textFilterChanged();
  }
};

/**
 * @unrestricted
 */
Console.ConsoleCommand = class extends Console.ConsoleViewMessage {
  /**
   * @param {!ConsoleModel.ConsoleMessage} message
   * @param {!Components.Linkifier} linkifier
   * @param {!ProductRegistry.BadgePool} badgePool
   * @param {number} nestingLevel
   */
  constructor(message, linkifier, badgePool, nestingLevel) {
    super(message, linkifier, badgePool, nestingLevel);
  }

  /**
   * @override
   * @return {!Element}
   */
  contentElement() {
    if (!this._contentElement) {
      this._contentElement = createElementWithClass('div', 'console-user-command');
      var icon = UI.Icon.create('smallicon-user-command', 'command-result-icon');
      this._contentElement.appendChild(icon);

      this._contentElement.message = this;

      this._formattedCommand = createElementWithClass('span', 'source-code');
      this._formattedCommand.textContent = this.text.replaceControlCharacters();
      this._contentElement.appendChild(this._formattedCommand);

      if (this._formattedCommand.textContent.length < Console.ConsoleCommand.MaxLengthToIgnoreHighlighter) {
        var javascriptSyntaxHighlighter = new UI.SyntaxHighlighter('text/javascript', true);
        javascriptSyntaxHighlighter.syntaxHighlightNode(this._formattedCommand).then(this._updateSearch.bind(this));
      } else {
        this._updateSearch();
      }

      this.updateTimestamp();
    }
    return this._contentElement;
  }

  _updateSearch() {
    this.setSearchRegex(this.searchRegex());
  }
};

/**
 * The maximum length before strings are considered too long for syntax highlighting.
 * @const
 * @type {number}
 */
Console.ConsoleCommand.MaxLengthToIgnoreHighlighter = 10000;

Console.ConsoleCommandResult = class extends Console.ConsoleViewMessage {
  /**
   * @param {!ConsoleModel.ConsoleMessage} message
   * @param {!Components.Linkifier} linkifier
   * @param {!ProductRegistry.BadgePool} badgePool
   * @param {number} nestingLevel
   */
  constructor(message, linkifier, badgePool, nestingLevel) {
    super(message, linkifier, badgePool, nestingLevel);
  }

  /**
   * @override
   * @return {!Element}
   */
  contentElement() {
    var element = super.contentElement();
    if (!element.classList.contains('console-user-command-result')) {
      element.classList.add('console-user-command-result');
      if (this.consoleMessage().level === ConsoleModel.ConsoleMessage.MessageLevel.Info) {
        var icon = UI.Icon.create('smallicon-command-result', 'command-result-icon');
        element.insertBefore(icon, element.firstChild);
      }
    }
    return element;
  }
};

Console.ConsoleGroup = class {
  /**
   * @param {?Console.ConsoleGroup} parentGroup
   * @param {?Console.ConsoleViewMessage} groupMessage
   */
  constructor(parentGroup, groupMessage) {
    this._parentGroup = parentGroup;
    this._nestingLevel = parentGroup ? parentGroup.nestingLevel() + 1 : 0;
    this._messagesHidden =
        groupMessage && groupMessage.collapsed() || this._parentGroup && this._parentGroup.messagesHidden();
  }

  /**
   * @return {!Console.ConsoleGroup}
   */
  static createTopGroup() {
    return new Console.ConsoleGroup(null, null);
  }

  /**
   * @return {boolean}
   */
  messagesHidden() {
    return this._messagesHidden;
  }

  /**
   * @return {number}
   */
  nestingLevel() {
    return this._nestingLevel;
  }

  /**
   * @return {?Console.ConsoleGroup}
   */
  parentGroup() {
    return this._parentGroup;
  }
};

/**
 * @implements {UI.ActionDelegate}
 */
Console.ConsoleView.ActionDelegate = class {
  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    switch (actionId) {
      case 'console.show':
        InspectorFrontendHost.bringToFront();
        Common.console.show();
        return true;
      case 'console.clear':
        Console.ConsoleView.clearConsole();
        return true;
      case 'console.clear.history':
        Console.ConsoleView.instance()._clearHistory();
        return true;
    }
    return false;
  }
};

/**
 * @typedef {{messageIndex: number, matchIndex: number}}
 */
Console.ConsoleView.RegexMatchRange;

/** @type {symbol} */
Console.ConsoleView._messageSortingTimeSymbol = Symbol('messageSortingTime');
