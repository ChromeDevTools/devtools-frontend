#!/bin/bash

# This script outputs the current DevTools version (e.g., `v1.0.1509326`) for
# GitHub Actions to apply as a git tag (see tag.yml).

# Adapted from
# https://github.com/paulirish/npm-publish-devtools-frontend/blob/bc782b47c46c5fa4487ab2c46429a908a3501af2/publish-devtools-package-to-npm.sh
# which evolved over 10 years.

# this is the chrome-for-testing version string, eg 131.0.6752.0
chrome_version="$(cat DEPS | grep "'chrome'" | head -n1 | sed "s/[^0-9.]//g")"

# Find most recent roll of chromium INTO devtools-frontend standalone.
#   NOTE: this isn't exactly the same as when frontend was rolled into chromium. But.. it shouldn't make a huge difference for these purposes.. :)
chromium_commit_position=$(curl "https://chromiumdash.appspot.com/fetch_releases?platform=Mac" --silent | jq --arg chrome_version "$chrome_version" '.[] | select(.version == $chrome_version).chromium_main_branch_position')

# verify we have a real number
re='^[0-9]+$'
if ! [[ $chromium_commit_position =~ $re ]] ; then
   echo "error: Not a number" >&2; exit 1
fi

tag="v1.0.$chromium_commit_position"
echo $tag
echo "tag=$tag" >> "$GITHUB_OUTPUT"
