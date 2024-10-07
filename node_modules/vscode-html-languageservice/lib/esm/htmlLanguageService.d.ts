import { Scanner, HTMLDocument, CompletionConfiguration, ICompletionParticipant, HTMLFormatConfiguration, DocumentContext, IHTMLDataProvider, HTMLDataV1, LanguageServiceOptions, TextDocument, SelectionRange, WorkspaceEdit, Position, CompletionList, Hover, Range, SymbolInformation, TextEdit, DocumentHighlight, DocumentLink, FoldingRange } from './htmlLanguageTypes';
export * from './htmlLanguageTypes';
export interface LanguageService {
    setDataProviders(useDefaultDataProvider: boolean, customDataProviders: IHTMLDataProvider[]): void;
    createScanner(input: string, initialOffset?: number): Scanner;
    parseHTMLDocument(document: TextDocument): HTMLDocument;
    findDocumentHighlights(document: TextDocument, position: Position, htmlDocument: HTMLDocument): DocumentHighlight[];
    doComplete(document: TextDocument, position: Position, htmlDocument: HTMLDocument, options?: CompletionConfiguration): CompletionList;
    doComplete2(document: TextDocument, position: Position, htmlDocument: HTMLDocument, documentContext: DocumentContext, options?: CompletionConfiguration): Promise<CompletionList>;
    setCompletionParticipants(registeredCompletionParticipants: ICompletionParticipant[]): void;
    doHover(document: TextDocument, position: Position, htmlDocument: HTMLDocument): Hover | null;
    format(document: TextDocument, range: Range | undefined, options: HTMLFormatConfiguration): TextEdit[];
    findDocumentLinks(document: TextDocument, documentContext: DocumentContext): DocumentLink[];
    findDocumentSymbols(document: TextDocument, htmlDocument: HTMLDocument): SymbolInformation[];
    doTagComplete(document: TextDocument, position: Position, htmlDocument: HTMLDocument): string | null;
    getFoldingRanges(document: TextDocument, context?: {
        rangeLimit?: number;
    }): FoldingRange[];
    getSelectionRanges(document: TextDocument, positions: Position[]): SelectionRange[];
    doRename(document: TextDocument, position: Position, newName: string, htmlDocument: HTMLDocument): WorkspaceEdit | null;
    findMatchingTagPosition(document: TextDocument, position: Position, htmlDocument: HTMLDocument): Position | null;
    findOnTypeRenameRanges(document: TextDocument, position: Position, htmlDocument: HTMLDocument): Range[] | null;
}
export declare function getLanguageService(options?: LanguageServiceOptions): LanguageService;
export declare function newHTMLDataProvider(id: string, customData: HTMLDataV1): IHTMLDataProvider;
export declare function getDefaultHTMLDataProvider(): IHTMLDataProvider;
