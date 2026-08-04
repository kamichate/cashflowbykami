import { useMemo } from 'react';
import { usePendingPayments } from './usePendingPayments';
import { usePendingIncome } from './usePendingIncome';
import { isPast, isToday, parseISO } from 'date-fns';

export function usePendingNotificationsCount() {
  const { data: payments = [] } = usePendingPayments();
  const { data: income = [] } = usePendingIncome();

  const count = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueOrDue = (dueDate?: string) => {
      if (!dueDate) return false;
      const date = parseISO(dueDate);
      return isPast(date) || isToday(date);
    };

    const overduePayments = payments.filter(
      (p) => !p.is_paid && overdueOrDue(p.due_date)
    ).length;
    const overdueIncome = income.filter(
      (i) => !i.is_collected && overdueOrDue(i.due_date)
    ).length;

    return overduePayments + overdueIncome;
  }, [payments, income]);

  return count;
}
