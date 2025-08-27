import React, { useState, useEffect } from 'react';
import { StockCodeCategory } from '../types/stock';
import { Search, Plus, Edit, Trash2, Package, AlertTriangle, TrendingUp, TrendingDown, Upload, CheckSquare, Square, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, SortAsc, SortDesc } from 'lucide-react';
import StockItemCard from '../components/StockItemCard';
import AddStockItemModal from '../components/AddStockItemModal';
import EditStockItemModal from '../components/EditStockItemModal';
import ExcelImportModal from '../components/ExcelImportModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import { stockService } from '../services/stockService';
import type { StockItem, StockAlert, StockFilter } from '../types/stock';

const StockManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('stockName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteModalData, setDeleteModalData] = useState<{
    type: 'single' | 'bulk';
    item?: StockItem;
    count: number;
  }>({ type: 'bulk', count: 0 });
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 });
  const [pageInput, setPageInput] = useState('');
  
  // State
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoriesData, setCategoriesData] = useState<StockCodeCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryCode, setNewCategoryCode] = useState('');
  const [catLoading, setCatLoading] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const cats = await stockService.getStockCodeCategories();
      setCategoriesData(cats);
      const [itemsResponse, alertsData, categoriesData] = await Promise.all([
        stockService.getStockItems(),
        stockService.getStockAlerts(),
        stockService.getStockCodeCategories()
      ]);

      setStockItems(itemsResponse.items);
      setAlerts(alertsData);
      setCategories(categoriesData.map(cat => cat.categoryName));
    } catch (err: any) {
      setError('Veriler yüklenirken hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedItems = React.useMemo(() => {
    // First filter
    let filtered = stockItems.filter(item => {
      const matchesSearch = item.stockName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.stockCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (item.supplier && item.supplier.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      
      // Status filter
      let matchesStatus = true;
      if (statusFilter === 'low_stock') {
        matchesStatus = item.currentAmount <= item.minimumLevel && item.currentAmount > 0;
      } else if (statusFilter === 'out_of_stock') {
        matchesStatus = item.currentAmount <= 0;
      } else if (statusFilter === 'in_stock') {
        matchesStatus = item.currentAmount > item.minimumLevel;
      }
      
      return matchesSearch && matchesCategory && matchesStatus;
    });

    // Then sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'stockName':
          aValue = a.stockName.toLowerCase();
          bValue = b.stockName.toLowerCase();
          break;
        case 'stockCode':
          aValue = a.stockCode.toLowerCase();
          bValue = b.stockCode.toLowerCase();
          break;
        case 'category':
          aValue = a.category.toLowerCase();
          bValue = b.category.toLowerCase();
          break;
        case 'currentAmount':
          aValue = a.currentAmount;
          bValue = b.currentAmount;
          break;
        case 'minimumLevel':
          aValue = a.minimumLevel;
          bValue = b.minimumLevel;
          break;
        case 'supplier':
          aValue = (a.supplier || '').toLowerCase();
          bValue = (b.supplier || '').toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt || '').getTime();
          bValue = new Date(b.createdAt || '').getTime();
          break;
        case 'status':
          // Sort by stock status priority
          const getStatusPriority = (item: StockItem) => {
            if (item.currentAmount <= 0) return 0; // Out of stock first
            if (item.currentAmount <= item.minimumLevel) return 1; // Low stock second
            return 2; // In stock last
          };
          aValue = getStatusPriority(a);
          bValue = getStatusPriority(b);
          break;
        default:
          aValue = a.stockName.toLowerCase();
          bValue = b.stockName.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [stockItems, searchTerm, selectedCategory, statusFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filteredAndSortedItems.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setPageInput('1');
    setSelectedItems([]); // Clear selections when changing filters
  }, [searchTerm, selectedCategory, statusFilter, sortField, sortDirection]);

  // Update page input when current page changes
  useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>) => {
    if (e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return;
    
    const pageNum = parseInt(pageInput);
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
    } else {
      // Reset to current page if invalid
      setPageInput(currentPage.toString());
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getItemAlerts = (itemId: string) => {
    return alerts.filter(alert => alert.stockItemId === itemId && !alert.isResolved);
  };

  const handleStockItemCreated = (item: StockItem) => {
    setStockItems(prev => [item, ...prev]);
  };

  const handleEditItem = (item: StockItem) => {
    setEditingItem(item);
    setShowEditModal(true);
  };

  const handleStockItemUpdated = (updatedItem: StockItem) => {
    setStockItems(prev => prev.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    ));
  };

  const handleDeleteItem = async (item: StockItem) => {
    setDeleteModalData({
      type: 'single',
      item: item,
      count: 1
    });
    setShowDeleteModal(true);
  };

  const handleSelectItem = (itemId: string, selected: boolean) => {
    if (selected) {
      setSelectedItems(prev => [...prev, itemId]);
    } else {
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      // Select ALL filtered items, not just current page
      setSelectedItems(filteredAndSortedItems.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    
    setDeleteModalData({
      type: 'bulk',
      count: selectedItems.length
    });
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setBulkDeleteLoading(true);
      
      if (deleteModalData.type === 'single' && deleteModalData.item) {
        // Single item delete
        setDeleteProgress({ current: 0, total: 1 });
        await stockService.deleteStockItem(deleteModalData.item.id);
        setDeleteProgress({ current: 1, total: 1 });
        
        setStockItems(prev => prev.filter(i => i.id !== deleteModalData.item!.id));
        setSelectedItems(prev => prev.filter(id => id !== deleteModalData.item!.id));
        
      } else if (deleteModalData.type === 'bulk') {
        // Bulk delete with progress
        const totalItems = selectedItems.length;
        setDeleteProgress({ current: 0, total: totalItems });
        
        const errors: string[] = [];
        const successfulDeletes: string[] = [];
        
        for (let i = 0; i < selectedItems.length; i++) {
          const itemId = selectedItems[i];
          setDeleteProgress({ current: i + 1, total: totalItems });
          
          try {
            await stockService.deleteStockItem(itemId);
            successfulDeletes.push(itemId);
            
            // Small delay to show progress
            if (totalItems > 1) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } catch (err: any) {
            const item = stockItems.find(i => i.id === itemId);
            errors.push(`${item?.stockName || itemId}: ${err.message}`);
          }
        }

        // Update UI - only remove successfully deleted items
        setStockItems(prev => prev.filter(item => !successfulDeletes.includes(item.id)));
        setSelectedItems(prev => prev.filter(id => !successfulDeletes.includes(id)));
        
        if (errors.length > 0) {
          alert(`${successfulDeletes.length} kayıt silindi.\n\nBazı kayıtlar silinemedi:\n${errors.join('\n')}`);
        }
      }
      
      // Small delay before closing to show completion
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setShowDeleteModal(false);
      setDeleteProgress({ current: 0, total: 0 });
      
    } catch (err: any) {
      alert('Silme işlemi başarısız: ' + err.message);
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Yükleniyor...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800">{error}</div>
        <button 
          onClick={loadData}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stok Yönetimi</h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Kategori Yönetimi
          </button>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === 'cards' 
                  ? 'bg-white shadow text-gray-900' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Kartlar
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === 'table' 
                  ? 'bg-white shadow text-gray-900' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tablo
            </button>
          </div>
          
          {/* Bulk Actions */}
          {selectedItems.length > 0 && (
            <div className="flex items-center space-x-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <span className="text-sm text-red-700 font-medium">
                {selectedItems.length} / {filteredAndSortedItems.length} seçili
              </span>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleteLoading}
                className="flex items-center px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                {bulkDeleteLoading ? 'Siliniyor...' : 'Toplu Sil'}
              </button>
              <button
                onClick={() => setSelectedItems([])}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                İptal
              </button>
            </div>
          )}

          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            Excel Import
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Yeni Stok Kalemi
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <Package className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Toplam Ürün</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stockItems.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Düşük Stok</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stockItems.filter(item => item.currentAmount <= item.minimumLevel && item.currentAmount > 0).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <TrendingDown className="w-8 h-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Stok Tükenen</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stockItems.filter(item => item.currentAmount <= 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Stok adı, kodu veya tedarikçi ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2 lg:gap-4">
            {/* Category Filter */}
            <select
              className="px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">Tüm Kategoriler</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              className="px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tüm Durumlar</option>
              <option value="in_stock">Stokta</option>
              <option value="low_stock">Düşük Stok</option>
              <option value="out_of_stock">Tükenen</option>
            </select>

            {/* Sort Field */}
            <select
              className="px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
            >
              <option value="stockName">Ad'a Göre</option>
              <option value="stockCode">Kod'a Göre</option>
              <option value="category">Kategori'ye Göre</option>
              <option value="currentAmount">Miktara Göre</option>
              <option value="status">Duruma Göre</option>
              <option value="supplier">Tedarikçi'ye Göre</option>
              <option value="createdAt">Tarihe Göre</option>
            </select>

            {/* Sort Direction */}
            <button
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="flex items-center px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
              title={sortDirection === 'asc' ? 'Artan Sıralama' : 'Azalan Sıralama'}
            >
              {sortDirection === 'asc' ? (
                <SortAsc className="w-4 h-4" />
              ) : (
                <SortDesc className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {filteredAndSortedItems.length} sonuç bulundu
            {searchTerm && (
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                "{searchTerm}"
              </span>
            )}
            {selectedCategory !== 'all' && (
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                {selectedCategory}
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                {statusFilter === 'in_stock' ? 'Stokta' : 
                 statusFilter === 'low_stock' ? 'Düşük Stok' : 'Tükenen'}
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
              setStatusFilter('all');
              setSortField('stockName');
              setSortDirection('asc');
            }}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Filtreleri Temizle
          </button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mr-2" />
              <span className="text-amber-800 dark:text-amber-200 font-medium">
                {alerts.length} aktif uyarı var!
              </span>
            </div>
            <button 
              onClick={loadData}
              className="text-amber-600 hover:text-amber-800 text-sm underline"
            >
              Yenile
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Ürün adı veya stok kodu ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
           className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tüm Kategoriler</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'cards' ? (
        // Cards View
        <div className="space-y-4">
          {/* Select All for Cards */}
          {filteredAndSortedItems.length > 0 && (
            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-4 py-2 rounded-lg">
              <button
                onClick={() => handleSelectAll(selectedItems.length !== filteredAndSortedItems.length)}
                className="flex items-center text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {selectedItems.length === filteredAndSortedItems.length && filteredAndSortedItems.length > 0 ? (
                  <CheckSquare className="w-4 h-4 mr-2" />
                ) : (
                  <Square className="w-4 h-4 mr-2" />
                )}
                <span className="text-sm font-medium">
                  {selectedItems.length === filteredAndSortedItems.length && filteredAndSortedItems.length > 0 
                    ? 'Seçimi Kaldır' 
                    : `Tümünü Seç (${filteredAndSortedItems.length} öğe)`}
                </span>
              </button>
              
              {selectedItems.length > 0 && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedItems.length} / {filteredAndSortedItems.length} seçili
                </span>
              )}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedItems.map((item) => (
            <StockItemCard
              key={item.id}
              item={item}
              alerts={getItemAlerts(item.id)}
              selected={selectedItems.includes(item.id)}
              onEdit={handleEditItem}
              onDelete={handleDeleteItem}
              onSelect={(item, selected) => handleSelectItem(item.id, selected)}
            />
          ))}
          {paginatedItems.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              {searchTerm || selectedCategory !== 'all' 
                ? 'Filtrelere uygun stok kalemi bulunamadı.'
                : 'Henüz stok kalemi eklenmemiş.'}
            </div>
          )}
          </div>
        </div>
      ) : (
        // Table View
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSelectAll(selectedItems.length !== filteredAndSortedItems.length)}
                      className="flex items-center text-gray-500 hover:text-gray-700"
                    >
                      {selectedItems.length === filteredAndSortedItems.length && filteredAndSortedItems.length > 0 ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Stok Kodu</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Stok Adı</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Kategori</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Birim</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Mevcut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Min.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tedarikçi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Durum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedItems.map((item) => (
                  <tr key={item.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    selectedItems.includes(item.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleSelectItem(item.id, !selectedItems.includes(item.id))}
                        className="flex items-center text-gray-500 hover:text-gray-700"
                      >
                        {selectedItems.includes(item.id) ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                      {item.stockCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.stockName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {item.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {item.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.currentAmount.toLocaleString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {item.minimumLevel.toLocaleString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {item.supplier || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.currentAmount <= 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Tükendi
                        </span>
                      ) : item.currentAmount <= item.minimumLevel ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Düşük
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Package className="w-3 h-3 mr-1" />
                          Normal
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditItem(item)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Düzenle"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedItems.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                      {searchTerm || selectedCategory !== 'all' 
                        ? 'Filtrelere uygun stok kalemi bulunamadı.'
                        : 'Henüz stok kalemi eklenmemiş.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {filteredAndSortedItems.length > itemsPerPage && (
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 px-6 py-3 border-t rounded-b-lg">
          <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
            <span>
              Toplam <span className="font-medium">{filteredAndSortedItems.length}</span> kayıttan{' '}
              <span className="font-medium">{startIndex + 1}</span> -{' '}
              <span className="font-medium">{Math.min(endIndex, filteredAndSortedItems.length)}</span> arası gösteriliyor
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* First Page */}
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
              title="İlk Sayfa"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            
            {/* Previous Page */}
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
              title="Önceki Sayfa"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {/* Page Numbers */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            {/* Manual Page Input */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Sayfa:</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={pageInput}
                onChange={handlePageInputChange}
                onKeyDown={handlePageInputSubmit}
                onBlur={handlePageInputSubmit}
                className="w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder={currentPage.toString()}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">/ {totalPages}</span>
            </div>
            
            {/* Next Page */}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
              title="Sonraki Sayfa"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            
            {/* Last Page */}
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
              title="Son Sayfa"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add Modal */}
      <AddStockItemModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleStockItemCreated}
      />

      {/* Edit Modal */}
      <EditStockItemModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingItem(null);
        }}
        onSuccess={handleStockItemUpdated}
        item={editingItem}
      />

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={() => {
          // Reload stock items after import
          const refreshData = async () => {
            try {
              const itemsResponse = await stockService.getStockItems();
              setStockItems(itemsResponse.items);
            } catch (err) {
              console.error('Failed to refresh data after import:', err);
            }
          };
          refreshData();
          setShowImportModal(false);
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={async () => {
          // Eğer kategori silme modalsa deleteModalData.item.id üzerinden kategori sil
          const cat = (deleteModalData.item as any)
          if (cat && cat.id && !cat.stockCode) {
            try {
              await stockService.deleteStockCodeCategory(cat.id)
              setCategoriesData(prev => prev.filter(c => c.id !== cat.id))
              setCategories(prev => prev.filter(n => n !== cat.stockName))
              setShowDeleteModal(false)
              return
            } catch (e) {
              alert('Kategori silme hatası')
              return
            }
          }
          await handleConfirmDelete()
        }}
        title={deleteModalData.item && !(deleteModalData.item as any).stockCode ? 'Kategori Sil' : (deleteModalData.type === 'single' ? 'Stok Kalemini Sil' : 'Toplu Silme')}
        message={
          deleteModalData.item && !(deleteModalData.item as any).stockCode
            ? `"${(deleteModalData.item as any).stockName}" kategorisini silmek istediğinize emin misiniz?`
            : (deleteModalData.type === 'single' && deleteModalData.item
              ? `"${deleteModalData.item.stockName}" (${deleteModalData.item.stockCode}) stok kalemini silmek istediğinizden emin misiniz?`
              : `Seçili olan ${deleteModalData.count} stok kalemini silmek istediğinizden emin misiniz? Bu işlem tüm sayfalardan seçili öğeleri silecektir.`)
        }
        itemCount={deleteModalData.count}
        loading={bulkDeleteLoading}
        progress={deleteProgress}
      />

      {/* Category Management Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-xl">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Kategori Yönetimi</h3>
              <button onClick={() => setShowCategoryModal(false)} className="text-gray-500 hover:text-gray-700">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kategori Adı</label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Örn: Hammadde"
                  />
                </div>
                {/* Kod alanı otomatik üretildiği için kaldırıldı */}
              </div>
              <div>
                <button
                  onClick={async () => {
                    if (!newCategoryName.trim()) return
                    try {
                      setCatLoading(true)
                      const created = await stockService.addStockCodeCategory(newCategoryName.trim())
                      setCategoriesData(prev => [created, ...prev])
                      setCategories(prev => Array.from(new Set([created.categoryName, ...prev])))
                      setNewCategoryName('')
                    } catch (e) {
                      alert('Kategori eklenemedi')
                    } finally {
                      setCatLoading(false)
                    }
                  }}
                  disabled={catLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {catLoading ? 'Ekleniyor...' : 'Ekle'}
                </button>
              </div>

              <div className="border rounded-md overflow-hidden dark:border-gray-700">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Ad</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Kod</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {categoriesData.map(cat => (
                      <tr key={cat.id}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{cat.categoryName}</td>
                        <td className="px-4 py-2 text-sm font-mono text-gray-700 dark:text-gray-200">{cat.categoryCode}</td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => setDeleteModalData({ type: 'single', item: undefined, count: 1 })}
                            className="hidden"
                          />
                          <button
                            onClick={() => setDeleteModalData({ type: 'bulk', count: 1 })}
                            className="hidden"
                          />
                          <button
                            onClick={() => {
                              setDeleteModalData({ type: 'single', item: { id: cat.id, stockName: cat.categoryName } as any, count: 1 })
                              setShowDeleteModal(true)
                            }}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                          >
                            Sil
                          </button>
                        </td>
                      </tr>
                    ))}
                    {categoriesData.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">Kategori yok</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button onClick={() => setShowCategoryModal(false)} className="px-4 py-2 border rounded-md">Kapat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockManagement;