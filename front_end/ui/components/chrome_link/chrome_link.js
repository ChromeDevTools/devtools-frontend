var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/components/chrome_link/ChromeLink.js
var ChromeLink_exports = {};
__export(ChromeLink_exports, {
  ChromeLink: () => ChromeLink
});
import * as Common from "./../../../core/common/common.js";
import * as Host from "./../../../core/host/host.js";
import * as Platform from "./../../../core/platform/platform.js";
import * as SDK from "./../../../core/sdk/sdk.js";
import { html, render } from "./../../lit/lit.js";
import * as VisualLogging from "./../../visual_logging/visual_logging.js";
import * as ComponentHelpers from "./../helpers/helpers.js";

// gen/front_end/ui/components/chrome_link/chromeLink.css.js
var chromeLink_css_default = `/*
 * Copyright 2022 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.link {
  color: var(--sys-color-primary);
  text-decoration: underline;
  cursor: pointer;
  outline-offset: 2px;
}

/*# sourceURL=${import.meta.resolve("./chromeLink.css")} */`;

// gen/front_end/ui/components/chrome_link/ChromeLink.js
var ChromeLink = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #href = "";
  connectedCallback() {
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }
  set href(href) {
    if (!Common.ParsedURL.schemeIs(href, "chrome:")) {
      throw new Error("ChromeLink href needs to start with 'chrome://'");
    }
    this.#href = href;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }
  // Navigating to a chrome:// link via a normal anchor doesn't work, so we "navigate"
  // there using CDP.
  #handleClick(event) {
    const rootTarget = SDK.TargetManager.TargetManager.instance().rootTarget();
    if (rootTarget === null) {
      return;
    }
    const url = this.#href;
    void rootTarget.targetAgent().invoke_createTarget({ url }).then((result) => {
      if (result.getError()) {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(url);
      }
    });
    event.consume(true);
  }
  #render() {
    const urlForContext = new URL(this.#href);
    urlForContext.search = "";
    const jslogContext = Platform.StringUtilities.toKebabCase(urlForContext.toString());
    render(
      /* x-link doesn't work with custom click/keydown handlers */
      /* eslint-disable @devtools/no-a-tags-in-lit */
      html`
        <style>${chromeLink_css_default}</style>
        <a href=${this.#href} class="link" target="_blank"
          jslog=${VisualLogging.link().track({ click: true }).context(jslogContext)}
          @click=${this.#handleClick}><slot></slot></a>
      `,
      this.#shadow,
      { host: this }
    );
  }
};
customElements.define("devtools-chrome-link", ChromeLink);
export {
  ChromeLink_exports as ChromeLink
};
//# sourceMappingURL=chrome_link.js.map
