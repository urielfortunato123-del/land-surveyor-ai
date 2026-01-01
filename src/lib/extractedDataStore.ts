// Store for extracted data from AI processing
// This is a simple in-memory store. In production, you'd use Supabase.

import { Segment, ParcelResult, Warning } from '@/types';

export interface ExtractedMatriculaData {
  matricula?: string;
  owner?: string;
  registryOffice?: string;
  city?: string;
  state?: string;
  areaDeclared?: number;
  perimeterDeclared?: number;
  segments: Array<{
    index: number;
    bearingRaw: string;
    distanceM: number;
    confrontation?: string;
  }>;
}

interface ProjectData {
  id: string;
  title: string;
  extractedData: ExtractedMatriculaData | null;
  processedAt: Date;
  rawImages?: string[];
}

// In-memory store (temporary - replace with Supabase in production)
const projectStore: Map<string, ProjectData> = new Map();

export const extractedDataStore = {
  save(projectId: string, data: Partial<ProjectData>) {
    const existing = projectStore.get(projectId);
    projectStore.set(projectId, {
      id: projectId,
      title: data.title || existing?.title || '',
      extractedData: data.extractedData ?? existing?.extractedData ?? null,
      processedAt: new Date(),
      rawImages: data.rawImages || existing?.rawImages,
    });
  },

  get(projectId: string): ProjectData | undefined {
    return projectStore.get(projectId);
  },

  getExtractedData(projectId: string): ExtractedMatriculaData | null {
    return projectStore.get(projectId)?.extractedData ?? null;
  },

  // Convert extracted segments to the app's Segment type
  toSegments(data: ExtractedMatriculaData): Segment[] {
    return data.segments.map((seg, i) => {
      // Parse bearing to azimuth (simplified - proper parsing needed)
      const azimuth = parseBearingToAzimuth(seg.bearingRaw);
      const deltaX = seg.distanceM * Math.sin(azimuth * Math.PI / 180);
      const deltaY = seg.distanceM * Math.cos(azimuth * Math.PI / 180);

      return {
        index: seg.index || i + 1,
        bearingRaw: seg.bearingRaw,
        bearingAzimuth: azimuth,
        distanceM: seg.distanceM,
        neighbor: seg.confrontation || '',
        sourceText: '',
        confidence: 0.9,
        deltaX,
        deltaY,
      };
    });
  },

  // Generate a ParcelResult from extracted data
  toParcelResult(projectId: string, data: ExtractedMatriculaData): ParcelResult {
    const segments = this.toSegments(data);
    
    // Calculate area and perimeter from segments
    const perimeter = segments.reduce((sum, s) => sum + s.distanceM, 0);
    const area = calculatePolygonArea(segments);
    const closureError = calculateClosureError(segments);

    return {
      id: `result-${projectId}`,
      projectId,
      segments,
      geojson: null,
      kmlUrl: '',
      dxfUrl: '',
      reportPdfUrl: '',
      areaDeclared: data.areaDeclared || area,
      areaComputed: area,
      perimeterComputed: perimeter,
      closureError,
      confidenceScore: calculateConfidence(closureError, data.areaDeclared, area),
      warnings: generateWarnings(closureError, data.areaDeclared, area),
      extractionMethod: 'ai',
      createdAt: new Date(),
    };
  },
};

// Helper functions
function parseBearingToAzimuth(bearing: string): number {
  // Parse bearings like "N 45°30' W", "S 30°15' E", etc.
  const match = bearing.match(/([NS])\s*(\d+)[°]?\s*(\d+)?['′]?\s*(\d+)?["″]?\s*([EW])/i);
  
  if (!match) {
    // Try Az format: "Az 125°45'30\""
    const azMatch = bearing.match(/Az\.?\s*(\d+)[°]?\s*(\d+)?['′]?\s*(\d+)?["″]?/i);
    if (azMatch) {
      const deg = parseFloat(azMatch[1]);
      const min = parseFloat(azMatch[2] || '0');
      const sec = parseFloat(azMatch[3] || '0');
      return deg + min / 60 + sec / 3600;
    }
    return 0;
  }

  const ns = match[1].toUpperCase();
  const deg = parseFloat(match[2]);
  const min = parseFloat(match[3] || '0');
  const sec = parseFloat(match[4] || '0');
  const ew = match[5].toUpperCase();

  const angle = deg + min / 60 + sec / 3600;

  // Convert quadrant bearing to azimuth
  if (ns === 'N' && ew === 'E') return angle;
  if (ns === 'N' && ew === 'W') return 360 - angle;
  if (ns === 'S' && ew === 'E') return 180 - angle;
  if (ns === 'S' && ew === 'W') return 180 + angle;

  return 0;
}

function calculatePolygonArea(segments: Segment[]): number {
  // Calculate area using the Shoelace formula
  let x = 0, y = 0;
  const vertices: [number, number][] = [[0, 0]];
  
  for (const seg of segments) {
    x += seg.deltaX || 0;
    y += seg.deltaY || 0;
    vertices.push([x, y]);
  }

  let area = 0;
  for (let i = 0; i < vertices.length - 1; i++) {
    area += vertices[i][0] * vertices[i + 1][1];
    area -= vertices[i + 1][0] * vertices[i][1];
  }

  return Math.abs(area / 2);
}

function calculateClosureError(segments: Segment[]): number {
  let x = 0, y = 0;
  for (const seg of segments) {
    x += seg.deltaX || 0;
    y += seg.deltaY || 0;
  }
  return Math.sqrt(x * x + y * y);
}

function calculateConfidence(closureError: number, areaDeclared?: number, areaComputed?: number): number {
  let confidence = 95;
  
  // Penalize for closure error
  if (closureError > 0.5) confidence -= 10;
  if (closureError > 1.0) confidence -= 15;
  if (closureError > 2.0) confidence -= 20;
  
  // Penalize for area mismatch
  if (areaDeclared && areaComputed) {
    const diff = Math.abs((areaComputed - areaDeclared) / areaDeclared * 100);
    if (diff > 5) confidence -= 10;
    if (diff > 10) confidence -= 15;
  }

  return Math.max(50, confidence);
}

function generateWarnings(closureError: number, areaDeclared?: number, areaComputed?: number): Warning[] {
  const warnings: Warning[] = [];

  if (closureError > 1.0) {
    warnings.push({
      type: 'closure',
      message: `Erro de fechamento alto: ${closureError.toFixed(2)}m`,
      severity: closureError > 2.0 ? 'error' : 'warning',
    });
  }

  if (areaDeclared && areaComputed) {
    const diff = Math.abs((areaComputed - areaDeclared) / areaDeclared * 100);
    if (diff > 1) {
      warnings.push({
        type: 'area_mismatch',
        message: `Área calculada difere ${diff.toFixed(2)}% da área declarada`,
        severity: diff > 10 ? 'error' : diff > 5 ? 'warning' : 'info',
      });
    }
  }

  return warnings;
}
