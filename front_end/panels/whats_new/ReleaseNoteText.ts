// Copyright 2024 The Chromium Authors. All rights reserved.
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
  markdownLinks: {key: string, link: string}[];
  videoLinks: {description: string, link: Platform.DevToolsPath.UrlString, type?: VideoType}[];
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
  version: 73,
  header: 'What\'s new in DevTools 132',
  markdownLinks: [
    {
      key: 'ai-assistance',
      link: 'https://developer.chrome.com/blog/new-in-devtools-132/#ai-assistance',
    },
    {
      key: 'chat-history',
      link: 'https://developer.chrome.com/blog/new-in-devtools-132/#chat-history',
    },
    {
      key: 'interaction-phases',
      link: 'https://developer.chrome.com/blog/new-in-devtools-132/#interaction-phases',
    },
  ],
  videoLinks: [
    {
      description: 'Highlights from the Chrome 132 update',
      link: 'https://developer.chrome.com/blog/new-in-devtools-132/' as Platform.DevToolsPath.UrlString,
      type: VideoType.WHATS_NEW,
    },
  ],
  link: 'https://developer.chrome.com/blog/new-in-devtools-132/',
};
