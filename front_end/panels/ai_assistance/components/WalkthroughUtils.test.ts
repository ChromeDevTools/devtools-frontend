// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as AiAssistance from '../ai_assistance.js';

describe('WalkthroughUtils', () => {
  const {getButtonLabel} = AiAssistance.WalkthroughUtils;

  describe('getButtonLabel', () => {
    it('returns the label for expanded state with widgets', () => {
      const label = getButtonLabel({
        isExpanded: true,
        isLoading: false,
        hasWidgets: true,
        prompt: 'test prompt',
      });
      expect(label).to.equal('Hide AI walkthrough for prompt \'test prompt\'');
    });

    it('returns the label for collapsed state without widgets', () => {
      const label = getButtonLabel({
        isExpanded: false,
        isLoading: true,
        hasWidgets: false,
        prompt: 'another prompt',
        stepTitle: 'Investigating XYZ',
      });
      expect(label).to.equal('Loading: Investigating XYZ');
    });

    it('returns the label for loading state without step title', () => {
      const label = getButtonLabel({
        isExpanded: false,
        isLoading: true,
        hasWidgets: false,
        prompt: 'another prompt',
      });
      expect(label).to.equal('Loading: Show thinking');
    });

    it('truncates the prompt at word boundary if over 50 chars', () => {
      // Index of last space near 50 is 54.
      const predictablePrompt = '0123456789 123456789 123456789 123456789 123456789 1';
      const label = getButtonLabel({
        isExpanded: false,
        isLoading: false,
        hasWidgets: true,
        prompt: predictablePrompt,
      });
      expect(label).to.equal(
          'Show AI walkthrough for prompt \'0123456789 123456789 123456789 123456789 123456789\' (and 2 more characters)');
    });

    it('truncates the prompt at the first space after 50 if closer', () => {
      const label = getButtonLabel({
        isExpanded: false,
        isLoading: false,
        hasWidgets: false,
        prompt: 'This is a very long prompt that has a space right after fifty characters',
      });
      expect(label).to.equal(
          'Show thinking for prompt \'This is a very long prompt that has a space right\' (and 23 more characters)');
    });

    it('works with a real long prompt', () => {
      const prompt = 'What is the LCP element of this page and how can I improve its loading performance?';
      const label = getButtonLabel({
        isExpanded: false,
        isLoading: false,
        hasWidgets: true,
        prompt,
      });
      expect(label).to.equal(
          'Show AI walkthrough for prompt \'What is the LCP element of this page and how can I\' (and 33 more characters)');
    });

    it('does not truncate if no spaces are found and it is over 50 chars (just cuts at 50)', () => {
      const prompt = 'a'.repeat(60);
      const label = getButtonLabel({
        isExpanded: false,
        isLoading: false,
        hasWidgets: false,
        prompt,
      });
      expect(label).to.equal(
          'Show thinking for prompt \'' +
          'a'.repeat(50) + '\' (and 10 more characters)');
    });
  });
});
