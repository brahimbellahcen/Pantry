import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/api/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { toast } from 'react-hot-toast'
import { Plus, Trash2, MapPin } from 'lucide-react'
import type { Address } from '@/types'

interface AddressForm {
  label: string; line1: string; line2: string
  city: string; state: string; postal_code: string; country: string; is_default: boolean
}

const emptyAddr: AddressForm = { label: '', line1: '', line2: '', city: '', state: '', postal_code: '', country: 'US', is_default: false }

export default function AccountProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState({ full_name: user?.full_name ?? '', phone: user?.phone ?? '' })
  const [addresses, setAddresses] = useState<Address[]>(user?.addresses ?? [])
  const [savingProfile, setSavingProfile] = useState(false)
  const [showAddrForm, setShowAddrForm] = useState(false)
  const [addrForm, setAddrForm] = useState<AddressForm>(emptyAddr)
  const [savingAddr, setSavingAddr] = useState(false)

  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [savingPw, setSavingPw] = useState(false)
  const [pwError, setPwError] = useState('')

  useEffect(() => {
    apiClient.get('/users/me/addresses').then(r => setAddresses(r.data)).catch(() => {})
  }, [])

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingProfile(true)
    try {
      await apiClient.patch('/users/me', profile)
      toast.success('Profile updated')
    } catch { toast.error('Failed to update profile') }
    finally { setSavingProfile(false) }
  }

  const addAddress = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingAddr(true)
    try {
      const r = await apiClient.post('/users/me/addresses', addrForm)
      setAddresses(prev => [...prev, r.data])
      setShowAddrForm(false); setAddrForm(emptyAddr)
      toast.success('Address added')
    } catch (err: any) { toast.error(err?.response?.data?.detail ?? 'Failed') }
    finally { setSavingAddr(false) }
  }

  const deleteAddress = async (id: number) => {
    await apiClient.delete(`/users/me/addresses/${id}`)
    setAddresses(prev => prev.filter(a => a.id !== id))
    toast.success('Address removed')
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault(); setPwError('')
    if (pwForm.new_password !== pwForm.confirm) { setPwError('Passwords do not match'); return }
    if (pwForm.new_password.length < 8) { setPwError('Minimum 8 characters'); return }
    setSavingPw(true)
    try {
      await apiClient.post('/auth/change-password', { current_password: pwForm.current_password, new_password: pwForm.new_password })
      toast.success('Password changed'); setPwForm({ current_password: '', new_password: '', confirm: '' })
    } catch (err: any) { setPwError(err?.response?.data?.detail ?? 'Failed') }
    finally { setSavingPw(false) }
  }

  const setAddr = (k: keyof AddressForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAddrForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Account</h1>

      {/* Profile */}
      <form onSubmit={saveProfile} className="card p-5 space-y-4">
        <h2 className="font-bold text-gray-900">Personal Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Full name" value={profile.full_name}
            onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} />
          <Input label="Phone" type="tel" value={profile.phone}
            onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
        </div>
        <Input label="Email" value={user?.email ?? ''} disabled hint="Email cannot be changed" />
        <Button type="submit" isLoading={savingProfile} size="sm">Save Changes</Button>
      </form>

      {/* Addresses */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Saved Addresses</h2>
          <Button size="sm" variant="secondary" onClick={() => setShowAddrForm(v => !v)}>
            <Plus className="h-4 w-4" /> Add Address
          </Button>
        </div>

        {showAddrForm && (
          <form onSubmit={addAddress} className="border rounded-lg p-4 mb-4 space-y-3 bg-gray-50">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Label" placeholder="Home / Work" value={addrForm.label} onChange={setAddr('label')} />
              <Input label="Street address" required value={addrForm.line1} onChange={setAddr('line1')} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input label="City" required value={addrForm.city} onChange={setAddr('city')} />
              <Input label="State" value={addrForm.state} onChange={setAddr('state')} />
              <Input label="Postal code" required value={addrForm.postal_code} onChange={setAddr('postal_code')} />
            </div>
            <div className="flex items-center gap-4">
              <Input label="Country" value={addrForm.country} onChange={setAddr('country')} className="flex-1" />
              <label className="flex items-center gap-2 text-sm mt-5">
                <input type="checkbox" checked={addrForm.is_default}
                  onChange={e => setAddrForm(f => ({ ...f, is_default: e.target.checked }))} /> Default
              </label>
            </div>
            <div className="flex gap-2">
              <Button type="submit" isLoading={savingAddr} size="sm">Save</Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowAddrForm(false)}>Cancel</Button>
            </div>
          </form>
        )}

        {addresses.length === 0 ? (
          <p className="text-sm text-gray-400">No addresses saved yet.</p>
        ) : (
          <div className="space-y-2">
            {addresses.map(addr => (
              <div key={addr.id} className="flex items-start justify-between rounded-lg border p-3">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-brand-500 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    {addr.label && <p className="font-medium text-gray-900">{addr.label}</p>}
                    <p className="text-gray-700">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
                    <p className="text-gray-500">{addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.postal_code}, {addr.country}</p>
                    {addr.is_default && <span className="text-xs text-brand-600 font-medium">Default</span>}
                  </div>
                </div>
                <button onClick={() => deleteAddress(addr.id)} className="text-gray-300 hover:text-red-500 ml-2">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Change password */}
      <form onSubmit={changePassword} className="card p-5 space-y-4">
        <h2 className="font-bold text-gray-900">Change Password</h2>
        <Input label="Current password" type="password" required value={pwForm.current_password}
          onChange={e => setPwForm(p => ({ ...p, current_password: e.target.value }))} />
        <Input label="New password" type="password" required value={pwForm.new_password}
          onChange={e => setPwForm(p => ({ ...p, new_password: e.target.value }))} hint="Minimum 8 characters" />
        <Input label="Confirm new password" type="password" required value={pwForm.confirm}
          onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} />
        {pwError && <p className="text-sm text-red-600">{pwError}</p>}
        <Button type="submit" isLoading={savingPw} size="sm">Update Password</Button>
      </form>
    </div>
  )
}
