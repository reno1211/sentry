import * as React from 'react';
import * as ReactRouter from 'react-router';
import styled from '@emotion/styled';
import moment from 'moment-timezone';

import DropdownMenu from 'app/components/dropdownMenu';
import HookOrDefault from 'app/components/hookOrDefault';
import HeaderItem from 'app/components/organizations/headerItem';
import MultipleSelectorSubmitRow from 'app/components/organizations/multipleSelectorSubmitRow';
import DateRange from 'app/components/organizations/timeRangeSelector/dateRange';
import SelectorItems from 'app/components/organizations/timeRangeSelector/dateRange/selectorItems';
import DateSummary from 'app/components/organizations/timeRangeSelector/dateSummary';
import {getRelativeSummary} from 'app/components/organizations/timeRangeSelector/utils';
import {DEFAULT_STATS_PERIOD} from 'app/constants';
import {IconCalendar} from 'app/icons';
import space from 'app/styles/space';
import {DateString, LightWeightOrganization} from 'app/types';
import {defined} from 'app/utils';
import {analytics} from 'app/utils/analytics';
import {
  getLocalToSystem,
  getPeriodAgo,
  getUserTimezone,
  getUtcToSystem,
  parsePeriodToHours,
} from 'app/utils/dates';
import getDynamicText from 'app/utils/getDynamicText';
import getRouteStringFromRoutes from 'app/utils/getRouteStringFromRoutes';

// Strips timezone from local date, creates a new moment date object with timezone
// Then returns as a Date object
const getDateWithTimezoneInUtc = (date, utc) =>
  moment
    .tz(
      moment(date).local().format('YYYY-MM-DD HH:mm:ss'),
      utc ? 'UTC' : getUserTimezone()
    )
    .utc()
    .toDate();

const getInternalDate = (date, utc) => {
  if (utc) {
    return getUtcToSystem(date);
  } else {
    return new Date(
      moment.tz(moment.utc(date), getUserTimezone()).format('YYYY/MM/DD HH:mm:ss')
    );
  }
};

const DateRangeHook = HookOrDefault({
  hookName: 'component:header-date-range',
  defaultComponent: DateRange,
});

const SelectorItemsHook = HookOrDefault({
  hookName: 'component:header-selector-items',
  defaultComponent: SelectorItems,
});

export type ChangeData = {
  relative: string | null;
  start?: Date;
  end?: Date;
  utc?: boolean | null;
};

type DateRangeChangeData = Parameters<
  React.ComponentProps<typeof DateRange>['onChange']
>[0];

const defaultProps = {
  /**
   * Show absolute date selectors
   */
  showAbsolute: true,
  /**
   * Show relative date selectors
   */
  showRelative: true,
};

type Props = ReactRouter.WithRouterProps & {
  /**
   * Start date value for absolute date selector
   */
  start: DateString;

  /**
   * End date value for absolute date selector
   */
  end: DateString;

  /**
   * When the default period is selected, it is visually dimmed and
   * makes the selector unclearable.
   */
  defaultPeriod: string;

  /**
   * Relative date value
   */
  relative: string;

  /**
   * Override defaults from DEFAULT_RELATIVE_PERIODS
   */
  relativeOptions?: Record<string, string>;

  /**
   * Default initial value for using UTC
   */
  utc: boolean | null;

  /**
   * Replace the default calendar icon for label
   */
  label?: React.ReactNode;

  /**
   * Callback when value changes
   */
  onChange: (data: ChangeData) => void;

  /**
   * Callback when "Update" button is clicked
   */
  onUpdate: (data: ChangeData) => void;

  /**
   * Callback when opening/closing dropdown date selector
   */
  onToggleSelector?: (isOpen: boolean) => void;

  /**
   * Just used for metrics
   */
  organization: LightWeightOrganization;

  /**
   * Small info icon with tooltip hint text
   */
  hint?: string;
} & Partial<typeof defaultProps>;

type State = {
  isOpen: boolean;
  hasChanges: boolean;
  hasDateRangeErrors: boolean;
  relative: string | null;
  start?: Date;
  end?: Date;
  utc?: boolean | null;
};

class TimeRangeSelector extends React.PureComponent<Props, State> {
  static defaultProps = defaultProps;

  constructor(props: Props) {
    super(props);

    let start: Date | undefined = undefined;
    let end: Date | undefined = undefined;

    if (props.start && props.end) {
      start = getInternalDate(props.start, props.utc);
      end = getInternalDate(props.end, props.utc);
    }

    this.state = {
      // if utc is not null and not undefined, then use value of `props.utc` (it can be false)
      // otherwise if no value is supplied, the default should be the user's timezone preference
      utc: defined(props.utc) ? props.utc : getUserTimezone() === 'UTC',
      isOpen: false,
      hasChanges: false,
      hasDateRangeErrors: false,
      start,
      end,
      relative: props.relative,
    };
  }

  componentDidUpdate(_prevProps, prevState) {
    const {onToggleSelector} = this.props;
    const currState = this.state;

    if (onToggleSelector && prevState.isOpen !== currState.isOpen) {
      onToggleSelector(currState.isOpen);
    }
  }

  callCallback = (callback: Props['onChange'], datetime: ChangeData) => {
    if (typeof callback !== 'function') {
      return;
    }

    if (!datetime.start && !datetime.end) {
      callback(datetime);
      return;
    }

    // Change local date into either UTC or local time (local time defined by user preference)
    callback({
      ...datetime,
      start: getDateWithTimezoneInUtc(datetime.start, this.state.utc),
      end: getDateWithTimezoneInUtc(datetime.end, this.state.utc),
    });
  };

  handleCloseMenu = () => {
    const {relative, start, end, utc} = this.state;

    if (this.state.hasChanges) {
      // Only call update if we close when absolute date is selected
      this.handleUpdate({relative, start, end, utc});
    } else {
      this.setState({isOpen: false});
    }
  };

  handleUpdate = (datetime: ChangeData) => {
    const {onUpdate} = this.props;

    this.setState(
      {
        isOpen: false,
        hasChanges: false,
      },
      () => {
        this.callCallback(onUpdate, datetime);
      }
    );
  };

  handleAbsoluteClick = () => {
    const {relative, onChange} = this.props;

    // Set default range to equivalent of last relative period,
    // or use default stats period
    const newDateTime: ChangeData = {
      relative: null,
      start: getPeriodAgo(
        'hours',
        parsePeriodToHours(relative || DEFAULT_STATS_PERIOD)
      ).toDate(),
      end: new Date(),
    };

    if (defined(this.props.utc)) {
      newDateTime.utc = this.state.utc;
    }

    this.setState({
      hasChanges: true,
      ...newDateTime,
      start: newDateTime.start,
      end: newDateTime.end,
    });
    this.callCallback(onChange, newDateTime);
  };

  handleSelectRelative = value => {
    const {onChange} = this.props;
    const newDateTime: ChangeData = {
      relative: value,
      start: undefined,
      end: undefined,
    };
    this.setState(newDateTime);
    this.callCallback(onChange, newDateTime);
    this.handleUpdate(newDateTime);
  };

  handleClear = () => {
    const {onChange} = this.props;

    const newDateTime: ChangeData = {
      relative: DEFAULT_STATS_PERIOD,
      start: undefined,
      end: undefined,
      utc: null,
    };
    this.setState(newDateTime);
    this.callCallback(onChange, newDateTime);
    this.handleUpdate(newDateTime);
  };

  handleSelectDateRange = ({
    start,
    end,
    hasDateRangeErrors = false,
  }: DateRangeChangeData) => {
    if (hasDateRangeErrors) {
      this.setState({hasDateRangeErrors});
      return;
    }

    const {onChange} = this.props;

    const newDateTime: ChangeData = {
      relative: null,
      start,
      end,
    };

    if (defined(this.props.utc)) {
      newDateTime.utc = this.state.utc;
    }

    this.setState({hasChanges: true, hasDateRangeErrors, ...newDateTime});
    this.callCallback(onChange, newDateTime);
  };

  handleUseUtc = () => {
    const {onChange, router} = this.props;
    let {start, end} = this.props;

    this.setState(state => {
      const utc = !state.utc;

      if (!start) {
        start = getDateWithTimezoneInUtc(state.start, state.utc);
      }

      if (!end) {
        end = getDateWithTimezoneInUtc(state.end, state.utc);
      }

      analytics('dateselector.utc_changed', {
        utc,
        path: getRouteStringFromRoutes(router.routes),
        org_id: parseInt(this.props.organization.id, 10),
      });

      const newDateTime = {
        relative: null,
        start: utc ? getLocalToSystem(start) : getUtcToSystem(start),
        end: utc ? getLocalToSystem(end) : getUtcToSystem(end),
        utc,
      };
      this.callCallback(onChange, newDateTime);

      return {
        hasChanges: true,
        ...newDateTime,
      };
    });
  };

  handleOpen = () => {
    this.setState({isOpen: true});
    // Start loading react-date-picker
    import(
      /* webpackChunkName: "DateRangePicker" */ '../timeRangeSelector/dateRange/index'
    );
  };

  render() {
    const {
      defaultPeriod,
      showAbsolute,
      showRelative,
      organization,
      hint,
      label,
      relativeOptions,
    } = this.props;
    const {start, end, relative} = this.state;

    const shouldShowAbsolute = showAbsolute;
    const shouldShowRelative = showRelative;
    const isAbsoluteSelected = !!start && !!end;

    const summary =
      isAbsoluteSelected && start && end ? (
        <DateSummary start={start} end={end} />
      ) : (
        getRelativeSummary(relative || defaultPeriod)
      );

    const relativeSelected = isAbsoluteSelected ? '' : relative || defaultPeriod;

    return (
      <DropdownMenu
        isOpen={this.state.isOpen}
        onOpen={this.handleOpen}
        onClose={this.handleCloseMenu}
        keepMenuOpen
      >
        {({isOpen, getRootProps, getActorProps, getMenuProps}) => (
          <TimeRangeRoot {...getRootProps()}>
            <StyledHeaderItem
              data-test-id="global-header-timerange-selector"
              icon={label ?? <IconCalendar />}
              isOpen={isOpen}
              hasSelected={
                (!!this.props.relative && this.props.relative !== defaultPeriod) ||
                isAbsoluteSelected
              }
              hasChanges={this.state.hasChanges}
              onClear={this.handleClear}
              allowClear
              hint={hint}
              {...getActorProps()}
            >
              {getDynamicText({value: summary, fixed: 'start to end'})}
            </StyledHeaderItem>
            {isOpen && (
              <Menu {...getMenuProps()} isAbsoluteSelected={isAbsoluteSelected}>
                <SelectorList isAbsoluteSelected={isAbsoluteSelected}>
                  <SelectorItemsHook
                    handleSelectRelative={this.handleSelectRelative}
                    handleAbsoluteClick={this.handleAbsoluteClick}
                    isAbsoluteSelected={isAbsoluteSelected}
                    relativeSelected={relativeSelected}
                    relativePeriods={relativeOptions}
                    shouldShowAbsolute={shouldShowAbsolute}
                    shouldShowRelative={shouldShowRelative}
                  />
                </SelectorList>
                {isAbsoluteSelected && (
                  <div>
                    <DateRangeHook
                      start={start ?? null}
                      end={end ?? null}
                      organization={organization}
                      showTimePicker
                      utc={this.state.utc}
                      onChange={this.handleSelectDateRange}
                      onChangeUtc={this.handleUseUtc}
                    />
                    <SubmitRow>
                      <MultipleSelectorSubmitRow
                        onSubmit={this.handleCloseMenu}
                        disabled={!this.state.hasChanges || this.state.hasDateRangeErrors}
                      />
                    </SubmitRow>
                  </div>
                )}
              </Menu>
            )}
          </TimeRangeRoot>
        )}
      </DropdownMenu>
    );
  }
}

const TimeRangeRoot = styled('div')`
  position: relative;
`;

const StyledHeaderItem = styled(HeaderItem)`
  height: 100%;
`;

type MenuProps = {
  isAbsoluteSelected: boolean;
};

const Menu = styled('div')<MenuProps>`
  ${p => !p.isAbsoluteSelected && 'left: -1px'};
  ${p => p.isAbsoluteSelected && 'right: -1px'};

  display: flex;
  background: ${p => p.theme.background};
  border: 1px solid ${p => p.theme.border};
  position: absolute;
  top: 100%;
  min-width: 100%;
  z-index: ${p => p.theme.zIndex.dropdown};
  box-shadow: ${p => p.theme.dropShadowLight};
  border-radius: ${p => p.theme.borderRadiusBottom};
  font-size: 0.8em;
  overflow: hidden;
`;

const SelectorList = styled('div')<MenuProps>`
  display: flex;
  flex: 1;
  flex-direction: column;
  flex-shrink: 0;
  width: ${p => (p.isAbsoluteSelected ? '160px' : '220px')};
  min-height: 305px;
`;

const SubmitRow = styled('div')`
  padding: ${space(0.5)} ${space(1)};
  border-top: 1px solid ${p => p.theme.innerBorder};
  border-left: 1px solid ${p => p.theme.border};
`;

export default ReactRouter.withRouter(TimeRangeSelector);

export {TimeRangeRoot};
