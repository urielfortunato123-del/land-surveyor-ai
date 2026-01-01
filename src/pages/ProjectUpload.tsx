import { useState, useCallback, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  MapPin, 
  ArrowLeft, 
  Upload, 
  FileText, 
  X, 
  Play,
  Loader2,
  Check,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { aiMatriculaApi } from '@/lib/api/ai-matricula';
import { extractedDataStore } from '@/lib/extractedDataStore';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
}

const ProjectUpload = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projectName, setProjectName] = useState(id === 'new' ? '' : 'Matrícula 12.345');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLogs, setProcessingLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    const newFiles: UploadedFile[] = droppedFiles.map((file, i) => ({
      id: `file-${Date.now()}-${i}`,
      name: file.name,
      size: file.size,
      type: file.type,
      file: file,
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
    toast({
      title: 'Arquivos adicionados',
      description: `${droppedFiles.length} arquivo(s) adicionado(s)`,
    });
  }, [toast]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;
    
    const newFiles: UploadedFile[] = Array.from(selectedFiles).map((file, i) => ({
      id: `file-${Date.now()}-${i}`,
      name: file.name,
      size: file.size,
      type: file.type,
      file: file,
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    setProcessingLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const startProcessing = async () => {
    if (files.length === 0) {
      toast({
        title: 'Nenhum arquivo',
        description: 'Adicione pelo menos um arquivo para processar',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setProcessingLogs([]);
    setProgress(0);

    const projectId = id === 'new' ? `proj-${Date.now()}` : id || '1';

    try {
      addLog('Iniciando processamento...');
      setProgress(10);

      // Convert first image/PDF to base64
      const firstFile = files[0];
      addLog(`Lendo arquivo: ${firstFile.name}...`);
      
      const base64Data = await fileToBase64(firstFile.file);
      setProgress(25);
      addLog('Arquivo convertido para processamento');

      // Call AI extraction
      addLog('Enviando para análise com IA (Gemini Pro Vision)...');
      setProgress(35);

      const response = await aiMatriculaApi.extractFromImage(base64Data);
      setProgress(70);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Falha na extração de dados');
      }

      addLog('Dados extraídos com sucesso!');
      
      const extractedData = response.data;
      
      // Log what was found
      if (extractedData.matricula) {
        addLog(`Matrícula: ${extractedData.matricula}`);
      }
      if (extractedData.segments && extractedData.segments.length > 0) {
        addLog(`${extractedData.segments.length} segmentos encontrados`);
      } else {
        addLog('⚠️ Nenhum segmento geométrico encontrado');
        addLog('Esta matrícula pode ser de imóvel urbano sem memorial descritivo');
      }
      
      setProgress(85);

      // Store extracted data
      extractedDataStore.save(projectId, {
        title: projectName || `Matrícula ${extractedData.matricula || 'Nova'}`,
        extractedData: {
          matricula: extractedData.matricula,
          owner: extractedData.owner,
          registryOffice: extractedData.registryOffice,
          city: extractedData.city,
          state: extractedData.state,
          areaDeclared: extractedData.areaDeclared,
          perimeterDeclared: extractedData.perimeterDeclared,
          segments: extractedData.segments || [],
        },
      });

      addLog('Dados salvos no sistema');
      setProgress(100);

      toast({
        title: 'Processamento concluído!',
        description: extractedData.segments?.length 
          ? `${extractedData.segments.length} segmentos extraídos`
          : 'Dados básicos extraídos (sem segmentos geométricos)',
      });

      setTimeout(() => {
        navigate(`/project/${projectId}/result`);
      }, 1500);

    } catch (error) {
      console.error('Processing error:', error);
      addLog(`❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      
      toast({
        title: 'Erro no processamento',
        description: error instanceof Error ? error.message : 'Tente novamente',
        variant: 'destructive',
      });
      
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-card border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <MapPin className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-lg text-foreground">GeoMatrícula</span>
            </Link>
          </div>
          
          <Badge variant="secondary">
            {id === 'new' ? 'Novo Projeto' : 'Editando'}
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Project Name */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-foreground mb-2">
              Nome do Projeto
            </label>
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Ex: Matrícula 12.345 - Fazenda São João"
              className="text-lg"
            />
          </div>

          {/* Upload Area */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-foreground mb-2">
              Arquivos da Matrícula
            </label>
            
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`
                relative rounded-xl border-2 border-dashed p-12 text-center transition-all
                ${isDragging 
                  ? 'border-accent bg-accent/5' 
                  : 'border-border hover:border-primary/50 hover:bg-primary/5'
                }
              `}
            >
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              
              <div className="flex flex-col items-center gap-4">
                <div className={`
                  w-16 h-16 rounded-full flex items-center justify-center transition-colors
                  ${isDragging ? 'bg-accent/20' : 'bg-secondary'}
                `}>
                  <Upload className={`w-8 h-8 ${isDragging ? 'text-accent' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">
                    Arraste arquivos aqui ou clique para selecionar
                  </p>
                  <p className="text-sm text-muted-foreground">
                    PDF, JPG ou PNG • Máximo 50MB por arquivo
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* File List */}
          <AnimatePresence>
            {files.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-foreground">
                    {files.length} arquivo(s) selecionado(s)
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setFiles([])}
                    className="text-muted-foreground"
                  >
                    Limpar todos
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {files.map((file) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="glass-card rounded-lg p-4 flex items-center gap-4"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{file.name}</p>
                        <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(file.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Processing Section */}
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="glass-card rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  {progress < 100 ? (
                    <Loader2 className="w-5 h-5 text-accent animate-spin" />
                  ) : (
                    <Check className="w-5 h-5 text-success" />
                  )}
                  <span className="font-medium text-foreground">
                    {progress < 100 ? 'Processando...' : 'Concluído!'}
                  </span>
                  <span className="text-sm text-muted-foreground ml-auto">
                    {Math.round(progress)}%
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="h-2 bg-secondary rounded-full overflow-hidden mb-4">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                {/* Logs */}
                <div className="bg-sidebar rounded-lg p-4 font-mono text-sm max-h-48 overflow-y-auto">
                  {processingLogs.map((log, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sidebar-foreground/80"
                    >
                      {log}
                    </motion.div>
                  ))}
                  {progress < 100 && (
                    <div className="flex items-center gap-2 text-accent">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Aguardando...</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Cancelar
            </Button>
            
            <Button 
              variant="hero" 
              size="lg"
              onClick={startProcessing}
              disabled={isProcessing || files.length === 0}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Processar Matrícula
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default ProjectUpload;
