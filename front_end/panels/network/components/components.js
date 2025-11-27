var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/network/components/DirectSocketConnectionView.js
var DirectSocketConnectionView_exports = {};
__export(DirectSocketConnectionView_exports, {
  CATEGORY_NAME_GENERAL: () => CATEGORY_NAME_GENERAL,
  CATEGORY_NAME_OPEN_INFO: () => CATEGORY_NAME_OPEN_INFO,
  CATEGORY_NAME_OPTIONS: () => CATEGORY_NAME_OPTIONS,
  DEFAULT_VIEW: () => DEFAULT_VIEW,
  DirectSocketConnectionView: () => DirectSocketConnectionView
});
import * as Common from "./../../../core/common/common.js";
import * as Host from "./../../../core/host/host.js";
import * as i18n from "./../../../core/i18n/i18n.js";
import * as SDK from "./../../../core/sdk/sdk.js";
import * as UI from "./../../../ui/legacy/legacy.js";
import * as Lit from "./../../../ui/lit/lit.js";
import * as VisualLogging from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/network/components/RequestHeadersView.css.js
var RequestHeadersView_css_default = `/*
 * Copyright 2022 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.header {
  background-color: var(--sys-color-surface1);
  border-bottom: 1px solid var(--sys-color-divider);
  border-top: 1px solid var(--sys-color-divider);
  line-height: 25px;
  padding: 0 5px;
}

.header::marker {
  font-size: 11px;
  line-height: 1;
}

.header:focus {
  background-color: var(--sys-color-state-header-hover);
}

details[open] .header-count {
  display: none;
}

details .hide-when-closed {
  display: none;
}

details[open] .hide-when-closed {
  display: block;
}

details summary input {
  vertical-align: middle;
}

.row {
  display: flex;
  line-height: 18px;
  padding-left: 8px;
  gap: var(--sys-size-6);
  user-select: text;
  margin: var(--sys-size-3) 0;
}

div.raw-headers-row {
  display: block;
}

.row:first-of-type {
  margin-top: var(--sys-size-5);
}

.row:last-child {
  margin-bottom: var(--sys-size-5);
}

.header-name {
  color: var(--sys-color-on-surface-subtle);
  font: var(--sys-typescale-body5-medium);
  width: 30%;
  min-width: 160px;
  max-width: 240px;
  flex-shrink: 0;
  text-transform: capitalize;
}

.header-value {
  word-break: break-all;
  display: flex;
  align-items: center;
  gap: 2px;
  font: var(--sys-typescale-body4-regular);
}

.header-name,
.header-value {
  &::selection {
    color: var(--sys-color-on-tonal-container);
    background-color: var(--sys-color-tonal-container);
  }
}

.green-circle::before,
.red-circle::before,
.yellow-circle::before {
  content: "";
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 6px;
  vertical-align: text-top;
  margin-right: 2px;
}

.green-circle::before {
  background-color: var(--sys-color-green-bright);
}

.red-circle::before {
  background-color: var(--sys-color-error-bright);
}

.yellow-circle::before {
  background-color: var(--issue-color-yellow);
}

.status-with-comment {
  color: var(--sys-color-token-subtle);
}

.raw-headers {
  font-family: var(--source-code-font-family);
  font-size: var(--source-code-font-size);
  white-space: pre-wrap;
  word-break: break-all;
}

.link,
.devtools-link {
  color: var(--sys-color-primary);
  text-decoration: underline;
  cursor: pointer;
  outline-offset: 2px;
}

.inline-icon {
  vertical-align: middle;
}

.header-grid-container {
  display: inline-grid;
  grid-template-columns: 156px 50px 1fr;
  gap: 4px;
  /* Make this fit into the same line as the summary marker */
  width: calc(100% - 15px);
}

.header-grid-container div:last-child {
  text-align: right;
}

.header .devtools-link {
  color: var(--sys-color-on-surface);
}

x-link {
  position: relative;
}

x-link .inline-icon {
  padding-right: 3px;
}

.purple.dot::before {
  background-color: var(--sys-color-purple-bright);
  content: var(--image-file-empty);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  outline: 1px solid var(--icon-gap-toolbar);
  left: 9px;
  position: absolute;
  top: 11px;
  z-index: 1;
}

summary label {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
  gap: var(--sys-size-3);
}

summary devtools-checkbox {
  margin-top: 1px;
}

/*# sourceURL=${import.meta.resolve("./RequestHeadersView.css")} */`;

// gen/front_end/panels/network/components/DirectSocketConnectionView.js
var { render, html } = Lit;
var UIStrings = {
  /**
   * @description Section header for a list of the main aspects of a direct socket connection
   */
  general: "General",
  /**
   * @description Section header for a list of the main aspects of a direct socket connection
   */
  options: "Options",
  /**
   * @description Section header for a list of the main aspects of a direct socket connection
   */
  openInfo: "Open Info",
  /**
   * @description Text in Connection info View of the Network panel
   */
  type: "DirectSocket Type",
  /**
   * @description Text in Connection info View of the Network panel
   */
  errorMessage: "Error message",
  /**
   * @description Text in Connection info View of the Network panel
   */
  status: "Status",
  /**
   * @description Text in Connection info View of the Network panel
   */
  directSocketTypeTcp: "TCP",
  /**
   * @description Text in Connection info View of the Network panel
   */
  directSocketTypeUdpConnected: "UDP (connected)",
  /**
   * @description Text in Connection info View of the Network panel
   */
  directSocketTypeUdpBound: "UDP (bound)",
  /**
   * @description Text in Connection info View of the Network panel
   */
  directSocketStatusOpening: "Opening",
  /**
   * @description Text in Connection info View of the Network panel
   */
  directSocketStatusOpen: "Open",
  /**
   * @description Text in Connection info View of the Network panel
   */
  directSocketStatusClosed: "Closed",
  /**
   * @description Text in Connection info View of the Network panel
   */
  directSocketStatusAborted: "Aborted",
  /**
   * @description Text in Connection info View of the Network panel
   */
  joinedMulticastGroups: "joinedMulticastGroups"
};
var str_ = i18n.i18n.registerUIStrings("panels/network/components/DirectSocketConnectionView.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
function getDirectSocketTypeString(type) {
  switch (type) {
    case SDK.NetworkRequest.DirectSocketType.TCP:
      return i18nString(UIStrings.directSocketTypeTcp);
    case SDK.NetworkRequest.DirectSocketType.UDP_BOUND:
      return i18nString(UIStrings.directSocketTypeUdpBound);
    case SDK.NetworkRequest.DirectSocketType.UDP_CONNECTED:
      return i18nString(UIStrings.directSocketTypeUdpConnected);
  }
}
function getDirectSocketStatusString(status) {
  switch (status) {
    case SDK.NetworkRequest.DirectSocketStatus.OPENING:
      return i18nString(UIStrings.directSocketStatusOpening);
    case SDK.NetworkRequest.DirectSocketStatus.OPEN:
      return i18nString(UIStrings.directSocketStatusOpen);
    case SDK.NetworkRequest.DirectSocketStatus.CLOSED:
      return i18nString(UIStrings.directSocketStatusClosed);
    case SDK.NetworkRequest.DirectSocketStatus.ABORTED:
      return i18nString(UIStrings.directSocketStatusAborted);
  }
}
var CATEGORY_NAME_GENERAL = "general";
var CATEGORY_NAME_OPTIONS = "options";
var CATEGORY_NAME_OPEN_INFO = "open-info";
var DEFAULT_VIEW = (input, _output, target) => {
  function isCategoryOpen(name) {
    return input.openCategories.includes(name);
  }
  function renderCategory(name, title, content) {
    return html`
        <details
          class="direct-socket-category"
          ?open=${isCategoryOpen(name)}
          @toggle=${(e) => input.onToggleCategory(e, name)}
          jslog=${VisualLogging.sectionHeader(name).track({ click: true })}
          aria-label=${title}
        >
          <summary
            class="header"
            @keydown=${(e) => input.onSummaryKeyDown(e, name)}
          >
            <div class="header-grid-container">
              <div>
                ${title}
              </div>
              <div class="hide-when-closed"></div>
            </div>
          </summary>
          ${content}
        </details>
      `;
  }
  function renderRow(name, value2, classNames) {
    if (!value2) {
      return Lit.nothing;
    }
    return html`
        <div class="row">
          <div class="header-name">${name}:</div>
          <div
            class="header-value ${classNames?.join(" ")}"
            @copy=${() => input.onCopyRow()}
          >${value2}</div>
        </div>
      `;
  }
  const socketInfo = input.socketInfo;
  const generalContent = html`
      <div jslog=${VisualLogging.section(CATEGORY_NAME_GENERAL)}>
        ${renderRow(i18nString(UIStrings.type), getDirectSocketTypeString(socketInfo.type))}
        ${renderRow(i18nString(UIStrings.status), getDirectSocketStatusString(socketInfo.status))}
        ${renderRow(i18nString(UIStrings.errorMessage), socketInfo.errorMessage)}
        ${renderRow(i18nString(UIStrings.joinedMulticastGroups), socketInfo.joinedMulticastGroups ? Array.from(socketInfo.joinedMulticastGroups).join(", ") : "")}
      </div>`;
  const optionsContent = html`
      <div jslog=${VisualLogging.section(CATEGORY_NAME_OPTIONS)}>
        ${renderRow(i18n.i18n.lockedString("remoteAddress"), socketInfo.createOptions.remoteAddr)}
        ${renderRow(i18n.i18n.lockedString("remotePort"), socketInfo.createOptions.remotePort?.toString(10))}
        ${renderRow(i18n.i18n.lockedString("localAddress"), socketInfo.createOptions.localAddr)}
        ${renderRow(i18n.i18n.lockedString("localPort"), socketInfo.createOptions.localPort?.toString(10))}
        ${renderRow(i18n.i18n.lockedString("noDelay"), socketInfo.createOptions.noDelay?.toString())}
        ${renderRow(i18n.i18n.lockedString("keepAliveDelay"), socketInfo.createOptions.keepAliveDelay?.toString(10))}
        ${renderRow(i18n.i18n.lockedString("sendBufferSize"), socketInfo.createOptions.sendBufferSize?.toString(10))}
        ${renderRow(i18n.i18n.lockedString("receiveBufferSize"), socketInfo.createOptions.receiveBufferSize?.toString(10))}
        ${renderRow(i18n.i18n.lockedString("dnsQueryType"), socketInfo.createOptions.dnsQueryType)}
        ${renderRow(i18n.i18n.lockedString("multicastTimeToLive"), socketInfo.createOptions.multicastTimeToLive?.toString(10))}
        ${renderRow(i18n.i18n.lockedString("multicastLoopback"), socketInfo.createOptions.multicastLoopback?.toString())}
        ${renderRow(i18n.i18n.lockedString("multicastAllowAddressSharing"), socketInfo.createOptions.multicastAllowAddressSharing?.toString())}
      </div>`;
  let openInfoContent = Lit.nothing;
  if (socketInfo.openInfo) {
    openInfoContent = html`
          <div jslog=${VisualLogging.section(CATEGORY_NAME_OPEN_INFO)}>
            ${renderRow(i18n.i18n.lockedString("remoteAddress"), socketInfo.openInfo.remoteAddr)}
            ${renderRow(i18n.i18n.lockedString("remotePort"), socketInfo.openInfo?.remotePort?.toString(10))}
            ${renderRow(i18n.i18n.lockedString("localAddress"), socketInfo.openInfo.localAddr)}
            ${renderRow(i18n.i18n.lockedString("localPort"), socketInfo.openInfo?.localPort?.toString(10))}
          </div>`;
  }
  render(html`
    <style>${UI.inspectorCommonStyles}</style>
    <style>${RequestHeadersView_css_default}</style>
    ${renderCategory(CATEGORY_NAME_GENERAL, i18nString(UIStrings.general), generalContent)}
    ${renderCategory(CATEGORY_NAME_OPTIONS, i18nString(UIStrings.options), optionsContent)}
    ${socketInfo.openInfo ? renderCategory(CATEGORY_NAME_OPEN_INFO, i18nString(UIStrings.openInfo), openInfoContent) : Lit.nothing}
  `, target);
};
var DirectSocketConnectionView = class extends UI.Widget.Widget {
  #request;
  #view;
  constructor(request, view = DEFAULT_VIEW) {
    super({
      jslog: `${VisualLogging.pane("connection-info").track({ resize: true })}`,
      useShadowDom: true
    });
    this.#request = request;
    this.#view = view;
    this.performUpdate();
  }
  wasShown() {
    super.wasShown();
    this.#request.addEventListener(SDK.NetworkRequest.Events.TIMING_CHANGED, this.requestUpdate, this);
  }
  willHide() {
    super.willHide();
    this.#request.removeEventListener(SDK.NetworkRequest.Events.TIMING_CHANGED, this.requestUpdate, this);
  }
  performUpdate() {
    if (!this.#request || !this.#request.directSocketInfo) {
      return;
    }
    const openCategories = [CATEGORY_NAME_GENERAL, CATEGORY_NAME_OPTIONS, CATEGORY_NAME_OPEN_INFO].filter((value2) => {
      return this.#getCategorySetting(value2).get();
    }, this);
    const viewInput = {
      socketInfo: this.#request.directSocketInfo,
      openCategories,
      onSummaryKeyDown: (event, categoryName) => {
        if (!event.target) {
          return;
        }
        const summaryElement = event.target;
        const detailsElement = summaryElement.parentElement;
        if (!detailsElement) {
          throw new Error("<details> element is not found for a <summary> element");
        }
        let shouldBeOpen;
        switch (event.key) {
          case "ArrowLeft":
            shouldBeOpen = false;
            break;
          case "ArrowRight":
            shouldBeOpen = true;
            break;
          default:
            return;
        }
        if (detailsElement.open !== shouldBeOpen) {
          this.#setIsOpen(categoryName, shouldBeOpen);
        }
      },
      onToggleCategory: (event, categoryName) => {
        const detailsElement = event.target;
        this.#setIsOpen(categoryName, detailsElement.open);
      },
      onCopyRow: () => {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.NetworkPanelCopyValue);
      }
    };
    this.#view(viewInput, void 0, this.contentElement);
  }
  #setIsOpen(categoryName, open) {
    const setting = this.#getCategorySetting(categoryName);
    setting.set(open);
    this.requestUpdate();
  }
  #getCategorySetting(name) {
    return Common.Settings.Settings.instance().createSetting(
      `connection-info-${name}-category-expanded`,
      /* defaultValue= */
      true
    );
  }
};

// gen/front_end/panels/network/components/EditableSpan.js
var EditableSpan_exports = {};
__export(EditableSpan_exports, {
  EditableSpan: () => EditableSpan
});
import * as ComponentHelpers from "./../../../ui/components/helpers/helpers.js";
import { html as html2, render as render2 } from "./../../../ui/lit/lit.js";
import * as VisualLogging2 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/network/components/EditableSpan.css.js
var EditableSpan_css_default = `/*
 * Copyright 2022 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  display: inline;
}

.editable {
  cursor: text;
  overflow-wrap: anywhere;
  min-height: 18px;
  line-height: 18px;
  min-width: 0.5em;
  background: transparent;
  border: none;
  border-radius: 4px;
  outline: none;
  display: inline-block;
  font-family: var(--monospace-font-family);
  font-size: var(--monospace-font-size);

  &:hover {
    border: 1px solid var(--sys-color-neutral-outline);
  }

  &:focus {
    border: 1px solid var(--sys-color-state-focus-ring);
  }
}

.editable::selection {
  color: var(--sys-color-on-tonal-container);
  background-color: var(--sys-color-tonal-container);
}

/*# sourceURL=${import.meta.resolve("./EditableSpan.css")} */`;

// gen/front_end/panels/network/components/EditableSpan.js
var EditableSpan = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #value = "";
  connectedCallback() {
    this.#shadow.addEventListener("focusin", this.#selectAllText.bind(this));
    this.#shadow.addEventListener("keydown", this.#onKeyDown.bind(this));
    this.#shadow.addEventListener("input", this.#onInput.bind(this));
  }
  set data(data) {
    this.#value = data.value;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }
  get value() {
    return this.#shadow.querySelector("span")?.innerText || "";
  }
  set value(value2) {
    this.#value = value2;
    const span = this.#shadow.querySelector("span");
    if (span) {
      span.innerText = value2;
    }
  }
  #onKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      event.target?.blur();
    }
  }
  #onInput(event) {
    this.#value = event.target.innerText;
  }
  #selectAllText(event) {
    const target = event.target;
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(target);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
  #render() {
    if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
      throw new Error("HeaderSectionRow render was not scheduled");
    }
    render2(html2`
      <style>${EditableSpan_css_default}</style>
      <span
        contenteditable="plaintext-only"
        class="editable"
        tabindex="0"
        .innerText=${this.#value}
        jslog=${VisualLogging2.value("header-editor").track({ change: true, keydown: "Enter|Escape" })}
        ></span>`, this.#shadow, { host: this });
  }
  focus() {
    requestAnimationFrame(() => {
      const span = this.#shadow.querySelector(".editable");
      span?.focus();
    });
  }
};
customElements.define("devtools-editable-span", EditableSpan);

// gen/front_end/panels/network/components/HeaderSectionRow.js
var HeaderSectionRow_exports = {};
__export(HeaderSectionRow_exports, {
  EnableHeaderEditingEvent: () => EnableHeaderEditingEvent,
  HeaderEditedEvent: () => HeaderEditedEvent,
  HeaderRemovedEvent: () => HeaderRemovedEvent,
  HeaderSectionRow: () => HeaderSectionRow,
  compareHeaders: () => compareHeaders,
  isValidHeaderName: () => isValidHeaderName
});
import "./../../../ui/legacy/legacy.js";
import * as Host2 from "./../../../core/host/host.js";
import * as i18n3 from "./../../../core/i18n/i18n.js";
import * as Platform from "./../../../core/platform/platform.js";
import * as SDK2 from "./../../../core/sdk/sdk.js";
import * as ClientVariations from "./../../../third_party/chromium/client-variations/client-variations.js";
import * as Buttons from "./../../../ui/components/buttons/buttons.js";
import * as ComponentHelpers2 from "./../../../ui/components/helpers/helpers.js";
import * as Lit2 from "./../../../ui/lit/lit.js";
import * as VisualLogging3 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/network/components/HeaderSectionRow.css.js
var HeaderSectionRow_css_default = `/*
 * Copyright 2022 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  display: block;
}

.row {
  display: flex;
  line-height: 18px;
  padding-left: 8px;
  gap: var(--sys-size-6);
  user-select: text;
  margin: var(--sys-size-3) 0;
}

.row.header-editable {
  font-family: var(--monospace-font-family);
  font-size: var(--monospace-font-size);
}

.header-name {
  font: var(--sys-typescale-body5-medium);
  color: var(--sys-color-on-surface-subtle);
  width: 30%;
  min-width: 160px;
  max-width: 240px;
  flex-shrink: 0;
  text-transform: capitalize;
  overflow-wrap: break-word;
}

.header-name,
.header-value {
  &::selection {
    color: var(--sys-color-on-tonal-container);
    background-color: var(--sys-color-tonal-container);
  }
}

.header-name.pseudo-header {
  text-transform: none;
}

.header-editable .header-name {
  color: var(--sys-color-token-property-special);
}

.row.header-deleted .header-name {
  color: var(--sys-color-token-subtle);
}

.header-value {
  display: flex;
  overflow-wrap: anywhere;
  margin-inline-end: 14px;
  font: var(--sys-typescale-body4-regular);
}

.header-badge-text {
  font-variant: small-caps;
  font-weight: 500;
  white-space: pre-wrap;
  word-break: break-all;
  text-transform: none;
}

.header-badge {
  display: inline;
  background-color: var(--sys-color-error);
  color: var(--sys-color-on-error);
  border-radius: 100vh;
  padding-left: 6px;
  padding-right: 6px;
}

.call-to-action {
  background-color: var(--sys-color-neutral-container);
  padding: 8px;
  border-radius: 5px;
  margin: 4px;
}

.call-to-action-body {
  padding: 6px 0;
  margin-left: 9.5px;
  border-left: 2px solid var(--issue-color-yellow);
  padding-left: 18px;
  line-height: 20px;
}

.call-to-action .explanation {
  font-weight: bold;
}

.call-to-action code {
  font-size: 90%;
}

.call-to-action .example .comment::before {
  content: " \u2014 ";
}

.link,
.devtools-link {
  color: var(--sys-color-primary);
  text-decoration: underline;
  cursor: pointer;
  outline-offset: 2px;
}

.explanation .link {
  font-weight: normal;
}

.inline-icon {
  vertical-align: middle;
}

.row-flex-icon {
  margin: 2px 5px 0;
}

.header-value code {
  display: block;
  white-space: pre-wrap;
  font-size: 90%;
  color: var(--sys-color-token-subtle);
}

x-link .inline-icon {
  padding-right: 3px;
}

.header-highlight {
  background-color: var(--sys-color-yellow-container);
}

.header-warning {
  color: var(--sys-color-error);
}

.header-overridden {
  background-color: var(--sys-color-tertiary-container);
  border-left: 3px solid var(--sys-color-tertiary);
  padding-left: 5px;
}

.header-deleted {
  background-color: var(--sys-color-surface-error);
  border-left: 3px solid var(--sys-color-error-bright);
  color: var(--sys-color-token-subtle);
  text-decoration: line-through;
}

.header-highlight.header-overridden {
  background-color: var(--sys-color-yellow-container);
  border-left: 3px solid var(--sys-color-tertiary);
  padding-left: 5px;
}

.inline-button {
  vertical-align: middle;
}

.row .inline-button {
  opacity: 0%;
  visibility: hidden;
  transition: opacity 200ms;
  padding-left: 2px;
}

.row.header-overridden:focus-within .inline-button,
.row.header-overridden:hover .inline-button {
  opacity: 100%;
  visibility: visible;
}

.row:hover .inline-button.enable-editing {
  opacity: 100%;
  visibility: visible;
}

.flex-right {
  margin-left: auto;
}

.flex-columns {
  flex-direction: column;
}

/*# sourceURL=${import.meta.resolve("./HeaderSectionRow.css")} */`;

// gen/front_end/panels/network/components/HeaderSectionRow.js
var { render: render3, html: html3 } = Lit2;
var UIStrings2 = {
  /**
   * @description Comment used in decoded X-Client-Data HTTP header output in Headers View of the Network panel
   */
  activeClientExperimentVariation: "Active `client experiment variation IDs`.",
  /**
   * @description Comment used in decoded X-Client-Data HTTP header output in Headers View of the Network panel
   */
  activeClientExperimentVariationIds: "Active `client experiment variation IDs` that trigger server-side behavior.",
  /**
   * @description Text in Headers View of the Network panel for X-Client-Data HTTP headers
   */
  decoded: "Decoded:",
  /**
   * @description The title of a button to enable overriding a HTTP header.
   */
  editHeader: "Override header",
  /**
   * @description Description of which letters the name of an HTTP header may contain (a-z, A-Z, 0-9, '-', or '_').
   */
  headerNamesOnlyLetters: "Header names should contain only letters, digits, hyphens or underscores",
  /**
   * @description Text that is usually a hyperlink to more documentation
   */
  learnMore: "Learn more",
  /**
   * @description Text for a link to the issues panel
   */
  learnMoreInTheIssuesTab: "Learn more in the issues tab",
  /**
   * @description Hover text prompting the user to reload the whole page or refresh the particular request, so that the changes they made take effect.
   */
  reloadPrompt: "Refresh the page/request for these changes to take effect",
  /**
   * @description The title of a button which removes a HTTP header override.
   */
  removeOverride: "Remove this header override"
};
var str_2 = i18n3.i18n.registerUIStrings("panels/network/components/HeaderSectionRow.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var isValidHeaderName = (headerName) => {
  return /^[a-z0-9_\-]+$/i.test(headerName);
};
var compareHeaders = (first, second) => {
  return first?.replaceAll(/\s/g, " ") === second?.replaceAll(/\s/g, " ");
};
var HeaderEditedEvent = class _HeaderEditedEvent extends Event {
  static eventName = "headeredited";
  headerName;
  headerValue;
  constructor(headerName, headerValue) {
    super(_HeaderEditedEvent.eventName, {});
    this.headerName = headerName;
    this.headerValue = headerValue;
  }
};
var HeaderRemovedEvent = class _HeaderRemovedEvent extends Event {
  static eventName = "headerremoved";
  headerName;
  headerValue;
  constructor(headerName, headerValue) {
    super(_HeaderRemovedEvent.eventName, {});
    this.headerName = headerName;
    this.headerValue = headerValue;
  }
};
var EnableHeaderEditingEvent = class _EnableHeaderEditingEvent extends Event {
  static eventName = "enableheaderediting";
  constructor() {
    super(_EnableHeaderEditingEvent.eventName, {});
  }
};
var HeaderSectionRow = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #header = null;
  #isHeaderValueEdited = false;
  #isValidHeaderName = true;
  set data(data) {
    this.#header = data.header;
    this.#isHeaderValueEdited = this.#header.originalValue !== void 0 && this.#header.value !== this.#header.originalValue;
    this.#isValidHeaderName = isValidHeaderName(this.#header.name);
    void ComponentHelpers2.ScheduledRender.scheduleRender(this, this.#render);
  }
  #render() {
    if (!ComponentHelpers2.ScheduledRender.isScheduledRender(this)) {
      throw new Error("HeaderSectionRow render was not scheduled");
    }
    if (!this.#header) {
      return;
    }
    const rowClasses = Lit2.Directives.classMap({
      row: true,
      "header-highlight": Boolean(this.#header.highlight),
      "header-overridden": Boolean(this.#header.isOverride) || this.#isHeaderValueEdited,
      "header-editable": this.#header.valueEditable === 1,
      "header-deleted": Boolean(this.#header.isDeleted)
    });
    const headerNameClasses = Lit2.Directives.classMap({
      "header-name": true,
      "pseudo-header": this.#header.name.startsWith(":")
    });
    const headerValueClasses = Lit2.Directives.classMap({
      "header-value": true,
      "header-warning": Boolean(this.#header.headerValueIncorrect),
      "flex-columns": this.#header.name === "x-client-data" && !this.#header.isResponseHeader
    });
    const isHeaderNameEditable = this.#header.nameEditable && this.#header.valueEditable === 1;
    const showReloadInfoIcon = this.#header.nameEditable || this.#header.isDeleted || this.#isHeaderValueEdited;
    render3(html3`
      <style>${HeaderSectionRow_css_default}</style>
      <div class=${rowClasses}>
        <div class=${headerNameClasses}>
          ${this.#header.headerNotSet ? html3`<div class="header-badge header-badge-text">${i18n3.i18n.lockedString("not-set")}</div> ` : Lit2.nothing}
          ${isHeaderNameEditable && !this.#isValidHeaderName ? html3`<devtools-icon class="inline-icon disallowed-characters medium" title=${UIStrings2.headerNamesOnlyLetters} name='cross-circle-filled'>
            </devtools-icon>` : Lit2.nothing}
          ${isHeaderNameEditable && !this.#header.isDeleted ? html3`<devtools-editable-span
              @focusout=${this.#onHeaderNameFocusOut}
              @keydown=${this.#onKeyDown}
              @input=${this.#onHeaderNameEdit}
              @paste=${this.#onHeaderNamePaste}
              .data=${{ value: this.#header.name }}
            ></devtools-editable-span>` : this.#header.name}
        </div>
        <div
          class=${headerValueClasses}
          @copy=${() => Host2.userMetrics.actionTaken(Host2.UserMetrics.Action.NetworkPanelCopyValue)}
        >
          ${this.#renderHeaderValue()}
        </div>
        ${showReloadInfoIcon ? html3`<devtools-icon name="info" class="row-flex-icon flex-right medium" title=${UIStrings2.reloadPrompt}>
          </devtools-icon>` : Lit2.nothing}
      </div>
      ${this.#maybeRenderBlockedDetails(this.#header.blockedDetails)}
    `, this.#shadow, { host: this });
    if (this.#header.highlight) {
      this.scrollIntoView({ behavior: "auto" });
    }
  }
  #renderHeaderValue() {
    if (!this.#header) {
      return Lit2.nothing;
    }
    if (this.#header.name === "x-client-data" && !this.#header.isResponseHeader) {
      return this.#renderXClientDataHeader(this.#header);
    }
    if (this.#header.isDeleted || this.#header.valueEditable !== 1) {
      const showEditHeaderButton = this.#header.isResponseHeader && !this.#header.isDeleted && this.#header.valueEditable !== 2;
      return html3`
      ${this.#header.value || ""}
      ${this.#maybeRenderHeaderValueSuffix(this.#header)}
      ${showEditHeaderButton ? html3`
        <devtools-button
          title=${i18nString2(UIStrings2.editHeader)}
          .size=${"SMALL"}
          .iconName=${"edit"}
          .variant=${"icon"}
          @click=${() => {
        this.dispatchEvent(new EnableHeaderEditingEvent());
      }}
          jslog=${VisualLogging3.action("enable-header-overrides").track({ click: true })}
          class="enable-editing inline-button"
        ></devtools-button>
      ` : Lit2.nothing}
    `;
    }
    return html3`
      <devtools-editable-span
        @focusout=${this.#onHeaderValueFocusOut}
        @input=${this.#onHeaderValueEdit}
        @paste=${this.#onHeaderValueEdit}
        @keydown=${this.#onKeyDown}
        .data=${{ value: this.#header.value || "" }}
      ></devtools-editable-span>
      ${this.#maybeRenderHeaderValueSuffix(this.#header)}
      <devtools-button
        title=${i18nString2(UIStrings2.removeOverride)}
        .size=${"SMALL"}
        .iconName=${"bin"}
        .variant=${"icon"}
        class="remove-header inline-button"
        @click=${this.#onRemoveOverrideClick}
        jslog=${VisualLogging3.action("remove-header-override").track({ click: true })}
      ></devtools-button>
    `;
  }
  #renderXClientDataHeader(header) {
    const data = ClientVariations.parseClientVariations(header.value || "");
    const output = ClientVariations.formatClientVariations(data, i18nString2(UIStrings2.activeClientExperimentVariation), i18nString2(UIStrings2.activeClientExperimentVariationIds));
    return html3`
      <div>${header.value || ""}</div>
      <div>${i18nString2(UIStrings2.decoded)}</div>
      <code>${output}</code>
    `;
  }
  focus() {
    requestAnimationFrame(() => {
      const editableName = this.#shadow.querySelector(".header-name devtools-editable-span");
      editableName?.focus();
    });
  }
  #maybeRenderHeaderValueSuffix(header) {
    if (header.name === "set-cookie" && header.setCookieBlockedReasons) {
      const titleText = header.setCookieBlockedReasons.map(SDK2.NetworkRequest.setCookieBlockedReasonToUiString).join("\n");
      return html3`
        <devtools-icon class="row-flex-icon medium" title=${titleText} name='warning-filled'>
        </devtools-icon>
      `;
    }
    return Lit2.nothing;
  }
  #maybeRenderBlockedDetails(blockedDetails) {
    if (!blockedDetails) {
      return Lit2.nothing;
    }
    return html3`
      <div class="call-to-action">
        <div class="call-to-action-body">
          <div class="explanation">${blockedDetails.explanation()}</div>
          ${blockedDetails.examples.map((example) => html3`
            <div class="example">
              <code>${example.codeSnippet}</code> ${example.comment ? html3`<span class="comment"> ${example.comment()}</span>` : ""}
           </div>`)} ${this.#maybeRenderBlockedDetailsLink(blockedDetails)}
        </div>
      </div>
    `;
  }
  #maybeRenderBlockedDetailsLink(blockedDetails) {
    if (blockedDetails?.reveal) {
      return html3`
        <div class="devtools-link" @click=${blockedDetails.reveal}>
          <devtools-icon name="issue-exclamation-filled" class="inline-icon medium">
          </devtools-icon
          >${i18nString2(UIStrings2.learnMoreInTheIssuesTab)}
        </div>
      `;
    }
    if (blockedDetails?.link) {
      return html3`
        <x-link href=${blockedDetails.link.url} class="link">
          <devtools-icon name="open-externally" class="inline-icon extra-large" style="color: var(--icon-link);">
          </devtools-icon
          >${i18nString2(UIStrings2.learnMore)}
        </x-link>
      `;
    }
    return Lit2.nothing;
  }
  #onHeaderValueFocusOut(event) {
    const target = event.target;
    if (!this.#header) {
      return;
    }
    const headerValue = target.value.trim();
    if (!compareHeaders(headerValue, this.#header.value?.trim())) {
      this.#header.value = headerValue;
      this.dispatchEvent(new HeaderEditedEvent(this.#header.name, headerValue));
      void ComponentHelpers2.ScheduledRender.scheduleRender(this, this.#render);
    }
    const selection = window.getSelection();
    selection?.removeAllRanges();
    this.#header.originalName = "";
  }
  #onHeaderNameFocusOut(event) {
    const target = event.target;
    if (!this.#header) {
      return;
    }
    const headerName = Platform.StringUtilities.toLowerCaseString(target.value.trim());
    if (headerName === "") {
      target.value = this.#header.name;
    } else if (!compareHeaders(headerName, this.#header.name.trim())) {
      this.#header.name = headerName;
      this.dispatchEvent(new HeaderEditedEvent(headerName, this.#header.value || ""));
      void ComponentHelpers2.ScheduledRender.scheduleRender(this, this.#render);
    }
    const selection = window.getSelection();
    selection?.removeAllRanges();
  }
  #onRemoveOverrideClick() {
    if (!this.#header) {
      return;
    }
    const headerValueElement = this.#shadow.querySelector(".header-value devtools-editable-span");
    if (this.#header.originalValue) {
      headerValueElement.value = this.#header?.originalValue;
    }
    this.dispatchEvent(new HeaderRemovedEvent(this.#header.name, this.#header.value || ""));
  }
  #onKeyDown(event) {
    const target = event.target;
    if (event.key === "Escape") {
      event.consume();
      if (target.matches(".header-name devtools-editable-span")) {
        target.value = this.#header?.name || "";
        this.#onHeaderNameEdit(event);
      } else if (target.matches(".header-value devtools-editable-span")) {
        target.value = this.#header?.value || "";
        this.#onHeaderValueEdit(event);
        if (this.#header?.originalName) {
          const headerNameElement = this.#shadow.querySelector(".header-name devtools-editable-span");
          headerNameElement.value = this.#header.originalName;
          this.#header.originalName = "";
          headerNameElement.dispatchEvent(new Event("input"));
          headerNameElement.focus();
          return;
        }
      }
      target.blur();
    }
  }
  #onHeaderNameEdit(event) {
    const editable = event.target;
    const isValidName = isValidHeaderName(editable.value);
    if (this.#isValidHeaderName !== isValidName) {
      this.#isValidHeaderName = isValidName;
      void ComponentHelpers2.ScheduledRender.scheduleRender(this, this.#render);
    }
  }
  #onHeaderValueEdit(event) {
    const editable = event.target;
    const isEdited = this.#header?.originalValue !== void 0 && !compareHeaders(this.#header?.originalValue || "", editable.value);
    if (this.#isHeaderValueEdited !== isEdited) {
      this.#isHeaderValueEdited = isEdited;
      if (this.#header) {
        this.#header.highlight = false;
      }
      void ComponentHelpers2.ScheduledRender.scheduleRender(this, this.#render);
    }
  }
  #onHeaderNamePaste(event) {
    if (!event.clipboardData) {
      return;
    }
    const nameEl = event.target;
    const clipboardText = event.clipboardData.getData("text/plain") || "";
    const separatorPosition = clipboardText.indexOf(":");
    if (separatorPosition < 1) {
      nameEl.value = clipboardText;
      event.preventDefault();
      nameEl.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
    if (this.#header) {
      this.#header.originalName = this.#header.name;
    }
    const headerValue = clipboardText.substring(separatorPosition + 1, clipboardText.length).trim();
    const headerName = clipboardText.substring(0, separatorPosition);
    nameEl.value = headerName;
    nameEl.dispatchEvent(new Event("input"));
    const valueEL = this.#shadow.querySelector(".header-value devtools-editable-span");
    if (valueEL) {
      valueEL.focus();
      valueEL.value = headerValue;
      valueEL.dispatchEvent(new Event("input"));
    }
    event.preventDefault();
  }
};
customElements.define("devtools-header-section-row", HeaderSectionRow);

// gen/front_end/panels/network/components/RequestHeaderSection.js
var RequestHeaderSection_exports = {};
__export(RequestHeaderSection_exports, {
  RequestHeaderSection: () => RequestHeaderSection
});
import "./../../../ui/legacy/legacy.js";
import * as i18n5 from "./../../../core/i18n/i18n.js";
import * as Platform2 from "./../../../core/platform/platform.js";
import * as Lit3 from "./../../../ui/lit/lit.js";
import * as VisualLogging4 from "./../../../ui/visual_logging/visual_logging.js";
import * as NetworkForward from "./../forward/forward.js";

// gen/front_end/panels/network/components/RequestHeaderSection.css.js
var RequestHeaderSection_css_default = `/*
 * Copyright 2022 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  display: block;
}

devtools-header-section-row:last-of-type {
  margin-bottom: 10px;
}

devtools-header-section-row:first-of-type {
  margin-top: 2px;
}

.call-to-action {
  background-color: var(--sys-color-neutral-container);
  padding: 8px;
  border-radius: 5px;
  margin: 4px;
}

.call-to-action-body {
  padding: 6px 0;
  margin-left: 9.5px;
  border-left: 2px solid var(--issue-color-yellow);
  padding-left: 18px;
  line-height: 20px;
}

.call-to-action .explanation {
  font-weight: bold;
}

.call-to-action code {
  font-size: 90%;
}

.call-to-action .example .comment::before {
  content: " \u2014 ";
}

.link,
.devtools-link {
  color: var(--sys-color-primary);
  text-decoration: underline;
  cursor: pointer;
  outline-offset: 2px;
}

.explanation .link {
  font-weight: normal;
}

.inline-icon {
  vertical-align: middle;
}

@media (forced-colors: active) {
  .link,
  .devtools-link {
    color: linktext;
    text-decoration-color: linktext;
  }
}

/*# sourceURL=${import.meta.resolve("./RequestHeaderSection.css")} */`;

// gen/front_end/panels/network/components/RequestHeaderSection.js
var { render: render4, html: html4 } = Lit3;
var UIStrings3 = {
  /**
   * @description Text that is usually a hyperlink to more documentation
   */
  learnMore: "Learn more",
  /**
   * @description Message to explain lack of raw headers for a particular network request
   */
  provisionalHeadersAreShownDisableCache: "Provisional headers are shown. Disable cache to see full headers.",
  /**
   * @description Tooltip to explain lack of raw headers for a particular network request
   */
  onlyProvisionalHeadersAre: "Only provisional headers are available because this request was not sent over the network and instead was served from a local cache, which doesn\u2019t store the original request headers. Disable cache to see full request headers.",
  /**
   * @description Message to explain lack of raw headers for a particular network request
   */
  provisionalHeadersAreShown: "Provisional headers are shown."
};
var str_3 = i18n5.i18n.registerUIStrings("panels/network/components/RequestHeaderSection.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var RequestHeaderSection = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #request;
  #headers = [];
  set data(data) {
    this.#request = data.request;
    this.#headers = this.#request.requestHeaders().map((header) => ({
      name: Platform2.StringUtilities.toLowerCaseString(header.name),
      value: header.value,
      valueEditable: 2
    }));
    this.#headers.sort((a, b) => Platform2.StringUtilities.compare(a.name, b.name));
    if (data.toReveal?.section === "Request") {
      this.#headers.filter((header) => header.name === data.toReveal?.header?.toLowerCase()).forEach((header) => {
        header.highlight = true;
      });
    }
    this.#render();
  }
  #render() {
    if (!this.#request) {
      return;
    }
    render4(html4`
      <style>${RequestHeaderSection_css_default}</style>
      ${this.#maybeRenderProvisionalHeadersWarning()}
      ${this.#headers.map((header) => html4`
        <devtools-header-section-row
          .data=${{ header }}
          jslog=${VisualLogging4.item("request-header")}
        ></devtools-header-section-row>
      `)}
    `, this.#shadow, { host: this });
  }
  #maybeRenderProvisionalHeadersWarning() {
    if (!this.#request || this.#request.requestHeadersText() !== void 0) {
      return Lit3.nothing;
    }
    let cautionText;
    let cautionTitle = "";
    if (this.#request.cachedInMemory() || this.#request.cached()) {
      cautionText = i18nString3(UIStrings3.provisionalHeadersAreShownDisableCache);
      cautionTitle = i18nString3(UIStrings3.onlyProvisionalHeadersAre);
    } else {
      cautionText = i18nString3(UIStrings3.provisionalHeadersAreShown);
    }
    return html4`
      <div class="call-to-action">
        <div class="call-to-action-body">
          <div class="explanation" title=${cautionTitle}>
            <devtools-icon class="inline-icon medium" name='warning-filled'>
            </devtools-icon>
            ${cautionText} <x-link href="https://developer.chrome.com/docs/devtools/network/reference/#provisional-headers" class="link">${i18nString3(UIStrings3.learnMore)}</x-link>
          </div>
        </div>
      </div>
    `;
  }
};
customElements.define("devtools-request-header-section", RequestHeaderSection);

// gen/front_end/panels/network/components/RequestHeadersView.js
var RequestHeadersView_exports = {};
__export(RequestHeadersView_exports, {
  Category: () => Category,
  RequestHeadersView: () => RequestHeadersView,
  ToggleRawHeadersEvent: () => ToggleRawHeadersEvent
});
import * as Common3 from "./../../../core/common/common.js";
import * as Host4 from "./../../../core/host/host.js";
import * as i18n9 from "./../../../core/i18n/i18n.js";
import * as Platform4 from "./../../../core/platform/platform.js";
import * as SDK3 from "./../../../core/sdk/sdk.js";
import * as Persistence2 from "./../../../models/persistence/persistence.js";
import * as Workspace from "./../../../models/workspace/workspace.js";
import * as NetworkForward3 from "./../forward/forward.js";
import * as Buttons3 from "./../../../ui/components/buttons/buttons.js";
import * as Input from "./../../../ui/components/input/input.js";
import * as LegacyWrapper from "./../../../ui/components/legacy_wrapper/legacy_wrapper.js";
import * as RenderCoordinator from "./../../../ui/components/render_coordinator/render_coordinator.js";
import * as UI3 from "./../../../ui/legacy/legacy.js";
import * as Lit4 from "./../../../ui/lit/lit.js";
import * as VisualLogging6 from "./../../../ui/visual_logging/visual_logging.js";
import * as Sources2 from "./../../sources/sources.js";

// gen/front_end/panels/network/components/ResponseHeaderSection.js
var ResponseHeaderSection_exports = {};
__export(ResponseHeaderSection_exports, {
  EarlyHintsHeaderSection: () => EarlyHintsHeaderSection,
  RESPONSE_HEADER_SECTION_DATA_KEY: () => RESPONSE_HEADER_SECTION_DATA_KEY,
  ResponseHeaderSection: () => ResponseHeaderSection
});
import * as Common2 from "./../../../core/common/common.js";
import * as Host3 from "./../../../core/host/host.js";
import * as i18n7 from "./../../../core/i18n/i18n.js";
import * as Platform3 from "./../../../core/platform/platform.js";
import * as IssuesManager from "./../../../models/issues_manager/issues_manager.js";
import * as Persistence from "./../../../models/persistence/persistence.js";
import * as TextUtils from "./../../../models/text_utils/text_utils.js";
import * as NetworkForward2 from "./../forward/forward.js";
import * as Sources from "./../../sources/sources.js";
import * as Buttons2 from "./../../../ui/components/buttons/buttons.js";
import * as UI2 from "./../../../ui/legacy/legacy.js";
import { html as html5, nothing as nothing4, render as render5 } from "./../../../ui/lit/lit.js";
import * as VisualLogging5 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/network/components/ResponseHeaderSection.css.js
var ResponseHeaderSection_css_default = `/*
 * Copyright 2022 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  display: block;
}

devtools-header-section-row:last-of-type {
  margin-bottom: var(--sys-size-5);
}

devtools-header-section-row:first-of-type {
  margin-top: var(--sys-size-5);
}

.add-header-button {
  margin: -4px 0 10px 5px;
}

/*# sourceURL=${import.meta.resolve("./ResponseHeaderSection.css")} */`;

// gen/front_end/panels/network/components/ResponseHeaderSection.js
var UIStrings4 = {
  /**
   * @description Label for a button which allows adding an HTTP header.
   */
  addHeader: "Add header",
  /**
   * @description Explanation text for which cross-origin policy to set.
   */
  chooseThisOptionIfTheResourceAnd: "Choose this option if the resource and the document are served from the same site.",
  /**
   * @description Explanation text for which cross-origin policy to set.
   */
  onlyChooseThisOptionIfAn: "Only choose this option if an arbitrary website including this resource does not impose a security risk.",
  /**
   * @description Message in the Headers View of the Network panel when a cross-origin opener policy blocked loading a sandbox iframe.
   */
  thisDocumentWasBlockedFrom: "The document was blocked from loading in a popup opened by a sandboxed iframe because this document specified a cross-origin opener policy.",
  /**
   * @description Message in the Headers View of the Network panel when a cross-origin embedder policy header needs to be set.
   */
  toEmbedThisFrameInYourDocument: "To embed this frame in your document, the response needs to enable the cross-origin embedder policy by specifying the following response header:",
  /**
   * @description Message in the Headers View of the Network panel when a cross-origin resource policy header needs to be set.
   */
  toUseThisResourceFromADifferent: "To use this resource from a different origin, the server needs to specify a cross-origin resource policy in the response headers:",
  /**
   * @description Message in the Headers View of the Network panel when the cross-origin resource policy header is too strict.
   */
  toUseThisResourceFromADifferentOrigin: "To use this resource from a different origin, the server may relax the cross-origin resource policy response header:",
  /**
   * @description Message in the Headers View of the Network panel when the cross-origin resource policy header is too strict.
   */
  toUseThisResourceFromADifferentSite: "To use this resource from a different site, the server may relax the cross-origin resource policy response header:"
};
var str_4 = i18n7.i18n.registerUIStrings("panels/network/components/ResponseHeaderSection.ts", UIStrings4);
var i18nString4 = i18n7.i18n.getLocalizedString.bind(void 0, str_4);
var i18nLazyString = i18n7.i18n.getLazilyComputedLocalizedString.bind(void 0, str_4);
var RESPONSE_HEADER_SECTION_DATA_KEY = "ResponseHeaderSection";
var ResponseHeaderSectionBase = class extends HTMLElement {
  shadow = this.attachShadow({ mode: "open" });
  headerDetails = [];
  setHeaders(headers) {
    headers.sort(function(a, b) {
      return Platform3.StringUtilities.compare(a.name.toLowerCase(), b.name.toLowerCase());
    });
    this.headerDetails = headers.map((header) => ({
      name: Platform3.StringUtilities.toLowerCaseString(header.name),
      value: header.value.replace(/\s/g, " ")
    }));
  }
  highlightHeaders(data) {
    if (data.toReveal?.section === "Response") {
      this.headerDetails.filter((header) => compareHeaders(header.name, data.toReveal?.header?.toLowerCase())).forEach((header) => {
        header.highlight = true;
      });
    }
  }
};
var EarlyHintsHeaderSection = class extends ResponseHeaderSectionBase {
  #request;
  set data(data) {
    this.#request = data.request;
    this.setHeaders(this.#request.earlyHintsHeaders);
    this.highlightHeaders(data);
    this.#render();
  }
  #render() {
    if (!this.#request) {
      return;
    }
    render5(html5`
      <style>${ResponseHeaderSection_css_default}</style>
      ${this.headerDetails.map((header) => html5`
        <devtools-header-section-row .data=${{
      header
    }}></devtools-header-section-row>
      `)}
    `, this.shadow, { host: this });
  }
};
customElements.define("devtools-early-hints-header-section", EarlyHintsHeaderSection);
var ResponseHeaderSection = class extends ResponseHeaderSectionBase {
  #request;
  #headerEditors = [];
  #uiSourceCode = null;
  #overrides = [];
  #isEditingAllowed = 0;
  set data(data) {
    this.#request = data.request;
    this.#isEditingAllowed = Persistence.NetworkPersistenceManager.NetworkPersistenceManager.isForbiddenNetworkUrl(this.#request.url()) ? 2 : 0;
    const headers = this.#request.sortedResponseHeaders.concat(this.#request.setCookieHeaders);
    this.setHeaders(headers);
    const headersWithIssues = [];
    if (this.#request.wasBlocked()) {
      const headerWithIssues = BlockedReasonDetails.get(this.#request.blockedReason());
      if (headerWithIssues) {
        if (IssuesManager.RelatedIssue.hasIssueOfCategory(
          this.#request,
          "CrossOriginEmbedderPolicy"
          /* IssuesManager.Issue.IssueCategory.CROSS_ORIGIN_EMBEDDER_POLICY */
        )) {
          const followLink = () => {
            Host3.userMetrics.issuesPanelOpenedFrom(
              1
              /* Host.UserMetrics.IssueOpener.LEARN_MORE_LINK_COEP */
            );
            if (this.#request) {
              void IssuesManager.RelatedIssue.reveal(
                this.#request,
                "CrossOriginEmbedderPolicy"
                /* IssuesManager.Issue.IssueCategory.CROSS_ORIGIN_EMBEDDER_POLICY */
              );
            }
          };
          if (headerWithIssues.blockedDetails) {
            headerWithIssues.blockedDetails.reveal = followLink;
          }
        }
        headersWithIssues.push(headerWithIssues);
      }
    }
    function mergeHeadersWithIssues(headers2, headersWithIssues2) {
      let i = 0, j = 0;
      const result = [];
      while (i < headers2.length && j < headersWithIssues2.length) {
        if (headers2[i].name < headersWithIssues2[j].name) {
          result.push({ ...headers2[i++], headerNotSet: false });
        } else if (headers2[i].name > headersWithIssues2[j].name) {
          result.push({ ...headersWithIssues2[j++], headerNotSet: true });
        } else {
          result.push({ ...headersWithIssues2[j++], ...headers2[i++], headerNotSet: false });
        }
      }
      while (i < headers2.length) {
        result.push({ ...headers2[i++], headerNotSet: false });
      }
      while (j < headersWithIssues2.length) {
        result.push({ ...headersWithIssues2[j++], headerNotSet: true });
      }
      return result;
    }
    this.headerDetails = mergeHeadersWithIssues(this.headerDetails, headersWithIssues);
    const blockedResponseCookies = this.#request.blockedResponseCookies();
    const blockedCookieLineToReasons = new Map(blockedResponseCookies?.map((c) => [c.cookieLine.replace(/\s/g, " "), c.blockedReasons]));
    for (const header of this.headerDetails) {
      if (header.name === "set-cookie" && header.value) {
        const matchingBlockedReasons = blockedCookieLineToReasons.get(header.value);
        if (matchingBlockedReasons) {
          header.setCookieBlockedReasons = matchingBlockedReasons;
        }
      }
    }
    this.highlightHeaders(data);
    const dataAssociatedWithRequest = this.#request.getAssociatedData(RESPONSE_HEADER_SECTION_DATA_KEY);
    if (dataAssociatedWithRequest) {
      this.#headerEditors = dataAssociatedWithRequest;
    } else {
      this.#headerEditors = this.headerDetails.map((header) => ({
        name: header.name,
        value: header.value,
        originalValue: header.value,
        valueEditable: this.#isEditingAllowed
      }));
      this.#markOverrides();
    }
    void this.#loadOverridesFileInfo();
    this.#request.setAssociatedData(RESPONSE_HEADER_SECTION_DATA_KEY, this.#headerEditors);
    this.#render();
  }
  #resetEditorState() {
    if (!this.#request) {
      return;
    }
    this.#isEditingAllowed = Persistence.NetworkPersistenceManager.NetworkPersistenceManager.isForbiddenNetworkUrl(this.#request.url()) ? 2 : 0;
    this.#headerEditors = this.headerDetails.map((header) => ({
      name: header.name,
      value: header.value,
      originalValue: header.value,
      valueEditable: this.#isEditingAllowed
    }));
    this.#markOverrides();
    this.#request.setAssociatedData(RESPONSE_HEADER_SECTION_DATA_KEY, this.#headerEditors);
  }
  async #loadOverridesFileInfo() {
    if (!this.#request) {
      return;
    }
    this.#uiSourceCode = Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().getHeadersUISourceCodeFromUrl(this.#request.url());
    if (!this.#uiSourceCode) {
      this.#resetEditorState();
      this.#render();
      return;
    }
    try {
      const contentData = await this.#uiSourceCode.requestContentData().then(TextUtils.ContentData.ContentData.contentDataOrEmpty);
      this.#overrides = JSON.parse(contentData.text || "[]");
      if (!this.#overrides.every(Persistence.NetworkPersistenceManager.isHeaderOverride)) {
        throw new Error("Type mismatch after parsing");
      }
      if (Common2.Settings.Settings.instance().moduleSetting("persistence-network-overrides-enabled").get() && this.#isEditingAllowed === 0) {
        this.#isEditingAllowed = 1;
      }
      for (const header of this.#headerEditors) {
        header.valueEditable = this.#isEditingAllowed;
      }
    } catch {
      console.error("Failed to parse", this.#uiSourceCode?.url() || "source code file", "for locally overriding headers.");
      this.#resetEditorState();
    } finally {
      this.#render();
    }
  }
  #markOverrides() {
    if (!this.#request || this.#request.originalResponseHeaders.length === 0) {
      return;
    }
    const originalHeaders = this.#request.originalResponseHeaders.map((header) => ({
      name: Platform3.StringUtilities.toLowerCaseString(header.name),
      value: header.value.replace(/\s/g, " ")
    }));
    originalHeaders.sort(function(a, b) {
      return Platform3.StringUtilities.compare(a.name, b.name);
    });
    let indexActual = 0;
    let indexOriginal = 0;
    while (indexActual < this.headerDetails.length) {
      const currentName = this.headerDetails[indexActual].name;
      let actualValue = this.headerDetails[indexActual].value || "";
      const headerNotSet = this.headerDetails[indexActual].headerNotSet;
      while (indexActual < this.headerDetails.length - 1 && this.headerDetails[indexActual + 1].name === currentName) {
        indexActual++;
        actualValue += `, ${this.headerDetails[indexActual].value}`;
      }
      while (indexOriginal < originalHeaders.length && originalHeaders[indexOriginal].name < currentName) {
        indexOriginal++;
      }
      if (indexOriginal < originalHeaders.length && originalHeaders[indexOriginal].name === currentName) {
        let originalValue = originalHeaders[indexOriginal].value;
        while (indexOriginal < originalHeaders.length - 1 && originalHeaders[indexOriginal + 1].name === currentName) {
          indexOriginal++;
          originalValue += `, ${originalHeaders[indexOriginal].value}`;
        }
        indexOriginal++;
        if (currentName !== "set-cookie" && !headerNotSet && !compareHeaders(actualValue, originalValue)) {
          this.#headerEditors.filter((header) => compareHeaders(header.name, currentName)).forEach((header) => {
            header.isOverride = true;
          });
        }
      } else if (currentName !== "set-cookie" && !headerNotSet) {
        this.#headerEditors.filter((header) => compareHeaders(header.name, currentName)).forEach((header) => {
          header.isOverride = true;
        });
      }
      indexActual++;
    }
    this.#headerEditors.filter((header) => header.name === "set-cookie").forEach((header) => {
      if (this.#request?.originalResponseHeaders.find((originalHeader) => Platform3.StringUtilities.toLowerCaseString(originalHeader.name) === "set-cookie" && compareHeaders(originalHeader.value, header.value)) === void 0) {
        header.isOverride = true;
      }
    });
  }
  #onHeaderEdited(event) {
    const target = event.target;
    if (target.dataset.index === void 0) {
      return;
    }
    const index = Number(target.dataset.index);
    if (isValidHeaderName(event.headerName)) {
      this.#updateOverrides(event.headerName, event.headerValue, index);
      Host3.userMetrics.actionTaken(Host3.UserMetrics.Action.HeaderOverrideHeaderEdited);
    }
  }
  #fileNameFromUrl(url) {
    const rawPath = Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().rawPathFromUrl(url, true);
    const lastIndexOfSlash = rawPath.lastIndexOf("/");
    return Common2.ParsedURL.ParsedURL.substring(rawPath, lastIndexOfSlash + 1);
  }
  #commitOverrides() {
    this.#uiSourceCode?.setWorkingCopy(JSON.stringify(this.#overrides, null, 2));
    this.#uiSourceCode?.commitWorkingCopy();
  }
  #removeEntryFromOverrides(rawFileName, headerName, headerValue) {
    for (let blockIndex = this.#overrides.length - 1; blockIndex >= 0; blockIndex--) {
      const block = this.#overrides[blockIndex];
      if (block.applyTo !== rawFileName) {
        continue;
      }
      const foundIndex = block.headers.findIndex((header) => compareHeaders(header.name, headerName) && compareHeaders(header.value, headerValue));
      if (foundIndex < 0) {
        continue;
      }
      block.headers.splice(foundIndex, 1);
      if (block.headers.length === 0) {
        this.#overrides.splice(blockIndex, 1);
      }
      return;
    }
  }
  #onHeaderRemoved(event) {
    const target = event.target;
    if (target.dataset.index === void 0 || !this.#request) {
      return;
    }
    const index = Number(target.dataset.index);
    const rawFileName = this.#fileNameFromUrl(this.#request.url());
    this.#removeEntryFromOverrides(rawFileName, event.headerName, event.headerValue);
    this.#commitOverrides();
    this.#headerEditors[index].isDeleted = true;
    this.#render();
    Host3.userMetrics.actionTaken(Host3.UserMetrics.Action.HeaderOverrideHeaderRemoved);
  }
  #updateOverrides(headerName, headerValue, index) {
    if (!this.#request) {
      return;
    }
    if (this.#request.originalResponseHeaders.length === 0) {
      this.#request.originalResponseHeaders = this.#request.sortedResponseHeaders.map((headerEntry) => ({ ...headerEntry }));
    }
    const previousName = this.#headerEditors[index].name;
    const previousValue = this.#headerEditors[index].value;
    this.#headerEditors[index].name = headerName;
    this.#headerEditors[index].value = headerValue;
    let headersToUpdate = [];
    if (headerName === "set-cookie") {
      headersToUpdate.push({ name: headerName, value: headerValue, valueEditable: this.#isEditingAllowed });
    } else {
      headersToUpdate = this.#headerEditors.filter((header) => compareHeaders(header.name, headerName) && (!compareHeaders(header.value, header.originalValue) || header.isOverride));
    }
    const rawFileName = this.#fileNameFromUrl(this.#request.url());
    let block = null;
    const [lastOverride] = this.#overrides.slice(-1);
    if (lastOverride?.applyTo === rawFileName) {
      block = lastOverride;
    } else {
      block = {
        applyTo: rawFileName,
        headers: []
      };
      this.#overrides.push(block);
    }
    if (headerName === "set-cookie") {
      const foundIndex = block.headers.findIndex((header) => compareHeaders(header.name, previousName) && compareHeaders(header.value, previousValue));
      if (foundIndex >= 0) {
        block.headers.splice(foundIndex, 1);
      }
    } else {
      block.headers = block.headers.filter((header) => !compareHeaders(header.name, headerName));
    }
    if (!compareHeaders(this.#headerEditors[index].name, previousName)) {
      for (let i = 0; i < block.headers.length; ++i) {
        if (compareHeaders(block.headers[i].name, previousName) && compareHeaders(block.headers[i].value, previousValue)) {
          block.headers.splice(i, 1);
          break;
        }
      }
    }
    for (const header of headersToUpdate) {
      block.headers.push({ name: header.name, value: header.value || "" });
    }
    if (block.headers.length === 0) {
      this.#overrides.pop();
    }
    this.#commitOverrides();
  }
  #onAddHeaderClick() {
    this.#headerEditors.push({
      name: Platform3.StringUtilities.toLowerCaseString(i18n7.i18n.lockedString("header-name")),
      value: i18n7.i18n.lockedString("header value"),
      isOverride: true,
      nameEditable: true,
      valueEditable: 1
    });
    const index = this.#headerEditors.length - 1;
    this.#updateOverrides(this.#headerEditors[index].name, this.#headerEditors[index].value || "", index);
    this.#render();
    const rows = this.shadow.querySelectorAll("devtools-header-section-row");
    const [lastRow] = Array.from(rows).slice(-1);
    lastRow?.focus();
    Host3.userMetrics.actionTaken(Host3.UserMetrics.Action.HeaderOverrideHeaderAdded);
  }
  #render() {
    if (!this.#request) {
      return;
    }
    const headerDescriptors = this.#headerEditors.map((headerEditor, index) => ({ ...this.headerDetails[index], ...headerEditor, isResponseHeader: true }));
    render5(html5`
      <style>${ResponseHeaderSection_css_default}</style>
      ${headerDescriptors.map((header, index) => html5`
        <devtools-header-section-row
            .data=${{ header }}
            @headeredited=${this.#onHeaderEdited}
            @headerremoved=${this.#onHeaderRemoved}
            @enableheaderediting=${this.#onEnableHeaderEditingClick}
            data-index=${index}
            jslog=${VisualLogging5.item("response-header")}
        ></devtools-header-section-row>
      `)}
      ${this.#isEditingAllowed === 1 ? html5`
        <devtools-button
          class="add-header-button"
          .variant=${"outlined"}
          .iconName=${"plus"}
          @click=${this.#onAddHeaderClick}
          jslog=${VisualLogging5.action("add-header").track({ click: true })}>
          ${i18nString4(UIStrings4.addHeader)}
        </devtools-button>
      ` : nothing4}
    `, this.shadow, { host: this });
  }
  async #onEnableHeaderEditingClick() {
    if (!this.#request) {
      return;
    }
    Host3.userMetrics.actionTaken(Host3.UserMetrics.Action.HeaderOverrideEnableEditingClicked);
    const requestUrl = this.#request.url();
    const networkPersistenceManager = Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance();
    if (networkPersistenceManager.project()) {
      Common2.Settings.Settings.instance().moduleSetting("persistence-network-overrides-enabled").set(true);
      await networkPersistenceManager.getOrCreateHeadersUISourceCodeFromUrl(requestUrl);
    } else {
      UI2.InspectorView.InspectorView.instance().displaySelectOverrideFolderInfobar(async () => {
        await Sources.SourcesNavigator.OverridesNavigatorView.instance().setupNewWorkspace();
        await networkPersistenceManager.getOrCreateHeadersUISourceCodeFromUrl(requestUrl);
      });
    }
  }
};
customElements.define("devtools-response-header-section", ResponseHeaderSection);
var BlockedReasonDetails = /* @__PURE__ */ new Map([
  [
    "coep-frame-resource-needs-coep-header",
    {
      name: Platform3.StringUtilities.toLowerCaseString("cross-origin-embedder-policy"),
      value: null,
      blockedDetails: {
        explanation: i18nLazyString(UIStrings4.toEmbedThisFrameInYourDocument),
        examples: [{ codeSnippet: "Cross-Origin-Embedder-Policy: require-corp", comment: void 0 }],
        link: { url: "https://web.dev/coop-coep/" }
      }
    }
  ],
  [
    "corp-not-same-origin-after-defaulted-to-same-origin-by-coep",
    {
      name: Platform3.StringUtilities.toLowerCaseString("cross-origin-resource-policy"),
      value: null,
      blockedDetails: {
        explanation: i18nLazyString(UIStrings4.toUseThisResourceFromADifferent),
        examples: [
          {
            codeSnippet: "Cross-Origin-Resource-Policy: same-site",
            comment: i18nLazyString(UIStrings4.chooseThisOptionIfTheResourceAnd)
          },
          {
            codeSnippet: "Cross-Origin-Resource-Policy: cross-origin",
            comment: i18nLazyString(UIStrings4.onlyChooseThisOptionIfAn)
          }
        ],
        link: { url: "https://web.dev/coop-coep/" }
      }
    }
  ],
  [
    "coop-sandboxed-iframe-cannot-navigate-to-coop-page",
    {
      name: Platform3.StringUtilities.toLowerCaseString("cross-origin-opener-policy"),
      value: null,
      headerValueIncorrect: false,
      blockedDetails: {
        explanation: i18nLazyString(UIStrings4.thisDocumentWasBlockedFrom),
        examples: [],
        link: { url: "https://web.dev/coop-coep/" }
      }
    }
  ],
  [
    "corp-not-same-site",
    {
      name: Platform3.StringUtilities.toLowerCaseString("cross-origin-resource-policy"),
      value: null,
      headerValueIncorrect: true,
      blockedDetails: {
        explanation: i18nLazyString(UIStrings4.toUseThisResourceFromADifferentSite),
        examples: [
          {
            codeSnippet: "Cross-Origin-Resource-Policy: cross-origin",
            comment: i18nLazyString(UIStrings4.onlyChooseThisOptionIfAn)
          }
        ],
        link: null
      }
    }
  ],
  [
    "corp-not-same-origin",
    {
      name: Platform3.StringUtilities.toLowerCaseString("cross-origin-resource-policy"),
      value: null,
      headerValueIncorrect: true,
      blockedDetails: {
        explanation: i18nLazyString(UIStrings4.toUseThisResourceFromADifferentOrigin),
        examples: [
          {
            codeSnippet: "Cross-Origin-Resource-Policy: same-site",
            comment: i18nLazyString(UIStrings4.chooseThisOptionIfTheResourceAnd)
          },
          {
            codeSnippet: "Cross-Origin-Resource-Policy: cross-origin",
            comment: i18nLazyString(UIStrings4.onlyChooseThisOptionIfAn)
          }
        ],
        link: null
      }
    }
  ]
]);

// gen/front_end/panels/network/components/RequestHeadersView.js
var RAW_HEADER_CUTOFF = 3e3;
var { render: render6, html: html6 } = Lit4;
var UIStrings5 = {
  /**
   * @description Text in Request Headers View of the Network panel
   */
  fromDiskCache: "(from disk cache)",
  /**
   * @description Text in Request Headers View of the Network panel
   */
  fromMemoryCache: "(from memory cache)",
  /**
   * @description Text in Request Headers View of the Network panel
   */
  fromEarlyHints: "(from early hints)",
  /**
   * @description Text in Request Headers View of the Network panel
   */
  fromPrefetchCache: "(from prefetch cache)",
  /**
   * @description Text in Request Headers View of the Network panel
   */
  fromServiceWorker: "(from `service worker`)",
  /**
   * @description Text in Request Headers View of the Network panel
   */
  fromSignedexchange: "(from signed-exchange)",
  /**
   * @description Section header for a list of the main aspects of a http request
   */
  general: "General",
  /**
   * @description Label for a checkbox to switch between raw and parsed headers
   */
  raw: "Raw",
  /**
   * @description Text in Request Headers View of the Network panel
   */
  referrerPolicy: "Referrer Policy",
  /**
   * @description Text in Network Log View Columns of the Network panel
   */
  remoteAddress: "Remote Address",
  /**
   * @description Text in Request Headers View of the Network panel
   */
  requestHeaders: "Request Headers",
  /**
   * @description The HTTP method of a request
   */
  requestMethod: "Request Method",
  /**
   * @description The URL of a request
   */
  requestUrl: "Request URL",
  /**
   * @description A context menu item in the Network Log View Columns of the Network panel
   */
  responseHeaders: "Response Headers",
  /**
   * @description A context menu item in the Network Log View Columns of the Network panel
   */
  earlyHintsHeaders: "Early Hints Headers",
  /**
   * @description Title text for a link to the Sources panel to the file containing the header override definitions
   */
  revealHeaderOverrides: "Reveal header override definitions",
  /**
   * @description Text to show more content
   */
  showMore: "Show more",
  /**
   * @description HTTP response code
   */
  statusCode: "Status Code"
};
var str_5 = i18n9.i18n.registerUIStrings("panels/network/components/RequestHeadersView.ts", UIStrings5);
var i18nString5 = i18n9.i18n.getLocalizedString.bind(void 0, str_5);
var RequestHeadersView = class extends LegacyWrapper.LegacyWrapper.WrappableComponent {
  #request;
  #shadow = this.attachShadow({ mode: "open" });
  #showResponseHeadersText = false;
  #showRequestHeadersText = false;
  #showResponseHeadersTextFull = false;
  #showRequestHeadersTextFull = false;
  #toReveal = void 0;
  #workspace = Workspace.Workspace.WorkspaceImpl.instance();
  constructor(request) {
    super();
    this.#request = request;
    this.setAttribute("jslog", `${VisualLogging6.pane("headers").track({ resize: true })}`);
  }
  wasShown() {
    super.wasShown();
    this.#request.addEventListener(SDK3.NetworkRequest.Events.REMOTE_ADDRESS_CHANGED, this.#refreshHeadersView, this);
    this.#request.addEventListener(SDK3.NetworkRequest.Events.FINISHED_LOADING, this.#refreshHeadersView, this);
    this.#request.addEventListener(SDK3.NetworkRequest.Events.REQUEST_HEADERS_CHANGED, this.#refreshHeadersView, this);
    this.#request.addEventListener(SDK3.NetworkRequest.Events.RESPONSE_HEADERS_CHANGED, this.#resetAndRefreshHeadersView, this);
    this.#toReveal = void 0;
    this.#refreshHeadersView();
  }
  willHide() {
    super.willHide();
    this.#request.removeEventListener(SDK3.NetworkRequest.Events.REMOTE_ADDRESS_CHANGED, this.#refreshHeadersView, this);
    this.#request.removeEventListener(SDK3.NetworkRequest.Events.FINISHED_LOADING, this.#refreshHeadersView, this);
    this.#request.removeEventListener(SDK3.NetworkRequest.Events.REQUEST_HEADERS_CHANGED, this.#refreshHeadersView, this);
    this.#request.removeEventListener(SDK3.NetworkRequest.Events.RESPONSE_HEADERS_CHANGED, this.#resetAndRefreshHeadersView, this);
  }
  #resetAndRefreshHeadersView() {
    this.#request.deleteAssociatedData(RESPONSE_HEADER_SECTION_DATA_KEY);
    void this.render();
  }
  #refreshHeadersView() {
    void this.render();
  }
  revealHeader(section3, header) {
    this.#toReveal = { section: section3, header };
    void this.render();
  }
  connectedCallback() {
    this.#workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this.#uiSourceCodeAddedOrRemoved, this);
    this.#workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved, this.#uiSourceCodeAddedOrRemoved, this);
    Common3.Settings.Settings.instance().moduleSetting("persistence-network-overrides-enabled").addChangeListener(this.render, this);
  }
  disconnectedCallback() {
    this.#workspace.removeEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this.#uiSourceCodeAddedOrRemoved, this);
    this.#workspace.removeEventListener(Workspace.Workspace.Events.UISourceCodeRemoved, this.#uiSourceCodeAddedOrRemoved, this);
    Common3.Settings.Settings.instance().moduleSetting("persistence-network-overrides-enabled").removeChangeListener(this.render, this);
  }
  #uiSourceCodeAddedOrRemoved(event) {
    if (this.#getHeaderOverridesFileUrl() === event.data.url()) {
      void this.render();
    }
  }
  async render() {
    if (!this.#request) {
      return;
    }
    return await RenderCoordinator.write(() => {
      render6(html6`
        <style>${RequestHeadersView_css_default}</style>
        ${this.#renderGeneralSection()}
        ${this.#renderEarlyHintsHeaders()}
        ${this.#renderResponseHeaders()}
        ${this.#renderRequestHeaders()}
      `, this.#shadow, { host: this });
    });
  }
  #renderEarlyHintsHeaders() {
    if (!this.#request || !this.#request.earlyHintsHeaders || this.#request.earlyHintsHeaders.length === 0) {
      return Lit4.nothing;
    }
    const toggleShowRaw = () => {
      this.#showResponseHeadersText = !this.#showResponseHeadersText;
      void this.render();
    };
    return html6`
      <devtools-request-headers-category
        @togglerawevent=${toggleShowRaw}
        .data=${{
      name: "early-hints-headers",
      title: i18nString5(UIStrings5.earlyHintsHeaders),
      headerCount: this.#request.earlyHintsHeaders.length,
      checked: void 0,
      additionalContent: void 0,
      forceOpen: this.#toReveal?.section === "EarlyHints",
      loggingContext: "early-hints-headers"
    }}
        aria-label=${i18nString5(UIStrings5.earlyHintsHeaders)}
      >
        ${this.#showResponseHeadersText ? this.#renderRawHeaders(this.#request.responseHeadersText, true) : html6`
          <devtools-early-hints-header-section .data=${{
      request: this.#request,
      toReveal: this.#toReveal
    }}></devtools-early-hints-header-section>
        `}
      </devtools-request-headers-category>
    `;
  }
  #renderResponseHeaders() {
    if (!this.#request) {
      return Lit4.nothing;
    }
    const toggleShowRaw = () => {
      this.#showResponseHeadersText = !this.#showResponseHeadersText;
      void this.render();
    };
    return html6`
      <devtools-request-headers-category
        @togglerawevent=${toggleShowRaw}
        .data=${{
      name: "response-headers",
      title: i18nString5(UIStrings5.responseHeaders),
      headerCount: this.#request.sortedResponseHeaders.length,
      checked: this.#request.responseHeadersText ? this.#showResponseHeadersText : void 0,
      additionalContent: this.#renderHeaderOverridesLink(),
      forceOpen: this.#toReveal?.section === "Response",
      loggingContext: "response-headers"
    }}
        aria-label=${i18nString5(UIStrings5.responseHeaders)}
      >
        ${this.#showResponseHeadersText ? this.#renderRawHeaders(this.#request.responseHeadersText, true) : html6`
          <devtools-response-header-section .data=${{
      request: this.#request,
      toReveal: this.#toReveal
    }} jslog=${VisualLogging6.section("response-headers")}></devtools-response-header-section>
        `}
      </devtools-request-headers-category>
    `;
  }
  #renderHeaderOverridesLink() {
    if (!this.#workspace.uiSourceCodeForURL(this.#getHeaderOverridesFileUrl())) {
      return Lit4.nothing;
    }
    const overridesSetting = Common3.Settings.Settings.instance().moduleSetting("persistence-network-overrides-enabled");
    const fileIcon = html6`
      <devtools-icon name="document" class=${"medium" + overridesSetting.get() ? "inline-icon dot purple" : "inline-icon"}>
      </devtools-icon>`;
    const revealHeadersFile = (event) => {
      event.preventDefault();
      const uiSourceCode = this.#workspace.uiSourceCodeForURL(this.#getHeaderOverridesFileUrl());
      if (uiSourceCode) {
        Sources2.SourcesPanel.SourcesPanel.instance().showUISourceCode(uiSourceCode);
        void Sources2.SourcesPanel.SourcesPanel.instance().revealInNavigator(uiSourceCode);
      }
    };
    return html6`
      <x-link
          href="https://goo.gle/devtools-override"
          class="link devtools-link"
          jslog=${VisualLogging6.link("devtools-override").track({ click: true })}
      >
        <devtools-icon name="help" class="inline-icon medium">
        </devtools-icon>
      </x-link>
      <x-link
          @click=${revealHeadersFile}
          class="link devtools-link"
          title=${UIStrings5.revealHeaderOverrides}
          jslog=${VisualLogging6.link("reveal-header-overrides").track({ click: true })}
      >
        ${fileIcon}${Persistence2.NetworkPersistenceManager.HEADERS_FILENAME}
      </x-link>
    `;
  }
  #getHeaderOverridesFileUrl() {
    if (!this.#request) {
      return Platform4.DevToolsPath.EmptyUrlString;
    }
    const fileUrl = Persistence2.NetworkPersistenceManager.NetworkPersistenceManager.instance().fileUrlFromNetworkUrl(
      this.#request.url(),
      /* ignoreInactive */
      true
    );
    return fileUrl.substring(0, fileUrl.lastIndexOf("/")) + "/" + Persistence2.NetworkPersistenceManager.HEADERS_FILENAME;
  }
  #renderRequestHeaders() {
    if (!this.#request) {
      return Lit4.nothing;
    }
    const requestHeadersText = this.#request.requestHeadersText();
    const toggleShowRaw = () => {
      this.#showRequestHeadersText = !this.#showRequestHeadersText;
      void this.render();
    };
    return html6`
      <devtools-request-headers-category
        @togglerawevent=${toggleShowRaw}
        .data=${{
      name: "request-headers",
      title: i18nString5(UIStrings5.requestHeaders),
      headerCount: this.#request.requestHeaders().length,
      checked: requestHeadersText ? this.#showRequestHeadersText : void 0,
      forceOpen: this.#toReveal?.section === "Request",
      loggingContext: "request-headers"
    }}
        aria-label=${i18nString5(UIStrings5.requestHeaders)}
      >
        ${this.#showRequestHeadersText && requestHeadersText ? this.#renderRawHeaders(requestHeadersText, false) : html6`
          <devtools-request-header-section .data=${{
      request: this.#request,
      toReveal: this.#toReveal
    }} jslog=${VisualLogging6.section("request-headers")}></devtools-request-header-section>
        `}
      </devtools-request-headers-category>
    `;
  }
  #renderRawHeaders(rawHeadersText, forResponseHeaders) {
    const trimmed = rawHeadersText.trim();
    const showFull = forResponseHeaders ? this.#showResponseHeadersTextFull : this.#showRequestHeadersTextFull;
    const isShortened = !showFull && trimmed.length > RAW_HEADER_CUTOFF;
    const showMore = () => {
      if (forResponseHeaders) {
        this.#showResponseHeadersTextFull = true;
      } else {
        this.#showRequestHeadersTextFull = true;
      }
      void this.render();
    };
    const onContextMenuOpen = (event) => {
      const showFull2 = forResponseHeaders ? this.#showResponseHeadersTextFull : this.#showRequestHeadersTextFull;
      if (!showFull2) {
        const contextMenu = new UI3.ContextMenu.ContextMenu(event);
        const section3 = contextMenu.newSection();
        section3.appendItem(i18nString5(UIStrings5.showMore), showMore, { jslogContext: "show-more" });
        void contextMenu.show();
      }
    };
    return html6`
      <div
        class="row raw-headers-row"
        @contextmenu=${(event) => {
      if (isShortened) {
        onContextMenuOpen(event);
      }
    }}
      >
        <div class="raw-headers">
          ${isShortened ? trimmed.substring(0, RAW_HEADER_CUTOFF) : trimmed}
        </div>
        ${isShortened ? html6`
              <devtools-button
                .size=${"SMALL"}
                .variant=${"outlined"}
                @click=${showMore}
                jslog=${VisualLogging6.action("raw-headers-show-more").track({
      click: true
    })}
                >${i18nString5(UIStrings5.showMore)}</devtools-button
              >
            ` : Lit4.nothing}
      </div>
    `;
  }
  #renderGeneralSection() {
    if (!this.#request) {
      return Lit4.nothing;
    }
    const statusClasses = ["status"];
    if (this.#request.statusCode < 300 || this.#request.statusCode === 304) {
      statusClasses.push("green-circle");
    } else if (this.#request.statusCode < 400) {
      statusClasses.push("yellow-circle");
    } else {
      statusClasses.push("red-circle");
    }
    let comment = "";
    if (this.#request.cachedInMemory()) {
      comment = i18nString5(UIStrings5.fromMemoryCache);
    } else if (this.#request.fromEarlyHints()) {
      comment = i18nString5(UIStrings5.fromEarlyHints);
    } else if (this.#request.fetchedViaServiceWorker) {
      comment = i18nString5(UIStrings5.fromServiceWorker);
    } else if (this.#request.redirectSourceSignedExchangeInfoHasNoErrors()) {
      comment = i18nString5(UIStrings5.fromSignedexchange);
    } else if (this.#request.fromPrefetchCache()) {
      comment = i18nString5(UIStrings5.fromPrefetchCache);
    } else if (this.#request.cached()) {
      comment = i18nString5(UIStrings5.fromDiskCache);
    }
    if (comment) {
      statusClasses.push("status-with-comment");
    }
    const statusText = [this.#request.statusCode, this.#request.getInferredStatusText(), comment].join(" ");
    return html6`
      <devtools-request-headers-category
        .data=${{
      name: "general",
      title: i18nString5(UIStrings5.general),
      forceOpen: this.#toReveal?.section === "General",
      loggingContext: "general"
    }}
        aria-label=${i18nString5(UIStrings5.general)}
      >
      <div jslog=${VisualLogging6.section("general")}>
        ${this.#renderGeneralRow(i18nString5(UIStrings5.requestUrl), this.#request.url())}
        ${this.#request.statusCode ? this.#renderGeneralRow(i18nString5(UIStrings5.requestMethod), this.#request.requestMethod) : Lit4.nothing}
        ${this.#request.statusCode ? this.#renderGeneralRow(i18nString5(UIStrings5.statusCode), statusText, statusClasses) : Lit4.nothing}
        ${this.#request.remoteAddress() ? this.#renderGeneralRow(i18nString5(UIStrings5.remoteAddress), this.#request.remoteAddress()) : Lit4.nothing}
        ${this.#request.referrerPolicy() ? this.#renderGeneralRow(i18nString5(UIStrings5.referrerPolicy), String(this.#request.referrerPolicy())) : Lit4.nothing}
      </div>
      </devtools-request-headers-category>
    `;
  }
  #renderGeneralRow(name, value2, classNames) {
    const isHighlighted = this.#toReveal?.section === "General" && name.toLowerCase() === this.#toReveal?.header?.toLowerCase();
    return html6`
      <div class="row ${isHighlighted ? "header-highlight" : ""}">
        <div class="header-name">${name}</div>
        <div
          class="header-value ${classNames?.join(" ")}"
          @copy=${() => Host4.userMetrics.actionTaken(Host4.UserMetrics.Action.NetworkPanelCopyValue)}
        >${value2}</div>
      </div>
    `;
  }
};
var ToggleRawHeadersEvent = class _ToggleRawHeadersEvent extends Event {
  static eventName = "togglerawevent";
  constructor() {
    super(_ToggleRawHeadersEvent.eventName, {});
  }
};
var Category = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #expandedSetting;
  #title = Common3.UIString.LocalizedEmptyString;
  #headerCount = void 0;
  #checked = void 0;
  #additionalContent = void 0;
  #forceOpen = void 0;
  #loggingContext = "";
  set data(data) {
    this.#title = data.title;
    this.#expandedSetting = Common3.Settings.Settings.instance().createSetting("request-info-" + data.name + "-category-expanded", true);
    this.#headerCount = data.headerCount;
    this.#checked = data.checked;
    this.#additionalContent = data.additionalContent;
    this.#forceOpen = data.forceOpen;
    this.#loggingContext = data.loggingContext;
    this.#render();
  }
  #onCheckboxToggle() {
    this.dispatchEvent(new ToggleRawHeadersEvent());
  }
  #render() {
    const isOpen = (this.#expandedSetting ? this.#expandedSetting.get() : true) || this.#forceOpen;
    render6(html6`
      <style>${RequestHeadersView_css_default}</style>
      <style>${Input.checkboxStyles}</style>
      <details ?open=${isOpen} @toggle=${this.#onToggle}>
        <summary
          class="header"
          @keydown=${this.#onSummaryKeyDown}
          jslog=${VisualLogging6.sectionHeader().track({ click: true }).context(this.#loggingContext)}
        >
          <div class="header-grid-container">
            <div>
              ${this.#title}${this.#headerCount !== void 0 ? html6`<span class="header-count"> (${this.#headerCount})</span>` : Lit4.nothing}
            </div>
            <div class="hide-when-closed">
              ${this.#checked !== void 0 ? html6`
                <devtools-checkbox .checked=${this.#checked} @change=${this.#onCheckboxToggle}
                         jslog=${VisualLogging6.toggle("raw-headers").track({ change: true })}>
                  ${i18nString5(UIStrings5.raw)}
              </devtools-checkbox>` : Lit4.nothing}
            </div>
            <div class="hide-when-closed">${this.#additionalContent}</div>
          </div>
        </summary>
        <slot></slot>
      </details>
    `, this.#shadow, { host: this });
  }
  #onSummaryKeyDown(event) {
    if (!event.target) {
      return;
    }
    const summaryElement = event.target;
    const detailsElement = summaryElement.parentElement;
    if (!detailsElement) {
      throw new Error("<details> element is not found for a <summary> element");
    }
    switch (event.key) {
      case "ArrowLeft":
        detailsElement.open = false;
        break;
      case "ArrowRight":
        detailsElement.open = true;
        break;
    }
  }
  #onToggle(event) {
    this.#expandedSetting?.set(event.target.open);
  }
};
customElements.define("devtools-request-headers", RequestHeadersView);
customElements.define("devtools-request-headers-category", Category);

// gen/front_end/panels/network/components/RequestTrustTokensView.js
var RequestTrustTokensView_exports = {};
__export(RequestTrustTokensView_exports, {
  RequestTrustTokensView: () => RequestTrustTokensView,
  statusConsideredSuccess: () => statusConsideredSuccess
});
import "./../../../ui/components/report_view/report_view.js";
import "./../../../ui/components/icon_button/icon_button.js";
import * as i18n11 from "./../../../core/i18n/i18n.js";
import * as SDK4 from "./../../../core/sdk/sdk.js";
import * as LegacyWrapper3 from "./../../../ui/components/legacy_wrapper/legacy_wrapper.js";
import * as Lit5 from "./../../../ui/lit/lit.js";
import * as VisualLogging7 from "./../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/network/components/RequestTrustTokensView.css.js
var RequestTrustTokensView_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
.code {
  font-family: var(--monospace-font-family);
  font-size: var(--monospace-font-size);
}

.issuers-list {
  display: flex;
  flex-direction: column;
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.status-icon {
  margin: 0 0.3em 2px 0;
  vertical-align: middle;
}

/*# sourceURL=${import.meta.resolve("./RequestTrustTokensView.css")} */`;

// gen/front_end/panels/network/components/RequestTrustTokensView.js
var { html: html7 } = Lit5;
var UIStrings6 = {
  /**
   * @description Section heading in the Trust Token tab
   */
  parameters: "Parameters",
  /**
   * @description Text that refers to some types
   */
  type: "Type",
  /**
   * @description Label for a Trust Token parameter
   */
  refreshPolicy: "Refresh policy",
  /**
   * @description Label for a list if origins in the Trust Token tab
   */
  issuers: "Issuers",
  /**
   * @description Label for a report field in the Network panel
   */
  topLevelOrigin: "Top level origin",
  /**
   * @description Text for the issuer of an item
   */
  issuer: "Issuer",
  /**
   * @description Heading of a report section in the Network panel
   */
  result: "Result",
  /**
   * @description Text for the status of something
   */
  status: "Status",
  /**
   * @description Label for a field in the Network panel
   */
  numberOfIssuedTokens: "Number of issued tokens",
  /**
   * @description Text for the success status in the Network panel. Refers to the outcome of a network
   * request which will either be 'Success' or 'Failure'.
   */
  success: "Success",
  /**
   * @description Text in the network panel for an error status
   */
  failure: "Failure",
  /**
   * @description Detailed text for a success status in the Network panel
   */
  theOperationsResultWasServedFrom: "The operations result was served from cache.",
  /**
   * @description Detailed text for a success status in the Network panel
   */
  theOperationWasFulfilledLocally: "The operation was fulfilled locally, no request was sent.",
  /**
   * @description Text for an error status in the Network panel
   */
  theKeysForThisPSTIssuerAreUnavailable: "The keys for this PST issuer are unavailable. The issuer may need to be registered via the Chrome registration process.",
  /**
   * @description Text for an error status in the Network panel
   */
  aClientprovidedArgumentWas: "A client-provided argument was malformed or otherwise invalid.",
  /**
   * @description Text for an error status in the Network panel
   */
  eitherNoInputsForThisOperation: "Either no inputs for this operation are available or the output exceeds the operations quota.",
  /**
   * @description Text for an error status in the Network panel
   */
  theServersResponseWasMalformedOr: "The servers response was malformed or otherwise invalid.",
  /**
   * @description Text for an error status in the Network panel
   */
  theOperationFailedForAnUnknown: "The operation failed for an unknown reason.",
  /**
   * @description Text for an error status in the Network panel
   */
  perSiteLimit: "Per-site issuer limit reached."
};
var str_6 = i18n11.i18n.registerUIStrings("panels/network/components/RequestTrustTokensView.ts", UIStrings6);
var i18nString6 = i18n11.i18n.getLocalizedString.bind(void 0, str_6);
var RequestTrustTokensView = class extends LegacyWrapper3.LegacyWrapper.WrappableComponent {
  #shadow = this.attachShadow({ mode: "open" });
  #request;
  constructor(request) {
    super();
    this.#request = request;
  }
  wasShown() {
    super.wasShown();
    this.#request.addEventListener(SDK4.NetworkRequest.Events.TRUST_TOKEN_RESULT_ADDED, this.render, this);
    void this.render();
  }
  willHide() {
    super.willHide();
    this.#request.removeEventListener(SDK4.NetworkRequest.Events.TRUST_TOKEN_RESULT_ADDED, this.render, this);
  }
  async render() {
    if (!this.#request) {
      throw new Error("Trying to render a Trust Token report without providing data");
    }
    Lit5.render(html7`
      <style>${RequestTrustTokensView_css_default}</style>
      <devtools-report>
        ${this.#renderParameterSection()}
        ${this.#renderResultSection()}
      </devtools-report>
    `, this.#shadow, { host: this });
  }
  #renderParameterSection() {
    const trustTokenParams = this.#request.trustTokenParams();
    if (!trustTokenParams) {
      return Lit5.nothing;
    }
    return html7`
      <devtools-report-section-header jslog=${VisualLogging7.pane("trust-tokens").track({
      resize: true
    })}>${i18nString6(UIStrings6.parameters)}</devtools-report-section-header>
      ${renderRowWithCodeValue(i18nString6(UIStrings6.type), trustTokenParams.operation.toString())}
      ${this.#renderRefreshPolicy(trustTokenParams)}
      ${this.#renderIssuers(trustTokenParams)}
      ${this.#renderIssuerAndTopLevelOriginFromResult()}
      <devtools-report-divider></devtools-report-divider>
    `;
  }
  #renderRefreshPolicy(params) {
    if (params.operation !== "Redemption") {
      return Lit5.nothing;
    }
    return renderRowWithCodeValue(i18nString6(UIStrings6.refreshPolicy), params.refreshPolicy.toString());
  }
  #renderIssuers(params) {
    if (!params.issuers || params.issuers.length === 0) {
      return Lit5.nothing;
    }
    return html7`
      <devtools-report-key>${i18nString6(UIStrings6.issuers)}</devtools-report-key>
      <devtools-report-value>
        <ul class="issuers-list">
          ${params.issuers.map((issuer) => html7`<li>${issuer}</li>`)}
        </ul>
      </devtools-report-value>
    `;
  }
  // The issuer and top level origin are technically parameters but reported in the
  // result structure due to the timing when they are calculated in the backend.
  // Nonetheless, we show them as part of the parameter section.
  #renderIssuerAndTopLevelOriginFromResult() {
    const trustTokenResult = this.#request.trustTokenOperationDoneEvent();
    if (!trustTokenResult) {
      return Lit5.nothing;
    }
    return html7`
      ${renderSimpleRowIfValuePresent(i18nString6(UIStrings6.topLevelOrigin), trustTokenResult.topLevelOrigin)}
      ${renderSimpleRowIfValuePresent(i18nString6(UIStrings6.issuer), trustTokenResult.issuerOrigin)}`;
  }
  #renderResultSection() {
    const trustTokenResult = this.#request.trustTokenOperationDoneEvent();
    if (!trustTokenResult) {
      return Lit5.nothing;
    }
    return html7`
      <devtools-report-section-header>${i18nString6(UIStrings6.result)}</devtools-report-section-header>
      <devtools-report-key>${i18nString6(UIStrings6.status)}</devtools-report-key>
      <devtools-report-value>
        <span>
          <devtools-icon class="status-icon medium"
            .data=${getIconForStatusCode(trustTokenResult.status)}>
          </devtools-icon>
          <strong>${getSimplifiedStatusTextForStatusCode(trustTokenResult.status)}</strong>
          ${getDetailedTextForStatusCode(trustTokenResult.status)}
        </span>
      </devtools-report-value>
      ${this.#renderIssuedTokenCount(trustTokenResult)}
      <devtools-report-divider></devtools-report-divider>
      `;
  }
  #renderIssuedTokenCount(result) {
    if (result.type !== "Issuance") {
      return Lit5.nothing;
    }
    return renderSimpleRowIfValuePresent(i18nString6(UIStrings6.numberOfIssuedTokens), result.issuedTokenCount);
  }
};
var SUCCESS_ICON_DATA = {
  color: "var(--icon-checkmark-green)",
  iconName: "check-circle"
};
var FAILURE_ICON_DATA = {
  color: "var(--icon-error)",
  iconName: "cross-circle-filled"
};
function statusConsideredSuccess(status) {
  return status === "Ok" || status === "AlreadyExists" || status === "FulfilledLocally";
}
function getIconForStatusCode(status) {
  return statusConsideredSuccess(status) ? SUCCESS_ICON_DATA : FAILURE_ICON_DATA;
}
function getSimplifiedStatusTextForStatusCode(status) {
  return statusConsideredSuccess(status) ? i18nString6(UIStrings6.success) : i18nString6(UIStrings6.failure);
}
function getDetailedTextForStatusCode(status) {
  switch (status) {
    case "Ok":
      return null;
    case "AlreadyExists":
      return i18nString6(UIStrings6.theOperationsResultWasServedFrom);
    case "FulfilledLocally":
      return i18nString6(UIStrings6.theOperationWasFulfilledLocally);
    case "InvalidArgument":
      return i18nString6(UIStrings6.aClientprovidedArgumentWas);
    case "ResourceExhausted":
      return i18nString6(UIStrings6.eitherNoInputsForThisOperation);
    case "BadResponse":
      return i18nString6(UIStrings6.theServersResponseWasMalformedOr);
    case "MissingIssuerKeys":
      return i18nString6(UIStrings6.theKeysForThisPSTIssuerAreUnavailable);
    case "FailedPrecondition":
    case "ResourceLimited":
    case "InternalError":
    case "Unauthorized":
    case "UnknownError":
      return i18nString6(UIStrings6.theOperationFailedForAnUnknown);
    case "SiteIssuerLimit":
      return i18nString6(UIStrings6.perSiteLimit);
  }
}
function renderSimpleRowIfValuePresent(key, value2) {
  if (value2 === void 0) {
    return Lit5.nothing;
  }
  return html7`
    <devtools-report-key>${key}</devtools-report-key>
    <devtools-report-value>${value2}</devtools-report-value>
  `;
}
function renderRowWithCodeValue(key, value2) {
  return html7`
    <devtools-report-key>${key}</devtools-report-key>
    <devtools-report-value class="code">${value2}</devtools-report-value>
  `;
}
customElements.define("devtools-trust-token-report", RequestTrustTokensView);
export {
  DirectSocketConnectionView_exports as DirectSocketConnectionView,
  EditableSpan_exports as EditableSpan,
  HeaderSectionRow_exports as HeaderSectionRow,
  RequestHeaderSection_exports as RequestHeaderSection,
  RequestHeadersView_exports as RequestHeadersView,
  RequestTrustTokensView_exports as RequestTrustTokensView,
  ResponseHeaderSection_exports as ResponseHeaderSection
};
//# sourceMappingURL=components.js.map
