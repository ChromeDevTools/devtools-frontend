// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Logs from '../../models/logs/logs.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import blockedURLsPaneStyles from './blockedURLsPane.css.js';

const UIStrings = {
  /**
   *@description Text to enable blocking of network requests
   */
  enableNetworkRequestBlocking: 'Enable network request blocking',
  /**
   *@description Tooltip text that appears when hovering over the plus button in the Blocked URLs Pane of the Network panel
   */
  addPattern: 'Add pattern',
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
  /**
   *@description Message to be announced for a when list item is removed from list widget
   */
  itemDeleted: 'Item successfully deleted',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/BlockedURLsPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class BlockedURLsPane extends UI.Widget.VBox implements
    UI.ListWidget.Delegate<SDK.NetworkManager.BlockedPattern> {
  private manager: SDK.NetworkManager.MultitargetNetworkManager;
  private readonly toolbar: UI.Toolbar.Toolbar;
  private readonly enabledCheckbox: UI.Toolbar.ToolbarCheckbox;
  private readonly list: UI.ListWidget.ListWidget<SDK.NetworkManager.BlockedPattern>;
  private editor: UI.ListWidget.Editor<SDK.NetworkManager.BlockedPattern>|null;
  private blockedCountForUrl: Map<string, number>;

  constructor() {
    super(true);

    this.element.setAttribute('jslog', `${VisualLogging.panel('network.blocked-urls').track({resize: true})}`);

    this.manager = SDK.NetworkManager.MultitargetNetworkManager.instance();
    this.manager.addEventListener(
        SDK.NetworkManager.MultitargetNetworkManager.Events.BLOCKED_PATTERNS_CHANGED, this.update, this);

    this.toolbar = new UI.Toolbar.Toolbar('', this.contentElement);
    this.enabledCheckbox = new UI.Toolbar.ToolbarCheckbox(
        i18nString(UIStrings.enableNetworkRequestBlocking), undefined, this.toggleEnabled.bind(this),
        'network.enable-request-blocking');
    this.toolbar.appendToolbarItem(this.enabledCheckbox);
    this.toolbar.appendSeparator();
    this.toolbar.appendToolbarItem(
        UI.Toolbar.Toolbar.createActionButtonForId('network.add-network-request-blocking-pattern'));
    this.toolbar.appendToolbarItem(
        UI.Toolbar.Toolbar.createActionButtonForId('network.remove-all-network-request-blocking-patterns'));
    this.toolbar.element.setAttribute('jslog', `${VisualLogging.toolbar()}`);

    this.list = new UI.ListWidget.ListWidget(this);
    this.list.element.classList.add('blocked-urls');

    this.list.setEmptyPlaceholder(this.createEmptyPlaceholder());
    this.list.show(this.contentElement);

    this.editor = null;

    this.blockedCountForUrl = new Map();
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.NetworkManager.NetworkManager, SDK.NetworkManager.Events.RequestFinished, this.onRequestFinished, this,
        {scoped: true});

    this.update();
    Logs.NetworkLog.NetworkLog.instance().addEventListener(Logs.NetworkLog.Events.Reset, this.onNetworkLogReset, this);
  }

  private createEmptyPlaceholder(): Element {
    const element = this.contentElement.createChild('div', 'no-blocked-urls');
    const addButton = UI.UIUtils.createTextButton(i18nString(UIStrings.addPattern), this.addPattern.bind(this), {
      className: 'add-button',
      jslogContext: 'network.add-network-request-blocking-pattern',
      variant: Buttons.Button.Variant.PRIMARY,
    });
    UI.ARIAUtils.setLabel(addButton, i18nString(UIStrings.addNetworkRequestBlockingPattern));
    element.appendChild(
        i18n.i18n.getFormatLocalizedString(str_, UIStrings.networkRequestsAreNotBlockedS, {PH1: addButton}));
    return element;
  }

  addPattern(): void {
    this.manager.setBlockingEnabled(true);
    this.list.addNewItem(0, {url: Platform.DevToolsPath.EmptyUrlString, enabled: true});
  }

  removeAllPatterns(): void {
    this.manager.setBlockedPatterns([]);
  }

  renderItem(pattern: SDK.NetworkManager.BlockedPattern, editable: boolean): Element {
    const count = this.blockedRequestsCount(pattern.url);
    const element = document.createElement('div');
    element.classList.add('blocked-url');
    const checkbox = (element.createChild('input', 'blocked-url-checkbox') as HTMLInputElement);
    checkbox.type = 'checkbox';
    checkbox.checked = pattern.enabled;
    checkbox.disabled = !editable;
    checkbox.setAttribute('jslog', `${VisualLogging.toggle().track({change: true})}`);
    element.createChild('div', 'blocked-url-label').textContent = pattern.url;
    element.createChild('div', 'blocked-url-count').textContent = i18nString(UIStrings.dBlocked, {PH1: count});
    if (editable) {
      element.addEventListener('click', event => this.togglePattern(pattern, event));
      checkbox.addEventListener('click', event => this.togglePattern(pattern, event));
    }
    return element;
  }

  private togglePattern(pattern: SDK.NetworkManager.BlockedPattern, event: Event): void {
    event.consume(true);
    const patterns = this.manager.blockedPatterns();
    patterns.splice(patterns.indexOf(pattern), 1, {enabled: !pattern.enabled, url: pattern.url});
    this.manager.setBlockedPatterns(patterns);
  }

  private toggleEnabled(): void {
    this.manager.setBlockingEnabled(!this.manager.blockingEnabled());
    this.update();
  }

  removeItemRequested(pattern: SDK.NetworkManager.BlockedPattern, index: number): void {
    const patterns = this.manager.blockedPatterns();
    patterns.splice(index, 1);
    this.manager.setBlockedPatterns(patterns);
    UI.ARIAUtils.alert(UIStrings.itemDeleted);
  }

  beginEdit(pattern: SDK.NetworkManager.BlockedPattern): UI.ListWidget.Editor<SDK.NetworkManager.BlockedPattern> {
    this.editor = this.createEditor();
    this.editor.control('url').value = pattern.url;
    return this.editor;
  }

  commitEdit(
      item: SDK.NetworkManager.BlockedPattern, editor: UI.ListWidget.Editor<SDK.NetworkManager.BlockedPattern>,
      isNew: boolean): void {
    const url = editor.control('url').value as Platform.DevToolsPath.UrlString;
    const patterns = this.manager.blockedPatterns();
    if (isNew) {
      patterns.push({enabled: true, url});
    } else {
      patterns.splice(patterns.indexOf(item), 1, {enabled: true, url});
    }

    this.manager.setBlockedPatterns(patterns);
  }

  private createEditor(): UI.ListWidget.Editor<SDK.NetworkManager.BlockedPattern> {
    if (this.editor) {
      return this.editor;
    }

    const editor = new UI.ListWidget.Editor<SDK.NetworkManager.BlockedPattern>();
    const content = editor.contentElement();
    const titles = content.createChild('div', 'blocked-url-edit-row');
    titles.createChild('div').textContent = i18nString(UIStrings.textPatternToBlockMatching);
    const fields = content.createChild('div', 'blocked-url-edit-row');
    const validator = (_item: SDK.NetworkManager.BlockedPattern, _index: number, input: UI.ListWidget.EditorControl): {
      valid: boolean,
      errorMessage: Common.UIString.LocalizedString|undefined,
    } => {
      let valid = true;
      let errorMessage;
      if (!input.value) {
        errorMessage = i18nString(UIStrings.patternInputCannotBeEmpty);
        valid = false;
      } else if (this.manager.blockedPatterns().find(pattern => pattern.url === input.value)) {
        errorMessage = i18nString(UIStrings.patternAlreadyExists);
        valid = false;
      }
      return {valid, errorMessage};
    };
    const urlInput = editor.createInput('url', 'text', '', validator);
    fields.createChild('div', 'blocked-url-edit-value').appendChild(urlInput);
    return editor;
  }

  update(): void {
    const enabled = this.manager.blockingEnabled();
    this.list.element.classList.toggle('blocking-disabled', !enabled && Boolean(this.manager.blockedPatterns().length));

    this.enabledCheckbox.setChecked(enabled);
    this.list.clear();
    for (const pattern of this.manager.blockedPatterns()) {
      this.list.appendItem(pattern, enabled);
    }
  }

  private blockedRequestsCount(url: string): number {
    if (!url) {
      return 0;
    }

    let result = 0;
    for (const blockedUrl of this.blockedCountForUrl.keys()) {
      if (this.matches(url, blockedUrl)) {
        result += (this.blockedCountForUrl.get(blockedUrl) as number);
      }
    }
    return result;
  }

  private matches(pattern: string, url: string): boolean {
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

  private onNetworkLogReset(_event: Common.EventTarget.EventTargetEvent<Logs.NetworkLog.ResetEvent>): void {
    this.blockedCountForUrl.clear();
    this.update();
  }

  private onRequestFinished(event: Common.EventTarget.EventTargetEvent<SDK.NetworkRequest.NetworkRequest>): void {
    const request = event.data;
    if (request.wasBlocked()) {
      const count = this.blockedCountForUrl.get(request.url()) || 0;
      this.blockedCountForUrl.set(request.url(), count + 1);
      this.update();
    }
  }
  override wasShown(): void {
    UI.Context.Context.instance().setFlavor(BlockedURLsPane, this);
    super.wasShown();
    this.list.registerCSSFiles([blockedURLsPaneStyles]);
    this.registerCSSFiles([blockedURLsPaneStyles]);
  }

  override willHide(): void {
    super.willHide();
    UI.Context.Context.instance().setFlavor(BlockedURLsPane, null);
  }
}

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(context: UI.Context.Context, actionId: string): boolean {
    const blockedURLsPane = context.flavor(BlockedURLsPane);
    if (blockedURLsPane === null) {
      return false;
    }
    switch (actionId) {
      case 'network.add-network-request-blocking-pattern': {
        blockedURLsPane.addPattern();
        return true;
      }

      case 'network.remove-all-network-request-blocking-patterns': {
        blockedURLsPane.removeAllPatterns();
        return true;
      }
    }
    return false;
  }
}
