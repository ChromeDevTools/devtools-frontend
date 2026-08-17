// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import * as Protocol from '../../generated/protocol.js';
import {assertScreenshot, doubleRaf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as Security from './security.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('SecurityPanelSidebar', () => {
  it('initializes with default sections, overview element, and origin groups', () => {
    const sidebar = new Security.SecurityPanelSidebar.SecurityPanelSidebar();
    renderElementIntoDOM(sidebar);

    assert.exists(sidebar.securityOverviewElement);
    assert.strictEqual(sidebar.securityOverviewElement.tooltip, 'Overview');

    const originGroups = sidebar.originGroups;
    assert.strictEqual(originGroups.size, 4);

    const mainOriginGroup = originGroups.get(Security.SecurityPanel.OriginGroup.MainOrigin);
    assert.exists(mainOriginGroup);
    assert.isFalse(mainOriginGroup.hidden);
    assert.strictEqual(mainOriginGroup.childCount(), 1);

    const nonSecureGroup = originGroups.get(Security.SecurityPanel.OriginGroup.NonSecure);
    assert.exists(nonSecureGroup);
    assert.isTrue(nonSecureGroup.hidden);

    const secureGroup = originGroups.get(Security.SecurityPanel.OriginGroup.Secure);
    assert.exists(secureGroup);
    assert.isTrue(secureGroup.hidden);

    const unknownGroup = originGroups.get(Security.SecurityPanel.OriginGroup.Unknown);
    assert.exists(unknownGroup);
    assert.isTrue(unknownGroup.hidden);
  });

  it('adds and updates origins across category groups', () => {
    const sidebar = new Security.SecurityPanelSidebar.SecurityPanelSidebar();
    renderElementIntoDOM(sidebar);

    const secureOrigin = urlString`https://secure.example.com`;
    const insecureOrigin = urlString`http://insecure.example.com`;
    const unknownOrigin = urlString`https://unknown.example.com`;

    sidebar.addOrigin(secureOrigin, Protocol.Security.SecurityState.Secure);
    sidebar.addOrigin(insecureOrigin, Protocol.Security.SecurityState.Insecure);
    sidebar.addOrigin(unknownOrigin, Protocol.Security.SecurityState.Unknown);

    assert.strictEqual(sidebar.elementsByOrigin().size, 3);

    const secureGroup = sidebar.originGroups.get(Security.SecurityPanel.OriginGroup.Secure);
    assert.exists(secureGroup);
    assert.isFalse(secureGroup.hidden);
    assert.strictEqual(secureGroup.childCount(), 1);

    const nonSecureGroup = sidebar.originGroups.get(Security.SecurityPanel.OriginGroup.NonSecure);
    assert.exists(nonSecureGroup);
    assert.isFalse(nonSecureGroup.hidden);
    assert.strictEqual(nonSecureGroup.childCount(), 1);

    const unknownGroup = sidebar.originGroups.get(Security.SecurityPanel.OriginGroup.Unknown);
    assert.exists(unknownGroup);
    assert.isFalse(unknownGroup.hidden);
    assert.strictEqual(unknownGroup.childCount(), 1);

    // Update insecure origin to secure
    sidebar.updateOrigin(insecureOrigin, Protocol.Security.SecurityState.Secure);
    assert.isTrue(nonSecureGroup.hidden);
    assert.strictEqual(nonSecureGroup.childCount(), 0);
    assert.strictEqual(secureGroup.childCount(), 2);
  });

  it('handles main origin assignment and updates', () => {
    const sidebar = new Security.SecurityPanelSidebar.SecurityPanelSidebar();
    renderElementIntoDOM(sidebar);

    const mainOrigin = urlString`https://main.example.com`;
    sidebar.setMainOrigin(mainOrigin);
    assert.strictEqual(sidebar.mainOrigin, mainOrigin);

    sidebar.addOrigin(mainOrigin, Protocol.Security.SecurityState.Secure);

    const mainOriginGroup = sidebar.originGroups.get(Security.SecurityPanel.OriginGroup.MainOrigin);
    assert.exists(mainOriginGroup);
    assert.isFalse(mainOriginGroup.hidden);
    // 1 reload message + 1 main origin element = 2
    assert.strictEqual(mainOriginGroup.childCount(), 2);

    const originElement = sidebar.elementsByOrigin().get(mainOrigin);
    assert.exists(originElement);
    assert.strictEqual(originElement.parent, mainOriginGroup);
  });

  it('clears origins correctly and restores reload message', () => {
    const sidebar = new Security.SecurityPanelSidebar.SecurityPanelSidebar();
    renderElementIntoDOM(sidebar);

    const origin = urlString`https://secure.example.com`;
    sidebar.addOrigin(origin, Protocol.Security.SecurityState.Secure);
    assert.strictEqual(sidebar.elementsByOrigin().size, 1);

    sidebar.clearOrigins();
    assert.strictEqual(sidebar.elementsByOrigin().size, 0);

    const secureGroup = sidebar.originGroups.get(Security.SecurityPanel.OriginGroup.Secure);
    assert.exists(secureGroup);
    assert.isTrue(secureGroup.hidden);
    assert.strictEqual(secureGroup.childCount(), 0);

    const mainOriginGroup = sidebar.originGroups.get(Security.SecurityPanel.OriginGroup.MainOrigin);
    assert.exists(mainOriginGroup);
    assert.isFalse(mainOriginGroup.hidden);
    assert.strictEqual(mainOriginGroup.childCount(), 1);
  });

  it('toggles visibility of origin groups', () => {
    const sidebar = new Security.SecurityPanelSidebar.SecurityPanelSidebar();
    renderElementIntoDOM(sidebar);

    const origin = urlString`https://secure.example.com`;
    sidebar.addOrigin(origin, Protocol.Security.SecurityState.Secure);

    const secureGroup = sidebar.originGroups.get(Security.SecurityPanel.OriginGroup.Secure);
    assert.exists(secureGroup);
    assert.isFalse(secureGroup.hidden);

    sidebar.toggleOriginsList(true);
    for (const group of sidebar.originGroups.values()) {
      assert.isTrue(group.hidden);
    }

    sidebar.toggleOriginsList(false);
    for (const group of sidebar.originGroups.values()) {
      assert.isFalse(group.hidden);
    }
  });

  it('dispatches ShowOriginEvent when an origin element is shown', async () => {
    const sidebar = new Security.SecurityPanelSidebar.SecurityPanelSidebar();
    renderElementIntoDOM(sidebar);
    await doubleRaf();

    const origin = urlString`https://secure.example.com`;
    sidebar.addOrigin(origin, Protocol.Security.SecurityState.Secure);

    const originElement = sidebar.elementsByOrigin().get(origin);
    assert.exists(originElement);

    const eventListener = sinon.stub();
    sidebar.element.addEventListener('showorigin', eventListener);

    originElement.showElement();
    sinon.assert.calledOnce(eventListener);
    const event = eventListener.firstCall.args[0] as Security.OriginTreeElement.ShowOriginEvent;
    assert.strictEqual(event.origin, origin);
  });

  describe('visual screenshots', () => {
    it('renders initial sidebar state', async () => {
      const sidebar = new Security.SecurityPanelSidebar.SecurityPanelSidebar();
      renderElementIntoDOM(sidebar, {includeCommonStyles: true});
      await assertScreenshot('security/security_sidebar_initial.png');
    });

    it('renders populated sidebar with categorized origins', async () => {
      const sidebar = new Security.SecurityPanelSidebar.SecurityPanelSidebar();
      renderElementIntoDOM(sidebar, {includeCommonStyles: true});

      const mainOrigin = urlString`https://devtools.test`;
      const secureOrigin = urlString`https://secure.example.com`;
      const insecureOrigin = urlString`http://insecure.example.com`;
      const unknownOrigin = urlString`https://unknown.example.com`;

      sidebar.setMainOrigin(mainOrigin);
      sidebar.addOrigin(mainOrigin, Protocol.Security.SecurityState.Secure);
      sidebar.addOrigin(secureOrigin, Protocol.Security.SecurityState.Secure);
      sidebar.addOrigin(insecureOrigin, Protocol.Security.SecurityState.Insecure);
      sidebar.addOrigin(unknownOrigin, Protocol.Security.SecurityState.Unknown);

      await assertScreenshot('security/security_sidebar_populated.png');
    });
  });
});
