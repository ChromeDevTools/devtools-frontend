// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {SnapshotTester} from '../../../testing/SnapshotTester.js';
import * as Models from '../models/models.js';

import * as Converters from './converters.js';

describe('PuppeteerReplayConverter', function() {
  const snapshotTester = new SnapshotTester(this, import.meta);
  it('should stringify a flow', async function() {
    const converter = new Converters.PuppeteerReplayConverter.PuppeteerReplayConverter('  ');
    const [result, sourceMap] = await converter.stringify({
      title: 'test',
      steps: [{type: Models.Schema.StepType.Scroll, selectors: [['.cls']]}],
    });
    snapshotTester.assert(this, result);
    assert.deepEqual(sourceMap, [1, 8, 8]);
  });

  it('should stringify a step', async function() {
    const converter = new Converters.PuppeteerReplayConverter.PuppeteerReplayConverter('  ');
    const result = await converter.stringifyStep({
      type: Models.Schema.StepType.Scroll,
    });
    snapshotTester.assert(this, result);
  });
});
