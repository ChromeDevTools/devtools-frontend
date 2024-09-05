// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, getBrowserAndPages, goToResource} from '../../shared/helper.js';
import {
  editCSSProperty,
  expandSelectedNodeRecursively,
  focusElementsTree,
  INACTIVE_GRID_ADORNER_SELECTOR,
  toggleAdornerSetting,
  waitForAdornerOnSelectedNode,
  waitForAdorners,
  waitForAndClickTreeElementWithPartialText,
  waitForContentOfSelectedElementsNode,
  waitForElementsStyleSection,
  waitForNoAdornersOnSelectedNode,
  waitForPartialContentOfSelectedElementsNode,
} from '../helpers/elements-helpers.js';

const prepareElementsTab = async () => {
  await waitForElementsStyleSection();
  await waitForContentOfSelectedElementsNode('<body>\u200B');
  await expandSelectedNodeRecursively();
};

describe('Adornment in the Elements Tab', function() {
  // This test relies on the context menu which takes a while to appear, so we bump the timeout a bit.
  if (this.timeout() > 0) {
    this.timeout(20000);
  }

  it('displays grid and flex adorners', async () => {
    await goToResource('elements/adornment.html');
    await prepareElementsTab();

    await waitForAdorners([
      {textContent: 'grid', isActive: false},
      {textContent: 'subgrid', isActive: false},
      {textContent: 'subgrid', isActive: false},
      {textContent: 'subgrid', isActive: false},
      {textContent: 'grid', isActive: false},
      {textContent: 'flex', isActive: false},
      {textContent: 'flex', isActive: false},
    ]);
  });

  it('displays scroll-snap adorners', async () => {
    await goToResource('elements/adornment-scroll-snap.html');
    await prepareElementsTab();

    await waitForAdorners([
      {textContent: 'scroll-snap', isActive: false},
      {textContent: 'scroll', isActive: false},
    ]);
  });

  it('displays media adorner for video and audio elements', async () => {
    // Note that this test simulates several property value editing, with delay between each keystrokes.
    // If this test become flaky in the future, it is likely that we will have to increase the timeout.
    await goToResource('elements/adornment-media.html');
    await toggleAdornerSetting('media');
    await focusElementsTree();
    await prepareElementsTab();

    await waitForAdorners([
      {textContent: 'media', isActive: false},
      {textContent: 'media', isActive: false},
    ]);

    // Select the first video element.
    const {frontend} = getBrowserAndPages();
    await frontend.keyboard.press('ArrowDown');
    await waitForAdornerOnSelectedNode('media');

    // Select the second audio element.
    await frontend.keyboard.press('ArrowDown');
    await waitForAdornerOnSelectedNode('media');
  });

  it('displays container query adorners', async () => {
    await goToResource('elements/adornment-container-query.html');
    await prepareElementsTab();

    await waitForAdorners([
      {textContent: 'container', isActive: false},
    ]);
  });

  it('can toggle adorners', async () => {
    await goToResource('elements/adornment.html');
    await prepareElementsTab();

    await waitForAdorners([
      {textContent: 'grid', isActive: false},
      {textContent: 'subgrid', isActive: false},
      {textContent: 'subgrid', isActive: false},
      {textContent: 'subgrid', isActive: false},
      {textContent: 'grid', isActive: false},
      {textContent: 'flex', isActive: false},
      {textContent: 'flex', isActive: false},
    ]);

    // Toggle both grid adorners on and try to select them with the active selector
    await click(INACTIVE_GRID_ADORNER_SELECTOR);
    await click(INACTIVE_GRID_ADORNER_SELECTOR);

    await waitForAdorners([
      {textContent: 'grid', isActive: true},
      {textContent: 'subgrid', isActive: true},
      {textContent: 'subgrid', isActive: false},
      {textContent: 'subgrid', isActive: false},
      {textContent: 'grid', isActive: false},
      {textContent: 'flex', isActive: false},
      {textContent: 'flex', isActive: false},
    ]);
  });

  it('does not display adorners on shadow roots when their parents are grid or flex containers', async () => {
    await goToResource('elements/adornment-shadow.html');
    await prepareElementsTab();

    await waitForAdorners([
      {textContent: 'grid', isActive: false},
      {textContent: 'flex', isActive: false},
    ]);
  });

  it('updates when display properties change', async () => {
    // Note that this test simulates several property value editing, like a user would type, with delay between
    // keystrokes. So if this test became flaky in the future, we'd likely have to increase the timeout.
    await goToResource('elements/adornment.html');
    await prepareElementsTab();

    // Select the first element.
    const {frontend} = getBrowserAndPages();
    await frontend.keyboard.press('ArrowDown');

    await waitForAdornerOnSelectedNode('grid');

    await editCSSProperty('.grid', 'display', 'flex');
    await waitForAdornerOnSelectedNode('flex');

    await editCSSProperty('.grid', 'display', 'inline-grid');
    await waitForAdornerOnSelectedNode('grid');
  });

  it('displays scroll adorner for an element with overflow:scroll and scrollable contents', async () => {
    await goToResource('elements/adornment-scroll.html');
    await prepareElementsTab();
    await waitForAndClickTreeElementWithPartialText('scroller');

    await waitForAdornerOnSelectedNode('scroll');
  });

  it('displays scroll adorner for an element with `overflow: hidden` changed to `overflow: scroll`', async () => {
    await goToResource('elements/adornment-scroll.html');
    await prepareElementsTab();
    await waitForAndClickTreeElementWithPartialText('overflow-hidden');
    await waitForNoAdornersOnSelectedNode();

    await editCSSProperty('#overflow-hidden', 'overflow', 'scroll');
    await waitForAdornerOnSelectedNode('scroll');
  });

  it('displays scroll adorner for an element with `overflow: visible` changed to `overflow: scroll`', async () => {
    await goToResource('elements/adornment-scroll.html');
    await prepareElementsTab();
    await waitForAndClickTreeElementWithPartialText('overflow-visible');
    await waitForNoAdornersOnSelectedNode();

    await editCSSProperty('#overflow-visible', 'overflow', 'scroll');
    await waitForAdornerOnSelectedNode('scroll');
  });

  it('removes scroll adorner for an element with `overflow: scroll` changed to `overflow: visible`', async () => {
    await goToResource('elements/adornment-scroll.html');
    await prepareElementsTab();
    await waitForAndClickTreeElementWithPartialText('overflow-scroll');
    await waitForAdornerOnSelectedNode('scroll');

    await editCSSProperty('#overflow-scroll', 'overflow', 'visible');
    await waitForNoAdornersOnSelectedNode();
  });

  it('removes scroll adorner for an element whose content shrinks', async () => {
    await goToResource('elements/adornment-scroll.html');
    const {target} = getBrowserAndPages();
    await prepareElementsTab();
    await waitForAndClickTreeElementWithPartialText('content-shrinking');
    await waitForAdornerOnSelectedNode('scroll');

    await target.evaluate(() => {
      document.getElementById('content-shrinking')?.classList.add('shrunk');
    });
    await waitForNoAdornersOnSelectedNode();
  });

  it('displays scroll adorner for document node in an iframe', async () => {
    await goToResource('elements/adornment-scroll.html');
    const {frontend} = getBrowserAndPages();
    await prepareElementsTab();

    await waitForAndClickTreeElementWithPartialText('iframe');
    await waitForPartialContentOfSelectedElementsNode('"iframe"');
    await waitForNoAdornersOnSelectedNode();

    await frontend.keyboard.press('ArrowDown');
    await waitForPartialContentOfSelectedElementsNode('document');
    await waitForNoAdornersOnSelectedNode();

    await frontend.keyboard.press('ArrowDown');
    await waitForPartialContentOfSelectedElementsNode('<html>');
    await waitForAdornerOnSelectedNode('scroll');

    await frontend.keyboard.press('ArrowDown');
    await frontend.keyboard.press('ArrowLeft');
    await frontend.keyboard.press('ArrowDown');
    await waitForPartialContentOfSelectedElementsNode('<body>');
    await waitForNoAdornersOnSelectedNode();
  });

  it('displays scroll adorner for the body node in an iframe', async () => {
    await goToResource('elements/adornment-scroll.html');
    const {frontend} = getBrowserAndPages();
    await prepareElementsTab();

    await waitForAndClickTreeElementWithPartialText('iframe-with-scrollable-body');
    await waitForPartialContentOfSelectedElementsNode('"iframe-with-scrollable-body"');
    await waitForNoAdornersOnSelectedNode();

    await frontend.keyboard.press('ArrowDown');
    await waitForPartialContentOfSelectedElementsNode('document');
    await waitForNoAdornersOnSelectedNode();

    await frontend.keyboard.press('ArrowDown');
    await waitForPartialContentOfSelectedElementsNode('DOCTYPE');
    await waitForNoAdornersOnSelectedNode();

    await frontend.keyboard.press('ArrowDown');
    await waitForPartialContentOfSelectedElementsNode('<html>');
    await waitForNoAdornersOnSelectedNode();

    await frontend.keyboard.press('ArrowDown');
    await frontend.keyboard.press('ArrowLeft');
    await frontend.keyboard.press('ArrowDown');
    await waitForPartialContentOfSelectedElementsNode('<body>');
    await waitForAdornerOnSelectedNode('scroll');
  });

  it('removes scroll adorner for an document element whose body shrinks', async () => {
    await goToResource('elements/adornment-scroll.html');
    const {target, frontend} = getBrowserAndPages();
    await prepareElementsTab();

    await waitForAndClickTreeElementWithPartialText('iframe-with-shrinking-body');
    await waitForPartialContentOfSelectedElementsNode('"iframe-with-shrinking-body"');
    await waitForNoAdornersOnSelectedNode();

    await frontend.keyboard.press('ArrowDown');
    await waitForPartialContentOfSelectedElementsNode('document');
    await waitForNoAdornersOnSelectedNode();

    await frontend.keyboard.press('ArrowDown');
    await waitForPartialContentOfSelectedElementsNode('body-shrinking');
    await waitForAdornerOnSelectedNode('scroll');

    await target.evaluate(() => {
      const frame = document.getElementById('iframe-with-shrinking-body') as HTMLIFrameElement;
      const doc = frame.contentDocument;
      if (doc) {
        doc.getElementById('body-shrinking')?.classList.add('shrunk');
      }
    });

    await waitForNoAdornersOnSelectedNode();
  });
});
