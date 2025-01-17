/**
 * `FrameStartedNavigating` event addressing lack of such an event in CDP. It is emitted
 * on CdpTarget before each `Network.requestWillBeSent` event. Note that there can be
 * several `Network.requestWillBeSent` events for a single navigation e.g. on redirection,
 * so the `FrameStartedNavigating` can be duplicated as well.
 * http://go/webdriver:detect-navigation-started#bookmark=id.64balpqrmadv
 */
export declare const enum TargetEvents {
    FrameStartedNavigating = "frameStartedNavigating"
}
export type TargetEventMap = {
    [TargetEvents.FrameStartedNavigating]: {
        loaderId: string;
        url: string;
        frameId: string | undefined;
    };
};
