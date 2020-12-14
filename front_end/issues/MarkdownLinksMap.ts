// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
  To use links in markdown, add key here with the link and
  use the added key in markdown.
  @example markdown
  Find more information about web development at [Learn more](exampleLink)
*/

// This is only exported for tests, and it should not be
// imported in any component, instead add link in map and
// use getMarkdownLink to get the appropriate link.
export const markdownLinks = new Map<string, string>([]);

export const getMarkdownLink = (key: string): string => {
  const link = markdownLinks.get(key);
  if (!link) {
    throw new Error(`Markdown link with key '${key}' is not available, please check MarkdownLinksMap.ts`);
  }
  return link;
};
