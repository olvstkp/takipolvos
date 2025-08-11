import React from 'react';
import TypePicker from './TypePicker';

type LabelData = {
  productName: string;
  serialNumber: string;
  entryDate: string;
  expiryDate: string;
  amount: string;
  invoiceNumber: string;
  batchNumber: string;
  supplier: string;
  logo: string;
  barcode?: string;
};

type CompanyLogo = { company_name: string; logo_url: string };

interface Styles {
  title: { font: number; widthMm: number };
  productName: { font: number; wrapWidth: number };
  details: { font: number; lineGap: number; widthMm: number };
  barcode: { height: number; widthMm: number };
}

interface StandardFormProps {
  labelType: string;
  setLabelType: (v: string) => void;
  labelTypeOptions: string[];
  labelData: LabelData;
  setLabelData: (v: LabelData) => void;

  templateName: string;
  setTemplateName: (v: string) => void;
  saving: boolean;
  isDirty: boolean;
  currentTemplateId: string | null;
  setShowSaveDialog: (v: boolean) => void;
  setCurrentTemplateId: (v: string | null) => void;
  setShowTemplateModal: (v: boolean) => void;

  companyLogos: CompanyLogo[];
  logoImages: Record<string, HTMLImageElement | null>;
  selectedCompany: string;
  setSelectedCompany: (v: string) => void;

  labelWidth: number;
  setLabelWidth: (v: number) => void;
  labelHeight: number;
  setLabelHeight: (v: number) => void;
  dpi: 203 | 300 | 600;
  setDpi: (v: 203 | 300 | 600) => void;
  darkness: number;
  setDarkness: (v: number) => void;
  zplDarkness: number;
  setZplDarkness: (v: number) => void;
  showAdvancedSettings: boolean;
  setShowAdvancedSettings: (v: boolean) => void;

  styles: Styles;
  setStyles: (v: Styles) => void;

  validateEan13: (input?: string) => { normalized: string | null; error?: string; checksum?: number };
  // Etiket türüne bağlı alan görünürlüğü
  fieldsConfig?: Record<string, { visible: boolean; required: boolean }> | null;
}

const StandardForm: React.FC<StandardFormProps> = ({
  labelType,
  setLabelType,
  labelData,
  setLabelData,
  templateName,
  setTemplateName,
  saving,
  isDirty,
  currentTemplateId,
  setShowSaveDialog,
  setCurrentTemplateId,
  setShowTemplateModal,
  companyLogos,
  logoImages,
  selectedCompany,
  setSelectedCompany,
  labelWidth,
  setLabelWidth,
  labelHeight,
  setLabelHeight,
  dpi,
  setDpi,
  darkness,
  setDarkness,
  zplDarkness,
  setZplDarkness,
  showAdvancedSettings,
  setShowAdvancedSettings,
  styles,
  setStyles,
  validateEan13,
  fieldsConfig,
  labelTypeOptions,
}) => {
  const isVisible = (key: keyof LabelData): boolean => {
    if (!fieldsConfig) return false;
    const f = fieldsConfig[key as string];
    return f ? f.visible !== false : true;
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Etiket Bilgileri</h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={templateName}
            onChange={(e)=>setTemplateName(e.target.value)}
            placeholder="Taslak adı"
            className="w-44 p-2 text-sm border border-gray-300 rounded"
          />
          <button onClick={()=>setShowSaveDialog(true)} disabled={saving || (!isDirty && !currentTemplateId)} className={`px-3 py-1.5 text-sm text-white rounded ${currentTemplateId ? 'bg-emerald-600' : 'bg-indigo-600'} disabled:opacity-50`}>{currentTemplateId ? 'Güncelle' : 'Kaydet'}</button>
          <button
            type="button"
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded"
            onClick={() => {
              setCurrentTemplateId(null);
              setTemplateName((templateName ? `${templateName} (Kopya)` : 'Yeni Taslak'));
              setShowSaveDialog(true);
            }}
          >Yeni Kaydet</button>
          <button type="button" onClick={()=>setShowTemplateModal(true)} className="px-3 py-1.5 text-sm bg-gray-700 text-white rounded">Şablonlar</button>
        </div>
      </div>

      {/* Etiket Türü Seçimi */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Etiket Türü</label>
        <TypePicker options={labelTypeOptions} value={labelType} onChange={setLabelType} />
      </div>

      <div className="space-y-4">
        {isVisible('productName') && (<div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ürün Adı</label>
          <input
            type="text"
            value={labelData.productName}
            onChange={(e) => setLabelData({ ...labelData, productName: e.target.value })}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Örn: Zeytinyağlı Kastil Sabunu"
          />
        </div>)}

        {isVisible('barcode') && (<div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Barkod (EAN-13)</label>
          <input
            type="text"
            value={labelData.barcode || ''}
            onChange={(e) => setLabelData({ ...labelData, barcode: e.target.value })}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="5901234123457"
          />
          {(() => { const r = validateEan13(labelData.barcode); if (!labelData.barcode) return <p className="text-xs text-gray-500 mt-1">12 haneli girerseniz son haneyi otomatik hesaplarız</p>; if (r.error) return <p className="text-xs mt-1 text-red-600">{r.error}</p>; return <p className="text-xs mt-1 text-emerald-600">Geçerli EAN-13 ✓ (Checksum: {r.checksum})</p>; })()}
        </div>)}

            <div className="grid grid-cols-2 gap-4">
              {isVisible('serialNumber') && (<div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Seri No</label>
            <input
              type="text"
              value={labelData.serialNumber}
              onChange={(e) => setLabelData({ ...labelData, serialNumber: e.target.value })}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="ZKS-2024-001"
            />
              </div>)}
              {isVisible('batchNumber') && (<div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Parti No</label>
            <input
              type="text"
              value={labelData.batchNumber}
              onChange={(e) => setLabelData({ ...labelData, batchNumber: e.target.value })}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="BATCH-001"
            />
              </div>)}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {isVisible('entryDate') && (<div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Giriş Tarihi</label>
            <input
              type="date"
              value={labelData.entryDate}
              onChange={(e) => setLabelData({ ...labelData, entryDate: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>)}
          {isVisible('expiryDate') && (<div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Son Kullanma Tarihi</label>
            <input
              type="date"
              value={labelData.expiryDate}
              onChange={(e) => setLabelData({ ...labelData, expiryDate: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>)}
        </div>

        {isVisible('amount') && (<div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Miktar</label>
          <input
            type="text"
            value={labelData.amount}
            onChange={(e) => setLabelData({ ...labelData, amount: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="500 g"
          />
        </div>)}

        {isVisible('invoiceNumber') && (<div>
          <label className="block text-sm font-medium text-gray-700 mb-1">İrsaliye No</label>
          <input
            type="text"
            value={labelData.invoiceNumber}
            onChange={(e) => setLabelData({ ...labelData, invoiceNumber: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="INV-2024-001"
          />
        </div>)}

        {isVisible('supplier') && (<div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tedarikçi</label>
          <input
            type="text"
            value={labelData.supplier}
            onChange={(e) => setLabelData({ ...labelData, supplier: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Akdeniz Gıda"
          />
        </div>)}

        {isVisible('logo') && (<div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Şirket Logosu</label>
          <div className="flex items-center gap-2 flex-wrap">
            {companyLogos.map((l) => (
              <button
                key={l.company_name}
                type="button"
                onClick={() => setSelectedCompany(l.company_name)}
                className={`px-3 py-2 rounded border ${selectedCompany===l.company_name ? 'border-blue-500 text-blue-600' : 'border-gray-300 text-gray-700'} bg-white hover:bg-gray-50`}
                title={l.company_name}
              >
                {logoImages[l.company_name] ? (
                  <img src={l.logo_url} alt={l.company_name} className="h-6 object-contain" />
                ) : (
                  <span className="text-sm">{l.company_name}</span>
                )}
              </button>
            ))}
            {companyLogos.length===0 && (
              <span className="text-sm text-gray-500">Supabase'de 'company_logo' tablosunda kayıt bulunamadı.</span>
            )}
          </div>
        </div>)}

        {/* Gelişmiş Ayarlar Toggle */}
        <div className="border-t pt-4">
          <button
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium mb-3"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showAdvancedSettings ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Gelişmiş Ayarları Göster
          </button>

          {/* Etiket Boyutu Ayarları - Collapsible */}
          {showAdvancedSettings && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Genişlik (mm)</label>
                  <input
                    type="number"
                    value={labelWidth}
                    onChange={(e) => setLabelWidth(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min={20}
                    max={200}
                    step={0.1}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yükseklik (mm)</label>
                  <input
                    type="number"
                    value={labelHeight}
                    onChange={(e) => setLabelHeight(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min={10}
                    max={100}
                    step={0.1}
                  />
                </div>
              </div>
              {/* Görsel/ZPL koyuluk ayarları */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DPI (ZPL için)</label>
                  <select
                    value={dpi}
                    onChange={(e) => setDpi(Number(e.target.value) as 203 | 300 | 600)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={203}>203 dpi</option>
                    <option value={300}>300 dpi</option>
                    <option value={600}>600 dpi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Koyuluk (Önizleme)</label>
                  <input
                    type="range"
                    min={0.6}
                    max={2}
                    step={0.05}
                    value={darkness}
                    onChange={(e) => setDarkness(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500 mt-1">{Math.round(darkness * 100)}%</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZPL Darkness (^MD 0-30)</label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={zplDarkness}
                    onChange={(e) => setZplDarkness(Math.max(0, Math.min(30, Number(e.target.value))))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Düşük = açık, yüksek = daha koyu baskı</p>
                </div>
              </div>

              {/* Bireysel boyut ayarları (mm) */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Başlık Font (mm)</label>
                  <input type="number" step={0.1} value={styles.title.font} onChange={(e)=>setStyles({ ...styles, title:{ ...styles.title, font:Number(e.target.value) } })} className="w-full p-2 border border-gray-300 rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Font (mm)</label>
                  <input type="number" step={0.1} value={styles.productName.font} onChange={(e)=>setStyles({ ...styles, productName:{ ...styles.productName, font:Number(e.target.value) } })} className="w-full p-2 border border-gray-300 rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Sarma Genişliği (mm)</label>
                  <input type="number" step={0.1} value={styles.productName.wrapWidth} onChange={(e)=>setStyles({ ...styles, productName:{ ...styles.productName, wrapWidth:Number(e.target.value) } })} className="w-full p-2 border border-gray-300 rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Detay Font (mm)</label>
                  <input type="number" step={0.1} value={styles.details.font} onChange={(e)=>setStyles({ ...styles, details:{ ...styles.details, font:Number(e.target.value) } })} className="w-full p-2 border border-gray-300 rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Satır Aralığı (mm)</label>
                  <input type="number" step={0.1} value={styles.details.lineGap} onChange={(e)=>setStyles({ ...styles, details:{ ...styles.details, lineGap:Number(e.target.value) } })} className="w-full p-2 border border-gray-300 rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Barkod Yükseklik (mm)</label>
                  <input type="number" step={0.1} value={styles.barcode.height} onChange={(e)=>setStyles({ ...styles, barcode:{ ...styles.barcode, height:Number(e.target.value) } })} className="w-full p-2 border border-gray-300 rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Barkod Genişliği (mm)</label>
                  <input type="number" step={0.1} min={20} value={styles.barcode.widthMm} onChange={(e)=>setStyles({ ...styles, barcode:{ ...styles.barcode, widthMm:Number(e.target.value) } })} className="w-full p-2 border border-gray-300 rounded" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StandardForm;


