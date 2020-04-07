import { Logger } from "log4js";
import { Configuration } from "../shared/configuration";
export declare class Validator {
    private config;
    private log;
    constructor(config: Configuration, log: Logger);
    validate(bundle: string, filename: string): void;
}
