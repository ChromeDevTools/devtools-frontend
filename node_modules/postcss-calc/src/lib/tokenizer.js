// Folds @csstools/css-tokenizer output into the calc() token subset.

import {
  tokenize as tokenizeCss,
  TokenType as CssType,
} from '@csstools/css-tokenizer';
/**
 * @typedef {'number' | 'dimension' | 'ident' | 'punct' | 'eof'} TokenType
 * @typedef {object} Token
 * @property {TokenType} type
 * @property {string} value
 * @property {string} [unit] Present on `dimension` tokens; `%` for percentages.
 * @property {number} pos
 * @property {boolean} ws Whitespace immediately before — drives the §10.1 `+`/`-` rule.
 */

const PUNCT_DELIMS = new Set(['+', '-', '*', '/']);

const NUMERIC_RAW = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?/;

/**
 * @param {string} input
 * @return {Token[]}
 */
function tokenize(input) {
  return tokenizeTokens(tokenizeCss({ css: input }), input.length);
}

/**
 * CSS absorbs leading signs (`-5px` is one token); the parser expects
 * punct sign + unsigned numeric, so split them back out.
 * @param {Token[]} tokens
 * @param {string} raw
 * @param {string | undefined} unit
 * @param {number} pos
 * @param {boolean} ws
 * @return {void}
 */
function pushNumeric(tokens, raw, unit, pos, ws) {
  let value = /** @type {RegExpExecArray} */ (NUMERIC_RAW.exec(raw))[0];
  const sign = value[0];
  if (sign === '+' || sign === '-') {
    tokens.push({ type: 'punct', value: sign, pos, ws });
    value = value.slice(1);
    pos += 1;
    ws = false;
  }
  if (unit === undefined) {
    tokens.push({ type: 'number', value, pos, ws });
  } else {
    tokens.push({ type: 'dimension', value, unit, pos, ws });
  }
}

/**
 * Convert a slice of an existing CSS token stream into the token subset used
 * by the calculation parser. Token positions remain relative to the original
 * source text, which keeps parse errors useful to adapter callers.
 *
 * @param {import('@csstools/css-tokenizer').CSSToken[]} cssTokens
 * @param {number} eofPosition
 * @param {number} [start]
 * @param {number} [end]
 * @return {Token[]}
 */
function tokenizeTokens(
  cssTokens,
  eofPosition,
  start = 0,
  end = cssTokens.length
) {
  /** @type {Token[]} */
  const tokens = [];
  let ws = true;

  for (let i = start; i < end; i++) {
    const t = cssTokens[i];
    switch (t[0]) {
      case CssType.Whitespace:
      case CssType.Comment:
        ws = true;
        continue;
      case CssType.Number:
        pushNumeric(tokens, t[1], undefined, t[2], ws);
        ws = false;
        continue;
      case CssType.Dimension:
        pushNumeric(tokens, t[1], t[4].unit, t[2], ws);
        ws = false;
        continue;
      case CssType.Percentage:
        pushNumeric(tokens, t[1], '%', t[2], ws);
        ws = false;
        continue;
      case CssType.Ident:
        tokens.push({ type: 'ident', value: t[4].value, pos: t[2], ws });
        break;
      case CssType.Function:
        tokens.push({ type: 'ident', value: t[4].value, pos: t[2], ws });
        tokens.push({
          type: 'punct',
          value: '(',
          pos: t[2] + t[1].length - 1,
          ws: false,
        });
        break;
      case CssType.OpenParen:
        tokens.push({ type: 'punct', value: '(', pos: t[2], ws });
        break;
      case CssType.CloseParen:
        tokens.push({ type: 'punct', value: ')', pos: t[2], ws });
        break;
      case CssType.Comma:
        tokens.push({ type: 'punct', value: ',', pos: t[2], ws });
        break;
      case CssType.Delim:
        if (!PUNCT_DELIMS.has(t[4].value)) {
          throw new Error(
            `Unexpected character "${t[4].value}" at position ${t[2]}`
          );
        }
        tokens.push({ type: 'punct', value: t[4].value, pos: t[2], ws });
        break;
      case CssType.EOF:
        continue;
      default:
        throw new Error(
          `Unexpected character "${t[1][0] ?? ''}" at position ${t[2]}`
        );
    }
    ws = false;
  }

  tokens.push({ type: 'eof', value: '', pos: eofPosition, ws });

  return tokens;
}

export { tokenize, tokenizeTokens };
