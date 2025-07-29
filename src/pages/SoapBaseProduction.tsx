import React, { useState } from 'react';
import { Plus, Calendar, Droplets, Thermometer, Clock } from 'lucide-react';

interface SoapBaseProduction {
  id: string;
  date: string;
  batchNumber: string;
  ingredients: {
    water: number;
    causticSoda: number;
    oilAmount: number;
    oilType: string;
    additives: string;
  };
  productionAmount: number;
  temperature: number;
  mixingTime: number;
  operator: string;
  qualityCheck: {
    ph: number;
    temperature: number;
    viscosity: string;
    color: string;
    passed: boolean;
  };
  notes: string;
  status: 'completed' | 'in-progress' | 'quality-check';
}

const SoapBaseProduction: React.FC = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [productions, setProductions] = useState<SoapBaseProduction[]>([
    {
      id: '1',
      date: '2024-01-15',
      batchNumber: 'SB-2024-001',
      ingredients: {
        water: 200,
        causticSoda: 50,
        oilAmount: 500,
        oilType: 'Zeytinyağı',
        additives: 'Gliserin 30ml'
      },
      productionAmount: 750,
      temperature: 65,
      mixingTime: 45,
      operator: 'Ahmet Yılmaz',
      qualityCheck: {
        ph: 9.2,
        temperature: 65,
        viscosity: 'Normal',
        color: 'Açık Sarı',
        passed: true
      },
      notes: 'Kalite kontrolü başarılı',
      status: 'completed'
    },
    {
      id: '2',
      date: '2024-01-14',
      batchNumber: 'SB-2024-002',
      ingredients: {
        water: 180,
        causticSoda: 45,
        oilAmount: 450,
        oilType: 'Palmiye Yağı',
        additives: 'Vitamin E 5ml'
      },
      productionAmount: 675,
      temperature: 70,
      mixingTime: 50,
      operator: 'Fatma Demir',
      qualityCheck: {
        ph: 8.8,
        temperature: 70,
        viscosity: 'Yoğun',
        color: 'Beyaz',
        passed: false
      },
      notes: 'pH değeri yüksek, tekrar kontrol gerekli',
      status: 'quality-check'
    }
  ]);

  const ProductionForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [formData, setFormData] = useState({
      date: new Date().toISOString().split('T')[0],
      batchNumber: '',
      ingredients: {
        water: 0,
        causticSoda: 0,
        oilAmount: 0,
        oilType: 'Zeytinyağı',
        additives: ''
      },
      productionAmount: 0,
      temperature: 0,
      mixingTime: 0,
      operator: '',
      qualityCheck: {
        ph: 0,
        temperature: 0,
        viscosity: 'Normal',
        color: '',
        passed: true
      },
      notes: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const newProduction: SoapBaseProduction = {
        id: Date.now().toString(),
        ...formData,
        status: 'in-progress'
      };
      setProductions(prev => [newProduction, ...prev]);
      onClose();
    };

    const calculateTotalAmount = () => {
      const total = formData.ingredients.water + formData.ingredients.causticSoda + formData.ingredients.oilAmount;
      setFormData({ ...formData, productionAmount: total });
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">Yeni Cips Üretimi</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parti No</label>
                <input
                  type="text"
                  value={formData.batchNumber}
                  onChange={(e) => setFormData({...formData, batchNumber: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div className="bg-gray-50 rounded-md p-4">
              <h4 className="font-medium text-gray-900 mb-3">Hammaddeler</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Su (ml)</label>
                  <input
                    type="number"
                    value={formData.ingredients.water}
                    onChange={(e) => setFormData({
                      ...formData,
                      ingredients: {...formData.ingredients, water: Number(e.target.value)}
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kostik Soda (g)</label>
                  <input
                    type="number"
                    value={formData.ingredients.causticSoda}
                    onChange={(e) => setFormData({
                      ...formData,
                      ingredients: {...formData.ingredients, causticSoda: Number(e.target.value)}
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yağ Miktarı (ml)</label>
                  <input
                    type="number"
                    value={formData.ingredients.oilAmount}
                    onChange={(e) => setFormData({
                      ...formData,
                      ingredients: {...formData.ingredients, oilAmount: Number(e.target.value)}
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yağ Türü</label>
                  <select
                    value={formData.ingredients.oilType}
                    onChange={(e) => setFormData({
                      ...formData,
                      ingredients: {...formData.ingredients, oilType: e.target.value}
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Zeytinyağı">Zeytinyağı</option>
                    <option value="Palmiye Yağı">Palmiye Yağı</option>
                    <option value="Hindistan Cevizi Yağı">Hindistan Cevizi Yağı</option>
                    <option value="Ayçiçek Yağı">Ayçiçek Yağı</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Katkı Maddeleri</label>
                <input
                  type="text"
                  value={formData.ingredients.additives}
                  onChange={(e) => setFormData({
                    ...formData,
                    ingredients: {...formData.ingredients, additives: e.target.value}
                  })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Örn: Gliserin 30ml, Vitamin E 5ml"
                />
              </div>
              <button
                type="button"
                onClick={calculateTotalAmount}
                className="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm"
              >
                Toplam Miktarı Hesapla
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Üretim Miktarı (ml)</label>
                <input
                  type="number"
                  value={formData.productionAmount}
                  onChange={(e) => setFormData({...formData, productionAmount: Number(e.target.value)})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sıcaklık (°C)</label>
                <input
                  type="number"
                  value={formData.temperature}
                  onChange={(e) => setFormData({...formData, temperature: Number(e.target.value)})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Karıştırma Süresi (dk)</label>
                <input
                  type="number"
                  value={formData.mixingTime}
                  onChange={(e) => setFormData({...formData, mixingTime: Number(e.target.value)})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Operatör</label>
              <input
                type="text"
                value={formData.operator}
                onChange={(e) => setFormData({...formData, operator: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="bg-gray-50 rounded-md p-4">
              <h4 className="font-medium text-gray-900 mb-3">Kalite Kontrol</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">pH Değeri</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.qualityCheck.ph}
                    onChange={(e) => setFormData({
                      ...formData,
                      qualityCheck: {...formData.qualityCheck, ph: Number(e.target.value)}
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kontrol Sıcaklığı (°C)</label>
                  <input
                    type="number"
                    value={formData.qualityCheck.temperature}
                    onChange={(e) => setFormData({
                      ...formData,
                      qualityCheck: {...formData.qualityCheck, temperature: Number(e.target.value)}
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Viskozite</label>
                  <select
                    value={formData.qualityCheck.viscosity}
                    onChange={(e) => setFormData({
                      ...formData,
                      qualityCheck: {...formData.qualityCheck, viscosity: e.target.value}
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="İnce">İnce</option>
                    <option value="Normal">Normal</option>
                    <option value="Yoğun">Yoğun</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Renk</label>
                  <input
                    type="text"
                    value={formData.qualityCheck.color}
                    onChange={(e) => setFormData({
                      ...formData,
                      qualityCheck: {...formData.qualityCheck, color: e.target.value}
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="mt-4 flex items-center">
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
                <label htmlFor="qualityPassed" className="ml-2 text-sm font-medium text-gray-700">
                  Kalite Kontrolü Geçti
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Kaydet
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cips Üretimi</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Yeni Üretim
        </button>
      </div>

      {/* Production Records */}
      <div className="space-y-4">
        {productions.map((production) => (
          <div key={production.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Parti No: {production.batchNumber}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Operatör: {production.operator} | {new Date(production.date).toLocaleDateString('tr-TR')}
                </p>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                production.status === 'completed' ? 'bg-green-100 text-green-800' :
                production.status === 'quality-check' ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {production.status === 'completed' ? 'Tamamlandı' :
                 production.status === 'quality-check' ? 'Kalite Kontrol' :
                 'Devam Ediyor'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                  <Droplets className="w-4 h-4 mr-2" />
                  Hammaddeler
                </h4>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Su:</span>
                    <span>{production.ingredients.water} ml</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Kostik Soda:</span>
                    <span>{production.ingredients.causticSoda} g</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{production.ingredients.oilType}:</span>
                    <span>{production.ingredients.oilAmount} ml</span>
                  </div>
                  {production.ingredients.additives && (
                    <div className="text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Katkılar:</span>
                      <p className="text-gray-800 dark:text-gray-200">{production.ingredients.additives}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                  <Thermometer className="w-4 h-4 mr-2" />
                  Üretim Bilgileri
                </h4>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Miktar:</span>
                    <span>{production.productionAmount} ml</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Sıcaklık:</span>
                    <span>{production.temperature}°C</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Karıştırma:</span>
                    <span>{production.mixingTime} dk</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Kalite Kontrol
                </h4>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>pH:</span>
                    <span>{production.qualityCheck.ph}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Viskozite:</span>
                    <span>{production.qualityCheck.viscosity}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Renk:</span>
                    <span>{production.qualityCheck.color}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Durum:</span>
                    <span className={production.qualityCheck.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {production.qualityCheck.passed ? 'Geçti' : 'Geçmedi'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {production.notes && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <p className="text-sm text-blue-800 dark:text-blue-200">{production.notes}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <ProductionForm onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
};

export default SoapBaseProduction;