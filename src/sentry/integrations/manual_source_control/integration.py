from uuid import uuid4

from django import forms
from django.utils.translation import ugettext_lazy as _

from sentry.integrations import (
    FeatureDescription,
    IntegrationFeatures,
    IntegrationInstallation,
    IntegrationMetadata,
    IntegrationProvider,
)
from sentry.integrations.repositories import RepositoryMixin
from sentry.models.repository import Repository
from sentry.pipeline import PipelineView
from sentry.web.helpers import render_to_response

from .repository import ManualSourceControlRepositoryProvider

DESCRIPTION = """
Manual Source Code Control
"""

FEATURES = [
    FeatureDescription(
        """
        Send your own commits
        """,
        IntegrationFeatures.COMMITS,
    ),
    FeatureDescription(
        """
        Stack trace linky dink
        """,
        IntegrationFeatures.STACKTRACE_LINK,
    ),
]

metadata = IntegrationMetadata(
    description=DESCRIPTION.strip(),
    features=FEATURES,
    author="The Sentry Team",
    noun=_("Installation"),
    issue_url="https://github.com/getsentry/sentry/issues/",
    source_url="https://github.com/getsentry/sentry/tree/master/src/sentry/integrations/manual_source_control",
    aspects={},
)


class ManualSourceControlIntegration(IntegrationInstallation, RepositoryMixin):
    def get_client(self):
        pass

    def get_repositories(self, query=None):
        """
        Used to get any repositories that are not already tied
        to an integration.
        """
        repos = Repository.objects.filter(
            organization_id=self.organization_id,
            provider__isnull=True,
            integration_id__isnull=True,
            status=0,
        )
        return [{"name": repo.name, "identifier": repo.id} for repo in repos]


class InstallationForm(forms.Form):
    name = forms.CharField(
        label=_("Name"),
        help_text=_(
            "The name for your integration."
            "<br>"
            "If you are using GitHub, use the organization name."
        ),
    )
    url = forms.CharField(
        label=_("URL"),
        help_text=_(
            "The base URL for your instance, including the host and protocol. "
            "<br>"
            "If using github.com, enter https://github.com/"
        ),
        widget=forms.TextInput(attrs={"placeholder": "https://github.com/"}),
    )


class InstallationConfigView(PipelineView):
    def dispatch(self, request, pipeline):
        if request.method == "POST":
            form = InstallationForm(request.POST)
            if form.is_valid():
                form_data = form.cleaned_data

                pipeline.bind_state("installation_data", form_data)

                return pipeline.next_step()
        else:
            form = InstallationForm()

        return render_to_response(
            template="sentry/integrations/manual-source-control-config.html",
            context={"form": form},
            request=request,
        )


class ManualSourceControlIntegrationProvider(IntegrationProvider):
    key = "manual_source_control"
    name = "Manual Source Control"
    metadata = metadata
    integration_cls = ManualSourceControlIntegration
    features = frozenset([IntegrationFeatures.COMMITS, IntegrationFeatures.STACKTRACE_LINK])

    def get_pipeline_views(self):
        return [InstallationConfigView()]

    def build_integration(self, state):
        name = state["installation_data"]["name"]
        url = state["installation_data"]["url"]
        # normally the external_id would be something unique
        # across organizations, but for now there can just be
        # separate integrations for separate organizations
        external_id = uuid4().hex

        return {
            "name": name,
            "external_id": external_id,
            "metadata": {"domain_name": f"{url}{name}"},
        }

    def setup(self):
        from sentry.plugins.base import bindings

        bindings.add(
            "integration-repository.provider",
            ManualSourceControlRepositoryProvider,
            id="integrations:manual_source_control",
        )
