import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { useAddMovement } from './useMovements';
import { formatDateToString } from '@/lib/dateUtils';

export type GoalCurrency = 'ARS' | 'USD';
export type ContributionSource = 'income' | 'savings_ars' | 'savings_usd';

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
  currency: GoalCurrency;
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
      currency?: GoalCurrency;
    }) => {
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('savings_goals')
        .insert({ ...goal, currency: goal.currency ?? 'ARS', user_id: user.id })
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
      currency?: GoalCurrency;
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

/** Moneda en la que se ingresa el aporte según el origen elegido. */
export function sourceCurrency(source: ContributionSource, goal: SavingsGoal): GoalCurrency {
  if (source === 'savings_ars') return 'ARS';
  if (source === 'savings_usd') return 'USD';
  return goal.currency;
}

/** Indica si hace falta pedir la cotización para este aporte. */
export function needsExchangeRate(source: ContributionSource, goal: SavingsGoal): boolean {
  const from = sourceCurrency(source, goal);
  if (from !== goal.currency) return true;
  // Meta en USD financiada con ingresos: el movimiento se guarda en pesos.
  return goal.currency === 'USD' && source === 'income';
}

/**
 * Suma un monto al progreso de una meta (en la moneda de la meta) y,
 * opcionalmente, registra el movimiento de ahorro correspondiente.
 */
export function useAddToSavingsGoal() {
  const queryClient = useQueryClient();
  const addMovement = useAddMovement();

  return useMutation({
    mutationFn: async ({
      goal,
      amount,
      source = 'income',
      exchange_rate,
      createMovement = true,
    }: {
      goal: SavingsGoal;
      amount: number;
      source?: ContributionSource;
      exchange_rate?: number;
      createMovement?: boolean;
    }) => {
      if (amount <= 0) throw new Error('El monto debe ser mayor a 0');

      const from = sourceCurrency(source, goal);
      const rateNeeded = needsExchangeRate(source, goal);
      if (rateNeeded && (!exchange_rate || exchange_rate <= 0)) {
        throw new Error('Ingresá la cotización del dólar');
      }
      const rate = exchange_rate ?? 0;

      // Progreso de la meta, siempre expresado en la moneda de la meta.
      let goalIncrement = amount;
      if (from === 'USD' && goal.currency === 'ARS') goalIncrement = amount * rate;
      if (from === 'ARS' && goal.currency === 'USD') goalIncrement = amount / rate;

      const newAmount = Number(goal.current_amount) + goalIncrement;
      const isCompleted = newAmount >= Number(goal.target_amount);

      const { data, error } = await supabase
        .from('savings_goals')
        .update({ current_amount: newAmount, is_completed: isCompleted })
        .eq('id', goal.id)
        .select()
        .single();

      if (error) throw error;

      if (createMovement) {
        const isUsd = from === 'USD';
        const useRate = isUsd && rateNeeded && rate > 0;

        await addMovement.mutateAsync({
          date: formatDateToString(new Date()),
          type: 'savings',
          category_id: goal.category_id || undefined,
          detail: `Meta: ${goal.name}`,
          amount: useRate ? amount * rate : amount,
          currency: isUsd ? 'USD' : 'ARS',
          original_amount: isUsd ? amount : undefined,
          exchange_rate: useRate ? rate : undefined,
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
