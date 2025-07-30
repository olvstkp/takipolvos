import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Save, X, Package, DollarSign, Tag, Box, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useProductTypes, useProformaGroups } from '../hooks/useProforma';
import toast from 'react-hot-toast';
import ProductImport from '../components/ProductImport';

interface Series {
  id: string;
  name: string;
    pieces_per_case: number;
    net_weight_kg_per_piece: number;
    packaging_weight_kg_per_case: number;
    description?: string;
    is_active: boolean;
}

interface ProductType {
    id: string;
  name: string;
    packing_list_name: string;
    is_liquid: boolean;
}

interface ProformaGroup {
    id: string;
    name: string;
    display_name: string;
    group_type: string;
    size_value?: number;
    size_unit?: string;
    is_liquid: boolean;
    sort_order: number;
}

interface Product {
  id: string;
  name: string;
    series_id: string;
    price_per_case: number;
    price_per_piece: number;
    price_per_case_usd?: number;
    price_per_piece_usd?: number;
    barcode?: string;
    is_active: boolean;
    created_at: string;
    series?: Series;
    proforma_group_id?: string;
    product_type_id?: string;
    size_value?: number;
    size_unit?: string;
    product_type?: ProductType;
    proforma_group?: ProformaGroup;
}

const Products: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [series, setSeries] = useState<Series[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { productTypes } = useProductTypes();
    const { proformaGroups, loading: groupsLoading, setProductGroupAssignment } = useProformaGroups();
    const [selectedCurrency, setSelectedCurrency] = useState<'EUR' | 'USD'>('EUR');
    
    // Debug: Proforma groups yüklendiğinde console'a yazdır
    useEffect(() => {
        console.log('📋 Products component - proformaGroups:', proformaGroups);
        console.log('📋 Products component - groupsLoading:', groupsLoading);
    }, [proformaGroups, groupsLoading]);
  const [searchTerm, setSearchTerm] = useState('');
    const [selectedSeries, setSelectedSeries] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{show: boolean, product: Product | null}>({show: false, product: null});
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

    // Fetch products and series
    const fetchData = async () => {
        try {
            setLoading(true);
            
            // Fetch series
            const { data: seriesData, error: seriesError } = await supabase
                .from('series')
                .select('*')
                .eq('is_active', true)
                .order('name');

            if (seriesError) throw seriesError;
            setSeries(seriesData || []);

            // Fetch products with series
            const { data: productsData, error: productsError } = await supabase
                .from('products')
                .select(`
                    *,
                    series (
                        id,
                        name,
                        pieces_per_case,
                        net_weight_kg_per_piece,
                        packaging_weight_kg_per_case,
                        description,
                        is_active
                    )
                `)
                .eq('is_active', true)
                .order('name');

            if (productsError) throw productsError;
            setProducts(productsData || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Filtered products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesSeries = selectedSeries === 'all' || product.series_id === selectedSeries;
        return matchesSearch && matchesSeries;
  });

    // Add/Update product
    const handleSaveProduct = async (productData: Partial<Product>) => {
        try {
            let productId = editingProduct?.id;

            if (editingProduct) {
                // Update existing product
                const { error } = await supabase
                    .from('products')
                    .update({
                        name: productData.name,
                        series_id: productData.series_id,
                        price_per_case: productData.price_per_case,
                        price_per_piece: productData.price_per_piece,
                        price_per_case_usd: productData.price_per_case_usd,
                        price_per_piece_usd: productData.price_per_piece_usd,
                        barcode: productData.barcode,
                        is_active: productData.is_active,
                        proforma_group_id: productData.proforma_group_id || null
                    })
                    .eq('id', editingProduct.id);

                if (error) throw error;
                productId = editingProduct.id;
            } else {
                // Add new product
                const { data, error } = await supabase
                    .from('products')
                    .insert({
                        name: productData.name,
                        series_id: productData.series_id,
                        price_per_case: productData.price_per_case,
                        price_per_piece: productData.price_per_piece,
                        price_per_case_usd: productData.price_per_case_usd,
                        price_per_piece_usd: productData.price_per_piece_usd,
                        barcode: productData.barcode,
                        is_active: productData.is_active,
                        proforma_group_id: productData.proforma_group_id || null
                    })
                    .select('id')
                    .single();

                if (error) throw error;
                productId = data?.id;
            }

            // Save proforma group assignment to both Supabase and localStorage
            console.log('💾 Saving group assignment:', { productId, groupId: productData.proforma_group_id });
            if (productId && productData.proforma_group_id) {
                // Update Supabase
                const { error: updateError } = await supabase
                    .from('products')
                    .update({ proforma_group_id: productData.proforma_group_id })
                    .eq('id', productId);

                if (updateError) {
                    console.error('❌ Supabase update error:', updateError);
                    // Fallback to localStorage only
                    setProductGroupAssignment(productId, productData.proforma_group_id);
          } else {
                    console.log('✅ Group assignment saved to Supabase');
                    // Also save to localStorage for consistency
                    setProductGroupAssignment(productId, productData.proforma_group_id);
                }
            } else {
                console.log('⚠️ No group assignment to save:', { productId, groupId: productData.proforma_group_id });
            }

            // Refresh data and force re-render to show localStorage changes
            await fetchData();
            
            // Force a small delay to ensure localStorage changes are reflected
            setTimeout(() => {
                console.log('🔄 Force refreshing product list...');
                fetchData();
            }, 100);
            
            setShowAddModal(false);
            setEditingProduct(null);
        } catch (err: any) {
            alert(`Hata: ${err.message}`);
        }
    };

    // Delete product - show confirmation dialog
    const handleDeleteClick = (product: Product) => {
        setDeleteConfirmation({show: true, product});
    };

    // Confirm delete product
    const handleConfirmDelete = async () => {
        if (!deleteConfirmation.product) return;

        try {
            const { error } = await supabase
                .from('products')
                .update({ is_active: false })
                .eq('id', deleteConfirmation.product.id);

            if (error) throw error;
            
            toast.success(`"${deleteConfirmation.product.name}" başarıyla silindi!`);
            await fetchData();
            setDeleteConfirmation({show: false, product: null});
        } catch (err: any) {
            toast.error(`Hata: ${err.message}`);
        }
    };

    // Cancel delete
    const handleCancelDelete = () => {
        setDeleteConfirmation({show: false, product: null});
    };

    // Ürün seçimi fonksiyonları
    const handleSelectProduct = (productId: string) => {
        setSelectedProducts(prev => 
            prev.includes(productId) 
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        );
    };

    const handleSelectAll = () => {
        if (selectedProducts.length === filteredProducts.length) {
            setSelectedProducts([]);
        } else {
            setSelectedProducts(filteredProducts.map(p => p.id));
        }
    };

    // Toplu silme fonksiyonları
    const handleBulkDelete = () => {
        if (selectedProducts.length > 0) {
            setShowBulkDeleteConfirm(true);
        }
    };

    const handleConfirmBulkDelete = async () => {
        try {
            const { error } = await supabase
                .from('products')
                .update({ is_active: false })
                .in('id', selectedProducts);

            if (error) throw error;
            
            toast.success(`${selectedProducts.length} ürün başarıyla silindi!`);
            await fetchData();
            setSelectedProducts([]);
            setShowBulkDeleteConfirm(false);
        } catch (err: any) {
            toast.error(`Hata: ${err.message}`);
        }
    };

    const handleCancelBulkDelete = () => {
        setShowBulkDeleteConfirm(false);
    };

    // Excel import handler
    const handleImportComplete = async (importedProducts: any[]) => {
        console.log('Excel import started:', importedProducts);
        
        try {
            const successfulProducts = [];
            const errors = [];

            for (const product of importedProducts) {
                try {
                    // Koli fiyatlarını hesapla (varsayılan 12 adet/koli)
                    const defaultPiecesPerCase = 12;
                    const price_per_case = product.price_per_piece * defaultPiecesPerCase;
                    const price_per_case_usd = product.price_per_piece_usd * defaultPiecesPerCase;

                    const { data, error } = await supabase
                        .from('products')
                        .insert({
                            name: product.name.trim(),
                            price_per_piece: product.price_per_piece,
                            price_per_piece_usd: product.price_per_piece_usd,
                            price_per_case: price_per_case,
                            price_per_case_usd: price_per_case_usd,
                            is_active: true
                        })
                        .select('id, name')
                        .single();

                    if (error) {
                        console.error('Product insert error:', error);
                        errors.push(`${product.name}: ${error.message}`);
                    } else {
                        successfulProducts.push(data);
                        console.log('Product inserted successfully:', data);
                    }
                } catch (err: any) {
                    console.error('Product processing error:', err);
                    errors.push(`${product.name}: ${err.message}`);
                }
            }

            // Sonuçları kullanıcıya bildir
            if (successfulProducts.length > 0) {
                toast.success(`${successfulProducts.length} ürün başarıyla veritabanına kaydedildi!`, {
                    duration: 5000
                });
                
                // Ürün listesini yenile
                await fetchData();
            }

            if (errors.length > 0) {
                console.error('Import errors:', errors);
                toast.error(`${errors.length} ürün kaydedilemedi. Console'u kontrol edin.`, {
                    duration: 8000
                });
            }

        } catch (err: any) {
            console.error('Import process error:', err);
            toast.error(`İçeri aktarma sırasında hata oluştu: ${err.message}`, {
                duration: 8000
            });
        }
    };

    if (loading) {
    return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Ürünler yükleniyor...</p>
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
            <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ürün Yönetimi</h1>
                    <p className="text-gray-600 dark:text-gray-400">Toplam {products.length} ürün</p>
              </div>
          <div className="flex space-x-3">
            {selectedProducts.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Seçilenleri Sil ({selectedProducts.length})
              </button>
            )}
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Excel İçeri Aktar
            </button>
          <button
                    onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Yeni Ürün Ekle
          </button>
          </div>
      </div>

            {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                            <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Toplam Ürün</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{products.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                            <Tag className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Aktif Seriler</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{series.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
                            <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Ortalama Fiyat (Koli)</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {selectedCurrency === 'EUR' 
                                  ? `€${products.length > 0 ? (products.reduce((sum, p) => sum + p.price_per_case, 0) / products.length).toFixed(2) : '0.00'}`
                                  : `$${products.length > 0 ? (products.reduce((sum, p) => sum + (p.price_per_case_usd || p.price_per_case * 1.1), 0) / products.length).toFixed(2) : '0.00'}`
                                }
                            </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900">
                            <Box className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Filtrelenen</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{filteredProducts.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                                placeholder="Ürün adı veya barkod ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
                        value={selectedSeries}
                        onChange={(e) => setSelectedSeries(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
                        <option value="all">Tüm Seriler</option>
                        {series.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value as 'EUR' | 'USD')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="EUR">€ EUR</option>
            <option value="USD">$ USD</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ürün Adı</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Seri</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">PROFORMA GRUBU</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Koli Fiyatı ({selectedCurrency === 'EUR' ? '€' : '$'})
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Adet Fiyatı ({selectedCurrency === 'EUR' ? '€' : '$'})
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Durum</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => handleSelectProduct(product.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                            {product.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {product.series?.name || 'N/A'}
                                        </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {(() => {
                        const proformaGroup = proformaGroups.find(pg => pg.id === product.proforma_group_id);
                        if (proformaGroup) {
                          return (
                    <div>
                              <div className="font-medium text-blue-600 dark:text-blue-400">{proformaGroup.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{proformaGroup.display_name}</div>
                            </div>
                          );
                        } else {
                          return (
                            <div>
                              <div className="font-medium text-gray-400">Grup Atanmamış</div>
                              <div className="text-xs text-red-500 dark:text-red-400">Lütfen proforma grubu seçin</div>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {selectedCurrency === 'EUR' 
                      ? `€${product.price_per_case.toFixed(2)}`
                      : `$${(product.price_per_case_usd || product.price_per_case * 1.1).toFixed(2)}`
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {selectedCurrency === 'EUR' 
                      ? `€${product.price_per_piece.toFixed(2)}`
                      : `$${(product.price_per_piece_usd || product.price_per_piece * 1.1).toFixed(2)}`
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            product.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                                            {product.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditingProduct(product);
                          setShowAddModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(product)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
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
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
                <ProductModal
          product={editingProduct}
                    series={series}
                    productTypes={productTypes}
                    proformaGroups={proformaGroups}
                    groupsLoading={groupsLoading}
                    onSave={handleSaveProduct}
          onClose={() => {
            setShowAddModal(false);
            setEditingProduct(null);
          }}
        />
      )}

      {/* Product Import Modal */}
      {showImportModal && (
        <ProductImport
          onClose={() => setShowImportModal(false)}
          onImportComplete={handleImportComplete}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation.show && deleteConfirmation.product && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ürün Silme Onayı</h3>
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
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white">Ürünü Sil</h4>
                </div>
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                <strong>"{deleteConfirmation.product.name}"</strong> adlı ürünü silmek istediğinizden emin misiniz?
              </p>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  ⚠️ Bu işlem ürünü pasif hale getirecektir. Ürün tamamen silinmeyecek, sadece görünmez olacaktır.
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
                Ürünü Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Toplu Silme Onayı</h3>
              <button
                onClick={handleCancelBulkDelete}
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
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white">Ürünleri Sil</h4>
                </div>
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                <strong>{selectedProducts.length}</strong> adet seçili ürünü silmek istediğinizden emin misiniz?
              </p>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  ⚠️ Bu işlem seçili ürünleri pasif hale getirecektir. Ürünler tamamen silinmeyecek, sadece görünmez olacaktır.
                </p>
              </div>

              <div className="max-h-32 overflow-y-auto bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Silinecek ürünler:</p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {products
                    .filter(p => selectedProducts.includes(p.id))
                    .map(product => (
                      <li key={product.id} className="truncate">• {product.name}</li>
                    ))
                  }
                </ul>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelBulkDelete}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                İptal
              </button>
              <button
                onClick={handleConfirmBulkDelete}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {selectedProducts.length} Ürünü Sil
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
    );
};

// Product Modal Component
interface ProductModalProps {
    product: Product | null;
    series: Series[];
    productTypes: ProductType[];
    proformaGroups: ProformaGroup[];
    groupsLoading: boolean;
    onSave: (productData: Partial<Product>) => void;
    onClose: () => void;
}

const ProductModal: React.FC<ProductModalProps> = ({ product, series, proformaGroups, groupsLoading, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        name: product?.name || '',
        series_id: product?.series_id || '',
        price_per_case: product?.price_per_case || 0,
        price_per_piece: product?.price_per_piece || 0,
        price_per_case_usd: product?.price_per_case_usd || 0,
        price_per_piece_usd: product?.price_per_piece_usd || 0,
        barcode: product?.barcode || '',
        is_active: product?.is_active ?? true,
        proforma_group_id: product?.proforma_group_id || ''
    });

    // Yeni seri ekleme state'leri
    const [showAddSeriesModal, setShowAddSeriesModal] = useState(false);
    const [newSeriesData, setNewSeriesData] = useState({
        name: '',
        pieces_per_case: 1,
        net_weight_kg_per_piece: 0,
        packaging_weight_kg_per_case: 0,
        width_cm: 0,
        length_cm: 0,
        height_cm: 0,
        description: ''
    });

    // Seçili seri bilgisi
    const selectedSeries = series.find(s => s.id === formData.series_id);

    // Update formData when product prop changes
    useEffect(() => {
        console.log('🔄 ProductModal - product prop changed:', product);
        console.log('💰 USD prices from product:', {
            price_per_case_usd: product?.price_per_case_usd,
            price_per_piece_usd: product?.price_per_piece_usd
        });
        
        setFormData({
            name: product?.name || '',
            series_id: product?.series_id || '',
            price_per_case: product?.price_per_case || 0,
            price_per_piece: product?.price_per_piece || 0,
            price_per_case_usd: product?.price_per_case_usd || 0,
            price_per_piece_usd: product?.price_per_piece_usd || 0,
            barcode: product?.barcode || '',
            is_active: product?.is_active ?? true,
            proforma_group_id: product?.proforma_group_id || ''
        });
    }, [product]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    // Otomatik fiyat hesaplama fonksiyonları
    const calculateCasePriceFromPiece = (piecePrice: number) => {
        if (!selectedSeries) return piecePrice;
        return piecePrice * selectedSeries.pieces_per_case;
    };

    const handlePiecePriceChange = (piecePrice: number, currency: 'EUR' | 'USD') => {
        console.log('Piece price changed:', piecePrice, 'Currency:', currency, 'Series:', selectedSeries);
        const casePrice = calculateCasePriceFromPiece(piecePrice);
        console.log('Calculated case price:', casePrice);
        
        if (currency === 'EUR') {
            setFormData(prev => ({
                ...prev,
                price_per_piece: piecePrice,
                price_per_case: casePrice
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                price_per_piece_usd: piecePrice,
                price_per_case_usd: casePrice
            }));
        }
    };

    // Yeni seri ekleme fonksiyonu
    const handleAddSeries = async () => {
        try {
            const { data, error } = await supabase
                .from('series')
                .insert({
                    name: newSeriesData.name,
                    pieces_per_case: newSeriesData.pieces_per_case,
                    net_weight_kg_per_piece: newSeriesData.net_weight_kg_per_piece,
                    packaging_weight_kg_per_case: newSeriesData.packaging_weight_kg_per_case,
                    width_cm: newSeriesData.width_cm || null,
                    length_cm: newSeriesData.length_cm || null,
                    height_cm: newSeriesData.height_cm || null,
                    description: newSeriesData.description || null
                })
                .select()
                .single();

            if (error) throw error;

            // Yeni seriyi formData'ya ata
            setFormData(prev => ({ ...prev, series_id: data.id }));
            
            // Modal'ı kapat ve formu temizle
            setShowAddSeriesModal(false);
            setNewSeriesData({
                name: '',
                pieces_per_case: 1,
                net_weight_kg_per_piece: 0,
                packaging_weight_kg_per_case: 0,
                width_cm: 0,
                length_cm: 0,
                height_cm: 0,
                description: ''
            });

            // Başarı mesajı
            toast.success('Yeni seri başarıyla eklendi!', {
                icon: '✅',
                duration: 3000
            });

            // Sayfayı yenile (serileri tekrar çek)
            window.location.reload();
        } catch (err: any) {
            toast.error(`Hata: ${err.message}`, {
                icon: '❌',
                duration: 5000
            });
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {product ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}
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
                                Ürün Adı
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Seri
                            </label>
                            <div className="flex space-x-2">
                                <select
                                    value={formData.series_id}
                                    onChange={(e) => {
                                        const newSeriesId = e.target.value;
                                        setFormData({ ...formData, series_id: newSeriesId });
                                        
                                        // Seri değiştiğinde fiyatları güncelle
                                        if (newSeriesId && formData.price_per_piece > 0) {
                                            const newSeries = series.find(s => s.id === newSeriesId);
                                            if (newSeries) {
                                                const newCasePrice = formData.price_per_piece * newSeries.pieces_per_case;
                                                const newCasePriceUsd = formData.price_per_piece_usd * newSeries.pieces_per_case;
                                                setFormData(prev => ({
                                                    ...prev,
                                                    series_id: newSeriesId,
                                                    price_per_case: newCasePrice,
                                                    price_per_case_usd: newCasePriceUsd
                                                }));
                                            }
                                        }
                                    }}
                                    className="flex-1 p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                >
                                    <option value="">Seri seçin...</option>
                                    {series.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} ({s.pieces_per_case} adet/koli)
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => setShowAddSeriesModal(true)}
                                    className="px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium whitespace-nowrap"
                                >
                                    YENİ SERİ EKLE
                                </button>
                            </div>
                        </div>

                        {/* Proforma Group Section */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Proforma Grubu
                            </label>
                            <select
                                value={formData.proforma_group_id}
                                onChange={(e) => {
                                    setFormData({ 
                                        ...formData, 
                                        proforma_group_id: e.target.value
                                    });
                                }}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={groupsLoading}
                            >
                                <option value="">
                                    {groupsLoading ? 'Yükleniyor...' : 'Proforma grubu seçin...'}
                                </option>
                                {proformaGroups.map(pg => (
                                    <option key={pg.id} value={pg.id}>
                                        {pg.name} - {pg.display_name}
                                    </option>
                                ))}
                            </select>
                            {formData.proforma_group_id && (
                                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                                    <div className="text-sm text-blue-700 dark:text-blue-300">
                                        ✓ Seçilen: {proformaGroups.find(pg => pg.id === formData.proforma_group_id)?.display_name}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Manual Group Addition */}
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Yeni Proforma Grubu Ekle</h4>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                Listede istediğiniz grup yoksa, yeni grup adını yazın:
                            </div>
                            <input
                                type="text"
                                placeholder="Örn: OLIVE OIL SHOWER GEL 1000ML"
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md text-sm"
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                        // Here you would call addProformaGroup
                                        console.log('Add new group:', e.currentTarget.value);
                                        e.currentTarget.value = '';
                                    }
                                }}
                            />
                        </div>

                        

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Adet Fiyatı (€)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.price_per_piece}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(',', '.');
                                        const numValue = parseFloat(value) || 0;
                                        console.log('Input value:', e.target.value, 'Parsed value:', numValue);
                                        handlePiecePriceChange(numValue, 'EUR');
                                    }}
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Koli Fiyatı (€) {selectedSeries && <span className="text-xs text-gray-500">({selectedSeries.pieces_per_case} adet - Otomatik hesaplanır)</span>}
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.price_per_case}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(',', '.');
                                        const numValue = parseFloat(value) || 0;
                                        setFormData({ ...formData, price_per_case: numValue });
                                    }}
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Adet Fiyatı ($)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.price_per_piece_usd}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(',', '.');
                                        const numValue = parseFloat(value) || 0;
                                        console.log('Input value:', e.target.value, 'Parsed value:', numValue);
                                        handlePiecePriceChange(numValue, 'USD');
                                    }}
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Koli Fiyatı ($) {selectedSeries && <span className="text-xs text-gray-500">({selectedSeries.pieces_per_case} adet - Otomatik hesaplanır)</span>}
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.price_per_case_usd}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(',', '.');
                                        const numValue = parseFloat(value) || 0;
                                        setFormData({ ...formData, price_per_case_usd: numValue });
                                    }}
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Barkod (Opsiyonel)
                            </label>
                            <input
                                type="text"
                                value={formData.barcode}
                                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                Aktif Ürün
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
                                {product ? 'Güncelle' : 'Kaydet'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Yeni Seri Ekleme Modal */}
            {showAddSeriesModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Yeni Seri Ekle
                            </h3>
                            <button
                                onClick={() => setShowAddSeriesModal(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Seri Adı *
                                </label>
                                <input
                                    type="text"
                                    value={newSeriesData.name}
                                    onChange={(e) => setNewSeriesData({ ...newSeriesData, name: e.target.value })}
                                    placeholder="Örn: 500ML X12"
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Koli Başına Adet *
                                </label>
                                <input
                                    type="number"
                                    value={newSeriesData.pieces_per_case}
                                    onChange={(e) => setNewSeriesData({ ...newSeriesData, pieces_per_case: parseInt(e.target.value) || 1 })}
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md"
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
                                    value={newSeriesData.net_weight_kg_per_piece}
                                    onChange={(e) => setNewSeriesData({ ...newSeriesData, net_weight_kg_per_piece: parseFloat(e.target.value) || 0 })}
                                    placeholder="0.500"
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Koli Ambalaj Ağırlığı (kg) *
                                </label>
                                <input
                                    type="number"
                                    step="0.001"
                                    value={newSeriesData.packaging_weight_kg_per_case}
                                    onChange={(e) => setNewSeriesData({ ...newSeriesData, packaging_weight_kg_per_case: parseFloat(e.target.value) || 0 })}
                                    placeholder="1.297"
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Genişlik (cm)
                                    </label>
                                    <input
                                        type="number"
                                        value={newSeriesData.width_cm}
                                        onChange={(e) => setNewSeriesData({ ...newSeriesData, width_cm: parseInt(e.target.value) || 0 })}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Uzunluk (cm)
                                    </label>
                                    <input
                                        type="number"
                                        value={newSeriesData.length_cm}
                                        onChange={(e) => setNewSeriesData({ ...newSeriesData, length_cm: parseInt(e.target.value) || 0 })}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Yükseklik (cm)
                                    </label>
                                    <input
                                        type="number"
                                        value={newSeriesData.height_cm}
                                        onChange={(e) => setNewSeriesData({ ...newSeriesData, height_cm: parseInt(e.target.value) || 0 })}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Açıklama
                                </label>
                                <textarea
                                    value={newSeriesData.description}
                                    onChange={(e) => setNewSeriesData({ ...newSeriesData, description: e.target.value })}
                                    placeholder="Seri hakkında açıklama..."
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md"
                                    rows={2}
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddSeriesModal(false)}
                                    className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    İptal
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAddSeries}
                                    disabled={!newSeriesData.name || !newSeriesData.pieces_per_case || !newSeriesData.net_weight_kg_per_piece || !newSeriesData.packaging_weight_kg_per_case}
                                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Seri Ekle
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </>
  );
};

export default Products;