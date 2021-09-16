/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import type * as Workspace from '../../models/workspace/workspace.js';
import * as ColorPicker from '../../ui/legacy/components/color_picker/color_picker.js';
import * as InlineEditor from '../../ui/legacy/components/inline_editor/inline_editor.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import type * as TextEditor from '../../ui/legacy/components/text_editor/text_editor.js';
import * as UI from '../../ui/legacy/legacy.js';

import {Plugin} from './Plugin.js';

const UIStrings = {
  /**
  *@description Swatch icon element title in CSSPlugin of the Sources panel
  */
  openColorPicker: 'Open color picker.',
  /**
  *@description Text to open the cubic bezier editor
  */
  openCubicBezierEditor: 'Open cubic bezier editor.',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/CSSPlugin.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class CSSPlugin extends Plugin {
  private textEditor: SourceFrame.SourcesTextEditor.SourcesTextEditor;
  private readonly swatchPopoverHelper: InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper;
  private muteSwatchProcessing: boolean;
  private hadSwatchChange: boolean;
  private bezierEditor: InlineEditor.BezierEditor.BezierEditor|null;
  private editedSwatchTextRange: TextUtils.TextRange.TextRange|null;
  private spectrum: ColorPicker.Spectrum.Spectrum|null;
  private currentSwatch: Element|null;
  private boundHandleKeyDown: ((arg0: Event) => void)|null;
  constructor(textEditor: SourceFrame.SourcesTextEditor.SourcesTextEditor) {
    super();
    this.textEditor = textEditor;
    this.swatchPopoverHelper = new InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper();
    this.muteSwatchProcessing = false;
    this.hadSwatchChange = false;
    this.bezierEditor = null;
    this.editedSwatchTextRange = null;
    this.spectrum = null;
    this.currentSwatch = null;
    this.textEditor.configureAutocomplete({
      suggestionsCallback: this.cssSuggestions.bind(this),
      isWordChar: this.isWordChar.bind(this),
      anchorBehavior: undefined,
      substituteRangeCallback: undefined,
      tooltipCallback: undefined,
    });
    this.textEditor.addEventListener(SourceFrame.SourcesTextEditor.Events.ScrollChanged, this.textEditorScrolled, this);
    this.textEditor.addEventListener(UI.TextEditor.Events.TextChanged, this.onTextChanged, this);
    this.updateSwatches(0, this.textEditor.linesCount - 1);
    this.boundHandleKeyDown = null;

    this.registerShortcuts();
  }

  static accepts(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean {
    return uiSourceCode.contentType().isStyleSheet();
  }

  private registerShortcuts(): void {
    this.boundHandleKeyDown =
        UI.ShortcutRegistry.ShortcutRegistry.instance().addShortcutListener(this.textEditor.element, {
          'sources.increment-css': this.handleUnitModification.bind(this, 1),
          'sources.increment-css-by-ten': this.handleUnitModification.bind(this, 10),
          'sources.decrement-css': this.handleUnitModification.bind(this, -1),
          'sources.decrement-css-by-ten': this.handleUnitModification.bind(this, -10),
        });
  }

  private textEditorScrolled(): void {
    if (this.swatchPopoverHelper.isShowing()) {
      this.swatchPopoverHelper.hide(true);
    }
  }

  private modifyUnit(unit: string, change: number): string|null {
    const unitValue = parseInt(unit, 10);
    if (isNaN(unitValue)) {
      return null;
    }
    const tail = unit.substring((unitValue).toString().length);
    return Platform.StringUtilities.sprintf('%d%s', unitValue + change, tail);
  }

  private async handleUnitModification(change: number): Promise<boolean> {
    const selection = this.textEditor.selection().normalize();
    let token = this.textEditor.tokenAtTextPosition(selection.startLine, selection.startColumn);
    if (!token) {
      if (selection.startColumn > 0) {
        token = this.textEditor.tokenAtTextPosition(selection.startLine, selection.startColumn - 1);
      }
      if (!token) {
        return false;
      }
    }
    if (token.type !== 'css-number') {
      return false;
    }

    const cssUnitRange =
        new TextUtils.TextRange.TextRange(selection.startLine, token.startColumn, selection.startLine, token.endColumn);
    const cssUnitText = this.textEditor.text(cssUnitRange);
    const newUnitText = this.modifyUnit(cssUnitText, change);
    if (!newUnitText) {
      return false;
    }
    this.textEditor.editRange(cssUnitRange, newUnitText);
    selection.startColumn = token.startColumn;
    selection.endColumn = selection.startColumn + newUnitText.length;
    this.textEditor.setSelection(selection);
    return true;
  }

  private updateSwatches(startLine: number, endLine: number): void {
    const swatches: HTMLElement[] = [];
    const swatchPositions: TextUtils.TextRange.TextRange[] = [];

    const regexes =
        [SDK.CSSMetadata.VariableRegex, SDK.CSSMetadata.URLRegex, UI.Geometry.CubicBezier.Regex, Common.Color.Regex];
    const handlers = new Map<RegExp, (text: string) => HTMLElement | null>();
    handlers.set(Common.Color.Regex, this.createColorSwatch.bind(this));
    handlers.set(UI.Geometry.CubicBezier.Regex, this.createBezierSwatch.bind(this));

    for (let lineNumber = startLine; lineNumber <= endLine; lineNumber++) {
      const line = this.textEditor.line(lineNumber).substring(0, maxSwatchProcessingLength);
      const results = TextUtils.TextUtils.Utils.splitStringByRegexes(line, regexes);
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const handler = handlers.get(regexes[result.regexIndex]);
        if (result.regexIndex === -1 || !handler) {
          continue;
        }
        const delimiters = /[\s:;,(){}]/;
        const positionBefore = result.position - 1;
        const positionAfter = result.position + result.value.length;
        if (positionBefore >= 0 && !delimiters.test(line.charAt(positionBefore)) ||
            positionAfter < line.length && !delimiters.test(line.charAt(positionAfter))) {
          continue;
        }
        const swatch = handler(result.value);
        if (!swatch) {
          continue;
        }
        swatches.push(swatch);
        swatchPositions.push(TextUtils.TextRange.TextRange.createFromLocation(lineNumber, result.position));
      }
    }
    this.textEditor.operation(putSwatchesInline.bind(this));

    function putSwatchesInline(this: CSSPlugin): void {
      const clearRange = new TextUtils.TextRange.TextRange(startLine, 0, endLine, this.textEditor.line(endLine).length);
      this.textEditor.bookmarks(clearRange, SwatchBookmark).forEach(marker => marker.clear());

      for (let i = 0; i < swatches.length; i++) {
        const swatch = swatches[i];
        const swatchPosition = swatchPositions[i];
        const bookmark =
            this.textEditor.addBookmark(swatchPosition.startLine, swatchPosition.startColumn, swatch, SwatchBookmark);
        swatchToBookmark.set(swatch, bookmark);
      }
    }
  }

  private createColorSwatch(text: string): HTMLElement|null {
    const color = Common.Color.Color.parse(text);
    if (!color) {
      return null;
    }
    const swatch = new InlineEditor.ColorSwatch.ColorSwatch();
    swatch.renderColor(color, false, i18nString(UIStrings.openColorPicker));
    const value = swatch.createChild('span');
    value.textContent = text;
    value.setAttribute('hidden', 'true');

    swatch.addEventListener(
        InlineEditor.ColorSwatch.ClickEvent.eventName, this.swatchIconClicked.bind(this, swatch), false);
    return swatch;
  }

  private createBezierSwatch(text: string): InlineEditor.Swatches.BezierSwatch|null {
    if (!UI.Geometry.CubicBezier.parse(text)) {
      return null;
    }
    const swatch = InlineEditor.Swatches.BezierSwatch.create();
    swatch.setBezierText(text);
    UI.Tooltip.Tooltip.install(swatch.iconElement(), i18nString(UIStrings.openCubicBezierEditor));
    swatch.iconElement().addEventListener('click', this.swatchIconClicked.bind(this, swatch), false);
    swatch.hideText(true);
    return swatch;
  }

  private swatchIconClicked(swatch: Element, event: Event): void {
    event.consume(true);
    this.hadSwatchChange = false;
    this.muteSwatchProcessing = true;
    const bookmark = swatchToBookmark.get(swatch);
    if (!bookmark) {
      return;
    }
    const swatchPosition = bookmark.position();
    if (!swatchPosition) {
      return;
    }
    this.textEditor.setSelection(swatchPosition);
    this.editedSwatchTextRange = swatchPosition.clone();
    if (this.editedSwatchTextRange) {
      this.editedSwatchTextRange.endColumn += (swatch.textContent || '').length;
    }
    this.currentSwatch = swatch;

    if (InlineEditor.ColorSwatch.ColorSwatch.isColorSwatch(swatch)) {
      this.showSpectrum((swatch as InlineEditor.ColorSwatch.ColorSwatch));
    } else if (swatch instanceof InlineEditor.Swatches.BezierSwatch) {
      this.showBezierEditor(swatch);
    }
  }

  private showSpectrum(swatch: InlineEditor.ColorSwatch.ColorSwatch): void {
    if (!this.spectrum) {
      this.spectrum = new ColorPicker.Spectrum.Spectrum();
      this.spectrum.addEventListener(ColorPicker.Spectrum.Events.SizeChanged, this.spectrumResized, this);
      this.spectrum.addEventListener(ColorPicker.Spectrum.Events.ColorChanged, this.spectrumChanged, this);
    }
    this.spectrum.setColor((swatch.getColor() as Common.Color.Color), swatch.getFormat() || '');
    this.swatchPopoverHelper.show(this.spectrum, swatch, this.swatchPopoverHidden.bind(this));
  }

  private spectrumResized(): void {
    this.swatchPopoverHelper.reposition();
  }

  private spectrumChanged(event: Common.EventTarget.EventTargetEvent<string>): void {
    const colorString = event.data;
    const color = Common.Color.Color.parse(colorString);
    if (!color || !this.currentSwatch) {
      return;
    }

    if (InlineEditor.ColorSwatch.ColorSwatch.isColorSwatch(this.currentSwatch)) {
      const swatch = (this.currentSwatch as InlineEditor.ColorSwatch.ColorSwatch);
      swatch.renderColor(color);
    }
    this.changeSwatchText(colorString);
  }

  private showBezierEditor(swatch: InlineEditor.Swatches.BezierSwatch): void {
    const cubicBezier = UI.Geometry.CubicBezier.parse(swatch.bezierText()) ||
        (UI.Geometry.CubicBezier.parse('linear') as UI.Geometry.CubicBezier);
    if (!this.bezierEditor) {
      this.bezierEditor = new InlineEditor.BezierEditor.BezierEditor(cubicBezier);
      this.bezierEditor.addEventListener(InlineEditor.BezierEditor.Events.BezierChanged, this.bezierChanged, this);
    } else {
      this.bezierEditor.setBezier(cubicBezier);
    }
    this.swatchPopoverHelper.show(this.bezierEditor, swatch.iconElement(), this.swatchPopoverHidden.bind(this));
  }

  private bezierChanged(event: Common.EventTarget.EventTargetEvent): void {
    const bezierString = (event.data as string);
    if (this.currentSwatch instanceof InlineEditor.Swatches.BezierSwatch) {
      this.currentSwatch.setBezierText(bezierString);
    }
    this.changeSwatchText(bezierString);
  }

  private changeSwatchText(text: string): void {
    this.hadSwatchChange = true;
    const editedRange = (this.editedSwatchTextRange as TextUtils.TextRange.TextRange);
    this.textEditor.editRange(editedRange, text, '*swatch-text-changed');
    editedRange.endColumn = editedRange.startColumn + text.length;
  }

  private swatchPopoverHidden(commitEdit: boolean): void {
    this.muteSwatchProcessing = false;
    if (!commitEdit && this.hadSwatchChange) {
      this.textEditor.undo();
    }
  }

  private onTextChanged(event: Common.EventTarget.EventTargetEvent<UI.TextEditor.TextChangedEvent>): void {
    if (!this.muteSwatchProcessing) {
      this.updateSwatches(event.data.newRange.startLine, event.data.newRange.endLine);
    }
  }

  private isWordChar(char: string): boolean {
    return TextUtils.TextUtils.Utils.isWordChar(char) || char === '.' || char === '-' || char === '$';
  }

  private cssSuggestions(prefixRange: TextUtils.TextRange.TextRange, _substituteRange: TextUtils.TextRange.TextRange):
      Promise<UI.SuggestBox.Suggestions>|null {
    const prefix = this.textEditor.text(prefixRange);
    if (prefix.startsWith('$')) {
      return null;
    }

    const propertyToken = this.backtrackPropertyToken(prefixRange.startLine, prefixRange.startColumn - 1);
    if (!propertyToken) {
      return null;
    }

    const line = this.textEditor.line(prefixRange.startLine);
    const tokenContent = line.substring(propertyToken.startColumn, propertyToken.endColumn);
    const propertyValues = SDK.CSSMetadata.cssMetadata().getPropertyValues(tokenContent);
    return Promise.resolve(propertyValues.filter(value => value.startsWith(prefix)).map(value => {
      return {
        text: value,
        title: undefined,
        subtitle: undefined,
        iconType: undefined,
        priority: undefined,
        isSecondary: undefined,
        subtitleRenderer: undefined,
        selectionRange: undefined,
        hideGhostText: undefined,
        iconElement: undefined,
      };
    }));
  }

  private backtrackPropertyToken(lineNumber: number, columnNumber: number): {
    startColumn: number,
    endColumn: number,
    type: string,
  }|null {
    const backtrackDepth = 10;
    let tokenPosition: number = columnNumber;
    const line = this.textEditor.line(lineNumber);
    let seenColon = false;

    for (let i = 0; i < backtrackDepth && tokenPosition >= 0; ++i) {
      const token = this.textEditor.tokenAtTextPosition(lineNumber, tokenPosition);
      if (!token) {
        return null;
      }
      if (token.type === 'css-property') {
        return seenColon ? token : null;
      }
      if (token.type && !(token.type.indexOf('whitespace') !== -1 || token.type.startsWith('css-comment'))) {
        return null;
      }

      if (!token.type && line.substring(token.startColumn, token.endColumn) === ':') {
        if (!seenColon) {
          seenColon = true;
        } else {
          return null;
        }
      }
      tokenPosition = token.startColumn - 1;
    }
    return null;
  }

  dispose(): void {
    if (this.swatchPopoverHelper.isShowing()) {
      this.swatchPopoverHelper.hide(true);
    }
    this.textEditor.removeEventListener(
        SourceFrame.SourcesTextEditor.Events.ScrollChanged, this.textEditorScrolled, this);
    this.textEditor.removeEventListener(UI.TextEditor.Events.TextChanged, this.onTextChanged, this);
    this.textEditor.bookmarks(this.textEditor.fullRange(), SwatchBookmark).forEach(marker => marker.clear());
    this.textEditor.element.removeEventListener('keydown', (this.boundHandleKeyDown as EventListener));
  }
}

export const maxSwatchProcessingLength: number = 300;

export const SwatchBookmark: symbol = Symbol('swatch');

const swatchToBookmark = new WeakMap<Element, TextEditor.CodeMirrorTextEditor.TextEditorBookMark>();
