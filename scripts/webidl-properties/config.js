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
 * determined by the "type" property.
 */
export const APPLICABLE_MEMBERS = {
  // https://html.spec.whatwg.org/multipage/input.html#input-type-attr-summary
  HTMLInputElement: [
    {
      rule: {when: 'type', is: 'hidden'},
      members: new Set([
        'autocomplete',
        'value',
      ])
    },
    {
      rule: {when: 'type', is: 'text'},
      members: new Set([
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
      ])
    },
    {
      rule: {when: 'type', is: 'search'},
      members: new Set([
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
      ])
    },
    {
      rule: {when: 'type', is: 'url'},
      members: new Set([
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
      ])
    },
    {
      rule: {when: 'type', is: 'tel'},
      members: new Set([
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
      ])
    },
    {
      rule: {when: 'type', is: 'email'},
      members: new Set([
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
      ])
    },
    {
      rule: {when: 'type', is: 'password'},
      members: new Set([
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
      ])
    },
    {
      rule: {when: 'type', is: 'date'},
      members: new Set([
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
      ])
    },
    {
      rule: {when: 'type', is: 'month'},
      members: new Set([
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
      ])
    },
    {
      rule: {when: 'type', is: 'week'},
      members: new Set([
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
      ])
    },
    {
      rule: {when: 'type', is: 'time'},
      members: new Set([
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
      ])
    },
    {
      rule: {when: 'type', is: 'datetime-local'},
      members: new Set([
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
      ])
    },
    {
      rule: {when: 'type', is: 'number'},
      members: new Set([
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
      ])
    },
    {
      rule: {when: 'type', is: 'range'},
      members: new Set([
        'autocomplete',
        'list',
        'max',
        'min',
        'step',
        'value',
        'valueasnumber',
        'list',
      ])
    },
    {
      rule: {when: 'type', is: 'color'},
      members: new Set([
        'autocomplete',
        'list',
        'value',
      ])
    },
    {
      rule: {when: 'type', is: 'checkbox'},
      members: new Set([
        'checked',
        'required',
        'checked',
        'value',
      ])
    },
    {
      rule: {when: 'type', is: 'radio'},
      members: new Set([
        'checked',
        'required',
        'checked',
        'value',
      ])
    },
    {
      rule: {when: 'type', is: 'file'},
      members: new Set([
        'accept',
        'multiple',
        'required',
        'files',
        'value',
      ])
    },
    {
      rule: {when: 'type', is: 'submit'},
      members: new Set([
        'formaction',
        'formenctype',
        'formmethod',
        'formnovalidate',
        'formtarget',
        'value',
      ])
    },
    {
      rule: {when: 'type', is: 'image'},
      members: new Set([
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
      ])
    },
    {
      rule: {when: 'type', is: 'reset'},
      members: new Set([
        'value',
      ])
    },
    {
      rule: {when: 'type', is: 'button'},
      members: new Set([
        'value',
      ])
    },
  ],
};
