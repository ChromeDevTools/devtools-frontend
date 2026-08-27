// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  ACTIVE_GRID_ADORNER_SELECTOR,
  ACTIVE_STARTING_STYLE_ADORNER_SELECTOR,
  editCSSProperty,
  expandSelectedNodeRecursively,
  focusElementsTree,
  getComputedStylesForDomNode,
  INACTIVE_GRID_ADORNER_SELECTOR,
  INACTIVE_STARTING_STYLE_ADORNER_SELECTOR,
  toggleAdornerSetting,
  waitForAdornerOnSelectedNode,
  waitForAdorners,
  waitForAndClickTreeElementWithPartialText,
  waitForElementsStyleSection,
  waitForNoAdornersOnSelectedNode,
  waitForPartialContentOfSelectedElementsNode,
  waitForSpecificAdornerOnSelectedNode,
} from '../helpers/elements-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';

const prepareElementsTab = async (devToolsPage: DevToolsPage) => {
  await waitForElementsStyleSection(devToolsPage, null);
  await expandSelectedNodeRecursively(devToolsPage);
};

describe('Adornment in the Elements Tab', function() {
  // This test relies on the context menu which takes a while to appear, so we bump the timeout a bit.
  if (this.timeout() > 0) {
    this.timeout(20000);
  }

  it('displays a starting-style adorner for elements with starting styles', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/adornment-starting-style.html');
    await prepareElementsTab(devToolsPage);

    await waitForAdorners(devToolsPage, [
      {textContent: 'view-source', isActive: false},
      {textContent: 'starting-style', isActive: false},
      {textContent: 'starting-style', isActive: false},
    ]);
  });

  it('displays a starting-style adorner for selected elements with starting styles',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('elements/adornment-starting-style.html');
       await prepareElementsTab(devToolsPage);

       await waitForAndClickTreeElementWithPartialText(devToolsPage, 'no-starting-style');
       await waitForNoAdornersOnSelectedNode(devToolsPage);

       await waitForAndClickTreeElementWithPartialText(devToolsPage, 'with-inner-starting-style');
       await waitForAdornerOnSelectedNode(devToolsPage, 'starting-style');

       await waitForAndClickTreeElementWithPartialText(devToolsPage, 'with-outer-starting-style');
       await waitForAdornerOnSelectedNode(devToolsPage, 'starting-style');
     });

  it('enforces starting styles when clicking the adorner', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/adornment-starting-style.html');
    await prepareElementsTab(devToolsPage);

    await devToolsPage.click(INACTIVE_STARTING_STYLE_ADORNER_SELECTOR);

    await waitForAdorners(devToolsPage,
                          [
                            {textContent: 'view-source', isActive: false},
                            {textContent: 'starting-style', isActive: true},
                            {textContent: 'starting-style', isActive: false},
                          ],
                          ACTIVE_STARTING_STYLE_ADORNER_SELECTOR);

    const backgroundColorComputedStyle =
        await getComputedStylesForDomNode(inspectedPage, '.with-inner-starting-style', 'backgroundColor');
    assert.strictEqual(backgroundColorComputedStyle, 'rgb(0, 128, 0)');
  });

  it('displays grid and flex adorners', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/adornment.html');
    await prepareElementsTab(devToolsPage);

    await waitForAdorners(devToolsPage, [
      {textContent: 'view-source', isActive: false},
      {textContent: 'grid', isActive: false},
      {textContent: 'subgrid', isActive: false},
      {textContent: 'subgrid', isActive: false},
      {textContent: 'subgrid', isActive: false},
      {textContent: 'grid', isActive: false},
      {textContent: 'flex', isActive: false},
      {textContent: 'flex', isActive: false},
    ]);
  });

  it('displays grid-lanes adorners', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/adornment-grid-lanes.html');
    await prepareElementsTab(devToolsPage);

    await waitForAdorners(devToolsPage, [
      {textContent: 'view-source', isActive: false},
      {textContent: 'grid-lanes', isActive: false},
      {textContent: 'grid-lanes', isActive: false},
    ]);
  });

  it('displays scroll-snap adorners', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/adornment-scroll-snap.html');
    await prepareElementsTab(devToolsPage);

    await waitForAdorners(devToolsPage, [
      {textContent: 'view-source', isActive: false},
      {textContent: 'scroll-snap', isActive: false},
      {textContent: 'scroll', isActive: false},
    ]);
  });

  it('displays media adorner for video and audio elements', async ({devToolsPage, inspectedPage}) => {
    // Note that this test simulates several property value editing, with delay between each keystrokes.
    // If this test become flaky in the future, it is likely that we will have to increase the timeout.
    await inspectedPage.goToResource('elements/adornment-media.html');
    await toggleAdornerSetting(devToolsPage, 'media');
    await focusElementsTree(devToolsPage);
    await prepareElementsTab(devToolsPage);

    await waitForAdorners(devToolsPage, [
      {textContent: 'view-source', isActive: false},
      {textContent: 'media', isActive: false},
      {textContent: 'media', isActive: false},
    ]);

    // Select the first video element.
    await devToolsPage.pressKey('ArrowDown');
    await waitForAdornerOnSelectedNode(devToolsPage, 'media');

    // Select the second audio element.
    await devToolsPage.pressKey('ArrowDown');
    await waitForAdornerOnSelectedNode(devToolsPage, 'media');
  });

  it('opens sources panel with main document when view-source adorner is clicked',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('elements/adornment-view-source.html');
       await prepareElementsTab(devToolsPage);

       await waitForAdorners(devToolsPage, [
         {textContent: 'view-source', isActive: false},
       ]);

       await devToolsPage.click('devtools-adorner');

       await devToolsPage.waitFor('div[aria-label="Sources panel"]');

       await devToolsPage.waitFor('[aria-label="adornment-view-source.html"][aria-selected="true"]');
     });

  it('displays custom-element adorner and opens definition in sources panel when clicked',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('elements/adornment-custom-element.html');
       await prepareElementsTab(devToolsPage);

       await waitForAdorners(devToolsPage, [
         {textContent: 'view-source', isActive: false},
         {textContent: 'custom-element', isActive: false},
         {textContent: 'custom-element', isActive: false},
       ]);

       const customElementAdorner = await devToolsPage.waitFor('devtools-adorner.custom-element');
       await customElementAdorner.click();

       await devToolsPage.waitFor('div[aria-label="Sources panel"]');
       await devToolsPage.waitFor('[aria-label="adornment-custom-element.html"][aria-selected="true"]');
     });

  it('displays container query adorners', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/adornment-container-query.html');
    await prepareElementsTab(devToolsPage);

    await waitForAdorners(devToolsPage, [
      {textContent: 'view-source', isActive: false},
      {textContent: 'inline-size', isActive: false},
    ]);
  });

  it('does not display container adorner for normal container type', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/adornment-container-query.html');
    await prepareElementsTab(devToolsPage);

    await waitForAndClickTreeElementWithPartialText(devToolsPage, 'container-normal');
    await waitForNoAdornersOnSelectedNode(devToolsPage);
  });

  it('can toggle adorners', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/adornment.html');
    await prepareElementsTab(devToolsPage);

    await waitForAdorners(devToolsPage, [
      {textContent: 'view-source', isActive: false},
      {textContent: 'grid', isActive: false},
      {textContent: 'subgrid', isActive: false},
      {textContent: 'subgrid', isActive: false},
      {textContent: 'subgrid', isActive: false},
      {textContent: 'grid', isActive: false},
      {textContent: 'flex', isActive: false},
      {textContent: 'flex', isActive: false},
    ]);

    // Toggle both grid adorners on and try to select them with the active selector
    await devToolsPage.click(INACTIVE_GRID_ADORNER_SELECTOR);
    await devToolsPage.waitFor(ACTIVE_GRID_ADORNER_SELECTOR);
    await devToolsPage.click(INACTIVE_GRID_ADORNER_SELECTOR);

    await waitForAdorners(devToolsPage, [
      {textContent: 'view-source', isActive: false},
      {textContent: 'grid', isActive: true},
      {textContent: 'subgrid', isActive: true},
      {textContent: 'subgrid', isActive: false},
      {textContent: 'subgrid', isActive: false},
      {textContent: 'grid', isActive: false},
      {textContent: 'flex', isActive: false},
      {textContent: 'flex', isActive: false},
    ]);
  });

  it('does not display adorners on shadow roots when their parents are grid or flex containers',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('elements/adornment-shadow.html');
       await prepareElementsTab(devToolsPage);

       await waitForAdorners(devToolsPage, [
         {textContent: 'view-source', isActive: false},
         {textContent: 'grid', isActive: false},
         {textContent: 'flex', isActive: false},
       ]);
     });

  it('updates when display properties change', async ({devToolsPage, inspectedPage}) => {
    // Note that this test simulates several property value editing, like a user would type, with delay between
    // keystrokes. So if this test became flaky in the future, we'd likely have to increase the timeout.
    await inspectedPage.goToResource('elements/adornment.html');
    await prepareElementsTab(devToolsPage);

    // Select the first element.
    await devToolsPage.pressKey('ArrowDown');

    await waitForAdornerOnSelectedNode(devToolsPage, 'grid');

    await editCSSProperty(devToolsPage, '.grid', 'display', 'flex');
    await waitForAdornerOnSelectedNode(devToolsPage, 'flex');

    await editCSSProperty(devToolsPage, '.grid', 'display', 'inline-grid');
    await waitForAdornerOnSelectedNode(devToolsPage, 'grid');
  });

  it('displays scroll adorner for an element with overflow:scroll and scrollable contents',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('elements/adornment-scroll.html');
       await prepareElementsTab(devToolsPage);
       await waitForAndClickTreeElementWithPartialText(devToolsPage, 'scroller');

       await waitForAdornerOnSelectedNode(devToolsPage, 'scroll');
     });

  it('displays scroll adorner for an element with `overflow: hidden` changed to `overflow: scroll`',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('elements/adornment-scroll.html');
       await prepareElementsTab(devToolsPage);
       await waitForAndClickTreeElementWithPartialText(devToolsPage, 'overflow-hidden');
       await waitForNoAdornersOnSelectedNode(devToolsPage);

       await editCSSProperty(devToolsPage, '#overflow-hidden', 'overflow', 'scroll');
       await waitForAdornerOnSelectedNode(devToolsPage, 'scroll');
     });

  it('displays scroll adorner for an element with `overflow: visible` changed to `overflow: scroll`',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('elements/adornment-scroll.html');
       await prepareElementsTab(devToolsPage);
       await waitForAndClickTreeElementWithPartialText(devToolsPage, 'overflow-visible');
       await waitForNoAdornersOnSelectedNode(devToolsPage);

       await editCSSProperty(devToolsPage, '#overflow-visible', 'overflow', 'scroll');
       await waitForAdornerOnSelectedNode(devToolsPage, 'scroll');
     });

  it('removes scroll adorner for an element with `overflow: scroll` changed to `overflow: visible`',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('elements/adornment-scroll.html');
       await prepareElementsTab(devToolsPage);
       await waitForAndClickTreeElementWithPartialText(devToolsPage, 'overflow-scroll');
       await waitForAdornerOnSelectedNode(devToolsPage, 'scroll');

       await editCSSProperty(devToolsPage, '#overflow-scroll', 'overflow', 'visible');
       await waitForNoAdornersOnSelectedNode(devToolsPage);
     });

  it('removes scroll adorner for an element whose content shrinks', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/adornment-scroll.html');
    await prepareElementsTab(devToolsPage);
    await waitForAndClickTreeElementWithPartialText(devToolsPage, 'content-shrinking');
    await waitForAdornerOnSelectedNode(devToolsPage, 'scroll');

    await inspectedPage.evaluate(() => {
      document.getElementById('content-shrinking')?.classList.add('shrunk');
    });
    await waitForNoAdornersOnSelectedNode(devToolsPage);
  });

  it('displays scroll adorner for document node in an iframe', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/adornment-scroll.html');
    await prepareElementsTab(devToolsPage);

    await waitForAndClickTreeElementWithPartialText(devToolsPage, 'iframe');
    await waitForPartialContentOfSelectedElementsNode(devToolsPage, '"iframe"');
    await waitForNoAdornersOnSelectedNode(devToolsPage);

    await devToolsPage.pressKey('ArrowDown');
    await waitForPartialContentOfSelectedElementsNode(devToolsPage, 'document');
    await waitForNoAdornersOnSelectedNode(devToolsPage);

    await devToolsPage.pressKey('ArrowDown');
    await waitForPartialContentOfSelectedElementsNode(devToolsPage, '<html>');
    await waitForSpecificAdornerOnSelectedNode(devToolsPage, 'devtools-adorner.scroll');

    await devToolsPage.pressKey('ArrowDown');
    await devToolsPage.pressKey('ArrowLeft');
    await devToolsPage.pressKey('ArrowDown');
    await waitForPartialContentOfSelectedElementsNode(devToolsPage, '<body>');
    await waitForNoAdornersOnSelectedNode(devToolsPage);
  });

  it('displays scroll adorner for the body node in an iframe', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/adornment-scroll.html');
    await prepareElementsTab(devToolsPage);

    await waitForAndClickTreeElementWithPartialText(devToolsPage, 'iframe-with-scrollable-body');
    await waitForPartialContentOfSelectedElementsNode(devToolsPage, '"iframe-with-scrollable-body"');
    await waitForNoAdornersOnSelectedNode(devToolsPage);

    await devToolsPage.pressKey('ArrowDown');
    await waitForPartialContentOfSelectedElementsNode(devToolsPage, 'document');
    await waitForNoAdornersOnSelectedNode(devToolsPage);

    await devToolsPage.pressKey('ArrowDown');
    await waitForPartialContentOfSelectedElementsNode(devToolsPage, 'DOCTYPE');
    await waitForNoAdornersOnSelectedNode(devToolsPage);

    await devToolsPage.pressKey('ArrowDown');
    await waitForPartialContentOfSelectedElementsNode(devToolsPage, '<html>');
    await waitForAdornerOnSelectedNode(devToolsPage, 'view-source');

    await devToolsPage.pressKey('ArrowDown');
    await devToolsPage.pressKey('ArrowLeft');
    await devToolsPage.pressKey('ArrowDown');
    await waitForPartialContentOfSelectedElementsNode(devToolsPage, '<body>');
    await waitForAdornerOnSelectedNode(devToolsPage, 'scroll');
  });

  it('removes scroll adorner for an document element whose body shrinks', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/adornment-scroll.html');
    await prepareElementsTab(devToolsPage);

    await waitForAndClickTreeElementWithPartialText(devToolsPage, 'iframe-with-shrinking-body');
    await waitForPartialContentOfSelectedElementsNode(devToolsPage, '"iframe-with-shrinking-body"');
    await waitForNoAdornersOnSelectedNode(devToolsPage);

    await devToolsPage.pressKey('ArrowDown');
    await waitForPartialContentOfSelectedElementsNode(devToolsPage, 'document');
    await waitForNoAdornersOnSelectedNode(devToolsPage);

    await devToolsPage.pressKey('ArrowDown');
    await waitForPartialContentOfSelectedElementsNode(devToolsPage, 'body-shrinking');
    await waitForSpecificAdornerOnSelectedNode(devToolsPage, 'devtools-adorner.scroll');

    await inspectedPage.evaluate(() => {
      const frame = document.getElementById('iframe-with-shrinking-body') as HTMLIFrameElement;
      const doc = frame.contentDocument;
      if (doc) {
        doc.getElementById('body-shrinking')?.classList.add('shrunk');
      }
    });

    await waitForAdornerOnSelectedNode(devToolsPage, 'view-source');
  });

  it('displays popover adorners', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/adornment-popover.html');
    await prepareElementsTab(devToolsPage);

    await waitForAdorners(devToolsPage, [
      {textContent: 'view-source', isActive: false},
      {textContent: 'popover', isActive: false},
      {textContent: 'popover', isActive: false},
    ]);
  });

  it('can toggle popover adorner', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/adornment-popover.html');
    await prepareElementsTab(devToolsPage);

    const activePopoverSelector = '[aria-label="Stop keeping this popover open"]';
    await waitForAdorners(devToolsPage,
                          [
                            {textContent: 'view-source', isActive: false},
                            {textContent: 'popover', isActive: false},
                            {textContent: 'popover', isActive: false},
                          ],
                          activePopoverSelector);

    let adorners = await devToolsPage.$$('[aria-label="Keep this popover open"]');
    await adorners[0].click();
    await waitForAdorners(devToolsPage,
                          [
                            {textContent: 'view-source', isActive: false},
                            {textContent: 'popover', isActive: true},
                            {textContent: 'top-layer (1)', isActive: false},
                            {textContent: 'popover', isActive: false},
                            {textContent: 'reveal', isActive: false},
                            {textContent: 'reveal', isActive: false},
                          ],
                          activePopoverSelector);

    adorners = await devToolsPage.$$('[aria-label="Stop keeping this popover open"]');
    await adorners[0].click();
    await waitForAdorners(devToolsPage,
                          [
                            {textContent: 'view-source', isActive: false},
                            {textContent: 'popover', isActive: false},
                            {textContent: 'popover', isActive: false},
                          ],
                          activePopoverSelector);
  });

  it('popover adorner does not toggled off when another popover is force-opened',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('elements/adornment-popover.html');
       await prepareElementsTab(devToolsPage);

       const activePopoverSelector = '[aria-label="Stop keeping this popover open"]';
       await waitForAdorners(devToolsPage,
                             [
                               {textContent: 'view-source', isActive: false},
                               {textContent: 'popover', isActive: false},
                               {textContent: 'popover', isActive: false},
                             ],
                             activePopoverSelector);

       let adorners = await devToolsPage.$$('[aria-label="Keep this popover open"]');
       await adorners[0].click();
       await waitForAdorners(devToolsPage,
                             [
                               {textContent: 'view-source', isActive: false},
                               {textContent: 'popover', isActive: true},
                               {textContent: 'top-layer (1)', isActive: false},
                               {textContent: 'popover', isActive: false},
                               {textContent: 'reveal', isActive: false},
                               {textContent: 'reveal', isActive: false},
                             ],
                             activePopoverSelector);

       adorners = await devToolsPage.$$('[aria-label="Keep this popover open"]');
       await adorners[0].click();
       await waitForAdorners(devToolsPage,
                             [
                               {textContent: 'view-source', isActive: false},
                               {textContent: 'popover', isActive: true},
                               {textContent: 'top-layer (1)', isActive: false},
                               {textContent: 'popover', isActive: true},
                               {textContent: 'top-layer (2)', isActive: false},
                               {textContent: 'reveal', isActive: false},
                               {textContent: 'reveal', isActive: false},
                               {textContent: 'reveal', isActive: false},
                               {textContent: 'reveal', isActive: false},
                             ],
                             activePopoverSelector);
     });
});
