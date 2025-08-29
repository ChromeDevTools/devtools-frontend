// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {createTarget, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {getMainFrame, navigate} from '../../testing/ResourceTreeHelpers.js';

import * as Security from './security.js';

const {urlString} = Platform.DevToolsPath;

describeWithMockConnection('SecurityAndPrivacyPanel', () => {
  describe('viewMemory', () => {
    it('initially shows control view if privacy UI is enabled', () => {
      updateHostConfig({devToolsPrivacyUI: {enabled: true}});
      const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});

      assert.instanceOf(securityPanel.visibleView, Security.CookieControlsView.CookieControlsView);
    });

    it('initially shows security main view if privacy UI is not enabled', () => {
      updateHostConfig({devToolsPrivacyUI: {enabled: false}});
      const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});

      assert.instanceOf(securityPanel.visibleView, Security.SecurityPanel.SecurityMainView);
    });

    it('remembers last selected view when new panel is made', () => {
      updateHostConfig({devToolsPrivacyUI: {enabled: true}});
      let securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});

      // Should initially be the controls view
      assert.instanceOf(securityPanel.visibleView, Security.CookieControlsView.CookieControlsView);

      // Select and switch to the security main view
      securityPanel.sidebar.securityOverviewElement.select(/* omitFocus=*/ false, /* selectedByUser=*/ true);
      assert.instanceOf(securityPanel.visibleView, Security.SecurityPanel.SecurityMainView);

      // Create a new security panel. The last selected view memory should make the main view visible
      securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});
      assert.instanceOf(securityPanel.visibleView, Security.SecurityPanel.SecurityMainView);
    });

    it('remembers last selected view for IP Protection', () => {
      updateHostConfig({
        devToolsPrivacyUI: {enabled: true},
        devToolsIpProtectionPanelInDevTools: {enabled: true},
      });
      let securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});

      // Should initially be the controls view, as it's the first item in the privacy section.
      assert.instanceOf(securityPanel.visibleView, Security.CookieControlsView.CookieControlsView);

      const ipProtectionTreeElement = securityPanel.sidebar.ipProtectionTreeElement;
      assert.exists(ipProtectionTreeElement, 'IPProtectionTreeElement should exist when feature is enabled');

      // Select and switch to the IP Protection view
      ipProtectionTreeElement.select(/* omitFocus=*/ false, /* selectedByUser=*/ true);
      assert.instanceOf(securityPanel.visibleView, Security.IPProtectionView.IPProtectionView);

      // Create a new security panel. The last selected view memory should make the IP Protection view visible
      securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});
      assert.instanceOf(securityPanel.visibleView, Security.IPProtectionView.IPProtectionView);
    });
  });

  describe('updateOrigin', () => {
    it('correctly updates the URL scheme highlighting', () => {
      const origin = urlString`https://foo.bar`;
      const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});

      securityPanel.sidebar.addOrigin(origin, Protocol.Security.SecurityState.Unknown);
      assert.notExists(
          securityPanel.sidebar.sidebarTree.contentElement.querySelector('.highlighted-url > .url-scheme-secure'));
      assert.exists(
          securityPanel.sidebar.sidebarTree.contentElement.querySelector('.highlighted-url > .url-scheme-unknown'));

      securityPanel.sidebar.updateOrigin(origin, Protocol.Security.SecurityState.Secure);

      assert.exists(
          securityPanel.sidebar.sidebarTree.contentElement.querySelector('.highlighted-url > .url-scheme-secure'));
      assert.notExists(
          securityPanel.sidebar.sidebarTree.contentElement.querySelector('.highlighted-url > .url-scheme-unknown'));
    });
  });
});

describeWithMockConnection('SecurityPanel', () => {
  let target: SDK.Target.Target;
  let prerenderTarget: SDK.Target.Target;

  beforeEach(() => {
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    prerenderTarget = createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    target = createTarget({parentTarget: tabTarget});
  });

  it('updates when security state changes', async () => {
    const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});
    const securityModel = target.model(Security.SecurityModel.SecurityModel);
    assert.exists(securityModel);
    const visibleSecurityState = {
      securityState: Protocol.Security.SecurityState.Insecure,
      securityStateIssueIds: [],
      certificateSecurityState: null,
    } as unknown as Security.SecurityModel.PageVisibleSecurityState;
    securityModel.dispatchEventToListeners(
        Security.SecurityModel.Events.VisibleSecurityStateChanged, visibleSecurityState);

    assert.isTrue(securityPanel.mainView.contentElement.querySelector('.security-summary')
                      ?.classList.contains('security-summary-insecure'));

    visibleSecurityState.securityState = Protocol.Security.SecurityState.Secure;
    securityModel.dispatchEventToListeners(
        Security.SecurityModel.Events.VisibleSecurityStateChanged, visibleSecurityState);

    assert.isFalse(securityPanel.mainView.contentElement.querySelector('.security-summary')
                       ?.classList.contains('security-summary-insecure'));
    assert.isTrue(securityPanel.mainView.contentElement.querySelector('.security-summary')
                      ?.classList.contains('security-summary-secure'));
  });

  it('can switch to a different SecurityModel', async () => {
    const mainSecurityModel = target.model(Security.SecurityModel.SecurityModel);
    assert.exists(mainSecurityModel);
    const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});

    // Add the main target to the security panel.
    securityPanel.modelAdded(mainSecurityModel);
    const visibleSecurityState = {
      securityState: Protocol.Security.SecurityState.Insecure,
      securityStateIssueIds: [],
      certificateSecurityState: null,
    } as unknown as Security.SecurityModel.PageVisibleSecurityState;
    mainSecurityModel.dispatchEventToListeners(
        Security.SecurityModel.Events.VisibleSecurityStateChanged, visibleSecurityState);
    assert.isTrue(securityPanel.mainView.contentElement.querySelector('.security-summary')
                      ?.classList.contains('security-summary-insecure'));

    // Switch to the prerender target.
    const prerenderSecurityModel = prerenderTarget.model(Security.SecurityModel.SecurityModel);
    assert.exists(prerenderSecurityModel);
    securityPanel.modelAdded(prerenderSecurityModel);
    securityPanel.modelRemoved(mainSecurityModel);

    // Check that the security panel does not listen to events from the previous target.
    visibleSecurityState.securityState = Protocol.Security.SecurityState.Secure;
    mainSecurityModel.dispatchEventToListeners(
        Security.SecurityModel.Events.VisibleSecurityStateChanged, visibleSecurityState);
    assert.isTrue(securityPanel.mainView.contentElement.querySelector('.security-summary')
                      ?.classList.contains('security-summary-insecure'));

    // Check that the security panel listens to events from the current target.
    prerenderSecurityModel.dispatchEventToListeners(
        Security.SecurityModel.Events.VisibleSecurityStateChanged, visibleSecurityState);
    assert.isTrue(securityPanel.mainView.contentElement.querySelector('.security-summary')
                      ?.classList.contains('security-summary-secure'));

    // Check that the SecurityPanel listens to any PrimaryPageChanged event
    const sidebarTreeClearSpy = sinon.spy(securityPanel.sidebar, 'clearOrigins');
    navigate(getMainFrame(target));
    sinon.assert.calledOnce(sidebarTreeClearSpy);
  });

  it('shows \'reload page\' message when no data is available', async () => {
    const securityModel = target.model(Security.SecurityModel.SecurityModel);
    assert.exists(securityModel);
    const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});

    // Check that reload message is visible initially.
    const reloadMessage =
        securityPanel.sidebar.sidebarTree.shadowRoot.querySelector('.security-main-view-reload-message');
    assert.instanceOf(reloadMessage, HTMLLIElement);
    assert.isFalse(reloadMessage.classList.contains('hidden'));

    // Check that reload message is hidden when there is data to display.
    const networkManager = securityModel.networkManager();
    const request = {
      wasBlocked: () => false,
      url: () => 'https://www.example.com',
      securityState: () => Protocol.Security.SecurityState.Secure,
      securityDetails: () => null,
      cached: () => false,
    } as SDK.NetworkRequest.NetworkRequest;
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request);
    assert.isTrue(reloadMessage.classList.contains('hidden'));

    // Check that reload message is hidden after clearing data.
    navigate(getMainFrame(target));
    assert.isFalse(reloadMessage.classList.contains('hidden'));
  });

  it('shows origins with blockable and optionally blockable resources in the sidebar', async () => {
    const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});

    const sidebarTreeClearSpy = sinon.spy(securityPanel.sidebar, 'addOrigin');
    const pageVisibleSecurityState = new Security.SecurityModel.PageVisibleSecurityState(
        Protocol.Security.SecurityState.Neutral, null, null, ['displayed-mixed-content', 'ran-mixed-content']);
    const securityModel = target.model(Security.SecurityModel.SecurityModel);
    assert.exists(securityModel);
    securityModel.dispatchEventToListeners(
        Security.SecurityModel.Events.VisibleSecurityStateChanged, pageVisibleSecurityState);

    const passive = SDK.NetworkRequest.NetworkRequest.create(
        '0' as Protocol.Network.RequestId, urlString`http://foo.test`, urlString`https://foo.test`,
        '0' as Protocol.Page.FrameId, '0' as Protocol.Network.LoaderId, null);
    passive.mixedContentType = Protocol.Security.MixedContentType.OptionallyBlockable;
    const networkManager = securityModel.networkManager();
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, passive);

    assert.isTrue(
        sidebarTreeClearSpy.calledOnceWith(urlString`http://foo.test`, Protocol.Security.SecurityState.Insecure));
    sidebarTreeClearSpy.resetHistory();

    const active = SDK.NetworkRequest.NetworkRequest.create(
        '0' as Protocol.Network.RequestId, urlString`http://bar.test`, urlString`https://bar.test`,
        '0' as Protocol.Page.FrameId, '0' as Protocol.Network.LoaderId, null);
    active.mixedContentType = Protocol.Security.MixedContentType.Blockable;
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, active);

    assert.isTrue(
        sidebarTreeClearSpy.calledOnceWith(urlString`http://bar.test`, Protocol.Security.SecurityState.Insecure));
  });

  it('hides and shows the sidebar origin list when an interstitial is shown or hidden', async () => {
    const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});

    const toggleSidebarSpy = sinon.spy(securityPanel.sidebar, 'toggleOriginsList');
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.exists(resourceTreeModel);
    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);
    const request1 = SDK.NetworkRequest.NetworkRequest.create(
        '0' as Protocol.Network.RequestId, urlString`https://foo.test/`, urlString`https://foo.test`,
        '0' as Protocol.Page.FrameId, '0' as Protocol.Network.LoaderId, null);
    request1.setSecurityState(Protocol.Security.SecurityState.Secure);
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request1);

    const request2 = SDK.NetworkRequest.NetworkRequest.create(
        '0' as Protocol.Network.RequestId, urlString`https://bar.test/foo.jpg`, urlString`https://bar.test`,
        '0' as Protocol.Page.FrameId, '0' as Protocol.Network.LoaderId, null);
    request2.setSecurityState(Protocol.Security.SecurityState.Secure);
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request2);

    resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.InterstitialShown);
    // Simulate a request finishing after the interstitial is shown, to make sure that doesn't show up in the sidebar.
    const request3 = SDK.NetworkRequest.NetworkRequest.create(
        '0' as Protocol.Network.RequestId, urlString`https://bar.test/foo.jpg`, urlString`https://bar.test`,
        '0' as Protocol.Page.FrameId, '0' as Protocol.Network.LoaderId, null);
    request3.setSecurityState(Protocol.Security.SecurityState.Unknown);
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request3);
    assert.isTrue(toggleSidebarSpy.calledOnceWith(true));
    toggleSidebarSpy.resetHistory();

    // Test that the sidebar is shown again when the interstitial is hidden. https://crbug.com/559150
    resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.InterstitialHidden);

    assert.isTrue(toggleSidebarSpy.calledOnceWith(false));
  });
});
