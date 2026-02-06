// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  elementWithPartialText,
  getContentOfSelectedNode,
  waitForAndClickTreeElementWithPartialText,
  waitForChildrenOfSelectedElementNode,
  waitForPartialContentOfSelectedElementsNode,
  waitForSelectedNodeChange,
} from '../helpers/elements-helpers.js';

function assertStartsWith(actual: string, expected: string): void {
  assert.strictEqual(actual.substring(0, expected.length), expected);
}

describe('The Elements tab', function() {
  it('shows adopted stylesheets in document root', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/adopted-stylesheet.html');
    const tree = await devToolsPage.waitForAria('Page DOM');
    const treeContent = await devToolsPage.waitForTextNotMatching(tree, /^\<html\>/);
    const expectedAdoptedStyleSheet = '#adopted-style-sheets#adopted-style-sheet/* For document */';
    assertStartsWith(treeContent, expectedAdoptedStyleSheet);
  });

  it('updates adopted stylesheets in document root', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/adopted-stylesheet.html');
    const tree = await devToolsPage.waitForAria('Page DOM');
    const initialAdoptedStyleSheet = '#adopted-style-sheets#adopted-style-sheet/* For document */';
    assertStartsWith(await tree.evaluate(e => e.textContent), initialAdoptedStyleSheet);
    await inspectedPage.evaluate(() => {
      document.adoptedStyleSheets = [];
    });
    assertStartsWith(await devToolsPage.waitForTextNotMatching(tree, /^#adopted-style-sheet/), '<html>');
    await inspectedPage.evaluate(() => {
      document.adoptedStyleSheets = [new CSSStyleSheet(), new CSSStyleSheet()];
    });
    assertStartsWith(
        await devToolsPage.waitForTextNotMatching(tree, /^\<html\>/),
        '#adopted-style-sheets#adopted-style-sheet#adopted-style-sheet<html>');
    await inspectedPage.evaluate(() => {
      document.adoptedStyleSheets[0].replaceSync('/**/');
    });
    assertStartsWith(
        await devToolsPage.waitForTextNotMatching(
            tree, /^#adopted-style-sheets#adopted-style-sheet#adopted-style-sheet/),
        '#adopted-style-sheets#adopted-style-sheet/**/#adopted-style-sheet<html>');
  });

  it('shows link to imported stylesheet', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/adopted-stylesheet.html');
    const tree = await devToolsPage.waitForAria('Page DOM');
    // Wait until adopted stylesheets have been reported.
    await devToolsPage.waitForTextNotMatching(tree, /^\<html\>/);

    // Check to make sure we have the correct node selected after opening a file
    await waitForPartialContentOfSelectedElementsNode('<body>', devToolsPage);
    // This isn't consistently expanded, so this arrow right might expand it
    // or it might move the selected node, but either way it should change
    // the text of the selected node.
    const bodyNodeText = await getContentOfSelectedNode(devToolsPage);
    await devToolsPage.pressKey('ArrowRight');
    await waitForSelectedNodeChange(bodyNodeText, devToolsPage);

    // Click the node for this test.
    await waitForAndClickTreeElementWithPartialText('"with-constructed-stylesheet-import"', devToolsPage);

    // Expand and navigate to its shadow root.
    await devToolsPage.pressKey('ArrowRight');
    await waitForChildrenOfSelectedElementNode(devToolsPage);
    await devToolsPage.pressKey('ArrowRight');
    await waitForPartialContentOfSelectedElementsNode('#shadow-root', devToolsPage);

    // One more time to get the adopted stylesheet set.
    await devToolsPage.pressKey('ArrowRight');
    await waitForChildrenOfSelectedElementNode(devToolsPage);
    await devToolsPage.pressKey('ArrowRight');
    await waitForPartialContentOfSelectedElementsNode('#adopted-style-sheets', devToolsPage);

    // One more time to get the adopted stylesheet.
    await devToolsPage.pressKey('ArrowRight');
    await waitForChildrenOfSelectedElementNode(devToolsPage);
    await devToolsPage.pressKey('ArrowRight');
    await waitForPartialContentOfSelectedElementsNode('#adopted-style-sheet \(', devToolsPage);

    // Check that the link to the imported stylesheet is present.
    assert.match(
        await getContentOfSelectedNode(devToolsPage),
        /#adopted-style-sheet \(https?:\/\/.*\/test\/e2e\/resources\/elements\/adopted-style.css\)/);
  });

  it('reveals adopted stylesheets in document root when clicking link from styles pane',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('elements/adopted-stylesheet.html');
       const tree = await devToolsPage.waitForAria('Page DOM');
       await devToolsPage.waitForTextNotMatching(tree, /^\<html\>/);
       const styleSheets = await elementWithPartialText('#adopted-style-sheets', devToolsPage);
       assert.isOk(styleSheets);
       const expectExpanded = async (expanded: boolean) =>
           assert.strictEqual(await styleSheets.evaluate(e => e.getAttribute('aria-expanded')), `${expanded}`);
       await expectExpanded(false);

       // Check to make sure we have the correct node selected after opening a file
       await waitForPartialContentOfSelectedElementsNode('<body>', devToolsPage);
       // This isn't consistently expanded, so this arrow right might expand it
       // or it might move the selected node, but either way it should change
       // the text of the selected node.
       const bodyNodeText = await getContentOfSelectedNode(devToolsPage);
       await devToolsPage.pressKey('ArrowRight');
       await waitForSelectedNodeChange(bodyNodeText, devToolsPage);

       // Click the node for this test.
       await waitForAndClickTreeElementWithPartialText('"from-document"', devToolsPage);

       // Click the link to the adopted stylesheet in the styles pane.
       await devToolsPage.click(
           '.matched-styles[aria-label=".from-document, css selector"] > .styles-section-subtitle > devtools-widget');

       // The adopted stylesheet set should now be expanded.
       await devToolsPage.waitForClass(styleSheets, 'expanded');
       await expectExpanded(true);
     });
});
