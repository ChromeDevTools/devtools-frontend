// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {openSoftContextMenuAndClickOnItem} from '../../e2e/helpers/context-menu-helpers.js';
import {
  expandSelectedNodeRecursively,
  waitForAdorners,
  waitForPartialContentOfSelectedElementsNode,
  waitForSelectedTreeElementSelectorWhichIncludesText,
} from '../../e2e/helpers/elements-helpers.js';
import {expandIssue, navigateToIssuesTab, revealNodeInElementsPanel} from '../../e2e/helpers/issues-helpers.js';
import {step} from '../../shared/helper.js';

describe('The Issues tab', () => {
  it('should reveal an element in the Elements panel when the node icon is clicked', async ({
                                                                                       devToolsPage,
                                                                                       inspectedPage,
                                                                                     }) => {
    await inspectedPage.goToResource('elements/element-reveal-inline-issue.html');

    await navigateToIssuesTab(devToolsPage);
    await expandIssue(devToolsPage);
    await revealNodeInElementsPanel(devToolsPage);

    await waitForSelectedTreeElementSelectorWhichIncludesText('alert("This should be blocked by CSP");', devToolsPage);
  });
});

describe('The Elements panel', () => {
  it('has a context menu link from an iframe to the corresponding frame details view', async ({
                                                                                         devToolsPage,
                                                                                         inspectedPage,
                                                                                       }) => {
    await inspectedPage.goToResource('application/main-frame.html');
    await openSoftContextMenuAndClickOnItem('[aria-label="</iframe>"]', 'Show iframe details', devToolsPage);

    await step('Frame details report with correct title is shown', async () => {
      await devToolsPage.waitForFunction(async () => {
        const reportTitleNode = await devToolsPage.waitFor('.report-title');
        const reportTitle = await reportTitleNode.evaluate(e => e.textContent);
        return reportTitle === 'frameId (iframe.html)';
      });
    });

    await step('The correct frame is selected in the sidebar', async () => {
      await devToolsPage.waitFor('[aria-label="frameId (iframe.html)"][aria-selected="true"]');
    });
  });

  it('has link from a slot to assigned elements', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/slot-element.html');
    await expandSelectedNodeRecursively(devToolsPage);
    await devToolsPage.click('[aria-label="reveal"]');
    await waitForPartialContentOfSelectedElementsNode('<h1>​headline​</h1>', devToolsPage);
  });

  it('has link from a slot element to a slot', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/slot-element.html');
    await expandSelectedNodeRecursively(devToolsPage);
    await waitForAdorners(
        ([
          {textContent: 'reveal', isActive: false},
          {textContent: 'slot', isActive: false},
        ]),
        devToolsPage);
    await devToolsPage.click('[aria-label="slot"]');
    await waitForPartialContentOfSelectedElementsNode('<slot>', devToolsPage);
  });
});
