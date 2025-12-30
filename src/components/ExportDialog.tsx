import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Download, 
  FileText, 
  FileType, 
  FileCode, 
  Loader2,
  Eye
} from 'lucide-react';
import { ParcelResult, Segment } from '@/types';
import { generateTechnicalReportHTML, downloadReportAsPDF, downloadReportAsHTML } from '@/lib/reportGenerator';
import { useToast } from '@/hooks/use-toast';

interface ExportDialogProps {
  result: ParcelResult;
  segments: Segment[];
  mapImageBase64?: string;
}

const brazilianStates = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 
  'SP', 'SE', 'TO'
];

const ExportDialog: React.FC<ExportDialogProps> = ({ result, segments, mapImageBase64 }) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [projectInfo, setProjectInfo] = useState({
    projectName: 'Matrícula 12.345 - Fazenda São João',
    matriculaNumber: '12.345',
    ownerName: '',
    propertyAddress: '',
    city: 'São Paulo',
    state: 'SP',
    registryOffice: '',
    technicalResponsible: '',
    crea: '',
    observations: '',
  });

  const handleExport = async (format: 'pdf' | 'html' | 'docx' | 'dxf') => {
    setIsGenerating(true);
    
    try {
      const html = generateTechnicalReportHTML({
        projectInfo: {
          ...projectInfo,
          analysisDate: new Date(),
        },
        result,
        segments,
        mapImageBase64,
      });

      if (format === 'pdf') {
        await downloadReportAsPDF(html, `laudo-${projectInfo.matriculaNumber || 'tecnico'}.pdf`);
        toast({
          title: 'PDF gerado!',
          description: 'A janela de impressão foi aberta. Salve como PDF.',
        });
      } else if (format === 'html') {
        downloadReportAsHTML(html, `laudo-${projectInfo.matriculaNumber || 'tecnico'}.html`);
        toast({
          title: 'HTML baixado!',
          description: 'Arquivo salvo com sucesso.',
        });
      } else if (format === 'docx') {
        // For DOCX, we'd need a library like docx or use an API
        toast({
          title: 'Em desenvolvimento',
          description: 'Exportação DOCX será implementada com Cloud.',
        });
      } else if (format === 'dxf') {
        toast({
          title: 'Em desenvolvimento',
          description: 'Exportação DXF/DWG será implementada com Cloud.',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível gerar o arquivo.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = () => {
    const html = generateTechnicalReportHTML({
      projectInfo: {
        ...projectInfo,
        analysisDate: new Date(),
      },
      result,
      segments,
      mapImageBase64,
    });

    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write(html);
      previewWindow.document.close();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="hero" size="lg">
          <Download className="w-5 h-5" />
          Gerar Laudo Técnico
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Exportar Laudo Técnico</DialogTitle>
          <DialogDescription>
            Preencha as informações do projeto para gerar o laudo completo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Project Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nome do Projeto</Label>
              <Input
                value={projectInfo.projectName}
                onChange={(e) => setProjectInfo(prev => ({ ...prev, projectName: e.target.value }))}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Nº da Matrícula</Label>
              <Input
                value={projectInfo.matriculaNumber}
                onChange={(e) => setProjectInfo(prev => ({ ...prev, matriculaNumber: e.target.value }))}
                placeholder="Ex: 12.345"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Cartório de Registro</Label>
              <Input
                value={projectInfo.registryOffice}
                onChange={(e) => setProjectInfo(prev => ({ ...prev, registryOffice: e.target.value }))}
                placeholder="Ex: 1º Ofício de Registro"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Proprietário</Label>
              <Input
                value={projectInfo.ownerName}
                onChange={(e) => setProjectInfo(prev => ({ ...prev, ownerName: e.target.value }))}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Endereço do Imóvel</Label>
              <Input
                value={projectInfo.propertyAddress}
                onChange={(e) => setProjectInfo(prev => ({ ...prev, propertyAddress: e.target.value }))}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Cidade</Label>
              <Input
                value={projectInfo.city}
                onChange={(e) => setProjectInfo(prev => ({ ...prev, city: e.target.value }))}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Estado</Label>
              <Select
                value={projectInfo.state}
                onValueChange={(value) => setProjectInfo(prev => ({ ...prev, state: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {brazilianStates.map(state => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Technical Responsible */}
          <div className="border-t pt-4">
            <h3 className="font-medium text-foreground mb-3">Responsável Técnico</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome</Label>
                <Input
                  value={projectInfo.technicalResponsible}
                  onChange={(e) => setProjectInfo(prev => ({ ...prev, technicalResponsible: e.target.value }))}
                  placeholder="Eng. João da Silva"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>CREA/CAU</Label>
                <Input
                  value={projectInfo.crea}
                  onChange={(e) => setProjectInfo(prev => ({ ...prev, crea: e.target.value }))}
                  placeholder="CREA-SP 123456"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Observations */}
          <div>
            <Label>Observações Adicionais</Label>
            <Textarea
              value={projectInfo.observations}
              onChange={(e) => setProjectInfo(prev => ({ ...prev, observations: e.target.value }))}
              placeholder="Informações extras para incluir no laudo..."
              className="mt-1"
              rows={3}
            />
          </div>

          {/* Export Options */}
          <div className="border-t pt-4">
            <h3 className="font-medium text-foreground mb-3">Formato de Exportação</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => handleExport('pdf')}
                disabled={isGenerating}
              >
                <FileText className="w-6 h-6 text-destructive" />
                <div>
                  <div className="font-medium">PDF</div>
                  <div className="text-xs text-muted-foreground">Laudo completo</div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => handleExport('docx')}
                disabled={isGenerating}
              >
                <FileType className="w-6 h-6 text-primary" />
                <div>
                  <div className="font-medium">Word</div>
                  <div className="text-xs text-muted-foreground">Editável (DOCX)</div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => handleExport('dxf')}
                disabled={isGenerating}
              >
                <FileCode className="w-6 h-6 text-accent" />
                <div>
                  <div className="font-medium">DXF/DWG</div>
                  <div className="text-xs text-muted-foreground">AutoCAD</div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={handlePreview}
                disabled={isGenerating}
              >
                <Eye className="w-6 h-6 text-muted-foreground" />
                <div>
                  <div className="font-medium">Visualizar</div>
                  <div className="text-xs text-muted-foreground">Preview do laudo</div>
                </div>
              </Button>
            </div>
          </div>
        </div>

        {isGenerating && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
            <span className="ml-2 text-muted-foreground">Gerando arquivo...</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExportDialog;
