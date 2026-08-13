import { useState } from 'react';
import { Home, BarChart3, Settings, LogOut, Menu, Wallet, Users, CreditCard, PiggyBank, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { FloatingActionButton } from './FloatingActionButton';
import { useTheme } from '@/lib/theme';
import { usePendingNotificationsCount } from '@/hooks/usePendingNotificationsCount';

interface LayoutProps {
  children: React.ReactNode;
  currentTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'payments', label: 'Pendientes', icon: CreditCard },
  { id: 'shared', label: 'Compartidos', icon: Users },
  { id: 'goals', label: 'Metas', icon: PiggyBank },
  { id: 'summary', label: 'Resumen', icon: BarChart3 },
  { id: 'settings', label: 'Configuración', icon: Settings },
];

function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
      title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
    >
      {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </Button>
  );
}

function PendingBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none">
      {count >= 10 ? '9+' : count}
    </span>
  );
}

export function Layout({ children, currentTab, onTabChange }: LayoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { signOut } = useAuth();
  const pendingCount = usePendingNotificationsCount();

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

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
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
              {item.id === 'payments' && <PendingBadge count={pendingCount} />}
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
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menú" className="relative">
                <Menu className="w-5 h-5" />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1">
                    <PendingBadge count={pendingCount} />
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <NavContent />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg gradient-primary">
              <Wallet className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold">Finanzas</span>
          </div>

          <ThemeToggle />
        </div>
      </header>

      <main className="pt-16">
        <div className="container max-w-4xl py-6 px-4">
          {children}
        </div>
      </main>

      <FloatingActionButton currentTab={currentTab} />
    </div>
  );
}
