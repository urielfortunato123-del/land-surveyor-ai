import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KMLRequest {
  projectName: string;
  coordinates: [number, number][]; // [lng, lat] pairs
  segments: {
    index: number;
    bearingRaw: string;
    distanceM: number;
    neighbor?: string;
  }[];
  areaComputed: number;
  perimeterComputed: number;
}

function generateKML(data: KMLRequest): string {
  const { projectName, coordinates, segments, areaComputed, perimeterComputed } = data;
  
  // Convert coordinates to KML format (lng,lat,alt)
  const coordsString = coordinates.map(([lng, lat]) => `${lng},${lat},0`).join(' ');
  
  // Generate placemarks for each vertex
  const placemarks = coordinates.slice(0, -1).map(([lng, lat], i) => {
    const segment = segments[i];
    const name = segment?.neighbor || `Ponto ${i + 1}`;
    const description = segment 
      ? `Rumo: ${segment.bearingRaw}\nDistância: ${segment.distanceM.toFixed(2)}m`
      : '';
    
    return `
    <Placemark>
      <name>P${i + 1}</name>
      <description><![CDATA[${name}<br/>${description}]]></description>
      <styleUrl>#vertexStyle</styleUrl>
      <Point>
        <coordinates>${lng},${lat},0</coordinates>
      </Point>
    </Placemark>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${projectName}</name>
    <description>
      Área: ${areaComputed.toFixed(2)} m²
      Perímetro: ${perimeterComputed.toFixed(2)} m
      Gerado por GeoMatrícula
    </description>
    
    <!-- Styles -->
    <Style id="polygonStyle">
      <LineStyle>
        <color>ff00b4a6</color>
        <width>3</width>
      </LineStyle>
      <PolyStyle>
        <color>4000b4a6</color>
      </PolyStyle>
    </Style>
    
    <Style id="vertexStyle">
      <IconStyle>
        <color>ff1a365d</color>
        <scale>0.8</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href>
        </Icon>
      </IconStyle>
      <LabelStyle>
        <scale>0.8</scale>
      </LabelStyle>
    </Style>
    
    <!-- Polygon -->
    <Placemark>
      <name>${projectName}</name>
      <description><![CDATA[
        <b>Área:</b> ${areaComputed.toFixed(2)} m²<br/>
        <b>Perímetro:</b> ${perimeterComputed.toFixed(2)} m<br/>
        <b>Vértices:</b> ${segments.length}
      ]]></description>
      <styleUrl>#polygonStyle</styleUrl>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coordsString}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
    
    <!-- Vertices -->
    <Folder>
      <name>Vértices</name>
      ${placemarks}
    </Folder>
  </Document>
</kml>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: KMLRequest = await req.json();
    
    console.log('Generating KML for project:', data.projectName);
    console.log('Coordinates count:', data.coordinates.length);
    
    const kmlContent = generateKML(data);
    
    console.log('KML generated successfully, size:', kmlContent.length, 'bytes');

    return new Response(kmlContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/vnd.google-earth.kml+xml',
        'Content-Disposition': `attachment; filename="${data.projectName.replace(/[^a-zA-Z0-9]/g, '_')}.kml"`,
      },
    });
  } catch (error: unknown) {
    console.error('Error generating KML:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
