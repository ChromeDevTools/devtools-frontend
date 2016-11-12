const fs = require('fs');

function depends(module, from)
{
    if (module === from)
        return true;
    var desc = descriptors[module];
    if (!desc)
        return false;
    for (var dep of desc.dependencies || []) {
        if (dep === from)
            return true;
        if (depends(dep, from))
            return true;
    }
    return false;
}

var map = new Map();
var sortedKeys;
var moduleNames = new Set();

String.prototype.replaceAll = function(a, b)
{
    var result = this;
    while (result.includes(a))
        result = result.replace(a, b);
    return result;
}

function read(filePath)
{
    var content = fs.readFileSync(filePath).toString();

    var oldModuleName = filePath.replace(/front_end\/([^/]+)\/.*/, "$1");
    if (oldModuleName.endsWith("_lazy"))
        oldModuleName = oldModuleName.substring(0, oldModuleName.length - "_lazy".length);

    var moduleName = oldModuleName;

    // if (oldModuleName === "accessibility")
    //     moduleName = "a11y";
    // if (oldModuleName === "resources")
    //     moduleName = "storage";
    // if (oldModuleName === "console")
    //     moduleName = "consoleUI";


    // if (oldModuleName === "timeline")
    //     moduleName = "timelineUI";
    // if (oldModuleName === "timeline_model")
    //     moduleName = "timeline";

    // moduleName = "com.google.chrome.devtools." + moduleName;
    // moduleName = "dt";// + moduleName;
    if (moduleName === "sdk" || moduleName == "ui")
        moduleName = moduleName.toUpperCase();
    // moduleName = "dt" + moduleName.substring(0, 1).toUpperCase() + moduleName.substring(1);
    moduleName = moduleName.split("_").map(a => a.substring(0, 1).toUpperCase() + a.substring(1)).join("");
    if (moduleName.includes("/"))
        return;
    moduleNames.add(moduleName);

    var lines = content.split("\n");
    for (var line of lines) {
        var line = line.trim();
        if (!line.startsWith("WebInspector."))
            continue;
        var match = line.match(/^(WebInspector.[a-z_A-Z0-9]+)\s*(\=[^,}]|[;])/) || line.match(/^(WebInspector.[a-z_A-Z0-9]+)\s*\=$/);
        if (!match)
            continue;
        var name = match[1];
        if (name.split(".").length !== 2)
            continue;
        var weight = line.endsWith(name + ";") ? 2 : 1;

        var newName;
        var shortName = newName;

        newName = name.replace("WebInspector.", moduleName + ".");
        shortName = newName.replace(moduleName + ".", "");
        var existing = map.get(name);
        if (existing && existing.weight > weight)
            continue;
        if (existing && existing.weight === weight && newName !== existing.name)
            console.log("Conflict: " + newName + " vs " + existing.name + " " + weight);
        map.set(name, {name:newName, weight});
    }
}


function write(filePath)
{
    var content = fs.readFileSync(filePath).toString();
    var newContent = content;
    for (var key of sortedKeys)
        newContent = newContent.replaceAll(key, map.get(key).name);
    newContent = newContent.replaceAll("UI._focusChanged.bind(WebInspector", "UI._focusChanged.bind(UI");
    newContent = newContent.replaceAll("UI._windowFocused.bind(WebInspector", "UI._windowFocused.bind(UI");
    newContent = newContent.replaceAll("UI._windowBlurred.bind(WebInspector", "UI._windowBlurred.bind(UI");
    newContent = newContent.replaceAll("UI._focusChanged.bind(WebInspector", "UI._focusChanged.bind(UI");
    newContent = newContent.replaceAll("UI._focusChanged.bind(WebInspector", "UI._focusChanged.bind(UI");
    newContent = newContent.replaceAll("Components.reload.bind(WebInspector", "Components.reload.bind(Components");
    newContent = newContent.replaceAll("window.opener.WebInspector['AdvancedApp']['_instance']()", "window.opener['Emulation']['AdvancedApp']['_instance']()");
    newContent = newContent.replaceAll("if (window['WebInspector'][", "if (window['WebInspector'] && window['WebInspector'][");

    if (content !== newContent)
        fs.writeFileSync(filePath, newContent);
}

function walkSync(currentDirPath, process, json) {
    var fs = require('fs'),
        path = require('path');
    fs.readdirSync(currentDirPath).forEach(function (name) {
        var filePath = path.join(currentDirPath, name);
        var stat = fs.statSync(filePath);
        if (stat.isFile() && (filePath.endsWith(".js") || filePath.endsWith(".html") || filePath.endsWith(".xhtml") || filePath.endsWith("-expected.txt") || (json && filePath.endsWith(".json")))) {
            if (filePath.includes("ExtensionAPI.js"))
                return;
            if (filePath.includes("externs.js"))
                return;            
            if (filePath.includes("eslint") || filePath.includes("lighthouse-background.js") || filePath.includes("/cm/") || filePath.includes("/xterm.js/") || filePath.includes("/acorn/") || filePath.includes("/gonzales-scss"))
                return;
            if (filePath.includes("/cm_modes/") && !filePath.includes("DefaultCodeMirror") && !filePath.includes("module.json"))
                return;
            process(filePath);
        } else if (stat.isDirectory()) {
            walkSync(filePath, process, json);
        }
    });
}

walkSync('front_end', read);
sortedKeys = Array.from(map.keys());
sortedKeys.sort((a, b) => (b.length - a.length) || a.localeCompare(b));
for (var key of sortedKeys)
    console.log(key + " => " + map.get(key).name);
walkSync('front_end', write, true);

walkSync('../../LayoutTests/http/tests/inspector', write, false);
walkSync('../../LayoutTests/http/tests/inspector-enabled', write, false);
walkSync('../../LayoutTests/http/tests/inspector-protocol', write, false);
walkSync('../../LayoutTests/http/tests/inspector-unit', write, false);
walkSync('../../LayoutTests/inspector', write, false);
walkSync('../../LayoutTests/inspector-enabled', write, false);
walkSync('../../LayoutTests/inspector-protocol', write, false);
