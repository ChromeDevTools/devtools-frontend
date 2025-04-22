// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/trace-engine-test-timeouts.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('trace-engine-test-timeouts', rule, {
  valid: [
    {
      code: `it('does something', async function() {
    const data = await TraceLoader.allModels(this, 'foo.json.gz');
    })`,
      filename: 'test/unittests/folder/trace_test.ts',
    },
    {
      code: `it('does something', function() {
    const data = TraceLoader.someNonAsyncThing();
    })`,
      filename: 'test/unittests/folder/trace_test.ts',
    },
    {
      code: `it('does something', () => {
    const data = TraceLoader.someNonAsyncThing();
    })`,
      filename: 'test/unittests/folder/trace_test.ts',
    },
    {
      code: `beforeEach(async function() {
    const data = await TraceLoader.someAsyncThing(this);
    })`,
      filename: 'test/unittests/folder/trace_test.ts',
    },
  ],

  invalid: [
    {
      code: `it('does something', async () => {
  const data = await TraceLoader.allModels(this, 'foo.json.gz');
})`,
      filename: 'test/unittests/folder/trace_test.ts',
      errors: [{messageId: 'needsFunction'}],
      output: `it('does something', async function() {
  const data = await TraceLoader.allModels(this, 'foo.json.gz');
})`,
    },
    {
      code: `beforeEach(async () => {
    const data = await TraceLoader.someAsyncThing(this);
    })`,
      filename: 'test/unittests/folder/trace_test.ts',
      output: `beforeEach(async function() {
    const data = await TraceLoader.someAsyncThing(this);
    })`,
      errors: [{messageId: 'needsFunction'}],
    },
  ],
});
