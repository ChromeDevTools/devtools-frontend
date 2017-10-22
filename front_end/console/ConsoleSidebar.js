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
    this._enabled = Runtime.experiments.isEnabled('logManagement');

    this._tree = new UI.TreeOutlineInShadow();
    this._tree.registerRequiredCSS('console/consoleSidebar.css');
    this._tree.addEventListener(UI.TreeOutline.Events.ElementSelected, this._selectionChanged.bind(this));
    this.contentElement.appendChild(this._tree.element);
    /** @type {?UI.TreeElement} */
    this._selectedTreeElement = null;
    /** @type {!Array<!Console.ConsoleSidebar.FilterTreeElement>} */
    this._treeElements = [];

    var Levels = ConsoleModel.ConsoleMessage.MessageLevel;
    var consoleAPIParsedFilters = [{
      key: Console.ConsoleFilter.FilterType.Source,
      text: ConsoleModel.ConsoleMessage.MessageSource.ConsoleAPI,
      negative: false
    }];
    this._appendGroup(
        Console.ConsoleSidebar._groupSingularName.All, [], Console.ConsoleFilter.allLevelsFilterValue(),
        UI.Icon.create('mediumicon-list'), badgePool);
    this._appendGroup(
        Console.ConsoleSidebar._groupSingularName.ConsoleAPI, consoleAPIParsedFilters,
        Console.ConsoleFilter.allLevelsFilterValue(), UI.Icon.create('mediumicon-account-circle'), badgePool);
    this._appendGroup(
        Console.ConsoleSidebar._groupSingularName.Error, [], Console.ConsoleFilter.singleLevelMask(Levels.Error),
        UI.Icon.create('mediumicon-error-circle'), badgePool);
    this._appendGroup(
        Console.ConsoleSidebar._groupSingularName.Warning, [], Console.ConsoleFilter.singleLevelMask(Levels.Warning),
        UI.Icon.create('mediumicon-warning-triangle'), badgePool);
    this._appendGroup(
        Console.ConsoleSidebar._groupSingularName.Info, [], Console.ConsoleFilter.singleLevelMask(Levels.Info),
        UI.Icon.create('mediumicon-info-circle'), badgePool);
    this._appendGroup(
        Console.ConsoleSidebar._groupSingularName.Verbose, [], Console.ConsoleFilter.singleLevelMask(Levels.Verbose),
        UI.Icon.create('mediumicon-bug'), badgePool);
    this._treeElements[0].select();
  }

  /**
   * @param {string} name
   * @param {!Array<!TextUtils.FilterParser.ParsedFilter>} parsedFilters
   * @param {!Object<string, boolean>} levelsMask
   * @param {!Element} icon
   * @param {!ProductRegistry.BadgePool} badgePool
   */
  _appendGroup(name, parsedFilters, levelsMask, icon, badgePool) {
    var filter = new Console.ConsoleFilter(name, parsedFilters, null, levelsMask);
    var treeElement = new Console.ConsoleSidebar.FilterTreeElement(filter, icon, badgePool);
    this._tree.appendChild(treeElement);
    this._treeElements.push(treeElement);
  }

  clear() {
    if (!this._enabled)
      return;
    for (var treeElement of this._treeElements)
      treeElement.clear();
  }

  /**
   * @param {!Console.ConsoleViewMessage} viewMessage
   */
  onMessageAdded(viewMessage) {
    if (!this._enabled)
      return;
    for (var treeElement of this._treeElements)
      treeElement.onMessageAdded(viewMessage);
  }

  /**
   * @param {!Console.ConsoleViewMessage} viewMessage
   * @return {boolean}
   */
  shouldBeVisible(viewMessage) {
    if (!this._enabled || !this._selectedTreeElement)
      return true;
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
    var leadingIcons = [UI.Icon.create('largeicon-navigator-file')];
    if (badge)
      leadingIcons.push(badge);
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
   */
  constructor(filter, icon, badgePool) {
    super(filter.name, true /* expandable */);
    this._filter = filter;
    this._badgePool = badgePool;
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

  _updateCounter() {
    var prefix = this._messageCount ? this._messageCount : Common.UIString('No');
    var pluralizedName = this._messageCount === 1 ? this._filter.name :
                                                    Console.ConsoleSidebar._groupPluralNameMap.get(this._filter.name);
    this.title = `${prefix} ${pluralizedName}`;
  }

  /**
   * @param {!Console.ConsoleViewMessage} viewMessage
   */
  onMessageAdded(viewMessage) {
    var message = viewMessage.consoleMessage();
    var shouldIncrementCounter = message.type !== ConsoleModel.ConsoleMessage.MessageType.Command &&
        message.type !== ConsoleModel.ConsoleMessage.MessageType.Result && !message.isGroupMessage();
    if (!this._filter.shouldBeVisible(viewMessage) || !shouldIncrementCounter)
      return;
    var child = this._childElement(message.url);
    child.incrementAndUpdateCounter();
    this._messageCount++;
    this._updateCounter();
  }

  /**
   * @param {string=} url
   * @return {!Console.ConsoleSidebar.URLGroupTreeElement}
   */
  _childElement(url) {
    var urlValue = url || null;
    var child = this._urlTreeElements.get(urlValue);
    if (child)
      return child;

    var filter = this._filter.clone();
    var parsedURL = urlValue ? urlValue.asParsedURL() : null;
    if (urlValue)
      filter.name = parsedURL ? parsedURL.displayName : urlValue;
    else
      filter.name = Common.UIString('<other>');
    filter.parsedFilters.push({key: Console.ConsoleFilter.FilterType.Url, text: urlValue, negative: false});
    var badge = parsedURL ? this._badgePool.badgeForURL(parsedURL) : null;
    child = new Console.ConsoleSidebar.URLGroupTreeElement(filter, badge);
    if (urlValue)
      child.tooltip = urlValue;
    this._urlTreeElements.set(urlValue, child);
    this.appendChild(child);
    return child;
  }
};

/** @enum {string} */
Console.ConsoleSidebar._groupSingularName = {
  ConsoleAPI: Common.UIString('user message'),
  All: Common.UIString('message'),
  Error: Common.UIString('error'),
  Warning: Common.UIString('warning'),
  Info: Common.UIString('info'),
  Verbose: Common.UIString('verbose')
};

/** @const {!Map<string, string>} */
Console.ConsoleSidebar._groupPluralNameMap = new Map([
  [Console.ConsoleSidebar._groupSingularName.ConsoleAPI, Common.UIString('user messages')],
  [Console.ConsoleSidebar._groupSingularName.All, Common.UIString('messages')],
  [Console.ConsoleSidebar._groupSingularName.Error, Common.UIString('errors')],
  [Console.ConsoleSidebar._groupSingularName.Warning, Common.UIString('warnings')],
  [Console.ConsoleSidebar._groupSingularName.Info, Common.UIString('info')],
  [Console.ConsoleSidebar._groupSingularName.Verbose, Common.UIString('verbose')]
]);
