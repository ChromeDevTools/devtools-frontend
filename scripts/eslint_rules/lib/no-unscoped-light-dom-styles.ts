// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESLint, TSESTree} from '@typescript-eslint/utils';
import * as fs from 'node:fs';
import * as path from 'node:path';
import postcss, {type Container} from 'postcss';
import ts from 'typescript';

import {isLitHtmlTemplateCall} from './utils/lit.ts';
import {createRule} from './utils/ruleCreator.ts';

const ALLOWED_AT_RULES = new Set([
  'keyframes',
  'property',
  'font-face',
  'layer',
  'import',
  'charset',
  'counter-style',
  'font-feature-values',
  'font-palette-values',
  'view-transition',
  'position-try',
]);

const cssCache = new Map<string, 'full'|'partial'|'none'|'empty'|'missing'>();

export function cssScopeStatus(file: string): 'full'|'partial'|'none'|'empty'|'missing' {
  const cached = cssCache.get(file);
  if (cached !== undefined) {
    return cached;
  }
  let status: 'full'|'partial'|'none'|'empty'|'missing' = 'missing';
  if (fs.existsSync(file)) {
    try {
      const root = postcss.parse(fs.readFileSync(file, 'utf8'));
      let scoped = 0;
      let unscoped = 0;
      const visit = (container: Container) => {
        container.each(node => {
          if (node.type === 'rule' || node.type === 'decl') {
            unscoped++;
          } else if (node.type === 'atrule') {
            if (node.name === 'scope') {
              scoped++;
            } else if (!ALLOWED_AT_RULES.has(node.name) && 'nodes' in node && node.nodes) {
              visit(node as Container);  // @media, @supports, @container, ...
            }
          }
        });
      };
      visit(root);
      status = unscoped ? (scoped ? 'partial' : 'none') : (scoped ? 'full' : 'empty');
    } catch {
      status = 'missing';
    }
  }
  cssCache.set(file, status);
  return status;
}

export type MessageIds =|'unscopedSheet'|'unscopedSharedSheet'|'unscopedInlineStyle'|'staleBurndownEntry';

export type Options = [{
  burndown?: string[],
}];

type RuleContext = TSESLint.RuleContext<MessageIds, Options>;

function sourceText(context: RuleContext, node?: TSESTree.Node): string {
  return node ? context.sourceCode.getText(node) : context.sourceCode.getText();
}

function memberChainText(node: TSESTree.Node): string|null {
  if (node.type === 'Identifier') {
    return node.name;
  }
  if (node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier') {
    const obj = memberChainText(node.object);
    return obj ? `${obj}.${node.property.name}` : null;
  }
  return node.type === 'ThisExpression' ? 'this' : null;
}

function getRootIdentifier(node: TSESTree.Node): TSESTree.Identifier|null {
  let curr = node;
  while (curr.type === 'MemberExpression') {
    curr = curr.object;
  }
  return curr.type === 'Identifier' ? curr : null;
}

function enclosingClass(node: TSESTree.Node): TSESTree.ClassDeclaration|TSESTree.ClassExpression|null {
  for (let n: TSESTree.Node|undefined = node.parent; n; n = n.parent) {
    if (n.type === 'ClassDeclaration' || n.type === 'ClassExpression') {
      return n;
    }
  }
  return null;
}

function enclosingTopLevelName(node: TSESTree.Node): string|null {
  let last = node;
  for (let n = node.parent; n && n.type !== 'Program'; n = n.parent) {
    last = n;
  }
  let decl: TSESTree.Node|undefined = last;
  if ((decl.type === 'ExportNamedDeclaration' || decl.type === 'ExportDefaultDeclaration') && decl.declaration) {
    decl = decl.declaration;
  }
  if (decl?.type === 'FunctionDeclaration' && decl.id) {
    return decl.id.name;
  }
  if (decl?.type === 'VariableDeclaration') {
    const vdecl =
        decl.declarations.find(d => node.range[0] >= d.range[0] && node.range[1] <= d.range[1]) ?? decl.declarations[0];
    return vdecl?.id.type === 'Identifier' ? vdecl.id.name : null;
  }
  return null;
}

function findSuperCall(ctor: TSESTree.MethodDefinition): TSESTree.CallExpression|null {
  if (ctor.value.body?.type === 'BlockStatement') {
    for (const stmt of ctor.value.body.body) {
      if (stmt.type === 'ExpressionStatement' && stmt.expression.type === 'CallExpression' &&
          stmt.expression.callee.type === 'Super') {
        return stmt.expression;
      }
    }
  }
  return null;
}

function getClassLikeDeclaration(symbol: ts.Symbol|undefined, checker: ts.TypeChecker): ts.ClassLikeDeclaration|null {
  if (!symbol) {
    return null;
  }
  if (symbol.flags & ts.SymbolFlags.Alias) {
    symbol = checker.getAliasedSymbol(symbol);
  }
  const decls = symbol.getDeclarations();
  return (decls?.find(d => ts.isClassDeclaration(d) || ts.isClassExpression(d)) as ts.ClassLikeDeclaration) ?? null;
}

function getSuperClassDeclFromExpr(expr: ts.Expression, checker: ts.TypeChecker): ts.ClassLikeDeclaration|null {
  let symbol = checker.getSymbolAtLocation(expr);
  if (!symbol) {
    const type = checker.getTypeAtLocation(expr);
    symbol = type.getSymbol() ?? type.aliasSymbol;
  }
  return getClassLikeDeclaration(symbol, checker);
}

function getSuperClassDecl(decl: ts.ClassLikeDeclaration, checker: ts.TypeChecker): ts.ClassLikeDeclaration|null {
  const heritage = decl.heritageClauses?.find(h => h.token === ts.SyntaxKind.ExtendsKeyword);
  const expr = heritage?.types[0]?.expression;
  return expr ? getSuperClassDeclFromExpr(expr, checker) : null;
}

const baseClassShadowCache = new Map<ts.ClassLikeDeclaration, boolean>();

function isShadowDomBaseClass(decl: ts.ClassLikeDeclaration|null, checker: ts.TypeChecker,
                              seen = new Set<ts.ClassLikeDeclaration>()): boolean {
  if (!decl) {
    return false;
  }
  const cached = baseClassShadowCache.get(decl);
  if (cached !== undefined) {
    return cached;
  }
  if (seen.has(decl)) {
    return false;
  }
  seen.add(decl);

  const name = decl.name?.text ?? '';

  // Stop at UI.Widget.Widget / VBox / HBox (Light unless options say otherwise).
  if ((name === 'Widget' || name === 'VBox' || name === 'HBox') &&
      decl.getSourceFile().fileName.endsWith('Widget.ts')) {
    baseClassShadowCache.set(decl, false);
    return false;
  }

  // Stop at non-widget bases (e.g. declaration files / external libraries).
  if (decl.getSourceFile().isDeclarationFile) {
    baseClassShadowCache.set(decl, false);
    return false;
  }

  if (/^(GlassPane|DialogBase|Dialog|TreeOutlineInShadow)$/.test(name)) {
    baseClassShadowCache.set(decl, true);
    return true;
  }

  const text = decl.getText();
  if (/this\.attachShadow\(|createShadowRootWithCoreStyles\(this\b/.test(text)) {
    baseClassShadowCache.set(decl, true);
    return true;
  }

  const ctor = decl.members.find(m => ts.isConstructorDeclaration(m) && Boolean(m.body));
  if (ctor && ts.isConstructorDeclaration(ctor) && ctor.body) {
    for (const stmt of ctor.body.statements) {
      if (ts.isExpressionStatement(stmt) && ts.isCallExpression(stmt.expression) &&
          stmt.expression.expression.kind === ts.SyntaxKind.SuperKeyword) {
        const superArgs = stmt.expression.arguments;
        const superArgsText = superArgs.map(a => a.getText()).join(', ');
        if (/useShadowDom:\s*(true|'pure')/.test(superArgsText)) {
          baseClassShadowCache.set(decl, true);
          return true;
        }
        if (superArgs.length > 0 && superArgs[superArgs.length - 1].getText() === 'true') {
          const superDecl = getSuperClassDecl(decl, checker);
          if (superDecl && /Panel$/.test(superDecl.name?.text ?? '')) {
            baseClassShadowCache.set(decl, true);
            return true;
          }
        }
        break;
      }
    }
  }

  const superDecl = getSuperClassDecl(decl, checker);
  if (superDecl) {
    const isShadow = isShadowDomBaseClass(superDecl, checker, seen);
    baseClassShadowCache.set(decl, isShadow);
    return isShadow;
  }

  baseClassShadowCache.set(decl, false);
  return false;
}

function renderTargetIsShadow(templateNode: TSESTree.TaggedTemplateExpression, context: RuleContext): boolean {
  const p = templateNode.parent;
  return Boolean(
      p && p.type === 'CallExpression' && p.arguments[0] === templateNode && p.arguments[1] &&
          /shadow/i.test(sourceText(context, p.arguments[1])),
  );
}

function isInertTemplateValue(templateNode: TSESTree.TaggedTemplateExpression): boolean {
  const p = templateNode.parent;
  if (p && p.type === 'TemplateLiteral') {
    const idx = p.expressions.indexOf(templateNode);
    return idx >= 0 && /\.template\s*=\s*$/.test(p.quasis[idx].value.raw);
  }
  return false;
}

interface Finding {
  node: TSESTree.Node;
  messageId: 'unscopedSheet'|'unscopedSharedSheet'|'unscopedInlineStyle';
  data?: Record<string, string>;
  template?: TSESTree.TaggedTemplateExpression;
}

interface ClassInfo {
  node: TSESTree.ClassDeclaration|TSESTree.ClassExpression;
  name: string;
  mode: 'light'|'shadow'|'inherited'|'unknown';
  refs: Set<string>;
  superClass: string|null;
}

export default createRule<Options, MessageIds>({
  name: 'no-unscoped-light-dom-styles',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that Light DOM widgets wrap stylesheets in @scope',
      category: 'Possible Errors',
    },
    schema: [
      {
        type: 'object',
        properties: {
          burndown: {
            type: 'array',
            items: {type: 'string'},
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      unscopedSheet:
          '\'{{sheet}}\' is injected into Light DOM but has style rules outside of \'@scope\'. Wrap them in \'@scope to (devtools-widget > *) { ... }\' and use \':scope\' instead of \':host\' (see docs/ui_engineering.md#styling).',
      unscopedSharedSheet:
          'Shared stylesheet \'{{name}}\' is injected into Light DOM without \'@scope\'. Remove it if the document already provides it, or wrap it inline: \'<style>@scope to (devtools-widget > *) { ${...} }</style>\'.',
      unscopedInlineStyle:
          'Inline <style> text in a Light DOM widget must be wrapped in \'@scope to (devtools-widget > *) { ... }\'.',
      staleBurndownEntry:
          '\'{{file}}\' has no unscoped Light DOM styles anymore. Remove it from the \'burndown\' list of \'@devtools/no-unscoped-light-dom-styles\' in eslint.config.mjs.',
    },
  },
  defaultOptions: [{}],
  create: function(context, [options]) {
    const filename = context.filename;
    const parserServices = context.sourceCode.parserServices;
    const checker = (parserServices?.program && parserServices.esTreeNodeToTSNodeMap) ?
        parserServices.program.getTypeChecker() :
        null;
    const cssImports = new Map<string, string>();
    const namespaceImports = new Set<string>();
    const classes: ClassInfo[] = [];
    const topLevel = new Map<string, Set<string>>();
    const findings: Finding[] = [];
    const fileText = context.sourceCode.getText();
    const fileShadowSignal =
        /attachShadow\(|useShadowDom:\s*(true|'pure')|createShadowRootWithCoreStyles\(|super\([^)]*,\s*true\s*\)/.test(
            fileText);

    const burndownSet = new Set(
        (options?.burndown ??
         []).map(entry => path.relative(context.cwd, path.resolve(context.cwd, entry)).replaceAll('\\', '/')),
    );

    function extractUnscopedStyle(node: TSESTree.Node): {
      messageId: 'unscopedSheet'|'unscopedSharedSheet',
      data: Record<string, string>,
    }|null {
      if (node.type === 'Identifier') {
        const css = cssImports.get(node.name);
        if (css) {
          const status = cssScopeStatus(css);
          if (status === 'none' || status === 'partial') {
            return {messageId: 'unscopedSheet', data: {sheet: node.name}};
          }
        }
      } else if (node.type === 'MemberExpression') {
        const root = getRootIdentifier(node);
        if (root && namespaceImports.has(root.name)) {
          const chain = memberChainText(node);
          if (chain) {
            return {messageId: 'unscopedSharedSheet', data: {name: chain}};
          }
        }
      }
      return null;
    }

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (node.specifiers) {
          for (const s of node.specifiers) {
            if (s.type === 'ImportNamespaceSpecifier') {
              namespaceImports.add(s.local.name);
            }
          }
        }
        const spec = node.source.value;
        if (typeof spec !== 'string' || !spec.endsWith('.css.js') || !spec.startsWith('.')) {
          return;
        }
        const def = node.specifiers.find(s => s.type === 'ImportDefaultSpecifier');
        if (def) {
          cssImports.set(def.local.name, path.resolve(path.dirname(filename), spec).replace(/\.js$/, ''));
        }
      },
      TaggedTemplateExpression(node: TSESTree.TaggedTemplateExpression) {
        if (!isLitHtmlTemplateCall(node)) {
          return;
        }
        const {quasis, expressions} = node.quasi;
        let inStyle = false;
        let styleHasScopeText = false;
        let styleStatic = '';
        let pending: Finding[] = [];
        const flush = (endNode: TSESTree.Node) => {
          if (styleStatic.trim() && !styleHasScopeText && /\{/.test(styleStatic)) {
            findings.push({node: endNode, messageId: 'unscopedInlineStyle', template: node});
          }
          if (!styleHasScopeText) {
            for (const e of pending) {
              findings.push({...e, template: node});
            }
          }
          styleStatic = '';
          styleHasScopeText = false;
          pending = [];
        };
        for (let i = 0; i < quasis.length; i++) {
          let text = quasis[i].value.raw;
          while (text.length) {
            if (inStyle) {
              const end = text.indexOf('</style>');
              const chunk = end === -1 ? text : text.substring(0, end);
              styleStatic += chunk;
              if (chunk.includes('@scope')) {
                styleHasScopeText = true;
              }
              if (end === -1) {
                text = '';
              } else {
                inStyle = false;
                flush(quasis[i]);
                text = text.substring(end + 8);
              }
            } else {
              const m = text.match(/<style(?:\s[^>]*)?>/);
              if (!m) {
                text = '';
              } else {
                inStyle = true;
                const matchIndex = m.index ?? 0;
                text = text.substring(matchIndex + m[0].length);
              }
            }
          }
          const expr = expressions[i];
          if (expr && inStyle) {
            const extracted = extractUnscopedStyle(expr);
            if (extracted) {
              pending.push({node: expr, ...extracted});
            }
          }
        }
        if (inStyle) {
          flush(quasis[quasis.length - 1]);
        }
      },
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;
        if ((callee.type === 'Identifier' && callee.name === 'appendStyle') ||
            (callee.type === 'MemberExpression' && callee.property.type === 'Identifier' &&
             callee.property.name === 'appendStyle')) {
          const targetNode = node.arguments[0];
          const receiver = targetNode ? memberChainText(targetNode) : null;
          if (receiver === 'this.element' || receiver === 'this.contentElement' || receiver === 'this.parentElement') {
            for (const arg of node.arguments.slice(1)) {
              const extracted = extractUnscopedStyle(arg);
              if (extracted) {
                findings.push({node: arg, ...extracted});
              }
            }
          }
        }
        if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier' &&
            callee.property.name === 'registerRequiredCSS' && callee.object.type === 'ThisExpression') {
          for (const arg of node.arguments) {
            const extracted = extractUnscopedStyle(arg);
            if (extracted) {
              findings.push({node: arg, ...extracted});
            }
          }
        }
      },
      'ClassDeclaration, ClassExpression'(node: TSESTree.ClassDeclaration|TSESTree.ClassExpression) {
        const text = sourceText(context, node.body);
        let mode: 'light'|'shadow'|'inherited' = 'inherited';
        const ctor = node.body.body.find(m => m.type === 'MethodDefinition' && m.kind === 'constructor' &&
                                             Boolean(m.value.body)) as TSESTree.MethodDefinition |
            undefined;
        const superCall = ctor ? findSuperCall(ctor) : null;

        let hasBaseInChainShadow = false;
        if (checker && node.superClass && parserServices?.esTreeNodeToTSNodeMap?.has(node.superClass)) {
          const tsSuperNode = parserServices.esTreeNodeToTSNodeMap.get(node.superClass);
          const baseDecl = getSuperClassDeclFromExpr(tsSuperNode as ts.Expression, checker);
          hasBaseInChainShadow = isShadowDomBaseClass(baseDecl, checker);
        }

        if ((node.id?.name && /^(GlassPane|DialogBase|Dialog|TreeOutlineInShadow)$/.test(node.id.name)) ||
            (node.superClass &&
             /(GlassPane|DialogBase|Dialog|TreeOutlineInShadow)$/.test(sourceText(context, node.superClass)))) {
          mode = 'shadow';
        } else if (superCall && /useShadowDom:\s*(true|'pure')/.test(sourceText(context, superCall))) {
          mode = 'shadow';
        } else if (superCall && node.superClass && /Panel$/.test(sourceText(context, node.superClass)) &&
                   superCall.arguments[superCall.arguments.length - 1]?.type === 'Literal' &&
                   (superCall.arguments[superCall.arguments.length - 1] as TSESTree.Literal).value === true) {
          mode = 'shadow';
        } else if (hasBaseInChainShadow) {
          mode = 'shadow';
        } else if (/this\.attachShadow\(|createShadowRootWithCoreStyles\(this\b/.test(text)) {
          mode = 'shadow';
        } else if (!ctor || !superCall) {
          mode = 'inherited';
        } else {
          mode = 'light';
        }

        const refs = new Set(text.match(/\b[A-Za-z_$][\w$]*\b/g) || []);
        classes.push({
          node,
          name: node.id?.name ?? '<anon>',
          mode,
          refs,
          superClass: node.superClass ? sourceText(context, node.superClass) : null,
        });
      },
      'Program:exit'(program: TSESTree.Program) {
        for (const stmt of program.body) {
          let decl: TSESTree.Node = stmt;
          if ((decl.type === 'ExportNamedDeclaration' || decl.type === 'ExportDefaultDeclaration') &&
              decl.declaration) {
            decl = decl.declaration;
          }
          if (decl.type === 'FunctionDeclaration' && decl.id) {
            topLevel.set(decl.id.name, new Set(sourceText(context, decl).match(/\b[A-Za-z_$][\w$]*\b/g) || []));
          } else if (decl.type === 'VariableDeclaration') {
            const refs = new Set(sourceText(context, decl).match(/\b[A-Za-z_$][\w$]*\b/g) || []);
            for (const d of decl.declarations) {
              if (d.id.type === 'Identifier') {
                topLevel.set(d.id.name, refs);
              }
            }
          }
        }

        // Resolve inherited modes for classes extending same-file classes.
        for (const c of classes) {
          if (c.mode === 'inherited' && c.superClass) {
            const base = classes.find(b => b.name === c.superClass);
            c.mode = base ? (base.mode === 'inherited' ? 'unknown' : base.mode) : 'unknown';
          }
        }

        const modeOfTopLevel = (name: string, seen = new Set<string>()): Set<string> => {
          if (seen.has(name)) {
            return new Set();
          }
          seen.add(name);
          const modes = new Set<string>();
          for (const c of classes) {
            if (c.refs.has(name)) {
              modes.add(c.mode);
            }
          }
          for (const [other, refs] of topLevel) {
            if (other !== name && refs.has(name)) {
              for (const m of modeOfTopLevel(other, seen)) {
                modes.add(m);
              }
            }
          }
          return modes;
        };

        const relPath = path.relative(context.cwd, path.resolve(context.cwd, filename)).replaceAll('\\', '/');
        const isBurndownFile = burndownSet.has(relPath);
        const lightFindings: Finding[] = [];

        for (const f of findings) {
          let mode = 'unknown';
          const tpl = f.template;
          if (tpl && isInertTemplateValue(tpl)) {
            mode = 'shadow';
          } else if (tpl && renderTargetIsShadow(tpl, context)) {
            mode = 'shadow';
          } else {
            const cls = enclosingClass(f.node);
            if (cls) {
              const c = classes.find(x => x.node === cls);
              if (c) {
                mode = c.mode;
              }
            } else {
              const name = enclosingTopLevelName(f.node);
              if (name) {
                const modes = modeOfTopLevel(name);
                if (modes.has('light')) {
                  mode = 'light';
                } else if (modes.has('shadow') && modes.size === 1) {
                  mode = 'shadow';
                } else if (modes.size) {
                  mode = [...modes].join('|');
                }
              }
            }
          }

          if (mode === 'unknown' || mode === 'inherited' || mode.includes('|')) {
            mode = fileShadowSignal ? 'shadow' : 'light';
          }
          if (mode === 'light') {
            lightFindings.push(f);
          }
        }

        if (isBurndownFile) {
          if (lightFindings.length === 0) {
            context.report({node: program, messageId: 'staleBurndownEntry', data: {file: relPath}});
          }
          return;
        }

        for (const f of lightFindings) {
          context.report({node: f.node, messageId: f.messageId, data: f.data});
        }
      },
    };
  },
});
