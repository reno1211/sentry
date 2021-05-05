import React from 'react';
import {RouteComponentProps} from 'react-router';

import {Client} from 'app/api';
import NotFound from 'app/components/errors/notFound';
import LoadingIndicator from 'app/components/loadingIndicator';
import {Organization} from 'app/types';
import withApi from 'app/utils/withApi';
import withOrganization from 'app/utils/withOrganization';

import DashboardDetail from './detail';
import OrgDashboards from './orgDashboards';

type Props = RouteComponentProps<{orgId: string; dashboardId: string}, {}> & {
  api: Client;
  organization: Organization;
  children: React.ReactNode;
};

class ViewEditDashboard extends React.Component<Props> {
  render() {
    const {organization, params, api, location} = this.props;
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
}

export default withApi(withOrganization(ViewEditDashboard));
