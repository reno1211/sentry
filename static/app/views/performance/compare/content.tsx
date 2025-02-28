import {Component, Fragment} from 'react';
import {Params} from 'react-router/lib/Router';
import styled from '@emotion/styled';
import {Location} from 'history';

import * as Layout from 'app/components/layouts/thirds';
import {Panel} from 'app/components/panels';
import {t} from 'app/locale';
import {Organization} from 'app/types';
import {Event} from 'app/types/event';
import {decodeScalar} from 'app/utils/queryString';
import Breadcrumb from 'app/views/performance/breadcrumb';

import {FilterViews} from '../landing';

import TraceView from './traceView';
import TransactionSummary from './transactionSummary';
import {isTransactionEvent} from './utils';

type Props = {
  organization: Organization;
  location: Location;
  params: Params;
  baselineEvent: Event;
  regressionEvent: Event;
};

class TransactionComparisonContent extends Component<Props> {
  getTransactionName() {
    const {baselineEvent, regressionEvent} = this.props;

    if (isTransactionEvent(baselineEvent) && isTransactionEvent(regressionEvent)) {
      if (baselineEvent.title === regressionEvent.title) {
        return baselineEvent.title;
      }

      return t('mixed transaction names');
    }

    if (isTransactionEvent(baselineEvent)) {
      return baselineEvent.title;
    }

    if (isTransactionEvent(regressionEvent)) {
      return regressionEvent.title;
    }

    return t('no transaction title found');
  }

  render() {
    const {baselineEvent, regressionEvent, organization, location, params} = this.props;

    const isFromTrends = decodeScalar(location.query?.view) === FilterViews.TRENDS;

    const transactionName =
      baselineEvent.title === regressionEvent.title && !isFromTrends
        ? baselineEvent.title
        : undefined;

    return (
      <Fragment>
        <Layout.Header>
          <Layout.HeaderContent>
            <Breadcrumb
              organization={organization}
              location={location}
              transactionName={transactionName}
              transactionComparison
            />
            <Layout.Title>{this.getTransactionName()}</Layout.Title>
          </Layout.HeaderContent>
          <Layout.HeaderActions>
            <TransactionSummary
              organization={organization}
              location={location}
              params={params}
              baselineEvent={baselineEvent}
              regressionEvent={regressionEvent}
            />
          </Layout.HeaderActions>
        </Layout.Header>
        <Layout.Body>
          <StyledPanel>
            <TraceView baselineEvent={baselineEvent} regressionEvent={regressionEvent} />
          </StyledPanel>
        </Layout.Body>
      </Fragment>
    );
  }
}

const StyledPanel = styled(Panel)`
  grid-column: 1 / span 2;
  overflow: hidden;
`;

export default TransactionComparisonContent;
