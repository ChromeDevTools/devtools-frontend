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
    *@description The type of the CSS rule validation message that is shown in the Style panel. "Deprecated property" means that the property in the declaration is deprecated and should not be used.
    */
  deprecatedPropertyHintPrefix: 'Deprecated property',
  /**
    *@description The type of the CSS rule validation message that is shown in the Style panel. "Inactive property" means that a property declaration was valid syntactially but didn't have expected effect.
    */
  inactivePropertyHintPrefix: 'Inactive property',
  /**
    *@description The message that is shown in the Style panel when the user hovers over a property that has not effect due to some other property.
    *@example {flex-wrap: nowrap} REASON_PROPERTY_DECLARATION_CODE
    *@example {align-content} AFFECTED_PROPERTY_DECLARATION_CODE
    */
  ruleViolatedBySameElementRuleReason:
      'This element has the {REASON_PROPERTY_DECLARATION_CODE} property and, therefore, {AFFECTED_PROPERTY_DECLARATION_CODE} has no effect.',
  /**
    *@description The message that is shown in the Style panel when the user hovers over a property declaration that has not effect due to some other property.
    *@example {flex-wrap: nowrap} REASON_PROPERTY_DECLARATION_CODE
    */
  ruleViolatedBySameElementRuleFix:
      'For this property to work, please remove or change the value of {REASON_PROPERTY_DECLARATION_CODE}.',
  /**
    *@description The message that is shown in the Style panel when the user hovers over a property declaration that has not effect due to the current property value.
    *@example {display: block} EXISTING_PROPERTY_DECLARATION
    *@example {display: flex} TARGET_PROPERTY_DECLARATION
    */
  ruleViolatedBySameElementRuleChangeSuggestion:
      'For this property to work, please change the {EXISTING_PROPERTY_DECLARATION} rule to {TARGET_PROPERTY_DECLARATION}.',
  /**
    *@description The message that is shown in the Style panel when the user hovers over a property declaration that has not effect due to properties of the parent element.
    *@example {display: block} REASON_PROPERTY_DECLARATION_CODE
    *@example {flex} AFFECTED_PROPERTY_DECLARATION_CODE
    */
  ruleViolatedByParentElementRuleReason:
      'Parent element has {REASON_PROPERTY_DECLARATION_CODE} rule, therefore this elements {AFFECTED_PROPERTY_DECLARATION_CODE} has no effect.',
  /**
    *@description The message that is shown in the Style panel when the user hovers over a property declaration that has not effect due to the properties of the parent element.
    *@example {display: block} EXISTING_PARENT_ELEMENT_RULE
    *@example {display: flex} TARGET_PARENT_ELEMENT_RULE
    */
  ruleViolatedByParentElementRuleFix:
      'Please change parent element\'s {EXISTING_PARENT_ELEMENT_RULE} to {TARGET_PARENT_ELEMENT_RULE} to fix this issue.',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/CSSRuleValidator.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export const enum AuthoringHintType {
  INACTIVE_PROPERTY = 'ruleValidation',
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
      case AuthoringHintType.INACTIVE_PROPERTY:
        return i18nString(UIStrings.inactivePropertyHintPrefix);
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

  /**
   * If `isRuleValid` returns false, it means there is a hint to be shown. The hint is retrieved by invoking `getAuthoringHint`.
   */
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
    const reasonPropertyDeclaration = buildStyledPropertyText('flex-wrap');
    const affectedPropertyDeclarationCode = buildStyledPropertyText('align-content');

    return new AuthoringHint(
        'align-content',
        AuthoringHintType.INACTIVE_PROPERTY,
        i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
          'AFFECTED_PROPERTY_DECLARATION_CODE': affectedPropertyDeclarationCode,
        }),
        i18nString(UIStrings.ruleViolatedBySameElementRuleFix, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
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
    const reasonPropertyDeclaration = buildStyledRuleText('display', parentsComputedStyles?.get('display'));
    const affectedPropertyDeclarationCode = buildStyledPropertyText(property);
    const targeParentPropertyDeclaration = buildStyledRuleText('display', 'flex');

    return new AuthoringHint(
        property,
        AuthoringHintType.INACTIVE_PROPERTY,
        i18nString(UIStrings.ruleViolatedByParentElementRuleReason, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
          'AFFECTED_PROPERTY_DECLARATION_CODE': affectedPropertyDeclarationCode,
        }),
        i18nString(UIStrings.ruleViolatedByParentElementRuleFix, {
          'EXISTING_PARENT_ELEMENT_RULE': reasonPropertyDeclaration,
          'TARGET_PARENT_ELEMENT_RULE': targeParentPropertyDeclaration,
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
    const reasonPropertyDeclaration = buildStyledRuleText('display', computedStyles?.get('display'));
    const targetRuleCode = buildStyledRuleText('display', 'flex');
    const affectedPropertyDeclarationCode = buildStyledPropertyText(property);

    return new AuthoringHint(
        property,
        AuthoringHintType.INACTIVE_PROPERTY,
        i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
          'AFFECTED_PROPERTY_DECLARATION_CODE': affectedPropertyDeclarationCode,
        }),
        i18nString(UIStrings.ruleViolatedBySameElementRuleChangeSuggestion, {
          'EXISTING_PROPERTY_DECLARATION': reasonPropertyDeclaration,
          'TARGET_PROPERTY_DECLARATION': targetRuleCode,
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
    const reasonPropertyDeclaration = buildStyledRuleText('display', computedStyles?.get('display'));
    const targetRuleCode = buildStyledRuleText('display', 'grid');
    const affectedPropertyDeclarationCode = buildStyledPropertyText(property);

    return new AuthoringHint(
        property,
        AuthoringHintType.INACTIVE_PROPERTY,
        i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
          'AFFECTED_PROPERTY_DECLARATION_CODE': affectedPropertyDeclarationCode,
        }),
        i18nString(UIStrings.ruleViolatedBySameElementRuleChangeSuggestion, {
          'EXISTING_PROPERTY_DECLARATION': reasonPropertyDeclaration,
          'TARGET_PROPERTY_DECLARATION': targetRuleCode,
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
    const reasonPropertyDeclaration = buildStyledRuleText('display', parentComputedStyles?.get('display'));
    const targeParentPropertyDeclaration = buildStyledRuleText('display', 'grid');
    const affectedPropertyDeclarationCode = buildStyledPropertyText(property);

    return new AuthoringHint(
        property,
        AuthoringHintType.INACTIVE_PROPERTY,
        i18nString(UIStrings.ruleViolatedByParentElementRuleReason, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
          'AFFECTED_PROPERTY_DECLARATION_CODE': affectedPropertyDeclarationCode,
        }),
        i18nString(UIStrings.ruleViolatedByParentElementRuleFix, {
          'EXISTING_PARENT_ELEMENT_RULE': reasonPropertyDeclaration,
          'TARGET_PARENT_ELEMENT_RULE': targeParentPropertyDeclaration,
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
    const reasonPropertyDeclaration = buildStyledRuleText('display', computedStyles?.get('display'));
    const affectedPropertyDeclarationCode = buildStyledPropertyText(property);

    return new AuthoringHint(
        property,
        AuthoringHintType.INACTIVE_PROPERTY,
        i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
          'AFFECTED_PROPERTY_DECLARATION_CODE': affectedPropertyDeclarationCode,
        }),
        i18nString(UIStrings.ruleViolatedBySameElementRuleFix, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
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
    const reasonPropertyDeclaration = buildStyledRuleText('display', computedStyles?.get('display'));
    const affectedPropertyDeclarationCode = buildStyledPropertyText(property);

    return new AuthoringHint(
        property,
        AuthoringHintType.INACTIVE_PROPERTY,
        i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
          'AFFECTED_PROPERTY_DECLARATION_CODE': affectedPropertyDeclarationCode,
        }),
        i18nString(UIStrings.ruleViolatedBySameElementRuleFix, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
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
    const reasonPropertyDeclaration = buildStyledRuleText('display', computedStyles?.get('display'));
    const affectedPropertyDeclarationCode = buildStyledPropertyText(property);

    return new AuthoringHint(
        property,
        AuthoringHintType.INACTIVE_PROPERTY,
        i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
          'AFFECTED_PROPERTY_DECLARATION_CODE': affectedPropertyDeclarationCode,
        }),
        i18nString(UIStrings.ruleViolatedBySameElementRuleFix, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
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
    const reasonPropertyDeclaration = buildStyledRuleText('position', computedStyles?.get('position'));
    const affectedPropertyDeclarationCode = buildStyledPropertyText(property);

    return new AuthoringHint(
        property,
        AuthoringHintType.INACTIVE_PROPERTY,
        i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
          'AFFECTED_PROPERTY_DECLARATION_CODE': affectedPropertyDeclarationCode,
        }),
        i18nString(UIStrings.ruleViolatedBySameElementRuleFix, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
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
    const reasonPropertyDeclaration = buildStyledRuleText('position', computedStyles?.get('position'));
    const affectedPropertyDeclarationCode = buildStyledPropertyText(property);

    return new AuthoringHint(
        property,
        AuthoringHintType.INACTIVE_PROPERTY,
        i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
          'AFFECTED_PROPERTY_DECLARATION_CODE': affectedPropertyDeclarationCode,
        }),
        i18nString(UIStrings.ruleViolatedBySameElementRuleFix, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
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
