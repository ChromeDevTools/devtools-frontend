// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

export const UIStrings = {
  /**
  *@description Text to enable blocking of network requests
  */
  enableNetworkRequestBlocking: 'Enable network request blocking',
  /**
  *@description Tooltip text that appears when hovering over the largeicon add button in the Blocked URLs Pane of the Network panel
  */
  addPattern: 'Add pattern',
  /**
  *@description Tooltip text that appears when hovering over the largeicon clear button in the Blocked URLs Pane of the Network panel
  */
  removeAllPatterns: 'Remove all patterns',
  /**
  *@description Accessible label for the button to add request blocking patterns in the network request blocking tool
  */
  addNetworkRequestBlockingPattern: 'Add network request blocking pattern',
  /**
  *@description Button to add a pattern to block netwrok requests in the Network request blocking tool
  *@example {Add pattern} PH1
  */
  networkRequestsAreNotBlockedS: 'Network requests are not blocked. {PH1}',
  /**
  *@description Text in Blocked URLs Pane of the Network panel
  *@example {4} PH1
  */
  dBlocked: '{PH1} blocked',
  /**
  *@description Text in Blocked URLs Pane of the Network panel
  */
  textPatternToBlockMatching: 'Text pattern to block matching requests; use * for wildcard',
  /**
  *@description Error text for empty list widget input in Request Blocking tool
  */
  patternInputCannotBeEmpty: 'Pattern input cannot be empty.',
  /**
  *@description Error text for duplicate list widget input in Request Blocking tool
  */
  patternAlreadyExists: 'Pattern already exists.',
};
const str_ = i18n.i18n.registerUIStrings('network/BlockedURLsPane.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/** @type {?BlockedURLsPane} */
export let blockedURLsPaneInstance = null;

/**
 * @implements {UI.ListWidget.Delegate<SDK.NetworkManager.BlockedPattern>}
 */
export class BlockedURLsPane extends UI.Widget.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('network/blockedURLsPane.css', {enableLegacyPatching: false});

    this._manager = SDK.NetworkManager.MultitargetNetworkManager.instance();
    this._manager.addEventListener(SDK.NetworkManager.MultitargetNetworkManager.Events.BlockedPatternsChanged, () => {
      this._update();
    }, this);

    this._toolbar = new UI.Toolbar.Toolbar('', this.contentElement);
    this._enabledCheckbox = new UI.Toolbar.ToolbarCheckbox(
        i18nString(UIStrings.enableNetworkRequestBlocking), undefined, this._toggleEnabled.bind(this));
    this._toolbar.appendToolbarItem(this._enabledCheckbox);
    this._toolbar.appendSeparator();
    const addButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.addPattern), 'largeicon-add');
    addButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._addButtonClicked, this);
    this._toolbar.appendToolbarItem(addButton);
    const clearButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.removeAllPatterns), 'largeicon-clear');
    clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._removeAll, this);
    this._toolbar.appendToolbarItem(clearButton);

    /** @type {!UI.ListWidget.ListWidget<!SDK.NetworkManager.BlockedPattern>} */
    this._list = new UI.ListWidget.ListWidget(this);
    this._list.element.classList.add('blocked-urls');
    this._list.registerRequiredCSS('network/blockedURLsPane.css', {enableLegacyPatching: false});
    this._list.setEmptyPlaceholder(this._createEmptyPlaceholder());
    this._list.show(this.contentElement);

    /** @type {?UI.ListWidget.Editor<!SDK.NetworkManager.BlockedPattern>} */
    this._editor = null;

    /** @type {!Map<string, number>} */
    this._blockedCountForUrl = new Map();
    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.NetworkManager.NetworkManager, SDK.NetworkManager.Events.RequestFinished, this._onRequestFinished, this);

    this._updateThrottler = new Common.Throttler.Throttler(200);

    this._update();
  }

  /**
   * @param {{forceNew: ?boolean}} opts
   */
  static instance(opts = {forceNew: null}) {
    const {forceNew} = opts;
    if (!blockedURLsPaneInstance || forceNew) {
      blockedURLsPaneInstance = new BlockedURLsPane();
    }
    return blockedURLsPaneInstance;
  }

  /**
   * @return {!Element}
   */
  _createEmptyPlaceholder() {
    const element = this.contentElement.createChild('div', 'no-blocked-urls');
    const addButton =
        UI.UIUtils.createTextButton(i18nString(UIStrings.addPattern), this._addButtonClicked.bind(this), 'add-button');
    UI.ARIAUtils.setAccessibleName(addButton, i18nString(UIStrings.addNetworkRequestBlockingPattern));
    element.appendChild(
        i18n.i18n.getFormatLocalizedString(str_, UIStrings.networkRequestsAreNotBlockedS, {PH1: addButton}));
    return element;
  }

  static reset() {
    if (blockedURLsPaneInstance) {
      blockedURLsPaneInstance.reset();
    }
  }

  _addButtonClicked() {
    this._manager.setBlockingEnabled(true);
    this._list.addNewItem(0, {url: '', enabled: true});
  }

  /**
   * @override
   * @param {!SDK.NetworkManager.BlockedPattern} pattern
   * @param {boolean} editable
   * @return {!Element}
   */
  renderItem(pattern, editable) {
    const count = this._blockedRequestsCount(pattern.url);
    const element = document.createElement('div');
    element.classList.add('blocked-url');
    const checkbox = /** @type {!HTMLInputElement} */ (element.createChild('input', 'blocked-url-checkbox'));
    checkbox.type = 'checkbox';
    checkbox.checked = pattern.enabled;
    checkbox.disabled = !this._manager.blockingEnabled();
    element.createChild('div', 'blocked-url-label').textContent = pattern.url;
    element.createChild('div', 'blocked-url-count').textContent = i18nString(UIStrings.dBlocked, {PH1: count});
    element.addEventListener('click', event => this._togglePattern(pattern, event));
    checkbox.addEventListener('click', event => this._togglePattern(pattern, event));
    return element;
  }

  /**
   * @param {!SDK.NetworkManager.BlockedPattern} pattern
   * @param {!Event} event
   */
  _togglePattern(pattern, event) {
    event.consume(true);
    const patterns = this._manager.blockedPatterns();
    patterns.splice(patterns.indexOf(pattern), 1, {enabled: !pattern.enabled, url: pattern.url});
    this._manager.setBlockedPatterns(patterns);
  }

  _toggleEnabled() {
    this._manager.setBlockingEnabled(!this._manager.blockingEnabled());
    this._update();
  }

  /**
   * @override
   * @param {!SDK.NetworkManager.BlockedPattern} pattern
   * @param {number} index
   */
  removeItemRequested(pattern, index) {
    const patterns = this._manager.blockedPatterns();
    patterns.splice(index, 1);
    this._manager.setBlockedPatterns(patterns);
  }

  /**
   * @override
   * @param {!SDK.NetworkManager.BlockedPattern} pattern
   * @return {!UI.ListWidget.Editor<!SDK.NetworkManager.BlockedPattern>}
   */
  beginEdit(pattern) {
    this._editor = this._createEditor();
    this._editor.control('url').value = pattern.url;
    return this._editor;
  }

  /**
   * @override
   * @param {!SDK.NetworkManager.BlockedPattern} item
   * @param {!UI.ListWidget.Editor<!SDK.NetworkManager.BlockedPattern>} editor
   * @param {boolean} isNew
   */
  commitEdit(item, editor, isNew) {
    const url = editor.control('url').value;
    const patterns = this._manager.blockedPatterns();
    if (isNew) {
      patterns.push({enabled: true, url: url});
    } else {
      patterns.splice(patterns.indexOf(item), 1, {enabled: true, url: url});
    }

    this._manager.setBlockedPatterns(patterns);
  }

  /**
   * @return {!UI.ListWidget.Editor<!SDK.NetworkManager.BlockedPattern>}
   */
  _createEditor() {
    if (this._editor) {
      return this._editor;
    }

    const editor = new UI.ListWidget.Editor();
    const content = editor.contentElement();
    const titles = content.createChild('div', 'blocked-url-edit-row');
    titles.createChild('div').textContent = i18nString(UIStrings.textPatternToBlockMatching);
    const fields = content.createChild('div', 'blocked-url-edit-row');
    /**
     * @param {!SDK.NetworkManager.BlockedPattern} item
     * @param {number} index
     * @param {(!HTMLInputElement|!HTMLSelectElement)} input
     */
    const validator = (item, index, input) => {
      let valid = true;
      let errorMessage;
      if (!input.value) {
        errorMessage = i18nString(UIStrings.patternInputCannotBeEmpty);
        valid = false;
      } else if (this._manager.blockedPatterns().find(pattern => pattern.url === input.value)) {
        errorMessage = i18nString(UIStrings.patternAlreadyExists);
        valid = false;
      }
      return {valid, errorMessage};
    };
    const urlInput = editor.createInput('url', 'text', '', validator);
    fields.createChild('div', 'blocked-url-edit-value').appendChild(urlInput);
    return editor;
  }

  _removeAll() {
    this._manager.setBlockedPatterns([]);
  }

  /**
   * @return {!Promise<void>}
   */
  _update() {
    const enabled = this._manager.blockingEnabled();
    this._list.element.classList.toggle(
        'blocking-disabled', !enabled && Boolean(this._manager.blockedPatterns().length));
    this._enabledCheckbox.setChecked(enabled);
    this._list.clear();
    for (const pattern of this._manager.blockedPatterns()) {
      this._list.appendItem(pattern, true);
    }
    return Promise.resolve();
  }

  /**
   * @param {string} url
   * @return {number}
   */
  _blockedRequestsCount(url) {
    if (!url) {
      return 0;
    }

    let result = 0;
    for (const blockedUrl of this._blockedCountForUrl.keys()) {
      if (this._matches(url, blockedUrl)) {
        result += /** @type {number} */ (this._blockedCountForUrl.get(blockedUrl));
      }
    }
    return result;
  }

  /**
   * @param {string} pattern
   * @param {string} url
   * @return {boolean}
   */
  _matches(pattern, url) {
    let pos = 0;
    const parts = pattern.split('*');
    for (let index = 0; index < parts.length; index++) {
      const part = parts[index];
      if (!part.length) {
        continue;
      }
      pos = url.indexOf(part, pos);
      if (pos === -1) {
        return false;
      }
      pos += part.length;
    }
    return true;
  }

  reset() {
    this._blockedCountForUrl.clear();
    this._updateThrottler.schedule(this._update.bind(this));
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onRequestFinished(event) {
    const request = /** @type {!SDK.NetworkRequest.NetworkRequest} */ (event.data);
    if (request.wasBlocked()) {
      const count = this._blockedCountForUrl.get(request.url()) || 0;
      this._blockedCountForUrl.set(request.url(), count + 1);
      this._updateThrottler.schedule(this._update.bind(this));
    }
  }
}
