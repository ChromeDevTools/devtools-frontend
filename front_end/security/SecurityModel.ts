// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as i18n from '../i18n/i18n.js';
import * as SDK from '../sdk/sdk.js';

export const UIStrings = {
  /**
  *@description Text in Security Panel of the Security panel
  */
  theSecurityOfThisPageIsUnknown: 'The security of this page is unknown.',
  /**
  *@description Text in Security Panel of the Security panel
  */
  thisPageIsNotSecure: 'This page is not secure.',
  /**
  *@description Text in Security Panel of the Security panel
  */
  thisPageIsSecureValidHttps: 'This page is secure (valid HTTPS).',
  /**
  *@description Text in Security Panel of the Security panel
  */
  thisPageIsNotSecureBrokenHttps: 'This page is not secure (broken HTTPS).',
  /**
  *@description Description of an SSL cipher that contains a separate (bulk) cipher and MAC.
  *@example {AES_256_CBC} PH1
  *@example {HMAC-SHA1} PH2
  */
  cipherWithMAC: '{PH1} with {PH2}',
  /**
  *@description Description of an SSL Key and its Key Exchange Group.
  *@example {ECDHE_RSA} PH1
  *@example {X25519} PH2
  */
  keyExchangeWithGroup: '{PH1} with {PH2}',
};
const str_ = i18n.i18n.registerUIStrings('security/SecurityModel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class SecurityModel extends SDK.SDKModel.SDKModel {
  _dispatcher: SecurityDispatcher;
  _securityAgent: ProtocolProxyApi.SecurityApi;
  constructor(target: SDK.SDKModel.Target) {
    super(target);
    this._dispatcher = new SecurityDispatcher(this);
    this._securityAgent = target.securityAgent();
    target.registerSecurityDispatcher(this._dispatcher);
    this._securityAgent.invoke_enable();
  }

  resourceTreeModel(): SDK.ResourceTreeModel.ResourceTreeModel {
    return /** @type {!SDK.ResourceTreeModel.ResourceTreeModel} */ this.target().model(
               SDK.ResourceTreeModel.ResourceTreeModel) as SDK.ResourceTreeModel.ResourceTreeModel;
  }

  networkManager(): SDK.NetworkManager.NetworkManager {
    return /** @type {!SDK.NetworkManager.NetworkManager} */ this.target().model(SDK.NetworkManager.NetworkManager) as
        SDK.NetworkManager.NetworkManager;
  }

  static SecurityStateComparator(a: Protocol.Security.SecurityState|null, b: Protocol.Security.SecurityState|null):
      number {
    const securityStateMap = getOrCreateSecurityStateOrdinalMap();
    const aScore = a && securityStateMap.get(a) || 0;
    const bScore = b && securityStateMap.get(b) || 0;

    return aScore - bScore;
  }
}
let securityStateToOrdinal: Map<Protocol.Security.SecurityState, number>|null = null;

const getOrCreateSecurityStateOrdinalMap = (): Map<Protocol.Security.SecurityState, number> => {
  if (!securityStateToOrdinal) {
    securityStateToOrdinal = new Map();
    const ordering = [
      Protocol.Security.SecurityState.Info,
      Protocol.Security.SecurityState.InsecureBroken,
      Protocol.Security.SecurityState.Insecure,
      Protocol.Security.SecurityState.Neutral,
      Protocol.Security.SecurityState.Secure,
      // Unknown is max so that failed/cancelled requests don't overwrite the origin security state for successful requests,
      // and so that failed/cancelled requests appear at the bottom of the origins list.
      Protocol.Security.SecurityState.Unknown,
    ];
    for (let i = 0; i < ordering.length; i++) {
      securityStateToOrdinal.set(ordering[i], i + 1);
    }
  }
  return securityStateToOrdinal;
};

SDK.SDKModel.SDKModel.register(SecurityModel, SDK.SDKModel.Capability.Security, false);

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  SecurityStateChanged = 'SecurityStateChanged',
  VisibleSecurityStateChanged = 'VisibleSecurityStateChanged',
}

export const SummaryMessages: {[x: string]: string;} = {
  [Protocol.Security.SecurityState.Unknown]: i18nString(UIStrings.theSecurityOfThisPageIsUnknown),
  [Protocol.Security.SecurityState.Insecure]: i18nString(UIStrings.thisPageIsNotSecure),
  [Protocol.Security.SecurityState.Neutral]: i18nString(UIStrings.thisPageIsNotSecure),
  [Protocol.Security.SecurityState.Secure]: i18nString(UIStrings.thisPageIsSecureValidHttps),
  [Protocol.Security.SecurityState.InsecureBroken]: i18nString(UIStrings.thisPageIsNotSecureBrokenHttps),
};

export class PageSecurityState {
  securityState: Protocol.Security.SecurityState;
  explanations: Protocol.Security.SecurityStateExplanation[];
  summary: string|null;
  constructor(
      securityState: Protocol.Security.SecurityState, explanations: Protocol.Security.SecurityStateExplanation[],
      summary: string|null) {
    this.securityState = securityState;
    this.explanations = explanations;
    this.summary = summary;
  }
}

export class PageVisibleSecurityState {
  securityState: Protocol.Security.SecurityState;
  certificateSecurityState: CertificateSecurityState|null;
  safetyTipInfo: SafetyTipInfo|null;
  securityStateIssueIds: string[];
  constructor(
      securityState: Protocol.Security.SecurityState,
      certificateSecurityState: Protocol.Security.CertificateSecurityState|null,
      safetyTipInfo: Protocol.Security.SafetyTipInfo|null, securityStateIssueIds: string[]) {
    this.securityState = securityState;
    this.certificateSecurityState =
        certificateSecurityState ? new CertificateSecurityState(certificateSecurityState) : null;
    this.safetyTipInfo = safetyTipInfo ? new SafetyTipInfo(safetyTipInfo) : null;
    this.securityStateIssueIds = securityStateIssueIds;
  }
}

export class CertificateSecurityState {
  protocol: string;
  keyExchange: string;
  keyExchangeGroup: string|null;
  cipher: string;
  mac: string|null;
  certificate: string[];
  subjectName: string;
  issuer: string;
  validFrom: number;
  validTo: number;
  certificateNetworkError: string|null;
  certificateHasWeakSignature: boolean;
  certificateHasSha1Signature: boolean;
  modernSSL: boolean;
  obsoleteSslProtocol: boolean;
  obsoleteSslKeyExchange: boolean;
  obsoleteSslCipher: boolean;
  obsoleteSslSignature: boolean;
  constructor(certificateSecurityState: Protocol.Security.CertificateSecurityState) {
    this.protocol = certificateSecurityState.protocol;
    this.keyExchange = certificateSecurityState.keyExchange;
    this.keyExchangeGroup = certificateSecurityState.keyExchangeGroup || null;
    this.cipher = certificateSecurityState.cipher;
    this.mac = certificateSecurityState.mac || null;
    this.certificate = certificateSecurityState.certificate;
    this.subjectName = certificateSecurityState.subjectName;
    this.issuer = certificateSecurityState.issuer;
    this.validFrom = certificateSecurityState.validFrom;
    this.validTo = certificateSecurityState.validTo;
    this.certificateNetworkError = certificateSecurityState.certificateNetworkError || null;
    this.certificateHasWeakSignature = certificateSecurityState.certificateHasWeakSignature;
    this.certificateHasSha1Signature = certificateSecurityState.certificateHasSha1Signature;
    this.modernSSL = certificateSecurityState.modernSSL;
    this.obsoleteSslProtocol = certificateSecurityState.obsoleteSslProtocol;
    this.obsoleteSslKeyExchange = certificateSecurityState.obsoleteSslKeyExchange;
    this.obsoleteSslCipher = certificateSecurityState.obsoleteSslCipher;
    this.obsoleteSslSignature = certificateSecurityState.obsoleteSslSignature;
  }

  isCertificateExpiringSoon(): boolean {
    const expiryDate = new Date(this.validTo * 1000).getTime();
    return (expiryDate < new Date(Date.now()).setHours(48)) && (expiryDate > Date.now());
  }

  getKeyExchangeName(): string {
    if (this.keyExchangeGroup) {
      return this.keyExchange ?
          i18nString(UIStrings.keyExchangeWithGroup, {PH1: this.keyExchange, PH2: this.keyExchangeGroup}) :
          this.keyExchangeGroup;
    }
    return this.keyExchange;
  }

  getCipherFullName(): string {
    return this.mac ? i18nString(UIStrings.cipherWithMAC, {PH1: this.cipher, PH2: this.mac}) : this.cipher;
  }
}

class SafetyTipInfo {
  safetyTipStatus: string;
  safeUrl: string|null;
  constructor(safetyTipInfo: Protocol.Security.SafetyTipInfo) {
    this.safetyTipStatus = safetyTipInfo.safetyTipStatus;
    this.safeUrl = safetyTipInfo.safeUrl || null;
  }
}

export class SecurityStyleExplanation {
  securityState: Protocol.Security.SecurityState;
  title: string|undefined;
  summary: string;
  description: string;
  certificate: string[];
  mixedContentType: Protocol.Security.MixedContentType;
  recommendations: string[];
  constructor(
      securityState: Protocol.Security.SecurityState, title: string|undefined, summary: string, description: string,
      certificate: string[]|undefined = [],
      mixedContentType: Protocol.Security.MixedContentType|undefined = Protocol.Security.MixedContentType.None,
      recommendations: string[]|undefined = []) {
    this.securityState = securityState;
    this.title = title;
    this.summary = summary;
    this.description = description;
    this.certificate = certificate;
    this.mixedContentType = mixedContentType;
    this.recommendations = recommendations;
  }
}

class SecurityDispatcher implements ProtocolProxyApi.SecurityDispatcher {
  _model: SecurityModel;
  constructor(model: SecurityModel) {
    this._model = model;
  }

  securityStateChanged({securityState, explanations, summary}: Protocol.Security.SecurityStateChangedEvent): void {
    const pageSecurityState = new PageSecurityState(securityState, explanations, summary || null);
    this._model.dispatchEventToListeners(Events.SecurityStateChanged, pageSecurityState);
  }

  visibleSecurityStateChanged({visibleSecurityState}: Protocol.Security.VisibleSecurityStateChangedEvent): void {
    const pageVisibleSecurityState = new PageVisibleSecurityState(
        visibleSecurityState.securityState, visibleSecurityState.certificateSecurityState || null,
        visibleSecurityState.safetyTipInfo || null, visibleSecurityState.securityStateIssueIds);
    this._model.dispatchEventToListeners(Events.VisibleSecurityStateChanged, pageVisibleSecurityState);
  }

  certificateError(_event: Protocol.Security.CertificateErrorEvent): void {
  }
}
