import { useMemo } from 'react';
import { format, parseISO, eachMonthOfInterval, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachWeekOfInterval, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAllMovements, useCategories, MovementType } from '@/hooks/useMovements';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatUSD = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 border shadow-lg">
        <p className="font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const USDTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 border shadow-lg">
        <p className="font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {formatUSD(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function Charts() {
  const { data: movements = [] } = useAllMovements();
  const { data: categories = [] } = useCategories();

  // Weekly expenses for current month
  const weeklyExpenses = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const weeks = eachWeekOfInterval(
      { start: monthStart, end: monthEnd },
      { weekStartsOn: 1 }
    );

    const expenseMovements = movements.filter((m) => {
      const date = parseISO(m.date);
      return m.type === 'expense' && isWithinInterval(date, { start: monthStart, end: monthEnd });
    });

    const expenseCategories = categories.filter(c => c.type === 'expense');

    return weeks.map((weekStart, i) => {
      const wStart = i === 0 ? monthStart : weekStart;
      const wEnd = i === weeks.length - 1 ? monthEnd : endOfWeek(weekStart, { weekStartsOn: 1 });

      const weekMovements = expenseMovements.filter((m) => {
        const date = parseISO(m.date);
        return isWithinInterval(date, { start: wStart, end: wEnd });
      });

      const result: Record<string, any> = {
        week: `Sem ${i + 1} (${format(wStart, 'dd/MM')})`,
        Total: weekMovements.reduce((sum, m) => sum + Number(m.amount), 0),
      };

      expenseCategories.forEach(cat => {
        result[cat.name] = weekMovements
          .filter(m => m.category_id === cat.id)
          .reduce((sum, m) => sum + Number(m.amount), 0);
      });

      return result;
    });
  }, [movements, categories]);

  const expenseCategoryNames = useMemo(() => {
    return categories.filter(c => c.type === 'expense').map(c => c.name);
  }, [categories]);

  // Monthly trend with remainder
  const monthlyTrend = useMemo(() => {
    if (movements.length === 0) return [];

    const dates = movements.map((m) => parseISO(m.date));
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    const months = eachMonthOfInterval({
      start: startOfMonth(minDate),
      end: endOfMonth(maxDate),
    });

    return months.map((month) => {
      const monthMovements = movements.filter((m) => {
        const date = parseISO(m.date);
        return date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear();
      });

      const income = monthMovements
        .filter((m) => m.type === 'income')
        .reduce((sum, m) => sum + Number(m.amount), 0);

      const expenses = monthMovements
        .filter((m) => m.type === 'expense')
        .reduce((sum, m) => sum + Number(m.amount), 0);

      const savingsDeposits = monthMovements
        .filter((m) => m.type === 'savings' && !m.is_withdrawal && !m.is_initial_savings)
        .reduce((sum, m) => sum + Number(m.amount), 0);

      const savingsWithdrawals = monthMovements
        .filter((m) => m.type === 'savings' && m.is_withdrawal)
        .reduce((sum, m) => sum + Number(m.amount), 0);

      const netSavings = savingsDeposits - savingsWithdrawals;
      const remainder = income - expenses - netSavings;

      return {
        month: format(month, 'MMM yy', { locale: es }),
        Ingresos: income,
        Gastos: expenses,
        'Ahorro Neto': netSavings,
        Sobrante: remainder,
      };
    });
  }, [movements]);

  // Savings split: ARS vs USD
  const savingsTrend = useMemo(() => {
    if (movements.length === 0) return [];

    const savingsMovements = movements.filter(m => m.type === 'savings');
    if (savingsMovements.length === 0) return [];

    const dates = savingsMovements.map((m) => parseISO(m.date));
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    const months = eachMonthOfInterval({
      start: startOfMonth(minDate),
      end: endOfMonth(maxDate),
    });

    return months.map((month) => {
      const monthMovements = savingsMovements.filter((m) => {
        const date = parseISO(m.date);
        return date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear();
      });

      // ARS savings (currency = ARS)
      const arsDeposits = monthMovements
        .filter(m => m.currency === 'ARS' && !m.is_withdrawal)
        .reduce((sum, m) => sum + Number(m.amount), 0);
      const arsWithdrawals = monthMovements
        .filter(m => m.currency === 'ARS' && m.is_withdrawal)
        .reduce((sum, m) => sum + Number(m.amount), 0);

      // USD savings (currency = USD) - use original_amount for USD value
      const usdDeposits = monthMovements
        .filter(m => m.currency === 'USD' && !m.is_withdrawal)
        .reduce((sum, m) => sum + Number(m.original_amount || m.amount), 0);
      const usdWithdrawals = monthMovements
        .filter(m => m.currency === 'USD' && m.is_withdrawal)
        .reduce((sum, m) => sum + Number(m.original_amount || m.amount), 0);

      return {
        month: format(month, 'MMM yy', { locale: es }),
        'Ahorro ARS': arsDeposits - arsWithdrawals,
        'Ahorro USD': usdDeposits - usdWithdrawals,
      };
    });
  }, [movements]);

  const expenseColors = [
    'hsl(350, 70%, 70%)', 'hsl(45, 90%, 65%)', 'hsl(200, 80%, 70%)',
    'hsl(280, 60%, 70%)', 'hsl(120, 50%, 60%)', 'hsl(30, 80%, 65%)',
    'hsl(170, 60%, 55%)', 'hsl(320, 60%, 65%)',
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Weekly Expenses */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Gastos Semanales — {format(new Date(), 'MMMM yyyy', { locale: es })}</CardTitle>
        </CardHeader>
        <CardContent>
          {weeklyExpenses.length === 0 || weeklyExpenses.every(w => w.Total === 0) ? (
            <p className="text-center text-muted-foreground py-8">Sin gastos este mes</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyExpenses}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="week" className="text-xs" />
                <YAxis tickFormatter={(v) => `$${v / 1000}k`} className="text-xs" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {expenseCategoryNames.map((name, i) => (
                  <Bar
                    key={name}
                    dataKey={name}
                    stackId="expenses"
                    fill={expenseColors[i % expenseColors.length]}
                    radius={i === expenseCategoryNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Monthly Trend with Remainder */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Evolución Mensual</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="bars" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="bars">Barras</TabsTrigger>
              <TabsTrigger value="lines">Líneas</TabsTrigger>
            </TabsList>

            <TabsContent value="bars">
              {monthlyTrend.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Sin datos históricos</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis tickFormatter={(v) => `$${v / 1000}k`} className="text-xs" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="Ingresos" fill="hsl(160, 60%, 65%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Gastos" fill="hsl(350, 70%, 70%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Ahorro Neto" fill="hsl(200, 80%, 70%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Sobrante" fill="hsl(45, 90%, 65%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </TabsContent>

            <TabsContent value="lines">
              {monthlyTrend.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Sin datos históricos</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis tickFormatter={(v) => `$${v / 1000}k`} className="text-xs" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="Ingresos" stroke="hsl(160, 60%, 65%)" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Gastos" stroke="hsl(350, 70%, 70%)" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Ahorro Neto" stroke="hsl(200, 80%, 70%)" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Sobrante" stroke="hsl(45, 90%, 65%)" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Savings: ARS vs USD */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Ahorros: Pesos vs Dólares</CardTitle>
        </CardHeader>
        <CardContent>
          {savingsTrend.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Sin datos de ahorros</p>
          ) : (
            <Tabs defaultValue="ars" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="ars">Pesos (ARS)</TabsTrigger>
                <TabsTrigger value="usd">Dólares (USD)</TabsTrigger>
                <TabsTrigger value="both">Comparativa</TabsTrigger>
              </TabsList>

              <TabsContent value="ars">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={savingsTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis tickFormatter={(v) => `$${v / 1000}k`} className="text-xs" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Ahorro ARS" fill="hsl(160, 60%, 65%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="usd">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={savingsTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis tickFormatter={(v) => `US$${v}`} className="text-xs" />
                    <Tooltip content={<USDTooltip />} />
                    <Bar dataKey="Ahorro USD" fill="hsl(200, 80%, 70%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="both">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={savingsTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis yAxisId="ars" tickFormatter={(v) => `$${v / 1000}k`} className="text-xs" />
                    <YAxis yAxisId="usd" orientation="right" tickFormatter={(v) => `US$${v}`} className="text-xs" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line yAxisId="ars" type="monotone" dataKey="Ahorro ARS" stroke="hsl(160, 60%, 65%)" strokeWidth={2} dot={{ r: 4 }} />
                    <Line yAxisId="usd" type="monotone" dataKey="Ahorro USD" stroke="hsl(200, 80%, 70%)" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
