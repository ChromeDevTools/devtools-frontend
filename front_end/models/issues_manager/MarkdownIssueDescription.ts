// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as Marked from '../../third_party/marked/marked.js';

/**
 * The description that subclasses of `Issue` use define the issue appearance:
 * `file` specifies the markdown file, substitutions can be used to replace
 * placeholders with, e.g. URLs. The `links` property is used to specify the
 * links at the bottom of the issue.
 */
export interface MarkdownIssueDescription {
  file: string;
  title?: string;
  substitutions?: Map<string, string>;
  links: Array<{link: string, linkTitle: string}>;
}

export interface LazyMarkdownIssueDescription {
  file: string;
  title?: () => string;
  substitutions?: Map<string, () => string>;
  links: Array<{link: string, linkTitle: () => string}>;
}

/**
 * A lazy version of the description. Allows to specify a description as a
 * constant and at the same time delays resolution of the substitutions
 * and/or link titles to allow localization.
 */
export function resolveLazyDescription(lazyDescription: LazyMarkdownIssueDescription): MarkdownIssueDescription {
  function linksMap(currentLink: {link: string, linkTitle: () => string}): {link: string, linkTitle: string} {
    return {link: currentLink.link, linkTitle: currentLink.linkTitle()};
  }

  const substitutionMap = new Map();
  lazyDescription.substitutions?.forEach((value, key) => {
    substitutionMap.set(key, value());
  });

  const description: MarkdownIssueDescription = {
    file: lazyDescription.file,
    title: lazyDescription.title?.(),
    links: lazyDescription.links.map(linksMap),
    substitutions: substitutionMap,
  };
  return description;
}

/**
 * A loaded and parsed issue description. This is usually obtained by loading
 * a `MarkdownIssueDescription` via `createIssueDescriptionFromMarkdown`.
 */
export interface IssueDescription {
  title: string;
  markdown: Marked.Marked.Token[];
  links: Array<{link: string, linkTitle: string}>;
  substitutions?: Map<string, string>;
}

export async function getFileContent(url: URL): Promise<string> {
  try {
    return await Platform.HostRuntime.HOST_RUNTIME.loadTextFile(url);
  } catch {
    throw new Error(
        `Markdown file ${url.toString()} not found. Make sure it is correctly listed in the relevant BUILD.gn files.`);
  }
}

export async function getMarkdownFileContent(filename: string): Promise<string> {
  return await getFileContent(new URL(`descriptions/${filename}`, import.meta.url));
}

export async function createIssueDescriptionFromMarkdown(description: MarkdownIssueDescription):
    Promise<IssueDescription> {
  const markdown = await getMarkdownFileContent(description.file);
  return createIssueDescriptionFromRawMarkdown(markdown, description);
}

/**
 * This function is exported separately for unit testing.
 */
export function createIssueDescriptionFromRawMarkdown(
    markdown: string, description: MarkdownIssueDescription): IssueDescription {
  const markdownAst = TextUtils.Markdown.tokenizeWithPlaceholders(markdown, description.substitutions);
  const markdownTitle = findTitleFromMarkdownAst(markdownAst);
  if (!markdownTitle) {
    throw new Error('Markdown issue descriptions must start with a heading');
  }

  return {
    title: description.title ?? markdownTitle,
    markdown: markdownAst.slice(1),
    links: description.links,
    substitutions: description.substitutions,
  };
}

export function findTitleFromMarkdownAst(markdownAst: Marked.Marked.Token[]): string|null {
  if (markdownAst.length === 0 || markdownAst[0].type !== 'heading' || markdownAst[0].depth !== 1) {
    return null;
  }
  return markdownAst[0].text;
}

export async function getIssueTitleFromMarkdownDescription(description: MarkdownIssueDescription):
    Promise<string|null> {
  const rawMarkdown = await getMarkdownFileContent(description.file);
  const markdownAst = Marked.Marked.lexer(rawMarkdown);
  const markdownTitle = findTitleFromMarkdownAst(markdownAst);
  if (!markdownTitle) {
    return null;
  }
  return description.title ?? markdownTitle;
}
