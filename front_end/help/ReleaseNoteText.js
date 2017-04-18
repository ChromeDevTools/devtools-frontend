// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// NOTE: need to be careful about adding release notes early otherwise it'll
// be shown in Canary (e.g. make sure the release notes are accurate).
// https://github.com/ChromeDevTools/devtools-frontend/wiki/Release-Notes

var commandMenuShortcut = Host.isMac() ? 'Command + Shift + P' : 'Control + Shift + P';

/** @type {!Array<!Help.ReleaseNote>} */
Help.releaseNoteText = [
  {
    version: 2,
    header: 'Highlights from Chrome 59 update',
    highlights: [
      {
        title: 'CSS and JS code coverage',
        subtitle: 'Find unused CSS and JS with the new Coverage drawer.',
        link: 'https://developers.google.com/web/updates/2017/04/devtools-release-notes#coverage',
      },
      {
        title: 'Full-page screenshots',
        subtitle: 'Take a screenshot of the entire page, from the top of the viewport to the bottom.',
        link: 'https://developers.google.com/web/updates/2017/04/devtools-release-notes#screenshots',
      },
      {
        title: 'Block requests',
        subtitle: 'Manually disable individual requests in the Network panel.',
        link: 'https://developers.google.com/web/updates/2017/04/devtools-release-notes#block-requests',
      },
      {
        title: 'Step over async await',
        subtitle: 'Step through async functions predictably.',
        link: 'https://developers.google.com/web/updates/2017/04/devtools-release-notes#async',
      },
      {
        title: 'Unified Command Menu',
        subtitle: 'Execute commands and open files from the newly-unified Command Menu (' + commandMenuShortcut + ').',
        link: 'https://developers.google.com/web/updates/2017/04/devtools-release-notes#command-menu',
      }
    ],
    link: 'https://developers.google.com/web/updates/2017/04/devtools-release-notes',
  },
  {
    version: 1,
    header: 'Highlights from Chrome 58 update',
    highlights: [
      {
        title: 'New Performance and Memory panels',
        subtitle: 'Head to Performance for JavaScript profiling',
        link: 'https://developers.google.com/web/updates/2017/03/devtools-release-notes#performance-panel',
      },
      {
        title: 'Editable cookies',
        subtitle: 'You can edit any existing cookies and create new ones in the Application panel',
        link: 'https://developers.google.com/web/updates/2017/03/devtools-release-notes#cookies',
      },
      {
        title: 'Console filtering & settings',
        subtitle: 'Use the text filter or click the Console settings icon to touch up your preferences',
        link: 'https://developers.google.com/web/updates/2017/03/devtools-release-notes#console',
      },
      {
        title: 'Debugger catches out-of-memory errors',
        subtitle: 'See the stack or grab a heap snapshot to see why the app may crash',
        link: 'https://developers.google.com/web/updates/2017/03/devtools-release-notes#out-of-memory-breakpoints',
      },
    ],
    link: 'https://developers.google.com/web/updates/2017/03/devtools-release-notes',
  }
];
