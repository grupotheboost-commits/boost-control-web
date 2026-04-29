
'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

type Client = {
  id: string
  name: string
  company: string | null
  whatsapp: string | null
  instagram: string | null
  status: string | null
}

type Service = {
  id: string
  name: string
  value: number | null
  type: string | null
}

type Sale = {
  id: string
  charged_value: number | null
  paid_value: number | null
  sale_date: string | null
  due_date: string | null
  is_monthly: boolean | null
  clients?: Client | null
  services?: Service | null
}

const money = (value: number | null | undefined) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function Home() {
  const [tab, setTab] = useState('dashboard')
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [clientForm, setClientForm] = useState({ name: '', company: '', whatsapp: '', instagram: '' })
  const [serviceForm, setServiceForm] = useState({ name: '', value: '', type: 'Avulso' })
  const [saleForm, setSaleForm] = useState({
    client_id: '',
    service_id: '',
    charged_value: '',
    paid_value: '',
    sale_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    is_monthly: false,
  })

  async function loadData() {
    const [clientsRes, servicesRes, salesRes] = await Promise.all([
      supabase.from('clients').select('*').order('created_at', { ascending: false }),
      supabase.from('services').select('*').order('created_at', { ascending: false }),
      supabase.from('sales').select('*, clients(*), services(*)').order('created_at', { ascending: false }),
    ])

    setClients(clientsRes.data || [])
    setServices(servicesRes.data || [])
    setSales((salesRes.data as Sale[]) || [])
  }

  useEffect(() => {
    loadData()
  }, [])

  const totals = useMemo(() => {
    const received = sales.reduce((sum, sale) => sum + Number(sale.paid_value || 0), 0)
    const sold = sales.reduce((sum, sale) => sum + Number(sale.charged_value || 0), 0)
    const pending = sold - received
    const monthlyForecast = sales.filter((sale) => sale.is_monthly).reduce((sum, sale) => sum + Number(sale.charged_value || 0), 0)
    return { received, sold, pending, monthlyForecast }
  }, [sales])

  async function saveClient() {
    if (!clientForm.name.trim()) return alert('Informe o nome do cliente.')
    await supabase.from('clients').insert(clientForm)
    setClientForm({ name: '', company: '', whatsapp: '', instagram: '' })
    loadData()
  }

  async function saveService() {
    if (!serviceForm.name.trim()) return alert('Informe o nome do serviço.')
    await supabase.from('services').insert({
      name: serviceForm.name,
      value: Number(serviceForm.value || 0),
      type: serviceForm.type,
    })
    setServiceForm({ name: '', value: '', type: 'Avulso' })
    loadData()
  }

  async function saveSale() {
    if (!saleForm.client_id || !saleForm.service_id) return alert('Selecione cliente e serviço.')
    await supabase.from('sales').insert({
      client_id: saleForm.client_id,
      service_id: saleForm.service_id,
      charged_value: Number(saleForm.charged_value || 0),
      paid_value: Number(saleForm.paid_value || 0),
      sale_date: saleForm.sale_date,
      due_date: saleForm.due_date || null,
      is_monthly: saleForm.is_monthly,
    })
    setSaleForm({
      client_id: '',
      service_id: '',
      charged_value: '',
      paid_value: '',
      sale_date: new Date().toISOString().slice(0, 10),
      due_date: '',
      is_monthly: false,
    })
    loadData()
  }

  function openWhatsapp(phone?: string | null) {
    const digits = (phone || '').replace(/\D/g, '')
    if (!digits) return
    const finalNumber = digits.startsWith('55') ? digits : `55${digits}`
    window.open(`https://wa.me/${finalNumber}`, '_blank')
  }

  function openInstagram(link?: string | null) {
    if (!link) return
    const finalLink = link.startsWith('http') ? link : `https://instagram.com/${link.replace('@', '')}`
    window.open(finalLink, '_blank')
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <aside className="min-h-screen w-72 border-r border-slate-800 bg-slate-900 p-6">
          <div className="mb-8">
            <div className="text-3xl font-black text-blue-400">⚡ Boost Control</div>
            <div className="mt-1 text-xs font-bold text-slate-400">Gabriel Frossard Sistemas</div>
          </div>

          {[
            ['dashboard', 'Dashboard'],
            ['clientes', 'Clientes'],
            ['servicos', 'Serviços'],
            ['vendas', 'Vendas'],
            ['analise', 'Análise'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`mb-3 w-full rounded-2xl px-4 py-3 text-left font-bold transition ${
                tab === key ? 'bg-blue-600' : 'bg-slate-800 hover:bg-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </aside>

        <section className="flex-1 p-8">
          <h1 className="text-3xl font-black">Boost Control Web</h1>
          <p className="mb-6 text-slate-400">Primeira versão online conectada ao Supabase.</p>

          {tab === 'dashboard' && (
            <>
              <div className="grid grid-cols-4 gap-4">
                <Card title="Recebido" value={money(totals.received)} />
                <Card title="Vendido" value={money(totals.sold)} />
                <Card title="A receber" value={money(totals.pending)} />
                <Card title="Mensal previsto" value={money(totals.monthlyForecast)} />
              </div>
              <Panel title="Últimas vendas">
                <Table headers={['Cliente', 'Serviço', 'Valor', 'Pago', 'Tipo']} rows={sales.slice(0, 8).map((sale) => [
                  sale.clients?.name || '-', sale.services?.name || '-', money(sale.charged_value), money(sale.paid_value), sale.is_monthly ? 'Mensal' : 'Avulso'
                ])} />
              </Panel>
            </>
          )}

          {tab === 'clientes' && (
            <div className="grid grid-cols-[420px_1fr] gap-6">
              <Panel title="Cadastrar cliente">
                <Input label="Nome" value={clientForm.name} onChange={(v) => setClientForm({ ...clientForm, name: v })} />
                <Input label="Empresa" value={clientForm.company} onChange={(v) => setClientForm({ ...clientForm, company: v })} />
                <Input label="WhatsApp" value={clientForm.whatsapp} onChange={(v) => setClientForm({ ...clientForm, whatsapp: v })} />
                <Input label="Instagram" value={clientForm.instagram} onChange={(v) => setClientForm({ ...clientForm, instagram: v })} />
                <button onClick={saveClient} className="mt-4 w-full rounded-xl bg-green-600 py-3 font-black">Salvar cliente</button>
              </Panel>
              <Panel title="Clientes cadastrados">
                <Table headers={['Nome', 'Empresa', 'WhatsApp', 'Instagram']} rows={clients.map((client) => [
                  client.name,
                  client.company || '-',
                  <button key="w" onClick={() => openWhatsapp(client.whatsapp)} className="text-green-400">Abrir</button>,
                  <button key="i" onClick={() => openInstagram(client.instagram)} className="text-purple-400">Abrir</button>,
                ])} />
              </Panel>
            </div>
          )}

          {tab === 'servicos' && (
            <div className="grid grid-cols-[420px_1fr] gap-6">
              <Panel title="Cadastrar serviço">
                <Input label="Nome do serviço" value={serviceForm.name} onChange={(v) => setServiceForm({ ...serviceForm, name: v })} />
                <Input label="Valor padrão" value={serviceForm.value} onChange={(v) => setServiceForm({ ...serviceForm, value: v })} />
                <label className="mt-3 block text-sm font-bold text-slate-400">Tipo</label>
                <select value={serviceForm.type} onChange={(e) => setServiceForm({ ...serviceForm, type: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3">
                  <option>Avulso</option>
                  <option>Mensal</option>
                </select>
                <button onClick={saveService} className="mt-4 w-full rounded-xl bg-green-600 py-3 font-black">Salvar serviço</button>
              </Panel>
              <Panel title="Serviços cadastrados">
                <Table headers={['Serviço', 'Valor', 'Tipo']} rows={services.map((service) => [service.name, money(service.value), service.type || '-'])} />
              </Panel>
            </div>
          )}

          {tab === 'vendas' && (
            <div className="grid grid-cols-[420px_1fr] gap-6">
              <Panel title="Cadastrar venda">
                <label className="mt-3 block text-sm font-bold text-slate-400">Cliente</label>
                <select value={saleForm.client_id} onChange={(e) => setSaleForm({ ...saleForm, client_id: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3">
                  <option value="">Selecione</option>
                  {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                </select>

                <label className="mt-3 block text-sm font-bold text-slate-400">Serviço</label>
                <select value={saleForm.service_id} onChange={(e) => {
                  const service = services.find((s) => s.id === e.target.value)
                  setSaleForm({ ...saleForm, service_id: e.target.value, charged_value: String(service?.value || ''), is_monthly: service?.type === 'Mensal' })
                }} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3">
                  <option value="">Selecione</option>
                  {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
                </select>

                <Input label="Valor cobrado" value={saleForm.charged_value} onChange={(v) => setSaleForm({ ...saleForm, charged_value: v })} />
                <Input label="Valor pago" value={saleForm.paid_value} onChange={(v) => setSaleForm({ ...saleForm, paid_value: v })} />
                <Input label="Data da venda" type="date" value={saleForm.sale_date} onChange={(v) => setSaleForm({ ...saleForm, sale_date: v })} />
                <Input label="Vencimento, se mensal" type="date" value={saleForm.due_date} onChange={(v) => setSaleForm({ ...saleForm, due_date: v })} />

                <label className="mt-4 flex items-center gap-2 font-bold">
                  <input type="checkbox" checked={saleForm.is_monthly} onChange={(e) => setSaleForm({ ...saleForm, is_monthly: e.target.checked })} />
                  Serviço mensal
                </label>

                <button onClick={saveSale} className="mt-4 w-full rounded-xl bg-green-600 py-3 font-black">Salvar venda</button>
              </Panel>
              <Panel title="Vendas cadastradas">
                <Table headers={['Cliente', 'Serviço', 'Valor', 'Pago', 'Falta', 'Tipo']} rows={sales.map((sale) => [
                  sale.clients?.name || '-', sale.services?.name || '-', money(sale.charged_value), money(sale.paid_value), money(Number(sale.charged_value || 0) - Number(sale.paid_value || 0)), sale.is_monthly ? 'Mensal' : 'Avulso'
                ])} />
              </Panel>
            </div>
          )}

          {tab === 'analise' && (
            <Panel title="Análise de serviços">
              <Table headers={['Serviço', 'Cliente', 'Valor', 'Pago', 'Tipo']} rows={sales.map((sale) => [
                sale.services?.name || '-', sale.clients?.name || '-', money(sale.charged_value), money(sale.paid_value), sale.is_monthly ? 'Mensal' : 'Avulso'
              ])} />
            </Panel>
          )}
        </section>
      </div>
    </main>
  )
}

function Card({ title, value }: { title: string; value: string }) {
  return <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5"><p className="text-sm font-bold text-slate-400">{title}</p><p className="mt-2 text-2xl font-black text-blue-300">{value}</p></div>
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-6"><h2 className="mb-4 text-xl font-black">{title}</h2>{children}</div>
}

function Input({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="mt-3 block"><span className="text-sm font-bold text-slate-400">{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-blue-500" /></label>
}

function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-auto rounded-2xl border border-slate-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-800 text-slate-300"><tr>{headers.map((header) => <th key={header} className="px-4 py-3 font-black">{header}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-slate-500">Nenhum registro ainda.</td></tr>}
          {rows.map((row, index) => <tr key={index} className="border-t border-slate-800">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3 text-slate-200">{cell}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  )
}
