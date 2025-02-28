import {Component, Fragment} from 'react';
import {browserHistory, withRouter, WithRouterProps} from 'react-router';
import styled from '@emotion/styled';
import {Location} from 'history';

import DropdownControl, {DropdownItem} from 'app/components/dropdownControl';
import SearchBar from 'app/components/events/searchBar';
import {MAX_QUERY_LENGTH} from 'app/constants';
import {t} from 'app/locale';
import space from 'app/styles/space';
import {Organization, Project} from 'app/types';
import {trackAnalyticsEvent} from 'app/utils/analytics';
import EventView from 'app/utils/discover/eventView';
import {generateAggregateFields} from 'app/utils/discover/fields';
import {decodeScalar} from 'app/utils/queryString';
import {stringifyQueryObject, tokenizeSearch} from 'app/utils/tokenizeSearch';

import Charts from '../charts/index';
import {
  getBackendAxisOptions,
  getFrontendAxisOptions,
  getFrontendOtherAxisOptions,
} from '../data';
import Table from '../table';
import {getTransactionSearchQuery} from '../utils';

import DoubleAxisDisplay from './display/doubleAxisDisplay';
import {
  BACKEND_COLUMN_TITLES,
  FRONTEND_OTHER_COLUMN_TITLES,
  FRONTEND_PAGELOAD_COLUMN_TITLES,
} from './data';
import {
  getCurrentLandingDisplay,
  getDefaultDisplayFieldForPlatform,
  getDisplayAxes,
  LANDING_DISPLAYS,
  LandingDisplayField,
  LEFT_AXIS_QUERY_KEY,
  RIGHT_AXIS_QUERY_KEY,
} from './utils';
import {BackendCards, FrontendCards} from './vitalsCards';

type Props = {
  organization: Organization;
  eventView: EventView;
  location: Location;
  projects: Project[];
  setError: (msg: string | undefined) => void;
  handleSearch: (searchQuery: string) => void;
} & WithRouterProps;

type State = {};
class LandingContent extends Component<Props, State> {
  getSummaryConditions(query: string) {
    const parsed = tokenizeSearch(query);
    parsed.query = [];

    return stringifyQueryObject(parsed);
  }

  handleLandingDisplayChange = (field: string) => {
    const {location, organization, eventView, projects} = this.props;

    const newQuery = {...location.query};

    delete newQuery[LEFT_AXIS_QUERY_KEY];
    delete newQuery[RIGHT_AXIS_QUERY_KEY];

    const defaultDisplay = getDefaultDisplayFieldForPlatform(projects, eventView);
    const currentDisplay = decodeScalar(location.query.landingDisplay);

    trackAnalyticsEvent({
      eventKey: 'performance_views.landingv2.display_change',
      eventName: 'Performance Views: Landing v2 Display Change',
      organization_id: parseInt(organization.id, 10),
      change_to_display: field,
      default_display: defaultDisplay,
      current_display: currentDisplay,
      is_default: defaultDisplay === currentDisplay,
    });

    browserHistory.push({
      pathname: location.pathname,
      query: {
        ...newQuery,
        landingDisplay: field,
      },
    });
  };

  renderSelectedDisplay(display) {
    switch (display) {
      case LandingDisplayField.ALL:
        return this.renderLandingAll();
      case LandingDisplayField.FRONTEND_PAGELOAD:
        return this.renderLandingFrontend(true);
      case LandingDisplayField.FRONTEND_OTHER:
        return this.renderLandingFrontend(false);
      case LandingDisplayField.BACKEND:
        return this.renderLandingBackend();
      default:
        throw new Error(`Unknown display: ${display}`);
    }
  }

  renderLandingFrontend = isPageload => {
    const {organization, location, projects, eventView, setError} = this.props;

    const columnTitles = isPageload
      ? FRONTEND_PAGELOAD_COLUMN_TITLES
      : FRONTEND_OTHER_COLUMN_TITLES;

    const axisOptions = isPageload
      ? getFrontendAxisOptions(organization)
      : getFrontendOtherAxisOptions(organization);
    const {leftAxis, rightAxis} = getDisplayAxes(axisOptions, location);

    return (
      <Fragment>
        {isPageload && (
          <FrontendCards
            eventView={eventView}
            organization={organization}
            location={location}
            projects={projects}
          />
        )}
        <DoubleAxisDisplay
          eventView={eventView}
          organization={organization}
          location={location}
          axisOptions={axisOptions}
          leftAxis={leftAxis}
          rightAxis={rightAxis}
        />
        <Table
          eventView={eventView}
          projects={projects}
          organization={organization}
          location={location}
          setError={setError}
          summaryConditions={eventView.getQueryWithAdditionalConditions()}
          columnTitles={columnTitles}
        />
      </Fragment>
    );
  };

  renderLandingBackend = () => {
    const {organization, location, projects, eventView, setError} = this.props;

    const axisOptions = getBackendAxisOptions(organization);
    const {leftAxis, rightAxis} = getDisplayAxes(axisOptions, location);

    const columnTitles = BACKEND_COLUMN_TITLES;

    return (
      <Fragment>
        <BackendCards
          eventView={eventView}
          organization={organization}
          location={location}
        />
        <DoubleAxisDisplay
          eventView={eventView}
          organization={organization}
          location={location}
          axisOptions={axisOptions}
          leftAxis={leftAxis}
          rightAxis={rightAxis}
        />
        <Table
          eventView={eventView}
          projects={projects}
          organization={organization}
          location={location}
          setError={setError}
          summaryConditions={eventView.getQueryWithAdditionalConditions()}
          columnTitles={columnTitles}
        />
      </Fragment>
    );
  };

  renderLandingAll = () => {
    const {organization, location, router, projects, eventView, setError} = this.props;

    return (
      <Fragment>
        <Charts
          eventView={eventView}
          organization={organization}
          location={location}
          router={router}
        />
        <Table
          eventView={eventView}
          projects={projects}
          organization={organization}
          location={location}
          setError={setError}
          summaryConditions={eventView.getQueryWithAdditionalConditions()}
        />
      </Fragment>
    );
  };

  render() {
    const {organization, location, eventView, projects, handleSearch} = this.props;

    const currentLandingDisplay = getCurrentLandingDisplay(location, projects, eventView);
    const filterString = getTransactionSearchQuery(location, eventView.query);

    return (
      <Fragment>
        <SearchContainer>
          <SearchBar
            organization={organization}
            projectIds={eventView.project}
            query={filterString}
            fields={generateAggregateFields(
              organization,
              [...eventView.fields, {field: 'tps()'}],
              ['epm()', 'eps()']
            )}
            onSearch={handleSearch}
            maxQueryLength={MAX_QUERY_LENGTH}
          />
          <DropdownControl
            buttonProps={{prefix: t('Display')}}
            label={currentLandingDisplay.label}
          >
            {LANDING_DISPLAYS.map(({label, field}) => (
              <DropdownItem
                key={field}
                onSelect={this.handleLandingDisplayChange}
                eventKey={field}
                data-test-id={field}
                isActive={field === currentLandingDisplay.field}
              >
                {label}
              </DropdownItem>
            ))}
          </DropdownControl>
        </SearchContainer>
        {this.renderSelectedDisplay(currentLandingDisplay.field)}
      </Fragment>
    );
  }
}

const SearchContainer = styled('div')`
  display: grid;
  grid-template-columns: 1fr min-content;
  grid-gap: ${space(2)};
  margin-bottom: ${space(2)};
`;

export default withRouter(LandingContent);
