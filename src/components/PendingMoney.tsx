import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, User } from 'lucide-react';
import { usePendingMoneySummary } from '@/hooks/useSharedExpenses';

export function PendingMoney() {
  const { total, byPerson } = usePendingMoneySummary();

  if (total === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="py-6 text-center text-muted-foreground">
          <p className="text-sm">No tenés dinero pendiente por cobrar 🎉</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[hsl(var(--warning))]" />
            Dinero pendiente por cobrar
          </CardTitle>
          <Badge variant="secondary" className="text-sm font-bold">
            ${total.toLocaleString('es-AR')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {byPerson.map((p) => (
            <div
              key={p.name}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-sm font-medium">{p.name}</span>
                  <div className="text-xs text-muted-foreground">
                    Debe: ${p.owed.toLocaleString('es-AR')} · Pagó: ${p.paid.toLocaleString('es-AR')}
                  </div>
                </div>
              </div>
              <span className="text-sm font-bold text-[hsl(var(--warning))]">
                ${p.remaining.toLocaleString('es-AR')}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
