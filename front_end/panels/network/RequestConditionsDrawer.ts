// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
/* eslint-disable @devtools/no-imperative-dom-api */

import '../../ui/legacy/legacy.js';
import '../../ui/components/tooltips/tooltips.js';

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Logs from '../../models/logs/logs.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, type LitTemplate, nothing, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as MobileThrottling from '../mobile_throttling/mobile_throttling.js';
import * as PanelUtils from '../utils/utils.js';

import requestConditionsDrawerStyles from './requestConditionsDrawer.css.js';

const {ref} = Directives;
const {widgetConfig} = UI.Widget;

const UIStrings = {
  /**
   * @description Text to enable blocking of network requests
   */
  enableNetworkRequestBlocking: 'Enable network request blocking',
  /**
   * @description Text to enable blocking of network requests
   */
  enableBlockingAndThrottling: 'Enable blocking and throttling',
  /**
   * @description Tooltip text that appears when hovering over the plus button in the Blocked URLs Pane of the Network panel
   */
  addPattern: 'Add pattern',
  /**
   * @description Accessible label for the button to add request blocking patterns in the network request blocking tool
   */
  addNetworkRequestBlockingPattern: 'Add network request blocking pattern',
  /**
   * @description Accessible label for the button to add request blocking patterns in the network request blocking tool
   */
  addPatternLabel: 'Add network request throttling or blocking pattern',
  /**
   * @description Text that shows in the network request blocking panel if no pattern has yet been added.
   */
  noNetworkRequestsBlocked: 'No blocked network requests',
  /**
   * @description Text that shows in the network request blocking panel if no pattern has yet been added.
   */
  noPattern: 'No request throttling or blocking patterns',
  /**
   * @description Text that shows  in the network request blocking panel if no pattern has yet been added.
   * @example {Add pattern} PH1
   */
  addPatternToBlock: 'Add a pattern by clicking on the "{PH1}" button.',
  /**
   * @description Text in Blocked URLs Pane of the Network panel
   * @example {4} PH1
   */
  dBlocked: '{PH1} blocked',
  /**
   * @description Text in Blocked URLs Pane of the Network panel
   * @example {4} PH1
   */
  dAffected: '{PH1} affected',
  /**
   * @description Text in Blocked URLs Pane of the Network panel
   */
  textPatternToBlockMatching: 'Text pattern to block matching requests; use * for wildcard',
  /**
   * @description Text in Blocked URLs Pane of the Network panel
   */
  textEditPattern: 'Text pattern to block or throttle matching requests; use URLPattern syntax.',
  /**
   * @description Error text for empty list widget input in Request Blocking tool
   */
  patternInputCannotBeEmpty: 'Pattern input cannot be empty.',
  /**
   * @description Error text for duplicate list widget input in Request Blocking tool
   */
  patternAlreadyExists: 'Pattern already exists.',
  /**
   * @description Tooltip message when a pattern failed to parse as a URLPattern
   */
  patternFailedToParse: 'This pattern failed to parse as a URLPattern',
  /**
   * @description Tooltip message when a pattern failed to parse as a URLPattern because it contains RegExp groups
   */
  patternFailedWithRegExpGroups: 'RegExp groups are not allowed',
  /**
   * @description Tooltip message when a pattern was converted to a URLPattern
   * @example {example.com} PH1
   */
  patternWasUpgraded: 'This pattern was upgraded from "{PH1}"',
  /**
   * @description Message to be announced for a when list item is removed from list widget
   */
  itemDeleted: 'Item successfully deleted',
  /**
   * @description Message to be announced for a when list item is removed from list widget
   */
  learnMore: 'Learn more',
  /**
   * @description Aria label on a button moving an entry up
   */
  increasePriority: 'Move up (higher patterns are checked first)',
  /**
   * @description Aria label on a button moving an entry down
   */
  decreasePriority: 'Move down (higher patterns are checked first)',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/network/RequestConditionsDrawer.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const NETWORK_REQUEST_BLOCKING_EXPLANATION_URL =
    'https://developer.chrome.com/docs/devtools/network-request-blocking' as Platform.DevToolsPath.UrlString;
const PATTERN_API_DOCS_URL =
    'https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API' as Platform.DevToolsPath.UrlString;

const {bindToAction} = UI.UIUtils;

interface ViewInput {
  list: UI.ListWidget.ListWidget<SDK.NetworkManager.RequestCondition>;
  enabled: boolean;
  toggleEnabled: () => void;
  addPattern: () => void;
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export const DEFAULT_VIEW: View = (input, output, target) => {
  const individualThrottlingEnabled = Boolean(Root.Runtime.hostConfig.devToolsIndividualRequestThrottling?.enabled);
  render(
      // clang-format off
    html`
    <style>${RequestConditionsDrawer}</style>
    <devtools-toolbar jslog=${VisualLogging.toolbar()}>
      <devtools-checkbox
        ?checked=${input.enabled}
        @click=${input.toggleEnabled}
        .jslogContext=${'network.enable-request-blocking'}>
        ${individualThrottlingEnabled ? i18nString(UIStrings.enableBlockingAndThrottling)
                                      : i18nString(UIStrings.enableNetworkRequestBlocking)}
      </devtools-checkbox>
      <div class="toolbar-divider"></div>
      <devtools-button ${bindToAction('network.add-network-request-blocking-pattern')}></devtools-button>
      <devtools-button ${bindToAction('network.remove-all-network-request-blocking-patterns')}></devtools-button>
    </devtools-toolbar>
    <div class=empty-state ${ref(e => input.list.setEmptyPlaceholder(e ?? null))}>
      <span class=empty-state-header>${individualThrottlingEnabled
                                       ? i18nString(UIStrings.noPattern)
                                       : i18nString(UIStrings.noNetworkRequestsBlocked)}</span>
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
        aria-label=${individualThrottlingEnabled ? i18nString(UIStrings.addPatternLabel)
                                                 : i18nString(UIStrings.addNetworkRequestBlockingPattern)}
        .variant=${Buttons.Button.Variant.TONAL}>
          ${i18nString(UIStrings.addPattern)}
      </devtools-button>
    </div>
    <devtools-widget .widgetConfig=${UI.Widget.widgetConfig(UI.Widget.VBox)}>${input.list.element}</devtools-widget>
    `,
      // clang-format on
      target);
};

interface AffectedCountViewInput {
  count: number;
}
type AffectedCountView = (input: AffectedCountViewInput, output: object, target: HTMLElement) => void;
export const AFFECTED_COUNT_DEFAULT_VIEW: AffectedCountView = (input, output, target) => {
  if (Root.Runtime.hostConfig.devToolsIndividualRequestThrottling?.enabled) {
    render(html`${i18nString(UIStrings.dAffected, {PH1: input.count})}`, target);
  } else {
    render(html`${i18nString(UIStrings.dBlocked, {PH1: input.count})}`, target);
  }
};

function matchesUrl(conditions: SDK.NetworkManager.RequestCondition, url: string): boolean {
  function matchesPattern(pattern: string, url: string): boolean {
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

  return Boolean(
      Root.Runtime.hostConfig.devToolsIndividualRequestThrottling?.enabled ?
          conditions.originalOrUpgradedURLPattern?.test(url) :
          (conditions.wildcardURL && matchesPattern(conditions.wildcardURL, url)));
}

export class AffectedCountWidget extends UI.Widget.Widget {
  readonly #view: AffectedCountView;
  #condition?: SDK.NetworkManager.RequestCondition;
  #drawer?: RequestConditionsDrawer;
  constructor(target?: HTMLElement, view = AFFECTED_COUNT_DEFAULT_VIEW) {
    super(target, {classes: ['blocked-url-count']});
    this.#view = view;
  }

  get condition(): SDK.NetworkManager.RequestCondition|undefined {
    return this.#condition;
  }

  set condition(conditions: SDK.NetworkManager.RequestCondition) {
    this.#condition = conditions;
    this.requestUpdate();
  }

  get drawer(): RequestConditionsDrawer|undefined {
    return this.#drawer;
  }

  set drawer(drawer: RequestConditionsDrawer) {
    this.#drawer = drawer;
    this.requestUpdate();
  }

  override performUpdate(): void {
    if (!this.#condition || !this.#drawer) {
      return;
    }

    const count = !Root.Runtime.hostConfig.devToolsIndividualRequestThrottling?.enabled || this.#condition.isBlocking ?
        this.#drawer.blockedRequestsCount(this.#condition) :
        this.#drawer.throttledRequestsCount(this.#condition);

    this.#view({count}, {}, this.element);
  }

  override wasShown(): void {
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.NetworkManager.NetworkManager, SDK.NetworkManager.Events.RequestFinished, this.#onRequestFinished, this,
        {scoped: true});
    Logs.NetworkLog.NetworkLog.instance().addEventListener(Logs.NetworkLog.Events.Reset, this.requestUpdate, this);
    super.wasShown();
  }

  override willHide(): void {
    super.willHide();
    SDK.TargetManager.TargetManager.instance().removeModelListener(
        SDK.NetworkManager.NetworkManager, SDK.NetworkManager.Events.RequestFinished, this.#onRequestFinished, this);
    Logs.NetworkLog.NetworkLog.instance().removeEventListener(Logs.NetworkLog.Events.Reset, this.requestUpdate, this);
  }

  #onRequestFinished(event: Common.EventTarget.EventTargetEvent<SDK.NetworkRequest.NetworkRequest>): void {
    if (!this.#condition) {
      return;
    }

    const request = event.data;
    if ((request.appliedNetworkConditionsId && this.#condition.ruleIds.has(request.appliedNetworkConditionsId)) ||
        (request.wasBlocked() && matchesUrl(this.#condition, request.url()))) {
      this.requestUpdate();
    }
  }
}

function learnMore(): LitTemplate {
  return html`<x-link
        href=${NETWORK_REQUEST_BLOCKING_EXPLANATION_URL}
        tabindex=0
        class=devtools-link
        jslog=${VisualLogging.link().track({click: true, keydown: 'Enter|Space'}).context('learn-more')}>
          ${i18nString(UIStrings.learnMore)}
      </x-link>`;
}

export class RequestConditionsDrawer extends UI.Widget.VBox implements
    UI.ListWidget.Delegate<SDK.NetworkManager.RequestCondition> {
  private manager: SDK.NetworkManager.MultitargetNetworkManager;
  private readonly list: UI.ListWidget.ListWidget<SDK.NetworkManager.RequestCondition>;
  private editor: UI.ListWidget.Editor<SDK.NetworkManager.RequestCondition>|null;
  private blockedCountForUrl: Map<Platform.DevToolsPath.UrlString, number>;
  #throttledCount = new Map<string, number>();
  #view: View;
  #listElements = new WeakMap<SDK.NetworkManager.RequestCondition, HTMLElement>();

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
    this.list.registerRequiredCSS(requestConditionsDrawerStyles);
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
    const enabled = this.manager.requestConditions.conditionsEnabled;
    this.list.element.classList.toggle('blocking-disabled', !enabled && Boolean(this.manager.requestConditions.count));

    const input: ViewInput = {
      addPattern: this.addPattern.bind(this),
      toggleEnabled: this.toggleEnabled.bind(this),
      enabled,
      list: this.list,
    };
    this.#view(input, {}, this.contentElement);
  }

  addPattern(): void {
    this.manager.requestConditions.conditionsEnabled = true;
    this.list.addNewItem(
        0,
        SDK.NetworkManager.RequestCondition.createFromSetting(
            {url: Platform.DevToolsPath.EmptyUrlString, enabled: true}));
  }

  removeAllPatterns(): void {
    this.manager.requestConditions.clear();
  }

  renderItem(condition: SDK.NetworkManager.RequestCondition, editable: boolean, index: number): Element {
    const element = document.createElement('div');
    this.#listElements.set(condition, element);
    element.classList.add('blocked-url');
    const toggle = (e: Event): void => {
      if (editable) {
        e.consume(true);
        condition.enabled = !condition.enabled;
      }
    };
    const onConditionsChanged = (conditions: SDK.NetworkManager.ThrottlingConditions): void => {
      if (editable) {
        condition.conditions = conditions;
      }
    };

    const {enabled, originalOrUpgradedURLPattern, constructorStringOrWildcardURL, wildcardURL} = condition;

    if (Root.Runtime.hostConfig.devToolsIndividualRequestThrottling?.enabled) {
      const moveUp = (e: Event): void => {
        if (this.manager.requestConditions.conditionsEnabled) {
          e.consume(true);
          this.manager.requestConditions.increasePriority(condition);
        }
      };
      const moveDown = (e: Event): void => {
        if (this.manager.requestConditions.conditionsEnabled) {
          e.consume(true);
          this.manager.requestConditions.decreasePriority(condition);
        }
      };
      render(
          // clang-format off
        html`
    <input class=blocked-url-checkbox
      @click=${toggle}
      type=checkbox
      ?checked=${enabled}
      ?disabled=${!editable || !originalOrUpgradedURLPattern}
      .jslog=${VisualLogging.toggle().track({ change: true })}>
    <devtools-button
      .iconName=${'arrow-down'}
      .variant=${Buttons.Button.Variant.ICON}
      .title=${i18nString(UIStrings.increasePriority)}
      .jslogContext=${'increase-priority'}
      @click=${moveDown}></devtools-button>
    <devtools-button
      .iconName=${'arrow-up'}
      .variant=${Buttons.Button.Variant.ICON}
      .title=${i18nString(UIStrings.decreasePriority)}
      .jslogContext=${'decrease-priority'}
      @click=${moveUp}>
    </devtools-button>
    ${originalOrUpgradedURLPattern ? html`
      <devtools-tooltip variant=rich jslogcontext=url-pattern id=url-pattern-${index}>
        <div>hash: ${originalOrUpgradedURLPattern.hash}</div>
        <div>hostname: ${originalOrUpgradedURLPattern.hostname}</div>
        <div>password: ${originalOrUpgradedURLPattern.password}</div>
        <div>pathname: ${originalOrUpgradedURLPattern.pathname}</div>
        <div>port: ${originalOrUpgradedURLPattern.port}</div>
        <div>protocol: ${originalOrUpgradedURLPattern.protocol}</div>
        <div>search: ${originalOrUpgradedURLPattern.search}</div>
        <div>username: ${originalOrUpgradedURLPattern.username}</div>
        <hr />
        ${learnMore()}
      </devtools-tooltip>` : nothing}
    ${wildcardURL ? html`
      <devtools-icon name=warning-filled class="small warning" aria-details=url-pattern-warning-${index}>
      </devtools-icon>
      <devtools-tooltip variant=rich jslogcontext=url-pattern-warning id=url-pattern-warning-${index}>
        ${i18nString(UIStrings.patternWasUpgraded, {PH1: wildcardURL})}
      </devtools-tooltip>
      `: nothing}
    ${!originalOrUpgradedURLPattern ? html`
      <devtools-icon name=cross-circle-filled class=small aria-details=url-pattern-error-${index}>
      </devtools-icon>
      <devtools-tooltip variant=rich jslogcontext=url-pattern-warning id=url-pattern-error-${index}>
        ${SDK.NetworkManager.RequestURLPattern.isValidPattern(constructorStringOrWildcardURL) ===
            SDK.NetworkManager.RequestURLPatternValidity.HAS_REGEXP_GROUPS
            ? i18nString(UIStrings.patternFailedWithRegExpGroups)
            : i18nString(UIStrings.patternFailedToParse)}
        ${learnMore()}
      </devtools-tooltip>`: nothing}
    <div
      @click=${toggle}
      class=blocked-url-label
      aria-details=url-pattern-${index}>
        ${constructorStringOrWildcardURL}
    </div>
    <devtools-widget
       class=conditions-selector
       ?disabled=${!editable}
       .widgetConfig=${UI.Widget.widgetConfig(
         MobileThrottling.NetworkThrottlingSelector.NetworkThrottlingSelectorWidget, {
           variant:
             MobileThrottling.NetworkThrottlingSelector.NetworkThrottlingSelect.Variant.INDIVIDUAL_REQUEST_CONDITIONS,
           jslogContext: 'request-conditions',
           onConditionsChanged,
           currentConditions: condition.conditions,
         })}></devtools-widget>
    <devtools-widget .widgetConfig=${widgetConfig(AffectedCountWidget, {condition, drawer: this})}></devtools-widget>`,
          // clang-format on
          element);
    } else {
      render(
          // clang-format off
        html`
    <input class=blocked-url-checkbox
      @click=${toggle}
      type=checkbox
      ?checked=${condition.enabled}
      ?disabled=${!editable}
      .jslog=${VisualLogging.toggle().track({ change: true })}>
    <div @click=${toggle} class=blocked-url-label>${wildcardURL}</div>
    <devtools-widget .widgetConfig=${widgetConfig(AffectedCountWidget, {condition, drawer: this})}></devtools-widget>`,
          // clang-format on
          element);
    }
    return element;
  }

  private toggleEnabled(): void {
    this.manager.requestConditions.conditionsEnabled = !this.manager.requestConditions.conditionsEnabled;
    this.update();
  }

  removeItemRequested(condition: SDK.NetworkManager.RequestCondition): void {
    this.manager.requestConditions.delete(condition);
    UI.ARIAUtils.LiveAnnouncer.alert(UIStrings.itemDeleted);
  }

  beginEdit(pattern: SDK.NetworkManager.RequestCondition): UI.ListWidget.Editor<SDK.NetworkManager.RequestCondition> {
    this.editor = this.createEditor();
    this.editor.control('url').value = Root.Runtime.hostConfig.devToolsIndividualRequestThrottling?.enabled ?
        pattern.constructorStringOrWildcardURL :
        pattern.wildcardURL ?? '';
    return this.editor;
  }

  commitEdit(
      item: SDK.NetworkManager.RequestCondition, editor: UI.ListWidget.Editor<SDK.NetworkManager.RequestCondition>,
      isNew: boolean): void {
    const constructorString = editor.control('url').value as SDK.NetworkManager.URLPatternConstructorString;
    const pattern = Root.Runtime.hostConfig.devToolsIndividualRequestThrottling?.enabled ?
        SDK.NetworkManager.RequestURLPattern.create(constructorString) :
        constructorString;
    if (!pattern) {
      throw new Error('Failed to parse pattern');
    }
    item.pattern = pattern;
    if (isNew) {
      this.manager.requestConditions.add(item);
    }
  }

  private createEditor(): UI.ListWidget.Editor<SDK.NetworkManager.RequestCondition> {
    if (this.editor) {
      return this.editor;
    }

    const editor = new UI.ListWidget.Editor<SDK.NetworkManager.RequestCondition>();
    const content = editor.contentElement();
    const titles = content.createChild('div', 'blocked-url-edit-row');
    const label = titles.createChild('div');
    if (Root.Runtime.hostConfig.devToolsIndividualRequestThrottling?.enabled) {
      label.textContent = i18nString(UIStrings.textEditPattern);
      label.append(UI.XLink.XLink.create(
          PATTERN_API_DOCS_URL, i18nString(UIStrings.learnMore), undefined, undefined, 'learn-more'));
    } else {
      label.textContent = i18nString(UIStrings.textPatternToBlockMatching);
    }
    const fields = content.createChild('div', 'blocked-url-edit-row');
    const validator =
        (_item: SDK.NetworkManager.RequestCondition, _index: number, input: UI.ListWidget.EditorControl): {
          valid: boolean,
          errorMessage: Common.UIString.LocalizedString|undefined,
        } => {
          if (!input.value) {
            return {errorMessage: i18nString(UIStrings.patternInputCannotBeEmpty), valid: false};
          }
          if (this.manager.requestConditions.has(input.value)) {
            return {errorMessage: i18nString(UIStrings.patternAlreadyExists), valid: false};
          }
          if (Root.Runtime.hostConfig.devToolsIndividualRequestThrottling?.enabled) {
            const isValid = SDK.NetworkManager.RequestURLPattern.isValidPattern(input.value);
            switch (isValid) {
              case SDK.NetworkManager.RequestURLPatternValidity.FAILED_TO_PARSE:
                return {errorMessage: i18nString(UIStrings.patternFailedToParse), valid: false};
              case SDK.NetworkManager.RequestURLPatternValidity.HAS_REGEXP_GROUPS:
                return {errorMessage: i18nString(UIStrings.patternFailedWithRegExpGroups), valid: false};
            }
          }
          return {valid: true, errorMessage: undefined};
        };
    const urlInput = editor.createInput('url', 'text', '', validator);
    fields.createChild('div', 'blocked-url-edit-value').appendChild(urlInput);
    return editor;
  }

  update(): void {
    const enabled = this.manager.requestConditions.conditionsEnabled;
    this.list.clear();
    for (const pattern of this.manager.requestConditions.conditions) {
      if (Root.Runtime.hostConfig.devToolsIndividualRequestThrottling?.enabled || pattern.wildcardURL) {
        this.list.appendItem(pattern, enabled);
      }
    }
    this.requestUpdate();
  }

  blockedRequestsCount(condition: SDK.NetworkManager.RequestCondition): number {
    let result = 0;
    for (const blockedUrl of this.blockedCountForUrl.keys()) {
      if (matchesUrl(condition, blockedUrl)) {
        result += (this.blockedCountForUrl.get(blockedUrl) as number);
      }
    }
    return result;
  }

  throttledRequestsCount(condition: SDK.NetworkManager.RequestCondition): number {
    let result = 0;
    for (const ruleId of condition.ruleIds) {
      result += this.#throttledCount.get(ruleId) ?? 0;
    }
    return result;
  }

  private onNetworkLogReset(_event: Common.EventTarget.EventTargetEvent<Logs.NetworkLog.ResetEvent>): void {
    this.blockedCountForUrl.clear();
    this.#throttledCount.clear();
  }

  private onRequestFinished(event: Common.EventTarget.EventTargetEvent<SDK.NetworkRequest.NetworkRequest>): void {
    const request = event.data;
    if (request.appliedNetworkConditionsId) {
      const count = this.#throttledCount.get(request.appliedNetworkConditionsId) ?? 0;
      this.#throttledCount.set(request.appliedNetworkConditionsId, count + 1);
    }
    if (request.wasBlocked()) {
      const count = this.blockedCountForUrl.get(request.url()) || 0;
      this.blockedCountForUrl.set(request.url(), count + 1);
    }
  }

  override wasShown(): void {
    UI.Context.Context.instance().setFlavor(RequestConditionsDrawer, this);
    super.wasShown();
  }

  override willHide(): void {
    super.willHide();
    UI.Context.Context.instance().setFlavor(RequestConditionsDrawer, null);
  }

  static async reveal(appliedConditions: SDK.NetworkManager.AppliedNetworkConditions): Promise<void> {
    await UI.ViewManager.ViewManager.instance().showView('network.blocked-urls');
    const drawer = UI.Context.Context.instance().flavor(RequestConditionsDrawer);
    if (!drawer) {
      console.assert(!!drawer, 'Drawer not initialized');
      return;
    }
    const conditions = drawer.manager.requestConditions.conditions.find(
        condition => condition.ruleIds.has(appliedConditions.appliedNetworkConditionsId) &&
            condition.constructorString && condition.constructorString === appliedConditions.urlPattern);
    const element = (conditions && drawer.#listElements.get(conditions));
    element && PanelUtils.PanelUtils.highlightElement(element);
  }
}

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(context: UI.Context.Context, actionId: string): boolean {
    const drawer = context.flavor(RequestConditionsDrawer);
    if (drawer === null) {
      return false;
    }
    switch (actionId) {
      case 'network.add-network-request-blocking-pattern': {
        drawer.addPattern();
        return true;
      }

      case 'network.remove-all-network-request-blocking-patterns': {
        drawer.removeAllPatterns();
        return true;
      }
    }
    return false;
  }
}

export class AppliedConditionsRevealer implements
    Common.Revealer.Revealer<SDK.NetworkManager.AppliedNetworkConditions> {
  async reveal(request: SDK.NetworkManager.AppliedNetworkConditions): Promise<void> {
    if (request.urlPattern) {
      await RequestConditionsDrawer.reveal(request);
    }
  }
}
