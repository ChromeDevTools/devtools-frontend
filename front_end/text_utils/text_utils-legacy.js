// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TextUtilsModule from './text_utils.js';

self.TextUtils = self.TextUtils || {};
TextUtils = TextUtils || {};

/** @constructor */
TextUtils.Text = TextUtilsModule.Text.Text;

/** @constructor */
TextUtils.TextCursor = TextUtilsModule.TextCursor.TextCursor;

/** @constructor */
TextUtils.TextRange = TextUtilsModule.TextRange.TextRange;

/** @constructor */
TextUtils.SourceRange = TextUtilsModule.TextRange.SourceRange;

/** @constructor */
TextUtils.SourceEdit = TextUtilsModule.TextRange.SourceEdit;

TextUtils.TextUtils = TextUtilsModule.TextUtils.Utils;

/** @constructor */
TextUtils.FilterParser = TextUtilsModule.TextUtils.FilterParser;

/** @constructor */
TextUtils.BalancedJSONTokenizer = TextUtilsModule.TextUtils.BalancedJSONTokenizer;

/** @interface */
TextUtils.TokenizerFactory = TextUtilsModule.TextUtils.TokenizerFactory;

TextUtils.isMinified = TextUtilsModule.TextUtils.isMinified;

/** @typedef {{lineNumber: number, columnNumber: number}} */
TextUtils.Text.Position;

/** @typedef {{key:(string|undefined), text:(?string|undefined), regex:(!RegExp|undefined), negative:boolean}} */
TextUtils.FilterParser.ParsedFilter;
