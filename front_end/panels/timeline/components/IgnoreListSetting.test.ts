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

describeWithEnvironment('isIgnoreListedEntry', () => {
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
