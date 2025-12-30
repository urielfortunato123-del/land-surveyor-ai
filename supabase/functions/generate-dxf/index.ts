import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Segment {
  index: number;
  bearingRaw: string;
  distanceM: number;
  neighbor?: string;
  customName?: string;
}

interface DXFRequest {
  projectName: string;
  segments: Segment[];
  coordinates: [number, number][];
  areaComputed: number;
  perimeterComputed: number;
}

function generateDXF(data: DXFRequest): string {
  const { projectName, segments, coordinates, areaComputed, perimeterComputed } = data;
  
  // Calculate bounds for viewport
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  coordinates.forEach(([x, y]) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });
  
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const width = maxX - minX;
  const height = maxY - minY;
  
  let dxf = '';
  
  // HEADER SECTION
  dxf += '0\nSECTION\n2\nHEADER\n';
  dxf += '9\n$ACADVER\n1\nAC1014\n';
  dxf += '9\n$INSUNITS\n70\n6\n'; // Meters
  dxf += '0\nENDSEC\n';
  
  // TABLES SECTION
  dxf += '0\nSECTION\n2\nTABLES\n';
  
  // Layer table
  dxf += '0\nTABLE\n2\nLAYER\n70\n5\n';
  
  // PARCEL_BOUNDARY layer
  dxf += '0\nLAYER\n2\nPARCEL_BOUNDARY\n70\n0\n62\n3\n6\nCONTINUOUS\n';
  // PARCEL_POINTS layer
  dxf += '0\nLAYER\n2\nPARCEL_POINTS\n70\n0\n62\n5\n6\nCONTINUOUS\n';
  // PARCEL_TEXT layer
  dxf += '0\nLAYER\n2\nPARCEL_TEXT\n70\n0\n62\n7\n6\nCONTINUOUS\n';
  // PARCEL_BEARINGS layer
  dxf += '0\nLAYER\n2\nPARCEL_BEARINGS\n70\n0\n62\n1\n6\nCONTINUOUS\n';
  // PARCEL_NEIGHBORS layer
  dxf += '0\nLAYER\n2\nPARCEL_NEIGHBORS\n70\n0\n62\n4\n6\nCONTINUOUS\n';
  
  dxf += '0\nENDTAB\n';
  dxf += '0\nENDSEC\n';
  
  // ENTITIES SECTION
  dxf += '0\nSECTION\n2\nENTITIES\n';
  
  // Draw polygon as LWPOLYLINE
  dxf += '0\nLWPOLYLINE\n8\nPARCEL_BOUNDARY\n';
  dxf += `90\n${coordinates.length}\n`; // Number of vertices
  dxf += '70\n1\n'; // Closed polyline
  
  coordinates.forEach(([x, y]) => {
    dxf += `10\n${x.toFixed(4)}\n20\n${y.toFixed(4)}\n`;
  });
  
  // Draw points and labels
  coordinates.slice(0, -1).forEach(([x, y], i) => {
    const segment = segments[i];
    const label = segment?.customName || `P${i + 1}`;
    
    // Point
    dxf += `0\nPOINT\n8\nPARCEL_POINTS\n10\n${x.toFixed(4)}\n20\n${y.toFixed(4)}\n30\n0\n`;
    
    // Label text
    dxf += `0\nTEXT\n8\nPARCEL_TEXT\n10\n${(x + 2).toFixed(4)}\n20\n${(y + 2).toFixed(4)}\n30\n0\n40\n2\n1\n${label}\n`;
    
    // Bearing and distance text
    if (segment) {
      const midX = i < coordinates.length - 2 
        ? (x + coordinates[i + 1][0]) / 2 
        : (x + coordinates[0][0]) / 2;
      const midY = i < coordinates.length - 2 
        ? (y + coordinates[i + 1][1]) / 2 
        : (y + coordinates[0][1]) / 2;
      
      const bearingText = `${segment.bearingRaw} - ${segment.distanceM.toFixed(2)}m`;
      dxf += `0\nTEXT\n8\nPARCEL_BEARINGS\n10\n${midX.toFixed(4)}\n20\n${(midY - 3).toFixed(4)}\n30\n0\n40\n1.5\n1\n${bearingText}\n`;
      
      // Neighbor text
      if (segment.neighbor) {
        dxf += `0\nTEXT\n8\nPARCEL_NEIGHBORS\n10\n${midX.toFixed(4)}\n20\n${(midY + 3).toFixed(4)}\n30\n0\n40\n1.2\n1\n${segment.neighbor}\n`;
      }
    }
  });
  
  // Add area and perimeter text
  dxf += `0\nTEXT\n8\nPARCEL_TEXT\n10\n${centerX.toFixed(4)}\n20\n${(minY - 10).toFixed(4)}\n30\n0\n40\n2.5\n1\n${projectName}\n`;
  dxf += `0\nTEXT\n8\nPARCEL_TEXT\n10\n${centerX.toFixed(4)}\n20\n${(minY - 15).toFixed(4)}\n30\n0\n40\n2\n1\nArea: ${areaComputed.toFixed(2)} m2 | Perimetro: ${perimeterComputed.toFixed(2)} m\n`;
  
  dxf += '0\nENDSEC\n';
  
  // EOF
  dxf += '0\nEOF\n';
  
  return dxf;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: DXFRequest = await req.json();
    
    console.log('Generating DXF for project:', data.projectName);
    console.log('Segments count:', data.segments.length);
    console.log('Coordinates count:', data.coordinates.length);
    
    const dxfContent = generateDXF(data);
    
    console.log('DXF generated successfully, size:', dxfContent.length, 'bytes');

    return new Response(dxfContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/dxf',
        'Content-Disposition': `attachment; filename="${data.projectName.replace(/[^a-zA-Z0-9]/g, '_')}.dxf"`,
      },
    });
  } catch (error: unknown) {
    console.error('Error generating DXF:', error);
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
