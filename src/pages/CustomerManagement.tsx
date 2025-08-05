import React, { useState, useRef } from 'react';
import { Plus, Edit, Trash2, X, Save, Search, User, Phone, Mail, MapPin, Download, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCustomers } from '../hooks/useProforma';
import type { Customer } from '../types/proforma';
import { generateCustomersExcel, generateCustomerTemplate } from '../utils/excelExport';
import * as XLSX from 'xlsx';

const CustomerManagement: React.FC = () => {
    const { customers, loading, error, addCustomer, updateCustomer, deleteCustomer } = useCustomers();
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewCustomers, setPreviewCustomers] = useState<any[]>([]);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Excel Export Fonksiyonu
    const handleExportExcel = async () => {
        try {
            await generateCustomersExcel({ customers });
            toast.success('Müşteri listesi Excel dosyası olarak indirildi!');
        } catch (error) {
            console.error('Excel export hatası:', error);
            toast.error('Excel dosyası oluşturulurken hata oluştu!');
        }
    };

    // Şablon İndirme Fonksiyonu
    const handleDownloadTemplate = async () => {
        try {
            await generateCustomerTemplate();
            toast.success('Müşteri şablonu indirildi!');
        } catch (error) {
            console.error('Şablon indirme hatası:', error);
            toast.error('Şablon indirilirken hata oluştu!');
        }
    };

    // Excel Import Fonksiyonu - Önizleme ile
    const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const toastId = toast.loading('Excel dosyası işleniyor...');

        try {
            const data = await readExcelFile(file);
            console.log('Import edilen veri:', data);
            
            // İlk satır başlık, onu atla ve sadece veri satırlarını al
            const importedCustomers = data.filter((customer: any, index: number) => {
                // İlk satırı atla (başlık satırı)
                if (index === 0) return false;
                
                // Boş satırları atla
                if (!customer || Object.values(customer).every(val => !val)) return false;
                
                // Müşteri adı kontrolü - örnek veriyi de dahil et
                const customerName = customer['MÜŞTERİ ADI'] || customer.name;
                return customerName && customerName !== '';
            });

            if (importedCustomers.length === 0) {
                toast.error('Geçerli müşteri verisi bulunamadı! Lütfen şablonu kullanın.', { id: toastId });
                return;
            }

            // Önizleme için verileri hazırla
            const previewData = importedCustomers.map((customer: any) => {
                const customerName = customer['MÜŞTERİ ADI'] || customer.name;
                const customerAddress = customer['ADRES'] || customer.address;
                const customerTaxId = customer['VERGİ NO'] || customer.tax_id;
                
                return {
                    name: customerName,
                    address: customerAddress,
                    taxId: customerTaxId,
                    contactPerson: customer['İLETİŞİM KİŞİSİ'] || customer.contact_person || customer.contactPerson || '',
                    phone: customer['TELEFON'] || customer.phone || '',
                    phone2: customer['TELEFON 2'] || customer.phone2 || '',
                    email: customer['E-POSTA'] || customer.email || '',
                    delivery: customer['TESLİMAT'] || customer.delivery || '',
                    isValid: !!(customerName && customerAddress && customerTaxId),
                    exists: customers.some(existing => 
                        existing.tax_id === customerTaxId || 
                        existing.name.toLowerCase() === customerName.toLowerCase()
                    ),
                    isExample: customerName === 'ÖRNEK MÜŞTERİ A.Ş.'
                };
            });

            setPreviewCustomers(previewData);
            setShowPreviewModal(true);
            setShowImportModal(false);
            
            // File input'u temizle
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            
            toast.dismiss(toastId);
        } catch (error) {
            console.error('Excel import hatası:', error);
            toast.error('Excel dosyası işlenirken hata oluştu!', { id: toastId });
        }
    };

    // Excel dosyasını okuma fonksiyonu
    const readExcelFile = (file: File): Promise<any[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    
                    // JSON'a çevir - header: 1 kullanarak ilk satırı başlık yap
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                        header: 1,
                        defval: '' // Boş hücreler için varsayılan değer
                    });
                    
                    // İlk satır başlık, onu kullan
                    const headers = jsonData[0] as string[];
                    const rows = jsonData.slice(1) as any[][];
                    
                    const customers = rows.map(row => {
                        const customer: any = {};
                        headers.forEach((header, index) => {
                            if (row[index] !== undefined && row[index] !== '') {
                                customer[header] = row[index];
                            }
                        });
                        return customer;
                    });
                    
                    resolve(customers);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
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
                <div className="flex items-center space-x-2">
                    {/* Excel Import Modal */}
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                        <Upload className="w-4 h-4 mr-2" />
                        Excel İçe Aktar
                    </button>
                    
                    {/* Excel Export */}
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Excel Dışa Aktar
                    </button>
                    
                    {/* Yeni Müşteri Ekle */}
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Yeni Müşteri Ekle
                    </button>
                </div>
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

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                Excel İçe Aktarma
                            </h3>
                            <button
                                onClick={() => setShowImportModal(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Talimatlar */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-3">
                                    📋 Excel İçe Aktarma Talimatları:
                                </h4>
                                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                                    <li className="flex items-start">
                                        <span className="mr-2">1.</span>
                                        <span><strong>Şablon İndir</strong> butonuna tıklayarak boş Excel şablonunu indirin</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="mr-2">2.</span>
                                        <span>İndirilen dosyaya kendi müşteri verilerinizi ekleyin</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="mr-2">3.</span>
                                        <span><strong>MÜŞTERİ ADI</strong>, <strong>ADRES</strong> ve <strong>VERGİ NO</strong> alanları zorunludur</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="mr-2">4.</span>
                                        <span>Dosyayı kaydedip <strong>Dosya Seç</strong> butonu ile yükleyin</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="mr-2">5.</span>
                                        <span>Önizleme gösterilecek ve onayladıktan sonra eklenecektir</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Şablon İndirme */}
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                                    📄 Şablon İndir
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    Boş Excel şablonunu indirin ve kendi müşteri verilerinizi ekleyin.
                                </p>
                                <button
                                    onClick={handleDownloadTemplate}
                                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Şablon İndir
                                </button>
                            </div>

                            {/* Dosya Yükleme */}
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                                    📤 Excel Dosyası Yükle
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    Doldurduğunuz Excel dosyasını seçin ve sisteme yükleyin.
                                </p>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImportExcel}
                                    accept=".xlsx,.xls"
                                    className="hidden"
                                    id="excel-import-modal"
                                />
                                <label
                                    htmlFor="excel-import-modal"
                                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer"
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    Dosya Seç
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end mt-6">
                            <button
                                onClick={() => setShowImportModal(false)}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {showPreviewModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                Müşteri Verileri Önizleme
                            </h3>
                            <button
                                onClick={() => setShowPreviewModal(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    <strong>{previewCustomers.length}</strong> müşteri bulundu. 
                                    Geçerli olanlar yeşil, eksik bilgili olanlar kırmızı, mevcut olanlar gri ile işaretlenmiştir.
                                </p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Müşteri Adı</th>
                                            <th className="px-3 py-2 text-left">Adres</th>
                                            <th className="px-3 py-2 text-left">Vergi No</th>
                                            <th className="px-3 py-2 text-left">İletişim</th>
                                            <th className="px-3 py-2 text-left">Telefon</th>
                                            <th className="px-3 py-2 text-left">Durum</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {previewCustomers.map((customer, index) => (
                                            <tr 
                                                key={index} 
                                                className={`${
                                                    customer.isExample
                                                        ? 'bg-yellow-50 dark:bg-yellow-900/20' 
                                                        : !customer.isValid 
                                                            ? 'bg-red-50 dark:bg-red-900/20' 
                                                            : customer.exists 
                                                                ? 'bg-gray-50 dark:bg-gray-700' 
                                                                : 'bg-green-50 dark:bg-green-900/20'
                                                }`}
                                            >
                                                <td className="px-3 py-2">{customer.name || '-'}</td>
                                                <td className="px-3 py-2">{customer.address || '-'}</td>
                                                <td className="px-3 py-2">{customer.taxId || '-'}</td>
                                                <td className="px-3 py-2">{customer.contactPerson || '-'}</td>
                                                <td className="px-3 py-2">{customer.phone || '-'}</td>
                                                <td className="px-3 py-2">
                                                    {customer.isExample ? (
                                                        <span className="text-yellow-600 dark:text-yellow-400">📝 Örnek Veri</span>
                                                    ) : !customer.isValid ? (
                                                        <span className="text-red-600 dark:text-red-400">❌ Eksik Bilgi</span>
                                                    ) : customer.exists ? (
                                                        <span className="text-gray-600 dark:text-gray-400">⚠️ Mevcut</span>
                                                    ) : (
                                                        <span className="text-green-600 dark:text-green-400">✅ Yeni</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => setShowPreviewModal(false)}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                İptal
                            </button>
                            <button
                                onClick={async () => {
                                    const toastId = toast.loading('Müşteriler ekleniyor...');
                                    try {
                                        let addedCount = 0;
                                        for (const customer of previewCustomers) {
                                            if (customer.isValid && !customer.exists && !customer.isExample) {
                                                await addCustomer({
                                                    name: customer.name,
                                                    address: customer.address,
                                                    taxId: customer.taxId,
                                                    contactPerson: customer.contactPerson,
                                                    phone: customer.phone,
                                                    phone2: customer.phone2,
                                                    email: customer.email,
                                                    delivery: customer.delivery
                                                });
                                                addedCount++;
                                            }
                                        }
                                        toast.success(`${addedCount} yeni müşteri eklendi!`, { id: toastId });
                                        setShowPreviewModal(false);
                                        setPreviewCustomers([]);
                                    } catch (error) {
                                        toast.error('Müşteriler eklenirken hata oluştu!', { id: toastId });
                                    }
                                }}
                                disabled={!previewCustomers.some(c => c.isValid && !c.exists && !c.isExample)}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                İçeri Aktar
                            </button>
                        </div>
                    </div>
                </div>
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