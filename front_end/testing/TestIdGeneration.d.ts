export declare function escapeTestIdBlock(block: string): string;
/**
 * Build test ID is like the test ID used on the CLI but the path part of it is
 * an absolute path to the build dir.
 */
export declare function computeBuildTestId(file: string, titlePath: string[]): string;
export declare function generateExactTestId(genDir: string, file: string, titlePath: string[]): {
    exactTestId: string;
    coarseName: string;
    fineName: string;
    caseName: string;
};
