// Types for the land registration processing system

export interface User {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'pro';
  createdAt: Date;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  status: 'draft' | 'processing' | 'ready' | 'error';
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: string;
  projectId: string;
  filename: string;
  fileType: 'pdf' | 'jpg' | 'png';
  storageUrl: string;
  extractedText?: string;
  createdAt: Date;
}

export interface Segment {
  index: number;
  bearingRaw: string;
  bearingAzimuth?: number;
  distanceM: number;
  neighbor?: string;
  sourceText: string;
  confidence: number;
  deltaX?: number;
  deltaY?: number;
}

export interface ParcelResult {
  id: string;
  projectId: string;
  segments: Segment[];
  geojson: GeoJSON.Feature | null;
  kmlUrl?: string;
  dxfUrl?: string;
  reportPdfUrl?: string;
  areaDeclared?: number;
  areaComputed: number;
  perimeterComputed: number;
  closureError: number;
  confidenceScore: number;
  warnings: Warning[];
  extractionMethod: 'regex' | 'ai' | 'hybrid';
  createdAt: Date;
}

export interface Warning {
  type: 'closure' | 'area_mismatch' | 'missing_segment' | 'low_confidence' | 'ai_assisted';
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface ProcessingJob {
  id: string;
  projectId: string;
  status: 'queued' | 'running' | 'done' | 'error';
  logs: string[];
  progress: number;
  createdAt: Date;
  finishedAt?: Date;
}

export type QualityLevel = 'green' | 'yellow' | 'red';

export interface QualityIndicator {
  level: QualityLevel;
  closureError: number;
  confidenceScore: number;
  areaDifference?: number;
  message: string;
}
