// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Suggest owners based on authoring and reviewing contributions.
// Usage: node suggest-owners.js <since-date> <path> [<cut-off>]
const util = require('util');
const exec = util.promisify(require('child_process').exec);

(async function() {
  const {stdout} =
      await exec(`git log --numstat --since=${process.argv[2]} ${process.argv[3]}`, {maxBuffer: 1024 * 1024 * 128});
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

  const cutoff = parseInt(process.argv[4], 10) || 0;
  if (cutoff > 0) {
    // If there is a cut-off specified, sort the list by contributor.
    list = list.filter(item => item.commits >= cutoff)
               .sort((a, b) => a.contributor.toLowerCase().localeCompare(b.contributor.toLowerCase()));
    for (const {contributor} of list) {
      console.log(contributor);
    }
  } else {
    // If there is no cut-off specified, sort the list by commit.
    for (const {contributor, commits} of list) {
      console.log(`${contributor.padEnd(30)}: ${String(commits).padStart(3)}`);
    }
  }
})();
