import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Save, X, Package, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Series {
  id: string;
  name: string;
  pieces_per_case: number;
  net_weight_kg_per_piece: number;
  net_weight_kg_per_case: number;
  packaging_weight_kg_per_case: number;
  width_cm?: number;
  length_cm?: number;
  height_cm?: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SeriesManagementProps {
  onClose: () => void;
}

const SeriesManagement: React.FC<SeriesManagementProps> = ({ onClose }) => {
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{show: boolean, series: Series | null}>({show: false, series: null});

  // Fetch series
  const fetchSeries = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('series')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSeries(data || []);
    } catch (err: any) {
      toast.error(`Hata: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeries();
  }, []);

  // Filtered series
  const filteredSeries = series.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Save series
  const handleSaveSeries = async (seriesData: Partial<Series>) => {
    try {
      if (editingSeries) {
        // Update existing series
        const net_weight_kg_per_case = (seriesData.net_weight_kg_per_piece || 0) * (seriesData.pieces_per_case || 1);
        
        const { error } = await supabase
          .from('series')
          .update({
            name: seriesData.name,
            pieces_per_case: seriesData.pieces_per_case,
            net_weight_kg_per_piece: seriesData.net_weight_kg_per_piece,
            net_weight_kg_per_case: net_weight_kg_per_case,
            packaging_weight_kg_per_case: seriesData.packaging_weight_kg_per_case,
            width_cm: seriesData.width_cm || null,
            length_cm: seriesData.length_cm || null,
            height_cm: seriesData.height_cm || null,
            description: seriesData.description || null,
            is_active: seriesData.is_active
          })
          .eq('id', editingSeries.id);

        if (error) throw error;
        toast.success('Seri başarıyla güncellendi!');
      } else {
        // Add new series
        const net_weight_kg_per_case = (seriesData.net_weight_kg_per_piece || 0) * (seriesData.pieces_per_case || 1);
        
        const { error } = await supabase
          .from('series')
          .insert({
            name: seriesData.name,
            pieces_per_case: seriesData.pieces_per_case,
            net_weight_kg_per_piece: seriesData.net_weight_kg_per_piece,
            net_weight_kg_per_case: net_weight_kg_per_case,
            packaging_weight_kg_per_case: seriesData.packaging_weight_kg_per_case,
            width_cm: seriesData.width_cm || null,
            length_cm: seriesData.length_cm || null,
            height_cm: seriesData.height_cm || null,
            description: seriesData.description || null,
            is_active: seriesData.is_active ?? true
          });

        if (error) throw error;
        toast.success('Yeni seri başarıyla eklendi!');
      }

      setShowAddModal(false);
      setEditingSeries(null);
      fetchSeries();
    } catch (err: any) {
      toast.error(`Hata: ${err.message}`);
    }
  };

  // Show delete confirmation
  const handleDeleteClick = (series: Series) => {
    setDeleteConfirmation({show: true, series});
  };

  // Confirm delete series
  const handleConfirmDelete = async () => {
    if (!deleteConfirmation.series) return;

    try {
      const { error } = await supabase
        .from('series')
        .update({ is_active: false })
        .eq('id', deleteConfirmation.series.id);

      if (error) throw error;
      
      toast.success(`"${deleteConfirmation.series.name}" serisi başarıyla silindi!`, {
        duration: 3000,
        position: 'top-right',
      });
      
      setDeleteConfirmation({show: false, series: null});
      fetchSeries();
    } catch (err: any) {
      toast.error(`Hata: ${err.message}`);
    }
  };

  // Cancel delete
  const handleCancelDelete = () => {
    setDeleteConfirmation({show: false, series: null});
  };

  // Activate series
  const handleActivateSeries = async (series: Series) => {
    try {
      const { error } = await supabase
        .from('series')
        .update({ is_active: true })
        .eq('id', series.id);

      if (error) throw error;
      
      toast.success(`"${series.name}" serisi başarıyla aktifleştirildi!`, {
        duration: 3000,
        position: 'top-right',
      });
      
      fetchSeries();
    } catch (err: any) {
      toast.error(`Hata: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Main Modal */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl h-5/6 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <Package className="w-6 h-6 text-blue-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Seri Yönetimi</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Toplam {series.length} seri</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Yeni Seri Ekle
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Seri adı ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Seri Adı</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Adet/Koli</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Net Ağırlık (kg/adet)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Net Ağırlık (kg/koli)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ambalaj Ağırlığı (kg)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Boyutlar (cm)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Durum</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredSeries.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{s.name}</div>
                        {s.description && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">{s.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {s.pieces_per_case}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {s.net_weight_kg_per_piece}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {s.net_weight_kg_per_case}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {s.packaging_weight_kg_per_case}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {s.width_cm && s.length_cm && s.height_cm 
                          ? `${s.width_cm} × ${s.length_cm} × ${s.height_cm}`
                          : 'Belirtilmemiş'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          s.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {s.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setEditingSeries(s);
                              setShowAddModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Düzenle"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {s.is_active ? (
                            <button
                              onClick={() => handleDeleteClick(s)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Pasif Yap"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivateSeries(s)}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                              title="Aktifleştir"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <SeriesModal
          series={editingSeries}
          onSave={handleSaveSeries}
          onClose={() => {
            setShowAddModal(false);
            setEditingSeries(null);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation.show && deleteConfirmation.series && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Seri Silme Onayı</h3>
              <button
                onClick={handleCancelDelete}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white">Seriyi Sil</h4>
                </div>
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                <strong>"{deleteConfirmation.series.name}"</strong> adlı seriyi silmek istediğinizden emin misiniz?
              </p>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  ⚠️ Bu işlem seriyi pasif hale getirecektir. Seri tamamen silinmeyecek, sadece görünmez olacaktır.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                İptal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Seriyi Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Series Modal Component
interface SeriesModalProps {
  series: Series | null;
  onSave: (seriesData: Partial<Series>) => void;
  onClose: () => void;
}

const SeriesModal: React.FC<SeriesModalProps> = ({ series, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: series?.name || '',
    pieces_per_case: series?.pieces_per_case || 1,
    net_weight_kg_per_piece: series?.net_weight_kg_per_piece || 0,
    packaging_weight_kg_per_case: series?.packaging_weight_kg_per_case || 0,
    width_cm: series?.width_cm || 0,
    length_cm: series?.length_cm || 0,
    height_cm: series?.height_cm || 0,
    description: series?.description || '',
    is_active: series?.is_active ?? true
  });

  // Calculate net_weight_kg_per_case automatically
  const net_weight_kg_per_case = formData.net_weight_kg_per_piece * formData.pieces_per_case;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {series ? 'Seri Düzenle' : 'Yeni Seri Ekle'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Seri Adı *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Örn: 500ML X12"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Koli Başına Adet *
              </label>
              <input
                type="number"
                value={formData.pieces_per_case}
                onChange={(e) => setFormData({ ...formData, pieces_per_case: parseInt(e.target.value) || 1 })}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Adet Başına Net Ağırlık (kg) *
              </label>
              <input
                type="number"
                step="0.001"
                value={formData.net_weight_kg_per_piece}
                onChange={(e) => setFormData({ ...formData, net_weight_kg_per_piece: parseFloat(e.target.value) || 0 })}
                placeholder="0.500"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Koli Başına Net Ağırlık (kg) - Otomatik Hesaplanır
            </label>
            <input
              type="number"
              step="0.001"
              value={net_weight_kg_per_case.toFixed(3)}
              readOnly
              className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Koli Ambalaj Ağırlığı (kg) *
            </label>
            <input
              type="number"
              step="0.001"
              value={formData.packaging_weight_kg_per_case}
              onChange={(e) => setFormData({ ...formData, packaging_weight_kg_per_case: parseFloat(e.target.value) || 0 })}
              placeholder="1.297"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Genişlik (cm)
              </label>
              <input
                type="number"
                value={formData.width_cm}
                onChange={(e) => setFormData({ ...formData, width_cm: parseInt(e.target.value) || 0 })}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Uzunluk (cm)
              </label>
              <input
                type="number"
                value={formData.length_cm}
                onChange={(e) => setFormData({ ...formData, length_cm: parseInt(e.target.value) || 0 })}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Yükseklik (cm)
              </label>
              <input
                type="number"
                value={formData.height_cm}
                onChange={(e) => setFormData({ ...formData, height_cm: parseInt(e.target.value) || 0 })}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Açıklama
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Seri hakkında açıklama..."
              className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Aktif Seri
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              İptal
            </button>
            <button
              type="submit"
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {series ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SeriesManagement;