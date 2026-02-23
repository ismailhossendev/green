import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect, createContext, useContext } from 'react';
import './index.css';

// Layouts
import Layout from './components/layout/Layout';

// Pages
import Login from './features/auth/Login';
import Dashboard from './features/dashboard/Dashboard';
import ProductList from './features/inventory/ProductList';
import CustomerList from './features/customers/CustomerList';
import InvoiceCreate from './features/sales/InvoiceCreate';
import InvoiceList from './features/sales/InvoiceList';
import PurchaseList from './features/purchase/PurchaseList';
import SupplierList from './features/suppliers/SupplierList';
import LedgerView from './features/ledger/LedgerView';
import ExpenseList from './features/expenses/ExpenseList';
import EmployeeList from './features/hrm/EmployeeList';
import Attendance from './features/hrm/Attendance';
import ReplacementList from './features/replacement/ReplacementList';
import Reports from './features/reports/Reports';
import StockSummary from './features/reports/StockSummary';

// Create Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Auth Context
export const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Brand Context
export const BrandContext = createContext(null);

export const useBrand = () => {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand must be used within BrandProvider');
  }
  return context;
};

// Protected Route
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentBrand, setCurrentBrand] = useState('Green Tel');

  useEffect(() => {
    // Check for existing token
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const authValue = { user, loading, login, logout };
  const brandValue = { currentBrand, setCurrentBrand };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <BrandContext.Provider value={brandValue}>
          <Router>
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: '#1E293B',
                  color: '#F8FAFC',
                  border: '1px solid #334155'
                },
                success: {
                  iconTheme: { primary: '#10B981', secondary: '#1E293B' }
                },
                error: {
                  iconTheme: { primary: '#EF4444', secondary: '#1E293B' }
                }
              }}
            />

            <Routes>
              <Route path="/login" element={<Login />} />

              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="inventory" element={<ProductList />} />
                <Route path="customers" element={<CustomerList />} />
                <Route path="sales" element={<InvoiceList />} />
                <Route path="sales/new" element={<InvoiceCreate />} />
                <Route path="purchase" element={<PurchaseList />} />
                <Route path="suppliers" element={<SupplierList />} />
                <Route path="ledger" element={<LedgerView />} />
                <Route path="expenses" element={<ExpenseList />} />
                <Route path="hrm" element={<EmployeeList />} />
                <Route path="attendance" element={<Attendance />} />
                <Route path="replacement" element={<ReplacementList />} />
                <Route path="reports" element={<Reports />} />
                <Route path="stock-summary" element={<StockSummary />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </BrandContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

export default App;
