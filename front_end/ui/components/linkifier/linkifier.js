var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/components/linkifier/LinkifierImpl.js
var LinkifierImpl_exports = {};
__export(LinkifierImpl_exports, {
  Linkifier: () => Linkifier,
  LinkifierClick: () => LinkifierClick
});
import * as Platform from "./../../../core/platform/platform.js";
import * as Lit from "./../../lit/lit.js";
import * as RenderCoordinator from "./../render_coordinator/render_coordinator.js";

// gen/front_end/ui/components/linkifier/linkifierImpl.css.js
var linkifierImpl_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.link:link,
.link:visited {
  color: var(--sys-color-primary);
  text-decoration: underline;
  cursor: pointer;
  outline-offset: 2px;
}

/*# sourceURL=${import.meta.resolve("./linkifierImpl.css")} */`;

// gen/front_end/ui/components/linkifier/LinkifierUtils.js
import * as Bindings from "./../../../models/bindings/bindings.js";
function linkText(url, lineNumber) {
  if (url) {
    const displayName = Bindings.ResourceUtils.displayNameForURL(url);
    let text = `${displayName}`;
    if (typeof lineNumber !== "undefined") {
      text += `:${lineNumber + 1}`;
    }
    return text;
  }
  throw new Error("New linkifier component error: don't know how to generate link text for given arguments");
}

// gen/front_end/ui/components/linkifier/LinkifierImpl.js
var { html } = Lit;
var LinkifierClick = class _LinkifierClick extends Event {
  data;
  static eventName = "linkifieractivated";
  constructor(data) {
    super(_LinkifierClick.eventName, {
      bubbles: true,
      composed: true
    });
    this.data = data;
    this.data = data;
  }
};
var Linkifier = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #url = Platform.DevToolsPath.EmptyUrlString;
  #lineNumber;
  #columnNumber;
  #linkText;
  #title;
  set data(data) {
    this.#url = data.url;
    this.#lineNumber = data.lineNumber;
    this.#columnNumber = data.columnNumber;
    this.#linkText = data.linkText;
    this.#title = data.title;
    if (!this.#url) {
      throw new Error("Cannot construct a Linkifier without providing a valid string URL.");
    }
    void this.#render();
  }
  cloneNode(deep) {
    const node = super.cloneNode(deep);
    node.data = {
      url: this.#url,
      lineNumber: this.#lineNumber,
      columnNumber: this.#columnNumber,
      linkText: this.#linkText,
      title: this.#title
    };
    return node;
  }
  #onLinkActivation(event) {
    event.preventDefault();
    const linkifierClickEvent = new LinkifierClick({
      url: this.#url,
      lineNumber: this.#lineNumber,
      columnNumber: this.#columnNumber
    });
    this.dispatchEvent(linkifierClickEvent);
  }
  async #render() {
    const linkText2 = this.#linkText ?? linkText(this.#url, this.#lineNumber);
    await RenderCoordinator.write(() => {
      Lit.render(html`
        <style>${linkifierImpl_css_default}</style>
        <a class="link" href=${this.#url} @click=${this.#onLinkActivation} title=${Lit.Directives.ifDefined(this.#title)}>
          <slot>${linkText2}</slot>
        </a>`, this.#shadow, { host: this });
    });
  }
};
customElements.define("devtools-linkifier", Linkifier);
export {
  LinkifierImpl_exports as Linkifier
};
//# sourceMappingURL=linkifier.js.map
