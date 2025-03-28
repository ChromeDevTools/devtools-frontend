// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @fileoverview A library to associate class members with their parent class.
 */
'use strict';

const {getEnclosingClassDeclaration} = require('./ast.js');

/** @typedef {import('estree').Node} Node */
/** @typedef {import('eslint').SourceCode} SourceCode */

/** @type {Map<Node, Map<string, ClassMember>>} */
const classes = new Map();

class ClassMember {
  /** @type {Set<Node>} */
  references = new Set();

  /** @type {Node} */
  classDeclaration;

  /**
   * @param {Node} node
   * @param {SourceCode} sourceCode
   * @return {ClassMember}
   */
  static getOrCreate(node, sourceCode) {
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
      classMember = new ClassMember();
      classMember.classDeclaration = classDeclaration;
      classMembers.set(memberName, classMember);
    }
    classMember.references.add(node);
    return classMember;
  }
}

exports.ClassMember = ClassMember;
