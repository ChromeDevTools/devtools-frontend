import 'mocha';
import { type RootResult, type ParseMode } from '../../src/index.js';
export type JtpMode = 'jsdoc' | 'closure' | 'typescript' | 'permissive';
export type CatharsisMode = 'jsdoc' | 'closure';
export type CompareMode = ParseMode | 'fail' | 'differ';
interface BaseFixture {
    /**
     * The input that should be parsed
     */
    input: string;
    jtp?: Record<JtpMode, CompareMode>;
    catharsis?: Record<CatharsisMode, CompareMode>;
    espree?: boolean;
    /**
     * The expected parse result object. If you expect different parse results for different parse modes please use
     * `diffExpected`.
     */
    expected?: RootResult;
    /**
     * The expected parse results objects for different modes. If a mode is included in `modes` and as a key of
     * `diffExpected` the object in `diffExpected` is used over the result in `expected`.
     */
    diffExpected?: Partial<Record<ParseMode, RootResult>>;
    /**
     * If the stringified output differs from the input it can be provided here. These are mostly whitespace differences.
     */
    stringified?: string;
}
interface extraParseArgs {
    module?: boolean;
    strictMode?: boolean;
    asyncFunctionBody?: boolean;
    classContext?: boolean;
    includeSpecial?: boolean;
}
type SuccessFixture = BaseFixture & {
    /**
     * The {@link ParseMode}s that the expression is expected to get parsed in. In all other modes it is expected to fail.
     */
    modes: ParseMode[];
    parseName?: true;
    extraParseArgs?: extraParseArgs;
    parseNamePath?: true;
};
type ErrorFixture = BaseFixture & ({
    error: string;
    parseName?: true;
    extraParseArgs?: extraParseArgs;
    parseNamePath?: true;
} | {
    errors: Partial<Record<ParseMode, string>>;
    parseName?: true;
    extraParseArgs?: extraParseArgs;
    parseNamePath?: true;
});
export type Fixture = SuccessFixture | ErrorFixture;
/**
 * Function to run all relevant tests for a {@link Fixture}.
 */
export declare function testFixture(fixture: Fixture): void;
export {};
