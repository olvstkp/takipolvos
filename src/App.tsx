import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import StockManagement from './pages/StockManagement';
import StockMovements from './pages/StockMovements';
import SupplierManagement from './pages/SupplierManagement';
import RecipeManagement from './pages/RecipeManagement';
import ProductionRecords from './pages/ProductionRecords';
import SoapBaseProduction from './pages/SoapBaseProduction';
import OilTanks from './pages/OilTanks';
import Proforma from './pages/Proforma';
import Orders from './pages/Orders';
import Products from './pages/Products';
import CustomerManagement from './pages/CustomerManagement';
import LabelGenerator from './pages/LabelGenerator';
import Settings from './pages/Settings';
import LabelSettings from './pages/LabelSettings';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/stock" element={<StockManagement />} />
          <Route path="/movements" element={<StockMovements />} />
          <Route path="/suppliers" element={<SupplierManagement />} />
          <Route path="/recipes" element={<RecipeManagement />} />
          <Route path="/production" element={<ProductionRecords />} />
          <Route path="/soap-base" element={<SoapBaseProduction />} />
          <Route path="/oil-tanks" element={<OilTanks />} />
          <Route path="/proforma" element={<Proforma />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/products" element={<Products />} />
          <Route path="/customers" element={<CustomerManagement />} />
          <Route path="/labels" element={<LabelGenerator />} />
          <Route path="/label-settings" element={<LabelSettings />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
          loading: {
            iconTheme: {
              primary: '#3B82F6',
              secondary: '#fff',
            },
          },
        }}
      />
      </Router>
    </ErrorBoundary>
  );
}

export default App;