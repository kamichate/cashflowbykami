import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MovementForm } from './MovementForm';

interface FloatingActionButtonProps {
  currentTab: string;
}

export function FloatingActionButton({ currentTab }: FloatingActionButtonProps) {
  const [open, setOpen] = useState(false);

  if (currentTab === 'settings') return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 active:scale-95 transition-all"
        aria-label="Agregar movimiento"
      >
        <Plus className="w-6 h-6" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Movimiento</DialogTitle>
          </DialogHeader>
          <MovementForm onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
