// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// NOTE: need to be careful about adding release notes early otherwise it'll
// be shown in Canary (e.g. make sure the release notes are accurate).
// https://github.com/ChromeDevTools/devtools-frontend/wiki/Release-Notes

var continueToHereShortcut = Host.isMac() ? 'Command' : 'Control';
var commandMenuShortcut = Host.isMac() ? 'Command + Shift + P' : 'Control + Shift + P';

/** @type {!Array<!Help.ReleaseNote>} */
Help.releaseNoteText = [
  {
    version: 5,
    header: 'Highlights from the Chrome 62 update',
    highlights: [
      {
        title: 'Top-level await operators in the Console',
        subtitle: 'Use await to conveniently experiment with asynchronous functions in the Console.',
        link: 'https://developers.google.com/web/updates/2017/08/devtools-release-notes#await',
      },
      {
        title: 'New screenshot workflows',
        subtitle: 'Take screenshots of a portion of the viewport, or of specific HTML nodes.',
        link: 'https://developers.google.com/web/updates/2017/08/devtools-release-notes#screenshots',
      },
      {
        title: 'CSS Grid highlighting',
        subtitle: 'Hover over an element to see the CSS Grid that\'s affecting it.',
        link: 'https://developers.google.com/web/updates/2017/08/devtools-release-notes#css-grid-highlighting',
      },
      {
        title: 'A new Console API for querying objects',
        subtitle: 'Call queryObjects(Constructor) to get an array of objects instantiated with that constructor.',
        link: 'https://developers.google.com/web/updates/2017/08/devtools-release-notes#query-objects',
      },
      {
        title: 'New Console filters',
        subtitle: 'Filter out logging noise with the new negative and URL filters.',
        link: 'https://developers.google.com/web/updates/2017/08/devtools-release-notes#console-filters',
      },
      {
        title: 'HAR imports in the Network panel',
        subtitle: 'Drag-and-drop a HAR file to analyze a previous network recording.',
        link: 'https://developers.google.com/web/updates/2017/08/devtools-release-notes#har-imports',
      },
      {
        title: 'Previewable cache resources in the Application panel',
        subtitle: 'Click a row in a Cache Storage table to see a preview of that resource.',
        link: 'https://developers.google.com/web/updates/2017/08/devtools-release-notes#cache-preview',
      }
    ],
    link: 'https://developers.google.com/web/updates/2017/08/devtools-release-notes',
  },
  {
    version: 4,
    header: 'Highlights from the Chrome 61 update',
    highlights: [
      {
        title: 'Mobile device throttling',
        subtitle: 'Simulate a mobile device\'s CPU and network throttling from Device Mode.',
        link: 'https://developers.google.com/web/updates/2017/07/devtools-release-notes#throttling',
      },
      {
        title: 'Storage usage',
        subtitle: 'See how much storage (IndexedDB, local, session, cache, etc.) an origin is using.',
        link: 'https://developers.google.com/web/updates/2017/07/devtools-release-notes#storage',
      },
      {
        title: 'Cache timestamps',
        subtitle: 'View when a service worker cached a response.',
        link: 'https://developers.google.com/web/updates/2017/07/devtools-release-notes#time-cached',
      },
      {
        title: 'ES6 Modules support',
        subtitle: 'Debug ES6 Modules natively from the Sources panel.',
        link: 'https://developers.google.com/web/updates/2017/07/devtools-release-notes#modules',
      }
    ],
    link: 'https://developers.google.com/web/updates/2017/07/devtools-release-notes',
  },
  {
    version: 3,
    header: 'Highlights from the Chrome 60 update',
    highlights: [
      {
        title: 'New Audits panel, powered by Lighthouse',
        subtitle:
            'Find out whether your site qualifies as a Progressive Web App, measure the accessibility and performance of a page, and discover best practices.',
        link: 'https://developers.google.com/web/updates/2017/05/devtools-release-notes#lighthouse',
      },
      {
        title: 'Third-party badges',
        subtitle:
            'See what third-party entities are logging to the Console, making network requests, and causing work during performance recordings.',
        link: 'https://developers.google.com/web/updates/2017/05/devtools-release-notes#badges',
      },
      {
        title: 'New "Continue to Here" gesture',
        subtitle: 'While paused on a line of code, hold ' + continueToHereShortcut +
            ' and then click to continue to another line of code.',
        link: 'https://developers.google.com/web/updates/2017/05/devtools-release-notes#continue',
      },
      {
        title: 'Step into async',
        subtitle: 'Predictably step into a promise resolution or other asynchronous code with a single gesture.',
        link: 'https://developers.google.com/web/updates/2017/05/devtools-release-notes#step-into-async',
      },
      {
        title: 'More informative object previews',
        subtitle: 'Get a better idea of the contents of objects when logging them to the Console.',
        link: 'https://developers.google.com/web/updates/2017/05/devtools-release-notes#object-previews',
      },
      {
        title: 'Real-time Coverage tab updates',
        subtitle: 'See what code is being used in real-time.',
        link: 'https://developers.google.com/web/updates/2017/05/devtools-release-notes#coverage',
      }
    ],
    link: 'https://developers.google.com/web/updates/2017/05/devtools-release-notes',
  },
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
