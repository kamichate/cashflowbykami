import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Trash2, Pencil, TrendingUp, Wallet, PiggyBank, Filter, X, CalendarIcon, ArrowUpFromLine, ArrowDownToLine, Archive, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { useMovements, useDeleteMovement, useCategories, MovementType, MovementFilters, Movement } from '@/hooks/useMovements';
import { EditMovementDialog } from './EditMovementDialog';
import { parseDateString } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

const typeConfig = {
  income: {
    icon: TrendingUp,
    color: 'text-income',
    bgColor: 'bg-income-light',
    sign: '+',
    label: 'Ingreso',
  },
  expense: {
    icon: Wallet,
    color: 'text-expense',
    bgColor: 'bg-expense-light',
    sign: '-',
    label: 'Gasto',
  },
  savings: {
    icon: PiggyBank,
    color: 'text-savings',
    bgColor: 'bg-savings-light',
    sign: '→',
    label: 'Ahorro',
  },
};

export function MovementsList() {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<MovementFilters>({});
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({});
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null);

  const { data: categories = [] } = useCategories();
  const { data: movements = [], isLoading } = useMovements({
    ...filters,
    startDate: dateRange.start,
    endDate: dateRange.end,
  });
  const deleteMovement = useDeleteMovement();

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.type && filters.type !== 'all') count++;
    if (filters.categoryId && filters.categoryId !== 'all') count++;
    if (filters.isWithdrawal !== undefined && filters.isWithdrawal !== 'all') count++;
    if (dateRange.start) count++;
    if (dateRange.end) count++;
    return count;
  }, [filters, dateRange]);

  const clearFilters = () => {
    setFilters({});
    setDateRange({});
  };

  const formatAmount = (movement: Movement) => {
    const { amount, type, is_withdrawal, currency, original_amount } = movement;
    const displayAmount = original_amount || amount;
    const currencyCode = currency || 'ARS';
    
    const formatted = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(displayAmount);
    
    if (type === 'savings') {
      return is_withdrawal ? `↑${formatted}` : `↓${formatted}`;
    }
    return `${typeConfig[type].sign}${formatted}`;
  };

  const filteredCategories = useMemo(() => {
    if (filters.type && filters.type !== 'all') {
      return categories.filter(c => c.type === filters.type);
    }
    return categories;
  }, [categories, filters.type]);

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 text-center text-muted-foreground">
          Cargando movimientos...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="glass-card animate-fade-in">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Movimientos</CardTitle>
            <Button
              variant={showFilters ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              Filtrar
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border/50 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Filtros</span>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1">
                    <X className="w-3 h-3" />
                    Limpiar
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Type Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Tipo</label>
                  <Select
                    value={filters.type || 'all'}
                    onValueChange={(v) => {
                      setFilters(prev => ({ 
                        ...prev, 
                        type: v as MovementType | 'all',
                        categoryId: 'all' // Reset category when type changes
                      }));
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="income">Ingresos</SelectItem>
                      <SelectItem value="expense">Gastos</SelectItem>
                      <SelectItem value="savings">Ahorros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Category Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Categoría</label>
                  <Select
                    value={filters.categoryId || 'all'}
                    onValueChange={(v) => setFilters(prev => ({ ...prev, categoryId: v }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {filteredCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Savings Deposit/Withdrawal Filter */}
                {filters.type === 'savings' && (
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs text-muted-foreground">Movimiento de ahorro</label>
                    <Select
                      value={filters.isWithdrawal === undefined ? 'all' : filters.isWithdrawal ? 'withdrawal' : 'deposit'}
                      onValueChange={(v) => setFilters(prev => ({ 
                        ...prev, 
                        isWithdrawal: v === 'all' ? 'all' : v === 'withdrawal'
                      }))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="deposit">Depósitos</SelectItem>
                        <SelectItem value="withdrawal">Retiros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Date Range */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Desde</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-9 justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {dateRange.start ? format(dateRange.start, 'dd/MM/yy') : 'Inicio'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.start}
                        onSelect={(d) => setDateRange(prev => ({ ...prev, start: d }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Hasta</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-9 justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {dateRange.end ? format(dateRange.end, 'dd/MM/yy') : 'Fin'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.end}
                        onSelect={(d) => setDateRange(prev => ({ ...prev, end: d }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px] px-6 pb-6">
            {movements.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {activeFiltersCount > 0 ? 'No hay movimientos con estos filtros' : 'No hay movimientos aún'}
              </p>
            ) : (
              <div className="space-y-3">
                {movements.map((mov) => {
                  const config = typeConfig[mov.type as MovementType];
                  const isWithdrawal = mov.is_withdrawal;
                  const isInitialSavings = mov.is_initial_savings;
                  const isUsd = mov.currency === 'USD';
                  
                  const Icon = mov.type === 'savings' 
                    ? (isInitialSavings ? Archive : (isWithdrawal ? ArrowUpFromLine : ArrowDownToLine))
                    : config.icon;
                  
                  return (
                    <div
                      key={mov.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors animate-slide-up"
                    >
                      <div className={cn('p-2 rounded-lg', isWithdrawal ? 'bg-warning-light' : config.bgColor)}>
                        <Icon className={cn('w-4 h-4', isWithdrawal ? 'text-warning' : config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium truncate">
                              {mov.category?.name || 'Sin categoría'}
                            </p>
                            {isInitialSavings && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1 text-muted-foreground border-muted-foreground/30">
                                Inicial
                              </Badge>
                            )}
                            {isWithdrawal && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1 text-warning border-warning/30">
                                Retiro
                              </Badge>
                            )}
                            {isUsd && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1 text-savings border-savings/30">
                                <DollarSign className="w-2 h-2 mr-0.5" />
                                USD
                              </Badge>
                            )}
                          </div>
                          <p className={cn('font-semibold whitespace-nowrap', isWithdrawal ? 'text-warning' : config.color)}>
                            {formatAmount(mov)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                          <span className="truncate">{mov.detail || '—'}</span>
                          <span className="whitespace-nowrap">
                            {format(parseDateString(mov.date), 'dd MMM', { locale: es })}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditingMovement(mov)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteMovement.mutate(mov.id)}
                          disabled={deleteMovement.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Edit Movement Dialog */}
      <EditMovementDialog
        movement={editingMovement}
        open={!!editingMovement}
        onOpenChange={(open) => {
          if (!open) setEditingMovement(null);
        }}
      />
    </>
  );
}
