var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/components/request_link_icon/RequestLinkIcon.js
var RequestLinkIcon_exports = {};
__export(RequestLinkIcon_exports, {
  RequestLinkIcon: () => RequestLinkIcon,
  extractShortPath: () => extractShortPath
});
import "./../icon_button/icon_button.js";
import * as Common from "./../../../core/common/common.js";
import * as i18n from "./../../../core/i18n/i18n.js";
import * as NetworkForward from "./../../../panels/network/forward/forward.js";
import * as RenderCoordinator from "./../render_coordinator/render_coordinator.js";
import * as Lit from "./../../lit/lit.js";
import * as VisualLogging from "./../../visual_logging/visual_logging.js";

// gen/front_end/ui/components/request_link_icon/requestLinkIcon.css.js
var requestLinkIcon_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  display: inline-block;
  white-space: nowrap;
  color: inherit;
  font-size: inherit;
  font-family: inherit;
}

:host([hidden]) {
  display: none;
}

button {
  border: none;
  background: transparent;
  margin: 0;
  padding: 0;
  font-family: inherit;
  font-size: inherit;
  color: inherit;

  &.link {
    cursor: pointer;

    & > span {
      color: var(--sys-color-primary);
    }
  }
}

devtools-icon {
  width: 16px;
  height: 16px;
  vertical-align: middle;
  color: var(--icon-no-request);

  .link > & {
    color: var(--icon-link);
  }
}

@media (forced-colors: active) {
  devtools-icon {
    color: ButtonText;
  }
}

/*# sourceURL=${import.meta.resolve("./requestLinkIcon.css")} */`;

// gen/front_end/ui/components/request_link_icon/RequestLinkIcon.js
var { html } = Lit;
var UIStrings = {
  /**
   * @description Title for a link to show a request in the network panel
   * @example {https://example.org/index.html} url
   */
  clickToShowRequestInTheNetwork: "Click to open the network panel and show request for URL: {url}",
  /**
   * @description Title for an link to show a request that is unavailable because the request couldn't be resolved
   */
  requestUnavailableInTheNetwork: "Request unavailable in the network panel, try reloading the inspected page",
  /**
   * @description Label for the shortened URL displayed in a link to show a request in the network panel
   */
  shortenedURL: "Shortened URL"
};
var str_ = i18n.i18n.registerUIStrings("ui/components/request_link_icon/RequestLinkIcon.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var extractShortPath = (path) => {
  return (/[^/]+$/.exec(path) || /[^/]+\/$/.exec(path) || [""])[0];
};
var RequestLinkIcon = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #linkToPreflight;
  // The value `null` indicates that the request is not available,
  // `undefined` that it is still being resolved.
  #request;
  #highlightHeader;
  #requestResolver;
  #displayURL = false;
  #urlToDisplay;
  #networkTab;
  #affectedRequest;
  #additionalOnClickAction;
  #reveal = Common.Revealer.reveal;
  set data(data) {
    this.#linkToPreflight = data.linkToPreflight;
    this.#request = data.request;
    if (data.affectedRequest) {
      this.#affectedRequest = { ...data.affectedRequest };
    }
    this.#highlightHeader = data.highlightHeader;
    this.#networkTab = data.networkTab;
    this.#requestResolver = data.requestResolver;
    this.#displayURL = data.displayURL ?? false;
    this.#urlToDisplay = data.urlToDisplay;
    this.#additionalOnClickAction = data.additionalOnClickAction;
    if (data.revealOverride) {
      this.#reveal = data.revealOverride;
    }
    if (!this.#request && typeof data.affectedRequest?.requestId !== "undefined") {
      if (!this.#requestResolver) {
        throw new Error("A `RequestResolver` must be provided if an `affectedRequest` is provided.");
      }
      this.#requestResolver.waitFor(data.affectedRequest.requestId).then((request) => {
        this.#request = request;
        return this.#render();
      }).catch(() => {
        this.#request = null;
      });
    }
    void this.#render();
  }
  get data() {
    return {
      linkToPreflight: this.#linkToPreflight,
      request: this.#request,
      affectedRequest: this.#affectedRequest,
      highlightHeader: this.#highlightHeader,
      networkTab: this.#networkTab,
      requestResolver: this.#requestResolver,
      displayURL: this.#displayURL,
      urlToDisplay: this.#urlToDisplay,
      additionalOnClickAction: this.#additionalOnClickAction,
      revealOverride: this.#reveal !== Common.Revealer.reveal ? this.#reveal : void 0
    };
  }
  handleClick(event) {
    if (event.button !== 0) {
      return;
    }
    const linkedRequest = this.#linkToPreflight ? this.#request?.preflightRequest() : this.#request;
    if (!linkedRequest) {
      return;
    }
    if (this.#highlightHeader) {
      const requestLocation = NetworkForward.UIRequestLocation.UIRequestLocation.header(linkedRequest, this.#highlightHeader.section, this.#highlightHeader.name);
      void this.#reveal(requestLocation);
    } else {
      const requestLocation = NetworkForward.UIRequestLocation.UIRequestLocation.tab(
        linkedRequest,
        this.#networkTab ?? "headers-component"
        /* NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT */
      );
      void this.#reveal(requestLocation);
    }
    this.#additionalOnClickAction?.();
    event.consume();
  }
  #getTooltip() {
    if (this.#request) {
      return i18nString(UIStrings.clickToShowRequestInTheNetwork, { url: this.#request.url() });
    }
    return i18nString(UIStrings.requestUnavailableInTheNetwork);
  }
  #getUrlForDisplaying() {
    if (!this.#displayURL) {
      return void 0;
    }
    if (this.#request) {
      return this.#request.url();
    }
    return this.#affectedRequest?.url;
  }
  #maybeRenderURL() {
    const url = this.#getUrlForDisplaying();
    if (!url) {
      return Lit.nothing;
    }
    if (this.#urlToDisplay) {
      return html`<span title=${url}>${this.#urlToDisplay}</span>`;
    }
    const filename = extractShortPath(url);
    return html`<span aria-label=${i18nString(UIStrings.shortenedURL)} title=${url}>${filename}</span>`;
  }
  async #render() {
    return await RenderCoordinator.write(() => {
      let template = this.#maybeRenderURL();
      if (this.#request || this.#affectedRequest?.requestId !== void 0) {
        template = html`
          <button class=${Lit.Directives.classMap({ link: Boolean(this.#request) })}
                  title=${this.#getTooltip()}
                  jslog=${VisualLogging.link("request").track({ click: true })}
                  @click=${this.handleClick}>
            <devtools-icon name="arrow-up-down-circle"></devtools-icon>
            ${template}
          </button>`;
      }
      Lit.render(html`<style>${requestLinkIcon_css_default}</style>${template}`, this.#shadow, { host: this });
    });
  }
};
customElements.define("devtools-request-link-icon", RequestLinkIcon);
export {
  RequestLinkIcon_exports as RequestLinkIcon
};
//# sourceMappingURL=request_link_icon.js.map
