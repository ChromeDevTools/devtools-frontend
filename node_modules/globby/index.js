import process from 'node:process';
import fs from 'node:fs';
import nodePath from 'node:path';
import {Readable} from 'node:stream';
import mergeStreams from '@sindresorhus/merge-streams';
import fastGlob from 'fast-glob';
import {toPath} from 'unicorn-magic/node';
import {
	GITIGNORE_FILES_PATTERN,
	getIgnorePatternsAndPredicate,
	getIgnorePatternsAndPredicateSync,
	getGlobalGitignoreFile,
	getGlobalGitignoreFileAsync,
	buildGlobalMatcher,
} from './ignore.js';
import {
	bindFsMethod,
	promisifyFsMethod,
	isNegativePattern,
	getStaticAbsolutePathPrefix,
	normalizeNegativePattern,
	adjustIgnorePatternsForParentDirectories,
	convertPatternsForFastGlob,
	convertIgnorePatternsForIgnoreFileSearch,
	findGitRoot,
	findGitRootSync,
} from './utilities.js';

const assertPatternsInput = patterns => {
	if (patterns.some(pattern => typeof pattern !== 'string')) {
		throw new TypeError('Patterns must be a string or an array of strings');
	}
};

const getStatMethod = fsImplementation => {
	if (fsImplementation) {
		return bindFsMethod(fsImplementation.promises, 'stat')
			?? promisifyFsMethod(fsImplementation, 'stat');
	}

	return bindFsMethod(fs.promises, 'stat');
};

const getStatSyncMethod = fsImplementation =>
	bindFsMethod(fsImplementation, 'statSync')
	?? bindFsMethod(fs, 'statSync');

const isDirectory = async (path, fsImplementation) => {
	try {
		const stats = await getStatMethod(fsImplementation)(path);
		return stats.isDirectory();
	} catch {
		return false;
	}
};

const isDirectorySync = (path, fsImplementation) => {
	try {
		const stats = getStatSyncMethod(fsImplementation)(path);
		return stats.isDirectory();
	} catch {
		return false;
	}
};

const normalizePathForDirectoryGlob = (filePath, cwd) => {
	const path = isNegativePattern(filePath) ? filePath.slice(1) : filePath;
	return nodePath.isAbsolute(path) ? path : nodePath.join(cwd, path);
};

const shouldExpandGlobstarDirectory = pattern => {
	const match = pattern?.match(/\*\*\/([^/]+)$/);
	if (!match) {
		return false;
	}

	const dirname = match[1];
	const hasWildcards = /[*?[\]{}]/.test(dirname);
	const hasExtension = nodePath.extname(dirname) && !dirname.startsWith('.');

	return !hasWildcards && !hasExtension;
};

const getDirectoryGlob = ({directoryPath, files, extensions}) => {
	const extensionGlob = extensions?.length > 0 ? `.${extensions.length > 1 ? `{${extensions.join(',')}}` : extensions[0]}` : '';
	return files
		? files.map(file => nodePath.posix.join(directoryPath, `**/${nodePath.extname(file) ? file : `${file}${extensionGlob}`}`))
		: [nodePath.posix.join(directoryPath, `**${extensionGlob ? `/*${extensionGlob}` : ''}`)];
};

const directoryToGlob = async (directoryPaths, {
	cwd = process.cwd(),
	files,
	extensions,
	fs: fsImplementation,
} = {}) => {
	const globs = await Promise.all(directoryPaths.map(async directoryPath => {
		// Check pattern without negative prefix
		const checkPattern = isNegativePattern(directoryPath) ? directoryPath.slice(1) : directoryPath;

		// Expand globstar directory patterns like **/dirname to **/dirname/**
		if (shouldExpandGlobstarDirectory(checkPattern)) {
			return getDirectoryGlob({directoryPath, files, extensions});
		}

		// Original logic for checking actual directories
		const pathToCheck = normalizePathForDirectoryGlob(directoryPath, cwd);
		return (await isDirectory(pathToCheck, fsImplementation)) ? getDirectoryGlob({directoryPath, files, extensions}) : directoryPath;
	}));

	return globs.flat();
};

const directoryToGlobSync = (directoryPaths, {
	cwd = process.cwd(),
	files,
	extensions,
	fs: fsImplementation,
} = {}) => directoryPaths.flatMap(directoryPath => {
	// Check pattern without negative prefix
	const checkPattern = isNegativePattern(directoryPath) ? directoryPath.slice(1) : directoryPath;

	// Expand globstar directory patterns like **/dirname to **/dirname/**
	if (shouldExpandGlobstarDirectory(checkPattern)) {
		return getDirectoryGlob({directoryPath, files, extensions});
	}

	// Original logic for checking actual directories
	const pathToCheck = normalizePathForDirectoryGlob(directoryPath, cwd);
	return isDirectorySync(pathToCheck, fsImplementation) ? getDirectoryGlob({directoryPath, files, extensions}) : directoryPath;
});

const toPatternsArray = patterns => {
	patterns = [...new Set([patterns].flat())];
	assertPatternsInput(patterns);
	return patterns;
};

const checkCwdOption = (cwd, fsImplementation = fs) => {
	if (!cwd || !fsImplementation.statSync) {
		return;
	}

	let stats;
	try {
		stats = fsImplementation.statSync(cwd);
	} catch {
		// If stat fails (e.g., path doesn't exist), let fast-glob handle it
		return;
	}

	if (!stats.isDirectory()) {
		throw new Error(`The \`cwd\` option must be a path to a directory, got: ${cwd}`);
	}
};

const normalizeOptions = (options = {}) => {
	// Normalize ignore to an array (fast-glob accepts string but we need array internally)
	const ignore = options.ignore
		? (Array.isArray(options.ignore) ? options.ignore : [options.ignore])
		: [];

	options = {
		...options,
		ignore,
		expandDirectories: options.expandDirectories ?? true,
		cwd: toPath(options.cwd),
	};

	checkCwdOption(options.cwd, options.fs);

	return options;
};

const normalizeArguments = function_ => async (patterns, options) => function_(toPatternsArray(patterns), normalizeOptions(options));
const normalizeArgumentsSync = function_ => (patterns, options) => function_(toPatternsArray(patterns), normalizeOptions(options));

const getIgnoreFilesPatterns = options => {
	const {ignoreFiles, gitignore} = options;

	const patterns = ignoreFiles ? toPatternsArray(ignoreFiles) : [];
	if (gitignore) {
		patterns.push(GITIGNORE_FILES_PATTERN);
	}

	return patterns;
};

const isPathIgnored = (matcher, globalMatcher, path) => {
	const globalResult = globalMatcher ? globalMatcher(path) : undefined;
	const result = matcher ? matcher(path) : undefined;

	if (result?.unignored) {
		return false;
	}

	return Boolean(result?.ignored || globalResult?.ignored);
};

const hasIgnoredAncestorDirectory = (matcher, globalMatcher, file) => {
	let currentPath = file;

	while (true) {
		const parentDirectory = nodePath.dirname(currentPath);
		if (parentDirectory === currentPath) {
			return false;
		}

		if (isPathIgnored(matcher, globalMatcher, `${parentDirectory}${nodePath.sep}`)) {
			return true;
		}

		currentPath = parentDirectory;
	}
};

const combinePredicate = (matcher, globalMatcher) => {
	if (!matcher && !globalMatcher) {
		return false;
	}

	return file => {
		const result = matcher ? matcher(file) : undefined;

		// A local negation (e.g. `!file`) re-includes the file, unless
		// a parent directory is ignored by either matcher.
		if (result?.unignored) {
			const globalResult = globalMatcher ? globalMatcher(file) : undefined;
			return globalResult?.ignored && hasIgnoredAncestorDirectory(matcher, globalMatcher, file);
		}

		return isPathIgnored(matcher, globalMatcher, file);
	};
};

const buildIgnoreFilterResult = ({options, cwd, ignoreResult: {rules, matcher}, globalMatcher, createFilter}) => {
	const finalPredicate = combinePredicate(matcher, globalMatcher);

	// Patterns fast-glob can use to skip ignored directories while traversing. The predicate below stays authoritative, so this only ever needs to be safe, never exhaustive. They are returned separately from `options.ignore` so they skip directory expansion and the parent-directory adjustment, which would rebase them outside the scope their ignore files govern.
	const pruneIgnorePatterns = convertPatternsForFastGlob(rules, matcher, cwd);

	return {
		options,
		pruneIgnorePatterns,
		filter: createFilter(finalPredicate, cwd, options.fs),
	};
};

// The ignore files are searched for with the same options as the glob itself, except for `ignore`, which excludes paths from the results and must not decide which ignore files are read. The patterns that cannot hide one are still passed on, so the search keeps skipping the directories they name.
const getIgnoreFileSearchOptions = (options, searchPatterns) => ({
	...options,
	ignore: convertIgnorePatternsForIgnoreFileSearch(options.ignore, searchPatterns),
});

/**
Apply ignore files to options and return the filter predicate.

The predicate handles every rule, including negations, and is the authoritative filter applied
to fast-glob's results. Rules that provably cannot be affected by negations are additionally
translated into fast-glob `ignore` patterns, so whole ignored directories are skipped during
traversal; see `convertPatternsForFastGlob`.

@returns {Promise<{options: Object, pruneIgnorePatterns: string[], filter: Function}>}
*/
const applyIgnoreFilesAndGetFilter = async options => {
	const cwd = options.cwd ?? process.cwd();
	const ignoreFilesPatterns = getIgnoreFilesPatterns(options);
	const globalIgnoreFile = options.globalGitignore ? await getGlobalGitignoreFileAsync(options) : undefined;

	if (ignoreFilesPatterns.length === 0 && !globalIgnoreFile) {
		return {
			options,
			pruneIgnorePatterns: [],
			filter: createFilterFunctionAsync(false, cwd, options.fs),
		};
	}

	// Read ignore files once and get both patterns and predicate
	// Enable parent .gitignore search when using gitignore option
	const includeParentIgnoreFiles = options.gitignore === true;
	const ignoreResult = ignoreFilesPatterns.length > 0
		? await getIgnorePatternsAndPredicate(ignoreFilesPatterns, getIgnoreFileSearchOptions(options, ignoreFilesPatterns), includeParentIgnoreFiles)
		: {rules: [], matcher: false};

	const globalGitRoot = globalIgnoreFile ? await findGitRoot(cwd, options.fs) : undefined;
	const globalMatcher = globalIgnoreFile ? buildGlobalMatcher(globalIgnoreFile, cwd, globalGitRoot ?? cwd) : undefined;

	return buildIgnoreFilterResult({
		options,
		cwd,
		ignoreResult,
		globalMatcher,
		createFilter: createFilterFunctionAsync,
	});
};

/**
Apply ignore files to options and return the filter predicate (sync version).

@returns {{options: Object, pruneIgnorePatterns: string[], filter: Function}}
*/
const applyIgnoreFilesAndGetFilterSync = options => {
	const cwd = options.cwd ?? process.cwd();
	const ignoreFilesPatterns = getIgnoreFilesPatterns(options);
	const globalIgnoreFile = options.globalGitignore ? getGlobalGitignoreFile(options) : undefined;

	if (ignoreFilesPatterns.length === 0 && !globalIgnoreFile) {
		return {
			options,
			pruneIgnorePatterns: [],
			filter: createFilterFunction(false, cwd, options.fs),
		};
	}

	// Read ignore files once and get both patterns and predicate
	// Enable parent .gitignore search when using gitignore option
	const includeParentIgnoreFiles = options.gitignore === true;
	const ignoreResult = ignoreFilesPatterns.length > 0
		? getIgnorePatternsAndPredicateSync(ignoreFilesPatterns, getIgnoreFileSearchOptions(options, ignoreFilesPatterns), includeParentIgnoreFiles)
		: {rules: [], matcher: false};

	const globalGitRoot = globalIgnoreFile ? findGitRootSync(cwd, options.fs) : undefined;
	const globalMatcher = globalIgnoreFile ? buildGlobalMatcher(globalIgnoreFile, cwd, globalGitRoot ?? cwd) : undefined;

	return buildIgnoreFilterResult({
		options,
		cwd,
		ignoreResult,
		globalMatcher,
		createFilter: createFilterFunction,
	});
};

const assertGlobalGitignoreSyncSupport = options => {
	if (options.globalGitignore && options.fs && !options.fs.statSync) {
		throw new Error('The `globalGitignore` option in `globbySync()` requires `fs.statSync` when a custom `fs` is provided.');
	}
};

const globalGitignoreAsyncStatErrorMessage = 'The `globalGitignore` option in `globby()` and `globbyStream()` requires `fs.promises.stat` or `fs.stat` when a custom `fs` is provided.';

const assertGlobalGitignoreAsyncSupport = options => {
	if (!options.globalGitignore || !options.fs) {
		return;
	}

	if (!options.fs.promises?.stat && !options.fs.stat) {
		throw new Error(globalGitignoreAsyncStatErrorMessage);
	}
};

const createPathResolver = cwd => {
	const basePath = cwd || process.cwd();
	const pathCache = new Map();

	return pathKey => {
		let absolutePath = pathCache.get(pathKey);
		if (absolutePath === undefined) {
			if (pathCache.size > 10_000) {
				pathCache.clear();
			}

			absolutePath = nodePath.isAbsolute(pathKey) ? pathKey : nodePath.resolve(basePath, pathKey);
			pathCache.set(pathKey, absolutePath);
		}

		return absolutePath;
	};
};

const createAsyncDirectoryCheck = fsMethod => {
	const directoryCache = new Map();

	return async absolutePath => {
		let isDirectory = directoryCache.get(absolutePath);
		if (isDirectory !== undefined) {
			return isDirectory;
		}

		try {
			const stats = await fsMethod?.(absolutePath);
			isDirectory = Boolean(stats?.isDirectory());
		} catch {
			isDirectory = false;
		}

		if (directoryCache.size > 10_000) {
			directoryCache.clear();
		}

		directoryCache.set(absolutePath, isDirectory);
		return isDirectory;
	};
};

const createDirectoryCheck = fsMethod => {
	const directoryCache = new Map();

	return absolutePath => {
		let isDirectory = directoryCache.get(absolutePath);
		if (isDirectory !== undefined) {
			return isDirectory;
		}

		try {
			isDirectory = Boolean(fsMethod?.(absolutePath)?.isDirectory());
		} catch {
			isDirectory = false;
		}

		if (directoryCache.size > 10_000) {
			directoryCache.clear();
		}

		directoryCache.set(absolutePath, isDirectory);
		return isDirectory;
	};
};

const createFilterFunctionAsync = (isIgnored, cwd, fsImplementation) => {
	const resolveAbsolutePath = createPathResolver(cwd);
	const isDirectoryEntry = createAsyncDirectoryCheck(getStatMethod(fsImplementation));

	return async fastGlobResult => {
		if (!isIgnored) {
			return true;
		}

		const absolutePath = resolveAbsolutePath(nodePath.normalize(fastGlobResult.path ?? fastGlobResult));
		if (isIgnored(absolutePath)) {
			return false;
		}

		return !(await isDirectoryEntry(absolutePath) && isIgnored(`${absolutePath}${nodePath.sep}`));
	};
};

const createFilterFunction = (isIgnored, cwd, fsImplementation) => {
	const seen = new Set();
	const resolveAbsolutePath = createPathResolver(cwd);
	const isDirectoryEntry = createDirectoryCheck(getStatSyncMethod(fsImplementation));

	return fastGlobResult => {
		const pathKey = nodePath.normalize(fastGlobResult.path ?? fastGlobResult);

		if (seen.has(pathKey)) {
			return false;
		}

		if (isIgnored) {
			const absolutePath = resolveAbsolutePath(pathKey);
			if (isIgnored(absolutePath)) {
				return false;
			}

			if (isDirectoryEntry(absolutePath) && isIgnored(`${absolutePath}${nodePath.sep}`)) {
				return false;
			}
		}

		seen.add(pathKey);
		return true;
	};
};

const unionFastGlobResults = (results, filter) => results.flat().filter(fastGlobResult => filter(fastGlobResult));
const unionFastGlobResultsAsync = async (results, filter) => {
	results = results.flat();
	const matches = await Promise.all(results.map(fastGlobResult => filter(fastGlobResult)));
	const seen = new Set();

	return results.filter((fastGlobResult, index) => {
		if (!matches[index]) {
			return false;
		}

		const pathKey = nodePath.normalize(fastGlobResult.path ?? fastGlobResult);
		if (seen.has(pathKey)) {
			return false;
		}

		seen.add(pathKey);
		return true;
	});
};

const convertNegativePatterns = (patterns, options) => {
	// If all patterns are negative and expandNegationOnlyPatterns is enabled (default),
	// prepend a positive catch-all pattern to make negation-only patterns work intuitively
	// (e.g., '!*.json' matches all files except JSON)
	if (patterns.length > 0 && patterns.every(pattern => isNegativePattern(pattern))) {
		if (options.expandNegationOnlyPatterns === false) {
			return [];
		}

		patterns = ['**/*', ...patterns];
	}

	const positiveAbsolutePathPrefixes = [];
	let hasRelativePositivePattern = false;
	const normalizedPatterns = [];

	for (const pattern of patterns) {
		if (isNegativePattern(pattern)) {
			normalizedPatterns.push(`!${normalizeNegativePattern(pattern.slice(1), positiveAbsolutePathPrefixes, hasRelativePositivePattern)}`);
			continue;
		}

		normalizedPatterns.push(pattern);

		const staticAbsolutePathPrefix = getStaticAbsolutePathPrefix(pattern);
		if (staticAbsolutePathPrefix === undefined) {
			hasRelativePositivePattern = true;
			continue;
		}

		positiveAbsolutePathPrefixes.push(staticAbsolutePathPrefix);
	}

	patterns = normalizedPatterns;

	const tasks = [];

	while (patterns.length > 0) {
		const index = patterns.findIndex(pattern => isNegativePattern(pattern));

		if (index === -1) {
			tasks.push({patterns, options});
			break;
		}

		const ignorePattern = patterns[index].slice(1);

		for (const task of tasks) {
			task.options.ignore.push(ignorePattern);
		}

		if (index !== 0) {
			tasks.push({
				patterns: patterns.slice(0, index),
				options: {
					...options,
					ignore: [
						...options.ignore,
						ignorePattern,
					],
				},
			});
		}

		patterns = patterns.slice(index + 1);
	}

	return tasks;
};

const applyParentDirectoryIgnoreAdjustments = tasks => tasks.map(task => ({
	patterns: task.patterns,
	options: {
		...task.options,
		ignore: adjustIgnorePatternsForParentDirectories(task.patterns, task.options.ignore),
	},
}));

// Prune patterns are appended after directory expansion and the parent-directory adjustment on
// purpose: they are already glob-shaped, and rebasing them onto a `../` prefix would let them
// ignore paths outside the scope of the ignore files they came from.
const appendPruneIgnorePatterns = (tasks, pruneIgnorePatterns) => pruneIgnorePatterns.length === 0
	? tasks
	: tasks.map(task => ({
		patterns: task.patterns,
		options: {
			...task.options,
			ignore: [...task.options.ignore, ...pruneIgnorePatterns],
		},
	}));

const normalizeExpandDirectoriesOption = (options, cwd) => ({
	...(cwd ? {cwd} : {}),
	...(Array.isArray(options) ? {files: options} : options),
});

const generateTasks = async (patterns, options, pruneIgnorePatterns = []) => {
	const globTasks = convertNegativePatterns(patterns, options);

	const {cwd, expandDirectories, fs: fsImplementation} = options;

	if (!expandDirectories) {
		return appendPruneIgnorePatterns(applyParentDirectoryIgnoreAdjustments(globTasks), pruneIgnorePatterns);
	}

	const directoryToGlobOptions = {
		...normalizeExpandDirectoriesOption(expandDirectories, cwd),
		fs: fsImplementation,
	};

	const tasks = await Promise.all(globTasks.map(async task => {
		let {patterns, options} = task;

		[
			patterns,
			options.ignore,
		] = await Promise.all([
			directoryToGlob(patterns, directoryToGlobOptions),
			directoryToGlob(options.ignore, {cwd, fs: fsImplementation}),
		]);

		// Adjust ignore patterns for parent directory references
		options.ignore = adjustIgnorePatternsForParentDirectories(patterns, options.ignore);

		return {patterns, options};
	}));

	return appendPruneIgnorePatterns(tasks, pruneIgnorePatterns);
};

const generateTasksSync = (patterns, options, pruneIgnorePatterns = []) => {
	const globTasks = convertNegativePatterns(patterns, options);
	const {cwd, expandDirectories, fs: fsImplementation} = options;

	if (!expandDirectories) {
		return appendPruneIgnorePatterns(applyParentDirectoryIgnoreAdjustments(globTasks), pruneIgnorePatterns);
	}

	const directoryToGlobSyncOptions = {
		...normalizeExpandDirectoriesOption(expandDirectories, cwd),
		fs: fsImplementation,
	};

	const tasks = globTasks.map(task => {
		let {patterns, options} = task;
		patterns = directoryToGlobSync(patterns, directoryToGlobSyncOptions);
		options.ignore = directoryToGlobSync(options.ignore, {cwd, fs: fsImplementation});

		// Adjust ignore patterns for parent directory references
		options.ignore = adjustIgnorePatternsForParentDirectories(patterns, options.ignore);

		return {patterns, options};
	});

	return appendPruneIgnorePatterns(tasks, pruneIgnorePatterns);
};

export const globby = normalizeArguments(async (patterns, options) => {
	assertGlobalGitignoreAsyncSupport(options);

	// Apply ignore files and get filter (reads .gitignore files once)
	const {options: modifiedOptions, pruneIgnorePatterns, filter} = await applyIgnoreFilesAndGetFilter(options);

	// Generate tasks, attaching the prune patterns so fast-glob skips ignored directories
	const tasks = await generateTasks(patterns, modifiedOptions, pruneIgnorePatterns);

	const results = await Promise.all(tasks.map(task => fastGlob(task.patterns, task.options)));
	return unionFastGlobResultsAsync(results, filter);
});

export const globbySync = normalizeArgumentsSync((patterns, options) => {
	assertGlobalGitignoreSyncSupport(options);

	// Apply ignore files and get filter (reads .gitignore files once)
	const {options: modifiedOptions, pruneIgnorePatterns, filter} = applyIgnoreFilesAndGetFilterSync(options);

	// Generate tasks, attaching the prune patterns so fast-glob skips ignored directories
	const tasks = generateTasksSync(patterns, modifiedOptions, pruneIgnorePatterns);

	const results = tasks.map(task => fastGlob.sync(task.patterns, task.options));
	return unionFastGlobResults(results, filter);
});

export const globbyStream = normalizeArgumentsSync((patterns, options) => {
	assertGlobalGitignoreAsyncSupport(options);

	const seen = new Set();
	const stream = Readable.from((async function * () {
		// Apply ignore files and get filter (reads .gitignore files once)
		const {options: modifiedOptions, pruneIgnorePatterns, filter} = await applyIgnoreFilesAndGetFilter(options);

		// Generate tasks, attaching the prune patterns so fast-glob skips ignored directories
		const tasks = await generateTasks(patterns, modifiedOptions, pruneIgnorePatterns);

		if (tasks.length === 0) {
			return;
		}

		const streams = tasks.map(task => fastGlob.stream(task.patterns, task.options));

		for await (const fastGlobResult of mergeStreams(streams)) {
			const pathKey = nodePath.normalize(fastGlobResult.path ?? fastGlobResult);
			if (!seen.has(pathKey) && await filter(fastGlobResult)) {
				seen.add(pathKey);
				yield fastGlobResult;
			}
		}
	})());

	// Returning a web stream will require revisiting once Readable.toWeb integration is viable.
	// return Readable.toWeb(stream);

	return stream;
});

export const isDynamicPattern = normalizeArgumentsSync((patterns, options) => patterns.some(pattern => fastGlob.isDynamicPattern(pattern, options)));

export const generateGlobTasks = normalizeArguments(generateTasks);
export const generateGlobTasksSync = normalizeArgumentsSync(generateTasksSync);

export {
	isGitIgnored,
	isGitIgnoredSync,
	isIgnoredByIgnoreFiles,
	isIgnoredByIgnoreFilesSync,
} from './ignore.js';

export const {convertPathToPattern} = fastGlob;
