import { Configuration } from "../shared/configuration";
import { BundleItem } from "./bundle-item";
import { Resolver } from "./resolve/resolver";
export declare class Globals {
    private config;
    private resolver;
    constructor(config: Configuration, resolver: Resolver);
    add(buffer: BundleItem[], entrypoints: string[], onGlobalsAdded: () => void): void;
    private addNodeGlobals;
    private addConstants;
}
