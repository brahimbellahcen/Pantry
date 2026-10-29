import { useState } from 'react'
import { apiClient } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { toast } from 'react-hot-toast'
import { Upload, Download } from 'lucide-react'

export default function AdminCSV() {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    setImporting(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const { data } = await apiClient.post('/csv/products/import', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(data)
      toast.success(`Imported: ${data.created} created, ${data.updated} updated`)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const handleExport = async () => {
    const { data } = await apiClient.get('/csv/products/export', { responseType: 'blob' })
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url; a.download = 'pantry_products.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Bulk Product Import / Export</h1>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Import */}
        <div className="card p-5 space-y-4">
          <h2 className="font-bold text-gray-900">Import from CSV</h2>
          <p className="text-sm text-gray-500">
            Required columns: <code className="bg-gray-100 px-1 rounded">name</code>,{' '}
            <code className="bg-gray-100 px-1 rounded">category_slug</code>,{' '}
            <code className="bg-gray-100 px-1 rounded">price</code>.<br />
            Optional: <code className="bg-gray-100 px-1 rounded">stock</code>,{' '}
            <code className="bg-gray-100 px-1 rounded">unit</code>,{' '}
            <code className="bg-gray-100 px-1 rounded">description</code>,{' '}
            <code className="bg-gray-100 px-1 rounded">image_url</code>,{' '}
            <code className="bg-gray-100 px-1 rounded">is_featured</code>.
          </p>
          <form onSubmit={handleImport} className="space-y-3">
            <input
              type="file" accept=".csv" required
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
            />
            <Button type="submit" isLoading={importing}>
              <Upload className="h-4 w-4" /> Import
            </Button>
          </form>
          {result && (
            <div className="rounded-lg bg-gray-50 p-3 text-sm space-y-1">
              <p className="text-green-700">✅ {result.created} products created</p>
              <p className="text-blue-700">🔄 {result.updated} products updated</p>
              {result.errors > 0 && <p className="text-red-600">⚠️ {result.errors} rows skipped</p>}
              {result.error_details?.map((e: any, i: number) => (
                <p key={i} className="text-xs text-red-500">Row {e.row}: {e.error}</p>
              ))}
            </div>
          )}
        </div>

        {/* Export */}
        <div className="card p-5 space-y-4">
          <h2 className="font-bold text-gray-900">Export to CSV</h2>
          <p className="text-sm text-gray-500">
            Download all active and inactive products as a CSV file. You can edit it and re-import to bulk update.
          </p>
          <Button variant="secondary" onClick={handleExport}>
            <Download className="h-4 w-4" /> Download pantry_products.csv
          </Button>
        </div>
      </div>
    </div>
  )
}
