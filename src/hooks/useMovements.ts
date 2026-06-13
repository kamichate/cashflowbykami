import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export type MovementType = 'income' | 'expense' | 'savings' | 'transfer' | 'yield';

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: MovementType;
  created_at: string;
}

export interface Movement {
  id: string;
  user_id: string;
  date: string;
  type: MovementType;
  category_id: string | null;
  detail: string | null;
  amount: number;
  is_withdrawal: boolean;
  is_initial_savings: boolean;
  currency: 'ARS' | 'USD';
  exchange_rate: number | null;
  original_amount: number | null;
  personal_amount: number | null;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface NewMovement {
  date: string;
  type: MovementType;
  category_id?: string | null;
  detail?: string;
  amount: number;
  is_withdrawal?: boolean;
  is_initial_savings?: boolean;
  currency?: 'ARS' | 'USD';
  exchange_rate?: number;
  original_amount?: number;
  personal_amount?: number;
}

export interface UpdateMovement {
  id: string;
  date?: string;
  type?: MovementType;
  category_id?: string | null;
  detail?: string | null;
  amount?: number;
  is_withdrawal?: boolean;
  currency?: 'ARS' | 'USD';
  exchange_rate?: number | null;
  original_amount?: number | null;
}

export function useCategories() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) {
        toast.error('Error al cargar categorías. Intentá de nuevo.');
        throw error;
      }
      return data as Category[];
    },
    enabled: !!user,
  });
}

export interface MovementFilters {
  type?: MovementType | 'all';
  isWithdrawal?: boolean | 'all';
  categoryId?: string | 'all';
  startDate?: Date;
  endDate?: Date;
}

export function useMovements(filters?: MovementFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['movements', user?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from('movements')
        .select(`
          *,
          category:categories(*)
        `)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (filters?.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }

      if (filters?.isWithdrawal !== undefined && filters.isWithdrawal !== 'all') {
        query = query.eq('is_withdrawal', filters.isWithdrawal);
      }

      if (filters?.categoryId && filters.categoryId !== 'all') {
        query = query.eq('category_id', filters.categoryId);
      }

      if (filters?.startDate) {
        query = query.gte('date', filters.startDate.toISOString().split('T')[0]);
      }

      if (filters?.endDate) {
        query = query.lte('date', filters.endDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) {
        toast.error('Error al cargar movimientos. Intentá de nuevo.');
        throw error;
      }
      return data as (Movement & { category: Category | null })[];
    },
    enabled: !!user,
  });
}

// Hook for all movements without filters (for calculations)
export function useAllMovements() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['all-movements', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movements')
        .select(`
          *,
          category:categories(*)
        `)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        toast.error('Error al cargar movimientos. Intentá de nuevo.');
        throw error;
      }
      return data as (Movement & { category: Category | null })[];
    },
    enabled: !!user,
  });
}

export function useAddMovement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (movement: NewMovement) => {
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('movements')
        .insert({
          ...movement,
          is_withdrawal: movement.is_withdrawal || false,
          is_initial_savings: movement.is_initial_savings || false,
          currency: movement.currency || 'ARS',
          exchange_rate: movement.exchange_rate || null,
          original_amount: movement.original_amount || null,
          personal_amount: movement.personal_amount ?? null,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['all-movements'] });
      toast.success('Movimiento agregado');
    },
    onError: () => {
      toast.error('Error al agregar movimiento');
    },
  });
}

export function useUpdateMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (movement: UpdateMovement) => {
      const { id, ...updates } = movement;
      
      const { data, error } = await supabase
        .from('movements')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['all-movements'] });
      toast.success('Movimiento actualizado');
    },
    onError: () => {
      toast.error('Error al actualizar movimiento');
    },
  });
}

export function useDeleteMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('movements')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['all-movements'] });
      toast.success('Movimiento eliminado');
    },
    onError: () => {
      toast.error('Error al eliminar movimiento');
    },
  });
}

export function useAddCategory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, type }: { name: string; type: MovementType }) => {
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('categories')
        .insert({
          name,
          type,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoría agregada');
    },
    onError: (error: any) => {
      if (error?.code === '23505') {
        toast.error('Esta categoría ya existe');
      } else {
        toast.error('No se pudo agregar la categoría');
      }
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      toast.success('Categoría eliminada');
    },
    onError: () => {
      toast.error('No se pudo eliminar la categoría');
    },
  });
}
