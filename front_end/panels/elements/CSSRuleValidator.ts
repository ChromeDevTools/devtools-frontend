// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';

const UIStrings = {
  /**
    *@description Hint for Align-content rule where element also has flex-wrap nowrap rule.
    */
  alignContentRuleOnNoWrapFlex: 'This element has flex-wrap: nowrap rule, therefore \'align-content\' has no effect.',
  /**
    *@description Hint for element that does not have effect if parent container is not flex.
    *@example {flex} PH1
    */
  notFlexItemHint: 'Parent of this element is not flex container, therefore {PH1} property has no effect.',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/CSSRuleValidator.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export abstract class CSSRuleValidator {
  readonly #affectedProperties: string[];

  constructor(affectedProperties: string[]) {
    this.#affectedProperties = affectedProperties;
  }

  abstract isRuleValid(computedStyles: Map<String, String>|null, parentsComputedStyles?: Map<String, String>|null):
      boolean;

  getAffectedProperties(): string[] {
    return this.#affectedProperties;
  }

  abstract getHintMessage(propertyName: string): string;
}

export class AlignContentValidator extends CSSRuleValidator {
  constructor() {
    super(['align-content']);
  }

  isRuleValid(computedStyles: Map<String, String>|null): boolean {
    if (computedStyles === null || computedStyles === undefined) {
      return true;
    }
    const display = computedStyles.get('display');
    if (display !== 'flex' && display !== 'inline-flex') {
      return true;
    }
    return computedStyles.get('flex-wrap') !== 'nowrap';
  }

  getHintMessage(): string {
    return i18nString(UIStrings.alignContentRuleOnNoWrapFlex);
  }
}

export class FlexItemValidator extends CSSRuleValidator {
  constructor() {
    super(['flex', 'flex-basis', 'flex-grow', 'flex-shrink']);
  }

  isRuleValid(computedStyles: Map<String, String>|null, parentsComputedStyles: Map<String, String>|null): boolean {
    if (computedStyles === null || computedStyles === undefined || parentsComputedStyles === null ||
        parentsComputedStyles === undefined) {
      return true;
    }
    const parentDisplay = parentsComputedStyles.get('display');
    return parentDisplay === 'flex' || parentDisplay === 'inline-flex';
  }

  getHintMessage(property: string): string {
    return i18nString(UIStrings.notFlexItemHint, {
      'PH1': property,
    });
  }
}

const setupCSSRulesValidators = (): Map<String, CSSRuleValidator[]> => {
  const validators = [new AlignContentValidator(), new FlexItemValidator()];

  const validatorsMap = new Map<String, CSSRuleValidator[]>();
  for (const validator of validators) {
    const affectedProperties = validator.getAffectedProperties();

    for (const affectedProperty of affectedProperties) {
      let propertyValidators = validatorsMap.get(affectedProperty);
      if (propertyValidators === undefined) {
        propertyValidators = [];
      }
      propertyValidators.push(validator);

      validatorsMap.set(affectedProperty, propertyValidators);
    }
  }
  return validatorsMap;
};

export const cssRuleValidatorsMap: Map<String, CSSRuleValidator[]> = setupCSSRulesValidators();
