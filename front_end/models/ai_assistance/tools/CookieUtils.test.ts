// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';
import {TestUniverse} from '../../../testing/TestUniverse.js';
import * as AiAssistance from '../ai_assistance.js';

const {urlString} = Platform.DevToolsPath;

describe('CookieUtils', () => {
  setupLocaleHooks();

  let universe: TestUniverse;
  let activeCookies: SDK.Cookie.Cookie[] = [];

  beforeEach(() => {
    universe = new TestUniverse();
    activeCookies = [];
    sinon.stub(SDK.TargetManager.TargetManager, 'instance').returns(universe.targetManager);
  });

  function createMockFrame(
      origin: string,
      resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel,
      ): sinon.SinonStubbedInstance<SDK.ResourceTreeModel.ResourceTreeFrame> {
    const mockFrame = sinon.createStubInstance(SDK.ResourceTreeModel.ResourceTreeFrame);
    sinon.stub(mockFrame, 'securityOrigin').get(() => origin);
    mockFrame.resourceTreeModel.returns(resourceTreeModel);
    return mockFrame;
  }

  function setupPrimaryTarget(origin = 'https://example.com'): {
    primaryTarget: SDK.Target.Target,
    cookieModel: SDK.CookieModel.CookieModel,
  } {
    const primaryTarget = universe.createTarget({url: urlString`${origin}/`});
    primaryTarget.setInspectedURL(urlString`${origin}/`);
    sinon.stub(universe.targetManager, 'primaryPageTarget').returns(primaryTarget);

    const resourceTreeModel = primaryTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.exists(resourceTreeModel);
    const mainFrame = createMockFrame(origin, resourceTreeModel);
    sinon.stub(SDK.ResourceTreeModel.ResourceTreeModel, 'frames').returns([mainFrame]);

    const cookieModel = primaryTarget.model(SDK.CookieModel.CookieModel);
    assert.exists(cookieModel);
    sinon.stub(cookieModel, 'getCookiesForDomain').callsFake(async () => activeCookies);

    return {primaryTarget, cookieModel};
  }

  describe('getCookiesForOrigin', () => {
    it('returns cookies for a valid frame and domain', async () => {
      const {primaryTarget} = setupPrimaryTarget('https://example.com');
      const cookie = new SDK.Cookie.Cookie('test-cookie', 'test-value');
      cookie.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'example.com');
      activeCookies = [cookie];

      const result = await AiAssistance.CookieUtils.getCookiesForOrigin(
          'https://example.com',
          universe.targetManager,
          primaryTarget,
      );

      assert.isFalse('error' in result);
      if (!('error' in result)) {
        assert.lengthOf(result.cookies, 1);
        assert.strictEqual(result.cookies[0].name(), 'test-cookie');
        assert.strictEqual(result.cookies[0].value(), 'test-value');
      }
    });

    it('returns error when frame is not found', async () => {
      const {primaryTarget} = setupPrimaryTarget('https://example.com');

      const result = await AiAssistance.CookieUtils.getCookiesForOrigin(
          'https://other.com',
          universe.targetManager,
          primaryTarget,
      );

      assert.isTrue('error' in result);
      if ('error' in result) {
        assert.strictEqual(result.error, 'Frame not found or origin disallowed for https://other.com');
      }
    });

    it('returns error when cookie model is not found', async () => {
      const {primaryTarget} = setupPrimaryTarget('https://example.com');
      sinon.stub(primaryTarget, 'model').withArgs(SDK.CookieModel.CookieModel).returns(null);

      const result = await AiAssistance.CookieUtils.getCookiesForOrigin(
          'https://example.com',
          universe.targetManager,
          primaryTarget,
      );

      assert.isTrue('error' in result);
      if ('error' in result) {
        assert.strictEqual(result.error, 'Cookie model not found for https://example.com');
      }
    });

    it('filters out HttpOnly cookies', async () => {
      const {primaryTarget} = setupPrimaryTarget('https://example.com');
      const normalCookie = new SDK.Cookie.Cookie('normal', 'val');
      normalCookie.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'example.com');
      const httpOnlyCookie = new SDK.Cookie.Cookie('secret', 'val');
      httpOnlyCookie.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'example.com');
      httpOnlyCookie.addAttribute(SDK.Cookie.Attribute.HTTP_ONLY);
      activeCookies = [normalCookie, httpOnlyCookie];

      const result = await AiAssistance.CookieUtils.getCookiesForOrigin(
          'https://example.com',
          universe.targetManager,
          primaryTarget,
      );

      assert.isFalse('error' in result);
      if (!('error' in result)) {
        assert.lengthOf(result.cookies, 1);
        assert.strictEqual(result.cookies[0].name(), 'normal');
      }
    });

    it('filters out mismatched domains', async () => {
      const {primaryTarget} = setupPrimaryTarget('https://example.com');
      const matchingCookie = new SDK.Cookie.Cookie('site', 'val');
      matchingCookie.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'example.com');
      const foreignCookie = new SDK.Cookie.Cookie('tracker', 'val');
      foreignCookie.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'tracker.com');
      activeCookies = [matchingCookie, foreignCookie];

      const result = await AiAssistance.CookieUtils.getCookiesForOrigin(
          'https://example.com',
          universe.targetManager,
          primaryTarget,
      );

      assert.isFalse('error' in result);
      if (!('error' in result)) {
        assert.lengthOf(result.cookies, 1);
        assert.strictEqual(result.cookies[0].name(), 'site');
      }
    });

    it('returns error on CDP failure', async () => {
      const {primaryTarget, cookieModel} = setupPrimaryTarget('https://example.com');
      (cookieModel.getCookiesForDomain as sinon.SinonStub).rejects(new Error('CDP target detached'));

      const result = await AiAssistance.CookieUtils.getCookiesForOrigin(
          'https://example.com',
          universe.targetManager,
          primaryTarget,
      );

      assert.isTrue('error' in result);
      if ('error' in result) {
        assert.strictEqual(result.error, 'Failed to fetch cookies for https://example.com');
      }
    });
  });
});
