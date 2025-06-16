import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { SimpleErrorBoundary } from './components/SimpleErrorBoundary';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { EmailConfirmationPage } from './pages/EmailConfirmationPage';
import { EmailConfirmedPage } from './pages/EmailConfirmedPage';
import { DashboardPage } from './pages/DashboardPage';
import { ContentPage } from './pages/ContentPage';
import { MediaPage } from './pages/MediaPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AccountPage } from './pages/AccountPage';
import { TermsPage } from './pages/TermsPage';
import { PurchasePage } from './pages/PurchasePage';
import { AccessPage } from './pages/AccessPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { ChatbotAssistant } from './components/ChatbotAssistant';

function App() {
  console.log('🎯 App component rendering...');
  
  return (
    <SimpleErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50">
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/email-confirmation" element={<EmailConfirmationPage />} />
              <Route path="/email-confirmed" element={<EmailConfirmedPage />} />
              <Route path="/terms" element={<TermsPage />} />
              
              {/* Guest checkout routes */}
              <Route path="/buy/:contentId" element={<PurchasePage />} />
              <Route path="/access/:contentId" element={<AccessPage />} />
              
              {/* Protected routes - All users */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Layout>
                    <DashboardPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/account" element={
                <ProtectedRoute>
                  <Layout>
                    <AccountPage />
                  </Layout>
                </ProtectedRoute>
              } />

              {/* Admin routes */}
              <Route path="/admin" element={
                <ProtectedRoute requiredRole="admin">
                  <Layout>
                    <DashboardPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* Creator-only routes */}
              <Route path="/content" element={
                <ProtectedRoute requiredRole="creator">
                  <Layout>
                    <ContentPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/media" element={
                <ProtectedRoute requiredRole="creator">
                  <Layout>
                    <MediaPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/analytics" element={
                <ProtectedRoute requiredRole="creator">
                  <Layout>
                    <AnalyticsPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* Buyer-only routes */}
              <Route path="/purchases" element={
                <ProtectedRoute requiredRole="buyer">
                  <Layout>
                    <PurchasesPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            
            {/* Admin Chatbot Assistant */}
            <ChatbotAssistant />
            
            <Toaster 
              position="bottom-left"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#ffffff',
                  color: '#374151',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                },
              }}
            />
          </div>
        </Router>
      </AuthProvider>
    </SimpleErrorBoundary>
  );
}

export default App;