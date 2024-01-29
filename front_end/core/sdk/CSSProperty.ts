// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Common from '../common/common.js';
import * as HostModule from '../host/host.js';
import * as Platform from '../platform/platform.js';

import {cssMetadata, GridAreaRowRegex} from './CSSMetadata.js';
import {type Edit} from './CSSModel.js';
import {stripComments} from './CSSPropertyParser.js';
import {type CSSStyleDeclaration} from './CSSStyleDeclaration.js';

export class CSSProperty {
  ownerStyle: CSSStyleDeclaration;
  index: number;
  name: string;
  value: string;
  important: boolean;
  disabled: boolean;
  parsedOk: boolean;
  implicit: boolean;
  text: string|null|undefined;
  range: TextUtils.TextRange.TextRange|null;
  #active: boolean;
  #nameRangeInternal: TextUtils.TextRange.TextRange|null;
  #valueRangeInternal: TextUtils.TextRange.TextRange|null;
  #invalidString?: Common.UIString.LocalizedString;
  #longhandProperties: CSSProperty[] = [];

  constructor(
      ownerStyle: CSSStyleDeclaration, index: number, name: string, value: string, important: boolean,
      disabled: boolean, parsedOk: boolean, implicit: boolean, text?: string|null, range?: Protocol.CSS.SourceRange,
      longhandProperties?: Protocol.CSS.CSSProperty[]) {
    this.ownerStyle = ownerStyle;
    this.index = index;
    this.name = name;
    this.value = value;
    this.important = important;
    this.disabled = disabled;
    this.parsedOk = parsedOk;
    this.implicit = implicit;  // A longhand, implicitly set by missing values of shorthand.
    this.text = text;
    this.range = range ? TextUtils.TextRange.TextRange.fromObject(range) : null;
    this.#active = true;
    this.#nameRangeInternal = null;
    this.#valueRangeInternal = null;

    if (longhandProperties && longhandProperties.length > 0) {
      for (const property of longhandProperties) {
        this.#longhandProperties.push(
            new CSSProperty(ownerStyle, ++index, property.name, property.value, important, disabled, parsedOk, true));
      }
    } else {
      // Blink would not parse shorthands containing 'var()' functions:
      // https://drafts.csswg.org/css-variables/#variables-in-shorthands).
      // Therefore we manually check if the current property is a shorthand,
      // and fills its longhand components with empty values.
      const longhandNames = cssMetadata().getLonghands(name);
      for (const longhandName of longhandNames || []) {
        this.#longhandProperties.push(
            new CSSProperty(ownerStyle, ++index, longhandName, '', important, disabled, parsedOk, true));
      }
    }
  }

  static parsePayload(ownerStyle: CSSStyleDeclaration, index: number, payload: Protocol.CSS.CSSProperty): CSSProperty {
    // The following default field values are used in the payload:
    // important: false
    // parsedOk: true
    // implicit: false
    // disabled: false
    const result = new CSSProperty(
        ownerStyle, index, payload.name, payload.value, payload.important || false, payload.disabled || false,
        ('parsedOk' in payload) ? Boolean(payload.parsedOk) : true, Boolean(payload.implicit), payload.text,
        payload.range, payload.longhandProperties);
    return result;
  }

  private ensureRanges(): void {
    if (this.#nameRangeInternal && this.#valueRangeInternal) {
      return;
    }
    const range = this.range;
    const text = this.text ? new TextUtils.Text.Text(this.text) : null;
    if (!range || !text) {
      return;
    }

    const nameIndex = text.value().indexOf(this.name);
    const valueIndex = text.value().lastIndexOf(this.value);
    if (nameIndex === -1 || valueIndex === -1 || nameIndex > valueIndex) {
      return;
    }

    const nameSourceRange = new TextUtils.TextRange.SourceRange(nameIndex, this.name.length);
    const valueSourceRange = new TextUtils.TextRange.SourceRange(valueIndex, this.value.length);

    this.#nameRangeInternal = rebase(text.toTextRange(nameSourceRange), range.startLine, range.startColumn);
    this.#valueRangeInternal = rebase(text.toTextRange(valueSourceRange), range.startLine, range.startColumn);

    function rebase(oneLineRange: TextUtils.TextRange.TextRange, lineOffset: number, columnOffset: number):
        TextUtils.TextRange.TextRange {
      if (oneLineRange.startLine === 0) {
        oneLineRange.startColumn += columnOffset;
        oneLineRange.endColumn += columnOffset;
      }
      oneLineRange.startLine += lineOffset;
      oneLineRange.endLine += lineOffset;
      return oneLineRange;
    }
  }

  nameRange(): TextUtils.TextRange.TextRange|null {
    this.ensureRanges();
    return this.#nameRangeInternal;
  }

  valueRange(): TextUtils.TextRange.TextRange|null {
    this.ensureRanges();
    return this.#valueRangeInternal;
  }

  rebase(edit: Edit): void {
    if (this.ownerStyle.styleSheetId !== edit.styleSheetId) {
      return;
    }
    if (this.range) {
      this.range = this.range.rebaseAfterTextEdit(edit.oldRange, edit.newRange);
    }
  }

  setActive(active: boolean): void {
    this.#active = active;
  }

  get propertyText(): string|null {
    if (this.text !== undefined) {
      return this.text;
    }

    if (this.name === '') {
      return '';
    }
    return this.name + ': ' + this.value + (this.important ? ' !important' : '') + ';';
  }

  activeInStyle(): boolean {
    return this.#active;
  }

  trimmedValueWithoutImportant(): string {
    const important = '!important';
    return this.value.endsWith(important) ? this.value.slice(0, -important.length).trim() : this.value.trim();
  }

  async setText(propertyText: string, majorChange: boolean, overwrite?: boolean): Promise<boolean> {
    if (!this.ownerStyle) {
      throw new Error('No ownerStyle for property');
    }

    if (!this.ownerStyle.styleSheetId) {
      throw new Error('No owner style id');
    }

    if (!this.range || !this.ownerStyle.range) {
      throw new Error('Style not editable');
    }

    if (majorChange) {
      HostModule.userMetrics.actionTaken(HostModule.UserMetrics.Action.StyleRuleEdited);
      if (this.ownerStyle.parentRule?.isKeyframeRule()) {
        HostModule.userMetrics.actionTaken(HostModule.UserMetrics.Action.StylePropertyInsideKeyframeEdited);
      }

      if (this.name.startsWith('--')) {
        HostModule.userMetrics.actionTaken(HostModule.UserMetrics.Action.CustomPropertyEdited);
      }
    }

    if (overwrite && propertyText === this.propertyText) {
      this.ownerStyle.cssModel().domModel().markUndoableState(!majorChange);
      return true;
    }

    const range = this.range.relativeTo(this.ownerStyle.range.startLine, this.ownerStyle.range.startColumn);
    const indentation = this.ownerStyle.cssText ?
        this.detectIndentation(this.ownerStyle.cssText) :
        Common.Settings.Settings.instance().moduleSetting('text-editor-indent').get();
    const endIndentation = this.ownerStyle.cssText ? indentation.substring(0, this.ownerStyle.range.endColumn) : '';
    const text = new TextUtils.Text.Text(this.ownerStyle.cssText || '');
    const newStyleText = text.replaceRange(range, Platform.StringUtilities.sprintf(';%s;', propertyText));
    const styleText = await CSSProperty.formatStyle(newStyleText, indentation, endIndentation);
    return this.ownerStyle.setText(styleText, majorChange);
  }

  static async formatStyle(styleText: string, indentation: string, endIndentation: string): Promise<string> {
    const doubleIndent = indentation.substring(endIndentation.length) + indentation;
    if (indentation) {
      indentation = '\n' + indentation;
    }
    let result = '';
    let propertyName = '';
    let propertyText = '';
    let insideProperty = false;
    let needsSemi = false;
    const tokenize = TextUtils.CodeMirrorUtils.createCssTokenizer();

    await tokenize('*{' + styleText + '}', processToken);
    if (insideProperty) {
      result += propertyText;
    }
    result = result.substring(2, result.length - 1).trimEnd();
    return result + (indentation ? '\n' + endIndentation : '');

    function processToken(token: string, tokenType: string|null): void {
      if (!insideProperty) {
        const disabledProperty = tokenType?.includes('comment') && isDisabledProperty(token);
        const isPropertyStart =
            (tokenType?.includes('def') || tokenType?.includes('string') || tokenType?.includes('meta') ||
             tokenType?.includes('property') ||
             (tokenType?.includes('variableName') && tokenType !== ('variableName.function')));
        if (disabledProperty) {
          result = result.trimEnd() + indentation + token;
        } else if (isPropertyStart) {
          insideProperty = true;
          propertyText = token;
        } else if (token !== ';' || needsSemi) {
          result += token;
          if (token.trim() && !(tokenType?.includes('comment'))) {
            needsSemi = token !== ';';
          }
        }
        if (token === '{' && !tokenType) {
          needsSemi = false;
        }
        return;
      }

      if (token === '}' || token === ';') {
        // While `propertyText` can generally be trimmed, doing so
        // breaks valid CSS declarations such as `--foo:  ;` which would
        // then produce invalid CSS of the form `--foo:;`. This
        // implementation takes special care to restore a single
        // whitespace token in this edge case. https://crbug.com/1071296
        const trimmedPropertyText = propertyText.trim();
        result = result.trimEnd() + indentation + trimmedPropertyText + (trimmedPropertyText.endsWith(':') ? ' ' : '') +
            token;
        needsSemi = false;
        insideProperty = false;
        propertyName = '';
        return;
      }
      if (cssMetadata().isGridAreaDefiningProperty(propertyName)) {
        const rowResult = GridAreaRowRegex.exec(token);
        if (rowResult && rowResult.index === 0 && !propertyText.trimEnd().endsWith(']')) {
          propertyText = propertyText.trimEnd() + '\n' + doubleIndent;
        }
      }
      if (!propertyName && token === ':') {
        propertyName = propertyText;
      }
      propertyText += token;
    }

    function isDisabledProperty(text: string): boolean {
      const colon = text.indexOf(':');
      if (colon === -1) {
        return false;
      }
      const propertyName = text.substring(2, colon).trim();
      return cssMetadata().isCSSPropertyName(propertyName);
    }
  }

  private detectIndentation(text: string): string {
    const lines = text.split('\n');
    if (lines.length < 2) {
      return '';
    }
    return TextUtils.TextUtils.Utils.lineIndent(lines[1]);
  }

  setValue(newValue: string, majorChange: boolean, overwrite: boolean, userCallback?: ((arg0: boolean) => void)): void {
    const text = this.name + ': ' + newValue + (this.important ? ' !important' : '') + ';';
    void this.setText(text, majorChange, overwrite).then(userCallback);
  }

  async setDisabled(disabled: boolean): Promise<boolean> {
    if (!this.ownerStyle) {
      return false;
    }
    if (disabled === this.disabled) {
      return true;
    }
    if (!this.text) {
      return true;
    }
    const propertyText = this.text.trim();
    // Ensure that if we try to enable/disable a property that has no semicolon (which is only legal
    // in the last position of a css rule), we add it. This ensures that if we then later try
    // to re-enable/-disable the rule, we end up with legal syntax (if the user adds more properties
    // after the disabled rule).
    const appendSemicolonIfMissing = (propertyText: string): string =>
        propertyText + (propertyText.endsWith(';') ? '' : ';');
    let text: string;
    if (disabled) {
      // We remove comments before wrapping comment tags around propertyText, because otherwise it will
      // create an unmatched trailing `*/`, making the text invalid. This will result in disabled
      // CSSProperty losing its original comments, but since escaping comments will result in the parser
      // to completely ignore and then lose this declaration, this is the best compromise so far.
      text = '/* ' + appendSemicolonIfMissing(stripComments(propertyText)) + ' */';
    } else {
      text = appendSemicolonIfMissing(this.text.substring(2, propertyText.length - 2).trim());
    }
    return this.setText(text, true, true);
  }

  /**
   * This stores the warning string when a CSS Property is improperly parsed.
   */
  setDisplayedStringForInvalidProperty(invalidString: Common.UIString.LocalizedString): void {
    this.#invalidString = invalidString;
  }

  /**
   * Retrieve the warning string for a screen reader to announce when editing the property.
   */
  getInvalidStringForInvalidProperty(): Common.UIString.LocalizedString|undefined {
    return this.#invalidString;
  }

  getLonghandProperties(): CSSProperty[] {
    return this.#longhandProperties;
  }
}
