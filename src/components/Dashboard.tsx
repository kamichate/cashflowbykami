import { useMemo } from 'react';
import {
  TrendingUp, Wallet, PiggyBank, ArrowUpRight, ArrowDownRight,
  History, DollarSign, Crown, AlertCircle, Gem, Sparkles, LineChart
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAllMovements, Category } from '@/hooks/useMovements';
import { usePendingMoneySummary } from '@/hooks/useSharedExpenses';
import { usePendingPayments } from '@/hooks/usePendingPayments';
import { usePendingIncome } from '@/hooks/usePendingIncome';
import { parseDateString } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number, currency: 'ARS' | 'USD' = 'ARS') =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export function Dashboard() {
  const { data: movements = [] } = useAllMovements();
  const pendingSummary = usePendingMoneySummary();

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const getMonthYear = (dateStr: string) => {
      const date = parseDateString(dateStr);
      return { month: date.getMonth(), year: date.getFullYear() };
    };

    // Helper: calculate balance contribution of a movement
    // Balance = income + transfers - expenses - savings_deposited + savings_withdrawn
    // Yields do NOT affect balance
    const getBalanceImpact = (m: any): number => {
      const amt = Number(m.amount);
      switch (m.type) {
        case 'income': return amt;
        case 'transfer': return amt;
        case 'expense': return -amt;
        case 'savings':
          if (m.is_initial_savings) return 0;
          return m.is_withdrawal ? amt : -amt;
        case 'yield': return 0;
        default: return 0;
      }
    };

    // Previous months balance
    const previousMonthsMovements = movements.filter((m) => {
      const { month, year } = getMonthYear(m.date);
      return year < currentYear || (year === currentYear && month < currentMonth);
    });
    const previousBalance = previousMonthsMovements.reduce((sum, m) => sum + getBalanceImpact(m), 0);

    // Current month
    const monthlyMovements = movements.filter((m) => {
      const { month, year } = getMonthYear(m.date);
      return month === currentMonth && year === currentYear;
    });

    const income = monthlyMovements
      .filter((m) => m.type === 'income')
      .reduce((sum, m) => sum + Number(m.amount), 0);
    const expense = monthlyMovements
      .filter((m) => m.type === 'expense')
      .reduce((sum, m) => sum + Number(m.amount), 0);
    
    const monthBalance = monthlyMovements.reduce((sum, m) => sum + getBalanceImpact(m), 0);
    const totalBalance = previousBalance + monthBalance;

    // Savings totals (deposits - withdrawals, including initial)
    const allSavingsDeposits = movements
      .filter((m) => m.type === 'savings' && !m.is_withdrawal)
      .reduce((sum, m) => sum + Number(m.amount), 0);
    const allSavingsWithdrawals = movements
      .filter((m) => m.type === 'savings' && m.is_withdrawal)
      .reduce((sum, m) => sum + Number(m.amount), 0);
    const totalSavingsARS = allSavingsDeposits - allSavingsWithdrawals;

    // Yields (accumulate in savings section)
    const totalYields = movements
      .filter((m) => m.type === 'yield')
      .reduce((sum, m) => sum + Number(m.amount), 0);

    // USD savings
    const usdDeposits = movements
      .filter((m) => m.type === 'savings' && !m.is_withdrawal && m.currency === 'USD')
      .reduce((sum, m) => sum + Number(m.original_amount || 0), 0);
    const usdWithdrawals = movements
      .filter((m) => m.type === 'savings' && m.is_withdrawal && m.currency === 'USD')
      .reduce((sum, m) => sum + Number(m.original_amount || 0), 0);
    const totalUsdSavings = usdDeposits - usdWithdrawals;

    // ARS-only savings
    const arsOnlyDeposits = movements
      .filter((m) => m.type === 'savings' && !m.is_withdrawal && m.currency !== 'USD')
      .reduce((sum, m) => sum + Number(m.amount), 0);
    const arsOnlyWithdrawals = movements
      .filter((m) => m.type === 'savings' && m.is_withdrawal && m.currency !== 'USD')
      .reduce((sum, m) => sum + Number(m.amount), 0);
    const totalArsSavings = arsOnlyDeposits - arsOnlyWithdrawals;

    // Top expense category this month - use personal_amount for shared expenses
    const expenseByCat = new Map<string, { name: string; total: number }>();
    monthlyMovements
      .filter((m) => m.type === 'expense' && m.category)
      .forEach((m) => {
        const cat = m.category as Category;
        const prev = expenseByCat.get(cat.id) || { name: cat.name, total: 0 };
        // Use personal_amount if set, otherwise full amount
        const catAmount = Number(m.personal_amount ?? m.amount);
        prev.total += catAmount;
        expenseByCat.set(cat.id, prev);
      });
    const topExpense = [...expenseByCat.values()].sort((a, b) => b.total - a.total)[0];

    // Top income category (exclude transfers)
    const incomeByCat = new Map<string, { name: string; total: number }>();
    monthlyMovements
      .filter((m) => m.type === 'income' && m.category)
      .forEach((m) => {
        const cat = m.category as Category;
        const prev = incomeByCat.get(cat.id) || { name: cat.name, total: 0 };
        prev.total += Number(m.amount);
        incomeByCat.set(cat.id, prev);
      });
    const topIncome = [...incomeByCat.values()].sort((a, b) => b.total - a.total)[0];

    // Patrimonio = Balance + Ahorros + Rendimientos
    const patrimonio = totalBalance + totalSavingsARS + totalYields;

    return {
      income, expense, totalBalance, previousBalance,
      totalSavingsARS, totalUsdSavings, totalArsSavings,
      totalYields, topExpense, topIncome, patrimonio,
    };
  }, [movements]);

  const totalPending = pendingSummary?.total || 0;

  const { data: pendingPayments = [] } = usePendingPayments();
  const { data: pendingIncomeList = [] } = usePendingIncome();

  const unpaidPaymentsTotal = pendingPayments
    .filter((p) => !p.is_paid)
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const uncollectedIncomeTotal = pendingIncomeList
    .filter((i) => !i.is_collected)
    .reduce((sum, i) => sum + Number(i.amount), 0);
  const projectedBalance = stats.totalBalance - unpaidPaymentsTotal + uncollectedIncomeTotal;
  const balanceDiff = projectedBalance - stats.totalBalance;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Patrimonio Total */}
      <Card className="glass-card overflow-hidden border-primary/20">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Gem className="w-3 h-3" /> Patrimonio Total
              </p>
              <p className={cn(
                'text-3xl font-bold mt-1',
                stats.patrimonio >= 0 ? 'text-primary' : 'text-expense'
              )}>
                {formatCurrency(stats.patrimonio)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Balance + Ahorros + Rendimientos
              </p>
            </div>
            <div className="p-3 rounded-full bg-primary/10">
              <Gem className="w-6 h-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance + Pending */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              {stats.totalBalance >= 0 ? (
                <ArrowUpRight className="w-4 h-4 text-income" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-expense" />
              )}
              <p className="text-xs text-muted-foreground">Balance</p>
            </div>
            <p className={cn(
              'text-xl font-bold',
              stats.totalBalance >= 0 ? 'text-income' : 'text-expense'
            )}>
              {formatCurrency(stats.totalBalance)}
            </p>
            {stats.previousBalance !== 0 && (
              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
                <History className="w-2.5 h-2.5" />
                Anterior: {formatCurrency(stats.previousBalance)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-warning" />
              <p className="text-xs text-muted-foreground">Pendiente</p>
            </div>
            <p className="text-xl font-bold text-warning">
              {formatCurrency(totalPending)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              No incluido en balance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Income / Expense this month */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <div className="mx-auto w-9 h-9 rounded-full flex items-center justify-center mb-1.5 bg-income-light">
              <TrendingUp className="w-4 h-4 text-income" />
            </div>
            <p className="text-xs text-muted-foreground">Ingresos</p>
            <p className="text-sm font-semibold text-income mt-0.5">
              {formatCurrency(stats.income)}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <div className="mx-auto w-9 h-9 rounded-full flex items-center justify-center mb-1.5 bg-expense-light">
              <Wallet className="w-4 h-4 text-expense" />
            </div>
            <p className="text-xs text-muted-foreground">Gastos</p>
            <p className="text-sm font-semibold text-expense mt-0.5">
              {formatCurrency(stats.expense)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Categories */}
      {(stats.topExpense || stats.topIncome) && (
        <Card className="glass-card">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Crown className="w-4 h-4 text-primary" />
              Top del Mes
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {stats.topIncome && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-income-light/50">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-income" />
                  <span className="text-xs text-muted-foreground">Mayor ingreso</span>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium">{stats.topIncome.name}</p>
                  <p className="text-xs text-income font-semibold">{formatCurrency(stats.topIncome.total)}</p>
                </div>
              </div>
            )}
            {stats.topExpense && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-expense-light/50">
                <div className="flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5 text-expense" />
                  <span className="text-xs text-muted-foreground">Mayor gasto (mi parte)</span>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium">{stats.topExpense.name}</p>
                  <p className="text-xs text-expense font-semibold">{formatCurrency(stats.topExpense.total)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Savings + Yields */}
      <Card className="glass-card">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-savings" />
            Ahorros
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-savings-light/50 text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">Pesos</p>
              <p className="text-sm font-bold text-savings">
                {formatCurrency(stats.totalArsSavings)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-savings-light/50 text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5 flex items-center justify-center gap-0.5">
                <DollarSign className="w-2.5 h-2.5" /> Dólares
              </p>
              <p className="text-sm font-bold text-savings">
                {formatCurrency(stats.totalUsdSavings, 'USD')}
              </p>
            </div>
          </div>
          {stats.totalYields > 0 && (
            <div className="mt-3 p-2.5 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs text-muted-foreground">Rendimientos acumulados</p>
              </div>
              <p className="text-sm font-bold text-primary">
                {formatCurrency(stats.totalYields)}
              </p>
            </div>
          )}
          <div className="mt-3 p-2.5 rounded-lg bg-muted/30 text-center">
            <p className="text-[10px] text-muted-foreground">Total en ARS equivalente</p>
            <p className="text-base font-bold text-savings">
              {formatCurrency(stats.totalSavingsARS + stats.totalYields)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
