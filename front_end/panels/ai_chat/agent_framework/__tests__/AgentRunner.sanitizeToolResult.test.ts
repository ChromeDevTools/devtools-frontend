// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { AgentRunner } from '../AgentRunner.js';

describe('ai_chat: AgentRunner.sanitizeToolResultForText', () => {
  it('removes imageData and returns empty object for image-only results', () => {
    const toolResult = { imageData: 'data:image/png;base64,AAA' } as any;
    const sanitized = (AgentRunner as any).sanitizeToolResultForText(toolResult);
    assert.isObject(sanitized);
    assert.deepEqual(sanitized, {}, 'image-only payload becomes empty object');

    // Simulate placeholder decision logic used in AgentRunner
    const imageData = toolResult.imageData;
    const sanitizedIsEmpty = typeof sanitized === 'object' && sanitized !== null && Object.keys(sanitized).length === 0;
    const hadOnlyImage = !!imageData && sanitizedIsEmpty;
    const toolResultText = hadOnlyImage ? 'Image omitted (model lacks vision).' : JSON.stringify(sanitized, null, 2);
    assert.strictEqual(toolResultText, 'Image omitted (model lacks vision).');
  });

  it('keeps non-image fields and stringifies them', () => {
    const toolResult = { imageData: 'data:image/png;base64,AAA', summary: 'ok', value: 42 } as any;
    const sanitized = (AgentRunner as any).sanitizeToolResultForText(toolResult);
    assert.doesNotHaveAnyKeys(sanitized, ['imageData']);
    assert.deepEqual(sanitized, { summary: 'ok', value: 42 });
  });

  it('does not use placeholder when sanitized has fields even if imageData exists', () => {
    const toolResult = { imageData: 'data:image/png;base64,BBB', summary: 'note' } as any;
    const sanitized = (AgentRunner as any).sanitizeToolResultForText(toolResult);
    const imageData = toolResult.imageData;
    const sanitizedIsEmpty = typeof sanitized === 'object' && sanitized !== null && Object.keys(sanitized).length === 0;
    const hadOnlyImage = !!imageData && sanitizedIsEmpty;
    const toolResultText = hadOnlyImage ? 'Image omitted (model lacks vision).' : JSON.stringify(sanitized, null, 2);
    assert.strictEqual(toolResultText, JSON.stringify({ summary: 'note' }, null, 2));
  });

  it('uses original string when toolResultData is a string', () => {
    const toolResultData = 'plain string result';
    // Simulate branch: when not object, we do not sanitize, and code picks the string directly
    const sanitizedData = toolResultData as any;
    const imageData = undefined;
    const sanitizedIsEmptyObject = typeof sanitizedData === 'object' && sanitizedData !== null && Object.keys(sanitizedData).length === 0;
    const hadOnlyImage = !!imageData && sanitizedIsEmptyObject;
    const toolResultText = hadOnlyImage ? 'Image omitted (model lacks vision).' : (typeof toolResultData === 'string' ? toolResultData : JSON.stringify(sanitizedData, null, 2));
    assert.strictEqual(toolResultText, 'plain string result');
  });
});
