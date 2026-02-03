import { useMemo } from 'react';
import { TrendingUp, Wallet, PiggyBank, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useMovements, MovementType } from '@/hooks/useMovements';
import { cn } from '@/lib/utils';

export function QuickStats() {
  const { data: movements = [] } = useMovements();

  const stats = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

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

    const savings = monthlyMovements
      .filter((m) => m.type === 'savings')
      .reduce((sum, m) => sum + Number(m.amount), 0);

    return { income, expense, savings, balance: income - expense - savings };
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
      value: stats.savings,
      icon: PiggyBank,
      color: 'text-savings',
      bgColor: 'bg-savings-light',
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Balance Card */}
      <Card className="glass-card overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Balance del mes</p>
              <p className={cn(
                'text-3xl font-bold mt-1',
                stats.balance >= 0 ? 'text-income' : 'text-expense'
              )}>
                {formatCurrency(stats.balance)}
              </p>
            </div>
            <div className={cn(
              'p-3 rounded-full',
              stats.balance >= 0 ? 'bg-income-light' : 'bg-expense-light'
            )}>
              {stats.balance >= 0 ? (
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
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
