import { useEffect, useState } from 'react';
import { Wallet, CreditCard, Users, PiggyBank } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const KEY = 'welcome_dismissed';

const features = [
  { icon: Wallet, text: 'Registrá ingresos y gastos con categorías' },
  { icon: CreditCard, text: 'Seguí pagos y cobros pendientes' },
  { icon: Users, text: 'Dividí gastos con otras personas' },
  { icon: PiggyBank, text: 'Creá metas de ahorro' },
];

export function WelcomeScreen() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!user || localStorage.getItem(KEY)) return;
    let cancelled = false;
    supabase
      .from('movements')
      .select('id', { count: 'exact', head: true })
      .then(({ count, error }) => {
        if (!cancelled && !error && (count ?? 0) === 0) {
          setStep(0);
          setOpen(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const close = () => {
    localStorage.setItem(KEY, 'true');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="glass-card w-[calc(100%-2rem)] max-w-md rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col items-center text-center min-h-[340px]">
          <div className="flex-1 flex flex-col items-center justify-center w-full gap-4">
            {step === 0 && (
              <>
                <div className="text-6xl">💰</div>
                <DialogTitle className="text-2xl font-bold">¡Bienvenida a CashFlow!</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Tu app para controlar ingresos, gastos y ahorros en un solo lugar. Vamos a mostrarte cómo funciona en 2 pasos.
                </DialogDescription>
              </>
            )}
            {step === 1 && (
              <>
                <DialogTitle className="text-xl font-bold">Qué podés hacer</DialogTitle>
                <DialogDescription className="sr-only">Funciones principales</DialogDescription>
                <ul className="w-full space-y-3 text-left">
                  {features.map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                      <div className="p-2 rounded-lg bg-primary/15 text-primary">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-medium">{text}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {step === 2 && (
              <>
                <div className="text-6xl">🚀</div>
                <DialogTitle className="text-2xl font-bold">¡Todo listo!</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Podés empezar cargando tu primer movimiento con el botón + que aparece abajo a la derecha.
                </DialogDescription>
              </>
            )}
          </div>

          <div className="w-full mt-6 space-y-3">
            {step < 2 ? (
              <Button className="w-full" onClick={() => setStep(step + 1)}>Siguiente →</Button>
            ) : (
              <>
                <Button className="w-full" onClick={close}>¡Empezar!</Button>
                <button onClick={close} className="text-xs text-muted-foreground hover:text-foreground">
                  Omitir
                </button>
              </>
            )}
            <div className="flex justify-center gap-2 pt-2">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={cn('h-2 w-2 rounded-full transition-all', i === step ? 'bg-primary w-5' : 'bg-muted-foreground/30')}
                />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
