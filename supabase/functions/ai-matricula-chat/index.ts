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
    const { message, segments, propertyData, conversationHistory } = body;

    console.log('Chat message received:', message);
    console.log('Current segments:', segments.length);

    const systemPrompt = `Você é um assistente especialista em georreferenciamento e análise de matrículas de imóveis brasileiros.

CONTEXTO ATUAL:
- Matrícula: ${propertyData.matricula || 'N/A'}
- Proprietário: ${propertyData.owner || 'N/A'}
- Cidade/Estado: ${propertyData.city || 'N/A'}, ${propertyData.state || 'N/A'}
- Área declarada: ${propertyData.area ? propertyData.area + ' m²' : 'N/A'}
- Erro de fechamento atual: ${propertyData.closureError?.toFixed(2) || 'N/A'} metros

SEGMENTOS ATUAIS:
${segments.map(s => `P${s.index}: Rumo ${s.bearingRaw}, Distância ${s.distanceM}m, Confrontante: ${s.confrontation || 'N/A'}`).join('\n')}

SUAS CAPACIDADES:
1. CORRIGIR RUMOS: Se o usuário disser "o rumo do P3 está errado, deveria ser 45°", você atualiza o bearingRaw do segmento
2. CORRIGIR DISTÂNCIAS: Se o usuário disser "a distância do segmento 2 é 25m", você atualiza o distanceM
3. EXPLICAR PROBLEMAS: Você pode explicar por que o erro de fechamento está alto
4. SUGERIR CORREÇÕES: Baseado nos dados, você pode sugerir correções

REGRAS DE RESPOSTA:
- Responda SEMPRE em português brasileiro
- Seja conciso e claro
- Se fizer alterações, descreva exatamente o que mudou
- Se não entender o pedido, peça esclarecimentos

FORMATO DE RESPOSTA JSON:
{
  "response": "Sua mensagem de resposta para o usuário",
  "updatedSegments": [...] // Array de segmentos COMPLETO com as correções, ou null se não houver mudanças
}

IMPORTANTE sobre updatedSegments:
- Se você fizer QUALQUER alteração, retorne o array COMPLETO de segmentos
- Mantenha todos os campos originais, apenas modifique o que foi pedido
- Para rumos, use o formato "Az NNN°MM'SS\"" (ex: "Az 45°0'0\\"")
- Para distâncias, use números em metros

EXEMPLOS:
Usuário: "o rumo do P2 deveria ser 90 graus"
Resposta: {"response": "Corrigi o rumo do P2 de 314°55'44\\" para 90°. Isso deve melhorar o fechamento do polígono.", "updatedSegments": [...]}

Usuário: "qual é o problema do polígono?"
Resposta: {"response": "Analisando os segmentos...", "updatedSegments": null}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: 'user', content: message }
    ];

    console.log('Calling AI with context');

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
  // Try Az format first
  const azMatch = bearing.match(/Az\.?\s*(\d+)[°]?\s*(\d+)?['′]?\s*(\d+)?["″]?/i);
  if (azMatch) {
    const deg = parseFloat(azMatch[1]);
    const min = parseFloat(azMatch[2] || '0');
    const sec = parseFloat(azMatch[3] || '0');
    return deg + min / 60 + sec / 3600;
  }
  
  // Try direct azimuth format
  const directAzMatch = bearing.match(/^(\d+)[°]\s*(\d+)?['′]?\s*(\d+)?["″]?$/);
  if (directAzMatch) {
    const deg = parseFloat(directAzMatch[1]);
    const min = parseFloat(directAzMatch[2] || '0');
    const sec = parseFloat(directAzMatch[3] || '0');
    return deg + min / 60 + sec / 3600;
  }
  
  // Parse quadrant bearings
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

  return 0;
}
