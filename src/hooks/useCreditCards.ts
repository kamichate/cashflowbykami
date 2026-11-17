import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export interface CreditCard {
  id: string;
  user_id: string;
  name: string;
  bank: string | null;
  closing_day: number;
  due_day: number;
  color: string | null;
  icon: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreditCardInput {
  name: string;
  bank?: string | null;
  closing_day: number;
  due_day: number;
  color?: string | null;
  icon?: string | null;
  is_active?: boolean;
}

export function useCreditCards() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['credit-cards', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        toast.error('Error al cargar las tarjetas de crédito. Intentá de nuevo.');
        throw error;
      }
      return data as CreditCard[];
    },
    enabled: !!user,
  });
}

export function useAddCreditCard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (card: CreditCardInput) => {
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('credit_cards')
        .insert({ ...card, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as CreditCard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      toast.success('Tarjeta de crédito agregada');
    },
    onError: () => toast.error('Error al agregar la tarjeta de crédito'),
  });
}

export function useUpdateCreditCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<CreditCardInput>) => {
      const { data, error } = await supabase
        .from('credit_cards')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as CreditCard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      toast.success('Tarjeta actualizada');
    },
    onError: () => toast.error('Error al actualizar la tarjeta'),
  });
}

export function useDeleteCreditCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('credit_cards')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      // Al borrar una tarjeta, los pagos y movimientos asociados quedan sin tarjeta.
      queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['all-movements'] });
      toast.success('Tarjeta eliminada');
    },
    onError: () => toast.error('Error al eliminar la tarjeta'),
  });
}
