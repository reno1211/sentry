# -*- coding: utf-8 -*-

from __future__ import absolute_import

import six

from sentry.api.serializers import serialize
from sentry.api.serializers.models.user import DetailedUserSerializer
from sentry.testutils import TestCase
from sentry.models import AuthIdentity, AuthProvider, Authenticator, UserEmail, UserPermission
from sentry.models.authenticator import available_authenticators


class UserSerializerTest(TestCase):
    def test_simple(self):
        user = self.create_user()

        result = serialize(user)
        assert result['id'] == six.text_type(user.id)
        assert result['has2fa'] is False

        Authenticator.objects.create(
            type=available_authenticators(ignore_backup=True)[0].type,
            user=user,
        )

        result = serialize(user)
        assert result['id'] == six.text_type(user.id)
        assert result['has2fa'] is True
        assert len(result['emails']) == 1
        assert result['emails'][0]['email'] == user.email
        assert result['emails'][0]['is_verified']

    def test_no_useremail(self):
        user = self.create_user()

        UserEmail.objects.all().delete()
        assert UserEmail.objects.all().count() == 0

        result = serialize(user)
        assert len(result['emails']) == 0

    def test_self_permissions(self):
        user = self.create_user()
        UserPermission.objects.create(user=user, permission='foo')

        result = serialize(user, user)
        assert result['id'] == six.text_type(user.id)
        assert result['permissions'] == ['foo']


class DetailedUserSerializerTest(TestCase):
    def test_simple(self):
        user = self.create_user()

        org = self.create_organization(owner=user)

        auth_provider = AuthProvider.objects.create(
            organization=org,
            provider='dummy',
        )
        auth_identity = AuthIdentity.objects.create(
            auth_provider=auth_provider,
            ident=user.email,
            user=user,
        )
        auth = Authenticator.objects.create(
            type=available_authenticators(ignore_backup=True)[0].type,
            user=user,
        )

        result = serialize(user, user, DetailedUserSerializer())
        assert result['id'] == six.text_type(user.id)
        assert result['has2fa'] is True
        assert len(result['emails']) == 1
        assert result['emails'][0]['email'] == user.email
        assert result['emails'][0]['is_verified']
        assert 'identities' in result
        assert len(result['identities']) == 1
        assert result['identities'][0]['id'] == six.text_type(auth_identity.id)
        assert result['identities'][0]['name'] == auth_identity.ident
        assert 'authenticators' in result
        assert len(result['authenticators']) == 1
        assert result['authenticators'][0]['id'] == six.text_type(auth.id)
