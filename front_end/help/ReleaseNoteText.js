// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// NOTE: need to be careful about adding release notes early otherwise it'll
// be shown in Canary (e.g. make sure the release notes are accurate).
// https://github.com/ChromeDevTools/devtools-frontend/wiki/Release-Notes

/** @type {!Array<!Help.ReleaseNote>} */
Help.releaseNoteText = [
  {
    version: 58,
    highlights: [
      {
        contents: [
          {
            text: 'Improved',
          },
          {
            text: 'Performance and Memory panels',
            link: 'https://developers.google.com/web/tools/chrome-devtools/',
          }
        ],
        featured: true,
      },
      {
        contents: [
          {
            text: 'Edit cookies directly',
            link: 'https://developers.google.com/web/tools/chrome-devtools/',
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
            link: 'https://developers.google.com/web/tools/chrome-devtools/',
          },
        ],
      },
      {
        contents: [
          {
            text: 'Debugger',
          },
          {
            text: 'catches out-of-memory',
            link: 'https://developers.google.com/web/tools/chrome-devtools/',
          },
          {
            text: 'errors',
          },
        ],
      },
    ],
    link: 'https://developers.google.com/web/tools/chrome-devtools/',
    image: {
      src: 'https://developers.google.com/web/tools/chrome-devtools/images/panels/performance.png',
    },
  },
];
