import * as React from 'react';
import {css} from '@emotion/react';
import styled from '@emotion/styled';
import classNames from 'classnames';

import space from 'app/styles/space';
import {Theme} from 'app/utils/theme';

type Props = {
  type?: keyof Theme['alert'];
  icon?: React.ReactNode;
  system?: boolean;
};

type AlertProps = Omit<React.HTMLProps<HTMLDivElement>, keyof Props> & Props;

type AlertThemeProps = {
  backgroundLight: string;
  border: string;
  iconColor: string;
};

const DEFAULT_TYPE = 'info';

const getAlertColorStyles = ({
  backgroundLight,
  border,
  iconColor,
}: AlertThemeProps) => css`
  background: ${backgroundLight};
  border: 1px solid ${border};
  svg {
    color: ${iconColor};
  }
`;

const getSystemAlertColorStyles = ({
  backgroundLight,
  border,
  iconColor,
}: AlertThemeProps) => css`
  background: ${backgroundLight};
  border: 0;
  border-radius: 0;
  border-bottom: 1px solid ${border};
  svg {
    color: ${iconColor};
  }
`;

const alertStyles = ({theme, type = DEFAULT_TYPE, system}: Props & {theme: Theme}) => css`
  display: flex;
  margin: 0 0 ${space(3)};
  padding: ${space(1.5)} ${space(2)};
  font-size: 15px;
  box-shadow: ${theme.dropShadowLight};
  border-radius: ${theme.borderRadius};
  background: ${theme.backgroundSecondary};
  border: 1px solid ${theme.border};

  a:not([role='button']) {
    color: ${theme.textColor};
    border-bottom: 1px dotted ${theme.textColor};
  }

  ${getAlertColorStyles(theme.alert[type])};
  ${system && getSystemAlertColorStyles(theme.alert[type])};
`;

const IconWrapper = styled('span')`
  display: flex;
  margin-right: ${space(1)};

  /* Give the wrapper an explicit height so icons are line height with the
   * (common) line height. */
  height: 22px;
  align-items: center;
`;

const StyledTextBlock = styled('span')`
  line-height: 1.5;
  flex-grow: 1;
  position: relative;
  margin: auto;
`;

const Alert = styled(
  ({
    type,
    icon,
    children,
    className,
    system: _system, // don't forward to `div`
    ...props
  }: AlertProps) => {
    return (
      <div className={classNames(type ? `ref-${type}` : '', className)} {...props}>
        {icon && <IconWrapper>{icon}</IconWrapper>}
        <StyledTextBlock>{children}</StyledTextBlock>
      </div>
    );
  }
)<AlertProps>`
  ${alertStyles}
`;

Alert.defaultProps = {
  type: DEFAULT_TYPE,
};

export {alertStyles};

export default Alert;
