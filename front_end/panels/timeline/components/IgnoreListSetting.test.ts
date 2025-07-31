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
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as TimelineComponents from './components.js';

describeWithEnvironment('Ignore List Setting', () => {
  async function renderIgnoreListSetting(): Promise<HTMLElement> {
    const component = new TimelineComponents.IgnoreListSetting.IgnoreListSetting();
    renderElementIntoDOM(component);
    await RenderCoordinator.done();
    return component;
  }

  function getAllRules(component: HTMLElement): Array<{regex: string, disabled: boolean}> {
    assert.isNotNull(component.shadowRoot);
    const regexRows = component.shadowRoot.querySelectorAll<HTMLElement>('.regex-row');
    return Array.from(regexRows).map(row => {
      const checkboxShadow = row.querySelector('devtools-checkbox')?.shadowRoot;
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
    const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
      ignoreListManager,
    });
  });

  beforeEach(() => {
    const regexPatterns = getIgnoredRegexes();
    // There is a default rule `/node_modules/|^node:`, So let's remove it for less confusion.
    // Also this will clear the ignore list so each test can be individual.
    regexPatterns.length = 0;
  });

  it('Able to render the ignore listed rules', async () => {
    ignoreRegex('rule 1');

    const component = await renderIgnoreListSetting();
    const ignoredRules = getAllRules(component);

    assert.lengthOf(ignoredRules, 1);
    assert.deepEqual(ignoredRules[0].regex, 'rule 1');
    assert.isFalse(ignoredRules[0].disabled);

    // Check the remove buttons are rendered
    assert.isNotNull(component.shadowRoot);
    const regexRowsElements = component.shadowRoot.querySelectorAll<HTMLElement>('.regex-row');
    Array.from(regexRowsElements).forEach(row => {
      const removeButton = row.querySelector('devtools-button');
      assert.exists(removeButton);
    });
  });

  it('Able to render the disabled ignore listed rules', async () => {
    ignoreRegex('rule 1');
    disableIgnoreRegex('rule 1');

    const component = await renderIgnoreListSetting();
    const ignoredRules = getAllRules(component);

    // There is a default rule `/node_modules/|/bower_components/`
    assert.lengthOf(ignoredRules, 1);
    assert.deepEqual(ignoredRules[0].regex, 'rule 1');
    assert.isTrue(ignoredRules[0].disabled);
  });

  it('Able to toggle the disable status of an ignore listed rules', async () => {
    ignoreRegex('rule 1');
    const component = await renderIgnoreListSetting();

    assert.isNotNull(component.shadowRoot);
    const regexRows = component.shadowRoot.querySelectorAll<HTMLElement>('.regex-row');
    // Add sanity checks to make sure the rule is enabled before toggling.
    assert.isFalse(isIgnoreRegexDisabled('rule 1'));

    const rule1CheckBox = regexRows[0].querySelector('devtools-checkbox')?.shadowRoot?.querySelector('input');
    rule1CheckBox?.click();
    assert.isTrue(isIgnoreRegexDisabled('rule 1'));
  });

  it('Able to remove an ignore list rule', async () => {
    ignoreRegex('rule 1');
    const component = await renderIgnoreListSetting();

    assert.isNotNull(component.shadowRoot);
    const regexRows = component.shadowRoot.querySelectorAll<HTMLElement>('.regex-row');
    // Add sanity checks to make sure 'rule 1' exists.
    assert.isTrue(isRegexInIgnoredList('rule 1'));

    const rule1RemoveButton = regexRows[0].querySelector('devtools-button');
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
    const newRegexCheckboxes = newRegexRows[0].querySelectorAll<HTMLInputElement>('devtools-checkbox');
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
    ignoreRegex('rule 1');
    disableIgnoreRegex('rule 1');
    assert.isTrue(isIgnoreRegexDisabled('rule 1'));

    const component = await renderIgnoreListSetting();
    const newRegexInput = getNewRegexInput(component);

    newRegexInput.value = 'rule 1';
    dispatchBlurEvent(newRegexInput);

    assert.isFalse(isIgnoreRegexDisabled('rule 1'));
  });

  describe('preview the result', () => {
    it('Add an empty regex when focusing on the input', async () => {
      const regexPatterns = getIgnoredRegexes();
      assert.lengthOf(regexPatterns, 0);

      const component = await renderIgnoreListSetting();
      const newRegexInput = getNewRegexInput(component);

      dispatchFocusEvent(newRegexInput);
      assert.lengthOf(regexPatterns, 1);

      // We need this to simulate the 'finish editing', so it can remove the temp regex. Otherwise the future tests will
      // be messed up.
      // The 'finish editing' part will be tested later
      dispatchBlurEvent(newRegexInput);
    });

    it('Update the regex when user typing', async () => {
      const regexPatterns = getIgnoredRegexes();
      assert.lengthOf(regexPatterns, 0);

      const component = await renderIgnoreListSetting();
      const newRegexInput = getNewRegexInput(component);

      dispatchFocusEvent(newRegexInput);
      assert.lengthOf(regexPatterns, 1);
      // After the focus event, the temp regex (last one) is still empty.
      assert.strictEqual(regexPatterns[0].pattern, '');
      // Simulate user's typing
      newRegexInput.value = 'r';
      dispatchInputEvent(newRegexInput);
      // After the input event, the temp regex (last one) is updated.
      assert.strictEqual(regexPatterns[0].pattern, 'r');

      // We need this to simulate the 'finish editing' with empty input, so it can remove the temp regex. Otherwise the
      // future tests will be messed up.
      // The 'finish editing' part will be tested later
      newRegexInput.value = '';
      dispatchBlurEvent(newRegexInput);
    });

    it('Add the regex when user finish typing', async () => {
      const regexPatterns = getIgnoredRegexes();
      assert.lengthOf(regexPatterns, 0);

      const component = await renderIgnoreListSetting();
      const newRegexInput = getNewRegexInput(component);

      dispatchFocusEvent(newRegexInput);
      newRegexInput.value = 'rule 1';
      assert.lengthOf(regexPatterns, 1);

      dispatchBlurEvent(newRegexInput);
      // When add a valid rule, the temp regex won't be removed.
      assert.lengthOf(regexPatterns, 1);
      assert.strictEqual(regexPatterns[0].pattern, 'rule 1');
    });

    it('Remove the invalid regex when user finish typing', async () => {
      ignoreRegex('rule 1');
      const regexPatterns = getIgnoredRegexes();
      assert.lengthOf(regexPatterns, 1);

      const component = await renderIgnoreListSetting();
      const newRegexInput = getNewRegexInput(component);

      dispatchFocusEvent(newRegexInput);
      // This is a duplicate rule, so it is invalid.
      newRegexInput.value = 'rule 1';
      assert.lengthOf(regexPatterns, 2);

      dispatchBlurEvent(newRegexInput);
      // When add an invalid rule, the temp regex will be removed.
      assert.lengthOf(regexPatterns, 1);
    });

    it('Clear the input when `Escape` is pressed', async () => {
      const component = await renderIgnoreListSetting();
      const newRegexInput = getNewRegexInput(component);

      // This is a duplicate rule, so it is invalid.
      newRegexInput.value = 'rule 1';

      dispatchKeyDownEvent(newRegexInput, {key: Platform.KeyboardUtilities.ESCAPE_KEY});
      // When add an invalid rule, the temp regex will be removed.
      assert.strictEqual('', newRegexInput.value);
    });
  });
});

describeWithEnvironment('Pattern validator', () => {
  it('Can validate the valid pattern', () => {
    const validPattern = '^hello$';
    const result = TimelineComponents.IgnoreListSetting.regexInputIsValid(validPattern);
    assert.isTrue(result);
  });

  it('Returns false for the empty pattern', () => {
    const emptyPattern = '';
    const result = TimelineComponents.IgnoreListSetting.regexInputIsValid(emptyPattern);
    assert.isFalse(result);
  });

  it('Returns false for the invalid pattern', () => {
    const invalidPattern = '[';
    const result = TimelineComponents.IgnoreListSetting.regexInputIsValid(invalidPattern);
    assert.isFalse(result);
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
