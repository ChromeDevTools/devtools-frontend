import { Logger } from "log4js";
import { Configuration } from "../shared/configuration";
import { Project } from "../shared/project";
import { BundleItem } from "./bundle-item";
import { Queued } from "./queued";
export declare class Transformer {
    private config;
    private log;
    private project;
    constructor(config: Configuration, log: Logger, project: Project);
    applyTsTransforms(bundleQueue: Queued[], onTransformsApplied: () => void): void;
    applyTransforms(bundleItem: BundleItem, onTransformsApplied: () => void): void;
    private handleError;
}
