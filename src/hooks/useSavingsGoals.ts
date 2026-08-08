import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { useAddMovement } from './useMovements';
import { formatDateToString } from '@/lib/dateUtils';

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  category_id: string | null;
  icon: string | null;
  color: string | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export function useSavingsGoals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['savings-goals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast.error('Error al cargar las metas de ahorro. Intentá de nuevo.');
        throw error;
      }
      return data as SavingsGoal[];
    },
    enabled: !!user,
  });
}

export function useAddSavingsGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (goal: {
      name: string;
      target_amount: number;
      current_amount?: number;
      deadline?: string | null;
      category_id?: string | null;
      icon?: string | null;
      color?: string | null;
    }) => {
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('savings_goals')
        .insert({ ...goal, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as SavingsGoal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      toast.success('Meta de ahorro creada');
    },
    onError: () => toast.error('Error al crear la meta de ahorro'),
  });
}

export function useUpdateSavingsGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      name?: string;
      target_amount?: number;
      current_amount?: number;
      deadline?: string | null;
      category_id?: string | null;
      icon?: string | null;
      color?: string | null;
      is_completed?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('savings_goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SavingsGoal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      toast.success('Meta de ahorro actualizada');
    },
    onError: () => toast.error('Error al actualizar la meta de ahorro'),
  });
}

export function useDeleteSavingsGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('savings_goals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      toast.success('Meta de ahorro eliminada');
    },
    onError: () => toast.error('Error al eliminar la meta de ahorro'),
  });
}

/**
 * Suma un monto al progreso de una meta y, opcionalmente, registra
 * el movimiento de ahorro correspondiente.
 */
export function useAddToSavingsGoal() {
  const queryClient = useQueryClient();
  const addMovement = useAddMovement();

  return useMutation({
    mutationFn: async ({
      goal,
      amount,
      createMovement = true,
    }: {
      goal: SavingsGoal;
      amount: number;
      createMovement?: boolean;
    }) => {
      if (amount <= 0) throw new Error('El monto debe ser mayor a 0');

      const newAmount = Number(goal.current_amount) + amount;
      const isCompleted = newAmount >= Number(goal.target_amount);

      const { data, error } = await supabase
        .from('savings_goals')
        .update({ current_amount: newAmount, is_completed: isCompleted })
        .eq('id', goal.id)
        .select()
        .single();

      if (error) throw error;

      if (createMovement) {
        await addMovement.mutateAsync({
          date: formatDateToString(new Date()),
          type: 'savings',
          category_id: goal.category_id || undefined,
          detail: `Meta: ${goal.name}`,
          amount,
        });
      }

      return data as SavingsGoal;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['all-movements'] });
      toast.success(data.is_completed ? '¡Meta completada! 🎉' : 'Aporte registrado');
    },
    onError: (e: Error) => toast.error(e.message || 'Error al registrar el aporte'),
  });
}
