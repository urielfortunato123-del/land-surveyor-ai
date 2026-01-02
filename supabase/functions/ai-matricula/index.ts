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
              content: `Você é um especialista em análise de matrículas de imóveis rurais e urbanos brasileiros.

IMPORTANTE: Existem dois tipos principais de matrículas:

1. MATRÍCULA RURAL (com memorial descritivo geométrico):
   - Contém azimutes/rumos (ex: "N 45° 30' E", "azimute 125° 45' 30\"")
   - Contém distâncias em metros para cada segmento
   - Formato: "segue com azimute 112°30' por 48,72m até o ponto P2, confrontando com..."

2. MATRÍCULA URBANA (com dimensões ou deflexões):
   - Pode ter medidas simples: "7,50 metros de frente e de fundos, por 20,00 metros de cada lado"
   - Ou descrição com DEFLEXÕES: "12 metros, deflete à esquerda, 8,50 metros, deflete à direita..."
   - NÃO contém azimutes ou rumos direcionais explícitos

PADRÕES DE DEFLEXÃO EM MATRÍCULAS URBANAS:
- "deflete à esquerda" ou "deflete a esquerda" = vira 90° para a esquerda
- "deflete à direita" ou "deflete a direita" = vira 90° para a direita
- "deflete para esquerda" = vira 90° para a esquerda  
- "deflete para direita" = vira 90° para a direita
- Quando usa deflexões, converta para segmentos com azimutes calculados

EXTRAÇÃO DE ENDEREÇO (MUITO IMPORTANTE PARA GEOLOCALIZAÇÃO):
- Extraia o endereço COMPLETO: rua/avenida + número + complemento
- Extraia o bairro/setor
- Extraia a cidade e estado
- Para rurais: extraia nome da chácara/fazenda, rodovia, km, etc.
- Exemplo: "Rua Sargento Carlos José Tomaz, 447, Bauru-SP"

TERMOS COMUNS EM MATRÍCULAS URBANAS:
- "pela frente com..." ou "de frente para..." = confrontação frontal
- "pelos fundos com..." ou "nos fundos com..." = confrontação de fundos
- "do lado direito com..." = confrontação lado direito
- "do lado esquerdo com..." = confrontação lado esquerdo
- "lote X" ao lado = vizinho/confrontante

Extraia todos os dados da descrição do imóvel incluindo:
- Número da matrícula
- Nome do proprietário (ATUAL, não os anteriores)
- Cartório de registro
- Cidade/Estado
- ENDEREÇO COMPLETO (rua, número, bairro)
- Área total declarada (em m²)
- Perímetro total (se declarado)
- Tipo de imóvel: "rural" ou "urbano"

Para IMÓVEIS com descrição por DEFLEXÃO, converta para segmentos:
- Assuma que começa pela FRENTE do terreno
- Cada "deflete à direita" adiciona 90° ao azimute atual
- Cada "deflete à esquerda" subtrai 90° do azimute atual
- Gere segmentos com azimutes calculados

Para IMÓVEIS RURAIS, extraia os segmentos com rumos/azimutes originais.

Para IMÓVEIS URBANOS simples (frente x lados), extraia as dimensões.

Retorne os dados em formato JSON estruturado:
{
  "matricula": "string",
  "owner": "string (proprietário atual)",
  "registryOffice": "string",
  "city": "string",
  "state": "string",
  "propertyAddress": "string (endereço completo: rua, número, etc.)",
  "neighborhood": "string (bairro se disponível)",
  "road": "string (rodovia/estrada com km se for rural, ex: 'Rodovia SP 261 km 55')",
  "propertyType": "rural" | "urbano",
  "areaDeclared": number | null,
  "perimeterDeclared": number | null,
  "utmCoordinates": {
    "zone": number | null (zona UTM, ex: 23),
    "hemisphere": "N" | "S" (hemisfério, no Brasil é sempre "S"),
    "firstVertex": {
      "n": number (coordenada Norte/Y do primeiro vértice),
      "e": number (coordenada Este/X do primeiro vértice)
    } | null
  } | null,
  "segments": [
    {
      "index": number,
      "bearingRaw": "string (formato original ou 'Az X°' se calculado de deflexão)",
      "distanceM": number,
      "confrontation": "string"
    }
  ],
  "urbanDimensions": {
    "front": number | null,
    "back": number | null,
    "rightSide": number | null,
    "leftSide": number | null,
    "frontConfrontation": "string (com quem faz divisa pela frente)",
    "backConfrontation": "string (com quem faz divisa pelos fundos)", 
    "rightConfrontation": "string (com quem faz divisa à direita)",
    "leftConfrontation": "string (com quem faz divisa à esquerda)"
  } | null
}

REGRAS PARA DEFLEXÃO (converter para segmentos):
- Se a descrição usa "deflete", gere SEGMENTS (não urbanDimensions)
- Azimute inicial: 90° (frente para o leste, padrão)
- "deflete à direita" ou "deflete para direita": azimute += 90°
- "deflete à esquerda" ou "deflete para esquerda": azimute -= 90°
- Normalize o azimute entre 0° e 360°
- Exemplo: "12m, deflete à esquerda, 8.5m, deflete à direita, 12m, deflete à direita, 8.5m"
  Gera: [Az 90° 12m], [Az 0° 8.5m], [Az 90° 12m], [Az 180° 8.5m]

IMPORTANTE para geolocalização:
- Extraia TODA informação de localização disponível
- Para urbanos: "Rua X, número Y, Bairro Z, Cidade-UF"
- Para rurais: "Fazenda X, Rodovia SP 261 km 55, Município-UF"
- O endereço completo vai ser usado para buscar a localização no mapa!
IMPORTANTE sobre coordenadas UTM:
- Coordenadas UTM aparecem como N= (Norte/Y) e E= (Este/X)
- Exemplo: "N= 7382536.544 e E= 283131.811"
- A zona UTM pode ser inferida pela localização (SP geralmente é zona 23)
- No Brasil o hemisfério é sempre Sul ("S")
- Extraia as coordenadas do PRIMEIRO vértice (vértice "1" ou ponto inicial)`
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Analise esta imagem de matrícula de imóvel brasileiro. Identifique se é uma matrícula RURAL (com azimutes e memorial descritivo) ou URBANA (com dimensões simples como frente, fundos, lados). Extraia todos os dados disponíveis:' },
                { type: 'image_url', image_url: { url: imageBase64 } }
              ]
            }
          ];
          model = 'google/gemini-2.5-pro'; // Better for vision tasks
        } else if (documentText) {
          messages = [
            {
              role: 'system',
              content: `Você é um especialista em análise de matrículas de imóveis rurais e urbanos brasileiros.
Extraia todos os dados da descrição do imóvel. Retorne os dados em formato JSON:
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
      "bearingRaw": "string (formato original)",
      "distanceM": number,
      "confrontation": "string"
    }
  ]
}`
            },
            {
              role: 'user',
              content: `Analise este texto de matrícula e extraia os dados:\n\n${documentText}`
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
