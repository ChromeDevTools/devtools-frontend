import * as yargs from 'yargs';
import { existsSync, lstatSync, mkdirSync, writeFileSync } from 'fs';
import { relative, dirname, resolve, basename, extname } from 'path';
import { b as analyzeSourceFile, l as arrayFlat, s as stripTypescriptValues, t as transformAnalyzerResult } from './chunk-transform-analyzer-result-lpd9XK92.js';
import fastGlob from 'fast-glob';
import { ScriptTarget, ModuleKind, ModuleResolutionKind, createProgram } from 'typescript';
import 'ts-simple-type';

/**
 * The most general version of compiler options.
 */
const defaultOptions = {
    noEmitOnError: false,
    allowJs: true,
    maxNodeModuleJsDepth: 3,
    experimentalDecorators: true,
    target: ScriptTarget.Latest,
    downlevelIteration: true,
    module: ModuleKind.ESNext,
    //module: ModuleKind.CommonJS,
    //lib: ["ESNext", "DOM", "DOM.Iterable"],
    strictNullChecks: true,
    moduleResolution: ModuleResolutionKind.NodeJs,
    esModuleInterop: true,
    noEmit: true,
    allowSyntheticDefaultImports: true,
    allowUnreachableCode: true,
    allowUnusedLabels: true,
    skipLibCheck: true
};
/**
 * Compiles an array of file paths using typescript.
 * @param filePaths
 * @param options
 */
function compileTypescript(filePaths, options = defaultOptions) {
    filePaths = Array.isArray(filePaths) ? filePaths : [filePaths];
    const program = createProgram(filePaths, options);
    const files = program
        .getSourceFiles()
        .filter(sf => filePaths.includes(sf.fileName))
        .sort((sfA, sfB) => (sfA.fileName > sfB.fileName ? 1 : -1));
    return { program, files };
}

/**
 * Logs to the console with a specific level.
 * This function takes the config into account
 * @param text
 * @param config
 * @param level
 */
function log(text, config, level = "normal") {
    // Never log if silent
    if (config.silent) {
        return;
    }
    // Never log verbose if verbose is not on
    if (level === "verbose" && !config.verbose) {
        return;
    }
    // "unpack" function
    if (typeof text === "function") {
        text = text();
    }
    // eslint-disable-next-line no-console
    if (typeof text === "object") {
        // eslint-disable-next-line no-console
        console.dir(text, { depth: 10 });
    }
    else {
        // eslint-disable-next-line no-console
        console.log(text);
    }
}
/**
 * Logs only if verbose is set to true in the config
 * @param text
 * @param config
 */
function logVerbose(text, config) {
    log(text, config, "verbose");
}

const IGNORE_GLOBS = ["**/node_modules/**", "**/web_modules/**"];
const DEFAULT_DIR_GLOB = "**/*.{js,jsx,ts,tsx}";
const DEFAULT_GLOBS = [DEFAULT_DIR_GLOB];
/**
 * Parses and analyses all globs and calls some callbacks while doing it.
 * @param globs
 * @param config
 * @param context
 */
async function analyzeGlobs(globs, config, context = {}) {
    var _a, _b, _c;
    // Set default glob
    if (globs.length === 0) {
        globs = DEFAULT_GLOBS;
    }
    // Expand the globs
    const filePaths = await expandGlobs(globs, config);
    logVerbose(() => filePaths, config);
    // Callbacks
    (_a = context.didExpandGlobs) === null || _a === void 0 ? void 0 : _a.call(context, filePaths);
    (_b = context.willAnalyzeFiles) === null || _b === void 0 ? void 0 : _b.call(context, filePaths);
    // Parse all the files with typescript
    const { program, files } = compileTypescript(filePaths);
    // Analyze each file with web component analyzer
    const results = [];
    for (const file of files) {
        // Analyze
        const result = analyzeSourceFile(file, {
            program,
            verbose: config.verbose || false,
            ts: config.ts,
            config: {
                features: config.features,
                analyzeDependencies: config.analyzeDependencies,
                analyzeDefaultLib: config.analyzeDefaultLibrary,
                analyzeGlobalFeatures: config.analyzeGlobalFeatures,
                analyzeAllDeclarations: config.format == "json2" // TODO: find a better way to construct the config
            }
        });
        logVerbose(() => stripTypescriptValues(result, program.getTypeChecker()), config);
        // Callback
        await ((_c = context.emitAnalyzedFile) === null || _c === void 0 ? void 0 : _c.call(context, file, result, { program }));
        results.push(result);
    }
    return { program, files, results };
}
/**
 * Expands the globs.
 * @param globs
 * @param config
 */
async function expandGlobs(globs, config) {
    globs = Array.isArray(globs) ? globs : [globs];
    const ignoreGlobs = (config === null || config === void 0 ? void 0 : config.discoverNodeModules) ? [] : IGNORE_GLOBS;
    return arrayFlat(await Promise.all(globs.map(g => {
        try {
            // Test if the glob points to a directory.
            // If so, return the result of a new glob that searches for files in the directory excluding node_modules..
            const dirExists = existsSync(g) && lstatSync(g).isDirectory();
            if (dirExists) {
                return fastGlob([fastGlobNormalize(`${g}/${DEFAULT_DIR_GLOB}`)], {
                    ignore: ignoreGlobs,
                    absolute: true,
                    followSymbolicLinks: false
                });
            }
        }
        catch (e) {
            // the glob wasn't a directory
        }
        // Return the result of globbing
        return fastGlob([fastGlobNormalize(g)], {
            ignore: ignoreGlobs,
            absolute: true,
            followSymbolicLinks: false
        });
    })));
}
/**
 * Fast glob recommends normalizing paths for windows, because fast glob expects a Unix-style path.
 * Read more here: https://github.com/mrmlnc/fast-glob#how-to-write-patterns-on-windows
 * @param glob
 */
function fastGlobNormalize(glob) {
    return glob.replace(/\\/g, "/");
}

const ERROR_NAME = "CLIError";
/**
 * Make an error of kind "CLIError"
 * Use this function instead of subclassing Error because of problems after transpilation.
 * @param message
 */
function makeCliError(message) {
    const error = new Error(message);
    error.name = ERROR_NAME;
    return error;
}
/**
 * Returns if an error is of kind "CLIError"
 * @param error
 */
function isCliError(error) {
    return error instanceof Error && error.name === ERROR_NAME;
}

function ensureDirSync(dir) {
    try {
        mkdirSync(dir, { recursive: true });
    }
    catch (err) {
        if (err.code !== "EEXIST")
            throw err;
    }
}

/**
 * Runs the analyze cli command.
 * @param config
 */
const analyzeCliCommand = async (config) => {
    var _a;
    const inputGlobs = config.glob || [];
    // Log warning for experimental json format
    if (config.format === "json" || config.format === "json2" || ((_a = config.outFile) === null || _a === void 0 ? void 0 : _a.endsWith(".json"))) {
        log(`
!!!!!!!!!!!!!  WARNING !!!!!!!!!!!!!
The custom-elements.json format is for experimental purposes. You can expect changes to this format.
Please follow and contribute to the discussion at:		
  - https://github.com/webcomponents/custom-elements-json
  - https://github.com/w3c/webcomponents/issues/776
!!!!!!!!!!!!!  WARNING !!!!!!!!!!!!!
`, config);
    }
    // If no "out" is specified, output to console
    const outStrategy = (() => {
        if (config.outDir == null && config.outFile == null && config.outFiles == null) {
            switch (config.format) {
                case "json2":
                    // "json2" will need to output everything at once
                    return "console_bulk";
                default:
                    return "console_stream";
            }
        }
        return "file";
    })();
    // Give this context to the analyzer
    const context = {
        didExpandGlobs(filePaths) {
            if (filePaths.length === 0) {
                throw makeCliError(`Couldn't find any files to analyze.`);
            }
        },
        willAnalyzeFiles(filePaths) {
            log(`Web Component Analyzer analyzing ${filePaths.length} file${filePaths.length === 1 ? "" : "s"}...`, config);
        },
        emitAnalyzedFile(file, result, { program }) {
            // Emit the transformed results as soon as possible if "outConsole" is on
            if (outStrategy === "console_stream") {
                if (result.componentDefinitions.length > 0) {
                    // Always use "console.log" when outputting the results
                    /* eslint-disable-next-line no-console */
                    console.log(transformResults(result, program, { ...config, cwd: config.cwd || process.cwd() }));
                }
            }
        }
    };
    // Analyze, - all the magic happens in here
    const { results, program } = await analyzeGlobs(inputGlobs, config, context);
    const filteredResults = results.filter(result => { var _a; return result.componentDefinitions.length > 0 || result.globalFeatures != null || (((_a = result.declarations) === null || _a === void 0 ? void 0 : _a.length) || 0) > 0; });
    // Write files to the file system
    if (outStrategy === "console_bulk") {
        // Always use "console.log" when outputting the results
        /* eslint-disable-next-line no-console */
        console.log(transformResults(filteredResults, program, { ...config, cwd: config.cwd || process.cwd() }));
    }
    else if (outStrategy === "file") {
        // Build up a map of "filePath => result[]"
        const outputResultMap = await distributeResultsIntoFiles(filteredResults, config);
        // Write all results to corresponding paths
        for (const [outputPath, results] of outputResultMap) {
            if (outputPath != null) {
                if (config.dry) {
                    const tagNames = arrayFlat(results.map(result => result.componentDefinitions.map(d => d.tagName)));
                    log(`[dry] Intending to write ${tagNames} to ./${relative(process.cwd(), outputPath)}`, config);
                }
                else {
                    const content = transformResults(results, program, { ...config, cwd: config.cwd || dirname(outputPath) });
                    ensureDirSync(dirname(outputPath));
                    writeFileSync(outputPath, content);
                }
            }
        }
    }
};
/**
 * Transforms analyze results based on the wca cli config.
 * @param results
 * @param program
 * @param config
 */
function transformResults(results, program, config) {
    var _a, _b;
    results = Array.isArray(results) ? results : [results];
    // Default format is "markdown"
    const format = config.format || "markdown";
    const transformerConfig = {
        inlineTypes: (_a = config.inlineTypes) !== null && _a !== void 0 ? _a : false,
        visibility: (_b = config.visibility) !== null && _b !== void 0 ? _b : "public",
        markdown: config.markdown,
        cwd: config.cwd
    };
    return transformAnalyzerResult(format, results, program, transformerConfig);
}
/**
 * Analyzes input globs and returns the transformed result.
 * @param inputGlobs
 * @param config
 */
async function analyzeAndTransformGlobs(inputGlobs, config) {
    const { results, program } = await analyzeGlobs(Array.isArray(inputGlobs) ? inputGlobs : [inputGlobs], config);
    return transformResults(results, program, config);
}
/**
 * Distribute results into files and return a map of "path => results"
 * @param results
 * @param config
 */
async function distributeResultsIntoFiles(results, config) {
    const outputPathToResultMap = new Map();
    // Helper function to add a result to a path. It will merge into existing results.
    const addToOutputPath = (path, result) => {
        const existing = outputPathToResultMap.get(path) || [];
        existing.push(result);
        outputPathToResultMap.set(path, existing);
    };
    // Output files into directory
    if (config.outDir != null) {
        // Get extension name based on the specified format.
        const extName = formatToExtension(config.format || "markdown");
        for (const result of results) {
            // Write file to disc for each analyzed file
            const definition = result.componentDefinitions[0];
            if (definition == null)
                continue;
            // The name of the file becomes the tagName of the first component definition in the file.
            const path = resolve(process.cwd(), config.outDir, `${definition.tagName}${extName}`);
            addToOutputPath(path, result);
        }
    }
    // Output all results into a single file
    else if (config.outFile != null) {
        // Guess format based on outFile extension
        // eslint-disable-next-line require-atomic-updates
        config.format = config.format || extensionToFormat(config.outFile);
        const path = resolve(process.cwd(), config.outFile);
        for (const result of results) {
            addToOutputPath(path, result);
        }
    }
    // Output all results into multiple files
    else if (config.outFiles != null) {
        // Guess format based on outFile extension
        // eslint-disable-next-line require-atomic-updates
        config.format = config.format || extensionToFormat(config.outFiles);
        for (const result of results) {
            const dir = relative(process.cwd(), dirname(result.sourceFile.fileName));
            const filename = relative(process.cwd(), basename(result.sourceFile.fileName, extname(result.sourceFile.fileName)));
            for (const definition of result.componentDefinitions) {
                // The name of the file becomes the tagName of the first component definition in the file.
                const path = resolve(process.cwd(), config
                    .outFiles.replace(/{dir}/g, dir)
                    .replace(/{filename}/g, filename)
                    .replace(/{tagname}/g, definition.tagName));
                //const path = resolve(process.cwd(), config.outFiles!, definition.tagName);
                addToOutputPath(path, {
                    sourceFile: result.sourceFile,
                    componentDefinitions: [definition]
                });
            }
        }
    }
    // Not "out" was specified. Add results to the special key "null"
    else {
        outputPathToResultMap.set(null, results);
    }
    return outputPathToResultMap;
}
/**
 * Returns an extension based on a format
 * @param kind
 */
function formatToExtension(kind) {
    switch (kind) {
        case "json":
        case "vscode":
            return ".json";
        case "md":
        case "markdown":
            return ".md";
        default:
            return ".txt";
    }
}
/**
 * Returns a format based on an extension
 * @param path
 */
function extensionToFormat(path) {
    const extName = extname(path);
    switch (extName) {
        case ".json":
            return "json";
        case ".md":
            return "markdown";
        default:
            return "markdown";
    }
}

/**
 * The main function of the cli.
 */
function cli() {
    const argv = yargs
        .usage("Usage: $0 <command> [glob..] [options]")
        .command({
        command: ["analyze [glob..]", "$0"],
        describe: "Analyses components and emits results in a specified format.",
        handler: async (config) => {
            try {
                await analyzeCliCommand(config);
            }
            catch (e) {
                if (isCliError(e)) {
                    log(e.message, config);
                }
                else {
                    throw e;
                }
            }
        }
    })
        .example(`$ $0 analyze`, "")
        .example(`$ $0 analyze src --format markdown`, "")
        .example(`$ $0 analyze "src/**/*.{js,ts}" --outDir output`, "")
        .example(`$ $0 analyze my-element.js --outFile custom-elements.json`, "")
        .example(`$ $0 analyze --outFiles {dir}/custom-element.json`, "")
        .option("outDir", {
        describe: `Output to a directory where each file corresponds to a web component`,
        nargs: 1,
        string: true
    })
        .option("outFile", {
        describe: `Concatenate and emit output to a single file`,
        nargs: 1,
        string: true
    })
        .option("outFiles", {
        describe: `Emit output to multiple files using a pattern. Available substitutions:
o {dir}: The directory of the component
o {filename}: The filename (without ext) of the component
o {tagname}: The element's tag name`,
        nargs: 1,
        string: true
    })
        .option("format", {
        describe: `Specify output format`,
        choices: ["md", "markdown", "json", "json2", "vscode"],
        nargs: 1,
        alias: "f"
    })
        .option("features", {
        describe: `Features to enable`,
        array: true,
        choices: ["member", "method", "cssproperty", "csspart", "event", "slot"]
    })
        .option("analyzeDefaultLibrary", {
        boolean: true,
        hidden: true
    })
        .option("analyzeDependencies", {
        boolean: true,
        hidden: true
    })
        .option("discoverNodeModules", {
        boolean: true,
        hidden: true
    })
        .option("visibility", {
        describe: `Minimum visibility`,
        choices: ["private", "protected", "public"]
    })
        .option("inlineTypes", {
        describe: `Inline type aliases`,
        boolean: true
    })
        .option("dry", {
        describe: `Don't write files`,
        boolean: true,
        alias: "d"
    })
        .option("verbose", {
        boolean: true,
        hidden: true
    })
        .option("silent", {
        boolean: true,
        hidden: true
    })
        // This options makes it possible to use "markdown.<sub-option>" in "strict mode"
        .option("markdown", {
        hidden: true
    })
        // This option makes it possible to specify a base cwd to use when emitting paths
        .option("cwd", {
        string: true,
        hidden: true
    })
        .alias("v", "version")
        .help("h")
        .wrap(110)
        .strict()
        .alias("h", "help").argv;
    if (argv.verbose) {
        /* eslint-disable-next-line no-console */
        console.log("CLI options:", argv);
    }
}

export { analyzeAndTransformGlobs, analyzeCliCommand, cli };
