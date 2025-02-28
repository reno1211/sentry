import {Location, LocationDescriptor, Query} from 'history';

import Duration from 'app/components/duration';
import {ALL_ACCESS_PROJECTS} from 'app/constants/globalSelectionHeader';
import {backend, frontend} from 'app/data/platformCategories';
import {GlobalSelection, OrganizationSummary, Project} from 'app/types';
import {defined} from 'app/utils';
import {statsPeriodToDays} from 'app/utils/dates';
import getCurrentSentryReactTransaction from 'app/utils/getCurrentSentryReactTransaction';
import {decodeScalar} from 'app/utils/queryString';

import {FilterViews} from './landing';

/**
 * Performance type can used to determine a default view or which specific field should be used by default on pages
 * where we don't want to wait for transaction data to return to determine how to display aspects of a page.
 */
export enum PROJECT_PERFORMANCE_TYPE {
  ANY = 'any', // Fallback to transaction duration
  FRONTEND = 'frontend',
  BACKEND = 'backend',
}

const FRONTEND_PLATFORMS: string[] = [...frontend];
const BACKEND_PLATFORMS: string[] = [...backend];

export function platformToPerformanceType(
  projects: Project[],
  projectIds: readonly number[]
) {
  if (projectIds.length === 0 || projectIds[0] === ALL_ACCESS_PROJECTS) {
    return PROJECT_PERFORMANCE_TYPE.ANY;
  }
  const selectedProjects = projects.filter(p => projectIds.includes(parseInt(p.id, 10)));
  if (selectedProjects.length === 0 || selectedProjects.some(p => !p.platform)) {
    return PROJECT_PERFORMANCE_TYPE.ANY;
  }

  if (
    selectedProjects.every(project =>
      FRONTEND_PLATFORMS.includes(project.platform as string)
    )
  ) {
    return PROJECT_PERFORMANCE_TYPE.FRONTEND;
  }

  if (
    selectedProjects.every(project =>
      BACKEND_PLATFORMS.includes(project.platform as string)
    )
  ) {
    return PROJECT_PERFORMANCE_TYPE.BACKEND;
  }

  return PROJECT_PERFORMANCE_TYPE.ANY;
}

export function getPerformanceLandingUrl(organization: OrganizationSummary): string {
  return `/organizations/${organization.slug}/performance/`;
}

export function getTransactionSearchQuery(location: Location, query: string = '') {
  return decodeScalar(location.query.query, query).trim();
}

export function getCurrentPerformanceView(location: Location): string {
  const currentView = location.query.view as FilterViews;
  if (Object.values(FilterViews).includes(currentView)) {
    return currentView;
  }
  return FilterViews.ALL_TRANSACTIONS;
}

export function getTransactionDetailsUrl(
  organization: OrganizationSummary,
  eventSlug: string,
  transaction: string,
  query: Query
): LocationDescriptor {
  return {
    pathname: `/organizations/${organization.slug}/performance/${eventSlug}/`,
    query: {
      ...query,
      transaction,
    },
  };
}

export function getTransactionComparisonUrl({
  organization,
  baselineEventSlug,
  regressionEventSlug,
  transaction,
  query,
}: {
  organization: OrganizationSummary;
  baselineEventSlug: string;
  regressionEventSlug: string;
  transaction: string;
  query: Query;
}): LocationDescriptor {
  return {
    pathname: `/organizations/${organization.slug}/performance/compare/${baselineEventSlug}/${regressionEventSlug}/`,
    query: {
      ...query,
      transaction,
    },
  };
}

export function addRoutePerformanceContext(selection: GlobalSelection) {
  const transaction = getCurrentSentryReactTransaction();
  const days = statsPeriodToDays(
    selection.datetime.period,
    selection.datetime.start,
    selection.datetime.end
  );
  const oneDay = 86400;
  const seconds = Math.floor(days * oneDay);

  transaction?.setTag('query.period', seconds.toString());
  let groupedPeriod = '>30d';
  if (seconds <= oneDay) groupedPeriod = '<=1d';
  else if (seconds <= oneDay * 7) groupedPeriod = '<=7d';
  else if (seconds <= oneDay * 14) groupedPeriod = '<=14d';
  else if (seconds <= oneDay * 30) groupedPeriod = '<=30d';
  transaction?.setTag('query.period.grouped', groupedPeriod);
}

export function getTransactionName(location: Location): string | undefined {
  const {transaction} = location.query;

  return decodeScalar(transaction);
}

type DurationProps = {abbreviation?: boolean};
type SecondsProps = {seconds: number} & DurationProps;
type MillisecondsProps = {milliseconds: number} & DurationProps;
type PerformanceDurationProps = SecondsProps | MillisecondsProps;
const hasMilliseconds = (props: PerformanceDurationProps): props is MillisecondsProps => {
  return defined((props as MillisecondsProps).milliseconds);
};
export function PerformanceDuration(props: SecondsProps);
export function PerformanceDuration(props: MillisecondsProps);
export function PerformanceDuration(props: PerformanceDurationProps) {
  const normalizedSeconds = hasMilliseconds(props)
    ? props.milliseconds / 1000
    : props.seconds;
  return (
    <Duration
      abbreviation={props.abbreviation}
      seconds={normalizedSeconds}
      fixedDigits={normalizedSeconds > 1 ? 2 : 0}
    />
  );
}
