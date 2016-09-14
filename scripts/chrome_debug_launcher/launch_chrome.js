// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var childProcess = require("child_process");
var fs = require("fs");
var path = require("path");
var shell = childProcess.execSync;

var remoteDebuggingPort = parseInt(process.env.REMOTE_DEBUGGING_PORT, 10) || 9222;
var serverPort = parseInt(process.env.PORT, 10) || 8090;

var chromeArgs = [
    `--remote-debugging-port=${remoteDebuggingPort}`,
    `--no-first-run`,
    `http://localhost:${remoteDebuggingPort}#http://localhost:${serverPort}/front_end/inspector.html?experiments=true`,
    `https://devtools.chrome.com`
].concat(process.argv.slice(2));

if (process.platform === "win32") {
    launchChromeWindows();
    return;
}
if (process.platform === "darwin") {
    launchChromeMac();
    return;
}
if (process.platform === "linux") {
    launchChromeLinux();
    return;
}

throw new Error(`Unrecognized platform detected: ${process.platform}`);

function launchChromeWindows()
{
    var chromeCanaryPath;
    var suffix = "\\Google\\Chrome SxS\\Application\\chrome.exe";
    var prefixes = [process.env.LOCALAPPDATA, process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"]];
    for (var i = 0; i < prefixes.length; i++) {
        var prefix = prefixes[i];
        try {
            chromeCanaryPath = path.join(prefix, suffix);
            fs.accessSync(chromeCanaryPath);
            break;
        } catch (e) {
        }
    }
    launchChrome(chromeCanaryPath, chromeArgs);
}

function launchChromeMac()
{
    var lsregister = "/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/LaunchServices.framework/Versions/A/Support/lsregister";
    var chromeCanaryPath = shellOutput(`${lsregister} -dump | grep -i 'applications/google chrome canary.app$' | awk '{$1=""; print $0}' | head -n 1`);
    var chromeCanaryExecPath = `${chromeCanaryPath}/Contents/MacOS/Google Chrome Canary`;
    var tmpProfileDir = shellOutput("mktemp -d -t devtools");
    chromeArgs.push(`--user-data-dir=${tmpProfileDir}`);
    launchChrome(chromeCanaryExecPath, chromeArgs, () => shell(`rm -r ${tmpProfileDir}`));
}

function launchChromeLinux()
{
    var tmpProfileDir = shellOutput("mktemp -d -t devtools.XXXXXXXXXX");
    chromeArgs.push(`--user-data-dir=${tmpProfileDir}`);
    launchChrome(process.env.CHROMIUM_PATH, chromeArgs, () => shell(`rm -r ${tmpProfileDir}`));
}

function launchChrome(filePath, chromeArgs, cleanup)
{
    console.log(`Launching Chrome from ${filePath}`);
    console.log("Chrome args:", chromeArgs.join(" "), "\n");
    var child;
    try {
        child = childProcess.spawn(filePath, chromeArgs, {
            stdio: "ignore",
        });
    } catch (error) {
        onLaunchChromeError();
    }
    child.on("error", onLaunchChromeError);
    child.on("exit", onExit);
    function onExit(code)
    {
        if (cleanup)
            cleanup();
        console.log("Exited Chrome with code", code);
    }
}

function onLaunchChromeError()
{
    if (process.platform !== "linux") {
        console.log("Cannot find Chrome Canary on your computer");
        console.log("Install Chome Canary at:");
        console.log("https://www.google.com/chrome/browser/canary.html\n");
    } else {
        console.log("The environment variable CHROMIUM_PATH must be set to executable of a build of Chromium");
        console.log("If you do not have a recent build of chromium, you can get one from:");
        console.log("https://download-chromium.appspot.com/\n");
    }
}

function print(buffer)
{
    var string = buffer.toString();
    console.log(string);
    return string;
}

function shellOutput(command)
{
    return shell(command).toString().trim();
}
