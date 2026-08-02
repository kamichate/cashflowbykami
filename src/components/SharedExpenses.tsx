import { useState, useEffect } from 'react';
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
import { useAddPendingPayment } from '@/hooks/usePendingPayments';
import { Switch } from '@/components/ui/switch';
import { useAddPendingIncomeBatch } from '@/hooks/usePendingIncome';
import { formatDateToString, parseDateString } from '@/lib/dateUtils';
import { format, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';

interface ParticipantDraft {
  person_name: string;
  amount_owed: number;
  installments: number | null;
  amounts: number[];
}

function splitInstallments(total: number, count: number): number[] {
  const per = Math.round((total / count) * 100) / 100;
  const amounts = Array(count).fill(per);
  const diff = Math.round((total - per * count) * 100) / 100;
  amounts[count - 1] = Math.round((per + diff) * 100) / 100;
  return amounts;
}



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
  const addPendingPayment = useAddPendingPayment();
  const addPendingIncomeBatch = useAddPendingIncomeBatch();
  const { data: people } = usePeople();
  const { data: categories = [] } = useCategories();

  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [date, setDate] = useState(formatDateToString(new Date()));
  const [categoryId, setCategoryId] = useState('');
  const [participants, setParticipants] = useState<ParticipantDraft[]>([]);
  const [newPersonName, setNewPersonName] = useState('');
  const [splitEqual, setSplitEqual] = useState(true);
  const [paidByMe, setPaidByMe] = useState(true);
  const [thirdPartyName, setThirdPartyName] = useState('');
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');

  const expenseCategories = categories.filter(c => c.type === 'expense');
  const participantsSum = participants.reduce((s, p) => s + p.amount_owed, 0);
  const totalNum = parseFloat(totalAmount) || 0;
  const exceedsTotal = !splitEqual && participantsSum > totalNum;
  const missingThirdParty = !paidByMe && !thirdPartyName.trim();

  // Keep installment previews in sync with each participant's share / count
  useEffect(() => {
    setParticipants((prev) => {
      let changed = false;
      const next = prev.map((p) => {
        if (!p.installments) {
          if (p.amounts.length) { changed = true; return { ...p, amounts: [] }; }
          return p;
        }
        const sum = p.amounts.reduce((s, a) => s + a, 0);
        const inSync =
          p.amounts.length === p.installments &&
          Math.abs(sum - p.amount_owed) < 0.5;
        if (inSync) return p;
        changed = true;
        return { ...p, amounts: splitInstallments(p.amount_owed, p.installments) };
      });
      return changed ? next : prev;
    });
  }, [participants]);

  const installmentsInvalid = participants.some(
    (p) =>
      p.installments &&
      (p.amounts.some((a) => a <= 0) ||
        Math.abs(p.amounts.reduce((s, a) => s + a, 0) - p.amount_owed) > 0.5)
  );

  const addParticipant = (name: string) => {
    if (!name.trim() || participants.find((p) => p.person_name === name)) return;
    setParticipants([
      ...participants,
      { person_name: name.trim(), amount_owed: 0, installments: null, amounts: [] },
    ]);
    setNewPersonName('');
  };

  const recalcEqualSplit = (total: number, parts: ParticipantDraft[]) => {
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

  const handleInstallmentAmountChange = (personName: string, index: number, value: string) => {
    const parsed = parseFloat(value);
    setParticipants((prev) =>
      prev.map((p) => {
        if (p.person_name !== personName || !p.installments) return p;
        const amounts = [...p.amounts];
        amounts[index] = isNaN(parsed) ? 0 : parsed;
        const others = amounts.map((_, i) => i).filter((i) => i !== index);
        const remaining = p.amount_owed - amounts[index];
        if (others.length > 0) {
          const per = Math.round((remaining / others.length) * 100) / 100;
          others.forEach((i) => { amounts[i] = per; });
          const diff = Math.round((p.amount_owed - amounts.reduce((s, a) => s + a, 0)) * 100) / 100;
          const last = others[others.length - 1];
          amounts[last] = Math.round((amounts[last] + diff) * 100) / 100;
        }
        return { ...p, amounts };
      })
    );
  };

  const handleSubmit = async () => {
    const total = parseFloat(totalAmount);
    if (!total || participants.length === 0) return;
    if (missingThirdParty || installmentsInvalid) return;

    const finalParticipants = splitEqual
      ? recalcEqualSplit(total, participants)
      : participants;

    await addSharedExpense.mutateAsync({
      total_amount: total,
      description: description || undefined,
      date,
      category_id: categoryId || undefined,
      paid_by_third_party: !paidByMe,
      third_party_name: paidByMe ? undefined : thirdPartyName.trim(),
      participants: finalParticipants.map((p) => ({
        person_name: p.person_name,
        amount_owed: p.amount_owed,
      })),
    });

    // Installment plans for participants paying in cuotas -> pending income
    const rows = finalParticipants.flatMap((p) => {
      if (!p.installments) return [];
      const groupId = crypto.randomUUID();
      const amounts =
        p.amounts.length === p.installments
          ? p.amounts
          : splitInstallments(p.amount_owed, p.installments);
      return amounts.map((amt, i) => ({
        description: `${p.person_name}${description ? ` - ${description}` : ''} (cuota ${i + 1}/${p.installments})`,
        amount: amt,
        due_date: formatDateToString(addMonths(parseDateString(date), i + 1)),
        category_id: null,
        installment_group_id: groupId,
        installment_number: i + 1,
        total_installments: p.installments as number,
      }));
    });

    if (rows.length) {
      await addPendingIncomeBatch.mutateAsync(rows);
    }

    if (!paidByMe) {
      setRefundAmount(String(total));
      setShowRefundDialog(true);
      return;
    }

    onSuccess();
  };

  const handleAddRefund = async () => {
    const amount = parseFloat(refundAmount);
    if (amount > 0) {
      await addPendingPayment.mutateAsync({
        description: `Devolver a ${thirdPartyName.trim()}${description ? ` - ${description}` : ''}`,
        amount,
        due_date: formatDateToString(new Date()),
      });
    }
    setShowRefundDialog(false);
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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="paid-by-me">¿Lo pagaste vos?</Label>
          <Switch id="paid-by-me" checked={paidByMe} onCheckedChange={setPaidByMe} />
        </div>
        {!paidByMe && (
          <div>
            <Label>¿Quién lo pagó?</Label>
            <Input
              value={thirdPartyName}
              onChange={(e) => setThirdPartyName(e.target.value)}
              placeholder="Nombre"
            />
            <p className="text-xs text-muted-foreground mt-1">
              No se descontará de tu balance
            </p>
          </div>
        )}
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
                    const newParts: ParticipantDraft[] = [...participants, { person_name: p.name, amount_owed: 0, installments: null, amounts: [] }];
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
          <div key={p.person_name} className="mb-3 space-y-2">
            <div className="flex items-center gap-2">
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

            <div className="flex items-center justify-between pl-1">
              <span className="text-xs text-muted-foreground">¿Paga en cuotas?</span>
              <Switch
                checked={!!p.installments}
                onCheckedChange={(checked) =>
                  setParticipants(
                    participants.map((pp) =>
                      pp.person_name === p.person_name
                        ? {
                            ...pp,
                            installments: checked ? 2 : null,
                            amounts: checked ? splitInstallments(pp.amount_owed, 2) : [],
                          }
                        : pp
                    )
                  )
                }
              />
            </div>

            {p.installments && (
              <div className="space-y-2 p-2 rounded-lg bg-muted/30 border border-border/50">
                <div className="space-y-1">
                  <Label className="text-xs">Cantidad de cuotas</Label>
                  <Input
                    type="number"
                    min={2}
                    max={48}
                    className="h-8 text-sm"
                    value={p.installments}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (isNaN(v)) return;
                      const count = Math.min(48, Math.max(2, v));
                      setParticipants(
                        participants.map((pp) =>
                          pp.person_name === p.person_name
                            ? { ...pp, installments: count, amounts: splitInstallments(pp.amount_owed, count) }
                            : pp
                        )
                      );
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Previsualización — podés editar los montos
                </p>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {p.amounts.map((amt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs w-10 shrink-0 text-muted-foreground">
                        {i + 1}/{p.installments}
                      </span>
                      <span className="text-xs w-20 shrink-0 text-muted-foreground">
                        {format(addMonths(parseDateString(date), i + 1), 'dd MMM yy', { locale: es })}
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="h-8 text-sm"
                        value={Number.isFinite(amt) ? amt : 0}
                        onChange={(e) => handleInstallmentAmountChange(p.person_name, i, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {parseFloat(totalAmount) <= 0 && totalAmount !== '' && (
        <p className="text-xs text-destructive">El monto debe ser mayor a cero</p>
      )}

      {exceedsTotal && (
        <p className="text-xs text-destructive">La suma no puede superar el total</p>
      )}

      {missingThirdParty && (
        <p className="text-xs text-destructive">Indicá quién pagó el gasto</p>
      )}

      <Button
        onClick={handleSubmit}
        disabled={addSharedExpense.isPending || !totalAmount || parseFloat(totalAmount) <= 0 || participants.length === 0 || exceedsTotal || missingThirdParty}
        className="w-full"
      >
        {addSharedExpense.isPending ? 'Guardando...' : 'Registrar gasto compartido'}
      </Button>

      <Dialog open={showRefundDialog} onOpenChange={(o) => { if (!o) { setShowRefundDialog(false); onSuccess(); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Querés agregar un pago pendiente a {thirdPartyName.trim()}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Monto a devolver</Label>
              <Input
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setShowRefundDialog(false); onSuccess(); }}
              >
                Omitir
              </Button>
              <Button
                className="flex-1"
                onClick={handleAddRefund}
                disabled={addPendingPayment.isPending || !(parseFloat(refundAmount) > 0)}
              >
                Agregar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  disabled={deleteSharedExpense.isPending}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar este gasto compartido?</AlertDialogTitle>
                  <AlertDialogDescription>
                    También se eliminará el movimiento asociado. Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteSharedExpense.mutate(expense.id)}>
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
