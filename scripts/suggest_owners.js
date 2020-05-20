// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Suggest owners based on authoring and reviewing contributions.
// Usage: node suggest-owners.js <since-date> <path>
const {promisify} = require('util');
const exec = promisify(require('child_process').exec);
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const file_path = process.argv[3];
const date = process.argv[2];

readline.Interface.prototype.question[promisify.custom] = function(prompt) {
  return new Promise(
      resolve => readline.Interface.prototype.question.call(this, prompt, resolve),
  );
};
readline.Interface.prototype.questionAsync = promisify(
    readline.Interface.prototype.question,
);

(async function() {
  const {stdout} = await exec(`git log --numstat --since=${date} ${file_path}`, {maxBuffer: 1024 * 1024 * 128});
  const structured_log = [];
  // Parse git log into a list of commit objects.
  for (const line of stdout.split('\n')) {
    if (line.startsWith('commit')) {
      // Start of a new commit
      const match = /^commit (?<hash>\p{ASCII_Hex_Digit}+)/u.exec(line);
      structured_log.push({
        commit: match.groups.hash,
        contributors: new Set(),
      });
      continue;
    }
    const commit = structured_log[structured_log.length - 1];
    let match;
    if ((match = line.match(/^Author: .*<(?<author>.+@.+\..+)>$/))) {
      commit.contributors.add(match.groups.author);
    } else if ((match = line.match(/Reviewed-by: .*<(?<reviewer>.+@.+\..+)>$/))) {
      commit.contributors.add(match.groups.reviewer);
    }
  }

  // Attribute commits to contributors.
  const contributor_to_commits = new Map();
  for (commit of structured_log) {
    for (const contributor of commit.contributors) {
      if (!contributor_to_commits.has(contributor)) {
        contributor_to_commits.set(contributor, 1);
      } else {
        contributor_to_commits.set(contributor, contributor_to_commits.get(contributor) + 1);
      }
    }
  }

  // Output contributors.
  let list = [];
  for (const [contributor, commits] of contributor_to_commits) {
    list.push({contributor, commits});
  }
  list.sort((a, b) => b.commits - a.commits);
  console.log('Contributions');
  for (const {contributor, commits} of list) {
    console.log(`  ${contributor.padEnd(30)}: ${String(commits).padStart(3)}`);
  }

  const owners_path = path.join(file_path, 'OWNERS');
  // Output existing OWNERS file if exists.
  if (fs.existsSync(owners_path)) {
    console.log('Content of existing OWNERS file\n');
    console.log(fs.readFileSync(owners_path).toString());
  }

  // Prompt cut off value to suggest owners.
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const input = await rl.questionAsync('Cut off at: ');
  const cutoff = parseInt(input, 10);
  if (isNaN(cutoff)) {
    return;
  }

  console.log('Proposed owners');
  list = list.filter(item => item.commits >= cutoff)
             .sort((a, b) => a.contributor.toLowerCase().localeCompare(b.contributor.toLowerCase()));
  for (const {contributor} of list) {
    console.log('  ' + contributor);
  }

  // Prompt to write to OWNERS file.
  if ((await rl.questionAsync(`Write to ${owners_path} ?`)).toLowerCase() === 'y') {
    fs.writeFileSync(owners_path, list.map(e => e.contributor).join('\n') + '\n');
    await exec(`git add ${owners_path}`);
  }

  rl.close();
})();
