// CSS component-value reducer. This module deliberately has no PostCSS
// dependency so it can also be used for individual declaration values,
// at-rule parameters, or selector text.
import {
  tokenize as cssTokenize,
  TokenType as CssType,
} from '@csstools/css-tokenizer';
import { tokenizeTokens } from './lib/tokenizer.js';
import { parse } from './lib/parser.js';
import { simplify } from './lib/simplify.js';
import {
  isSupportedMathFunction,
  hasPotentialMathFunction,
  QUICK_MATH_TEST,
} from './lib/simplify/call.js';
import { serialize } from './lib/serialize.js';

const MATCH_CALC = /^(?:-(?:moz|webkit)-)?calc$/i;

const BLOCK_CLOSE = new Map([
  [CssType.OpenParen, CssType.CloseParen],
  [CssType.OpenSquare, CssType.CloseSquare],
  [CssType.OpenCurly, CssType.CloseCurly],
]);

/**
 * @typedef {object} ReduceCalcOptions
 * @property {number | false} [precision]
 * @property {boolean} [warnWhenCannotResolve]
 * @property {boolean} [unwrapSingleNegativeNumber] Serialize finite negative results without a `calc()` wrapper. Defaults to `false`.
 * @property {(error: Error, input: string) => void} [onParseError] Invoked when parse/simplify throws.
 * @property {(message: string) => void} [onWarn] Invoked when `warnWhenCannotResolve` is set and an expression cannot be reduced to a single value.
 */

/** @typedef {Required<Omit<ReduceCalcOptions, 'onParseError' | 'onWarn'>> & Pick<ReduceCalcOptions, 'onParseError' | 'onWarn'>} ResolvedReduceCalcOptions */

/**
 * Fields threaded through the internal token-range walk.
 *
 * @typedef {object} TransformContext
 * @property {ResolvedReduceCalcOptions} options
 * @property {string} value
 * @property {import('@csstools/css-tokenizer').CSSToken[]} tokens
 * @property {Replacement[]} replacements
 */

/**
 * @typedef {object} Replacement
 * @property {number} start
 * @property {number} end
 * @property {import('./lib/node.js').Node} node
 * @property {string} calcName
 */

/**
 * Walk one component-value level. Unsupported functions and simple blocks are
 * traversed, while a supported function is treated as one opaque calculation
 * even when parsing it fails. A missing closer consumes through EOF, matching
 * CSS component-value parsing's error recovery.
 *
 * @param {number} start
 * @param {import('@csstools/css-tokenizer').TokenType | undefined} expectedClose
 * @param {TransformContext} ctx
 * @param {boolean} transform
 * @return {number} Index of the matching closer, or the EOF token.
 */
function walkTokens(start, expectedClose, ctx, transform) {
  for (let i = start; i < ctx.tokens.length; i++) {
    const token = ctx.tokens[i];
    if (token[0] === CssType.EOF || token[0] === expectedClose) return i;

    const blockClose = BLOCK_CLOSE.get(token[0]);
    if (blockClose) {
      i = walkTokens(i + 1, blockClose, ctx, transform);
      continue;
    }

    if (token[0] !== CssType.Function) continue;

    const name = token[4].value;
    const isCalc = MATCH_CALC.test(name);
    const isMath = !isCalc && isSupportedMathFunction(name);
    if (!transform || (!isCalc && !isMath)) {
      i = walkTokens(i + 1, CssType.CloseParen, ctx, transform);
      continue;
    }

    // Locate the complete outer function without transforming its children.
    const close = walkTokens(i + 1, CssType.CloseParen, ctx, false);
    const closed = ctx.tokens[close][0] === CssType.CloseParen;
    const end = closed ? ctx.tokens[close][3] + 1 : ctx.value.length;
    const sliceStart = isCalc ? i + 1 : i;
    const sliceEnd = closed ? close + (isCalc ? 0 : 1) : close;
    const inputStart = isCalc ? token[3] + 1 : token[2];
    const inputEnd = closed && isCalc ? ctx.tokens[close][2] : end;
    const contents = ctx.value.slice(inputStart, inputEnd);
    try {
      const node = simplify(
        parse(tokenizeTokens(ctx.tokens, end, sliceStart, sliceEnd))
      );
      ctx.replacements.push({
        start: token[2],
        end,
        node,
        calcName: isCalc ? name : 'calc',
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Error');
      ctx.options.onParseError?.(err, contents);
    }
    i = close;
  }

  return ctx.tokens.length - 1;
}

/**
 * @param {import('./lib/node.js').Node} node
 * @return {boolean}
 */
function isUnresolvedResult(node) {
  if (node.type === 'Sum' || node.type === 'Product') {
    return true;
  }
  return node.type === 'Call' && isSupportedMathFunction(node.name);
}

/**
 * Simplify every supported CSS math function in a component-value string.
 * Text outside those functions is preserved byte-for-byte.
 *
 * @param {string} value
 * @param {ReduceCalcOptions} [opts]
 * @return {string}
 */
function reduceCalc(value, opts) {
  if (!hasPotentialMathFunction(value)) {
    return value;
  }

  /** @type {ResolvedReduceCalcOptions} */
  const options = {
    precision: 5,
    warnWhenCannotResolve: false,
    unwrapSingleNegativeNumber: false,
    ...opts,
  };
  const tokens = cssTokenize({ css: value });
  /** @type {Replacement[]} */
  const replacements = [];
  walkTokens(0, undefined, { options, value, tokens, replacements }, true);

  if (replacements.length === 0) {
    return value;
  }

  let output = '';
  let lastIndex = 0;
  for (const replacement of replacements) {
    const text = serialize(replacement.node, {
      precision: options.precision,
      calcName: replacement.calcName,
      unwrapSingleNegativeNumber: options.unwrapSingleNegativeNumber,
    });
    if (options.warnWhenCannotResolve && isUnresolvedResult(replacement.node)) {
      options.onWarn?.('Could not reduce expression: ' + value);
    }
    output += value.slice(lastIndex, replacement.start) + text;
    lastIndex = replacement.end;
  }
  output += value.slice(lastIndex);
  return output;
}

export { QUICK_MATH_TEST, hasPotentialMathFunction };
export default reduceCalc;
