import { Network, type EmptyResult } from '../../../protocol/protocol.js';
import type { BrowsingContextStorage } from '../context/BrowsingContextStorage.js';
import { NetworkStorage } from './NetworkStorage.js';
/** Dispatches Network domain commands. */
export declare class NetworkProcessor {
    #private;
    constructor(browsingContextStorage: BrowsingContextStorage, networkStorage: NetworkStorage);
    addIntercept(params: Network.AddInterceptParameters): Promise<Network.AddInterceptResult>;
    continueRequest(params: Network.ContinueRequestParameters): Promise<EmptyResult>;
    continueResponse(params: Network.ContinueResponseParameters): Promise<EmptyResult>;
    continueWithAuth(params: Network.ContinueWithAuthParameters): Promise<EmptyResult>;
    failRequest({ request: networkId, }: Network.FailRequestParameters): Promise<EmptyResult>;
    provideResponse(params: Network.ProvideResponseParameters): Promise<EmptyResult>;
    removeIntercept(params: Network.RemoveInterceptParameters): Promise<EmptyResult>;
    /**
     * Attempts to parse the given url.
     * Throws an InvalidArgumentException if the url is invalid.
     */
    static parseUrlString(url: string): URL;
    static parseUrlPatterns(urlPatterns: Network.UrlPattern[]): Network.UrlPattern[];
}
