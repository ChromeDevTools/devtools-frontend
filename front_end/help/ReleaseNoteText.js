// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// NOTE: need to be careful about adding release notes early otherwise it'll
// be shown in Canary (e.g. make sure the release notes are accurate).
// https://github.com/ChromeDevTools/devtools-frontend/wiki/Release-Notes

/** @type {!Array<!Help.ReleaseNote>} */
Help.releaseNoteText = [
  {
    version: 1,
    highlights: [
      {
        contents: [
          {
            text: 'Debugger',
          },
          {
            text: 'catches out-of-memory',
            link: 'https://developers.google.com/web/updates/2017/03/devtools-release-notes#out-of-memory-breakpoints',
          },
          {
            text: 'errors',
          },
        ],
        featured: true,
      },
      {
        contents: [
          {
            text: 'Edit cookies directly',
            link: 'https://developers.google.com/web/updates/2017/03/devtools-release-notes#cookies',
          },
          {
            text: 'from the Application panel',
          },
        ],
      },
      {
        contents: [
          {
            text: 'Better',
          },
          {
            text: 'filtering & settings for Console',
            link: 'https://developers.google.com/web/updates/2017/03/devtools-release-notes#console',
          },
        ],
      },
      {
        contents: [
          {
            text: 'Improved',
          },
          {
            text: 'Performance and Memory panels',
            link: 'https://developers.google.com/web/updates/2017/03/devtools-release-notes#performance-panel',
          }
        ],
      },
    ],
    link: 'https://developers.google.com/web/updates/2017/03/devtools-release-notes',
    image: {
      src: 'https://developers.google.com/web/updates/images/2017/03/release-notes-preview.png',
    },
  },
];
