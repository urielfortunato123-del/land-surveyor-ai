import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  MapPin, 
  Plus, 
  Search, 
  FileText, 
  Clock, 
  MoreVertical,
  Folder,
  LogOut,
  Settings,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { mockProjects } from '@/lib/mockData';
import { Project } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const getStatusBadge = (status: Project['status']) => {
  switch (status) {
    case 'ready':
      return <Badge variant="ready">Pronto</Badge>;
    case 'processing':
      return <Badge variant="processing">Processando</Badge>;
    case 'error':
      return <Badge variant="error">Erro</Badge>;
    case 'draft':
      return <Badge variant="secondary">Rascunho</Badge>;
  }
};

const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const filteredProjects = mockProjects.filter(project =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border hidden lg:flex flex-col">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sidebar-primary to-accent flex items-center justify-center">
              <MapPin className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-sidebar-foreground">GeoMatrícula</span>
          </Link>
        </div>

        <nav className="flex-1 px-4">
          <div className="space-y-1">
            <Link 
              to="/dashboard"
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground"
            >
              <Folder className="w-5 h-5" />
              <span className="font-medium">Projetos</span>
            </Link>
            <Link 
              to="/settings"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span>Configurações</span>
            </Link>
          </div>
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-sm font-medium text-sidebar-accent-foreground">JD</span>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-sidebar-foreground">João Demo</div>
              <div className="text-xs text-sidebar-foreground/60">Plano Free</div>
            </div>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground/60 hover:text-sidebar-foreground">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-40 glass-card border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="lg:hidden">
                <MapPin className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">Projetos</h1>
                <p className="text-sm text-muted-foreground">{mockProjects.length} projetos</p>
              </div>
            </div>

            <Button 
              variant="hero" 
              onClick={() => navigate('/project/new')}
            >
              <Plus className="w-4 h-4" />
              Novo Projeto
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {/* Search */}
          <div className="relative mb-6 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Buscar projetos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11"
            />
          </div>

          {/* Projects Grid */}
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProjects.map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link to={`/project/${project.id}`}>
                  <div className="glass-card rounded-xl p-5 hover:shadow-lg transition-all group cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(project.status)}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Renomear</DropdownMenuItem>
                            <DropdownMenuItem>Duplicar</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Excluir</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <h3 className="font-display font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {project.title}
                    </h3>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {project.createdAt.toLocaleDateString('pt-BR')}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Ver detalhes</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}

            {/* Empty state for new project */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: filteredProjects.length * 0.1 }}
            >
              <button
                onClick={() => navigate('/project/new')}
                className="w-full h-full min-h-[200px] rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-primary"
              >
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="font-medium">Criar novo projeto</span>
              </button>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
