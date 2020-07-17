// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import logicalAssignment from '../acorn-logical-assignment/package/dist/acorn-logical-assignment.mjs';
import numericSeparator from '../acorn-numeric-separator/package/dist/acorn-numeric-separator.mjs';
import * as acorn from './package/dist/acorn.mjs';

// Extensions return a new Parser class (no mutation).
const ExtendedParser = acorn.Parser.extend(logicalAssignment, numericSeparator);

/**
 * @typedef {acorn.Token}
 */
// @ts-ignore typedef
export let Token;

/**
 * @typedef {acorn.Comment}
 */
// @ts-ignore typedef
export let Comment;

export const tokTypes = acorn.tokTypes;

export const Parser = ExtendedParser;

export const tokenizer = ExtendedParser.tokenizer.bind(ExtendedParser);

export const parse = ExtendedParser.parse.bind(ExtendedParser);
