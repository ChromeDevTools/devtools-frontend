# Copyright (C) 2014 Google Inc. All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are
# met:
#
#     * Redistributions of source code must retain the above copyright
# notice, this list of conditions and the following disclaimer.
#     * Redistributions in binary form must reproduce the above
# copyright notice, this list of conditions and the following disclaimer
# in the documentation and/or other materials provided with the
# distribution.
#     * Neither the name of Google Inc. nor the names of its
# contributors may be used to endorse or promote products derived from
# this software without specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
# "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
# LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
# A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
# OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
# SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
# LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
# DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
# THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
# (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
# OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
"""DevTools JSDoc validator presubmit script

See http://dev.chromium.org/developers/how-tos/depottools/presubmit-scripts
for more details about the presubmit API built into gcl.
"""

import sys


def _CheckBuildGN(input_api, output_api):
    script_path = input_api.os_path.join(input_api.PresubmitLocalPath(), "scripts", "check_gn.js")
    return _checkWithNodeScript(input_api, output_api, script_path)


def _CheckFormat(input_api, output_api):

    def popen(args):
        return input_api.subprocess.Popen(args=args, stdout=input_api.subprocess.PIPE, stderr=input_api.subprocess.STDOUT)

    affected_files = _getAffectedJSFiles(input_api)
    if len(affected_files) == 0:
        return []
    original_sys_path = sys.path
    try:
        sys.path = sys.path + [input_api.os_path.join(input_api.PresubmitLocalPath(), "scripts")]
        import local_node
    finally:
        sys.path = original_sys_path

    ignore_files = []
    eslint_ignore_path = input_api.os_path.join(input_api.PresubmitLocalPath(), '.eslintignore')
    with open(eslint_ignore_path, 'r') as ignore_manifest:
        for line in ignore_manifest:
            ignore_files.append(line.strip())
    formattable_files = [affected_file for affected_file in affected_files
                         if all(ignore_file not in affected_file for ignore_file in ignore_files)]
    if len(formattable_files) == 0:
        return []

    check_formatting_process = popen(['git', 'cl', 'format', '--js', '--dry-run'] + formattable_files)
    check_formatting_process.communicate()
    if check_formatting_process.returncode == 0:
        return []

    format_args = ['git', 'cl', 'format', '--js'] + formattable_files
    format_process = popen(format_args)
    format_out, _ = format_process.communicate()
    if format_process.returncode != 0:
        return [output_api.PresubmitError(format_out)]

    # Use eslint to autofix the braces.
    # Also fix semicolon to avoid confusing clang-format.
    eslint_process = popen([
        local_node.node_path(), local_node.eslint_path(),
        '--no-eslintrc', '--fix', '--env=es6', '--rule={"curly": [2, "multi-or-nest", "consistent"], "semi": 2}'
    ] + affected_files)
    eslint_process.communicate()

    # Need to run clang-format again to align the braces
    popen(format_args).communicate()

    return [
        output_api.PresubmitError("ERROR: Found formatting violations in third_party/blink/renderer/devtools.\n"
                                  "Ran clang-format on diff\n"
                                  "Use git status to check the formatting changes"),
        output_api.PresubmitError(format_out),
    ]


def _CheckDevtoolsStyle(input_api, output_api):
    affected_front_end_files = _getAffectedFrontEndFiles(input_api)
    if len(affected_front_end_files) > 0:
        lint_path = input_api.os_path.join(input_api.PresubmitLocalPath(), "scripts", "lint_javascript.py")
        process = input_api.subprocess.Popen(
            [input_api.python_executable, lint_path] + affected_front_end_files,
            stdout=input_api.subprocess.PIPE,
            stderr=input_api.subprocess.STDOUT)
        out, _ = process.communicate()
        if process.returncode != 0:
            return [output_api.PresubmitError(out)]
        return [output_api.PresubmitNotifyResult(out)]
    return []


def _CompileDevtoolsFrontend(input_api, output_api):
    compile_path = input_api.os_path.join(input_api.PresubmitLocalPath(), "scripts", "compile_frontend.py")
    out, _ = input_api.subprocess.Popen(
        [input_api.python_executable, compile_path], stdout=input_api.subprocess.PIPE,
        stderr=input_api.subprocess.STDOUT).communicate()
    if "ERROR" in out or "WARNING" in out:
        return [output_api.PresubmitError(out)]
    if "NOTE" in out:
        return [output_api.PresubmitPromptWarning(out)]
    return []


def _CheckConvertSVGToPNGHashes(input_api, output_api):
    if not input_api.platform.startswith('linux'):
        return []

    original_sys_path = sys.path
    try:
        sys.path = sys.path + [input_api.os_path.join(input_api.PresubmitLocalPath(), 'scripts', 'build')]
        import devtools_file_hashes
    finally:
        sys.path = original_sys_path

    absolute_local_paths = [af.AbsoluteLocalPath() for af in input_api.AffectedFiles(include_deletes=False)]
    images_src_path = input_api.os_path.join("devtools", "front_end", "Images", "src")
    image_source_file_paths = [path for path in absolute_local_paths if images_src_path in path and path.endswith(".svg")]
    image_sources_path = input_api.os_path.join(input_api.PresubmitLocalPath(), "front_end", "Images", "src")
    hashes_file_name = "svg2png.hashes"
    hashes_file_path = input_api.os_path.join(image_sources_path, hashes_file_name)
    invalid_hash_file_paths = devtools_file_hashes.files_with_invalid_hashes(hashes_file_path, image_source_file_paths)
    if len(invalid_hash_file_paths) == 0:
        return []
    invalid_hash_file_names = [input_api.os_path.basename(file_path) for file_path in invalid_hash_file_paths]
    file_paths_str = ", ".join(invalid_hash_file_names)
    error_message = "The following SVG files should be converted to PNG using convert_svg_images_png.py script before uploading: \n  - %s" % file_paths_str
    return [output_api.PresubmitError(error_message)]


def _CheckOptimizePNGHashes(input_api, output_api):
    if not input_api.platform.startswith('linux'):
        return []

    original_sys_path = sys.path
    try:
        sys.path = sys.path + [input_api.os_path.join(input_api.PresubmitLocalPath(), 'scripts', 'build')]
        import devtools_file_hashes
    finally:
        sys.path = original_sys_path

    absolute_local_paths = [af.AbsoluteLocalPath() for af in input_api.AffectedFiles(include_deletes=False)]
    images_src_path = input_api.os_path.join("devtools", "front_end", "Images", "src")
    image_source_file_paths = [path for path in absolute_local_paths if images_src_path in path and path.endswith(".svg")]
    image_sources_path = input_api.os_path.join(input_api.PresubmitLocalPath(), "front_end", "Images", "src")
    hashes_file_name = "optimize_png.hashes"
    hashes_file_path = input_api.os_path.join(image_sources_path, hashes_file_name)
    invalid_hash_file_paths = devtools_file_hashes.files_with_invalid_hashes(hashes_file_path, image_source_file_paths)
    if len(invalid_hash_file_paths) == 0:
        return []
    invalid_hash_file_names = [input_api.os_path.basename(file_path) for file_path in invalid_hash_file_paths]
    file_paths_str = ", ".join(invalid_hash_file_names)
    error_message = "The following PNG files should be optimized using optimize_png_images.py script before uploading: \n  - %s" % file_paths_str
    return [output_api.PresubmitError(error_message)]


def _CheckCSSViolations(input_api, output_api):
    results = []
    for f in input_api.AffectedFiles(include_deletes=False):
        if not f.LocalPath().endswith(".css"):
            continue
        for line_number, line in f.ChangedContents():
            if "/deep/" in line:
                results.append(output_api.PresubmitError(("%s:%d uses /deep/ selector") % (f.LocalPath(), line_number)))
            if "::shadow" in line:
                results.append(output_api.PresubmitError(("%s:%d uses ::shadow selector") % (f.LocalPath(), line_number)))
    return results


def CheckChangeOnUpload(input_api, output_api):
    results = []
    results.extend(_CheckBuildGN(input_api, output_api))
    results.extend(_CheckFormat(input_api, output_api))
    results.extend(_CheckDevtoolsStyle(input_api, output_api))
    results.extend(_CompileDevtoolsFrontend(input_api, output_api))
    results.extend(_CheckConvertSVGToPNGHashes(input_api, output_api))
    results.extend(_CheckOptimizePNGHashes(input_api, output_api))
    results.extend(_CheckCSSViolations(input_api, output_api))
    return results


def CheckChangeOnCommit(input_api, output_api):
    return []


def _getAffectedFrontEndFiles(input_api):
    local_paths = [f.AbsoluteLocalPath() for f in input_api.AffectedFiles() if f.Action() != "D"]
    devtools_root = input_api.PresubmitLocalPath()
    devtools_front_end = input_api.os_path.join(devtools_root, "front_end")
    affected_front_end_files = [
        file_name for file_name in local_paths if devtools_front_end in file_name and file_name.endswith(".js")
    ]
    return [input_api.os_path.relpath(file_name, devtools_root) for file_name in affected_front_end_files]


def _getAffectedJSFiles(input_api):
    local_paths = [f.AbsoluteLocalPath() for f in input_api.AffectedFiles() if f.Action() != "D"]
    devtools_root = input_api.PresubmitLocalPath()
    devtools_front_end = input_api.os_path.join(devtools_root, "front_end")
    devtools_scripts = input_api.os_path.join(devtools_root, "scripts")
    affected_js_files = [
        file_name for file_name in local_paths
        if (devtools_front_end in file_name or devtools_scripts in file_name) and file_name.endswith(".js")
    ]
    return [input_api.os_path.relpath(file_name, devtools_root) for file_name in affected_js_files]


def _checkWithNodeScript(input_api, output_api, script_path):
    original_sys_path = sys.path
    try:
        sys.path = sys.path + [input_api.os_path.join(input_api.PresubmitLocalPath(), "scripts")]
        import local_node
    finally:
        sys.path = original_sys_path

    node_path = local_node.node_path()

    process = input_api.subprocess.Popen(
        [node_path, script_path], stdout=input_api.subprocess.PIPE, stderr=input_api.subprocess.STDOUT)
    out, _ = process.communicate()

    if process.returncode != 0:
        return [output_api.PresubmitError(out)]
    return [output_api.PresubmitNotifyResult(out)]
