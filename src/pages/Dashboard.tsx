import { useState, useEffect } from 'react';
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
  Trash2,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { projectHistory, ProjectHistoryItem } from '@/lib/projectHistory';

const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState<ProjectHistoryItem[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setProjects(projectHistory.getAll());
  }, []);

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.matricula || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.city || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    projectHistory.remove(id);
    setProjects(projectHistory.getAll());
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-card border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-xl text-foreground">GeoMatrícula</span>
            </Link>
          </div>

          <Button 
            variant="hero" 
            onClick={() => navigate('/')}
          >
            <Plus className="w-4 h-4" />
            Novo Projeto
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-6 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Seus Projetos</h1>
          <p className="text-muted-foreground">
            {projects.length > 0 
              ? `${projects.length} projeto(s) processado(s)`
              : 'Nenhum projeto ainda. Processe sua primeira matrícula!'
            }
          </p>
        </div>

        {/* Search */}
        {projects.length > 0 && (
          <div className="relative mb-6 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, matrícula ou cidade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11"
            />
          </div>
        )}

        {/* Projects Grid */}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProjects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={`/project/${project.id}/result`}>
                <div className="glass-card rounded-xl p-5 hover:shadow-lg transition-all group cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={project.status === 'processed' ? 'default' : 'destructive'}>
                        {project.status === 'processed' ? 'Processado' : 'Erro'}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDelete(project.id, e)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <h3 className="font-display font-semibold text-foreground mb-1 group-hover:text-primary transition-colors truncate">
                    {project.title}
                  </h3>
                  
                  {(project.city || project.matricula) && (
                    <p className="text-sm text-muted-foreground mb-2 truncate">
                      {[project.matricula, project.city, project.state].filter(Boolean).join(' • ')}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDate(project.createdAt)}
                    </div>
                    {project.segmentsCount > 0 && (
                      <span>{project.segmentsCount} segmentos</span>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Ver resultado</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}

          {/* New project card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: filteredProjects.length * 0.05 }}
          >
            <button
              onClick={() => navigate('/')}
              className="w-full h-full min-h-[200px] rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-primary"
            >
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                <Plus className="w-6 h-6" />
              </div>
              <span className="font-medium">Processar nova matrícula</span>
            </button>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
