// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../root/root.js';
import * as SDK from '../sdk/sdk.js';
import * as Marked from '../third_party/marked/marked.js';

import {MarkdownView} from './MarkdownView.js';

export interface IssueDescription {
  title: string;
  view: MarkdownView;
  issueKind: SDK.Issue.IssueKind;
  links: {link: string, linkTitle: string}[];
}

export function createIssueDescriptionFromMarkdown(description: SDK.Issue.MarkdownIssueDescription): IssueDescription {
  const rawMarkdown = getMarkdownFileContent(description.file);
  const rawMarkdownWithPlaceholdersReplaced = substitutePlaceholders(rawMarkdown, description.substitutions);
  return createIssueDescriptionFromRawMarkdown(rawMarkdownWithPlaceholdersReplaced, description);
}

function getMarkdownFileContent(filename: string): string {
  const rawMarkdown = Root.Runtime.cachedResources.get(filename);
  if (!rawMarkdown) {
    throw new Error(`Markdown file ${filename} not found. Declare it as a resource in the module.json file`);
  }
  return rawMarkdown;
}

const validPlaceholderMatchPattern = /\{(PLACEHOLDER_[a-zA-Z][a-zA-Z0-9]*)\}/g;
const validPlaceholderNamePattern = /PLACEHOLDER_[a-zA-Z][a-zA-Z0-9]*/;

/**
 * Replaces placeholders in markdown text with a string provided by the
 * `substitutions` map. To keep mental overhead to a minimum, the same
 * syntax is used as for l10n placeholders. Please note that the
 * placeholders require a mandatory 'PLACEHOLDER_' prefix.
 *
 * Example:
 *   const str = "This is markdown with `code` and two placeholders, namely {PLACEHOLDER_PH1} and {PLACEHOLDER_PH2}".
 *   const result = substitePlaceholders(str, new Map([['PLACEHOLDER_PH1', 'foo'], ['PLACEHOLDER_PH2', 'bar']]));
 *
 * Exported only for unit testing.
 */
export function substitutePlaceholders(markdown: string, substitutions?: Map<string, string>): string {
  const unusedPlaceholders = new Set(substitutions ? substitutions.keys() : []);
  validatePlaceholders(unusedPlaceholders);

  const result = markdown.replace(validPlaceholderMatchPattern, (_, placeholder) => {
    const replacement = substitutions ? substitutions.get(placeholder) : undefined;
    if (!replacement) {
      throw new Error(`No replacment provided for placeholder '${placeholder}'.`);
    }
    unusedPlaceholders.delete(placeholder);
    return replacement;
  });

  if (unusedPlaceholders.size > 0) {
    throw new Error(`Unused replacements provided: ${[...unusedPlaceholders]}`);
  }

  return result;
}

// Ensure that all provided placeholders match the naming pattern.
function validatePlaceholders(placeholders: Set<string>): void {
  const invalidPlaceholders = [...placeholders].filter(placeholder => !validPlaceholderNamePattern.test(placeholder));
  if (invalidPlaceholders.length > 0) {
    throw new Error(`Invalid placeholders provided in the substitutions map: ${invalidPlaceholders}`);
  }
}

/**
 * This function is exported separately for unit testing.
 */
export function createIssueDescriptionFromRawMarkdown(
    markdown: string, description: SDK.Issue.MarkdownIssueDescription): IssueDescription {
  const markdownAst = Marked.Marked.lexer(markdown);
  const title = findTitleFromMarkdownAst(markdownAst);
  if (!title) {
    throw new Error('Markdown issue descriptions must start with a heading');
  }

  const markdownComponent = new MarkdownView();
  markdownComponent.data = {tokens: markdownAst.slice(1)};
  return {
    title,
    view: markdownComponent,
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
