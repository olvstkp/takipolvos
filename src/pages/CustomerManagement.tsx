import React, { useState } from 'react';
import { Plus, Edit, Trash2, X, Save, Search, User, Phone, Mail, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCustomers } from '../hooks/useProforma';
import type { Customer } from '../types/proforma';

const CustomerManagement: React.FC = () => {
    const { customers, loading, error, addCustomer, updateCustomer, deleteCustomer } = useCustomers();
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [saving, setSaving] = useState(false);

    const [newCustomer, setNewCustomer] = useState({
        name: '',
        address: '',
        taxId: '',
        contactPerson: '',
        phone: '',
        phone2: '',
        email: '',
        delivery: ''
    });

    const filteredCustomers = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.taxId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddCustomer = async () => {
        if (!newCustomer.name || !newCustomer.address || !newCustomer.taxId) {
            toast.error('Ad, Adres ve Vergi No alanları zorunludur!', {
                icon: '⚠️'
            });
            return;
        }

        const toastId = toast.loading('Müşteri ekleniyor...', {
            icon: '⏳'
        });

        try {
            setSaving(true);
            await addCustomer(newCustomer);
            setShowAddModal(false);
            setNewCustomer({
                name: '',
                address: '',
                taxId: '',
                contactPerson: '',
                phone: '',
                phone2: '',
                email: '',
                delivery: ''
            });
            
            toast.success('Müşteri başarıyla eklendi!', {
                id: toastId,
                icon: '✅',
                duration: 3000
            });
        } catch (error) {
            toast.error('Müşteri eklenirken hata oluştu!', {
                id: toastId,
                icon: '❌',
                duration: 5000
            });
        } finally {
            setSaving(false);
        }
    };

    const handleEditCustomer = async () => {
        if (!editingCustomer) return;

        const toastId = toast.loading('Müşteri güncelleniyor...', {
            icon: '⏳'
        });

        try {
            setSaving(true);
            await updateCustomer(editingCustomer.id, editingCustomer);
            setShowEditModal(false);
            setEditingCustomer(null);
            
            toast.success('Müşteri başarıyla güncellendi!', {
                id: toastId,
                icon: '✅',
                duration: 3000
            });
        } catch (error) {
            toast.error('Müşteri güncellenirken hata oluştu!', {
                id: toastId,
                icon: '❌',
                duration: 5000
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteCustomer = async (customer: Customer) => {
        // Custom confirmation toast
        toast((t) => (
            <div className="flex flex-col space-y-3">
                <div className="flex items-center space-x-2">
                    <span className="text-lg">🗑️</span>
                    <span className="font-medium">Müşteriyi Sil</span>
                </div>
                <p className="text-sm text-gray-600">
                    <strong>"{customer.name}"</strong> müşterisini silmek istediğinizden emin misiniz?
                </p>
                <div className="flex space-x-2 justify-end">
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                        İptal
                    </button>
                    <button
                        onClick={() => {
                            toast.dismiss(t.id);
                            performDelete(customer);
                        }}
                        className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                    >
                        Sil
                    </button>
                </div>
            </div>
        ), {
            duration: Infinity,
            style: {
                background: 'white',
                color: 'black',
                maxWidth: '400px',
            }
        });
    };

    const performDelete = async (customer: Customer) => {
        const toastId = toast.loading('Müşteri siliniyor...', {
            icon: '⏳'
        });

        try {
            await deleteCustomer(customer.id);
            toast.success('Müşteri başarıyla silindi!', {
                id: toastId,
                icon: '✅',
                duration: 3000
            });
        } catch (error) {
            toast.error('Müşteri silinirken hata oluştu!', {
                id: toastId,
                icon: '❌',
                duration: 5000
            });
        }
    };

    const openEditModal = (customer: Customer) => {
        setEditingCustomer({ ...customer });
        setShowEditModal(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Müşteriler yükleniyor...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <strong className="font-bold">Hata!</strong>
                <p className="mt-2">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Müşteri Yönetimi</h1>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Yeni Müşteri Ekle
                </button>
            </div>

            {/* Search Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                <div className="relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Müşteri adı, vergi no veya iletişim kişisi ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md"
                    />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                    {filteredCustomers.length} müşteri gösteriliyor
                </p>
            </div>

            {/* Customer List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Müşteri Bilgileri
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    İletişim
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Vergi No
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Teslimat
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    İşlemler
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredCustomers.map((customer) => (
                                <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                                    <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                </div>
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {customer.name}
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    {customer.contactPerson}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900 dark:text-white">
                                            <div className="flex items-center mb-1">
                                                <Phone className="w-4 h-4 mr-2 text-gray-400" />
                                                {customer.phone}
                                            </div>
                                            {customer.email && (
                                                <div className="flex items-center">
                                                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                                                    {customer.email}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                        {customer.taxId}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center text-sm text-gray-900 dark:text-white">
                                            <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                                            {customer.delivery}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex space-x-2 justify-end">
                                            <button
                                                onClick={() => openEditModal(customer)}
                                                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                                title="Düzenle"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCustomer(customer)}
                                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                title="Sil"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Empty State */}
                {filteredCustomers.length === 0 && (
                    <div className="text-center py-12">
                        <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz müşteri yok'}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            {searchTerm ? 'Farklı kelimeler deneyin' : 'İlk müşterinizi ekleyerek başlayın'}
                        </p>
                        {!searchTerm && (
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Yeni Müşteri Ekle
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Add Customer Modal */}
            {showAddModal && (
                <CustomerModal
                    title="Yeni Müşteri Ekle"
                    customer={newCustomer}
                    onChange={setNewCustomer}
                    onSave={handleAddCustomer}
                    onClose={() => setShowAddModal(false)}
                    saving={saving}
                />
            )}

            {/* Edit Customer Modal */}
            {showEditModal && editingCustomer && (
                <CustomerModal
                    title="Müşteri Düzenle"
                    customer={editingCustomer}
                    onChange={setEditingCustomer}
                    onSave={handleEditCustomer}
                    onClose={() => {
                        setShowEditModal(false);
                        setEditingCustomer(null);
                    }}
                    saving={saving}
                />
            )}
        </div>
    );
};

// Customer Modal Component
interface CustomerModalProps {
    title: string;
    customer: any;
    onChange: (customer: any) => void;
    onSave: () => void;
    onClose: () => void;
    saving: boolean;
}

const CustomerModal: React.FC<CustomerModalProps> = ({
    title,
    customer,
    onChange,
    onSave,
    onClose,
    saving
}) => {
    const handleChange = (field: string, value: string) => {
        onChange({ ...customer, [field]: value });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Müşteri Adı *
                            </label>
                            <input
                                type="text"
                                value={customer.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md"
                                placeholder="Şirket adı"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Vergi No *
                            </label>
                            <input
                                type="text"
                                value={customer.taxId}
                                onChange={(e) => handleChange('taxId', e.target.value)}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md"
                                placeholder="Vergi numarası"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                İletişim Kişisi
                            </label>
                            <input
                                type="text"
                                value={customer.contactPerson}
                                onChange={(e) => handleChange('contactPerson', e.target.value)}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md"
                                placeholder="İletişim kurulacak kişi"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Telefon
                            </label>
                            <input
                                type="tel"
                                value={customer.phone}
                                onChange={(e) => handleChange('phone', e.target.value)}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md"
                                placeholder="Telefon numarası"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Telefon 2
                            </label>
                            <input
                                type="tel"
                                value={customer.phone2}
                                onChange={(e) => handleChange('phone2', e.target.value)}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md"
                                placeholder="İkinci telefon (opsiyonel)"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                E-posta
                            </label>
                            <input
                                type="email"
                                value={customer.email}
                                onChange={(e) => handleChange('email', e.target.value)}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md"
                                placeholder="E-posta adresi"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Adres *
                        </label>
                        <textarea
                            value={customer.address}
                            onChange={(e) => handleChange('address', e.target.value)}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md"
                            rows={3}
                            placeholder="Tam adres"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Teslimat Yeri
                        </label>
                        <input
                            type="text"
                            value={customer.delivery}
                            onChange={(e) => handleChange('delivery', e.target.value)}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md"
                            placeholder="Teslimat yapılacak yer"
                        />
                    </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        İptal
                    </button>
                    <button
                        onClick={onSave}
                        disabled={saving}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomerManagement; 