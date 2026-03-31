// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection, setMockConnectionResponseHandler} from '../../testing/MockConnection.js';

import * as SDK from './sdk.js';

describeWithMockConnection('CrashReportContextModel', () => {
  let model: SDK.CrashReportContextModel.CrashReportContextModel;

  beforeEach(() => {
    const target = createTarget();
    model = target.model(SDK.CrashReportContextModel.CrashReportContextModel)!;
    assert.exists(model);
  });

  it('can retrieve entries', async () => {
    const frameId = 'frame-1' as Protocol.Page.FrameId;
    setMockConnectionResponseHandler('CrashReportContext.getEntries', () => {
      return {
        entries: [
          {key: 'key1', value: 'value1', frameId},
          {key: 'key2', value: 'value2', frameId},
        ],
      };
    });

    const entries = await model.getEntries();
    assert.exists(entries);
    assert.lengthOf(entries, 2);
    assert.strictEqual(entries[0].key, 'key1');
    assert.strictEqual(entries[0].value, 'value1');
    assert.strictEqual(entries[0].frameId, 'frame-1');
    assert.strictEqual(entries[1].key, 'key2');
    assert.strictEqual(entries[1].value, 'value2');
    assert.strictEqual(entries[1].frameId, 'frame-1');
  });

  it('handles empty entries', async () => {
    setMockConnectionResponseHandler('CrashReportContext.getEntries', () => {
      return {
        entries: [],
      };
    });

    const entries = await model.getEntries();
    assert.exists(entries);
    assert.lengthOf(entries, 0);
  });

  it('returns null on protocol error', async () => {
    setMockConnectionResponseHandler('CrashReportContext.getEntries', () => {
      return {
        getError: () => 'Feature disabled',
      };
    });

    const entries = await model.getEntries();
    assert.isNull(entries);
  });
});
