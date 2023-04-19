// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';

import {
  buildPropertyDefinitionText,
  buildPropertyName,
  buildPropertyValue,
  isFlexContainer,
  isGridContainer,
  isInlineElement,
  isMulticolContainer,
  isPossiblyReplacedElement,
} from './CSSRuleValidatorHelper.js';

const UIStrings = {
  /**
   *@description The message shown in the Style pane when the user hovers over a property that has no effect due to some other property.
   *@example {flex-wrap: nowrap} REASON_PROPERTY_DECLARATION_CODE
   *@example {align-content} AFFECTED_PROPERTY_DECLARATION_CODE
   */
  ruleViolatedBySameElementRuleReason:
      'The {REASON_PROPERTY_DECLARATION_CODE} property prevents {AFFECTED_PROPERTY_DECLARATION_CODE} from having an effect.',
  /**
   *@description The message shown in the Style pane when the user hovers over a property declaration that has no effect due to some other property.
   *@example {flex-wrap} PROPERTY_NAME
    @example {nowrap} PROPERTY_VALUE
   */
  ruleViolatedBySameElementRuleFix: 'Try setting {PROPERTY_NAME} to something other than {PROPERTY_VALUE}.',
  /**
   *@description The message shown in the Style pane when the user hovers over a property declaration that has no effect due to the current property value.
   *@example {display: block} EXISTING_PROPERTY_DECLARATION
   *@example {display: flex} TARGET_PROPERTY_DECLARATION
   */
  ruleViolatedBySameElementRuleChangeSuggestion:
      'Try setting the {EXISTING_PROPERTY_DECLARATION} property to {TARGET_PROPERTY_DECLARATION}.',
  /**
   *@description The message shown in the Style pane when the user hovers over a property declaration that has no effect due to properties of the parent element.
   *@example {display: block} REASON_PROPERTY_DECLARATION_CODE
   *@example {flex} AFFECTED_PROPERTY_DECLARATION_CODE
   */
  ruleViolatedByParentElementRuleReason:
      'The {REASON_PROPERTY_DECLARATION_CODE} property on the parent element prevents {AFFECTED_PROPERTY_DECLARATION_CODE} from having an effect.',
  /**
   *@description The message shown in the Style pane when the user hovers over a property declaration that has no effect due to the properties of the parent element.
   *@example {display: block} EXISTING_PARENT_ELEMENT_RULE
   *@example {display: flex} TARGET_PARENT_ELEMENT_RULE
   */
  ruleViolatedByParentElementRuleFix:
      'Try setting the {EXISTING_PARENT_ELEMENT_RULE} property on the parent to {TARGET_PARENT_ELEMENT_RULE}.',

  /**
   *@description The warning text shown in Elements panel when font-variation-settings don't match allowed values
   *@example {wdth} PH1
   *@example {100} PH2
   *@example {10} PH3
   *@example {20} PH4
   *@example {Arial} PH5
   */
  fontVariationSettingsWarning:
      'Value for setting “{PH1}” {PH2} is outside the supported range [{PH3}, {PH4}] for font-family “{PH5}”.',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/CSSRuleValidator.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export const enum HintType {
  INACTIVE_PROPERTY = 'ruleValidation',
  DEPRECATED_PROPERTY = 'deprecatedProperty',
}

export class Hint {
  readonly #hintMessage: string;
  readonly #possibleFixMessage: string|null;
  readonly #learnMoreLink: string|undefined;

  constructor(hintMessage: string, possibleFixMessage: string|null, learnMoreLink?: string) {
    this.#hintMessage = hintMessage;
    this.#possibleFixMessage = possibleFixMessage;
    this.#learnMoreLink = learnMoreLink;
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
      propertyName: string, computedStyles?: Map<string, string>, parentComputedStyles?: Map<string, string>,
      nodeName?: string, fontFaces?: Array<SDK.CSSFontFace.CSSFontFace>): Hint|undefined;
}

export class AlignContentValidator extends CSSRuleValidator {
  constructor() {
    super(['align-content']);
  }

  override getMetricType(): Host.UserMetrics.CSSHintType {
    return Host.UserMetrics.CSSHintType.AlignContent;
  }

  getHint(_propertyName: string, computedStyles?: Map<string, string>): Hint|undefined {
    if (!computedStyles) {
      return;
    }
    if (!isFlexContainer(computedStyles)) {
      return;
    }
    if (computedStyles.get('flex-wrap') !== 'nowrap') {
      return;
    }

    const reasonPropertyDeclaration = buildPropertyDefinitionText('flex-wrap', 'nowrap');
    const affectedPropertyDeclarationCode = buildPropertyName('align-content');

    return new Hint(
        i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
          'AFFECTED_PROPERTY_DECLARATION_CODE': affectedPropertyDeclarationCode,
        }),
        i18nString(UIStrings.ruleViolatedBySameElementRuleFix, {
          PROPERTY_NAME: buildPropertyName('flex-wrap'),
          PROPERTY_VALUE: buildPropertyValue('nowrap'),
        }),
    );
  }
}

export class FlexItemValidator extends CSSRuleValidator {
  constructor() {
    super(['flex', 'flex-basis', 'flex-grow', 'flex-shrink']);
  }

  override getMetricType(): Host.UserMetrics.CSSHintType {
    return Host.UserMetrics.CSSHintType.FlexItem;
  }

  getHint(propertyName: string, computedStyles?: Map<string, string>, parentComputedStyles?: Map<string, string>): Hint
      |undefined {
    if (!parentComputedStyles) {
      return;
    }
    if (isFlexContainer(parentComputedStyles)) {
      return;
    }
    const reasonPropertyDeclaration = buildPropertyDefinitionText('display', parentComputedStyles?.get('display'));
    const affectedPropertyDeclarationCode = buildPropertyName(propertyName);
    const targetParentPropertyDeclaration = buildPropertyDefinitionText('display', 'flex');
    return new Hint(
        i18nString(UIStrings.ruleViolatedByParentElementRuleReason, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
          'AFFECTED_PROPERTY_DECLARATION_CODE': affectedPropertyDeclarationCode,
        }),
        i18nString(UIStrings.ruleViolatedByParentElementRuleFix, {
          'EXISTING_PARENT_ELEMENT_RULE': reasonPropertyDeclaration,
          'TARGET_PARENT_ELEMENT_RULE': targetParentPropertyDeclaration,
        }),
    );
  }
}

export class FlexContainerValidator extends CSSRuleValidator {
  constructor() {
    super(['flex-direction', 'flex-flow', 'flex-wrap']);
  }

  override getMetricType(): Host.UserMetrics.CSSHintType {
    return Host.UserMetrics.CSSHintType.FlexContainer;
  }

  getHint(propertyName: string, computedStyles?: Map<string, string>): Hint|undefined {
    if (!computedStyles) {
      return;
    }
    if (isFlexContainer(computedStyles)) {
      return;
    }
    const reasonPropertyDeclaration = buildPropertyDefinitionText('display', computedStyles?.get('display'));
    const targetRuleCode = buildPropertyDefinitionText('display', 'flex');
    const affectedPropertyDeclarationCode = buildPropertyName(propertyName);

    return new Hint(
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

  override getMetricType(): Host.UserMetrics.CSSHintType {
    return Host.UserMetrics.CSSHintType.GridContainer;
  }

  getHint(propertyName: string, computedStyles?: Map<string, string>): Hint|undefined {
    if (isGridContainer(computedStyles)) {
      return;
    }
    const reasonPropertyDeclaration = buildPropertyDefinitionText('display', computedStyles?.get('display'));
    const targetRuleCode = buildPropertyDefinitionText('display', 'grid');
    const affectedPropertyDeclarationCode = buildPropertyName(propertyName);

    return new Hint(
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
      // At the time of writing (November 2022), `justify-self` is only in effect in grid layout.
      // There are no other browsers that support `justify-self` in other layouts.
      // https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Box_Alignment/Box_Alignment_In_Block_Abspos_Tables
      // TODO: move `justify-self` to other validator or change pop-over text if Chrome supports CSS Align in other layouts.
      'justify-self',
    ]);
  }

  override getMetricType(): Host.UserMetrics.CSSHintType {
    return Host.UserMetrics.CSSHintType.GridItem;
  }

  getHint(propertyName: string, computedStyles?: Map<string, string>, parentComputedStyles?: Map<string, string>): Hint
      |undefined {
    if (!parentComputedStyles) {
      return;
    }
    if (isGridContainer(parentComputedStyles)) {
      return;
    }
    const reasonPropertyDeclaration = buildPropertyDefinitionText('display', parentComputedStyles?.get('display'));
    const targetParentPropertyDeclaration = buildPropertyDefinitionText('display', 'grid');
    const affectedPropertyDeclarationCode = buildPropertyName(propertyName);

    return new Hint(
        i18nString(UIStrings.ruleViolatedByParentElementRuleReason, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
          'AFFECTED_PROPERTY_DECLARATION_CODE': affectedPropertyDeclarationCode,
        }),
        i18nString(UIStrings.ruleViolatedByParentElementRuleFix, {
          'EXISTING_PARENT_ELEMENT_RULE': reasonPropertyDeclaration,
          'TARGET_PARENT_ELEMENT_RULE': targetParentPropertyDeclaration,
        }),
    );
  }
}

export class FlexOrGridItemValidator extends CSSRuleValidator {
  constructor() {
    super([
      'place-self',
      'align-self',
      'order',
    ]);
  }

  override getMetricType(): Host.UserMetrics.CSSHintType {
    return Host.UserMetrics.CSSHintType.FlexOrGridItem;
  }

  getHint(propertyName: string, computedStyles?: Map<string, string>, parentComputedStyles?: Map<string, string>): Hint
      |undefined {
    if (!parentComputedStyles) {
      return;
    }
    if (isFlexContainer(parentComputedStyles) || isGridContainer(parentComputedStyles)) {
      return;
    }
    const reasonPropertyDeclaration = buildPropertyDefinitionText('display', parentComputedStyles?.get('display'));
    const targetParentPropertyDeclaration =
        `${buildPropertyDefinitionText('display', 'flex')} or ${buildPropertyDefinitionText('display', 'grid')}`;
    const affectedPropertyDeclarationCode = buildPropertyName(propertyName);

    return new Hint(
        i18nString(UIStrings.ruleViolatedByParentElementRuleReason, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
          'AFFECTED_PROPERTY_DECLARATION_CODE': affectedPropertyDeclarationCode,
        }),
        i18nString(UIStrings.ruleViolatedByParentElementRuleFix, {
          'EXISTING_PARENT_ELEMENT_RULE': reasonPropertyDeclaration,
          'TARGET_PARENT_ELEMENT_RULE': targetParentPropertyDeclaration,
        }),
    );
  }
}

export class FlexGridValidator extends CSSRuleValidator {
  constructor() {
    super([
      'justify-content',
      'align-content',
      'place-content',  // Shorthand	<'align-content'> <'justify-content'>?
      'align-items',
    ]);
  }

  override getMetricType(): Host.UserMetrics.CSSHintType {
    return Host.UserMetrics.CSSHintType.FlexGrid;
  }

  getHint(propertyName: string, computedStyles?: Map<string, string>): Hint|undefined {
    if (!computedStyles) {
      return;
    }

    if (isFlexContainer(computedStyles) || isGridContainer(computedStyles)) {
      return;
    }

    const reasonPropertyDeclaration = buildPropertyDefinitionText('display', computedStyles?.get('display'));
    const affectedPropertyDeclarationCode = buildPropertyName(propertyName);

    return new Hint(
        i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
          'AFFECTED_PROPERTY_DECLARATION_CODE': affectedPropertyDeclarationCode,
        }),
        i18nString(UIStrings.ruleViolatedBySameElementRuleFix, {
          PROPERTY_NAME: buildPropertyName('display'),
          PROPERTY_VALUE: buildPropertyValue(computedStyles?.get('display') as string),
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

  override getMetricType(): Host.UserMetrics.CSSHintType {
    return Host.UserMetrics.CSSHintType.MulticolFlexGrid;
  }

  getHint(propertyName: string, computedStyles?: Map<string, string>): Hint|undefined {
    if (!computedStyles) {
      return;
    }

    if (isMulticolContainer(computedStyles) || isFlexContainer(computedStyles) || isGridContainer(computedStyles)) {
      return;
    }

    const reasonPropertyDeclaration = buildPropertyDefinitionText('display', computedStyles?.get('display'));
    const affectedPropertyDeclarationCode = buildPropertyName(propertyName);

    return new Hint(
        i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
          'AFFECTED_PROPERTY_DECLARATION_CODE': affectedPropertyDeclarationCode,
        }),
        i18nString(UIStrings.ruleViolatedBySameElementRuleFix, {
          PROPERTY_NAME: buildPropertyName('display'),
          PROPERTY_VALUE: buildPropertyValue(computedStyles?.get('display') as string),
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

  override getMetricType(): Host.UserMetrics.CSSHintType {
    return Host.UserMetrics.CSSHintType.Padding;
  }

  getHint(propertyName: string, computedStyles?: Map<string, string>): Hint|undefined {
    const display = computedStyles?.get('display');
    if (!display) {
      return;
    }
    const tableAttributes = [
      'table-row-group',
      'table-header-group',
      'table-footer-group',
      'table-row',
      'table-column-group',
      'table-column',
    ];
    if (!tableAttributes.includes(display)) {
      return;
    }

    const reasonPropertyDeclaration = buildPropertyDefinitionText('display', computedStyles?.get('display'));
    const affectedPropertyDeclarationCode = buildPropertyName(propertyName);

    return new Hint(
        i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
          'AFFECTED_PROPERTY_DECLARATION_CODE': affectedPropertyDeclarationCode,
        }),
        i18nString(UIStrings.ruleViolatedBySameElementRuleFix, {
          PROPERTY_NAME: buildPropertyName('display'),
          PROPERTY_VALUE: buildPropertyValue(computedStyles?.get('display') as string),
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

  override getMetricType(): Host.UserMetrics.CSSHintType {
    return Host.UserMetrics.CSSHintType.Position;
  }

  getHint(propertyName: string, computedStyles?: Map<string, string>): Hint|undefined {
    const position = computedStyles?.get('position');
    if (!position) {
      return;
    }
    if (position !== 'static') {
      return;
    }

    const reasonPropertyDeclaration = buildPropertyDefinitionText('position', computedStyles?.get('position'));
    const affectedPropertyDeclarationCode = buildPropertyName(propertyName);

    return new Hint(
        i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
          'AFFECTED_PROPERTY_DECLARATION_CODE': affectedPropertyDeclarationCode,
        }),
        i18nString(UIStrings.ruleViolatedBySameElementRuleFix, {
          PROPERTY_NAME: buildPropertyName('position'),
          PROPERTY_VALUE: buildPropertyValue(computedStyles?.get('position') as string),
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

  override getMetricType(): Host.UserMetrics.CSSHintType {
    return Host.UserMetrics.CSSHintType.ZIndex;
  }

  getHint(propertyName: string, computedStyles?: Map<string, string>, parentComputedStyles?: Map<string, string>): Hint
      |undefined {
    const position = computedStyles?.get('position');
    if (!position) {
      return;
    }
    if (['absolute', 'relative', 'fixed', 'sticky'].includes(position) || isFlexContainer(parentComputedStyles) ||
        isGridContainer(parentComputedStyles)) {
      return;
    }

    const reasonPropertyDeclaration = buildPropertyDefinitionText('position', computedStyles?.get('position'));
    const affectedPropertyDeclarationCode = buildPropertyName(propertyName);

    return new Hint(
        i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
          'AFFECTED_PROPERTY_DECLARATION_CODE': affectedPropertyDeclarationCode,
        }),
        i18nString(UIStrings.ruleViolatedBySameElementRuleFix, {
          PROPERTY_NAME: buildPropertyName('position'),
          PROPERTY_VALUE: buildPropertyValue(computedStyles?.get('position') as string),
        }),
    );
  }
}

/**
 * Validates if CSS width/height are having an effect on an element.
 * See "Applies to" in https://www.w3.org/TR/css-sizing-3/#propdef-width.
 * See "Applies to" in https://www.w3.org/TR/css-sizing-3/#propdef-height.
 */
export class SizingValidator extends CSSRuleValidator {
  constructor() {
    super([
      'width',
      'height',
    ]);
  }

  override getMetricType(): Host.UserMetrics.CSSHintType {
    return Host.UserMetrics.CSSHintType.Sizing;
  }

  getHint(
      propertyName: string, computedStyles?: Map<string, string>, parentComputedStyles?: Map<string, string>,
      nodeName?: string): Hint|undefined {
    if (!computedStyles || !nodeName) {
      return;
    }
    if (!isInlineElement(computedStyles)) {
      return;
    }
    // See https://html.spec.whatwg.org/multipage/rendering.html#replaced-elements.
    if (isPossiblyReplacedElement(nodeName)) {
      return;
    }

    const reasonPropertyDeclaration = buildPropertyDefinitionText('display', computedStyles?.get('display'));
    const affectedPropertyDeclarationCode = buildPropertyName(propertyName);

    return new Hint(
        i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
          'REASON_PROPERTY_DECLARATION_CODE': reasonPropertyDeclaration,
          'AFFECTED_PROPERTY_DECLARATION_CODE': affectedPropertyDeclarationCode,
        }),
        i18nString(UIStrings.ruleViolatedBySameElementRuleFix, {
          PROPERTY_NAME: buildPropertyName('display'),
          PROPERTY_VALUE: buildPropertyValue(computedStyles?.get('display') as string),
        }),
    );
  }
}

/**
 * Checks that font variation settings are applicable to the actual font.
 */
export class FontVariationSettingsValidator extends CSSRuleValidator {
  constructor() {
    super([
      'font-variation-settings',
    ]);
  }

  override getMetricType(): Host.UserMetrics.CSSHintType {
    return Host.UserMetrics.CSSHintType.FontVariationSettings;
  }

  getHint(
      propertyName: string, computedStyles?: Map<string, string>, parentComputedStyles?: Map<string, string>,
      nodeName?: string, fontFaces?: Array<SDK.CSSFontFace.CSSFontFace>): Hint|undefined {
    if (!computedStyles) {
      return;
    }
    const value = computedStyles.get('font-variation-settings');
    if (!value) {
      return;
    }
    const fontFamily = computedStyles.get('font-family');
    if (!fontFamily) {
      return;
    }
    const fontFamilies = new Set<string>(SDK.CSSPropertyParser.parseFontFamily(fontFamily));
    const matchingFontFaces = (fontFaces || []).filter(f => fontFamilies.has(f.getFontFamily()));
    const variationSettings = SDK.CSSPropertyParser.parseFontVariationSettings(value);
    const warnings = [];
    for (const elementSetting of variationSettings) {
      for (const font of matchingFontFaces) {
        const fontSetting = font.getVariationAxisByTag(elementSetting.tag);
        if (!fontSetting) {
          continue;
        }
        if (elementSetting.value < fontSetting.minValue || elementSetting.value > fontSetting.maxValue) {
          warnings.push(i18nString(UIStrings.fontVariationSettingsWarning, {
            PH1: elementSetting.tag,
            PH2: elementSetting.value,
            PH3: fontSetting.minValue,
            PH4: fontSetting.maxValue,
            PH5: font.getFontFamily(),
          }));
        }
      }
    }

    if (!warnings.length) {
      return;
    }

    return new Hint(
        warnings.join(' '),
        '',
    );
  }
}

const CSS_RULE_VALIDATORS = [
  AlignContentValidator,
  FlexContainerValidator,
  FlexGridValidator,
  FlexItemValidator,
  FlexOrGridItemValidator,
  FontVariationSettingsValidator,
  GridContainerValidator,
  GridItemValidator,
  MulticolFlexGridValidator,
  PaddingValidator,
  PositionValidator,
  SizingValidator,
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
