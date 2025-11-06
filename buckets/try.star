# Copyright 2024 The DevTools Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

load(
    "//lib/builders.star",
    "TRY_ACCOUNT",
    "acls",
    "bucket",
    "builder",
    "builder_coverage",
    "cq_acls",
    "cq_retry_config",
    "default_timeout",
    "defaults",
    "dimensions",
    "recipe",
    "try_builder_base",
)
load("//definitions.star", "legacy_recipe", "versions")
load("//lib/siso.star", "SISO")

BUCKET_NAME = "try"

bucket(
    name = BUCKET_NAME,
    acls = [
        acls.readers,
        acl.entry(
            roles = acl.BUILDBUCKET_TRIGGERER,
            groups = [
                "project-devtools-tryjob-access",
                "service-account-cq",
            ],
            users = [TRY_ACCOUNT],
        ),
    ],
    led_service_accounts = [TRY_ACCOUNT],
    builders_can_led_trigger = True,
)

try_builders = []

def try_builder(properties = None, legacy_variant = False, **kwargs):
    try_builder_base(properties = properties, **kwargs)
    try_builders.append(kwargs["name"])

    if legacy_variant:
        kwargs["name"] = "%s_legacy_%s" % (kwargs["name"], legacy_recipe.branch)
        kwargs["recipe_cipd_version"] = legacy_recipe.old_cipd_version
        if properties and "compilator_name" in properties:
            properties["compilator_name"] = "%s_legacy_%s" % (properties["compilator_name"], legacy_recipe.branch)
        try_builder_base(properties = properties, **kwargs)
        try_builders.append(kwargs["name"])

def presubmit_builder(name, dimensions, **kvargs):
    try_builder(
        name = name,
        recipe_name = "run_presubmit",
        dimensions = dimensions,
        properties = {
            "runhooks": True,
            "solution_name": "devtools-frontend",
        },
        priority = 25,
        execution_timeout = 10 * time.minute,
        **kvargs
    )

presubmit_builder("dtf_presubmit", dimensions.default_ubuntu)

try_builder(
    name = "devtools_frontend_linux_blink_light_rel",
    recipe_name = "chromium_trybot",
    dimensions = dimensions.beefy_ubuntu,
    execution_timeout = 2 * time.hour,
    build_numbers = True,
    use_siso = SISO.CHROMIUM_UNTRUSTED,
)

try_builder(
    name = "devtools_frontend_linux_blink_light_rel_fastbuild",
    recipe_name = "chromium_trybot",
    dimensions = dimensions.beefy_ubuntu,
    execution_timeout = 2 * time.hour,
    build_numbers = True,
    use_siso = SISO.CHROMIUM_UNTRUSTED,
    description_html = """
This is the same with <a href="https://ci.chromium.org/p/devtools-frontend/builders/try/devtools_frontend_linux_blink_light_rel">
devtools_frontend_linux_blink_light_rel</a> but has
devtools_skip_typecheck=True.""",
)

try_builder(
    name = "dtf_check_no_bundle",
    recipe_name = "devtools/compilator",
    dimensions = dimensions.default_ubuntu,
    build_numbers = True,
    use_siso = SISO.CHROMIUM_UNTRUSTED,
    properties = {
        "devtools_bundle": False,
    },
    legacy_variant = True,
)

builder_coverage(
    covered_oss = ["mac_arm64"],
    builder_factory = try_builder,
    builder_name_pattern = "devtools_frontend_%s_rel",
    recipe_name = "devtools/devtools-frontend",
    execution_timeout = default_timeout,
)

def try_pair(
        name,
        suffix,
        compiler_dimensions,
        swarming_target_os,
        swarming_target_cpu,
        properties = None,
        legacy_variant = False):
    compilator_name = "%s_compile_%s" % (name, suffix)
    tester_properties = properties or {}
    tester_properties.update({
        "compilator_name": compilator_name,
        "target_os": swarming_target_os,
        "target_cpu": swarming_target_cpu,
    })
    try_builder(
        name = "%s_%s" % (name, suffix),
        recipe_name = "devtools/trybot_tester",
        dimensions = dimensions.multibot,
        build_numbers = True,
        properties = tester_properties,
        legacy_variant = legacy_variant,
    )
    try_builder(
        name = compilator_name,
        recipe_name = "devtools/compilator",
        dimensions = compiler_dimensions,
        build_numbers = True,
        use_siso = SISO.CHROMIUM_UNTRUSTED,
        properties = properties,
        legacy_variant = legacy_variant,
    )

try_pair("dtf_linux", "rel", dimensions.default_ubuntu, "Ubuntu-22.04", "x86-64", legacy_variant = True)
try_pair("dtf_win64", "rel", dimensions.win10, "Windows-10-19045", "x86-64", legacy_variant = True)
try_pair("dtf_mac_arm64", "rel", dimensions.mac_arm64, "Mac-15", "arm64", legacy_variant = True)
try_pair("dtf_mac_cross", "rel", dimensions.mac, "Mac-15", "arm64", properties = {"force_host_cpu": "arm64"})
try_pair(
    "dtf_linux",
    "dbg",
    dimensions.default_ubuntu,
    "Ubuntu-22.04",
    "x86-64",
    properties = {"builder_config": "Debug"},
    legacy_variant = True,
)
try_pair(
    "dtf_linux",
    "dbg_fastbuild",
    dimensions.default_ubuntu,
    "Ubuntu-22.04",
    "x86-64",
    properties = {
        "builder_config": "Debug",
        "devtools_skip_typecheck": True,
    },
    legacy_variant = True,
)

def cpp_debug_extension_try(suffix, extra_properties):
    properties = extra_properties or {}
    luci.builder(
        name = "cpp_debug_extension_%s" % suffix,
        bucket = "try",
        executable = recipe("devtools/backend"),
        service_account = TRY_ACCOUNT,
        dimensions = dimensions.default_ubuntu,
        properties = dict(
            upload_dwarf_binary = False,
            **properties
        ),
        build_numbers = True,
    )

cpp_debug_extension_try("e2e_dbg", extra_properties = {"e2e_builder": True, "builder_config": "Debug"})
cpp_debug_extension_try("e2e_rel", extra_properties = {"e2e_builder": True, "builder_config": "Release"})

luci.list_view(
    name = "tryserver",
    title = "Tryserver",
    favicon = defaults.favicon,
    entries = [luci.list_view_entry(builder = b) for b in try_builders],
)

cq_builders = struct(
    devtools_builders = [
        "cpp_debug_extension_e2e_dbg",
        "cpp_debug_extension_e2e_rel",
        "dtf_check_no_bundle",
        "dtf_linux_dbg",
        "dtf_linux_dbg_fastbuild",
        "dtf_linux_rel",
        "dtf_mac_arm64_rel",
        "dtf_mac_cross_rel",
        "dtf_win64_rel",
        "dtf_presubmit",
    ],
    chromium_builders = [
        "devtools_frontend_linux_blink_light_rel",
        "devtools_frontend_linux_blink_light_rel_fastbuild",
    ],
    experiment_builders = {
        # Quarantine a builder here
        # This will make them experiment with the given percentage
    },
    includable_only_builders = [
        "dtf_mac_cross_rel",
        "devtools_frontend_linux_blink_light_rel",
        "devtools_frontend_shuffled_linux_rel",
        "devtools_frontend_shuffled_mac_rel",
        "devtools_frontend_shuffled_win64_rel",
    ],
    # Builders that potentially need a legacy recipe
    has_legacy_variant = [
        "dtf_check_no_bundle",
        "dtf_linux_dbg",
        "dtf_linux_dbg_fastbuild",
        "dtf_linux_rel",
        "dtf_mac_arm64_rel",
        "dtf_win64_rel",
    ],
)

def experiment_builder(builder):
    return cq_builders.experiment_builders.get(builder, None)

def includable_only_builder(builder):
    return builder in cq_builders.includable_only_builders

def branch_verifiers(with_chromium = True, branch = None):
    def use_variant(builder):
        return (branch and
                (int(versions[branch]) <= int(legacy_recipe.branch)) and
                (builder in cq_builders.has_legacy_variant))

    return [
        luci.cq_tryjob_verifier(
            builder = builder if not use_variant(builder) else "%s_legacy_%s" % (builder, legacy_recipe.branch),
            disable_reuse = ("presubmit" in builder),
            experiment_percentage = experiment_builder(builder),
            includable_only = includable_only_builder(builder),
            location_filters = custom_locationsfilters(builder),
        )
        for builder in cq_builders.devtools_builders + (
            cq_builders.chromium_builders if with_chromium else []
        )
    ]

def custom_locationsfilters(builder):
    if includable_only_builder(builder):
        return None
    if builder.startswith("cpp_debug_extension"):
        return [
            cq.location_filter(path_regexp = "extensions/cxx_debugging/.+", exclude = False),
            cq.location_filter(path_regexp = "node_modules/.+", exclude = False),
            cq.location_filter(path_regexp = "third_party/.+", exclude = False),
            cq.location_filter(path_regexp = "DEPS", exclude = False),
        ]
    if builder == "dtf_check_no_bundle":
        return [
            cq.location_filter(path_regexp = ".+BUILD\\.gn", exclude = False),
            cq.location_filter(path_regexp = ".+\\.gni", exclude = False),
        ]
    return [
        cq.location_filter(path_regexp = "docs/.+", exclude = True),
        cq.location_filter(path_regexp = ".+\\.md", exclude = True),
        cq.location_filter(path_regexp = "\\.github/.+", exclude = True),
        cq.location_filter(path_regexp = "scripts/ai_assistance/.+", exclude = True),
        cq.location_filter(path_regexp = ".gemini/.+", exclude = True),
    ]

luci.cq_group(
    name = "main",
    watch = cq.refset(
        repo = "https://chromium.googlesource.com/devtools/devtools-frontend",
        refs = ["refs/heads/main"],
    ),
    acls = cq_acls,
    tree_status_host = "devtools-status.appspot.com",
    retry_config = cq_retry_config,
    verifiers = branch_verifiers(),
)

luci.cq_group(
    name = "infra_config",
    watch = cq.refset(
        repo = "https://chromium.googlesource.com/devtools/devtools-frontend",
        refs = ["refs/heads/infra/config"],
    ),
    acls = cq_acls,
    retry_config = cq_retry_config,
    verifiers = [
        luci.cq_tryjob_verifier(builder = "dtf_presubmit", disable_reuse = True),
    ],
)

def branch_cq():
    # Create separate CQ groups if any branch needs a legacy recipe.

    def cq_group(branch = "", ref_suffix = ".+"):
        luci.cq_group(
            name = "branch-cq%s" % ("-%s" % branch if branch else ""),
            watch = cq.refset(
                repo = "https://chromium.googlesource.com/devtools/devtools-frontend",
                refs = ["refs/heads/chromium/%s" % ref_suffix],
            ),
            retry_config = cq_retry_config,
            acls = cq_acls,
            verifiers = branch_verifiers(with_chromium = False, branch = branch),
        )

    def any_branch_needs_legacy():
        for branch in versions.keys():
            if int(versions[branch]) <= int(legacy_recipe.branch):
                return True
        return False

    # If none of the branches need a legacy recipe, create a single CQ group.
    if any_branch_needs_legacy():
        for branch in versions.keys():
            cq_group(branch, versions[branch])
    else:
        cq_group()

branch_cq()
