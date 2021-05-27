/// <reference types="./types/clean-css" />
/// <reference types="node" />
import * as CleanCSS from 'clean-css';
import { Options as HTMLOptions } from 'html-minifier';
import { TemplatePart } from 'parse-literals';
/**
 * A strategy on how to minify HTML and optionally CSS.
 *
 * @template O minify HTML options
 * @template C minify CSS options
 */
export interface Strategy<O = any, C = any> {
    /**
     * Retrieve a placeholder for the given array of template parts. The
     * placeholder returned should be the same if the function is invoked with the
     * same array of parts.
     *
     * The placeholder should be an HTML-compliant string that is not present in
     * any of the parts' text.
     *
     * @param parts the parts to get a placeholder for
     * @returns the placeholder
     */
    getPlaceholder(parts: TemplatePart[]): string;
    /**
     * Combines the parts' HTML text strings together into a single string using
     * the provided placeholder. The placeholder indicates where a template
     * expression occurs.
     *
     * @param parts the parts to combine
     * @param placeholder the placeholder to use between parts
     * @returns the combined parts' text strings
     */
    combineHTMLStrings(parts: TemplatePart[], placeholder: string): string;
    /**
     * Minfies the provided HTML string.
     *
     * @param html the html to minify
     * @param options html minify options
     * @returns minified HTML string
     */
    minifyHTML(html: string, options?: O): string;
    /**
     * Minifies the provided CSS string.
     *
     * @param css the css to minfiy
     * @param options css minify options
     * @returns minified CSS string
     */
    minifyCSS?(css: string, options?: C): string;
    /**
     * Splits a minfied HTML string back into an array of strings from the
     * provided placeholder. The returned array of strings should be the same
     * length as the template parts that were combined to make the HTML string.
     *
     * @param html the html string to split
     * @param placeholder the placeholder to split by
     * @returns an array of html strings
     */
    splitHTMLByPlaceholder(html: string, placeholder: string): string[];
}
/**
 * The default <code>clean-css</code> options, optimized for production
 * minification.
 */
export declare const defaultMinifyCSSOptions: CleanCSS.Options;
/**
 * The default <code>html-minifier</code> options, optimized for production
 * minification.
 */
export declare const defaultMinifyOptions: HTMLOptions;
/**
 * The default strategy. This uses <code>html-minifier</code> to minify HTML and
 * <code>clean-css</code> to minify CSS.
 */
export declare const defaultStrategy: Strategy<HTMLOptions, CleanCSS.Options>;
export declare function adjustMinifyCSSOptions(options?: CleanCSS.Options): {
    level: import("clean-css/lib/options/optimization-level").OptimizationLevelOptions;
    compatibility?: CleanCSS.CompatibilityOptions | "*" | "ie9" | "ie8" | "ie7" | undefined;
    fetch?: ((uri: string, inlineRequest: import("http").RequestOptions | import("https").RequestOptions, inlineTimeout: number, done: (message: string | number, body: string) => void) => void) | undefined;
    format?: false | CleanCSS.FormatOptions | "beautify" | "keep-breaks" | undefined;
    inline?: false | readonly string[] | undefined;
    inlineRequest?: import("http").RequestOptions | import("https").RequestOptions | undefined;
    inlineTimeout?: number | undefined;
    rebase?: boolean | undefined;
    rebaseTo?: string | undefined;
    returnPromise?: boolean | undefined;
    sourceMap?: boolean | undefined;
    sourceMapInlineSources?: boolean | undefined;
};
