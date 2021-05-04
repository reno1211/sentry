import logging

from django.db import models
from django.utils import timezone

from bitfield import BitField
from sentry.db.models import (
    BoundedPositiveIntegerField,
    EncryptedJsonField,
    FlexibleForeignKey,
    Model,
    sane_repr,
)

logger = logging.getLogger("sentry.authprovider")

SCIM_INTERNAL_INTEGRATION_OVERVIEW = (
    "This internal integration was auto-generated during the installation process of your SCIM "
    "integration. It is needed to provide the token used provision users and groups. If this integration is "
    "deleted, your SCIM integration will stop working!"
)


class AuthProvider(Model):
    __core__ = True

    organization = FlexibleForeignKey("sentry.Organization", unique=True)
    provider = models.CharField(max_length=128)
    config = EncryptedJsonField()

    date_added = models.DateTimeField(default=timezone.now)
    sync_time = BoundedPositiveIntegerField(null=True)
    last_sync = models.DateTimeField(null=True)

    default_role = BoundedPositiveIntegerField(default=50)
    default_global_access = models.BooleanField(default=True)
    # TODO(dcramer): ManyToMany has the same issue as ForeignKey and we need
    # to either write our own which works w/ BigAuto or switch this to use
    # through.
    default_teams = models.ManyToManyField("sentry.Team", blank=True)

    flags = BitField(
        flags=(
            ("allow_unlinked", "Grant access to members who have not linked SSO accounts."),
            ("scim_enabled", "Enable SCIM for user and group provisioning and syncing"),
        ),
        default=0,
    )

    class Meta:
        app_label = "sentry"
        db_table = "sentry_authprovider"

    __repr__ = sane_repr("organization_id", "provider")

    def __str__(self):
        return self.provider

    def get_provider(self):
        from sentry.auth import manager

        return manager.get(self.provider, **self.config)

    def get_scim_token(self):
        from sentry.models import SentryAppInstallationForProvider

        if self.flags.scim_enabled:
            return SentryAppInstallationForProvider.get_token(
                self.organization, f"{self.provider}_scim"
            )
        else:
            return None

    def get_scim_url(self):
        if self.flags.scim_enabled:
            return f"https://sentry.io/scim/{self.organization.slug}/scim/v2"
            # TODO: make dynamic once URL routes are added
        else:
            return None

    def enable_scim(self, user):
        from sentry.mediators.sentry_apps import InternalCreator
        from sentry.models import SentryAppInstallation, SentryAppInstallationForProvider

        if (
            not self.get_provider().can_use_scim(self.organization, user)
            or self.flags.scim_enabled is True
        ):
            return

        # check if we have a scim app already

        if SentryAppInstallationForProvider.objects.filter(
            organization=self.organization, provider="okta_scim"
        ).exists():
            logger.info(
                "scim_installation_exists",
                extra={"organization_id": self.organization.id},
            )
            return

        data = {
            "name": "SCIM Internal Integration",
            "author": "Auto-generated by Sentry",
            "organization": self.organization,
            "overview": SCIM_INTERNAL_INTEGRATION_OVERVIEW,
            "user": user,
            "scopes": [
                "member:read",
                "member:write",
                "member:admin",
                "team:write",
                "org:write",
                "org:admin",
            ],
        }
        # create the internal integration and link it to the join table
        sentry_app = InternalCreator.run(**data)
        sentry_app_installation = SentryAppInstallation.objects.get(sentry_app=sentry_app)
        SentryAppInstallationForProvider.objects.create(
            sentry_app_installation=sentry_app_installation,
            organization=self.organization,
            provider=f"{self.provider}_scim",
        )
        self.flags.scim_enabled = True

    def disable_scim(self, user):
        from sentry.mediators.sentry_apps import Destroyer
        from sentry.models import SentryAppInstallationForProvider

        if self.flags.scim_enabled:
            install = SentryAppInstallationForProvider.objects.get(
                organization=self.organization, provider=f"{self.provider}_scim"
            )
            Destroyer.run(sentry_app=install.sentry_app_installation.sentry_app, user=user)
            self.flags.scim_enabled = False

    def get_audit_log_data(self):
        return {"provider": self.provider, "config": self.config}
