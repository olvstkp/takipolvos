import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Eye, Edit, Trash2, Package, Calendar, User, MapPin, DollarSign, Download, Mail, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Order {
  id: string;
  order_number: string;
  order_date: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  country: string;
  additional_message?: string;
  total_items: number;
  estimated_value: number;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Order>>({});

  const statusOptions = [
    { value: 'all', label: 'Tümü' },
    { value: 'pending', label: 'Beklemede' },
    { value: 'confirmed', label: 'Onaylandı' },
    { value: 'processing', label: 'İşleniyor' },
    { value: 'shipped', label: 'Kargoda' },
    { value: 'delivered', label: 'Teslim Edildi' },
    { value: 'cancelled', label: 'İptal Edildi' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'confirmed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'processing': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'shipped': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'delivered': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Orders fetch error:', ordersError);
        throw new Error('Siparişler yüklenirken hata oluştu: ' + ordersError.message);
      }

      setOrders(ordersData || []);

    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Siparişler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderItems = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          *,
          products(name)
        `)
        .eq('order_id', orderId);

      if (error) {
        console.error('Order items fetch error:', error);
        return [];
      }

      return data?.map(item => ({
        ...item,
        product_name: item.products?.name
      })) || [];
    } catch (error) {
      console.error('Error fetching order items:', error);
      return [];
    }
  };

  const handleViewDetails = async (order: Order) => {
    setSelectedOrder(order);
    const items = await fetchOrderItems(order.id);
    setOrderItems(items);
    setShowDetailModal(true);
  };

  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order);
    setEditFormData({
      company_name: order.company_name,
      contact_person: order.contact_person,
      email: order.email,
      phone: order.phone,
      country: order.country,
      additional_message: order.additional_message,
      total_items: order.total_items,
      estimated_value: order.estimated_value,
      currency: order.currency,
      status: order.status
    });
    setShowEditModal(true);
  };

  const handleDeleteOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowDeleteModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedOrder) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update(editFormData)
        .eq('id', selectedOrder.id);

      if (error) {
        throw error;
      }

      toast.success('Sipariş başarıyla güncellendi');
      setShowEditModal(false);
      fetchOrders(); // Listeyi yenile
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Sipariş güncellenirken hata oluştu');
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedOrder) return;

    try {
      // First delete order items
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', selectedOrder.id);

      if (itemsError) {
        throw itemsError;
      }

      // Then delete the order
      const { error: orderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', selectedOrder.id);

      if (orderError) {
        throw orderError;
      }

      toast.success('Sipariş başarıyla silindi');
      setShowDeleteModal(false);
      fetchOrders(); // Listeyi yenile
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error('Sipariş silinirken hata oluştu');
    }
  };

  const handleDownloadPDF = async (order: Order) => {
    try {
      // Order items'ları al
      const items = await fetchOrderItems(order.id);
      
      // PDF oluştur
      const pdf = new jsPDF();
      
      // Başlık
      pdf.setFontSize(20);
      pdf.text('SİPARİŞ DETAYI', 20, 20);
      
      // Sipariş bilgileri
      pdf.setFontSize(12);
      pdf.text(`Sipariş No: ${order.order_number}`, 20, 40);
      pdf.text(`Tarih: ${new Date(order.order_date).toLocaleDateString('tr-TR')}`, 20, 50);
      pdf.text(`Durum: ${statusOptions.find(s => s.value === order.status)?.label || order.status}`, 20, 60);
      
      // Müşteri bilgileri
      pdf.text('Müşteri Bilgileri:', 20, 80);
      pdf.text(`Şirket: ${order.company_name}`, 20, 90);
      pdf.text(`Kişi: ${order.contact_person}`, 20, 100);
      pdf.text(`E-posta: ${order.email}`, 20, 110);
      pdf.text(`Telefon: ${order.phone}`, 20, 120);
      pdf.text(`Ülke: ${order.country}`, 20, 130);
      
      if (order.additional_message) {
        pdf.text(`Mesaj: ${order.additional_message}`, 20, 140);
      }
      
      // Sipariş kalemleri tablosu
      const tableData = items.map(item => [
        item.product_name || 'Bilinmiyor',
        item.quantity.toString(),
        `${order.currency} ${item.unit_price.toFixed(2)}`,
        `${order.currency} ${item.total_price.toFixed(2)}`
      ]);
      
      autoTable(pdf, {
        startY: order.additional_message ? 160 : 150,
        head: [['Ürün', 'Miktar', 'Birim Fiyat', 'Toplam']],
        body: tableData,
        theme: 'grid',
        styles: {
          fontSize: 10,
          cellPadding: 5,
        },
        headStyles: {
          fillColor: [66, 139, 202],
        },
      });
      
      // Toplam
      const finalY = (pdf as any).lastAutoTable.finalY + 20;
      pdf.setFontSize(14);
      pdf.text(`Toplam Kalem: ${order.total_items}`, 20, finalY);
      pdf.text(`Tahmini Değer: ${order.currency} ${order.estimated_value.toFixed(2)}`, 20, finalY + 10);
      
      // PDF'i indir
      pdf.save(`siparis-${order.order_number}.pdf`);
      toast.success('PDF başarıyla indirildi');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    }
  };

  const sendOrderNotification = async (order: Order) => {
    try {
      // Supabase Edge Function'a istek gönder
      const { data, error } = await supabase.functions.invoke('send-order-notification', {
        body: {
          order_number: order.order_number,
          company_name: order.company_name,
          contact_person: order.contact_person,
          email: order.email,
          phone: order.phone,
          country: order.country,
          estimated_value: order.estimated_value,
          currency: order.currency,
          total_items: order.total_items,
          order_date: order.order_date,
          additional_message: order.additional_message
        }
      });

      if (error) {
        throw error;
      }

      toast.success('Email bildirimi gönderildi');
    } catch (error) {
      console.error('Error sending email notification:', error);
      toast.error('Email gönderilirken hata oluştu');
    }
  };

  useEffect(() => {
    fetchOrders();

    // Yeni siparişler için real-time subscription
    const subscription = supabase
      .channel('orders_changes')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'orders' 
        }, 
        (payload) => {
          console.log('New order detected:', payload.new);
          // Yeni sipariş geldiğinde email gönder
          if (payload.new) {
            sendOrderNotification(payload.new as Order);
          }
          // Listeyi yenile
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.country.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Siparişler</h1>
        <button
          onClick={() => {/* TODO: Add new order functionality */}}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Yeni Sipariş</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Sipariş no, şirket, kişi veya ülke ile ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Email System Status */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3" />
            <div>
              <h3 className="font-semibold text-blue-800 dark:text-blue-200">Email Bildirimi</h3>
              <p className="text-sm text-blue-600 dark:text-blue-300">
                Yeni siparişler için otomatik email bildirimi aktif
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs rounded-full">
              Real-time Aktif
            </span>
            <AlertCircle className="w-4 h-4 text-amber-500" title="Database trigger kurulmamış" />
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Package className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Toplam Sipariş</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{orders.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Bu Ay</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {orders.filter(order => {
                  const orderDate = new Date(order.order_date);
                  const now = new Date();
                  return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
                }).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Toplam Değer</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${orders.reduce((sum, order) => sum + order.estimated_value, 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <User className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Bekleyen</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {orders.filter(order => ['pending', 'confirmed', 'processing'].includes(order.status)).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Sipariş No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Şirket / Kişi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Ülke
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Tahmini Değer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {order.order_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <div>
                      <div className="font-medium">{order.company_name}</div>
                      <div className="text-gray-500 dark:text-gray-400">{order.contact_person}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {order.country}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {new Date(order.order_date).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {order.currency} {order.estimated_value.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                      {statusOptions.find(s => s.value === order.status)?.label || order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewDetails(order)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Detayları Görüntüle"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(order)}
                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                        title="PDF İndir"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditOrder(order)}
                        className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                        title="Düzenle"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteOrder(order)}
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
        
        {filteredOrders.length === 0 && (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Sipariş bulunamadı</p>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Sipariş Detayı - {selectedOrder.order_number}
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDownloadPDF(selectedOrder)}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md flex items-center space-x-1"
                    title="PDF İndir"
                  >
                    <Download className="w-4 h-4" />
                    <span>PDF</span>
                  </button>
                  <button
                    onClick={() => sendOrderNotification(selectedOrder)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                    title="Email Gönder"
                  >
                    Email
                  </button>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {/* Order Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sipariş Bilgileri</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Sipariş No:</span> {selectedOrder.order_number}</p>
                    <p><span className="font-medium">Tarih:</span> {new Date(selectedOrder.order_date).toLocaleDateString('tr-TR')}</p>
                    <p><span className="font-medium">Durum:</span> 
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedOrder.status)}`}>
                        {statusOptions.find(s => s.value === selectedOrder.status)?.label || selectedOrder.status}
                      </span>
                    </p>
                    <p><span className="font-medium">Toplam Kalem:</span> {selectedOrder.total_items}</p>
                    <p><span className="font-medium">Tahmini Değer:</span> {selectedOrder.currency} {selectedOrder.estimated_value.toFixed(2)}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">İletişim Bilgileri</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Şirket:</span> {selectedOrder.company_name}</p>
                    <p><span className="font-medium">Kişi:</span> {selectedOrder.contact_person}</p>
                    <p><span className="font-medium">E-posta:</span> {selectedOrder.email}</p>
                    <p><span className="font-medium">Telefon:</span> {selectedOrder.phone}</p>
                    <p><span className="font-medium">Ülke:</span> {selectedOrder.country}</p>
                    {selectedOrder.additional_message && (
                      <p><span className="font-medium">Mesaj:</span> {selectedOrder.additional_message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sipariş Kalemleri</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Ürün</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Miktar</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Birim Fiyat</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Toplam</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {orderItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                            {item.product_name || 'Bilinmiyor'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">${item.unit_price.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">${item.total_price.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {orderItems.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-gray-500 dark:text-gray-400">Bu siparişe ait kalem bulunamadı</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {showEditModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Sipariş Düzenle - {selectedOrder.order_number}
                </h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Şirket Adı
                  </label>
                  <input
                    type="text"
                    value={editFormData.company_name || ''}
                    onChange={(e) => setEditFormData({...editFormData, company_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    İletişim Kişisi
                  </label>
                  <input
                    type="text"
                    value={editFormData.contact_person || ''}
                    onChange={(e) => setEditFormData({...editFormData, contact_person: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    E-posta
                  </label>
                  <input
                    type="email"
                    value={editFormData.email || ''}
                    onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Telefon
                  </label>
                  <input
                    type="text"
                    value={editFormData.phone || ''}
                    onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ülke
                  </label>
                  <input
                    type="text"
                    value={editFormData.country || ''}
                    onChange={(e) => setEditFormData({...editFormData, country: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Durum
                  </label>
                  <select
                    value={editFormData.status || ''}
                    onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {statusOptions.filter(option => option.value !== 'all').map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Toplam Kalem
                  </label>
                  <input
                    type="number"
                    value={editFormData.total_items || 0}
                    onChange={(e) => setEditFormData({...editFormData, total_items: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tahmini Değer
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.estimated_value || 0}
                    onChange={(e) => setEditFormData({...editFormData, estimated_value: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Para Birimi
                  </label>
                  <select
                    value={editFormData.currency || ''}
                    onChange={(e) => setEditFormData({...editFormData, currency: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="TL">TL</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ek Mesaj
                </label>
                <textarea
                  value={editFormData.additional_message || ''}
                  onChange={(e) => setEditFormData({...editFormData, additional_message: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md"
              >
                İptal
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mr-4">
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Siparişi Sil
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                <strong>{selectedOrder.order_number}</strong> numaralı siparişi silmek istediğinizden emin misiniz? 
                Bu işlem geri alınamaz ve sipariş kalemleri de silinecektir.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md"
                >
                  İptal
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
                >
                  Sil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
