"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectFiles = exports.project = void 0;
// Dependencies:
var fs = require("fs");
var path = require("path");
var typescript_1 = require("typescript");
function project(configFilePath) {
    var fullPath = findConfig(configFilePath);
    if (fullPath) {
        return getSourceFiles(fullPath);
    }
    return [];
}
exports.project = project;
function projectFiles(configFilePath) {
    var fullPath = findConfig(configFilePath);
    if (fullPath) {
        return parseConfig(configFilePath).fileNames;
    }
    return [];
}
exports.projectFiles = projectFiles;
function findConfig(configFilePath) {
    try {
        var fullPath = path.resolve(process.cwd(), configFilePath);
        // Throws if file does not exist:
        var stats = fs.statSync(fullPath);
        if (!stats.isDirectory()) {
            return fullPath;
        }
        var inDirectoryPath = path.join(fullPath, 'tsconfig.json');
        // Throws if file does not exist:
        fs.accessSync(inDirectoryPath);
        return inDirectoryPath;
    }
    catch (e) {
        return null;
    }
}
function getSourceFiles(configFilePath) {
    var parsed = parseConfig(configFilePath);
    var host = (0, typescript_1.createCompilerHost)(parsed.options, true);
    var program = (0, typescript_1.createProgram)(parsed.fileNames, parsed.options, host);
    return Array.from(program.getSourceFiles());
}
function parseConfig(configFilePath) {
    var config = (0, typescript_1.readConfigFile)(configFilePath, typescript_1.sys.readFile);
    var parseConfigHost = {
        fileExists: fs.existsSync,
        readDirectory: typescript_1.sys.readDirectory,
        readFile: function (file) { return fs.readFileSync(file, 'utf8'); },
        useCaseSensitiveFileNames: true
    };
    return (0, typescript_1.parseJsonConfigFileContent)(config.config, parseConfigHost, path.dirname(configFilePath), { noEmit: true });
}
//# sourceMappingURL=project.js.map