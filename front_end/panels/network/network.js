var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/network/BinaryResourceView.js
var BinaryResourceView_exports = {};
__export(BinaryResourceView_exports, {
  BinaryResourceView: () => BinaryResourceView,
  BinaryViewObject: () => BinaryViewObject
});
import "./../../ui/legacy/legacy.js";
import * as Common from "./../../core/common/common.js";
import * as Host from "./../../core/host/host.js";
import * as i18n from "./../../core/i18n/i18n.js";
import * as SourceFrame from "./../../ui/legacy/components/source_frame/source_frame.js";
import * as UI from "./../../ui/legacy/legacy.js";

// gen/front_end/panels/network/binaryResourceView.css.js
var binaryResourceView_css_default = `/*
 * Copyright 2019 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.panel.network devtools-toolbar.binary-view-toolbar {
  border-top: 1px solid var(--sys-color-divider);
  border-bottom: 0;
  padding-left: 5px;
  flex: none;
}

.binary-view-copied-text {
  opacity: 100%;
}

.binary-view-copied-text.fadeout {
  opacity: 0%;
  transition: opacity 1s;
}

/*# sourceURL=${import.meta.resolve("./binaryResourceView.css")} */`;

// gen/front_end/panels/network/BinaryResourceView.js
var UIStrings = {
  /**
   * @description Text in Binary Resource View of the Network panel. Shown to the user as a status
   * message after the current text has been copied to the clipboard. Base64 is a format for encoding
   * data.
   */
  copiedAsBase: "Copied as `Base64`",
  /**
   * @description Text in Binary Resource View of the Network panel
   */
  hexViewer: "`Hex` Viewer",
  /**
   * @description Text in Binary Resource View of the Network panel. Shown to the user as a status
   * message after the current text has been copied to the clipboard. Hex is short for hexadecimal,
   * and is a format for encoding data.
   */
  copiedAsHex: "Copied as `Hex`",
  /**
   * @description Text in Binary Resource View of the Network panel. Shown to the user as a status
   * message after the current text has been copied to the clipboard. UTF-8 is a format for encoding data.
   */
  copiedAsUtf: "Copied as `UTF-8`",
  /**
   * @description Screen reader label for a select box that chooses how to display binary data in the Network panel
   */
  binaryViewType: "Binary view type",
  /**
   * @description Tooltip text that appears when hovering over the largeicon copy button in the Binary Resource View of the Network panel
   */
  copyToClipboard: "Copy to clipboard",
  /**
   * @description A context menu command in the Binary Resource View of the Network panel, for
   * copying to the clipboard. Base64 is a format for encoding data.
   */
  copyAsBase: "Copy as `Base64`",
  /**
   * @description A context menu command in the Binary Resource View of the Network panel, for copying
   * to the clipboard. Hex is short for hexadecimal, and is a format for encoding data.
   */
  copyAsHex: "Copy as `Hex`",
  /**
   * @description A context menu command in the Binary Resource View of the Network panel, for copying
   *to the clipboard. UTF-8 is a format for encoding data.
   */
  copyAsUtf: "Copy as `UTF-8`"
};
var str_ = i18n.i18n.registerUIStrings("panels/network/BinaryResourceView.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var BinaryResourceView = class extends UI.Widget.VBox {
  binaryResourceViewFactory;
  toolbar;
  binaryViewObjects;
  binaryViewTypeSetting;
  binaryViewTypeCombobox;
  copiedText;
  addFadeoutSettimeoutId;
  lastView;
  constructor(content, contentUrl, resourceType, element) {
    super(element);
    this.registerRequiredCSS(binaryResourceView_css_default);
    this.binaryResourceViewFactory = new SourceFrame.BinaryResourceViewFactory.BinaryResourceViewFactory(content, contentUrl, resourceType);
    this.toolbar = this.element.createChild("devtools-toolbar", "binary-view-toolbar");
    this.binaryViewObjects = [
      new BinaryViewObject("base64", i18n.i18n.lockedString("Base64"), i18nString(UIStrings.copiedAsBase), this.binaryResourceViewFactory.createBase64View.bind(this.binaryResourceViewFactory), this.binaryResourceViewFactory.base64.bind(this.binaryResourceViewFactory)),
      new BinaryViewObject("hex", i18nString(UIStrings.hexViewer), i18nString(UIStrings.copiedAsHex), this.binaryResourceViewFactory.createHexView.bind(this.binaryResourceViewFactory), this.binaryResourceViewFactory.hex.bind(this.binaryResourceViewFactory)),
      new BinaryViewObject("utf8", i18n.i18n.lockedString("UTF-8"), i18nString(UIStrings.copiedAsUtf), this.binaryResourceViewFactory.createUtf8View.bind(this.binaryResourceViewFactory), this.binaryResourceViewFactory.utf8.bind(this.binaryResourceViewFactory))
    ];
    this.binaryViewTypeSetting = Common.Settings.Settings.instance().createSetting("binary-view-type", "hex");
    this.binaryViewTypeCombobox = new UI.Toolbar.ToolbarComboBox(this.binaryViewTypeChanged.bind(this), i18nString(UIStrings.binaryViewType));
    for (const viewObject of this.binaryViewObjects) {
      this.binaryViewTypeCombobox.addOption(this.binaryViewTypeCombobox.createOption(viewObject.label, viewObject.type));
    }
    this.toolbar.appendToolbarItem(this.binaryViewTypeCombobox);
    const copyButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.copyToClipboard), "copy");
    copyButton.addEventListener("Click", (_event) => {
      this.copySelectedViewToClipboard();
    }, this);
    this.toolbar.appendToolbarItem(copyButton);
    this.copiedText = new UI.Toolbar.ToolbarText();
    this.copiedText.element.classList.add("binary-view-copied-text");
    this.toolbar.appendChild(this.copiedText.element);
    this.addFadeoutSettimeoutId = null;
    this.lastView = null;
    this.updateView();
  }
  getCurrentViewObject() {
    const filter = (obj) => obj.type === this.binaryViewTypeSetting.get();
    const binaryViewObject = this.binaryViewObjects.find(filter);
    console.assert(Boolean(binaryViewObject), `No binary view found for binary view type found in setting 'binary-view-type': ${this.binaryViewTypeSetting.get()}`);
    return binaryViewObject || null;
  }
  copySelectedViewToClipboard() {
    const viewObject = this.getCurrentViewObject();
    if (!viewObject) {
      return;
    }
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(viewObject.content());
    this.copiedText.setText(viewObject.copiedMessage);
    this.copiedText.element.classList.remove("fadeout");
    function addFadeoutClass() {
      this.copiedText.element.classList.add("fadeout");
    }
    if (this.addFadeoutSettimeoutId) {
      clearTimeout(this.addFadeoutSettimeoutId);
      this.addFadeoutSettimeoutId = null;
    }
    this.addFadeoutSettimeoutId = window.setTimeout(addFadeoutClass.bind(this), 2e3);
  }
  updateView() {
    const newViewObject = this.getCurrentViewObject();
    if (!newViewObject) {
      return;
    }
    const newView = newViewObject.getView();
    if (newView === this.lastView) {
      return;
    }
    if (this.lastView) {
      this.lastView.detach();
    }
    this.lastView = newView;
    newView.show(this.element, this.toolbar);
    this.binaryViewTypeCombobox.element.value = this.binaryViewTypeSetting.get();
  }
  binaryViewTypeChanged() {
    const selectedOption = this.binaryViewTypeCombobox.selectedOption();
    if (!selectedOption) {
      return;
    }
    const newViewType = selectedOption.value;
    if (this.binaryViewTypeSetting.get() === newViewType) {
      return;
    }
    this.binaryViewTypeSetting.set(newViewType);
    this.updateView();
  }
  addCopyToContextMenu(contextMenu, submenuItemText) {
    const copyMenu = contextMenu.clipboardSection().appendSubMenuItem(submenuItemText, false, "copy");
    const footerSection = copyMenu.footerSection();
    footerSection.appendItem(i18nString(UIStrings.copyAsBase), async () => {
      const content = this.binaryResourceViewFactory.base64();
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(content);
    }, { jslogContext: "copy-as-base" });
    footerSection.appendItem(i18nString(UIStrings.copyAsHex), async () => {
      const content = await this.binaryResourceViewFactory.hex();
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(content);
    }, { jslogContext: "copy-as-hex" });
    footerSection.appendItem(i18nString(UIStrings.copyAsUtf), async () => {
      const content = await this.binaryResourceViewFactory.utf8();
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(content);
    }, { jslogContext: "copy-as-utf" });
  }
};
var BinaryViewObject = class {
  type;
  label;
  copiedMessage;
  content;
  createViewFn;
  view;
  constructor(type, label, copiedMessage, createViewFn, content) {
    this.type = type;
    this.label = label;
    this.copiedMessage = copiedMessage;
    this.content = content;
    this.createViewFn = createViewFn;
    this.view = null;
  }
  getView() {
    if (!this.view) {
      this.view = this.createViewFn();
    }
    return this.view;
  }
};

// gen/front_end/panels/network/RequestConditionsDrawer.js
var RequestConditionsDrawer_exports = {};
__export(RequestConditionsDrawer_exports, {
  AFFECTED_COUNT_DEFAULT_VIEW: () => AFFECTED_COUNT_DEFAULT_VIEW,
  ActionDelegate: () => ActionDelegate,
  AffectedCountWidget: () => AffectedCountWidget,
  AppliedConditionsRevealer: () => AppliedConditionsRevealer,
  DEFAULT_VIEW: () => DEFAULT_VIEW,
  RequestConditionsDrawer: () => RequestConditionsDrawer
});
import "./../../ui/legacy/legacy.js";
import "./../../ui/components/tooltips/tooltips.js";
import * as i18n3 from "./../../core/i18n/i18n.js";
import * as Platform from "./../../core/platform/platform.js";
import * as Root from "./../../core/root/root.js";
import * as SDK from "./../../core/sdk/sdk.js";
import * as Logs from "./../../models/logs/logs.js";
import * as Buttons from "./../../ui/components/buttons/buttons.js";
import * as UI2 from "./../../ui/legacy/legacy.js";
import { Directives, html, nothing, render } from "./../../ui/lit/lit.js";
import * as VisualLogging from "./../../ui/visual_logging/visual_logging.js";
import * as MobileThrottling from "./../mobile_throttling/mobile_throttling.js";
import * as PanelUtils from "./../utils/utils.js";

// gen/front_end/panels/network/requestConditionsDrawer.css.js
var requestConditionsDrawer_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.list {
  border: none !important; /* stylelint-disable-line declaration-no-important */
  border-top: 1px solid var(--sys-color-divider) !important; /* stylelint-disable-line declaration-no-important */
  display: flex;
  height: 100%;
}

.blocking-disabled {
  opacity: 80%;
}

.editor-container {
  padding: 0 4px;
}

.blocked-urls {
  overflow: hidden auto;
}

.no-blocked-urls > span {
  white-space: pre;
}

.blocked-url {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex: auto;
}

.blocked-url-count {
  flex: none;
  padding-right: 9px;
}

.blocked-url-checkbox {
  margin-left: 8px;
  flex: none;
}

.blocked-url-checkbox:focus {
  outline: auto 5px -webkit-focus-ring-color;
}

.blocked-url-label {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  flex: auto;
  padding: 0 3px;
}

.blocked-url-edit-row {
  flex: none;
  display: flex;
  flex-direction: row;
  margin: 7px 5px 0;
  align-items: center;
}

.blocked-url-edit-value {
  user-select: none;
  flex: 1 1 0;
}

.blocked-url-edit-row input {
  width: 100%;
  text-align: inherit;
  height: 22px;
}

.conditions-selector {
  max-width: 120px;
  margin: var(--sys-size-3);
}

/*# sourceURL=${import.meta.resolve("./requestConditionsDrawer.css")} */`;

// gen/front_end/panels/network/RequestConditionsDrawer.js
var { ref } = Directives;
var { widgetConfig } = UI2.Widget;
var UIStrings2 = {
  /**
   * @description Text to enable blocking of network requests
   */
  enableNetworkRequestBlocking: "Enable network request blocking",
  /**
   * @description Text to enable blocking of network requests
   */
  enableBlockingAndThrottling: "Enable blocking and throttling",
  /**
   * @description Tooltip text that appears when hovering over the plus button in the Blocked URLs Pane of the Network panel
   */
  addPattern: "Add pattern",
  /**
   * @description Accessible label for the button to add request blocking patterns in the network request blocking tool
   */
  addNetworkRequestBlockingPattern: "Add network request blocking pattern",
  /**
   * @description Accessible label for the button to add request blocking patterns in the network request blocking tool
   */
  addPatternLabel: "Add network request throttling or blocking pattern",
  /**
   * @description Text that shows in the network request blocking panel if no pattern has yet been added.
   */
  noNetworkRequestsBlocked: "No blocked network requests",
  /**
   * @description Text that shows in the network request blocking panel if no pattern has yet been added.
   */
  noPattern: "No request throttling or blocking patterns",
  /**
   * @description Text that shows  in the network request blocking panel if no pattern has yet been added.
   * @example {Add pattern} PH1
   */
  addPatternToBlock: 'Add a pattern by clicking on the "{PH1}" button.',
  /**
   * @description Text in Blocked URLs Pane of the Network panel
   * @example {4} PH1
   */
  dBlocked: "{PH1} blocked",
  /**
   * @description Text in Blocked URLs Pane of the Network panel
   * @example {4} PH1
   */
  dAffected: "{PH1} affected",
  /**
   * @description Text in Blocked URLs Pane of the Network panel
   */
  textPatternToBlockMatching: "Text pattern to block matching requests; use * for wildcard",
  /**
   * @description Text in Blocked URLs Pane of the Network panel
   */
  textEditPattern: "Text pattern to block or throttle matching requests; use URLPattern syntax.",
  /**
   * @description Error text for empty list widget input in Request Blocking tool
   */
  patternInputCannotBeEmpty: "Pattern input cannot be empty.",
  /**
   * @description Error text for duplicate list widget input in Request Blocking tool
   */
  patternAlreadyExists: "Pattern already exists.",
  /**
   * @description Tooltip message when a pattern failed to parse as a URLPattern
   */
  patternFailedToParse: "This pattern failed to parse as a URLPattern",
  /**
   * @description Tooltip message when a pattern failed to parse as a URLPattern because it contains RegExp groups
   */
  patternFailedWithRegExpGroups: "RegExp groups are not allowed",
  /**
   * @description Tooltip message when a pattern was converted to a URLPattern
   * @example {example.com} PH1
   */
  patternWasUpgraded: 'This pattern was upgraded from "{PH1}"',
  /**
   * @description Message to be announced for a when list item is removed from list widget
   */
  itemDeleted: "Item successfully deleted",
  /**
   * @description Message to be announced for a when list item is removed from list widget
   */
  learnMore: "Learn more",
  /**
   * @description Aria label on a button moving an entry up
   */
  increasePriority: "Move up (higher patterns are checked first)",
  /**
   * @description Aria label on a button moving an entry down
   */
  decreasePriority: "Move down (higher patterns are checked first)"
};
var str_2 = i18n3.i18n.registerUIStrings("panels/network/RequestConditionsDrawer.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var NETWORK_REQUEST_BLOCKING_EXPLANATION_URL = "https://developer.chrome.com/docs/devtools/network-request-blocking";
var PATTERN_API_DOCS_URL = "https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API";
var { bindToAction } = UI2.UIUtils;
var DEFAULT_VIEW = (input, output, target) => {
  const individualThrottlingEnabled = Boolean(Root.Runtime.hostConfig.devToolsIndividualRequestThrottling?.enabled);
  render(
    // clang-format off
    html`
    <style>${RequestConditionsDrawer}</style>
    <devtools-toolbar jslog=${VisualLogging.toolbar()}>
      <devtools-checkbox
        ?checked=${input.enabled}
        @click=${input.toggleEnabled}
        .jslogContext=${"network.enable-request-blocking"}>
        ${individualThrottlingEnabled ? i18nString2(UIStrings2.enableBlockingAndThrottling) : i18nString2(UIStrings2.enableNetworkRequestBlocking)}
      </devtools-checkbox>
      <div class="toolbar-divider"></div>
      <devtools-button ${bindToAction("network.add-network-request-blocking-pattern")}></devtools-button>
      <devtools-button ${bindToAction("network.remove-all-network-request-blocking-patterns")}></devtools-button>
    </devtools-toolbar>
    <div class=empty-state ${ref((e) => input.list.setEmptyPlaceholder(e ?? null))}>
      <span class=empty-state-header>${individualThrottlingEnabled ? i18nString2(UIStrings2.noPattern) : i18nString2(UIStrings2.noNetworkRequestsBlocked)}</span>
      <div class=empty-state-description>
        <span>${i18nString2(UIStrings2.addPatternToBlock, { PH1: i18nString2(UIStrings2.addPattern) })}</span>
        <x-link
          href=${NETWORK_REQUEST_BLOCKING_EXPLANATION_URL}
          tabindex=0
          class=devtools-link
          jslog=${VisualLogging.link().track({ click: true, keydown: "Enter|Space" }).context("learn-more")}>
            ${i18nString2(UIStrings2.learnMore)}
        </x-link>
      </div>
      <devtools-button
        @click=${input.addPattern}
        class=add-button
        .jslogContext=${"network.add-network-request-blocking-pattern"}
        aria-label=${individualThrottlingEnabled ? i18nString2(UIStrings2.addPatternLabel) : i18nString2(UIStrings2.addNetworkRequestBlockingPattern)}
        .variant=${"tonal"}>
          ${i18nString2(UIStrings2.addPattern)}
      </devtools-button>
    </div>
    <devtools-widget .widgetConfig=${UI2.Widget.widgetConfig(UI2.Widget.VBox)}>${input.list.element}</devtools-widget>
    `,
    // clang-format on
    target
  );
};
var AFFECTED_COUNT_DEFAULT_VIEW = (input, output, target) => {
  if (Root.Runtime.hostConfig.devToolsIndividualRequestThrottling?.enabled) {
    render(html`${i18nString2(UIStrings2.dAffected, { PH1: input.count })}`, target);
  } else {
    render(html`${i18nString2(UIStrings2.dBlocked, { PH1: input.count })}`, target);
  }
};
function matchesUrl(conditions, url) {
  function matchesPattern(pattern, url2) {
    let pos = 0;
    const parts = pattern.split("*");
    for (let index = 0; index < parts.length; index++) {
      const part = parts[index];
      if (!part.length) {
        continue;
      }
      pos = url2.indexOf(part, pos);
      if (pos === -1) {
        return false;
      }
      pos += part.length;
    }
    return true;
  }
  return Boolean(Root.Runtime.hostConfig.devToolsIndividualRequestThrottling?.enabled ? conditions.originalOrUpgradedURLPattern?.test(url) : conditions.wildcardURL && matchesPattern(conditions.wildcardURL, url));
}
var AffectedCountWidget = class extends UI2.Widget.Widget {
  #view;
  #condition;
  #drawer;
  constructor(target, view = AFFECTED_COUNT_DEFAULT_VIEW) {
    super(target, { classes: ["blocked-url-count"] });
    this.#view = view;
  }
  get condition() {
    return this.#condition;
  }
  set condition(conditions) {
    this.#condition = conditions;
    this.requestUpdate();
  }
  get drawer() {
    return this.#drawer;
  }
  set drawer(drawer) {
    this.#drawer = drawer;
    this.requestUpdate();
  }
  performUpdate() {
    if (!this.#condition || !this.#drawer) {
      return;
    }
    const count = !Root.Runtime.hostConfig.devToolsIndividualRequestThrottling?.enabled || this.#condition.isBlocking ? this.#drawer.blockedRequestsCount(this.#condition) : this.#drawer.throttledRequestsCount(this.#condition);
    this.#view({ count }, {}, this.element);
  }
  wasShown() {
    SDK.TargetManager.TargetManager.instance().addModelListener(SDK.NetworkManager.NetworkManager, SDK.NetworkManager.Events.RequestFinished, this.#onRequestFinished, this, { scoped: true });
    Logs.NetworkLog.NetworkLog.instance().addEventListener(Logs.NetworkLog.Events.Reset, this.requestUpdate, this);
    super.wasShown();
  }
  willHide() {
    super.willHide();
    SDK.TargetManager.TargetManager.instance().removeModelListener(SDK.NetworkManager.NetworkManager, SDK.NetworkManager.Events.RequestFinished, this.#onRequestFinished, this);
    Logs.NetworkLog.NetworkLog.instance().removeEventListener(Logs.NetworkLog.Events.Reset, this.requestUpdate, this);
  }
  #onRequestFinished(event) {
    if (!this.#condition) {
      return;
    }
    const request = event.data;
    if (request.appliedNetworkConditionsId && this.#condition.ruleIds.has(request.appliedNetworkConditionsId) || request.wasBlocked() && matchesUrl(this.#condition, request.url())) {
      this.requestUpdate();
    }
  }
};
function learnMore() {
  return html`<x-link
        href=${NETWORK_REQUEST_BLOCKING_EXPLANATION_URL}
        tabindex=0
        class=devtools-link
        jslog=${VisualLogging.link().track({ click: true, keydown: "Enter|Space" }).context("learn-more")}>
          ${i18nString2(UIStrings2.learnMore)}
      </x-link>`;
}
var RequestConditionsDrawer = class _RequestConditionsDrawer extends UI2.Widget.VBox {
  manager;
  list;
  editor;
  blockedCountForUrl;
  #throttledCount = /* @__PURE__ */ new Map();
  #view;
  #listElements = /* @__PURE__ */ new WeakMap();
  constructor(target, view = DEFAULT_VIEW) {
    super(target, {
      jslog: `${VisualLogging.panel("network.blocked-urls").track({ resize: true })}`,
      useShadowDom: true
    });
    this.#view = view;
    this.manager = SDK.NetworkManager.MultitargetNetworkManager.instance();
    this.manager.addEventListener("BlockedPatternsChanged", this.update, this);
    this.list = new UI2.ListWidget.ListWidget(this);
    this.list.registerRequiredCSS(requestConditionsDrawer_css_default);
    this.list.element.classList.add("blocked-urls");
    this.editor = null;
    this.blockedCountForUrl = /* @__PURE__ */ new Map();
    SDK.TargetManager.TargetManager.instance().addModelListener(SDK.NetworkManager.NetworkManager, SDK.NetworkManager.Events.RequestFinished, this.onRequestFinished, this, { scoped: true });
    this.update();
    Logs.NetworkLog.NetworkLog.instance().addEventListener(Logs.NetworkLog.Events.Reset, this.onNetworkLogReset, this);
  }
  performUpdate() {
    const enabled = this.manager.requestConditions.conditionsEnabled;
    this.list.element.classList.toggle("blocking-disabled", !enabled && Boolean(this.manager.requestConditions.count));
    const input = {
      addPattern: this.addPattern.bind(this),
      toggleEnabled: this.toggleEnabled.bind(this),
      enabled,
      list: this.list
    };
    this.#view(input, {}, this.contentElement);
  }
  addPattern() {
    this.manager.requestConditions.conditionsEnabled = true;
    this.list.addNewItem(0, SDK.NetworkManager.RequestCondition.createFromSetting({ url: Platform.DevToolsPath.EmptyUrlString, enabled: true }));
  }
  removeAllPatterns() {
    this.manager.requestConditions.clear();
  }
  renderItem(condition, editable, index) {
    const element = document.createElement("div");
    this.#listElements.set(condition, element);
    element.classList.add("blocked-url");
    const toggle2 = (e) => {
      if (editable) {
        e.consume(true);
        condition.enabled = !condition.enabled;
      }
    };
    const onConditionsChanged = (conditions) => {
      if (editable) {
        condition.conditions = conditions;
      }
    };
    const { enabled, originalOrUpgradedURLPattern, constructorStringOrWildcardURL, wildcardURL } = condition;
    if (Root.Runtime.hostConfig.devToolsIndividualRequestThrottling?.enabled) {
      const moveUp = (e) => {
        if (this.manager.requestConditions.conditionsEnabled) {
          e.consume(true);
          this.manager.requestConditions.increasePriority(condition);
        }
      };
      const moveDown = (e) => {
        if (this.manager.requestConditions.conditionsEnabled) {
          e.consume(true);
          this.manager.requestConditions.decreasePriority(condition);
        }
      };
      render(
        // clang-format off
        html`
    <input class=blocked-url-checkbox
      @click=${toggle2}
      type=checkbox
      ?checked=${enabled}
      ?disabled=${!editable || !originalOrUpgradedURLPattern}
      .jslog=${VisualLogging.toggle().track({ change: true })}>
    <devtools-button
      .iconName=${"arrow-down"}
      .variant=${"icon"}
      .title=${i18nString2(UIStrings2.increasePriority)}
      .jslogContext=${"increase-priority"}
      @click=${moveDown}></devtools-button>
    <devtools-button
      .iconName=${"arrow-up"}
      .variant=${"icon"}
      .title=${i18nString2(UIStrings2.decreasePriority)}
      .jslogContext=${"decrease-priority"}
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
        ${i18nString2(UIStrings2.patternWasUpgraded, { PH1: wildcardURL })}
      </devtools-tooltip>
      ` : nothing}
    ${!originalOrUpgradedURLPattern ? html`
      <devtools-icon name=cross-circle-filled class=small aria-details=url-pattern-error-${index}>
      </devtools-icon>
      <devtools-tooltip variant=rich jslogcontext=url-pattern-warning id=url-pattern-error-${index}>
        ${SDK.NetworkManager.RequestURLPattern.isValidPattern(constructorStringOrWildcardURL) === "has-regexp-groups" ? i18nString2(UIStrings2.patternFailedWithRegExpGroups) : i18nString2(UIStrings2.patternFailedToParse)}
        ${learnMore()}
      </devtools-tooltip>` : nothing}
    <div
      @click=${toggle2}
      class=blocked-url-label
      aria-details=url-pattern-${index}>
        ${constructorStringOrWildcardURL}
    </div>
    <devtools-widget
       class=conditions-selector
       ?disabled=${!editable}
       .widgetConfig=${UI2.Widget.widgetConfig(MobileThrottling.NetworkThrottlingSelector.NetworkThrottlingSelectorWidget, {
          variant: "individual-request-conditions",
          jslogContext: "request-conditions",
          onConditionsChanged,
          currentConditions: condition.conditions
        })}></devtools-widget>
    <devtools-widget .widgetConfig=${widgetConfig(AffectedCountWidget, { condition, drawer: this })}></devtools-widget>`,
        // clang-format on
        element
      );
    } else {
      render(
        // clang-format off
        html`
    <input class=blocked-url-checkbox
      @click=${toggle2}
      type=checkbox
      ?checked=${condition.enabled}
      ?disabled=${!editable}
      .jslog=${VisualLogging.toggle().track({ change: true })}>
    <div @click=${toggle2} class=blocked-url-label>${wildcardURL}</div>
    <devtools-widget .widgetConfig=${widgetConfig(AffectedCountWidget, { condition, drawer: this })}></devtools-widget>`,
        // clang-format on
        element
      );
    }
    return element;
  }
  toggleEnabled() {
    this.manager.requestConditions.conditionsEnabled = !this.manager.requestConditions.conditionsEnabled;
    this.update();
  }
  removeItemRequested(condition) {
    this.manager.requestConditions.delete(condition);
    UI2.ARIAUtils.LiveAnnouncer.alert(UIStrings2.itemDeleted);
  }
  beginEdit(pattern) {
    this.editor = this.createEditor();
    this.editor.control("url").value = Root.Runtime.hostConfig.devToolsIndividualRequestThrottling?.enabled ? pattern.constructorStringOrWildcardURL : pattern.wildcardURL ?? "";
    return this.editor;
  }
  commitEdit(item, editor, isNew) {
    const constructorString = editor.control("url").value;
    const pattern = Root.Runtime.hostConfig.devToolsIndividualRequestThrottling?.enabled ? SDK.NetworkManager.RequestURLPattern.create(constructorString) : constructorString;
    if (!pattern) {
      throw new Error("Failed to parse pattern");
    }
    item.pattern = pattern;
    if (isNew) {
      this.manager.requestConditions.add(item);
    }
  }
  createEditor() {
    if (this.editor) {
      return this.editor;
    }
    const editor = new UI2.ListWidget.Editor();
    const content = editor.contentElement();
    const titles = content.createChild("div", "blocked-url-edit-row");
    const label = titles.createChild("div");
    if (Root.Runtime.hostConfig.devToolsIndividualRequestThrottling?.enabled) {
      label.textContent = i18nString2(UIStrings2.textEditPattern);
      label.append(UI2.XLink.XLink.create(PATTERN_API_DOCS_URL, i18nString2(UIStrings2.learnMore), void 0, void 0, "learn-more"));
    } else {
      label.textContent = i18nString2(UIStrings2.textPatternToBlockMatching);
    }
    const fields = content.createChild("div", "blocked-url-edit-row");
    const validator = (_item, _index, input) => {
      if (!input.value) {
        return { errorMessage: i18nString2(UIStrings2.patternInputCannotBeEmpty), valid: false };
      }
      if (this.manager.requestConditions.has(input.value)) {
        return { errorMessage: i18nString2(UIStrings2.patternAlreadyExists), valid: false };
      }
      if (Root.Runtime.hostConfig.devToolsIndividualRequestThrottling?.enabled) {
        const isValid = SDK.NetworkManager.RequestURLPattern.isValidPattern(input.value);
        switch (isValid) {
          case "failed-to-parse":
            return { errorMessage: i18nString2(UIStrings2.patternFailedToParse), valid: false };
          case "has-regexp-groups":
            return { errorMessage: i18nString2(UIStrings2.patternFailedWithRegExpGroups), valid: false };
        }
      }
      return { valid: true, errorMessage: void 0 };
    };
    const urlInput = editor.createInput("url", "text", "", validator);
    fields.createChild("div", "blocked-url-edit-value").appendChild(urlInput);
    return editor;
  }
  update() {
    const enabled = this.manager.requestConditions.conditionsEnabled;
    this.list.clear();
    for (const pattern of this.manager.requestConditions.conditions) {
      if (Root.Runtime.hostConfig.devToolsIndividualRequestThrottling?.enabled || pattern.wildcardURL) {
        this.list.appendItem(pattern, enabled);
      }
    }
    this.requestUpdate();
  }
  blockedRequestsCount(condition) {
    let result = 0;
    for (const blockedUrl of this.blockedCountForUrl.keys()) {
      if (matchesUrl(condition, blockedUrl)) {
        result += this.blockedCountForUrl.get(blockedUrl);
      }
    }
    return result;
  }
  throttledRequestsCount(condition) {
    let result = 0;
    for (const ruleId of condition.ruleIds) {
      result += this.#throttledCount.get(ruleId) ?? 0;
    }
    return result;
  }
  onNetworkLogReset(_event) {
    this.blockedCountForUrl.clear();
    this.#throttledCount.clear();
  }
  onRequestFinished(event) {
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
  wasShown() {
    UI2.Context.Context.instance().setFlavor(_RequestConditionsDrawer, this);
    super.wasShown();
  }
  willHide() {
    super.willHide();
    UI2.Context.Context.instance().setFlavor(_RequestConditionsDrawer, null);
  }
  static async reveal(appliedConditions) {
    await UI2.ViewManager.ViewManager.instance().showView("network.blocked-urls");
    const drawer = UI2.Context.Context.instance().flavor(_RequestConditionsDrawer);
    if (!drawer) {
      console.assert(!!drawer, "Drawer not initialized");
      return;
    }
    const conditions = drawer.manager.requestConditions.conditions.find((condition) => condition.ruleIds.has(appliedConditions.appliedNetworkConditionsId) && condition.constructorString && condition.constructorString === appliedConditions.urlPattern);
    const element = conditions && drawer.#listElements.get(conditions);
    element && PanelUtils.PanelUtils.highlightElement(element);
  }
};
var ActionDelegate = class {
  handleAction(context, actionId) {
    const drawer = context.flavor(RequestConditionsDrawer);
    if (drawer === null) {
      return false;
    }
    switch (actionId) {
      case "network.add-network-request-blocking-pattern": {
        drawer.addPattern();
        return true;
      }
      case "network.remove-all-network-request-blocking-patterns": {
        drawer.removeAllPatterns();
        return true;
      }
    }
    return false;
  }
};
var AppliedConditionsRevealer = class {
  async reveal(request) {
    if (request.urlPattern) {
      await RequestConditionsDrawer.reveal(request);
    }
  }
};

// gen/front_end/panels/network/EventSourceMessagesView.js
var EventSourceMessagesView_exports = {};
__export(EventSourceMessagesView_exports, {
  Comparators: () => Comparators,
  EventSourceMessageNode: () => EventSourceMessageNode,
  EventSourceMessagesView: () => EventSourceMessagesView
});
import "./../../ui/legacy/legacy.js";
import * as Common2 from "./../../core/common/common.js";
import * as Host2 from "./../../core/host/host.js";
import * as i18n5 from "./../../core/i18n/i18n.js";
import * as SDK2 from "./../../core/sdk/sdk.js";
import * as DataGrid from "./../../ui/legacy/components/data_grid/data_grid.js";
import * as UI3 from "./../../ui/legacy/legacy.js";
import * as VisualLogging2 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/network/eventSourceMessagesView.css.js
var eventSourceMessagesView_css_default = `/*
 * Copyright 2014 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.event-source-messages-view .data-grid {
  flex: auto;
  border: none;
}

/*# sourceURL=${import.meta.resolve("./eventSourceMessagesView.css")} */`;

// gen/front_end/panels/network/EventSourceMessagesView.js
var UIStrings3 = {
  /**
   * @description Text in Event Source Messages View of the Network panel
   */
  id: "Id",
  /**
   * @description Text that refers to some types
   */
  type: "Type",
  /**
   * @description Text in Event Source Messages View of the Network panel
   */
  data: "Data",
  /**
   * @description Text that refers to the time
   */
  time: "Time",
  /**
   * @description Data grid name for Event Source data grids
   */
  eventSource: "Event Source",
  /**
   * @description A context menu item in the Resource Web Socket Frame View of the Network panel
   */
  copyMessage: "Copy message",
  /**
   * @description Text to clear everything
   */
  clearAll: "Clear all",
  /**
   * @description Example for placeholder text
   */
  filterByRegex: "Filter using regex (example: https?)"
};
var str_3 = i18n5.i18n.registerUIStrings("panels/network/EventSourceMessagesView.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var EventSourceMessagesView = class extends UI3.Widget.VBox {
  request;
  dataGrid;
  mainToolbar;
  clearAllButton;
  filterTextInput;
  filterRegex;
  messageFilterSetting = Common2.Settings.Settings.instance().createSetting("network-event-source-message-filter", "");
  constructor(request) {
    super({ jslog: `${VisualLogging2.pane("event-stream").track({ resize: true })}` });
    this.registerRequiredCSS(eventSourceMessagesView_css_default);
    this.element.classList.add("event-source-messages-view");
    this.request = request;
    this.mainToolbar = this.element.createChild("devtools-toolbar");
    this.clearAllButton = new UI3.Toolbar.ToolbarButton(i18nString3(UIStrings3.clearAll), "clear");
    this.clearAllButton.addEventListener("Click", this.clearMessages, this);
    this.mainToolbar.appendToolbarItem(this.clearAllButton);
    const placeholder = i18nString3(UIStrings3.filterByRegex);
    this.filterTextInput = new UI3.Toolbar.ToolbarFilter(placeholder, 0.4);
    this.filterTextInput.addEventListener("TextChanged", this.updateFilterSetting, this);
    const filter = this.messageFilterSetting.get();
    this.filterRegex = null;
    this.setFilter(filter);
    if (filter) {
      this.filterTextInput.setValue(filter);
    }
    this.mainToolbar.appendToolbarItem(this.filterTextInput);
    const columns = [
      { id: "id", title: i18nString3(UIStrings3.id), sortable: true, weight: 8 },
      { id: "type", title: i18nString3(UIStrings3.type), sortable: true, weight: 8 },
      { id: "data", title: i18nString3(UIStrings3.data), sortable: false, weight: 88 },
      { id: "time", title: i18nString3(UIStrings3.time), sortable: true, weight: 8 }
    ];
    this.dataGrid = new DataGrid.SortableDataGrid.SortableDataGrid({
      displayName: i18nString3(UIStrings3.eventSource),
      columns,
      deleteCallback: void 0,
      refreshCallback: void 0
    });
    this.dataGrid.setStriped(true);
    this.dataGrid.setEnableAutoScrollToBottom(true);
    this.dataGrid.setRowContextMenuCallback(this.onRowContextMenu.bind(this));
    this.dataGrid.markColumnAsSortedBy("time", DataGrid.DataGrid.Order.Ascending);
    this.sortItems();
    this.dataGrid.addEventListener("SortingChanged", this.sortItems, this);
    this.dataGrid.setName("event-source-messages-view");
    this.dataGrid.asWidget().show(this.element);
  }
  wasShown() {
    super.wasShown();
    this.refresh();
    this.request.addEventListener(SDK2.NetworkRequest.Events.EVENT_SOURCE_MESSAGE_ADDED, this.messageAdded, this);
  }
  willHide() {
    super.willHide();
    this.request.removeEventListener(SDK2.NetworkRequest.Events.EVENT_SOURCE_MESSAGE_ADDED, this.messageAdded, this);
  }
  messageAdded(event) {
    const message = event.data;
    if (!this.messageFilter(message)) {
      return;
    }
    this.dataGrid.insertChild(new EventSourceMessageNode(message));
  }
  messageFilter(message) {
    return !this.filterRegex || this.filterRegex.test(message.eventName) || this.filterRegex.test(message.eventId) || this.filterRegex.test(message.data);
  }
  clearMessages() {
    clearMessageOffsets.set(this.request, this.request.eventSourceMessages().length);
    this.refresh();
  }
  updateFilterSetting() {
    const text = this.filterTextInput.value();
    this.messageFilterSetting.set(text);
    this.setFilter(text);
    this.refresh();
  }
  setFilter(text) {
    this.filterRegex = null;
    if (text) {
      try {
        this.filterRegex = new RegExp(text, "i");
      } catch {
        this.filterRegex = new RegExp("(?!)", "i");
      }
    }
  }
  sortItems() {
    const sortColumnId = this.dataGrid.sortColumnId();
    if (!sortColumnId) {
      return;
    }
    const comparator = Comparators[sortColumnId];
    if (!comparator) {
      return;
    }
    this.dataGrid.sortNodes(comparator, !this.dataGrid.isSortOrderAscending());
  }
  onRowContextMenu(contextMenu, node) {
    contextMenu.clipboardSection().appendItem(i18nString3(UIStrings3.copyMessage), Host2.InspectorFrontendHost.InspectorFrontendHostInstance.copyText.bind(Host2.InspectorFrontendHost.InspectorFrontendHostInstance, node.data.data), { jslogContext: "copy" });
  }
  refresh() {
    this.dataGrid.rootNode().removeChildren();
    let messages = this.request.eventSourceMessages();
    const offset = clearMessageOffsets.get(this.request) || 0;
    messages = messages.slice(offset);
    messages = messages.filter(this.messageFilter.bind(this));
    messages.forEach((message) => this.dataGrid.insertChild(new EventSourceMessageNode(message)));
  }
};
var EventSourceMessageNode = class extends DataGrid.SortableDataGrid.SortableDataGridNode {
  message;
  constructor(message) {
    const time = new Date(message.time * 1e3);
    const timeText = ("0" + time.getHours()).substr(-2) + ":" + ("0" + time.getMinutes()).substr(-2) + ":" + ("0" + time.getSeconds()).substr(-2) + "." + ("00" + time.getMilliseconds()).substr(-3);
    const timeNode = document.createElement("div");
    UI3.UIUtils.createTextChild(timeNode, timeText);
    UI3.Tooltip.Tooltip.install(timeNode, time.toLocaleString());
    super({ id: message.eventId, type: message.eventName, data: message.data, time: timeNode });
    this.message = message;
  }
};
function eventSourceMessageNodeComparator(fieldGetter, a, b) {
  const aValue = fieldGetter(a.message);
  const bValue = fieldGetter(b.message);
  return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
}
var Comparators = {
  id: eventSourceMessageNodeComparator.bind(null, (message) => message.eventId),
  type: eventSourceMessageNodeComparator.bind(null, (message) => message.eventName),
  time: eventSourceMessageNodeComparator.bind(null, (message) => message.time)
};
var clearMessageOffsets = /* @__PURE__ */ new WeakMap();

// gen/front_end/panels/network/NetworkConfigView.js
var NetworkConfigView_exports = {};
__export(NetworkConfigView_exports, {
  NetworkConfigView: () => NetworkConfigView,
  userAgentGroups: () => userAgentGroups
});
import * as Common3 from "./../../core/common/common.js";
import * as i18n7 from "./../../core/i18n/i18n.js";
import * as Platform2 from "./../../core/platform/platform.js";
import * as SDK3 from "./../../core/sdk/sdk.js";
import * as SettingsUI from "./../../ui/legacy/components/settings_ui/settings_ui.js";
import * as UI4 from "./../../ui/legacy/legacy.js";
import * as VisualLogging3 from "./../../ui/visual_logging/visual_logging.js";
import * as MobileThrottling2 from "./../mobile_throttling/mobile_throttling.js";
import * as EmulationComponents from "./../settings/emulation/components/components.js";

// gen/front_end/panels/network/networkConfigView.css.js
var networkConfigView_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.network-config {
  padding: 12px;
  display: block;
}

.network-config-group {
  display: flex;
  padding-bottom: 10px;
  flex-wrap: wrap;
  flex: 0 0 auto;
  min-height: 30px;
}

.network-config-title {
  margin-right: 16px;
  width: 130px;
}

.network-config-fields {
  flex: 2 0 200px;
}

.network-config-fields span:first-of-type,
.network-config-fields .network-config-accepted-encoding-custom {
  padding: 3px 0;
}

.panel-section-separator {
  height: 1px;
  margin-bottom: 10px;
  background: var(--sys-color-divider);
}
/* Disable cache */

.network-config-disable-cache {
  line-height: 28px;
  border-top: none;
  padding-top: 0;
}

.network-config-input-validation-error {
  color: var(--sys-color-error);
  margin: 5px 0;
}

.network-config-input-validation-error:empty {
  display: none;
}
/* Network throttling */

.network-config-throttling {
  select {
    width: 100%;
    max-width: 250px;
  }

  .network-config-fields {
    display: flex;
    column-gap: var(--sys-size-5);
  }

  & > .network-config-title {
    line-height: 24px;
  }
}
/* User agent */

.network-config-ua > .network-config-title {
  line-height: 20px;
}

.network-config-ua input {
  display: block;
  width: calc(100% - 20px);
}

.network-config-ua input[type="text"],
.network-config-ua select {
  margin-top: 8px;
}

.network-config-ua select {
  width: calc(100% - 20px);
  max-width: 250px;
}

.network-config-ua-custom {
  padding-bottom: 8px;

  input,
  devtools-user-agent-client-hints-form {
    opacity: 38%;
    pointer-events: none;
  }

  &.checked input,
  &.checked devtools-user-agent-client-hints-form {
    opacity: revert;
    pointer-events: revert;
  }
}

devtools-user-agent-client-hints-form {
  display: block;
  margin-top: 14px;
  width: min(100%, 400px);
}

.status-text {
  padding: 10px;
  color: var(--sys-color-tertiary);
}

/*# sourceURL=${import.meta.resolve("./networkConfigView.css")} */`;

// gen/front_end/panels/network/NetworkConfigView.js
var UIStrings4 = {
  /**
   * @description Text in the Network conditions panel shown in the dropdown where the user chooses the user agent.
   */
  custom: "Custom\u2026",
  /**
   * @description Placeholder text shown in the input box where a user is expected to add a custom user agent.
   */
  enterACustomUserAgent: "Enter a custom user agent",
  /**
   * @description Error message when the custom user agent field is empty.
   */
  customUserAgentFieldIsRequired: "Custom user agent field is required",
  /**
   * @description Header for the caching settings within the network conditions panel.
   */
  caching: "Caching",
  /**
   * @description Option in the network conditions panel to disable the cache.
   */
  disableCache: "Disable cache",
  /**
   * @description Header in Network conditions panel for the network throttling and emulation settings.
   */
  networkThrottling: "Network",
  /**
   * @description Header in the network conditions panel for the user agent settings.
   */
  userAgent: "User agent",
  /**
   * @description User agent setting in the network conditions panel to use the browser's default value.
   */
  selectAutomatically: "Use browser default",
  /**
   * @description Title of a section in the Network conditions panel that includes
   * a set of checkboxes to override the content encodings supported by the browser.
   */
  acceptedEncoding: "Accepted `Content-Encoding`s",
  /**
   * @description Status text displayed after updating user agent client hints.
   */
  clientHintsStatusText: "User agent updated.",
  /**
   * @description The aria alert message when the Network conditions panel is shown.
   */
  networkConditionsPanelShown: "Network conditions shown."
};
var str_4 = i18n7.i18n.registerUIStrings("panels/network/NetworkConfigView.ts", UIStrings4);
var i18nString4 = i18n7.i18n.getLocalizedString.bind(void 0, str_4);
var networkConfigViewInstance;
var NetworkConfigView = class _NetworkConfigView extends UI4.Widget.VBox {
  constructor() {
    super({
      jslog: `${VisualLogging3.panel("network-conditions").track({ resize: true })}`,
      useShadowDom: true
    });
    this.registerRequiredCSS(networkConfigView_css_default);
    this.contentElement.classList.add("network-config");
    this.createCacheSection();
    this.contentElement.createChild("div").classList.add("panel-section-separator");
    this.createNetworkThrottlingSection();
    this.contentElement.createChild("div").classList.add("panel-section-separator");
    this.createUserAgentSection();
    this.contentElement.createChild("div").classList.add("panel-section-separator");
    this.createAcceptedEncodingSection();
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!networkConfigViewInstance || forceNew) {
      networkConfigViewInstance = new _NetworkConfigView();
    }
    return networkConfigViewInstance;
  }
  static createUserAgentSelectAndInput(title) {
    const userAgentSetting = Common3.Settings.Settings.instance().createSetting("custom-user-agent", "");
    const userAgentMetadataSetting = Common3.Settings.Settings.instance().createSetting("custom-user-agent-metadata", null);
    const userAgentSelectElement = document.createElement("select");
    userAgentSelectElement.setAttribute("jslog", `${VisualLogging3.dropDown().track({ change: true }).context(userAgentSetting.name)}`);
    UI4.ARIAUtils.setLabel(userAgentSelectElement, title);
    const customOverride = { title: i18nString4(UIStrings4.custom), value: "custom" };
    userAgentSelectElement.appendChild(UI4.UIUtils.createOption(customOverride.title, customOverride.value, "custom"));
    for (const userAgentDescriptor of userAgentGroups) {
      const groupElement = userAgentSelectElement.createChild("optgroup");
      groupElement.label = userAgentDescriptor.title;
      for (const userAgentVersion of userAgentDescriptor.values) {
        const userAgentValue = SDK3.NetworkManager.MultitargetNetworkManager.patchUserAgentWithChromeVersion(userAgentVersion.value);
        groupElement.appendChild(UI4.UIUtils.createOption(userAgentVersion.title, userAgentValue, Platform2.StringUtilities.toKebabCase(userAgentVersion.title)));
      }
    }
    userAgentSelectElement.selectedIndex = 0;
    const otherUserAgentElement = UI4.UIUtils.createInput("", "text");
    otherUserAgentElement.setAttribute("jslog", `${VisualLogging3.textField().track({ change: true }).context(userAgentSetting.name)}`);
    otherUserAgentElement.value = userAgentSetting.get();
    UI4.Tooltip.Tooltip.install(otherUserAgentElement, userAgentSetting.get());
    otherUserAgentElement.placeholder = i18nString4(UIStrings4.enterACustomUserAgent);
    otherUserAgentElement.required = true;
    UI4.ARIAUtils.setLabel(otherUserAgentElement, otherUserAgentElement.placeholder);
    const errorElement = document.createElement("div");
    errorElement.classList.add("network-config-input-validation-error");
    UI4.ARIAUtils.markAsAlert(errorElement);
    if (!otherUserAgentElement.value) {
      errorElement.textContent = i18nString4(UIStrings4.customUserAgentFieldIsRequired);
    }
    settingChanged();
    userAgentSelectElement.addEventListener("change", userAgentSelected, false);
    otherUserAgentElement.addEventListener("input", applyOtherUserAgent, false);
    function userAgentSelected() {
      const value = userAgentSelectElement.options[userAgentSelectElement.selectedIndex].value;
      if (value !== customOverride.value) {
        userAgentSetting.set(value);
        otherUserAgentElement.value = value;
        UI4.Tooltip.Tooltip.install(otherUserAgentElement, value);
        const userAgentMetadata = getUserAgentMetadata(value);
        userAgentMetadataSetting.set(userAgentMetadata);
        SDK3.NetworkManager.MultitargetNetworkManager.instance().setCustomUserAgentOverride(value, userAgentMetadata);
      } else {
        userAgentMetadataSetting.set(null);
        otherUserAgentElement.select();
      }
      errorElement.textContent = "";
      const userAgentChangeEvent = new CustomEvent("user-agent-change", { detail: { value } });
      userAgentSelectElement.dispatchEvent(userAgentChangeEvent);
    }
    function settingChanged() {
      const value = userAgentSetting.get();
      const options = userAgentSelectElement.options;
      let selectionRestored = false;
      for (let i = 0; i < options.length; ++i) {
        if (options[i].value === value) {
          userAgentSelectElement.selectedIndex = i;
          selectionRestored = true;
          break;
        }
      }
      if (!selectionRestored) {
        userAgentSelectElement.selectedIndex = 0;
      }
    }
    function applyOtherUserAgent() {
      if (userAgentSetting.get() !== otherUserAgentElement.value) {
        if (!otherUserAgentElement.value) {
          errorElement.textContent = i18nString4(UIStrings4.customUserAgentFieldIsRequired);
        } else {
          errorElement.textContent = "";
        }
        userAgentSetting.set(otherUserAgentElement.value);
        UI4.Tooltip.Tooltip.install(otherUserAgentElement, otherUserAgentElement.value);
        settingChanged();
      }
    }
    return { select: userAgentSelectElement, input: otherUserAgentElement, error: errorElement };
  }
  createSection(title, className) {
    const section4 = this.contentElement.createChild("section", "network-config-group");
    if (className) {
      section4.classList.add(className);
    }
    section4.createChild("div", "network-config-title").textContent = title;
    return section4.createChild("div", "network-config-fields");
  }
  createCacheSection() {
    const section4 = this.createSection(i18nString4(UIStrings4.caching), "network-config-disable-cache");
    section4.appendChild(SettingsUI.SettingsUI.createSettingCheckbox(i18nString4(UIStrings4.disableCache), Common3.Settings.Settings.instance().moduleSetting("cache-disabled")));
  }
  createNetworkThrottlingSection() {
    const title = i18nString4(UIStrings4.networkThrottling);
    const section4 = this.createSection(title, "network-config-throttling");
    MobileThrottling2.NetworkThrottlingSelector.NetworkThrottlingSelect.createForGlobalConditions(section4, title);
    const saveDataSelect = MobileThrottling2.ThrottlingManager.throttlingManager().createSaveDataOverrideSelector("chrome-select").element;
    section4.appendChild(saveDataSelect);
  }
  createUserAgentSection() {
    const userAgentMetadataSetting = Common3.Settings.Settings.instance().createSetting("custom-user-agent-metadata", null);
    const customUserAgentSetting = Common3.Settings.Settings.instance().createSetting("custom-user-agent", "");
    const title = i18nString4(UIStrings4.userAgent);
    const section4 = this.createSection(title, "network-config-ua");
    const autoCheckbox = UI4.UIUtils.CheckboxLabel.create(i18nString4(UIStrings4.selectAutomatically), true, void 0, customUserAgentSetting.name);
    section4.appendChild(autoCheckbox);
    customUserAgentSetting.addChangeListener(() => {
      if (autoCheckbox.checked) {
        return;
      }
      const customUA = customUserAgentSetting.get();
      const userAgentMetadata = getUserAgentMetadata(customUA);
      SDK3.NetworkManager.MultitargetNetworkManager.instance().setCustomUserAgentOverride(customUA, userAgentMetadata);
    });
    const customUserAgentSelectBox = section4.createChild("div", "network-config-ua-custom");
    autoCheckbox.addEventListener("change", userAgentSelectBoxChanged);
    const customSelectAndInput = _NetworkConfigView.createUserAgentSelectAndInput(title);
    customUserAgentSelectBox.appendChild(customSelectAndInput.select);
    customUserAgentSelectBox.appendChild(customSelectAndInput.input);
    customUserAgentSelectBox.appendChild(customSelectAndInput.error);
    const clientHints = new EmulationComponents.UserAgentClientHintsForm.UserAgentClientHintsForm();
    const userAgentMetaDataSetting = userAgentMetadataSetting.get();
    const initialUserAgentMetaData = getUserAgentMetadata(customSelectAndInput.select.value);
    clientHints.value = {
      showMobileCheckbox: true,
      showSubmitButton: true,
      metaData: userAgentMetaDataSetting || initialUserAgentMetaData || void 0
    };
    customUserAgentSelectBox.appendChild(clientHints);
    customSelectAndInput.select.addEventListener("user-agent-change", (event) => {
      const userStringValue = event.detail.value;
      const userAgentMetadata = userStringValue ? getUserAgentMetadata(userStringValue) : null;
      clientHints.value = {
        metaData: userAgentMetadata || void 0,
        showMobileCheckbox: true,
        showSubmitButton: true
      };
      userAgentUpdateButtonStatusText.textContent = "";
    });
    clientHints.addEventListener("clienthintschange", () => {
      customSelectAndInput.select.value = "custom";
      userAgentUpdateButtonStatusText.textContent = "";
    });
    clientHints.addEventListener("clienthintssubmit", (event) => {
      const metaData = event.detail.value;
      const customUA = customUserAgentSetting.get();
      userAgentMetadataSetting.set(metaData);
      SDK3.NetworkManager.MultitargetNetworkManager.instance().setCustomUserAgentOverride(customUA, metaData);
      userAgentUpdateButtonStatusText.textContent = i18nString4(UIStrings4.clientHintsStatusText);
    });
    const userAgentUpdateButtonStatusText = section4.createChild("span", "status-text");
    userAgentUpdateButtonStatusText.textContent = "";
    userAgentSelectBoxChanged();
    function userAgentSelectBoxChanged() {
      const useCustomUA = !autoCheckbox.checked;
      customUserAgentSelectBox.classList.toggle("checked", useCustomUA);
      customSelectAndInput.select.disabled = !useCustomUA;
      customSelectAndInput.input.disabled = !useCustomUA;
      customSelectAndInput.error.hidden = !useCustomUA;
      clientHints.disabled = !useCustomUA;
      const customUA = useCustomUA ? customUserAgentSetting.get() : "";
      const userAgentMetadata = useCustomUA ? getUserAgentMetadata(customUA) : null;
      SDK3.NetworkManager.MultitargetNetworkManager.instance().setCustomUserAgentOverride(customUA, userAgentMetadata);
    }
  }
  createAcceptedEncodingSection() {
    const useCustomAcceptedEncodingSetting = Common3.Settings.Settings.instance().createSetting("use-custom-accepted-encodings", false);
    const customAcceptedEncodingSetting = Common3.Settings.Settings.instance().createSetting("custom-accepted-encodings", `${"gzip"},${"br"},${"deflate"}`);
    const title = i18nString4(UIStrings4.acceptedEncoding);
    const section4 = this.createSection(title, "network-config-accepted-encoding");
    const autoCheckbox = UI4.UIUtils.CheckboxLabel.create(i18nString4(UIStrings4.selectAutomatically), true, void 0, useCustomAcceptedEncodingSetting.name);
    section4.appendChild(autoCheckbox);
    function onSettingChange() {
      if (!useCustomAcceptedEncodingSetting.get()) {
        SDK3.NetworkManager.MultitargetNetworkManager.instance().clearCustomAcceptedEncodingsOverride();
      } else {
        SDK3.NetworkManager.MultitargetNetworkManager.instance().setCustomAcceptedEncodingsOverride(customAcceptedEncodingSetting.get() === "" ? [] : customAcceptedEncodingSetting.get().split(","));
      }
    }
    customAcceptedEncodingSetting.addChangeListener(onSettingChange);
    useCustomAcceptedEncodingSetting.addChangeListener(onSettingChange);
    const encodingsSection = section4.createChild("div", "network-config-accepted-encoding-custom");
    encodingsSection.setAttribute("jslog", `${VisualLogging3.section().context(customAcceptedEncodingSetting.name)}`);
    autoCheckbox.checked = !useCustomAcceptedEncodingSetting.get();
    autoCheckbox.addEventListener("change", acceptedEncodingsChanged);
    const checkboxes = /* @__PURE__ */ new Map();
    const contentEncodings = {
      Deflate: "deflate",
      Gzip: "gzip",
      Br: "br",
      Zstd: "zstd"
    };
    for (const encoding of Object.values(contentEncodings)) {
      const checkbox = UI4.UIUtils.CheckboxLabel.createWithStringLiteral(encoding, true, encoding);
      encodingsSection.appendChild(checkbox);
      checkboxes.set(encoding, checkbox);
    }
    for (const [encoding, checkbox] of checkboxes) {
      checkbox.checked = customAcceptedEncodingSetting.get().includes(encoding);
      checkbox.addEventListener("change", acceptedEncodingsChanged);
    }
    acceptedEncodingsChanged();
    function acceptedEncodingsChanged() {
      useCustomAcceptedEncodingSetting.set(!autoCheckbox.checked);
      const encodings = [];
      for (const [encoding, checkbox] of checkboxes) {
        checkbox.disabled = autoCheckbox.checked;
        if (checkbox.checked) {
          encodings.push(encoding);
        }
      }
      customAcceptedEncodingSetting.set(encodings.join(","));
    }
  }
  wasShown() {
    super.wasShown();
    UI4.ARIAUtils.LiveAnnouncer.alert(i18nString4(UIStrings4.networkConditionsPanelShown));
  }
};
function getUserAgentMetadata(userAgent) {
  for (const userAgentDescriptor of userAgentGroups) {
    for (const userAgentVersion of userAgentDescriptor.values) {
      if (userAgent === SDK3.NetworkManager.MultitargetNetworkManager.patchUserAgentWithChromeVersion(userAgentVersion.value)) {
        if (!userAgentVersion.metadata) {
          return null;
        }
        SDK3.NetworkManager.MultitargetNetworkManager.patchUserAgentMetadataWithChromeVersion(userAgentVersion.metadata);
        return userAgentVersion.metadata;
      }
    }
  }
  return null;
}
var userAgentGroups = [
  {
    title: "Android",
    values: [
      {
        title: "Android (4.0.2) Browser \u2014 Galaxy Nexus",
        value: "Mozilla/5.0 (Linux; U; Android 4.0.2; en-us; Galaxy Nexus Build/ICL53F) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30",
        metadata: {
          brands: [
            { brand: "Not A;Brand", version: "99" },
            { brand: "Chromium", version: "%s" },
            { brand: "Google Chrome", version: "%s" }
          ],
          fullVersion: "%s",
          platform: "Android",
          platformVersion: "4.0.2",
          architecture: "",
          model: "Galaxy Nexus",
          mobile: true
        }
      },
      {
        title: "Android (2.3) Browser \u2014 Nexus S",
        value: "Mozilla/5.0 (Linux; U; Android 2.3.6; en-us; Nexus S Build/GRK39F) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1",
        metadata: {
          brands: [
            { brand: "Not A;Brand", version: "99" },
            { brand: "Chromium", version: "%s" },
            { brand: "Google Chrome", version: "%s" }
          ],
          fullVersion: "%s",
          platform: "Android",
          platformVersion: "2.3.6",
          architecture: "",
          model: "Nexus S",
          mobile: true
        }
      }
    ]
  },
  {
    title: "BlackBerry",
    values: [
      {
        title: "BlackBerry \u2014 BB10",
        value: "Mozilla/5.0 (BB10; Touch) AppleWebKit/537.1+ (KHTML, like Gecko) Version/10.0.0.1337 Mobile Safari/537.1+",
        metadata: null
      },
      {
        title: "BlackBerry \u2014 PlayBook 2.1",
        value: "Mozilla/5.0 (PlayBook; U; RIM Tablet OS 2.1.0; en-US) AppleWebKit/536.2+ (KHTML, like Gecko) Version/7.2.1.0 Safari/536.2+",
        metadata: null
      },
      {
        title: "BlackBerry \u2014 9900",
        value: "Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+",
        metadata: null
      }
    ]
  },
  {
    title: "Chrome",
    values: [
      {
        title: "Chrome \u2014 Android Mobile",
        value: "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
        metadata: {
          brands: [
            { brand: "Not A;Brand", version: "99" },
            { brand: "Chromium", version: "%s" },
            { brand: "Google Chrome", version: "%s" }
          ],
          fullVersion: "%s",
          platform: "Android",
          platformVersion: "6.0",
          architecture: "",
          model: "Nexus 5",
          mobile: true
        }
      },
      {
        title: "Chrome \u2014 Android Mobile (high-end)",
        value: "Mozilla/5.0 (Linux; Android 10; Pixel 4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36",
        metadata: {
          brands: [
            { brand: "Not A;Brand", version: "99" },
            { brand: "Chromium", version: "%s" },
            { brand: "Google Chrome", version: "%s" }
          ],
          fullVersion: "%s",
          platform: "Android",
          platformVersion: "10",
          architecture: "",
          model: "Pixel 4",
          mobile: true
        }
      },
      {
        title: "Chrome \u2014 Android Tablet",
        value: "Mozilla/5.0 (Linux; Android 4.3; Nexus 7 Build/JSS15Q) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36",
        metadata: {
          brands: [
            { brand: "Not A;Brand", version: "99" },
            { brand: "Chromium", version: "%s" },
            { brand: "Google Chrome", version: "%s" }
          ],
          fullVersion: "%s",
          platform: "Android",
          platformVersion: "4.3",
          architecture: "",
          model: "Nexus 7",
          mobile: true
        }
      },
      {
        title: "Chrome \u2014 iPhone",
        value: "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/%s Mobile/15E148 Safari/604.1",
        metadata: null
      },
      {
        title: "Chrome \u2014 iPad",
        value: "Mozilla/5.0 (iPad; CPU OS 13_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/%s Mobile/15E148 Safari/604.1",
        metadata: null
      },
      {
        title: "Chrome \u2014 Chrome OS",
        value: "Mozilla/5.0 (X11; CrOS x86_64 10066.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36",
        metadata: {
          brands: [
            { brand: "Not A;Brand", version: "99" },
            { brand: "Chromium", version: "%s" },
            { brand: "Google Chrome", version: "%s" }
          ],
          fullVersion: "%s",
          platform: "Chrome OS",
          platformVersion: "10066.0.0",
          architecture: "x86",
          model: "",
          mobile: false
        }
      },
      {
        title: "Chrome \u2014 Mac",
        value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36",
        metadata: {
          brands: [
            { brand: "Not A;Brand", version: "99" },
            { brand: "Chromium", version: "%s" },
            { brand: "Google Chrome", version: "%s" }
          ],
          fullVersion: "%s",
          platform: "macOS",
          platformVersion: "10_14_6",
          architecture: "x86",
          model: "",
          mobile: false
        }
      },
      {
        title: "Chrome \u2014 Windows",
        value: "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36",
        metadata: {
          brands: [
            { brand: "Not A;Brand", version: "99" },
            { brand: "Chromium", version: "%s" },
            { brand: "Google Chrome", version: "%s" }
          ],
          fullVersion: "%s",
          platform: "Windows",
          platformVersion: "10.0",
          architecture: "x86",
          model: "",
          mobile: false
        }
      }
    ]
  },
  {
    title: "Firefox",
    values: [
      {
        title: "Firefox \u2014 Android Mobile",
        value: "Mozilla/5.0 (Android 4.4; Mobile; rv:70.0) Gecko/70.0 Firefox/70.0",
        metadata: null
      },
      {
        title: "Firefox \u2014 Android Tablet",
        value: "Mozilla/5.0 (Android 4.4; Tablet; rv:70.0) Gecko/70.0 Firefox/70.0",
        metadata: null
      },
      {
        title: "Firefox \u2014 iPhone",
        value: "Mozilla/5.0 (iPhone; CPU iPhone OS 8_3 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) FxiOS/1.0 Mobile/12F69 Safari/600.1.4",
        metadata: null
      },
      {
        title: "Firefox \u2014 iPad",
        value: "Mozilla/5.0 (iPad; CPU iPhone OS 8_3 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) FxiOS/1.0 Mobile/12F69 Safari/600.1.4",
        metadata: null
      },
      {
        title: "Firefox \u2014 Mac",
        value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:70.0) Gecko/20100101 Firefox/70.0",
        metadata: null
      },
      {
        title: "Firefox \u2014 Windows",
        value: "Mozilla/5.0 (Windows NT 10.0; WOW64; rv:70.0) Gecko/20100101 Firefox/70.0",
        metadata: null
      }
    ]
  },
  {
    title: "Googlebot",
    values: [
      {
        title: "Googlebot",
        value: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        metadata: null
      },
      {
        title: "Googlebot Desktop",
        value: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/%s Safari/537.36",
        metadata: null
      },
      {
        title: "Googlebot Smartphone",
        value: "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        metadata: null
      }
    ]
  },
  {
    title: "Internet Explorer",
    values: [
      {
        title: "Internet Explorer 11",
        value: "Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko",
        metadata: null
      },
      {
        title: "Internet Explorer 10",
        value: "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)",
        metadata: null
      },
      {
        title: "Internet Explorer 9",
        value: "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)",
        metadata: null
      },
      {
        title: "Internet Explorer 8",
        value: "Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0)",
        metadata: null
      },
      { title: "Internet Explorer 7", value: "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)", metadata: null }
    ]
  },
  {
    title: "Microsoft Edge",
    values: [
      {
        title: "Microsoft Edge (Chromium) \u2014 Windows",
        value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36 Edg/%s",
        metadata: {
          brands: [
            { brand: "Not A;Brand", version: "99" },
            { brand: "Chromium", version: "%s" },
            { brand: "Microsoft Edge", version: "%s" }
          ],
          fullVersion: "%s",
          platform: "Windows",
          platformVersion: "10.0",
          architecture: "x86",
          model: "",
          mobile: false
        }
      },
      {
        title: "Microsoft Edge (Chromium) \u2014 Mac",
        value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Chrome/%s Safari/604.1 Edg/%s",
        metadata: {
          brands: [
            { brand: "Not A;Brand", version: "99" },
            { brand: "Chromium", version: "%s" },
            { brand: "Microsoft Edge", version: "%s" }
          ],
          fullVersion: "%s",
          platform: "macOS",
          platformVersion: "10_14_6",
          architecture: "x86",
          model: "",
          mobile: false
        }
      },
      {
        title: "Microsoft Edge \u2014 iPhone",
        value: "Mozilla/5.0 (iPhone; CPU iPhone OS 12_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.1 EdgiOS/44.5.0.10 Mobile/15E148 Safari/604.1",
        metadata: null
      },
      {
        title: "Microsoft Edge \u2014 iPad",
        value: "Mozilla/5.0 (iPad; CPU OS 12_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 EdgiOS/44.5.2 Mobile/15E148 Safari/605.1.15",
        metadata: null
      },
      {
        title: "Microsoft Edge \u2014 Android Mobile",
        value: "Mozilla/5.0 (Linux; Android 8.1.0; Pixel Build/OPM4.171019.021.D1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36 EdgA/42.0.0.2057",
        metadata: {
          brands: [
            { brand: "Not A;Brand", version: "99" },
            { brand: "Chromium", version: "%s" },
            { brand: "Microsoft Edge", version: "%s" }
          ],
          fullVersion: "%s",
          platform: "Android",
          platformVersion: "8.1.0",
          architecture: "",
          model: "Pixel",
          mobile: true
        }
      },
      {
        title: "Microsoft Edge \u2014 Android Tablet",
        value: "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 7 Build/MOB30X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36 EdgA/42.0.0.2057",
        metadata: {
          brands: [
            { brand: "Not A;Brand", version: "99" },
            { brand: "Chromium", version: "%s" },
            { brand: "Microsoft Edge", version: "%s" }
          ],
          fullVersion: "%s",
          platform: "Android",
          platformVersion: "6.0.1",
          architecture: "",
          model: "Nexus 7",
          mobile: true
        }
      },
      {
        title: "Microsoft Edge (EdgeHTML) \u2014 Windows",
        value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36 Edge/18.19042",
        metadata: null
      },
      {
        title: "Microsoft Edge (EdgeHTML) \u2014 XBox",
        value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; Xbox; Xbox One) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36 Edge/18.19041",
        metadata: null
      }
    ]
  },
  {
    title: "Opera",
    values: [
      {
        title: "Opera \u2014 Mac",
        value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36 OPR/65.0.3467.48",
        metadata: null
      },
      {
        title: "Opera \u2014 Windows",
        value: "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36 OPR/65.0.3467.48",
        metadata: null
      },
      {
        title: "Opera (Presto) \u2014 Mac",
        value: "Opera/9.80 (Macintosh; Intel Mac OS X 10.9.1) Presto/2.12.388 Version/12.16",
        metadata: null
      },
      {
        title: "Opera (Presto) \u2014 Windows",
        value: "Opera/9.80 (Windows NT 6.1) Presto/2.12.388 Version/12.16",
        metadata: null
      },
      {
        title: "Opera Mobile \u2014 Android Mobile",
        value: "Opera/12.02 (Android 4.1; Linux; Opera Mobi/ADR-1111101157; U; en-US) Presto/2.9.201 Version/12.02",
        metadata: null
      },
      {
        title: "Opera Mini \u2014 iOS",
        value: "Opera/9.80 (iPhone; Opera Mini/8.0.0/34.2336; U; en) Presto/2.8.119 Version/11.10",
        metadata: null
      }
    ]
  },
  {
    title: "Safari",
    values: [
      {
        title: "Safari \u2014 iPad iOS 13.2",
        value: "Mozilla/5.0 (iPad; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1",
        metadata: null
      },
      {
        title: "Safari \u2014 iPhone iOS 13.2",
        value: "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1",
        metadata: null
      },
      {
        title: "Safari \u2014 Mac",
        value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Safari/605.1.15",
        metadata: null
      }
    ]
  },
  {
    title: "UC Browser",
    values: [
      {
        title: "UC Browser \u2014 Android Mobile",
        value: "Mozilla/5.0 (Linux; U; Android 8.1.0; en-US; Nexus 6P Build/OPM7.181205.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/%s UCBrowser/12.11.1.1197 Mobile Safari/537.36",
        metadata: null
      },
      {
        title: "UC Browser \u2014 iOS",
        value: "Mozilla/5.0 (iPhone; CPU iPhone OS 12_1 like Mac OS X; zh-CN) AppleWebKit/537.51.1 (KHTML, like Gecko) Mobile/16B92 UCBrowser/12.1.7.1109 Mobile AliApp(TUnionSDK/0.1.20.3)",
        metadata: null
      },
      {
        title: "UC Browser \u2014 Windows Phone",
        value: "Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0; ARM; Touch; NOKIA; Lumia 920) UCBrowser/10.1.0.563 Mobile",
        metadata: null
      }
    ]
  }
];

// gen/front_end/panels/network/NetworkDataGridNode.js
var NetworkDataGridNode_exports = {};
__export(NetworkDataGridNode_exports, {
  NetworkGroupNode: () => NetworkGroupNode,
  NetworkNode: () => NetworkNode,
  NetworkRequestNode: () => NetworkRequestNode,
  _backgroundColors: () => _backgroundColors
});
import * as Common4 from "./../../core/common/common.js";
import * as Host3 from "./../../core/host/host.js";
import * as i18n9 from "./../../core/i18n/i18n.js";
import * as Platform3 from "./../../core/platform/platform.js";
import * as SDK4 from "./../../core/sdk/sdk.js";
import * as Bindings from "./../../models/bindings/bindings.js";
import * as Logs2 from "./../../models/logs/logs.js";
import * as NetworkForward from "./forward/forward.js";
import * as Buttons2 from "./../../ui/components/buttons/buttons.js";
import * as IconButton from "./../../ui/components/icon_button/icon_button.js";
import * as DataGrid3 from "./../../ui/legacy/components/data_grid/data_grid.js";
import * as PerfUI from "./../../ui/legacy/components/perf_ui/perf_ui.js";
import * as Components from "./../../ui/legacy/components/utils/utils.js";
import * as UI5 from "./../../ui/legacy/legacy.js";
import { render as render2 } from "./../../ui/lit/lit.js";
import { PanelUtils as PanelUtils3 } from "./../utils/utils.js";
var UIStrings5 = {
  /**
   * @description Text in Network Data Grid Node of the Network panel
   */
  redirect: "Redirect",
  /**
   * @description Content of the request method column in the network log view. Some requests require an additional request to check permissions, and this additional request is called 'Preflight Request', see https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request. In the request method column we use, for example, 'POST + Preflight' to indicate that the request method was 'POST' and the request was accompanied by a preflight request. Since the column is short, the translation for Preflight in this context should ideally also be short.
   * @example {GET} PH1
   */
  sPreflight: "{PH1} + Preflight",
  /**
   * @description Name of a network initiator type
   */
  preflight: "Preflight",
  /**
   * @description Title for a link element in the network log view
   */
  selectPreflightRequest: "Select preflight request",
  /**
   * @description Text in Network Data Grid Node of the Network panel
   */
  failed: "(failed)",
  /**
   * @description Text in Network Data Grid Node of the Network panel
   */
  data: "(data)",
  /**
   * @description Text in Network Data Grid Node of the Network panel. Indicates a network request has
   * been canceled.
   */
  canceled: "(canceled)",
  /**
   * @description Reason in Network Data Grid Node of the Network panel
   */
  other: "other",
  /**
   * @description Reason in Network Data Grid Node of the Network panel
   */
  csp: "csp",
  /**
   * @description Reason in Network Data Grid Node of the Network panel
   */
  origin: "origin",
  /**
   * @description Reason why a request was blocked shown in the Network panel
   */
  coepFrameResourceNeedsCoepHeader: "COEP-framed resource needs COEP header",
  /**
   * @description Reason why a request was blocked shown in the Network panel
   */
  coopSandboxedIframeCannotNavigateToCoopPage: "Sandboxed iframe's popup cannot navigate to COOP page",
  /**
   * @description Reason why a request was blocked shown in the Network panel
   */
  corpNotSameOrigin: 'CORP not "same-origin"',
  /**
   * @description Reason why a request was blocked shown in the Network panel
   */
  corpNotSameSite: 'CORP not "same-site"',
  /**
   * @description Reason why a request was blocked shown in the Network panel
   */
  corpNotSameOriginAfterDefaultedToSameOriginByCoep: 'CORP not "same-origin" after defaulted to "same-origin" by COEP',
  /**
   * @description Noun. Shown in a table cell as the reason why a network request failed. "integrity" here refers to the integrity of the network request itself in a cryptographic sense: signature verification might have failed, for instance.
   */
  integrity: "integrity",
  /**
   * @description Reason in Network Data Grid Node of the Network panel
   */
  devtools: "devtools",
  /**
   * @description Text in Network Data Grid Node of the Network panel
   * @example {mixed-content} PH1
   */
  blockeds: "(blocked:{PH1})",
  /**
   * @description Text in Network Data Grid Node of the Network panel
   */
  blockedTooltip: "This request was blocked due to misconfigured response headers, click to view the headers",
  /**
   * @description Text in Network Data Grid Node of the Network panel
   */
  corsError: "CORS error",
  /**
   * @description Tooltip providing the cors error code
   * @example {PreflightDisallowedRedirect} PH1
   */
  crossoriginResourceSharingErrorS: "Cross-Origin Resource Sharing error: {PH1}",
  /**
   * @description Text in Network Data Grid Node of the Network panel
   */
  finished: "Finished",
  /**
   * @description Status text in the Network panel that indicates a network request is still loading
   * and has not finished yet (is pending).
   */
  pendingq: "(pending)",
  /**
   * @description Status text in the Network panel that indicates a network request state is not known.
   */
  unknown: "(unknown)",
  /**
   * @description Tooltip providing details on why the request has unknown status.
   */
  unknownExplanation: "The request status cannot be shown here because the page that issued it unloaded while the request was in flight. You can use chrome://net-export to capture a network log and see all request details.",
  /**
   * @description Text in Network Data Grid Node of the Network panel. Noun, short for a 'HTTP server
   * push'.
   */
  push: "Push / ",
  /**
   * @description Text in Network Data Grid Node of the Network panel
   */
  parser: "Parser",
  /**
   * @description Label for a group of JavaScript files
   */
  script: "Script",
  /**
   * @description Cell title in Network Data Grid Node of the Network panel
   */
  preload: "Preload",
  /**
   * @description Cell title in Network Data Grid Node of the Network panel
   */
  earlyHints: "early-hints",
  /**
   * @description Text in Network Data Grid Node of the Network panel
   */
  signedexchange: "signed-exchange",
  /**
   * @description Title for a link element in the network log view
   */
  selectTheRequestThatTriggered: "Select the request that triggered this preflight",
  /**
   * @description Text for other types of items
   */
  otherC: "Other",
  /**
   * @description Text of a DOM element in Network Data Grid Node of the Network panel
   */
  memoryCache: "(memory cache)",
  /**
   * @description Cell title in Network Data Grid Node of the Network panel. Indicates that the response came from memory cache.
   * @example {50 B} PH1
   */
  servedFromMemoryCacheResource: "Served from memory cache, resource size: {PH1}",
  /**
   * @description Text of a DOM element in Network Data Grid Node of the Network panel
   */
  serviceWorker: "(`ServiceWorker`)",
  /**
   * @description Cell title in Network Data Grid Node of the Network panel
   * @example {4 B} PH1
   * @example {10 B} PH2
   */
  servedFromNetwork: "{PH1} transferred over network, resource size: {PH2}",
  /**
   * @description Cell title in Network Data Grid Node of the Network panel
   * @example {Fast 4G} PH1
   */
  wasThrottled: "Request was throttled ({PH1})",
  /**
   * @description Cell title in Network Data Grid Node of the Network panel
   * @example {4 B} PH1
   * @example {10 B} PH2
   */
  servedFromNetworkMissingServiceWorkerRoute: "{PH1} transferred over network, resource size: {PH2}, no matching ServiceWorker routes",
  /**
   * @description Cell title in Network Data Grid Node of the Network panel
   * @example {4 B} PH1
   */
  servedFromServiceWorkerResource: "Served from `ServiceWorker`, resource size: {PH1}",
  /**
   * @description Cell title in Network Data Grid Node of the Network panel
   * @example {4 B} PH1
   */
  servedFromSignedHttpExchange: "Served from Signed HTTP Exchange, resource size: {PH1}",
  /**
   * @description Text of a DOM element in Network Data Grid Node of the Network panel
   */
  prefetchCache: "(prefetch cache)",
  /**
   * @description Cell title in Network Data Grid Node of the Network panel
   * @example {4 B} PH1
   */
  servedFromPrefetchCacheResource: "Served from prefetch cache, resource size: {PH1}",
  /**
   * @description Text of a DOM element in Network Data Grid Node of the Network panel
   */
  diskCache: "(disk cache)",
  /**
   * @description Cell title in Network Data Grid Node of the Network panel
   * @example {10 B} PH1
   */
  servedFromDiskCacheResourceSizeS: "Served from disk cache, resource size: {PH1}",
  /**
   * @description Cell title in Network Data Grid Node of the Network panel
   * @example {1} PH1
   * @example {4 B} PH2
   */
  matchedToServiceWorkerRouter: "Matched to `ServiceWorker router`#{PH1}, resource size: {PH2}",
  /**
   * @description Cell title in Network Data Grid Node of the Network panel
   * @example {1} PH1
   * @example {4 B} PH2
   * @example {12 B} PH3
   */
  matchedToServiceWorkerRouterWithNetworkSource: "Matched to `ServiceWorker router`#{PH1}, {PH2} transferred over network, resource size: {PH3}",
  /**
   * @description Text in Network Data Grid Node of the Network panel
   */
  pending: "Pending",
  /**
   * @description Text describing the depth of a top level node in the network datagrid
   */
  level: "level 1",
  /**
   * @description Tooltip text for subtitles of Time cells in Network request rows. Latency is the time difference
   * between the time a response to a network request is received and the time the request is started.
   */
  timeSubtitleTooltipText: "Latency (response received time - start time)",
  /**
   * @description Tooltip text giving the reason why a specific HTTP transport protocol has been used
   */
  alternativeJobWonWithoutRace: "`Chrome` used a `HTTP/3` connection induced by an '`Alt-Svc`' header without racing against establishing a connection using a different `HTTP` version.",
  /**
   * @description Tooltip text giving the reason why a specific HTTP transport protocol has been used
   */
  alternativeJobWonRace: "`Chrome` used a `HTTP/3` connection induced by an '`Alt-Svc`' header because it won a race against establishing a connection using a different `HTTP` version.",
  /**
   * @description Tooltip text giving the reason why a specific HTTP transport protocol has been used
   */
  mainJobWonRace: "`Chrome` used this protocol because it won a race against establishing a `HTTP/3` connection.",
  /**
   * @description Tooltip text giving the reason why a specific HTTP transport protocol has been used
   */
  mappingMissing: "`Chrome` did not use an alternative `HTTP` version because no alternative protocol information was available when the request was issued, but an '`Alt-Svc`' header was present in the response.",
  /**
   * @description Tooltip text giving the reason why a specific HTTP transport protocol has been used
   */
  broken: "`Chrome` did not try to establish a `HTTP/3` connection because it was marked as broken.",
  /**
   * @description Tooltip text giving the reason why a specific HTTP transport protocol has been used
   */
  dnsAlpnH3JobWonWithoutRace: "`Chrome` used a `HTTP/3` connection due to the `DNS record` indicating `HTTP/3` support. There was no race against establishing a connection using a different `HTTP` version.",
  /**
   * @description Tooltip text giving the reason why a specific HTTP transport protocol has been used
   */
  dnsAlpnH3JobWonRace: "`Chrome` used a `HTTP/3` connection due to the `DNS record` indicating `HTTP/3` support, which won a race against establishing a connection using a different `HTTP` version.",
  /**
   * @description Tooltip to explain the resource's initial priority
   * @example {High} PH1
   * @example {Low} PH2
   */
  initialPriorityToolTip: "{PH1}, Initial priority: {PH2}",
  /**
   * @description Tooltip to explain why the request has an IPP icon
   */
  responseIsIpProtectedToolTip: "This request was sent through IP Protection proxies."
};
var str_5 = i18n9.i18n.registerUIStrings("panels/network/NetworkDataGridNode.ts", UIStrings5);
var i18nString5 = i18n9.i18n.getLocalizedString.bind(void 0, str_5);
var NetworkNode = class extends DataGrid3.SortableDataGrid.SortableDataGridNode {
  parentViewInternal;
  isHovered;
  showingInitiatorChainInternal;
  requestOrFirstKnownChildRequestInternal;
  constructor(parentView) {
    super({});
    this.parentViewInternal = parentView;
    this.isHovered = false;
    this.showingInitiatorChainInternal = false;
    this.requestOrFirstKnownChildRequestInternal = null;
  }
  displayName() {
    return "";
  }
  displayType() {
    return "";
  }
  createCell(columnId) {
    const cell = this.createTD(columnId);
    this.renderCell(cell, columnId);
    return cell;
  }
  renderCell(_cell, _columnId) {
  }
  isError() {
    return false;
  }
  isWarning() {
    return false;
  }
  backgroundColor() {
    const bgColors = _backgroundColors;
    const hasFocus = document.hasFocus();
    const isSelected = this.dataGrid && this.dataGrid.element === document.activeElement;
    const isWarning = this.isWarning();
    const isError = this.isError();
    if (this.selected && hasFocus && isSelected && isError) {
      return bgColors.FocusSelectedHasError;
    }
    if (this.selected && hasFocus && isSelected && isWarning) {
      return bgColors.FocusSelectedHasWarning;
    }
    if (this.selected && hasFocus && isSelected) {
      return bgColors.FocusSelected;
    }
    if (this.selected) {
      return bgColors.Selected;
    }
    if (this.hovered()) {
      return bgColors.Hovered;
    }
    if (this.isOnInitiatorPath()) {
      return bgColors.InitiatorPath;
    }
    if (this.isOnInitiatedPath()) {
      return bgColors.InitiatedPath;
    }
    if (this.isStriped()) {
      return bgColors.Stripe;
    }
    return bgColors.Default;
  }
  updateBackgroundColor() {
    const element = this.existingElement();
    if (!element) {
      return;
    }
    element.style.backgroundColor = `var(${this.backgroundColor()})`;
    this.parentViewInternal.stylesChanged();
  }
  setStriped(isStriped) {
    super.setStriped(isStriped);
    this.updateBackgroundColor();
  }
  select(suppressSelectedEvent) {
    super.select(suppressSelectedEvent);
    this.updateBackgroundColor();
    this.parentViewInternal.updateNodeSelectedClass(
      /* isSelected */
      true
    );
  }
  deselect(suppressSelectedEvent) {
    super.deselect(suppressSelectedEvent);
    this.updateBackgroundColor();
    this.parentViewInternal.updateNodeSelectedClass(
      /* isSelected */
      false
    );
  }
  parentView() {
    return this.parentViewInternal;
  }
  hovered() {
    return this.isHovered;
  }
  showingInitiatorChain() {
    return this.showingInitiatorChainInternal;
  }
  nodeSelfHeight() {
    return this.parentViewInternal.rowHeight();
  }
  setHovered(hovered, showInitiatorChain) {
    if (this.isHovered === hovered && this.showingInitiatorChainInternal === showInitiatorChain) {
      return;
    }
    if (this.isHovered !== hovered) {
      this.isHovered = hovered;
      if (this.attached()) {
        this.element().classList.toggle("hover", hovered);
      }
    }
    if (this.showingInitiatorChainInternal !== showInitiatorChain) {
      this.showingInitiatorChainInternal = showInitiatorChain;
      this.showingInitiatorChainChanged();
    }
    this.parentViewInternal.stylesChanged();
    this.updateBackgroundColor();
  }
  showingInitiatorChainChanged() {
  }
  isOnInitiatorPath() {
    return false;
  }
  isOnInitiatedPath() {
    return false;
  }
  request() {
    return null;
  }
  isNavigationRequest() {
    return false;
  }
  clearFlatNodes() {
    super.clearFlatNodes();
    this.requestOrFirstKnownChildRequestInternal = null;
  }
  requestOrFirstKnownChildRequest() {
    if (this.requestOrFirstKnownChildRequestInternal) {
      return this.requestOrFirstKnownChildRequestInternal;
    }
    let request = this.request();
    if (request || !this.hasChildren()) {
      this.requestOrFirstKnownChildRequestInternal = request;
      return this.requestOrFirstKnownChildRequestInternal;
    }
    let firstChildRequest = null;
    const flatChildren = this.flatChildren();
    for (let i = 0; i < flatChildren.length; i++) {
      request = flatChildren[i].request();
      if (!firstChildRequest || request && request.issueTime() < firstChildRequest.issueTime()) {
        firstChildRequest = request;
      }
    }
    this.requestOrFirstKnownChildRequestInternal = firstChildRequest;
    return this.requestOrFirstKnownChildRequestInternal;
  }
};
var _backgroundColors = {
  Default: "--color-grid-default",
  Stripe: "--color-grid-stripe",
  Navigation: "--network-grid-navigation-color",
  Hovered: "--color-grid-hovered",
  InitiatorPath: "--network-grid-initiator-path-color",
  InitiatedPath: "--network-grid-initiated-path-color",
  Selected: "--color-grid-selected",
  FocusSelected: "--color-grid-focus-selected",
  FocusSelectedHasError: "--network-grid-focus-selected-color-has-error",
  FocusSelectedHasWarning: "--network-grid-focus-selected-color-has-warning",
  FromFrame: "--network-grid-from-frame-color"
};
var NetworkRequestNode = class _NetworkRequestNode extends NetworkNode {
  initiatorCell;
  requestInternal;
  isNavigationRequestInternal;
  selectable;
  isOnInitiatorPathInternal;
  isOnInitiatedPathInternal;
  linkifiedInitiatorAnchor;
  constructor(parentView, request) {
    super(parentView);
    this.initiatorCell = null;
    this.requestInternal = request;
    this.isNavigationRequestInternal = false;
    this.selectable = true;
    this.isOnInitiatorPathInternal = false;
    this.isOnInitiatedPathInternal = false;
  }
  static NameComparator(a, b) {
    const aName = a.displayName().toLowerCase();
    const bName = b.displayName().toLowerCase();
    if (aName === bName) {
      const aRequest = a.requestOrFirstKnownChildRequest();
      const bRequest = b.requestOrFirstKnownChildRequest();
      if (aRequest && bRequest) {
        return aRequest.identityCompare(bRequest);
      }
      return aRequest ? -1 : 1;
    }
    return aName < bName ? -1 : 1;
  }
  static RemoteAddressComparator(a, b) {
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    const aRemoteAddress = aRequest.remoteAddress();
    const bRemoteAddress = bRequest.remoteAddress();
    if (aRemoteAddress > bRemoteAddress) {
      return 1;
    }
    if (bRemoteAddress > aRemoteAddress) {
      return -1;
    }
    return aRequest.identityCompare(bRequest);
  }
  static SizeComparator(a, b) {
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    if (bRequest.cached() && !aRequest.cached()) {
      return 1;
    }
    if (aRequest.cached() && !bRequest.cached()) {
      return -1;
    }
    return aRequest.transferSize - bRequest.transferSize || aRequest.resourceSize - bRequest.resourceSize || aRequest.identityCompare(bRequest);
  }
  static TypeComparator(a, b) {
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    const aSimpleType = a.displayType();
    const bSimpleType = b.displayType();
    if (aSimpleType > bSimpleType) {
      return 1;
    }
    if (bSimpleType > aSimpleType) {
      return -1;
    }
    return aRequest.identityCompare(bRequest);
  }
  static InitiatorComparator(a, b) {
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    const aHasInitiatorCell = a instanceof _NetworkRequestNode && a.initiatorCell;
    const bHasInitiatorCell = b instanceof _NetworkRequestNode && b.initiatorCell;
    if (!aHasInitiatorCell || !bHasInitiatorCell) {
      return !aHasInitiatorCell ? -1 : 1;
    }
    const networkRequestNodeA = a;
    const networkRequestNodeB = b;
    const aText = networkRequestNodeA.linkifiedInitiatorAnchor ? networkRequestNodeA.linkifiedInitiatorAnchor.textContent || "" : networkRequestNodeA.initiatorCell.title;
    const bText = networkRequestNodeB.linkifiedInitiatorAnchor ? networkRequestNodeB.linkifiedInitiatorAnchor.textContent || "" : networkRequestNodeB.initiatorCell.title;
    return aText.localeCompare(bText);
  }
  static InitiatorAddressSpaceComparator(a, b) {
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    const aClientSecurityState = aRequest.clientSecurityState();
    const bClientSecurityState = bRequest.clientSecurityState();
    if (!aClientSecurityState || !bClientSecurityState) {
      return !aClientSecurityState ? -1 : 1;
    }
    return aClientSecurityState.initiatorIPAddressSpace.localeCompare(bClientSecurityState.initiatorIPAddressSpace);
  }
  static RemoteAddressSpaceComparator(a, b) {
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    return aRequest.remoteAddressSpace().localeCompare(bRequest.remoteAddressSpace());
  }
  static RequestCookiesCountComparator(a, b) {
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    const aScore = aRequest.includedRequestCookies().length;
    const bScore = bRequest.includedRequestCookies().length;
    return aScore - bScore || aRequest.identityCompare(bRequest);
  }
  // TODO(allada) This function deserves to be in a network-common of some sort.
  static ResponseCookiesCountComparator(a, b) {
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    const aScore = aRequest.responseCookies ? aRequest.responseCookies.length : 0;
    const bScore = bRequest.responseCookies ? bRequest.responseCookies.length : 0;
    return aScore - bScore || aRequest.identityCompare(bRequest);
  }
  static PriorityComparator(a, b) {
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    const aPriority = aRequest.priority();
    let aScore = aPriority ? PerfUI.NetworkPriorities.networkPriorityWeight(aPriority) : 0;
    aScore = aScore || 0;
    const bPriority = bRequest.priority();
    let bScore = bPriority ? PerfUI.NetworkPriorities.networkPriorityWeight(bPriority) : 0;
    bScore = bScore || 0;
    return aScore - bScore || aRequest.identityCompare(bRequest);
  }
  static IsAdRelatedComparator(a, b) {
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    const aIsAdRelated = aRequest.isAdRelated();
    const bIsAdRelated = bRequest.isAdRelated();
    if (aIsAdRelated > bIsAdRelated) {
      return 1;
    }
    if (bIsAdRelated > aIsAdRelated) {
      return -1;
    }
    return aRequest.identityCompare(bRequest);
  }
  static RequestPropertyComparator(propertyName, a, b) {
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    const aValue = aRequest[propertyName];
    const bValue = bRequest[propertyName];
    if (aValue === bValue) {
      return aRequest.identityCompare(bRequest);
    }
    return aValue > bValue ? 1 : -1;
  }
  static RequestURLComparator(a, b) {
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    const aURL = aRequest.url();
    const bURL = bRequest.url();
    if (aURL === bURL) {
      return aRequest.identityCompare(bRequest);
    }
    return aURL > bURL ? 1 : -1;
  }
  static HeaderStringComparator(getHeaderValue, propertyName, a, b) {
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    const aValue = String(getHeaderValue(aRequest, propertyName) || "");
    const bValue = String(getHeaderValue(bRequest, propertyName) || "");
    return aValue.localeCompare(bValue) || aRequest.identityCompare(bRequest);
  }
  static ResponseHeaderStringComparator = _NetworkRequestNode.HeaderStringComparator.bind(null, (req, name) => req.responseHeaderValue(name));
  static RequestHeaderStringComparator = _NetworkRequestNode.HeaderStringComparator.bind(null, (req, name) => req.requestHeaderValue(name));
  static ResponseHeaderNumberComparator(propertyName, a, b) {
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    const aRawValue = aRequest.responseHeaderValue(propertyName);
    const aValue = aRawValue !== void 0 ? parseFloat(aRawValue) : -Infinity;
    const bRawValue = bRequest.responseHeaderValue(propertyName);
    const bValue = bRawValue !== void 0 ? parseFloat(bRawValue) : -Infinity;
    if (aValue === bValue) {
      return aRequest.identityCompare(bRequest);
    }
    return aValue > bValue ? 1 : -1;
  }
  static ResponseHeaderDateComparator(propertyName, a, b) {
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    const aHeader = aRequest.responseHeaderValue(propertyName);
    const bHeader = bRequest.responseHeaderValue(propertyName);
    const aValue = aHeader ? new Date(aHeader).getTime() : -Infinity;
    const bValue = bHeader ? new Date(bHeader).getTime() : -Infinity;
    if (aValue === bValue) {
      return aRequest.identityCompare(bRequest);
    }
    return aValue > bValue ? 1 : -1;
  }
  showingInitiatorChainChanged() {
    const showInitiatorChain = this.showingInitiatorChain();
    const initiatorGraph = Logs2.NetworkLog.NetworkLog.instance().initiatorGraphForRequest(this.requestInternal);
    for (const request of initiatorGraph.initiators) {
      if (request === this.requestInternal) {
        continue;
      }
      const node = this.parentView().nodeForRequest(request);
      if (!node) {
        continue;
      }
      node.setIsOnInitiatorPath(showInitiatorChain);
    }
    for (const request of initiatorGraph.initiated.keys()) {
      if (request === this.requestInternal) {
        continue;
      }
      const node = this.parentView().nodeForRequest(request);
      if (!node) {
        continue;
      }
      node.setIsOnInitiatedPath(showInitiatorChain);
    }
  }
  setIsOnInitiatorPath(isOnInitiatorPath) {
    if (this.isOnInitiatorPathInternal === isOnInitiatorPath || !this.attached()) {
      return;
    }
    this.isOnInitiatorPathInternal = isOnInitiatorPath;
    this.updateBackgroundColor();
  }
  isOnInitiatorPath() {
    return this.isOnInitiatorPathInternal;
  }
  setIsOnInitiatedPath(isOnInitiatedPath) {
    if (this.isOnInitiatedPathInternal === isOnInitiatedPath || !this.attached()) {
      return;
    }
    this.isOnInitiatedPathInternal = isOnInitiatedPath;
    this.updateBackgroundColor();
  }
  isOnInitiatedPath() {
    return this.isOnInitiatedPathInternal;
  }
  displayType() {
    const mimeType = this.requestInternal.mimeType || this.requestInternal.requestContentType() || "";
    const resourceType = this.requestInternal.resourceType();
    let simpleType = resourceType.name();
    if (this.requestInternal.fromEarlyHints()) {
      return i18nString5(UIStrings5.earlyHints);
    }
    if (resourceType === Common4.ResourceType.resourceTypes.Other || resourceType === Common4.ResourceType.resourceTypes.Image) {
      simpleType = mimeType.replace(/^(application|image)\//, "");
    }
    if (this.requestInternal.isRedirect()) {
      simpleType += " / " + i18nString5(UIStrings5.redirect);
    }
    return simpleType;
  }
  displayName() {
    return this.requestInternal.name();
  }
  request() {
    return this.requestInternal;
  }
  isNavigationRequest() {
    const pageLoad = SDK4.PageLoad.PageLoad.forRequest(this.requestInternal);
    return pageLoad ? pageLoad.mainRequest === this.requestInternal : false;
  }
  nodeSelfHeight() {
    return this.parentView().rowHeight();
  }
  isPrefetch() {
    return this.requestInternal.resourceType() === Common4.ResourceType.resourceTypes.Prefetch;
  }
  throttlingConditions() {
    return SDK4.NetworkManager.MultitargetNetworkManager.instance().appliedRequestConditions(this.requestInternal);
  }
  isWarning() {
    return this.isFailed() && this.isPrefetch();
  }
  isError() {
    return this.isFailed() && !this.isPrefetch();
  }
  createCells(element) {
    this.initiatorCell = null;
    element.classList.toggle("network-throttled-row", Boolean(this.throttlingConditions()?.urlPattern));
    element.classList.toggle("network-warning-row", this.isWarning());
    element.classList.toggle("network-error-row", this.isError());
    element.classList.toggle("network-navigation-row", this.isNavigationRequestInternal);
    super.createCells(element);
    this.updateBackgroundColor();
  }
  setTextAndTitle(element, text, title) {
    UI5.UIUtils.createTextChild(element, text);
    UI5.Tooltip.Tooltip.install(element, title || text);
  }
  setTextAndTitleAsLink(element, cellText, titleText, handler) {
    const link3 = document.createElement("span");
    link3.classList.add("devtools-link");
    link3.textContent = cellText;
    link3.addEventListener("click", handler);
    element.appendChild(link3);
    UI5.Tooltip.Tooltip.install(element, titleText);
  }
  renderCell(c, columnId) {
    const cell = c;
    switch (columnId) {
      case "name": {
        this.renderPrimaryCell(cell, columnId);
        break;
      }
      case "path": {
        this.renderPrimaryCell(cell, columnId, this.requestInternal.pathname);
        break;
      }
      case "url": {
        this.renderPrimaryCell(cell, columnId, this.requestInternal.url());
        break;
      }
      case "method": {
        const preflightRequest = this.requestInternal.preflightRequest();
        if (preflightRequest) {
          this.setTextAndTitle(cell, `${this.requestInternal.requestMethod} + `, i18nString5(UIStrings5.sPreflight, { PH1: this.requestInternal.requestMethod }));
          cell.appendChild(Components.Linkifier.Linkifier.linkifyRevealable(preflightRequest, i18nString5(UIStrings5.preflight), void 0, i18nString5(UIStrings5.selectPreflightRequest), void 0, "preflight-request"));
        } else {
          this.setTextAndTitle(cell, this.requestInternal.requestMethod);
        }
        break;
      }
      case "status": {
        this.renderStatusCell(cell);
        break;
      }
      case "protocol": {
        this.renderProtocolCell(cell);
        break;
      }
      case "scheme": {
        this.setTextAndTitle(cell, this.requestInternal.scheme);
        break;
      }
      case "domain": {
        this.setTextAndTitle(cell, this.requestInternal.domain);
        break;
      }
      case "remote-address": {
        this.setTextAndTitle(cell, this.requestInternal.remoteAddress());
        break;
      }
      case "remote-address-space": {
        this.renderAddressSpaceCell(cell, this.requestInternal.remoteAddressSpace());
        break;
      }
      case "is-ad-related": {
        this.setTextAndTitle(cell, this.requestInternal.isAdRelated().toLocaleString());
        break;
      }
      case "cookies": {
        this.setTextAndTitle(cell, this.arrayLength(this.requestInternal.includedRequestCookies()));
        break;
      }
      case "set-cookies": {
        this.setTextAndTitle(cell, this.arrayLength(this.requestInternal.nonBlockedResponseCookies()));
        break;
      }
      case "priority": {
        const priority = this.requestInternal.priority();
        const initialPriority = this.requestInternal.initialPriority();
        if (priority && initialPriority) {
          this.setTextAndTitle(cell, PerfUI.NetworkPriorities.uiLabelForNetworkPriority(priority), i18nString5(UIStrings5.initialPriorityToolTip, {
            PH1: PerfUI.NetworkPriorities.uiLabelForNetworkPriority(priority),
            PH2: PerfUI.NetworkPriorities.uiLabelForNetworkPriority(initialPriority)
          }));
        } else {
          this.setTextAndTitle(cell, priority ? PerfUI.NetworkPriorities.uiLabelForNetworkPriority(priority) : "");
        }
        this.appendSubtitle(cell, initialPriority ? PerfUI.NetworkPriorities.uiLabelForNetworkPriority(initialPriority) : "");
        break;
      }
      case "connection-id": {
        this.setTextAndTitle(cell, this.requestInternal.connectionId === "0" ? "" : this.requestInternal.connectionId);
        break;
      }
      case "type": {
        this.setTextAndTitle(cell, this.displayType());
        break;
      }
      case "initiator": {
        this.renderInitiatorCell(cell);
        break;
      }
      case "initiator-address-space": {
        const clientSecurityState = this.requestInternal.clientSecurityState();
        this.renderAddressSpaceCell(
          cell,
          clientSecurityState ? clientSecurityState.initiatorIPAddressSpace : "Unknown"
          /* Protocol.Network.IPAddressSpace.Unknown */
        );
        break;
      }
      case "size": {
        this.renderSizeCell(cell);
        break;
      }
      case "time": {
        this.renderTimeCell(cell);
        break;
      }
      case "timeline": {
        this.setTextAndTitle(cell, "");
        break;
      }
      case "has-overrides": {
        this.setTextAndTitle(cell, this.requestInternal.overrideTypes.join(", "));
        break;
      }
      default: {
        const columnConfig = this.dataGrid?.columns[columnId];
        if (columnConfig) {
          let headerName = "";
          let headerValue = "";
          if (columnConfig.id.startsWith("request-header-")) {
            headerName = columnId.substring("request-header-".length);
            headerValue = this.requestInternal.requestHeaderValue(headerName) || "";
          } else {
            headerName = columnId.substring("response-header-".length);
            headerValue = this.requestInternal.responseHeaderValue(headerName) || "";
          }
          this.setTextAndTitle(cell, headerValue);
        } else {
          this.setTextAndTitle(cell, "");
        }
        break;
      }
    }
  }
  arrayLength(array) {
    return array ? String(array.length) : "";
  }
  select(suppressSelectedEvent) {
    super.select(suppressSelectedEvent);
    this.parentView().dispatchEventToListeners("RequestSelected", this.requestInternal);
  }
  openInNewTab() {
    Host3.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(this.requestInternal.url());
  }
  isFailed() {
    return PanelUtils3.isFailedNetworkRequest(this.requestInternal);
  }
  renderPrimaryCell(cell, columnId, text) {
    const columnIndex = this.dataGrid?.indexOfVisibleColumn(columnId) | 0;
    const isFirstCell = columnIndex === 0;
    if (isFirstCell) {
      const leftPadding = this.leftPadding ? this.leftPadding + "px" : "";
      cell.style.setProperty("padding-left", leftPadding);
      cell.tabIndex = -1;
      cell.addEventListener("dblclick", this.openInNewTab.bind(this), false);
      cell.addEventListener("mousedown", (event) => {
        this.select();
        const showPanel = event.button ? "Unchanged" : "ShowPanel";
        this.parentView().dispatchEventToListeners("RequestActivated", { showPanel });
      });
      cell.addEventListener("focus", () => this.parentView().resetFocus());
      if (this.requestInternal.isIpProtectionUsed()) {
        const ippIcon = IconButton.Icon.create("shield", "icon");
        ippIcon.title = i18nString5(UIStrings5.responseIsIpProtectedToolTip);
        ippIcon.style.color = "var(--sys-color-on-surface-subtle);";
        cell.appendChild(ippIcon);
      }
      const iconElement = PanelUtils3.getIconForNetworkRequest(this.requestInternal);
      render2(iconElement, cell);
      const aiButtonContainer = this.createAiButtonIfAvailable();
      if (aiButtonContainer) {
        cell.appendChild(aiButtonContainer);
      }
    }
    if (columnId === "name") {
      const name = Platform3.StringUtilities.trimMiddle(this.requestInternal.name(), 100);
      const networkManager = SDK4.NetworkManager.NetworkManager.forRequest(this.requestInternal);
      UI5.UIUtils.createTextChild(cell, networkManager ? networkManager.target().decorateLabel(name) : name);
      this.appendSubtitle(cell, this.requestInternal.path());
      if (!this.requestInternal.url().startsWith("data")) {
        UI5.Tooltip.Tooltip.install(cell, this.requestInternal.url());
      }
    } else if (text) {
      UI5.UIUtils.createTextChild(cell, text);
    }
  }
  renderStatusCell(cell) {
    cell.classList.toggle("network-dim-cell", !this.isFailed() && (this.requestInternal.cached() || !this.requestInternal.statusCode));
    const corsErrorStatus = this.requestInternal.corsErrorStatus();
    if (this.requestInternal.failed && !this.requestInternal.canceled && !this.requestInternal.wasBlocked() && !corsErrorStatus) {
      const failText = i18nString5(UIStrings5.failed);
      if (this.requestInternal.localizedFailDescription) {
        UI5.UIUtils.createTextChild(cell, failText);
        this.appendSubtitle(cell, this.requestInternal.localizedFailDescription, true);
        UI5.Tooltip.Tooltip.install(cell, failText + " " + this.requestInternal.localizedFailDescription);
      } else {
        this.setTextAndTitle(cell, failText);
      }
    } else if (this.requestInternal.statusCode && this.requestInternal.statusCode >= 400) {
      const statusText = this.requestInternal.getInferredStatusText();
      UI5.UIUtils.createTextChild(cell, String(this.requestInternal.statusCode));
      this.appendSubtitle(cell, statusText);
      UI5.Tooltip.Tooltip.install(cell, this.requestInternal.statusCode + " " + statusText);
    } else if (!this.requestInternal.statusCode && this.requestInternal.parsedURL.isDataURL()) {
      this.setTextAndTitle(cell, i18nString5(UIStrings5.data));
    } else if (!this.requestInternal.statusCode && this.requestInternal.canceled) {
      this.setTextAndTitle(cell, i18nString5(UIStrings5.canceled));
    } else if (this.requestInternal.wasBlocked()) {
      let reason = i18nString5(UIStrings5.other);
      let displayShowHeadersLink = false;
      switch (this.requestInternal.blockedReason()) {
        case "other":
          reason = i18nString5(UIStrings5.other);
          break;
        case "csp":
          reason = i18nString5(UIStrings5.csp);
          break;
        case "mixed-content":
          reason = i18n9.i18n.lockedString("mixed-content");
          break;
        case "origin":
          reason = i18nString5(UIStrings5.origin);
          break;
        case "inspector":
          reason = i18nString5(UIStrings5.devtools);
          break;
        case "subresource-filter":
          reason = i18n9.i18n.lockedString("subresource-filter");
          break;
        case "content-type":
          reason = i18n9.i18n.lockedString("content-type");
          break;
        case "coep-frame-resource-needs-coep-header":
          displayShowHeadersLink = true;
          reason = i18nString5(UIStrings5.coepFrameResourceNeedsCoepHeader);
          break;
        case "coop-sandboxed-iframe-cannot-navigate-to-coop-page":
          displayShowHeadersLink = true;
          reason = i18nString5(UIStrings5.coopSandboxedIframeCannotNavigateToCoopPage);
          break;
        case "corp-not-same-origin":
          displayShowHeadersLink = true;
          reason = i18nString5(UIStrings5.corpNotSameOrigin);
          break;
        case "corp-not-same-site":
          displayShowHeadersLink = true;
          reason = i18nString5(UIStrings5.corpNotSameSite);
          break;
        case "corp-not-same-origin-after-defaulted-to-same-origin-by-coep":
          displayShowHeadersLink = true;
          reason = i18nString5(UIStrings5.corpNotSameOriginAfterDefaultedToSameOriginByCoep);
          break;
        case "sri-message-signature-mismatch":
          displayShowHeadersLink = true;
          reason = i18nString5(UIStrings5.integrity);
          break;
      }
      if (displayShowHeadersLink) {
        this.setTextAndTitleAsLink(cell, i18nString5(UIStrings5.blockeds, { PH1: reason }), i18nString5(UIStrings5.blockedTooltip), () => {
          this.parentView().dispatchEventToListeners("RequestActivated", {
            showPanel: "ShowPanel",
            tab: "headers-component"
          });
        });
      } else {
        this.setTextAndTitle(cell, i18nString5(UIStrings5.blockeds, { PH1: reason }));
      }
    } else if (corsErrorStatus) {
      this.setTextAndTitle(cell, i18nString5(UIStrings5.corsError), i18nString5(UIStrings5.crossoriginResourceSharingErrorS, { PH1: corsErrorStatus.corsError }));
    } else if (this.requestInternal.statusCode) {
      UI5.UIUtils.createTextChild(cell, String(this.requestInternal.statusCode));
      const statusText = this.requestInternal.getInferredStatusText();
      this.appendSubtitle(cell, statusText);
      UI5.Tooltip.Tooltip.install(cell, this.requestInternal.statusCode + " " + statusText);
    } else if (this.requestInternal.statusText) {
      this.setTextAndTitle(cell, this.requestInternal.statusText);
    } else if (this.requestInternal.finished) {
      this.setTextAndTitle(cell, i18nString5(UIStrings5.finished));
    } else if (this.requestInternal.preserved) {
      this.setTextAndTitle(cell, i18nString5(UIStrings5.unknown), i18nString5(UIStrings5.unknownExplanation));
    } else {
      this.setTextAndTitle(cell, i18nString5(UIStrings5.pendingq));
    }
  }
  renderProtocolCell(cell) {
    UI5.UIUtils.createTextChild(cell, this.requestInternal.protocol);
    switch (this.requestInternal.alternateProtocolUsage) {
      case "alternativeJobWonWithoutRace": {
        UI5.Tooltip.Tooltip.install(cell, UIStrings5.alternativeJobWonWithoutRace);
        break;
      }
      case "alternativeJobWonRace": {
        UI5.Tooltip.Tooltip.install(cell, UIStrings5.alternativeJobWonRace);
        break;
      }
      case "mainJobWonRace": {
        UI5.Tooltip.Tooltip.install(cell, UIStrings5.mainJobWonRace);
        break;
      }
      case "mappingMissing": {
        UI5.Tooltip.Tooltip.install(cell, UIStrings5.mappingMissing);
        break;
      }
      case "broken": {
        UI5.Tooltip.Tooltip.install(cell, UIStrings5.broken);
        break;
      }
      case "dnsAlpnH3JobWonWithoutRace": {
        UI5.Tooltip.Tooltip.install(cell, UIStrings5.dnsAlpnH3JobWonWithoutRace);
        break;
      }
      case "dnsAlpnH3JobWonRace": {
        UI5.Tooltip.Tooltip.install(cell, UIStrings5.dnsAlpnH3JobWonRace);
        break;
      }
      default: {
        UI5.Tooltip.Tooltip.install(cell, this.requestInternal.protocol);
        break;
      }
    }
  }
  #getLinkifierMetric() {
    if (this.requestInternal.resourceType().isStyleSheet()) {
      return Host3.UserMetrics.Action.StyleSheetInitiatorLinkClicked;
    }
    return void 0;
  }
  renderInitiatorCell(cell) {
    this.initiatorCell = cell;
    const request = this.requestInternal;
    const initiator = Logs2.NetworkLog.NetworkLog.instance().initiatorInfoForRequest(request);
    const timing = request.timing;
    if (timing?.pushStart) {
      cell.appendChild(document.createTextNode(i18nString5(UIStrings5.push)));
    }
    switch (initiator.type) {
      case "parser": {
        cell.appendChild(Components.Linkifier.Linkifier.linkifyURL(initiator.url, {
          lineNumber: initiator.lineNumber,
          columnNumber: initiator.columnNumber,
          userMetric: this.#getLinkifierMetric()
        }));
        this.appendSubtitle(cell, i18nString5(UIStrings5.parser));
        break;
      }
      case "redirect": {
        UI5.Tooltip.Tooltip.install(cell, initiator.url);
        const redirectSource = request.redirectSource();
        console.assert(redirectSource !== null);
        if (this.parentView().nodeForRequest(redirectSource)) {
          cell.appendChild(Components.Linkifier.Linkifier.linkifyRevealable(redirectSource, Bindings.ResourceUtils.displayNameForURL(redirectSource.url()), void 0, void 0, void 0, "redirect-source-request"));
        } else {
          cell.appendChild(Components.Linkifier.Linkifier.linkifyURL(redirectSource.url(), { jslogContext: "redirect-source-request-url" }));
        }
        this.appendSubtitle(cell, i18nString5(UIStrings5.redirect));
        break;
      }
      case "script": {
        const target = SDK4.NetworkManager.NetworkManager.forRequest(request)?.target() || null;
        const linkifier = this.parentView().linkifier();
        if (initiator.stack?.callFrames.length) {
          this.linkifiedInitiatorAnchor = linkifier.linkifyStackTraceTopFrame(target, initiator.stack);
        } else {
          this.linkifiedInitiatorAnchor = linkifier.linkifyScriptLocation(target, initiator.scriptId, initiator.url, initiator.lineNumber, { columnNumber: initiator.columnNumber, inlineFrameIndex: 0 });
        }
        UI5.Tooltip.Tooltip.install(this.linkifiedInitiatorAnchor, "");
        cell.appendChild(this.linkifiedInitiatorAnchor);
        this.appendSubtitle(cell, i18nString5(UIStrings5.script));
        cell.classList.add("network-script-initiated");
        break;
      }
      case "preload": {
        UI5.Tooltip.Tooltip.install(cell, i18nString5(UIStrings5.preload));
        cell.classList.add("network-dim-cell");
        cell.appendChild(document.createTextNode(i18nString5(UIStrings5.preload)));
        break;
      }
      case "signedExchange": {
        cell.appendChild(Components.Linkifier.Linkifier.linkifyURL(initiator.url));
        this.appendSubtitle(cell, i18nString5(UIStrings5.signedexchange));
        break;
      }
      case "preflight": {
        cell.appendChild(document.createTextNode(i18nString5(UIStrings5.preflight)));
        if (initiator.initiatorRequest) {
          const icon = IconButton.Icon.create("arrow-up-down-circle");
          const link3 = Components.Linkifier.Linkifier.linkifyRevealable(initiator.initiatorRequest, icon, void 0, i18nString5(UIStrings5.selectTheRequestThatTriggered), "trailing-link-icon", "initator-request");
          UI5.ARIAUtils.setLabel(link3, i18nString5(UIStrings5.selectTheRequestThatTriggered));
          cell.appendChild(link3);
        }
        break;
      }
      default: {
        UI5.Tooltip.Tooltip.install(cell, i18nString5(UIStrings5.otherC));
        cell.classList.add("network-dim-cell");
        cell.appendChild(document.createTextNode(i18nString5(UIStrings5.otherC)));
      }
    }
  }
  renderAddressSpaceCell(cell, ipAddressSpace) {
    if (ipAddressSpace !== "Unknown") {
      UI5.UIUtils.createTextChild(cell, ipAddressSpace);
    }
  }
  renderSizeCell(cell) {
    const resourceSize = i18n9.ByteUtilities.formatBytesToKb(this.requestInternal.resourceSize);
    if (this.requestInternal.cachedInMemory()) {
      UI5.UIUtils.createTextChild(cell, i18nString5(UIStrings5.memoryCache));
      UI5.Tooltip.Tooltip.install(cell, i18nString5(UIStrings5.servedFromMemoryCacheResource, { PH1: resourceSize }));
      cell.classList.add("network-dim-cell");
    } else if (this.requestInternal.hasMatchingServiceWorkerRouter()) {
      const ruleIdMatched = this.requestInternal.serviceWorkerRouterInfo?.ruleIdMatched;
      const matchedSourceType = this.requestInternal.serviceWorkerRouterInfo?.matchedSourceType;
      UI5.UIUtils.createTextChild(cell, i18n9.i18n.lockedString("(ServiceWorker router)"));
      let tooltipText;
      if (matchedSourceType === "network") {
        const transferSize = i18n9.ByteUtilities.formatBytesToKb(this.requestInternal.transferSize);
        tooltipText = i18nString5(UIStrings5.matchedToServiceWorkerRouterWithNetworkSource, { PH1: ruleIdMatched, PH2: transferSize, PH3: resourceSize });
      } else {
        tooltipText = i18nString5(UIStrings5.matchedToServiceWorkerRouter, { PH1: ruleIdMatched, PH2: resourceSize });
      }
      UI5.Tooltip.Tooltip.install(cell, tooltipText);
      cell.classList.add("network-dim-cell");
    } else if (this.requestInternal.serviceWorkerRouterInfo) {
      const transferSize = i18n9.ByteUtilities.formatBytesToKb(this.requestInternal.transferSize);
      UI5.UIUtils.createTextChild(cell, transferSize);
      UI5.Tooltip.Tooltip.install(cell, i18nString5(UIStrings5.servedFromNetworkMissingServiceWorkerRoute, { PH1: transferSize, PH2: resourceSize }));
    } else if (this.requestInternal.fetchedViaServiceWorker) {
      UI5.UIUtils.createTextChild(cell, i18nString5(UIStrings5.serviceWorker));
      UI5.Tooltip.Tooltip.install(cell, i18nString5(UIStrings5.servedFromServiceWorkerResource, { PH1: resourceSize }));
      cell.classList.add("network-dim-cell");
    } else if (this.requestInternal.redirectSourceSignedExchangeInfoHasNoErrors()) {
      UI5.UIUtils.createTextChild(cell, i18n9.i18n.lockedString("(signed-exchange)"));
      UI5.Tooltip.Tooltip.install(cell, i18nString5(UIStrings5.servedFromSignedHttpExchange, { PH1: resourceSize }));
      cell.classList.add("network-dim-cell");
    } else if (this.requestInternal.fromPrefetchCache()) {
      UI5.UIUtils.createTextChild(cell, i18nString5(UIStrings5.prefetchCache));
      UI5.Tooltip.Tooltip.install(cell, i18nString5(UIStrings5.servedFromPrefetchCacheResource, { PH1: resourceSize }));
      cell.classList.add("network-dim-cell");
    } else if (this.requestInternal.cached()) {
      UI5.UIUtils.createTextChild(cell, i18nString5(UIStrings5.diskCache));
      UI5.Tooltip.Tooltip.install(cell, i18nString5(UIStrings5.servedFromDiskCacheResourceSizeS, { PH1: resourceSize }));
      cell.classList.add("network-dim-cell");
    } else {
      const transferSize = i18n9.ByteUtilities.formatBytesToKb(this.requestInternal.transferSize);
      UI5.UIUtils.createTextChild(cell, transferSize);
      UI5.Tooltip.Tooltip.install(cell, i18nString5(UIStrings5.servedFromNetwork, { PH1: transferSize, PH2: resourceSize }));
    }
    this.appendSubtitle(cell, resourceSize);
  }
  renderTimeCell(cell) {
    const throttlingConditions = this.throttlingConditions();
    if (throttlingConditions?.urlPattern) {
      const throttlingConditionsTitle = typeof throttlingConditions.conditions.title === "string" ? throttlingConditions.conditions.title : throttlingConditions.conditions.title();
      const icon = IconButton.Icon.create("watch");
      icon.title = i18nString5(UIStrings5.wasThrottled, { PH1: throttlingConditionsTitle });
      icon.addEventListener("click", () => void Common4.Revealer.reveal(throttlingConditions));
      cell.append(icon);
    }
    if (this.requestInternal.duration > 0) {
      this.setTextAndTitle(cell, i18n9.TimeUtilities.secondsToString(this.requestInternal.duration));
      this.appendSubtitle(cell, i18n9.TimeUtilities.secondsToString(this.requestInternal.latency), false, i18nString5(UIStrings5.timeSubtitleTooltipText));
    } else if (this.requestInternal.preserved) {
      this.setTextAndTitle(cell, i18nString5(UIStrings5.unknown), i18nString5(UIStrings5.unknownExplanation));
    } else {
      cell.classList.add("network-dim-cell");
      this.setTextAndTitle(cell, i18nString5(UIStrings5.pending));
    }
  }
  appendSubtitle(cellElement, subtitleText, alwaysVisible = false, tooltipText = "") {
    const subtitleElement = document.createElement("div");
    subtitleElement.classList.add("network-cell-subtitle");
    if (alwaysVisible) {
      subtitleElement.classList.add("always-visible");
    }
    subtitleElement.textContent = subtitleText;
    if (tooltipText) {
      UI5.Tooltip.Tooltip.install(subtitleElement, tooltipText);
    }
    cellElement.appendChild(subtitleElement);
  }
  createAiButtonIfAvailable() {
    if (UI5.ActionRegistry.ActionRegistry.instance().hasAction("drjones.network-floating-button")) {
      const action = UI5.ActionRegistry.ActionRegistry.instance().getAction("drjones.network-floating-button");
      const aiButtonContainer = document.createElement("span");
      aiButtonContainer.classList.add("ai-button-container");
      const floatingButton = Buttons2.FloatingButton.create("smart-assistant", action.title(), "ask-ai");
      floatingButton.addEventListener("click", (ev) => {
        ev.stopPropagation();
        this.select();
        void action.execute();
      }, { capture: true });
      floatingButton.addEventListener("mousedown", (ev) => {
        ev.stopPropagation();
      }, { capture: true });
      aiButtonContainer.appendChild(floatingButton);
      return aiButtonContainer;
    }
  }
};
var NetworkGroupNode = class extends NetworkNode {
  createCells(element) {
    super.createCells(element);
    const primaryColumn = this.dataGrid.visibleColumnsArray[0];
    const localizedTitle = `${primaryColumn.title}`;
    const localizedLevel = i18nString5(UIStrings5.level);
    this.nodeAccessibleText = `${localizedLevel} ${localizedTitle}: ${this.cellAccessibleTextMap.get(primaryColumn.id)}`;
  }
  renderCell(c, columnId) {
    const columnIndex = this.dataGrid.indexOfVisibleColumn(columnId);
    if (columnIndex === 0) {
      const cell = c;
      const leftPadding = this.leftPadding ? this.leftPadding + "px" : "";
      cell.style.setProperty("padding-left", leftPadding);
      cell.classList.add("disclosure");
      this.setCellAccessibleName(cell.textContent || "", cell, columnId);
    }
  }
  select(suppressSelectedEvent) {
    super.select(suppressSelectedEvent);
    const firstChildNode = this.traverseNextNode(false, void 0, true);
    const request = firstChildNode?.request();
    if (request) {
      this.parentView().dispatchEventToListeners("RequestSelected", request);
    }
  }
};

// gen/front_end/panels/network/NetworkItemView.js
var NetworkItemView_exports = {};
__export(NetworkItemView_exports, {
  NetworkItemView: () => NetworkItemView
});
import * as Common12 from "./../../core/common/common.js";
import * as i18n31 from "./../../core/i18n/i18n.js";
import * as Platform8 from "./../../core/platform/platform.js";
import * as SDK11 from "./../../core/sdk/sdk.js";
import * as NetworkForward2 from "./forward/forward.js";
import * as IconButton4 from "./../../ui/components/icon_button/icon_button.js";
import * as LegacyWrapper from "./../../ui/components/legacy_wrapper/legacy_wrapper.js";
import * as UI17 from "./../../ui/legacy/legacy.js";
import * as VisualLogging11 from "./../../ui/visual_logging/visual_logging.js";
import * as NetworkComponents from "./components/components.js";

// gen/front_end/panels/network/RequestCookiesView.js
var RequestCookiesView_exports = {};
__export(RequestCookiesView_exports, {
  RequestCookiesView: () => RequestCookiesView
});
import * as Common5 from "./../../core/common/common.js";
import * as i18n11 from "./../../core/i18n/i18n.js";
import * as SDK5 from "./../../core/sdk/sdk.js";
import * as IconButton2 from "./../../ui/components/icon_button/icon_button.js";
import * as uiI18n from "./../../ui/i18n/i18n.js";
import * as CookieTable from "./../../ui/legacy/components/cookie_table/cookie_table.js";
import * as SettingsUI3 from "./../../ui/legacy/components/settings_ui/settings_ui.js";
import * as UI6 from "./../../ui/legacy/legacy.js";
import * as VisualLogging4 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/network/requestCookiesView.css.js
var requestCookiesView_css_default = `/*
 * Copyright 2014 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.request-cookies-view {
  overflow: auto;
  padding: 12px;
  height: 100%;
  background-color: var(--sys-color-cdt-base-container);
}

.request-cookies-view .request-cookies-title {
  font-size: 12px;
  font-weight: bold;
  margin-right: 30px;
  color: var(--sys-color-on-surface);
}

.request-cookies-view .cookie-line {
  margin-top: 6px;
  display: flex;
}

.request-cookies-view .cookies-panel-item {
  margin-top: 6px;
  margin-bottom: 16px;
  flex: none;
}

/*# sourceURL=${import.meta.resolve("./requestCookiesView.css")} */`;

// gen/front_end/panels/network/RequestCookiesView.js
var UIStrings6 = {
  /**
   * @description Text in Request Cookies View of the Network panel
   */
  thisRequestHasNoCookies: "This request has no cookies.",
  /**
   * @description Title for a table which shows all of the cookies associated with a selected network
   * request, in the Network panel. Noun phrase.
   */
  requestCookies: "Request Cookies",
  /**
   * @description Tooltip to explain what request cookies are
   */
  cookiesThatWereSentToTheServerIn: "Cookies that were sent to the server in the 'cookie' header of the request",
  /**
   * @description Label for showing request cookies that were not actually sent
   */
  showFilteredOutRequestCookies: "show filtered out request cookies",
  /**
   * @description Text in Request Headers View of the Network Panel
   */
  noRequestCookiesWereSent: "No request cookies were sent.",
  /**
   * @description Text in Request Cookies View of the Network panel
   */
  responseCookies: "Response Cookies",
  /**
   * @description Tooltip to explain what response cookies are
   */
  cookiesThatWereReceivedFromThe: "Cookies that were received from the server in the '`set-cookie`' header of the response",
  /**
   * @description Label for response cookies with invalid syntax
   */
  malformedResponseCookies: "Malformed Response Cookies",
  /**
   * @description Tooltip to explain what malformed response cookies are. Malformed cookies are
   * cookies that did not match the expected format and could not be interpreted, and are invalid.
   */
  cookiesThatWereReceivedFromTheServer: "Cookies that were received from the server in the '`set-cookie`' header of the response but were malformed",
  /**
   * @description Informational text to explain that there were other cookies
   * that were not used and not shown in the list.
   * @example {Learn more} PH1
   *
   */
  siteHasCookieInOtherPartition: "This site has cookies in another partition, that were not sent with this request. {PH1}",
  /**
   * @description Title of a link to the developer documentation.
   */
  learnMore: "Learn more"
};
var str_6 = i18n11.i18n.registerUIStrings("panels/network/RequestCookiesView.ts", UIStrings6);
var i18nString6 = i18n11.i18n.getLocalizedString.bind(void 0, str_6);
var RequestCookiesView = class extends UI6.Widget.Widget {
  request;
  showFilteredOutCookiesSetting;
  emptyWidget;
  requestCookiesTitle;
  requestCookiesEmpty;
  requestCookiesTable;
  responseCookiesTitle;
  responseCookiesTable;
  siteHasCookieInOtherPartition;
  malformedResponseCookiesTitle;
  malformedResponseCookiesList;
  constructor(request) {
    super({ jslog: `${VisualLogging4.pane("cookies").track({ resize: true })}` });
    this.registerRequiredCSS(requestCookiesView_css_default);
    this.element.classList.add("request-cookies-view");
    this.request = request;
    this.showFilteredOutCookiesSetting = Common5.Settings.Settings.instance().createSetting(
      "show-filtered-out-request-cookies",
      /* defaultValue */
      false
    );
    this.emptyWidget = new UI6.EmptyWidget.EmptyWidget(i18nString6(UIStrings6.thisRequestHasNoCookies), "");
    this.emptyWidget.show(this.element);
    this.requestCookiesTitle = this.element.createChild("div");
    const titleText = this.requestCookiesTitle.createChild("span", "request-cookies-title");
    titleText.textContent = i18nString6(UIStrings6.requestCookies);
    UI6.Tooltip.Tooltip.install(titleText, i18nString6(UIStrings6.cookiesThatWereSentToTheServerIn));
    const requestCookiesCheckbox = SettingsUI3.SettingsUI.createSettingCheckbox(i18nString6(UIStrings6.showFilteredOutRequestCookies), this.showFilteredOutCookiesSetting);
    requestCookiesCheckbox.addEventListener("change", () => {
      this.refreshRequestCookiesView();
    });
    this.requestCookiesTitle.appendChild(requestCookiesCheckbox);
    this.requestCookiesEmpty = this.element.createChild("div", "cookies-panel-item");
    this.requestCookiesEmpty.textContent = i18nString6(UIStrings6.noRequestCookiesWereSent);
    this.requestCookiesTable = new CookieTable.CookiesTable.CookiesTable(
      /* renderInline */
      true
    );
    this.requestCookiesTable.contentElement.classList.add("cookie-table", "cookies-panel-item");
    this.requestCookiesTable.show(this.element);
    this.siteHasCookieInOtherPartition = this.element.createChild("div", "cookies-panel-item site-has-cookies-in-other-partition");
    this.siteHasCookieInOtherPartition.appendChild(uiI18n.getFormatLocalizedString(str_6, UIStrings6.siteHasCookieInOtherPartition, {
      PH1: UI6.XLink.XLink.create("https://developer.chrome.com/en/docs/privacy-sandbox/chips/", i18nString6(UIStrings6.learnMore), void 0, void 0, "learn-more")
    }));
    this.responseCookiesTitle = this.element.createChild("div", "request-cookies-title");
    this.responseCookiesTitle.textContent = i18nString6(UIStrings6.responseCookies);
    this.responseCookiesTitle.title = i18nString6(UIStrings6.cookiesThatWereReceivedFromThe);
    this.responseCookiesTable = new CookieTable.CookiesTable.CookiesTable(
      /* renderInline */
      true
    );
    this.responseCookiesTable.contentElement.classList.add("cookie-table", "cookies-panel-item");
    this.responseCookiesTable.show(this.element);
    this.malformedResponseCookiesTitle = this.element.createChild("div", "request-cookies-title");
    this.malformedResponseCookiesTitle.textContent = i18nString6(UIStrings6.malformedResponseCookies);
    UI6.Tooltip.Tooltip.install(this.malformedResponseCookiesTitle, i18nString6(UIStrings6.cookiesThatWereReceivedFromTheServer));
    this.malformedResponseCookiesList = this.element.createChild("div");
  }
  getRequestCookies() {
    const requestCookieToBlockedReasons = /* @__PURE__ */ new Map();
    const requestCookieToExemptionReason = /* @__PURE__ */ new Map();
    const requestCookies = this.request.includedRequestCookies().map((includedRequestCookie) => includedRequestCookie.cookie);
    if (this.showFilteredOutCookiesSetting.get()) {
      for (const blockedCookie of this.request.blockedRequestCookies()) {
        requestCookieToBlockedReasons.set(blockedCookie.cookie, blockedCookie.blockedReasons.map((blockedReason) => {
          return {
            attribute: SDK5.NetworkRequest.cookieBlockedReasonToAttribute(blockedReason),
            uiString: SDK5.NetworkRequest.cookieBlockedReasonToUiString(blockedReason)
          };
        }));
        requestCookies.push(blockedCookie.cookie);
      }
    }
    for (const includedCookie of this.request.includedRequestCookies()) {
      if (includedCookie.exemptionReason) {
        requestCookieToExemptionReason.set(includedCookie.cookie, {
          uiString: SDK5.NetworkRequest.cookieExemptionReasonToUiString(includedCookie.exemptionReason)
        });
      }
    }
    return { requestCookies, requestCookieToBlockedReasons, requestCookieToExemptionReason };
  }
  getResponseCookies() {
    let responseCookies = [];
    const responseCookieToBlockedReasons = /* @__PURE__ */ new Map();
    const responseCookieToExemptionReason = /* @__PURE__ */ new Map();
    const malformedResponseCookies = [];
    if (this.request.responseCookies.length) {
      responseCookies = this.request.nonBlockedResponseCookies();
      for (const blockedCookie of this.request.blockedResponseCookies()) {
        const parsedCookies = SDK5.CookieParser.CookieParser.parseSetCookie(blockedCookie.cookieLine);
        if (parsedCookies && !parsedCookies.length || blockedCookie.blockedReasons.includes(
          "SyntaxError"
          /* Protocol.Network.SetCookieBlockedReason.SyntaxError */
        ) || blockedCookie.blockedReasons.includes(
          "NameValuePairExceedsMaxSize"
          /* Protocol.Network.SetCookieBlockedReason.NameValuePairExceedsMaxSize */
        )) {
          malformedResponseCookies.push(blockedCookie);
          continue;
        }
        let cookie = blockedCookie.cookie;
        if (!cookie && parsedCookies) {
          cookie = parsedCookies[0];
        }
        if (cookie) {
          responseCookieToBlockedReasons.set(cookie, blockedCookie.blockedReasons.map((blockedReason) => {
            return {
              attribute: SDK5.NetworkRequest.setCookieBlockedReasonToAttribute(blockedReason),
              uiString: SDK5.NetworkRequest.setCookieBlockedReasonToUiString(blockedReason)
            };
          }));
          responseCookies.push(cookie);
        }
      }
      for (const exemptedCookie of this.request.exemptedResponseCookies()) {
        const matchedResponseCookie = responseCookies.find((responseCookie) => exemptedCookie.cookieLine === responseCookie.getCookieLine());
        if (matchedResponseCookie) {
          responseCookieToExemptionReason.set(matchedResponseCookie, {
            uiString: SDK5.NetworkRequest.cookieExemptionReasonToUiString(exemptedCookie.exemptionReason)
          });
        }
      }
    }
    return { responseCookies, responseCookieToBlockedReasons, responseCookieToExemptionReason, malformedResponseCookies };
  }
  refreshRequestCookiesView() {
    if (!this.isShowing()) {
      return;
    }
    const gotCookies = this.request.hasRequestCookies() || this.request.responseCookies.length;
    if (gotCookies) {
      this.emptyWidget.hideWidget();
    } else {
      this.emptyWidget.showWidget();
    }
    const { requestCookies, requestCookieToBlockedReasons, requestCookieToExemptionReason } = this.getRequestCookies();
    const { responseCookies, responseCookieToBlockedReasons, responseCookieToExemptionReason, malformedResponseCookies } = this.getResponseCookies();
    if (requestCookies.length) {
      this.requestCookiesTitle.classList.remove("hidden");
      this.requestCookiesEmpty.classList.add("hidden");
      this.requestCookiesTable.showWidget();
      this.requestCookiesTable.setCookies(requestCookies, requestCookieToBlockedReasons, requestCookieToExemptionReason);
    } else if (this.request.blockedRequestCookies().length) {
      this.requestCookiesTitle.classList.remove("hidden");
      this.requestCookiesEmpty.classList.remove("hidden");
      this.requestCookiesTable.hideWidget();
    } else {
      this.requestCookiesTitle.classList.add("hidden");
      this.requestCookiesEmpty.classList.add("hidden");
      this.requestCookiesTable.hideWidget();
    }
    if (responseCookies.length) {
      this.responseCookiesTitle.classList.remove("hidden");
      this.responseCookiesTable.showWidget();
      this.responseCookiesTable.setCookies(responseCookies, responseCookieToBlockedReasons, responseCookieToExemptionReason);
    } else {
      this.responseCookiesTitle.classList.add("hidden");
      this.responseCookiesTable.hideWidget();
    }
    if (malformedResponseCookies.length) {
      this.malformedResponseCookiesTitle.classList.remove("hidden");
      this.malformedResponseCookiesList.classList.remove("hidden");
      this.malformedResponseCookiesList.removeChildren();
      for (const malformedCookie of malformedResponseCookies) {
        const listItem = this.malformedResponseCookiesList.createChild("span", "cookie-line source-code");
        const icon = new IconButton2.Icon.Icon();
        icon.name = "cross-circle-filled";
        icon.classList.add("cookie-warning-icon", "small");
        listItem.appendChild(icon);
        UI6.UIUtils.createTextChild(listItem, malformedCookie.cookieLine);
        if (malformedCookie.blockedReasons.includes(
          "NameValuePairExceedsMaxSize"
          /* Protocol.Network.SetCookieBlockedReason.NameValuePairExceedsMaxSize */
        )) {
          listItem.title = SDK5.NetworkRequest.setCookieBlockedReasonToUiString(
            "NameValuePairExceedsMaxSize"
            /* Protocol.Network.SetCookieBlockedReason.NameValuePairExceedsMaxSize */
          );
        } else {
          listItem.title = SDK5.NetworkRequest.setCookieBlockedReasonToUiString(
            "SyntaxError"
            /* Protocol.Network.SetCookieBlockedReason.SyntaxError */
          );
        }
      }
    } else {
      this.malformedResponseCookiesTitle.classList.add("hidden");
      this.malformedResponseCookiesList.classList.add("hidden");
    }
    if (this.request.siteHasCookieInOtherPartition()) {
      this.siteHasCookieInOtherPartition.classList.remove("hidden");
    } else {
      this.siteHasCookieInOtherPartition.classList.add("hidden");
    }
  }
  wasShown() {
    super.wasShown();
    this.request.addEventListener(SDK5.NetworkRequest.Events.REQUEST_HEADERS_CHANGED, this.refreshRequestCookiesView, this);
    this.request.addEventListener(SDK5.NetworkRequest.Events.RESPONSE_HEADERS_CHANGED, this.refreshRequestCookiesView, this);
    this.refreshRequestCookiesView();
  }
  willHide() {
    super.willHide();
    this.request.removeEventListener(SDK5.NetworkRequest.Events.REQUEST_HEADERS_CHANGED, this.refreshRequestCookiesView, this);
    this.request.removeEventListener(SDK5.NetworkRequest.Events.RESPONSE_HEADERS_CHANGED, this.refreshRequestCookiesView, this);
  }
};

// gen/front_end/panels/network/RequestInitiatorView.js
var RequestInitiatorView_exports = {};
__export(RequestInitiatorView_exports, {
  RequestInitiatorView: () => RequestInitiatorView
});
import * as i18n13 from "./../../core/i18n/i18n.js";
import * as SDK6 from "./../../core/sdk/sdk.js";
import * as Logs3 from "./../../models/logs/logs.js";
import * as Components2 from "./../../ui/legacy/components/utils/utils.js";
import * as UI7 from "./../../ui/legacy/legacy.js";
import * as VisualLogging5 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/network/requestInitiatorView.css.js
var requestInitiatorView_css_default = `/*
 * Copyright 2019 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.request-initiator-view {
  display: flex;
  margin: 6px;
}

/*# sourceURL=${import.meta.resolve("./requestInitiatorView.css")} */`;

// gen/front_end/panels/network/requestInitiatorViewTree.css.js
var requestInitiatorViewTree_css_default = `/*
 * Copyright 2019 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.request-initiator-view-tree {
  user-select: text;

  & .fill {
    right: -6px; /* Same as the margin in .request-initiator-view but negative. */
  }
}

.request-initiator-view-section-title {
  font-weight: bold;
  padding: 4px;
}

.request-initiator-view-section-title:focus-visible {
  background-color: var(--sys-color-state-focus-highlight);
}

@media (forced-colors: active) {
  .request-initiator-view-section-title:focus-visible {
    forced-color-adjust: none;
    background-color: Highlight;
    color: HighlightText;
  }
}

/*# sourceURL=${import.meta.resolve("./requestInitiatorViewTree.css")} */`;

// gen/front_end/panels/network/RequestInitiatorView.js
var UIStrings7 = {
  /**
   * @description Text in Request Initiator View of the Network panel if the request has no initiator data
   */
  noInitiator: "No initiator data",
  /**
   * @description Title of a section in Request Initiator view of the Network Panel
   */
  requestCallStack: "Request call stack",
  /**
   * @description Title of a section in Request Initiator view of the Network Panel
   */
  requestInitiatorChain: "Request initiator chain"
};
var str_7 = i18n13.i18n.registerUIStrings("panels/network/RequestInitiatorView.ts", UIStrings7);
var i18nString7 = i18n13.i18n.getLocalizedString.bind(void 0, str_7);
var RequestInitiatorView = class _RequestInitiatorView extends UI7.Widget.VBox {
  linkifier;
  request;
  emptyWidget;
  hasShown;
  constructor(request) {
    super({ jslog: `${VisualLogging5.pane("initiator").track({ resize: true })}` });
    this.element.classList.add("request-initiator-view");
    this.linkifier = new Components2.Linkifier.Linkifier();
    this.request = request;
    this.emptyWidget = new UI7.EmptyWidget.EmptyWidget(i18nString7(UIStrings7.noInitiator), "");
    this.emptyWidget.show(this.element);
    this.hasShown = false;
  }
  static createStackTracePreview(request, linkifier, focusableLink) {
    const initiator = request.initiator();
    if (!initiator?.stack) {
      return null;
    }
    const networkManager = SDK6.NetworkManager.NetworkManager.forRequest(request);
    const target = networkManager ? networkManager.target() : void 0;
    return new Components2.JSPresentationUtils.StackTracePreviewContent(void 0, target, linkifier, { runtimeStackTrace: initiator.stack, tabStops: focusableLink });
  }
  createTree() {
    const treeOutline = new UI7.TreeOutline.TreeOutlineInShadow();
    treeOutline.registerRequiredCSS(requestInitiatorViewTree_css_default);
    treeOutline.contentElement.classList.add("request-initiator-view-tree");
    treeOutline.contentElement.setAttribute("jslog", `${VisualLogging5.tree("initiator-tree")}`);
    return treeOutline;
  }
  buildRequestChainTree(initiatorGraph, title, tree2) {
    const root = new UI7.TreeOutline.TreeElement(title);
    tree2.appendChild(root);
    if (root.titleElement instanceof HTMLElement) {
      root.titleElement.classList.add("request-initiator-view-section-title");
    }
    const initiators = initiatorGraph.initiators;
    let parent = root;
    for (const request of Array.from(initiators).reverse()) {
      const treeElement = new UI7.TreeOutline.TreeElement(request.url());
      parent.appendChild(treeElement);
      parent.expand();
      parent = treeElement;
    }
    root.expand();
    parent.select();
    const titleElement = parent.titleElement;
    if (titleElement instanceof HTMLElement) {
      titleElement.style.fontWeight = "bold";
    }
    const initiated = initiatorGraph.initiated;
    this.depthFirstSearchTreeBuilder(initiated, parent, this.request);
    return root;
  }
  depthFirstSearchTreeBuilder(initiated, parentElement, parentRequest) {
    const visited = /* @__PURE__ */ new Set();
    visited.add(this.request);
    for (const request of initiated.keys()) {
      if (initiated.get(request) === parentRequest) {
        const treeElement = new UI7.TreeOutline.TreeElement(request.url());
        parentElement.appendChild(treeElement);
        parentElement.expand();
        if (!visited.has(request)) {
          visited.add(request);
          this.depthFirstSearchTreeBuilder(initiated, treeElement, request);
        }
      }
    }
  }
  buildStackTraceSection(stackTracePreview, title, tree2) {
    const root = new UI7.TreeOutline.TreeElement(title);
    tree2.appendChild(root);
    if (root.titleElement instanceof HTMLElement) {
      root.titleElement.classList.add("request-initiator-view-section-title");
    }
    const contentElement = new UI7.TreeOutline.TreeElement(void 0, false);
    contentElement.selectable = false;
    stackTracePreview.markAsRoot();
    stackTracePreview.show(contentElement.listItemElement);
    root.appendChild(contentElement);
    root.expand();
  }
  wasShown() {
    super.wasShown();
    if (this.hasShown) {
      return;
    }
    this.registerRequiredCSS(requestInitiatorView_css_default);
    let initiatorDataPresent = false;
    const containerTree = this.createTree();
    const stackTracePreview = _RequestInitiatorView.createStackTracePreview(this.request, this.linkifier, true);
    if (stackTracePreview) {
      initiatorDataPresent = true;
      this.buildStackTraceSection(stackTracePreview, i18nString7(UIStrings7.requestCallStack), containerTree);
    }
    const initiatorGraph = Logs3.NetworkLog.NetworkLog.instance().initiatorGraphForRequest(this.request);
    if (initiatorGraph.initiators.size > 1 || initiatorGraph.initiated.size > 1) {
      initiatorDataPresent = true;
      this.buildRequestChainTree(initiatorGraph, i18nString7(UIStrings7.requestInitiatorChain), containerTree);
    }
    const firstChild = containerTree.firstChild();
    if (firstChild) {
      firstChild.select(true);
    }
    if (initiatorDataPresent) {
      this.element.appendChild(containerTree.element);
      this.emptyWidget.hideWidget();
    }
    this.hasShown = true;
  }
};

// gen/front_end/panels/network/RequestPayloadView.js
var RequestPayloadView_exports = {};
__export(RequestPayloadView_exports, {
  Category: () => Category,
  RequestPayloadView: () => RequestPayloadView
});
import * as Common6 from "./../../core/common/common.js";
import * as Host4 from "./../../core/host/host.js";
import * as i18n15 from "./../../core/i18n/i18n.js";
import * as SDK7 from "./../../core/sdk/sdk.js";
import * as Buttons3 from "./../../ui/components/buttons/buttons.js";
import * as ObjectUI from "./../../ui/legacy/components/object_ui/object_ui.js";

// gen/front_end/ui/legacy/components/object_ui/objectPropertiesSection.css.js
var objectPropertiesSection_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.object-properties-section-dimmed {
  opacity: 60%;
}

.object-properties-section {
  padding: 0;
  color: var(--sys-color-on-surface);
  display: flex;
  flex-direction: column;
  overflow-x: auto;
}

.object-properties-section li {
  user-select: text;

  &::before {
    flex-shrink: 0;
    margin-right: 2px;
    align-self: flex-start;
  }
}

.object-properties-section li.editing-sub-part {
  padding: 3px 12px 8px 6px;
  margin: -1px -6px -8px;
  text-overflow: clip;
}

.object-properties-section li.editing {
  margin-left: 10px;
  text-overflow: clip;
}

.tree-outline ol.title-less-mode {
  padding-left: 0;
}

.object-properties-section .own-property {
  font-weight: bold;
}

.object-properties-section .synthetic-property {
  color: var(--sys-color-token-subtle);
}

.object-properties-section .private-property-hash {
  color: var(--sys-color-on-surface);
}

.object-properties-section-root-element {
  display: flex;
  flex-direction: row;
}

.object-properties-section .editable-div {
  overflow: hidden;
}

.name-and-value {
  line-height: 16px;
  display: flex;
  white-space: nowrap;
}

.name-and-value .separator {
  white-space: pre;
  flex-shrink: 0;
}

.editing-sub-part .name-and-value {
  overflow: visible;
  display: inline-flex;
}

.property-prompt {
  margin-left: 4px;
}

.tree-outline.hide-selection-when-blurred .selected:focus-visible {
  background: none;
}

.tree-outline.hide-selection-when-blurred .selected:focus-visible ::slotted(*),
.tree-outline.hide-selection-when-blurred .selected:focus-visible .tree-element-title,
.tree-outline.hide-selection-when-blurred .selected:focus-visible .name-and-value,
.tree-outline.hide-selection-when-blurred .selected:focus-visible .gray-info-message {
  background: var(--sys-color-state-focus-highlight);
  border-radius: 2px;
}

@media (forced-colors: active) {
  .object-properties-section-dimmed {
    opacity: 100%;
  }

  .tree-outline.hide-selection-when-blurred .selected:focus-visible {
    background: Highlight;
  }

  .tree-outline li:hover .tree-element-title,
  .tree-outline li.selected .tree-element-title {
    color: ButtonText;
  }

  .tree-outline.hide-selection-when-blurred .selected:focus-visible .tree-element-title,
  .tree-outline.hide-selection-when-blurred .selected:focus-visible .name-and-value {
    background: transparent;
    box-shadow: none;
  }

  .tree-outline.hide-selection-when-blurred .selected:focus-visible span,
  .tree-outline.hide-selection-when-blurred .selected:focus-visible .gray-info-message {
    color: HighlightText;
  }

  .tree-outline-disclosure:hover li.parent::before {
    background-color: ButtonText;
  }
}

/*# sourceURL=${import.meta.resolve("./objectPropertiesSection.css")} */`;

// gen/front_end/ui/legacy/components/object_ui/objectValue.css.js
var objectValue_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.value.object-value-node:hover {
  background-color: var(--sys-color-state-hover-on-subtle);
}

.object-value-function-prefix,
.object-value-boolean {
  color: var(--sys-color-token-attribute-value);
}

.object-value-function {
  font-style: italic;
}

.object-value-function.linkified:hover {
  --override-linkified-hover-background: rgb(0 0 0 / 10%);

  background-color: var(--override-linkified-hover-background);
  cursor: pointer;
}

.theme-with-dark-background .object-value-function.linkified:hover,
:host-context(.theme-with-dark-background) .object-value-function.linkified:hover {
  --override-linkified-hover-background: rgb(230 230 230 / 10%);
}

.object-value-number {
  color: var(--sys-color-token-attribute-value);
}

.object-value-bigint {
  color: var(--sys-color-token-comment);
}

.object-value-string,
.object-value-regexp,
.object-value-symbol {
  white-space: pre;
  unicode-bidi: -webkit-isolate;
  color: var(--sys-color-token-property-special);
}

.object-value-node {
  position: relative;
  vertical-align: baseline;
  color: var(--sys-color-token-variable);
  white-space: nowrap;
}

.object-value-null,
.object-value-undefined {
  color: var(--sys-color-state-disabled);
}

.object-value-unavailable {
  color: var(--sys-color-token-tag);
}

.object-value-calculate-value-button:hover {
  text-decoration: underline;
}

.object-properties-section-custom-section {
  display: inline-flex;
  flex-direction: column;
}

.theme-with-dark-background .object-value-number,
:host-context(.theme-with-dark-background) .object-value-number,
.theme-with-dark-background .object-value-boolean,
:host-context(.theme-with-dark-background) .object-value-boolean {
  --override-primitive-dark-mode-color: hsl(252deg 100% 75%);

  color: var(--override-primitive-dark-mode-color);
}

.object-properties-section .object-description {
  color: var(--sys-color-token-subtle);
}

.value .object-properties-preview {
  white-space: nowrap;
}

.name {
  color: var(--sys-color-token-tag);
  flex-shrink: 0;
}

.object-properties-preview .name {
  color: var(--sys-color-token-subtle);
}

@media (forced-colors: active) {
  .object-value-calculate-value-button:hover {
    forced-color-adjust: none;
    color: Highlight;
  }
}

/*# sourceURL=${import.meta.resolve("./objectValue.css")} */`;

// gen/front_end/panels/network/RequestPayloadView.js
import * as UI8 from "./../../ui/legacy/legacy.js";
import * as VisualLogging6 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/network/requestPayloadTree.css.js
var requestPayloadTree_css_default = `/*
 * Copyright 2016 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.tree-outline {
  padding-left: 0;
}

.tree-outline > ol {
  padding-bottom: 5px;
  border-bottom: solid 1px var(--sys-color-divider);
}

.tree-outline > .parent {
  user-select: none;
  font-weight: bold;
  color: var(--sys-color-on-surface);
  margin-top: -1px;
  display: flex;
  align-items: center;
  height: var(--sys-size-13);
}

.tree-outline li {
  padding-left: 5px;
  line-height: 20px;
}

.tree-outline li:not(.parent) {
  margin-left: 10px;
  display: block;

  &:has(.payload-name) {
    margin: var(--sys-size-3) 0;
    display: grid;
    grid-template-columns: min-content 1fr;
    gap: var(--sys-size-6);
  }
}

.tree-outline li:not(.parent)::before {
  display: none;
}

.tree-outline li.expanded .payload-count {
  display: none;
}

.tree-outline li .payload-toggle {
  display: none;
}

.tree-outline li.expanded .payload-toggle {
  display: inline;
  margin-left: 30px;
  font-weight: normal;
}

.tree-outline li.expanded .payload-toggle:focus-visible {
  border: 2px solid var(--sys-color-state-focus-ring);
  border-radius: 5px;
}

.tree-outline li .header-toggle:hover {
  color: var(--sys-color-token-subtle);
}

.tree-outline .payload-name {
  color: var(--sys-color-on-surface-subtle);
  font: var(--sys-typescale-body5-medium);
  white-space: pre-wrap;
  align-self: start;
  min-width: 150px;
  line-height: 18px;
}

.tree-outline .payload-value {
  display: inline;
  white-space: pre-wrap;
  word-break: break-all;
  font: var(--sys-typescale-body4-regular);
  line-height: 18px;
}

.tree-outline .empty-request-payload {
  color: var(--sys-color-state-disabled);
}

.request-payload-show-more-button {
  margin: 0 4px;
}

@media (forced-colors: active) {
  :host-context(.request-payload-tree) ol.tree-outline:not(.hide-selection-when-blurred) li.selected:focus {
    background: Highlight;
  }

  :host-context(.request-payload-tree) ol.tree-outline:not(.hide-selection-when-blurred) li::before {
    background-color: ButtonText;
  }

  :host-context(.request-payload-tree) ol.tree-outline:not(.hide-selection-when-blurred) li.selected.parent::before {
    background-color: HighlightText;
  }

  :host-context(.request-payload-tree) ol.tree-outline:not(.hide-selection-when-blurred) li.selected *,
  :host-context(.request-payload-tree) ol.tree-outline:not(.hide-selection-when-blurred) li.selected.parent,
  :host-context(.request-payload-tree) ol.tree-outline:not(.hide-selection-when-blurred) li.selected.parent span {
    color: HighlightText;
  }
}

.payload-decode-error {
  color: var(--sys-color-error);
}

/*# sourceURL=${import.meta.resolve("./requestPayloadTree.css")} */`;

// gen/front_end/panels/network/requestPayloadView.css.js
var requestPayloadView_css_default = `/*
 * Copyright 2014 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.request-payload-view {
  user-select: text;
  overflow: auto;
}

.request-payload-tree {
  flex-grow: 1;
  overflow-y: auto;
  margin: 0;
}

/*# sourceURL=${import.meta.resolve("./requestPayloadView.css")} */`;

// gen/front_end/panels/network/RequestPayloadView.js
var UIStrings8 = {
  /**
   * @description A context menu item Payload View of the Network panel to copy a parsed value.
   */
  copyValue: "Copy value",
  /**
   * @description A context menu item Payload View of the Network panel to copy the payload.
   */
  copyPayload: "Copy",
  /**
   * @description Text in Request Payload View of the Network panel. This is a noun-phrase meaning the
   * payload of a network request.
   */
  requestPayload: "Request Payload",
  /**
   * @description Text in Request Payload View of the Network panel
   */
  unableToDecodeValue: "(unable to decode value)",
  /**
   * @description Text in Request Payload View of the Network panel
   */
  queryStringParameters: "Query String Parameters",
  /**
   * @description Text in Request Payload View of the Network panel
   */
  formData: "Form Data",
  /**
   * @description Text to show more content
   */
  showMore: "Show more",
  /**
   * @description Text for toggling the view of payload data (e.g. query string parameters) from source to parsed in the payload tab
   */
  viewParsed: "View parsed",
  /**
   * @description Text to show an item is empty
   */
  empty: "(empty)",
  /**
   * @description Text for toggling the view of payload data (e.g. query string parameters) from parsed to source in the payload tab
   */
  viewSource: "View source",
  /**
   * @description Text for toggling payload data (e.g. query string parameters) from decoded to
   * encoded in the payload tab or in the cookies preview. URL-encoded is a different data format for
   * the same data, which the user sees when they click this command.
   */
  viewUrlEncoded: "View URL-encoded",
  /**
   * @description Text for toggling payload data (e.g. query string parameters) from encoded to decoded in the payload tab or in the cookies preview
   */
  viewDecoded: "View decoded"
};
var str_8 = i18n15.i18n.registerUIStrings("panels/network/RequestPayloadView.ts", UIStrings8);
var i18nString8 = i18n15.i18n.getLocalizedString.bind(void 0, str_8);
var RequestPayloadView = class _RequestPayloadView extends UI8.Widget.VBox {
  request;
  decodeRequestParameters;
  queryStringCategory;
  formDataCategory;
  requestPayloadCategory;
  constructor(request) {
    super({ jslog: `${VisualLogging6.pane("payload").track({ resize: true })}` });
    this.registerRequiredCSS(requestPayloadView_css_default);
    this.element.classList.add("request-payload-view");
    this.request = request;
    this.decodeRequestParameters = true;
    const contentType = request.requestContentType();
    if (contentType) {
      this.decodeRequestParameters = Boolean(contentType.match(/^application\/x-www-form-urlencoded\s*(;.*)?$/i));
    }
    const root = new UI8.TreeOutline.TreeOutlineInShadow();
    root.registerRequiredCSS(objectValue_css_default, objectPropertiesSection_css_default, requestPayloadTree_css_default);
    root.element.classList.add("request-payload-tree");
    root.setDense(true);
    this.element.appendChild(root.element);
    this.queryStringCategory = new Category(root, "query-string");
    this.formDataCategory = new Category(root, "form-data");
    this.requestPayloadCategory = new Category(root, "request-payload", i18nString8(UIStrings8.requestPayload));
  }
  wasShown() {
    super.wasShown();
    this.request.addEventListener(SDK7.NetworkRequest.Events.REQUEST_HEADERS_CHANGED, this.refreshFormData, this);
    this.refreshQueryString();
    void this.refreshFormData();
  }
  willHide() {
    super.willHide();
    this.request.removeEventListener(SDK7.NetworkRequest.Events.REQUEST_HEADERS_CHANGED, this.refreshFormData, this);
  }
  addEntryContextMenuHandler(treeElement, menuItem, jslogContext, getValue) {
    treeElement.listItemElement.addEventListener("contextmenu", (event) => {
      event.consume(true);
      const contextMenu = new UI8.ContextMenu.ContextMenu(event);
      const copyValueHandler = () => {
        Host4.userMetrics.actionTaken(Host4.UserMetrics.Action.NetworkPanelCopyValue);
        Host4.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(getValue());
      };
      contextMenu.clipboardSection().appendItem(menuItem, copyValueHandler, { jslogContext });
      void contextMenu.show();
    });
  }
  static formatParameter(value, className, decodeParameters) {
    let errorDecoding = false;
    if (decodeParameters) {
      value = value.replace(/\+/g, " ");
      if (value.indexOf("%") >= 0) {
        try {
          value = decodeURIComponent(value);
        } catch {
          errorDecoding = true;
        }
      }
    }
    const div = document.createElement("div");
    if (className) {
      div.className = className;
    }
    if (value === "") {
      div.classList.add("empty-value");
    }
    if (errorDecoding) {
      div.createChild("span", "payload-decode-error").textContent = i18nString8(UIStrings8.unableToDecodeValue);
    } else {
      div.textContent = value;
    }
    return div;
  }
  refreshQueryString() {
    const queryString = this.request.queryString();
    const queryParameters = this.request.queryParameters;
    this.queryStringCategory.hidden = !queryParameters;
    if (queryParameters) {
      this.refreshParams(i18nString8(UIStrings8.queryStringParameters), queryParameters, queryString, this.queryStringCategory);
    }
  }
  async refreshFormData() {
    const formData = await this.request.requestFormData();
    if (!formData) {
      this.formDataCategory.hidden = true;
      this.requestPayloadCategory.hidden = true;
      return;
    }
    const formParameters = await this.request.formParameters();
    if (formParameters) {
      this.formDataCategory.hidden = false;
      this.requestPayloadCategory.hidden = true;
      this.refreshParams(i18nString8(UIStrings8.formData), formParameters, formData, this.formDataCategory);
    } else {
      this.requestPayloadCategory.hidden = false;
      this.formDataCategory.hidden = true;
      try {
        const json = JSON.parse(formData);
        this.refreshRequestJSONPayload(json, formData);
      } catch {
        this.populateTreeElementWithSourceText(this.requestPayloadCategory, formData);
      }
    }
  }
  populateTreeElementWithSourceText(treeElement, sourceText) {
    const MAX_LENGTH = 3e3;
    const text = (sourceText || "").trim();
    const trim = text.length > MAX_LENGTH;
    const sourceTextElement = document.createElement("span");
    sourceTextElement.classList.add("payload-value");
    sourceTextElement.classList.add("source-code");
    sourceTextElement.textContent = trim ? text.substr(0, MAX_LENGTH) : text;
    const sourceTreeElement = new UI8.TreeOutline.TreeElement(sourceTextElement);
    treeElement.removeChildren();
    treeElement.appendChild(sourceTreeElement);
    this.addEntryContextMenuHandler(sourceTreeElement, i18nString8(UIStrings8.copyPayload), "copy-payload", () => text);
    if (!trim) {
      return;
    }
    const showMoreButton = new Buttons3.Button.Button();
    showMoreButton.data = { variant: "outlined", jslogContext: "show-more" };
    showMoreButton.innerText = i18nString8(UIStrings8.showMore);
    showMoreButton.classList.add("request-payload-show-more-button");
    function showMore() {
      showMoreButton.remove();
      sourceTextElement.textContent = text;
      sourceTreeElement.listItemElement.removeEventListener("contextmenu", onContextMenuShowMore);
    }
    showMoreButton.addEventListener("click", showMore);
    function onContextMenuShowMore(event) {
      const contextMenu = new UI8.ContextMenu.ContextMenu(event);
      const section4 = contextMenu.newSection();
      section4.appendItem(i18nString8(UIStrings8.showMore), showMore, { jslogContext: "show-more" });
      void contextMenu.show();
    }
    sourceTreeElement.listItemElement.addEventListener("contextmenu", onContextMenuShowMore);
    sourceTextElement.appendChild(showMoreButton);
  }
  refreshParams(title, params, sourceText, paramsTreeElement) {
    paramsTreeElement.removeChildren();
    paramsTreeElement.listItemElement.removeChildren();
    paramsTreeElement.listItemElement.createChild("div", "selection fill");
    UI8.UIUtils.createTextChild(paramsTreeElement.listItemElement, title);
    const payloadCount = document.createElement("span");
    payloadCount.classList.add("payload-count");
    const numberOfParams = params ? params.length : 0;
    payloadCount.textContent = `\xA0(${numberOfParams})`;
    paramsTreeElement.listItemElement.appendChild(payloadCount);
    const shouldViewSource = viewSourceForItems.has(paramsTreeElement);
    if (shouldViewSource) {
      this.appendParamsSource(title, params, sourceText, paramsTreeElement);
    } else {
      this.appendParamsParsed(title, params, sourceText, paramsTreeElement);
    }
  }
  appendParamsSource(title, params, sourceText, paramsTreeElement) {
    this.populateTreeElementWithSourceText(paramsTreeElement, sourceText);
    const listItemElement = paramsTreeElement.listItemElement;
    const viewParsed = function(event) {
      listItemElement.removeEventListener("contextmenu", viewParsedContextMenu);
      viewSourceForItems.delete(paramsTreeElement);
      this.refreshParams(title, params, sourceText, paramsTreeElement);
      event.consume();
    };
    const viewParsedContextMenu = (event) => {
      if (!paramsTreeElement.expanded) {
        return;
      }
      const contextMenu = new UI8.ContextMenu.ContextMenu(event);
      contextMenu.newSection().appendItem(i18nString8(UIStrings8.viewParsed), viewParsed.bind(this, event), { jslogContext: "view-parsed" });
      void contextMenu.show();
    };
    const viewParsedButton = this.createViewSourceToggle(
      /* viewSource */
      true,
      viewParsed.bind(this)
    );
    listItemElement.appendChild(viewParsedButton);
    listItemElement.addEventListener("contextmenu", viewParsedContextMenu);
  }
  appendParamsParsed(title, params, sourceText, paramsTreeElement) {
    for (const param of params || []) {
      const paramNameValue = document.createDocumentFragment();
      if (param.name !== "") {
        const name = _RequestPayloadView.formatParameter(param.name, "payload-name", this.decodeRequestParameters);
        const value = _RequestPayloadView.formatParameter(param.value, "payload-value source-code", this.decodeRequestParameters);
        paramNameValue.appendChild(name);
        paramNameValue.appendChild(value);
      } else {
        paramNameValue.appendChild(_RequestPayloadView.formatParameter(i18nString8(UIStrings8.empty), "empty-request-payload", this.decodeRequestParameters));
      }
      const paramTreeElement = new UI8.TreeOutline.TreeElement(paramNameValue);
      this.addEntryContextMenuHandler(paramTreeElement, i18nString8(UIStrings8.copyValue), "copy-value", () => decodeURIComponent(param.value));
      paramsTreeElement.appendChild(paramTreeElement);
    }
    const listItemElement = paramsTreeElement.listItemElement;
    const viewSource = function(event) {
      listItemElement.removeEventListener("contextmenu", viewSourceContextMenu);
      viewSourceForItems.add(paramsTreeElement);
      this.refreshParams(title, params, sourceText, paramsTreeElement);
      event.consume();
    };
    const toggleURLDecoding = function(event) {
      listItemElement.removeEventListener("contextmenu", viewSourceContextMenu);
      this.toggleURLDecoding(event);
    };
    const viewSourceContextMenu = (event) => {
      if (!paramsTreeElement.expanded) {
        return;
      }
      const contextMenu = new UI8.ContextMenu.ContextMenu(event);
      const section4 = contextMenu.newSection();
      section4.appendItem(i18nString8(UIStrings8.viewSource), viewSource.bind(this, event), { jslogContext: "view-source" });
      const viewURLEncodedText = this.decodeRequestParameters ? i18nString8(UIStrings8.viewUrlEncoded) : i18nString8(UIStrings8.viewDecoded);
      section4.appendItem(viewURLEncodedText, toggleURLDecoding.bind(this, event), { jslogContext: "toggle-url-decoding" });
      void contextMenu.show();
    };
    const viewSourceButton = this.createViewSourceToggle(
      /* viewSource */
      false,
      viewSource.bind(this)
    );
    listItemElement.appendChild(viewSourceButton);
    const toggleTitle = this.decodeRequestParameters ? i18nString8(UIStrings8.viewUrlEncoded) : i18nString8(UIStrings8.viewDecoded);
    const toggleButton = UI8.UIUtils.createTextButton(toggleTitle, toggleURLDecoding.bind(this), { jslogContext: "decode-encode", className: "payload-toggle" });
    listItemElement.appendChild(toggleButton);
    listItemElement.addEventListener("contextmenu", viewSourceContextMenu);
  }
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  refreshRequestJSONPayload(parsedObject, sourceText) {
    const rootListItem = this.requestPayloadCategory;
    rootListItem.removeChildren();
    const rootListItemElement = rootListItem.listItemElement;
    rootListItemElement.removeChildren();
    rootListItemElement.createChild("div", "selection fill");
    UI8.UIUtils.createTextChild(rootListItemElement, this.requestPayloadCategory.title.toString());
    if (viewSourceForItems.has(rootListItem)) {
      this.appendJSONPayloadSource(rootListItem, parsedObject, sourceText);
    } else {
      this.appendJSONPayloadParsed(rootListItem, parsedObject, sourceText);
    }
  }
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  appendJSONPayloadSource(rootListItem, parsedObject, sourceText) {
    const rootListItemElement = rootListItem.listItemElement;
    this.populateTreeElementWithSourceText(rootListItem, sourceText);
    const viewParsed = function(event) {
      rootListItemElement.removeEventListener("contextmenu", viewParsedContextMenu);
      viewSourceForItems.delete(rootListItem);
      this.refreshRequestJSONPayload(parsedObject, sourceText);
      event.consume();
    };
    const viewParsedButton = this.createViewSourceToggle(
      /* viewSource */
      true,
      viewParsed.bind(this)
    );
    rootListItemElement.appendChild(viewParsedButton);
    const viewParsedContextMenu = (event) => {
      if (!rootListItem.expanded) {
        return;
      }
      const contextMenu = new UI8.ContextMenu.ContextMenu(event);
      contextMenu.newSection().appendItem(i18nString8(UIStrings8.viewParsed), viewParsed.bind(this, event), { jslogContext: "view-parsed" });
      void contextMenu.show();
    };
    rootListItemElement.addEventListener("contextmenu", viewParsedContextMenu);
  }
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  appendJSONPayloadParsed(rootListItem, parsedObject, sourceText) {
    const object = SDK7.RemoteObject.RemoteObject.fromLocalObject(parsedObject);
    const section4 = new ObjectUI.ObjectPropertiesSection.RootElement(new ObjectUI.ObjectPropertiesSection.ObjectTree(object));
    section4.title = object.description;
    section4.expand();
    section4.editable = false;
    rootListItem.childrenListElement.classList.add("source-code", "object-properties-section");
    rootListItem.appendChild(section4);
    const rootListItemElement = rootListItem.listItemElement;
    const viewSource = function(event) {
      rootListItemElement.removeEventListener("contextmenu", viewSourceContextMenu);
      viewSourceForItems.add(rootListItem);
      this.refreshRequestJSONPayload(parsedObject, sourceText);
      event.consume();
    };
    const viewSourceContextMenu = (event) => {
      if (!rootListItem.expanded) {
        return;
      }
      const contextMenu = new UI8.ContextMenu.ContextMenu(event);
      contextMenu.newSection().appendItem(i18nString8(UIStrings8.viewSource), viewSource.bind(this, event), { jslogContext: "view-source" });
      void contextMenu.show();
    };
    const viewSourceButton = this.createViewSourceToggle(
      /* viewSource */
      false,
      viewSource.bind(this)
    );
    rootListItemElement.appendChild(viewSourceButton);
    rootListItemElement.addEventListener("contextmenu", viewSourceContextMenu);
  }
  createViewSourceToggle(viewSource, handler) {
    const viewSourceToggleTitle = viewSource ? i18nString8(UIStrings8.viewParsed) : i18nString8(UIStrings8.viewSource);
    return UI8.UIUtils.createTextButton(viewSourceToggleTitle, handler, { jslogContext: "source-parse", className: "payload-toggle" });
  }
  toggleURLDecoding(event) {
    this.decodeRequestParameters = !this.decodeRequestParameters;
    this.refreshQueryString();
    void this.refreshFormData();
    event.consume();
  }
};
var viewSourceForItems = /* @__PURE__ */ new WeakSet();
var Category = class extends UI8.TreeOutline.TreeElement {
  toggleOnClick;
  expandedSetting;
  expanded;
  constructor(root, name, title) {
    super(title || "", true);
    this.toggleOnClick = true;
    this.hidden = true;
    this.expandedSetting = Common6.Settings.Settings.instance().createSetting("request-info-" + name + "-category-expanded", true);
    this.expanded = this.expandedSetting.get();
    this.listItemElement.setAttribute("jslog", `${VisualLogging6.section().context(name)}`);
    root.appendChild(this);
  }
  createLeaf() {
    const leaf = new UI8.TreeOutline.TreeElement();
    this.appendChild(leaf);
    return leaf;
  }
  onexpand() {
    this.expandedSetting.set(true);
  }
  oncollapse() {
    this.expandedSetting.set(false);
  }
};

// gen/front_end/panels/network/RequestPreviewView.js
var RequestPreviewView_exports = {};
__export(RequestPreviewView_exports, {
  RequestPreviewView: () => RequestPreviewView
});
import "./../../ui/legacy/legacy.js";
import * as i18n19 from "./../../core/i18n/i18n.js";
import * as TextUtils from "./../../models/text_utils/text_utils.js";
import * as SourceFrame2 from "./../../ui/legacy/components/source_frame/source_frame.js";
import * as UI11 from "./../../ui/legacy/legacy.js";
import * as VisualLogging7 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/network/RequestHTMLView.js
var RequestHTMLView_exports = {};
__export(RequestHTMLView_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW2,
  RequestHTMLView: () => RequestHTMLView
});
import * as UI9 from "./../../ui/legacy/legacy.js";
import { html as html2, nothing as nothing2, render as render3 } from "./../../ui/lit/lit.js";

// gen/front_end/panels/network/requestHTMLView.css.js
var requestHTMLView_css_default = `/*
 * Copyright 2018 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
@scope to (devtools-widget > *) {
  .html-preview-frame {
    box-shadow: var(--drop-shadow);
    /* We always want a white background, even in dark mode */
    background: var(--ref-palette-neutral100);
    color-scheme: light;
    flex-grow: 1;
    margin: 20px;
  }
}

/*# sourceURL=${import.meta.resolve("./requestHTMLView.css")} */`;

// gen/front_end/panels/network/RequestHTMLView.js
var DEFAULT_VIEW2 = (input, _output, target) => {
  render3(html2`
    <style>${requestHTMLView_css_default}</style>
    <div class="html request-view widget vbox">
      ${input.dataURL ? html2`
        <!-- @ts-ignore -->
        <iframe class="html-preview-frame" sandbox
          csp="default-src 'none';img-src data:;style-src 'unsafe-inline'" src=${input.dataURL}
          tabindex="-1" role="presentation"></iframe>` : nothing2}
    </div>`, target);
};
var RequestHTMLView = class _RequestHTMLView extends UI9.Widget.VBox {
  #dataURL;
  #view;
  constructor(dataURL, view = DEFAULT_VIEW2) {
    super({ useShadowDom: true });
    this.#dataURL = dataURL;
    this.#view = view;
  }
  static create(contentData) {
    const dataURL = contentData.asDataUrl();
    return dataURL ? new _RequestHTMLView(dataURL) : null;
  }
  wasShown() {
    super.wasShown();
    this.requestUpdate();
  }
  willHide() {
    super.willHide();
    this.requestUpdate();
  }
  performUpdate() {
    this.#view({ dataURL: this.#dataURL }, {}, this.contentElement);
  }
};

// gen/front_end/panels/network/SignedExchangeInfoView.js
var SignedExchangeInfoView_exports = {};
__export(SignedExchangeInfoView_exports, {
  Category: () => Category2,
  SignedExchangeInfoView: () => SignedExchangeInfoView
});
import * as Host5 from "./../../core/host/host.js";
import * as i18n17 from "./../../core/i18n/i18n.js";
import * as IconButton3 from "./../../ui/components/icon_button/icon_button.js";
import * as Components3 from "./../../ui/legacy/components/utils/utils.js";
import * as UI10 from "./../../ui/legacy/legacy.js";

// gen/front_end/panels/network/signedExchangeInfoTree.css.js
var signedExchangeInfoTree_css_default = `/*
 * Copyright 2018 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.tree-outline {
  padding-left: 0;
}

.tree-outline > ol {
  padding-bottom: 5px;
  border-bottom: solid 1px var(--sys-color-divider);
}

.tree-outline > .parent {
  user-select: none;
  font-weight: bold;
  color: var(--sys-color-on-surface);
  margin-top: -1px;
  display: flex;
  align-items: center;
  height: 26px;
}

.tree-outline li {
  padding-left: 5px;
  line-height: 20px;
}

.tree-outline li:not(.parent) {
  display: block;
  margin-left: 10px;
}

.tree-outline li:not(.parent)::before {
  display: none;
}

.tree-outline .header-name {
  color: var(--sys-color-token-subtle);
  display: inline-block;
  margin-right: 0.25em;
  font-weight: bold;
  vertical-align: top;
  white-space: pre-wrap;
}

.tree-outline .header-separator {
  user-select: none;
}

.tree-outline .header-value {
  display: inline;
  margin-right: 1em;
  white-space: pre-wrap;
  word-break: break-all;
  margin-top: 1px;
}

.tree-outline .header-toggle {
  display: inline;
  margin-left: 30px;
  font-weight: normal;
  color: var(--sys-color-state-disabled);
}

.tree-outline .header-toggle:hover {
  color: var(--sys-color-state-hover-on-subtle);
}

.tree-outline .error-log {
  color: var(--sys-color-error);
  display: inline-block;
  margin-right: 0.25em;
  margin-left: 0.25em;
  font-weight: bold;
  vertical-align: top;
  white-space: pre-wrap;
}

.tree-outline .hex-data {
  display: block;
  word-break: normal;
  overflow-wrap: anywhere;
  margin-left: 20px;
}

.tree-outline .error-field {
  color: var(--sys-color-error);
}

.prompt-icon {
  margin-top: 2px;
}

/*# sourceURL=${import.meta.resolve("./signedExchangeInfoTree.css")} */`;

// gen/front_end/panels/network/signedExchangeInfoView.css.js
var signedExchangeInfoView_css_default = `/*
 * Copyright 2018 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.signed-exchange-info-view {
  user-select: text;
  overflow: auto;
}

.signed-exchange-info-tree {
  flex-grow: 1;
  overflow-y: auto;
  margin: 0;
}

/*# sourceURL=${import.meta.resolve("./signedExchangeInfoView.css")} */`;

// gen/front_end/panels/network/SignedExchangeInfoView.js
var UIStrings9 = {
  /**
   * @description Text for errors
   */
  errors: "Errors",
  /**
   * @description Text in Signed Exchange Info View of the Network panel
   */
  signedHttpExchange: "Signed HTTP exchange",
  /**
   * @description Text for an option to learn more about something
   */
  learnmore: "Learn\xA0more",
  /**
   * @description Text in Request Headers View of the Network panel
   */
  requestUrl: "Request URL",
  /**
   * @description Text in Signed Exchange Info View of the Network panel
   */
  responseCode: "Response code",
  /**
   * @description Text in Signed Exchange Info View of the Network panel
   */
  headerIntegrityHash: "Header integrity hash",
  /**
   * @description Text in Signed Exchange Info View of the Network panel
   */
  responseHeaders: "Response headers",
  /**
   * @description Text in Signed Exchange Info View of the Network panel
   */
  signature: "Signature",
  /**
   * @description Text in Signed Exchange Info View of the Network panel
   */
  label: "Label",
  /**
   * @description Text in Signed Exchange Info View of the Network panel
   */
  certificateUrl: "Certificate URL",
  /**
   * @description Text to view a security certificate
   */
  viewCertificate: "View certificate",
  /**
   * @description Text in Signed Exchange Info View of the Network panel
   */
  integrity: "Integrity",
  /**
   * @description Text in Signed Exchange Info View of the Network panel
   */
  certificateSha: "Certificate SHA256",
  /**
   * @description Text in Signed Exchange Info View of the Network panel
   */
  validityUrl: "Validity URL",
  /**
   * @description Text in Signed Exchange Info View of the Network panel
   */
  date: "Date",
  /**
   * @description Text in Signed Exchange Info View of the Network panel
   */
  expires: "Expires",
  /**
   * @description Text for a security certificate
   */
  certificate: "Certificate",
  /**
   * @description Text that refers to the subject of a security certificate
   */
  subject: "Subject",
  /**
   * @description Text to show since when an item is valid
   */
  validFrom: "Valid from",
  /**
   * @description Text to indicate the expiry date
   */
  validUntil: "Valid until",
  /**
   * @description Text for the issuer of an item
   */
  issuer: "Issuer"
};
var str_9 = i18n17.i18n.registerUIStrings("panels/network/SignedExchangeInfoView.ts", UIStrings9);
var i18nString9 = i18n17.i18n.getLocalizedString.bind(void 0, str_9);
var SignedExchangeInfoView = class extends UI10.Widget.VBox {
  responseHeadersItem;
  constructor(request) {
    super();
    this.registerRequiredCSS(signedExchangeInfoView_css_default);
    console.assert(request.signedExchangeInfo() !== null);
    const signedExchangeInfo = request.signedExchangeInfo();
    this.element.classList.add("signed-exchange-info-view");
    const root = new UI10.TreeOutline.TreeOutlineInShadow();
    root.registerRequiredCSS(signedExchangeInfoTree_css_default);
    root.element.classList.add("signed-exchange-info-tree");
    root.setFocusable(false);
    root.setDense(true);
    root.expandTreeElementsWhenArrowing = true;
    this.element.appendChild(root.element);
    const errorFieldSetMap = /* @__PURE__ */ new Map();
    if (signedExchangeInfo.errors?.length) {
      const errorMessagesCategory = new Category2(root, i18nString9(UIStrings9.errors));
      for (const error of signedExchangeInfo.errors) {
        const fragment = document.createDocumentFragment();
        const icon = new IconButton3.Icon.Icon();
        icon.name = "cross-circle-filled";
        icon.classList.add("prompt-icon", "small");
        fragment.appendChild(icon);
        fragment.createChild("div", "error-log").textContent = error.message;
        errorMessagesCategory.createLeaf(fragment);
        if (error.errorField) {
          let errorFieldSet = errorFieldSetMap.get(error.signatureIndex);
          if (!errorFieldSet) {
            errorFieldSet = /* @__PURE__ */ new Set();
            errorFieldSetMap.set(error.signatureIndex, errorFieldSet);
          }
          errorFieldSet.add(error.errorField);
        }
      }
    }
    const titleElement = document.createDocumentFragment();
    titleElement.createChild("div", "header-name").textContent = i18nString9(UIStrings9.signedHttpExchange);
    const learnMoreNode = UI10.XLink.XLink.create("https://github.com/WICG/webpackage", i18nString9(UIStrings9.learnmore), "header-toggle", void 0, "learn-more");
    titleElement.appendChild(learnMoreNode);
    const headerCategory = new Category2(root, titleElement);
    if (signedExchangeInfo.header) {
      const header = signedExchangeInfo.header;
      const redirectDestination = request.redirectDestination();
      const requestURLElement = this.formatHeader(i18nString9(UIStrings9.requestUrl), header.requestUrl);
      if (redirectDestination) {
        const viewRequestLink = Components3.Linkifier.Linkifier.linkifyRevealable(redirectDestination, "View request", void 0, void 0, void 0, "redirect-destination-request");
        viewRequestLink.classList.add("header-toggle");
        requestURLElement.appendChild(viewRequestLink);
      }
      headerCategory.createLeaf(requestURLElement);
      headerCategory.createLeaf(this.formatHeader(i18nString9(UIStrings9.responseCode), String(header.responseCode)));
      headerCategory.createLeaf(this.formatHeader(i18nString9(UIStrings9.headerIntegrityHash), header.headerIntegrity));
      this.responseHeadersItem = headerCategory.createLeaf(this.formatHeader(i18nString9(UIStrings9.responseHeaders), ""));
      const responseHeaders = header.responseHeaders;
      for (const name in responseHeaders) {
        const headerTreeElement = new UI10.TreeOutline.TreeElement(this.formatHeader(name, responseHeaders[name]));
        headerTreeElement.selectable = false;
        this.responseHeadersItem.appendChild(headerTreeElement);
      }
      this.responseHeadersItem.expand();
      for (let i = 0; i < header.signatures.length; ++i) {
        const errorFieldSet = errorFieldSetMap.get(i) || /* @__PURE__ */ new Set();
        const signature = header.signatures[i];
        const signatureCategory = new Category2(root, i18nString9(UIStrings9.signature));
        signatureCategory.createLeaf(this.formatHeader(i18nString9(UIStrings9.label), signature.label));
        signatureCategory.createLeaf(this.formatHeaderForHexData(i18nString9(UIStrings9.signature), signature.signature, errorFieldSet.has(
          "signatureSig"
          /* Protocol.Network.SignedExchangeErrorField.SignatureSig */
        )));
        if (signature.certUrl) {
          const certURLElement = this.formatHeader(i18nString9(UIStrings9.certificateUrl), signature.certUrl, errorFieldSet.has(
            "signatureCertUrl"
            /* Protocol.Network.SignedExchangeErrorField.SignatureCertUrl */
          ));
          if (signature.certificates) {
            const viewCertLink = certURLElement.createChild("span", "devtools-link header-toggle");
            viewCertLink.textContent = i18nString9(UIStrings9.viewCertificate);
            viewCertLink.addEventListener("click", Host5.InspectorFrontendHost.InspectorFrontendHostInstance.showCertificateViewer.bind(null, signature.certificates), false);
          }
          signatureCategory.createLeaf(certURLElement);
        }
        signatureCategory.createLeaf(this.formatHeader(i18nString9(UIStrings9.integrity), signature.integrity, errorFieldSet.has(
          "signatureIntegrity"
          /* Protocol.Network.SignedExchangeErrorField.SignatureIntegrity */
        )));
        if (signature.certSha256) {
          signatureCategory.createLeaf(this.formatHeaderForHexData(i18nString9(UIStrings9.certificateSha), signature.certSha256, errorFieldSet.has(
            "signatureCertSha256"
            /* Protocol.Network.SignedExchangeErrorField.SignatureCertSha256 */
          )));
        }
        signatureCategory.createLeaf(this.formatHeader(i18nString9(UIStrings9.validityUrl), signature.validityUrl, errorFieldSet.has(
          "signatureValidityUrl"
          /* Protocol.Network.SignedExchangeErrorField.SignatureValidityUrl */
        )));
        signatureCategory.createLeaf().title = this.formatHeader(i18nString9(UIStrings9.date), new Date(1e3 * signature.date).toUTCString(), errorFieldSet.has(
          "signatureTimestamps"
          /* Protocol.Network.SignedExchangeErrorField.SignatureTimestamps */
        ));
        signatureCategory.createLeaf().title = this.formatHeader(i18nString9(UIStrings9.expires), new Date(1e3 * signature.expires).toUTCString(), errorFieldSet.has(
          "signatureTimestamps"
          /* Protocol.Network.SignedExchangeErrorField.SignatureTimestamps */
        ));
      }
    }
    if (signedExchangeInfo.securityDetails) {
      const securityDetails = signedExchangeInfo.securityDetails;
      const securityCategory = new Category2(root, i18nString9(UIStrings9.certificate));
      securityCategory.createLeaf(this.formatHeader(i18nString9(UIStrings9.subject), securityDetails.subjectName));
      securityCategory.createLeaf(this.formatHeader(i18nString9(UIStrings9.validFrom), new Date(1e3 * securityDetails.validFrom).toUTCString()));
      securityCategory.createLeaf(this.formatHeader(i18nString9(UIStrings9.validUntil), new Date(1e3 * securityDetails.validTo).toUTCString()));
      securityCategory.createLeaf(this.formatHeader(i18nString9(UIStrings9.issuer), securityDetails.issuer));
    }
  }
  formatHeader(name, value, highlighted) {
    const fragment = document.createDocumentFragment();
    const nameElement = fragment.createChild("div", "header-name");
    nameElement.textContent = name + ": ";
    fragment.createChild("span", "header-separator");
    const valueElement = fragment.createChild("div", "header-value source-code");
    valueElement.textContent = value;
    if (highlighted) {
      nameElement.classList.add("error-field");
      valueElement.classList.add("error-field");
    }
    return fragment;
  }
  formatHeaderForHexData(name, value, highlighted) {
    const fragment = document.createDocumentFragment();
    const nameElement = fragment.createChild("div", "header-name");
    nameElement.textContent = name + ": ";
    fragment.createChild("span", "header-separator");
    const valueElement = fragment.createChild("div", "header-value source-code hex-data");
    valueElement.textContent = value.replace(/(.{2})/g, "$1 ");
    if (highlighted) {
      nameElement.classList.add("error-field");
      valueElement.classList.add("error-field");
    }
    return fragment;
  }
};
var Category2 = class extends UI10.TreeOutline.TreeElement {
  toggleOnClick;
  expanded;
  constructor(root, title) {
    super(title, true);
    this.selectable = false;
    this.toggleOnClick = true;
    this.expanded = true;
    root.appendChild(this);
  }
  createLeaf(title) {
    const leaf = new UI10.TreeOutline.TreeElement(title);
    leaf.selectable = false;
    this.appendChild(leaf);
    return leaf;
  }
};

// gen/front_end/panels/network/RequestPreviewView.js
var UIStrings10 = {
  /**
   * @description Text in Request Preview View of the Network panel
   */
  failedToLoadResponseData: "Failed to load response data",
  /**
   * @description Text in Request Preview View of the Network panel
   */
  previewNotAvailable: "Preview not available"
};
var str_10 = i18n19.i18n.registerUIStrings("panels/network/RequestPreviewView.ts", UIStrings10);
var i18nString10 = i18n19.i18n.getLocalizedString.bind(void 0, str_10);
var RequestPreviewView = class extends UI11.Widget.VBox {
  request;
  contentViewPromise;
  constructor(request) {
    super({ jslog: `${VisualLogging7.pane("preview").track({ resize: true })}` });
    this.element.classList.add("request-view");
    this.request = request;
    this.contentViewPromise = null;
  }
  async showPreview() {
    const view = await this.createPreview();
    view.show(this.element);
    await view.updateComplete;
    if (!(view instanceof UI11.View.SimpleView)) {
      return view;
    }
    const toolbar4 = this.element.createChild("devtools-toolbar", "network-item-preview-toolbar");
    void view.toolbarItems().then((items) => {
      items.map((item) => toolbar4.appendToolbarItem(item));
    });
    return view;
  }
  wasShown() {
    super.wasShown();
    void this.doShowPreview();
  }
  doShowPreview() {
    if (!this.contentViewPromise) {
      this.contentViewPromise = this.showPreview();
    }
    return this.contentViewPromise;
  }
  async htmlPreview() {
    const contentData = await this.request.requestContentData();
    if (TextUtils.ContentData.ContentData.isError(contentData)) {
      return new UI11.EmptyWidget.EmptyWidget(i18nString10(UIStrings10.failedToLoadResponseData), contentData.error);
    }
    const allowlist = /* @__PURE__ */ new Set(["text/html", "text/plain", "application/xhtml+xml"]);
    if (!allowlist.has(this.request.mimeType)) {
      return null;
    }
    const jsonView = await SourceFrame2.JSONView.JSONView.createView(contentData.text);
    if (jsonView) {
      return jsonView;
    }
    return RequestHTMLView.create(contentData);
  }
  async createPreview() {
    if (this.request.signedExchangeInfo()) {
      return new SignedExchangeInfoView(this.request);
    }
    const htmlErrorPreview = await this.htmlPreview();
    if (htmlErrorPreview) {
      return htmlErrorPreview;
    }
    const provided = await SourceFrame2.PreviewFactory.PreviewFactory.createPreview(this.request, this.request.mimeType);
    if (provided) {
      return provided;
    }
    return new UI11.EmptyWidget.EmptyWidget(i18nString10(UIStrings10.previewNotAvailable), "");
  }
};

// gen/front_end/panels/network/RequestResponseView.js
var RequestResponseView_exports = {};
__export(RequestResponseView_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW3,
  RequestResponseView: () => RequestResponseView
});
import * as Common7 from "./../../core/common/common.js";
import * as Host6 from "./../../core/host/host.js";
import * as i18n21 from "./../../core/i18n/i18n.js";
import * as TextUtils2 from "./../../models/text_utils/text_utils.js";
import * as Lit from "./../../third_party/lit/lit.js";
import * as SourceFrame3 from "./../../ui/legacy/components/source_frame/source_frame.js";
import * as UI12 from "./../../ui/legacy/legacy.js";
var { html: html3, render: render4 } = Lit;
var UIStrings11 = {
  /**
   * @description Text in Request Response View of the Network panel if no preview can be shown
   */
  noPreview: "Nothing to preview",
  /**
   * @description Text in Request Response View of the Network panel
   */
  thisRequestHasNoResponseData: "This request has no response data available",
  /**
   * @description Text in Request Preview View of the Network panel
   */
  failedToLoadResponseData: "Failed to load response data"
};
var str_11 = i18n21.i18n.registerUIStrings("panels/network/RequestResponseView.ts", UIStrings11);
var i18nString11 = i18n21.i18n.getLocalizedString.bind(void 0, str_11);
var widgetConfig2 = UI12.Widget.widgetConfig;
var widgetRef = UI12.Widget.widgetRef;
var DEFAULT_VIEW3 = (input, output, target) => {
  let widget;
  if (TextUtils2.StreamingContentData.isError(input.contentData)) {
    widget = html3`<devtools-widget
                    .widgetConfig=${widgetConfig2((element) => new UI12.EmptyWidget.EmptyWidget(i18nString11(UIStrings11.failedToLoadResponseData), input.contentData.error, element))}></devtools-widget>`;
  } else if (input.request.statusCode === 204 || input.request.failed) {
    widget = html3`<devtools-widget
                     .widgetConfig=${widgetConfig2((element) => new UI12.EmptyWidget.EmptyWidget(i18nString11(UIStrings11.noPreview), i18nString11(UIStrings11.thisRequestHasNoResponseData), element))}></devtools-widget>`;
  } else if (input.renderAsText) {
    widget = html3`<devtools-widget
                    .widgetConfig=${widgetConfig2((element) => new SourceFrame3.ResourceSourceFrame.SearchableContainer(input.request, input.mimeType, element))}
                    ${widgetRef(SourceFrame3.ResourceSourceFrame.SearchableContainer, (widget2) => {
      output.revealPosition = widget2.revealPosition.bind(widget2);
    })}></devtools-widget>`;
  } else {
    widget = html3`<devtools-widget
                    .widgetConfig=${widgetConfig2((element) => new BinaryResourceView(input.contentData, input.request.url(), input.request.resourceType(), element))}></devtools-widget>`;
  }
  render4(widget, target);
};
var RequestResponseView = class extends UI12.Widget.VBox {
  request;
  #view;
  #revealPosition;
  constructor(request, view = DEFAULT_VIEW3) {
    super();
    this.request = request;
    this.#view = view;
  }
  wasShown() {
    super.wasShown();
    this.requestUpdate();
  }
  async performUpdate() {
    const contentData = await this.request.requestStreamingContent();
    let renderAsText = false;
    const mimeType = this.getMimeTypeForDisplay();
    if (!TextUtils2.StreamingContentData.isError(contentData)) {
      const isWasm = contentData.mimeType === "application/wasm";
      renderAsText = contentData.isTextContent || isWasm;
      const isMinified = isWasm || !contentData.isTextContent ? false : TextUtils2.TextUtils.isMinified(contentData.content().text);
      const mediaType = Common7.ResourceType.ResourceType.mediaTypeForMetrics(mimeType, this.request.resourceType().isFromSourceMap(), isMinified, false, false);
      Host6.userMetrics.networkPanelResponsePreviewOpened(mediaType);
    }
    const viewInput = { request: this.request, contentData, mimeType, renderAsText };
    const that = this;
    const viewOutput = {
      set revealPosition(reveal) {
        that.#revealPosition = reveal;
      }
    };
    this.#view(viewInput, viewOutput, this.contentElement);
  }
  getMimeTypeForDisplay() {
    if (Common7.ResourceType.ResourceType.simplifyContentType(this.request.mimeType) === "application/json") {
      return this.request.mimeType;
    }
    return this.request.resourceType().canonicalMimeType() || this.request.mimeType;
  }
  async revealPosition(position) {
    this.requestUpdate();
    await this.updateComplete;
    await this.#revealPosition?.(position);
  }
};

// gen/front_end/panels/network/RequestTimingView.js
var RequestTimingView_exports = {};
__export(RequestTimingView_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW4,
  RequestTimingView: () => RequestTimingView
});
import * as Common8 from "./../../core/common/common.js";
import * as Host7 from "./../../core/host/host.js";
import * as i18n23 from "./../../core/i18n/i18n.js";
import * as Platform4 from "./../../core/platform/platform.js";
import * as SDK8 from "./../../core/sdk/sdk.js";
import * as Logs4 from "./../../models/logs/logs.js";
import * as NetworkTimeCalculator from "./../../models/network_time_calculator/network_time_calculator.js";
import * as uiI18n2 from "./../../ui/i18n/i18n.js";
import * as ObjectUI2 from "./../../ui/legacy/components/object_ui/object_ui.js";
import * as UI13 from "./../../ui/legacy/legacy.js";
import { Directives as Directives2, html as html4, nothing as nothing3, render as render5 } from "./../../ui/lit/lit.js";
import * as VisualLogging8 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/network/networkTimingTable.css.js
var networkTimingTable_css_default = `/*
 * Copyright 2017 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.network-timing-table {
  width: 380px;
  border-spacing: 0;
  padding-left: 10px;
  padding-right: 10px;
  line-height: initial;
  table-layout: fixed;
}

.network-timing-start {
  border-top: 5px solid transparent;
}

.network-timing-start th span.network-timing-hidden-header {
  height: 1px;
  width: 1px;
  position: absolute;
  overflow: hidden;
}

.network-timing-table-header td,
.network-timing-footer td {
  border-top: 10px solid transparent;
}

.network-timing-table-header td {
  color: var(--sys-color-token-subtle);
}

.network-timing-table td {
  padding: 4px 0;
}

.network-timing-table-header td:last-child {
  text-align: right;
}

.network-timing-footer td:last-child {
  font-weight: bold;
  text-align: right;
}

table.network-timing-table > tr:not(.network-timing-table-header, .network-timing-footer) > td:first-child {
  padding-left: 12px;
}

.network-timing-table col.labels {
  width: 156px;
}

.network-timing-table col.duration {
  width: 80px;
}

.network-timing-table td.caution {
  font-weight: bold;
  color: var(--issue-color-yellow);
  padding: 2px 0;
}

.network-timing-table hr.break {
  background-color: var(--sys-color-divider);
  border: none;
  height: 1px;
}

.network-timing-row {
  position: relative;
  height: 15px;
}

.network-timing-bar {
  position: absolute;
  min-width: 1px;
  inset: 0 attr(data-right %) 0 attr(data-left %); /* stylelint-disable-line declaration-property-value-no-unknown */
  background-color: attr(data-background <color>); /* stylelint-disable-line declaration-property-value-no-unknown */
}

.network-timing-bar-title {
  color: var(--sys-color-on-surface);
  white-space: nowrap;
  text-align: right;
}

.network-timing-bar.queueing,
.network-timing-bar.total {
  border: 1px solid var(--sys-color-token-subtle);
}

.network-timing-bar.blocking,
.-theme-preserve {
  background-color: var(--network-overview-blocking); /* stylelint-disable-line plugin/use_theme_colors */
}

.network-timing-bar.proxy,
.-theme-preserve {
  background-color: var(--override-network-overview-proxy);
}

.network-timing-bar.dns,
.-theme-preserve {
  background-color: var(--sys-color-cyan);
}

.network-timing-bar.connecting,
.network-timing-bar.serviceworker,
.network-timing-bar.serviceworker-preparation,
.network-timing-bar.serviceworker-routerevaluation,
.network-timing-bar.serviceworker-cachelookup,
.-theme-preserve {
  background-color: var(--network-overview-service-worker); /* stylelint-disable-line plugin/use_theme_colors */
}

.network-timing-bar.ssl,
.-theme-preserve {
  background-color: var(--network-overview-ssl); /* stylelint-disable-line plugin/use_theme_colors */
}

.network-timing-bar.serviceworker-respondwith,
.-theme-preserve {
  background-color: var(--network-overview-service-worker-respond-with); /* stylelint-disable-line plugin/use_theme_colors */
}

.network-fetch-timing-bar-clickable::before {
  user-select: none;
  mask-image: var(--image-file-triangle-right);
  float: left;
  width: 14px;
  height: 14px;
  margin-right: 2px;
  content: "";
  position: relative;
  background-color: var(--icon-default);
  transition: transform 200ms;
}

.network-fetch-timing-bar-clickable {
  position: relative;
  left: -12px;
}

tr:has([aria-checked="false"].network-fetch-timing-bar-clickable) ~ .router-evaluation-timing-bar-details,
tr:has([aria-checked="false"].network-fetch-timing-bar-clickable) ~ .network-fetch-timing-bar-details {
  display: none;
}

tr:has([aria-checked].network-fetch-timing-bar-clickable) ~ .router-evaluation-timing-bar-details,
tr:has([aria-checked].network-fetch-timing-bar-clickable) ~ .network-fetch-timing-bar-details {
  display: block;
}

.network-fetch-timing-bar-clickable:focus-visible {
  background-color: var(--sys-color-state-focus-highlight);
}

.network-fetch-timing-bar-clickable[aria-checked="true"]::before {
  transform: rotate(90deg);
}

.network-fetch-timing-bar-details-collapsed {
  display: none;
}

.network-fetch-timing-bar-details-expanded {
  display: block;
}

.network-fetch-timing-bar-details,
.router-evaluation-timing-bar-details {
  padding-left: 11px;
  width: fit-content;
}

.network-fetch-details-treeitem {
  width: max-content;
}

.network-timing-bar.sending,
.-theme-preserve {
  background-color: var(--override-network-overview-sending);
}

.network-timing-bar.waiting,
.-theme-preserve {
  background-color: var(--network-overview-waiting); /* stylelint-disable-line plugin/use_theme_colors */
}

.throttled devtools-icon {
  vertical-align: middle;
  margin-right: var(--sys-size-3);
  color: var(--sys-color-yellow);
}

td.throttled {
  color: var(--sys-color-yellow);
}

.network-timing-bar.receiving,
.network-timing-bar.receiving-push,
.-theme-preserve {
  background-color: var(--network-overview-receiving); /* stylelint-disable-line plugin/use_theme_colors */
}

.network-timing-bar.push,
.-theme-preserve {
  background-color: var(--network-overview-push); /* stylelint-disable-line plugin/use_theme_colors */
}

.server-timing-row:nth-child(even) {
  background: var(--sys-color-surface1);
}

.network-timing-bar.server-timing,
.-theme-preserve {
  background-color: var(--sys-color-neutral-container);
}

tr.synthetic {
  font-style: italic;
}

.network-timing-table td.network-timing-metric {
  white-space: nowrap;
  max-width: 150px;
  overflow-x: hidden;
  text-overflow: ellipsis;
}

.network-timing-bar.proxy,
.network-timing-bar.dns,
.network-timing-bar.ssl,
.network-timing-bar.connecting,
.network-timing-bar.blocking {
  height: 10px;
  margin: auto;
}

@media (forced-colors: active) {
  .network-timing-bar.blocking,
  .network-timing-bar.proxy,
  .network-timing-bar.dns,
  .network-timing-bar.connecting,
  .network-timing-bar.serviceworker,
  .network-timing-bar.serviceworker-preparation,
  .network-timing-bar.ssl,
  .network-timing-bar.sending,
  .network-timing-bar.waiting,
  .network-timing-bar.receiving,
  .network-timing-bar.receiving-push,
  .network-timing-bar.push,
  .network-timing-bar.server-timing,
  .-theme-preserve {
    forced-color-adjust: none;
  }

  .network-timing-table-header td,
  .network-timing-footer td {
    forced-color-adjust: none;
    color: ButtonText;
  }
}

/*# sourceURL=${import.meta.resolve("./networkTimingTable.css")} */`;

// gen/front_end/panels/network/RequestTimingView.js
var { repeat, classMap, ifDefined } = Directives2;
var UIStrings12 = {
  /**
   * @description Text used to label the time taken to receive an HTTP/2 Push message.
   */
  receivingPush: "Receiving `Push`",
  /**
   * @description Text in Request Timing View of the Network panel
   */
  queueing: "Queueing",
  /**
   * @description Text in Request Timing View of the Network panel
   */
  stalled: "Stalled",
  /**
   * @description Text in Request Timing View of the Network panel
   */
  initialConnection: "Initial connection",
  /**
   * @description Text in Request Timing View of the Network panel
   */
  dnsLookup: "DNS Lookup",
  /**
   * @description Text in Request Timing View of the Network panel
   */
  proxyNegotiation: "Proxy negotiation",
  /**
   * @description Text used to label the time taken to read an HTTP/2 Push message.
   */
  readingPush: "Reading `Push`",
  /**
   * @description Text in Request Timing View of the Network panel
   */
  contentDownload: "Content Download",
  /**
   * @description Text in Request Timing View of the Network panel
   */
  requestSent: "Request sent",
  /**
   * @description Text in Request Timing View of the Network panel
   */
  requestToServiceworker: "Request to `ServiceWorker`",
  /**
   * @description Text in Request Timing View of the Network panel
   */
  startup: "Startup",
  /**
   * @description Text in Request Timing View of the Network panel
   */
  respondwith: "respondWith",
  /**
   * @description Text in Request Timing View of the Network panel
   */
  ssl: "SSL",
  /**
   * @description Text for sum
   */
  total: "Total",
  /**
   * @description Text in Request Timing View of the Network panel
   */
  waitingTtfb: "Waiting for server response",
  /**
   * @description Text in Signed Exchange Info View of the Network panel
   */
  label: "Label",
  /**
   * @description Text in Request Timing View of the Network panel
   */
  routerEvaluation: "Router Evaluation",
  /**
   * @description Text in Request Timing View of the Network panel
   */
  routerCacheLookup: "Cache Lookup",
  /**
   * @description Inner element text content in Network Log View Columns of the Network panel
   */
  waterfall: "Waterfall",
  /**
   * @description Text for the duration of something
   */
  duration: "Duration",
  /**
   * @description Text of a DOM element in Request Timing View of the Network panel
   * @example {120.39ms} PH1
   */
  queuedAtS: "Queued at {PH1}",
  /**
   * @description Text of a DOM element in Request Timing View of the Network panel
   * @example {120.39ms} PH1
   */
  startedAtS: "Started at {PH1}",
  /**
   * @description Text in Request Timing View of the Network panel
   */
  serverPush: "Server Push",
  /**
   * @description Text of a DOM element in Request Timing View of the Network panel
   */
  resourceScheduling: "Resource Scheduling",
  /**
   * @description Text in Request Timing View of the Network panel
   */
  connectionStart: "Connection Start",
  /**
   * @description Text in Request Timing View of the Network panel
   */
  requestResponse: "Request/Response",
  /**
   * @description Text of a DOM element in Request Timing View of the Network panel
   */
  cautionRequestIsNotFinishedYet: "CAUTION: request is not finished yet!",
  /**
   * @description Text in Request Timing View of the Network panel
   */
  explanation: "Explanation",
  /**
   * @description Text of a DOM element in Request Timing View of the Network panel
   */
  serverTiming: "Server Timing",
  /**
   * @description Text of a DOM element in Request Timing View of the Network panel
   */
  time: "TIME",
  /**
   * @description Label for the Server Timing API
   */
  theServerTimingApi: "the Server Timing API",
  /**
   * @description Text to inform about the ServerTiming API, which can be used to report timing information to DevTools about the substeps that the server performed to answer the requests. Timing information is, e.g., the duration of the substep.
   * @example {https://web.dev/custom-metrics/#server-timing-api} PH1
   */
  duringDevelopmentYouCanUseSToAdd: "During development, you can use {PH1} to add insights into the server-side timing of this request.",
  /**
   * @description Header for last column of network timing tab.
   */
  durationC: "DURATION",
  /**
   * @description Description for treeitem in ServiceWorker Fetch Details
   */
  originalRequest: "Original Request",
  /**
   * @description Description for treeitem in ServiceWorker Fetch Details
   */
  responseReceived: "Response Received",
  /**
   * @description Text for an unspecified service worker response source
   */
  unknown: "Unknown",
  /**
   * @description Displays how a particular response was fetched
   * @example {Network fetch} PH1
   */
  sourceOfResponseS: "Source of response: {PH1}",
  /**
   * @description Name of storage cache from which a response was fetched
   * @example {v1} PH1
   */
  cacheStorageCacheNameS: "Cache storage cache name: {PH1}",
  /**
   * @description Text for unknown cache storage name
   */
  cacheStorageCacheNameUnknown: "Cache storage cache name: Unknown",
  /**
   * @description Time at which a response was retrieved
   * @example {Fri Apr 10 2020 17:20:27 GMT-0700 (Pacific Daylight Time)} PH1
   */
  retrievalTimeS: "Retrieval Time: {PH1}",
  /**
   * @description Text used to show that serviceworker fetch response source is ServiceWorker Cache Storage
   */
  serviceworkerCacheStorage: "`ServiceWorker` cache storage",
  /**
   * @description Text used to show that serviceworker fetch response source is HTTP cache
   */
  fromHttpCache: "From HTTP cache",
  /**
   * @description Text used to show that data was retrieved via a Network fetch
   */
  networkFetch: "Network fetch",
  /**
   * @description Text used to show that data was retrieved using ServiceWorker fallback code
   */
  fallbackCode: "Fallback code",
  /**
   * @description Name of the specified source for SW static routing API.
   * @example {network} PH1
   */
  routerMatchedSource: "Matched source: {PH1}",
  /**
   * @description Name of the actually used source for SW static routing API.
   * @example {network} PH1
   */
  routerActualSource: "Actual source: {PH1}",
  /**
   * @description Cell title in Network Data Grid Node of the Network panel
   * @example {Fast 4G} PH1
   */
  wasThrottled: "Request was throttled ({PH1})"
};
var str_12 = i18n23.i18n.registerUIStrings("panels/network/RequestTimingView.ts", UIStrings12);
var i18nString12 = i18n23.i18n.getLocalizedString.bind(void 0, str_12);
function timeRangeTitle(name) {
  switch (name) {
    case "push":
      return i18nString12(UIStrings12.receivingPush);
    case "queueing":
      return i18nString12(UIStrings12.queueing);
    case "blocking":
      return i18nString12(UIStrings12.stalled);
    case "connecting":
      return i18nString12(UIStrings12.initialConnection);
    case "dns":
      return i18nString12(UIStrings12.dnsLookup);
    case "proxy":
      return i18nString12(UIStrings12.proxyNegotiation);
    case "receiving-push":
      return i18nString12(UIStrings12.readingPush);
    case "receiving":
      return i18nString12(UIStrings12.contentDownload);
    case "sending":
      return i18nString12(UIStrings12.requestSent);
    case "serviceworker":
      return i18nString12(UIStrings12.requestToServiceworker);
    case "serviceworker-preparation":
      return i18nString12(UIStrings12.startup);
    case "serviceworker-routerevaluation":
      return i18nString12(UIStrings12.routerEvaluation);
    case "serviceworker-cachelookup":
      return i18nString12(UIStrings12.routerCacheLookup);
    case "serviceworker-respondwith":
      return i18nString12(UIStrings12.respondwith);
    case "ssl":
      return i18nString12(UIStrings12.ssl);
    case "total":
      return i18nString12(UIStrings12.total);
    case "waiting":
      return i18nString12(UIStrings12.waitingTtfb);
    default:
      return name;
  }
}
function groupHeader(name) {
  if (name === "push") {
    return i18nString12(UIStrings12.serverPush);
  }
  if (name === "queueing") {
    return i18nString12(UIStrings12.resourceScheduling);
  }
  if (NetworkTimeCalculator.ConnectionSetupRangeNames.has(name)) {
    return i18nString12(UIStrings12.connectionStart);
  }
  if (NetworkTimeCalculator.ServiceWorkerRangeNames.has(name)) {
    return "Service Worker";
  }
  return i18nString12(UIStrings12.requestResponse);
}
function getLocalizedResponseSourceForCode(swResponseSource) {
  switch (swResponseSource) {
    case "cache-storage":
      return i18nString12(UIStrings12.serviceworkerCacheStorage);
    case "http-cache":
      return i18nString12(UIStrings12.fromHttpCache);
    case "network":
      return i18nString12(UIStrings12.networkFetch);
    default:
      return i18nString12(UIStrings12.fallbackCode);
  }
}
var DEFAULT_VIEW4 = (input, output, target) => {
  const revealThrottled = () => {
    if (input.wasThrottled) {
      void Common8.Revealer.reveal(input.wasThrottled);
    }
  };
  const scale = 100 / (input.endTime - input.startTime);
  const isClickable = (range) => range.name === "serviceworker-respondwith" || range.name === "serviceworker-routerevaluation";
  const addServerTiming = (serverTiming) => {
    const colorGenerator = new Common8.Color.Generator({ min: 0, max: 360, count: 36 }, { min: 50, max: 80, count: void 0 }, 80);
    const isTotal = serverTiming.metric.toLowerCase() === "total";
    const metricDesc = [serverTiming.metric, serverTiming.description].filter(Boolean).join(" \u2014 ");
    const left = serverTiming.value === null ? -1 : scale * (input.endTime - input.startTime - serverTiming.value / 1e3);
    const lastRange = input.timeRanges.findLast(
      (range) => range.name !== "total"
      /* NetworkTimeCalculator.RequestTimeRangeNames.TOTAL */
    );
    const lastTimingRightEdge = lastRange ? scale * (input.endTime - lastRange.end) : 100;
    const classes2 = classMap({
      ["network-timing-footer"]: isTotal,
      ["server-timing-row"]: !isTotal,
      // Mark entries from a bespoke format
      ["synthetic"]: serverTiming.metric.startsWith("(c")
    });
    return html4`
      <tr class=${classes2}>
        <td title=${metricDesc} class=network-timing-metric>
          ${metricDesc}
        </td>
        ${serverTiming.value === null ? nothing3 : html4`
          <td class=server-timing-cell--value-bar>
            <div class=network-timing-row>
              ${left < 0 ? nothing3 : html4`<span
                    class="network-timing-bar server-timing"
                    data-background=${ifDefined(isTotal ? void 0 : colorGenerator.colorForID(serverTiming.metric))}
                    data-left=${left}
                    data-right=${lastTimingRightEdge}>${"\u200B"}</span>`}
            </div>
          </td>
          <td class=server-timing-cell--value-text>
            <div class=network-timing-bar-title>
              ${i18n23.TimeUtilities.millisToString(serverTiming.value, true)}
            </div>
          </td>
        `}
      </tr>`;
  };
  const onActivate = (e) => {
    if ("key" in e && !Platform4.KeyboardUtilities.isEnterOrSpaceKey(e)) {
      return;
    }
    const target2 = e.target;
    if (!target2?.classList.contains("network-fetch-timing-bar-clickable")) {
      return;
    }
    const isChecked = target2.ariaChecked === "false";
    target2.ariaChecked = isChecked ? "true" : "false";
    if (!isChecked) {
      Host7.userMetrics.actionTaken(Host7.UserMetrics.Action.NetworkPanelServiceWorkerRespondWith);
    }
  };
  const throttledRequestTitle = input.wasThrottled ? i18nString12(UIStrings12.wasThrottled, {
    PH1: typeof input.wasThrottled.conditions.title === "string" ? input.wasThrottled.conditions.title : input.wasThrottled.conditions.title()
  }) : void 0;
  const classes = classMap({
    ["network-timing-table"]: true,
    ["resource-timing-table"]: true
  });
  const timeRangeGroups = [];
  for (const range of input.timeRanges) {
    if (range.name === "total") {
      continue;
    }
    const groupName = groupHeader(range.name);
    const tail = timeRangeGroups.at(-1);
    if (tail?.name !== groupName) {
      timeRangeGroups.push({ name: groupName, ranges: [range] });
    } else {
      tail.ranges.push(range);
    }
  }
  render5(
    // clang-format off
    html4`<style>${networkTimingTable_css_default}</style>
    <table
      class=${classes}
      jslog=${VisualLogging8.pane("timing").track({
      resize: true
    })}>
        <colgroup>
          <col class=labels></col>
          <col class=bars> </col>
          <col class=duration></col>
        </colgroup>
        <thead class=network-timing-start>
          <tr>
            <th scope=col>
              <span class=network-timing-hidden-header>${i18nString12(UIStrings12.label)}</span>
            </th>
            <th scope=col>
              <span class=network-timing-hidden-header>${i18nString12(UIStrings12.waterfall)}</span>
            </th>
            <th scope=col>
              <span class=network-timing-hidden-header>${i18nString12(UIStrings12.duration)}</span>
            </th>
          </tr>
          <tr>
            <td colspan = 3>
              ${i18nString12(UIStrings12.queuedAtS, { PH1: input.calculator.formatValue(input.requestIssueTime, 2) })}
            </td>
          </tr>
          <tr>
            <td colspan=3>
              ${i18nString12(UIStrings12.startedAtS, { PH1: input.calculator.formatValue(input.requestStartTime, 2) })}
            </td>
          </tr>
        </thead>
        ${timeRangeGroups.map((group) => html4`
          <tr class=network-timing-table-header>
            <td role=heading aria-level=2>
              ${group.name}
            </td>
            <td></td>
            <td>${i18nString12(UIStrings12.durationC)}</td>
          </tr>
          ${repeat(group.ranges, (range) => html4`
            <tr>
              ${isClickable(range) ? html4`<td
                  tabindex=0
                  role=switch
                  aria-checked=false
                  @click=${onActivate}
                  @keydown=${onActivate}
                  class=network-fetch-timing-bar-clickable>
                    ${timeRangeTitle(range.name)}
                </td>` : html4`<td>
                    ${timeRangeTitle(range.name)}
                </td>`}
              <td>
                <div
                  class=network-timing-row
                  aria-label=${i18nString12(UIStrings12.startedAtS, { PH1: input.calculator.formatValue(range.start, 2) })}>
                    <span
                      class="network-timing-bar ${range.name}"
                      data-left=${scale * (range.start - input.startTime)}
                      data-right=${scale * (input.endTime - range.end)}>${"\u200B"}</span>
                </div>
              </td>
              <td>
                <div class=network-timing-bar-title>
                  ${i18n23.TimeUtilities.secondsToString(range.end - range.start, true)}
                </div>
              </td>
            </tr>
            ${range.name === "serviceworker-respondwith" && input.fetchDetails ? html4`
              <tr class="network-fetch-timing-bar-details network-fetch-timing-bar-details-collapsed">
                ${input.fetchDetails.element}
              </tr>` : nothing3}
            ${range.name === "serviceworker-routerevaluation" && input.routerDetails ? html4`
              <tr class="router-evaluation-timing-bar-details network-fetch-timing-bar-details-collapsed">
                ${input.routerDetails.element}
              </tr>` : nothing3}
          `)}
        `)}
        ${input.requestUnfinished ? html4`
          <tr>
            <td class=caution colspan=3>
              ${i18nString12(UIStrings12.cautionRequestIsNotFinishedYet)}
            </td>
          </tr>` : nothing3}
       <tr class=network-timing-footer>
         <td colspan=1>
           <x-link
             href="https://developer.chrome.com/docs/devtools/network/reference/#timing-explanation"
             class=devtools-link
             jslog=${VisualLogging8.link().track({ click: true, keydown: "Enter|Space" }).context("explanation")}>
               ${i18nString12(UIStrings12.explanation)}
           </x-link>
         <td></td>
         <td class=${input.wasThrottled ? "throttled" : ""} title=${ifDefined(throttledRequestTitle)}>
           ${input.wasThrottled ? html4` <devtools-icon name=watch @click=${revealThrottled}></devtools-icon>` : nothing3}
           ${i18n23.TimeUtilities.secondsToString(input.totalDuration, true)}
         </td>
       </tr>
       <tr class=network-timing-table-header>
         <td colspan=3>
           <hr class=break />
         </td>
       </tr>
       <tr class=network-timing-table-header>
         <td>${i18nString12(UIStrings12.serverTiming)}</td>
         <td></td>
         <td>${i18nString12(UIStrings12.time)}</td>
       </tr>
       ${repeat(input.serverTimings.filter((item) => item.metric.toLowerCase() !== "total"), addServerTiming)}
       ${repeat(input.serverTimings.filter((item) => item.metric.toLowerCase() === "total"), addServerTiming)}
       ${input.serverTimings.length === 0 ? html4`
         <tr>
           <td colspan=3>
             ${uiI18n2.getFormatLocalizedString(str_12, UIStrings12.duringDevelopmentYouCanUseSToAdd, { PH1: UI13.XLink.XLink.create("https://web.dev/custom-metrics/#server-timing-api", i18nString12(UIStrings12.theServerTimingApi), void 0, void 0, "server-timing-api") })}
           </td>
         </tr>` : nothing3}
   </table>`,
    // clang-format on
    target
  );
};
var RequestTimingView = class _RequestTimingView extends UI13.Widget.VBox {
  #request;
  #calculator;
  #lastMinimumBoundary = -1;
  #view;
  constructor(target, view = DEFAULT_VIEW4) {
    super(target, { classes: ["resource-timing-view"] });
    this.#view = view;
  }
  static create(request, calculator) {
    const view = new _RequestTimingView();
    view.request = request;
    view.calculator = calculator;
    view.requestUpdate();
    return view;
  }
  performUpdate() {
    if (!this.#request || !this.#calculator) {
      return;
    }
    const timeRanges = NetworkTimeCalculator.calculateRequestTimeRanges(this.#request, this.#calculator.minimumBoundary());
    const startTime = timeRanges.map((r) => r.start).reduce((a, b) => Math.min(a, b));
    const endTime = timeRanges.map((r) => r.end).reduce((a, b) => Math.max(a, b));
    const total = timeRanges.findLast(
      (range) => range.name === "total"
      /* NetworkTimeCalculator.RequestTimeRangeNames.TOTAL */
    );
    const totalDuration = total ? total?.end - total?.start : 0;
    const conditions = SDK8.NetworkManager.MultitargetNetworkManager.instance().appliedRequestConditions(this.#request);
    const input = {
      startTime,
      endTime,
      totalDuration,
      serverTimings: this.#request.serverTimings ?? [],
      calculator: this.#calculator,
      requestStartTime: this.#request.startTime,
      requestIssueTime: this.#request.issueTime(),
      requestUnfinished: false,
      fetchDetails: this.#fetchDetailsTree(),
      routerDetails: this.#routerDetailsTree(),
      wasThrottled: conditions?.urlPattern ? conditions : void 0,
      timeRanges
    };
    this.#view(input, {}, this.contentElement);
  }
  onToggleFetchDetails(fetchDetailsElement, event) {
    if (!event.target) {
      return;
    }
    const target = event.target;
    if (target.classList.contains("network-fetch-timing-bar-clickable")) {
      const expanded = target.getAttribute("aria-checked") === "true";
      target.setAttribute("aria-checked", String(!expanded));
      fetchDetailsElement.classList.toggle("network-fetch-timing-bar-details-collapsed");
      fetchDetailsElement.classList.toggle("network-fetch-timing-bar-details-expanded");
    }
  }
  #fetchDetailsTree() {
    if (!this.#request?.fetchedViaServiceWorker) {
      return void 0;
    }
    const detailsView = new UI13.TreeOutline.TreeOutlineInShadow();
    const origRequest = Logs4.NetworkLog.NetworkLog.instance().originalRequestForURL(this.#request.url());
    if (origRequest) {
      const requestObject = SDK8.RemoteObject.RemoteObject.fromLocalObject(origRequest);
      const requestTreeElement = new ObjectUI2.ObjectPropertiesSection.RootElement(new ObjectUI2.ObjectPropertiesSection.ObjectTree(requestObject));
      requestTreeElement.title = i18nString12(UIStrings12.originalRequest);
      detailsView.appendChild(requestTreeElement);
    }
    const response = Logs4.NetworkLog.NetworkLog.instance().originalResponseForURL(this.#request.url());
    if (response) {
      const responseObject = SDK8.RemoteObject.RemoteObject.fromLocalObject(response);
      const responseTreeElement = new ObjectUI2.ObjectPropertiesSection.RootElement(new ObjectUI2.ObjectPropertiesSection.ObjectTree(responseObject));
      responseTreeElement.title = i18nString12(UIStrings12.responseReceived);
      detailsView.appendChild(responseTreeElement);
    }
    const serviceWorkerResponseSource = document.createElement("div");
    serviceWorkerResponseSource.classList.add("network-fetch-details-treeitem");
    let swResponseSourceString = i18nString12(UIStrings12.unknown);
    const swResponseSource = this.#request.serviceWorkerResponseSource();
    if (swResponseSource) {
      swResponseSourceString = getLocalizedResponseSourceForCode(swResponseSource);
    }
    serviceWorkerResponseSource.textContent = i18nString12(UIStrings12.sourceOfResponseS, { PH1: swResponseSourceString });
    const responseSourceTreeElement = new UI13.TreeOutline.TreeElement(serviceWorkerResponseSource);
    detailsView.appendChild(responseSourceTreeElement);
    const cacheNameElement = document.createElement("div");
    cacheNameElement.classList.add("network-fetch-details-treeitem");
    const responseCacheStorageName = this.#request.getResponseCacheStorageCacheName();
    if (responseCacheStorageName) {
      cacheNameElement.textContent = i18nString12(UIStrings12.cacheStorageCacheNameS, { PH1: responseCacheStorageName });
    } else {
      cacheNameElement.textContent = i18nString12(UIStrings12.cacheStorageCacheNameUnknown);
    }
    const cacheNameTreeElement = new UI13.TreeOutline.TreeElement(cacheNameElement);
    detailsView.appendChild(cacheNameTreeElement);
    const retrievalTime = this.#request.getResponseRetrievalTime();
    if (retrievalTime) {
      const responseTimeElement = document.createElement("div");
      responseTimeElement.classList.add("network-fetch-details-treeitem");
      responseTimeElement.textContent = i18nString12(UIStrings12.retrievalTimeS, { PH1: retrievalTime.toString() });
      const responseTimeTreeElement = new UI13.TreeOutline.TreeElement(responseTimeElement);
      detailsView.appendChild(responseTimeTreeElement);
    }
    return detailsView;
  }
  #routerDetailsTree() {
    if (!this.#request?.serviceWorkerRouterInfo) {
      return void 0;
    }
    const detailsView = new UI13.TreeOutline.TreeOutlineInShadow();
    const { serviceWorkerRouterInfo } = this.#request;
    if (!serviceWorkerRouterInfo) {
      return;
    }
    const matchedSourceTypeElement = document.createElement("div");
    matchedSourceTypeElement.classList.add("network-fetch-details-treeitem");
    const matchedSourceType = serviceWorkerRouterInfo.matchedSourceType;
    const matchedSourceTypeString = String(matchedSourceType) || i18nString12(UIStrings12.unknown);
    matchedSourceTypeElement.textContent = i18nString12(UIStrings12.routerMatchedSource, { PH1: matchedSourceTypeString });
    const matchedSourceTypeTreeElement = new UI13.TreeOutline.TreeElement(matchedSourceTypeElement);
    detailsView.appendChild(matchedSourceTypeTreeElement);
    const actualSourceTypeElement = document.createElement("div");
    actualSourceTypeElement.classList.add("network-fetch-details-treeitem");
    const actualSourceType = serviceWorkerRouterInfo.actualSourceType;
    const actualSourceTypeString = String(actualSourceType) || i18nString12(UIStrings12.unknown);
    actualSourceTypeElement.textContent = i18nString12(UIStrings12.routerActualSource, { PH1: actualSourceTypeString });
    const actualSourceTypeTreeElement = new UI13.TreeOutline.TreeElement(actualSourceTypeElement);
    detailsView.appendChild(actualSourceTypeTreeElement);
    return detailsView;
  }
  set request(request) {
    this.#request = request;
    if (this.isShowing()) {
      this.#request.addEventListener(SDK8.NetworkRequest.Events.TIMING_CHANGED, this.requestUpdate, this);
      this.#request.addEventListener(SDK8.NetworkRequest.Events.FINISHED_LOADING, this.requestUpdate, this);
      this.requestUpdate();
    }
  }
  set calculator(calculator) {
    this.#calculator = calculator;
    if (this.isShowing()) {
      this.#calculator.addEventListener("BoundariesChanged", this.boundaryChanged, this);
      this.requestUpdate();
    }
  }
  wasShown() {
    super.wasShown();
    this.#request?.addEventListener(SDK8.NetworkRequest.Events.TIMING_CHANGED, this.requestUpdate, this);
    this.#request?.addEventListener(SDK8.NetworkRequest.Events.FINISHED_LOADING, this.requestUpdate, this);
    this.#calculator?.addEventListener("BoundariesChanged", this.boundaryChanged, this);
    this.requestUpdate();
  }
  willHide() {
    super.willHide();
    this.#request?.removeEventListener(SDK8.NetworkRequest.Events.TIMING_CHANGED, this.requestUpdate, this);
    this.#request?.removeEventListener(SDK8.NetworkRequest.Events.FINISHED_LOADING, this.requestUpdate, this);
    this.#calculator?.removeEventListener("BoundariesChanged", this.boundaryChanged, this);
  }
  boundaryChanged() {
    const minimumBoundary = this.calculator.minimumBoundary();
    if (minimumBoundary !== this.#lastMinimumBoundary) {
      this.#lastMinimumBoundary = minimumBoundary;
      this.requestUpdate();
    }
  }
};

// gen/front_end/panels/network/ResourceDirectSocketChunkView.js
var ResourceDirectSocketChunkView_exports = {};
__export(ResourceDirectSocketChunkView_exports, {
  ResourceDirectSocketChunkView: () => ResourceDirectSocketChunkView
});
import * as Common10 from "./../../core/common/common.js";
import * as i18n27 from "./../../core/i18n/i18n.js";
import * as Platform6 from "./../../core/platform/platform.js";
import * as SDK9 from "./../../core/sdk/sdk.js";
import * as TextUtils5 from "./../../models/text_utils/text_utils.js";
import * as DataGrid6 from "./../../ui/legacy/components/data_grid/data_grid.js";
import * as UI15 from "./../../ui/legacy/legacy.js";
import * as VisualLogging9 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/network/ResourceChunkView.js
import * as Common9 from "./../../core/common/common.js";
import * as Host8 from "./../../core/host/host.js";
import * as i18n25 from "./../../core/i18n/i18n.js";
import * as Platform5 from "./../../core/platform/platform.js";
import * as TextUtils4 from "./../../models/text_utils/text_utils.js";
import * as DataGrid4 from "./../../ui/legacy/components/data_grid/data_grid.js";
import * as SourceFrame4 from "./../../ui/legacy/components/source_frame/source_frame.js";
import * as UI14 from "./../../ui/legacy/legacy.js";

// gen/front_end/panels/network/resourceChunkView.css.js
var resourceChunkView_css_default = `/*
 * Copyright 2014 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.resource-chunk-view {
  user-select: text;
}

.resource-chunk-view .data-grid {
  flex: auto;
  border: none;

  & tr {
    &.resource-chunk-view-row-send td:first-child::before {
      content: "\\2B06";
      color: var(--sys-color-tertiary);
      padding-right: 4px;
    }

    &.resource-chunk-view-row-receive td:first-child::before {
      content: "\\2B07";
      color: var(--sys-color-error);
      padding-right: 4px;
    }

    &.resource-chunk-view-row-send {
      background-color: color-mix(in srgb, var(--sys-color-tertiary-container), transparent 50%);
    }

    &.resource-chunk-view-row-error {
      background-color: var(--sys-color-surface-error);
      color: var(--sys-color-on-surface-error);
    }
  }
}

.resource-chunk-view .data-grid .data {
  background-image: none;
}

.resource-chunk-view devtools-toolbar {
  border-bottom: 1px solid var(--sys-color-divider);
}

/*# sourceURL=${import.meta.resolve("./resourceChunkView.css")} */`;

// gen/front_end/panels/network/ResourceChunkView.js
var UIStrings13 = {
  /**
   * @description Text in Event Source Messages View of the Network panel
   */
  data: "Data",
  /**
   * @description Text in Messages View of the Network panel
   */
  length: "Length",
  /**
   * @description Text that refers to the time
   */
  time: "Time",
  /**
   * @description Text to clear everything
   */
  clearAll: "Clear All",
  /**
   * @description Text to filter result items
   */
  filter: "Filter",
  /**
   * @description Text in Messages View of the Network panel that shows if no message is selected for viewing its content
   */
  noMessageSelected: "No message selected",
  /**
   * @description Text in Messages View of the Network panel
   */
  selectMessageToBrowseItsContent: "Select message to browse its content.",
  /**
   * @description Text in Messages View of the Network panel
   */
  copyMessageD: "Copy message\u2026",
  /**
   * @description A context menu item in the Messages View of the Network panel
   */
  copyMessage: "Copy message",
  /**
   * @description Text to clear everything
   */
  clearAllL: "Clear all",
  /**
   * @description Text for everything
   */
  all: "All",
  /**
   * @description Text in Messages View of the Network panel
   */
  send: "Send",
  /**
   * @description Text in Messages View of the Network panel
   */
  receive: "Receive"
};
var str_13 = i18n25.i18n.registerUIStrings("panels/network/ResourceChunkView.ts", UIStrings13);
var i18nString13 = i18n25.i18n.getLocalizedString.bind(void 0, str_13);
var i18nLazyString = i18n25.i18n.getLazilyComputedLocalizedString.bind(void 0, str_13);
var ResourceChunkView = class extends UI14.Widget.VBox {
  splitWidget;
  dataGrid;
  timeComparator;
  mainToolbar;
  clearAllButton;
  filterTypeCombobox;
  filterType;
  filterTextInput;
  filterRegex;
  frameEmptyWidget;
  currentSelectedNode;
  request;
  messageFilterSetting;
  constructor(request, messageFilterSettingKey, splitWidgetSettingKey, dataGridDisplayName, filterUsingRegexHint) {
    super();
    this.messageFilterSetting = Common9.Settings.Settings.instance().createSetting(messageFilterSettingKey, "");
    this.registerRequiredCSS(resourceChunkView_css_default);
    this.request = request;
    this.element.classList.add("resource-chunk-view");
    this.splitWidget = new UI14.SplitWidget.SplitWidget(false, true, splitWidgetSettingKey);
    this.splitWidget.show(this.element);
    const columns = this.getColumns();
    this.dataGrid = new DataGrid4.SortableDataGrid.SortableDataGrid({
      displayName: dataGridDisplayName,
      columns,
      deleteCallback: void 0,
      refreshCallback: void 0
    });
    this.dataGrid.setRowContextMenuCallback(onRowContextMenu.bind(this));
    this.dataGrid.setEnableAutoScrollToBottom(true);
    this.dataGrid.setCellClass("resource-chunk-view-td");
    this.timeComparator = resourceChunkNodeTimeComparator;
    this.dataGrid.sortNodes(this.timeComparator, false);
    this.dataGrid.markColumnAsSortedBy("time", DataGrid4.DataGrid.Order.Ascending);
    this.dataGrid.addEventListener("SortingChanged", this.sortItems, this);
    this.dataGrid.setName(splitWidgetSettingKey + "_datagrid");
    this.dataGrid.addEventListener("SelectedNode", (event) => {
      void this.onChunkSelected(event);
    }, this);
    this.dataGrid.addEventListener("DeselectedNode", this.onChunkDeselected, this);
    this.mainToolbar = document.createElement("devtools-toolbar");
    this.clearAllButton = new UI14.Toolbar.ToolbarButton(i18nString13(UIStrings13.clearAll), "clear");
    this.clearAllButton.addEventListener("Click", this.clearChunks, this);
    this.mainToolbar.appendToolbarItem(this.clearAllButton);
    this.filterTypeCombobox = new UI14.Toolbar.ToolbarComboBox(this.updateFilterSetting.bind(this), i18nString13(UIStrings13.filter));
    for (const filterItem of FILTER_TYPES) {
      const option = this.filterTypeCombobox.createOption(filterItem.label(), filterItem.name);
      this.filterTypeCombobox.addOption(option);
    }
    this.mainToolbar.appendToolbarItem(this.filterTypeCombobox);
    this.filterType = null;
    this.filterTextInput = new UI14.Toolbar.ToolbarFilter(filterUsingRegexHint, 0.4);
    this.filterTextInput.addEventListener("TextChanged", this.updateFilterSetting, this);
    const filter = this.messageFilterSetting.get();
    if (filter) {
      this.filterTextInput.setValue(filter);
    }
    this.filterRegex = null;
    this.mainToolbar.appendToolbarItem(this.filterTextInput);
    const mainContainer = new UI14.Widget.VBox();
    mainContainer.element.appendChild(this.mainToolbar);
    this.dataGrid.asWidget().show(mainContainer.element);
    mainContainer.setMinimumSize(0, 72);
    this.splitWidget.setMainWidget(mainContainer);
    this.frameEmptyWidget = new UI14.EmptyWidget.EmptyWidget(i18nString13(UIStrings13.noMessageSelected), i18nString13(UIStrings13.selectMessageToBrowseItsContent));
    this.splitWidget.setSidebarWidget(this.frameEmptyWidget);
    if (filter) {
      this.applyFilter(filter);
    }
    function onRowContextMenu(contextMenu, genericNode) {
      const node = genericNode;
      const binaryView = node.binaryView();
      if (binaryView) {
        binaryView.addCopyToContextMenu(contextMenu, i18nString13(UIStrings13.copyMessageD));
      } else {
        contextMenu.clipboardSection().appendItem(i18nString13(UIStrings13.copyMessage), Host8.InspectorFrontendHost.InspectorFrontendHostInstance.copyText.bind(Host8.InspectorFrontendHost.InspectorFrontendHostInstance, node.data.data), { jslogContext: "copy" });
      }
      contextMenu.footerSection().appendItem(i18nString13(UIStrings13.clearAllL), this.clearChunks.bind(this), { jslogContext: "clear-all" });
    }
  }
  getColumns() {
    return [
      { id: "data", title: i18nString13(UIStrings13.data), sortable: false, weight: 88 },
      {
        id: "length",
        title: i18nString13(UIStrings13.length),
        sortable: false,
        align: "right",
        weight: 5
      },
      { id: "time", title: i18nString13(UIStrings13.time), sortable: true, weight: 7 }
    ];
  }
  chunkAdded(chunk) {
    if (!this.chunkFilter(chunk)) {
      return;
    }
    this.dataGrid.insertChild(this.createGridItem(chunk));
  }
  clearChunks() {
    clearChunkOffsets.set(this.request, this.getRequestChunks().length);
    this.refresh();
  }
  updateFilterSetting() {
    const text = this.filterTextInput.value();
    this.messageFilterSetting.set(text);
    this.applyFilter(text);
  }
  applyFilter(text) {
    const type = this.filterTypeCombobox.selectedOption().value;
    if (text) {
      try {
        this.filterRegex = new RegExp(text, "i");
      } catch {
        this.filterRegex = new RegExp(Platform5.StringUtilities.escapeForRegExp(text), "i");
      }
    } else {
      this.filterRegex = null;
    }
    this.filterType = type === "all" ? null : type;
    this.refresh();
  }
  async onChunkSelected(event) {
    this.currentSelectedNode = event.data;
    const content = this.currentSelectedNode.dataText();
    const binaryView = this.currentSelectedNode.binaryView();
    if (binaryView) {
      this.splitWidget.setSidebarWidget(binaryView);
      return;
    }
    const jsonView = await SourceFrame4.JSONView.JSONView.createView(content);
    if (jsonView) {
      this.splitWidget.setSidebarWidget(jsonView);
      return;
    }
    this.splitWidget.setSidebarWidget(new SourceFrame4.ResourceSourceFrame.ResourceSourceFrame(TextUtils4.StaticContentProvider.StaticContentProvider.fromString(this.request.url(), this.request.resourceType(), content), ""));
  }
  onChunkDeselected() {
    this.currentSelectedNode = null;
    this.splitWidget.setSidebarWidget(this.frameEmptyWidget);
  }
  refresh() {
    this.dataGrid.rootNode().removeChildren();
    let chunks = this.getRequestChunks();
    const offset = clearChunkOffsets.get(this.request) || 0;
    chunks = chunks.slice(offset);
    chunks = chunks.filter(this.chunkFilter.bind(this));
    chunks.forEach((chunk) => this.dataGrid.insertChild(this.createGridItem(chunk)));
  }
  sortItems() {
    this.dataGrid.sortNodes(this.timeComparator, !this.dataGrid.isSortOrderAscending());
  }
  getDataGridForTest() {
    return this.dataGrid;
  }
  getSplitWidgetForTest() {
    return this.splitWidget;
  }
  getFilterInputForTest() {
    return this.filterTextInput;
  }
  getClearAllButtonForTest() {
    return this.clearAllButton;
  }
  getFilterTypeComboboxForTest() {
    return this.filterTypeCombobox;
  }
};
var FILTER_TYPES = [
  { name: "all", label: i18nLazyString(UIStrings13.all), jslogContext: "all" },
  { name: "send", label: i18nLazyString(UIStrings13.send), jslogContext: "send" },
  { name: "receive", label: i18nLazyString(UIStrings13.receive), jslogContext: "receive" }
];
var DataGridItem = class extends DataGrid4.SortableDataGrid.SortableDataGridNode {
};
function resourceChunkNodeTimeComparator(a, b) {
  return a.getTime() - b.getTime();
}
var clearChunkOffsets = /* @__PURE__ */ new WeakMap();

// gen/front_end/panels/network/ResourceDirectSocketChunkView.js
var UIStrings14 = {
  /**
   * @description Text in Event Source Messages View of the Network panel
   */
  data: "Data",
  /**
   * @description Text in Messages View of the Network panel
   */
  length: "Length",
  /**
   * @description Text that refers to the time
   */
  time: "Time",
  /**
   * @description Text in Messages View of the Network panel
   */
  address: "Address",
  /**
   * @description Text in Messages View of the Network panel
   */
  port: "Port",
  /**
   * @description Data grid name for Direct Socket Chunk data grids
   */
  directSocketChunk: "Direct Socket Chunk",
  /**
   * @description Example for placeholder text. Note: "(direct)?socket)" is an example code and should not be translated.
   */
  filterUsingRegex: "Filter using regex (example: `(direct)?socket)`"
};
var str_14 = i18n27.i18n.registerUIStrings("panels/network/ResourceDirectSocketChunkView.ts", UIStrings14);
var i18nString14 = i18n27.i18n.getLocalizedString.bind(void 0, str_14);
var ResourceDirectSocketChunkView = class extends ResourceChunkView {
  constructor(request) {
    super(request, "network-direct-socket-chunk-filter", "resource-direct-socket-chunk-split-view-state", i18nString14(UIStrings14.directSocketChunk), i18nString14(UIStrings14.filterUsingRegex));
    this.element.setAttribute("jslog", `${VisualLogging9.pane("direct-socket-messages").track({ resize: true })}`);
  }
  getRequestChunks() {
    return this.request.directSocketChunks();
  }
  chunkFilter(chunk) {
    if (this.filterType && chunk.type !== this.filterType) {
      return false;
    }
    return !this.filterRegex || this.filterRegex.test(chunk.data);
  }
  createGridItem(chunk) {
    return new ResourceChunkNode(chunk, this.request.directSocketInfo?.type === SDK9.NetworkRequest.DirectSocketType.UDP_BOUND);
  }
  wasShown() {
    super.wasShown();
    this.refresh();
    this.request.addEventListener(SDK9.NetworkRequest.Events.DIRECTSOCKET_CHUNK_ADDED, this.onDirectSocketChunkAdded, this);
  }
  willHide() {
    super.willHide();
    this.request.removeEventListener(SDK9.NetworkRequest.Events.DIRECTSOCKET_CHUNK_ADDED, this.onDirectSocketChunkAdded, this);
  }
  onDirectSocketChunkAdded(event) {
    this.chunkAdded(event.data);
  }
  getColumns() {
    if (this.request.directSocketInfo?.type === SDK9.NetworkRequest.DirectSocketType.UDP_BOUND) {
      return [
        {
          id: "data",
          title: i18nString14(UIStrings14.data),
          sortable: false,
          weight: 63
        },
        {
          id: "address",
          title: i18nString14(UIStrings14.address),
          sortable: false,
          align: "right",
          weight: 15
        },
        {
          id: "port",
          title: i18nString14(UIStrings14.port),
          sortable: false,
          align: "right",
          weight: 10
        },
        {
          id: "length",
          title: i18nString14(UIStrings14.length),
          sortable: false,
          align: "right",
          weight: 5
        },
        {
          id: "time",
          title: i18nString14(UIStrings14.time),
          sortable: true,
          weight: 7
        }
      ];
    }
    return super.getColumns();
  }
};
var ResourceChunkNode = class extends DataGridItem {
  #binaryView = null;
  chunk;
  constructor(chunk, boundSocket) {
    const time = new Date(chunk.timestamp * 1e3);
    const timeText = ("0" + time.getHours()).substr(-2) + ":" + ("0" + time.getMinutes()).substr(-2) + ":" + ("0" + time.getSeconds()).substr(-2) + "." + ("00" + time.getMilliseconds()).substr(-3);
    const timeNode = document.createElement("div");
    UI15.UIUtils.createTextChild(timeNode, timeText);
    UI15.Tooltip.Tooltip.install(timeNode, time.toLocaleString());
    let description;
    const length = i18n27.ByteUtilities.bytesToString(Platform6.StringUtilities.base64ToSize(chunk.data));
    const maxDisplayLen = 30;
    if (chunk.data.length > maxDisplayLen) {
      description = chunk.data.substring(0, maxDisplayLen) + "\u2026";
    } else {
      description = chunk.data;
    }
    if (boundSocket) {
      super({ data: description, address: chunk.remoteAddress, port: chunk.remotePort, length, time: timeNode });
    } else {
      super({ data: description, length, time: timeNode });
    }
    this.chunk = chunk;
  }
  createCells(element) {
    element.classList.toggle("resource-chunk-view-row-send", this.chunk.type === SDK9.NetworkRequest.DirectSocketChunkType.SEND);
    element.classList.toggle("resource-chunk-view-row-receive", this.chunk.type === SDK9.NetworkRequest.DirectSocketChunkType.RECEIVE);
    super.createCells(element);
  }
  nodeSelfHeight() {
    return 21;
  }
  dataText() {
    return this.chunk.data;
  }
  binaryView() {
    if (!this.#binaryView) {
      if (this.dataText().length > 0) {
        this.#binaryView = new BinaryResourceView(TextUtils5.StreamingContentData.StreamingContentData.from(new TextUtils5.ContentData.ContentData(this.dataText(), true, "application/octet-stream")), Platform6.DevToolsPath.EmptyUrlString, Common10.ResourceType.resourceTypes.DirectSocket);
      }
    }
    return this.#binaryView;
  }
  getTime() {
    return this.chunk.timestamp;
  }
};

// gen/front_end/panels/network/ResourceWebSocketFrameView.js
var ResourceWebSocketFrameView_exports = {};
__export(ResourceWebSocketFrameView_exports, {
  ResourceWebSocketFrameView: () => ResourceWebSocketFrameView
});
import * as Common11 from "./../../core/common/common.js";
import * as i18n29 from "./../../core/i18n/i18n.js";
import * as Platform7 from "./../../core/platform/platform.js";
import * as SDK10 from "./../../core/sdk/sdk.js";
import * as TextUtils6 from "./../../models/text_utils/text_utils.js";
import * as UI16 from "./../../ui/legacy/legacy.js";
import * as VisualLogging10 from "./../../ui/visual_logging/visual_logging.js";
var UIStrings15 = {
  /**
   * @description Text in Resource Web Socket Frame View of the Network panel. Displays which Opcode
   * is relevant to a particular operation. 'mask' indicates that the Opcode used a mask, which is a
   * way of modifying a value by overlaying another value on top of it, partially covering/changing
   * it, hence 'masking' it.
   * https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers
   * @example {Localized name of the Opcode} PH1
   * @example {0} PH2
   */
  sOpcodeSMask: "{PH1} (Opcode {PH2}, mask)",
  /**
   * @description Text in Resource Web Socket Frame View of the Network panel. Displays which Opcode
   * is relevant to a particular operation.
   * @example {Localized name of the Opcode} PH1
   * @example {0} PH2
   */
  sOpcodeS: "{PH1} (Opcode {PH2})",
  /**
   * @description Op codes continuation frame of map in Resource Web Socket Frame View of the Network panel
   */
  continuationFrame: "Continuation Frame",
  /**
   * @description Op codes text frame of map in Resource Web Socket Frame View of the Network panel
   */
  textMessage: "Text Message",
  /**
   * @description Op codes binary frame of map in Resource Web Socket Frame View of the Network panel
   */
  binaryMessage: "Binary Message",
  /**
   * @description Op codes continuation frame of map in Resource Web Socket Frame View of the Network panel indicating that the web socket connection has been closed.
   */
  connectionCloseMessage: "Connection Close Message",
  /**
   * @description Op codes ping frame of map in Resource Web Socket Frame View of the Network panel
   */
  pingMessage: "Ping Message",
  /**
   * @description Op codes pong frame of map in Resource Web Socket Frame View of the Network panel
   */
  pongMessage: "Pong Message",
  /**
   * @description Data grid name for Web Socket Frame data grids
   */
  webSocketFrame: "Web Socket Frame",
  /**
   * @description Text for something not available
   */
  na: "N/A",
  /**
   * @description Example for placeholder text
   */
  filterUsingRegex: "Filter using regex (example: (web)?socket)"
};
var str_15 = i18n29.i18n.registerUIStrings("panels/network/ResourceWebSocketFrameView.ts", UIStrings15);
var i18nString15 = i18n29.i18n.getLocalizedString.bind(void 0, str_15);
var i18nLazyString2 = i18n29.i18n.getLazilyComputedLocalizedString.bind(void 0, str_15);
var ResourceWebSocketFrameView = class extends ResourceChunkView {
  constructor(request) {
    super(request, "network-web-socket-message-filter", "resource-web-socket-frame-split-view-state", i18nString15(UIStrings15.webSocketFrame), i18nString15(UIStrings15.filterUsingRegex));
    this.element.setAttribute("jslog", `${VisualLogging10.pane("web-socket-messages").track({ resize: true })}`);
  }
  getRequestChunks() {
    return this.request.frames();
  }
  createGridItem(frame) {
    return new ResourceFrameNode(frame);
  }
  chunkFilter(frame) {
    if (this.filterType && frame.type !== this.filterType) {
      return false;
    }
    return !this.filterRegex || this.filterRegex.test(frame.text);
  }
  wasShown() {
    super.wasShown();
    this.refresh();
    this.request.addEventListener(SDK10.NetworkRequest.Events.WEBSOCKET_FRAME_ADDED, this.onWebSocketFrameAdded, this);
  }
  willHide() {
    super.willHide();
    this.request.removeEventListener(SDK10.NetworkRequest.Events.WEBSOCKET_FRAME_ADDED, this.onWebSocketFrameAdded, this);
  }
  onWebSocketFrameAdded(event) {
    this.chunkAdded(event.data);
  }
  static opCodeDescription(opCode, mask) {
    const localizedDescription = opCodeDescriptions[opCode] || (() => "");
    if (mask) {
      return i18nString15(UIStrings15.sOpcodeSMask, { PH1: localizedDescription(), PH2: opCode });
    }
    return i18nString15(UIStrings15.sOpcodeS, { PH1: localizedDescription(), PH2: opCode });
  }
};
var opCodeDescriptions = function() {
  const map = [];
  map[
    0
    /* OpCodes.CONTINUATION_FRAME */
  ] = i18nLazyString2(UIStrings15.continuationFrame);
  map[
    1
    /* OpCodes.TEXT_FRAME */
  ] = i18nLazyString2(UIStrings15.textMessage);
  map[
    2
    /* OpCodes.BINARY_FRAME */
  ] = i18nLazyString2(UIStrings15.binaryMessage);
  map[
    8
    /* OpCodes.CONNECTION_CLOSE_FRAME */
  ] = i18nLazyString2(UIStrings15.connectionCloseMessage);
  map[
    9
    /* OpCodes.PING_FRAME */
  ] = i18nLazyString2(UIStrings15.pingMessage);
  map[
    10
    /* OpCodes.PONG_FRAME */
  ] = i18nLazyString2(UIStrings15.pongMessage);
  return map;
}();
var ResourceFrameNode = class extends DataGridItem {
  frame;
  isTextFrame;
  #dataText;
  #binaryView;
  constructor(frame) {
    let length = String(frame.text.length);
    const time = new Date(frame.time * 1e3);
    const timeText = ("0" + time.getHours()).substr(-2) + ":" + ("0" + time.getMinutes()).substr(-2) + ":" + ("0" + time.getSeconds()).substr(-2) + "." + ("00" + time.getMilliseconds()).substr(-3);
    const timeNode = document.createElement("div");
    UI16.UIUtils.createTextChild(timeNode, timeText);
    UI16.Tooltip.Tooltip.install(timeNode, time.toLocaleString());
    let dataText = frame.text;
    let description = ResourceWebSocketFrameView.opCodeDescription(frame.opCode, frame.mask);
    const isTextFrame = frame.opCode === 1;
    if (frame.type === SDK10.NetworkRequest.WebSocketFrameType.Error) {
      description = dataText;
      length = i18nString15(UIStrings15.na);
    } else if (isTextFrame) {
      description = dataText;
    } else if (frame.opCode === 2) {
      length = i18n29.ByteUtilities.bytesToString(Platform7.StringUtilities.base64ToSize(frame.text));
      description = opCodeDescriptions[frame.opCode]();
    } else {
      dataText = description;
    }
    super({ data: description, length, time: timeNode });
    this.frame = frame;
    this.isTextFrame = isTextFrame;
    this.#dataText = dataText;
    this.#binaryView = null;
  }
  createCells(element) {
    element.classList.toggle("resource-chunk-view-row-error", this.frame.type === SDK10.NetworkRequest.WebSocketFrameType.Error);
    element.classList.toggle("resource-chunk-view-row-send", this.frame.type === SDK10.NetworkRequest.WebSocketFrameType.Send);
    element.classList.toggle("resource-chunk-view-row-receive", this.frame.type === SDK10.NetworkRequest.WebSocketFrameType.Receive);
    super.createCells(element);
  }
  nodeSelfHeight() {
    return 21;
  }
  dataText() {
    return this.#dataText;
  }
  binaryView() {
    if (this.isTextFrame || this.frame.type === SDK10.NetworkRequest.WebSocketFrameType.Error) {
      return null;
    }
    if (!this.#binaryView) {
      if (this.#dataText.length > 0) {
        this.#binaryView = new BinaryResourceView(TextUtils6.StreamingContentData.StreamingContentData.from(new TextUtils6.ContentData.ContentData(this.#dataText, true, "applicaiton/octet-stream")), Platform7.DevToolsPath.EmptyUrlString, Common11.ResourceType.resourceTypes.WebSocket);
      }
    }
    return this.#binaryView;
  }
  getTime() {
    return this.frame.time;
  }
};

// gen/front_end/panels/network/NetworkItemView.js
var UIStrings16 = {
  /**
   * @description Text for network request headers
   */
  headers: "Headers",
  /**
   * @description Text for network connection info. In case the request is not made over http.
   */
  connectionInfo: "Connection Info",
  /**
   * @description Text in Network Item View of the Network panel
   */
  payload: "Payload",
  /**
   * @description Text in Network Item View of the Network panel
   */
  messages: "Messages",
  /**
   * @description Text in Network Item View of the Network panel
   */
  websocketMessages: "WebSocket messages",
  /**
   * @description Text in Network Item View of the Network panel
   */
  directsocketMessages: "DirectSocket messages",
  /**
   * @description Text in Network Item View of the Network panel
   */
  eventstream: "EventStream",
  /**
   * @description Text for previewing items
   */
  preview: "Preview",
  /**
   * @description Text in Network Item View of the Network panel
   */
  responsePreview: "Response preview",
  /**
   * @description Icon title in Network Item View of the Network panel
   */
  signedexchangeError: "SignedExchange error",
  /**
   * @description Title of a tab in the Network panel. A Network response refers to the act of acknowledging a
   * network request. Should not be confused with answer.
   */
  response: "Response",
  /**
   * @description Text in Network Item View of the Network panel
   */
  rawResponseData: "Raw response data",
  /**
   * @description Text for the initiator of something
   */
  initiator: "Initiator",
  /**
   * @description Tooltip for initiator view in Network panel. An initiator is a piece of code/entity
   * in the code that initiated/started the network request, i.e. caused the network request. The 'call
   * stack' is the location in the code where the initiation happened.
   */
  requestInitiatorCallStack: "Request initiator call stack",
  /**
   * @description Title of a tab in Network Item View of the Network panel.
   *The tab displays the duration breakdown of a network request.
   */
  timing: "Timing",
  /**
   * @description Text in Network Item View of the Network panel
   */
  requestAndResponseTimeline: "Request and response timeline",
  /**
   * @description Tooltip to explain the warning icon of the Cookies panel
   */
  thirdPartyPhaseout: "Cookies blocked due to third-party cookie phaseout.",
  /**
   * @description Label of a tab in the network panel. Previously known as 'Trust Tokens'.
   */
  trustTokens: "Private state tokens",
  /**
   * @description Title of the Private State Token tab in the Network panel. Previously known as 'Trust Token tab'.
   */
  trustTokenOperationDetails: "Private State Token operation details",
  /**
   * @description Text for web cookies
   */
  cookies: "Cookies",
  /**
   * @description Text in Network Item View of the Network panel
   */
  requestAndResponseCookies: "Request and response cookies",
  /**
   * @description Tooltip text explaining that DevTools has overridden the response's headers
   */
  containsOverriddenHeaders: "This response contains headers which are overridden by DevTools",
  /**
   * @description Tooltip text explaining that DevTools has overridden the response
   */
  responseIsOverridden: "This response is overridden by DevTools"
};
var str_16 = i18n31.i18n.registerUIStrings("panels/network/NetworkItemView.ts", UIStrings16);
var i18nString16 = i18n31.i18n.getLocalizedString.bind(void 0, str_16);
var requestToResponseView = /* @__PURE__ */ new WeakMap();
var requestToPreviewView = /* @__PURE__ */ new WeakMap();
var NetworkItemView = class extends UI17.TabbedPane.TabbedPane {
  #request;
  #resourceViewTabSetting;
  #headersViewComponent;
  #payloadView = null;
  #responseView;
  #cookiesView = null;
  #initialTab;
  #firstTab;
  constructor(request, calculator, initialTab) {
    super();
    this.#request = request;
    this.element.classList.add("network-item-view");
    this.headerElement().setAttribute("jslog", `${VisualLogging11.toolbar("request-details").track({
      keydown: "ArrowUp|ArrowLeft|ArrowDown|ArrowRight|Enter|Space"
    })}`);
    if (request.resourceType() === Common12.ResourceType.resourceTypes.DirectSocket) {
      this.#firstTab = "direct-socket-connection";
      this.appendTab("direct-socket-connection", i18nString16(UIStrings16.connectionInfo), new NetworkComponents.DirectSocketConnectionView.DirectSocketConnectionView(request), i18nString16(UIStrings16.headers));
    } else {
      this.#firstTab = "headers-component";
      this.#headersViewComponent = new NetworkComponents.RequestHeadersView.RequestHeadersView(request);
      this.appendTab("headers-component", i18nString16(UIStrings16.headers), LegacyWrapper.LegacyWrapper.legacyWrapper(UI17.Widget.VBox, this.#headersViewComponent), i18nString16(UIStrings16.headers));
    }
    this.#resourceViewTabSetting = Common12.Settings.Settings.instance().createSetting("resource-view-tab", this.#firstTab);
    if (this.#request.hasOverriddenHeaders()) {
      const statusDot = document.createElement("div");
      statusDot.className = "status-dot";
      statusDot.title = i18nString16(UIStrings16.containsOverriddenHeaders);
      this.setSuffixElement("headers-component", statusDot);
    }
    void this.maybeAppendPayloadPanel();
    this.addEventListener(UI17.TabbedPane.Events.TabSelected, this.tabSelected, this);
    if (request.resourceType() === Common12.ResourceType.resourceTypes.WebSocket) {
      const frameView = new ResourceWebSocketFrameView(request);
      this.appendTab("web-socket-frames", i18nString16(UIStrings16.messages), frameView, i18nString16(UIStrings16.websocketMessages));
    } else if (request.resourceType() === Common12.ResourceType.resourceTypes.DirectSocket) {
      this.appendTab("direct-socket-chunks", i18nString16(UIStrings16.messages), new ResourceDirectSocketChunkView(request), i18nString16(UIStrings16.directsocketMessages));
    } else if (request.mimeType === "text/event-stream") {
      this.appendTab("eventSource", i18nString16(UIStrings16.eventstream), new EventSourceMessagesView(request));
      this.#responseView = requestToResponseView.get(request) ?? new RequestResponseView(request);
      requestToResponseView.set(request, this.#responseView);
      this.appendTab("response", i18nString16(UIStrings16.response), this.#responseView, i18nString16(UIStrings16.rawResponseData));
    } else {
      this.#responseView = requestToResponseView.get(request) ?? new RequestResponseView(request);
      requestToResponseView.set(request, this.#responseView);
      const previewView = requestToPreviewView.get(request) ?? new RequestPreviewView(request);
      requestToPreviewView.set(request, previewView);
      this.appendTab("preview", i18nString16(UIStrings16.preview), previewView, i18nString16(UIStrings16.responsePreview));
      const signedExchangeInfo = request.signedExchangeInfo();
      if (signedExchangeInfo?.errors?.length) {
        const icon = new IconButton4.Icon.Icon();
        icon.name = "cross-circle-filled";
        icon.classList.add("small");
        UI17.Tooltip.Tooltip.install(icon, i18nString16(UIStrings16.signedexchangeError));
        this.setTabIcon("preview", icon);
      }
      this.appendTab("response", i18nString16(UIStrings16.response), this.#responseView, i18nString16(UIStrings16.rawResponseData));
      if (this.#request.hasOverriddenContent) {
        const statusDot = document.createElement("div");
        statusDot.className = "status-dot";
        statusDot.title = i18nString16(UIStrings16.responseIsOverridden);
        this.setSuffixElement("response", statusDot);
      }
    }
    this.appendTab("initiator", i18nString16(UIStrings16.initiator), new RequestInitiatorView(request), i18nString16(UIStrings16.requestInitiatorCallStack));
    this.appendTab("timing", i18nString16(UIStrings16.timing), RequestTimingView.create(request, calculator), i18nString16(UIStrings16.requestAndResponseTimeline));
    if (request.trustTokenParams()) {
      this.appendTab("trust-tokens", i18nString16(UIStrings16.trustTokens), LegacyWrapper.LegacyWrapper.legacyWrapper(UI17.Widget.VBox, new NetworkComponents.RequestTrustTokensView.RequestTrustTokensView(request)), i18nString16(UIStrings16.trustTokenOperationDetails));
    }
    this.#initialTab = initialTab || this.#resourceViewTabSetting.get();
    this.setAutoSelectFirstItemOnShow(false);
  }
  wasShown() {
    super.wasShown();
    this.#request.addEventListener(SDK11.NetworkRequest.Events.REQUEST_HEADERS_CHANGED, this.requestHeadersChanged, this);
    this.#request.addEventListener(SDK11.NetworkRequest.Events.RESPONSE_HEADERS_CHANGED, this.maybeAppendCookiesPanel, this);
    this.#request.addEventListener(SDK11.NetworkRequest.Events.TRUST_TOKEN_RESULT_ADDED, this.maybeShowErrorIconInTrustTokenTabHeader, this);
    this.maybeAppendCookiesPanel();
    this.maybeShowErrorIconInTrustTokenTabHeader();
    if (this.#initialTab) {
      this.#selectTab(this.#initialTab);
      this.#initialTab = void 0;
    }
  }
  willHide() {
    super.willHide();
    this.#request.removeEventListener(SDK11.NetworkRequest.Events.REQUEST_HEADERS_CHANGED, this.requestHeadersChanged, this);
    this.#request.removeEventListener(SDK11.NetworkRequest.Events.RESPONSE_HEADERS_CHANGED, this.maybeAppendCookiesPanel, this);
    this.#request.removeEventListener(SDK11.NetworkRequest.Events.TRUST_TOKEN_RESULT_ADDED, this.maybeShowErrorIconInTrustTokenTabHeader, this);
  }
  async requestHeadersChanged() {
    this.maybeAppendCookiesPanel();
    void this.maybeAppendPayloadPanel();
  }
  maybeAppendCookiesPanel() {
    const cookiesPresent = this.#request.hasRequestCookies() || this.#request.responseCookies.length > 0;
    console.assert(cookiesPresent || !this.#cookiesView, "Cookies were introduced in headers and then removed!");
    if (cookiesPresent && !this.#cookiesView) {
      this.#cookiesView = new RequestCookiesView(this.#request);
      this.appendTab("cookies", i18nString16(UIStrings16.cookies), this.#cookiesView, i18nString16(UIStrings16.requestAndResponseCookies));
    }
    if (this.#request.hasThirdPartyCookiePhaseoutIssue()) {
      const icon = new IconButton4.Icon.Icon();
      icon.name = "warning-filled";
      icon.classList.add("small");
      icon.title = i18nString16(UIStrings16.thirdPartyPhaseout);
      this.setTrailingTabIcon("cookies", icon);
    }
  }
  async maybeAppendPayloadPanel() {
    if (this.hasTab("payload")) {
      return;
    }
    if (this.#request.queryParameters || await this.#request.requestFormData()) {
      this.#payloadView = new RequestPayloadView(this.#request);
      this.appendTab(
        "payload",
        i18nString16(UIStrings16.payload),
        this.#payloadView,
        i18nString16(UIStrings16.payload),
        /* userGesture=*/
        void 0,
        /* isCloseable=*/
        void 0,
        /* isPreviewFeature=*/
        void 0,
        /* index=*/
        1
      );
    }
  }
  maybeShowErrorIconInTrustTokenTabHeader() {
    const trustTokenResult = this.#request.trustTokenOperationDoneEvent();
    if (trustTokenResult && !NetworkComponents.RequestTrustTokensView.statusConsideredSuccess(trustTokenResult.status)) {
      const icon = new IconButton4.Icon.Icon();
      icon.name = "cross-circle-filled";
      icon.classList.add("small");
      this.setTabIcon("trust-tokens", icon);
    }
  }
  #selectTab(tabId) {
    if (!this.selectTab(tabId)) {
      window.setTimeout(() => {
        if (!this.selectTab(tabId)) {
          this.selectTab(this.#firstTab);
        }
      }, 0);
    }
  }
  tabSelected(event) {
    if (!event.data.isUserGesture) {
      return;
    }
    this.#resourceViewTabSetting.set(event.data.tabId);
  }
  request() {
    return this.#request;
  }
  async revealResponseBody(position) {
    this.#selectTab(
      "response"
      /* NetworkForward.UIRequestLocation.UIRequestTabs.RESPONSE */
    );
    await this.#responseView?.revealPosition(position);
  }
  revealHeader(section4, header) {
    this.#selectTab(
      "headers-component"
      /* NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT */
    );
    this.#headersViewComponent?.revealHeader(section4, header);
  }
  getHeadersViewComponent() {
    return this.#headersViewComponent;
  }
};

// gen/front_end/panels/network/network.prebundle.js
import "./../../models/network_time_calculator/network_time_calculator.js";

// gen/front_end/panels/network/NetworkLogView.js
var NetworkLogView_exports = {};
__export(NetworkLogView_exports, {
  HTTPSchemas: () => HTTPSchemas,
  MoreFiltersDropDownUI: () => MoreFiltersDropDownUI,
  NetworkLogView: () => NetworkLogView,
  computeStackTraceText: () => computeStackTraceText,
  isRequestFilteredOut: () => isRequestFilteredOut,
  overrideFilter: () => overrideFilter
});
import "./../../ui/legacy/legacy.js";
import * as Common16 from "./../../core/common/common.js";
import * as Host9 from "./../../core/host/host.js";
import * as i18n37 from "./../../core/i18n/i18n.js";
import * as Platform10 from "./../../core/platform/platform.js";
import * as Root2 from "./../../core/root/root.js";
import * as SDK14 from "./../../core/sdk/sdk.js";
import * as Bindings2 from "./../../models/bindings/bindings.js";
import * as HAR from "./../../models/har/har.js";
import * as Logs5 from "./../../models/logs/logs.js";
import * as NetworkTimeCalculator4 from "./../../models/network_time_calculator/network_time_calculator.js";
import * as Persistence from "./../../models/persistence/persistence.js";
import * as TextUtils7 from "./../../models/text_utils/text_utils.js";
import * as NetworkForward3 from "./forward/forward.js";
import * as Sources from "./../sources/sources.js";
import * as Adorners from "./../../ui/components/adorners/adorners.js";
import * as Buttons4 from "./../../ui/components/buttons/buttons.js";
import * as RenderCoordinator3 from "./../../ui/components/render_coordinator/render_coordinator.js";
import * as DataGrid9 from "./../../ui/legacy/components/data_grid/data_grid.js";
import * as PerfUI4 from "./../../ui/legacy/components/perf_ui/perf_ui.js";
import * as Components5 from "./../../ui/legacy/components/utils/utils.js";
import * as UI22 from "./../../ui/legacy/legacy.js";
import * as VisualLogging13 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/network/NetworkFrameGrouper.js
var NetworkFrameGrouper_exports = {};
__export(NetworkFrameGrouper_exports, {
  FrameGroupNode: () => FrameGroupNode,
  NetworkFrameGrouper: () => NetworkFrameGrouper
});
import * as Common13 from "./../../core/common/common.js";
import * as SDK12 from "./../../core/sdk/sdk.js";
import * as IconButton5 from "./../../ui/components/icon_button/icon_button.js";
import * as UI18 from "./../../ui/legacy/legacy.js";
var NetworkFrameGrouper = class {
  parentView;
  activeGroups;
  constructor(parentView) {
    this.parentView = parentView;
    this.activeGroups = /* @__PURE__ */ new Map();
  }
  groupNodeForRequest(request) {
    const frame = SDK12.ResourceTreeModel.ResourceTreeModel.frameForRequest(request);
    if (!frame || frame.isOutermostFrame()) {
      return null;
    }
    let groupNode = this.activeGroups.get(frame);
    if (groupNode) {
      return groupNode;
    }
    groupNode = new FrameGroupNode(this.parentView, frame);
    this.activeGroups.set(frame, groupNode);
    return groupNode;
  }
  reset() {
    this.activeGroups.clear();
  }
};
var FrameGroupNode = class extends NetworkGroupNode {
  frame;
  constructor(parentView, frame) {
    super(parentView);
    this.frame = frame;
  }
  displayName() {
    return new Common13.ParsedURL.ParsedURL(this.frame.url).domain() || this.frame.name || "<iframe>";
  }
  renderCell(cell, columnId) {
    super.renderCell(cell, columnId);
    const columnIndex = this.dataGrid.indexOfVisibleColumn(columnId);
    if (columnIndex === 0) {
      const name = this.displayName();
      cell.appendChild(IconButton5.Icon.create("frame", "network-frame-group-icon"));
      UI18.UIUtils.createTextChild(cell, name);
      UI18.Tooltip.Tooltip.install(cell, name);
      this.setCellAccessibleName(cell.textContent || "", cell, columnId);
    }
  }
};

// gen/front_end/panels/network/networkLogView.css.js
var networkLogView_css_default = `/*
 * Copyright 2013 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.network-log-grid.data-grid {
  border: none !important; /* stylelint-disable-line declaration-no-important */
  flex: auto;
}

.network-log-grid.data-grid.no-selection:focus-visible {
  border: none !important; /* stylelint-disable-line declaration-no-important */
}

#network-container {
  overflow: hidden;
}

#network-container.grid-focused.no-node-selected:focus-within {
  border: 1px solid var(--sys-color-state-focus-ring);
}

.network-summary-bar {
  flex: 0 0 27px;
  line-height: 27px;
  padding-left: 5px;
  background-color: var(--sys-color-cdt-base-container);
  border-top: 1px solid var(--sys-color-divider);
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  user-select: text;
}

.panel.network devtools-toolbar.network-summary-bar {
  border-bottom: 0;
}

.network-summary-bar dt-icon-label {
  margin-right: 6px;
}

.network-summary-bar > * {
  flex: none;
}

.network-log-grid.data-grid tbody {
  background: transparent;
}

.network-log-grid.data-grid td {
  height: 41px;
  border-left: 1px solid var(--sys-color-divider);
  vertical-align: middle;
}

.network-log-grid.data-grid .corner {
  display: none;
}

.network-log-grid.data-grid.small td {
  height: 21px;
}

.network-log-grid.data-grid th {
  border-bottom: none;
}

.network-waterfall-header,
.network-log-grid.data-grid thead th {
  border-bottom: 1px solid var(--sys-color-divider);
  border-left: 1px solid var(--sys-color-divider);
}

.network-waterfall-header,
.network-log-grid.data-grid thead {
  height: 31px;
  background-color: var(--sys-color-surface1);
}

.network-waterfall-header.small,
.network-log-grid.data-grid.small thead {
  height: 27px;
}

.network-log-grid.data-grid select {
  appearance: none;
  border: none;
  width: 100%;
  color: inherit;
}

.network-log-grid.data-grid .waterfall-column {
  padding: 1px 0;
}

.network-log-grid.data-grid .waterfall-column .sort-order-icon-container {
  right: 15px;
  pointer-events: none;
}

.network-log-grid.data-grid th.sortable:active {
  background-image: none !important; /* stylelint-disable-line declaration-no-important */
}

.network-cell-subtitle {
  font-weight: normal;
  color: var(--sys-color-token-subtle);
}

.network-badge {
  margin-right: 4px;
}

.status-column .devtools-link {
  color: inherit;
}

.initiator-column .text-button.devtools-link,
.initiator-column .text-button.devtools-link:focus-visible {
  color: inherit;
  background-color: transparent;
  outline-offset: 0;
  max-height: 16px;
}

.network-error-row,
.network-error-row .network-cell-subtitle {
  /* stylelint-disable-next-line declaration-no-important */
  color: var(--sys-color-error) !important;
}

.network-throttled-row,
.network-warning-row,
.network-warning-row .network-cell-subtitle {
  color: var(--sys-color-yellow);
}

.network-log-grid.data-grid tr.selected.network-error-row,
.network-log-grid.data-grid tr.selected.network-error-row .network-cell-subtitle,
.network-log-grid.data-grid tr.selected.network-error-row .network-dim-cell {
  color: var(--sys-color-error);
}

.network-log-grid.data-grid tr.selected.network-warning-row,
.network-log-grid.data-grid tr.selected.network-warning-row .network-cell-subtitle,
.network-log-grid.data-grid tr.selected.network-warning-row .network-dim-cell {
  color: var(--sys-color-yellow);
}

.network-log-grid.data-grid:focus-within tr.selected.network-error-row,
.network-log-grid.data-grid:focus-within tr.selected.network-error-row .devtools-link,
.network-log-grid.data-grid:focus-within tr.selected.network-error-row .network-cell-subtitle,
.network-log-grid.data-grid:focus-within tr.selected.network-error-row .network-dim-cell {
  color: var(--sys-color-error);
}

.network-log-grid.data-grid:focus-within tr.selected.network-warning-row,
.network-log-grid.data-grid:focus-within tr.selected.network-warning-row .devtools-link,
.network-log-grid.data-grid:focus-within tr.selected.network-warning-row .network-cell-subtitle,
.network-log-grid.data-grid:focus-within tr.selected.network-warning-row .network-dim-cell {
  color: var(--sys-color-yellow);
}

.network-log-grid.data-grid tr.selected,
.network-log-grid.data-grid tr.selected .network-cell-subtitle,
.network-log-grid.data-grid tr.selected .network-dim-cell {
  color: inherit;
}

.network-log-grid.data-grid:focus tr.selected,
.network-log-grid.data-grid:focus tr.selected .network-cell-subtitle,
.network-log-grid.data-grid:focus tr.selected .network-dim-cell {
  color: var(--sys-color-on-tonal-container);
}

.network-header-subtitle {
  color: var(--sys-color-token-subtle);
}

.network-log-grid.data-grid.small .network-cell-subtitle,
.network-log-grid.data-grid.small .network-header-subtitle {
  display: none;
}

.network-log-grid.data-grid.small .network-cell-subtitle.always-visible {
  display: inline;
  margin-left: 4px;
}

.network-log-grid tr.highlighted-row {
  animation: network-row-highlight-fadeout 2s 0s;
}

@keyframes network-row-highlight-fadeout {
  from {
    background-color: var(--sys-color-yellow-container);
  }

  to {
    background-color: transparent;
  }
}

/* Resource preview icons */
/* These rules are grouped by type */
.network-log-grid.data-grid .icon.image {
  position: relative;
}

.network-log-grid.data-grid .icon {
  float: left;
  width: 32px;
  height: 32px;
  margin-top: 1px;
  margin-right: 3px;
}

.network-log-grid.data-grid:focus-within .network-error-row.selected div.icon:not(.image) {
  filter: none;
}

.network-log-grid.data-grid .network-error-row.data-grid-data-grid-node img.icon,
.network-log-grid.data-grid .network-error-row.data-grid-data-grid-node.selected img.icon {
  /* This is generated with https://codepen.io/sosuke/pen/Pjoqqp to target var(--color-red) */
  filter: brightness(0) saturate(100%) invert(35%) sepia(76%) saturate(1413%) hue-rotate(338deg) brightness(92%) contrast(103%);
}

.network-throttled-row {
  devtools-icon {
    color: var(--sys-color-yellow);
    vertical-align: middle;
    width: 16px;
    height: 16px;
  }

  .image.icon::before,
  devtools-icon.icon::before {
    background-color: var(--sys-color-yellow);
    content: var(--image-file-empty);
    width: 35%;
    height: 35%;
    border-radius: 50%;
    outline: var(--sys-size-1) solid var(--icon-gap-focus-selected);
    top: 60%;
    left: 55%;
    position: absolute;
    z-index: 1;
  }
}

.data-grid-data-grid-node devtools-icon[name="arrow-up-down-circle"],
.network-log-grid.data-grid.small .icon {
  width: 16px;
  height: 16px;
  vertical-align: sub;
}

.data-grid-data-grid-node .ai-button-container {
  display: none;
  float: right;

  devtools-floating-button {
    position: absolute;
    z-index: 999;
    margin-left: -17px;
  }
}

.data-grid-data-grid-node:hover .ai-button-container {
  display: inline-flex;
}

.image-network-icon-preview {
  inset: 0;
  margin: auto;
  overflow: hidden;
}

.network-log-grid.data-grid .image-network-icon-preview {
  position: absolute;
  max-width: 18px;
  max-height: 21px;
  min-width: 1px;
  min-height: 1px;
}

.network-log-grid.data-grid.small .image-network-icon-preview {
  left: 2px;
  right: 2px;
  max-width: 10px;
  max-height: 12px;
}

.network-log-grid.data-grid .trailing-link-icon {
  padding-left: 0.5ex;
}

/* This is part of the large color block declared above, but should not be
   extracted out. */
.network-dim-cell {
  color: var(--sys-color-token-subtle);
}

.network-frame-divider {
  width: 2px;
  background-color: var(--network-frame-divider-color); /* stylelint-disable-line plugin/use_theme_colors */
  z-index: 10;
  visibility: hidden;
}

#network-container.has-waterfall .data-container {
  overflow: hidden;
}

.network-log-grid.data-grid .resources-dividers {
  z-index: 0;
}

.network-log-grid.data-grid .resources-dividers-label-bar {
  background-color: transparent;
  border: none;
  height: 30px;
  pointer-events: none;
}

.network-log-grid.data-grid span.separator-in-cell {
  user-select: none;
  min-width: 1ex;
  display: inline-block;
}

.network-status-pane {
  position: absolute;
  inset: 0;
  background-color: var(--sys-color-cdt-base-container);
  z-index: 500;
  overflow: auto;
}

.network-waterfall-header {
  position: absolute;
  border-left: 0;
  width: 100%;
  display: table;
  z-index: 200;

  & > div.hover-layer {
    display: none;
    background-color: var(--sys-color-state-hover-on-subtle);
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  &:hover > div.hover-layer {
    display: block;
  }
}

.network-waterfall-header div {
  display: table-cell;
  line-height: 14px;
  margin: auto 0;
  vertical-align: middle;
  text-align: left;
  font-weight: normal;
  padding: 0 4px;
}

/* All network-waterfall-header rules are defined here instead of above */
.network-waterfall-header .sort-order-icon-container {
  position: absolute;
  top: 1px;
  right: 0;
  bottom: 1px;
  display: flex;
  align-items: center;
}

.network-waterfall-header .sort-order-icon {
  align-items: center;
  margin-right: 4px;
  margin-bottom: -2px;
}

.network-frame-group-icon {
  display: inline-block;
  margin: -7px 1px;
  vertical-align: baseline;
}

.network-frame-group-badge {
  margin-right: 4px;
}

.network-override-marker {
  position: relative;
  float: left;
}

.network-override-marker::before {
  background-color: var(--sys-color-purple-bright);
  content: var(--image-file-empty);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  outline: 1px solid var(--icon-gap-toolbar);
  left: 8px;
  position: absolute;
  top: 10px;
  z-index: 1;
}

@media (forced-colors: active) {
  .initiator-column .devtools-link {
    color: linktext;
  }

  .network-log-grid.data-grid tbody tr.revealed.selected,
  .network-log-grid.data-grid:focus-within tbody tr.revealed.selected,
  .network-log-grid.data-grid:focus-within tr.selected .network-dim-cell,
  .network-log-grid.data-grid tr.selected .network-dim-cell,
  .network-log-grid.data-grid:focus-within tr.selected .initiator-column .devtools-link,
  .network-log-grid.data-grid tr.selected .initiator-column .devtools-link,
  .network-waterfall-header:hover * {
    color: HighlightText;
  }

  .network-log-grid {
    --color-grid-default: canvas;
    --color-grid-stripe: canvas;
    --color-grid-hovered: Highlight;
    --color-grid-selected: ButtonText;
    --color-grid-focus-selected: Highlight;
  }

  #network-container.no-node-selected:focus-within
  {
    forced-color-adjust: none;
    border-color: Highlight;
    background-color: canvas !important; /* stylelint-disable-line declaration-no-important */
  }

  .network-waterfall-header:hover {
    forced-color-adjust: none;
    background-color: Highlight !important; /* stylelint-disable-line declaration-no-important */

    & > div.hover-layer {
      display: none;
    }
  }

  .network-waterfall-header.small,
  .network-log-grid.data-grid.small thead .network-waterfall-header,
  .network-log-grid.data-grid thead {
    background-color: canvas;
  }

  .network-waterfall-header .sort-order-icon-container devtools-icon {
    background-color: inherit;
  }

  .network-waterfall-header:hover .sort-order-icon-container devtools-icon {
    color: HighlightText;
  }
}

/*# sourceURL=${import.meta.resolve("./networkLogView.css")} */`;

// gen/front_end/panels/network/NetworkLogViewColumns.js
var NetworkLogViewColumns_exports = {};
__export(NetworkLogViewColumns_exports, {
  NetworkLogViewColumns: () => NetworkLogViewColumns
});
import * as Common15 from "./../../core/common/common.js";
import * as i18n35 from "./../../core/i18n/i18n.js";
import * as IconButton6 from "./../../ui/components/icon_button/icon_button.js";
import * as DataGrid7 from "./../../ui/legacy/components/data_grid/data_grid.js";
import * as Components4 from "./../../ui/legacy/components/utils/utils.js";
import * as UI21 from "./../../ui/legacy/legacy.js";
import * as ThemeSupport5 from "./../../ui/legacy/theme_support/theme_support.js";
import * as VisualLogging12 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/network/NetworkManageCustomHeadersView.js
var NetworkManageCustomHeadersView_exports = {};
__export(NetworkManageCustomHeadersView_exports, {
  NetworkManageCustomHeadersView: () => NetworkManageCustomHeadersView
});
import * as i18n33 from "./../../core/i18n/i18n.js";
import * as UI19 from "./../../ui/legacy/legacy.js";

// gen/front_end/panels/network/networkManageCustomHeadersView.css.js
var networkManageCustomHeadersView_css_default = `/*
 * Copyright 2016 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.custom-headers-list {
  height: 272px;
  width: var(--sys-size-29);
  margin: 0 var(--sys-size-8);
}

.header {
  margin: var(--sys-size-5) var(--sys-size-5) var(--sys-size-5) var(--sys-size-8);
  padding-top: var(--sys-size-3);
  font: var(--sys-typescale-body2-medium);
  flex: none;
}

.custom-headers-header {
  padding: 2px;
}

.custom-headers-list-item {
  padding-left: 5px;
}

.editor-container {
  padding: 5px 0 0 5px;
}

.add-button {
  margin: var(--sys-size-6) auto var(--sys-size-8) var(--sys-size-8);
  align-items: flex-start;
}

/*# sourceURL=${import.meta.resolve("./networkManageCustomHeadersView.css")} */`;

// gen/front_end/panels/network/NetworkManageCustomHeadersView.js
var UIStrings17 = {
  /**
   * @description Text in Network Manage Custom Headers View of the Network panel
   */
  manageHeaderColumns: "Manage Header Columns",
  /**
   * @description Placeholder text content in Network Manage Custom Headers View of the Network panel
   */
  noCustomHeaders: "No custom headers",
  /**
   * @description Text of add button in Network Manage Custom Headers View of the Network panel
   */
  addCustomHeader: "Add custom header\u2026",
  /**
   * @description Text in Network Manage Custom Headers View of the Network panel
   */
  headerName: "Header Name"
};
var str_17 = i18n33.i18n.registerUIStrings("panels/network/NetworkManageCustomHeadersView.ts", UIStrings17);
var i18nString17 = i18n33.i18n.getLocalizedString.bind(void 0, str_17);
var NetworkManageCustomHeadersView = class extends UI19.Widget.VBox {
  list;
  columnConfigs;
  addHeaderColumnCallback;
  changeHeaderColumnCallback;
  removeHeaderColumnCallback;
  editor;
  constructor(columnData, addHeaderColumnCallback, changeHeaderColumnCallback, removeHeaderColumnCallback) {
    super({ useShadowDom: true });
    this.registerRequiredCSS(networkManageCustomHeadersView_css_default);
    this.contentElement.createChild("div", "header").textContent = i18nString17(UIStrings17.manageHeaderColumns);
    this.list = new UI19.ListWidget.ListWidget(this);
    this.list.registerRequiredCSS(networkManageCustomHeadersView_css_default);
    this.list.element.classList.add("custom-headers-list");
    const placeholder = document.createElement("div");
    placeholder.classList.add("custom-headers-list-list-empty");
    placeholder.textContent = i18nString17(UIStrings17.noCustomHeaders);
    this.list.setEmptyPlaceholder(placeholder);
    this.list.show(this.contentElement);
    this.contentElement.appendChild(UI19.UIUtils.createTextButton(i18nString17(UIStrings17.addCustomHeader), this.addButtonClicked.bind(this), {
      className: "add-button",
      jslogContext: "network.add-custom-header"
    }));
    this.columnConfigs = /* @__PURE__ */ new Map();
    columnData.forEach((columnData2) => this.columnConfigs.set(columnData2.title.toLowerCase(), columnData2));
    this.addHeaderColumnCallback = addHeaderColumnCallback;
    this.changeHeaderColumnCallback = changeHeaderColumnCallback;
    this.removeHeaderColumnCallback = removeHeaderColumnCallback;
    this.contentElement.tabIndex = 0;
  }
  wasShown() {
    super.wasShown();
    this.headersUpdated();
  }
  headersUpdated() {
    this.list.clear();
    this.columnConfigs.forEach((headerData) => this.list.appendItem({ header: headerData.title }, headerData.editable));
  }
  addButtonClicked() {
    this.list.addNewItem(this.columnConfigs.size, { header: "" });
  }
  renderItem(item, _editable) {
    const element = document.createElement("div");
    element.classList.add("custom-headers-list-item");
    const header = element.createChild("div", "custom-header-name");
    header.textContent = item.header;
    UI19.Tooltip.Tooltip.install(header, item.header);
    return element;
  }
  removeItemRequested(item, _index) {
    this.removeHeaderColumnCallback(item.header);
    this.columnConfigs.delete(item.header.toLowerCase());
    this.headersUpdated();
  }
  commitEdit(item, editor, isNew) {
    const headerId = editor.control("header").value.trim();
    let success;
    if (isNew) {
      success = this.addHeaderColumnCallback(headerId);
    } else {
      success = this.changeHeaderColumnCallback(item.header, headerId);
    }
    if (success && !isNew) {
      this.columnConfigs.delete(item.header.toLowerCase());
    }
    if (success) {
      this.columnConfigs.set(headerId.toLowerCase(), { title: headerId, editable: true });
    }
    this.headersUpdated();
  }
  beginEdit(item) {
    const editor = this.createEditor();
    editor.control("header").value = item.header;
    return editor;
  }
  createEditor() {
    if (this.editor) {
      return this.editor;
    }
    const editor = new UI19.ListWidget.Editor();
    this.editor = editor;
    const content = editor.contentElement();
    const titles = content.createChild("div", "custom-headers-edit-row");
    titles.createChild("div", "custom-headers-header").textContent = i18nString17(UIStrings17.headerName);
    const fields = content.createChild("div", "custom-headers-edit-row");
    fields.createChild("div", "custom-headers-header").appendChild(editor.createInput("header", "text", "x-custom-header", validateHeader.bind(this)));
    return editor;
    function validateHeader(item, _index, _input) {
      let valid = true;
      const headerId = editor.control("header").value.trim().toLowerCase();
      if (this.columnConfigs.has(headerId) && item.header !== headerId) {
        valid = false;
      }
      return { valid, errorMessage: void 0 };
    }
  }
};

// gen/front_end/panels/network/NetworkWaterfallColumn.js
var NetworkWaterfallColumn_exports = {};
__export(NetworkWaterfallColumn_exports, {
  NetworkWaterfallColumn: () => NetworkWaterfallColumn
});
import * as Common14 from "./../../core/common/common.js";
import * as NetworkTimeCalculator3 from "./../../models/network_time_calculator/network_time_calculator.js";
import * as RenderCoordinator2 from "./../../ui/components/render_coordinator/render_coordinator.js";
import * as PerfUI3 from "./../../ui/legacy/components/perf_ui/perf_ui.js";
import * as UI20 from "./../../ui/legacy/legacy.js";
import * as ThemeSupport3 from "./../../ui/legacy/theme_support/theme_support.js";

// gen/front_end/panels/network/NetworkOverview.js
var NetworkOverview_exports = {};
__export(NetworkOverview_exports, {
  NetworkOverview: () => NetworkOverview,
  RequestTimeRangeNameToColor: () => RequestTimeRangeNameToColor
});
import * as SDK13 from "./../../core/sdk/sdk.js";
import * as NetworkTimeCalculator2 from "./../../models/network_time_calculator/network_time_calculator.js";
import * as Trace from "./../../models/trace/trace.js";
import * as RenderCoordinator from "./../../ui/components/render_coordinator/render_coordinator.js";
import * as PerfUI2 from "./../../ui/legacy/components/perf_ui/perf_ui.js";
import * as ThemeSupport from "./../../ui/legacy/theme_support/theme_support.js";
var NetworkOverview = class extends PerfUI2.TimelineOverviewPane.TimelineOverviewBase {
  selectedFilmStripTime;
  numBands;
  highlightedRequest;
  loadEvents;
  domContentLoadedEvents;
  nextBand;
  bandMap;
  requestsList;
  requestsSet;
  span;
  lastBoundary;
  constructor() {
    super();
    this.selectedFilmStripTime = -1;
    this.element.classList.add("network-overview");
    this.numBands = 1;
    this.highlightedRequest = null;
    SDK13.TargetManager.TargetManager.instance().addModelListener(SDK13.ResourceTreeModel.ResourceTreeModel, SDK13.ResourceTreeModel.Events.Load, this.loadEventFired, this, { scoped: true });
    SDK13.TargetManager.TargetManager.instance().addModelListener(SDK13.ResourceTreeModel.ResourceTreeModel, SDK13.ResourceTreeModel.Events.DOMContentLoaded, this.domContentLoadedEventFired, this, { scoped: true });
    this.reset();
  }
  setHighlightedRequest(request) {
    this.highlightedRequest = request;
    this.scheduleUpdate();
  }
  selectFilmStripFrame(time) {
    this.selectedFilmStripTime = time;
    this.scheduleUpdate();
  }
  clearFilmStripFrame() {
    this.selectedFilmStripTime = -1;
    this.scheduleUpdate();
  }
  loadEventFired(event) {
    const time = event.data.loadTime;
    if (time) {
      this.loadEvents.push(time * 1e3);
    }
    this.scheduleUpdate();
  }
  domContentLoadedEventFired(event) {
    const { data } = event;
    if (data) {
      this.domContentLoadedEvents.push(data * 1e3);
    }
    this.scheduleUpdate();
  }
  bandId(connectionId) {
    if (!connectionId || connectionId === "0") {
      return -1;
    }
    if (this.bandMap.has(connectionId)) {
      return this.bandMap.get(connectionId);
    }
    const result = this.nextBand++;
    this.bandMap.set(connectionId, result);
    return result;
  }
  updateRequest(request) {
    if (!this.requestsSet.has(request)) {
      this.requestsSet.add(request);
      this.requestsList.push(request);
    }
    this.scheduleUpdate();
  }
  wasShown() {
    super.wasShown();
    this.onResize();
  }
  calculator() {
    return super.calculator();
  }
  onResize() {
    const width = this.element.offsetWidth;
    const height = this.element.offsetHeight;
    this.calculator().setDisplayWidth(width);
    this.resetCanvas();
    const numBands = (height - PADDING - 1) / BAND_HEIGHT - 1 | 0;
    this.numBands = numBands > 0 ? numBands : 1;
    this.scheduleUpdate();
  }
  reset() {
    this.span = 1;
    this.lastBoundary = null;
    this.nextBand = 0;
    this.bandMap = /* @__PURE__ */ new Map();
    this.requestsList = [];
    this.requestsSet = /* @__PURE__ */ new Set();
    this.loadEvents = [];
    this.domContentLoadedEvents = [];
    this.resetCanvas();
  }
  scheduleUpdate() {
    if (!this.isShowing()) {
      return;
    }
    void RenderCoordinator.write("NetworkOverview.render", this.update.bind(this));
  }
  update() {
    const calculator = this.calculator();
    const newBoundary = new NetworkTimeCalculator2.NetworkTimeBoundary(calculator.minimumBoundary(), calculator.maximumBoundary());
    if (!this.lastBoundary || !newBoundary.equals(this.lastBoundary)) {
      const span = calculator.boundarySpan();
      while (this.span < span) {
        this.span *= 1.25;
      }
      calculator.setBounds(calculator.minimumBoundary(), Trace.Types.Timing.Milli(calculator.minimumBoundary() + this.span));
      this.lastBoundary = new NetworkTimeCalculator2.NetworkTimeBoundary(calculator.minimumBoundary(), calculator.maximumBoundary());
    }
    const context = this.context();
    const linesByType = /* @__PURE__ */ new Map();
    const paddingTop = PADDING;
    function drawLines(type) {
      const lines = linesByType.get(type);
      if (!lines) {
        return;
      }
      const n2 = lines.length;
      context.beginPath();
      context.strokeStyle = ThemeSupport.ThemeSupport.instance().getComputedValue("--color-background-opacity-80");
      context.lineWidth = BORDER_WIDTH;
      context.fillStyle = ThemeSupport.ThemeSupport.instance().getComputedValue(RequestTimeRangeNameToColor[type]);
      for (let i = 0; i < n2; ) {
        const y = lines[i++] * BAND_HEIGHT + paddingTop;
        const startTime = lines[i++];
        let endTime = lines[i++];
        if (endTime === Number.MAX_VALUE) {
          endTime = calculator.maximumBoundary();
        }
        const startX = calculator.computePosition(Trace.Types.Timing.Milli(startTime));
        const endX = calculator.computePosition(Trace.Types.Timing.Milli(endTime)) + 1;
        context.fillRect(startX, y, Math.max(endX - startX, MIN_BAND_WIDTH), BAND_HEIGHT);
        context.strokeRect(startX, y, Math.max(endX - startX, MIN_BAND_WIDTH), BAND_HEIGHT);
      }
    }
    function addLine(type, y, start, end) {
      let lines = linesByType.get(type);
      if (!lines) {
        lines = [];
        linesByType.set(type, lines);
      }
      lines.push(y, start, end);
    }
    const requests = this.requestsList;
    const n = requests.length;
    for (let i = 0; i < n; ++i) {
      const request = requests[i];
      const band = this.bandId(request.connectionId);
      const y = band === -1 ? 0 : band % this.numBands + 1;
      const timeRanges = NetworkTimeCalculator2.calculateRequestTimeRanges(request, this.calculator().minimumBoundary());
      for (let j = 0; j < timeRanges.length; ++j) {
        const type = timeRanges[j].name;
        if (band !== -1 || type === "total") {
          addLine(type, y, timeRanges[j].start * 1e3, timeRanges[j].end * 1e3);
        }
      }
    }
    context.clearRect(0, 0, this.width(), this.height());
    context.save();
    context.scale(window.devicePixelRatio, window.devicePixelRatio);
    context.lineWidth = 2;
    drawLines(
      "total"
      /* NetworkTimeCalculator.RequestTimeRangeNames.TOTAL */
    );
    drawLines(
      "blocking"
      /* NetworkTimeCalculator.RequestTimeRangeNames.BLOCKING */
    );
    drawLines(
      "connecting"
      /* NetworkTimeCalculator.RequestTimeRangeNames.CONNECTING */
    );
    drawLines(
      "serviceworker"
      /* NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER */
    );
    drawLines(
      "serviceworker-preparation"
      /* NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER_PREPARATION */
    );
    drawLines(
      "serviceworker-respondwith"
      /* NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER_RESPOND_WITH */
    );
    drawLines(
      "push"
      /* NetworkTimeCalculator.RequestTimeRangeNames.PUSH */
    );
    drawLines(
      "proxy"
      /* NetworkTimeCalculator.RequestTimeRangeNames.PROXY */
    );
    drawLines(
      "dns"
      /* NetworkTimeCalculator.RequestTimeRangeNames.DNS */
    );
    drawLines(
      "ssl"
      /* NetworkTimeCalculator.RequestTimeRangeNames.SSL */
    );
    drawLines(
      "sending"
      /* NetworkTimeCalculator.RequestTimeRangeNames.SENDING */
    );
    drawLines(
      "waiting"
      /* NetworkTimeCalculator.RequestTimeRangeNames.WAITING */
    );
    drawLines(
      "receiving"
      /* NetworkTimeCalculator.RequestTimeRangeNames.RECEIVING */
    );
    if (this.highlightedRequest) {
      const size = 5;
      const borderSize = 2;
      const request = this.highlightedRequest;
      const band = this.bandId(request.connectionId);
      const y = (band === -1 ? 0 : band % this.numBands + 1) * BAND_HEIGHT + paddingTop;
      const timeRanges = NetworkTimeCalculator2.calculateRequestTimeRanges(request, this.calculator().minimumBoundary());
      context.fillStyle = ThemeSupport.ThemeSupport.instance().getComputedValue("--sys-color-tonal-container");
      const start = Trace.Types.Timing.Milli(timeRanges[0].start * 1e3);
      const end = Trace.Types.Timing.Milli(timeRanges[0].end * 1e3);
      context.fillRect(calculator.computePosition(start) - borderSize, y - size / 2 - borderSize, calculator.computePosition(end) - calculator.computePosition(start) + 1 + 2 * borderSize, size * borderSize);
      for (let j = 0; j < timeRanges.length; ++j) {
        const type = timeRanges[j].name;
        if (band !== -1 || type === "total") {
          context.beginPath();
          context.strokeStyle = ThemeSupport.ThemeSupport.instance().getComputedValue(RequestTimeRangeNameToColor[type]);
          context.lineWidth = size;
          const start2 = Trace.Types.Timing.Milli(timeRanges[j].start * 1e3);
          const end2 = Trace.Types.Timing.Milli(timeRanges[j].end * 1e3);
          context.moveTo(Number(calculator.computePosition(start2)) - 0, y);
          context.lineTo(Number(calculator.computePosition(end2)) + 1, y);
          context.stroke();
        }
      }
    }
    const height = this.element.offsetHeight;
    context.lineWidth = 1;
    context.beginPath();
    context.strokeStyle = ThemeSupport.ThemeSupport.instance().getComputedValue(NetworkLogView.getDCLEventColor());
    for (let i = this.domContentLoadedEvents.length - 1; i >= 0; --i) {
      const position = calculator.computePosition(Trace.Types.Timing.Milli(this.domContentLoadedEvents[i]));
      const x = Math.round(position) + 0.5;
      context.moveTo(x, 0);
      context.lineTo(x, height);
    }
    context.stroke();
    context.beginPath();
    context.strokeStyle = ThemeSupport.ThemeSupport.instance().getComputedValue(NetworkLogView.getLoadEventColor());
    for (let i = this.loadEvents.length - 1; i >= 0; --i) {
      const position = calculator.computePosition(Trace.Types.Timing.Milli(this.loadEvents[i]));
      const x = Math.round(position) + 0.5;
      context.moveTo(x, 0);
      context.lineTo(x, height);
    }
    context.stroke();
    if (this.selectedFilmStripTime !== -1) {
      context.lineWidth = 2;
      context.beginPath();
      context.strokeStyle = ThemeSupport.ThemeSupport.instance().getComputedValue("--network-frame-divider-color");
      const timeInMilliseconds = Trace.Types.Timing.Milli(this.selectedFilmStripTime);
      const x = Math.round(calculator.computePosition(timeInMilliseconds));
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }
    context.restore();
  }
};
var RequestTimeRangeNameToColor = {
  [
    "total"
    /* NetworkTimeCalculator.RequestTimeRangeNames.TOTAL */
  ]: "--network-overview-total",
  [
    "blocking"
    /* NetworkTimeCalculator.RequestTimeRangeNames.BLOCKING */
  ]: "--network-overview-blocking",
  [
    "connecting"
    /* NetworkTimeCalculator.RequestTimeRangeNames.CONNECTING */
  ]: "--network-overview-connecting",
  [
    "serviceworker"
    /* NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER */
  ]: "--network-overview-service-worker",
  [
    "serviceworker-preparation"
    /* NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER_PREPARATION */
  ]: "--network-overview-service-worker",
  [
    "serviceworker-respondwith"
    /* NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER_RESPOND_WITH */
  ]: "--network-overview-service-worker-respond-with",
  [
    "push"
    /* NetworkTimeCalculator.RequestTimeRangeNames.PUSH */
  ]: "--network-overview-push",
  [
    "proxy"
    /* NetworkTimeCalculator.RequestTimeRangeNames.PROXY */
  ]: "--override-network-overview-proxy",
  [
    "dns"
    /* NetworkTimeCalculator.RequestTimeRangeNames.DNS */
  ]: "--network-overview-dns",
  [
    "ssl"
    /* NetworkTimeCalculator.RequestTimeRangeNames.SSL */
  ]: "--network-overview-ssl",
  [
    "sending"
    /* NetworkTimeCalculator.RequestTimeRangeNames.SENDING */
  ]: "--override-network-overview-sending",
  [
    "waiting"
    /* NetworkTimeCalculator.RequestTimeRangeNames.WAITING */
  ]: "--network-overview-waiting",
  [
    "receiving"
    /* NetworkTimeCalculator.RequestTimeRangeNames.RECEIVING */
  ]: "--network-overview-receiving",
  [
    "queueing"
    /* NetworkTimeCalculator.RequestTimeRangeNames.QUEUEING */
  ]: "--network-overview-queueing"
};
var BAND_HEIGHT = 3;
var PADDING = 5;
var MIN_BAND_WIDTH = 10;
var BORDER_WIDTH = 1;

// gen/front_end/panels/network/networkWaterfallColumn.css.js
var networkWaterfallColumn_css_default = `/*
 * Copyright 2016 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.network-waterfall-v-scroll {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  overflow-x: hidden;
  margin-top: 31px;
  z-index: 200;
}

.theme-with-dark-background .network-waterfall-v-scroll {
  /**
  * Waterfall scrollbars are implemented as overflowing elements on top of the
  * scrollable content. The actual content is a viewport without scrollbars.
  * When using a dark theme, we should inform Blink that the content is dark,
  * so that the native scrollbars are colored accordingly.
  */
  /* stylelint-disable-next-line plugin/use_theme_colors */
  background: rgb(0 0 0 / 1%);
}

.network-waterfall-v-scroll.small {
  margin-top: 27px;
}

.network-waterfall-v-scroll-content {
  width: 15px;
  pointer-events: none;
}

/*# sourceURL=${import.meta.resolve("./networkWaterfallColumn.css")} */`;

// gen/front_end/panels/network/NetworkWaterfallColumn.js
var BAR_SPACING = 1;
var NetworkWaterfallColumn = class _NetworkWaterfallColumn extends UI20.Widget.VBox {
  canvas;
  canvasPosition;
  leftPadding;
  fontSize;
  rightPadding;
  scrollTop;
  headerHeight;
  calculator;
  rowHeight;
  offsetWidth;
  offsetHeight;
  startTime;
  endTime;
  popoverHelper;
  nodes;
  hoveredNode;
  eventDividers;
  styleForTimeRangeName;
  styleForWaitingResourceType;
  styleForDownloadingResourceType;
  wiskerStyle;
  hoverDetailsStyle;
  pathForStyle;
  textLayers;
  constructor(calculator) {
    super();
    this.registerRequiredCSS(networkWaterfallColumn_css_default);
    this.canvas = this.contentElement.createChild("canvas");
    this.canvas.tabIndex = -1;
    this.setDefaultFocusedElement(this.canvas);
    this.canvasPosition = this.canvas.getBoundingClientRect();
    this.leftPadding = 5;
    this.fontSize = 10;
    this.rightPadding = 0;
    this.scrollTop = 0;
    this.headerHeight = 0;
    this.calculator = calculator;
    this.rowHeight = 0;
    this.offsetWidth = 0;
    this.offsetHeight = 0;
    this.startTime = this.calculator.minimumBoundary();
    this.endTime = this.calculator.maximumBoundary();
    this.popoverHelper = new UI20.PopoverHelper.PopoverHelper(this.element, this.getPopoverRequest.bind(this), "network.timing");
    this.popoverHelper.setTimeout(300, 300);
    this.nodes = [];
    this.hoveredNode = null;
    this.eventDividers = /* @__PURE__ */ new Map();
    this.element.addEventListener("mousemove", this.onMouseMove.bind(this), true);
    this.element.addEventListener("mouseleave", (_event) => this.setHoveredNode(null, false), true);
    this.element.addEventListener("click", this.onClick.bind(this), true);
    this.styleForTimeRangeName = _NetworkWaterfallColumn.buildRequestTimeRangeStyle();
    const resourceStyleTuple = _NetworkWaterfallColumn.buildResourceTypeStyle();
    this.styleForWaitingResourceType = resourceStyleTuple[0];
    this.styleForDownloadingResourceType = resourceStyleTuple[1];
    const baseLineColor = ThemeSupport3.ThemeSupport.instance().getComputedValue("--sys-color-state-disabled");
    this.wiskerStyle = { borderColor: baseLineColor, lineWidth: 1, fillStyle: void 0 };
    this.hoverDetailsStyle = { fillStyle: baseLineColor, lineWidth: 1, borderColor: baseLineColor };
    this.pathForStyle = /* @__PURE__ */ new Map();
    this.textLayers = [];
  }
  static buildRequestTimeRangeStyle() {
    const styleMap = /* @__PURE__ */ new Map();
    styleMap.set("connecting", { fillStyle: RequestTimeRangeNameToColor[
      "connecting"
      /* NetworkTimeCalculator.RequestTimeRangeNames.CONNECTING */
    ] });
    styleMap.set("ssl", { fillStyle: RequestTimeRangeNameToColor[
      "ssl"
      /* NetworkTimeCalculator.RequestTimeRangeNames.SSL */
    ] });
    styleMap.set("dns", { fillStyle: RequestTimeRangeNameToColor[
      "dns"
      /* NetworkTimeCalculator.RequestTimeRangeNames.DNS */
    ] });
    styleMap.set("proxy", { fillStyle: RequestTimeRangeNameToColor[
      "proxy"
      /* NetworkTimeCalculator.RequestTimeRangeNames.PROXY */
    ] });
    styleMap.set("blocking", { fillStyle: RequestTimeRangeNameToColor[
      "blocking"
      /* NetworkTimeCalculator.RequestTimeRangeNames.BLOCKING */
    ] });
    styleMap.set("push", { fillStyle: RequestTimeRangeNameToColor[
      "push"
      /* NetworkTimeCalculator.RequestTimeRangeNames.PUSH */
    ] });
    styleMap.set("queueing", {
      fillStyle: RequestTimeRangeNameToColor[
        "queueing"
        /* NetworkTimeCalculator.RequestTimeRangeNames.QUEUEING */
      ],
      lineWidth: 2,
      borderColor: "lightgrey"
    });
    styleMap.set("receiving", {
      fillStyle: RequestTimeRangeNameToColor[
        "receiving"
        /* NetworkTimeCalculator.RequestTimeRangeNames.RECEIVING */
      ],
      lineWidth: 2,
      borderColor: "#03A9F4"
    });
    styleMap.set("waiting", { fillStyle: RequestTimeRangeNameToColor[
      "waiting"
      /* NetworkTimeCalculator.RequestTimeRangeNames.WAITING */
    ] });
    styleMap.set("receiving-push", { fillStyle: RequestTimeRangeNameToColor[
      "receiving-push"
      /* NetworkTimeCalculator.RequestTimeRangeNames.RECEIVING_PUSH */
    ] });
    styleMap.set("serviceworker", { fillStyle: RequestTimeRangeNameToColor[
      "serviceworker"
      /* NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER */
    ] });
    styleMap.set("serviceworker-preparation", {
      fillStyle: RequestTimeRangeNameToColor[
        "serviceworker-preparation"
        /* NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER_PREPARATION */
      ]
    });
    styleMap.set("serviceworker-respondwith", {
      fillStyle: RequestTimeRangeNameToColor[
        "serviceworker-respondwith"
        /* NetworkTimeCalculator.RequestTimeRangeNames.SERVICE_WORKER_RESPOND_WITH */
      ]
    });
    return styleMap;
  }
  static buildResourceTypeStyle() {
    const baseResourceTypeColors = /* @__PURE__ */ new Map([
      ["document", "hsl(215, 100%, 80%)"],
      ["font", "hsl(8, 100%, 80%)"],
      ["media", "hsl(90, 50%, 80%)"],
      ["image", "hsl(90, 50%, 80%)"],
      ["script", "hsl(31, 100%, 80%)"],
      ["stylesheet", "hsl(272, 64%, 80%)"],
      ["texttrack", "hsl(8, 100%, 80%)"],
      ["websocket", "hsl(0, 0%, 95%)"],
      ["xhr", "hsl(53, 100%, 80%)"],
      ["fetch", "hsl(53, 100%, 80%)"],
      ["other", "hsl(0, 0%, 95%)"]
    ]);
    const waitingStyleMap = /* @__PURE__ */ new Map();
    const downloadingStyleMap = /* @__PURE__ */ new Map();
    for (const resourceType of Object.values(Common14.ResourceType.resourceTypes)) {
      let color = baseResourceTypeColors.get(resourceType.name());
      if (!color) {
        color = baseResourceTypeColors.get("other");
      }
      const borderColor = toBorderColor(color);
      waitingStyleMap.set(
        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
        // @ts-expect-error
        resourceType,
        { fillStyle: toWaitingColor(color), lineWidth: 1, borderColor }
      );
      downloadingStyleMap.set(resourceType, { fillStyle: color, lineWidth: 1, borderColor });
    }
    return [waitingStyleMap, downloadingStyleMap];
    function toBorderColor(color) {
      const parsedColor = Common14.Color.parse(color)?.as(
        "hsl"
        /* Common.Color.Format.HSL */
      );
      if (!parsedColor) {
        return "";
      }
      let { s, l } = parsedColor;
      s /= 2;
      l -= Math.min(l, 0.2);
      return new Common14.Color.HSL(parsedColor.h, s, l, parsedColor.alpha).asString();
    }
    function toWaitingColor(color) {
      const parsedColor = Common14.Color.parse(color)?.as(
        "hsl"
        /* Common.Color.Format.HSL */
      );
      if (!parsedColor) {
        return "";
      }
      let { l } = parsedColor;
      l *= 1.1;
      return new Common14.Color.HSL(parsedColor.h, parsedColor.s, l, parsedColor.alpha).asString();
    }
  }
  resetPaths() {
    this.pathForStyle.clear();
    this.pathForStyle.set(this.wiskerStyle, new Path2D());
    this.styleForTimeRangeName.forEach((style) => this.pathForStyle.set(style, new Path2D()));
    this.styleForWaitingResourceType.forEach((style) => this.pathForStyle.set(style, new Path2D()));
    this.styleForDownloadingResourceType.forEach((style) => this.pathForStyle.set(style, new Path2D()));
    this.pathForStyle.set(this.hoverDetailsStyle, new Path2D());
  }
  willHide() {
    this.popoverHelper.hidePopover();
    super.willHide();
  }
  wasShown() {
    super.wasShown();
    this.update();
  }
  onMouseMove(event) {
    this.setHoveredNode(this.getNodeFromPoint(event.offsetY), event.shiftKey);
  }
  onClick(event) {
    const handled = this.setSelectedNode(this.getNodeFromPoint(event.offsetY));
    if (handled) {
      event.consume(true);
    }
  }
  getPopoverRequest(event) {
    if (event instanceof KeyboardEvent) {
      return null;
    }
    if (!this.hoveredNode) {
      return null;
    }
    const request = this.hoveredNode.request();
    if (!request) {
      return null;
    }
    const useTimingBars = !Common14.Settings.Settings.instance().moduleSetting("network-color-code-resource-types").get() && !this.calculator.startAtZero;
    let range;
    let start;
    let end;
    if (useTimingBars) {
      range = NetworkTimeCalculator3.calculateRequestTimeRanges(request, 0).find(
        (data) => data.name === "total"
        /* NetworkTimeCalculator.RequestTimeRangeNames.TOTAL */
      );
      start = this.timeToPosition(range.start);
      end = this.timeToPosition(range.end);
    } else {
      range = this.getSimplifiedBarRange(request, 0);
      start = range.start;
      end = range.end;
    }
    if (end - start < 50) {
      const halfWidth = (end - start) / 2;
      start = start + halfWidth - 25;
      end = end - halfWidth + 25;
    }
    if (event.clientX < this.canvasPosition.left + start || event.clientX > this.canvasPosition.left + end) {
      return null;
    }
    const rowIndex = this.nodes.findIndex((node) => node.hovered());
    const barHeight = this.getBarHeight(range.name);
    const y = this.headerHeight + (this.rowHeight * rowIndex - this.scrollTop) + (this.rowHeight - barHeight) / 2;
    if (event.clientY < this.canvasPosition.top + y || event.clientY > this.canvasPosition.top + y + barHeight) {
      return null;
    }
    const anchorBox = this.element.boxInWindow();
    anchorBox.x += start;
    anchorBox.y += y;
    anchorBox.width = end - start;
    anchorBox.height = barHeight;
    return {
      box: anchorBox,
      show: async (popover) => {
        const content = RequestTimingView.create(request, this.calculator);
        await content.updateComplete;
        content.show(popover.contentElement);
        return true;
      },
      hide: void 0
    };
  }
  setHoveredNode(node, highlightInitiatorChain) {
    if (this.hoveredNode) {
      this.hoveredNode.setHovered(false, false);
    }
    this.hoveredNode = node;
    if (this.hoveredNode) {
      this.hoveredNode.setHovered(true, highlightInitiatorChain);
    }
  }
  setSelectedNode(node) {
    if (node?.dataGrid) {
      node.select();
      node.dataGrid.element.focus();
      return true;
    }
    return false;
  }
  setRowHeight(height) {
    this.rowHeight = height;
  }
  setHeaderHeight(height) {
    this.headerHeight = height;
  }
  setRightPadding(padding) {
    this.rightPadding = padding;
    this.calculateCanvasSize();
  }
  setCalculator(calculator) {
    this.calculator = calculator;
  }
  getNodeFromPoint(y) {
    if (y <= this.headerHeight) {
      return null;
    }
    return this.nodes[Math.floor((this.scrollTop + y - this.headerHeight) / this.rowHeight)];
  }
  scheduleDraw() {
    void RenderCoordinator2.write("NetworkWaterfallColumn.render", () => this.update());
  }
  update(scrollTop, eventDividers, nodes) {
    if (scrollTop !== void 0 && this.scrollTop !== scrollTop) {
      this.popoverHelper.hidePopover();
      this.scrollTop = scrollTop;
    }
    if (nodes) {
      this.nodes = nodes;
      this.calculateCanvasSize();
    }
    if (eventDividers !== void 0) {
      this.eventDividers = eventDividers;
    }
    this.startTime = this.calculator.minimumBoundary();
    this.endTime = this.calculator.maximumBoundary();
    this.resetCanvas();
    this.resetPaths();
    this.textLayers = [];
    this.draw();
  }
  resetCanvas() {
    const ratio = window.devicePixelRatio;
    this.canvas.width = this.offsetWidth * ratio;
    this.canvas.height = this.offsetHeight * ratio;
    this.canvas.style.width = this.offsetWidth + "px";
    this.canvas.style.height = this.offsetHeight + "px";
  }
  onResize() {
    super.onResize();
    this.calculateCanvasSize();
    this.scheduleDraw();
  }
  calculateCanvasSize() {
    this.offsetWidth = this.contentElement.offsetWidth - this.rightPadding;
    this.offsetHeight = this.contentElement.offsetHeight;
    this.calculator.setDisplayWidth(this.offsetWidth);
    this.canvasPosition = this.canvas.getBoundingClientRect();
  }
  timeToPosition(time) {
    const availableWidth = this.offsetWidth - this.leftPadding;
    const timeToPixel = availableWidth / (this.endTime - this.startTime);
    return Math.floor(this.leftPadding + (time - this.startTime) * timeToPixel);
  }
  didDrawForTest() {
  }
  draw() {
    const useTimingBars = !Common14.Settings.Settings.instance().moduleSetting("network-color-code-resource-types").get() && !this.calculator.startAtZero;
    const nodes = this.nodes;
    const context = this.canvas.getContext("2d");
    if (!context) {
      return;
    }
    context.save();
    context.scale(window.devicePixelRatio, window.devicePixelRatio);
    context.translate(0, this.headerHeight);
    context.rect(0, 0, this.offsetWidth, this.offsetHeight);
    context.clip();
    const firstRequestIndex = Math.floor(this.scrollTop / this.rowHeight);
    const lastRequestIndex = Math.min(nodes.length, firstRequestIndex + Math.ceil(this.offsetHeight / this.rowHeight));
    for (let i = firstRequestIndex; i < lastRequestIndex; i++) {
      const rowOffset = this.rowHeight * i;
      const node = nodes[i];
      this.decorateRow(context, node, rowOffset - this.scrollTop);
      let drawNodes = [];
      if (node.hasChildren() && !node.expanded) {
        drawNodes = node.flatChildren();
      }
      drawNodes.push(node);
      for (const drawNode of drawNodes) {
        if (useTimingBars) {
          this.buildTimingBarLayers(drawNode, rowOffset - this.scrollTop);
        } else {
          this.buildSimplifiedBarLayers(context, drawNode, rowOffset - this.scrollTop);
        }
      }
    }
    this.drawLayers(context, useTimingBars);
    context.save();
    context.fillStyle = ThemeSupport3.ThemeSupport.instance().getComputedValue("--sys-color-state-disabled");
    for (const textData of this.textLayers) {
      context.fillText(textData.text, textData.x, textData.y);
    }
    context.restore();
    this.drawEventDividers(context);
    context.restore();
    const freeZoneAtLeft = 75;
    const freeZoneAtRight = 18;
    const dividersData = PerfUI3.TimelineGrid.TimelineGrid.calculateGridOffsets(this.calculator);
    PerfUI3.TimelineGrid.TimelineGrid.drawCanvasGrid(context, dividersData);
    PerfUI3.TimelineGrid.TimelineGrid.drawCanvasHeaders(context, dividersData, (time) => this.calculator.formatValue(time, dividersData.precision), this.fontSize, this.headerHeight, freeZoneAtLeft);
    context.save();
    context.scale(window.devicePixelRatio, window.devicePixelRatio);
    context.clearRect(this.offsetWidth - freeZoneAtRight, 0, freeZoneAtRight, this.headerHeight);
    context.restore();
    this.didDrawForTest();
  }
  drawLayers(context, useTimingBars) {
    for (const entry of this.pathForStyle) {
      const style = entry[0];
      const path = entry[1];
      context.save();
      context.beginPath();
      if (style.lineWidth) {
        context.lineWidth = style.lineWidth;
        if (style.borderColor) {
          context.strokeStyle = style.borderColor;
        }
        context.stroke(path);
      }
      if (style.fillStyle) {
        context.fillStyle = useTimingBars ? ThemeSupport3.ThemeSupport.instance().getComputedValue(style.fillStyle) : style.fillStyle;
        context.fill(path);
      }
      context.restore();
    }
  }
  drawEventDividers(context) {
    context.save();
    context.lineWidth = 1;
    for (const color of this.eventDividers.keys()) {
      context.strokeStyle = color;
      for (const time of this.eventDividers.get(color) || []) {
        context.beginPath();
        const x = this.timeToPosition(time);
        context.moveTo(x, 0);
        context.lineTo(x, this.offsetHeight);
      }
      context.stroke();
    }
    context.restore();
  }
  getBarHeight(type) {
    switch (type) {
      case "connecting":
      case "ssl":
      case "dns":
      case "proxy":
      case "blocking":
      case "push":
      case "queueing":
        return 7;
      default:
        return 13;
    }
  }
  // Used when `network-color-code-resource-types` is true
  getSimplifiedBarRange(request, borderOffset) {
    const drawWidth = this.offsetWidth - this.leftPadding;
    const percentages = this.calculator.computeBarGraphPercentages(request);
    return {
      start: this.leftPadding + Math.floor(percentages.start / 100 * drawWidth) + borderOffset,
      mid: this.leftPadding + Math.floor(percentages.middle / 100 * drawWidth) + borderOffset,
      end: this.leftPadding + Math.floor(percentages.end / 100 * drawWidth) + borderOffset
    };
  }
  // Used when `network-color-code-resource-types` is true
  buildSimplifiedBarLayers(context, node, y) {
    const request = node.request();
    if (!request) {
      return;
    }
    const borderWidth = 1;
    const borderOffset = borderWidth % 2 === 0 ? 0 : 0.5;
    const ranges = this.getSimplifiedBarRange(request, borderOffset);
    const height = this.getBarHeight();
    y += Math.floor(this.rowHeight / 2 - height / 2 + borderWidth) - borderWidth / 2;
    const waitingStyle = this.styleForWaitingResourceType.get(request.resourceType());
    const waitingPath = this.pathForStyle.get(waitingStyle);
    waitingPath.rect(ranges.start, y, ranges.mid - ranges.start, height - borderWidth);
    const barWidth = Math.max(2, ranges.end - ranges.mid);
    const downloadingStyle = this.styleForDownloadingResourceType.get(request.resourceType());
    const downloadingPath = this.pathForStyle.get(downloadingStyle);
    downloadingPath.rect(ranges.mid, y, barWidth, height - borderWidth);
    let labels = null;
    if (node.hovered()) {
      labels = this.calculator.computeBarGraphLabels(request);
      const barDotLineLength = 10;
      const leftLabelWidth = context.measureText(labels.left).width;
      const rightLabelWidth = context.measureText(labels.right).width;
      const hoverLinePath = this.pathForStyle.get(this.hoverDetailsStyle);
      if (leftLabelWidth < ranges.mid - ranges.start) {
        const midBarX = ranges.start + (ranges.mid - ranges.start - leftLabelWidth) / 2;
        this.textLayers.push({ text: labels.left, x: midBarX, y: y + this.fontSize });
      } else if (barDotLineLength + leftLabelWidth + this.leftPadding < ranges.start) {
        this.textLayers.push({ text: labels.left, x: ranges.start - leftLabelWidth - barDotLineLength - 1, y: y + this.fontSize });
        hoverLinePath.moveTo(ranges.start - barDotLineLength, y + Math.floor(height / 2));
        hoverLinePath.arc(ranges.start, y + Math.floor(height / 2), 2, 0, 2 * Math.PI);
        hoverLinePath.moveTo(ranges.start - barDotLineLength, y + Math.floor(height / 2));
        hoverLinePath.lineTo(ranges.start, y + Math.floor(height / 2));
      }
      const endX = ranges.mid + barWidth + borderOffset;
      if (rightLabelWidth < endX - ranges.mid) {
        const midBarX = ranges.mid + (endX - ranges.mid - rightLabelWidth) / 2;
        this.textLayers.push({ text: labels.right, x: midBarX, y: y + this.fontSize });
      } else if (endX + barDotLineLength + rightLabelWidth < this.offsetWidth - this.leftPadding) {
        this.textLayers.push({ text: labels.right, x: endX + barDotLineLength + 1, y: y + this.fontSize });
        hoverLinePath.moveTo(endX, y + Math.floor(height / 2));
        hoverLinePath.arc(endX, y + Math.floor(height / 2), 2, 0, 2 * Math.PI);
        hoverLinePath.moveTo(endX, y + Math.floor(height / 2));
        hoverLinePath.lineTo(endX + barDotLineLength, y + Math.floor(height / 2));
      }
    }
    if (!this.calculator.startAtZero) {
      const queueingRange = NetworkTimeCalculator3.calculateRequestTimeRanges(request, 0).find(
        (data) => data.name === "total"
        /* NetworkTimeCalculator.RequestTimeRangeNames.TOTAL */
      );
      const leftLabelWidth = labels ? context.measureText(labels.left).width : 0;
      const leftTextPlacedInBar = leftLabelWidth < ranges.mid - ranges.start;
      const wiskerTextPadding = 13;
      const textOffset = labels && !leftTextPlacedInBar ? leftLabelWidth + wiskerTextPadding : 0;
      const queueingStart = this.timeToPosition(queueingRange.start);
      if (ranges.start - textOffset > queueingStart) {
        const wiskerPath = this.pathForStyle.get(this.wiskerStyle);
        wiskerPath.moveTo(queueingStart, y + Math.floor(height / 2));
        wiskerPath.lineTo(ranges.start - textOffset, y + Math.floor(height / 2));
        const wiskerHeight = height / 2;
        wiskerPath.moveTo(queueingStart + borderOffset, y + wiskerHeight / 2);
        wiskerPath.lineTo(queueingStart + borderOffset, y + height - wiskerHeight / 2 - 1);
      }
    }
  }
  buildTimingBarLayers(node, y) {
    const request = node.request();
    if (!request) {
      return;
    }
    const ranges = NetworkTimeCalculator3.calculateRequestTimeRanges(request, 0);
    let index = 0;
    for (const range of ranges) {
      if (range.name === "total" || range.name === "sending" || range.end - range.start === 0) {
        continue;
      }
      const style = this.styleForTimeRangeName.get(range.name);
      const path = this.pathForStyle.get(style);
      const lineWidth = style.lineWidth || 0;
      const height = this.getBarHeight(range.name);
      const middleBarY = y + Math.floor(this.rowHeight / 2 - height / 2) + lineWidth / 2;
      const start = this.timeToPosition(range.start);
      const end = this.timeToPosition(range.end);
      path.rect(start + index * BAR_SPACING, middleBarY, end - start, height - lineWidth);
      index++;
    }
  }
  decorateRow(context, node, y) {
    const nodeBgColorId = node.backgroundColor();
    context.save();
    context.beginPath();
    context.fillStyle = ThemeSupport3.ThemeSupport.instance().getComputedValue(nodeBgColorId);
    context.rect(0, y, this.offsetWidth, this.rowHeight);
    context.fill();
    context.restore();
  }
};

// gen/front_end/panels/network/NetworkLogViewColumns.js
var UIStrings18 = {
  /**
   * @description Data grid name for Network Log data grids
   */
  networkLog: "Network Log",
  /**
   * @description Inner element text content in Network Log View Columns of the Network panel
   */
  waterfall: "Waterfall",
  /**
   * @description A context menu item in the Network Log View Columns of the Network panel
   */
  responseHeaders: "Response Headers",
  /**
   * @description A context menu item in the Network Log View Columns of the Network panel
   */
  requestHeaders: "Request Headers",
  /**
   * @description Text in Network Log View Columns of the Network panel
   */
  manageHeaderColumns: "Manage Header Columns\u2026",
  /**
   * @description Text for the start time of an activity
   */
  startTime: "Start Time",
  /**
   * @description Text in Network Log View Columns of the Network panel
   */
  responseTime: "Response Time",
  /**
   * @description Text in Network Log View Columns of the Network panel
   */
  endTime: "End Time",
  /**
   * @description Text in Network Log View Columns of the Network panel
   */
  totalDuration: "Total Duration",
  /**
   * @description Text for the latency of a task
   */
  latency: "Latency",
  /**
   * @description Text for the name of something
   */
  name: "Name",
  /**
   * @description Text that refers to a file path
   */
  path: "Path",
  /**
   * @description Text in Timeline UIUtils of the Performance panel
   */
  url: "Url",
  /**
   * @description Text for one or a group of functions
   */
  method: "Method",
  /**
   * @description Text for the status of something
   */
  status: "Status",
  /**
   * @description Generic label for any text
   */
  text: "Text",
  /**
   * @description Text for security or network protocol
   */
  protocol: "Protocol",
  /**
   * @description Text in Network Log View Columns of the Network panel
   */
  scheme: "Scheme",
  /**
   * @description Text for the domain of a website
   */
  domain: "Domain",
  /**
   * @description Text in Network Log View Columns of the Network panel
   */
  remoteAddress: "Remote Address",
  /**
   * @description Text that refers to some types
   */
  type: "Type",
  /**
   * @description Text for the initiator of something
   */
  initiator: "Initiator",
  /**
   * @description Column header in the Network log view of the Network panel
   */
  hasOverrides: "Has overrides",
  /**
   * @description Column header in the Network log view of the Network panel
   */
  initiatorAddressSpace: "Initiator Address Space",
  /**
   * @description Text for web cookies
   */
  cookies: "Cookies",
  /**
   * @description Text in Network Log View Columns of the Network panel
   */
  setCookies: "Set Cookies",
  /**
   * @description Text for the size of something
   */
  size: "Size",
  /**
   * @description Text in Network Log View Columns of the Network panel
   */
  content: "Content",
  /**
   * @description Noun that refers to a duration in milliseconds.
   */
  time: "Time",
  /**
   * @description Text to show the priority of an item
   */
  priority: "Priority",
  /**
   * @description Text in Network Log View Columns of the Network panel
   */
  connectionId: "Connection ID",
  /**
   * @description Text in Network Log View Columns of the Network panel
   */
  remoteAddressSpace: "Remote Address Space",
  /**
   * @description Text to show whether a request is ad-related
   */
  isAdRelated: "Is Ad-Related"
};
var str_18 = i18n35.i18n.registerUIStrings("panels/network/NetworkLogViewColumns.ts", UIStrings18);
var i18nString18 = i18n35.i18n.getLocalizedString.bind(void 0, str_18);
var i18nLazyString3 = i18n35.i18n.getLazilyComputedLocalizedString.bind(void 0, str_18);
var NetworkLogViewColumns = class _NetworkLogViewColumns {
  networkLogView;
  persistentSettings;
  networkLogLargeRowsSetting;
  eventDividers;
  eventDividersShown;
  gridMode;
  columns;
  waterfallRequestsAreStale;
  waterfallScrollerWidthIsStale;
  popupLinkifier;
  calculatorsMap;
  lastWheelTime;
  #dataGrid;
  splitWidget;
  waterfallColumn;
  activeScroller;
  dataGridScroller;
  waterfallScroller;
  waterfallScrollerContent;
  waterfallHeaderElement;
  waterfallColumnSortIcon;
  activeWaterfallSortId;
  popoverHelper;
  hasScrollerTouchStarted;
  scrollerTouchStartPos;
  constructor(networkLogView, timeCalculator, durationCalculator, networkLogLargeRowsSetting) {
    this.networkLogView = networkLogView;
    this.persistentSettings = Common15.Settings.Settings.instance().createSetting("network-log-columns", {});
    this.networkLogLargeRowsSetting = networkLogLargeRowsSetting;
    this.networkLogLargeRowsSetting.addChangeListener(this.updateRowsSize, this);
    this.eventDividers = /* @__PURE__ */ new Map();
    this.eventDividersShown = false;
    this.gridMode = true;
    this.columns = [];
    this.waterfallRequestsAreStale = false;
    this.waterfallScrollerWidthIsStale = true;
    this.popupLinkifier = new Components4.Linkifier.Linkifier();
    this.calculatorsMap = /* @__PURE__ */ new Map();
    this.calculatorsMap.set("Time", timeCalculator);
    this.calculatorsMap.set("Duration", durationCalculator);
    this.lastWheelTime = 0;
    this.setupDataGrid();
    this.setupWaterfall();
    ThemeSupport5.ThemeSupport.instance().addEventListener(ThemeSupport5.ThemeChangeEvent.eventName, () => {
      this.scheduleRefresh();
    });
  }
  static convertToDataGridDescriptor(columnConfig) {
    const title = columnConfig.title instanceof Function ? columnConfig.title() : columnConfig.title;
    return {
      id: columnConfig.id,
      title,
      sortable: columnConfig.sortable,
      align: columnConfig.align,
      nonSelectable: columnConfig.nonSelectable,
      weight: columnConfig.weight,
      allowInSortByEvenWhenHidden: columnConfig.allowInSortByEvenWhenHidden
    };
  }
  wasShown() {
    this.updateRowsSize();
  }
  willHide() {
    if (this.popoverHelper) {
      this.popoverHelper.hidePopover();
    }
  }
  reset() {
    if (this.popoverHelper) {
      this.popoverHelper.hidePopover();
    }
    this.eventDividers.clear();
  }
  setupDataGrid() {
    const defaultColumns = DEFAULT_COLUMNS;
    const defaultColumnConfig = DEFAULT_COLUMN_CONFIG;
    this.columns = [];
    for (const currentConfigColumn of defaultColumns) {
      const descriptor = Object.assign({}, defaultColumnConfig, currentConfigColumn);
      const columnConfig = descriptor;
      columnConfig.id = columnConfig.id;
      if (columnConfig.subtitle) {
        const title = columnConfig.title instanceof Function ? columnConfig.title() : columnConfig.title;
        const subtitle = columnConfig.subtitle instanceof Function ? columnConfig.subtitle() : columnConfig.subtitle;
        columnConfig.titleDOMFragment = this.makeHeaderFragment(title, subtitle);
      }
      this.columns.push(columnConfig);
    }
    this.loadCustomColumnsAndSettings();
    this.popoverHelper = new UI21.PopoverHelper.PopoverHelper(this.networkLogView.element, this.getPopoverRequest.bind(this), "network.initiator-stacktrace");
    this.popoverHelper.setTimeout(300, 300);
    this.#dataGrid = new DataGrid7.SortableDataGrid.SortableDataGrid({
      displayName: i18nString18(UIStrings18.networkLog),
      columns: this.columns.map(_NetworkLogViewColumns.convertToDataGridDescriptor),
      deleteCallback: void 0,
      refreshCallback: void 0
    });
    this.dataGridScroller = this.#dataGrid.scrollContainer;
    this.updateColumns();
    this.#dataGrid.addEventListener("SortingChanged", this.sortHandler, this);
    this.#dataGrid.setHeaderContextMenuCallback(this.#headerContextMenu.bind(this));
    this.activeWaterfallSortId = WaterfallSortIds.StartTime;
    this.#dataGrid.markColumnAsSortedBy(INITIAL_SORT_COLUMN, DataGrid7.DataGrid.Order.Ascending);
    this.splitWidget = new UI21.SplitWidget.SplitWidget(true, true, "network-panel-split-view-waterfall", 200);
    const widget = this.#dataGrid.asWidget();
    widget.setMinimumSize(150, 0);
    this.splitWidget.setMainWidget(widget);
  }
  setupWaterfall() {
    this.waterfallColumn = new NetworkWaterfallColumn(this.networkLogView.calculator());
    this.waterfallColumn.element.addEventListener("contextmenu", handleContextMenu.bind(this));
    this.waterfallColumn.element.addEventListener("wheel", this.onMouseWheel.bind(this, false), { passive: true });
    this.waterfallColumn.element.addEventListener("touchstart", this.onTouchStart.bind(this));
    this.waterfallColumn.element.addEventListener("touchmove", this.onTouchMove.bind(this));
    this.waterfallColumn.element.addEventListener("touchend", this.onTouchEnd.bind(this));
    this.dataGridScroller.addEventListener("wheel", this.onMouseWheel.bind(this, true), true);
    this.dataGridScroller.addEventListener("touchstart", this.onTouchStart.bind(this));
    this.dataGridScroller.addEventListener("touchmove", this.onTouchMove.bind(this));
    this.dataGridScroller.addEventListener("touchend", this.onTouchEnd.bind(this));
    this.waterfallScroller = this.waterfallColumn.contentElement.createChild("div", "network-waterfall-v-scroll");
    this.waterfallScrollerContent = this.waterfallScroller.createChild("div", "network-waterfall-v-scroll-content");
    this.#dataGrid.addEventListener("PaddingChanged", () => {
      this.waterfallScrollerWidthIsStale = true;
      this.syncScrollers();
    });
    this.#dataGrid.addEventListener("ViewportCalculated", this.redrawWaterfallColumn.bind(this));
    this.createWaterfallHeader();
    this.waterfallColumn.contentElement.classList.add("network-waterfall-view");
    this.waterfallColumn.setMinimumSize(100, 0);
    this.splitWidget.setSidebarWidget(this.waterfallColumn);
    this.switchViewMode(false);
    function handleContextMenu(event) {
      const node = this.waterfallColumn.getNodeFromPoint(event.offsetY);
      if (!node) {
        return;
      }
      const request = node.request();
      if (!request) {
        return;
      }
      const contextMenu = new UI21.ContextMenu.ContextMenu(event);
      this.networkLogView.handleContextMenuForRequest(contextMenu, request);
      void contextMenu.show();
    }
  }
  onMouseWheel(shouldConsume, event) {
    if (shouldConsume) {
      event.consume(true);
    }
    const hasRecentWheel = Date.now() - this.lastWheelTime < 80;
    this.activeScroller.scrollBy({ top: event.deltaY, behavior: hasRecentWheel ? "auto" : "smooth" });
    this.syncScrollers();
    this.lastWheelTime = Date.now();
  }
  onTouchStart(event) {
    this.hasScrollerTouchStarted = true;
    this.scrollerTouchStartPos = event.changedTouches[0].pageY;
  }
  onTouchMove(event) {
    if (!this.hasScrollerTouchStarted) {
      return;
    }
    const currentPos = event.changedTouches[0].pageY;
    const delta = this.scrollerTouchStartPos - currentPos;
    this.activeScroller.scrollBy({ top: delta, behavior: "auto" });
    this.syncScrollers();
    this.scrollerTouchStartPos = currentPos;
  }
  onTouchEnd() {
    this.hasScrollerTouchStarted = false;
  }
  syncScrollers() {
    if (!this.waterfallColumn.isShowing()) {
      return;
    }
    this.waterfallScrollerContent.style.height = this.dataGridScroller.scrollHeight - this.#dataGrid.headerHeight() + "px";
    this.updateScrollerWidthIfNeeded();
    this.dataGridScroller.scrollTop = this.waterfallScroller.scrollTop;
  }
  updateScrollerWidthIfNeeded() {
    if (this.waterfallScrollerWidthIsStale) {
      this.waterfallScrollerWidthIsStale = false;
      this.waterfallColumn.setRightPadding(this.waterfallScroller.offsetWidth - this.waterfallScrollerContent.offsetWidth);
    }
  }
  redrawWaterfallColumn() {
    if (!this.waterfallRequestsAreStale) {
      this.updateScrollerWidthIfNeeded();
      this.waterfallColumn.update(this.activeScroller.scrollTop, this.eventDividersShown ? this.eventDividers : void 0);
      return;
    }
    this.syncScrollers();
    const nodes = this.networkLogView.flatNodesList();
    this.waterfallColumn.update(this.activeScroller.scrollTop, this.eventDividers, nodes);
  }
  createWaterfallHeader() {
    this.waterfallHeaderElement = this.waterfallColumn.contentElement.createChild("div", "network-waterfall-header");
    this.waterfallHeaderElement.setAttribute("jslog", `${VisualLogging12.tableHeader("waterfall").track({ click: true })}`);
    this.waterfallHeaderElement.addEventListener("click", waterfallHeaderClicked.bind(this));
    this.waterfallHeaderElement.addEventListener("contextmenu", (event) => {
      const contextMenu = new UI21.ContextMenu.ContextMenu(event);
      this.#headerContextMenu(contextMenu);
      void contextMenu.show();
    });
    this.waterfallHeaderElement.createChild("div", "hover-layer");
    const innerElement = this.waterfallHeaderElement.createChild("div");
    innerElement.textContent = i18nString18(UIStrings18.waterfall);
    this.waterfallColumnSortIcon = new IconButton6.Icon.Icon();
    this.waterfallColumnSortIcon.className = "sort-order-icon";
    this.waterfallHeaderElement.createChild("div", "sort-order-icon-container").appendChild(this.waterfallColumnSortIcon);
    function waterfallHeaderClicked() {
      const sortOrders = DataGrid7.DataGrid.Order;
      const wasSortedByWaterfall = this.#dataGrid.sortColumnId() === "waterfall";
      const wasSortedAscending = this.#dataGrid.isSortOrderAscending();
      const sortOrder = wasSortedByWaterfall && wasSortedAscending ? sortOrders.Descending : sortOrders.Ascending;
      this.#dataGrid.markColumnAsSortedBy("waterfall", sortOrder);
      this.sortHandler();
    }
  }
  setCalculator(x) {
    this.waterfallColumn.setCalculator(x);
  }
  scheduleRefresh() {
    this.waterfallColumn.scheduleDraw();
  }
  updateRowsSize() {
    const largeRows = Boolean(this.networkLogLargeRowsSetting.get());
    this.#dataGrid.element.classList.toggle("small", !largeRows);
    this.#dataGrid.scheduleUpdate();
    this.waterfallScrollerWidthIsStale = true;
    this.waterfallColumn.setRowHeight(largeRows ? 41 : 21);
    this.waterfallScroller.classList.toggle("small", !largeRows);
    this.waterfallHeaderElement.classList.toggle("small", !largeRows);
    window.requestAnimationFrame(() => {
      this.waterfallColumn.setHeaderHeight(this.waterfallScroller.offsetTop);
      this.waterfallColumn.scheduleDraw();
    });
  }
  show(element) {
    this.splitWidget.show(element);
  }
  setHidden(value) {
    UI21.ARIAUtils.setHidden(this.splitWidget.element, value);
  }
  dataGrid() {
    return this.#dataGrid;
  }
  sortByCurrentColumn() {
    this.sortHandler();
  }
  filterChanged() {
    window.requestAnimationFrame(() => {
      this.#dataGrid.scheduleUpdate();
    });
  }
  sortHandler() {
    const columnId = this.#dataGrid.sortColumnId();
    this.networkLogView.removeAllNodeHighlights();
    this.waterfallRequestsAreStale = true;
    if (columnId === "waterfall") {
      if (this.#dataGrid.sortOrder() === DataGrid7.DataGrid.Order.Ascending) {
        this.waterfallColumnSortIcon.name = "triangle-up";
      } else {
        this.waterfallColumnSortIcon.name = "triangle-down";
      }
      this.waterfallColumnSortIcon.hidden = false;
      const sortFunction = NetworkRequestNode.RequestPropertyComparator.bind(null, this.activeWaterfallSortId);
      this.#dataGrid.sortNodes(sortFunction, !this.#dataGrid.isSortOrderAscending());
      this.dataGridSortedForTest();
      return;
    }
    this.waterfallColumnSortIcon.hidden = true;
    this.waterfallColumnSortIcon.name = null;
    const columnConfig = this.columns.find((columnConfig2) => columnConfig2.id === columnId);
    if (!columnConfig?.sortingFunction) {
      return;
    }
    const sortingFunction = columnConfig.sortingFunction;
    if (!sortingFunction) {
      return;
    }
    this.#dataGrid.sortNodes(sortingFunction, !this.#dataGrid.isSortOrderAscending());
    this.dataGridSortedForTest();
  }
  dataGridSortedForTest() {
  }
  updateColumns() {
    if (!this.#dataGrid) {
      return;
    }
    const visibleColumns = /* @__PURE__ */ new Set();
    if (this.gridMode) {
      for (const columnConfig of this.columns) {
        if (columnConfig.id === "waterfall") {
          this.setWaterfallVisibility(columnConfig.visible);
        } else if (columnConfig.visible) {
          visibleColumns.add(columnConfig.id);
        }
      }
    } else {
      const visibleColumn = this.columns.find((c) => c.hideableGroup === "path" && c.visible);
      if (visibleColumn) {
        visibleColumns.add(visibleColumn.id);
      } else {
        visibleColumns.add("name");
      }
      this.setWaterfallVisibility(false);
    }
    this.#dataGrid.setColumnsVisibility(visibleColumns);
  }
  switchViewMode(gridMode) {
    if (this.gridMode === gridMode) {
      return;
    }
    this.gridMode = gridMode;
    this.updateColumns();
    this.updateRowsSize();
  }
  toggleColumnVisibility(columnConfig) {
    this.loadCustomColumnsAndSettings();
    columnConfig.visible = !columnConfig.visible;
    this.saveColumnsSettings();
    this.updateColumns();
    this.updateRowsSize();
  }
  setWaterfallVisibility(visible) {
    if (!this.splitWidget) {
      return;
    }
    this.networkLogView.element.classList.toggle("has-waterfall", visible);
    if (visible) {
      this.splitWidget.showBoth();
      this.activeScroller = this.waterfallScroller;
      this.waterfallScroller.scrollTop = this.dataGridScroller.scrollTop;
      this.#dataGrid.setScrollContainer(this.waterfallScroller);
    } else {
      this.networkLogView.removeAllNodeHighlights();
      this.splitWidget.hideSidebar();
      this.activeScroller = this.dataGridScroller;
      this.#dataGrid.setScrollContainer(this.dataGridScroller);
    }
  }
  saveColumnsSettings() {
    const saveableSettings = {};
    for (const columnConfig of this.columns) {
      saveableSettings[columnConfig.id] = {
        visible: columnConfig.visible,
        title: columnConfig.title
      };
    }
    this.persistentSettings.set(saveableSettings);
  }
  loadCustomColumnsAndSettings() {
    const savedSettings = this.persistentSettings.get();
    const columnIds = Object.keys(savedSettings);
    for (const columnId of columnIds) {
      const setting = savedSettings[columnId];
      let columnConfig = this.columns.find((columnConfig2) => columnConfig2.id === columnId);
      if (!columnConfig && setting.title) {
        columnConfig = this.addCustomHeader(setting.title, columnId) || void 0;
      }
      if (columnConfig) {
        if (columnConfig.hideable && typeof setting.visible === "boolean") {
          columnConfig.visible = Boolean(setting.visible);
        }
        if (typeof setting.title === "string") {
          columnConfig.title = setting.title;
        }
      }
    }
  }
  makeHeaderFragment(title, subtitle) {
    const fragment = document.createDocumentFragment();
    UI21.UIUtils.createTextChild(fragment, title);
    const subtitleDiv = fragment.createChild("div", "network-header-subtitle");
    UI21.UIUtils.createTextChild(subtitleDiv, subtitle);
    return fragment;
  }
  #headerContextMenu(contextMenu) {
    const columnConfigs = this.columns.filter((columnConfig) => columnConfig.hideable);
    const nonRequestResponseHeaders = columnConfigs.filter((columnConfig) => !columnConfig.isRequestHeader && !columnConfig.isResponseHeader);
    const hideableGroups = /* @__PURE__ */ new Map();
    const nonRequestResponseHeadersWithoutGroup = [];
    for (const columnConfig of nonRequestResponseHeaders) {
      if (!columnConfig.hideableGroup) {
        nonRequestResponseHeadersWithoutGroup.push(columnConfig);
      } else {
        const name = columnConfig.hideableGroup;
        let hideableGroup = hideableGroups.get(name);
        if (!hideableGroup) {
          hideableGroup = [];
          hideableGroups.set(name, hideableGroup);
        }
        hideableGroup.push(columnConfig);
      }
    }
    for (const group of hideableGroups.values()) {
      const visibleColumns = group.filter((columnConfig) => columnConfig.visible);
      for (const columnConfig of group) {
        const disabled = visibleColumns.length === 1 && visibleColumns[0] === columnConfig;
        const title = columnConfig.title instanceof Function ? columnConfig.title() : columnConfig.title;
        contextMenu.headerSection().appendCheckboxItem(title, this.toggleColumnVisibility.bind(this, columnConfig), { checked: columnConfig.visible, disabled, jslogContext: columnConfig.id });
      }
      contextMenu.headerSection().appendSeparator();
    }
    for (const columnConfig of nonRequestResponseHeadersWithoutGroup) {
      const title = columnConfig.title instanceof Function ? columnConfig.title() : columnConfig.title;
      contextMenu.headerSection().appendCheckboxItem(title, this.toggleColumnVisibility.bind(this, columnConfig), { checked: columnConfig.visible, jslogContext: columnConfig.id });
    }
    const responseSubMenu = contextMenu.footerSection().appendSubMenuItem(i18nString18(UIStrings18.responseHeaders), false, "response-headers");
    const responseHeaders = columnConfigs.filter((columnConfig) => columnConfig.isResponseHeader);
    for (const columnConfig of responseHeaders) {
      const title = columnConfig.title instanceof Function ? columnConfig.title() : columnConfig.title;
      responseSubMenu.defaultSection().appendCheckboxItem(title, this.toggleColumnVisibility.bind(this, columnConfig), { checked: columnConfig.visible, jslogContext: columnConfig.id });
    }
    responseSubMenu.footerSection().appendItem(i18nString18(UIStrings18.manageHeaderColumns), this.manageResponseCustomHeaderDialog.bind(this), { jslogContext: "manage-header-columns" });
    const requestSubMenu = contextMenu.footerSection().appendSubMenuItem(i18nString18(UIStrings18.requestHeaders), false, "request-headers");
    const requestHeaders = columnConfigs.filter((columnConfig) => columnConfig.isRequestHeader);
    for (const columnConfig of requestHeaders) {
      const title = columnConfig.title instanceof Function ? columnConfig.title() : columnConfig.title;
      requestSubMenu.defaultSection().appendCheckboxItem(title, this.toggleColumnVisibility.bind(this, columnConfig), { checked: columnConfig.visible, jslogContext: columnConfig.id });
    }
    requestSubMenu.footerSection().appendItem(i18nString18(UIStrings18.manageHeaderColumns), this.manageRequestCustomHeaderDialog.bind(this), { jslogContext: "manage-header-columns" });
    const waterfallSortIds = WaterfallSortIds;
    const waterfallSubMenu = contextMenu.footerSection().appendSubMenuItem(i18nString18(UIStrings18.waterfall), false, "waterfall");
    waterfallSubMenu.defaultSection().appendCheckboxItem(i18nString18(UIStrings18.startTime), setWaterfallMode.bind(this, waterfallSortIds.StartTime), { checked: this.activeWaterfallSortId === waterfallSortIds.StartTime, jslogContext: "start-time" });
    waterfallSubMenu.defaultSection().appendCheckboxItem(i18nString18(UIStrings18.responseTime), setWaterfallMode.bind(this, waterfallSortIds.ResponseTime), { checked: this.activeWaterfallSortId === waterfallSortIds.ResponseTime, jslogContext: "response-time" });
    waterfallSubMenu.defaultSection().appendCheckboxItem(i18nString18(UIStrings18.endTime), setWaterfallMode.bind(this, waterfallSortIds.EndTime), { checked: this.activeWaterfallSortId === waterfallSortIds.EndTime, jslogContext: "end-time" });
    waterfallSubMenu.defaultSection().appendCheckboxItem(i18nString18(UIStrings18.totalDuration), setWaterfallMode.bind(this, waterfallSortIds.Duration), { checked: this.activeWaterfallSortId === waterfallSortIds.Duration, jslogContext: "total-duration" });
    waterfallSubMenu.defaultSection().appendCheckboxItem(i18nString18(UIStrings18.latency), setWaterfallMode.bind(this, waterfallSortIds.Latency), { checked: this.activeWaterfallSortId === waterfallSortIds.Latency, jslogContext: "latency" });
    function setWaterfallMode(sortId) {
      let calculator = this.calculatorsMap.get(
        "Time"
        /* CalculatorTypes.TIME */
      );
      const waterfallSortIds2 = WaterfallSortIds;
      if (sortId === waterfallSortIds2.Duration || sortId === waterfallSortIds2.Latency) {
        calculator = this.calculatorsMap.get(
          "Duration"
          /* CalculatorTypes.DURATION */
        );
      }
      this.networkLogView.setCalculator(calculator);
      this.activeWaterfallSortId = sortId;
      this.#dataGrid.markColumnAsSortedBy("waterfall", DataGrid7.DataGrid.Order.Ascending);
      this.sortHandler();
    }
  }
  manageRequestCustomHeaderDialog() {
    const customHeadersRequest = [];
    for (const columnConfig of this.columns) {
      const title = columnConfig.title instanceof Function ? columnConfig.title() : columnConfig.title;
      if (columnConfig.isRequestHeader) {
        customHeadersRequest.push({ title, editable: columnConfig.isCustomHeader });
      }
    }
    const manageCustomHeadersRequest = new NetworkManageCustomHeadersView(customHeadersRequest, (headerTitle) => Boolean(this.addCustomHeader(headerTitle, `request-header-${headerTitle}`)), (oldHeaderId, headerTitle) => Boolean(this.changeCustomHeader(`request-header-${oldHeaderId}`, headerTitle, `request-header-${headerTitle}`)), (headerTitle) => Boolean(this.removeCustomHeader(`request-header-${headerTitle}`)));
    const dialogRequest = new UI21.Dialog.Dialog("manage-custom-request-headers");
    manageCustomHeadersRequest.show(dialogRequest.contentElement);
    dialogRequest.setSizeBehavior(
      "MeasureContent"
      /* UI.GlassPane.SizeBehavior.MEASURE_CONTENT */
    );
    dialogRequest.show(this.networkLogView.element);
  }
  manageResponseCustomHeaderDialog() {
    const customHeadersResponse = [];
    for (const columnConfig of this.columns) {
      const title = columnConfig.title instanceof Function ? columnConfig.title() : columnConfig.title;
      if (columnConfig.isResponseHeader) {
        customHeadersResponse.push({ title, editable: columnConfig.isCustomHeader });
      }
    }
    const manageCustomHeadersResponse = new NetworkManageCustomHeadersView(customHeadersResponse, (headerTitle) => Boolean(this.addCustomHeader(headerTitle, `response-header-${headerTitle}`)), (oldHeaderId, headerTitle) => Boolean(this.changeCustomHeader(`response-header-${oldHeaderId}`, headerTitle, `response-header-${headerTitle}`)), (headerTitle) => Boolean(this.removeCustomHeader(`response-header-${headerTitle}`)));
    const dialogResponse = new UI21.Dialog.Dialog("manage-custom-response-headers");
    manageCustomHeadersResponse.show(dialogResponse.contentElement);
    dialogResponse.setSizeBehavior(
      "MeasureContent"
      /* UI.GlassPane.SizeBehavior.MEASURE_CONTENT */
    );
    dialogResponse.show(this.networkLogView.element);
  }
  removeCustomHeader(headerId) {
    headerId = headerId.toLowerCase();
    const index = this.columns.findIndex((columnConfig) => columnConfig.id === headerId);
    if (index === -1) {
      return false;
    }
    this.columns.splice(index, 1);
    this.#dataGrid.removeColumn(headerId);
    this.saveColumnsSettings();
    this.updateColumns();
    return true;
  }
  addCustomHeader(headerTitle, headerId, index) {
    if (!headerId) {
      headerId = headerTitle;
    }
    headerId = headerId.toLowerCase();
    if (index === void 0) {
      index = this.columns.length - 1;
    }
    const currentColumnConfig = this.columns.find((columnConfig2) => columnConfig2.id === headerId);
    if (currentColumnConfig) {
      return null;
    }
    const isRequestHeader = headerId.startsWith("request-header-");
    const sortingFunction = isRequestHeader ? NetworkRequestNode.RequestHeaderStringComparator.bind(null, headerId) : NetworkRequestNode.ResponseHeaderStringComparator.bind(null, headerId);
    const columnConfigBase = Object.assign({}, DEFAULT_COLUMN_CONFIG, {
      id: headerId,
      title: headerTitle,
      isRequestHeader,
      isResponseHeader: !isRequestHeader,
      isCustomHeader: true,
      visible: true,
      sortingFunction
    });
    const columnConfig = columnConfigBase;
    this.columns.splice(index, 0, columnConfig);
    if (this.#dataGrid) {
      this.#dataGrid.addColumn(_NetworkLogViewColumns.convertToDataGridDescriptor(columnConfig), index);
    }
    this.saveColumnsSettings();
    this.updateColumns();
    return columnConfig;
  }
  changeCustomHeader(oldHeaderId, newHeaderTitle, newHeaderId) {
    const headerType = oldHeaderId.startsWith("request-header-") ? "request" : "response";
    if (!newHeaderId) {
      newHeaderId = `${headerType}-header-${newHeaderTitle.toLowerCase()}`;
    }
    oldHeaderId = oldHeaderId.toLowerCase();
    const oldIndex = this.columns.findIndex((columnConfig) => columnConfig.id === oldHeaderId);
    const oldColumnConfig = this.columns[oldIndex];
    const currentColumnConfig = this.columns.find((columnConfig) => columnConfig.id === newHeaderId);
    if (!oldColumnConfig || currentColumnConfig && oldHeaderId !== newHeaderId) {
      return false;
    }
    this.removeCustomHeader(oldHeaderId);
    this.addCustomHeader(newHeaderTitle, newHeaderId, oldIndex);
    return true;
  }
  getPopoverRequest(event) {
    if (!this.gridMode) {
      return null;
    }
    const hoveredNode = this.networkLogView.hoveredNode();
    if (!hoveredNode || !event.target) {
      return null;
    }
    const anchor = event.target.enclosingNodeOrSelfWithClass("network-script-initiated");
    if (!anchor) {
      return null;
    }
    const request = hoveredNode.request();
    if (!request) {
      return null;
    }
    return {
      box: anchor.boxInWindow(),
      show: async (popover) => {
        this.popupLinkifier.addEventListener("liveLocationUpdated", () => {
          popover.setSizeBehavior(
            "MeasureContent"
            /* UI.GlassPane.SizeBehavior.MEASURE_CONTENT */
          );
        });
        const content = RequestInitiatorView.createStackTracePreview(request, this.popupLinkifier, false);
        if (!content) {
          return false;
        }
        content.show(popover.contentElement);
        return true;
      },
      hide: this.popupLinkifier.reset.bind(this.popupLinkifier)
    };
  }
  addEventDividers(times, className) {
    let color = "transparent";
    switch (className) {
      case "network-dcl-divider":
        color = ThemeSupport5.ThemeSupport.instance().getComputedValue("--sys-color-blue");
        break;
      case "network-load-divider":
        color = ThemeSupport5.ThemeSupport.instance().getComputedValue("--sys-color-error");
        break;
      default:
        return;
    }
    const currentTimes = this.eventDividers.get(color) || [];
    this.eventDividers.set(color, currentTimes.concat(times));
    this.networkLogView.scheduleRefresh();
  }
  hideEventDividers() {
    this.eventDividersShown = true;
    this.redrawWaterfallColumn();
  }
  showEventDividers() {
    this.eventDividersShown = false;
    this.redrawWaterfallColumn();
  }
  selectFilmStripFrame(time) {
    this.eventDividers.set(FILM_STRIP_DIVIDER_COLOR, [time]);
    this.redrawWaterfallColumn();
  }
  clearFilmStripFrame() {
    this.eventDividers.delete(FILM_STRIP_DIVIDER_COLOR);
    this.redrawWaterfallColumn();
  }
};
var INITIAL_SORT_COLUMN = "waterfall";
var DEFAULT_COLUMN_CONFIG = {
  subtitle: null,
  visible: false,
  weight: 6,
  sortable: true,
  hideable: true,
  hideableGroup: null,
  nonSelectable: false,
  isRequestHeader: false,
  isResponseHeader: false,
  isCustomHeader: false,
  allowInSortByEvenWhenHidden: false
};
var DEFAULT_COLUMNS = [
  {
    id: "name",
    title: i18nLazyString3(UIStrings18.name),
    subtitle: i18nLazyString3(UIStrings18.path),
    visible: true,
    weight: 20,
    hideable: true,
    hideableGroup: "path",
    sortingFunction: NetworkRequestNode.NameComparator
  },
  {
    id: "path",
    title: i18nLazyString3(UIStrings18.path),
    hideable: true,
    hideableGroup: "path",
    sortingFunction: NetworkRequestNode.RequestPropertyComparator.bind(null, "pathname")
  },
  {
    id: "url",
    title: i18nLazyString3(UIStrings18.url),
    hideable: true,
    hideableGroup: "path",
    sortingFunction: NetworkRequestNode.RequestURLComparator
  },
  {
    id: "method",
    title: i18nLazyString3(UIStrings18.method),
    sortingFunction: NetworkRequestNode.RequestPropertyComparator.bind(null, "requestMethod")
  },
  {
    id: "status",
    title: i18nLazyString3(UIStrings18.status),
    visible: true,
    subtitle: i18nLazyString3(UIStrings18.text),
    sortingFunction: NetworkRequestNode.RequestPropertyComparator.bind(null, "statusCode")
  },
  {
    id: "protocol",
    title: i18nLazyString3(UIStrings18.protocol),
    sortingFunction: NetworkRequestNode.RequestPropertyComparator.bind(null, "protocol")
  },
  {
    id: "scheme",
    title: i18nLazyString3(UIStrings18.scheme),
    sortingFunction: NetworkRequestNode.RequestPropertyComparator.bind(null, "scheme")
  },
  {
    id: "domain",
    title: i18nLazyString3(UIStrings18.domain),
    sortingFunction: NetworkRequestNode.RequestPropertyComparator.bind(null, "domain")
  },
  {
    id: "remote-address",
    title: i18nLazyString3(UIStrings18.remoteAddress),
    weight: 10,
    align: "right",
    sortingFunction: NetworkRequestNode.RemoteAddressComparator
  },
  {
    id: "remote-address-space",
    title: i18nLazyString3(UIStrings18.remoteAddressSpace),
    visible: false,
    weight: 10,
    sortingFunction: NetworkRequestNode.RemoteAddressSpaceComparator
  },
  {
    id: "type",
    title: i18nLazyString3(UIStrings18.type),
    visible: true,
    sortingFunction: NetworkRequestNode.TypeComparator
  },
  {
    id: "initiator",
    title: i18nLazyString3(UIStrings18.initiator),
    visible: true,
    weight: 10,
    sortingFunction: NetworkRequestNode.InitiatorComparator
  },
  {
    id: "initiator-address-space",
    title: i18nLazyString3(UIStrings18.initiatorAddressSpace),
    visible: false,
    weight: 10,
    sortingFunction: NetworkRequestNode.InitiatorAddressSpaceComparator
  },
  {
    id: "cookies",
    title: i18nLazyString3(UIStrings18.cookies),
    align: "right",
    sortingFunction: NetworkRequestNode.RequestCookiesCountComparator
  },
  {
    id: "set-cookies",
    title: i18nLazyString3(UIStrings18.setCookies),
    align: "right",
    sortingFunction: NetworkRequestNode.ResponseCookiesCountComparator
  },
  {
    id: "size",
    title: i18nLazyString3(UIStrings18.size),
    visible: true,
    subtitle: i18nLazyString3(UIStrings18.content),
    align: "right",
    sortingFunction: NetworkRequestNode.SizeComparator
  },
  {
    id: "time",
    title: i18nLazyString3(UIStrings18.time),
    visible: true,
    subtitle: i18nLazyString3(UIStrings18.latency),
    align: "right",
    sortingFunction: NetworkRequestNode.RequestPropertyComparator.bind(null, "duration")
  },
  { id: "priority", title: i18nLazyString3(UIStrings18.priority), sortingFunction: NetworkRequestNode.PriorityComparator },
  {
    id: "connection-id",
    title: i18nLazyString3(UIStrings18.connectionId),
    sortingFunction: NetworkRequestNode.RequestPropertyComparator.bind(null, "connectionId")
  },
  {
    id: "response-header-cache-control",
    isResponseHeader: true,
    title: i18n35.i18n.lockedLazyString("Cache-Control"),
    sortingFunction: NetworkRequestNode.ResponseHeaderStringComparator.bind(null, "cache-control")
  },
  {
    id: "response-header-connection",
    isResponseHeader: true,
    title: i18n35.i18n.lockedLazyString("Connection"),
    sortingFunction: NetworkRequestNode.ResponseHeaderStringComparator.bind(null, "connection")
  },
  {
    id: "response-header-content-encoding",
    isResponseHeader: true,
    title: i18n35.i18n.lockedLazyString("Content-Encoding"),
    sortingFunction: NetworkRequestNode.ResponseHeaderStringComparator.bind(null, "content-encoding")
  },
  {
    id: "response-header-content-length",
    isResponseHeader: true,
    title: i18n35.i18n.lockedLazyString("Content-Length"),
    align: "right",
    sortingFunction: NetworkRequestNode.ResponseHeaderNumberComparator.bind(null, "content-length")
  },
  {
    id: "response-header-etag",
    isResponseHeader: true,
    title: i18n35.i18n.lockedLazyString("ETag"),
    sortingFunction: NetworkRequestNode.ResponseHeaderStringComparator.bind(null, "etag")
  },
  {
    id: "response-header-has-overrides",
    title: i18nLazyString3(UIStrings18.hasOverrides),
    sortingFunction: NetworkRequestNode.ResponseHeaderStringComparator.bind(null, "has-overrides")
  },
  {
    id: "response-header-keep-alive",
    isResponseHeader: true,
    title: i18n35.i18n.lockedLazyString("Keep-Alive"),
    sortingFunction: NetworkRequestNode.ResponseHeaderStringComparator.bind(null, "keep-alive")
  },
  {
    id: "response-header-last-modified",
    isResponseHeader: true,
    title: i18n35.i18n.lockedLazyString("Last-Modified"),
    sortingFunction: NetworkRequestNode.ResponseHeaderDateComparator.bind(null, "last-modified")
  },
  {
    id: "response-header-server",
    isResponseHeader: true,
    title: i18n35.i18n.lockedLazyString("Server"),
    sortingFunction: NetworkRequestNode.ResponseHeaderStringComparator.bind(null, "server")
  },
  {
    id: "response-header-vary",
    isResponseHeader: true,
    title: i18n35.i18n.lockedLazyString("Vary"),
    sortingFunction: NetworkRequestNode.ResponseHeaderStringComparator.bind(null, "vary")
  },
  {
    id: "request-header-accept",
    isRequestHeader: true,
    title: i18n35.i18n.lockedLazyString("Accept"),
    sortingFunction: NetworkRequestNode.RequestHeaderStringComparator.bind(null, "accept")
  },
  {
    id: "request-header-accept-encoding",
    isRequestHeader: true,
    title: i18n35.i18n.lockedLazyString("Accept-Encoding"),
    sortingFunction: NetworkRequestNode.RequestHeaderStringComparator.bind(null, "accept-encoding")
  },
  {
    id: "request-header-accept-language",
    isRequestHeader: true,
    title: i18n35.i18n.lockedLazyString("Accept-Language"),
    sortingFunction: NetworkRequestNode.RequestHeaderStringComparator.bind(null, "accept-language")
  },
  {
    id: "request-header-content-type",
    isRequestHeader: true,
    title: i18n35.i18n.lockedLazyString("Content-Type"),
    sortingFunction: NetworkRequestNode.RequestHeaderStringComparator.bind(null, "Content-Type")
  },
  {
    id: "request-header-origin",
    isRequestHeader: true,
    title: i18n35.i18n.lockedLazyString("Origin"),
    sortingFunction: NetworkRequestNode.RequestHeaderStringComparator.bind(null, "origin")
  },
  {
    id: "request-header-referer",
    isRequestHeader: true,
    title: i18n35.i18n.lockedLazyString("Referer"),
    sortingFunction: NetworkRequestNode.RequestHeaderStringComparator.bind(null, "referer")
  },
  {
    id: "request-header-sec-fetch-dest",
    isRequestHeader: true,
    title: i18n35.i18n.lockedLazyString("Sec-Fetch-Dest"),
    sortingFunction: NetworkRequestNode.RequestHeaderStringComparator.bind(null, "sec-fetch-dest")
  },
  {
    id: "request-header-sec-fetch-mode",
    isRequestHeader: true,
    title: i18n35.i18n.lockedLazyString("Sec-Fetch-Mode"),
    sortingFunction: NetworkRequestNode.RequestHeaderStringComparator.bind(null, "sec-fetch-mode")
  },
  {
    id: "request-header-user-agent",
    isRequestHeader: true,
    title: i18n35.i18n.lockedLazyString("User-Agent"),
    sortingFunction: NetworkRequestNode.RequestHeaderStringComparator.bind(null, "user-agent")
  },
  {
    id: "is-ad-related",
    title: i18nLazyString3(UIStrings18.isAdRelated),
    sortingFunction: NetworkRequestNode.IsAdRelatedComparator
  },
  // This header is a placeholder to let datagrid know that it can be sorted by this column, but never shown.
  {
    id: "waterfall",
    title: i18nLazyString3(UIStrings18.waterfall),
    allowInSortByEvenWhenHidden: true
  }
];
var FILM_STRIP_DIVIDER_COLOR = "#fccc49";
var WaterfallSortIds;
(function(WaterfallSortIds2) {
  WaterfallSortIds2["StartTime"] = "startTime";
  WaterfallSortIds2["ResponseTime"] = "responseReceivedTime";
  WaterfallSortIds2["EndTime"] = "endTime";
  WaterfallSortIds2["Duration"] = "duration";
  WaterfallSortIds2["Latency"] = "latency";
})(WaterfallSortIds || (WaterfallSortIds = {}));

// gen/front_end/panels/network/NetworkLogView.js
var UIStrings19 = {
  /**
   * @description Text in Network Log View of the Network panel
   */
  invertFilter: "Invert",
  /**
   * @description Tooltip for the 'invert' checkbox in the Network panel.
   */
  invertsFilter: "Inverts the search filter",
  /**
   * @description Text in Network Log View of the Network panel
   */
  hideDataUrls: "Hide data URLs",
  /**
   * @description Data urlfilter ui element title in Network Log View of the Network panel
   */
  hidesDataAndBlobUrls: "Hide 'data:' and 'blob:' URLs",
  /**
   * @description Label for a filter in the Network panel
   */
  chromeExtensions: "Hide extension URLs",
  /**
   * @description Tooltip for a filter in the Network panel
   */
  hideChromeExtension: "Hide 'chrome-extension://' URLs",
  /**
   * @description Aria accessible name in Network Log View of the Network panel
   */
  requestTypesToInclude: "Request types to include",
  /**
   * @description Label for a checkbox in the Network panel. When checked, only requests with
   *             blocked response cookies are shown.
   */
  hasBlockedCookies: "Blocked response cookies",
  /**
   * @description Tooltip for a checkbox in the Network panel. The response to a network request may include a
   *             cookie (https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies). Such response cookies can
   *             be malformed or otherwise invalid and the browser may choose to ignore or not accept invalid cookies.
   */
  onlyShowRequestsWithBlockedCookies: "Show only requests with blocked response cookies",
  /**
   * @description Label for a filter in the Network panel
   */
  blockedRequests: "Blocked requests",
  /**
   * @description Tooltip for a filter in the Network panel
   */
  onlyShowBlockedRequests: "Show only blocked requests",
  /**
   * @description Label for a filter in the Network panel
   */
  thirdParty: "3rd-party requests",
  /**
   * @description Tooltip for a filter in the Network panel
   */
  onlyShowThirdPartyRequests: "Show only requests with origin different from page origin",
  /**
   * @description Label for a filter in the Network panel
   */
  ippRequests: "IP Protected requests",
  /**
   * @description Tooltip for a filter in the Network panel
   */
  onlyShowIPProtectedRequests: "Show only requests sent to IP Protection proxies. Has no effect in regular browsing.",
  /**
   * @description Text that appears when user drag and drop something (for example, a file) in Network Log View of the Network panel
   */
  dropHarFilesHere: "Drop HAR files here",
  /**
   * @description Recording text content in Network Log View of the Network panel
   */
  recordingNetworkActivity: "Currently recording network activity",
  /**
   * @description Shown in the Network Log View of the Network panel when the user has not yet
   *             recorded any network activity. This is an instruction to the user to reload the page in order to
   *             show network activity in the current UI.
   * @example {Reload page} PH1
   * @example {Ctrl + R} PH2
   */
  performARequestOrHitSToRecordThe: 'Perform a request or reload the page by using the "{PH1}" button or by pressing {PH2}.',
  /**
   * @description Shown in the Network Log View of the Network panel when the user has not yet
   * recorded any network activity. This is an instruction to the user to start recording in order to
   * show network activity in the current UI.
   * @example {Start recording} PH1
   * @example {Ctrl + E} PH2
   */
  recordToDisplayNetworkActivity: 'Record network log to display network activity by using the "{PH1}" button or by pressing {PH2}.',
  /**
   * @description Label of a button in the Network Log View of the Network panel.
   */
  reloadPage: "Reload page",
  /**
   * @description Label of a button in the Network Log View of the Network panel.
   */
  startRecording: "Start recording",
  /**
   * @description Shown in the Network Log View of the Network panel when the user has not yet
   *             recorded any network activity.
   */
  noNetworkActivityRecorded: "No network activity recorded",
  /**
   * @description Text to announce to screen readers that network data is available.
   */
  networkDataAvailable: "Network Data Available",
  /**
   * @description Text in Network Log View of the Network panel
   * @example {3} PH1
   * @example {5} PH2
   */
  sSRequests: "{PH1} / {PH2} requests",
  /**
   * @description Message in the summary toolbar at the bottom of the Network log that shows the compressed size of the
   * resources transferred during a selected time frame over the compressed size of all resources transferred during
   * the whole network log.
   * @example {5 B} PH1
   * @example {10 B} PH2
   */
  sSTransferred: "{PH1} / {PH2} transferred",
  /**
   * @description Message in a tooltip that shows the compressed size of the resources transferred during a selected
   * time frame over the compressed size of all resources transferred during the whole network log.
   * @example {10} PH1
   * @example {15} PH2
   */
  sBSBTransferredOverNetwork: "{PH1} B / {PH2} B transferred over network",
  /**
   * @description Text in Network Log View of the Network panel. Appears when a particular network
   * resource is selected by the user. Shows how large the selected resource was (PH1) out of the
   * total size (PH2).
   * @example {40MB} PH1
   * @example {50MB} PH2
   */
  sSResources: "{PH1} / {PH2} resources",
  /**
   * @description Text in Network Log View of the Network panel
   * @example {40} PH1
   * @example {50} PH2
   */
  sBSBResourcesLoadedByThePage: "{PH1} B / {PH2} B resources loaded by the page",
  /**
   * @description Text in Network Log View of the Network panel
   * @example {6} PH1
   */
  sRequests: "{PH1} requests",
  /**
   * @description Message in the summary toolbar at the bottom of the Network log that shows the compressed size of
   * all resources transferred over network during a network activity log.
   * @example {4 B} PH1
   */
  sTransferred: "{PH1} transferred",
  /**
   * @description Message in a tooltip that shows the compressed size of all resources transferred over network during
   * a network activity log.
   * @example {4} PH1
   */
  sBTransferredOverNetwork: "{PH1} B transferred over network",
  /**
   * @description Text in Network Log View of the Network panel
   * @example {4} PH1
   */
  sResources: "{PH1} resources",
  /**
   * @description Text in Network Log View of the Network panel
   * @example {10} PH1
   */
  sBResourcesLoadedByThePage: "{PH1} B resources loaded by the page",
  /**
   * @description Text in Network Log View of the Network panel
   * @example {120ms} PH1
   */
  finishS: "Finish: {PH1}",
  /**
   * @description Text in Network Log View of the Network panel
   * @example {3000ms} PH1
   */
  domcontentloadedS: "DOMContentLoaded: {PH1}",
  /**
   * @description Text in Network Log View of the Network panel
   * @example {40ms} PH1
   */
  loadS: "Load: {PH1}",
  /**
   * @description Text for copying
   */
  copy: "Copy",
  /**
   * @description A context menu command in the Network panel, for copying the URL of the selected request to the clipboard.
   */
  copyURL: "Copy URL",
  /**
   * @description Text in Network Log View of the Network panel
   */
  copyRequestHeaders: "Copy request headers",
  /**
   * @description Text in Network Log View of the Network panel
   */
  copyResponseHeaders: "Copy response headers",
  /**
   * @description Text in Network Log View of the Network panel
   */
  copyResponse: "Copy response",
  /**
   * @description Text in Network Log View of the Network panel
   */
  copyStacktrace: "Copy stack trace",
  /**
   * @description A context menu command in the Network panel, for copying to the clipboard.
   * PowerShell refers to the format the data will be copied as.
   */
  copyAsPowershell: "Copy as `PowerShell`",
  /**
   * @description A context menu command in the Network panel, for copying to the clipboard. 'fetch'
   * refers to the format the data will be copied as, which is compatible with the fetch web API.
   */
  copyAsFetch: "Copy as `fetch`",
  /**
   * @description Text in Network Log View of the Network panel. An action that copies a command to
   * the developer's clipboard. The command allows the developer to replay this specific network
   * request in Node.js, a desktop application/framework. 'Node.js fetch' is a noun phrase for the
   * type of request that will be copied.
   */
  copyAsNodejsFetch: "Copy as `fetch` (`Node.js`)",
  /**
   * @description Text in Network Log View of the Network panel. An action that copies a command to
   *the clipboard. It will copy the command in the format compatible with cURL (a program, not
   *translatable).
   */
  copyAsCurlCmd: "Copy as `cURL` (`cmd`)",
  /**
   * @description Text in Network Log View of the Network panel. An action that copies a command to
   *the clipboard. It will copy the command in the format compatible with a Bash script.
   */
  copyAsCurlBash: "Copy as `cURL` (`bash`)",
  /**
   * @description A context menu command in the Network panel, for copying the URLs of all requestes to the clipboard.
   */
  copyAllURLs: "Copy all URLs",
  /**
   * @description A context menu command in the Network panel, for copying the URLs of all requestes
   * (after applying the Network filter) to the clipboard.
   */
  copyAllListedURLs: "Copy all listed URLs",
  /**
   * @description Text in Network Log View of the Network panel. An action that copies a command to
   *the clipboard. It will copy the command in the format compatible with a PowerShell script to
   *represent all network requests.
   */
  copyAllAsPowershell: "Copy all as `PowerShell`",
  /**
   * @description Text in Network Log View of the Network panel. An action that copies a command to
   *the clipboard. It will copy the command in the format compatible with a PowerShell script to
   *represent all network requests (after applying the Network filter).
   */
  copyAllListedAsPowershell: "Copy all listed as `PowerShell`",
  /**
   * @description Text in Network Log View of the Network panel. An action that copies a command to
   *the clipboard. It will copy the command in the format compatible with a 'fetch' command (fetch
   *should not be translated) to represent all network requests.
   */
  copyAllAsFetch: "Copy all as `fetch`",
  /**
   * @description Text in Network Log View of the Network panel. An action that copies a command to
   *the clipboard. It will copy the command in the format compatible with a 'fetch' command (fetch
   *should not be translated) to represent all network requests (after applying the Network filter).
   */
  copyAllListedAsFetch: "Copy all listed as `fetch`",
  /**
   * @description Text in Network Log View of the Network panel. An action that copies a command to
   *the clipboard. It will copy the command in the format compatible with a Node.js 'fetch' command
   *(fetch and Node.js should not be translated) to represent all network requests.
   */
  copyAllAsNodejsFetch: "Copy all as `fetch` (`Node.js`)",
  /**
   * @description Text in Network Log View of the Network panel. An action that copies a command to
   *the clipboard. It will copy the command in the format compatible with a Node.js 'fetch' command
   *(fetch and Node.js should not be translated) to represent all network requests (after applying
   *the Network filter).
   */
  copyAllListedAsNodejsFetch: "Copy all listed as `fetch` (`Node.js`)",
  /**
   * @description Text in Network Log View of the Network panel. An action that copies a command to
   *the clipboard. It will copy the command in the format compatible with cURL (a program, not
   *translatable) to represent all network requests.
   */
  copyAllAsCurlCmd: "Copy all as `cURL` (`cmd`)",
  /**
   * @description Text in Network Log View of the Network panel. An action that copies a command to
   *the clipboard. It will copy the command in the format compatible with cURL (a program, not
   *translatable) to represent all network requests (after applying the Network filter).
   */
  copyAllListedAsCurlCmd: "Copy all listed as `cURL` (`cmd`)",
  /**
   * @description Text in Network Log View of the Network panel. An action that copies a command to
   *the clipboard. It will copy the command in the format compatible with a Bash script to represent
   *all network requests.
   */
  copyAllAsCurlBash: "Copy all as `cURL` (`bash`)",
  /**
   * @description Text in Network Log View of the Network panel. An action that copies a command to
   *the clipboard. It will copy the command in the format compatible with a Bash script to represent
   *all network requests (after applying the Network filter).
   */
  copyAllListedAsCurlBash: "Copy all listed as `cURL` (`bash`)",
  /**
   * @description Text in Network Log View of the Network panel. An action that copies a command to
   *the clipboard. It will copy the command in the format compatible with cURL (a program, not
   *translatable).
   */
  copyAsCurl: "Copy as `cURL`",
  /**
   * @description Text in Network Log View of the Network panel. An action that copies a command to
   *the clipboard. It will copy the command in the format compatible with cURL (a program, not
   *translatable) to represent all network requests.
   */
  copyAllAsCurl: "Copy all as `cURL`",
  /**
   * @description Text in Network Log View of the Network panel. An action that copies a command to
   *the clipboard. It will copy the command in the format compatible with cURL (a program, not
   *translatable) to represent all network requests (after applying the Network filter).
   */
  copyAllListedAsCurl: "Copy all listed as `cURL`",
  /**
   * @description Text in Network Log View of the Network panel. An action that copies data to the
   * clipboard. It will copy the data in the HAR (not translatable) format and scrub all potentially
   * sensitive data from the network requests. 'all' refers to every network request that is currently
   * shown.
   */
  copyAllAsHarSanitized: "Copy all as `HAR` (sanitized)",
  /**
   * @description Text in Network Log View of the Network panel. An action that copies data to the
   * clipboard. It will copy the data in the HAR (not translatable) format and include potentially
   * sensitive data from the network requests. 'all' refers to every network request that is currently
   * shown.
   */
  copyAllAsHarWithSensitiveData: "Copy all as `HAR` (with sensitive data)",
  /**
   * @description Text in Network Log View of the Network panel. An action that copies data to the
   * clipboard. It will copy the data in the HAR (not translatable) format and scrub all potentially
   * sensitive data from the network requests. 'all' refers to every network request that is currently
   * shown (after applying the Network filter).
   */
  copyAllListedAsHarSanitized: "Copy all listed as `HAR` (sanitized)",
  /**
   * @description Text in Network Log View of the Network panel. An action that copies data to the
   * clipboard. It will copy the data in the HAR (not translatable) format and include potentially
   * sensitive data from the network requests. 'all' refers to every network request that is currently
   * shown (after applying the Network filter).
   */
  copyAllListedAsHarWithSensitiveData: "Copy all listed as `HAR` (with sensitive data)",
  /**
   * @description A context menu item in the Network Log View of the Network panel
   */
  clearBrowserCache: "Clear browser cache",
  /**
   * @description A context menu item in the Network Log View of the Network panel
   */
  clearBrowserCookies: "Clear browser cookies",
  /**
   * @description A context menu item in the Network Log View of the Network panel
   */
  throttleRequests: "Throttle requests",
  /**
   * @description A context menu item in the Network Log View of the Network panel
   */
  throttleRequestUrl: "Throttle request URL",
  /**
   * @description A context menu item in the Network Log View of the Network panel
   * @example {example.com} PH1
   */
  unthrottleS: "Stop throttling {PH1}",
  /**
   * @description A context menu item in the Network Log View of the Network panel
   */
  throttleRequestDomain: "Throttle request domain",
  /**
   * @description A context menu item in the Network Log View of the Network panel
   */
  blockRequests: "Block requests",
  /**
   * @description A context menu item in the Network Log View of the Network panel
   */
  blockRequestUrl: "Block request URL",
  /**
   * @description A context menu item in the Network Log View of the Network panel
   * @example {example.com} PH1
   */
  unblockS: "Unblock {PH1}",
  /**
   * @description A context menu item in the Network Log View of the Network panel
   */
  blockRequestDomain: "Block request domain",
  /**
   * @description Text to replay an XHR request
   */
  replayXhr: "Replay XHR",
  /**
   * @description Text in Network Log View of the Network panel
   */
  areYouSureYouWantToClearBrowser: "Are you sure you want to clear browser cache?",
  /**
   * @description Text in Network Log View of the Network panel
   */
  areYouSureYouWantToClearBrowserCookies: "Are you sure you want to clear browser cookies?",
  /**
   * @description A context menu item in the Network Log View of the Network panel
   * for creating a header override
   */
  overrideHeaders: "Override headers",
  /**
   * @description Tooltip for the Show only/Hide requests dropdown of the filterbar
   */
  showOnlyHideRequests: "Show only/hide requests",
  /**
   * @description Text for the Show only/Hide requests dropdown button of the filterbar
   */
  moreFilters: "More filters",
  /**
   * @description Text of a context menu item to redirect to the AI assistance panel and to start a chat.
   */
  startAChat: "Start a chat",
  /**
   * @description Context menu item in Network panel to explain the purpose of a request via AI.
   */
  explainPurpose: "Explain purpose",
  /**
   * @description Context menu item in Network panel to explain why a request is slow via AI.
   */
  explainSlowness: "Explain slowness",
  /**
   * @description Context menu item in Network panel to explain why a request is failing via AI.
   */
  explainFailures: "Explain failures",
  /**
   * @description Context menu item in Network panel to assess security headers of a request via AI.
   */
  assessSecurityHeaders: "Assess security headers"
};
var str_19 = i18n37.i18n.registerUIStrings("panels/network/NetworkLogView.ts", UIStrings19);
var i18nString19 = i18n37.i18n.getLocalizedString.bind(void 0, str_19);
var NetworkLogView = class _NetworkLogView extends Common16.ObjectWrapper.eventMixin(UI22.Widget.VBox) {
  networkInvertFilterSetting;
  networkHideDataURLSetting;
  networkHideChromeExtensions;
  networkShowBlockedCookiesOnlySetting;
  networkOnlyBlockedRequestsSetting;
  networkOnlyThirdPartySetting;
  networkResourceTypeFiltersSetting;
  networkShowOptionsToGenerateHarWithSensitiveData;
  networkOnlyIPProtectedRequestsSetting;
  progressBarContainer;
  networkLogLargeRowsSetting;
  rowHeightInternal;
  timeCalculatorInternal;
  durationCalculator;
  calculatorInternal;
  columnsInternal;
  staleRequests;
  mainRequestLoadTime;
  mainRequestDOMContentLoadedTime;
  filters;
  timeFilter;
  hoveredNodeInternal;
  recordingHint;
  highlightedNode;
  linkifierInternal;
  recording;
  needsRefresh;
  headerHeightInternal;
  groupLookups;
  activeGroupLookup;
  textFilterUI;
  invertFilterUI;
  moreFiltersDropDownUI;
  resourceCategoryFilterUI;
  filterParser;
  suggestionBuilder;
  dataGrid;
  summaryToolbarInternal;
  filterBar;
  textFilterSetting;
  networkRequestToNode;
  constructor(filterBar, progressBarContainer, networkLogLargeRowsSetting) {
    super();
    this.registerRequiredCSS(networkLogView_css_default);
    this.setMinimumSize(50, 64);
    this.element.id = "network-container";
    this.element.classList.add("no-node-selected");
    this.networkRequestToNode = /* @__PURE__ */ new WeakMap();
    this.networkInvertFilterSetting = Common16.Settings.Settings.instance().createSetting("network-invert-filter", false);
    this.networkHideDataURLSetting = Common16.Settings.Settings.instance().createSetting("network-hide-data-url", false);
    this.networkHideChromeExtensions = Common16.Settings.Settings.instance().createSetting("network-hide-chrome-extensions", false);
    this.networkShowBlockedCookiesOnlySetting = Common16.Settings.Settings.instance().createSetting("network-show-blocked-cookies-only-setting", false);
    this.networkOnlyBlockedRequestsSetting = Common16.Settings.Settings.instance().createSetting("network-only-blocked-requests", false);
    this.networkOnlyThirdPartySetting = Common16.Settings.Settings.instance().createSetting("network-only-third-party-setting", false);
    this.networkOnlyIPProtectedRequestsSetting = Common16.Settings.Settings.instance().createSetting("network-only-ip-protected-requests", false);
    this.networkResourceTypeFiltersSetting = Common16.Settings.Settings.instance().createSetting("network-resource-type-filters", {});
    this.networkShowOptionsToGenerateHarWithSensitiveData = Common16.Settings.Settings.instance().createSetting("network.show-options-to-generate-har-with-sensitive-data", false);
    this.progressBarContainer = progressBarContainer;
    this.networkLogLargeRowsSetting = networkLogLargeRowsSetting;
    this.networkLogLargeRowsSetting.addChangeListener(updateRowHeight.bind(this), this);
    function updateRowHeight() {
      this.rowHeightInternal = Boolean(this.networkLogLargeRowsSetting.get()) ? 41 : 21;
    }
    this.rowHeightInternal = 0;
    updateRowHeight.call(this);
    this.timeCalculatorInternal = new NetworkTimeCalculator4.NetworkTransferTimeCalculator();
    this.durationCalculator = new NetworkTimeCalculator4.NetworkTransferDurationCalculator();
    this.calculatorInternal = this.timeCalculatorInternal;
    this.columnsInternal = new NetworkLogViewColumns(this, this.timeCalculatorInternal, this.durationCalculator, networkLogLargeRowsSetting);
    this.columnsInternal.show(this.element);
    this.staleRequests = /* @__PURE__ */ new Set();
    this.mainRequestLoadTime = -1;
    this.mainRequestDOMContentLoadedTime = -1;
    this.filters = [];
    this.timeFilter = null;
    this.hoveredNodeInternal = null;
    this.recordingHint = null;
    this.highlightedNode = null;
    this.linkifierInternal = new Components5.Linkifier.Linkifier();
    this.recording = false;
    this.needsRefresh = false;
    this.headerHeightInternal = 0;
    this.groupLookups = /* @__PURE__ */ new Map();
    this.groupLookups.set("Frame", new NetworkFrameGrouper(this));
    this.activeGroupLookup = null;
    this.textFilterUI = new UI22.FilterBar.TextFilterUI();
    this.textFilterUI.addEventListener("FilterChanged", this.filterChanged, this);
    filterBar.addFilter(this.textFilterUI);
    this.invertFilterUI = new UI22.FilterBar.CheckboxFilterUI(i18nString19(UIStrings19.invertFilter), true, this.networkInvertFilterSetting, "invert-filter");
    this.invertFilterUI.addEventListener("FilterChanged", this.filterChanged.bind(this), this);
    UI22.Tooltip.Tooltip.install(this.invertFilterUI.element(), i18nString19(UIStrings19.invertsFilter));
    filterBar.addFilter(this.invertFilterUI);
    filterBar.addDivider();
    const filterItems = Object.entries(Common16.ResourceType.resourceCategories).map(([key, category]) => ({
      name: category.name,
      label: () => category.shortTitle(),
      title: category.title(),
      jslogContext: Platform10.StringUtilities.toKebabCase(key)
    }));
    this.moreFiltersDropDownUI = new MoreFiltersDropDownUI();
    this.moreFiltersDropDownUI.addEventListener("FilterChanged", this.filterChanged, this);
    filterBar.addFilter(this.moreFiltersDropDownUI);
    this.resourceCategoryFilterUI = new UI22.FilterBar.NamedBitSetFilterUI(filterItems, this.networkResourceTypeFiltersSetting);
    UI22.ARIAUtils.setLabel(this.resourceCategoryFilterUI.element(), i18nString19(UIStrings19.requestTypesToInclude));
    this.resourceCategoryFilterUI.addEventListener("FilterChanged", this.filterChanged.bind(this), this);
    filterBar.addFilter(this.resourceCategoryFilterUI);
    this.filterParser = new TextUtils7.TextUtils.FilterParser(searchKeys);
    this.suggestionBuilder = new UI22.FilterSuggestionBuilder.FilterSuggestionBuilder(searchKeys, _NetworkLogView.sortSearchValues);
    this.resetSuggestionBuilder();
    this.dataGrid = this.columnsInternal.dataGrid();
    this.setupDataGrid();
    this.columnsInternal.sortByCurrentColumn();
    filterBar.filterButton().addEventListener("Click", this.dataGrid.scheduleUpdate.bind(
      this.dataGrid,
      true
      /* isFromUser */
    ));
    this.summaryToolbarInternal = this.element.createChild("devtools-toolbar", "network-summary-bar");
    this.summaryToolbarInternal.setAttribute("role", "status");
    new UI22.DropTarget.DropTarget(this.element, [UI22.DropTarget.Type.File], i18nString19(UIStrings19.dropHarFilesHere), this.handleDrop.bind(this));
    Common16.Settings.Settings.instance().moduleSetting("network-color-code-resource-types").addChangeListener(this.invalidateAllItems.bind(this, false), this);
    SDK14.TargetManager.TargetManager.instance().observeModels(SDK14.NetworkManager.NetworkManager, this, { scoped: true });
    Logs5.NetworkLog.NetworkLog.instance().addEventListener(Logs5.NetworkLog.Events.RequestAdded, this.onRequestUpdated, this);
    Logs5.NetworkLog.NetworkLog.instance().addEventListener(Logs5.NetworkLog.Events.RequestUpdated, this.onRequestUpdated, this);
    Logs5.NetworkLog.NetworkLog.instance().addEventListener(Logs5.NetworkLog.Events.RequestRemoved, this.onRequestRemoved, this);
    Logs5.NetworkLog.NetworkLog.instance().addEventListener(Logs5.NetworkLog.Events.Reset, this.reset, this);
    this.updateGroupByFrame();
    Common16.Settings.Settings.instance().moduleSetting("network.group-by-frame").addChangeListener(() => this.updateGroupByFrame());
    this.filterBar = filterBar;
    this.textFilterSetting = Common16.Settings.Settings.instance().createSetting("network-text-filter", "");
    if (this.textFilterSetting.get()) {
      this.textFilterUI.setValue(this.textFilterSetting.get());
    }
  }
  updateGroupByFrame() {
    const value = Common16.Settings.Settings.instance().moduleSetting("network.group-by-frame").get();
    this.setGrouping(value ? "Frame" : null);
  }
  static sortSearchValues(key, values) {
    if (key === NetworkForward3.UIFilter.FilterType.Priority) {
      values.sort((a, b) => {
        const aPriority = PerfUI4.NetworkPriorities.uiLabelToNetworkPriority(a);
        const bPriority = PerfUI4.NetworkPriorities.uiLabelToNetworkPriority(b);
        return PerfUI4.NetworkPriorities.networkPriorityWeight(aPriority) - PerfUI4.NetworkPriorities.networkPriorityWeight(bPriority);
      });
    } else {
      values.sort();
    }
  }
  static negativeFilter(filter, request) {
    return !filter(request);
  }
  static requestPathFilter(regex, request) {
    if (!regex) {
      return false;
    }
    return regex.test(request.path() + "/" + request.name());
  }
  static subdomains(domain) {
    const result = [domain];
    let indexOfPeriod = domain.indexOf(".");
    while (indexOfPeriod !== -1) {
      result.push("*" + domain.substring(indexOfPeriod));
      indexOfPeriod = domain.indexOf(".", indexOfPeriod + 1);
    }
    return result;
  }
  static createRequestDomainFilter(value) {
    const escapedPattern = value.split("*").map(Platform10.StringUtilities.escapeForRegExp).join(".*");
    return _NetworkLogView.requestDomainFilter.bind(null, new RegExp("^" + escapedPattern + "$", "i"));
  }
  static requestDomainFilter(regex, request) {
    return regex.test(request.domain);
  }
  static runningRequestFilter(request) {
    return !request.finished;
  }
  static fromCacheRequestFilter(request) {
    return request.cached();
  }
  static interceptedByServiceWorkerFilter(request) {
    return request.fetchedViaServiceWorker;
  }
  static initiatedByServiceWorkerFilter(request) {
    return request.initiatedByServiceWorker();
  }
  static requestResponseHeaderFilter(value, request) {
    return request.responseHeaderValue(value) !== void 0;
  }
  static requestRequestHeaderFilter(headerName, request) {
    return request.requestHeaders().some((header) => header.name.toLowerCase() === headerName.toLowerCase());
  }
  static requestResponseHeaderSetCookieFilter(value, request) {
    return Boolean(request.responseHeaderValue("Set-Cookie")?.includes(value));
  }
  static requestMethodFilter(value, request) {
    return request.requestMethod === value;
  }
  static requestPriorityFilter(value, request) {
    return request.priority() === value;
  }
  static requestMimeTypeFilter(value, request) {
    return request.mimeType === value;
  }
  static requestMixedContentFilter(value, request) {
    if (value === "displayed") {
      return request.mixedContentType === "optionally-blockable";
    }
    if (value === "blocked") {
      return request.mixedContentType === "blockable" && request.wasBlocked();
    }
    if (value === "block-overridden") {
      return request.mixedContentType === "blockable" && !request.wasBlocked();
    }
    if (value === "all") {
      return request.mixedContentType !== "none";
    }
    return false;
  }
  static requestSchemeFilter(value, request) {
    return request.scheme === value;
  }
  static requestCookieDomainFilter(value, request) {
    return request.allCookiesIncludingBlockedOnes().some((cookie) => cookie.domain() === value);
  }
  static requestCookieNameFilter(value, request) {
    return request.allCookiesIncludingBlockedOnes().some((cookie) => cookie.name() === value);
  }
  static requestCookiePathFilter(value, request) {
    return request.allCookiesIncludingBlockedOnes().some((cookie) => cookie.path() === value);
  }
  static requestCookieValueFilter(value, request) {
    return request.allCookiesIncludingBlockedOnes().some((cookie) => cookie.value() === value);
  }
  static requestSetCookieDomainFilter(value, request) {
    return request.responseCookies.some((cookie) => cookie.domain() === value);
  }
  static requestSetCookieNameFilter(value, request) {
    return request.responseCookies.some((cookie) => cookie.name() === value);
  }
  static requestSetCookieValueFilter(value, request) {
    return request.responseCookies.some((cookie) => cookie.value() === value);
  }
  static requestSizeLargerThanFilter(value, request) {
    return request.transferSize >= value;
  }
  static statusCodeFilter(value, request) {
    return String(request.statusCode) === value;
  }
  static hasOverridesFilter(value, request) {
    if (!value) {
      return false;
    }
    if (value === overrideFilter.no) {
      return request.overrideTypes.length === 0;
    }
    if (value === overrideFilter.yes) {
      return request.overrideTypes.length > 0;
    }
    if (value === overrideFilter.content) {
      return request.overrideTypes.includes("content");
    }
    if (value === overrideFilter.headers) {
      return request.overrideTypes.includes("headers");
    }
    return request.overrideTypes.join(",").includes(value);
  }
  static getHTTPRequestsFilter(request) {
    return request.parsedURL.isValid && request.scheme in HTTPSchemas;
  }
  static resourceTypeFilter(value, request) {
    return request.resourceType().name() === value;
  }
  static requestUrlFilter(value, request) {
    const regex = new RegExp(Platform10.StringUtilities.escapeForRegExp(value), "i");
    return regex.test(request.url());
  }
  static requestTimeFilter(windowStart, windowEnd, request) {
    if (request.issueTime() > windowEnd) {
      return false;
    }
    if (request.endTime !== -1 && request.endTime < windowStart) {
      return false;
    }
    return true;
  }
  static copyRequestHeaders(request) {
    Host9.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(request.requestHeadersText());
  }
  static copyResponseHeaders(request) {
    Host9.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(request.responseHeadersText);
  }
  static async copyResponse(request) {
    const contentData = await request.requestContentData();
    let content;
    if (TextUtils7.ContentData.ContentData.isError(contentData)) {
      content = "";
    } else if (!contentData.isTextContent) {
      content = contentData.asDataUrl() ?? "";
    } else {
      content = contentData.text;
    }
    Host9.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(content);
  }
  handleDrop(dataTransfer) {
    const items = dataTransfer.items;
    if (!items.length) {
      return;
    }
    const file = items[0].getAsFile();
    if (file) {
      void this.onLoadFromFile(file);
    }
  }
  async onLoadFromFile(file) {
    const outputStream = new Common16.StringOutputStream.StringOutputStream();
    const reader = new Bindings2.FileUtils.ChunkedFileReader(
      file,
      /* chunkSize */
      1e7
    );
    const success = await reader.read(outputStream);
    if (!success) {
      const error = reader.error();
      if (error) {
        this.harLoadFailed(error.message);
      }
      return;
    }
    let harRoot;
    try {
      harRoot = new HAR.HARFormat.HARRoot(JSON.parse(outputStream.data()));
    } catch (e) {
      this.harLoadFailed(e);
      return;
    }
    Logs5.NetworkLog.NetworkLog.instance().importRequests(HAR.Importer.Importer.requestsFromHARLog(harRoot.log));
  }
  harLoadFailed(message) {
    Common16.Console.Console.instance().error("Failed to load HAR file with following error: " + message);
  }
  setGrouping(groupKey) {
    if (this.activeGroupLookup) {
      this.activeGroupLookup.reset();
    }
    const groupLookup = groupKey ? this.groupLookups.get(groupKey) || null : null;
    this.activeGroupLookup = groupLookup;
    this.invalidateAllItems();
  }
  nodeForRequest(request) {
    return this.networkRequestToNode.get(request) || null;
  }
  headerHeight() {
    return this.headerHeightInternal;
  }
  setRecording(recording) {
    this.recording = recording;
    this.updateSummaryBar();
  }
  columns() {
    return this.columnsInternal;
  }
  summaryToolbar() {
    return this.summaryToolbarInternal;
  }
  modelAdded(networkManager) {
    const target = networkManager.target();
    if (target.outermostTarget() !== target) {
      return;
    }
    const resourceTreeModel = target.model(SDK14.ResourceTreeModel.ResourceTreeModel);
    if (resourceTreeModel) {
      resourceTreeModel.addEventListener(SDK14.ResourceTreeModel.Events.Load, this.loadEventFired, this);
      resourceTreeModel.addEventListener(SDK14.ResourceTreeModel.Events.DOMContentLoaded, this.domContentLoadedEventFired, this);
    }
    for (const request of Logs5.NetworkLog.NetworkLog.instance().requests()) {
      if (this.isInScope(request)) {
        this.refreshRequest(request);
      }
    }
  }
  modelRemoved(networkManager) {
    const target = networkManager.target();
    if (target.outermostTarget() !== target) {
      return;
    }
    const resourceTreeModel = target.model(SDK14.ResourceTreeModel.ResourceTreeModel);
    if (resourceTreeModel) {
      resourceTreeModel.removeEventListener(SDK14.ResourceTreeModel.Events.Load, this.loadEventFired, this);
      resourceTreeModel.removeEventListener(SDK14.ResourceTreeModel.Events.DOMContentLoaded, this.domContentLoadedEventFired, this);
    }
    const preserveLog = Common16.Settings.Settings.instance().moduleSetting("network-log.preserve-log").get();
    if (!preserveLog) {
      this.reset();
    }
  }
  linkifier() {
    return this.linkifierInternal;
  }
  setWindow(start, end) {
    if (!start && !end) {
      this.timeFilter = null;
      this.timeCalculatorInternal.setWindow(null);
    } else {
      this.timeFilter = _NetworkLogView.requestTimeFilter.bind(null, start, end);
      this.timeCalculatorInternal.setWindow(new NetworkTimeCalculator4.NetworkTimeBoundary(start, end));
    }
    this.filterRequests();
  }
  resetFocus() {
    this.dataGrid.element.focus();
  }
  resetSuggestionBuilder() {
    this.suggestionBuilder.clear();
    this.suggestionBuilder.addItem(
      NetworkForward3.UIFilter.FilterType.Is,
      "running"
      /* NetworkForward.UIFilter.IsFilterType.RUNNING */
    );
    this.suggestionBuilder.addItem(
      NetworkForward3.UIFilter.FilterType.Is,
      "from-cache"
      /* NetworkForward.UIFilter.IsFilterType.FROM_CACHE */
    );
    this.suggestionBuilder.addItem(
      NetworkForward3.UIFilter.FilterType.Is,
      "service-worker-intercepted"
      /* NetworkForward.UIFilter.IsFilterType.SERVICE_WORKER_INTERCEPTED */
    );
    this.suggestionBuilder.addItem(
      NetworkForward3.UIFilter.FilterType.Is,
      "service-worker-initiated"
      /* NetworkForward.UIFilter.IsFilterType.SERVICE_WORKER_INITIATED */
    );
    this.suggestionBuilder.addItem(NetworkForward3.UIFilter.FilterType.LargerThan, "100");
    this.suggestionBuilder.addItem(NetworkForward3.UIFilter.FilterType.LargerThan, "10k");
    this.suggestionBuilder.addItem(NetworkForward3.UIFilter.FilterType.LargerThan, "1M");
    this.textFilterUI.setSuggestionProvider(this.suggestionBuilder.completions.bind(this.suggestionBuilder));
    this.suggestionBuilder.addItem(NetworkForward3.UIFilter.FilterType.HasOverrides, overrideFilter.yes);
    this.suggestionBuilder.addItem(NetworkForward3.UIFilter.FilterType.HasOverrides, overrideFilter.no);
    this.suggestionBuilder.addItem(NetworkForward3.UIFilter.FilterType.HasOverrides, overrideFilter.content);
    this.suggestionBuilder.addItem(NetworkForward3.UIFilter.FilterType.HasOverrides, overrideFilter.headers);
  }
  filterChanged() {
    this.removeAllNodeHighlights();
    this.parseFilterQuery(this.textFilterUI.value(), this.invertFilterUI.checked());
    this.filterRequests();
    this.textFilterSetting.set(this.textFilterUI.value());
    this.moreFiltersDropDownUI?.updateActiveFiltersCount();
    this.moreFiltersDropDownUI?.updateTooltip();
    this.columnsInternal.filterChanged();
  }
  async resetFilter() {
    this.textFilterUI.clear();
  }
  showRecordingHint() {
    this.hideRecordingHint();
    const actionRegistry = UI22.ActionRegistry.ActionRegistry.instance();
    const actionName = this.recording ? "inspector-main.reload" : "network.toggle-recording";
    const action = actionRegistry.hasAction(actionName) ? actionRegistry.getAction(actionName) : null;
    const shortcutTitle = UI22.ShortcutRegistry.ShortcutRegistry.instance().shortcutTitleForAction(actionName) ?? "";
    const header = this.recording ? i18nString19(UIStrings19.recordingNetworkActivity) : i18nString19(UIStrings19.noNetworkActivityRecorded);
    const instruction = this.recording ? UIStrings19.performARequestOrHitSToRecordThe : UIStrings19.recordToDisplayNetworkActivity;
    const buttonText = this.recording ? i18nString19(UIStrings19.reloadPage) : i18nString19(UIStrings19.startRecording);
    const description = i18nString19(instruction, {
      PH1: buttonText,
      PH2: shortcutTitle
    });
    this.recordingHint = new UI22.EmptyWidget.EmptyWidget(header, shortcutTitle ? description : "");
    this.recordingHint.element.classList.add("network-status-pane");
    this.recordingHint.link = "https://developer.chrome.com/docs/devtools/network/";
    if (shortcutTitle && action) {
      const button = UI22.UIUtils.createTextButton(buttonText, () => action.execute(), {
        jslogContext: actionName,
        variant: "tonal"
      });
      this.recordingHint.contentElement.appendChild(button);
    }
    this.recordingHint.show(this.element);
    this.setHidden(true);
  }
  hideRecordingHint() {
    this.setHidden(false);
    if (this.recordingHint) {
      this.recordingHint.detach();
      this.recordingHint = null;
    }
    UI22.ARIAUtils.LiveAnnouncer.alert(i18nString19(UIStrings19.networkDataAvailable));
  }
  setHidden(value) {
    this.columnsInternal.setHidden(value);
    this.dataGrid.setInert(value);
    UI22.ARIAUtils.setHidden(this.summaryToolbarInternal, value);
  }
  elementsToRestoreScrollPositionsFor() {
    if (!this.dataGrid) {
      return [];
    }
    return [this.dataGrid.scrollContainer];
  }
  columnExtensionResolved() {
    this.invalidateAllItems(true);
  }
  setupDataGrid() {
    this.dataGrid.setRowContextMenuCallback((contextMenu, node) => {
      const request = node.request();
      if (request) {
        this.handleContextMenuForRequest(contextMenu, request);
      }
    });
    this.dataGrid.setEnableAutoScrollToBottom(true);
    this.dataGrid.setName("network-log");
    this.dataGrid.setResizeMethod(
      "last"
      /* DataGrid.DataGrid.ResizeMethod.LAST */
    );
    this.dataGrid.element.classList.add("network-log-grid");
    this.dataGrid.element.addEventListener("mousemove", this.dataGridMouseMove.bind(this), true);
    this.dataGrid.element.addEventListener("mouseleave", () => this.setHoveredNode(null), true);
    this.dataGrid.element.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight" && this.dataGrid.selectedNode) {
        const initiatorLink = this.dataGrid.selectedNode.element().querySelector("button.devtools-link");
        if (initiatorLink) {
          initiatorLink.focus();
        }
      }
      if (Platform10.KeyboardUtilities.isEnterOrSpaceKey(event)) {
        this.dispatchEventToListeners("RequestActivated", { showPanel: "ShowPanel", takeFocus: true });
        event.consume(true);
      }
    });
    this.dataGrid.element.addEventListener("keyup", (event) => {
      if ((event.key === "r" || event.key === "R") && this.dataGrid.selectedNode) {
        const request = this.dataGrid.selectedNode.request();
        if (!request) {
          return;
        }
        if (SDK14.NetworkManager.NetworkManager.canReplayRequest(request)) {
          SDK14.NetworkManager.NetworkManager.replayRequest(request);
          void VisualLogging13.logKeyDown(this.dataGrid.selectedNode.element(), event, "replay-xhr");
        }
      }
    });
    this.dataGrid.element.addEventListener("focus", this.onDataGridFocus.bind(this), true);
    this.dataGrid.element.addEventListener("blur", this.onDataGridBlur.bind(this), true);
    return this.dataGrid;
  }
  dataGridMouseMove(event) {
    const mouseEvent = event;
    const node = this.dataGrid.dataGridNodeFromNode(mouseEvent.target);
    const highlightInitiatorChain = mouseEvent.shiftKey;
    this.setHoveredNode(node, highlightInitiatorChain);
  }
  hoveredNode() {
    return this.hoveredNodeInternal;
  }
  setHoveredNode(node, highlightInitiatorChain) {
    if (this.hoveredNodeInternal) {
      this.hoveredNodeInternal.setHovered(false, false);
    }
    this.hoveredNodeInternal = node;
    if (this.hoveredNodeInternal) {
      this.hoveredNodeInternal.setHovered(true, Boolean(highlightInitiatorChain));
    }
  }
  updateSummaryBar() {
    this.hideRecordingHint();
    let transferSize = 0;
    let resourceSize = 0;
    let selectedNodeNumber = 0;
    let selectedTransferSize = 0;
    let selectedResourceSize = 0;
    let baseTime = -1;
    let maxTime = -1;
    let nodeCount = 0;
    for (const request of Logs5.NetworkLog.NetworkLog.instance().requests()) {
      const node = this.networkRequestToNode.get(request);
      if (!node) {
        continue;
      }
      nodeCount++;
      const requestTransferSize = request.transferSize;
      transferSize += requestTransferSize;
      const requestResourceSize = request.resourceSize;
      resourceSize += requestResourceSize;
      if (!filteredNetworkRequests.has(node)) {
        selectedNodeNumber++;
        selectedTransferSize += requestTransferSize;
        selectedResourceSize += requestResourceSize;
      }
      const networkManager = SDK14.NetworkManager.NetworkManager.forRequest(request);
      if (networkManager && request.url() === networkManager.target().inspectedURL() && request.resourceType() === Common16.ResourceType.resourceTypes.Document && networkManager.target().parentTarget()?.type() !== SDK14.Target.Type.FRAME) {
        baseTime = request.fromPrefetchCache() ? request.issueTime() : request.startTime;
      }
      if (request.endTime > maxTime) {
        maxTime = request.endTime;
      }
    }
    if (!nodeCount) {
      this.showRecordingHint();
      return;
    }
    this.summaryToolbarInternal.removeToolbarItems();
    const appendChunk = (chunk, title) => {
      const toolbarText = new UI22.Toolbar.ToolbarText(chunk);
      toolbarText.setTitle(title ? title : chunk);
      this.summaryToolbarInternal.appendToolbarItem(toolbarText);
      return toolbarText.element;
    };
    if (selectedNodeNumber !== nodeCount) {
      appendChunk(i18nString19(UIStrings19.sSRequests, { PH1: selectedNodeNumber, PH2: nodeCount }));
      this.summaryToolbarInternal.appendSeparator();
      appendChunk(i18nString19(UIStrings19.sSTransferred, {
        PH1: i18n37.ByteUtilities.formatBytesToKb(selectedTransferSize),
        PH2: i18n37.ByteUtilities.formatBytesToKb(transferSize)
      }), i18nString19(UIStrings19.sBSBTransferredOverNetwork, { PH1: selectedTransferSize, PH2: transferSize }));
      this.summaryToolbarInternal.appendSeparator();
      appendChunk(i18nString19(UIStrings19.sSResources, {
        PH1: i18n37.ByteUtilities.formatBytesToKb(selectedResourceSize),
        PH2: i18n37.ByteUtilities.formatBytesToKb(resourceSize)
      }), i18nString19(UIStrings19.sBSBResourcesLoadedByThePage, { PH1: selectedResourceSize, PH2: resourceSize }));
    } else {
      appendChunk(i18nString19(UIStrings19.sRequests, { PH1: nodeCount }));
      this.summaryToolbarInternal.appendSeparator();
      appendChunk(i18nString19(UIStrings19.sTransferred, { PH1: i18n37.ByteUtilities.bytesToString(transferSize) }), i18nString19(UIStrings19.sBTransferredOverNetwork, { PH1: transferSize }));
      this.summaryToolbarInternal.appendSeparator();
      appendChunk(i18nString19(UIStrings19.sResources, { PH1: i18n37.ByteUtilities.bytesToString(resourceSize) }), i18nString19(UIStrings19.sBResourcesLoadedByThePage, { PH1: resourceSize }));
    }
    if (baseTime !== -1 && maxTime !== -1) {
      this.summaryToolbarInternal.appendSeparator();
      appendChunk(i18nString19(UIStrings19.finishS, { PH1: i18n37.TimeUtilities.secondsToString(maxTime - baseTime) }));
      if (this.mainRequestDOMContentLoadedTime !== -1 && this.mainRequestDOMContentLoadedTime > baseTime) {
        this.summaryToolbarInternal.appendSeparator();
        const domContentLoadedText = i18nString19(UIStrings19.domcontentloadedS, { PH1: i18n37.TimeUtilities.secondsToString(this.mainRequestDOMContentLoadedTime - baseTime) });
        appendChunk(domContentLoadedText).style.color = `var(${_NetworkLogView.getDCLEventColor()})`;
      }
      if (this.mainRequestLoadTime !== -1) {
        this.summaryToolbarInternal.appendSeparator();
        const loadText = i18nString19(UIStrings19.loadS, { PH1: i18n37.TimeUtilities.secondsToString(this.mainRequestLoadTime - baseTime) });
        appendChunk(loadText).style.color = `var(${_NetworkLogView.getLoadEventColor()})`;
      }
    }
  }
  scheduleRefresh() {
    if (this.needsRefresh) {
      return;
    }
    this.needsRefresh = true;
    if (this.isShowing()) {
      void RenderCoordinator3.write("NetworkLogView.render", this.refresh.bind(this));
    }
  }
  addFilmStripFrames(times) {
    this.columnsInternal.addEventDividers(times, "network-frame-divider");
  }
  selectFilmStripFrame(time) {
    this.columnsInternal.selectFilmStripFrame(time);
  }
  clearFilmStripFrame() {
    this.columnsInternal.clearFilmStripFrame();
  }
  refreshIfNeeded() {
    if (this.needsRefresh) {
      this.refresh();
    }
  }
  invalidateAllItems(deferUpdate) {
    this.staleRequests = new Set(Logs5.NetworkLog.NetworkLog.instance().requests().filter(this.isInScope));
    if (deferUpdate) {
      this.scheduleRefresh();
    } else {
      this.refresh();
    }
  }
  timeCalculator() {
    return this.timeCalculatorInternal;
  }
  calculator() {
    return this.calculatorInternal;
  }
  setCalculator(x) {
    if (!x || this.calculatorInternal === x) {
      return;
    }
    if (this.calculatorInternal !== x) {
      this.calculatorInternal = x;
      this.columnsInternal.setCalculator(this.calculatorInternal);
    }
    this.calculatorInternal.reset();
    if (this.calculatorInternal.startAtZero) {
      this.columnsInternal.hideEventDividers();
    } else {
      this.columnsInternal.showEventDividers();
    }
    this.invalidateAllItems();
  }
  loadEventFired(event) {
    if (!this.recording) {
      return;
    }
    const time = event.data.loadTime;
    if (time) {
      this.mainRequestLoadTime = time;
      this.columnsInternal.addEventDividers([time], "network-load-divider");
    }
  }
  domContentLoadedEventFired(event) {
    if (!this.recording) {
      return;
    }
    const { data } = event;
    if (data) {
      this.mainRequestDOMContentLoadedTime = data;
      this.columnsInternal.addEventDividers([data], "network-dcl-divider");
    }
  }
  wasShown() {
    super.wasShown();
    this.refreshIfNeeded();
    this.columnsInternal.wasShown();
  }
  willHide() {
    super.willHide();
    this.columnsInternal.willHide();
  }
  flatNodesList() {
    const rootNode = this.dataGrid.rootNode();
    return rootNode.flatChildren();
  }
  onDataGridFocus() {
    if (this.dataGrid.element.matches(":focus-visible")) {
      this.element.classList.add("grid-focused");
    }
    this.updateNodeBackground();
  }
  onDataGridBlur() {
    this.element.classList.remove("grid-focused");
    this.updateNodeBackground();
  }
  updateNodeBackground() {
    if (this.dataGrid.selectedNode) {
      this.dataGrid.selectedNode.updateBackgroundColor();
    }
  }
  updateNodeSelectedClass(isSelected) {
    if (isSelected) {
      this.element.classList.remove("no-node-selected");
    } else {
      this.element.classList.add("no-node-selected");
    }
  }
  stylesChanged() {
    this.columnsInternal.scheduleRefresh();
  }
  removeNodeAndMaybeAncestors(node) {
    let parent = node.parent;
    if (!parent) {
      return;
    }
    parent.removeChild(node);
    while (parent && !parent.hasChildren() && parent.dataGrid && parent.dataGrid.rootNode() !== parent) {
      const grandparent = parent.parent;
      grandparent.removeChild(parent);
      parent = grandparent;
    }
  }
  refresh() {
    this.needsRefresh = false;
    this.removeAllNodeHighlights();
    this.timeCalculatorInternal.updateBoundariesForEventTime(this.mainRequestLoadTime);
    this.durationCalculator.updateBoundariesForEventTime(this.mainRequestLoadTime);
    this.timeCalculatorInternal.updateBoundariesForEventTime(this.mainRequestDOMContentLoadedTime);
    this.durationCalculator.updateBoundariesForEventTime(this.mainRequestDOMContentLoadedTime);
    const nodesToInsert = /* @__PURE__ */ new Map();
    const nodesToRefresh = [];
    const staleNodes = /* @__PURE__ */ new Set();
    while (this.staleRequests.size) {
      const request = this.staleRequests.values().next().value;
      this.staleRequests.delete(request);
      let node = this.networkRequestToNode.get(request);
      if (!node) {
        node = this.createNodeForRequest(request);
      }
      staleNodes.add(node);
    }
    for (const node of staleNodes) {
      const request = node.request();
      const isFilteredOut = !this.applyFilter(request);
      if (isFilteredOut) {
        if (node === this.hoveredNodeInternal) {
          this.setHoveredNode(null);
        }
        node.selected = false;
      } else {
        nodesToRefresh.push(node);
      }
      this.timeCalculatorInternal.updateBoundaries(request);
      this.durationCalculator.updateBoundaries(request);
      const newParent = this.parentNodeForInsert(node);
      const wasAlreadyFiltered = filteredNetworkRequests.has(node);
      if (wasAlreadyFiltered === isFilteredOut && node.parent === newParent) {
        continue;
      }
      if (isFilteredOut) {
        filteredNetworkRequests.add(node);
      } else {
        filteredNetworkRequests.delete(node);
      }
      const removeFromParent = node.parent && (isFilteredOut || node.parent !== newParent);
      if (removeFromParent) {
        this.removeNodeAndMaybeAncestors(node);
      }
      if (!newParent || isFilteredOut) {
        continue;
      }
      if (!newParent.dataGrid && !nodesToInsert.has(newParent)) {
        nodesToInsert.set(newParent, this.dataGrid.rootNode());
        nodesToRefresh.push(newParent);
      }
      nodesToInsert.set(node, newParent);
    }
    for (const node of nodesToInsert.keys()) {
      nodesToInsert.get(node).appendChild(node);
    }
    for (const node of nodesToRefresh) {
      node.refresh();
    }
    this.updateSummaryBar();
    if (nodesToInsert.size) {
      this.columnsInternal.sortByCurrentColumn();
    }
    this.dataGrid.updateInstantly();
    this.didRefreshForTest();
  }
  didRefreshForTest() {
  }
  parentNodeForInsert(node) {
    if (!this.activeGroupLookup) {
      return this.dataGrid.rootNode();
    }
    const groupNode = this.activeGroupLookup.groupNodeForRequest(node.request());
    if (!groupNode) {
      return this.dataGrid.rootNode();
    }
    return groupNode;
  }
  reset() {
    this.dispatchEventToListeners("RequestActivated", {
      showPanel: "HidePanel"
      /* RequestPanelBehavior.HidePanel */
    });
    this.setHoveredNode(null);
    this.columnsInternal.reset();
    this.timeFilter = null;
    this.calculatorInternal.reset();
    this.timeCalculatorInternal.setWindow(null);
    this.linkifierInternal.reset();
    if (this.activeGroupLookup) {
      this.activeGroupLookup.reset();
    }
    this.staleRequests.clear();
    this.resetSuggestionBuilder();
    this.mainRequestLoadTime = -1;
    this.mainRequestDOMContentLoadedTime = -1;
    this.networkRequestToNode = /* @__PURE__ */ new WeakMap();
    this.dataGrid.rootNode().removeChildren();
    this.updateSummaryBar();
    this.scheduleRefresh();
  }
  // TODO(crbug.com/1477668)
  setTextFilterValue(filterString) {
    this.textFilterUI.setValue(filterString);
    this.networkHideDataURLSetting.set(false);
    this.networkShowBlockedCookiesOnlySetting.set(false);
    this.networkOnlyBlockedRequestsSetting.set(false);
    this.networkOnlyThirdPartySetting.set(false);
    this.networkHideChromeExtensions.set(false);
    this.networkOnlyIPProtectedRequestsSetting.set(false);
    this.resourceCategoryFilterUI.reset();
  }
  createNodeForRequest(request) {
    const node = new NetworkRequestNode(this, request);
    this.networkRequestToNode.set(request, node);
    filteredNetworkRequests.add(node);
    for (let redirect = request.redirectSource(); redirect; redirect = redirect.redirectSource()) {
      this.refreshRequest(redirect);
    }
    return node;
  }
  isInScope(request) {
    const networkManager = SDK14.NetworkManager.NetworkManager.forRequest(request);
    return !networkManager || SDK14.TargetManager.TargetManager.instance().isInScope(networkManager);
  }
  onRequestUpdated(event) {
    const { request, preserveLog } = event.data;
    if (this.isInScope(request) || preserveLog) {
      this.refreshRequest(request);
    }
  }
  onRequestRemoved(event) {
    const { request } = event.data;
    this.staleRequests.delete(request);
    const node = this.networkRequestToNode.get(request);
    if (node) {
      this.removeNodeAndMaybeAncestors(node);
    }
  }
  refreshRequest(request) {
    _NetworkLogView.subdomains(request.domain).forEach(this.suggestionBuilder.addItem.bind(this.suggestionBuilder, NetworkForward3.UIFilter.FilterType.Domain));
    this.suggestionBuilder.addItem(NetworkForward3.UIFilter.FilterType.Method, request.requestMethod);
    this.suggestionBuilder.addItem(NetworkForward3.UIFilter.FilterType.MimeType, request.mimeType);
    this.suggestionBuilder.addItem(NetworkForward3.UIFilter.FilterType.Scheme, String(request.scheme));
    this.suggestionBuilder.addItem(NetworkForward3.UIFilter.FilterType.StatusCode, String(request.statusCode));
    this.suggestionBuilder.addItem(NetworkForward3.UIFilter.FilterType.ResourceType, request.resourceType().name());
    this.suggestionBuilder.addItem(NetworkForward3.UIFilter.FilterType.Url, request.securityOrigin());
    const priority = request.priority();
    if (priority) {
      this.suggestionBuilder.addItem(NetworkForward3.UIFilter.FilterType.Priority, PerfUI4.NetworkPriorities.uiLabelForNetworkPriority(priority));
    }
    if (request.mixedContentType !== "none") {
      this.suggestionBuilder.addItem(
        NetworkForward3.UIFilter.FilterType.MixedContent,
        "all"
        /* NetworkForward.UIFilter.MixedContentFilterValues.ALL */
      );
    }
    if (request.mixedContentType === "optionally-blockable") {
      this.suggestionBuilder.addItem(
        NetworkForward3.UIFilter.FilterType.MixedContent,
        "displayed"
        /* NetworkForward.UIFilter.MixedContentFilterValues.DISPLAYED */
      );
    }
    if (request.mixedContentType === "blockable") {
      const suggestion = request.wasBlocked() ? "blocked" : "block-overridden";
      this.suggestionBuilder.addItem(NetworkForward3.UIFilter.FilterType.MixedContent, suggestion);
    }
    const responseHeaders = request.responseHeaders;
    for (const responseHeader of responseHeaders) {
      this.suggestionBuilder.addItem(NetworkForward3.UIFilter.FilterType.HasResponseHeader, responseHeader.name);
      if (responseHeader.name === "Set-Cookie") {
        this.suggestionBuilder.addItem(NetworkForward3.UIFilter.FilterType.ResponseHeaderValueSetCookie);
      }
    }
    for (const header of request.requestHeaders()) {
      this.suggestionBuilder.addItem(NetworkForward3.UIFilter.FilterType.HasRequestHeader, header.name);
    }
    for (const cookie of request.responseCookies) {
      this.suggestionBuilder.addItem(NetworkForward3.UIFilter.FilterType.SetCookieDomain, cookie.domain());
      this.suggestionBuilder.addItem(NetworkForward3.UIFilter.FilterType.SetCookieName, cookie.name());
      this.suggestionBuilder.addItem(NetworkForward3.UIFilter.FilterType.SetCookieValue, cookie.value());
    }
    for (const cookie of request.allCookiesIncludingBlockedOnes()) {
      this.suggestionBuilder.addItem(NetworkForward3.UIFilter.FilterType.CookieDomain, cookie.domain());
      this.suggestionBuilder.addItem(NetworkForward3.UIFilter.FilterType.CookieName, cookie.name());
      this.suggestionBuilder.addItem(NetworkForward3.UIFilter.FilterType.CookiePath, cookie.path());
      this.suggestionBuilder.addItem(NetworkForward3.UIFilter.FilterType.CookieValue, cookie.value());
    }
    this.staleRequests.add(request);
    this.scheduleRefresh();
  }
  rowHeight() {
    return this.rowHeightInternal;
  }
  switchViewMode(gridMode) {
    this.columnsInternal.switchViewMode(gridMode);
  }
  handleContextMenuForRequest(contextMenu, request) {
    contextMenu.appendApplicableItems(request);
    const filtered = this.filterBar.hasActiveFilter();
    const copyMenu = contextMenu.clipboardSection().appendSubMenuItem(i18nString19(UIStrings19.copy), false, "copy");
    if (request) {
      const openAiAssistanceId = "drjones.network-panel-context";
      if (UI22.ActionRegistry.ActionRegistry.instance().hasAction(openAiAssistanceId)) {
        let appendSubmenuPromptAction = function(submenu, action, label, prompt, jslogContext) {
          submenu.defaultSection().appendItem(label, () => action.execute({ prompt }), { disabled: !action.enabled(), jslogContext });
        };
        UI22.Context.Context.instance().setFlavor(SDK14.NetworkRequest.NetworkRequest, request);
        if (Root2.Runtime.hostConfig.devToolsAiSubmenuPrompts?.enabled) {
          const action = UI22.ActionRegistry.ActionRegistry.instance().getAction(openAiAssistanceId);
          const submenu = contextMenu.footerSection().appendSubMenuItem(action.title(), false, openAiAssistanceId, Root2.Runtime.hostConfig.devToolsAiAssistanceNetworkAgent?.featureName);
          submenu.defaultSection().appendAction(openAiAssistanceId, i18nString19(UIStrings19.startAChat));
          appendSubmenuPromptAction(submenu, action, i18nString19(UIStrings19.explainPurpose), "What is the purpose of this request?", openAiAssistanceId + ".purpose");
          appendSubmenuPromptAction(submenu, action, i18nString19(UIStrings19.explainSlowness), "Why is this request taking so long?", openAiAssistanceId + ".slowness");
          appendSubmenuPromptAction(submenu, action, i18nString19(UIStrings19.explainFailures), "Why is the request failing?", openAiAssistanceId + ".failures");
          appendSubmenuPromptAction(submenu, action, i18nString19(UIStrings19.assessSecurityHeaders), "Are there any security headers present?", openAiAssistanceId + ".security");
        } else if (Root2.Runtime.hostConfig.devToolsAiDebugWithAi?.enabled) {
          contextMenu.footerSection().appendAction(openAiAssistanceId, void 0, false, void 0, Root2.Runtime.hostConfig.devToolsAiAssistanceNetworkAgent?.featureName);
        } else {
          contextMenu.footerSection().appendAction(openAiAssistanceId);
        }
      }
      copyMenu.defaultSection().appendItem(i18nString19(UIStrings19.copyURL), Host9.InspectorFrontendHost.InspectorFrontendHostInstance.copyText.bind(Host9.InspectorFrontendHost.InspectorFrontendHostInstance, request.contentURL()), { jslogContext: "copy-url" });
      copyMenu.footerSection().appendItem(filtered ? i18nString19(UIStrings19.copyAllListedURLs) : i18nString19(UIStrings19.copyAllURLs), this.copyAllURLs.bind(this), { jslogContext: "copy-all-urls" });
      if (request.requestHeadersText()) {
        copyMenu.saveSection().appendItem(i18nString19(UIStrings19.copyRequestHeaders), _NetworkLogView.copyRequestHeaders.bind(null, request), { jslogContext: "copy-request-headers" });
      }
      if (request.responseHeadersText) {
        copyMenu.saveSection().appendItem(i18nString19(UIStrings19.copyResponseHeaders), _NetworkLogView.copyResponseHeaders.bind(null, request), { jslogContext: "copy-response-headers" });
      }
      if (request.finished) {
        copyMenu.saveSection().appendItem(i18nString19(UIStrings19.copyResponse), _NetworkLogView.copyResponse.bind(null, request), { jslogContext: "copy-response" });
      }
      const initiator = request.initiator();
      if (initiator) {
        const stack = initiator.stack;
        if (stack) {
          const stackTraceText = computeStackTraceText(stack);
          if (stackTraceText !== "") {
            copyMenu.saveSection().appendItem(i18nString19(UIStrings19.copyStacktrace), () => {
              Host9.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(stackTraceText);
            }, { jslogContext: "copy-stacktrace" });
          }
        }
      }
      const disableIfBlob = request.isBlobRequest();
      if (Host9.Platform.isWin()) {
        copyMenu.defaultSection().appendItem(i18nString19(UIStrings19.copyAsCurlCmd), this.copyCurlCommand.bind(this, request, "win"), { disabled: disableIfBlob, jslogContext: "copy-as-curl-cmd" });
        copyMenu.defaultSection().appendItem(i18nString19(UIStrings19.copyAsCurlBash), this.copyCurlCommand.bind(this, request, "unix"), { disabled: disableIfBlob, jslogContext: "copy-as-curl-bash" });
      } else {
        copyMenu.defaultSection().appendItem(i18nString19(UIStrings19.copyAsCurl), this.copyCurlCommand.bind(this, request, "unix"), { disabled: disableIfBlob, jslogContext: "copy-as-curl" });
      }
      copyMenu.defaultSection().appendItem(i18nString19(UIStrings19.copyAsPowershell), this.copyPowerShellCommand.bind(this, request), { disabled: disableIfBlob, jslogContext: "copy-as-powershell" });
      copyMenu.defaultSection().appendItem(i18nString19(UIStrings19.copyAsFetch), this.copyFetchCall.bind(
        this,
        request,
        0
        /* FetchStyle.BROWSER */
      ), { disabled: disableIfBlob, jslogContext: "copy-as-fetch" });
      copyMenu.defaultSection().appendItem(i18nString19(UIStrings19.copyAsNodejsFetch), this.copyFetchCall.bind(
        this,
        request,
        1
        /* FetchStyle.NODE_JS */
      ), { disabled: disableIfBlob, jslogContext: "copy-as-nodejs-fetch" });
      if (Host9.Platform.isWin()) {
        copyMenu.footerSection().appendItem(filtered ? i18nString19(UIStrings19.copyAllListedAsCurlCmd) : i18nString19(UIStrings19.copyAllAsCurlCmd), this.copyAllCurlCommand.bind(this, "win"), { jslogContext: "copy-all-as-curl-cmd" });
        copyMenu.footerSection().appendItem(filtered ? i18nString19(UIStrings19.copyAllListedAsCurlBash) : i18nString19(UIStrings19.copyAllAsCurlBash), this.copyAllCurlCommand.bind(this, "unix"), { jslogContext: "copy-all-as-curl-bash" });
      } else {
        copyMenu.footerSection().appendItem(filtered ? i18nString19(UIStrings19.copyAllListedAsCurl) : i18nString19(UIStrings19.copyAllAsCurl), this.copyAllCurlCommand.bind(this, "unix"), { jslogContext: "copy-all-as-curl" });
      }
      copyMenu.footerSection().appendItem(filtered ? i18nString19(UIStrings19.copyAllListedAsPowershell) : i18nString19(UIStrings19.copyAllAsPowershell), this.copyAllPowerShellCommand.bind(this), { jslogContext: "copy-all-as-powershell" });
      copyMenu.footerSection().appendItem(filtered ? i18nString19(UIStrings19.copyAllListedAsFetch) : i18nString19(UIStrings19.copyAllAsFetch), this.copyAllFetchCall.bind(
        this,
        0
        /* FetchStyle.BROWSER */
      ), { jslogContext: "copy-all-as-fetch" });
      copyMenu.footerSection().appendItem(filtered ? i18nString19(UIStrings19.copyAllListedAsNodejsFetch) : i18nString19(UIStrings19.copyAllAsNodejsFetch), this.copyAllFetchCall.bind(
        this,
        1
        /* FetchStyle.NODE_JS */
      ), { jslogContext: "copy-all-as-nodejs-fetch" });
    }
    copyMenu.footerSection().appendItem(filtered ? i18nString19(UIStrings19.copyAllListedAsHarSanitized) : i18nString19(UIStrings19.copyAllAsHarSanitized), this.copyAllAsHAR.bind(this, { sanitize: true }), { jslogContext: "copy-all-as-har" });
    if (this.networkShowOptionsToGenerateHarWithSensitiveData.get()) {
      copyMenu.footerSection().appendItem(filtered ? i18nString19(UIStrings19.copyAllListedAsHarWithSensitiveData) : i18nString19(UIStrings19.copyAllAsHarWithSensitiveData), this.copyAllAsHAR.bind(this, { sanitize: false }), { jslogContext: "copy-all-as-har-with-sensitive-data" });
    }
    contextMenu.overrideSection().appendItem(i18nString19(UIStrings19.overrideHeaders), this.#handleCreateResponseHeaderOverrideClick.bind(this, request), {
      disabled: Persistence.NetworkPersistenceManager.NetworkPersistenceManager.isForbiddenNetworkUrl(request.url()),
      jslogContext: "override-headers"
    });
    contextMenu.editSection().appendItem(i18nString19(UIStrings19.clearBrowserCache), this.clearBrowserCache.bind(this), { jslogContext: "clear-browser-cache" });
    contextMenu.editSection().appendItem(i18nString19(UIStrings19.clearBrowserCookies), this.clearBrowserCookies.bind(this), { jslogContext: "clear-browser-cookies" });
    if (request) {
      const maxBlockedURLLength = 20;
      const manager = SDK14.NetworkManager.MultitargetNetworkManager.instance();
      if (!Root2.Runtime.hostConfig.devToolsIndividualRequestThrottling?.enabled) {
        let addBlockedURL = function(url) {
          manager.requestConditions.add(SDK14.NetworkManager.RequestCondition.createFromSetting({ enabled: true, url }));
          manager.requestConditions.conditionsEnabled = true;
          void UI22.ViewManager.ViewManager.instance().showView("network.blocked-urls");
        }, removeBlockedURL = function(url) {
          const entry = manager.requestConditions.findCondition(url);
          if (entry) {
            manager.requestConditions.delete(entry);
          }
          void UI22.ViewManager.ViewManager.instance().showView("network.blocked-urls");
        };
        const urlWithoutScheme = request.parsedURL.urlWithoutScheme();
        if (urlWithoutScheme && !manager.requestConditions.has(urlWithoutScheme)) {
          contextMenu.debugSection().appendItem(i18nString19(UIStrings19.blockRequestUrl), addBlockedURL.bind(null, urlWithoutScheme), { jslogContext: "block-request-url" });
        } else if (urlWithoutScheme) {
          const croppedURL = Platform10.StringUtilities.trimMiddle(urlWithoutScheme, maxBlockedURLLength);
          contextMenu.debugSection().appendItem(i18nString19(UIStrings19.unblockS, { PH1: croppedURL }), removeBlockedURL.bind(null, urlWithoutScheme), { jslogContext: "unblock" });
        }
        const domain = request.parsedURL.domain();
        if (domain && !manager.requestConditions.has(domain)) {
          contextMenu.debugSection().appendItem(i18nString19(UIStrings19.blockRequestDomain), addBlockedURL.bind(null, domain), { jslogContext: "block-request-domain" });
        } else if (domain) {
          const croppedDomain = Platform10.StringUtilities.trimMiddle(domain, maxBlockedURLLength);
          contextMenu.debugSection().appendItem(i18nString19(UIStrings19.unblockS, { PH1: croppedDomain }), removeBlockedURL.bind(null, domain), { jslogContext: "unblock" });
        }
      } else {
        let removeRequestCondition = function(pattern) {
          const entry = manager.requestConditions.findCondition(pattern.constructorString);
          if (entry) {
            manager.requestConditions.delete(entry);
            void UI22.ViewManager.ViewManager.instance().showView("network.blocked-urls");
          }
        }, addRequestCondition = function(pattern, conditions) {
          const entry = manager.requestConditions.findCondition(pattern.constructorString);
          if (entry) {
            entry.conditions = conditions;
          } else {
            manager.requestConditions.add(SDK14.NetworkManager.RequestCondition.create(pattern, conditions));
          }
          manager.requestConditions.conditionsEnabled = true;
          void UI22.ViewManager.ViewManager.instance().showView("network.blocked-urls");
        };
        const blockingMenu = contextMenu.debugSection().appendSubMenuItem(
          i18nString19(UIStrings19.blockRequests),
          /* disabled=*/
          true
        );
        const throttlingMenu = contextMenu.debugSection().appendSubMenuItem(
          i18nString19(UIStrings19.throttleRequests),
          /* disabled=*/
          true
        );
        const urlWithoutScheme = request.parsedURL.urlWithoutScheme();
        const urlPattern = urlWithoutScheme && SDK14.NetworkManager.RequestURLPattern.create(`*://${urlWithoutScheme}`);
        if (urlPattern) {
          throttlingMenu.setEnabled(true);
          blockingMenu.setEnabled(true);
          const existingConditions = manager.requestConditions.findCondition(urlPattern.constructorString);
          const isBlocking = existingConditions?.conditions === SDK14.NetworkManager.BlockingConditions;
          const isThrottling = existingConditions && existingConditions.conditions !== SDK14.NetworkManager.BlockingConditions && existingConditions.conditions !== SDK14.NetworkManager.NoThrottlingConditions;
          blockingMenu.debugSection().appendItem(isBlocking ? i18nString19(UIStrings19.unblockS, { PH1: urlPattern.constructorString }) : i18nString19(UIStrings19.blockRequestUrl), () => isBlocking ? removeRequestCondition(urlPattern) : addRequestCondition(urlPattern, SDK14.NetworkManager.BlockingConditions), { jslogContext: "block-request-url" });
          throttlingMenu.debugSection().appendItem(isThrottling ? i18nString19(UIStrings19.unthrottleS, { PH1: urlPattern.constructorString }) : i18nString19(UIStrings19.throttleRequestUrl), () => isThrottling ? removeRequestCondition(urlPattern) : addRequestCondition(urlPattern, SDK14.NetworkManager.Slow3GConditions), { jslogContext: "throttle-request-url" });
        }
        const domain = request.parsedURL.domain();
        const domainPattern = domain && SDK14.NetworkManager.RequestURLPattern.create(`*://${domain}`);
        if (domainPattern) {
          throttlingMenu.setEnabled(true);
          blockingMenu.setEnabled(true);
          const existingConditions = manager.requestConditions.findCondition(domainPattern.constructorString);
          const isBlocking = existingConditions?.conditions === SDK14.NetworkManager.BlockingConditions;
          const isThrottling = existingConditions && existingConditions.conditions !== SDK14.NetworkManager.BlockingConditions && existingConditions.conditions !== SDK14.NetworkManager.NoThrottlingConditions;
          blockingMenu.debugSection().appendItem(isBlocking ? i18nString19(UIStrings19.unblockS, { PH1: domainPattern.constructorString }) : i18nString19(UIStrings19.blockRequestDomain), () => isBlocking ? removeRequestCondition(domainPattern) : addRequestCondition(domainPattern, SDK14.NetworkManager.BlockingConditions), { jslogContext: "block-request-domain" });
          throttlingMenu.debugSection().appendItem(isThrottling ? i18nString19(UIStrings19.unthrottleS, { PH1: domainPattern.constructorString }) : i18nString19(UIStrings19.throttleRequestDomain), () => isThrottling ? removeRequestCondition(domainPattern) : addRequestCondition(domainPattern, SDK14.NetworkManager.Slow3GConditions), { jslogContext: "throttle-request-domain" });
        }
      }
      if (SDK14.NetworkManager.NetworkManager.canReplayRequest(request)) {
        contextMenu.debugSection().appendItem(i18nString19(UIStrings19.replayXhr), SDK14.NetworkManager.NetworkManager.replayRequest.bind(null, request), { jslogContext: "replay-xhr" });
      }
    }
  }
  harRequests() {
    const requests = Logs5.NetworkLog.NetworkLog.instance().requests().filter((request) => this.applyFilter(request));
    return requests.filter(_NetworkLogView.getHTTPRequestsFilter).filter((request) => {
      return request.finished || request.resourceType() === Common16.ResourceType.resourceTypes.WebSocket && request.responseReceivedTime;
    });
  }
  async copyAllAsHAR(options) {
    const harArchive = { log: await HAR.Log.Log.build(this.harRequests(), options) };
    Host9.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(JSON.stringify(harArchive, null, 2));
  }
  copyAllURLs() {
    const requests = Logs5.NetworkLog.NetworkLog.instance().requests().filter((request) => this.applyFilter(request));
    const nonBlobRequests = this.filterOutBlobRequests(requests);
    const urls = nonBlobRequests.map((request) => request.url());
    Host9.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(urls.join("\n"));
  }
  async copyCurlCommand(request, platform) {
    const command = await _NetworkLogView.generateCurlCommand(request, platform);
    Host9.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(command);
  }
  async copyAllCurlCommand(platform) {
    const requests = Logs5.NetworkLog.NetworkLog.instance().requests().filter((request) => this.applyFilter(request));
    const commands = await this.generateAllCurlCommand(requests, platform);
    Host9.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(commands);
  }
  async copyFetchCall(request, style) {
    const command = await this.generateFetchCall(request, style);
    Host9.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(command);
  }
  async copyAllFetchCall(style) {
    const requests = Logs5.NetworkLog.NetworkLog.instance().requests().filter((request) => this.applyFilter(request));
    const commands = await this.generateAllFetchCall(requests, style);
    Host9.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(commands);
  }
  async copyPowerShellCommand(request) {
    const command = await this.generatePowerShellCommand(request);
    Host9.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(command);
  }
  async copyAllPowerShellCommand() {
    const requests = Logs5.NetworkLog.NetworkLog.instance().requests().filter((request) => this.applyFilter(request));
    const commands = await this.generateAllPowerShellCommand(requests);
    Host9.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(commands);
  }
  async exportAll(options) {
    const mainTarget = SDK14.TargetManager.TargetManager.instance().scopeTarget();
    if (!mainTarget) {
      return;
    }
    const url = mainTarget.inspectedURL();
    const parsedURL = Common16.ParsedURL.ParsedURL.fromString(url);
    const filename = parsedURL ? parsedURL.host : "network-log";
    const stream = new Bindings2.FileUtils.FileOutputStream();
    if (!await stream.open(Common16.ParsedURL.ParsedURL.concatenate(filename, ".har"))) {
      return;
    }
    const progressIndicator = this.progressBarContainer.createChild("devtools-progress");
    await HAR.Writer.Writer.write(stream, this.harRequests(), options, progressIndicator);
    progressIndicator.done = true;
    void stream.close();
  }
  async #handleCreateResponseHeaderOverrideClick(request) {
    const requestLocation = NetworkForward3.UIRequestLocation.UIRequestLocation.responseHeaderMatch(request, { name: "", value: "" });
    const networkPersistenceManager = Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance();
    if (networkPersistenceManager.project()) {
      Common16.Settings.Settings.instance().moduleSetting("persistence-network-overrides-enabled").set(true);
      await networkPersistenceManager.getOrCreateHeadersUISourceCodeFromUrl(request.url());
      await Common16.Revealer.reveal(requestLocation);
    } else {
      UI22.InspectorView.InspectorView.instance().displaySelectOverrideFolderInfobar(async () => {
        await Sources.SourcesNavigator.OverridesNavigatorView.instance().setupNewWorkspace();
        await networkPersistenceManager.getOrCreateHeadersUISourceCodeFromUrl(request.url());
        await Common16.Revealer.reveal(requestLocation);
      });
    }
  }
  clearBrowserCache() {
    if (confirm(i18nString19(UIStrings19.areYouSureYouWantToClearBrowser))) {
      SDK14.NetworkManager.MultitargetNetworkManager.instance().clearBrowserCache();
    }
  }
  clearBrowserCookies() {
    if (confirm(i18nString19(UIStrings19.areYouSureYouWantToClearBrowserCookies))) {
      SDK14.NetworkManager.MultitargetNetworkManager.instance().clearBrowserCookies();
    }
  }
  applyFilter(request) {
    if (this.timeFilter && !this.timeFilter(request)) {
      return false;
    }
    const categoryName = request.resourceType().category().name;
    if (!this.resourceCategoryFilterUI.accept(categoryName)) {
      return false;
    }
    const [hideDataURL, blockedCookies, blockedRequests, thirdParty, hideExtensionURL, ippRequests] = [
      this.networkHideDataURLSetting.get(),
      this.networkShowBlockedCookiesOnlySetting.get(),
      this.networkOnlyBlockedRequestsSetting.get(),
      this.networkOnlyThirdPartySetting.get(),
      this.networkHideChromeExtensions.get(),
      // TODO(crbug.com/425645896): Remove this guard once IP Protection is fully launched.
      Root2.Runtime.hostConfig.devToolsIpProtectionInDevTools?.enabled ? this.networkOnlyIPProtectedRequestsSetting.get() : false
    ];
    if (hideDataURL && (request.parsedURL.isDataURL() || request.parsedURL.isBlobURL())) {
      return false;
    }
    if (blockedCookies && !request.blockedResponseCookies().length) {
      return false;
    }
    if (blockedRequests && !request.wasBlocked() && !request.corsErrorStatus()) {
      return false;
    }
    if (thirdParty && request.isSameSite()) {
      return false;
    }
    if (hideExtensionURL && request.scheme === "chrome-extension") {
      return false;
    }
    if (Root2.Runtime.hostConfig.devToolsIpProtectionInDevTools?.enabled) {
      if (ippRequests && !request.isIpProtectionUsed()) {
        return false;
      }
    }
    for (let i = 0; i < this.filters.length; ++i) {
      if (!this.filters[i](request)) {
        return false;
      }
    }
    return true;
  }
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
  parseFilterQuery(query, invert) {
    const descriptors = this.filterParser.parse(query);
    this.filters = descriptors.map((descriptor) => {
      const key = descriptor.key;
      const text = descriptor.text || "";
      const regex = descriptor.regex;
      let filter;
      if (key) {
        const defaultText = Platform10.StringUtilities.escapeForRegExp(key + ":" + text);
        filter = this.createSpecialFilter(key, text) || _NetworkLogView.requestPathFilter.bind(null, new RegExp(defaultText, "i"));
      } else if (descriptor.regex) {
        filter = _NetworkLogView.requestPathFilter.bind(null, regex);
      } else if (this.isValidUrl(text)) {
        filter = _NetworkLogView.requestUrlFilter.bind(null, text);
      } else {
        filter = _NetworkLogView.requestPathFilter.bind(null, new RegExp(Platform10.StringUtilities.escapeForRegExp(text), "i"));
      }
      if (descriptor.negative && !invert || !descriptor.negative && invert) {
        return _NetworkLogView.negativeFilter.bind(null, filter);
      }
      return filter;
    });
  }
  createSpecialFilter(type, value) {
    switch (type) {
      case NetworkForward3.UIFilter.FilterType.Domain:
        return _NetworkLogView.createRequestDomainFilter(value);
      case NetworkForward3.UIFilter.FilterType.HasResponseHeader:
        return _NetworkLogView.requestResponseHeaderFilter.bind(null, value);
      case NetworkForward3.UIFilter.FilterType.ResponseHeaderValueSetCookie:
        return _NetworkLogView.requestResponseHeaderSetCookieFilter.bind(null, value);
      case NetworkForward3.UIFilter.FilterType.HasRequestHeader:
        return _NetworkLogView.requestRequestHeaderFilter.bind(null, value);
      case NetworkForward3.UIFilter.FilterType.Is:
        if (value.toLowerCase() === "running") {
          return _NetworkLogView.runningRequestFilter;
        }
        if (value.toLowerCase() === "from-cache") {
          return _NetworkLogView.fromCacheRequestFilter;
        }
        if (value.toLowerCase() === "service-worker-intercepted") {
          return _NetworkLogView.interceptedByServiceWorkerFilter;
        }
        if (value.toLowerCase() === "service-worker-initiated") {
          return _NetworkLogView.initiatedByServiceWorkerFilter;
        }
        break;
      case NetworkForward3.UIFilter.FilterType.LargerThan:
        return this.createSizeFilter(value.toLowerCase());
      case NetworkForward3.UIFilter.FilterType.Method:
        return _NetworkLogView.requestMethodFilter.bind(null, value);
      case NetworkForward3.UIFilter.FilterType.MimeType:
        return _NetworkLogView.requestMimeTypeFilter.bind(null, value);
      case NetworkForward3.UIFilter.FilterType.MixedContent:
        return _NetworkLogView.requestMixedContentFilter.bind(null, value);
      case NetworkForward3.UIFilter.FilterType.Scheme:
        return _NetworkLogView.requestSchemeFilter.bind(null, value);
      case NetworkForward3.UIFilter.FilterType.SetCookieDomain:
        return _NetworkLogView.requestSetCookieDomainFilter.bind(null, value);
      case NetworkForward3.UIFilter.FilterType.SetCookieName:
        return _NetworkLogView.requestSetCookieNameFilter.bind(null, value);
      case NetworkForward3.UIFilter.FilterType.SetCookieValue:
        return _NetworkLogView.requestSetCookieValueFilter.bind(null, value);
      case NetworkForward3.UIFilter.FilterType.CookieDomain:
        return _NetworkLogView.requestCookieDomainFilter.bind(null, value);
      case NetworkForward3.UIFilter.FilterType.CookieName:
        return _NetworkLogView.requestCookieNameFilter.bind(null, value);
      case NetworkForward3.UIFilter.FilterType.CookiePath:
        return _NetworkLogView.requestCookiePathFilter.bind(null, value);
      case NetworkForward3.UIFilter.FilterType.CookieValue:
        return _NetworkLogView.requestCookieValueFilter.bind(null, value);
      case NetworkForward3.UIFilter.FilterType.Priority:
        return _NetworkLogView.requestPriorityFilter.bind(null, PerfUI4.NetworkPriorities.uiLabelToNetworkPriority(value));
      case NetworkForward3.UIFilter.FilterType.StatusCode:
        return _NetworkLogView.statusCodeFilter.bind(null, value);
      case NetworkForward3.UIFilter.FilterType.HasOverrides:
        return _NetworkLogView.hasOverridesFilter.bind(null, value);
      case NetworkForward3.UIFilter.FilterType.ResourceType:
        return _NetworkLogView.resourceTypeFilter.bind(null, value);
      case NetworkForward3.UIFilter.FilterType.Url:
        return _NetworkLogView.requestUrlFilter.bind(null, value);
    }
    return null;
  }
  createSizeFilter(value) {
    let multiplier = 1;
    if (value.endsWith("k")) {
      multiplier = 1e3;
      value = value.substring(0, value.length - 1);
    } else if (value.endsWith("m")) {
      multiplier = 1e3 * 1e3;
      value = value.substring(0, value.length - 1);
    }
    const quantity = Number(value);
    if (isNaN(quantity)) {
      return null;
    }
    return _NetworkLogView.requestSizeLargerThanFilter.bind(null, quantity * multiplier);
  }
  filterRequests() {
    this.removeAllNodeHighlights();
    this.invalidateAllItems();
  }
  reveal(request) {
    this.removeAllNodeHighlights();
    const node = this.networkRequestToNode.get(request);
    if (!node?.dataGrid) {
      return null;
    }
    if (node.parent && node.parent instanceof NetworkGroupNode) {
      node.parent.reveal();
      node.parent.expand();
    }
    node.reveal();
    return node;
  }
  revealAndHighlightRequest(request) {
    const node = this.reveal(request);
    if (node) {
      this.highlightNode(node);
    }
  }
  revealAndHighlightRequestWithId(requestId) {
    const request = Logs5.NetworkLog.NetworkLog.instance().requestByManagerAndId(requestId.manager, requestId.requestId);
    if (request) {
      this.revealAndHighlightRequest(request);
    }
  }
  selectRequest(request, options) {
    const defaultOptions = { clearFilter: true };
    const { clearFilter } = options || defaultOptions;
    if (clearFilter) {
      this.setTextFilterValue("");
    }
    const node = this.reveal(request);
    if (node) {
      node.select();
    }
  }
  removeAllNodeHighlights() {
    if (this.highlightedNode) {
      this.highlightedNode.element().classList.remove("highlighted-row");
      this.highlightedNode = null;
    }
  }
  highlightNode(node) {
    UI22.UIUtils.runCSSAnimationOnce(node.element(), "highlighted-row");
    this.highlightedNode = node;
  }
  filterOutBlobRequests(requests) {
    return requests.filter((request) => !request.isBlobRequest());
  }
  async generateFetchCall(request, style) {
    const ignoredHeaders = /* @__PURE__ */ new Set([
      // Internal headers
      "method",
      "path",
      "scheme",
      "version",
      // Unsafe headers
      // Keep this list synchronized with src/net/http/http_util.cc
      "accept-charset",
      "accept-encoding",
      "access-control-request-headers",
      "access-control-request-method",
      "connection",
      "content-length",
      "cookie",
      "cookie2",
      "date",
      "dnt",
      "expect",
      "host",
      "keep-alive",
      "origin",
      "referer",
      "te",
      "trailer",
      "transfer-encoding",
      "upgrade",
      "via",
      // TODO(phistuck) - remove this once crbug.com/571722 is fixed.
      "user-agent"
    ]);
    const credentialHeaders = /* @__PURE__ */ new Set(["cookie", "authorization"]);
    const url = JSON.stringify(request.url());
    const requestHeaders = request.requestHeaders();
    const headerData = requestHeaders.reduce((result, header) => {
      const name = header.name;
      if (!ignoredHeaders.has(name.toLowerCase()) && !name.includes(":")) {
        result.append(name, header.value);
      }
      return result;
    }, new Headers());
    const headers = {};
    for (const headerArray of headerData) {
      headers[headerArray[0]] = headerArray[1];
    }
    const credentials = request.includedRequestCookies().length || requestHeaders.some(({ name }) => credentialHeaders.has(name.toLowerCase())) ? "include" : "omit";
    const referrerHeader = requestHeaders.find(({ name }) => name.toLowerCase() === "referer");
    const referrer = referrerHeader ? referrerHeader.value : void 0;
    const requestBody = await request.requestFormData();
    const fetchOptions = {
      headers: Object.keys(headers).length ? headers : void 0,
      referrer,
      body: requestBody,
      method: request.requestMethod,
      mode: "cors"
    };
    if (style === 1) {
      const cookieHeader = requestHeaders.find((header) => header.name.toLowerCase() === "cookie");
      const extraHeaders = {};
      delete fetchOptions.mode;
      if (cookieHeader) {
        extraHeaders["cookie"] = cookieHeader.value;
      }
      if (referrer) {
        delete fetchOptions.referrer;
        extraHeaders["Referer"] = referrer;
      }
      if (Object.keys(extraHeaders).length) {
        fetchOptions.headers = {
          ...headers,
          ...extraHeaders
        };
      }
    } else {
      fetchOptions.credentials = credentials;
    }
    const options = JSON.stringify(fetchOptions, null, 2);
    return `fetch(${url}, ${options});`;
  }
  async generateAllFetchCall(requests, style) {
    const nonBlobRequests = this.filterOutBlobRequests(requests);
    const commands = await Promise.all(nonBlobRequests.map((request) => this.generateFetchCall(request, style)));
    return commands.join(" ;\n");
  }
  static async generateCurlCommand(request, platform) {
    let command = [];
    const ignoredHeaders = /* @__PURE__ */ new Set(["accept-encoding", "host", "method", "path", "scheme", "version", "authority", "protocol"]);
    function escapeStringWin(str) {
      const encapsChars = '^"';
      return encapsChars + str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[^a-zA-Z0-9\s_\-:=+~'\/.',?;()*`]/g, "^$&").replace(/%(?=[a-zA-Z0-9_])/g, "%^").replace(/[^\S \r\n]/g, " ").replace(/\r?\n|\r/g, "^\n\n") + encapsChars;
    }
    function escapeStringPosix(str) {
      function escapeCharacter(x) {
        const code = x.charCodeAt(0);
        let hexString = code.toString(16);
        while (hexString.length < 4) {
          hexString = "0" + hexString;
        }
        return "\\u" + hexString;
      }
      if (/[\0-\x1F\x7F-\x9F!]|\'/.test(str)) {
        return "$'" + str.replace(/\\/g, "\\\\").replace(/\'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\0-\x1F\x7F-\x9F!]/g, escapeCharacter) + "'";
      }
      return "'" + str + "'";
    }
    const escapeString = platform === "win" ? escapeStringWin : escapeStringPosix;
    command.push(escapeString(request.url()).replace(/[[{}\]]/g, "\\$&"));
    let inferredMethod = "GET";
    const data = [];
    const formData = await request.requestFormData();
    if (formData) {
      data.push("--data-raw " + escapeString(formData));
      ignoredHeaders.add("content-length");
      inferredMethod = "POST";
    }
    if (request.requestMethod !== inferredMethod) {
      command.push("-X " + escapeString(request.requestMethod));
    }
    const requestHeaders = request.requestHeaders();
    for (let i = 0; i < requestHeaders.length; i++) {
      const header = requestHeaders[i];
      const name = header.name.replace(/^:/, "");
      if (ignoredHeaders.has(name.toLowerCase())) {
        continue;
      }
      const value = header.value;
      if (!value.trim()) {
        command.push("-H " + escapeString(name + ";"));
      } else if (name.toLowerCase() === "cookie") {
        command.push("-b " + escapeString(value));
      } else {
        command.push("-H " + escapeString(name + ": " + value));
      }
    }
    command = command.concat(data);
    if (request.securityState() === "insecure") {
      command.push("--insecure");
    }
    return "curl " + command.join(command.length >= 3 ? platform === "win" ? " ^\n  " : " \\\n  " : " ");
  }
  async generateAllCurlCommand(requests, platform) {
    const nonBlobRequests = this.filterOutBlobRequests(requests);
    const commands = await Promise.all(nonBlobRequests.map((request) => _NetworkLogView.generateCurlCommand(request, platform)));
    if (platform === "win") {
      return commands.join(" &\r\n");
    }
    return commands.join(" ;\n");
  }
  async generatePowerShellCommand(request) {
    const command = [];
    const ignoredHeaders = /* @__PURE__ */ new Set([
      "host",
      "connection",
      "proxy-connection",
      "content-length",
      "expect",
      "range",
      "content-type",
      "user-agent",
      "cookie"
    ]);
    function escapeString(str) {
      return '"' + str.replace(/[`\$"]/g, "`$&").replace(/[^\x20-\x7E]/g, (char) => "$([char]" + char.charCodeAt(0) + ")") + '"';
    }
    function generatePowerShellSession(request2) {
      const requestHeaders2 = request2.requestHeaders();
      const props = [];
      const userAgentHeader = requestHeaders2.find(({ name }) => name.toLowerCase() === "user-agent");
      if (userAgentHeader) {
        props.push(`$session.UserAgent = ${escapeString(userAgentHeader.value)}`);
      }
      for (const includedCookie of request2.includedRequestCookies()) {
        const name = escapeString(includedCookie.cookie.name());
        const value = escapeString(includedCookie.cookie.value());
        const domain = escapeString(includedCookie.cookie.domain());
        props.push(`$session.Cookies.Add((New-Object System.Net.Cookie(${name}, ${value}, "/", ${domain})))`);
      }
      if (props.length) {
        return "$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession\n" + props.join("\n") + "\n";
      }
      return null;
    }
    command.push("-Uri " + escapeString(request.url()));
    if (request.requestMethod !== "GET") {
      command.push("-Method " + escapeString(request.requestMethod));
    }
    const session = generatePowerShellSession(request);
    if (session) {
      command.push("-WebSession $session");
    }
    const requestHeaders = request.requestHeaders();
    const headerNameValuePairs = [];
    for (const header of requestHeaders) {
      const name = header.name.replace(/^:/, "");
      if (ignoredHeaders.has(name.toLowerCase())) {
        continue;
      }
      headerNameValuePairs.push(escapeString(name) + "=" + escapeString(header.value));
    }
    if (headerNameValuePairs.length) {
      command.push("-Headers @{\n" + headerNameValuePairs.join("\n  ") + "\n}");
    }
    const contentTypeHeader = requestHeaders.find(({ name }) => name.toLowerCase() === "content-type");
    if (contentTypeHeader) {
      command.push("-ContentType " + escapeString(contentTypeHeader.value));
    }
    const formData = await request.requestFormData();
    if (formData) {
      const body = escapeString(formData);
      if (/[^\x20-\x7E]/.test(formData)) {
        command.push("-Body ([System.Text.Encoding]::UTF8.GetBytes(" + body + "))");
      } else {
        command.push("-Body " + body);
      }
    }
    const prelude = session || "";
    return prelude + "Invoke-WebRequest -UseBasicParsing " + command.join(command.length >= 3 ? " `\n" : " ");
  }
  async generateAllPowerShellCommand(requests) {
    const nonBlobRequests = this.filterOutBlobRequests(requests);
    const commands = await Promise.all(nonBlobRequests.map((request) => this.generatePowerShellCommand(request)));
    return commands.join(";\r\n");
  }
  static getDCLEventColor() {
    return "--sys-color-blue";
  }
  static getLoadEventColor() {
    return "--sys-color-error";
  }
};
function computeStackTraceText(stackTrace) {
  let stackTraceText = "";
  for (const frame of stackTrace.callFrames) {
    const functionName = UI22.UIUtils.beautifyFunctionName(frame.functionName);
    stackTraceText += `${functionName} @ ${frame.url}:${frame.lineNumber + 1}
`;
  }
  if (stackTrace.parent) {
    stackTraceText += computeStackTraceText(stackTrace.parent);
  }
  return stackTraceText;
}
var filteredNetworkRequests = /* @__PURE__ */ new WeakSet();
function isRequestFilteredOut(request) {
  return filteredNetworkRequests.has(request);
}
var HTTPSchemas = {
  http: true,
  https: true,
  ws: true,
  wss: true
};
var searchKeys = Object.values(NetworkForward3.UIFilter.FilterType);
var overrideFilter = {
  yes: "yes",
  no: "no",
  content: "content",
  headers: "headers"
};
var MoreFiltersDropDownUI = class extends Common16.ObjectWrapper.ObjectWrapper {
  filterElement;
  dropDownButton;
  networkHideDataURLSetting;
  networkHideChromeExtensionsSetting;
  networkShowBlockedCookiesOnlySetting;
  networkOnlyBlockedRequestsSetting;
  networkOnlyThirdPartySetting;
  networkOnlyIPProtectedRequestsSetting;
  activeFiltersCount;
  activeFiltersCountAdorner;
  constructor() {
    super();
    this.networkHideDataURLSetting = Common16.Settings.Settings.instance().createSetting("network-hide-data-url", false);
    this.networkHideChromeExtensionsSetting = Common16.Settings.Settings.instance().createSetting("network-hide-chrome-extensions", false);
    this.networkShowBlockedCookiesOnlySetting = Common16.Settings.Settings.instance().createSetting("network-show-blocked-cookies-only-setting", false);
    this.networkOnlyBlockedRequestsSetting = Common16.Settings.Settings.instance().createSetting("network-only-blocked-requests", false);
    this.networkOnlyThirdPartySetting = Common16.Settings.Settings.instance().createSetting("network-only-third-party-setting", false);
    this.networkOnlyIPProtectedRequestsSetting = Common16.Settings.Settings.instance().createSetting("network-only-ip-protected-requests", false);
    this.filterElement = document.createElement("div");
    this.filterElement.setAttribute("aria-label", "Show only/hide requests dropdown");
    this.filterElement.setAttribute("jslog", `${VisualLogging13.dropDown("more-filters").track({ click: true })}`);
    this.activeFiltersCountAdorner = new Adorners.Adorner.Adorner();
    this.activeFiltersCount = document.createElement("span");
    this.activeFiltersCountAdorner.data = {
      name: "countWrapper",
      content: this.activeFiltersCount
    };
    this.activeFiltersCountAdorner.classList.add("active-filters-count");
    this.updateActiveFiltersCount();
    this.dropDownButton = new UI22.Toolbar.ToolbarMenuButton(
      this.showMoreFiltersContextMenu.bind(this),
      /* isIconDropdown=*/
      false,
      /* useSoftMenu=*/
      true,
      /* jslogContext=*/
      void 0,
      /* iconName=*/
      void 0,
      /* keepOpen=*/
      true
    );
    this.dropDownButton.setTitle(i18nString19(UIStrings19.showOnlyHideRequests));
    this.dropDownButton.setText(i18nString19(UIStrings19.moreFilters));
    this.dropDownButton.setAdorner(this.activeFiltersCountAdorner);
    this.filterElement.appendChild(this.dropDownButton.element);
    this.dropDownButton.element.classList.add("dropdown-filterbar");
    this.updateTooltip();
  }
  #onSettingChanged() {
    this.dispatchEventToListeners(
      "FilterChanged"
      /* UI.FilterBar.FilterUIEvents.FILTER_CHANGED */
    );
  }
  showMoreFiltersContextMenu(contextMenu) {
    this.networkHideDataURLSetting.addChangeListener(this.#onSettingChanged.bind(this));
    this.networkHideChromeExtensionsSetting.addChangeListener(this.#onSettingChanged.bind(this));
    this.networkShowBlockedCookiesOnlySetting.addChangeListener(this.#onSettingChanged.bind(this));
    this.networkOnlyBlockedRequestsSetting.addChangeListener(this.#onSettingChanged.bind(this));
    this.networkOnlyThirdPartySetting.addChangeListener(this.#onSettingChanged.bind(this));
    if (Root2.Runtime.hostConfig.devToolsIpProtectionInDevTools?.enabled) {
      this.networkOnlyIPProtectedRequestsSetting.addChangeListener(this.#onSettingChanged.bind(this));
    }
    contextMenu.defaultSection().appendCheckboxItem(i18nString19(UIStrings19.hideDataUrls), () => this.networkHideDataURLSetting.set(!this.networkHideDataURLSetting.get()), {
      checked: this.networkHideDataURLSetting.get(),
      tooltip: i18nString19(UIStrings19.hidesDataAndBlobUrls),
      jslogContext: "hide-data-urls"
    });
    contextMenu.defaultSection().appendCheckboxItem(i18nString19(UIStrings19.chromeExtensions), () => this.networkHideChromeExtensionsSetting.set(!this.networkHideChromeExtensionsSetting.get()), {
      checked: this.networkHideChromeExtensionsSetting.get(),
      tooltip: i18nString19(UIStrings19.hideChromeExtension),
      jslogContext: "hide-extension-urls"
    });
    contextMenu.defaultSection().appendSeparator();
    contextMenu.defaultSection().appendCheckboxItem(i18nString19(UIStrings19.hasBlockedCookies), () => this.networkShowBlockedCookiesOnlySetting.set(!this.networkShowBlockedCookiesOnlySetting.get()), {
      checked: this.networkShowBlockedCookiesOnlySetting.get(),
      tooltip: i18nString19(UIStrings19.onlyShowRequestsWithBlockedCookies),
      jslogContext: "only-blocked-response-cookies"
    });
    contextMenu.defaultSection().appendCheckboxItem(i18nString19(UIStrings19.blockedRequests), () => this.networkOnlyBlockedRequestsSetting.set(!this.networkOnlyBlockedRequestsSetting.get()), {
      checked: this.networkOnlyBlockedRequestsSetting.get(),
      tooltip: i18nString19(UIStrings19.onlyShowBlockedRequests),
      jslogContext: "only-blocked-requests"
    });
    if (Root2.Runtime.hostConfig.devToolsIpProtectionInDevTools?.enabled) {
      contextMenu.defaultSection().appendCheckboxItem(i18nString19(UIStrings19.ippRequests), () => this.networkOnlyIPProtectedRequestsSetting.set(!this.networkOnlyIPProtectedRequestsSetting.get()), {
        checked: this.networkOnlyIPProtectedRequestsSetting.get(),
        tooltip: i18nString19(UIStrings19.onlyShowIPProtectedRequests),
        jslogContext: "only-ip-protected-requests"
      });
    }
    contextMenu.defaultSection().appendCheckboxItem(i18nString19(UIStrings19.thirdParty), () => this.networkOnlyThirdPartySetting.set(!this.networkOnlyThirdPartySetting.get()), {
      checked: this.networkOnlyThirdPartySetting.get(),
      tooltip: i18nString19(UIStrings19.onlyShowThirdPartyRequests),
      jslogContext: "only-3rd-party-requests"
    });
  }
  selectedFilters() {
    const filters = [
      ...this.networkHideDataURLSetting.get() ? [i18nString19(UIStrings19.hideDataUrls)] : [],
      ...this.networkHideChromeExtensionsSetting.get() ? [i18nString19(UIStrings19.chromeExtensions)] : [],
      ...this.networkShowBlockedCookiesOnlySetting.get() ? [i18nString19(UIStrings19.hasBlockedCookies)] : [],
      ...this.networkOnlyBlockedRequestsSetting.get() ? [i18nString19(UIStrings19.blockedRequests)] : [],
      ...this.networkOnlyThirdPartySetting.get() ? [i18nString19(UIStrings19.thirdParty)] : [],
      ...Root2.Runtime.hostConfig.devToolsIpProtectionInDevTools?.enabled && this.networkOnlyIPProtectedRequestsSetting.get() ? [i18nString19(UIStrings19.ippRequests)] : []
    ];
    return filters;
  }
  updateActiveFiltersCount() {
    const count = this.selectedFilters().length;
    this.activeFiltersCount.textContent = count.toString();
    count ? this.activeFiltersCountAdorner.classList.remove("hidden") : this.activeFiltersCountAdorner.classList.add("hidden");
  }
  updateTooltip() {
    if (this.selectedFilters().length) {
      this.dropDownButton.setTitle(this.selectedFilters().join(", "));
    } else {
      this.dropDownButton.setTitle(i18nString19(UIStrings19.showOnlyHideRequests));
    }
  }
  isActive() {
    return this.selectedFilters().length !== 0;
  }
  element() {
    return this.filterElement;
  }
};

// gen/front_end/panels/network/NetworkSearchScope.js
var NetworkSearchScope_exports = {};
__export(NetworkSearchScope_exports, {
  NetworkSearchResult: () => NetworkSearchResult,
  NetworkSearchScope: () => NetworkSearchScope
});
import * as i18n39 from "./../../core/i18n/i18n.js";
import * as Platform11 from "./../../core/platform/platform.js";
import * as TextUtils9 from "./../../models/text_utils/text_utils.js";
import * as NetworkForward4 from "./forward/forward.js";
var UIStrings20 = {
  /**
   * @description Text for web URLs
   */
  url: "URL"
};
var str_20 = i18n39.i18n.registerUIStrings("panels/network/NetworkSearchScope.ts", UIStrings20);
var i18nString20 = i18n39.i18n.getLocalizedString.bind(void 0, str_20);
var NetworkSearchScope = class _NetworkSearchScope {
  #networkLog;
  constructor(networkLog) {
    this.#networkLog = networkLog;
  }
  performIndexing(progress) {
    queueMicrotask(() => {
      progress.done = true;
    });
  }
  async performSearch(searchConfig, progress, searchResultCallback, searchFinishedCallback) {
    const promises = [];
    const requests = this.#networkLog.requests().filter((request) => searchConfig.filePathMatchesFileQuery(request.url()));
    progress.totalWork = requests.length;
    for (const request of requests) {
      const promise = this.searchRequest(searchConfig, request, progress);
      promises.push(promise);
    }
    const resultsWithNull = await Promise.all(promises);
    const results = resultsWithNull.filter((result) => result !== null);
    if (progress.canceled) {
      searchFinishedCallback(false);
      return;
    }
    for (const result of results.sort((r1, r2) => r1.label().localeCompare(r2.label()))) {
      if (result.matchesCount() > 0) {
        searchResultCallback(result);
      }
    }
    progress.done = true;
    searchFinishedCallback(true);
  }
  async searchRequest(searchConfig, request, progress) {
    const bodyMatches = await _NetworkSearchScope.#responseBodyMatches(searchConfig, request);
    if (progress.canceled) {
      return null;
    }
    const locations = [];
    if (stringMatchesQuery(request.url())) {
      locations.push(NetworkForward4.UIRequestLocation.UIRequestLocation.urlMatch(request));
    }
    for (const header of request.requestHeaders()) {
      if (headerMatchesQuery(header)) {
        locations.push(NetworkForward4.UIRequestLocation.UIRequestLocation.requestHeaderMatch(request, header));
      }
    }
    for (const header of request.responseHeaders) {
      if (headerMatchesQuery(header)) {
        locations.push(NetworkForward4.UIRequestLocation.UIRequestLocation.responseHeaderMatch(request, header));
      }
    }
    for (const match of bodyMatches) {
      locations.push(NetworkForward4.UIRequestLocation.UIRequestLocation.bodyMatch(request, match));
    }
    ++progress.worked;
    return new NetworkSearchResult(request, locations);
    function headerMatchesQuery(header) {
      return stringMatchesQuery(`${header.name}: ${header.value}`);
    }
    function stringMatchesQuery(string) {
      const flags = searchConfig.ignoreCase() ? "i" : "";
      const regExps = searchConfig.queries().map((query) => new RegExp(Platform11.StringUtilities.escapeForRegExp(query), flags));
      let pos = 0;
      for (const regExp of regExps) {
        const match = string.substr(pos).match(regExp);
        if (match?.index === void 0) {
          return false;
        }
        pos += match.index + match[0].length;
      }
      return true;
    }
  }
  static async #responseBodyMatches(searchConfig, request) {
    if (!request.contentType().isTextType()) {
      return [];
    }
    let matches = [];
    for (const query of searchConfig.queries()) {
      const tmpMatches = await request.searchInContent(query, !searchConfig.ignoreCase(), searchConfig.isRegex());
      if (tmpMatches.length === 0) {
        return [];
      }
      matches = Platform11.ArrayUtilities.mergeOrdered(matches, tmpMatches, TextUtils9.ContentProvider.SearchMatch.comparator);
    }
    return matches;
  }
  stopSearch() {
  }
};
var NetworkSearchResult = class {
  request;
  locations;
  constructor(request, locations) {
    this.request = request;
    this.locations = locations;
  }
  matchesCount() {
    return this.locations.length;
  }
  label() {
    return this.request.displayName;
  }
  description() {
    const parsedUrl = this.request.parsedURL;
    if (!parsedUrl) {
      return this.request.url();
    }
    return parsedUrl.urlWithoutScheme();
  }
  matchLineContent(index) {
    const location = this.locations[index];
    if (location.isUrlMatch) {
      return this.request.url();
    }
    const header = location?.header?.header;
    if (header) {
      return header.value;
    }
    return location.searchMatch.lineContent;
  }
  matchRevealable(index) {
    return this.locations[index];
  }
  matchLabel(index) {
    const location = this.locations[index];
    if (location.isUrlMatch) {
      return i18nString20(UIStrings20.url);
    }
    const header = location?.header?.header;
    if (header) {
      return `${header.name}:`;
    }
    return (location.searchMatch.lineNumber + 1).toString();
  }
  matchColumn(index) {
    const location = this.locations[index];
    return location.searchMatch?.columnNumber;
  }
  matchLength(index) {
    const location = this.locations[index];
    return location.searchMatch?.matchLength;
  }
};

// gen/front_end/panels/network/NetworkPanel.js
var NetworkPanel_exports = {};
__export(NetworkPanel_exports, {
  ActionDelegate: () => ActionDelegate2,
  FilmStripRecorder: () => FilmStripRecorder,
  NetworkLogWithFilterRevealer: () => NetworkLogWithFilterRevealer,
  NetworkPanel: () => NetworkPanel,
  RequestIdRevealer: () => RequestIdRevealer,
  RequestLocationRevealer: () => RequestLocationRevealer,
  RequestRevealer: () => RequestRevealer,
  SearchNetworkView: () => SearchNetworkView
});
import "./../../ui/legacy/legacy.js";
import * as Common17 from "./../../core/common/common.js";
import * as Host10 from "./../../core/host/host.js";
import * as i18n41 from "./../../core/i18n/i18n.js";
import * as Platform12 from "./../../core/platform/platform.js";
import * as SDK15 from "./../../core/sdk/sdk.js";
import * as Logs6 from "./../../models/logs/logs.js";
import * as NetworkTimeCalculator5 from "./../../models/network_time_calculator/network_time_calculator.js";
import * as Trace2 from "./../../models/trace/trace.js";
import * as Workspace from "./../../models/workspace/workspace.js";
import * as NetworkForward5 from "./forward/forward.js";
import * as Tracing from "./../../services/tracing/tracing.js";
import * as PerfUI5 from "./../../ui/legacy/components/perf_ui/perf_ui.js";
import * as SettingsUI5 from "./../../ui/legacy/components/settings_ui/settings_ui.js";
import * as UI23 from "./../../ui/legacy/legacy.js";
import * as VisualLogging14 from "./../../ui/visual_logging/visual_logging.js";
import * as MobileThrottling3 from "./../mobile_throttling/mobile_throttling.js";
import * as Search from "./../search/search.js";

// gen/front_end/panels/network/networkPanel.css.js
var networkPanel_css_default = `/*
 * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2009 Anthony Ricaud <rik@webkit.org>
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

:root {
  --network-overview-total: var(--sys-color-neutral-bright);
  --network-overview-blocking: var(--ref-palette-neutral0);
  --network-overview-connecting: var(--ref-palette-yellow60);
  --network-overview-service-worker: var(--sys-color-orange-bright);
  --network-overview-service-worker-respond-with: var(--sys-color-cyan-bright);
  --network-overview-push: var(--ref-palette-blue60);
  --override-network-overview-proxy: var(--ref-palette-neutral60);
  --network-overview-dns: var(--sys-color-cyan);
  --network-overview-ssl: var(--ref-palette-purple70);
  --override-network-overview-sending: var(--ref-palette-cyan60);
  --network-overview-waiting: var(--ref-palette-green70);
  --network-overview-receiving: var(--ref-palette-blue60);
  --network-overview-queueing: var(--ref-palette-neutral100);
  --network-grid-navigation-color: var(--ref-palette-blue90);
  --network-grid-initiator-path-color: var(--ref-palette-green90);
  --network-grid-initiated-path-color: var(--ref-palette-error80);
  --network-grid-focus-selected-color-has-error: var(--sys-color-surface-error);
  --network-grid-focus-selected-color-has-warning: var(--sys-color-surface-yellow);
  --network-grid-from-frame-color: var(--ref-palette-cyan95);
  --network-grid-is-product-color: var(--ref-palette-yellow95);
  --network-frame-divider-color: var(--ref-palette-yellow60);
}

.theme-with-dark-background {
  --network-overview-blocking: var(--ref-palette-neutral100);
  --network-grid-initiator-path-color: var(--ref-palette-green40);
  --network-grid-initiated-path-color: var(--ref-palette-error20);
  --network-grid-from-frame-color: var(--ref-palette-neutral50);
  --network-grid-is-product-color: var(--ref-palette-neutral70);
}

.network-details-view {
  background: var(--app-color-toolbar-background);
}

.network-details-view-tall-header {
  border-top: 4px solid var(--app-color-toolbar-background);
}

.network-item-view {
  display: flex;
  background: var(--sys-color-cdt-base-container);
}

.network-item-preview-toolbar {
  border-top: 1px solid var(--sys-color-divider);
  background-color: var(--sys-color-surface1);
}

.resource-timing-view {
  display: block;
  margin: 6px;
  color: var(--sys-color-on-surface);
  overflow: auto;
  background-color: var(--sys-color-cdt-base-container);
}

.resource-timing-table {
  width: 100% !important; /* stylelint-disable-line declaration-no-important */
}

#network-overview-panel {
  flex: none;
  position: relative;
}

#network-overview-container {
  overflow: hidden;
  flex: auto;
  display: flex;
  flex-direction: column;
  position: relative;
  border-bottom: 1px solid var(--sys-color-divider);
}

#network-overview-container canvas {
  width: 100%;
  height: 100%;
}

.resources-dividers-label-bar {
  background-color: var(--sys-color-cdt-base-container);
}

#network-overview-grid .resources-dividers-label-bar {
  pointer-events: auto;
}

.network .network-overview {
  flex: 0 0 60px;
}

.network-overview .resources-dividers-label-bar .resources-divider {
  background-color: transparent;
}

.network-overview .resources-dividers {
  z-index: 250;
}

.request-view.html iframe {
  width: 100%;
  height: 100%;
  position: absolute;
}

.network-film-strip {
  border-bottom: solid 1px var(--sys-color-divider);
  flex: none !important; /* stylelint-disable-line declaration-no-important */
}

.network-film-strip-placeholder {
  flex-shrink: 0;
}

.network-tabbed-pane {
  background-color: var(--sys-color-cdt-base-container);
}

.network-settings-pane {
  display: grid;
  grid-template-columns: 50% 50%;
  flex: none;
  background-color: var(--sys-color-cdt-base-container);
  border-bottom: 1px solid var(--sys-color-divider);
}

.network-toolbar-container {
  display: flex;
  align-items: flex-start;
  flex: none;
  background-color: var(--sys-color-cdt-base-container);
  border-bottom: 1px solid var(--sys-color-divider);

  & > :first-child {
    flex: 1 1 auto;
  }
}

@media (forced-colors: active) {
  .panel.network devtools-toolbar {
    background-color: canvas;
  }
}

devtools-request-headers {
  min-width: 360px;
}

/*# sourceURL=${import.meta.resolve("./networkPanel.css")} */`;

// gen/front_end/panels/network/NetworkPanel.js
var UIStrings21 = {
  /**
   * @description Text to close something
   */
  close: "Close",
  /**
   * @description Title of a search bar or tool
   */
  search: "Search",
  /**
   * @description Tooltip text that appears on the setting to preserve log when hovering over the item
   */
  doNotClearLogOnPageReload: "Do not clear log on page reload / navigation",
  /**
   * @description Text to preserve the log after refreshing
   */
  preserveLog: "Preserve log",
  /**
   * @description Text to disable cache while DevTools is open
   */
  disableCacheWhileDevtoolsIsOpen: "Disable cache while DevTools is open",
  /**
   * @description Text in Network Config View of the Network panel
   */
  disableCache: "Disable cache",
  /**
   * @description Tooltip text that appears when hovering over the largeicon settings gear in show settings pane setting in network panel of the network panel
   */
  networkSettings: "Network settings",
  /**
   * @description Tooltip for expanding network request row setting
   */
  showMoreInformationInRequestRows: "Show more information in request rows",
  /**
   * @description Text in Network Panel used to toggle the "big request rows" setting.
   */
  useLargeRequestRows: "Big request rows",
  /**
   * @description Tooltip text for network request overview setting
   */
  showOverviewOfNetworkRequests: "Show overview of network requests",
  /**
   * @description Text in Network Panel used to show the overview for a given network request.
   */
  showOverview: "Overview",
  /**
   * @description Tooltip for group by frame network setting
   */
  groupRequestsByTopLevelRequest: "Group requests by top level request frame",
  /**
   * @description Text for group by frame network setting
   */
  groupByFrame: "Group by frame",
  /**
   * @description Tooltip for capture screenshot network setting
   */
  captureScreenshotsWhenLoadingA: "Capture screenshots when loading a page",
  /**
   * @description Text to take screenshots
   */
  captureScreenshots: "Screenshots",
  /**
   * @description Tooltip text that appears when hovering over the largeicon load button in the
   * Network Panel. This action prompts the user to select a HAR file to upload to DevTools.
   */
  importHarFile: "Import `HAR` file\u2026",
  /**
   * @description Tooltip text that appears when hovering over the download button in the Network
   * panel, when the setting to allow generating HAR files with sensitive data is enabled. HAR is
   * a file format (HTTP Archive) and should not be translated. This action triggers a context
   * menu with two options, one to download HAR sanitized and one to download HAR with sensitive
   * data.
   */
  exportHar: "Export `HAR` (either sanitized or with sensitive data)",
  /**
   * @description Tooltip text that appears when hovering over the download button in the Network
   * panel, when the setting to allow generating HAR files with sensitive data is disabled. HAR is
   * a file format (HTTP Archive) and should not be translated. This action triggers the download
   * of a HAR file.
   *
   * This string is also used as the first item in the context menu for the download button in
   * the Network panel, when the setting to allow generating HAR files with sensitive data is
   * enabled.
   */
  exportHarSanitized: "Export `HAR` (sanitized)\u2026",
  /**
   * @description Context menu item in the context menu for the download button of the Network panel,
   * which is only available when the Network setting to allow generating HAR with sensitive data
   * is active. HAR is a file format (HTTP Archive) and should not be translated. This action
   * triggers the download of a HAR file with sensitive data included.
   */
  exportHarWithSensitiveData: "Export `HAR` (with sensitive data)\u2026",
  /**
   * @description Text for throttling the network
   */
  throttling: "Throttling",
  /**
   * @description Text in Network Panel to tell the user to reload the page to capture screenshots.
   * @example {Ctrl + R} PH1
   */
  hitSToReloadAndCaptureFilmstrip: "Press {PH1} to reload and capture filmstrip.",
  /**
   * @description A context menu item that is shown for resources in other panels
   * to open them in the Network panel.
   */
  openInNetworkPanel: "Open in Network panel",
  /**
   * @description A context menu item that is shown for resources in other panels
   * to open them in the Network panel, but when there's no associated network
   * request. This context menu item is always disabled and only provided to give
   * the developer an idea of why they cannot open the resource in the Network
   * panel.
   */
  openInNetworkPanelMissingRequest: "Open in Network panel (missing request)",
  /**
   * @description Text in Network Panel that is displayed whilst the recording is in progress.
   */
  recordingFrames: "Recording frames\u2026",
  /**
   * @description Text in Network Panel that is displayed when frames are being fetched.
   */
  fetchingFrames: "Fetching frames\u2026",
  /**
   * @description Text of a button in the Network panel's toolbar that open Network Conditions panel in the drawer.
   */
  moreNetworkConditions: "More network conditions\u2026"
};
var str_21 = i18n41.i18n.registerUIStrings("panels/network/NetworkPanel.ts", UIStrings21);
var i18nString21 = i18n41.i18n.getLocalizedString.bind(void 0, str_21);
var networkPanelInstance;
var NetworkPanel = class _NetworkPanel extends UI23.Panel.Panel {
  networkLogShowOverviewSetting;
  networkLogLargeRowsSetting;
  networkRecordFilmStripSetting;
  toggleRecordAction;
  pendingStopTimer;
  networkItemView;
  filmStripView;
  filmStripRecorder;
  currentRequest;
  panelToolbar;
  rightToolbar;
  filterBar;
  showSettingsPaneSetting;
  filmStripPlaceholderElement;
  overviewPane;
  networkOverview;
  overviewPlaceholderElement;
  calculator;
  splitWidget;
  sidebarLocation;
  progressBarContainer;
  networkLogView;
  fileSelectorElement;
  detailsWidget;
  closeButtonElement;
  preserveLogSetting;
  recordLogSetting;
  throttlingSelect;
  displayScreenshotDelay;
  constructor(displayScreenshotDelay) {
    super("network");
    this.registerRequiredCSS(networkPanel_css_default);
    this.displayScreenshotDelay = displayScreenshotDelay;
    this.networkLogShowOverviewSetting = Common17.Settings.Settings.instance().createSetting("network-log-show-overview", true);
    this.networkLogLargeRowsSetting = Common17.Settings.Settings.instance().createSetting("network-log-large-rows", false);
    this.networkRecordFilmStripSetting = Common17.Settings.Settings.instance().createSetting("network-record-film-strip-setting", false);
    this.toggleRecordAction = UI23.ActionRegistry.ActionRegistry.instance().getAction("network.toggle-recording");
    this.networkItemView = null;
    this.filmStripView = null;
    this.filmStripRecorder = null;
    this.currentRequest = null;
    const panel3 = new UI23.Widget.VBox();
    const networkToolbarContainer = panel3.contentElement.createChild("div", "network-toolbar-container");
    networkToolbarContainer.role = "toolbar";
    this.panelToolbar = networkToolbarContainer.createChild("devtools-toolbar");
    this.panelToolbar.role = "presentation";
    this.panelToolbar.wrappable = true;
    this.panelToolbar.setAttribute("jslog", `${VisualLogging14.toolbar("network-main")}`);
    this.rightToolbar = networkToolbarContainer.createChild("devtools-toolbar");
    this.rightToolbar.role = "presentation";
    this.filterBar = new UI23.FilterBar.FilterBar("network-panel", true);
    this.filterBar.show(panel3.contentElement);
    this.filterBar.addEventListener("Changed", this.handleFilterChanged.bind(this));
    const settingsPane = panel3.contentElement.createChild("div", "network-settings-pane");
    settingsPane.append(SettingsUI5.SettingsUI.createSettingCheckbox(i18nString21(UIStrings21.useLargeRequestRows), this.networkLogLargeRowsSetting, i18nString21(UIStrings21.showMoreInformationInRequestRows)), SettingsUI5.SettingsUI.createSettingCheckbox(i18nString21(UIStrings21.groupByFrame), Common17.Settings.Settings.instance().moduleSetting("network.group-by-frame"), i18nString21(UIStrings21.groupRequestsByTopLevelRequest)), SettingsUI5.SettingsUI.createSettingCheckbox(i18nString21(UIStrings21.showOverview), this.networkLogShowOverviewSetting, i18nString21(UIStrings21.showOverviewOfNetworkRequests)), SettingsUI5.SettingsUI.createSettingCheckbox(i18nString21(UIStrings21.captureScreenshots), this.networkRecordFilmStripSetting, i18nString21(UIStrings21.captureScreenshotsWhenLoadingA)));
    this.showSettingsPaneSetting = Common17.Settings.Settings.instance().createSetting("network-show-settings-toolbar", false);
    settingsPane.classList.toggle("hidden", !this.showSettingsPaneSetting.get());
    this.showSettingsPaneSetting.addChangeListener(() => settingsPane.classList.toggle("hidden", !this.showSettingsPaneSetting.get()));
    this.filmStripPlaceholderElement = panel3.contentElement.createChild("div", "network-film-strip-placeholder");
    this.overviewPane = new PerfUI5.TimelineOverviewPane.TimelineOverviewPane("network");
    this.overviewPane.addEventListener("OverviewPaneWindowChanged", this.onWindowChanged.bind(this));
    this.overviewPane.element.id = "network-overview-panel";
    this.networkOverview = new NetworkOverview();
    this.overviewPane.setOverviewControls([this.networkOverview]);
    this.overviewPlaceholderElement = panel3.contentElement.createChild("div");
    this.calculator = new NetworkTimeCalculator5.NetworkTransferTimeCalculator();
    this.splitWidget = new UI23.SplitWidget.SplitWidget(true, false, "network-panel-split-view-state");
    this.splitWidget.hideMain();
    this.splitWidget.show(panel3.contentElement);
    panel3.setDefaultFocusedChild(this.filterBar);
    const initialSidebarWidth = 225;
    const splitWidget = new UI23.SplitWidget.SplitWidget(true, false, "network-panel-sidebar-state", initialSidebarWidth);
    splitWidget.hideSidebar();
    splitWidget.enableShowModeSaving();
    splitWidget.show(this.element);
    this.sidebarLocation = UI23.ViewManager.ViewManager.instance().createTabbedLocation(async () => {
      void UI23.ViewManager.ViewManager.instance().showView("network");
      splitWidget.showBoth();
    }, "network-sidebar", true);
    const tabbedPane = this.sidebarLocation.tabbedPane();
    tabbedPane.setMinimumSize(100, 25);
    tabbedPane.element.classList.add("network-tabbed-pane");
    tabbedPane.element.addEventListener("keydown", (event) => {
      if (event.key !== Platform12.KeyboardUtilities.ESCAPE_KEY) {
        return;
      }
      splitWidget.hideSidebar();
      event.consume();
      void VisualLogging14.logKeyDown(event.currentTarget, event, "hide-sidebar");
    });
    const closeSidebar = new UI23.Toolbar.ToolbarButton(i18nString21(UIStrings21.close), "cross");
    closeSidebar.addEventListener("Click", () => splitWidget.hideSidebar());
    closeSidebar.element.setAttribute("jslog", `${VisualLogging14.close().track({ click: true })}`);
    tabbedPane.rightToolbar().appendToolbarItem(closeSidebar);
    splitWidget.setSidebarWidget(tabbedPane);
    splitWidget.setMainWidget(panel3);
    splitWidget.setDefaultFocusedChild(panel3);
    this.setDefaultFocusedChild(splitWidget);
    this.progressBarContainer = document.createElement("div");
    this.networkLogView = new NetworkLogView(this.filterBar, this.progressBarContainer, this.networkLogLargeRowsSetting);
    this.splitWidget.setSidebarWidget(this.networkLogView);
    this.fileSelectorElement = UI23.UIUtils.createFileSelectorElement(this.networkLogView.onLoadFromFile.bind(this.networkLogView));
    panel3.element.appendChild(this.fileSelectorElement);
    this.detailsWidget = new UI23.Widget.VBox();
    this.detailsWidget.element.classList.add("network-details-view");
    this.splitWidget.setMainWidget(this.detailsWidget);
    this.closeButtonElement = document.createElement("dt-close-button");
    this.closeButtonElement.addEventListener("click", async () => {
      const action = UI23.ActionRegistry.ActionRegistry.instance().getAction("network.hide-request-details");
      await action.execute();
    }, false);
    this.closeButtonElement.style.margin = "0 5px";
    this.networkLogShowOverviewSetting.addChangeListener(this.toggleShowOverview, this);
    this.networkLogLargeRowsSetting.addChangeListener(this.toggleLargerRequests, this);
    this.networkRecordFilmStripSetting.addChangeListener(this.toggleRecordFilmStrip, this);
    this.preserveLogSetting = Common17.Settings.Settings.instance().moduleSetting("network-log.preserve-log");
    this.recordLogSetting = Common17.Settings.Settings.instance().moduleSetting("network-log.record-log");
    this.recordLogSetting.addChangeListener(({ data }) => this.toggleRecord(data));
    this.throttlingSelect = this.createThrottlingConditionsSelect();
    this.setupToolbarButtons(splitWidget);
    this.toggleRecord(this.recordLogSetting.get());
    this.toggleShowOverview();
    this.toggleLargerRequests();
    this.toggleRecordFilmStrip();
    this.updateUI();
    SDK15.TargetManager.TargetManager.instance().addModelListener(SDK15.ResourceTreeModel.ResourceTreeModel, SDK15.ResourceTreeModel.Events.WillReloadPage, this.willReloadPage, this, { scoped: true });
    SDK15.TargetManager.TargetManager.instance().addModelListener(SDK15.ResourceTreeModel.ResourceTreeModel, SDK15.ResourceTreeModel.Events.Load, this.load, this, { scoped: true });
    this.networkLogView.addEventListener("RequestSelected", this.onRequestSelected, this);
    this.networkLogView.addEventListener("RequestActivated", this.onRequestActivated, this);
    Logs6.NetworkLog.NetworkLog.instance().addEventListener(Logs6.NetworkLog.Events.RequestAdded, this.onUpdateRequest, this);
    Logs6.NetworkLog.NetworkLog.instance().addEventListener(Logs6.NetworkLog.Events.RequestUpdated, this.onUpdateRequest, this);
    Logs6.NetworkLog.NetworkLog.instance().addEventListener(Logs6.NetworkLog.Events.Reset, this.onNetworkLogReset, this);
  }
  static instance(opts) {
    if (!networkPanelInstance || opts?.forceNew) {
      networkPanelInstance = new _NetworkPanel(opts?.displayScreenshotDelay ?? 1e3);
    }
    return networkPanelInstance;
  }
  static async revealAndFilter(filters) {
    const panel3 = _NetworkPanel.instance();
    let filterString = "";
    for (const filter of filters) {
      if (filter.filterType) {
        filterString += `${filter.filterType}:${filter.filterValue} `;
      } else {
        filterString += `${filter.filterValue} `;
      }
    }
    await UI23.ViewManager.ViewManager.instance().showView("network");
    panel3.networkLogView.setTextFilterValue(filterString);
    panel3.filterBar.setting().set(true);
    panel3.filterBar.focus();
  }
  throttlingSelectForTest() {
    return this.throttlingSelect;
  }
  onWindowChanged(event) {
    const startTime = Math.max(this.calculator.minimumBoundary(), event.data.startTime / 1e3);
    const endTime = Math.min(this.calculator.maximumBoundary(), event.data.endTime / 1e3);
    if (startTime === this.calculator.minimumBoundary() && endTime === this.calculator.maximumBoundary()) {
      this.networkLogView.setWindow(0, 0);
    } else {
      this.networkLogView.setWindow(startTime, endTime);
    }
  }
  async searchToggleClick() {
    const action = UI23.ActionRegistry.ActionRegistry.instance().getAction("network.search");
    await action.execute();
  }
  setupToolbarButtons(splitWidget) {
    const searchToggle = new UI23.Toolbar.ToolbarToggle(i18nString21(UIStrings21.search), "search", void 0, "search");
    function updateSidebarToggle() {
      const isSidebarShowing = splitWidget.showMode() !== "OnlyMain";
      searchToggle.setToggled(isSidebarShowing);
      if (!isSidebarShowing) {
        searchToggle.element.focus();
      }
    }
    this.panelToolbar.appendToolbarItem(UI23.Toolbar.Toolbar.createActionButton(this.toggleRecordAction));
    this.panelToolbar.appendToolbarItem(UI23.Toolbar.Toolbar.createActionButton("network.clear"));
    this.panelToolbar.appendSeparator();
    this.panelToolbar.appendToolbarItem(this.filterBar.filterButton());
    updateSidebarToggle();
    splitWidget.addEventListener("ShowModeChanged", updateSidebarToggle);
    searchToggle.addEventListener("Click", () => {
      void this.searchToggleClick();
    });
    this.panelToolbar.appendToolbarItem(searchToggle);
    this.panelToolbar.appendSeparator();
    this.panelToolbar.appendToolbarItem(new UI23.Toolbar.ToolbarSettingCheckbox(this.preserveLogSetting, i18nString21(UIStrings21.doNotClearLogOnPageReload), i18nString21(UIStrings21.preserveLog)));
    this.panelToolbar.appendSeparator();
    const disableCacheCheckbox = new UI23.Toolbar.ToolbarSettingCheckbox(Common17.Settings.Settings.instance().moduleSetting("cache-disabled"), i18nString21(UIStrings21.disableCacheWhileDevtoolsIsOpen), i18nString21(UIStrings21.disableCache));
    this.panelToolbar.appendToolbarItem(disableCacheCheckbox);
    this.panelToolbar.appendToolbarItem(this.throttlingSelect);
    const networkConditionsButton = new UI23.Toolbar.ToolbarButton(i18nString21(UIStrings21.moreNetworkConditions), "network-settings", void 0, "network-conditions");
    networkConditionsButton.addEventListener("Click", () => {
      void UI23.ViewManager.ViewManager.instance().showView("network.config");
    }, this);
    this.panelToolbar.appendToolbarItem(networkConditionsButton);
    this.rightToolbar.appendToolbarItem(new UI23.Toolbar.ToolbarItem(this.progressBarContainer));
    this.rightToolbar.appendSeparator();
    this.rightToolbar.appendToolbarItem(new UI23.Toolbar.ToolbarSettingToggle(this.showSettingsPaneSetting, "gear", i18nString21(UIStrings21.networkSettings), "gear-filled", "network-settings"));
    const exportHarContextMenu = (contextMenu) => {
      contextMenu.defaultSection().appendItem(i18nString21(UIStrings21.exportHarSanitized), this.networkLogView.exportAll.bind(this.networkLogView, { sanitize: true }), { jslogContext: "export-har" });
      contextMenu.defaultSection().appendItem(i18nString21(UIStrings21.exportHarWithSensitiveData), this.networkLogView.exportAll.bind(this.networkLogView, { sanitize: false }), { jslogContext: "export-har-with-sensitive-data" });
    };
    this.panelToolbar.appendSeparator();
    const importHarButton = new UI23.Toolbar.ToolbarButton(i18nString21(UIStrings21.importHarFile), "import", void 0, "import-har");
    importHarButton.addEventListener("Click", () => this.fileSelectorElement.click(), this);
    this.panelToolbar.appendToolbarItem(importHarButton);
    const exportHarButton = new UI23.Toolbar.ToolbarButton(i18nString21(UIStrings21.exportHarSanitized), "download", void 0, "export-har");
    exportHarButton.addEventListener("Click", this.networkLogView.exportAll.bind(this.networkLogView, { sanitize: true }), this);
    this.panelToolbar.appendToolbarItem(exportHarButton);
    const exportHarMenuButton = new UI23.Toolbar.ToolbarMenuButton(
      exportHarContextMenu,
      /* isIconDropdown */
      true,
      /* useSoftMenu */
      false,
      "export-har-menu",
      "download"
    );
    exportHarMenuButton.setTitle(i18nString21(UIStrings21.exportHar));
    this.panelToolbar.appendToolbarItem(exportHarMenuButton);
    const networkShowOptionsToGenerateHarWithSensitiveData = Common17.Settings.Settings.instance().createSetting("network.show-options-to-generate-har-with-sensitive-data", false);
    const updateShowOptionsToGenerateHarWithSensitiveData = () => {
      const showOptionsToGenerateHarWithSensitiveData = networkShowOptionsToGenerateHarWithSensitiveData.get();
      exportHarButton.setVisible(!showOptionsToGenerateHarWithSensitiveData);
      exportHarMenuButton.setVisible(showOptionsToGenerateHarWithSensitiveData);
    };
    networkShowOptionsToGenerateHarWithSensitiveData.addChangeListener(updateShowOptionsToGenerateHarWithSensitiveData);
    updateShowOptionsToGenerateHarWithSensitiveData();
  }
  createThrottlingConditionsSelect() {
    const toolbarItem = new UI23.Toolbar.ToolbarItem(document.createElement("div"));
    toolbarItem.setMaxWidth(160);
    MobileThrottling3.NetworkThrottlingSelector.NetworkThrottlingSelect.createForGlobalConditions(toolbarItem.element, i18nString21(UIStrings21.throttling));
    return toolbarItem;
  }
  toggleRecord(toggled) {
    this.toggleRecordAction.setToggled(toggled);
    if (this.recordLogSetting.get() !== toggled) {
      this.recordLogSetting.set(toggled);
    }
    this.networkLogView.setRecording(toggled);
    if (!toggled && this.filmStripRecorder) {
      this.filmStripRecorder.stopRecording(this.filmStripAvailable.bind(this));
    }
  }
  filmStripAvailable(filmStrip) {
    if (this.filmStripView) {
      this.filmStripView.setModel(filmStrip);
    }
    const timestamps = filmStrip.frames.map((frame) => {
      return Trace2.Helpers.Timing.microToSeconds(frame.screenshotEvent.ts);
    });
    this.networkLogView.addFilmStripFrames(timestamps);
  }
  onNetworkLogReset(event) {
    const { clearIfPreserved } = event.data;
    if (!this.preserveLogSetting.get() || clearIfPreserved) {
      this.calculator.reset();
      this.overviewPane.reset();
    }
    if (this.filmStripView) {
      this.resetFilmStripView();
    }
  }
  willReloadPage() {
    if (this.pendingStopTimer) {
      clearTimeout(this.pendingStopTimer);
      delete this.pendingStopTimer;
    }
    if (this.isShowing() && this.filmStripRecorder) {
      this.filmStripRecorder.startRecording();
    }
  }
  load() {
    if (this.filmStripRecorder?.isRecording()) {
      if (this.pendingStopTimer) {
        window.clearTimeout(this.pendingStopTimer);
      }
      this.pendingStopTimer = window.setTimeout(this.stopFilmStripRecording.bind(this), this.displayScreenshotDelay);
    }
  }
  stopFilmStripRecording() {
    if (this.filmStripRecorder) {
      this.filmStripRecorder.stopRecording(this.filmStripAvailable.bind(this));
    }
    delete this.pendingStopTimer;
  }
  toggleLargerRequests() {
    this.updateUI();
  }
  toggleShowOverview() {
    const toggled = this.networkLogShowOverviewSetting.get();
    if (toggled) {
      this.overviewPane.show(this.overviewPlaceholderElement);
    } else {
      this.overviewPane.detach();
    }
    this.doResize();
  }
  toggleRecordFilmStrip() {
    const toggled = this.networkRecordFilmStripSetting.get();
    if (toggled && !this.filmStripRecorder) {
      this.filmStripView = new PerfUI5.FilmStripView.FilmStripView();
      this.filmStripView.element.classList.add("network-film-strip");
      this.filmStripView.element.setAttribute("jslog", `${VisualLogging14.section("film-strip")}`);
      this.filmStripRecorder = new FilmStripRecorder(this.networkLogView.timeCalculator(), this.filmStripView);
      this.filmStripView.show(this.filmStripPlaceholderElement);
      this.filmStripView.addEventListener("FrameSelected", this.onFilmFrameSelected, this);
      this.filmStripView.addEventListener("FrameEnter", this.onFilmFrameEnter, this);
      this.filmStripView.addEventListener("FrameExit", this.onFilmFrameExit, this);
      this.resetFilmStripView();
    }
    if (!toggled && this.filmStripRecorder) {
      if (this.filmStripView) {
        this.filmStripView.detach();
      }
      this.filmStripView = null;
      this.filmStripRecorder = null;
    }
  }
  resetFilmStripView() {
    const reloadShortcut = UI23.ShortcutRegistry.ShortcutRegistry.instance().shortcutsForAction("inspector-main.reload")[0];
    if (this.filmStripView) {
      this.filmStripView.reset();
      if (reloadShortcut) {
        this.filmStripView.setStatusText(i18nString21(UIStrings21.hitSToReloadAndCaptureFilmstrip, { PH1: reloadShortcut.title() }));
      }
    }
  }
  elementsToRestoreScrollPositionsFor() {
    return this.networkLogView.elementsToRestoreScrollPositionsFor();
  }
  wasShown() {
    super.wasShown();
    UI23.Context.Context.instance().setFlavor(_NetworkPanel, this);
    Host10.userMetrics.panelLoaded("network", "DevTools.Launch.Network");
  }
  willHide() {
    UI23.Context.Context.instance().setFlavor(_NetworkPanel, null);
    super.willHide();
  }
  revealAndHighlightRequest(request) {
    this.hideRequestPanel();
    if (request) {
      this.networkLogView.revealAndHighlightRequest(request);
    }
  }
  revealAndHighlightRequestWithId(request) {
    this.hideRequestPanel();
    if (request) {
      this.networkLogView.revealAndHighlightRequestWithId(request);
    }
  }
  async selectAndActivateRequest(request, shownTab, options) {
    await UI23.ViewManager.ViewManager.instance().showView("network");
    this.networkLogView.selectRequest(request, options);
    this.showRequestPanel(shownTab);
    this.networkLogView.revealAndHighlightRequest(request);
    return this.networkItemView;
  }
  handleFilterChanged() {
    this.hideRequestPanel();
  }
  onRequestSelected(event) {
    const request = event.data;
    this.currentRequest = request;
    this.networkOverview.setHighlightedRequest(request);
    this.updateNetworkItemView();
    UI23.Context.Context.instance().setFlavor(SDK15.NetworkRequest.NetworkRequest, request);
  }
  onRequestActivated(event) {
    const { showPanel, tab, takeFocus } = event.data;
    if (showPanel === "ShowPanel") {
      this.showRequestPanel(tab, takeFocus);
    } else if (showPanel === "HidePanel") {
      this.hideRequestPanel();
    }
  }
  showRequestPanel(shownTab, takeFocus) {
    if (this.splitWidget.showMode() === "Both" && !shownTab && !takeFocus) {
      return;
    }
    this.clearNetworkItemView();
    if (this.currentRequest) {
      const networkItemView = this.createNetworkItemView(shownTab);
      if (networkItemView && takeFocus) {
        networkItemView.focus();
      }
    }
    this.updateUI();
  }
  hideRequestPanel() {
    this.clearNetworkItemView();
    this.splitWidget.hideMain();
    this.updateUI();
  }
  updateNetworkItemView() {
    if (this.splitWidget.showMode() === "Both") {
      this.clearNetworkItemView();
      this.createNetworkItemView();
      this.updateUI();
    }
  }
  clearNetworkItemView() {
    if (this.networkItemView) {
      this.networkItemView.detach();
      this.networkItemView = null;
    }
  }
  createNetworkItemView(initialTab) {
    if (!this.currentRequest) {
      return;
    }
    this.networkItemView = new NetworkItemView(this.currentRequest, this.networkLogView.timeCalculator(), initialTab);
    this.networkItemView.leftToolbar().appendToolbarItem(new UI23.Toolbar.ToolbarItem(this.closeButtonElement));
    this.networkItemView.show(this.detailsWidget.element);
    this.splitWidget.showBoth();
    return this.networkItemView;
  }
  updateUI() {
    if (this.detailsWidget) {
      this.detailsWidget.element.classList.toggle("network-details-view-tall-header", this.networkLogLargeRowsSetting.get());
    }
    if (this.networkLogView) {
      this.networkLogView.switchViewMode(!this.splitWidget.isResizable());
    }
  }
  appendApplicableItems(event, contextMenu, target) {
    const appendRevealItem = (request) => {
      contextMenu.revealSection().appendItem(i18nString21(UIStrings21.openInNetworkPanel), () => UI23.ViewManager.ViewManager.instance().showView("network").then(this.networkLogView.resetFilter.bind(this.networkLogView)).then(this.revealAndHighlightRequest.bind(this, request)), { jslogContext: "reveal-in-network" });
    };
    const appendRevealItemMissingData = () => {
      contextMenu.revealSection().appendItem(i18nString21(UIStrings21.openInNetworkPanelMissingRequest), () => {
      }, {
        disabled: true,
        jslogContext: "reveal-in-network"
      });
    };
    const appendRevealItemAndSelect = (request) => {
      contextMenu.revealSection().appendItem(i18nString21(UIStrings21.openInNetworkPanel), () => UI23.ViewManager.ViewManager.instance().showView("network").then(this.networkLogView.resetFilter.bind(this.networkLogView)).then(this.selectAndActivateRequest.bind(
        this,
        request.networkRequest,
        "headers-component",
        /* FilterOptions= */
        void 0
      )), { jslogContext: "timeline.reveal-in-network" });
    };
    if (event.target.isSelfOrDescendant(this.element)) {
      return;
    }
    if (target instanceof SDK15.Resource.Resource) {
      if (target.request) {
        appendRevealItem(target.request);
      } else {
        appendRevealItemMissingData();
      }
      return;
    }
    if (target instanceof Workspace.UISourceCode.UISourceCode) {
      const resource = SDK15.ResourceTreeModel.ResourceTreeModel.resourceForURL(target.url());
      if (resource?.request) {
        appendRevealItem(resource.request);
      } else {
        appendRevealItemMissingData();
      }
      return;
    }
    if (target instanceof SDK15.TraceObject.RevealableNetworkRequest) {
      appendRevealItemAndSelect(target);
      return;
    }
    if (this.networkItemView && this.networkItemView.isShowing() && this.networkItemView.request() === target) {
      return;
    }
    appendRevealItem(target);
  }
  onFilmFrameSelected(event) {
    const timestamp = event.data;
    this.overviewPane.setWindowTimes(Trace2.Types.Timing.Milli(0), Trace2.Types.Timing.Milli(timestamp));
  }
  onFilmFrameEnter(event) {
    const timestamp = event.data;
    this.networkOverview.selectFilmStripFrame(timestamp);
    this.networkLogView.selectFilmStripFrame(timestamp / 1e3);
  }
  onFilmFrameExit() {
    this.networkOverview.clearFilmStripFrame();
    this.networkLogView.clearFilmStripFrame();
  }
  onUpdateRequest(event) {
    const { request } = event.data;
    this.calculator.updateBoundaries(request);
    this.overviewPane.setBounds(Trace2.Types.Timing.Milli(this.calculator.minimumBoundary() * 1e3), Trace2.Types.Timing.Milli(this.calculator.maximumBoundary() * 1e3));
    this.networkOverview.updateRequest(request);
  }
  resolveLocation(locationName) {
    if (locationName === "network-sidebar") {
      return this.sidebarLocation;
    }
    return null;
  }
};
var RequestRevealer = class {
  reveal(request) {
    const panel3 = NetworkPanel.instance();
    return UI23.ViewManager.ViewManager.instance().showView("network").then(panel3.revealAndHighlightRequest.bind(panel3, request));
  }
};
var RequestIdRevealer = class {
  reveal(requestId) {
    const panel3 = NetworkPanel.instance();
    return UI23.ViewManager.ViewManager.instance().showView("network").then(panel3.revealAndHighlightRequestWithId.bind(panel3, requestId));
  }
};
var NetworkLogWithFilterRevealer = class {
  reveal(request) {
    if ("filters" in request) {
      return NetworkPanel.revealAndFilter(request.filters);
    }
    return NetworkPanel.revealAndFilter(request.filter ? [{ filterType: null, filterValue: request.filter }] : []);
  }
};
var FilmStripRecorder = class {
  #tracingManager = null;
  #resourceTreeModel = null;
  #timeCalculator;
  #filmStripView;
  #callback = null;
  // Used to fetch screenshots of the page load and show them in the panel.
  #traceEngine = Trace2.TraceModel.Model.createWithSubsetOfHandlers({
    Screenshots: Trace2.Handlers.ModelHandlers.Screenshots
  });
  #collectedTraceEvents = [];
  constructor(timeCalculator, filmStripView) {
    this.#timeCalculator = timeCalculator;
    this.#filmStripView = filmStripView;
  }
  traceEventsCollected(events) {
    this.#collectedTraceEvents.push(...events);
  }
  async tracingComplete() {
    if (!this.#tracingManager) {
      return;
    }
    this.#tracingManager = null;
    await this.#traceEngine.parse(this.#collectedTraceEvents);
    const data = this.#traceEngine.parsedTrace(this.#traceEngine.size() - 1)?.data;
    if (!data) {
      return;
    }
    const zeroTimeInSeconds = Trace2.Types.Timing.Seconds(this.#timeCalculator.minimumBoundary());
    const filmStrip = Trace2.Extras.FilmStrip.fromHandlerData(data, Trace2.Helpers.Timing.secondsToMicro(zeroTimeInSeconds));
    if (this.#callback) {
      this.#callback(filmStrip);
    }
    this.#callback = null;
    this.#traceEngine.resetProcessor();
    if (this.#resourceTreeModel) {
      this.#resourceTreeModel.resumeReload();
    }
    this.#resourceTreeModel = null;
  }
  tracingBufferUsage() {
  }
  eventsRetrievalProgress(_progress) {
  }
  startRecording() {
    this.#collectedTraceEvents = [];
    this.#filmStripView.reset();
    this.#filmStripView.setStatusText(i18nString21(UIStrings21.recordingFrames));
    const tracingManager = SDK15.TargetManager.TargetManager.instance().scopeTarget()?.model(Tracing.TracingManager.TracingManager);
    if (this.#tracingManager || !tracingManager) {
      return;
    }
    this.#tracingManager = tracingManager;
    this.#resourceTreeModel = this.#tracingManager.target().model(SDK15.ResourceTreeModel.ResourceTreeModel);
    void this.#tracingManager.start(this, "-*,disabled-by-default-devtools.screenshot");
    Host10.userMetrics.actionTaken(Host10.UserMetrics.Action.FilmStripStartedRecording);
  }
  isRecording() {
    return Boolean(this.#tracingManager);
  }
  stopRecording(callback) {
    if (!this.#tracingManager) {
      return;
    }
    this.#tracingManager.stop();
    if (this.#resourceTreeModel) {
      this.#resourceTreeModel.suspendReload();
    }
    this.#callback = callback;
    this.#filmStripView.setStatusText(i18nString21(UIStrings21.fetchingFrames));
  }
};
var ActionDelegate2 = class {
  handleAction(context, actionId) {
    const panel3 = context.flavor(NetworkPanel);
    if (panel3 === null) {
      return false;
    }
    switch (actionId) {
      case "network.toggle-recording": {
        panel3.toggleRecord(!panel3.recordLogSetting.get());
        return true;
      }
      case "network.hide-request-details": {
        if (!panel3.networkItemView) {
          return false;
        }
        panel3.hideRequestPanel();
        panel3.networkLogView.resetFocus();
        return true;
      }
      case "network.search": {
        const selection = UI23.InspectorView.InspectorView.instance().element.window().getSelection();
        if (!selection) {
          return false;
        }
        let queryCandidate = "";
        if (selection.rangeCount) {
          queryCandidate = selection.toString().replace(/\r?\n.*/, "");
        }
        void SearchNetworkView.openSearch(queryCandidate);
        return true;
      }
      case "network.clear": {
        Logs6.NetworkLog.NetworkLog.instance().reset(true);
        return true;
      }
    }
    return false;
  }
};
var RequestLocationRevealer = class {
  async reveal(location) {
    const view = await NetworkPanel.instance().selectAndActivateRequest(location.request, location.tab, location.filterOptions);
    if (!view) {
      return;
    }
    if (location.searchMatch) {
      const { lineNumber, columnNumber, matchLength } = location.searchMatch;
      const revealPosition = {
        from: { lineNumber, columnNumber },
        to: { lineNumber, columnNumber: columnNumber + matchLength }
      };
      await view.revealResponseBody(revealPosition);
    }
    if (location.header) {
      view.revealHeader(location.header.section, location.header.header?.name);
    }
  }
};
var searchNetworkViewInstance;
var SearchNetworkView = class _SearchNetworkView extends Search.SearchView.SearchView {
  constructor() {
    super("network");
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!searchNetworkViewInstance || forceNew) {
      searchNetworkViewInstance = new _SearchNetworkView();
    }
    return searchNetworkViewInstance;
  }
  static async openSearch(query, searchImmediately) {
    await UI23.ViewManager.ViewManager.instance().showView("network.search-network-tab");
    const searchView = _SearchNetworkView.instance();
    searchView.toggle(query, Boolean(searchImmediately));
    return searchView;
  }
  createScope() {
    return new NetworkSearchScope(Logs6.NetworkLog.NetworkLog.instance());
  }
};
export {
  BinaryResourceView_exports as BinaryResourceView,
  EventSourceMessagesView_exports as EventSourceMessagesView,
  NetworkConfigView_exports as NetworkConfigView,
  NetworkDataGridNode_exports as NetworkDataGridNode,
  NetworkFrameGrouper_exports as NetworkFrameGrouper,
  NetworkItemView_exports as NetworkItemView,
  NetworkLogView_exports as NetworkLogView,
  NetworkLogViewColumns_exports as NetworkLogViewColumns,
  NetworkManageCustomHeadersView_exports as NetworkManageCustomHeadersView,
  NetworkOverview_exports as NetworkOverview,
  NetworkPanel_exports as NetworkPanel,
  NetworkSearchScope_exports as NetworkSearchScope,
  NetworkWaterfallColumn_exports as NetworkWaterfallColumn,
  RequestConditionsDrawer_exports as RequestConditionsDrawer,
  RequestCookiesView_exports as RequestCookiesView,
  RequestHTMLView_exports as RequestHTMLView,
  RequestInitiatorView_exports as RequestInitiatorView,
  RequestPayloadView_exports as RequestPayloadView,
  RequestPreviewView_exports as RequestPreviewView,
  RequestResponseView_exports as RequestResponseView,
  RequestTimingView_exports as RequestTimingView,
  ResourceDirectSocketChunkView_exports as ResourceDirectSocketChunkView,
  ResourceWebSocketFrameView_exports as ResourceWebSocketFrameView,
  SignedExchangeInfoView_exports as SignedExchangeInfoView
};
//# sourceMappingURL=network.js.map
