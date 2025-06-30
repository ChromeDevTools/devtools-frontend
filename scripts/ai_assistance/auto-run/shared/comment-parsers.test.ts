// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Tests for parts of the AI Assistance auto-run script.
 * NOTE: these are not run on CQ but exist to help you locally.
 * Run these with `npm run auto-run:test` from `scripts/ai_assistance` folder.
 */
import {assert} from 'chai';

import {parseComment, parseFollowUps} from './comment-parsers.ts';

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
      Insight: LCP breakdown
    `;
    const result = parseComment(input);
    assert.deepEqual(result, {
      prompt: 'Is the contrast between the text and the background sufficient?',
      explanation: 'The text on this element has low contrast which is not sufficient for accessibility',
      insight: 'LCP breakdown'
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

describe('parseFollowUps', () => {
  it('should return an empty array when no followup keys exist', () => {
    const comment = {
      prompt: 'Test prompt',
      explanation: 'Test explanation',
    };
    assert.deepEqual(parseFollowUps(comment), []);
  });

  it('should parse a single followup', () => {
    const comment = {
      prompt: 'Test prompt',
      followup1: 'First follow up',
    };
    assert.deepEqual(parseFollowUps(comment), ['First follow up']);
  });

  it('should parse multiple sequential followups in order', () => {
    const comment = {
      followup2: 'Second follow up',
      prompt: 'Test prompt',
      followup1: 'First follow up',
      explanation: 'Test explanation',
      followup3: 'Third follow up',
    };
    assert.deepEqual(parseFollowUps(comment), [
      'First follow up',
      'Second follow up',
      'Third follow up',
    ]);
  });

  it('should parse non-sequential followups and filter empty slots', () => {
    const comment = {
      followup3: 'Third follow up',
      prompt: 'Test prompt',
      followup1: 'First follow up',
    };
    assert.deepEqual(parseFollowUps(comment), ['First follow up', 'Third follow up']);
  });

  it('should throw an error for invalid followup keys (non-numeric index)', () => {
    const comment = {
      followup1: 'First follow up',
      followupX: 'Invalid key',
    };
    assert.throws(() => parseFollowUps(comment), 'Found invalid followup prompt: followupX, Invalid key');
  });

  it('should throw an error for invalid followup keys (no index)', () => {
    const comment = {
      followup: 'Invalid key',
      followup1: 'First follow up',
    };
    assert.throws(() => parseFollowUps(comment), /^Found invalid followup prompt: followup,/);
  });

  it('should throw an error when encountering empty string values for followups', () => {
    const comment = {
      followup1: '',
      followup2: 'Second follow up',
    };
    assert.throws(() => {
      parseFollowUps(comment);
    }, /Found empty followup value at followup1/);
  });

  it('should correctly parse followup keys with multiple digits', () => {
    const comment = {
      followup10: 'Tenth follow up',
      followup1: 'First follow up',
      followup2: 'Second follow up',
    };
    assert.deepEqual(parseFollowUps(comment), [
      'First follow up',
      'Second follow up',
      'Tenth follow up',
    ]);
  });
});
