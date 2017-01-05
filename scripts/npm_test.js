// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var childProcess = require("child_process");
var fs = require("fs");
var path = require("path");
var shell = require("child_process").execSync;

var utils = require("./utils");

var Flags = {
    DEBUG_DEVTOOLS: "--debug-devtools",
    DEBUG_DEVTOOLS_SHORTHAND: "-d",
    FETCH_CONTENT_SHELL: "--fetch-content-shell",
};

var IS_DEBUG_ENABLED = utils.includes(process.argv, Flags.DEBUG_DEVTOOLS) ||
    utils.includes(process.argv, Flags.DEBUG_DEVTOOLS_SHORTHAND);
var IS_FETCH_CONTENT_SHELL = utils.includes(process.argv, Flags.FETCH_CONTENT_SHELL);

var CONTENT_SHELL_ZIP = "content-shell.zip";
var MAX_CONTENT_SHELLS = 10;
var PLATFORM = getPlatform();
var PYTHON = process.platform === "win32" ? "python.bat" : "python";

var CHROMIUM_SRC_PATH = path.resolve(__dirname, "..", "..", "..", "..", "..");
var RELEASE_PATH = path.resolve(CHROMIUM_SRC_PATH, "out", "Release");
var BLINK_TEST_PATH = path.resolve(CHROMIUM_SRC_PATH, "blink", "tools", "run_layout_tests.py");
var CACHE_PATH = path.resolve(__dirname, "..", ".test_cache");
var SOURCE_PATH = path.resolve(__dirname, "..", "front_end");

function main(){
    var hasUserCompiledContentShell = utils.isFile(getContentShellBinaryPath(RELEASE_PATH));
    if (!IS_FETCH_CONTENT_SHELL && hasUserCompiledContentShell) {
        var outDir = path.resolve(RELEASE_PATH, "..");
        if (!IS_DEBUG_ENABLED) {
            console.log("Compiling devtools frontend");
            shell(`ninja -C ${RELEASE_PATH} devtools_frontend_resources`);
        }
        runTests(outDir, IS_DEBUG_ENABLED);
        return;
    }
    if (!utils.isDir(CACHE_PATH))
        fs.mkdirSync(CACHE_PATH);
    deleteOldContentShells();
    findPreviousUploadedPosition(findMostRecentChromiumCommit())
        .then(onUploadedCommitPosition)
        .catch(onError);

    function onError(error) {
        console.log("Unable to run tests because of error:", error);
        console.log(`Try removing the .test_cache folder [${CACHE_PATH}] and retrying`);
    }
}
main();

function onUploadedCommitPosition(commitPosition)
{
    var contentShellDirPath = path.resolve(CACHE_PATH, commitPosition, "out", "Release");
    var contentShellResourcesPath = path.resolve(contentShellDirPath, "resources");
    var contentShellPath = path.resolve(CACHE_PATH, commitPosition, "out");

    var hasCachedContentShell = utils.isFile(getContentShellBinaryPath(contentShellDirPath));
    if (hasCachedContentShell) {
        console.log(`Using cached content shell at: ${contentShellPath}`);
        copyFrontend(contentShellResourcesPath);
        return runTests(contentShellPath, true);
    }
    return prepareContentShellDirectory(commitPosition)
        .then(downloadContentShell)
        .then(extractContentShell)
        .then(() => copyFrontend(contentShellResourcesPath))
        .then(() => runTests(contentShellPath, true));
}

function copyFrontend(contentShellResourcesPath)
{
    var devtoolsResourcesPath = path.resolve(contentShellResourcesPath, "inspector");
    var copiedFrontendPath = path.resolve(devtoolsResourcesPath, "front_end");
    var debugFrontendPath = path.resolve(devtoolsResourcesPath, "debug");
    var inspectorBackendCommandsPath = path.resolve(devtoolsResourcesPath, "InspectorBackendCommands.js");
    var supportedCSSPropertiesPath = path.resolve(devtoolsResourcesPath, "SupportedCSSProperties.js");
    utils.removeRecursive(copiedFrontendPath);
    utils.removeRecursive(debugFrontendPath);
    utils.copyRecursive(SOURCE_PATH, devtoolsResourcesPath);
    fs.renameSync(copiedFrontendPath, debugFrontendPath);
    utils.copy(inspectorBackendCommandsPath, debugFrontendPath);
    utils.copy(supportedCSSPropertiesPath, debugFrontendPath);
}

function getPlatform()
{
    if (process.platform === "linux") {
        if (process.arch === "x64")
            return "Linux_x64";
        throw new Error("Pre-compiled content shells are only available for x64 on Linux");
    }
    if (process.platform === "win32") {
        if (process.arch === "x64")
            return "Win_x64";
        return "Win";
    }
    if (process.platform === "darwin") {
        return "Mac";
    }
    throw new Error(`Unrecognized platform detected: ${process.platform}`);
}

function findMostRecentChromiumCommit()
{
    var commitMessage = shell(`git log --max-count=1 --grep="Cr-Commit-Position"`).toString().trim();
    var commitPosition = commitMessage.match(/Cr-Commit-Position: refs\/heads\/master@\{#([0-9]+)\}/)[1];
    return commitPosition;
}

function deleteOldContentShells()
{
    var files = fs.readdirSync(CACHE_PATH);
    if (files.length < MAX_CONTENT_SHELLS)
        return;
    files.sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
    var remainingNumberOfContentShells = MAX_CONTENT_SHELLS / 2;
    var oldContentShellDirs = files.slice(remainingNumberOfContentShells);
    for (var i = 0; i < oldContentShellDirs.length; i++)
        utils.removeRecursive(path.resolve(CACHE_PATH, oldContentShellDirs[i]));
    console.log(`Removed old content shells: ${oldContentShellDirs}`)
}

function findPreviousUploadedPosition(commitPosition)
{
    var previousPosition = commitPosition - 100;
    var positionsListURL = `http://commondatastorage.googleapis.com/chromium-browser-snapshots/?delimiter=/&prefix=${PLATFORM}/&marker=${PLATFORM}/${previousPosition}/`;
    return utils.fetch(positionsListURL)
        .then(onPositionsList)
        .catch(onError);

    function onPositionsList(buffer)
    {
        var positions = buffer.toString("binary")
            .match(/([^<>]+)(?=<\/Prefix><\/CommonPrefixes>)/g)
            .map(prefixedPosition => prefixedPosition.split("/")[1])
            .map(positionString => parseInt(positionString, 10));
        var positionSet = new Set(positions);
        var previousUploadedPosition = commitPosition;
        while (commitPosition - previousUploadedPosition < 100) {
            if (positionSet.has(previousUploadedPosition))
                return previousUploadedPosition.toString();
            previousUploadedPosition--;
        }
        onError();
    }

    function onError(error)
    {
        if (error)
            console.log(`Received error: ${error} trying to fetch positions list from url: ${positionsListURL}`);
        throw new Error(`Unable to find a previous upload position for commit position: ${commitPosition}`);
    }
}

function prepareContentShellDirectory(contentShellCommitPosition)
{
    var contentShellPath = path.join(CACHE_PATH, contentShellCommitPosition);
    if (utils.isDir(contentShellPath))
        utils.removeRecursive(contentShellPath);
    fs.mkdirSync(contentShellPath);
    return Promise.resolve(contentShellCommitPosition);
}

function downloadContentShell(commitPosition)
{
    var url = `http://commondatastorage.googleapis.com/chromium-browser-snapshots/${PLATFORM}/${commitPosition}/${CONTENT_SHELL_ZIP}`;
    console.log("Downloading content shell from:", url);
    console.log("NOTE: Download is ~35-65 MB depending on OS");
    return utils.fetch(url)
        .then(writeZip)
        .catch(onError);

    function writeZip(buffer)
    {
        console.log("Completed download of content shell");
        var contentShellZipPath = path.join(CACHE_PATH, commitPosition, CONTENT_SHELL_ZIP);
        fs.writeFileSync(contentShellZipPath, buffer);
        return contentShellZipPath;
    }

    function onError(error)
    {
        console.log(`Received error: ${error} trying to download content shell from url: ${url}`);
        throw new Error("Unable to download content shell");
    }
}

function extractContentShell(contentShellZipPath)
{
    console.log(`Extracting content shell zip: ${contentShellZipPath}`);
    var unzipScriptPath = path.resolve(__dirname, "unzip.py");
    var src = contentShellZipPath;
    var dest = path.resolve(path.dirname(src), "out");
    shell(`${PYTHON} ${unzipScriptPath} ${src} ${dest}`);
    fs.unlinkSync(src);
    var originalDirPath = path.resolve(dest, "content-shell");
    var newDirPath = path.resolve(dest, "Release");
    fs.renameSync(originalDirPath, newDirPath);
    fs.chmodSync(getContentShellBinaryPath(newDirPath), "755");
    if (process.platform === "darwin") {
        var helperPath = path.resolve(newDirPath, "Content Shell.app", "Contents", "Frameworks", "Content Shell Helper.app", "Contents", "MacOS", "Content Shell Helper");
        fs.chmodSync(helperPath, "755");
    }
    return dest;
}

function getContentShellBinaryPath(dirPath)
{
    if (process.platform === "linux") {
        return path.resolve(dirPath, "content_shell");
    }
    if (process.platform === "win32") {
        return path.resolve(dirPath, "content_shell.exe");
    }
    if (process.platform === "darwin") {
        return path.resolve(dirPath, "Content Shell.app", "Contents", "MacOS", "Content Shell");
    }
}

function runTests(buildDirectoryPath, useDebugDevtools)
{
    var testArgs = getInspectorTests().concat([
        "--no-pixel-tests",
        "--build-directory",
        buildDirectoryPath,
    ]);
    if (useDebugDevtools) {
        testArgs.push("--additional-driver-flag=--debug-devtools");
    } else {
        console.log("TIP: You can debug a test using: npm run debug-test inspector/test-name.html")
    }
    if (IS_DEBUG_ENABLED) {
        testArgs.push("--additional-driver-flag=--remote-debugging-port=9222");
        testArgs.push("--time-out-ms=6000000");
        console.log("\n=============================================");
        console.log("Go to: http://localhost:9222/");
        console.log("Click on link and in console execute: test()");
        console.log("=============================================\n");
    }
    var args = [BLINK_TEST_PATH].concat(testArgs).concat(getTestFlags());
    console.log(`Running layout tests with args: ${args}`);
    childProcess.spawn(PYTHON, args, {stdio: "inherit"});
}

function getTestFlags()
{
    var flagValues = Object.keys(Flags).map(key => Flags[key]);
    return process.argv
        .slice(2)
        .filter(arg => !utils.includes(flagValues, arg) && !utils.includes(arg, "inspector"));
}

function getInspectorTests()
{
    var specificTests = process.argv.filter(arg => utils.includes(arg, "inspector"));
    if (specificTests.length)
        return specificTests;
    return [
        "inspector*",
        "http/tests/inspector*",
    ];
}