// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */
/* eslint-disable rulesdir/no-imperative-dom-api */

import '../../ui/legacy/legacy.js';

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Logs from '../../models/logs/logs.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import blockedURLsPaneStyles from './blockedURLsPane.css.js';

const {ref} = Directives;

const UIStrings = {
  /**
   * @description Text to enable blocking of network requests
   */
  enableNetworkRequestBlocking: 'Enable network request blocking',
  /**
   * @description Tooltip text that appears when hovering over the plus button in the Blocked URLs Pane of the Network panel
   */
  addPattern: 'Add pattern',
  /**
   * @description Accessible label for the button to add request blocking patterns in the network request blocking tool
   */
  addNetworkRequestBlockingPattern: 'Add network request blocking pattern',
  /**
   * @description Text that shows in the network request blocking panel if no pattern has yet been added.
   */
  noNetworkRequestsBlocked: 'No blocked network requests',
  /**
   * @description Text that shows  in the network request blocking panel if no pattern has yet been added.
   * @example {Add pattern} PH1
   */
  addPatternToBlock: 'Add a pattern to block network requests by clicking on the "{PH1}" button.',
  /**
   * @description Text in Blocked URLs Pane of the Network panel
   * @example {4} PH1
   */
  dBlocked: '{PH1} blocked',
  /**
   * @description Text in Blocked URLs Pane of the Network panel
   */
  textPatternToBlockMatching: 'Text pattern to block matching requests; use * for wildcard',
  /**
   * @description Error text for empty list widget input in Request Blocking tool
   */
  patternInputCannotBeEmpty: 'Pattern input cannot be empty.',
  /**
   * @description Error text for duplicate list widget input in Request Blocking tool
   */
  patternAlreadyExists: 'Pattern already exists.',
  /**
   * @description Message to be announced for a when list item is removed from list widget
   */
  itemDeleted: 'Item successfully deleted',
  /**
   * @description Message to be announced for a when list item is removed from list widget
   */
  learnMore: 'Learn more',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/network/BlockedURLsPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const NETWORK_REQUEST_BLOCKING_EXPLANATION_URL =
    'https://developer.chrome.com/docs/devtools/network-request-blocking' as Platform.DevToolsPath.UrlString;

const {bindToAction} = UI.UIUtils;

interface ViewInput {
  list: UI.ListWidget.ListWidget<SDK.NetworkManager.BlockedPattern>;
  enabled: boolean;
  toggleEnabled: () => void;
  addPattern: () => void;
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export const DEFAULT_VIEW: View = (input, output, target) => {
  render(
      // clang-format off
    html`
    <style>${blockedURLsPaneStyles}</style>
    <devtools-toolbar jslog=${VisualLogging.toolbar()}>
      <devtools-checkbox
        ?checked=${input.enabled}
        @click=${input.toggleEnabled}
        .jslogContext=${'network.enable-request-blocking'}>
        ${i18nString(UIStrings.enableNetworkRequestBlocking)}
      </devtools-checkbox>
      <div class="toolbar-divider"></div>
      <devtools-button ${bindToAction('network.add-network-request-blocking-pattern')}></devtools-button>
      <devtools-button ${bindToAction('network.remove-all-network-request-blocking-patterns')}></devtools-button>
    </devtools-toolbar>
    <div class=empty-state ${ref(e => input.list.setEmptyPlaceholder(e ?? null))}>
      <span class=empty-state-header>${i18nString(UIStrings.noNetworkRequestsBlocked)}</span>
      <div class=empty-state-description>
        <span>${i18nString(UIStrings.addPatternToBlock, {PH1: i18nString(UIStrings.addPattern)})}</span>
        <x-link
          href=${NETWORK_REQUEST_BLOCKING_EXPLANATION_URL}
          tabindex=0
          class=devtools-link
          jslog=${VisualLogging.link().track({click: true, keydown:'Enter|Space'}).context('learn-more')}>
            ${i18nString(UIStrings.learnMore)}
        </x-link>
      </div>
      <devtools-button
        @click=${input.addPattern}
        class=add-button
        .jslogContext=${'network.add-network-request-blocking-pattern'}
        aria-label=${i18nString(UIStrings.addNetworkRequestBlockingPattern)}
        .variant=${Buttons.Button.Variant.TONAL}>
          ${i18nString(UIStrings.addPattern)}
      </devtools-button>
    </div>
    <devtools-widget .widgetConfig=${UI.Widget.widgetConfig(UI.Widget.VBox)}>${input.list.element}</devtools-widget>
    `,
      // clang-format on
      target);
};

export class BlockedURLsPane extends UI.Widget.VBox implements
    UI.ListWidget.Delegate<SDK.NetworkManager.BlockedPattern> {
  private manager: SDK.NetworkManager.MultitargetNetworkManager;
  private readonly list: UI.ListWidget.ListWidget<SDK.NetworkManager.BlockedPattern>;
  private editor: UI.ListWidget.Editor<SDK.NetworkManager.BlockedPattern>|null;
  private blockedCountForUrl: Map<string, number>;
  #view: View;

  constructor(target?: HTMLElement, view = DEFAULT_VIEW) {
    super(target, {
      jslog: `${VisualLogging.panel('network.blocked-urls').track({resize: true})}`,
      useShadowDom: true,
    });
    this.#view = view;

    this.manager = SDK.NetworkManager.MultitargetNetworkManager.instance();
    this.manager.addEventListener(
        SDK.NetworkManager.MultitargetNetworkManager.Events.BLOCKED_PATTERNS_CHANGED, this.update, this);

    this.list = new UI.ListWidget.ListWidget(this);
    this.list.registerRequiredCSS(blockedURLsPaneStyles);
    this.list.element.classList.add('blocked-urls');

    this.editor = null;

    this.blockedCountForUrl = new Map();
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.NetworkManager.NetworkManager, SDK.NetworkManager.Events.RequestFinished, this.onRequestFinished, this,
        {scoped: true});

    this.update();
    Logs.NetworkLog.NetworkLog.instance().addEventListener(Logs.NetworkLog.Events.Reset, this.onNetworkLogReset, this);
  }

  override performUpdate(): void {
    const enabled = this.manager.blockingEnabled();
    this.list.element.classList.toggle('blocking-disabled', !enabled && Boolean(this.manager.blockedPatterns().length));

    const input: ViewInput = {
      addPattern: this.addPattern.bind(this),
      toggleEnabled: this.toggleEnabled.bind(this),
      enabled,
      list: this.list,
    };
    this.#view(input, {}, this.contentElement);
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
    const toggle = (e: Event): void => {
      if (editable) {
        e.consume(true);
        const patterns = this.manager.blockedPatterns();
        patterns.splice(patterns.indexOf(pattern), 1, {enabled: !pattern.enabled, url: pattern.url});
        this.manager.setBlockedPatterns(patterns);
      }
    };
    render(
        // clang-format off
        html`
    <input class=blocked-url-checkbox
      @click=${toggle}
      type=checkbox
      ?checked=${pattern.enabled}
      ?disabled=${!editable}
      .jslog=${VisualLogging.toggle().track({ change: true })}>
    <div @click=${toggle} class=blocked-url-label>${pattern.url}</div>
    <div class=blocked-url-count>${i18nString(UIStrings.dBlocked, {PH1: count})}</div>`,
      // clang-format off
        element);
    return element;
  }

  private toggleEnabled(): void {
    this.manager.setBlockingEnabled(!this.manager.blockingEnabled());
    this.update();
  }

  removeItemRequested(_pattern: SDK.NetworkManager.BlockedPattern, index: number): void {
    const patterns = this.manager.blockedPatterns();
    patterns.splice(index, 1);
    this.manager.setBlockedPatterns(patterns);
    UI.ARIAUtils.LiveAnnouncer.alert(UIStrings.itemDeleted);
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
    this.list.clear();
    for (const pattern of this.manager.blockedPatterns()) {
      this.list.appendItem(pattern, enabled);
    }
    this.requestUpdate();
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
