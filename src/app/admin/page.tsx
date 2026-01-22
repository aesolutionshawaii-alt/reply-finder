'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap,
  Users,
  Mail,
  Settings,
  BarChart3,
  DollarSign,
  UserPlus,
  Search,
  Trash2,
  Crown,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  AlertCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

interface Stats {
  totalUsers: number;
  proUsers: number;
  freeUsers: number;
  mrr: number;
  recentSignups: number;
  byStatus: {
    active: number;
    canceled: number;
    past_due: number;
  };
}

interface User {
  id: number;
  email: string;
  plan: 'free' | 'pro';
  status: 'active' | 'canceled' | 'past_due';
  accountsCount: number;
  profileComplete: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UserDetails {
  id: number;
  email: string;
  plan: 'free' | 'pro';
  status: 'active' | 'canceled' | 'past_due';
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  deliveryHourUtc: number;
  createdAt: string;
  updatedAt: string;
  profile: {
    displayName: string;
    bio: string;
    expertise: string;
    tone: string;
  } | null;
  accounts: string[];
}

interface EmailLog {
  id: number;
  userId: number;
  userEmail: string;
  sentAt: string;
  opportunitiesCount: number;
  status: string;
}

interface CronRun {
  id: number;
  started_at: string;
  completed_at: string | null;
  hour_utc: number;
  users_triggered: number;
  users_sent: number;
  users_failed: number;
  users_skipped: number;
  status: 'running' | 'completed' | 'failed';
  error: string | null;
}

type Tab = 'overview' | 'users' | 'emails' | 'cron' | 'management';

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Data states
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [cronRuns, setCronRuns] = useState<CronRun[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);

  // Management states
  const [grantProEmail, setGrantProEmail] = useState('');
  const [grantProLoading, setGrantProLoading] = useState(false);

  // Confirm delete modal
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; email: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Auto-dismiss success messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Initial auth check and data load
  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      // Check if user is authenticated and admin
      const statsResponse = await fetch('/api/admin-dashboard/stats');
      if (statsResponse.status === 401) {
        router.push('/dashboard');
        return;
      }
      if (statsResponse.status === 403) {
        router.push('/dashboard');
        return;
      }
      if (!statsResponse.ok) {
        throw new Error('Failed to load admin data');
      }

      const statsData = await statsResponse.json();
      setStats(statsData);
      setLoading(false);
    } catch (err) {
      console.error('Admin load error:', err);
      setError('Failed to load admin dashboard');
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin-dashboard/users');
      if (!response.ok) throw new Error('Failed to load users');
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      console.error('Load users error:', err);
      setError('Failed to load users');
    }
  };

  const loadEmails = async () => {
    try {
      const response = await fetch('/api/admin-dashboard/emails?limit=100');
      if (!response.ok) throw new Error('Failed to load emails');
      const data = await response.json();
      setEmails(data);
    } catch (err) {
      console.error('Load emails error:', err);
      setError('Failed to load emails');
    }
  };

  const loadCronRuns = async () => {
    try {
      const response = await fetch('/api/admin-dashboard/cron?limit=20');
      if (!response.ok) throw new Error('Failed to load cron runs');
      const data = await response.json();
      setCronRuns(data);
    } catch (err) {
      console.error('Load cron runs error:', err);
      setError('Failed to load cron runs');
    }
  };

  const loadUserDetails = async (userId: number) => {
    setLoadingUserDetails(true);
    try {
      const response = await fetch(`/api/admin-dashboard/user/${userId}`);
      if (!response.ok) throw new Error('Failed to load user details');
      const data = await response.json();
      setUserDetails(data);
    } catch (err) {
      console.error('Load user details error:', err);
      setError('Failed to load user details');
    } finally {
      setLoadingUserDetails(false);
    }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setError('');
    setSuccess('');

    if (tab === 'users' && users.length === 0) {
      loadUsers();
    }
    if (tab === 'emails' && emails.length === 0) {
      loadEmails();
    }
    if (tab === 'cron' && cronRuns.length === 0) {
      loadCronRuns();
    }
  };

  const handleExpandUser = async (userId: number) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      setUserDetails(null);
    } else {
      setExpandedUserId(userId);
      await loadUserDetails(userId);
    }
  };

  const handleUpgradeToPro = async (userId: number) => {
    try {
      const response = await fetch(`/api/admin-dashboard/user/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'pro', status: 'active' }),
      });
      if (!response.ok) throw new Error('Failed to upgrade user');
      setSuccess('User upgraded to Pro');
      await loadUsers();
      if (expandedUserId === userId) {
        await loadUserDetails(userId);
      }
      // Refresh stats
      checkAuthAndLoadData();
    } catch (err) {
      console.error('Upgrade error:', err);
      setError('Failed to upgrade user');
    }
  };

  const handleDowngradeToFree = async (userId: number) => {
    try {
      const response = await fetch(`/api/admin-dashboard/user/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'free' }),
      });
      if (!response.ok) throw new Error('Failed to downgrade user');
      setSuccess('User downgraded to Free');
      await loadUsers();
      if (expandedUserId === userId) {
        await loadUserDetails(userId);
      }
      checkAuthAndLoadData();
    } catch (err) {
      console.error('Downgrade error:', err);
      setError('Failed to downgrade user');
    }
  };

  const handleCancelSubscription = async (userId: number) => {
    try {
      const response = await fetch(`/api/admin-dashboard/user/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'canceled' }),
      });
      if (!response.ok) throw new Error('Failed to cancel subscription');
      setSuccess('Subscription canceled');
      await loadUsers();
      if (expandedUserId === userId) {
        await loadUserDetails(userId);
      }
      checkAuthAndLoadData();
    } catch (err) {
      console.error('Cancel error:', err);
      setError('Failed to cancel subscription');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/admin-dashboard/user/${deleteConfirm.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete user');
      setSuccess(`User ${deleteConfirm.email} deleted`);
      setDeleteConfirm(null);
      setExpandedUserId(null);
      setUserDetails(null);
      await loadUsers();
      checkAuthAndLoadData();
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete user');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleGrantPro = async () => {
    if (!grantProEmail.trim()) return;
    setGrantProLoading(true);
    try {
      // First find the user
      const usersResponse = await fetch('/api/admin-dashboard/users');
      if (!usersResponse.ok) throw new Error('Failed to fetch users');
      const allUsers = await usersResponse.json();
      const user = allUsers.find((u: User) => u.email.toLowerCase() === grantProEmail.toLowerCase().trim());

      if (!user) {
        setError('User not found');
        setGrantProLoading(false);
        return;
      }

      await handleUpgradeToPro(user.id);
      setGrantProEmail('');
      setSuccess(`Granted Pro to ${user.email}`);
    } catch (err) {
      console.error('Grant Pro error:', err);
      setError('Failed to grant Pro');
    } finally {
      setGrantProLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-gray-500">Loading admin dashboard...</div>
      </main>
    );
  }

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview', icon: BarChart3 },
    { id: 'users' as Tab, label: 'Users', icon: Users },
    { id: 'emails' as Tab, label: 'Emails', icon: Mail },
    { id: 'cron' as Tab, label: 'Cron History', icon: Clock },
    { id: 'management' as Tab, label: 'Management', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-white/5 border-r border-white/10 flex flex-col">
        <div className="p-4 border-b border-white/10">
          <a href="/" className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            <span className="font-semibold text-lg">XeroScroll</span>
          </a>
          <div className="mt-2 px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded inline-block">
            Admin
          </div>
        </div>

        <nav className="flex-1 p-3">
          <div className="text-xs text-gray-500 uppercase tracking-wider px-3 mb-2">Admin</div>
          <ul className="space-y-1">
            {tabs.map((tab) => (
              <li key={tab.id}>
                <button
                  onClick={() => handleTabChange(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-white/10">
          <a href="/dashboard" className="text-sm text-gray-500 hover:text-white transition-colors">
            ← Back to Dashboard
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 min-h-screen p-8">
        {/* Status messages */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
            <button onClick={() => setError('')} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <Check className="w-4 h-4" />
            {success}
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div>
            <h1 className="text-2xl font-semibold mb-6">Overview</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="bg-white/5 border-white/10 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.totalUsers}</div>
                    <div className="text-sm text-gray-400">Total Users</div>
                  </div>
                </div>
              </Card>

              <Card className="bg-white/5 border-white/10 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.proUsers}</div>
                    <div className="text-sm text-gray-400">Pro Users</div>
                  </div>
                </div>
              </Card>

              <Card className="bg-white/5 border-white/10 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">${stats.mrr}</div>
                    <div className="text-sm text-gray-400">MRR</div>
                  </div>
                </div>
              </Card>

              <Card className="bg-white/5 border-white/10 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <UserPlus className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.recentSignups}</div>
                    <div className="text-sm text-gray-400">Last 7 Days</div>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-white/5 border-white/10 p-6">
                <h3 className="font-medium mb-4">Users by Plan</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Free</span>
                    <span className="font-medium">{stats.freeUsers}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="bg-gray-500 h-2 rounded-full"
                      style={{ width: `${(stats.freeUsers / stats.totalUsers) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Pro</span>
                    <span className="font-medium">{stats.proUsers}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{ width: `${(stats.proUsers / stats.totalUsers) * 100}%` }}
                    />
                  </div>
                </div>
              </Card>

              <Card className="bg-white/5 border-white/10 p-6">
                <h3 className="font-medium mb-4">Users by Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-green-400">Active</span>
                    <span className="font-medium">{stats.byStatus.active}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Canceled</span>
                    <span className="font-medium">{stats.byStatus.canceled}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-red-400">Past Due</span>
                    <span className="font-medium">{stats.byStatus.past_due}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-semibold">Users</h1>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by email..."
                  className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 w-64"
                />
              </div>
            </div>

            <Card className="bg-white/5 border-white/10 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Email</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Plan</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Status</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Accounts</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Profile</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Created</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <>
                      <tr
                        key={user.id}
                        className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                        onClick={() => handleExpandUser(user.id)}
                      >
                        <td className="px-4 py-3 text-sm">{user.email}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded ${
                            user.plan === 'pro'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {user.plan}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded ${
                            user.status === 'active'
                              ? 'bg-green-500/20 text-green-400'
                              : user.status === 'past_due'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">{user.accountsCount}</td>
                        <td className="px-4 py-3">
                          {user.profileComplete ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <X className="w-4 h-4 text-gray-500" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          {expandedUserId === user.id ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                        </td>
                      </tr>
                      {expandedUserId === user.id && (
                        <tr key={`${user.id}-details`}>
                          <td colSpan={7} className="bg-white/5 px-4 py-4">
                            {loadingUserDetails ? (
                              <div className="text-gray-500">Loading...</div>
                            ) : userDetails ? (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <div className="text-gray-500 mb-1">Stripe Customer</div>
                                    <div className="font-mono text-xs">
                                      {userDetails.stripeCustomerId || 'None'}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500 mb-1">Delivery Hour (UTC)</div>
                                    <div>{userDetails.deliveryHourUtc}:00</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500 mb-1">Monitored Accounts</div>
                                    <div>{userDetails.accounts.join(', ') || 'None'}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500 mb-1">Profile</div>
                                    <div>
                                      {userDetails.profile
                                        ? `${userDetails.profile.displayName || 'No name'} - ${userDetails.profile.tone || 'No tone'}`
                                        : 'Not set up'}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                  {user.plan === 'free' ? (
                                    <Button
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpgradeToPro(user.id);
                                      }}
                                      className="bg-yellow-500 text-black hover:bg-yellow-400"
                                    >
                                      <Crown className="w-3 h-3 mr-1" />
                                      Upgrade to Pro
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDowngradeToFree(user.id);
                                      }}
                                    >
                                      Downgrade to Free
                                    </Button>
                                  )}
                                  {user.status === 'active' && user.plan === 'pro' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCancelSubscription(user.id);
                                      }}
                                    >
                                      Cancel Subscription
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteConfirm({ id: user.id, email: user.email });
                                    }}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery ? 'No users match your search' : 'No users found'}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Emails Tab */}
        {activeTab === 'emails' && (
          <div>
            <h1 className="text-2xl font-semibold mb-6">Email Logs</h1>

            <Card className="bg-white/5 border-white/10 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">User</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Sent At</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Opportunities</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {emails.map((email) => (
                    <tr key={email.id} className="border-b border-white/5">
                      <td className="px-4 py-3 text-sm">{email.userEmail}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{formatDate(email.sentAt)}</td>
                      <td className="px-4 py-3 text-sm">{email.opportunitiesCount}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded ${
                          email.status === 'sent'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {email.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {emails.length === 0 && (
                <div className="text-center py-8 text-gray-500">No email logs found</div>
              )}
            </Card>
          </div>
        )}

        {/* Cron History Tab */}
        {activeTab === 'cron' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-semibold">Cron History</h1>
              <Button
                variant="outline"
                size="sm"
                onClick={loadCronRuns}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>

            <Card className="bg-white/5 border-white/10 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Started</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Hour (UTC)</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Status</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Triggered</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Sent</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Failed</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Skipped</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {cronRuns.map((run) => {
                    const startedAt = new Date(run.started_at);
                    const completedAt = run.completed_at ? new Date(run.completed_at) : null;
                    const duration = completedAt
                      ? Math.round((completedAt.getTime() - startedAt.getTime()) / 1000)
                      : null;

                    return (
                      <tr key={run.id} className="border-b border-white/5">
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {formatDate(run.started_at)}
                        </td>
                        <td className="px-4 py-3 text-sm">{run.hour_utc}:00</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded ${
                            run.status === 'completed'
                              ? 'bg-green-500/20 text-green-400'
                              : run.status === 'running'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {run.status}
                          </span>
                          {run.error && (
                            <div className="mt-1 text-xs text-red-400 max-w-xs truncate" title={run.error}>
                              {run.error}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">{run.users_triggered}</td>
                        <td className="px-4 py-3 text-sm text-green-400">{run.users_sent}</td>
                        <td className="px-4 py-3 text-sm text-red-400">{run.users_failed}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{run.users_skipped}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {duration !== null ? `${duration}s` : run.status === 'running' ? '...' : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {cronRuns.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No cron runs recorded yet. Runs will appear here after the first cron execution.
                </div>
              )}
            </Card>

            <div className="mt-6 text-sm text-gray-500">
              <p>Cron runs are triggered hourly via Inngest. Each run:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Finds users whose delivery_hour_utc matches the current hour</li>
                <li>Sends digest events for each user</li>
                <li>Waits 3 minutes for processing</li>
                <li>Aggregates results and sends admin email</li>
              </ul>
            </div>
          </div>
        )}

        {/* Management Tab */}
        {activeTab === 'management' && (
          <div>
            <h1 className="text-2xl font-semibold mb-6">Management</h1>

            <div className="space-y-6">
              <Card className="bg-white/5 border-white/10 p-6">
                <h3 className="font-medium mb-4">Grant Pro to User</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Enter an email address to grant them Pro access without requiring payment.
                </p>
                <div className="flex gap-3">
                  <input
                    type="email"
                    value={grantProEmail}
                    onChange={(e) => setGrantProEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                  <Button
                    onClick={handleGrantPro}
                    disabled={grantProLoading || !grantProEmail.trim()}
                    className="bg-yellow-500 text-black hover:bg-yellow-400"
                  >
                    {grantProLoading ? 'Granting...' : 'Grant Pro'}
                  </Button>
                </div>
              </Card>

              <Card className="bg-white/5 border-white/10 p-6">
                <h3 className="font-medium mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      loadUsers();
                      checkAuthAndLoadData();
                      setSuccess('Data refreshed');
                    }}
                  >
                    Refresh All Data
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <Card className="bg-gray-900 border-white/10 p-6 max-w-md w-full mx-4">
            <h3 className="font-medium text-lg mb-2">Delete User</h3>
            <p className="text-gray-400 mb-4">
              Are you sure you want to delete <span className="text-white">{deleteConfirm.email}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(null)}
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteUser}
                disabled={deleteLoading}
                className="bg-red-500 text-white hover:bg-red-600"
              >
                {deleteLoading ? 'Deleting...' : 'Delete User'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
