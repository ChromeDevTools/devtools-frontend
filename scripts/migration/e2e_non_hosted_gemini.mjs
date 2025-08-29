// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {execSync, spawn} from 'child_process';
import path from 'path';

const args = process.argv.slice(2);
if (args.length !== 2) {
  throw new Error('Usage: node scripts/migration/e2e_non_hosted_gemini.ts <path> <issue number>');
}

const oldTestFilePath = args[0];
const newTestFilePath = oldTestFilePath.replace('/e2e/', '/e2e_non_hosted/');
const newTestDirectory = newTestFilePath.substring(0, newTestFilePath.lastIndexOf('/'));
const issueNumber = args[1];
const branch = `fix-${issueNumber}`;
const worktreeBasePath = `/tmp/worktree-${branch}`;
const localCheckoutName = path.basename(process.cwd());
const worktreePath = `${worktreeBasePath}/${localCheckoutName}`;

const prompt = `Migrate @${oldTestFilePath} to @${newTestFilePath}. ISSUENUMBER is ${issueNumber}.

Step by step instructions:

1) Read all tests in @${newTestDirectory} as examples to understand the aspects of the already migrated files.
2) Read all files in @test/e2e_non_hosted/shared.
3) Read the non-migrated test file @${oldTestFilePath}.
4) Read relevant helpers files imported from the test file.
5) Create an empty file for the migrated test @${newTestFilePath}.
6) Update BUILD.gn files to include the new file into the build and remove it from the BUILD.gn files in the e2e folder.
7) Migrate the test file following the following instructions:

   - each test function should receive a 'devToolsPage' via its arguments and 'inspectedPage' if needed.
   - when calling helpers pass the 'devToolsPage' as the last argument.
   - update the helpers that are used by the test to accept 'devToolsPage' as the last argument if needed. CRITICAL: DO NOT UPDATE helpers if an equivalent already exists on the 'DevToolsPage'. Remember that $$, $, waitFor, click, hover, typeText helpers are available directly on devToolsPage. Rewrite accordingly.
   - keep the helpers from @test/e2e/helpers in place.
   - in helpers, the 'devToolsPage' argument should be the last one and it should be optional defaulting to 'getBrowserAndPagesWrappers().devToolsPage'.
   - use the globally available 'setup' function define experiments and flags for the test.
   - rewrite any beforeEach/afterEach hooks to be local helper functions called from the test directly.
   - instead of using 'devToolsPage.keyboard.press' use 'devToolsPage.keyboard.pressKey'.
   - instead of using global 'click' use 'devToolsPage.click'.

8) After you are done with changes, run 'npm run test -- -t StrictTypes ${newTestFilePath}' to verify.
9) Delete the original test file.
10) Commit the changes with the message 'Migrate ${oldTestFilePath}'
11) Run 'git cl presubmit --upload'
12) Run 'git cl upload -a -s -d -f --hashtag=migration-ai -x ${issueNumber}' to upload the change.
13) Fix any lint issues. You may have to re-commit if files changed. When re-committing, amend the initial commit to preserve the commit message.
`;

function runProcess(command, args, options) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, options);

    // Rejects on spawn errors (e.g., command not found)
    proc.on('error', err => {
      reject(err);
    });

    // Resolves or rejects based on the final exit code
    proc.on('close', code => {
      if (code === 0) {
        console.log('Child process completed successfully.');
        resolve(code);
      } else {
        // Rejects if the script fails (non-zero exit code)
        const err = new Error(`Child process failed with exit code: ${code}`);
        reject(err);
      }
    });
  });
}

let exitCode = 0;
try {
  execSync(`git branch -D ${branch} || true`);
  execSync(`gclient-new-workdir.py .. ${worktreeBasePath}`);

  execSync(`git new-branch ${branch}`, {cwd: worktreePath});
  execSync('gclient sync -j20 -Df', {cwd: worktreePath});
  execSync('gn gen out/StrictTypes --args="is_debug=true"', {cwd: worktreePath});

  await runProcess(
    'npx',
    ['@google/gemini-cli', '-y', '-p', prompt],
    {
      stdio: 'inherit',
      cwd: worktreePath,
      env: process.env,
    }
  );

  console.log('Migration successful.');
} catch (error) {
  console.error('Migration failed:', error.message);
  exitCode = 1;
} finally {
  console.log('Cleaning up worktree...');
  execSync(`rm -rf ${worktreeBasePath}`);
  process.exit(exitCode);
}
