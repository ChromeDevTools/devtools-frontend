// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ElementsModule from '../../../../../front_end/panels/elements/elements.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';

const {assert} = chai;

describeWithEnvironment('CSSRuleValidator', async () => {
  let Elements: typeof ElementsModule;
  const tests = [
    {
      description:
          'Reports a rule violation when element align-content is set on flex container whose flex-wrap property\'s value is nowrap',
      computedStyles: new Map<string, string>([
        ['display', 'inline-flex'],
        ['flex-wrap', 'nowrap'],
        ['align-content', 'center'],
      ]),
      parentsComputedStyles: null,
      validator: () => new Elements.CSSRuleValidator.AlignContentValidator(),
      expectedResult: false,
    },
    {
      description: 'Passes the validation if flex-wrap is set to nowrap, but the element is not a flex container',
      computedStyles: new Map<string, string>([
        ['display', 'block'],
        ['flex-wrap', 'nowrap'],
        ['align-content', 'center'],
      ]),
      parentsComputedStyles: null,
      validator: () => new Elements.CSSRuleValidator.AlignContentValidator(),
      expectedResult: true,
    },
    {
      description: 'Reports a rule validation when flex properties are set to non-flex items',
      computedStyles: new Map<string, string>([
        ['flex', '1'],
      ]),
      parentsComputedStyles: new Map<string, string>([
        ['display', 'table'],
      ]),
      validator: () => new Elements.CSSRuleValidator.FlexItemValidator(),
      expectedResult: false,
    },
    {
      description: 'Passes the vlaidation when flex properties are set to flex items',
      computedStyles: new Map<string, string>([
        ['flex', '1'],
      ]),
      parentsComputedStyles: new Map<string, string>([
        ['display', 'flex'],
      ]),
      validator: () => new Elements.CSSRuleValidator.FlexItemValidator(),
      expectedResult: true,
    },
  ];

  before(async () => {
    Elements = await import('../../../../../front_end/panels/elements/elements.js');
  });

  for (const test of tests) {
    it(test.description, () => {
      const actualResult = test.validator().isRuleValid(test.computedStyles, test.parentsComputedStyles);
      assert.deepEqual(actualResult, test.expectedResult);
    });
  }
});
