// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../../core/i18n/i18n.js';

import {Events as FilteredListWidgetEvents, FilteredListWidget, Provider} from './FilteredListWidget.js';

const UIStrings = {
  /**
  * @description Prompt for free-form input in the QuickInput dialog; Enter and Escape here are keyboard buttons and should be localized as appropriate.
  * @example {Provide some information.} PH1
  */
  pressEnterToConfirmOrEscapeTo: '{PH1} (Press \'Enter\' to confirm or \'Escape\' to cancel.)',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/quick_open/QuickInput.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export interface QuickInputOptions {
  prompt: string;
  placeHolder?: string;
  value?: string;
  valueSelection?: number[];
}

export class QuickInput {
  private constructor() {
    throw new ReferenceError('Instance type not implemented.');
  }

  static show(options: QuickInputOptions): Promise<string|void> {
    let canceledPromise = new Promise<void>(_r => {});  // Intentionally creates an unresolved promise
    const fulfilledPromise = new Promise<string>(resolve => {
      const provider = new QuickInputProvider(options, resolve);
      const widget = new FilteredListWidget(provider);

      if (options.placeHolder) {
        widget.setHintElement(options.placeHolder);
      }

      widget.setPromptTitle(options.placeHolder || options.prompt);
      widget.showAsDialog(options.prompt);
      canceledPromise = widget.once(FilteredListWidgetEvents.Hidden);

      widget.setQuery(options.value || '');
      if (options.valueSelection) {
        widget.setQuerySelectedRange(options.valueSelection[0], options.valueSelection[1]);
      }
    });

    return Promise.race([fulfilledPromise, canceledPromise]).then(values => {
      // If it was fulfilled, then `result` will have a value.
      // If it was canceled, then `result` will be undefined.
      // Either way, it has the value that we want.
      return values;
    });
  }
}

class QuickInputProvider extends Provider {
  private readonly options: QuickInputOptions;
  private readonly resolve: Function;
  constructor(options: QuickInputOptions, resolve: Function) {
    super();
    this.options = options;
    this.resolve = resolve;
  }

  notFoundText(): string {
    return i18nString(UIStrings.pressEnterToConfirmOrEscapeTo, {PH1: this.options.prompt});
  }

  selectItem(_itemIndex: number|null, promptValue: string): void {
    this.resolve(promptValue);
  }
}
