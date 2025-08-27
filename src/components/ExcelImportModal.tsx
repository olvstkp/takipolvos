import React, { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, Download, X, Check, AlertTriangle } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import { stockService } from '../services/stockService'
import type { ExcelStockRow, ImportResult } from '../types/stock'

interface ExcelImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportSuccess: () => void
}

export default function ExcelImportModal({ isOpen, onClose, onImportSuccess }: ExcelImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<ExcelStockRow[]>([])
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'result'>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (selectedFile: File) => {
    try {
      setFile(selectedFile)
      setLoading(true)
      
      const data = await parseExcelFile(selectedFile)
      setPreviewData(data)
      setStep('preview')
    } catch (error: any) {
      alert('Excel dosyası okuma hatası: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const parseExcelFile = (file: File): Promise<ExcelStockRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)
          
          const stockData: ExcelStockRow[] = jsonData.map((row: any) => ({
            stockCode: row['Stok Kodu'] || '',
            stockName: row['Stok Adı'] || '',
            unit: row['BR'] || 'KG',
            initialAmount: parseFloat(row['Kalan Miktar']) || 0,
            category: row['Kategori'] || 'HAMMADDE',
            systemEntryDate: new Date().toISOString().split('T')[0],
            stockEntryDate: new Date().toISOString().split('T')[0],
            expiryDate: undefined,
            supplier: '',
            deliveryInfo: '',
            waybillNumber: ''
          }))
          
          resolve(stockData)
        } catch (error) {
          reject(error)
        }
      }
      
      reader.readAsArrayBuffer(file)
    })
  }

  const handleImport = async () => {
    if (!previewData.length) return
    
    try {
      setLoading(true)
      setStep('importing')
      setImportProgress({ current: 0, total: previewData.length })
      
      // Custom import with progress tracking
      const result = await importWithProgress(previewData)
      
      setImportResult(result)
      setStep('result')
      
    } catch (error: any) {
      alert('Import hatası: ' + error.message)
      setStep('preview') // Go back to preview on error
    } finally {
      setLoading(false)
    }
  }

  const importWithProgress = async (data: ExcelStockRow[]): Promise<ImportResult> => {
    const successes: any[] = []
    const errors: any[] = []

    // First, get all existing stock codes in one go
    const { data: existingCodes } = await supabase
      .from('stock_items')
      .select('stock_code')

    const existingStockCodes = new Set(existingCodes?.map(item => item.stock_code) || [])

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      setImportProgress({ current: i + 1, total: data.length })
      
      try {
        // Check if stock code already exists (using Set for better performance)
        if (existingStockCodes.has(row.stockCode)) {
          errors.push({ 
            row, 
            error: `Stok kodu zaten mevcut: ${row.stockCode}` 
          })
          continue
        }

        // Import this row
        const result = await stockService.importStockFromExcel([row])
        
        if (result.successes.length > 0) {
          successes.push(...result.successes)
          // Add to existing codes set to prevent duplicates within this import
          existingStockCodes.add(row.stockCode)
        }
        if (result.errors.length > 0) {
          errors.push(...result.errors)
        }

        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 50))

      } catch (err: any) {
        errors.push({ 
          row, 
          error: `Beklenmeyen hata: ${err.message}` 
        })
      }
    }

    return { successes, errors }
  }

  const handleClose = () => {
    setFile(null)
    setPreviewData([])
    setImportResult(null)
    setImportProgress({ current: 0, total: 0 })
    setStep('upload')
    setLoading(false)
    onClose()
  }

  const downloadTemplate = () => {
    const templateData = [
      {
        'Stok Kodu': '15001001',
        'Stok Adı': 'ZEYTINYAĞI',
        'BR': 'KG',
        'Kalan Miktar': '0',
        'Kategori': 'Ham madde'
      },
      {
        'Stok Kodu': '15001003',
        'Stok Adı': 'KOSTİK',
        'BR': 'KG',
        'Kalan Miktar': '22',
        'Kategori': 'Ham madde'
      }
    ]
    
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(templateData)
    XLSX.utils.book_append_sheet(wb, ws, 'Stok Verileri')
    XLSX.writeFile(wb, 'stok_import_sablon.xlsx')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Excel Stok İmport</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {step === 'upload' && (
            <div className="space-y-6">
              {/* Template Download */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileSpreadsheet className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="text-blue-800 font-medium">Excel Şablonu</span>
                  </div>
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Şablon İndir
                  </button>
                </div>
                <p className="text-blue-700 text-sm mt-2">
                  Önce şablonu indirin ve verilerinizi doğru formatta hazırlayın.
                </p>
              </div>

              {/* File Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                <div className="text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Excel Dosyasını Yükleyin
                  </h3>
                  <p className="text-gray-600 mb-4">
                    .xlsx veya .xls formatında dosya seçin
                  </p>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0]
                      if (selectedFile) handleFileSelect(selectedFile)
                    }}
                    className="hidden"
                  />
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Yükleniyor...' : 'Dosya Seç'}
                  </button>
                </div>
              </div>

              {/* Format Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Beklenen Format:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>Stok Kodu:</strong> Benzersiz stok kodu</li>
                  <li>• <strong>Stok Adı:</strong> Ürün adı</li>
                  <li>• <strong>BR:</strong> Birim (KG, LT, ADET, vb.)</li>
                  <li>• <strong>Kalan Miktar:</strong> Mevcut stok miktarı</li>
                  <li>• <strong>Kategori:</strong> Ürün kategorisi</li>
                </ul>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Önizleme ({previewData.length} kayıt)
                </h3>
                <div className="space-x-2">
                  <button
                    onClick={() => setStep('upload')}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Geri
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'İçe Aktarılıyor...' : 'İçe Aktar'}
                  </button>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Stok Kodu</th>
                        <th className="px-4 py-2 text-left">Stok Adı</th>
                        <th className="px-4 py-2 text-left">Birim</th>
                        <th className="px-4 py-2 text-left">Miktar</th>
                        <th className="px-4 py-2 text-left">Kategori</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {previewData.slice(0, 50).map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-mono">{row.stockCode}</td>
                          <td className="px-4 py-2">{row.stockName}</td>
                          <td className="px-4 py-2">{row.unit}</td>
                          <td className="px-4 py-2">{row.initialAmount}</td>
                          <td className="px-4 py-2">{row.category}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {previewData.length > 50 && (
                  <div className="bg-gray-50 px-4 py-2 text-sm text-gray-600">
                    ... ve {previewData.length - 50} kayıt daha
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-blue-600 animate-pulse" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  İçe Aktarılıyor...
                </h3>
                <p className="text-gray-600 mb-4">
                  {importProgress.current} / {importProgress.total} kayıt işlendi
                </p>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  ></div>
                </div>

                {/* Progress Text */}
                <div className="text-sm text-gray-500">
                  %{Math.round((importProgress.current / importProgress.total) * 100)} tamamlandı
                </div>
              </div>

              {/* Cancel button */}
              <div className="text-center">
                <button
                  onClick={() => {
                    setStep('preview')
                    setLoading(false)
                  }}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  İptal
                </button>
              </div>
            </div>
          )}

          {step === 'result' && importResult && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  İçe Aktarma Tamamlandı!
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-600 mr-2" />
                    <span className="font-medium text-green-800">
                      Başarılı: {importResult.successes.length}
                    </span>
                  </div>
                </div>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                    <span className="font-medium text-red-800">
                      Hata: {importResult.errors.length}
                    </span>
                  </div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-3 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Hatalar ({importResult.errors.length} adet):
                  </h4>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {importResult.errors.slice(0, 10).map((error, index) => (
                      <div key={index} className="text-sm bg-white border border-red-100 rounded p-2">
                        <div className="font-medium text-red-900">
                          {error.row?.stockCode || 'Bilinmeyen'} - {error.row?.stockName || 'İsimsiz'}
                        </div>
                        <div className="text-red-700 text-xs mt-1">
                          {error.error}
                        </div>
                      </div>
                    ))}
                  </div>
                  {importResult.errors.length > 10 && (
                    <div className="text-xs text-red-600 mt-2 text-center">
                      İlk 10 hata gösteriliyor. Toplam {importResult.errors.length} hata var.
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Yeni Import
                </button>
                <button
                  onClick={() => {
                    onImportSuccess() // Refresh data when user manually closes
                    handleClose()
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Kapat
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
