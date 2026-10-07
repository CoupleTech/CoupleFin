import { supabase } from './supabase'
import { format, parseISO } from 'date-fns'

/**
 * Verifica se a data de competência fornecida pertence a um período contábil fechado.
 * @param empresaId ID da empresa
 * @param dataCompetencia Data no formato 'YYYY-MM-DD'
 * @returns true se estiver fechado, false se estiver aberto ou não existir registro
 */
export async function isPeriodoFechado(empresaId: string, dataCompetencia: string): Promise<boolean> {
  if (!empresaId || !dataCompetencia) return false

  // Converter a data para o primeiro dia do mês (YYYY-MM-01) para bater com a tabela
  // A data base é '2026-09-15' -> '2026-09-01'
  let dataObj: Date;
  
  if (dataCompetencia.includes('T')) {
    dataObj = parseISO(dataCompetencia);
  } else {
    // Tratar timezone para não voltar um dia
    const parts = dataCompetencia.split('-');
    dataObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  }

  const competenciaFormatada = format(dataObj, 'yyyy-MM-01')

  const { data, error } = await supabase
    .from('periodos_fechamento')
    .select('status')
    .eq('empresa_id', empresaId)
    .eq('competencia', competenciaFormatada)
    .maybeSingle()

  if (error || !data) {
    return false // Se não achar o período, assume que está aberto
  }

  return data.status === 'fechado'
}
