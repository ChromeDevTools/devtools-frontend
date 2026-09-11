// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/trace-engine-test-timeouts.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('trace-engine-test-timeouts', rule, {
  valid: [
    {
      name: 'allows async regular function with TraceLoader.allModels',
      code: `it('does something', async function() {
    const data = await TraceLoader.allModels(this, 'foo.json.gz');
    })`,
      filename: 'test/unittests/folder/trace.test.ts',
    },
    {
      name: 'allows sync regular function with TraceLoader',
      code: `it('does something', function() {
    const data = TraceLoader.someNonAsyncThing();
    })`,
      filename: 'test/unittests/folder/trace.test.ts',
    },
    {
      name: 'allows sync arrow function with TraceLoader',
      code: `it('does something', () => {
    const data = TraceLoader.someNonAsyncThing();
    })`,
      filename: 'test/unittests/folder/trace.test.ts',
    },
    {
      name: 'allows beforeEach with async regular function and TraceLoader',
      code: `beforeEach(async function() {
    const data = await TraceLoader.someAsyncThing(this);
    })`,
      filename: 'test/unittests/folder/trace.test.ts',
    },
  ],

  invalid: [
    {
      name: 'disallows it with async arrow function when using TraceLoader.allModels',
      code: `it('does something', async () => {
  const data = await TraceLoader.allModels(this, 'foo.json.gz');
})`,
      filename: 'test/unittests/folder/trace.test.ts',
      errors: [{messageId: 'needsFunction'}],
      output: `it('does something', async function() {
  const data = await TraceLoader.allModels(this, 'foo.json.gz');
})`,
    },
    {
      name: 'disallows beforeEach with async arrow function when using TraceLoader',
      code: `beforeEach(async () => {
    const data = await TraceLoader.someAsyncThing(this);
    })`,
      filename: 'test/unittests/folder/trace.test.ts',
      output: `beforeEach(async function() {
    const data = await TraceLoader.someAsyncThing(this);
    })`,
      errors: [{messageId: 'needsFunction'}],
    },
  ],
});
