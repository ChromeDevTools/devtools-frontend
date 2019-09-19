import { Logger } from "log4js";
import { BundleItem } from "./bundle-item";
import { Queued } from "./queued";
export declare class DependencyWalker {
    private log;
    private requireRegexp;
    private walk;
    constructor(log: Logger);
    hasRequire(s: string): boolean;
    collectTypescriptDependencies(queue: Queued[]): number;
    collectJavascriptDependencies(bundleItem: BundleItem, onDependenciesCollected: (moduleNames: string[]) => void): void;
    private collectAmbientModules;
    private addBundleItem;
    private findUnresolvedTsRequires;
    private addDynamicDependencies;
    private parseDynamicRequire;
    private validateCase;
}
