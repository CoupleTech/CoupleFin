import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import { Button, Input, Select, PageHeader, Toggle } from '../components/ui'
import { ArrowLeft, Save, Receipt, Calculator, Building, Landmark, Paperclip, X, Camera, Network } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import imageCompression from 'browser-image-compression'
import { isPeriodoFechado } from '../lib/gatekeeper'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { format } from 'date-fns'
import { toast } from '../store/useToastStore'

const tiposLancamento = [
  { value: 'nota_fiscal', label: 'Nota Fiscal' },
  { value: 'manual', label: 'Lançamento Manual / Avulso' },
]

const subtiposPorTipo: Record<string, { value: string, label: string }[]> = {
  'nota_fiscal': [
    { value: 'nfse', label: 'NFS-e (Serviço)' },
    { value: 'nota_talao', label: 'Nota Talão' },
    { value: 'nota_consumo', label: 'Nota de Consumo' },
  ],
  'manual': [
    { value: 'salario', label: 'Salários e Encargos' },
    { value: 'taxa', label: 'Taxas e Impostos' },
    { value: 'contrato', label: 'Contrato Recorrente' },
    { value: 'multa', label: 'Multas e Juros' },
    { value: 'saque', label: 'Saque' },
    { value: 'transferencia_empresa', label: 'Transferência entre Empresas' },
    { value: 'transferencia_conta', label: 'Transferência entre Contas' },
    { value: 'avulso', label: 'Outro (Avulso)' }
  ]
}

export default function NovoLancamento() {
  const navigate = useNavigate()
  const { empresaAtivaId, empresas } = useAppStore()
  const grupo_id = empresas.length > 0 ? empresas[0].grupo_id : null

  // Loading states
  const [loadingDados, setLoadingDados] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isScanning, setIsScanning] = useState(false)

  // Catálogos
  const [centrosCusto, setCentrosCusto] = useState<{id: string, nome: string}[]>([])
  const [tiposDespesa, setTiposDespesa] = useState<{id: string, nome: string}[]>([])
  const [contas, setContas] = useState<{id: string, nome: string}[]>([])
  const [destinos, setDestinos] = useState<{id: string, nome: string}[]>([])
  const [fornecedores, setFornecedores] = useState<{id: string, razao_social: string}[]>([])

  // Formulário
  const [formData, setFormData] = useState({
    tipo: 'manual',
    subtipo: 'avulso',
    valor: '',
    descricao: '',
    data_competencia: format(new Date(), 'yyyy-MM-dd'),
    data_vencimento: format(new Date(), 'yyyy-MM-dd'),
    data_pagamento: '',
    ja_pago: false, // helper para UI
    
    fornecedor_id: '',
    centro_custo_id: '',
    tipo_despesa_id: '',
    conta_id: '',
    destino_pagamento_id: '',
    
    // Condicionais (NF)
    chave_acesso: '',
    numero_documento: '',
    
    // Condicionais (Transferência)
    empresa_destino_id: '',
    conta_destino_id: ''
  })

  // Arquivos
  const [arquivos, setArquivos] = useState<File[]>([])

  // Rateio
  const [isRateio, setIsRateio] = useState(false)
  const [empresasRateio, setEmpresasRateio] = useState<string[]>([])

  useEffect(() => {
    if (empresaAtivaId && grupo_id) {
      carregarCatalogos()
      if (empresasRateio.length === 0) setEmpresasRateio([empresaAtivaId])
    }
  }, [empresaAtivaId, grupo_id])

  // Se o tipo mudar, ajusta o subtipo padrão
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      subtipo: subtiposPorTipo[prev.tipo][0].value
    }))
  }, [formData.tipo])

  const carregarCatalogos = async () => {
    setLoadingDados(true)
    
    const [resCC, resTD, resContas, resDest, resForn] = await Promise.all([
      supabase.from('centro_custo').select('id, nome').eq('empresa_id', empresaAtivaId).eq('ativo', true),
      supabase.from('tipo_despesa').select('id, nome').eq('empresa_id', empresaAtivaId).eq('ativo', true),
      supabase.from('contas').select('id, nome').eq('empresa_id', empresaAtivaId).eq('ativo', true),
      supabase.from('destinos_pagamento').select('id, nome').eq('empresa_id', empresaAtivaId).eq('ativo', true),
      supabase.from('fornecedores').select('id, razao_social').eq('grupo_id', grupo_id).eq('ativo', true)
    ])

    if (resCC.data) setCentrosCusto(resCC.data)
    if (resTD.data) setTiposDespesa(resTD.data)
    if (resContas.data) setContas(resContas.data)
    if (resDest.data) setDestinos(resDest.data)
    if (resForn.data) setFornecedores(resForn.data)

    setLoadingDados(false)
  }

  useEffect(() => {
    if (isScanning) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: {width: 250, height: 250} },
        /* verbose= */ false
      )

      scanner.render(
        (decodedText) => {
          // Extrair 44 dígitos se houver URL
          const match = decodedText.match(/\d{44}/)
          if (match) {
            setFormData(prev => ({ ...prev, chave_acesso: match[0] }))
          } else {
            setFormData(prev => ({ ...prev, chave_acesso: decodedText }))
          }
          scanner.clear()
          setIsScanning(false)
        },
        () => {
          // ignore error
        }
      )

      return () => {
        scanner.clear().catch(console.error)
      }
    }
  }, [isScanning])

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!empresaAtivaId) return

    setIsSubmitting(true)
    
    // VALIDACAO DO GATEKEEPER
    const fechado = await isPeriodoFechado(empresaAtivaId, formData.data_competencia)
    if (fechado) {
      toast.error("⚠️ ERRO: A data de competência selecionada pertence a um mês já FECHADO. Não é possível registrar lançamentos neste período.")
      setIsSubmitting(false)
      return
    }

    const arrayEmpresas = isRateio && empresasRateio.length > 0 && formData.subtipo !== 'transferencia_empresa' && formData.subtipo !== 'transferencia_conta' ? empresasRateio : [empresaAtivaId]
    const valorTotal = parseFloat(formData.valor) || 0
    const valorUnitario = valorTotal / arrayEmpresas.length
    
    let idsCriados: string[] = []
    
    // Obter nomes originais para tentar match nas outras empresas
    const nomeTD = formData.tipo_despesa_id ? tiposDespesa.find(t => t.id === formData.tipo_despesa_id)?.nome : null
    const nomeCC = formData.centro_custo_id ? centrosCusto.find(t => t.id === formData.centro_custo_id)?.nome : null

    for (const empId of arrayEmpresas) {
      let targetTD = null
      let targetCC = null

      if (empId === empresaAtivaId) {
        targetTD = formData.tipo_despesa_id || null
        targetCC = formData.centro_custo_id || null
      } else {
        if (nomeTD) {
          const { data } = await supabase.from('tipo_despesa').select('id').eq('empresa_id', empId).eq('nome', nomeTD).eq('ativo', true).single()
          if (data) targetTD = data.id
        }
        if (nomeCC) {
          const { data } = await supabase.from('centro_custo').select('id').eq('empresa_id', empId).eq('nome', nomeCC).eq('ativo', true).single()
          if (data) targetCC = data.id
        }
      }

      const payload = {
        empresa_id: empId,
        tipo: formData.tipo,
        subtipo: formData.subtipo,
        valor: valorUnitario,
        descricao: arrayEmpresas.length > 1 ? `${formData.descricao} (Rateio)` : formData.descricao,
        data_competencia: formData.data_competencia,
        data_vencimento: formData.data_vencimento || null,
        data_pagamento: (formData.ja_pago && formData.data_pagamento && empId === empresaAtivaId) ? formData.data_pagamento : null,
        status_pagamento: (formData.ja_pago && empId === empresaAtivaId) ? 'pago' : 'pendente',
        
        // Relacionamentos básicos
        centro_custo_id: targetCC,
        tipo_despesa_id: targetTD,
        conta_id: empId === empresaAtivaId ? (formData.conta_id || null) : null,
        
        // Opcionais/Condicionais
        fornecedor_id: formData.fornecedor_id || null,
        destino_pagamento_id: empId === empresaAtivaId ? (formData.destino_pagamento_id || null) : null,
        chave_acesso: formData.tipo === 'nota_fiscal' ? formData.chave_acesso : null,
        numero_documento: formData.tipo === 'nota_fiscal' ? formData.numero_documento : null,
        
        // Transferências
        empresa_origem_id: formData.subtipo === 'transferencia_empresa' ? empresaAtivaId : null,
        empresa_destino_id: formData.subtipo === 'transferencia_empresa' ? formData.empresa_destino_id : null,
        conta_origem_id: formData.subtipo === 'transferencia_conta' ? formData.conta_id : null,
        conta_destino_id: formData.subtipo === 'transferencia_conta' ? formData.conta_destino_id : null,
      }

      const { data: lancamento, error } = await supabase.from('lancamentos').insert([payload]).select().single()
      
      if (error) {
        toast.error(`Erro ao salvar rateio na empresa (${empId}): ` + error.message)
      } else if (lancamento) {
        idsCriados.push(lancamento.id)
      }
    }

    // 2. Upload de Anexos se houver
    if (idsCriados.length > 0 && arquivos.length > 0) {
      const primeiroId = idsCriados[0]
      for (const arquivo of arquivos) {
        let arquivoParaUpload = arquivo
        const ext = arquivo.name.split('.').pop()?.toLowerCase()
        const isImagem = arquivo.type.startsWith('image/')

        // Comprimir se for imagem para economizar storage do Supabase Free
        if (isImagem) {
          try {
            const options = {
              maxSizeMB: 1, // max 1MB
              maxWidthOrHeight: 1920,
              useWebWorker: true,
              initialQuality: 0.8
            }
            arquivoParaUpload = await imageCompression(arquivo, options) as File
          } catch (error) {
            console.error("Erro ao comprimir imagem. Enviando original:", error)
          }
        }

        const path = `${empresaAtivaId}/${primeiroId}/${Date.now()}_${arquivoParaUpload.name}`
        
        const { error: uploadError } = await supabase.storage
          .from('anexos')
          .upload(path, arquivoParaUpload)

        if (!uploadError) {
          // Obter URL publica (assumindo bucket público para leitura, ou assinado se privado - usaremos url_publica pra simplificar)
          const { data: { publicUrl } } = supabase.storage.from('anexos').getPublicUrl(path)
          
          let tipo_arquivo = 'imagem'
          if (ext === 'pdf') tipo_arquivo = 'pdf'
          if (ext === 'xml') tipo_arquivo = 'xml'

          const insertAnexos = idsCriados.map(lid => ({
            lancamento_id: lid,
            arquivo_url: publicUrl,
            tipo_arquivo
          }))

          await supabase.from('lancamento_anexos').insert(insertAnexos)
        } else {
          console.error("Falha no upload do anexo:", uploadError)
        }
      }
    }

    // TODO: Gravar histórico de auditoria aqui (ou via trigger no BD)
    setIsSubmitting(false)
    navigate('/financeiro')
  }

  // Helpers para opções dos selects
  const opsCC = [{ value: '', label: 'Selecione...' }, ...centrosCusto.map(c => ({ value: c.id, label: c.nome }))]
  const opsTD = [{ value: '', label: 'Selecione...' }, ...tiposDespesa.map(c => ({ value: c.id, label: c.nome }))]
  const opsContas = [{ value: '', label: 'Selecione...' }, ...contas.map(c => ({ value: c.id, label: c.nome }))]
  const opsDestinos = [{ value: '', label: 'Selecione...' }, ...destinos.map(c => ({ value: c.id, label: c.nome }))]
  const opsForn = [{ value: '', label: 'Nenhum / Selecione...' }, ...fornecedores.map(c => ({ value: c.id, label: c.razao_social }))]
  const opsEmpresas = [{ value: '', label: 'Selecione...' }, ...empresas.filter(e => e.id !== empresaAtivaId).map(c => ({ value: c.id, label: c.nome_fantasia }))]

  const isTransfConta = formData.subtipo === 'transferencia_conta'
  const isTransfEmpresa = formData.subtipo === 'transferencia_empresa'

  return (
    <Layout>
      <PageHeader
        title="Novo Lançamento"
        subtitle="Registre uma nova movimentação financeira para a empresa ativa."
        action={
          <Button 
            onClick={() => navigate('/financeiro')} 
            variant="ghost"
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Voltar
          </Button>
        }
      />

      <div className="max-w-5xl mx-auto">
        <form onSubmit={handleSalvar} className="space-y-6">
          
          {/* SEÇÃO 1: Tipo de Lançamento */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                Origem do Lançamento
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Tipo de Registro"
                value={formData.tipo}
                onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                options={tiposLancamento}
                required
              />
              <Select
                label="Subtipo"
                value={formData.subtipo}
                onChange={(e) => setFormData({...formData, subtipo: e.target.value})}
                options={subtiposPorTipo[formData.tipo] || []}
                required
              />
              
              {formData.tipo === 'nota_fiscal' && (
                <>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">Chave de Acesso</label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={formData.chave_acesso}
                        onChange={(e) => setFormData({...formData, chave_acesso: e.target.value})}
                        placeholder="44 dígitos numéricos"
                        className="font-mono flex-1"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setIsScanning(!isScanning)}
                        icon={<Camera className="w-5 h-5" />}
                        title="Ler Código de Barras / QR"
                      />
                    </div>
                    {isScanning && (
                      <div className="mt-2 w-full max-w-sm mx-auto overflow-hidden rounded-lg border border-slate-200">
                        <div id="reader" className="w-full"></div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          className="w-full text-danger-600 hover:bg-danger-50"
                          onClick={() => setIsScanning(false)}
                        >
                          Cancelar Leitura
                        </Button>
                      </div>
                    )}
                  </div>
                  <Input
                    label="Número do Documento (NFe / Danfe)"
                    type="text"
                    value={formData.numero_documento}
                    onChange={(e) => setFormData({...formData, numero_documento: e.target.value})}
                    placeholder="Ex: 0001234"
                  />
                </>
              )}
            </div>
          </div>

          {/* SEÇÃO 2: Dados Básicos */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" />
                Dados do Lançamento
              </h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Input
                    label="Valor Total (R$)"
                    type="number"
                    step="0.01"
                    required
                    value={formData.valor}
                    onChange={(e) => setFormData({...formData, valor: e.target.value})}
                    placeholder="0.00"
                    className="text-lg font-medium"
                  />
                  {!isTransfConta && !isTransfEmpresa && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <Toggle
                        checked={isRateio}
                        onChange={setIsRateio}
                        label={<span className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><Network className="w-4 h-4 text-primary" /> Ratear entre Empresas?</span>}
                      />
                      
                      {isRateio && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <p className="text-xs text-slate-500 mb-2">O valor total será dividido igualmente entre as empresas selecionadas.</p>
                          <div className="grid grid-cols-1 gap-2">
                            {empresas.map(emp => (
                              <label key={emp.id} className="flex items-center gap-2 cursor-pointer text-sm">
                                <input
                                  type="checkbox"
                                  checked={empresasRateio.includes(emp.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) setEmpresasRateio([...empresasRateio, emp.id])
                                    else {
                                      if (empresasRateio.length > 1) {
                                        setEmpresasRateio(empresasRateio.filter(id => id !== emp.id))
                                      }
                                    }
                                  }}
                                  className="rounded border-slate-300 text-primary focus:ring-primary"
                                />
                                {emp.nome_fantasia || emp.razao_social}
                              </label>
                            ))}
                          </div>
                          
                          {empresasRateio.length > 0 && formData.valor && (
                            <div className="mt-3 p-2 bg-blue-50 text-blue-700 rounded text-sm text-center">
                              {empresasRateio.length} lançamentos de <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(formData.valor) / empresasRateio.length)}</strong>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <Input
                  label="Descrição / Referência"
                  type="text"
                  required
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  placeholder="Ex: Compra de material, Pagamento de Internet..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input
                  label="Data de Competência"
                  type="date"
                  required
                  value={formData.data_competencia}
                  onChange={(e) => {
                    const newVal = e.target.value
                    setFormData(prev => ({
                      ...prev, 
                      data_competencia: newVal,
                      data_vencimento: (prev.data_vencimento === prev.data_competencia || !prev.data_vencimento) ? newVal : prev.data_vencimento,
                      // Se já estiver pago e a data de pagamento estiver igual à competência anterior, avança ela também
                      data_pagamento: prev.ja_pago && (prev.data_pagamento === prev.data_competencia || !prev.data_pagamento) ? newVal : prev.data_pagamento
                    }))
                  }}
                />
                <Input
                  label="Data de Vencimento"
                  type="date"
                  required={!formData.ja_pago}
                  value={formData.data_vencimento}
                  onChange={(e) => setFormData({...formData, data_vencimento: e.target.value})}
                />
                <div className="space-y-3">
                  <p className="block text-sm font-medium text-slate-700">Status</p>
                  <Toggle
                    checked={formData.ja_pago}
                    onChange={(c) => setFormData({...formData, ja_pago: c, data_pagamento: c ? formData.data_vencimento || formData.data_competencia : ''})}
                    label={formData.ja_pago ? 'Já foi pago' : 'Pendente de Pagamento'}
                  />
                </div>
              </div>

              {formData.ja_pago && (
                <div className="w-full md:w-1/3">
                  <Input
                    label="Data Efetiva do Pagamento"
                    type="date"
                    required
                    value={formData.data_pagamento}
                    onChange={(e) => setFormData({...formData, data_pagamento: e.target.value})}
                  />
                </div>
              )}
            </div>
          </div>

          {/* SEÇÃO 3: Classificação (Dinâmica) */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Building className="w-5 h-5 text-primary" />
                Classificação Contábil
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {!isTransfConta && !isTransfEmpresa && (
                <Select
                  label="Fornecedor (Opcional)"
                  value={formData.fornecedor_id}
                  onChange={(e) => setFormData({...formData, fornecedor_id: e.target.value})}
                  options={opsForn}
                  disabled={loadingDados}
                />
              )}

              <Select
                label="Tipo de Despesa/Receita (DRE)"
                value={formData.tipo_despesa_id}
                onChange={(e) => setFormData({...formData, tipo_despesa_id: e.target.value})}
                options={opsTD}
                required={!isTransfConta}
                disabled={loadingDados || isTransfConta}
              />
              
              <Select
                label="Centro de Custo"
                value={formData.centro_custo_id}
                onChange={(e) => setFormData({...formData, centro_custo_id: e.target.value})}
                options={opsCC}
                required={!isTransfConta}
                disabled={loadingDados || isTransfConta}
              />

              {!isTransfConta && !isTransfEmpresa && (
                <Select
                  label="Destino (Agrupamento)"
                  value={formData.destino_pagamento_id}
                  onChange={(e) => setFormData({...formData, destino_pagamento_id: e.target.value})}
                  options={opsDestinos}
                  disabled={loadingDados}
                />
              )}
            </div>
          </div>

          {/* SEÇÃO 4: Conta Bancária / Transferência */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Landmark className="w-5 h-5 text-primary" />
                Origem / Destino do Dinheiro
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label={isTransfConta || isTransfEmpresa ? "Conta de Origem (Desta Empresa)" : "Conta de Pagamento/Recebimento"}
                value={formData.conta_id}
                onChange={(e) => setFormData({...formData, conta_id: e.target.value})}
                options={opsContas}
                required={isTransfConta || isTransfEmpresa}
                disabled={loadingDados}
              />

              {isTransfConta && (
                <Select
                  label="Conta de Destino (Desta Empresa)"
                  value={formData.conta_destino_id}
                  onChange={(e) => setFormData({...formData, conta_destino_id: e.target.value})}
                  options={opsContas}
                  required
                  disabled={loadingDados}
                />
              )}

              {isTransfEmpresa && (
                <Select
                  label="Empresa de Destino"
                  value={formData.empresa_destino_id}
                  onChange={(e) => setFormData({...formData, empresa_destino_id: e.target.value})}
                  options={opsEmpresas}
                  required
                  disabled={loadingDados}
                />
              )}
            </div>
          </div>

          {/* SEÇÃO 5: Anexos */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-primary" />
                Anexos e Comprovantes
              </h3>
            </div>
            <div className="p-6">
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors">
                <input 
                  type="file" 
                  id="file-upload" 
                  multiple 
                  className="hidden"
                  accept=".pdf,.xml,image/*"
                  onChange={(e) => {
                    if (e.target.files) {
                      setArquivos(prev => [...prev, ...Array.from(e.target.files!)])
                    }
                  }}
                />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-3">
                    <Paperclip className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium text-primary hover:underline">
                    Clique para selecionar arquivos
                  </span>
                  <span className="text-xs text-slate-400 mt-1">
                    (PDF, XML ou Imagem)
                  </span>
                </label>
              </div>

              {arquivos.length > 0 && (
                <div className="mt-4 space-y-2">
                  {arquivos.map((arq, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
                      <span className="text-sm text-slate-700 font-medium truncate">{arq.name}</span>
                      <button 
                        type="button" 
                        onClick={() => setArquivos(arquivos.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-danger p-1 rounded hover:bg-danger-50 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4 justify-end pt-4">
            <Button 
              type="button" 
              variant="secondary" 
              size="lg"
              onClick={() => navigate('/financeiro')}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              size="lg"
              icon={<Save className="w-5 h-5" />}
              loading={isSubmitting}
            >
              Registrar Lançamento
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
