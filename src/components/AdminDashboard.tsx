import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Video, DollarSign, Shield, BarChart3, AlertTriangle, TrendingUp, Eye, Settings, RefreshCw, CheckCircle, Clock, X, Download, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

/* Types et Interfaces */
interface Stats {
  totalUsers: number;
  totalCreators: number;
  totalBuyers: number;
  totalContent: number;
  totalMedia: number;
  totalRevenue: number;
  platformRevenue: number;
  pendingModeration: number;
}

interface MediaItem {
  id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  cloudflare_url: string;
  created_at: string;
  creator: {
    full_name: string;
    email: string;
  };
  moderation_status?: 'pending' | 'approved' | 'rejected';
}

interface ContentItem {
  id: string;
  title: string;
  description?: string;
  price: number;
  content_type: string;
  is_active: boolean;
  view_count: number;
  purchase_count: number;
  created_at: string;
  creator: {
    full_name: string;
    email: string;
  };
}

interface UserItem {
  id: string;
  email: string;
  full_name: string;
  role: string;
  email_verified: boolean;
  created_at: string;
}

/* Widget simple pour KPI */
const DashboardWidget: React.FC<{ 
  title: string; 
  value: number | string; 
  icon: React.ComponentType<any>;
  color: string;
}> = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white border border-gray-200 p-4 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <div className={`w-12 h-12 ${color} flex items-center justify-center`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

/* Vue d'ensemble du Dashboard */
const DashboardHome: React.FC<{ stats: Stats }> = ({ stats }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <DashboardWidget 
        title="Total Utilisateurs" 
        value={stats.totalUsers} 
        icon={Users}
        color="bg-blue-500"
      />
      <DashboardWidget 
        title="Contenus Actifs" 
        value={stats.totalContent} 
        icon={Video}
        color="bg-purple-500"
      />
      <DashboardWidget 
        title="Revenus Totaux" 
        value={`$${stats.totalRevenue.toFixed(2)}`} 
        icon={DollarSign}
        color="bg-green-500"
      />
      <DashboardWidget 
        title="En Attente" 
        value={stats.pendingModeration} 
        icon={AlertTriangle}
        color="bg-yellow-500"
      />
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <DashboardWidget 
        title="Créateurs" 
        value={stats.totalCreators} 
        icon={Users}
        color="bg-purple-500"
      />
      <DashboardWidget 
        title="Acheteurs" 
        value={stats.totalBuyers} 
        icon={Users}
        color="bg-blue-500"
      />
      <DashboardWidget 
        title="Commission (15%)" 
        value={`$${stats.platformRevenue.toFixed(2)}`} 
        icon={TrendingUp}
        color="bg-green-500"
      />
    </div>
  </div>
);

/* Section Modération des Médias */
const MediaModeration: React.FC = () => {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMediaItems = useCallback(async () => {
    try {
      setLoading(true);
      
      // Requête simplifiée avec limite stricte
      const { data: mediaData, error: mediaError } = await supabase
        .from('mediafile')
        .select('id, filename, file_size, mime_type, cloudflare_url, created_at, creator_id')
        .order('created_at', { ascending: false })
        .limit(20); // Réduction de la limite pour éviter les erreurs de stack

      if (mediaError) throw mediaError;

      if (!mediaData || mediaData.length === 0) {
        setMediaItems([]);
        return;
      }

      // Récupérer les créateurs séparément avec limite
      const creatorIds = [...new Set(mediaData.map(item => item.creator_id))].slice(0, 20);
      const { data: creators, error: creatorsError } = await supabase
        .from('profile')
        .select('id, full_name, email')
        .in('id', creatorIds)
        .limit(20);

      if (creatorsError) throw creatorsError;

      // Mapper les données
      const mediaWithCreators = mediaData.map(item => {
        const creator = creators?.find(c => c.id === item.creator_id) || 
                       { full_name: 'Inconnu', email: 'unknown' };
        return {
          ...item,
          creator: {
            full_name: creator.full_name,
            email: creator.email
          }
        };
      });

      setMediaItems(mediaWithCreators);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des médias:', error);
      toast.error('Erreur lors du chargement des médias');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMediaItems();
  }, [fetchMediaItems]);

  const handleDeleteMedia = async (id: string, filename: string) => {
    if (!confirm(`Supprimer le média "${filename}" ?`)) return;

    try {
      const { error } = await supabase
        .from('mediafile')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMediaItems(prev => prev.filter(item => item.id !== id));
      toast.success('Média supprimé avec succès');
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  if (loading) return <div className="p-4">Chargement des médias...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Modération des Médias</h3>
        <button
          onClick={fetchMediaItems}
          className="bg-blue-500 text-white px-4 py-2 border hover:bg-blue-600 transition-colors flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Actualiser</span>
        </button>
      </div>
      
      <div className="bg-white border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fichier</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Créateur</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Taille</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {mediaItems.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-gray-900 truncate max-w-xs">
                      {item.filename}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{item.creator.full_name}</p>
                    <p className="text-sm text-gray-500">{item.creator.email}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {(item.file_size / 1024 / 1024).toFixed(1)} MB
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(item.created_at).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => window.open(item.cloudflare_url, '_blank')}
                      className="p-1 text-blue-600 hover:bg-blue-50 border transition-colors"
                      title="Voir"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMedia(item.id, item.filename)}
                      className="p-1 text-red-600 hover:bg-red-50 border transition-colors"
                      title="Supprimer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* Section Gestion des Utilisateurs */
const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profile')
        .select('id, email, full_name, role, email_verified, created_at')
        .order('created_at', { ascending: false })
        .limit(50); // Limite réduite pour éviter les erreurs de stack

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDeleteUser = async (id: string, email: string) => {
    if (!confirm(`Supprimer l'utilisateur "${email}" ?`)) return;

    try {
      const { error } = await supabase
        .from('profile')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setUsers(prev => prev.filter(user => user.id !== id));
      toast.success('Utilisateur supprimé avec succès');
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  if (loading) return <div className="p-4">Chargement des utilisateurs...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Gestion des Utilisateurs</h3>
        <button
          onClick={fetchUsers}
          className="bg-blue-500 text-white px-4 py-2 border hover:bg-blue-600 transition-colors flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Actualiser</span>
        </button>
      </div>
      
      <div className="bg-white border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rôle</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inscription</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{user.full_name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs font-medium border ${
                    user.role === 'admin' 
                      ? 'bg-red-100 text-red-800 border-red-200'
                      : user.role === 'creator'
                      ? 'bg-purple-100 text-purple-800 border-purple-200'
                      : 'bg-blue-100 text-blue-800 border-blue-200'
                  }`}>
                    {user.role === 'admin' ? '👑 Admin' : user.role === 'creator' ? '🎨 Créateur' : '🛍️ Acheteur'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs font-medium border ${
                    user.email_verified 
                      ? 'bg-green-100 text-green-800 border-green-200'
                      : 'bg-red-100 text-red-800 border-red-200'
                  }`}>
                    {user.email_verified ? '✅ Vérifié' : '❌ Non vérifié'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDeleteUser(user.id, user.email)}
                    className="p-1 text-red-600 hover:bg-red-50 border transition-colors"
                    title="Supprimer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* Section Analyse Financière */
const FinanceAnalysis: React.FC = () => {
  const [financeData, setFinanceData] = useState({
    totalRevenue: 0,
    platformCommission: 0,
    creatorEarnings: 0,
    transactionCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinanceData = async () => {
      try {
        setLoading(true);
        
        // Limite stricte pour éviter les erreurs de stack
        const { data, error } = await supabase
          .from('purchase')
          .select('amount')
          .eq('status', 'completed')
          .limit(1000); // Limite pour éviter les erreurs de stack

        if (error) throw error;

        const totalRevenue = data?.reduce((acc, item) => acc + Number(item.amount), 0) || 0;
        const platformCommission = totalRevenue * 0.15;
        const creatorEarnings = totalRevenue * 0.85;

        setFinanceData({
          totalRevenue,
          platformCommission,
          creatorEarnings,
          transactionCount: data?.length || 0
        });
      } catch (error: any) {
        console.error('Erreur lors de la récupération des données financières:', error);
        toast.error('Erreur lors du chargement des données financières');
      } finally {
        setLoading(false);
      }
    };

    fetchFinanceData();
  }, []);

  if (loading) return <div className="p-4">Chargement des données financières...</div>;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Analyse Financière</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardWidget 
          title="Revenus Totaux" 
          value={`$${financeData.totalRevenue.toFixed(2)}`} 
          icon={DollarSign}
          color="bg-green-500"
        />
        <DashboardWidget 
          title="Commission Plateforme" 
          value={`$${financeData.platformCommission.toFixed(2)}`} 
          icon={TrendingUp}
          color="bg-blue-500"
        />
        <DashboardWidget 
          title="Gains Créateurs" 
          value={`$${financeData.creatorEarnings.toFixed(2)}`} 
          icon={Users}
          color="bg-purple-500"
        />
        <DashboardWidget 
          title="Transactions" 
          value={financeData.transactionCount} 
          icon={BarChart3}
          color="bg-orange-500"
        />
      </div>

      <div className="bg-white border border-gray-200 p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Répartition des Revenus</h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Revenus bruts:</span>
            <span className="font-semibold text-gray-900">${financeData.totalRevenue.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Commission plateforme (15%):</span>
            <span className="font-semibold text-blue-600">${financeData.platformCommission.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Revenus créateurs (85%):</span>
            <span className="font-semibold text-purple-600">${financeData.creatorEarnings.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="mt-6 flex space-x-4">
          <button className="bg-green-500 text-white px-4 py-2 border hover:bg-green-600 transition-colors flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Exporter CSV</span>
          </button>
          <button className="bg-red-500 text-white px-4 py-2 border hover:bg-red-600 transition-colors flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Exporter PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* Composant Principal */
export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'media' | 'users' | 'finance'>('home');
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalCreators: 0,
    totalBuyers: 0,
    totalContent: 0,
    totalMedia: 0,
    totalRevenue: 0,
    platformRevenue: 0,
    pendingModeration: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardStats = useCallback(async () => {
    try {
      setLoading(true);

      // Utiliser des requêtes count séparées pour éviter les erreurs de stack
      const [
        usersCountResult,
        creatorsCountResult,
        buyersCountResult,
        contentCountResult,
        mediaCountResult,
        purchasesResult
      ] = await Promise.all([
        // Count total users
        supabase
          .from('profile')
          .select('*', { count: 'exact', head: true }),
        
        // Count creators specifically
        supabase
          .from('profile')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'creator'),
        
        // Count buyers specifically
        supabase
          .from('profile')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'buyer'),
        
        // Count content
        supabase
          .from('ppvcontent')
          .select('*', { count: 'exact', head: true }),
        
        // Count media
        supabase
          .from('mediafile')
          .select('*', { count: 'exact', head: true }),
        
        // Get purchases with limit to avoid stack overflow
        supabase
          .from('purchase')
          .select('amount')
          .eq('status', 'completed')
          .limit(1000)
      ]);

      const totalUsers = usersCountResult.count || 0;
      const totalCreators = creatorsCountResult.count || 0;
      const totalBuyers = buyersCountResult.count || 0;
      const totalContent = contentCountResult.count || 0;
      const totalMedia = mediaCountResult.count || 0;
      const totalRevenue = purchasesResult.data?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;

      setStats({
        totalUsers,
        totalCreators,
        totalBuyers,
        totalContent,
        totalMedia,
        totalRevenue,
        platformRevenue: totalRevenue * 0.15,
        pendingModeration: 0,
      });
    } catch (error: any) {
      console.error('Erreur lors du chargement des statistiques:', error);
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* En-tête */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Administrateur</h2>
        <p className="text-gray-600">Gestion et supervision de la plateforme GoodyFans</p>
      </div>

      {/* Navigation par onglets */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { key: 'home', label: 'Vue d\'ensemble', icon: BarChart3 },
              { key: 'media', label: 'Médias', icon: Video },
              { key: 'users', label: 'Utilisateurs', icon: Users },
              { key: 'finance', label: 'Finances', icon: DollarSign },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Contenu des onglets */}
      <div className="bg-white border border-gray-200 p-6">
        {activeTab === 'home' && <DashboardHome stats={stats} />}
        {activeTab === 'media' && <MediaModeration />}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'finance' && <FinanceAnalysis />}
      </div>

      {/* Footer */}
      <div className="mt-6 text-right">
        <p className="text-xs text-gray-500">
          Dernière mise à jour : {new Date().toLocaleString('fr-FR')}
        </p>
      </div>
    </div>
  );
};