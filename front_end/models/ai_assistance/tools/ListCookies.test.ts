// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import {
  assertIsError,
  assertIsResult,
} from '../../../testing/AiAssistanceHelpers.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';
import {TestUniverse} from '../../../testing/TestUniverse.js';
import * as AiAssistance from '../ai_assistance.js';

const {urlString} = Platform.DevToolsPath;

describe('ListCookiesTool', () => {
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

  function createMockContext(options?: {origin?: string}) {
    const origin = options && 'origin' in options ? options.origin : 'https://example.com';
    return {
      conversationContext: null,
      getEstablishedOrigin: sinon.stub().returns(origin),
      disableLogging: sinon.stub(),
    };
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

  it('lists cookie names successfully for allowed origin', async () => {
    const {cookieModel} = setupPrimaryTarget('https://example.com');

    const cookieA = new SDK.Cookie.Cookie('cookieA', 'valueA');
    cookieA.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'example.com');
    const cookieB = new SDK.Cookie.Cookie('cookieB', 'valueB');
    cookieB.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'example.com');
    activeCookies = [cookieA, cookieB];

    const context = createMockContext();
    const tool = new AiAssistance.ListCookies.ListCookiesTool();
    const response = await tool.handler({origins: ['https://example.com']}, context);

    sinon.assert.calledOnce(context.disableLogging);
    sinon.assert.calledWith(cookieModel.getCookiesForDomain as sinon.SinonStub, 'https://example.com', true);
    assertIsResult(response);
    assert.deepEqual(response.result.cookieNamesByOrigin, {
      'https://example.com': {
        cookies: ['cookieA', 'cookieB'],
      },
    });
  });

  it('filters out HttpOnly cookies', async () => {
    setupPrimaryTarget('https://example.com');

    const normalCookie = new SDK.Cookie.Cookie('public-cookie', 'public-val');
    normalCookie.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'example.com');
    const httpOnlyCookie = new SDK.Cookie.Cookie('secret-cookie', 'secret-val');
    httpOnlyCookie.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'example.com');
    httpOnlyCookie.addAttribute(SDK.Cookie.Attribute.HTTP_ONLY);
    activeCookies = [normalCookie, httpOnlyCookie];

    const context = createMockContext();
    const tool = new AiAssistance.ListCookies.ListCookiesTool();
    const response = await tool.handler({origins: ['https://example.com']}, context);

    assertIsResult(response);
    assert.deepEqual(response.result.cookieNamesByOrigin, {
      'https://example.com': {
        cookies: ['public-cookie'],
      },
    });
  });

  it('filters out third-party blocked cookies not matching security origin', async () => {
    setupPrimaryTarget('https://example.com');

    const validCookie = new SDK.Cookie.Cookie('site-cookie', 'val');
    validCookie.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'example.com');

    const foreignBlockedCookie = new SDK.Cookie.Cookie('tracker-cookie', 'val');
    foreignBlockedCookie.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'third-party.com');
    activeCookies = [validCookie, foreignBlockedCookie];

    const context = createMockContext();
    const tool = new AiAssistance.ListCookies.ListCookiesTool();
    const response = await tool.handler({origins: ['https://example.com']}, context);

    assertIsResult(response);
    assert.deepEqual(response.result.cookieNamesByOrigin, {
      'https://example.com': {
        cookies: ['site-cookie'],
      },
    });
  });

  it('deduplicates identical cookie names', async () => {
    setupPrimaryTarget('https://example.com');

    const cookie1 = new SDK.Cookie.Cookie('session-id', 'val1');
    cookie1.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'example.com');
    const cookie2 = new SDK.Cookie.Cookie('session-id', 'val2');
    cookie2.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'example.com');
    activeCookies = [cookie1, cookie2];

    const context = createMockContext();
    const tool = new AiAssistance.ListCookies.ListCookiesTool();
    const response = await tool.handler({origins: ['https://example.com']}, context);

    assertIsResult(response);
    assert.deepEqual(response.result.cookieNamesByOrigin, {
      'https://example.com': {
        cookies: ['session-id'],
      },
    });
  });

  it('handles frame not found or missing frame error', async () => {
    const primaryTarget = universe.createTarget({url: urlString`https://example.com/`});
    primaryTarget.setInspectedURL(urlString`https://example.com/`);
    sinon.stub(universe.targetManager, 'primaryPageTarget').returns(primaryTarget);
    sinon.stub(SDK.ResourceTreeModel.ResourceTreeModel, 'frames').returns([]);

    const context = createMockContext();
    const tool = new AiAssistance.ListCookies.ListCookiesTool();
    const response = await tool.handler({origins: ['https://example.com']}, context);

    assertIsResult(response);
    assert.deepEqual(response.result.cookieNamesByOrigin, {
      'https://example.com': {
        error: 'Frame not found or origin disallowed',
      },
    });
  });

  it('ignores frames belonging to a different outermost target', async () => {
    const primaryTarget = universe.createTarget({url: urlString`https://example.com/`});
    primaryTarget.setInspectedURL(urlString`https://example.com/`);
    sinon.stub(universe.targetManager, 'primaryPageTarget').returns(primaryTarget);

    const foreignTarget = sinon.createStubInstance(SDK.Target.Target);
    const foreignOutermost = sinon.createStubInstance(SDK.Target.Target);
    foreignTarget.outermostTarget.returns(foreignOutermost);

    const foreignRtm = sinon.createStubInstance(SDK.ResourceTreeModel.ResourceTreeModel);
    foreignRtm.target.returns(foreignTarget);

    const foreignFrame = sinon.createStubInstance(SDK.ResourceTreeModel.ResourceTreeFrame);
    sinon.stub(foreignFrame, 'securityOrigin').get(() => 'https://example.com');
    foreignFrame.resourceTreeModel.returns(foreignRtm);

    sinon.stub(SDK.ResourceTreeModel.ResourceTreeModel, 'frames').returns([foreignFrame]);

    const context = createMockContext();
    const tool = new AiAssistance.ListCookies.ListCookiesTool();
    const response = await tool.handler({origins: ['https://example.com']}, context);

    assertIsResult(response);
    assert.deepEqual(response.result.cookieNamesByOrigin, {
      'https://example.com': {
        error: 'Frame not found or origin disallowed',
      },
    });
  });

  it('blocks disallowed foreign origin requests', async () => {
    setupPrimaryTarget('https://example.com');

    const context = createMockContext();
    const tool = new AiAssistance.ListCookies.ListCookiesTool();
    const response = await tool.handler({origins: ['https://attacker.com']}, context);

    assertIsError(response);
    assert.strictEqual(response.error, 'No valid origins found.');
  });

  it('rejects empty origins array input', async () => {
    setupPrimaryTarget('https://example.com');

    const context = createMockContext();
    const tool = new AiAssistance.ListCookies.ListCookiesTool();
    const response = await tool.handler({origins: []}, context);

    assertIsError(response);
    assert.strictEqual(response.error, 'No valid origins found.');
  });

  it('rejects opaque established origin', async () => {
    setupPrimaryTarget('https://example.com');

    const context = createMockContext({origin: 'data:text/html,test'});
    const tool = new AiAssistance.ListCookies.ListCookiesTool();
    const response = await tool.handler({origins: ['https://example.com']}, context);

    assertIsError(response);
    assert.strictEqual(response.error, 'No origin available or not allowed.');
  });

  it('rejects null established origin', async () => {
    setupPrimaryTarget('https://example.com');

    const context = createMockContext({origin: undefined});
    const tool = new AiAssistance.ListCookies.ListCookiesTool();
    const response = await tool.handler({origins: ['https://example.com']}, context);

    assertIsError(response);
    assert.strictEqual(response.error, 'No origin available or not allowed.');
  });

  it('rejects when primaryPageTarget is null', async () => {
    sinon.stub(universe.targetManager, 'primaryPageTarget').returns(null);

    const context = createMockContext();
    const tool = new AiAssistance.ListCookies.ListCookiesTool();
    const response = await tool.handler({origins: ['https://example.com']}, context);

    assertIsError(response);
    assert.strictEqual(response.error, 'No origin available or not allowed.');
  });

  it('rejects when inspectedURL origin does not match allowedOrigin', async () => {
    const primaryTarget = universe.createTarget({url: urlString`https://different-site.com/`});
    primaryTarget.setInspectedURL(urlString`https://different-site.com/`);
    sinon.stub(universe.targetManager, 'primaryPageTarget').returns(primaryTarget);

    const context = createMockContext();
    const tool = new AiAssistance.ListCookies.ListCookiesTool();
    const response = await tool.handler({origins: ['https://example.com']}, context);

    assertIsError(response);
    assert.strictEqual(response.error, 'No origin available or not allowed.');
  });

  it('handles missing cookie model gracefully', async () => {
    const {primaryTarget} = setupPrimaryTarget('https://example.com');
    sinon.stub(primaryTarget, 'model').withArgs(SDK.CookieModel.CookieModel).returns(null);

    const context = createMockContext();
    const tool = new AiAssistance.ListCookies.ListCookiesTool();
    const response = await tool.handler({origins: ['https://example.com']}, context);

    assertIsResult(response);
    assert.deepEqual(response.result.cookieNamesByOrigin, {
      'https://example.com': {
        cookies: [],
      },
    });
  });

  it('handles CDP promise rejection gracefully', async () => {
    const {cookieModel} = setupPrimaryTarget('https://example.com');
    (cookieModel.getCookiesForDomain as sinon.SinonStub).rejects(new Error('Target disconnected'));

    const context = createMockContext();
    const tool = new AiAssistance.ListCookies.ListCookiesTool();
    const response = await tool.handler({origins: ['https://example.com']}, context);

    assertIsResult(response);
    assert.deepEqual(response.result.cookieNamesByOrigin, {
      'https://example.com': {
        cookies: [],
      },
    });
  });

  it('formats displayInfoFromArgs correctly', () => {
    const tool = new AiAssistance.ListCookies.ListCookiesTool();
    const displayInfo = tool.displayInfoFromArgs({origins: ['https://example.com']});

    assert.strictEqual(displayInfo.title, 'Reading cookies');
    assert.strictEqual(displayInfo.action, 'listCookies(["https://example.com"])');
  });
});
