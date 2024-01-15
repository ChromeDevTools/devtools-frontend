#!/bin/bash
# Copyright (c) Meta Platforms, Inc. and affiliates.
# Copyright 2019 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

PROJECT_NAME=rn-chrome-devtools-frontend
WORKSPACE_DIR="${PROJECT_NAME}__workspace"

if [ "$(basename "$(dirname "$PWD")")" = "$WORKSPACE_DIR" ]; then
  echo "[setup] Error: Already in workspace directory"
  exit 1
fi

STARTING_DIR=$PWD

echo "[setup] Creating workspace directory at $(dirname "$PWD")/$WORKSPACE_DIR/"
cd ..
mkdir $WORKSPACE_DIR

echo "[setup] Moving repo folder into workspace"
mv $STARTING_DIR "$WORKSPACE_DIR/$PROJECT_NAME"

echo "[setup] Syncing gclient workspace"
cd $WORKSPACE_DIR
gclient config --unmanaged $PROJECT_NAME --name $PROJECT_NAME
gclient sync --no-history

echo "[setup] Moving to project folder"
cd $PROJECT_NAME

echo "[setup] Success: Repo ready at $PWD/"
