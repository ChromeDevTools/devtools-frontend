// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const ts = require('typescript');
const {isLocalizationCall, espree, getLocalizationCaseAndVersion, isLocalizationV2Call} =
    require('../localization_utils');
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

describe('getLocalizationCaseAndVersion', () => {
  it('returns {locCase: "Tagged Template, locVersion: 1} for a tagged template', () => {
    const ast = parseCode('ls`foo`');
    assert.deepStrictEqual(
        getLocalizationCaseAndVersion(ast.body[0].expression), {locCase: 'Tagged Template', locVersion: 1});
  });

  it('returns {locCase: "Common.UIString", locVersion: 1} for Common.UIString', () => {
    const ast = parseCode('Common.UIString(\'blah\', 2)');
    assert.deepStrictEqual(
        getLocalizationCaseAndVersion(ast.body[0].expression), {locCase: 'Common.UIString', locVersion: 1});
  });

  it('returns {locCase: "Common.UIString", locVersion: 1} for Common.UIString.UIString', () => {
    const ast = parseCode('Common.UIString(\'blah\', 2)');
    assert.deepStrictEqual(
        getLocalizationCaseAndVersion(ast.body[0].expression), {locCase: 'Common.UIString', locVersion: 1});
  });

  it('returns {locCase: "UI.formatLocalized", locVersion: 1} for UI.formatLocalized', () => {
    const ast = parseCode('UI.formatLocalized(\'blahblah %s, 2\')');
    assert.deepStrictEqual(
        getLocalizationCaseAndVersion(ast.body[0].expression), {locCase: 'UI.formatLocalized', locVersion: 1});
  });

  it('returns {locCase: "Platform.UIString", locVersion: 1} for Platform.UIString.UIString', () => {
    const ast = parseCode('Platform.UIString.UIString(\'blahblah %s, 2\')');
    assert.deepStrictEqual(
        getLocalizationCaseAndVersion(ast.body[0].expression), {locCase: 'Platform.UIString', locVersion: 1});
  });

  it('returns {locCase: "Platform.UIString", locVersion: 1} for UIString', () => {
    const ast = parseCode('UIString(\'blahblah %s, 2\')');
    assert.deepStrictEqual(
        getLocalizationCaseAndVersion(ast.body[0].expression), {locCase: 'Platform.UIString', locVersion: 1});
  });
  it('returns {locCase: "i18n.i18n.getLocalizedString", locVersion: 2} for i18n.i18n.getLocalizedString', () => {
    const ast = parseCode('i18n.i18n.getLocalizedString(_str, UIStrings.fakeID)');
    assert.deepStrictEqual(
        getLocalizationCaseAndVersion(ast.body[0].expression),
        {locCase: 'i18n.i18n.getLocalizedString', locVersion: 2});
  });
  it('returns locCase: "i18n.i18n.getFormatLocalizedString", locVersion: 2} for i18n.i18n.getFormatLocalizedString',
     () => {
       const ast = parseCode('i18n.i18n.getFormatLocalizedString(_str, UIStrings.fakeID)');
       assert.deepStrictEqual(
           getLocalizationCaseAndVersion(ast.body[0].expression),
           {locCase: 'i18n.i18n.getFormatLocalizedString', locVersion: 2});
     });
  it('returns {locCase: "UIStrings", locVersion: 2} for UIStrings', () => {
    const ast = parseCode('const UIStrings = {fakeID: "Hello World"}');
    assert.deepStrictEqual(
        getLocalizationCaseAndVersion(ast.body[0].declarations[0]), {locCase: 'UIStrings', locVersion: 2});
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
