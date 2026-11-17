// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {it} from 'mocha';
import sinon from 'sinon';

import {assertScreenshot, dispatchKeyDownEvent, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Profiler from './profiler.js';
import profilesSidebarTreeStyles from './profilesSidebarTree.css.js';

describeWithEnvironment('ProfileSidebarTreeElement', () => {
  function createDataDisplayDelegate() {
    return {
      showProfile: sinon.stub().returns(null),
      showObject: sinon.stub(),
      linkifyObject: sinon.stub().resolves(null),
    };
  }

  function setUp(title = 'Profile 1') {
    const profileType = new Profiler.ProfileHeader.ProfileType('test-profile-type', 'Test profile type');
    const profile = new Profiler.ProfileHeader.ProfileHeader(profileType, title);
    const dataDisplayDelegate = createDataDisplayDelegate();
    const treeElement = new Profiler.ProfileSidebarTreeElement.ProfileSidebarTreeElement(
        dataDisplayDelegate, profile, 'heap-snapshot-sidebar-tree-item');
    const treeOutline = new UI.TreeOutline.TreeOutlineInShadow();
    treeOutline.registerRequiredCSS(profilesSidebarTreeStyles);
    renderElementIntoDOM(treeOutline.element, {includeCommonStyles: true});
    treeOutline.appendChild(treeElement);
    const listItem = treeElement.listItemElement;
    const query = (selector: string): HTMLElement => {
      const element = listItem.querySelector<HTMLElement>(selector);
      assert.exists(element, `Missing element ${selector}`);
      return element;
    };
    return {profileType, profile, dataDisplayDelegate, treeElement, treeOutline, listItem, query};
  }

  it('renders the icon, title and menu button', () => {
    const {listItem, query} = setUp();

    assert.isTrue(listItem.classList.contains('heap-snapshot-sidebar-tree-item'));
    assert.isFalse(listItem.classList.contains('small'));
    assert.isFalse(listItem.classList.contains('wait'));
    assert.isFalse(query('.icon').classList.contains('spinner'));
    assert.isTrue(query('.titles').classList.contains('no-subtitle'));
    assert.strictEqual(query('.titles > .title-container > .title').textContent, 'Profile 1');
    assert.strictEqual(query('.titles > .subtitle').textContent, '');
    assert.strictEqual(query('devtools-button').title, 'Profile options');
    assert.strictEqual(listItem.getAttribute('aria-description'), 'Test profile type');
  });

  it('updates subtitle and spinner on status updates', () => {
    const {profile, listItem, query} = setUp();

    profile.updateStatus('Loading\u2026', true);
    assert.strictEqual(query('.subtitle').textContent, '(Loading\u2026)');
    assert.isFalse(query('.titles').classList.contains('no-subtitle'));
    assert.isTrue(query('.icon').classList.contains('spinner'));
    assert.isTrue(listItem.classList.contains('wait'));
    assert.strictEqual(listItem.getAttribute('aria-label'), 'Profile 1, Loading\u2026');

    profile.updateStatus(null, false);
    assert.strictEqual(query('.subtitle').textContent, '(Loading\u2026)', 'null subtitle keeps the old subtitle');
    assert.isFalse(query('.icon').classList.contains('spinner'));
    assert.isFalse(listItem.classList.contains('wait'));

    profile.updateStatus('');
    assert.strictEqual(query('.subtitle').textContent, '');
    assert.isTrue(query('.titles').classList.contains('no-subtitle'));
  });

  it('supports small items with a different main title', () => {
    const {profile, treeElement, listItem, query} = setUp();

    treeElement.setSmall(true);
    treeElement.setMainTitle('Run 2');
    assert.isTrue(listItem.classList.contains('small'));
    assert.strictEqual(query('.title').textContent, 'Run 2');

    profile.updateStatus('10 MB');
    assert.strictEqual(query('.title').textContent, 'Run 2', 'status updates keep the main title');

    treeElement.setSmall(false);
    treeElement.setMainTitle(profile.title);
    assert.isFalse(listItem.classList.contains('small'));
    assert.strictEqual(query('.title').textContent, 'Profile 1');
  });

  it('renames the profile on double click', () => {
    const {profile, query} = setUp();
    const title = query('.title');

    title.dispatchEvent(new MouseEvent('dblclick', {bubbles: true}));
    assert.isTrue(title.classList.contains('editing'));

    title.textContent = 'Renamed';
    dispatchKeyDownEvent(title, {key: 'Enter'});
    assert.isFalse(title.classList.contains('editing'));
    assert.strictEqual(profile.title, 'Renamed');

    profile.updateStatus('10 MB');
    assert.strictEqual(query('.title').textContent, 'Renamed', 'status updates keep the new title');
  });

  it('preserves an in-progress rename across updates', () => {
    const {profile, treeElement, query} = setUp();
    const title = query('.title');

    title.dispatchEvent(new MouseEvent('dblclick', {bubbles: true}));
    title.textContent = 'Draft';
    profile.updateStatus('Loading\u2026', true);

    assert.isTrue(title.classList.contains('editing'));
    assert.strictEqual(title.textContent, 'Draft');
    assert.strictEqual(query('.subtitle').textContent, '(Loading\u2026)');

    treeElement.setMainTitle('Run 2');
    assert.strictEqual(title.textContent, 'Draft');

    dispatchKeyDownEvent(title, {key: 'Escape'});
    assert.isFalse(title.classList.contains('editing'));
    assert.strictEqual(title.textContent, 'Run 2');
  });

  it('keeps the old title when the new title is empty', () => {
    const {profile, query} = setUp();
    const title = query('.title');

    title.dispatchEvent(new MouseEvent('dblclick', {bubbles: true}));
    title.textContent = '  ';
    dispatchKeyDownEvent(title, {key: 'Enter'});
    assert.isFalse(title.classList.contains('editing'));
    assert.strictEqual(title.textContent, 'Profile 1');
    assert.strictEqual(profile.title, 'Profile 1');
  });

  it('shows the profile on select', () => {
    const {profile, dataDisplayDelegate, treeElement} = setUp();

    treeElement.select();
    sinon.assert.calledOnceWithExactly(dataDisplayDelegate.showProfile, profile);
  });

  it('removes the profile on delete', () => {
    const {profile, profileType, treeElement} = setUp();
    const removeProfile = sinon.stub(profileType, 'removeProfile');

    assert.isTrue(treeElement.ondelete());
    sinon.assert.calledOnceWithExactly(removeProfile, profile);
  });

  it('shows the context menu from the menu button', () => {
    const {query} = setUp();
    const show = sinon.stub(UI.ContextMenu.ContextMenu.prototype, 'show').resolves();

    query('devtools-button').click();
    sinon.assert.calledOnce(show);
  });

  it('shows the context menu on right click', () => {
    const {listItem} = setUp();
    const show = sinon.stub(UI.ContextMenu.ContextMenu.prototype, 'show').resolves();

    listItem.dispatchEvent(new MouseEvent('contextmenu', {bubbles: true, cancelable: true}));
    sinon.assert.calledOnce(show);
  });

  it('stops listening to status updates after dispose', () => {
    const {profile, treeElement, query} = setUp();

    treeElement.dispose();
    profile.updateStatus('Loading\u2026', true);
    assert.strictEqual(query('.subtitle').textContent, '');
    assert.isFalse(query('.icon').classList.contains('spinner'));
  });

  it('renders normal and small items', async () => {
    const {profile, treeElement, treeOutline} = setUp('Snapshot 1');
    profile.updateStatus('12.3 MB');
    treeElement.select();

    const profileType = profile.profileType();
    const small = new Profiler.ProfileSidebarTreeElement.ProfileSidebarTreeElement(
        createDataDisplayDelegate(), new Profiler.ProfileHeader.ProfileHeader(profileType, 'Snapshot 2'),
        'heap-snapshot-sidebar-tree-item');
    treeOutline.appendChild(small);
    small.setSmall(true);
    small.setMainTitle('Run 2');

    treeOutline.appendChild(new Profiler.ProfileSidebarTreeElement.ProfileSidebarTreeElement(
        createDataDisplayDelegate(), new Profiler.ProfileHeader.ProfileHeader(profileType, 'Profile 3'),
        'profile-sidebar-tree-item'));

    await assertScreenshot('profiler/profile_sidebar_tree_element.png');
  });
});
