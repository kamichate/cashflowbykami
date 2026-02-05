import { useState } from 'react';
import { DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

interface ExchangeRateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usdAmount: number;
  isWithdrawal: boolean;
  onConfirm: (exchangeRate: number, arsAmount: number) => void;
}

export function ExchangeRateDialog({ 
  open, 
  onOpenChange, 
  usdAmount, 
  isWithdrawal,
  onConfirm 
}: ExchangeRateDialogProps) {
  const [exchangeRate, setExchangeRate] = useState('');

  const arsAmount = exchangeRate ? usdAmount * parseFloat(exchangeRate) : 0;

  const handleConfirm = () => {
    if (!exchangeRate || parseFloat(exchangeRate) <= 0) return;
    onConfirm(parseFloat(exchangeRate), arsAmount);
    setExchangeRate('');
  };

  const formatCurrency = (amount: number, currency: 'ARS' | 'USD') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-savings" />
            Cotización del Dólar
          </DialogTitle>
          <DialogDescription>
            {isWithdrawal 
              ? `Estás retirando ${formatCurrency(usdAmount, 'USD')}. Ingresá la cotización para convertirlo a pesos.`
              : `Estás ahorrando ${formatCurrency(usdAmount, 'USD')}. Ingresá la cotización para descontar el equivalente en pesos.`
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Cotización del dólar (ARS por USD)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="Ej: 1150.00"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              className="text-lg font-semibold"
              autoFocus
            />
          </div>

          {exchangeRate && parseFloat(exchangeRate) > 0 && (
            <div className="p-4 rounded-lg bg-muted/50 border border-border/50 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Monto en USD:</span>
                <span className="font-medium">{formatCurrency(usdAmount, 'USD')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cotización:</span>
                <span className="font-medium">$1 USD = {formatCurrency(parseFloat(exchangeRate), 'ARS')}</span>
              </div>
              <div className="border-t border-border/50 pt-2 flex justify-between">
                <span className="text-muted-foreground">
                  {isWithdrawal ? 'Recibirás en pesos:' : 'Se descontará de ingresos:'}
                </span>
                <span className="font-bold text-lg text-savings">
                  {formatCurrency(arsAmount, 'ARS')}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline"
            onClick={() => {
              setExchangeRate('');
              onOpenChange(false);
            }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!exchangeRate || parseFloat(exchangeRate) <= 0}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
