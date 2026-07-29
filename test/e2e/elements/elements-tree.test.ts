// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  clickNthChildOfSelectedElementNode,
  expandSelectedNodeRecursively,
  getContentOfSelectedNode,
  waitForChildrenOfSelectedElementNode,
  waitForContentOfSelectedElementsNode,
  waitForElementsStyleSection,
  waitForElementWithPartialText,
  waitForPartialContentOfSelectedElementsNode,
  waitForSelectedNodeChange,
} from '../helpers/elements-helpers.js';
import {togglePreferenceInSettingsTab} from '../helpers/settings-helpers.js';

describe('The Elements tab', function() {
  it('is able to update shadow dom tree structure upon typing', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/shadow-dom-modify-chardata.html');
    await togglePreferenceInSettingsTab(devToolsPage, 'User agent shadow DOM', undefined);
    await expandSelectedNodeRecursively(devToolsPage);
    const tree = await devToolsPage.waitForAria('Page DOM');
    assert.include(await tree.evaluate(e => e.textContent), '<div>​</div>​');
    const input = await inspectedPage.waitForSelector('#input1');
    await input?.type('Bar');
    await devToolsPage.waitForElementWithTextContent('Bar', tree);
    assert.include(await tree.evaluate(e => e.textContent), '<div>​Bar​</div>​');
  });

  it('shows the documentURL for <iframe> documents', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/iframe-documenturl.html');

    // Check to make sure we have the correct node selected after opening a file
    await waitForContentOfSelectedElementsNode(devToolsPage, '<body>\u200B');

    // Navigate to the <iframe> child node.
    await devToolsPage.pressKey('ArrowRight');
    await waitForContentOfSelectedElementsNode(
        devToolsPage, '<iframe src=\u200B"shadow-dom-modify-chardata.html">\u200B…\u200B</iframe>\u200B');

    // Open the iframe (shows new nodes, but does not alter the selected node)
    await devToolsPage.pressKey('ArrowRight');
    await waitForChildrenOfSelectedElementNode(devToolsPage);
    await waitForContentOfSelectedElementsNode(devToolsPage,
                                               '<iframe src=\u200B"shadow-dom-modify-chardata.html">\u200B');

    // Check that the #document tree node properly reflects the document URL.
    await devToolsPage.pressKey('ArrowRight');
    await waitForPartialContentOfSelectedElementsNode(devToolsPage, '#document');
    assert.match(
        await getContentOfSelectedNode(devToolsPage),
        /#document \(https?:\/\/.*\/test\/e2e\/resources\/elements\/shadow-dom-modify-chardata.html\)/);
  });

  it('automatically selects previously selected user agent and open shadow roots after reload',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToHtml(`
        <span id="hostElement"></span>
        <script>
          var root = document.getElementById("hostElement").attachShadow({mode: 'open'});
          root.innerHTML = "<input type='text'>";
        </script>
        `);
       await togglePreferenceInSettingsTab(devToolsPage, 'User agent shadow DOM', undefined);
       await expandSelectedNodeRecursively(devToolsPage);

       const userAgentRootSelector = '#shadow-root (user-agent)';
       await devToolsPage.click(`pierceShadowText/${userAgentRootSelector}`);
       await waitForContentOfSelectedElementsNode(devToolsPage, userAgentRootSelector);

       await inspectedPage.reload();
       await waitForContentOfSelectedElementsNode(devToolsPage, userAgentRootSelector);

       const openRootSelector = '#shadow-root (open)';
       await devToolsPage.click(`pierceShadowText/${openRootSelector}`);

       await waitForContentOfSelectedElementsNode(devToolsPage, openRootSelector);

       await clickNthChildOfSelectedElementNode(devToolsPage, 1);
       await waitForSelectedNodeChange(devToolsPage, 'openRootSelector');

       await inspectedPage.reload();
       await waitForContentOfSelectedElementsNode(devToolsPage, '<input type=​"text">​');
     });

  it('nodes can be copied in ElementsTreeOutline', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToHtml(
        `<span id="node-to-copy">This should be <b>copied</b>.</span><div id="paste-here"></div>`);
    await waitForElementsStyleSection(devToolsPage, undefined);
    const nodeToCopyElement = await waitForElementWithPartialText(devToolsPage, 'node-to-copy');
    await nodeToCopyElement.click();
    await devToolsPage.pressKey('c', {control: true});

    const nodeToPasteIn = await waitForElementWithPartialText(devToolsPage, 'paste-here');
    await nodeToPasteIn.click();
    await devToolsPage.pressKey('v', {control: true});

    await nodeToPasteIn.$('span#node-to-copy');
  });
});
