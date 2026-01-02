import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Segment {
  index: number;
  bearingRaw: string;
  bearingAzimuth?: number;
  distanceM: number;
  confrontation?: string;
  deltaX?: number;
  deltaY?: number;
}

interface FileAttachment {
  name: string;
  type: string;
  base64: string;
}

interface RequestBody {
  message: string;
  segments: Segment[];
  propertyData: {
    matricula?: string;
    owner?: string;
    city?: string;
    state?: string;
    area?: number;
    closureError?: number;
  };
  conversationHistory: Array<{ role: string; content: string }>;
  fileAttachment?: FileAttachment;
}

// Function to extract text from PDF using basic parsing
// This extracts readable text content from PDF structure
function extractPdfText(base64Data: string): string {
  try {
    // Decode base64 to string
    const binaryString = atob(base64Data);
    
    // Simple PDF text extraction - look for text between BT and ET markers
    // and extract text from Tj, TJ, ' operators
    const textParts: string[] = [];
    
    // Try to find text streams in the PDF
    // Look for patterns like (text)Tj or [(text)]TJ
    const tjPattern = /\(([^)]*)\)\s*Tj/g;
    const tjArrayPattern = /\[([^\]]*)\]\s*TJ/g;
    const textPattern = /BT[\s\S]*?ET/g;
    
    // Extract from text blocks
    const textBlocks = binaryString.match(textPattern) || [];
    for (const block of textBlocks) {
      // Get text from Tj operator
      let match;
      while ((match = tjPattern.exec(block)) !== null) {
        const text = match[1]
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '')
          .replace(/\\t/g, ' ')
          .replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')')
          .replace(/\\\\/g, '\\');
        if (text.trim()) {
          textParts.push(text);
        }
      }
      
      // Get text from TJ operator (arrays)
      while ((match = tjArrayPattern.exec(block)) !== null) {
        const arrayContent = match[1];
        const innerParts = arrayContent.match(/\(([^)]*)\)/g) || [];
        for (const part of innerParts) {
          const text = part.slice(1, -1)
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '')
            .replace(/\\t/g, ' ');
          if (text.trim()) {
            textParts.push(text);
          }
        }
      }
    }
    
    // Also try to find FlateDecode streams and extract any readable text
    // Look for patterns that might contain coordinates and measurements
    const coordPattern = /(\d+)[°º]\s*(\d+)?['′]?\s*(\d+)?["″]?/g;
    const distancePattern = /(\d+[,.]?\d*)\s*m(?:etros?)?/gi;
    
    let coordMatch;
    while ((coordMatch = coordPattern.exec(binaryString)) !== null) {
      textParts.push(coordMatch[0]);
    }
    
    let distMatch;
    while ((distMatch = distancePattern.exec(binaryString)) !== null) {
      textParts.push(distMatch[0]);
    }
    
    const extractedText = textParts.join(' ');
    console.log('Basic PDF text extraction, found parts:', textParts.length);
    
    return extractedText || '';
  } catch (error) {
    console.error('Error in basic PDF parsing:', error);
    return '';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const body: RequestBody = await req.json();
    const { message, segments, propertyData, conversationHistory, fileAttachment } = body;

    console.log('Chat message received:', message);
    console.log('Current segments:', segments.length);
    console.log('Has file attachment:', !!fileAttachment);

    const systemPrompt = `Você é um assistente especialista em georreferenciamento e análise de matrículas de imóveis brasileiros.

CONTEXTO ATUAL:
- Matrícula: ${propertyData.matricula || 'N/A'}
- Proprietário: ${propertyData.owner || 'N/A'}
- Cidade/Estado: ${propertyData.city || 'N/A'}, ${propertyData.state || 'N/A'}
- Área declarada: ${propertyData.area ? propertyData.area + ' m²' : 'N/A'}
- Erro de fechamento atual: ${propertyData.closureError?.toFixed(2) || 'N/A'} metros

SEGMENTOS ATUAIS DO SISTEMA:
${segments.map(s => `P${s.index}: Rumo ${s.bearingRaw}, Distância ${s.distanceM}m, Confrontante: ${s.confrontation || 'N/A'}`).join('\n')}

SUAS CAPACIDADES:
1. ANALISAR DOCUMENTOS: Quando o usuário enviar imagens/PDFs de matrículas, extraia os dados e compare com os segmentos atuais
2. CORRIGIR AUTOMATICAMENTE: Se encontrar diferenças entre o documento e os dados do sistema, corrija automaticamente
3. CORRIGIR RUMOS/DISTÂNCIAS: Quando o usuário pedir correções específicas
4. ACEITAR ALTERAÇÕES MANUAIS: Se o usuário insistir em uma alteração mesmo que não esteja na matrícula, você PODE fazer, mas deve marcar como "requiresConfirmation: true" com um aviso

REGRAS PARA ALTERAÇÕES DE RISCO:
- Se o usuário pedir uma alteração que PARECE incorreta ou não condiz com os dados da matrícula original:
  - Avise que isso pode não estar correto
  - Marque "requiresConfirmation": true
  - Adicione um "warningMessage" explicando o risco
  - Inclua os segmentos alterados em "updatedSegments"
  - O sistema mostrará botões de confirmação para o usuário
  
- Se a alteração parece CORRETA (baseada em análise de documento ou correção óbvia):
  - Marque "requiresConfirmation": false
  - Aplique diretamente

FORMATO DE RUMOS (normalizados):
- Use SEMPRE o formato "Az NNN°MM'SS\"" (ex: "Az 45°30'15\\"")

FORMATO DE RESPOSTA JSON:
{
  "response": "Sua mensagem descrevendo o que encontrou/fez",
  "updatedSegments": [...] // Array COMPLETO de segmentos, ou null
  "requiresConfirmation": true/false,
  "warningMessage": "Aviso sobre o risco da alteração",
  "changeDescription": "Descrição técnica da alteração para o log"
}

EXEMPLOS:

1. Alteração segura (correção baseada em documento):
{"response": "Encontrei que o rumo do P2 no documento é 90°, diferente do atual 45°. Corrigindo...", "updatedSegments": [...], "requiresConfirmation": false, "changeDescription": "Correção de rumo P2: 45° -> 90° (conforme documento)"}

2. Alteração de risco (usuário pediu algo que não está no documento):
{"response": "Você está pedindo para alterar o P3 para 180°, mas na matrícula consta 270°. Isso não corresponde ao documento original. Deseja prosseguir mesmo assim?", "updatedSegments": [...], "requiresConfirmation": true, "warningMessage": "Alteração não corresponde à matrícula original (270° -> 180°)", "changeDescription": "Alteração manual P3: 270° -> 180° (a pedido do usuário)"}

IMPORTANTE: Todas as alterações são registradas em log de auditoria com data/hora/usuário. Informe isso ao usuário quando relevante.`;

    // Build messages array
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10),
    ];

    // Add user message with file if present
    if (fileAttachment) {
      const isImage = fileAttachment.type.startsWith('image/');
      
      if (isImage) {
        // For images, use vision capability
        messages.push({
          role: 'user',
          content: [
            {
              type: 'text',
              text: message
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${fileAttachment.type};base64,${fileAttachment.base64}`
              }
            }
          ]
        });
      } else if (fileAttachment.type === 'application/pdf') {
        // For PDFs, extract text and send to AI
        console.log('Extracting text from PDF...');
        const pdfText = extractPdfText(fileAttachment.base64);
        
        if (pdfText && pdfText.length > 50) {
          console.log('PDF text extracted, length:', pdfText.length);
          messages.push({
            role: 'user',
            content: `${message}\n\n--- CONTEÚDO DO DOCUMENTO PDF "${fileAttachment.name}" ---\n${pdfText}\n--- FIM DO DOCUMENTO ---\n\nAnalise o texto acima e extraia os rumos, distâncias e confrontantes. Compare com os segmentos atuais e faça as correções necessárias.`
          });
        } else {
          // PDF text extraction failed or returned too little, try to inform user
          console.log('PDF text extraction returned insufficient text, trying alternative approach');
          messages.push({
            role: 'user',
            content: `${message}\n\n[O usuário enviou o PDF "${fileAttachment.name}" mas não foi possível extrair texto suficiente. O PDF pode estar escaneado como imagem. Por favor, peça ao usuário para enviar uma FOTO ou IMAGEM do documento, ou copiar e colar o texto dos rumos e distâncias manualmente.]`
          });
        }
      } else {
        // For other docs (Word, etc), ask for image or text
        messages.push({
          role: 'user',
          content: `${message}\n\n[O usuário enviou um arquivo: ${fileAttachment.name} (${fileAttachment.type}). Para analisar este tipo de documento, peça ao usuário para enviar uma foto/imagem ou copiar o texto dos rumos e distâncias.]`
        });
      }
    } else {
      messages.push({ role: 'user', content: message });
    }

    console.log('Calling AI with context, has image:', !!fileAttachment?.type?.startsWith('image/'));

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            response: 'Limite de requisições excedido. Aguarde um momento e tente novamente.',
            updatedSegments: null
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            response: 'Créditos insuficientes. Entre em contato com o suporte.',
            updatedSegments: null
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    console.log('AI response:', content);

    // Try to parse JSON response
    let result: { 
      response: string; 
      updatedSegments: Segment[] | null;
      requiresConfirmation?: boolean;
      warningMessage?: string;
      changeDescription?: string;
    } = { 
      response: content, 
      updatedSegments: null,
      requiresConfirmation: false
    };
    
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[1].trim());
      } else if (content.trim().startsWith('{')) {
        result = JSON.parse(content);
      }
    } catch (parseError) {
      console.log('Could not parse as JSON, using raw content');
      result = { response: content, updatedSegments: null, requiresConfirmation: false };
    }

    // Recalculate azimuth values if segments were updated
    if (result.updatedSegments) {
      result.updatedSegments = result.updatedSegments.map((seg: any, idx: number) => {
        // Handle both AI response format and standard format
        const bearingRaw = seg.bearingRaw || seg.rumo || '';
        const distanceM = parseFloat(String(seg.distanceM || seg.distancia || '0').replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        const confrontation = seg.confrontation || seg.confrontante || '';
        const index = seg.index ?? (parseInt(String(seg.point || '').replace(/\D/g, '')) || (idx + 1));
        
        const azimuth = parseBearingToAzimuth(bearingRaw);
        const deltaX = distanceM * Math.sin(azimuth * Math.PI / 180);
        const deltaY = distanceM * Math.cos(azimuth * Math.PI / 180);
        
        return {
          index,
          bearingRaw,
          bearingAzimuth: azimuth,
          distanceM,
          confrontation,
          deltaX,
          deltaY,
        };
      });
      
      console.log('Updated segments with recalculated values:', result.updatedSegments.length);
      console.log('Requires confirmation:', result.requiresConfirmation);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in ai-matricula-chat:', error);
    return new Response(
      JSON.stringify({ 
        response: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
        updatedSegments: null
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to parse bearing to azimuth
function parseBearingToAzimuth(bearing: string): number {
  if (!bearing) return 0;
  
  // Try Az format first (Az 123°45'30")
  const azMatch = bearing.match(/Az\.?\s*(\d+)[°]?\s*(\d+)?['′]?\s*(\d+)?["″]?/i);
  if (azMatch) {
    const deg = parseFloat(azMatch[1]);
    const min = parseFloat(azMatch[2] || '0');
    const sec = parseFloat(azMatch[3] || '0');
    return deg + min / 60 + sec / 3600;
  }
  
  // Try direct azimuth format (123°45'30")
  const directAzMatch = bearing.match(/^(\d+)[°]\s*(\d+)?['′]?\s*(\d+)?["″]?$/);
  if (directAzMatch) {
    const deg = parseFloat(directAzMatch[1]);
    const min = parseFloat(directAzMatch[2] || '0');
    const sec = parseFloat(directAzMatch[3] || '0');
    return deg + min / 60 + sec / 3600;
  }
  
  // Parse quadrant bearings (N 45°30' E, S 30°15' W, etc.)
  const quadrantMatch = bearing.match(/([NS])\s*(\d+)[°]?\s*(\d+)?['′]?\s*(\d+)?["″]?\s*([EW])/i);
  if (quadrantMatch) {
    const ns = quadrantMatch[1].toUpperCase();
    const deg = parseFloat(quadrantMatch[2]);
    const min = parseFloat(quadrantMatch[3] || '0');
    const sec = parseFloat(quadrantMatch[4] || '0');
    const ew = quadrantMatch[5].toUpperCase();

    const angle = deg + min / 60 + sec / 3600;

    if (ns === 'N' && ew === 'E') return angle;
    if (ns === 'N' && ew === 'W') return 360 - angle;
    if (ns === 'S' && ew === 'E') return 180 - angle;
    if (ns === 'S' && ew === 'W') return 180 + angle;
  }

  // Try to extract just numbers
  const numMatch = bearing.match(/(\d+(?:\.\d+)?)/);
  if (numMatch) {
    return parseFloat(numMatch[1]);
  }

  return 0;
}
