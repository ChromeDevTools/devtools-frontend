// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Marked from '../marked/marked.js';
import * as Root from '../root/root.js';
import * as SDK from '../sdk/sdk.js';

import {MarkdownView} from './MarkdownView.js';

export function createIssueDescriptionFromMarkdown(description: SDK.Issue.MarkdownIssueDescription):
    SDK.Issue.IssueDescription {
  const rawMarkdown = getMarkdownFileContent(description.file);
  return createIssueDescriptionFromRawMarkdown(rawMarkdown, description);
}

function getMarkdownFileContent(filename: string): string {
  const rawMarkdown = Root.Runtime.cachedResources.get(filename);
  if (!rawMarkdown) {
    throw new Error(`Markdown file ${filename} not found. Declare it as a resource in the module.json file`);
  }
  return rawMarkdown;
}

/**
 * This function is exported separately for unit testing.
 */
export function createIssueDescriptionFromRawMarkdown(
    markdown: string, description: SDK.Issue.MarkdownIssueDescription): SDK.Issue.IssueDescription {
  const markdownAst = Marked.Marked.lexer(markdown);
  const title = findTitleFromMarkdownAst(markdownAst);
  if (!title) {
    throw new Error('Markdown issue descriptions must start with a heading');
  }

  const markdownComponent = new MarkdownView();
  markdownComponent.data = {tokens: markdownAst.slice(1)};
  return {
    title,
    message: () => markdownComponent,
    issueKind: SDK.Issue.IssueKind.BreakingChange,
    links: description.links,
  };
}

// TODO(crbug.com/1108699): Fix types when they are available.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findTitleFromMarkdownAst(markdownAst: any[]): string|null {
  if (markdownAst.length === 0 || markdownAst[0].type !== 'heading' || markdownAst[0].depth !== 1) {
    return null;
  }
  return markdownAst[0].text;
}
