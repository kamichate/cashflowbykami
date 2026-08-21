import { useState, useMemo } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Trash2, Pencil, TrendingUp, Wallet, PiggyBank, Filter, X, CalendarIcon, ArrowUpFromLine, ArrowDownToLine, Archive, DollarSign, ArrowLeftRight, Sparkles, Search, Tag, StickyNote } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const typeConfig: Record<MovementType, { icon: any; color: string; bgColor: string; sign: string; label: string }> = {
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
  transfer: {
    icon: ArrowLeftRight,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    sign: '+',
    label: 'Transferencia',
  },
  yield: {
    icon: Sparkles,
    color: 'text-savings',
    bgColor: 'bg-savings-light',
    sign: '↑',
    label: 'Rendimiento',
  },
};

export function MovementsList() {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<MovementFilters>({});
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null);

  const { data: categories = [] } = useCategories();
  const dateRangeInvalid = !!(dateRange.start && dateRange.end && dateRange.start > dateRange.end);
  const { data: movements = [], isLoading } = useMovements({
    ...filters,
    startDate: dateRangeInvalid ? undefined : dateRange.start,
    endDate: dateRangeInvalid ? undefined : dateRange.end,
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
    setSearchTerm('');
  };

  const normalizeText = (text?: string) => {
    return (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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

  const formatDateHeader = (dateStr: string) => {
    const date = parseDateString(dateStr);
    if (isToday(date)) return 'Hoy';
    if (isYesterday(date)) return 'Ayer';
    return format(date, 'dd \'de\' MMMM yyyy', { locale: es });
  };

  const filteredMovements = useMemo(() => {
    if (!searchTerm.trim()) return movements;
    const term = normalizeText(searchTerm);
    return movements.filter((mov) => {
      const detail = normalizeText(mov.detail);
      const categoryName = normalizeText(mov.category?.name);
      return detail.includes(term) || categoryName.includes(term);
    });
  }, [movements, searchTerm]);

  const groupedMovements = useMemo(() => {
    const sorted = [...filteredMovements].sort((a, b) => b.date.localeCompare(a.date));
    const groups: Record<string, Movement[]> = {};
    sorted.forEach((mov) => {
      if (!groups[mov.date]) groups[mov.date] = [];
      groups[mov.date].push(mov);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredMovements]);

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

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por descripción o categoría..."
              className="w-full h-10 pl-9 pr-9 rounded-lg border border-border/50 bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
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
                      <SelectItem value="transfer">Transferencias</SelectItem>
                      <SelectItem value="yield">Rendimientos</SelectItem>
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
                        className="p-3 pointer-events-auto"
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
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              {dateRangeInvalid && (
                <p className="text-xs text-destructive mt-2">
                  La fecha de inicio no puede ser posterior a la fecha de fin
                </p>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px] px-6 pb-6">
            {movements.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {activeFiltersCount > 0 ? 'No hay movimientos con estos filtros' : 'No hay movimientos aún'}
              </p>
            ) : filteredMovements.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                Sin resultados para '{searchTerm}'
              </p>
            ) : (
              <div className="space-y-5">
                {groupedMovements.map(([date, dayMovements]) => (
                  <div key={date} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {formatDateHeader(date)}
                      </span>
                      <div className="flex-1 h-px bg-border/60" />
                    </div>
                    <div className="space-y-3">
                      {dayMovements.map((mov) => {
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
                            className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors animate-slide-up"
                          >
                            <div className={cn('p-1.5 sm:p-2 rounded-lg shrink-0', isWithdrawal ? 'bg-warning-light' : config.bgColor)}>
                              <Icon className={cn('w-4 h-4', isWithdrawal ? 'text-warning' : config.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    {mov.category?.icon ? (
                                      <span className="text-sm leading-none shrink-0" aria-hidden="true">{mov.category.icon}</span>
                                    ) : (
                                      <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    )}
                                    <p className="text-sm sm:text-base font-medium truncate">
                                      {mov.type === 'transfer'
                                        ? 'Transferencia'
                                        : mov.type === 'yield'
                                          ? (mov.category?.name || 'Rendimiento')
                                          : (mov.category?.name || 'Sin categoría')}
                                    </p>
                                  </div>

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
                                <p className={cn('text-xs sm:text-sm font-semibold whitespace-nowrap', isWithdrawal ? 'text-warning' : config.color)}>
                                  {formatAmount(mov)}
                                </p>
                              </div>
                              <div className="flex items-center justify-between gap-2 text-xs sm:text-sm text-muted-foreground">
                                <span className="truncate flex items-center gap-1">
                                  {mov.notes && (
                                    <button
                                      type="button"
                                      title={mov.notes}
                                      aria-label="Ver nota"
                                      onClick={() => toggleNote(mov.id)}
                                      className="shrink-0 text-primary hover:opacity-80 transition-opacity"
                                    >
                                      <StickyNote className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <span className="truncate">{mov.detail || '—'}</span>
                                </span>
                                <span className="whitespace-nowrap">
                                  {format(parseDateString(mov.date), 'dd MMM', { locale: es })}
                                </span>
                              </div>
                              {mov.notes && expandedNotes.has(mov.id) && (
                                <p className="mt-1 text-xs text-muted-foreground bg-muted/50 rounded-md p-2 whitespace-pre-wrap break-words">
                                  {mov.notes}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-0.5 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => setEditingMovement(mov)}
                              >
                                <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive"
                                    disabled={deleteMovement.isPending}
                                  >
                                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar este movimiento?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción no se puede deshacer.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteMovement.mutate(mov.id)}>
                                      Eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
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
