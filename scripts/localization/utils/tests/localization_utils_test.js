// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {isLocalizationCall, espree, getLocalizationCase} = require('../localization_utils');
const {assert} = require('chai');

const parseCode = code => espree.parse(code, {ecmaVersion: 11, sourceType: 'module', range: true, loc: true});

describe('isLocalizationCall', () => {
  it('is true for a tagged template expression', () => {
    const ast = parseCode('ls`foo`');
    assert.isTrue(isLocalizationCall(ast.body[0].expression));
  });

  it('is true for a call to Common.UIString', () => {
    const ast = parseCode('Common.UIString(\'blahblah %s\', 2)');
    assert.isTrue(isLocalizationCall(ast.body[0].expression));
  });

  it('is true for a call to Common.UIString.UIString', () => {
    const ast = parseCode('Common.UIString.UIString(\'blahblah %s, 2\')');
    assert.isTrue(isLocalizationCall(ast.body[0].expression));
  });

  it('is true for a call to UIString', () => {
    const ast = parseCode('UIString(\'blahblah %s, 2\')');
    assert.isTrue(isLocalizationCall(ast.body[0].expression));
  });

  it('is true for a call to Platform.UIString.UIString', () => {
    const ast = parseCode('Platform.UIString.UIString(\'blahblah %s, 2\')');
    assert.isTrue(isLocalizationCall(ast.body[0].expression));
  });

  it('is true for a call to UI.formatLocalized', () => {
    const ast = parseCode('UI.formatLocalized(\'blahblah %s, 2\')');
    assert.isTrue(isLocalizationCall(ast.body[0].expression));
  });

  it('is true for a call to UI.UIUtils.formatLocalized', () => {
    const ast = parseCode('UI.UIUtils.formatLocalized(\'blahblah %s, 2\')');
    assert.isTrue(isLocalizationCall(ast.body[0].expression));
  });
});

describe('getLocalizationCase', () => {
  it('returns correctly for a tagged template', () => {
    const ast = parseCode('ls`foo`');
    assert.strictEqual(getLocalizationCase(ast.body[0].expression), 'Tagged Template');
  });

  it('returns correctly for Common.UIString', () => {
    const ast = parseCode('Common.UIString(\'blah\', 2)');
    assert.strictEqual(getLocalizationCase(ast.body[0].expression), 'Common.UIString');
  });

  it('returns Common.UIString for Common.UIString.UIString', () => {
    const ast = parseCode('Common.UIString(\'blah\', 2)');
    assert.strictEqual(getLocalizationCase(ast.body[0].expression), 'Common.UIString');
  });

  it('returns UI.formatLocalized for UI.formatLocalized', () => {
    const ast = parseCode('UI.formatLocalized(\'blahblah %s, 2\')');
    assert.strictEqual(getLocalizationCase(ast.body[0].expression), 'UI.formatLocalized');
  });

  it('returns Platform.UIString for Platform.UIString.UIString', () => {
    const ast = parseCode('Platform.UIString.UIString(\'blahblah %s, 2\')');
    assert.strictEqual(getLocalizationCase(ast.body[0].expression), 'Platform.UIString');
  });

  it('returns Platform.UIString for UIString', () => {
    const ast = parseCode('UIString(\'blahblah %s, 2\')');
    assert.strictEqual(getLocalizationCase(ast.body[0].expression), 'Platform.UIString');
  });
});
