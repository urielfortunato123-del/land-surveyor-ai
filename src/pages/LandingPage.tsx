import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MapPin, FileText, Download, CheckCircle, Zap, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">GeoMatrícula</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              Recursos
            </a>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
              Como Funciona
            </a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
              Planos
            </a>
          </div>
          
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link to="/register">
              <Button variant="hero">Começar Grátis</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto relative">
          <motion.div 
            className="max-w-4xl mx-auto text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              Powered by AI + Regex Engine
            </div>
            
            <h1 className="font-display text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
              De Matrícula a{' '}
              <span className="text-gradient">Polígono</span>
              <br />em Minutos
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Extraia rumos, distâncias e reconstrua polígonos de matrículas imobiliárias. 
              Gere arquivos DXF, KML e visualize no mapa interativo.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register">
                <Button variant="hero" size="xl">
                  <FileText className="w-5 h-5" />
                  Processar Matrícula
                </Button>
              </Link>
              <Link to="/demo">
                <Button variant="outline" size="xl">
                  Ver Demonstração
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Hero Visual */}
          <motion.div 
            className="mt-16 max-w-5xl mx-auto"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="glass-card rounded-2xl p-2 shadow-2xl">
              <div className="bg-sidebar rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-sidebar-border">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-warning/60" />
                  <div className="w-3 h-3 rounded-full bg-success/60" />
                  <span className="ml-4 text-sm text-sidebar-foreground/60">GeoMatrícula — Projeto: Fazenda São João</span>
                </div>
                <div className="grid md:grid-cols-2 gap-0">
                  {/* Map Preview */}
                  <div className="aspect-[4/3] bg-gradient-to-br from-primary/5 to-accent/10 relative">
                    <svg viewBox="0 0 400 300" className="w-full h-full">
                      {/* Grid lines */}
                      {Array.from({ length: 10 }).map((_, i) => (
                        <line
                          key={`h-${i}`}
                          x1="0"
                          y1={i * 30}
                          x2="400"
                          y2={i * 30}
                          stroke="currentColor"
                          strokeOpacity="0.05"
                        />
                      ))}
                      {Array.from({ length: 14 }).map((_, i) => (
                        <line
                          key={`v-${i}`}
                          x1={i * 30}
                          y1="0"
                          x2={i * 30}
                          y2="300"
                          stroke="currentColor"
                          strokeOpacity="0.05"
                        />
                      ))}
                      {/* Polygon */}
                      <motion.polygon
                        points="100,220 150,80 280,60 350,140 320,240 180,260"
                        fill="hsl(175, 60%, 40%)"
                        fillOpacity="0.2"
                        stroke="hsl(175, 60%, 40%)"
                        strokeWidth="2"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 1.5, delay: 0.5 }}
                      />
                      {/* Vertices */}
                      {[[100, 220], [150, 80], [280, 60], [350, 140], [320, 240], [180, 260]].map(([x, y], i) => (
                        <motion.circle
                          key={i}
                          cx={x}
                          cy={y}
                          r="6"
                          fill="hsl(215, 80%, 25%)"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 1 + i * 0.1 }}
                        />
                      ))}
                    </svg>
                  </div>
                  {/* Data Preview */}
                  <div className="p-6 bg-sidebar-accent/50">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
                        <span className="text-sidebar-foreground font-medium">Extração Concluída</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-sidebar/50 rounded-lg p-3">
                          <div className="text-xs text-sidebar-foreground/60 mb-1">Área Calculada</div>
                          <div className="font-display text-lg text-sidebar-foreground">12.487,35 m²</div>
                        </div>
                        <div className="bg-sidebar/50 rounded-lg p-3">
                          <div className="text-xs text-sidebar-foreground/60 mb-1">Perímetro</div>
                          <div className="font-display text-lg text-sidebar-foreground">554,75 m</div>
                        </div>
                      </div>
                      
                      <div className="bg-sidebar/50 rounded-lg p-3">
                        <div className="text-xs text-sidebar-foreground/60 mb-2">Segmentos Extraídos</div>
                        <div className="space-y-1 text-sm text-sidebar-foreground/80">
                          <div className="flex justify-between">
                            <span>1. N 35°20' W</span>
                            <span>45,50m</span>
                          </div>
                          <div className="flex justify-between">
                            <span>2. N 78°15' W</span>
                            <span>120,00m</span>
                          </div>
                          <div className="flex justify-between text-sidebar-foreground/40">
                            <span>...</span>
                            <span>+4 segmentos</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-secondary/30">
        <div className="container mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-4xl font-bold text-foreground mb-4">
              Tudo que você precisa
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Do upload à exportação profissional, automatize seu fluxo de trabalho topográfico
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: FileText,
                title: 'Extração Inteligente',
                description: 'Regex + IA identificam rumos, distâncias e confrontantes mesmo em textos bagunçados.',
              },
              {
                icon: MapPin,
                title: 'Visualização em Mapa',
                description: 'Veja o polígono reconstruído no mapa interativo com todos os vértices numerados.',
              },
              {
                icon: Download,
                title: 'Exportação Profissional',
                description: 'DXF para AutoCAD, KML para Google Earth, e relatório PDF técnico completo.',
              },
              {
                icon: CheckCircle,
                title: 'Validação Automática',
                description: 'Erro de fechamento, comparação de áreas e alertas visuais em tempo real.',
              },
              {
                icon: Zap,
                title: 'Modo IA Assistido',
                description: 'Quando regex falha, IA estrutura os dados sem inventar — transparência total.',
              },
              {
                icon: Shield,
                title: 'Auditoria Completa',
                description: 'Histórico de versões, logs do pipeline e rastreabilidade de cada extração.',
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                className="glass-card rounded-xl p-6 hover:shadow-xl transition-shadow"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="container mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-4xl font-bold text-foreground mb-4">
              Como Funciona
            </h2>
            <p className="text-lg text-muted-foreground">
              3 passos simples do upload ao download
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: '01',
                title: 'Upload da Matrícula',
                description: 'Arraste seu PDF ou imagem. Suportamos múltiplos arquivos por projeto.',
              },
              {
                step: '02',
                title: 'Processamento',
                description: 'OCR + Regex + IA extraem e validam os segmentos automaticamente.',
              },
              {
                step: '03',
                title: 'Resultados',
                description: 'Visualize no mapa, baixe DXF/KML e gere o relatório técnico.',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
              >
                <div className="font-display text-6xl font-bold text-accent/20 mb-4">
                  {item.step}
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-muted-foreground">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-gradient-to-br from-primary to-accent relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <div className="container mx-auto relative text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
              Pronto para começar?
            </h2>
            <p className="text-xl text-primary-foreground/80 mb-10 max-w-xl mx-auto">
              Crie sua conta gratuita e processe sua primeira matrícula em minutos.
            </p>
            <Link to="/register">
              <Button 
                size="xl" 
                className="bg-background text-foreground hover:bg-background/90 shadow-xl"
              >
                Criar Conta Gratuita
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <MapPin className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-foreground">GeoMatrícula</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Termos de Uso</a>
              <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
              <a href="#" className="hover:text-foreground transition-colors">Suporte</a>
            </div>
            <div className="text-sm text-muted-foreground text-center md:text-right">
              <div>© 2024 GeoMatrícula. Todos os direitos reservados.</div>
              <div className="mt-1">Desenvolvido por Uriel da Fonseca Fortunato</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
