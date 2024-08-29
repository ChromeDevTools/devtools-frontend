// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, goToResource, step, waitFor, waitForFunction} from '../../shared/helper.js';

import {openSoftContextMenuAndClickOnItem} from '../helpers/context-menu-helpers.js';
import {
  expandSelectedNodeRecursively,
  waitForAdorners,
  waitForPartialContentOfSelectedElementsNode,
  waitForSelectedTreeElementSelectorWhichIncludesText,
} from '../helpers/elements-helpers.js';
import {expandIssue, navigateToIssuesTab, revealNodeInElementsPanel} from '../helpers/issues-helpers.js';

// TODO: Add a second node reveal test, where am issue is produced by an OOPIF

describe('The Issues tab', () => {
  it('should reveal an element in the Elements panel when the node icon is clicked', async () => {
    await goToResource('elements/element-reveal-inline-issue.html');

    await navigateToIssuesTab();
    await expandIssue();
    await revealNodeInElementsPanel();

    await waitForSelectedTreeElementSelectorWhichIncludesText('alert("This should be blocked by CSP");');
  });
});

describe('The Elements panel', () => {
  it('has a context menu link from an iframe to the corresponding frame details view', async () => {
    await goToResource('application/main-frame.html');
    await openSoftContextMenuAndClickOnItem('[aria-label="</iframe>"]', 'Show iframe details');

    await step('Frame details report with correct title is shown', async () => {
      await waitForFunction(async () => {
        const reportTitleNode = await waitFor('.report-title');
        const reportTitle = await reportTitleNode.evaluate(e => e.textContent);
        return reportTitle === 'frameId (iframe.html)';
      });
    });

    await step('The correct frame is selected in the sidebar', async () => {
      await waitFor('[aria-label="frameId (iframe.html)"][aria-selected="true"]');
    });
  });

  it('has link from a slot to assigned elements', async () => {
    await goToResource('elements/slot-element.html');
    await expandSelectedNodeRecursively();
    await click('[aria-label="reveal"]');
    await waitForPartialContentOfSelectedElementsNode('<h1>​headline​</h1>');
  });

  it('has link from a slot element to a slot', async () => {
    await goToResource('elements/slot-element.html');
    await expandSelectedNodeRecursively();
    await waitForAdorners(([
      {textContent: 'reveal', isActive: false},
      {textContent: 'slot', isActive: false},
    ]));
    await click('[aria-label="slot"]');
    await waitForPartialContentOfSelectedElementsNode('<slot>');
  });
});
