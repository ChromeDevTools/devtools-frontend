import sinon from 'sinon';
import type * as Common from '../core/common/common.js';
import * as Platform from '../core/platform/platform.js';
import * as SDK from '../core/sdk/sdk.js';
import type * as TextUtils from '../core/text_utils/text_utils.js';
import type * as Protocol from '../generated/protocol.js';
import * as Logs from '../models/logs/logs.js';
/**
 * Configuration options for creating a mock {@link SDK.NetworkRequest.NetworkRequest}.
 */
export interface CreateNetworkRequestOptions {
    /** The URL for the request. Defaults to `'https://example.com'`. */
    url?: string | Platform.DevToolsPath.UrlString;
    /**
     * The document/initiator page URL. Defaults to the request's `url`, making the
     * request same-origin by default. Specify a different URL or empty string to test
     * cross-origin behavior.
     */
    documentURL?: string | Platform.DevToolsPath.UrlString;
    /** The request identifier. Defaults to `'requestId'`. */
    requestId?: string | Protocol.Network.RequestId;
    /**
     * If true, creates a request via `createWithoutBackendRequest`, which leaves
     * `backendRequestId()` undefined and omits frame/loader associations.
     */
    withoutBackend?: boolean;
    statusCode?: number;
    statusText?: string;
    requestMethod?: string;
    requestHeaders?: SDK.NetworkRequest.NameValue[];
    responseHeaders?: SDK.NetworkRequest.NameValue[];
    originalResponseHeaders?: SDK.NetworkRequest.NameValue[];
    fromMemoryCache?: boolean;
    /**
     * Content data or a content data provider function. When provided, configures
     * `request.setContentDataProvider()`. Pass a function returning `{error: string}`
     * to simulate content retrieval failures.
     */
    contentData?: TextUtils.ContentData.ContentData | (() => Promise<TextUtils.ContentData.ContentDataOrError>);
    /** Flags the request as imported from a HAR archive via `setIsImportedHar()`. */
    isImportedHar?: boolean;
    mimeType?: string;
    resourceType?: Common.ResourceType.ResourceType;
    finished?: boolean;
    failed?: boolean;
    charset?: string;
    timing?: Protocol.Network.ResourceTiming;
    serviceWorkerRouterInfo?: Protocol.Network.ServiceWorkerRouterInfo;
    fetchedViaServiceWorker?: boolean;
    initiator?: Protocol.Network.Initiator | null;
    frameId?: Protocol.Page.FrameId | null;
    loaderId?: Protocol.Network.LoaderId | null;
}
/**
 * Creates and configures a synthetic {@link SDK.NetworkRequest.NetworkRequest} for unit testing.
 * Automatically handles string-to-UrlString conversion and provides default values
 * so callers only need to specify properties relevant to their test case.
 */
export declare function createNetworkRequest(options?: CreateNetworkRequestOptions): SDK.NetworkRequest.NetworkRequest;
/**
 * Configuration options for {@link stubInitiatorGraph}.
 */
export interface StubInitiatorGraphOptions {
    /**
     * Upstream requests that triggered the target request. Do not include the target
     * request itself; it is automatically added as the primary initiator.
     * Defaults to a single synthetic cross-origin initiator.
     */
    initiators?: SDK.NetworkRequest.NetworkRequest[];
    /**
     * Downstream requests triggered by the target request.
     * Defaults to two synthetic cross-origin child requests.
     */
    initiated?: SDK.NetworkRequest.NetworkRequest[];
    /**
     * The NetworkLog instance on which to install the Sinon stub.
     * Defaults to `Logs.NetworkLog.NetworkLog.instance()`.
     */
    networkLog?: Logs.NetworkLog.NetworkLog;
}
/**
 * Stubs {@link Logs.NetworkLog.NetworkLog.initiatorGraphForRequest} for the given request
 * using Sinon.
 *
 * If `initiators` or `initiated` lists are omitted, generates default synthetic requests
 * simulating a typical multi-level initiator chain with cross-origin boundaries.
 *
 * @param request The network request whose initiator graph is being queried.
 * @param options Custom requests or NetworkLog instance to configure the stub.
 * @returns The lists of ancestor (`initiators`) and descendant (`initiated`) requests used,
 * along with the Sinon stub.
 */
export declare function stubInitiatorGraph(request: SDK.NetworkRequest.NetworkRequest, options?: StubInitiatorGraphOptions): {
    initiators: SDK.NetworkRequest.NetworkRequest[];
    initiated: SDK.NetworkRequest.NetworkRequest[];
    stub: sinon.SinonStub<[SDK.NetworkRequest.NetworkRequest], Logs.NetworkLog.InitiatorGraph>;
};
