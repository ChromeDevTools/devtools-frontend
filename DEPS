# Copyright 2019 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

use_relative_paths = True
git_dependencies = 'SYNC'
gclient_gn_args_file = 'build/config/gclient_args.gni'
gclient_gn_args = [
]

vars = {
  'build_with_chromium': False,

  'build_url': 'https://chromium.googlesource.com/chromium/src/build.git',
  'build_revision': '17914a54cea4855053b3ae3359ad8e5c5eb28954',

  'buildtools_url': 'https://chromium.googlesource.com/chromium/src/buildtools.git',
  'buildtools_revision': '22e55595e15ebbbbb4bef118d5a654b185b0b30d',

  'depot_tools_url': 'https://chromium.googlesource.com/chromium/tools/depot_tools.git',
  'depot_tools_revision': 'ce1ebad2c35c9387186f01d77edeea28a254c955',

  'inspector_protocol_url': 'https://chromium.googlesource.com/deps/inspector_protocol',
  'inspector_protocol_revision': '39acff851716ef40aaa0312ce0d359e37ef0d467',

  # Keeping track of the last time we rolled the browser protocol files.
  'chromium_browser_protocol_revision' : 'c9e49d7cdbbc11a6a70bb2573f5a18cb23c1789b',

  'clang_format_url': 'https://chromium.googlesource.com/external/github.com/llvm/llvm-project/clang/tools/clang-format.git',
  'clang_format_revision': 'c2725e0622e1a86d55f14514f2177a39efea4a0e',

  'emscripten_tag': 'ade9d780ff17c88d81aa13860361743e3c1e1396',

  # GN CIPD package version.
  'gn_version': 'git_revision:b2ac0e7a9089039e62b84d246eca83f84c540f76',

  'cmake_version': 'version:2@3.21.3',

  'llvm_url': 'https://chromium.googlesource.com/external/github.com/llvm/llvm-project/',
  'llvm_revision': '3c51ea3619e488db19cd26840ed46d58cfc7062f',

  'lldb_eval_url': 'https://chromium.googlesource.com/external/github.com/google/lldb-eval.git',
  'lldb_eval_revision': 'e87123a7e639bf1d86f24c37079570fb7fa00b72',

  # ninja CIPD package version.
  # https://chrome-infra-packages.appspot.com/p/infra/3pp/tools/ninja
  'ninja_version': 'version:3@1.12.1.chromium.4',

  # Chrome version used for tests. It should be regularly updated to
  # match the Canary version listed here:
  # https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions.json
  # Note: This var is no longer referenced in the body of this DEPS file.
  # However it is used by the roll script (scripts/deps/roll_deps.py) to ease
  # version resolution. DO NOT REMOVE!
  'chrome': '148.0.7755.0',

  # 'magic' text to tell depot_tools that git submodules should be accepted but
  # but parity with DEPS file is expected.
  'SUBMODULE_MIGRATION': 'True',

  # condition to allowlist deps for non-git-source processing.
  'non_git_source': 'True',

  # siso CIPD package version
  'siso_version': 'git_revision:87bad442ede1c60700dfabef5862c4a584621734',
}

# Only these hosts are allowed for dependencies in this DEPS file.
# If you need to add a new host, contact chrome infrastructure team.
allowed_hosts = [
  'chromium.googlesource.com',
  'chrome-infra-packages.appspot.com',

  # TODO(b/337061377): Move into a separate allowed gcs bucket list.
  'chromium-nodejs',
]

deps = {
  'third_party/clang-format/script': {
    'url': Var('clang_format_url') + '@' + Var('clang_format_revision'),
    'condition': 'build_with_chromium == False',
  },
  'third_party/cmake': {
    'packages': [{
      'package': 'infra/3pp/tools/cmake/${{platform}}',
      'version': Var('cmake_version')
    }],
    'dep_type':
      'cipd',
    'condition': 'checkout_cxx_debugging_extension_deps == True',
  },
  'extensions/cxx_debugging/third_party/llvm/src': {
    'url': Var('llvm_url') + '@' + Var('llvm_revision'),
    'condition': 'checkout_cxx_debugging_extension_deps == True',
  },
  'extensions/cxx_debugging/third_party/lldb-eval/src': {
    'url': Var('lldb_eval_url') + '@' + Var('lldb_eval_revision'),
    'condition': 'checkout_cxx_debugging_extension_deps == True',
  },

  'buildtools': {
    'url': Var('buildtools_url') + '@' + Var('buildtools_revision'),
    'condition': 'build_with_chromium == False',
  },

  'buildtools/linux64': {
    'packages': [
      {
        'package': 'gn/gn/linux-${{arch}}',
        'version': Var('gn_version'),
      }
    ],
    'dep_type': 'cipd',
    'condition': 'host_os == "linux" and build_with_chromium == False',
  },
  'buildtools/mac': {
    'packages': [
      {
        'package': 'gn/gn/mac-${{arch}}',
        'version': Var('gn_version'),
      }
    ],
    'dep_type': 'cipd',
    'condition': 'host_os == "mac" and build_with_chromium == False',
  },
  'buildtools/win': {
    'packages': [
      {
        'package': 'gn/gn/windows-amd64',
        'version': Var('gn_version'),
      }
    ],
    'dep_type': 'cipd',
    'condition': 'host_os == "win" and build_with_chromium == False',
  },
  'third_party/esbuild': {
    'packages': [
      {
        'package': 'infra/3pp/tools/esbuild/${{platform}}',
        'version': 'version:3@0.25.1.chromium.2',
      }
    ],
    'dep_type': 'cipd',
    'condition': 'non_git_source',
  },

  'build': {
    'url': Var('build_url') + '@' + Var('build_revision'),
    'condition': 'build_with_chromium == False',
  },
  'third_party/siso/cipd': {
    'packages': [
      {
        'package': 'build/siso/${{platform}}',
        'version': Var('siso_version'),
      }
    ],
    'dep_type': 'cipd',
    'condition': 'not build_with_chromium and host_cpu != "s390" and host_os != "zos" and host_cpu != "ppc"',
  },
  'third_party/depot_tools': {
    'url': Var('depot_tools_url') + '@' + Var('depot_tools_revision'),
    'condition': 'build_with_chromium == False',
  },
  'third_party/inspector_protocol': {
    'url': Var('inspector_protocol_url') + '@' + Var('inspector_protocol_revision'),
    'condition': 'build_with_chromium == False',
  },
  'third_party/ninja': {
    'packages': [
      {
        'package': 'infra/3pp/tools/ninja/${{platform}}',
        'version': Var('ninja_version'),
      }
    ],
    'dep_type': 'cipd',
    'condition': 'build_with_chromium == False',
  },
  # Pull down Node binaries for WebUI toolchain.
  'third_party/node/linux': {
    'dep_type': 'gcs',
    'condition': 'host_os == "linux" and build_with_chromium == False and non_git_source',
    'bucket': 'chromium-nodejs',
    'objects': [
        {
            'object_name': '744e6926ffdd4a4fb2080ae2b9ce4575490261e7',
            'sha256sum': 'bdea62a6857735d62165ec97242d79a693564c72d551890c4d009d2355abf14c',
            'size_bytes': 53566970,
            'generation': 1767604834866657,
            'output_file': 'node-linux-x64.tar.gz',
        },
    ],
  },
  'third_party/node/mac': {
      'dep_type': 'gcs',
      'condition': 'host_os == "mac" and build_with_chromium == False and host_cpu != "arm64" and non_git_source',
      'bucket': 'chromium-nodejs',
      'objects': [
          {
              'object_name': '9202c05a8e7c67cb2bb2fec1e50fb6188d26f281',
              'sha256sum': 'a25cd3ef35d8b4b5a59498a5a62b5b12cc271dc420ee809abaa76110d12c156e',
              'size_bytes': 49563652,
              'generation': 1767604826991919,
              'output_file': 'node-darwin-x64.tar.gz',
          },
      ],
  },
  'third_party/node/mac_arm64': {
      'dep_type': 'gcs',
      'condition': 'host_os == "mac" and build_with_chromium == False and host_cpu == "arm64" and non_git_source',
      'bucket': 'chromium-nodejs',
      'objects': [
          {
              'object_name': '6661e9b9bd7df6b45daf506c82d06d303597cb27',
              'sha256sum': 'b1be502d1635330ebf51d85f8d32a0d3dd92b35c6700def56ae6f903906ea825',
              'size_bytes': 48369082,
              'generation': 1767604830942392,
              'output_file': 'node-darwin-arm64.tar.gz',
          },
      ],
  },
  "scripts/ai_assistance/suite/outputs": {
    "dep_type": "gcs",
    'condition': 'checkout_ai_evals == True',
    "bucket": "chrome-devtools-ai-evals",
    "objects": [
      {
        "object_name": "f2c85d721d10c0b01de4d524afdf05453cbc404cfbe9639f16f72d89af0977ff",
        "sha256sum": "e582be610b470acccf159c4042e13bb6f6bc51acda97dd5a1a385e7c010ebc86",
        "size_bytes": 24714,
        "generation": 1770108482447463
      }
    ]
  },
  'third_party/chrome/chrome-win': {
    'dep_type': 'gcs',
    'condition': 'host_os == "win" and build_with_chromium == False and non_git_source',
    'bucket': 'chrome-for-testing-public',
    'objects': [
      {
        'object_name': '148.0.7755.0/win64/chrome-win64.zip',
        'sha256sum': '1d003b54c62f0cbee802c0e11e4637cb54520e7c3c0118fd60087d4782b699e1',
        'size_bytes': 189858937,
        'generation': 1774501175742249,
      },
    ],
  },
  'third_party/chrome/chrome-mac-x64': {
    'dep_type': 'gcs',
    'condition': 'host_os == "mac" and build_with_chromium == False and host_cpu != "arm64" and non_git_source',
    'bucket': 'chrome-for-testing-public',
    'objects': [
      {
        'object_name': '148.0.7755.0/mac-x64/chrome-mac-x64.zip',
        'sha256sum': '331ce27164f3e48239228353898e62e2df8407cafe8fa0bc9c3c07f024a657e5',
        'size_bytes': 184098636,
        'generation': 1774508004725723,
      },
    ],
  },
  'third_party/chrome/chrome-mac-arm64': {
    'dep_type': 'gcs',
    'condition': 'host_os == "mac" and build_with_chromium == False and host_cpu == "arm64" and non_git_source',
    'bucket': 'chrome-for-testing-public',
    'objects': [
      {
        'object_name': '148.0.7755.0/mac-arm64/chrome-mac-arm64.zip',
        'sha256sum': 'f856dd127c17d3c6757f38eb17c1bd74e8cc0dcc6e6c2d047657b5909f216bee',
        'size_bytes': 174535885,
        'generation': 1774502090176171,
      },
    ],
  },
  'third_party/chrome/chrome-linux': {
    'dep_type': 'gcs',
    'condition': 'host_os == "linux" and build_with_chromium == False and non_git_source',
    'bucket': 'chrome-for-testing-public',
    'objects': [
      {
        'object_name': '148.0.7755.0/linux64/chrome-linux64.zip',
        'sha256sum': '3a6b2189907fe3327f893c5acf828f0adeb1a9c7df35637e9ee9b4ad74ea3ca0',
        'size_bytes': 180498163,
        'generation': 1774499110257878,
      },
    ],
  },
  'third_party/node/win': {
      'dep_type': 'gcs',
      'condition': 'host_os == "win" and build_with_chromium == False and non_git_source',
      'bucket': 'chromium-nodejs',
      'objects': [
          {
              'object_name': '2f710ced2db2beb7c3debf6097196c35ee5adb74',
              'sha256sum': '2ffe3acc0458fdde999f50d11809bbe7c9b7ef204dcf17094e325d26ace101d8',
              'size_bytes': 89935872,
              'generation': 1767604839180114,
              'output_file': 'node.exe',
          },
      ],
  },
  'third_party/rollup_libs': {
      'packages': [
          {
              'package': 'infra/3pp/tools/rollup_libs/${{platform}}',
              'version': 'version:3@4.22.4',
          },
      ],
      'dep_type': 'cipd',
      'condition': 'non_git_source',
  },
}

hooks = [
  {
    # Ensure that the DEPS'd "depot_tools" has its self-update capability
    # disabled.
    'name': 'disable_depot_tools_selfupdate',
    'pattern': '.',
    'condition': 'build_with_chromium == False',
    'action': [
        'vpython3',
        'third_party/depot_tools/update_depot_tools_toggle.py',
        '--disable',
    ],
  },
  {
    # Update LASTCHANGE for build script timestamps
    'name': 'lastchange',
    'condition': 'build_with_chromium == False',
    'pattern': '.',
    'action': ['vpython3', 'build/util/lastchange.py',
               '-o', 'build/util/LASTCHANGE'],
  },
  {
    'name': 'emscripten',
    'pattern': '.',
    'condition': 'build_with_chromium == False',
    'action': ['vpython3', 'scripts/deps/download_emscripten.py', Var('emscripten_tag'), 'third_party/emscripten-releases'],
  },
  {
    'name': 'VS Code settings',
    'pattern': '.',
    'condition': 'build_with_chromium == False',
    'action': [
      'vpython3',
      'third_party/node/node.py',
      '--output',
      'scripts/deps/sync-vscode-settings.mjs'
    ]
  },
  {
    'name': 'configure_siso',
    'pattern': '.',
    'condition': 'build_with_chromium == False',
    'action': ['python3',
               'build/config/siso/configure_siso.py',
               '--rbe_instance',
               'projects/rbe-chrome-untrusted/instances/default_instance',
               ],
  },
{
    'name': 'sync_rollup_libs',
    'pattern': '.',
    'action': [
      'vpython3',
      'scripts/deps/sync_rollup_libs.py',
    ],
  },

  {
    'name': 'fix_cft_permissions',
    'pattern': '.',
    'condition': 'build_with_chromium == False',
    'action': [ 'vpython3', 'scripts/deps/fix_cft_permissions.py'],
  },
]

recursedeps = [
  'build',
  'buildtools',
]
