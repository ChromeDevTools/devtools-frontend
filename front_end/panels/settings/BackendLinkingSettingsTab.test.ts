// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as NetworkForward from '../network/forward/forward.js';

import * as Settings from './settings.js';

const {BackendLinkingSettingsTab, DEFAULT_VIEW} = Settings.BackendLinkingSettingsTab;

describeWithEnvironment('BackendLinkingSettingsTab presenter', () => {
  it('validates rules and handles modifiers', async () => {
    const setting =
        Common.Settings.Settings.instance().resolve(NetworkForward.BackendLinking.backendLinkingRulesSettingDescriptor);
    setting.set([]);

    const view = createViewFunctionStub(BackendLinkingSettingsTab);
    const tab = new BackendLinkingSettingsTab(undefined, view);
    tab.wasShown();
    await view.nextInput;

    assert.deepEqual(view.input.rules, []);

    // 1. onAddRule validity checks: invalid rules must not be added.
    view.input.onAddRule({urlPattern: '', targetUrlTemplate: 'https://apm.example.com/${traceId}', label: 'Rule'});
    assert.lengthOf(setting.get(), 0);

    view.input.onAddRule(
        {urlPattern: 'ht tp://invalid', targetUrlTemplate: 'https://apm.example.com/${traceId}', label: 'Rule'});
    assert.lengthOf(setting.get(), 0);

    view.input.onAddRule({urlPattern: 'https://example.com/*', targetUrlTemplate: '', label: 'Rule'});
    assert.lengthOf(setting.get(), 0);

    view.input.onAddRule({
      urlPattern: 'https://example.com/*',
      targetUrlTemplate: 'https://apm.example.com/no-placeholder',
      label: 'Rule',
    });
    assert.lengthOf(setting.get(), 0);

    view.input.onAddRule(
        {urlPattern: 'https://example.com/*', targetUrlTemplate: 'https://apm.example.com/${traceId}', label: ''});
    assert.lengthOf(setting.get(), 0);

    // 2. onAddRule with a valid rule adds the rule.
    const validRule: NetworkForward.BackendLinking.BackendLinkingRule = {
      urlPattern: 'https://example.com/*',
      targetUrlTemplate: 'https://apm.example.com/${traceId}',
      label: 'APM Trace',
    };
    view.input.onAddRule(validRule);
    assert.deepEqual(setting.get(), [validRule]);
    await view.nextInput;
    assert.deepEqual(view.input.rules, [validRule]);

    // 3. onUpdateRule validity checks: invalid updates must be rejected.
    view.input.onUpdateRule(validRule, {...validRule, urlPattern: ''});
    assert.deepEqual(setting.get(), [validRule]);

    view.input.onUpdateRule(validRule, {...validRule, urlPattern: 'ht tp://invalid'});
    assert.deepEqual(setting.get(), [validRule]);

    view.input.onUpdateRule(validRule, {...validRule, targetUrlTemplate: ''});
    assert.deepEqual(setting.get(), [validRule]);

    view.input.onUpdateRule(validRule, {...validRule, targetUrlTemplate: 'https://apm.example.com/no-placeholder'});
    assert.deepEqual(setting.get(), [validRule]);

    view.input.onUpdateRule(validRule, {...validRule, label: ''});
    assert.deepEqual(setting.get(), [validRule]);

    // 4. onUpdateRule with a valid rule updates the rule.
    const updatedRule: NetworkForward.BackendLinking.BackendLinkingRule = {
      urlPattern: 'https://example.org/api/*',
      targetUrlTemplate: 'https://apm.example.org/trace/${spanId}',
      label: 'Updated Label',
    };
    view.input.onUpdateRule(validRule, updatedRule);
    assert.deepEqual(setting.get(), [updatedRule]);
    await view.nextInput;
    assert.deepEqual(view.input.rules, [updatedRule]);

    // 5. onDeleteRule deletes the rule.
    view.input.onDeleteRule(updatedRule);
    assert.deepEqual(setting.get(), []);
    await view.nextInput;
    assert.deepEqual(view.input.rules, []);
  });
});

describeWithEnvironment('BackendLinkingSettingsTab view', () => {
  it('invokes modifiers on create, edit, and delete events', () => {
    const target = document.createElement('div');
    renderElementIntoDOM(target, {includeCommonStyles: true});

    const onAddRule = sinon.stub();
    const onUpdateRule = sinon.stub();
    const onDeleteRule = sinon.stub();

    const rule: NetworkForward.BackendLinking.BackendLinkingRule = {
      urlPattern: 'https://example.com/*',
      targetUrlTemplate: 'https://apm.example.com/${traceId}',
      label: 'Trace Link',
    };

    DEFAULT_VIEW({
      rules: [rule],
      onAddRule,
      onUpdateRule,
      onDeleteRule,
    },
                 {}, target);

    const dataGrid = target.querySelector('devtools-data-grid');
    assert.exists(dataGrid);

    dataGrid.dispatchEvent(new CustomEvent('create', {
      detail: {
        urlPattern: '  https://example.org/*  ',
        targetUrlTemplate: '  https://trace.org/${requestId}  ',
        label: '  New Rule  ',
      },
    }));
    sinon.assert.calledOnceWithExactly(onAddRule, {
      urlPattern: 'https://example.org/*',
      targetUrlTemplate: 'https://trace.org/${requestId}',
      label: 'New Rule',
    });

    dataGrid.dispatchEvent(new CustomEvent('create', {
      detail: {
        urlPattern: '   ',
        targetUrlTemplate: '',
        label: '',
      },
    }));
    sinon.assert.calledOnce(onAddRule);

    const tbody = target.querySelector('tbody');
    assert.exists(tbody);
    const row = tbody.querySelector('tr');
    assert.exists(row);
    row.dispatchEvent(new CustomEvent('edit', {
      detail: {
        columnId: 'label',
        valueBeforeEditing: 'Trace Link',
        newText: '  Edited Label  ',
      },
    }));
    sinon.assert.calledOnceWithExactly(onUpdateRule, rule, {
      ...rule,
      label: 'Edited Label',
    });

    row.dispatchEvent(new CustomEvent('delete'));
    sinon.assert.calledOnceWithExactly(onDeleteRule, rule);
  });

  it('renders table with and without validation issues and matches screenshot', async () => {
    const target = document.createElement('div');
    renderElementIntoDOM(target, {includeCommonStyles: true, width: 800, height: 750});

    DEFAULT_VIEW({
      rules: [
        {
          urlPattern: 'https://example.com/*',
          targetUrlTemplate: 'https://apm.example.com/traces/${traceId}',
          label: 'Valid Rule',
        },
        {
          urlPattern: '',
          targetUrlTemplate: '',
          label: '',
        },
        {
          urlPattern: 'ht tp://invalid url',
          targetUrlTemplate: 'https://apm.example.com/traces/no-placeholder',
          label: 'Invalid Format',
        },
      ],
      onAddRule: () => {},
      onUpdateRule: () => {},
      onDeleteRule: () => {},
    },
                 {}, target);

    await assertScreenshot('settings/backend_linking_settings_tab.png');
  });
});
