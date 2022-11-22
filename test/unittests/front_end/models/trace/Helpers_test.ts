// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceModel from '../../../../../front_end/models/trace/trace.js';

const {assert} = chai;

import {loadModelDataFromTraceFile} from '../../helpers/TraceHelpers.js';

describe('TraceModel helpers', async () => {
  describe('extractOriginFromTrace', () => {
    it('extracts the origin of a parsed trace correctly', async () => {
      const model = await loadModelDataFromTraceFile('web-dev.json.gz');
      const origin = TraceModel.Helpers.extractOriginFromTrace(model);
      assert.strictEqual(origin, 'web.dev');
    });

    it('will remove the `www` if it is present', async () => {
      const traceEvents = await loadModelDataFromTraceFile('multiple-navigations.json.gz');
      const origin = TraceModel.Helpers.extractOriginFromTrace(traceEvents);
      assert.strictEqual(origin, 'google.com');
    });

    it('returns null when no origin is found', async () => {
      const traceEvents = await loadModelDataFromTraceFile('basic.json.gz');
      const origin = TraceModel.Helpers.extractOriginFromTrace(traceEvents);
      assert.isNull(origin);
    });
  });
});
