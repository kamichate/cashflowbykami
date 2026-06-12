import { useState } from 'react';
import { Home, BarChart3, Settings, LogOut, Menu, X, Wallet, Users, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { FloatingActionButton } from './FloatingActionButton';

interface LayoutProps {
  children: React.ReactNode;
  currentTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'shared', label: 'Compartidos', icon: Users },
  { id: 'payments', label: 'Pendientes', icon: CreditCard },
  { id: 'summary', label: 'Resumen', icon: BarChart3 },
  { id: 'settings', label: 'Categorías', icon: Settings },
];

export function Layout({ children, currentTab, onTabChange }: LayoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { signOut } = useAuth();

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg gradient-primary">
            <Wallet className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">Finanzas</span>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id);
                setIsOpen(false);
              }}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-rose'
                  : 'hover:bg-muted text-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/50">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive"
          onClick={() => signOut()}
        >
          <LogOut className="w-5 h-5 mr-3" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg gradient-primary">
              <Wallet className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold">Finanzas</span>
          </div>
          
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <NavContent />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col bg-card border-r border-border/50">
        <NavContent />
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64 pt-16 lg:pt-0">
        <div className="container max-w-4xl py-6 px-4">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-t border-border/50">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  'flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className={cn('w-5 h-5', isActive && 'text-primary')} />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
