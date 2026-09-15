/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/

'use strict';

// Generate an internal UID to make the regexp pattern harder to guess.
var UID_LENGTH          = 16;
var UID                 = generateUID();
var PLACE_HOLDER_REGEXP = new RegExp('(\\\\)?"@__(F|R|D|M|S|A|U|I|B|L)-' + UID + '-(\\d+)__@"', 'g');

var IS_NATIVE_CODE_REGEXP = /\{\s*\[native code\]\s*\}/g;
var IS_PURE_FUNCTION = /function.*?\(/;
var IS_ARROW_FUNCTION = /.*?=>.*?/;
var UNSAFE_CHARS_REGEXP   = /[<>\/\u2028\u2029]/g;
// Matches a script end tag (case-insensitive) for XSS protection: either a
// full `</script...>` tag, or a bare `</script` followed by one of the
// characters (TAB, LF, FF, CR, SPACE, `/`, `>`) that the HTML tokenizer
// treats as ending the tag name (see the WHATWG "script data end tag name
// state"). The bare-prefix form matters because the matching `>` could be
// supplied by a different serialized value later in the output, so escaping
// stops there without waiting for a closing `>`. A trailing backslash is not
// a delimiter here (that's a JS-level concern, not an HTML one), so this
// doesn't affect tagged template literals like `String.raw`.
var SCRIPT_CLOSE_REGEXP = /<\/script[^>]*>|<\/script(?=[\t\n\f\r \/>])/gi;

var RESERVED_SYMBOLS = ['*', 'async'];

// Mapping of unsafe HTML and invalid JavaScript line terminator chars to their
// Unicode char counterparts which are safe to use in JavaScript strings.
var ESCAPED_CHARS = {
    '<'     : '\\u003C',
    '>'     : '\\u003E',
    '/'     : '\\u002F',
    '\u2028': '\\u2028',
    '\u2029': '\\u2029'
};

function escapeUnsafeChars(unsafeChar) {
    return ESCAPED_CHARS[unsafeChar];
}

// Roughly matches string literals, template literals, regex literals, and
// comments, so `escapeFunctionBody` can treat their contents differently
// from plain code. This is a heuristic, not a full parser, with two known
// limitations:
// - A template literal is treated as one opaque span, including any
//   `${...}` inside it. A `</script`-like sequence inside such a
//   substitution (real code) can be misclassified as string content.
// - The regex-literal alternative can't tell a regex from division (e.g.
//   `a / b / c`); a division expression that matches it is simply treated
//   as opaque, which only risks an unnecessary (but valid) unicode-escape.
//   It exists mainly so quotes and slashes inside a real regex (including
//   inside a `[...]` character class) aren't mistaken for string/regex
//   delimiters, which would misalign whatever follows.
var STRING_OR_COMMENT_REGEXP = /\/\*[\s\S]*?\*\/|\/\/[^\n]*|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`|\/(?:\\.|\[(?:\\.|[^\]\\\n])*\]|[^\/\\\n])+\//g;

// Escape function body for XSS protection while preserving arrow function
// syntax (=>), comparison operators, and regex literals: only script end
// tags and line terminators are escaped.
function escapeFunctionBody(str) {
    // Record the [start, end) span of every string/template/regex literal
    // and comment, so a script-close match inside one can be escaped
    // differently from a match in plain code (see below).
    var stringAndCommentSpans = [];
    var match;
    STRING_OR_COMMENT_REGEXP.lastIndex = 0;
    while ((match = STRING_OR_COMMENT_REGEXP.exec(str))) {
        stringAndCommentSpans.push([match.index, match.index + match[0].length]);
    }

    // Matches and spans are both in increasing offset order, so a single
    // forward-moving cursor classifies every match in O(n) total instead of
    // rescanning all spans for each match.
    var spanCursor = 0;

    str = str.replace(SCRIPT_CLOSE_REGEXP, function(scriptCloseMatch, offset) {
        while (spanCursor < stringAndCommentSpans.length && stringAndCommentSpans[spanCursor][1] <= offset) {
            spanCursor++;
        }
        var span = stringAndCommentSpans[spanCursor];
        var inStringOrComment = !!span && offset >= span[0] && offset < span[1];
        if (!inStringOrComment) {
            // In plain code, `<` and `/` may be real tokens (comparison,
            // regex delimiter, division, ...), so they can't be rewritten
            // as unicode escapes without breaking syntax. A space is a
            // no-op here but still breaks up the `</script` sequence.
            return '< ' + scriptCloseMatch.slice(1);
        }
        // Inside a string/template/regex/comment, characters must be
        // preserved exactly, so unicode-escape instead.
        return scriptCloseMatch.replace(/</g, '\\u003C').replace(/\//g, '\\u002F').replace(/>/g, '\\u003E');
    });
    str = str.replace(/\u2028/g, '\\u2028');
    str = str.replace(/\u2029/g, '\\u2029');
    return str;
}

function generateUID() {
    var bytes = crypto.getRandomValues(new Uint8Array(UID_LENGTH));
    var result = '';
    for(var i=0; i<UID_LENGTH; ++i) {
        result += bytes[i].toString(16);
    }
    return result;
}

function deleteFunctions(obj){
    var functionKeys = [];
    for (var key in obj) {
        if (typeof obj[key] === "function") {
            functionKeys.push(key);
        }
    }
    for (var i = 0; i < functionKeys.length; i++) {
        delete obj[functionKeys[i]];
    }
}

module.exports = function serialize(obj, options) {
    options || (options = {});

    // Backwards-compatibility for `space` as the second argument.
    if (typeof options === 'number' || typeof options === 'string') {
        options = {space: options};
    }

    var functions = [];
    var regexps   = [];
    var dates     = [];
    var maps      = [];
    var sets      = [];
    var arrays    = [];
    var undefs    = [];
    var infinities= [];
    var bigInts = [];
    var urls = [];

    // Returns placeholders for functions and regexps (identified by index)
    // which are later replaced by their string representation.
    function replacer(key, value) {

        // For nested function
        if(options.ignoreFunction){
            deleteFunctions(value);
        }

        if (!value && value !== undefined && value !== BigInt(0)) {
            return value;
        }

        // If the value is an object w/ a toJSON method, toJSON is called before
        // the replacer runs, so we use this[key] to get the non-toJSONed value.
        var origValue = this[key];
        var type = typeof origValue;

        if (type === 'object') {
            if(origValue instanceof RegExp) {
                return '@__R-' + UID + '-' + (regexps.push(origValue) - 1) + '__@';
            }

            if(origValue instanceof Date) {
                return '@__D-' + UID + '-' + (dates.push(origValue) - 1) + '__@';
            }

            if(origValue instanceof Map) {
                return '@__M-' + UID + '-' + (maps.push(origValue) - 1) + '__@';
            }

            if(origValue instanceof Set) {
                return '@__S-' + UID + '-' + (sets.push(origValue) - 1) + '__@';
            }

            if(Array.isArray(origValue)) {
                var isSparse = Object.keys(origValue).length !== origValue.length;
                if (isSparse) {
                    return '@__A-' + UID + '-' + (arrays.push(origValue) - 1) + '__@';
                }
            }

            if(origValue instanceof URL) {
                return '@__L-' + UID + '-' + (urls.push(origValue) - 1) + '__@';
            }
        }

        if (type === 'function') {
            return '@__F-' + UID + '-' + (functions.push(origValue) - 1) + '__@';
        }

        if (type === 'undefined') {
            return '@__U-' + UID + '-' + (undefs.push(origValue) - 1) + '__@';
        }

        if (type === 'number' && !isNaN(origValue) && !isFinite(origValue)) {
            return '@__I-' + UID + '-' + (infinities.push(origValue) - 1) + '__@';
        }

        if (type === 'bigint') {
            return '@__B-' + UID + '-' + (bigInts.push(origValue) - 1) + '__@';
        }

        return value;
    }

    function serializeFunc(fn, options) {
      var serializedFn = fn.toString();
      if (IS_NATIVE_CODE_REGEXP.test(serializedFn)) {
          throw new TypeError('Serializing native function: ' + fn.name);
      }

      // Escape unsafe HTML characters in function body for XSS protection
      if (options && options.unsafe !== true) {
          serializedFn = escapeFunctionBody(serializedFn);
      }

      // pure functions, example: {key: function() {}}
      if(IS_PURE_FUNCTION.test(serializedFn)) {
          return serializedFn;
      }

      // arrow functions, example: arg1 => arg1+5
      if(IS_ARROW_FUNCTION.test(serializedFn)) {
          return serializedFn;
      }

      var argsStartsAt = serializedFn.indexOf('(');
      var def = serializedFn.substr(0, argsStartsAt)
        .trim()
        .split(' ')
        .filter(function(val) { return val.length > 0 });

      var nonReservedSymbols = def.filter(function(val) {
        return RESERVED_SYMBOLS.indexOf(val) === -1
      });

      // enhanced literal objects, example: {key() {}}
      if(nonReservedSymbols.length > 0) {
          return (def.indexOf('async') > -1 ? 'async ' : '') + 'function'
            + (def.join('').indexOf('*') > -1 ? '*' : '')
            + serializedFn.substr(argsStartsAt);
      }

      // arrow functions
      return serializedFn;
    }

    // Check if the parameter is function
    if (options.ignoreFunction && typeof obj === "function") {
        obj = undefined;
    }
    // Protects against `JSON.stringify()` returning `undefined`, by serializing
    // to the literal string: "undefined".
    if (obj === undefined) {
        return String(obj);
    }

    var str;

    // Creates a JSON string representation of the value.
    // NOTE: Node 0.12 goes into slow mode with extra JSON.stringify() args.
    if (options.isJSON && !options.space) {
        str = JSON.stringify(obj);
    } else {
        str = JSON.stringify(obj, options.isJSON ? null : replacer, options.space);
    }

    // Protects against `JSON.stringify()` returning `undefined`, by serializing
    // to the literal string: "undefined".
    if (typeof str !== 'string') {
        return String(str);
    }

    // Replace unsafe HTML and invalid JavaScript line terminator chars with
    // their safe Unicode char counterpart. This _must_ happen before the
    // regexps and functions are serialized and added back to the string.
    if (options.unsafe !== true) {
        str = str.replace(UNSAFE_CHARS_REGEXP, escapeUnsafeChars);
    }

    if (functions.length === 0 && regexps.length === 0 && dates.length === 0 && maps.length === 0 && sets.length === 0 && arrays.length === 0 && undefs.length === 0 && infinities.length === 0 && bigInts.length === 0 && urls.length === 0) {
        return str;
    }

    // Replaces all occurrences of function, regexp, date, map and set placeholders in the
    // JSON string with their string representations. If the original value can
    // not be found, then `undefined` is used.
    return str.replace(PLACE_HOLDER_REGEXP, function (match, backSlash, type, valueIndex) {
        // The placeholder may not be preceded by a backslash. This is to prevent
        // replacing things like `"a\"@__R-<UID>-0__@"` and thus outputting
        // invalid JS.
        if (backSlash) {
            return match;
        }

        if (type === 'D') {
            // Validate ISO string format to prevent code injection via spoofed toISOString()
            var isoStr = String(dates[valueIndex].toISOString());
            if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(isoStr)) {
                throw new TypeError('Invalid Date ISO string');
            }
            return "new Date(\"" + isoStr + "\")";
        }

        if (type === 'R') {
            // Sanitize flags to prevent code injection (only allow valid RegExp flag characters)
            var flags = String(regexps[valueIndex].flags).replace(/[^gimsuydv]/g, '');
            var regexpSource = regexps[valueIndex].source;
            if (typeof regexpSource !== 'string') {
                throw new TypeError('RegExp.source must be a string');
            }
            return "new RegExp(" + serialize(regexpSource) + ", \"" + flags + "\")";
        }

        if (type === 'M') {
            return "new Map(" + serialize(Array.from(maps[valueIndex].entries()), options) + ")";
        }

        if (type === 'S') {
            return "new Set(" + serialize(Array.from(sets[valueIndex].values()), options) + ")";
        }

        if (type === 'A') {
            return "Array.prototype.slice.call(" + serialize(Object.assign({ length: arrays[valueIndex].length }, arrays[valueIndex]), options) + ")";
        }

        if (type === 'U') {
            return 'undefined'
        }

        if (type === 'I') {
            return infinities[valueIndex];
        }

        if (type === 'B') {
            return "BigInt(\"" + bigInts[valueIndex] + "\")";
        }

        if (type === 'L') {
            var urlStr = urls[valueIndex].toString();
            if (typeof urlStr !== 'string') {
                throw new TypeError('URL.toString() must return a string');
            }
            return "new URL(" + serialize(urlStr, options) + ")";
        }

        var fn = functions[valueIndex];

        return serializeFunc(fn, options);
    });
}
