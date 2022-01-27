load(
    "//lib/builders.star",
    "acls",
    "builder",
    "builder_coverage",
    "cq_acls",
    "cq_retry_config",
    "default_timeout",
    "defaults",
    "dimensions",
)

BUCKET_NAME = "try"
SERVICE_ACCOUNT = "devtools-frontend-try-builder@chops-service-accounts.iam.gserviceaccount.com"

luci.bucket(
    name = BUCKET_NAME,
    acls = [
        acls.readers,
        acl.entry(
            roles = acl.BUILDBUCKET_TRIGGERER,
            groups = [
                "project-devtools-tryjob-access",
                "service-account-cq",
            ],
        ),
    ],
)

try_builders = []

def try_builder(**kwargs):
    builder(
        bucket = BUCKET_NAME,
        builder_group = "tryserver.devtools-frontend",
        service_account = SERVICE_ACCOUNT,
        **kwargs
    )
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
        execution_timeout = 5 * time.minute,
        **kvargs
    )

builder_coverage(
    covered_oss = ["linux", "win64"],
    builder_factory = presubmit_builder,
    builder_name_pattern = "dtf_presubmit_%s",
)

try_builder(
    name = "devtools_frontend_linux_blink_rel",
    recipe_name = "chromium_trybot",
    dimensions = dimensions.default_ubuntu,
    execution_timeout = 2 * time.hour,
    build_numbers = True,
)

try_builder(
    name = "devtools_frontend_linux_blink_light_rel",
    recipe_name = "chromium_trybot",
    dimensions = dimensions.beefy_ubuntu,
    execution_timeout = 2 * time.hour,
    build_numbers = True,
)

try_builder(
    name = "devtools_frontend_linux_blink_light_rel_fastbuild",
    recipe_name = "chromium_trybot",
    dimensions = dimensions.beefy_ubuntu,
    execution_timeout = 2 * time.hour,
    build_numbers = True,
    description_html = """
This is the same with <a href="https://ci.chromium.org/p/devtools-frontend/builders/try/devtools_frontend_linux_blink_light_rel">
devtools_frontend_linux_blink_light_rel</a> but has
devtools_skip_typecheck=True.""",
)

try_builder(
    name = "devtools_frontend_linux_dbg_fastbuild",
    recipe_name = "devtools/devtools-frontend",
    dimensions = dimensions.default_ubuntu,
    execution_timeout = default_timeout,
    properties = {
        "builder_config": "Debug",
        "devtools_skip_typecheck": True,
    },
    description_html = """
This is the same with <a href="https://ci.chromium.org/p/devtools-frontend/builders/try/devtools_frontend_linux_dbg">
devtools_frontend_linux_dbg</a> but has devtools_skip_typecheck=True.""",
)

builder_coverage(
    covered_oss = ["linux", "win64", "mac"],
    builder_factory = try_builder,
    builder_name_pattern = "dtf_%s_experiments",
    recipe_name = "devtools/devtools-frontend",
    execution_timeout = default_timeout,
    build_numbers = True,
    properties = {"run_experimental_steps": True},
)

builder_coverage(
    covered_oss = ["linux", "mac"],
    builder_factory = try_builder,
    builder_name_pattern = "devtools_frontend_%s_rel",
    recipe_name = "devtools/devtools-frontend",
    execution_timeout = default_timeout,
)

builder_coverage(
    covered_oss = ["win64"],
    builder_factory = try_builder,
    builder_name_pattern = "devtools_frontend_%s_rel",
    recipe_name = "devtools/devtools-frontend",
    execution_timeout = default_timeout + 15 * time.minute,
)

builder_coverage(
    covered_oss = ["linux"],
    builder_factory = try_builder,
    builder_name_pattern = "devtools_frontend_%s_dbg",
    recipe_name = "devtools/devtools-frontend",
    execution_timeout = default_timeout,
    properties = {"builder_config": "Debug"},
)

builder_coverage(
    covered_oss = ["linux", "win64", "mac"],
    builder_factory = try_builder,
    builder_name_pattern = "e2e_stressor_%s",
    recipe_name = "devtools/devtools-frontend",
    execution_timeout = default_timeout,
    properties = {"builder_config": "Debug"},
)

luci.list_view(
    name = "tryserver",
    title = "Tryserver",
    favicon = defaults.favicon,
    entries = [luci.list_view_entry(builder = b) for b in try_builders],
)

cq_main = struct(
    builders = [
        "devtools_frontend_linux_blink_light_rel",
        "devtools_frontend_linux_blink_light_rel_fastbuild",
        "devtools_frontend_linux_dbg",
        "devtools_frontend_linux_dbg_fastbuild",
        "devtools_frontend_linux_rel",
        "devtools_frontend_mac_rel",
        "devtools_frontend_win64_rel",
        "dtf_presubmit_linux",
        "dtf_presubmit_win64",
    ],
    experiment_builders = [
        # Quarantine a builder here
        # This will make them experiment 100%

        # TODO(crbug.com/1278663): promote these 2 to non-experimental.
        "devtools_frontend_linux_blink_light_rel_fastbuild",
        "devtools_frontend_linux_dbg_fastbuild",
    ],
    includable_only_builders = [
        "devtools_frontend_mac_rel",
    ],
)

def experiment_builder(builder):
    if builder in cq_main.experiment_builders:
        return 100
    else:
        return None

def includable_only_builder(builder):
    return builder in cq_main.includable_only_builders

luci.cq_group(
    name = "main",
    watch = cq.refset(
        repo = "https://chromium.googlesource.com/devtools/devtools-frontend",
        refs = ["refs/heads/main"],
    ),
    acls = cq_acls,
    tree_status_host = "devtools-status.appspot.com",
    retry_config = cq_retry_config,
    verifiers = [
        luci.cq_tryjob_verifier(
            builder = builder,
            disable_reuse = ("presubmit" in builder),
            experiment_percentage = experiment_builder(builder),
            includable_only = includable_only_builder(builder),
        )
        for builder in cq_main.builders
    ],
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
        luci.cq_tryjob_verifier(builder = "dtf_presubmit_linux", disable_reuse = True),
    ],
)
