// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as IssuesModule from '../../../../front_end/issues/issues.js';
import {describeWithEnvironment} from '../helpers/EnvironmentHelpers.js';
import {IssueKind} from '../../../../front_end/sdk/Issue.js';

const {assert} = chai;

describeWithEnvironment('createIssueDescriptionFromMarkdown', async () => {
  let Issues: typeof IssuesModule;
  before(async () => {
    Issues = await import('../../../../front_end/issues/issues.js');
  });

  const emptyMarkdownDescription = {
    file: '<unused>',
    substitutions: undefined,
    issueKind: IssueKind.BreakingChange,
    links: [],
  };

  it('only accepts Markdown where the first AST element is a heading, describing the title', () => {
    const validIssueDescription = '# Title for the issue\n\n...and some text describing the issue.';

    const description = Issues.MarkdownIssueDescription.createIssueDescriptionFromRawMarkdown(
        validIssueDescription, emptyMarkdownDescription);
    assert.strictEqual(description.title, 'Title for the issue');
  });

  it('throws an error for issue description without a heading', () => {
    const invalidIssueDescription = 'Just some text, but the heading is missing!';

    assert.throws(
        () => Issues.MarkdownIssueDescription.createIssueDescriptionFromRawMarkdown(
            invalidIssueDescription, emptyMarkdownDescription));
  });
});

describeWithEnvironment('substitutePlaceholders', async () => {
  let Issues: typeof IssuesModule;
  before(async () => {
    Issues = await import('../../../../front_end/issues/issues.js');
  });

  it('returns the input as-is, with no placeholders present in the input', () => {
    const str = 'Example string with no placeholders';

    assert.strictEqual(Issues.MarkdownIssueDescription.substitutePlaceholders(str), str);
  });

  it('subsitutes a single placeholder', () => {
    const str = 'Example string with a single {PLACEHOLDER_placeholder}';

    const actual = Issues.MarkdownIssueDescription.substitutePlaceholders(
        str, new Map<string, string>([['PLACEHOLDER_placeholder', 'fooholder']]));
    assert.strictEqual(actual, 'Example string with a single fooholder');
  });

  it('substitutes multiple placeholders', () => {
    const str = 'Example string with two placeholders, \'{PLACEHOLDER_ph1}\' and \'{PLACEHOLDER_ph2}\'.';

    const actual = Issues.MarkdownIssueDescription.substitutePlaceholders(
        str, new Map<string, string>([['PLACEHOLDER_ph1', 'foo'], ['PLACEHOLDER_ph2', 'bar']]));
    assert.strictEqual(actual, 'Example string with two placeholders, \'foo\' and \'bar\'.');
  });

  it('throws an error for placeholders that don\'t have a replacement in the map', () => {
    const str = 'Example string where a replacement for {PLACEHOLDER_placeholder} is not provided.';

    assert.throws(() => Issues.MarkdownIssueDescription.substitutePlaceholders(str));
  });

  it('ignores placeholder syntax where the placeholder doesn\'t have the PLACEHOLDER prefix', () => {
    const str = 'Example string with a {placeholder} that must be ignored.';

    assert.strictEqual(Issues.MarkdownIssueDescription.substitutePlaceholders(str), str);
  });
});
