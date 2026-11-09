// Copyright 2018 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/kit/kit.js';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, type LitTemplate, nothing, render} from '../../ui/lit/lit.js';

import signedExchangeInfoTreeStyles from './signedExchangeInfoTree.css.js';
import signedExchangeInfoViewStyles from './signedExchangeInfoView.css.js';

const {classMap} = Directives;

const UIStrings = {
  /**
   * @description Text for errors
   */
  errors: 'Errors',
  /**
   * @description Text in Signed Exchange Info View of the Network panel
   */
  signedHttpExchange: 'Signed HTTP exchange',
  /**
   * @description Text for an option to learn more about something
   */
  learnmore: 'Learn more',
  /**
   * @description Text in Request Headers View of the Network panel
   */
  requestUrl: 'Request URL',
  /**
   * @description Text in Signed Exchange Info View of the Network panel
   */
  responseCode: 'Response code',
  /**
   * @description Text in Signed Exchange Info View of the Network panel
   */
  headerIntegrityHash: 'Header integrity hash',
  /**
   * @description Text in Signed Exchange Info View of the Network panel
   */
  responseHeaders: 'Response headers',
  /**
   * @description Text in Signed Exchange Info View of the Network panel
   */
  signature: 'Signature',
  /**
   * @description Text in Signed Exchange Info View of the Network panel
   */
  label: 'Label',
  /**
   * @description Text in Signed Exchange Info View of the Network panel
   */
  certificateUrl: 'Certificate URL',
  /**
   * @description Text to view a security certificate
   */
  viewCertificate: 'View certificate',
  /**
   * @description Text in Signed Exchange Info View of the Network panel
   */
  integrity: 'Integrity',
  /**
   * @description Text in Signed Exchange Info View of the Network panel
   */
  certificateSha: 'Certificate SHA256',
  /**
   * @description Text in Signed Exchange Info View of the Network panel
   */
  validityUrl: 'Validity URL',
  /**
   * @description Text in Signed Exchange Info View of the Network panel
   */
  date: 'Date',
  /**
   * @description Text in Signed Exchange Info View of the Network panel
   */
  expires: 'Expires',
  /**
   * @description Text for a security certificate
   */
  certificate: 'Certificate',
  /**
   * @description Text that refers to the subject of a security certificate
   */
  subject: 'Subject',
  /**
   * @description Text to show since when an item is valid
   */
  validFrom: 'Valid from',
  /**
   * @description Text to indicate the expiry date
   */
  validUntil: 'Valid until',
  /**
   * @description Text for the issuer of an item
   */
  issuer: 'Issuer',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/network/SignedExchangeInfoView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export interface ViewInput {
  errors: string[];
  header: {
    requestUrl: string,
    hasRedirectDestination: boolean,
    responseCode: string,
    headerIntegrity: string,
    responseHeaders: Array<{name: string, value: string}>,
    signatures: Array<{
      label: string,
      signature: string,
      hasSignatureError: boolean,
      hasCertUrlError: boolean,
      integrity: string,
      hasIntegrityError: boolean,
      hasCertSha256Error: boolean,
      validityUrl: string,
      hasValidityUrlError: boolean,
      date: string,
      expires: string,
      hasTimestampsError: boolean,
      certUrl?: string,
      certificates?: string[],
      certSha256?: string,
    }>,
  }|null;
  securityDetails: {
    subjectName: string,
    validFrom: string,
    validUntil: string,
    issuer: string,
  }|null;
  onViewRequest: () => void;
  onViewCertificate: (certificates: string[]) => void;
}

export type View = (input: ViewInput|null, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  if (!input) {
    render(nothing, target);
    return;
  }
  const {formatHeader, formatHeaderForHexData} = SignedExchangeInfoView;
  const renderLeaf = (content: LitTemplate): LitTemplate =>
      html`<li role="treeitem" selectable="false">${content}</li>`;
  const renderCategory = (title: LitTemplate|string, children: LitTemplate|LitTemplate[]): LitTemplate => html`
    <li role="treeitem" toggle-on-click open selectable="false">
      ${title}
      <ul role="group">${children}</ul>
    </li>`;

  // clang-format off
  render(
      html`
        <style>${signedExchangeInfoViewStyles}</style>
        <devtools-tree dense class="signed-exchange-info-tree" .template=${html`
          <style>${signedExchangeInfoTreeStyles}</style>
          <ul role="tree">
            ${input.errors.length ? renderCategory(
                i18nString(UIStrings.errors),
                input.errors.map(errorMessage => renderLeaf(html`
                  <devtools-icon name="cross-circle-filled" class="prompt-icon small"></devtools-icon><div
                      class="error-log">${errorMessage}</div>`)),
            ) : nothing}
            ${renderCategory(
                html`<div class="header-name">${i18nString(UIStrings.signedHttpExchange)}</div><devtools-link
                    href="https://github.com/WICG/webpackage"
                    class="header-toggle devtools-link"
                    jslogcontext="learn-more">${i18nString(UIStrings.learnmore)}</devtools-link>`,
                input.header ? html`
                  ${renderLeaf(html`${formatHeader(i18nString(UIStrings.requestUrl), input.header.requestUrl)}${
                      input.header.hasRedirectDestination ? html`<devtools-link
                          class="header-toggle devtools-link"
                          jslogcontext="redirect-destination-request"
                          @click=${input.onViewRequest}>${i18n.i18n.lockedString('View request')}</devtools-link>` : nothing}`)}
                  ${renderLeaf(formatHeader(i18nString(UIStrings.responseCode), input.header.responseCode))}
                  ${renderLeaf(formatHeader(i18nString(UIStrings.headerIntegrityHash), input.header.headerIntegrity))}
                  <li role="treeitem" open selectable="false">
                    ${formatHeader(i18nString(UIStrings.responseHeaders), '')}
                    ${input.header.responseHeaders.length ? html`
                      <ul role="group">
                        ${input.header.responseHeaders.map(header => renderLeaf(formatHeader(header.name, header.value)))}
                      </ul>
                    ` : nothing}
                  </li>
                ` : nothing,
            )}
            ${(input.header?.signatures ?? []).map(signature => renderCategory(
                i18nString(UIStrings.signature),
                html`
                  ${renderLeaf(formatHeader(i18nString(UIStrings.label), signature.label))}
                  ${renderLeaf(formatHeaderForHexData(i18nString(UIStrings.signature), signature.signature, signature.hasSignatureError))}
                  ${signature.certUrl ? renderLeaf(html`
                    ${formatHeader(i18nString(UIStrings.certificateUrl), signature.certUrl, signature.hasCertUrlError)}${
                      signature.certificates ? html`<devtools-link
                          class="devtools-link header-toggle"
                          jslogcontext="view-certificate"
                          @click=${() => input.onViewCertificate(signature.certificates ?? [])}>${
                          i18nString(UIStrings.viewCertificate)}</devtools-link>` : nothing}`) : nothing}
                  ${renderLeaf(formatHeader(i18nString(UIStrings.integrity), signature.integrity, signature.hasIntegrityError))}
                  ${signature.certSha256 ? renderLeaf(formatHeaderForHexData(
                      i18nString(UIStrings.certificateSha), signature.certSha256, signature.hasCertSha256Error)) : nothing}
                  ${renderLeaf(formatHeader(i18nString(UIStrings.validityUrl), signature.validityUrl, signature.hasValidityUrlError))}
                  ${renderLeaf(formatHeader(i18nString(UIStrings.date), signature.date, signature.hasTimestampsError))}
                  ${renderLeaf(formatHeader(i18nString(UIStrings.expires), signature.expires, signature.hasTimestampsError))}
                `,
            ))}
            ${input.securityDetails ? renderCategory(
                i18nString(UIStrings.certificate),
                html`
                  ${renderLeaf(formatHeader(i18nString(UIStrings.subject), input.securityDetails.subjectName))}
                  ${renderLeaf(formatHeader(i18nString(UIStrings.validFrom), input.securityDetails.validFrom))}
                  ${renderLeaf(formatHeader(i18nString(UIStrings.validUntil), input.securityDetails.validUntil))}
                  ${renderLeaf(formatHeader(i18nString(UIStrings.issuer), input.securityDetails.issuer))}
                `,
            ) : nothing}
          </ul>
        `}></devtools-tree>
      `,
      target,
      {container: {classes: ['signed-exchange-info-view']}},
  );
  // clang-format on
};

export class SignedExchangeInfoView extends UI.Widget.VBox {
  #request?: SDK.NetworkRequest.NetworkRequest;
  readonly #view: View;

  constructor(
      requestOrElement?: SDK.NetworkRequest.NetworkRequest|HTMLElement,
      elementOrView?: HTMLElement|View,
      view: View = DEFAULT_VIEW,
  ) {
    super(
        requestOrElement instanceof HTMLElement  ? requestOrElement :
            elementOrView instanceof HTMLElement ? elementOrView :
                                                   undefined,
    );
    this.#view = typeof elementOrView === 'function' ? elementOrView : view;
    if (requestOrElement && !(requestOrElement instanceof HTMLElement)) {
      this.#request = requestOrElement;
    }
  }

  get request(): SDK.NetworkRequest.NetworkRequest|undefined {
    return this.#request;
  }

  set request(request: SDK.NetworkRequest.NetworkRequest|undefined) {
    if (this.#request === request) {
      return;
    }
    this.#request = request;
    this.requestUpdate();
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  override performUpdate(): void {
    const signedExchangeInfo = this.#request?.signedExchangeInfo();
    if (!this.#request || !signedExchangeInfo) {
      this.#view(null, undefined, this.contentElement);
      return;
    }
    const request = this.#request;

    const errorFieldSetMap = new Map<number|undefined, Set<string>>();
    const errors: string[] = [];
    for (const error of signedExchangeInfo.errors ?? []) {
      errors.push(error.message);
      if (error.errorField) {
        const errorFieldSet = errorFieldSetMap.get(error.signatureIndex) ?? new Set<string>();
        errorFieldSet.add(error.errorField);
        errorFieldSetMap.set(error.signatureIndex, errorFieldSet);
      }
    }

    const headerInfo = signedExchangeInfo.header ? {
      requestUrl: signedExchangeInfo.header.requestUrl,
      hasRedirectDestination: Boolean(request.redirectDestination()),
      responseCode: String(signedExchangeInfo.header.responseCode),
      headerIntegrity: signedExchangeInfo.header.headerIntegrity,
      responseHeaders:
          Object.entries(signedExchangeInfo.header.responseHeaders).map(([name, value]) => ({name, value})),
      signatures: signedExchangeInfo.header.signatures.map((signature, i) => {
        const errorFieldSet = errorFieldSetMap.get(i) ?? new Set<string>();
        return {
          label: signature.label,
          signature: signature.signature,
          hasSignatureError: errorFieldSet.has(Protocol.Network.SignedExchangeErrorField.SignatureSig),
          certUrl: signature.certUrl,
          hasCertUrlError: errorFieldSet.has(Protocol.Network.SignedExchangeErrorField.SignatureCertUrl),
          certificates: signature.certificates,
          integrity: signature.integrity,
          hasIntegrityError: errorFieldSet.has(Protocol.Network.SignedExchangeErrorField.SignatureIntegrity),
          certSha256: signature.certSha256,
          hasCertSha256Error: errorFieldSet.has(Protocol.Network.SignedExchangeErrorField.SignatureCertSha256),
          validityUrl: signature.validityUrl,
          hasValidityUrlError: errorFieldSet.has(Protocol.Network.SignedExchangeErrorField.SignatureValidityUrl),
          date: new Date(1000 * signature.date).toUTCString(),
          expires: new Date(1000 * signature.expires).toUTCString(),
          hasTimestampsError: errorFieldSet.has(Protocol.Network.SignedExchangeErrorField.SignatureTimestamps),
        };
      }),
    } :
                                                   null;

    const securityDetails = signedExchangeInfo.securityDetails ? {
      subjectName: signedExchangeInfo.securityDetails.subjectName,
      validFrom: new Date(1000 * signedExchangeInfo.securityDetails.validFrom).toUTCString(),
      validUntil: new Date(1000 * signedExchangeInfo.securityDetails.validTo).toUTCString(),
      issuer: signedExchangeInfo.securityDetails.issuer,
    } :
                                                                 null;

    this.#view(
        {
          errors,
          header: headerInfo,
          securityDetails,
          onViewRequest: () => {
            const redirectDestination = request.redirectDestination();
            if (redirectDestination) {
              void Common.Revealer.reveal(redirectDestination);
            }
          },
          onViewCertificate: (certificates: string[]) =>
              Host.InspectorFrontendHost.InspectorFrontendHostInstance.showCertificateViewer(certificates),
        },
        undefined,
        this.contentElement,
    );
  }

  static formatHeader(name: string, value: string, highlighted?: boolean): LitTemplate {
    // clang-format off
    return html`<div class=${classMap({'header-name': true, 'error-field': Boolean(highlighted)})}>${name}: </div><span
        class="header-separator"></span><div
        class=${classMap({'header-value': true, 'source-code': true, 'error-field': Boolean(highlighted)})}>${value}</div>`;
    // clang-format on
  }

  static formatHeaderForHexData(name: string, value: string, highlighted?: boolean): LitTemplate {
    // clang-format off
    return html`<div class=${classMap({'header-name': true, 'error-field': Boolean(highlighted)})}>${name}: </div><span
        class="header-separator"></span><div
        class=${classMap({'header-value': true, 'source-code': true, 'hex-data': true, 'error-field': Boolean(highlighted)})}>${
        value.replace(/(.{2})/g, '$1 ')}</div>`;
    // clang-format on
  }
}
