import { useMemo } from 'react';
import { TrendingUp, Wallet, PiggyBank, ArrowUpRight, ArrowDownRight, History } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAllMovements, MovementType } from '@/hooks/useMovements';
import { cn } from '@/lib/utils';

export function QuickStats() {
  const { data: movements = [] } = useAllMovements();

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Calculate previous month's ending balance
    const previousMonthsMovements = movements.filter((m) => {
      const date = new Date(m.date);
      const moveYear = date.getFullYear();
      const moveMonth = date.getMonth();
      return moveYear < currentYear || (moveYear === currentYear && moveMonth < currentMonth);
    });

    const prevIncome = previousMonthsMovements
      .filter((m) => m.type === 'income')
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const prevExpense = previousMonthsMovements
      .filter((m) => m.type === 'expense')
      .reduce((sum, m) => sum + Number(m.amount), 0);

    // Savings: deposits minus withdrawals
    const prevSavingsDeposits = previousMonthsMovements
      .filter((m) => m.type === 'savings' && !m.is_withdrawal)
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const prevSavingsWithdrawals = previousMonthsMovements
      .filter((m) => m.type === 'savings' && m.is_withdrawal)
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const prevSavingsNet = prevSavingsDeposits - prevSavingsWithdrawals;
    const previousBalance = prevIncome - prevExpense - prevSavingsNet + prevSavingsWithdrawals;

    // Current month calculations
    const monthlyMovements = movements.filter((m) => {
      const date = new Date(m.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const income = monthlyMovements
      .filter((m) => m.type === 'income')
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const expense = monthlyMovements
      .filter((m) => m.type === 'expense')
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const savingsDeposits = monthlyMovements
      .filter((m) => m.type === 'savings' && !m.is_withdrawal)
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const savingsWithdrawals = monthlyMovements
      .filter((m) => m.type === 'savings' && m.is_withdrawal)
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const savingsNet = savingsDeposits - savingsWithdrawals;

    // Total savings accumulated (all time)
    const allSavingsDeposits = movements
      .filter((m) => m.type === 'savings' && !m.is_withdrawal)
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const allSavingsWithdrawals = movements
      .filter((m) => m.type === 'savings' && m.is_withdrawal)
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const totalSavings = allSavingsDeposits - allSavingsWithdrawals;

    // Current month balance = income - expenses - net savings + previous balance
    // When you withdraw, it adds back to available balance
    const monthBalance = income - expense - savingsNet + savingsWithdrawals;
    const totalBalance = previousBalance + monthBalance;

    return { 
      income, 
      expense, 
      savingsDeposits,
      savingsWithdrawals,
      savingsNet,
      totalSavings,
      monthBalance,
      totalBalance,
      previousBalance
    };
  }, [movements]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const cards = [
    {
      label: 'Ingresos',
      value: stats.income,
      icon: TrendingUp,
      color: 'text-income',
      bgColor: 'bg-income-light',
    },
    {
      label: 'Gastos',
      value: stats.expense,
      icon: Wallet,
      color: 'text-expense',
      bgColor: 'bg-expense-light',
    },
    {
      label: 'Ahorros',
      value: stats.totalSavings,
      icon: PiggyBank,
      color: 'text-savings',
      bgColor: 'bg-savings-light',
      subtitle: stats.savingsWithdrawals > 0 ? `(-${formatCurrency(stats.savingsWithdrawals)} retiros)` : undefined,
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Balance Card */}
      <Card className="glass-card overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Balance disponible</p>
              <p className={cn(
                'text-3xl font-bold mt-1',
                stats.totalBalance >= 0 ? 'text-income' : 'text-expense'
              )}>
                {formatCurrency(stats.totalBalance)}
              </p>
              {stats.previousBalance !== 0 && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <History className="w-3 h-3" />
                  Arrastre mes anterior: {formatCurrency(stats.previousBalance)}
                </p>
              )}
            </div>
            <div className={cn(
              'p-3 rounded-full',
              stats.totalBalance >= 0 ? 'bg-income-light' : 'bg-expense-light'
            )}>
              {stats.totalBalance >= 0 ? (
                <ArrowUpRight className="w-6 h-6 text-income" />
              ) : (
                <ArrowDownRight className="w-6 h-6 text-expense" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="glass-card">
              <CardContent className="p-4 text-center">
                <div className={cn('mx-auto w-10 h-10 rounded-full flex items-center justify-center mb-2', card.bgColor)}>
                  <Icon className={cn('w-5 h-5', card.color)} />
                </div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className={cn('text-sm font-semibold mt-0.5', card.color)}>
                  {formatCurrency(card.value)}
                </p>
                {card.subtitle && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{card.subtitle}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
