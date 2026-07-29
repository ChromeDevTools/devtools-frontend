// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  ensureResourceSectionIsExpanded,
  getAndExpandSpecificIssueByTitle,
  getResourcesElement,
  navigateToIssuesTab,
  waitForTableFromResourceSectionContents,
} from '../helpers/issues-helpers.js';

describe('Select element accessibility issues test', () => {
  it('should display issue when there is a disallowed child of a select element',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('issues/select-element-accessibility-issue-DisallowedSelectChild.html');
       await navigateToIssuesTab(devToolsPage);
       const issueElement =
           await getAndExpandSpecificIssueByTitle(devToolsPage, 'Invalid element or text node within <select>');
       assert.isOk(issueElement);

       const section = await getResourcesElement(devToolsPage, '1 element', issueElement, undefined);
       await ensureResourceSectionIsExpanded(devToolsPage, section);
       const expectedTableRows = [
         ['Disallowed descendant'],
       ];
       await waitForTableFromResourceSectionContents(devToolsPage, section.content, expectedTableRows);
     });

  it('should display issue when there is a disallowed child of an optgroup element',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('issues/select-element-accessibility-issue-DisallowedOptGroupChild.html');
       await navigateToIssuesTab(devToolsPage);
       const issueElement =
           await getAndExpandSpecificIssueByTitle(devToolsPage, 'Invalid element or text node within <optgroup>');
       assert.isOk(issueElement);

       const section = await getResourcesElement(devToolsPage, '1 element', issueElement, undefined);
       await ensureResourceSectionIsExpanded(devToolsPage, section);
       const expectedTableRows = [
         ['Disallowed descendant'],
       ];
       await waitForTableFromResourceSectionContents(devToolsPage, section.content, expectedTableRows);
     });

  it('should display issue when there is a non-phrasing child element of an option element',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('issues/select-element-accessibility-issue-NonPhrasingContentOptionChild.html');
       await navigateToIssuesTab(devToolsPage);
       const issueElement =
           await getAndExpandSpecificIssueByTitle(devToolsPage, 'Non-phrasing content used within an <option> element');
       assert.isOk(issueElement);

       const section = await getResourcesElement(devToolsPage, '1 element', issueElement, undefined);
       await ensureResourceSectionIsExpanded(devToolsPage, section);
       const expectedTableRows = [
         ['Disallowed descendant'],
       ];
       await waitForTableFromResourceSectionContents(devToolsPage, section.content, expectedTableRows);
     });

  it('should display issue when there is an interactive child element of an option element',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('issues/select-element-accessibility-issue-InteractiveContentOptionChild.html');
       await navigateToIssuesTab(devToolsPage);
       const issueElement =
           await getAndExpandSpecificIssueByTitle(devToolsPage, 'Interactive element inside of an <option> element');
       assert.isOk(issueElement);

       const section = await getResourcesElement(devToolsPage, '1 element', issueElement, undefined);
       await ensureResourceSectionIsExpanded(devToolsPage, section);
       const expectedTableRows = [
         ['Disallowed descendant'],
       ];
       await waitForTableFromResourceSectionContents(devToolsPage, section.content, expectedTableRows);
     });

  it('should display issue when there is an interactive child element of a legend element',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('issues/select-element-accessibility-issue-InteractiveContentLegendChild.html');
       await navigateToIssuesTab(devToolsPage);
       const issueElement =
           await getAndExpandSpecificIssueByTitle(devToolsPage, 'Interactive element inside of a <legend> element');
       assert.isOk(issueElement);

       const section = await getResourcesElement(devToolsPage, '1 element', issueElement, undefined);
       await ensureResourceSectionIsExpanded(devToolsPage, section);
       const expectedTableRows = [
         ['Disallowed descendant'],
       ];
       await waitForTableFromResourceSectionContents(devToolsPage, section.content, expectedTableRows);
     });

  it('should display issue when there is an element with disallowed attributes as a child of a select element',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource(
           'issues/select-element-accessibility-issue-InteractiveAttributesSelectDescendant.html');
       await navigateToIssuesTab(devToolsPage);
       const issueElement = await getAndExpandSpecificIssueByTitle(
           devToolsPage, 'Element with invalid attributes within a <select> element');
       assert.isOk(issueElement);

       const section = await getResourcesElement(devToolsPage, '1 element', issueElement, undefined);
       await ensureResourceSectionIsExpanded(devToolsPage, section);
       const expectedTableRows = [
         ['Disallowed descendant'],
       ];
       await waitForTableFromResourceSectionContents(devToolsPage, section.content, expectedTableRows);
     });

  it('should display issue when there is an interactive element as a descendant of a summary element',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource(
           'issues/summary-element-accessibility-issue-InteractiveContentSummaryDescendant.html');
       await navigateToIssuesTab(devToolsPage);
       const issueElement =
           await getAndExpandSpecificIssueByTitle(devToolsPage, 'Interactive element inside of a <summary> element');
       assert.isOk(issueElement);

       const section = await getResourcesElement(devToolsPage, '1 element', issueElement, undefined);
       await ensureResourceSectionIsExpanded(devToolsPage, section);
       const expectedTableRows = [
         ['Disallowed descendant'],
       ];
       await waitForTableFromResourceSectionContents(devToolsPage, section.content, expectedTableRows);
     });
});
