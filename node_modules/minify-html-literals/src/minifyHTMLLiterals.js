"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.minifyHTMLLiterals = exports.defaultValidation = exports.defaultShouldMinifyCSS = exports.defaultShouldMinify = exports.defaultGenerateSourceMap = void 0;
const magic_string_1 = require("magic-string");
const parse_literals_1 = require("parse-literals");
const strategy_1 = require("./strategy");
/**
 * The default method to generate a SourceMap. It will generate the SourceMap
 * from the provided MagicString instance using "fileName.map" as the file and
 * "fileName" as the source.
 *
 * @param ms the MagicString instance with code modifications
 * @param fileName the name of the source file
 * @returns a v3 SourceMap
 */
function defaultGenerateSourceMap(ms, fileName) {
    return ms.generateMap({
        file: `${fileName}.map`,
        source: fileName,
        hires: true
    });
}
exports.defaultGenerateSourceMap = defaultGenerateSourceMap;
/**
 * The default method to determine whether or not to minify a template. It will
 * return true for all tagged templates whose tag name contains "html" (case
 * insensitive).
 *
 * @param template the template to check
 * @returns true if the template should be minified
 */
function defaultShouldMinify(template) {
    const tag = template.tag && template.tag.toLowerCase();
    return !!tag && (tag.includes('html') || tag.includes('svg'));
}
exports.defaultShouldMinify = defaultShouldMinify;
/**
 * The default method to determine whether or not to minify a CSS template. It
 * will return true for all tagged templates whose tag name contains "css" (case
 * insensitive).
 *
 * @param template the template to check
 * @returns true if the template should be minified
 */
function defaultShouldMinifyCSS(template) {
    return !!template.tag && template.tag.toLowerCase().includes('css');
}
exports.defaultShouldMinifyCSS = defaultShouldMinifyCSS;
/**
 * The default validation.
 */
exports.defaultValidation = {
    ensurePlaceholderValid(placeholder) {
        if (typeof placeholder !== 'string' || !placeholder.length) {
            throw new Error('getPlaceholder() must return a non-empty string');
        }
    },
    ensureHTMLPartsValid(parts, htmlParts) {
        if (parts.length !== htmlParts.length) {
            throw new Error('splitHTMLByPlaceholder() must return same number of strings as template parts');
        }
    }
};
function minifyHTMLLiterals(source, options = {}) {
    options.minifyOptions = {
        ...strategy_1.defaultMinifyOptions,
        ...(options.minifyOptions || {})
    };
    if (!options.MagicString) {
        options.MagicString = magic_string_1.default;
    }
    if (!options.parseLiterals) {
        options.parseLiterals = parse_literals_1.parseLiterals;
    }
    if (!options.shouldMinify) {
        options.shouldMinify = defaultShouldMinify;
    }
    if (!options.shouldMinifyCSS) {
        options.shouldMinifyCSS = defaultShouldMinifyCSS;
    }
    options.parseLiteralsOptions = {
        ...{ fileName: options.fileName },
        ...(options.parseLiteralsOptions || {})
    };
    const templates = options.parseLiterals(source, options.parseLiteralsOptions);
    const strategy = options.strategy || strategy_1.defaultStrategy;
    const { shouldMinify, shouldMinifyCSS } = options;
    let validate;
    if (options.validate !== false) {
        validate = options.validate || exports.defaultValidation;
    }
    const ms = new options.MagicString(source);
    templates.forEach(template => {
        const minifyHTML = shouldMinify(template);
        const minifyCSS = !!strategy.minifyCSS && shouldMinifyCSS(template);
        if (minifyHTML || minifyCSS) {
            const placeholder = strategy.getPlaceholder(template.parts);
            if (validate) {
                validate.ensurePlaceholderValid(placeholder);
            }
            const combined = strategy.combineHTMLStrings(template.parts, placeholder);
            let min;
            if (minifyCSS) {
                const minifyCSSOptions = (options.minifyOptions || {}).minifyCSS;
                if (typeof minifyCSSOptions === 'function') {
                    min = minifyCSSOptions(combined);
                }
                else if (minifyCSSOptions === false) {
                    min = combined;
                }
                else {
                    const cssOptions = typeof minifyCSSOptions === 'object' ? minifyCSSOptions : undefined;
                    min = strategy.minifyCSS(combined, cssOptions);
                }
            }
            else {
                min = strategy.minifyHTML(combined, options.minifyOptions);
            }
            const minParts = strategy.splitHTMLByPlaceholder(min, placeholder);
            if (validate) {
                validate.ensureHTMLPartsValid(template.parts, minParts);
            }
            template.parts.forEach((part, index) => {
                if (part.start < part.end) {
                    // Only overwrite if the literal part has text content
                    ms.overwrite(part.start, part.end, minParts[index]);
                }
            });
        }
    });
    const sourceMin = ms.toString();
    if (source === sourceMin) {
        return null;
    }
    else {
        let map;
        if (options.generateSourceMap !== false) {
            const generateSourceMap = options.generateSourceMap || defaultGenerateSourceMap;
            map = generateSourceMap(ms, options.fileName || '');
        }
        return {
            map,
            code: sourceMin
        };
    }
}
exports.minifyHTMLLiterals = minifyHTMLLiterals;
//# sourceMappingURL=minifyHTMLLiterals.js.map