// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Application from './application.js';

const {urlString} = Platform.DevToolsPath;

describe('WebMCPTreeElement', () => {
  setupLocaleHooks();
  setupSettingsHooks();

  beforeEach(() => {
    localStorage.removeItem('web-mcp');
  });

  afterEach(() => {
    localStorage.removeItem('web-mcp');
  });

  it('renders trailing new badge on initial promotion', () => {
    const panel = sinon.createStubInstance(Application.ResourcesPanel.ResourcesPanel);

    const treeElement = new Application.WebMCPTreeElement.WebMCPTreeElement(panel);

    assert.strictEqual(treeElement.title, 'WebMCP');
    assert.strictEqual(treeElement.itemURL, 'webMcp://');
    const leadingIcon = treeElement.listItemElement.querySelector('.leading-icons devtools-icon');
    assert.isNotNull(leadingIcon);
    assert.strictEqual(leadingIcon.getAttribute('name'), 'document');
    const badge = treeElement.listItemElement.querySelector('.trailing-icons.icons-container .new-badge');
    assert.isNotNull(badge);
    assert.strictEqual(badge.textContent, 'NEW');
    assert.strictEqual(badge.getAttribute('jslog'), 'Badge; context: new-badge');
  });

  it('omits trailing new badge when promotion should not be shown', () => {
    sinon.stub(UI.UIUtils.PromotionManager.prototype, 'maybeShowPromotion').withArgs('web-mcp').returns(false);
    const panel = sinon.createStubInstance(Application.ResourcesPanel.ResourcesPanel);

    const treeElement = new Application.WebMCPTreeElement.WebMCPTreeElement(panel);

    assert.isNull(treeElement.listItemElement.querySelector('.trailing-icons'));
    assert.isNull(treeElement.listItemElement.querySelector('.new-badge'));
  });

  it('orders child elements correctly when attached to a tree outline', () => {
    const panel = sinon.createStubInstance(Application.ResourcesPanel.ResourcesPanel);
    const treeOutline = new UI.TreeOutline.TreeOutlineInShadow();
    const treeElement = new Application.WebMCPTreeElement.WebMCPTreeElement(panel);

    treeOutline.appendChild(treeElement);

    const childClasses = Array.from(treeElement.listItemElement.children, el => el.className);
    assert.deepEqual(childClasses, [
      'selection fill',
      'leading-icons icons-container',
      'tree-element-title',
      'trailing-icons icons-container',
    ]);
  });

  it('reuses WebMCPView across repeated selections', async () => {
    const panel = sinon.createStubInstance(Application.ResourcesPanel.ResourcesPanel);
    const panelShownSpy = sinon.spy(UI.UIUserMetrics.UIUserMetrics.instance(), 'panelShown');
    const treeElement = new Application.WebMCPTreeElement.WebMCPTreeElement(panel);

    assert.isFalse(treeElement.onselect(false));
    await UI.Widget.Widget.allUpdatesComplete;

    sinon.assert.calledOnce(panel.showView);
    const shownView = panel.showView.firstCall.args[0];
    assert.instanceOf(shownView, Application.WebMCPView.WebMCPView);
    sinon.assert.calledOnceWithExactly(panelShownSpy, 'web-mcp');

    treeElement.onselect(true);
    await UI.Widget.Widget.allUpdatesComplete;

    sinon.assert.calledTwice(panel.showView);
    assert.strictEqual(panel.showView.secondCall.args[0], shownView);
    sinon.assert.calledOnceWithExactly(panel.setLastSelectedItemPath, [urlString`webMcp://`]);
  });
});
