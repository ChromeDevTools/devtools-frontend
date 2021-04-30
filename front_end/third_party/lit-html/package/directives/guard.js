import{directive as t,Directive as s}from"../directive.js";
import{noChange as r}from"../lit-html.js";

/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const e={},i=t(class extends s{constructor(){super(...arguments),this.$t=e}render(r,t){return t()}update(t,[s,e]){if(Array.isArray(s)){if(Array.isArray(this.$t)&&this.$t.length===s.length&&s.every(((r,t)=>r===this.$t[t])))return r}else if(this.$t===s)return r;return this.$t=Array.isArray(s)?Array.from(s):s,this.render(s,e)}});export{i as guard};
//# sourceMappingURL=guard.js.map
