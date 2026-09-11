// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/canvas-context-tracking.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('canvas-context-tracking-test', rule, {
  valid: [
    {
      name: 'allows matched context save and restore in function',
      code: `function renderCanvas() {
  context.save();
  context.fillRect(0, 0, 100, 100);
  context.restore()
}`,
      filename: 'perf_ui/flamechart.js',
    },
    {
      name: 'allows matched context save and restore within for-of loop',
      code: `function renderCanvas() {
  context.save();
  for(const event of events) {
    context.save()
    context.fillRect(0, 0, 100, 100);
    context.restore()
  }
  context.restore();
}`,
      filename: 'perf_ui/flamechart.js',
    },
    {
      name: 'allows matched save and restore with inner loop',
      code: `function renderCanvas() {
  context.save();
  for(const event of events) {
    context.save()
    context.fillRect(0, 0, 100, 100);
    for(const x of y) {
      context.fillRect(0, 0, 100, 100);
    }
    context.restore()
  }
  context.restore();
}`,
      filename: 'perf_ui/flamechart.js',
    },
    {
      name: 'allows nested save and restore in nested loops',
      code: `function renderCanvas() {
  context.save();
  for(const event of events) {
    context.save()
    context.fillRect(0, 0, 100, 100);
    for(const x of y) {
      context.save()
      context.fillRect(0, 0, 100, 100);
      context.restore()
    }
    context.restore()
  }
  context.restore();
}`,
      filename: 'perf_ui/flamechart.js',
    },
  ],

  invalid: [
    {
      name: 'disallows missing context.restore after context.save',
      code: `function renderCanvas() {
  context.save();
  context.fillRect(0, 0, 100, 100);
  // Missing a context.restore()
}`,
      filename: 'perf_ui/flamechart.js',
      errors: [{messageId: 'saveNotRestored'}],
    },
    {
      name: 'disallows restore before save',
      code: `function renderCanvas() {
  // Restore and save are the wrong way round
  context.restore()
  context.fillRect(0, 0, 100, 100);
  context.save();
}`,
      filename: 'perf_ui/flamechart.js',
      errors: [
        {messageId: 'uselessRestore'},
        {messageId: 'saveNotRestored'},
      ],
    },
    {
      name: 'disallows context.restore without preceding context.save',
      code: `function renderCanvas() {
  // Missing a context.save()
  context.fillRect(0, 0, 100, 100);
  context.restore()
}`,
      filename: 'perf_ui/flamechart.js',
      errors: [{messageId: 'uselessRestore'}],
    },
    {
      name: 'disallows unclosed context.save inside for-of loop',
      code: `function renderCanvas() {
  context.save();
  for(const event of events) {
    context.save()
    context.fillRect(0, 0, 100, 100);
    // Missing a context.restore()
  }
  context.restore();
}`,
      filename: 'perf_ui/flamechart.js',
      errors: [{messageId: 'saveNotRestored'}],
    },
    {
      name: 'disallows unclosed context.save inside for-in loop',
      code: `function renderCanvas() {
  context.save();
  for(const event in events) {
    context.save()
    context.fillRect(0, 0, 100, 100);
    // Missing a context.restore()
  }
  context.restore();
}`,
      filename: 'perf_ui/flamechart.js',
      errors: [{messageId: 'saveNotRestored'}],
    },
  ],
});
