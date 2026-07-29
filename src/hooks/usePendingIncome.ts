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
  installment_group_id: string | null;
  installment_number: number | null;
  total_installments: number | null;
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

      if (error) {
        toast.error('Error al cargar ingresos pendientes. Intentá de nuevo.');
        throw error;
      }
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
      installment_group_id?: string;
      installment_number?: number;
      total_installments?: number;
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

export function useUpdatePendingIncome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      description?: string;
      amount?: number;
      due_date?: string;
      category_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('pending_income')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PendingIncome;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-income'] });
      toast.success('Ingreso pendiente actualizado');
    },
    onError: () => toast.error('Error al actualizar ingreso pendiente'),
  });
}

/**
 * Recalcula las cuotas no cobradas restantes de un grupo para que se repartan
 * en partes iguales el total restante, tras cambiar el monto de una cuota.
 */
export function useUpdateInstallmentGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      group_id,
      installment_id,
      new_amount,
    }: {
      group_id: string;
      installment_id: string;
      new_amount: number;
    }) => {
      const { data: items, error: fetchError } = await supabase
        .from('pending_income')
        .select('*')
        .eq('installment_group_id', group_id)
        .order('due_date', { ascending: true });

      if (fetchError) throw fetchError;
      const group = (items || []) as PendingIncome[];
      if (!group.length) throw new Error('Grupo de cuotas no encontrado');

      const groupTotal = group.reduce((sum, i) => sum + Number(i.amount), 0);
      const collectedTotal = group
        .filter((i) => i.is_collected)
        .reduce((sum, i) => sum + Number(i.amount), 0);

      const others = group.filter(
        (i) => !i.is_collected && i.id !== installment_id
      );
      const remaining = groupTotal - collectedTotal - new_amount;
      const perItem = others.length > 0 ? remaining / others.length : 0;

      if (others.length > 0 && perItem < 0) {
        throw new Error('El monto supera el total restante del grupo');
      }

      const { error: updateError } = await supabase
        .from('pending_income')
        .update({ amount: new_amount })
        .eq('id', installment_id);
      if (updateError) throw updateError;

      for (const item of others) {
        const { error } = await supabase
          .from('pending_income')
          .update({ amount: Math.round(perItem * 100) / 100 })
          .eq('id', item.id);
        if (error) throw error;
      }

      return { updated: others.length + 1 };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-income'] });
      toast.success('Cuotas recalculadas');
    },
    onError: (e: Error) =>
      toast.error(e.message || 'Error al recalcular las cuotas'),
  });
}
