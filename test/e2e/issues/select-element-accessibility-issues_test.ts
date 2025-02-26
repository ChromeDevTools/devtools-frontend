// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined, goToResource} from '../../shared/helper.js';
import {
  ensureResourceSectionIsExpanded,
  getAndExpandSpecificIssueByTitle,
  getResourcesElement,
  navigateToIssuesTab,
  waitForTableFromResourceSectionContents,
} from '../helpers/issues-helpers.js';

describe('Select element accessibility issues test', () => {
  it('should display issue when there is a disallowed child of a select element', async () => {
    await goToResource('issues/select-element-accessibility-issue-DisallowedSelectChild.html');
    await navigateToIssuesTab();
    const issueElement = await getAndExpandSpecificIssueByTitle('Invalid element or text node within <select>');
    assertNotNullOrUndefined(issueElement);

    const section = await getResourcesElement('1 element', issueElement);
    await ensureResourceSectionIsExpanded(section);
    const expectedTableRows = [
      ['Disallowed descendant'],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows);
  });

  it('should display issue when there is a disallowed child of an optgroup element', async () => {
    await goToResource('issues/select-element-accessibility-issue-DisallowedOptGroupChild.html');
    await navigateToIssuesTab();
    const issueElement = await getAndExpandSpecificIssueByTitle('Invalid element or text node within <optgroup>');
    assertNotNullOrUndefined(issueElement);

    const section = await getResourcesElement('1 element', issueElement);
    await ensureResourceSectionIsExpanded(section);
    const expectedTableRows = [
      ['Disallowed descendant'],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows);
  });

  it('should display issue when there is a non-phrasing child element of an option element', async () => {
    await goToResource('issues/select-element-accessibility-issue-NonPhrasingContentOptionChild.html');
    await navigateToIssuesTab();
    const issueElement = await getAndExpandSpecificIssueByTitle('Non-phrasing content used within an <option> element');
    assertNotNullOrUndefined(issueElement);

    const section = await getResourcesElement('1 element', issueElement);
    await ensureResourceSectionIsExpanded(section);
    const expectedTableRows = [
      ['Disallowed descendant'],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows);
  });

  it('should display issue when there is an interactive child element of an option element', async () => {
    await goToResource('issues/select-element-accessibility-issue-InteractiveContentOptionChild.html');
    await navigateToIssuesTab();
    const issueElement = await getAndExpandSpecificIssueByTitle('Interactive element inside of an <option> element');
    assertNotNullOrUndefined(issueElement);

    const section = await getResourcesElement('1 element', issueElement);
    await ensureResourceSectionIsExpanded(section);
    const expectedTableRows = [
      ['Disallowed descendant'],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows);
  });

  it('should display issue when there is an interactive child element of a legend element', async () => {
    await goToResource('issues/select-element-accessibility-issue-InteractiveContentLegendChild.html');
    await navigateToIssuesTab();
    const issueElement = await getAndExpandSpecificIssueByTitle('Interactive element inside of a <legend> element');
    assertNotNullOrUndefined(issueElement);

    const section = await getResourcesElement('1 element', issueElement);
    await ensureResourceSectionIsExpanded(section);
    const expectedTableRows = [
      ['Disallowed descendant'],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows);
  });

  it('should display issue when there is an element with disallowed attributes as a child of a select element',
     async () => {
       await goToResource('issues/select-element-accessibility-issue-InteractiveAttributesSelectDescendant.html');
       await navigateToIssuesTab();
       const issueElement =
           await getAndExpandSpecificIssueByTitle('Element with invalid attributes within a <select> element');
       assertNotNullOrUndefined(issueElement);

       const section = await getResourcesElement('1 element', issueElement);
       await ensureResourceSectionIsExpanded(section);
       const expectedTableRows = [
         ['Disallowed descendant'],
       ];
       await waitForTableFromResourceSectionContents(section.content, expectedTableRows);
     });
});
