"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var log4js = require("log4js");
var bundler_1 = require("./bundler/bundler");
var dependency_walker_1 = require("./bundler/dependency-walker");
var globals_1 = require("./bundler/globals");
var resolver_1 = require("./bundler/resolve/resolver");
var source_reader_1 = require("./bundler/resolve/source-reader");
var source_map_1 = require("./bundler/source-map");
var transformer_1 = require("./bundler/transformer");
var validator_1 = require("./bundler/validator");
var compiler_1 = require("./compiler/compiler");
var coverage_1 = require("./istanbul/coverage");
var threshold_1 = require("./istanbul/threshold");
var framework_1 = require("./karma/framework");
var preprocessor_1 = require("./karma/preprocessor");
var reporter_1 = require("./karma/reporter");
var configuration_1 = require("./shared/configuration");
var project_1 = require("./shared/project");
var loggers = {
    bundler: log4js.getLogger("bundler.karma-typescript"),
    compiler: log4js.getLogger("compiler.karma-typescript"),
    dependencyWalker: log4js.getLogger("dependency-walker.karma-typescript"),
    project: log4js.getLogger("project.karma-typescript"),
    resolver: log4js.getLogger("resolver.karma-typescript"),
    sourceMap: log4js.getLogger("source-map.karma-typescript"),
    sourceReader: log4js.getLogger("source-reader.karma-typescript"),
    threshold: log4js.getLogger("threshold.karma-typescript"),
    transformer: log4js.getLogger("transformer.karma-typescript"),
    validator: log4js.getLogger("validator.karma-typescript")
};
var configuration = new configuration_1.Configuration(loggers);
var project = new project_1.Project(configuration, loggers.project);
var dependencyWalker = new dependency_walker_1.DependencyWalker(loggers.dependencyWalker);
var compiler = new compiler_1.Compiler(configuration, loggers.compiler, project);
var coverage = new coverage_1.Coverage(configuration);
var transformer = new transformer_1.Transformer(configuration, loggers.transformer, project);
var threshold = new threshold_1.Threshold(configuration, loggers.threshold);
var validator = new validator_1.Validator(configuration, loggers.validator);
var sourceReader = new source_reader_1.SourceReader(configuration, loggers.sourceReader, transformer);
var resolver = new resolver_1.Resolver(configuration, dependencyWalker, loggers.resolver, sourceReader);
var globals = new globals_1.Globals(configuration, resolver);
var sourceMap = new source_map_1.SourceMap(configuration, loggers.sourceMap);
var bundler = new bundler_1.Bundler(configuration, dependencyWalker, globals, loggers.bundler, project, resolver, sourceMap, transformer, validator);
var framework = new framework_1.Framework(bundler, configuration, resolver);
var preprocessor = new preprocessor_1.Preprocessor(bundler, compiler, configuration, coverage);
var reporter = new reporter_1.Reporter(configuration, threshold);
module.exports = {
    "framework:karma-typescript": ["factory", framework.create],
    "preprocessor:karma-typescript": ["factory", preprocessor.create],
    "reporter:karma-typescript": ["type", reporter.create]
};
//# sourceMappingURL=index.js.map