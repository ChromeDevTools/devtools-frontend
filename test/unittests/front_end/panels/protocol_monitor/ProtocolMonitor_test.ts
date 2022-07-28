// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as ProtocolMonitor from '../../../../../front_end/panels/protocol_monitor/protocol_monitor.js';

describe('ProtocolMonitor', () => {
  it('parses various JSON formats', async () => {
    const input = {
      command: 'Input.dispatchMouseEvent',
      parameters: {parameter1: 'value1'},
    };

    // "command" variations.
    assert.deepStrictEqual(
        ProtocolMonitor.ProtocolMonitor.parseCommandInput(JSON.stringify({
          command: input.command,
          parameters: input.parameters,
        })),
        input);
    assert.deepStrictEqual(
        ProtocolMonitor.ProtocolMonitor.parseCommandInput(JSON.stringify({
          cmd: input.command,
          parameters: input.parameters,
        })),
        input);
    assert.deepStrictEqual(
        ProtocolMonitor.ProtocolMonitor.parseCommandInput(JSON.stringify({
          method: input.command,
          parameters: input.parameters,
        })),
        input);

    // "parameters" variations.
    assert.deepStrictEqual(
        ProtocolMonitor.ProtocolMonitor.parseCommandInput(JSON.stringify({
          command: input.command,
          params: input.parameters,
        })),
        input);
    assert.deepStrictEqual(
        ProtocolMonitor.ProtocolMonitor.parseCommandInput(JSON.stringify({
          cmd: input.command,
          args: input.parameters,
        })),
        input);
    assert.deepStrictEqual(
        ProtocolMonitor.ProtocolMonitor.parseCommandInput(JSON.stringify({
          method: input.command,
          arguments: input.parameters,
        })),
        input);
  });

  it('parses non-JSON data as a command name', async () => {
    assert.deepStrictEqual(ProtocolMonitor.ProtocolMonitor.parseCommandInput('Input.dispatchMouseEvent'), {
      command: 'Input.dispatchMouseEvent',
      parameters: null,
    });
  });
});
