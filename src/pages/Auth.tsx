import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, TrendingUp, PiggyBank } from 'lucide-react';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Email inválido').max(255, 'Email muy largo'),
  password: z.string().min(6, 'Mínimo 6 caracteres').max(100, 'Contraseña muy larga'),
});

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const rawNext = params.get('next');
  const next = rawNext && /^\/(?!\/)/.test(rawNext) ? rawNext : '/';

  useEffect(() => {
    if (user) {
      navigate(next, { replace: true });
    }
  }, [user, navigate, next]);

  const handleSubmit = async (action: 'signin' | 'signup') => {
    setError('');
    setMessage('');
    
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      if (action === 'signup') {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes('already registered')) {
            setError('Este email ya está registrado. Intenta iniciar sesión.');
          } else {
            setError(error.message);
          }
        } else {
          setMessage('Revisa tu email para confirmar tu cuenta');
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login')) {
            setError('Email o contraseña incorrectos');
          } else if (error.message.includes('Email not confirmed')) {
            setError('Por favor confirma tu email antes de iniciar sesión');
          } else {
            setError(error.message);
          }
        }
      }
    } catch (err) {
      setError('Ocurrió un error. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-hero">
      <Card className="w-full max-w-md glass-card animate-scale-in">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full gradient-primary shadow-rose">
            <Wallet className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Control de Finanzas</CardTitle>
          <CardDescription>
            Gestiona tus ingresos, gastos y ahorros de forma simple
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="signup">Registrarse</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Contraseña</Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit('signin')}
                />
              </div>
              <Button 
                className="w-full" 
                onClick={() => handleSubmit('signin')}
                disabled={isLoading}
              >
                {isLoading ? 'Ingresando...' : 'Ingresar'}
              </Button>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Contraseña</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit('signup')}
                />
              </div>
              <Button 
                className="w-full" 
                onClick={() => handleSubmit('signup')}
                disabled={isLoading}
              >
                {isLoading ? 'Registrando...' : 'Crear cuenta'}
              </Button>
            </TabsContent>
          </Tabs>

          {error && (
            <p className="text-sm text-destructive mt-4 text-center animate-fade-in">
              {error}
            </p>
          )}
          {message && (
            <p className="text-sm text-income mt-4 text-center animate-fade-in">
              {message}
            </p>
          )}

          <div className="mt-8 pt-6 border-t border-border/50">
            <div className="flex justify-center gap-8 text-muted-foreground">
              <div className="flex flex-col items-center gap-1">
                <TrendingUp className="w-5 h-5 text-income" />
                <span className="text-xs">Ingresos</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Wallet className="w-5 h-5 text-expense" />
                <span className="text-xs">Gastos</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <PiggyBank className="w-5 h-5 text-savings" />
                <span className="text-xs">Ahorros</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
