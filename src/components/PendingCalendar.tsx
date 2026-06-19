import { useState, useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePendingPayments } from '@/hooks/usePendingPayments';
import { usePendingIncome } from '@/hooks/usePendingIncome';
import { cn } from '@/lib/utils';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);

export function PendingCalendar() {
  const { data: payments = [] } = usePendingPayments();
  const { data: incomes = [] } = usePendingIncome();

  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<Date | null>(null);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const unpaidPayments = useMemo(() => payments.filter((p) => !p.is_paid), [payments]);
  const uncollectedIncomes = useMemo(() => incomes.filter((i) => !i.is_collected), [incomes]);

  const hasItems = (day: Date) =>
    unpaidPayments.some((p) => isSameDay(parseISO(p.due_date), day)) ||
    uncollectedIncomes.some((i) => isSameDay(parseISO(i.due_date), day));

  const selectedItems = useMemo(() => {
    if (!selected) return { payments: [], incomes: [] };
    return {
      payments: unpaidPayments.filter((p) => isSameDay(parseISO(p.due_date), selected)),
      incomes: uncollectedIncomes.filter((i) => isSameDay(parseISO(i.due_date), selected)),
    };
  }, [selected, unpaidPayments, uncollectedIncomes]);

  const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCursor(subMonths(cursor, 1))}
            aria-label="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <CardTitle className="text-sm capitalize">
            {format(cursor, 'MMMM yyyy', { locale: es })}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCursor(addMonths(cursor, 1))}
            aria-label="Mes siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {weekDays.map((d) => (
            <div key={d} className="text-[10px] text-center text-muted-foreground py-0.5">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {days.map((day) => {
            const inMonth = isSameMonth(day, cursor);
            const today = isToday(day);
            const isSelected = selected && isSameDay(day, selected);
            const dot = hasItems(day);
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelected(day)}
                className={cn(
                  'aspect-square flex flex-col items-center justify-center rounded-md text-xs transition-colors relative',
                  !inMonth && 'text-muted-foreground/40',
                  inMonth && !today && 'hover:bg-muted/40',
                  today && 'border border-[hsl(var(--primary))]',
                  isSelected && 'bg-[hsl(var(--primary))]/20',
                )}
              >
                <span className="leading-none">{format(day, 'd')}</span>
                {dot && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[hsl(var(--primary))]" />
                )}
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="mt-3 pt-3 border-t border-border/40 space-y-1.5">
            <p className="text-xs text-muted-foreground mb-1 capitalize">
              {format(selected, "EEEE d 'de' MMMM", { locale: es })}
            </p>
            {selectedItems.payments.length === 0 && selectedItems.incomes.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">
                Sin movimientos pendientes
              </p>
            ) : (
              <>
                {selectedItems.incomes.map((i) => (
                  <div
                    key={i.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/30 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Plus className="w-3 h-3 text-[hsl(var(--income))] shrink-0" />
                      <span className="truncate">{i.description}</span>
                    </div>
                    <span className="font-semibold text-[hsl(var(--income))] shrink-0">
                      {formatCurrency(Number(i.amount))}
                    </span>
                  </div>
                ))}
                {selectedItems.payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/30 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Minus className="w-3 h-3 text-[hsl(var(--expense))] shrink-0" />
                      <span className="truncate">{p.description}</span>
                    </div>
                    <span className="font-semibold text-[hsl(var(--expense))] shrink-0">
                      {formatCurrency(Number(p.amount))}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
