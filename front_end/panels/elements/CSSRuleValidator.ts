// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';

import {
  buildStyledPropertyText,
  buildStyledRuleText,
  isFlexContainer,
  isGridContainer,
  isMulticolContainer,
} from './CSSRuleValidatorHelper.js';

const UIStrings = {
  /**
    *@description Hint prefix for deprecated properties.
    */
  deprecatedPropertyHintPrefix: 'Deprecated Property',
  /**
    *@description Hint prefix for rule validation.
    */
  ruleValidationHintPrefix: 'Inactive rule',
  /**
    *@description Hint for rules that was violated because of same elements rule.
    *@example {flex-wrap: nowrap} REASON_RULE_CODE
    *@example {align-content} AFFECTED_RULE_CODE
    */
  ruleViolatedBySameElementRuleReason:
      'This element has {REASON_RULE_CODE} rule, therefore {AFFECTED_RULE_CODE} has no effect.',
  /**
    *@description Possible fix for rules that was violated because of same elements rule.
    *@example {flex-wrap: nowrap} REASON_RULE_CODE
    */
  ruleViolatedBySameElementRuleFix:
      'For this property to work, please remove or change the value of {REASON_RULE_CODE}',
  /**
    *@description Possible fix for rules that was violated because of same elements rule.
    *@example {display: block} EXISTING_RULE
    *@example {display: flex} TARGET_RULE
    */
  ruleViolatedBySameElementRuleChangeSuggestion:
      'For this property to work, please change the {EXISTING_RULE} rule to {TARGET_RULE}',
  /**
    *@description Hint for rules that was violated because of parent element rule.
    *@example {display: block} REASON_RULE_CODE
    *@example {flex} AFFECTED_RULE_CODE
    */
  ruleViolatedByParentElementRuleReason:
      'Parent element has {REASON_RULE_CODE} rule, therefore this elements {AFFECTED_RULE_CODE} has no effect',
  /**
    *@description Posible fix for rules that was violated because of parent element rule.
    *@example {display: block} EXISTING_PARENT_ELEMENT_RULE
    *@example {display: flex} TARGET_PARENT_ELEMENT_RULE
    */
  ruleViolatedByParentElementRuleFix:
      'Please change parent elements {EXISTING_PARENT_ELEMENT_RULE} to {TARGET_PARENT_ELEMENT_RULE} to fix this issue.',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/CSSRuleValidator.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export const enum AuthoringHintType {
  RULE_VALIDATION = 'ruleValidation',
  DEPRECATED_PROPERTY = 'deprecatedProperty',
}

export class AuthoringHint {
  readonly #hintType: AuthoringHintType;
  readonly #hintMessage: string;
  readonly #possibleFixMessage: string|null;
  readonly #learnMore: string|null;

  constructor(property: string, hintType: AuthoringHintType, hintMessage: string, possibleFixMessage: string|null, showLearnMore: boolean) {
    this.#hintType = hintType;
    this.#hintMessage = hintMessage;
    this.#possibleFixMessage = possibleFixMessage;
    this.#learnMore = showLearnMore ? property : null; // TODO: Add Goo.gle short link base url
  }

  getHintPrefix(): string {
    switch (this.#hintType) {
      case AuthoringHintType.RULE_VALIDATION:
        return i18nString(UIStrings.ruleValidationHintPrefix);
      case AuthoringHintType.DEPRECATED_PROPERTY:
        return i18nString(UIStrings.deprecatedPropertyHintPrefix);
    }
  }

  getHintMessage(): string {
    return this.#hintMessage;
  }

  getPossibleFixMessage(): string|null {
    return this.#possibleFixMessage;
  }

  getLearnMoreLink(): string|null {
    return this.#learnMore;
  }
}

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

  abstract getAuthoringHint(
      propertyName: string, computedStyles: Map<String, String>|null,
      parentComputedStyles: Map<String, String>|null): AuthoringHint;
}

export class AlignContentValidator extends CSSRuleValidator {
  constructor() {
    super(['align-content']);
  }

  isRuleValid(computedStyles: Map<String, String>|null): boolean {
    if (computedStyles === null || computedStyles === undefined) {
      return true;
    }
    if (!isFlexContainer(computedStyles)) {
      return true;
    }
    return computedStyles.get('flex-wrap') !== 'nowrap';
  }

  getAuthoringHint(): AuthoringHint {
    const reasonRuleCode = buildStyledPropertyText('flex-wrap');
    const affectedRuleCode = buildStyledPropertyText('align-content');

    return new AuthoringHint(
      'align-content',
      AuthoringHintType.RULE_VALIDATION,
      i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
        'REASON_RULE_CODE': reasonRuleCode,
        'AFFECTED_RULE_CODE': affectedRuleCode,
      }),
      i18nString(UIStrings.ruleViolatedBySameElementRuleFix, {
        'REASON_RULE_CODE': reasonRuleCode,
      }),
      true,
    );
  }
}

export class FlexItemValidator extends CSSRuleValidator {
  constructor() {
    super(['flex', 'flex-basis', 'flex-grow', 'flex-shrink']);
  }

  isRuleValid(computedStyles: Map<String, String>|null, parentsComputedStyles: Map<String, String>|null): boolean {
    if (parentsComputedStyles === null) {
      return true;
    }
    return isFlexContainer(parentsComputedStyles);
  }

  getAuthoringHint(
      property: string, computedStyles: Map<String, String>|null,
      parentsComputedStyles: Map<String, String>|null): AuthoringHint {
    const reasonRuleCode = buildStyledRuleText('display', parentsComputedStyles?.get('display'));
    const affectedRuleCode = buildStyledPropertyText(property);
    const targetParentRuleCode = buildStyledRuleText('display', 'flex');

    return new AuthoringHint(
      property,
      AuthoringHintType.RULE_VALIDATION,
      i18nString(UIStrings.ruleViolatedByParentElementRuleReason, {
        'REASON_RULE_CODE': reasonRuleCode,
        'AFFECTED_RULE_CODE': affectedRuleCode,
      }),
      i18nString(UIStrings.ruleViolatedByParentElementRuleFix, {
        'EXISTING_PARENT_ELEMENT_RULE': reasonRuleCode,
        'TARGET_PARENT_ELEMENT_RULE': targetParentRuleCode,
      }),
      true,
    );
  }
}

export class FlexContainerValidator extends CSSRuleValidator {
  constructor() {
    super(['flex-direction', 'flex-flow', 'flex-wrap', 'justify-content']);
  }

  isRuleValid(computedStyles: Map<String, String>|null): boolean {
    if (computedStyles === null) {
      return true;
    }
    return isFlexContainer(computedStyles);
  }

  getAuthoringHint(property: string, computedStyles: Map<String, String>|null): AuthoringHint {
    const reasonRuleCode = buildStyledRuleText('display', computedStyles?.get('display'));
    const targetRuleCode = buildStyledRuleText('display', 'flex');
    const affectedRuleCode = buildStyledPropertyText(property);

    return new AuthoringHint(
        property,
        AuthoringHintType.RULE_VALIDATION,
        i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
          'REASON_RULE_CODE': reasonRuleCode,
          'AFFECTED_RULE_CODE': affectedRuleCode,
        }),
        i18nString(UIStrings.ruleViolatedBySameElementRuleChangeSuggestion, {
          'EXISTING_RULE': reasonRuleCode,
          'TARGET_RULE': targetRuleCode,
        }),
        true,
    );
  }
}

export class GridContainerValidator extends CSSRuleValidator {
  constructor() {
    super([
      'grid',
      'grid-auto-columns',
      'grid-auto-flow',
      'grid-auto-rows',
      'grid-template',
      'grid-template-areas',
      'grid-template-columns',
      'grid-template-rows',
    ]);
  }

  isRuleValid(computedStyles: Map<String, String>|null): boolean {
    if (computedStyles === null) {
      return true;
    }
    return isGridContainer(computedStyles);
  }

  getAuthoringHint(property: string, computedStyles: Map<String, String>|null): AuthoringHint {
    const reasonRuleCode = buildStyledRuleText('display', computedStyles?.get('display'));
    const targetRuleCode = buildStyledRuleText('display', 'grid');
    const affectedRuleCode = buildStyledPropertyText(property);

    return new AuthoringHint(
        property,
        AuthoringHintType.RULE_VALIDATION,
        i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
          'REASON_RULE_CODE': reasonRuleCode,
          'AFFECTED_RULE_CODE': affectedRuleCode,
        }),
        i18nString(UIStrings.ruleViolatedBySameElementRuleChangeSuggestion, {
          'EXISTING_RULE': reasonRuleCode,
          'TARGET_RULE': targetRuleCode,
        }),
        true,
    );
  }
}

export class GridItemValidator extends CSSRuleValidator {
  constructor() {
    super([
      'grid-area',
      'grid-column',
      'grid-row',
      'grid-row-end',
      'grid-row-start',
    ]);
  }

  isRuleValid(computedStyles: Map<String, String>|null, parentComputedStyles: Map<String, String>|null): boolean {
    if (parentComputedStyles === null) {
      return true;
    }
    return isGridContainer(parentComputedStyles);
  }

  getAuthoringHint(
      property: string, computedStyles: Map<String, String>|null,
      parentComputedStyles: Map<String, String>|null): AuthoringHint {
    const reasonRuleCode = buildStyledRuleText('display', parentComputedStyles?.get('display'));
    const targetParentRuleCode = buildStyledRuleText('display', 'grid');
    const affectedRuleCode = buildStyledPropertyText(property);

    return new AuthoringHint(
        property,
        AuthoringHintType.RULE_VALIDATION,
        i18nString(UIStrings.ruleViolatedByParentElementRuleReason, {
          'REASON_RULE_CODE': reasonRuleCode,
          'AFFECTED_RULE_CODE': affectedRuleCode,
        }),
        i18nString(UIStrings.ruleViolatedByParentElementRuleFix, {
          'EXISTING_PARENT_ELEMENT_RULE': reasonRuleCode,
          'TARGET_PARENT_ELEMENT_RULE': targetParentRuleCode,
        }),
        true,
    );
  }
}

export class FlexGridValidator extends CSSRuleValidator {
  constructor() {
    super([
      'order',
      'align-content',
      'align-items',
      'align-self',
    ]);
  }

  isRuleValid(computedStyles: Map<String, String>|null): boolean {
    if (computedStyles === null) {
      return true;
    }
    return isFlexContainer(computedStyles) || isGridContainer(computedStyles);
  }

  getAuthoringHint(property: string, computedStyles: Map<String, String>|null): AuthoringHint {
    const reasonRuleCode = buildStyledRuleText('display', computedStyles?.get('display'));
    const affectedRuleCode = buildStyledPropertyText(property);

    return new AuthoringHint(
        property,
        AuthoringHintType.RULE_VALIDATION,
        i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
          'REASON_RULE_CODE': reasonRuleCode,
          'AFFECTED_RULE_CODE': affectedRuleCode,
        }),
        i18nString(UIStrings.ruleViolatedBySameElementRuleFix, {
          'REASON_RULE_CODE': reasonRuleCode,
        }),
        true,
    );
  }
}

export class MulticolFlexGridValidator extends CSSRuleValidator {
  constructor() {
    super([
      'gap',
      'column-gap',
      'row-gap',
      'grid-gap',
      'grid-column-gap',
      'grid-column-end',
      'grid-row-gap',
    ]);
  }

  isRuleValid(computedStyles: Map<String, String>|null): boolean {
    if (computedStyles === null) {
      return true;
    }
    return isMulticolContainer(computedStyles) || isFlexContainer(computedStyles) || isGridContainer(computedStyles);
  }

  getAuthoringHint(property: string, computedStyles: Map<String, String>|null): AuthoringHint {
    const reasonRuleCode = buildStyledRuleText('display', computedStyles?.get('display'));
    const affectedRuleCode = buildStyledPropertyText(property);

    return new AuthoringHint(
        property,
        AuthoringHintType.RULE_VALIDATION,
        i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
          'REASON_RULE_CODE': reasonRuleCode,
          'AFFECTED_RULE_CODE': affectedRuleCode,
        }),
        i18nString(UIStrings.ruleViolatedBySameElementRuleFix, {
          'REASON_RULE_CODE': reasonRuleCode,
        }),
        true,
    );
  }
}

export class PaddingValidator extends CSSRuleValidator {
  constructor() {
    super([
      'padding',
      'padding-top',
      'padding-right',
      'padding-bottom',
      'padding-left',
    ]);
  }

  isRuleValid(computedStyles: Map<String, String>|null): boolean {
    const display = computedStyles?.get('display');
    if (display === null || display === undefined) {
      return true;
    }
    return !['table-row-group', 'table-header-group', 'table-footer-group', 'table-row', 'table-column-group',
             'table-column']
                .includes(display as string);
  }

  getAuthoringHint(property: string, computedStyles: Map<String, String>|null): AuthoringHint {
    const reasonRuleCode = buildStyledRuleText('display', computedStyles?.get('display'));
    const affectedRuleCode = buildStyledPropertyText(property);

    return new AuthoringHint(
        property,
        AuthoringHintType.RULE_VALIDATION,
        i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
          'REASON_RULE_CODE': reasonRuleCode,
          'AFFECTED_RULE_CODE': affectedRuleCode,
        }),
        i18nString(UIStrings.ruleViolatedBySameElementRuleFix, {
          'REASON_RULE_CODE': reasonRuleCode,
        }),
        true,
    );
  }
}

export class PositionValidator extends CSSRuleValidator {
  constructor() {
    super([
      'top',
      'right',
      'bottom',
      'left',
    ]);
  }

  isRuleValid(computedStyles: Map<String, String>|null): boolean {
    const position = computedStyles?.get('position');
    if (position === null || position === undefined) {
      return true;
    }
    return position !== 'static';
  }

  getAuthoringHint(property: string, computedStyles: Map<String, String>|null): AuthoringHint {
    const reasonRuleCode = buildStyledRuleText('position', computedStyles?.get('position'));
    const affectedRuleCode = buildStyledPropertyText(property);

    return new AuthoringHint(
        property,
        AuthoringHintType.RULE_VALIDATION,
        i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
          'REASON_RULE_CODE': reasonRuleCode,
          'AFFECTED_RULE_CODE': affectedRuleCode,
        }),
        i18nString(UIStrings.ruleViolatedBySameElementRuleFix, {
          'REASON_RULE_CODE': reasonRuleCode,
        }),
        true,
    );
  }
}

export class ZIndexValidator extends CSSRuleValidator {
  constructor() {
    super([
      'z-index',
    ]);
  }

  isRuleValid(computedStyles: Map<String, String>|null, parentComputedStyles: Map<String, String>|null): boolean {
    const position = computedStyles?.get('position');
    if (position === null || position === undefined) {
      return true;
    }
    return ['absolute', 'relative', 'fixed', 'sticky'].includes(position as string) ||
        isFlexContainer(parentComputedStyles);
  }

  getAuthoringHint(property: string, computedStyles: Map<String, String>|null): AuthoringHint {
    const reasonRuleCode = buildStyledRuleText('position', computedStyles?.get('position'));
    const affectedRuleCode = buildStyledPropertyText(property);

    return new AuthoringHint(
        property,
        AuthoringHintType.RULE_VALIDATION,
        i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
          'REASON_RULE_CODE': reasonRuleCode,
          'AFFECTED_RULE_CODE': affectedRuleCode,
        }),
        i18nString(UIStrings.ruleViolatedBySameElementRuleFix, {
          'REASON_RULE_CODE': reasonRuleCode,
        }),
        true,
    );
  }
}

const CSS_RULE_VALIDATORS = [
  AlignContentValidator,
  FlexItemValidator,
  FlexContainerValidator,
  GridContainerValidator,
  GridItemValidator,
  FlexGridValidator,
  MulticolFlexGridValidator,
  PaddingValidator,
  PositionValidator,
  ZIndexValidator,
];

const setupCSSRulesValidators = (): Map<String, CSSRuleValidator[]> => {
  const validatorsMap = new Map<String, CSSRuleValidator[]>();
  for (const validatorClass of CSS_RULE_VALIDATORS) {
    const validator = new validatorClass();
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
