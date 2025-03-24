// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  expandSelectedNodeRecursively,
  getDisplayedStyleRules,
  goToResourceAndWaitForStyleSection,
  waitForAndClickTreeElementWithPartialText,
  waitForElementsStyleSection,
  waitForStyleRule,
} from '../../e2e/helpers/elements-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';

const prepareElementsTab = async (devToolsPage: DevToolsPage) => {
  await waitForElementsStyleSection(null, devToolsPage);
  await expandSelectedNodeRecursively(devToolsPage);
};

describe('The Styles pane', () => {
  it('can show overridden shorthands as inactive (ported layout test)', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection('elements/css-shorthand-override.html', devToolsPage, inspectedPage);
    await prepareElementsTab(devToolsPage);
    await waitForStyleRule('body', devToolsPage);

    await waitForAndClickTreeElementWithPartialText('id=\u200B"inspected1"', devToolsPage);
    await waitForStyleRule('#inspected1', devToolsPage);
    const inspected1Rules = await getDisplayedStyleRules(devToolsPage);
    const expectedInspected1Rules = [
      {selectorText: 'element.style', propertyData: []},
      {
        selectorText: '#inspected1',
        propertyData: [
          {propertyName: 'margin-top', isOverLoaded: true, isInherited: false},
          {propertyName: 'margin', isOverLoaded: false, isInherited: false},
          {propertyName: 'margin-top', isOverLoaded: false, isInherited: false},
          {propertyName: 'margin-right', isOverLoaded: false, isInherited: false},
          {propertyName: 'margin-bottom', isOverLoaded: false, isInherited: false},
          {propertyName: 'margin-left', isOverLoaded: false, isInherited: false},
        ],
      },
      {
        selectorText: 'div',
        propertyData: [
          {propertyName: 'display', isOverLoaded: false, isInherited: false},
          {propertyName: 'unicode-bidi', isOverLoaded: false, isInherited: false},
        ],
      },
    ];
    assert.deepEqual(inspected1Rules, expectedInspected1Rules);

    await waitForAndClickTreeElementWithPartialText('id=\u200B"inspected2"', devToolsPage);
    await waitForStyleRule('#inspected2', devToolsPage);
    const inspected2Rules = await getDisplayedStyleRules(devToolsPage);

    const expectedInspected2Rules = [
      {selectorText: 'element.style', propertyData: []},
      {
        selectorText: '#inspected2',
        propertyData: [
          {propertyName: 'padding', isOverLoaded: true, isInherited: false},
          {propertyName: 'padding-top', isOverLoaded: false, isInherited: false},
          {propertyName: 'padding-right', isOverLoaded: false, isInherited: false},
          {propertyName: 'padding-bottom', isOverLoaded: false, isInherited: false},
          {propertyName: 'padding-left', isOverLoaded: false, isInherited: false},
          {propertyName: 'padding', isOverLoaded: false, isInherited: false},
          {propertyName: 'padding-top', isOverLoaded: false, isInherited: false},
          {propertyName: 'padding-right', isOverLoaded: false, isInherited: false},
          {propertyName: 'padding-bottom', isOverLoaded: false, isInherited: false},
          {propertyName: 'padding-left', isOverLoaded: false, isInherited: false},
        ],
      },
      {
        selectorText: 'div',
        propertyData: [
          {propertyName: 'display', isOverLoaded: false, isInherited: false},
          {propertyName: 'unicode-bidi', isOverLoaded: false, isInherited: false},
        ],
      },
    ];
    assert.deepEqual(inspected2Rules, expectedInspected2Rules);
    await waitForAndClickTreeElementWithPartialText('id=\u200B"inspected3"', devToolsPage);
    await waitForStyleRule('#inspected3', devToolsPage);
    const inspected3Rules = await getDisplayedStyleRules(devToolsPage);
    const expectedInspected3Rules = [
      {
        selectorText: 'element.style',
        propertyData: [],
      },
      {
        selectorText: '#inspected3',
        propertyData: [
          {
            propertyName: 'border-width',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-top-width',
            isOverLoaded: true,
            isInherited: false,
          },
          {
            propertyName: 'border-right-width',
            isOverLoaded: true,
            isInherited: false,
          },
          {
            propertyName: 'border-bottom-width',
            isOverLoaded: true,
            isInherited: false,
          },
          {
            propertyName: 'border-left-width',
            isOverLoaded: true,
            isInherited: false,
          },
          {
            propertyName: 'border',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-top-width',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-right-width',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-bottom-width',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-left-width',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-top-style',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-right-style',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-bottom-style',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-left-style',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-top-color',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-right-color',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-bottom-color',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-left-color',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-image-source',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-image-slice',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-image-width',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-image-outset',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'border-image-repeat',
            isOverLoaded: false,
            isInherited: false,
          },
        ],
      },
      {
        selectorText: 'div',
        propertyData: [
          {
            propertyName: 'display',
            isOverLoaded: false,
            isInherited: false,
          },
          {
            propertyName: 'unicode-bidi',
            isOverLoaded: false,
            isInherited: false,
          },
        ],
      },
    ];
    assert.deepEqual(inspected3Rules, expectedInspected3Rules);
  });
});
