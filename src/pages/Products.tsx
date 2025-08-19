import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Edit, Trash2, Save, X, Package, DollarSign, Tag, Box, Upload, Settings, Download, ImagePlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useProductTypes, useProformaGroups } from '../hooks/useProforma';
import toast from 'react-hot-toast';
import ProductImport from '../components/ProductImport';
import SeriesManagement from '../components/SeriesManagement';
import ProformaGroupsManagement from '../components/ProformaGroupsManagement';
import { generateProductsExcel } from '../utils/excelExport';

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
}

interface ProductImage {
    id: string;
    product_id: string;
    image_url: string;
    image_order: number;
    alt_text?: string;
    is_primary: boolean;
    file_size_bytes?: number;
    file_type?: string;
    width_px?: number;
    height_px?: number;
    uploading?: boolean; // Flag for temporary upload state
}

interface Product {
  id: string;
  name: string;
    series_id: string;
    price_per_case: number;
    price_per_piece: number;
    price_per_case_usd?: number;
    price_per_piece_usd?: number;
    price_per_case_tl?: number;
    price_per_piece_tl?: number;
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
    catalog_visible?: boolean;
    catalog_description?: string;
    catalog_sort_order?: number;
    product_images?: ProductImage[];
}

const Products: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [series, setSeries] = useState<Series[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { productTypes } = useProductTypes();
    const { proformaGroups, setProformaGroups, loading: groupsLoading, setProductGroupAssignment } = useProformaGroups();
    const [selectedCurrency, setSelectedCurrency] = useState<'EUR' | 'USD' | 'TL'>('EUR');
    
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
    const [showSeriesManagement, setShowSeriesManagement] = useState(false);
    const [showProformaGroupsManagement, setShowProformaGroupsManagement] = useState(false);
    
    // Scroll position preservation for modal
    const [scrollPosition, setScrollPosition] = useState(0);

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

            // Fetch products with series and images
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
                    ),
                    product_images (
                        id,
                        image_url,
                        image_order,
                        alt_text,
                        is_primary,
                        file_size_bytes,
                        file_type,
                        width_px,
                        height_px
                    )
                `)
                .eq('is_active', true)
                .order('name');

            if (productsError) throw productsError;
            setProducts(productsData || []);
            
            // Note: Scroll position will be restored in useEffect when products state changes
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
                const { data: updated, error } = await supabase
                    .from('products')
                    .update({
                        name: productData.name,
                        series_id: productData.series_id,
                        price_per_case: productData.price_per_case,
                        price_per_piece: productData.price_per_piece,
                        price_per_case_usd: productData.price_per_case_usd,
                        price_per_piece_usd: productData.price_per_piece_usd,
                        price_per_case_tl: productData.price_per_case_tl,
                        price_per_piece_tl: productData.price_per_piece_tl,
                        barcode: productData.barcode,
                        is_active: productData.is_active,
                        proforma_group_id: productData.proforma_group_id || null
                    })
                    .eq('id', editingProduct.id)
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
                    .single();

                if (error) throw error;
                productId = editingProduct.id;
                
                // Update local state with the updated product from Supabase
                setProducts(prevProducts => 
                    prevProducts.map(p => 
                        p.id === editingProduct.id 
                            ? {
                                ...updated,
                                proforma_group_id: productData.proforma_group_id || null,
                                proforma_group: proformaGroups.find(pg => pg.id === productData.proforma_group_id) || null
                            }
                            : p
                    )
                );
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
                        price_per_case_tl: productData.price_per_case_tl,
                        price_per_piece_tl: productData.price_per_piece_tl,
                        barcode: productData.barcode,
                        is_active: productData.is_active,
                        proforma_group_id: productData.proforma_group_id || null
                    })
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
                    .single();

                if (error) throw error;
                productId = data?.id;
                
                // Add to local state immediately with proforma group info
                setProducts(prevProducts => [...prevProducts, {
                    ...data,
                    proforma_group_id: productData.proforma_group_id || null,
                    proforma_group: proformaGroups.find(pg => pg.id === productData.proforma_group_id) || null
                }]);
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

            // Save product images
            if (productId && productData.images && productData.images.length > 0) {
                console.log('💾 Saving product images:', productData.images);
                
                // First, delete existing images for this product
                if (editingProduct) {
                    const { error: deleteError } = await supabase
                        .from('product_images')
                        .delete()
                        .eq('product_id', productId);
                    
                    if (deleteError) {
                        console.error('❌ Error deleting existing images:', deleteError);
                    }
                }

                // Save all images to database (both new and existing)
                if (productData.images.length > 0) {
                    const imagesToInsert = productData.images.map((img) => ({
                        product_id: productId,
                        image_url: img.image_url, // Now contains Supabase Storage URLs
                        image_order: img.image_order,
                        is_primary: img.is_primary,
                        alt_text: img.alt_text,
                        file_size_bytes: img.file_size_bytes,
                        file_type: img.file_type,
                        width_px: img.width_px,
                        height_px: img.height_px
                    }));

                    const { error: insertError } = await supabase
                        .from('product_images')
                        .insert(imagesToInsert);

                    if (insertError) {
                        console.error('❌ Error saving images:', insertError);
                        toast.error('Görseller kaydedilemedi!');
                    } else {
                        console.log('✅ Product images saved successfully');
                        
                        // Update local state with images
                        if (editingProduct) {
                            setProducts(prevProducts => 
                                prevProducts.map(p => 
                                    p.id === productId 
                                        ? { ...p, product_images: productData.images }
                                        : p
                                )
                            );
                        } else {
                            // For new products, update the recently added product
                            setProducts(prevProducts => 
                                prevProducts.map(p => 
                                    p.id === productId 
                                        ? { ...p, product_images: productData.images }
                                        : p
                                )
                            );
                        }
                    }
                }
            }

            // Show success toast and close modal
            if (editingProduct) {
                toast.success('Ürün başarıyla güncellendi!', {
                    duration: 3000,
                    position: 'top-right',
                });
            } else {
                toast.success('Ürün başarıyla eklendi!', {
                    duration: 3000,
                    position: 'top-right',
                });
            }
            
            // Close modal automatically after successful save
            setShowAddModal(false);
            setEditingProduct(null);
            
            // Restore scroll position after a brief delay to ensure DOM is updated
            setTimeout(() => {
                if (scrollPosition > 0) {
                    window.scrollTo({
                        top: scrollPosition,
                        behavior: 'smooth'
                    });
                }
            }, 100);
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
            
            toast.success(`"${deleteConfirmation.product.name}" başarıyla silindi!`, {
                duration: 3000,
                position: 'top-right',
            });
            
            // Update local state immediately
            setProducts(prevProducts => 
                prevProducts.map(p => 
                    p.id === deleteConfirmation.product?.id 
                        ? { ...p, is_active: false }
                        : p
                )
            );
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
            
            toast.success(`${selectedProducts.length} ürün başarıyla silindi!`, {
                duration: 3000,
                position: 'top-right',
            });
            
            // Update local state immediately
            setProducts(prevProducts => 
                prevProducts.map(p => 
                    selectedProducts.includes(p.id)
                        ? { ...p, is_active: false }
                        : p
                )
            );
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
                    const price_per_case_tl = product.price_per_piece_tl * defaultPiecesPerCase;

                    const { data, error } = await supabase
                        .from('products')
                        .insert({
                            name: product.name.trim(),
                            price_per_piece: product.price_per_piece,
                            price_per_piece_usd: product.price_per_piece_usd,
                            price_per_piece_tl: product.price_per_piece_tl,
                            price_per_case: price_per_case,
                            price_per_case_usd: price_per_case_usd,
                            price_per_case_tl: price_per_case_tl,
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

    // Yeni proforma grubu eklendiğinde çağrılacak fonksiyon
    const handleProformaGroupAdded = (newGroup: ProformaGroup) => {
        // Proforma grupları listesine yeni grubu ekle
        setProformaGroups((prev: ProformaGroup[]) => [...prev, newGroup]);
    };

    const handleExportProducts = async () => {
        try {
            // Proforma gruplarını ayrı olarak çek
            const { data: proformaGroupsData, error: groupsError } = await supabase
                .from('proforma_groups')
                .select('*')
                .order('name');

            if (groupsError) {
                console.error('Proforma groups error:', groupsError);
            }

            // Ürünleri proforma grupları ile birleştir
            const productsWithGroups = products.map(product => ({
                ...product,
                proforma_group: proformaGroupsData?.find(group => group.id === product.proforma_group_id) || null
            }));

            await generateProductsExcel({
                products: productsWithGroups,
                currency: selectedCurrency
            });
            toast.success('Ürünler başarıyla dışa aktarıldı!');
        } catch (error) {
            toast.error('Dışa aktarma sırasında hata oluştu!');
            console.error('Export error:', error);
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
              onClick={() => setShowSeriesManagement(true)}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              <Settings className="w-4 h-4 mr-2" />
              Seri Yönetimi
            </button>
            <button
              onClick={() => setShowProformaGroupsManagement(true)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              <Tag className="w-4 h-4 mr-2" />
              Proforma Grupları
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Excel İçeri Aktar
            </button>
            <button
              onClick={handleExportProducts}
              className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Excel Dışa Aktar
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
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                Ortalama Fiyat (Koli)
                                {selectedCurrency === 'EUR' ? ' (€)' : selectedCurrency === 'USD' ? ' ($)' : ' (₺)'}
                            </p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {(() => {
                                    const count = products.length;
                                    if (count === 0) return selectedCurrency === 'EUR' ? '€0.00' : selectedCurrency === 'USD' ? '$0.00' : '₺0.00';
                                    if (selectedCurrency === 'EUR') {
                                        const avg = products.reduce((sum, p) => sum + p.price_per_case, 0) / count;
                                        return `€${avg.toFixed(2)}`;
                                    }
                                    if (selectedCurrency === 'USD') {
                                        const usdValues = products.map(p => p.price_per_case_usd).filter(v => v != null) as number[];
                                        if (usdValues.length === 0) return '—';
                                        const avg = usdValues.reduce((s, v) => s + v, 0) / usdValues.length;
                                        return `$${avg.toFixed(2)}`;
                                    }
                                    const tlValues = products.map(p => p.price_per_case_tl).filter(v => v != null) as number[];
                                    if (tlValues.length === 0) return '—';
                                    const avg = tlValues.reduce((s, v) => s + v, 0) / tlValues.length;
                                    return `₺${avg.toFixed(2)}`;
                                })()}
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
            onChange={(e) => setSelectedCurrency(e.target.value as 'EUR' | 'USD' | 'TL')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="EUR">€ EUR</option>
            <option value="USD">$ USD</option>
            <option value="TL">₺ TL</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-80">Ürün Adı</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-40">Seri</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-48">PROFORMA GRUBU</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
                                    Koli Fiyatı ({selectedCurrency === 'EUR' ? '€' : selectedCurrency === 'USD' ? '$' : '₺'})
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
                                    Adet Fiyatı ({selectedCurrency === 'EUR' ? '€' : selectedCurrency === 'USD' ? '$' : '₺'})
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">Durum</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">İşlemler</th>
              </tr>
            </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap w-12">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => handleSelectProduct(product.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap w-80">
                                        <div className="flex items-center space-x-3">
                                            {/* Product Image Thumbnail */}
                                            <div className="flex-shrink-0 w-12 h-12">
                                                {product.product_images && product.product_images.length > 0 ? (
                                                    <img
                                                        src={product.product_images.find(img => img.is_primary)?.image_url || product.product_images[0]?.image_url}
                                                        alt={product.name}
                                                        className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNCAzMkMyOC40MTgzIDMyIDMyIDI4LjQxODMgMzIgMjRDMzIgMTkuNTgxNyAyOC40MTgzIDE2IDI0IDE2QzE5LjU4MTcgMTYgMTYgMTkuNTgxNyAxNiAyNEMxNiAyOC40MTgzIDE5LjU4MTcgMzIgMjQgMzJaIiBmaWxsPSIjRTVFN0VCIi8+CjxwYXRoIGQ9Ik0yNCAxOEMyNy4zMTM3IDE4IDMwIDIwLjY4NjMgMzAgMjRDMzAgMjcuMzEzNyAyNy4zMTM3IDMwIDI0IDMwQzIwLjY4NjMgMzAgMTggMjcuMzEzNyAxOCAyNEMxOCAyMC42ODYzIDIwLjY4NjMgMTggMjQgMThaIiBmaWxsPSIjOUI5QkE0Ii8+CjxwYXRoIGQ9Ik0yNCAyMEMyNi4yMDkxIDIwIDI4IDIxLjc5MDkgMjggMjRDMjggMjYuMjA5MSAyNi4yMDkxIDI4IDI0IDI4QzIxLjc5MDkgMjggMjAgMjYuMjA5MSAyMCAyNEMyMCAyMS43OTA5IDIxLjc5MDkgMjAgMjQgMjBaIiBmaWxsPSIjRDFENURCIi8+Cjwvc3ZnPgo=';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-600">
                                                        <Package className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                            {product.name}
                                                </div>
                                                {product.product_images && product.product_images.length > 0 && (
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        {product.product_images.length} görsel
                                                    </div>
                                                )}
                                            </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap w-40">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {product.series?.name || 'N/A'}
                                        </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap w-48">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {(() => {
                        const proformaGroup = proformaGroups.find(pg => pg.id === product.proforma_group_id);
                        if (proformaGroup) {
                          return (
                    <div>
                              <div className="font-medium text-blue-600 dark:text-blue-400">{proformaGroup.name}</div>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white w-32">
                    {selectedCurrency === 'EUR' 
                      ? `€${product.price_per_case.toFixed(2)}`
                      : selectedCurrency === 'USD'
                      ? (product.price_per_case_usd != null
                          ? `$${product.price_per_case_usd.toFixed(2)}`
                          : '—')
                      : (product.price_per_case_tl != null
                          ? `₺${product.price_per_case_tl.toFixed(2)}`
                          : '—')
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white w-32">
                    {selectedCurrency === 'EUR' 
                      ? `€${product.price_per_piece.toFixed(2)}`
                      : selectedCurrency === 'USD'
                      ? (product.price_per_piece_usd != null
                          ? `$${product.price_per_piece_usd.toFixed(2)}`
                          : '—')
                      : (product.price_per_piece_tl != null
                          ? `₺${product.price_per_piece_tl.toFixed(2)}`
                          : '—')
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap w-24">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            product.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                                            {product.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium w-32">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          // Save current scroll position
                          setScrollPosition(window.scrollY);
                          setEditingProduct(product);
                          setShowAddModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Düzenle"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(product)}
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
                    onProformaGroupAdded={handleProformaGroupAdded}
                    scrollPosition={scrollPosition}
          onClose={() => {
            setShowAddModal(false);
            setEditingProduct(null);
            
            // Restore scroll position when modal is manually closed
            setTimeout(() => {
                if (scrollPosition > 0) {
                    window.scrollTo({
                        top: scrollPosition,
                        behavior: 'smooth'
                    });
                }
            }, 100);
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

      {/* Series Management Modal */}
      {showSeriesManagement && (
        <SeriesManagement
          onClose={() => setShowSeriesManagement(false)}
        />
      )}

      {/* Proforma Groups Management Modal */}
      {showProformaGroupsManagement && (
        <ProformaGroupsManagement
          onClose={() => setShowProformaGroupsManagement(false)}
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
    onProformaGroupAdded?: (newGroup: ProformaGroup) => void;
    scrollPosition?: number;
}

const ProductModal: React.FC<ProductModalProps> = ({ product, series, productTypes, proformaGroups, groupsLoading, onSave, onClose, onProformaGroupAdded, scrollPosition }) => {
    const [formData, setFormData] = useState({
        name: product?.name || '',
        series_id: product?.series_id || '',
        price_per_case: product?.price_per_case || 0,
        price_per_piece: product?.price_per_piece || 0,
        price_per_case_usd: product?.price_per_case_usd || 0,
        price_per_piece_usd: product?.price_per_piece_usd || 0,
        price_per_case_tl: product?.price_per_case_tl || 0,
        price_per_piece_tl: product?.price_per_piece_tl || 0,
        barcode: product?.barcode || '',
        is_active: product?.is_active ?? true,
        proforma_group_id: product?.proforma_group_id || '',
        images: product?.product_images || []
    });

    // Image upload states
    const [uploading, setUploading] = useState(false);
    const [previewImage, setPreviewImage] = useState<ProductImage | null>(null);
    const [imageDeleteConfirm, setImageDeleteConfirm] = useState<{show: boolean, image: ProductImage | null}>({show: false, image: null});
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Yeni proforma grubu ekleme state'leri
    const [showAddProformaGroupModal, setShowAddProformaGroupModal] = useState(false);
    const [newProformaGroupData, setNewProformaGroupData] = useState({
        name: ''
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
            price_per_case_tl: product?.price_per_case_tl || 0,
            price_per_piece_tl: product?.price_per_piece_tl || 0,
            barcode: product?.barcode || '',
            is_active: product?.is_active ?? true,
            proforma_group_id: product?.proforma_group_id || '',
            images: product?.product_images || []
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

    const handlePiecePriceChange = (piecePrice: number, currency: 'EUR' | 'USD' | 'TL') => {
        console.log('Piece price changed:', piecePrice, 'Currency:', currency, 'Series:', selectedSeries);
        const casePrice = calculateCasePriceFromPiece(piecePrice);
        console.log('Calculated case price:', casePrice);
        
        if (currency === 'EUR') {
            setFormData(prev => ({
                ...prev,
                price_per_piece: piecePrice,
                price_per_case: casePrice
            }));
        } else if (currency === 'USD') {
            setFormData(prev => ({
                ...prev,
                price_per_piece_usd: piecePrice,
                price_per_case_usd: casePrice
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                price_per_piece_tl: piecePrice,
                price_per_case_tl: casePrice
            }));
        }
    };

    // Seri değişince (adet/koli) tüm kurlar için koli fiyatlarını yeniden hesapla
    useEffect(() => {
        if (!selectedSeries) return;
        setFormData(prev => ({
            ...prev,
            price_per_case: prev.price_per_piece ? prev.price_per_piece * selectedSeries.pieces_per_case : prev.price_per_case,
            price_per_case_usd: prev.price_per_piece_usd ? prev.price_per_piece_usd * selectedSeries.pieces_per_case : prev.price_per_case_usd,
            price_per_case_tl: prev.price_per_piece_tl ? prev.price_per_piece_tl * selectedSeries.pieces_per_case : prev.price_per_case_tl,
        }));
    }, [selectedSeries?.pieces_per_case]);

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

    // Yeni proforma grubu ekleme fonksiyonu
    const handleAddProformaGroup = async () => {
        try {
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

            const { data, error } = await supabase
                .from('proforma_groups')
                .insert({
                    id: nextId,
                    name: newProformaGroupData.name,
                    is_active: true
                })
                .select()
                .single();

            if (error) throw error;

            // Yeni grubu formData'ya ata
            setFormData(prev => ({ ...prev, proforma_group_id: data.id }));
            
            // Modal'ı kapat ve formu temizle
            setShowAddProformaGroupModal(false);
            setNewProformaGroupData({
                name: ''
            });

            // Başarı mesajı
            toast.success('Yeni proforma grubu başarıyla eklendi!', {
                icon: '✅',
                duration: 3000
            });

            // Parent component'e yeni grup bilgisini gönder
            if (onProformaGroupAdded) {
                onProformaGroupAdded(data);
            }
        } catch (err: any) {
            toast.error(`Hata: ${err.message}`, {
                icon: '❌',
                duration: 5000
            });
        }
    };

    // Handle image upload to Supabase Storage
    const handleImageUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        
        const file = files[0];
        const maxSize = 5 * 1024 * 1024; // 5MB
        
        // Validation
        if (file.size > maxSize) {
            toast.error('Dosya boyutu 5MB\'dan küçük olmalıdır');
            return;
        }
        
        if (!file.type.startsWith('image/')) {
            toast.error('Sadece resim dosyaları yükleyebilirsiniz');
            return;
        }
        
        if (formData.images.length >= 3) {
            toast.error('Maksimum 3 görsel ekleyebilirsiniz');
            return;
        }
        
        setUploading(true);
        
        try {
            // Create unique filename
            const timestamp = Date.now();
            const fileExtension = file.name.split('.').pop() || 'jpg';
            const fileName = `product_${timestamp}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
            const filePath = `products/${fileName}`;
            
            console.log('📤 Uploading file to Supabase Storage:', filePath);
            
            // Create preview URL immediately using FileReader for instant feedback
            const tempPreviewUrl = URL.createObjectURL(file);
            
            // Add temporary image to UI immediately for smooth experience
            const tempImage: ProductImage = {
                id: `temp_${timestamp}`,
                product_id: product?.id || '',
                image_url: tempPreviewUrl,
                image_order: formData.images.length + 1,
                is_primary: formData.images.length === 0, // Only first image is primary by default
                file_size_bytes: file.size,
                file_type: file.type,
                width_px: undefined,
                height_px: undefined,
                alt_text: formData.name,
                uploading: true // Flag to show this is uploading
            };
            
            // Immediately update UI with temporary image
            setFormData(prev => ({
                ...prev,
                images: [...prev.images, tempImage]
            }));
            
            // Upload to Supabase Storage in background
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });
            
            if (uploadError) {
                console.error('❌ Storage upload error:', uploadError);
                // Remove temporary image on error
                setFormData(prev => ({
                    ...prev,
                    images: prev.images.filter(img => img.id !== `temp_${timestamp}`)
                }));
                throw uploadError;
            }
            
            console.log('✅ File uploaded successfully:', uploadData);
            
            // Get public URL
            const { data: urlData } = supabase.storage
                .from('product-images')
                .getPublicUrl(filePath);
            
            const publicUrl = urlData.publicUrl;
            console.log('🔗 Public URL generated:', publicUrl);
            
            // Get image dimensions in background using Promise-based approach
            const getImageDimensions = (url: string): Promise<{width: number, height: number}> => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve({ width: img.width, height: img.height });
                    img.onerror = () => reject(new Error('Failed to load image'));
                    img.src = url;
                });
            };
            
            // Get dimensions and update the temporary image with real URL
            try {
                const dimensions = await getImageDimensions(publicUrl);
                
                // Update the temporary image with real URL and dimensions
                setFormData(prev => ({
                    ...prev,
                    images: prev.images.map(img => 
                        img.id === `temp_${timestamp}` 
                            ? {
                                ...img,
                                image_url: publicUrl,
                                width_px: dimensions.width,
                                height_px: dimensions.height,
                                uploading: false
                            }
                            : img
                    )
                }));
                
                // Clean up temporary preview URL
                URL.revokeObjectURL(tempPreviewUrl);
                
                toast.success('Görsel başarıyla yüklendi!');
                
            } catch (dimensionError) {
                // If dimension loading fails, still update with real URL
                setFormData(prev => ({
                    ...prev,
                    images: prev.images.map(img => 
                        img.id === `temp_${timestamp}` 
                            ? {
                                ...img,
                                image_url: publicUrl,
                                uploading: false
                            }
                            : img
                    )
                }));
                
                // Clean up temporary preview URL
                URL.revokeObjectURL(tempPreviewUrl);
                
                toast.success('Görsel yüklendi!');
            }
            
        } catch (error: any) {
            console.error('❌ Upload error:', error);
            toast.error(`Görsel yüklenirken hata oluştu: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    // Handle file input click
    const handleAddImageClick = () => {
        fileInputRef.current?.click();
    };

    // Handle setting primary image
    const handleSetPrimaryImage = (imageId: string) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.map(img => ({
                ...img,
                is_primary: img.id === imageId
            }))
        }));
        toast.success('Ana görsel değiştirildi!');
    };

    // Show image delete confirmation
    const handleDeleteImageClick = (imageId: string) => {
        const imageToDelete = formData.images.find(img => img.id === imageId);
        if (!imageToDelete) return;
        setImageDeleteConfirm({show: true, image: imageToDelete});
    };

    // Handle confirmed image deletion
    const handleConfirmDeleteImage = async () => {
        if (!imageDeleteConfirm.image) return;
        
        const imageId = imageDeleteConfirm.image.id;
        const imageToDelete = imageDeleteConfirm.image;
        
        try {
            // If it's a real database image (not temp), delete from database first
            if (!imageId.startsWith('temp_')) {
                console.log('🗑️ Deleting from database:', imageId);
                
                const { error: dbDeleteError } = await supabase
                    .from('product_images')
                    .delete()
                    .eq('id', imageId);
                
                if (dbDeleteError) {
                    console.error('❌ Database delete error:', dbDeleteError);
                    toast.error('Veritabanından silinirken hata oluştu');
                    return; // Don't proceed if database delete fails
                }
                
                // If it's a real storage image, also delete from storage
                if (imageToDelete.image_url && imageToDelete.image_url.includes('supabase')) {
                    // Extract file path from URL
                    const url = new URL(imageToDelete.image_url);
                    const pathParts = url.pathname.split('/');
                    const filePath = pathParts.slice(-2).join('/'); // Get "products/filename.ext"
                    
                    console.log('🗑️ Deleting from storage:', filePath);
                    
                    const { error: storageDeleteError } = await supabase.storage
                        .from('product-images')
                        .remove([filePath]);
                    
                    if (storageDeleteError) {
                        console.error('❌ Storage delete error:', storageDeleteError);
                        // Don't throw error, image already deleted from database
                    }
                }
            }
            
            // Remove from form data and handle primary image logic
            setFormData(prev => {
                const updatedImages = prev.images.filter(img => img.id !== imageId);
                
                // If we deleted the primary image and there are other images, make the first one primary
                if (imageToDelete.is_primary && updatedImages.length > 0) {
                    updatedImages[0] = { ...updatedImages[0], is_primary: true };
                }
                
                return {
                    ...prev,
                    images: updatedImages
                };
            });
            
            toast.success('Görsel silindi');
            
        } catch (error: any) {
            console.error('❌ Delete error:', error);
            toast.error('Görsel silinirken hata oluştu');
        } finally {
            // Close confirmation dialog
            setImageDeleteConfirm({show: false, image: null});
        }
    };

    // Cancel image deletion
    const handleCancelDeleteImage = () => {
        setImageDeleteConfirm({show: false, image: null});
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
                            onClick={uploading ? undefined : onClose}
                            disabled={uploading}
                            className={`text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={uploading ? 'Görsel yükleniyor, lütfen bekleyin...' : ''}
                        >
                            <X className="w-5 h-5" />
                        </button>
    </div>

                    {/* Hidden File Input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e.target.files)}
                        className="hidden"
                    />

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
                            <div className="flex space-x-2">
                                <select
                                    value={formData.proforma_group_id}
                                    onChange={(e) => {
                                        setFormData({ 
                                            ...formData, 
                                            proforma_group_id: e.target.value
                                        });
                                    }}
                                    className="flex-1 p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    disabled={groupsLoading}
                                >
                                    <option value="">
                                        {groupsLoading ? 'Yükleniyor...' : 'Proforma grubu seçin...'}
                                    </option>
                                    {proformaGroups.map(pg => (
                                        <option key={pg.id} value={pg.id}>
                                            {pg.name}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => setShowAddProformaGroupModal(true)}
                                    className="px-4 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium whitespace-nowrap"
                                >
                                    YENİ GRUP EKLE
                                </button>
                            </div>
                            {formData.proforma_group_id && (
                                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                                    <div className="text-sm text-blue-700 dark:text-blue-300">
                                        ✓ Seçilen: {proformaGroups.find(pg => pg.id === formData.proforma_group_id)?.name}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Product Images Section */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                Ürün Görselleri
                            </label>
                            
                            {/* Current Images Display - Horizontal Layout */}
                            {formData.images && formData.images.length > 0 && (
                                <div className="mb-4">
                                    <div className="flex gap-3 overflow-x-auto pb-2">
                                        {formData.images
                                            .sort((a, b) => a.image_order - b.image_order)
                                            .map((image, index) => (
                                            <div key={image.id} className="relative group flex-shrink-0">
                                                <div 
                                                    className={`w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border-2 transition-colors ${
                                                        image.uploading 
                                                            ? 'border-blue-500 border-dashed' 
                                                            : 'border-gray-200 dark:border-gray-600 cursor-pointer hover:border-blue-400'
                                                    }`}
                                                    onClick={image.uploading ? undefined : () => setPreviewImage(image)}
                                                    title={image.uploading ? 'Görsel yükleniyor...' : 'Görseli büyük görmek için tıklayın'}
                                                >
                                                    <img
                                                        src={image.image_url}
                                                        alt={image.alt_text || `Ürün görseli ${index + 1}`}
                                                        className={`w-full h-full object-cover ${image.uploading ? 'opacity-70' : ''}`}
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik00MCA1NkM0OC44MzY2IDU2IDU2IDQ4LjgzNjYgNTYgNDBDNTYgMzEuMTYzNCA0OC44MzY2IDI0IDQwIDI0QzMxLjE2MzQgMjQgMjQgMzEuMTYzNCAyNCA0MEMyNCA0OC44MzY2IDMxLjE2MzQgNTYgNDAgNTZaIiBmaWxsPSIjRTVFN0VCIi8+CjxwYXRoIGQ9Ik00MCAyOEM0Ni42Mjc0IDI4IDUyIDMzLjM3MjYgNTIgNDBDNTIgNDYuNjI3NCA0Ni42Mjc0IDUyIDQwIDUyQzMzLjM3MjYgNTIgMjggNDYuNjI3NCAyOCA0MEMyOCAzMy4zNzI2IDMzLjM3MjYgMjggNDAgMjhaIiBmaWxsPSIjOUI5QkE0Ii8+Cjwvc3ZnPgo=';
                                                        }}
                                                    />
                                                    {/* Uploading overlay */}
                                                    {image.uploading && (
                                                        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                                                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="absolute top-1 left-1">
                                                    <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded text-[10px]">
                                                        {index + 1}
                                                    </span>
                                                </div>
                                                {image.is_primary && (
                                                    <div className="absolute top-1 right-1">
                                                        <span className="bg-green-600 text-white text-xs px-1.5 py-0.5 rounded text-[10px]">
                                                            Ana
                                                        </span>
                                                    </div>
                                                )}
                                                {!image.uploading && (
                                                    <>
                                                        {/* Ana görsel yapma butonu */}
                                                        {!image.is_primary && (
                                                            <div className="absolute -top-1 -left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSetPrimaryImage(image.id)}
                                                                    className="bg-yellow-500 text-white p-1 rounded-full hover:bg-yellow-600 w-5 h-5 flex items-center justify-center"
                                                                    title="Ana Görsel Yap"
                                                                >
                                                                    <span className="text-[10px] font-bold">★</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                        {/* Silme butonu */}
                                                        <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                                                    <button
                                                            type="button"
                                                            onClick={() => handleDeleteImageClick(image.id)}
                                                            className="bg-red-600 text-white p-1 rounded-full hover:bg-red-700 w-5 h-5 flex items-center justify-center"
                                                            title="Görseli Sil"
                                                        >
                                                            <X className="w-2.5 h-2.5" />
                                                        </button>
                                                        </div>
                                                    </>
                                                )}
                                                <div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400 text-center max-w-20 truncate">
                                                    {image.uploading ? 'Yükleniyor...' : (image.file_type && image.file_type.toUpperCase())}
                                                </div>
                                            </div>
                                        ))}
                                        
                                        {/* Add New Image Placeholder */}
                                        {formData.images.length < 3 && (
                                            <div 
                                                onClick={uploading ? undefined : handleAddImageClick}
                                                className={`w-20 h-20 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center transition-colors flex-shrink-0 ${uploading ? 'cursor-not-allowed opacity-50' : 'hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer'}`}
                                            >
                                                {uploading ? (
                                                    <>
                                                        <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full mb-1"></div>
                                                        <span className="text-[10px] text-blue-500 text-center">
                                                            Yükleniyor...
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ImagePlus className="w-6 h-6 text-gray-400 dark:text-gray-500 mb-1" />
                                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 text-center">
                                                            Ekle
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            {/* No Images State - Compact */}
                            {(!formData.images || formData.images.length === 0) && (
                                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
                                    <div className="flex items-center justify-center gap-4">
                                        <div className="flex flex-col items-center">
                                            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mb-2">
                                                <Package className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                            </div>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                Görsel yok
                                            </span>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                                Maksimum 3 görsel ekleyebilirsiniz
                                            </p>
                                            <button
                                                type="button"
                                                onClick={uploading ? undefined : handleAddImageClick}
                                                disabled={uploading}
                                                className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                title={uploading ? 'Görsel yükleniyor, lütfen bekleyin...' : ''}
                                            >
                                                {uploading ? (
                                                    <div className="animate-spin w-3 h-3 border border-gray-400 border-t-transparent rounded-full mr-1"></div>
                                                ) : (
                                                    <ImagePlus className="w-3 h-3 mr-1" />
                                                )}
                                                {uploading ? 'Yükleniyor...' : 'İlk Görseli Ekle'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                                💡 İpucu: İlk görsel otomatik olarak ana görsel olur. Görseller katalogda ve ürün listesinde görünür.
                            </div>
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

                        {/* TL Fiyatları */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Adet Fiyatı (₺)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.price_per_piece_tl}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(',', '.');
                                        const numValue = parseFloat(value) || 0;
                                        handlePiecePriceChange(numValue, 'TL');
                                    }}
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Koli Fiyatı (₺) {selectedSeries && <span className="text-xs text-gray-500">({selectedSeries.pieces_per_case} adet - Otomatik hesaplanır)</span>}
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.price_per_case_tl}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(',', '.');
                                        const numValue = parseFloat(value) || 0;
                                        setFormData({ ...formData, price_per_case_tl: numValue });
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
                                onClick={uploading ? undefined : onClose}
                                disabled={uploading}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={uploading ? 'Görsel yükleniyor, lütfen bekleyin...' : ''}
                            >
                                İptal
                            </button>
                            <button
                                type="submit"
                                disabled={uploading}
                                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={uploading ? 'Görsel yükleniyor, lütfen bekleyin...' : ''}
                            >
                                <Save className="w-4 h-4 mr-2" />
                                {uploading ? 'Yükleniyor...' : (product ? 'Güncelle' : 'Kaydet')}
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

            {/* Yeni Proforma Grubu Ekleme Modal */}
            {showAddProformaGroupModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Yeni Proforma Grubu Ekle
                            </h3>
                            <button
                                onClick={() => setShowAddProformaGroupModal(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Grup Adı *
                                </label>
                                <input
                                    type="text"
                                    value={newProformaGroupData.name}
                                    onChange={(e) => setNewProformaGroupData({ ...newProformaGroupData, name: e.target.value })}
                                    placeholder="Örn: OLIVE OIL SHOWER GEL 750ML"
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md"
                                    required
                                />
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Bu isim direkt olarak proforma belgesinde görünecektir.
                                </p>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddProformaGroupModal(false)}
                                    className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    İptal
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAddProformaGroup}
                                    disabled={!newProformaGroupData.name.trim()}
                                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Grup Ekle
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Preview Modal */}
            {previewImage && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[70]" onClick={() => setPreviewImage(null)}>
                    <div className="relative max-w-4xl max-h-[90vh] mx-4" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setPreviewImage(null)}
                            className="absolute -top-10 right-0 text-white hover:text-gray-300 z-10"
                            title="Kapat"
                        >
                            <X className="w-8 h-8" />
                        </button>
                        <img
                            src={previewImage.image_url}
                            alt={previewImage.alt_text || 'Ürün görseli'}
                            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMDAgMjgwQzI0MC4wIDI4MCAyODAgMjQwLjAgMjgwIDIwMEMyODAgMTYwLjAgMjQwLjAgMTIwIDIwMCAxMjBDMTYwLjAgMTIwIDEyMCAxNjAuMCAxMjAgMjAwQzEyMCAyNDAuMCAxNjAuMCAyODAgMjAwIDI4MFoiIGZpbGw9IiNFNUU3RUIiLz4KPHA=' ;
                            }}
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4 rounded-b-lg">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h4 className="font-medium">{formData.name}</h4>
                                    <p className="text-sm text-gray-300">
                                        {previewImage.is_primary && '🏷️ Ana görsel'} 
                                        {previewImage.file_type && ` • ${previewImage.file_type.toUpperCase()}`}
                                        {previewImage.width_px && previewImage.height_px && 
                                            ` • ${previewImage.width_px}×${previewImage.height_px}px`
                                        }
                                    </p>
                                </div>
                                <div className="flex space-x-2">
                                    {!previewImage.is_primary && (
                                        <button
                                            onClick={() => {
                                                handleSetPrimaryImage(previewImage.id);
                                                setPreviewImage(null);
                                            }}
                                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm"
                                            title="Ana Görsel Yap"
                                        >
                                            ★ Ana Yap
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            handleDeleteImageClick(previewImage.id);
                                            setPreviewImage(null);
                                        }}
                                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                                        title="Görseli Sil"
                                    >
                                        Sil
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Delete Confirmation Dialog */}
            {imageDeleteConfirm.show && imageDeleteConfirm.image && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80]">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Görsel Silme Onayı</h3>
                            <button
                                onClick={handleCancelDeleteImage}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="mb-6">
                            <div className="flex items-center mb-4">
                                <div className="flex-shrink-0 w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-600">
                                    <img
                                        src={imageDeleteConfirm.image.image_url}
                                        alt="Silinecek görsel"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zMiA0NEMzOC42Mjc0IDQ0IDQ0IDM4LjYyNzQgNDQgMzJDNDQgMjUuMzcyNiAzOC42Mjc0IDIwIDMyIDIwQzI1LjM3MjYgMjAgMjAgMjUuMzcyNiAyMCAzMkMyMCAzOC42Mjc0IDI1LjM3MjYgNDQgMzIgNDRaIiBmaWxsPSIjRTVFN0VCIi8+Cjwvc3ZnPgo=';
                                        }}
                                    />
                                </div>
                                <div className="ml-4">
                                    <h4 className="text-lg font-medium text-gray-900 dark:text-white">Görseli Sil</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {imageDeleteConfirm.image.is_primary && (
                                            <span className="text-orange-600 dark:text-orange-400 font-medium">⚠️ Ana görsel</span>
                                        )}
                                        {imageDeleteConfirm.image.file_type && (
                                            <span className="ml-2">{imageDeleteConfirm.image.file_type.toUpperCase()}</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                Bu görseli silmek istediğinizden emin misiniz?
                            </p>
                            
                            {imageDeleteConfirm.image.is_primary && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                        ⚠️ Bu ana görseldir. Silinirse, varsa başka bir görsel otomatik olarak ana görsel olacaktır.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={handleCancelDeleteImage}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleConfirmDeleteImage}
                                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                            >
                                <X className="w-4 h-4 mr-2" />
                                Görseli Sil
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </>
  );
};

export default Products;