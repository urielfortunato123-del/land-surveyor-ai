import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

interface AuthFormProps {
  mode: 'login' | 'register';
}

const AuthForm = ({ mode }: AuthFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate auth
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: mode === 'login' ? 'Bem-vindo de volta!' : 'Conta criada!',
      description: 'Redirecionando para o dashboard...',
    });
    
    setIsLoading(false);
    navigate('/dashboard');
  };

  const isLogin = mode === 'login';

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div 
          className="w-full max-w-md"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">GeoMatrícula</span>
          </Link>

          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            {isLogin ? 'Acesse sua conta' : 'Crie sua conta'}
          </h1>
          <p className="text-muted-foreground mb-8">
            {isLogin 
              ? 'Entre para acessar seus projetos' 
              : 'Comece a processar matrículas gratuitamente'
            }
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-11"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              variant="hero" 
              className="w-full" 
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? 'Carregando...' : (isLogin ? 'Entrar' : 'Criar conta')}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              {isLogin ? 'Não tem uma conta? ' : 'Já tem uma conta? '}
              <Link 
                to={isLogin ? '/register' : '/login'} 
                className="text-accent hover:underline font-medium"
              >
                {isLogin ? 'Criar conta' : 'Entrar'}
              </Link>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary to-accent items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <motion.div 
          className="relative z-10 text-center text-primary-foreground"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="w-24 h-24 rounded-2xl bg-primary-foreground/10 backdrop-blur-xl flex items-center justify-center mx-auto mb-8">
            <MapPin className="w-12 h-12" />
          </div>
          <h2 className="font-display text-3xl font-bold mb-4">
            Matrícula → Polígono
          </h2>
          <p className="text-lg text-primary-foreground/80 max-w-md">
            Transforme documentos de registro imobiliário em dados geoespaciais prontos para uso profissional.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export const LoginPage = () => <AuthForm mode="login" />;
export const RegisterPage = () => <AuthForm mode="register" />;
