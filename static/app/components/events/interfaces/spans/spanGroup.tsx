import {Component, Fragment} from 'react';

import {Organization} from 'app/types';
import {EventTransaction} from 'app/types/event';
import {TableData, TableDataRow} from 'app/utils/discover/discoverQuery';

import {ScrollbarManagerChildrenProps, withScrollbarManager} from './scrollbarManager';
import SpanBar from './spanBar';
import {ParsedTraceType, ProcessedSpanType, TreeDepthType} from './types';
import {getSpanID, isGapSpan, SpanBoundsType, SpanGeneratedBoundsType} from './utils';

type PropType = ScrollbarManagerChildrenProps & {
  orgId: string;
  organization: Organization;
  event: Readonly<EventTransaction>;
  span: Readonly<ProcessedSpanType>;
  trace: Readonly<ParsedTraceType>;
  generateBounds: (bounds: SpanBoundsType) => SpanGeneratedBoundsType;
  treeDepth: number;
  continuingTreeDepths: Array<TreeDepthType>;
  numOfSpanChildren: number;
  renderedSpanChildren: Array<JSX.Element>;
  spanBarColour?: string;
  spanBarHatch?: boolean;
  spanNumber: number;
  isLast: boolean;
  isRoot?: boolean;
  isCurrentSpanFilteredOut: boolean;
  spansWithErrors: TableData | null | undefined;
};

type State = {
  showSpanTree: boolean;
};

class SpanGroup extends Component<PropType, State> {
  state: State = {
    showSpanTree: true,
  };

  componentDidUpdate(_prevProps: PropType, prevState: State) {
    if (prevState.showSpanTree !== this.state.showSpanTree) {
      // Update horizontal scroll states after this subtree was either hidden or
      // revealed.
      this.props.updateScrollState();
    }
  }

  toggleSpanTree = () => {
    this.setState(state => ({
      showSpanTree: !state.showSpanTree,
    }));
  };

  renderSpanChildren = () => {
    if (!this.state.showSpanTree) {
      return null;
    }

    return this.props.renderedSpanChildren;
  };

  getSpanErrors(): TableDataRow[] {
    const {span, spansWithErrors} = this.props;

    const spanID = getSpanID(span);

    if (isGapSpan(span) || !spansWithErrors?.data || !spanID) {
      return [];
    }

    return spansWithErrors.data.filter(row => {
      return row['trace.span'] === spanID;
    });
  }

  getTotalNumberOfErrors(): number {
    const {spansWithErrors} = this.props;

    const data = spansWithErrors?.data;

    if (Array.isArray(data)) {
      return data.length;
    }

    return 0;
  }

  render() {
    const {
      spanBarColour,
      spanBarHatch,
      span,
      numOfSpanChildren,
      trace,
      isLast,
      isRoot,
      continuingTreeDepths,
      generateBounds,
      treeDepth,
      spanNumber,
      isCurrentSpanFilteredOut,
      orgId,
      organization,
      event,
    } = this.props;

    return (
      <Fragment>
        <SpanBar
          organization={organization}
          event={event}
          orgId={orgId}
          spanBarColour={spanBarColour}
          spanBarHatch={spanBarHatch}
          span={span}
          showSpanTree={this.state.showSpanTree}
          numOfSpanChildren={numOfSpanChildren}
          trace={trace}
          generateBounds={generateBounds}
          toggleSpanTree={this.toggleSpanTree}
          treeDepth={treeDepth}
          continuingTreeDepths={continuingTreeDepths}
          spanNumber={spanNumber}
          isLast={isLast}
          isRoot={isRoot}
          isCurrentSpanFilteredOut={isCurrentSpanFilteredOut}
          totalNumberOfErrors={this.getTotalNumberOfErrors()}
          spanErrors={this.getSpanErrors()}
        />
        {this.renderSpanChildren()}
      </Fragment>
    );
  }
}

export default withScrollbarManager(SpanGroup);
