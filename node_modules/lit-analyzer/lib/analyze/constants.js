"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_RUNNING_TIME_PER_OPERATION = exports.VERSION = exports.TS_IGNORE_FLAG = exports.DIAGNOSTIC_SOURCE = exports.LIT_HTML_ATTRIBUTE_MODIFIERS = exports.LIT_HTML_EVENT_LISTENER_ATTRIBUTE_MODIFIER = exports.LIT_HTML_BOOLEAN_ATTRIBUTE_MODIFIER = exports.LIT_HTML_PROP_ATTRIBUTE_MODIFIER = void 0;
exports.LIT_HTML_PROP_ATTRIBUTE_MODIFIER = ".";
exports.LIT_HTML_BOOLEAN_ATTRIBUTE_MODIFIER = "?";
exports.LIT_HTML_EVENT_LISTENER_ATTRIBUTE_MODIFIER = "@";
exports.LIT_HTML_ATTRIBUTE_MODIFIERS = [
    exports.LIT_HTML_PROP_ATTRIBUTE_MODIFIER,
    exports.LIT_HTML_BOOLEAN_ATTRIBUTE_MODIFIER,
    exports.LIT_HTML_EVENT_LISTENER_ATTRIBUTE_MODIFIER
];
exports.DIAGNOSTIC_SOURCE = "lit-plugin";
exports.TS_IGNORE_FLAG = "@ts-ignore";
exports.VERSION = "2.0.3";
exports.MAX_RUNNING_TIME_PER_OPERATION = 150; // Default to small timeouts. Opt in to larger timeouts where necessary.
