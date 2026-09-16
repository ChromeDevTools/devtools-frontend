// Pratt parser. +/- emit Sum nodes; */÷ emit Product nodes. node.js
// constructors flatten and normalize on construction, while parenthesized
// sums retain a grouping marker for the opaque-subtraction invariant.
import { mkSum, mkProduct, negate, num, dim, ident, call } from './node.js';

/**
 * @typedef {import('./tokenizer.js').Token} Token
 * @typedef {import('./tokenizer.js').TokenType} TokenType
 * @typedef {import('./node.js').Node} Node
 * @typedef {(p: Parser, token: Token) => Node} PrefixParselet
 */

/**
 * §10.9 — case-insensitive except for NaN.
 * @param {string} name
 * @return {Node | null}
 */
function foldCalcKeyword(name) {
  // `NaN` and `-NaN` are spec-defined math constants (§10.7.1). The signed
  // form arrives as a single ident because CSS Syntax tokenizes leading
  // `-` + ident-start as one ident-token.
  if (name === 'NaN' || name === '-NaN') {
    return num(Number.NaN);
  }
  switch (name.toLowerCase()) {
    case 'pi':
      return num(Math.PI);
    case 'e':
      return num(Math.E);
    case 'infinity':
      return num(Infinity);
    case '-infinity':
      return num(-Infinity);
  }
  return null;
}

class Parser {
  /**
   * @param {Token[]} tokens
   */
  constructor(tokens) {
    /** @private */
    this.i = 0;
    /** @private @readonly */
    this.tokens = tokens;
  }

  /** @return {Token} */
  peek() {
    return this.tokens[this.i];
  }

  /** @return {Token} */
  next() {
    return this.tokens[this.i++];
  }

  /**
   * @param {TokenType} type
   * @param {string} [value]
   * @return {Token}
   */
  expect(type, value) {
    const t = this.next();
    if (t.type !== type || (value !== undefined && t.value !== value)) {
      const want = value ?? type;
      throw new Error(
        `Expected ${want} at position ${t.pos}, got "${t.value}"`
      );
    }
    return t;
  }

  /**
   * @param {string} value
   * @param {string} [value2]
   * @return {boolean}
   */
  isPunct(value, value2) {
    const t = this.peek();
    return (
      t.type === 'punct' &&
      (t.value === value || (value2 !== undefined && t.value === value2))
    );
  }

  /**
   * @param {string} value
   * @return {boolean}
   */
  matchPunct(value) {
    if (this.isPunct(value)) {
      this.next();
      return true;
    }
    return false;
  }

  /**
   * @param {string} value
   * @return {Token}
   */
  expectPunct(value) {
    return this.expect('punct', value);
  }

  /**
   * @param {number} [minBp]
   * @return {Node}
   */
  parseExpr(minBp = 0) {
    const t = this.next();
    const key = t.type === 'punct' ? t.value : t.type;
    const prefix = PREFIX[key];
    if (!prefix) {
      throw new Error(`Unexpected token "${t.value}" at position ${t.pos}`);
    }
    let left = prefix(this, t);

    while (true) {
      const nxt = this.peek();
      const infixKey = nxt.type === 'punct' ? nxt.value : nxt.type;
      const rule = INFIX[infixKey];
      if (!rule || rule.lbp < minBp) {
        break;
      }
      if (infixKey === '+' || infixKey === '-') {
        /** @type {import('./node.js').SumTerm[]} */
        const terms = [{ sign: /** @type {1} */ (1), node: left }];
        do {
          const token = this.next();
          requireSurroundingWs(this, token);
          terms.push({
            sign: /** @type {1 | -1} */ (token.value === '+' ? 1 : -1),
            node: this.parseExpr(ADD_BP + 1),
          });
        } while (this.isPunct('+', '-'));
        left = mkSum(terms);
        continue;
      }

      if (infixKey === '*' || infixKey === '/') {
        /** @type {import('./node.js').ProductFactor[]} */
        const factors = [{ exponent: /** @type {1} */ (1), node: left }];
        do {
          const token = this.next();
          factors.push({
            exponent: /** @type {1 | -1} */ (token.value === '*' ? 1 : -1),
            node: this.parseExpr(MUL_BP + 1),
          });
        } while (this.isPunct('*', '/'));
        left = mkProduct(factors);
        continue;
      }

      // Every infix operator is handled above. Keep this defensive exit in
      // case a future parselet is added without a chain implementation.
      break;
    }

    return left;
  }
}

const ADD_BP = 1;
const MUL_BP = 3;
const UNARY_BP = 7;

/**
 * Functions whose argument list isn't a comma-separated list of calc
 * expressions. Their bodies are slurped as opaque space-separated tokens
 * and round-tripped verbatim. anchor() / anchor-size() use the
 * `<anchor-name> <anchor-side>` shape (CSS Anchor Positioning).
 */
const OPAQUE_ARG_FUNCTIONS = new Set(['anchor', 'anchor-size']);

/**
 * Reconstruct a token's source text for opaque-arg slurping.
 * @param {Token} t
 * @return {string}
 */
function tokenText(t) {
  if (t.type === 'dimension') {
    return `${t.value}${t.unit ?? ''}`;
  }
  return t.value;
}

/**
 * Parse the body of an opaque-arg call, with `(` already consumed.
 * @param {Parser} p
 * @param {string} name
 * @return {Node}
 */
function parseOpaqueCall(p, name) {
  /** @type {Node[]} */
  const args = [];
  let buf = '';
  let depth = 1;
  const flush = () => {
    const trimmed = buf.trim();
    if (trimmed) {
      args.push(ident(trimmed));
    }
    buf = '';
  };
  while (true) {
    const tk = p.peek();
    if (tk.type === 'eof') {
      throw new Error(`Unclosed ${name}( at position ${tk.pos}`);
    }
    if (tk.type === 'punct') {
      if (tk.value === '(') {
        depth++;
      } else if (tk.value === ')') {
        depth--;
        if (depth === 0) {
          p.next();
          flush();
          return call(name, args);
        }
      } else if (tk.value === ',' && depth === 1) {
        p.next();
        flush();
        continue;
      }
    }
    if (tk.ws && buf) {
      buf += ' ';
    }
    buf += tokenText(tk);
    p.next();
  }
}

/**
 * §10.1 requires whitespace on both sides of a binary `+` / `-`. Without
 * it, CSS tokenization treats `1px+2px` as two tokens with no operator
 * between them (browsers reject this). We enforce the rule here by
 * checking the token's `ws` flag (whitespace before the `+`/`-`) and the
 * following token's flag (whitespace after).
 * @param {Parser} p
 * @param {Token} token
 * @return {void}
 */
function requireSurroundingWs(p, token) {
  const next = p.peek();
  if (!token.ws || !next.ws) {
    throw new Error(
      `"${token.value}" must be surrounded by whitespace at position ${token.pos}`
    );
  }
}

/** @type {Record<string, PrefixParselet>} */
const PREFIX = {
  number: (_p, t) => num(Number.parseFloat(t.value)),

  // Unit case normalization per §10.12: `1PX` serializes as `1px`.
  dimension: (_p, t) =>
    dim(
      Number.parseFloat(t.value),
      t.unit === '%' ? '%' : /** @type {string} */ (t.unit).toLowerCase()
    ),

  ident: (p, t) => {
    if (p.matchPunct('(')) {
      if (OPAQUE_ARG_FUNCTIONS.has(t.value.toLowerCase())) {
        return parseOpaqueCall(p, t.value);
      }
      /** @type {Node[]} */
      const args = [];
      if (!p.isPunct(')')) {
        args.push(p.parseExpr(0));
        while (p.matchPunct(',')) {
          args.push(p.parseExpr(0));
        }
      }
      p.expectPunct(')');
      return call(t.value, args);
    }
    const kw = foldCalcKeyword(t.value);
    if (kw) {
      return kw;
    }
    return ident(t.value);
  },

  '(': (p) => {
    const e = p.parseExpr(0);
    p.expectPunct(')');
    return e.type === 'Sum' ? { ...e, grouped: true } : e;
  },

  '-': (p) => negate(p.parseExpr(UNARY_BP)),
  '+': (p) => p.parseExpr(UNARY_BP),
};

/** @type {Record<string, {lbp: number}>} */
const INFIX = {
  '+': { lbp: ADD_BP },
  '-': { lbp: ADD_BP },
  '*': { lbp: MUL_BP },
  '/': { lbp: MUL_BP },
};

/**
 * @param {Token[]} tokens
 * @return {Node}
 */
function parse(tokens) {
  const p = new Parser(tokens);
  const ast = p.parseExpr(0);
  const trailing = p.peek();
  if (trailing.type !== 'eof') {
    throw new Error(
      `Unexpected token "${trailing.value}" at position ${trailing.pos}`
    );
  }
  return ast;
}

export { parse };
