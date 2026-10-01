// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  clickNthChildOfSelectedElementNode,
  clickTreeElementWithPartialText,
  elementWithPartialText,
  expandSelectedNodeRecursively,
  getBreadcrumbsTextContent,
  getContentOfSelectedNode,
  getSelectedBreadcrumbTextContent,
  waitForChildrenOfSelectedElementNode,
  waitForContentOfSelectedElementsNode,
  waitForElementsStyleSection,
  waitForElementWithPartialText,
  waitForPartialContentOfSelectedElementsNode,
  waitForSelectedNodeChange,
} from '../helpers/elements-helpers.js';
import {togglePreferenceInSettingsTab} from '../helpers/settings-helpers.js';

const SHADOW_SELECTION_ON_REFRESH_PAGE = `
  <span id="hostElement"></span><span id="closedHostElement"></span>
  <script>
    const root = document.getElementById('hostElement').attachShadow({mode: 'open'});
    root.innerHTML = "<input type='text'>";
    const closedRoot = document.getElementById('closedHostElement').attachShadow({mode: 'closed'});
    closedRoot.innerHTML = '<button></button>';
  </script>
`;

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

  it('preserves standard DOM node selection across page reload', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToHtml('<div id="first-node">First</div><div id="persisted-node">Second</div>');
    await waitForElementsStyleSection(devToolsPage, undefined);
    const targetNode = await waitForElementWithPartialText(devToolsPage, 'persisted-node');
    await targetNode.click();
    await waitForPartialContentOfSelectedElementsNode(devToolsPage, 'persisted-node');
    await inspectedPage.reload();
    await waitForPartialContentOfSelectedElementsNode(devToolsPage, 'persisted-node');
  });

  it('preserves closed shadow root and child selection across reload', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToHtml(`
      <div id="closed-host"></div>
      <script>
        const root = document.getElementById('closed-host').attachShadow({mode: 'closed'});
        root.innerHTML = '<span id="closed-child">Inside Closed</span>';
      </script>
    `);
    await expandSelectedNodeRecursively(devToolsPage);

    const closedRootSelector = '#shadow-root (closed)';
    await devToolsPage.click(`pierceShadowText/${closedRootSelector}`);
    await waitForContentOfSelectedElementsNode(devToolsPage, closedRootSelector);

    await inspectedPage.reload();
    await waitForContentOfSelectedElementsNode(devToolsPage, closedRootSelector);

    await clickNthChildOfSelectedElementNode(devToolsPage, 1);
    await waitForPartialContentOfSelectedElementsNode(devToolsPage, 'closed-child');

    await inspectedPage.reload();
    await waitForPartialContentOfSelectedElementsNode(devToolsPage, 'closed-child');
  });

  it('moves focus from the Elements tree to the next tab stop and back using Tab and Shift+Tab',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToHtml('<span id="tab-node">Content</span>');
       await waitForElementsStyleSection(devToolsPage, undefined);
       const nodeElement = await waitForElementWithPartialText(devToolsPage, 'tab-node');
       await nodeElement.click();
       await waitForPartialContentOfSelectedElementsNode(devToolsPage, 'tab-node');

       const isTreeItemFocused = async () => await devToolsPage.evaluate(() => {
         let active: Element|null = document.activeElement;
         while (active?.shadowRoot?.activeElement) {
           active = active.shadowRoot.activeElement;
         }
         return active?.tagName === 'LI' && active.classList.contains('selected');
       });

       await devToolsPage.waitForFunction(isTreeItemFocused);
       await devToolsPage.pressKey('Tab');
       await devToolsPage.waitForFunction(async () => !(await isTreeItemFocused()));

       await devToolsPage.page.keyboard.down('Shift');
       await devToolsPage.pressKey('Tab');
       await devToolsPage.page.keyboard.up('Shift');
       await devToolsPage.waitForFunction(isTreeItemFocused);
     });

  it('cycles through all tab stops of the Elements panel in both directions without trapping focus',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToHtml('<span id="node-to-select"></span>');
       await waitForElementsStyleSection(devToolsPage, undefined);
       const nodeElement = await waitForElementWithPartialText(devToolsPage, 'node-to-select');
       await nodeElement.click();
       await waitForPartialContentOfSelectedElementsNode(devToolsPage, 'node-to-select');
       // The breadcrumbs (one link per ancestor) update asynchronously after the selection changes. Wait for them
       // to settle so that the set of tab stops does not change while cycling through them.
       await getBreadcrumbsTextContent(devToolsPage, {expectedNodeCount: 3});
       await devToolsPage.waitForFunction(async () => (await getSelectedBreadcrumbTextContent(devToolsPage)) ===
                                              'span#node-to-select');

       /**
        * Describes the deep active element and assigns it a stable
        * id (kept in a WeakMap in the DevTools page) so that identical descriptions can be told apart.
        */
       const focusedElement = async () => await devToolsPage.evaluate(() => {
         const global = globalThis as unknown as {tabStopIds?: WeakMap<Element, number>, tabStopCount?: number};
         const ids = global.tabStopIds ??= new WeakMap();
         let active: Element|null = document.activeElement;
         while (active?.shadowRoot?.activeElement) {
           active = active.shadowRoot.activeElement;
         }
         if (!active || active === document.body) {
           return {id: -1, description: 'null'};
         }
         if (!ids.has(active)) {
           global.tabStopCount = (global.tabStopCount ?? 0) + 1;
           ids.set(active, global.tabStopCount);
         }
         let description = active.tagName + (active.id ? '#' + active.id : '');
         const label = active.getAttribute('aria-label') || active.getAttribute('title') ||
             (active.textContent && active.textContent.length < 50 ? active.textContent.replaceAll('\u200B', '') : '');
         if (label) {
           description += ':' + label;
         }
         return {id: ids.get(active) ?? -1, description};
       });

       const MAX_TAB_STOPS = 100;
       const collectCycle = async (shift: boolean) => {
         const start = await focusedElement();
         const cycle: Array<{id: number, description: string}> = [];
         for (let i = 0; i < MAX_TAB_STOPS; ++i) {
           await devToolsPage.pressKey('Tab', {shift});
           const current = await focusedElement();
           if (current.id === -1) {
             continue;
           }
           cycle.push(current);
           if (current.id === start.id) {
             return cycle;
           }
         }
         assert.fail(`Unable to complete the tab stop cycle, focus is trapped: ${
             cycle.slice(-5).map(e => e.description).join(' -> ')}`);
       };

       const treeItem = await focusedElement();
       assert.match(treeItem.description, /^LI:<span id="node-to-select">/);

       const forward = await collectCycle(/* shift */ false);
       // Every tab stop is visited exactly once before focus returns to the tree item.
       assert.strictEqual(new Set(forward.map(e => e.id)).size, forward.length, JSON.stringify(forward));
       assert.strictEqual(forward.at(-1)?.id, treeItem.id);
       const descriptions = forward.map(e => e.description);
       const indexOf = (predicate: (description: string) => boolean) => {
         const index = descriptions.findIndex(predicate);
         assert.notStrictEqual(index, -1, `Missing tab stop in ${JSON.stringify(descriptions)}`);
         return index;
       };
       const expectedOrder = [
         indexOf(d => d === 'DIV#tab-styles:Styles'),
         indexOf(d => d.endsWith(':Filter')),
         indexOf(d => d === 'DIV:element.style, css selector'),
         indexOf(d => d.includes(':Select an element in the page to inspect it')),
         indexOf(d => d === 'DIV#tab-elements:Elements'),
         indexOf(d => d.endsWith(':Customize and control DevTools')),
         forward.length - 1,
       ];
       assert.deepEqual([...expectedOrder].sort((a, b) => a - b), expectedOrder, JSON.stringify(descriptions));

       // Shift+Tab visits the same tab stops in reverse order. Descriptions are compared rather than ids because
       // some panes (e.g. the Styles sidebar) may re-render and replace equivalent elements in the meantime.
       const backward = await collectCycle(/* shift */ true);
       assert.strictEqual(backward.at(-1)?.id, treeItem.id);
       assert.deepEqual(backward.map(e => e.description),
                        [...descriptions.slice(0, -1).reverse(), treeItem.description],
                        JSON.stringify({forward: descriptions, backward: backward.map(e => e.description)}));
     });

  it('preserves open shadow root selection across reload', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToHtml(SHADOW_SELECTION_ON_REFRESH_PAGE);
    await togglePreferenceInSettingsTab(devToolsPage, 'User agent shadow DOM', true);
    await expandSelectedNodeRecursively(devToolsPage);

    const openRootSelector = '#shadow-root (open)';
    await devToolsPage.click(`pierceShadowText/${openRootSelector}`);
    await waitForContentOfSelectedElementsNode(devToolsPage, openRootSelector);

    await inspectedPage.reload();
    await waitForContentOfSelectedElementsNode(devToolsPage, openRootSelector);
  });

  it('preserves user agent shadow root child selection across reload', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToHtml(SHADOW_SELECTION_ON_REFRESH_PAGE);
    await togglePreferenceInSettingsTab(devToolsPage, 'User agent shadow DOM', true);
    await expandSelectedNodeRecursively(devToolsPage);

    const userAgentRootSelector = '#shadow-root (user-agent)';
    await devToolsPage.click(`pierceShadowText/${userAgentRootSelector}`);
    await waitForContentOfSelectedElementsNode(devToolsPage, userAgentRootSelector);
    await clickNthChildOfSelectedElementNode(devToolsPage, 1);
    await waitForSelectedNodeChange(devToolsPage, userAgentRootSelector);
    const selectedChild = await getContentOfSelectedNode(devToolsPage);
    assert.match(selectedChild, /^<div/);
    // Compare the opening tag only, the expansion state of the node is not preserved.
    const openingTag = selectedChild.slice(0, selectedChild.indexOf('>') + 1);

    await inspectedPage.reload();
    await devToolsPage.waitForFunction(async () =>
                                           (await getContentOfSelectedNode(devToolsPage)).startsWith(openingTag));
  });

  it('shows the new iframe document after the iframe navigated', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/iframe-load-event.html');
    await waitForElementsStyleSection(devToolsPage, undefined);
    await expandSelectedNodeRecursively(devToolsPage);
    await waitForElementWithPartialText(devToolsPage, 'iframe-1-element');

    await inspectedPage.evaluate(async () => {
      const frame = document.getElementById('myframe') as HTMLIFrameElement;
      const loaded = new Promise(resolve => frame.addEventListener('load', resolve, {once: true}));
      frame.src = 'iframe-load-event-iframe-2.html';
      await loaded;
    });

    await clickTreeElementWithPartialText(devToolsPage, '<body>');
    await waitForPartialContentOfSelectedElementsNode(devToolsPage, '<body>');
    await expandSelectedNodeRecursively(devToolsPage);
    await waitForElementWithPartialText(devToolsPage, 'iframe-2-element');
    const documentNode = await waitForElementWithPartialText(devToolsPage, '#document (');
    assert.match(await documentNode.evaluate(e => e.textContent ?? ''),
                 /^#document \(https?:\/\/.*\/test\/e2e\/resources\/elements\/iframe-load-event-iframe-2\.html\)$/);
    assert.isNull(await elementWithPartialText(devToolsPage, 'iframe-1-element'));
  });
});
