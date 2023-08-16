// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TextUtils from '../../models/text_utils/text_utils.js';
import type * as Protocol from '../../generated/protocol.js';

import {cssMetadata} from './CSSMetadata.js';
import {type CSSModel, type Edit} from './CSSModel.js';
import {CSSProperty} from './CSSProperty.js';
import {type CSSRule} from './CSSRule.js';
import {type Target} from './Target.js';

export class CSSStyleDeclaration {
  readonly #cssModelInternal: CSSModel;
  parentRule: CSSRule|null;
  #allPropertiesInternal!: CSSProperty[];
  styleSheetId!: Protocol.CSS.StyleSheetId|undefined;
  range!: TextUtils.TextRange.TextRange|null;
  cssText!: string|undefined;
  #shorthandValues!: Map<string, string>;
  #shorthandIsImportant!: Set<string>;
  #activePropertyMap!: Map<string, CSSProperty>;
  #leadingPropertiesInternal!: CSSProperty[]|null;
  type: Type;
  constructor(cssModel: CSSModel, parentRule: CSSRule|null, payload: Protocol.CSS.CSSStyle, type: Type) {
    this.#cssModelInternal = cssModel;
    this.parentRule = parentRule;
    this.#reinitialize(payload);
    this.type = type;
  }

  rebase(edit: Edit): void {
    if (this.styleSheetId !== edit.styleSheetId || !this.range) {
      return;
    }
    if (edit.oldRange.equal(this.range)) {
      this.#reinitialize((edit.payload as Protocol.CSS.CSSStyle));
    } else {
      this.range = this.range.rebaseAfterTextEdit(edit.oldRange, edit.newRange);
      for (let i = 0; i < this.#allPropertiesInternal.length; ++i) {
        this.#allPropertiesInternal[i].rebase(edit);
      }
    }
  }

  #reinitialize(payload: Protocol.CSS.CSSStyle): void {
    this.styleSheetId = payload.styleSheetId;
    this.range = payload.range ? TextUtils.TextRange.TextRange.fromObject(payload.range) : null;

    const shorthandEntries = payload.shorthandEntries;
    this.#shorthandValues = new Map();
    this.#shorthandIsImportant = new Set();
    for (let i = 0; i < shorthandEntries.length; ++i) {
      this.#shorthandValues.set(shorthandEntries[i].name, shorthandEntries[i].value);
      if (shorthandEntries[i].important) {
        this.#shorthandIsImportant.add(shorthandEntries[i].name);
      }
    }

    this.#allPropertiesInternal = [];

    if (payload.cssText && this.range) {
      const cssText = new TextUtils.Text.Text(payload.cssText);
      let start = {line: this.range.startLine, column: this.range.startColumn};

      const longhands = [];
      for (const cssProperty of payload.cssProperties) {
        const range = cssProperty.range;
        if (!range) {
          continue;
        }
        this.#parseUnusedText(cssText, start.line, start.column, range.startLine, range.startColumn);
        start = {line: range.endLine, column: range.endColumn};
        const parsedProperty = CSSProperty.parsePayload(this, this.#allPropertiesInternal.length, cssProperty);
        this.#allPropertiesInternal.push(parsedProperty);
        for (const longhand of parsedProperty.getLonghandProperties()) {
          longhands.push(longhand);
        }
      }
      for (const longhand of longhands) {
        longhand.index = this.#allPropertiesInternal.length;
        this.#allPropertiesInternal.push(longhand);
      }
      this.#parseUnusedText(cssText, start.line, start.column, this.range.endLine, this.range.endColumn);
    } else {
      for (const cssProperty of payload.cssProperties) {
        this.#allPropertiesInternal.push(
            CSSProperty.parsePayload(this, this.#allPropertiesInternal.length, cssProperty));
      }
    }

    this.#generateSyntheticPropertiesIfNeeded();
    this.#computeInactiveProperties();

    // TODO(changhaohan): verify if this #activePropertyMap is still necessary, or if it is
    // providing different information against the activeness in allPropertiesInternal.
    this.#activePropertyMap = new Map();
    for (const property of this.#allPropertiesInternal) {
      if (!property.activeInStyle()) {
        continue;
      }
      this.#activePropertyMap.set(property.name, property);
    }

    this.cssText = payload.cssText;
    this.#leadingPropertiesInternal = null;
  }

  #parseUnusedText(
      cssText: TextUtils.Text.Text, startLine: number, startColumn: number, endLine: number, endColumn: number): void {
    const tr = new TextUtils.TextRange.TextRange(startLine, startColumn, endLine, endColumn);
    if (!this.range) {
      return;
    }
    const missingText = cssText.extract(tr.relativeTo(this.range.startLine, this.range.startColumn));

    // Try to fit the malformed css into properties.
    const lines = missingText.split('\n');
    const context: SkipBlockContext = {
      inComment: false,
      nestedBlocks: 0,
      validContent: '',
    };
    for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
      skipBlocks(lines[lineNumber], context);
      if (context.nestedBlocks > 0 || !context.validContent) {
        // We skip the whole line if we have entered a nested block.
        continue;
      }

      let column = 0;
      for (const property of context.validContent.split(';')) {
        const trimmedProperty = property.trim();
        if (trimmedProperty) {
          let name;
          let value;
          const colonIndex = trimmedProperty.indexOf(':');
          if (colonIndex === -1) {
            name = trimmedProperty;
            value = '';
          } else {
            name = trimmedProperty.substring(0, colonIndex).trim();
            value = trimmedProperty.substring(colonIndex + 1).trim();
          }
          const range = new TextUtils.TextRange.TextRange(lineNumber, column, lineNumber, column + property.length);
          this.#allPropertiesInternal.push(new CSSProperty(
              this, this.#allPropertiesInternal.length, name, value, false, false, false, false, property,
              range.relativeFrom(startLine, startColumn)));
        }
        column += property.length + 1;
      }
    }

    function skipBlocks(text: string, context: SkipBlockContext): void {
      context.validContent = '';
      for (let i = 0; i < text.length; i++) {
        if (!context.inComment) {
          if (text[i] === '{') {
            context.nestedBlocks++;
            // Since we don't retrospectively parse the block's selector, we treat anything
            // between the last `;` and `{` as the block's selector and ignore it.
            context.validContent = context.validContent.substring(0, context.validContent.lastIndexOf(';') + 1);
          } else if (text[i] === '}') {
            context.nestedBlocks--;
          } else if (text.substring(i, i + 2) === '/*') {
            context.inComment = true;
            i++;
          } else if (context.nestedBlocks === 0) {
            context.validContent += text[i];
          }
        } else if (text.substring(i, i + 2) === '*/') {
          context.inComment = false;
          i++;
        }
      }
    }
  }

  #generateSyntheticPropertiesIfNeeded(): void {
    if (this.range) {
      return;
    }

    if (!this.#shorthandValues.size) {
      return;
    }

    const propertiesSet = new Set<string>();
    for (const property of this.#allPropertiesInternal) {
      propertiesSet.add(property.name);
    }

    const generatedProperties = [];
    // For style-based properties, generate #shorthands with values when possible.
    for (const property of this.#allPropertiesInternal) {
      // For style-based properties, try generating #shorthands.
      const shorthands = cssMetadata().getShorthands(property.name) || [];
      for (const shorthand of shorthands) {
        if (propertiesSet.has(shorthand)) {
          continue;
        }  // There already is a shorthand this #longhand falls under.
        const shorthandValue = this.#shorthandValues.get(shorthand);
        if (!shorthandValue) {
          continue;
        }  // Never generate synthetic #shorthands when no value is available.

        // Generate synthetic shorthand we have a value for.
        const shorthandImportance = Boolean(this.#shorthandIsImportant.has(shorthand));
        const shorthandProperty = new CSSProperty(
            this, this.allProperties().length, shorthand, shorthandValue, shorthandImportance, false, true, false);
        generatedProperties.push(shorthandProperty);
        propertiesSet.add(shorthand);
      }
    }
    this.#allPropertiesInternal = this.#allPropertiesInternal.concat(generatedProperties);
  }

  #computeLeadingProperties(): CSSProperty[] {
    function propertyHasRange(property: CSSProperty): boolean {
      return Boolean(property.range);
    }

    if (this.range) {
      return this.#allPropertiesInternal.filter(propertyHasRange);
    }

    const leadingProperties = [];
    for (const property of this.#allPropertiesInternal) {
      const shorthands = cssMetadata().getShorthands(property.name) || [];
      let belongToAnyShorthand = false;
      for (const shorthand of shorthands) {
        if (this.#shorthandValues.get(shorthand)) {
          belongToAnyShorthand = true;
          break;
        }
      }
      if (!belongToAnyShorthand) {
        leadingProperties.push(property);
      }
    }

    return leadingProperties;
  }

  leadingProperties(): CSSProperty[] {
    if (!this.#leadingPropertiesInternal) {
      this.#leadingPropertiesInternal = this.#computeLeadingProperties();
    }
    return this.#leadingPropertiesInternal;
  }

  target(): Target {
    return this.#cssModelInternal.target();
  }

  cssModel(): CSSModel {
    return this.#cssModelInternal;
  }

  #computeInactiveProperties(): void {
    const activeProperties = new Map<string, CSSProperty>();
    // The order of the properties are:
    // 1. regular property, including shorthands
    // 2. longhand components from shorthands, in the order of their shorthands.
    const processedLonghands = new Set();
    for (const property of this.#allPropertiesInternal) {
      if (property.disabled || !property.parsedOk) {
        property.setActive(false);
        continue;
      }
      if (processedLonghands.has(property)) {
        continue;
      }
      const metadata = cssMetadata();
      const canonicalName = metadata.canonicalPropertyName(property.name);
      for (const longhand of property.getLonghandProperties()) {
        const activeLonghand = activeProperties.get(longhand.name);
        if (!activeLonghand) {
          activeProperties.set(longhand.name, longhand);
        } else if (!activeLonghand.important || longhand.important) {
          activeLonghand.setActive(false);
          activeProperties.set(longhand.name, longhand);
        } else {
          longhand.setActive(false);
        }
        processedLonghands.add(longhand);
      }

      const activeProperty = activeProperties.get(canonicalName);
      if (!activeProperty) {
        activeProperties.set(canonicalName, property);
      } else if (!activeProperty.important || property.important) {
        activeProperty.setActive(false);
        activeProperties.set(canonicalName, property);
      } else {
        property.setActive(false);
      }
    }
  }

  allProperties(): CSSProperty[] {
    return this.#allPropertiesInternal;
  }

  hasActiveProperty(name: string): boolean {
    return this.#activePropertyMap.has(name);
  }

  getPropertyValue(name: string): string {
    const property = this.#activePropertyMap.get(name);
    return property ? property.value : '';
  }

  isPropertyImplicit(name: string): boolean {
    const property = this.#activePropertyMap.get(name);
    return property ? property.implicit : false;
  }

  propertyAt(index: number): CSSProperty|null {
    return (index < this.allProperties().length) ? this.allProperties()[index] : null;
  }

  pastLastSourcePropertyIndex(): number {
    for (let i = this.allProperties().length - 1; i >= 0; --i) {
      if (this.allProperties()[i].range) {
        return i + 1;
      }
    }
    return 0;
  }

  #insertionRange(index: number): TextUtils.TextRange.TextRange {
    const property = this.propertyAt(index);
    if (property && property.range) {
      return property.range.collapseToStart();
    }
    if (!this.range) {
      throw new Error('CSSStyleDeclaration.range is null');
    }
    return this.range.collapseToEnd();
  }

  newBlankProperty(index?: number): CSSProperty {
    index = (typeof index === 'undefined') ? this.pastLastSourcePropertyIndex() : index;
    const property = new CSSProperty(this, index, '', '', false, false, true, false, '', this.#insertionRange(index));
    return property;
  }

  setText(text: string, majorChange: boolean): Promise<boolean> {
    if (!this.range || !this.styleSheetId) {
      return Promise.resolve(false);
    }
    return this.#cssModelInternal.setStyleText(this.styleSheetId, this.range, text, majorChange);
  }

  insertPropertyAt(index: number, name: string, value: string, userCallback?: ((arg0: boolean) => void)): void {
    void this.newBlankProperty(index).setText(name + ': ' + value + ';', false, true).then(userCallback);
  }

  appendProperty(name: string, value: string, userCallback?: ((arg0: boolean) => void)): void {
    this.insertPropertyAt(this.allProperties().length, name, value, userCallback);
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Type {
  Regular = 'Regular',
  Inline = 'Inline',
  Attributes = 'Attributes',
  Pseudo = 'Pseudo',  // This type is for style declarations generated by devtools
}

type SkipBlockContext = {
  inComment: boolean,
  nestedBlocks: number,
  validContent: string,
};
