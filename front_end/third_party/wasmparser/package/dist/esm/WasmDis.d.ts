import { BinaryReader } from "./WasmParser.js";
export interface IExportMetadata {
    getFunctionExportNames(index: number): string[];
    getGlobalExportNames(index: number): string[];
    getMemoryExportNames(index: number): string[];
    getTableExportNames(index: number): string[];
}
export interface INameResolver {
    getTypeName(index: number, isRef: boolean): string;
    getTableName(index: number, isRef: boolean): string;
    getMemoryName(index: number, isRef: boolean): string;
    getGlobalName(index: number, isRef: boolean): string;
    getFunctionName(index: number, isImport: boolean, isRef: boolean): string;
    getVariableName(funcIndex: number, index: number, isRef: boolean): string;
    getLabel(index: number): string;
}
export declare class DefaultNameResolver implements INameResolver {
    getTypeName(index: number, isRef: boolean): string;
    getTableName(index: number, isRef: boolean): string;
    getMemoryName(index: number, isRef: boolean): string;
    getGlobalName(index: number, isRef: boolean): string;
    getFunctionName(index: number, isImport: boolean, isRef: boolean): string;
    getVariableName(funcIndex: number, index: number, isRef: boolean): string;
    getLabel(index: number): string;
}
export declare class DevToolsNameResolver extends DefaultNameResolver {
    private readonly _functionNames;
    private readonly _localNames;
    private readonly _memoryNames;
    private readonly _tableNames;
    private readonly _globalNames;
    constructor(functionNames: string[], localNames: string[][], memoryNames: string[], tableNames: string[], globalNames: string[]);
    getTableName(index: number, isRef: boolean): string;
    getMemoryName(index: number, isRef: boolean): string;
    getGlobalName(index: number, isRef: boolean): string;
    getFunctionName(index: number, isImport: boolean, isRef: boolean): string;
    getVariableName(funcIndex: number, index: number, isRef: boolean): string;
}
export declare class NumericNameResolver implements INameResolver {
    getTypeName(index: number, isRef: boolean): string;
    getTableName(index: number, isRef: boolean): string;
    getMemoryName(index: number, isRef: boolean): string;
    getGlobalName(index: number, isRef: boolean): string;
    getFunctionName(index: number, isImport: boolean, isRef: boolean): string;
    getVariableName(funcIndex: number, index: number, isRef: boolean): string;
    getLabel(index: number): string;
}
export declare enum LabelMode {
    Depth = 0,
    WhenUsed = 1,
    Always = 2
}
export interface IFunctionBodyOffset {
    start?: number;
    end?: number;
}
export interface IDisassemblerResult {
    lines: Array<string>;
    offsets?: Array<number>;
    done: boolean;
    functionBodyOffsets?: Array<IFunctionBodyOffset>;
}
export declare class WasmDisassembler {
    private _lines;
    private _offsets;
    private _buffer;
    private _types;
    private _funcIndex;
    private _funcTypes;
    private _importCount;
    private _globalCount;
    private _memoryCount;
    private _tableCount;
    private _initExpression;
    private _backrefLabels;
    private _labelIndex;
    private _indent;
    private _indentLevel;
    private _addOffsets;
    private _skipTypes;
    private _done;
    private _currentPosition;
    private _nameResolver;
    private _exportMetadata;
    private _labelMode;
    private _functionBodyOffsets;
    private _currentFunctionBodyOffset;
    private _logFirstInstruction;
    constructor();
    private _reset;
    get addOffsets(): boolean;
    set addOffsets(value: boolean);
    get skipTypes(): boolean;
    set skipTypes(skipTypes: boolean);
    get labelMode(): LabelMode;
    set labelMode(value: LabelMode);
    get exportMetadata(): IExportMetadata;
    set exportMetadata(exportMetadata: IExportMetadata);
    get nameResolver(): INameResolver;
    set nameResolver(resolver: INameResolver);
    private appendBuffer;
    private newLine;
    private logStartOfFunctionBodyOffset;
    private logEndOfFunctionBodyOffset;
    private printFuncType;
    private printBlockType;
    private printString;
    private useLabel;
    private printOperator;
    private printImportSource;
    private increaseIndent;
    private decreaseIndent;
    disassemble(reader: BinaryReader): string;
    getResult(): IDisassemblerResult;
    disassembleChunk(reader: BinaryReader, offsetInModule?: number): boolean;
}
export declare class NameSectionReader {
    private _done;
    private _functionsCount;
    private _functionImportsCount;
    private _functionNames;
    private _functionLocalNames;
    private _hasNames;
    constructor();
    read(reader: BinaryReader): boolean;
    hasValidNames(): boolean;
    getNameResolver(): INameResolver;
}
export declare class DevToolsNameGenerator {
    private _done;
    private _functionImportsCount;
    private _memoryImportsCount;
    private _tableImportsCount;
    private _globalImportsCount;
    private _functionNames;
    private _functionLocalNames;
    private _memoryNames;
    private _tableNames;
    private _globalNames;
    private _functionExportNames;
    private _globalExportNames;
    private _memoryExportNames;
    private _tableExportNames;
    private _addExportName;
    private _setName;
    read(reader: BinaryReader): boolean;
    getExportMetadata(): IExportMetadata;
    getNameResolver(): INameResolver;
}
