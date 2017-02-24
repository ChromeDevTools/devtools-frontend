// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Network.BlockedURLsPane = class extends UI.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('network/blockedURLsPane.css');
    this.contentElement.classList.add('blocked-urls-pane');

    Network.BlockedURLsPane._instance = this;

    this._blockedURLsSetting = Common.moduleSetting('networkBlockedURLs');
    this._blockedURLsSetting.addChangeListener(this._update, this);

    this._toolbar = new UI.Toolbar('', this.contentElement);
    this._toolbar.element.addEventListener('click', e => e.consume());
    var addButton = new UI.ToolbarButton(Common.UIString('Add pattern'), 'largeicon-add');
    addButton.addEventListener(UI.ToolbarButton.Events.Click, this._addButtonClicked, this);
    this._toolbar.appendToolbarItem(addButton);
    var clearButton = new UI.ToolbarButton(Common.UIString('Remove all'), 'largeicon-clear');
    clearButton.addEventListener(UI.ToolbarButton.Events.Click, this._removeAll, this);
    this._toolbar.appendToolbarItem(clearButton);

    this._emptyElement = this.contentElement.createChild('div', 'no-blocked-urls');
    this._emptyElement.createChild('span').textContent = Common.UIString('Requests are not blocked. ');
    var addLink = this._emptyElement.createChild('span', 'link');
    addLink.textContent = Common.UIString('Add pattern.');
    addLink.href = '';
    addLink.addEventListener('click', this._addButtonClicked.bind(this), false);
    this._emptyElement.addEventListener('contextmenu', this._emptyElementContextMenu.bind(this), true);

    this._listElement = this.contentElement.createChild('div', 'blocked-urls-list');

    /** @type {!Map<string, number>} */
    this._blockedCountForUrl = new Map();
    SDK.targetManager.addModelListener(
        SDK.NetworkManager, SDK.NetworkManager.Events.RequestFinished, this._onRequestFinished, this);

    this._updateThrottler = new Common.Throttler(200);

    this._update();
  }

  static reset() {
    if (Network.BlockedURLsPane._instance)
      Network.BlockedURLsPane._instance.reset();
  }

  /**
   * @param {!Event} event
   */
  _emptyElementContextMenu(event) {
    var contextMenu = new UI.ContextMenu(event);
    contextMenu.appendItem(Common.UIString.capitalize('Add ^pattern'), this._addButtonClicked.bind(this));
    contextMenu.show();
  }

  _addButtonClicked() {
    this._emptyElement.classList.add('hidden');
    var element = this._createElement('', this._blockedURLsSetting.get().length);
    this._listElement.appendChild(element);
    element.scrollIntoViewIfNeeded();
    this._edit('', element, this._addBlockedURL.bind(this));
  }

  /**
   * @param {string} content
   * @param {!Element} element
   * @param {function(string)} onAccept
   * @private
   */
  _edit(content, element, onAccept) {
    this._editing = true;

    element.classList.add('blocked-url-editing');
    var input = element.createChild('input');
    input.setAttribute('type', 'text');
    input.value = content;
    input.placeholder = Common.UIString('Text pattern to block matching requests; use * for wildcard');
    input.addEventListener('blur', commit.bind(this), false);
    input.addEventListener('keydown', keydown.bind(this), false);
    input.focus();

    /**
     * @this {Network.BlockedURLsPane}
     */
    function finish() {
      this._editing = false;
      element.removeChild(input);
      element.classList.remove('blocked-url-editing');
    }

    /**
     * @this {Network.BlockedURLsPane}
     */
    function commit() {
      if (!this._editing)
        return;
      var text = input.value.trim();
      finish.call(this);
      if (text)
        onAccept(text);
      else
        this._update();
    }

    /**
     * @this {Network.BlockedURLsPane}
     * @param {!Event} event
     */
    function keydown(event) {
      if (isEnterKey(event)) {
        event.consume();
        commit.call(this);
      } else if (event.keyCode === UI.KeyboardShortcut.Keys.Esc.code || event.key === 'Escape') {
        event.consume();
        finish.call(this);
        this._update();
      }
    }
  }

  /**
   * @param {string} url
   */
  _addBlockedURL(url) {
    var blocked = this._blockedURLsSetting.get();
    blocked.push(url);
    this._blockedURLsSetting.set(blocked);
  }

  /**
   * @param {number} index
   */
  _removeBlockedURL(index) {
    var blocked = this._blockedURLsSetting.get();
    blocked.splice(index, 1);
    this._blockedURLsSetting.set(blocked);
  }

  /**
   * @param {number} index
   * @param {string} url
   */
  _changeBlockedURL(index, url) {
    var blocked = this._blockedURLsSetting.get();
    blocked.splice(index, 1, url);
    this._blockedURLsSetting.set(blocked);
  }

  _removeAll() {
    this._blockedURLsSetting.set([]);
  }

  /**
   * @param {number} index
   * @param {!Event} event
   */
  _contextMenu(index, event) {
    var contextMenu = new UI.ContextMenu(event);
    contextMenu.appendItem(Common.UIString.capitalize('Add ^pattern'), this._addButtonClicked.bind(this));
    contextMenu.appendItem(Common.UIString.capitalize('Remove ^pattern'), this._removeBlockedURL.bind(this, index));
    contextMenu.appendItem(Common.UIString.capitalize('Remove ^all'), this._removeAll.bind(this));
    contextMenu.show();
  }

  /**
   * @return {!Promise<?>}
   */
  _update() {
    if (this._editing)
      return Promise.resolve();

    this._listElement.removeChildren();
    var blocked = this._blockedURLsSetting.get();
    for (var index = 0; index < blocked.length; index++)
      this._listElement.appendChild(this._createElement(blocked[index], index));

    this._emptyElement.classList.toggle('hidden', !!blocked.length);
    return Promise.resolve();
  }

  /**
   * @param {string} url
   * @param {number} index
   * @return {!Element}
   */
  _createElement(url, index) {
    var element = createElementWithClass('div', 'blocked-url');

    var label = element.createChild('div', 'blocked-url-text');
    label.textContent = url;

    var count = this._blockedRequestsCount(url);
    var countElement = element.createChild('div', 'blocked-count monospace');
    countElement.textContent = String.sprintf('[%d]', count);
    countElement.title = Common.UIString(
        count === 1 ? '%d request blocked by this pattern' : '%d requests blocked by this pattern', count);

    var removeButton = UI.Icon.create('smallicon-cross', 'remove-icon');
    element.appendChild(removeButton);
    removeButton.title = Common.UIString('Remove');
    removeButton.addEventListener('click', this._removeBlockedURL.bind(this, index), false);

    element.addEventListener('contextmenu', this._contextMenu.bind(this, index), true);
    element.addEventListener(
        'dblclick', this._edit.bind(this, url, element, this._changeBlockedURL.bind(this, index)), false);
    return element;
  }

  /**
   * @param {string} url
   * @return {number}
   */
  _blockedRequestsCount(url) {
    if (!url)
      return 0;

    var result = 0;
    for (var blockedUrl of this._blockedCountForUrl.keys()) {
      if (this._matches(url, blockedUrl))
        result += this._blockedCountForUrl.get(blockedUrl);
    }
    return result;
  }

  /**
   * @param {string} pattern
   * @param {string} url
   * @return {boolean}
   */
  _matches(pattern, url) {
    var pos = 0;
    var parts = pattern.split('*');
    for (var index = 0; index < parts.length; index++) {
      var part = parts[index];
      if (!part.length)
        continue;
      pos = url.indexOf(part, pos);
      if (pos === -1)
        return false;
      pos += part.length;
    }
    return true;
  }

  reset() {
    this._blockedCountForUrl.clear();
  }

  /**
   * @param {!Common.Event} event
   */
  _onRequestFinished(event) {
    var request = /** @type {!SDK.NetworkRequest} */ (event.data);
    if (request.wasBlocked()) {
      var count = this._blockedCountForUrl.get(request.url()) || 0;
      this._blockedCountForUrl.set(request.url(), count + 1);
      this._updateThrottler.schedule(this._update.bind(this));
    }
  }
};

/** @type {?Network.BlockedURLsPane} */
Network.BlockedURLsPane._instance = null;


/**
 * @implements {UI.ActionDelegate}
 * @unrestricted
 */
Network.BlockedURLsPane.ActionDelegate = class {
  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    UI.viewManager.showView('network.blocked-urls');
    return true;
  }
};
