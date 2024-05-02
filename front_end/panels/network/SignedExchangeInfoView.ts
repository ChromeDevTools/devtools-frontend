// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';

import signedExchangeInfoTreeStyles from './signedExchangeInfoTree.css.js';
import signedExchangeInfoViewStyles from './signedExchangeInfoView.css.js';

import type * as SDK from '../../core/sdk/sdk.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Protocol from '../../generated/protocol.js';

const UIStrings = {
  /**
   *@description Text for errors
   */
  errors: 'Errors',
  /**
   *@description Text in Signed Exchange Info View of the Network panel
   */
  signedHttpExchange: 'Signed HTTP exchange',
  /**
   *@description Text for an option to learn more about something
   */
  learnmore: 'Learn more',
  /**
   *@description Text in Request Headers View of the Network panel
   */
  requestUrl: 'Request URL',
  /**
   *@description Text in Signed Exchange Info View of the Network panel
   */
  responseCode: 'Response code',
  /**
   *@description Text in Signed Exchange Info View of the Network panel
   */
  headerIntegrityHash: 'Header integrity hash',
  /**
   *@description Text in Signed Exchange Info View of the Network panel
   */
  responseHeaders: 'Response headers',
  /**
   *@description Text in Signed Exchange Info View of the Network panel
   */
  signature: 'Signature',
  /**
   *@description Text in Signed Exchange Info View of the Network panel
   */
  label: 'Label',
  /**
   *@description Text in Signed Exchange Info View of the Network panel
   */
  certificateUrl: 'Certificate URL',
  /**
   *@description Text to view a security certificate
   */
  viewCertificate: 'View certificate',
  /**
   *@description Text in Signed Exchange Info View of the Network panel
   */
  integrity: 'Integrity',
  /**
   *@description Text in Signed Exchange Info View of the Network panel
   */
  certificateSha: 'Certificate SHA256',
  /**
   *@description Text in Signed Exchange Info View of the Network panel
   */
  validityUrl: 'Validity URL',
  /**
   *@description Text in Signed Exchange Info View of the Network panel
   */
  date: 'Date',
  /**
   *@description Text in Signed Exchange Info View of the Network panel
   */
  expires: 'Expires',
  /**
   *@description Text for a security certificate
   */
  certificate: 'Certificate',
  /**
   *@description Text that refers to the subject of a security certificate
   */
  subject: 'Subject',
  /**
   *@description Text to show since when an item is valid
   */
  validFrom: 'Valid from',
  /**
   *@description Text to indicate the expiry date
   */
  validUntil: 'Valid until',
  /**
   *@description Text for the issuer of an item
   */
  issuer: 'Issuer',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/SignedExchangeInfoView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class SignedExchangeInfoView extends UI.Widget.VBox {
  private readonly responseHeadersItem?: UI.TreeOutline.TreeElement;

  constructor(request: SDK.NetworkRequest.NetworkRequest) {
    super();
    console.assert(request.signedExchangeInfo() !== null);
    const signedExchangeInfo = (request.signedExchangeInfo() as Protocol.Network.SignedExchangeInfo);

    this.element.classList.add('signed-exchange-info-view');

    const root = new UI.TreeOutline.TreeOutlineInShadow();
    root.registerCSSFiles([signedExchangeInfoTreeStyles]);
    root.element.classList.add('signed-exchange-info-tree');
    root.setFocusable(false);
    root.makeDense();
    root.expandTreeElementsWhenArrowing = true;
    this.element.appendChild(root.element);

    const errorFieldSetMap = new Map<number|undefined, Set<string>>();

    if (signedExchangeInfo.errors && signedExchangeInfo.errors.length) {
      const errorMessagesCategory = new Category(root, i18nString(UIStrings.errors));
      for (const error of signedExchangeInfo.errors) {
        const fragment = document.createDocumentFragment();
        const icon = new IconButton.Icon.Icon();
        icon.data = {iconName: 'cross-circle-filled', color: 'var(--icon-error)', width: '14px', height: '14px'};
        icon.classList.add('prompt-icon');
        fragment.appendChild(icon);
        fragment.createChild('div', 'error-log').textContent = error.message;
        errorMessagesCategory.createLeaf(fragment);
        if (error.errorField) {
          let errorFieldSet = errorFieldSetMap.get(error.signatureIndex);
          if (!errorFieldSet) {
            errorFieldSet = new Set();
            errorFieldSetMap.set(error.signatureIndex, errorFieldSet);
          }
          errorFieldSet.add(error.errorField);
        }
      }
    }

    const titleElement = document.createDocumentFragment();
    titleElement.createChild('div', 'header-name').textContent = i18nString(UIStrings.signedHttpExchange);
    const learnMoreNode = UI.XLink.XLink.create(
        'https://github.com/WICG/webpackage', i18nString(UIStrings.learnmore), 'header-toggle', undefined,
        'learn-more');
    titleElement.appendChild(learnMoreNode);
    const headerCategory = new Category(root, titleElement);
    if (signedExchangeInfo.header) {
      const header = signedExchangeInfo.header;
      const redirectDestination = request.redirectDestination();
      const requestURLElement = this.formatHeader(i18nString(UIStrings.requestUrl), header.requestUrl);
      if (redirectDestination) {
        const viewRequestLink = Components.Linkifier.Linkifier.linkifyRevealable(redirectDestination, 'View request');
        viewRequestLink.classList.add('header-toggle');
        requestURLElement.appendChild(viewRequestLink);
      }
      headerCategory.createLeaf(requestURLElement);
      headerCategory.createLeaf(this.formatHeader(i18nString(UIStrings.responseCode), String(header.responseCode)));
      headerCategory.createLeaf(this.formatHeader(i18nString(UIStrings.headerIntegrityHash), header.headerIntegrity));

      this.responseHeadersItem =
          headerCategory.createLeaf(this.formatHeader(i18nString(UIStrings.responseHeaders), ''));
      const responseHeaders = header.responseHeaders;
      for (const name in responseHeaders) {
        const headerTreeElement = new UI.TreeOutline.TreeElement(this.formatHeader(name, responseHeaders[name]));
        headerTreeElement.selectable = false;
        this.responseHeadersItem.appendChild(headerTreeElement);
      }
      this.responseHeadersItem.expand();

      for (let i = 0; i < header.signatures.length; ++i) {
        const errorFieldSet = errorFieldSetMap.get(i) || new Set();
        const signature = header.signatures[i];
        const signatureCategory = new Category(root, i18nString(UIStrings.signature));
        signatureCategory.createLeaf(this.formatHeader(i18nString(UIStrings.label), signature.label));
        signatureCategory.createLeaf(this.formatHeaderForHexData(
            i18nString(UIStrings.signature), signature.signature,
            errorFieldSet.has(Protocol.Network.SignedExchangeErrorField.SignatureSig)));

        if (signature.certUrl) {
          const certURLElement = this.formatHeader(
              i18nString(UIStrings.certificateUrl), signature.certUrl,
              errorFieldSet.has(Protocol.Network.SignedExchangeErrorField.SignatureCertUrl));
          if (signature.certificates) {
            const viewCertLink = certURLElement.createChild('span', 'devtools-link header-toggle');
            viewCertLink.textContent = i18nString(UIStrings.viewCertificate);
            viewCertLink.addEventListener(
                'click',
                Host.InspectorFrontendHost.InspectorFrontendHostInstance.showCertificateViewer.bind(
                    null, signature.certificates),
                false);
          }
          signatureCategory.createLeaf(certURLElement);
        }
        signatureCategory.createLeaf(this.formatHeader(
            i18nString(UIStrings.integrity), signature.integrity,
            errorFieldSet.has(Protocol.Network.SignedExchangeErrorField.SignatureIntegrity)));
        if (signature.certSha256) {
          signatureCategory.createLeaf(this.formatHeaderForHexData(
              i18nString(UIStrings.certificateSha), signature.certSha256,
              errorFieldSet.has(Protocol.Network.SignedExchangeErrorField.SignatureCertSha256)));
        }
        signatureCategory.createLeaf(this.formatHeader(
            i18nString(UIStrings.validityUrl), signature.validityUrl,
            errorFieldSet.has(Protocol.Network.SignedExchangeErrorField.SignatureValidityUrl)));
        signatureCategory.createLeaf().title = this.formatHeader(
            i18nString(UIStrings.date), new Date(1000 * signature.date).toUTCString(),
            errorFieldSet.has(Protocol.Network.SignedExchangeErrorField.SignatureTimestamps));
        signatureCategory.createLeaf().title = this.formatHeader(
            i18nString(UIStrings.expires), new Date(1000 * signature.expires).toUTCString(),
            errorFieldSet.has(Protocol.Network.SignedExchangeErrorField.SignatureTimestamps));
      }
    }
    if (signedExchangeInfo.securityDetails) {
      const securityDetails = signedExchangeInfo.securityDetails;
      const securityCategory = new Category(root, i18nString(UIStrings.certificate));
      securityCategory.createLeaf(this.formatHeader(i18nString(UIStrings.subject), securityDetails.subjectName));
      securityCategory.createLeaf(
          this.formatHeader(i18nString(UIStrings.validFrom), new Date(1000 * securityDetails.validFrom).toUTCString()));
      securityCategory.createLeaf(
          this.formatHeader(i18nString(UIStrings.validUntil), new Date(1000 * securityDetails.validTo).toUTCString()));
      securityCategory.createLeaf(this.formatHeader(i18nString(UIStrings.issuer), securityDetails.issuer));
    }
  }

  private formatHeader(name: string, value: string, highlighted?: boolean): DocumentFragment {
    const fragment = document.createDocumentFragment();
    const nameElement = fragment.createChild('div', 'header-name');
    nameElement.textContent = name + ': ';
    fragment.createChild('span', 'header-separator');
    const valueElement = fragment.createChild('div', 'header-value source-code');
    valueElement.textContent = value;
    if (highlighted) {
      nameElement.classList.add('error-field');
      valueElement.classList.add('error-field');
    }
    return fragment;
  }

  private formatHeaderForHexData(name: string, value: string, highlighted?: boolean): DocumentFragment {
    const fragment = document.createDocumentFragment();
    const nameElement = fragment.createChild('div', 'header-name');
    nameElement.textContent = name + ': ';
    fragment.createChild('span', 'header-separator');
    const valueElement = fragment.createChild('div', 'header-value source-code hex-data');
    valueElement.textContent = value.replace(/(.{2})/g, '$1 ');
    if (highlighted) {
      nameElement.classList.add('error-field');
      valueElement.classList.add('error-field');
    }
    return fragment;
  }
  override wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([signedExchangeInfoViewStyles]);
  }
}

export class Category extends UI.TreeOutline.TreeElement {
  override toggleOnClick: boolean;
  override expanded: boolean;

  constructor(root: UI.TreeOutline.TreeOutline, title?: string|Node) {
    super(title, true);
    this.selectable = false;
    this.toggleOnClick = true;
    this.expanded = true;
    root.appendChild(this);
  }

  createLeaf(title?: string|Node): UI.TreeOutline.TreeElement {
    const leaf = new UI.TreeOutline.TreeElement(title);
    leaf.selectable = false;
    this.appendChild(leaf);
    return leaf;
  }
}
