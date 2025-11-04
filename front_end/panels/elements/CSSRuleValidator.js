// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import { buildPropertyDefinitionText, buildPropertyName, buildPropertyValue, isBlockContainer, isFlexContainer, isGridContainer, isInlineElement, isMasonryContainer, isMulticolContainer, isPossiblyReplacedElement, } from './CSSRuleValidatorHelper.js';
const UIStrings = {
    /**
     * @description The message shown in the Style pane when the user hovers over a property that has no effect due to some other property.
     * @example {flex-wrap: nowrap} REASON_PROPERTY_DECLARATION_CODE
     * @example {align-content} AFFECTED_PROPERTY_DECLARATION_CODE
     */
    ruleViolatedBySameElementRuleReason: 'The {REASON_PROPERTY_DECLARATION_CODE} property prevents {AFFECTED_PROPERTY_DECLARATION_CODE} from having an effect.',
    /**
     * @description The message shown in the Style pane when the user hovers over a property declaration that has no effect due to some other property.
     * @example {flex-wrap} PROPERTY_NAME
     * @example {nowrap} PROPERTY_VALUE
     */
    ruleViolatedBySameElementRuleFix: 'Try setting {PROPERTY_NAME} to something other than {PROPERTY_VALUE}.',
    /**
     * @description The message shown in the Style pane when the user hovers over a property declaration that has no effect due to not being a flex or grid container.
     * @example {display: grid} DISPLAY_GRID_RULE
     * @example {display: flex} DISPLAY_FLEX_RULE
     */
    ruleViolatedBySameElementRuleChangeFlexOrGrid: 'Try adding {DISPLAY_GRID_RULE} or {DISPLAY_FLEX_RULE} to make this element into a container.',
    /**
     * @description The message shown in the Style pane when the user hovers over a property declaration that has no effect due to the current property value.
     * @example {display: block} EXISTING_PROPERTY_DECLARATION
     * @example {display: flex} TARGET_PROPERTY_DECLARATION
     */
    ruleViolatedBySameElementRuleChangeSuggestion: 'Try setting the {EXISTING_PROPERTY_DECLARATION} property to {TARGET_PROPERTY_DECLARATION}.',
    /**
     * @description The message shown in the Style pane when the user hovers over a property declaration that has no effect due to properties of the parent element.
     * @example {display: block} REASON_PROPERTY_DECLARATION_CODE
     * @example {flex} AFFECTED_PROPERTY_DECLARATION_CODE
     */
    ruleViolatedByParentElementRuleReason: 'The {REASON_PROPERTY_DECLARATION_CODE} property on the parent element prevents {AFFECTED_PROPERTY_DECLARATION_CODE} from having an effect.',
    /**
     * @description The message shown in the Style pane when the user hovers over a property declaration that has no effect due to the properties of the parent element.
     * @example {display: block} EXISTING_PARENT_ELEMENT_RULE
     * @example {display: flex} TARGET_PARENT_ELEMENT_RULE
     */
    ruleViolatedByParentElementRuleFix: 'Try setting the {EXISTING_PARENT_ELEMENT_RULE} property on the parent to {TARGET_PARENT_ELEMENT_RULE}.',
    /**
     * @description The warning text shown in Elements panel when font-variation-settings don't match allowed values
     * @example {wdth} PH1
     * @example {100} PH2
     * @example {10} PH3
     * @example {20} PH4
     * @example {Arial} PH5
     */
    fontVariationSettingsWarning: 'Value for setting “{PH1}” {PH2} is outside the supported range [{PH3}, {PH4}] for font-family “{PH5}”.',
    /**
     * @description The message shown in the Style pane when the user hovers over a property declaration that has no effect on flex or grid child items.
     * @example {flex} CONTAINER_DISPLAY_NAME
     * @example {align-contents} PROPERTY_NAME
     */
    flexGridContainerPropertyRuleReason: 'This element is a {CONTAINER_DISPLAY_NAME} item, i.e. a child of a {CONTAINER_DISPLAY_NAME} container, but {PROPERTY_NAME} only applies to containers.',
    /**
     * @description The message shown in the Style pane when the user hovers over a property declaration that has no effect on flex or grid child items.
     * @example {align-contents} PROPERTY_NAME
     * @example {align-self} ALTERNATIVE_PROPERTY_NAME
     */
    flexGridContainerPropertyRuleFix: 'Try setting the {PROPERTY_NAME} on the container element or use {ALTERNATIVE_PROPERTY_NAME} instead.',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/CSSRuleValidator.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class Hint {
    #hintMessage;
    #possibleFixMessage;
    #learnMoreLink;
    constructor(hintMessage, possibleFixMessage, learnMoreLink) {
        this.#hintMessage = hintMessage;
        this.#possibleFixMessage = possibleFixMessage;
        this.#learnMoreLink = learnMoreLink;
    }
    getMessage() {
        return this.#hintMessage;
    }
    getPossibleFixMessage() {
        return this.#possibleFixMessage;
    }
    getLearnMoreLink() {
        return this.#learnMoreLink;
    }
}
export class CSSRuleValidator {
    #affectedProperties;
    constructor(affectedProperties) {
        this.#affectedProperties = affectedProperties;
    }
    getApplicableProperties() {
        return this.#affectedProperties;
    }
}
export class AlignContentValidator extends CSSRuleValidator {
    constructor() {
        super(['align-content', 'place-content']);
    }
    getHint(_propertyName, computedStyles) {
        if (!computedStyles) {
            return;
        }
        const isFlex = isFlexContainer(computedStyles);
        if (!isFlex && !isBlockContainer(computedStyles) && !isGridContainer(computedStyles) &&
            !isMasonryContainer(computedStyles)) {
            const reasonPropertyDeclaration = buildPropertyDefinitionText('display', computedStyles?.get('display'));
            const affectedPropertyDeclarationCode = buildPropertyName('align-content');
            return new Hint(i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
                REASON_PROPERTY_DECLARATION_CODE: reasonPropertyDeclaration,
                AFFECTED_PROPERTY_DECLARATION_CODE: affectedPropertyDeclarationCode,
            }), i18nString(UIStrings.ruleViolatedBySameElementRuleFix, {
                PROPERTY_NAME: buildPropertyName('display'),
                PROPERTY_VALUE: buildPropertyValue(computedStyles?.get('display')),
            }));
        }
        if (!isFlex) {
            return;
        }
        if (computedStyles.get('flex-wrap') !== 'nowrap') {
            return;
        }
        const reasonPropertyDeclaration = buildPropertyDefinitionText('flex-wrap', 'nowrap');
        const affectedPropertyDeclarationCode = buildPropertyName('align-content');
        return new Hint(i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
            REASON_PROPERTY_DECLARATION_CODE: reasonPropertyDeclaration,
            AFFECTED_PROPERTY_DECLARATION_CODE: affectedPropertyDeclarationCode,
        }), i18nString(UIStrings.ruleViolatedBySameElementRuleFix, {
            PROPERTY_NAME: buildPropertyName('flex-wrap'),
            PROPERTY_VALUE: buildPropertyValue('nowrap'),
        }));
    }
}
export class FlexItemValidator extends CSSRuleValidator {
    constructor() {
        super(['flex', 'flex-basis', 'flex-grow', 'flex-shrink']);
    }
    getHint(propertyName, _computedStyles, parentComputedStyles) {
        if (!parentComputedStyles) {
            return;
        }
        if (isFlexContainer(parentComputedStyles)) {
            return;
        }
        const reasonPropertyDeclaration = buildPropertyDefinitionText('display', parentComputedStyles?.get('display'));
        const affectedPropertyDeclarationCode = buildPropertyName(propertyName);
        const targetParentPropertyDeclaration = buildPropertyDefinitionText('display', 'flex');
        return new Hint(i18nString(UIStrings.ruleViolatedByParentElementRuleReason, {
            REASON_PROPERTY_DECLARATION_CODE: reasonPropertyDeclaration,
            AFFECTED_PROPERTY_DECLARATION_CODE: affectedPropertyDeclarationCode,
        }), i18nString(UIStrings.ruleViolatedByParentElementRuleFix, {
            EXISTING_PARENT_ELEMENT_RULE: reasonPropertyDeclaration,
            TARGET_PARENT_ELEMENT_RULE: targetParentPropertyDeclaration,
        }));
    }
}
export class FlexContainerValidator extends CSSRuleValidator {
    constructor() {
        super(['flex-direction', 'flex-flow', 'flex-wrap']);
    }
    getHint(propertyName, computedStyles) {
        if (!computedStyles) {
            return;
        }
        if (isFlexContainer(computedStyles)) {
            return;
        }
        const reasonPropertyDeclaration = buildPropertyDefinitionText('display', computedStyles?.get('display'));
        const targetRuleCode = buildPropertyDefinitionText('display', 'flex');
        const affectedPropertyDeclarationCode = buildPropertyName(propertyName);
        return new Hint(i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
            REASON_PROPERTY_DECLARATION_CODE: reasonPropertyDeclaration,
            AFFECTED_PROPERTY_DECLARATION_CODE: affectedPropertyDeclarationCode,
        }), i18nString(UIStrings.ruleViolatedBySameElementRuleChangeSuggestion, {
            EXISTING_PROPERTY_DECLARATION: reasonPropertyDeclaration,
            TARGET_PROPERTY_DECLARATION: targetRuleCode,
        }));
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
    getHint(propertyName, computedStyles) {
        if (isGridContainer(computedStyles) || isMasonryContainer(computedStyles)) {
            return;
        }
        const reasonPropertyDeclaration = buildPropertyDefinitionText('display', computedStyles?.get('display'));
        const targetRuleCode = buildPropertyDefinitionText('display', 'grid');
        const affectedPropertyDeclarationCode = buildPropertyName(propertyName);
        return new Hint(i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
            REASON_PROPERTY_DECLARATION_CODE: reasonPropertyDeclaration,
            AFFECTED_PROPERTY_DECLARATION_CODE: affectedPropertyDeclarationCode,
        }), i18nString(UIStrings.ruleViolatedBySameElementRuleChangeSuggestion, {
            EXISTING_PROPERTY_DECLARATION: reasonPropertyDeclaration,
            TARGET_PROPERTY_DECLARATION: targetRuleCode,
        }));
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
    getHint(propertyName, _computedStyles, parentComputedStyles) {
        if (!parentComputedStyles) {
            return;
        }
        if (isGridContainer(parentComputedStyles) || isMasonryContainer(parentComputedStyles)) {
            return;
        }
        const reasonPropertyDeclaration = buildPropertyDefinitionText('display', parentComputedStyles?.get('display'));
        const targetParentPropertyDeclaration = buildPropertyDefinitionText('display', 'grid');
        const affectedPropertyDeclarationCode = buildPropertyName(propertyName);
        return new Hint(i18nString(UIStrings.ruleViolatedByParentElementRuleReason, {
            REASON_PROPERTY_DECLARATION_CODE: reasonPropertyDeclaration,
            AFFECTED_PROPERTY_DECLARATION_CODE: affectedPropertyDeclarationCode,
        }), i18nString(UIStrings.ruleViolatedByParentElementRuleFix, {
            EXISTING_PARENT_ELEMENT_RULE: reasonPropertyDeclaration,
            TARGET_PARENT_ELEMENT_RULE: targetParentPropertyDeclaration,
        }));
    }
}
export class FlexOrGridItemValidator extends CSSRuleValidator {
    constructor() {
        super([
            'order',
        ]);
    }
    getHint(propertyName, _computedStyles, parentComputedStyles) {
        if (!parentComputedStyles) {
            return;
        }
        if (isFlexContainer(parentComputedStyles) || isGridContainer(parentComputedStyles)) {
            return;
        }
        const reasonPropertyDeclaration = buildPropertyDefinitionText('display', parentComputedStyles?.get('display'));
        const targetParentPropertyDeclaration = `${buildPropertyDefinitionText('display', 'flex')} or ${buildPropertyDefinitionText('display', 'grid')}`;
        const affectedPropertyDeclarationCode = buildPropertyName(propertyName);
        return new Hint(i18nString(UIStrings.ruleViolatedByParentElementRuleReason, {
            REASON_PROPERTY_DECLARATION_CODE: reasonPropertyDeclaration,
            AFFECTED_PROPERTY_DECLARATION_CODE: affectedPropertyDeclarationCode,
        }), i18nString(UIStrings.ruleViolatedByParentElementRuleFix, {
            EXISTING_PARENT_ELEMENT_RULE: reasonPropertyDeclaration,
            TARGET_PARENT_ELEMENT_RULE: targetParentPropertyDeclaration,
        }));
    }
}
export class FlexGridValidator extends CSSRuleValidator {
    constructor() {
        // justify-content is specified to affect multicol, but we don't implement that yet.
        super(['justify-content']);
    }
    getHint(propertyName, computedStyles, parentComputedStyles) {
        if (!computedStyles) {
            return;
        }
        if (isFlexContainer(computedStyles) || isGridContainer(computedStyles) || isMasonryContainer(computedStyles)) {
            return;
        }
        if (parentComputedStyles &&
            (isFlexContainer(parentComputedStyles) || isGridContainer(parentComputedStyles) ||
                isMasonryContainer(parentComputedStyles))) {
            const reasonContainerDisplayName = buildPropertyValue(parentComputedStyles.get('display'));
            const reasonPropertyName = buildPropertyName(propertyName);
            const reasonAlternativePropertyName = buildPropertyName('justify-self');
            return new Hint(i18nString(UIStrings.flexGridContainerPropertyRuleReason, {
                CONTAINER_DISPLAY_NAME: reasonContainerDisplayName,
                PROPERTY_NAME: reasonPropertyName,
            }), i18nString(UIStrings.flexGridContainerPropertyRuleFix, {
                PROPERTY_NAME: reasonPropertyName,
                ALTERNATIVE_PROPERTY_NAME: reasonAlternativePropertyName,
            }));
        }
        const reasonPropertyDeclaration = buildPropertyDefinitionText('display', computedStyles.get('display'));
        const affectedPropertyDeclarationCode = buildPropertyName(propertyName);
        return new Hint(i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
            REASON_PROPERTY_DECLARATION_CODE: reasonPropertyDeclaration,
            AFFECTED_PROPERTY_DECLARATION_CODE: affectedPropertyDeclarationCode,
        }), i18nString(UIStrings.ruleViolatedBySameElementRuleChangeFlexOrGrid, {
            DISPLAY_GRID_RULE: buildPropertyDefinitionText('display', 'grid'),
            DISPLAY_FLEX_RULE: buildPropertyDefinitionText('display', 'flex'),
        }));
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
            'grid-row-gap',
        ]);
    }
    getHint(propertyName, computedStyles) {
        if (!computedStyles) {
            return;
        }
        if (isMulticolContainer(computedStyles) || isFlexContainer(computedStyles) || isGridContainer(computedStyles) ||
            isMasonryContainer(computedStyles)) {
            return;
        }
        const reasonPropertyDeclaration = buildPropertyDefinitionText('display', computedStyles?.get('display'));
        const affectedPropertyDeclarationCode = buildPropertyName(propertyName);
        return new Hint(i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
            REASON_PROPERTY_DECLARATION_CODE: reasonPropertyDeclaration,
            AFFECTED_PROPERTY_DECLARATION_CODE: affectedPropertyDeclarationCode,
        }), i18nString(UIStrings.ruleViolatedBySameElementRuleFix, {
            PROPERTY_NAME: buildPropertyName('display'),
            PROPERTY_VALUE: buildPropertyValue(computedStyles?.get('display')),
        }));
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
    getHint(propertyName, computedStyles) {
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
        return new Hint(i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
            REASON_PROPERTY_DECLARATION_CODE: reasonPropertyDeclaration,
            AFFECTED_PROPERTY_DECLARATION_CODE: affectedPropertyDeclarationCode,
        }), i18nString(UIStrings.ruleViolatedBySameElementRuleFix, {
            PROPERTY_NAME: buildPropertyName('display'),
            PROPERTY_VALUE: buildPropertyValue(computedStyles?.get('display')),
        }));
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
    getHint(propertyName, computedStyles) {
        const position = computedStyles?.get('position');
        if (!position) {
            return;
        }
        if (position !== 'static') {
            return;
        }
        const reasonPropertyDeclaration = buildPropertyDefinitionText('position', computedStyles?.get('position'));
        const affectedPropertyDeclarationCode = buildPropertyName(propertyName);
        return new Hint(i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
            REASON_PROPERTY_DECLARATION_CODE: reasonPropertyDeclaration,
            AFFECTED_PROPERTY_DECLARATION_CODE: affectedPropertyDeclarationCode,
        }), i18nString(UIStrings.ruleViolatedBySameElementRuleFix, {
            PROPERTY_NAME: buildPropertyName('position'),
            PROPERTY_VALUE: buildPropertyValue(computedStyles?.get('position')),
        }));
    }
}
export class ZIndexValidator extends CSSRuleValidator {
    constructor() {
        super([
            'z-index',
        ]);
    }
    getHint(propertyName, computedStyles, parentComputedStyles) {
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
        return new Hint(i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
            REASON_PROPERTY_DECLARATION_CODE: reasonPropertyDeclaration,
            AFFECTED_PROPERTY_DECLARATION_CODE: affectedPropertyDeclarationCode,
        }), i18nString(UIStrings.ruleViolatedBySameElementRuleFix, {
            PROPERTY_NAME: buildPropertyName('position'),
            PROPERTY_VALUE: buildPropertyValue(computedStyles?.get('position')),
        }));
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
    getHint(propertyName, computedStyles, _parentComputedStyles, nodeName) {
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
        return new Hint(i18nString(UIStrings.ruleViolatedBySameElementRuleReason, {
            REASON_PROPERTY_DECLARATION_CODE: reasonPropertyDeclaration,
            AFFECTED_PROPERTY_DECLARATION_CODE: affectedPropertyDeclarationCode,
        }), i18nString(UIStrings.ruleViolatedBySameElementRuleFix, {
            PROPERTY_NAME: buildPropertyName('display'),
            PROPERTY_VALUE: buildPropertyValue(computedStyles?.get('display')),
        }));
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
    getHint(_propertyName, computedStyles, _parentComputedStyles, _nodeName, fontFaces) {
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
        const fontFamilies = new Set(SDK.CSSPropertyParser.parseFontFamily(fontFamily));
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
        return new Hint(warnings.join(' '), '');
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
const setupCSSRulesValidators = () => {
    const validatorsMap = new Map();
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
export const cssRuleValidatorsMap = setupCSSRulesValidators();
//# sourceMappingURL=CSSRuleValidator.js.map