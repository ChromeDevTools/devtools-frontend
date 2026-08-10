// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import {mockAidaClient} from '../../../testing/AiAssistanceHelpers.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';
import {MockCDPConnection} from '../../../testing/MockCDPConnection.js';
import {getMainFrame, navigate} from '../../../testing/ResourceTreeHelpers.js';
import {setupRuntimeHooks} from '../../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../../testing/TestUniverse.js';
import * as AiAssistance from '../ai_assistance.js';

const {urlString} = Platform.DevToolsPath;

describe('StorageAgent', function() {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let universe: TestUniverse;
  let activeStorages: SDK.DOMStorageModel.DOMStorage[] = [];

  beforeEach(() => {
    universe = new TestUniverse();
    const target = universe.createTarget({url: urlString`http://example.com/`});
    sinon.stub(universe.targetManager, 'primaryPageTarget').returns(target);
    const domStorageModel = target.model(SDK.DOMStorageModel.DOMStorageModel);
    assert.exists(domStorageModel);

    const mockStorage = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockStorage, 'storageKey').get(() => 'https://example.com/');
    sinon.stub(mockStorage, 'isLocalStorage').get(() => true);
    mockStorage.getItems.resolves([['key1', 'value1'], ['key2', 'value2']]);

    sinon.stub(domStorageModel, 'enable');
    sinon.stub(domStorageModel, 'storages').callsFake(() => activeStorages);
    activeStorages = [mockStorage];

    const mainFrame = getMainFrame(target);
    navigate(mainFrame, {securityOrigin: 'https://example.com'});
  });

  it('can list keys for local storage', async () => {
    const aidaClient = mockAidaClient([
      [{
        functionCalls: [{name: 'listStorageKeys', args: {type: 'localStorage', origins: ['https://example.com']}}],
        explanation: '',
      }],
      [{explanation: 'Here are the keys.'}],
    ]);

    const agent = new AiAssistance.StorageAgent.StorageAgent({
      aidaClient,
      targetManager: universe.targetManager,
    });
    const context = new AiAssistance.StorageContext.StorageContext(new AiAssistance.StorageItem.DOMStorageItem(
        'https://example.com', 'https://example.com', 'https://example.com/', 'localStorage'));

    const responses = await Array.fromAsync(agent.run('list keys', {selected: context}));

    const actionResponse = responses.find((r): r is AiAssistance.AiAgent.ActionResponse => r.type === 'action');
    assert.exists(actionResponse, 'Expected an action response');
    assert.strictEqual(actionResponse.code, 'listStorageKeys(\'localStorage\', ["https://example.com"])');
    assert.include(actionResponse.output, 'key1');
    assert.include(actionResponse.output, 'key2');
  });

  it('can get storage item with approval', async () => {
    const aidaClient = mockAidaClient([
      [{
        functionCalls: [
          {name: 'getStorageValues', args: {type: 'localStorage', keys: ['key1'], origins: ['https://example.com']}},
        ],
        explanation: '',
      }],
      [{explanation: 'Here is the value.'}],
    ]);

    const sideEffectPromise = Promise.withResolvers<boolean>();
    const agent = new AiAssistance.StorageAgent.StorageAgent({
      aidaClient,
      confirmSideEffectForTest: (<T>() => sideEffectPromise as unknown as PromiseWithResolvers<T>),
      targetManager: universe.targetManager,
    });

    const context = new AiAssistance.StorageContext.StorageContext(new AiAssistance.StorageItem.DOMStorageItem(
        'https://example.com', 'https://example.com', 'https://example.com/', 'localStorage'));

    sideEffectPromise.resolve(true);
    const responses = await Array.fromAsync(agent.run('get key1', {selected: context}));

    const actionResponses = responses.filter((r): r is AiAssistance.AiAgent.ActionResponse => r.type === 'action');
    assert.lengthOf(actionResponses, 2, 'Expected exactly two action responses for approval flow');

    assert.strictEqual(actionResponses[0].code,
                       'getStorageValues(\'localStorage\', ["key1"], ["https://example.com"])');
    assert.isUndefined(actionResponses[0].output, 'Pre-approval yield should not contain execution output');

    assert.strictEqual(actionResponses[1].code,
                       'getStorageValues(\'localStorage\', ["key1"], ["https://example.com"])');
    assert.include(actionResponses[1].output, 'value1', 'Post-approval yield should contain storage values');
  });

  it('returns error when approval is denied', async () => {
    const aidaClient = mockAidaClient([[{
      functionCalls:
          [{name: 'getStorageValues', args: {type: 'localStorage', keys: ['key1'], origins: ['https://example.com']}}],
      explanation: '',
    }]]);

    const sideEffectPromise = Promise.withResolvers<boolean>();
    const agent = new AiAssistance.StorageAgent.StorageAgent({
      aidaClient,
      confirmSideEffectForTest: (<T>() => sideEffectPromise as unknown as PromiseWithResolvers<T>),
      targetManager: universe.targetManager,
    });

    const context = new AiAssistance.StorageContext.StorageContext(new AiAssistance.StorageItem.DOMStorageItem(
        'https://example.com', 'https://example.com', 'https://example.com/', 'localStorage'));

    sideEffectPromise.resolve(false);
    const responses = await Array.fromAsync(agent.run('get key1', {selected: context}));

    const finalAction = responses.findLast((r): r is AiAssistance.AiAgent.ActionResponse => r.type === 'action');
    assert.exists(finalAction, 'Expected an action response');
    assert.isTrue(finalAction.canceled, 'Expected action to be marked as canceled');
    assert.include(finalAction.output, 'User denied code execution with side effects');
  });

  it('can list keys for local storage when storageKey is specified in context', async () => {
    const aidaClient = mockAidaClient([
      [{
        functionCalls: [{name: 'listStorageKeys', args: {type: 'localStorage', origins: ['https://example.com']}}],
        explanation: '',
      }],
      [{explanation: 'Here are the keys.'}],
    ]);

    const agent = new AiAssistance.StorageAgent.StorageAgent({
      aidaClient,
      targetManager: universe.targetManager,
    });
    const context = new AiAssistance.StorageContext.StorageContext(new AiAssistance.StorageItem.DOMStorageItem(
        'https://example.com', 'https://example.com', 'https://example.com^0', 'localStorage'));

    const target = universe.targetManager.primaryPageTarget();
    assert.exists(target);
    const domStorageModel = target.model(SDK.DOMStorageModel.DOMStorageModel);
    assert.exists(domStorageModel);

    const mockStorage = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockStorage, 'storageKey').get(() => 'https://example.com^0');
    sinon.stub(mockStorage, 'isLocalStorage').get(() => true);
    mockStorage.getItems.resolves([['key1-keypass', 'value1']]);

    activeStorages = [mockStorage];

    const responses = await Array.fromAsync(agent.run('list keys', {selected: context}));

    const actionResponse = responses.find((r): r is AiAssistance.AiAgent.ActionResponse => r.type === 'action');
    assert.exists(actionResponse, 'Expected an action response');
    assert.strictEqual(actionResponse.code, 'listStorageKeys(\'localStorage\', ["https://example.com"])');
    assert.include(actionResponse.output, 'key1-keypass');
  });

  it('can list storage keys across multiple origins', async () => {
    const aidaClient = mockAidaClient([
      [{
        functionCalls: [
          {name: 'listStorageKeys', args: {type: 'localStorage', origins: ['https://example.com', 'https://b.com']}},
        ],
        explanation: '',
      }],
      [{explanation: 'Here are the keys.'}],
    ]);

    const agent = new AiAssistance.StorageAgent.StorageAgent({aidaClient, targetManager: universe.targetManager});
    const context = new AiAssistance.StorageContext.StorageContext(
        AiAssistance.StorageItem.DOMStorageItem.createGenericContext('https://example.com', 'localStorage'));

    const target = universe.targetManager.primaryPageTarget();
    assert.exists(target);

    const mockStorageA = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockStorageA, 'storageKey').get(() => 'https://example.com^0');
    sinon.stub(mockStorageA, 'isLocalStorage').get(() => true);
    mockStorageA.getItems.resolves([['keyA', 'valA']]);

    const mockStorageB = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockStorageB, 'storageKey').get(() => 'https://b.com^0');
    sinon.stub(mockStorageB, 'isLocalStorage').get(() => true);
    mockStorageB.getItems.resolves([['keyB', 'valB']]);

    activeStorages = [mockStorageA, mockStorageB];

    const responses = await Array.fromAsync(agent.run('list keys across origins', {selected: context}));

    const actionResponse = responses.find((r): r is AiAssistance.AiAgent.ActionResponse => r.type === 'action');
    assert.exists(actionResponse, 'Expected an action response');
    assert.strictEqual(actionResponse.code,
                       'listStorageKeys(\'localStorage\', ["https://example.com","https://b.com"])');

    const parsed = JSON.parse(actionResponse.output!);
    assert.exists(parsed.storageKeysByOrigin);
    assert.deepEqual(parsed.storageKeysByOrigin['https://example.com'].partitions,
                     [{storageKey: 'https://example.com^0', keys: ['keyA']}]);
    assert.deepEqual(parsed.storageKeysByOrigin['https://b.com'].partitions,
                     [{storageKey: 'https://b.com^0', keys: ['keyB']}]);
  });

  it('can list cookies for the origin, excluding HttpOnly ones', async () => {
    const aidaClient = mockAidaClient([
      [{
        functionCalls: [{name: 'listCookies', args: {origins: ['https://example.com']}}],
        explanation: '',
      }],
      [{explanation: 'Here are the cookies.'}],
    ]);

    const agent = new AiAssistance.StorageAgent.StorageAgent({
      aidaClient,
      targetManager: universe.targetManager,
    });
    const context = new AiAssistance.StorageContext.StorageContext(
        new AiAssistance.StorageItem.CookieItem('https://example.com', 'https://example.com'));

    const target = universe.targetManager.primaryPageTarget();
    assert.exists(target);
    const cookieModel = target.model(SDK.CookieModel.CookieModel);
    assert.exists(cookieModel);

    // Mock normal cookie
    const mockCookie = new SDK.Cookie.Cookie('session-cookie', 'session-value');
    mockCookie.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'example.com');
    mockCookie.addAttribute(SDK.Cookie.Attribute.PATH, '/');

    // Mock HttpOnly cookie
    const httpOnlyCookie = new SDK.Cookie.Cookie('http-only-cookie', 'secret-value');
    httpOnlyCookie.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'example.com');
    httpOnlyCookie.addAttribute(SDK.Cookie.Attribute.PATH, '/');
    httpOnlyCookie.addAttribute(SDK.Cookie.Attribute.HTTP_ONLY);

    const getCookiesStub = sinon.stub(cookieModel, 'getCookiesForDomain').withArgs('https://example.com').resolves([
      mockCookie,
      httpOnlyCookie,
    ]);

    const responses = await Array.fromAsync(agent.run('list cookies', {selected: context}));

    const actionResponse = responses.find((r): r is AiAssistance.AiAgent.ActionResponse => r.type === 'action');
    assert.exists(actionResponse, 'Expected an action response');
    assert.strictEqual(actionResponse.code, 'listCookies(["https://example.com"])');
    assert.include(actionResponse.output, 'session-cookie');
    assert.notInclude(actionResponse.output, 'session-value', 'Cookie values must be hidden in listCookies()');
    assert.notInclude(actionResponse.output, 'http-only-cookie', 'HttpOnly cookies must be strictly filtered out');
    sinon.assert.calledOnce(getCookiesStub);
  });

  it('can get cookie values with approval', async () => {
    const cookieName = 'session-cookie';
    const aidaClient = mockAidaClient([
      [{
        functionCalls: [{name: 'getCookieValues', args: {cookieNames: [cookieName], origins: ['https://example.com']}}],
        explanation: '',
      }],
      [{explanation: 'Here is the value.'}],
    ]);

    const sideEffectPromise = Promise.withResolvers<boolean>();
    const agent = new AiAssistance.StorageAgent.StorageAgent({
      aidaClient,
      confirmSideEffectForTest: (<T>() => sideEffectPromise as unknown as PromiseWithResolvers<T>),
      targetManager: universe.targetManager,
    });

    const context = new AiAssistance.StorageContext.StorageContext(
        new AiAssistance.StorageItem.CookieItem('https://example.com', 'https://example.com'));

    const target = universe.targetManager.primaryPageTarget();
    assert.exists(target);
    const cookieModel = target.model(SDK.CookieModel.CookieModel);
    assert.exists(cookieModel);
    const mockCookie = new SDK.Cookie.Cookie('session-cookie', 'session-value');
    mockCookie.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'example.com');
    mockCookie.addAttribute(SDK.Cookie.Attribute.PATH, '/');

    const getCookiesStub =
        sinon.stub(cookieModel, 'getCookiesForDomain').withArgs('https://example.com').resolves([mockCookie]);

    sideEffectPromise.resolve(true);
    const responses = await Array.fromAsync(agent.run('get value of session-cookie', {selected: context}));

    const actionResponses = responses.filter((r): r is AiAssistance.AiAgent.ActionResponse => r.type === 'action');
    assert.lengthOf(actionResponses, 2, 'Expected exactly two action responses for approval flow');

    assert.strictEqual(actionResponses[0].code, 'getCookieValues(["session-cookie"], ["https://example.com"])');
    assert.isUndefined(actionResponses[0].output, 'Pre-approval yield should not contain execution output');

    assert.strictEqual(actionResponses[1].code, 'getCookieValues(["session-cookie"], ["https://example.com"])');
    assert.include(actionResponses[1].output, 'session-value', 'Post-approval yield should contain cookie value');
    assert.include(
        actionResponses[1].output, 'example.com', 'Post-approval yield should contain cookie domain metadata');
    assert.include(actionResponses[1].output, 'path', 'Post-approval yield should contain cookie path metadata');
    sinon.assert.calledOnce(getCookiesStub);
  });

  it('can resolve duplicate same-name cookies with different metadata', async () => {
    const cookieName = 'session-cookie';
    const aidaClient = mockAidaClient([
      [{
        functionCalls: [{name: 'getCookieValues', args: {cookieNames: [cookieName], origins: ['https://example.com']}}],
        explanation: '',
      }],
      [{explanation: 'Here are the values.'}],
    ]);

    const sideEffectPromise = Promise.withResolvers<boolean>();
    const agent = new AiAssistance.StorageAgent.StorageAgent({
      aidaClient,
      confirmSideEffectForTest: (<T>() => sideEffectPromise as unknown as PromiseWithResolvers<T>),
      targetManager: universe.targetManager,
    });

    const context = new AiAssistance.StorageContext.StorageContext(
        new AiAssistance.StorageItem.CookieItem('https://example.com', 'https://example.com'));

    const target = universe.targetManager.primaryPageTarget();
    assert.exists(target);
    const cookieModel = target.model(SDK.CookieModel.CookieModel);
    assert.exists(cookieModel);

    // Mock duplicate cookies
    const cookie1 = new SDK.Cookie.Cookie('session-cookie', 'value-host');
    cookie1.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'example.com');
    cookie1.addAttribute(SDK.Cookie.Attribute.PATH, '/');

    const cookie2 = new SDK.Cookie.Cookie('session-cookie', 'value-wildcard');
    cookie2.addAttribute(SDK.Cookie.Attribute.DOMAIN, '.example.com');
    cookie2.addAttribute(SDK.Cookie.Attribute.PATH, '/sub');

    sinon.stub(cookieModel, 'getCookiesForDomain').withArgs('https://example.com').resolves([cookie1, cookie2]);

    sideEffectPromise.resolve(true);
    const responses = await Array.fromAsync(agent.run('get value of session-cookie', {selected: context}));

    const actionResponses = responses.filter((r): r is AiAssistance.AiAgent.ActionResponse => r.type === 'action');
    assert.lengthOf(actionResponses, 2, 'Expected exactly two action responses for approval flow');

    assert.strictEqual(actionResponses[1].code, 'getCookieValues(["session-cookie"], ["https://example.com"])');
    assert.include(actionResponses[1].output, 'value-host');
    assert.include(actionResponses[1].output, 'value-wildcard');
    assert.include(actionResponses[1].output, 'example.com');
    assert.include(actionResponses[1].output, '.example.com');
    assert.include(actionResponses[1].output, '/sub');
  });

  it('strictly filters out HttpOnly cookies from getCookieValues requested names', async () => {
    const aidaClient = mockAidaClient([
      [{
        functionCalls: [{
          name: 'getCookieValues',
          args: {cookieNames: ['secret-cookie', 'public-cookie'], origins: ['https://example.com']},
        }],
        explanation: '',
      }],
      [{explanation: 'Here is the value.'}],
    ]);

    const sideEffectPromise = Promise.withResolvers<boolean>();
    const agent = new AiAssistance.StorageAgent.StorageAgent({
      aidaClient,
      confirmSideEffectForTest: (<T>() => sideEffectPromise as unknown as PromiseWithResolvers<T>),
      targetManager: universe.targetManager,
    });

    const context = new AiAssistance.StorageContext.StorageContext(
        new AiAssistance.StorageItem.CookieItem('https://example.com', 'https://example.com'));

    const target = universe.targetManager.primaryPageTarget();
    assert.exists(target);
    const cookieModel = target.model(SDK.CookieModel.CookieModel);
    assert.exists(cookieModel);

    // Regular cookie
    const publicCookie = new SDK.Cookie.Cookie('public-cookie', 'public-value');
    publicCookie.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'example.com');
    publicCookie.addAttribute(SDK.Cookie.Attribute.PATH, '/');

    // HttpOnly cookie
    const secretCookie = new SDK.Cookie.Cookie('secret-cookie', 'secret-value');
    secretCookie.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'example.com');
    secretCookie.addAttribute(SDK.Cookie.Attribute.PATH, '/');
    secretCookie.addAttribute(SDK.Cookie.Attribute.HTTP_ONLY);

    sinon.stub(cookieModel, 'getCookiesForDomain').withArgs('https://example.com').resolves([
      publicCookie,
      secretCookie,
    ]);

    sideEffectPromise.resolve(true);
    const responses = await Array.fromAsync(agent.run('get cookies', {selected: context}));

    const actionResponses = responses.filter((r): r is AiAssistance.AiAgent.ActionResponse => r.type === 'action');
    assert.lengthOf(actionResponses, 2);
    assert.strictEqual(actionResponses[1].code,
                       'getCookieValues(["secret-cookie","public-cookie"], ["https://example.com"])');

    // Verify that public cookie data is returned
    assert.include(actionResponses[1].output, 'public-value');

    // Verify that the secret/HttpOnly cookie's value is strictly filtered out
    assert.notInclude(actionResponses[1].output, 'secret-value');
  });

  it('supports listing cookies across multiple origins', async () => {
    const aidaClient = mockAidaClient([
      [{
        functionCalls: [{name: 'listCookies', args: {origins: ['https://example.com', 'https://other.com']}}],
        explanation: '',
      }],
      [{explanation: 'Done listing.'}],
    ]);

    const target1 = universe.targetManager.primaryPageTarget();
    assert.exists(target1);
    const cookieModel1 = target1.model(SDK.CookieModel.CookieModel);
    assert.exists(cookieModel1);

    const mockCookie1 = new SDK.Cookie.Cookie('cookie-1', 'val-1');
    sinon.stub(cookieModel1, 'getCookiesForDomain').withArgs('https://example.com').resolves([mockCookie1]);

    const target2 = universe.createTarget({url: urlString`https://other.com/`});
    const mainFrame2 = getMainFrame(target2);
    navigate(mainFrame2, {securityOrigin: 'https://other.com'});
    const cookieModel2 = target2.model(SDK.CookieModel.CookieModel);
    assert.exists(cookieModel2);

    const mockCookie2 = new SDK.Cookie.Cookie('cookie-2', 'val-2');
    sinon.stub(cookieModel2, 'getCookiesForDomain').withArgs('https://other.com').resolves([mockCookie2]);

    const agent = new AiAssistance.StorageAgent.StorageAgent({
      aidaClient,
      targetManager: universe.targetManager,
    });
    const context = new AiAssistance.StorageContext.StorageContext(
        new AiAssistance.StorageItem.CookieItem('https://example.com', 'https://example.com'));

    assert.isTrue(AiAssistance.StorageAgent.isSamePageOrigin(target2.outermostTarget(), context));

    const responses = await Array.fromAsync(agent.run('list cookies', {selected: context}));
    const actionResponse = responses.find((r): r is AiAssistance.AiAgent.ActionResponse => r.type === 'action');
    assert.exists(actionResponse);

    const parsed = JSON.parse(actionResponse.output!);
    assert.exists(parsed.cookieNamesByOrigin);
    assert.deepEqual(parsed.cookieNamesByOrigin['https://example.com'].cookies, ['cookie-1']);
    assert.deepEqual(parsed.cookieNamesByOrigin['https://other.com'].cookies, ['cookie-2']);
  });

  it('can get cookie values across multiple origins with user approval', async () => {
    const aidaClient = mockAidaClient([
      [{
        functionCalls: [
          {
            name: 'getCookieValues',
            args: {cookieNames: ['sessId'], origins: ['https://example.com', 'https://other.com']},
          },
        ],
        explanation: '',
      }],
      [{explanation: 'Done getting values.'}],
    ]);

    const target1 = universe.targetManager.primaryPageTarget();
    assert.exists(target1);
    const cookieModel1 = target1.model(SDK.CookieModel.CookieModel);
    assert.exists(cookieModel1);

    const cookie1 = new SDK.Cookie.Cookie('sessId', 'value-1');
    cookie1.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'example.com');
    cookie1.addAttribute(SDK.Cookie.Attribute.PATH, '/');
    sinon.stub(cookieModel1, 'getCookiesForDomain').withArgs('https://example.com').resolves([cookie1]);

    const target2 = universe.createTarget({url: urlString`https://other.com/`});
    const mainFrame2 = getMainFrame(target2);
    navigate(mainFrame2, {securityOrigin: 'https://other.com'});
    const cookieModel2 = target2.model(SDK.CookieModel.CookieModel);
    assert.exists(cookieModel2);

    const cookie2 = new SDK.Cookie.Cookie('sessId', 'value-2');
    cookie2.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'other.com');
    cookie2.addAttribute(SDK.Cookie.Attribute.PATH, '/');
    sinon.stub(cookieModel2, 'getCookiesForDomain').withArgs('https://other.com').resolves([cookie2]);

    const sideEffectPromise = Promise.withResolvers<boolean>();
    const agent = new AiAssistance.StorageAgent.StorageAgent({
      aidaClient,
      confirmSideEffectForTest: (<T>() => sideEffectPromise as unknown as PromiseWithResolvers<T>),
      targetManager: universe.targetManager,
    });
    const context = new AiAssistance.StorageContext.StorageContext(
        new AiAssistance.StorageItem.CookieItem('https://example.com', 'https://example.com'));

    assert.isTrue(AiAssistance.StorageAgent.isSamePageOrigin(target2.outermostTarget(), context));

    sideEffectPromise.resolve(true);
    const responses = await Array.fromAsync(agent.run('get cookie values', {selected: context}));
    const actionResponses = responses.filter((r): r is AiAssistance.AiAgent.ActionResponse => r.type === 'action');
    assert.lengthOf(actionResponses, 2, 'Expected exactly two action responses for approval flow');
    assert.strictEqual(actionResponses[1].code,
                       'getCookieValues(["sessId"], ["https://example.com","https://other.com"])');

    assert.include(actionResponses[1].output, 'value-1');
    assert.include(actionResponses[1].output, 'value-2');
  });

  it('can get storage values across multiple origins with user approval', async () => {
    const aidaClient = mockAidaClient([
      [{
        functionCalls: [
          {
            name: 'getStorageValues',
            args: {type: 'localStorage', keys: ['keyA'], origins: ['https://example.com', 'https://b.com']},
          },
        ],
        explanation: '',
      }],
      [{explanation: 'Done getting storage values.'}],
    ]);

    const sideEffectPromise = Promise.withResolvers<boolean>();
    const agent = new AiAssistance.StorageAgent.StorageAgent({
      aidaClient,
      confirmSideEffectForTest: (<T>() => sideEffectPromise as unknown as PromiseWithResolvers<T>),
      targetManager: universe.targetManager,
    });
    const context = new AiAssistance.StorageContext.StorageContext(
        AiAssistance.StorageItem.DOMStorageItem.createGenericContext('https://example.com', 'localStorage'));

    const target = universe.targetManager.primaryPageTarget();
    assert.exists(target);

    const mockStorageA = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockStorageA, 'storageKey').get(() => 'https://example.com^0');
    sinon.stub(mockStorageA, 'isLocalStorage').get(() => true);
    mockStorageA.getItems.resolves([['keyA', 'valA']]);

    const mockStorageB = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockStorageB, 'storageKey').get(() => 'https://b.com^0');
    sinon.stub(mockStorageB, 'isLocalStorage').get(() => true);
    mockStorageB.getItems.resolves([['keyA', 'valB']]);

    activeStorages = [mockStorageA, mockStorageB];

    sideEffectPromise.resolve(true);
    const responses = await Array.fromAsync(agent.run('get storage values across origins', {selected: context}));
    const actionResponses = responses.filter((r): r is AiAssistance.AiAgent.ActionResponse => r.type === 'action');
    assert.lengthOf(actionResponses, 2, 'Expected exactly two action responses for approval flow');
    assert.strictEqual(actionResponses[1].code,
                       'getStorageValues(\'localStorage\', ["keyA"], ["https://example.com","https://b.com"])');

    const parsed = JSON.parse(actionResponses[1].output!);
    assert.exists(parsed.storageValuesByOrigin);
    assert.deepEqual(parsed.storageValuesByOrigin['https://example.com'].items,
                     [{storageKey: 'https://example.com^0', values: {keyA: 'valA'}}]);
    assert.deepEqual(parsed.storageValuesByOrigin['https://b.com'].items,
                     [{storageKey: 'https://b.com^0', values: {keyA: 'valB'}}]);
  });

  it('correctly formats the title for CookieItem without a name or origin', () => {
    const context = new AiAssistance.StorageContext.StorageContext(
        new AiAssistance.StorageItem.CookieItem('https://example.com', 'https://example.com'));
    assert.strictEqual(context.getTitle(), 'cookies: https://example.com');

    const genericContext = new AiAssistance.StorageContext.StorageContext(
        new AiAssistance.StorageItem.CookieItem('https://example.com', ''));
    assert.strictEqual(genericContext.getTitle(), 'cookies');
  });

  it('getStorageValues truncates large values to 10000 characters', async () => {
    const aidaClient = mockAidaClient([
      [{
        functionCalls: [
          {name: 'getStorageValues', args: {type: 'localStorage', keys: ['hugeKey'], origins: ['https://example.com']}},
        ],
        explanation: '',
      }],
      [{explanation: 'Here is the value.'}],
    ]);

    const sideEffectPromise = Promise.withResolvers<boolean>();
    const agent = new AiAssistance.StorageAgent.StorageAgent({
      aidaClient,
      confirmSideEffectForTest: (<T>() => sideEffectPromise as unknown as PromiseWithResolvers<T>),
      targetManager: universe.targetManager,
    });

    const context = new AiAssistance.StorageContext.StorageContext(new AiAssistance.StorageItem.DOMStorageItem(
        'https://example.com', 'https://example.com', 'https://example.com/', 'localStorage'));

    const target = universe.targetManager.primaryPageTarget();
    assert.exists(target);
    const domStorageModel = target.model(SDK.DOMStorageModel.DOMStorageModel);
    assert.exists(domStorageModel);

    const mockStorage = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockStorage, 'storageKey').get(() => 'https://example.com/');
    sinon.stub(mockStorage, 'isLocalStorage').get(() => true);

    const hugeValue = 'A'.repeat(15000);
    mockStorage.getItems.resolves([['hugeKey', hugeValue]]);

    activeStorages = [mockStorage];

    sideEffectPromise.resolve(true);
    const responses = await Array.fromAsync(agent.run('get hugeKey', {selected: context}));

    const actionResponses = responses.filter((r): r is AiAssistance.AiAgent.ActionResponse => r.type === 'action');
    assert.lengthOf(actionResponses, 2);

    const output = actionResponses[1].output;
    assert.exists(output);
    const expectedTruncated = 'A'.repeat(10000) + '... <truncated>';
    assert.include(output, expectedTruncated);
    assert.notInclude(output, 'A'.repeat(15000), 'Should not contain the full untruncated value');
  });

  it('can list active page origins using listPageOrigins', async () => {
    const aidaClient = mockAidaClient([
      [{
        functionCalls: [{name: 'listPageOrigins', args: {}}],
        explanation: '',
      }],
      [{explanation: 'Here are the active origins.'}],
    ]);

    const agent = new AiAssistance.StorageAgent.StorageAgent({
      aidaClient,
      targetManager: universe.targetManager,
    });
    const context = new AiAssistance.StorageContext.StorageContext(new AiAssistance.StorageItem.DOMStorageItem(
        'https://example.com', 'https://example.com', 'https://example.com/', 'localStorage'));

    const responses = await Array.fromAsync(agent.run('list origins', {selected: context}));

    const actionResponse = responses.find((r): r is AiAssistance.AiAgent.ActionResponse => r.type === 'action');
    assert.exists(actionResponse, 'Expected an action response');
    assert.strictEqual(actionResponse.code, 'listPageOrigins()');
    assert.include(actionResponse.output, 'https://example.com');
  });

  it('can give a storage breakdown of primary target', async () => {
    const cdpConnection = new MockCDPConnection();
    cdpConnection.setSuccessHandler('Storage.getUsageAndQuota',
                                    (callParams: Protocol.Storage.GetUsageAndQuotaRequest) => {
                                      assert.strictEqual(callParams.origin, 'https://example.com');
                                      return {
                                        usage: 1000,
                                        quota: 10000,
                                        overrideActive: false,
                                        usageBreakdown: [
                                          {storageType: 'indexeddb' as Protocol.Storage.StorageType, usage: 200},
                                          {storageType: 'file_systems' as Protocol.Storage.StorageType, usage: 0},
                                          {storageType: 'service_workers' as Protocol.Storage.StorageType, usage: 800},
                                        ],
                                      };
                                    });

    const target = universe.createTarget({url: 'https://example.com', connection: cdpConnection});
    target.setInspectedURL(urlString`https://example.com`);
    (universe.targetManager.primaryPageTarget as unknown as sinon.SinonStub).returns(target);

    const domStorageModel = target.model(SDK.DOMStorageModel.DOMStorageModel);
    assert.exists(domStorageModel);

    const mockLocalStorage = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockLocalStorage, 'storageKey').get(() => 'https://example.com/');
    sinon.stub(mockLocalStorage, 'isLocalStorage').get(() => true);
    mockLocalStorage.getItems.resolves([['key1', 'value1']]);

    const mockSessionStorage = sinon.createStubInstance(SDK.DOMStorageModel.DOMStorage);
    sinon.stub(mockSessionStorage, 'storageKey').get(() => 'https://example.com/');
    sinon.stub(mockSessionStorage, 'isLocalStorage').get(() => false);
    mockSessionStorage.getItems.resolves([['foo', 'bar']]);

    activeStorages = [mockLocalStorage, mockSessionStorage];

    const cookieModel = target.model(SDK.CookieModel.CookieModel);
    assert.exists(cookieModel);
    const mockCookie = new SDK.Cookie.Cookie('cookie-name', 'cookie-value');
    mockCookie.setSize(15);
    sinon.stub(cookieModel, 'getCookiesForDomain').withArgs('https://example.com').resolves([mockCookie]);

    const aidaClient = mockAidaClient([
      [{
        functionCalls: [{name: 'getStorageBreakdown', args: {}}],
        explanation: '',
      }],
      [{explanation: 'Here is the breakdown.'}],
    ]);
    const agent = new AiAssistance.StorageAgent.StorageAgent({
      aidaClient,
      targetManager: universe.targetManager,
    });

    const item = new AiAssistance.StorageItem.CookieItem('https://example.com', 'https://example.com');
    const context = new AiAssistance.StorageContext.StorageContext(item);

    const responses = await Array.fromAsync(agent.run('get breakdown', {selected: context}));
    const actionResponse = responses.find((r): r is AiAssistance.AiAgent.ActionResponse => r.type === 'action');
    assert.exists(actionResponse, 'Expected an action response');
    assert.strictEqual(actionResponse.code, 'getStorageBreakdown()');

    assert.exists(actionResponse.output);
    const parsedOutput = JSON.parse(actionResponse.output!);

    assert.deepEqual(parsedOutput, {
      usageBreakdown: [
        {storageType: 'service_workers', usage: AiAssistance.UnitFormatters.bytes(800)},
        {storageType: 'indexeddb', usage: AiAssistance.UnitFormatters.bytes(200)},
        {storageType: 'local_storage', usage: AiAssistance.UnitFormatters.bytes(20)},
        {storageType: 'cookies', usage: AiAssistance.UnitFormatters.bytes(15)},
        {storageType: 'session_storage', usage: AiAssistance.UnitFormatters.bytes(12)},
      ],
    });
  });

  describe('findFrameForOrigin', () => {
    it('returns the frame if it belongs to the same page target and has the primary origin', () => {
      const PRIMARY_ORIGIN = 'https://example.com';
      const context = new AiAssistance.StorageContext.StorageContext(
          new AiAssistance.StorageItem.CookieItem(PRIMARY_ORIGIN, PRIMARY_ORIGIN));

      const primaryTarget = universe.targetManager.primaryPageTarget();
      assert.exists(primaryTarget);

      const frame = AiAssistance.StorageAgent.findFrameForOrigin(context, PRIMARY_ORIGIN, universe.targetManager);
      assert.exists(frame);
      assert.strictEqual(frame.securityOrigin, PRIMARY_ORIGIN);
    });

    it('returns the frame if it has a different origin but belongs to the same page target (iframe)', () => {
      const PRIMARY_ORIGIN = 'https://example.com';
      const DIFFERENT_ORIGIN = 'https://different.com';
      const context = new AiAssistance.StorageContext.StorageContext(
          new AiAssistance.StorageItem.CookieItem(PRIMARY_ORIGIN, PRIMARY_ORIGIN));

      const primaryTarget = universe.targetManager.primaryPageTarget();
      assert.exists(primaryTarget);

      const resourceTreeModel = primaryTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assert.exists(resourceTreeModel);

      // Create a subframe and navigate it to set its origin
      const differentFrame =
          resourceTreeModel.frameAttached('different' as Protocol.Page.FrameId, 'main' as Protocol.Page.FrameId);
      assert.exists(differentFrame);
      navigate(differentFrame, {url: urlString`${DIFFERENT_ORIGIN}/`, securityOrigin: DIFFERENT_ORIGIN});

      const frame = AiAssistance.StorageAgent.findFrameForOrigin(context, DIFFERENT_ORIGIN, universe.targetManager);
      assert.exists(frame);
      assert.strictEqual(frame.securityOrigin, DIFFERENT_ORIGIN);
      assert.deepEqual(differentFrame, frame);
    });

    it('returns null if the origin frame belongs to a different page target', () => {
      const PRIMARY_ORIGIN = 'https://example.com';
      const DIFFERENT_ORIGIN = 'https://different.com';
      const context = new AiAssistance.StorageContext.StorageContext(
          new AiAssistance.StorageItem.CookieItem(PRIMARY_ORIGIN, PRIMARY_ORIGIN));

      const primaryTarget = universe.targetManager.primaryPageTarget();
      assert.exists(primaryTarget);

      // 1. Create a new target representing a different page target
      const differentTarget = universe.createTarget({
        id: 'different' as Protocol.Target.TargetID,
        name: 'different',
        type: SDK.Target.Type.FRAME,
      });
      differentTarget.setInspectedURL(urlString`${DIFFERENT_ORIGIN}`);

      // 2. Create a main frame on the different target and navigate it
      const differentFrame = getMainFrame(differentTarget);
      navigate(differentFrame, {url: urlString`${DIFFERENT_ORIGIN}/`, securityOrigin: DIFFERENT_ORIGIN});

      // 3. Verify it returns null because DIFFERENT_ORIGIN is on differentTarget
      const frame = AiAssistance.StorageAgent.findFrameForOrigin(context, DIFFERENT_ORIGIN, universe.targetManager);
      assert.isNull(frame);
    });
  });

  describe('resolveDOMStorages', () => {
    it('returns active matching DOM storage instances in the active tab', () => {
      const context = new AiAssistance.StorageContext.StorageContext(new AiAssistance.StorageItem.DOMStorageItem(
          'https://example.com', 'https://example.com', 'https://example.com/', 'localStorage'));

      const resolved = AiAssistance.StorageAgent.resolveDOMStorages(context, 'localStorage', 'https://example.com',
                                                                    universe.targetManager);
      assert.lengthOf(resolved, 1);
      assert.strictEqual(resolved[0].storageKey, 'https://example.com/');
    });

    it('filters out storages that do not belong to the conversation top-site', () => {
      const context = new AiAssistance.StorageContext.StorageContext(new AiAssistance.StorageItem.DOMStorageItem(
          'https://different.com', 'https://different.com', 'https://different.com/', 'localStorage'));

      const resolved = AiAssistance.StorageAgent.resolveDOMStorages(context, 'localStorage', 'https://different.com',
                                                                    universe.targetManager);
      assert.lengthOf(resolved, 0);
    });

    it('targets a specific storageKey partition if specified', () => {
      const context = new AiAssistance.StorageContext.StorageContext(new AiAssistance.StorageItem.DOMStorageItem(
          'https://example.com', 'https://example.com', 'https://example.com/', 'localStorage'));

      const resolved = AiAssistance.StorageAgent.resolveDOMStorages(context, 'localStorage', 'https://example.com',
                                                                    universe.targetManager, 'https://example.com/');
      assert.lengthOf(resolved, 1);

      const nonMatching = AiAssistance.StorageAgent.resolveDOMStorages(
          context, 'localStorage', 'https://example.com', universe.targetManager, 'https://different-partition/');
      assert.lengthOf(nonMatching, 0);
    });
  });

  describe('getCookiesForDomain', () => {
    it('returns cookies for domain, strictly filtering out HttpOnly ones', async () => {
      const target = universe.targetManager.primaryPageTarget();
      assert.exists(target);
      const cookieModel = target.model(SDK.CookieModel.CookieModel);
      assert.exists(cookieModel);

      const publicCookie = new SDK.Cookie.Cookie('public-cookie', 'public-value');
      publicCookie.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'example.com');
      publicCookie.addAttribute(SDK.Cookie.Attribute.PATH, '/');

      const secretCookie = new SDK.Cookie.Cookie('secret-cookie', 'secret-value');
      secretCookie.addAttribute(SDK.Cookie.Attribute.DOMAIN, 'example.com');
      secretCookie.addAttribute(SDK.Cookie.Attribute.PATH, '/');
      secretCookie.addAttribute(SDK.Cookie.Attribute.HTTP_ONLY);

      sinon.stub(cookieModel, 'getCookiesForDomain').withArgs('https://example.com').resolves([
        publicCookie,
        secretCookie,
      ]);

      const cookies = await AiAssistance.StorageAgent.getCookiesForDomain(target, 'https://example.com');
      assert.exists(cookies);
      assert.lengthOf(cookies, 1, 'HttpOnly cookies must be filtered out');
      assert.strictEqual(cookies[0].name(), 'public-cookie');
    });
  });

  describe('StorageContext', () => {
    it('correctly formats the title for DOMStorageItem with a key', () => {
      const item = new AiAssistance.StorageItem.DOMStorageItem('https://example.com', 'https://example.com',
                                                               'https://example.com/', 'localStorage', 'key1');
      const context = new AiAssistance.StorageContext.StorageContext(item);
      assert.strictEqual(context.getTitle(), 'entry: key1 https://example.com');
    });

    it('correctly formats the title for DOMStorageItem without a key', () => {
      const item = new AiAssistance.StorageItem.DOMStorageItem('https://example.com', 'https://example.com',
                                                               'https://example.com/', 'localStorage');
      const context = new AiAssistance.StorageContext.StorageContext(item);
      assert.strictEqual(context.getTitle(), 'local storage: https://example.com');

      const sessionItem = new AiAssistance.StorageItem.DOMStorageItem('https://example.com', 'https://example.com',
                                                                      'https://example.com/', 'sessionStorage');
      const sessionContext = new AiAssistance.StorageContext.StorageContext(sessionItem);
      assert.strictEqual(sessionContext.getTitle(), 'session storage: https://example.com');
    });

    it('correctly formats the title for CookieItem with a name', () => {
      const item = new AiAssistance.StorageItem.CookieItem('https://example.com', 'https://example.com', 'cookie1');
      const context = new AiAssistance.StorageContext.StorageContext(item);
      assert.strictEqual(context.getTitle(), 'cookie: cookie1 https://example.com');
    });

    it('correctly formats the title for CookieItem without a name', () => {
      const item = new AiAssistance.StorageItem.CookieItem('https://example.com', 'https://example.com');
      const context = new AiAssistance.StorageContext.StorageContext(item);
      assert.strictEqual(context.getTitle(), 'cookies: https://example.com');
    });

    it('returns correct suggestions if a cookie is selected', async () => {
      const item = new AiAssistance.StorageItem.CookieItem('https://example.com', 'https://example.com', 'cookie1');
      const context = new AiAssistance.StorageContext.StorageContext(item);
      const suggestions = await context.getSuggestions();
      assert.deepEqual(suggestions, [
        {
          title: 'Why is this cookie set?',
          jslogContext: 'storage-cookie',
        },
        {
          title: 'Explain the value of this cookie',
          jslogContext: 'storage-cookie',
        },
      ]);
    });

    it('returns correct suggestions if a storage item is selected', async () => {
      const item = new AiAssistance.StorageItem.DOMStorageItem('https://example.com', 'https://example.com',
                                                               'https://example.com/', 'localStorage', 'key1');
      const context = new AiAssistance.StorageContext.StorageContext(item);
      const suggestions = await context.getSuggestions();
      assert.deepEqual(suggestions, [
        {
          title: 'What is the purpose of this storage entry?',
          jslogContext: 'storage-domstorage',
        },
        {
          title: 'Explain the value of this storage entry',
          jslogContext: 'storage-domstorage',
        },
      ]);
    });

    it('returns correct suggestions when a whole cookie context of a page is selected', async () => {
      const item = new AiAssistance.StorageItem.CookieItem('https://example.com', 'https://example.com');
      const context = new AiAssistance.StorageContext.StorageContext(item);
      const suggestions = await context.getSuggestions();
      assert.deepEqual(suggestions, [
        {
          title: 'Explain the cookies set by this page',
          jslogContext: 'storage-cookie',
        },
      ]);
    });

    it('returns correct suggestions if a storage bucket is selected', async () => {
      const item = new AiAssistance.StorageItem.DOMStorageItem('https://example.com', 'https://example.com',
                                                               'https://example.com/', 'localStorage');
      const context = new AiAssistance.StorageContext.StorageContext(item);
      const suggestions = await context.getSuggestions();
      assert.deepEqual(suggestions, [
        {
          title: 'Explain these storage items',
          jslogContext: 'storage-domstorage',
        },
      ]);
    });
  });

  describe('Server-Side Logging Disabling on key/name/value access', () => {
    beforeEach(() => {
      const target = universe.targetManager.primaryPageTarget();
      const cookieModel = target?.model(SDK.CookieModel.CookieModel);
      if (cookieModel) {
        sinon.stub(cookieModel, 'getCookiesForDomain').resolves([]);
      }
    });

    async function loggingIsDisabledDuringRun(
        aidaClient: ReturnType<typeof mockAidaClient>,
        item: AiAssistance.StorageItem.StorageItem,
        prompt = 'test',
        ): Promise<boolean> {
      const sideEffectPromise = Promise.withResolvers<boolean>();
      sideEffectPromise.resolve(true);
      const agent = new AiAssistance.StorageAgent.StorageAgent({
        aidaClient,
        serverSideLoggingAllowed: true,
        confirmSideEffectForTest: sinon.stub().returns(sideEffectPromise),
        targetManager: universe.targetManager,
      });
      const context = new AiAssistance.StorageContext.StorageContext(item);
      await Array.fromAsync(agent.run(prompt, {selected: context}));
      const call = aidaClient.doConversation.lastCall;
      assert.exists(call);
      return Boolean(call.args[0].metadata?.disable_user_content_logging);
    }

    it('turns off server-side logging if initial context has a defined cookie name', async () => {
      const aidaClient = mockAidaClient([[{explanation: 'test'}]]);
      const item = new AiAssistance.StorageItem.CookieItem('https://example.com', 'https://example.com', 'cookie1');
      assert.isTrue(await loggingIsDisabledDuringRun(aidaClient, item));
    });

    it('does not turn off server-side logging if initial context has no specific key or name', async () => {
      const aidaClient = mockAidaClient([[{explanation: 'test'}]]);
      const item = new AiAssistance.StorageItem.CookieItem('https://example.com', 'https://example.com');
      assert.isFalse(await loggingIsDisabledDuringRun(aidaClient, item));
    });

    it('turns off server-side logging immediately upon accessing cookie ', async () => {
      const aidaClient = mockAidaClient([
        [{functionCalls: [{name: 'listCookies', args: {origins: ['https://example.com']}}], explanation: ''}],
        [{explanation: 'Here are the cookies.'}],
      ]);
      const item = new AiAssistance.StorageItem.CookieItem('https://example.com', 'https://example.com');
      assert.isTrue(await loggingIsDisabledDuringRun(aidaClient, item, 'list cookies'));
    });

    it('turns off server-side logging immediately upon retrieving cookie values', async () => {
      const aidaClient = mockAidaClient([
        [{
          functionCalls:
              [{name: 'getCookieValues', args: {cookieNames: ['cookie1'], origins: ['https://example.com']}}],
          explanation: '',
        }],
        [{explanation: 'Here are the cookie values.'}],
      ]);
      const item = new AiAssistance.StorageItem.CookieItem('https://example.com', 'https://example.com');
      assert.isTrue(await loggingIsDisabledDuringRun(aidaClient, item, 'get cookie'));
    });

    it('turns off server-side logging immediately upon listing storage keys', async () => {
      const aidaClient = mockAidaClient([
        [{
          functionCalls: [{name: 'listStorageKeys', args: {type: 'localStorage', origins: ['https://example.com']}}],
          explanation: '',
        }],
        [{explanation: 'Here are the storage keys.'}],
      ]);
      const item = new AiAssistance.StorageItem.DOMStorageItem('https://example.com', 'https://example.com',
                                                               'https://example.com/', 'localStorage');
      assert.isTrue(await loggingIsDisabledDuringRun(aidaClient, item, 'list keys'));
    });

    it('turns off server-side logging immediately upon retrieving storage values', async () => {
      const aidaClient = mockAidaClient([
        [{
          functionCalls: [{
            name: 'getStorageValues',
            args: {type: 'localStorage', keys: ['key1'], origins: ['https://example.com']},
          }],
          explanation: '',
        }],
        [{explanation: 'Here are the storage values.'}],
      ]);
      const item = new AiAssistance.StorageItem.DOMStorageItem('https://example.com', 'https://example.com',
                                                               'https://example.com/', 'localStorage');
      assert.isTrue(await loggingIsDisabledDuringRun(aidaClient, item, 'get value'));
    });
  });
});
