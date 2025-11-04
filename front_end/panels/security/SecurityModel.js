// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
const UIStrings = {
    /**
     * @description Text in Security Panel of the Security panel
     */
    theSecurityOfThisPageIsUnknown: 'The security of this page is unknown.',
    /**
     * @description Text in Security Panel of the Security panel
     */
    thisPageIsNotSecure: 'This page is not secure.',
    /**
     * @description Text in Security Panel of the Security panel
     */
    thisPageIsSecureValidHttps: 'This page is secure (valid HTTPS).',
    /**
     * @description Text in Security Panel of the Security panel
     */
    thisPageIsNotSecureBrokenHttps: 'This page is not secure (broken HTTPS).',
    /**
     * @description Description of an SSL cipher that contains a separate (bulk) cipher and MAC.
     * @example {AES_256_CBC} PH1
     * @example {HMAC-SHA1} PH2
     */
    cipherWithMAC: '{PH1} with {PH2}',
    /**
     * @description Description of an SSL Key and its Key Exchange Group.
     * @example {ECDHE_RSA} PH1
     * @example {X25519} PH2
     */
    keyExchangeWithGroup: '{PH1} with {PH2}',
};
const str_ = i18n.i18n.registerUIStrings('panels/security/SecurityModel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
export class SecurityModel extends SDK.SDKModel.SDKModel {
    dispatcher;
    securityAgent;
    constructor(target) {
        super(target);
        this.dispatcher = new SecurityDispatcher(this);
        this.securityAgent = target.securityAgent();
        target.registerSecurityDispatcher(this.dispatcher);
        void this.securityAgent.invoke_enable();
    }
    resourceTreeModel() {
        return this.target().model(SDK.ResourceTreeModel.ResourceTreeModel);
    }
    networkManager() {
        return this.target().model(SDK.NetworkManager.NetworkManager);
    }
}
export function securityStateCompare(a, b) {
    const SECURITY_STATE_ORDER = [
        "info" /* Protocol.Security.SecurityState.Info */,
        "insecure-broken" /* Protocol.Security.SecurityState.InsecureBroken */,
        "insecure" /* Protocol.Security.SecurityState.Insecure */,
        "neutral" /* Protocol.Security.SecurityState.Neutral */,
        "secure" /* Protocol.Security.SecurityState.Secure */,
        "unknown" /* Protocol.Security.SecurityState.Unknown */,
    ];
    return SECURITY_STATE_ORDER.indexOf(a) - SECURITY_STATE_ORDER.indexOf(b);
}
SDK.SDKModel.SDKModel.register(SecurityModel, { capabilities: 512 /* SDK.Target.Capability.SECURITY */, autostart: false });
export var Events;
(function (Events) {
    /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
    Events["VisibleSecurityStateChanged"] = "VisibleSecurityStateChanged";
    /* eslint-enable @typescript-eslint/naming-convention */
})(Events || (Events = {}));
export const SummaryMessages = {
    ["unknown" /* Protocol.Security.SecurityState.Unknown */]: i18nLazyString(UIStrings.theSecurityOfThisPageIsUnknown),
    ["insecure" /* Protocol.Security.SecurityState.Insecure */]: i18nLazyString(UIStrings.thisPageIsNotSecure),
    ["neutral" /* Protocol.Security.SecurityState.Neutral */]: i18nLazyString(UIStrings.thisPageIsNotSecure),
    ["secure" /* Protocol.Security.SecurityState.Secure */]: i18nLazyString(UIStrings.thisPageIsSecureValidHttps),
    ["insecure-broken" /* Protocol.Security.SecurityState.InsecureBroken */]: i18nLazyString(UIStrings.thisPageIsNotSecureBrokenHttps),
};
export class PageVisibleSecurityState {
    securityState;
    certificateSecurityState;
    safetyTipInfo;
    securityStateIssueIds;
    constructor(securityState, certificateSecurityState, safetyTipInfo, securityStateIssueIds) {
        this.securityState = securityState;
        this.certificateSecurityState =
            certificateSecurityState ? new CertificateSecurityState(certificateSecurityState) : null;
        this.safetyTipInfo = safetyTipInfo ? new SafetyTipInfo(safetyTipInfo) : null;
        this.securityStateIssueIds = securityStateIssueIds;
    }
}
export class CertificateSecurityState {
    protocol;
    keyExchange;
    keyExchangeGroup;
    cipher;
    mac;
    certificate;
    subjectName;
    issuer;
    validFrom;
    validTo;
    certificateNetworkError;
    certificateHasWeakSignature;
    certificateHasSha1Signature;
    modernSSL;
    obsoleteSslProtocol;
    obsoleteSslKeyExchange;
    obsoleteSslCipher;
    obsoleteSslSignature;
    constructor(certificateSecurityState) {
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
    isCertificateExpiringSoon() {
        const expiryDate = new Date(this.validTo * 1000).getTime();
        return (expiryDate < new Date(Date.now()).setHours(48)) && (expiryDate > Date.now());
    }
    getKeyExchangeName() {
        if (this.keyExchangeGroup) {
            return this.keyExchange ?
                i18nString(UIStrings.keyExchangeWithGroup, { PH1: this.keyExchange, PH2: this.keyExchangeGroup }) :
                this.keyExchangeGroup;
        }
        return this.keyExchange;
    }
    getCipherFullName() {
        return this.mac ? i18nString(UIStrings.cipherWithMAC, { PH1: this.cipher, PH2: this.mac }) : this.cipher;
    }
}
class SafetyTipInfo {
    safetyTipStatus;
    safeUrl;
    constructor(safetyTipInfo) {
        this.safetyTipStatus = safetyTipInfo.safetyTipStatus;
        this.safeUrl = safetyTipInfo.safeUrl || null;
    }
}
export class SecurityStyleExplanation {
    securityState;
    title;
    summary;
    description;
    certificate;
    mixedContentType;
    recommendations;
    constructor(securityState, title, summary, description, certificate = [], mixedContentType = "none" /* Protocol.Security.MixedContentType.None */, recommendations = []) {
        this.securityState = securityState;
        this.title = title;
        this.summary = summary;
        this.description = description;
        this.certificate = certificate;
        this.mixedContentType = mixedContentType;
        this.recommendations = recommendations;
    }
}
class SecurityDispatcher {
    model;
    constructor(model) {
        this.model = model;
    }
    securityStateChanged(_event) {
    }
    visibleSecurityStateChanged({ visibleSecurityState }) {
        const pageVisibleSecurityState = new PageVisibleSecurityState(visibleSecurityState.securityState, visibleSecurityState.certificateSecurityState || null, visibleSecurityState.safetyTipInfo || null, visibleSecurityState.securityStateIssueIds);
        this.model.dispatchEventToListeners(Events.VisibleSecurityStateChanged, pageVisibleSecurityState);
    }
    certificateError(_event) {
    }
}
//# sourceMappingURL=SecurityModel.js.map