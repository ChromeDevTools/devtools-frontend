import{directive as r,Directive as e,PartType as n}from"../directive.js";
import{noChange as t}from"../lit-html.js";

/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const o=r(class extends e{constructor(t){if(super(t),t.type!==n.CHILD)throw Error("templateContent can only be used in child bindings")}render(r){return this.kt===r?t:(this.kt=r,document.importNode(r.content,!0))}});export{o as templateContent};
//# sourceMappingURL=template-content.js.map
