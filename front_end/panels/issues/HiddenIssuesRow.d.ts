import '../../ui/components/adorners/adorners.js';
import * as UI from '../../ui/legacy/legacy.js';
interface ViewInput {
    count: number;
    onUnhideAllIssues: () => void;
}
type ViewOutput = unknown;
type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare class HiddenIssuesRow extends UI.TreeOutline.TreeElement {
    #private;
    constructor(view?: View);
    update(count: number): void;
}
export {};
