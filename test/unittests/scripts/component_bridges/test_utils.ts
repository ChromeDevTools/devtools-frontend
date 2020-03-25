// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const randomStr = () => Math.random().toString(36).substring(7);

export const fixturesPath = path.join(process.cwd(), 'test', 'unittests', 'scripts', 'component_bridges', 'fixtures');

export const createTypeScriptSourceFile = (code: string) => {
  const fileName = `${randomStr()}.ts`;
  return ts.createSourceFile(fileName, code, ts.ScriptTarget.ESNext);
};

export const createTypeScriptSourceFromFilePath = (filePath: string) => {
  return ts.createSourceFile(filePath, fs.readFileSync(filePath, {encoding: 'utf8'}), ts.ScriptTarget.ESNext);
};

export const pathForFixture = (fixtureName: string): string => {
  return path.resolve(path.join(fixturesPath, fixtureName));
};
