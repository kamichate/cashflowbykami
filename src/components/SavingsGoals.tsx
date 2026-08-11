import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { PiggyBank, Plus, Pencil, Trash2, CalendarIcon, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
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
import {
  useSavingsGoals,
  useAddSavingsGoal,
  useUpdateSavingsGoal,
  useDeleteSavingsGoal,
  useAddToSavingsGoal,
  SavingsGoal,
} from '@/hooks/useSavingsGoals';
import { formatDateToString } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);

const PRESET_COLORS = [
  'hsl(350, 70%, 70%)',
  'hsl(45, 90%, 65%)',
  'hsl(200, 80%, 70%)',
  'hsl(280, 60%, 70%)',
  'hsl(150, 50%, 60%)',
  'hsl(30, 80%, 65%)',
];

export function SavingsGoals() {
  const { data: goals = [] } = useSavingsGoals();
  const addGoal = useAddSavingsGoal();
  const updateGoal = useUpdateSavingsGoal();
  const deleteGoal = useDeleteSavingsGoal();
  const addContribution = useAddToSavingsGoal();

  // New / edit goal form
  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState<Date | undefined>(undefined);
  const [icon, setIcon] = useState('🎯');
  const [color, setColor] = useState(PRESET_COLORS[0]);

  // Contribution dialog
  const [contribGoal, setContribGoal] = useState<SavingsGoal | null>(null);
  const [contribAmount, setContribAmount] = useState('');
  const [createMovement, setCreateMovement] = useState(true);

  const resetForm = () => {
    setEditingGoal(null);
    setName('');
    setTargetAmount('');
    setCurrentAmount('');
    setDeadline(undefined);
    setIcon('🎯');
    setColor(PRESET_COLORS[0]);
  };

  const openNew = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (g: SavingsGoal) => {
    setEditingGoal(g);
    setName(g.name);
    setTargetAmount(String(g.target_amount));
    setCurrentAmount(String(g.current_amount));
    setDeadline(g.deadline ? parseISO(g.deadline) : undefined);
    setIcon(g.icon || '🎯');
    setColor(g.color || PRESET_COLORS[0]);
    setFormOpen(true);
  };

  const handleSave = () => {
    const target = parseFloat(targetAmount);
    if (!name.trim() || !target || target <= 0) return;
    const current = currentAmount ? parseFloat(currentAmount) : 0;
    if (current < 0) return;

    const payload = {
      name: name.trim(),
      target_amount: target,
      current_amount: current,
      deadline: deadline ? formatDateToString(deadline) : null,
      icon,
      color,
    };

    if (editingGoal) {
      updateGoal.mutate(
        { id: editingGoal.id, ...payload, is_completed: current >= target },
        { onSuccess: () => { setFormOpen(false); resetForm(); } }
      );
    } else {
      addGoal.mutate(payload, { onSuccess: () => { setFormOpen(false); resetForm(); } });
    }
  };

  const handleContribute = () => {
    if (!contribGoal) return;
    const amount = parseFloat(contribAmount);
    if (!amount || amount <= 0) return;
    addContribution.mutate(
      { goal: contribGoal, amount, createMovement },
      {
        onSuccess: () => {
          setContribGoal(null);
          setContribAmount('');
          setCreateMovement(true);
        },
      }
    );
  };

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <PiggyBank className="w-4 h-4 text-savings" />
          Metas de ahorro
        </CardTitle>
        <Button size="sm" onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" />
          Nueva meta
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {goals.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Todavía no tenés metas de ahorro. Creá la primera.
          </p>
        )}

        {goals.map((goal) => {
          const current = Number(goal.current_amount);
          const target = Number(goal.target_amount);
          const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;

          return (
            <div
              key={goal.id}
              className="p-4 rounded-xl border border-border/50 bg-card/40 space-y-3"
              style={{ borderLeft: `3px solid ${goal.color || PRESET_COLORS[0]}` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl leading-none">{goal.icon || '🎯'}</span>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{goal.name}</p>
                    {goal.deadline && (
                      <p className="text-xs text-muted-foreground">
                        Vence el {format(parseISO(goal.deadline), "d 'de' MMMM yyyy", { locale: es })}
                      </p>
                    )}
                  </div>
                </div>
                {goal.is_completed && (
                  <Badge className="bg-income/15 text-income border-income/20 shrink-0">
                    Completada ✓
                  </Badge>
                )}
              </div>

              <div className="space-y-1.5">
                <Progress value={pct} className="h-2" />
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">
                    {formatCurrency(current)}{' '}
                    <span className="text-muted-foreground">/ {formatCurrency(target)}</span>
                  </span>
                  <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setContribGoal(goal);
                    setContribAmount('');
                    setCreateMovement(true);
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Agregar aporte
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(goal)}>
                  <Pencil className="w-3.5 h-3.5 mr-1" />
                  Editar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar meta?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Se eliminará "{goal.name}". Los movimientos de ahorro ya registrados no se borran.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteGoal.mutate(goal.id)}>
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          );
        })}
      </CardContent>

      {/* New / edit goal dialog */}
      <Dialog open={formOpen} onOpenChange={(o) => { setFormOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGoal ? 'Editar meta' : 'Nueva meta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Viaje a Brasil" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Monto objetivo</Label>
                <Input
                  type="number"
                  min="0"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ya ahorrado</Label>
                <Input
                  type="number"
                  min="0"
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Fecha límite (opcional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start font-normal', !deadline && 'text-muted-foreground')}>
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {deadline ? format(deadline, "d 'de' MMMM yyyy", { locale: es }) : 'Sin fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 bg-popover" align="start">
                  <Calendar mode="single" selected={deadline} onSelect={setDeadline} locale={es} className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Icono</Label>
                <Input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={4} placeholder="🎯" />
              </div>
              <div className="space-y-1.5">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2 pt-1.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={cn(
                        'w-6 h-6 rounded-full border-2 transition-all',
                        color === c ? 'border-foreground scale-110' : 'border-transparent'
                      )}
                      style={{ backgroundColor: c }}
                      aria-label={`Color ${c}`}
                    >
                      {color === c && <Check className="w-3 h-3 mx-auto text-background" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <Button className="w-full" onClick={handleSave}>
              {editingGoal ? 'Guardar cambios' : 'Crear meta'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contribution dialog */}
      <Dialog open={!!contribGoal} onOpenChange={(o) => !o && setContribGoal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar aporte {contribGoal ? `· ${contribGoal.name}` : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Monto</Label>
              <Input
                type="number"
                min="0"
                value={contribAmount}
                onChange={(e) => setContribAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <Label htmlFor="create-movement" className="text-sm cursor-pointer">
                ¿Registrar como movimiento de ahorro?
              </Label>
              <Switch id="create-movement" checked={createMovement} onCheckedChange={setCreateMovement} />
            </div>
            <Button className="w-full" onClick={handleContribute}>
              Guardar aporte
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
