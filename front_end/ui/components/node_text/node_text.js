var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/components/node_text/NodeText.js
var NodeText_exports = {};
__export(NodeText_exports, {
  NodeText: () => NodeText
});
import * as Lit from "./../../lit/lit.js";

// gen/front_end/ui/components/node_text/nodeText.css.js
var nodeText_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/* See: https://crbug.com/1227651 for details on changing these to --override pattern. */

.node-label-name {
  color: var(--override-node-text-label-color, var(--sys-color-token-tag));
}

.node-label-class {
  color: var(--override-node-text-class-color, var(--sys-color-token-attribute));
}

.node-label-id {
  color: var(--override-node-text-id-color, var(--sys-color-token-attribute));
}

.node-label-class.node-multiple-descriptors {
  color: var(--override-node-text-multiple-descriptors-class, var(--override-node-text-class-color, var(--sys-color-token-attribute)));
}

.node-label-id.node-multiple-descriptors {
  color: var(--override-node-text-multiple-descriptors-id, var(--override-node-text-id-color, var(--sys-color-token-attribute)));
}

/*# sourceURL=${import.meta.resolve("./nodeText.css")} */`;

// gen/front_end/ui/components/node_text/NodeText.js
var { render, html } = Lit;
var NodeText = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #nodeTitle = "";
  #nodeId = "";
  #nodeClasses = [];
  set data(data) {
    this.#nodeTitle = data.nodeTitle;
    this.#nodeId = data.nodeId;
    this.#nodeClasses = data.nodeClasses;
    this.#render();
  }
  #render() {
    const hasId = Boolean(this.#nodeId);
    const hasNodeClasses = Boolean(this.#nodeClasses && this.#nodeClasses.length > 0);
    const parts = [
      html`<span class="node-label-name">${this.#nodeTitle}</span>`
    ];
    if (this.#nodeId) {
      const classes = Lit.Directives.classMap({
        "node-label-id": true,
        "node-multiple-descriptors": hasNodeClasses
      });
      parts.push(html`<span class=${classes}>#${CSS.escape(this.#nodeId)}</span>`);
    }
    if (this.#nodeClasses && this.#nodeClasses.length > 0) {
      const text = this.#nodeClasses.map((c) => `.${CSS.escape(c)}`).join("");
      const classes = Lit.Directives.classMap({
        "node-label-class": true,
        "node-multiple-descriptors": hasId
      });
      parts.push(html`<span class=${classes}>${text}</span>`);
    }
    render(html`
      <style>${nodeText_css_default}</style>
      ${parts}
    `, this.#shadow, {
      host: this
    });
  }
};
customElements.define("devtools-node-text", NodeText);
export {
  NodeText_exports as NodeText
};
//# sourceMappingURL=node_text.js.map
