// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/canvas-context-tracking.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('canvas-context-tracking-test', rule, {
  valid: [
    {
      code: `function renderCanvas() {
  context.save();
  context.fillRect(0, 0, 100, 100);
  context.restore()
}`,
      filename: 'perf_ui/flamechart.js',
    },
    {
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
      code: `function renderCanvas() {
  context.save();
  context.fillRect(0, 0, 100, 100);
  // Missing a context.restore()
}`,
      filename: 'perf_ui/flamechart.js',
      errors: [{messageId: 'saveNotRestored'}],
    },
    {
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
      code: `function renderCanvas() {
  // Missing a context.save()
  context.fillRect(0, 0, 100, 100);
  context.restore()
}`,
      filename: 'perf_ui/flamechart.js',
      errors: [{messageId: 'uselessRestore'}],
    },
    {
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
