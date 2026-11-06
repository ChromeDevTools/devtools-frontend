import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';
import { SDKModel } from './SDKModel.js';
import { type Target } from './Target.js';
export declare const enum ScreenshotMode {
    FROM_VIEWPORT = "fromViewport",
    FROM_CLIP = "fromClip",
    FULLPAGE = "fullpage"
}
type ScreencastFrameCallback = ((arg0: Protocol.binary, arg1: Protocol.Page.ScreencastFrameMetadata) => void);
type ScreencastVisibilityChangedCallback = ((arg0: boolean) => void);
/**
 * Manages concurrent screencast requests by queuing and prioritizing.
 *
 * When startScreencast is invoked:
 * - If a screencast is currently active, the existing screencast's parameters and callbacks are
 * saved in the #screencastOperations array.
 * - The active screencast is then stopped.
 * - A new screencast is initiated using the parameters and callbacks from the current startScreencast call.
 *
 * When stopScreencast is invoked:
 * - The currently active screencast is stopped.
 * - The #screencastOperations is checked for interrupted screencast operations.
 * - If any operations are found, the latest one is started
 * using its saved parameters and callbacks.
 *
 * This ensures that:
 * - Only one screencast is active at a time.
 * - Interrupted screencasts are resumed after the current screencast is stopped.
 * This ensures animation previews, which use screencasting, don't disrupt ongoing remote debugging sessions. Without this mechanism, stopping a preview screencast would terminate the debugging screencast, freezing the ScreencastView.
 **/
export declare class ScreenCaptureModel extends SDKModel<void> implements ProtocolProxyApi.PageDispatcher {
    #private;
    constructor(target: Target);
    startScreencast(format: Protocol.Page.StartScreencastRequestFormat, quality: number, maxWidth: number | undefined, maxHeight: number | undefined, everyNthFrame: number | undefined, onFrame: ScreencastFrameCallback, onVisibilityChanged: ScreencastVisibilityChangedCallback): Promise<number>;
    stopScreencast(id: number): void;
    captureScreenshot(format: Protocol.Page.CaptureScreenshotRequestFormat, quality: number, mode: ScreenshotMode, clip?: Protocol.Page.Viewport): Promise<string | null>;
    screencastFrame({ data, metadata, sessionId }: Protocol.Page.ScreencastFrameEvent): void;
    screencastVisibilityChanged({ visible }: Protocol.Page.ScreencastVisibilityChangedEvent): void;
}
export {};
