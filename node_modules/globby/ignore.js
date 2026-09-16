import process from 'node:process';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import fastGlob from 'fast-glob';
import gitIgnore from 'ignore';
import isPathInside from 'is-path-inside';
import slash from 'slash';
import {toPath} from 'unicorn-magic/node';
import {
	isNegativePattern,
	bindFsMethod,
	promisifyFsMethod,
	findGitRoot,
	findGitRootSync,
	getParentGitignorePaths,
	buildPrunePatternsAndGuards,
	negationsCouldRescue,
} from './utilities.js';

const defaultIgnoredDirectories = [
	'**/node_modules',
	'**/flow-typed',
	'**/coverage',
	'**/.git',
];
const ignoreFilesGlobOptions = {
	absolute: true,
	dot: true,
};

export const GITIGNORE_FILES_PATTERN = '**/.gitignore';

// Maximum depth for [include] chains to prevent stack overflow (git uses 10)
const MAX_INCLUDE_DEPTH = 10;

const getReadFileMethod = fsImplementation =>
	bindFsMethod(fsImplementation?.promises, 'readFile')
	?? bindFsMethod(fsPromises, 'readFile')
	?? promisifyFsMethod(fsImplementation, 'readFile');

const getReadFileSyncMethod = fsImplementation =>
	bindFsMethod(fsImplementation, 'readFileSync')
	?? bindFsMethod(fs, 'readFileSync');

const shouldSkipIgnoreFileError = (error, suppressErrors) => {
	if (!error) {
		return Boolean(suppressErrors);
	}

	if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
		return true;
	}

	return Boolean(suppressErrors);
};

const createReadError = (kind, filePath, error) => {
	const prefix = `Failed to read ${kind} at ${filePath}`;
	if (error instanceof Error) {
		return new Error(`${prefix}: ${error.message}`, {cause: error});
	}

	return new Error(`${prefix}: ${String(error)}`);
};

const createIgnoreFileReadError = (filePath, error) => createReadError('ignore file', filePath, error);
const createGitConfigReadError = (filePath, error) => createReadError('git config', filePath, error);

const processIgnoreFileCore = (filePath, readMethod, suppressErrors) => {
	try {
		const content = readMethod(filePath, 'utf8');
		return {filePath, content};
	} catch (error) {
		if (shouldSkipIgnoreFileError(error, suppressErrors)) {
			return undefined;
		}

		throw createIgnoreFileReadError(filePath, error);
	}
};

const readIgnoreFilesSafely = async (paths, readFileMethod, suppressErrors) => {
	const fileResults = await Promise.all(paths.map(async filePath => {
		try {
			const content = await readFileMethod(filePath, 'utf8');
			return {filePath, content};
		} catch (error) {
			if (shouldSkipIgnoreFileError(error, suppressErrors)) {
				return undefined;
			}

			throw createIgnoreFileReadError(filePath, error);
		}
	}));

	return fileResults.filter(Boolean);
};

const readIgnoreFilesSafelySync = (paths, readFileSyncMethod, suppressErrors) => paths
	.map(filePath => processIgnoreFileCore(filePath, readFileSyncMethod, suppressErrors))
	.filter(Boolean);

const dedupePaths = paths => {
	const seen = new Set();
	return paths.filter(filePath => {
		if (seen.has(filePath)) {
			return false;
		}

		seen.add(filePath);
		return true;
	});
};

const globIgnoreFiles = (globFunction, patterns, normalizedOptions) => globFunction(patterns, {
	...normalizedOptions,
	...ignoreFilesGlobOptions, // Must be last to ensure absolute/dot flags stick
});

// Normalize a raw ignore-file line the way git does: strip a byte order mark and trailing whitespace. "Trailing spaces are ignored unless they are quoted with backslash" - a backslash-escaped trailing space is kept, still escaped, so the line can be re-fed to the `ignore` package without being stripped again.
const normalizeIgnoreFileLine = line => {
	line = line.replace(/^\uFEFF/u, '');

	let whitespaceStart = line.length;
	while (whitespaceStart > 0 && /\s/u.test(line[whitespaceStart - 1])) {
		whitespaceStart--;
	}

	if (whitespaceStart === line.length) {
		return line;
	}

	let backslashCount = 0;
	for (let index = whitespaceStart - 1; index >= 0 && line[index] === '\\'; index--) {
		backslashCount++;
	}

	return backslashCount % 2 === 1
		? line.slice(0, whitespaceStart) + ' '
		: line.slice(0, whitespaceStart);
};

const readIgnoreFileLines = content => content
	.split(/\r?\n/)
	.map(line => normalizeIgnoreFileLine(line))
	.filter(line => line && !line.startsWith('#'));

/**
Get the lines of every ignore file, as git reads them, each paired with the directory of the file that declared them.

Anchoring is only meaningful relative to that directory, and the rebased patterns have already lost it, so keep the originals for anything that has to reason about which paths a rule covers.
*/
const getIgnoreRules = files => files.flatMap(file => {
	const directory = path.dirname(file.filePath);
	return readIgnoreFileLines(file.content).map(pattern => ({pattern, directory}));
});

const buildIgnoreResult = (files, normalizedOptions, gitRoot) => {
	const baseDir = gitRoot || normalizedOptions.cwd;
	const patterns = getPatternsFromIgnoreFiles(files, baseDir);
	const matcher = createIgnoreMatcher(patterns, normalizedOptions.cwd, baseDir);

	return {
		patterns,
		rules: getIgnoreRules(files),
		matcher,
		predicate: fileOrDirectory => matcher(fileOrDirectory).ignored,
		usingGitRoot: Boolean(gitRoot && gitRoot !== normalizedOptions.cwd),
	};
};

// Apply base path to gitignore patterns based on .gitignore spec 2.22.1
// https://git-scm.com/docs/gitignore#_pattern_format
// See also https://github.com/sindresorhus/globby/issues/146
const applyBaseToPattern = (pattern, base) => {
	if (!base) {
		return pattern;
	}

	const isNegative = isNegativePattern(pattern);
	const cleanPattern = isNegative ? pattern.slice(1) : pattern;

	// Check if pattern has non-trailing slashes
	const slashIndex = cleanPattern.indexOf('/');
	const hasNonTrailingSlash = slashIndex !== -1 && slashIndex !== cleanPattern.length - 1;

	let result;
	if (!hasNonTrailingSlash) {
		// "If there is no separator at the beginning or middle of the pattern,
		// then the pattern may also match at any level below the .gitignore level."
		// So patterns like '*.log' or 'temp' or 'build/' (trailing slash) match recursively.
		result = path.posix.join(base, '**', cleanPattern);
	} else if (cleanPattern.startsWith('/')) {
		// "If there is a separator at the beginning [...] of the pattern,
		// then the pattern is relative to the directory level of the particular .gitignore file itself."
		// Leading slash anchors the pattern to the .gitignore's directory.
		result = path.posix.join(base, cleanPattern.slice(1));
	} else {
		// "If there is a separator [...] middle [...] of the pattern,
		// then the pattern is relative to the directory level of the particular .gitignore file itself."
		// Patterns like 'src/foo' are relative to the .gitignore's directory.
		result = path.posix.join(base, cleanPattern);
	}

	return isNegative ? '!' + result : result;
};

const parseIgnoreFile = (file, cwd) => {
	const base = slash(path.relative(cwd, path.dirname(file.filePath)));
	return readIgnoreFileLines(file.content).map(pattern => applyBaseToPattern(pattern, base));
};

const toRelativePath = (fileOrDirectory, cwd) => {
	if (path.isAbsolute(fileOrDirectory)) {
		// When paths are equal, path.relative returns empty string which is valid
		// isPathInside returns false for equal paths, so check this case first
		const relativePath = path.relative(cwd, fileOrDirectory);
		if (relativePath && !isPathInside(fileOrDirectory, cwd)) {
			// Path is outside cwd - it cannot be ignored by patterns in cwd
			// Return undefined to indicate this path is outside scope
			return undefined;
		}

		return relativePath;
	}

	// Normalize relative paths:
	// - Git treats './foo' as 'foo' when checking against patterns
	// - Patterns starting with './' in .gitignore are invalid and don't match anything
	// - The ignore library expects normalized paths without './' prefix
	if (fileOrDirectory.startsWith('./')) {
		return fileOrDirectory.slice(2);
	}

	// Paths with ../ point outside cwd and cannot match patterns from this directory
	// Return undefined to indicate this path is outside scope
	if (fileOrDirectory.startsWith('../')) {
		return undefined;
	}

	return fileOrDirectory;
};

const notIgnored = {ignored: false, unignored: false};

const createIgnoreMatcher = (patterns, cwd, baseDir) => {
	const ignores = gitIgnore().add(patterns);
	// Normalize to handle path separator and . / .. components consistently
	const resolvedCwd = path.normalize(path.resolve(cwd));
	const resolvedBaseDir = path.normalize(path.resolve(baseDir));

	return fileOrDirectory => {
		fileOrDirectory = toPath(fileOrDirectory);
		const hasTrailingSeparator = /[/\\]$/.test(fileOrDirectory);

		// Never ignore the cwd itself - use normalized comparison
		const normalizedPath = path.normalize(path.resolve(fileOrDirectory));
		if (normalizedPath === resolvedCwd) {
			return notIgnored;
		}

		// Convert to relative path from baseDir (use normalized baseDir)
		let relativePath = toRelativePath(fileOrDirectory, resolvedBaseDir);

		// If path is outside baseDir (undefined), it can't be ignored by patterns
		if (relativePath === undefined) {
			return notIgnored;
		}

		if (!relativePath) {
			return notIgnored;
		}

		if (hasTrailingSeparator && !relativePath.endsWith(path.sep)) {
			relativePath += path.sep;
		}

		return ignores.test(slash(relativePath));
	};
};

const normalizeOptions = (options = {}) => {
	const ignoreOption = options.ignore
		? (Array.isArray(options.ignore) ? options.ignore : [options.ignore])
		: [];

	const cwd = toPath(options.cwd) ?? process.cwd();

	// Adjust deep option for fast-glob: fast-glob's deep counts differently than expected
	// User's deep: 0 = root only -> fast-glob needs: 1
	// User's deep: 1 = root + 1 level -> fast-glob needs: 2
	const deep = typeof options.deep === 'number' ? Math.max(0, options.deep) + 1 : Number.POSITIVE_INFINITY;

	// Only pass through specific fast-glob options that make sense for finding ignore files
	return {
		cwd,
		suppressErrors: options.suppressErrors ?? false,
		deep,
		ignore: [...ignoreOption, ...defaultIgnoredDirectories],
		followSymbolicLinks: options.followSymbolicLinks ?? true,
		concurrency: options.concurrency,
		throwErrorOnBrokenSymbolicLink: options.throwErrorOnBrokenSymbolicLink ?? false,
		fs: options.fs,
	};
};

const unescapeGitQuotedValue = value => value.replaceAll(/\\(["\\abfnrtv])/g, (_match, escapedCharacter) => {
	switch (escapedCharacter) {
		case 'a': {
			return '\u0007';
		}

		case 'b': {
			return '\b';
		}

		case 'f': {
			return '\f';
		}

		case 'n': {
			return '\n';
		}

		case 'r': {
			return '\r';
		}

		case 't': {
			return '\t';
		}

		case 'v': {
			return '\v';
		}

		default: {
			return escapedCharacter;
		}
	}
});

const parseGitConfigValue = value => {
	const trimmedValue = value.trim();
	const quotedMatch = trimmedValue.match(/^"((?:[^"\\]|\\.)*)"\s*(?:[#;].*)?$/);

	if (quotedMatch) {
		return unescapeGitQuotedValue(quotedMatch[1]);
	}

	return trimmedValue.replace(/\s[#;].*$/, '').trim();
};

const resolveConfigPath = (filePath, configPath) => {
	if (configPath.startsWith('~/')) {
		const homeDirectory = os.homedir();
		const resolved = path.join(homeDirectory, configPath.slice(2));
		// Ensure the resolved path is within the home directory to prevent traversal via ~/..
		if (!isPathInside(resolved, homeDirectory)) {
			// Invalid path, return a path that won't exist
			return path.join(homeDirectory, '.globby-invalid-path-traversal');
		}

		return resolved;
	}

	if (path.isAbsolute(configPath)) {
		return configPath;
	}

	return path.resolve(path.dirname(filePath), configPath);
};

const parseGitConfigSection = line => {
	if (!line.startsWith('[')) {
		return undefined;
	}

	let inQuotes = false;
	let isEscaped = false;

	for (let index = 1; index < line.length; index++) {
		const character = line[index];

		if (isEscaped) {
			isEscaped = false;
			continue;
		}

		if (character === '\\') {
			isEscaped = true;
			continue;
		}

		if (character === '"') {
			inQuotes = !inQuotes;
			continue;
		}

		if (character === ']' && !inQuotes) {
			const remainder = line.slice(index + 1).trimStart();
			if (remainder && !remainder.startsWith('#') && !remainder.startsWith(';')) {
				return undefined;
			}

			return line.slice(1, index).trim();
		}
	}

	return undefined;
};

const parseGitConfigEntry = line => {
	const match = line.match(/^([A-Za-z\d-.]+)\s*=\s*(.*)$/);

	if (!match) {
		return undefined;
	}

	return {
		key: match[1].toLowerCase(),
		value: parseGitConfigValue(match[2]),
	};
};

const parseIncludeIfCondition = section => {
	if (!section) {
		return undefined;
	}

	const match = section.match(/^includeif\s+"([^"]+)"$/i);
	return match ? match[1] : undefined;
};

const normalizeGitConfigConditionPattern = (pattern, configFilePath) => {
	if (pattern.startsWith('~/')) {
		pattern = path.join(os.homedir(), pattern.slice(2));
	} else if (pattern.startsWith('./')) {
		pattern = path.resolve(path.dirname(configFilePath), pattern.slice(2));
	} else if (!path.isAbsolute(pattern)) {
		pattern = `**/${pattern}`;
	}

	if (pattern.endsWith('/')) {
		pattern += '**';
	}

	return slash(pattern);
};

const gitConfigGlobToRegex = (pattern, flags) => {
	let regex = '';

	for (let index = 0; index < pattern.length; index++) {
		const character = pattern[index];
		const nextCharacter = pattern[index + 1];
		const nextNextCharacter = pattern[index + 2];

		if (character === '*' && nextCharacter === '*' && nextNextCharacter === '/') {
			regex += '(?:.*/)?';
			index += 2;
			continue;
		}

		if (character === '*' && nextCharacter === '*') {
			regex += '.*';
			index += 1;
			continue;
		}

		if (character === '*') {
			regex += '[^/]*';
			continue;
		}

		if (character === '?') {
			regex += '[^/]';
			continue;
		}

		if (character === '[') {
			const closingBracketIndex = pattern.indexOf(']', index + 1);
			if (closingBracketIndex !== -1) {
				const bracketContent = pattern.slice(index + 1, closingBracketIndex);
				if (bracketContent) {
					const negatedBracketContent = bracketContent[0] === '!' ? `^${bracketContent.slice(1)}` : bracketContent;
					regex += `[${negatedBracketContent}]`;
					index = closingBracketIndex;
					continue;
				}
			}
		}

		regex += /[|\\{}()[\]^$+?.]/.test(character) ? `\\${character}` : character;
	}

	try {
		return new RegExp(`^${regex}$`, flags);
	} catch {
		// If regex construction fails (e.g., invalid bracket expression), return a non-matching pattern
		return /(?!)/;
	}
};

const matchesIncludeIfCondition = (condition, gitDirectory, configFilePath) => {
	if (!gitDirectory) {
		return false;
	}

	const match = condition.match(/^(gitdir|gitdir\/i):(.*)$/i);
	if (!match) {
		return false;
	}

	const [, keyword, rawPattern] = match;
	const pattern = normalizeGitConfigConditionPattern(rawPattern.trim(), configFilePath);
	const isCaseInsensitive = keyword.toLowerCase() === 'gitdir/i';
	const regularExpression = gitConfigGlobToRegex(pattern, isCaseInsensitive ? 'i' : undefined);
	const normalizedGitDirectory = slash(path.resolve(gitDirectory));

	return regularExpression.test(normalizedGitDirectory);
};

const shouldIncludeConfigSection = (section, gitDirectory, configFilePath) => {
	if (section?.toLowerCase() === 'include') {
		return true;
	}

	// `globalGitignore` intentionally keeps `includeIf` support narrow.
	// Only `gitdir:` and `gitdir/i:` conditions are treated as active here.
	// Other Git predicates such as `onbranch:` are outside this feature's
	// supported boundary and are documented as unsupported.
	const condition = parseIncludeIfCondition(section);
	return condition ? matchesIncludeIfCondition(condition, gitDirectory, configFilePath) : false;
};

const createExcludesFileValue = (value, declaringFilePath) => ({
	value,
	declaringFilePath,
});

/**
Parse git config content and return the excludesFile value and any include paths to recurse into.

The caller is responsible for reading files and recursing (sync or async).
*/
const parseGitConfigForExcludesFile = (content, normalizedPath, gitDirectory) => {
	let currentSection;
	let excludesFile;
	const includePaths = [];

	for (const line of content.split(/\r?\n/)) {
		const trimmed = line.trim();

		if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) {
			continue;
		}

		if (trimmed.startsWith('[')) {
			currentSection = parseGitConfigSection(trimmed);
			continue;
		}

		const entry = parseGitConfigEntry(trimmed);
		if (!entry) {
			continue;
		}

		if (currentSection?.toLowerCase() === 'core' && entry.key === 'excludesfile') {
			excludesFile = createExcludesFileValue(entry.value, normalizedPath);
			continue;
		}

		if (shouldIncludeConfigSection(currentSection, gitDirectory, normalizedPath) && entry.key === 'path' && entry.value) {
			includePaths.push(resolveConfigPath(normalizedPath, entry.value));
		}
	}

	return {excludesFile, includePaths};
};

const readGitConfigFile = (normalizedPath, readMethod, suppressErrors) => {
	try {
		return readMethod(normalizedPath, 'utf8');
	} catch (error) {
		if (shouldSkipIgnoreFileError(error, suppressErrors)) {
			return undefined;
		}

		throw createGitConfigReadError(normalizedPath, error);
	}
};

const getExcludesFileFromGitConfigSync = (filePath, readFileSync, gitDirectory, options = {}) => {
	const {suppressErrors, includeStack = new Set(), depth = 0} = options;
	const normalizedPath = path.resolve(filePath);

	if (includeStack.has(normalizedPath)) {
		return undefined;
	}

	if (depth >= MAX_INCLUDE_DEPTH) {
		return undefined;
	}

	includeStack.add(normalizedPath);

	const content = readGitConfigFile(normalizedPath, readFileSync, suppressErrors);
	if (content === undefined) {
		includeStack.delete(normalizedPath);
		return undefined;
	}

	let {excludesFile, includePaths} = parseGitConfigForExcludesFile(content, normalizedPath, gitDirectory);

	for (const includePath of includePaths) {
		const includedExcludesFile = getExcludesFileFromGitConfigSync(includePath, readFileSync, gitDirectory, {suppressErrors, includeStack, depth: depth + 1});
		if (includedExcludesFile !== undefined) {
			excludesFile = includedExcludesFile;
		}
	}

	includeStack.delete(normalizedPath);
	return excludesFile;
};

const getExcludesFileFromGitConfigAsync = async (filePath, readFile, gitDirectory, options = {}) => {
	const {suppressErrors, includeStack = new Set(), depth = 0} = options;
	const normalizedPath = path.resolve(filePath);

	if (includeStack.has(normalizedPath)) {
		return undefined;
	}

	if (depth >= MAX_INCLUDE_DEPTH) {
		return undefined;
	}

	includeStack.add(normalizedPath);

	let content;
	try {
		content = await readFile(normalizedPath, 'utf8');
	} catch (error) {
		includeStack.delete(normalizedPath);
		if (shouldSkipIgnoreFileError(error, suppressErrors)) {
			return undefined;
		}

		throw createGitConfigReadError(normalizedPath, error);
	}

	let {excludesFile, includePaths} = parseGitConfigForExcludesFile(content, normalizedPath, gitDirectory);

	for (const includePath of includePaths) {
		// eslint-disable-next-line no-await-in-loop
		const includedExcludesFile = await getExcludesFileFromGitConfigAsync(includePath, readFile, gitDirectory, {suppressErrors, includeStack, depth: depth + 1});
		if (includedExcludesFile !== undefined) {
			excludesFile = includedExcludesFile;
		}
	}

	includeStack.delete(normalizedPath);
	return excludesFile;
};

const resolveGitDirectoryFromFile = (gitFilePath, content) => {
	const match = content.match(/^gitdir:\s*(.+?)\s*$/i);
	if (!match) {
		return gitFilePath;
	}

	return path.resolve(path.dirname(gitFilePath), match[1]);
};

const getGitDirectorySync = (gitRoot, readFileSync) => {
	if (!gitRoot) {
		return undefined;
	}

	const gitFilePath = path.join(gitRoot, '.git');

	try {
		return resolveGitDirectoryFromFile(gitFilePath, readFileSync(gitFilePath, 'utf8'));
	} catch {
		return gitFilePath;
	}
};

const getGitDirectoryAsync = async (gitRoot, readFile) => {
	if (!gitRoot) {
		return undefined;
	}

	const gitFilePath = path.join(gitRoot, '.git');

	try {
		return resolveGitDirectoryFromFile(gitFilePath, await readFile(gitFilePath, 'utf8'));
	} catch {
		return gitFilePath;
	}
};

const getXdgConfigHome = () => process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');

const getGitConfigPaths = () => {
	// `globalGitignore` intentionally reads only user-level Git config.
	// It does not try to emulate every Git config scope such as repository
	// `.git/config` or system config. This keeps the feature boundary small
	// and predictable while still covering the common user-level excludes file.
	//
	// `GIT_CONFIG_GLOBAL` replaces the user-level config entirely.
	if ('GIT_CONFIG_GLOBAL' in process.env) {
		const value = process.env.GIT_CONFIG_GLOBAL;
		return value ? [value] : [];
	}

	return [
		path.join(getXdgConfigHome(), 'git', 'config'),
		path.join(os.homedir(), '.gitconfig'),
	];
};

const getDefaultGlobalGitignorePath = () => path.join(getXdgConfigHome(), 'git', 'ignore');

const resolveExcludesFilePath = excludesFileConfig => {
	// An explicit empty value disables the global gitignore entirely.
	if (excludesFileConfig?.value === '') {
		return undefined;
	}

	// When no core.excludesFile was configured, fall back to Git's default
	// user-level ignore file. This matches Git's behavior: the default path
	// applies even when GIT_CONFIG_GLOBAL="" suppresses config file reading.
	if (excludesFileConfig === undefined) {
		return getDefaultGlobalGitignorePath();
	}

	// Relative core.excludesfile values are resolved from the config file that
	// declared them. Do not resolve them from the repository root.
	return resolveConfigPath(excludesFileConfig.declaringFilePath, excludesFileConfig.value);
};

const readGlobalGitignoreContent = (filePath, readMethod, suppressErrors) => {
	try {
		const content = readMethod(filePath, 'utf8');
		return {filePath, content};
	} catch (error) {
		if (shouldSkipIgnoreFileError(error, suppressErrors)) {
			return undefined;
		}

		throw createIgnoreFileReadError(filePath, error);
	}
};

export const getGlobalGitignoreFile = (options = {}) => {
	const cwd = toPath(options.cwd) ?? process.cwd();
	const readFileSync = getReadFileSyncMethod(options.fs);
	const gitRoot = findGitRootSync(cwd, options.fs);
	const gitDirectory = getGitDirectorySync(gitRoot, readFileSync);
	let excludesFileConfig;

	for (const gitConfigPath of getGitConfigPaths()) {
		const value = getExcludesFileFromGitConfigSync(gitConfigPath, readFileSync, gitDirectory, {suppressErrors: options.suppressErrors});
		if (value !== undefined) {
			excludesFileConfig = value;
		}
	}

	const filePath = resolveExcludesFilePath(excludesFileConfig);
	return filePath === undefined ? undefined : readGlobalGitignoreContent(filePath, readFileSync, options.suppressErrors);
};

export const getGlobalGitignoreFileAsync = async (options = {}) => {
	const cwd = toPath(options.cwd) ?? process.cwd();
	const readFile = getReadFileMethod(options.fs);
	const gitRoot = await findGitRoot(cwd, options.fs);
	const gitDirectory = await getGitDirectoryAsync(gitRoot, readFile);
	const excludesFileValues = await Promise.all(getGitConfigPaths().map(gitConfigPath => getExcludesFileFromGitConfigAsync(
		gitConfigPath,
		readFile,
		gitDirectory,
		{suppressErrors: options.suppressErrors},
	)));
	const excludesFileConfig = excludesFileValues.findLast(value => value !== undefined);

	const filePath = resolveExcludesFilePath(excludesFileConfig);
	if (filePath === undefined) {
		return undefined;
	}

	try {
		const content = await readFile(filePath, 'utf8');
		return {filePath, content};
	} catch (error) {
		if (shouldSkipIgnoreFileError(error, options.suppressErrors)) {
			return undefined;
		}

		throw createIgnoreFileReadError(filePath, error);
	}
};

export const buildGlobalMatcher = (globalIgnoreFile, cwd, rootDirectory = cwd) => {
	// Passing the file's own directory as cwd gives base='', so patterns stay
	// unchanged and are interpreted relative to the project root (cwd). This
	// matches Git's behavior: patterns without slashes match at any depth,
	// patterns starting with / are anchored to the project root.
	const patterns = parseIgnoreFile(globalIgnoreFile, path.dirname(globalIgnoreFile.filePath));
	return createIgnoreMatcher(patterns, cwd, rootDirectory);
};

export const buildGlobalPredicate = (globalIgnoreFile, cwd, rootDirectory = cwd) => {
	const matcher = buildGlobalMatcher(globalIgnoreFile, cwd, rootDirectory);
	return fileOrDirectory => matcher(fileOrDirectory).ignored;
};

/**
Ignore files at or above the cwd can be located without traversing anything.

Reading them before searching for the nested ones lets the search itself skip whole ignored directories. Otherwise the recursive search for ignore files walks even the directories that the same `.gitignore` excludes, so a large ignored directory (a mounted share, a build output) is enumerated on every call.
*/
const getKnownIgnoreFilePaths = (patterns, normalizedOptions, gitRoot) => {
	const searchPatterns = [patterns].flat();
	const isGitignoreSearch = searchPatterns.includes(GITIGNORE_FILES_PATTERN);
	if (!isGitignoreSearch) {
		return [];
	}

	return gitRoot
		? getParentGitignorePaths(gitRoot, normalizedOptions.cwd)
		: [path.join(normalizedOptions.cwd, '.gitignore')];
};

const getKnownIgnoreFileSearchOptions = (patterns, normalizedOptions) => ({
	...normalizedOptions,
	ignore: [
		...normalizedOptions.ignore,
		// Keep negative search patterns active when the known candidates are matched independently.
		...[patterns].flat()
			.filter(pattern => isNegativePattern(pattern))
			.map(pattern => pattern.slice(1)),
	],
});

const getKnownIgnoreFilePattern = (filePath, cwd) => {
	// Relative candidates keep cwd-relative exclusions such as `.gitignore` meaningful; parent candidates must remain absolute because they are outside cwd.
	const pattern = isPathInside(filePath, cwd) ? path.relative(cwd, filePath) : filePath;
	return fastGlob.convertPathToPattern(pattern);
};

const getMatchingKnownIgnoreFilePaths = (knownPaths, matchingPaths) => {
	// Fast-glob normalizes its results, so compare resolved paths before returning the original paths for reading.
	const matchingPathSet = new Set(matchingPaths.map(filePath => path.resolve(filePath)));

	return knownPaths.filter(filePath => matchingPathSet.has(path.resolve(filePath)));
};

const globKnownIgnoreFilePaths = (globFunction, knownPaths, patterns, normalizedOptions) => {
	if (knownPaths.length === 0) {
		return [];
	}

	return globIgnoreFiles(
		globFunction,
		knownPaths.map(filePath => getKnownIgnoreFilePattern(filePath, normalizedOptions.cwd)),
		getKnownIgnoreFileSearchOptions(patterns, normalizedOptions),
	);
};

const filterKnownIgnoreFilePathsAsync = async (knownPaths, patterns, normalizedOptions) => {
	const matchingPaths = await globKnownIgnoreFilePaths(fastGlob, knownPaths, patterns, normalizedOptions);
	return getMatchingKnownIgnoreFilePaths(knownPaths, matchingPaths);
};

const filterKnownIgnoreFilePathsSync = (knownPaths, patterns, normalizedOptions) => {
	const matchingPaths = globKnownIgnoreFilePaths(fastGlob.sync, knownPaths, patterns, normalizedOptions);
	return getMatchingKnownIgnoreFilePaths(knownPaths, matchingPaths);
};

const getIgnoreFileSearchPrune = (searchPatterns, files, normalizedOptions, gitRoot) => {
	if (files.length === 0) {
		return {patterns: [], guardNames: []};
	}

	const {cwd} = normalizedOptions;
	const baseDir = gitRoot || cwd;
	const ignorePatterns = getPatternsFromIgnoreFiles(files, baseDir);
	const matcher = createIgnoreMatcher(ignorePatterns, cwd, baseDir);

	// Custom ignore files can live anywhere, including beside the cwd, so only a pure `.gitignore` search may treat the rules at or above the cwd as complete.
	const searchPatternsArray = [searchPatterns].flat();
	const gitignoreOnlySearch = searchPatternsArray.every(pattern => pattern === GITIGNORE_FILES_PATTERN);
	const searchesForGitignoreFiles = searchPatternsArray.includes(GITIGNORE_FILES_PATTERN);

	return buildPrunePatternsAndGuards(getIgnoreRules(files), matcher, cwd, {gitignoreOnlySearch, searchesForGitignoreFiles});
};

const withPrunedSearch = (normalizedOptions, prunePatterns) => prunePatterns.length === 0
	? normalizedOptions
	: {...normalizedOptions, ignore: [...normalizedOptions.ignore, ...prunePatterns]};

// The known ignore files have already been read; only the newly discovered ones are left.
const getUnreadPaths = (childPaths, knownPaths) => {
	const alreadyRead = new Set(knownPaths.map(filePath => path.resolve(filePath)));
	return dedupePaths(childPaths).filter(filePath => !alreadyRead.has(path.resolve(filePath)));
};

const collectIgnoreFileArtifactsAsync = async (patterns, options, includeParentIgnoreFiles) => {
	const normalizedOptions = normalizeOptions(options);
	const readFileMethod = getReadFileMethod(normalizedOptions.fs);
	const gitRoot = includeParentIgnoreFiles
		? await findGitRoot(normalizedOptions.cwd, normalizedOptions.fs)
		: undefined;

	const knownPaths = await filterKnownIgnoreFilePathsAsync(
		getKnownIgnoreFilePaths(patterns, normalizedOptions, gitRoot),
		patterns,
		normalizedOptions,
	);
	const knownFiles = await readIgnoreFilesSafely(knownPaths, readFileMethod, normalizedOptions.suppressErrors);
	const {patterns: prunePatterns, guardNames} = getIgnoreFileSearchPrune(patterns, knownFiles, normalizedOptions, gitRoot);

	const childPaths = await globIgnoreFiles(fastGlob, patterns, withPrunedSearch(normalizedOptions, prunePatterns));
	let childFiles = await readIgnoreFilesSafely(getUnreadPaths(childPaths, knownPaths), readFileMethod, normalizedOptions.suppressErrors);

	// A negation found by the pruned search can re-include a directory the prune patterns skipped, hiding the ignore files inside it. Repeat the search without pruning when that happens; a single unpruned pass finds everything, so once is enough.
	if (negationsCouldRescue(getIgnoreRules(childFiles), guardNames)) {
		const allPaths = await globIgnoreFiles(fastGlob, patterns, normalizedOptions);
		childFiles = await readIgnoreFilesSafely(getUnreadPaths(allPaths, knownPaths), readFileMethod, normalizedOptions.suppressErrors);
	}

	return {files: [...knownFiles, ...childFiles], normalizedOptions, gitRoot};
};

const collectIgnoreFileArtifactsSync = (patterns, options, includeParentIgnoreFiles) => {
	const normalizedOptions = normalizeOptions(options);
	const readFileSyncMethod = getReadFileSyncMethod(normalizedOptions.fs);
	const gitRoot = includeParentIgnoreFiles
		? findGitRootSync(normalizedOptions.cwd, normalizedOptions.fs)
		: undefined;

	const knownPaths = filterKnownIgnoreFilePathsSync(
		getKnownIgnoreFilePaths(patterns, normalizedOptions, gitRoot),
		patterns,
		normalizedOptions,
	);
	const knownFiles = readIgnoreFilesSafelySync(knownPaths, readFileSyncMethod, normalizedOptions.suppressErrors);
	const {patterns: prunePatterns, guardNames} = getIgnoreFileSearchPrune(patterns, knownFiles, normalizedOptions, gitRoot);

	const childPaths = globIgnoreFiles(fastGlob.sync, patterns, withPrunedSearch(normalizedOptions, prunePatterns));
	let childFiles = readIgnoreFilesSafelySync(getUnreadPaths(childPaths, knownPaths), readFileSyncMethod, normalizedOptions.suppressErrors);

	// See `collectIgnoreFileArtifactsAsync`: a rescuing negation means the pruned search may have missed files.
	if (negationsCouldRescue(getIgnoreRules(childFiles), guardNames)) {
		const allPaths = globIgnoreFiles(fastGlob.sync, patterns, normalizedOptions);
		childFiles = readIgnoreFilesSafelySync(getUnreadPaths(allPaths, knownPaths), readFileSyncMethod, normalizedOptions.suppressErrors);
	}

	return {files: [...knownFiles, ...childFiles], normalizedOptions, gitRoot};
};

export const isIgnoredByIgnoreFiles = async (patterns, options) => {
	const {files, normalizedOptions, gitRoot} = await collectIgnoreFileArtifactsAsync(patterns, options, false);
	return buildIgnoreResult(files, normalizedOptions, gitRoot).predicate;
};

export const isIgnoredByIgnoreFilesSync = (patterns, options) => {
	const {files, normalizedOptions, gitRoot} = collectIgnoreFileArtifactsSync(patterns, options, false);
	return buildIgnoreResult(files, normalizedOptions, gitRoot).predicate;
};

const getPatternsFromIgnoreFiles = (files, baseDir) => files.flatMap(file => parseIgnoreFile(file, baseDir));

/**
Read ignore files and return both patterns and predicate.
This avoids reading the same files twice (once for patterns, once for filtering).

@param {string[]} patterns - Patterns to find ignore files
@param {Object} options - Options object
@param {boolean} [includeParentIgnoreFiles=false] - Whether to search for parent .gitignore files
@returns {Promise<{patterns: string[], rules: Array<{pattern: string, directory: string}>, matcher: Function, predicate: Function, usingGitRoot: boolean}>}
*/
export const getIgnorePatternsAndPredicate = async (patterns, options, includeParentIgnoreFiles = false) => {
	const {files, normalizedOptions, gitRoot} = await collectIgnoreFileArtifactsAsync(
		patterns,
		options,
		includeParentIgnoreFiles,
	);

	return buildIgnoreResult(files, normalizedOptions, gitRoot);
};

/**
Read ignore files and return both patterns and predicate (sync version).

@param {string[]} patterns - Patterns to find ignore files
@param {Object} options - Options object
@param {boolean} [includeParentIgnoreFiles=false] - Whether to search for parent .gitignore files
@returns {{patterns: string[], rules: Array<{pattern: string, directory: string}>, matcher: Function, predicate: Function, usingGitRoot: boolean}}
*/
export const getIgnorePatternsAndPredicateSync = (patterns, options, includeParentIgnoreFiles = false) => {
	const {files, normalizedOptions, gitRoot} = collectIgnoreFileArtifactsSync(
		patterns,
		options,
		includeParentIgnoreFiles,
	);

	return buildIgnoreResult(files, normalizedOptions, gitRoot);
};

export const isGitIgnored = options => isIgnoredByIgnoreFiles(GITIGNORE_FILES_PATTERN, options);
export const isGitIgnoredSync = options => isIgnoredByIgnoreFilesSync(GITIGNORE_FILES_PATTERN, options);
