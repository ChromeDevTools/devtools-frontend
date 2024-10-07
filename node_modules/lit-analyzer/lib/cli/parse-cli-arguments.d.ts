export type CliArguments = {
    _: string[];
} & Record<string, number | string | boolean>;
/**
 * Parses CLI arguments.
 * @param args
 */
export declare function parseCliArguments(args: string[]): CliArguments;
//# sourceMappingURL=parse-cli-arguments.d.ts.map