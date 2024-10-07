"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDeclarationsInFile = void 0;
var web_component_analyzer_1 = require("web-component-analyzer");
function getDeclarationsInFile(definition, sourceFile) {
    var declarations = new Set();
    emitDeclarationsInFile(definition, sourceFile, function (decl) { return declarations.add(decl); });
    return Array.from(declarations);
}
exports.getDeclarationsInFile = getDeclarationsInFile;
function emitDeclarationsInFile(definition, sourceFile, emit) {
    var declaration = definition.declaration;
    if (declaration == null) {
        return;
    }
    if (declaration.sourceFile.fileName === sourceFile.fileName) {
        if (emit(declaration) === false) {
            return;
        }
    }
    (0, web_component_analyzer_1.visitAllHeritageClauses)(declaration, function (clause) {
        if (clause.declaration && clause.declaration.sourceFile === sourceFile) {
            if (emit(clause.declaration) === false) {
                return;
            }
        }
    });
}
