import{AsyncDirective as e}from"../async-directive.js";
import{directive as i}from"../directive.js";
import{noChange as t}from"../lit-html.js";

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const s=i(class extends e{render(i,e){return t}update(i,[e,s]){if(e!==this.vt)return this.vt=e,this.Σft(s),t}async Σft(t){let i=0;const{vt:e}=this;for await(let s of e){if(this.vt!==e)break;this.wt&&await this.wt,void 0!==t&&(s=t(s,i)),this.setValue(s),i++}}disconnected(){this.wt=new Promise((t=>this.yt=t))}reconnected(){this.wt=void 0,this.yt()}});export{s as asyncReplace};
//# sourceMappingURL=async-replace.js.map
