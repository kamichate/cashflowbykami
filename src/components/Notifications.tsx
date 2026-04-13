import { useMemo } from 'react';
import { parseISO, isBefore, addDays, isToday } from 'date-fns';
import { Bell, AlertCircle, Clock, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { usePendingMoneySummary } from '@/hooks/useSharedExpenses';
import { usePendingPayments } from '@/hooks/usePendingPayments';
import { useAllMovements } from '@/hooks/useMovements';
import { parseDateString } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

interface Alert {
  id: string;
  icon: React.ElementType;
  message: string;
  type: 'warning' | 'danger' | 'info';
}

const typeClasses = {
  warning: 'movement-warning',
  danger: 'movement-expense',
  info: 'movement-savings',
};

export function Notifications() {
  const pendingSummary = usePendingMoneySummary();
  const { data: payments = [] } = usePendingPayments();
  const { data: movements = [] } = useAllMovements();

  const alerts = useMemo(() => {
    const list: Alert[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Pending money
    const totalPending = pendingSummary?.total || 0;
    if (totalPending > 0) {
      list.push({
        id: 'pending-money',
        icon: AlertCircle,
        message: `Tenés dinero pendiente por cobrar`,
        type: 'warning',
      });
    }

    // Overdue payments
    const unpaid = payments.filter(p => !p.is_paid);
    const overdue = unpaid.filter(p => isBefore(parseISO(p.due_date), today));
    if (overdue.length > 0) {
      list.push({
        id: 'overdue',
        icon: AlertCircle,
        message: `Tenés ${overdue.length} pago${overdue.length > 1 ? 's' : ''} vencido${overdue.length > 1 ? 's' : ''}`,
        type: 'danger',
      });
    }

    // Upcoming payments (next 7 days)
    const upcoming = unpaid.filter(p => {
      const due = parseISO(p.due_date);
      return !isBefore(due, today) && isBefore(due, addDays(today, 7));
    });
    if (upcoming.length > 0) {
      list.push({
        id: 'upcoming',
        icon: Clock,
        message: `Tenés ${upcoming.length} pago${upcoming.length > 1 ? 's' : ''} próximo${upcoming.length > 1 ? 's' : ''}`,
        type: 'warning',
      });
    }

    // Spending comparison: today vs yesterday
    const todayStr = today.toISOString().split('T')[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const todayExpenses = movements
      .filter(m => m.type === 'expense' && m.date === todayStr)
      .reduce((s, m) => s + Number(m.amount), 0);
    const yesterdayExpenses = movements
      .filter(m => m.type === 'expense' && m.date === yesterdayStr)
      .reduce((s, m) => s + Number(m.amount), 0);

    if (todayExpenses > 0 && todayExpenses > yesterdayExpenses) {
      list.push({
        id: 'spending-up',
        icon: TrendingDown,
        message: 'Hoy gastaste más que ayer',
        type: 'info',
      });
    }

    return list;
  }, [pendingSummary, payments, movements]);

  if (alerts.length === 0) return null;

  return (
    <Card className="glass-card animate-fade-in border-primary/20">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Notificaciones</span>
        </div>
        {alerts.map(alert => {
          const Icon = alert.icon;
          return (
            <div key={alert.id} className={cn('flex items-center gap-3 p-2.5 rounded-lg', typeClasses[alert.type])}>
              <Icon className="w-4 h-4 shrink-0" />
              <span className="text-sm">{alert.message}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
