import{AsyncDirective as n}from"../async-directive.js";
import{clearPart as s,insertPart as r,setChildPartValue as o}from"../directive-helpers.js";
import{directive as e,PartType as i}from"../directive.js";
import{noChange as t}from"../lit-html.js";

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const c=e(class extends n{constructor(t){if(super(t),t.type!==i.CHILD)throw Error("asyncAppend can only be used in child expressions")}render(e,i){return t}update(e,[i,s]){if(i!==this.vt)return this.vt=i,this.Σft(e,s),t}async Σft(t,e){let i=0;const{vt:n}=this;for await(let c of n){if(this.vt!==n)break;this.wt&&await this.wt,0===i&&s(t),void 0!==e&&(c=e(c,i));const h=r(t);o(h,c),i++}}disconnected(){this.wt=new Promise((t=>this.yt=t))}reconnected(){this.wt=void 0,this.yt()}});export{c as asyncAppend};
//# sourceMappingURL=async-append.js.map
