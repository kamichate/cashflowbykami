import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export type MovementType = 'income' | 'expense' | 'savings';

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
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface NewMovement {
  date: string;
  type: MovementType;
  category_id: string;
  detail?: string;
  amount: number;
  is_withdrawal?: boolean;
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

      if (error) throw error;
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

      if (error) throw error;
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

      if (error) throw error;
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
    onError: (error) => {
      toast.error('Error al agregar movimiento');
      console.error(error);
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
    onError: (error) => {
      toast.error('Error al eliminar movimiento');
      console.error(error);
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
      if (error.code === '23505') {
        toast.error('Esta categoría ya existe');
      } else {
        toast.error('Error al agregar categoría');
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
    onError: (error) => {
      toast.error('Error al eliminar categoría');
      console.error(error);
    },
  });
}
