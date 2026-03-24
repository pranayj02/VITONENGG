'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Buyer = {
  id: string
  name: string
  address: string | null
  gstin: string | null
  state: string | null
  state_code: string | null
  contact_name: string | null
  contact_phone: string | null
  payment_terms: string | null
  created_at: string | null
}

type FormState = {
  name: string
  address: string
  gstin: string
  state: string
  state_code: string
  contact_name: string
  contact_phone: string
  payment_terms: string
}

const emptyForm: FormState = {
  name: '',
  address: '',
  gstin: '',
  state: '',
  state_code: '',
  contact_name: '',
  contact_phone: '',
  payment_terms: '',
}

function getStateFromGSTIN(gstin: string) {
  const prefix = gstin.trim().slice(0, 2)

  const map: Record<string, { state: string; state_code: string }> = {
    '27': { state: 'Maharashtra', state_code: '27' },
    '06': { state: 'Haryana', state_code: '06' },
    '05': { state: 'Uttarakhand', state_code: '05' },
    '24': { state: 'Gujarat', state_code: '24' },
    '29': { state: 'Karnataka', state_code: '29' },
    '33': { state: 'Tamil Nadu', state_code: '33' },
    '07': { state: 'Delhi', state_code: '07' },
  }

  return map[prefix] || { state: '', state_code: prefix || '' }
}

export default function BuyersPage() {
  const supabase = useMemo(() => createClient(), [])
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function loadBuyers() {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('buyers')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setBuyers((data || []) as Buyer[])
    setLoading(false)
  }

  useEffect(() => {
    loadBuyers()
  }, [])

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    const next = { ...form, [key]: value }

    if (key === 'gstin') {
      const gst = String(value).toUpperCase()
      next.gstin = gst
      if (gst.length >= 2) {
        const gstMeta = getStateFromGSTIN(gst)
        if (!next.state) next.state = gstMeta.state
        next.state_code = gstMeta.state_code
      }
    }

    setForm(next)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    if (!form.name.trim()) {
      setError('Buyer name is required.')
      setSaving(false)
      return
    }

    const payload = {
      name: form.name.trim(),
      address: form.address.trim() || null,
      gstin: form.gstin.trim().toUpperCase() || null,
      state: form.state.trim() || null,
      state_code: form.state_code.trim() || null,
      contact_name: form.contact_name.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      payment_terms: form.payment_terms.trim() || null,
    }

    const { error } = await supabase.from('buyers').insert(payload)

    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }

    setSuccess('Buyer added successfully.')
    setForm(emptyForm)
    await loadBuyers()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const ok = window.confirm('Delete this buyer?')
    if (!ok) return

    const { error } = await supabase.from('buyers').delete().eq('id', id)

    if (error) {
      setError(error.message)
      return
    }

    await loadBuyers()
  }

  const filteredBuyers = buyers.filter((buyer) => {
    const haystack = [
      buyer.name,
      buyer.gstin,
      buyer.contact_name,
      buyer.contact_phone,
      buyer.state,
      buyer.payment_terms,
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(search.toLowerCase())
  })

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Buyers</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage customer companies used in the Invoice Creator.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Add Buyer</h2>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Buyer Name *
              </label>
              <input
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                placeholder="BPCL / VVF India / Mahadhan..."
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                GSTIN
              </label>
              <input
                value={form.gstin}
                onChange={(e) => updateField('gstin', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 uppercase outline-none focus:border-slate-500"
                placeholder="27ABCDE1234F1Z5"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  State
                </label>
                <input
                  value={form.state}
                  onChange={(e) => updateField('state', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                  placeholder="Maharashtra"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  State Code
                </label>
                <input
                  value={form.state_code}
                  onChange={(e) => updateField('state_code', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                  placeholder="27"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Address
              </label>
              <textarea
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
                className="min-h-[90px] w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                placeholder="Full billing address"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Contact Name
                </label>
                <input
                  value={form.contact_name}
                  onChange={(e) => updateField('contact_name', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                  placeholder="Mr. Sharma"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Contact Phone
                </label>
                <input
                  value={form.contact_phone}
                  onChange={(e) => updateField('contact_phone', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                  placeholder="+91..."
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Payment Terms
              </label>
              <input
                value={form.payment_terms}
                onChange={(e) => updateField('payment_terms', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                placeholder="30 Days / Advance / Immediate"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Buyer'}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Buyer List</h2>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 md:w-72"
              placeholder="Search buyers..."
            />
          </div>

          {loading ? (
            <div className="py-10 text-sm text-slate-500">Loading buyers...</div>
          ) : filteredBuyers.length === 0 ? (
            <div className="py-10 text-sm text-slate-500">No buyers found.</div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Name
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      GSTIN
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      State
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Contact
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Payment Terms
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBuyers.map((buyer) => (
                    <tr key={buyer.id}>
                      <td className="border-b border-slate-100 px-3 py-3 text-sm text-slate-900">
                        <div className="font-medium">{buyer.name}</div>
                        {buyer.address && (
                          <div className="mt-1 max-w-[280px] text-xs text-slate-500">
                            {buyer.address}
                          </div>
                        )}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 text-sm text-slate-700">
                        {buyer.gstin || '—'}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 text-sm text-slate-700">
                        {buyer.state || '—'}
                        {buyer.state_code ? ` (${buyer.state_code})` : ''}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 text-sm text-slate-700">
                        <div>{buyer.contact_name || '—'}</div>
                        <div className="text-xs text-slate-500">{buyer.contact_phone || ''}</div>
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 text-sm text-slate-700">
                        {buyer.payment_terms || '—'}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 text-right">
                        <button
                          onClick={() => handleDelete(buyer.id)}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
