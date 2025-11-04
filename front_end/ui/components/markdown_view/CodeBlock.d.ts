import '../../../ui/legacy/legacy.js';
import * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';
export interface Citation {
    index: Number;
    clickHandler: () => void;
}
export declare function languageFromToken(lang: string): Promise<CodeMirror.LanguageSupport>;
export declare class CodeBlock extends HTMLElement {
    #private;
    connectedCallback(): void;
    set code(value: string);
    get code(): string;
    set codeLang(value: string);
    set timeout(value: number);
    set displayNotice(value: boolean);
    set header(header: string);
    set showCopyButton(show: boolean);
    set citations(citations: Citation[]);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-code-block': CodeBlock;
    }
}
