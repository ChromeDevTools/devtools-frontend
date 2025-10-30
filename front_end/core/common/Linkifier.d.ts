import type * as Platform from '../platform/platform.js';
export declare abstract class Linkifier {
    abstract linkify(object: Object, options?: Options): Node;
    static linkify(object: Object | null, options?: Options): Promise<Node>;
}
export interface Options {
    tooltip?: string;
    preventKeyboardFocus?: boolean;
    textContent?: string;
    isDynamicLink?: boolean;
}
export declare function registerLinkifier(registration: LinkifierRegistration): void;
export declare function getApplicableRegisteredlinkifiers(object: Object): LinkifierRegistration[];
export interface LinkifierRegistration {
    loadLinkifier: () => Promise<Linkifier>;
    contextTypes?: () => Array<Platform.Constructor.Constructor<unknown>>;
}
