// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import type * as TextUtils from '../../models/text_utils/text_utils.js';

import type {AnchorBehavior} from './GlassPane.js';
import type {Suggestion} from './SuggestBox.js';
import type {Widget} from './Widget.js';

export interface TextEditorFactory {
  createEditor(options: Options): TextEditor;
}

export interface TextEditor extends Common.EventTarget.EventTarget<EventTypes> {
  widget(): Widget;
  fullRange(): TextUtils.TextRange.TextRange;
  selection(): TextUtils.TextRange.TextRange;
  setSelection(selection: TextUtils.TextRange.TextRange): void;
  text(textRange?: TextUtils.TextRange.TextRange): string;
  textWithCurrentSuggestion(): string;
  setText(text: string): void;
  line(lineNumber: number): string;
  newlineAndIndent(): void;
  addKeyDownHandler(handler: (arg0: KeyboardEvent) => void): void;
  configureAutocomplete(config: AutocompleteConfig|null): void;
  clearAutocomplete(): void;
  visualCoordinates(lineNumber: number, columnNumber: number): {
    x: number,
    y: number,
  };
  tokenAtTextPosition(lineNumber: number, columnNumber: number): {
    startColumn: number,
    endColumn: number,
    type: string,
  }|null;
  setPlaceholder(placeholder: string): void;
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  CursorChanged = 'CursorChanged',
  TextChanged = 'TextChanged',
  SuggestionChanged = 'SuggestionChanged',
}

export interface TextChangedEvent {
  newRange: TextUtils.TextRange.TextRange;
  oldRange: TextUtils.TextRange.TextRange;
}

export type EventTypes = {
  [Events.CursorChanged]: void,
  [Events.TextChanged]: TextChangedEvent,
  [Events.SuggestionChanged]: void,
};

export interface Options {
  bracketMatchingSetting?: Common.Settings.Setting<boolean>;
  devtoolsAccessibleName?: string;
  lineNumbers: boolean;
  lineWrapping: boolean;
  mimeType?: string;
  autoHeight?: boolean;
  padBottom?: boolean;
  maxHighlightLength?: number;
  placeholder?: string;
  lineWiseCopyCut?: boolean;
  inputStyle?: string;
}

export interface AutocompleteConfig {
  substituteRangeCallback?: ((arg0: number, arg1: number) => TextUtils.TextRange.TextRange | null);
  tooltipCallback?: ((arg0: number, arg1: number) => Promise<Element|null>);
  suggestionsCallback?:
      ((arg0: TextUtils.TextRange.TextRange, arg1: TextUtils.TextRange.TextRange,
        arg2?: boolean|undefined) => Promise<Suggestion[]>| null);
  isWordChar?: ((arg0: string) => boolean);
  anchorBehavior?: AnchorBehavior;
}
