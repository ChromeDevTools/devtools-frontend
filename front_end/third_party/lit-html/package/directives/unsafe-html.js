import{Directive as r,directive as e,PartType as s}from"../directive.js";
import{noChange as i,nothing as t}from"../lit-html.js";

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class n extends r{constructor(i){if(super(i),this.vt=t,i.type!==s.CHILD)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(r){if(r===t)return this.Vt=void 0,this.vt=r;if(r===i)return r;if("string"!=typeof r)throw Error(this.constructor.directiveName+"() called with a non-string value");if(r===this.vt)return this.Vt;this.vt=r;const s=[r];return s.raw=s,this.Vt={_$litType$:this.constructor.resultType,strings:s,values:[]}}}n.directiveName="unsafeHTML",n.resultType=1;const o=e(n);export{n as UnsafeHTMLDirective,o as unsafeHTML};
//# sourceMappingURL=unsafe-html.js.map
