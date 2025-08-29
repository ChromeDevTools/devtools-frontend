// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';

import * as ElementsComponents from './components.js';

describeWithEnvironment('CSSPropertyDocsView', () => {
  it('renders every section', async () => {
    const cssProperty = {
      name: 'display',
      description:
          'In combination with \'float\' and \'position\', determines the type of box or boxes that are generated for an element.',
      baseline: {
        status: ElementsComponents.CSSPropertyDocsView.BaselineStatus.HIGH,
        baseline_low_date: '2015-07-29',
        baseline_high_date: '2018-01-29',
      },
      browsers: [
        'E12',
        'FF1',
        'FFA4',
        'S1',
        'SM1',
        'C1',
        'CA18',
        'IE4',
        'O7',
      ],
      references: [
        {
          name: 'MDN Reference',
          url: 'https://developer.mozilla.org/docs/Web/CSS/display',
        },
      ],
    };

    const popupComponent = new ElementsComponents.CSSPropertyDocsView.CSSPropertyDocsView(cssProperty);
    renderElementIntoDOM(popupComponent);

    assert.isNotNull(popupComponent.shadowRoot!.querySelector('#description'));
    assert.isNotNull(popupComponent.shadowRoot!.querySelector('#baseline'));
    assert.isNotNull(popupComponent.shadowRoot!.querySelector('#learn-more'));
  });

  it('renders correct baseline text for various scenarios', () => {
    const testCases = [
      {
        description: 'limited availability with specific missing browsers',
        cssProperty: {
          name: 'property1',
          baseline: {status: ElementsComponents.CSSPropertyDocsView.BaselineStatus.LIMITED},
          // Assuming 'E' (Edge) and 'S' (Safari macOS) are known and FF, C are missing
          browsers: ['E12', 'S1'],
        },
        expectedText:
            'Limited availability across major browsers (not fully implemented in Chrome, Firefox, or Safari on iOS)',
      },
      {
        description: 'limited availability with no specific missing browsers (all known are present)',
        cssProperty: {
          name: 'property2',
          baseline: {status: ElementsComponents.CSSPropertyDocsView.BaselineStatus.LIMITED},
          browsers: [
            'C1',    // Chrome Desktop
            'CA1',   // Chrome Android
            'E12',   // Edge Desktop
            'FF1',   // Firefox Desktop
            'FFA1',  // Firefox Android
            'S1',    // Safari macOS
            'SM1',   // Safari iOS
          ],
        },
        expectedText: 'Limited availability across major browsers',
      },
      {
        description: 'limited availability with undefined browsers list',
        cssProperty: {
          name: 'property3',
          baseline: {status: ElementsComponents.CSSPropertyDocsView.BaselineStatus.LIMITED},
          browsers: undefined,
        },
        expectedText: 'Limited availability across major browsers',
      },
      {
        description: 'newly available',
        cssProperty: {
          name: 'property4',
          baseline:
              {status: ElementsComponents.CSSPropertyDocsView.BaselineStatus.LOW, baseline_low_date: '2023-01-15'},
        },
        expectedText: 'Newly available across major browsers (Baseline since January 2023)',
      },
      {
        description: 'widely available',
        cssProperty: {
          name: 'property5',
          baseline:
              {status: ElementsComponents.CSSPropertyDocsView.BaselineStatus.HIGH, baseline_high_date: '2020-05-10'},
        },
        expectedText: 'Widely available across major browsers (Baseline since May 2020)',
      },
      {
        description: 'newly available with missing baseline_low_date',
        cssProperty: {
          name: 'property6',
          baseline: {status: ElementsComponents.CSSPropertyDocsView.BaselineStatus.LOW},
        },
        expectedText: 'Newly available across major browsers',
      },
    ];

    for (const testCase of testCases) {
      const popupComponent = new ElementsComponents.CSSPropertyDocsView.CSSPropertyDocsView(testCase.cssProperty);
      renderElementIntoDOM(popupComponent, {allowMultipleChildren: true});

      const baselineSection = popupComponent.shadowRoot!.querySelector('#baseline');
      assert.isNotNull(baselineSection, `${testCase.description}: baseline section should exist`);

      const baselineTextElement = baselineSection!.querySelector('span');
      assert.isNotNull(baselineTextElement, `${testCase.description}: baseline text element should exist`);

      const actualText = baselineTextElement!.textContent?.trim();
      assert.include(
          actualText || '', testCase.expectedText,
          `${testCase.description}: baseline text did not contain expected text`);
    }
  });
});
