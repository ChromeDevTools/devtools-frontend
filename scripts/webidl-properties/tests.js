// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// eslint-disable-next-line rulesdir/es_modules_import
import idl from '@webref/idl';
import * as assert from 'assert';

import {SPECS} from './config.js';
import {addMetadata, getIDLProps, minimize} from './get-props.js';
import {getMissingTypes} from './util.js';

describe('DOM pinned properties dataset generation', function() {
  let output;

  this.beforeEach(async () => {
    const files = await idl.listAll();
    const names = Object.keys(SPECS);
    const specs = await Promise.all(names.map(name => files[name].parse().then(idls => ({name, idls}))));
    output = addMetadata(getIDLProps(specs));
  });

  it('doesn\'t have missing types', () => {
    const missing = getMissingTypes(output);
    assert.strictEqual(missing.length, 0);
  });

  it('generates valid data for HTMLElement', () => {
    const type = output.HTMLElement;
    assert.strictEqual(type.inheritance, 'Element');
    assert.deepEqual(type.includes, [
      'GlobalEventHandlers',
      'DocumentAndElementEventHandlers',
      'ElementContentEditable',
      'HTMLOrSVGElement',
      'ElementCSSInlineStyle',
    ]);
    assert.deepEqual(type.props.title, {
      global: true,
      specs: ['html'],
    });
    assert.strictEqual(type.rules, undefined);
  });

  it('generates valid data for HTMLInputElement', () => {
    const type = output.HTMLInputElement;
    assert.strictEqual(type.inheritance, 'HTMLElement');
    assert.deepEqual(type.includes, []);
    assert.deepEqual(type.props.checked, {
      global: false,
      specs: ['html'],
      rules: [{when: 'type', is: 'checkbox'}, {when: 'type', is: 'radio'}],
    });
    assert.deepEqual(type.props.required, {
      global: false,
      specs: ['html'],
      rules: [
        {when: 'type', is: 'text'}, {when: 'type', is: 'search'}, {when: 'type', is: 'url'}, {when: 'type', is: 'tel'},
        {when: 'type', is: 'email'}, {when: 'type', is: 'password'}, {when: 'type', is: 'date'},
        {when: 'type', is: 'month'}, {when: 'type', is: 'week'}, {when: 'type', is: 'time'},
        {when: 'type', is: 'datetime-local'}, {when: 'type', is: 'number'}, {when: 'type', is: 'checkbox'},
        {when: 'type', is: 'radio'}, {when: 'type', is: 'file'}
      ]
    });
    assert.deepEqual(type.props.value, {
      global: false,
      specs: ['html'],
      rules: type.rules,
    });
    assert.deepEqual(type.rules, [
      {when: 'type', is: 'hidden'},   {when: 'type', is: 'text'},  {when: 'type', is: 'search'},
      {when: 'type', is: 'url'},      {when: 'type', is: 'tel'},   {when: 'type', is: 'email'},
      {when: 'type', is: 'password'}, {when: 'type', is: 'date'},  {when: 'type', is: 'month'},
      {when: 'type', is: 'week'},     {when: 'type', is: 'time'},  {when: 'type', is: 'datetime-local'},
      {when: 'type', is: 'number'},   {when: 'type', is: 'range'}, {when: 'type', is: 'color'},
      {when: 'type', is: 'checkbox'}, {when: 'type', is: 'radio'}, {when: 'type', is: 'file'},
      {when: 'type', is: 'submit'},   {when: 'type', is: 'image'}, {when: 'type', is: 'reset'},
      {when: 'type', is: 'button'},
    ]);
  });

  it('generates valid data for MouseEvent', () => {
    const type = output.MouseEvent;
    assert.strictEqual(type.inheritance, 'UIEvent');
    assert.deepEqual(type.includes, []);
    assert.deepEqual(type.props.screenX, {
      global: false,
      specs: ['uievents'],
    });
    assert.strictEqual(type.rules, undefined);
  });

  it('generates valid data for PointerEvent', () => {
    const type = output.PointerEvent;
    assert.strictEqual(type.inheritance, 'MouseEvent');
    assert.deepEqual(type.includes, []);
    assert.deepEqual(type.props.pressure, {
      global: false,
      specs: ['pointerevents'],
    });
    assert.strictEqual(type.rules, undefined);
  });

  it('generates an entry for DOMParser', () => {
    const type = output.DOMParser;
    assert.strictEqual(type.inheritance, null);
    assert.deepEqual(type.includes, []);
    assert.deepEqual(type.props, {});
    assert.strictEqual(type.rules, undefined);
  });

  it('minimizes the data for HTMLInputElement', () => {
    const minimized = minimize(output);
    const type = minimized.HTMLInputElement;
    assert.strictEqual(type.inheritance, 'HTMLElement');
    assert.strictEqual(type.includes, undefined);
    assert.deepEqual(type.props.checked, {
      rules: [
        {when: 'type', is: 'checkbox'},
        {when: 'type', is: 'radio'},
      ],
    });
    assert.deepEqual(type.props.required, {
      rules: [
        {when: 'type', is: 'text'}, {when: 'type', is: 'search'}, {when: 'type', is: 'url'}, {when: 'type', is: 'tel'},
        {when: 'type', is: 'email'}, {when: 'type', is: 'password'}, {when: 'type', is: 'date'},
        {when: 'type', is: 'month'}, {when: 'type', is: 'week'}, {when: 'type', is: 'time'},
        {when: 'type', is: 'datetime-local'}, {when: 'type', is: 'number'}, {when: 'type', is: 'checkbox'},
        {when: 'type', is: 'radio'}, {when: 'type', is: 'file'}
      ],
    });
    assert.deepEqual(type.props.value, {
      rules: type.rules,
    });
    assert.deepEqual(type.rules, [
      {when: 'type', is: 'hidden'},   {when: 'type', is: 'text'},  {when: 'type', is: 'search'},
      {when: 'type', is: 'url'},      {when: 'type', is: 'tel'},   {when: 'type', is: 'email'},
      {when: 'type', is: 'password'}, {when: 'type', is: 'date'},  {when: 'type', is: 'month'},
      {when: 'type', is: 'week'},     {when: 'type', is: 'time'},  {when: 'type', is: 'datetime-local'},
      {when: 'type', is: 'number'},   {when: 'type', is: 'range'}, {when: 'type', is: 'color'},
      {when: 'type', is: 'checkbox'}, {when: 'type', is: 'radio'}, {when: 'type', is: 'file'},
      {when: 'type', is: 'submit'},   {when: 'type', is: 'image'}, {when: 'type', is: 'reset'},
      {when: 'type', is: 'button'},
    ]);
  });

  it('minimizes the data for PointerEvent', () => {
    const minimized = minimize(output);
    const type = minimized.PointerEvent;
    assert.strictEqual(type.inheritance, 'MouseEvent');
    assert.strictEqual(type.includes, undefined);
    assert.deepEqual(type.props.pressure, {
      specs: 8,
    });
    assert.strictEqual(type.rules, undefined);
  });

  it('removes the entry for DOMParser in the minimized output', () => {
    const minimized = minimize(output);
    assert.strictEqual(minimized.DOMParser, undefined);
  });
});
