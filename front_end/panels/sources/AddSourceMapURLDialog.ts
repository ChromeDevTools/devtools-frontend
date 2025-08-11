// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import dialogStyles from './dialog.css.js';

const UIStrings = {
  /**
   * @description Text in Add Source Map URLDialog of the Sources panel
   */
  sourceMapUrl: 'Source map URL: ',
  /**
   * @description Text in Add Debug Info URL Dialog of the Sources panel
   */
  debugInfoUrl: 'DWARF symbols URL: ',
  /**
   * @description Text to add something
   */
  add: 'Add',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/sources/AddSourceMapURLDialog.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const {ref} = Directives;

interface ViewInput {
  label: Platform.UIString.LocalizedString;
  onKeyDown: (event: KeyboardEvent) => void;
  apply: () => void;
}

interface ViewOutput {
  input: HTMLInputElement;
}

type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, output, target) => {
  // clang-format off
  render(html`
    <style>${dialogStyles}</style>
    <label>${input.label}</label>
    <input class="harmony-input add-source-map" spellcheck="false" type="text"
        jslog=${VisualLogging.textField('url').track({keydown: 'Enter', change: true})}
        @keydown=${input.onKeyDown} ${ref(e => { output.input = e as HTMLInputElement; })}>
    <devtools-button @click=${input.apply} .jslogContext=${'add'}
        .variant=${Buttons.Button.Variant.OUTLINED}>${i18nString(UIStrings.add)}</devtools-button>`,
    target);
  // clang-format on
};

export class AddDebugInfoURLDialog extends UI.Widget.HBox {
  private input!: HTMLInputElement;
  private readonly dialog: UI.Dialog.Dialog;
  private readonly callback: (arg0: Platform.DevToolsPath.UrlString) => void;
  private constructor(
      label: Platform.UIString.LocalizedString, jslogContext: string,
      callback: (arg0: Platform.DevToolsPath.UrlString) => void, view = DEFAULT_VIEW) {
    super({useShadowDom: true});

    const viewInput = {
      label,
      onKeyDown: this.onKeyDown.bind(this),
      apply: this.apply.bind(this),
    };
    const that = this;
    const viewOutput = {
      set input(input: HTMLInputElement) {
        that.input = input;
      },
    };
    view(viewInput, viewOutput, this.contentElement);

    this.dialog = new UI.Dialog.Dialog(jslogContext);
    this.dialog.setSizeBehavior(UI.GlassPane.SizeBehavior.MEASURE_CONTENT);
    this.dialog.setDefaultFocusedElement(this.input);

    this.callback = callback;
  }

  static createAddSourceMapURLDialog(callback: (arg0: Platform.DevToolsPath.UrlString) => void): AddDebugInfoURLDialog {
    return new AddDebugInfoURLDialog(i18nString(UIStrings.sourceMapUrl), 'add-source-map-url', callback);
  }

  static createAddDWARFSymbolsURLDialog(callback: (arg0: Platform.DevToolsPath.UrlString) => void):
      AddDebugInfoURLDialog {
    return new AddDebugInfoURLDialog(i18nString(UIStrings.debugInfoUrl), 'add-debug-info-url', callback);
  }

  override show(): void {
    super.show(this.dialog.contentElement);
    this.dialog.show();
  }

  private done(value: Platform.DevToolsPath.UrlString): void {
    this.dialog.hide();
    this.callback(value);
  }

  private apply(): void {
    this.done(this.input.value as Platform.DevToolsPath.UrlString);
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.consume(true);
      this.apply();
    }
  }
}
