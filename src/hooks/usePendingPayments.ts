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
