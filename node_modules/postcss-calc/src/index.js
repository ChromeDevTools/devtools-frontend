// PostCSS adapter over the standalone component-value reducer.
import reduceCalc, { hasPotentialMathFunction } from './reduce.js';

/**
 * @typedef {object} PostCssCalcOptions
 * @property {number | false} [precision]
 * @property {boolean} [warnWhenCannotResolve]
 * @property {boolean} [mediaQueries]
 * @property {boolean} [selectors]
 * @property {(error: Error, input: string) => void} [onParseError] Invoked when parse/simplify throws. Replaces the default `result.warn`.
 */

/** @typedef {Required<Omit<PostCssCalcOptions, 'onParseError'>> & Pick<PostCssCalcOptions, 'onParseError'>} ResolvedOptions */

/**
 * Runs `reduceCalc` over one text property of a decl/atrule/rule node
 * and updates it in place.
 * `setProp` closes over the property name and the concrete node type at
 * each call site, since `Declaration`/`AtRule`/`Rule` don't share a typed
 * "text property" name to index generically.
 *
 * @param {import('postcss').ChildNode} node
 * @param {string} current
 * @param {(target: import('postcss').ChildNode, value: string) => void} setProp
 * @param {ResolvedOptions} options
 * @param {import('postcss').Result} result
 * @param {boolean} unwrapSingleNegativeNumber
 * @return {void}
 */
function applyTransform(
  node,
  current,
  setProp,
  options,
  result,
  unwrapSingleNegativeNumber
) {
  if (!hasPotentialMathFunction(current)) {
    return;
  }
  const transformed = reduceCalc(current, {
    precision: options.precision,
    warnWhenCannotResolve: options.warnWhenCannotResolve,
    onParseError:
      options.onParseError ??
      ((error) => {
        result.warn(error.message, { node });
      }),
    onWarn: (message) => {
      result.warn(message, { plugin: 'postcss-calc', node });
    },
    unwrapSingleNegativeNumber,
  });
  if (transformed !== current) {
    setProp(node, transformed);
  }
}

/**
 * @param {PostCssCalcOptions} [opts]
 * @return {import('postcss').Plugin}
 */
function pluginCreator(opts) {
  /** @type {ResolvedOptions} */
  const options = {
    precision: 5,
    warnWhenCannotResolve: false,
    mediaQueries: false,
    selectors: false,
    ...opts,
  };

  return {
    postcssPlugin: 'postcss-calc',
    /**
     * @param {import('postcss').Root} css
     * @param {import('postcss').Helpers} helpers
     */
    OnceExit(css, { result }) {
      css.walk((node) => {
        if (node.type === 'decl') {
          applyTransform(
            node,
            node.value,
            (n, v) => {
              /** @type {import('postcss').Declaration} */ (n).value = v;
            },
            options,
            result,
            false
          );
        }
        if (node.type === 'atrule' && options.mediaQueries) {
          applyTransform(
            node,
            node.params,
            (n, v) => {
              /** @type {import('postcss').AtRule} */ (n).params = v;
            },
            options,
            result,
            false
          );
        }
        if (node.type === 'rule' && options.selectors) {
          // Reduces `:nth-child(calc(...))` via the function walk. calc() in a
          // quoted attribute value is a literal match, so it's left untouched.
          applyTransform(
            node,
            node.selector,
            (n, v) => {
              /** @type {import('postcss').Rule} */ (n).selector = v;
            },
            options,
            result,
            true
          );
        }
      });
    },
  };
}

/** @type {true} */
pluginCreator.postcss = true;

export default /** @type import('postcss').PluginCreator<PostCssCalcOptions>*/ (
  pluginCreator
);
export { pluginCreator as 'module.exports' };
