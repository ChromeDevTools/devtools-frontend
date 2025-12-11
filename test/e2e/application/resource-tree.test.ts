// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {navigateToApplicationTab} from '../helpers/application-helpers.js';

describe('The Application Tab', () => {
  it('shows several resources with the same url if they were loaded with inspector already opened',
     async ({devToolsPage, inspectedPage}) => {
       // 1. Navigate to the main page which loads the CSS once.
       await navigateToApplicationTab('resource-tree-non-unique-url-iframe', devToolsPage, inspectedPage);

       // 2. Expand Frames to be ready/visible.
       await devToolsPage.click('#tab-resources');

       const topFrameSelector = '[aria-label="top"]';
       await devToolsPage.waitFor(topFrameSelector);
       await devToolsPage.click(topFrameSelector, {clickOptions: {count: 2}});

       // 3. Inject an iframe that loads the same page (and thus the same CSS).
       await inspectedPage.evaluate(() => {
         const iframe = document.createElement('iframe');
         iframe.src = 'resource-tree-non-unique-url-iframe.html';
         // This rule is only relevant for unit tests.
         // eslint-disable-next-line @devtools/no-document-body-mutation
         document.body.appendChild(iframe);
       });

       // 4. Wait for the CSS to appear twice in the tree.
       await devToolsPage.waitForFunction(async () => {
         const nodes = await devToolsPage.$$('.tree-element-title');
         const titles = await Promise.all(nodes.map(n => n.evaluate(el => el.textContent)));
         const cssCount = titles.filter(t => t === 'styles-non-unique-url.css').length;
         return cssCount === 2;
       });
     });
});
