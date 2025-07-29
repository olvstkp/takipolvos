import React, { useState } from 'react';
import { Plus, Edit, Trash2, Droplets, AlertTriangle, Thermometer, Calendar, Package } from 'lucide-react';

interface OilContent {
  id: string;
  oilCode: string;
  oilType: string;
  amount: number;
  addedDate: string;
  supplier: string;
  qualityGrade: string;
  acidityLevel: number;
}

interface OilTank {
  id: string;
  tankCode: string;
  tankName: string;
  capacity: number;
  currentLevel: number;
  temperature: number;
  lastCleaned: string;
  status: 'active' | 'maintenance' | 'cleaning' | 'empty';
  location: string;
  contents: OilContent[];
  notes: string;
}

const OilTanks: React.FC = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showContentModal, setShowContentModal] = useState(false);
  const [editingTank, setEditingTank] = useState<OilTank | null>(null);
  const [selectedTank, setSelectedTank] = useState<OilTank | null>(null);

  const [tanks, setTanks] = useState<OilTank[]>([
    {
      id: '1',
      tankCode: 'T001',
      tankName: 'Ana Zeytinyağı Tankı 1',
      capacity: 5000,
      currentLevel: 3200,
      temperature: 18,
      lastCleaned: '2024-01-10',
      status: 'active',
      location: 'Depo A - Raf 1',
      notes: 'Düzenli kontrol yapılıyor',
      contents: [
        {
          id: '1',
          oilCode: 'ZY-2024-001',
          oilType: 'Natürel Sızma Zeytinyağı',
          amount: 2000,
          addedDate: '2024-01-12',
          supplier: 'Akdeniz Zeytin Kooperatifi',
          qualityGrade: 'Extra Virgin',
          acidityLevel: 0.3
        },
        {
          id: '2',
          oilCode: 'ZY-2024-003',
          oilType: 'Organik Zeytinyağı',
          amount: 1200,
          addedDate: '2024-01-14',
          supplier: 'Ege Zeytinyağı',
          qualityGrade: 'Organic Extra Virgin',
          acidityLevel: 0.2
        }
      ]
    },
    {
      id: '2',
      tankCode: 'T002',
      tankName: 'Riviera Zeytinyağı Tankı',
      capacity: 3000,
      currentLevel: 2800,
      temperature: 19,
      lastCleaned: '2024-01-08',
      status: 'active',
      location: 'Depo A - Raf 2',
      notes: 'Karışım hazır',
      contents: [
        {
          id: '3',
          oilCode: 'ZY-2024-005',
          oilType: 'Riviera Zeytinyağı',
          amount: 2800,
          addedDate: '2024-01-13',
          supplier: 'Güney Zeytin Gıda',
          qualityGrade: 'Refined',
          acidityLevel: 0.8
        }
      ]
    },
    {
      id: '3',
      tankCode: 'T003',
      tankName: 'Yedek Tank',
      capacity: 2000,
      currentLevel: 0,
      temperature: 17,
      lastCleaned: '2024-01-15',
      status: 'empty',
      location: 'Depo B - Raf 1',
      notes: 'Temizlik tamamlandı, kullanıma hazır',
      contents: []
    },
    {
      id: '4',
      tankCode: 'T004',
      tankName: 'Bakım Tankı',
      capacity: 4000,
      currentLevel: 1500,
      temperature: 20,
      lastCleaned: '2024-01-05',
      status: 'maintenance',
      location: 'Depo B - Raf 2',
      notes: 'Vana değişimi yapılıyor',
      contents: [
        {
          id: '4',
          oilCode: 'ZY-2024-002',
          oilType: 'Erken Hasat Zeytinyağı',
          amount: 1500,
          addedDate: '2024-01-11',
          supplier: 'Akdeniz Zeytin Kooperatifi',
          qualityGrade: 'Premium',
          acidityLevel: 0.15
        }
      ]
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'cleaning': return 'bg-blue-100 text-blue-800';
      case 'empty': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Aktif';
      case 'maintenance': return 'Bakımda';
      case 'cleaning': return 'Temizleniyor';
      case 'empty': return 'Boş';
      default: return status;
    }
  };

  const getCapacityPercentage = (current: number, capacity: number) => {
    return (current / capacity) * 100;
  };

  const TankForm: React.FC<{ tank?: OilTank; onClose: () => void }> = ({ tank, onClose }) => {
    const [formData, setFormData] = useState({
      tankCode: tank?.tankCode || '',
      tankName: tank?.tankName || '',
      capacity: tank?.capacity || 0,
      currentLevel: tank?.currentLevel || 0,
      temperature: tank?.temperature || 18,
      lastCleaned: tank?.lastCleaned || new Date().toISOString().split('T')[0],
      status: tank?.status || 'empty' as 'active' | 'maintenance' | 'cleaning' | 'empty',
      location: tank?.location || '',
      notes: tank?.notes || ''
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (tank) {
        setTanks(prev => prev.map(t => 
          t.id === tank.id ? { ...t, ...formData } : t
        ));
      } else {
        const newTank: OilTank = {
          id: Date.now().toString(),
          ...formData,
          contents: []
        };
        setTanks(prev => [...prev, newTank]);
      }
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {tank ? 'Tank Düzenle' : 'Yeni Tank Ekle'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tank Kodu</label>
                <input
                  type="text"
                  value={formData.tankCode}
                  onChange={(e) => setFormData({...formData, tankCode: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tank Adı</label>
                <input
                  type="text"
                  value={formData.tankName}
                  onChange={(e) => setFormData({...formData, tankName: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kapasite (L)</label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({...formData, capacity: Number(e.target.value)})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mevcut Seviye (L)</label>
                <input
                  type="number"
                  value={formData.currentLevel}
                  onChange={(e) => setFormData({...formData, currentLevel: Number(e.target.value)})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sıcaklık (°C)</label>
                <input
                  type="number"
                  value={formData.temperature}
                  onChange={(e) => setFormData({...formData, temperature: Number(e.target.value)})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Son Temizlik</label>
                <input
                  type="date"
                  value={formData.lastCleaned}
                  onChange={(e) => setFormData({...formData, lastCleaned: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Durum</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as 'active' | 'maintenance' | 'cleaning' | 'empty'})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="active">Aktif</option>
                  <option value="maintenance">Bakımda</option>
                  <option value="cleaning">Temizleniyor</option>
                  <option value="empty">Boş</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Konum</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notlar</label>
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
                {tank ? 'Güncelle' : 'Ekle'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const ContentModal: React.FC<{ tank: OilTank; onClose: () => void }> = ({ tank, onClose }) => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Droplets className="w-5 h-5 mr-2 text-blue-600" />
              {tank.tankName} - İçerik Detayları
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Tank Bilgileri</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Tank Kodu:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{tank.tankCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Kapasite:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{tank.capacity.toLocaleString()} L</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Mevcut Seviye:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{tank.currentLevel.toLocaleString()} L</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Doluluk Oranı:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{getCapacityPercentage(tank.currentLevel, tank.capacity).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Durum Bilgileri</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Sıcaklık:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{tank.temperature}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Son Temizlik:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{new Date(tank.lastCleaned).toLocaleDateString('tr-TR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Konum:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{tank.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Durum:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tank.status)}`}>
                    {getStatusLabel(tank.status)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <Package className="w-4 h-4 mr-2" />
              Karışım İçeriği ({tank.contents.length} farklı yağ)
            </h4>
            {tank.contents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Yağ Kodu</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Yağ Türü</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Miktar</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tedarikçi</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Kalite</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Asitlik</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Eklenme Tarihi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {tank.contents.map((content) => (
                      <tr key={content.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{content.oilCode}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{content.oilType}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{content.amount.toLocaleString()} L</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{content.supplier}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{content.qualityGrade}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">%{content.acidityLevel}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{new Date(content.addedDate).toLocaleDateString('tr-TR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Droplets className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Bu tank şu anda boş</p>
              </div>
            )}
          </div>

          {tank.notes && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">Notlar:</h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">{tank.notes}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Zeytinyağı Tankları</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Yeni Tank Ekle
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
              <Droplets className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Toplam Tank</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{tanks.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
              <Package className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Aktif Tank</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{tanks.filter(t => t.status === 'active').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900">
              <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Bakımda</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{tanks.filter(t => t.status === 'maintenance').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
              <Thermometer className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Toplam Kapasite</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{tanks.reduce((sum, tank) => sum + tank.capacity, 0).toLocaleString()} L</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tanks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tanks.map((tank) => (
          <div key={tank.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{tank.tankName}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Kod: {tank.tankCode}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tank.status)}`}>
                  {getStatusLabel(tank.status)}
                </span>
                <div className="flex space-x-1">
                  <button
                    onClick={() => {
                      setSelectedTank(tank);
                      setShowContentModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    title="İçeriği Görüntüle"
                  >
                    <Package className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingTank(tank);
                      setShowAddModal(true);
                    }}
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setTanks(prev => prev.filter(t => t.id !== tank.id))}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Capacity Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                <span>Doluluk Oranı</span>
                <span>{getCapacityPercentage(tank.currentLevel, tank.capacity).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    getCapacityPercentage(tank.currentLevel, tank.capacity) > 90 ? 'bg-red-600' :
                    getCapacityPercentage(tank.currentLevel, tank.capacity) > 70 ? 'bg-yellow-600' :
                    'bg-green-600'
                  }`}
                  style={{ width: `${getCapacityPercentage(tank.currentLevel, tank.capacity)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>{tank.currentLevel.toLocaleString()} L</span>
                <span>{tank.capacity.toLocaleString()} L</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 flex items-center">
                  <Thermometer className="w-4 h-4 mr-1" />
                  Sıcaklık:
                </span>
                <span className="font-medium text-gray-900 dark:text-white">{tank.temperature}°C</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Son Temizlik:
                </span>
                <span className="font-medium text-gray-900 dark:text-white">{new Date(tank.lastCleaned).toLocaleDateString('tr-TR')}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Konum:</span>
                <span className="font-medium text-gray-900 dark:text-white">{tank.location}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">İçerik Çeşidi:</span>
                <span className="font-medium text-gray-900 dark:text-white">{tank.contents.length} farklı yağ</span>
              </div>
            </div>

            {tank.contents.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2 text-sm">Mevcut Karışım:</h4>
                <div className="space-y-1">
                  {tank.contents.slice(0, 2).map((content) => (
                    <div key={content.id} className="flex justify-between text-xs text-blue-800 dark:text-blue-200">
                      <span>{content.oilCode}</span>
                      <span>{content.amount.toLocaleString()} L</span>
                    </div>
                  ))}
                  {tank.contents.length > 2 && (
                    <div className="text-xs text-blue-600 dark:text-blue-400">
                      +{tank.contents.length - 2} daha...
                    </div>
                  )}
                </div>
              </div>
            )}

            {tank.notes && (
              <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                <p className="text-xs text-gray-600 dark:text-gray-400">{tank.notes}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <TankForm
          tank={editingTank}
          onClose={() => {
            setShowAddModal(false);
            setEditingTank(null);
          }}
        />
      )}

      {/* Content Modal */}
      {showContentModal && selectedTank && (
        <ContentModal
          tank={selectedTank}
          onClose={() => {
            setShowContentModal(false);
            setSelectedTank(null);
          }}
        />
      )}
    </div>
  );
};

export default OilTanks;