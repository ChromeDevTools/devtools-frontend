// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file A library to associate class members with their parent class.
 */

import type {TSESLint, TSESTree} from '@typescript-eslint/utils';

import {getEnclosingClassDeclaration} from './ast.ts';

type Node = TSESTree.Node;
type SourceCode = TSESLint.SourceCode;

const classes = new WeakMap<Node, Map<string, ClassMember>>();

export class ClassMember {
  references = new Set<Node>();

  classDeclaration: Node;

  constructor(classDeclaration: Node) {
    this.classDeclaration = classDeclaration;
  }

  initializer?: Node;

  static getOrCreate(node: Node, sourceCode: Readonly<SourceCode>): ClassMember|null {
    const classDeclaration = getEnclosingClassDeclaration(node);
    if (!classDeclaration) {
      return null;
    }
    let classMembers = classes.get(classDeclaration);
    if (!classMembers) {
      classMembers = new Map();
      classes.set(classDeclaration, classMembers);
    }
    const memberName = sourceCode.getText(node);
    let classMember = classMembers.get(memberName);
    if (!classMember) {
      classMember = new ClassMember(classDeclaration);
      classMembers.set(memberName, classMember);
    }
    if (node.parent?.type === 'AssignmentExpression') {
      classMember.initializer = node.parent.right;
      if (classMember.initializer?.type === 'TSAsExpression') {
        classMember.initializer = classMember.initializer.expression;
      }
    } else {
      classMember.references.add(node);
    }
    return classMember;
  }
}
