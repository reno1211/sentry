import * as React from 'react';
import ReactDOM from 'react-dom';
import {Manager, Popper, PopperArrowProps, PopperProps, Reference} from 'react-popper';
import {SerializedStyles} from '@emotion/react';
import styled from '@emotion/styled';
import {AnimatePresence, motion, MotionStyle} from 'framer-motion';
import memoize from 'lodash/memoize';
import * as PopperJS from 'popper.js';

import {IS_ACCEPTANCE_TEST} from 'app/constants';
import {domId} from 'app/utils/domId';
import testableTransition from 'app/utils/testableTransition';

export const OPEN_DELAY = 50;

/**
 * How long to wait before closing the tooltip when isHoverable is set
 */
const CLOSE_DELAY = 50;

type DefaultProps = {
  /**
   * Position for the tooltip.
   */
  position?: PopperJS.Placement;

  /**
   * Display mode for the container element
   */
  containerDisplayMode?: React.CSSProperties['display'];
};

type Props = DefaultProps & {
  /**
   * The node to attach the Tooltip to
   */
  children: React.ReactNode;

  /**
   * Disable the tooltip display entirely
   */
  disabled?: boolean;

  /**
   * The content to show in the tooltip popover
   */
  title: React.ReactNode;

  /**
   * Additional style rules for the tooltip content.
   */
  popperStyle?: React.CSSProperties | SerializedStyles;

  /**
   * Time to wait (in milliseconds) before showing the tooltip
   */
  delay?: number;

  /**
   * If true, user is able to hover tooltip without it disappearing.
   * (nice if you want to be able to copy tooltip contents to clipboard)
   */
  isHoverable?: boolean;

  /**
   * If child node supports ref forwarding, you can skip apply a wrapper
   */
  skipWrapper?: boolean;

  /**
   * Stops tooltip from being opened during tooltip visual acceptance.
   * Should be set to true if tooltip contains unisolated data (eg. dates)
   */
  disableForVisualTest?: boolean;
  className?: string;
};

type State = {
  isOpen: boolean;
  usesGlobalPortal: boolean;
};

/**
 * Used to compute the transform origin to give the scale-down micro-animation
 * a pleasant feeling. Without this the animation can feel somewhat 'wrong'.
 */
function computeOriginFromArrow(
  placement: PopperProps['placement'],
  arrowProps: PopperArrowProps
): MotionStyle {
  // XXX: Bottom means the arrow will be pointing up
  switch (placement) {
    case 'top':
      return {originX: `${arrowProps.style.left}px`, originY: '100%'};
    case 'bottom':
      return {originX: `${arrowProps.style.left}px`, originY: 0};
    case 'left':
      return {originX: '100%', originY: `${arrowProps.style.top}px`};
    case 'right':
      return {originX: 0, originY: `${arrowProps.style.top}px`};
    default:
      return {originX: `50%`, originY: '100%'};
  }
}

class Tooltip extends React.Component<Props, State> {
  static defaultProps: DefaultProps = {
    position: 'top',
    containerDisplayMode: 'inline-block',
  };

  state: State = {
    isOpen: false,
    usesGlobalPortal: true,
  };

  async componentDidMount() {
    if (IS_ACCEPTANCE_TEST) {
      const TooltipStore = (
        await import(/* webpackChunkName: "TooltipStore" */ 'app/stores/tooltipStore')
      ).default;
      TooltipStore.addTooltip(this);
    }
  }

  async componentWillUnmount() {
    const {usesGlobalPortal} = this.state;

    if (IS_ACCEPTANCE_TEST) {
      const TooltipStore = (
        await import(/* webpackChunkName: "TooltipStore" */ 'app/stores/tooltipStore')
      ).default;
      TooltipStore.removeTooltip(this);
    }
    if (!usesGlobalPortal) {
      document.body.removeChild(this.getPortal(usesGlobalPortal));
    }
  }

  tooltipId: string = domId('tooltip-');
  delayTimeout: number | null = null;
  delayHideTimeout: number | null = null;

  getPortal = memoize(
    (usesGlobalPortal): HTMLElement => {
      if (usesGlobalPortal) {
        let portal = document.getElementById('tooltip-portal');
        if (!portal) {
          portal = document.createElement('div');
          portal.setAttribute('id', 'tooltip-portal');
          document.body.appendChild(portal);
        }
        return portal;
      }
      const portal = document.createElement('div');
      document.body.appendChild(portal);
      return portal;
    }
  );

  setOpen = () => {
    this.setState({isOpen: true});
  };

  setClose = () => {
    this.setState({isOpen: false});
  };

  handleOpen = () => {
    const {delay} = this.props;

    if (this.delayHideTimeout) {
      window.clearTimeout(this.delayHideTimeout);
      this.delayHideTimeout = null;
    }

    if (delay === 0) {
      this.setOpen();
      return;
    }

    this.delayTimeout = window.setTimeout(this.setOpen, delay ?? OPEN_DELAY);
  };

  handleClose = () => {
    const {isHoverable} = this.props;

    if (this.delayTimeout) {
      window.clearTimeout(this.delayTimeout);
      this.delayTimeout = null;
    }

    if (isHoverable) {
      this.delayHideTimeout = window.setTimeout(this.setClose, CLOSE_DELAY);
    } else {
      this.setClose();
    }
  };

  renderTrigger(children: React.ReactNode, ref: React.Ref<HTMLElement>) {
    const propList: {[key: string]: any} = {
      'aria-describedby': this.tooltipId,
      onFocus: this.handleOpen,
      onBlur: this.handleClose,
      onMouseEnter: this.handleOpen,
      onMouseLeave: this.handleClose,
    };

    // Use the `type` property of the react instance to detect whether we
    // have a basic element (type=string) or a class/function component (type=function or object)
    // Because we can't rely on the child element implementing forwardRefs we wrap
    // it with a span tag so that popper has ref

    if (
      React.isValidElement(children) &&
      (this.props.skipWrapper || typeof children.type === 'string')
    ) {
      // Basic DOM nodes can be cloned and have more props applied.
      return React.cloneElement(children, {
        ...propList,
        ref,
      });
    }

    propList.containerDisplayMode = this.props.containerDisplayMode;
    return (
      <Container {...propList} className={this.props.className} ref={ref}>
        {children}
      </Container>
    );
  }

  render() {
    const {disabled, children, title, position, popperStyle, isHoverable} = this.props;
    const {isOpen, usesGlobalPortal} = this.state;
    if (disabled) {
      return children;
    }

    const modifiers: PopperJS.Modifiers = {
      hide: {enabled: false},
      preventOverflow: {
        padding: 10,
        enabled: true,
        boundariesElement: 'viewport',
      },
      applyStyle: {
        gpuAcceleration: true,
      },
    };

    const tip = isOpen ? (
      <Popper placement={position} modifiers={modifiers}>
        {({ref, style, placement, arrowProps}) => (
          <PositionWrapper style={style}>
            <TooltipContent
              id={this.tooltipId}
              initial={{opacity: 0}}
              animate={{
                opacity: 1,
                scale: 1,
                transition: testableTransition({
                  type: 'linear',
                  ease: [0.5, 1, 0.89, 1],
                  duration: 0.2,
                }),
              }}
              exit={{
                opacity: 0,
                scale: 0.95,
                transition: testableTransition({type: 'spring', delay: 0.1}),
              }}
              style={computeOriginFromArrow(position, arrowProps)}
              transition={{duration: 0.2}}
              className="tooltip-content"
              aria-hidden={!isOpen}
              ref={ref}
              hide={!title}
              data-placement={placement}
              popperStyle={popperStyle}
              onMouseEnter={() => isHoverable && this.handleOpen()}
              onMouseLeave={() => isHoverable && this.handleClose()}
            >
              {title}
              <TooltipArrow
                ref={arrowProps.ref}
                data-placement={placement}
                style={arrowProps.style}
                background={(popperStyle as React.CSSProperties)?.background || '#000'}
              />
            </TooltipContent>
          </PositionWrapper>
        )}
      </Popper>
    ) : null;

    return (
      <Manager>
        <Reference>{({ref}) => this.renderTrigger(children, ref)}</Reference>
        {ReactDOM.createPortal(
          <AnimatePresence>{tip}</AnimatePresence>,
          this.getPortal(usesGlobalPortal)
        )}
      </Manager>
    );
  }
}

// Using an inline-block solves the container being smaller
// than the elements it is wrapping
const Container = styled('span')<{
  containerDisplayMode?: React.CSSProperties['display'];
}>`
  ${p => p.containerDisplayMode && `display: ${p.containerDisplayMode}`};
  max-width: 100%;
`;

const PositionWrapper = styled('div')`
  z-index: ${p => p.theme.zIndex.tooltip};
`;

const TooltipContent = styled(motion.div)<{hide: boolean} & Pick<Props, 'popperStyle'>>`
  will-change: transform, opacity;
  position: relative;
  color: ${p => p.theme.white};
  background: #000;
  opacity: 0.9;
  padding: 5px 10px;
  border-radius: ${p => p.theme.borderRadius};
  overflow-wrap: break-word;
  max-width: 225px;

  font-weight: bold;
  font-size: ${p => p.theme.fontSizeSmall};
  line-height: 1.4;

  margin: 6px;
  text-align: center;
  ${p => p.popperStyle as any};
  ${p => p.hide && `display: none`};
`;

const TooltipArrow = styled('span')<{background: string | number}>`
  position: absolute;
  width: 10px;
  height: 5px;

  &[data-placement*='bottom'] {
    top: 0;
    left: 0;
    margin-top: -5px;
    &::before {
      border-width: 0 5px 5px 5px;
      border-color: transparent transparent ${p => p.background} transparent;
    }
  }

  &[data-placement*='top'] {
    bottom: 0;
    left: 0;
    margin-bottom: -5px;
    &::before {
      border-width: 5px 5px 0 5px;
      border-color: ${p => p.background} transparent transparent transparent;
    }
  }

  &[data-placement*='right'] {
    left: 0;
    margin-left: -5px;
    &::before {
      border-width: 5px 5px 5px 0;
      border-color: transparent ${p => p.background} transparent transparent;
    }
  }

  &[data-placement*='left'] {
    right: 0;
    margin-right: -5px;
    &::before {
      border-width: 5px 0 5px 5px;
      border-color: transparent transparent transparent ${p => p.background};
    }
  }

  &::before {
    content: '';
    margin: auto;
    display: block;
    width: 0;
    height: 0;
    border-style: solid;
  }
`;

export default Tooltip;
