// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type * as Protocol from '../../generated/protocol.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as ProtocolClient from '../protocol_client/protocol_client.js';

import * as SDK from './sdk.js';

describeWithEnvironment('CrashReportContextModel', () => {
  let model: SDK.CrashReportContextModel.CrashReportContextModel;
  let universe: TestUniverse;
  let connection: MockCDPConnection;

  beforeEach(() => {
    universe = new TestUniverse();
    connection = new MockCDPConnection();
    const target = universe.createTarget({connection});
    model = target.model(SDK.CrashReportContextModel.CrashReportContextModel)!;
    assert.exists(model);
  });

  it('can retrieve entries', async () => {
    const frameId = 'frame-1' as Protocol.Page.FrameId;
    connection.setSuccessHandler('CrashReportContext.getEntries', () => {
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
    connection.setSuccessHandler('CrashReportContext.getEntries', () => {
      return {
        entries: [],
      };
    });

    const entries = await model.getEntries();
    assert.exists(entries);
    assert.lengthOf(entries, 0);
  });

  it('returns null on protocol error', async () => {
    connection.setFailureHandler('CrashReportContext.getEntries', () => {
      return {
        message: 'Feature disabled',
        code: ProtocolClient.CDPConnection.CDPErrorStatus.DEVTOOLS_STUB_ERROR,
      };
    });

    const entries = await model.getEntries();
    assert.isNull(entries);
  });
});
