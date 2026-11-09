// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {
  assertScreenshot,
  doubleRaf,
  querySelectorErrorOnMissing,
  renderElementIntoDOM,
} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {createNetworkRequest} from '../../testing/NetworkRequestHelpers.js';
import {getMainFrame, navigate} from '../../testing/ResourceTreeHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import {render} from '../../ui/lit/lit.js';
import * as NetworkForward from '../network/forward/forward.js';

import * as Security from './security.js';

const {urlString} = Platform.DevToolsPath;

function createSecurityDetails(overrides: Partial<Protocol.Network.SecurityDetails> = {}):
    Protocol.Network.SecurityDetails {
  return {
    protocol: 'TLS 1.3',
    keyExchange: '',
    cipher: 'AES_128_GCM',
    certificateId: 0 as Protocol.Security.CertificateId,
    subjectName: 'example.com',
    sanList: [],
    issuer: 'Test CA',
    validFrom: 0,
    validTo: 1,
    signedCertificateTimestampList: [],
    certificateTransparencyCompliance: Protocol.Network.CertificateTransparencyCompliance.Unknown,
    encryptedClientHello: false,
    ...overrides,
  };
}

function createCertificateSecurityState(overrides: Partial<Protocol.Security.CertificateSecurityState> = {}):
    Protocol.Security.CertificateSecurityState {
  return {
    protocol: 'TLS 1.3',
    keyExchange: '',
    cipher: 'AES_128_GCM',
    certificate: [],
    subjectName: 'example.com',
    issuer: 'Test CA',
    validFrom: 0,
    validTo: 1,
    certificateHasWeakSignature: false,
    certificateHasSha1Signature: false,
    modernSSL: true,
    obsoleteSslProtocol: false,
    obsoleteSslKeyExchange: false,
    obsoleteSslCipher: false,
    obsoleteSslSignature: false,
    ...overrides,
  };
}

describe('renderHighlightedUrl', () => {
  function renderUrl(url: Platform.DevToolsPath.UrlString, securityState: string): Element {
    const container = document.createElement('div');
    render(Security.SecurityPanel.renderHighlightedUrl(url, securityState), container);
    assert.isNotNull(container.firstElementChild);
    return container.firstElementChild;
  }

  it('renders a URL without a scheme separator as plain text', () => {
    const highlightedUrl = renderUrl(urlString`foo.bar`, Protocol.Security.SecurityState.Secure);

    assert.strictEqual(highlightedUrl.textContent, 'foo.bar');
    assert.isFalse(highlightedUrl.classList.contains('highlighted-url'));
  });

  it('renders a URL with a highlighted scheme', () => {
    const highlightedUrl = renderUrl(urlString`https://foo.bar`, Protocol.Security.SecurityState.Secure);

    assert.strictEqual(highlightedUrl.textContent, 'https://foo.bar');
    assert.isTrue(highlightedUrl.classList.contains('highlighted-url'));

    const scheme = highlightedUrl.querySelector('.url-scheme-secure');
    assert.isNotNull(scheme);
    assert.strictEqual(scheme.textContent, 'https');

    const schemeSeparator = highlightedUrl.querySelector('.url-scheme-separator');
    assert.isNotNull(schemeSeparator);
    assert.strictEqual(schemeSeparator.textContent, '://');
  });
});

describe('renderCertificateViewerButton', () => {
  function renderButton(text: string, jslogContext: string, onClick: () => void): Buttons.Button.Button {
    const container = document.createElement('div');
    render(Security.SecurityPanel.renderCertificateViewerButton(text, jslogContext, onClick), container);
    renderElementIntoDOM(container);
    return querySelectorErrorOnMissing<Buttons.Button.Button>(container, 'devtools-button.origin-button');
  }

  it('renders button with expected attributes and properties', () => {
    const onClick = sinon.spy();
    const button = renderButton('View certificate', 'security.test-context', onClick);

    assert.instanceOf(button, Buttons.Button.Button);
    assert.strictEqual(button.textContent?.trim(), 'View certificate');
    assert.strictEqual(button.title, 'View certificate');
    assert.strictEqual(button.jslogContext, 'security.test-context');
  });

  it('consumes event and invokes callback on click', () => {
    const onClick = sinon.spy();
    const button = renderButton('View certificate', 'security.test-context', onClick);

    const clickEvent = new CustomEvent('click', {bubbles: true, cancelable: true});
    const consumeSpy = sinon.spy(clickEvent, 'consume');

    button.dispatchEvent(clickEvent);

    sinon.assert.calledOnce(consumeSpy);
    sinon.assert.calledOnce(onClick);
  });
});

describe('getSecurityStateIconForDetailedView', () => {
  it('returns template result with expected icon name and class', () => {
    const template = Security.SecurityPanel.getSecurityStateIconForDetailedView(Protocol.Security.SecurityState.Secure,
                                                                                'test-class');
    const container = document.createElement('div');
    render(template, container);
    const icon = querySelectorErrorOnMissing(container, 'devtools-icon');
    assert.strictEqual(icon.getAttribute('name'), 'lock');
    assert.strictEqual(icon.getAttribute('class'), 'test-class');
  });
});

describe('getSecurityStateIconForOverview', () => {
  it('returns template result with expected icon name, class, and title', () => {
    const template = Security.SecurityPanel.getSecurityStateIconForOverview(Protocol.Security.SecurityState.Secure,
                                                                            'test-class', 'Secure tooltip');
    const container = document.createElement('div');
    render(template, container);
    const icon = querySelectorErrorOnMissing(container, 'devtools-icon');
    assert.strictEqual(icon.getAttribute('name'), 'lock');
    assert.strictEqual(icon.getAttribute('class'), 'test-class');
    assert.strictEqual(icon.getAttribute('title'), 'Secure tooltip');
  });
});

describeWithEnvironment('SecurityOriginView', () => {
  function createOriginState(securityDetails: Partial<Protocol.Network.SecurityDetails> = {}):
      Security.SecurityPanel.OriginState {
    return {
      securityState: Protocol.Security.SecurityState.Secure,
      securityDetails: createSecurityDetails(securityDetails),
      loadedFromCache: false,
    };
  }

  function getDetailsTableRows(section: HTMLElement): string[][] {
    return [...section.querySelectorAll<HTMLTableRowElement>('.details-table-row')].map(
        row => [...row.cells].map(cell => cell.textContent ?? ''));
  }

  async function createOriginView(
      origin: Platform.DevToolsPath.UrlString = urlString`https://foo.bar`,
      opts: Partial<{
        securityState: Protocol.Security.SecurityState,
        securityDetails: Protocol.Network.SecurityDetails | null,
        loadedFromCache: boolean,
        includeCommonStyles: boolean,
      }> = {},
      ): Promise<Security.SecurityPanel.SecurityOriginView> {
    const view = new Security.SecurityPanel.SecurityOriginView();
    view.origin = origin;
    view.securityState = opts.securityState ?? Protocol.Security.SecurityState.Secure;
    view.securityDetails = opts.securityDetails !== undefined ? opts.securityDetails : createSecurityDetails();
    view.loadedFromCache = opts.loadedFromCache ?? false;
    renderElementIntoDOM(view, {includeCommonStyles: opts.includeCommonStyles});
    await UI.Widget.Widget.allUpdatesComplete;
    return view;
  }

  it('updates security details when the security state changes', async () => {
    const view = await createOriginView(urlString`https://foo.bar`, {
      securityState: Protocol.Security.SecurityState.Unknown,
      securityDetails: null,
      loadedFromCache: false,
    });
    const securityStateSection = querySelectorErrorOnMissing(view.element, '.security-state-section');
    assert.include(securityStateSection.textContent, 'No security information');

    const securityDetails = createSecurityDetails({
      protocol: 'TLS 1.3',
      subjectName: 'foo.bar',
    });
    view.securityState = Protocol.Security.SecurityState.Secure;
    view.securityDetails = securityDetails;
    await UI.Widget.Widget.allUpdatesComplete;

    assert.notExists(view.element.querySelector('.security-state-section'));
    const connectionSection = querySelectorErrorOnMissing(view.element, '.connection-section');
    assert.deepInclude(getDetailsTableRows(connectionSection), ['Protocol', 'TLS 1.3']);
    const certificateSection = querySelectorErrorOnMissing(view.element, '.certificate-section');
    assert.deepInclude(getDetailsTableRows(certificateSection), ['Subject', 'foo.bar']);
  });

  describe('security state section', () => {
    const cases = [
      {
        securityState: Protocol.Security.SecurityState.Secure,
        title: 'Secure',
        description: 'This origin is a non-HTTPS secure origin',
      },
      {
        securityState: Protocol.Security.SecurityState.Insecure,
        title: 'Not secure',
        description: 'Your connection to this origin isn’t secure',
      },
      {
        securityState: Protocol.Security.SecurityState.Unknown,
        title: 'No security information',
        description: 'No security details are available for this origin',
      },
    ];
    for (const {securityState, title, description} of cases) {
      it(`renders when securityState is ${securityState} without security details`, async () => {
        const view = await createOriginView(urlString`https://foo.bar`, {
          securityState,
          securityDetails: null,
          loadedFromCache: false,
        });
        const section = querySelectorErrorOnMissing(view.element, '.security-state-section');
        const heading = querySelectorErrorOnMissing(section, '.origin-view-section-title');
        assert.strictEqual(heading.textContent, title);
        assert.strictEqual(heading.getAttribute('role'), 'heading');
        assert.strictEqual(heading.getAttribute('aria-level'), '2');
        assert.include(section.textContent, description);
      });
    }
  });

  describe('connection section', () => {
    async function getConnectionDetailsRows(securityDetails: Partial<Protocol.Network.SecurityDetails> = {}):
        Promise<string[][]> {
      const view =
          await createOriginView(urlString`https://foo.bar`, {securityDetails: createSecurityDetails(securityDetails)});
      const connectionSection = querySelectorErrorOnMissing(view.element, '.connection-section');
      return getDetailsTableRows(connectionSection);
    }

    it('renders the heading', async () => {
      const view = await createOriginView();

      const connectionSection = querySelectorErrorOnMissing(view.element, '.connection-section');

      const heading = querySelectorErrorOnMissing(connectionSection, '.origin-view-section-title');
      assert.strictEqual(heading.textContent, 'Connection');
      assert.strictEqual(heading.getAttribute('role'), 'heading');
      assert.strictEqual(heading.getAttribute('aria-level'), '2');
    });

    it('does not render without security details', async () => {
      const view = await createOriginView(urlString`https://foo.bar`, {
        securityState: Protocol.Security.SecurityState.Secure,
        securityDetails: null,
        loadedFromCache: false,
      });

      assert.notExists(view.element.querySelector('.connection-section'));
    });

    it('renders all connection details in order', async () => {
      assert.deepEqual(await getConnectionDetailsRows({
                         protocol: 'TLS 1.3',
                         keyExchange: 'ECDHE_RSA',
                         keyExchangeGroup: 'X25519',
                         serverSignatureAlgorithm: 0x0804,
                         cipher: 'AES_128_GCM',
                         mac: 'HMAC-SHA256',
                         encryptedClientHello: true,
                       }),
                       [
                         ['Protocol', 'TLS 1.3'],
                         ['Key exchange', 'ECDHE_RSA with X25519'],
                         ['Server signature', 'RSA-PSS with SHA-256'],
                         ['Cipher', 'AES_128_GCM with HMAC-SHA256'],
                         ['Encrypted ClientHello', 'enabled'],
                       ]);
    });

    it('renders the protocol', async () => {
      assert.deepInclude(await getConnectionDetailsRows({protocol: 'TLS 1.2'}), ['Protocol', 'TLS 1.2']);
    });

    describe('key exchange', () => {
      it('renders the algorithm and group', async () => {
        assert.deepInclude(await getConnectionDetailsRows({keyExchange: 'ECDHE_RSA', keyExchangeGroup: 'X25519'}),
                           ['Key exchange', 'ECDHE_RSA with X25519']);
      });

      it('renders only the algorithm', async () => {
        assert.deepInclude(await getConnectionDetailsRows({keyExchange: 'ECDHE_RSA', keyExchangeGroup: undefined}),
                           ['Key exchange', 'ECDHE_RSA']);
      });

      it('renders only the group', async () => {
        assert.deepInclude(await getConnectionDetailsRows({keyExchange: '', keyExchangeGroup: 'X25519'}),
                           ['Key exchange', 'X25519']);
      });

      it('does not render when both are unavailable', async () => {
        const rowNames = (await getConnectionDetailsRows({
                           keyExchange: '',
                           keyExchangeGroup: undefined,
                         })).map(([key]) => key);
        assert.notInclude(rowNames, 'Key exchange');
      });
    });

    describe('server signature', () => {
      it('renders a known algorithm', async () => {
        assert.deepInclude(await getConnectionDetailsRows({serverSignatureAlgorithm: 0x0804}),
                           ['Server signature', 'RSA-PSS with SHA-256']);
      });

      it('renders an unknown algorithm', async () => {
        assert.deepInclude(await getConnectionDetailsRows({serverSignatureAlgorithm: 0xffff}),
                           ['Server signature', 'unknown (65535)']);
      });

      it('does not render when unavailable', async () => {
        const rowNames = (await getConnectionDetailsRows({serverSignatureAlgorithm: undefined})).map(([key]) => key);
        assert.notInclude(rowNames, 'Server signature');
      });
    });

    describe('cipher', () => {
      it('renders with a MAC', async () => {
        assert.deepInclude(await getConnectionDetailsRows({cipher: 'AES_128_GCM', mac: 'HMAC-SHA256'}),
                           ['Cipher', 'AES_128_GCM with HMAC-SHA256']);
      });

      it('renders without a MAC', async () => {
        assert.deepInclude(await getConnectionDetailsRows({cipher: 'AES_128_GCM', mac: undefined}),
                           ['Cipher', 'AES_128_GCM']);
      });
    });

    describe('Encrypted ClientHello', () => {
      it('renders when enabled', async () => {
        assert.deepInclude(await getConnectionDetailsRows({encryptedClientHello: true}),
                           ['Encrypted ClientHello', 'enabled']);
      });

      it('does not render when disabled', async () => {
        const rowNames = (await getConnectionDetailsRows({encryptedClientHello: false})).map(([key]) => key);
        assert.notInclude(rowNames, 'Encrypted ClientHello');
      });
    });
  });

  describe('title section', () => {
    it('renders the title, origin, and Network panel button', async () => {
      const origin = urlString`https://foo.bar`;
      const view = await createOriginView(origin);

      assert.isTrue(view.element.classList.contains('security-origin-view'));

      const titleSection = view.element.querySelector('.title-section');
      assert.instanceOf(titleSection, HTMLElement);

      const title = titleSection.querySelector('.title-section-header');
      assert.instanceOf(title, HTMLElement);
      assert.strictEqual(title.textContent, 'Origin');
      assert.strictEqual(title.getAttribute('role'), 'heading');
      assert.strictEqual(title.getAttribute('aria-level'), '1');

      const originDisplay = titleSection.querySelector('.origin-display');
      assert.instanceOf(originDisplay, HTMLElement);
      assert.strictEqual(originDisplay.textContent, origin);

      const networkButton = titleSection.querySelector('.view-network-button devtools-button');
      assert.instanceOf(networkButton, HTMLElement);
      assert.strictEqual(networkButton.textContent, 'View requests in Network panel');
    });

    it('updates the origin display when the security state changes', async () => {
      const originState = createOriginState();
      const view = await createOriginView(urlString`https://foo.bar`, originState);

      const initialOriginDisplay = view.element.querySelector('.origin-display');
      assert.instanceOf(initialOriginDisplay, HTMLElement);

      const initialIcon = initialOriginDisplay.querySelector('devtools-icon');
      assert.instanceOf(initialIcon, HTMLElement);
      assert.strictEqual(initialIcon.getAttribute('name'), 'lock');
      assert.isTrue(initialIcon.classList.contains('security-property-secure'));

      assert.exists(initialOriginDisplay.querySelector('.url-scheme-secure'));

      view.securityState = Protocol.Security.SecurityState.Insecure;
      view.securityDetails = originState.securityDetails;
      await UI.Widget.Widget.allUpdatesComplete;

      const updatedOriginDisplay = view.element.querySelector('.origin-display');
      assert.instanceOf(updatedOriginDisplay, HTMLElement);

      const updatedIcon = updatedOriginDisplay.querySelector('devtools-icon');
      assert.instanceOf(updatedIcon, HTMLElement);
      assert.strictEqual(updatedIcon.getAttribute('name'), 'warning');
      assert.isTrue(updatedIcon.classList.contains('security-property-insecure'));
      assert.isFalse(updatedIcon.classList.contains('security-property-secure'));

      assert.exists(updatedOriginDisplay.querySelector('.url-scheme-insecure'));
      assert.notExists(updatedOriginDisplay.querySelector('.url-scheme-secure'));
    });

    it('reveals requests in the Network panel', async () => {
      const revealStub = sinon.stub(Common.Revealer.RevealerRegistry.instance(), 'reveal').resolves();
      const view = await createOriginView(urlString`https://foo.bar`);

      const networkButton = view.element.querySelector('.view-network-button devtools-button') as HTMLElement;
      assert.instanceOf(networkButton, HTMLElement);
      networkButton.click();

      sinon.assert.calledOnce(revealStub);
      const [requestFilter] = revealStub.firstCall.args;
      assert.instanceOf(requestFilter, NetworkForward.UIFilter.UIRequestFilter);
      assert.deepEqual(requestFilter.filters, [
        {filterType: NetworkForward.UIFilter.FilterType.Domain, filterValue: 'foo.bar'},
        {filterType: NetworkForward.UIFilter.FilterType.Scheme, filterValue: 'https'},
      ]);
    });
  });

  describe('certificate section', () => {
    async function getCertificateDetailsRows(securityDetails: Partial<Protocol.Network.SecurityDetails> = {}):
        Promise<string[][]> {
      const view =
          await createOriginView(urlString`https://foo.bar`, {securityDetails: createSecurityDetails(securityDetails)});
      const certificateSection = querySelectorErrorOnMissing(view.element, '.certificate-section');
      return getDetailsTableRows(certificateSection);
    }

    it('renders the heading', async () => {
      const view = await createOriginView();

      const certificateSection = querySelectorErrorOnMissing(view.element, '.certificate-section');
      const heading = querySelectorErrorOnMissing(certificateSection, '.origin-view-section-title');
      assert.strictEqual(heading.textContent, 'Certificate');
      assert.strictEqual(heading.getAttribute('role'), 'heading');
      assert.strictEqual(heading.getAttribute('aria-level'), '2');
    });

    it('does not render without security details', async () => {
      const view = await createOriginView(urlString`https://foo.bar`, {
        securityState: Protocol.Security.SecurityState.Secure,
        securityDetails: null,
        loadedFromCache: false,
      });

      assert.notExists(view.element.querySelector('.certificate-section'));
    });

    it('renders all certificate details in order', async () => {
      assert.deepEqual(await getCertificateDetailsRows({
                         subjectName: 'example.com',
                         sanList: ['san.example.com'],
                         validFrom: 0,
                         validTo: 86400,
                         issuer: 'Test CA',
                       }),
                       [
                         ['Subject', 'example.com'],
                         ['SAN', 'san.example.com'],
                         ['Valid from', 'Thu, 01 Jan 1970 00:00:00 GMT'],
                         ['Valid until', 'Fri, 02 Jan 1970 00:00:00 GMT'],
                         ['Issuer', 'Test CA'],
                         ['', 'Open full certificate details'],
                       ]);
    });

    it('opens the certificate viewer', async () => {
      const getCertificate = sinon.stub(SDK.NetworkManager.MultitargetNetworkManager.instance(), 'getCertificate')
                                 .resolves(['certificate']);
      const showCertificateViewer =
          sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'showCertificateViewer');
      const showCertificateViewerCall = expectCall(showCertificateViewer);
      const view = await createOriginView();

      const certificateSection = querySelectorErrorOnMissing(view.element, '.certificate-section');
      const certificateButton =
          querySelectorErrorOnMissing(certificateSection, 'devtools-button.origin-button') as HTMLElement;
      certificateButton.click();
      await showCertificateViewerCall;

      sinon.assert.calledOnceWithExactly(getCertificate, 'https://foo.bar');
      sinon.assert.calledOnceWithExactly(showCertificateViewer, ['certificate']);
    });

    it('does not open the certificate viewer when no certificates are returned', async () => {
      const getCertificate =
          sinon.stub(SDK.NetworkManager.MultitargetNetworkManager.instance(), 'getCertificate').resolves([]);
      const showCertificateViewer =
          sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'showCertificateViewer');
      const view = await createOriginView();

      const certificateSection = querySelectorErrorOnMissing(view.element, '.certificate-section');
      const certificateButton =
          querySelectorErrorOnMissing(certificateSection, 'devtools-button.origin-button') as HTMLElement;
      certificateButton.click();
      await getCertificate.firstCall.returnValue;

      sinon.assert.calledOnceWithExactly(getCertificate, 'https://foo.bar');
      sinon.assert.notCalled(showCertificateViewer);
    });
  });

  describe('certificate transparency section', () => {
    it('renders the heading, SCT summary, and details', async () => {
      const view = await createOriginView(urlString`https://foo.bar`, {
        securityDetails: createSecurityDetails({
          signedCertificateTimestampList: [{
            logDescription: 'Test log',
            logId: 'AABB',
            status: 'Verified',
            origin: 'Embedded in certificate',
            timestamp: 1_000,
            hashAlgorithm: 'SHA-256',
            signatureAlgorithm: 'ECDSA',
            signatureData: 'CCDD',
          }],
          certificateTransparencyCompliance: Protocol.Network.CertificateTransparencyCompliance.Compliant,
        }),
      });

      const section = querySelectorErrorOnMissing(view.element, '.certificate-transparency-section');
      const heading = querySelectorErrorOnMissing(section, '.origin-view-section-title');
      assert.strictEqual(heading.textContent, 'Certificate Transparency');
      assert.strictEqual(heading.getAttribute('role'), 'heading');
      assert.strictEqual(heading.getAttribute('aria-level'), '2');

      const summary = querySelectorErrorOnMissing(section, '.sct-summary');
      assert.deepEqual(getDetailsTableRows(summary), [['SCT', 'Test log (Embedded in certificate, Verified)']]);

      const details = querySelectorErrorOnMissing(section, '.sct-details');
      assert.deepEqual(getDetailsTableRows(details), [
        ['Log name', 'Test log'],
        ['Log ID', 'AA BB '],
        ['Validation status', 'Verified'],
        ['Source', 'Embedded in certificate'],
        ['Issued at', 'Thu, 01 Jan 1970 00:00:01 GMT'],
        ['Hash algorithm', 'SHA-256'],
        ['Signature algorithm', 'ECDSA'],
        ['Signature data', 'CC DD '],
      ]);
    });

    it('does not render when the SCT list is empty and compliance is unknown', async () => {
      const view = await createOriginView(urlString`https://foo.bar`, {
        securityDetails: createSecurityDetails({
          signedCertificateTimestampList: [],
          certificateTransparencyCompliance: Protocol.Network.CertificateTransparencyCompliance.Unknown,
        }),
      });

      assert.notExists(view.element.querySelector('.certificate-transparency-section'));
    });

    it('renders without a note when the SCT list is not empty and compliance is unknown', async () => {
      const view = await createOriginView(urlString`https://foo.bar`, {
        securityDetails: createSecurityDetails({
          signedCertificateTimestampList: [{
            logDescription: 'Test log',
            logId: '00',
            status: 'Verified',
            origin: 'Embedded in certificate',
            timestamp: 0,
            hashAlgorithm: 'SHA-256',
            signatureAlgorithm: 'ECDSA',
            signatureData: '00',
          }],
          certificateTransparencyCompliance: Protocol.Network.CertificateTransparencyCompliance.Unknown,
        }),
      });

      const section = querySelectorErrorOnMissing(view.element, '.certificate-transparency-section');
      assert.notExists(section.querySelector('.origin-view-section-notes'));
    });

    const cases = [
      {
        compliance: Protocol.Network.CertificateTransparencyCompliance.Compliant,
        expectedNote: 'This request complies with Chrome’s Certificate Transparency policy',
      },
      {
        compliance: Protocol.Network.CertificateTransparencyCompliance.NotCompliant,
        expectedNote: 'This request doesn’t comply with Chrome’s Certificate Transparency policy',
      },
    ];
    for (const {compliance, expectedNote} of cases) {
      it(`renders with a note when compliance is ${compliance}`, async () => {
        const view = await createOriginView(urlString`https://foo.bar`, {
          securityDetails: createSecurityDetails({
            signedCertificateTimestampList: [],
            certificateTransparencyCompliance: compliance,
          }),
        });

        const section = querySelectorErrorOnMissing(view.element, '.certificate-transparency-section');
        const note = querySelectorErrorOnMissing(section, '.origin-view-section-notes');
        assert.strictEqual(note.textContent, expectedNote);
      });
    }

    it('toggles SCT details', async () => {
      const view = await createOriginView(urlString`https://foo.bar`, {
        securityDetails: createSecurityDetails({
          signedCertificateTimestampList: [{
            logDescription: 'Test log',
            logId: '00',
            status: 'Verified',
            origin: 'Embedded in certificate',
            timestamp: 0,
            hashAlgorithm: 'SHA-256',
            signatureAlgorithm: 'ECDSA',
            signatureData: '00',
          }],
          certificateTransparencyCompliance: Protocol.Network.CertificateTransparencyCompliance.Compliant,
        }),
        includeCommonStyles: true,
      });
      const section = querySelectorErrorOnMissing(view.element, '.certificate-transparency-section');
      const summary = querySelectorErrorOnMissing(section, '.sct-summary');
      const details = querySelectorErrorOnMissing(section, '.sct-details');
      const toggle = section.querySelector('devtools-button') as Buttons.Button.Button;

      assert.isTrue(summary.checkVisibility());
      assert.isFalse(details.checkVisibility());
      assert.instanceOf(toggle, HTMLElement);
      assert.strictEqual(toggle.textContent, 'Show full details');
      assert.strictEqual(toggle.accessibleLabel, 'Show full details');
      assert.isFalse(toggle.accessibleExpanded);

      toggle.click();
      await UI.Widget.Widget.allUpdatesComplete;

      assert.isFalse(summary.checkVisibility());
      assert.isTrue(details.checkVisibility());
      assert.strictEqual(toggle.textContent, 'Hide full details');
      assert.strictEqual(toggle.accessibleLabel, 'Hide full details');
      assert.isTrue(toggle.accessibleExpanded);
    });
  });

  describe('note section', () => {
    function getNoteTexts(view: Security.SecurityPanel.SecurityOriginView): string[] {
      const notes = querySelectorErrorOnMissing(view.element, '.origin-view-notes');
      return Array.from(notes.children, note => note.textContent ?? '');
    }

    it('renders when security details are available', async () => {
      const view = await createOriginView();

      assert.deepEqual(getNoteTexts(view), ['The security details above are from the first inspected response']);
    });

    it('does not render when security details are null', async () => {
      const view = await createOriginView(urlString`https://foo.bar`, {securityDetails: null});

      assert.notExists(view.element.querySelector('.origin-view-notes'));
    });

    it('renders with the cache note when loadedFromCache is true', async () => {
      const view = await createOriginView(urlString`https://foo.bar`, {loadedFromCache: true});

      assert.deepEqual(getNoteTexts(view), [
        'This response was loaded from cache. Some security details might be missing.',
        'The security details above are from the first inspected response',
      ]);
    });

    it('renders when the SCT list is not empty', async () => {
      const view = await createOriginView(urlString`https://foo.bar`, {
        securityDetails: createSecurityDetails({
          signedCertificateTimestampList: [{
            logDescription: 'Test log',
            logId: '00',
            status: 'Verified',
            origin: 'Embedded in certificate',
            timestamp: 0,
            hashAlgorithm: 'SHA-256',
            signatureAlgorithm: 'ECDSA',
            signatureData: '00',
          }],
        }),
      });

      assert.exists(view.element.querySelector('.origin-view-notes'));
    });

    const compliances = [
      Protocol.Network.CertificateTransparencyCompliance.Unknown,
      Protocol.Network.CertificateTransparencyCompliance.Compliant,
      Protocol.Network.CertificateTransparencyCompliance.NotCompliant,
    ];
    for (const compliance of compliances) {
      it(`renders when certificate transparency compliance is ${compliance}`, async () => {
        const view = await createOriginView(urlString`https://foo.bar`, {
          securityDetails: createSecurityDetails({certificateTransparencyCompliance: compliance}),
        });

        assert.exists(view.element.querySelector('.origin-view-notes'));
      });
    }
  });

  it('renders an empty SAN', async () => {
    const view =
        await createOriginView(urlString`https://foo.bar`, {securityDetails: createSecurityDetails({sanList: []})});

    const sanElement = view.element.querySelector('.san');
    assert.instanceOf(sanElement, HTMLElement);
    assert.strictEqual(sanElement.textContent, '(n/a)');
  });

  it('renders a SAN without truncation button', async () => {
    const view =
        await createOriginView(urlString`https://foo.bar`,
                               {securityDetails: createSecurityDetails({sanList: ['a.test', 'b.test', 'c.test']})});

    const sanElement = view.element.querySelector('.san');
    assert.instanceOf(sanElement, HTMLElement);

    const sanEntries = [...sanElement.querySelectorAll<HTMLElement>('.san-entry')];
    assert.deepEqual(sanEntries.map(entry => entry.textContent), ['a.test', 'b.test', 'c.test']);
    assert.isTrue(sanEntries.every(entry => entry.checkVisibility()));

    const truncationToggle = sanElement.querySelector('devtools-button');
    assert.notExists(truncationToggle);
  });

  const visibleSanEntries = (sanElement: Element) => [...sanElement.querySelectorAll<HTMLElement>('.san-entry')]
                                                         .filter(entry => entry.checkVisibility())
                                                         .map(entry => entry.textContent);

  it('renders a SAN with truncation button and updates on truncation toggle', async () => {
    const view = await createOriginView(
        urlString`https://foo.bar`,
        {securityDetails: createSecurityDetails({sanList: ['a.test', 'b.test', 'c.test', 'd.test']})});

    const sanElement = view.element.querySelector('.san');
    assert.instanceOf(sanElement, HTMLElement);

    assert.deepEqual(visibleSanEntries(sanElement), ['a.test', 'b.test']);

    const toggleButton = sanElement.querySelector('devtools-button') as Buttons.Button.Button;
    assert.instanceOf(toggleButton, HTMLElement);
    assert.strictEqual(toggleButton.textContent, 'Show more (4 total)');
    assert.isFalse(toggleButton.accessibleExpanded);

    toggleButton.click();
    await UI.Widget.Widget.allUpdatesComplete;

    assert.deepEqual(visibleSanEntries(sanElement), ['a.test', 'b.test', 'c.test', 'd.test']);
    assert.strictEqual(toggleButton.textContent, 'Show less');
    assert.isTrue(toggleButton.accessibleExpanded);

    toggleButton.click();
    await UI.Widget.Widget.allUpdatesComplete;

    assert.deepEqual(visibleSanEntries(sanElement), ['a.test', 'b.test']);
    assert.strictEqual(toggleButton.textContent, 'Show more (4 total)');
    assert.isFalse(toggleButton.accessibleExpanded);
  });

  it('updates SAN truncation when security details change', async () => {
    const view = await createOriginView(
        urlString`https://foo.bar`,
        {securityDetails: createSecurityDetails({sanList: ['a.test', 'b.test', 'c.test', 'd.test']})});

    const sanElement = view.element.querySelector('.san');
    assert.instanceOf(sanElement, HTMLElement);

    assert.deepEqual(visibleSanEntries(sanElement), ['a.test', 'b.test']);

    const toggleButton = sanElement.querySelector('devtools-button') as HTMLElement;
    assert.instanceOf(toggleButton, HTMLElement);
    toggleButton.click();
    await UI.Widget.Widget.allUpdatesComplete;

    assert.deepEqual(visibleSanEntries(sanElement), ['a.test', 'b.test', 'c.test', 'd.test']);

    const updatedSecurityDetails = createSecurityDetails({sanList: ['e.test', 'f.test', 'g.test', 'h.test']});
    view.securityState = Protocol.Security.SecurityState.Neutral;
    view.securityDetails = updatedSecurityDetails;
    await UI.Widget.Widget.allUpdatesComplete;

    assert.deepEqual(visibleSanEntries(sanElement), ['e.test', 'f.test']);
  });

  describe('reactive properties and view function stub', () => {
    it('passes reactive properties to view function and guards equality', async () => {
      const viewStub = createViewFunctionStub(Security.SecurityPanel.SecurityOriginView);
      const view = new Security.SecurityPanel.SecurityOriginView(undefined, viewStub);
      renderElementIntoDOM(view);
      await UI.Widget.Widget.allUpdatesComplete;

      sinon.assert.callCount(viewStub, 1);
      assert.strictEqual(viewStub.input.origin, Platform.DevToolsPath.EmptyUrlString);
      assert.strictEqual(viewStub.input.securityState, Protocol.Security.SecurityState.Unknown);
      assert.isNull(viewStub.input.securityDetails);
      assert.isFalse(viewStub.input.loadedFromCache);

      const requestUpdateSpy = sinon.spy(view, 'requestUpdate');

      view.origin = urlString`https://example.com`;
      sinon.assert.calledOnce(requestUpdateSpy);
      view.origin = urlString`https://example.com`;
      sinon.assert.calledOnce(requestUpdateSpy);

      view.securityState = Protocol.Security.SecurityState.Secure;
      sinon.assert.callCount(requestUpdateSpy, 2);
      view.securityState = Protocol.Security.SecurityState.Secure;
      sinon.assert.callCount(requestUpdateSpy, 2);

      const details = createSecurityDetails({sanList: ['a.com', 'b.com', 'c.com', 'd.com']});
      view.securityDetails = details;
      sinon.assert.callCount(requestUpdateSpy, 3);
      view.securityDetails = details;
      sinon.assert.callCount(requestUpdateSpy, 3);

      view.loadedFromCache = true;
      sinon.assert.callCount(requestUpdateSpy, 4);
      view.loadedFromCache = true;
      sinon.assert.callCount(requestUpdateSpy, 4);

      await UI.Widget.Widget.allUpdatesComplete;
      assert.strictEqual(viewStub.input.origin, urlString`https://example.com`);
      assert.strictEqual(viewStub.input.securityState, Protocol.Security.SecurityState.Secure);
      assert.strictEqual(viewStub.input.securityDetails, details);
      assert.isTrue(viewStub.input.loadedFromCache);
      assert.isTrue(viewStub.input.isSanListTruncated);
    });

    it('resets SAN truncation when securityDetails changes', async () => {
      const viewStub = createViewFunctionStub(Security.SecurityPanel.SecurityOriginView);
      const view = new Security.SecurityPanel.SecurityOriginView(undefined, viewStub);
      renderElementIntoDOM(view);

      view.securityDetails = createSecurityDetails({sanList: ['a.com', 'b.com', 'c.com', 'd.com']});
      await UI.Widget.Widget.allUpdatesComplete;
      assert.isTrue(viewStub.input.isSanListTruncated);

      viewStub.input.onToggleSanTruncation();
      await UI.Widget.Widget.allUpdatesComplete;
      assert.isFalse(viewStub.input.isSanListTruncated);

      view.securityDetails = createSecurityDetails({sanList: ['x.com', 'y.com', 'z.com', 'w.com']});
      await UI.Widget.Widget.allUpdatesComplete;
      assert.isTrue(viewStub.input.isSanListTruncated);
    });

    it('resets CT details when origin changes', async () => {
      const viewStub = createViewFunctionStub(Security.SecurityPanel.SecurityOriginView);
      const view = new Security.SecurityPanel.SecurityOriginView(undefined, viewStub);
      renderElementIntoDOM(view);

      view.origin = urlString`https://example.com`;
      await UI.Widget.Widget.allUpdatesComplete;
      assert.isFalse(viewStub.input.isCertificateTransparencyDetailsShown);

      viewStub.input.onToggleCertificateTransparencyDetails();
      await UI.Widget.Widget.allUpdatesComplete;
      assert.isTrue(viewStub.input.isCertificateTransparencyDetailsShown);

      view.origin = urlString`https://other.com`;
      await UI.Widget.Widget.allUpdatesComplete;
      assert.isFalse(viewStub.input.isCertificateTransparencyDetailsShown);
    });
  });
});

describeWithEnvironment('SecurityPanelSidebarTree', () => {
  describe('updateOrigin', () => {
    it('correctly updates the URL scheme highlighting', async () => {
      const origin = urlString`https://foo.bar`;
      const sidebar = new Security.SecurityPanelSidebar.SecurityPanelSidebar();
      renderElementIntoDOM(sidebar);

      sidebar.origins = new Map([[origin, Protocol.Security.SecurityState.Unknown]]);
      await doubleRaf();
      assert.notExists(sidebar.contentElement.querySelector('devtools-tree')!.shadowRoot!.querySelector(
          '.highlighted-url > .url-scheme-secure'));
      assert.exists(sidebar.contentElement.querySelector('devtools-tree')!.shadowRoot!.querySelector(
          '.highlighted-url > .url-scheme-unknown'));

      sidebar.origins = new Map([[origin, Protocol.Security.SecurityState.Secure]]);
      await doubleRaf();

      assert.exists(sidebar.contentElement.querySelector('devtools-tree')!.shadowRoot!.querySelector(
          '.highlighted-url > .url-scheme-secure'));
      assert.notExists(sidebar.contentElement.querySelector('devtools-tree')!.shadowRoot!.querySelector(
          '.highlighted-url > .url-scheme-unknown'));
    });
  });
});

describeWithEnvironment('SecurityMainView', () => {
  function renderView(view: Security.SecurityPanel.SecurityMainView, width = 600,
                      height = 500): Security.SecurityPanel.SecurityMainView {
    return renderElementIntoDOM(view, {includeCommonStyles: true, width, height});
  }

  function createMainView(): Security.SecurityPanel.SecurityMainView {
    return new Security.SecurityPanel.SecurityMainView();
  }

  it('updates SecurityMainViewInput via view function stub', async () => {
    const viewStub = createViewFunctionStub(Security.SecurityPanel.SecurityMainView);
    const view = new Security.SecurityPanel.SecurityMainView(undefined, viewStub);
    renderView(view);
    await UI.Widget.Widget.allUpdatesComplete;

    sinon.assert.callCount(viewStub, 1);
    assert.isNull(viewStub.input.securityState);
    assert.strictEqual(viewStub.input.summaryText, '');
    assert.isEmpty(viewStub.input.mainExplanations);
    assert.isEmpty(viewStub.input.extraExplanations);

    const showCertSpy = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'showCertificateViewer');
    viewStub.input.onShowCertificateViewer(['MII...']);
    sinon.assert.calledOnceWithExactly(showCertSpy, ['MII...']);

    const revealStub = sinon.stub(Common.Revealer.RevealerRegistry.instance(), 'reveal');
    viewStub.input.onShowNetworkFilter(NetworkForward.UIFilter.MixedContentFilterValues.BLOCKED);
    sinon.assert.calledOnce(revealStub);

    const certState: Protocol.Security.CertificateSecurityState = {
      protocol: 'TLS 1.3',
      keyExchange: '',
      keyExchangeGroup: 'X25519',
      cipher: 'AES_128_GCM',
      mac: undefined,
      certificate: ['MII...'],
      subjectName: 'example.com',
      issuer: 'Let\'s Encrypt',
      validFrom: 0,
      validTo: 1,
      certificateNetworkError: undefined,
      certificateHasWeakSignature: false,
      certificateHasSha1Signature: false,
      modernSSL: true,
      obsoleteSslProtocol: false,
      obsoleteSslKeyExchange: false,
      obsoleteSslCipher: false,
      obsoleteSslSignature: false,
    };

    view.visibleSecurityState = new Security.SecurityModel.PageVisibleSecurityState(
        Protocol.Security.SecurityState.Secure, certState, null, ['pkp-bypassed']);
    await UI.Widget.Widget.allUpdatesComplete;

    sinon.assert.callCount(viewStub, 2);
    assert.strictEqual(viewStub.input.securityState, Protocol.Security.SecurityState.Secure);
    assert.lengthOf(viewStub.input.mainExplanations, 3);
    assert.lengthOf(viewStub.input.extraExplanations, 1);
  });

  it('renders lock spectrum classes and tooltips across security states', async () => {
    const view = createMainView();
    renderView(view);

    const states = [
      {
        state: Protocol.Security.SecurityState.Secure,
        selector: '.lock-spectrum .lock-icon:nth-child(1)',
        activeClass: 'lock-icon-secure',
        tooltip: 'Secure',
      },
      {
        state: Protocol.Security.SecurityState.Neutral,
        selector: '.lock-spectrum .lock-icon:nth-child(2)',
        activeClass: 'lock-icon-neutral',
        tooltip: 'Info',
      },
      {
        state: Protocol.Security.SecurityState.Insecure,
        selector: '.lock-spectrum .lock-icon:nth-child(3)',
        activeClass: 'lock-icon-insecure',
        tooltip: 'Not secure',
      },
      {
        state: Protocol.Security.SecurityState.InsecureBroken,
        selector: '.lock-spectrum .lock-icon:nth-child(3)',
        activeClass: 'lock-icon-insecure-broken',
        tooltip: 'Not secure (broken)',
      },
    ];

    for (const {state, selector, activeClass, tooltip} of states) {
      view.visibleSecurityState = new Security.SecurityModel.PageVisibleSecurityState(state, null, null, []);
      await UI.Widget.Widget.allUpdatesComplete;

      const summary = querySelectorErrorOnMissing(view.contentElement, '.security-summary');
      assert.isTrue(summary.classList.contains(`security-summary-${state}`));

      const icon = querySelectorErrorOnMissing(view.contentElement, selector);
      assert.isTrue(icon.classList.contains(activeClass));
      assert.strictEqual(icon.getAttribute('title'), tooltip);
    }

    // Verify transitioning InsecureBroken -> Insecure restores .lock-icon-insecure and 'Not secure'
    view.visibleSecurityState =
        new Security.SecurityModel.PageVisibleSecurityState(Protocol.Security.SecurityState.Insecure, null, null, []);
    await UI.Widget.Widget.allUpdatesComplete;
    const insecureIcon = querySelectorErrorOnMissing(view.contentElement, '.lock-spectrum .lock-icon:nth-child(3)');
    assert.isTrue(insecureIcon.classList.contains('lock-icon-insecure'));
    assert.isFalse(insecureIcon.classList.contains('lock-icon-insecure-broken'));
    assert.strictEqual(insecureIcon.getAttribute('title'), 'Not secure');
  });

  describe('summary overrides and safety tips', () => {
    it('handles malicious-content SafeBrowsing summary and front-inserted explanation', async () => {
      const view = createMainView();
      renderView(view);

      view.visibleSecurityState = new Security.SecurityModel.PageVisibleSecurityState(
          Protocol.Security.SecurityState.Insecure, null, null, ['malicious-content']);
      await UI.Widget.Widget.allUpdatesComplete;

      const summaryText = querySelectorErrorOnMissing(view.contentElement, '.security-summary-text');
      assert.strictEqual(summaryText.textContent, 'This page is dangerous (flagged by Google Safe Browsing)');

      const explanations = view.contentElement.querySelectorAll('.security-explanations-main .security-explanation');
      assert.isAbove(explanations.length, 0);
      assert.strictEqual(
          querySelectorErrorOnMissing(explanations[0] as HTMLElement, '.security-explanation-title').textContent,
          'Flagged by Google Safe Browsing');
      assert.include(
          querySelectorErrorOnMissing(explanations[0] as HTMLElement, '.security-explanation-text').textContent ?? '',
          'To check this page’s status, visit g.co/safebrowsingstatus');
    });

    it('early returns on is-error-page non-cert error leaving explanation lists empty', async () => {
      const view = createMainView();
      renderView(view);

      const certState = createCertificateSecurityState({
        protocol: '',
        keyExchange: '',
        cipher: '',
        validTo: 0,
        modernSSL: false,
      });

      view.visibleSecurityState = new Security.SecurityModel.PageVisibleSecurityState(
          Protocol.Security.SecurityState.Insecure, certState, null, ['is-error-page']);
      await UI.Widget.Widget.allUpdatesComplete;

      const summaryText = querySelectorErrorOnMissing(view.contentElement, '.security-summary-text');
      assert.strictEqual(summaryText.textContent, 'This is an error page');

      const emptyLists = view.contentElement.querySelectorAll('.security-explanation-list:empty');
      assert.lengthOf(emptyLists, 2);
    });

    it('renders unencrypted HTTP summary for scheme-is-not-cryptographic when insecure broken', async () => {
      const view = createMainView();
      renderView(view);

      view.visibleSecurityState = new Security.SecurityModel.PageVisibleSecurityState(
          Protocol.Security.SecurityState.InsecureBroken, null, null, ['scheme-is-not-cryptographic']);
      await UI.Widget.Widget.allUpdatesComplete;
      const summaryText = querySelectorErrorOnMissing(view.contentElement, '.security-summary-text');
      assert.strictEqual(summaryText.textContent, 'This page is insecure (unencrypted HTTP)');
    });

    it('renders non-HTTPS secure origin summary for scheme-is-not-cryptographic when neutral', async () => {
      const view = createMainView();
      renderView(view);

      view.visibleSecurityState = new Security.SecurityModel.PageVisibleSecurityState(
          Protocol.Security.SecurityState.Neutral, null, null, ['scheme-is-not-cryptographic']);
      await UI.Widget.Widget.allUpdatesComplete;
      const summaryText = querySelectorErrorOnMissing(view.contentElement, '.security-summary-text');
      assert.strictEqual(summaryText.textContent, 'This page has a non-HTTPS secure origin');
    });

    it('renders suspicious page summary and explanation for bad_reputation safety tip', async () => {
      const view = createMainView();
      renderView(view);

      view.visibleSecurityState = new Security.SecurityModel.PageVisibleSecurityState(
          Protocol.Security.SecurityState.Insecure, null, null, ['bad_reputation']);
      await UI.Widget.Widget.allUpdatesComplete;
      const summaryText = querySelectorErrorOnMissing(view.contentElement, '.security-summary-text');
      assert.strictEqual(summaryText.textContent, 'This page is suspicious (flagged by Chrome)');
      const firstExplanation =
          querySelectorErrorOnMissing(view.contentElement, '.security-explanations-main .security-explanation');
      assert.strictEqual(querySelectorErrorOnMissing(firstExplanation, '.security-explanation-title').textContent,
                         'This page is suspicious');
      assert.include(firstExplanation.textContent ?? '',
                     'Chrome has determined that this site could be fake or fraudulent');
    });

    it('renders possible spoofing URL explanation for lookalike safety tip', async () => {
      const view = createMainView();
      renderView(view);

      const safetyTipInfo: Protocol.Security.SafetyTipInfo = {
        safetyTipStatus: Protocol.Security.SafetyTipStatus.Lookalike,
        safeUrl: 'https://example.com',
      };
      view.visibleSecurityState = new Security.SecurityModel.PageVisibleSecurityState(
          Protocol.Security.SecurityState.Insecure, null, safetyTipInfo, ['lookalike']);
      await UI.Widget.Widget.allUpdatesComplete;
      const summaryText = querySelectorErrorOnMissing(view.contentElement, '.security-summary-text');
      assert.strictEqual(summaryText.textContent, 'This page is suspicious (flagged by Chrome)');
      const firstExplanation =
          querySelectorErrorOnMissing(view.contentElement, '.security-explanations-main .security-explanation');
      assert.strictEqual(querySelectorErrorOnMissing(firstExplanation, '.security-explanation-title').textContent,
                         'Possible spoofing URL');
      assert.include(firstExplanation.textContent ?? '', 'This site’s hostname looks similar to example.com');
    });
  });

  it('invokes showCertificateViewer when origin-button is clicked inside explanation', async () => {
    const view = createMainView();
    renderView(view);

    const showCertStub = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'showCertificateViewer');

    const certState = createCertificateSecurityState({
      certificate: ['MII...dummyCertContent'],
    });

    view.visibleSecurityState = new Security.SecurityModel.PageVisibleSecurityState(
        Protocol.Security.SecurityState.Secure, certState, null, []);
    await UI.Widget.Widget.allUpdatesComplete;

    const certBtn = querySelectorErrorOnMissing(view.contentElement, '.security-explanations-main .origin-button');
    assert.strictEqual(certBtn.textContent, 'View certificate');
    (certBtn as HTMLElement).click();

    sinon.assert.calledOnceWithExactly(showCertStub, ['MII...dummyCertContent']);
  });

  it('renders obsolete connection recommendations and routes Info explanations to extra section', async () => {
    const view = createMainView();
    renderView(view);

    const certState = createCertificateSecurityState({
      protocol: 'TLS 1.0',
      keyExchange: 'RSA',
      cipher: '3DES_EDE_CBC',
      certificate: ['MII...'],
      modernSSL: false,
      obsoleteSslProtocol: true,
      obsoleteSslKeyExchange: true,
      obsoleteSslCipher: true,
      obsoleteSslSignature: true,
    });

    view.visibleSecurityState = new Security.SecurityModel.PageVisibleSecurityState(
        Protocol.Security.SecurityState.Secure, certState, null, ['pkp-bypassed']);
    await UI.Widget.Widget.allUpdatesComplete;

    // Info explanations routed to .security-explanations-extra
    const extraExplanations =
        view.contentElement.querySelectorAll('.security-explanations-extra .security-explanation');
    assert.isAbove(extraExplanations.length, 0);

    const recommendationItems = view.contentElement.querySelectorAll('ul.security-explanation-recommendations > li');
    assert.lengthOf(recommendationItems, 4);
    const recTexts = Array.from(recommendationItems).map(item => item.textContent);
    assert.deepEqual(recTexts, [
      'TLS 1.0 is obsolete. Enable TLS 1.2 or later.',
      'RSA key exchange is obsolete. Enable an ECDHE-based cipher suite.',
      '3DES_EDE_CBC is obsolete. Enable an AES-GCM-based cipher suite.',
      'The server signature uses SHA-1, which is obsolete. Enable a SHA-2 signature algorithm instead. (Note this is different from the signature in the certificate.)',
    ]);
  });

  describe('mixed-content explanations', () => {
    it('renders reload prompt for mixed content when filter request count is 0', async () => {
      const view = createMainView();
      renderView(view);

      view.visibleSecurityState = new Security.SecurityModel.PageVisibleSecurityState(
          Protocol.Security.SecurityState.Neutral, null, null, ['displayed-mixed-content']);
      await UI.Widget.Widget.allUpdatesComplete;

      const reloadPrompt =
          querySelectorErrorOnMissing(view.contentElement, '.security-explanations-main .security-mixed-content');
      assert.strictEqual(reloadPrompt.tagName, 'DIV');
      assert.strictEqual(reloadPrompt.textContent, 'Reload the page to record requests for HTTP resources');
    });

    it('renders network filter link button and reveals requests when filter request count is positive', async () => {
      const view = createMainView();
      renderView(view);

      view.visibleSecurityState = new Security.SecurityModel.PageVisibleSecurityState(
          Protocol.Security.SecurityState.Neutral, null, null, ['displayed-mixed-content']);
      view.filterRequestCounts = new Map([[NetworkForward.UIFilter.MixedContentFilterValues.DISPLAYED, 2]]);
      await UI.Widget.Widget.allUpdatesComplete;

      const linkBtn = querySelectorErrorOnMissing(view.contentElement,
                                                  '.security-explanations-main devtools-button.security-mixed-content');
      assert.strictEqual(linkBtn.textContent, 'View 2 requests in Network panel');

      const revealStub = sinon.stub(Common.Revealer.RevealerRegistry.instance(), 'reveal');
      linkBtn.click();
      sinon.assert.calledOnce(revealStub);
    });

    it('renders BLOCKED synthetic mixed-content explanation in main section when count > 0', async () => {
      const view = createMainView();
      renderView(view);

      view.filterRequestCounts = new Map([[NetworkForward.UIFilter.MixedContentFilterValues.BLOCKED, 3]]);
      view.visibleSecurityState = new Security.SecurityModel.PageVisibleSecurityState(
          Protocol.Security.SecurityState.Neutral, null, null, ['scheme-is-not-cryptographic']);
      await UI.Widget.Widget.allUpdatesComplete;

      const blockedExplanation =
          querySelectorErrorOnMissing(view.contentElement, '.security-explanations-main .security-explanation-info');
      assert.strictEqual(querySelectorErrorOnMissing(blockedExplanation, '.security-explanation-title').textContent,
                         'Blocked mixed content');
      const linkBtn = querySelectorErrorOnMissing(blockedExplanation, 'devtools-button.security-mixed-content');
      assert.strictEqual(linkBtn.textContent, 'View 3 requests in Network panel');
    });

    it('works standalone without SecurityPanel back-reference for mixed-content requests', async () => {
      const standaloneView = new Security.SecurityPanel.SecurityMainView();
      renderView(standaloneView);

      standaloneView.visibleSecurityState = new Security.SecurityModel.PageVisibleSecurityState(
          Protocol.Security.SecurityState.Neutral, null, null, ['displayed-mixed-content']);
      standaloneView.filterRequestCounts = new Map([
        [NetworkForward.UIFilter.MixedContentFilterValues.DISPLAYED, 4],
        [NetworkForward.UIFilter.MixedContentFilterValues.BLOCKED, 1],
      ]);
      await UI.Widget.Widget.allUpdatesComplete;

      const links = standaloneView.contentElement.querySelectorAll('devtools-button.security-mixed-content');
      assert.lengthOf(links, 2);
      assert.strictEqual(links[0].textContent, 'View 4 requests in Network panel');
      assert.strictEqual(links[1].textContent, 'View 1 request in Network panel');
    });

    it('updates reactively via declarative visibleSecurityState and filterRequestCounts setters', async () => {
      const standaloneView = new Security.SecurityPanel.SecurityMainView();
      renderView(standaloneView);

      const requestStub = sinon.stub(standaloneView, 'requestUpdate');

      // Set identical initial visibleSecurityState (null) -> no update
      standaloneView.visibleSecurityState = null;
      sinon.assert.notCalled(requestStub);

      // Set new visibleSecurityState -> triggers requestUpdate
      const state =
          new Security.SecurityModel.PageVisibleSecurityState(Protocol.Security.SecurityState.Secure, null, null, []);
      standaloneView.visibleSecurityState = state;
      sinon.assert.calledOnce(requestStub);
      assert.strictEqual(standaloneView.visibleSecurityState, state);

      // Set same visibleSecurityState reference -> equality guard prevents update
      standaloneView.visibleSecurityState = state;
      sinon.assert.calledOnce(requestStub);

      // Set filterRequestCounts -> triggers requestUpdate
      const counts = new Map([[NetworkForward.UIFilter.MixedContentFilterValues.DISPLAYED, 2]]);
      standaloneView.filterRequestCounts = counts;
      sinon.assert.calledTwice(requestStub);
      assert.strictEqual(standaloneView.filterRequestCounts, counts);

      // Set same filterRequestCounts reference -> equality guard prevents update
      standaloneView.filterRequestCounts = counts;
      sinon.assert.calledTwice(requestStub);
    });
  });

  describe('visual screenshots', () => {
    it('renders secure state', async () => {
      const view = createMainView();
      renderView(view, 600, 400);

      const certState = createCertificateSecurityState({
        keyExchangeGroup: 'X25519',
        certificate: ['MII...'],
        issuer: 'Let\'s Encrypt Authority X3',
      });

      view.visibleSecurityState = new Security.SecurityModel.PageVisibleSecurityState(
          Protocol.Security.SecurityState.Secure, certState, null, []);
      await UI.Widget.Widget.allUpdatesComplete;
      await doubleRaf();
      await assertScreenshot('security/security_main_view_secure.png');
    });

    it('renders insecure broken state', async () => {
      const view = createMainView();
      renderView(view, 600, 400);

      const certState = createCertificateSecurityState({
        protocol: 'TLS 1.2',
        keyExchange: 'ECDHE_RSA',
        keyExchangeGroup: 'X25519',
        certificate: ['MII...'],
        issuer: 'Self-Signed CA',
        certificateNetworkError: 'net::ERR_CERT_AUTHORITY_INVALID',
      });

      view.visibleSecurityState = new Security.SecurityModel.PageVisibleSecurityState(
          Protocol.Security.SecurityState.InsecureBroken, certState, null, ['ran-mixed-content']);
      await UI.Widget.Widget.allUpdatesComplete;
      await doubleRaf();
      await assertScreenshot('security/security_main_view_insecure_broken.png');
    });
  });
});

describeWithEnvironment('SecurityPanel', () => {
  let target: SDK.Target.Target;
  let prerenderTarget: SDK.Target.Target;

  beforeEach(() => {
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    prerenderTarget = createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    target = createTarget({parentTarget: tabTarget});
  });

  it('shows security information for a non-cryptographic secure origin', async () => {
    const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});
    renderElementIntoDOM(securityPanel);
    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);

    const origin = urlString`chrome-test://test`;
    const request = createNetworkRequest({url: origin});
    request.setSecurityState(Protocol.Security.SecurityState.Secure);
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request);
    securityPanel.showOrigin(origin);
    await UI.Widget.Widget.allUpdatesComplete;

    const originDisplay = querySelectorErrorOnMissing(securityPanel.contentElement, '.origin-display');
    assert.strictEqual(originDisplay.textContent, origin);

    const section = querySelectorErrorOnMissing(securityPanel.contentElement, '.security-state-section');
    assert.include(section.textContent, 'This origin is a non-HTTPS secure origin');
  });

  it('updates when security state changes', async () => {
    const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});
    renderElementIntoDOM(securityPanel);
    const securityModel = target.model(Security.SecurityModel.SecurityModel);
    assert.exists(securityModel);
    const visibleSecurityState =
        new Security.SecurityModel.PageVisibleSecurityState(Protocol.Security.SecurityState.Insecure, null, null, []);
    securityModel.dispatchEventToListeners(Security.SecurityModel.Events.VisibleSecurityStateChanged,
                                           visibleSecurityState);
    await UI.Widget.Widget.allUpdatesComplete;

    assert.isTrue(securityPanel.contentElement.querySelector('.security-summary')
                      ?.classList.contains('security-summary-insecure'));

    const updatedVisibleSecurityState =
        new Security.SecurityModel.PageVisibleSecurityState(Protocol.Security.SecurityState.Secure, null, null, []);
    securityModel.dispatchEventToListeners(Security.SecurityModel.Events.VisibleSecurityStateChanged,
                                           updatedVisibleSecurityState);
    await UI.Widget.Widget.allUpdatesComplete;

    assert.isFalse(securityPanel.contentElement.querySelector('.security-summary')
                       ?.classList.contains('security-summary-insecure'));
    assert.isTrue(
        securityPanel.contentElement.querySelector('.security-summary')?.classList.contains('security-summary-secure'));
  });

  it('can switch to a different SecurityModel', async () => {
    const mainSecurityModel = target.model(Security.SecurityModel.SecurityModel);
    assert.exists(mainSecurityModel);
    const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});
    renderElementIntoDOM(securityPanel);

    // Add the main target to the security panel.
    securityPanel.modelAdded(mainSecurityModel);
    const insecureState =
        new Security.SecurityModel.PageVisibleSecurityState(Protocol.Security.SecurityState.Insecure, null, null, []);
    mainSecurityModel.dispatchEventToListeners(Security.SecurityModel.Events.VisibleSecurityStateChanged,
                                               insecureState);
    await UI.Widget.Widget.allUpdatesComplete;
    assert.isTrue(securityPanel.contentElement.querySelector('.security-summary')
                      ?.classList.contains('security-summary-insecure'));

    // Switch to the prerender target.
    const prerenderSecurityModel = prerenderTarget.model(Security.SecurityModel.SecurityModel);
    assert.exists(prerenderSecurityModel);
    securityPanel.modelAdded(prerenderSecurityModel);
    securityPanel.modelRemoved(mainSecurityModel);

    // Check that the security panel does not listen to events from the previous target.
    const secureState =
        new Security.SecurityModel.PageVisibleSecurityState(Protocol.Security.SecurityState.Secure, null, null, []);
    mainSecurityModel.dispatchEventToListeners(Security.SecurityModel.Events.VisibleSecurityStateChanged, secureState);
    await UI.Widget.Widget.allUpdatesComplete;
    assert.isTrue(securityPanel.contentElement.querySelector('.security-summary')
                      ?.classList.contains('security-summary-insecure'));

    // Check that the security panel listens to events from the current target.
    prerenderSecurityModel.dispatchEventToListeners(Security.SecurityModel.Events.VisibleSecurityStateChanged,
                                                    secureState);
    await UI.Widget.Widget.allUpdatesComplete;
    assert.isTrue(
        securityPanel.contentElement.querySelector('.security-summary')?.classList.contains('security-summary-secure'));

    // Check that the SecurityPanel listens to any PrimaryPageChanged event
    navigate(getMainFrame(target));
    await UI.Widget.Widget.allUpdatesComplete;
    await doubleRaf();
    const reloadMessage = securityPanel.contentElement.querySelector('devtools-tree')!.shadowRoot!.querySelector(
        '.security-main-view-reload-message');
    assert.exists(reloadMessage);
  });

  it('shows Certificate Transparency compliance when an origin is selected', async () => {
    const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});
    renderElementIntoDOM(securityPanel);
    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);

    const request = createNetworkRequest({url: 'https://foo.test/'});
    request.setSecurityState(Protocol.Security.SecurityState.Secure);
    request.setSecurityDetails(createSecurityDetails({
      signedCertificateTimestampList: [],
      certificateTransparencyCompliance: Protocol.Network.CertificateTransparencyCompliance.Compliant,
    }));
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request);

    securityPanel.showOrigin(urlString`https://foo.test`);
    await UI.Widget.Widget.allUpdatesComplete;

    const section = querySelectorErrorOnMissing(securityPanel.contentElement, '.certificate-transparency-section');
    const note = querySelectorErrorOnMissing(section, '.origin-view-section-notes');
    assert.strictEqual(note.textContent, 'This request complies with Chrome’s Certificate Transparency policy');
  });

  it('preserves the selected origin when the panel is hidden and shown again', async () => {
    const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});
    renderElementIntoDOM(securityPanel);
    const securityModel = target.model(Security.SecurityModel.SecurityModel);
    assert.exists(securityModel);
    const networkManager = securityModel.networkManager();
    const request = createNetworkRequest({url: 'https://foo.test'});
    request.setSecurityState(Protocol.Security.SecurityState.Secure);
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request);

    // Select the origin
    securityPanel.showOrigin(urlString`https://foo.test`);
    await UI.Widget.Widget.allUpdatesComplete;

    // The active view should be the origin view, not the main view.
    assert.exists(securityPanel.contentElement.querySelector('.security-origin-view'));

    // Hide and show the panel
    securityPanel.wasHidden();
    securityPanel.wasShown();
    await UI.Widget.Widget.allUpdatesComplete;

    // The active view should still be the origin view.
    assert.exists(securityPanel.contentElement.querySelector('.security-origin-view'));
  });

  it('shows \'reload page\' message when no data is available', async () => {
    const securityModel = target.model(Security.SecurityModel.SecurityModel);
    assert.exists(securityModel);
    const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});
    renderElementIntoDOM(securityPanel);
    await UI.Widget.Widget.allUpdatesComplete;
    await doubleRaf();

    // Check that reload message is visible initially.
    const reloadMessage = securityPanel.contentElement.querySelector('devtools-tree')!.shadowRoot!.querySelector(
        '.security-main-view-reload-message');
    assert.instanceOf(reloadMessage, HTMLLIElement);
    assert.exists(securityPanel.contentElement.querySelector('devtools-tree')!.shadowRoot!.querySelector(
        '.security-main-view-reload-message'));

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
    await UI.Widget.Widget.allUpdatesComplete;
    await doubleRaf();
    assert.notExists(securityPanel.contentElement.querySelector('devtools-tree')!.shadowRoot!.querySelector(
        '.security-main-view-reload-message'));

    // Check that reload message is restored after clearing data.
    navigate(getMainFrame(target));
    await UI.Widget.Widget.allUpdatesComplete;
    await doubleRaf();
    assert.exists(securityPanel.contentElement.querySelector('devtools-tree')!.shadowRoot!.querySelector(
        '.security-main-view-reload-message'));
  });

  it('does not show blank origins in the sidebar', async () => {
    const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});
    renderElementIntoDOM(securityPanel);
    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);

    const request1 = createNetworkRequest({url: 'https://foo.test/foo.jpg'});
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request1);

    const request2 = createNetworkRequest({
      url:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAKCAYAAABmBXS+AAAAPElEQVR42mNgQAMZGRn/GfABkIIdO3b8x6kQpgAEsCpEVgADKAqxKcBQCCLwARRFIBodYygiyiSCighhAO4e2jskhrm3AAAAAElFTkSuQmCC',
    });
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request2);
    await UI.Widget.Widget.allUpdatesComplete;
    await doubleRaf();

    const sidebarRoot = securityPanel.contentElement.querySelector('devtools-tree')!.shadowRoot!;
    const groupTitles = Array.from(sidebarRoot.querySelectorAll('.security-sidebar-origins-title'))
                            .filter(element => element.checkVisibility())
                            .map(element => element.textContent);
    assert.deepEqual(groupTitles, ['Main origin', 'Unknown / canceled']);

    const allOriginElements = sidebarRoot.querySelectorAll<HTMLLIElement>('.security-sidebar-tree-item');
    assert.lengthOf(allOriginElements, 1);

    const unknownOriginGroup = sidebarRoot.querySelector('[aria-label="Unknown / canceled"]');
    assert.exists(unknownOriginGroup);
    const originElements = unknownOriginGroup.querySelectorAll<HTMLLIElement>('.security-sidebar-tree-item');
    assert.lengthOf(originElements, 1);
    const originElement = querySelectorErrorOnMissing(originElements[0], '.highlighted-url');
    assert.strictEqual(originElement.textContent, 'https://foo.test');
  });

  it('shows origins with failed requests in the sidebar', async () => {
    const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});
    renderElementIntoDOM(securityPanel);
    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);

    const request1 = createNetworkRequest({url: 'https://foo.test/foo.jpg'});
    request1.setSecurityState(Protocol.Security.SecurityState.Secure);
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request1);

    const request2 = createNetworkRequest({url: 'https://does-not-resolve.test'});
    // Leave the security state unknown.
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request2);
    await UI.Widget.Widget.allUpdatesComplete;
    await doubleRaf();

    const sidebarRoot = securityPanel.contentElement.querySelector('devtools-tree')!.shadowRoot!;
    const groupTitles = Array.from(sidebarRoot.querySelectorAll('.security-sidebar-origins-title'))
                            .filter(element => element.checkVisibility())
                            .map(element => element.textContent);
    assert.deepEqual(groupTitles, ['Main origin', 'Secure origins', 'Unknown / canceled']);

    const allOriginElements = sidebarRoot.querySelectorAll<HTMLLIElement>('.security-sidebar-tree-item');
    assert.lengthOf(allOriginElements, 2);

    const secureOriginGroup = sidebarRoot.querySelector('[aria-label="Secure origins"]');
    assert.exists(secureOriginGroup);
    const secureOriginElements = secureOriginGroup.querySelectorAll<HTMLLIElement>('.security-sidebar-tree-item');
    assert.lengthOf(secureOriginElements, 1);
    const secureOriginElement = querySelectorErrorOnMissing(secureOriginElements[0], '.highlighted-url');
    assert.strictEqual(secureOriginElement.textContent, 'https://foo.test');

    const unknownOriginGroup = sidebarRoot.querySelector('[aria-label="Unknown / canceled"]');
    assert.exists(unknownOriginGroup);
    const unknownOriginElements = unknownOriginGroup.querySelectorAll<HTMLLIElement>('.security-sidebar-tree-item');
    assert.lengthOf(unknownOriginElements, 1);
    const unknownOriginElement = querySelectorErrorOnMissing(unknownOriginElements[0], '.highlighted-url');
    assert.strictEqual(unknownOriginElement.textContent, 'https://does-not-resolve.test');
  });

  it('shows informational explanations after regular explanations', async () => {
    const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});
    renderElementIntoDOM(securityPanel);
    const securityModel = target.model(Security.SecurityModel.SecurityModel);
    assert.exists(securityModel);

    const pageVisibleSecurityState = new Security.SecurityModel.PageVisibleSecurityState(
        Protocol.Security.SecurityState.Secure, null, null, ['pkp-bypassed']);
    securityModel.dispatchEventToListeners(Security.SecurityModel.Events.VisibleSecurityStateChanged,
                                           pageVisibleSecurityState);
    await UI.Widget.Widget.allUpdatesComplete;

    const titles = securityPanel.contentElement.querySelectorAll('.security-explanation-title');
    assert.deepEqual(Array.from(titles, title => title.textContent), [
      'Resources - all served securely',
      'Certificate - Public-Key-Pinning bypassed',
    ]);
  });

  it('shows an explanation for blocked mixed content and clears it on navigation', async () => {
    const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});
    renderElementIntoDOM(securityPanel);
    const securityModel = target.model(Security.SecurityModel.SecurityModel);
    assert.exists(securityModel);
    const pageVisibleSecurityState = new Security.SecurityModel.PageVisibleSecurityState(
        Protocol.Security.SecurityState.Neutral, null, null, ['scheme-is-not-cryptographic']);
    securityModel.dispatchEventToListeners(Security.SecurityModel.Events.VisibleSecurityStateChanged,
                                           pageVisibleSecurityState);
    await UI.Widget.Widget.allUpdatesComplete;

    const request = createNetworkRequest({url: 'http://foo.test'});
    request.setBlockedReason(Protocol.Network.BlockedReason.MixedContent);
    request.mixedContentType = Protocol.Security.MixedContentType.Blockable;
    const networkManager = securityModel.networkManager();
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request);
    await UI.Widget.Widget.allUpdatesComplete;

    const explanations = securityPanel.contentElement.querySelectorAll<HTMLElement>('.security-explanation');
    assert.lengthOf(explanations, 1);
    const explanation = explanations[0];
    assert.isTrue(explanation.classList.contains('security-explanation-info'));

    const title = querySelectorErrorOnMissing(explanation, '.security-explanation-title');
    assert.strictEqual(title.textContent, 'Blocked mixed content');

    const explanationText = querySelectorErrorOnMissing(explanation, '.security-explanation-text');
    assert.include(explanationText.textContent, 'Your page requested non-secure resources that were blocked');

    const requestsLink = querySelectorErrorOnMissing(explanation, 'devtools-button.security-mixed-content');
    assert.strictEqual(requestsLink.textContent, 'View 1 request in Network panel');
    assert.instanceOf(requestsLink, Buttons.Button.Button);

    // Test that the explanations are cleared on navigation. Regression test for https://crbug.com/601944.
    navigate(getMainFrame(target));
    await UI.Widget.Widget.allUpdatesComplete;

    assert.isEmpty(securityPanel.contentElement.querySelectorAll('.security-explanation'));
  });

  it('replaces the mixed content reload prompt with a request link when a request is recorded', async () => {
    const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});
    renderElementIntoDOM(securityPanel);
    const securityModel = target.model(Security.SecurityModel.SecurityModel);
    assert.exists(securityModel);
    const pageVisibleSecurityState = new Security.SecurityModel.PageVisibleSecurityState(
        Protocol.Security.SecurityState.Neutral, null, null, ['displayed-mixed-content']);
    securityModel.dispatchEventToListeners(Security.SecurityModel.Events.VisibleSecurityStateChanged,
                                           pageVisibleSecurityState);
    await UI.Widget.Widget.allUpdatesComplete;

    function assertMixedContentExplanation() {
      const explanations = securityPanel.contentElement.querySelectorAll<HTMLElement>('.security-explanation');
      assert.lengthOf(explanations, 1);
      const explanation = explanations[0];
      assert.isTrue(explanation.classList.contains('security-explanation-neutral'));

      const title = querySelectorErrorOnMissing(explanation, '.security-explanation-title');
      assert.strictEqual(title.textContent, 'Resources - mixed content');

      const explanationText = querySelectorErrorOnMissing(explanation, '.security-explanation-text');
      assert.include(explanationText.textContent, 'This page includes HTTP resources');
      return explanation;
    }

    const explanationBeforeReload = assertMixedContentExplanation();
    const reloadPrompt = querySelectorErrorOnMissing(explanationBeforeReload, '.security-mixed-content');
    assert.strictEqual(reloadPrompt.textContent, 'Reload the page to record requests for HTTP resources');

    // Now simulate a refresh.
    securityModel.dispatchEventToListeners(Security.SecurityModel.Events.VisibleSecurityStateChanged,
                                           pageVisibleSecurityState);
    const request = createNetworkRequest({url: 'http://foo.test'});
    request.mixedContentType = Protocol.Security.MixedContentType.OptionallyBlockable;
    const networkManager = securityModel.networkManager();
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request);
    await UI.Widget.Widget.allUpdatesComplete;

    const explanationAfterReload = assertMixedContentExplanation();
    const requestsLink = querySelectorErrorOnMissing(explanationAfterReload, 'devtools-button.security-mixed-content');
    assert.strictEqual(requestsLink.textContent, 'View 1 request in Network panel');
    assert.instanceOf(requestsLink, Buttons.Button.Button);
  });

  it('replaces active and passive mixed content reload prompts with request links when requests are recorded',
     async () => {
       const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});
       renderElementIntoDOM(securityPanel);
       const securityModel = target.model(Security.SecurityModel.SecurityModel);
       assert.exists(securityModel);

       const pageVisibleSecurityState = new Security.SecurityModel.PageVisibleSecurityState(
           Protocol.Security.SecurityState.Neutral, null, null, ['displayed-mixed-content', 'ran-mixed-content']);
       securityModel.dispatchEventToListeners(Security.SecurityModel.Events.VisibleSecurityStateChanged,
                                              pageVisibleSecurityState);
       await UI.Widget.Widget.allUpdatesComplete;

       function assertMixedContentExplanations() {
         const explanations = securityPanel.contentElement.querySelectorAll<HTMLElement>('.security-explanation');
         assert.lengthOf(explanations, 2);
         const [activeExplanation, passiveExplanation] = explanations;

         assert.isTrue(activeExplanation.classList.contains('security-explanation-insecure'));

         const activeExplanationTitle = querySelectorErrorOnMissing(activeExplanation, '.security-explanation-title');
         assert.strictEqual(activeExplanationTitle.textContent, 'Resources - active mixed content');

         const activeExplanationText = querySelectorErrorOnMissing(activeExplanation, '.security-explanation-text');
         assert.include(
             activeExplanationText.textContent,
             'You have recently allowed non-secure content (such as scripts or iframes) to run on this site');

         assert.isTrue(passiveExplanation.classList.contains('security-explanation-neutral'));

         const passiveExplanationTitle = querySelectorErrorOnMissing(passiveExplanation, '.security-explanation-title');
         assert.strictEqual(passiveExplanationTitle.textContent, 'Resources - mixed content');

         const passiveExplanationText = querySelectorErrorOnMissing(passiveExplanation, '.security-explanation-text');
         assert.include(passiveExplanationText.textContent, 'This page includes HTTP resources');
         return [activeExplanation, passiveExplanation];
       }

       // At this point, the page has mixed content but no mixed requests have been recorded,
       // so the user should be prompted to refresh.
       const explanationsBeforeReload = assertMixedContentExplanations();
       for (const explanation of explanationsBeforeReload) {
         const reloadPrompt = querySelectorErrorOnMissing(explanation, '.security-mixed-content');
         assert.strictEqual(reloadPrompt.textContent, 'Reload the page to record requests for HTTP resources');
       }

       // Now simulate a refresh.
       securityModel.dispatchEventToListeners(Security.SecurityModel.Events.VisibleSecurityStateChanged,
                                              pageVisibleSecurityState);
       const networkManager = securityModel.networkManager();
       const passiveRequest = createNetworkRequest({url: 'http://foo.test'});
       passiveRequest.mixedContentType = Protocol.Security.MixedContentType.OptionallyBlockable;
       networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, passiveRequest);

       const activeRequest = createNetworkRequest({url: 'http://foo.test'});
       activeRequest.mixedContentType = Protocol.Security.MixedContentType.Blockable;
       networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, activeRequest);
       await UI.Widget.Widget.allUpdatesComplete;

       const explanationsAfterReload = assertMixedContentExplanations();
       for (const explanation of explanationsAfterReload) {
         const requestsLink = querySelectorErrorOnMissing(explanation, 'devtools-button.security-mixed-content');
         assert.strictEqual(requestsLink.textContent, 'View 1 request in Network panel');
         assert.instanceOf(requestsLink, Buttons.Button.Button);
       }
     });

  it('shows origins with blockable and optionally blockable resources in the sidebar', async () => {
    const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});
    renderElementIntoDOM(securityPanel);

    const pageVisibleSecurityState = new Security.SecurityModel.PageVisibleSecurityState(
        Protocol.Security.SecurityState.Neutral, null, null, ['displayed-mixed-content', 'ran-mixed-content']);
    const securityModel = target.model(Security.SecurityModel.SecurityModel);
    assert.exists(securityModel);
    securityModel.dispatchEventToListeners(
        Security.SecurityModel.Events.VisibleSecurityStateChanged, pageVisibleSecurityState);

    const passive = createNetworkRequest({url: 'http://foo.test'});
    passive.mixedContentType = Protocol.Security.MixedContentType.OptionallyBlockable;
    const networkManager = securityModel.networkManager();
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, passive);
    await UI.Widget.Widget.allUpdatesComplete;
    await doubleRaf();

    const sidebarRoot = securityPanel.contentElement.querySelector('devtools-tree')!.shadowRoot!;
    let items = Array.from(sidebarRoot.querySelectorAll('.security-sidebar-tree-item'), el => el.textContent?.trim());
    assert.include(items, 'http://foo.test');

    const active = createNetworkRequest({url: 'http://bar.test'});
    active.mixedContentType = Protocol.Security.MixedContentType.Blockable;
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, active);
    await UI.Widget.Widget.allUpdatesComplete;
    await doubleRaf();

    items = Array.from(sidebarRoot.querySelectorAll('.security-sidebar-tree-item'), el => el.textContent?.trim());
    assert.include(items, 'http://bar.test');
  });

  it('shows the overview when an interstitial is shown', async () => {
    const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});
    renderElementIntoDOM(securityPanel);
    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.exists(resourceTreeModel);

    const request = createNetworkRequest({url: 'http://foo.test/'});
    request.setSecurityState(Protocol.Security.SecurityState.Insecure);
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request);
    await UI.Widget.Widget.allUpdatesComplete;
    assert.exists(securityPanel.contentElement.querySelector('.security-main-view'));

    securityPanel.showOrigin(urlString`http://foo.test`);
    await UI.Widget.Widget.allUpdatesComplete;
    assert.exists(securityPanel.contentElement.querySelector('.security-origin-view'));
    assert.notExists(securityPanel.contentElement.querySelector('.security-main-view'));

    resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.InterstitialShown);
    await UI.Widget.Widget.allUpdatesComplete;
    assert.exists(securityPanel.contentElement.querySelector('.security-main-view'));
    assert.notExists(securityPanel.contentElement.querySelector('.security-origin-view'));
  });

  it('hides and shows the sidebar origin list when an interstitial is shown or hidden', async () => {
    const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});
    renderElementIntoDOM(securityPanel);

    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.exists(resourceTreeModel);
    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);
    const request1 = createNetworkRequest({url: 'https://foo.test/'});
    request1.setSecurityState(Protocol.Security.SecurityState.Secure);
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request1);

    const request2 = createNetworkRequest({url: 'https://bar.test/foo.jpg'});
    request2.setSecurityState(Protocol.Security.SecurityState.Secure);
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request2);
    await UI.Widget.Widget.allUpdatesComplete;
    await doubleRaf();

    resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.InterstitialShown);
    // Simulate a request finishing after the interstitial is shown, to make sure that doesn't show up in the sidebar.
    const request3 = createNetworkRequest({url: 'https://bar.test/foo.jpg'});
    request3.setSecurityState(Protocol.Security.SecurityState.Unknown);
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request3);
    await UI.Widget.Widget.allUpdatesComplete;
    await doubleRaf();

    const sidebarRoot = securityPanel.contentElement.querySelector('devtools-tree')!.shadowRoot!;
    const originsGroup = sidebarRoot.querySelector('.security-sidebar-origins');
    assert.isTrue(originsGroup?.classList.contains('hidden'));

    // Test that the sidebar is shown again when the interstitial is hidden. https://crbug.com/559150
    resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.InterstitialHidden);
    await UI.Widget.Widget.allUpdatesComplete;
    await doubleRaf();

    assert.isFalse(originsGroup?.classList.contains('hidden'));
  });

  describe('presenter and view function stub', () => {
    it('passes initial state to view function and updates on showOrigin', async () => {
      const viewStub = createViewFunctionStub(Security.SecurityPanel.SecurityPanel);
      const securityPanel = new Security.SecurityPanel.SecurityPanel(viewStub);
      renderElementIntoDOM(securityPanel);
      await UI.Widget.Widget.allUpdatesComplete;

      sinon.assert.calledOnce(viewStub);
      assert.isNull(viewStub.input.mainOrigin);
      assert.strictEqual(viewStub.input.sidebarOrigins.size, 0);
      assert.isFalse(viewStub.input.originsHidden);
      assert.isFalse(viewStub.input.showOriginsUnconditionally);
      assert.strictEqual(viewStub.input.overviewSecurityState, Protocol.Security.SecurityState.Unknown);
      assert.isNull(viewStub.input.activeOrigin);
      assert.isNull(viewStub.input.activeOriginState);
      assert.isNull(viewStub.input.visibleSecurityState);
      assert.strictEqual(viewStub.input.filterRequestCounts.size, 0);

      const requestUpdateSpy = sinon.spy(securityPanel, 'requestUpdate');

      // Calling showOrigin with an unknown origin is ignored by the guard.
      securityPanel.showOrigin(urlString`https://unknown.example`);
      sinon.assert.notCalled(requestUpdateSpy);
      assert.isNull(viewStub.input.activeOrigin);

      // Seed origin via a finished request
      const networkManager = target.model(SDK.NetworkManager.NetworkManager);
      assert.exists(networkManager);
      const request = createNetworkRequest({url: 'https://foo.bar/index.html'});
      request.setSecurityState(Protocol.Security.SecurityState.Secure);
      networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request);
      await UI.Widget.Widget.allUpdatesComplete;

      assert.strictEqual(viewStub.input.sidebarOrigins.size, 1);

      securityPanel.showOrigin(urlString`https://foo.bar`);
      sinon.assert.called(requestUpdateSpy);
      const updateCallCount = requestUpdateSpy.callCount;

      // Redundant call is guarded
      securityPanel.showOrigin(urlString`https://foo.bar`);
      sinon.assert.callCount(requestUpdateSpy, updateCallCount);

      await UI.Widget.Widget.allUpdatesComplete;
      assert.strictEqual(viewStub.input.activeOrigin, urlString`https://foo.bar`);

      // onShowOrigin callback switches origin
      viewStub.input.onShowOrigin(null);
      await UI.Widget.Widget.allUpdatesComplete;
      assert.isNull(viewStub.input.activeOrigin);
    });
  });
});
