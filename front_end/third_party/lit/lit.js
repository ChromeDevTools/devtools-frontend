var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/third_party/lit/lib/lit.js
var t = globalThis;
var e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = Symbol();
var i = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t7, e7, i6) {
    if (this._$cssResult$ = true, i6 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t7, this.t = e7;
  }
  get styleSheet() {
    let t7 = this.o;
    const s6 = this.t;
    if (e && void 0 === t7) {
      const e7 = void 0 !== s6 && 1 === s6.length;
      e7 && (t7 = i.get(s6)), void 0 === t7 && ((this.o = t7 = new CSSStyleSheet()).replaceSync(this.cssText), e7 && i.set(s6, t7));
    }
    return t7;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t7) => new n("string" == typeof t7 ? t7 : t7 + "", void 0, s);
var o = (t7, ...e7) => {
  const i6 = 1 === t7.length ? t7[0] : e7.reduce((e8, s6, i7) => e8 + ((t8) => {
    if (true === t8._$cssResult$) return t8.cssText;
    if ("number" == typeof t8) return t8;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t8 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s6) + t7[i7 + 1], t7[0]);
  return new n(i6, t7, s);
};
var h = (s6, i6) => {
  if (e) s6.adoptedStyleSheets = i6.map((t7) => t7 instanceof CSSStyleSheet ? t7 : t7.styleSheet);
  else for (const e7 of i6) {
    const i7 = document.createElement("style"), n6 = t.litNonce;
    void 0 !== n6 && i7.setAttribute("nonce", n6), i7.textContent = e7.cssText, s6.appendChild(i7);
  }
};
var a = e ? (t7) => t7 : (t7) => t7 instanceof CSSStyleSheet ? ((t8) => {
  let e7 = "";
  for (const s6 of t8.cssRules) e7 += s6.cssText;
  return r(e7);
})(t7) : t7;
var { is: l, defineProperty: c, getOwnPropertyDescriptor: d, getOwnPropertyNames: p, getOwnPropertySymbols: u, getPrototypeOf: $ } = Object;
var _ = globalThis;
var f = _.trustedTypes;
var A = f ? f.emptyScript : "";
var m = _.reactiveElementPolyfillSupport;
var g = (t7, e7) => t7;
var y = { toAttribute(t7, e7) {
  switch (e7) {
    case Boolean:
      t7 = t7 ? A : null;
      break;
    case Object:
    case Array:
      t7 = null == t7 ? t7 : JSON.stringify(t7);
  }
  return t7;
}, fromAttribute(t7, e7) {
  let s6 = t7;
  switch (e7) {
    case Boolean:
      s6 = null !== t7;
      break;
    case Number:
      s6 = null === t7 ? null : Number(t7);
      break;
    case Object:
    case Array:
      try {
        s6 = JSON.parse(t7);
      } catch (t8) {
        s6 = null;
      }
  }
  return s6;
} };
var v = (t7, e7) => !l(t7, e7);
var E = { attribute: true, type: String, converter: y, reflect: false, useDefault: false, hasChanged: v };
Symbol.metadata ??= Symbol("metadata"), _.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var S = class extends HTMLElement {
  static addInitializer(t7) {
    this._$Ei(), (this.l ??= []).push(t7);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t7, e7 = E) {
    if (e7.state && (e7.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t7) && ((e7 = Object.create(e7)).wrapped = true), this.elementProperties.set(t7, e7), !e7.noAccessor) {
      const s6 = Symbol(), i6 = this.getPropertyDescriptor(t7, s6, e7);
      void 0 !== i6 && c(this.prototype, t7, i6);
    }
  }
  static getPropertyDescriptor(t7, e7, s6) {
    const { get: i6, set: n6 } = d(this.prototype, t7) ?? { get() {
      return this[e7];
    }, set(t8) {
      this[e7] = t8;
    } };
    return { get: i6, set(e8) {
      const r7 = i6?.call(this);
      n6?.call(this, e8), this.requestUpdate(t7, r7, s6);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t7) {
    return this.elementProperties.get(t7) ?? E;
  }
  static _$Ei() {
    if (this.hasOwnProperty(g("elementProperties"))) return;
    const t7 = $(this);
    t7.finalize(), void 0 !== t7.l && (this.l = [...t7.l]), this.elementProperties = new Map(t7.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(g("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(g("properties"))) {
      const t8 = this.properties, e7 = [...p(t8), ...u(t8)];
      for (const s6 of e7) this.createProperty(s6, t8[s6]);
    }
    const t7 = this[Symbol.metadata];
    if (null !== t7) {
      const e7 = litPropertyMetadata.get(t7);
      if (void 0 !== e7) for (const [t8, s6] of e7) this.elementProperties.set(t8, s6);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t8, e7] of this.elementProperties) {
      const s6 = this._$Eu(t8, e7);
      void 0 !== s6 && this._$Eh.set(s6, t8);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(t7) {
    const e7 = [];
    if (Array.isArray(t7)) {
      const s6 = new Set(t7.flat(1 / 0).reverse());
      for (const t8 of s6) e7.unshift(a(t8));
    } else void 0 !== t7 && e7.push(a(t7));
    return e7;
  }
  static _$Eu(t7, e7) {
    const s6 = e7.attribute;
    return false === s6 ? void 0 : "string" == typeof s6 ? s6 : "string" == typeof t7 ? t7.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t7) => this.enableUpdating = t7), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t7) => t7(this));
  }
  addController(t7) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t7), void 0 !== this.renderRoot && this.isConnected && t7.hostConnected?.();
  }
  removeController(t7) {
    this._$EO?.delete(t7);
  }
  _$E_() {
    const t7 = /* @__PURE__ */ new Map(), e7 = this.constructor.elementProperties;
    for (const s6 of e7.keys()) this.hasOwnProperty(s6) && (t7.set(s6, this[s6]), delete this[s6]);
    t7.size > 0 && (this._$Ep = t7);
  }
  createRenderRoot() {
    const t7 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return h(t7, this.constructor.elementStyles), t7;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t7) => t7.hostConnected?.());
  }
  enableUpdating(t7) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t7) => t7.hostDisconnected?.());
  }
  attributeChangedCallback(t7, e7, s6) {
    this._$AK(t7, s6);
  }
  _$ET(t7, e7) {
    const s6 = this.constructor.elementProperties.get(t7), i6 = this.constructor._$Eu(t7, s6);
    if (void 0 !== i6 && true === s6.reflect) {
      const n6 = (void 0 !== s6.converter?.toAttribute ? s6.converter : y).toAttribute(e7, s6.type);
      this._$Em = t7, null == n6 ? this.removeAttribute(i6) : this.setAttribute(i6, n6), this._$Em = null;
    }
  }
  _$AK(t7, e7) {
    const s6 = this.constructor, i6 = s6._$Eh.get(t7);
    if (void 0 !== i6 && this._$Em !== i6) {
      const t8 = s6.getPropertyOptions(i6), n6 = "function" == typeof t8.converter ? { fromAttribute: t8.converter } : void 0 !== t8.converter?.fromAttribute ? t8.converter : y;
      this._$Em = i6;
      const r7 = n6.fromAttribute(e7, t8.type);
      this[i6] = r7 ?? this._$Ej?.get(i6) ?? r7, this._$Em = null;
    }
  }
  requestUpdate(t7, e7, s6, i6 = false, n6) {
    if (void 0 !== t7) {
      const r7 = this.constructor;
      if (false === i6 && (n6 = this[t7]), s6 ??= r7.getPropertyOptions(t7), !((s6.hasChanged ?? v)(n6, e7) || s6.useDefault && s6.reflect && n6 === this._$Ej?.get(t7) && !this.hasAttribute(r7._$Eu(t7, s6)))) return;
      this.C(t7, e7, s6);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t7, e7, { useDefault: s6, reflect: i6, wrapped: n6 }, r7) {
    s6 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t7) && (this._$Ej.set(t7, r7 ?? e7 ?? this[t7]), true !== n6 || void 0 !== r7) || (this._$AL.has(t7) || (this.hasUpdated || s6 || (e7 = void 0), this._$AL.set(t7, e7)), true === i6 && this._$Em !== t7 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t7));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t8) {
      Promise.reject(t8);
    }
    const t7 = this.scheduleUpdate();
    return null != t7 && await t7, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t9, e8] of this._$Ep) this[t9] = e8;
        this._$Ep = void 0;
      }
      const t8 = this.constructor.elementProperties;
      if (t8.size > 0) for (const [e8, s6] of t8) {
        const { wrapped: t9 } = s6, i6 = this[e8];
        true !== t9 || this._$AL.has(e8) || void 0 === i6 || this.C(e8, void 0, s6, i6);
      }
    }
    let t7 = false;
    const e7 = this._$AL;
    try {
      t7 = this.shouldUpdate(e7), t7 ? (this.willUpdate(e7), this._$EO?.forEach((t8) => t8.hostUpdate?.()), this.update(e7)) : this._$EM();
    } catch (e8) {
      throw t7 = false, this._$EM(), e8;
    }
    t7 && this._$AE(e7);
  }
  willUpdate(t7) {
  }
  _$AE(t7) {
    this._$EO?.forEach((t8) => t8.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t7)), this.updated(t7);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = false;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t7) {
    return true;
  }
  update(t7) {
    this._$Eq &&= this._$Eq.forEach((t8) => this._$ET(t8, this[t8])), this._$EM();
  }
  updated(t7) {
  }
  firstUpdated(t7) {
  }
};
S.elementStyles = [], S.shadowRootOptions = { mode: "open" }, S[g("elementProperties")] = /* @__PURE__ */ new Map(), S[g("finalized")] = /* @__PURE__ */ new Map(), m?.({ ReactiveElement: S }), (_.reactiveElementVersions ??= []).push("2.1.2");
var b = globalThis;
var C = (t7) => t7;
var w = b.trustedTypes;
var P = w ? w.createPolicy("lit-html", { createHTML: (t7) => t7 }) : void 0;
var U = "$lit$";
var x = `lit$${Math.random().toFixed(9).slice(2)}$`;
var H = "?" + x;
var O = `<${H}>`;
var M = document;
var N = () => M.createComment("");
var R = (t7) => null === t7 || "object" != typeof t7 && "function" != typeof t7;
var T = Array.isArray;
var L = (t7) => T(t7) || "function" == typeof t7?.[Symbol.iterator];
var k = "[ 	\n\f\r]";
var D = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var j = /-->/g;
var z = />/g;
var B = RegExp(`>|${k}(?:([^\\s"'>=/]+)(${k}*=${k}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var I = /'/g;
var V = /"/g;
var W = /^(?:script|style|textarea|title)$/i;
var q = (t7) => (e7, ...s6) => ({ _$litType$: t7, strings: e7, values: s6 });
var K = q(1);
var F = q(2);
var J = q(3);
var Z = Symbol.for("lit-noChange");
var G = Symbol.for("lit-nothing");
var Q = /* @__PURE__ */ new WeakMap();
var X = M.createTreeWalker(M, 129);
function Y(t7, e7) {
  if (!T(t7) || !t7.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== P ? P.createHTML(e7) : e7;
}
var tt = (t7, e7) => {
  const s6 = t7.length - 1, i6 = [];
  let n6, r7 = 2 === e7 ? "<svg>" : 3 === e7 ? "<math>" : "", o6 = D;
  for (let e8 = 0; e8 < s6; e8++) {
    const s7 = t7[e8];
    let h6, a6, l6 = -1, c6 = 0;
    for (; c6 < s7.length && (o6.lastIndex = c6, a6 = o6.exec(s7), null !== a6); ) c6 = o6.lastIndex, o6 === D ? "!--" === a6[1] ? o6 = j : void 0 !== a6[1] ? o6 = z : void 0 !== a6[2] ? (W.test(a6[2]) && (n6 = RegExp("</" + a6[2], "g")), o6 = B) : void 0 !== a6[3] && (o6 = B) : o6 === B ? ">" === a6[0] ? (o6 = n6 ?? D, l6 = -1) : void 0 === a6[1] ? l6 = -2 : (l6 = o6.lastIndex - a6[2].length, h6 = a6[1], o6 = void 0 === a6[3] ? B : '"' === a6[3] ? V : I) : o6 === V || o6 === I ? o6 = B : o6 === j || o6 === z ? o6 = D : (o6 = B, n6 = void 0);
    const d6 = o6 === B && t7[e8 + 1].startsWith("/>") ? " " : "";
    r7 += o6 === D ? s7 + O : l6 >= 0 ? (i6.push(h6), s7.slice(0, l6) + U + s7.slice(l6) + x + d6) : s7 + x + (-2 === l6 ? e8 : d6);
  }
  return [Y(t7, r7 + (t7[s6] || "<?>") + (2 === e7 ? "</svg>" : 3 === e7 ? "</math>" : "")), i6];
};
var et = class _et {
  constructor({ strings: t7, _$litType$: e7 }, s6) {
    let i6;
    this.parts = [];
    let n6 = 0, r7 = 0;
    const o6 = t7.length - 1, h6 = this.parts, [a6, l6] = tt(t7, e7);
    if (this.el = _et.createElement(a6, s6), X.currentNode = this.el.content, 2 === e7 || 3 === e7) {
      const t8 = this.el.content.firstChild;
      t8.replaceWith(...t8.childNodes);
    }
    for (; null !== (i6 = X.nextNode()) && h6.length < o6; ) {
      if (1 === i6.nodeType) {
        if (i6.hasAttributes()) for (const t8 of i6.getAttributeNames()) if (t8.endsWith(U)) {
          const e8 = l6[r7++], s7 = i6.getAttribute(t8).split(x), o7 = /([.?@])?(.*)/.exec(e8);
          h6.push({ type: 1, index: n6, name: o7[2], strings: s7, ctor: "." === o7[1] ? ot : "?" === o7[1] ? ht : "@" === o7[1] ? at : rt }), i6.removeAttribute(t8);
        } else t8.startsWith(x) && (h6.push({ type: 6, index: n6 }), i6.removeAttribute(t8));
        if (W.test(i6.tagName)) {
          const t8 = i6.textContent.split(x), e8 = t8.length - 1;
          if (e8 > 0) {
            i6.textContent = w ? w.emptyScript : "";
            for (let s7 = 0; s7 < e8; s7++) i6.append(t8[s7], N()), X.nextNode(), h6.push({ type: 2, index: ++n6 });
            i6.append(t8[e8], N());
          }
        }
      } else if (8 === i6.nodeType) if (i6.data === H) h6.push({ type: 2, index: n6 });
      else {
        let t8 = -1;
        for (; -1 !== (t8 = i6.data.indexOf(x, t8 + 1)); ) h6.push({ type: 7, index: n6 }), t8 += x.length - 1;
      }
      n6++;
    }
  }
  static createElement(t7, e7) {
    const s6 = M.createElement("template");
    return s6.innerHTML = t7, s6;
  }
};
function st(t7, e7, s6 = t7, i6) {
  if (e7 === Z) return e7;
  let n6 = void 0 !== i6 ? s6._$Co?.[i6] : s6._$Cl;
  const r7 = R(e7) ? void 0 : e7._$litDirective$;
  return n6?.constructor !== r7 && (n6?._$AO?.(false), void 0 === r7 ? n6 = void 0 : (n6 = new r7(t7), n6._$AT(t7, s6, i6)), void 0 !== i6 ? (s6._$Co ??= [])[i6] = n6 : s6._$Cl = n6), void 0 !== n6 && (e7 = st(t7, n6._$AS(t7, e7.values), n6, i6)), e7;
}
var it = class {
  constructor(t7, e7) {
    this._$AV = [], this._$AN = void 0, this._$AD = t7, this._$AM = e7;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t7) {
    const { el: { content: e7 }, parts: s6 } = this._$AD, i6 = (t7?.creationScope ?? M).importNode(e7, true);
    X.currentNode = i6;
    let n6 = X.nextNode(), r7 = 0, o6 = 0, h6 = s6[0];
    for (; void 0 !== h6; ) {
      if (r7 === h6.index) {
        let e8;
        2 === h6.type ? e8 = new nt(n6, n6.nextSibling, this, t7) : 1 === h6.type ? e8 = new h6.ctor(n6, h6.name, h6.strings, this, t7) : 6 === h6.type && (e8 = new lt(n6, this, t7)), this._$AV.push(e8), h6 = s6[++o6];
      }
      r7 !== h6?.index && (n6 = X.nextNode(), r7++);
    }
    return X.currentNode = M, i6;
  }
  p(t7) {
    let e7 = 0;
    for (const s6 of this._$AV) void 0 !== s6 && (void 0 !== s6.strings ? (s6._$AI(t7, s6, e7), e7 += s6.strings.length - 2) : s6._$AI(t7[e7])), e7++;
  }
};
var nt = class _nt {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t7, e7, s6, i6) {
    this.type = 2, this._$AH = G, this._$AN = void 0, this._$AA = t7, this._$AB = e7, this._$AM = s6, this.options = i6, this._$Cv = i6?.isConnected ?? true;
  }
  get parentNode() {
    let t7 = this._$AA.parentNode;
    const e7 = this._$AM;
    return void 0 !== e7 && 11 === t7?.nodeType && (t7 = e7.parentNode), t7;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t7, e7 = this) {
    t7 = st(this, t7, e7), R(t7) ? t7 === G || null == t7 || "" === t7 ? (this._$AH !== G && this._$AR(), this._$AH = G) : t7 !== this._$AH && t7 !== Z && this._(t7) : void 0 !== t7._$litType$ ? this.$(t7) : void 0 !== t7.nodeType ? this.T(t7) : L(t7) ? this.k(t7) : this._(t7);
  }
  O(t7) {
    return this._$AA.parentNode.insertBefore(t7, this._$AB);
  }
  T(t7) {
    this._$AH !== t7 && (this._$AR(), this._$AH = this.O(t7));
  }
  _(t7) {
    this._$AH !== G && R(this._$AH) ? this._$AA.nextSibling.data = t7 : this.T(M.createTextNode(t7)), this._$AH = t7;
  }
  $(t7) {
    const { values: e7, _$litType$: s6 } = t7, i6 = "number" == typeof s6 ? this._$AC(t7) : (void 0 === s6.el && (s6.el = et.createElement(Y(s6.h, s6.h[0]), this.options)), s6);
    if (this._$AH?._$AD === i6) this._$AH.p(e7);
    else {
      const t8 = new it(i6, this), s7 = t8.u(this.options);
      t8.p(e7), this.T(s7), this._$AH = t8;
    }
  }
  _$AC(t7) {
    let e7 = Q.get(t7.strings);
    return void 0 === e7 && Q.set(t7.strings, e7 = new et(t7)), e7;
  }
  k(t7) {
    T(this._$AH) || (this._$AH = [], this._$AR());
    const e7 = this._$AH;
    let s6, i6 = 0;
    for (const n6 of t7) i6 === e7.length ? e7.push(s6 = new _nt(this.O(N()), this.O(N()), this, this.options)) : s6 = e7[i6], s6._$AI(n6), i6++;
    i6 < e7.length && (this._$AR(s6 && s6._$AB.nextSibling, i6), e7.length = i6);
  }
  _$AR(t7 = this._$AA.nextSibling, e7) {
    for (this._$AP?.(false, true, e7); t7 !== this._$AB; ) {
      const e8 = C(t7).nextSibling;
      C(t7).remove(), t7 = e8;
    }
  }
  setConnected(t7) {
    void 0 === this._$AM && (this._$Cv = t7, this._$AP?.(t7));
  }
};
var rt = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t7, e7, s6, i6, n6) {
    this.type = 1, this._$AH = G, this._$AN = void 0, this.element = t7, this.name = e7, this._$AM = i6, this.options = n6, s6.length > 2 || "" !== s6[0] || "" !== s6[1] ? (this._$AH = Array(s6.length - 1).fill(new String()), this.strings = s6) : this._$AH = G;
  }
  _$AI(t7, e7 = this, s6, i6) {
    const n6 = this.strings;
    let r7 = false;
    if (void 0 === n6) t7 = st(this, t7, e7, 0), r7 = !R(t7) || t7 !== this._$AH && t7 !== Z, r7 && (this._$AH = t7);
    else {
      const i7 = t7;
      let o6, h6;
      for (t7 = n6[0], o6 = 0; o6 < n6.length - 1; o6++) h6 = st(this, i7[s6 + o6], e7, o6), h6 === Z && (h6 = this._$AH[o6]), r7 ||= !R(h6) || h6 !== this._$AH[o6], h6 === G ? t7 = G : t7 !== G && (t7 += (h6 ?? "") + n6[o6 + 1]), this._$AH[o6] = h6;
    }
    r7 && !i6 && this.j(t7);
  }
  j(t7) {
    t7 === G ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t7 ?? "");
  }
};
var ot = class extends rt {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t7) {
    this.element[this.name] = t7 === G ? void 0 : t7;
  }
};
var ht = class extends rt {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t7) {
    this.element.toggleAttribute(this.name, !!t7 && t7 !== G);
  }
};
var at = class extends rt {
  constructor(t7, e7, s6, i6, n6) {
    super(t7, e7, s6, i6, n6), this.type = 5;
  }
  _$AI(t7, e7 = this) {
    if ((t7 = st(this, t7, e7, 0) ?? G) === Z) return;
    const s6 = this._$AH, i6 = t7 === G && s6 !== G || t7.capture !== s6.capture || t7.once !== s6.once || t7.passive !== s6.passive, n6 = t7 !== G && (s6 === G || i6);
    i6 && this.element.removeEventListener(this.name, this, s6), n6 && this.element.addEventListener(this.name, this, t7), this._$AH = t7;
  }
  handleEvent(t7) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t7) : this._$AH.handleEvent(t7);
  }
};
var lt = class {
  constructor(t7, e7, s6) {
    this.element = t7, this.type = 6, this._$AN = void 0, this._$AM = e7, this.options = s6;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t7) {
    st(this, t7);
  }
};
var ct = { M: U, P: x, A: H, C: 1, L: tt, R: it, D: L, V: st, I: nt, H: rt, N: ht, U: at, B: ot, F: lt };
var dt = b.litHtmlPolyfillSupport;
dt?.(et, nt), (b.litHtmlVersions ??= []).push("3.3.2");
var pt = (t7, e7, s6) => {
  const i6 = s6?.renderBefore ?? e7;
  let n6 = i6._$litPart$;
  if (void 0 === n6) {
    const t8 = s6?.renderBefore ?? null;
    i6._$litPart$ = n6 = new nt(e7.insertBefore(N(), t8), t8, void 0, s6 ?? {});
  }
  return n6._$AI(t7), n6;
};
var ut = globalThis;
var $t = class extends S {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t7 = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t7.firstChild, t7;
  }
  update(t7) {
    const e7 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t7), this._$Do = pt(e7, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(true);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(false);
  }
  render() {
    return Z;
  }
};
$t._$litElement$ = true, $t.finalized = true, ut.litElementHydrateSupport?.({ LitElement: $t });
var _t = ut.litElementPolyfillSupport;
_t?.({ LitElement: $t });
var ft = { _$AK: (t7, e7, s6) => {
  t7._$AK(e7, s6);
}, _$AL: (t7) => t7._$AL };
(ut.litElementVersions ??= []).push("4.2.2");
var At = false;

// gen/front_end/third_party/lit/lib/async-directive.js
var async_directive_exports = {};
__export(async_directive_exports, {
  AsyncDirective: () => Z2,
  Directive: () => L2,
  PartType: () => B2,
  directive: () => D2
});
var t2 = globalThis;
var e2 = (t7) => t7;
var s2 = t2.trustedTypes;
var i2 = s2 ? s2.createPolicy("lit-html", { createHTML: (t7) => t7 }) : void 0;
var n2 = "$lit$";
var o2 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var h2 = "?" + o2;
var r2 = `<${h2}>`;
var $2 = document;
var l2 = () => $2.createComment("");
var A2 = (t7) => null === t7 || "object" != typeof t7 && "function" != typeof t7;
var _2 = Array.isArray;
var c2 = "[ 	\n\f\r]";
var a2 = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var d2 = /-->/g;
var p2 = />/g;
var u2 = RegExp(`>|${c2}(?:([^\\s"'>=/]+)(${c2}*=${c2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var g2 = /'/g;
var f2 = /"/g;
var v2 = /^(?:script|style|textarea|title)$/i;
var m2 = Symbol.for("lit-noChange");
var y2 = Symbol.for("lit-nothing");
var H2 = /* @__PURE__ */ new WeakMap();
var N2 = $2.createTreeWalker($2, 129);
function x2(t7, e7) {
  if (!_2(t7) || !t7.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== i2 ? i2.createHTML(e7) : e7;
}
var T2 = (t7, e7) => {
  const s6 = t7.length - 1, i6 = [];
  let h6, $6 = 2 === e7 ? "<svg>" : 3 === e7 ? "<math>" : "", l6 = a2;
  for (let e8 = 0; e8 < s6; e8++) {
    const s7 = t7[e8];
    let A5, _6, c6 = -1, m6 = 0;
    for (; m6 < s7.length && (l6.lastIndex = m6, _6 = l6.exec(s7), null !== _6); ) m6 = l6.lastIndex, l6 === a2 ? "!--" === _6[1] ? l6 = d2 : void 0 !== _6[1] ? l6 = p2 : void 0 !== _6[2] ? (v2.test(_6[2]) && (h6 = RegExp("</" + _6[2], "g")), l6 = u2) : void 0 !== _6[3] && (l6 = u2) : l6 === u2 ? ">" === _6[0] ? (l6 = h6 ?? a2, c6 = -1) : void 0 === _6[1] ? c6 = -2 : (c6 = l6.lastIndex - _6[2].length, A5 = _6[1], l6 = void 0 === _6[3] ? u2 : '"' === _6[3] ? f2 : g2) : l6 === f2 || l6 === g2 ? l6 = u2 : l6 === d2 || l6 === p2 ? l6 = a2 : (l6 = u2, h6 = void 0);
    const y6 = l6 === u2 && t7[e8 + 1].startsWith("/>") ? " " : "";
    $6 += l6 === a2 ? s7 + r2 : c6 >= 0 ? (i6.push(A5), s7.slice(0, c6) + n2 + s7.slice(c6) + o2 + y6) : s7 + o2 + (-2 === c6 ? e8 : y6);
  }
  return [x2(t7, $6 + (t7[s6] || "<?>") + (2 === e7 ? "</svg>" : 3 === e7 ? "</math>" : "")), i6];
};
var C2 = class _C {
  constructor({ strings: t7, _$litType$: e7 }, i6) {
    let r7;
    this.parts = [];
    let $6 = 0, A5 = 0;
    const _6 = t7.length - 1, c6 = this.parts, [a6, d6] = T2(t7, e7);
    if (this.el = _C.createElement(a6, i6), N2.currentNode = this.el.content, 2 === e7 || 3 === e7) {
      const t8 = this.el.content.firstChild;
      t8.replaceWith(...t8.childNodes);
    }
    for (; null !== (r7 = N2.nextNode()) && c6.length < _6; ) {
      if (1 === r7.nodeType) {
        if (r7.hasAttributes()) for (const t8 of r7.getAttributeNames()) if (t8.endsWith(n2)) {
          const e8 = d6[A5++], s6 = r7.getAttribute(t8).split(o2), i7 = /([.?@])?(.*)/.exec(e8);
          c6.push({ type: 1, index: $6, name: i7[2], strings: s6, ctor: "." === i7[1] ? S2 : "?" === i7[1] ? w2 : "@" === i7[1] ? U2 : I2 }), r7.removeAttribute(t8);
        } else t8.startsWith(o2) && (c6.push({ type: 6, index: $6 }), r7.removeAttribute(t8));
        if (v2.test(r7.tagName)) {
          const t8 = r7.textContent.split(o2), e8 = t8.length - 1;
          if (e8 > 0) {
            r7.textContent = s2 ? s2.emptyScript : "";
            for (let s6 = 0; s6 < e8; s6++) r7.append(t8[s6], l2()), N2.nextNode(), c6.push({ type: 2, index: ++$6 });
            r7.append(t8[e8], l2());
          }
        }
      } else if (8 === r7.nodeType) if (r7.data === h2) c6.push({ type: 2, index: $6 });
      else {
        let t8 = -1;
        for (; -1 !== (t8 = r7.data.indexOf(o2, t8 + 1)); ) c6.push({ type: 7, index: $6 }), t8 += o2.length - 1;
      }
      $6++;
    }
  }
  static createElement(t7, e7) {
    const s6 = $2.createElement("template");
    return s6.innerHTML = t7, s6;
  }
};
function M2(t7, e7, s6 = t7, i6) {
  if (e7 === m2) return e7;
  let n6 = void 0 !== i6 ? s6._$Co?.[i6] : s6._$Cl;
  const o6 = A2(e7) ? void 0 : e7._$litDirective$;
  return n6?.constructor !== o6 && (n6?._$AO?.(false), void 0 === o6 ? n6 = void 0 : (n6 = new o6(t7), n6._$AT(t7, s6, i6)), void 0 !== i6 ? (s6._$Co ??= [])[i6] = n6 : s6._$Cl = n6), void 0 !== n6 && (e7 = M2(t7, n6._$AS(t7, e7.values), n6, i6)), e7;
}
var b2 = class {
  constructor(t7, e7) {
    this._$AV = [], this._$AN = void 0, this._$AD = t7, this._$AM = e7;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t7) {
    const { el: { content: e7 }, parts: s6 } = this._$AD, i6 = (t7?.creationScope ?? $2).importNode(e7, true);
    N2.currentNode = i6;
    let n6 = N2.nextNode(), o6 = 0, h6 = 0, r7 = s6[0];
    for (; void 0 !== r7; ) {
      if (o6 === r7.index) {
        let e8;
        2 === r7.type ? e8 = new E2(n6, n6.nextSibling, this, t7) : 1 === r7.type ? e8 = new r7.ctor(n6, r7.name, r7.strings, this, t7) : 6 === r7.type && (e8 = new O2(n6, this, t7)), this._$AV.push(e8), r7 = s6[++h6];
      }
      o6 !== r7?.index && (n6 = N2.nextNode(), o6++);
    }
    return N2.currentNode = $2, i6;
  }
  p(t7) {
    let e7 = 0;
    for (const s6 of this._$AV) void 0 !== s6 && (void 0 !== s6.strings ? (s6._$AI(t7, s6, e7), e7 += s6.strings.length - 2) : s6._$AI(t7[e7])), e7++;
  }
};
var E2 = class _E {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t7, e7, s6, i6) {
    this.type = 2, this._$AH = y2, this._$AN = void 0, this._$AA = t7, this._$AB = e7, this._$AM = s6, this.options = i6, this._$Cv = i6?.isConnected ?? true;
  }
  get parentNode() {
    let t7 = this._$AA.parentNode;
    const e7 = this._$AM;
    return void 0 !== e7 && 11 === t7?.nodeType && (t7 = e7.parentNode), t7;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t7, e7 = this) {
    t7 = M2(this, t7, e7), A2(t7) ? t7 === y2 || null == t7 || "" === t7 ? (this._$AH !== y2 && this._$AR(), this._$AH = y2) : t7 !== this._$AH && t7 !== m2 && this._(t7) : void 0 !== t7._$litType$ ? this.$(t7) : void 0 !== t7.nodeType ? this.T(t7) : ((t8) => _2(t8) || "function" == typeof t8?.[Symbol.iterator])(t7) ? this.k(t7) : this._(t7);
  }
  O(t7) {
    return this._$AA.parentNode.insertBefore(t7, this._$AB);
  }
  T(t7) {
    this._$AH !== t7 && (this._$AR(), this._$AH = this.O(t7));
  }
  _(t7) {
    this._$AH !== y2 && A2(this._$AH) ? this._$AA.nextSibling.data = t7 : this.T($2.createTextNode(t7)), this._$AH = t7;
  }
  $(t7) {
    const { values: e7, _$litType$: s6 } = t7, i6 = "number" == typeof s6 ? this._$AC(t7) : (void 0 === s6.el && (s6.el = C2.createElement(x2(s6.h, s6.h[0]), this.options)), s6);
    if (this._$AH?._$AD === i6) this._$AH.p(e7);
    else {
      const t8 = new b2(i6, this), s7 = t8.u(this.options);
      t8.p(e7), this.T(s7), this._$AH = t8;
    }
  }
  _$AC(t7) {
    let e7 = H2.get(t7.strings);
    return void 0 === e7 && H2.set(t7.strings, e7 = new C2(t7)), e7;
  }
  k(t7) {
    _2(this._$AH) || (this._$AH = [], this._$AR());
    const e7 = this._$AH;
    let s6, i6 = 0;
    for (const n6 of t7) i6 === e7.length ? e7.push(s6 = new _E(this.O(l2()), this.O(l2()), this, this.options)) : s6 = e7[i6], s6._$AI(n6), i6++;
    i6 < e7.length && (this._$AR(s6 && s6._$AB.nextSibling, i6), e7.length = i6);
  }
  _$AR(t7 = this._$AA.nextSibling, s6) {
    for (this._$AP?.(false, true, s6); t7 !== this._$AB; ) {
      const s7 = e2(t7).nextSibling;
      e2(t7).remove(), t7 = s7;
    }
  }
  setConnected(t7) {
    void 0 === this._$AM && (this._$Cv = t7, this._$AP?.(t7));
  }
};
var I2 = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t7, e7, s6, i6, n6) {
    this.type = 1, this._$AH = y2, this._$AN = void 0, this.element = t7, this.name = e7, this._$AM = i6, this.options = n6, s6.length > 2 || "" !== s6[0] || "" !== s6[1] ? (this._$AH = Array(s6.length - 1).fill(new String()), this.strings = s6) : this._$AH = y2;
  }
  _$AI(t7, e7 = this, s6, i6) {
    const n6 = this.strings;
    let o6 = false;
    if (void 0 === n6) t7 = M2(this, t7, e7, 0), o6 = !A2(t7) || t7 !== this._$AH && t7 !== m2, o6 && (this._$AH = t7);
    else {
      const i7 = t7;
      let h6, r7;
      for (t7 = n6[0], h6 = 0; h6 < n6.length - 1; h6++) r7 = M2(this, i7[s6 + h6], e7, h6), r7 === m2 && (r7 = this._$AH[h6]), o6 ||= !A2(r7) || r7 !== this._$AH[h6], r7 === y2 ? t7 = y2 : t7 !== y2 && (t7 += (r7 ?? "") + n6[h6 + 1]), this._$AH[h6] = r7;
    }
    o6 && !i6 && this.j(t7);
  }
  j(t7) {
    t7 === y2 ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t7 ?? "");
  }
};
var S2 = class extends I2 {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t7) {
    this.element[this.name] = t7 === y2 ? void 0 : t7;
  }
};
var w2 = class extends I2 {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t7) {
    this.element.toggleAttribute(this.name, !!t7 && t7 !== y2);
  }
};
var U2 = class extends I2 {
  constructor(t7, e7, s6, i6, n6) {
    super(t7, e7, s6, i6, n6), this.type = 5;
  }
  _$AI(t7, e7 = this) {
    if ((t7 = M2(this, t7, e7, 0) ?? y2) === m2) return;
    const s6 = this._$AH, i6 = t7 === y2 && s6 !== y2 || t7.capture !== s6.capture || t7.once !== s6.once || t7.passive !== s6.passive, n6 = t7 !== y2 && (s6 === y2 || i6);
    i6 && this.element.removeEventListener(this.name, this, s6), n6 && this.element.addEventListener(this.name, this, t7), this._$AH = t7;
  }
  handleEvent(t7) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t7) : this._$AH.handleEvent(t7);
  }
};
var O2 = class {
  constructor(t7, e7, s6) {
    this.element = t7, this.type = 6, this._$AN = void 0, this._$AM = e7, this.options = s6;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t7) {
    M2(this, t7);
  }
};
var R2 = t2.litHtmlPolyfillSupport;
R2?.(C2, E2), (t2.litHtmlVersions ??= []).push("3.3.2");
var B2 = { ATTRIBUTE: 1, CHILD: 2, PROPERTY: 3, BOOLEAN_ATTRIBUTE: 4, EVENT: 5, ELEMENT: 6 };
var D2 = (t7) => (...e7) => ({ _$litDirective$: t7, values: e7 });
var L2 = class {
  constructor(t7) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t7, e7, s6) {
    this._$Ct = t7, this._$AM = e7, this._$Ci = s6;
  }
  _$AS(t7, e7) {
    return this.update(t7, e7);
  }
  update(t7, e7) {
    return this.render(...e7);
  }
};
var P2 = (t7, e7) => {
  const s6 = t7._$AN;
  if (void 0 === s6) return false;
  for (const t8 of s6) t8._$AO?.(e7, false), P2(t8, e7);
  return true;
};
var k2 = (t7) => {
  let e7, s6;
  do {
    if (void 0 === (e7 = t7._$AM)) break;
    s6 = e7._$AN, s6.delete(t7), t7 = e7;
  } while (0 === s6?.size);
};
var V2 = (t7) => {
  for (let e7; e7 = t7._$AM; t7 = e7) {
    let s6 = e7._$AN;
    if (void 0 === s6) e7._$AN = s6 = /* @__PURE__ */ new Set();
    else if (s6.has(t7)) break;
    s6.add(t7), z2(e7);
  }
};
function W2(t7) {
  void 0 !== this._$AN ? (k2(this), this._$AM = t7, V2(this)) : this._$AM = t7;
}
function j2(t7, e7 = false, s6 = 0) {
  const i6 = this._$AH, n6 = this._$AN;
  if (void 0 !== n6 && 0 !== n6.size) if (e7) if (Array.isArray(i6)) for (let t8 = s6; t8 < i6.length; t8++) P2(i6[t8], false), k2(i6[t8]);
  else null != i6 && (P2(i6, false), k2(i6));
  else P2(this, t7);
}
var z2 = (t7) => {
  t7.type == B2.CHILD && (t7._$AP ??= j2, t7._$AQ ??= W2);
};
var Z2 = class extends L2 {
  constructor() {
    super(...arguments), this._$AN = void 0;
  }
  _$AT(t7, e7, s6) {
    super._$AT(t7, e7, s6), V2(this), this.isConnected = t7._$AU;
  }
  _$AO(t7, e7 = true) {
    t7 !== this.isConnected && (this.isConnected = t7, t7 ? this.reconnected?.() : this.disconnected?.()), e7 && (P2(this, t7), k2(this));
  }
  setValue(t7) {
    if (((t8) => void 0 === t8.strings)(this._$Ct)) this._$Ct._$AI(t7, this);
    else {
      const e7 = [...this._$Ct._$AH];
      e7[this._$Ci] = t7, this._$Ct._$AI(e7, this, 0);
    }
  }
  disconnected() {
  }
  reconnected() {
  }
};

// gen/front_end/third_party/lit/lib/directives.js
var directives_exports = {};
__export(directives_exports, {
  UnsafeHTMLDirective: () => ht2,
  UntilDirective: () => yt,
  classMap: () => V3,
  createRef: () => bt,
  ifDefined: () => Z3,
  live: () => et2,
  ref: () => wt,
  repeat: () => it2,
  styleMap: () => ot2,
  unsafeHTML: () => lt2,
  until: () => mt
});
var t3 = globalThis;
var e3 = (t7) => t7;
var s3 = t3.trustedTypes;
var i3 = s3 ? s3.createPolicy("lit-html", { createHTML: (t7) => t7 }) : void 0;
var n3 = "$lit$";
var r3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var o3 = "?" + r3;
var h3 = `<${o3}>`;
var l3 = document;
var c3 = () => l3.createComment("");
var a3 = (t7) => null === t7 || "object" != typeof t7 && "function" != typeof t7;
var d3 = Array.isArray;
var u3 = (t7) => d3(t7) || "function" == typeof t7?.[Symbol.iterator];
var $3 = "[ 	\n\f\r]";
var _3 = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var A3 = /-->/g;
var f3 = />/g;
var p3 = RegExp(`>|${$3}(?:([^\\s"'>=/]+)(${$3}*=${$3}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var v3 = /'/g;
var g3 = /"/g;
var y3 = /^(?:script|style|textarea|title)$/i;
var m3 = Symbol.for("lit-noChange");
var b3 = Symbol.for("lit-nothing");
var C3 = /* @__PURE__ */ new WeakMap();
var x3 = l3.createTreeWalker(l3, 129);
function w3(t7, e7) {
  if (!d3(t7) || !t7.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== i3 ? i3.createHTML(e7) : e7;
}
var H3 = (t7, e7) => {
  const s6 = t7.length - 1, i6 = [];
  let o6, l6 = 2 === e7 ? "<svg>" : 3 === e7 ? "<math>" : "", c6 = _3;
  for (let e8 = 0; e8 < s6; e8++) {
    const s7 = t7[e8];
    let a6, d6, u6 = -1, $6 = 0;
    for (; $6 < s7.length && (c6.lastIndex = $6, d6 = c6.exec(s7), null !== d6); ) $6 = c6.lastIndex, c6 === _3 ? "!--" === d6[1] ? c6 = A3 : void 0 !== d6[1] ? c6 = f3 : void 0 !== d6[2] ? (y3.test(d6[2]) && (o6 = RegExp("</" + d6[2], "g")), c6 = p3) : void 0 !== d6[3] && (c6 = p3) : c6 === p3 ? ">" === d6[0] ? (c6 = o6 ?? _3, u6 = -1) : void 0 === d6[1] ? u6 = -2 : (u6 = c6.lastIndex - d6[2].length, a6 = d6[1], c6 = void 0 === d6[3] ? p3 : '"' === d6[3] ? g3 : v3) : c6 === g3 || c6 === v3 ? c6 = p3 : c6 === A3 || c6 === f3 ? c6 = _3 : (c6 = p3, o6 = void 0);
    const m6 = c6 === p3 && t7[e8 + 1].startsWith("/>") ? " " : "";
    l6 += c6 === _3 ? s7 + h3 : u6 >= 0 ? (i6.push(a6), s7.slice(0, u6) + n3 + s7.slice(u6) + r3 + m6) : s7 + r3 + (-2 === u6 ? e8 : m6);
  }
  return [w3(t7, l6 + (t7[s6] || "<?>") + (2 === e7 ? "</svg>" : 3 === e7 ? "</math>" : "")), i6];
};
var N3 = class _N {
  constructor({ strings: t7, _$litType$: e7 }, i6) {
    let h6;
    this.parts = [];
    let l6 = 0, a6 = 0;
    const d6 = t7.length - 1, u6 = this.parts, [$6, _6] = H3(t7, e7);
    if (this.el = _N.createElement($6, i6), x3.currentNode = this.el.content, 2 === e7 || 3 === e7) {
      const t8 = this.el.content.firstChild;
      t8.replaceWith(...t8.childNodes);
    }
    for (; null !== (h6 = x3.nextNode()) && u6.length < d6; ) {
      if (1 === h6.nodeType) {
        if (h6.hasAttributes()) for (const t8 of h6.getAttributeNames()) if (t8.endsWith(n3)) {
          const e8 = _6[a6++], s6 = h6.getAttribute(t8).split(r3), i7 = /([.?@])?(.*)/.exec(e8);
          u6.push({ type: 1, index: l6, name: i7[2], strings: s6, ctor: "." === i7[1] ? G2 : "?" === i7[1] ? U3 : "@" === i7[1] ? I3 : E3 }), h6.removeAttribute(t8);
        } else t8.startsWith(r3) && (u6.push({ type: 6, index: l6 }), h6.removeAttribute(t8));
        if (y3.test(h6.tagName)) {
          const t8 = h6.textContent.split(r3), e8 = t8.length - 1;
          if (e8 > 0) {
            h6.textContent = s3 ? s3.emptyScript : "";
            for (let s6 = 0; s6 < e8; s6++) h6.append(t8[s6], c3()), x3.nextNode(), u6.push({ type: 2, index: ++l6 });
            h6.append(t8[e8], c3());
          }
        }
      } else if (8 === h6.nodeType) if (h6.data === o3) u6.push({ type: 2, index: l6 });
      else {
        let t8 = -1;
        for (; -1 !== (t8 = h6.data.indexOf(r3, t8 + 1)); ) u6.push({ type: 7, index: l6 }), t8 += r3.length - 1;
      }
      l6++;
    }
  }
  static createElement(t7, e7) {
    const s6 = l3.createElement("template");
    return s6.innerHTML = t7, s6;
  }
};
function M3(t7, e7, s6 = t7, i6) {
  if (e7 === m3) return e7;
  let n6 = void 0 !== i6 ? s6._$Co?.[i6] : s6._$Cl;
  const r7 = a3(e7) ? void 0 : e7._$litDirective$;
  return n6?.constructor !== r7 && (n6?._$AO?.(false), void 0 === r7 ? n6 = void 0 : (n6 = new r7(t7), n6._$AT(t7, s6, i6)), void 0 !== i6 ? (s6._$Co ??= [])[i6] = n6 : s6._$Cl = n6), void 0 !== n6 && (e7 = M3(t7, n6._$AS(t7, e7.values), n6, i6)), e7;
}
var T3 = class {
  constructor(t7, e7) {
    this._$AV = [], this._$AN = void 0, this._$AD = t7, this._$AM = e7;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t7) {
    const { el: { content: e7 }, parts: s6 } = this._$AD, i6 = (t7?.creationScope ?? l3).importNode(e7, true);
    x3.currentNode = i6;
    let n6 = x3.nextNode(), r7 = 0, o6 = 0, h6 = s6[0];
    for (; void 0 !== h6; ) {
      if (r7 === h6.index) {
        let e8;
        2 === h6.type ? e8 = new S3(n6, n6.nextSibling, this, t7) : 1 === h6.type ? e8 = new h6.ctor(n6, h6.name, h6.strings, this, t7) : 6 === h6.type && (e8 = new k3(n6, this, t7)), this._$AV.push(e8), h6 = s6[++o6];
      }
      r7 !== h6?.index && (n6 = x3.nextNode(), r7++);
    }
    return x3.currentNode = l3, i6;
  }
  p(t7) {
    let e7 = 0;
    for (const s6 of this._$AV) void 0 !== s6 && (void 0 !== s6.strings ? (s6._$AI(t7, s6, e7), e7 += s6.strings.length - 2) : s6._$AI(t7[e7])), e7++;
  }
};
var S3 = class _S {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t7, e7, s6, i6) {
    this.type = 2, this._$AH = b3, this._$AN = void 0, this._$AA = t7, this._$AB = e7, this._$AM = s6, this.options = i6, this._$Cv = i6?.isConnected ?? true;
  }
  get parentNode() {
    let t7 = this._$AA.parentNode;
    const e7 = this._$AM;
    return void 0 !== e7 && 11 === t7?.nodeType && (t7 = e7.parentNode), t7;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t7, e7 = this) {
    t7 = M3(this, t7, e7), a3(t7) ? t7 === b3 || null == t7 || "" === t7 ? (this._$AH !== b3 && this._$AR(), this._$AH = b3) : t7 !== this._$AH && t7 !== m3 && this._(t7) : void 0 !== t7._$litType$ ? this.$(t7) : void 0 !== t7.nodeType ? this.T(t7) : u3(t7) ? this.k(t7) : this._(t7);
  }
  O(t7) {
    return this._$AA.parentNode.insertBefore(t7, this._$AB);
  }
  T(t7) {
    this._$AH !== t7 && (this._$AR(), this._$AH = this.O(t7));
  }
  _(t7) {
    this._$AH !== b3 && a3(this._$AH) ? this._$AA.nextSibling.data = t7 : this.T(l3.createTextNode(t7)), this._$AH = t7;
  }
  $(t7) {
    const { values: e7, _$litType$: s6 } = t7, i6 = "number" == typeof s6 ? this._$AC(t7) : (void 0 === s6.el && (s6.el = N3.createElement(w3(s6.h, s6.h[0]), this.options)), s6);
    if (this._$AH?._$AD === i6) this._$AH.p(e7);
    else {
      const t8 = new T3(i6, this), s7 = t8.u(this.options);
      t8.p(e7), this.T(s7), this._$AH = t8;
    }
  }
  _$AC(t7) {
    let e7 = C3.get(t7.strings);
    return void 0 === e7 && C3.set(t7.strings, e7 = new N3(t7)), e7;
  }
  k(t7) {
    d3(this._$AH) || (this._$AH = [], this._$AR());
    const e7 = this._$AH;
    let s6, i6 = 0;
    for (const n6 of t7) i6 === e7.length ? e7.push(s6 = new _S(this.O(c3()), this.O(c3()), this, this.options)) : s6 = e7[i6], s6._$AI(n6), i6++;
    i6 < e7.length && (this._$AR(s6 && s6._$AB.nextSibling, i6), e7.length = i6);
  }
  _$AR(t7 = this._$AA.nextSibling, s6) {
    for (this._$AP?.(false, true, s6); t7 !== this._$AB; ) {
      const s7 = e3(t7).nextSibling;
      e3(t7).remove(), t7 = s7;
    }
  }
  setConnected(t7) {
    void 0 === this._$AM && (this._$Cv = t7, this._$AP?.(t7));
  }
};
var E3 = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t7, e7, s6, i6, n6) {
    this.type = 1, this._$AH = b3, this._$AN = void 0, this.element = t7, this.name = e7, this._$AM = i6, this.options = n6, s6.length > 2 || "" !== s6[0] || "" !== s6[1] ? (this._$AH = Array(s6.length - 1).fill(new String()), this.strings = s6) : this._$AH = b3;
  }
  _$AI(t7, e7 = this, s6, i6) {
    const n6 = this.strings;
    let r7 = false;
    if (void 0 === n6) t7 = M3(this, t7, e7, 0), r7 = !a3(t7) || t7 !== this._$AH && t7 !== m3, r7 && (this._$AH = t7);
    else {
      const i7 = t7;
      let o6, h6;
      for (t7 = n6[0], o6 = 0; o6 < n6.length - 1; o6++) h6 = M3(this, i7[s6 + o6], e7, o6), h6 === m3 && (h6 = this._$AH[o6]), r7 ||= !a3(h6) || h6 !== this._$AH[o6], h6 === b3 ? t7 = b3 : t7 !== b3 && (t7 += (h6 ?? "") + n6[o6 + 1]), this._$AH[o6] = h6;
    }
    r7 && !i6 && this.j(t7);
  }
  j(t7) {
    t7 === b3 ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t7 ?? "");
  }
};
var G2 = class extends E3 {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t7) {
    this.element[this.name] = t7 === b3 ? void 0 : t7;
  }
};
var U3 = class extends E3 {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t7) {
    this.element.toggleAttribute(this.name, !!t7 && t7 !== b3);
  }
};
var I3 = class extends E3 {
  constructor(t7, e7, s6, i6, n6) {
    super(t7, e7, s6, i6, n6), this.type = 5;
  }
  _$AI(t7, e7 = this) {
    if ((t7 = M3(this, t7, e7, 0) ?? b3) === m3) return;
    const s6 = this._$AH, i6 = t7 === b3 && s6 !== b3 || t7.capture !== s6.capture || t7.once !== s6.once || t7.passive !== s6.passive, n6 = t7 !== b3 && (s6 === b3 || i6);
    i6 && this.element.removeEventListener(this.name, this, s6), n6 && this.element.addEventListener(this.name, this, t7), this._$AH = t7;
  }
  handleEvent(t7) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t7) : this._$AH.handleEvent(t7);
  }
};
var k3 = class {
  constructor(t7, e7, s6) {
    this.element = t7, this.type = 6, this._$AN = void 0, this._$AM = e7, this.options = s6;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t7) {
    M3(this, t7);
  }
};
var O3 = { M: n3, P: r3, A: o3, C: 1, L: H3, R: T3, D: u3, V: M3, I: S3, H: E3, N: U3, U: I3, B: G2, F: k3 };
var P3 = t3.litHtmlPolyfillSupport;
P3?.(N3, S3), (t3.litHtmlVersions ??= []).push("3.3.2");
var B3 = 1;
var j3 = 2;
var L3 = 3;
var R3 = 4;
var D3 = (t7) => (...e7) => ({ _$litDirective$: t7, values: e7 });
var W3 = class {
  constructor(t7) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t7, e7, s6) {
    this._$Ct = t7, this._$AM = e7, this._$Ci = s6;
  }
  _$AS(t7, e7) {
    return this.update(t7, e7);
  }
  update(t7, e7) {
    return this.render(...e7);
  }
};
var V3 = D3(class extends W3 {
  constructor(t7) {
    if (super(t7), t7.type !== B3 || "class" !== t7.name || t7.strings?.length > 2) throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.");
  }
  render(t7) {
    return " " + Object.keys(t7).filter((e7) => t7[e7]).join(" ") + " ";
  }
  update(t7, [e7]) {
    if (void 0 === this.st) {
      this.st = /* @__PURE__ */ new Set(), void 0 !== t7.strings && (this.nt = new Set(t7.strings.join(" ").split(/\s/).filter((t8) => "" !== t8)));
      for (const t8 in e7) e7[t8] && !this.nt?.has(t8) && this.st.add(t8);
      return this.render(e7);
    }
    const s6 = t7.element.classList;
    for (const t8 of this.st) t8 in e7 || (s6.remove(t8), this.st.delete(t8));
    for (const t8 in e7) {
      const i6 = !!e7[t8];
      i6 === this.st.has(t8) || this.nt?.has(t8) || (i6 ? (s6.add(t8), this.st.add(t8)) : (s6.remove(t8), this.st.delete(t8)));
    }
    return m3;
  }
});
var Z3 = (t7) => t7 ?? b3;
var { I: z3 } = O3;
var K2 = (t7) => t7;
var X2 = (t7) => void 0 === t7.strings;
var Y2 = () => document.createComment("");
var F2 = (t7, e7, s6) => {
  const i6 = t7._$AA.parentNode, n6 = void 0 === e7 ? t7._$AB : e7._$AA;
  if (void 0 === s6) {
    const e8 = i6.insertBefore(Y2(), n6), r7 = i6.insertBefore(Y2(), n6);
    s6 = new z3(e8, r7, t7, t7.options);
  } else {
    const e8 = s6._$AB.nextSibling, r7 = s6._$AM, o6 = r7 !== t7;
    if (o6) {
      let e9;
      s6._$AQ?.(t7), s6._$AM = t7, void 0 !== s6._$AP && (e9 = t7._$AU) !== r7._$AU && s6._$AP(e9);
    }
    if (e8 !== n6 || o6) {
      let t8 = s6._$AA;
      for (; t8 !== e8; ) {
        const e9 = K2(t8).nextSibling;
        K2(i6).insertBefore(t8, n6), t8 = e9;
      }
    }
  }
  return s6;
};
var Q2 = (t7, e7, s6 = t7) => (t7._$AI(e7, s6), t7);
var q2 = {};
var J2 = (t7, e7 = q2) => t7._$AH = e7;
var tt2 = (t7) => {
  t7._$AR(), t7._$AA.remove();
};
var et2 = D3(class extends W3 {
  constructor(t7) {
    if (super(t7), t7.type !== L3 && t7.type !== B3 && t7.type !== R3) throw Error("The `live` directive is not allowed on child or event bindings");
    if (!X2(t7)) throw Error("`live` bindings can only contain a single expression");
  }
  render(t7) {
    return t7;
  }
  update(t7, [e7]) {
    if (e7 === m3 || e7 === b3) return e7;
    const s6 = t7.element, i6 = t7.name;
    if (t7.type === L3) {
      if (e7 === s6[i6]) return m3;
    } else if (t7.type === R3) {
      if (!!e7 === s6.hasAttribute(i6)) return m3;
    } else if (t7.type === B3 && s6.getAttribute(i6) === e7 + "") return m3;
    return J2(t7), e7;
  }
});
var st2 = (t7, e7, s6) => {
  const i6 = /* @__PURE__ */ new Map();
  for (let n6 = e7; n6 <= s6; n6++) i6.set(t7[n6], n6);
  return i6;
};
var it2 = D3(class extends W3 {
  constructor(t7) {
    if (super(t7), t7.type !== j3) throw Error("repeat() can only be used in text expressions");
  }
  dt(t7, e7, s6) {
    let i6;
    void 0 === s6 ? s6 = e7 : void 0 !== e7 && (i6 = e7);
    const n6 = [], r7 = [];
    let o6 = 0;
    for (const e8 of t7) n6[o6] = i6 ? i6(e8, o6) : o6, r7[o6] = s6(e8, o6), o6++;
    return { values: r7, keys: n6 };
  }
  render(t7, e7, s6) {
    return this.dt(t7, e7, s6).values;
  }
  update(t7, [e7, s6, i6]) {
    const n6 = ((t8) => t8._$AH)(t7), { values: r7, keys: o6 } = this.dt(e7, s6, i6);
    if (!Array.isArray(n6)) return this.ut = o6, r7;
    const h6 = this.ut ??= [], l6 = [];
    let c6, a6, d6 = 0, u6 = n6.length - 1, $6 = 0, _6 = r7.length - 1;
    for (; d6 <= u6 && $6 <= _6; ) if (null === n6[d6]) d6++;
    else if (null === n6[u6]) u6--;
    else if (h6[d6] === o6[$6]) l6[$6] = Q2(n6[d6], r7[$6]), d6++, $6++;
    else if (h6[u6] === o6[_6]) l6[_6] = Q2(n6[u6], r7[_6]), u6--, _6--;
    else if (h6[d6] === o6[_6]) l6[_6] = Q2(n6[d6], r7[_6]), F2(t7, l6[_6 + 1], n6[d6]), d6++, _6--;
    else if (h6[u6] === o6[$6]) l6[$6] = Q2(n6[u6], r7[$6]), F2(t7, n6[d6], n6[u6]), u6--, $6++;
    else if (void 0 === c6 && (c6 = st2(o6, $6, _6), a6 = st2(h6, d6, u6)), c6.has(h6[d6])) if (c6.has(h6[u6])) {
      const e8 = a6.get(o6[$6]), s7 = void 0 !== e8 ? n6[e8] : null;
      if (null === s7) {
        const e9 = F2(t7, n6[d6]);
        Q2(e9, r7[$6]), l6[$6] = e9;
      } else l6[$6] = Q2(s7, r7[$6]), F2(t7, n6[d6], s7), n6[e8] = null;
      $6++;
    } else tt2(n6[u6]), u6--;
    else tt2(n6[d6]), d6++;
    for (; $6 <= _6; ) {
      const e8 = F2(t7, l6[_6 + 1]);
      Q2(e8, r7[$6]), l6[$6++] = e8;
    }
    for (; d6 <= u6; ) {
      const t8 = n6[d6++];
      null !== t8 && tt2(t8);
    }
    return this.ut = o6, J2(t7, l6), m3;
  }
});
var nt2 = "important";
var rt2 = " !" + nt2;
var ot2 = D3(class extends W3 {
  constructor(t7) {
    if (super(t7), t7.type !== B3 || "style" !== t7.name || t7.strings?.length > 2) throw Error("The `styleMap` directive must be used in the `style` attribute and must be the only part in the attribute.");
  }
  render(t7) {
    return Object.keys(t7).reduce((e7, s6) => {
      const i6 = t7[s6];
      return null == i6 ? e7 : e7 + `${s6 = s6.includes("-") ? s6 : s6.replace(/(?:^(webkit|moz|ms|o)|)(?=[A-Z])/g, "-$&").toLowerCase()}:${i6};`;
    }, "");
  }
  update(t7, [e7]) {
    const { style: s6 } = t7.element;
    if (void 0 === this.ft) return this.ft = new Set(Object.keys(e7)), this.render(e7);
    for (const t8 of this.ft) null == e7[t8] && (this.ft.delete(t8), t8.includes("-") ? s6.removeProperty(t8) : s6[t8] = null);
    for (const t8 in e7) {
      const i6 = e7[t8];
      if (null != i6) {
        this.ft.add(t8);
        const e8 = "string" == typeof i6 && i6.endsWith(rt2);
        t8.includes("-") || e8 ? s6.setProperty(t8, e8 ? i6.slice(0, -11) : i6, e8 ? nt2 : "") : s6[t8] = i6;
      }
    }
    return m3;
  }
});
var ht2 = class extends W3 {
  constructor(t7) {
    if (super(t7), this.it = b3, t7.type !== j3) throw Error(this.constructor.directiveName + "() can only be used in child bindings");
  }
  render(t7) {
    if (t7 === b3 || null == t7) return this._t = void 0, this.it = t7;
    if (t7 === m3) return t7;
    if ("string" != typeof t7) throw Error(this.constructor.directiveName + "() called with a non-string value");
    if (t7 === this.it) return this._t;
    this.it = t7;
    const e7 = [t7];
    return e7.raw = e7, this._t = { _$litType$: this.constructor.resultType, strings: e7, values: [] };
  }
};
ht2.directiveName = "unsafeHTML", ht2.resultType = 1;
var lt2 = D3(ht2);
var ct2 = (t7, e7) => {
  const s6 = t7._$AN;
  if (void 0 === s6) return false;
  for (const t8 of s6) t8._$AO?.(e7, false), ct2(t8, e7);
  return true;
};
var at2 = (t7) => {
  let e7, s6;
  do {
    if (void 0 === (e7 = t7._$AM)) break;
    s6 = e7._$AN, s6.delete(t7), t7 = e7;
  } while (0 === s6?.size);
};
var dt2 = (t7) => {
  for (let e7; e7 = t7._$AM; t7 = e7) {
    let s6 = e7._$AN;
    if (void 0 === s6) e7._$AN = s6 = /* @__PURE__ */ new Set();
    else if (s6.has(t7)) break;
    s6.add(t7), _t2(e7);
  }
};
function ut2(t7) {
  void 0 !== this._$AN ? (at2(this), this._$AM = t7, dt2(this)) : this._$AM = t7;
}
function $t2(t7, e7 = false, s6 = 0) {
  const i6 = this._$AH, n6 = this._$AN;
  if (void 0 !== n6 && 0 !== n6.size) if (e7) if (Array.isArray(i6)) for (let t8 = s6; t8 < i6.length; t8++) ct2(i6[t8], false), at2(i6[t8]);
  else null != i6 && (ct2(i6, false), at2(i6));
  else ct2(this, t7);
}
var _t2 = (t7) => {
  t7.type == j3 && (t7._$AP ??= $t2, t7._$AQ ??= ut2);
};
var At2 = class extends W3 {
  constructor() {
    super(...arguments), this._$AN = void 0;
  }
  _$AT(t7, e7, s6) {
    super._$AT(t7, e7, s6), dt2(this), this.isConnected = t7._$AU;
  }
  _$AO(t7, e7 = true) {
    t7 !== this.isConnected && (this.isConnected = t7, t7 ? this.reconnected?.() : this.disconnected?.()), e7 && (ct2(this, t7), at2(this));
  }
  setValue(t7) {
    if (X2(this._$Ct)) this._$Ct._$AI(t7, this);
    else {
      const e7 = [...this._$Ct._$AH];
      e7[this._$Ci] = t7, this._$Ct._$AI(e7, this, 0);
    }
  }
  disconnected() {
  }
  reconnected() {
  }
};
var ft2 = class {
  constructor(t7) {
    this.G = t7;
  }
  disconnect() {
    this.G = void 0;
  }
  reconnect(t7) {
    this.G = t7;
  }
  deref() {
    return this.G;
  }
};
var pt2 = class {
  constructor() {
    this.Y = void 0, this.Z = void 0;
  }
  get() {
    return this.Y;
  }
  pause() {
    this.Y ??= new Promise((t7) => this.Z = t7);
  }
  resume() {
    this.Z?.(), this.Y = this.Z = void 0;
  }
};
var vt = (t7) => !/* @__PURE__ */ ((t8) => null === t8 || "object" != typeof t8 && "function" != typeof t8)(t7) && "function" == typeof t7.then;
var gt = 1073741823;
var yt = class extends At2 {
  constructor() {
    super(...arguments), this._$Cwt = gt, this._$Cbt = [], this._$CK = new ft2(this), this._$CX = new pt2();
  }
  render(...t7) {
    return t7.find((t8) => !vt(t8)) ?? m3;
  }
  update(t7, e7) {
    const s6 = this._$Cbt;
    let i6 = s6.length;
    this._$Cbt = e7;
    const n6 = this._$CK, r7 = this._$CX;
    this.isConnected || this.disconnected();
    for (let t8 = 0; t8 < e7.length && !(t8 > this._$Cwt); t8++) {
      const o6 = e7[t8];
      if (!vt(o6)) return this._$Cwt = t8, o6;
      t8 < i6 && o6 === s6[t8] || (this._$Cwt = gt, i6 = 0, Promise.resolve(o6).then(async (t9) => {
        for (; r7.get(); ) await r7.get();
        const e8 = n6.deref();
        if (void 0 !== e8) {
          const s7 = e8._$Cbt.indexOf(o6);
          s7 > -1 && s7 < e8._$Cwt && (e8._$Cwt = s7, e8.setValue(t9));
        }
      }));
    }
    return m3;
  }
  disconnected() {
    this._$CK.disconnect(), this._$CX.pause();
  }
  reconnected() {
    this._$CK.reconnect(this), this._$CX.resume();
  }
};
var mt = D3(yt);
var bt = () => new Ct();
var Ct = class {
};
var xt = /* @__PURE__ */ new WeakMap();
var wt = D3(class extends At2 {
  render(t7) {
    return b3;
  }
  update(t7, [e7]) {
    const s6 = e7 !== this.G;
    return s6 && void 0 !== this.G && this.rt(void 0), (s6 || this.lt !== this.ct) && (this.G = e7, this.ht = t7.options?.host, this.rt(this.ct = t7.element)), b3;
  }
  rt(t7) {
    if (this.isConnected || (t7 = void 0), "function" == typeof this.G) {
      const e7 = this.ht ?? globalThis;
      let s6 = xt.get(e7);
      void 0 === s6 && (s6 = /* @__PURE__ */ new WeakMap(), xt.set(e7, s6)), void 0 !== s6.get(this.G) && this.G.call(this.ht, void 0), s6.set(this.G, t7), void 0 !== t7 && this.G.call(this.ht, t7);
    } else this.G.value = t7;
  }
  get lt() {
    return "function" == typeof this.G ? xt.get(this.ht ?? globalThis)?.get(this.G) : this.G?.value;
  }
  disconnected() {
    this.lt === this.ct && this.rt(void 0);
  }
  reconnected() {
    this.rt(this.ct);
  }
});

// gen/front_end/third_party/lit/lib/directive.js
var directive_exports = {};
__export(directive_exports, {
  Directive: () => r4,
  PartType: () => t4,
  directive: () => e4
});
var t4 = { ATTRIBUTE: 1, CHILD: 2, PROPERTY: 3, BOOLEAN_ATTRIBUTE: 4, EVENT: 5, ELEMENT: 6 };
var e4 = (t7) => (...e7) => ({ _$litDirective$: t7, values: e7 });
var r4 = class {
  constructor(t7) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t7, e7, r7) {
    this._$Ct = t7, this._$AM = e7, this._$Ci = r7;
  }
  _$AS(t7, e7) {
    return this.update(t7, e7);
  }
  update(t7, e7) {
    return this.render(...e7);
  }
};

// gen/front_end/third_party/lit/lib/decorators.js
var decorators_exports = {};
__export(decorators_exports, {
  customElement: () => P4,
  property: () => v4,
  standardProperty: () => b4,
  state: () => w4
});
var t5 = globalThis;
var e5 = t5.ShadowRoot && (void 0 === t5.ShadyCSS || t5.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s4 = Symbol();
var i4 = /* @__PURE__ */ new WeakMap();
var r5 = class {
  constructor(t7, e7, i6) {
    if (this._$cssResult$ = true, i6 !== s4) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t7, this.t = e7;
  }
  get styleSheet() {
    let t7 = this.o;
    const s6 = this.t;
    if (e5 && void 0 === t7) {
      const e7 = void 0 !== s6 && 1 === s6.length;
      e7 && (t7 = i4.get(s6)), void 0 === t7 && ((this.o = t7 = new CSSStyleSheet()).replaceSync(this.cssText), e7 && i4.set(s6, t7));
    }
    return t7;
  }
  toString() {
    return this.cssText;
  }
};
var o4 = e5 ? (t7) => t7 : (t7) => t7 instanceof CSSStyleSheet ? ((t8) => {
  let e7 = "";
  for (const s6 of t8.cssRules) e7 += s6.cssText;
  return ((t9) => new r5("string" == typeof t9 ? t9 : t9 + "", void 0, s4))(e7);
})(t7) : t7;
var { is: n4, defineProperty: a4, getOwnPropertyDescriptor: h4, getOwnPropertyNames: c4, getOwnPropertySymbols: l4, getPrototypeOf: d4 } = Object;
var p4 = globalThis;
var u4 = p4.trustedTypes;
var f4 = u4 ? u4.emptyScript : "";
var y4 = p4.reactiveElementPolyfillSupport;
var E4 = (t7, e7) => t7;
var m4 = { toAttribute(t7, e7) {
  switch (e7) {
    case Boolean:
      t7 = t7 ? f4 : null;
      break;
    case Object:
    case Array:
      t7 = null == t7 ? t7 : JSON.stringify(t7);
  }
  return t7;
}, fromAttribute(t7, e7) {
  let s6 = t7;
  switch (e7) {
    case Boolean:
      s6 = null !== t7;
      break;
    case Number:
      s6 = null === t7 ? null : Number(t7);
      break;
    case Object:
    case Array:
      try {
        s6 = JSON.parse(t7);
      } catch (t8) {
        s6 = null;
      }
  }
  return s6;
} };
var _4 = (t7, e7) => !n4(t7, e7);
var $4 = { attribute: true, type: String, converter: m4, reflect: false, useDefault: false, hasChanged: _4 };
Symbol.metadata ??= Symbol("metadata"), p4.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var S4 = class extends HTMLElement {
  static addInitializer(t7) {
    this._$Ei(), (this.l ??= []).push(t7);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t7, e7 = $4) {
    if (e7.state && (e7.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t7) && ((e7 = Object.create(e7)).wrapped = true), this.elementProperties.set(t7, e7), !e7.noAccessor) {
      const s6 = Symbol(), i6 = this.getPropertyDescriptor(t7, s6, e7);
      void 0 !== i6 && a4(this.prototype, t7, i6);
    }
  }
  static getPropertyDescriptor(t7, e7, s6) {
    const { get: i6, set: r7 } = h4(this.prototype, t7) ?? { get() {
      return this[e7];
    }, set(t8) {
      this[e7] = t8;
    } };
    return { get: i6, set(e8) {
      const o6 = i6?.call(this);
      r7?.call(this, e8), this.requestUpdate(t7, o6, s6);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t7) {
    return this.elementProperties.get(t7) ?? $4;
  }
  static _$Ei() {
    if (this.hasOwnProperty(E4("elementProperties"))) return;
    const t7 = d4(this);
    t7.finalize(), void 0 !== t7.l && (this.l = [...t7.l]), this.elementProperties = new Map(t7.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(E4("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(E4("properties"))) {
      const t8 = this.properties, e7 = [...c4(t8), ...l4(t8)];
      for (const s6 of e7) this.createProperty(s6, t8[s6]);
    }
    const t7 = this[Symbol.metadata];
    if (null !== t7) {
      const e7 = litPropertyMetadata.get(t7);
      if (void 0 !== e7) for (const [t8, s6] of e7) this.elementProperties.set(t8, s6);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t8, e7] of this.elementProperties) {
      const s6 = this._$Eu(t8, e7);
      void 0 !== s6 && this._$Eh.set(s6, t8);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(t7) {
    const e7 = [];
    if (Array.isArray(t7)) {
      const s6 = new Set(t7.flat(1 / 0).reverse());
      for (const t8 of s6) e7.unshift(o4(t8));
    } else void 0 !== t7 && e7.push(o4(t7));
    return e7;
  }
  static _$Eu(t7, e7) {
    const s6 = e7.attribute;
    return false === s6 ? void 0 : "string" == typeof s6 ? s6 : "string" == typeof t7 ? t7.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t7) => this.enableUpdating = t7), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t7) => t7(this));
  }
  addController(t7) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t7), void 0 !== this.renderRoot && this.isConnected && t7.hostConnected?.();
  }
  removeController(t7) {
    this._$EO?.delete(t7);
  }
  _$E_() {
    const t7 = /* @__PURE__ */ new Map(), e7 = this.constructor.elementProperties;
    for (const s6 of e7.keys()) this.hasOwnProperty(s6) && (t7.set(s6, this[s6]), delete this[s6]);
    t7.size > 0 && (this._$Ep = t7);
  }
  createRenderRoot() {
    const s6 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return ((s7, i6) => {
      if (e5) s7.adoptedStyleSheets = i6.map((t7) => t7 instanceof CSSStyleSheet ? t7 : t7.styleSheet);
      else for (const e7 of i6) {
        const i7 = document.createElement("style"), r7 = t5.litNonce;
        void 0 !== r7 && i7.setAttribute("nonce", r7), i7.textContent = e7.cssText, s7.appendChild(i7);
      }
    })(s6, this.constructor.elementStyles), s6;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t7) => t7.hostConnected?.());
  }
  enableUpdating(t7) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t7) => t7.hostDisconnected?.());
  }
  attributeChangedCallback(t7, e7, s6) {
    this._$AK(t7, s6);
  }
  _$ET(t7, e7) {
    const s6 = this.constructor.elementProperties.get(t7), i6 = this.constructor._$Eu(t7, s6);
    if (void 0 !== i6 && true === s6.reflect) {
      const r7 = (void 0 !== s6.converter?.toAttribute ? s6.converter : m4).toAttribute(e7, s6.type);
      this._$Em = t7, null == r7 ? this.removeAttribute(i6) : this.setAttribute(i6, r7), this._$Em = null;
    }
  }
  _$AK(t7, e7) {
    const s6 = this.constructor, i6 = s6._$Eh.get(t7);
    if (void 0 !== i6 && this._$Em !== i6) {
      const t8 = s6.getPropertyOptions(i6), r7 = "function" == typeof t8.converter ? { fromAttribute: t8.converter } : void 0 !== t8.converter?.fromAttribute ? t8.converter : m4;
      this._$Em = i6;
      const o6 = r7.fromAttribute(e7, t8.type);
      this[i6] = o6 ?? this._$Ej?.get(i6) ?? o6, this._$Em = null;
    }
  }
  requestUpdate(t7, e7, s6, i6 = false, r7) {
    if (void 0 !== t7) {
      const o6 = this.constructor;
      if (false === i6 && (r7 = this[t7]), s6 ??= o6.getPropertyOptions(t7), !((s6.hasChanged ?? _4)(r7, e7) || s6.useDefault && s6.reflect && r7 === this._$Ej?.get(t7) && !this.hasAttribute(o6._$Eu(t7, s6)))) return;
      this.C(t7, e7, s6);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t7, e7, { useDefault: s6, reflect: i6, wrapped: r7 }, o6) {
    s6 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t7) && (this._$Ej.set(t7, o6 ?? e7 ?? this[t7]), true !== r7 || void 0 !== o6) || (this._$AL.has(t7) || (this.hasUpdated || s6 || (e7 = void 0), this._$AL.set(t7, e7)), true === i6 && this._$Em !== t7 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t7));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t8) {
      Promise.reject(t8);
    }
    const t7 = this.scheduleUpdate();
    return null != t7 && await t7, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t9, e8] of this._$Ep) this[t9] = e8;
        this._$Ep = void 0;
      }
      const t8 = this.constructor.elementProperties;
      if (t8.size > 0) for (const [e8, s6] of t8) {
        const { wrapped: t9 } = s6, i6 = this[e8];
        true !== t9 || this._$AL.has(e8) || void 0 === i6 || this.C(e8, void 0, s6, i6);
      }
    }
    let t7 = false;
    const e7 = this._$AL;
    try {
      t7 = this.shouldUpdate(e7), t7 ? (this.willUpdate(e7), this._$EO?.forEach((t8) => t8.hostUpdate?.()), this.update(e7)) : this._$EM();
    } catch (e8) {
      throw t7 = false, this._$EM(), e8;
    }
    t7 && this._$AE(e7);
  }
  willUpdate(t7) {
  }
  _$AE(t7) {
    this._$EO?.forEach((t8) => t8.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t7)), this.updated(t7);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = false;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t7) {
    return true;
  }
  update(t7) {
    this._$Eq &&= this._$Eq.forEach((t8) => this._$ET(t8, this[t8])), this._$EM();
  }
  updated(t7) {
  }
  firstUpdated(t7) {
  }
};
S4.elementStyles = [], S4.shadowRootOptions = { mode: "open" }, S4[E4("elementProperties")] = /* @__PURE__ */ new Map(), S4[E4("finalized")] = /* @__PURE__ */ new Map(), y4?.({ ReactiveElement: S4 }), (p4.reactiveElementVersions ??= []).push("2.1.2");
var g4 = { attribute: true, type: String, converter: m4, reflect: false, hasChanged: _4 };
var b4 = (t7 = g4, e7, s6) => {
  const { kind: i6, metadata: r7 } = s6;
  let o6 = globalThis.litPropertyMetadata.get(r7);
  if (void 0 === o6 && globalThis.litPropertyMetadata.set(r7, o6 = /* @__PURE__ */ new Map()), "setter" === i6 && ((t7 = Object.create(t7)).wrapped = true), o6.set(s6.name, t7), "accessor" === i6) {
    const { name: i7 } = s6;
    return { set(s7) {
      const r8 = e7.get.call(this);
      e7.set.call(this, s7), this.requestUpdate(i7, r8, t7, true, s7);
    }, init(e8) {
      return void 0 !== e8 && this.C(i7, void 0, t7, e8), e8;
    } };
  }
  if ("setter" === i6) {
    const { name: i7 } = s6;
    return function(s7) {
      const r8 = this[i7];
      e7.call(this, s7), this.requestUpdate(i7, r8, t7, true, s7);
    };
  }
  throw Error("Unsupported decorator location: " + i6);
};
function v4(t7) {
  return (e7, s6) => "object" == typeof s6 ? b4(t7, e7, s6) : ((t8, e8, s7) => {
    const i6 = e8.hasOwnProperty(s7);
    return e8.constructor.createProperty(s7, t8), i6 ? Object.getOwnPropertyDescriptor(e8, s7) : void 0;
  })(t7, e7, s6);
}
function w4(t7) {
  return v4({ ...t7, state: true, attribute: false });
}
var P4 = (t7) => (e7, s6) => {
  void 0 !== s6 ? s6.addInitializer(() => {
    customElements.define(t7, e7);
  }) : customElements.define(t7, e7);
};

// gen/front_end/third_party/lit/lib/static-html.js
var static_html_exports = {};
__export(static_html_exports, {
  html: () => F3,
  literal: () => D4,
  mathml: () => G3,
  svg: () => q3,
  unsafeStatic: () => V4,
  withStatic: () => Z4
});
var t6 = globalThis;
var e6 = (t7) => t7;
var s5 = t6.trustedTypes;
var i5 = s5 ? s5.createPolicy("lit-html", { createHTML: (t7) => t7 }) : void 0;
var n5 = "$lit$";
var o5 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var r6 = "?" + o5;
var h5 = `<${r6}>`;
var l5 = document;
var $5 = () => l5.createComment("");
var a5 = (t7) => null === t7 || "object" != typeof t7 && "function" != typeof t7;
var c5 = Array.isArray;
var _5 = "[ 	\n\f\r]";
var A4 = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var p5 = /-->/g;
var d5 = />/g;
var u5 = RegExp(`>|${_5}(?:([^\\s"'>=/]+)(${_5}*=${_5}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var g5 = /'/g;
var f5 = /"/g;
var v5 = /^(?:script|style|textarea|title)$/i;
var m5 = (t7) => (e7, ...s6) => ({ _$litType$: t7, strings: e7, values: s6 });
var y5 = m5(1);
var x4 = m5(2);
var H4 = m5(3);
var N4 = Symbol.for("lit-noChange");
var b5 = Symbol.for("lit-nothing");
var S5 = /* @__PURE__ */ new WeakMap();
var T4 = l5.createTreeWalker(l5, 129);
function M4(t7, e7) {
  if (!c5(t7) || !t7.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== i5 ? i5.createHTML(e7) : e7;
}
var w5 = (t7, e7) => {
  const s6 = t7.length - 1, i6 = [];
  let r7, l6 = 2 === e7 ? "<svg>" : 3 === e7 ? "<math>" : "", $6 = A4;
  for (let e8 = 0; e8 < s6; e8++) {
    const s7 = t7[e8];
    let a6, c6, _6 = -1, m6 = 0;
    for (; m6 < s7.length && ($6.lastIndex = m6, c6 = $6.exec(s7), null !== c6); ) m6 = $6.lastIndex, $6 === A4 ? "!--" === c6[1] ? $6 = p5 : void 0 !== c6[1] ? $6 = d5 : void 0 !== c6[2] ? (v5.test(c6[2]) && (r7 = RegExp("</" + c6[2], "g")), $6 = u5) : void 0 !== c6[3] && ($6 = u5) : $6 === u5 ? ">" === c6[0] ? ($6 = r7 ?? A4, _6 = -1) : void 0 === c6[1] ? _6 = -2 : (_6 = $6.lastIndex - c6[2].length, a6 = c6[1], $6 = void 0 === c6[3] ? u5 : '"' === c6[3] ? f5 : g5) : $6 === f5 || $6 === g5 ? $6 = u5 : $6 === p5 || $6 === d5 ? $6 = A4 : ($6 = u5, r7 = void 0);
    const y6 = $6 === u5 && t7[e8 + 1].startsWith("/>") ? " " : "";
    l6 += $6 === A4 ? s7 + h5 : _6 >= 0 ? (i6.push(a6), s7.slice(0, _6) + n5 + s7.slice(_6) + o5 + y6) : s7 + o5 + (-2 === _6 ? e8 : y6);
  }
  return [M4(t7, l6 + (t7[s6] || "<?>") + (2 === e7 ? "</svg>" : 3 === e7 ? "</math>" : "")), i6];
};
var C4 = class _C {
  constructor({ strings: t7, _$litType$: e7 }, i6) {
    let h6;
    this.parts = [];
    let l6 = 0, a6 = 0;
    const c6 = t7.length - 1, _6 = this.parts, [A5, p6] = w5(t7, e7);
    if (this.el = _C.createElement(A5, i6), T4.currentNode = this.el.content, 2 === e7 || 3 === e7) {
      const t8 = this.el.content.firstChild;
      t8.replaceWith(...t8.childNodes);
    }
    for (; null !== (h6 = T4.nextNode()) && _6.length < c6; ) {
      if (1 === h6.nodeType) {
        if (h6.hasAttributes()) for (const t8 of h6.getAttributeNames()) if (t8.endsWith(n5)) {
          const e8 = p6[a6++], s6 = h6.getAttribute(t8).split(o5), i7 = /([.?@])?(.*)/.exec(e8);
          _6.push({ type: 1, index: l6, name: i7[2], strings: s6, ctor: "." === i7[1] ? R4 : "?" === i7[1] ? j4 : "@" === i7[1] ? B4 : O4 }), h6.removeAttribute(t8);
        } else t8.startsWith(o5) && (_6.push({ type: 6, index: l6 }), h6.removeAttribute(t8));
        if (v5.test(h6.tagName)) {
          const t8 = h6.textContent.split(o5), e8 = t8.length - 1;
          if (e8 > 0) {
            h6.textContent = s5 ? s5.emptyScript : "";
            for (let s6 = 0; s6 < e8; s6++) h6.append(t8[s6], $5()), T4.nextNode(), _6.push({ type: 2, index: ++l6 });
            h6.append(t8[e8], $5());
          }
        }
      } else if (8 === h6.nodeType) if (h6.data === r6) _6.push({ type: 2, index: l6 });
      else {
        let t8 = -1;
        for (; -1 !== (t8 = h6.data.indexOf(o5, t8 + 1)); ) _6.push({ type: 7, index: l6 }), t8 += o5.length - 1;
      }
      l6++;
    }
  }
  static createElement(t7, e7) {
    const s6 = l5.createElement("template");
    return s6.innerHTML = t7, s6;
  }
};
function E5(t7, e7, s6 = t7, i6) {
  if (e7 === N4) return e7;
  let n6 = void 0 !== i6 ? s6._$Co?.[i6] : s6._$Cl;
  const o6 = a5(e7) ? void 0 : e7._$litDirective$;
  return n6?.constructor !== o6 && (n6?._$AO?.(false), void 0 === o6 ? n6 = void 0 : (n6 = new o6(t7), n6._$AT(t7, s6, i6)), void 0 !== i6 ? (s6._$Co ??= [])[i6] = n6 : s6._$Cl = n6), void 0 !== n6 && (e7 = E5(t7, n6._$AS(t7, e7.values), n6, i6)), e7;
}
var I4 = class {
  constructor(t7, e7) {
    this._$AV = [], this._$AN = void 0, this._$AD = t7, this._$AM = e7;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t7) {
    const { el: { content: e7 }, parts: s6 } = this._$AD, i6 = (t7?.creationScope ?? l5).importNode(e7, true);
    T4.currentNode = i6;
    let n6 = T4.nextNode(), o6 = 0, r7 = 0, h6 = s6[0];
    for (; void 0 !== h6; ) {
      if (o6 === h6.index) {
        let e8;
        2 === h6.type ? e8 = new U4(n6, n6.nextSibling, this, t7) : 1 === h6.type ? e8 = new h6.ctor(n6, h6.name, h6.strings, this, t7) : 6 === h6.type && (e8 = new W4(n6, this, t7)), this._$AV.push(e8), h6 = s6[++r7];
      }
      o6 !== h6?.index && (n6 = T4.nextNode(), o6++);
    }
    return T4.currentNode = l5, i6;
  }
  p(t7) {
    let e7 = 0;
    for (const s6 of this._$AV) void 0 !== s6 && (void 0 !== s6.strings ? (s6._$AI(t7, s6, e7), e7 += s6.strings.length - 2) : s6._$AI(t7[e7])), e7++;
  }
};
var U4 = class _U {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t7, e7, s6, i6) {
    this.type = 2, this._$AH = b5, this._$AN = void 0, this._$AA = t7, this._$AB = e7, this._$AM = s6, this.options = i6, this._$Cv = i6?.isConnected ?? true;
  }
  get parentNode() {
    let t7 = this._$AA.parentNode;
    const e7 = this._$AM;
    return void 0 !== e7 && 11 === t7?.nodeType && (t7 = e7.parentNode), t7;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t7, e7 = this) {
    t7 = E5(this, t7, e7), a5(t7) ? t7 === b5 || null == t7 || "" === t7 ? (this._$AH !== b5 && this._$AR(), this._$AH = b5) : t7 !== this._$AH && t7 !== N4 && this._(t7) : void 0 !== t7._$litType$ ? this.$(t7) : void 0 !== t7.nodeType ? this.T(t7) : ((t8) => c5(t8) || "function" == typeof t8?.[Symbol.iterator])(t7) ? this.k(t7) : this._(t7);
  }
  O(t7) {
    return this._$AA.parentNode.insertBefore(t7, this._$AB);
  }
  T(t7) {
    this._$AH !== t7 && (this._$AR(), this._$AH = this.O(t7));
  }
  _(t7) {
    this._$AH !== b5 && a5(this._$AH) ? this._$AA.nextSibling.data = t7 : this.T(l5.createTextNode(t7)), this._$AH = t7;
  }
  $(t7) {
    const { values: e7, _$litType$: s6 } = t7, i6 = "number" == typeof s6 ? this._$AC(t7) : (void 0 === s6.el && (s6.el = C4.createElement(M4(s6.h, s6.h[0]), this.options)), s6);
    if (this._$AH?._$AD === i6) this._$AH.p(e7);
    else {
      const t8 = new I4(i6, this), s7 = t8.u(this.options);
      t8.p(e7), this.T(s7), this._$AH = t8;
    }
  }
  _$AC(t7) {
    let e7 = S5.get(t7.strings);
    return void 0 === e7 && S5.set(t7.strings, e7 = new C4(t7)), e7;
  }
  k(t7) {
    c5(this._$AH) || (this._$AH = [], this._$AR());
    const e7 = this._$AH;
    let s6, i6 = 0;
    for (const n6 of t7) i6 === e7.length ? e7.push(s6 = new _U(this.O($5()), this.O($5()), this, this.options)) : s6 = e7[i6], s6._$AI(n6), i6++;
    i6 < e7.length && (this._$AR(s6 && s6._$AB.nextSibling, i6), e7.length = i6);
  }
  _$AR(t7 = this._$AA.nextSibling, s6) {
    for (this._$AP?.(false, true, s6); t7 !== this._$AB; ) {
      const s7 = e6(t7).nextSibling;
      e6(t7).remove(), t7 = s7;
    }
  }
  setConnected(t7) {
    void 0 === this._$AM && (this._$Cv = t7, this._$AP?.(t7));
  }
};
var O4 = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t7, e7, s6, i6, n6) {
    this.type = 1, this._$AH = b5, this._$AN = void 0, this.element = t7, this.name = e7, this._$AM = i6, this.options = n6, s6.length > 2 || "" !== s6[0] || "" !== s6[1] ? (this._$AH = Array(s6.length - 1).fill(new String()), this.strings = s6) : this._$AH = b5;
  }
  _$AI(t7, e7 = this, s6, i6) {
    const n6 = this.strings;
    let o6 = false;
    if (void 0 === n6) t7 = E5(this, t7, e7, 0), o6 = !a5(t7) || t7 !== this._$AH && t7 !== N4, o6 && (this._$AH = t7);
    else {
      const i7 = t7;
      let r7, h6;
      for (t7 = n6[0], r7 = 0; r7 < n6.length - 1; r7++) h6 = E5(this, i7[s6 + r7], e7, r7), h6 === N4 && (h6 = this._$AH[r7]), o6 ||= !a5(h6) || h6 !== this._$AH[r7], h6 === b5 ? t7 = b5 : t7 !== b5 && (t7 += (h6 ?? "") + n6[r7 + 1]), this._$AH[r7] = h6;
    }
    o6 && !i6 && this.j(t7);
  }
  j(t7) {
    t7 === b5 ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t7 ?? "");
  }
};
var R4 = class extends O4 {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t7) {
    this.element[this.name] = t7 === b5 ? void 0 : t7;
  }
};
var j4 = class extends O4 {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t7) {
    this.element.toggleAttribute(this.name, !!t7 && t7 !== b5);
  }
};
var B4 = class extends O4 {
  constructor(t7, e7, s6, i6, n6) {
    super(t7, e7, s6, i6, n6), this.type = 5;
  }
  _$AI(t7, e7 = this) {
    if ((t7 = E5(this, t7, e7, 0) ?? b5) === N4) return;
    const s6 = this._$AH, i6 = t7 === b5 && s6 !== b5 || t7.capture !== s6.capture || t7.once !== s6.once || t7.passive !== s6.passive, n6 = t7 !== b5 && (s6 === b5 || i6);
    i6 && this.element.removeEventListener(this.name, this, s6), n6 && this.element.addEventListener(this.name, this, t7), this._$AH = t7;
  }
  handleEvent(t7) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t7) : this._$AH.handleEvent(t7);
  }
};
var W4 = class {
  constructor(t7, e7, s6) {
    this.element = t7, this.type = 6, this._$AN = void 0, this._$AM = e7, this.options = s6;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t7) {
    E5(this, t7);
  }
};
var k4 = t6.litHtmlPolyfillSupport;
k4?.(C4, U4), (t6.litHtmlVersions ??= []).push("3.3.2");
var L4 = Symbol.for("");
var P5 = (t7) => {
  if (t7?.r === L4) return t7?._$litStatic$;
};
var V4 = (t7) => ({ _$litStatic$: t7, r: L4 });
var D4 = (t7, ...e7) => ({ _$litStatic$: e7.reduce((e8, s6, i6) => e8 + ((t8) => {
  if (void 0 !== t8._$litStatic$) return t8._$litStatic$;
  throw Error(`Value passed to 'literal' function must be a 'literal' result: ${t8}. Use 'unsafeStatic' to pass non-literal values, but
            take care to ensure page security.`);
})(s6) + t7[i6 + 1], t7[0]), r: L4 });
var z4 = /* @__PURE__ */ new Map();
var Z4 = (t7) => (e7, ...s6) => {
  const i6 = s6.length;
  let n6, o6;
  const r7 = [], h6 = [];
  let l6, $6 = 0, a6 = false;
  for (; $6 < i6; ) {
    for (l6 = e7[$6]; $6 < i6 && void 0 !== (o6 = s6[$6], n6 = P5(o6)); ) l6 += n6 + e7[++$6], a6 = true;
    $6 !== i6 && h6.push(o6), r7.push(l6), $6++;
  }
  if ($6 === i6 && r7.push(e7[i6]), a6) {
    const t8 = r7.join("$$lit$$");
    void 0 === (e7 = z4.get(t8)) && (r7.raw = r7, z4.set(t8, e7 = r7)), s6 = h6;
  }
  return t7(e7, ...s6);
};
var F3 = Z4(y5);
var q3 = Z4(x4);
var G3 = Z4(H4);
export {
  async_directive_exports as AsyncDirective,
  n as CSSResult,
  decorators_exports as Decorators,
  directive_exports as Directive,
  directives_exports as Directives,
  $t as LitElement,
  S as ReactiveElement,
  static_html_exports as StaticHtml,
  ft as _$LE,
  ct as _$LH,
  h as adoptStyles,
  o as css,
  y as defaultConverter,
  a as getCompatibleStyle,
  K as html,
  At as isServer,
  J as mathml,
  Z as noChange,
  v as notEqual,
  G as nothing,
  pt as render,
  e as supportsAdoptingStyleSheets,
  F as svg,
  r as unsafeCSS
};
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
//# sourceMappingURL=lit.js.map
