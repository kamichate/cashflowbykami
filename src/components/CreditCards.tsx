import { useState } from 'react';
import { CreditCard, Plus, Pencil, Trash2, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  useCreditCards,
  useAddCreditCard,
  useUpdateCreditCard,
  useDeleteCreditCard,
  CreditCard as CreditCardType,
} from '@/hooks/useCreditCards';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  'hsl(350, 70%, 70%)',
  'hsl(45, 90%, 65%)',
  'hsl(200, 80%, 70%)',
  'hsl(280, 60%, 70%)',
  'hsl(150, 50%, 60%)',
  'hsl(30, 80%, 65%)',
];

const DEFAULT_ICON = '💳';

const validDay = (value: string) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 31;
};

export function CreditCards() {
  const { data: cards = [] } = useCreditCards();
  const addCard = useAddCreditCard();
  const updateCard = useUpdateCreditCard();
  const deleteCard = useDeleteCreditCard();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCardType | null>(null);
  const [name, setName] = useState('');
  const [bank, setBank] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [icon, setIcon] = useState(DEFAULT_ICON);
  const [color, setColor] = useState(PRESET_COLORS[0]);

  const resetForm = () => {
    setEditingCard(null);
    setName('');
    setBank('');
    setClosingDay('');
    setDueDay('');
    setIcon(DEFAULT_ICON);
    setColor(PRESET_COLORS[0]);
  };

  const openNew = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (card: CreditCardType) => {
    setEditingCard(card);
    setName(card.name);
    setBank(card.bank || '');
    setClosingDay(String(card.closing_day));
    setDueDay(String(card.due_day));
    setIcon(card.icon || DEFAULT_ICON);
    setColor(card.color || PRESET_COLORS[0]);
    setFormOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    if (!validDay(closingDay) || !validDay(dueDay)) return;

    const payload = {
      name: name.trim(),
      bank: bank.trim() || null,
      closing_day: Number(closingDay),
      due_day: Number(dueDay),
      icon: icon.trim() || DEFAULT_ICON,
      color,
    };

    if (editingCard) {
      updateCard.mutate(
        { id: editingCard.id, ...payload },
        { onSuccess: () => { setFormOpen(false); resetForm(); } }
      );
    } else {
      addCard.mutate(payload, { onSuccess: () => { setFormOpen(false); resetForm(); } });
    }
  };

  const canSave = !!name.trim() && validDay(closingDay) && validDay(dueDay);
  const saving = addCard.isPending || updateCard.isPending;

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary" />
          Tarjetas de crédito
        </CardTitle>
        <Button size="sm" onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" />
          Nueva tarjeta
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {cards.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Todavía no agregaste ninguna tarjeta.
          </p>
        )}

        {cards.map((card) => (
          <div
            key={card.id}
            className="p-4 rounded-xl border border-border/50 bg-card/40 space-y-3"
            style={{ borderLeft: `3px solid ${card.color || PRESET_COLORS[0]}` }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xl leading-none">{card.icon || DEFAULT_ICON}</span>
                <div className="min-w-0">
                  <p className="font-medium truncate">{card.name}</p>
                  {card.bank && (
                    <p className="text-xs text-muted-foreground truncate">{card.bank}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Cierre día {card.closing_day} · Vence día {card.due_day}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => openEdit(card)}>
                <Pencil className="w-3.5 h-3.5 mr-1" />
                Editar
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" aria-label="Eliminar tarjeta">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar tarjeta?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se eliminará "{card.name}". Los movimientos y pagos pendientes ya registrados
                      no se borran, solo quedan sin tarjeta asociada.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteCard.mutate(card.id)}>
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </CardContent>

      {/* New / edit card dialog */}
      <Dialog open={formOpen} onOpenChange={(o) => { setFormOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCard ? 'Editar tarjeta' : 'Nueva tarjeta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Visa Santander"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Banco (opcional)</Label>
              <Input
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                placeholder="Ej: Santander"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Día de cierre</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={closingDay}
                  onChange={(e) => setClosingDay(e.target.value)}
                  placeholder="Ej: 5"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Día de vencimiento</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  placeholder="Ej: 20"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Icono</Label>
                <Input
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  maxLength={2}
                  placeholder="💳"
                />
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
            <Button className="w-full" onClick={handleSave} disabled={!canSave || saving}>
              {editingCard ? 'Guardar cambios' : 'Crear tarjeta'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
