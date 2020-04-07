import { Threshold } from "../istanbul/threshold";
import { Configuration } from "../shared/configuration";
export declare class Reporter {
    create: (baseReporterDecorator: any, logger: any) => void;
    private log;
    private coverageMap;
    constructor(config: Configuration, threshold: Threshold);
    private getReportDestination;
}
