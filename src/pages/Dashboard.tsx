import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Package, TrendingUp, AlertTriangle, Factory } from 'lucide-react';

const Dashboard: React.FC = () => {
  const statsData = [
    { title: 'Toplam Stok Kalemi', value: '1,245', icon: Package, color: 'bg-blue-100 text-blue-700' },
    { title: 'Aktif Üretim', value: '8', icon: Factory, color: 'bg-green-100 text-green-700' },
    { title: 'Bugünkü Hareketler', value: '35', icon: TrendingUp, color: 'bg-purple-100 text-purple-700' },
    { title: 'Azalan Ürünler', value: '12', icon: AlertTriangle, color: 'bg-red-100 text-red-700' },
  ];

  const weeklyProduction = [
    { day: 'Pazartesi', uretim: 450 },
    { day: 'Salı', uretim: 520 },
    { day: 'Çarşamba', uretim: 480 },
    { day: 'Perşembe', uretim: 610 },
    { day: 'Cuma', uretim: 590 },
    { day: 'Cumartesi', uretim: 340 },
    { day: 'Pazar', uretim: 280 },
  ];

  const recentMovements = [
    { product: 'Zeytinyağı', movement: 'Giriş', amount: '500 L', time: '2 saat önce' },
    { product: 'Kostik Soda', movement: 'Çıkış', amount: '25 kg', time: '4 saat önce' },
    { product: 'Lavanta Yağı', movement: 'Giriş', amount: '5 L', time: '6 saat önce' },
    { product: 'Sabun Bazı', movement: 'Çıkış', amount: '100 kg', time: '8 saat önce' },
  ];

  const lowStockItems = [
    { name: 'Lavanta Yağı', current: 2, minimum: 10, unit: 'L' },
    { name: 'Kostik Soda', current: 15, minimum: 50, unit: 'kg' },
    { name: 'Sabun Kalıbı', current: 8, minimum: 20, unit: 'adet' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gösterge Paneli</h1>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Son güncelleme: {new Date().toLocaleString('tr-TR')}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-full ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Haftalık Üretim Trendi</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyProduction}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="uretim" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Üretim Eğilimi</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyProduction}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="uretim" stroke="#10B981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Son Stok Hareketleri</h3>
          <div className="space-y-3">
            {recentMovements.map((movement, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{movement.product}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{movement.movement} - {movement.amount}</p>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">{movement.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Azalan Stoklar</h3>
          <div className="space-y-3">
            {lowStockItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Mevcut: {item.current} {item.unit} / Minimum: {item.minimum} {item.unit}
                  </p>
                </div>
                <div className="w-16 bg-red-200 dark:bg-red-800 rounded-full h-2">
                  <div 
                    className="bg-red-600 dark:bg-red-400 h-2 rounded-full" 
                    style={{ width: `${(item.current / item.minimum) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;