import '../../ui/kit/kit.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type LitTemplate } from '../../ui/lit/lit.js';
export interface ViewInput {
    errors: string[];
    header: {
        requestUrl: string;
        hasRedirectDestination: boolean;
        responseCode: string;
        headerIntegrity: string;
        responseHeaders: Array<{
            name: string;
            value: string;
        }>;
        signatures: Array<{
            label: string;
            signature: string;
            hasSignatureError: boolean;
            hasCertUrlError: boolean;
            integrity: string;
            hasIntegrityError: boolean;
            hasCertSha256Error: boolean;
            validityUrl: string;
            hasValidityUrlError: boolean;
            date: string;
            expires: string;
            hasTimestampsError: boolean;
            certUrl?: string;
            certificates?: string[];
            certSha256?: string;
        }>;
    } | null;
    securityDetails: {
        subjectName: string;
        validFrom: string;
        validUntil: string;
        issuer: string;
    } | null;
    onViewRequest: () => void;
    onViewCertificate: (certificates: string[]) => void;
}
export type View = (input: ViewInput | null, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class SignedExchangeInfoView extends UI.Widget.VBox {
    #private;
    constructor(requestOrElement?: SDK.NetworkRequest.NetworkRequest | HTMLElement, elementOrView?: HTMLElement | View, view?: View);
    get request(): SDK.NetworkRequest.NetworkRequest | undefined;
    set request(request: SDK.NetworkRequest.NetworkRequest | undefined);
    wasShown(): void;
    performUpdate(): void;
    static formatHeader(name: string, value: string, highlighted?: boolean): LitTemplate;
    static formatHeaderForHexData(name: string, value: string, highlighted?: boolean): LitTemplate;
}
