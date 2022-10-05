// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';

import {
  buildPropertyDefinitionText,
  buildPropertyText,
  isFlexContainer,
  isGridContainer,
  isMulticolContainer,
} from './CSSRuleValidatorHelper.js';

const UIStrings = {
  /**
    *@description The type of the CSS rule validation message shown in the Style pane. "Deprecated property" means that a property in the declaration is deprecated and should not be used.
    */
  deprecatedPropertyHintPrefix: 'Deprecated property',
  /**
    *@description The type of the CSS rule validation message shown in the Style pane. "Inactive property" means that a property declaration was valid syntactially but didn't have expected effect.
    */
  inactivePropertyHintPrefix: 'Inactive property',
  /**
    *@description The message shown in the Style pane when the user hovers over a property that has no effect due to some other property.
    *@example {flex-wrap: nowrap} REASON_PROPERTY_DECLARATION_CODE
    *@example {align-content} AFFECTED_PROPERTY_DECLARATION_CODE
    */
  ruleViolatedBySameElementRuleReason:
      'The {REASON_PROPERTY_DECLARATION_CODE} property on this element bypasses the effect of {AFFECTED_PROPERTY_DECLARATION_CODE}.',
  /**
    *@description The message shown in the Style pane when the user hovers over a property declaration that has no effect due to some other property.
    *@example {flex-wrap: nowrap} REASON_PROPERTY_DECLARATION_CODE
    */
  ruleViolatedBySameElementRuleFix: 'Try removing {REASON_PROPERTY_DECLARATION_CODE} or changing its value.',
  /**
    *@description The message shown in the Style pane when the user hovers over a property declaration that has no effect due to the current property value.
    *@example {display: block} EXISTING_PROPERTY_DECLARATION
    *@example {display: flex} TARGET_PROPERTY_DECLARATION
    */
  ruleViolatedBySameElementRuleChangeSuggestion:
      'Try changing the {EXISTING_PROPERTY_DECLARATION} property to {TARGET_PROPERTY_DECLARATION}.',
  /**
    *@description The message shown in the Style pane when the user hovers over a property declaration that has no effect due to properties of the parent element.
    *@example {display: block} REASON_PROPERTY_DECLARATION_CODE
    *@example {flex} AFFECTED_PROPERTY_DECLARATION_CODE
    */
  ruleViolatedByParentElementRuleReason:
      'The {REASON_PROPERTY_DECLARATION_CODE} property on the parent element bypasses the effect of {AFFECTED_PROPERTY_DECLARATION_CODE}.',
  /**
    *@description The message shown in the Style pane when the user hovers over a property declaration that has no effect due to the properties of the parent element.
    *@example {display: block} EXISTING_PARENT_ELEMENT_RULE
    *@example {display: flex} TARGET_PARENT_ELEMENT_RULE
    */
  ruleViolatedByParentElementRuleFix:
      'Try changing the {EXISTING_PARENT_ELEMENT_RULE} property on the parent to {TARGET_PARENT_ELEMENT_RULE}.',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/CSSRuleValidator.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export const enum HintType {
  INACTIVE_PROPERTY = 'ruleValidation',
  DEPRECATED_PROPERTY = 'deprecatedProperty',
}

export class Hint {
  readonly #hintType: HintType;
  readonly #hintMessage: string;
  readonly #possibleFixMessage: string|null;
  readonly #learnMoreLink: string|undefined;

  constructor(hintType: HintType, hintMessage: string, possibleFixMessage: string|null, learnMoreLink?: string) {
    this.#hintType = hintType;
    this.#hintMessage = hintMessage;
    this.#possibleFixMessage = possibleFixMessage;
    this.#learnMoreLink = learnMoreLink;
  }

  getPrefix(): string {
    switch (this.#hintType) {
      case HintType.INACTIVE_PROPERTY:
        return i18nString(UIStrings.inactivePropertyHintPrefix);
      case HintType.DEPRECATED_PROPERTY:
        return i18nString(UIStrings.deprecatedPropertyHintPrefix);
    }
  }

  getType(): HintType {
    return this.#hintType;
  }

  getMessage(): string {
    return this.#hintMessage;
  }

  getPossibleFixMessage(): string|null {
    return this.#possibleFixMessage;
  }

  getLearnMoreLink(): string|undefined {
    return this.#learnMoreLink;
  }
}

export abstract class CSSRuleValidator {
  getMetricType(): Host.UserMetrics.CSSHintType {
    return Host.UserMetrics.CSSHintType.Other;
  }

  readonly #affectedProperties: string[];

  constructor(affectedProperties: string[]) {
    this.#affectedProperties = affectedProperties;
  }

  getApplicableProperties(): string[] {
    return this.#affectedProperties;
  }

  abstract getHint(
      propertyName: string, computedStyles?: Map<string, string>, parentComputedStyles?: Map<string, string>): Hint
      |undefined;
}

export class AlignContentValidator extends CSSRuleValidator {
  constructor() {
    super(['align-content']);
  }

  getMetricType(): Host.UserMetrics.CSSHintType {
    return Host.UserMetrics.CSSHintType.AlignContent;
  }

  #isRuleValid(computedStyles?: Map<string, string>): boolean {
    if (computedStyles === null || computedStyles === undefined) {
      return true;
    }
    if (!isFlexContainer(computedStyles)) {
      return true;
    }
    return computedStyles.get('flex-wrap') !== 'nowrap';
  }

  getHint(_propertyName: string, computedStyles?: Map<string, string>): Hint|undefined {
    if (this.#isRuleValid(computedStyles)) {
      return;
    }
    const reasonPropertyDeclaration = buildPropertyDefinitionText('flex-wrap', 'nowrap');
    const affectedPropertyDeclarationCode = buildPropertyText('align-content');

    return new Hint(
        HintType.INACTIVE_PROPERTY,
        i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
          'AFFECTED_PROPERTY_DECLARATION_CODE': affectedPropertyDeclarationCode,
        }),
        i18nString(UIStrings.ruleViolatedBySameElementRuleFix, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
        }),
    );
  }
}

export class FlexItemValidator extends CSSRuleValidator {
  constructor() {
    super(['flex', 'flex-basis', 'flex-grow', 'flex-shrink']);
  }

  getMetricType(): Host.UserMetrics.CSSHintType {
    return Host.UserMetrics.CSSHintType.FlexItem;
  }

  #isRuleValid(computedStyles?: Map<string, string>, parentComputedStyles?: Map<string, string>): boolean {
    if (parentComputedStyles === null) {
      return true;
    }
    return isFlexContainer(parentComputedStyles);
  }

  getHint(propertyName: string, computedStyles?: Map<string, string>, parentComputedStyles?: Map<string, string>): Hint
      |undefined {
    if (this.#isRuleValid(computedStyles, parentComputedStyles)) {
      return;
    }
    const reasonPropertyDeclaration = buildPropertyDefinitionText('display', parentComputedStyles?.get('display'));
    const affectedPropertyDeclarationCode = buildPropertyText(propertyName);
    const targeParentPropertyDeclaration = buildPropertyDefinitionText('display', 'flex');

    return new Hint(
        HintType.INACTIVE_PROPERTY,
        i18nString(UIStrings.ruleViolatedByParentElementRuleReason, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
          'AFFECTED_PROPERTY_DECLARATION_CODE': affectedPropertyDeclarationCode,
        }),
        i18nString(UIStrings.ruleViolatedByParentElementRuleFix, {
          'EXISTING_PARENT_ELEMENT_RULE': reasonPropertyDeclaration,
          'TARGET_PARENT_ELEMENT_RULE': targeParentPropertyDeclaration,
        }),
    );
  }
}

export class FlexContainerValidator extends CSSRuleValidator {
  constructor() {
    super(['flex-direction', 'flex-flow', 'flex-wrap', 'justify-content']);
  }

  getMetricType(): Host.UserMetrics.CSSHintType {
    return Host.UserMetrics.CSSHintType.FlexContainer;
  }

  #isRuleValid(computedStyles?: Map<string, string>): boolean {
    if (computedStyles === null) {
      return true;
    }
    return isFlexContainer(computedStyles);
  }

  getHint(propertyName: string, computedStyles?: Map<string, string>): Hint|undefined {
    if (this.#isRuleValid(computedStyles)) {
      return;
    }
    const reasonPropertyDeclaration = buildPropertyDefinitionText('display', computedStyles?.get('display'));
    const targetRuleCode = buildPropertyDefinitionText('display', 'flex');
    const affectedPropertyDeclarationCode = buildPropertyText(propertyName);

    return new Hint(
        HintType.INACTIVE_PROPERTY,
        i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
          'AFFECTED_PROPERTY_DECLARATION_CODE': affectedPropertyDeclarationCode,
        }),
        i18nString(UIStrings.ruleViolatedBySameElementRuleChangeSuggestion, {
          'EXISTING_PROPERTY_DECLARATION': reasonPropertyDeclaration,
          'TARGET_PROPERTY_DECLARATION': targetRuleCode,
        }),
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

  getMetricType(): Host.UserMetrics.CSSHintType {
    return Host.UserMetrics.CSSHintType.GridContainer;
  }

  #isRuleValid(computedStyles?: Map<string, string>): boolean {
    return isGridContainer(computedStyles);
  }

  getHint(propertyName: string, computedStyles?: Map<string, string>): Hint|undefined {
    if (this.#isRuleValid(computedStyles)) {
      return;
    }
    const reasonPropertyDeclaration = buildPropertyDefinitionText('display', computedStyles?.get('display'));
    const targetRuleCode = buildPropertyDefinitionText('display', 'grid');
    const affectedPropertyDeclarationCode = buildPropertyText(propertyName);

    return new Hint(
        HintType.INACTIVE_PROPERTY,
        i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
          'AFFECTED_PROPERTY_DECLARATION_CODE': affectedPropertyDeclarationCode,
        }),
        i18nString(UIStrings.ruleViolatedBySameElementRuleChangeSuggestion, {
          'EXISTING_PROPERTY_DECLARATION': reasonPropertyDeclaration,
          'TARGET_PROPERTY_DECLARATION': targetRuleCode,
        }),
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

  getMetricType(): Host.UserMetrics.CSSHintType {
    return Host.UserMetrics.CSSHintType.GridItem;
  }

  #isRuleValid(computedStyles?: Map<string, string>, parentComputedStyles?: Map<string, string>): boolean {
    if (!parentComputedStyles) {
      return true;
    }
    return isGridContainer(parentComputedStyles);
  }

  getHint(propertyName: string, computedStyles?: Map<string, string>, parentComputedStyles?: Map<string, string>): Hint
      |undefined {
    if (this.#isRuleValid(computedStyles, parentComputedStyles)) {
      return;
    }
    const reasonPropertyDeclaration = buildPropertyDefinitionText('display', parentComputedStyles?.get('display'));
    const targeParentPropertyDeclaration = buildPropertyDefinitionText('display', 'grid');
    const affectedPropertyDeclarationCode = buildPropertyText(propertyName);

    return new Hint(
        HintType.INACTIVE_PROPERTY,
        i18nString(UIStrings.ruleViolatedByParentElementRuleReason, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
          'AFFECTED_PROPERTY_DECLARATION_CODE': affectedPropertyDeclarationCode,
        }),
        i18nString(UIStrings.ruleViolatedByParentElementRuleFix, {
          'EXISTING_PARENT_ELEMENT_RULE': reasonPropertyDeclaration,
          'TARGET_PARENT_ELEMENT_RULE': targeParentPropertyDeclaration,
        }),
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

  getMetricType(): Host.UserMetrics.CSSHintType {
    return Host.UserMetrics.CSSHintType.FlexGrid;
  }

  #isRuleValid(computedStyles?: Map<string, string>): boolean {
    if (computedStyles === null) {
      return true;
    }
    return isFlexContainer(computedStyles) || isGridContainer(computedStyles);
  }

  getHint(propertyName: string, computedStyles?: Map<string, string>): Hint|undefined {
    if (this.#isRuleValid(computedStyles)) {
      return;
    }

    const reasonPropertyDeclaration = buildPropertyDefinitionText('display', computedStyles?.get('display'));
    const affectedPropertyDeclarationCode = buildPropertyText(propertyName);

    return new Hint(
        HintType.INACTIVE_PROPERTY,
        i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
          'AFFECTED_PROPERTY_DECLARATION_CODE': affectedPropertyDeclarationCode,
        }),
        i18nString(UIStrings.ruleViolatedBySameElementRuleFix, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
        }),
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

  getMetricType(): Host.UserMetrics.CSSHintType {
    return Host.UserMetrics.CSSHintType.MulticolFlexGrid;
  }

  #isRuleValid(computedStyles?: Map<string, string>): boolean {
    if (computedStyles === null) {
      return true;
    }
    return isMulticolContainer(computedStyles) || isFlexContainer(computedStyles) || isGridContainer(computedStyles);
  }

  getHint(propertyName: string, computedStyles?: Map<string, string>): Hint|undefined {
    if (this.#isRuleValid(computedStyles)) {
      return;
    }

    const reasonPropertyDeclaration = buildPropertyDefinitionText('display', computedStyles?.get('display'));
    const affectedPropertyDeclarationCode = buildPropertyText(propertyName);

    return new Hint(
        HintType.INACTIVE_PROPERTY,
        i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
          'AFFECTED_PROPERTY_DECLARATION_CODE': affectedPropertyDeclarationCode,
        }),
        i18nString(UIStrings.ruleViolatedBySameElementRuleFix, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
        }),
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

  getMetricType(): Host.UserMetrics.CSSHintType {
    return Host.UserMetrics.CSSHintType.Padding;
  }

  #isRuleValid(computedStyles?: Map<string, string>): boolean {
    const display = computedStyles?.get('display');
    if (!display) {
      return true;
    }
    return !['table-row-group', 'table-header-group', 'table-footer-group', 'table-row', 'table-column-group',
             'table-column']
                .includes(display);
  }

  getHint(propertyName: string, computedStyles?: Map<string, string>): Hint|undefined {
    if (this.#isRuleValid(computedStyles)) {
      return;
    }

    const reasonPropertyDeclaration = buildPropertyDefinitionText('display', computedStyles?.get('display'));
    const affectedPropertyDeclarationCode = buildPropertyText(propertyName);

    return new Hint(
        HintType.INACTIVE_PROPERTY,
        i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
          'AFFECTED_PROPERTY_DECLARATION_CODE': affectedPropertyDeclarationCode,
        }),
        i18nString(UIStrings.ruleViolatedBySameElementRuleFix, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
        }),
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

  getMetricType(): Host.UserMetrics.CSSHintType {
    return Host.UserMetrics.CSSHintType.Position;
  }

  #isRuleValid(computedStyles?: Map<string, string>): boolean {
    const position = computedStyles?.get('position');
    if (position === null || position === undefined) {
      return true;
    }
    return position !== 'static';
  }

  getHint(propertyName: string, computedStyles?: Map<string, string>): Hint|undefined {
    if (this.#isRuleValid(computedStyles)) {
      return;
    }

    const reasonPropertyDeclaration = buildPropertyDefinitionText('position', computedStyles?.get('position'));
    const affectedPropertyDeclarationCode = buildPropertyText(propertyName);

    return new Hint(
        HintType.INACTIVE_PROPERTY,
        i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
          'AFFECTED_PROPERTY_DECLARATION_CODE': affectedPropertyDeclarationCode,
        }),
        i18nString(UIStrings.ruleViolatedBySameElementRuleFix, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
        }),
    );
  }
}

export class ZIndexValidator extends CSSRuleValidator {
  constructor() {
    super([
      'z-index',
    ]);
  }

  getMetricType(): Host.UserMetrics.CSSHintType {
    return Host.UserMetrics.CSSHintType.ZIndex;
  }

  #isRuleValid(computedStyles?: Map<string, string>, parentComputedStyles?: Map<string, string>): boolean {
    const position = computedStyles?.get('position');
    if (!position) {
      return true;
    }
    return ['absolute', 'relative', 'fixed', 'sticky'].includes(position) || isFlexContainer(parentComputedStyles);
  }

  getHint(propertyName: string, computedStyles?: Map<string, string>, parentComputedStyles?: Map<string, string>): Hint
      |undefined {
    if (this.#isRuleValid(computedStyles, parentComputedStyles)) {
      return;
    }

    const reasonPropertyDeclaration = buildPropertyDefinitionText('position', computedStyles?.get('position'));
    const affectedPropertyDeclarationCode = buildPropertyText(propertyName);

    return new Hint(
        HintType.INACTIVE_PROPERTY,
        i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
          'AFFECTED_PROPERTY_DECLARATION_CODE': affectedPropertyDeclarationCode,
        }),
        i18nString(UIStrings.ruleViolatedBySameElementRuleFix, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
        }),
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

const setupCSSRulesValidators = (): Map<string, CSSRuleValidator[]> => {
  const validatorsMap = new Map<string, CSSRuleValidator[]>();
  for (const validatorClass of CSS_RULE_VALIDATORS) {
    const validator = new validatorClass();
    const affectedProperties = validator.getApplicableProperties();

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

export const cssRuleValidatorsMap: Map<string, CSSRuleValidator[]> = setupCSSRulesValidators();
