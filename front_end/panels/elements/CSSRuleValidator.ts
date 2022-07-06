// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';

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
  ruleViolatedBySameElementRuleReason: 'This element has {REASON_RULE_CODE} rule, therefore {AFFECTED_RULE_CODE} has no effect.',
  /**
    *@description Possible fix for rules that was violated because of same elements rule.
    *@example {flex-wrap: nowrap} REASON_RULE_CODE
    */
  ruleViolatedBySameElementRuleFix: 'For this property to work, please remove or change the value of {REASON_RULE_CODE}',
  /**
    *@description Hint for rules that was violated because of parent element rule.
    *@example {display: block} REASON_RULE_CODE
    *@example {flex} AFFECTED_RULE_CODE
    */
  ruleViolatedByParentElementRuleReason: 'Parent element has {REASON_RULE_CODE} rule, therefore this elements {AFFECTED_RULE_CODE} has no effect',
  /**
    *@description Posible fix for rules that was violated because of parent element rule.
    *@example {display: block} EXISTING_PARENT_ELEMENT_RULE
    *@example {display: flex} TARGET_PARENT_ELEMENT_RULE
    */
  ruleViolatedByParentElementRuleFix: 'Please change parent elements {EXISTING_PARENT_ELEMENT_RULE} to {TARGET_PARENT_ELEMENT_RULE} to fix this issue.',
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

  abstract getAuthoringHint(propertyName: string, parentComputedStyles: Map<String, String>|null): AuthoringHint;
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

  getAuthoringHint(): AuthoringHint {
    const reasonRuleCode = '<code class="unbreakable-text"><span class="property">flex-wrap</span>: nowrap</code>';
    const affectedRuleCode = '<code class="unbreakable-text"><span class="property">align-content</span></code>';

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
    if (computedStyles === null || computedStyles === undefined || parentsComputedStyles === null ||
        parentsComputedStyles === undefined) {
      return true;
    }
    const parentDisplay = parentsComputedStyles.get('display');
    return parentDisplay === 'flex' || parentDisplay === 'inline-flex';
  }

  getAuthoringHint(property: string, parentsComputedStyles: Map<String, String>|null): AuthoringHint {
    const reasonRuleCode = '<code class="unbreakable-text"><span class="property">display</span>:' + parentsComputedStyles?.get('display') + '</code>';
    const affectedRuleCode = '<code class="unbreakable-text"><span class="property">' + property + '</span></code>';
    const targetParentRuleCode = '<code class="unbreakable-text"><span class="property">display</span>: flex</code>';

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
