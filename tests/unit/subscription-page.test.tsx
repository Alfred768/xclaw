import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  fetchProfile: vi.fn(),
  fetchQuota: vi.fn(),
  fetchProviders: vi.fn(),
  createPayment: vi.fn(),
  pollPaymentStatus: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
}));

vi.mock('@/lib/payment', () => ({
  createPayment: mocks.createPayment,
  pollPaymentStatus: mocks.pollPaymentStatus,
}));

import { Subscription } from '@/pages/Subscription';
import { useAccountStore } from '@/stores/account';
import { useAuthStore } from '@/stores/auth';
import { useProviderStore } from '@/stores/providers';

describe('Subscription page', () => {
  beforeEach(() => {
    mocks.toastError.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.fetchProfile.mockReset();
    mocks.fetchQuota.mockReset();
    mocks.fetchProviders.mockReset();
    mocks.createPayment.mockReset();
    mocks.pollPaymentStatus.mockReset();

    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      accessToken: null,
      authProvider: null,
      loginToken: null,
      oauthUrl: null,
      authStatus: 'idle',
    });

    useAccountStore.setState((state) => ({
      ...state,
      profile: null,
      quota: null,
      apiKeys: [],
      isLoading: false,
      fetchProfile: mocks.fetchProfile,
      fetchQuota: mocks.fetchQuota,
    }));

    useProviderStore.setState({
      providers: [],
      defaultProviderId: null,
      loading: false,
      error: null,
      fetchProviders: mocks.fetchProviders,
      addProvider: vi.fn(),
      updateProvider: vi.fn(),
      deleteProvider: vi.fn(),
      setApiKey: vi.fn(),
      updateProviderWithKey: vi.fn(),
      deleteApiKey: vi.fn(),
      setDefaultProvider: vi.fn(),
      validateApiKey: vi.fn(),
      getApiKey: vi.fn(),
    });
  });

  it('shows login prompts instead of opening payment when an unauthenticated user clicks upgrade', () => {
    render(<Subscription />);

    fireEvent.click(screen.getByRole('button', { name: '升级套餐' }));

    expect(mocks.toastError).toHaveBeenCalledWith('请先登录后再订阅');
    expect(screen.getByText('请先登录后再订阅')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '去支付' })).not.toBeInTheDocument();
    expect(mocks.createPayment).not.toHaveBeenCalled();
  });

  it('shows the same login prompts from the subscription plans CTA when unauthenticated', () => {
    render(<Subscription />);

    fireEvent.click(screen.getAllByRole('button', { name: '立即订阅' })[0]);

    expect(mocks.toastError).toHaveBeenCalledWith('请先登录后再订阅');
    expect(screen.getByText('请先登录后再订阅')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '去支付' })).not.toBeInTheDocument();
    expect(mocks.createPayment).not.toHaveBeenCalled();
  });

  it('still opens the payment dialog for authenticated users', () => {
    useAuthStore.setState({
      user: {
        id: 'user-1',
        displayName: 'Subscriber',
        subscriptionTier: 'free',
      },
      isAuthenticated: true,
      isLoading: false,
      accessToken: 'access-token',
      authProvider: null,
      loginToken: null,
      oauthUrl: null,
      authStatus: 'idle',
    });

    render(<Subscription />);

    fireEvent.click(screen.getByRole('button', { name: '升级套餐' }));

    expect(mocks.toastError).not.toHaveBeenCalled();
    expect(screen.queryByText('请先登录后再订阅')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '去支付' })).toBeInTheDocument();
  });
});
