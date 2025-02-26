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
  version: 75,
  header: 'What\'s new in DevTools 134',
  markdownLinks: [
    {
      key: 'privacy-and-security',
      link: 'https://developer.chrome.com/blog/new-in-devtools-134/#privacy-and-security',
    },
    {
      key: 'calibrated-cpu-throttling',
      link: 'https://developer.chrome.com/blog/new-in-devtools-134/#calibrated-cpu-throttling',
    },
    {
      key: 'perf-third-party',
      link: 'https://developer.chrome.com/blog/new-in-devtools-134/#perf-third-party',
    },
  ],
  videoLinks: [
    {
      description: 'See also the highlights from Chrome 130-132',
      link: 'https://www.youtube.com/watch?v=kzDUe-f4gac' as Platform.DevToolsPath.UrlString,
      type: VideoType.WHATS_NEW,
    },
  ],
  link: 'https://developer.chrome.com/blog/new-in-devtools-134/',
};
