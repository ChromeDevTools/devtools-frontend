// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  editCSSProperty,
  expandSelectedNodeRecursively,
  focusElementsTree,
  INACTIVE_GRID_ADORNER_SELECTOR,
  toggleAdornerSetting,
  waitForAdornerOnSelectedNode,
  waitForAdorners,
  waitForAndClickTreeElementWithPartialText,
  waitForElementsStyleSection,
  waitForNoAdornersOnSelectedNode,
  waitForPartialContentOfSelectedElementsNode,
} from '../../e2e/helpers/elements-helpers.js';
import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';

const prepareElementsTab = async (devToolsPage: DevToolsPage) => {
  await waitForElementsStyleSection(null, devToolsPage);
  await expandSelectedNodeRecursively(devToolsPage);
};

describe('Adornment in the Elements Tab', function() {
  // This test relies on the context menu which takes a while to appear, so we bump the timeout a bit.
  if (this.timeout() > 0) {
    this.timeout(20000);
  }

  it('displays grid and flex adorners', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/adornment.html');
    await prepareElementsTab(devToolsPage);

    await waitForAdorners(
        [
          {textContent: 'grid', isActive: false},
          {textContent: 'subgrid', isActive: false},
          {textContent: 'subgrid', isActive: false},
          {textContent: 'subgrid', isActive: false},
          {textContent: 'grid', isActive: false},
          {textContent: 'flex', isActive: false},
          {textContent: 'flex', isActive: false},
        ],
        devToolsPage);
  });

  it('displays scroll-snap adorners', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/adornment-scroll-snap.html');
    await prepareElementsTab(devToolsPage);

    await waitForAdorners(
        [
          {textContent: 'scroll-snap', isActive: false},
          {textContent: 'scroll', isActive: false},
        ],
        devToolsPage);
  });

  it('displays media adorner for video and audio elements', async ({devToolsPage, inspectedPage}) => {
    // Note that this test simulates several property value editing, with delay between each keystrokes.
    // If this test become flaky in the future, it is likely that we will have to increase the timeout.
    await inspectedPage.goToResource('elements/adornment-media.html');
    await toggleAdornerSetting('media', devToolsPage);
    await focusElementsTree(devToolsPage);
    await prepareElementsTab(devToolsPage);

    await waitForAdorners(
        [
          {textContent: 'media', isActive: false},
          {textContent: 'media', isActive: false},
        ],
        devToolsPage);

    // Select the first video element.
    await devToolsPage.pressKey('ArrowDown');
    await waitForAdornerOnSelectedNode('media', devToolsPage);

    // Select the second audio element.
    await devToolsPage.pressKey('ArrowDown');
    await waitForAdornerOnSelectedNode('media', devToolsPage);
  });

  it('displays container query adorners', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/adornment-container-query.html');
    await prepareElementsTab(devToolsPage);

    await waitForAdorners(
        [
          {textContent: 'container', isActive: false},
        ],
        devToolsPage);
  });

  it('can toggle adorners', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/adornment.html');
    await prepareElementsTab(devToolsPage);

    await waitForAdorners(
        [
          {textContent: 'grid', isActive: false},
          {textContent: 'subgrid', isActive: false},
          {textContent: 'subgrid', isActive: false},
          {textContent: 'subgrid', isActive: false},
          {textContent: 'grid', isActive: false},
          {textContent: 'flex', isActive: false},
          {textContent: 'flex', isActive: false},
        ],
        devToolsPage);

    // Toggle both grid adorners on and try to select them with the active selector
    await devToolsPage.click(INACTIVE_GRID_ADORNER_SELECTOR);
    await devToolsPage.click(INACTIVE_GRID_ADORNER_SELECTOR);

    await waitForAdorners(
        [
          {textContent: 'grid', isActive: true},
          {textContent: 'subgrid', isActive: true},
          {textContent: 'subgrid', isActive: false},
          {textContent: 'subgrid', isActive: false},
          {textContent: 'grid', isActive: false},
          {textContent: 'flex', isActive: false},
          {textContent: 'flex', isActive: false},
        ],
        devToolsPage);
  });

  it('does not display adorners on shadow roots when their parents are grid or flex containers',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('elements/adornment-shadow.html');
       await prepareElementsTab(devToolsPage);

       await waitForAdorners(
           [
             {textContent: 'grid', isActive: false},
             {textContent: 'flex', isActive: false},
           ],
           devToolsPage);
     });

  it('updates when display properties change', async ({devToolsPage, inspectedPage}) => {
    // Note that this test simulates several property value editing, like a user would type, with delay between
    // keystrokes. So if this test became flaky in the future, we'd likely have to increase the timeout.
    await inspectedPage.goToResource('elements/adornment.html');
    await prepareElementsTab(devToolsPage);

    // Select the first element.
    await devToolsPage.pressKey('ArrowDown');

    await waitForAdornerOnSelectedNode('grid', devToolsPage);

    await editCSSProperty('.grid', 'display', 'flex', devToolsPage);
    await waitForAdornerOnSelectedNode('flex', devToolsPage);

    await editCSSProperty('.grid', 'display', 'inline-grid', devToolsPage);
    await waitForAdornerOnSelectedNode('grid', devToolsPage);
  });

  it('displays scroll adorner for an element with overflow:scroll and scrollable contents',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('elements/adornment-scroll.html');
       await prepareElementsTab(devToolsPage);
       await waitForAndClickTreeElementWithPartialText('scroller', devToolsPage);

       await waitForAdornerOnSelectedNode('scroll', devToolsPage);
     });

  it('displays scroll adorner for an element with `overflow: hidden` changed to `overflow: scroll`',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('elements/adornment-scroll.html');
       await prepareElementsTab(devToolsPage);
       await waitForAndClickTreeElementWithPartialText('overflow-hidden', devToolsPage);
       await waitForNoAdornersOnSelectedNode(devToolsPage);

       await editCSSProperty('#overflow-hidden', 'overflow', 'scroll', devToolsPage);
       await waitForAdornerOnSelectedNode('scroll', devToolsPage);
     });

  it('displays scroll adorner for an element with `overflow: visible` changed to `overflow: scroll`',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('elements/adornment-scroll.html');
       await prepareElementsTab(devToolsPage);
       await waitForAndClickTreeElementWithPartialText('overflow-visible', devToolsPage);
       await waitForNoAdornersOnSelectedNode(devToolsPage);

       await editCSSProperty('#overflow-visible', 'overflow', 'scroll', devToolsPage);
       await waitForAdornerOnSelectedNode('scroll', devToolsPage);
     });

  it('removes scroll adorner for an element with `overflow: scroll` changed to `overflow: visible`',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('elements/adornment-scroll.html');
       await prepareElementsTab(devToolsPage);
       await waitForAndClickTreeElementWithPartialText('overflow-scroll', devToolsPage);
       await waitForAdornerOnSelectedNode('scroll', devToolsPage);

       await editCSSProperty('#overflow-scroll', 'overflow', 'visible', devToolsPage);
       await waitForNoAdornersOnSelectedNode(devToolsPage);
     });

  it('removes scroll adorner for an element whose content shrinks', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/adornment-scroll.html');
    await prepareElementsTab(devToolsPage);
    await waitForAndClickTreeElementWithPartialText('content-shrinking', devToolsPage);
    await waitForAdornerOnSelectedNode('scroll', devToolsPage);

    await inspectedPage.evaluate(() => {
      document.getElementById('content-shrinking')?.classList.add('shrunk');
    });
    await waitForNoAdornersOnSelectedNode(devToolsPage);
  });

  it('displays scroll adorner for document node in an iframe', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/adornment-scroll.html');
    await prepareElementsTab(devToolsPage);

    await waitForAndClickTreeElementWithPartialText('iframe', devToolsPage);
    await waitForPartialContentOfSelectedElementsNode('"iframe"', devToolsPage);
    await waitForNoAdornersOnSelectedNode(devToolsPage);

    await devToolsPage.pressKey('ArrowDown');
    await waitForPartialContentOfSelectedElementsNode('document', devToolsPage);
    await waitForNoAdornersOnSelectedNode(devToolsPage);

    await devToolsPage.pressKey('ArrowDown');
    await waitForPartialContentOfSelectedElementsNode('<html>', devToolsPage);
    await waitForAdornerOnSelectedNode('scroll', devToolsPage);

    await devToolsPage.pressKey('ArrowDown');
    await devToolsPage.pressKey('ArrowLeft');
    await devToolsPage.pressKey('ArrowDown');
    await waitForPartialContentOfSelectedElementsNode('<body>', devToolsPage);
    await waitForNoAdornersOnSelectedNode(devToolsPage);
  });

  it('displays scroll adorner for the body node in an iframe', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/adornment-scroll.html');
    await prepareElementsTab(devToolsPage);

    await waitForAndClickTreeElementWithPartialText('iframe-with-scrollable-body', devToolsPage);
    await waitForPartialContentOfSelectedElementsNode('"iframe-with-scrollable-body"', devToolsPage);
    await waitForNoAdornersOnSelectedNode(devToolsPage);

    await devToolsPage.pressKey('ArrowDown');
    await waitForPartialContentOfSelectedElementsNode('document', devToolsPage);
    await waitForNoAdornersOnSelectedNode(devToolsPage);

    await devToolsPage.pressKey('ArrowDown');
    await waitForPartialContentOfSelectedElementsNode('DOCTYPE', devToolsPage);
    await waitForNoAdornersOnSelectedNode(devToolsPage);

    await devToolsPage.pressKey('ArrowDown');
    await waitForPartialContentOfSelectedElementsNode('<html>', devToolsPage);
    await waitForNoAdornersOnSelectedNode(devToolsPage);

    await devToolsPage.pressKey('ArrowDown');
    await devToolsPage.pressKey('ArrowLeft');
    await devToolsPage.pressKey('ArrowDown');
    await waitForPartialContentOfSelectedElementsNode('<body>', devToolsPage);
    await waitForAdornerOnSelectedNode('scroll', devToolsPage);
  });

  it('removes scroll adorner for an document element whose body shrinks', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/adornment-scroll.html');
    await prepareElementsTab(devToolsPage);

    await waitForAndClickTreeElementWithPartialText('iframe-with-shrinking-body', devToolsPage);
    await waitForPartialContentOfSelectedElementsNode('"iframe-with-shrinking-body"', devToolsPage);
    await waitForNoAdornersOnSelectedNode(devToolsPage);

    await devToolsPage.pressKey('ArrowDown');
    await waitForPartialContentOfSelectedElementsNode('document', devToolsPage);
    await waitForNoAdornersOnSelectedNode(devToolsPage);

    await devToolsPage.pressKey('ArrowDown');
    await waitForPartialContentOfSelectedElementsNode('body-shrinking', devToolsPage);
    await waitForAdornerOnSelectedNode('scroll', devToolsPage);

    await inspectedPage.evaluate(() => {
      const frame = document.getElementById('iframe-with-shrinking-body') as HTMLIFrameElement;
      const doc = frame.contentDocument;
      if (doc) {
        doc.getElementById('body-shrinking')?.classList.add('shrunk');
      }
    });

    await waitForNoAdornersOnSelectedNode(devToolsPage);
  });
});
