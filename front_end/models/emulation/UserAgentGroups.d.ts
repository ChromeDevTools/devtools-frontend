import type * as Protocol from '../../generated/protocol.js';
export interface UserAgentPreset {
    title: string;
    value: string;
    metadata: Protocol.Emulation.UserAgentMetadata | null;
}
export interface UserAgentGroup {
    title: string;
    values: UserAgentPreset[];
}
export declare function findUserAgentPreset(userAgent: string): UserAgentPreset | null;
export declare function getUserAgentMetadata(userAgent: string): Protocol.Emulation.UserAgentMetadata | null;
export declare const userAgentGroups: readonly UserAgentGroup[];
