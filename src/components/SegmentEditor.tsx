import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Segment } from '@/types';
import { Pencil, Check, X, Palette } from 'lucide-react';

interface LineStyle {
  color: string;
  width: number;
  style: 'solid' | 'dashed' | 'dotted';
}

interface SegmentEditorProps {
  segments: Segment[];
  onSegmentsChange: (segments: Segment[]) => void;
}

const colorPresets = [
  { name: 'Teal', value: '#00B4A6' },
  { name: 'Azul', value: '#1a365d' },
  { name: 'Vermelho', value: '#dc2626' },
  { name: 'Verde', value: '#16a34a' },
  { name: 'Laranja', value: '#ea580c' },
  { name: 'Roxo', value: '#9333ea' },
  { name: 'Rosa', value: '#db2777' },
  { name: 'Amarelo', value: '#ca8a04' },
];

const SegmentEditor: React.FC<SegmentEditorProps> = ({ segments, onSegmentsChange }) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedSegment, setEditedSegment] = useState<Partial<Segment> & { customName?: string; lineStyle?: LineStyle }>({});

  const startEditing = (index: number) => {
    const segment = segments[index];
    setEditingIndex(index);
    setEditedSegment({
      ...segment,
      customName: (segment as any).customName || '',
      lineStyle: (segment as any).lineStyle || { color: '#00B4A6', width: 3, style: 'solid' },
    });
  };

  const saveEditing = () => {
    if (editingIndex === null) return;
    
    const updatedSegments = [...segments];
    updatedSegments[editingIndex] = {
      ...updatedSegments[editingIndex],
      ...editedSegment,
    } as Segment;
    
    onSegmentsChange(updatedSegments);
    setEditingIndex(null);
    setEditedSegment({});
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditedSegment({});
  };

  return (
    <div className="space-y-2">
      {segments.map((segment, index) => (
        <div 
          key={segment.index}
          className="glass-card rounded-lg p-3"
        >
          {editingIndex === index ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">Editando P{segment.index}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={saveEditing}>
                    <Check className="w-4 h-4 text-success" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={cancelEditing}>
                    <X className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs">Nome/Descrição</Label>
                  <Input
                    value={editedSegment.customName || ''}
                    onChange={(e) => setEditedSegment(prev => ({ ...prev, customName: e.target.value }))}
                    placeholder="Ex: Divisa com João"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label className="text-xs">Distância (m)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editedSegment.distanceM || segment.distanceM}
                    onChange={(e) => setEditedSegment(prev => ({ ...prev, distanceM: parseFloat(e.target.value) }))}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label className="text-xs">Rumo</Label>
                  <Input
                    value={editedSegment.bearingRaw || segment.bearingRaw}
                    onChange={(e) => setEditedSegment(prev => ({ ...prev, bearingRaw: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label className="text-xs">Cor da Linha</Label>
                  <Select
                    value={editedSegment.lineStyle?.color || '#00B4A6'}
                    onValueChange={(value) => setEditedSegment(prev => ({ 
                      ...prev, 
                      lineStyle: { ...prev.lineStyle!, color: value } 
                    }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorPresets.map(color => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: color.value }} />
                            {color.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-xs">Estilo da Linha</Label>
                  <Select
                    value={editedSegment.lineStyle?.style || 'solid'}
                    onValueChange={(value: 'solid' | 'dashed' | 'dotted') => setEditedSegment(prev => ({ 
                      ...prev, 
                      lineStyle: { ...prev.lineStyle!, style: value } 
                    }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solid">Sólida</SelectItem>
                      <SelectItem value="dashed">Tracejada</SelectItem>
                      <SelectItem value="dotted">Pontilhada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground"
                  style={{ backgroundColor: (segment as any).lineStyle?.color || '#1a365d' }}
                >
                  {segment.index}
                </div>
                <div>
                  <div className="font-medium text-foreground text-sm">
                    {(segment as any).customName || segment.bearingRaw}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {segment.distanceM.toFixed(2)}m • {segment.neighbor || 'Sem confrontante'}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => startEditing(index)}>
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default SegmentEditor;
