// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {doubleRaf, querySelectorErrorOnMissing, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {createNetworkRequest} from '../../testing/NetworkRequestHelpers.js';
import {getMainFrame, navigate} from '../../testing/ResourceTreeHelpers.js';
import * as NetworkForward from '../network/forward/forward.js';

import * as Security from './security.js';

const {urlString} = Platform.DevToolsPath;

describe('createHighlightedUrl', () => {
  it('renders a URL without a scheme separator as plain text', () => {
    const highlightedUrl =
        Security.SecurityPanel.createHighlightedUrl(urlString`foo.bar`, Protocol.Security.SecurityState.Secure);

    assert.strictEqual(highlightedUrl.textContent, 'foo.bar');
    assert.isFalse(highlightedUrl.classList.contains('highlighted-url'));
  });

  it('renders a URL with a highlighted scheme', () => {
    const highlightedUrl =
        Security.SecurityPanel.createHighlightedUrl(urlString`https://foo.bar`, Protocol.Security.SecurityState.Secure);

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

describeWithEnvironment('SecurityOriginView', () => {
  function createOriginState(securityDetails: Partial<Protocol.Network.SecurityDetails> = {}):
      Security.SecurityPanel.OriginState {
    return {
      securityState: Protocol.Security.SecurityState.Secure,
      securityDetails: {
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
        ...securityDetails,
      },
      loadedFromCache: false,
    };
  }

  function getDetailsTableRows(section: HTMLElement): string[][] {
    return [...section.querySelectorAll<HTMLTableRowElement>('.details-table-row')].map(
        row => [...row.cells].map(cell => cell.textContent ?? ''));
  }

  describe('connection section', () => {
    function getConnectionDetailsRows(securityDetails: Partial<Protocol.Network.SecurityDetails> = {}): string[][] {
      const view =
          new Security.SecurityPanel.SecurityOriginView(urlString`https://foo.bar`, createOriginState(securityDetails));
      const connectionSection = querySelectorErrorOnMissing(view.element, '.connection-section');
      return getDetailsTableRows(connectionSection);
    }

    it('renders the heading', () => {
      const view = new Security.SecurityPanel.SecurityOriginView(urlString`https://foo.bar`, createOriginState());

      const connectionSection = querySelectorErrorOnMissing(view.element, '.connection-section');

      const heading = querySelectorErrorOnMissing(connectionSection, '.origin-view-section-title');
      assert.strictEqual(heading.textContent, 'Connection');
      assert.strictEqual(heading.getAttribute('role'), 'heading');
      assert.strictEqual(heading.getAttribute('aria-level'), '2');
    });

    it('does not render without security details', () => {
      const view = new Security.SecurityPanel.SecurityOriginView(urlString`https://foo.bar`, {
        securityState: Protocol.Security.SecurityState.Secure,
        securityDetails: null,
        loadedFromCache: false,
      });

      assert.notExists(view.element.querySelector('.connection-section'));
    });

    it('renders all connection details in order', () => {
      assert.deepEqual(getConnectionDetailsRows({
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

    it('renders the protocol', () => {
      assert.deepInclude(getConnectionDetailsRows({protocol: 'TLS 1.2'}), ['Protocol', 'TLS 1.2']);
    });

    describe('key exchange', () => {
      it('renders the algorithm and group', () => {
        assert.deepInclude(getConnectionDetailsRows({keyExchange: 'ECDHE_RSA', keyExchangeGroup: 'X25519'}),
                           ['Key exchange', 'ECDHE_RSA with X25519']);
      });

      it('renders only the algorithm', () => {
        assert.deepInclude(getConnectionDetailsRows({keyExchange: 'ECDHE_RSA', keyExchangeGroup: undefined}),
                           ['Key exchange', 'ECDHE_RSA']);
      });

      it('renders only the group', () => {
        assert.deepInclude(getConnectionDetailsRows({keyExchange: '', keyExchangeGroup: 'X25519'}),
                           ['Key exchange', 'X25519']);
      });

      it('does not render when both are unavailable', () => {
        const rowNames = getConnectionDetailsRows({
                           keyExchange: '',
                           keyExchangeGroup: undefined,
                         }).map(([key]) => key);
        assert.notInclude(rowNames, 'Key exchange');
      });
    });

    describe('server signature', () => {
      it('renders a known algorithm', () => {
        assert.deepInclude(getConnectionDetailsRows({serverSignatureAlgorithm: 0x0804}),
                           ['Server signature', 'RSA-PSS with SHA-256']);
      });

      it('renders an unknown algorithm', () => {
        assert.deepInclude(getConnectionDetailsRows({serverSignatureAlgorithm: 0xffff}),
                           ['Server signature', 'unknown (65535)']);
      });

      it('does not render when unavailable', () => {
        const rowNames = getConnectionDetailsRows({serverSignatureAlgorithm: undefined}).map(([key]) => key);
        assert.notInclude(rowNames, 'Server signature');
      });
    });

    describe('cipher', () => {
      it('renders with a MAC', () => {
        assert.deepInclude(getConnectionDetailsRows({cipher: 'AES_128_GCM', mac: 'HMAC-SHA256'}),
                           ['Cipher', 'AES_128_GCM with HMAC-SHA256']);
      });

      it('renders without a MAC', () => {
        assert.deepInclude(getConnectionDetailsRows({cipher: 'AES_128_GCM', mac: undefined}),
                           ['Cipher', 'AES_128_GCM']);
      });
    });

    describe('Encrypted ClientHello', () => {
      it('renders when enabled', () => {
        assert.deepInclude(getConnectionDetailsRows({encryptedClientHello: true}),
                           ['Encrypted ClientHello', 'enabled']);
      });

      it('does not render when disabled', () => {
        const rowNames = getConnectionDetailsRows({encryptedClientHello: false}).map(([key]) => key);
        assert.notInclude(rowNames, 'Encrypted ClientHello');
      });
    });
  });

  describe('title section', () => {
    it('renders the title, origin, and Network panel button', () => {
      const origin = urlString`https://foo.bar`;
      const view = new Security.SecurityPanel.SecurityOriginView(origin, createOriginState());

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

    it('updates the origin display when the security state changes', () => {
      const view = new Security.SecurityPanel.SecurityOriginView(urlString`https://foo.bar`, createOriginState());

      const initialOriginDisplay = view.element.querySelector('.origin-display');
      assert.instanceOf(initialOriginDisplay, HTMLElement);

      const initialIcon = initialOriginDisplay.querySelector('devtools-icon');
      assert.instanceOf(initialIcon, HTMLElement);
      assert.strictEqual(initialIcon.getAttribute('name'), 'lock');
      assert.isTrue(initialIcon.classList.contains('security-property-secure'));

      assert.exists(initialOriginDisplay.querySelector('.url-scheme-secure'));

      view.setSecurityState(Protocol.Security.SecurityState.Insecure);

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

    it('reveals requests in the Network panel', () => {
      const revealStub = sinon.stub(Common.Revealer.RevealerRegistry.instance(), 'reveal').resolves();
      const view = new Security.SecurityPanel.SecurityOriginView(urlString`https://foo.bar`, createOriginState());

      const networkButton = view.element.querySelector('.view-network-button devtools-button');
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
    it('renders the heading', () => {
      const view = new Security.SecurityPanel.SecurityOriginView(urlString`https://foo.bar`, createOriginState());

      const certificateSection = querySelectorErrorOnMissing(view.element, '.certificate-section');
      const heading = querySelectorErrorOnMissing(certificateSection, '.origin-view-section-title');
      assert.strictEqual(heading.textContent, 'Certificate');
      assert.strictEqual(heading.getAttribute('role'), 'heading');
      assert.strictEqual(heading.getAttribute('aria-level'), '2');
    });

    it('does not render without security details', () => {
      const view = new Security.SecurityPanel.SecurityOriginView(urlString`https://foo.bar`, {
        securityState: Protocol.Security.SecurityState.Secure,
        securityDetails: null,
        loadedFromCache: false,
      });

      assert.notExists(view.element.querySelector('.certificate-section'));
    });

    it('renders all certificate details in order', () => {
      const view = new Security.SecurityPanel.SecurityOriginView(urlString`https://foo.bar`, createOriginState({
                                                                   subjectName: 'example.com',
                                                                   sanList: ['san.example.com'],
                                                                   validFrom: 0,
                                                                   validTo: 86400,
                                                                   issuer: 'Test CA',
                                                                 }));
      const certificateSection = querySelectorErrorOnMissing(view.element, '.certificate-section');

      assert.deepEqual(getDetailsTableRows(certificateSection), [
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
      const view = new Security.SecurityPanel.SecurityOriginView(urlString`https://foo.bar`, createOriginState());

      const certificateSection = querySelectorErrorOnMissing(view.element, '.certificate-section');
      const certificateButton = querySelectorErrorOnMissing(certificateSection, 'devtools-button.origin-button');
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
      const view = new Security.SecurityPanel.SecurityOriginView(urlString`https://foo.bar`, createOriginState());

      const certificateSection = querySelectorErrorOnMissing(view.element, '.certificate-section');
      const certificateButton = querySelectorErrorOnMissing(certificateSection, 'devtools-button.origin-button');
      certificateButton.click();
      await getCertificate.firstCall.returnValue;

      sinon.assert.calledOnceWithExactly(getCertificate, 'https://foo.bar');
      sinon.assert.notCalled(showCertificateViewer);
    });
  });

  describe('certificate transparency section', () => {
    it('renders the heading, SCT summary, and details', () => {
      const view = new Security.SecurityPanel.SecurityOriginView(
          urlString`https://foo.bar`, createOriginState({
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
          }));

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

    it('does not render when the SCT list is empty and compliance is unknown', () => {
      const view = new Security.SecurityPanel.SecurityOriginView(
          urlString`https://foo.bar`, createOriginState({
            signedCertificateTimestampList: [],
            certificateTransparencyCompliance: Protocol.Network.CertificateTransparencyCompliance.Unknown,
          }));

      assert.notExists(view.element.querySelector('.certificate-transparency-section'));
      assert.notExists(view.element.querySelector('.origin-view-notes'));
    });

    it('renders without a note when the SCT list is not empty and compliance is unknown', () => {
      const view = new Security.SecurityPanel.SecurityOriginView(
          urlString`https://foo.bar`, createOriginState({
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
          }));

      const section = querySelectorErrorOnMissing(view.element, '.certificate-transparency-section');
      assert.notExists(section.querySelector('.origin-view-section-notes'));
    });

    const cases = [
      {
        compliance: Protocol.Network.CertificateTransparencyCompliance.Compliant,
        expectedNote: 'This request complies with Chrome’s Certificate Transparency policy.',
      },
      {
        compliance: Protocol.Network.CertificateTransparencyCompliance.NotCompliant,
        expectedNote: 'This request doesn’t comply with Chrome’s Certificate Transparency policy.',
      },
    ];
    for (const {compliance, expectedNote} of cases) {
      it(`renders with a note when compliance is ${compliance}`, () => {
        const originState = createOriginState({
          signedCertificateTimestampList: [],
          certificateTransparencyCompliance: compliance,
        });
        const view = new Security.SecurityPanel.SecurityOriginView(urlString`https://foo.bar`, originState);

        const section = querySelectorErrorOnMissing(view.element, '.certificate-transparency-section');
        const note = querySelectorErrorOnMissing(section, '.origin-view-section-notes');
        assert.strictEqual(note.textContent, expectedNote);
      });
    }

    it('toggles SCT details', () => {
      const view = new Security.SecurityPanel.SecurityOriginView(
          urlString`https://foo.bar`, createOriginState({
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
          }));
      renderElementIntoDOM(view, {includeCommonStyles: true});
      const section = querySelectorErrorOnMissing(view.element, '.certificate-transparency-section');
      const summary = querySelectorErrorOnMissing(section, '.sct-summary');
      const details = querySelectorErrorOnMissing(section, '.sct-details');
      const toggle = section.querySelector('devtools-button');

      assert.isTrue(summary.checkVisibility());
      assert.isFalse(details.checkVisibility());
      assert.instanceOf(toggle, HTMLElement);
      assert.strictEqual(toggle.textContent, 'Show full details');
      assert.strictEqual(toggle.accessibleLabel, 'Show full details');
      assert.isFalse(toggle.accessibleExpanded);

      toggle.click();

      assert.isFalse(summary.checkVisibility());
      assert.isTrue(details.checkVisibility());
      assert.strictEqual(toggle.textContent, 'Hide full details');
      assert.strictEqual(toggle.accessibleLabel, 'Hide full details');
      assert.isTrue(toggle.accessibleExpanded);
    });
  });

  it('renders an empty SAN', () => {
    const view = new Security.SecurityPanel.SecurityOriginView(urlString`https://foo.bar`, createOriginState());

    const sanElement = view.element.querySelector('.san');
    assert.instanceOf(sanElement, HTMLElement);
    assert.strictEqual(sanElement.textContent, '(n/a)');
  });

  it('renders a SAN without truncation button', () => {
    const view = new Security.SecurityPanel.SecurityOriginView(
        urlString`https://foo.bar`, createOriginState({sanList: ['a.test', 'b.test', 'c.test']}));
    renderElementIntoDOM(view);

    const sanElement = view.element.querySelector('.san');
    assert.instanceOf(sanElement, HTMLElement);

    const sanEntries = [...sanElement.querySelectorAll<HTMLElement>('.san-entry')];
    assert.deepEqual(sanEntries.map(entry => entry.textContent), ['a.test', 'b.test', 'c.test']);
    assert.isTrue(sanEntries.every(entry => entry.checkVisibility()));

    const truncationToggle = sanElement.querySelector('devtools-button');
    assert.notExists(truncationToggle);
  });

  it('renders a SAN with truncation button and updates on truncation toggle', () => {
    const view = new Security.SecurityPanel.SecurityOriginView(
        urlString`https://foo.bar`, createOriginState({sanList: ['a.test', 'b.test', 'c.test', 'd.test']}));
    renderElementIntoDOM(view);

    const sanElement = view.element.querySelector('.san');
    assert.instanceOf(sanElement, HTMLElement);

    const visibleSanEntries = () => [...sanElement.querySelectorAll<HTMLElement>('.san-entry')]
                                        .filter(entry => entry.checkVisibility())
                                        .map(entry => entry.textContent);

    assert.deepEqual(visibleSanEntries(), ['a.test', 'b.test']);

    const toggleButton = sanElement.querySelector('devtools-button');
    assert.instanceOf(toggleButton, HTMLElement);
    assert.strictEqual(toggleButton.textContent, 'Show more (4 total)');
    assert.isFalse(toggleButton.accessibleExpanded);

    toggleButton.click();

    assert.deepEqual(visibleSanEntries(), ['a.test', 'b.test', 'c.test', 'd.test']);
    assert.strictEqual(toggleButton.textContent, 'Show less');
    assert.isTrue(toggleButton.accessibleExpanded);

    toggleButton.click();

    assert.deepEqual(visibleSanEntries(), ['a.test', 'b.test']);
    assert.strictEqual(toggleButton.textContent, 'Show more (4 total)');
    assert.isFalse(toggleButton.accessibleExpanded);
  });
});

describeWithEnvironment('SecurityPanelSidebarTree', () => {
  describe('updateOrigin', () => {
    it('correctly updates the URL scheme highlighting', async () => {
      const origin = urlString`https://foo.bar`;
      const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});

      securityPanel.sidebar.addOrigin(origin, Protocol.Security.SecurityState.Unknown);
      await doubleRaf();
      assert.notExists(securityPanel.sidebar.contentElement.querySelector('devtools-tree')!.shadowRoot!.querySelector(
          '.highlighted-url > .url-scheme-secure'));
      assert.exists(securityPanel.sidebar.contentElement.querySelector('devtools-tree')!.shadowRoot!.querySelector(
          '.highlighted-url > .url-scheme-unknown'));

      securityPanel.sidebar.updateOrigin(origin, Protocol.Security.SecurityState.Secure);
      await doubleRaf();

      assert.exists(securityPanel.sidebar.contentElement.querySelector('devtools-tree')!.shadowRoot!.querySelector(
          '.highlighted-url > .url-scheme-secure'));
      assert.notExists(securityPanel.sidebar.contentElement.querySelector('devtools-tree')!.shadowRoot!.querySelector(
          '.highlighted-url > .url-scheme-unknown'));
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

  it('updates when security state changes', async () => {
    const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});
    const securityModel = target.model(Security.SecurityModel.SecurityModel);
    assert.exists(securityModel);
    const visibleSecurityState = {
      securityState: Protocol.Security.SecurityState.Insecure,
      securityStateIssueIds: [],
      certificateSecurityState: null,
    } as unknown as Security.SecurityModel.PageVisibleSecurityState;
    securityModel.dispatchEventToListeners(
        Security.SecurityModel.Events.VisibleSecurityStateChanged, visibleSecurityState);

    assert.isTrue(securityPanel.mainView.contentElement.querySelector('.security-summary')
                      ?.classList.contains('security-summary-insecure'));

    visibleSecurityState.securityState = Protocol.Security.SecurityState.Secure;
    securityModel.dispatchEventToListeners(
        Security.SecurityModel.Events.VisibleSecurityStateChanged, visibleSecurityState);

    assert.isFalse(securityPanel.mainView.contentElement.querySelector('.security-summary')
                       ?.classList.contains('security-summary-insecure'));
    assert.isTrue(securityPanel.mainView.contentElement.querySelector('.security-summary')
                      ?.classList.contains('security-summary-secure'));
  });

  it('can switch to a different SecurityModel', async () => {
    const mainSecurityModel = target.model(Security.SecurityModel.SecurityModel);
    assert.exists(mainSecurityModel);
    const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});

    // Add the main target to the security panel.
    securityPanel.modelAdded(mainSecurityModel);
    const visibleSecurityState = {
      securityState: Protocol.Security.SecurityState.Insecure,
      securityStateIssueIds: [],
      certificateSecurityState: null,
    } as unknown as Security.SecurityModel.PageVisibleSecurityState;
    mainSecurityModel.dispatchEventToListeners(
        Security.SecurityModel.Events.VisibleSecurityStateChanged, visibleSecurityState);
    assert.isTrue(securityPanel.mainView.contentElement.querySelector('.security-summary')
                      ?.classList.contains('security-summary-insecure'));

    // Switch to the prerender target.
    const prerenderSecurityModel = prerenderTarget.model(Security.SecurityModel.SecurityModel);
    assert.exists(prerenderSecurityModel);
    securityPanel.modelAdded(prerenderSecurityModel);
    securityPanel.modelRemoved(mainSecurityModel);

    // Check that the security panel does not listen to events from the previous target.
    visibleSecurityState.securityState = Protocol.Security.SecurityState.Secure;
    mainSecurityModel.dispatchEventToListeners(
        Security.SecurityModel.Events.VisibleSecurityStateChanged, visibleSecurityState);
    assert.isTrue(securityPanel.mainView.contentElement.querySelector('.security-summary')
                      ?.classList.contains('security-summary-insecure'));

    // Check that the security panel listens to events from the current target.
    prerenderSecurityModel.dispatchEventToListeners(
        Security.SecurityModel.Events.VisibleSecurityStateChanged, visibleSecurityState);
    assert.isTrue(securityPanel.mainView.contentElement.querySelector('.security-summary')
                      ?.classList.contains('security-summary-secure'));

    // Check that the SecurityPanel listens to any PrimaryPageChanged event
    const sidebarTreeClearSpy = sinon.spy(securityPanel.sidebar, 'clearOrigins');
    navigate(getMainFrame(target));
    sinon.assert.calledOnce(sidebarTreeClearSpy);
  });

  it('preserves the selected origin when the panel is hidden and shown again', async () => {
    const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});
    const securityModel = target.model(Security.SecurityModel.SecurityModel);
    assert.exists(securityModel);
    const networkManager = securityModel.networkManager();
    const request = createNetworkRequest({
      url: 'https://foo.test',
      documentURL: 'https://foo.test',
      frameId: '0',
      loaderId: '0',
    });
    request.setSecurityState(Protocol.Security.SecurityState.Secure);
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request);

    // Select the origin
    securityPanel.showOrigin(urlString`https://foo.test`);

    // The active view should be the origin view, not the main view.
    assert.instanceOf(securityPanel.visibleView, Security.SecurityPanel.SecurityOriginView);

    // Hide and show the panel
    securityPanel.willHide();
    securityPanel.sidebar.willHide();
    securityPanel.wasShown();
    securityPanel.sidebar.wasShown();

    // The active view should still be the origin view.
    assert.instanceOf(securityPanel.visibleView, Security.SecurityPanel.SecurityOriginView);
  });

  it('shows \'reload page\' message when no data is available', async () => {
    const securityModel = target.model(Security.SecurityModel.SecurityModel);
    assert.exists(securityModel);
    const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});
    await doubleRaf();

    // Check that reload message is visible initially.
    const reloadMessage =
        securityPanel.sidebar.contentElement.querySelector('devtools-tree')!.shadowRoot!.querySelector(
            '.security-main-view-reload-message');
    assert.instanceOf(reloadMessage, HTMLLIElement);
    assert.exists(securityPanel.sidebar.contentElement.querySelector('devtools-tree')!.shadowRoot!.querySelector(
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
    await doubleRaf();
    assert.notExists(securityPanel.sidebar.contentElement.querySelector('devtools-tree')!.shadowRoot!.querySelector(
        '.security-main-view-reload-message'));

    // Check that reload message is hidden after clearing data.
    navigate(getMainFrame(target));
    await doubleRaf();
    assert.exists(securityPanel.sidebar.contentElement.querySelector('devtools-tree')!.shadowRoot!.querySelector(
        '.security-main-view-reload-message'));
  });

  it('does not show blank origins in the sidebar', async () => {
    const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});
    renderElementIntoDOM(securityPanel);
    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);

    const request1 = createNetworkRequest({
      url: 'https://foo.test/foo.jpg',
      documentURL: 'https://foo.test',
      frameId: '0',
      loaderId: '0',
    });
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request1);

    const request2 = createNetworkRequest({
      url:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAKCAYAAABmBXS+AAAAPElEQVR42mNgQAMZGRn/GfABkIIdO3b8x6kQpgAEsCpEVgADKAqxKcBQCCLwARRFIBodYygiyiSCighhAO4e2jskhrm3AAAAAElFTkSuQmCC',
      documentURL: 'https://foo.test',
      frameId: '0',
      loaderId: '0',
    });
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request2);
    await doubleRaf();

    const sidebarRoot = securityPanel.sidebar.contentElement.querySelector('devtools-tree')!.shadowRoot!;
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

    const request1 = createNetworkRequest({
      url: 'https://foo.test/foo.jpg',
      documentURL: 'https://foo.test',
      frameId: '0',
      loaderId: '0',
    });
    request1.setSecurityState(Protocol.Security.SecurityState.Secure);
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request1);

    const request2 = createNetworkRequest({
      url: 'https://does-not-resolve.test',
      documentURL: 'https://does-not-resolve.test',
      frameId: '0',
      loaderId: '0',
    });
    // Leave the security state unknown.
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request2);
    await doubleRaf();

    const sidebarRoot = securityPanel.sidebar.contentElement.querySelector('devtools-tree')!.shadowRoot!;
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

  it('shows an explanation for blocked mixed content', () => {
    const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});
    renderElementIntoDOM(securityPanel);
    const securityModel = target.model(Security.SecurityModel.SecurityModel);
    assert.exists(securityModel);
    const pageVisibleSecurityState = new Security.SecurityModel.PageVisibleSecurityState(
        Protocol.Security.SecurityState.Neutral, null, null, ['scheme-is-not-cryptographic']);
    securityModel.dispatchEventToListeners(Security.SecurityModel.Events.VisibleSecurityStateChanged,
                                           pageVisibleSecurityState);

    const request = createNetworkRequest({
      url: 'http://foo.test',
      documentURL: 'https://foo.test',
      frameId: '0',
      loaderId: '0',
    });
    request.setBlockedReason(Protocol.Network.BlockedReason.MixedContent);
    request.mixedContentType = Protocol.Security.MixedContentType.Blockable;
    const networkManager = securityModel.networkManager();
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request);

    const explanations = securityPanel.mainView.contentElement.querySelectorAll<HTMLElement>('.security-explanation');
    assert.lengthOf(explanations, 1);
    const explanation = explanations[0];
    assert.isTrue(explanation.classList.contains('security-explanation-info'));

    const title = querySelectorErrorOnMissing(explanation, '.security-explanation-title');
    assert.strictEqual(title.textContent, 'Blocked mixed content');

    const explanationText = querySelectorErrorOnMissing(explanation, '.security-explanation-text');
    assert.include(explanationText.textContent, 'Your page requested non-secure resources that were blocked.');

    const requestsLink = querySelectorErrorOnMissing(explanation, 'button.security-mixed-content');
    assert.strictEqual(requestsLink.textContent, 'View 1 request in Network panel');
    assert.strictEqual(requestsLink.getAttribute('role'), 'link');
  });

  it('shows origins with blockable and optionally blockable resources in the sidebar', async () => {
    const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});

    const sidebarTreeClearSpy = sinon.spy(securityPanel.sidebar, 'addOrigin');
    const pageVisibleSecurityState = new Security.SecurityModel.PageVisibleSecurityState(
        Protocol.Security.SecurityState.Neutral, null, null, ['displayed-mixed-content', 'ran-mixed-content']);
    const securityModel = target.model(Security.SecurityModel.SecurityModel);
    assert.exists(securityModel);
    securityModel.dispatchEventToListeners(
        Security.SecurityModel.Events.VisibleSecurityStateChanged, pageVisibleSecurityState);

    const passive = createNetworkRequest({
      url: 'http://foo.test',
      documentURL: 'https://foo.test',
      frameId: '0',
      loaderId: '0',
    });
    passive.mixedContentType = Protocol.Security.MixedContentType.OptionallyBlockable;
    const networkManager = securityModel.networkManager();
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, passive);

    assert.isTrue(
        sidebarTreeClearSpy.calledOnceWith(urlString`http://foo.test`, Protocol.Security.SecurityState.Insecure));
    sidebarTreeClearSpy.resetHistory();

    const active = createNetworkRequest({
      url: 'http://bar.test',
      documentURL: 'https://bar.test',
      frameId: '0',
      loaderId: '0',
    });
    active.mixedContentType = Protocol.Security.MixedContentType.Blockable;
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, active);

    assert.isTrue(
        sidebarTreeClearSpy.calledOnceWith(urlString`http://bar.test`, Protocol.Security.SecurityState.Insecure));
  });

  it('hides and shows the sidebar origin list when an interstitial is shown or hidden', async () => {
    const securityPanel = Security.SecurityPanel.SecurityPanel.instance({forceNew: true});

    const toggleSidebarSpy = sinon.spy(securityPanel.sidebar, 'toggleOriginsList');
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.exists(resourceTreeModel);
    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assert.exists(networkManager);
    const request1 = createNetworkRequest({
      url: 'https://foo.test/',
      documentURL: 'https://foo.test',
      frameId: '0',
      loaderId: '0',
    });
    request1.setSecurityState(Protocol.Security.SecurityState.Secure);
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request1);

    const request2 = createNetworkRequest({
      url: 'https://bar.test/foo.jpg',
      documentURL: 'https://bar.test',
      frameId: '0',
      loaderId: '0',
    });
    request2.setSecurityState(Protocol.Security.SecurityState.Secure);
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request2);

    resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.InterstitialShown);
    // Simulate a request finishing after the interstitial is shown, to make sure that doesn't show up in the sidebar.
    const request3 = createNetworkRequest({
      url: 'https://bar.test/foo.jpg',
      documentURL: 'https://bar.test',
      frameId: '0',
      loaderId: '0',
    });
    request3.setSecurityState(Protocol.Security.SecurityState.Unknown);
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, request3);
    assert.isTrue(toggleSidebarSpy.calledOnceWith(true));
    toggleSidebarSpy.resetHistory();

    // Test that the sidebar is shown again when the interstitial is hidden. https://crbug.com/559150
    resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.InterstitialHidden);

    assert.isTrue(toggleSidebarSpy.calledOnceWith(false));
  });
});
