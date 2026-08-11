import { useState, useMemo } from 'react';
import {
  TrendingUp, Wallet, PiggyBank, ArrowUpRight, ArrowDownRight,
  History, DollarSign, AlertCircle, Gem, Sparkles, LineChart as LineChartIcon,
  PieChart as PieChartIcon, ChevronLeft, ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  AreaChart, Area, XAxis, YAxis,
} from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

const PALETTE = [
  'hsl(350, 70%, 70%)', 'hsl(45, 90%, 65%)', 'hsl(200, 80%, 70%)',
  'hsl(280, 60%, 70%)', 'hsl(120, 50%, 60%)', 'hsl(30, 80%, 65%)',
  'hsl(170, 60%, 55%)', 'hsl(320, 60%, 65%)',
];

// Balance impact for a single movement
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

const getMonthStats = (movements: any[], date: Date) => {
  const month = date.getMonth();
  const year = date.getFullYear();
  const monthlyMovements = movements.filter((m) => {
    const d = parseDateString(m.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  const income = monthlyMovements
    .filter((m) => m.type === 'income')
    .reduce((sum, m) => sum + Number(m.amount), 0);
  const expense = monthlyMovements
    .filter((m) => m.type === 'expense')
    .reduce((sum, m) => sum + Number(m.amount), 0);

  return { income, expense, net: income - expense };
};

const percentageDiff = (current: number, previous: number): number | null => {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
};

export function Dashboard({ onNavigate }: { onNavigate?: (tab: string) => void } = {}) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const { data: movements = [] } = useAllMovements();
  const pendingSummary = usePendingMoneySummary();

  const selectedMonthLabel = format(selectedMonth, 'MMMM yyyy', { locale: es });
  const isCurrentMonth = selectedMonth.getMonth() === new Date().getMonth() &&
    selectedMonth.getFullYear() === new Date().getFullYear();

  const monthlyStats = useMemo(() => {
    const current = getMonthStats(movements, selectedMonth);
    const previous = getMonthStats(movements, subMonths(selectedMonth, 1));
    return { current, previous };
  }, [movements, selectedMonth]);

  const incomeDiff = percentageDiff(monthlyStats.current.income, monthlyStats.previous.income);
  const expenseDiff = percentageDiff(monthlyStats.current.expense, monthlyStats.previous.expense);
  const netDiff = percentageDiff(monthlyStats.current.net, monthlyStats.previous.net);

  const monthlyCategoryBreakdown = useMemo(() => {
    const expenseByCat = new Map<string, { name: string; total: number }>();
    movements
      .filter((m) => {
        const d = parseDateString(m.date);
        return d.getMonth() === selectedMonth.getMonth() &&
          d.getFullYear() === selectedMonth.getFullYear() &&
          m.type === 'expense' && m.category;
      })
      .forEach((m) => {
        const cat = m.category as Category;
        const prev = expenseByCat.get(cat.id) || { name: cat.name, total: 0 };
        const catAmount = Number(m.personal_amount ?? m.amount);
        prev.total += catAmount;
        expenseByCat.set(cat.id, prev);
      });
    return [...expenseByCat.values()]
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [movements, selectedMonth]);

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const getMonthYear = (dateStr: string) => {
      const date = parseDateString(dateStr);
      return { month: date.getMonth(), year: date.getFullYear() };
    };

    const previousMonthsMovements = movements.filter((m) => {
      const { month, year } = getMonthYear(m.date);
      return year < currentYear || (year === currentYear && month < currentMonth);
    });
    const previousBalance = previousMonthsMovements.reduce((sum, m) => sum + getBalanceImpact(m), 0);

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

    const allSavingsDeposits = movements
      .filter((m) => m.type === 'savings' && !m.is_withdrawal)
      .reduce((sum, m) => sum + Number(m.amount), 0);
    const allSavingsWithdrawals = movements
      .filter((m) => m.type === 'savings' && m.is_withdrawal)
      .reduce((sum, m) => sum + Number(m.amount), 0);
    const totalSavingsARS = allSavingsDeposits - allSavingsWithdrawals;

    const totalYields = movements
      .filter((m) => m.type === 'yield')
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const usdDeposits = movements
      .filter((m) => m.type === 'savings' && !m.is_withdrawal && m.currency === 'USD')
      .reduce((sum, m) => sum + Number(m.original_amount || 0), 0);
    const usdWithdrawals = movements
      .filter((m) => m.type === 'savings' && m.is_withdrawal && m.currency === 'USD')
      .reduce((sum, m) => sum + Number(m.original_amount || 0), 0);
    const totalUsdSavings = usdDeposits - usdWithdrawals;

    const arsOnlyDeposits = movements
      .filter((m) => m.type === 'savings' && !m.is_withdrawal && m.currency !== 'USD')
      .reduce((sum, m) => sum + Number(m.amount), 0);
    const arsOnlyWithdrawals = movements
      .filter((m) => m.type === 'savings' && m.is_withdrawal && m.currency !== 'USD')
      .reduce((sum, m) => sum + Number(m.amount), 0);
    const totalArsSavings = arsOnlyDeposits - arsOnlyWithdrawals;

    // Expenses by category (current month) — use personal_amount
    const expenseByCat = new Map<string, { name: string; total: number }>();
    monthlyMovements
      .filter((m) => m.type === 'expense' && m.category)
      .forEach((m) => {
        const cat = m.category as Category;
        const prev = expenseByCat.get(cat.id) || { name: cat.name, total: 0 };
        const catAmount = Number(m.personal_amount ?? m.amount);
        prev.total += catAmount;
        expenseByCat.set(cat.id, prev);
      });
    const categoryBreakdown = [...expenseByCat.values()]
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total);

    const patrimonio = totalBalance + totalSavingsARS + totalYields;

    return {
      income, expense, totalBalance, previousBalance,
      totalSavingsARS, totalUsdSavings, totalArsSavings,
      totalYields, categoryBreakdown, patrimonio,
    };
  }, [movements]);

  // Last 6 months balance (cumulative end-of-month)
  const balanceHistory = useMemo(() => {
    const now = new Date();
    const months: { month: string; balance: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const ref = subMonths(now, i);
      const end = endOfMonth(ref);
      const balance = movements
        .filter((m) => parseDateString(m.date) <= end)
        .reduce((sum, m) => sum + getBalanceImpact(m), 0);
      months.push({
        month: format(startOfMonth(ref), 'MMM', { locale: es }),
        balance,
      });
    }
    return months;
  }, [movements]);

  const totalExpensesMonth = monthlyCategoryBreakdown.reduce((s, c) => s + c.total, 0);

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

      {/* Balance + Projected + Pending */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              <LineChartIcon className="w-4 h-4 text-primary" />
              <p className="text-xs text-muted-foreground">Balance Proyectado</p>
            </div>
            <p className={cn(
              'text-xl font-bold',
              projectedBalance >= 0 ? 'text-income' : 'text-expense'
            )}>
              {formatCurrency(projectedBalance)}
            </p>
            {balanceDiff !== 0 && (
              <p className={cn(
                'text-[10px] mt-0.5 flex items-center gap-0.5',
                balanceDiff > 0 ? 'text-income' : 'text-expense'
              )}>
                {balanceDiff > 0 ? (
                  <ArrowUpRight className="w-2.5 h-2.5" />
                ) : (
                  <ArrowDownRight className="w-2.5 h-2.5" />
                )}
                {formatCurrency(Math.abs(balanceDiff))}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground mt-0.5">
              si cobrás y pagás todo lo pendiente
            </p>
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

      {/* Resumen del mes */}
      <Card className="glass-card">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <LineChartIcon className="w-4 h-4 text-primary" />
              Resumen del mes
              {!isCurrentMonth && (
                <span className="text-[10px] font-normal text-muted-foreground capitalize">
                  {selectedMonthLabel}
                </span>
              )}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-medium capitalize min-w-[90px] text-center">
                {selectedMonthLabel}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
                disabled={isCurrentMonth}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          {/* Income / Expense / Net */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-income-light/50 text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">Ingresos</p>
              <p className="text-sm font-bold text-income">{formatCurrency(monthlyStats.current.income)}</p>
              {incomeDiff !== null && (
                <p className={cn('text-[10px] mt-0.5 flex items-center justify-center gap-0.5', incomeDiff >= 0 ? 'text-income' : 'text-expense')}>
                  {incomeDiff >= 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                  {Math.abs(incomeDiff).toFixed(0)}% vs mes ant.
                </p>
              )}
            </div>
            <div className="p-3 rounded-lg bg-expense-light/50 text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">Gastos</p>
              <p className="text-sm font-bold text-expense">{formatCurrency(monthlyStats.current.expense)}</p>
              {expenseDiff !== null && (
                <p className={cn('text-[10px] mt-0.5 flex items-center justify-center gap-0.5', expenseDiff <= 0 ? 'text-income' : 'text-expense')}>
                  {expenseDiff <= 0 ? <ArrowDownRight className="w-2.5 h-2.5" /> : <ArrowUpRight className="w-2.5 h-2.5" />}
                  {Math.abs(expenseDiff).toFixed(0)}% vs mes ant.
                </p>
              )}
            </div>
            <div className={cn('p-3 rounded-lg text-center', monthlyStats.current.net >= 0 ? 'bg-income-light/50' : 'bg-expense-light/50')}>
              <p className="text-[10px] text-muted-foreground mb-0.5">Resultado</p>
              <p className={cn('text-sm font-bold', monthlyStats.current.net >= 0 ? 'text-income' : 'text-expense')}>
                {formatCurrency(monthlyStats.current.net)}
              </p>
              {netDiff !== null && (
                <p className={cn('text-[10px] mt-0.5 flex items-center justify-center gap-0.5', netDiff >= 0 ? 'text-income' : 'text-expense')}>
                  {netDiff >= 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                  {Math.abs(netDiff).toFixed(0)}% vs mes ant.
                </p>
              )}
            </div>
          </div>

          {/* Ratio bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Relación ingreso / gasto</span>
              <span className="text-muted-foreground">
                {monthlyStats.current.income + monthlyStats.current.expense > 0
                  ? `${((monthlyStats.current.income / (monthlyStats.current.income + monthlyStats.current.expense)) * 100).toFixed(0)}% ingreso`
                  : 'Sin movimientos'}
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted/50 overflow-hidden flex">
              {monthlyStats.current.income + monthlyStats.current.expense > 0 ? (
                <>
                  <div
                    className="h-full bg-income"
                    style={{
                      width: `${(monthlyStats.current.income / (monthlyStats.current.income + monthlyStats.current.expense)) * 100}%`,
                    }}
                  />
                  <div
                    className="h-full bg-expense"
                    style={{
                      width: `${(monthlyStats.current.expense / (monthlyStats.current.income + monthlyStats.current.expense)) * 100}%`,
                    }}
                  />
                </>
              ) : (
                <div className="h-full w-full bg-muted" />
              )}
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="text-income">Ingreso {formatCurrency(monthlyStats.current.income)}</span>
              <span className="text-expense">Gasto {formatCurrency(monthlyStats.current.expense)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Donut: Gastos del mes por categoría */}
      <Card className="glass-card">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-primary" />
            Gastos del mes por categoría
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {monthlyCategoryBreakdown.length === 0 ? (
            <p className="text-center text-muted-foreground text-xs py-8">
              Sin gastos este mes
            </p>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-1/2 h-[200px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={monthlyCategoryBreakdown}
                      dataKey="total"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {monthlyCategoryBreakdown.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }: any) => {
                        if (active && payload?.length) {
                          const p = payload[0];
                          const pct = totalExpensesMonth > 0 ? (p.value / totalExpensesMonth) * 100 : 0;
                          return (
                            <div className="glass-card p-2 border shadow-lg text-xs">
                              <p className="font-medium">{p.name}</p>
                              <p className="text-expense">{formatCurrency(p.value)}</p>
                              <p className="text-muted-foreground">{pct.toFixed(1)}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-[10px] text-muted-foreground">Total</p>
                  <p className="text-sm font-bold text-expense">
                    {formatCurrency(totalExpensesMonth)}
                  </p>
                </div>
              </div>
              <div className="w-full sm:w-1/2 space-y-1.5 max-h-[200px] overflow-y-auto">
                {monthlyCategoryBreakdown.map((c, i) => {
                  const pct = totalExpensesMonth > 0 ? (c.total / totalExpensesMonth) * 100 : 0;
                  return (
                    <div key={c.name} className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                        />
                        <span className="truncate">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
                        <span className="font-medium">{formatCurrency(c.total)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Income / Expense this month */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <div className="mx-auto w-9 h-9 rounded-full flex items-center justify-center mb-1.5 bg-income-light">
              <TrendingUp className="w-4 h-4 text-income" />
            </div>
            <p className="text-xs text-muted-foreground">Ingresos</p>
            <p className="text-sm font-semibold text-income mt-0.5">
              {formatCurrency(monthlyStats.current.income)}
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
              {formatCurrency(monthlyStats.current.expense)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Balance — últimos 6 meses */}
      <Card className="glass-card">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <LineChartIcon className="w-4 h-4 text-primary" />
            Balance — últimos 6 meses
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={balanceHistory} margin={{ top: 8, right: 12, left: 12, bottom: 0 }}>
              <defs>
                <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                content={({ active, payload, label }: any) => {
                  if (active && payload?.length) {
                    return (
                      <div className="glass-card p-2 border shadow-lg text-xs">
                        <p className="font-medium capitalize">{label}</p>
                        <p className="text-primary">{formatCurrency(payload[0].value)}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#balanceFill)"
                dot={{ r: 3, fill: 'hsl(var(--primary))' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

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
