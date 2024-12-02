// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Bindings from '../../../models/bindings/bindings.js';
import * as Workspace from '../../../models/workspace/workspace.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as TimelineComponents from './components.js';

describeWithEnvironment('Ignore List Setting', () => {
  async function renderIgnoreListSetting(): Promise<HTMLElement> {
    const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();
    const component = new TimelineComponents.IgnoreListSetting.IgnoreListSetting();
    renderElementIntoDOM(component);
    await coordinator.done();
    return component;
  }

  function getAllRules(component: HTMLElement): {regex: string, disabled: boolean}[] {
    assert.isNotNull(component.shadowRoot);
    const regexRows = component.shadowRoot.querySelectorAll<HTMLElement>('.regex-row');
    return Array.from(regexRows).map(row => {
      const checkboxShadow = row.querySelector('dt-checkbox')?.shadowRoot;
      assert.exists(checkboxShadow);
      return {
        regex: checkboxShadow.querySelector('label')?.textContent?.trim() ?? '',
        disabled: !checkboxShadow.querySelector('input')?.checked,
      };
    });
  }

  function getNewRegexInput(component: HTMLElement): HTMLInputElement {
    assert.isNotNull(component.shadowRoot);
    const newRegexRow = component.shadowRoot.querySelector<HTMLElement>('.new-regex-row');
    const newRegexInput = newRegexRow?.querySelector<HTMLInputElement>('.new-regex-text-input');

    assert.exists(newRegexInput);
    return newRegexInput;
  }

  before(() => {
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const workspace = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance(
        {forceNew: true, resourceMapping, targetManager});
    Bindings.IgnoreListManager.IgnoreListManager.instance({
      forceNew: true,
      debuggerWorkspaceBinding,
    });

    ignoreRegex('rule 1');
  });

  it('Able to render the ignore listed rules', async () => {
    const component = await renderIgnoreListSetting();
    const ignoredRules = getAllRules(component);

    // There is a default rule `/node_modules/|/bower_components/`
    assert.deepStrictEqual(ignoredRules.length, 2);
    assert.deepStrictEqual(ignoredRules[0].regex, '/node_modules/|/bower_components/');
    assert.deepStrictEqual(ignoredRules[0].disabled, false);
    assert.deepStrictEqual(ignoredRules[1].regex, 'rule 1');
    assert.deepStrictEqual(ignoredRules[1].disabled, false);

    // Check the remove buttons are rendered
    assert.isNotNull(component.shadowRoot);
    const regexRowsElements = component.shadowRoot.querySelectorAll<HTMLElement>('.regex-row');
    Array.from(regexRowsElements).forEach(row => {
      const removeButton = row.querySelector('devtools-button');
      assert.exists(removeButton);
    });
  });

  it('Able to render the disabled ignore listed rules', async () => {
    disableIgnoreRegex('rule 1');

    const component = await renderIgnoreListSetting();
    const ignoredRules = getAllRules(component);

    // There is a default rule `/node_modules/|/bower_components/`
    assert.deepStrictEqual(ignoredRules.length, 2);
    assert.deepStrictEqual(ignoredRules[0].regex, '/node_modules/|/bower_components/');
    assert.deepStrictEqual(ignoredRules[0].disabled, false);
    assert.deepStrictEqual(ignoredRules[1].regex, 'rule 1');
    assert.deepStrictEqual(ignoredRules[1].disabled, true);
  });

  it('Able to toggle the disable status of an ignore listed rules', async () => {
    const component = await renderIgnoreListSetting();

    assert.isNotNull(component.shadowRoot);
    const regexRows = component.shadowRoot.querySelectorAll<HTMLElement>('.regex-row');
    // "rule 1" is the second in the view.
    // Now the "rule 1" is disabled (by last test), so click the checkbox, it will be enabled.
    // Add sanity checks to make sure.
    const checkboxShadow = regexRows[1].querySelector('dt-checkbox')?.shadowRoot;
    assert.strictEqual(checkboxShadow?.querySelector('label')?.textContent, 'rule 1');
    assert.isTrue(isIgnoreRegexDisabled('rule 1'));

    const rule1CheckBox = checkboxShadow?.querySelector('input');
    rule1CheckBox?.click();
    assert.isFalse(isIgnoreRegexDisabled('rule 1'));
  });

  it('Able to remove an ignore list rule', async () => {
    const component = await renderIgnoreListSetting();

    assert.isNotNull(component.shadowRoot);
    const regexRows = component.shadowRoot.querySelectorAll<HTMLElement>('.regex-row');
    // "rule 1" is the second in the view.
    // Add sanity checks to make sure.
    const checkboxShadow = regexRows[1].querySelector('dt-checkbox')?.shadowRoot;
    assert.strictEqual(checkboxShadow?.querySelector('label')?.textContent, 'rule 1');
    assert.isTrue(isRegexInIgnoredList('rule 1'));

    const rule1RemoveButton = regexRows[1].querySelector('devtools-button');
    rule1RemoveButton?.click();
    assert.isFalse(isRegexInIgnoredList('rule 1'));
  });

  it('Able to render the add new regex row correctly', async () => {
    const component = await renderIgnoreListSetting();
    assert.isNotNull(component.shadowRoot);

    const newRegexRows = component.shadowRoot.querySelectorAll<HTMLElement>('.new-regex-row');
    // There should only be one add new regex row.
    assert.strictEqual(newRegexRows.length, 1);
    // There are two elements, one is checkbox, one is the input
    const newRegexCheckboxes = newRegexRows[0].querySelectorAll<HTMLInputElement>('dt-checkbox');
    assert.strictEqual(newRegexCheckboxes.length, 1);
    const newRegexInputs = newRegexRows[0].querySelectorAll<HTMLInputElement>('.new-regex-text-input');
    assert.strictEqual(newRegexInputs.length, 1);
  });

  it('Able to add an ignore list rule', async () => {
    // Now there should only by 1 rule (`/node_modules/|/bower_components/`)
    assert.isFalse(isRegexInIgnoredList('rule 1'));

    const component = await renderIgnoreListSetting();
    const newRegexInput = getNewRegexInput(component);

    newRegexInput.value = 'rule 1';
    newRegexInput.dispatchEvent(new FocusEvent('blur'));

    assert.isTrue(isRegexInIgnoredList('rule 1'));
  });

  it('Do not add a duplicate ignore list rule', async () => {
    disableIgnoreRegex('rule 1');
    assert.isTrue(isIgnoreRegexDisabled('rule 1'));

    const component = await renderIgnoreListSetting();
    const newRegexInput = getNewRegexInput(component);

    newRegexInput.value = 'rule 1';
    newRegexInput.dispatchEvent(new FocusEvent('blur'));

    assert.isFalse(isIgnoreRegexDisabled('rule 1'));
  });
});

describeWithEnvironment('Pattern validator', () => {
  it('Can validate the valid pattern', () => {
    const validPattern = '^hello$';
    const result = TimelineComponents.IgnoreListSetting.patternValidator([], validPattern);
    assert.isTrue(result.valid);
  });

  it('Returns the reason for the empty pattern', () => {
    const emptyPattern = '';
    const result = TimelineComponents.IgnoreListSetting.patternValidator([], emptyPattern);
    assert.isFalse(result.valid);
    assert.strictEqual(result.errorMessage, 'Rule can\'t be empty');
  });

  it('Returns the reason for the existed pattern', () => {
    const duplicatePattern = 'abc';
    const existedRegex = {pattern: duplicatePattern, disabled: false};

    const result = TimelineComponents.IgnoreListSetting.patternValidator([existedRegex], duplicatePattern);
    assert.isFalse(result.valid);
    assert.strictEqual(result.errorMessage, 'Rule already exists');
  });

  it('Returns true for the disabled existed pattern', () => {
    const duplicatePattern = 'abc';
    const existedRegex = {pattern: duplicatePattern, disabled: true};

    const result = TimelineComponents.IgnoreListSetting.patternValidator([existedRegex], duplicatePattern);
    assert.isTrue(result.valid);
  });

  it('Returns the reason for the invalid pattern', () => {
    const invalidPattern = '[';
    const result = TimelineComponents.IgnoreListSetting.patternValidator([], invalidPattern);
    assert.isFalse(result.valid);
    assert.strictEqual(result.errorMessage, 'Rule must be a valid regular expression');
  });
});

function ignoreRegex(regexValue: string): void {
  const regexPatterns =
      (Common.Settings.Settings.instance().moduleSetting('skip-stack-frames-pattern') as Common.Settings.RegExpSetting)
          .getAsArray();
  regexPatterns.push({pattern: regexValue, disabled: false});
}

function disableIgnoreRegex(regexValue: string): void {
  const regexPatterns =
      (Common.Settings.Settings.instance().moduleSetting('skip-stack-frames-pattern') as Common.Settings.RegExpSetting)
          .getAsArray();
  for (const regexPattern of regexPatterns) {
    if (regexPattern.pattern === regexValue) {
      regexPattern.disabled = true;
      break;
    }
  }
}

function isIgnoreRegexDisabled(regexValue: string): boolean {
  const regexPatterns =
      (Common.Settings.Settings.instance().moduleSetting('skip-stack-frames-pattern') as Common.Settings.RegExpSetting)
          .getAsArray();
  for (const regexPattern of regexPatterns) {
    if (regexPattern.pattern === regexValue) {
      return regexPattern.disabled ?? false;
    }
  }
  return false;
}

/**
 * Returns if the regex is in the ignore list, no matter if it is disabled.
 */
function isRegexInIgnoredList(regexValue: string): boolean {
  const regexPatterns =
      (Common.Settings.Settings.instance().moduleSetting('skip-stack-frames-pattern') as Common.Settings.RegExpSetting)
          .getAsArray();
  for (const regexPattern of regexPatterns) {
    if (regexPattern.pattern === regexValue) {
      return true;
    }
  }
  return false;
}
