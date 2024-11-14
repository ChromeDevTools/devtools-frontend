// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// NOTE: need to be careful about adding release notes early otherwise it'll
// be shown in Canary (e.g. make sure the release notes are accurate).
// https://github.com/ChromeDevTools/devtools-frontend/wiki/Release-Notes

import * as MarkdownView from '../../ui/components/markdown_view/markdown_view.js';

let registeredLinks = false;

interface ReleaseNote {
  version: number;
  header: string;
  markdownLinks: {key: string, link: string}[];
  link: string;
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
  header: 'Highlights from the Chrome 132 update',
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
  link: 'https://developer.chrome.com/blog/new-in-devtools-132/',
};
