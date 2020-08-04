// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {createIssueDescriptionFromRawMarkdown} from '../../../../front_end/issues/MarkdownIssueDescription.js';
import {IssueKind} from '../../../../front_end/sdk/Issue.js';

const {assert} = chai;

describe('createIssueDescriptionFromMarkdown', () => {
  const emptyMarkdownDescription = {
    file: '<unused>',
    issueKind: IssueKind.BreakingChange,
    links: [],
  };

  it('only accepts Markdown where the first AST element is a heading, describing the title', () => {
    const validIssueDescription = '# Title for the issue\n\n...and some text describing the issue.';

    const description = createIssueDescriptionFromRawMarkdown(validIssueDescription, emptyMarkdownDescription);
    assert.strictEqual(description.title, 'Title for the issue');
  });

  it('throws an error for issue description without a heading', () => {
    const invalidIssueDescription = 'Just some text, but the heading is missing!';

    assert.throws(() => createIssueDescriptionFromRawMarkdown(invalidIssueDescription, emptyMarkdownDescription));
  });
});
