import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import StockManagement from './pages/StockManagement';
import StockMovements from './pages/StockMovements';
import SupplierManagement from './pages/SupplierManagement';
import RecipeManagement from './pages/RecipeManagement';
import ProductionRecords from './pages/ProductionRecords';
import SoapBaseProduction from './pages/SoapBaseProduction';
import OilTanks from './pages/OilTanks';
import ProformaGenerator from './pages/ProformaGenerator';
import Products from './pages/Products';
import LabelGenerator from './pages/LabelGenerator';
import Settings from './pages/Settings';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/stock" element={<StockManagement />} />
          <Route path="/movements" element={<StockMovements />} />
          <Route path="/suppliers" element={<SupplierManagement />} />
          <Route path="/recipes" element={<RecipeManagement />} />
          <Route path="/production" element={<ProductionRecords />} />
          <Route path="/soap-base" element={<SoapBaseProduction />} />
          <Route path="/oil-tanks" element={<OilTanks />} />
          <Route path="/proforma" element={<ProformaGenerator />} />
          <Route path="/products" element={<Products />} />
          <Route path="/labels" element={<LabelGenerator />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;