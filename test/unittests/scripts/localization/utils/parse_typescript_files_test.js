// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * TODO(jacktfranklin): these tests currently do not run automatically on any infrastructure
 * but will do soon in a future CL
 * in the mean time you can run them locally via:
 * npx mocha test/unittests/scripts/localization/utils/parse_typescript_files_test.js
 */

const {
  parseLocalizableStringFromTypeScriptFile,
} = require('../../../../../scripts/localization/utils/parse_typescript_files');

const {assert} = require('chai');
const path = require('path');

describe('parsing localization from typescript source', () => {
  it('returns an empty array if there are no ls usages', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'no-ls.ts');
    const result = await parseLocalizableStringFromTypeScriptFile(filePath);
    assert.deepEqual(result, []);
  });

  it('finds and returns basic ls usages', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'basic-ls.ts');
    const result = await parseLocalizableStringFromTypeScriptFile(filePath);
    assert.deepEqual(result, [{
                       cooked: 'blah blah',
                       code: 'ls`blah blah`',
                       filePath: path.resolve(filePath),
                       loc: {
                         start: {
                           line: 1,
                           column: 9,
                         },
                         end: {
                           line: 1,
                           column: 22,
                         }
                       },
                       parsedArguments: [],
                     }]);
  });

  it('returns the correct results for ls calls with a single expression', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'ls-with-expression.ts');
    const result = await parseLocalizableStringFromTypeScriptFile(filePath);
    assert.deepEqual(result, [{
                       cooked: 'blah blah %s',
                       code: 'ls`blah blah ${x}`',
                       filePath: path.resolve(filePath),
                       loc: {
                         start: {
                           line: 2,
                           column: 9,
                         },
                         end: {
                           line: 2,
                           column: 27,
                         }
                       },
                       parsedArguments: ['x']
                     }]);
  });

  it('deals with an ls that has multiple expressions', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'ls-with-multiple-expressions.ts');
    const result = await parseLocalizableStringFromTypeScriptFile(filePath);
    assert.deepEqual(result, [{
                       cooked: 'blah blah %s and %s, %s',
                       code: 'ls`blah blah ${x} and ${y}, ${z}`',
                       filePath: path.resolve(filePath),
                       loc: {
                         start: {
                           line: 4,
                           column: 9,
                         },
                         end: {
                           line: 4,
                           column: 42,
                         }
                       },
                       parsedArguments: ['x', 'y', 'z']
                     }]);
  });

  it('deals with an ls that has a function call', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'ls-with-function-calls.ts');
    const result = await parseLocalizableStringFromTypeScriptFile(filePath);
    assert.deepEqual(result, [{
                       cooked: 'blah blah %s',
                       code: 'ls`blah blah ${x(1)}`',
                       filePath: path.resolve(filePath),
                       loc: {
                         start: {
                           line: 2,
                           column: 9,
                         },
                         end: {
                           line: 2,
                           column: 30,
                         }
                       },
                       parsedArguments: ['x(1)']
                     }]);
  });
});
