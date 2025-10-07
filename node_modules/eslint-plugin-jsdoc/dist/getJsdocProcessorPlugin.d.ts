export function getJsdocProcessorPlugin(options?: JsdocProcessorOptions): ESLint.Plugin;
export type Integer = number;
export type JsdocProcessorOptions = {
    /**
     * Require captions for example tags
     */
    captionRequired?: boolean | undefined;
    /**
     * See docs
     */
    paddedIndent?: number | undefined;
    /**
     * See docs
     */
    checkDefaults?: boolean | undefined;
    /**
     * See docs
     */
    checkParams?: boolean | undefined;
    /**
     * See docs
     */
    checkExamples?: boolean | undefined;
    /**
     * See docs
     */
    checkProperties?: boolean | undefined;
    /**
     * See docs
     */
    matchingFileName?: string | undefined;
    /**
     * See docs
     */
    matchingFileNameDefaults?: string | undefined;
    /**
     * See docs
     */
    matchingFileNameParams?: string | undefined;
    /**
     * See docs
     */
    matchingFileNameProperties?: string | undefined;
    /**
     * See docs
     */
    exampleCodeRegex?: string | RegExp | undefined;
    /**
     * See docs
     */
    rejectExampleCodeRegex?: string | RegExp | undefined;
    /**
     * See docs
     */
    allowedLanguagesToProcess?: string[] | undefined;
    /**
     * See docs
     */
    sourceType?: "module" | "script" | undefined;
    /**
     * See docs
     */
    parser?: Linter.ESTreeParser | Linter.NonESTreeParser | undefined;
};
import type { ESLint } from 'eslint';
import type { Linter } from 'eslint';
//# sourceMappingURL=getJsdocProcessorPlugin.d.ts.map