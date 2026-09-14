/*! js-yaml 5.4.1 https://github.com/nodeca/js-yaml @license MIT */
//#region src/tag.ts
var e = Symbol("NOT_RESOLVED");
function t(e, t) {
	var n, r, i, a, o;
	return {
		tagName: e,
		nodeKind: "scalar",
		implicit: (n = t.implicit) == null ? !1 : n,
		matchByTagPrefix: (r = t.matchByTagPrefix) == null ? !1 : r,
		implicitFirstChars: (i = t.implicitFirstChars) == null ? null : i,
		resolve: t.resolve,
		identify: t.identify,
		represent: (a = t.represent) == null ? ((e) => String(e)) : a,
		representTagName: (o = t.representTagName) == null ? (() => e) : o
	};
}
function n(e, t) {
	var n, r, i, a;
	let o = t.finalize === void 0;
	return {
		tagName: e,
		nodeKind: "sequence",
		implicit: !1,
		matchByTagPrefix: (n = t.matchByTagPrefix) == null ? !1 : n,
		create: t.create,
		addItem: t.addItem,
		finalize: (r = t.finalize) == null ? ((e) => e) : r,
		carrierIsResult: o,
		identify: t.identify,
		represent: (i = t.represent) == null ? ((e) => e) : i,
		representTagName: (a = t.representTagName) == null ? (() => e) : a
	};
}
function r(e, t) {
	var n, r, i, a;
	let o = t.finalize === void 0;
	return {
		tagName: e,
		nodeKind: "mapping",
		implicit: !1,
		matchByTagPrefix: (n = t.matchByTagPrefix) == null ? !1 : n,
		create: t.create,
		addPair: t.addPair,
		has: t.has,
		keys: t.keys,
		get: t.get,
		finalize: (r = t.finalize) == null ? ((e) => e) : r,
		carrierIsResult: o,
		identify: t.identify,
		represent: (i = t.represent) == null ? ((e) => e) : i,
		representTagName: (a = t.representTagName) == null ? (() => e) : a
	};
}
//#endregion
//#region src/tag/scalar/str.ts
var i = t("tag:yaml.org,2002:str", {
	resolve: (e) => e,
	identify: (e) => typeof e == "string"
}), a = [
	"",
	"~",
	"null",
	"Null",
	"NULL"
], o = t("tag:yaml.org,2002:null", {
	implicit: !0,
	implicitFirstChars: [
		"",
		"~",
		"n",
		"N"
	],
	resolve: (t) => a.indexOf(t) === -1 ? e : null,
	identify: (e) => e === null,
	represent: () => "null"
}), s = t("tag:yaml.org,2002:null", {
	implicit: !0,
	implicitFirstChars: ["n"],
	resolve: (t, n) => t === "null" || n && t === "" ? null : e,
	identify: (e) => e === null,
	represent: () => "null"
}), c = [
	"",
	"~",
	"null",
	"Null",
	"NULL"
], l = t("tag:yaml.org,2002:null", {
	implicit: !0,
	implicitFirstChars: [
		"",
		"~",
		"n",
		"N"
	],
	resolve: (t) => c.indexOf(t) === -1 ? e : null,
	identify: (e) => e === null,
	represent: () => "null"
}), u = [
	"true",
	"True",
	"TRUE"
], d = [
	"false",
	"False",
	"FALSE"
], f = t("tag:yaml.org,2002:bool", {
	implicit: !0,
	implicitFirstChars: [
		"t",
		"T",
		"f",
		"F"
	],
	resolve: (t) => u.indexOf(t) === -1 ? d.indexOf(t) === -1 ? e : !1 : !0,
	identify: (e) => Object.prototype.toString.call(e) === "[object Boolean]",
	represent: (e) => e ? "true" : "false"
}), p = ["true"], m = ["false"], h = t("tag:yaml.org,2002:bool", {
	implicit: !0,
	implicitFirstChars: ["t", "f"],
	resolve: (t) => p.indexOf(t) === -1 ? m.indexOf(t) === -1 ? e : !1 : !0,
	identify: (e) => Object.prototype.toString.call(e) === "[object Boolean]",
	represent: (e) => e ? "true" : "false"
}), ee = [
	"true",
	"True",
	"TRUE",
	"y",
	"Y",
	"yes",
	"Yes",
	"YES",
	"on",
	"On",
	"ON"
], te = [
	"false",
	"False",
	"FALSE",
	"n",
	"N",
	"no",
	"No",
	"NO",
	"off",
	"Off",
	"OFF"
], ne = t("tag:yaml.org,2002:bool", {
	implicit: !0,
	implicitFirstChars: [
		"y",
		"Y",
		"n",
		"N",
		"t",
		"T",
		"f",
		"F",
		"o",
		"O"
	],
	resolve: (t) => ee.indexOf(t) === -1 ? te.indexOf(t) === -1 ? e : !1 : !0,
	identify: (e) => Object.prototype.toString.call(e) === "[object Boolean]",
	represent: (e) => e ? "true" : "false"
}), re = /* @__PURE__ */ RegExp("^(?:0o[0-7]+|0x[0-9a-fA-F]+|[-+]?[0-9]+)$"), ie = /* @__PURE__ */ RegExp("^(?:[-+]?0b[0-1]+|[-+]?0o[0-7]+|[-+]?0x[0-9a-fA-F]+|[-+]?[0-9]+)$");
function ae(e) {
	let t = e, n = 1;
	return (t[0] === "-" || t[0] === "+") && (t[0] === "-" && (n = -1), t = t.slice(1)), t.startsWith("0b") ? n * parseInt(t.slice(2), 2) : t.startsWith("0o") ? n * parseInt(t.slice(2), 8) : t.startsWith("0x") ? n * parseInt(t.slice(2), 16) : n * parseInt(t, 10);
}
function oe(t, n) {
	if (n) {
		if (!ie.test(t)) return e;
	} else if (!re.test(t)) return e;
	let r = ae(t);
	return Number.isFinite(r) ? r : e;
}
var se = t("tag:yaml.org,2002:int", {
	implicit: !0,
	implicitFirstChars: [
		"-",
		"+",
		..."0123456789"
	],
	resolve: oe,
	identify: (e) => Number.isInteger(e) && !Object.is(e, -0) && e.toString(10).indexOf("e") < 0,
	represent: (e) => e.toString(10)
}), ce = /* @__PURE__ */ RegExp("^-?(?:0|[1-9][0-9]*)$"), le = /* @__PURE__ */ RegExp("^(?:[-+]?0b[0-1]+|[-+]?0o[0-7]+|[-+]?0x[0-9a-fA-F]+|[-+]?[0-9]+)$");
function ue(e) {
	let t = e, n = 1;
	return (t[0] === "-" || t[0] === "+") && (t[0] === "-" && (n = -1), t = t.slice(1)), t.startsWith("0b") ? n * parseInt(t.slice(2), 2) : t.startsWith("0o") ? n * parseInt(t.slice(2), 8) : t.startsWith("0x") ? n * parseInt(t.slice(2), 16) : n * parseInt(t, 10);
}
function de(t, n) {
	if (n) {
		if (!le.test(t)) return e;
	} else if (!ce.test(t)) return e;
	let r = ue(t);
	return Number.isFinite(r) ? r : e;
}
var fe = t("tag:yaml.org,2002:int", {
	implicit: !0,
	implicitFirstChars: ["-", ..."0123456789"],
	resolve: de,
	identify: (e) => Number.isInteger(e) && !Object.is(e, -0) && e.toString(10).indexOf("e") < 0,
	represent: (e) => e.toString(10)
}), pe = /* @__PURE__ */ RegExp("^(?:[-+]?0b[0-1_]+|[-+]?0[0-7_]+|[-+]?0x[0-9a-fA-F_]+|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+|[-+]?(?:0|[1-9][0-9_]*))$");
function me(e) {
	let t = e.replace(/_/g, ""), n = 1;
	if ((t[0] === "-" || t[0] === "+") && (t[0] === "-" && (n = -1), t = t.slice(1)), t.startsWith("0b")) return n * parseInt(t.slice(2), 2);
	if (t.startsWith("0x")) return n * parseInt(t.slice(2), 16);
	if (t.includes(":")) {
		let e = 0;
		for (let n of t.split(":")) e = e * 60 + Number(n);
		return n * e;
	}
	return t !== "0" && t[0] === "0" ? n * parseInt(t, 8) : n * parseInt(t, 10);
}
function he(t) {
	if (!pe.test(t)) return e;
	let n = me(t);
	return Number.isFinite(n) ? n : e;
}
var g = t("tag:yaml.org,2002:int", {
	implicit: !0,
	implicitFirstChars: [
		"-",
		"+",
		..."0123456789"
	],
	resolve: he,
	identify: (e) => Number.isInteger(e) && !Object.is(e, -0) && e.toString(10).indexOf("e") < 0,
	represent: (e) => e.toString(10)
}), ge = /* @__PURE__ */ RegExp("^(?:[-+]?[0-9]+(?:\\.[0-9]*)?(?:[eE][-+]?[0-9]+)?|[-+]?\\.[0-9]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$"), _e = /* @__PURE__ */ RegExp("^(?:[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
function ve(t) {
	if (!ge.test(t)) return e;
	let n = t.toLowerCase(), r = n[0] === "-" ? -1 : 1;
	if ("+-".includes(n[0]) && (n = n.slice(1)), n === ".inf") return r === 1 ? Infinity : -Infinity;
	if (n === ".nan") return NaN;
	let i = r * parseFloat(n);
	return Number.isFinite(i) || _e.test(t) ? i : e;
}
function ye(e) {
	if (isNaN(e)) return ".nan";
	if (e === Infinity) return ".inf";
	if (e === -Infinity) return "-.inf";
	if (Object.is(e, -0)) return "-0.0";
	let t = e.toString(10);
	return /^[-+]?[0-9]+e/.test(t) ? t.replace("e", ".e") : t;
}
var be = t("tag:yaml.org,2002:float", {
	implicit: !0,
	implicitFirstChars: [
		"-",
		"+",
		".",
		..."0123456789"
	],
	resolve: ve,
	identify: (e) => typeof e == "number" && (!Number.isInteger(e) || Object.is(e, -0) || e.toString(10).indexOf("e") >= 0),
	represent: ye
}), xe = /* @__PURE__ */ RegExp("^-?(?:0|[1-9][0-9]*)(?:\\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$"), Se = /* @__PURE__ */ RegExp("^(?:[-+]?[0-9]+(?:\\.[0-9]*)?(?:[eE][-+]?[0-9]+)?|[-+]?\\.[0-9]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
function Ce(t, n) {
	if (n) {
		if (!Se.test(t)) return e;
		let n = t.toLowerCase(), r = n[0] === "-" ? -1 : 1;
		if ("+-".includes(n[0]) && (n = n.slice(1)), n === ".inf") return r === 1 ? Infinity : -Infinity;
		if (n === ".nan") return NaN;
		let i = r * parseFloat(n);
		return Number.isFinite(i) ? i : e;
	}
	if (!xe.test(t)) return e;
	let r = Number(t);
	return Number.isFinite(r) ? r : e;
}
function we(e) {
	if (isNaN(e)) return ".nan";
	if (e === Infinity) return ".inf";
	if (e === -Infinity) return "-.inf";
	if (Object.is(e, -0)) return "-0.0";
	let t = e.toString(10);
	return /^[-+]?[0-9]+e/.test(t) ? t.replace("e", ".e") : t;
}
var Te = t("tag:yaml.org,2002:float", {
	implicit: !0,
	implicitFirstChars: ["-", ..."0123456789"],
	resolve: Ce,
	identify: (e) => typeof e == "number" && (!Number.isInteger(e) || Object.is(e, -0) || e.toString(10).indexOf("e") >= 0),
	represent: we
}), Ee = /* @__PURE__ */ RegExp("^(?:[-+]?(?:(?:[0-9][0-9_]*)?\\.[0-9_]*)(?:[eE][-+][0-9]+)?|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\\.[0-9_]*|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$"), De = /* @__PURE__ */ RegExp("^(?:[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
function Oe(t) {
	if (!Ee.test(t)) return e;
	let n = t.toLowerCase().replace(/_/g, ""), r = n[0] === "-" ? -1 : 1;
	if ("+-".includes(n[0]) && (n = n.slice(1)), n === ".inf") return r === 1 ? Infinity : -Infinity;
	if (n === ".nan") return NaN;
	let i = 0;
	if (n.includes(":")) {
		for (let e of n.split(":")) i = i * 60 + Number(e);
		i *= r;
	} else i = r * parseFloat(n);
	return Number.isFinite(i) || De.test(t) ? i : e;
}
function ke(e) {
	if (isNaN(e)) return ".nan";
	if (e === Infinity) return ".inf";
	if (e === -Infinity) return "-.inf";
	if (Object.is(e, -0)) return "-0.0";
	let t = e.toString(10);
	return /^[-+]?[0-9]+e/.test(t) ? t.replace("e", ".e") : t;
}
var _ = t("tag:yaml.org,2002:float", {
	implicit: !0,
	implicitFirstChars: [
		"-",
		"+",
		".",
		..."0123456789"
	],
	resolve: Oe,
	identify: (e) => typeof e == "number" && (!Number.isInteger(e) || Object.is(e, -0) || e.toString(10).indexOf("e") >= 0),
	represent: ke
}), Ae = t("tag:yaml.org,2002:merge", {
	implicit: !0,
	implicitFirstChars: ["<"],
	resolve: (t, n) => t === "<<" || n && t === "" ? "<<" : e,
	identify: () => !1
}), je = /^[A-Za-z0-9+/]*={0,2}$/;
function Me(t) {
	let n = t.replace(/\s/g, "");
	if (n.length % 4 != 0 || !je.test(n)) return e;
	let r = atob(n), i = new Uint8Array(r.length);
	for (let e = 0; e < r.length; e++) i[e] = r.charCodeAt(e);
	return i;
}
function Ne(e) {
	let t = "";
	for (let n = 0; n < e.length; n++) t += String.fromCharCode(e[n]);
	return btoa(t);
}
var Pe = t("tag:yaml.org,2002:binary", {
	resolve: Me,
	identify: (e) => Object.prototype.toString.call(e) === "[object Uint8Array]",
	represent: Ne
}), Fe = /* @__PURE__ */ RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"), Ie = /* @__PURE__ */ RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$");
function Le(e, t, n, r = 0, i = 0, a = 0, o = 0) {
	let s = new Date(Date.UTC(e, t, n, r, i, a, o));
	return s.setUTCFullYear(e, t, n), s;
}
function Re(t) {
	let n = Fe.exec(t);
	if (n === null && (n = Ie.exec(t)), n === null) return e;
	let r = +n[1], i = n[2] - 1, a = +n[3];
	if (!n[4]) {
		let t = Le(r, i, a);
		return t.getUTCFullYear() !== r || t.getUTCMonth() !== i || t.getUTCDate() !== a ? e : t;
	}
	let o = +n[4], s = +n[5], c = +n[6], l = 0;
	if (o > 23 || s > 59 || c > 59) return e;
	if (n[7]) {
		let e = n[7].slice(0, 3);
		for (; e.length < 3;) e += "0";
		l = +e;
	}
	let u = Le(r, i, a, o, s, c, l);
	if (u.getUTCFullYear() !== r || u.getUTCMonth() !== i || u.getUTCDate() !== a) return e;
	if (n[9]) {
		let t = +n[10], r = +(n[11] || 0);
		if (t > 23 || r > 59) return e;
		let i = (t * 60 + r) * 6e4;
		u.setTime(u.getTime() - (n[9] === "-" ? -i : i));
	}
	return u;
}
var ze = t("tag:yaml.org,2002:timestamp", {
	implicit: !0,
	implicitFirstChars: [..."0123456789"],
	resolve: Re,
	identify: (e) => e instanceof Date,
	represent: (e) => e.toISOString()
}), Be = n("tag:yaml.org,2002:seq", {
	create: () => [],
	addItem: (e, t) => {
		e.push(t);
	},
	identify: Array.isArray
});
//#endregion
//#region src/common/object.ts
function v(e) {
	if (typeof e != "object" || !e || Array.isArray(e)) return !1;
	let t = Object.getPrototypeOf(e);
	return t === null || t === Object.prototype;
}
function Ve(e, t) {
	let n = {};
	for (let r of t) e[r] !== void 0 && (n[r] = e[r]);
	return n;
}
//#endregion
//#region src/tag/sequence/omap.ts
var He = n("tag:yaml.org,2002:omap", {
	create: () => ({
		list: [],
		seen: /* @__PURE__ */ new Set()
	}),
	addItem: (e, t) => {
		let n;
		if (t instanceof Map) {
			if (t.size !== 1) return "cannot resolve an ordered map item";
			n = t.keys().next().value;
		} else if (v(t)) {
			let e = Object.keys(t);
			if (e.length !== 1) return "cannot resolve an ordered map item";
			n = e[0];
		} else return "cannot resolve an ordered map item";
		return e.seen.has(n) ? "duplicate key in ordered map" : (e.seen.add(n), e.list.push(t), "");
	},
	finalize: (e) => e.list,
	identify: () => !1
}), Ue = n("tag:yaml.org,2002:pairs", {
	create: () => [],
	addItem: (e, t) => {
		if (t instanceof Map) return t.size === 1 ? (e.push(t.entries().next().value), "") : "cannot resolve a pairs item";
		if (Object.prototype.toString.call(t) !== "[object Object]") return "cannot resolve a pairs item";
		let n = t, r = Object.keys(n);
		return r.length === 1 ? (e.push([r[0], n[r[0]]]), "") : "cannot resolve a pairs item";
	},
	identify: () => !1
}), We = r("tag:yaml.org,2002:map", {
	create: () => ({}),
	identify: v,
	represent: (e) => {
		let t = /* @__PURE__ */ new Map();
		for (let n of Object.keys(e)) t.set(n, e[n]);
		return t;
	},
	addPair: (e, t, n) => {
		if (typeof t == "object" && t) return "object-based map does not support complex keys";
		let r = String(t);
		return r === "__proto__" ? Object.defineProperty(e, r, {
			value: n,
			enumerable: !0,
			configurable: !0,
			writable: !0
		}) : e[r] = n, "";
	},
	has: (e, t) => typeof t == "object" && t ? !1 : Object.prototype.hasOwnProperty.call(e, String(t)),
	keys: (e) => Object.keys(e),
	get: (e, t) => {
		let n = String(t);
		return Object.prototype.hasOwnProperty.call(e, n) ? e[n] : null;
	}
}), Ge = r("tag:yaml.org,2002:set", {
	create: () => /* @__PURE__ */ new Set(),
	identify: (e) => e instanceof Set,
	represent: (e) => {
		let t = /* @__PURE__ */ new Map();
		for (let n of e) t.set(n, null);
		return t;
	},
	addPair: (e, t, n) => n === null ? (e.add(t), "") : "cannot resolve a set item",
	has: (e, t) => e.has(t),
	keys: (e) => e.keys(),
	get: () => null
});
//#endregion
//#region \0@oxc-project+runtime@0.137.0/helpers/esm/typeof.js
function y(e) {
	"@babel/helpers - typeof";
	return y = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(e) {
		return typeof e;
	} : function(e) {
		return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
	}, y(e);
}
//#endregion
//#region \0@oxc-project+runtime@0.137.0/helpers/esm/toPrimitive.js
function Ke(e, t) {
	if (y(e) != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (y(r) != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
//#endregion
//#region \0@oxc-project+runtime@0.137.0/helpers/esm/toPropertyKey.js
function qe(e) {
	var t = Ke(e, "string");
	return y(t) == "symbol" ? t : t + "";
}
//#endregion
//#region \0@oxc-project+runtime@0.137.0/helpers/esm/defineProperty.js
function b(e, t, n) {
	return (t = qe(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
//#endregion
//#region \0@oxc-project+runtime@0.137.0/helpers/esm/objectSpread2.js
function Je(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function x(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? Je(Object(n), !0).forEach(function(t) {
			b(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : Je(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
//#endregion
//#region src/schema.ts
function Ye() {
	return {
		scalar: Object.create(null),
		sequence: Object.create(null),
		mapping: Object.create(null)
	};
}
function Xe() {
	return {
		scalar: [],
		sequence: [],
		mapping: []
	};
}
function Ze(e) {
	let t = [];
	for (let n of e) {
		let e = t.length;
		for (let r = 0; r < t.length; r++) {
			let i = t[r];
			if (i.nodeKind === n.nodeKind && i.tagName === n.tagName && i.matchByTagPrefix === n.matchByTagPrefix) {
				e = r;
				break;
			}
		}
		t[e] = n;
	}
	return t;
}
var S = class t {
	constructor(e) {
		b(this, "tags", void 0), b(this, "implicitScalarTags", void 0), b(this, "implicitScalarByFirstChar", void 0), b(this, "implicitScalarAnyFirstChar", void 0), b(this, "defaultScalarTag", void 0), b(this, "defaultSequenceTag", void 0), b(this, "defaultMappingTag", void 0), b(this, "exact", void 0), b(this, "prefix", void 0);
		let t = Ze(e), n = [], r = Ye(), i = Xe();
		for (let e of t) {
			if (e.nodeKind === "scalar" && e.implicit) {
				if (e.matchByTagPrefix) throw Error("Implicit scalar tags cannot match by tag prefix");
				n.push(e);
			}
			switch (e.nodeKind) {
				case "scalar":
					e.matchByTagPrefix ? i.scalar.push(e) : r.scalar[e.tagName] = e;
					break;
				case "sequence":
					e.matchByTagPrefix ? i.sequence.push(e) : r.sequence[e.tagName] = e;
					break;
				case "mapping":
					e.matchByTagPrefix ? i.mapping.push(e) : r.mapping[e.tagName] = e;
					break;
			}
		}
		let a = n.filter((e) => e.implicitFirstChars === null), o = /* @__PURE__ */ new Set();
		for (let e of n) if (e.implicitFirstChars !== null) for (let t of e.implicitFirstChars) o.add(t);
		let s = /* @__PURE__ */ new Map();
		for (let e of o) s.set(e, n.filter((t) => t.implicitFirstChars === null || t.implicitFirstChars.indexOf(e) !== -1));
		let c = r.scalar["tag:yaml.org,2002:str"];
		if (!c) throw Error("schema does not define the default scalar tag (tag:yaml.org,2002:str)");
		this.tags = t, this.implicitScalarTags = n, this.implicitScalarByFirstChar = s, this.implicitScalarAnyFirstChar = a, this.defaultScalarTag = c, this.defaultSequenceTag = r.sequence["tag:yaml.org,2002:seq"], this.defaultMappingTag = r.mapping["tag:yaml.org,2002:map"], this.exact = r, this.prefix = i;
	}
	lookupScalarTag(e) {
		let t = this.exact.scalar[e];
		if (t) return t;
		for (let t of this.prefix.scalar) if (e.startsWith(t.tagName)) return t;
	}
	lookupSequenceTag(e) {
		let t = this.exact.sequence[e];
		if (t) return t;
		for (let t of this.prefix.sequence) if (e.startsWith(t.tagName)) return t;
	}
	lookupMappingTag(e) {
		let t = this.exact.mapping[e];
		if (t) return t;
		for (let t of this.prefix.mapping) if (e.startsWith(t.tagName)) return t;
	}
	resolveImplicitScalarTag(t) {
		var n;
		let r = (n = this.implicitScalarByFirstChar.get(t.charAt(0))) == null ? this.implicitScalarAnyFirstChar : n;
		for (let n of r) {
			let r = n.resolve(t, !1, n.tagName);
			if (r !== e) return {
				value: r,
				tag: n
			};
		}
		let i = this.defaultScalarTag;
		return {
			value: i.resolve(t, !1, i.tagName),
			tag: i
		};
	}
	withTags(...e) {
		let n = [];
		for (let t of e) n = n.concat(t);
		return new t([...this.tags, ...n]);
	}
}, C = new S([
	i,
	Be,
	We
]), Qe = new S([
	...C.tags,
	s,
	h,
	fe,
	Te
]), $e = new S([
	...C.tags,
	o,
	f,
	se,
	be
]), et = new S([
	...C.tags,
	l,
	ne,
	g,
	_,
	ze,
	Ae,
	Pe,
	He,
	Ue,
	Ge
]), tt = et.withTags(x(x({}, g), {}, { resolve: (t, n, r) => {
	let i = g.resolve(t, n, r);
	return i === e ? se.resolve(t, n, r) : i;
} }), x(x({}, _), {}, { resolve: (t, n, r) => {
	let i = _.resolve(t, n, r);
	return i === e ? be.resolve(t, n, r) : i;
} })), nt = r("tag:yaml.org,2002:map", {
	create: () => /* @__PURE__ */ new Map(),
	addPair: (e, t, n) => (e.set(t, n), ""),
	has: (e, t) => e.has(t),
	keys: (e) => e.keys(),
	get: (e, t) => e.get(t),
	identify: (e) => e instanceof Map || v(e),
	represent: (e) => {
		if (e instanceof Map) return e;
		let t = /* @__PURE__ */ new Map(), n = e;
		for (let e of Object.keys(n)) t.set(e, n[e]);
		return t;
	}
});
//#endregion
//#region src/tag/mapping/legacy_map.ts
function rt(e) {
	if (Array.isArray(e)) {
		let t = Array.prototype.slice.call(e);
		for (let e = 0; e < t.length; e++) {
			if (Array.isArray(t[e])) return null;
			typeof t[e] == "object" && Object.prototype.toString.call(t[e]) === "[object Object]" && (t[e] = "[object Object]");
		}
		return String(t);
	}
	return typeof e == "object" && Object.prototype.toString.call(e) === "[object Object]" ? "[object Object]" : String(e);
}
var it = r("tag:yaml.org,2002:map", {
	create: () => ({}),
	identify: v,
	represent: (e) => {
		let t = /* @__PURE__ */ new Map();
		for (let n of Object.keys(e)) t.set(n, e[n]);
		return t;
	},
	addPair: (e, t, n) => {
		let r = rt(t);
		return r === null ? "nested arrays are not supported inside keys" : (r === "__proto__" ? Object.defineProperty(e, r, {
			value: n,
			enumerable: !0,
			configurable: !0,
			writable: !0
		}) : e[r] = n, "");
	},
	has: (e, t) => {
		let n = rt(t);
		return n !== null && Object.prototype.hasOwnProperty.call(e, n);
	},
	keys: (e) => Object.keys(e),
	get: (e, t) => {
		let n = String(t);
		return Object.prototype.hasOwnProperty.call(e, n) ? e[n] : null;
	}
}), at = {
	maxLength: 79,
	indent: 1,
	linesBefore: 3,
	linesAfter: 2
};
function ot(e, t, n, r, i) {
	let a = "", o = "", s = Math.floor(i / 2) - 1;
	return r - t > s && (a = " ... ", t = r - s + a.length), n - r > s && (o = " ...", n = r + s - o.length), {
		str: a + e.slice(t, n).replace(/\t/g, "→") + o,
		pos: r - t + a.length
	};
}
function st(e, t) {
	return " ".repeat(Math.max(t - e.length, 0)) + e;
}
function ct(e, t) {
	if (!e.buffer) return null;
	let n = x(x({}, at), t), r = /\r?\n|\r|\0/g, i = [0], a = [], o, s = -1;
	for (; o = r.exec(e.buffer);) a.push(o.index), i.push(o.index + o[0].length), e.position <= o.index && s < 0 && (s = i.length - 2);
	s < 0 && (s = i.length - 1);
	let c = "", l = Math.min(e.line + n.linesAfter, a.length).toString().length, u = n.maxLength - (n.indent + l + 3);
	for (let t = 1; t <= n.linesBefore && !(s - t < 0); t++) {
		let r = ot(e.buffer, i[s - t], a[s - t], e.position - (i[s] - i[s - t]), u);
		c = `${" ".repeat(n.indent)}${st((e.line - t + 1).toString(), l)} | ${r.str}\n${c}`;
	}
	let d = ot(e.buffer, i[s], a[s], e.position, u);
	c += `${" ".repeat(n.indent)}${st((e.line + 1).toString(), l)} | ${d.str}\n`, c += `${"-".repeat(n.indent + l + 3 + d.pos)}^\n`;
	for (let t = 1; t <= n.linesAfter && !(s + t >= a.length); t++) {
		let r = ot(e.buffer, i[s + t], a[s + t], e.position - (i[s] - i[s + t]), u);
		c += `${" ".repeat(n.indent)}${st((e.line + t + 1).toString(), l)} | ${r.str}\n`;
	}
	return c.replace(/\n$/, "");
}
//#endregion
//#region src/common/exception.ts
function lt(e, t) {
	let n = "";
	return e.mark ? (e.mark.name && (n += `in "${e.mark.name}" `), n += `(${e.mark.line + 1}:${e.mark.column + 1})`, !t && e.mark.snippet && (n += `\n\n${e.mark.snippet}`), `${e.reason} ${n}`) : e.reason;
}
var w = class e extends Error {
	constructor(e, t) {
		super(), b(this, "reason", void 0), b(this, "mark", void 0), this.name = "YAMLException", this.reason = e, this.mark = t, this.message = lt(this, !1), Error.captureStackTrace && Error.captureStackTrace(this, this.constructor);
	}
	toString(e) {
		return `${this.name}: ${lt(this, e)}`;
	}
	static throwAt(t, n, r, i = "") {
		let a = 0, o = 0;
		for (let e = 0; e < n; e++) {
			let n = t.charCodeAt(e);
			n === 10 ? (a++, o = e + 1) : n === 13 && (a++, t.charCodeAt(e + 1) === 10 && e++, o = e + 1);
		}
		let s = {
			name: i,
			buffer: t,
			position: n,
			line: a,
			column: n - o
		};
		throw s.snippet = ct(s), new e(r, s);
	}
}, T = {
	DOCUMENT: 1,
	SEQUENCE: 2,
	MAPPING: 3,
	SCALAR: 4,
	ALIAS: 5,
	POP: 6
}, E = {
	PLAIN: 1,
	SINGLE_QUOTED: 2,
	DOUBLE_QUOTED: 3,
	LITERAL_BLOCK: 4,
	FOLDED_BLOCK: 5
}, D = {
	BLOCK: 1,
	FLOW: 2
}, O = {
	CLIP: 1,
	STRIP: 2,
	KEEP: 3
}, ut = -1;
function dt(e) {
	switch (e) {
		case 48: return "\0";
		case 97: return "\x07";
		case 98: return "\b";
		case 116: return "	";
		case 9: return "	";
		case 110: return "\n";
		case 118: return "\v";
		case 102: return "\f";
		case 114: return "\r";
		case 101: return "\x1B";
		case 32: return " ";
		case 34: return "\"";
		case 47: return "/";
		case 92: return "\\";
		case 78: return "";
		case 95: return "\xA0";
		case 76: return "\u2028";
		case 80: return "\u2029";
		default: return "";
	}
}
var ft = Array(256), pt = Array(256);
for (let e = 0; e < 256; e++) ft[e] = +!!dt(e), pt[e] = dt(e);
function mt(e) {
	return e <= 65535 ? String.fromCharCode(e) : String.fromCharCode((e - 65536 >> 10) + 55296, (e - 65536 & 1023) + 56320);
}
function ht(e) {
	return e >= 48 && e <= 57 ? e - 48 : (e | 32) - 97 + 10;
}
function gt(e) {
	return e === 120 ? 2 : e === 117 ? 4 : 8;
}
function _t(e, t, n) {
	let r = 0;
	for (; t < n;) {
		let n = e.charCodeAt(t);
		if (n === 10) r++, t++;
		else if (n === 13) r++, t++, e.charCodeAt(t) === 10 && t++;
		else if (n === 32 || n === 9) t++;
		else break;
	}
	return {
		position: t,
		breaks: r
	};
}
function vt(e) {
	return e === 1 ? " " : "\n".repeat(e - 1);
}
function yt(e, t, n) {
	let r = "", i = t, a = t, o = t;
	for (; i < n;) {
		let t = e.charCodeAt(i);
		if (t === 10 || t === 13) {
			r += e.slice(a, o);
			let t = _t(e, i, n);
			r += vt(t.breaks), i = a = o = t.position;
		} else i++, t !== 32 && t !== 9 && (o = i);
	}
	return r + e.slice(a, o);
}
function bt(e, t, n) {
	let r = "", i = t, a = t, o = t;
	for (; i < n;) {
		let t = e.charCodeAt(i);
		if (t === 39) r += e.slice(a, i) + "'", i += 2, a = o = i;
		else if (t === 10 || t === 13) {
			r += e.slice(a, o);
			let t = _t(e, i, n);
			r += vt(t.breaks), i = a = o = t.position;
		} else i++, t !== 32 && t !== 9 && (o = i);
	}
	return r + e.slice(a, n);
}
function xt(e, t, n) {
	let r = "", i = t, a = t, o = t;
	for (; i < n;) {
		let t = e.charCodeAt(i);
		if (t === 92) {
			r += e.slice(a, i), i++;
			let t = e.charCodeAt(i);
			if (t === 10 || t === 13) i = _t(e, i, n).position;
			else if (t < 256 && ft[t]) r += pt[t], i++;
			else {
				let n = gt(t), a = 0;
				for (; n > 0; n--) {
					i++;
					let t = ht(e.charCodeAt(i));
					a = (a << 4) + t;
				}
				r += mt(a), i++;
			}
			a = o = i;
		} else if (t === 10 || t === 13) {
			r += e.slice(a, o);
			let t = _t(e, i, n);
			r += vt(t.breaks), i = a = o = t.position;
		} else i++, t !== 32 && t !== 9 && (o = i);
	}
	return r + e.slice(a, n);
}
function St(e, t, n, r, i, a) {
	let o = r < 0 ? 0 : r, s = e.slice(t, n).replace(/\r\n?/g, "\n"), c = s === "" ? [] : (s.endsWith("\n") ? s.slice(0, -1) : s).split("\n"), l = "", u = !1, d = 0, f = !1;
	for (let e of c) {
		let t = 0;
		for (; t < o && e.charCodeAt(t) === 32;) t++;
		if (r < 0 || t >= e.length) {
			d++;
			continue;
		}
		let n = e.slice(o), i = n.charCodeAt(0);
		a ? i === 32 || i === 9 ? (f = !0, l += "\n".repeat(u ? 1 + d : d)) : f ? (f = !1, l += "\n".repeat(d + 1)) : d === 0 ? u && (l += " ") : l += "\n".repeat(d) : l += "\n".repeat(u ? 1 + d : d), l += n, u = !0, d = 0;
	}
	return i === O.KEEP ? l += "\n".repeat(u ? 1 + d : d) : i !== O.STRIP && u && (l += "\n"), l;
}
function Ct(e, t) {
	if (t.valueStart === ut) return "";
	let { valueStart: n, valueEnd: r } = t;
	if (t.fast) return e.slice(n, r);
	switch (t.style) {
		case E.SINGLE_QUOTED: return bt(e, n, r);
		case E.DOUBLE_QUOTED: return xt(e, n, r);
		case E.LITERAL_BLOCK: return St(e, n, r, t.indent, t.chomping, !1);
		case E.FOLDED_BLOCK: return St(e, n, r, t.indent, t.chomping, !0);
		default: return yt(e, n, r);
	}
}
//#endregion
//#region src/common/tagname.ts
var wt = Object.assign(Object.create(null), {
	"!": "!",
	"!!": "tag:yaml.org,2002:"
});
function Tt(e) {
	return encodeURI(e).replace(/!/g, "%21");
}
function Et(e, t) {
	var n, r;
	if (e.startsWith("!<") && e.endsWith(">")) return decodeURIComponent(e.slice(2, -1));
	let i = e.indexOf("!", 1), a = i === -1 ? "!" : e.slice(0, i + 1), o = (n = (r = t == null ? void 0 : t[a]) == null ? wt[a] : r) == null ? a : n;
	return decodeURIComponent(o) + decodeURIComponent(e.slice(a.length));
}
function Dt(e) {
	let t = e;
	return t.charCodeAt(0) === 33 ? (t = t.slice(1), `!${Tt(t)}`) : t.slice(0, 18) === "tag:yaml.org,2002:" ? `!!${Tt(t.slice(18))}` : `!<${Tt(t)}>`;
}
//#endregion
//#region src/parser/constructor.ts
var k = -1, Ot = "tag:yaml.org,2002:merge", kt = {
	filename: "",
	schema: $e,
	json: !1,
	maxTotalMergeKeys: 1e4,
	maxAliases: -1
};
function At(e) {
	return "tagStart" in e && e.tagStart !== k ? e.tagStart : "anchorStart" in e && e.anchorStart !== k ? e.anchorStart : "valueStart" in e && e.valueStart !== k ? e.valueStart : "start" in e ? e.start : 0;
}
function A(e, t) {
	w.throwAt(e.source, e.position, t, e.filename);
}
function jt(e, t, n, r) {
	try {
		return n.finalize(r);
	} catch (n) {
		if (n instanceof w) throw n;
		w.throwAt(e.source, t, n instanceof Error ? n.message : String(n), e.filename);
	}
}
function Mt(t, n) {
	let r = Ct(t.source, n), i = n.tagStart === k ? "" : t.source.slice(n.tagStart, n.tagEnd), a = t.schema.defaultScalarTag;
	if (i !== "") {
		var o;
		if (i === "!") return {
			value: r,
			tag: a
		};
		let n = Et(i, t.tagHandlers), s = t.schema.lookupScalarTag(n);
		if (s) {
			let i = s.resolve(r, !0, n);
			return i === e && A(t, `cannot resolve a node with !<${n}> explicit tag`), {
				value: i,
				tag: s
			};
		}
		let c = (o = t.schema.lookupMappingTag(n)) == null ? t.schema.lookupSequenceTag(n) : o;
		if (c) {
			r !== "" && A(t, `cannot resolve a node with !<${n}> explicit tag`);
			let e = c.create(n);
			return {
				value: c.carrierIsResult ? e : jt(t, t.position, c, e),
				tag: c
			};
		}
		A(t, `unknown scalar tag !<${n}>`);
	}
	return n.style === E.PLAIN ? t.schema.resolveImplicitScalarTag(r) : {
		value: a.resolve(r, !1, a.tagName),
		tag: a
	};
}
function Nt(e, t, n) {
	let r = t.tagStart === k ? "" : e.source.slice(t.tagStart, t.tagEnd);
	return r === "" || r === "!" ? n : Et(r, e.tagHandlers);
}
function Pt(e) {
	return e.nodeKind === "mapping";
}
function Ft(e) {
	e.totalMergeKeys++, e.maxTotalMergeKeys !== -1 && e.totalMergeKeys > e.maxTotalMergeKeys && A(e, `merge keys exceeded maxTotalMergeKeys (${e.maxTotalMergeKeys})`);
}
function It(e, t, n, r) {
	Ft(e);
	for (let i of r.keys(n)) {
		if (Ft(e), t.tag.has(t.value, i)) continue;
		let a = t.tag.addPair(t.value, i, r.get(n, i));
		a && A(e, a), t.overridable != null || (t.overridable = /* @__PURE__ */ new Set()), t.overridable.add(i);
	}
}
function Lt(e, t, n, r) {
	if (e.position = t.keyPosition, Pt(r)) It(e, t, n, r);
	else if (r.nodeKind === "sequence" && Array.isArray(n)) {
		n.length > 100 && A(e, "abnormal merge sequence size");
		for (let r of n) {
			let n = e.nodeTags.get(r);
			n || A(e, "cannot merge mappings; the provided source object is unacceptable"), It(e, t, r, n);
		}
	} else A(e, "cannot merge mappings; the provided source object is unacceptable");
}
function Rt(e, t, n, r, i) {
	var a, o;
	if (e.position = t.keyPosition, t.keyIsMerge) {
		Lt(e, t, r, i);
		return;
	}
	!e.json && t.tag.has(t.value, n) && !((a = t.overridable) != null && a.has(n)) && A(e, "duplicated mapping key");
	let s = t.tag.addPair(t.value, n, r);
	s && A(e, s), (o = t.overridable) == null || o.delete(n);
}
function zt(e, t, n) {
	let r = e.frames[e.frames.length - 1];
	if (r.kind === "document") r.value = t, r.hasValue = !0;
	else if (r.kind === "sequence") {
		Pt(n) && e.nodeTags.set(t, n);
		let i = r.tag.addItem(r.value, t, r.index++);
		i && A(e, i);
	} else if (r.hasKey) {
		let i = r.key;
		r.key = void 0, r.hasKey = !1, Rt(e, r, i, t, n);
	} else r.key = t, r.keyPosition = e.position, r.hasKey = !0, r.keyIsMerge = n.tagName === Ot;
}
function Bt(e, t, n, r, i) {
	if (t.anchorStart !== k) {
		let a = {
			value: n,
			tag: r,
			isValueFinal: i
		};
		return e.anchors.set(e.source.slice(t.anchorStart, t.anchorEnd), a), a;
	}
	return null;
}
function Vt(e, t) {
	let n = x(x(x({}, kt), t), {}, {
		events: e,
		documents: [],
		eventIndex: 0,
		position: 0,
		frames: [],
		anchors: /* @__PURE__ */ new Map(),
		nodeTags: /* @__PURE__ */ new Map(),
		tagHandlers: Object.create(null),
		totalMergeKeys: 0,
		aliasCount: 0
	});
	for (; n.eventIndex < n.events.length;) {
		let e = n.events[n.eventIndex++];
		switch (n.position = At(e), e.type) {
			case T.DOCUMENT:
				n.anchors = /* @__PURE__ */ new Map(), n.nodeTags = /* @__PURE__ */ new Map(), n.aliasCount = 0, n.tagHandlers = Object.create(null);
				for (let t of e.directives) t.kind === "tag" && (n.tagHandlers[t.handle] = t.prefix);
				n.frames.push({
					kind: "document",
					position: n.position,
					value: void 0,
					hasValue: !1
				});
				break;
			case T.SCALAR: {
				let { value: t, tag: r } = Mt(n, e);
				Bt(n, e, t, r, !0), zt(n, t, r);
				break;
			}
			case T.SEQUENCE: {
				let t = Nt(n, e, "tag:yaml.org,2002:seq"), r = n.schema.lookupSequenceTag(t);
				r || A(n, `unknown sequence tag !<${t}>`);
				let i = r.create(t), a = Bt(n, e, i, r, r.carrierIsResult);
				n.frames.push({
					kind: "sequence",
					position: n.position,
					value: i,
					tag: r,
					anchor: a,
					index: 0
				});
				break;
			}
			case T.MAPPING: {
				let t = Nt(n, e, "tag:yaml.org,2002:map"), r = n.schema.lookupMappingTag(t);
				r || A(n, `unknown mapping tag !<${t}>`);
				let i = r.create(t), a = Bt(n, e, i, r, r.carrierIsResult);
				n.frames.push({
					kind: "mapping",
					position: n.position,
					value: i,
					tag: r,
					anchor: a,
					key: void 0,
					keyPosition: n.position,
					hasKey: !1,
					keyIsMerge: !1,
					overridable: null
				});
				break;
			}
			case T.ALIAS: {
				n.maxAliases !== -1 && ++n.aliasCount > n.maxAliases && A(n, `aliases exceeded maxAliases (${n.maxAliases})`);
				let t = n.source.slice(e.anchorStart, e.anchorEnd), r = n.anchors.get(t);
				r || A(n, `unidentified alias "${t}"`), r.isValueFinal || A(n, `recursive alias "${t}" is not supported for tag ${r.tag.tagName} because it uses finalize()`), zt(n, r.value, r.tag);
				break;
			}
			case T.POP: {
				let e = n.frames.pop();
				if (e.kind === "mapping" && e.hasKey && (n.position = e.keyPosition, A(n, "incomplete mapping pair in event stream")), e.kind === "document") n.documents.push(e.value);
				else {
					let t = e.tag.carrierIsResult ? e.value : jt(n, e.position, e.tag, e.value);
					e.anchor && (e.anchor.value = t, e.anchor.isValueFinal = !0), zt(n, t, e.tag);
				}
				break;
			}
		}
	}
	return n.documents;
}
//#endregion
//#region src/parser/parser.ts
var j = -1, Ht = Object.prototype.hasOwnProperty, M = 1, Ut = 2, Wt = 3, Gt = 4, Kt = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/, qt = /[,\[\]{}]/, Jt = /^(?:!|!!|![0-9A-Za-z-]+!)$/, Yt = String.raw`(?:%[0-9A-Fa-f]{2}|[0-9A-Za-z\-#;/?:@&=+$,_.!~*'()\[\]])`, Xt = String.raw`(?:%[0-9A-Fa-f]{2}|[0-9A-Za-z\-#;/?:@&=+$.~*'()_])`, Zt = RegExp(`^(?:${Yt})*$`), Qt = RegExp(`^(?:${Xt})+$`), $t = RegExp(`^(?:!(?:${Yt})*|${Xt}(?:${Yt})*)$`), en = {
	filename: "",
	maxDepth: 100
};
function tn(e, t, n) {
	e.events.push({
		type: T.DOCUMENT,
		explicitStart: t,
		explicitEnd: n,
		directives: e.directives
	});
}
function nn(e, t, n, r, i, a, o) {
	e.events.push({
		type: T.SEQUENCE,
		start: t,
		anchorStart: n,
		anchorEnd: r,
		tagStart: i,
		tagEnd: a,
		style: o
	});
}
function rn(e, t, n, r, i, a, o) {
	e.events.push({
		type: T.MAPPING,
		start: t,
		anchorStart: n,
		anchorEnd: r,
		tagStart: i,
		tagEnd: a,
		style: o
	});
}
function an(e, t) {
	e.events.splice(t.eventsLength, 0, {
		type: T.MAPPING,
		start: t.position,
		anchorStart: j,
		anchorEnd: j,
		tagStart: j,
		tagEnd: j,
		style: D.FLOW
	});
}
function N(e, t, n, r, i, a, o, s, c = O.CLIP, l = -1, u = !1) {
	e.events.push({
		type: T.SCALAR,
		valueStart: t,
		valueEnd: n,
		anchorStart: r,
		anchorEnd: i,
		tagStart: a,
		tagEnd: o,
		style: s,
		chomping: c,
		indent: l,
		fast: u
	});
}
function on(e, t, n) {
	e.events.push({
		type: T.ALIAS,
		anchorStart: t,
		anchorEnd: n
	});
}
function P(e) {
	e.events.push({ type: T.POP });
}
function F(e) {
	N(e, j, j, j, j, j, j, E.PLAIN);
}
function sn() {
	return {
		anchorStart: j,
		anchorEnd: j,
		tagStart: j,
		tagEnd: j
	};
}
function I(e) {
	return {
		position: e.position,
		line: e.line,
		lineStart: e.lineStart,
		lineIndent: e.lineIndent,
		firstTabInLine: e.firstTabInLine,
		eventsLength: e.events.length
	};
}
function L(e, t) {
	e.position = t.position, e.line = t.line, e.lineStart = t.lineStart, e.lineIndent = t.lineIndent, e.firstTabInLine = t.firstTabInLine, e.events.length = t.eventsLength;
}
function R(e, t) {
	w.throwAt(e.input.slice(0, e.length), e.position, t, e.filename);
}
function z(e) {
	return e === 10 || e === 13;
}
function B(e) {
	return e === 9 || e === 32;
}
function V(e) {
	return B(e) || z(e);
}
function H(e) {
	return e === 0 || V(e);
}
function U(e) {
	return e === 44 || e === 91 || e === 93 || e === 123 || e === 125;
}
function cn(e) {
	return e >= 48 && e <= 57 ? e - 48 : -1;
}
function ln(e) {
	if (e >= 48 && e <= 57) return e - 48;
	let t = e | 32;
	return t >= 97 && t <= 102 ? t - 97 + 10 : -1;
}
function un(e) {
	return e === 120 ? 2 : e === 117 ? 4 : e === 85 ? 8 : 0;
}
function dn(e) {
	return e === 48 || e === 97 || e === 98 || e === 116 || e === 9 || e === 110 || e === 118 || e === 102 || e === 114 || e === 101 || e === 32 || e === 34 || e === 47 || e === 92 || e === 78 || e === 95 || e === 76 || e === 80;
}
function fn(e) {
	e.input.charCodeAt(e.position) === 10 ? e.position++ : (e.position++, e.input.charCodeAt(e.position) === 10 && e.position++), e.line++, e.lineStart = e.position, e.lineIndent = 0, e.firstTabInLine = -1;
}
function W(e, t) {
	let n = 0, r = e.input.charCodeAt(e.position), i = e.position === e.lineStart || V(e.input.charCodeAt(e.position - 1));
	for (; r !== 0;) {
		for (; B(r);) i = !0, r === 9 && e.firstTabInLine === -1 && (e.firstTabInLine = e.position), r = e.input.charCodeAt(++e.position);
		if (t && i && r === 35) do
			r = e.input.charCodeAt(++e.position);
		while (!z(r) && r !== 0);
		if (!z(r)) break;
		for (fn(e), n++, i = !0, r = e.input.charCodeAt(e.position); r === 32;) e.lineIndent++, r = e.input.charCodeAt(++e.position);
	}
	return n;
}
function G(e, t = e.position) {
	let n = e.input.charCodeAt(t);
	if ((n === 45 || n === 46) && n === e.input.charCodeAt(t + 1) && n === e.input.charCodeAt(t + 2)) {
		let n = e.input.charCodeAt(t + 3);
		return n === 0 || V(n);
	}
	return !1;
}
function pn(e) {
	e.position === e.lineStart && e.input.charCodeAt(e.position) === 65279 && (e.position++, e.lineStart = e.position);
}
function mn(e) {
	if (e.position !== e.lineStart) return !1;
	if (G(e)) return !0;
	if (e.input.charCodeAt(e.position) !== 65279) return !1;
	let t = I(e);
	pn(e), W(e, !0);
	let n = e.input.charCodeAt(e.position), r = e.position === e.lineStart && (n === 37 || n === 45 && G(e));
	return L(e, t), r;
}
function hn(e) {
	let t = e.input.charCodeAt(e.position);
	for (; t !== 0 && !z(t);) t = e.input.charCodeAt(++e.position);
}
function gn(e, t, n) {
	Kt.test(e.input.slice(t, n)) && R(e, "the stream contains non-printable characters");
}
function _n(e, t, n) {
	if (e.input.charCodeAt(e.position) !== 33) return !1;
	t.tagStart !== j && R(e, "duplication of a tag property");
	let r = e.position, i = !1, a = !1, o = "!", s = e.input.charCodeAt(++e.position);
	s === 60 ? (i = !0, s = e.input.charCodeAt(++e.position)) : s === 33 && (a = !0, o = "!!", s = e.input.charCodeAt(++e.position));
	let c = e.position, l;
	if (i) {
		for (; s !== 0 && s !== 62;) s = e.input.charCodeAt(++e.position);
		s !== 62 && R(e, "unexpected end of the stream within a verbatim tag"), l = e.input.slice(c, e.position), e.position++;
	} else {
		for (; s !== 0 && !V(s) && !(n && U(s));) s === 33 && (a ? R(e, "tag suffix cannot contain exclamation marks") : (o = e.input.slice(c - 1, e.position + 1), Jt.test(o) || R(e, "named tag handle cannot contain such characters"), a = !0, c = e.position + 1)), s = e.input.charCodeAt(++e.position);
		l = e.input.slice(c, e.position), qt.test(l) && R(e, "tag suffix cannot contain flow indicator characters");
	}
	return l && !(i ? Zt.test(l) : Qt.test(l)) && R(e, `tag name cannot contain such characters: ${l}`), !i && o !== "!" && o !== "!!" && !Ht.call(e.tagHandlers, o) && R(e, `undeclared tag handle "${o}"`), t.tagStart = r, t.tagEnd = e.position, !0;
}
function vn(e, t) {
	if (e.input.charCodeAt(e.position) !== 38) return !1;
	t.anchorStart !== j && R(e, "duplication of an anchor property"), e.position++;
	let n = e.position;
	for (; e.input.charCodeAt(e.position) !== 0 && !V(e.input.charCodeAt(e.position)) && !U(e.input.charCodeAt(e.position));) e.position++;
	return e.position === n && R(e, "name of an anchor node must contain at least one character"), t.anchorStart = n, t.anchorEnd = e.position, !0;
}
function yn(e, t) {
	if (e.input.charCodeAt(e.position) !== 42) return !1;
	(t.anchorStart !== j || t.tagStart !== j) && R(e, "alias node should not have any properties"), e.position++;
	let n = e.position;
	for (; e.input.charCodeAt(e.position) !== 0 && !V(e.input.charCodeAt(e.position)) && !U(e.input.charCodeAt(e.position));) e.position++;
	return e.position === n && R(e, "name of an alias node must contain at least one character"), on(e, n, e.position), !0;
}
function bn(e, t) {
	W(e, !1), e.lineIndent < t && R(e, "deficient indentation");
}
function xn(e, t, n) {
	if (e.input.charCodeAt(e.position) !== 39) return !1;
	e.position++;
	let r = e.position, i = !0;
	for (; e.input.charCodeAt(e.position) !== 0;) {
		let a = e.input.charCodeAt(e.position);
		if (a === 39) {
			if (e.input.charCodeAt(e.position + 1) === 39) {
				i = !1, e.position += 2;
				continue;
			}
			let t = e.position;
			return e.position++, N(e, r, t, n.anchorStart, n.anchorEnd, n.tagStart, n.tagEnd, E.SINGLE_QUOTED, O.CLIP, -1, i), !0;
		}
		z(a) ? (i = !1, bn(e, t)) : e.position === e.lineStart && G(e) ? R(e, "unexpected end of the document within a single quoted scalar") : a !== 9 && a < 32 ? R(e, "expected valid JSON character") : e.position++;
	}
	R(e, "unexpected end of the stream within a single quoted scalar");
}
function Sn(e, t, n) {
	if (e.input.charCodeAt(e.position) !== 34) return !1;
	e.position++;
	let r = e.position, i = !0;
	for (; e.input.charCodeAt(e.position) !== 0;) {
		let a = e.input.charCodeAt(e.position);
		if (a === 34) {
			let t = e.position;
			return e.position++, N(e, r, t, n.anchorStart, n.anchorEnd, n.tagStart, n.tagEnd, E.DOUBLE_QUOTED, O.CLIP, -1, i), !0;
		}
		if (a === 92) {
			i = !1;
			let n = e.input.charCodeAt(++e.position);
			if (z(n)) bn(e, t);
			else if (dn(n)) e.position++;
			else {
				let t = un(n);
				for (t === 0 && R(e, "unknown escape sequence"); t-- > 0;) e.position++, ln(e.input.charCodeAt(e.position)) < 0 && R(e, "expected hexadecimal character");
				e.position++;
			}
		} else z(a) ? (i = !1, bn(e, t)) : e.position === e.lineStart && G(e) ? R(e, "unexpected end of the document within a double quoted scalar") : a !== 9 && a < 32 ? R(e, "expected valid JSON character") : e.position++;
	}
	R(e, "unexpected end of the stream within a double quoted scalar");
}
function Cn(e, t, n) {
	let r = e.input.charCodeAt(e.position), i = O.CLIP, a = -1, o = !1;
	if (r !== 124 && r !== 62) return !1;
	let s = r === 124 ? E.LITERAL_BLOCK : E.FOLDED_BLOCK;
	for (e.position++; e.input.charCodeAt(e.position) !== 0;) {
		let n = e.input.charCodeAt(e.position), r = cn(n);
		if (n === 43 || n === 45) i !== O.CLIP && R(e, "repeat of a chomping mode identifier"), i = n === 43 ? O.KEEP : O.STRIP, e.position++;
		else if (r >= 0) r === 0 && R(e, "bad explicit indentation width of a block scalar; it cannot be less than one"), o && R(e, "repeat of an indentation width identifier"), a = t + r - 1, o = !0, e.position++;
		else break;
	}
	let c = !1;
	for (; B(e.input.charCodeAt(e.position));) c = !0, e.position++;
	c && e.input.charCodeAt(e.position) === 35 && hn(e), z(e.input.charCodeAt(e.position)) ? fn(e) : e.input.charCodeAt(e.position) !== 0 && R(e, "a line break is expected");
	let l = o ? a : -1, u = 0, d = e.position, f = e.position;
	for (; e.input.charCodeAt(e.position) !== 0;) {
		let n = e.position, r = 0;
		for (; e.input.charCodeAt(n + r) === 32;) r++;
		let i = e.input.charCodeAt(n + r);
		if (i === 0) {
			l >= 0 ? r > l && (f = n + r) : r > 0 && (f = n + r);
			break;
		}
		if (mn(e)) break;
		if (!o && l === -1 && z(i) && (u = Math.max(u, r)), !o && l === -1 && !z(i) && (i === 9 && r < t && (e.position = n + r, R(e, "tab characters must not be used in indentation")), r < u && (e.position = n + r, R(e, "bad indentation of a mapping entry"))), l === -1 && i !== 0 && !z(i) && r < t) {
			e.lineIndent = r, e.position = n + r;
			break;
		}
		!o && i !== 0 && !z(i) && l === -1 && (l = r);
		let a = l === -1 ? t + 1 : l;
		if (i !== 0 && !z(i) && r < a) {
			e.lineIndent = r, e.position = n + r;
			break;
		}
		hn(e), f = e.position, z(e.input.charCodeAt(e.position)) && (fn(e), f = e.position);
	}
	return gn(e, d, f), N(e, d, f, n.anchorStart, n.anchorEnd, n.tagStart, n.tagEnd, s, i, l), !0;
}
function wn(e, t) {
	let n = e.input.charCodeAt(e.position), r = t === M;
	if (n === 0 || V(n) || n === 35 || n === 38 || n === 42 || n === 33 || n === 124 || n === 62 || n === 39 || n === 34 || n === 37 || n === 64 || n === 96 || r && U(n)) return !1;
	if (n === 63 || n === 45) {
		let t = e.input.charCodeAt(e.position + 1);
		if (H(t) || r && U(t)) return !1;
	}
	return !0;
}
function Tn(e, t, n, r) {
	if (!wn(e, n)) return !1;
	let i = e.position, a = e.position, o = e.input.charCodeAt(e.position), s = n === M, c = !1;
	for (; o !== 0 && !mn(e);) {
		if (o === 58) {
			let t = e.input.charCodeAt(e.position + 1);
			if (H(t) || s && U(t)) break;
		} else if (o === 35) {
			if (V(e.input.charCodeAt(e.position - 1))) break;
		} else if (s && U(o)) break;
		else if (z(o)) {
			let n = e.position, r = e.line, i = e.lineStart, a = e.lineIndent;
			if (W(e, !1), e.lineIndent >= t) {
				c = !0, o = e.input.charCodeAt(e.position);
				continue;
			}
			e.position = n, e.line = r, e.lineStart = i, e.lineIndent = a;
			break;
		}
		B(o) || (a = e.position + 1), o = e.input.charCodeAt(++e.position);
	}
	return a === i ? !1 : (gn(e, i, a), N(e, i, a, r.anchorStart, r.anchorEnd, r.tagStart, r.tagEnd, E.PLAIN, O.CLIP, -1, !c), !0);
}
function K(e, t) {
	let n = e.line;
	W(e, !0), (e.line > n && e.lineIndent < t || e.firstTabInLine !== -1 && e.lineIndent < t) && R(e, "deficient indentation");
}
function En(e, t, n) {
	let r = e.input.charCodeAt(e.position), i = r === 123, a = e.position, o = !0;
	if (r !== 91 && r !== 123) return !1;
	let s = i ? 125 : 93;
	for (i ? rn(e, a, n.anchorStart, n.anchorEnd, n.tagStart, n.tagEnd, D.FLOW) : nn(e, a, n.anchorStart, n.anchorEnd, n.tagStart, n.tagEnd, D.FLOW), e.position++; e.input.charCodeAt(e.position) !== 0;) {
		K(e, t);
		let n = e.input.charCodeAt(e.position);
		if (n === s) return e.position++, P(e), !0;
		o ? n === 44 && R(e, "expected the node content, but found ','") : R(e, "missed comma between flow collection entries");
		let r = !1, a = !1;
		n === 63 && V(e.input.charCodeAt(e.position + 1)) && (r = a = !0, e.position += 1, K(e, t));
		let c = e.line, l = I(e), u = q(e, t, M, !1, !0);
		K(e, t), n = e.input.charCodeAt(e.position), (i || a || e.line === c) && n === 58 ? (r = !0, e.position++, K(e, t), i || an(e, l), u || F(e), q(e, t, M, !1, !0) || F(e), K(e, t), i || P(e)) : i && r ? (u || F(e), F(e)) : i ? F(e) : r && (an(e, l), u || F(e), F(e), P(e)), n = e.input.charCodeAt(e.position), n === 44 ? (o = !0, e.position++) : o = !1;
	}
	R(e, "unexpected end of the stream within a flow collection");
}
function Dn(e, t, n) {
	if (e.firstTabInLine !== -1 || e.input.charCodeAt(e.position) !== 45 || !H(e.input.charCodeAt(e.position + 1))) return !1;
	for (nn(e, e.position, n.anchorStart, n.anchorEnd, n.tagStart, n.tagEnd, D.BLOCK); e.input.charCodeAt(e.position) === 45 && H(e.input.charCodeAt(e.position + 1));) {
		e.firstTabInLine !== -1 && (e.position = e.firstTabInLine, R(e, "tab characters must not be used in indentation"));
		let n = e.line;
		e.position++;
		let r = W(e, !0) > 0;
		if (e.firstTabInLine !== -1 && e.input.charCodeAt(e.position) === 45 && H(e.input.charCodeAt(e.position + 1)) && R(e, "bad indentation of a sequence entry"), r && e.lineIndent <= t ? F(e) : q(e, t, Wt, !1, !0), W(e, !0), e.lineIndent < t || e.position >= e.length) break;
		e.lineIndent > t && R(e, "bad indentation of a sequence entry"), e.line === n && e.input.charCodeAt(e.position) === 45 && H(e.input.charCodeAt(e.position + 1)) && R(e, "bad indentation of a sequence entry");
	}
	return P(e), !0;
}
function On(e, t, n, r) {
	let i = !1, a = !1, o = !1, s = !1;
	if (e.firstTabInLine !== -1) return !1;
	let c = e.input.charCodeAt(e.position);
	for (; c !== 0;) {
		!i && e.firstTabInLine !== -1 && (e.position = e.firstTabInLine, R(e, "tab characters must not be used in indentation"));
		let l = e.input.charCodeAt(e.position + 1), u = e.line;
		if ((c === 63 || c === 58) && H(l)) o || (rn(e, e.position, r.anchorStart, r.anchorEnd, r.tagStart, r.tagEnd, D.BLOCK), o = !0), c === 63 ? (i && F(e), a = !0, i = !0) : i ? i = !1 : (F(e), a = !0, i = !1), e.position += 1, s = !0;
		else {
			i && (F(e), i = !1);
			let t = I(e);
			if (!q(e, n, Ut, !1, !0)) break;
			if (e.line === u) {
				for (c = e.input.charCodeAt(e.position); B(c);) c = e.input.charCodeAt(++e.position);
				if (c === 58) {
					if (c = e.input.charCodeAt(++e.position), H(c) || R(e, "a whitespace character is expected after the key-value separator within a block mapping"), !o) {
						for (L(e, t), rn(e, t.position, r.anchorStart, r.anchorEnd, r.tagStart, r.tagEnd, D.BLOCK), o = !0, q(e, n, Ut, !1, !0), c = e.input.charCodeAt(e.position); B(c);) c = e.input.charCodeAt(++e.position);
						e.position++;
					}
					a = !0, i = !1, s = !1;
				} else if (a) R(e, "expected ':' after a mapping key");
				else return r.anchorStart !== j || r.tagStart !== j ? (L(e, t), !1) : !0;
			} else if (a) R(e, "can not read a block mapping entry; a multiline key may not be an implicit key");
			else return r.anchorStart !== j || r.tagStart !== j ? (L(e, t), !1) : !0;
		}
		if (q(e, t, Gt, !0, s) && (s = !1), i || s && (F(e), s = !1), W(e, !0), c = e.input.charCodeAt(e.position), (e.line === u || e.lineIndent > t) && c !== 0) R(e, "bad indentation of a mapping entry");
		else if (e.lineIndent < t) break;
	}
	return a ? (i && F(e), o && P(e), !0) : !1;
}
function q(e, t, n, r, i, a = !0) {
	e.depth >= e.maxDepth && R(e, `nesting exceeded maxDepth (${e.maxDepth})`), e.depth++;
	let o = 1, s = !1, c = !1, l = null, u = sn(), d = n === Gt || n === Wt, f = d, p = d;
	if (r && W(e, !0) && (s = !0, o = e.lineIndent > t ? 1 : e.lineIndent === t ? 0 : -1), o === 1) for (;;) {
		let r = e.input.charCodeAt(e.position), i = I(e);
		if (s && o !== 1 && (r === 33 || r === 38)) break;
		if (s && p && (u.tagStart !== j || u.anchorStart !== j) && (r === 33 || r === 38)) {
			var m;
			let n = I(e), r = t + 1;
			if (On(e, e.position - e.lineStart, r, u) && ((m = e.events[n.eventsLength]) == null ? void 0 : m.type) === T.MAPPING) return e.depth--, !0;
			L(e, n);
		}
		if (s && (r === 33 && u.tagStart !== j || r === 38 && u.anchorStart !== j) || !_n(e, u, n === M) && !vn(e, u)) break;
		l === null && (l = i), W(e, !0) ? (s = !0, f = p, o = e.lineIndent > t ? 1 : e.lineIndent === t ? 0 : -1) : f = !1;
	}
	if (f && (f = s || i), o === 1 || n === Gt) {
		let r = n === M || n === Ut ? t : t + 1, i = e.position - e.lineStart;
		if (o === 1) if (f && (Dn(e, i, u) || On(e, i, r, u)) || En(e, r, u)) c = !0;
		else {
			let t = e.input.charCodeAt(e.position);
			if (l !== null && a && p && !f && t !== 124 && t !== 62) {
				var h;
				let t = I(e), n = l.position - l.lineStart;
				L(e, l), On(e, n, r, sn()) && ((h = e.events[t.eventsLength]) == null ? void 0 : h.type) === T.MAPPING ? c = !0 : L(e, t);
			}
			!c && (d && Cn(e, r, u) || xn(e, r, u) || Sn(e, r, u) || yn(e, u) || Tn(e, r, n, u)) && (c = !0);
		}
		else o === 0 && (c = f && Dn(e, i, u));
	}
	return d = d && !c, !c && (u.anchorStart !== j || u.tagStart !== j || d) && (N(e, j, j, u.anchorStart, u.anchorEnd, u.tagStart, u.tagEnd, E.PLAIN), c = !0), e.depth--, c || u.anchorStart !== j || u.tagStart !== j;
}
function kn(e) {
	if (e.lineIndent > 0 || e.input.charCodeAt(e.position) !== 37) return !1;
	e.position++;
	let t = e.position;
	for (; e.input.charCodeAt(e.position) !== 0 && !V(e.input.charCodeAt(e.position));) e.position++;
	let n = e.input.slice(t, e.position), r = [];
	for (n.length === 0 && R(e, "directive name must not be less than one character in length"); e.input.charCodeAt(e.position) !== 0 && !z(e.input.charCodeAt(e.position));) {
		for (; B(e.input.charCodeAt(e.position));) e.position++;
		if (e.input.charCodeAt(e.position) === 35 || z(e.input.charCodeAt(e.position)) || e.input.charCodeAt(e.position) === 0) break;
		let t = e.position;
		for (; e.input.charCodeAt(e.position) !== 0 && !V(e.input.charCodeAt(e.position));) e.position++;
		r.push(e.input.slice(t, e.position));
	}
	if (z(e.input.charCodeAt(e.position)) && fn(e), n === "YAML") {
		e.directives.some((e) => e.kind === "yaml") && R(e, "duplication of %YAML directive"), r.length !== 1 && R(e, "YAML directive accepts exactly one argument");
		let t = /^([0-9]+)\.([0-9]+)$/.exec(r[0]);
		t === null && R(e, "ill-formed argument of the YAML directive"), parseInt(t[1], 10) !== 1 && R(e, "unacceptable YAML version of the document"), e.directives.push({
			kind: "yaml",
			version: r[0]
		});
	} else if (n === "TAG") {
		r.length !== 2 && R(e, "TAG directive accepts exactly two arguments");
		let [t, n] = r;
		Jt.test(t) || R(e, "ill-formed tag handle (first argument) of the TAG directive"), Ht.call(e.tagHandlers, t) && R(e, `there is a previously declared suffix for "${t}" tag handle`), $t.test(n) || R(e, "ill-formed tag prefix (second argument) of the TAG directive"), e.tagHandlers[t] = n, e.directives.push({
			kind: "tag",
			handle: t,
			prefix: n
		});
	}
	return !0;
}
function An(e) {
	e.directives = [], e.tagHandlers = Object.create(null);
	let t = !1;
	for (W(e, !0); kn(e);) t = !0, W(e, !0);
	let n = !1, r = !1, i = !0;
	if (e.lineIndent === 0 && e.input.charCodeAt(e.position) === 45 && e.input.charCodeAt(e.position + 1) === 45 && e.input.charCodeAt(e.position + 2) === 45 && H(e.input.charCodeAt(e.position + 3))) {
		n = !0;
		let t = e.line;
		e.position += 3, W(e, !0), i = e.line > t;
	} else t && R(e, "directives end mark is expected");
	let a = e.events.length;
	if (!n && e.position === e.lineStart && e.input.charCodeAt(e.position) === 46 && G(e)) {
		e.position += 3, W(e, !0);
		return;
	}
	if (tn(e, n, !1), q(e, e.lineIndent - 1, Gt, !1, i, i) || F(e), W(e, !0), e.position === e.lineStart && G(e) && (r = e.input.charCodeAt(e.position) === 46, r)) {
		let t = e.line;
		e.position += 3, W(e, !0), e.line === t && e.position < e.length && R(e, "end of the stream or a document separator is expected");
	}
	let o = e.events[a];
	(o == null ? void 0 : o.type) === T.DOCUMENT && (o.explicitEnd = r), P(e), !r && e.position < e.length && !mn(e) && R(e, "end of the stream or a document separator is expected");
}
function jn(e, t) {
	let n = e.length, r = x(x(x({}, en), t), {}, {
		input: `${e}\0`,
		length: n,
		position: 0,
		line: 0,
		lineStart: 0,
		lineIndent: 0,
		firstTabInLine: -1,
		depth: 0,
		directives: [],
		tagHandlers: Object.create(null),
		events: []
	}), i = e.indexOf("\0");
	for (i !== -1 && w.throwAt(e, i, "null byte is not allowed in input", r.filename); r.position < r.length && (pn(r), W(r, !0), !(r.position >= r.length));) {
		let e = r.position;
		An(r), r.position === e && R(r, "can not read a document");
	}
	return r.events;
}
//#endregion
//#region src/load.ts
var Mn = x(x({}, en), kt);
function Nn(e, t = {}) {
	let n = x(x({}, Mn), t), r = String(e), i = Object.keys(en), a = Object.keys(kt);
	return Vt(jn(r, Ve(n, i)), x(x({}, Ve(n, a)), {}, { source: r }));
}
function Pn(e, t, n) {
	let r = null;
	typeof t == "function" ? r = t : typeof t == "object" && t && (n = t);
	let i = Nn(e, n);
	if (r === null) return i;
	for (let e of i) r(e);
}
function Fn(e, t) {
	let n = Nn(e, t);
	if (n.length === 0) throw new w("expected a document, but the input is empty");
	if (n.length === 1) return n[0];
	throw new w("expected a single document in the stream, but found more");
}
//#endregion
//#region src/ast/from_js.ts
var J = Symbol("INVALID");
function In(e) {
	let t = new Set([
		e.defaultScalarTag,
		e.defaultSequenceTag,
		e.defaultMappingTag
	].filter((e) => e !== void 0)), n = e.implicitScalarTags, r = e.tags.filter((e) => !(e.nodeKind === "scalar" && e.implicit) && !t.has(e)), i = e.tags.filter((e) => t.has(e));
	return [
		...n.map((e) => ({
			tag: e,
			implicitTag: !0
		})),
		...r.map((e) => ({
			tag: e,
			implicitTag: !1
		})),
		...i.map((e) => ({
			tag: e,
			implicitTag: !0
		}))
	];
}
function Ln(e, t) {
	for (let n = 0, r = e.representTypes.length; n < r; n += 1) {
		let { tag: r, implicitTag: i } = e.representTypes[n];
		if (r.identify(t)) {
			let e;
			return e = r.matchByTagPrefix ? r.representTagName(t) : r.tagName, {
				tag: r,
				tagName: e,
				implicitTag: i
			};
		}
	}
	return null;
}
function Y(e, t) {
	if (!e.noRefs && typeof t == "object" && t) {
		let n = e.refs.get(t);
		if (n) return n.anchor === void 0 && (n.anchor = `ref_${e.refCounter++}`), {
			kind: "alias",
			anchor: n.anchor
		};
	}
	let n = Ln(e, t);
	if (!n) {
		if (t === void 0 || e.skipInvalid) return J;
		throw new w(`unacceptable kind of an object to dump ${Object.prototype.toString.call(t)}`);
	}
	let { tag: r, tagName: i, implicitTag: a } = n, o = a ? i : Dt(i);
	if (r.nodeKind === "scalar") return {
		kind: "scalar",
		tag: o,
		tagged: !a,
		style: E.PLAIN,
		value: r.represent(t)
	};
	if (r.nodeKind === "sequence") {
		let n = r.represent(t), i = {
			kind: "sequence",
			tag: o,
			tagged: !a,
			style: D.BLOCK,
			items: []
		};
		e.noRefs || e.refs.set(t, i);
		for (let t = 0, r = n.length; t < r; t += 1) {
			let r = Y(e, n[t]);
			r === J && n[t] === void 0 && (r = Y(e, null)), r !== J && i.items.push(r);
		}
		return i;
	}
	let s = r.represent(t), c = {
		kind: "mapping",
		tag: o,
		tagged: !a,
		style: D.BLOCK,
		items: []
	};
	e.noRefs || e.refs.set(t, c);
	for (let [t, n] of s) {
		let r = Y(e, t);
		if (r === J) continue;
		let i = Y(e, n);
		i !== J && c.items.push({
			key: r,
			value: i
		});
	}
	return c;
}
function Rn(e, t, n = {}) {
	var r, i;
	let a = Y({
		representTypes: In(t),
		noRefs: (r = n.noRefs) == null ? !1 : r,
		skipInvalid: (i = n.skipInvalid) == null ? !1 : i,
		refs: /* @__PURE__ */ new Map(),
		refCounter: 0
	}, e);
	return [{
		contents: a === J ? null : a,
		directives: []
	}];
}
//#endregion
//#region src/ast/visit.ts
var zn = Symbol("visit:break"), Bn = Symbol("visit:skip");
function Vn(e, t, n) {
	let r = t(e, n);
	if (r === zn) return !0;
	if (r === Bn) return !1;
	let i = n.depth + 1;
	switch (e.kind) {
		case "sequence":
			for (let n of e.items) if (Vn(n, t, {
				depth: i,
				parent: e,
				isKey: !1
			})) return !0;
			break;
		case "mapping":
			for (let { key: n, value: r } of e.items) if (Vn(n, t, {
				depth: i,
				parent: e,
				isKey: !0
			}) || Vn(r, t, {
				depth: i,
				parent: e,
				isKey: !1
			})) return !0;
			break;
	}
	return !1;
}
function Hn(e, t) {
	for (let n of e) if (n.contents && Vn(n.contents, t, {
		depth: 0,
		parent: null,
		isKey: !1
	})) return;
}
//#endregion
//#region src/ast/styler_defaults.ts
function Un(e, t) {
	return (e & 1 << t) != 0;
}
var Wn = {
	applyQuoteFlowKeysOption: Kn,
	doubleQuoteForInvisibles: qn,
	doubleQuoteWhitespaceOnly: Jn,
	applyForceQuotesOption: Yn,
	tryLongOrMultilineAsBlock: Xn,
	quoteInvalidPlain: Zn,
	fallbackToDoubleQuoted: Qn
};
function Gn(e) {
	return e.presenterOptions.quoteStyle === "single" && Un(e.allowedStylesMask, E.SINGLE_QUOTED) ? E.SINGLE_QUOTED : E.DOUBLE_QUOTED;
}
function Kn(e) {
	e.presenterOptions.quoteFlowKeys && (!e.isKey || !e.flowOnly || e.style !== E.PLAIN || (e.style = E.DOUBLE_QUOTED));
}
function qn(e) {
	e.style === E.PLAIN && /[\t\x7F-\xA0\u2028\u2029\uFEFF\uFFFE\uFFFF]/.test(e.node.value) && (e.style = E.DOUBLE_QUOTED);
}
function Jn(e) {
	e.style === E.PLAIN && /^\s+$/.test(e.node.value) && (e.style = E.DOUBLE_QUOTED);
}
function Yn(e) {
	e.presenterOptions.forceQuotes && (e.isKey || e.style !== E.PLAIN || (e.style = e.node.value.includes("\n") ? E.DOUBLE_QUOTED : Gn(e)));
}
function Xn(e) {
	if (e.style !== E.PLAIN || e.isKey) return;
	let t = e.node.value, n = t.indexOf("\n") !== -1;
	if (!Un(e.allowedStylesMask, E.LITERAL_BLOCK)) {
		n && (e.style = E.DOUBLE_QUOTED);
		return;
	}
	let r = e.presenterOptions.lineWidth;
	if (r === -1) {
		n && (e.style = E.LITERAL_BLOCK);
		return;
	}
	let i = Math.max(Math.min(r, 40), r - e.shiftOfContent), a = 0, o = !1;
	for (; a <= t.length;) {
		let e = t.length, n = t.indexOf("\n", a);
		n !== -1 && (e = n);
		let r = t.slice(a, e);
		if (r.length > i && r[0] !== " " && / [^ \t]/.test(r) && (o = !0), n === -1) break;
		a = n + 1;
	}
	o ? e.style = E.FOLDED_BLOCK : n && (e.style = E.LITERAL_BLOCK);
}
function Zn(e) {
	e.style === E.PLAIN && !Un(e.allowedStylesMask, E.PLAIN) && (e.style = Gn(e));
}
function Qn(e) {
	Un(e.allowedStylesMask, e.style) || (e.style = E.DOUBLE_QUOTED);
}
//#endregion
//#region src/ast/scalar_styler.ts
function X(e, t) {
	return e | 1 << t;
}
var $n = "[\\x09\\x0A\\x0D\\x20-\\x7E\\x85\\xA0-\\uD7FF\\uE000-\\uFFFD\\u{10000}-\\u{10FFFF}]", er = "[\\n\\r]", tr = "\\uFEFF", nr = "[ \\t]", rr = `(?:(?!(?:${er}|${tr}))${$n})`, ir = `(?:(?!${nr})${rr})`, ar = "[\\x09\\x20-\\uD7FF\\uE000-\\uFFFF\\u{10000}-\\u{10FFFF}]", or = "[-?:,\\[\\]{}#&*!|>'\"%@`]", sr = "[,\\[\\]{}]", cr = ir, lr = `(?:(?!${sr})${ir})`, ur = `(?:(?:(?!${or})${ir})|[?:-](?=${cr}))`, dr = `(?:(?:(?!${or})${ir})|[?:-](?=${lr}))`, fr = `(?:(?:(?![:#])${cr})|:(?=${cr}))#*`, pr = `(?:(?:(?![:#])${lr})|:(?=${lr}))#*`, mr = `(?:${nr}*${fr})*`, hr = `(?:${nr}*${pr})*`, gr = `${ur}#*${mr}`, _r = `${dr}#*${hr}`, vr = gr, yr = _r, br = `\\n+${fr}${mr}`, xr = `\\n+${pr}${hr}`, Sr = `${gr}(?:${br})*`, Cr = `${_r}(?:${xr})*`, wr = RegExp(`^(?:${Sr})$`, "u"), Tr = RegExp(`^(?:${Cr})$`, "u"), Er = RegExp(`^(?:${vr})$`, "u"), Dr = RegExp(`^(?:${yr})$`, "u"), Or = RegExp(`^(?:${ar})*$`, "u"), kr = RegExp(`^(?:${ar}|\\n)*$`, "u"), Ar = RegExp(`^(?:${rr}|\\n)*$`, "u"), jr = /^(?:---|\.\.\.)(?=$|[ \t\n\r])/, Mr = /^(?:---|\.\.\.)(?=$|[ \t\n\r])/m;
function Nr(e) {
	let t = e.node.value;
	if (t !== "") {
		if (!(e.isKey ? e.flowOnly ? Dr : Er : e.flowOnly ? Tr : wr).test(t) || e.shiftOfFirstLine === 0 && jr.test(t)) return !1;
		if (e.shiftOfContent === 0) {
			let e = t.indexOf("\n");
			if (e !== -1) {
				let n = t.slice(e + 1);
				if (Mr.test(n)) return !1;
			}
		}
	}
	let n = e.presenterOptions.schema.resolveImplicitScalarTag(t).tag.tagName;
	return !(!e.node.tagged && n !== e.node.tag || !e.node.tagged && t === "=" && n === e.presenterOptions.schema.defaultScalarTag.tagName);
}
function Pr(e) {
	let t = e.node.value;
	if (!(e.isKey ? Or : kr).test(t) || /[ \t]\n|\n[ \t]/.test(t)) return !1;
	if (!e.isKey && e.shiftOfContent === 0) {
		let e = t.indexOf("\n");
		if (e !== -1 && Mr.test(t.slice(e + 1))) return !1;
	}
	return !0;
}
function Fr(e) {
	if (e.flowOnly || !Ar.test(e.node.value)) return !1;
	let t = e.shiftOfContent - e.shiftOfParent;
	return !(t < 1 || t > 9 && /^\n* /.test(e.node.value) || e.shiftOfContent === 0 && Mr.test(e.node.value));
}
function Ir(e) {
	let t = X(0, E.DOUBLE_QUOTED);
	Nr(e) && (t = X(t, E.PLAIN)), Pr(e) && (t = X(t, E.SINGLE_QUOTED)), Fr(e) && (t = X(X(t, E.LITERAL_BLOCK), E.FOLDED_BLOCK)), e.allowedStylesMask = t;
}
function Lr(e) {
	switch (e.style) {
		case E.PLAIN: return Rr(e);
		case E.SINGLE_QUOTED: return zr(e);
		case E.LITERAL_BLOCK: return Br(e);
		case E.FOLDED_BLOCK: return Vr(e);
		case E.DOUBLE_QUOTED: return Hr(e);
	}
}
function Rr(e) {
	return Ur(e.node.value, e.shiftOfContent);
}
function zr(e) {
	return `'${Ur(e.node.value, e.shiftOfContent).replace(/'/g, "''")}'`;
}
function Br(e) {
	let t = e.node.value;
	return "|" + Kr(t, e.shiftOfParent, e.shiftOfContent) + qr(Wr(t, e.shiftOfContent));
}
function Vr(e) {
	let t = e.node.value, n = e.presenterOptions.lineWidth, r = Infinity;
	return n !== -1 && (r = Math.max(Math.min(n, 40), n - e.shiftOfContent)), ">" + Kr(t, e.shiftOfParent, e.shiftOfContent) + qr(Wr(Xr(t, r), e.shiftOfContent));
}
function Hr(e) {
	return `"${$r(e.node.value)}"`;
}
function Ur(e, t) {
	let n = e.indexOf("\n");
	if (n === -1) return e;
	let r = " ".repeat(t), i = e.slice(0, n), a = /(\n+)([^\n]*)/g;
	a.lastIndex = n;
	let o;
	for (; o = a.exec(e);) {
		let e = o[1].length, t = o[2];
		i += "\n".repeat(e + 1) + r + t;
	}
	return i;
}
function Wr(e, t) {
	let n = " ".repeat(t), r = 0, i = "", a = e.length;
	for (; r < a;) {
		let t, o = e.indexOf("\n", r);
		o === -1 ? (t = e.slice(r), r = a) : (t = e.slice(r, o + 1), r = o + 1), t.length && t !== "\n" && (i += n), i += t;
	}
	return i;
}
function Gr(e) {
	return /^\n* /.test(e);
}
function Kr(e, t, n) {
	let r = Gr(e) ? String(n - t) : "", i = e[e.length - 1] === "\n";
	return `${r}${i && (e[e.length - 2] === "\n" || e === "\n") ? "+" : i ? "" : "-"}\n`;
}
function qr(e) {
	return e[e.length - 1] === "\n" ? e.slice(0, -1) : e;
}
function Jr(e) {
	return e === " " || e === "	";
}
function Yr(e, t) {
	if (e === "" || Jr(e[0])) return e;
	let n = / [^ \t]/g, r, i = 0, a, o = 0, s = 0, c = "";
	for (; r = n.exec(e);) s = r.index, s - i > t && (a = o > i ? o : s, c += `\n${e.slice(i, a)}`, i = a + 1), o = s;
	return c += "\n", e.length - i > t && o > i ? c += `${e.slice(i, o)}\n${e.slice(o + 1)}` : c += e.slice(i), c.slice(1);
}
function Xr(e, t) {
	let n = /(\n+)([^\n]*)/g, r = e.indexOf("\n");
	r === -1 && (r = e.length), n.lastIndex = r;
	let i = Yr(e.slice(0, r), t), a = e[0] === "\n" || Jr(e[0]), o, s;
	for (; s = n.exec(e);) {
		let e = s[1], n = s[2];
		o = n !== "" && Jr(n[0]), i += e + (!a && !o && n !== "" ? "\n" : "") + Yr(n, t), a = o;
	}
	return i;
}
var Zr = /["\\\x00-\x1F\x7F-\xA0\u2028\u2029\uD800-\uDFFF\uFEFF\uFFFE\uFFFF]/gu;
function Qr(e) {
	switch (e) {
		case "\0": return "\\0";
		case "\x07": return "\\a";
		case "\b": return "\\b";
		case "	": return "\\t";
		case "\n": return "\\n";
		case "\v": return "\\v";
		case "\f": return "\\f";
		case "\r": return "\\r";
		case "\x1B": return "\\e";
		case "\"": return "\\\"";
		case "\\": return "\\\\";
		case "": return "\\N";
		case "\xA0": return "\\_";
		case "\u2028": return "\\L";
		case "\u2029": return "\\P";
	}
	let t = e.charCodeAt(0), n = t.toString(16).toUpperCase();
	return t <= 255 ? `\\x${"0".repeat(2 - n.length)}${n}` : `\\u${"0".repeat(4 - n.length)}${n}`;
}
function $r(e) {
	return e.replace(Zr, Qr);
}
//#endregion
//#region src/ast/presenter.ts
var Z = 10, ei = {
	indent: 2,
	seqNoIndent: !1,
	seqInlineFirst: !0,
	lineWidth: 80,
	flowBracketPadding: !1,
	flowSkipCommaSpace: !1,
	flowSkipColonSpace: !1,
	quoteFlowKeys: !1,
	quoteStyle: "single",
	forceQuotes: !1,
	scalarStyleRules: Object.keys(Wn).map((e) => Reflect.get(Wn, e)),
	tagBeforeAnchor: !1
};
function ti(e) {
	return e.tagged ? e.tag : Dt(e.tag);
}
function ni(e) {
	let t = x(x({}, ei), e);
	return t.flowSkipColonSpace && (t.quoteFlowKeys = !0), x(x({}, t), {}, {
		defaultScalarTagName: t.schema.defaultScalarTag.tagName,
		openEnded: !1
	});
}
function ri(e, t) {
	return `\n${" ".repeat(e.indent * t)}`;
}
function ii(e, t, n, r, i, a) {
	return {
		node: t,
		parent: n,
		level: r,
		isKey: i,
		flowOnly: a,
		shiftOfParent: r === 0 ? -1 : e.indent * (r - 1),
		shiftOfContent: e.indent * Math.max(1, r),
		shiftOfFirstLine: r === 0 ? 0 : e.indent * r,
		presenterOptions: e,
		allowedStylesMask: 0,
		style: t.style
	};
}
function ai(e, t, n) {
	let r = "";
	for (let i = 0, a = n.items.length; i < a; i += 1) {
		let a = Q(e, t, n.items[i], n, {}).text;
		i > 0 && (r += `,${e.flowSkipCommaSpace ? "" : " "}`), r += a;
	}
	let i = e.flowBracketPadding && n.items.length > 0 ? " " : "";
	return `[${i}${r}${i}]`;
}
function oi(e, t, n, r) {
	let i = "";
	for (let a = 0, o = n.items.length; a < o; a += 1) {
		let o = Q(e, t + 1, n.items[a], n, {
			block: !0,
			compact: e.seqInlineFirst,
			isblockseq: !0
		}).text;
		(!r || i !== "") && (i += ri(e, t)), o === "" || Z === o.charCodeAt(0) ? i += "-" : i += "- ", i += o;
	}
	return i;
}
function si(e, t, n) {
	let r = "";
	for (let { key: i, value: a } of n.items) {
		let o = "";
		r !== "" && (o += `,${e.flowSkipCommaSpace ? "" : " "}`);
		let s = Q(e, t, i, n, { iskey: !0 }), c = s.text, l = Q(e, t, a, n, {}).text, u = e.flowSkipColonSpace || l === "" ? "" : " ", d = i.kind === "scalar" && s.noBody && (i.tagged || i.anchor !== void 0), f = i.kind === "alias" || d ? " " : "";
		o += `${c}${f}:${u}${l}`, r += o;
	}
	let i = e.flowBracketPadding && r !== "" ? " " : "";
	return `{${i}${r}${i}}`;
}
function ci(e, t, n, r) {
	let i = "";
	for (let a = 0, o = n.items.length; a < o; a += 1) {
		let o = "";
		(!r || i !== "") && (o += ri(e, t));
		let { key: s, value: c } = n.items[a], l = (s.kind === "mapping" || s.kind === "sequence") && s.style === D.BLOCK && s.items.length !== 0 || s.kind === "scalar" && (s.style === E.LITERAL_BLOCK || s.style === E.FOLDED_BLOCK), u = l ? Q(e, t + 1, s, n, {
			block: !0,
			compact: !0,
			isblockseq: !li(e, s, t + 1)
		}) : Q(e, t + 1, s, n, {
			block: !0,
			compact: !0,
			iskey: !0
		}), d = u.text, f = s.kind === "scalar" && s.value.indexOf("\n") !== -1, p = d.length > 1024 && /^[\s\S]{1025}/u.test(d), m = l || f || p;
		m && (d && Z === d.charCodeAt(0) ? o += "?" : o += "? "), o += d, m && (o += ri(e, t));
		let h = Q(e, t + 1, c, n, {
			block: !0,
			compact: m,
			isblockseq: m && !li(e, c, t + 1)
		}).text, ee = s.kind === "scalar" && u.noBody && (s.tagged || s.anchor !== void 0), te = !m && (s.kind === "alias" || ee) ? " " : "";
		h === "" || Z === h.charCodeAt(0) ? o += `${te}:` : o += `${te}: `, o += h, i += o;
	}
	return i;
}
function li(e, t, n) {
	return t.kind === "alias" ? !0 : t.tagged || t.anchor !== void 0 || e.indent < 2 && n > 0;
}
function Q(e, t, n, r, i) {
	var a;
	if (n.kind === "alias") return e.openEnded = !1, {
		text: `*${n.anchor}`,
		noBody: !1
	};
	let { block: o = !1, iskey: s = !1, isblockseq: c = !1 } = i, l = (a = i.compact) == null ? !1 : a, u = n.anchor !== void 0;
	li(e, n, t) && (l = !1);
	let d, f = n.tagged, p = o && (n.kind === "mapping" || n.kind === "sequence") && n.style === D.BLOCK && n.items.length !== 0;
	if (n.kind === "mapping") d = p ? ci(e, t, n, l) : si(e, t, n);
	else if (n.kind === "sequence") d = p ? e.seqNoIndent && !c && t > 0 ? oi(e, t - 1, n, l) : oi(e, t, n, l) : ai(e, t, n);
	else {
		let i = ii(e, n, r, t, s, !o);
		Ir(i);
		for (let t of e.scalarStyleRules) t(i);
		d = Lr(i), e.openEnded = (i.style === E.LITERAL_BLOCK || i.style === E.FOLDED_BLOCK) && (n.value === "\n" || n.value.endsWith("\n\n")), f = n.tagged || d === "" && i.flowOnly && (r == null ? void 0 : r.kind) === "sequence" && !u || i.style !== E.PLAIN && n.tag !== e.defaultScalarTagName;
	}
	(n.kind === "mapping" || n.kind === "sequence") && !p && (e.openEnded = !1), p && l && t > 0 && e.indent > 2 && (d = `${" ".repeat(e.indent - 2)}${d}`);
	let m = d === "", h = d;
	if (f || u) {
		let t = [], r = f ? ti(n) : null, i = u ? `&${n.anchor}` : null;
		e.tagBeforeAnchor ? (r !== null && t.push(r), i !== null && t.push(i)) : (i !== null && t.push(i), r !== null && t.push(r));
		let a = d === "" || d.charCodeAt(0) === Z ? "" : " ";
		h = `${t.join(" ")}${a}${d}`;
	}
	return {
		text: h,
		noBody: m
	};
}
function ui(e) {
	return (e.kind === "sequence" || e.kind === "mapping") && e.style === D.BLOCK && e.items.length !== 0 && !e.tagged && e.anchor === void 0;
}
function di(e) {
	let t = "";
	for (let n of e.directives) {
		if (n.kind === "yaml") {
			t += `%YAML ${n.version}\n`;
			continue;
		}
		let { handle: e, prefix: r } = n;
		t += `%TAG ${e} ${r}\n`;
	}
	return t;
}
function fi(e, t) {
	let n = ni(t), r = "", i = !1;
	for (let t = 0; t < e.length; t += 1) {
		let a = e[t];
		n.openEnded = !1;
		let o = di(a), s = o !== "", c = a.explicitStart || s || t > 0 && !i;
		if (r += o, a.contents === null) c && (r += "---\n");
		else if (c) {
			let e = Q(n, 0, a.contents, null, {
				block: !0,
				compact: !0
			}).text, t = e === "" ? "" : s || ui(a.contents) ? "\n" : " ";
			r += `---${t}${e}\n`;
		} else r += Q(n, 0, a.contents, null, {
			block: !0,
			compact: !0
		}).text + "\n";
		i = a.explicitEnd || n.openEnded, i && (r += "...\n");
	}
	return r;
}
//#endregion
//#region src/dump.ts
var pi = x(x({}, ei), {}, {
	schema: tt,
	skipInvalid: !1,
	noRefs: !1,
	flowLevel: -1,
	sortKeys: !1,
	transform: () => {}
});
function mi(e, t) {
	let n = String(e), r = String(t);
	return n < r ? -1 : +(n > r);
}
function hi(e, t = {}) {
	let n = x(x({}, pi), t), r = Rn(e, n.schema, {
		noRefs: n.noRefs,
		skipInvalid: n.skipInvalid
	});
	if (n.flowLevel >= 0 && Hn(r, (e, t) => {
		if (!(t.depth < n.flowLevel)) return (e.kind === "sequence" || e.kind === "mapping") && (e.style = D.FLOW), Bn;
	}), n.sortKeys) {
		let e = n.sortKeys === !0 ? mi : n.sortKeys;
		Hn(r, (t) => {
			t.kind === "mapping" && t.items.sort((t, n) => e(t.key.kind === "scalar" ? t.key.value : "", n.key.kind === "scalar" ? n.key.value : ""));
		});
	}
	return n.transform(r), fi(r, x(x({}, Ve(n, Object.keys(ei))), {}, { schema: n.schema }));
}
//#endregion
//#region src/ast/from_events.ts
var $ = -1;
function gi(e) {
	return "tagStart" in e && e.tagStart !== $ ? e.tagStart : "anchorStart" in e && e.anchorStart !== $ ? e.anchorStart : "valueStart" in e && e.valueStart !== $ ? e.valueStart : "start" in e ? e.start : 0;
}
function _i(e, t) {
	return t.tagStart === $ ? "" : e.source.slice(t.tagStart, t.tagEnd);
}
function vi(e, t) {
	return t.anchorStart === $ ? void 0 : e.source.slice(t.anchorStart, t.anchorEnd);
}
function yi(e, t) {
	let n = Ct(e.source, t), r = _i(e, t), i, a = !1;
	return r === "" ? i = t.style === E.PLAIN ? e.schema.resolveImplicitScalarTag(n).tag.tagName : e.schema.defaultScalarTag.tagName : (a = !0, i = r), {
		kind: "scalar",
		tag: i,
		tagged: a,
		style: t.style,
		anchor: vi(e, t),
		value: n
	};
}
function bi(e, t, n) {
	let r = _i(e, t), i, a = !1;
	return r === "" ? i = n : (i = r, a = !0), {
		tag: i,
		tagged: a,
		style: t.style,
		anchor: vi(e, t)
	};
}
function xi(e, t) {
	let n = e.frames[e.frames.length - 1];
	n.kind === "document" ? n.doc.contents = t : n.kind === "sequence" ? n.node.items.push(t) : n.key ? (n.node.items.push({
		key: n.key,
		value: t
	}), n.key = null) : n.key = t;
}
function Si(e, t) {
	let n = {
		source: t.source,
		schema: t.schema,
		eventIndex: 0,
		position: 0,
		frames: [],
		documents: []
	};
	for (; n.eventIndex < e.length;) {
		let t = e[n.eventIndex++];
		switch (n.position = gi(t), t.type) {
			case T.DOCUMENT: {
				let e = {
					contents: null,
					explicitStart: t.explicitStart,
					explicitEnd: t.explicitEnd,
					directives: t.directives
				};
				n.frames.push({
					kind: "document",
					doc: e
				});
				break;
			}
			case T.SCALAR:
				xi(n, yi(n, t));
				break;
			case T.SEQUENCE: {
				let { tag: e, tagged: r, style: i, anchor: a } = bi(n, t, "tag:yaml.org,2002:seq"), o = {
					kind: "sequence",
					tag: e,
					tagged: r,
					style: i,
					anchor: a,
					items: []
				};
				n.frames.push({
					kind: "sequence",
					node: o
				});
				break;
			}
			case T.MAPPING: {
				let { tag: e, tagged: r, style: i, anchor: a } = bi(n, t, "tag:yaml.org,2002:map"), o = {
					kind: "mapping",
					tag: e,
					tagged: r,
					style: i,
					anchor: a,
					items: []
				};
				n.frames.push({
					kind: "mapping",
					node: o,
					key: null
				});
				break;
			}
			case T.ALIAS:
				xi(n, {
					kind: "alias",
					anchor: n.source.slice(t.anchorStart, t.anchorEnd)
				});
				break;
			case T.POP: {
				let e = n.frames.pop();
				if (e.kind === "mapping" && e.key) throw Error("incomplete mapping pair in event stream");
				e.kind === "document" ? n.documents.push(e.doc) : xi(n, e.node);
				break;
			}
		}
	}
	return n.documents;
}
//#endregion
//#region src/index.ts
var Ci = T.DOCUMENT, wi = T.SEQUENCE, Ti = T.MAPPING, Ei = T.SCALAR, Di = T.ALIAS, Oi = T.POP, ki = E.PLAIN, Ai = E.SINGLE_QUOTED, ji = E.DOUBLE_QUOTED, Mi = E.LITERAL_BLOCK, Ni = E.FOLDED_BLOCK, Pi = D.BLOCK, Fi = D.FLOW, Ii = O.CLIP, Li = O.STRIP, Ri = O.KEEP;
//#endregion
export { Ii as CHOMPING_CLIP, Ri as CHOMPING_KEEP, O as CHOMPING_MODE, Li as CHOMPING_STRIP, D as COLLECTION_STYLE, Pi as COLLECTION_STYLE_BLOCK, Fi as COLLECTION_STYLE_FLOW, $e as CORE_SCHEMA, Wn as DEFAULT_SCALAR_STYLE_RULES, tt as DUMP_SCHEMA, Di as EVENT_ALIAS, Ci as EVENT_DOCUMENT, T as EVENT_ID, Ti as EVENT_MAPPING, Oi as EVENT_POP, Ei as EVENT_SCALAR, wi as EVENT_SEQUENCE, C as FAILSAFE_SCHEMA, Qe as JSON_SCHEMA, e as NOT_RESOLVED, E as SCALAR_STYLE, ji as SCALAR_STYLE_DOUBLE_QUOTED, Ni as SCALAR_STYLE_FOLDED_BLOCK, Mi as SCALAR_STYLE_LITERAL_BLOCK, ki as SCALAR_STYLE_PLAIN, Ai as SCALAR_STYLE_SINGLE_QUOTED, S as Schema, zn as VISIT_BREAK, Bn as VISIT_SKIP, et as YAML11_SCHEMA, w as YAMLException, Pe as binaryTag, f as boolCoreTag, h as boolJsonTag, ne as boolYaml11Tag, Vt as constructFromEvents, r as defineMappingTag, t as defineScalarTag, n as defineSequenceTag, hi as dump, Si as eventsToAst, be as floatCoreTag, Te as floatJsonTag, _ as floatYaml11Tag, Ct as getScalarValue, se as intCoreTag, fe as intJsonTag, g as intYaml11Tag, Rn as jsToAst, it as legacyMapTag, Fn as load, Pn as loadAll, We as mapTag, Ae as mergeTag, o as nullCoreTag, s as nullJsonTag, l as nullYaml11Tag, He as omapTag, Ue as pairsTag, jn as parseEvents, fi as present, nt as realMapTag, Be as seqTag, Ge as setTag, i as strTag, ze as timestampTag, Hn as visit };

//# sourceMappingURL=js-yaml.esm.min.mjs.map