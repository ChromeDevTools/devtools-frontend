export = createMatcher;
/**
 * Creates a matcher object for the passed expectation
 *
 * @alias module:samsam.createMatcher
 * @param {*} expectation An expecttation
 * @param {string} message A message for the expectation
 * @returns {object} A matcher object
 */
declare function createMatcher(expectation: any, message: string, ...args: any[]): object;
declare namespace createMatcher {
    export { isMatcher };
    export const any: any;
    export const defined: any;
    export const truthy: any;
    export const falsy: any;
    export function same(expectation: any): any;
    function _in(arrayOfExpectations: any): any;
    export { _in as in };
    export function typeOf(type: any): any;
    export function instanceOf(type: any): any;
    export const has: any;
    export const hasOwn: any;
    export function hasNested(property: any, value: any, ...args: any[]): any;
    export function json(value: any): any;
    export function every(predicate: any): any;
    export function some(predicate: any): any;
    export const array: any;
    export const map: any;
    export const set: any;
    export const bool: any;
    export const number: any;
    export const string: any;
    export const object: any;
    export const func: any;
    export const regexp: any;
    export const date: any;
    export const symbol: any;
}
import isMatcher = require("./create-matcher/is-matcher");
