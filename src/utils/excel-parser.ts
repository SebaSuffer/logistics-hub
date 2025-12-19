import * as XLSX from 'xlsx';
import { format, parse } from 'date-fns';
import type { Viaje, Gasto } from '../types/database.types';

export interface ParsedTrip {
  fecha: string;
  id_cliente: number;
  cliente_nombre: string;
  id_ruta: number | null;
  ruta_nombre: string;
  observaciones: string;
  monto: number;
}

export interface ParsedExpense {
  fecha: string;
  tipo: string;
  descripcion: string;
  monto: number;
  proveedor: string;
  contenedor?: string; // Para detección de duplicados
}

export function limpiarMontoInteligente(valor: any): number {
  if (valor === null || valor === undefined || valor === '') return 0.0;
  if (typeof valor === 'number') return valor;
  
  let valorStr = String(valor).trim().replace(/\$/g, '').trim();
  if (valorStr.includes(',')) {
    valorStr = valorStr.split(',')[0];
  }
  valorStr = valorStr.replace(/\./g, '');
  
  const parsed = parseFloat(valorStr);
  return isNaN(parsed) ? 0.0 : parsed;
}

export function parseFechaExcel(fecha: any): string {
  if (!fecha) return '';
  
  // If it's already a date object
  if (fecha instanceof Date) {
    return format(fecha, 'yyyy-MM-dd');
  }
  
  // If it's a number (Excel date serial)
  if (typeof fecha === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + fecha * 86400000);
    return format(date, 'yyyy-MM-dd');
  }
  
  // If it's a string, try to parse it
  if (typeof fecha === 'string') {
    try {
      // Try common date formats
      const formats = ['dd/MM/yyyy', 'yyyy-MM-dd', 'MM/dd/yyyy', 'dd-MM-yyyy'];
      for (const fmt of formats) {
        try {
          const parsed = parse(fecha, fmt, new Date());
          if (!isNaN(parsed.getTime())) {
            return format(parsed, 'yyyy-MM-dd');
          }
        } catch {}
      }
      // Fallback to ISO parse
      const parsed = new Date(fecha);
      if (!isNaN(parsed.getTime())) {
        return format(parsed, 'yyyy-MM-dd');
      }
    } catch {}
  }
  
  return '';
}

export function parseFormatoTOBAR(file: File): Promise<ParsedTrip[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Read from row 24 (0-indexed: 23) with columns A:H
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        const startRow = 23; // Row 24 in Excel (0-indexed)
        
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, {
          range: { s: { r: startRow, c: 0 }, e: { r: range.e.r, c: 7 } }, // A:H = 0-7
          defval: null,
        });
        
        const trips: ParsedTrip[] = [];
        
        for (const row of jsonData) {
          const fecha = parseFechaExcel(row['FECHA']);
          if (!fecha) continue;
          
          const desde = String(row['DESDE'] || '').trim().toUpperCase();
          const hasta = String(row['HASTA'] || '').trim().toUpperCase();
          
          if (!desde || !hasta || desde === 'NAN' || hasta === 'NAN') continue;
          
          const sigla = String(row['SIGLA CONTENEDOR'] || '').trim();
          const numero = String(row['NUMERO CONTENEDOR'] || '').trim();
          const contenedor = `${sigla} ${numero}`.trim();
          
          trips.push({
            fecha,
            id_cliente: 0, // Will be set by caller
            cliente_nombre: '',
            id_ruta: null, // Will be resolved by caller
            ruta_nombre: `${desde} -> ${hasta}`,
            observaciones: `Contenedor: ${contenedor}`,
            monto: 0, // Will be calculated by caller
          });
        }
        
        resolve(trips);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function parseFormatoCOSIO(file: File): Promise<ParsedTrip[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Read from row 10 (0-indexed: 9) with columns A:G
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        const startRow = 9;
        
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, {
          range: { s: { r: startRow, c: 0 }, e: { r: range.e.r, c: 6 } }, // A:G = 0-6
          defval: null,
        });
        
        const trips: ParsedTrip[] = [];
        
        for (const row of jsonData) {
          const fecha = parseFechaExcel(row['FECHA']);
          if (!fecha) continue;
          
          const desde = String(row['DESDE'] || '').trim().toUpperCase();
          const hasta = String(row['HASTA'] || '').trim().toUpperCase();
          
          if (!desde || !hasta || desde === 'NAN' || hasta === 'NAN') continue;
          
          const contenedor = String(row['CONTENEDOR'] || '').trim();
          const monto = limpiarMontoInteligente(row['MONTO']);
          
          trips.push({
            fecha,
            id_cliente: 0, // Will be set by caller
            cliente_nombre: '',
            id_ruta: null, // Will be resolved by caller
            ruta_nombre: `${desde} -> ${hasta}`,
            observaciones: `Contenedor: ${contenedor}`,
            monto,
          });
        }
        
        resolve(trips);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function parseGastosExcel(file: File): Promise<ParsedExpense[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Look for 'input_costos' sheet specifically
        let worksheet = workbook.Sheets['input_costos'];
        if (!worksheet) {
          // Try case-insensitive search
          const sheetName = workbook.SheetNames.find(name => 
            name.toLowerCase() === 'input_costos' || 
            name.toLowerCase().includes('costos') ||
            name.toLowerCase().includes('input')
          );
          if (sheetName) {
            worksheet = workbook.Sheets[sheetName];
          }
        }
        
        if (!worksheet) {
          reject(new Error('No se encontró la hoja "input_costos". Hojas disponibles: ' + workbook.SheetNames.join(', ')));
          return;
        }
        
        // Read raw data to find headers dynamically
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        const rawData: any[][] = [];
        
        for (let R = 0; R <= range.e.r && R < 50; R++) {
          const row: any[] = [];
          for (let C = 0; C <= range.e.c && C < 20; C++) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = worksheet[cellAddress];
            row.push(cell ? cell.v : null);
          }
          rawData.push(row);
        }
        
        // Find header row (should contain FECHA, CATEGORIA, DETALLE, MONTO)
        let headerRowIndex = -1;
        let fechaCol = -1;
        let categoriaCol = -1;
        let detalleCol = -1;
        let montoCol = -1;
        let contenedorCol = -1;
        
        for (let i = 0; i < Math.min(20, rawData.length); i++) {
          const row = rawData[i];
          if (!row) continue;
          
          // Reset column indices for this row
          fechaCol = -1;
          categoriaCol = -1;
          detalleCol = -1;
          montoCol = -1;
          contenedorCol = -1;
          
          for (let j = 0; j < row.length; j++) {
            const cell = String(row[j] || '').toUpperCase().trim();
            if (cell === 'FECHA') fechaCol = j;
            if (cell === 'CATEGORIA' || cell === 'CATEGORÍA') categoriaCol = j;
            if (cell === 'DETALLE') detalleCol = j;
            if (cell === 'MONTO') montoCol = j;
            if (cell.includes('CONTENEDOR')) contenedorCol = j;
          }
          
          // If we found FECHA and MONTO, this is the header row
          if (fechaCol >= 0 && montoCol >= 0) {
            headerRowIndex = i;
            break;
          }
        }
        
        if (headerRowIndex === -1 || fechaCol === -1 || montoCol === -1) {
          reject(new Error('No se encontraron las columnas FECHA y MONTO en la hoja "input_costos". Verifica que el Excel tenga las columnas: ITEM, FECHA, CATEGORIA, DETALLE, MONTO, KM.'));
          return;
        }
        
        const expenses: ParsedExpense[] = [];
        
        // Process data rows (start after header row)
        for (let i = headerRowIndex + 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || row.length === 0) continue;
          
          // Skip empty rows
          if (!row[fechaCol] && !row[montoCol]) continue;
          
          const fecha = parseFechaExcel(row[fechaCol]);
          if (!fecha) continue;
          
          const monto = limpiarMontoInteligente(row[montoCol]);
          if (monto <= 0) continue;
          
          const detalle = String(row[detalleCol] || '').trim();
          const detalleUpper = detalle.toUpperCase();
          
          // Filter out sueldos/imposiciones to avoid duplication
          if (detalleUpper.includes('SUELDO') || 
              detalleUpper.includes('IMPOSICIONES') || 
              detalleUpper.includes('PREVIRED')) {
            continue;
          }
          
          const categoria = String(row[categoriaCol] || 'GASTO GENERAL').trim();
          const contenedor = contenedorCol >= 0 ? String(row[contenedorCol] || '').trim() : undefined;
          
          expenses.push({
            fecha,
            tipo: categoria || 'VARIABLE', // Default to VARIABLE if empty
            descripcion: detalle || categoria,
            monto,
            proveedor: detalle || categoria,
            contenedor,
          });
        }
        
        resolve(expenses);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}


