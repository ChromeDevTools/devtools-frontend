// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Protocol from '../../../generated/protocol.js';
import {
  assertIsError,
  assertIsResult,
  assertRequiresApproval,
} from '../../../testing/AiAssistanceHelpers.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';
import {TestUniverse} from '../../../testing/TestUniverse.js';
import * as AiAssistance from '../ai_assistance.js';

const {urlString} = Platform.DevToolsPath;

describe('GetCookieValuesTool', () => {
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

  function createMockContext(options?: {origin?: string, disableLoggingStub?: sinon.SinonStub}) {
    const origin = options && 'origin' in options ? options.origin : 'https://example.com';
    return {
      conversationContext: null,
      getEstablishedOrigin: sinon.stub().returns(origin),
      disableLogging: options?.disableLoggingStub ?? sinon.stub(),
    };
  }

  it('requires user approval and returns description with cookie names and origins', async () => {
    setupPrimaryTarget('https://example.com');

    const disableLoggingStub = sinon.stub();
    const context = createMockContext({disableLoggingStub});

    const tool = new AiAssistance.GetCookieValues.GetCookieValuesTool();
    const response = await tool.handler(
        {cookieNames: ['session-cookie'], origins: ['https://example.com']},
        context,
    );

    sinon.assert.calledOnce(disableLoggingStub);
    assertRequiresApproval(response);
    assert.include(response.description, 'session-cookie');
    assert.include(response.description, 'https://example.com');
  });

  it('retrieves cookie values and metadata when approved', async () => {
    setupPrimaryTarget('https://example.com');

    const cookie = SDK.Cookie.Cookie.fromProtocolCookie({
      name: 'session-cookie',
      value: 'session-value',
      domain: 'example.com',
      path: '/app',
      size: 20,
      httpOnly: false,
      secure: true,
      session: false,
      sameSite: Protocol.Network.CookieSameSite.Lax,
      priority: Protocol.Network.CookiePriority.Medium,
      expires: 1700000000,
      sourcePort: 443,
      sourceScheme: Protocol.Network.CookieSourceScheme.Secure,
    });
    activeCookies = [cookie];

    const context = createMockContext();

    const tool = new AiAssistance.GetCookieValues.GetCookieValuesTool();
    const response = await tool.handler(
        {cookieNames: ['session-cookie'], origins: ['https://example.com']},
        context,
        {approved: true},
    );

    assertIsResult(response);
    assert.deepEqual(response.result.cookiesByOrigin, {
      'https://example.com': {
        cookies: [
          {
            name: 'session-cookie',
            value: 'session-value',
            domain: 'example.com',
            path: '/app',
            expires: 1700000000000,
            size: 20,
            secure: true,
            sameSite: Protocol.Network.CookieSameSite.Lax,
            partitioned: false,
            priority: Protocol.Network.CookiePriority.Medium,
            sourcePort: 443,
            sourceScheme: Protocol.Network.CookieSourceScheme.Secure,
          },
        ],
      },
    });
  });

  it('handles duplicate same-name cookies with different metadata', async () => {
    setupPrimaryTarget('https://example.com');

    const cookie1 = new SDK.Cookie.Cookie('session-id', 'val-host');
    cookie1.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'example.com');
    cookie1.addAttribute(SDK.Cookie.Attribute.PATH, '/');

    const cookie2 = new SDK.Cookie.Cookie('session-id', 'val-wildcard');
    cookie2.addAttribute(SDK.Cookie.Attribute.DOMAIN, '.example.com');
    cookie2.addAttribute(SDK.Cookie.Attribute.PATH, '/sub');

    activeCookies = [cookie1, cookie2];

    const context = createMockContext();

    const tool = new AiAssistance.GetCookieValues.GetCookieValuesTool();
    const response = await tool.handler(
        {cookieNames: ['session-id'], origins: ['https://example.com']},
        context,
        {approved: true},
    );

    assertIsResult(response);
    const cookies = response.result.cookiesByOrigin['https://example.com'].cookies;
    assert.exists(cookies);
    assert.lengthOf(cookies, 2);
    assert.strictEqual(cookies[0].value, 'val-host');
    assert.strictEqual(cookies[0].domain, 'example.com');
    assert.strictEqual(cookies[0].path, '/');
    assert.strictEqual(cookies[1].value, 'val-wildcard');
    assert.strictEqual(cookies[1].domain, '.example.com');
    assert.strictEqual(cookies[1].path, '/sub');
  });

  it('strictly filters out HttpOnly cookies', async () => {
    setupPrimaryTarget('https://example.com');

    const publicCookie = new SDK.Cookie.Cookie('public-cookie', 'public-val');
    publicCookie.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'example.com');
    publicCookie.addAttribute(SDK.Cookie.Attribute.PATH, '/');

    const secretCookie = new SDK.Cookie.Cookie('secret-cookie', 'secret-val');
    secretCookie.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'example.com');
    secretCookie.addAttribute(SDK.Cookie.Attribute.PATH, '/');
    secretCookie.addAttribute(SDK.Cookie.Attribute.HTTP_ONLY);

    activeCookies = [publicCookie, secretCookie];

    const context = createMockContext();

    const tool = new AiAssistance.GetCookieValues.GetCookieValuesTool();
    const response = await tool.handler(
        {cookieNames: ['public-cookie', 'secret-cookie'], origins: ['https://example.com']},
        context,
        {approved: true},
    );

    assertIsResult(response);
    const cookies = response.result.cookiesByOrigin['https://example.com'].cookies;
    assert.exists(cookies);
    assert.lengthOf(cookies, 1);
    assert.strictEqual(cookies[0].name, 'public-cookie');
    assert.strictEqual(cookies[0].value, 'public-val');
  });

  it('truncates large values exceeding 10000 characters', async () => {
    setupPrimaryTarget('https://example.com');

    const longValue = 'x'.repeat(10050);
    const cookie = new SDK.Cookie.Cookie('huge-cookie', longValue);
    cookie.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'example.com');
    cookie.addAttribute(SDK.Cookie.Attribute.PATH, '/');
    activeCookies = [cookie];

    const context = createMockContext();

    const tool = new AiAssistance.GetCookieValues.GetCookieValuesTool();
    const response = await tool.handler(
        {cookieNames: ['huge-cookie'], origins: ['https://example.com']},
        context,
        {approved: true},
    );

    assertIsResult(response);
    const cookies = response.result.cookiesByOrigin['https://example.com'].cookies;
    assert.exists(cookies);
    assert.lengthOf(cookies, 1);
    assert.strictEqual(cookies[0].value, 'x'.repeat(10000) + '... <truncated>');
  });

  it('filters out third-party blocked cookies not matching security origin', async () => {
    setupPrimaryTarget('https://example.com');

    const validCookie = new SDK.Cookie.Cookie('site-cookie', 'val');
    validCookie.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'example.com');

    const trackerCookie = new SDK.Cookie.Cookie('tracker-cookie', 'val');
    trackerCookie.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'third-party.com');
    activeCookies = [validCookie, trackerCookie];

    const context = createMockContext();

    const tool = new AiAssistance.GetCookieValues.GetCookieValuesTool();
    const response = await tool.handler(
        {cookieNames: ['site-cookie', 'tracker-cookie'], origins: ['https://example.com']},
        context,
        {approved: true},
    );

    assertIsResult(response);
    const cookies = response.result.cookiesByOrigin['https://example.com'].cookies;
    assert.exists(cookies);
    assert.lengthOf(cookies, 1);
    assert.strictEqual(cookies[0].name, 'site-cookie');
  });

  it('handles frame not found or missing frame error', async () => {
    const primaryTarget = universe.createTarget({url: urlString`https://example.com/`});
    primaryTarget.setInspectedURL(urlString`https://example.com/`);
    sinon.stub(universe.targetManager, 'primaryPageTarget').returns(primaryTarget);
    sinon.stub(SDK.ResourceTreeModel.ResourceTreeModel, 'frames').returns([]);

    const context = createMockContext();

    const tool = new AiAssistance.GetCookieValues.GetCookieValuesTool();
    const response = await tool.handler(
        {cookieNames: ['session-cookie'], origins: ['https://example.com']},
        context,
        {approved: true},
    );

    assertIsResult(response);
    assert.deepEqual(response.result.cookiesByOrigin, {
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

    const tool = new AiAssistance.GetCookieValues.GetCookieValuesTool();
    const response = await tool.handler(
        {cookieNames: ['session-cookie'], origins: ['https://example.com']},
        context,
        {approved: true},
    );

    assertIsResult(response);
    assert.deepEqual(response.result.cookiesByOrigin, {
      'https://example.com': {
        error: 'Frame not found or origin disallowed',
      },
    });
  });

  it('blocks disallowed foreign origin requests', async () => {
    setupPrimaryTarget('https://example.com');

    const context = createMockContext();

    const tool = new AiAssistance.GetCookieValues.GetCookieValuesTool();
    const response = await tool.handler(
        {cookieNames: ['cookie1'], origins: ['https://attacker.com']},
        context,
        {approved: true},
    );

    assertIsError(response);
    assert.strictEqual(response.error, 'No valid origins found.');
  });

  it('defaults to allowed origin when origins is omitted or empty', async () => {
    setupPrimaryTarget('https://example.com');

    const cookie = new SDK.Cookie.Cookie('cookie1', 'val1');
    cookie.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'example.com');
    cookie.addAttribute(SDK.Cookie.Attribute.PATH, '/');
    activeCookies = [cookie];

    const context = createMockContext();

    const tool = new AiAssistance.GetCookieValues.GetCookieValuesTool();
    const response = await tool.handler(
        {cookieNames: ['cookie1'], origins: []},
        context,
        {approved: true},
    );

    assertIsResult(response);
    const cookies = response.result.cookiesByOrigin['https://example.com'].cookies;
    assert.exists(cookies);
    assert.lengthOf(cookies, 1);
    assert.strictEqual(cookies[0].name, 'cookie1');
    assert.strictEqual(cookies[0].value, 'val1');
    assert.strictEqual(cookies[0].domain, 'example.com');
    assert.strictEqual(cookies[0].path, '/');
  });

  it('rejects empty cookieNames array input', async () => {
    setupPrimaryTarget('https://example.com');

    const context = createMockContext();

    const tool = new AiAssistance.GetCookieValues.GetCookieValuesTool();
    const response = await tool.handler(
        {cookieNames: [], origins: ['https://example.com']},
        context,
        {approved: true},
    );

    assertIsError(response);
    assert.strictEqual(response.error, 'No cookie names provided.');
  });

  it('rejects opaque established origin', async () => {
    setupPrimaryTarget('https://example.com');

    const context = createMockContext({origin: 'data:text/html,test'});

    const tool = new AiAssistance.GetCookieValues.GetCookieValuesTool();
    const response = await tool.handler(
        {cookieNames: ['cookie1'], origins: ['https://example.com']},
        context,
        {approved: true},
    );

    assertIsError(response);
    assert.strictEqual(response.error, 'No origin available or not allowed.');
  });

  it('rejects null established origin', async () => {
    setupPrimaryTarget('https://example.com');

    const context = createMockContext({origin: undefined});

    const tool = new AiAssistance.GetCookieValues.GetCookieValuesTool();
    const response = await tool.handler(
        {cookieNames: ['cookie1'], origins: ['https://example.com']},
        context,
        {approved: true},
    );

    assertIsError(response);
    assert.strictEqual(response.error, 'No origin available or not allowed.');
  });

  it('rejects when primaryPageTarget is null', async () => {
    sinon.stub(universe.targetManager, 'primaryPageTarget').returns(null);

    const context = createMockContext();

    const tool = new AiAssistance.GetCookieValues.GetCookieValuesTool();
    const response = await tool.handler(
        {cookieNames: ['cookie1'], origins: ['https://example.com']},
        context,
        {approved: true},
    );

    assertIsError(response);
    assert.strictEqual(response.error, 'Primary page target not found.');
  });

  it('rejects when inspectedURL origin does not match allowedOrigin', async () => {
    const primaryTarget = universe.createTarget({url: urlString`https://different-site.com/`});
    primaryTarget.setInspectedURL(urlString`https://different-site.com/`);
    sinon.stub(universe.targetManager, 'primaryPageTarget').returns(primaryTarget);

    const context = createMockContext();

    const tool = new AiAssistance.GetCookieValues.GetCookieValuesTool();
    const response = await tool.handler(
        {cookieNames: ['cookie1'], origins: ['https://example.com']},
        context,
        {approved: true},
    );

    assertIsError(response);
    assert.strictEqual(response.error, 'Page origin does not match allowed origin.');
  });

  it('handles missing cookie model gracefully', async () => {
    const {primaryTarget} = setupPrimaryTarget('https://example.com');
    sinon.stub(primaryTarget, 'model').withArgs(SDK.CookieModel.CookieModel).returns(null);

    const context = createMockContext();

    const tool = new AiAssistance.GetCookieValues.GetCookieValuesTool();
    const response = await tool.handler(
        {cookieNames: ['cookie1'], origins: ['https://example.com']},
        context,
        {approved: true},
    );

    assertIsResult(response);
    assert.deepEqual(response.result.cookiesByOrigin, {
      'https://example.com': {
        cookies: [],
      },
    });
  });

  it('handles CDP promise rejection gracefully', async () => {
    const {cookieModel} = setupPrimaryTarget('https://example.com');
    (cookieModel.getCookiesForDomain as sinon.SinonStub).rejects(new Error('Target disconnected'));

    const context = createMockContext();

    const tool = new AiAssistance.GetCookieValues.GetCookieValuesTool();
    const response = await tool.handler(
        {cookieNames: ['cookie1'], origins: ['https://example.com']},
        context,
        {approved: true},
    );

    assertIsResult(response);
    assert.deepEqual(response.result.cookiesByOrigin, {
      'https://example.com': {
        cookies: [],
      },
    });
  });

  it('formats displayInfoFromArgs correctly', () => {
    const tool = new AiAssistance.GetCookieValues.GetCookieValuesTool();
    const displayInfo = tool.displayInfoFromArgs({
      cookieNames: ['session-cookie'],
      origins: ['https://example.com'],
    });

    assert.strictEqual(displayInfo.title, 'Reading cookie values and metadata');
    assert.strictEqual(displayInfo.action, 'getCookieValues(["session-cookie"], ["https://example.com"])');
  });

  it('has REDACT_FROM_HISTORY annotation', () => {
    const tool = new AiAssistance.GetCookieValues.GetCookieValuesTool();
    assert.deepEqual(tool.annotations, [AiAssistance.Tool.ToolAnnotation.REDACT_FROM_HISTORY]);
  });
});
