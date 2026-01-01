import { supabase } from '@/integrations/supabase/client';

export interface ExtractedData {
  matricula?: string;
  owner?: string;
  registryOffice?: string;
  city?: string;
  state?: string;
  areaDeclared?: number;
  perimeterDeclared?: number;
  segments?: Array<{
    index: number;
    bearingRaw: string;
    distanceM: number;
    confrontation?: string;
  }>;
}

export interface ValidationResult {
  isValid: boolean;
  closureErrorEstimate?: number;
  issues?: Array<{
    segmentIndex: number;
    type: 'bearing' | 'distance' | 'closure';
    message: string;
    suggestedValue?: string | number;
  }>;
  suggestions?: string[];
}

export interface DrawingInstructions {
  vertices: Array<{ name: string; x: number; y: number }>;
  dxfCommands: string[];
  layers: Array<{ name: string; color: number; lineType: string }>;
  annotations: Array<{ text: string; x: number; y: number; rotation: number }>;
}

export interface Segment {
  index: number;
  bearingRaw: string;
  distanceM: number;
  startPoint?: string;
  endPoint?: string;
  confrontation?: string;
}

export interface PropertyData {
  matricula?: string;
  owner?: string;
  area?: number;
  perimeter?: number;
  closureError?: number;
  city?: string;
  state?: string;
  registryOffice?: string;
}

type AIResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

async function callAI<T>(body: Record<string, unknown>): Promise<AIResponse<T>> {
  const { data, error } = await supabase.functions.invoke('ai-matricula', {
    body,
  });

  if (error) {
    console.error('AI function error:', error);
    return { success: false, error: error.message };
  }

  return data;
}

export const aiMatriculaApi = {
  /**
   * Extract data from an image (OCR + NLP)
   */
  async extractFromImage(imageBase64: string): Promise<AIResponse<ExtractedData>> {
    return callAI<ExtractedData>({
      action: 'extract',
      imageBase64,
    });
  },

  /**
   * Extract data from document text
   */
  async extractFromText(documentText: string): Promise<AIResponse<ExtractedData>> {
    return callAI<ExtractedData>({
      action: 'extract',
      documentText,
    });
  },

  /**
   * Validate segments and suggest corrections
   */
  async validateSegments(segments: Segment[]): Promise<AIResponse<ValidationResult>> {
    return callAI<ValidationResult>({
      action: 'validate',
      segments,
    });
  },

  /**
   * Generate technical report
   */
  async generateReport(segments: Segment[], propertyData: PropertyData): Promise<AIResponse<string>> {
    return callAI<string>({
      action: 'generate-report',
      segments,
      propertyData,
    });
  },

  /**
   * Generate drawing instructions for DXF/DWG
   */
  async generateDrawingInstructions(segments: Segment[]): Promise<AIResponse<DrawingInstructions>> {
    return callAI<DrawingInstructions>({
      action: 'generate-drawing',
      segments,
    });
  },
};
