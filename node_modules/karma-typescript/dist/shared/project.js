"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var glob = require("glob");
var lodash = require("lodash");
var path = require("path");
var ts = require("typescript");
var PathTool = require("./path-tool");
var extender_1 = require("./extender");
var EventType;
(function (EventType) {
    EventType[EventType["FileSystemChanged"] = 0] = "FileSystemChanged";
    EventType[EventType["FileContentChanged"] = 1] = "FileContentChanged";
})(EventType = exports.EventType || (exports.EventType = {}));
var Project = /** @class */ (function () {
    function Project(config, log) {
        this.config = config;
        this.log = log;
        this.karmaFiles = [];
    }
    Project.prototype.getKarmaFiles = function () {
        return this.karmaFiles;
    };
    Project.prototype.getTsconfig = function () {
        return this.tsconfig;
    };
    Project.prototype.hasCompatibleModuleKind = function () {
        return this.tsconfig.options.module === ts.ModuleKind.CommonJS;
    };
    Project.prototype.getModuleKind = function () {
        return ts.ModuleKind[this.tsconfig.options.module];
    };
    Project.prototype.handleFileEvent = function () {
        var oldKarmaFiles = lodash.cloneDeep(this.karmaFiles || []);
        this.expandKarmaFilePatterns();
        if (!lodash.isEqual(oldKarmaFiles, this.karmaFiles)) {
            this.log.debug("File system changed, resolving tsconfig");
            this.resolveTsConfig();
            return EventType.FileSystemChanged;
        }
        return EventType.FileContentChanged;
    };
    Project.prototype.expandKarmaFilePatterns = function () {
        var _this = this;
        var files = this.config.karma.files;
        this.karmaFiles.length = 0;
        files.forEach(function (file) {
            var g = new glob.Glob(path.normalize(file.pattern), {
                cwd: "/",
                follow: true,
                nodir: true,
                sync: true
            });
            Array.prototype.push.apply(_this.karmaFiles, g.found);
        });
    };
    Project.prototype.resolveTsConfig = function () {
        var configFileName = this.getTsconfigFilename();
        var configFileJson = this.getConfigFileJson(configFileName);
        var existingOptions = this.getExistingOptions();
        this.tsconfig = this.parseConfigFileJson(configFileName, configFileJson, existingOptions);
    };
    Project.prototype.getTsconfigFilename = function () {
        var configFileName = "";
        if (this.config.tsconfig) {
            configFileName = path.join(this.config.karma.basePath, this.config.tsconfig);
            if (!ts.sys.fileExists(configFileName)) {
                this.log.warn("Tsconfig '%s' configured in karmaTypescriptConfig.tsconfig does not exist", configFileName);
                configFileName = "";
            }
        }
        return PathTool.fixWindowsPath(configFileName);
    };
    Project.prototype.getExistingOptions = function () {
        var compilerOptions = lodash.cloneDeep(this.config.compilerOptions);
        this.convertOptions(compilerOptions);
        return compilerOptions;
    };
    Project.prototype.getConfigFileJson = function (configFileName) {
        var configFileJson;
        if (ts.sys.fileExists(configFileName)) {
            this.log.debug("Using %s", configFileName);
            if (ts.parseConfigFile) { // v1.6
                configFileJson = ts.readConfigFile(configFileName);
            }
            else if (ts.parseConfigFileTextToJson) { // v1.7+
                var configFileText = ts.sys.readFile(configFileName);
                configFileJson = ts.parseConfigFileTextToJson(configFileName, configFileText);
            }
            else {
                this.log.error("karma-typescript doesn't know how to use Typescript %s :(", ts.version);
                process.exit(1);
            }
        }
        else {
            configFileJson = {
                config: lodash.cloneDeep(this.config.defaultTsconfig)
            };
            this.log.debug("Fallback to default compiler options");
        }
        this.log.debug("Resolved configFileJson:\n", JSON.stringify(configFileJson, null, 3));
        return configFileJson;
    };
    Project.prototype.parseConfigFileJson = function (configFileName, configFileJson, existingOptions) {
        var tsconfig;
        var basePath = this.resolveBasepath(configFileName);
        if (existingOptions && existingOptions.baseUrl === ".") {
            existingOptions.baseUrl = basePath;
        }
        extender_1.Extender.extend("include", configFileJson.config, this.config);
        extender_1.Extender.extend("exclude", configFileJson.config, this.config);
        if (ts.parseConfigFile) {
            tsconfig = ts.parseConfigFile(configFileJson.config, ts.sys, basePath);
            tsconfig.options = ts.extend(existingOptions, tsconfig.options);
        }
        else if (ts.parseJsonConfigFileContent) {
            tsconfig = ts.parseJsonConfigFileContent(configFileJson.config, ts.sys, basePath, existingOptions, configFileName);
        }
        if (!tsconfig) {
            this.log.error("karma-typescript doesn't know how to use Typescript %s :(", ts.version);
            process.exit(1);
        }
        delete tsconfig.options.outDir;
        delete tsconfig.options.outFile;
        tsconfig.options.suppressOutputPathCheck = true;
        this.assertModuleKind(tsconfig);
        this.log.debug("Resolved tsconfig:\n", JSON.stringify(tsconfig, null, 3));
        return tsconfig;
    };
    Project.prototype.assertModuleKind = function (tsconfig) {
        if (typeof tsconfig.options.module !== "number" &&
            tsconfig.options.target === ts.ScriptTarget.ES5) {
            tsconfig.options.module = ts.ModuleKind.CommonJS;
        }
    };
    Project.prototype.resolveBasepath = function (configFileName) {
        if (!configFileName) {
            return this.config.karma.basePath;
        }
        var relativePath = path.relative(this.config.karma.basePath, configFileName);
        var absolutePath = path.join(this.config.karma.basePath, relativePath);
        return path.dirname(absolutePath);
    };
    Project.prototype.convertOptions = function (options) {
        var _this = this;
        var names = ["jsx", "lib", "module", "moduleResolution", "target"];
        if (options) {
            ts.optionDeclarations.forEach(function (declaration) {
                if (names.indexOf(declaration.name) !== -1) {
                    _this.setOptions(options, declaration);
                }
            });
        }
    };
    Project.prototype.setOptions = function (options, declaration) {
        var name = declaration.name;
        if (options[name]) {
            if (Array.isArray(options[name])) {
                options[name].forEach(function (option, index) {
                    var key = option.toLowerCase();
                    options[name][index] = lodash.isMap(declaration.element.type) ?
                        declaration.element.type.get(key) : declaration.type[key];
                });
            }
            else {
                var key = options[name].toLowerCase();
                options[name] = lodash.isMap(declaration.type) ?
                    declaration.type.get(key) : declaration.type[key];
            }
        }
    };
    return Project;
}());
exports.Project = Project;
//# sourceMappingURL=project.js.map