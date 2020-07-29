// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import {FilteredListWidget, Provider} from './FilteredListWidget.js';

/**
 * @typedef {{
 *   prompt: string,
 *   placeHolder: (string|undefined),
 *   value: (string|undefined),
 *   valueSelection: (!Array<number>|undefined),
 * }}
 */
export let QuickInputOptions;

export class QuickInput {
  /**
   * @private
   */
  constructor() {
    throw new ReferenceError('Instance type not implemented.');
  }

  /**
   * @param {!QuickInputOptions} options
   */
  static show(options) {
    /**
     * @type {!Promise<undefined>}
     */
    let canceledPromise = new Promise(_r => {});  // Intentionally creates an unresolved promise
    /** @type {!Promise<string>} */
    const fulfilledPromise = new Promise(resolve => {
      const provider = new QuickInputProvider(options, resolve);
      const widget = new FilteredListWidget(provider);

      if (options.placeHolder) {
        widget.setPlaceholder(options.placeHolder);
      }

      widget.setPromptTitle(options.placeHolder || options.prompt);
      widget.showAsDialog(options.prompt);
      canceledPromise = /** @type {!Promise<undefined>} */ (widget.once('hidden'));

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
  /**
   * @param {!QuickInputOptions} options
   * @param {!Function} resolve
   */
  constructor(options, resolve) {
    super();
    this._options = options;
    this._resolve = resolve;
  }

  /**
   * @override
   * @return {string}
   */
  notFoundText() {
    return ls`${this._options.prompt} (Press 'Enter' to confirm or 'Escape' to cancel.)`;
  }

  /**
   * @override
   * @param {?number} _itemIndex
   * @param {string} promptValue
   */
  selectItem(_itemIndex, promptValue) {
    this._resolve(promptValue);
  }
}
