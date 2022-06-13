// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * All the specs relevant for generating the DOM pinned properties dataset.
 * These strings represent file names. A list of all file names can be found at
 * https://github.com/w3c/webref/tree/main/tr/idl or via the @webref/idl API.
 *
 * These spec names are included in the generated dataset. To keep it small,
 * the values are bitwise or'd.
 */
export const SPECS = {
  'html': 1,
  'dom': 2,
  'uievents': 4,
  'pointerevents': 8,
  'cssom': 16,
  'wai-aria': 32
};

/**
 * All the "global" attributes as defined in the DOM specification.
 * Used to annotate the extracted properties from the WebIDL types.
 */
export const GLOBAL_ATTRIBUTES = new Set([
  // https://html.spec.whatwg.org/multipage/dom.html#global-attributes
  'accesskey', 'autocapitalize', 'autofocus', 'contenteditable', 'dir',      'draggable', 'enterkeyhint',
  'hidden',    'inputmode',      'is',        'itemid',          'itemprop', 'itemref',   'itemscope',
  'itemtype',  'lang',           'nonce',     'spellcheck',      'style',    'tabindex',  'title',
  'translate',
]);

/**
 * The "applicable" members for certain "states" that WebIDL types can be in.
 * In other words, some members are "valid" only valid in certain situations:
 * for example, with the HTML input element, the set of valid members are
 * determined by the "type" attribute.
 */
export const VALID_MEMBERS = {
  // https://html.spec.whatwg.org/multipage/input.html#input-type-attr-summary
  HTMLInputElement: {
    '[type=hidden]': new Set([
      'autocomplete',
      'value',
    ]),
    '[type=text]': new Set([
      'autocomplete',
      'dirname',
      'list',
      'maxlength',
      'minlength',
      'pattern',
      'placeholder',
      'readonly',
      'required',
      'size',
      'value',
      'list',
      'selectionstart',
      'selectionend',
      'selectiondirection',
    ]),
    '[type=search]': new Set([
      'autocomplete',
      'dirname',
      'list',
      'maxlength',
      'minlength',
      'pattern',
      'placeholder',
      'readonly',
      'required',
      'size',
      'value',
      'list',
      'selectionstart',
      'selectionend',
      'selectiondirection',
    ]),
    '[type=url]': new Set([
      'autocomplete',
      'list',
      'maxlength',
      'minlength',
      'pattern',
      'placeholder',
      'readonly',
      'required',
      'size',
      'value',
      'list',
      'selectionstart',
      'selectionend',
      'selectiondirection',
    ]),
    '[type=tel]': new Set([
      'autocomplete',
      'list',
      'maxlength',
      'minlength',
      'pattern',
      'placeholder',
      'readonly',
      'required',
      'size',
      'value',
      'list',
      'selectionstart',
      'selectionend',
      'selectiondirection',
    ]),
    '[type=email]': new Set([
      'autocomplete',
      'list',
      'maxlength',
      'minlength',
      'multiple',
      'pattern',
      'placeholder',
      'readonly',
      'required',
      'size',
      'value',
      'list',
    ]),
    '[type=password]': new Set([
      'autocomplete',
      'maxlength',
      'minlength',
      'pattern',
      'placeholder',
      'readonly',
      'required',
      'size',
      'value',
      'selectionstart',
      'selectionend',
      'selectiondirection',
    ]),
    '[type=date]': new Set([
      'autocomplete',
      'list',
      'max',
      'min',
      'readonly',
      'required',
      'step',
      'value',
      'valueasdate',
      'valueasnumber',
      'list',
    ]),
    '[type=month]': new Set([
      'autocomplete',
      'list',
      'max',
      'min',
      'readonly',
      'required',
      'step',
      'value',
      'valueasdate',
      'valueasnumber',
      'list',
    ]),
    '[type=week]': new Set([
      'autocomplete',
      'list',
      'max',
      'min',
      'readonly',
      'required',
      'step',
      'value',
      'valueasdate',
      'valueasnumber',
      'list',
    ]),
    '[type=time]': new Set([
      'autocomplete',
      'list',
      'max',
      'min',
      'readonly',
      'required',
      'step',
      'value',
      'valueasdate',
      'valueasnumber',
      'list',
    ]),
    '[type=datetime-local]': new Set([
      'autocomplete',
      'list',
      'max',
      'min',
      'readonly',
      'required',
      'step',
      'value',
      'valueasnumber',
      'list',
    ]),
    '[type=number]': new Set([
      'autocomplete',
      'list',
      'max',
      'min',
      'placeholder',
      'readonly',
      'required',
      'step',
      'value',
      'valueasnumber',
      'list',
    ]),
    '[type=range]': new Set([
      'autocomplete',
      'list',
      'max',
      'min',
      'step',
      'value',
      'valueasnumber',
      'list',
    ]),
    '[type=color]': new Set([
      'autocomplete',
      'list',
      'value',
    ]),
    '[type=checkbox]': new Set([
      'checked',
      'required',
      'checked',
      'value',
    ]),
    '[type=radio]': new Set([
      'checked',
      'required',
      'checked',
      'value',
    ]),
    '[type=file]': new Set([
      'accept',
      'multiple',
      'required',
      'files',
      'value',
    ]),
    '[type=submit]': new Set([
      'formaction',
      'formenctype',
      'formmethod',
      'formnovalidate',
      'formtarget',
      'value',
    ]),
    '[type=image]': new Set([
      'alt',
      'formaction',
      'formenctype',
      'formmethod',
      'formnovalidate',
      'formtarget',
      'height',
      'src',
      'width',
      'value',
    ]),
    '[type=reset]': new Set([
      'value',
    ]),
    '[type=button]': new Set([
      'value',
    ]),
  },
};
