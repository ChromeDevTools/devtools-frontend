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
        text: 'Review CSS changes in the new Changes drawer',
        link: 'https://developers.google.com/web/updates/2016/06/devtools-digest',
        featured: true,
      },
      {
        text: 'Contextual icons in Console',
        link: 'https://developers.google.com/web/updates/2016/06/devtools-digest',
      },
      {
        text: 'Release notes for DevTools',
        link: 'https://developers.google.com/web/updates/2016/06/devtools-digest',
      },
    ],
    link: 'https://developers.google.com/web/updates/2016/06/devtools-digest',
    image: {
      src: 'https://developers.google.com/web/updates/images/2016/08/colorpicker.jpg',
    },
  },
];
