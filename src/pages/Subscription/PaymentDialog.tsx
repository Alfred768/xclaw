/**
 * Payment Dialog Component
 * Payment flow dialog with status states
 */
import { Check, CircleNotch } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PaymentStatus, PlanId, SubscriptionPlan } from './types';
import { useTranslation } from 'react-i18next';

interface PaymentDialogProps {
  isOpen: boolean;
  selectedPlan: PlanId | null;
  plans: Record<PlanId, SubscriptionPlan>;
  paymentStatus: PaymentStatus;
  errorMessage: string | null;
  onPayment: () => void;
  onClose: () => void;
}

export function PaymentDialog({
  isOpen,
  selectedPlan,
  plans,
  paymentStatus,
  errorMessage,
  onPayment,
  onClose,
}: PaymentDialogProps) {
  const { t } = useTranslation('subscription');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('payment.title', { plan: selectedPlan && plans[selectedPlan]?.name })}</DialogTitle>
          <DialogDescription>
            {selectedPlan && (
              <span>
                {t('payment.priceLabel')} {plans[selectedPlan]?.priceText}
                {plans[selectedPlan]?.period}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {paymentStatus === 'idle' && (
            <>
              <p className="text-sm text-muted-foreground">
                {t('payment.idleDescription')}
              </p>
              <Button onClick={onPayment} className="w-full">
                {t('payment.payNow')}
              </Button>
            </>
          )}

          {paymentStatus === 'pending' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <CircleNotch className="h-8 w-8 animate-spin text-primary" weight="bold" />
              </div>
              <p className="text-center text-sm">{t('payment.pendingTitle')}</p>
              <p className="text-center text-xs text-muted-foreground">{t('payment.pendingDescription')}</p>
            </div>
          )}

          {paymentStatus === 'success' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center text-green-600">
                <Check className="h-8 w-8" weight="bold" />
              </div>
              <p className="text-center font-medium text-green-600">{t('payment.success')}</p>
              <Button onClick={onClose} className="w-full">
                {t('payment.done')}
              </Button>
            </div>
          )}

          {paymentStatus === 'failed' && (
            <div className="space-y-4">
              <p className="text-center text-sm text-red-600">
                {errorMessage || t('payment.failedDefault')}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  {t('payment.cancel')}
                </Button>
                <Button onClick={onPayment} className="flex-1">
                  {t('payment.retry')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
