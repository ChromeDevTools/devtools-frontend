// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import logicalAssignment from '../third_party/acorn-logical-assignment/package/dist/acorn-logical-assignment.mjs';
import numericSeparator from '../third_party/acorn-numeric-separator/package/dist/acorn-numeric-separator.mjs';
import * as acorn from '../third_party/acorn/package/dist/acorn.mjs';

// There are a couple of issues faced when trying to closure compiler to
// recognize this, aliasing acorn from the third_party doesn't work correctly.
// Possibly related bug https://github.com/google/closure-compiler/issues/2257.
// As a result we have to re-export types/functions, so that users can import
// this file and get the correct types. Also note that if there were issues
// faced when trying to export with rename, like so:
// ```
// const CustomAcorn = {
//   ...acorn,
//   Parser: ExtendedParser
// }
// export { CustomAcorn as Acorn }
// ```
// Would cause type check failures in the callers.

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
