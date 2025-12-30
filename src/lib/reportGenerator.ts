import { ParcelResult, Segment } from '@/types';

interface ProjectInfo {
  projectName: string;
  matriculaNumber?: string;
  ownerName?: string;
  propertyAddress?: string;
  city: string;
  state: string;
  registryOffice?: string;
  technicalResponsible?: string;
  crea?: string;
  analysisDate: Date;
  observations?: string;
}

interface TechnicalReportData {
  projectInfo: ProjectInfo;
  result: ParcelResult;
  segments: Segment[];
  mapImageBase64?: string;
}

export const generateTechnicalReportHTML = (data: TechnicalReportData): string => {
  const { projectInfo, result, segments, mapImageBase64 } = data;
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatNumber = (num: number, decimals = 2) => {
    return num.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const qualityStatus = result.confidenceScore >= 80 ? 'APROVADO' : 
                         result.confidenceScore >= 60 ? 'APROVADO COM RESSALVAS' : 'PENDENTE DE REVISÃO';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Laudo Técnico - ${projectInfo.projectName}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a1a;
      background: white;
    }
    
    .header {
      border-bottom: 3px solid #00B4A6;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    .header h1 {
      font-size: 24pt;
      color: #1a365d;
      margin-bottom: 5px;
    }
    
    .header .subtitle {
      font-size: 14pt;
      color: #666;
    }
    
    .header .date {
      float: right;
      text-align: right;
      color: #666;
      font-size: 10pt;
    }
    
    .section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 14pt;
      color: #1a365d;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 8px;
      margin-bottom: 15px;
      font-weight: 600;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 30px;
    }
    
    .info-item {
      display: flex;
      gap: 10px;
    }
    
    .info-label {
      font-weight: 600;
      color: #666;
      min-width: 120px;
    }
    
    .info-value {
      color: #1a1a1a;
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .metric-card {
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    
    .metric-value {
      font-size: 20pt;
      font-weight: 700;
      color: #1a365d;
    }
    
    .metric-label {
      font-size: 9pt;
      color: #666;
      margin-top: 5px;
    }
    
    .status-badge {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 10pt;
    }
    
    .status-approved {
      background: #dcfce7;
      color: #166534;
    }
    
    .status-warning {
      background: #fef3c7;
      color: #92400e;
    }
    
    .status-review {
      background: #fee2e2;
      color: #991b1b;
    }
    
    .map-container {
      width: 100%;
      height: 300px;
      background: #f0f0f0;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    
    .map-container img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    
    .segments-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
    }
    
    .segments-table th {
      background: #1a365d;
      color: white;
      padding: 10px;
      text-align: left;
      font-weight: 600;
    }
    
    .segments-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .segments-table tr:nth-child(even) {
      background: #f8fafc;
    }
    
    .analysis-text {
      background: #f8fafc;
      border-left: 4px solid #00B4A6;
      padding: 15px 20px;
      border-radius: 0 8px 8px 0;
      font-style: italic;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
    }
    
    .signature-box {
      text-align: center;
      min-width: 200px;
    }
    
    .signature-line {
      border-top: 1px solid #1a1a1a;
      margin-top: 50px;
      padding-top: 10px;
    }
    
    .coordinates-section {
      font-family: 'Courier New', monospace;
      font-size: 9pt;
      background: #f8fafc;
      padding: 15px;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="date">
      ${formatDate(projectInfo.analysisDate)}<br>
      Documento gerado automaticamente
    </div>
    <h1>LAUDO TÉCNICO</h1>
    <div class="subtitle">Levantamento Topográfico e Análise de Matrícula</div>
  </div>

  <div class="section">
    <h2 class="section-title">1. IDENTIFICAÇÃO DO IMÓVEL</h2>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">Projeto:</span>
        <span class="info-value">${projectInfo.projectName}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Matrícula:</span>
        <span class="info-value">${projectInfo.matriculaNumber || 'Não informado'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Proprietário:</span>
        <span class="info-value">${projectInfo.ownerName || 'Não informado'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Cartório:</span>
        <span class="info-value">${projectInfo.registryOffice || 'Não informado'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Endereço:</span>
        <span class="info-value">${projectInfo.propertyAddress || 'Não informado'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Localização:</span>
        <span class="info-value">${projectInfo.city}, ${projectInfo.state}</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">2. RESULTADO DA ANÁLISE</h2>
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-value">${formatNumber(result.areaComputed)}</div>
        <div class="metric-label">ÁREA (m²)</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${formatNumber(result.perimeterComputed)}</div>
        <div class="metric-label">PERÍMETRO (m)</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${formatNumber(result.closureError)}</div>
        <div class="metric-label">ERRO FECHAMENTO (m)</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${result.confidenceScore}%</div>
        <div class="metric-label">CONFIANÇA</div>
      </div>
    </div>
    
    <p style="margin-bottom: 10px;">
      <strong>Status:</strong> 
      <span class="status-badge ${result.confidenceScore >= 80 ? 'status-approved' : result.confidenceScore >= 60 ? 'status-warning' : 'status-review'}">
        ${qualityStatus}
      </span>
    </p>
    
    ${result.areaDeclared ? `
    <p>
      <strong>Área Declarada na Matrícula:</strong> ${formatNumber(result.areaDeclared)} m²<br>
      <strong>Diferença:</strong> ${formatNumber(Math.abs(result.areaComputed - result.areaDeclared))} m² 
      (${formatNumber(Math.abs((result.areaComputed - result.areaDeclared) / result.areaDeclared * 100))}%)
    </p>
    ` : ''}
  </div>

  <div class="section">
    <h2 class="section-title">3. REPRESENTAÇÃO GRÁFICA</h2>
    <div class="map-container">
      ${mapImageBase64 
        ? `<img src="${mapImageBase64}" alt="Mapa do imóvel" />`
        : '<span style="color: #666;">Imagem do mapa será inserida aqui</span>'
      }
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">4. MEMORIAL DESCRITIVO</h2>
    <table class="segments-table">
      <thead>
        <tr>
          <th>Ponto</th>
          <th>Rumo/Azimute</th>
          <th>Distância</th>
          <th>Confrontante</th>
          <th>Observação</th>
        </tr>
      </thead>
      <tbody>
        ${segments.map(seg => `
        <tr>
          <td><strong>P${seg.index}</strong></td>
          <td>${seg.bearingRaw}</td>
          <td>${formatNumber(seg.distanceM)} m</td>
          <td>${seg.neighbor || '-'}</td>
          <td>${(seg as any).customName || '-'}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2 class="section-title">5. ANÁLISE TÉCNICA</h2>
    <div class="analysis-text">
      <p>
        O presente laudo técnico foi elaborado com base na análise documental da matrícula 
        ${projectInfo.matriculaNumber ? `nº ${projectInfo.matriculaNumber}` : 'do imóvel'}, 
        localizado em <strong>${projectInfo.city}/${projectInfo.state}</strong>.
      </p>
      <br>
      <p>
        A reconstrução do polígono a partir dos rumos e distâncias descritos no documento 
        resultou em uma área calculada de <strong>${formatNumber(result.areaComputed)} m²</strong> 
        e perímetro de <strong>${formatNumber(result.perimeterComputed)} m</strong>.
      </p>
      <br>
      <p>
        O erro de fechamento obtido foi de <strong>${formatNumber(result.closureError)} m</strong>, 
        ${result.closureError <= 0.5 
          ? 'o que está dentro dos limites aceitáveis para levantamentos topográficos convencionais.'
          : result.closureError <= 1.0 
            ? 'o que representa um valor limítrofe, recomendando-se verificação dos dados originais.'
            : 'o que indica possível inconsistência nos dados da matrícula, recomendando-se levantamento topográfico in loco.'
        }
      </p>
      <br>
      <p>
        A extração dos dados foi realizada por método ${result.extractionMethod === 'regex' ? 'automatizado (regex)' : result.extractionMethod === 'ai' ? 'assistido por IA' : 'híbrido (regex + IA)'}, 
        com índice de confiança de <strong>${result.confidenceScore}%</strong>.
      </p>
      ${projectInfo.observations ? `<br><p><strong>Observações:</strong> ${projectInfo.observations}</p>` : ''}
    </div>
  </div>

  <div class="footer">
    <div class="signature-box">
      <div class="signature-line">
        ${projectInfo.technicalResponsible || 'Responsável Técnico'}<br>
        ${projectInfo.crea ? `CREA: ${projectInfo.crea}` : ''}
      </div>
    </div>
    <div class="signature-box">
      <div class="signature-line">
        Local e Data<br>
        ${projectInfo.city}/${projectInfo.state}, ${formatDate(projectInfo.analysisDate)}
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

export const downloadReportAsPDF = async (html: string, filename: string) => {
  // Create a new window with the HTML content
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Popup blocked. Please allow popups for this site.');
  }
  
  printWindow.document.write(html);
  printWindow.document.close();
  
  // Wait for content to load then print
  printWindow.onload = () => {
    printWindow.print();
  };
};

export const downloadReportAsHTML = (html: string, filename: string) => {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
