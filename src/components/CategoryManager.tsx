import { useState } from 'react';
import { Plus, Trash2, TrendingUp, Wallet, PiggyBank } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCategories, useAddCategory, useDeleteCategory, MovementType } from '@/hooks/useMovements';
import { cn } from '@/lib/utils';

const typeConfig = {
  income: {
    label: 'Ingresos',
    icon: TrendingUp,
    color: 'text-income',
    bgColor: 'bg-income-light',
  },
  expense: {
    label: 'Gastos',
    icon: Wallet,
    color: 'text-expense',
    bgColor: 'bg-expense-light',
  },
  savings: {
    label: 'Ahorros',
    icon: PiggyBank,
    color: 'text-savings',
    bgColor: 'bg-savings-light',
  },
};

export function CategoryManager() {
  const [newCategory, setNewCategory] = useState('');
  const [activeType, setActiveType] = useState<MovementType>('expense');
  
  const { data: categories = [] } = useCategories();
  const addCategory = useAddCategory();
  const deleteCategory = useDeleteCategory();

  const filteredCategories = categories.filter((c) => c.type === activeType);

  const handleAdd = () => {
    if (!newCategory.trim()) return;
    
    addCategory.mutate(
      { name: newCategory.trim(), type: activeType },
      {
        onSuccess: () => setNewCategory(''),
      }
    );
  };

  return (
    <Card className="glass-card animate-fade-in">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Gestionar Categorías</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeType} onValueChange={(v) => setActiveType(v as MovementType)}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            {Object.entries(typeConfig).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <TabsTrigger key={key} value={key} className="flex items-center gap-1">
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{config.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {Object.keys(typeConfig).map((type) => (
            <TabsContent key={type} value={type} className="space-y-4">
              {/* Add new category */}
              <div className="flex gap-2">
                <Input
                  placeholder="Nueva categoría..."
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  maxLength={50}
                />
                <Button 
                  size="icon" 
                  onClick={handleAdd}
                  disabled={!newCategory.trim() || addCategory.isPending}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Category list */}
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {filteredCategories.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4 text-sm">
                      No hay categorías
                    </p>
                  ) : (
                    filteredCategories.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <span className="font-medium">{cat.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteCategory.mutate(cat.id)}
                          disabled={deleteCategory.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
