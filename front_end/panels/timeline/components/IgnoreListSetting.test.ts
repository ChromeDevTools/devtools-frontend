// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Bindings from '../../../models/bindings/bindings.js';
import * as Workspace from '../../../models/workspace/workspace.js';
import {
  dispatchBlurEvent,
  dispatchFocusEvent,
  dispatchInputEvent,
  dispatchKeyDownEvent,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as TimelineComponents from './components.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

describeWithEnvironment('Ignore List Setting', () => {
  async function renderIgnoreListSetting(): Promise<HTMLElement> {
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

  function getValidationResultElement(component: HTMLElement): HTMLDivElement {
    assert.isNotNull(component.shadowRoot);
    const validationResultElement = component.shadowRoot.querySelector<HTMLDivElement>('.input-validation');

    assert.exists(validationResultElement);
    return validationResultElement;
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
    assert.lengthOf(ignoredRules, 2);
    assert.deepEqual(ignoredRules[0].regex, '/node_modules/|/bower_components/');
    assert.isFalse(ignoredRules[0].disabled);
    assert.deepEqual(ignoredRules[1].regex, 'rule 1');
    assert.isFalse(ignoredRules[1].disabled);

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
    assert.lengthOf(ignoredRules, 2);
    assert.deepEqual(ignoredRules[0].regex, '/node_modules/|/bower_components/');
    assert.isFalse(ignoredRules[0].disabled);
    assert.deepEqual(ignoredRules[1].regex, 'rule 1');
    assert.isTrue(ignoredRules[1].disabled);
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
    assert.lengthOf(newRegexRows, 1);
    // There are two elements, one is checkbox, one is the input
    const newRegexCheckboxes = newRegexRows[0].querySelectorAll<HTMLInputElement>('dt-checkbox');
    assert.lengthOf(newRegexCheckboxes, 1);
    const newRegexInputs = newRegexRows[0].querySelectorAll<HTMLInputElement>('.new-regex-text-input');
    assert.lengthOf(newRegexInputs, 1);
  });

  it('Able to add an ignore list rule', async () => {
    // Now there should only by 1 rule (`/node_modules/|/bower_components/`)
    assert.isFalse(isRegexInIgnoredList('rule 1'));

    const component = await renderIgnoreListSetting();
    const newRegexInput = getNewRegexInput(component);

    newRegexInput.value = 'rule 1';
    dispatchBlurEvent(newRegexInput);

    assert.isTrue(isRegexInIgnoredList('rule 1'));
  });

  it('Do not add a duplicate ignore list rule', async () => {
    disableIgnoreRegex('rule 1');
    assert.isTrue(isIgnoreRegexDisabled('rule 1'));

    const component = await renderIgnoreListSetting();
    const newRegexInput = getNewRegexInput(component);

    newRegexInput.value = 'rule 1';
    dispatchBlurEvent(newRegexInput);

    assert.isFalse(isIgnoreRegexDisabled('rule 1'));
  });

  it('Do not show warning message for valid rule', async () => {
    const component = await renderIgnoreListSetting();
    const newRegexInput = getNewRegexInput(component);

    dispatchFocusEvent(newRegexInput);
    newRegexInput.value = 'rule 2';
    dispatchInputEvent(newRegexInput);
    await coordinator.done();

    const validationResultElement = component.shadowRoot?.querySelector<HTMLDivElement>('.input-validation');
    assert.notExists(validationResultElement);

    // We need this to simulate the 'finish editing' with empty input, so it can remove the temp regex. Otherwise the
    // future tests will be messed up.
    // The 'finish editing' part will be tested later
    newRegexInput.value = '';
    dispatchBlurEvent(newRegexInput);
  });

  it('Show error message for invalid rule', async () => {
    // One example of invalid rule is duplicate input.
    assert.isTrue(isRegexInIgnoredList('rule 1'));

    const component = await renderIgnoreListSetting();
    const newRegexInput = getNewRegexInput(component);

    dispatchFocusEvent(newRegexInput);
    newRegexInput.value = 'rule 1';
    dispatchInputEvent(newRegexInput);
    await coordinator.done();

    const validationResultElement = getValidationResultElement(component);
    assert.isFalse(validationResultElement.hidden);
    assert.isTrue(validationResultElement.classList.contains('input-validation-error'));
    assert.isNotEmpty(validationResultElement.textContent);

    // We need this to simulate the 'finish editing' with empty input, so it can remove the temp regex. Otherwise the
    // future tests will be messed up.
    // The 'finish editing' part will be tested later
    newRegexInput.value = '';
    dispatchBlurEvent(newRegexInput);
  });

  it('Show warning message for valid rule with warning message', async () => {
    // One example of valid rule with warning message is when a rule is disabled and it is added again.
    disableIgnoreRegex('rule 1');
    assert.isTrue(isIgnoreRegexDisabled('rule 1'));

    const component = await renderIgnoreListSetting();
    const newRegexInput = getNewRegexInput(component);

    dispatchFocusEvent(newRegexInput);
    newRegexInput.value = 'rule 1';
    dispatchInputEvent(newRegexInput);
    await coordinator.done();

    const validationResultElement = getValidationResultElement(component);
    assert.isFalse(validationResultElement.hidden);
    assert.isFalse(validationResultElement.classList.contains('input-validation-error'));
    assert.isNotEmpty(validationResultElement.textContent);

    // We need this to simulate the 'finish editing' with empty input, so it can remove the temp regex. Otherwise the
    // future tests will be messed up.
    // The 'finish editing' part will be tested later
    newRegexInput.value = '';
    dispatchBlurEvent(newRegexInput);
  });

  describe('preview the result', () => {
    it('Add an empty regex when focusing on the input', async () => {
      const regexPatterns = getIgnoredRegexes();
      // There is a default rule `/node_modules/|/bower_components/`, and the 'rule 1' we added.
      assert.lengthOf(regexPatterns, 2);

      const component = await renderIgnoreListSetting();
      const newRegexInput = getNewRegexInput(component);

      dispatchFocusEvent(newRegexInput);
      assert.lengthOf(regexPatterns, 3);

      // We need this to simulate the 'finish editing', so it can remove the temp regex. Otherwise the future tests will
      // be messed up.
      // The 'finish editing' part will be tested later
      dispatchBlurEvent(newRegexInput);
    });

    it('Update the regex when user typing', async () => {
      const regexPatterns = getIgnoredRegexes();
      // There is a default rule `/node_modules/|/bower_components/`, and the 'rule 1' we added.
      assert.lengthOf(regexPatterns, 2);

      const component = await renderIgnoreListSetting();
      const newRegexInput = getNewRegexInput(component);

      dispatchFocusEvent(newRegexInput);
      assert.lengthOf(regexPatterns, 3);
      // After the focus event, the temp regex (last one) is still empty.
      assert.strictEqual(regexPatterns[2].pattern, '');
      // Simulate user's typing
      newRegexInput.value = 'r';
      dispatchInputEvent(newRegexInput);
      // After the input event, the temp regex (last one) is updated.
      assert.strictEqual(regexPatterns[2].pattern, 'r');

      // We need this to simulate the 'finish editing' with empty input, so it can remove the temp regex. Otherwise the
      // future tests will be messed up.
      // The 'finish editing' part will be tested later
      newRegexInput.value = '';
      dispatchBlurEvent(newRegexInput);
    });

    it('Add the regex when user finish typing', async () => {
      const regexPatterns = getIgnoredRegexes();
      // There is a default rule `/node_modules/|/bower_components/`, and the 'rule 1' we added.
      assert.lengthOf(regexPatterns, 2);

      const component = await renderIgnoreListSetting();
      const newRegexInput = getNewRegexInput(component);

      dispatchFocusEvent(newRegexInput);
      newRegexInput.value = 'rule 2';
      assert.lengthOf(regexPatterns, 3);

      dispatchBlurEvent(newRegexInput);
      // When add a valid rule, the temp regex won't be removed.
      assert.lengthOf(regexPatterns, 3);
      assert.strictEqual(regexPatterns[2].pattern, 'rule 2');
    });

    it('Remove the invalid regex when user finish typing', async () => {
      const regexPatterns = getIgnoredRegexes();
      // There is a default rule `/node_modules/|/bower_components/`, and the 'rule 1', 'rule 2' we added.
      assert.lengthOf(regexPatterns, 3);

      const component = await renderIgnoreListSetting();
      const newRegexInput = getNewRegexInput(component);

      dispatchFocusEvent(newRegexInput);
      // This is a duplicate rule, so it is invalid.
      newRegexInput.value = 'rule 2';
      assert.lengthOf(regexPatterns, 4);

      dispatchBlurEvent(newRegexInput);
      // When add an invalid rule, the temp regex will be removed.
      assert.lengthOf(regexPatterns, 3);
    });

    it('Clear the input when `Escape` is pressed', async () => {
      const component = await renderIgnoreListSetting();
      const newRegexInput = getNewRegexInput(component);

      // This is a duplicate rule, so it is invalid.
      newRegexInput.value = 'rule 2';

      dispatchKeyDownEvent(newRegexInput, {key: Platform.KeyboardUtilities.ESCAPE_KEY});
      // When add an invalid rule, the temp regex will be removed.
      assert.strictEqual('', newRegexInput.value);
    });
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
    assert.strictEqual(result.message, 'Rule can\'t be empty');
  });

  it('Returns the reason for the existed pattern', () => {
    const duplicatePattern = 'abc';
    const existedRegex = {pattern: duplicatePattern, disabled: false};

    const result = TimelineComponents.IgnoreListSetting.patternValidator([existedRegex], duplicatePattern);
    assert.isFalse(result.valid);
    assert.strictEqual(result.message, 'Rule already exists');
  });

  it('Returns true for the disabled existed pattern', () => {
    const duplicatePattern = 'abc';
    const existedRegex = {pattern: duplicatePattern, disabled: true};

    const result = TimelineComponents.IgnoreListSetting.patternValidator([existedRegex], duplicatePattern);
    assert.isTrue(result.valid);
    assert.strictEqual(
        result.message, 'This rule already exists but is disabled. Saving this value will re-enable the rule');
  });

  it('Returns the reason for the invalid pattern', () => {
    const invalidPattern = '[';
    const result = TimelineComponents.IgnoreListSetting.patternValidator([], invalidPattern);
    assert.isFalse(result.valid);
    assert.strictEqual(result.message, 'Rule must be a valid regular expression');
  });
});

function getIgnoredRegexes(): Common.Settings.RegExpSettingItem[] {
  return (Common.Settings.Settings.instance().moduleSetting('skip-stack-frames-pattern') as
          Common.Settings.RegExpSetting)
      .getAsArray();
}

function ignoreRegex(regexValue: string): void {
  const regexPatterns = getIgnoredRegexes();
  regexPatterns.push({pattern: regexValue, disabled: false});
}

function disableIgnoreRegex(regexValue: string): void {
  const regexPatterns = getIgnoredRegexes();
  for (const regexPattern of regexPatterns) {
    if (regexPattern.pattern === regexValue) {
      regexPattern.disabled = true;
      break;
    }
  }
}

function isIgnoreRegexDisabled(regexValue: string): boolean {
  const regexPatterns = getIgnoredRegexes();
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
  const regexPatterns = getIgnoredRegexes();
  for (const regexPattern of regexPatterns) {
    if (regexPattern.pattern === regexValue) {
      return true;
    }
  }
  return false;
}
