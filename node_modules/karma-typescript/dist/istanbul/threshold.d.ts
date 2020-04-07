import * as istanbulCoverage from "istanbul-lib-coverage";
import { Logger } from "log4js";
import { Configuration } from "../shared/configuration";
export declare class Threshold {
    private config;
    private log;
    constructor(config: Configuration, log: Logger);
    check(browser: any, coverageMap: istanbulCoverage.CoverageMap): boolean;
    private toSummaries;
    private isExcluded;
    private getFileOverrides;
}
