/**
 * ZPay Payment Utilities
 * Frontend utilities for creating payments and polling payment status
 */

import { useAuthStore } from '@/stores/auth';

export interface CreatePaymentParams {
  amount: number;
  type: 'alipay' | 'wxpay';
  productName: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePaymentResult {
  paymentUrl: string;
  orderId: string;
}

export interface PaymentStatus {
  orderId: string;
  status: 'pending' | 'paid' | 'failed';
  amount: number;
  paymentType: 'alipay' | 'wxpay';
  productName: string;
  createdAt: string;
  paidAt: string | null;
}

/**
 * Create a new payment order
 * @param params Payment parameters
 * @returns Payment URL and order ID
 */
export async function createPayment(
  params: CreatePaymentParams
): Promise<CreatePaymentResult> {
  // Get access token from auth store (stored during OAuth login)
  const accessToken = useAuthStore.getState().accessToken;

  if (!accessToken) {
    throw new Error('User not authenticated');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const response = await fetch(`${supabaseUrl}/functions/v1/zpay-create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    let errorMessage = 'Failed to create payment';
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
      console.error('Payment API error:', error);
    } catch (e) {
      console.error('Payment API response:', response.status, response.statusText);
    }
    throw new Error(errorMessage);
  }

  const result = await response.json();
  return {
    paymentUrl: result.paymentUrl,
    orderId: result.orderId,
  };
}

/**
 * Get payment status
 * @param orderId Order ID to check
 * @returns Payment status information
 */
export async function getPaymentStatus(orderId: string): Promise<PaymentStatus> {
  // Get access token from auth store
  const accessToken = useAuthStore.getState().accessToken;

  if (!accessToken) {
    throw new Error('User not authenticated');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const response = await fetch(
    `${supabaseUrl}/functions/v1/zpay-status?order_id=${encodeURIComponent(orderId)}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get payment status');
  }

  const result = await response.json();
  return result.transaction;
}

/**
 * Poll payment status until completion
 * @param orderId Order ID to poll
 * @param onPaid Callback when payment is successful
 * @param onFailure Callback when payment fails
 * @param options Polling options
 * @returns Cleanup function to stop polling
 */
export function pollPaymentStatus(
  orderId: string,
  onPaid: () => void,
  onFailure: (error: string) => void,
  options: {
    intervalMs?: number;
    maxAttempts?: number;
    timeoutMs?: number;
  } = {}
): () => void {
  const {
    intervalMs = 3000, // Poll every 3 seconds
    maxAttempts = 100, // Maximum 100 attempts
    timeoutMs = 300000, // 5 minute timeout
  } = options;

  let attempts = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let isPolling = true;

  const timeoutPromise = new Promise<void>((_, reject) => {
    setTimeout(() => {
      isPolling = false;
      reject(new Error('Polling timeout'));
    }, timeoutMs);
  });

  const poll = async () => {
    if (!isPolling) return;

    attempts++;

    try {
      const status = await getPaymentStatus(orderId);

      if (status.status === 'paid') {
        isPolling = false;
        onPaid();
        return;
      }

      if (status.status === 'failed') {
        isPolling = false;
        onFailure('Payment failed');
        return;
      }

      if (attempts >= maxAttempts) {
        isPolling = false;
        onFailure('Maximum polling attempts reached');
        return;
      }

      // Continue polling
      if (isPolling) {
        timeoutId = setTimeout(poll, intervalMs);
      }
    } catch (error) {
      // Log error but continue polling
      console.error('Error polling payment status:', error);

      if (attempts >= maxAttempts) {
        isPolling = false;
        onFailure('Failed to check payment status');
        return;
      }

      if (isPolling) {
        timeoutId = setTimeout(poll, intervalMs);
      }
    }
  };

  // Start polling
  poll();

  // Return cleanup function
  return () => {
    isPolling = false;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };
}

/**
 * Open payment page in new window and monitor for completion
 * @param paymentUrl Payment URL to open
 * @param orderId Order ID to monitor
 * @param onComplete Callback when payment is complete (success or failure)
 * @returns Cleanup function
 */
export function openPaymentWindow(
  paymentUrl: string,
  orderId: string,
  onComplete: (success: boolean, error?: string) => void
): () => void {
  // Open payment URL in new window
  const paymentWindow = window.open(paymentUrl, '_blank', 'width=800,height=600');

  if (!paymentWindow) {
    onComplete(false, 'Failed to open payment window. Please allow popups.');
    return () => {};
  }

  // Poll for payment status
  const cleanup = pollPaymentStatus(
    orderId,
    () => {
      onComplete(true);
      // Try to close the payment window
      try {
        paymentWindow.close();
      } catch {
        // Ignore errors
      }
    },
    (error) => {
      onComplete(false, error);
    }
  );

  return cleanup;
}
