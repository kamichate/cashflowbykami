import { useMemo } from 'react';
import { format, parseISO, eachMonthOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMovements, useCategories, MovementType } from '@/hooks/useMovements';

const COLORS = {
  income: ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'],
  expense: ['#a83261', '#8b2550', '#6e1d3f', '#52162f', '#f472b6', '#f9a8d4', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843', '#7c3aed', '#6366f1'],
  savings: ['#3b82f6', '#2563eb', '#1d4ed8'],
};

export function Charts() {
  const { data: movements = [] } = useMovements();
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

      return {
        month: format(month, 'MMM yy', { locale: es }),
        Ingresos: monthMovements.filter((m) => m.type === 'income').reduce((sum, m) => sum + Number(m.amount), 0),
        Gastos: monthMovements.filter((m) => m.type === 'expense').reduce((sum, m) => sum + Number(m.amount), 0),
        Ahorros: monthMovements.filter((m) => m.type === 'savings').reduce((sum, m) => sum + Number(m.amount), 0),
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
                    <Bar dataKey="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Gastos" fill="#a83261" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Ahorros" fill="#3b82f6" radius={[4, 4, 0, 0]} />
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
                    <Line type="monotone" dataKey="Ingresos" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Gastos" stroke="#a83261" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Ahorros" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
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
