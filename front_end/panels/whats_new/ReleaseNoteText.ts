// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// NOTE: need to be careful about adding release notes early otherwise it'll
// be shown in Canary (e.g. make sure the release notes are accurate).
// https://github.com/ChromeDevTools/devtools-frontend/wiki/Release-Notes

import type * as Platform from '../../core/platform/platform.js';
import * as MarkdownView from '../../ui/components/markdown_view/markdown_view.js';

let registeredLinks = false;

export interface ReleaseNote {
  version: number;
  header: string;
  markdownLinks: Array<{key: string, link: string}>;
  videoLinks: Array<{description: string, link: Platform.DevToolsPath.UrlString, type?: VideoType}>;
  link: string;
}

export const enum VideoType {
  WHATS_NEW = 'WhatsNew',
  DEVTOOLS_TIPS = 'DevtoolsTips',
  OTHER = 'Other',
}

export function setReleaseNoteForTest(testReleaseNote: ReleaseNote): void {
  releaseNote = testReleaseNote;
}

export function getReleaseNote(): ReleaseNote {
  if (!registeredLinks) {
    for (const {key, link} of releaseNote.markdownLinks) {
      MarkdownView.MarkdownLinksMap.markdownLinks.set(key, link);
    }
    registeredLinks = true;
  }
  return releaseNote;
}

let releaseNote: ReleaseNote = {
  version: 143,
  header: 'What\'s new in DevTools 143',
  markdownLinks: [
    {
      key: 'mcp-server',
      link: 'https://developer.chrome.com/blog/new-in-devtools-143/#mcp-server',
    },
    {
      key: 'trace-sharing',
      link: 'https://developer.chrome.com/blog/new-in-devtools-143/#trace-sharing',
    },
    {
      key: 'starting-style',
      link: 'https://developer.chrome.com/blog/new-in-devtools-143/#starting-style',
    },
  ],
  videoLinks: [],
  link: 'https://developer.chrome.com/blog/new-in-devtools-143/',
};
