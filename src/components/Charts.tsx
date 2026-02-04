import { useMemo } from 'react';
import { format, parseISO, eachMonthOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAllMovements, useCategories, MovementType } from '@/hooks/useMovements';

const COLORS = {
  income: ['hsl(160, 60%, 65%)', 'hsl(160, 55%, 55%)', 'hsl(160, 50%, 45%)', 'hsl(160, 45%, 40%)', 'hsl(160, 40%, 35%)'],
  expense: ['hsl(350, 70%, 70%)', 'hsl(350, 65%, 60%)', 'hsl(350, 60%, 50%)', 'hsl(350, 55%, 45%)', 'hsl(45, 90%, 65%)', 'hsl(200, 80%, 70%)', 'hsl(350, 50%, 55%)', 'hsl(45, 85%, 60%)', 'hsl(200, 75%, 65%)', 'hsl(350, 45%, 50%)', 'hsl(160, 60%, 60%)', 'hsl(45, 80%, 55%)', 'hsl(200, 70%, 60%)'],
  savings: ['hsl(200, 80%, 70%)', 'hsl(200, 75%, 60%)', 'hsl(200, 70%, 50%)'],
};

export function Charts() {
  const { data: movements = [] } = useAllMovements();
  const { data: categories = [] } = useCategories();

  const currentMonthData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthMovements = movements.filter((m) => {
      const date = parseISO(m.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const byType: Record<MovementType, Record<string, number>> = {
      income: {},
      expense: {},
      savings: {},
    };

    monthMovements.forEach((m) => {
      const catName = m.category?.name || 'Otros';
      // For savings, only count deposits (not withdrawals) in the pie chart
      if (m.type === 'savings' && m.is_withdrawal) {
        return; // Skip withdrawals for savings distribution
      }
      byType[m.type as MovementType][catName] = (byType[m.type as MovementType][catName] || 0) + Number(m.amount);
    });

    return {
      expense: Object.entries(byType.expense).map(([name, value]) => ({ name, value })),
      income: Object.entries(byType.income).map(([name, value]) => ({ name, value })),
      savings: Object.entries(byType.savings).map(([name, value]) => ({ name, value })),
    };
  }, [movements]);

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

      const savingsDeposits = monthMovements
        .filter((m) => m.type === 'savings' && !m.is_withdrawal)
        .reduce((sum, m) => sum + Number(m.amount), 0);
      
      const savingsWithdrawals = monthMovements
        .filter((m) => m.type === 'savings' && m.is_withdrawal)
        .reduce((sum, m) => sum + Number(m.amount), 0);

      return {
        month: format(month, 'MMM yy', { locale: es }),
        Ingresos: monthMovements.filter((m) => m.type === 'income').reduce((sum, m) => sum + Number(m.amount), 0),
        Gastos: monthMovements.filter((m) => m.type === 'expense').reduce((sum, m) => sum + Number(m.amount), 0),
        'Ahorro Neto': savingsDeposits - savingsWithdrawals,
        Depósitos: savingsDeposits,
        Retiros: savingsWithdrawals,
      };
    });
  }, [movements]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
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

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="glass-card p-3 border shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">{formatCurrency(data.value)}</p>
        </div>
      );
    }
    return null;
  };

  const renderPieChart = (data: { name: string; value: number }[], colors: string[], title: string) => (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">Sin datos</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        )}
        <div className="flex flex-wrap gap-2 justify-center mt-2">
          {data.slice(0, 6).map((entry, index) => (
            <div key={entry.name} className="flex items-center gap-1 text-xs">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="truncate max-w-[80px]">{entry.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Pie Charts - Current Month */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {renderPieChart(currentMonthData.expense, COLORS.expense, 'Gastos del Mes')}
        {renderPieChart(currentMonthData.income, COLORS.income, 'Ingresos del Mes')}
        {renderPieChart(currentMonthData.savings, COLORS.savings, 'Ahorros del Mes')}
      </div>

      {/* Monthly Trend */}
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
                  </LineChart>
                </ResponsiveContainer>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
