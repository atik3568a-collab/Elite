import React, { useState, useEffect, ChangeEvent } from 'react';
import { useAuth } from '../App';
import { 
  Trophy, 
  Wallet, 
  User as UserIcon, 
  Home, 
  LogOut, 
  Plus, 
  CheckCircle, 
  Clock, 
  Users, 
  Map as MapIcon,
  ChevronRight,
  TrendingUp,
  Shield,
  LayoutDashboard,
  CreditCard,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  Edit,
  Trash2,
  Gamepad2,
  List,
  Award,
  Copy,
  Crown,
  Sparkles,
  Settings,
  Key,
  MessageCircle,
  Check,
  Send,
  Database,
  Mail,
  Lock,
  ShieldCheck,
  Zap,
  Phone,
  Menu,
  X,
  Bell,
  HelpCircle,
  Info,
  ChevronLeft,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { getFirebaseDb, isFirebaseConfigured, initFirebase } from '../services/firebase';
import { ref, push, onValue, serverTimestamp, query, limitToLast, update, set, remove, off } from 'firebase/database';

// --- Types ---
interface Tournament {
  id: number;
  title: string;
  entry_fee: number;
  prize_pool: number;
  game_type: string;
  map: string;
  total_slots: number;
  filled_slots: number;
  match_time: string;
  status: string;
  thumbnail_url?: string;
  room_id?: string;
  room_password?: string;
}

interface Transaction {
  id: number;
  user_id: number;
  type: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
}

interface Payment {
  id: number;
  user_id: number;
  user_name?: string;
  method: string;
  transaction_id: string;
  amount: number;
  screenshot_url?: string;
  status: string;
  created_at: string;
}

interface WithdrawRequest {
  id: number;
  user_id: number;
  user_name?: string;
  amount: number;
  method: string;
  account_number: string;
  status: string;
  created_at: string;
}

// --- Helpers ---
const apiFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    ...options.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
  return fetch(url, { ...options, headers });
};

// --- Components ---

const TopBar = ({ onMenuClick }: { onMenuClick: () => void }) => {
  const { user } = useAuth();
  
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-black/80 backdrop-blur-md border-b border-white/5 z-40 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <button 
          onClick={onMenuClick}
          className="p-2 text-zinc-400 hover:text-white lg:hidden"
        >
          <Menu size={24} />
        </button>
        <div className="flex items-center lg:hidden">
          <span className="font-black text-white tracking-tighter text-xl uppercase">Elite <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">FF</span></span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden bg-zinc-900">
          {user?.profile_photo_url ? (
            <img src={user.profile_photo_url} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500">
              <UserIcon size={20} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

const Sidebar = ({ 
  isOpen, 
  onClose, 
  activeTab, 
  setActiveTab 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  activeTab: string, 
  setActiveTab: (t: string) => void 
}) => {
  const { user, logout } = useAuth();

  const menuItems = [
    { id: 'home', label: 'Home', icon: <Home size={20} /> },
    { id: 'my-matches', label: 'My Matches', icon: <Gamepad2 size={20} /> },
    { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy size={20} /> },
    { id: 'profile', label: 'Profile', icon: <UserIcon size={20} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={20} /> },
    { id: 'support', label: 'Support', icon: <HelpCircle size={20} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  const handleNav = (id: string) => {
    setActiveTab(id);
    if (window.innerWidth < 1024) onClose();
  };

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ x: isOpen ? 0 : -280 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-0 left-0 bottom-0 w-[280px] bg-black/95 backdrop-blur-xl border-r border-white/5 z-50 flex flex-col"
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/5">
          <div className="flex items-center">
            <span className="font-black text-white tracking-tighter text-xl uppercase">Elite <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">FF</span></span>
          </div>
          <button onClick={onClose} className="lg:hidden p-2 text-zinc-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-white/10 text-white border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]' 
                  : 'text-zinc-500 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              {item.icon}
              <span className="font-bold text-sm">{item.label}</span>
            </button>
          ))}
          
          {(user?.role === 'admin' || user?.role === 'super_admin') && (
            <button
              onClick={() => handleNav('admin')}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'admin' 
                  ? 'bg-white/10 text-white border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]' 
                  : 'text-zinc-500 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <Shield size={20} />
              <span className="font-bold text-sm">Admin Panel</span>
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
          >
            <LogOut size={20} />
            <span className="font-bold text-sm">Logout</span>
          </button>
        </div>
      </motion.aside>
    </>
  );
};

const Navbar = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) => {
  const { user } = useAuth();
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/5 z-40 h-[64px] flex items-center lg:hidden">
      <div className="w-full px-1 flex items-center justify-around">
        <NavItem icon={<Trophy size={18} />} label="Match" active={activeTab === 'matches'} onClick={() => setActiveTab('matches')} />
        <NavItem icon={<Wallet size={18} />} label="Wallet" active={activeTab === 'wallet'} onClick={() => setActiveTab('wallet')} />
        <NavItem icon={<Home size={18} />} label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
        <NavItem icon={<UserIcon size={18} />} label="Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
        {(user?.role === 'admin' || user?.role === 'super_admin') && (
          <NavItem icon={<Shield size={18} />} label="Admin" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} />
        )}
      </div>
    </nav>
  );
};

const NavItem = ({ icon, label, active, onClick }: any) => (
  <button 
    onClick={onClick} 
    className={`flex flex-col items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl transition-all relative group min-w-[60px] ${active ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
  >
    <div className={`transition-all ${active ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] scale-110 -translate-y-1' : 'group-hover:text-zinc-300'}`}>
      {icon}
    </div>
    <span className="text-[11px] font-medium tracking-tight text-center leading-none">{label}</span>
    {active && (
      <motion.div 
        layoutId="nav-indicator" 
        className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full" 
      />
    )}
  </button>
);

// --- Pages ---

const HomePage = ({ tournaments, onJoin, setActiveTab }: any) => {
  const { user, refreshUser } = useAuth();
  const [filter, setFilter] = useState('all'); // 'all', 'Solo', 'Duo', 'Squad'

  const handleHeaderBgUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('header_bg', file);

    try {
      const res = await apiFetch('/api/user/header-bg', {
        method: 'PUT',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        toast.success('Header background updated!');
        
        // Update Firebase RTDB for real-time sync
        const db = getFirebaseDb();
        const targetUid = user?.uid;
        if (db && targetUid) {
          update(ref(db, `users/${targetUid}`), {
            header_bg_url: data.url
          }).catch(e => console.error("Firebase sync error:", e));
        }
        
        refreshUser();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Failed to upload background');
      }
    } catch (error: any) {
      console.error('Header bg upload error:', error);
      toast.error('Network error during upload');
    }
  };

  const filteredTournaments = tournaments.filter((t: any) => 
    filter === 'all' ? true : t.game_type === filter
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-32 pt-6 px-4 max-w-5xl mx-auto"
    >
      {/* Premium Hero Card */}
      <div className="glass-card group border border-white/10 bg-zinc-900/50 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 h-48">
           {user?.header_bg_url ? (
            <img src={user.header_bg_url} className="w-full h-full object-cover opacity-60 transition-transform duration-1000 group-hover:scale-105" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-slate-900 to-slate-800 flex items-center justify-center">
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative pt-24 px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
            <div className="flex items-end gap-5">
              <div className="relative -mb-2">
                <div className="w-24 h-24 rounded-2xl p-1 bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 shadow-lg shadow-amber-500/20">
                  <div className="w-full h-full rounded-xl bg-zinc-900 overflow-hidden relative">
                    {user?.profile_photo_url ? (
                      <img src={user.profile_photo_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                        <UserIcon size={32} className="text-zinc-500" />
                      </div>
                    )}
                  </div>
                </div>
                {user?.is_verified === 1 && (
                  <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white p-1.5 rounded-full border-4 border-zinc-950 shadow-sm">
                    <Check size={12} strokeWidth={4} />
                  </div>
                )}
              </div>
              
              <div className="mb-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                    <Crown size={12} /> Elite Member
                  </span>
                </div>
                <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-1 drop-shadow-lg">{user?.name}</h1>
                <p className="text-zinc-500 text-xs font-medium font-mono bg-white/5 px-2 py-0.5 rounded inline-block border border-white/5">ID: {user?.uid?.slice(0, 8) || '---'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex-1 sm:flex-none bg-black/40 border border-white/5 rounded-2xl p-4 backdrop-blur-md min-w-[140px] shadow-lg">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Total Balance</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-amber-500 font-bold text-lg">৳</span>
                  <span className="text-3xl font-bold text-white tracking-tight">
                    {(user?.wallet_balance || 0) + (user?.bonus_balance || 0) + (user?.winning_balance || 0)}
                  </span>
                </div>
              </div>
              
               {/* Edit Background Button */}
               <label className="h-[84px] w-[60px] bg-black/40 hover:bg-white/10 rounded-2xl cursor-pointer border border-white/5 transition-all active:scale-95 flex flex-col items-center justify-center gap-2 group/edit shadow-lg">
                  <div className="p-2 rounded-full bg-white/5 group-hover/edit:bg-white/10 transition-colors">
                    <Edit size={16} className="text-zinc-400 group-hover/edit:text-white" />
                  </div>
                  <span className="text-[9px] text-zinc-500 font-bold uppercase">Edit</span>
                  <input type="file" className="hidden" onChange={handleHeaderBgUpload} accept="image/*" />
                </label>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Matches Played" value={user?.matches_played || 0} icon={<Gamepad2 size={18} />} color="blue" />
        <StatCard label="Total Kills" value={user?.total_kills || 0} icon={<Zap size={18} />} color="red" />
        <StatCard label="Win Rate" value={`${user?.matches_played ? Math.round(((user?.winning_balance || 0) / 100)) : 0}%`} icon={<Trophy size={18} />} color="amber" />
        <StatCard label="KD Ratio" value="0.0" icon={<TrendingUp size={18} />} color="emerald" />
      </div>

      {/* Tournaments Section */}
      <section>
        <div className="sticky top-16 z-30 bg-black/80 backdrop-blur-xl py-4 -mx-4 px-4 mb-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="text-amber-500" size={20} />
              Live Tournaments
            </h2>
          </div>
          
          <div className="flex bg-zinc-900 p-1 rounded-xl border border-white/5 w-full sm:w-auto overflow-x-auto no-scrollbar">
            {['all', 'Solo', 'Duo', 'Squad'].map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type === 'all' ? 'all' : type)}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  filter === (type === 'all' ? 'all' : type)
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTournaments.map((t: any) => (
            <TournamentCard 
              key={t.id}
              {...t}
              onJoin={onJoin}
            />
          ))}
           {filteredTournaments.length === 0 && (
            <div className="col-span-full py-20 text-center border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20">
              <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800">
                <Gamepad2 className="text-zinc-600" size={32} />
              </div>
              <h3 className="text-zinc-400 font-medium">No active tournaments found</h3>
              <p className="text-zinc-600 text-sm mt-1">Check back later for new matches</p>
            </div>
          )}
        </div>
      </section>
      
      {/* Support Banner */}
      <div 
        onClick={() => window.open('https://wa.me/8801908391278', '_blank')}
        className="relative overflow-hidden rounded-3xl cursor-pointer group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-900 opacity-10 group-hover:opacity-20 transition-all" />
        <div className="relative bg-zinc-900/40 backdrop-blur-xl border border-emerald-500/20 p-5 flex items-center justify-between rounded-3xl transition-all group-hover:border-emerald-500/40">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <MessageCircle size={24} />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm uppercase tracking-wide">Need Help?</h4>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mt-1">Contact 24/7 Support</p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
            <ChevronRight size={20} />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const StatCard = ({ label, value, icon, color = 'blue' }: any) => {
  return (
    <div className="glass-card p-4 flex items-center justify-between shadow-lg group hover:border-white/20 transition-all">
      <div>
        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">{label}</p>
        <p className="text-xl font-black text-white tracking-tight group-hover:text-amber-500 transition-colors">{value}</p>
      </div>
      <div className={`p-3 rounded-xl bg-gradient-to-br from-zinc-800 to-black border border-white/5 shadow-inner group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
    </div>
  );
};

const TournamentCard = ({ id, title, fee, prize, type, map, time, slots, filled, thumbnail_url, onJoin, isJoined, roomId, roomPassword, rules, prizeDetails, status }: any) => {
  const [showDetails, setShowDetails] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [activeTab, setActiveTab] = useState('details'); // 'details', 'leaderboard', or 'lobby'
  const [showRules, setShowRules] = useState(false);
  const [showPrizeDetails, setShowPrizeDetails] = useState(false);
  const [showGameDetails, setShowGameDetails] = useState(true);
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState<string>('00:00:00');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(time).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('00:00:00');
        clearInterval(timer);
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${h.toString().padStart(2, '0')} : ${m.toString().padStart(2, '0')} : ${s.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [time]);

  useEffect(() => {
    const count = type === 'Solo' ? 1 : (type === 'Duo' ? 2 : 4);
    setPlayerNames(new Array(count).fill(''));
  }, [type]);
  
  const formatMatchTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) return 'TBA';
      return format(date, 'MMM dd, p');
    } catch (e) {
      return 'TBA';
    }
  };

  const fetchParticipants = async () => {
    setLoadingParticipants(true);
    try {
      const res = await apiFetch(`/api/tournaments/${id}`);
      if (res.ok) {
        const data = await res.json();
        setParticipants(data.participants || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingParticipants(false);
    }
  };

  useEffect(() => {
    if (showDetails) {
      fetchParticipants();
    }
  }, [showDetails]);

  const handleJoinClick = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    const count = type === 'Solo' ? 1 : (type === 'Duo' ? 2 : 4);
    if (playerNames.length !== count || playerNames.some(name => !name || name.trim() === '')) {
      toast.error(type === 'Solo' ? "Please enter your in-game name to join the tournament." : "Please enter all team members' in-game names.");
      return;
    }
    
    await onJoin(id, playerNames);
    setConfirming(false);
    setShowDetails(false);
  };

  return (
    <>
      <div className="glass-card p-5 group relative">
        {/* Glow Effect */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-all opacity-0 group-hover:opacity-100" />
        
        {/* Slot Counter - Top Right */}
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full shadow-lg">
            <p className="text-[10px] font-bold tracking-wider text-zinc-300">
              <span className={filled >= slots ? 'text-red-500' : 'text-emerald-500'}>{filled}</span>
              <span className="text-zinc-600 mx-1">/</span>
              {slots}
            </p>
          </div>
        </div>

        {/* Top Section: Thumbnail & Basic Info */}
        <div className="flex gap-5 mb-6 relative">
          <div className="w-24 h-24 rounded-2xl overflow-hidden border border-white/5 flex-shrink-0 relative shadow-lg group-hover:shadow-amber-500/10 transition-all">
            {thumbnail_url ? (
              <img src={thumbnail_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
            ) : (
              <img src={`https://picsum.photos/seed/${title}/300`} className="w-full h-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          </div>
          
          <div className="flex-1 flex flex-col justify-center pt-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-amber-500/10 text-amber-500 text-[9px] font-bold px-2 py-0.5 rounded border border-amber-500/20 uppercase tracking-wider shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                {type}
              </span>
              <span className="text-zinc-500 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                <MapIcon size={10} /> {map}
              </span>
            </div>
            <h4 className="font-bold text-white text-lg leading-tight mb-1 line-clamp-2 pr-12 group-hover:text-amber-500 transition-colors">{title}</h4>
            <p className="text-zinc-500 text-xs font-medium flex items-center gap-1.5">
              <Clock size={10} />
              {formatMatchTime(time)}
            </p>
          </div>
        </div>

        {/* Middle Section: Prize, Timer & Fee */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {/* Prize Pool Box */}
          <div className="bg-black/40 rounded-2xl p-3 border border-white/5 text-center group-hover:border-amber-500/20 transition-colors relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-1 relative z-10">Prize</p>
            <p className="text-base font-bold text-amber-500 relative z-10">৳{prize}</p>
          </div>

          {/* Entry Fee Box */}
          <div className="bg-black/40 rounded-2xl p-3 border border-white/5 text-center group-hover:border-white/10 transition-colors">
            <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Entry</p>
            <p className="text-base font-bold text-white">৳{fee}</p>
          </div>

           {/* Countdown Timer */}
           <div className="bg-black/40 rounded-2xl p-3 border border-white/5 text-center flex flex-col items-center justify-center">
            <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Starts In</p>
            <p className="text-[10px] font-mono font-medium text-zinc-300">
              {timeLeft}
            </p>
          </div>
        </div>

        {/* Bottom Section: Action Button */}
        <button 
          onClick={() => setShowDetails(true)}
          className={`w-full py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all relative overflow-hidden group/btn border ${
            isJoined ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20' : 
            filled >= slots ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border-white/5' : 
            'bg-white text-black hover:bg-zinc-200 border-transparent shadow-[0_0_20px_rgba(255,255,255,0.1)]'
          }`}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {isJoined ? (
              <>
                <CheckCircle size={16} /> Joined
              </>
            ) : filled >= slots ? (
              'Full'
            ) : (
              <>
                Join Now <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
              </>
            )}
          </span>
        </button>
      </div>

      <AnimatePresence>
        {showDetails && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar rounded-3xl border border-white/10 shadow-2xl relative"
            >
              <button onClick={() => { setShowDetails(false); setConfirming(false); }} className="absolute top-6 right-6 p-2.5 hover:bg-white/5 rounded-2xl transition-all">
                <X size={24} className="text-zinc-500 hover:text-white" />
              </button>
              
              <div className="p-6 pb-0">
                <h3 className="text-2xl font-bold text-white tracking-tight pr-12">{title}</h3>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">{type}</span>
                  <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">{map}</span>
                  <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">{formatMatchTime(time)}</span>
                </div>
              </div>

              <div className="flex gap-4 px-6 mt-8 border-b border-white/5">
                <button 
                  onClick={() => setActiveTab('details')}
                  className={`pb-4 px-4 text-[10px] font-bold uppercase tracking-widest transition-all relative ${activeTab === 'details' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Details
                  {activeTab === 'details' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />}
                </button>
                {isJoined && (
                  <button 
                    onClick={() => setActiveTab('lobby')}
                    className={`pb-4 px-4 text-[10px] font-bold uppercase tracking-widest transition-all relative ${activeTab === 'lobby' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    Lobby
                    {activeTab === 'lobby' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />}
                  </button>
                )}
                <button 
                  onClick={() => setActiveTab('leaderboard')}
                  className={`pb-4 px-4 text-[10px] font-bold uppercase tracking-widest transition-all relative ${activeTab === 'leaderboard' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Leaderboard
                  {activeTab === 'leaderboard' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />}
                </button>
              </div>

              <div className="p-6">
                {activeTab === 'details' ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                        <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Entry Fee</p>
                        <p className="text-xl font-bold text-white">৳{fee}</p>
                      </div>
                      <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                        <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Prize Pool</p>
                        <p className="text-xl font-bold text-amber-500">৳{prize}</p>
                      </div>
                    </div>

                    {!isJoined && (
                      <div className="bg-black/20 p-5 rounded-2xl border border-white/5">
                        {confirming ? (
                          <div className="space-y-6">
                            <div className="text-center">
                              <p className="text-sm text-white font-bold uppercase tracking-wider">Registration</p>
                              <p className="text-[10px] text-zinc-500 mt-2">Enter exact in-game names.</p>
                            </div>

                            <div className="space-y-4">
                              {playerNames.map((name, idx) => (
                                <div key={idx}>
                                  <label className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest ml-1 mb-1.5 block">
                                    {type === 'Solo' ? 'Your In-Game Name' : (idx === 0 ? 'Your In-Game Name (Leader)' : `Teammate ${idx + 1} Name`)}
                                  </label>
                                  <input 
                                    type="text" 
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-zinc-700" 
                                    placeholder="Enter IGN..."
                                    value={name}
                                    onChange={(e) => {
                                      const newNames = [...playerNames];
                                      newNames[idx] = e.target.value;
                                      setPlayerNames(newNames);
                                    }}
                                  />
                                </div>
                              ))}
                            </div>

                            <div className="pt-2">
                              <p className="text-[10px] text-center text-zinc-500 font-bold uppercase tracking-widest mb-4">৳{fee} will be deducted.</p>
                              <div className="flex gap-4">
                                <button onClick={() => setConfirming(false)} className="flex-1 py-3 rounded-xl bg-white/5 text-zinc-400 text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all">Cancel</button>
                                <button 
                                  onClick={handleJoinClick} 
                                  disabled={playerNames.some(n => !n || n.trim() === '')}
                                  className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${playerNames.some(n => !n || n.trim() === '') ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-amber-500 text-black hover:bg-amber-400'}`}
                                >
                                  Confirm
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-2">
                            <p className="text-xs text-zinc-500 font-medium leading-relaxed mb-6">Join this tournament to see match details like Room ID and Password.</p>
                            <button 
                              onClick={handleJoinClick}
                              disabled={filled >= slots}
                              className="w-full py-4 bg-white text-black font-bold uppercase tracking-widest rounded-xl hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Join Now ৳{fee}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {prizeDetails && (
                      <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
                        <button 
                          onClick={() => setShowPrizeDetails(!showPrizeDetails)}
                          className="w-full p-4 flex items-center justify-between transition-colors hover:bg-white/5"
                        >
                          <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Prize Distribution</h4>
                          <div className={`p-1.5 rounded-lg transition-transform duration-300 ${showPrizeDetails ? 'rotate-180 text-amber-500' : 'text-zinc-500'}`}>
                            <ChevronDown size={14} />
                          </div>
                        </button>
                        <AnimatePresence>
                          {showPrizeDetails && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="px-5 pb-5"
                            >
                              <div className="text-xs text-zinc-400 whitespace-pre-wrap border-t border-white/5 pt-4 leading-relaxed font-medium">
                                {prizeDetails}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                ) : activeTab === 'lobby' ? (
                  <div className="space-y-6">
                    <div className="bg-black p-6 rounded-2xl border border-white/5 text-center">
                      <h4 className="text-sm font-black text-white uppercase tracking-wider mb-4">Room Details</h4>
                      {roomId && roomPassword ? (
                        <div className="space-y-4">
                          <div className="bg-black p-4 rounded-xl border border-white/5">
                            <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Room ID</p>
                            <div className="flex items-center justify-center gap-2">
                              <p className="text-xl font-mono font-bold text-amber-500">{roomId}</p>
                              <button onClick={() => { navigator.clipboard.writeText(roomId); toast.success('Copied!'); }} className="p-2 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-white transition-colors">
                                <Copy size={16} />
                              </button>
                            </div>
                          </div>
                          <div className="bg-black p-4 rounded-xl border border-white/5">
                            <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Password</p>
                            <div className="flex items-center justify-center gap-2">
                              <p className="text-xl font-mono font-bold text-amber-500">{roomPassword}</p>
                              <button onClick={() => { navigator.clipboard.writeText(roomPassword); toast.success('Copied!'); }} className="p-2 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-white transition-colors">
                                <Copy size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="py-8">
                          <Lock size={32} className="mx-auto text-zinc-700 mb-3" />
                          <p className="text-zinc-500 text-xs font-bold">Room details will be shared 15 minutes before match start.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {loadingParticipants ? (
                      <div className="text-center py-8 text-zinc-500 text-xs font-bold uppercase tracking-widest">Loading participants...</div>
                    ) : participants.length > 0 ? (
                      <div className="space-y-2">
                        {participants.map((p: any, i: number) => (
                          <div key={i} className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500">
                                {i + 1}
                              </div>
                              <span className="text-sm font-medium text-zinc-300">{p.ign}</span>
                            </div>
                            {p.is_winner && <Trophy size={14} className="text-amber-500" />}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-zinc-500 text-xs font-bold uppercase tracking-widest">No participants yet. Be the first to join!</div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

const LiveChatPage = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useState<any>(null);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!isFirebaseConfigured() || !db) {
      setLoading(false);
      return;
    }
    const chatRef = query(ref(db, 'chat'), limitToLast(50));
    
    // Real-time listener
    const unsubscribe = onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messageList = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setMessages(messageList);
      } else {
        setMessages([]);
      }
      setLoading(false);
    }, (error) => {
      console.error("Firebase error:", error);
      setLoading(false);
      toast.error("Failed to connect to live chat");
    });

    return () => unsubscribe();
  }, [isFirebaseConfigured()]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const db = getFirebaseDb();
      if (!db) return;
      const chatRef = ref(db, 'chat');
      await push(chatRef, {
        text: newMessage,
        userId: user?.id,
        userName: user?.name,
        userRole: user?.role,
        timestamp: serverTimestamp()
      });
      setNewMessage('');
    } catch (error) {
      console.error("Send error:", error);
      toast.error("Failed to send message");
    }
  };

  if (!isFirebaseConfigured()) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-140px)] pt-4 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-700 mb-4 border border-white/10">
          <Database size={40} />
        </div>
        <h2 className="text-xl font-black text-white mb-2">Chat Not Configured</h2>
        <p className="text-zinc-500 text-sm max-w-xs leading-relaxed">
          Please configure Firebase in the Admin Dashboard to enable real-time global chat.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] pt-4">
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-xl font-bold flex items-center gap-2 text-white">
          <MessageCircle className="text-amber-500" /> Global Live Chat
        </h2>
        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full font-bold flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Live Sync
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 px-2 custom-scrollbar mb-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
          </div>
        ) : messages.length > 0 ? (
          messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.userId === user?.id ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-zinc-500">{msg.userName}</span>
                {msg.userRole === 'admin' && <Shield size={10} className="text-amber-500" />}
              </div>
              <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                msg.userId === user?.id 
                  ? 'bg-white text-black rounded-tr-none font-medium' 
                  : 'bg-zinc-900 text-zinc-200 border border-white/10 rounded-tl-none'
              }`}>
                {msg.text}
              </div>
              <span className="text-[8px] text-zinc-600 mt-1">
                {msg.timestamp ? format(new Date(msg.timestamp), 'p') : 'sending...'}
              </span>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-zinc-900 rounded-2xl border border-white/10">
            <MessageCircle size={48} className="mx-auto text-zinc-700 mb-4" />
            <p className="text-zinc-500 text-sm">No messages yet. Start the conversation!</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSendMessage} className="flex gap-2 p-2 bg-zinc-900 rounded-2xl border border-white/5">
        <input 
          type="text" 
          placeholder="Type your message..." 
          className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white px-2 placeholder:text-zinc-600"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button 
          type="submit" 
          disabled={!newMessage.trim()}
          className="p-2 bg-white text-black rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

const WalletPage = () => {
  const { user, refreshUser } = useAuth();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bKash');
  const [trxId, setTrxId] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [activeForm, setActiveForm] = useState<'deposit' | 'withdraw'>('deposit');
  const [history, setHistory] = useState<Transaction[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const res = await apiFetch('/api/wallet/history');
    if (res.ok) setHistory(await res.json());
  };

  const handleDeposit = async (e: any) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('amount', amount);
    formData.append('method', method);
    formData.append('transactionId', trxId);
    if (screenshot) {
      formData.append('screenshot', screenshot);
    }

    const res = await apiFetch('/api/wallet/deposit', {
      method: 'POST',
      body: formData
    });
    if (res.ok) {
      toast.success('Deposit request submitted!');
      setAmount('');
      setTrxId('');
      setScreenshot(null);
      fetchHistory();
    } else {
      const data = await res.json();
      toast.error(data.error);
    }
  };

  const handleWithdraw = (e: any) => {
    e.preventDefault();
    if (Number(amount) < 100) {
      toast.error('Minimum withdraw 100 BDT');
      return;
    }
    if (Number(amount) > (user?.winning_balance || 0)) {
      toast.error('Insufficient winning balance');
      return;
    }
    setShowConfirm(true);
  };

  const confirmWithdraw = async () => {
    setIsSubmitting(true);
    try {
      const res = await apiFetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amount), method, accountNumber })
      });
      if (res.ok) {
        toast.success('Withdraw request submitted!');
        setAmount('');
        setAccountNumber('');
        setShowConfirm(false);
        refreshUser();
        fetchHistory();
      } else {
        const data = await res.json();
        toast.error(data.error);
      }
    } catch (e) {
      toast.error('Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [depositType, setDepositType] = useState<'manual' | 'auto'>('auto');

  const handleAutoDeposit = async (e: any) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) < 10) {
      toast.error('Minimum deposit 10 BDT');
      return;
    }

    const res = await apiFetch('/api/payment/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: parseFloat(amount) })
    });

    if (res.ok) {
      const { gatewayUrl } = await res.json();
      window.location.href = gatewayUrl;
    } else {
      const data = await res.json();
      toast.error(data.error || 'Failed to initiate payment');
    }
  };

  return (
    <div className="space-y-6 pb-24 pt-4 perspective-1000">
      <div className="bg-zinc-900/50 backdrop-blur-xl rounded-3xl p-8 border border-white/10 relative overflow-hidden shadow-2xl card-3d preserve-3d">
        {/* Removed blur circle */}
        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2">Total Assets</p>
        <h1 className="text-5xl font-black text-white tracking-tight">৳{user?.wallet_balance! + user?.bonus_balance! + user?.winning_balance!}</h1>
        <div className="grid grid-cols-3 gap-4 mt-10">
          <div className="text-center p-4 bg-black/40 rounded-2xl border border-white/5 card-3d">
            <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Main</p>
            <p className="font-bold text-white text-lg">৳{user?.wallet_balance}</p>
          </div>
          <div className="text-center p-4 bg-black/40 rounded-2xl border border-white/5 card-3d">
            <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Winning</p>
            <p className="font-bold text-amber-500 text-lg">৳{user?.winning_balance}</p>
          </div>
          <div className="text-center p-4 bg-black/40 rounded-2xl border border-white/5 card-3d">
            <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Bonus</p>
            <p className="font-bold text-emerald-500 text-lg">৳{user?.bonus_balance}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <button 
          onClick={() => setActiveForm('deposit')}
          className={`py-4 flex flex-col items-center gap-2 rounded-2xl transition-all duration-300 border btn-3d ${activeForm === 'deposit' ? 'bg-white text-black border-white/50 scale-105 shadow-xl shadow-white/5' : 'bg-zinc-900 text-zinc-500 border-white/5 hover:bg-zinc-800'}`}
        >
          <div className={`p-3 rounded-2xl ${activeForm === 'deposit' ? 'bg-black text-white border border-white/20' : 'bg-black'}`}>
            <ArrowUpRight size={28} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest">Add Money</span>
        </button>
        <button 
          onClick={() => setActiveForm('withdraw')}
          className={`py-4 flex flex-col items-center gap-2 rounded-2xl transition-all duration-300 border btn-3d ${activeForm === 'withdraw' ? 'bg-white text-black border-white/50 scale-105 shadow-xl shadow-white/5' : 'bg-zinc-900 text-zinc-500 border-white/5 hover:bg-zinc-800'}`}
        >
          <div className={`p-3 rounded-2xl ${activeForm === 'withdraw' ? 'bg-black text-white border border-white/20' : 'bg-black'}`}>
            <ArrowDownLeft size={28} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest">Withdraw</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeForm === 'deposit' ? (
          <motion.section 
            key="deposit"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-zinc-900/50 backdrop-blur-md rounded-3xl border border-white/10 p-6 card-3d"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl text-white">
                  <Plus size={20} />
                </div>
                Add Money
              </h3>
              <div className="flex bg-black p-1 rounded-xl border border-white/5">
                <button 
                  onClick={() => setDepositType('auto')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${depositType === 'auto' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Auto
                </button>
                <button 
                  onClick={() => setDepositType('manual')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${depositType === 'manual' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Manual
                </button>
              </div>
            </div>

            {depositType === 'auto' ? (
              <div className="space-y-6">
                <div className="bg-black/40 border border-amber-500/20 rounded-2xl p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
                      <Zap size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white uppercase">Automated Payment</p>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Instant Wallet Update</p>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">Pay securely via bKash, Nagad, or Rocket using our automated gateway. Your wallet will be updated instantly after successful payment.</p>
                </div>

                <form onSubmit={handleAutoDeposit} className="space-y-4">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-zinc-500 font-bold text-sm">৳</span>
                    </div>
                    <input 
                      type="number" 
                      placeholder="ENTER AMOUNT" 
                      className="input-field w-full !pl-10 bg-black border-white/10 focus:border-amber-500/50" 
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      required
                      min="10"
                    />
                  </div>
                  <button type="submit" className="w-full py-4 bg-amber-500 text-black font-bold uppercase tracking-widest rounded-xl hover:bg-amber-400 transition-all flex items-center justify-center gap-3 shadow-lg shadow-amber-500/20 btn-3d">
                    <Plus size={20} />
                    Proceed to Payment
                  </button>
                </form>
              </div>
            ) : (
              <>
                <div className="bg-black/40 border border-white/10 rounded-2xl p-4 mb-6 card-3d">
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-4">Manual Payment Numbers</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-black p-4 rounded-2xl border border-white/5 card-3d">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center">
                          <CreditCard size={20} className="text-pink-500" />
                        </div>
                        <div>
                          <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">bKash Personal</p>
                          <span className="text-lg font-bold text-white tracking-widest">01618413568</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText('01618413568');
                          toast.success('Number copied!');
                        }}
                        className="p-3 hover:bg-white/10 rounded-xl transition-all text-pink-500 hover:scale-110 active:scale-90"
                      >
                        <Copy size={20} />
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-500 italic mt-4 leading-relaxed">Please send money via Cash Out or Send Money, then submit the Transaction ID below.</p>
                </div>

                <form onSubmit={handleDeposit} className="space-y-4">
                  <div className="flex gap-2">
                    {['bKash', 'Nagad'].map(m => (
                      <button 
                        key={m}
                        type="button"
                        onClick={() => setMethod(m)}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${method === m ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-white/5 bg-black text-zinc-400 hover:bg-white/5'}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <input 
                    type="number" 
                    placeholder="Amount (৳)" 
                    className="input-field w-full bg-black border-white/10 focus:border-amber-500/50" 
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    required
                  />
                  <input 
                    type="text" 
                    placeholder="Transaction ID" 
                    className="input-field w-full bg-black border-white/10 focus:border-amber-500/50" 
                    value={trxId}
                    onChange={e => setTrxId(e.target.value)}
                    required
                  />
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={e => setScreenshot(e.target.files?.[0] || null)}
                      className="hidden"
                      id="screenshot-upload"
                    />
                    <label 
                      htmlFor="screenshot-upload"
                      className="flex items-center justify-center gap-2 w-full py-3 bg-black border border-dashed border-white/20 rounded-xl cursor-pointer hover:border-amber-500/50 transition-all text-zinc-400 hover:text-white"
                    >
                      <Upload size={18} />
                      <span className="text-sm font-medium">
                        {screenshot ? screenshot.name : 'Upload Screenshot (Optional)'}
                      </span>
                    </label>
                  </div>
                  <button type="submit" className="w-full py-4 bg-white text-black font-bold uppercase tracking-widest rounded-xl hover:bg-zinc-200 transition-all shadow-lg shadow-white/10 btn-3d">Submit Request</button>
                </form>
              </>
            )}
          </motion.section>
        ) : (
          <motion.section 
            key="withdraw"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-zinc-900/50 backdrop-blur-md rounded-3xl border border-white/10 p-6 card-3d"
          >
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl text-white">
                  <ArrowDownLeft size={20} />
                </div>
                Withdrawal
              </h3>
              <div className="text-right">
                <p className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest mb-0.5">Withdrawable</p>
                <p className="text-lg font-bold text-amber-500">৳{user?.winning_balance}</p>
              </div>
            </div>
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div className="flex gap-2">
                {['bKash', 'Nagad'].map(m => (
                  <button 
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${method === m ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-white/5 bg-black text-zinc-400 hover:bg-white/5'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <input 
                type="number" 
                placeholder="Amount (৳)" 
                className="input-field w-full bg-black border-white/10 focus:border-amber-500/50" 
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                min="100"
              />
              <input 
                type="text" 
                placeholder={`${method} Number`} 
                className="input-field w-full bg-black border-white/10 focus:border-amber-500/50" 
                value={accountNumber}
                onChange={e => setAccountNumber(e.target.value)}
                required
              />
              <p className="text-[10px] text-zinc-500 italic">Minimum withdraw 100 BDT. Only winning balance can be withdrawn.</p>
              <button type="submit" className="w-full py-4 bg-white text-black font-bold uppercase tracking-widest rounded-xl hover:bg-zinc-200 transition-all shadow-lg shadow-white/10 btn-3d">Submit Request</button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>



      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-black rounded-2xl border border-sky-500/20 w-full max-w-sm p-6 relative"
            >
              <h3 className="text-xl font-bold text-white mb-2">Confirm Withdraw</h3>
              <p className="text-zinc-400 text-sm mb-6">Please verify your withdrawal details before submitting.</p>
              
              <div className="space-y-4 mb-8">
                <div className="bg-black p-4 rounded-xl border border-white/5">
                  <p className="text-[10px] text-zinc-500 uppercase font-bold">Amount</p>
                  <p className="text-2xl font-bold text-amber-500">৳{amount}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black p-3 rounded-xl border border-white/5">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold">Method</p>
                    <p className="text-sm font-bold text-white">{method}</p>
                  </div>
                  <div className="bg-black p-3 rounded-xl border border-white/5">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold">Account</p>
                    <p className="text-sm font-bold text-white">{accountNumber}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowConfirm(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-xl bg-black text-zinc-400 font-bold text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmWithdraw}
                  disabled={isSubmitting}
                  className="flex-1 bg-white text-black rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-zinc-200 transition-all"
                >
                  {isSubmitting ? (
                    <motion.div 
                      animate={{ rotate: 360 }} 
                      transition={{ repeat: Infinity, duration: 1 }} 
                      className="w-4 h-4 border-2 border-black border-t-transparent rounded-full" 
                    />
                  ) : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <section className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl text-white">
              <History size={20} />
            </div>
            Transaction History
          </h3>
        </div>
        <div className="space-y-3">
          {history.length > 0 ? (
            history.map((t) => (
              <div key={t.id} className="bg-zinc-900/50 rounded-2xl p-4 flex items-center justify-between group hover:bg-zinc-900 transition-all border border-white/5 card-3d">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    t.amount > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {t.amount > 0 ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white group-hover:text-amber-500 transition-colors">{t.description}</p>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{format(new Date(t.created_at), 'MMM dd, yyyy • p')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-black ${t.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {t.amount > 0 ? '+' : ''}{t.amount}
                  </p>
                  <p className="text-[8px] text-zinc-600 uppercase font-black tracking-widest">{t.type}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-zinc-900 rounded-2xl border border-white/10 border-dashed border-2">
              <History size={48} className="mx-auto text-zinc-700 mb-4 opacity-50" />
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No transactions yet</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const ProfilePage = () => {
  const { user, logout, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [uid, setUid] = useState(user?.uid || '');
  const [ign, setIgn] = useState(user?.ign || '');
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    const res = await apiFetch('/api/wallet/history');
    if (res.ok) setHistory(await res.json());
    setLoadingHistory(false);
  };

  useEffect(() => {
    if (showTransactionHistory) {
      fetchHistory();
    }
  }, [showTransactionHistory]);

  const handleUpdate = async (e: any) => {
    e.preventDefault();
    const res = await apiFetch('/api/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, uid, ign })
    });
    if (res.ok) {
      toast.success('Profile updated!');
      
      // Update Firebase RTDB for real-time sync
      const db = getFirebaseDb();
      const targetUid = uid || user?.uid;
      if (db && targetUid) {
        update(ref(db, `users/${targetUid}`), {
          name: name,
          uid: uid,
          ign: ign
        }).catch(e => console.error("Firebase sync error:", e));
      }
      
      setIsEditing(false);
      refreshUser();
    } else {
      toast.error('Failed to update profile');
    }
  };

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const res = await apiFetch('/api/user/photo', {
        method: 'PUT',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        toast.success('Photo updated!');
        
        // Update Firebase RTDB for real-time sync
        const db = getFirebaseDb();
        const targetUid = user?.uid;
        if (db && targetUid) {
          update(ref(db, `users/${targetUid}`), {
            profile_photo_url: data.photoUrl
          }).catch(e => console.error("Firebase sync error:", e));
        }
        
        refreshUser();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Failed to upload photo');
      }
    } catch (error: any) {
      console.error('Photo upload error:', error);
      toast.error('Network error during upload');
    }
  };

  const handlePasswordChange = async (e: any) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error('Please fill all fields');
      return;
    }
    setIsChangingPassword(true);
    const res = await apiFetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    if (res.ok) {
      toast.success('Password changed successfully!');
      setShowPasswordChange(false);
      setCurrentPassword('');
      setNewPassword('');
    } else {
      const data = await res.json();
      toast.error(data.error || 'Failed to change password');
    }
    setIsChangingPassword(false);
  };

  const syncToFirebase = async () => {
    const db = getFirebaseDb();
    const targetUid = user?.uid;
    if (db && targetUid) {
      try {
        await update(ref(db, `users/${targetUid}`), {
          name: user.name,
          ign: user.ign || '',
          profile_photo_url: user.profile_photo_url || '',
          header_bg_url: user.header_bg_url || '',
          is_verified: user.is_verified || 0
        });
        toast.success('Firebase data synced!');
      } catch (e) {
        console.error("Firebase sync error:", e);
        toast.error('Failed to sync with Firebase');
      }
    } else {
      toast.error('Firebase not configured or UID missing');
    }
  };

  return (
    <div className="space-y-6 pb-24 pt-4 max-w-2xl mx-auto">
      <div className="flex justify-between items-center px-2 mb-2">
        <h2 className="text-xl font-black text-white uppercase tracking-tighter">Profile Protocol</h2>
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 ${isFirebaseConfigured() ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isFirebaseConfigured() ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            {isFirebaseConfigured() ? 'Firebase Online' : 'Firebase Offline'}
          </div>
          <button 
            onClick={syncToFirebase}
            className="p-2 bg-black hover:bg-black rounded-xl border border-white/5 transition-all text-slate-400 hover:text-primary"
            title="Force Sync to Firebase"
          >
            <Zap size={16} />
          </button>
        </div>
      </div>
      {/* Profile Header Card */}
      <div className="bg-zinc-900/50 backdrop-blur-xl rounded-3xl p-8 relative overflow-hidden flex flex-col items-center text-center border border-white/10 shadow-2xl">
        {/* Removed blur circle */}
        
        {/* Profile Photo */}
        <div className="relative group mb-8">
          <div className="w-24 h-24 rounded-2xl bg-zinc-900 p-1 border border-white/10 transition-all duration-300 group-hover:scale-105 shadow-lg">
            <div className="w-full h-full rounded-xl bg-zinc-800 flex items-center justify-center overflow-hidden">
              {user?.profile_photo_url ? (
                <img src={user.profile_photo_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon size={56} className="text-zinc-700" />
              )}
            </div>
          </div>
          <label className="absolute -bottom-2 -right-2 p-3 bg-white rounded-2xl cursor-pointer hover:scale-110 transition-all border border-white/20 shadow-lg">
            <Plus size={18} className="text-black" />
            <input type="file" className="hidden" onChange={handlePhotoUpload} accept="image/*" />
          </label>
        </div>

        {/* User Info */}
        <div className="relative z-10 w-full">
          <h2 className="text-3xl font-black text-white tracking-tight mb-2 flex items-center justify-center gap-3">
            {user?.name}
            {user?.is_verified === 1 && <CheckCircle size={24} className="text-blue-500 fill-blue-500/10" />}
          </h2>
          <div className="flex flex-col items-center gap-1.5 mb-6">
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em]">
              UID: <span className="text-zinc-300">{user?.uid || 'Not Set'}</span>
            </p>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em]">
              IGN: <span className="text-zinc-300">{user?.ign || 'Not Set'}</span>
            </p>
          </div>
          
          <div className="flex justify-center gap-3">
            <span className="px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] font-bold text-amber-500 uppercase tracking-widest">
              {user?.role === 'super_admin' ? 'Super Admin' : user?.role === 'admin' ? 'Admin' : 'Elite Player'}
            </span>
            {user?.is_verified === 1 && (
              <span className="px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                Verified Account
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Gaming Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox label="Matches" value={user?.matches_played || 0} icon={<Gamepad2 size={20} />} />
        <StatBox label="Wins" value={Math.floor((user?.matches_played || 0) * 0.4)} icon={<Trophy size={20} />} />
        <StatBox label="Win Rate" value="42%" icon={<TrendingUp size={20} />} />
        <StatBox label="K/D Ratio" value="2.45" icon={<Award size={20} />} />
      </div>


      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ActionButton 
          label="Transaction History" 
          icon={<History size={22} />} 
          onClick={() => setShowTransactionHistory(true)} 
          description="View your past wallet transactions"
        />
        <ActionButton 
          label="Edit Profile" 
          icon={<Settings size={22} />} 
          onClick={() => setIsEditing(true)} 
          description="Update your gaming identity"
        />
        <ActionButton 
          label="Security" 
          icon={<Key size={22} />} 
          onClick={() => setShowPasswordChange(true)} 
          description="Change your account password"
        />
        <ActionButton 
          label="Help Support" 
          icon={<MessageCircle size={22} />} 
          onClick={() => window.open('https://wa.me/8801908391278', '_blank')} 
          description="Contact us on WhatsApp"
        />
        <button 
          onClick={logout} 
          className="bg-red-500/5 hover:bg-red-500/10 p-4 rounded-2xl flex items-center gap-4 transition-all group border border-red-500/20"
        >
          <div className="p-4 bg-red-500/10 rounded-2xl text-red-400 group-hover:scale-110 transition-transform">
            <LogOut size={28} />
          </div>
          <div className="text-left">
            <p className="font-black text-white uppercase tracking-wider text-sm">Logout</p>
            <p className="text-[10px] text-slate-500 font-medium">Sign out of your session</p>
          </div>
        </button>
      </div>

      {/* Transaction History Modal */}
      <AnimatePresence>
        {showTransactionHistory && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 w-full max-w-md rounded-3xl p-6 max-h-[80vh] flex flex-col border border-white/10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-white tracking-tight">Transaction History</h3>
                <button onClick={() => setShowTransactionHistory(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {loadingHistory ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Loading History...</p>
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">No transactions found</p>
                  </div>
                ) : (
                  history.map((tx: any) => (
                    <div className="p-4 flex justify-between items-center bg-black rounded-2xl border border-white/5 card-3d">
                      <div>
                        <p className="text-sm font-bold text-white">{tx.description}</p>
                        <p className="text-[10px] text-zinc-500 font-medium">{format(new Date(tx.created_at), 'MMM dd, hh:mm a')}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-black ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount}
                        </p>
                        <p className="text-[8px] text-zinc-600 uppercase font-bold tracking-tighter">BDT</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 w-full max-w-md rounded-3xl p-6 border border-white/10 shadow-2xl"
            >
              <h3 className="text-2xl font-black text-white mb-6 tracking-tight">Edit Gaming Profile</h3>
              <form onSubmit={handleUpdate} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest ml-1">Full Name</label>
                  <input type="text" className="input-field w-full bg-black border-white/10 focus:border-amber-500/50" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest ml-1">Free Fire UID</label>
                  <input type="text" className="input-field w-full bg-black border-white/10 focus:border-amber-500/50" value={uid} onChange={e => setUid(e.target.value)} placeholder="e.g. 123456789" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest ml-1">In-Game Name (IGN)</label>
                  <input type="text" className="input-field w-full bg-black border-white/10 focus:border-amber-500/50" value={ign} onChange={e => setIgn(e.target.value)} placeholder="e.g. ProPlayer_FF" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsEditing(false)} 
                    className="flex-1 py-4 rounded-2xl bg-black text-zinc-400 font-bold text-xs uppercase tracking-widest hover:bg-white/5 transition-all border border-white/5"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 bg-white py-4 rounded-2xl text-black font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all">
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Security (Password Change) Modal */}
      <AnimatePresence>
        {showPasswordChange && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 w-full max-w-md rounded-3xl p-6 border border-white/10 shadow-2xl"
            >
              <h3 className="text-2xl font-black text-white mb-6 tracking-tight">Security Protocol</h3>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-6">Update your access credentials</p>
              
              <form onSubmit={handlePasswordChange} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest ml-1">Current Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock size={16} className="text-zinc-600 group-focus-within:text-amber-500 transition-colors" />
                    </div>
                    <input 
                      type="password" 
                      className="input-field w-full bg-black border-white/10 !pl-12 focus:border-amber-500/50" 
                      value={currentPassword} 
                      onChange={e => setCurrentPassword(e.target.value)} 
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest ml-1">New Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Key size={16} className="text-zinc-600 group-focus-within:text-amber-500 transition-colors" />
                    </div>
                    <input 
                      type="password" 
                      className="input-field w-full bg-black border-white/10 !pl-12 focus:border-amber-500/50" 
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)} 
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowPasswordChange(false)} 
                    className="flex-1 py-4 rounded-2xl bg-black text-zinc-400 font-bold text-xs uppercase tracking-widest hover:bg-white/5 transition-all border border-white/5"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isChangingPassword}
                    className="flex-1 bg-white py-4 rounded-2xl text-black font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
                  >
                    {isChangingPassword ? (
                      <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    ) : (
                      'Update Key'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

const StatBox = ({ label, value, icon }: any) => {
  return (
    <div className="p-3 rounded-2xl bg-zinc-900/50 backdrop-blur-xl flex flex-col items-center text-center group hover:scale-105 transition-all duration-300 border border-white/10 shadow-lg">
      <div className="p-2.5 rounded-xl mb-3 text-amber-500 bg-amber-500/10 border border-amber-500/20 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-1">{label}</p>
      <p className="text-lg font-black text-white">{value}</p>
    </div>
  );
};

const ActionButton = ({ label, icon, onClick, description }: any) => (
  <button 
    onClick={onClick}
    className="glass-card p-4 flex items-center gap-4 hover:border-amber-500/30 transition-all group shadow-lg text-left w-full"
  >
    <div className="p-3 bg-black rounded-xl text-amber-500 group-hover:scale-110 transition-transform group-hover:bg-amber-500/10 border border-white/5 shadow-inner">
      {icon}
    </div>
    <div>
      <p className="font-black text-white uppercase tracking-wider text-sm group-hover:text-amber-500 transition-colors">{label}</p>
      <p className="text-[10px] text-zinc-500 font-bold">{description}</p>
    </div>
  </button>
);

const AdminDashboard = ({ onTournamentCreated }: { onTournamentCreated: () => void }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [withdraws, setWithdraws] = useState<WithdrawRequest[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [adminTournaments, setAdminTournaments] = useState<Tournament[]>([]);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingTournament, setEditingTournament] = useState<any>(null);
  const [managingResults, setManagingResults] = useState<any>(null);
  const [tournamentResults, setTournamentResults] = useState<any[]>([]);
  const [showCreateTournament, setShowCreateTournament] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', phone: '', password: '', uid: '', ign: '', role: 'user' });
  const [showFirebaseSetup, setShowFirebaseSetup] = useState(false);
  const [addingUserToTournament, setAddingUserToTournament] = useState<any>(null);
  const [tournamentToJoin, setTournamentToJoin] = useState<string>('');
  const [tournamentPlayerNames, setTournamentPlayerNames] = useState<string>('');
  const [newTournament, setNewTournament] = useState({
    title: '', entry_fee: '', prize_pool: '', game_type: 'Solo', map: 'Bermuda', total_slots: '48', match_time: '', room_id: '', room_password: '', rules: '', prize_details: ''
  });
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [firebaseConfigJson, setFirebaseConfigJson] = useState('');
  const [isFirebaseSaving, setIsFirebaseSaving] = useState(false);

  useEffect(() => {
    fetchAdminData();
    fetchFirebaseConfig();
  }, []);

  const fetchFirebaseConfig = async () => {
    const res = await apiFetch('/api/settings/firebase');
    if (res.ok) {
      const data = await res.json();
      if (data) {
        setFirebaseConfigJson(JSON.stringify(data, null, 2));
      }
    }
  };

  const handleSaveFirebaseConfig = async () => {
    try {
      setIsFirebaseSaving(true);
      let configStr = firebaseConfigJson.trim();
      
      // Basic cleanup if user pasted the whole JS declaration
      if (configStr.includes('const firebaseConfig =')) {
        configStr = configStr.split('const firebaseConfig =')[1].split(';')[0].trim();
      } else if (configStr.includes('firebaseConfig =')) {
        configStr = configStr.split('firebaseConfig =')[1].split(';')[0].trim();
      }
      
      // Try to parse it. If it fails, it might be a JS object literal (unquoted keys)
      let config;
      try {
        config = JSON.parse(configStr);
      } catch (e) {
        // Attempt to fix unquoted keys and single quotes using regex
        const fixedJson = configStr
          .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":') // Wrap keys in quotes
          .replace(/'/g, '"') // Replace single quotes with double quotes
          .replace(/,\s*([}\]])/g, '$1'); // Remove trailing commas
        config = JSON.parse(fixedJson);
      }

      if (!config.apiKey || !config.databaseURL || !config.projectId) {
        throw new Error('Missing required fields (apiKey, databaseURL, or projectId)');
      }

      const res = await apiFetch('/api/admin/settings/firebase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config })
      });
      if (res.ok) {
        toast.success('Firebase configuration saved!');
        // Reload page to re-initialize firebase
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error('Failed to save configuration');
      }
    } catch (e: any) {
      console.error('Config error:', e);
      toast.error(e.message || 'Invalid JSON format');
    } finally {
      setIsFirebaseSaving(false);
    }
  };

  const fetchTournamentResults = async (id: number) => {
    const res = await apiFetch(`/api/tournaments/${id}`);
    if (res.ok) {
      const data = await res.json();
      setTournamentResults(data.participants || []);
      setManagingResults(data);
    }
  };

  const handleUpdateResults = async () => {
    const res = await apiFetch(`/api/admin/tournaments/${managingResults.id}/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results: tournamentResults })
    });
    if (res.ok) {
      // Sync to Firebase for real-time updates
      const db = getFirebaseDb();
      if (db && managingResults) {
        update(ref(db, `tournaments/${managingResults.id}`), {
          status: 'completed',
          updated_at: serverTimestamp()
        }).catch(e => console.error("Firebase sync error:", e));
      }
      toast.success('Results updated successfully!');
      setManagingResults(null);
    } else {
      toast.error('Failed to update results');
    }
  };

  const fetchAdminData = async () => {
    const [sRes, pRes, wRes, uRes, tRes] = await Promise.all([
      apiFetch('/api/admin/stats'),
      apiFetch('/api/admin/payments'),
      apiFetch('/api/admin/withdraws'),
      apiFetch('/api/admin/users'),
      apiFetch('/api/tournaments')
    ]);
    if (sRes.ok) setStats(await sRes.json());
    if (pRes.ok) setPayments(await pRes.json());
    if (wRes.ok) setWithdraws(await wRes.json());
    if (uRes.ok) setUsers(await uRes.json());
    if (tRes.ok) setAdminTournaments(await tRes.json());
  };

  const handleCreateTournament = async (e: any) => {
    e.preventDefault();
    const formData = new FormData();
    Object.entries(newTournament).forEach(([key, value]) => formData.append(key, value as string));
    if (thumbnail) formData.append('thumbnail', thumbnail);

    const res = await apiFetch('/api/admin/tournaments', {
      method: 'POST',
      body: formData
    });

    if (res.ok) {
      const data = await res.json();
      const tournamentId = data.id;
      
      // Sync to Firebase for real-time updates
      const db = getFirebaseDb();
      if (db && tournamentId) {
        set(ref(db, `tournaments/${tournamentId}`), {
          ...newTournament,
          id: tournamentId,
          filled_slots: 0,
          status: 'upcoming',
          created_at: serverTimestamp(),
          last_updated: serverTimestamp()
        }).then(() => {
          console.log("Tournament synced to Firebase");
        }).catch(e => console.error("Firebase sync error:", e));
      }

      toast.success('Tournament created!');
      setShowCreateTournament(false);
      setNewTournament({ title: '', entry_fee: '', prize_pool: '', game_type: 'Solo', map: 'Bermuda', total_slots: '48', match_time: '', room_id: '', room_password: '', rules: '', prize_details: '' });
      setThumbnail(null);
      fetchAdminData();
      onTournamentCreated();
    } else {
      toast.error('Failed to create tournament');
    }
  };

  const handleUpdateTournament = async (e: any) => {
    e.preventDefault();
    const formData = new FormData();
    Object.entries(editingTournament).forEach(([key, value]) => {
      if (value !== null) formData.append(key, value as string);
    });
    if (thumbnail) formData.append('thumbnail', thumbnail);

    const res = await apiFetch(`/api/admin/tournaments/${editingTournament.id}`, {
      method: 'PUT',
      body: formData
    });

    if (res.ok) {
      // Sync to Firebase for real-time updates
      const db = getFirebaseDb();
      if (db) {
        update(ref(db, `tournaments/${editingTournament.id}`), {
          ...editingTournament,
          updated_at: serverTimestamp()
        }).catch(e => console.error("Firebase sync error:", e));
      }

      toast.success('Tournament updated!');
      setEditingTournament(null);
      setThumbnail(null);
      fetchAdminData();
      onTournamentCreated();
    } else {
      toast.error('Failed to update tournament');
    }
  };

  const handleDeleteTournament = async (id: number) => {
    if (!confirm('Are you sure you want to delete this tournament?')) return;
    
    const res = await apiFetch(`/api/admin/tournaments/${id}`, { method: 'DELETE' });
    if (res.ok) {
      // Sync to Firebase - Remove the tournament
      const db = getFirebaseDb();
      if (db) {
        remove(ref(db, `tournaments/${id}`))
          .then(() => {
            console.log("Tournament removed from Firebase");
          })
          .catch(e => console.error("Firebase delete error:", e));
      }

      toast.success('Tournament deleted!');
      fetchAdminData();
      onTournamentCreated();
    } else {
      toast.error('Failed to delete tournament');
    }
  };

  const handleUserPhotoUpdate = async (userId: number, file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    const res = await apiFetch(`/api/admin/users/${userId}/photo`, {
      method: 'PUT',
      body: formData
    });
    if (res.ok) {
      toast.success('User photo updated!');
      fetchAdminData();
    } else {
      toast.error('Failed to update user photo');
    }
  };

  const handleCreateUser = async (e: any) => {
    e.preventDefault();
    const res = await apiFetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    });
    if (res.ok) {
      toast.success('User created successfully!');
      setShowCreateUser(false);
      setNewUser({ name: '', email: '', phone: '', password: '', uid: '', ign: '', role: 'user' });
      fetchAdminData();
    } else {
      const data = await res.json();
      toast.error(data.error || 'Failed to create user');
    }
  };

  const handleAddUserToTournament = async (e: any) => {
    e.preventDefault();
    if (!tournamentToJoin) return toast.error('Please select a tournament');
    
    const names = tournamentPlayerNames.split(',').map(n => n.trim()).filter(n => n);
    if (names.length === 0) return toast.error('Please enter at least one player name');

    const res = await apiFetch(`/api/admin/tournaments/${tournamentToJoin}/add-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: addingUserToTournament.id, playerNames: names })
    });

    if (res.ok) {
      toast.success('User added to tournament!');
      setAddingUserToTournament(null);
      setTournamentToJoin('');
      setTournamentPlayerNames('');
      fetchAdminData();
      onTournamentCreated(); // refresh tournaments
    } else {
      const data = await res.json();
      toast.error(data.error || 'Failed to add user to tournament');
    }
  };

  const handleUpdateUser = async (e: any) => {
    e.preventDefault();
    const res = await apiFetch(`/api/admin/users/${editingUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingUser)
    });
    if (res.ok) {
      toast.success('User updated successfully!');
      
      // Update Firebase RTDB for real-time sync if user has an email
      const db = getFirebaseDb();
      if (db && editingUser.email) {
        const sanitizedEmail = editingUser.email.replace(/\./g, ',');
        update(ref(db, `users_by_email/${sanitizedEmail}`), {
          name: editingUser.name,
          ign: editingUser.ign,
          profile_photo_url: editingUser.profile_photo_url,
          is_verified: editingUser.is_verified ? 1 : 0,
          wallet_balance: editingUser.wallet_balance,
          bonus_balance: editingUser.bonus_balance,
          winning_balance: editingUser.winning_balance
        }).catch(e => console.error("Firebase sync error:", e));
      }
      
      setEditingUser(null);
      fetchAdminData();
    } else {
      const data = await res.json();
      toast.error(data.error);
    }
  };

  const verifyPayment = async (id: number, status: string) => {
    const res = await apiFetch(`/api/admin/payments/${id}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      toast.success(`Payment ${status}`);
      fetchAdminData();
    }
  };

  const [adjustingBalance, setAdjustingBalance] = useState<any>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [adjustmentDescription, setAdjustmentDescription] = useState('');

  const handleAdjustBalance = async (e: any) => {
    e.preventDefault();
    if (!adjustmentAmount || parseFloat(adjustmentAmount) <= 0) {
      toast.error('Invalid amount');
      return;
    }

    const res = await apiFetch(`/api/admin/users/${adjustingBalance.id}/adjust-balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: adjustmentType,
        amount: parseFloat(adjustmentAmount),
        description: adjustmentDescription
      })
    });

    if (res.ok) {
      toast.success('Balance adjusted successfully!');
      setAdjustingBalance(null);
      setAdjustmentAmount('');
      setAdjustmentDescription('');
      fetchAdminData();
    } else {
      const data = await res.json();
      toast.error(data.error || 'Failed to adjust balance');
    }
  };

  const verifyWithdraw = async (id: number, status: string) => {
    const res = await apiFetch(`/api/admin/withdraws/${id}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      toast.success(`Withdraw ${status}`);
      fetchAdminData();
    }
  };

  return (
    <div className="space-y-4 pb-20 pt-2 max-w-5xl mx-auto">
      {/* Admin Header Card */}
      <div className="glass-card p-6 relative overflow-hidden flex flex-col items-center text-center shadow-2xl group">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* Profile Photo */}
        <div className="relative group mb-6 z-10">
          <div className="w-24 h-24 rounded-2xl bg-zinc-900 p-1 border border-white/10 transition-all duration-300 shadow-lg group-hover:shadow-amber-500/20 group-hover:border-amber-500/30">
            <div className="w-full h-full rounded-xl bg-zinc-800 flex items-center justify-center overflow-hidden relative">
              {user?.profile_photo_url ? (
                <img src={user.profile_photo_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon size={40} className="text-zinc-700" />
              )}
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="relative z-10 w-full">
          <p className="text-amber-500 text-[10px] font-bold uppercase tracking-[0.3em] mb-2">Welcome back,</p>
          <h1 className="text-3xl font-black text-white tracking-tight mb-4 drop-shadow-lg">
            {user?.name}
          </h1>
          
          <div className="flex justify-center gap-2">
            <div className="px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
              <Shield size={12} />
              {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ActionButton 
          label="Firebase Setup" 
          description={isFirebaseConfigured() ? "Configured & Active" : "Not Configured"}
          icon={<Database className={isFirebaseConfigured() ? "text-emerald-400" : "text-amber-400"} />} 
          onClick={() => setShowFirebaseSetup(!showFirebaseSetup)} 
        />
        <ActionButton 
          label="Create Tournament" 
          description="Launch a new match"
          icon={<Plus className="text-white" />} 
          onClick={() => setShowCreateTournament(!showCreateTournament)} 
        />
      </div>

      <AnimatePresence>
        {showFirebaseSetup && (
          <motion.section 
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="glass-card p-6 overflow-hidden relative shadow-2xl"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                  <Database size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">অনলাইন সিঙ্ক (Firebase)</h2>
                  <p className="text-sm text-zinc-500 max-w-xs">একাধিক ডিভাইসে অ্যাপটি রিয়েল-টাইমে চালানোর জন্য কনফিগার করুন।</p>
                </div>
              </div>
              <div className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2 border ${isFirebaseConfigured() ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                <div className={`w-2 h-2 rounded-full ${isFirebaseConfigured() ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {isFirebaseConfigured() ? 'Configured' : 'Not Configured'}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
              {/* Step 1: Rules */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 border border-white/5">?</div>
                  <h3 className="font-bold text-white">মাল্টি-ডিভাইস সেটআপ গাইড</h3>
                </div>

                <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/50" />
                  <h4 className="font-bold text-amber-500 flex items-center gap-2">ধাপ ১: ডাটাবেস রুলস (জরুরী)</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    মাল্টি-ডিভাইস কাজ না করার প্রধান কারণ পারমিশন না থাকা। Firebase Console &gt; Realtime Database &gt; Rules-এ গিয়ে নিচের কোডটি পেস্ট করে Publish করুন:
                  </p>
                  <div className="bg-black rounded-2xl p-4 font-mono text-[10px] text-emerald-400 border border-white/5 relative group">
                    <pre>{`{
  "rules": {
    ".read": true,
    ".write": true
  }
}`}</pre>
                    <button 
                      onClick={() => { navigator.clipboard.writeText('{\n  "rules": {\n    ".read": true,\n    ".write": true\n  }\n}'); toast.success('Rules Copied'); }}
                      className="absolute top-3 right-3 p-2 bg-zinc-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-zinc-800 border border-white/10"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-white flex items-center gap-2 text-sm">ধাপ ২: কনফিগারেশন</h4>
                  <ul className="text-xs text-zinc-500 space-y-2 list-disc list-inside marker:text-amber-500">
                    <li>Firebase Project Settings &gt; General &gt; Your apps এ যান।</li>
                    <li>NPM বা CDN যেকোনো অপশন সিলেক্ট করুন।</li>
                    <li><code className="text-amber-500 font-bold bg-amber-500/10 px-1 rounded">const firebaseConfig = ...</code> কোডটি কপি করুন।</li>
                    <li>পাশের বক্সে পেস্ট করে সেভ করুন।</li>
                  </ul>
                  <a 
                    href="https://console.firebase.google.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-amber-500 text-xs font-bold hover:underline mt-2 hover:text-amber-400 transition-colors"
                  >
                    Firebase Console-এ যান <ArrowUpRight size={14} />
                  </a>
                </div>
              </div>

              {/* Step 2: Config Input */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Firebase Config Code</label>
                  {firebaseConfigJson && <span className="text-[10px] text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20"><Check size={12} /> Saved</span>}
                </div>
                <div className="relative group">
                  <textarea 
                    value={firebaseConfigJson}
                    onChange={(e) => setFirebaseConfigJson(e.target.value)}
                    placeholder={`{
  "apiKey": "...",
  "authDomain": "...",
  "databaseURL": "...",
  "projectId": "...",
  "storageBucket": "...",
  "messagingSenderId": "...",
  "appId": "..."
}`}
                    className="w-full h-64 bg-black border border-white/10 rounded-2xl p-4 font-mono text-xs text-zinc-300 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all custom-scrollbar resize-none outline-none group-hover:border-white/20"
                  />
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setFirebaseConfigJson('')}
                    className="flex-1 py-4 px-6 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-2xl font-bold text-sm transition-all border border-red-500/20 active:scale-95"
                  >
                    রিমুভ করুন
                  </button>
                  <button 
                    onClick={handleSaveFirebaseConfig}
                    disabled={isFirebaseSaving || !firebaseConfigJson.trim()}
                    className="flex-[2] py-4 px-6 bg-white hover:bg-zinc-200 text-black rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                  >
                    {isFirebaseSaving ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-4 h-4 border-2 border-black border-t-transparent rounded-full" />
                    ) : (
                      <CheckCircle size={18} />
                    )}
                    সেভ করুন
                  </button>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats?.totalUsers || 0} icon={<Users className="text-white" />} />
        <StatCard label="Total Earnings" value={`৳${stats?.totalEarnings || 0}`} icon={<TrendingUp className="text-white" />} />
        <StatCard label="Pending Deposits" value={stats?.pendingPayments || 0} icon={<CreditCard className="text-white" />} />
        <StatCard label="Withdraw Requests" value={stats?.pendingWithdraws || 0} icon={<ArrowDownLeft className="text-white" />} />
      </div>

      <AnimatePresence>
        {showCreateTournament && (
          <motion.section 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-6 overflow-hidden shadow-2xl"
          >
            <h3 className="font-bold mb-4 text-white text-lg flex items-center gap-2">
              <Plus size={20} className="text-amber-500" /> New Tournament
            </h3>
              <form onSubmit={handleCreateTournament} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Title" className="input-field" value={newTournament.title} onChange={e => setNewTournament({...newTournament, title: e.target.value})} required />
                <input type="number" placeholder="Entry Fee" className="input-field" value={newTournament.entry_fee} onChange={e => setNewTournament({...newTournament, entry_fee: e.target.value})} required />
                <input type="number" placeholder="Prize Pool" className="input-field" value={newTournament.prize_pool} onChange={e => setNewTournament({...newTournament, prize_pool: e.target.value})} required />
                <select className="input-field" value={newTournament.game_type} onChange={e => setNewTournament({...newTournament, game_type: e.target.value})}>
                  <option value="Solo">Solo</option>
                  <option value="Duo">Duo</option>
                  <option value="Squad">Squad</option>
                </select>
                <select className="input-field" value={newTournament.map} onChange={e => setNewTournament({...newTournament, map: e.target.value})}>
                  <option value="Bermuda">Bermuda</option>
                  <option value="Purgatory">Purgatory</option>
                  <option value="Kalahari">Kalahari</option>
                  <option value="Alpine">Alpine</option>
                  <option value="Neoterra">Neoterra</option>
                  <option value="Bermuda Remastered">Bermuda Remastered</option>
                  <option value="Clash Squad">Clash Squad</option>
                  <option value="Lone Wolf">Lone Wolf</option>
                </select>
                <input type="number" placeholder="Total Slots" className="input-field" value={newTournament.total_slots} onChange={e => setNewTournament({...newTournament, total_slots: e.target.value})} required />
                <input type="datetime-local" className="input-field" value={newTournament.match_time} onChange={e => setNewTournament({...newTournament, match_time: e.target.value})} required />
                <input type="text" placeholder="Room ID (Optional)" className="input-field" value={newTournament.room_id} onChange={e => setNewTournament({...newTournament, room_id: e.target.value})} />
                <input type="text" placeholder="Room Password (Optional)" className="input-field" value={newTournament.room_password} onChange={e => setNewTournament({...newTournament, room_password: e.target.value})} />
                <div className="md:col-span-2">
                  <textarea placeholder="Match Rules" className="input-field w-full h-24" value={newTournament.rules} onChange={e => setNewTournament({...newTournament, rules: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <textarea placeholder="Prize Details" className="input-field w-full h-24" value={newTournament.prize_details} onChange={e => setNewTournament({...newTournament, prize_details: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-zinc-500 mb-1 ml-1 font-bold uppercase tracking-wider">Thumbnail</label>
                  <input type="file" className="input-field w-full pt-3" onChange={e => setThumbnail(e.target.files?.[0] || null)} accept="image/*" />
                </div>
                <button type="submit" className="bg-white text-black font-bold py-3.5 rounded-xl hover:bg-zinc-200 transition-all md:col-span-2 uppercase tracking-widest text-xs shadow-lg shadow-white/10 active:scale-[0.98]">Create Tournament</button>
              </form>
          </motion.section>
        )}
      </AnimatePresence>

      <section>
        <h3 className="font-bold mb-4 flex items-center gap-2 text-white">
          <Trophy size={18} className="text-amber-500" /> Tournament Management
        </h3>
        <div className="space-y-4">
          {adminTournaments.map((t: any) => (
            <div key={t.id} className="glass-card p-3 flex items-center justify-between shadow-lg group hover:border-amber-500/20 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-black overflow-hidden border border-white/10 relative shadow-md">
                  {t.thumbnail_url ? (
                    <img src={t.thumbnail_url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500">
                      <Trophy size={20} />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-bold text-sm text-white group-hover:text-amber-500 transition-colors">{t.title}</p>
                  <p className="text-[10px] text-zinc-500">{t.game_type} • {t.map}</p>
                  <p className="text-[10px] text-amber-500 font-bold">{format(new Date(t.match_time), 'MMM dd, p')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => fetchTournamentResults(t.id)}
                  className="p-2 bg-black rounded-lg text-zinc-400 hover:text-white transition-colors border border-white/5 hover:border-white/20"
                  title="Manage Results"
                >
                  <List size={16} />
                </button>
                <button 
                  onClick={() => setEditingTournament(t)}
                  className="p-2 bg-black rounded-lg text-zinc-400 hover:text-white transition-colors border border-white/5 hover:border-white/20"
                >
                  <Edit size={16} />
                </button>
                <button 
                  onClick={() => handleDeleteTournament(t.id)}
                  className="p-2 bg-black rounded-lg text-zinc-400 hover:text-red-400 transition-colors border border-white/5 hover:border-red-500/20"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold flex items-center gap-2 text-white">
            <Users size={18} className="text-amber-500" /> User Management
          </h3>
          <button 
            onClick={() => setShowCreateUser(!showCreateUser)}
            className="px-3 py-1.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-amber-500 hover:text-black transition-all flex items-center gap-1"
          >
            <Plus size={14} /> Add User
          </button>
        </div>
        
        <AnimatePresence>
          {showCreateUser && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-card p-5 mb-4 shadow-lg border border-amber-500/20"
            >
              <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Name" className="input-field" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required />
                <input type="email" placeholder="Email" className="input-field" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
                <input type="tel" placeholder="Phone" className="input-field" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} required />
                <input type="text" placeholder="Password" className="input-field" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
                <input type="text" placeholder="UID (Optional)" className="input-field" value={newUser.uid} onChange={e => setNewUser({...newUser, uid: e.target.value})} />
                <input type="text" placeholder="IGN (Optional)" className="input-field" value={newUser.ign} onChange={e => setNewUser({...newUser, ign: e.target.value})} />
                <select className="input-field" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                  <option value="user">User</option>
                  <option value="elite">Elite Player</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
                <button type="submit" className="bg-amber-500 text-black font-bold py-3 rounded-xl hover:bg-amber-400 transition-all uppercase tracking-widest text-xs shadow-lg shadow-amber-500/20 active:scale-[0.98] md:col-span-2">
                  Create User
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          {users.map((u: any) => (
            <div key={u.id} className="glass-card p-3 flex items-center justify-between shadow-lg group hover:border-white/20 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-black overflow-hidden border border-white/10 relative group/photo shadow-md">
                  {u.profile_photo_url ? (
                    <img src={u.profile_photo_url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500">
                      <UserIcon size={24} />
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 cursor-pointer transition-opacity backdrop-blur-[1px]">
                    <Plus size={16} className="text-white" />
                    <input 
                      type="file" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUserPhotoUpdate(u.id, file);
                      }} 
                      accept="image/*" 
                    />
                  </label>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm flex items-center gap-1 text-white group-hover:text-amber-500 transition-colors">
                      {u.name}
                      {u.is_verified === 1 && <CheckCircle size={12} className="text-blue-500 fill-blue-500/10" />}
                    </p>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase border ${u.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                      {u.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500">{u.email}</p>
                  <p className="text-[10px] text-amber-500 font-bold font-mono">UID: {u.uid || 'N/A'}</p>
                  {u.raw_password && (
                    <p className="text-[10px] text-red-400 font-mono mt-0.5">Pass: {u.raw_password}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs font-bold text-white">৳{u.wallet_balance + u.winning_balance}</p>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{u.role}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setAddingUserToTournament(u)}
                    className="p-2 bg-amber-500/10 rounded-lg text-amber-400 hover:bg-amber-500/20 transition-all border border-amber-500/20"
                    title="Add to Tournament"
                  >
                    <Gamepad2 size={16} />
                  </button>
                  <button 
                    onClick={() => setAdjustingBalance(u)}
                    className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition-all border border-emerald-500/20"
                    title="Adjust Balance"
                  >
                    <Wallet size={16} />
                  </button>
                  <button 
                    onClick={() => setEditingUser(u)}
                    className="p-2 bg-black rounded-lg text-zinc-400 hover:text-white transition-colors border border-white/5 hover:border-white/20"
                  >
                    <Edit size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <AnimatePresence>
        {adjustingBalance && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-card w-full max-w-sm p-6 relative shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Wallet size={24} className="text-emerald-500" /> Adjust Balance
                </h3>
                <button onClick={() => setAdjustingBalance(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>
              
              <div className="mb-6 p-4 bg-black/50 rounded-2xl border border-white/5 shadow-inner">
                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Current Wallet Balance</p>
                <p className="text-2xl font-black text-white">৳{adjustingBalance.wallet_balance}</p>
              </div>

              <form onSubmit={handleAdjustBalance} className="space-y-4">
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setAdjustmentType('add')}
                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${adjustmentType === 'add' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'border-white/5 bg-black text-zinc-500 hover:bg-white/5'}`}
                  >
                    Add Money
                  </button>
                  <button 
                    type="button"
                    onClick={() => setAdjustmentType('subtract')}
                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${adjustmentType === 'subtract' ? 'border-red-500 bg-red-500/10 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-white/5 bg-black text-zinc-500 hover:bg-white/5'}`}
                  >
                    Subtract
                  </button>
                </div>
                
                <div className="relative group/input">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold group-focus-within/input:text-white transition-colors">৳</span>
                  <input 
                    type="number" 
                    placeholder="AMOUNT" 
                    className="input-field w-full !pl-8" 
                    value={adjustmentAmount}
                    onChange={e => setAdjustmentAmount(e.target.value)}
                    required
                  />
                </div>

                <input 
                  type="text" 
                  placeholder="REASON / DESCRIPTION" 
                  className="input-field w-full" 
                  value={adjustmentDescription}
                  onChange={e => setAdjustmentDescription(e.target.value)}
                  required
                />

                <button type="submit" className="bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition-all w-full uppercase tracking-widest text-xs shadow-lg shadow-white/10 active:scale-[0.98]">
                  Confirm Adjustment
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {managingResults && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-card w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Trophy size={24} className="text-amber-500" /> Manage Results
                  </h3>
                  <p className="text-xs text-zinc-500 font-bold mt-1">{managingResults.title}</p>
                </div>
                <button onClick={() => setManagingResults(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-2 text-[10px] text-zinc-500 uppercase font-black tracking-widest px-2">
                  <div className="col-span-4">Player</div>
                  <div className="col-span-2 text-center">Rank</div>
                  <div className="col-span-2 text-center">Kills</div>
                  <div className="col-span-4 text-right">Winnings (৳)</div>
                </div>
                
                <div className="space-y-2">
                  {tournamentResults.map((p, idx) => (
                    <div key={p.user_id} className="grid grid-cols-12 gap-2 items-center bg-black/50 p-2 rounded-xl border border-white/5 hover:border-white/10 transition-colors group">
                      <div className="col-span-4">
                        <p className="text-xs font-bold text-white truncate group-hover:text-amber-500 transition-colors">{p.name}</p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {(() => {
                            try {
                              const names = p.player_names ? JSON.parse(p.player_names) : [];
                              if (names.length > 0) {
                                return names.map((n: string, ni: number) => (
                                  <span key={ni} className="text-[8px] text-zinc-500 truncate bg-white/5 px-1.5 py-0.5 rounded">
                                    {n}{ni < names.length - 1 ? '' : ''}
                                  </span>
                                ));
                              }
                            } catch (e) {}
                            return <p className="text-[10px] text-zinc-500 truncate">{p.ign}</p>;
                          })()}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <input 
                          type="number" 
                          className="w-full bg-black border border-white/10 rounded-lg text-center text-xs p-2 text-white focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 outline-none transition-all font-mono" 
                          value={p.rank || ''} 
                          onChange={(e) => {
                            const newResults = [...tournamentResults];
                            newResults[idx].rank = e.target.value ? parseInt(e.target.value) : null;
                            setTournamentResults(newResults);
                          }}
                          placeholder="-"
                        />
                      </div>
                      <div className="col-span-2">
                        <input 
                          type="number" 
                          className="w-full bg-black border border-white/10 rounded-lg text-center text-xs p-2 text-white focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 outline-none transition-all font-mono" 
                          value={p.kills || 0} 
                          onChange={(e) => {
                            const newResults = [...tournamentResults];
                            newResults[idx].kills = parseInt(e.target.value) || 0;
                            setTournamentResults(newResults);
                          }}
                        />
                      </div>
                      <div className="col-span-4">
                        <input 
                          type="number" 
                          className="w-full bg-black border border-white/10 rounded-lg text-right text-xs p-2 text-emerald-400 font-bold focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all font-mono" 
                          value={p.winnings || 0} 
                          onChange={(e) => {
                            const newResults = [...tournamentResults];
                            newResults[idx].winnings = parseFloat(e.target.value) || 0;
                            setTournamentResults(newResults);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {tournamentResults.length === 0 && (
                    <p className="text-center py-8 text-zinc-500 text-xs italic">No participants to manage</p>
                  )}
                </div>

                <button 
                  onClick={handleUpdateResults}
                  className="bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition-all w-full uppercase tracking-widest text-xs shadow-lg shadow-white/10 active:scale-[0.98] mt-4"
                >
                  Save All Results
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingTournament && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-card w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Edit size={24} className="text-amber-500" /> Edit Tournament
                </h3>
                <button onClick={() => setEditingTournament(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>
              <form onSubmit={handleUpdateTournament} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Title</label>
                  <input type="text" className="input-field w-full mt-1" value={editingTournament.title} onChange={e => setEditingTournament({...editingTournament, title: e.target.value})} required />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Entry Fee</label>
                  <input type="number" className="input-field w-full mt-1" value={editingTournament.entry_fee} onChange={e => setEditingTournament({...editingTournament, entry_fee: e.target.value})} required />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Prize Pool</label>
                  <input type="number" className="input-field w-full mt-1" value={editingTournament.prize_pool} onChange={e => setEditingTournament({...editingTournament, prize_pool: e.target.value})} required />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Game Type</label>
                  <select className="input-field w-full mt-1" value={editingTournament.game_type} onChange={e => setEditingTournament({...editingTournament, game_type: e.target.value})}>
                    <option value="Solo">Solo</option>
                    <option value="Duo">Duo</option>
                    <option value="Squad">Squad</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Map</label>
                  <select className="input-field w-full mt-1" value={editingTournament.map} onChange={e => setEditingTournament({...editingTournament, map: e.target.value})}>
                    <option value="Bermuda">Bermuda</option>
                    <option value="Purgatory">Purgatory</option>
                    <option value="Kalahari">Kalahari</option>
                    <option value="Alpine">Alpine</option>
                    <option value="Neoterra">Neoterra</option>
                    <option value="Bermuda Remastered">Bermuda Remastered</option>
                    <option value="Clash Squad">Clash Squad</option>
                    <option value="Lone Wolf">Lone Wolf</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Total Slots</label>
                  <input type="number" className="input-field w-full mt-1" value={editingTournament.total_slots} onChange={e => setEditingTournament({...editingTournament, total_slots: e.target.value})} required />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Match Time</label>
                  <input type="datetime-local" className="input-field w-full mt-1" value={editingTournament.match_time} onChange={e => setEditingTournament({...editingTournament, match_time: e.target.value})} required />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Room ID</label>
                  <input type="text" className="input-field w-full mt-1" value={editingTournament.room_id || ''} onChange={e => setEditingTournament({...editingTournament, room_id: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Room Password</label>
                  <input type="text" className="input-field w-full mt-1" value={editingTournament.room_password || ''} onChange={e => setEditingTournament({...editingTournament, room_password: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Match Rules</label>
                  <textarea className="input-field w-full mt-1 h-24" value={editingTournament.rules || ''} onChange={e => setEditingTournament({...editingTournament, rules: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Prize Details</label>
                  <textarea className="input-field w-full mt-1 h-24" value={editingTournament.prize_details || ''} onChange={e => setEditingTournament({...editingTournament, prize_details: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Status</label>
                  <select className="input-field w-full mt-1" value={editingTournament.status} onChange={e => setEditingTournament({...editingTournament, status: e.target.value})}>
                    <option value="upcoming">Upcoming</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-zinc-500 mb-1 ml-1 font-bold uppercase tracking-wider">Thumbnail (Optional)</label>
                  <input type="file" className="input-field w-full pt-3" onChange={e => setThumbnail(e.target.files?.[0] || null)} accept="image/*" />
                </div>
                <button type="submit" className="bg-white text-black font-bold py-3.5 rounded-xl hover:bg-zinc-200 transition-all md:col-span-2 uppercase tracking-widest text-xs shadow-lg shadow-white/10 active:scale-[0.98]">Update Tournament</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {addingUserToTournament && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-card w-full max-w-md p-6 relative shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Gamepad2 size={24} className="text-amber-500" /> Add to Tournament
                </h3>
                <button onClick={() => setAddingUserToTournament(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>
              
              <form onSubmit={handleAddUserToTournament} className="space-y-4">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Select Tournament</label>
                  <select 
                    className="input-field w-full mt-1" 
                    value={tournamentToJoin} 
                    onChange={e => setTournamentToJoin(e.target.value)} 
                    required
                  >
                    <option value="">-- Select Tournament --</option>
                    {adminTournaments.filter(t => t.status === 'upcoming' && t.filled_slots < t.total_slots).map(t => (
                      <option key={t.id} value={t.id}>{t.title} ({t.game_type}) - ৳{t.entry_fee}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Player Names (comma separated)</label>
                  <input 
                    type="text" 
                    className="input-field w-full mt-1" 
                    value={tournamentPlayerNames} 
                    onChange={e => setTournamentPlayerNames(e.target.value)} 
                    placeholder="e.g. Player1, Player2" 
                    required 
                  />
                  <p className="text-[10px] text-zinc-500 mt-1 ml-1">Enter 1 name for Solo, 2 for Duo, 4 for Squad.</p>
                </div>
                <button type="submit" className="bg-amber-500 text-black font-bold py-3.5 rounded-xl hover:bg-amber-400 transition-all w-full uppercase tracking-widest text-xs shadow-lg shadow-amber-500/20 active:scale-[0.98] mt-4">
                  Add User
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-card w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Edit size={24} className="text-amber-500" /> Edit User: {editingUser.name}
                </h3>
                <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>
              
              <form onSubmit={handleUpdateUser} className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Name</label>
                  <input type="text" className="input-field w-full mt-1" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} required />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Email</label>
                  <input type="email" className="input-field w-full mt-1" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} required />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Phone</label>
                  <input type="text" className="input-field w-full mt-1" value={editingUser.phone} onChange={e => setEditingUser({...editingUser, phone: e.target.value})} required />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">UID</label>
                  <input type="text" className="input-field w-full mt-1" value={editingUser.uid || ''} onChange={e => setEditingUser({...editingUser, uid: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">IGN</label>
                  <input type="text" className="input-field w-full mt-1" value={editingUser.ign || ''} onChange={e => setEditingUser({...editingUser, ign: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Role</label>
                  <select className="input-field w-full mt-1" value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value})}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Status</label>
                  <select className="input-field w-full mt-1" value={editingUser.status} onChange={e => setEditingUser({...editingUser, status: e.target.value})}>
                    <option value="active">Active</option>
                    <option value="banned">Banned</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Wallet Balance</label>
                  <input type="number" className="input-field w-full mt-1" value={editingUser.wallet_balance} onChange={e => setEditingUser({...editingUser, wallet_balance: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Bonus Balance</label>
                  <input type="number" className="input-field w-full mt-1" value={editingUser.bonus_balance} onChange={e => setEditingUser({...editingUser, bonus_balance: Number(e.target.value)})} />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Winning Balance</label>
                  <input type="number" className="input-field w-full mt-1" value={editingUser.winning_balance} onChange={e => setEditingUser({...editingUser, winning_balance: Number(e.target.value)})} />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold ml-1">Referral Code</label>
                  <input type="text" className="input-field w-full mt-1" value={editingUser.referral_code || ''} onChange={e => setEditingUser({...editingUser, referral_code: e.target.value})} />
                </div>
                <div className="col-span-2 flex items-center gap-3 p-4 bg-black/50 rounded-xl border border-white/5 shadow-inner">
                  <input 
                    type="checkbox" 
                    id="is_verified"
                    className="w-5 h-5 rounded border-white/10 bg-black text-emerald-500 focus:ring-emerald-500/20" 
                    checked={editingUser.is_verified === 1} 
                    onChange={e => setEditingUser({...editingUser, is_verified: e.target.checked ? 1 : 0})} 
                  />
                  <label htmlFor="is_verified" className="text-sm font-bold text-white cursor-pointer select-none">Verified Account Status</label>
                </div>
                <button type="submit" className="bg-white text-black font-bold py-3.5 rounded-xl hover:bg-zinc-200 transition-all col-span-2 uppercase tracking-widest text-xs shadow-lg shadow-white/10 active:scale-[0.98]">Save Changes</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <CreditCard size={20} />
            </div>
            Pending Deposits
          </h3>
          <span className="px-4 py-1.5 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-xl border border-primary/20">
            {payments.filter((p: any) => p.status === 'pending').length} Requests
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {payments.filter((p: any) => p.status === 'pending').map((p: any) => (
            <div key={p.id} className="glass-card p-6 border-l-4 border-l-emerald-500 relative overflow-hidden group shadow-2xl">
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-zinc-400 border border-white/5 group-hover:scale-110 transition-transform shadow-inner">
                    <UserIcon size={24} />
                  </div>
                  <div>
                    <p className="font-black text-white tracking-tight text-lg">{p.user_name}</p>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{p.user_email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-emerald-400 drop-shadow-lg">৳{p.amount}</p>
                  <p className="text-[9px] text-zinc-500 uppercase font-black tracking-[0.2em] mt-1">{p.method}</p>
                </div>
              </div>
              
              <div className="bg-black/50 rounded-xl p-4 border border-white/5 mb-6 shadow-inner">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">Transaction ID</span>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(p.transaction_id); toast.success('TrxID Copied'); }}
                    className="text-[10px] font-black text-emerald-500 hover:text-white transition-colors uppercase tracking-widest flex items-center gap-1"
                  >
                    <Copy size={10} /> Copy
                  </button>
                </div>
                <p className="text-xs font-mono text-white break-all tracking-wider">{p.transaction_id}</p>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => verifyPayment(p.id, 'approved')} 
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-3 rounded-xl text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  Approve
                </button>
                <button 
                  onClick={() => verifyPayment(p.id, 'rejected')} 
                  className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-3 rounded-xl text-[10px] uppercase tracking-widest border border-red-500/20 transition-all active:scale-95"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
          {payments.filter((p: any) => p.status === 'pending').length === 0 && (
            <div className="col-span-full text-center py-16 glass-card border-dashed border-2 border-zinc-800">
              <History size={48} className="mx-auto text-zinc-800 mb-4 opacity-50" />
              <p className="text-zinc-500 font-black uppercase tracking-widest text-xs">No pending deposits</p>
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <ArrowDownLeft size={20} />
            </div>
            Pending Withdraws
          </h3>
          <span className="px-4 py-1.5 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-xl border border-primary/20">
            {withdraws.filter((w: any) => w.status === 'pending').length} Requests
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {withdraws.filter((w: any) => w.status === 'pending').map((w: any) => (
            <div key={w.id} className="glass-card p-6 border-l-4 border-l-amber-500 relative overflow-hidden group shadow-2xl">
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-zinc-400 border border-white/5 group-hover:scale-110 transition-transform shadow-inner">
                    <UserIcon size={24} />
                  </div>
                  <div>
                    <p className="font-black text-white tracking-tight text-lg">{w.user_name}</p>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Method: {w.method}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-amber-500 drop-shadow-lg">৳{w.amount}</p>
                  <p className="text-[9px] text-zinc-500 uppercase font-black tracking-[0.2em] mt-1">Withdrawal</p>
                </div>
              </div>

              <div className="bg-black/50 rounded-xl p-4 border border-white/5 mb-6 shadow-inner">
                <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest mb-2">{w.method} Account</p>
                <div className="flex justify-between items-center">
                  <p className="text-sm font-black text-white tracking-widest font-mono">{w.account_number}</p>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(w.account_number); toast.success('Account Copied'); }}
                    className="text-[10px] font-black text-amber-500 hover:text-white transition-colors uppercase tracking-widest flex items-center gap-1"
                  >
                    <Copy size={10} /> Copy
                  </button>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => verifyWithdraw(w.id, 'approved')} 
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 rounded-xl text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                >
                  Approve
                </button>
                <button 
                  onClick={() => verifyWithdraw(w.id, 'rejected')} 
                  className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-3 rounded-xl text-[10px] uppercase tracking-widest border border-red-500/20 transition-all active:scale-95"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
          {withdraws.filter((w: any) => w.status === 'pending').length === 0 && (
            <div className="col-span-full text-center py-16 glass-card border-dashed border-2 border-zinc-800">
              <History size={48} className="mx-auto text-zinc-800 mb-4 opacity-50" />
              <p className="text-zinc-500 font-black uppercase tracking-widest text-xs">No pending withdrawals</p>
            </div>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-xl font-black text-white uppercase tracking-wider mb-6 flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl text-primary">
            <History size={20} />
          </div>
          Recent Activity
        </h3>
        <div className="glass-card overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/50 text-zinc-500 uppercase font-black tracking-widest border-b border-white/5">
                <tr>
                  <th className="px-6 py-5">User</th>
                  <th className="px-6 py-5">Type</th>
                  <th className="px-6 py-5">Amount</th>
                  <th className="px-6 py-5">Status</th>
                  <th className="px-6 py-5 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {([...payments, ...withdraws] as any[])
                  .filter(t => t.status !== 'pending')
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .slice(0, 15)
                  .map((t, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="font-black text-white group-hover:text-amber-500 transition-colors">{t.user_name}</p>
                        <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-tighter">{t.method}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${t.transaction_id ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}>
                          {t.transaction_id ? 'Deposit' : 'Withdraw'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-black text-white text-sm">৳{t.amount}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                          t.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                          t.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                          'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-[10px] text-zinc-500 font-bold">{format(new Date(t.created_at), 'MMM dd, hh:mm a')}</p>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {([...payments, ...withdraws] as any[]).filter(t => t.status !== 'pending').length === 0 && (
            <p className="text-center py-8 text-zinc-500 italic text-xs">No transaction history yet.</p>
          )}
        </div>
      </section>
    </div>
  );
};

// --- Auth Components ---


const AuthModal = () => {
  const [view, setView] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [uid, setUid] = useState('');
  const [ign, setIgn] = useState('');
  const [refCode, setRefCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const { login } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setResetToken(token);
      setView('reset');
    }
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (view === 'reset' && password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    
    try {
      const endpoint = 
        view === 'login' ? '/api/auth/login' : 
        view === 'register' ? '/api/auth/register' : 
        view === 'forgot' ? '/api/auth/forgot-password' : 
        '/api/auth/reset-password';
      const body = 
        view === 'login' ? { email, password } : 
        view === 'register' ? { name, email, phone, password, referralCode: refCode, uid, ign } : 
        view === 'forgot' ? { email } :
        { token: resetToken, password };
      
      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const contentType = res.headers.get("content-type");
      if (res.ok) {
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const data = await res.json();
          if (view === 'login' || view === 'register') {
            login(data.token, data.user);
            
            // Sync profile to RTDB on every login/register to ensure persistence
            const db = getFirebaseDb();
            if (db && data.user.email) {
              const sanitizedEmail = data.user.email.replace(/\./g, ',');
              update(ref(db, `users_by_email/${sanitizedEmail}`), {
                id: data.user.id,
                name: data.user.name,
                email: data.user.email,
                phone: data.user.phone,
                wallet_balance: data.user.wallet_balance,
                bonus_balance: data.user.bonus_balance,
                winning_balance: data.user.winning_balance,
                role: data.user.role,
                ign: data.user.ign || '',
                profile_photo_url: data.user.profile_photo_url || '',
                is_verified: data.user.is_verified || 0,
                last_login: serverTimestamp()
              }).catch(e => console.error("Firebase auth sync error:", e));
            }
            
            toast.success(view === 'login' ? 'Welcome back!' : 'Account created!');
          } else if (view === 'forgot') {
            toast.success(data.message);
            setView('login');
          } else if (view === 'reset') {
            toast.success(data.message);
            window.history.replaceState({}, '', window.location.pathname);
            setView('login');
          }
        } else {
          const text = await res.text();
          console.error("Invalid response from server:", text);
          if (text.includes('Starting Server') || text.includes('<!doctype html>') || text.includes('Database initializing') || text.includes('Please wait')) {
             toast.error("Server is waking up. Please wait 5-10 seconds and try again.", { duration: 5000 });
          } else {
             toast.error("Connection error. Please try again in a few seconds.");
          }
        }
      } else {
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const data = await res.json();
          toast.error(data.error || data.message || "An error occurred");
        } else {
          toast.error(`Server error: ${res.status} ${res.statusText}`);
        }
      }
    } catch (err) {
      console.error("Auth error:", err);
      toast.error("Connection failed. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm overflow-y-auto scrollbar-hide cyber-grid">
      <div className="scanline" />
      <div className="min-h-full flex flex-col items-center justify-center p-4 md:p-6 relative">
        {/* Futuristic Background with Neon Lines */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
                <stop offset="50%" stopColor="#38bdf8" stopOpacity="1" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
              </linearGradient>
            </defs>
            <motion.path 
              d="M-100 100 L1200 1000" 
              stroke="url(#line-grad)" 
              strokeWidth="1" 
              fill="none"
              animate={{ x: [0, 100, 0], opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            />
            <motion.path 
              d="M1200 -100 L-100 1200" 
              stroke="url(#line-grad)" 
              strokeWidth="1" 
              fill="none"
              animate={{ x: [0, -100, 0], opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            />
          </svg>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md relative z-10 py-8 md:py-12"
        >
        {/* Circular Logo Frame */}
        <div className="flex justify-center mb-10">
          <div className="relative group">
            {/* Outer Glow Ring */}
            <div className="absolute inset-[-3px] rounded-full bg-gradient-to-r from-sky-400 via-indigo-500 to-sky-400 animate-spin-slow opacity-40 group-hover:opacity-100 transition-opacity" />
            
            {/* Logo Container */}
            <div className="relative w-36 h-36 rounded-full bg-black border border-sky-500/30 flex items-center justify-center overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/gaming-logo/400')] bg-cover bg-center opacity-60 mix-blend-overlay scale-110 group-hover:scale-125 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black" />
              
              <div className="text-center z-10 pointer-events-none">
                <Crown size={28} className="text-amber-400 mx-auto mb-1 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
                <span className="block text-3xl font-black text-white tracking-tighter leading-none drop-shadow-lg">ELITE</span>
                <span className="block text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-500 tracking-tighter leading-none">FF</span>
              </div>
              
              {/* Logo Shine Effect */}
              <motion.div 
                className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-25deg]"
                animate={{ left: ['150%', '-150%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }}
              />
            </div>
          </div>
        </div>

        {/* Login Form Container */}
        <div className="glass-card p-6 md:p-8 relative group/form">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-sky-500 to-transparent opacity-40 group-hover/form:opacity-100 transition-opacity duration-500" />
          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-20" />
          
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none mb-2 drop-shadow-lg">
              {view === 'login' ? 'Warrior Login' : 
               view === 'register' ? 'Join the Elite' : 
               view === 'forgot' ? 'Recover Access' : 
               'New Protocol'}
            </h2>
            <div className="flex items-center justify-center gap-3">
              <div className="h-[1px] w-10 bg-gradient-to-r from-transparent to-sky-500/40" />
              <p className="text-sky-400/70 text-[10px] font-black uppercase tracking-[0.4em]">
                {view === 'login' ? 'Combat Profile' : 
                 view === 'register' ? 'Gaming Identity' : 
                 view === 'forgot' ? 'Security Protocol' : 
                 'Access Key'}
              </p>
              <div className="h-[1px] w-10 bg-gradient-to-l from-transparent to-sky-500/40" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {view === 'register' && (
              <div className="space-y-5">
                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <UserIcon className="text-zinc-500 group-focus-within/input:text-sky-400 transition-colors" size={20} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="FULL NAME" 
                    className="input-field !pl-14" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    required 
                  />
                </div>
                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <Phone className="text-zinc-500 group-focus-within/input:text-sky-400 transition-colors" size={20} />
                  </div>
                  <input 
                    type="tel" 
                    placeholder="PHONE NUMBER" 
                    className="input-field !pl-14" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    required 
                  />
                </div>
                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <Gamepad2 className="text-zinc-500 group-focus-within/input:text-sky-400 transition-colors" size={20} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="GAME UID (OPTIONAL)" 
                    className="input-field !pl-14" 
                    value={uid} 
                    onChange={e => setUid(e.target.value)} 
                  />
                </div>
                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <Award className="text-zinc-500 group-focus-within/input:text-sky-400 transition-colors" size={20} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="GAME IGN (OPTIONAL)" 
                    className="input-field !pl-14" 
                    value={ign} 
                    onChange={e => setIgn(e.target.value)} 
                  />
                </div>
              </div>
            )}
            
            {(view === 'login' || view === 'register' || view === 'forgot') && (
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <Mail className="text-zinc-500 group-focus-within/input:text-sky-400 transition-colors" size={20} />
                </div>
                <input 
                  type="email" 
                  placeholder="EMAIL ADDRESS" 
                  className="input-field !pl-14" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                />
              </div>
            )}

            {(view === 'login' || view === 'register' || view === 'reset') && (
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <Lock className="text-zinc-500 group-focus-within/input:text-sky-400 transition-colors" size={20} />
                </div>
                <input 
                  type="password" 
                  placeholder="PASSWORD" 
                  className="input-field !pl-14" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                />
              </div>
            )}

            {view === 'reset' && (
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <ShieldCheck className="text-zinc-500 group-focus-within/input:text-sky-400 transition-colors" size={20} />
                </div>
                <input 
                  type="password" 
                  placeholder="CONFIRM NEW PASSWORD" 
                  className="input-field !pl-14" 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  required 
                />
              </div>
            )}

            {view === 'register' && (
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <Zap className="text-zinc-500 group-focus-within/input:text-sky-400 transition-colors" size={20} />
                </div>
                <input 
                  type="text" 
                  placeholder="REFERRAL CODE (OPTIONAL)" 
                  className="input-field !pl-14" 
                  value={refCode} 
                  onChange={e => setRefCode(e.target.value)} 
                />
              </div>
            )}

            {view === 'login' && (
              <div className="flex justify-end">
                <button type="button" onClick={() => setView('forgot')} className="text-[11px] text-sky-400 font-black uppercase tracking-widest hover:text-sky-300 transition-colors flex items-center gap-1.5 group/forgot">
                  <Key size={12} className="group-hover/forgot:rotate-12 transition-transform" /> Forgot Password?
                </button>
              </div>
            )}

            <button 
              type="submit" 
              className="w-full py-5 bg-gradient-to-r from-sky-500 to-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.3em] hover:from-sky-400 hover:to-indigo-500 transition-all active:scale-[0.98] mt-8 relative overflow-hidden group/btn shadow-[0_0_20px_rgba(56,189,248,0.3)]"
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
              <span className="relative z-10 flex items-center justify-center gap-2">
                {view === 'login' ? 'Initiate Login' : 
                 view === 'register' ? 'Create Profile' : 
                 view === 'forgot' ? 'Send Reset Link' : 
                 'Update Password'}
                <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
              </span>
            </button>
          </form>

          <div className="mt-12 pt-10 border-t border-white/5 text-center">
            {view === 'login' ? (
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
                New Recruit?
                <button onClick={() => setView('register')} className="text-sky-400 ml-2 hover:text-sky-300 transition-colors font-black border-b border-sky-500/30 hover:border-sky-400">
                  Register Now
                </button>
              </p>
            ) : (
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
                {view === 'register' ? 'Already Enlisted?' : 'Remembered your key?'}
                <button onClick={() => setView('login')} className="text-sky-400 ml-2 hover:text-sky-300 transition-colors font-black border-b border-sky-500/30 hover:border-sky-400">
                  Login Now
                </button>
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  </div>
);
};

// --- Simulate Payment Page ---
const SimulatePaymentPage = () => {
  const [params, setParams] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setParams({
      sessionId: urlParams.get('session_id'),
      amount: urlParams.get('amount')
    });
  }, []);

  const handlePayment = async (status: 'success' | 'failed' | 'cancelled') => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: params.sessionId,
          status,
          transaction_id: status === 'success' ? 'SIM-' + Math.random().toString(36).substring(2, 10).toUpperCase() : null
        })
      });

      if (res.ok) {
        if (status === 'success') {
          toast.success('Payment Successful!');
        } else {
          toast.error(`Payment ${status}`);
        }
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        toast.error('Failed to verify payment');
      }
    } catch (e) {
      toast.error('Something went wrong');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!params) return null;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card w-full max-w-md p-8 text-center relative z-10"
      >
        <div className="w-20 h-20 bg-sky-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-sky-500 border border-sky-500/20 shadow-[0_0_30px_rgba(14,165,233,0.15)]">
          <ShieldCheck size={40} />
        </div>
        <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter drop-shadow-lg">Secure Payment</h2>
        <p className="text-zinc-500 text-sm mb-8 font-medium">Simulating a real payment experience</p>

        <div className="bg-black/40 rounded-2xl p-6 border border-white/5 mb-8 text-left relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-sky-500 to-indigo-500" />
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Amount to Pay</span>
            <span className="text-3xl font-black text-white tracking-tight">৳{params.amount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Session ID</span>
            <span className="text-xs font-mono text-zinc-400 bg-white/5 px-2 py-1 rounded border border-white/5">{params.sessionId}</span>
          </div>
        </div>

        <div className="space-y-4">
          <button 
            onClick={() => handlePayment('success')}
            disabled={isProcessing}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:from-emerald-400 hover:to-emerald-500 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3"
          >
            {isProcessing ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : <CheckCircle size={18} />}
            Pay Successfully
          </button>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => handlePayment('failed')}
              disabled={isProcessing}
              className="py-3.5 rounded-xl bg-red-500/10 text-red-400 font-black text-[10px] uppercase tracking-widest border border-red-500/20 hover:bg-red-500/20 transition-all"
            >
              Fail Payment
            </button>
            <button 
              onClick={() => handlePayment('cancelled')}
              disabled={isProcessing}
              className="py-3.5 rounded-xl bg-zinc-900 text-zinc-400 font-black text-[10px] uppercase tracking-widest border border-white/10 hover:bg-zinc-800 hover:text-white transition-all"
            >
              Cancel
            </button>
          </div>
        </div>

        <p className="text-[9px] text-zinc-600 mt-8 uppercase font-black tracking-[0.3em]">Elite FF Tournaments • Secure Checkout</p>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function MainApp() {
  const isSimulation = window.location.pathname === '/simulate-payment';
  if (isSimulation) return <SimulatePaymentPage />;

  const { user, loading, firebaseInitialized, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      toast.success('Payment successful! Your wallet has been updated.');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('payment') === 'cancel') {
      toast.error('Payment cancelled.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);
  useEffect(() => {
    if (user) {
      fetchTournaments();
    }
  }, [user?.id]);

  useEffect(() => {
    if (!firebaseInitialized) return;
    
    const db = getFirebaseDb();
    if (!db) return;

    const tournamentsRef = ref(db, 'tournaments');
    const unsubscribe = onValue(tournamentsRef, () => {
      fetchTournaments();
    });

    return () => {
      off(tournamentsRef);
    };
  }, [firebaseInitialized]);

  const fetchTournaments = async () => {
    const res = await apiFetch('/api/tournaments');
    if (res.ok) {
      const data = await res.json();
      setTournaments(data);
    }
  };

  const handleJoin = async (tournamentId: number, playerNames: string[]) => {
    const res = await apiFetch(`/api/tournaments/${tournamentId}/join`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerNames })
    });
    if (res.ok) {
      // Sync to Firebase for real-time updates
      const db = getFirebaseDb();
      if (db && user) {
        update(ref(db, `tournaments/${tournamentId}`), {
          last_join: serverTimestamp()
        }).catch(e => console.error("Firebase sync error:", e));
        
        // Also sync user wallet after joining
        const sanitizedEmail = user.email.replace(/\./g, ',');
        update(ref(db, `users_by_email/${sanitizedEmail}`), {
          wallet_balance: user.wallet_balance,
          bonus_balance: user.bonus_balance,
          winning_balance: user.winning_balance,
          last_updated: serverTimestamp()
        }).catch(e => console.error("Firebase user sync error:", e));
      }
      toast.success('Joined successfully!');
      refreshUser();
      fetchTournaments();
    } else {
      const data = await res.json();
      toast.error(data.error);
    }
  };

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-black">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
      />
    </div>
  );

  if (!user) return (
    <>
      <Toaster position="top-center" />
      <AuthModal />
    </>
  );

  return (
    <div className="min-h-screen bg-black text-slate-200">
      <Toaster position="top-center" toastOptions={{
        style: { background: '#000000', color: '#fff', border: '1px solid rgba(125, 211, 252, 0.2)', borderRadius: '1rem' }
      }} />
      
      <TopBar onMenuClick={() => setIsSidebarOpen(true)} />
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className={`transition-all duration-300 pt-20 pb-24 px-4 ${isSidebarOpen ? 'lg:pl-[300px]' : ''}`}>
        <div className="max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'home' && (
              <motion.div key="home" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <HomePage tournaments={tournaments} onJoin={handleJoin} setActiveTab={setActiveTab} />
              </motion.div>
            )}
            {activeTab === 'my-matches' && (
              <motion.div key="my-matches" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="pt-4">
                  <h2 className="text-2xl font-bold mb-6">My Matches</h2>
                  <div className="space-y-4">
                    {tournaments.filter((t: any) => t.is_joined).map((t: any) => (
                      <TournamentCard 
                        key={t.id}
                        id={t.id}
                        title={t.title}
                        fee={t.entry_fee}
                        prize={t.prize_pool}
                        type={t.game_type}
                        map={t.map}
                        time={t.match_time}
                        slots={t.total_slots}
                        filled={t.filled_slots}
                        thumbnail_url={t.thumbnail_url}
                        onJoin={handleJoin}
                        isJoined={t.is_joined}
                        roomId={t.room_id}
                        roomPassword={t.room_password}
                        rules={t.rules}
                        prizeDetails={t.prize_details}
                        status={t.status}
                      />
                    ))}
                    {tournaments.filter((t: any) => t.is_joined).length === 0 && (
                      <div className="text-center py-12 bg-black rounded-2xl border border-sky-500/20">
                        <Gamepad2 size={48} className="mx-auto text-slate-700 mb-4" />
                        <p className="text-slate-500 text-sm">You haven't joined any matches yet.</p>
                        <button onClick={() => setActiveTab('matches')} className="btn-primary mt-4 px-6">Find Matches</button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
            {activeTab === 'leaderboard' && (
              <motion.div key="leaderboard" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="pt-4">
                  <h2 className="text-2xl font-bold mb-6">Leaderboard</h2>
                  <div className="bg-black rounded-2xl border border-sky-500/20 p-8 text-center">
                    <Trophy size={48} className="mx-auto text-primary mb-4" />
                    <p className="text-slate-400">Leaderboard feature coming soon!</p>
                  </div>
                </div>
              </motion.div>
            )}
            {activeTab === 'notifications' && (
              <motion.div key="notifications" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="pt-4">
                  <h2 className="text-2xl font-bold mb-6">Notifications</h2>
                  <div className="bg-black rounded-2xl border border-sky-500/20 p-8 text-center">
                    <Bell size={48} className="mx-auto text-slate-700 mb-4" />
                    <p className="text-slate-400">You have no new notifications.</p>
                  </div>
                </div>
              </motion.div>
            )}
            {activeTab === 'support' && (
              <motion.div key="support" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="pt-4">
                  <h2 className="text-2xl font-bold mb-6">Support</h2>
                  <div className="bg-black rounded-2xl border border-sky-500/20 p-8 text-center">
                    <HelpCircle size={48} className="mx-auto text-primary mb-4" />
                    <p className="text-slate-400 mb-4">Need help? Contact our support team.</p>
                    <a href="mailto:support@eliteff.com" className="btn-primary px-8 py-3 inline-block">Email Support</a>
                  </div>
                </div>
              </motion.div>
            )}
            {activeTab === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="pt-4">
                  <h2 className="text-2xl font-bold mb-6">Settings</h2>
                  <div className="bg-black rounded-2xl border border-sky-500/20 p-8 text-center">
                    <Settings size={48} className="mx-auto text-slate-700 mb-4" />
                    <p className="text-slate-400">Settings configuration coming soon!</p>
                  </div>
                </div>
              </motion.div>
            )}
            {activeTab === 'matches' && (
              <motion.div key="matches" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="pt-4">
                  <h2 className="text-2xl font-bold mb-6">All Tournaments</h2>
                  <div className="space-y-4">
                    {tournaments.map((t: any) => (
                      <TournamentCard 
                        key={t.id}
                        id={t.id}
                        title={t.title}
                        fee={t.entry_fee}
                        prize={t.prize_pool}
                        type={t.game_type}
                        map={t.map}
                        time={t.match_time}
                        slots={t.total_slots}
                        filled={t.filled_slots}
                        thumbnail_url={t.thumbnail_url}
                        onJoin={handleJoin}
                        isJoined={t.is_joined}
                        roomId={t.room_id}
                        roomPassword={t.room_password}
                        rules={t.rules}
                        prizeDetails={t.prize_details}
                        status={t.status}
                      />
                    ))}
                    {tournaments.length === 0 && (
                      <p className="text-center py-8 text-slate-500 text-sm">No tournaments available</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
            {activeTab === 'wallet' && (
              <motion.div key="wallet" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <WalletPage />
              </motion.div>
            )}
            {activeTab === 'chat' && (
              <motion.div key="chat" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <LiveChatPage />
              </motion.div>
            )}
            {activeTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <ProfilePage />
              </motion.div>
            )}
            {activeTab === 'admin' && (
              <motion.div key="admin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <AdminDashboard onTournamentCreated={fetchTournaments} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
