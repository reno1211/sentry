import {mountWithTheme} from 'sentry-test/enzyme';

import {ProjectCard} from 'app/views/projectsDashboard/projectCard';

// NOTE: Unmocking debounce so that the actionCreator never fires
jest.unmock('lodash/debounce');

describe('ProjectCard', function () {
  let wrapper;

  beforeEach(function () {
    wrapper = mountWithTheme(
      <ProjectCard
        organization={TestStubs.Organization()}
        project={TestStubs.Project({
          stats: [
            [1525042800, 1],
            [1525046400, 2],
          ],
          transactionStats: [
            [1525042800, 4],
            [1525046400, 8],
          ],
          platform: 'javascript',
        })}
        params={{orgId: 'org-slug'}}
      />,
      TestStubs.routerContext()
    );
  });

  afterEach(function () {
    MockApiClient.clearMockResponses();
  });

  it('renders', function () {
    expect(wrapper).toSnapshot();
  });

  it('renders latest 2 deploys', function () {
    const latestDeploys = {
      beta: {
        dateFinished: '2018-05-10T20:56:40.092Z',
        version: '123456',
      },
      staging: {
        dateFinished: '2018-05-08T20:56:40.092Z',
        version: '789789',
      },
      production: {
        dateFinished: '2018-05-09T20:56:40.092Z',
        version: '123123',
      },
    };

    wrapper = mountWithTheme(
      <ProjectCard
        organization={TestStubs.Organization()}
        project={TestStubs.Project({
          stats: [
            [1525042800, 1],
            [1525046400, 2],
          ],
          platform: 'javascript',
          latestDeploys,
        })}
        params={{orgId: 'org-slug'}}
      />,
      TestStubs.routerContext()
    );

    expect(wrapper.find('Deploy')).toHaveLength(2);
    expect(wrapper.find('NoDeploys')).toHaveLength(0);
    expect(wrapper.find('Environment[children="beta"]')).toHaveLength(1);
    expect(wrapper.find('Environment[children="production"]')).toHaveLength(1);
    expect(wrapper.find('Environment[children="staging"]')).toHaveLength(0);
  });

  it('renders empty state if no deploys', function () {
    expect(wrapper.find('NoDeploys')).toHaveLength(1);
  });

  it('renders with platform', function () {
    expect(wrapper.find('PlatformList')).toHaveLength(1);
    const icons = wrapper.find('StyledPlatformIcon');
    expect(icons.first().prop('platform')).toBe('javascript');
  });

  it('renders header link for errors', function () {
    wrapper = mountWithTheme(
      <ProjectCard
        organization={TestStubs.Organization()}
        project={TestStubs.Project({
          stats: [
            [1525042800, 3],
            [1525046400, 3],
          ],
          platform: 'javascript',
        })}
        params={{orgId: 'org-slug'}}
      />,
      TestStubs.routerContext()
    );

    const total = wrapper.find('a[data-test-id="project-errors"]');
    expect(total).toHaveLength(1);
    expect(total.text()).toContain('6 errors');

    // No transacations as the feature isn't set.
    const transactions = wrapper.find('a[data-test-id="project-transactions"]');
    expect(transactions).toHaveLength(0);
  });

  it('renders header link for transactions', function () {
    wrapper = mountWithTheme(
      <ProjectCard
        organization={TestStubs.Organization({features: ['performance-view']})}
        project={TestStubs.Project({
          stats: [
            [1525042800, 3],
            [1525046400, 3],
          ],
          transactionStats: [
            [1525042800, 4],
            [1525046400, 4],
          ],
          platform: 'javascript',
        })}
        params={{orgId: 'org-slug'}}
      />,
      TestStubs.routerContext()
    );

    const total = wrapper.find('a[data-test-id="project-errors"]');
    expect(total).toHaveLength(1);

    const transactions = wrapper.find('a[data-test-id="project-transactions"]');
    expect(transactions).toHaveLength(1);
    expect(transactions.text()).toContain('8 transactions');
  });

  it('renders loading placeholder card if there are no stats', function () {
    wrapper = mountWithTheme(
      <ProjectCard
        organization={TestStubs.Organization()}
        project={TestStubs.Project()}
        params={{orgId: 'org-slug'}}
      />,
      TestStubs.routerContext()
    );

    expect(wrapper.find('LoadingCard')).toHaveLength(1);
  });
});
