import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Trash2, TrendingUp, Wallet, PiggyBank } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMovements, useDeleteMovement, MovementType } from '@/hooks/useMovements';
import { cn } from '@/lib/utils';

const typeConfig = {
  income: {
    icon: TrendingUp,
    color: 'text-income',
    bgColor: 'bg-income-light',
    sign: '+',
  },
  expense: {
    icon: Wallet,
    color: 'text-expense',
    bgColor: 'bg-expense-light',
    sign: '-',
  },
  savings: {
    icon: PiggyBank,
    color: 'text-savings',
    bgColor: 'bg-savings-light',
    sign: '→',
  },
};

export function MovementsList() {
  const { data: movements = [], isLoading } = useMovements();
  const deleteMovement = useDeleteMovement();

  const formatAmount = (amount: number, type: MovementType) => {
    const formatted = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(amount);
    return `${typeConfig[type].sign}${formatted}`;
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 text-center text-muted-foreground">
          Cargando movimientos...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card animate-fade-in">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Últimos Movimientos</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] px-6 pb-6">
          {movements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay movimientos aún
            </p>
          ) : (
            <div className="space-y-3">
              {movements.map((mov) => {
                const config = typeConfig[mov.type as MovementType];
                const Icon = config.icon;
                
                return (
                  <div
                    key={mov.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors animate-slide-up"
                  >
                    <div className={cn('p-2 rounded-lg', config.bgColor)}>
                      <Icon className={cn('w-4 h-4', config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium truncate">
                          {mov.category?.name || 'Sin categoría'}
                        </p>
                        <p className={cn('font-semibold whitespace-nowrap', config.color)}>
                          {formatAmount(Number(mov.amount), mov.type as MovementType)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                        <span className="truncate">{mov.detail || '—'}</span>
                        <span className="whitespace-nowrap">
                          {format(new Date(mov.date), 'dd MMM', { locale: es })}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMovement.mutate(mov.id)}
                      disabled={deleteMovement.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
