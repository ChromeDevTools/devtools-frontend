// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const ts = require('typescript');
const {isLocalizationCall, espree, getLocalizationCase, isLocalizationV2Call} = require('../localization_utils');
const {removeUnusedEntries} = require('../../localizationV2Checks');
const {findUIStringsNode} = require('../check_localized_strings');
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

describe('isLocalizationV2Call', () => {
  it('is true for a call to i18n.i18n.getLocalizedString', () => {
    const ast = parseCode('i18n.i18n.getLocalizedString(_str, UIStrings.fakeID)');
    assert.isTrue(isLocalizationV2Call(ast.body[0].expression));
  });

  it('is true for a call to i18n.i18n.getFormatLocalizedString', () => {
    const ast = parseCode('i18n.i18n.getFormatLocalizedString(_str, UIStrings.fakeID)');
    assert.isTrue(isLocalizationV2Call(ast.body[0].expression));
  });

  it('is true for a declaration of UIStrings', () => {
    const ast = parseCode('const UIStrings = {fakeID: "Hello World"}');
    assert.isTrue(isLocalizationV2Call(ast.body[0].declarations[0]));
  });

  it('is false for a tagged template expression', () => {
    const ast = parseCode('ls`foo`');
    assert.isFalse(isLocalizationV2Call(ast.body[0].expression));
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
  it('returns i18n.i18n.getLocalizedString for i18n.i18n.getLocalizedString', () => {
    const ast = parseCode('i18n.i18n.getLocalizedString(_str, UIStrings.fakeID)');
    assert.strictEqual(getLocalizationCase(ast.body[0].expression), 'i18n.i18n.getLocalizedString');
  });
  it('returns i18n.i18n.getFormatLocalizedString for i18n.i18n.getFormatLocalizedString', () => {
    const ast = parseCode('i18n.i18n.getFormatLocalizedString(_str, UIStrings.fakeID)');
    assert.strictEqual(getLocalizationCase(ast.body[0].expression), 'i18n.i18n.getFormatLocalizedString');
  });
  it('returns UIStrings for UIStrings', () => {
    const ast = parseCode('const UIStrings = {fakeID: "Hello World"}');
    assert.strictEqual(getLocalizationCase(ast.body[0].declarations[0]), 'UIStrings');
  });
});

describe('removeUnusedEntries', () => {
  it('returns UIStrings object without unused entries', () => {
    const fakeFilename = 'fakeFile.js';
    const fakeContent = `const UIStrings = {
      /**
      *@description Entry is being used in content
      */
      isBeingUsed: 'is being used',
      /**
      *@description Entry is not being used in content
      */
      isNotBeingUsed: 'Not being used',
      };`;
    const fakeListOfEntriesToRemove = [{
      stringId: 'isNotBeingUsed',
      stringValue: 'Not being used',
    }];
    const expectedContent = `const UIStrings = {
      /**
      *@description Entry is being used in content
      */
      isBeingUsed: 'is being used',
      };`;
    assert.strictEqual(removeUnusedEntries(fakeFilename, fakeContent, fakeListOfEntriesToRemove), expectedContent);
  });
});

describe('findUIStringsNode', () => {
  it('returns not null if UIStrings exists', () => {
    const contentWithUIStrings = 'const UIStrings = { hello: "HELLO",};';
    const sourceFile = ts.createSourceFile('fakeFile.js', contentWithUIStrings, ts.ScriptTarget.ESNext, true);
    assert.isNotNull(findUIStringsNode(sourceFile));
  });
  it('returns null if UIStrings does not exist', () => {
    const contentWithoutUIStrings = 'const notUIStrings = "HELLO";';
    const sourceFile = ts.createSourceFile('fakeFile.js', contentWithoutUIStrings, ts.ScriptTarget.ESNext, true);
    assert.isNull(findUIStringsNode(sourceFile));
  });
});
