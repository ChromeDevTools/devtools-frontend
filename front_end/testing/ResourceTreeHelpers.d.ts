import * as SDK from '../core/sdk/sdk.js';
import * as Protocol from '../generated/protocol.js';
import type { MockCDPConnection } from './MockCDPConnection.js';
export { createResource, DOMAIN, FRAME, FRAME_URL, getEffectivePayload, getMainFrame, LOADER_ID, MAIN_FRAME_ID, SECURITY_ORIGIN, } from './ResourceHelpers.js';
export declare function mockResourceTree(connection: MockCDPConnection): void;
export declare function getInitializedResourceTreeModel(target: SDK.Target.Target): Promise<SDK.ResourceTreeModel.ResourceTreeModel>;
export declare function addChildFrame(target: SDK.Target.Target, framePayload?: Partial<Protocol.Page.Frame>): Promise<SDK.ResourceTreeModel.ResourceTreeFrame>;
export declare function navigate(frame: SDK.ResourceTreeModel.ResourceTreeFrame, framePayload?: Partial<Protocol.Page.Frame>, type?: Protocol.Page.NavigationType): void;
export declare function activate(target: SDK.Target.Target): void;
