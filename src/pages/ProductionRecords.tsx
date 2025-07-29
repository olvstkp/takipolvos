import React, { useState } from 'react';
import { Search, Plus, Edit, Trash2, Calendar, Factory, Package, User, Clock, CheckCircle, AlertTriangle, Filter } from 'lucide-react';

interface ProductionRecord {
  id: string;
  productionDate: string;
  batchNumber: string;
  productName: string;
  productType: 'solid' | 'liquid';
  plannedQuantity: number;
  actualQuantity: number;
  unit: string;
  operator: string;
  shift: 'morning' | 'afternoon' | 'night';
  startTime: string;
  endTime: string;
  status: 'completed' | 'in-progress' | 'paused' | 'cancelled';
  qualityCheck: {
    passed: boolean;
    ph: number;
    temperature: number;
    viscosity: string;
    color: string;
    notes: string;
  };
  rawMaterials: {
    id: string;
    name: string;
    plannedAmount: number;
    actualAmount: number;
    unit: string;
    supplier: string;
  }[];
  efficiency: number;
  notes: string;
  createdBy: string;
}

const ProductionRecords: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ProductionRecord | null>(null);
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);

  const [records, setRecords] = useState<ProductionRecord[]>([
    {
      id: '1',
      productionDate: '2024-01-15',
      batchNumber: 'PR-2024-001',
      productName: 'Zeytinyağlı Kastil Sabunu',
      productType: 'solid',
      plannedQuantity: 1000,
      actualQuantity: 980,
      unit: 'adet',
      operator: 'Ahmet Yılmaz',
      shift: 'morning',
      startTime: '08:00',
      endTime: '16:30',
      status: 'completed',
      qualityCheck: {
        passed: true,
        ph: 9.2,
        temperature: 65,
        viscosity: 'Normal',
        color: 'Açık Sarı',
        notes: 'Tüm parametreler normal aralıkta'
      },
      rawMaterials: [
        { id: '1', name: 'Zeytinyağı', plannedAmount: 700, actualAmount: 690, unit: 'ml', supplier: 'Akdeniz Gıda' },
        { id: '2', name: 'Kostik Soda', plannedAmount: 100, actualAmount: 98, unit: 'g', supplier: 'Kimya Dünyası' },
        { id: '3', name: 'Su', plannedAmount: 200, actualAmount: 200, unit: 'ml', supplier: 'Şehir Şebekesi' }
      ],
      efficiency: 98,
      notes: 'Üretim sorunsuz tamamlandı',
      createdBy: 'Ahmet Yılmaz'
    },
    {
      id: '2',
      productionDate: '2024-01-14',
      batchNumber: 'PR-2024-002',
      productName: 'Lavanta Sabunu',
      productType: 'solid',
      plannedQuantity: 500,
      actualQuantity: 485,
      unit: 'adet',
      operator: 'Fatma Demir',
      shift: 'afternoon',
      startTime: '14:00',
      endTime: '22:15',
      status: 'completed',
      qualityCheck: {
        passed: true,
        ph: 8.8,
        temperature: 62,
        viscosity: 'Normal',
        color: 'Mor',
        notes: 'Lavanta aroması yeterli seviyede'
      },
      rawMaterials: [
        { id: '1', name: 'Zeytinyağı', plannedAmount: 350, actualAmount: 345, unit: 'ml', supplier: 'Akdeniz Gıda' },
        { id: '2', name: 'Kostik Soda', plannedAmount: 50, actualAmount: 49, unit: 'g', supplier: 'Kimya Dünyası' },
        { id: '3', name: 'Lavanta Yağı', plannedAmount: 25, actualAmount: 25, unit: 'ml', supplier: 'Doğal Aromalar' },
        { id: '4', name: 'Su', plannedAmount: 100, actualAmount: 100, unit: 'ml', supplier: 'Şehir Şebekesi' }
      ],
      efficiency: 97,
      notes: 'Kalite kontrolü başarılı',
      createdBy: 'Fatma Demir'
    },
    {
      id: '3',
      productionDate: '2024-01-13',
      batchNumber: 'PR-2024-003',
      productName: 'Sıvı El Sabunu',
      productType: 'liquid',
      plannedQuantity: 2000,
      actualQuantity: 1950,
      unit: 'ml',
      operator: 'Mehmet Kaya',
      shift: 'morning',
      startTime: '08:30',
      endTime: '15:45',
      status: 'completed',
      qualityCheck: {
        passed: true,
        ph: 7.5,
        temperature: 25,
        viscosity: 'Akışkan',
        color: 'Şeffaf',
        notes: 'Viskozite ideal seviyede'
      },
      rawMaterials: [
        { id: '1', name: 'Sabun Bazı', plannedAmount: 400, actualAmount: 390, unit: 'g', supplier: 'Kimya Dünyası' },
        { id: '2', name: 'Su', plannedAmount: 1500, actualAmount: 1500, unit: 'ml', supplier: 'Şehir Şebekesi' },
        { id: '3', name: 'Gliserin', plannedAmount: 60, actualAmount: 60, unit: 'ml', supplier: 'Doğal Aromalar' }
      ],
      efficiency: 97.5,
      notes: 'Üretim planlandığı gibi gerçekleşti',
      createdBy: 'Mehmet Kaya'
    },
    {
      id: '4',
      productionDate: '2024-01-12',
      batchNumber: 'PR-2024-004',
      productName: 'Organik Bebek Sabunu',
      productType: 'solid',
      plannedQuantity: 300,
      actualQuantity: 0,
      unit: 'adet',
      operator: 'Ayşe Özkan',
      shift: 'afternoon',
      startTime: '14:00',
      endTime: '16:30',
      status: 'cancelled',
      qualityCheck: {
        passed: false,
        ph: 0,
        temperature: 0,
        viscosity: '',
        color: '',
        notes: 'Hammadde kalitesi uygun değil'
      },
      rawMaterials: [
        { id: '1', name: 'Organik Zeytinyağı', plannedAmount: 210, actualAmount: 0, unit: 'ml', supplier: 'Organik Gıda' },
        { id: '2', name: 'Kostik Soda', plannedAmount: 30, actualAmount: 0, unit: 'g', supplier: 'Kimya Dünyası' }
      ],
      efficiency: 0,
      notes: 'Hammadde kalite kontrolünde problem tespit edildi, üretim iptal edildi',
      createdBy: 'Ayşe Özkan'
    }
  ]);

  const filteredRecords = records.filter(record => {
    const matchesSearch = record.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.operator.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || record.status === selectedStatus;
    const matchesType = selectedType === 'all' || record.productType === selectedType;
    const matchesDate = (!dateFrom || record.productionDate >= dateFrom) && (!dateTo || record.productionDate <= dateTo);
    return matchesSearch && matchesStatus && matchesType && matchesDate;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Tamamlandı';
      case 'in-progress': return 'Devam Ediyor';
      case 'paused': return 'Duraklatıldı';
      case 'cancelled': return 'İptal Edildi';
      default: return status;
    }
  };

  const getShiftLabel = (shift: string) => {
    switch (shift) {
      case 'morning': return 'Sabah';
      case 'afternoon': return 'Öğleden Sonra';
      case 'night': return 'Gece';
      default: return shift;
    }
  };

  const ProductionForm: React.FC<{ record?: ProductionRecord; onClose: () => void }> = ({ record, onClose }) => {
    const [formData, setFormData] = useState({
      productionDate: record?.productionDate || new Date().toISOString().split('T')[0],
      batchNumber: record?.batchNumber || '',
      productName: record?.productName || '',
      productType: record?.productType || 'solid' as 'solid' | 'liquid',
      plannedQuantity: record?.plannedQuantity || 0,
      actualQuantity: record?.actualQuantity || 0,
      unit: record?.unit || 'adet',
      operator: record?.operator || '',
      shift: record?.shift || 'morning' as 'morning' | 'afternoon' | 'night',
      startTime: record?.startTime || '',
      endTime: record?.endTime || '',
      status: record?.status || 'in-progress' as 'completed' | 'in-progress' | 'paused' | 'cancelled',
      qualityCheck: {
        passed: record?.qualityCheck.passed ?? true,
        ph: record?.qualityCheck.ph || 0,
        temperature: record?.qualityCheck.temperature || 0,
        viscosity: record?.qualityCheck.viscosity || 'Normal',
        color: record?.qualityCheck.color || '',
        notes: record?.qualityCheck.notes || ''
      },
      notes: record?.notes || ''
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const efficiency = formData.plannedQuantity > 0 ? (formData.actualQuantity / formData.plannedQuantity) * 100 : 0;
      
      if (record) {
        setRecords(prev => prev.map(r => 
          r.id === record.id 
            ? { ...r, ...formData, efficiency, rawMaterials: record.rawMaterials, createdBy: record.createdBy }
            : r
        ));
      } else {
        const newRecord: ProductionRecord = {
          id: Date.now().toString(),
          ...formData,
          efficiency,
          rawMaterials: [],
          createdBy: 'Mevcut Kullanıcı'
        };
        setRecords(prev => [newRecord, ...prev]);
      }
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {record ? 'Üretim Kaydı Düzenle' : 'Yeni Üretim Kaydı Ekle'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Üretim Tarihi</label>
                <input
                  type="date"
                  value={formData.productionDate}
                  onChange={(e) => setFormData({...formData, productionDate: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Parti No</label>
                <input
                  type="text"
                  value={formData.batchNumber}
                  onChange={(e) => setFormData({...formData, batchNumber: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ürün Türü</label>
                <select
                  value={formData.productType}
                  onChange={(e) => setFormData({...formData, productType: e.target.value as 'solid' | 'liquid'})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="solid">Katı</option>
                  <option value="liquid">Sıvı</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ürün Adı</label>
              <input
                type="text"
                value={formData.productName}
                onChange={(e) => setFormData({...formData, productName: e.target.value})}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Planlanan Miktar</label>
                <input
                  type="number"
                  value={formData.plannedQuantity}
                  onChange={(e) => setFormData({...formData, plannedQuantity: Number(e.target.value)})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gerçekleşen Miktar</label>
                <input
                  type="number"
                  value={formData.actualQuantity}
                  onChange={(e) => setFormData({...formData, actualQuantity: Number(e.target.value)})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Birim</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="adet">Adet</option>
                  <option value="kg">Kg</option>
                  <option value="ml">ml</option>
                  <option value="l">Litre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Durum</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as 'completed' | 'in-progress' | 'paused' | 'cancelled'})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="in-progress">Devam Ediyor</option>
                  <option value="completed">Tamamlandı</option>
                  <option value="paused">Duraklatıldı</option>
                  <option value="cancelled">İptal Edildi</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Operatör</label>
                <input
                  type="text"
                  value={formData.operator}
                  onChange={(e) => setFormData({...formData, operator: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vardiya</label>
                <select
                  value={formData.shift}
                  onChange={(e) => setFormData({...formData, shift: e.target.value as 'morning' | 'afternoon' | 'night'})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="morning">Sabah</option>
                  <option value="afternoon">Öğleden Sonra</option>
                  <option value="night">Gece</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Başlangıç Saati</label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bitiş Saati</label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Kalite Kontrol</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">pH Değeri</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.qualityCheck.ph}
                    onChange={(e) => setFormData({
                      ...formData,
                      qualityCheck: {...formData.qualityCheck, ph: Number(e.target.value)}
                    })}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sıcaklık (°C)</label>
                  <input
                    type="number"
                    value={formData.qualityCheck.temperature}
                    onChange={(e) => setFormData({
                      ...formData,
                      qualityCheck: {...formData.qualityCheck, temperature: Number(e.target.value)}
                    })}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Viskozite</label>
                  <select
                    value={formData.qualityCheck.viscosity}
                    onChange={(e) => setFormData({
                      ...formData,
                      qualityCheck: {...formData.qualityCheck, viscosity: e.target.value}
                    })}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="İnce">İnce</option>
                    <option value="Normal">Normal</option>
                    <option value="Yoğun">Yoğun</option>
                    <option value="Akışkan">Akışkan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Renk</label>
                  <input
                    type="text"
                    value={formData.qualityCheck.color}
                    onChange={(e) => setFormData({
                      ...formData,
                      qualityCheck: {...formData.qualityCheck, color: e.target.value}
                    })}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="qualityPassed"
                    checked={formData.qualityCheck.passed}
                    onChange={(e) => setFormData({
                      ...formData,
                      qualityCheck: {...formData.qualityCheck, passed: e.target.checked}
                    })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="qualityPassed" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Kalite Kontrolü Geçti
                  </label>
                </div>
                <textarea
                  value={formData.qualityCheck.notes}
                  onChange={(e) => setFormData({
                    ...formData,
                    qualityCheck: {...formData.qualityCheck, notes: e.target.value}
                  })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Kalite kontrol notları..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Genel Notlar</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                İptal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {record ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Üretim Kayıtları</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Yeni Üretim Kaydı
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
              <Factory className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Toplam Üretim</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{records.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tamamlanan</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{records.filter(r => r.status === 'completed').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Devam Eden</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{records.filter(r => r.status === 'in-progress').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
              <Package className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Ortalama Verim</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {records.length > 0 ? (records.reduce((sum, r) => sum + r.efficiency, 0) / records.length).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Ürün adı, parti no veya operatör ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Başlangıç"
              />
            </div>
          </div>
          <div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Bitiş"
              />
            </div>
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="completed">Tamamlanan</option>
            <option value="in-progress">Devam Eden</option>
            <option value="paused">Duraklatılan</option>
            <option value="cancelled">İptal Edilen</option>
          </select>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tüm Tipler</option>
            <option value="solid">Katı</option>
            <option value="liquid">Sıvı</option>
          </select>
        </div>
      </div>

      {/* Production Records Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tarih</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Parti No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ürün</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Miktar</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Verim</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Operatör</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Durum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Kalite</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRecords.map((record) => (
                <React.Fragment key={record.id}>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {new Date(record.productionDate).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {record.batchNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{record.productName}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {record.productType === 'solid' ? 'Katı' : 'Sıvı'} | {getShiftLabel(record.shift)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div>
                        <div>{record.actualQuantity.toLocaleString()} {record.unit}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Plan: {record.plannedQuantity.toLocaleString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                          <div 
                            className={`h-2 rounded-full ${
                              record.efficiency >= 95 ? 'bg-green-600' :
                              record.efficiency >= 85 ? 'bg-yellow-600' :
                              'bg-red-600'
                            }`}
                            style={{ width: `${Math.min(record.efficiency, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {record.efficiency.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
                        <span className="text-sm text-gray-900 dark:text-white">{record.operator}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                        {getStatusLabel(record.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {record.qualityCheck.passed ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Geçti
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Geçmedi
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setExpandedRecord(expandedRecord === record.id ? null : record.id)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Detayları Görüntüle"
                        >
                          <Package className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingRecord(record);
                            setShowAddModal(true);
                          }}
                          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setRecords(prev => prev.filter(r => r.id !== record.id))}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedRecord === record.id && (
                    <tr>
                      <td colSpan={9} className="px-6 py-4 bg-gray-50 dark:bg-gray-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Üretim Detayları</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Başlangıç:</span>
                                <span className="text-gray-900 dark:text-white">{record.startTime}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Bitiş:</span>
                                <span className="text-gray-900 dark:text-white">{record.endTime || 'Devam ediyor'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Oluşturan:</span>
                                <span className="text-gray-900 dark:text-white">{record.createdBy}</span>
                              </div>
                            </div>
                            {record.notes && (
                              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                                <p className="text-sm text-blue-800 dark:text-blue-200">{record.notes}</p>
                              </div>
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Kalite Kontrol</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">pH:</span>
                                <span className="text-gray-900 dark:text-white">{record.qualityCheck.ph}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Sıcaklık:</span>
                                <span className="text-gray-900 dark:text-white">{record.qualityCheck.temperature}°C</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Viskozite:</span>
                                <span className="text-gray-900 dark:text-white">{record.qualityCheck.viscosity}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Renk:</span>
                                <span className="text-gray-900 dark:text-white">{record.qualityCheck.color}</span>
                              </div>
                            </div>
                            {record.qualityCheck.notes && (
                              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                                <p className="text-sm text-green-800 dark:text-green-200">{record.qualityCheck.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        {record.rawMaterials.length > 0 && (
                          <div className="mt-6">
                            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Kullanılan Hammaddeler</h4>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-100 dark:bg-gray-600">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Hammadde</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Planlanan</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Kullanılan</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tedarikçi</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                  {record.rawMaterials.map((material) => (
                                    <tr key={material.id}>
                                      <td className="px-3 py-2 text-gray-900 dark:text-white">{material.name}</td>
                                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{material.plannedAmount} {material.unit}</td>
                                      <td className="px-3 py-2 text-gray-900 dark:text-white">{material.actualAmount} {material.unit}</td>
                                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{material.supplier}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <ProductionForm
          record={editingRecord}
          onClose={() => {
            setShowAddModal(false);
            setEditingRecord(null);
          }}
        />
      )}
    </div>
  );
};

export default ProductionRecords;