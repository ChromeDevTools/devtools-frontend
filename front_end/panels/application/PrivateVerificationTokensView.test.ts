// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {dispatchClickEvent, raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import type * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Application from './application.js';

const {urlString} = Platform.DevToolsPath;
const {DEFAULT_VIEW, PrivateVerificationTokensView} = Application.PrivateVerificationTokensView;

function makeToken(
    overrides: Partial<Protocol.Storage.PrivateVerificationToken>&
    Pick<Protocol.Storage.PrivateVerificationToken, 'id'|'issuerOrigin'>): Protocol.Storage.PrivateVerificationToken {
  return {
    keyId: 10,
    expiration: 1700000000,
    creationTime: 1690000000,
    version: 1,
    token: 'AQIDBA==',
    ...overrides,
  };
}

function stubStorage(target: SDK.Target.Target, tokens: Protocol.Storage.PrivateVerificationToken[] = [],
                     configs: Protocol.Storage.PrivateVerificationTokensIssuerConfig[] = []) {
  const getTokensStub = sinon.stub(target.storageAgent(), 'invoke_getPrivateVerificationTokens')
                            .resolves({tokens, getError: () => undefined});
  const getConfigsStub = sinon.stub(target.storageAgent(), 'invoke_getPrivateVerificationTokensIssuerConfigs')
                             .resolves({configs, getError: () => undefined});
  return {getTokensStub, getConfigsStub};
}

/**
 * Returns the header passed to the EmptyWidget rendered in `container`, or null
 * if no EmptyWidget is rendered.
 */
function getEmptyStateHeader(container: HTMLElement): string|null {
  for (const element of container.querySelectorAll<HTMLElement>('devtools-widget')) {
    const config = UI.Widget.widgetConfigs.get(element);
    if (config?.widgetClass === UI.EmptyWidget.EmptyWidget) {
      return config.widgetParams?.header ?? null;
    }
  }
  return null;
}

async function createWidget() {
  const viewStub = createViewFunctionStub(PrivateVerificationTokensView);
  const component = new PrivateVerificationTokensView(undefined, viewStub);
  renderElementIntoDOM(component);
  await viewStub.nextInput;
  return {viewStub, component};
}

describeWithEnvironment('PrivateVerificationTokensView', () => {
  let target: SDK.Target.Target;

  beforeEach(() => {
    target = createTarget();
    target.setInspectedURL(urlString`http://example.com`);
  });

  describe('presenter', () => {
    it('includes issued and redeemable tokens for the current origin and omits unrelated tokens', async () => {
      stubStorage(target,
                  [
                    makeToken({id: '1', issuerOrigin: 'https://issuer.org/'}),
                    makeToken({id: '2', issuerOrigin: 'http://example.com', keyId: 20, token: 'BQYHCA=='}),
                    makeToken({id: '3', issuerOrigin: 'https://unrelated.org', keyId: 30, token: 'CQoLDA=='}),
                  ],
                  [
                    {issuerOrigin: 'https://issuer.org', redeemerOrigins: ['http://example.com']},
                    {issuerOrigin: 'http://example.com', redeemerOrigins: ['https://redeemer.org']},
                    {issuerOrigin: 'https://unrelated.org', redeemerOrigins: ['https://other-redeemer.org']},
                  ]);
      const {viewStub} = await createWidget();

      assert.deepEqual(viewStub.input.tokens, [
        {
          id: '2',
          issuerOrigin: urlString`http://example.com`,
          isIssuer: true,
          isRedeemer: false,
          keyId: 20,
          expiration: '2023-11-14T22:13:20.000Z',
          creationTime: '2023-07-22T04:26:40.000Z',
          version: 1,
          token: 'BQYHCA==',
        },
        {
          id: '1',
          issuerOrigin: urlString`https://issuer.org`,
          isIssuer: false,
          isRedeemer: true,
          keyId: 10,
          expiration: '2023-11-14T22:13:20.000Z',
          creationTime: '2023-07-22T04:26:40.000Z',
          version: 1,
          token: 'AQIDBA==',
        },
      ]);
    });

    it('formats unset timestamps with a placeholder', async () => {
      stubStorage(target, [makeToken({id: '1', issuerOrigin: 'http://example.com', expiration: 0, creationTime: 0})]);
      const {viewStub} = await createWidget();

      assert.strictEqual(viewStub.input.tokens[0].expiration, '—');
      assert.strictEqual(viewStub.input.tokens[0].creationTime, '—');
    });

    it('passes empty tokens list when there are no matching private verification tokens', async () => {
      stubStorage(target, [makeToken({id: '3', issuerOrigin: 'https://unrelated.org'})],
                  [{issuerOrigin: 'https://unrelated.org', redeemerOrigins: ['https://other-redeemer.org']}]);
      const {viewStub} = await createWidget();

      assert.deepEqual(viewStub.input.tokens, []);
    });

    it('passes empty tokens list when there is no primary page target', async () => {
      stubStorage(target, [makeToken({id: '1', issuerOrigin: 'http://example.com'})]);
      sinon.stub(SDK.TargetManager.TargetManager.instance(), 'primaryPageTarget').returns(null);
      const {viewStub} = await createWidget();

      assert.deepEqual(viewStub.input.tokens, []);
    });

    it('sorts tokens in natural ID order within the same issuer origin', async () => {
      stubStorage(target, [
        makeToken({id: '10', issuerOrigin: 'http://example.com'}),
        makeToken({id: '2', issuerOrigin: 'http://example.com'}),
        makeToken({id: '1', issuerOrigin: 'http://example.com'}),
      ]);
      const {viewStub} = await createWidget();

      assert.deepEqual(viewStub.input.tokens.map(t => t.id), ['1', '2', '10']);
    });

    it('updates selectedTokenId on select and deselect', async () => {
      stubStorage(target, [
        makeToken({id: '1', issuerOrigin: 'http://example.com'}),
        makeToken({id: '2', issuerOrigin: 'http://example.com'}),
      ]);
      const {viewStub} = await createWidget();
      assert.isNull(viewStub.input.selectedTokenId);

      viewStub.input.onSelect('2');
      await viewStub.nextInput;
      assert.strictEqual(viewStub.input.selectedTokenId, '2');

      viewStub.input.onDeselect();
      await viewStub.nextInput;
      assert.isNull(viewStub.input.selectedTokenId);
    });

    it('calls clearPrivateVerificationTokens once per normalized issuer origin when onDeleteAll is invoked',
       async () => {
         const clearStub = sinon.stub(target.storageAgent(), 'invoke_clearPrivateVerificationTokens').resolves({
           getError: () => undefined,
         });
         stubStorage(target,
                     [
                       makeToken({id: '1', issuerOrigin: 'https://issuer.org/'}),
                       makeToken({id: '2', issuerOrigin: 'https://issuer.org'}),
                     ],
                     [{issuerOrigin: 'https://issuer.org', redeemerOrigins: ['http://example.com']}]);
         const {viewStub} = await createWidget();

         viewStub.input.onDeleteAll();
         await viewStub.nextInput;

         sinon.assert.calledOnceWithExactly(clearStub, {issuerOrigin: 'https://issuer.org'});
       });

    it('calls deletePrivateVerificationToken when onDeleteToken is invoked', async () => {
      const deleteStub = sinon.stub(target.storageAgent(), 'invoke_deletePrivateVerificationToken').resolves({
        getError: () => undefined,
      });
      stubStorage(target, [makeToken({id: '42', issuerOrigin: 'http://example.com'})]);
      const {viewStub} = await createWidget();

      viewStub.input.onDeleteToken('42');
      await viewStub.nextInput;

      sinon.assert.calledOnceWithExactly(deleteStub, {tokenId: '42'});
    });

    it('enables tracking when shown and disables tracking when hidden', async () => {
      const trackingStub = sinon.stub(target.storageAgent(), 'invoke_setPrivateVerificationTokensTracking').resolves({
        getError: () => undefined,
      });
      stubStorage(target);

      const {component} = await createWidget();
      sinon.assert.calledOnceWithExactly(trackingStub, {enable: true});

      component.detach();
      sinon.assert.calledWithExactly(trackingStub, {enable: false});
    });

    it('refreshes tokens when privateVerificationTokensUpdated event is received', async () => {
      sinon.stub(target.storageAgent(), 'invoke_getPrivateVerificationTokensIssuerConfigs')
          .resolves({configs: [], getError: () => undefined});
      const getTokensStub = sinon.stub(target.storageAgent(), 'invoke_getPrivateVerificationTokens');
      getTokensStub.onFirstCall().resolves({tokens: [], getError: () => undefined});
      getTokensStub.onSecondCall().resolves(
          {tokens: [makeToken({id: '99', issuerOrigin: 'http://example.com'})], getError: () => undefined});

      const {viewStub} = await createWidget();
      assert.deepEqual(viewStub.input.tokens, []);

      const model = target.model(SDK.PrivateVerificationTokensModel.PrivateVerificationTokensModel);
      assert.isNotNull(model);
      model.privateVerificationTokensUpdated();
      await viewStub.nextInput;

      assert.lengthOf(viewStub.input.tokens, 1);
      assert.strictEqual(viewStub.input.tokens[0].id, '99');
    });

    it('does not render stale tokens when hidden while a fetch is in flight', async () => {
      sinon.stub(target.storageAgent(), 'invoke_getPrivateVerificationTokensIssuerConfigs')
          .resolves({configs: [], getError: () => undefined});
      const getTokensStub = sinon.stub(target.storageAgent(), 'invoke_getPrivateVerificationTokens');
      getTokensStub.onFirstCall().resolves({tokens: [], getError: () => undefined});
      const {promise: pendingTokens, resolve: resolveTokens} =
          Promise.withResolvers<Protocol.Storage.GetPrivateVerificationTokensResponse>();
      getTokensStub.onSecondCall().returns(pendingTokens);

      const {viewStub, component} = await createWidget();

      const model = target.model(SDK.PrivateVerificationTokensModel.PrivateVerificationTokensModel);
      assert.isNotNull(model);
      model.privateVerificationTokensUpdated();
      await raf();
      sinon.assert.calledTwice(getTokensStub);

      component.detach();
      resolveTokens({tokens: [makeToken({id: '99', issuerOrigin: 'http://example.com'})], getError: () => undefined});
      await raf();

      for (const call of viewStub.getCalls()) {
        assert.deepEqual(call.args[0].tokens, []);
      }
    });

    it('does not refetch tokens on selection changes', async () => {
      const {getTokensStub, getConfigsStub} =
          stubStorage(target, [makeToken({id: '1', issuerOrigin: 'http://example.com'})]);
      const {viewStub} = await createWidget();
      getTokensStub.resetHistory();
      getConfigsStub.resetHistory();

      viewStub.input.onSelect('1');
      await viewStub.nextInput;
      viewStub.input.onDeselect();
      await viewStub.nextInput;

      sinon.assert.notCalled(getTokensStub);
      sinon.assert.notCalled(getConfigsStub);
      assert.lengthOf(viewStub.input.tokens, 1);
    });
  });

  describe('view', () => {
    const defaultInput: Application.PrivateVerificationTokensView.ViewInput = {
      tokens: [],
      selectedTokenId: null,
      onSelect: () => {},
      onDeselect: () => {},
      onDeleteAll: () => {},
      onDeleteToken: () => {},
    };

    it('renders empty state and disables toolbar buttons when there are no tokens', () => {
      const container = document.createElement('div');
      renderElementIntoDOM(container);
      DEFAULT_VIEW(defaultInput, undefined, container);

      assert.isNull(container.querySelector('devtools-data-grid'));
      assert.strictEqual(getEmptyStateHeader(container), 'No private verification tokens for this origin');

      const clearAllButton = container.querySelector<Buttons.Button.Button>('.clear-all-button');
      assert.isNotNull(clearAllButton);
      assert.isTrue(clearAllButton.disabled);

      const deleteSelectedButton = container.querySelector<Buttons.Button.Button>('.delete-selected-button');
      assert.isNotNull(deleteSelectedButton);
      assert.isTrue(deleteSelectedButton.disabled);
    });

    const tokens: Application.PrivateVerificationTokensView.TokenRow[] = [
      {
        id: '1',
        issuerOrigin: urlString`https://issuer.org`,
        isIssuer: false,
        isRedeemer: true,
        keyId: 10,
        expiration: '2023-11-14T22:13:20.000Z',
        creationTime: '2023-07-22T04:26:40.000Z',
        version: 1,
        token: 'AQIDBA==',
      },
      {
        id: '2',
        issuerOrigin: urlString`http://example.com`,
        isIssuer: true,
        isRedeemer: false,
        keyId: 20,
        expiration: '—',
        creationTime: '—',
        version: 1,
        token: 'BQYHCA==',
      },
    ];

    async function renderWithTokens(overrides: Partial<Application.PrivateVerificationTokensView.ViewInput> = {}):
        Promise<HTMLElement> {
      const container = document.createElement('div');
      renderElementIntoDOM(container);
      DEFAULT_VIEW({...defaultInput, tokens, ...overrides}, undefined, container);
      await raf();
      return container;
    }

    it('renders a row for each token with its display values', async () => {
      const container = await renderWithTokens();

      assert.isNull(getEmptyStateHeader(container));
      const rows = container.querySelectorAll('devtools-data-grid table tr');
      assert.lengthOf(rows, 3);
      assert.deepEqual(Array.from(rows[1].querySelectorAll('td')).map(td => td.textContent), [
        'https://issuer.org',
        'false',
        'true',
        '1',
        '10',
        '2023-11-14T22:13:20.000Z',
        '2023-07-22T04:26:40.000Z',
        '1',
        'AQIDBA==',
      ]);
      assert.deepEqual(Array.from(rows[2].querySelectorAll('td')).map(td => td.textContent), [
        'http://example.com',
        'true',
        'false',
        '2',
        '20',
        '—',
        '—',
        '1',
        'BQYHCA==',
      ]);
    });

    it('calls onDeleteAll when the clear all button is clicked', async () => {
      const onDeleteAll = sinon.spy();
      const container = await renderWithTokens({onDeleteAll});

      const clearAllButton = container.querySelector<Buttons.Button.Button>('.clear-all-button');
      assert.isNotNull(clearAllButton);
      assert.isFalse(clearAllButton.disabled);
      dispatchClickEvent(clearAllButton);
      sinon.assert.calledOnce(onDeleteAll);
    });

    it('calls onDeleteToken with the selected token when the delete selected button is clicked', async () => {
      const onDeleteToken = sinon.spy();
      const container = await renderWithTokens({selectedTokenId: '1', onDeleteToken});

      const deleteSelectedButton = container.querySelector<Buttons.Button.Button>('.delete-selected-button');
      assert.isNotNull(deleteSelectedButton);
      assert.isFalse(deleteSelectedButton.disabled);
      dispatchClickEvent(deleteSelectedButton);
      sinon.assert.calledOnceWithExactly(onDeleteToken, '1');
    });

    it('marks only the selected token row as selected', async () => {
      const container = await renderWithTokens({selectedTokenId: '1'});

      const rows = container.querySelectorAll('devtools-data-grid table tr');
      assert.isTrue(rows[1].hasAttribute('selected'));
      assert.isFalse(rows[2].hasAttribute('selected'));
    });

    it('calls onSelect when a row is selected', async () => {
      const onSelect = sinon.spy();
      const container = await renderWithTokens({onSelect});

      const rows = container.querySelectorAll('devtools-data-grid table tr');
      rows[2].dispatchEvent(new CustomEvent('select'));
      sinon.assert.calledOnceWithExactly(onSelect, '2');
    });
  });
});
