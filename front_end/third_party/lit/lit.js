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
  constructor(t6, e6, i5) {
    if (this._$cssResult$ = true, i5 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t6, this.t = e6;
  }
  get styleSheet() {
    let t6 = this.o;
    const s5 = this.t;
    if (e && void 0 === t6) {
      const e6 = void 0 !== s5 && 1 === s5.length;
      e6 && (t6 = i.get(s5)), void 0 === t6 && ((this.o = t6 = new CSSStyleSheet()).replaceSync(this.cssText), e6 && i.set(s5, t6));
    }
    return t6;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t6) => new n("string" == typeof t6 ? t6 : t6 + "", void 0, s);
var o = (t6, ...e6) => {
  const i5 = 1 === t6.length ? t6[0] : e6.reduce((e7, s5, i6) => e7 + ((t7) => {
    if (true === t7._$cssResult$) return t7.cssText;
    if ("number" == typeof t7) return t7;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t7 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s5) + t6[i6 + 1], t6[0]);
  return new n(i5, t6, s);
};
var h = (s5, i5) => {
  if (e) s5.adoptedStyleSheets = i5.map((t6) => t6 instanceof CSSStyleSheet ? t6 : t6.styleSheet);
  else for (const e6 of i5) {
    const i6 = document.createElement("style"), n5 = t.litNonce;
    void 0 !== n5 && i6.setAttribute("nonce", n5), i6.textContent = e6.cssText, s5.appendChild(i6);
  }
};
var a = e ? (t6) => t6 : (t6) => t6 instanceof CSSStyleSheet ? ((t7) => {
  let e6 = "";
  for (const s5 of t7.cssRules) e6 += s5.cssText;
  return r(e6);
})(t6) : t6;
var { is: l, defineProperty: c, getOwnPropertyDescriptor: d, getOwnPropertyNames: p, getOwnPropertySymbols: u, getPrototypeOf: $ } = Object;
var _ = globalThis;
var f = _.trustedTypes;
var A = f ? f.emptyScript : "";
var m = _.reactiveElementPolyfillSupport;
var g = (t6, e6) => t6;
var y = { toAttribute(t6, e6) {
  switch (e6) {
    case Boolean:
      t6 = t6 ? A : null;
      break;
    case Object:
    case Array:
      t6 = null == t6 ? t6 : JSON.stringify(t6);
  }
  return t6;
}, fromAttribute(t6, e6) {
  let s5 = t6;
  switch (e6) {
    case Boolean:
      s5 = null !== t6;
      break;
    case Number:
      s5 = null === t6 ? null : Number(t6);
      break;
    case Object:
    case Array:
      try {
        s5 = JSON.parse(t6);
      } catch (t7) {
        s5 = null;
      }
  }
  return s5;
} };
var v = (t6, e6) => !l(t6, e6);
var E = { attribute: true, type: String, converter: y, reflect: false, useDefault: false, hasChanged: v };
Symbol.metadata ??= Symbol("metadata"), _.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var S = class extends HTMLElement {
  static addInitializer(t6) {
    this._$Ei(), (this.l ??= []).push(t6);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t6, e6 = E) {
    if (e6.state && (e6.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t6) && ((e6 = Object.create(e6)).wrapped = true), this.elementProperties.set(t6, e6), !e6.noAccessor) {
      const s5 = Symbol(), i5 = this.getPropertyDescriptor(t6, s5, e6);
      void 0 !== i5 && c(this.prototype, t6, i5);
    }
  }
  static getPropertyDescriptor(t6, e6, s5) {
    const { get: i5, set: n5 } = d(this.prototype, t6) ?? { get() {
      return this[e6];
    }, set(t7) {
      this[e6] = t7;
    } };
    return { get: i5, set(e7) {
      const r6 = i5?.call(this);
      n5?.call(this, e7), this.requestUpdate(t6, r6, s5);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t6) {
    return this.elementProperties.get(t6) ?? E;
  }
  static _$Ei() {
    if (this.hasOwnProperty(g("elementProperties"))) return;
    const t6 = $(this);
    t6.finalize(), void 0 !== t6.l && (this.l = [...t6.l]), this.elementProperties = new Map(t6.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(g("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(g("properties"))) {
      const t7 = this.properties, e6 = [...p(t7), ...u(t7)];
      for (const s5 of e6) this.createProperty(s5, t7[s5]);
    }
    const t6 = this[Symbol.metadata];
    if (null !== t6) {
      const e6 = litPropertyMetadata.get(t6);
      if (void 0 !== e6) for (const [t7, s5] of e6) this.elementProperties.set(t7, s5);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t7, e6] of this.elementProperties) {
      const s5 = this._$Eu(t7, e6);
      void 0 !== s5 && this._$Eh.set(s5, t7);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(t6) {
    const e6 = [];
    if (Array.isArray(t6)) {
      const s5 = new Set(t6.flat(1 / 0).reverse());
      for (const t7 of s5) e6.unshift(a(t7));
    } else void 0 !== t6 && e6.push(a(t6));
    return e6;
  }
  static _$Eu(t6, e6) {
    const s5 = e6.attribute;
    return false === s5 ? void 0 : "string" == typeof s5 ? s5 : "string" == typeof t6 ? t6.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t6) => this.enableUpdating = t6), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t6) => t6(this));
  }
  addController(t6) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t6), void 0 !== this.renderRoot && this.isConnected && t6.hostConnected?.();
  }
  removeController(t6) {
    this._$EO?.delete(t6);
  }
  _$E_() {
    const t6 = /* @__PURE__ */ new Map(), e6 = this.constructor.elementProperties;
    for (const s5 of e6.keys()) this.hasOwnProperty(s5) && (t6.set(s5, this[s5]), delete this[s5]);
    t6.size > 0 && (this._$Ep = t6);
  }
  createRenderRoot() {
    const t6 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return h(t6, this.constructor.elementStyles), t6;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t6) => t6.hostConnected?.());
  }
  enableUpdating(t6) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t6) => t6.hostDisconnected?.());
  }
  attributeChangedCallback(t6, e6, s5) {
    this._$AK(t6, s5);
  }
  _$ET(t6, e6) {
    const s5 = this.constructor.elementProperties.get(t6), i5 = this.constructor._$Eu(t6, s5);
    if (void 0 !== i5 && true === s5.reflect) {
      const n5 = (void 0 !== s5.converter?.toAttribute ? s5.converter : y).toAttribute(e6, s5.type);
      this._$Em = t6, null == n5 ? this.removeAttribute(i5) : this.setAttribute(i5, n5), this._$Em = null;
    }
  }
  _$AK(t6, e6) {
    const s5 = this.constructor, i5 = s5._$Eh.get(t6);
    if (void 0 !== i5 && this._$Em !== i5) {
      const t7 = s5.getPropertyOptions(i5), n5 = "function" == typeof t7.converter ? { fromAttribute: t7.converter } : void 0 !== t7.converter?.fromAttribute ? t7.converter : y;
      this._$Em = i5;
      const r6 = n5.fromAttribute(e6, t7.type);
      this[i5] = r6 ?? this._$Ej?.get(i5) ?? r6, this._$Em = null;
    }
  }
  requestUpdate(t6, e6, s5) {
    if (void 0 !== t6) {
      const i5 = this.constructor, n5 = this[t6];
      if (s5 ??= i5.getPropertyOptions(t6), !((s5.hasChanged ?? v)(n5, e6) || s5.useDefault && s5.reflect && n5 === this._$Ej?.get(t6) && !this.hasAttribute(i5._$Eu(t6, s5)))) return;
      this.C(t6, e6, s5);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t6, e6, { useDefault: s5, reflect: i5, wrapped: n5 }, r6) {
    s5 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t6) && (this._$Ej.set(t6, r6 ?? e6 ?? this[t6]), true !== n5 || void 0 !== r6) || (this._$AL.has(t6) || (this.hasUpdated || s5 || (e6 = void 0), this._$AL.set(t6, e6)), true === i5 && this._$Em !== t6 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t6));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t7) {
      Promise.reject(t7);
    }
    const t6 = this.scheduleUpdate();
    return null != t6 && await t6, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t8, e7] of this._$Ep) this[t8] = e7;
        this._$Ep = void 0;
      }
      const t7 = this.constructor.elementProperties;
      if (t7.size > 0) for (const [e7, s5] of t7) {
        const { wrapped: t8 } = s5, i5 = this[e7];
        true !== t8 || this._$AL.has(e7) || void 0 === i5 || this.C(e7, void 0, s5, i5);
      }
    }
    let t6 = false;
    const e6 = this._$AL;
    try {
      t6 = this.shouldUpdate(e6), t6 ? (this.willUpdate(e6), this._$EO?.forEach((t7) => t7.hostUpdate?.()), this.update(e6)) : this._$EM();
    } catch (e7) {
      throw t6 = false, this._$EM(), e7;
    }
    t6 && this._$AE(e6);
  }
  willUpdate(t6) {
  }
  _$AE(t6) {
    this._$EO?.forEach((t7) => t7.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t6)), this.updated(t6);
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
  shouldUpdate(t6) {
    return true;
  }
  update(t6) {
    this._$Eq &&= this._$Eq.forEach((t7) => this._$ET(t7, this[t7])), this._$EM();
  }
  updated(t6) {
  }
  firstUpdated(t6) {
  }
};
S.elementStyles = [], S.shadowRootOptions = { mode: "open" }, S[g("elementProperties")] = /* @__PURE__ */ new Map(), S[g("finalized")] = /* @__PURE__ */ new Map(), m?.({ ReactiveElement: S }), (_.reactiveElementVersions ??= []).push("2.1.1");
var b = globalThis;
var C = b.trustedTypes;
var w = C ? C.createPolicy("lit-html", { createHTML: (t6) => t6 }) : void 0;
var P = "$lit$";
var U = `lit$${Math.random().toFixed(9).slice(2)}$`;
var x = "?" + U;
var H = `<${x}>`;
var O = document;
var M = () => O.createComment("");
var N = (t6) => null === t6 || "object" != typeof t6 && "function" != typeof t6;
var R = Array.isArray;
var T = (t6) => R(t6) || "function" == typeof t6?.[Symbol.iterator];
var L = "[ 	\n\f\r]";
var k = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var D = /-->/g;
var j = />/g;
var z = RegExp(`>|${L}(?:([^\\s"'>=/]+)(${L}*=${L}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var B = /'/g;
var I = /"/g;
var V = /^(?:script|style|textarea|title)$/i;
var W = (t6) => (e6, ...s5) => ({ _$litType$: t6, strings: e6, values: s5 });
var q = W(1);
var K = W(2);
var F = W(3);
var J = Symbol.for("lit-noChange");
var Z = Symbol.for("lit-nothing");
var G = /* @__PURE__ */ new WeakMap();
var Q = O.createTreeWalker(O, 129);
function X(t6, e6) {
  if (!R(t6) || !t6.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== w ? w.createHTML(e6) : e6;
}
var Y = (t6, e6) => {
  const s5 = t6.length - 1, i5 = [];
  let n5, r6 = 2 === e6 ? "<svg>" : 3 === e6 ? "<math>" : "", o5 = k;
  for (let e7 = 0; e7 < s5; e7++) {
    const s6 = t6[e7];
    let h5, a5, l5 = -1, c5 = 0;
    for (; c5 < s6.length && (o5.lastIndex = c5, a5 = o5.exec(s6), null !== a5); ) c5 = o5.lastIndex, o5 === k ? "!--" === a5[1] ? o5 = D : void 0 !== a5[1] ? o5 = j : void 0 !== a5[2] ? (V.test(a5[2]) && (n5 = RegExp("</" + a5[2], "g")), o5 = z) : void 0 !== a5[3] && (o5 = z) : o5 === z ? ">" === a5[0] ? (o5 = n5 ?? k, l5 = -1) : void 0 === a5[1] ? l5 = -2 : (l5 = o5.lastIndex - a5[2].length, h5 = a5[1], o5 = void 0 === a5[3] ? z : '"' === a5[3] ? I : B) : o5 === I || o5 === B ? o5 = z : o5 === D || o5 === j ? o5 = k : (o5 = z, n5 = void 0);
    const d5 = o5 === z && t6[e7 + 1].startsWith("/>") ? " " : "";
    r6 += o5 === k ? s6 + H : l5 >= 0 ? (i5.push(h5), s6.slice(0, l5) + P + s6.slice(l5) + U + d5) : s6 + U + (-2 === l5 ? e7 : d5);
  }
  return [X(t6, r6 + (t6[s5] || "<?>") + (2 === e6 ? "</svg>" : 3 === e6 ? "</math>" : "")), i5];
};
var tt = class _tt {
  constructor({ strings: t6, _$litType$: e6 }, s5) {
    let i5;
    this.parts = [];
    let n5 = 0, r6 = 0;
    const o5 = t6.length - 1, h5 = this.parts, [a5, l5] = Y(t6, e6);
    if (this.el = _tt.createElement(a5, s5), Q.currentNode = this.el.content, 2 === e6 || 3 === e6) {
      const t7 = this.el.content.firstChild;
      t7.replaceWith(...t7.childNodes);
    }
    for (; null !== (i5 = Q.nextNode()) && h5.length < o5; ) {
      if (1 === i5.nodeType) {
        if (i5.hasAttributes()) for (const t7 of i5.getAttributeNames()) if (t7.endsWith(P)) {
          const e7 = l5[r6++], s6 = i5.getAttribute(t7).split(U), o6 = /([.?@])?(.*)/.exec(e7);
          h5.push({ type: 1, index: n5, name: o6[2], strings: s6, ctor: "." === o6[1] ? rt : "?" === o6[1] ? ot : "@" === o6[1] ? ht : nt }), i5.removeAttribute(t7);
        } else t7.startsWith(U) && (h5.push({ type: 6, index: n5 }), i5.removeAttribute(t7));
        if (V.test(i5.tagName)) {
          const t7 = i5.textContent.split(U), e7 = t7.length - 1;
          if (e7 > 0) {
            i5.textContent = C ? C.emptyScript : "";
            for (let s6 = 0; s6 < e7; s6++) i5.append(t7[s6], M()), Q.nextNode(), h5.push({ type: 2, index: ++n5 });
            i5.append(t7[e7], M());
          }
        }
      } else if (8 === i5.nodeType) if (i5.data === x) h5.push({ type: 2, index: n5 });
      else {
        let t7 = -1;
        for (; -1 !== (t7 = i5.data.indexOf(U, t7 + 1)); ) h5.push({ type: 7, index: n5 }), t7 += U.length - 1;
      }
      n5++;
    }
  }
  static createElement(t6, e6) {
    const s5 = O.createElement("template");
    return s5.innerHTML = t6, s5;
  }
};
function et(t6, e6, s5 = t6, i5) {
  if (e6 === J) return e6;
  let n5 = void 0 !== i5 ? s5._$Co?.[i5] : s5._$Cl;
  const r6 = N(e6) ? void 0 : e6._$litDirective$;
  return n5?.constructor !== r6 && (n5?._$AO?.(false), void 0 === r6 ? n5 = void 0 : (n5 = new r6(t6), n5._$AT(t6, s5, i5)), void 0 !== i5 ? (s5._$Co ??= [])[i5] = n5 : s5._$Cl = n5), void 0 !== n5 && (e6 = et(t6, n5._$AS(t6, e6.values), n5, i5)), e6;
}
var st = class {
  constructor(t6, e6) {
    this._$AV = [], this._$AN = void 0, this._$AD = t6, this._$AM = e6;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t6) {
    const { el: { content: e6 }, parts: s5 } = this._$AD, i5 = (t6?.creationScope ?? O).importNode(e6, true);
    Q.currentNode = i5;
    let n5 = Q.nextNode(), r6 = 0, o5 = 0, h5 = s5[0];
    for (; void 0 !== h5; ) {
      if (r6 === h5.index) {
        let e7;
        2 === h5.type ? e7 = new it(n5, n5.nextSibling, this, t6) : 1 === h5.type ? e7 = new h5.ctor(n5, h5.name, h5.strings, this, t6) : 6 === h5.type && (e7 = new at(n5, this, t6)), this._$AV.push(e7), h5 = s5[++o5];
      }
      r6 !== h5?.index && (n5 = Q.nextNode(), r6++);
    }
    return Q.currentNode = O, i5;
  }
  p(t6) {
    let e6 = 0;
    for (const s5 of this._$AV) void 0 !== s5 && (void 0 !== s5.strings ? (s5._$AI(t6, s5, e6), e6 += s5.strings.length - 2) : s5._$AI(t6[e6])), e6++;
  }
};
var it = class _it {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t6, e6, s5, i5) {
    this.type = 2, this._$AH = Z, this._$AN = void 0, this._$AA = t6, this._$AB = e6, this._$AM = s5, this.options = i5, this._$Cv = i5?.isConnected ?? true;
  }
  get parentNode() {
    let t6 = this._$AA.parentNode;
    const e6 = this._$AM;
    return void 0 !== e6 && 11 === t6?.nodeType && (t6 = e6.parentNode), t6;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t6, e6 = this) {
    t6 = et(this, t6, e6), N(t6) ? t6 === Z || null == t6 || "" === t6 ? (this._$AH !== Z && this._$AR(), this._$AH = Z) : t6 !== this._$AH && t6 !== J && this._(t6) : void 0 !== t6._$litType$ ? this.$(t6) : void 0 !== t6.nodeType ? this.T(t6) : T(t6) ? this.k(t6) : this._(t6);
  }
  O(t6) {
    return this._$AA.parentNode.insertBefore(t6, this._$AB);
  }
  T(t6) {
    this._$AH !== t6 && (this._$AR(), this._$AH = this.O(t6));
  }
  _(t6) {
    this._$AH !== Z && N(this._$AH) ? this._$AA.nextSibling.data = t6 : this.T(O.createTextNode(t6)), this._$AH = t6;
  }
  $(t6) {
    const { values: e6, _$litType$: s5 } = t6, i5 = "number" == typeof s5 ? this._$AC(t6) : (void 0 === s5.el && (s5.el = tt.createElement(X(s5.h, s5.h[0]), this.options)), s5);
    if (this._$AH?._$AD === i5) this._$AH.p(e6);
    else {
      const t7 = new st(i5, this), s6 = t7.u(this.options);
      t7.p(e6), this.T(s6), this._$AH = t7;
    }
  }
  _$AC(t6) {
    let e6 = G.get(t6.strings);
    return void 0 === e6 && G.set(t6.strings, e6 = new tt(t6)), e6;
  }
  k(t6) {
    R(this._$AH) || (this._$AH = [], this._$AR());
    const e6 = this._$AH;
    let s5, i5 = 0;
    for (const n5 of t6) i5 === e6.length ? e6.push(s5 = new _it(this.O(M()), this.O(M()), this, this.options)) : s5 = e6[i5], s5._$AI(n5), i5++;
    i5 < e6.length && (this._$AR(s5 && s5._$AB.nextSibling, i5), e6.length = i5);
  }
  _$AR(t6 = this._$AA.nextSibling, e6) {
    for (this._$AP?.(false, true, e6); t6 !== this._$AB; ) {
      const e7 = t6.nextSibling;
      t6.remove(), t6 = e7;
    }
  }
  setConnected(t6) {
    void 0 === this._$AM && (this._$Cv = t6, this._$AP?.(t6));
  }
};
var nt = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t6, e6, s5, i5, n5) {
    this.type = 1, this._$AH = Z, this._$AN = void 0, this.element = t6, this.name = e6, this._$AM = i5, this.options = n5, s5.length > 2 || "" !== s5[0] || "" !== s5[1] ? (this._$AH = Array(s5.length - 1).fill(new String()), this.strings = s5) : this._$AH = Z;
  }
  _$AI(t6, e6 = this, s5, i5) {
    const n5 = this.strings;
    let r6 = false;
    if (void 0 === n5) t6 = et(this, t6, e6, 0), r6 = !N(t6) || t6 !== this._$AH && t6 !== J, r6 && (this._$AH = t6);
    else {
      const i6 = t6;
      let o5, h5;
      for (t6 = n5[0], o5 = 0; o5 < n5.length - 1; o5++) h5 = et(this, i6[s5 + o5], e6, o5), h5 === J && (h5 = this._$AH[o5]), r6 ||= !N(h5) || h5 !== this._$AH[o5], h5 === Z ? t6 = Z : t6 !== Z && (t6 += (h5 ?? "") + n5[o5 + 1]), this._$AH[o5] = h5;
    }
    r6 && !i5 && this.j(t6);
  }
  j(t6) {
    t6 === Z ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t6 ?? "");
  }
};
var rt = class extends nt {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t6) {
    this.element[this.name] = t6 === Z ? void 0 : t6;
  }
};
var ot = class extends nt {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t6) {
    this.element.toggleAttribute(this.name, !!t6 && t6 !== Z);
  }
};
var ht = class extends nt {
  constructor(t6, e6, s5, i5, n5) {
    super(t6, e6, s5, i5, n5), this.type = 5;
  }
  _$AI(t6, e6 = this) {
    if ((t6 = et(this, t6, e6, 0) ?? Z) === J) return;
    const s5 = this._$AH, i5 = t6 === Z && s5 !== Z || t6.capture !== s5.capture || t6.once !== s5.once || t6.passive !== s5.passive, n5 = t6 !== Z && (s5 === Z || i5);
    i5 && this.element.removeEventListener(this.name, this, s5), n5 && this.element.addEventListener(this.name, this, t6), this._$AH = t6;
  }
  handleEvent(t6) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t6) : this._$AH.handleEvent(t6);
  }
};
var at = class {
  constructor(t6, e6, s5) {
    this.element = t6, this.type = 6, this._$AN = void 0, this._$AM = e6, this.options = s5;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t6) {
    et(this, t6);
  }
};
var lt = { M: P, P: U, A: x, C: 1, L: Y, R: st, D: T, V: et, I: it, H: nt, N: ot, U: ht, B: rt, F: at };
var ct = b.litHtmlPolyfillSupport;
ct?.(tt, it), (b.litHtmlVersions ??= []).push("3.3.1");
var dt = (t6, e6, s5) => {
  const i5 = s5?.renderBefore ?? e6;
  let n5 = i5._$litPart$;
  if (void 0 === n5) {
    const t7 = s5?.renderBefore ?? null;
    i5._$litPart$ = n5 = new it(e6.insertBefore(M(), t7), t7, void 0, s5 ?? {});
  }
  return n5._$AI(t6), n5;
};
var pt = globalThis;
var ut = class extends S {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t6 = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t6.firstChild, t6;
  }
  update(t6) {
    const e6 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t6), this._$Do = dt(e6, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(true);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(false);
  }
  render() {
    return J;
  }
};
ut._$litElement$ = true, ut.finalized = true, pt.litElementHydrateSupport?.({ LitElement: ut });
var $t = pt.litElementPolyfillSupport;
$t?.({ LitElement: ut });
var _t = { _$AK: (t6, e6, s5) => {
  t6._$AK(e6, s5);
}, _$AL: (t6) => t6._$AL };
(pt.litElementVersions ??= []).push("4.2.1");
var ft = false;

// gen/front_end/third_party/lit/lib/directives.js
var directives_exports = {};
__export(directives_exports, {
  UnsafeHTMLDirective: () => it2,
  UntilDirective: () => ft2,
  classMap: () => R2,
  createRef: () => vt,
  ifDefined: () => W2,
  live: () => F2,
  ref: () => mt,
  repeat: () => J2,
  styleMap: () => st2,
  unsafeHTML: () => nt2,
  until: () => pt2
});
var t2 = globalThis;
var e2 = t2.trustedTypes;
var s2 = e2 ? e2.createPolicy("lit-html", { createHTML: (t6) => t6 }) : void 0;
var i2 = "$lit$";
var n2 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var r2 = "?" + n2;
var o2 = `<${r2}>`;
var h2 = document;
var l2 = () => h2.createComment("");
var c2 = (t6) => null === t6 || "object" != typeof t6 && "function" != typeof t6;
var a2 = Array.isArray;
var d2 = "[ 	\n\f\r]";
var u2 = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var $2 = /-->/g;
var _2 = />/g;
var A2 = RegExp(`>|${d2}(?:([^\\s"'>=/]+)(${d2}*=${d2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var f2 = /'/g;
var p2 = /"/g;
var v2 = /^(?:script|style|textarea|title)$/i;
var g2 = Symbol.for("lit-noChange");
var y2 = Symbol.for("lit-nothing");
var m2 = /* @__PURE__ */ new WeakMap();
var b2 = h2.createTreeWalker(h2, 129);
function C2(t6, e6) {
  if (!a2(t6) || !t6.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== s2 ? s2.createHTML(e6) : e6;
}
var x2 = class _x {
  constructor({ strings: t6, _$litType$: s5 }, h5) {
    let c5;
    this.parts = [];
    let a5 = 0, d5 = 0;
    const g5 = t6.length - 1, y5 = this.parts, [m5, w5] = ((t7, e6) => {
      const s6 = t7.length - 1, r6 = [];
      let h6, l5 = 2 === e6 ? "<svg>" : 3 === e6 ? "<math>" : "", c6 = u2;
      for (let e7 = 0; e7 < s6; e7++) {
        const s7 = t7[e7];
        let a6, d6, g6 = -1, y6 = 0;
        for (; y6 < s7.length && (c6.lastIndex = y6, d6 = c6.exec(s7), null !== d6); ) y6 = c6.lastIndex, c6 === u2 ? "!--" === d6[1] ? c6 = $2 : void 0 !== d6[1] ? c6 = _2 : void 0 !== d6[2] ? (v2.test(d6[2]) && (h6 = RegExp("</" + d6[2], "g")), c6 = A2) : void 0 !== d6[3] && (c6 = A2) : c6 === A2 ? ">" === d6[0] ? (c6 = h6 ?? u2, g6 = -1) : void 0 === d6[1] ? g6 = -2 : (g6 = c6.lastIndex - d6[2].length, a6 = d6[1], c6 = void 0 === d6[3] ? A2 : '"' === d6[3] ? p2 : f2) : c6 === p2 || c6 === f2 ? c6 = A2 : c6 === $2 || c6 === _2 ? c6 = u2 : (c6 = A2, h6 = void 0);
        const m6 = c6 === A2 && t7[e7 + 1].startsWith("/>") ? " " : "";
        l5 += c6 === u2 ? s7 + o2 : g6 >= 0 ? (r6.push(a6), s7.slice(0, g6) + i2 + s7.slice(g6) + n2 + m6) : s7 + n2 + (-2 === g6 ? e7 : m6);
      }
      return [C2(t7, l5 + (t7[s6] || "<?>") + (2 === e6 ? "</svg>" : 3 === e6 ? "</math>" : "")), r6];
    })(t6, s5);
    if (this.el = _x.createElement(m5, h5), b2.currentNode = this.el.content, 2 === s5 || 3 === s5) {
      const t7 = this.el.content.firstChild;
      t7.replaceWith(...t7.childNodes);
    }
    for (; null !== (c5 = b2.nextNode()) && y5.length < g5; ) {
      if (1 === c5.nodeType) {
        if (c5.hasAttributes()) for (const t7 of c5.getAttributeNames()) if (t7.endsWith(i2)) {
          const e6 = w5[d5++], s6 = c5.getAttribute(t7).split(n2), i5 = /([.?@])?(.*)/.exec(e6);
          y5.push({ type: 1, index: a5, name: i5[2], strings: s6, ctor: "." === i5[1] ? T2 : "?" === i5[1] ? S2 : "@" === i5[1] ? E2 : M2 }), c5.removeAttribute(t7);
        } else t7.startsWith(n2) && (y5.push({ type: 6, index: a5 }), c5.removeAttribute(t7));
        if (v2.test(c5.tagName)) {
          const t7 = c5.textContent.split(n2), s6 = t7.length - 1;
          if (s6 > 0) {
            c5.textContent = e2 ? e2.emptyScript : "";
            for (let e6 = 0; e6 < s6; e6++) c5.append(t7[e6], l2()), b2.nextNode(), y5.push({ type: 2, index: ++a5 });
            c5.append(t7[s6], l2());
          }
        }
      } else if (8 === c5.nodeType) if (c5.data === r2) y5.push({ type: 2, index: a5 });
      else {
        let t7 = -1;
        for (; -1 !== (t7 = c5.data.indexOf(n2, t7 + 1)); ) y5.push({ type: 7, index: a5 }), t7 += n2.length - 1;
      }
      a5++;
    }
  }
  static createElement(t6, e6) {
    const s5 = h2.createElement("template");
    return s5.innerHTML = t6, s5;
  }
};
function w2(t6, e6, s5 = t6, i5) {
  if (e6 === g2) return e6;
  let n5 = void 0 !== i5 ? s5._$Co?.[i5] : s5._$Cl;
  const r6 = c2(e6) ? void 0 : e6._$litDirective$;
  return n5?.constructor !== r6 && (n5?._$AO?.(false), void 0 === r6 ? n5 = void 0 : (n5 = new r6(t6), n5._$AT(t6, s5, i5)), void 0 !== i5 ? (s5._$Co ??= [])[i5] = n5 : s5._$Cl = n5), void 0 !== n5 && (e6 = w2(t6, n5._$AS(t6, e6.values), n5, i5)), e6;
}
var H2 = class {
  constructor(t6, e6) {
    this._$AV = [], this._$AN = void 0, this._$AD = t6, this._$AM = e6;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t6) {
    const { el: { content: e6 }, parts: s5 } = this._$AD, i5 = (t6?.creationScope ?? h2).importNode(e6, true);
    b2.currentNode = i5;
    let n5 = b2.nextNode(), r6 = 0, o5 = 0, l5 = s5[0];
    for (; void 0 !== l5; ) {
      if (r6 === l5.index) {
        let e7;
        2 === l5.type ? e7 = new N2(n5, n5.nextSibling, this, t6) : 1 === l5.type ? e7 = new l5.ctor(n5, l5.name, l5.strings, this, t6) : 6 === l5.type && (e7 = new G2(n5, this, t6)), this._$AV.push(e7), l5 = s5[++o5];
      }
      r6 !== l5?.index && (n5 = b2.nextNode(), r6++);
    }
    return b2.currentNode = h2, i5;
  }
  p(t6) {
    let e6 = 0;
    for (const s5 of this._$AV) void 0 !== s5 && (void 0 !== s5.strings ? (s5._$AI(t6, s5, e6), e6 += s5.strings.length - 2) : s5._$AI(t6[e6])), e6++;
  }
};
var N2 = class _N {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t6, e6, s5, i5) {
    this.type = 2, this._$AH = y2, this._$AN = void 0, this._$AA = t6, this._$AB = e6, this._$AM = s5, this.options = i5, this._$Cv = i5?.isConnected ?? true;
  }
  get parentNode() {
    let t6 = this._$AA.parentNode;
    const e6 = this._$AM;
    return void 0 !== e6 && 11 === t6?.nodeType && (t6 = e6.parentNode), t6;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t6, e6 = this) {
    t6 = w2(this, t6, e6), c2(t6) ? t6 === y2 || null == t6 || "" === t6 ? (this._$AH !== y2 && this._$AR(), this._$AH = y2) : t6 !== this._$AH && t6 !== g2 && this._(t6) : void 0 !== t6._$litType$ ? this.$(t6) : void 0 !== t6.nodeType ? this.T(t6) : ((t7) => a2(t7) || "function" == typeof t7?.[Symbol.iterator])(t6) ? this.k(t6) : this._(t6);
  }
  O(t6) {
    return this._$AA.parentNode.insertBefore(t6, this._$AB);
  }
  T(t6) {
    this._$AH !== t6 && (this._$AR(), this._$AH = this.O(t6));
  }
  _(t6) {
    this._$AH !== y2 && c2(this._$AH) ? this._$AA.nextSibling.data = t6 : this.T(h2.createTextNode(t6)), this._$AH = t6;
  }
  $(t6) {
    const { values: e6, _$litType$: s5 } = t6, i5 = "number" == typeof s5 ? this._$AC(t6) : (void 0 === s5.el && (s5.el = x2.createElement(C2(s5.h, s5.h[0]), this.options)), s5);
    if (this._$AH?._$AD === i5) this._$AH.p(e6);
    else {
      const t7 = new H2(i5, this), s6 = t7.u(this.options);
      t7.p(e6), this.T(s6), this._$AH = t7;
    }
  }
  _$AC(t6) {
    let e6 = m2.get(t6.strings);
    return void 0 === e6 && m2.set(t6.strings, e6 = new x2(t6)), e6;
  }
  k(t6) {
    a2(this._$AH) || (this._$AH = [], this._$AR());
    const e6 = this._$AH;
    let s5, i5 = 0;
    for (const n5 of t6) i5 === e6.length ? e6.push(s5 = new _N(this.O(l2()), this.O(l2()), this, this.options)) : s5 = e6[i5], s5._$AI(n5), i5++;
    i5 < e6.length && (this._$AR(s5 && s5._$AB.nextSibling, i5), e6.length = i5);
  }
  _$AR(t6 = this._$AA.nextSibling, e6) {
    for (this._$AP?.(false, true, e6); t6 !== this._$AB; ) {
      const e7 = t6.nextSibling;
      t6.remove(), t6 = e7;
    }
  }
  setConnected(t6) {
    void 0 === this._$AM && (this._$Cv = t6, this._$AP?.(t6));
  }
};
var M2 = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t6, e6, s5, i5, n5) {
    this.type = 1, this._$AH = y2, this._$AN = void 0, this.element = t6, this.name = e6, this._$AM = i5, this.options = n5, s5.length > 2 || "" !== s5[0] || "" !== s5[1] ? (this._$AH = Array(s5.length - 1).fill(new String()), this.strings = s5) : this._$AH = y2;
  }
  _$AI(t6, e6 = this, s5, i5) {
    const n5 = this.strings;
    let r6 = false;
    if (void 0 === n5) t6 = w2(this, t6, e6, 0), r6 = !c2(t6) || t6 !== this._$AH && t6 !== g2, r6 && (this._$AH = t6);
    else {
      const i6 = t6;
      let o5, h5;
      for (t6 = n5[0], o5 = 0; o5 < n5.length - 1; o5++) h5 = w2(this, i6[s5 + o5], e6, o5), h5 === g2 && (h5 = this._$AH[o5]), r6 ||= !c2(h5) || h5 !== this._$AH[o5], h5 === y2 ? t6 = y2 : t6 !== y2 && (t6 += (h5 ?? "") + n5[o5 + 1]), this._$AH[o5] = h5;
    }
    r6 && !i5 && this.j(t6);
  }
  j(t6) {
    t6 === y2 ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t6 ?? "");
  }
};
var T2 = class extends M2 {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t6) {
    this.element[this.name] = t6 === y2 ? void 0 : t6;
  }
};
var S2 = class extends M2 {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t6) {
    this.element.toggleAttribute(this.name, !!t6 && t6 !== y2);
  }
};
var E2 = class extends M2 {
  constructor(t6, e6, s5, i5, n5) {
    super(t6, e6, s5, i5, n5), this.type = 5;
  }
  _$AI(t6, e6 = this) {
    if ((t6 = w2(this, t6, e6, 0) ?? y2) === g2) return;
    const s5 = this._$AH, i5 = t6 === y2 && s5 !== y2 || t6.capture !== s5.capture || t6.once !== s5.once || t6.passive !== s5.passive, n5 = t6 !== y2 && (s5 === y2 || i5);
    i5 && this.element.removeEventListener(this.name, this, s5), n5 && this.element.addEventListener(this.name, this, t6), this._$AH = t6;
  }
  handleEvent(t6) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t6) : this._$AH.handleEvent(t6);
  }
};
var G2 = class {
  constructor(t6, e6, s5) {
    this.element = t6, this.type = 6, this._$AN = void 0, this._$AM = e6, this.options = s5;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t6) {
    w2(this, t6);
  }
};
var I2 = { I: N2 };
var U2 = t2.litHtmlPolyfillSupport;
U2?.(x2, N2), (t2.litHtmlVersions ??= []).push("3.3.1");
var k2 = 1;
var O2 = 2;
var P2 = 3;
var j2 = 4;
var B2 = (t6) => (...e6) => ({ _$litDirective$: t6, values: e6 });
var L2 = class {
  constructor(t6) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t6, e6, s5) {
    this._$Ct = t6, this._$AM = e6, this._$Ci = s5;
  }
  _$AS(t6, e6) {
    return this.update(t6, e6);
  }
  update(t6, e6) {
    return this.render(...e6);
  }
};
var R2 = B2(class extends L2 {
  constructor(t6) {
    if (super(t6), t6.type !== k2 || "class" !== t6.name || t6.strings?.length > 2) throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.");
  }
  render(t6) {
    return " " + Object.keys(t6).filter((e6) => t6[e6]).join(" ") + " ";
  }
  update(t6, [e6]) {
    if (void 0 === this.st) {
      this.st = /* @__PURE__ */ new Set(), void 0 !== t6.strings && (this.nt = new Set(t6.strings.join(" ").split(/\s/).filter((t7) => "" !== t7)));
      for (const t7 in e6) e6[t7] && !this.nt?.has(t7) && this.st.add(t7);
      return this.render(e6);
    }
    const s5 = t6.element.classList;
    for (const t7 of this.st) t7 in e6 || (s5.remove(t7), this.st.delete(t7));
    for (const t7 in e6) {
      const i5 = !!e6[t7];
      i5 === this.st.has(t7) || this.nt?.has(t7) || (i5 ? (s5.add(t7), this.st.add(t7)) : (s5.remove(t7), this.st.delete(t7)));
    }
    return g2;
  }
});
var W2 = (t6) => t6 ?? y2;
var { I: D2 } = I2;
var Z2 = (t6) => void 0 === t6.strings;
var V2 = () => document.createComment("");
var z2 = (t6, e6, s5) => {
  const i5 = t6._$AA.parentNode, n5 = void 0 === e6 ? t6._$AB : e6._$AA;
  if (void 0 === s5) {
    const e7 = i5.insertBefore(V2(), n5), r6 = i5.insertBefore(V2(), n5);
    s5 = new D2(e7, r6, t6, t6.options);
  } else {
    const e7 = s5._$AB.nextSibling, r6 = s5._$AM, o5 = r6 !== t6;
    if (o5) {
      let e8;
      s5._$AQ?.(t6), s5._$AM = t6, void 0 !== s5._$AP && (e8 = t6._$AU) !== r6._$AU && s5._$AP(e8);
    }
    if (e7 !== n5 || o5) {
      let t7 = s5._$AA;
      for (; t7 !== e7; ) {
        const e8 = t7.nextSibling;
        i5.insertBefore(t7, n5), t7 = e8;
      }
    }
  }
  return s5;
};
var K2 = (t6, e6, s5 = t6) => (t6._$AI(e6, s5), t6);
var X2 = {};
var Y2 = (t6, e6 = X2) => t6._$AH = e6;
var Q2 = (t6) => {
  t6._$AR(), t6._$AA.remove();
};
var F2 = B2(class extends L2 {
  constructor(t6) {
    if (super(t6), t6.type !== P2 && t6.type !== k2 && t6.type !== j2) throw Error("The `live` directive is not allowed on child or event bindings");
    if (!Z2(t6)) throw Error("`live` bindings can only contain a single expression");
  }
  render(t6) {
    return t6;
  }
  update(t6, [e6]) {
    if (e6 === g2 || e6 === y2) return e6;
    const s5 = t6.element, i5 = t6.name;
    if (t6.type === P2) {
      if (e6 === s5[i5]) return g2;
    } else if (t6.type === j2) {
      if (!!e6 === s5.hasAttribute(i5)) return g2;
    } else if (t6.type === k2 && s5.getAttribute(i5) === e6 + "") return g2;
    return Y2(t6), e6;
  }
});
var q2 = (t6, e6, s5) => {
  const i5 = /* @__PURE__ */ new Map();
  for (let n5 = e6; n5 <= s5; n5++) i5.set(t6[n5], n5);
  return i5;
};
var J2 = B2(class extends L2 {
  constructor(t6) {
    if (super(t6), t6.type !== O2) throw Error("repeat() can only be used in text expressions");
  }
  dt(t6, e6, s5) {
    let i5;
    void 0 === s5 ? s5 = e6 : void 0 !== e6 && (i5 = e6);
    const n5 = [], r6 = [];
    let o5 = 0;
    for (const e7 of t6) n5[o5] = i5 ? i5(e7, o5) : o5, r6[o5] = s5(e7, o5), o5++;
    return { values: r6, keys: n5 };
  }
  render(t6, e6, s5) {
    return this.dt(t6, e6, s5).values;
  }
  update(t6, [e6, s5, i5]) {
    const n5 = ((t7) => t7._$AH)(t6), { values: r6, keys: o5 } = this.dt(e6, s5, i5);
    if (!Array.isArray(n5)) return this.ut = o5, r6;
    const h5 = this.ut ??= [], l5 = [];
    let c5, a5, d5 = 0, u5 = n5.length - 1, $5 = 0, _5 = r6.length - 1;
    for (; d5 <= u5 && $5 <= _5; ) if (null === n5[d5]) d5++;
    else if (null === n5[u5]) u5--;
    else if (h5[d5] === o5[$5]) l5[$5] = K2(n5[d5], r6[$5]), d5++, $5++;
    else if (h5[u5] === o5[_5]) l5[_5] = K2(n5[u5], r6[_5]), u5--, _5--;
    else if (h5[d5] === o5[_5]) l5[_5] = K2(n5[d5], r6[_5]), z2(t6, l5[_5 + 1], n5[d5]), d5++, _5--;
    else if (h5[u5] === o5[$5]) l5[$5] = K2(n5[u5], r6[$5]), z2(t6, n5[d5], n5[u5]), u5--, $5++;
    else if (void 0 === c5 && (c5 = q2(o5, $5, _5), a5 = q2(h5, d5, u5)), c5.has(h5[d5])) if (c5.has(h5[u5])) {
      const e7 = a5.get(o5[$5]), s6 = void 0 !== e7 ? n5[e7] : null;
      if (null === s6) {
        const e8 = z2(t6, n5[d5]);
        K2(e8, r6[$5]), l5[$5] = e8;
      } else l5[$5] = K2(s6, r6[$5]), z2(t6, n5[d5], s6), n5[e7] = null;
      $5++;
    } else Q2(n5[u5]), u5--;
    else Q2(n5[d5]), d5++;
    for (; $5 <= _5; ) {
      const e7 = z2(t6, l5[_5 + 1]);
      K2(e7, r6[$5]), l5[$5++] = e7;
    }
    for (; d5 <= u5; ) {
      const t7 = n5[d5++];
      null !== t7 && Q2(t7);
    }
    return this.ut = o5, Y2(t6, l5), g2;
  }
});
var tt2 = "important";
var et2 = " !" + tt2;
var st2 = B2(class extends L2 {
  constructor(t6) {
    if (super(t6), t6.type !== k2 || "style" !== t6.name || t6.strings?.length > 2) throw Error("The `styleMap` directive must be used in the `style` attribute and must be the only part in the attribute.");
  }
  render(t6) {
    return Object.keys(t6).reduce((e6, s5) => {
      const i5 = t6[s5];
      return null == i5 ? e6 : e6 + `${s5 = s5.includes("-") ? s5 : s5.replace(/(?:^(webkit|moz|ms|o)|)(?=[A-Z])/g, "-$&").toLowerCase()}:${i5};`;
    }, "");
  }
  update(t6, [e6]) {
    const { style: s5 } = t6.element;
    if (void 0 === this.ft) return this.ft = new Set(Object.keys(e6)), this.render(e6);
    for (const t7 of this.ft) null == e6[t7] && (this.ft.delete(t7), t7.includes("-") ? s5.removeProperty(t7) : s5[t7] = null);
    for (const t7 in e6) {
      const i5 = e6[t7];
      if (null != i5) {
        this.ft.add(t7);
        const e7 = "string" == typeof i5 && i5.endsWith(et2);
        t7.includes("-") || e7 ? s5.setProperty(t7, e7 ? i5.slice(0, -11) : i5, e7 ? tt2 : "") : s5[t7] = i5;
      }
    }
    return g2;
  }
});
var it2 = class extends L2 {
  constructor(t6) {
    if (super(t6), this.it = y2, t6.type !== O2) throw Error(this.constructor.directiveName + "() can only be used in child bindings");
  }
  render(t6) {
    if (t6 === y2 || null == t6) return this._t = void 0, this.it = t6;
    if (t6 === g2) return t6;
    if ("string" != typeof t6) throw Error(this.constructor.directiveName + "() called with a non-string value");
    if (t6 === this.it) return this._t;
    this.it = t6;
    const e6 = [t6];
    return e6.raw = e6, this._t = { _$litType$: this.constructor.resultType, strings: e6, values: [] };
  }
};
it2.directiveName = "unsafeHTML", it2.resultType = 1;
var nt2 = B2(it2);
var rt2 = (t6, e6) => {
  const s5 = t6._$AN;
  if (void 0 === s5) return false;
  for (const t7 of s5) t7._$AO?.(e6, false), rt2(t7, e6);
  return true;
};
var ot2 = (t6) => {
  let e6, s5;
  do {
    if (void 0 === (e6 = t6._$AM)) break;
    s5 = e6._$AN, s5.delete(t6), t6 = e6;
  } while (0 === s5?.size);
};
var ht2 = (t6) => {
  for (let e6; e6 = t6._$AM; t6 = e6) {
    let s5 = e6._$AN;
    if (void 0 === s5) e6._$AN = s5 = /* @__PURE__ */ new Set();
    else if (s5.has(t6)) break;
    s5.add(t6), at2(e6);
  }
};
function lt2(t6) {
  void 0 !== this._$AN ? (ot2(this), this._$AM = t6, ht2(this)) : this._$AM = t6;
}
function ct2(t6, e6 = false, s5 = 0) {
  const i5 = this._$AH, n5 = this._$AN;
  if (void 0 !== n5 && 0 !== n5.size) if (e6) if (Array.isArray(i5)) for (let t7 = s5; t7 < i5.length; t7++) rt2(i5[t7], false), ot2(i5[t7]);
  else null != i5 && (rt2(i5, false), ot2(i5));
  else rt2(this, t6);
}
var at2 = (t6) => {
  t6.type == O2 && (t6._$AP ??= ct2, t6._$AQ ??= lt2);
};
var dt2 = class extends L2 {
  constructor() {
    super(...arguments), this._$AN = void 0;
  }
  _$AT(t6, e6, s5) {
    super._$AT(t6, e6, s5), ht2(this), this.isConnected = t6._$AU;
  }
  _$AO(t6, e6 = true) {
    t6 !== this.isConnected && (this.isConnected = t6, t6 ? this.reconnected?.() : this.disconnected?.()), e6 && (rt2(this, t6), ot2(this));
  }
  setValue(t6) {
    if (Z2(this._$Ct)) this._$Ct._$AI(t6, this);
    else {
      const e6 = [...this._$Ct._$AH];
      e6[this._$Ci] = t6, this._$Ct._$AI(e6, this, 0);
    }
  }
  disconnected() {
  }
  reconnected() {
  }
};
var ut2 = class {
  constructor(t6) {
    this.G = t6;
  }
  disconnect() {
    this.G = void 0;
  }
  reconnect(t6) {
    this.G = t6;
  }
  deref() {
    return this.G;
  }
};
var $t2 = class {
  constructor() {
    this.Y = void 0, this.Z = void 0;
  }
  get() {
    return this.Y;
  }
  pause() {
    this.Y ??= new Promise((t6) => this.Z = t6);
  }
  resume() {
    this.Z?.(), this.Y = this.Z = void 0;
  }
};
var _t2 = (t6) => !/* @__PURE__ */ ((t7) => null === t7 || "object" != typeof t7 && "function" != typeof t7)(t6) && "function" == typeof t6.then;
var At = 1073741823;
var ft2 = class extends dt2 {
  constructor() {
    super(...arguments), this._$Cwt = At, this._$Cbt = [], this._$CK = new ut2(this), this._$CX = new $t2();
  }
  render(...t6) {
    return t6.find((t7) => !_t2(t7)) ?? g2;
  }
  update(t6, e6) {
    const s5 = this._$Cbt;
    let i5 = s5.length;
    this._$Cbt = e6;
    const n5 = this._$CK, r6 = this._$CX;
    this.isConnected || this.disconnected();
    for (let t7 = 0; t7 < e6.length && !(t7 > this._$Cwt); t7++) {
      const o5 = e6[t7];
      if (!_t2(o5)) return this._$Cwt = t7, o5;
      t7 < i5 && o5 === s5[t7] || (this._$Cwt = At, i5 = 0, Promise.resolve(o5).then(async (t8) => {
        for (; r6.get(); ) await r6.get();
        const e7 = n5.deref();
        if (void 0 !== e7) {
          const s6 = e7._$Cbt.indexOf(o5);
          s6 > -1 && s6 < e7._$Cwt && (e7._$Cwt = s6, e7.setValue(t8));
        }
      }));
    }
    return g2;
  }
  disconnected() {
    this._$CK.disconnect(), this._$CX.pause();
  }
  reconnected() {
    this._$CK.reconnect(this), this._$CX.resume();
  }
};
var pt2 = B2(ft2);
var vt = () => new gt();
var gt = class {
};
var yt = /* @__PURE__ */ new WeakMap();
var mt = B2(class extends dt2 {
  render(t6) {
    return y2;
  }
  update(t6, [e6]) {
    const s5 = e6 !== this.G;
    return s5 && void 0 !== this.G && this.rt(void 0), (s5 || this.lt !== this.ct) && (this.G = e6, this.ht = t6.options?.host, this.rt(this.ct = t6.element)), y2;
  }
  rt(t6) {
    if (this.isConnected || (t6 = void 0), "function" == typeof this.G) {
      const e6 = this.ht ?? globalThis;
      let s5 = yt.get(e6);
      void 0 === s5 && (s5 = /* @__PURE__ */ new WeakMap(), yt.set(e6, s5)), void 0 !== s5.get(this.G) && this.G.call(this.ht, void 0), s5.set(this.G, t6), void 0 !== t6 && this.G.call(this.ht, t6);
    } else this.G.value = t6;
  }
  get lt() {
    return "function" == typeof this.G ? yt.get(this.ht ?? globalThis)?.get(this.G) : this.G?.value;
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
  Directive: () => r3,
  PartType: () => t3,
  directive: () => e3
});
var t3 = { ATTRIBUTE: 1, CHILD: 2, PROPERTY: 3, BOOLEAN_ATTRIBUTE: 4, EVENT: 5, ELEMENT: 6 };
var e3 = (t6) => (...e6) => ({ _$litDirective$: t6, values: e6 });
var r3 = class {
  constructor(t6) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t6, e6, r6) {
    this._$Ct = t6, this._$AM = e6, this._$Ci = r6;
  }
  _$AS(t6, e6) {
    return this.update(t6, e6);
  }
  update(t6, e6) {
    return this.render(...e6);
  }
};

// gen/front_end/third_party/lit/lib/decorators.js
var decorators_exports = {};
__export(decorators_exports, {
  customElement: () => P3,
  property: () => v3,
  standardProperty: () => b3,
  state: () => w3
});
var t4 = globalThis;
var e4 = t4.ShadowRoot && (void 0 === t4.ShadyCSS || t4.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s3 = Symbol();
var i3 = /* @__PURE__ */ new WeakMap();
var r4 = class {
  constructor(t6, e6, i5) {
    if (this._$cssResult$ = true, i5 !== s3) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t6, this.t = e6;
  }
  get styleSheet() {
    let t6 = this.o;
    const s5 = this.t;
    if (e4 && void 0 === t6) {
      const e6 = void 0 !== s5 && 1 === s5.length;
      e6 && (t6 = i3.get(s5)), void 0 === t6 && ((this.o = t6 = new CSSStyleSheet()).replaceSync(this.cssText), e6 && i3.set(s5, t6));
    }
    return t6;
  }
  toString() {
    return this.cssText;
  }
};
var o3 = e4 ? (t6) => t6 : (t6) => t6 instanceof CSSStyleSheet ? ((t7) => {
  let e6 = "";
  for (const s5 of t7.cssRules) e6 += s5.cssText;
  return ((t8) => new r4("string" == typeof t8 ? t8 : t8 + "", void 0, s3))(e6);
})(t6) : t6;
var { is: n3, defineProperty: a3, getOwnPropertyDescriptor: h3, getOwnPropertyNames: c3, getOwnPropertySymbols: l3, getPrototypeOf: d3 } = Object;
var p3 = globalThis;
var u3 = p3.trustedTypes;
var f3 = u3 ? u3.emptyScript : "";
var y3 = p3.reactiveElementPolyfillSupport;
var E3 = (t6, e6) => t6;
var m3 = { toAttribute(t6, e6) {
  switch (e6) {
    case Boolean:
      t6 = t6 ? f3 : null;
      break;
    case Object:
    case Array:
      t6 = null == t6 ? t6 : JSON.stringify(t6);
  }
  return t6;
}, fromAttribute(t6, e6) {
  let s5 = t6;
  switch (e6) {
    case Boolean:
      s5 = null !== t6;
      break;
    case Number:
      s5 = null === t6 ? null : Number(t6);
      break;
    case Object:
    case Array:
      try {
        s5 = JSON.parse(t6);
      } catch (t7) {
        s5 = null;
      }
  }
  return s5;
} };
var _3 = (t6, e6) => !n3(t6, e6);
var $3 = { attribute: true, type: String, converter: m3, reflect: false, useDefault: false, hasChanged: _3 };
Symbol.metadata ??= Symbol("metadata"), p3.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var S3 = class extends HTMLElement {
  static addInitializer(t6) {
    this._$Ei(), (this.l ??= []).push(t6);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t6, e6 = $3) {
    if (e6.state && (e6.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t6) && ((e6 = Object.create(e6)).wrapped = true), this.elementProperties.set(t6, e6), !e6.noAccessor) {
      const s5 = Symbol(), i5 = this.getPropertyDescriptor(t6, s5, e6);
      void 0 !== i5 && a3(this.prototype, t6, i5);
    }
  }
  static getPropertyDescriptor(t6, e6, s5) {
    const { get: i5, set: r6 } = h3(this.prototype, t6) ?? { get() {
      return this[e6];
    }, set(t7) {
      this[e6] = t7;
    } };
    return { get: i5, set(e7) {
      const o5 = i5?.call(this);
      r6?.call(this, e7), this.requestUpdate(t6, o5, s5);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t6) {
    return this.elementProperties.get(t6) ?? $3;
  }
  static _$Ei() {
    if (this.hasOwnProperty(E3("elementProperties"))) return;
    const t6 = d3(this);
    t6.finalize(), void 0 !== t6.l && (this.l = [...t6.l]), this.elementProperties = new Map(t6.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(E3("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(E3("properties"))) {
      const t7 = this.properties, e6 = [...c3(t7), ...l3(t7)];
      for (const s5 of e6) this.createProperty(s5, t7[s5]);
    }
    const t6 = this[Symbol.metadata];
    if (null !== t6) {
      const e6 = litPropertyMetadata.get(t6);
      if (void 0 !== e6) for (const [t7, s5] of e6) this.elementProperties.set(t7, s5);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t7, e6] of this.elementProperties) {
      const s5 = this._$Eu(t7, e6);
      void 0 !== s5 && this._$Eh.set(s5, t7);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(t6) {
    const e6 = [];
    if (Array.isArray(t6)) {
      const s5 = new Set(t6.flat(1 / 0).reverse());
      for (const t7 of s5) e6.unshift(o3(t7));
    } else void 0 !== t6 && e6.push(o3(t6));
    return e6;
  }
  static _$Eu(t6, e6) {
    const s5 = e6.attribute;
    return false === s5 ? void 0 : "string" == typeof s5 ? s5 : "string" == typeof t6 ? t6.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t6) => this.enableUpdating = t6), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t6) => t6(this));
  }
  addController(t6) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t6), void 0 !== this.renderRoot && this.isConnected && t6.hostConnected?.();
  }
  removeController(t6) {
    this._$EO?.delete(t6);
  }
  _$E_() {
    const t6 = /* @__PURE__ */ new Map(), e6 = this.constructor.elementProperties;
    for (const s5 of e6.keys()) this.hasOwnProperty(s5) && (t6.set(s5, this[s5]), delete this[s5]);
    t6.size > 0 && (this._$Ep = t6);
  }
  createRenderRoot() {
    const s5 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return ((s6, i5) => {
      if (e4) s6.adoptedStyleSheets = i5.map((t6) => t6 instanceof CSSStyleSheet ? t6 : t6.styleSheet);
      else for (const e6 of i5) {
        const i6 = document.createElement("style"), r6 = t4.litNonce;
        void 0 !== r6 && i6.setAttribute("nonce", r6), i6.textContent = e6.cssText, s6.appendChild(i6);
      }
    })(s5, this.constructor.elementStyles), s5;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t6) => t6.hostConnected?.());
  }
  enableUpdating(t6) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t6) => t6.hostDisconnected?.());
  }
  attributeChangedCallback(t6, e6, s5) {
    this._$AK(t6, s5);
  }
  _$ET(t6, e6) {
    const s5 = this.constructor.elementProperties.get(t6), i5 = this.constructor._$Eu(t6, s5);
    if (void 0 !== i5 && true === s5.reflect) {
      const r6 = (void 0 !== s5.converter?.toAttribute ? s5.converter : m3).toAttribute(e6, s5.type);
      this._$Em = t6, null == r6 ? this.removeAttribute(i5) : this.setAttribute(i5, r6), this._$Em = null;
    }
  }
  _$AK(t6, e6) {
    const s5 = this.constructor, i5 = s5._$Eh.get(t6);
    if (void 0 !== i5 && this._$Em !== i5) {
      const t7 = s5.getPropertyOptions(i5), r6 = "function" == typeof t7.converter ? { fromAttribute: t7.converter } : void 0 !== t7.converter?.fromAttribute ? t7.converter : m3;
      this._$Em = i5;
      const o5 = r6.fromAttribute(e6, t7.type);
      this[i5] = o5 ?? this._$Ej?.get(i5) ?? o5, this._$Em = null;
    }
  }
  requestUpdate(t6, e6, s5) {
    if (void 0 !== t6) {
      const i5 = this.constructor, r6 = this[t6];
      if (s5 ??= i5.getPropertyOptions(t6), !((s5.hasChanged ?? _3)(r6, e6) || s5.useDefault && s5.reflect && r6 === this._$Ej?.get(t6) && !this.hasAttribute(i5._$Eu(t6, s5)))) return;
      this.C(t6, e6, s5);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t6, e6, { useDefault: s5, reflect: i5, wrapped: r6 }, o5) {
    s5 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t6) && (this._$Ej.set(t6, o5 ?? e6 ?? this[t6]), true !== r6 || void 0 !== o5) || (this._$AL.has(t6) || (this.hasUpdated || s5 || (e6 = void 0), this._$AL.set(t6, e6)), true === i5 && this._$Em !== t6 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t6));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t7) {
      Promise.reject(t7);
    }
    const t6 = this.scheduleUpdate();
    return null != t6 && await t6, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t8, e7] of this._$Ep) this[t8] = e7;
        this._$Ep = void 0;
      }
      const t7 = this.constructor.elementProperties;
      if (t7.size > 0) for (const [e7, s5] of t7) {
        const { wrapped: t8 } = s5, i5 = this[e7];
        true !== t8 || this._$AL.has(e7) || void 0 === i5 || this.C(e7, void 0, s5, i5);
      }
    }
    let t6 = false;
    const e6 = this._$AL;
    try {
      t6 = this.shouldUpdate(e6), t6 ? (this.willUpdate(e6), this._$EO?.forEach((t7) => t7.hostUpdate?.()), this.update(e6)) : this._$EM();
    } catch (e7) {
      throw t6 = false, this._$EM(), e7;
    }
    t6 && this._$AE(e6);
  }
  willUpdate(t6) {
  }
  _$AE(t6) {
    this._$EO?.forEach((t7) => t7.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t6)), this.updated(t6);
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
  shouldUpdate(t6) {
    return true;
  }
  update(t6) {
    this._$Eq &&= this._$Eq.forEach((t7) => this._$ET(t7, this[t7])), this._$EM();
  }
  updated(t6) {
  }
  firstUpdated(t6) {
  }
};
S3.elementStyles = [], S3.shadowRootOptions = { mode: "open" }, S3[E3("elementProperties")] = /* @__PURE__ */ new Map(), S3[E3("finalized")] = /* @__PURE__ */ new Map(), y3?.({ ReactiveElement: S3 }), (p3.reactiveElementVersions ??= []).push("2.1.1");
var g3 = { attribute: true, type: String, converter: m3, reflect: false, hasChanged: _3 };
var b3 = (t6 = g3, e6, s5) => {
  const { kind: i5, metadata: r6 } = s5;
  let o5 = globalThis.litPropertyMetadata.get(r6);
  if (void 0 === o5 && globalThis.litPropertyMetadata.set(r6, o5 = /* @__PURE__ */ new Map()), "setter" === i5 && ((t6 = Object.create(t6)).wrapped = true), o5.set(s5.name, t6), "accessor" === i5) {
    const { name: i6 } = s5;
    return { set(s6) {
      const r7 = e6.get.call(this);
      e6.set.call(this, s6), this.requestUpdate(i6, r7, t6);
    }, init(e7) {
      return void 0 !== e7 && this.C(i6, void 0, t6, e7), e7;
    } };
  }
  if ("setter" === i5) {
    const { name: i6 } = s5;
    return function(s6) {
      const r7 = this[i6];
      e6.call(this, s6), this.requestUpdate(i6, r7, t6);
    };
  }
  throw Error("Unsupported decorator location: " + i5);
};
function v3(t6) {
  return (e6, s5) => "object" == typeof s5 ? b3(t6, e6, s5) : ((t7, e7, s6) => {
    const i5 = e7.hasOwnProperty(s6);
    return e7.constructor.createProperty(s6, t7), i5 ? Object.getOwnPropertyDescriptor(e7, s6) : void 0;
  })(t6, e6, s5);
}
function w3(t6) {
  return v3({ ...t6, state: true, attribute: false });
}
var P3 = (t6) => (e6, s5) => {
  void 0 !== s5 ? s5.addInitializer(() => {
    customElements.define(t6, e6);
  }) : customElements.define(t6, e6);
};

// gen/front_end/third_party/lit/lib/static-html.js
var static_html_exports = {};
__export(static_html_exports, {
  html: () => Z3,
  literal: () => V3,
  mathml: () => q3,
  svg: () => F3,
  unsafeStatic: () => P4,
  withStatic: () => z3
});
var t5 = globalThis;
var e5 = t5.trustedTypes;
var s4 = e5 ? e5.createPolicy("lit-html", { createHTML: (t6) => t6 }) : void 0;
var i4 = "$lit$";
var n4 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var o4 = "?" + n4;
var r5 = `<${o4}>`;
var h4 = document;
var l4 = () => h4.createComment("");
var $4 = (t6) => null === t6 || "object" != typeof t6 && "function" != typeof t6;
var a4 = Array.isArray;
var c4 = "[ 	\n\f\r]";
var _4 = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var A3 = /-->/g;
var p4 = />/g;
var d4 = RegExp(`>|${c4}(?:([^\\s"'>=/]+)(${c4}*=${c4}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var u4 = /'/g;
var g4 = /"/g;
var f4 = /^(?:script|style|textarea|title)$/i;
var v4 = (t6) => (e6, ...s5) => ({ _$litType$: t6, strings: e6, values: s5 });
var m4 = v4(1);
var y4 = v4(2);
var x3 = v4(3);
var H3 = Symbol.for("lit-noChange");
var N3 = Symbol.for("lit-nothing");
var b4 = /* @__PURE__ */ new WeakMap();
var S4 = h4.createTreeWalker(h4, 129);
function T3(t6, e6) {
  if (!a4(t6) || !t6.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== s4 ? s4.createHTML(e6) : e6;
}
var M3 = (t6, e6) => {
  const s5 = t6.length - 1, o5 = [];
  let h5, l5 = 2 === e6 ? "<svg>" : 3 === e6 ? "<math>" : "", $5 = _4;
  for (let e7 = 0; e7 < s5; e7++) {
    const s6 = t6[e7];
    let a5, c5, v5 = -1, m5 = 0;
    for (; m5 < s6.length && ($5.lastIndex = m5, c5 = $5.exec(s6), null !== c5); ) m5 = $5.lastIndex, $5 === _4 ? "!--" === c5[1] ? $5 = A3 : void 0 !== c5[1] ? $5 = p4 : void 0 !== c5[2] ? (f4.test(c5[2]) && (h5 = RegExp("</" + c5[2], "g")), $5 = d4) : void 0 !== c5[3] && ($5 = d4) : $5 === d4 ? ">" === c5[0] ? ($5 = h5 ?? _4, v5 = -1) : void 0 === c5[1] ? v5 = -2 : (v5 = $5.lastIndex - c5[2].length, a5 = c5[1], $5 = void 0 === c5[3] ? d4 : '"' === c5[3] ? g4 : u4) : $5 === g4 || $5 === u4 ? $5 = d4 : $5 === A3 || $5 === p4 ? $5 = _4 : ($5 = d4, h5 = void 0);
    const y5 = $5 === d4 && t6[e7 + 1].startsWith("/>") ? " " : "";
    l5 += $5 === _4 ? s6 + r5 : v5 >= 0 ? (o5.push(a5), s6.slice(0, v5) + i4 + s6.slice(v5) + n4 + y5) : s6 + n4 + (-2 === v5 ? e7 : y5);
  }
  return [T3(t6, l5 + (t6[s5] || "<?>") + (2 === e6 ? "</svg>" : 3 === e6 ? "</math>" : "")), o5];
};
var w4 = class _w {
  constructor({ strings: t6, _$litType$: s5 }, r6) {
    let h5;
    this.parts = [];
    let $5 = 0, a5 = 0;
    const c5 = t6.length - 1, _5 = this.parts, [A4, p5] = M3(t6, s5);
    if (this.el = _w.createElement(A4, r6), S4.currentNode = this.el.content, 2 === s5 || 3 === s5) {
      const t7 = this.el.content.firstChild;
      t7.replaceWith(...t7.childNodes);
    }
    for (; null !== (h5 = S4.nextNode()) && _5.length < c5; ) {
      if (1 === h5.nodeType) {
        if (h5.hasAttributes()) for (const t7 of h5.getAttributeNames()) if (t7.endsWith(i4)) {
          const e6 = p5[a5++], s6 = h5.getAttribute(t7).split(n4), i5 = /([.?@])?(.*)/.exec(e6);
          _5.push({ type: 1, index: $5, name: i5[2], strings: s6, ctor: "." === i5[1] ? O3 : "?" === i5[1] ? R3 : "@" === i5[1] ? j3 : U3 }), h5.removeAttribute(t7);
        } else t7.startsWith(n4) && (_5.push({ type: 6, index: $5 }), h5.removeAttribute(t7));
        if (f4.test(h5.tagName)) {
          const t7 = h5.textContent.split(n4), s6 = t7.length - 1;
          if (s6 > 0) {
            h5.textContent = e5 ? e5.emptyScript : "";
            for (let e6 = 0; e6 < s6; e6++) h5.append(t7[e6], l4()), S4.nextNode(), _5.push({ type: 2, index: ++$5 });
            h5.append(t7[s6], l4());
          }
        }
      } else if (8 === h5.nodeType) if (h5.data === o4) _5.push({ type: 2, index: $5 });
      else {
        let t7 = -1;
        for (; -1 !== (t7 = h5.data.indexOf(n4, t7 + 1)); ) _5.push({ type: 7, index: $5 }), t7 += n4.length - 1;
      }
      $5++;
    }
  }
  static createElement(t6, e6) {
    const s5 = h4.createElement("template");
    return s5.innerHTML = t6, s5;
  }
};
function C3(t6, e6, s5 = t6, i5) {
  if (e6 === H3) return e6;
  let n5 = void 0 !== i5 ? s5._$Co?.[i5] : s5._$Cl;
  const o5 = $4(e6) ? void 0 : e6._$litDirective$;
  return n5?.constructor !== o5 && (n5?._$AO?.(false), void 0 === o5 ? n5 = void 0 : (n5 = new o5(t6), n5._$AT(t6, s5, i5)), void 0 !== i5 ? (s5._$Co ??= [])[i5] = n5 : s5._$Cl = n5), void 0 !== n5 && (e6 = C3(t6, n5._$AS(t6, e6.values), n5, i5)), e6;
}
var E4 = class {
  constructor(t6, e6) {
    this._$AV = [], this._$AN = void 0, this._$AD = t6, this._$AM = e6;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t6) {
    const { el: { content: e6 }, parts: s5 } = this._$AD, i5 = (t6?.creationScope ?? h4).importNode(e6, true);
    S4.currentNode = i5;
    let n5 = S4.nextNode(), o5 = 0, r6 = 0, l5 = s5[0];
    for (; void 0 !== l5; ) {
      if (o5 === l5.index) {
        let e7;
        2 === l5.type ? e7 = new I3(n5, n5.nextSibling, this, t6) : 1 === l5.type ? e7 = new l5.ctor(n5, l5.name, l5.strings, this, t6) : 6 === l5.type && (e7 = new B3(n5, this, t6)), this._$AV.push(e7), l5 = s5[++r6];
      }
      o5 !== l5?.index && (n5 = S4.nextNode(), o5++);
    }
    return S4.currentNode = h4, i5;
  }
  p(t6) {
    let e6 = 0;
    for (const s5 of this._$AV) void 0 !== s5 && (void 0 !== s5.strings ? (s5._$AI(t6, s5, e6), e6 += s5.strings.length - 2) : s5._$AI(t6[e6])), e6++;
  }
};
var I3 = class _I {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t6, e6, s5, i5) {
    this.type = 2, this._$AH = N3, this._$AN = void 0, this._$AA = t6, this._$AB = e6, this._$AM = s5, this.options = i5, this._$Cv = i5?.isConnected ?? true;
  }
  get parentNode() {
    let t6 = this._$AA.parentNode;
    const e6 = this._$AM;
    return void 0 !== e6 && 11 === t6?.nodeType && (t6 = e6.parentNode), t6;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t6, e6 = this) {
    t6 = C3(this, t6, e6), $4(t6) ? t6 === N3 || null == t6 || "" === t6 ? (this._$AH !== N3 && this._$AR(), this._$AH = N3) : t6 !== this._$AH && t6 !== H3 && this._(t6) : void 0 !== t6._$litType$ ? this.$(t6) : void 0 !== t6.nodeType ? this.T(t6) : ((t7) => a4(t7) || "function" == typeof t7?.[Symbol.iterator])(t6) ? this.k(t6) : this._(t6);
  }
  O(t6) {
    return this._$AA.parentNode.insertBefore(t6, this._$AB);
  }
  T(t6) {
    this._$AH !== t6 && (this._$AR(), this._$AH = this.O(t6));
  }
  _(t6) {
    this._$AH !== N3 && $4(this._$AH) ? this._$AA.nextSibling.data = t6 : this.T(h4.createTextNode(t6)), this._$AH = t6;
  }
  $(t6) {
    const { values: e6, _$litType$: s5 } = t6, i5 = "number" == typeof s5 ? this._$AC(t6) : (void 0 === s5.el && (s5.el = w4.createElement(T3(s5.h, s5.h[0]), this.options)), s5);
    if (this._$AH?._$AD === i5) this._$AH.p(e6);
    else {
      const t7 = new E4(i5, this), s6 = t7.u(this.options);
      t7.p(e6), this.T(s6), this._$AH = t7;
    }
  }
  _$AC(t6) {
    let e6 = b4.get(t6.strings);
    return void 0 === e6 && b4.set(t6.strings, e6 = new w4(t6)), e6;
  }
  k(t6) {
    a4(this._$AH) || (this._$AH = [], this._$AR());
    const e6 = this._$AH;
    let s5, i5 = 0;
    for (const n5 of t6) i5 === e6.length ? e6.push(s5 = new _I(this.O(l4()), this.O(l4()), this, this.options)) : s5 = e6[i5], s5._$AI(n5), i5++;
    i5 < e6.length && (this._$AR(s5 && s5._$AB.nextSibling, i5), e6.length = i5);
  }
  _$AR(t6 = this._$AA.nextSibling, e6) {
    for (this._$AP?.(false, true, e6); t6 !== this._$AB; ) {
      const e7 = t6.nextSibling;
      t6.remove(), t6 = e7;
    }
  }
  setConnected(t6) {
    void 0 === this._$AM && (this._$Cv = t6, this._$AP?.(t6));
  }
};
var U3 = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t6, e6, s5, i5, n5) {
    this.type = 1, this._$AH = N3, this._$AN = void 0, this.element = t6, this.name = e6, this._$AM = i5, this.options = n5, s5.length > 2 || "" !== s5[0] || "" !== s5[1] ? (this._$AH = Array(s5.length - 1).fill(new String()), this.strings = s5) : this._$AH = N3;
  }
  _$AI(t6, e6 = this, s5, i5) {
    const n5 = this.strings;
    let o5 = false;
    if (void 0 === n5) t6 = C3(this, t6, e6, 0), o5 = !$4(t6) || t6 !== this._$AH && t6 !== H3, o5 && (this._$AH = t6);
    else {
      const i6 = t6;
      let r6, h5;
      for (t6 = n5[0], r6 = 0; r6 < n5.length - 1; r6++) h5 = C3(this, i6[s5 + r6], e6, r6), h5 === H3 && (h5 = this._$AH[r6]), o5 ||= !$4(h5) || h5 !== this._$AH[r6], h5 === N3 ? t6 = N3 : t6 !== N3 && (t6 += (h5 ?? "") + n5[r6 + 1]), this._$AH[r6] = h5;
    }
    o5 && !i5 && this.j(t6);
  }
  j(t6) {
    t6 === N3 ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t6 ?? "");
  }
};
var O3 = class extends U3 {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t6) {
    this.element[this.name] = t6 === N3 ? void 0 : t6;
  }
};
var R3 = class extends U3 {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t6) {
    this.element.toggleAttribute(this.name, !!t6 && t6 !== N3);
  }
};
var j3 = class extends U3 {
  constructor(t6, e6, s5, i5, n5) {
    super(t6, e6, s5, i5, n5), this.type = 5;
  }
  _$AI(t6, e6 = this) {
    if ((t6 = C3(this, t6, e6, 0) ?? N3) === H3) return;
    const s5 = this._$AH, i5 = t6 === N3 && s5 !== N3 || t6.capture !== s5.capture || t6.once !== s5.once || t6.passive !== s5.passive, n5 = t6 !== N3 && (s5 === N3 || i5);
    i5 && this.element.removeEventListener(this.name, this, s5), n5 && this.element.addEventListener(this.name, this, t6), this._$AH = t6;
  }
  handleEvent(t6) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t6) : this._$AH.handleEvent(t6);
  }
};
var B3 = class {
  constructor(t6, e6, s5) {
    this.element = t6, this.type = 6, this._$AN = void 0, this._$AM = e6, this.options = s5;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t6) {
    C3(this, t6);
  }
};
var W3 = t5.litHtmlPolyfillSupport;
W3?.(w4, I3), (t5.litHtmlVersions ??= []).push("3.3.1");
var k3 = Symbol.for("");
var L3 = (t6) => {
  if (t6?.r === k3) return t6?._$litStatic$;
};
var P4 = (t6) => ({ _$litStatic$: t6, r: k3 });
var V3 = (t6, ...e6) => ({ _$litStatic$: e6.reduce((e7, s5, i5) => e7 + ((t7) => {
  if (void 0 !== t7._$litStatic$) return t7._$litStatic$;
  throw Error(`Value passed to 'literal' function must be a 'literal' result: ${t7}. Use 'unsafeStatic' to pass non-literal values, but
            take care to ensure page security.`);
})(s5) + t6[i5 + 1], t6[0]), r: k3 });
var D3 = /* @__PURE__ */ new Map();
var z3 = (t6) => (e6, ...s5) => {
  const i5 = s5.length;
  let n5, o5;
  const r6 = [], h5 = [];
  let l5, $5 = 0, a5 = false;
  for (; $5 < i5; ) {
    for (l5 = e6[$5]; $5 < i5 && void 0 !== (o5 = s5[$5], n5 = L3(o5)); ) l5 += n5 + e6[++$5], a5 = true;
    $5 !== i5 && h5.push(o5), r6.push(l5), $5++;
  }
  if ($5 === i5 && r6.push(e6[i5]), a5) {
    const t7 = r6.join("$$lit$$");
    void 0 === (e6 = D3.get(t7)) && (r6.raw = r6, D3.set(t7, e6 = r6)), s5 = h5;
  }
  return t6(e6, ...s5);
};
var Z3 = z3(m4);
var F3 = z3(y4);
var q3 = z3(x3);
export {
  n as CSSResult,
  decorators_exports as Decorators,
  directive_exports as Directive,
  directives_exports as Directives,
  ut as LitElement,
  S as ReactiveElement,
  static_html_exports as StaticHtml,
  _t as _$LE,
  lt as _$LH,
  h as adoptStyles,
  o as css,
  y as defaultConverter,
  a as getCompatibleStyle,
  q as html,
  ft as isServer,
  F as mathml,
  J as noChange,
  v as notEqual,
  Z as nothing,
  dt as render,
  e as supportsAdoptingStyleSheets,
  K as svg,
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
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
//# sourceMappingURL=lit.js.map
