// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FormatterModule from './formatter.js';

self.Formatter = self.Formatter || {};
Formatter = Formatter || {};

/** @constructor */
Formatter.FormatterWorkerPool = FormatterModule.FormatterWorkerPool.FormatterWorkerPool;

Formatter.formatterWorkerPool = FormatterModule.FormatterWorkerPool.formatterWorkerPool;

/** @interface */
Formatter.Formatter = FormatterModule.ScriptFormatter.FormatterInterface;

/** @constructor */
Formatter.ScriptFormatter = FormatterModule.ScriptFormatter.ScriptFormatter;

/** @interface */
Formatter.FormatterSourceMapping = FormatterModule.ScriptFormatter.FormatterSourceMapping;

/** @constructor */
Formatter.SourceFormatter = FormatterModule.SourceFormatter.SourceFormatter;

/** @type {!Formatter.SourceFormatter} */
Formatter.sourceFormatter = FormatterModule.sourceFormatter;

/** @typedef {{original: !Array<number>, formatted: !Array<number>}} */
Formatter.FormatterWorkerPool.FormatMapping;

/** @typedef {{line: number, column: number, title: string, subtitle: (string|undefined) }} */
Formatter.FormatterWorkerPool.OutlineItem;

/**
 * @typedef {{atRule: string, lineNumber: number, columnNumber: number}}
 */
Formatter.FormatterWorkerPool.CSSAtRule;

/**
 * @typedef {(CSSStyleRule|Formatter.FormatterWorkerPool.CSSAtRule)}
 */
Formatter.FormatterWorkerPool.CSSRule;

/**
 * @typedef {{startLine: number, startColumn: number, endLine: number, endColumn: number}}
 */
Formatter.FormatterWorkerPool.TextRange;
