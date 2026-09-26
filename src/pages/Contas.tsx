import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import { Button, Input, Select, Modal, EmptyState, PageHeader, Badge, Toggle } from '../components/ui'
import { PageLoading } from '../components/ui/LoadingSpinner'
import { Plus, Edit2, Trash2, Wallet, Check, XCircle, Landmark } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

interface Conta {
  id: string
  nome: string
  banco: string
  agencia: string
  numero_conta: string
  tipo: string
  saldo_inicial: number
  ativo: boolean
  empresa_id: string
  created_at: string
}

const tiposConta = [
  { value: 'corrente', label: 'Conta Corrente' },
  { value: 'poupanca', label: 'Conta Poupança' },
  { value: 'caixa', label: 'Caixa Interno' },
]

export default function Contas() {
  const { empresaAtivaId } = useAppStore()
  const [contas, setContas] = useState<Conta[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({ 
    id: '', 
    nome: '', 
    banco: '',
    agencia: '',
    numero_conta: '',
    tipo: 'corrente',
    saldo_inicial: 0,
    ativo: true
  })

  useEffect(() => {
    if (empresaAtivaId) {
      carregarDados()
    } else {
      setContas([])
      setLoading(false)
    }
  }, [empresaAtivaId])

  const carregarDados = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('contas')
      .select('*')
      .eq('empresa_id', empresaAtivaId)
      .order('nome', { ascending: true })
    
    if (!error && data) setContas(data)
    setLoading(false)
  }

  const openModal = (conta?: Conta) => {
    if (conta) {
      setFormData({ 
        id: conta.id, 
        nome: conta.nome, 
        banco: conta.banco || '',
        agencia: conta.agencia || '',
        numero_conta: conta.numero_conta || '',
        tipo: conta.tipo,
        saldo_inicial: conta.saldo_inicial,
        ativo: conta.ativo
      })
    } else {
      setFormData({ 
        id: '', 
        nome: '', 
        banco: '',
        agencia: '',
        numero_conta: '',
        tipo: 'corrente',
        saldo_inicial: 0,
        ativo: true
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nome.trim() || !formData.tipo || !empresaAtivaId) return

    setIsSubmitting(true)
    
    const payload = {
      nome: formData.nome,
      banco: formData.banco,
      agencia: formData.agencia,
      numero_conta: formData.numero_conta,
      tipo: formData.tipo,
      saldo_inicial: formData.saldo_inicial,
      ativo: formData.ativo,
      empresa_id: empresaAtivaId
    }

    if (formData.id) {
      // Editar
      await supabase.from('contas').update(payload).eq('id', formData.id)
    } else {
      // Criar
      await supabase.from('contas').insert([payload])
    }
    
    setIsSubmitting(false)
    closeModal()
    carregarDados()
  }

  const handleExcluir = async (id: string, nome: string) => {
    if (confirm(`Deseja inativar a conta "${nome}"? Ela deixará de aparecer nas opções de lançamento.`)) {
      await supabase.from('contas').update({ ativo: false }).eq('id', id)
      carregarDados()
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  return (
    <Layout>
      <PageHeader
        title="Contas Financeiras"
        subtitle="Gerencie contas bancárias e caixas da empresa."
        action={
          <Button 
            onClick={() => openModal()} 
            icon={<Plus className="w-4 h-4" />}
            disabled={!empresaAtivaId}
          >
            Nova Conta
          </Button>
        }
      />

      {loading ? (
        <PageLoading />
      ) : !empresaAtivaId ? (
        <EmptyState
          icon={<Wallet className="w-full h-full" />}
          title="Selecione uma empresa"
          description="Você precisa selecionar uma empresa no topo da página para gerenciar suas contas."
        />
      ) : contas.length === 0 ? (
        <EmptyState
          icon={<Wallet className="w-full h-full" />}
          title="Nenhuma conta cadastrada"
          description="Cadastre as contas bancárias e caixas utilizados para pagamentos e recebimentos."
          action={
            <Button 
              onClick={() => openModal()} 
              icon={<Plus className="w-4 h-4" />}
              size="lg"
            >
              Criar Conta
            </Button>
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome da Conta</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Banco</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Agência / Conta</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Saldo Inicial</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {contas.map((conta) => {
                  const tipoObj = tiposConta.find(t => t.value === conta.tipo)
                  return (
                    <tr key={conta.id} className="hover:bg-slate-50/50 transition-colors duration-fast group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center text-primary shrink-0">
                            <Landmark className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-slate-800">{conta.nome}</span>
                            <span className="block text-xs text-slate-500">{tipoObj?.label}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600">{conta.banco || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600 font-mono">
                          {conta.agencia || '-'}{conta.agencia && conta.numero_conta ? ' / ' : ''}{conta.numero_conta || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-800">{formatCurrency(conta.saldo_inicial)}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {conta.ativo ? (
                          <Badge variant="success" icon={<Check className="w-3 h-3" />}>Ativo</Badge>
                        ) : (
                          <Badge variant="danger" icon={<XCircle className="w-3 h-3" />}>Inativo</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openModal(conta)}
                            title="Editar"
                            icon={<Edit2 className="w-3.5 h-3.5" />}
                          />
                          {conta.ativo && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExcluir(conta.id, conta.nome)}
                              title="Inativar"
                              className="!text-slate-400 hover:!text-danger hover:!bg-danger-50"
                              icon={<Trash2 className="w-3.5 h-3.5" />}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile/Tablet Cards */}
          <div className="lg:hidden divide-y divide-slate-100">
            {contas.map((conta) => {
              const tipoObj = tiposConta.find(t => t.value === conta.tipo)
              return (
                <div key={conta.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center text-primary shrink-0">
                        <Landmark className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{conta.nome}</p>
                        <p className="text-xs text-slate-500 truncate">{tipoObj?.label}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openModal(conta)}
                        icon={<Edit2 className="w-3.5 h-3.5" />}
                      />
                      {conta.ativo && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExcluir(conta.id, conta.nome)}
                          className="!text-slate-400 hover:!text-danger hover:!bg-danger-50"
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                        />
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-3 pl-13 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-slate-400">Banco/Ag/CC</p>
                      <p className="text-slate-700 truncate">
                        {conta.banco ? `${conta.banco} - ` : ''}
                        <span className="font-mono">
                          {conta.agencia || '-'}{conta.agencia && conta.numero_conta ? '/' : ''}{conta.numero_conta || ''}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Saldo Inicial</p>
                      <p className="text-slate-700 font-medium">{formatCurrency(conta.saldo_inicial)}</p>
                    </div>
                  </div>
                  
                  <div className="mt-3 pl-13 flex gap-2">
                    {conta.ativo ? (
                      <Badge variant="success" icon={<Check className="w-3 h-3" />}>Ativo</Badge>
                    ) : (
                      <Badge variant="danger" icon={<XCircle className="w-3 h-3" />}>Inativo</Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={formData.id ? 'Editar Conta' : 'Nova Conta'}
        subtitle={formData.id ? 'Altere os dados bancários' : 'Cadastre uma nova conta financeira'}
        icon={<Wallet className="w-5 h-5" />}
        size="lg"
      >
        <form onSubmit={handleSalvar}>
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nome da Conta"
                type="text"
                autoFocus
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                placeholder="Ex: Santander Principal"
                required
              />

              <Select
                label="Tipo de Conta"
                value={formData.tipo}
                onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                options={tiposConta}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Banco (Opcional)"
                type="text"
                value={formData.banco}
                onChange={(e) => setFormData({...formData, banco: e.target.value})}
                placeholder="Ex: 033 - Santander"
              />

              <Input
                label="Agência (Opcional)"
                type="text"
                value={formData.agencia}
                onChange={(e) => setFormData({...formData, agencia: e.target.value})}
                placeholder="Ex: 1234"
                className="font-mono"
              />
              
              <Input
                label="Conta (Opcional)"
                type="text"
                value={formData.numero_conta}
                onChange={(e) => setFormData({...formData, numero_conta: e.target.value})}
                placeholder="Ex: 12345-6"
                className="font-mono"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <Input
                label="Saldo Inicial (R$)"
                type="number"
                step="0.01"
                value={formData.saldo_inicial}
                onChange={(e) => setFormData({...formData, saldo_inicial: parseFloat(e.target.value) || 0})}
                placeholder="0.00"
              />

              <div className="pt-5">
                <Toggle
                  checked={formData.ativo}
                  onChange={(checked) => setFormData({...formData, ativo: checked})}
                  label={formData.ativo ? 'Conta Ativa' : 'Conta Inativa'}
                />
              </div>
            </div>

          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Salvar
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}

