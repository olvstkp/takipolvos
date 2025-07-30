import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Save, X, Tag, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useProformaGroups } from '../hooks/useProforma';
import toast from 'react-hot-toast';

interface ProformaGroup {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProformaGroupsManagementProps {
  onClose: () => void;
}

const ProformaGroupsManagement: React.FC<ProformaGroupsManagementProps> = ({ onClose }) => {
  const { proformaGroups, loading, addProformaGroup } = useProformaGroups();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ProformaGroup | null>(null);
  const [localGroups, setLocalGroups] = useState<ProformaGroup[]>([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{show: boolean, group: ProformaGroup | null}>({show: false, group: null});

  // Local state'i güncelle
  useEffect(() => {
    setLocalGroups(proformaGroups);
  }, [proformaGroups]);

  // Filtered groups
  const filteredGroups = localGroups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Save group
  const handleSaveGroup = async (groupData: Partial<ProformaGroup>) => {
    try {
      if (editingGroup) {
        // Update existing group
        const { error } = await supabase
          .from('proforma_groups')
          .update({
            name: groupData.name,
            is_active: groupData.is_active
          })
          .eq('id', editingGroup.id);

        if (error) throw error;
        
        // Update local state
        setLocalGroups(prev => prev.map(g => 
          g.id === editingGroup.id 
            ? { ...g, ...groupData } as ProformaGroup
            : g
        ));
        
        toast.success('Proforma grubu başarıyla güncellendi!');
      } else {
        // Generate next ID
        const { data: existingGroups } = await supabase
          .from('proforma_groups')
          .select('id')
          .order('id');

        let nextId = 'pg_1';
        if (existingGroups && existingGroups.length > 0) {
          const maxNum = Math.max(...existingGroups
            .map(g => parseInt(g.id.replace('pg_', '')))
            .filter(num => !isNaN(num))
          );
          nextId = `pg_${maxNum + 1}`;
        }

        // Add new group directly
        const { error } = await supabase
          .from('proforma_groups')
          .insert({
            id: nextId,
            name: groupData.name,
            is_active: groupData.is_active ?? true
          });

        if (error) throw error;
        
        // Update local state
        const newGroup = {
          id: nextId,
          name: groupData.name!,
          is_active: groupData.is_active ?? true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setLocalGroups(prev => [...prev, newGroup]);
        
        toast.success('Yeni proforma grubu başarıyla eklendi!');
      }

      setShowAddModal(false);
      setEditingGroup(null);
    } catch (err: any) {
      toast.error(`Hata: ${err.message}`);
    }
  };

  // Show delete confirmation
  const handleDeleteClick = (group: ProformaGroup) => {
    setDeleteConfirmation({show: true, group});
  };

  // Confirm delete group
  const handleConfirmDelete = async () => {
    if (!deleteConfirmation.group) return;

    try {
      const { error } = await supabase
        .from('proforma_groups')
        .update({ is_active: false })
        .eq('id', deleteConfirmation.group.id);

      if (error) throw error;
      
      // Update local state
      setLocalGroups(prev => prev.map(g => 
        g.id === deleteConfirmation.group?.id ? { ...g, is_active: false } : g
      ));
      
      toast.success(`"${deleteConfirmation.group.name}" grubu başarıyla silindi!`, {
        duration: 3000,
        position: 'top-right',
      });
      
      setDeleteConfirmation({show: false, group: null});
    } catch (err: any) {
      toast.error(`Hata: ${err.message}`);
    }
  };

  // Cancel delete
  const handleCancelDelete = () => {
    setDeleteConfirmation({show: false, group: null});
  };

  // Activate group
  const handleActivateGroup = async (group: ProformaGroup) => {
    try {
      const { error } = await supabase
        .from('proforma_groups')
        .update({ is_active: true })
        .eq('id', group.id);

      if (error) throw error;
      
      // Update local state
      setLocalGroups(prev => prev.map(g => 
        g.id === group.id ? { ...g, is_active: true } : g
      ));
      
      toast.success(`"${group.name}" grubu başarıyla aktifleştirildi!`, {
        duration: 3000,
        position: 'top-right',
      });
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
              <Tag className="w-6 h-6 text-green-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Proforma Grupları Yönetimi</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Toplam {localGroups.length} grup</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Yeni Grup Ekle
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
                placeholder="Grup adı ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Grup Adı</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Durum</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredGroups.map((group) => (
                    <tr key={group.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{group.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          group.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {group.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setEditingGroup(group);
                              setShowAddModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Düzenle"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {group.is_active ? (
                            <button
                              onClick={() => handleDeleteClick(group)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Pasif Yap"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivateGroup(group)}
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
        <GroupModal
          group={editingGroup}
          onSave={handleSaveGroup}
          onClose={() => {
            setShowAddModal(false);
            setEditingGroup(null);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation.show && deleteConfirmation.group && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Proforma Grubu Silme Onayı</h3>
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
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white">Proforma Grubunu Sil</h4>
                </div>
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                <strong>"{deleteConfirmation.group.name}"</strong> adlı proforma grubunu silmek istediğinizden emin misiniz?
              </p>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  ⚠️ Bu işlem proforma grubunu pasif hale getirecektir. Grup tamamen silinmeyecek, sadece görünmez olacaktır.
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
                Grubu Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Group Modal Component
interface GroupModalProps {
  group: ProformaGroup | null;
  onSave: (groupData: Partial<ProformaGroup>) => void;
  onClose: () => void;
}

const GroupModal: React.FC<GroupModalProps> = ({ group, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: group?.name || '',
    is_active: group?.is_active ?? true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {group ? 'Proforma Grubu Düzenle' : 'Yeni Proforma Grubu Ekle'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Grup Adı *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Örn: OLIVE OIL SHOWER GEL 750ML"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Bu isim direkt olarak proforma belgesinde görünecektir.
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Aktif Grup
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
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {group ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProformaGroupsManagement;