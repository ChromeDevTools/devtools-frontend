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
  it('initializes with default sections, overview element, and origin groups', async () => {
    const sidebar = new Security.SecurityPanelSidebar.SecurityPanelSidebar();
    renderElementIntoDOM(sidebar);
    await doubleRaf();

    const overview = sidebar.contentElement.querySelector('devtools-tree')!.shadowRoot!.querySelector(
        '.security-main-view-sidebar-tree-item');
    assert.exists(overview);
    assert.isTrue(overview.textContent?.includes('Overview'));

    const originGroups = sidebar.contentElement.querySelector('devtools-tree')!.shadowRoot!.querySelectorAll(
        '.security-sidebar-origins');
    assert.lengthOf(originGroups, 4);

    const groupTitles =
        Array.from(originGroups).map(g => g.querySelector('.security-sidebar-origins-title')?.textContent?.trim());
    assert.include(groupTitles, 'Main origin');
    assert.include(groupTitles, 'Non-secure origins');
    assert.include(groupTitles, 'Secure origins');
    assert.include(groupTitles, 'Unknown / canceled');
  });

  it('adds and updates origins across category groups', async () => {
    const sidebar = new Security.SecurityPanelSidebar.SecurityPanelSidebar();
    renderElementIntoDOM(sidebar);

    const secureOrigin = urlString`https://secure.example.com`;
    const insecureOrigin = urlString`http://insecure.example.com`;
    const unknownOrigin = urlString`https://unknown.example.com`;

    sidebar.addOrigin(secureOrigin, Protocol.Security.SecurityState.Secure);
    sidebar.addOrigin(insecureOrigin, Protocol.Security.SecurityState.Insecure);
    sidebar.addOrigin(unknownOrigin, Protocol.Security.SecurityState.Unknown);
    await doubleRaf();

    const originItems = sidebar.contentElement.querySelector('devtools-tree')!.shadowRoot!.querySelectorAll(
        '.security-sidebar-tree-item');
    assert.lengthOf(originItems, 3);

    // Update insecure origin to secure
    sidebar.updateOrigin(insecureOrigin, Protocol.Security.SecurityState.Secure);
    await doubleRaf();

    assert.lengthOf(sidebar.contentElement.querySelector('devtools-tree')!.shadowRoot!.querySelectorAll(
                        '.security-sidebar-tree-item'),
                    3);
  });

  it('handles main origin assignment and updates', async () => {
    const sidebar = new Security.SecurityPanelSidebar.SecurityPanelSidebar();
    renderElementIntoDOM(sidebar);

    const mainOrigin = urlString`https://main.example.com`;
    sidebar.setMainOrigin(mainOrigin);
    assert.strictEqual(sidebar.mainOrigin, mainOrigin);

    sidebar.addOrigin(mainOrigin, Protocol.Security.SecurityState.Secure);
    await doubleRaf();

    const items = sidebar.contentElement.querySelector('devtools-tree')!.shadowRoot!.querySelectorAll(
        '.security-sidebar-tree-item');
    const originElement = Array.from(items).find(item => item.textContent?.includes(mainOrigin));
    assert.exists(originElement);
  });

  it('clears origins correctly and restores reload message', async () => {
    const sidebar = new Security.SecurityPanelSidebar.SecurityPanelSidebar();
    renderElementIntoDOM(sidebar);

    const origin = urlString`https://secure.example.com`;
    sidebar.addOrigin(origin, Protocol.Security.SecurityState.Secure);
    await doubleRaf();
    assert.lengthOf(sidebar.contentElement.querySelector('devtools-tree')!.shadowRoot!.querySelectorAll(
                        '.security-sidebar-tree-item'),
                    1);

    sidebar.clearOrigins();
    await doubleRaf();
    assert.lengthOf(sidebar.contentElement.querySelector('devtools-tree')!.shadowRoot!.querySelectorAll(
                        '.security-sidebar-tree-item'),
                    0);

    const reloadMsg = sidebar.contentElement.querySelector('devtools-tree')!.shadowRoot!.querySelector(
        '.security-main-view-reload-message');
    assert.exists(reloadMsg);
  });

  it('toggles visibility of origin groups', async () => {
    const sidebar = new Security.SecurityPanelSidebar.SecurityPanelSidebar();
    renderElementIntoDOM(sidebar);

    const origin = urlString`https://secure.example.com`;
    sidebar.addOrigin(origin, Protocol.Security.SecurityState.Secure);
    await doubleRaf();

    sidebar.toggleOriginsList(true);
    await doubleRaf();
    let groups = sidebar.contentElement.querySelector('devtools-tree')!.shadowRoot!.querySelectorAll(
        '.security-sidebar-origins');
    for (const group of groups) {
      assert.isTrue(group.classList.contains('hidden'));
    }

    sidebar.toggleOriginsList(false);
    await doubleRaf();
    groups = sidebar.contentElement.querySelector('devtools-tree')!.shadowRoot!.querySelectorAll(
        '.security-sidebar-origins');
    for (const group of groups) {
      assert.isFalse(group.classList.contains('hidden'));
    }
  });

  it('triggers onShowOrigin callback when an origin element is clicked', async () => {
    const sidebar = new Security.SecurityPanelSidebar.SecurityPanelSidebar();
    renderElementIntoDOM(sidebar);
    await doubleRaf();

    const origin = urlString`https://secure.example.com`;
    sidebar.addOrigin(origin, Protocol.Security.SecurityState.Secure);
    await doubleRaf();

    const callback = sinon.stub();
    sidebar.onShowOrigin = callback;

    const items = sidebar.contentElement.querySelector('devtools-tree')!.shadowRoot!.querySelectorAll(
        '.security-sidebar-tree-item');
    const originItem = Array.from(items).find(item => item.textContent?.includes(origin)) as HTMLElement;
    assert.exists(originItem);
    originItem.click();

    sinon.assert.calledOnce(callback);
    assert.strictEqual(callback.firstCall.args[0], origin);
  });

  it('updates selection and triggers onShowOrigin when selectedOrigin is set', async () => {
    const sidebar = new Security.SecurityPanelSidebar.SecurityPanelSidebar();
    renderElementIntoDOM(sidebar);

    const origin = urlString`https://example.com`;
    sidebar.addOrigin(origin, Protocol.Security.SecurityState.Secure);
    await doubleRaf();

    const callback = sinon.spy();
    sidebar.onShowOrigin = callback;

    sidebar.selectedOrigin = origin;
    assert.strictEqual(sidebar.selectedOrigin, origin);

    sinon.assert.calledOnce(callback);
    assert.strictEqual(callback.firstCall.args[0], origin);
  });

  it('dumps origins as expected by security_test_runner', async () => {
    const sidebar = new Security.SecurityPanelSidebar.SecurityPanelSidebar();
    renderElementIntoDOM(sidebar);

    const mainOrigin = urlString`https://devtools.test`;
    const unknownOrigin = urlString`https://foo.test`;

    sidebar.setMainOrigin(mainOrigin);
    sidebar.addOrigin(unknownOrigin, Protocol.Security.SecurityState.Unknown);
    await doubleRaf();

    const tree = sidebar.contentElement.querySelector('devtools-tree');
    assert.exists(tree);

    const results: string[] = [];
    const root = (tree as unknown as {templateRoot: DocumentFragment}).templateRoot || tree.shadowRoot || tree;
    const groups = root.querySelectorAll('.security-sidebar-origins');
    for (const group of groups) {
      if (group.hasAttribute('hidden') || group.classList.contains('hidden')) {
        continue;
      }
      const titleElement =
          group.querySelector('.security-sidebar-origins-title') || group.querySelector('.tree-element-title');
      const title = titleElement ? titleElement.textContent?.trim() : group.textContent?.trim();
      results.push('Group: ' + title);
      const originContainer = group.querySelector('ul[role="group"]') || group.nextElementSibling;
      if (!originContainer) {
        continue;
      }
      const originItems = originContainer.querySelectorAll('.security-sidebar-tree-item');
      for (const originItem of originItems) {
        const spans = originItem.getElementsByTagName('span');
        for (const span of spans) {
          if (!span.classList.contains('tree-element-title')) {
            results.push(span.textContent || '');
          }
        }
      }
    }

    assert.deepEqual(results, [
      'Group: Main origin',
      'Group: Unknown / canceled',
      'https://foo.test',
      'https',
      '://',
      'foo.test',
    ]);
  });

  describe('visual screenshots', () => {
    it('renders initial sidebar state', async () => {
      const sidebar = new Security.SecurityPanelSidebar.SecurityPanelSidebar();
      renderElementIntoDOM(sidebar, {includeCommonStyles: true});
      await doubleRaf();
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

      await doubleRaf();
      await assertScreenshot('security/security_sidebar_populated.png');
    });
  });

  describe('DEFAULT_VIEW', () => {
    function renderView(input: Partial<Security.SecurityPanelSidebar.ViewInput> = {},
                        output: Security.SecurityPanelSidebar.ViewOutput = {
                          onElementSelected: sinon.stub(),
                          onShowOrigin: sinon.stub(),
                        }): {container: HTMLElement, output: Security.SecurityPanelSidebar.ViewOutput} {
      const container = document.createElement('div');
      renderElementIntoDOM(container);
      const fullInput: Security.SecurityPanelSidebar.ViewInput = {
        mainOrigin: null,
        origins: new Map(),
        originsHidden: false,
        showOriginsUnconditionally: false,
        overviewSecurityState: Protocol.Security.SecurityState.Unknown,
        selectedElementId: 'overview',
        ...input,
      };
      Security.SecurityPanelSidebar.DEFAULT_VIEW(fullInput, output, container);
      return {container, output};
    }

    it('renders overview element and origin groups with defaults', async () => {
      const {container} = renderView();
      await doubleRaf();

      const tree = container.querySelector('devtools-tree');
      assert.exists(tree);
      const shadow = tree.shadowRoot;
      assert.exists(shadow);

      const overview = shadow.querySelector('.security-main-view-sidebar-tree-item');
      assert.exists(overview);
      assert.isTrue(overview.textContent?.includes('Overview'));

      const groups = shadow.querySelectorAll('.security-sidebar-origins');
      assert.lengthOf(groups, 4);

      const groupTitles =
          Array.from(groups).map(g => g.querySelector('.security-sidebar-origins-title')?.textContent?.trim());
      assert.include(groupTitles, 'Main origin');
      assert.include(groupTitles, 'Non-secure origins');
      assert.include(groupTitles, 'Secure origins');
      assert.include(groupTitles, 'Unknown / canceled');
    });

    it('renders reload message when main origin group is empty', async () => {
      const {container} = renderView({origins: new Map()});
      await doubleRaf();

      const reloadMsg =
          container.querySelector('devtools-tree')!.shadowRoot!.querySelector('.security-main-view-reload-message');
      assert.exists(reloadMsg);
      assert.strictEqual(reloadMsg.textContent?.trim(), 'Reload to view details');
    });

    it('does not render reload message when origins are present', async () => {
      const mainOrigin = urlString`https://main.example.com`;
      const origins = new Map([[mainOrigin, Protocol.Security.SecurityState.Secure]]);
      const {container} = renderView({mainOrigin, origins});
      await doubleRaf();

      const reloadMsg =
          container.querySelector('devtools-tree')!.shadowRoot!.querySelector('.security-main-view-reload-message');
      assert.notExists(reloadMsg);
    });

    it('renders categorized origins with correct security icons and highlighted URLs', async () => {
      const mainOrigin = urlString`https://main.example.com`;
      const secureOrigin = urlString`https://secure.example.com`;
      const insecureOrigin = urlString`http://insecure.example.com`;
      const unknownOrigin = urlString`https://unknown.example.com`;

      const origins = new Map([
        [mainOrigin, Protocol.Security.SecurityState.Secure],
        [secureOrigin, Protocol.Security.SecurityState.Secure],
        [insecureOrigin, Protocol.Security.SecurityState.Insecure],
        [unknownOrigin, Protocol.Security.SecurityState.Unknown],
      ]);

      const {container} = renderView({mainOrigin, origins});
      await doubleRaf();

      const shadow = container.querySelector('devtools-tree')!.shadowRoot!;
      const originItems = shadow.querySelectorAll('.security-sidebar-tree-item');
      assert.lengthOf(originItems, 4);

      const secureIcon = shadow.querySelector('.security-property-secure');
      assert.exists(secureIcon);

      const insecureIcon = shadow.querySelector('.security-property-insecure');
      assert.exists(insecureIcon);

      const unknownIcon = shadow.querySelector('.security-property-unknown');
      assert.exists(unknownIcon);

      const highlightedUrls = shadow.querySelectorAll('.highlighted-url');
      assert.lengthOf(highlightedUrls, 4);
    });

    it('hides origin groups when originsHidden is true', async () => {
      const {container} = renderView({originsHidden: true});
      await doubleRaf();

      const groups =
          container.querySelector('devtools-tree')!.shadowRoot!.querySelectorAll('.security-sidebar-origins');
      for (const group of groups) {
        assert.isTrue(group.hasAttribute('hidden') || group.classList.contains('hidden'));
      }
    });

    it('invokes callbacks when overview and origins are clicked', async () => {
      const mainOrigin = urlString`https://main.example.com`;
      const origins = new Map([[mainOrigin, Protocol.Security.SecurityState.Secure]]);
      const onElementSelected = sinon.stub();
      const onShowOrigin = sinon.stub();

      const {container} = renderView({mainOrigin, origins}, {onElementSelected, onShowOrigin});
      await doubleRaf();

      const shadow = container.querySelector('devtools-tree')!.shadowRoot!;

      // Click overview
      const overview = shadow.querySelector('.security-main-view-sidebar-tree-item') as HTMLElement;
      assert.exists(overview);
      overview.click();

      sinon.assert.calledWith(onElementSelected, 'overview');
      sinon.assert.calledWith(onShowOrigin, null);

      // Click origin item
      const originItem = shadow.querySelector('.security-sidebar-tree-item') as HTMLElement;
      assert.exists(originItem);
      originItem.click();

      sinon.assert.calledWith(onElementSelected, mainOrigin);
      sinon.assert.calledWith(onShowOrigin, mainOrigin);
    });
  });
});
