import { useState } from 'react';
import { format, parseISO, isBefore, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Plus, Check, Trash2, Clock, AlertTriangle, CalendarCheck, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
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
import { useCategories } from '@/hooks/useMovements';
import { usePendingIncome, useAddPendingIncome, useMarkIncomeCollected, useDeletePendingIncome, useUpdatePendingIncome, useUpdateInstallmentGroup, PendingIncome } from '@/hooks/usePendingIncome';
import { formatDateToString } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

function getIncomeStatus(income: PendingIncome): 'collected' | 'overdue' | 'upcoming' | 'future' {
  if (income.is_collected) return 'collected';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = parseISO(income.due_date);
  if (isBefore(dueDate, today)) return 'overdue';
  if (isBefore(dueDate, addDays(today, 7))) return 'upcoming';
  return 'future';
}

const statusConfig = {
  collected: { label: 'Cobrado', className: 'movement-income', icon: Check },
  overdue: { label: 'Vencido', className: 'movement-expense', icon: AlertTriangle },
  upcoming: { label: 'Próximo', className: 'movement-warning', icon: Clock },
  future: { label: 'Futuro', className: 'movement-savings', icon: CalendarCheck },
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

export function PendingIncomeComponent() {
  const { data: incomes = [] } = usePendingIncome();
  const { data: categories = [] } = useCategories();
  const addIncome = useAddPendingIncome();
  const markCollected = useMarkIncomeCollected();
  const deleteIncome = useDeletePendingIncome();
  const updateIncome = useUpdatePendingIncome();
  const updateInstallmentGroup = useUpdateInstallmentGroup();

  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState<Date>();
  const [categoryId, setCategoryId] = useState('none');
  const [showCollected, setShowCollected] = useState(false);

  const [editingIncome, setEditingIncome] = useState<PendingIncome | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDueDate, setEditDueDate] = useState<Date | undefined>(undefined);
  const [editCategoryId, setEditCategoryId] = useState('none');

  const openEdit = (i: PendingIncome) => {
    setEditingIncome(i);
    setEditDescription(i.description);
    setEditAmount(String(i.amount));
    setEditDueDate(parseISO(i.due_date));
    setEditCategoryId(i.category_id || 'none');
  };

  const handleEditSave = () => {
    if (!editingIncome || !editDescription || !editAmount || !editDueDate) return;
    updateIncome.mutate({
      id: editingIncome.id,
      description: editDescription,
      amount: parseFloat(editAmount),
      due_date: formatDateToString(editDueDate),
      category_id: editCategoryId !== 'none' ? editCategoryId : null,
    }, {
      onSuccess: () => setEditingIncome(null),
    });
  };

  const incomeCategories = categories.filter(c => c.type === 'income');

  const handleAdd = () => {
    if (!description || !amount || !dueDate) return;
    addIncome.mutate({
      description,
      amount: parseFloat(amount),
      due_date: formatDateToString(dueDate),
      category_id: categoryId !== 'none' ? categoryId : undefined,
    }, {
      onSuccess: () => {
        setOpen(false);
        setDescription('');
        setAmount('');
        setDueDate(undefined);
        setCategoryId('none');
      }
    });
  };

  const handleMarkCollected = (income: PendingIncome) => {
    markCollected.mutate(income, {
      onSuccess: () => {
        if (income.installment_group_id) {
          updateInstallmentGroup.mutate({
            group_id: income.installment_group_id,
            installment_id: income.id,
            new_amount: Number(income.amount),
          });
        }
      },
    });
  };

  const uncollectedIncomes = incomes.filter(i => !i.is_collected);
  const collectedIncomes = incomes.filter(i => i.is_collected);
  const displayIncomes = showCollected ? collectedIncomes : uncollectedIncomes;

  const overdueCount = uncollectedIncomes.filter(i => getIncomeStatus(i) === 'overdue').length;
  const upcomingCount = uncollectedIncomes.filter(i => getIncomeStatus(i) === 'upcoming').length;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="glass-card">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Pendientes</p>
            <p className="text-lg font-bold">{uncollectedIncomes.length}</p>
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
            <CardTitle className="text-lg">A Cobrar</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowCollected(!showCollected)}>
                {showCollected ? 'Ver pendientes' : 'Ver cobrados'}
              </Button>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nuevo Ingreso Pendiente</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Descripción</Label>
                      <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej: Sueldo, Factura A" />
                    </div>
                    <div>
                      <Label>Monto</Label>
                      <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
                      {amount !== '' && parseFloat(amount) <= 0 && (
                        <p className="text-xs text-destructive mt-1">El monto debe ser mayor a cero</p>
                      )}
                    </div>
                    <div>
                      <Label>Fecha esperada</Label>
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
                          {incomeCategories.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAdd} className="w-full" disabled={addIncome.isPending || !amount || parseFloat(amount) <= 0 || !description || !dueDate}>
                      Agregar Ingreso
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {displayIncomes.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">
              {showCollected ? 'No hay ingresos cobrados' : 'No hay ingresos pendientes 🎉'}
            </p>
          ) : (
            displayIncomes.map(income => {
              const status = getIncomeStatus(income);
              const cfg = statusConfig[status];
              const StatusIcon = cfg.icon;
              return (
                <div key={income.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn('p-2 rounded-lg', cfg.className)}>
                      <StatusIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-sm font-medium truncate">{income.description}</p>
                        {income.installment_number && income.total_installments && (
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            cuota {income.installment_number}/{income.total_installments}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(income.due_date), 'dd MMM yyyy', { locale: es })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{formatCurrency(Number(income.amount))}</p>
                    <Badge variant="outline" className={cn('text-[10px]', cfg.className)}>{cfg.label}</Badge>
                    {!income.is_collected && (
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleMarkCollected(income)}>
                        <Check className="w-4 h-4 text-[hsl(var(--income))]" />
                      </Button>
                    )}
                    {!income.is_collected && (
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(income)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <Trash2 className="w-4 h-4 text-[hsl(var(--expense))]" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar este elemento?</AlertDialogTitle>
                          <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteIncome.mutate(income.id)}>Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Edit income dialog */}
      <Dialog open={!!editingIncome} onOpenChange={(o) => !o && setEditingIncome(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Ingreso Pendiente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Descripción</Label>
              <Input value={editDescription} onChange={e => setEditDescription(e.target.value)} />
            </div>
            <div>
              <Label>Monto</Label>
              <Input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} />
              {editAmount !== '' && parseFloat(editAmount) <= 0 && (
                <p className="text-xs text-destructive mt-1">El monto debe ser mayor a cero</p>
              )}
            </div>
            <div>
              <Label>Fecha esperada</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !editDueDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editDueDate ? format(editDueDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={editDueDate} onSelect={setEditDueDate} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Categoría (opcional)</Label>
              <Select value={editCategoryId} onValueChange={setEditCategoryId}>
                <SelectTrigger><SelectValue placeholder="Sin categoría" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría</SelectItem>
                  {incomeCategories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleEditSave} className="w-full" disabled={updateIncome.isPending || !editAmount || parseFloat(editAmount) <= 0 || !editDescription || !editDueDate}>
              Guardar cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
