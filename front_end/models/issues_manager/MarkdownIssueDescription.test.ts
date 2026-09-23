// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as IssuesManager from '../issues_manager/issues_manager.js';

describe('createIssueDescriptionFromMarkdown', () => {
  it('only accepts Markdown where the first AST element is a heading, describing the title', () => {
    const emptyMarkdownDescription = {
      file: '<unused>',
      links: [],
    };

    const validIssueDescription = '# Title for the issue\n\n...and some text describing the issue.';

    const description = IssuesManager.MarkdownIssueDescription.createIssueDescriptionFromRawMarkdown(
        validIssueDescription, emptyMarkdownDescription);
    assert.strictEqual(description.title, 'Title for the issue');
  });

  it('throws an error for issue description without a heading', () => {
    const emptyMarkdownDescription = {
      file: '<unused>',
      links: [],
    };

    const invalidIssueDescription = 'Just some text, but the heading is missing!';

    assert.throws(
        () => IssuesManager.MarkdownIssueDescription.createIssueDescriptionFromRawMarkdown(
            invalidIssueDescription, emptyMarkdownDescription));
  });
  it('overrides the Markdown heading title with description.title while still validating that a heading exists', () => {
    const descriptionWithTitle = {
      file: '<unused>',
      title: 'Custom localized title',
      links: [],
    };

    const validIssueDescription = '# Markdown Heading\n\n...and some text describing the issue.';
    const description = IssuesManager.MarkdownIssueDescription.createIssueDescriptionFromRawMarkdown(
        validIssueDescription, descriptionWithTitle);
    assert.strictEqual(description.title, 'Custom localized title');

    const invalidIssueDescription = 'Just some text, but the heading is missing!';
    assert.throws(() => IssuesManager.MarkdownIssueDescription.createIssueDescriptionFromRawMarkdown(
                      invalidIssueDescription, descriptionWithTitle));
  });

  it('tokenizes placeholders into AST nodes without substituting untrusted strings before Markdown lexing', () => {
    const rawMarkdown = '# Issue Title\n\nBody with {PLACEHOLDER_Untrusted}.';
    const description = IssuesManager.MarkdownIssueDescription.createIssueDescriptionFromRawMarkdown(rawMarkdown, {
      file: '<unused>',
      links: [],
      substitutions: new Map([
        ['PLACEHOLDER_Untrusted', '[Spoofed Link](https://example.com)'],
      ]),
    });

    const paragraph = description.markdown.find(t => t.type === 'paragraph');
    assert.exists(paragraph);
    const tokens = 'tokens' in paragraph && paragraph.tokens ? paragraph.tokens : [];
    assert.isTrue(tokens.some(t => t.type === 'placeholder'));
    assert.isFalse(tokens.some(t => t.type === 'link'));
  });

  it('validates placeholder names and required replacements during description creation', () => {
    assert.throws(() => {
      IssuesManager.MarkdownIssueDescription.createIssueDescriptionFromRawMarkdown(
          '# Title\n\nMissing {PLACEHOLDER_Missing}', {
            file: '<unused>',
            links: [],
            substitutions: new Map(),
          });
    }, /No replacement provided for placeholder 'PLACEHOLDER_Missing'/);

    assert.throws(() => {
      IssuesManager.MarkdownIssueDescription.createIssueDescriptionFromRawMarkdown('# Title\n\nBody', {
        file: '<unused>',
        links: [],
        substitutions: new Map([['PLACEHOLDER_Unused', 'val']]),
      });
    }, /Unused replacements provided: PLACEHOLDER_Unused/);
  });
});
