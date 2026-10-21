#!/usr/bin/env vpython3
#
# Copyright 2019 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Use this script to update node_modules instead of running npm install
manually. To upgrade a dependency, change the version number in package.json
and run this script, which can be done with `./dt install-deps` locally.

Without options the script runs `npm install`, post-processes the tree and
checks licenses, exactly as it always did. The options below add the steps
needed to ship node_modules as a single archive in Google Cloud Storage
(gs://chromium-nodejs/devtools-frontend/<sha256>) instead of git:

  --filter      Apply scripts/deps/npm_exclude.txt (rsync filter rules) to
                node_modules, removing files the build and tests don't need.
  --archive     Build a deterministic node_modules.tar.gz from node_modules.
  --upload      Upload the archive to GCS and point the `node_modules` entry
                in DEPS at it (implies --archive).
  --check       Rebuild the archive from node_modules and compare it with
                the `node_modules` entry in DEPS.
  --verify-references
                Check that every node_modules/ path referenced from GN or
                Python build files still exists.
  --skip-install
                Don't run `npm install`; operate on the existing tree.

A typical dependency bump is:

  ./dt install-deps --filter --archive   # or --upload, if you have access
  ./dt build && ./dt test                # verify the filtered tree
"""

import argparse
import gzip
import hashlib
import json
import os
import os.path as path
import re
import shutil
import subprocess
import sys
import tarfile
import urllib.error
import urllib.request
from collections import OrderedDict

scripts_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(scripts_path)

import devtools_paths

LICENSES = [
    "MIT",
    "Apache-2.0",
    "BSD",
    "BSD-2-Clause",
    "BSD-3-Clause",
    "CC0-1.0",
    "CC-BY-3.0",
    "CC-BY-4.0",
    "ISC",
    "MPL-2.0",
    "Python-2.0",
    "W3C",
    "BlueOak-1.0.0",
]

# Where the node_modules archive lives in Google Cloud Storage. The bucket is
# shared with the Node binaries (see DEPS) and other Chromium projects; the
# prefix namespaces our objects. Objects are named by their sha256, so they are
# immutable and re-uploading the same archive is a no-op.
GCS_BUCKET = 'chromium-nodejs'
GCS_PREFIX = 'devtools-frontend'
GCS_PUBLIC_URL = 'https://storage.googleapis.com'

# Name of the gcs dependency in DEPS that `--upload` updates.
DEPS_ENTRY_NAME = 'node_modules'

# Files inside node_modules/ that gclient writes when it manages the directory
# as a gcs dependency, plus the archive itself. They must never end up inside
# a new archive, regardless of the exclude list.
GCLIENT_ARTIFACT_PATTERNS = re.compile(
    r'^(node_modules\.tar\.gz|\..*_hash|\..*_is_first_class_gcs|'
    r'\..*_content_names)$')


def exclude_file_path():
    return path.join(devtools_paths.devtools_root_path(), 'scripts', 'deps',
                     'npm_exclude.txt')


def default_archive_path():
    return path.join(devtools_paths.devtools_root_path(), 'out',
                     'node_modules.tar.gz')


def deps_file_path():
    return path.join(devtools_paths.devtools_root_path(), 'DEPS')


def depot_tools_path():
    return path.join(devtools_paths.devtools_root_path(), 'third_party',
                     'depot_tools')


def load_json_file(location):
    # By default, json load uses a standard Python dictionary, which is not ordered.
    # To prevent subsequent invocations of this script to erroneously alter the order
    # of keys defined in package.json files, we should use an `OrderedDict`. This
    # ensures not only that we use a strict ordering, it will also make sure we maintain
    # the order defined by the NPM packages themselves. That in turn is important, since
    # NPM packages can define `exports`, where the order of entrypoints is crucial for
    # how an NPM package is loaded. If you would change the order, it could break loading
    # that package.
    return json.load(location, object_pairs_hook=OrderedDict)


def load_dev_dependencies():
    with open(devtools_paths.package_json_path(), 'r') as pkg_file:
        return load_json_file(pkg_file)["devDependencies"]


def exec_command(cmd):
    try:
        new_env = os.environ.copy()
        subprocess.check_call(cmd,
                              cwd=devtools_paths.devtools_root_path(),
                              env=new_env)
    except Exception as error:
        print(error)
        return True

    return False


def ensure_licenses():
    cmd = [
        devtools_paths.node_path(),
        devtools_paths.license_checker_path(), '--onlyAllow',
        ('%s' % (';'.join(LICENSES)))
    ]

    return exec_command(cmd)


def strip_private_fields():
    # npm adds private fields which need to be stripped.
    packages = []
    for root, _, filenames in os.walk(devtools_paths.node_modules_path()):
        if 'package.json' in filenames:
            packages.append(path.join(root, 'package.json'))

    for pkg in packages:
        with open(pkg, 'r+') as pkg_file:
            try:
                pkg_data = load_json_file(pkg_file)

                # Remove anything that begins with an underscore, as these are
                # the private fields in a package.json
                private_keys = [
                    key for key in pkg_data.keys() if key.find('_') == 0
                ]
                if not private_keys:
                    # Don't rewrite files that need no change: json.dump
                    # would still alter them (e.g. by escaping non-ASCII
                    # text that npm writes verbatim).
                    continue
                for key in private_keys:
                    pkg_data.pop(key)

                pkg_file.truncate(0)
                pkg_file.seek(0)
                json.dump(pkg_data, pkg_file, indent=2, separators=(',', ': '))
                pkg_file.write('\n')
            except:
                print('Unable to fix: %s, %s' % (pkg, sys.exc_info()))
                return True

    return False


def remove_package_json_entries():
    with open(devtools_paths.package_json_path(), 'r+') as pkg_file:
        try:
            pkg_data = load_json_file(pkg_file)

            # Remove the dependencies and devDependencies from the root package.json
            # so that they can't be used to overwrite the node_modules managed by this file.
            for key in list(pkg_data.keys()):
                if key.find('dependencies') == 0:
                    pkg_data.pop(key)

            pkg_file.truncate(0)
            pkg_file.seek(0)
            json.dump(pkg_data, pkg_file, indent=2, separators=(',', ': '))
            pkg_file.write('\n')
        except:
            print('Unable to fix: %s' % devtools_paths.package_json_path())
            return True
    return False


def addClangFormat():
    with open(path.join(devtools_paths.node_modules_path(), '.clang-format'),
              'w+') as clang_format_file:
        try:
            clang_format_file.write('DisableFormat: true\n')
        except:
            print('Unable to write .clang-format file')
            return True
    return False


def addOwnersFile():
    with open(path.join(devtools_paths.node_modules_path(), 'OWNERS'),
              'w+') as owners_file:
        try:
            owners_file.write('file://config/owner/INFRA_OWNERS\n')
        except:
            print('Unable to write OWNERS file')
            return True
    return False


def addReadme():
    with open(path.join(devtools_paths.node_modules_path(), 'README.md'),
              'w+') as readme_file:
        try:
            readme_file.write(
                'This directory hosts all packages downloaded from NPM that are used in either the build system or infrastructure scripts.\n'
            )
            readme_file.write(
                'If you want to make any changes to this directory, please see "scripts/deps/manage_node_deps.py".\n'
            )
        except:
            print('Unable to write README.md file')
            return True
    return False


def add_marker_files():
    """Writes the files PRESUBMIT.py expects at the root of node_modules."""
    return addClangFormat() or addOwnersFile() or addReadme()


def fixChaiExports():
    file_path = path.join(devtools_paths.node_modules_path(), 'chai',
                          'package.json')
    with open(file_path, 'r+') as pkg_json:
        content = pkg_json.read()
        pkg_json.seek(0)
        # Buggy export in the current chai version. Can be removed once the chai version is fixed.
        content = content.replace('"./": "./"', '"./*": "./*.js"')
        pkg_json.write(content)
        pkg_json.truncate()


NODE_MODULE_PATCHES = [
    "scripts/deps/node_module_patches/karma-mocha.patch",
    # Removes the global declarations of the Mocha test interface (`describe`,
    # `it`, ...). Tests have to import them explicitly instead.
    "scripts/deps/node_module_patches/types-mocha.patch",
]


def apply_patch(patch_path):
    cwd = devtools_paths.devtools_root_path()
    env = os.environ.copy()

    # Check if the patch can be applied.
    check_cmd = ["git", "apply", "--check", patch_path]
    if subprocess.run(check_cmd, cwd=cwd, env=env,
                      capture_output=True).returncode == 0:
        return exec_command(["git", "apply", patch_path])

    # If it cannot be applied, check if it is already applied.
    reverse_check_cmd = ["git", "apply", "--reverse", "--check", patch_path]
    if subprocess.run(reverse_check_cmd, cwd=cwd, env=env,
                      capture_output=True).returncode == 0:
        return False

    # If it's neither applicable nor already applied, run it for real to report the error.
    return exec_command(["git", "apply", patch_path])


def apply_patches():
    return any(apply_patch(patch_path) for patch_path in NODE_MODULE_PATCHES)


def check_npm_version():
    try:
        new_env = os.environ.copy()
        version_str = subprocess.check_output(
            ['npm', '--version'],
            cwd=devtools_paths.devtools_root_path(),
            env=new_env,
            text=True).strip()
    except Exception as error:
        print(f'Failed to run "npm --version": {error}')
        return True

    if version_str.startswith('v'):
        version_str = version_str[1:]
    base_version = version_str.split('-')[0].split('+')[0]

    try:
        version_parts = [int(x) for x in base_version.split('.')]
    except ValueError:
        print(f'Invalid npm version format: {version_str}')
        return True

    required_parts = [11, 10, 0]
    while len(version_parts) < 3:
        version_parts.append(0)

    if version_parts < required_parts:
        print(
            f'npm version {version_str} is too old. DevTools requires at least 11.10.0.'
        )
        return True

    return False


def run_npm_command():
    """Runs `npm install` and all post-processing steps. Returns True on error."""
    if check_npm_version():
        return True

    for (name, version) in load_dev_dependencies().items():
        if (version.find('^') == 0):
            print(
                'Versions must be locked to a specific version; remove ^ from the start of the version.'
            )
            return True

    # Modern npm versions do not cause extra updates so it is not necessary to run clean install.
    if exec_command([
            'npm',
            'install',
    ]):
        return True

    if remove_package_json_entries():
        return True

    if strip_private_fields():
        return True

    if add_marker_files():
        return True

    fixChaiExports()

    if apply_patches():
        return True

    return ensure_licenses()


# --- Archive production -----------------------------------------------------


def tree_stats(directory):
    """Returns (file_count, total_bytes) for regular files below directory."""
    count = 0
    total = 0
    for root, _, files in os.walk(directory):
        for name in files:
            full = path.join(root, name)
            if path.islink(full):
                continue
            count += 1
            total += path.getsize(full)
    return count, total


def filter_node_modules(exclude_file=None, node_modules=None, staging=None):
    """Removes everything matched by the exclude list from node_modules.

    The rules are rsync filter rules (the same mechanism WebUI and
    chromium-bidi use for their archives): `+ pattern` keeps, `pattern`
    excludes, first match wins. The filtered tree is produced next to
    node_modules and then swapped into place, so after this step developers
    run with exactly the tree bots will download.

    Returns True on error.
    """
    exclude_file = exclude_file or exclude_file_path()
    node_modules = (node_modules
                    or devtools_paths.node_modules_path()).rstrip(os.sep)
    # Stage next to node_modules rather than under out/: out/ may live on a
    # different filesystem, where os.rename() fails with EXDEV.
    staging = staging or node_modules + '.filtered'
    old = node_modules + '.old'

    if not path.isfile(exclude_file):
        print(f'Exclude list {exclude_file} does not exist.')
        return True
    if not path.isdir(node_modules):
        print(f'{node_modules} does not exist; run without --skip-install.')
        return True
    rsync = shutil.which('rsync')
    if not rsync:
        print('Filtering node_modules requires rsync (run on Linux or macOS).')
        return True

    for leftover in (staging, old):
        if path.lexists(leftover):
            shutil.rmtree(leftover)
    os.makedirs(staging)

    cmd = [
        rsync,
        '-rlp',
        f'--exclude-from={exclude_file}',
        '--prune-empty-dirs',
        node_modules + os.sep,
        staging + os.sep,
    ]
    before = tree_stats(node_modules)
    try:
        subprocess.check_call(cmd)
    except (OSError, subprocess.CalledProcessError) as error:
        print(f'rsync failed: {error}')
        shutil.rmtree(staging, ignore_errors=True)
        return True
    after = tree_stats(staging)

    # Swap the filtered tree into place, restoring the original if the swap
    # fails so the checkout is never left without node_modules.
    os.rename(node_modules, old)
    try:
        os.rename(staging, node_modules)
    except OSError as error:
        os.rename(old, node_modules)
        shutil.rmtree(staging, ignore_errors=True)
        print(f'Could not move the filtered tree into place: {error}')
        return True
    shutil.rmtree(old)

    print('Filtered node_modules with %s:' %
          path.relpath(exclude_file, devtools_paths.devtools_root_path()))
    print('  before: %6d files, %6.1f MB' % (before[0], before[1] / 1e6))
    print('  after:  %6d files, %6.1f MB' % (after[0], after[1] / 1e6))
    return False


# A node_modules/ path, optionally preceded by one path segment so that
# references to *other* node_modules directories (for example
# extensions/cxx_debugging/e2e/node_modules) can be told apart from `..`
# relative references to ours.
REFERENCE_PATTERN = re.compile(
    r'(?P<prefix>[\w.\-]+/)?node_modules/(?P<reference>[A-Za-z0-9@._\-/]+)')
REFERENCE_FILE_SUFFIXES = ('.gn', '.gni', '.py')
REFERENCE_SKIP_FILE_SUFFIXES = ('_unittest.py', '_test.py')
REFERENCE_SKIP_DIRS = frozenset(
    ['.git', 'node_modules', 'out', 'third_party', '__pycache__'])


def referenced_node_module_paths(root=None):
    """Collects node_modules/ paths mentioned in GN and Python build files."""
    root = root or devtools_paths.devtools_root_path()
    references = set()
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(d for d in dirnames
                             if d not in REFERENCE_SKIP_DIRS)
        for filename in filenames:
            if (not filename.endswith(REFERENCE_FILE_SUFFIXES)
                    or filename.endswith(REFERENCE_SKIP_FILE_SUFFIXES)):
                continue
            try:
                with open(path.join(dirpath, filename),
                          encoding='utf-8',
                          errors='replace') as f:
                    content = f.read()
            except OSError:
                continue
            for match in REFERENCE_PATTERN.finditer(content):
                prefix = (match.group('prefix') or '').rstrip('/')
                if prefix not in ('', '.', '..'):
                    continue  # Some other node_modules directory.
                reference = match.group('reference').rstrip('/')
                # Skip globs and fragments like `node_modules/${name}`.
                if reference and not reference.endswith(('*', '.')):
                    references.add(reference)
    return references


def verify_references(node_modules=None, root=None):
    """Fails if a node_modules path referenced by the build is missing.

    Returns True on error.
    """
    node_modules = node_modules or devtools_paths.node_modules_path()
    references = referenced_node_module_paths(root)
    missing = sorted(reference for reference in references
                     if not path.lexists(path.join(node_modules, reference)))
    print('Checked %d node_modules paths referenced from GN/Python files.' %
          len(references))
    if missing:
        print('Missing from %s:' % node_modules)
        for reference in missing:
            print('  ' + reference)
        return True
    return False


def normalize_tar_info(info):
    """Drops everything from a TarInfo that varies between machines."""
    info.uid = 0
    info.gid = 0
    info.uname = ''
    info.gname = ''
    info.mtime = 0
    if info.isdir():
        info.mode = 0o755
    elif info.isreg():
        info.mode = 0o755 if info.mode & 0o111 else 0o644
    else:
        info.mode = 0o777
    return info


def iter_archive_entries(src_dir):
    """Returns the sorted relative paths to archive below src_dir.

    gclient-managed stamp files and a stale archive are skipped so that an
    archive rebuilt from an extracted tree is identical to the original.
    """
    entries = []
    for dirpath, dirnames, filenames in os.walk(src_dir):
        rel_dir = path.relpath(dirpath, src_dir)
        if rel_dir == '.':
            rel_dir = ''
            filenames = [
                f for f in filenames if not GCLIENT_ARTIFACT_PATTERNS.match(f)
            ]
        for name in dirnames + filenames:
            entries.append(path.join(rel_dir, name) if rel_dir else name)
    # Sort on the archive name so the order is the same on every platform.
    entries.sort(key=lambda entry: entry.replace(os.sep, '/'))
    return entries


class HashingWriter:
    """File-like wrapper that hashes everything written through it."""

    def __init__(self, target):
        self._target = target
        self._offset = 0
        self.sha256 = hashlib.sha256()

    def write(self, data):
        self.sha256.update(data)
        self._offset += len(data)
        return self._target.write(data)

    def tell(self):
        return self._offset

    def flush(self):
        self._target.flush()


def create_archive(src_dir, out_path):
    """Writes a deterministic tar.gz of src_dir to out_path.

    The archive contains the *contents* of src_dir at its root (gclient
    extracts it straight into the dependency directory). Ownership, times and
    permission noise are normalized so that the same tree always produces the
    same bytes, which makes the sha256 in DEPS reproducible by reviewers and
    re-uploads idempotent.

    Returns (sha256 of the .tar.gz, sha256 of the uncompressed tar stream).
    The latter does not depend on the zlib build used for compression.
    """
    src_dir = path.abspath(src_dir)
    src_real = path.realpath(src_dir)
    if not path.isdir(src_dir):
        raise ValueError(f'{src_dir} is not a directory')
    entries = iter_archive_entries(src_dir)
    if not entries:
        # Otherwise a clean checkout would produce (and could upload) an
        # empty archive without any error.
        raise ValueError(f'{src_dir} is empty; nothing to archive')
    os.makedirs(path.dirname(path.abspath(out_path)), exist_ok=True)
    with open(out_path, 'wb') as out_file:
        with gzip.GzipFile(filename='',
                           mode='wb',
                           fileobj=out_file,
                           compresslevel=6,
                           mtime=0) as gz:
            tar_stream = HashingWriter(gz)
            with tarfile.open(fileobj=tar_stream,
                              mode='w',
                              format=tarfile.GNU_FORMAT) as tar:
                for entry in entries:
                    full = path.join(src_dir, entry)
                    arcname = entry.replace(os.sep, '/')
                    if path.islink(full):
                        # gclient refuses archives whose links escape the
                        # archive, and a dangling link means the exclude list
                        # removed a target that is still needed.
                        target = path.realpath(full)
                        if not path.exists(full) or not (
                                target + os.sep).startswith(src_real + os.sep):
                            raise ValueError(
                                f'{arcname} is a symlink that does not resolve '
                                f'inside {src_dir}')
                    info = normalize_tar_info(
                        tar.gettarinfo(full, arcname=arcname))
                    if info.isreg():
                        with open(full, 'rb') as f:
                            tar.addfile(info, f)
                    else:
                        tar.addfile(info)
    return sha256sum(out_path), tar_stream.sha256.hexdigest()


def sha256sum(filename):
    sha = hashlib.sha256()
    with open(filename, 'rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            sha.update(chunk)
    return sha.hexdigest()


def tar_stream_sha256(stream):
    """Returns the sha256 of the gzip-decompressed contents of stream."""
    sha = hashlib.sha256()
    with gzip.GzipFile(fileobj=stream, mode='rb') as gz:
        for chunk in iter(lambda: gz.read(1024 * 1024), b''):
            sha.update(chunk)
    return sha.hexdigest()


def archive_node_modules(archive_path, node_modules=None):
    """Builds the archive and prints its identity.

    Returns (sha256 of the archive, sha256 of the tar stream).
    """
    node_modules = node_modules or devtools_paths.node_modules_path()
    digest, tar_digest = create_archive(node_modules, archive_path)
    size = path.getsize(archive_path)
    print('Created %s' % archive_path)
    print('  sha256: %s' % digest)
    print('  size:   %d bytes (%.1f MB)' % (size, size / 1e6))
    print('  object: gs://%s/%s/%s' % (GCS_BUCKET, GCS_PREFIX, digest))
    return digest, tar_digest


# --- DEPS and GCS -----------------------------------------------------------


def parse_deps_entry(deps_text, entry_name=DEPS_ENTRY_NAME):
    """Returns the gcs object pinned for entry_name in DEPS, or None.

    DEPS mixes single and double quotes, so both are accepted.
    """
    q = r'[\'"]'
    match = re.search(r'^\s*%s%s%s\s*:\s*{' % (q, re.escape(entry_name), q),
                      deps_text, re.MULTILINE)
    if not match:
        return None
    # Entries are dicts at two-space indentation; the block ends at the first
    # closing brace with that indentation.
    end = deps_text.find('\n  }', match.end())
    block = deps_text[match.end():end if end != -1 else None]
    if not re.search(r'%sdep_type%s\s*:\s*%sgcs%s' % (q, q, q, q), block):
        return None
    fields = {}
    for key, pattern in (
        ('object_name', r'%sobject_name%s\s*:\s*%s([^\'"]+)%s' % (q, q, q, q)),
        ('sha256sum',
         r'%ssha256sum%s\s*:\s*%s([0-9a-f]{64})%s' % (q, q, q, q)),
        ('size_bytes', r'%ssize_bytes%s\s*:\s*(\d+)' % (q, q)),
        ('generation', r'%sgeneration%s\s*:\s*(\d+)' % (q, q)),
    ):
        field = re.search(pattern, block)
        if not field:
            return None
        value = field.group(1)
        fields[key] = int(value) if key in ('size_bytes',
                                            'generation') else value
    return fields


def format_deps_entry(object_name, digest, size, generation):
    """Renders the DEPS entry in the style used by the rest of DEPS."""
    return '\n'.join([
        "  '%s': {" % DEPS_ENTRY_NAME,
        "    'dep_type': 'gcs',",
        "    'bucket': '%s'," % GCS_BUCKET,
        "    'condition': 'non_git_source',",
        "    'objects': [",
        "      {",
        "        'object_name': '%s'," % object_name,
        "        'sha256sum': '%s'," % digest,
        "        'size_bytes': %d," % size,
        "        'generation': %d," % generation,
        "        'output_file': 'node_modules.tar.gz',",
        "      },",
        "    ],",
        "  },",
    ])


def gcs_object_url(object_name):
    return '%s/%s/%s' % (GCS_PUBLIC_URL, GCS_BUCKET, object_name)


def gcs_object_info(object_name):
    """Returns (size_bytes, generation) if the public object exists, else None."""
    request = urllib.request.Request(gcs_object_url(object_name),
                                     method='HEAD')
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            size = int(response.headers.get('Content-Length', '0'))
            generation = int(response.headers.get('x-goog-generation', '0'))
            return size, generation
    except urllib.error.HTTPError as error:
        if error.code in (403, 404):
            return None
        raise


def extract_json_blob(output):
    """Pulls the DEPS blob out of upload_to_google_storage_first_class output."""
    start = output.find('{')
    if start == -1:
        raise ValueError('No JSON blob found in: %s' % output)
    return json.loads(output[start:])


def upload_archive(archive_path, deps_file=None):
    """Uploads the archive (if needed) and updates DEPS. Returns True on error."""
    deps_file = deps_file or deps_file_path()
    digest = sha256sum(archive_path)
    size = path.getsize(archive_path)
    object_name = '%s/%s' % (GCS_PREFIX, digest)

    info = gcs_object_info(object_name)
    if info:
        remote_size, generation = info
        if remote_size != size:
            print('gs://%s/%s exists with size %d, expected %d' %
                  (GCS_BUCKET, object_name, remote_size, size))
            return True
        print('gs://%s/%s already exists, not uploading.' %
              (GCS_BUCKET, object_name))
    else:
        uploader = path.join(depot_tools_path(),
                             'upload_to_google_storage_first_class.py')
        cmd = [
            shutil.which('vpython3') or sys.executable, uploader, '--bucket',
            GCS_BUCKET, '--prefix', GCS_PREFIX, archive_path
        ]
        try:
            output = subprocess.check_output(cmd, text=True)
        except (OSError, subprocess.CalledProcessError) as error:
            print(f'Upload failed: {error}')
            return True
        print(output)
        try:
            uploaded = extract_json_blob(output)['path']['objects'][0]
        except (ValueError, KeyError, IndexError) as error:
            print(f'Could not parse the uploader output: {error}')
            return True
        if uploaded['object_name'] != object_name or uploaded[
                'sha256sum'] != digest:
            print('Uploader reported an unexpected object: %s' % uploaded)
            return True
        generation = int(uploaded['generation'])

    return update_deps(deps_file, object_name, digest, size, generation)


def update_deps(deps_file, object_name, digest, size, generation):
    """Points the node_modules gcs entry in DEPS at the object.

    Returns True on error.
    """
    with open(deps_file, encoding='utf-8') as f:
        deps_text = f.read()
    current = parse_deps_entry(deps_text)
    if current is None:
        print('DEPS has no gcs entry named %r yet. Add this to `deps`:' %
              DEPS_ENTRY_NAME)
        print(format_deps_entry(object_name, digest, size, generation))
        return False
    if current['object_name'] == object_name:
        print('DEPS already points at %s.' % object_name)
        return False
    cmd = [
        shutil.which('vpython3') or sys.executable,
        path.join(depot_tools_path(), 'gclient.py'),
        'setdep',
        '-r',
        '%s@%s,%s,%d,%d' %
        (DEPS_ENTRY_NAME, object_name, digest, size, generation),
        '--deps-file=%s' % deps_file,
    ]
    try:
        subprocess.check_call(cmd, cwd=devtools_paths.devtools_root_path())
    except (OSError, subprocess.CalledProcessError) as error:
        print(f'gclient setdep failed: {error}')
        return True
    print('Updated %s to %s.' % (path.basename(deps_file), object_name))
    return False


def check_archive(archive_path, deps_file=None, node_modules=None):
    """Rebuilds the archive and compares it with DEPS. Returns True on error.

    The .tar.gz hash is compared first. Gzip output can differ between zlib
    builds even for identical input, so on a mismatch the pinned object is
    downloaded and the uncompressed tar streams are compared instead.
    """
    deps_file = deps_file or deps_file_path()
    with open(deps_file, encoding='utf-8') as f:
        pinned = parse_deps_entry(f.read())
    if pinned is None:
        print('DEPS has no gcs entry named %r.' % DEPS_ENTRY_NAME)
        return True
    digest, tar_digest = archive_node_modules(archive_path, node_modules)
    size = path.getsize(archive_path)
    if digest == pinned['sha256sum'] and size == pinned['size_bytes']:
        print('node_modules matches the archive pinned in DEPS.')
        return False

    print('Archive differs from DEPS (%s, %d bytes); comparing contents with '
          'the pinned object...' % (pinned['sha256sum'], pinned['size_bytes']))
    try:
        with urllib.request.urlopen(gcs_object_url(pinned['object_name']),
                                    timeout=600) as response:
            pinned_tar_digest = tar_stream_sha256(response)
    except (urllib.error.URLError, OSError) as error:
        print(f'Could not download the pinned object: {error}')
        return True
    if pinned_tar_digest != tar_digest:
        print('node_modules does not match DEPS:')
        print('  DEPS tar stream:  %s' % pinned_tar_digest)
        print('  local tar stream: %s' % tar_digest)
        return True
    print('node_modules matches the archive pinned in DEPS '
          '(same contents, different gzip encoding).')
    return False


# --- Entry point ------------------------------------------------------------


def parse_args(argv):
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--skip-install',
                        action='store_true',
                        help="Don't run npm install; use the existing tree.")
    parser.add_argument('--filter',
                        action='store_true',
                        help='Apply scripts/deps/npm_exclude.txt.')
    parser.add_argument('--exclude-file',
                        default=None,
                        help='Exclude list to use with --filter.')
    parser.add_argument('--verify-references',
                        action='store_true',
                        help='Check paths referenced by GN/Python files.')
    parser.add_argument('--archive',
                        action='store_true',
                        help='Build a deterministic node_modules.tar.gz.')
    parser.add_argument('--archive-path',
                        default=None,
                        help='Where to write the archive '
                        '(default: out/node_modules.tar.gz).')
    parser.add_argument('--upload',
                        action='store_true',
                        help='Upload the archive to GCS and update DEPS.')
    parser.add_argument('--check',
                        action='store_true',
                        help='Compare a rebuilt archive with DEPS.')
    parser.add_argument('--deps-file',
                        default=None,
                        help='DEPS file to read/update (default: ./DEPS).')
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv if argv is not None else sys.argv[1:])
    archive_path = args.archive_path or default_archive_path()

    if not args.skip_install and not args.check:
        if run_npm_command():
            print('npm command failed')
            return 1

    if args.filter:
        if filter_node_modules(args.exclude_file):
            return 1
        # PRESUBMIT.py expects these at the root of node_modules.
        if add_marker_files():
            return 1
        if verify_references():
            return 1
    elif args.verify_references:
        if verify_references():
            return 1

    try:
        if args.check:
            return 1 if check_archive(archive_path, args.deps_file) else 0

        if args.archive or args.upload:
            archive_node_modules(archive_path)
    except ValueError as error:
        # Raised by create_archive() for a missing/empty tree or a symlink
        # that gclient would refuse; never upload such an archive.
        print(f'Cannot archive node_modules: {error}')
        return 1

    if args.upload:
        if upload_archive(archive_path, args.deps_file):
            return 1

    return 0


if __name__ == '__main__':
    sys.exit(main())
