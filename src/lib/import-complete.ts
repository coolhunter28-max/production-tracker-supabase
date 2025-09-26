// src/lib/import-complete.ts
import { supabase } from './supabase';
import Papa from 'papaparse';

export interface CSVRow {
  [key: string]: string;
}

export const importCSV = async (file: File) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const data = results.data as CSVRow[];
          const posMap = new Map<string, string>(); // PO -> ID
          const lineasMap = new Map<string, string>(); // PO_STYLE_COLOR -> ID
          let successCount = 0;
          let errorCount = 0;

          for (let i = 0; i < data.length; i++) {
            const row = data[i];
            try {
              // 1. Procesar PO
              const poValue = row['PO'] || '';
              let poId = posMap.get(poValue);
              
              if (!poId) {
                poId = await getOrCreatePO(row);
                posMap.set(poValue, poId);
              }

              // 2. Procesar Línea de Pedido
              const lineaKey = `${poValue}_${row['STYLE']}_${row['COLOR']}`;
              let lineaId = lineasMap.get(lineaKey);
              
              if (!lineaId) {
                lineaId = await getOrCreateLineaPedido(poId, row);
                lineasMap.set(lineaKey, lineaId);
              }

              // 3. Procesar Muestras
              await processMuestras(lineaId, row);
              
              successCount++;
            } catch (error) {
              console.error(`Error procesando fila ${i + 1}:`, error);
              errorCount++;
            }
          }

          resolve({ 
            success: errorCount === 0, 
            count: data.length,
            successCount,
            errorCount,
            message: `Importación completada. ${successCount} registros exitosos, ${errorCount} errores.`
          });
        } catch (error) {
          console.error('Error en importación:', error);
          reject(error);
        }
      },
      error: (error) => {
        console.error('Error al parsear CSV:', error);
        reject(error);
      }
    });
  });
};

const getOrCreatePO = async (row: CSVRow): Promise<string> => {
  const poValue = row['PO'] || '';
  
  // Buscar si el PO ya existe
  const { data: existingPO, error: fetchError } = await supabase
    .from('pos')
    .select('id')
    .eq('po', poValue);
  
  if (fetchError) throw fetchError;
  
  if (existingPO && existingPO.length > 0) {
    return existingPO[0].id;
  }
  
  // Crear nuevo PO
  const poData = {
    po: poValue,
    supplier: row['SUPPLIER'] || '',
    season: row['SEASON'] || '',
    customer: row['CUSTOMER'] || '',
    factory: row['FACTORY'] || '',
    po_date: parseDate(row['PO DATE']),
    etd_pi: parseDate(row['ETD PI']),
    pi: row['PI'] || '',
    channel: row['CHANNEL'] || '',
    booking: row['Booking'] || '',
    closing: row['Closing'] || '',
    shipping_date: parseDate(row['Shipping Date']),
  };
  
  const { data: newPO, error: insertError } = await supabase
    .from('pos')
    .insert([poData])
    .select()
    .single();
  
  if (insertError) throw insertError;
  return newPO.id;
};

const getOrCreateLineaPedido = async (poId: string, row: CSVRow): Promise<string> => {
  const lineaData = {
    po_id: poId,
    reference: row['REFERENCE'] || '',
    style: row['STYLE'] || '',
    color: row['COLOR'] || '',
    size_run: row['SIZE RUN'] || '',
    qty: parseInt(row['QTY']) || 0,
    category: row['CATEGORY'] || '',
    price: parseNumber(row['PRICE']),
    amount: parseNumber(row['AMOUNT']),
    pi_bsg: row['PI BSG'] || '',
    price_selling: parseNumber(row['PRICE SELLING']),
    amount_selling: parseNumber(row['AMOUNT SELLING']),
    trial_upper: row['Trial Upper'] || '',
    trial_lasting: row['Trial Lasting'] || '',
    lasting: row['Lasting'] || '',
    finish_date: parseDate(row['FINISH DATE']),
  };
  
  // Verificar si ya existe una línea con estos datos
  const { data: existingLinea, error: fetchError } = await supabase
    .from('lineas_pedido')
    .select('id')
    .eq('po_id', poId)
    .eq('style', lineaData.style)
    .eq('color', lineaData.color);
  
  if (fetchError) throw fetchError;
  
  if (existingLinea && existingLinea.length > 0) {
    // Actualizar línea existente
    const { error: updateError } = await supabase
      .from('lineas_pedido')
      .update(lineaData)
      .eq('id', existingLinea[0].id);
    
    if (updateError) throw updateError;
    return existingLinea[0].id;
  } else {
    // Insertar nueva línea
    const { data: newLinea, error: insertError } = await supabase
      .from('lineas_pedido')
      .insert([lineaData])
      .select()
      .single();
    
    if (insertError) throw insertError;
    return newLinea.id;
  }
};

const processMuestras = async (lineaId: string, row: CSVRow) => {
  const tiposMuestras = [
    { 
      tipo: 'CFMs', 
      roundField: 'CFMs Round', 
      dateField: 'CFMs',
      approvalField: 'CFMs Approval',
      approvalDateField: 'CFMs Approval Date'
    },
    { 
      tipo: 'Counter Sample', 
      roundField: 'Counter Sample Round', 
      dateField: 'Counter Sample',
      approvalField: 'Counter Sample Approval',
      approvalDateField: 'Counter Sample Approval Date'
    },
    { 
      tipo: 'Fitting', 
      roundField: 'Fitting Round', 
      dateField: 'Fitting',
      approvalField: 'Fitting Approval',
      approvalDateField: 'Fitting Approval Date'
    },
    { 
      tipo: 'PPS', 
      roundField: 'PPS Round', 
      dateField: 'PPS',
      approvalField: 'PPS Approval',
      approvalDateField: 'PPS Approval Date'
    },
    { 
      tipo: 'Testing Samples', 
      roundField: 'Testing Samples Round', 
      dateField: 'Testing Samples',
      approvalField: 'Testing Samples Approval',
      approvalDateField: 'Testing Samples Approval Date'
    },
    { 
      tipo: 'Shipping Samples', 
      roundField: 'Shipping Samples Round', 
      dateField: 'Shipping Samples',
      approvalField: 'Shipping Samples Approval',
      approvalDateField: 'Shipping Samples Approval Date'
    },
    { 
      tipo: 'Inspection', 
      roundField: 'Inspection Round', 
      dateField: 'Inspection',
      approvalField: 'Inspection Approval',
      approvalDateField: 'Inspection Approval Date'
    }
  ];

  for (const tipoMuestra of tiposMuestras) {
    const roundValue = row[tipoMuestra.roundField];
    const dateValue = row[tipoMuestra.dateField];
    const approvalValue = row[tipoMuestra.approvalField];
    const approvalDateValue = row[tipoMuestra.approvalDateField];

    // Si hay información de round o fecha, procesamos esta muestra
    if (roundValue || dateValue) {
      const roundNumber = roundValue ? parseInt(roundValue.replace(/\D/g, '')) : 1;
      
      // Crear o actualizar la muestra
      const muestraData = {
        linea_pedido_id: lineaId,
        tipo_muestra: tipoMuestra.tipo,
        round: roundNumber,
        fecha_muestra: parseDate(dateValue),
        estado_muestra: dateValue ? 'recibida' : 'pendiente',
        notas: `Muestra ${tipoMuestra.tipo} Round ${roundNumber}`
      };

      // Primero verificar si ya existe
      const { data: existingMuestra } = await supabase
        .from('muestras')
        .select('id')
        .eq('linea_pedido_id', lineaId)
        .eq('tipo_muestra', tipoMuestra.tipo)
        .eq('round', roundNumber);
      
      let muestraId;
      if (existingMuestra && existingMuestra.length > 0) {
        // Actualizar muestra existente
        const { data: updatedMuestra, error: updateError } = await supabase
          .from('muestras')
          .update(muestraData)
          .eq('id', existingMuestra[0].id)
          .select()
          .single();
        
        if (updateError) throw updateError;
        muestraId = updatedMuestra.id;
      } else {
        // Insertar nueva muestra
        const { data: newMuestra, error: insertError } = await supabase
          .from('muestras')
          .insert([muestraData])
          .select()
          .single();
        
        if (insertError) throw insertError;
        muestraId = newMuestra.id;
      }

      // Procesar aprobación para esta muestra
      if (approvalValue || approvalDateValue) {
        const aprobacionData = {
          muestra_id: muestraId,
          tipo_aprobacion: tipoMuestra.tipo,
          estado: approvalValue || (approvalDateValue ? 'aprobado' : 'pendiente'),
          fecha_aprobacion: parseDate(approvalDateValue),
          round: roundNumber
        };

        // Verificar si ya existe la aprobación
        const { data: existingAprobacion } = await supabase
          .from('aprobaciones')
          .select('id')
          .eq('muestra_id', muestraId)
          .eq('tipo_aprobacion', tipoMuestra.tipo);
        
        if (existingAprobacion && existingAprobacion.length > 0) {
          // Actualizar aprobación existente
          await supabase
            .from('aprobaciones')
            .update(aprobacionData)
            .eq('id', existingAprobacion[0].id);
        } else {
          // Insertar nueva aprobación
          await supabase
            .from('aprobaciones')
            .insert([aprobacionData]);
        }
      }

      // Procesar validaciones específicas según el tipo de muestra
      await processValidacionesEspecificas(muestraId, tipoMuestra.tipo, row);
    }
  }
};

const processValidacionesEspecificas = async (muestraId: string, tipoMuestra: string, row: CSVRow) => {
  const validaciones = [];

  // Validaciones específicas según el tipo de muestra
  switch (tipoMuestra) {
    case 'CFMs':
      if (row['Trial Upper']) {
        validaciones.push({
          tipo_validacion: 'Trial Upper',
          resultado: 'aprobado',
          fecha_validacion: parseDate(row['Trial Upper']),
          comentarios: 'Trial Upper completado'
        });
      }
      if (row['Trial Lasting']) {
        validaciones.push({
          tipo_validacion: 'Trial Lasting',
          resultado: 'aprobado',
          fecha_validacion: parseDate(row['Trial Lasting']),
          comentarios: 'Trial Lasting completado'
        });
      }
      break;
      
    case 'Fitting':
      if (row['Lasting']) {
        validaciones.push({
          tipo_validacion: 'Lasting',
          resultado: 'aprobado',
          fecha_validacion: parseDate(row['Lasting']),
          comentarios: 'Lasting completado'
        });
      }
      break;
  }

  // Insertar todas las validaciones
  for (const validacion of validaciones) {
    await supabase
      .from('validaciones_muestra')
      .insert([{
        ...validacion,
        muestra_id: muestraId
      }]);
  }
};

const parseDate = (dateStr: string): string | null => {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return null;
};

const parseNumber = (numStr: string): number | null => {
  if (!numStr) return null;
  const num = parseFloat(numStr.replace(',', '.'));
  return isNaN(num) ? null : num;
};