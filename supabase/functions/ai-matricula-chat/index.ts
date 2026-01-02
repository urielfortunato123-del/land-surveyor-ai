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
3. CORRIGIR RUMOS: Se o usuário pedir para corrigir um rumo específico
4. CORRIGIR DISTÂNCIAS: Se o usuário pedir para corrigir uma distância
5. EXPLICAR PROBLEMAS: Explicar por que o erro de fechamento está alto
6. SUGERIR CORREÇÕES: Baseado nos dados, sugerir correções

REGRAS PARA ANÁLISE DE DOCUMENTOS:
- Extraia TODOS os rumos e distâncias do documento
- Compare cada segmento com os dados atuais
- Se houver diferenças, CORRIJA automaticamente no updatedSegments
- Informe ao usuário exatamente o que foi encontrado e corrigido

FORMATO DE RUMOS (normalizados):
- Use SEMPRE o formato "Az NNN°MM'SS\"" (ex: "Az 45°30'15\\"")
- Converta qualquer formato de entrada para este padrão

REGRAS DE RESPOSTA:
- Responda SEMPRE em português brasileiro
- Seja claro sobre o que encontrou no documento
- Liste as diferenças encontradas e as correções feitas
- Se não conseguir ler o documento, peça uma imagem mais clara

FORMATO DE RESPOSTA JSON:
{
  "response": "Sua mensagem descrevendo o que encontrou e corrigiu",
  "updatedSegments": [...] // Array COMPLETO de segmentos com correções, ou null se não houver mudanças
}

IMPORTANTE sobre updatedSegments:
- SEMPRE retorne o array COMPLETO de segmentos quando fizer alterações
- Mantenha todos os campos originais, apenas modifique o necessário
- Recalcule deltaX e deltaY para cada segmento alterado`;

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
      } else {
        // For PDFs/docs, we'll describe what was sent and ask AI to work with the text
        // Note: In production, you'd want to use a document parsing service
        messages.push({
          role: 'user',
          content: `${message}\n\n[O usuário enviou um arquivo: ${fileAttachment.name} (${fileAttachment.type}). Como não posso visualizar PDFs diretamente, peça ao usuário para enviar uma foto/imagem do documento ou copiar o texto dos rumos e distâncias.]`
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
    let result: { response: string; updatedSegments: Segment[] | null } = { 
      response: content, 
      updatedSegments: null 
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
      result = { response: content, updatedSegments: null };
    }

    // Recalculate azimuth values if segments were updated
    if (result.updatedSegments) {
      result.updatedSegments = result.updatedSegments.map((seg: Segment) => {
        const azimuth = parseBearingToAzimuth(seg.bearingRaw);
        return {
          ...seg,
          bearingAzimuth: azimuth,
          deltaX: seg.distanceM * Math.sin(azimuth * Math.PI / 180),
          deltaY: seg.distanceM * Math.cos(azimuth * Math.PI / 180),
        };
      });
      
      console.log('Updated segments with recalculated values:', result.updatedSegments.length);
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
