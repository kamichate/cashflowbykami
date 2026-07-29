import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export interface PendingPayment {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  due_date: string;
  category_id: string | null;
  is_recurring: boolean;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  installment_group_id: string | null;
  installment_number: number | null;
  total_installments: number | null;
}

export function usePendingPayments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pending-payments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pending_payments')
        .select('*')
        .order('due_date', { ascending: true });

      if (error) {
        toast.error('Error al cargar pagos pendientes. Intentá de nuevo.');
        throw error;
      }
      return data as PendingPayment[];
    },
    enabled: !!user,
  });
}

export function useAddPendingPayment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payment: {
      description: string;
      amount: number;
      due_date: string;
      category_id?: string;
      is_recurring?: boolean;
      installment_group_id?: string;
      installment_number?: number;
      total_installments?: number;
    }) => {
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('pending_payments')
        .insert({
          ...payment,
          user_id: user.id,
          is_recurring: payment.is_recurring || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
      toast.success('Pago pendiente agregado');
    },
    onError: () => toast.error('Error al agregar pago pendiente'),
  });
}

export function useMarkPaymentPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('pending_payments')
        .update({ is_paid: true, paid_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PendingPayment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['all-movements'] });
      toast.success('Pago marcado como pagado');
    },
    onError: () => toast.error('Error al marcar como pagado'),
  });
}

export function useDeletePendingPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pending_payments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
      toast.success('Pago pendiente eliminado');
    },
    onError: () => toast.error('Error al eliminar pago pendiente'),
  });
}

export function useUpdatePendingPayment() {
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
        .from('pending_payments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PendingPayment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
      toast.success('Pago pendiente actualizado');
    },
    onError: () => toast.error('Error al actualizar pago pendiente'),
  });
}

/**
 * Recalcula las cuotas impagas restantes de un grupo para que se repartan
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
        .from('pending_payments')
        .select('*')
        .eq('installment_group_id', group_id)
        .order('due_date', { ascending: true });

      if (fetchError) throw fetchError;
      const group = (items || []) as PendingPayment[];
      if (!group.length) throw new Error('Grupo de cuotas no encontrado');

      const groupTotal = group.reduce((sum, i) => sum + Number(i.amount), 0);
      const paidTotal = group
        .filter((i) => i.is_paid)
        .reduce((sum, i) => sum + Number(i.amount), 0);

      const others = group.filter((i) => !i.is_paid && i.id !== installment_id);
      const remaining = groupTotal - paidTotal - new_amount;
      const perItem = others.length > 0 ? remaining / others.length : 0;

      if (others.length > 0 && perItem < 0) {
        throw new Error('El monto supera el total restante del grupo');
      }

      const { error: updateError } = await supabase
        .from('pending_payments')
        .update({ amount: new_amount })
        .eq('id', installment_id);
      if (updateError) throw updateError;

      for (const item of others) {
        const { error } = await supabase
          .from('pending_payments')
          .update({ amount: Math.round(perItem * 100) / 100 })
          .eq('id', item.id);
        if (error) throw error;
      }

      return { updated: others.length + 1 };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
      toast.success('Cuotas recalculadas');
    },
    onError: (e: Error) =>
      toast.error(e.message || 'Error al recalcular las cuotas'),
  });
}
