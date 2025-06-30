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
  version: 80,
  header: 'What\'s new in DevTools 139',
  markdownLinks: [
    {
      key: 'reliable-devtools',
      link: 'https://developer.chrome.com/blog/new-in-devtools-139/#reliable-devtools',
    },
    {
      key: 'multimodal-input',
      link: 'https://developer.chrome.com/blog/new-in-devtools-139/#multimodal-input',
    },
    {
      key: 'from-elements',
      link: 'https://developer.chrome.com/docs/devtools/ai-assistance/styling#from_the_elements_panel',
    },
    {
      key: 'element-context',
      link: 'https://developer.chrome.com/docs/devtools/ai-assistance/styling#conversation_context',
    },
    {
      key: 'devtools-io',
      link: 'https://developer.chrome.com/blog/new-in-devtools-137',
    },
    {
      key: 'ai-styling',
      link: 'https://developer.chrome.com/blog/new-in-devtools-137#ai-styling',
    },
    {
      key: 'ai-insights',
      link: 'https://developer.chrome.com/blog/new-in-devtools-137#ai-insights',
    },
    {
      key: 'ai-annotations',
      link: 'https://developer.chrome.com/blog/new-in-devtools-137#ai-annotations',
    },
  ],
  videoLinks: [
    {
      description: 'See past highlights from Chrome 138',
      link: 'https://developer.chrome.com/blog/new-in-devtools-138' as Platform.DevToolsPath.UrlString,
      type: VideoType.WHATS_NEW,
    },
  ],
  link: 'https://developer.chrome.com/blog/new-in-devtools-139/',
};
