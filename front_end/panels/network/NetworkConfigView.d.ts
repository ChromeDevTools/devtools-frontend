import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare class NetworkConfigView extends UI.Widget.VBox {
    #private;
    constructor();
    static instance(opts?: {
        forceNew: boolean | null;
    }): NetworkConfigView;
    private createUserAgentSelectAndInput;
    private createSection;
    private createCacheSection;
    private createNetworkThrottlingSection;
    private createUserAgentSection;
    wasShown(): void;
}
interface UserAgentGroup {
    title: string;
    values: Array<{
        title: string;
        value: string;
        metadata: Protocol.Emulation.UserAgentMetadata | null;
    }>;
}
export declare const userAgentGroups: UserAgentGroup[];
export {};
