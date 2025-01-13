// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Tests for parts of the AI Assistance auto-run script.
 * NOTE: these are not run on CQ but exist to help you locally.
 * Run these with `npx mocha scripts/ai_assistance/auto-run.test.js`
 */

const {assert} = require('chai');
const {splitComment} = require('./auto-run-helpers.js');

describe('parsing comments', () => {
  it('parses out the prompt and evaluation sections', () => {
    const input = `
  Is the contrast between the text and the background sufficient?
  # The text on this element has low contrast which is not sufficient for accessibility
    `;
    const result = splitComment(input);
    assert.deepEqual(result, {
      question: 'Is the contrast between the text and the background sufficient?',
      answer: 'The text on this element has low contrast which is not sufficient for accessibility'

    });
  });
});
