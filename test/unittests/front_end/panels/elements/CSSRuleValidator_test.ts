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
      description: 'Passes the validation when flex properties are set to flex items',
      computedStyles: new Map<string, string>([
        ['flex', '1'],
      ]),
      parentsComputedStyles: new Map<string, string>([
        ['display', 'flex'],
      ]),
      validator: () => new Elements.CSSRuleValidator.FlexItemValidator(),
      expectedResult: true,
    },
    {
      description: 'Passes the validation when flex container properties are set to flex container',
      computedStyles: new Map<string, string>([
        ['display', 'flex'],
        ['flex-direction', 'column'],
      ]),
      parentsComputedStyles: new Map<string, string>(),
      validator: () => new Elements.CSSRuleValidator.FlexContainerValidator(),
      expectedResult: true,
    },
    {
      description: 'Reports a rule validation when flex container properties are set to non-flex container',
      computedStyles: new Map<string, string>([
        ['display', 'block'],
        ['flex-direction', 'column'],
      ]),
      parentsComputedStyles: new Map<string, string>(),
      validator: () => new Elements.CSSRuleValidator.FlexContainerValidator(),
      expectedResult: false,
    },
    {
      description: 'Passes the validation when grid container properties are set to grid container',
      computedStyles: new Map<string, string>([
        ['display', 'grid'],
        ['grid', '100px / 200px'],
      ]),
      parentsComputedStyles: new Map<string, string>(),
      validator: () => new Elements.CSSRuleValidator.GridContainerValidator(),
      expectedResult: true,
    },
    {
      description: 'Reports a rule validation when grid container properties are set to non-grid container',
      computedStyles: new Map<string, string>([
        ['display', 'flex'],
        ['grid', '100px / 200px'],
      ]),
      parentsComputedStyles: new Map<string, string>(),
      validator: () => new Elements.CSSRuleValidator.GridContainerValidator(),
      expectedResult: false,
    },
    {
      description: 'Passes the validation when grid item properties are set to grid items',
      computedStyles: new Map<string, string>([
        ['grid-area', 'auto / auto / auto / auto'],
      ]),
      parentsComputedStyles: new Map<string, string>([
        ['display', 'grid'],
      ]),
      validator: () => new Elements.CSSRuleValidator.GridItemValidator(),
      expectedResult: true,
    },
    {
      description: 'Reports a rule validation when grid item properties are set to non-grid items',
      computedStyles: new Map<string, string>([
        ['grid-area', 'auto / auto / auto / auto'],
      ]),
      parentsComputedStyles: new Map<string, string>([
        ['display', 'flex'],
      ]),
      validator: () => new Elements.CSSRuleValidator.GridItemValidator(),
      expectedResult: false,
    },
    {
      description: 'Passes the validation when padding is not set to table elements',
      computedStyles: new Map<string, string>([
        ['display', 'block'],
        ['padding', '15px'],
      ]),
      parentsComputedStyles: new Map<string, string>(),
      validator: () => new Elements.CSSRuleValidator.PaddingValidator(),
      expectedResult: true,
    },
    {
      description: 'Reports a rule validation when padding is set to table elements',
      computedStyles: new Map<string, string>([
        ['display', 'table-row'],
        ['padding', '15px'],
      ]),
      parentsComputedStyles: new Map<string, string>(),
      validator: () => new Elements.CSSRuleValidator.PaddingValidator(),
      expectedResult: false,
    },
    {
      description: 'Passes the validation when top is set to non-static positioned element',
      computedStyles: new Map<string, string>([
        ['position', 'absolute'],
        ['top', '20px'],
      ]),
      parentsComputedStyles: new Map<string, string>(),
      validator: () => new Elements.CSSRuleValidator.PositionValidator(),
      expectedResult: true,
    },
    {
      description: 'Reports a rule validation when top is set to static positioned elements',
      computedStyles: new Map<string, string>([
        ['position', 'static'],
        ['top', '20px'],
      ]),
      parentsComputedStyles: new Map<string, string>(),
      validator: () => new Elements.CSSRuleValidator.PositionValidator(),
      expectedResult: false,
    },
    {
      description: 'Passes the validation when z-index is set to non-static positioned element',
      computedStyles: new Map<string, string>([
        ['position', 'absolute'],
        ['z-index', '5'],
      ]),
      parentsComputedStyles: new Map<string, string>(),
      validator: () => new Elements.CSSRuleValidator.ZIndexValidator(),
      expectedResult: true,
    },
    {
      description: 'Reports a rule validation when z-index is set to static positioned elements',
      computedStyles: new Map<string, string>([
        ['position', 'static'],
        ['z-index', '5'],
      ]),
      parentsComputedStyles: new Map<string, string>(),
      validator: () => new Elements.CSSRuleValidator.ZIndexValidator(),
      expectedResult: false,
    },
    {
      description: 'Validates width on an inline element',
      computedStyles: new Map<string, string>([
        ['display', 'inline'],
        ['width', '100px'],
      ]),
      nodeName: 'span',
      parentsComputedStyles: new Map<string, string>(),
      validator: () => new Elements.CSSRuleValidator.SizingValidator(),
      expectedResult: false,
    },
    {
      description: 'Validates height on an inline element',
      computedStyles: new Map<string, string>([
        ['display', 'inline'],
        ['height', '100px'],
      ]),
      nodeName: 'span',
      parentsComputedStyles: new Map<string, string>(),
      validator: () => new Elements.CSSRuleValidator.SizingValidator(),
      expectedResult: false,
    },
    {
      description: 'Does not validate width on an inline element that could be replaced',
      computedStyles: new Map<string, string>([
        ['display', 'inline'],
        ['width', '100px'],
      ]),
      nodeName: 'input',
      parentsComputedStyles: new Map<string, string>(),
      validator: () => new Elements.CSSRuleValidator.SizingValidator(),
      expectedResult: true,
    },
  ];

  before(async () => {
    Elements = await import('../../../../../front_end/panels/elements/elements.js');
  });

  for (const test of tests) {
    it(test.description, () => {
      const actualResult = test.validator().getHint(
          test.validator().getApplicableProperties()[0], test.computedStyles, test.parentsComputedStyles,
          test.nodeName);
      if (test.expectedResult) {
        assert.isUndefined(actualResult);
      } else {
        assert.isDefined(actualResult);
      }
    });
  }
});
