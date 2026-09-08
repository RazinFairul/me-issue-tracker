import React, { useEffect, useState, useCallback } from 'react';
import './App.css';
import { supabase } from './supabaseClient';
import LandingPage from './components/LandingPage';
import Auth from './components/Auth';
import CreateIssue from './components/CreateIssue';
import IssueList from './components/IssueList';
import TagMapUpdates from './components/TagMap';
import DashboardAnalytics from './components/DashboardAnalytics';
import EditProfileModal from './components/EditProfileModal';

const TIMEOUT_DURATION_MS = 5 * 60 * 1000; // 5 minit (300,000 ms)

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState('home');

  // Kesan jika pengguna datang dari pautan 'Reset Password' di emel
  const [isRecoveryMode, setIsRecoveryMode] = useState(
    window.location.hash.includes('type=recovery') || window.location.href.includes('type=recovery')
  );

  const handleLogout = useCallback(async () => {
    localStorage.removeItem('me_last_active_time');
    await supabase.auth.signOut();
    window.location.hash = '';
    setActiveTab('home');
    setShowAuthModal(false);
    setIsRecoveryMode(false);
    setUserProfile(null);
    setSession(null);
  }, []);

  // Logik Auto-Logout 5 Minit Jika Pengguna Tidak Aktif
  useEffect(() => {
    if (!session) return;

    const updateActiveTime = () => {
      localStorage.setItem('me_last_active_time', String(Date.now()));
    };

    const checkInactivity = () => {
      const lastActive = localStorage.getItem('me_last_active_time');
      const now = Date.now();

      if (lastActive && now - parseInt(lastActive, 10) > TIMEOUT_DURATION_MS) {
        alert('Sesi anda telah tamat tempoh kerana tidak aktif melebihi 5 minit. Sila log masuk semula.');
        handleLogout();
      }
    };

    // Semak setiap 10 saat jika sudah terbiar melebihi 5 minit
    const intervalId = setInterval(checkInactivity, 10000);

    window.addEventListener('mousemove', updateActiveTime);
    window.addEventListener('keydown', updateActiveTime);
    window.addEventListener('click', updateActiveTime);
    window.addEventListener('beforeunload', updateActiveTime);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('mousemove', updateActiveTime);
      window.removeEventListener('keydown', updateActiveTime);
      window.removeEventListener('click', updateActiveTime);
      window.removeEventListener('beforeunload', updateActiveTime);
    };
  }, [session, handleLogout]);

  // Pengendali Navigasi URL Hash
  useEffect(() => {
    const handleHashChange = () => {
      if (isRecoveryMode) return;

      const currentHash = window.location.hash.replace('#/', '').replace('#', '');

      if (!session) {
        if (currentHash === 'login') {
          setShowAuthModal(true);
        } else {
          setShowAuthModal(false);
        }
        return;
      }

      if (!currentHash || currentHash === '' || currentHash === 'login') {
        window.history.replaceState(null, '', '#/home');
        setActiveTab('home');
      } else {
        const validTabs = ['home', 'create', 'list', 'analytics', 'tagmap'];
        if (validTabs.includes(currentHash)) {
          setActiveTab(currentHash);
        }
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [session, isRecoveryMode]);

  const navigateTo = (tabName) => {
    window.location.hash = `#/${tabName}`;
    setActiveTab(tabName);
  };

  const handleBackNavigation = () => {
    navigateTo('home');
  };

  const openLogin = () => {
    window.location.hash = '#/login';
    setShowAuthModal(true);
  };

  const closeLogin = () => {
    window.location.hash = '';
    setShowAuthModal(false);
  };

  const fetchProfile = async (currentUser) => {
    if (!currentUser) return;
    try {
      let { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      const metadataStaffId = currentUser.user_metadata?.staff_id;
      if (!data && metadataStaffId) {
        const { data: byStaffId } = await supabase
          .from('profiles')
          .select('*')
          .eq('staff_id', metadataStaffId)
          .maybeSingle();
        data = byStaffId;
      }

      if (!data && currentUser.email) {
        const { data: byEmail } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', currentUser.email)
          .maybeSingle();
        data = byEmail;
      }

      if (data) {
        setUserProfile(data);
      }
    } catch (err) {
      console.error('Fetch profile exception:', err);
    }
  };

  // Inisialisasi Sesi Supabase & Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (window.location.hash.includes('type=recovery')) {
        setIsRecoveryMode(true);
        setLoading(false);
        return;
      }

      if (session) {
        const lastActive = localStorage.getItem('me_last_active_time');
        // Hanya semak tamat tempoh jika sesi memang wujud sebelum ini
        if (lastActive && Date.now() - parseInt(lastActive, 10) > TIMEOUT_DURATION_MS) {
          handleLogout();
          setLoading(false);
          return;
        }

        setSession(session);
        fetchProfile(session.user);
        const currentHash = window.location.hash.replace('#/', '').replace('#', '');
        if (!currentHash || currentHash === 'login') {
          window.history.replaceState(null, '', '#/home');
          setActiveTab('home');
        }
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
        return;
      }

      if (event === 'SIGNED_IN' || (session && !isRecoveryMode)) {
        // Tetapkan cap masa semasa sebaik sahaja log masuk berjaya
        localStorage.setItem('me_last_active_time', String(Date.now()));
        setSession(session);
        fetchProfile(session.user);
        setShowAuthModal(false);

        const currentHash = window.location.hash.replace('#/', '').replace('#', '');
        if (!currentHash || currentHash === 'login') {
          window.history.replaceState(null, '', '#/home');
          setActiveTab('home');
        }
      } else if (!session) {
        setUserProfile(null);
        setSession(null);
        window.location.hash = '';
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [isRecoveryMode, handleLogout]);

  const handleIssueCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
    navigateTo('list');
  };

  // Paparan pemuatan sesi awal
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f6f9' }}>
        <p style={{ fontWeight: 'bold', color: '#0d3b66' }}>Memuatkan sesi...</p>
      </div>
    );
  }

  // 1. RECOVERY MODE
  if (isRecoveryMode) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f4f6f9', padding: '40px 20px' }}>
        <Auth 
          forceRecoveryMode={true} 
          onPasswordResetComplete={() => {
            setIsRecoveryMode(false);
            handleLogout();
          }} 
        />
      </div>
    );
  }

  // 2. BELUM LOGIN
  if (!session) {
    if (showAuthModal) {
      return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f4f6f9', padding: '20px' }}>
          <button
            onClick={closeLogin}
            style={{
              padding: '8px 16px',
              borderRadius: '5px',
              border: '1px solid #0d3b66',
              background: '#fff',
              color: '#0d3b66',
              cursor: 'pointer',
              fontWeight: 'bold',
              marginBottom: '20px'
            }}
          >
            ⬅️ Back to Homepage
          </button>
          <Auth onLoginSuccess={() => {
            localStorage.setItem('me_last_active_time', String(Date.now()));
            setShowAuthModal(false);
          }} />
        </div>
      );
    }
    return <LandingPage onGoToLogin={openLogin} />;
  }

  // 3. SUDAH LOGIN
  const displayName = 
    userProfile?.full_name || 
    session.user?.user_metadata?.full_name || 
    session.user?.user_metadata?.name || 
    'USER';

  const staffIdDisplay = 
    userProfile?.staff_id || 
    session.user?.user_metadata?.staff_id || 
    'STAFF';

  const currentAvatarUrl = 
    userProfile?.avatar_url || 
    session.user?.user_metadata?.avatar_url;

  return (
    <div className="dashboard-container">
      {/* Top Navigation Bar */}
      <div className="top-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <button className="exit-btn" onClick={handleLogout}>
            <span style={{ fontSize: '18px' }}>🚪</span> Logout
          </button>
        </div>

        <div>
          {activeTab === 'home' ? (
            <button
              onClick={() => setShowProfileModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#0d3b66',
                color: '#fff',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
              }}
            >
              <span>✏️</span> Edit Profile
            </button>
          ) : (
            <button 
              className="back-btn" 
              onClick={handleBackNavigation}
            >
              ⬅️ Back to Dashboard
            </button>
          )}
        </div>
      </div>

      {/* Main Content View */}
      {activeTab === 'home' && (
        <div className="dashboard-grid">
          <div className="hero-card">
            <div className="hero-title">
              <h1>Manufacturing Engineering</h1>
              <h2>DATA TRACKER</h2>
            </div>

            <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div 
                className="avatar" 
                style={{ 
                  width: '65px', 
                  height: '80px', 
                  borderRadius: '6px', 
                  overflow: 'hidden', 
                  backgroundColor: '#e2e8f0', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  border: '2px solid rgba(255,255,255,0.6)', 
                  flexShrink: 0 
                }}
              >
                {currentAvatarUrl ? (
                  <img 
                    src={currentAvatarUrl} 
                    alt="Staff Avatar" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                ) : (
                  <span style={{ fontSize: '32px' }}>👤</span>
                )}
              </div>

              <div className="welcome-text">
                <div className="welcome-title">Welcome,</div>
                <div className="user-name">{displayName}</div>
                <div className="staff-id-text">({staffIdDisplay})</div>
              </div>
            </div>
          </div>

          <div className="menu-card card-list" onClick={() => navigateTo('list')}>
            <div className="card-overlay">
              <h3>List of Issues</h3>
            </div>
          </div>

          <div className="menu-card card-create" onClick={() => navigateTo('create')}>
            <div className="card-overlay">
              <h3>Add New Issue</h3>
            </div>
          </div>

          <div className="menu-card card-dashboard" onClick={() => navigateTo('analytics')}>
            <div className="card-overlay">
              <h3>Dashboard Analytics</h3>
            </div>
          </div>

          <div className="menu-card card-escalate" onClick={() => navigateTo('tagmap')}>
            <div className="card-overlay">
              <h3>TagMap Updates</h3>
            </div>
          </div>
        </div>
      )}

      {/* View: Create Issue Form */}
      {activeTab === 'create' && (
        <div>
          <CreateIssue 
            userProfile={{ id: session.user.id, department: userProfile?.department || 'ME', staff_id: staffIdDisplay }} 
            onBackToDashboard={handleBackNavigation}
            onIssueCreated={handleIssueCreated} 
          />
        </div>
      )}

      {/* View: Issue List Table */}
      {activeTab === 'list' && (
        <div>
          <IssueList 
            onBackToDashboard={handleBackNavigation}
            userProfile={{ id: session.user.id }} 
            refreshTrigger={refreshTrigger} 
          />
        </div>
      )}

      {/* View: Dashboard Analytics */}
      {activeTab === 'analytics' && (
        <div>
          <DashboardAnalytics onBack={handleBackNavigation} />
        </div>
      )}

      {/* View: TagMap Updates Table */}
      {activeTab === 'tagmap' && (
        <div>
          <TagMapUpdates onBack={handleBackNavigation} />
        </div>
      )}

      {/* Modal Edit Profile */}
      {showProfileModal && (
        <EditProfileModal
          user={session.user}
          profile={userProfile}
          onClose={() => setShowProfileModal(false)}
          onProfileUpdated={(updated) => {
            setUserProfile(updated);
            if (session?.user?.user_metadata) {
              session.user.user_metadata.avatar_url = updated.avatar_url;
              session.user.user_metadata.full_name = updated.full_name;
              session.user.user_metadata.staff_id = updated.staff_id;
            }
          }}
        />
      )}

      {/* Footer */}
      <div className="footer">
        <span>©</span> Developed by Razin ME
      </div>
    </div>
  );
}