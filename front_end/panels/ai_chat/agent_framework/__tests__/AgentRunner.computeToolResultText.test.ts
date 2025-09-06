// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { AgentRunner } from '../AgentRunner.js';

describe('ai_chat: AgentRunner.computeToolResultText', () => {
  it('returns placeholder when sanitized is empty and imageData exists', () => {
    const toolResult = { imageData: 'data:image/png;base64,AAA' } as any;
    const out = AgentRunner.computeToolResultText(toolResult, toolResult.imageData);
    assert.strictEqual(out, 'Image omitted (model lacks vision).');
  });

  it('returns JSON string of sanitized when other fields exist even if imageData exists', () => {
    const toolResult = { imageData: 'data:image/png;base64,BBB', note: 'hello', value: 1 } as any;
    const out = AgentRunner.computeToolResultText(toolResult, toolResult.imageData);
    assert.strictEqual(out, JSON.stringify({ note: 'hello', value: 1 }, null, 2));
  });

  it('returns original string when toolResultData is a string', () => {
    const out = AgentRunner.computeToolResultText('plain string result');
    assert.strictEqual(out, 'plain string result');
  });

  it('returns {} JSON for empty sanitized object when no imageData provided', () => {
    const toolResult = { imageData: 'data:image/png;base64,CCC' } as any;
    const out = AgentRunner.computeToolResultText(toolResult, undefined);
    assert.strictEqual(out, '{}');
  });
});

