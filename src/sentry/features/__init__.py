from .base import *  # NOQA
from .handler import *  # NOQA
from .manager import *  # NOQA

# The feature flag system provides a way to turn on or off features of Sentry.
#
# Registering a new feature:
#
# - Determine what scope your feature falls under. By convention we have a
#   organizations and project scope which map to the OrganizationFeature and
#   ProjectFeature feature objects. Scoping will provide the feature with
#   context.
#
#   Organization and Project scoped features will automatically be added into
#   the Organization and Project serialized representations.
#
#   Additional feature contexts can be found under the features.base module,
#   but you will typically deal with the organization or project.
#
#   NOTE: There is no currently established convention for features which do not
#         fall under these scopes. Use your best judgment for these.
#
# - Set a default for your features.
#
#   Feature defaults are configured in the sentry.conf.server.SENTRY_FEATURES
#   module variable. This is the DEFAULT value for a feature, the default may be
#   overridden by the logic in the exposed feature.manager.FeatureManager
#   instance. See the ``has`` method here for a detailed understanding of how
#   the default values is overridden.
#
# - Use your feature.
#
#   You can check if a feature is enabled using the following call:
#
#   >>> features.has('organization:my-feature', organization, actor=user)
#
#   NOTE: The second parameter is used to provide the feature context, again
#         organization and project are the most common, but it is possible that
#         other Feature objects may require more arguments.
#
#   NOTE: The actor kwarg should be passed when it's expected that the handler
#         needs context of the user.
#
#   NOTE: Features that require Snuba to function, add to the
#         `requires_snuba` tuple.

default_manager = FeatureManager()  # NOQA

# Unscoped features
default_manager.add("auth:register")
default_manager.add("organizations:create")

# Organization scoped features
default_manager.add("organizations:advanced-search", OrganizationFeature)  # NOQA
default_manager.add("organizations:alert-details-redesign", OrganizationFeature, True)  # NOQA
default_manager.add("organizations:alert-filters", OrganizationFeature)  # NOQA
default_manager.add("organizations:alert-wizard", OrganizationFeature, True)  # NOQA
default_manager.add("organizations:api-keys", OrganizationFeature)  # NOQA
default_manager.add("organizations:boolean-search", OrganizationFeature)  # NOQA
default_manager.add("organizations:chart-unfurls", OrganizationFeature, True)  # NOQA
default_manager.add("organizations:custom-event-title", OrganizationFeature)  # NOQA
default_manager.add("organizations:custom-symbol-sources", OrganizationFeature)  # NOQA
default_manager.add("organizations:dashboards-basic", OrganizationFeature)  # NOQA
default_manager.add("organizations:dashboards-edit", OrganizationFeature)  # NOQA
default_manager.add("organizations:dashboards-manage", OrganizationFeature, True)  # NOQA
default_manager.add("organizations:data-forwarding", OrganizationFeature)  # NOQA
default_manager.add("organizations:discover", OrganizationFeature)  # NOQA
default_manager.add("organizations:discover-basic", OrganizationFeature)  # NOQA
default_manager.add("organizations:discover-query", OrganizationFeature)  # NOQA
default_manager.add("organizations:enterprise-perf", OrganizationFeature)  # NOQA
default_manager.add("organizations:event-attachments", OrganizationFeature)  # NOQA
default_manager.add("organizations:event-attachments-viewer", OrganizationFeature)  # NOQA
default_manager.add("organizations:events", OrganizationFeature)  # NOQA
default_manager.add("organizations:filters-and-sampling", OrganizationFeature, True)  # NOQA
default_manager.add("organizations:global-views", OrganizationFeature)  # NOQA
default_manager.add("organizations:grouping-tree-ui", OrganizationFeature, True)  # NOQA
default_manager.add("organizations:images-loaded-v2", OrganizationFeature)  # NOQA
default_manager.add("organizations:import-codeowners", OrganizationFeature, True)  # NOQA
default_manager.add("organizations:inbox", OrganizationFeature, True)  # NOQA
default_manager.add("organizations:incidents", OrganizationFeature)  # NOQA
default_manager.add("organizations:integrations-alert-rule", OrganizationFeature)  # NOQA
default_manager.add("organizations:integrations-chat-unfurl", OrganizationFeature)  # NOQA
default_manager.add("organizations:integrations-event-hooks", OrganizationFeature)  # NOQA
default_manager.add("organizations:integrations-incident-management", OrganizationFeature)  # NOQA
default_manager.add("organizations:integrations-issue-basic", OrganizationFeature)  # NOQA
default_manager.add("organizations:integrations-issue-sync", OrganizationFeature)  # NOQA
default_manager.add("organizations:integrations-stacktrace-link", OrganizationFeature)  # NOQA
default_manager.add("organizations:integrations-ticket-rules", OrganizationFeature, True)  # NOQA
default_manager.add("organizations:integrations-vsts-limited-scopes", OrganizationFeature)  # NOQA
default_manager.add("organizations:internal-catchall", OrganizationFeature)  # NOQA
default_manager.add("organizations:invite-members", OrganizationFeature)  # NOQA
default_manager.add("organizations:invite-members-rate-limits", OrganizationFeature)  # NOQA
default_manager.add("organizations:issue-list-trend-sort", OrganizationFeature, True)  # NOQA
default_manager.add("organizations:large-debug-files", OrganizationFeature)  # NOQA
default_manager.add("organizations:metric-alert-builder-aggregate", OrganizationFeature)  # NOQA
default_manager.add("organizations:metrics", OrganizationFeature, True)  # NOQA
default_manager.add("organizations:metrics-extraction", OrganizationFeature)  # NOQA
default_manager.add("organizations:minute-resolution-sessions", OrganizationFeature)  # NOQA
default_manager.add("organizations:monitors", OrganizationFeature)  # NOQA
default_manager.add("organizations:notification-platform", OrganizationFeature, True)  # NOQA
default_manager.add("organizations:onboarding", OrganizationFeature)  # NOQA
default_manager.add("organizations:org-saved-searches", OrganizationFeature)  # NOQA
default_manager.add("organizations:org-subdomains", OrganizationFeature)  # NOQA
default_manager.add("organizations:performance-ops-breakdown", OrganizationFeature)  # NOQA
default_manager.add("organizations:performance-tag-explorer", OrganizationFeature, True)  # NOQA
default_manager.add("organizations:performance-view", OrganizationFeature)  # NOQA
default_manager.add("organizations:related-events", OrganizationFeature)  # NOQA
default_manager.add("organizations:relay", OrganizationFeature)  # NOQA
default_manager.add("organizations:reprocessing-v2", OrganizationFeature)  # NOQA
default_manager.add("organizations:rule-page", OrganizationFeature)  # NOQA
default_manager.add("organizations:set-grouping-config", OrganizationFeature)  # NOQA
default_manager.add("organizations:slack-migration", OrganizationFeature)  # NOQA
default_manager.add("organizations:sso-basic", OrganizationFeature)  # NOQA
default_manager.add("organizations:sso-migration", OrganizationFeature)  # NOQA
default_manager.add("organizations:sso-rippling", OrganizationFeature)  # NOQA
default_manager.add("organizations:sso-saml2", OrganizationFeature)  # NOQA
default_manager.add("organizations:symbol-sources", OrganizationFeature)  # NOQA
default_manager.add("organizations:team-alerts-ownership", OrganizationFeature, True)  # NOQA
default_manager.add("organizations:trace-view-quick", OrganizationFeature, True)  # NOQA
default_manager.add("organizations:trace-view-summary", OrganizationFeature, True)  # NOQA
default_manager.add("organizations:transaction-comparison", OrganizationFeature, True)  # NOQA
default_manager.add("organizations:unhandled-issue-flag", OrganizationFeature)  # NOQA
default_manager.add("organizations:usage-stats-graph", OrganizationFeature, True)  # NOQA
default_manager.add("organizations:prompt-dashboards", OrganizationFeature)  # NOQA
default_manager.add("organizations:performance-tag-page", OrganizationFeature, True)  # NOQA
default_manager.add("organizations:performance-mobile-vitals", OrganizationFeature, True)  # NOQA
default_manager.add("organizations:discover-arithmetic", OrganizationFeature, True)  # NOQA
default_manager.add("organizations:transaction-events", OrganizationFeature, True)  # NOQA
default_manager.add("organizations:unified-span-view", OrganizationFeature, True)  # NOQA
default_manager.add("organizations:team-key-transactions", OrganizationFeature, True)  # NOQA
# NOTE: Don't add features down here! Add them to their specific group and sort
#       them alphabetically! The order features are registered is not important.

# Project scoped features
default_manager.add("projects:alert-filters", ProjectFeature)  # NOQA
default_manager.add("projects:custom-inbound-filters", ProjectFeature)  # NOQA
default_manager.add("projects:data-forwarding", ProjectFeature)  # NOQA
default_manager.add("projects:discard-groups", ProjectFeature)  # NOQA
default_manager.add("projects:issue-alerts-targeting", ProjectFeature)  # NOQA
default_manager.add("projects:minidump", ProjectFeature)  # NOQA
default_manager.add("projects:race-free-group-creation", ProjectFeature)  # NOQA
default_manager.add("projects:rate-limits", ProjectFeature)  # NOQA
default_manager.add("projects:sample-events", ProjectFeature)  # NOQA
default_manager.add("projects:servicehooks", ProjectFeature)  # NOQA
default_manager.add("projects:similarity-indexing", ProjectFeature)  # NOQA
default_manager.add("projects:similarity-indexing-v2", ProjectFeature)  # NOQA
default_manager.add("projects:similarity-view", ProjectFeature)  # NOQA
default_manager.add("projects:similarity-view-v2", ProjectFeature)  # NOQA

# Project plugin features
default_manager.add("projects:plugins", ProjectPluginFeature)  # NOQA

# This is a gross hardcoded list, but there's no
# other sensible way to manage this right now without augmenting
# features themselves in the manager with detections like this.
requires_snuba = (
    "organizations:discover",
    "organizations:events",
    "organizations:performance-view",
    "organizations:global-views",
    "organizations:incidents",
    "organizations:minute-resolution-sessions",
)

# expose public api
add = default_manager.add
entity_features = default_manager.entity_features
get = default_manager.get
has = default_manager.has
batch_has = default_manager.batch_has
all = default_manager.all
add_handler = default_manager.add_handler
add_entity_handler = default_manager.add_entity_handler
has_for_batch = default_manager.has_for_batch
