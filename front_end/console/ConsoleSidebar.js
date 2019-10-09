// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Console.ConsoleSidebar = class extends UI.VBox {
  /**
   * @param {!ProductRegistry.BadgePool} badgePool
   */
  constructor(badgePool) {
    super(true);
    this.setMinimumSize(125, 0);

    this._tree = new UI.TreeOutlineInShadow();
    this._tree.registerRequiredCSS('console/consoleSidebar.css');
    this._tree.addEventListener(UI.TreeOutline.Events.ElementSelected, this._selectionChanged.bind(this));
    this.contentElement.appendChild(this._tree.element);
    /** @type {?UI.TreeElement} */
    this._selectedTreeElement = null;
    /** @type {!Array<!Console.ConsoleSidebar.FilterTreeElement>} */
    this._treeElements = [];
    const selectedFilterSetting = Common.settings.createSetting('console.sidebarSelectedFilter', null);

    const Levels = SDK.ConsoleMessage.MessageLevel;
    const consoleAPIParsedFilters = [{
      key: Console.ConsoleFilter.FilterType.Source,
      text: SDK.ConsoleMessage.MessageSource.ConsoleAPI,
      negative: false
    }];
    this._appendGroup(
        Console.ConsoleSidebar._groupName.All, [], Console.ConsoleFilter.allLevelsFilterValue(),
        UI.Icon.create('mediumicon-list'), badgePool, selectedFilterSetting);
    this._appendGroup(
        Console.ConsoleSidebar._groupName.ConsoleAPI, consoleAPIParsedFilters,
        Console.ConsoleFilter.allLevelsFilterValue(), UI.Icon.create('mediumicon-account-circle'), badgePool,
        selectedFilterSetting);
    this._appendGroup(
        Console.ConsoleSidebar._groupName.Error, [], Console.ConsoleFilter.singleLevelMask(Levels.Error),
        UI.Icon.create('mediumicon-error-circle'), badgePool, selectedFilterSetting);
    this._appendGroup(
        Console.ConsoleSidebar._groupName.Warning, [], Console.ConsoleFilter.singleLevelMask(Levels.Warning),
        UI.Icon.create('mediumicon-warning-triangle'), badgePool, selectedFilterSetting);
    this._appendGroup(
        Console.ConsoleSidebar._groupName.Info, [], Console.ConsoleFilter.singleLevelMask(Levels.Info),
        UI.Icon.create('mediumicon-info-circle'), badgePool, selectedFilterSetting);
    this._appendGroup(
        Console.ConsoleSidebar._groupName.Verbose, [], Console.ConsoleFilter.singleLevelMask(Levels.Verbose),
        UI.Icon.create('mediumicon-bug'), badgePool, selectedFilterSetting);
    const selectedTreeElementName = selectedFilterSetting.get();
    const defaultTreeElement =
        this._treeElements.find(x => x.name() === selectedTreeElementName) || this._treeElements[0];
    defaultTreeElement.select();
  }

  /**
   * @param {string} name
   * @param {!Array<!TextUtils.FilterParser.ParsedFilter>} parsedFilters
   * @param {!Object<string, boolean>} levelsMask
   * @param {!Element} icon
   * @param {!ProductRegistry.BadgePool} badgePool
   * @param {!Common.Setting} selectedFilterSetting
   */
  _appendGroup(name, parsedFilters, levelsMask, icon, badgePool, selectedFilterSetting) {
    const filter = new Console.ConsoleFilter(name, parsedFilters, null, levelsMask);
    const treeElement = new Console.ConsoleSidebar.FilterTreeElement(filter, icon, badgePool, selectedFilterSetting);
    this._tree.appendChild(treeElement);
    this._treeElements.push(treeElement);
  }

  clear() {
    for (const treeElement of this._treeElements) {
      treeElement.clear();
    }
  }

  /**
   * @param {!Console.ConsoleViewMessage} viewMessage
   */
  onMessageAdded(viewMessage) {
    for (const treeElement of this._treeElements) {
      treeElement.onMessageAdded(viewMessage);
    }
  }

  /**
   * @param {!Console.ConsoleViewMessage} viewMessage
   * @return {boolean}
   */
  shouldBeVisible(viewMessage) {
    if (!this._selectedTreeElement) {
      return true;
    }
    return this._selectedTreeElement._filter.shouldBeVisible(viewMessage);
  }

  /**
   * @param {!Common.Event} event
   */
  _selectionChanged(event) {
    this._selectedTreeElement = /** @type {!UI.TreeElement} */ (event.data);
    this.dispatchEventToListeners(Console.ConsoleSidebar.Events.FilterSelected);
  }
};

/** @enum {symbol} */
Console.ConsoleSidebar.Events = {
  FilterSelected: Symbol('FilterSelected')
};

Console.ConsoleSidebar.URLGroupTreeElement = class extends UI.TreeElement {
  /**
   * @param {!Console.ConsoleFilter} filter
   * @param {?Element} badge
   */
  constructor(filter, badge) {
    super(filter.name);
    this._filter = filter;
    this._countElement = this.listItemElement.createChild('span', 'count');
    const leadingIcons = [UI.Icon.create('largeicon-navigator-file')];
    if (badge) {
      leadingIcons.push(badge);
    }
    this.setLeadingIcons(leadingIcons);
    this._messageCount = 0;
  }

  incrementAndUpdateCounter() {
    this._messageCount++;
    this._countElement.textContent = this._messageCount;
  }
};

Console.ConsoleSidebar.FilterTreeElement = class extends UI.TreeElement {
  /**
   * @param {!Console.ConsoleFilter} filter
   * @param {!Element} icon
   * @param {!ProductRegistry.BadgePool} badgePool
   * @param {!Common.Setting} selectedFilterSetting
   */
  constructor(filter, icon, badgePool, selectedFilterSetting) {
    super(filter.name);
    this._filter = filter;
    this._badgePool = badgePool;
    this._selectedFilterSetting = selectedFilterSetting;
    /** @type {!Map<?string, !Console.ConsoleSidebar.URLGroupTreeElement>} */
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
      this.title = Console.ConsoleSidebar._groupNoMessageTitleMap.get(this._filter.name);
    } else if (this._messageCount === 1) {
      this.title = Console.ConsoleSidebar._groupSingularTitleMap.get(this._filter.name);
    } else {
      this.title =
          String.sprintf(Console.ConsoleSidebar._groupPluralTitleMap.get(this._filter.name), this._messageCount);
    }

    this.setExpandable(!!this.childCount());
  }

  /**
   * @param {!Console.ConsoleViewMessage} viewMessage
   */
  onMessageAdded(viewMessage) {
    const message = viewMessage.consoleMessage();
    const shouldIncrementCounter = message.type !== SDK.ConsoleMessage.MessageType.Command &&
        message.type !== SDK.ConsoleMessage.MessageType.Result && !message.isGroupMessage();
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
   * @return {!Console.ConsoleSidebar.URLGroupTreeElement}
   */
  _childElement(url) {
    const urlValue = url || null;
    let child = this._urlTreeElements.get(urlValue);
    if (child) {
      return child;
    }

    const filter = this._filter.clone();
    const parsedURL = urlValue ? urlValue.asParsedURL() : null;
    if (urlValue) {
      filter.name = parsedURL ? parsedURL.displayName : urlValue;
    } else {
      filter.name = Common.UIString('<other>');
    }
    filter.parsedFilters.push({key: Console.ConsoleFilter.FilterType.Url, text: urlValue, negative: false});
    const badge = parsedURL ? this._badgePool.badgeForURL(parsedURL) : null;
    child = new Console.ConsoleSidebar.URLGroupTreeElement(filter, badge);
    if (urlValue) {
      child.tooltip = urlValue;
    }
    this._urlTreeElements.set(urlValue, child);
    this.appendChild(child);
    return child;
  }
};

/** @enum {string} */
Console.ConsoleSidebar._groupName = {
  ConsoleAPI: 'user message',
  All: 'message',
  Error: 'error',
  Warning: 'warning',
  Info: 'info',
  Verbose: 'verbose'
};

/** @const {!Map<string, string>} */
Console.ConsoleSidebar._groupSingularTitleMap = new Map([
  [Console.ConsoleSidebar._groupName.ConsoleAPI, ls`1 user message`],
  [Console.ConsoleSidebar._groupName.All, ls`1 message`], [Console.ConsoleSidebar._groupName.Error, ls`1 error`],
  [Console.ConsoleSidebar._groupName.Warning, ls`1 warning`], [Console.ConsoleSidebar._groupName.Info, ls`1 info`],
  [Console.ConsoleSidebar._groupName.Verbose, ls`1 verbose`]
]);

/** @const {!Map<string, string>} */
Console.ConsoleSidebar._groupPluralTitleMap = new Map([
  [Console.ConsoleSidebar._groupName.ConsoleAPI, ls`%d user messages`],
  [Console.ConsoleSidebar._groupName.All, ls`%d messages`], [Console.ConsoleSidebar._groupName.Error, ls`%d errors`],
  [Console.ConsoleSidebar._groupName.Warning, ls`%d warnings`], [Console.ConsoleSidebar._groupName.Info, ls`%d info`],
  [Console.ConsoleSidebar._groupName.Verbose, ls`%d verbose`]
]);

/** @const {!Map<string, string>} */
Console.ConsoleSidebar._groupNoMessageTitleMap = new Map([
  [Console.ConsoleSidebar._groupName.ConsoleAPI, ls`No user messages`],
  [Console.ConsoleSidebar._groupName.All, ls`No messages`], [Console.ConsoleSidebar._groupName.Error, ls`No errors`],
  [Console.ConsoleSidebar._groupName.Warning, ls`No warnings`], [Console.ConsoleSidebar._groupName.Info, ls`No info`],
  [Console.ConsoleSidebar._groupName.Verbose, ls`No verbose`]
]);
