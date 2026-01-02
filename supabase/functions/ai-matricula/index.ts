import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type AIAction = 'extract' | 'validate' | 'generate-report' | 'generate-drawing';

interface RequestBody {
  action: AIAction;
  imageBase64?: string;
  documentText?: string;
  segments?: Array<{
    index: number;
    bearingRaw: string;
    distanceM: number;
    startPoint?: string;
    endPoint?: string;
    confrontation?: string;
  }>;
  propertyData?: {
    matricula?: string;
    owner?: string;
    area?: number;
    perimeter?: number;
    closureError?: number;
    city?: string;
    state?: string;
    registryOffice?: string;
  };
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
    const { action, imageBase64, documentText, segments, propertyData } = body;

    console.log(`Processing AI action: ${action}`);

    let messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [];
    let model = 'google/gemini-2.5-flash';

    switch (action) {
      case 'extract':
        // OCR + NLP extraction from image or text
        if (imageBase64) {
          messages = [
            {
              role: 'system',
              content: `Você é um especialista em topografia e análise de matrículas de imóveis brasileiros.

=== CONHECIMENTO TÉCNICO OBRIGATÓRIO SOBRE AZIMUTES ===

AZIMUTES NO BRASIL:
- Azimute é medido em GRAUS a partir do NORTE, no sentido HORÁRIO
- Vai de 0° (Norte) até 360°
- 0° ou 360° = Norte
- 90° = Leste
- 180° = Sul  
- 270° = Oeste

FORMATOS DE RUMO COMUNS EM MATRÍCULAS BRASILEIRAS:

1. AZIMUTE DIRETO: "Az 244°31'3\"" ou "azimute 244°31'03\"" 
   → Use exatamente como está (244°31'3")

2. RUMO CARTOGRÁFICO (NE, SE, SW, NW):
   - "N 45°30' E" = Azimute 45°30' (parte do Norte, gira 45°30' para Leste)
   - "S 45°30' E" = Azimute 134°30' (180° - 45°30')
   - "S 45°30' W" = Azimute 225°30' (180° + 45°30')
   - "N 45°30' W" = Azimute 314°30' (360° - 45°30')

3. GRAUS DECIMAIS: "152.4583°" 
   → Converta para graus/minutos/segundos

REGRA DE OURO PARA POLÍGONOS FECHADOS:
- Os segmentos DEVEM formar um polígono fechado
- A soma vetorial de todos os segmentos deve ser (aproximadamente) zero
- Se o erro de fechamento for muito grande (>1m), os azimutes podem estar errados
- VERIFIQUE se os azimutes fazem sentido geométrico antes de retornar

=== TIPOS DE MATRÍCULAS ===

1. MATRÍCULA RURAL (memorial descritivo geométrico):
   - Contém azimutes/rumos + distâncias
   - Segue sequência de vértices (P1→P2→P3...)
   - Cada segmento tem confrontação

2. MATRÍCULA URBANA (com deflexões):
   - "12m, deflete à esquerda, 8.5m, deflete à direita..."
   - Converta deflexões para azimutes:
     * Início: Az 90° (frente para leste, padrão)
     * "deflete à direita" = +90°
     * "deflete à esquerda" = -90°

=== EXTRAÇÃO DE ENDEREÇO ===
- Extraia endereço COMPLETO: rua/avenida + número + bairro
- Para rurais: rodovia + km, nome da fazenda/chácara
- Cidade e Estado são OBRIGATÓRIOS

=== COORDENADAS UTM ===
- Formato: N=7382536.544 E=283131.811
- Zona no Brasil: geralmente 21-24 (SP é 23)
- Hemisfério: sempre "S"

Retorne os dados em formato JSON:
{
  "matricula": "string",
  "owner": "string (proprietário atual)",
  "registryOffice": "string",
  "city": "string",
  "state": "string (sigla: SP, MG, RJ...)",
  "propertyAddress": "string (endereço completo)",
  "neighborhood": "string | null",
  "road": "string | null (rodovia com km para rurais)",
  "propertyType": "rural" | "urbano",
  "areaDeclared": number | null,
  "perimeterDeclared": number | null,
  "utmCoordinates": {
    "zone": number | null,
    "hemisphere": "S",
    "firstVertex": { "n": number, "e": number } | null
  } | null,
  "segments": [
    {
      "index": number (começando em 1),
      "bearingRaw": "string (SEMPRE em formato Az NNN°MM'SS\" - converta rumos para azimutes)",
      "distanceM": number,
      "confrontation": "string"
    }
  ]
}

IMPORTANTE SOBRE bearingRaw:
- SEMPRE normalize para formato azimute: "Az 244°31'3\"" 
- Se o original for "N 45° E", converta para "Az 45°0'0\""
- Se o original for "S 45° E", converta para "Az 135°0'0\""
- Isso garante cálculo correto do polígono!`
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Analise esta imagem de matrícula de imóvel brasileiro. Extraia TODOS os dados, especialmente os segmentos com azimutes e distâncias. CONVERTA rumos cartográficos (N/S/E/W) para azimutes puros (0-360°). Garanta que os segmentos formem um polígono fechado.' },
                { type: 'image_url', image_url: { url: imageBase64 } }
              ]
            }
          ];
          model = 'google/gemini-2.5-pro'; // Better for vision tasks
        } else if (documentText) {
          messages = [
            {
              role: 'system',
              content: `Você é um especialista em topografia e análise de matrículas brasileiras.

AZIMUTES: Sempre converta rumos cartográficos para azimutes puros (0-360°):
- "N 45° E" → Az 45°
- "S 45° E" → Az 135° (180° - 45°)
- "S 45° W" → Az 225° (180° + 45°)
- "N 45° W" → Az 315° (360° - 45°)

Retorne JSON com segments no formato:
{
  "matricula": "string",
  "owner": "string", 
  "registryOffice": "string",
  "city": "string",
  "state": "string",
  "areaDeclared": number,
  "perimeterDeclared": number,
  "segments": [
    {
      "index": number,
      "bearingRaw": "Az NNN°MM'SS\"",
      "distanceM": number,
      "confrontation": "string"
    }
  ]
}`
            },
            {
              role: 'user',
              content: `Analise este texto de matrícula e extraia os dados. Converta rumos para azimutes:\n\n${documentText}`
            }
          ];
        } else {
          throw new Error('Forneça imageBase64 ou documentText para extração');
        }
        break;

      case 'validate':
        // Validate and suggest corrections
        if (!segments) {
          throw new Error('Forneça os segmentos para validação');
        }
        messages = [
          {
            role: 'system',
            content: `Você é um engenheiro agrimensor especialista em validação de dados de matrículas.
Analise os segmentos fornecidos e identifique:
1. Erros de rumo (direções impossíveis ou inconsistentes)
2. Distâncias suspeitas (muito curtas ou longas para o contexto)
3. Problemas de fechamento do polígono
4. Sugestões de correção

Retorne em JSON:
{
  "isValid": boolean,
  "closureErrorEstimate": number,
  "issues": [
    {
      "segmentIndex": number,
      "type": "bearing" | "distance" | "closure",
      "message": "string",
      "suggestedValue": "string ou number"
    }
  ],
  "suggestions": ["string"]
}`
          },
          {
            role: 'user',
            content: `Valide estes segmentos extraídos de uma matrícula:\n${JSON.stringify(segments, null, 2)}`
          }
        ];
        break;

      case 'generate-report':
        // Generate technical report
        if (!segments || !propertyData) {
          throw new Error('Forneça segments e propertyData para gerar o laudo');
        }
        messages = [
          {
            role: 'system',
            content: `Você é um engenheiro agrimensor responsável por elaborar laudos técnicos de georreferenciamento.
Gere um laudo técnico profissional e completo em português brasileiro, incluindo:
1. Identificação do imóvel
2. Memorial descritivo com todos os vértices e confrontantes
3. Análise técnica dos dados
4. Parecer sobre a qualidade dos dados
5. Conclusões e recomendações

Use linguagem técnica apropriada e formatação profissional.`
          },
          {
            role: 'user',
            content: `Gere um laudo técnico para o seguinte imóvel:

Dados do imóvel:
${JSON.stringify(propertyData, null, 2)}

Segmentos do memorial descritivo:
${JSON.stringify(segments, null, 2)}`
          }
        ];
        break;

      case 'generate-drawing':
        // Generate DXF/DWG instructions
        if (!segments) {
          throw new Error('Forneça os segmentos para gerar o desenho');
        }
        messages = [
          {
            role: 'system',
            content: `Você é um especialista em CAD e desenho técnico topográfico.
Gere instruções detalhadas para criar um desenho técnico preciso do polígono, incluindo:
1. Coordenadas cartesianas (X,Y) de cada vértice partindo de 0,0
2. Comandos DXF/AutoCAD para desenhar o polígono
3. Configurações de layers recomendadas
4. Posicionamento de textos e cotas

Retorne em JSON:
{
  "vertices": [{ "name": "string", "x": number, "y": number }],
  "dxfCommands": ["string"],
  "layers": [{ "name": "string", "color": number, "lineType": "string" }],
  "annotations": [{ "text": "string", "x": number, "y": number, "rotation": number }]
}`
          },
          {
            role: 'user',
            content: `Gere instruções de desenho técnico para estes segmentos:\n${JSON.stringify(segments, null, 2)}`
          }
        ];
        break;

      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }

    console.log(`Calling Lovable AI with model: ${model}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos na sua conta.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    console.log('AI response received successfully');

    // Try to parse JSON from response if applicable
    let parsedResult = content;
    if (action !== 'generate-report') {
      try {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[1].trim());
        } else {
          parsedResult = JSON.parse(content);
        }
      } catch {
        console.log('Response is not JSON, returning as text');
        parsedResult = content;
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: parsedResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in ai-matricula function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
