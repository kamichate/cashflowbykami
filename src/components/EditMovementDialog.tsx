import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Pencil, TrendingUp, Wallet, PiggyBank } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useCategories, useUpdateMovement, Movement, MovementType } from '@/hooks/useMovements';
import { parseDateString, formatDateToString } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

interface EditMovementDialogProps {
  movement: Movement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeConfig = {
  income: { label: 'Ingreso', icon: TrendingUp, color: 'text-income' },
  expense: { label: 'Gasto', icon: Wallet, color: 'text-expense' },
  savings: { label: 'Ahorro', icon: PiggyBank, color: 'text-savings' },
};

export function EditMovementDialog({ movement, open, onOpenChange }: EditMovementDialogProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [categoryId, setCategoryId] = useState('');
  const [detail, setDetail] = useState('');
  const [amount, setAmount] = useState('');
  const [isWithdrawal, setIsWithdrawal] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const { data: categories = [] } = useCategories();
  const updateMovement = useUpdateMovement();

  // Populate form when movement changes
  useEffect(() => {
    if (movement) {
      setDate(parseDateString(movement.date));
      setCategoryId(movement.category_id || '');
      setDetail(movement.detail || '');
      setAmount(String(movement.amount));
      setIsWithdrawal(movement.is_withdrawal);
    }
  }, [movement]);

  if (!movement) return null;

  const filteredCategories = categories.filter((c) => c.type === movement.type);
  const config = typeConfig[movement.type];
  const Icon = config.icon;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!categoryId || !amount) return;

    updateMovement.mutate(
      {
        id: movement.id,
        date: formatDateToString(date),
        category_id: categoryId,
        detail: detail.trim() || null,
        amount: parseFloat(amount),
        is_withdrawal: movement.type === 'savings' ? isWithdrawal : false,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={cn('w-5 h-5', config.color)} />
            Editar {config.label}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Savings Withdrawal Toggle */}
          {movement.type === 'savings' && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
              <span className="text-sm font-medium">
                {isWithdrawal ? 'Retiro de ahorros' : 'Depósito a ahorros'}
              </span>
              <Switch 
                checked={isWithdrawal} 
                onCheckedChange={setIsWithdrawal}
              />
            </div>
          )}

          {/* Date */}
          <div className="space-y-2">
            <Label>Fecha</Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
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
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Category */}
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
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
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

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!categoryId || !amount || updateMovement.isPending}
            >
              <Pencil className="w-4 h-4 mr-2" />
              {updateMovement.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
