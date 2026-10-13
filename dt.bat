@echo off
rem Copyright 2026 The Chromium Authors
rem Use of this source code is governed by a BSD-style license that can be
rem found in the LICENSE file.
rem
rem Launcher for scripts\tools\dt.py, so it can be run as `dt <script> [args]`.
call vpython3 "%~dp0scripts\tools\dt.py" %*
exit /b %ERRORLEVEL%
