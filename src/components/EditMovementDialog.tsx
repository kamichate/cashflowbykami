import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Pencil, TrendingUp, Wallet, PiggyBank, ArrowLeftRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useCategories, useUpdateMovement, Movement, MovementType } from '@/hooks/useMovements';
import { parseDateString, formatDateToString } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

interface EditMovementDialogProps {
  movement: Movement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeConfig: Record<MovementType, { label: string; icon: any; color: string; bg: string }> = {
  income: { label: 'Ingreso', icon: TrendingUp, color: 'text-[hsl(var(--income))]', bg: 'bg-[hsl(var(--income-light))]' },
  expense: { label: 'Gasto', icon: Wallet, color: 'text-[hsl(var(--expense))]', bg: 'bg-[hsl(var(--expense-light))]' },
  savings: { label: 'Ahorro', icon: PiggyBank, color: 'text-[hsl(var(--savings))]', bg: 'bg-[hsl(var(--savings-light))]' },
  transfer: { label: 'Transferencia', icon: ArrowLeftRight, color: 'text-primary', bg: 'bg-primary/10' },
  yield: { label: 'Rendimiento', icon: Sparkles, color: 'text-[hsl(var(--savings))]', bg: 'bg-[hsl(var(--savings-light))]' },
};

export function EditMovementDialog({ movement, open, onOpenChange }: EditMovementDialogProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [type, setType] = useState<MovementType>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [detail, setDetail] = useState('');
  const [amount, setAmount] = useState('');
  const [isWithdrawal, setIsWithdrawal] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const { data: categories = [] } = useCategories();
  const updateMovement = useUpdateMovement();

  useEffect(() => {
    if (movement) {
      setDate(parseDateString(movement.date));
      setType(movement.type);
      setCategoryId(movement.category_id || '');
      setDetail(movement.detail || '');
      setAmount(String(movement.amount));
      setIsWithdrawal(movement.is_withdrawal);
    }
  }, [movement]);

  const categoryType = type === 'transfer' ? 'income' : type === 'yield' ? 'savings' : type;
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => c.type === categoryType);
  }, [categories, categoryType]);

  const needsCategory = type !== 'transfer';

  if (!movement) return null;

  const config = typeConfig[type];
  const Icon = config.icon;

  const handleTypeChange = (newType: MovementType) => {
    setType(newType);
    setCategoryId('');
    setIsWithdrawal(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (needsCategory && !categoryId) return;
    if (!amount) return;

    updateMovement.mutate(
      {
        id: movement.id,
        date: formatDateToString(date),
        type,
        category_id: needsCategory ? categoryId : null,
        detail: detail.trim() || null,
        amount: parseFloat(amount),
        is_withdrawal: type === 'savings' ? isWithdrawal : false,
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={cn('w-5 h-5', config.color)} />
            Editar Movimiento
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <ToggleGroup
              type="single"
              value={type}
              onValueChange={(v) => { if (v) handleTypeChange(v as MovementType); }}
              className="justify-start flex-wrap"
            >
              {Object.entries(typeConfig).map(([key, cfg]) => {
                const TypeIcon = cfg.icon;
                return (
                  <ToggleGroupItem
                    key={key}
                    value={key}
                    className={cn(
                      'flex items-center gap-2 data-[state=on]:shadow-rose transition-all',
                      type === key && cfg.bg
                    )}
                  >
                    <TypeIcon className={cn('w-4 h-4', type === key && cfg.color)} />
                    <span className={cn(type === key && cfg.color)}>{cfg.label}</span>
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>
          </div>

          {type === 'savings' && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
              <span className="text-sm font-medium">
                {isWithdrawal ? 'Retiro de ahorros' : 'Depósito a ahorros'}
              </span>
              <Switch checked={isWithdrawal} onCheckedChange={setIsWithdrawal} />
            </div>
          )}

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
                  onSelect={(d) => { if (d) setDate(d); setIsCalendarOpen(false); }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {needsCategory && (
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Monto ($)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-lg font-semibold"
            />
          </div>

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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={(needsCategory && !categoryId) || !amount || updateMovement.isPending}>
              <Pencil className="w-4 h-4 mr-2" />
              {updateMovement.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
