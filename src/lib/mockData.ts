import { Project, ParcelResult, Segment, ProcessingJob, QualityIndicator } from '@/types';

// Mock data for demonstration

export const mockProjects: Project[] = [
  {
    id: '1',
    userId: 'user-1',
    title: 'Matrícula 12.345 - Fazenda São João',
    status: 'ready',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    userId: 'user-1',
    title: 'Lote 45 - Condomínio Vale Verde',
    status: 'processing',
    createdAt: new Date('2024-01-18'),
    updatedAt: new Date('2024-01-18'),
  },
  {
    id: '3',
    userId: 'user-1',
    title: 'Imóvel Urbano - Centro',
    status: 'error',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: '4',
    userId: 'user-1',
    title: 'Sítio Recanto - Zona Rural',
    status: 'draft',
    createdAt: new Date('2024-01-22'),
    updatedAt: new Date('2024-01-22'),
  },
];

export const mockSegments: Segment[] = [
  {
    index: 1,
    bearingRaw: "N 35°20' W",
    bearingAzimuth: 324.67,
    distanceM: 45.50,
    neighbor: "Estrada Municipal",
    sourceText: "Pela estrada municipal, rumo N 35°20' W, numa distância de 45,50m",
    confidence: 0.95,
    deltaX: -26.45,
    deltaY: 37.12,
  },
  {
    index: 2,
    bearingRaw: "N 78°15' W",
    bearingAzimuth: 281.75,
    distanceM: 120.00,
    neighbor: "João da Silva",
    sourceText: "Confronta com João da Silva, rumo N 78°15' W, distância 120,00m",
    confidence: 0.92,
    deltaX: -117.52,
    deltaY: 24.36,
  },
  {
    index: 3,
    bearingRaw: "S 45°00' W",
    bearingAzimuth: 225.00,
    distanceM: 85.30,
    neighbor: "Maria Santos",
    sourceText: "Divide com Maria Santos, rumo S 45°00' W, mede 85,30m",
    confidence: 0.88,
    deltaX: -60.31,
    deltaY: -60.31,
  },
  {
    index: 4,
    bearingRaw: "S 12°30' E",
    bearingAzimuth: 167.50,
    distanceM: 95.20,
    neighbor: "Rio Pequeno",
    sourceText: "Pelo Rio Pequeno, S 12°30' E, percorrendo 95,20m",
    confidence: 0.91,
    deltaX: 20.59,
    deltaY: -92.95,
  },
  {
    index: 5,
    bearingRaw: "N 55°40' E",
    bearingAzimuth: 55.67,
    distanceM: 150.00,
    neighbor: "Pedro Oliveira",
    sourceText: "Confrontando com Pedro Oliveira, N 55°40' E, 150,00m",
    confidence: 0.94,
    deltaX: 123.87,
    deltaY: 84.45,
  },
  {
    index: 6,
    bearingRaw: "N 05°10' E",
    bearingAzimuth: 5.17,
    distanceM: 58.75,
    neighbor: "Estrada Municipal",
    sourceText: "Retorna à estrada municipal, N 05°10' E, 58,75m até o ponto inicial",
    confidence: 0.96,
    deltaX: 5.29,
    deltaY: 58.51,
  },
];

// Generate polygon coordinates from segments (simplified calculation)
export const generatePolygonCoordinates = (segments: Segment[]): [number, number][] => {
  let x = 0;
  let y = 0;
  const coords: [number, number][] = [[x, y]];
  
  segments.forEach(seg => {
    x += seg.deltaX || 0;
    y += seg.deltaY || 0;
    coords.push([x, y]);
  });
  
  return coords;
};

// Convert local coordinates to approximate lat/lng
// If a center is provided (from UTM conversion), use it; otherwise default to São Paulo
export const localToLatLng = (
  coords: [number, number][],
  center?: [number, number]
): [number, number][] => {
  const baseLat = center?.[0] ?? -23.5505;
  const baseLng = center?.[1] ?? -46.6333;
  const scale = 0.00001; // Approximate meters to degrees (1m ≈ 0.00001°)
  
  return coords.map(([x, y]) => [
    baseLat + y * scale,
    baseLng + x * scale,
  ]);
};

export const mockParcelResult: ParcelResult = {
  id: 'result-1',
  projectId: '1',
  segments: mockSegments,
  geojson: null,
  kmlUrl: '/downloads/matricula-12345.kml',
  dxfUrl: '/downloads/matricula-12345.dxf',
  reportPdfUrl: '/downloads/relatorio-12345.pdf',
  areaDeclared: 12500,
  areaComputed: 12487.35,
  perimeterComputed: 554.75,
  closureError: 0.23,
  confidenceScore: 92,
  warnings: [
    {
      type: 'area_mismatch',
      message: 'Área calculada difere 0.10% da área declarada',
      severity: 'info',
    },
  ],
  extractionMethod: 'hybrid',
  createdAt: new Date('2024-01-15'),
};

export const mockProcessingJob: ProcessingJob = {
  id: 'job-1',
  projectId: '2',
  status: 'running',
  logs: [
    '[10:30:15] Iniciando processamento...',
    '[10:30:16] Extraindo texto do PDF...',
    '[10:30:18] OCR aplicado - 3 páginas processadas',
    '[10:30:20] Identificando seção de perímetro...',
    '[10:30:22] Extraindo segmentos via regex...',
    '[10:30:24] 4 segmentos encontrados por regex',
    '[10:30:25] Acionando modo IA para 2 trechos...',
  ],
  progress: 65,
  createdAt: new Date(),
};

export const getQualityIndicator = (result: ParcelResult): QualityIndicator => {
  const { closureError, confidenceScore, areaDeclared, areaComputed } = result;
  
  const areaDiff = areaDeclared 
    ? Math.abs((areaComputed - areaDeclared) / areaDeclared * 100)
    : undefined;
  
  if (closureError > 1.0 || confidenceScore < 60 || (areaDiff && areaDiff > 10)) {
    return {
      level: 'red',
      closureError,
      confidenceScore,
      areaDifference: areaDiff,
      message: 'Resultado requer revisão manual - inconsistências detectadas',
    };
  }
  
  if (closureError > 0.5 || confidenceScore < 80 || (areaDiff && areaDiff > 5)) {
    return {
      level: 'yellow',
      closureError,
      confidenceScore,
      areaDifference: areaDiff,
      message: 'Resultado aceitável com ressalvas - verifique os alertas',
    };
  }
  
  return {
    level: 'green',
    closureError,
    confidenceScore,
    areaDifference: areaDiff,
    message: 'Extração bem-sucedida - polígono válido',
  };
};
