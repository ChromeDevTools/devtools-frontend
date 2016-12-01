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

from collections import namedtuple
import sys

compile_note = "Be sure to run your patch by the compile_frontend.py script prior to committing!"

CheckOutput = namedtuple('CheckOutput', ['results', 'has_errors'])


def _CheckNodeAndNPMModules(input_api, output_api):
    node_script_path = input_api.os_path.join(input_api.PresubmitLocalPath(), "scripts", "install_node_deps.py")
    process = input_api.subprocess.Popen(
        [input_api.python_executable, node_script_path],
        stdout=input_api.subprocess.PIPE,
        stderr=input_api.subprocess.STDOUT)
    out, _ = process.communicate()
    if process.returncode != 0:
        return CheckOutput([output_api.PresubmitError(out)], has_errors=True)
    return CheckOutput([output_api.PresubmitNotifyResult(out)], has_errors=False)


def _FormatDevtools(input_api, output_api):
    affected_front_end_files = _getAffectedFrontEndFiles(input_api)
    if len(affected_front_end_files) == 0:
        return CheckOutput([], has_errors=False)
    original_sys_path = sys.path
    try:
        sys.path = sys.path + [input_api.os_path.join(input_api.PresubmitLocalPath(), "scripts")]
        import install_node_deps
    finally:
        sys.path = original_sys_path

    node_path, _ = install_node_deps.resolve_node_paths()
    format_path = input_api.os_path.join(input_api.PresubmitLocalPath(), "scripts", "format.js")
    glob_arg = "--glob=" + ",".join(affected_front_end_files)
    check_formatting_process = _inputPopen(input_api,
        args=[node_path, format_path] + [glob_arg, "--output-replacements-xml"])
    check_formatting_out, _ = check_formatting_process.communicate()
    if check_formatting_process.returncode != 0:
        return CheckOutput([output_api.PresubmitError(check_formatting_out)], has_errors=True)
    if "</replacement>" not in check_formatting_out:
        return CheckOutput([output_api.PresubmitNotifyResult("CL is properly formatted")], has_errors=False)

    format_args = [node_path, format_path] + [glob_arg]
    format_process = _inputPopen(input_api, format_args)
    format_process_out, _ = format_process.communicate()

    # Use eslint to autofix the braces
    eslint_path = input_api.os_path.join(input_api.PresubmitLocalPath(), "node_modules", ".bin", "eslint")
    eslint_process = _inputPopen(input_api,
        [node_path, eslint_path, '--no-eslintrc', '--fix', '--env=es6',
         '--rule={"curly": [2, "multi-or-nest", "consistent"]}']
                                 + affected_front_end_files)
    eslint_process.communicate()

    # Need to run clang-format again to align the braces
    reformat_process = _inputPopen(input_api, format_args)
    reformat_process.communicate()

    return CheckOutput([output_api.PresubmitError("ERROR: Found formatting violations.\n"
                                      "Ran clang-format on files changed in CL\n"
                                      "Use git status to check the formatting changes"),
            output_api.PresubmitError(format_process_out)], has_errors=True)


def _CheckDevtoolsStyle(input_api, output_api):
    affected_front_end_files = _getAffectedFrontEndFiles(input_api)
    if len(affected_front_end_files) > 0:
        lint_path = input_api.os_path.join(input_api.PresubmitLocalPath(),
                                           "scripts", "lint_javascript.py")
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
    local_paths = [f.LocalPath() for f in input_api.AffectedFiles()]

    # FIXME: The compilation does not actually run if injected script-related files
    # have changed, as they reside in core/inspector, which is not affected
    # by this presubmit.
    # Once this is fixed, injected_script_externs.js
    # should be added to the list of triggers.
    devtools_front_end = input_api.os_path.join("devtools", "front_end")
    if (any(devtools_front_end in path for path in local_paths) or
            any("_protocol.json" in path for path in local_paths) or
            any("compile_frontend.py" in path for path in local_paths) or
            any("InjectedScriptSource.js" in path for path in local_paths) or
            any("DebuggerScript.js" in path for path in local_paths)):
        lint_path = input_api.os_path.join(input_api.PresubmitLocalPath(),
            "scripts", "compile_frontend.py")
        out, _ = input_api.subprocess.Popen(
            [input_api.python_executable, lint_path],
            stdout=input_api.subprocess.PIPE,
            stderr=input_api.subprocess.STDOUT).communicate()
        if "ERROR" in out or "WARNING" in out:
            return [output_api.PresubmitError(out)]
        if "NOTE" in out:
            return [output_api.PresubmitPromptWarning(out + compile_note)]
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

    (node_results, has_errors) = _CheckNodeAndNPMModules(input_api, output_api)
    results.extend(node_results)
    if has_errors:
        results.append(output_api.PresubmitError("ERROR: Bailed out early because error using node.js/npm"))
        return results

    (format_results, has_errors) = _FormatDevtools(input_api, output_api)
    results.extend(format_results)
    if has_errors:
        results.append(output_api.PresubmitError("ERROR: Bailed out early because formatting errors were found"))
        return results

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
    affected_front_end_files = [file_name for file_name in local_paths if devtools_front_end in file_name and file_name.endswith(".js")]
    return [input_api.os_path.relpath(file_name, devtools_root) for file_name in affected_front_end_files]


def _inputPopen(input_api, args):
    return input_api.subprocess.Popen(
        args,
        stdout=input_api.subprocess.PIPE,
        stderr=input_api.subprocess.STDOUT)