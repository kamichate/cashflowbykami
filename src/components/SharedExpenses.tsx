import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import { Plus, Trash2, Users, DollarSign, Check, X } from 'lucide-react';
import {
  useSharedExpenses,
  useAddSharedExpense,
  useRegisterPayment,
  useDeleteSharedExpense,
  usePeople,
} from '@/hooks/useSharedExpenses';
import { useCategories } from '@/hooks/useMovements';
import { formatDateToString, parseDateString } from '@/lib/dateUtils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function SharedExpenses() {
  const { data: sharedExpenses, isLoading } = useSharedExpenses();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Gastos Compartidos</h2>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Nuevo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuevo Gasto Compartido</DialogTitle>
            </DialogHeader>
            <SharedExpenseForm onSuccess={() => setShowForm(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Cargando...</div>
      ) : !sharedExpenses?.length ? (
        <Card className="glass-card">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No tenés gastos compartidos todavía</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sharedExpenses.map((se) => (
            <SharedExpenseCard key={se.id} expense={se} />
          ))}
        </div>
      )}
    </div>
  );
}

function SharedExpenseForm({ onSuccess }: { onSuccess: () => void }) {
  const addSharedExpense = useAddSharedExpense();
  const { data: people } = usePeople();
  const { data: categories = [] } = useCategories();

  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [date, setDate] = useState(formatDateToString(new Date()));
  const [categoryId, setCategoryId] = useState('');
  const [participants, setParticipants] = useState<{ person_name: string; amount_owed: number }[]>([]);
  const [newPersonName, setNewPersonName] = useState('');
  const [splitEqual, setSplitEqual] = useState(true);

  const expenseCategories = categories.filter(c => c.type === 'expense');

  const addParticipant = (name: string) => {
    if (!name.trim() || participants.find((p) => p.person_name === name)) return;
    setParticipants([...participants, { person_name: name.trim(), amount_owed: 0 }]);
    setNewPersonName('');
  };

  const recalcEqualSplit = (total: number, parts: typeof participants) => {
    if (!splitEqual || parts.length === 0) return parts;
    const each = Math.round((total / (parts.length + 1)) * 100) / 100;
    return parts.map((p) => ({ ...p, amount_owed: each }));
  };

  const handleTotalChange = (val: string) => {
    setTotalAmount(val);
    const num = parseFloat(val) || 0;
    if (splitEqual) {
      setParticipants(recalcEqualSplit(num, participants));
    }
  };

  const handleSubmit = async () => {
    const total = parseFloat(totalAmount);
    if (!total || participants.length === 0) return;

    const finalParticipants = splitEqual
      ? recalcEqualSplit(total, participants)
      : participants;

    await addSharedExpense.mutateAsync({
      total_amount: total,
      description: description || undefined,
      date,
      category_id: categoryId || undefined,
      participants: finalParticipants,
    });
    onSuccess();
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Descripción</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej: Cena en restaurante"
        />
      </div>

      <div>
        <Label>Monto total</Label>
        <Input
          type="number"
          value={totalAmount}
          onChange={(e) => handleTotalChange(e.target.value)}
          placeholder="0"
        />
      </div>

      <div>
        <Label>Categoría de gasto</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar categoría" />
          </SelectTrigger>
          <SelectContent>
            {expenseCategories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">Solo tu parte se contará en esta categoría</p>
      </div>

      <div>
        <Label>Fecha</Label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Personas</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSplitEqual(!splitEqual);
              if (!splitEqual) {
                setParticipants(recalcEqualSplit(parseFloat(totalAmount) || 0, participants));
              }
            }}
            className="text-xs"
          >
            {splitEqual ? 'División igual' : 'División personalizada'}
          </Button>
        </div>

        <div className="flex gap-2 mb-2">
          <Input
            value={newPersonName}
            onChange={(e) => setNewPersonName(e.target.value)}
            placeholder="Nombre"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addParticipant(newPersonName))}
          />
          <Button type="button" size="icon" variant="outline" onClick={() => addParticipant(newPersonName)}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {people && people.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {people
              .filter((p) => !participants.find((part) => part.person_name === p.name))
              .slice(0, 5)
              .map((p) => (
                <Button
                  key={p.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => {
                    const newParts = [...participants, { person_name: p.name, amount_owed: 0 }];
                    const updated = splitEqual
                      ? recalcEqualSplit(parseFloat(totalAmount) || 0, newParts)
                      : newParts;
                    setParticipants(updated);
                  }}
                >
                  + {p.name}
                </Button>
              ))}
          </div>
        )}

        {participants.length > 0 && (
          <div className="p-2 rounded-lg bg-muted/30 mb-2">
            <p className="text-xs text-muted-foreground">
              Tu parte: ${(
                (parseFloat(totalAmount) || 0) - participants.reduce((s, p) => s + p.amount_owed, 0)
              ).toLocaleString('es-AR')}
            </p>
          </div>
        )}

        {participants.map((p) => (
          <div key={p.person_name} className="flex items-center gap-2 mb-2">
            <span className="flex-1 text-sm truncate">{p.person_name}</span>
            {!splitEqual ? (
              <Input
                type="number"
                className="w-24 h-8 text-sm"
                value={p.amount_owed || ''}
                onChange={(e) =>
                  setParticipants(
                    participants.map((pp) =>
                      pp.person_name === p.person_name
                        ? { ...pp, amount_owed: parseFloat(e.target.value) || 0 }
                        : pp
                    )
                  )
                }
              />
            ) : (
              <span className="text-sm text-muted-foreground">
                ${p.amount_owed.toLocaleString('es-AR')}
              </span>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                const newParts = participants.filter((pp) => pp.person_name !== p.person_name);
                setParticipants(splitEqual ? recalcEqualSplit(parseFloat(totalAmount) || 0, newParts) : newParts);
              }}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={addSharedExpense.isPending || !totalAmount || participants.length === 0}
        className="w-full"
      >
        {addSharedExpense.isPending ? 'Guardando...' : 'Registrar gasto compartido'}
      </Button>
    </div>
  );
}

function SharedExpenseCard({
  expense,
}: {
  expense: {
    id: string;
    total_amount: number;
    description: string | null;
    date: string;
    participants: {
      id: string;
      person_name: string;
      amount_owed: number;
      amount_paid: number;
      is_settled: boolean;
    }[];
  };
}) {
  const deleteSharedExpense = useDeleteSharedExpense();
  const registerPayment = useRegisterPayment();
  const [payAmounts, setPayAmounts] = useState<Record<string, string>>({});
  const [showPayInput, setShowPayInput] = useState<string | null>(null);

  const totalOwed = expense.participants.reduce((s, p) => s + p.amount_owed, 0);
  const totalPaid = expense.participants.reduce((s, p) => s + p.amount_paid, 0);
  const allSettled = expense.participants.every((p) => p.is_settled);
  const myShare = expense.total_amount - totalOwed;

  const handlePay = async (participantId: string) => {
    const amount = parseFloat(payAmounts[participantId] || '0');
    if (amount <= 0) return;
    await registerPayment.mutateAsync({ participantId, amount });
    setShowPayInput(null);
    setPayAmounts({});
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">
              {expense.description || 'Gasto compartido'}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {format(parseDateString(expense.date), "d 'de' MMMM yyyy", { locale: es })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={allSettled ? 'default' : 'secondary'} className="text-xs">
              {allSettled ? 'Saldado' : `$${(totalOwed - totalPaid).toLocaleString('es-AR')} pendiente`}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => deleteSharedExpense.mutate(expense.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-lg font-bold">${expense.total_amount.toLocaleString('es-AR')}</p>
          <p className="text-xs text-muted-foreground">
            (mi parte: ${myShare.toLocaleString('es-AR')})
          </p>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {expense.participants.map((p) => {
            const remaining = p.amount_owed - p.amount_paid;
            return (
              <div
                key={p.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
              >
                <div className="flex-1">
                  <span className="text-sm font-medium">{p.person_name}</span>
                  <div className="text-xs text-muted-foreground">
                    Debe: ${p.amount_owed.toLocaleString('es-AR')}
                    {p.amount_paid > 0 && ` · Pagó: $${p.amount_paid.toLocaleString('es-AR')}`}
                  </div>
                </div>

                {p.is_settled ? (
                  <Badge variant="default" className="text-xs gap-1">
                    <Check className="w-3 h-3" /> Pagado
                  </Badge>
                ) : showPayInput === p.id ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      className="w-20 h-7 text-xs"
                      placeholder={remaining.toString()}
                      value={payAmounts[p.id] || ''}
                      onChange={(e) =>
                        setPayAmounts({ ...payAmounts, [p.id]: e.target.value })
                      }
                      onKeyDown={(e) => e.key === 'Enter' && handlePay(p.id)}
                    />
                    <Button
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handlePay(p.id)}
                      disabled={registerPayment.isPending}
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setShowPayInput(null)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      setShowPayInput(p.id);
                      setPayAmounts({ ...payAmounts, [p.id]: remaining.toString() });
                    }}
                  >
                    <DollarSign className="w-3 h-3 mr-1" /> Cobrar
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
