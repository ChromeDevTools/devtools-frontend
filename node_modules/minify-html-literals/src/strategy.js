"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adjustMinifyCSSOptions = exports.defaultStrategy = exports.defaultMinifyOptions = exports.defaultMinifyCSSOptions = void 0;
/// <reference types="./types/clean-css" />
// Reference needed for d.ts distribution files in rollup-plugin-minify-html-literals
const CleanCSS = require("clean-css");
const optimization_level_1 = require("clean-css/lib/options/optimization-level");
const html_minifier_1 = require("html-minifier");
/**
 * The default <code>clean-css</code> options, optimized for production
 * minification.
 */
exports.defaultMinifyCSSOptions = {};
/**
 * The default <code>html-minifier</code> options, optimized for production
 * minification.
 */
exports.defaultMinifyOptions = {
    caseSensitive: true,
    collapseWhitespace: true,
    decodeEntities: true,
    minifyCSS: exports.defaultMinifyCSSOptions,
    minifyJS: true,
    processConditionalComments: true,
    removeAttributeQuotes: false,
    removeComments: true,
    removeEmptyAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    useShortDoctype: true
};
/**
 * The default strategy. This uses <code>html-minifier</code> to minify HTML and
 * <code>clean-css</code> to minify CSS.
 */
exports.defaultStrategy = {
    getPlaceholder(parts) {
        // Using @ and (); will cause the expression not to be removed in CSS.
        // However, sometimes the semicolon can be removed (ex: inline styles).
        // In those cases, we want to make sure that the HTML splitting also
        // accounts for the missing semicolon.
        const suffix = '();';
        let placeholder = '@TEMPLATE_EXPRESSION';
        while (parts.some(part => part.text.includes(placeholder + suffix))) {
            placeholder += '_';
        }
        return placeholder + suffix;
    },
    combineHTMLStrings(parts, placeholder) {
        return parts.map(part => part.text).join(placeholder);
    },
    minifyHTML(html, options = {}) {
        let minifyCSSOptions;
        if (options.minifyCSS) {
            if (options.minifyCSS !== true &&
                typeof options.minifyCSS !== 'function') {
                minifyCSSOptions = { ...options.minifyCSS };
            }
            else {
                minifyCSSOptions = {};
            }
        }
        else {
            minifyCSSOptions = false;
        }
        let adjustedMinifyCSSOptions = false;
        if (minifyCSSOptions) {
            adjustedMinifyCSSOptions = adjustMinifyCSSOptions(minifyCSSOptions);
        }
        let result = html_minifier_1.minify(html, {
            ...options,
            minifyCSS: adjustedMinifyCSSOptions
        });
        if (options.collapseWhitespace) {
            // html-minifier does not support removing newlines inside <svg>
            // attributes. Support this, but be careful not to remove newlines from
            // supported areas (such as within <pre> and <textarea> tags).
            const matches = Array.from(result.matchAll(/<svg/g)).reverse();
            for (const match of matches) {
                const startTagIndex = match.index;
                const closeTagIndex = result.indexOf('</svg', startTagIndex);
                if (closeTagIndex < 0) {
                    // Malformed SVG without a closing tag
                    continue;
                }
                const start = result.substring(0, startTagIndex);
                let svg = result.substring(startTagIndex, closeTagIndex);
                const end = result.substring(closeTagIndex);
                svg = svg.replace(/\r?\n/g, '');
                result = start + svg + end;
            }
        }
        if (adjustedMinifyCSSOptions &&
            adjustedMinifyCSSOptions.level[optimization_level_1.OptimizationLevel.One].tidySelectors) {
            // Fix https://github.com/jakubpawlowicz/clean-css/issues/996
            result = fixCleanCssTidySelectors(html, result);
        }
        return result;
    },
    minifyCSS(css, options = {}) {
        const adjustedOptions = adjustMinifyCSSOptions(options);
        const output = new CleanCSS(adjustedOptions).minify(css);
        if (output.errors && output.errors.length) {
            throw new Error(output.errors.join('\n\n'));
        }
        if (adjustedOptions.level[optimization_level_1.OptimizationLevel.One].tidySelectors) {
            output.styles = fixCleanCssTidySelectors(css, output.styles);
        }
        return output.styles;
    },
    splitHTMLByPlaceholder(html, placeholder) {
        const parts = html.split(placeholder);
        // Make the last character (a semicolon) optional. See above.
        if (placeholder.endsWith(';')) {
            const withoutSemicolon = placeholder.substring(0, placeholder.length - 1);
            for (let i = parts.length - 1; i >= 0; i--) {
                parts.splice(i, 1, ...parts[i].split(withoutSemicolon));
            }
        }
        return parts;
    }
};
function adjustMinifyCSSOptions(options = {}) {
    const level = optimization_level_1.optimizationLevelFrom(options.level);
    const originalTransform = typeof options.level === 'object' &&
        options.level[1] &&
        options.level[1].transform;
    level[optimization_level_1.OptimizationLevel.One].transform = (property, value) => {
        if (value.startsWith('@TEMPLATE_EXPRESSION') && !value.endsWith(';')) {
            // The CSS minifier has removed the semicolon from the placeholder
            // and we need to add it back.
            return (value = `${value};`);
        }
        return originalTransform ? originalTransform(property, value) : value;
    };
    return {
        ...options,
        level
    };
}
exports.adjustMinifyCSSOptions = adjustMinifyCSSOptions;
function fixCleanCssTidySelectors(original, result) {
    const regex = /(::?.+\((.*)\))[\s\r\n]*{/gm;
    let match;
    while ((match = regex.exec(original)) != null) {
        const pseudoClass = match[1];
        const parameters = match[2];
        if (!parameters.match(/\s/)) {
            continue;
        }
        const parametersWithoutSpaces = parameters.replace(/\s/g, '');
        const resultPseudoClass = pseudoClass.replace(parameters, parametersWithoutSpaces);
        const resultStartIndex = result.indexOf(resultPseudoClass);
        if (resultStartIndex < 0) {
            continue;
        }
        const resultEndIndex = resultStartIndex + resultPseudoClass.length;
        // Restore the original pseudo class with spaces
        result =
            result.substring(0, resultStartIndex) +
                pseudoClass +
                result.substring(resultEndIndex);
    }
    return result;
}
//# sourceMappingURL=strategy.js.map