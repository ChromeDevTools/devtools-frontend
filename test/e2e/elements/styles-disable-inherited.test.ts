// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  checkStyleAttributes,
  expandSelectedNodeRecursively,
  waitForElementsStyleSection,
} from '../helpers/elements-helpers.js';
import {
  expectVeEvents,
  veImpression,
} from '../helpers/visual-logging-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';

describe('The Elements tab', function() {
  const uncheckStylesPaneCheckbox = async (checkboxLabel: string, devToolsPage: DevToolsPage) => {
    await expectVeEvents([veImpression(`Panel: elements > Pane: styles > Section: style-properties > Tree > TreeItem: ${
                             checkboxLabel.split(' ')[0]} > Key`)],
                         undefined, devToolsPage);
    await devToolsPage.hover(`.enabled-button[aria-label="${checkboxLabel}"]`);
    await devToolsPage.click(`.enabled-button[aria-label="${checkboxLabel}"]`);
  };

  it(
      'does not break further style inspection if inherited style property was disabled',
      async ({devToolsPage, inspectedPage}) => {
        await inspectedPage.goToResource('elements/styles-disable-inherited.html');
        await expandSelectedNodeRecursively(devToolsPage);
        const elementsContentPanel = await devToolsPage.waitFor('#elements-content');
        await devToolsPage.click('text/nested', {
          root: elementsContentPanel,
        });
        await waitForElementsStyleSection(null, devToolsPage);
        await checkStyleAttributes(['display: block;', 'font-weight: bold;'], devToolsPage);
        await devToolsPage.click('text/container', {
          root: elementsContentPanel,
        });
        await uncheckStylesPaneCheckbox('font-weight bold', devToolsPage);
        await devToolsPage.click('text/nested', {
          root: elementsContentPanel,
        });
        await checkStyleAttributes(['display: block;'], devToolsPage);
      });
});
