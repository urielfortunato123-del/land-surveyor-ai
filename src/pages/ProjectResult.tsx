import { useState, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  MapPin, 
  ArrowLeft, 
  Download, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Cpu,
  ChevronDown,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Polygon, CircleMarker, Tooltip, Popup } from 'react-leaflet';
import MapboxMap from '@/components/MapboxMap';
import SegmentEditor from '@/components/SegmentEditor';
import ExportDialog from '@/components/ExportDialog';
import { mockParcelResult, mockSegments, generatePolygonCoordinates, localToLatLng, getQualityIndicator } from '@/lib/mockData';
import { QualityLevel, Segment } from '@/types';
import 'leaflet/dist/leaflet.css';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const QualityIndicatorComponent = ({ level, message }: { level: QualityLevel; message: string }) => {
  const config = {
    green: {
      icon: CheckCircle,
      bgClass: 'bg-success/10',
      borderClass: 'border-success/30',
      iconClass: 'text-success',
      label: 'Válido',
    },
    yellow: {
      icon: AlertTriangle,
      bgClass: 'bg-warning/10',
      borderClass: 'border-warning/30',
      iconClass: 'text-warning',
      label: 'Atenção',
    },
    red: {
      icon: AlertCircle,
      bgClass: 'bg-destructive/10',
      borderClass: 'border-destructive/30',
      iconClass: 'text-destructive',
      label: 'Revisar',
    },
  };

  const { icon: Icon, bgClass, borderClass, iconClass, label } = config[level];

  return (
    <div className={`rounded-xl p-4 border ${bgClass} ${borderClass}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full ${bgClass} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconClass}`} />
        </div>
        <div>
          <div className={`font-semibold ${iconClass}`}>{label}</div>
          <div className="text-sm text-muted-foreground">{message}</div>
        </div>
      </div>
    </div>
  );
};

const ProjectResult = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const result = mockParcelResult;
  const [segments, setSegments] = useState<Segment[]>(mockSegments);
  const quality = getQualityIndicator(result);
  
  // Mapbox token state
  const [mapboxToken, setMapboxToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(true);
  const [useMapbox, setUseMapbox] = useState(false);
  const [showLabels, setShowLabels] = useState(true);

  // Generate polygon coordinates
  const localCoords = generatePolygonCoordinates(segments);
  const mapCoords = localToLatLng(localCoords);
  const center: [number, number] = [
    mapCoords.reduce((sum, c) => sum + c[0], 0) / mapCoords.length,
    mapCoords.reduce((sum, c) => sum + c[1], 0) / mapCoords.length,
  ];

  // For Mapbox, we need lng,lat order
  const mapboxCoords: [number, number][] = mapCoords.map(([lat, lng]) => [lng, lat]);

  const handleApplyToken = () => {
    if (mapboxToken.startsWith('pk.')) {
      setUseMapbox(true);
      setShowTokenInput(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-[1000] glass-card border-b">
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
            <div className="h-6 w-px bg-border mx-2" />
            <h1 className="font-medium text-foreground">Matrícula 12.345 - Fazenda São João</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant={quality.level === 'green' ? 'ready' : quality.level === 'yellow' ? 'warning' : 'error'}>
              {quality.level === 'green' ? 'Pronto' : quality.level === 'yellow' ? 'Atenção' : 'Revisar'}
            </Badge>
            <ExportDialog result={result} segments={segments} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Mapbox Token Input */}
        {showTokenInput && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-xl p-4 mb-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground mb-1">Configurar Mapbox (Opcional)</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Para usar imagens de satélite de alta qualidade, insira seu token público do Mapbox.
                  <a 
                    href="https://account.mapbox.com/access-tokens/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-accent hover:underline ml-1"
                  >
                    Obter token gratuito →
                  </a>
                </p>
                <div className="flex gap-2">
                  <Input
                    value={mapboxToken}
                    onChange={(e) => setMapboxToken(e.target.value)}
                    placeholder="pk.eyJ1Ijoi..."
                    className="max-w-md font-mono text-sm"
                  />
                  <Button onClick={handleApplyToken} disabled={!mapboxToken.startsWith('pk.')}>
                    Aplicar
                  </Button>
                  <Button variant="ghost" onClick={() => setShowTokenInput(false)}>
                    Usar OpenStreetMap
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Map Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]"
          >
            <div className="glass-card rounded-xl overflow-hidden h-full flex flex-col">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">Visualização do Polígono</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowLabels(!showLabels)}
                  >
                    {showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    <span className="ml-1 text-xs">Rótulos</span>
                  </Button>
                  {!showTokenInput && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowTokenInput(true)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex-1 relative min-h-[400px]">
                {useMapbox && mapboxToken ? (
                  <MapboxMap
                    accessToken={mapboxToken}
                    coordinates={mapboxCoords}
                    segments={segments.map(seg => ({
                      index: seg.index,
                      name: (seg as any).customName || `P${seg.index}`,
                      distance: seg.distanceM,
                      bearing: seg.bearingRaw,
                      color: (seg as any).lineStyle?.color,
                      lineWidth: (seg as any).lineStyle?.width,
                      lineStyle: (seg as any).lineStyle?.style,
                    }))}
                    showLabels={showLabels}
                  />
                ) : (
                  <MapContainer
                    center={center}
                    zoom={16}
                    className="w-full h-full"
                    style={{ background: 'hsl(var(--secondary))' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Polygon
                      positions={mapCoords as [number, number][]}
                      pathOptions={{
                        color: 'hsl(175, 60%, 40%)',
                        fillColor: 'hsl(175, 60%, 40%)',
                        fillOpacity: 0.2,
                        weight: 3,
                      }}
                    />
                    {showLabels && mapCoords.slice(0, -1).map((coord, i) => (
                      <CircleMarker
                        key={i}
                        center={coord as [number, number]}
                        radius={8}
                        pathOptions={{
                          color: 'hsl(215, 80%, 25%)',
                          fillColor: 'hsl(215, 80%, 35%)',
                          fillOpacity: 1,
                          weight: 2,
                        }}
                      >
                        <Tooltip permanent direction="top" offset={[0, -10]}>
                          <span className="font-bold">{(segments[i] as any)?.customName || `P${i + 1}`}</span>
                        </Tooltip>
                        <Popup>
                          <div className="text-sm">
                            <strong>Ponto {i + 1}</strong>
                            <br />
                            {segments[i] && (
                              <>
                                <span className="text-muted-foreground">Rumo: </span>
                                {segments[i].bearingRaw}
                                <br />
                                <span className="text-muted-foreground">Dist: </span>
                                {segments[i].distanceM}m
                              </>
                            )}
                          </div>
                        </Popup>
                      </CircleMarker>
                    ))}
                  </MapContainer>
                )}
              </div>
            </div>
          </motion.div>

          {/* Data Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Quality Indicator */}
            <QualityIndicatorComponent level={quality.level} message={quality.message} />

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card rounded-xl p-4">
                <div className="text-sm text-muted-foreground mb-1">Área Calculada</div>
                <div className="font-display text-2xl font-bold text-foreground">
                  {result.areaComputed.toLocaleString('pt-BR')} m²
                </div>
                {result.areaDeclared && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Declarada: {result.areaDeclared.toLocaleString('pt-BR')} m² 
                    <span className={quality.areaDifference && quality.areaDifference > 5 ? 'text-warning' : 'text-success'}>
                      {' '}({quality.areaDifference?.toFixed(2)}% dif.)
                    </span>
                  </div>
                )}
              </div>
              <div className="glass-card rounded-xl p-4">
                <div className="text-sm text-muted-foreground mb-1">Perímetro</div>
                <div className="font-display text-2xl font-bold text-foreground">
                  {result.perimeterComputed.toLocaleString('pt-BR')} m
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {segments.length} segmentos
                </div>
              </div>
              <div className="glass-card rounded-xl p-4">
                <div className="text-sm text-muted-foreground mb-1">Erro de Fechamento</div>
                <div className={`font-display text-2xl font-bold ${
                  result.closureError < 0.5 ? 'text-success' : 
                  result.closureError < 1.0 ? 'text-warning' : 'text-destructive'
                }`}>
                  {result.closureError.toFixed(2)} m
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Tolerância: 0.50m
                </div>
              </div>
              <div className="glass-card rounded-xl p-4">
                <div className="text-sm text-muted-foreground mb-1">Confiança</div>
                <div className={`font-display text-2xl font-bold ${
                  result.confidenceScore >= 80 ? 'text-success' : 
                  result.confidenceScore >= 60 ? 'text-warning' : 'text-destructive'
                }`}>
                  {result.confidenceScore}%
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Cpu className="w-3 h-3" />
                  {result.extractionMethod === 'regex' ? 'Regex' : 
                   result.extractionMethod === 'ai' ? 'IA Assistida' : 'Híbrido'}
                </div>
              </div>
            </div>

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="glass-card rounded-xl p-4 w-full text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      <span className="font-medium text-foreground">
                        {result.warnings.length} Alerta(s)
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 space-y-2">
                    {result.warnings.map((warning, i) => (
                      <div 
                        key={i}
                        className={`rounded-lg p-3 text-sm ${
                          warning.severity === 'error' ? 'bg-destructive/10 text-destructive' :
                          warning.severity === 'warning' ? 'bg-warning/10 text-warning' :
                          'bg-accent/10 text-accent'
                        }`}
                      >
                        {warning.message}
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Segments with Tabs */}
            <div className="glass-card rounded-xl overflow-hidden">
              <Tabs defaultValue="table" className="w-full">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <span className="font-medium text-foreground">Segmentos</span>
                  <TabsList className="h-8">
                    <TabsTrigger value="table" className="text-xs">Tabela</TabsTrigger>
                    <TabsTrigger value="edit" className="text-xs">Editar</TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="table" className="m-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Rumo</TableHead>
                          <TableHead>Distância</TableHead>
                          <TableHead>Confrontante</TableHead>
                          <TableHead className="text-right">Conf.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {segments.map((seg) => (
                          <TableRow key={seg.index}>
                            <TableCell className="font-medium">P{seg.index}</TableCell>
                            <TableCell className="font-mono text-sm">{seg.bearingRaw}</TableCell>
                            <TableCell>{seg.distanceM.toFixed(2)}m</TableCell>
                            <TableCell className="text-muted-foreground max-w-[150px] truncate">
                              {seg.neighbor || '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={seg.confidence >= 0.9 ? 'ready' : seg.confidence >= 0.7 ? 'warning' : 'error'}>
                                {Math.round(seg.confidence * 100)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
                
                <TabsContent value="edit" className="m-0 p-4">
                  <SegmentEditor 
                    segments={segments} 
                    onSegmentsChange={setSegments}
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Quick Downloads */}
            <div className="glass-card rounded-xl p-4">
              <div className="font-medium text-foreground mb-4">Downloads Rápidos</div>
              <div className="grid grid-cols-3 gap-3">
                <Button variant="outline" className="flex-col h-auto py-4">
                  <Download className="w-5 h-5 mb-2" />
                  <span className="text-xs">DXF</span>
                  <span className="text-xs text-muted-foreground">AutoCAD</span>
                </Button>
                <Button variant="outline" className="flex-col h-auto py-4">
                  <Download className="w-5 h-5 mb-2" />
                  <span className="text-xs">KML</span>
                  <span className="text-xs text-muted-foreground">Google Earth</span>
                </Button>
                <Button variant="outline" className="flex-col h-auto py-4">
                  <FileText className="w-5 h-5 mb-2" />
                  <span className="text-xs">GeoJSON</span>
                  <span className="text-xs text-muted-foreground">Web</span>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default ProjectResult;
