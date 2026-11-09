// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Protocol from '../../generated/protocol.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {createNetworkRequest} from '../../testing/NetworkRequestHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as Network from './network.js';

function createSignedExchangeRequest() {
  const request = createNetworkRequest({});
  const redirectDestination = createNetworkRequest({});
  sinon.stub(request, 'redirectDestination').returns(redirectDestination);
  sinon.stub(request, 'signedExchangeInfo').returns({
    outerResponse: {
      url: 'https://example.com/test.sxg',
      status: 200,
      statusText: 'OK',
      headers: {},
      mimeType: 'application/signed-exchange;v=b3',
      charset: 'utf-8',
      connectionReused: false,
      connectionId: 1,
      encodedDataLength: 100,
      securityState: Protocol.Security.SecurityState.Secure,
    },
    header: {
      requestUrl: 'https://example.com/index.html',
      responseCode: 200,
      responseHeaders: {'content-type': 'text/html'},
      signatures: [{
        label: 'sig1',
        signature: 'deadbeef',
        integrity: 'digest/mi-sha256-03',
        certUrl: 'https://example.com/cert.cbor',
        certSha256: 'aabbccdd',
        validityUrl: 'https://example.com/resource.validity.msg',
        date: 1550000000,
        expires: 1550600000,
        certificates: ['cert-data'],
      }],
      headerIntegrity: 'sha256-test',
    },
    securityDetails: {
      protocol: 'TLS 1.3',
      keyExchange: '',
      cipher: 'AES_128_GCM',
      subjectName: 'example.com',
      sanList: ['example.com'],
      issuer: 'Example CA',
      validFrom: 1540000000,
      validTo: 1560000000,
      signedCertificateTimestampList: [],
      certificateTransparencyCompliance: Protocol.Network.CertificateTransparencyCompliance.Compliant,
      certificateId: 0 as Protocol.Security.CertificateId,
      encryptedClientHello: false,
    },
    errors: [{
      message: 'Invalid signature',
      signatureIndex: 0,
      errorField: Protocol.Network.SignedExchangeErrorField.SignatureSig,
    }],
    hasExtraInfo: false,
  });
  return {request, redirectDestination};
}

describe('SignedExchangeInfoView', () => {
  setupLocaleHooks();

  it('passes errors, header, signatures, and security details to the view', async () => {
    const {request} = createSignedExchangeRequest();
    const view = createViewFunctionStub(Network.SignedExchangeInfoView.SignedExchangeInfoView);
    const widget = new Network.SignedExchangeInfoView.SignedExchangeInfoView(request, view);
    renderElementIntoDOM(widget);
    const input = await view.nextInput;
    assert.isNotNull(input);

    assert.deepEqual(input.errors, ['Invalid signature']);
    assert.strictEqual(input.header?.requestUrl, 'https://example.com/index.html');
    assert.isTrue(input.header?.hasRedirectDestination);
    assert.strictEqual(input.header?.responseCode, '200');
    assert.strictEqual(input.header?.headerIntegrity, 'sha256-test');
    assert.deepEqual(input.header?.responseHeaders, [{name: 'content-type', value: 'text/html'}]);
    assert.isTrue(input.header?.signatures[0].hasSignatureError);
    assert.isFalse(input.header?.signatures[0].hasCertUrlError);
    assert.strictEqual(input.securityDetails?.subjectName, 'example.com');
    assert.strictEqual(input.securityDetails?.issuer, 'Example CA');
  });

  it('passes null to the view when switching to undefined or a request without signed exchange info', async () => {
    const {request} = createSignedExchangeRequest();
    const view = createViewFunctionStub(Network.SignedExchangeInfoView.SignedExchangeInfoView);
    const widget = new Network.SignedExchangeInfoView.SignedExchangeInfoView(request, view);
    renderElementIntoDOM(widget);
    assert.isNotNull(await view.nextInput);

    const nextNullForNonSxg = view.nextInput;
    widget.request = createNetworkRequest({});
    assert.isNull(await nextNullForNonSxg);

    const nextValid = view.nextInput;
    widget.request = request;
    assert.isNotNull(await nextValid);

    const nextNullForUndefined = view.nextInput;
    widget.request = undefined;
    assert.isNull(await nextNullForUndefined);
  });

  it('reveals redirect destination request when onViewRequest is called', async () => {
    const {request, redirectDestination} = createSignedExchangeRequest();
    const view = createViewFunctionStub(Network.SignedExchangeInfoView.SignedExchangeInfoView);
    const widget = new Network.SignedExchangeInfoView.SignedExchangeInfoView(request, view);
    renderElementIntoDOM(widget);
    const input = await view.nextInput;
    assert.isNotNull(input);

    const revealStub = sinon.stub(Common.Revealer.RevealerRegistry.instance(), 'reveal').resolves();
    input.onViewRequest();
    sinon.assert.calledOnceWithExactly(revealStub, redirectDestination, false);
  });

  it('opens certificate viewer when onViewCertificate is called', async () => {
    const {request} = createSignedExchangeRequest();
    const view = createViewFunctionStub(Network.SignedExchangeInfoView.SignedExchangeInfoView);
    const widget = new Network.SignedExchangeInfoView.SignedExchangeInfoView(request, view);
    renderElementIntoDOM(widget);
    const input = await view.nextInput;
    assert.isNotNull(input);

    const showCertStub = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'showCertificateViewer');
    input.onViewCertificate(['cert-data']);
    sinon.assert.calledOnceWithExactly(showCertStub, ['cert-data']);
  });

  it('renders signed exchange tree in DEFAULT_VIEW', () => {
    const target = document.createElement('div');
    Network.SignedExchangeInfoView.DEFAULT_VIEW(
        {
          errors: ['Invalid signature'],
          header: {
            requestUrl: 'https://example.com/index.html',
            hasRedirectDestination: true,
            responseCode: '200',
            headerIntegrity: 'sha256-test',
            responseHeaders: [{name: 'content-type', value: 'text/html'}],
            signatures: [{
              label: 'sig1',
              signature: 'deadbeef',
              hasSignatureError: true,
              hasCertUrlError: false,
              integrity: 'digest/mi-sha256-03',
              hasIntegrityError: false,
              hasCertSha256Error: false,
              validityUrl: 'https://example.com/resource.validity.msg',
              hasValidityUrlError: false,
              date: '2019-02-12T19:33:20.000Z',
              expires: '2019-02-19T18:13:20.000Z',
              hasTimestampsError: false,
              certUrl: 'https://example.com/cert.cbor',
              certificates: ['cert-data'],
              certSha256: 'aabbccdd',
            }],
          },
          securityDetails: {
            subjectName: 'example.com',
            validFrom: '2018-10-19T23:33:20.000Z',
            validUntil: '2019-06-08T13:20:00.000Z',
            issuer: 'Example CA',
          },
          onViewRequest: () => {},
          onViewCertificate: () => {},
        },
        undefined,
        target,
    );

    const templateContent = target.querySelector('devtools-tree template')?.innerHTML ?? '';
    assert.include(templateContent, 'Invalid signature');
    assert.include(templateContent, 'https://example.com/index.html');
    assert.include(templateContent, 'de ad be ef ');
    assert.include(templateContent, 'Example CA');

    Network.SignedExchangeInfoView.DEFAULT_VIEW(null, undefined, target);
    assert.isNull(target.querySelector('devtools-tree'));
    assert.lengthOf(target.children, 0);
  });
});
