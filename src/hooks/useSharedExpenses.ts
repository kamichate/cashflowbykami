import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export interface SharedExpense {
  id: string;
  user_id: string;
  movement_id: string | null;
  total_amount: number;
  description: string | null;
  date: string;
  created_at: string;
  updated_at: string;
  participants?: SharedExpenseParticipant[];
}

export interface SharedExpenseParticipant {
  id: string;
  shared_expense_id: string;
  person_name: string;
  amount_owed: number;
  amount_paid: number;
  is_settled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Person {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface NewSharedExpense {
  total_amount: number;
  description?: string;
  date: string;
  movement_id?: string;
  category_id?: string;
  participants: { person_name: string; amount_owed: number }[];
}

// Fetch people list
export function usePeople() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['people', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('people')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Person[];
    },
    enabled: !!user,
  });
}

// Add person
export function useAddPerson() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error('No user');
      const { data, error } = await supabase
        .from('people')
        .insert({ name, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Esta persona ya existe');
      } else {
        toast.error('Error al agregar persona');
      }
    },
  });
}

// Fetch shared expenses with participants
export function useSharedExpenses() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['shared-expenses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shared_expenses')
        .select(`
          *,
          participants:shared_expense_participants(*)
        `)
        .order('date', { ascending: false });
      if (error) throw error;
      return data as (SharedExpense & { participants: SharedExpenseParticipant[] })[];
    },
    enabled: !!user,
  });
}

// Add shared expense with participants + auto-create expense movement
export function useAddSharedExpense() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: NewSharedExpense) => {
      if (!user) throw new Error('No user');

      // Calculate user's personal share
      const othersOwed = input.participants.reduce((sum, p) => sum + p.amount_owed, 0);
      const personalAmount = input.total_amount - othersOwed;

      // Create the expense movement (full amount affects balance)
      const movementInsert: any = {
        user_id: user.id,
        date: input.date,
        type: 'expense' as const,
        amount: input.total_amount,
        personal_amount: personalAmount, // User's share for category analysis
        detail: input.description ? `Compartido: ${input.description}` : 'Gasto compartido',
        is_withdrawal: false,
        is_initial_savings: false,
        currency: 'ARS',
      };
      if (input.category_id) {
        movementInsert.category_id = input.category_id;
      }

      const { data: movement, error: movError } = await supabase
        .from('movements')
        .insert(movementInsert)
        .select()
        .single();
      if (movError) throw movError;

      // Create the shared expense
      const { data: se, error: seError } = await supabase
        .from('shared_expenses')
        .insert({
          user_id: user.id,
          total_amount: input.total_amount,
          description: input.description || null,
          date: input.date,
          movement_id: movement.id,
        })
        .select()
        .single();
      if (seError) throw seError;

      // Add participants
      const participants = input.participants.map((p) => ({
        shared_expense_id: se.id,
        person_name: p.person_name,
        amount_owed: p.amount_owed,
        amount_paid: 0,
      }));

      const { error: pError } = await supabase
        .from('shared_expense_participants')
        .insert(participants);
      if (pError) throw pError;

      // Ensure people exist
      for (const p of input.participants) {
        await supabase
          .from('people')
          .upsert({ user_id: user.id, name: p.person_name }, { onConflict: 'user_id,name' });
      }

      return se;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['all-movements'] });
      toast.success('Gasto compartido registrado');
    },
    onError: () => toast.error('Error al registrar gasto compartido'),
  });
}

// Register a payment from a participant - creates a transfer movement
export function useRegisterPayment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ participantId, amount }: { participantId: string; amount: number }) => {
      if (!user) throw new Error('No user');

      // Get current participant
      const { data: participant, error: getErr } = await supabase
        .from('shared_expense_participants')
        .select('*, shared_expense:shared_expenses(*)')
        .eq('id', participantId)
        .single();
      if (getErr) throw getErr;

      const newPaid = (participant.amount_paid || 0) + amount;
      const isSettled = newPaid >= (participant.amount_owed || 0);

      // Update participant
      const { error } = await supabase
        .from('shared_expense_participants')
        .update({ amount_paid: newPaid, is_settled: isSettled })
        .eq('id', participantId);
      if (error) throw error;

      // Create a transfer movement (increases balance, NOT income)
      const { error: movErr } = await supabase
        .from('movements')
        .insert({
          user_id: user.id,
          date: new Date().toISOString().split('T')[0],
          type: 'transfer' as const,
          amount,
          detail: `Pago de ${participant.person_name}`,
          is_withdrawal: false,
          is_initial_savings: false,
          currency: 'ARS',
        });
      if (movErr) throw movErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['all-movements'] });
      toast.success('Pago registrado');
    },
    onError: () => toast.error('Error al registrar pago'),
  });
}

// Delete shared expense
export function useDeleteSharedExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Fetch the shared expense to get the associated movement_id
      const { data: se, error: getErr } = await supabase
        .from('shared_expenses')
        .select('movement_id')
        .eq('id', id)
        .single();
      if (getErr) throw getErr;

      const { error } = await supabase
        .from('shared_expenses')
        .delete()
        .eq('id', id);
      if (error) throw error;

      if (se?.movement_id) {
        await supabase.from('movements').delete().eq('id', se.movement_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-expenses'] });
      toast.success('Gasto compartido eliminado');
    },
    onError: () => toast.error('Error al eliminar'),
  });
}

// Computed: pending money summary by person
export function usePendingMoneySummary() {
  const { data: sharedExpenses } = useSharedExpenses();

  if (!sharedExpenses) return { total: 0, byPerson: [] };

  const personMap: Record<string, { owed: number; paid: number }> = {};

  for (const se of sharedExpenses) {
    for (const p of se.participants || []) {
      if (!personMap[p.person_name]) {
        personMap[p.person_name] = { owed: 0, paid: 0 };
      }
      personMap[p.person_name].owed += p.amount_owed;
      personMap[p.person_name].paid += p.amount_paid;
    }
  }

  const byPerson = Object.entries(personMap)
    .map(([name, { owed, paid }]) => ({
      name,
      owed,
      paid,
      remaining: owed - paid,
    }))
    .filter((p) => p.remaining > 0)
    .sort((a, b) => b.remaining - a.remaining);

  const total = byPerson.reduce((sum, p) => sum + p.remaining, 0);

  return { total, byPerson };
}
