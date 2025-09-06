// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { sanitizeMessagesForModel } from '../MessageSanitizer.js';
import type { LLMMessage } from '../LLMTypes.js';

describe('ai_chat: MessageSanitizer', () => {
  it('returns deep-cloned messages when vision is supported', () => {
    const input: LLMMessage[] = [
      { role: 'user', content: [
        { type: 'text', text: 'See this' },
        { type: 'image_url', image_url: { url: 'data:image/png;base64,abc' } },
      ] },
    ];

    const out = sanitizeMessagesForModel(input, { visionCapable: true, placeholderForImageOnly: true });
    assert.deepEqual(out, input, 'content preserved for vision-capable models');
    assert.notStrictEqual(out, input, 'messages are deep-cloned, not same reference');
  });

  it('strips images for non-vision models and keeps text', () => {
    const input: LLMMessage[] = [
      { role: 'user', content: [
        { type: 'text', text: 'Hello' },
        { type: 'image_url', image_url: { url: 'http://example.com/img.png' } },
      ] },
    ];

    const out = sanitizeMessagesForModel(input, { visionCapable: false, placeholderForImageOnly: true });
    assert.strictEqual(out[0].role, 'user');
    assert.strictEqual(typeof out[0].content, 'string');
    assert.strictEqual(out[0].content, 'Hello', 'text content preserved as plain string');
  });

  it('replaces image-only content with placeholder text array when requested', () => {
    const input: LLMMessage[] = [
      { role: 'user', content: [
        { type: 'image_url', image_url: { url: 'data:image/png;base64,abc' } },
      ] },
    ];

    const out = sanitizeMessagesForModel(input, { visionCapable: false, placeholderForImageOnly: true });
    assert.isArray(out[0].content, 'content becomes an array with text part');
    const parts = out[0].content as any[];
    assert.lengthOf(parts, 1);
    assert.strictEqual(parts[0].type, 'text');
    assert.strictEqual(parts[0].text, 'Image omitted (model lacks vision).');
  });

  it('collapses single text part to string', () => {
    const input: LLMMessage[] = [
      { role: 'user', content: [{ type: 'text', text: 'Only text' }] },
    ];
    const out = sanitizeMessagesForModel(input, { visionCapable: false, placeholderForImageOnly: true });
    assert.strictEqual(out[0].content, 'Only text');
  });

  it('produces empty string for image-only content if no placeholder requested', () => {
    const input: LLMMessage[] = [
      { role: 'user', content: [
        { type: 'image_url', image_url: { url: 'data:image/png;base64,abc' } },
      ] },
    ];

    const out = sanitizeMessagesForModel(input, { visionCapable: false, placeholderForImageOnly: false });
    assert.strictEqual(out[0].content, '');
  });
});

