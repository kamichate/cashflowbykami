import { useState } from 'react';
import { format, parseISO, isAfter, isBefore, addDays, addMonths, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Plus, Check, Trash2, Clock, AlertTriangle, CalendarCheck } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useCategories } from '@/hooks/useMovements';
import { usePendingPayments, useAddPendingPayment, useMarkPaymentPaid, useDeletePendingPayment, PendingPayment } from '@/hooks/usePendingPayments';
import { useAddMovement } from '@/hooks/useMovements';
import { formatDateToString } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

function getPaymentStatus(payment: PendingPayment): 'paid' | 'overdue' | 'upcoming' | 'future' {
  if (payment.is_paid) return 'paid';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = parseISO(payment.due_date);
  if (isBefore(dueDate, today)) return 'overdue';
  if (isBefore(dueDate, addDays(today, 7))) return 'upcoming';
  return 'future';
}

const statusConfig = {
  paid: { label: 'Pagado', className: 'movement-income', icon: Check },
  overdue: { label: 'Vencido', className: 'movement-expense', icon: AlertTriangle },
  upcoming: { label: 'Próximo', className: 'movement-warning', icon: Clock },
  future: { label: 'Futuro', className: 'movement-savings', icon: CalendarCheck },
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

export function PendingPayments() {
  const { data: payments = [] } = usePendingPayments();
  const { data: categories = [] } = useCategories();
  const addPayment = useAddPendingPayment();
  const markPaid = useMarkPaymentPaid();
  const addMovement = useAddMovement();
  const deletePayment = useDeletePendingPayment();

  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState<Date>();
  const [categoryId, setCategoryId] = useState('none');
  const [isRecurring, setIsRecurring] = useState(false);
  const [showPaid, setShowPaid] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduledPayment, setScheduledPayment] = useState<PendingPayment | null>(null);
  const [nextDueDate, setNextDueDate] = useState<Date | undefined>(undefined);

  const expenseCategories = categories.filter(c => c.type === 'expense');

  const handleAdd = () => {
    if (!description || !amount || !dueDate) return;
    addPayment.mutate({
      description,
      amount: parseFloat(amount),
      due_date: formatDateToString(dueDate),
      category_id: categoryId !== 'none' ? categoryId : undefined,
      is_recurring: isRecurring,
    }, {
      onSuccess: () => {
        setOpen(false);
        setDescription('');
        setAmount('');
        setDueDate(undefined);
        setCategoryId('none');
        setIsRecurring(false);
      }
    });
  };

  const handleMarkPaid = (payment: PendingPayment) => {
    markPaid.mutate(payment.id, {
      onSuccess: () => {
        addMovement.mutate({
          date: formatDateToString(new Date()),
          type: 'expense',
          category_id: payment.category_id || undefined,
          detail: `Pago: ${payment.description}`,
          amount: Number(payment.amount),
        });
        setScheduledPayment(payment);
        setNextDueDate(addMonths(parseISO(payment.due_date), 1));
        setScheduleDialogOpen(true);
      },
    });
  };

  const handleScheduleNext = () => {
    if (!scheduledPayment || !nextDueDate) return;
    addPayment.mutate({
      description: scheduledPayment.description,
      amount: Number(scheduledPayment.amount),
      due_date: formatDateToString(nextDueDate),
      category_id: scheduledPayment.category_id || undefined,
      is_recurring: false,
    }, {
      onSuccess: () => {
        setScheduleDialogOpen(false);
        setScheduledPayment(null);
        setNextDueDate(undefined);
      },
    });
  };

  const unpaidPayments = payments.filter(p => !p.is_paid);
  const paidPayments = payments.filter(p => p.is_paid);
  const displayPayments = showPaid ? paidPayments : unpaidPayments;

  const overdueCount = unpaidPayments.filter(p => getPaymentStatus(p) === 'overdue').length;
  const upcomingCount = unpaidPayments.filter(p => getPaymentStatus(p) === 'upcoming').length;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="glass-card">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Pendientes</p>
            <p className="text-lg font-bold">{unpaidPayments.length}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Vencidos</p>
            <p className="text-lg font-bold text-[hsl(var(--expense))]">{overdueCount}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Próximos</p>
            <p className="text-lg font-bold text-[hsl(var(--warning))]">{upcomingCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">A Pagar</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowPaid(!showPaid)}>
                {showPaid ? 'Ver pendientes' : 'Ver pagados'}
              </Button>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nuevo Pago Pendiente</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Descripción</Label>
                      <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej: Alquiler" />
                    </div>
                    <div>
                      <Label>Monto</Label>
                      <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
                      {amount !== '' && parseFloat(amount) <= 0 && (
                        <p className="text-xs text-destructive mt-1">El monto debe ser mayor a cero</p>
                      )}
                    </div>
                    <div>
                      <Label>Fecha de vencimiento</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dueDate ? format(dueDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={dueDate} onSelect={setDueDate} className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label>Categoría (opcional)</Label>
                      <Select value={categoryId} onValueChange={setCategoryId}>
                        <SelectTrigger><SelectValue placeholder="Sin categoría" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin categoría</SelectItem>
                          {expenseCategories.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
                      <Label>Recurrente</Label>
                    </div>
                    <Button onClick={handleAdd} className="w-full" disabled={addPayment.isPending || !amount || parseFloat(amount) <= 0 || !description || !dueDate}>
                      Agregar Pago
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {displayPayments.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">
              {showPaid ? 'No hay pagos realizados' : 'No hay pagos pendientes 🎉'}
            </p>
          ) : (
            displayPayments.map(payment => {
              const status = getPaymentStatus(payment);
              const cfg = statusConfig[status];
              const StatusIcon = cfg.icon;
              return (
                <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn('p-2 rounded-lg', cfg.className)}>
                      <StatusIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{payment.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(payment.due_date), 'dd MMM yyyy', { locale: es })}
                        {payment.is_recurring && ' · Recurrente'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{formatCurrency(Number(payment.amount))}</p>
                    <Badge variant="outline" className={cn('text-[10px]', cfg.className)}>{cfg.label}</Badge>
                    {!payment.is_paid && (
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleMarkPaid(payment)}>
                        <Check className="w-4 h-4 text-[hsl(var(--income))]" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => deletePayment.mutate(payment.id)}>
                      <Trash2 className="w-4 h-4 text-[hsl(var(--expense))]" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Schedule next payment dialog */}
      <AlertDialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Querés programar el próximo vencimiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Seleccioná la fecha para la próxima cuota de <strong>{scheduledPayment?.description}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !nextDueDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {nextDueDate ? format(nextDueDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={nextDueDate} onSelect={setNextDueDate} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setScheduledPayment(null); setNextDueDate(undefined); }}>No, gracias</AlertDialogCancel>
            <Button onClick={handleScheduleNext} disabled={!nextDueDate || addPayment.isPending}>Programar</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
