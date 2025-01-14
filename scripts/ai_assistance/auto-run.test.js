// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Tests for parts of the AI Assistance auto-run script.
 * NOTE: these are not run on CQ but exist to help you locally.
 * Run these with `npx mocha scripts/ai_assistance/auto-run.test.js`
 */

const {assert} = require('chai');
const {parseComment} = require('./auto-run-helpers.js');

describe('parsing comments', () => {
  it('parses out the prompt and evaluation sections using the "old" syntax', () => {
    const input = `
  Is the contrast between the text and the background sufficient?
  # The text on this element has low contrast which is not sufficient for accessibility
    `;
    const result = parseComment(input);
    assert.deepEqual(result, {
      prompt: 'Is the contrast between the text and the background sufficient?',
      explanation: 'The text on this element has low contrast which is not sufficient for accessibility'
    });
  });

  it('parses multi-line inputs using the "old" syntax', () => {
    const input = `
  A
  B
  # C
  D
    `;
    const result = parseComment(input);
    assert.deepEqual(result, {prompt: 'A\nB', explanation: 'C\nD'});
  });

  it('parses out the prompt and explanation using the new syntax', () => {
    const input = `
      Prompt: Is the contrast between the text and the background sufficient?
      Explanation: The text on this element has low contrast which is not sufficient for accessibility
    `;
    const result = parseComment(input);
    assert.deepEqual(result, {
      prompt: 'Is the contrast between the text and the background sufficient?',
      explanation: 'The text on this element has low contrast which is not sufficient for accessibility'
    });
  });

  it('parses out any other key/values', () => {
    const input = `
      Prompt: Is the contrast between the text and the background sufficient?
      Explanation: The text on this element has low contrast which is not sufficient for accessibility
      Insight: LCP by phase
    `;
    const result = parseComment(input);
    assert.deepEqual(result, {
      prompt: 'Is the contrast between the text and the background sufficient?',
      explanation: 'The text on this element has low contrast which is not sufficient for accessibility',
      insight: 'LCP by phase'
    });
  });

  it('deals with values over multiple lines in the prompt', () => {
    const input = `
      Prompt: A
      B
      Explanation: C
    `;
    const result = parseComment(input);
    assert.deepEqual(result, {
      prompt: 'A\nB',
      explanation: 'C',
    });
  });

  it('deals with values over multiple lines in any other keys and trims whitespace', () => {
    const input = `
      Prompt: A
      Explanation: B
     C
      D
    `;
    const result = parseComment(input);
    assert.deepEqual(result, {prompt: 'A', explanation: 'B\nC\nD'});
  });
});
