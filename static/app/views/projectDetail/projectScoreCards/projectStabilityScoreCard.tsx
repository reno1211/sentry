import * as React from 'react';
import round from 'lodash/round';

import AsyncComponent from 'app/components/asyncComponent';
import {getDiffInMinutes} from 'app/components/charts/utils';
import {getParams} from 'app/components/organizations/globalSelectionHeader/getParams';
import ScoreCard from 'app/components/scoreCard';
import {DEFAULT_STATS_PERIOD} from 'app/constants';
import {IconArrow} from 'app/icons';
import {t} from 'app/locale';
import {GlobalSelection, Organization, SessionApiResponse} from 'app/types';
import {defined, percent} from 'app/utils';
import {formatAbbreviatedNumber} from 'app/utils/formatters';
import {getPeriod} from 'app/utils/getPeriod';
import {displayCrashFreePercent, getCrashFreePercent} from 'app/views/releases/utils';
import {
  getSessionTermDescription,
  SessionTerm,
} from 'app/views/releases/utils/sessionTerm';

import MissingReleasesButtons from '../missingFeatureButtons/missingReleasesButtons';
import {shouldFetchPreviousPeriod} from '../utils';

type Props = AsyncComponent['props'] & {
  organization: Organization;
  selection: GlobalSelection;
  isProjectStabilized: boolean;
  hasSessions: boolean | null;
};

type State = AsyncComponent['state'] & {
  currentSessions: SessionApiResponse | null;
  previousSessions: SessionApiResponse | null;
};

class ProjectStabilityScoreCard extends AsyncComponent<Props, State> {
  shouldRenderBadRequests = true;

  getDefaultState() {
    return {
      ...super.getDefaultState(),
      currentSessions: null,
      previousSessions: null,
    };
  }

  getEndpoints() {
    const {organization, selection, isProjectStabilized, hasSessions} = this.props;

    if (!isProjectStabilized || !hasSessions) {
      return [];
    }

    const {projects, environments: environment, datetime} = selection;
    const {period} = datetime;
    const commonQuery = {
      environment,
      project: projects[0],
      field: 'sum(session)',
      groupBy: 'session.status',
      interval: getDiffInMinutes(datetime) >= 24 * 60 ? '1d' : '1h',
    };

    // Unfortunately we can't do something like statsPeriod=28d&interval=14d to get scores for this and previous interval with the single request
    // https://github.com/getsentry/sentry/pull/22770#issuecomment-758595553

    const endpoints: ReturnType<AsyncComponent['getEndpoints']> = [
      [
        'currentSessions',
        `/organizations/${organization.slug}/sessions/`,
        {
          query: {
            ...commonQuery,
            ...getParams(datetime),
          },
        },
      ],
    ];

    if (shouldFetchPreviousPeriod(datetime)) {
      const doubledPeriod = getPeriod(
        {period, start: undefined, end: undefined},
        {shouldDoublePeriod: true}
      ).statsPeriod;

      endpoints.push([
        'previousSessions',
        `/organizations/${organization.slug}/sessions/`,
        {
          query: {
            ...commonQuery,
            statsPeriodStart: doubledPeriod,
            statsPeriodEnd: period ?? DEFAULT_STATS_PERIOD,
          },
        },
      ]);
    }

    return endpoints;
  }

  get cardTitle() {
    return t('Crash Free Sessions');
  }

  get cardHelp() {
    return this.trend
      ? t(
          'The percentage of crash free sessions and how it has changed since the last period.'
        )
      : getSessionTermDescription(SessionTerm.STABILITY, null);
  }

  get score() {
    const {currentSessions} = this.state;

    return this.calculateCrashFree(currentSessions);
  }

  get trend() {
    const {previousSessions} = this.state;

    const previousScore = this.calculateCrashFree(previousSessions);

    if (!defined(this.score) || !defined(previousScore)) {
      return undefined;
    }

    return round(this.score - previousScore, 3);
  }

  get trendStatus(): React.ComponentProps<typeof ScoreCard>['trendStatus'] {
    if (!this.trend) {
      return undefined;
    }

    return this.trend > 0 ? 'good' : 'bad';
  }

  componentDidUpdate(prevProps: Props) {
    const {selection, isProjectStabilized, hasSessions} = this.props;

    if (
      (prevProps.selection !== selection || prevProps.hasSessions !== hasSessions) &&
      isProjectStabilized
    ) {
      this.remountComponent();
    }
  }

  calculateCrashFree(data?: SessionApiResponse | null) {
    if (!data) {
      return undefined;
    }

    const totalSessions = data.groups.reduce(
      (acc, group) => acc + group.totals['sum(session)'],
      0
    );

    const crashedSessions = data.groups.find(
      group => group.by['session.status'] === 'crashed'
    )?.totals['sum(session)'];

    if (totalSessions === 0 || !defined(totalSessions) || !defined(crashedSessions)) {
      return undefined;
    }

    const crashedSessionsPercent = percent(crashedSessions, totalSessions);

    return getCrashFreePercent(100 - crashedSessionsPercent);
  }

  renderLoading() {
    return this.renderBody();
  }

  renderMissingFeatureCard() {
    const {organization} = this.props;
    return (
      <ScoreCard
        title={this.cardTitle}
        help={this.cardHelp}
        score={<MissingReleasesButtons organization={organization} health />}
      />
    );
  }

  renderScore() {
    const {loading} = this.state;

    if (loading || !defined(this.score)) {
      return '\u2014';
    }

    return displayCrashFreePercent(this.score);
  }

  renderTrend() {
    const {loading} = this.state;

    if (loading || !defined(this.score) || !defined(this.trend)) {
      return null;
    }

    return (
      <div>
        {this.trend >= 0 ? (
          <IconArrow direction="up" size="xs" />
        ) : (
          <IconArrow direction="down" size="xs" />
        )}
        {`${formatAbbreviatedNumber(Math.abs(this.trend))}\u0025`}
      </div>
    );
  }

  renderBody() {
    const {hasSessions} = this.props;

    if (hasSessions === false) {
      return this.renderMissingFeatureCard();
    }

    return (
      <ScoreCard
        title={this.cardTitle}
        help={this.cardHelp}
        score={this.renderScore()}
        trend={this.renderTrend()}
        trendStatus={this.trendStatus}
      />
    );
  }
}

export default ProjectStabilityScoreCard;
