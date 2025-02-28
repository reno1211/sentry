import {updateUser} from 'app/actionCreators/account';
import {APIRequestMethod} from 'app/api';
import AvatarChooser from 'app/components/avatarChooser';
import accountDetailsFields from 'app/data/forms/accountDetails';
import accountPreferencesFields from 'app/data/forms/accountPreferences';
import {t} from 'app/locale';
import {User} from 'app/types';
import AsyncView from 'app/views/asyncView';
import Form from 'app/views/settings/components/forms/form';
import JsonForm from 'app/views/settings/components/forms/jsonForm';
import SettingsPageHeader from 'app/views/settings/components/settingsPageHeader';

const ENDPOINT = '/users/me/';

class AccountDetails extends AsyncView {
  getEndpoints(): ReturnType<AsyncView['getEndpoints']> {
    // local state is NOT updated when the form saves
    return [['user', ENDPOINT]];
  }

  handleSubmitSuccess = (user: User) => {
    // the updateUser method updates our Config Store
    // No components listen to the ConfigStore, they just access it directly
    updateUser(user);
    // We need to update the state, because AvatarChooser is using it,
    // otherwise it will flick
    this.setState({
      user,
    });
  };

  renderBody() {
    const user = this.state.user as User;
    const {location} = this.props;

    const formCommonProps: Partial<Form['props']> = {
      apiEndpoint: ENDPOINT,
      apiMethod: 'PUT' as APIRequestMethod,
      allowUndo: true,
      saveOnBlur: true,
      onSubmitSuccess: this.handleSubmitSuccess,
    };

    return (
      <div>
        <SettingsPageHeader title={t('Account Details')} />
        <Form initialData={user} {...formCommonProps}>
          <JsonForm
            location={location}
            forms={accountDetailsFields}
            additionalFieldProps={{user}}
          />
        </Form>
        <Form initialData={user.options} {...formCommonProps}>
          <JsonForm
            location={location}
            forms={accountPreferencesFields}
            additionalFieldProps={{user}}
          />
        </Form>
        <AvatarChooser
          endpoint="/users/me/avatar/"
          model={user}
          onSave={resp => {
            this.handleSubmitSuccess(resp as User);
          }}
          isUser
        />
      </div>
    );
  }
}

export default AccountDetails;
