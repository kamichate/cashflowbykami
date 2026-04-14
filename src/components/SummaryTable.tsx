import { useMemo } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAllMovements, useCategories, MovementType } from '@/hooks/useMovements';
import { cn } from '@/lib/utils';

interface SummaryTableProps {
  type: MovementType;
  title: string;
}

export function SummaryTable({ type, title }: SummaryTableProps) {
  const { data: movements = [] } = useAllMovements();
  const { data: categories = [] } = useCategories();

  const typeCategories = useMemo(() => {
    return categories.filter((c) => c.type === type);
  }, [categories, type]);

  const monthlyData = useMemo(() => {
    // For savings, we show net amounts (deposits - withdrawals)
    const typeMovements = movements.filter((m) => m.type === type);
    
    if (typeMovements.length === 0) {
      return { months: [], data: {}, totals: {}, monthTotals: {}, withdrawalData: {}, withdrawalTotals: {} };
    }

    // Get date range
    const dates = typeMovements.map((m) => parseISO(m.date));
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
    
    // Generate months
    const months = eachMonthOfInterval({
      start: startOfMonth(minDate),
      end: endOfMonth(maxDate),
    }).reverse();

    // Calculate data per month per category
    const data: Record<string, Record<string, number>> = {};
    const withdrawalData: Record<string, Record<string, number>> = {};
    const totals: Record<string, number> = {};
    const withdrawalTotals: Record<string, number> = {};
    const monthTotals: Record<string, number> = {};

    months.forEach((month) => {
      const monthKey = format(month, 'yyyy-MM');
      data[monthKey] = {};
      withdrawalData[monthKey] = {};
      monthTotals[monthKey] = 0;
      
      typeCategories.forEach((cat) => {
        const catMovements = typeMovements.filter((m) => {
          const movDate = parseISO(m.date);
          return (
            m.category_id === cat.id &&
            movDate.getMonth() === month.getMonth() &&
            movDate.getFullYear() === month.getFullYear()
          );
        });

        // Deposits (or regular amounts for non-savings)
        const deposits = catMovements
          .filter((m) => !m.is_withdrawal)
          .reduce((sum, m) => sum + Number(m.amount), 0);
        
        // Withdrawals (only for savings)
        const withdrawals = catMovements
          .filter((m) => m.is_withdrawal)
          .reduce((sum, m) => sum + Number(m.amount), 0);
        
        data[monthKey][cat.id] = deposits;
        withdrawalData[monthKey][cat.id] = withdrawals;
        monthTotals[monthKey] += (deposits - withdrawals);
        totals[cat.id] = (totals[cat.id] || 0) + deposits;
        withdrawalTotals[cat.id] = (withdrawalTotals[cat.id] || 0) + withdrawals;
      });
    });

    return { months, data, totals, monthTotals, withdrawalData, withdrawalTotals };
  }, [movements, typeCategories, type]);

  const formatCurrency = (value: number) => {
    if (value === 0) return '—';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getPercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  const typeColors: Record<string, string> = {
    income: 'bg-income-light text-income',
    expense: 'bg-expense-light text-expense',
    savings: 'bg-savings-light text-savings',
    transfer: 'bg-primary/10 text-primary',
    yield: 'bg-savings-light text-savings',
  };

  const isSavings = type === 'savings';

  if (typeCategories.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 text-center text-muted-foreground">
          No hay categorías de {title.toLowerCase()}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card animate-fade-in">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <div className="min-w-[600px]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="sticky left-0 bg-card z-10 w-24">Mes</TableHead>
                  {typeCategories.map((cat) => (
                    <TableHead key={cat.id} className="text-center min-w-[100px]">
                      <span className="text-xs">{cat.name}</span>
                    </TableHead>
                  ))}
                  <TableHead className="text-center min-w-[100px]">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyData.months.map((month) => {
                  const monthKey = format(month, 'yyyy-MM');
                  const monthTotal = monthlyData.monthTotals[monthKey] || 0;
                  
                  return (
                    <TableRow key={monthKey} className="hover:bg-muted/30">
                      <TableCell className="sticky left-0 bg-card z-10 font-medium">
                        {format(month, 'MMM yy', { locale: es })}
                      </TableCell>
                      {typeCategories.map((cat) => {
                        const value = monthlyData.data[monthKey]?.[cat.id] || 0;
                        const withdrawal = monthlyData.withdrawalData?.[monthKey]?.[cat.id] || 0;
                        const net = value - withdrawal;
                        const pct = getPercentage(Math.abs(net), Math.abs(monthTotal));
                        
                        return (
                          <TableCell key={cat.id} className="text-center">
                            {value > 0 || withdrawal > 0 ? (
                              <div className="space-y-1">
                                <p className="text-sm font-medium">
                                  {formatCurrency(isSavings ? net : value)}
                                </p>
                                {isSavings && withdrawal > 0 && (
                                  <p className="text-xs text-warning">
                                    (-{formatCurrency(withdrawal)})
                                  </p>
                                )}
                                <Badge variant="secondary" className={cn('text-xs', typeColors[type])}>
                                  {pct}%
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center font-semibold">
                        {formatCurrency(monthTotal)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                
                {/* Totals Row */}
                <TableRow className="bg-muted/50 hover:bg-muted/50 font-semibold">
                  <TableCell className="sticky left-0 bg-muted/50 z-10">Total</TableCell>
                  {typeCategories.map((cat) => {
                    const value = monthlyData.totals[cat.id] || 0;
                    const withdrawal = monthlyData.withdrawalTotals?.[cat.id] || 0;
                    const net = value - withdrawal;
                    const grandTotal = Object.keys(monthlyData.totals).reduce((sum, catId) => {
                      return sum + (monthlyData.totals[catId] || 0) - (monthlyData.withdrawalTotals?.[catId] || 0);
                    }, 0);
                    const pct = getPercentage(Math.abs(net), Math.abs(grandTotal));
                    
                    return (
                      <TableCell key={cat.id} className="text-center">
                        {value > 0 || withdrawal > 0 ? (
                          <div className="space-y-1">
                            <p className="text-sm">{formatCurrency(isSavings ? net : value)}</p>
                            {isSavings && withdrawal > 0 && (
                              <p className="text-xs text-warning">
                                (-{formatCurrency(withdrawal)})
                              </p>
                            )}
                            <Badge className={cn('text-xs', typeColors[type])}>
                              {pct}%
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center">
                    {formatCurrency(Object.keys(monthlyData.totals).reduce((sum, catId) => {
                      return sum + (monthlyData.totals[catId] || 0) - (monthlyData.withdrawalTotals?.[catId] || 0);
                    }, 0))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
