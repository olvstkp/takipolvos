import React, { useState } from 'react';
import { Search, Plus, Edit, Trash2, Phone, Mail, MapPin, Droplets, Package } from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  taxNumber: string;
  phone: string;
  email: string;
  address: string;
  contactPerson: string;
  paymentTerms: string;
  isActive: boolean;
}

interface OilSupplier extends Supplier {
  oilType: string;
  qualityCertificate: string;
  harvestYear: string;
  acidityLevel: number;
}

const SupplierManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [oilSearchTerm, setOilSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOilAddModal, setShowOilAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingOilSupplier, setEditingOilSupplier] = useState<OilSupplier | null>(null);
  const [activeTab, setActiveTab] = useState<'oil' | 'general'>('oil');

  // Zeytinyağı Tedarikçileri
  const [oilSuppliers, setOilSuppliers] = useState<OilSupplier[]>([
    {
      id: '1',
      name: 'Akdeniz Zeytin Üreticileri Kooperatifi',
      taxNumber: '1234567890',
      phone: '+90 232 123 45 67',
      email: 'info@akdenizzeytin.com',
      address: 'Atatürk Mah. Zeytin Cad. No:15 Menemen/İzmir',
      contactPerson: 'Ahmet Yılmaz',
      paymentTerms: '30 gün',
      isActive: true,
      oilType: 'Natürel Sızma Zeytinyağı',
      qualityCertificate: 'Organik Sertifikası',
      harvestYear: '2023',
      acidityLevel: 0.3
    },
    {
      id: '2',
      name: 'Ege Zeytinyağı San. Tic. Ltd. Şti.',
      taxNumber: '2345678901',
      phone: '+90 232 234 56 78',
      email: 'satis@egezeytinyagi.com',
      address: 'Cumhuriyet Mah. Sanayi Sitesi A Blok No:12 Tire/İzmir',
      contactPerson: 'Fatma Demir',
      paymentTerms: '45 gün',
      isActive: true,
      oilType: 'Riviera Zeytinyağı',
      qualityCertificate: 'ISO 22000',
      harvestYear: '2023',
      acidityLevel: 0.8
    },
    {
      id: '3',
      name: 'Güney Zeytin Gıda A.Ş.',
      taxNumber: '3456789012',
      phone: '+90 242 345 67 89',
      email: 'bilgi@guneyzeytin.com',
      address: 'Konyaaltı Mah. Zeytin Sok. No:8 Antalya',
      contactPerson: 'Mehmet Kaya',
      paymentTerms: '60 gün',
      isActive: false,
      oilType: 'Erken Hasat Zeytinyağı',
      qualityCertificate: 'HACCP',
      harvestYear: '2022',
      acidityLevel: 0.2
    }
  ]);

  // Genel Tedarikçiler (Diğer Ürünler)
  const [generalSuppliers, setGeneralSuppliers] = useState<Supplier[]>([
    {
      id: '1',
      name: 'Kimya Dünyası Paz. San. Tic. A.Ş.',
      taxNumber: '0987654321',
      phone: '+90 216 234 56 78',
      email: 'satis@kimyadunyasi.com',
      address: 'İnönü Cad. Kimya Sitesi B Blok No:8 Pendik/İstanbul',
      contactPerson: 'Fatma Demir',
      paymentTerms: '45 gün',
      isActive: true
    },
    {
      id: '2',
      name: 'Doğal Aromalar Ltd. Şti.',
      taxNumber: '1122334455',
      phone: '+90 242 345 67 89',
      email: 'bilgi@dogalarromalar.com',
      address: 'Güzeloba Mah. Çiçek Sok. No:23 Lara/Antalya',
      contactPerson: 'Mehmet Kaya',
      paymentTerms: '60 gün',
      isActive: true
    },
    {
      id: '3',
      name: 'Plastik Çözümler San. Tic. Ltd.',
      taxNumber: '5566778899',
      phone: '+90 212 456 78 90',
      email: 'info@plastikcozumler.com',
      address: 'Organize Sanayi Bölgesi 15. Cad. No:42 Çerkezköy/Tekirdağ',
      contactPerson: 'Ayşe Yıldız',
      paymentTerms: '30 gün',
      isActive: true
    },
    {
      id: '4',
      name: 'Temizlik Malzemeleri A.Ş.',
      taxNumber: '6677889900',
      phone: '+90 232 567 89 01',
      email: 'satis@temizlikmalzemeleri.com',
      address: 'Kemalpaşa OSB 3. Cad. No:28 Kemalpaşa/İzmir',
      contactPerson: 'Hasan Özkan',
      paymentTerms: '45 gün',
      isActive: false
    }
  ]);

  const filteredOilSuppliers = oilSuppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(oilSearchTerm.toLowerCase()) ||
    supplier.taxNumber.includes(oilSearchTerm) ||
    supplier.contactPerson.toLowerCase().includes(oilSearchTerm.toLowerCase()) ||
    supplier.oilType.toLowerCase().includes(oilSearchTerm.toLowerCase())
  );

  const filteredGeneralSuppliers = generalSuppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.taxNumber.includes(searchTerm) ||
    supplier.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const OilSupplierForm: React.FC<{ supplier?: OilSupplier; onClose: () => void }> = ({ supplier, onClose }) => {
    const [formData, setFormData] = useState({
      name: supplier?.name || '',
      taxNumber: supplier?.taxNumber || '',
      phone: supplier?.phone || '',
      email: supplier?.email || '',
      address: supplier?.address || '',
      contactPerson: supplier?.contactPerson || '',
      paymentTerms: supplier?.paymentTerms || '30 gün',
      isActive: supplier?.isActive ?? true,
      oilType: supplier?.oilType || 'Natürel Sızma Zeytinyağı',
      qualityCertificate: supplier?.qualityCertificate || '',
      harvestYear: supplier?.harvestYear || new Date().getFullYear().toString(),
      acidityLevel: supplier?.acidityLevel || 0
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (supplier) {
        setOilSuppliers(prev => prev.map(s => 
          s.id === supplier.id ? { ...s, ...formData } : s
        ));
      } else {
        const newSupplier: OilSupplier = {
          id: Date.now().toString(),
          ...formData
        };
        setOilSuppliers(prev => [...prev, newSupplier]);
      }
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Droplets className="w-5 h-5 mr-2 text-green-600" />
            {supplier ? 'Zeytinyağı Tedarikçisi Düzenle' : 'Yeni Zeytinyağı Tedarikçisi Ekle'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Şirket Adı</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vergi Numarası</label>
                <input
                  type="text"
                  value={formData.taxNumber}
                  onChange={(e) => setFormData({...formData, taxNumber: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">İletişim Kişisi</label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Koşulları</label>
                <select
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({...formData, paymentTerms: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="Peşin">Peşin</option>
                  <option value="15 gün">15 gün</option>
                  <option value="30 gün">30 gün</option>
                  <option value="45 gün">45 gün</option>
                  <option value="60 gün">60 gün</option>
                  <option value="90 gün">90 gün</option>
                </select>
              </div>
            </div>

            {/* Zeytinyağı Özel Alanları */}
            <div className="bg-green-50 rounded-md p-4">
              <h4 className="font-medium text-green-900 mb-3">Zeytinyağı Özellikleri</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yağ Türü</label>
                  <select
                    value={formData.oilType}
                    onChange={(e) => setFormData({...formData, oilType: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="Natürel Sızma Zeytinyağı">Natürel Sızma Zeytinyağı</option>
                    <option value="Riviera Zeytinyağı">Riviera Zeytinyağı</option>
                    <option value="Erken Hasat Zeytinyağı">Erken Hasat Zeytinyağı</option>
                    <option value="Organik Zeytinyağı">Organik Zeytinyağı</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kalite Sertifikası</label>
                  <input
                    type="text"
                    value={formData.qualityCertificate}
                    onChange={(e) => setFormData({...formData, qualityCertificate: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Örn: Organik Sertifikası, ISO 22000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hasat Yılı</label>
                  <input
                    type="text"
                    value={formData.harvestYear}
                    onChange={(e) => setFormData({...formData, harvestYear: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="2024"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Asitlik Oranı (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.acidityLevel}
                    onChange={(e) => setFormData({...formData, acidityLevel: Number(e.target.value)})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0.3"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <label htmlFor="isActive" className="ml-2 text-sm font-medium text-gray-700">
                Aktif Tedarikçi
              </label>
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
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                {supplier ? 'Güncelle' : 'Ekle'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const GeneralSupplierForm: React.FC<{ supplier?: Supplier; onClose: () => void }> = ({ supplier, onClose }) => {
    const [formData, setFormData] = useState({
      name: supplier?.name || '',
      taxNumber: supplier?.taxNumber || '',
      phone: supplier?.phone || '',
      email: supplier?.email || '',
      address: supplier?.address || '',
      contactPerson: supplier?.contactPerson || '',
      paymentTerms: supplier?.paymentTerms || '30 gün',
      isActive: supplier?.isActive ?? true
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (supplier) {
        setGeneralSuppliers(prev => prev.map(s => 
          s.id === supplier.id ? { ...s, ...formData } : s
        ));
      } else {
        const newSupplier: Supplier = {
          id: Date.now().toString(),
          ...formData
        };
        setGeneralSuppliers(prev => [...prev, newSupplier]);
      }
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Package className="w-5 h-5 mr-2 text-blue-600" />
            {supplier ? 'Genel Tedarikçi Düzenle' : 'Yeni Genel Tedarikçi Ekle'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Şirket Adı</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vergi Numarası</label>
              <input
                type="text"
                value={formData.taxNumber}
                onChange={(e) => setFormData({...formData, taxNumber: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">İletişim Kişisi</label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Koşulları</label>
              <select
                value={formData.paymentTerms}
                onChange={(e) => setFormData({...formData, paymentTerms: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Peşin">Peşin</option>
                <option value="15 gün">15 gün</option>
                <option value="30 gün">30 gün</option>
                <option value="45 gün">45 gün</option>
                <option value="60 gün">60 gün</option>
                <option value="90 gün">90 gün</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActiveGeneral"
                checked={formData.isActive}
                onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isActiveGeneral" className="ml-2 text-sm font-medium text-gray-700">
                Aktif Tedarikçi
              </label>
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
                {supplier ? 'Güncelle' : 'Ekle'}
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tedarikçi Yönetimi</h1>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('oil')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'oil'
                  ? 'border-green-500 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center">
                <Droplets className="w-4 h-4 mr-2" />
                Zeytinyağı Tedarikçileri
              </div>
            </button>
            <button
              onClick={() => setActiveTab('general')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'general'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center">
                <Package className="w-4 h-4 mr-2" />
                Genel Tedarikçiler
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Zeytinyağı Tedarikçileri */}
      {activeTab === 'oil' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-green-700 dark:text-green-400 flex items-center">
              <Droplets className="w-5 h-5 mr-2" />
              Zeytinyağı Tedarikçileri
            </h2>
            <button
              onClick={() => setShowOilAddModal(true)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Zeytinyağı Tedarikçisi Ekle
            </button>
          </div>

          {/* Oil Suppliers Search */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Tedarikçi adı, vergi no, yağ türü veya iletişim kişisi ara..."
                value={oilSearchTerm}
                onChange={(e) => setOilSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Oil Suppliers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOilSuppliers.map((supplier) => (
              <div key={supplier.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border-l-4 border-green-500">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{supplier.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Vergi No: {supplier.taxNumber}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      supplier.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {supplier.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => {
                          setEditingOilSupplier(supplier);
                          setShowOilAddModal(true);
                        }}
                        className="text-green-600 hover:text-green-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setOilSuppliers(prev => prev.filter(s => s.id !== supplier.id))}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Phone className="w-4 h-4 mr-2" />
                    {supplier.phone}
                  </div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Mail className="w-4 h-4 mr-2" />
                    {supplier.email}
                  </div>
                  <div className="flex items-start text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>{supplier.address}</span>
                  </div>
                </div>

                {/* Zeytinyağı Özel Bilgileri */}
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                  <h4 className="font-medium text-green-900 dark:text-green-200 mb-2">Zeytinyağı Özellikleri</h4>
                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex justify-between">
                      <span>Yağ Türü:</span>
                      <span className="font-medium text-green-800 dark:text-green-300">{supplier.oilType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hasat Yılı:</span>
                      <span className="font-medium">{supplier.harvestYear}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Asitlik:</span>
                      <span className="font-medium">%{supplier.acidityLevel}</span>
                    </div>
                    {supplier.qualityCertificate && (
                      <div className="flex justify-between">
                        <span>Sertifika:</span>
                        <span className="font-medium text-green-700 dark:text-green-300">{supplier.qualityCertificate}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>İletişim Kişisi:</span>
                    <span className="font-medium">{supplier.contactPerson}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1 text-gray-600 dark:text-gray-400">
                    <span>Ödeme Koşulları:</span>
                    <span className="font-medium">{supplier.paymentTerms}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Genel Tedarikçiler */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-blue-700 flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Genel Tedarikçiler (Diğer Ürünler)
            </h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Genel Tedarikçi Ekle
            </button>
          </div>

          {/* General Suppliers Search */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tedarikçi adı, vergi no veya iletişim kişisi ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* General Suppliers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGeneralSuppliers.map((supplier) => (
              <div key={supplier.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border-l-4 border-blue-500">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{supplier.name}</h3>
                    <p className="text-sm text-gray-600">Vergi No: {supplier.taxNumber}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      supplier.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {supplier.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => {
                          setEditingSupplier(supplier);
                          setShowAddModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setGeneralSuppliers(prev => prev.filter(s => s.id !== supplier.id))}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2" />
                    {supplier.phone}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="w-4 h-4 mr-2" />
                    {supplier.email}
                  </div>
                  <div className="flex items-start text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>{supplier.address}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">İletişim Kişisi:</span>
                    <span className="font-medium">{supplier.contactPerson}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-600">Ödeme Koşulları:</span>
                    <span className="font-medium">{supplier.paymentTerms}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Oil Supplier Add/Edit Modal */}
      {showOilAddModal && (
        <OilSupplierForm
          supplier={editingOilSupplier}
          onClose={() => {
            setShowOilAddModal(false);
            setEditingOilSupplier(null);
          }}
        />
      )}

      {/* General Supplier Add/Edit Modal */}
      {showAddModal && (
        <GeneralSupplierForm
          supplier={editingSupplier}
          onClose={() => {
            setShowAddModal(false);
            setEditingSupplier(null);
          }}
        />
      )}
    </div>
  );
};

export default SupplierManagement;