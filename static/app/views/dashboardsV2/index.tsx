import React from 'react';
import {RouteComponentProps} from 'react-router';

import {Client} from 'app/api';
import Feature from 'app/components/acl/feature';
import NotFound from 'app/components/errors/notFound';
import LoadingIndicator from 'app/components/loadingIndicator';
import {Organization} from 'app/types';
import withApi from 'app/utils/withApi';
import withOrganization from 'app/utils/withOrganization';

import DashboardDetail from './detail';
import OrgDashboards from './orgDashboards';

type Props = RouteComponentProps<{orgId: string}, {}> & {
  api: Client;
  organization: Organization;
  children: React.ReactNode;
};

class DashboardsV2Container extends React.Component<Props> {
  render() {
    const {organization, params, api, location, children} = this.props;

    if (!organization.features.includes('dashboards-manage')) {
      return (
        <OrgDashboards
          api={api}
          location={location}
          params={params}
          organization={organization}
        >
          {({dashboard, dashboards, error, reloadData}) => {
            return error ? (
              <NotFound />
            ) : dashboard ? (
              <DashboardDetail
                {...this.props}
                initialState="view"
                dashboard={dashboard}
                dashboards={dashboards}
                reloadData={reloadData}
              />
            ) : (
              <LoadingIndicator />
            );
          }}
        </OrgDashboards>
      );
    }

    return (
      <Feature features={['dashboards-manage']} organization={organization}>
        {children}
      </Feature>
    );
  }
}

export default withApi(withOrganization(DashboardsV2Container));
