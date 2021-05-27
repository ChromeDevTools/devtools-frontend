import * as ts from 'typescript';
import { Strategy, TemplatePart } from '../models';
export interface TypescriptStrategy extends Strategy<ts.Node> {
    walkChildNodes(node: ts.Node, visit: (node: ts.Node) => void): void;
    getHeadTemplatePart(node: ts.TemplateLiteral | ts.TemplateHead): TemplatePart;
    getMiddleTailTemplatePart(node: ts.TemplateMiddle | ts.TemplateTail): TemplatePart;
}
declare const _default: TypescriptStrategy;
export default _default;
