// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as fs from 'fs';
import * as path from 'path';

import {parseTypeScriptComponent} from '../../../../scripts/component_bridges/cli.js';

import {pathForFixture} from './test_utils.js';


const runFixtureTestAndAssertMatch = (fixtureName: string) => {
  const sourcePath = pathForFixture(`${fixtureName}.ts`);
  const expectedPath = pathForFixture(path.join('expected', `${fixtureName}_bridge-expected.js`));

  const {output} = parseTypeScriptComponent(sourcePath);

  if (!output) {
    assert.fail(`Generating bridge for ${fixtureName} unexpectedly generated nothing.`);
  }

  const actualCode = fs.readFileSync(output, {encoding: 'utf8'});
  const expectedCode = fs.readFileSync(expectedPath, {encoding: 'utf8'});

  assert.strictEqual(actualCode, expectedCode, `Fixture did not match expected: ${fixtureName}`);

  return {actualCode, expectedCode};
};

describe('bridges CLI fixture tests', () => {
  it('basic component', () => {
    runFixtureTestAndAssertMatch('basic-component');
  });

  it('component with multiple methods only includes the public ones', () => {
    runFixtureTestAndAssertMatch('multiple-methods');
  });

  it('picks out the right interfaces for components with array parameters', () => {
    runFixtureTestAndAssertMatch('array-params');
  });

  it('correctly pulls out getters and setters into the public interface', () => {
    runFixtureTestAndAssertMatch('getters-setters-component');
  });

  it('correctly parses TypeScript enums', () => {
    runFixtureTestAndAssertMatch('enums');
  });

  it('correctly parses TypeScript enum members used as types', () => {
    runFixtureTestAndAssertMatch('enum-members');
  });

  it('correctly parses interfaces wrapped in Readonly or ReadonlyArray', () => {
    runFixtureTestAndAssertMatch('setters-readonly');
  });

  it('correctly parses multiple interfaces that are imported', () => {
    runFixtureTestAndAssertMatch('multiple-interfaces');
  });

  it('understands complex union types and types extending other types', () => {
    runFixtureTestAndAssertMatch('complex-union-types-extending-types');
  });

  it('finds complex types and nested types from imports', () => {
    runFixtureTestAndAssertMatch('complex-types-imported');
  });

  it('will refuse to regenerate a bridge with a MANUALLY_EDITED_BRIDGE comment', () => {
    const fixtureName = 'manually-edited-bridge-component';
    const sourcePath = pathForFixture(`${fixtureName}.ts`);
    const {output} = parseTypeScriptComponent(sourcePath);
    assert.isUndefined(output, 'The bridge regeneration incorectly overwrote a manually edited bridge.');
  });
});
