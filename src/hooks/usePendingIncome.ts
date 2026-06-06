import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { useAddMovement } from './useMovements';
import { formatDateToString } from '@/lib/dateUtils';

export interface PendingIncome {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  due_date: string;
  category_id: string | null;
  is_collected: boolean;
  collected_at: string | null;
  created_at: string;
  updated_at: string;
}

export function usePendingIncome() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pending-income', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pending_income')
        .select('*')
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as PendingIncome[];
    },
    enabled: !!user,
  });
}

export function useAddPendingIncome() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (income: {
      description: string;
      amount: number;
      due_date: string;
      category_id?: string;
    }) => {
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('pending_income')
        .insert({
          ...income,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-income'] });
      toast.success('Ingreso pendiente agregado');
    },
    onError: () => toast.error('Error al agregar ingreso pendiente'),
  });
}

export function useMarkIncomeCollected() {
  const queryClient = useQueryClient();
  const addMovement = useAddMovement();

  return useMutation({
    mutationFn: async (income: PendingIncome) => {
      const { data, error } = await supabase
        .from('pending_income')
        .update({ is_collected: true, collected_at: new Date().toISOString() })
        .eq('id', income.id)
        .select()
        .single();

      if (error) throw error;

      addMovement.mutate({
        date: formatDateToString(new Date()),
        type: 'income',
        category_id: income.category_id || undefined,
        detail: `Cobro: ${income.description}`,
        amount: Number(income.amount),
      });

      return data as PendingIncome;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-income'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['all-movements'] });
      toast.success('Ingreso marcado como cobrado');
    },
    onError: () => toast.error('Error al marcar como cobrado'),
  });
}

export function useDeletePendingIncome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pending_income')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-income'] });
      toast.success('Ingreso pendiente eliminado');
    },
    onError: () => toast.error('Error al eliminar ingreso pendiente'),
  });
}
