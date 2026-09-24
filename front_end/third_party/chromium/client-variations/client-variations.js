// ../../front_end/third_party/chromium/client-variations/ClientVariations.js
function t() {
  let t2 = 0, i2 = 0;
  for (let r3 = 0; r3 < 28; r3 += 7) {
    let n2 = this.buf[this.pos++];
    if (t2 |= (127 & n2) << r3, !(128 & n2)) return this.assertBounds(), [t2, i2];
  }
  let r2 = this.buf[this.pos++];
  if (t2 |= (15 & r2) << 28, i2 = (112 & r2) >> 4, !(128 & r2)) return this.assertBounds(), [t2, i2];
  for (let r3 = 3; r3 <= 31; r3 += 7) {
    let n2 = this.buf[this.pos++];
    if (i2 |= (127 & n2) << r3, !(128 & n2)) return this.assertBounds(), [t2, i2];
  }
  throw new Error("invalid varint");
}
function i(t2, i2, r2) {
  for (let n3 = 0; n3 < 28; n3 += 7) {
    const e3 = t2 >>> n3, s2 = !(e3 >>> 7 == 0 && 0 == i2), o2 = 255 & (s2 ? 128 | e3 : e3);
    if (r2.push(o2), !s2) return;
  }
  const n2 = t2 >>> 28 & 15 | (7 & i2) << 4, e2 = !!(i2 >> 3);
  if (r2.push(255 & (e2 ? 128 | n2 : n2)), e2) {
    for (let t3 = 3; t3 < 31; t3 += 7) {
      const n3 = i2 >>> t3, e3 = !(n3 >>> 7 == 0), s2 = 255 & (e3 ? 128 | n3 : n3);
      if (r2.push(s2), !e3) return;
    }
    r2.push(i2 >>> 31 & 1);
  }
}
var r = 4294967296;
function n(t2) {
  const i2 = "-" === t2[0];
  i2 && (t2 = t2.slice(1));
  const n2 = 1e6;
  let e2 = 0, a2 = 0;
  function u2(i3, s2) {
    const o2 = Number(t2.slice(i3, s2));
    a2 *= n2, e2 = e2 * n2 + o2, e2 >= r && (a2 += e2 / r | 0, e2 %= r);
  }
  return u2(-24, -18), u2(-18, -12), u2(-12, -6), u2(-6), i2 ? o(e2, a2) : s(e2, a2);
}
function e(t2, i2) {
  if ({ lo: t2, hi: i2 } = (function(t3, i3) {
    return { lo: t3 >>> 0, hi: i3 >>> 0 };
  })(t2, i2), i2 <= 2097151) return String(r * i2 + t2);
  const n2 = 16777215 & (t2 >>> 24 | i2 << 8), e2 = i2 >> 16 & 65535;
  let s2 = (16777215 & t2) + 6777216 * n2 + 6710656 * e2, o2 = n2 + 8147497 * e2, u2 = 2 * e2;
  const h2 = 1e7;
  return s2 >= h2 && (o2 += Math.floor(s2 / h2), s2 %= h2), o2 >= h2 && (u2 += Math.floor(o2 / h2), o2 %= h2), u2.toString() + a(o2) + a(s2);
}
function s(t2, i2) {
  return { lo: 0 | t2, hi: 0 | i2 };
}
function o(t2, i2) {
  return i2 = ~i2, t2 ? t2 = 1 + ~t2 : i2 += 1, s(t2, i2);
}
var a = (t2) => {
  const i2 = String(t2);
  return "0000000".slice(i2.length) + i2;
};
function u(t2, i2) {
  if (t2 >= 0) {
    for (; t2 > 127; ) i2.push(127 & t2 | 128), t2 >>>= 7;
    i2.push(t2);
  } else {
    for (let r2 = 0; r2 < 9; r2++) i2.push(127 & t2 | 128), t2 >>= 7;
    i2.push(1);
  }
}
function h() {
  let t2 = this.buf[this.pos++], i2 = 127 & t2;
  if (!(128 & t2)) return this.assertBounds(), i2;
  if (t2 = this.buf[this.pos++], i2 |= (127 & t2) << 7, !(128 & t2)) return this.assertBounds(), i2;
  if (t2 = this.buf[this.pos++], i2 |= (127 & t2) << 14, !(128 & t2)) return this.assertBounds(), i2;
  if (t2 = this.buf[this.pos++], i2 |= (127 & t2) << 21, !(128 & t2)) return this.assertBounds(), i2;
  t2 = this.buf[this.pos++], i2 |= (15 & t2) << 28;
  for (let i3 = 5; 128 & t2 && i3 < 10; i3++) t2 = this.buf[this.pos++];
  if (128 & t2) throw new Error("invalid varint");
  return this.assertBounds(), i2 >>> 0;
}
var f = c();
function c() {
  const t2 = new DataView(new ArrayBuffer(8));
  if ("function" == typeof BigInt && "function" == typeof t2.getBigInt64 && "function" == typeof t2.getBigUint64 && "function" == typeof t2.setBigInt64 && "function" == typeof t2.setBigUint64 && ("object" != typeof process || "object" != typeof process.env || "1" !== process.env.BUF_BIGINT_DISABLE)) {
    const i2 = BigInt("-9223372036854775808"), r2 = BigInt("9223372036854775807"), n2 = BigInt("0"), e2 = BigInt("18446744073709551615");
    return { zero: BigInt(0), supported: true, parse(t3) {
      const n3 = "bigint" == typeof t3 ? t3 : BigInt(t3);
      if (n3 > r2 || n3 < i2) throw new Error(`invalid int64: ${t3}`);
      return n3;
    }, uParse(t3) {
      const i3 = "bigint" == typeof t3 ? t3 : BigInt(t3);
      if (i3 > e2 || i3 < n2) throw new Error(`invalid uint64: ${t3}`);
      return i3;
    }, enc(i3) {
      return t2.setBigInt64(0, this.parse(i3), true), { lo: t2.getInt32(0, true), hi: t2.getInt32(4, true) };
    }, uEnc(i3) {
      return t2.setBigInt64(0, this.uParse(i3), true), { lo: t2.getInt32(0, true), hi: t2.getInt32(4, true) };
    }, dec: (i3, r3) => (t2.setInt32(0, i3, true), t2.setInt32(4, r3, true), t2.getBigInt64(0, true)), uDec: (i3, r3) => (t2.setInt32(0, i3, true), t2.setInt32(4, r3, true), t2.getBigUint64(0, true)) };
  }
  return {
    zero: "0",
    supported: false,
    parse: (t3) => ("string" != typeof t3 && (t3 = t3.toString()), l(t3), t3),
    uParse: (t3) => ("string" != typeof t3 && (t3 = t3.toString()), d(t3), t3),
    enc: (t3) => ("string" != typeof t3 && (t3 = t3.toString()), l(t3), n(t3)),
    uEnc: (t3) => ("string" != typeof t3 && (t3 = t3.toString()), d(t3), n(t3)),
    dec: (t3, i2) => (function(t4, i3) {
      let r2 = s(t4, i3);
      const n2 = 2147483648 & r2.hi;
      n2 && (r2 = o(r2.lo, r2.hi));
      const a2 = e(r2.lo, r2.hi);
      return n2 ? "-" + a2 : a2;
    })(t3, i2),
    uDec: (t3, i2) => e(t3, i2)
  };
}
function l(t2) {
  if (!/^-?[0-9]+$/.test(t2)) throw new Error("invalid int64: " + t2);
}
function d(t2) {
  if (!/^[0-9]+$/.test(t2)) throw new Error("invalid uint64: " + t2);
}
var g = /* @__PURE__ */ Symbol.for("@bufbuild/protobuf/text-encoding");
function p() {
  if (null == globalThis[g]) {
    const t2 = new globalThis.TextEncoder(), i2 = new globalThis.TextDecoder();
    globalThis[g] = {
      encodeUtf8: (i3) => t2.encode(i3),
      decodeUtf8: (t3) => i2.decode(t3),
      checkUtf8(t3) {
        try {
          return encodeURIComponent(t3), true;
        } catch (t4) {
          return false;
        }
      }
    };
  }
  return globalThis[g];
}
var I;
!(function(t2) {
  t2[t2.Varint = 0] = "Varint", t2[t2.Bit64 = 1] = "Bit64", t2[t2.LengthDelimited = 2] = "LengthDelimited", t2[t2.StartGroup = 3] = "StartGroup", t2[t2.EndGroup = 4] = "EndGroup", t2[t2.Bit32 = 5] = "Bit32";
})(I || (I = {}));
var b = 34028234663852886e22;
var w = -34028234663852886e22;
var v = class {
  constructor(t2 = p().encodeUtf8) {
    this.encodeUtf8 = t2, this.stack = [], this.chunks = [], this.buf = [];
  }
  finish() {
    this.buf.length && (this.chunks.push(new Uint8Array(this.buf)), this.buf = []);
    let t2 = 0;
    for (let i3 = 0; i3 < this.chunks.length; i3++) t2 += this.chunks[i3].length;
    let i2 = new Uint8Array(t2), r2 = 0;
    for (let t3 = 0; t3 < this.chunks.length; t3++) i2.set(this.chunks[t3], r2), r2 += this.chunks[t3].length;
    return this.chunks = [], i2;
  }
  fork() {
    return this.stack.push({ chunks: this.chunks, buf: this.buf }), this.chunks = [], this.buf = [], this;
  }
  join() {
    let t2 = this.finish(), i2 = this.stack.pop();
    if (!i2) throw new Error("invalid state, fork stack empty");
    return this.chunks = i2.chunks, this.buf = i2.buf, this.uint32(t2.byteLength), this.raw(t2);
  }
  tag(t2, i2) {
    return this.uint32((t2 << 3 | i2) >>> 0);
  }
  raw(t2) {
    return this.buf.length && (this.chunks.push(new Uint8Array(this.buf)), this.buf = []), this.chunks.push(t2), this;
  }
  uint32(t2) {
    for (E(t2); t2 > 127; ) this.buf.push(127 & t2 | 128), t2 >>>= 7;
    return this.buf.push(t2), this;
  }
  int32(t2) {
    return B(t2), u(t2, this.buf), this;
  }
  bool(t2) {
    return this.buf.push(t2 ? 1 : 0), this;
  }
  bytes(t2) {
    return this.uint32(t2.byteLength), this.raw(t2);
  }
  string(t2) {
    let i2 = this.encodeUtf8(t2);
    return this.uint32(i2.byteLength), this.raw(i2);
  }
  float(t2) {
    !(function(t3) {
      if ("string" == typeof t3) {
        const i3 = t3;
        if (t3 = Number(t3), isNaN(t3) && "NaN" !== i3) throw new Error("invalid float32: " + i3);
      } else if ("number" != typeof t3) throw new Error("invalid float32: " + typeof t3);
      if (Number.isFinite(t3) && (t3 > b || t3 < w)) throw new Error("invalid float32: " + t3);
    })(t2);
    let i2 = new Uint8Array(4);
    return new DataView(i2.buffer).setFloat32(0, t2, true), this.raw(i2);
  }
  double(t2) {
    let i2 = new Uint8Array(8);
    return new DataView(i2.buffer).setFloat64(0, t2, true), this.raw(i2);
  }
  fixed32(t2) {
    E(t2);
    let i2 = new Uint8Array(4);
    return new DataView(i2.buffer).setUint32(0, t2, true), this.raw(i2);
  }
  sfixed32(t2) {
    B(t2);
    let i2 = new Uint8Array(4);
    return new DataView(i2.buffer).setInt32(0, t2, true), this.raw(i2);
  }
  sint32(t2) {
    return B(t2), u(t2 = (t2 << 1 ^ t2 >> 31) >>> 0, this.buf), this;
  }
  sfixed64(t2) {
    let i2 = new Uint8Array(8), r2 = new DataView(i2.buffer), n2 = f.enc(t2);
    return r2.setInt32(0, n2.lo, true), r2.setInt32(4, n2.hi, true), this.raw(i2);
  }
  fixed64(t2) {
    let i2 = new Uint8Array(8), r2 = new DataView(i2.buffer), n2 = f.uEnc(t2);
    return r2.setInt32(0, n2.lo, true), r2.setInt32(4, n2.hi, true), this.raw(i2);
  }
  int64(t2) {
    let r2 = f.enc(t2);
    return i(r2.lo, r2.hi, this.buf), this;
  }
  sint64(t2) {
    let r2 = f.enc(t2), n2 = r2.hi >> 31;
    return i(r2.lo << 1 ^ n2, (r2.hi << 1 | r2.lo >>> 31) ^ n2, this.buf), this;
  }
  uint64(t2) {
    let r2 = f.uEnc(t2);
    return i(r2.lo, r2.hi, this.buf), this;
  }
};
var y = class {
  constructor(i2, r2 = p().decodeUtf8) {
    this.decodeUtf8 = r2, this.varint64 = t, this.uint32 = h, this.buf = i2, this.len = i2.length, this.pos = 0, this.view = new DataView(i2.buffer, i2.byteOffset, i2.byteLength);
  }
  tag() {
    let t2 = this.uint32(), i2 = t2 >>> 3, r2 = 7 & t2;
    if (i2 <= 0 || r2 < 0 || r2 > 5) throw new Error("illegal tag: field no " + i2 + " wire type " + r2);
    return [i2, r2];
  }
  skip(t2, i2) {
    let r2 = this.pos;
    switch (t2) {
      case I.Varint:
        for (; 128 & this.buf[this.pos++]; ) ;
        break;
      case I.Bit64:
        this.pos += 4;
      case I.Bit32:
        this.pos += 4;
        break;
      case I.LengthDelimited:
        let r3 = this.uint32();
        this.pos += r3;
        break;
      case I.StartGroup:
        for (; ; ) {
          const [t3, r4] = this.tag();
          if (r4 === I.EndGroup) {
            if (void 0 !== i2 && t3 !== i2) throw new Error("invalid end group tag");
            break;
          }
          this.skip(r4, t3);
        }
        break;
      default:
        throw new Error("cant skip wire type " + t2);
    }
    return this.assertBounds(), this.buf.subarray(r2, this.pos);
  }
  assertBounds() {
    if (this.pos > this.len) throw new RangeError("premature EOF");
  }
  int32() {
    return 0 | this.uint32();
  }
  sint32() {
    let t2 = this.uint32();
    return t2 >>> 1 ^ -(1 & t2);
  }
  int64() {
    return f.dec(...this.varint64());
  }
  uint64() {
    return f.uDec(...this.varint64());
  }
  sint64() {
    let [t2, i2] = this.varint64(), r2 = -(1 & t2);
    return t2 = (t2 >>> 1 | (1 & i2) << 31) ^ r2, i2 = i2 >>> 1 ^ r2, f.dec(t2, i2);
  }
  bool() {
    let [t2, i2] = this.varint64();
    return 0 !== t2 || 0 !== i2;
  }
  fixed32() {
    return this.view.getUint32((this.pos += 4) - 4, true);
  }
  sfixed32() {
    return this.view.getInt32((this.pos += 4) - 4, true);
  }
  fixed64() {
    return f.uDec(this.sfixed32(), this.sfixed32());
  }
  sfixed64() {
    return f.dec(this.sfixed32(), this.sfixed32());
  }
  float() {
    return this.view.getFloat32((this.pos += 4) - 4, true);
  }
  double() {
    return this.view.getFloat64((this.pos += 8) - 8, true);
  }
  bytes() {
    let t2 = this.uint32(), i2 = this.pos;
    return this.pos += t2, this.assertBounds(), this.buf.subarray(i2, i2 + t2);
  }
  string() {
    return this.decodeUtf8(this.bytes());
  }
};
function B(t2) {
  if ("string" == typeof t2) t2 = Number(t2);
  else if ("number" != typeof t2) throw new Error("invalid int32: " + typeof t2);
  if (!Number.isInteger(t2) || t2 > 2147483647 || t2 < -2147483648) throw new Error("invalid int32: " + t2);
}
function E(t2) {
  if ("string" == typeof t2) t2 = Number(t2);
  else if ("number" != typeof t2) throw new Error("invalid uint32: " + typeof t2);
  if (!Number.isInteger(t2) || t2 > 4294967295 || t2 < 0) throw new Error("invalid uint32: " + t2);
}
var k;
!(function(t2) {
  t2[t2.DOUBLE = 1] = "DOUBLE", t2[t2.FLOAT = 2] = "FLOAT", t2[t2.INT64 = 3] = "INT64", t2[t2.UINT64 = 4] = "UINT64", t2[t2.INT32 = 5] = "INT32", t2[t2.FIXED64 = 6] = "FIXED64", t2[t2.FIXED32 = 7] = "FIXED32", t2[t2.BOOL = 8] = "BOOL", t2[t2.STRING = 9] = "STRING", t2[t2.BYTES = 12] = "BYTES", t2[t2.UINT32 = 13] = "UINT32", t2[t2.SFIXED32 = 15] = "SFIXED32", t2[t2.SFIXED64 = 16] = "SFIXED64", t2[t2.SINT32 = 17] = "SINT32", t2[t2.SINT64 = 18] = "SINT64";
})(k || (k = {}));
var V = { encode(t2, i2 = new v()) {
  if (void 0 !== t2.variationId && 0 !== t2.variationId.length) for (const r2 of t2.variationId) i2.uint32(8).int32(r2);
  if (void 0 !== t2.triggerVariationId && 0 !== t2.triggerVariationId.length) for (const r2 of t2.triggerVariationId) i2.uint32(24).int32(r2);
  return i2;
}, decode(t2, i2) {
  const r2 = t2 instanceof y ? t2 : new y(t2), n2 = void 0 === i2 ? r2.len : r2.pos + i2, e2 = { variationId: [], triggerVariationId: [] };
  for (; r2.pos < n2; ) {
    const t3 = r2.uint32();
    switch (t3 >>> 3) {
      case 1:
        if (8 === t3) {
          e2.variationId.push(r2.int32());
          continue;
        }
        if (10 === t3) {
          const t4 = r2.uint32() + r2.pos;
          for (; r2.pos < t4; ) e2.variationId.push(r2.int32());
          continue;
        }
        break;
      case 3:
        if (24 === t3) {
          e2.triggerVariationId.push(r2.int32());
          continue;
        }
        if (26 === t3) {
          const t4 = r2.uint32() + r2.pos;
          for (; r2.pos < t4; ) e2.triggerVariationId.push(r2.int32());
          continue;
        }
    }
    if (4 == (7 & t3) || 0 === t3) break;
    r2.skip(7 & t3);
  }
  return e2;
}, fromJSON: (t2) => ({ variationId: globalThis.Array.isArray(t2?.variationId) ? t2.variationId.map(((t3) => globalThis.Number(t3))) : [], triggerVariationId: globalThis.Array.isArray(t2?.triggerVariationId) ? t2.triggerVariationId.map(((t3) => globalThis.Number(t3))) : [] }), toJSON(t2) {
  const i2 = {};
  return t2.variationId?.length && (i2.variationId = t2.variationId.map(((t3) => Math.round(t3)))), t2.triggerVariationId?.length && (i2.triggerVariationId = t2.triggerVariationId.map(((t3) => Math.round(t3)))), i2;
}, create: (t2) => V.fromPartial(t2 ?? {}), fromPartial(t2) {
  const i2 = { variationId: [], triggerVariationId: [] };
  return i2.variationId = t2.variationId?.map(((t3) => t3)) || [], i2.triggerVariationId = t2.triggerVariationId?.map(((t3) => t3)) || [], i2;
} };
function T(t2) {
  if ("" === t2) return { variationIds: [], triggerVariationIds: [] };
  let i2 = "";
  try {
    i2 = atob(t2);
  } catch (t3) {
    return { variationIds: [], triggerVariationIds: [] };
  }
  const r2 = new Uint8Array(i2.length);
  for (let t3 = 0; t3 < i2.length; t3++) r2[t3] = i2.charCodeAt(t3);
  let n2;
  try {
    n2 = V.decode(r2);
  } catch (t3) {
    return { variationIds: [], triggerVariationIds: [] };
  }
  return { variationIds: n2.variationId ?? [], triggerVariationIds: n2.triggerVariationId ?? [] };
}
function U(t2, i2 = "Active Google-visible variation IDs on this client. These are reported for analysis, but do not directly affect any server-side behavior.", r2 = "Active Google-visible variation IDs on this client that trigger server-side behavior. These are reported for analysis *and* directly affect server-side behavior.") {
  const n2 = t2.variationIds, e2 = t2.triggerVariationIds, s2 = ["message ClientVariations {"];
  if (n2 && n2.length) {
    const t3 = n2.join(", ");
    s2.push(`  // ${i2}`, `  repeated int32 variation_id = [${t3}];`);
  }
  if (e2 && e2.length) {
    const t3 = e2.join(", ");
    s2.push(`  // ${r2}`, `  repeated int32 trigger_variation_id = [${t3}];`);
  }
  return s2.push("}"), s2.join("\n");
}
export {
  U as formatClientVariations,
  T as parseClientVariations
};
//# sourceMappingURL=client-variations.js.map
