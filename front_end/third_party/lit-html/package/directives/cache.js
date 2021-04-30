import{clearPart as c,getCommittedValue as r,insertPart as n,isTemplateResult as o,setCommittedValue as h}from"../directive-helpers.js";
import{directive as s,Directive as e}from"../directive.js";
import{nothing as i,render as t}from"../lit-html.js";

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const d=s(class extends e{constructor(t){super(t),this._t=new WeakMap}render(t){return[t]}update(s,[e]){if(o(this.vt)&&(!o(e)||this.vt.strings!==e.strings)){const e=r(s).pop();let o=this._t.get(this.vt.strings);if(void 0===o){const s=document.createDocumentFragment();o=t(i,s),this._t.set(this.vt.strings,o)}h(o,[e]),n(o,void 0,e),e.setConnected(!1)}if(o(e)){if(!o(this.vt)||this.vt.strings!==e.strings){const t=this._t.get(e.strings);if(void 0!==t){const i=r(t).pop();c(s),n(s,void 0,i),h(s,[i]),i.setConnected(!0)}}this.vt=e}else this.vt=void 0;return this.render(e)}});export{d as cache};
//# sourceMappingURL=cache.js.map
