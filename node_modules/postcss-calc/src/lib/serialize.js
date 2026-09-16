// Spec: https://www.w3.org/TR/css-values-4/#serialize-a-calculation-tree
// Outer calc() is added when the top-level result contains an arithmetic
// operator, or when a finite scalar is negative.

import { num, dim } from './node.js';

/**
 * @typedef {import('./node.js').Node} Node
 * @typedef {import('./node.js').Sum} Sum
 * @typedef {import('./node.js').Product} Product
 * @typedef {import('./node.js').ProductFactor} ProductFactor
 * @typedef {object} SerializeOptions
 * @property {number | false} [precision] Decimal places for numbers. `false` disables rounding. Default 5.
 * @property {string} [calcName] Wrapper name to use when `calc()` is needed. Default `'calc'`.
 * @property {boolean} [unwrapSingleNegativeNumber] Serialize finite negative scalars without a wrapper. Internal selector-only mode.
 */

// Below this is float noise, not a value: `0.1 + 0.2 - 0.3` is 5.5e-17.
const NOISE_FLOOR = 1e-12;

/**
 * Rounding to `prec` decimal places turns `calc(1/1000000)` into `0`, and a
 * `0` in CSS is often a switch, not a small number (`flex-grow: 0` never
 * grows). So when a value is too small for `prec`, keep its significant digits
 * instead: `1/1000000` -> `0.000001`, `1/3000000` -> `3.3333e-7`.
 *
 * @param {number} v
 * @param {number | false} prec
 * @return {number}
 */
function round(v, prec) {
  if (prec === false) {
    return v;
  }
  const m = Math.pow(10, prec);
  const rounded = Math.round(v * m) / m;
  if (rounded === 0 && Math.abs(v) > NOISE_FLOOR) {
    // toPrecision needs at least one significant digit; `prec` may be 0.
    return Number(v.toPrecision(Math.max(prec, 1)));
  }
  return rounded;
}

// §10.13 / §10.7.2: Infinity/NaN serialize as canonical keywords.
/**
 * @param {number} v
 * @return {boolean}
 */
function isDegenerate(v) {
  return !Number.isFinite(v) || Number.isNaN(v);
}

/**
 * @param {number} v
 * @return {string}
 */
function degenerateKeyword(v) {
  if (Number.isNaN(v)) {
    return 'NaN';
  }
  return v > 0 ? 'infinity' : '-infinity';
}

/**
 * Serialize a finite CSS number. CSS numbers may omit the zero before a
 * fractional value between -1 and 1 (`.5`, `-.5`). Scientific notation is
 * left untouched because it already has no leading zero to remove.
 *
 * @param {number} v
 * @return {string}
 */
function serializeNumber(v) {
  const text = String(v);
  if (text.startsWith('0.')) {
    return text.slice(1);
  }
  if (text.startsWith('-0.')) {
    return `-${text.slice(2)}`;
  }
  return text;
}

/**
 * Round and serialize a finite scalar once so callers can use the same value
 * to decide its syntactic context and render its text.
 *
 * @param {import('./node.js').Num | import('./node.js').Dim} node
 * @param {number | false} prec
 * @return {{value: number, text: string}}
 */
function serializeScalar(node, prec) {
  const value = round(node.value, prec);
  const text = `${serializeNumber(value)}${node.type === 'Dim' ? node.unit : ''}`;
  return { value, text };
}

/**
 * @param {Node} node
 * @param {SerializeOptions} [opts]
 * @return {string}
 */
function serialize(node, opts = {}) {
  const prec = opts.precision ?? 5;
  const calcName = opts.calcName ?? 'calc';

  // §10.13: top-level Infinity/NaN wrap in calc(); dim degenerates carry
  // the unit as `<keyword> * 1<unit>` so the result keeps its type.
  if (node.type === 'Num' && isDegenerate(node.value)) {
    return `${calcName}(${degenerateKeyword(node.value)})`;
  }
  if (node.type === 'Dim' && isDegenerate(node.value)) {
    return `${calcName}(${degenerateKeyword(node.value)} * 1${node.unit})`;
  }

  if (node.type === 'Num' || node.type === 'Dim') {
    const scalar = serializeScalar(node, prec);

    // A finite negative scalar must stay inside calc() so CSS parses it as a
    // calculation result (and can apply range clamping) rather than as an
    // invalid bare value. Base this on the serialized value so tiny negative
    // floating-point noise that rounds to zero does not get wrapped.
    if (scalar.value < 0) {
      return opts.unwrapSingleNegativeNumber
        ? scalar.text
        : `${calcName}(${scalar.text})`;
    }

    return scalar.text;
  }

  // A grouped sum with a leading negative term is the canonical result of
  // negating a parenthesized expression. Re-invert its terms for the body so
  // the grouping survives as `-(...)` instead of becoming `-a - b`.
  if (
    node.type === 'Sum' &&
    node.grouped &&
    node.terms.length > 1 &&
    displaySign(node.terms[0]).sign === -1
  ) {
    const invertedTerms = node.terms.map((t) => ({
      sign: /** @type {1 | -1} */ (-t.sign),
      node: t.node,
    }));
    return `${calcName}(-(${serializeSumTerms(invertedTerms, prec)}))`;
  }

  if (node.type === 'Ident' || node.type === 'Call') {
    return serializeExpr(node, prec);
  }

  // Single-term Sum is the canonical form for `-var(--x)` / `-(a*b)` —
  // sign=-1 around an opaque node. Signed leaves live in Num/Dim directly.
  if (node.type === 'Sum' && node.terms.length === 1) {
    return `${calcName}(${serializeLeadingNeg(node.terms[0].node, prec)})`;
  }

  return `${calcName}(${serializeExpr(node, prec)})`;
}

// --- Inside calc() expression --------------------------------------------

/**
 * @param {Node} node
 * @param {number | false} prec
 * @return {string}
 */
function serializeExpr(node, prec) {
  switch (node.type) {
    case 'Num':
      if (isDegenerate(node.value)) {
        return degenerateKeyword(node.value);
      }
      return serializeScalar(node, prec).text;
    case 'Dim':
      if (isDegenerate(node.value)) {
        // Nested degenerate Dim wraps in calc() so the `<kw> * 1<unit>` form
        // parses back as one Dim factor. The bare form round-trips wrong
        // inside a Product — `0 * Dim(Infinity, px)` would re-fold as NaN.
        return `calc(${degenerateKeyword(node.value)} * 1${node.unit})`;
      }
      return serializeScalar(node, prec).text;
    case 'Ident':
      return node.name;
    case 'Call': {
      const args = node.args.map((a) => serializeExpr(a, prec)).join(', ');
      return `${node.name}(${args})`;
    }
    case 'Sum':
      return serializeSum(node, prec);
    case 'Product':
      return serializeProduct(node, prec);
  }
}

/**
 * Combine the term's sign with a negative Num/Dim value's sign so
 * `{sign:+1, Num(-5)}` renders as `-5`, not `+ -5`. Skip degenerate
 * (Infinity/NaN) values — the `degenerateKeyword` path emits `-infinity`
 * inline, and a leading minus on `calc(infinity*1<unit>)` would now
 * tokenize as a `-calc` function.
 * @param {{sign: 1 | -1, node: Node}} term
 * @return {{sign: 1 | -1, magnitude: Node}}
 */
function displaySign(term) {
  const { sign, node } = term;
  if (node.type === 'Num' && Number.isFinite(node.value) && node.value < 0) {
    return {
      sign: /** @type {1 | -1} */ (-sign),
      magnitude: num(-node.value),
    };
  }
  if (node.type === 'Dim' && Number.isFinite(node.value) && node.value < 0) {
    return {
      sign: /** @type {1 | -1} */ (-sign),
      magnitude: dim(-node.value, node.unit),
    };
  }
  return { sign, magnitude: node };
}

/**
 * @param {import('./node.js').SumTerm[]} terms
 * @param {number | false} prec
 * @return {string}
 */
function serializeSumTerms(terms, prec) {
  let out = '';
  for (let i = 0; i < terms.length; i++) {
    const { sign, magnitude } = displaySign(terms[i]);
    if (i === 0) {
      if (magnitude.type === 'Sum' && magnitude.grouped) {
        const body = `(${serializeExpr(magnitude, prec)})`;
        out = sign === 1 ? body : `-${body}`;
        continue;
      }
      out =
        sign === 1
          ? serializeExpr(magnitude, prec)
          : serializeLeadingNeg(magnitude, prec);
    } else {
      // `-` binds looser than `*`/`/` so the right side never needs parens.
      let body = serializeExpr(magnitude, prec);
      if (magnitude.type === 'Sum' && magnitude.grouped) {
        body = `(${body})`;
      }
      out += sign === 1 ? ` + ${body}` : ` - ${body}`;
    }
  }
  return out;
}

/**
 * @param {Sum} sum
 * @param {number | false} prec
 * @return {string}
 */
function serializeSum(sum, prec) {
  return serializeSumTerms(sum.terms, prec);
}

/**
 * Fold a leading negation into a finite leading Num if there is one
 * (`-(0.5 * x)` → `-0.5 * x`); else use `-(…)` for Sum/Product or `-x`.
 * @param {Node} node
 * @param {number | false} prec
 * @return {string}
 */
function serializeLeadingNeg(node, prec) {
  if (
    node.type === 'Product' &&
    node.factors.length > 0 &&
    node.factors[0].exponent === 1 &&
    node.factors[0].node.type === 'Num' &&
    Number.isFinite(node.factors[0].node.value) &&
    node.factors[0].node.value !== 0
  ) {
    const head = node.factors[0].node;
    const negatedValue = -head.value;
    const rest = node.factors.slice(1);
    // A coefficient of 1 is a no-op factor, matching mkProduct.
    /** @type {ProductFactor[]} */
    const negatedFactors =
      negatedValue === 1
        ? rest
        : [{ exponent: 1, node: num(negatedValue) }, ...rest];
    return serializeFactors(negatedFactors, prec);
  }
  const body = serializeExpr(node, prec);
  return node.type === 'Sum' || node.type === 'Product'
    ? `-(${body})`
    : `-${body}`;
}

/**
 * @param {ProductFactor[]} factors
 * @param {number | false} prec
 * @return {string}
 */
function serializeFactors(factors, prec) {
  let out = '';
  for (let i = 0; i < factors.length; i++) {
    const f = factors[i];
    let body = serializeExpr(f.node, prec);
    // A Sum factor needs parens: `a * (b + c)`. Flat canonical form means
    // this is the only place parens are required.
    if (f.node.type === 'Sum') {
      body = `(${body})`;
    }
    if (i === 0) {
      // Leading denominator: implicit 1 so we emit `1 / 2px`, not `/ 2px`.
      out = f.exponent === 1 ? body : `1 / ${body}`;
    } else {
      out += f.exponent === 1 ? ` * ${body}` : ` / ${body}`;
    }
  }
  return out;
}

/**
 * @param {Product} product
 * @param {number | false} prec
 * @return {string}
 */
function serializeProduct(product, prec) {
  return serializeFactors(product.factors, prec);
}

export { serialize };
