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
} from '../../../testing/AiAssistanceHelpers.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';
import {MockCDPConnection} from '../../../testing/MockCDPConnection.js';
import {setupRuntimeHooks} from '../../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../../testing/TestUniverse.js';
import * as AiAssistance from '../ai_assistance.js';

const {urlString} = Platform.DevToolsPath;

describe('GetStorageBreakdownTool', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let universe: TestUniverse;
  let activeStorages: SDK.DOMStorageModel.DOMStorage[] = [];
  let activeCookies: SDK.Cookie.Cookie[] = [];

  beforeEach(() => {
    universe = new TestUniverse();
    activeStorages = [];
    activeCookies = [];
    sinon.stub(SDK.TargetManager.TargetManager, 'instance').returns(universe.targetManager);
  });

  function createMockContext(options?: {origin?: string}) {
    const origin = options && 'origin' in options ? options.origin : 'https://example.com';
    return {
      conversationContext: null,
      getEstablishedOrigin: sinon.stub().returns(origin),
    };
  }

  function setupPrimaryTarget(options?: {
    origin?: string,
    cdpBreakdown?: Protocol.Storage.UsageForType[],
    cdpError?: string,
  }): SDK.Target.Target {
    const origin = options?.origin ?? 'https://example.com';
    const cdpConnection = new MockCDPConnection();

    if (options?.cdpError) {
      cdpConnection.setFailureHandler('Storage.getUsageAndQuota', () => ({code: -32000, message: options.cdpError!}));
    } else {
      cdpConnection.setSuccessHandler('Storage.getUsageAndQuota', () => {
        return {
          usage: 1000,
          quota: 10000,
          overrideActive: false,
          usageBreakdown: options?.cdpBreakdown ??
              [
                {storageType: Protocol.Storage.StorageType.Indexeddb, usage: 200},
                {storageType: Protocol.Storage.StorageType.File_systems, usage: 0},
                {storageType: Protocol.Storage.StorageType.Service_workers, usage: 800},
              ],
        };
      });
    }

    const primaryTarget = universe.createTarget({url: urlString`${origin}/`, connection: cdpConnection});
    primaryTarget.setInspectedURL(urlString`${origin}/`);
    sinon.stub(universe.targetManager, 'primaryPageTarget').returns(primaryTarget);

    const domStorageModel = primaryTarget.model(SDK.DOMStorageModel.DOMStorageModel);
    assert.exists(domStorageModel);
    sinon.stub(domStorageModel, 'storages').callsFake(() => activeStorages);

    const cookieModel = primaryTarget.model(SDK.CookieModel.CookieModel);
    assert.exists(cookieModel);
    sinon.stub(cookieModel, 'getCookiesForDomain').callsFake(async () => activeCookies);

    return primaryTarget;
  }

  it('provides display info from args', () => {
    const tool = new AiAssistance.GetStorageBreakdown.GetStorageBreakdownTool();
    const info = tool.displayInfoFromArgs();
    assert.deepEqual(info, {
      title: 'Retrieving storage breakdown',
      action: 'getStorageBreakdown()',
    });
  });

  it('returns breakdown sorted by usage descending with UI widget', async () => {
    setupPrimaryTarget();

    const mockLocalStorage = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockLocalStorage, 'storageKey').get(() => 'https://example.com/');
    sinon.stub(mockLocalStorage, 'isLocalStorage').get(() => true);
    mockLocalStorage.getItems.resolves([['key1', 'value1']]);  // 10 chars -> 20 bytes

    const mockSessionStorage = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockSessionStorage, 'storageKey').get(() => 'https://example.com/');
    sinon.stub(mockSessionStorage, 'isLocalStorage').get(() => false);
    mockSessionStorage.getItems.resolves([['foo', 'bar']]);  // 6 chars -> 12 bytes

    activeStorages = [mockLocalStorage, mockSessionStorage];

    const mockCookie = new SDK.Cookie.Cookie('cookie-name', 'cookie-value');
    mockCookie.setSize(15);
    mockCookie.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'example.com');
    activeCookies = [mockCookie];

    const context = createMockContext();
    const tool = new AiAssistance.GetStorageBreakdown.GetStorageBreakdownTool();
    const response = await tool.handler({}, context);

    assertIsResult(response);
    assert.deepEqual(response.result.usageBreakdown, [
      {storageType: 'service_workers', usage: AiAssistance.UnitFormatters.bytes(800)},
      {storageType: 'indexeddb', usage: AiAssistance.UnitFormatters.bytes(200)},
      {storageType: 'local_storage', usage: AiAssistance.UnitFormatters.bytes(20)},
      {storageType: 'cookies', usage: AiAssistance.UnitFormatters.bytes(15)},
      {storageType: 'session_storage', usage: AiAssistance.UnitFormatters.bytes(12)},
    ]);

    assert.deepEqual(response.widgets, [
      {
        name: 'STORAGE_BREAKDOWN',
        data: {
          totalUsageBytes: 1000,
          totalQuotaBytes: 10000,
          usageBreakdown: [
            {storageType: 'service_workers', bytes: 800},
            {storageType: 'indexeddb', bytes: 200},
            {storageType: 'local_storage', bytes: 20},
            {storageType: 'cookies', bytes: 15},
            {storageType: 'session_storage', bytes: 12},
          ],
        },
      },
    ]);
  });

  it('handles empty storages and cookies gracefully', async () => {
    setupPrimaryTarget({cdpBreakdown: []});
    activeStorages = [];
    activeCookies = [];

    const context = createMockContext();
    const tool = new AiAssistance.GetStorageBreakdown.GetStorageBreakdownTool();
    const response = await tool.handler({}, context);

    assertIsResult(response);
    assert.deepEqual(response.result.usageBreakdown, [
      {storageType: 'local_storage', usage: AiAssistance.UnitFormatters.bytes(0)},
      {storageType: 'session_storage', usage: AiAssistance.UnitFormatters.bytes(0)},
      {storageType: 'cookies', usage: AiAssistance.UnitFormatters.bytes(0)},
    ]);
  });

  it('handles transient storage getItems rejection gracefully', async () => {
    setupPrimaryTarget({cdpBreakdown: []});

    const failingStorage = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(failingStorage, 'storageKey').get(() => 'https://example.com/');
    sinon.stub(failingStorage, 'isLocalStorage').get(() => true);
    failingStorage.getItems.rejects(new Error('Target detached'));
    activeStorages = [failingStorage];

    const context = createMockContext();
    const tool = new AiAssistance.GetStorageBreakdown.GetStorageBreakdownTool();
    const response = await tool.handler({}, context);

    assertIsResult(response);
    assert.deepEqual(response.result.usageBreakdown, [
      {storageType: 'local_storage', usage: AiAssistance.UnitFormatters.bytes(0)},
      {storageType: 'session_storage', usage: AiAssistance.UnitFormatters.bytes(0)},
      {storageType: 'cookies', usage: AiAssistance.UnitFormatters.bytes(0)},
    ]);
  });

  it('returns error when primaryPageTarget is missing', async () => {
    sinon.stub(universe.targetManager, 'primaryPageTarget').returns(null);

    const context = createMockContext();
    const tool = new AiAssistance.GetStorageBreakdown.GetStorageBreakdownTool();
    const response = await tool.handler({}, context);

    assertIsError(response);
    assert.strictEqual(response.error, 'Primary page target not found.');
  });

  it('returns error when origin is disallowed or mismatched', async () => {
    setupPrimaryTarget({origin: 'https://example.com'});

    const context = createMockContext({origin: 'https://another-origin.com'});
    const tool = new AiAssistance.GetStorageBreakdown.GetStorageBreakdownTool();
    const response = await tool.handler({}, context);

    assertIsError(response);
    assert.strictEqual(response.error, 'Page origin does not match allowed origin.');
  });

  it('returns error when origin is opaque', async () => {
    setupPrimaryTarget({origin: 'data:text/html,hello'});

    const context = createMockContext({origin: 'data:text/html,hello'});
    const tool = new AiAssistance.GetStorageBreakdown.GetStorageBreakdownTool();
    const response = await tool.handler({}, context);

    assertIsError(response);
    assert.strictEqual(response.error, 'No origin available or not allowed.');
  });

  it('returns error when CDP getUsageAndQuota fails', async () => {
    setupPrimaryTarget({cdpError: 'CDP error occurred'});

    const context = createMockContext();
    const tool = new AiAssistance.GetStorageBreakdown.GetStorageBreakdownTool();
    const response = await tool.handler({}, context);

    assertIsError(response);
    assert.include(response.error, 'CDP error occurred');
  });
});
