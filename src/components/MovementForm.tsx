import { useState, useMemo, useEffect } from 'react';
import { format, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Plus, TrendingUp, Wallet, PiggyBank, ArrowDownToLine, ArrowUpFromLine, Archive, ArrowLeftRight, Sparkles, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Switch } from '@/components/ui/switch';
import { useCategories, useAddMovement, MovementType, Category } from '@/hooks/useMovements';
import { useAddPendingPayment } from '@/hooks/usePendingPayments';
import { useAddPendingIncome } from '@/hooks/usePendingIncome';
import { ExchangeRateDialog } from './ExchangeRateDialog';
import { formatDateToString } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

const typeConfig: Record<MovementType, { label: string; icon: any; color: string; bgColor: string }> = {
  income: { label: 'Ingreso', icon: TrendingUp, color: 'text-income', bgColor: 'bg-income-light' },
  expense: { label: 'Gasto', icon: Wallet, color: 'text-expense', bgColor: 'bg-expense-light' },
  savings: { label: 'Ahorro', icon: PiggyBank, color: 'text-savings', bgColor: 'bg-savings-light' },
  transfer: { label: 'Transferencia', icon: ArrowLeftRight, color: 'text-primary', bgColor: 'bg-primary/10' },
  yield: { label: 'Rendimiento', icon: Sparkles, color: 'text-savings', bgColor: 'bg-savings-light' },
};

const USD_CATEGORY_NAMES = ['dólares', 'dolares'];

function isUsdCategory(category: Category | undefined): boolean {
  if (!category) return false;
  return USD_CATEGORY_NAMES.includes(category.name.toLowerCase());
}

interface MovementFormProps {
  onSuccess?: () => void;
  dialogMode?: boolean;
}

export function MovementForm({ onSuccess, dialogMode }: MovementFormProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [type, setType] = useState<MovementType>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [detail, setDetail] = useState('');
  const [amount, setAmount] = useState('');
  const [isWithdrawal, setIsWithdrawal] = useState(false);
  const [isInitialSavings, setIsInitialSavings] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showExchangeDialog, setShowExchangeDialog] = useState(false);
  const [hasInstallments, setHasInstallments] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(2);
  const [installmentAmounts, setInstallmentAmounts] = useState<number[]>([]);
  const [pendingSubmit, setPendingSubmit] = useState<{
    usdAmount: number;
    isWithdrawal: boolean;
  } | null>(null);

  const { data: categories = [] } = useCategories();
  const addMovement = useAddMovement();
  const addPendingPayment = useAddPendingPayment();
  const addPendingIncome = useAddPendingIncome();

  // Transfer and yield use income categories (they add money)
  const categoryType = type === 'transfer' ? 'income' : type === 'yield' ? 'savings' : type;
  const filteredCategories = categories.filter((c) => c.type === categoryType);
  
  const selectedCategory = useMemo(() => {
    return categories.find(c => c.id === categoryId);
  }, [categories, categoryId]);

  const isUsd = isUsdCategory(selectedCategory);

  // For transfer/yield, no category is needed
  const needsCategory = type !== 'transfer';

  // Installments are only available for plain expenses and income
  const canUseInstallments = type === 'expense' || type === 'income';
  const installmentsActive = canUseInstallments && hasInstallments;

  const totalAmount = parseFloat(amount) || 0;

  // Reset the installment preview whenever the total or the count changes
  useEffect(() => {
    if (!installmentsActive || totalAmount <= 0) {
      setInstallmentAmounts([]);
      return;
    }
    const per = Math.round((totalAmount / installmentCount) * 100) / 100;
    const amounts = Array(installmentCount).fill(per);
    // absorb rounding difference in the last installment
    const diff = Math.round((totalAmount - per * installmentCount) * 100) / 100;
    amounts[installmentCount - 1] = Math.round((per + diff) * 100) / 100;
    setInstallmentAmounts(amounts);
  }, [installmentsActive, totalAmount, installmentCount]);

  const handleInstallmentAmountChange = (index: number, value: string) => {
    const newValue = parseFloat(value);
    setInstallmentAmounts((prev) => {
      const next = [...prev];
      next[index] = isNaN(newValue) ? 0 : newValue;
      const others = next.length - 1;
      if (others > 0) {
        const remaining = totalAmount - next[index];
        const per = Math.round((remaining / others) * 100) / 100;
        next.forEach((_, i) => {
          if (i !== index) next[i] = per;
        });
      }
      return next;
    });
  };

  const installmentsSum = installmentAmounts.reduce((s, a) => s + a, 0);
  const installmentsInvalid =
    installmentsActive &&
    (installmentAmounts.some((a) => a <= 0) ||
      Math.abs(installmentsSum - totalAmount) > 0.5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (needsCategory && !categoryId) return;
    if (!amount) return;

    const parsedAmount = parseFloat(amount);

    if (type === 'savings' && isUsd && !isInitialSavings && !isWithdrawal) {
      setPendingSubmit({ usdAmount: parsedAmount, isWithdrawal });
      setShowExchangeDialog(true);
      return;
    }

    submitMovement({
      amount: installmentsActive ? installmentAmounts[0] : parsedAmount,
      currency: isUsd ? 'USD' : 'ARS',
    });
  };

  const createRemainingInstallments = () => {
    const groupId = crypto.randomUUID();
    const baseDescription = detail.trim() || typeConfig[type].label;

    for (let i = 1; i < installmentCount; i++) {
      const payload = {
        description: `${baseDescription} (cuota ${i + 1}/${installmentCount})`,
        amount: installmentAmounts[i],
        due_date: formatDateToString(addMonths(date, i)),
        category_id: categoryId || undefined,
        installment_group_id: groupId,
        installment_number: i + 1,
        total_installments: installmentCount,
      };
      if (type === 'expense') {
        addPendingPayment.mutate(payload);
      } else {
        addPendingIncome.mutate(payload);
      }
    }
  };

  const submitMovement = (options: {
    amount: number;
    currency: 'ARS' | 'USD';
    exchangeRate?: number;
    originalAmount?: number;
  }) => {
    const withInstallments = installmentsActive;
    const detailText = withInstallments
      ? `${detail.trim() || typeConfig[type].label} (cuota 1/${installmentCount})`
      : detail.trim() || undefined;

    addMovement.mutate(
      {
        date: formatDateToString(date),
        type,
        category_id: needsCategory ? categoryId : null,
        detail: detailText,
        amount: options.amount,
        is_withdrawal: type === 'savings' ? isWithdrawal : false,
        is_initial_savings: type === 'savings' ? isInitialSavings : false,
        currency: options.currency,
        exchange_rate: options.exchangeRate,
        original_amount: options.originalAmount,
      },
      {
        onSuccess: () => {
          if (withInstallments) createRemainingInstallments();
          setCategoryId('');
          setDetail('');
          setAmount('');
          setIsWithdrawal(false);
          setIsInitialSavings(false);
          setHasInstallments(false);
          setInstallmentCount(2);
          setInstallmentAmounts([]);
          onSuccess?.();
        },
      }
    );
  };

  const handleExchangeConfirm = (exchangeRate: number, arsAmount: number) => {
    if (!pendingSubmit) return;
    submitMovement({
      amount: arsAmount,
      currency: 'USD',
      exchangeRate,
      originalAmount: pendingSubmit.usdAmount,
    });
    setShowExchangeDialog(false);
    setPendingSubmit(null);
  };

  const handleTypeChange = (newType: MovementType) => {
    setType(newType);
    setCategoryId('');
    setIsWithdrawal(false);
    setIsInitialSavings(false);
    if (newType !== 'expense' && newType !== 'income') {
      setHasInstallments(false);
      setInstallmentAmounts([]);
    }
  };

  const TypeIcon = typeConfig[type].icon;

  const getTitle = () => {
    if (type === 'savings') {
      if (isInitialSavings) return 'Ahorro Inicial';
      if (isWithdrawal) return 'Retiro de Ahorro';
      return 'Nuevo Ahorro';
    }
    if (type === 'transfer') return 'Nueva Transferencia';
    if (type === 'yield') return 'Nuevo Rendimiento';
    return 'Nuevo Movimiento';
  };

  const getButtonText = () => {
    if (addMovement.isPending) return 'Guardando...';
    if (type === 'savings') {
      if (isInitialSavings) return 'Agregar Ahorro Inicial';
      if (isWithdrawal) return 'Registrar Retiro';
    }
    if (type === 'transfer') return 'Registrar Transferencia';
    if (type === 'yield') return 'Registrar Rendimiento';
    return 'Agregar Movimiento';
  };

  return (
    <>
      <Card className="glass-card animate-fade-in">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className={cn('p-2 rounded-lg', typeConfig[type].bgColor)}>
              {type === 'savings' ? (
                isInitialSavings ? (
                  <Archive className={cn('w-5 h-5', typeConfig[type].color)} />
                ) : isWithdrawal ? (
                  <ArrowUpFromLine className={cn('w-5 h-5', typeConfig[type].color)} />
                ) : (
                  <ArrowDownToLine className={cn('w-5 h-5', typeConfig[type].color)} />
                )
              ) : (
                <TypeIcon className={cn('w-5 h-5', typeConfig[type].color)} />
              )}
            </div>
            {getTitle()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type Toggle */}
            <div className="space-y-2">
              <Label>Tipo</Label>
              <ToggleGroup 
                type="single" 
                value={type} 
                onValueChange={(v) => {
                  if (v) handleTypeChange(v as MovementType);
                }}
                className="justify-start flex-wrap"
              >
                {Object.entries(typeConfig).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <ToggleGroupItem 
                      key={key} 
                      value={key}
                      className={cn(
                        'flex items-center gap-2 data-[state=on]:shadow-rose transition-all',
                        type === key && config.bgColor
                      )}
                    >
                      <Icon className={cn('w-4 h-4', type === key && config.color)} />
                      <span className={cn(type === key && config.color)}>{config.label}</span>
                    </ToggleGroupItem>
                  );
                })}
              </ToggleGroup>
            </div>

            {/* Savings Options */}
            {type === 'savings' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                  <div className="flex items-center gap-2">
                    <Archive className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <span className="text-sm font-medium">Ahorro inicial</span>
                      <p className="text-xs text-muted-foreground">No se descuenta de tus ingresos</p>
                    </div>
                  </div>
                  <Switch 
                    checked={isInitialSavings} 
                    onCheckedChange={(checked) => {
                      setIsInitialSavings(checked);
                      if (checked) setIsWithdrawal(false);
                    }}
                  />
                </div>
                {!isInitialSavings && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                    <div className="flex items-center gap-2">
                      {isWithdrawal ? (
                        <ArrowUpFromLine className="w-4 h-4 text-warning" />
                      ) : (
                        <ArrowDownToLine className="w-4 h-4 text-savings" />
                      )}
                      <span className="text-sm font-medium">
                        {isWithdrawal ? 'Retiro de ahorros' : 'Depósito a ahorros'}
                      </span>
                    </div>
                    <Switch checked={isWithdrawal} onCheckedChange={setIsWithdrawal} />
                  </div>
                )}
              </div>
            )}

            {/* Transfer/Yield info */}
            {type === 'transfer' && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-muted-foreground">
                Las transferencias aumentan tu balance sin contarse como ingreso.
              </div>
            )}
            {type === 'yield' && (
              <div className="p-3 rounded-lg bg-savings-light/50 border border-savings/20 text-sm text-muted-foreground">
                Los rendimientos se acumulan en ahorros sin afectar el balance.
              </div>
            )}

            {/* Date */}
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, "PPP", { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                      if (d) setDate(d);
                      setIsCalendarOpen(false);
                    }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Category - not required for transfers */}
            {needsCategory && (
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                        {isUsdCategory(cat) && ' 💵'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Amount */}
            <div className="space-y-2">
              <Label>
                Monto {isUsd ? '(USD)' : '($)'}
                {isUsd && type === 'savings' && !isInitialSavings && !isWithdrawal && (
                  <span className="text-xs text-muted-foreground ml-2">
                    Se pedirá cotización al confirmar
                  </span>
                )}
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-lg font-semibold"
              />
              {amount !== '' && parseFloat(amount) <= 0 && (
                <p className="text-xs text-destructive">El monto debe ser mayor a cero</p>
              )}
            </div>

            {/* Installments */}
            {canUseInstallments && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <span className="text-sm font-medium">¿En cuotas?</span>
                      <p className="text-xs text-muted-foreground">
                        La cuota 1 se registra hoy, el resto queda pendiente
                      </p>
                    </div>
                  </div>
                  <Switch checked={hasInstallments} onCheckedChange={setHasInstallments} />
                </div>

                {hasInstallments && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Cantidad de cuotas</Label>
                      <Input
                        type="number"
                        min={2}
                        max={48}
                        value={installmentCount}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (!isNaN(v)) setInstallmentCount(Math.min(48, Math.max(2, v)));
                        }}
                      />
                    </div>

                    {installmentAmounts.length > 0 && (
                      <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                        <p className="text-xs text-muted-foreground">
                          Previsualización — podés editar los montos
                        </p>
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {installmentAmounts.map((amt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-xs w-20 shrink-0 text-muted-foreground">
                                {i + 1}/{installmentCount}
                              </span>
                              <span className="text-xs w-24 shrink-0 text-muted-foreground">
                                {format(addMonths(date, i), 'dd MMM yy', { locale: es })}
                              </span>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={Number.isFinite(amt) ? amt : 0}
                                onChange={(e) => handleInstallmentAmountChange(i, e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                          ))}
                        </div>
                        {installmentsInvalid && (
                          <p className="text-xs text-destructive">
                            Los montos deben ser positivos y sumar el total
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}



            {/* Detail */}
            <div className="space-y-2">
              <Label>Detalle (opcional)</Label>
              <Input
                type="text"
                placeholder="Descripción breve..."
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                maxLength={200}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={(needsCategory && !categoryId) || !amount || parseFloat(amount) <= 0 || addMovement.isPending}
            >
              <Plus className="w-4 h-4 mr-2" />
              {getButtonText()}
            </Button>
          </form>
        </CardContent>
      </Card>

      {pendingSubmit && (
        <ExchangeRateDialog
          open={showExchangeDialog}
          onOpenChange={(open) => {
            setShowExchangeDialog(open);
            if (!open) setPendingSubmit(null);
          }}
          usdAmount={pendingSubmit.usdAmount}
          isWithdrawal={pendingSubmit.isWithdrawal}
          onConfirm={handleExchangeConfirm}
        />
      )}
    </>
  );
}
