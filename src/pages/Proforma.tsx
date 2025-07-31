import React, { useState, useEffect } from 'react';
import { FileText, Plus, Eye, Edit, Download, Trash2, X, Save, Calendar, User, DollarSign, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import ProformaGenerator from './ProformaGenerator';
import * as XLSX from 'xlsx';

interface ProformaListItem {
    id: string;
    proforma_number: string;
    issue_date: string;
    total_amount: number;
    status: string;
    customer_name: string;
    customer_address: string;
    item_count: number;
    payment_method: string;
    delivery: string;
    created_at: string;
}

interface Customer {
    id: string;
    name: string;
    address: string;
    tax_id: string;
    contact_person: string;
    phone: string;
    phone2: string;
    email: string;
    delivery: string;
}

interface Product {
    id: string;
    name: string;
    series_id: string;
    price_per_case: number;
    price_per_piece: number;
    series?: {
        name: string;
        pieces_per_case: number;
        net_weight_kg_per_piece: number;
    };
}

interface ProformaItem {
    id?: string;
    product_id: string;
    description?: string;
    quantity: number;
    unit_price: number;
    total: number;
    unit: 'case' | 'piece';
    product?: Product;
}

interface ProformaDetail {
    id: string;
    proforma_number: string;
    customer_id: string;
    issue_date: string;
    validity_date: string;
    payment_method: string;
    delivery: string;
    notes?: string;
    total_amount: number;
    status: string;
    weight_per_pallet_kg: number;
    customer: Customer;
    proforma_items: ProformaItem[];
    pallets: Array<{
        id: string;
        pallet_number: number;
        width_cm: number;
        length_cm: number;
        height_cm: number;
    }>;
}

const Proforma: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
    const [proformas, setProformas] = useState<ProformaListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [showViewModal, setShowViewModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedProforma, setSelectedProforma] = useState<ProformaDetail | null>(null);
    const [editingProforma, setEditingProforma] = useState<ProformaDetail | null>(null);
    const [deletingProforma, setDeletingProforma] = useState<ProformaListItem | null>(null);

    const fetchProformas = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('proformas')
                .select(`
                    id,
                    proforma_number,
                    issue_date,
                    total_amount,
                    status,
                    payment_method,
                    delivery,
                    created_at,
                    customers!inner (
                        name,
                        address
                    ),
                    proforma_items (
                        id
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formattedData: ProformaListItem[] = data.map((item: any) => ({
                id: item.id,
                proforma_number: item.proforma_number,
                issue_date: item.issue_date,
                total_amount: item.total_amount,
                status: item.status,
                customer_name: item.customers.name,
                customer_address: item.customers.address,
                item_count: item.proforma_items.length,
                payment_method: item.payment_method,
                delivery: item.delivery,
                created_at: item.created_at
            }));

            setProformas(formattedData);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchProformaDetail = async (proformaId: string): Promise<ProformaDetail | null> => {
        try {
            // Paralel sorgular - daha hızlı
            const [proformaResult, itemsResult, palletsResult] = await Promise.all([
                // Proforma + Customer
                supabase
                    .from('proformas')
                    .select(`
                        *,
                        customer:customers (
                            id,
                            name,
                            address,
                            tax_id,
                            contact_person,
                            phone,
                            phone2,
                            email,
                            delivery
                        )
                    `)
                    .eq('id', proformaId)
                    .single(),
                
                // Proforma Items
                supabase
                    .from('proforma_items')
                    .select(`
                        id,
                        product_id,
                        description,
                        quantity,
                        unit_price,
                        total,
                        unit
                    `)
                    .eq('proforma_id', proformaId),

                // Pallets
                supabase
                    .from('pallets')
                    .select(`
                        id,
                        pallet_number,
                        width_cm,
                        length_cm,
                        height_cm
                    `)
                    .eq('proforma_id', proformaId)
            ]);

            // Error kontrolü
            if (proformaResult.error) {
                console.error('Supabase error fetching proforma:', proformaResult.error);
                throw proformaResult.error;
            }

            if (itemsResult.error) {
                console.error('Supabase error fetching items:', itemsResult.error);
                throw itemsResult.error;
            }

            const proformaData = proformaResult.data;
            const itemsData = itemsResult.data || [];
            const palletsData = palletsResult.data || [];

            // Customer data kontrolü
            if (!proformaData?.customer) {
                console.error('Customer data missing for proforma:', proformaId);
                return null;
            }

            // Product bilgilerini paralel çek (sadece gerekli olanları)
            const productIds = itemsData.map(item => item.product_id).filter(Boolean);
            let productsData: any[] = [];
            
            if (productIds.length > 0) {
                const { data: products, error: productsError } = await supabase
                    .from('products')
                    .select(`
                        id,
                        name,
                        series_id,
                        price_per_case,
                        price_per_piece,
                        series (
                            name,
                            pieces_per_case,
                            net_weight_kg_per_piece
                        )
                    `)
                    .in('id', productIds);

                if (!productsError) {
                    productsData = products || [];
                }
            }

            // Verileri birleştir
            const proformaItems = itemsData.map(item => {
                const product = productsData.find(p => p.id === item.product_id);
                return {
                    ...item,
                    product: product || null
                };
            });

            const result: ProformaDetail = {
                ...proformaData,
                proforma_items: proformaItems,
                pallets: palletsData
            };
            
            return result;
        } catch (err: any) {
            console.error('Error fetching proforma detail:', err);
            return null;
        }
    };

    const handleView = async (proformaId: string) => {
        const loadingToast = toast.loading('Proforma detayları yükleniyor...');
        
        try {
            const detail = await fetchProformaDetail(proformaId);
            if (detail) {
                setSelectedProforma(detail);
                setShowViewModal(true);
                toast.success('Proforma detayları yüklendi!', { id: loadingToast });
            } else {
                toast.error('Proforma detayları yüklenemedi!', { id: loadingToast });
            }
        } catch (error) {
            toast.error('Bir hata oluştu!', { id: loadingToast });
        }
    };

    const handleEdit = async (proformaId: string) => {
        const loadingToast = toast.loading('Proforma düzenleme için hazırlanıyor...');
        
        try {
            const detail = await fetchProformaDetail(proformaId);
            if (detail) {
                setEditingProforma(detail);
                setShowEditModal(true);
                toast.success('Düzenleme modu hazır!', { id: loadingToast });
            } else {
                toast.error('Proforma detayları yüklenemedi!', { id: loadingToast });
            }
        } catch (error) {
            toast.error('Bir hata oluştu!', { id: loadingToast });
        }
    };

    const handleDelete = async (proformaId: string) => {
        // Get proforma info for confirmation
        const proformaToDelete = proformas.find(p => p.id === proformaId);
        if (proformaToDelete) {
            setDeletingProforma(proformaToDelete);
            setShowDeleteModal(true);
        }
    };

    const performProformaDelete = async (proformaId: string) => {
        const toastId = toast.loading('Proforma siliniyor...', {
            icon: '⏳'
        });

        try {
            const { error } = await supabase
                .from('proformas')
                .delete()
                .eq('id', proformaId);

            if (error) throw error;
            await fetchProformas(); // Refresh list
            
            toast.success('Proforma başarıyla silindi!', {
                id: toastId,
                icon: '✅',
                duration: 3000
            });
        } catch (err: any) {
            toast.error(`Hata: ${err.message}`, {
                id: toastId,
                icon: '❌',
                duration: 5000
            });
        }
    };

    const handleDownload = async (proformaId: string) => {
        const detail = await fetchProformaDetail(proformaId);
        if (!detail) return;

        // Excel dosyası oluştur
        const workbook = XLSX.utils.book_new();
        
        // Proforma bilgileri
        const proformaInfo = [
            ['Proforma Numarası', detail.proforma_number],
            ['Tarih', new Date(detail.issue_date).toLocaleDateString('tr-TR')],
            ['Geçerlilik', new Date(detail.validity_date).toLocaleDateString('tr-TR')],
            ['Durum', detail.status],
            ['Ödeme', detail.payment_method],
            ['Teslimat', detail.delivery],
            [''],
            ['Müşteri Bilgileri'],
            ['Ad', detail.customer.name],
            ['Adres', detail.customer.address],
            ['Vergi No', detail.customer.tax_id],
            ['İletişim', detail.customer.contact_person],
            ['Telefon', detail.customer.phone],
            ['E-posta', detail.customer.email],
            [''],
            ['Ürün Listesi']
        ];

        // Ürün başlıkları
        const itemHeaders = ['Ürün Adı', 'Miktar', 'Birim', 'Birim Fiyat', 'Toplam'];
        
        // Ürün verileri
        const itemData = detail.proforma_items.map(item => [
            item.product?.name || 'Ürün Bulunamadı',
            item.quantity,
            item.unit === 'case' ? 'Koli' : 'Adet',
            `€${item.unit_price.toFixed(2)}`,
            `€${item.total.toFixed(2)}`
        ]);

        const sheetData = [...proformaInfo, itemHeaders, ...itemData, [''], ['Toplam Tutar', `€${detail.total_amount.toFixed(2)}`]];
        
        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Proforma');
        
        XLSX.writeFile(workbook, `proforma_${detail.proforma_number}.xlsx`);
    };

    const updateProforma = async (updatedData: Partial<ProformaDetail>) => {
        if (!editingProforma) return;

        const toastId = toast.loading('Proforma güncelleniyor...', {
            icon: '⏳'
        });

        try {
            // Update proforma
            const { error: proformaError } = await supabase
                .from('proformas')
                .update({
                    issue_date: updatedData.issue_date,
                    validity_date: updatedData.validity_date,
                    payment_method: updatedData.payment_method,
                    delivery: updatedData.delivery,
                    notes: updatedData.notes,
                    status: updatedData.status,
                    weight_per_pallet_kg: updatedData.weight_per_pallet_kg
                })
                .eq('id', editingProforma.id);

            if (proformaError) throw proformaError;

            // Delete existing items
            const { error: deleteError } = await supabase
                .from('proforma_items')
                .delete()
                .eq('proforma_id', editingProforma.id);

            if (deleteError) throw deleteError;

            // Insert updated items
            if (updatedData.proforma_items && updatedData.proforma_items.length > 0) {
                const { error: itemsError } = await supabase
                    .from('proforma_items')
                    .insert(
                        updatedData.proforma_items.map(item => ({
                            proforma_id: editingProforma.id,
                            product_id: item.product_id,
                            description: item.description || item.product?.name || '',
                            quantity: item.quantity,
                            unit_price: item.unit_price,
                            total: item.total,
                            unit: item.unit
                        }))
                    );

                if (itemsError) throw itemsError;
            }

            // Delete existing pallets
            const { error: deletePalletsError } = await supabase
                .from('pallets')
                .delete()
                .eq('proforma_id', editingProforma.id);

            if (deletePalletsError) throw deletePalletsError;

            // Insert updated pallets
            if (updatedData.pallets && updatedData.pallets.length > 0) {
                const { error: palletsError } = await supabase
                    .from('pallets')
                    .insert(
                        updatedData.pallets.map(pallet => ({
                            proforma_id: editingProforma.id,
                            pallet_number: pallet.pallet_number,
                            width_cm: pallet.width_cm,
                            length_cm: pallet.length_cm,
                            height_cm: pallet.height_cm
                        }))
                    );

                if (palletsError) throw palletsError;
            }

            setShowEditModal(false);
            setEditingProforma(null);
            await fetchProformas();
            
            toast.success('Proforma başarıyla güncellendi!', {
                id: toastId,
                icon: '✅',
                duration: 3000
            });
        } catch (err: any) {
            toast.error(`Hata: ${err.message}`, {
                id: toastId,
                icon: '❌',
                duration: 5000
            });
        }
    };

    useEffect(() => {
        if (activeTab === 'list') {
            fetchProformas();
        }
    }, [activeTab]);

    const filteredProformas = selectedStatus === 'all' 
        ? proformas 
        : proformas.filter(p => p.status === selectedStatus);

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            draft: { color: 'bg-gray-100 text-gray-800', text: 'Taslak' },
            confirmed: { color: 'bg-blue-100 text-blue-800', text: 'Onaylandı' },
            sent: { color: 'bg-green-100 text-green-800', text: 'Gönderildi' },
            cancelled: { color: 'bg-red-100 text-red-800', text: 'İptal' }
        };
        
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                {config.text}
            </span>
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('tr-TR');
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Proforma Yönetimi</h1>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'list'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                    >
                        <FileText className="w-4 h-4 inline mr-2" />
                        Proforma Listesi ({proformas.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('create')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'create'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                    >
                        <Plus className="w-4 h-4 inline mr-2" />
                        Yeni Proforma Oluştur
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'list' ? (
                <ProformaListTab 
                    proformas={filteredProformas}
                    loading={loading}
                    error={error}
                    selectedStatus={selectedStatus}
                    setSelectedStatus={setSelectedStatus}
                    onView={handleView}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onDownload={handleDownload}
                    getStatusBadge={getStatusBadge}
                    formatDate={formatDate}
                    formatCurrency={formatCurrency}
                />
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                    <ProformaGenerator onSuccess={() => {
                        setActiveTab('list');
                        fetchProformas();
                    }} />
                </div>
            )}

            {/* View Modal */}
            {showViewModal && selectedProforma && (
                <ProformaViewModal 
                    proforma={selectedProforma}
                    onClose={() => {
                        setShowViewModal(false);
                        setSelectedProforma(null);
                    }}
                    formatDate={formatDate}
                    formatCurrency={formatCurrency}
                    getStatusBadge={getStatusBadge}
                />
            )}

            {/* Edit Modal */}
            {showEditModal && editingProforma && (
                <ProformaEditModal 
                    proforma={editingProforma}
                    onClose={() => {
                        setShowEditModal(false);
                        setEditingProforma(null);
                    }}
                    onSave={updateProforma}
                />
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && deletingProforma && (
                <ProformaDeleteModal
                    proforma={deletingProforma}
                    onClose={() => {
                        setShowDeleteModal(false);
                        setDeletingProforma(null);
                    }}
                    onConfirm={(proformaId) => {
                        setShowDeleteModal(false);
                        setDeletingProforma(null);
                        performProformaDelete(proformaId);
                    }}
                />
            )}
        </div>
    );
};

// Proforma List Tab Component
interface ProformaListTabProps {
    proformas: ProformaListItem[];
    loading: boolean;
    error: string | null;
    selectedStatus: string;
    setSelectedStatus: (status: string) => void;
    onView: (id: string) => void;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onDownload: (id: string) => void;
    getStatusBadge: (status: string) => React.ReactNode;
    formatDate: (date: string) => string;
    formatCurrency: (amount: number) => string;
}

const ProformaListTab: React.FC<ProformaListTabProps> = ({
    proformas, loading, error, selectedStatus, setSelectedStatus,
    onView, onEdit, onDelete, onDownload, getStatusBadge, formatDate, formatCurrency
}) => {
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Proformalar yükleniyor...</p>
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
            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Durum:</span>
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-1 text-sm"
                    >
                        <option value="all">Tümü</option>
                        <option value="draft">Taslak</option>
                        <option value="confirmed">Onaylandı</option>
                        <option value="sent">Gönderildi</option>
                        <option value="cancelled">İptal</option>
                    </select>
                    <span className="text-sm text-gray-500">
                        {proformas.length} proforma gösteriliyor
                    </span>
                </div>
            </div>

            {/* Proforma Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {proformas.map((proforma) => (
                    <div key={proforma.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                        <div className="p-6">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-2">
                                    <FileText className="w-5 h-5 text-blue-600" />
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {proforma.proforma_number}
                                    </h3>
                                </div>
                                {getStatusBadge(proforma.status)}
                            </div>

                            {/* Customer Info */}
                            <div className="space-y-3 mb-4">
                                <div className="flex items-start space-x-2">
                                    <User className="w-4 h-4 text-gray-500 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {proforma.customer_name}
                                        </p>
                                        <p className="text-xs text-gray-500 line-clamp-2">
                                            {proforma.customer_address}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center space-x-1">
                                        <Calendar className="w-4 h-4 text-gray-500" />
                                        <span className="text-gray-600 dark:text-gray-400">
                                            {formatDate(proforma.issue_date)}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <Package className="w-4 h-4 text-gray-500" />
                                        <span className="text-gray-600 dark:text-gray-400">
                                            {proforma.item_count} kalem
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <DollarSign className="w-4 h-4 text-gray-500" />
                                    <span className="text-lg font-bold text-green-600">
                                        {formatCurrency(proforma.total_amount)}
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex space-x-1">
                                <button 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onView(proforma.id);
                                    }}
                                    className="flex items-center px-2 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                    title="Görüntüle"
                                >
                                    <Eye className="w-3 h-3 mr-1" />
                                    Görüntüle
                                </button>
                                <button 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onEdit(proforma.id);
                                    }}
                                    className="flex items-center px-2 py-1.5 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
                                    title="Düzenle"
                                >
                                    <Edit className="w-3 h-3 mr-1" />
                                    Düzenle
                                </button>
                                <button 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onDownload(proforma.id);
                                    }}
                                    className="flex items-center px-2 py-1.5 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                                    title="İndir"
                                >
                                    <Download className="w-3 h-3 mr-1" />
                                    İndir
                                </button>
                                <button 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onDelete(proforma.id);
                                    }}
                                    className="flex items-center px-2 py-1.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                                    title="Sil"
                                >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Sil
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {proformas.length === 0 && (
                <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        {selectedStatus === 'all' ? 'Henüz proforma yok' : 'Bu durumda proforma bulunamadı'}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        İlk proformanızı oluşturmaya başlayın.
                    </p>
                </div>
            )}
        </div>
    );
};

// View Modal Component
interface ProformaViewModalProps {
    proforma: ProformaDetail;
    onClose: () => void;
    formatDate: (date: string) => string;
    formatCurrency: (amount: number) => string;
    getStatusBadge: (status: string) => React.ReactNode;
}

const ProformaViewModal: React.FC<ProformaViewModalProps> = ({ 
    proforma, onClose, formatDate, formatCurrency, getStatusBadge 
}) => {
    // Güvenlik kontrolü
    if (!proforma || !proforma.customer) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
                    <p className="text-red-600">Proforma detayları yüklenemedi!</p>
                    <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-500 text-white rounded">Kapat</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Proforma Detayı - {proforma.proforma_number}
                        </h3>
                        {getStatusBadge(proforma.status)}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Proforma Info */}
                    <div className="space-y-4">
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white">Proforma Bilgileri</h4>
                        <div className="space-y-2 text-sm">
                            <p><strong>Numara:</strong> {proforma.proforma_number}</p>
                            <p><strong>Tarih:</strong> {formatDate(proforma.issue_date)}</p>
                            <p><strong>Geçerlilik:</strong> {formatDate(proforma.validity_date)}</p>
                            <p><strong>Ödeme:</strong> {proforma.payment_method}</p>
                            <p><strong>Teslimat:</strong> {proforma.delivery}</p>
                            {proforma.notes && <p><strong>Notlar:</strong> {proforma.notes}</p>}
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div className="space-y-4">
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white">Müşteri Bilgileri</h4>
                        <div className="space-y-2 text-sm">
                            <p><strong>Ad:</strong> {proforma.customer.name}</p>
                            <p><strong>Adres:</strong> {proforma.customer.address}</p>
                            <p><strong>Vergi No:</strong> {proforma.customer.tax_id}</p>
                            <p><strong>İletişim:</strong> {proforma.customer.contact_person}</p>
                            <p><strong>Telefon:</strong> {proforma.customer.phone}</p>
                            <p><strong>E-posta:</strong> {proforma.customer.email}</p>
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className="space-y-4">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white">Ürün Listesi</h4>
                    <div className="overflow-x-auto">
                        <table className="w-full border border-gray-300 dark:border-gray-600">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-white border-r border-gray-300 dark:border-gray-600">Ürün</th>
                                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-white border-r border-gray-300 dark:border-gray-600">Miktar</th>
                                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-white border-r border-gray-300 dark:border-gray-600">Birim</th>
                                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-white border-r border-gray-300 dark:border-gray-600">Birim Fiyat</th>
                                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-white">Toplam</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {proforma.proforma_items.map((item, index) => (
                                    <tr key={index}>
                                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white border-r border-gray-300 dark:border-gray-600">
                                            {item.product?.name || item.description || 'Ürün Bulunamadı'}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white border-r border-gray-300 dark:border-gray-600">
                                            {item.quantity}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white border-r border-gray-300 dark:border-gray-600">
                                            {item.unit === 'case' ? 'Koli' : 'Adet'}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white border-r border-gray-300 dark:border-gray-600">
                                            {formatCurrency(item.unit_price)}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                                            {formatCurrency(item.total)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <td colSpan={4} className="px-4 py-2 text-sm font-bold text-gray-900 dark:text-white text-right border-r border-gray-300 dark:border-gray-600">
                                        Toplam:
                                    </td>
                                    <td className="px-4 py-2 text-sm font-bold text-gray-900 dark:text-white">
                                        {formatCurrency(proforma.total_amount)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* Pallets */}
                {proforma.pallets && proforma.pallets.length > 0 && (
                    <div className="space-y-4">
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white">Palet Bilgileri</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {proforma.pallets.map((pallet, index) => (
                                <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Package className="w-5 h-5 text-green-600" />
                                        <span className="font-semibold text-gray-900 dark:text-white">Palet {pallet.pallet_number}</span>
                                    </div>
                                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                        <p><strong>Genişlik:</strong> {pallet.width_cm} cm</p>
                                        <p><strong>Uzunluk:</strong> {pallet.length_cm} cm</p>
                                        <p><strong>Yükseklik:</strong> {pallet.height_cm} cm</p>
                                        <p><strong>Ölçü:</strong> {pallet.width_cm}×{pallet.length_cm}×{pallet.height_cm}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Toplam Palet Sayısı:</span>
                                <span className="font-bold text-blue-600 dark:text-blue-400">{proforma.pallets.length}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm mt-2">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Palet Başına Ağırlık:</span>
                                <span className="font-bold text-blue-600 dark:text-blue-400">{proforma.weight_per_pallet_kg} kg</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                    >
                        Kapat
                    </button>
                </div>
            </div>
        </div>
    );
};

// Edit Modal Component  
interface ProformaEditModalProps {
    proforma: ProformaDetail;
    onClose: () => void;
    onSave: (data: Partial<ProformaDetail>) => void;
}

const ProformaEditModal: React.FC<ProformaEditModalProps> = ({ proforma, onClose, onSave }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [formData, setFormData] = useState({
        issue_date: proforma.issue_date,
        validity_date: proforma.validity_date,
        payment_method: proforma.payment_method,
        delivery: proforma.delivery,
        notes: proforma.notes || '',
        status: proforma.status
    });
    const [items, setItems] = useState<ProformaItem[]>(proforma.proforma_items);
    const [pallets, setPallets] = useState(proforma.pallets);
    const [weightPerPallet, setWeightPerPallet] = useState(proforma.weight_per_pallet_kg);

    useEffect(() => {
        // Fetch products only
        const fetchProducts = async () => {
            const { data: productsRes } = await supabase
                .from('products')
                .select(`
                    *,
                    series (
                        name,
                        pieces_per_case,
                        net_weight_kg_per_piece
                    )
                `)
                .eq('is_active', true);

            if (productsRes) setProducts(productsRes);
        };

        fetchProducts();
    }, []);

    const handleSave = () => {
        const totalAmount = items.reduce((sum, item) => sum + item.total, 0);
        
        onSave({
            ...formData,
            proforma_items: items,
            pallets: pallets,
            weight_per_pallet_kg: weightPerPallet,
            total_amount: totalAmount
        });
    };

    // Pallet management functions
    const addPallet = () => {
        const newPalletNumber = pallets.length + 1;
        setPallets([...pallets, {
            id: `temp_${Date.now()}`,
            pallet_number: newPalletNumber,
            width_cm: 80,
            length_cm: 120,
            height_cm: 124
        }]);
    };

    const removePallet = (index: number) => {
        const newPallets = pallets.filter((_, i) => i !== index);
        // Renumber remaining pallets
        newPallets.forEach((pallet, i) => {
            pallet.pallet_number = i + 1;
        });
        setPallets(newPallets);
    };

    const updatePallet = (index: number, field: string, value: number) => {
        const newPallets = [...pallets];
        (newPallets[index] as any)[field] = value;
        setPallets(newPallets);
    };

    const addItem = () => {
        setItems([...items, {
            product_id: '',
            quantity: 1,
            unit_price: 0,
            total: 0,
            unit: 'case'
        }]);
    };

    const updateItem = (index: number, field: keyof ProformaItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };

        if (field === 'product_id') {
            const product = products.find(p => p.id === value);
            if (product) {
                newItems[index].description = product.name;
                newItems[index].unit_price = newItems[index].unit === 'case' 
                    ? product.price_per_case 
                    : product.price_per_piece;
                // Recalculate total when product changes
                newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
            }
        }

        if (field === 'unit') {
            const product = products.find(p => p.id === newItems[index].product_id);
            if (product) {
                newItems[index].unit_price = value === 'case' 
                    ? product.price_per_case 
                    : product.price_per_piece;
                // Recalculate total when unit changes
                newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
            }
        }

        if (field === 'quantity' || field === 'unit_price') {
            newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
        }

        setItems(newItems);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Proforma Düzenle - {proforma.proforma_number}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Müşteri
                            </label>
                            <div className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white rounded-md">
                                {proforma.customer.name}
                            </div>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Müşteri bilgisi düzenlenirken değiştirilemez
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Fatura Tarihi
                            </label>
                            <input
                                type="date"
                                value={formData.issue_date}
                                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Geçerlilik Tarihi
                            </label>
                            <input
                                type="date"
                                value={formData.validity_date}
                                onChange={(e) => setFormData({ ...formData, validity_date: e.target.value })}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md"
                            />
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Ödeme Yöntemi
                            </label>
                            <select
                                value={formData.payment_method}
                                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md"
                            >
                                <option value="bank_transfer">Banka Havalesi</option>
                                <option value="cash">Nakit</option>
                                <option value="credit_card">Kredi Kartı</option>
                                <option value="check">Çek</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Teslimat
                            </label>
                            <input
                                type="text"
                                value={formData.delivery}
                                onChange={(e) => setFormData({ ...formData, delivery: e.target.value })}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Durum
                            </label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md"
                            >
                                <option value="draft">Taslak</option>
                                <option value="confirmed">Onaylandı</option>
                                <option value="sent">Gönderildi</option>
                                <option value="cancelled">İptal</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Notlar
                    </label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md"
                        rows={3}
                    />
                </div>

                {/* Items */}
                <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white">Ürün Listesi</h4>
                        <button
                            onClick={addItem}
                            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Ürün Ekle
                        </button>
                    </div>

                    <div className="space-y-4">
                        {items.map((item, index) => (
                            <div key={index} className="flex items-center space-x-4 p-4 border border-gray-300 dark:border-gray-600 rounded-md">
                                <select
                                    value={item.product_id}
                                    onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                                    className="flex-1 p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md"
                                >
                                    <option value="">Ürün seçin...</option>
                                    {products.map(product => (
                                        <option key={product.id} value={product.id}>
                                            {product.name}
                                        </option>
                                    ))}
                                </select>

                                <input
                                    type="number"
                                    placeholder="Miktar"
                                    value={item.quantity}
                                    onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                    className="w-24 p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md"
                                />

                                <select
                                    value={item.unit}
                                    onChange={(e) => updateItem(index, 'unit', e.target.value)}
                                    className="w-24 p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md"
                                >
                                    <option value="case">Koli</option>
                                    <option value="piece">Adet</option>
                                </select>

                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Birim Fiyat"
                                    value={item.unit_price}
                                    onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                                    className="w-32 p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md"
                                />

                                <span className="w-32 text-sm text-gray-900 dark:text-white">
                                    €{item.total.toFixed(2)}
                                </span>

                                <button
                                    onClick={() => removeItem(index)}
                                    className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-md"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 text-right">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                            Toplam: €{items.reduce((sum, item) => sum + item.total, 0).toFixed(2)}
                        </span>
                    </div>
                </div>

                {/* Pallet Management */}
                <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white">Paletler</h4>
                        <button
                            onClick={addPallet}
                            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Palet Ekle
                        </button>
                    </div>

                    <div className="space-y-3">
                        {pallets.map((pallet, index) => (
                            <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                                <div className="flex items-center space-x-2">
                                    <Package className="w-4 h-4 text-green-600" />
                                    <span className="font-medium text-sm text-gray-900 dark:text-white">Palet {pallet.pallet_number}</span>
                                </div>
                                
                                <div className="flex items-center space-x-1">
                                    <label className="text-xs text-gray-600 dark:text-gray-400">G:</label>
                                    <input
                                        type="number"
                                        value={pallet.width_cm}
                                        onChange={(e) => updatePallet(index, 'width_cm', Number(e.target.value))}
                                        className="w-16 p-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded text-center text-xs"
                                    />
                                </div>
                                
                                <div className="flex items-center space-x-1">
                                    <label className="text-xs text-gray-600 dark:text-gray-400">U:</label>
                                    <input
                                        type="number"
                                        value={pallet.length_cm}
                                        onChange={(e) => updatePallet(index, 'length_cm', Number(e.target.value))}
                                        className="w-16 p-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded text-center text-xs"
                                    />
                                </div>
                                
                                <div className="flex items-center space-x-1">
                                    <label className="text-xs text-gray-600 dark:text-gray-400">Y:</label>
                                    <input
                                        type="number"
                                        value={pallet.height_cm}
                                        onChange={(e) => updatePallet(index, 'height_cm', Number(e.target.value))}
                                        className="w-16 p-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded text-center text-xs"
                                    />
                                </div>
                                
                                <span className="text-xs text-gray-500">
                                    {pallet.width_cm}×{pallet.length_cm}×{pallet.height_cm}
                                </span>
                                
                                <button 
                                    onClick={() => removePallet(index)}
                                    className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-md"
                                    disabled={pallets.length === 1}
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Palet Başına Ağırlık:</span>
                        <div className="flex items-center space-x-2">
                            <input
                                type="number"
                                step="0.1"
                                value={weightPerPallet}
                                onChange={(e) => setWeightPerPallet(Number(e.target.value))}
                                className="w-20 p-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded text-center text-sm"
                            />
                            <span className="text-sm text-gray-500">kg</span>
                        </div>
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
                        onClick={handleSave}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        Kaydet
                    </button>
                </div>
            </div>
        </div>
    );
};

// Delete Confirmation Modal Component
interface ProformaDeleteModalProps {
    proforma: ProformaListItem;
    onClose: () => void;
    onConfirm: (proformaId: string) => void;
}

const ProformaDeleteModal: React.FC<ProformaDeleteModalProps> = ({ proforma, onClose, onConfirm }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Proformayı Sil
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="mb-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Aşağıdaki proformayı silmek istediğinizden emin misiniz?
                    </p>
                    
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Proforma:</span>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {proforma.proforma_number}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Müşteri:</span>
                                <span className="text-sm text-gray-900 dark:text-white">
                                    {proforma.customer_name}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tutar:</span>
                                <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                                    €{proforma.total_amount.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex items-start space-x-2">
                            <div className="flex-shrink-0 mt-0.5">
                                <span className="text-red-500 dark:text-red-400">⚠️</span>
                            </div>
                            <p className="text-sm text-red-700 dark:text-red-300">
                                <strong>Dikkat!</strong> Bu işlem geri alınamaz. Proforma ve tüm ilgili veriler kalıcı olarak silinecektir.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium"
                    >
                        İptal
                    </button>
                    <button
                        onClick={() => onConfirm(proforma.id)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex items-center space-x-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        <span>Sil</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Proforma; 