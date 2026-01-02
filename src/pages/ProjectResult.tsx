import { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Eye,
  EyeOff,
  Info,
  Navigation,
  Loader2,
  Search
} from 'lucide-react';
import { useGeocoding } from '@/hooks/useGeocoding';
import { motion } from 'framer-motion';
import OSMMap from '@/components/OSMMap';
import { MapErrorBoundary } from '@/components/MapErrorBoundary';
import SegmentEditor from '@/components/SegmentEditor';
import ExportDialog from '@/components/ExportDialog';
import LocationSearch from '@/components/LocationSearch';
import { AIAssistantChat } from '@/components/AIAssistantChat';
import { generatePolygonCoordinates, localToLatLng, getQualityIndicator } from '@/lib/mockData';
import { extractedDataStore } from '@/lib/extractedDataStore';
import { QualityLevel, Segment, ParcelResult } from '@/types';
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

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
  
  // Get real extracted data or null
  const extractedData = useMemo(() => {
    return id ? extractedDataStore.getExtractedData(id) : null;
  }, [id]);

  // Get georeferenced location from UTM coordinates
  const geoLocation = useMemo(() => {
    return id ? extractedDataStore.getGeoLocation(id) : null;
  }, [id]);

  // Generate result from extracted data or show empty state
  // For urban properties, check if we have dimensions instead of segments
  const result: ParcelResult | null = useMemo(() => {
    if (!extractedData) return null;
    
    // Check if it's an urban property with dimensions
    const hasUrbanDimensions = extractedData.propertyType === 'urbano' && 
      extractedData.urbanDimensions && 
      (extractedData.urbanDimensions.front || extractedData.urbanDimensions.rightSide);
    
    // Check if it has rural segments
    const hasRuralSegments = extractedData.segments?.length > 0;
    
    if (!hasUrbanDimensions && !hasRuralSegments) {
      return null;
    }
    
    return extractedDataStore.toParcelResult(id || '1', extractedData);
  }, [extractedData, id]);

  const [segments, setSegments] = useState<Segment[]>([]);
  
  useEffect(() => {
    if (result?.segments) {
      setSegments(result.segments);
    }
  }, [result]);

  const quality = result ? getQualityIndicator(result) : null;
  
  const [showLabels, setShowLabels] = useState(true);
  
  // Geocoding state for "Ver no Mapa"
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [geocodedLocation, setGeocodedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { geocodeAddress, isLoading: isGeocoding } = useGeocoding();

  // Manual location override state
  const [manualLocation, setManualLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [manualLocationAddress, setManualLocationAddress] = useState<string>('');

  // Determine the active location (priority: manual > geocoded > geoLocation from UTM)
  const activeLocation = manualLocation || geocodedLocation || geoLocation;

  // Build address string for display
  const currentAddressDisplay = manualLocationAddress || 
    (extractedData ? [
      extractedData.propertyAddress,
      extractedData.neighborhood,
      extractedData.city,
      extractedData.state
    ].filter(Boolean).join(', ') : '');

  // Use active location or default
  const propertyCenter: [number, number] = activeLocation 
    ? [activeLocation.lat, activeLocation.lng]
    : [-23.5505, -46.6333]; // Default São Paulo

  // Generate polygon coordinates relative to the property center
  const localCoords = generatePolygonCoordinates(segments);
  // Offset the polygon to the real location if we have a location
  const mapCoords = localToLatLng(localCoords, activeLocation ? propertyCenter : undefined);
  
  const center: [number, number] = activeLocation 
    ? propertyCenter 
    : (mapCoords.length
      ? [
          mapCoords.reduce((sum, c) => sum + c[0], 0) / mapCoords.length,
          mapCoords.reduce((sum, c) => sum + c[1], 0) / mapCoords.length,
        ]
      : [-23.5505, -46.6333]);
  
  // Handle manual location change
  const handleLocationChange = (location: { lat: number; lng: number }, address: string) => {
    setManualLocation(location);
    setManualLocationAddress(address);
  };

  // Handle "Ver no Mapa" - geocode address and show map at location
  const handleViewOnMap = async () => {
    if (!extractedData) return;
    
    // Build address string from extracted data
    const addressParts = [
      extractedData.city,
      extractedData.state,
      'Brasil'
    ].filter(Boolean);
    
    const address = addressParts.join(', ');
    
    if (address === 'Brasil') {
      // No address data available
      return;
    }
    
    const location = await geocodeAddress(address);
    if (location) {
      setGeocodedLocation({ lat: location.lat, lng: location.lng });
      setShowLocationMap(true);
    }
  };

  // Check if we have any geometric data (rural segments or urban dimensions)
  const hasGeometricData = result !== null;

  // If no geometric data, show info message with extracted property data
  if (!hasGeometricData) {
    return (
      <div className="min-h-screen bg-background">
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
            </div>
          </div>
        </header>

        <main className="container mx-auto px-6 py-8 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Alert className="mb-6">
              <Info className="h-4 w-4" />
              <AlertTitle>Matrícula sem dados geométricos mensuráveis</AlertTitle>
              <AlertDescription>
                {extractedData ? (
                  <>
                    <p className="mb-4">
                      A matrícula foi processada como <strong>{extractedData.propertyType === 'urbano' ? 'imóvel urbano' : 'imóvel'}</strong>, 
                      mas não foram encontrados dados suficientes para desenhar o polígono (rumos, azimutes, distâncias ou dimensões).
                    </p>
                    
                    {extractedData.matricula && (
                      <div className="glass-card rounded-lg p-4 mb-4">
                        <h3 className="font-semibold mb-2">Dados extraídos:</h3>
                        <dl className="space-y-1 text-sm">
                          <div className="flex"><dt className="font-medium w-32">Matrícula:</dt><dd>{extractedData.matricula}</dd></div>
                          {extractedData.propertyType && <div className="flex"><dt className="font-medium w-32">Tipo:</dt><dd className="capitalize">{extractedData.propertyType}</dd></div>}
                          {extractedData.owner && <div className="flex"><dt className="font-medium w-32">Proprietário:</dt><dd>{extractedData.owner}</dd></div>}
                          {extractedData.registryOffice && <div className="flex"><dt className="font-medium w-32">Cartório:</dt><dd>{extractedData.registryOffice}</dd></div>}
                          {extractedData.city && <div className="flex"><dt className="font-medium w-32">Cidade:</dt><dd>{extractedData.city}{extractedData.state ? ` - ${extractedData.state}` : ''}</dd></div>}
                          {extractedData.areaDeclared && <div className="flex"><dt className="font-medium w-32">Área:</dt><dd>{extractedData.areaDeclared.toLocaleString('pt-BR')} m²</dd></div>}
                        </dl>
                      </div>
                    )}
                    
                    <p className="text-muted-foreground">
                      Isso geralmente acontece com matrículas que contêm apenas histórico de transações sem descrição geométrica detalhada.
                    </p>
                  </>
                ) : (
                  <p>Nenhum dado foi processado. Por favor, faça o upload de uma matrícula primeiro.</p>
                )}
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button onClick={() => navigate('/project/new')}>
                Processar nova matrícula
              </Button>
              
              {extractedData?.city && (
                <Button 
                  variant="outline" 
                  onClick={handleViewOnMap}
                  disabled={isGeocoding}
                >
                  {isGeocoding ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Navigation className="w-4 h-4 mr-2" />
                  )}
                  Ver no Mapa
                </Button>
              )}
            </div>
            
            {/* Location Map Dialog for properties without geometric data */}
            {showLocationMap && geocodedLocation && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6"
              >
                <div className="glass-card rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-accent" />
                      <span className="font-medium">Localização: {extractedData?.city}{extractedData?.state ? `, ${extractedData.state}` : ''}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setShowLocationMap(false)}>
                      Fechar
                    </Button>
                  </div>
                  <div className="h-[400px]">
                    <MapErrorBoundary>
                      <OSMMap
                        coordinates={[]}
                        center={[geocodedLocation.lat, geocodedLocation.lng]}
                        zoom={15}
                        markerOnly
                      />
                    </MapErrorBoundary>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </main>
      </div>
    );
  }

  const projectTitle = extractedData.matricula 
    ? `Matrícula ${extractedData.matricula}${extractedData.city ? ` - ${extractedData.city}` : ''}`
    : 'Projeto';

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
            <h1 className="font-medium text-foreground">{projectTitle}</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {extractedData?.city && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleViewOnMap}
                disabled={isGeocoding}
              >
                {isGeocoding ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4 mr-1" />
                )}
                Ver no Mapa
              </Button>
            )}
            <Badge variant={quality?.level === 'green' ? 'ready' : quality?.level === 'yellow' ? 'warning' : 'error'}>
              {quality?.level === 'green' ? 'Pronto' : quality?.level === 'yellow' ? 'Atenção' : 'Revisar'}
            </Badge>
            <ExportDialog result={result} segments={segments} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">

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
                </div>
              </div>
              <div className="flex-1 relative min-h-[400px]">
                <MapErrorBoundary>
                  <OSMMap
                    coordinates={mapCoords as [number, number][]}
                    segments={segments.map(seg => ({
                      index: seg.index,
                      name: (seg as any).customName || `P${seg.index}`,
                      distance: seg.distanceM,
                      bearing: seg.bearingRaw,
                    }))}
                    center={center}
                    showLabels={showLabels}
                  />
                </MapErrorBoundary>
              </div>
              
              {/* Location Search */}
              <LocationSearch
                currentLocation={activeLocation}
                currentAddress={currentAddressDisplay}
                onLocationChange={handleLocationChange}
              />
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
      
      {/* AI Assistant Chat */}
      {result && (
        <AIAssistantChat
          segments={segments}
          projectId={id}
          propertyData={{
            matricula: extractedData?.matricula,
            owner: extractedData?.owner,
            city: extractedData?.city,
            state: extractedData?.state,
            area: result.areaComputed,
            closureError: result.closureError
          }}
          onSegmentsUpdate={(updatedSegments) => {
            // Update segments state and recalculate
            setSegments(updatedSegments);
          }}
        />
      )}
    </div>
  );
};

export default ProjectResult;
