/**
 * @license MIT
 * SeedTraceability frontend
 */
import React, { useState, useEffect, useRef, Component, ReactNode, ErrorInfo } from 'react';
import {
  Leaf, Search, History, User, Home, ChevronRight, Plus, ArrowRight, Package,
  Truck, Store, Star, Camera, CheckCircle2, AlertCircle, LogOut, ChevronLeft,
  MapPin, Droplets, FlaskConical, Beaker, Loader2, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { ethers } from 'ethers';
import citiesData from './india_cities.json';

const sortedCities = [...citiesData].sort((a, b) => a.name.localeCompare(b.name));

// Import from our backend API
import {
  loginUser,
  registerUser,
  getStats,
  addDistributorBC,
  addManufacturerBC,
  addRetailerBC,
  syncDistributorReceiveBC,
  syncDistributorDispatchBC,
  syncRetailerReceiveBC,
  getBatchSQL,
  listBatchesSQL
} from './api';

import { getContract } from './blockchain';

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type Screen =
  | 'login'
  | 'register'
  | 'dashboard'
  | 'crop-form'
  | 'crop-result'
  | 'traceability'
  | 'manufacturer'
  | 'distributor'
  | 'retailer'
  | 'review'
  | 'profile';

interface UserProfile {
  user_id: number;
  name: string;
  email: string;
  role: 'farmer' | 'manufacturer' | 'distributor' | 'retailer';
}

interface BatchHistory {
  stage: string;
  timestamp: any;
  location: string;
  details: string;
  actor: string;
}

interface Batch {
  id: string;
  batchId: string;
  seedName: string;
  seedVariety: string;
  cropType: string;
  manufacturerUid: string;
  createdAt: any;
  history: BatchHistory[];
  retailerInfo?: {
    price: number;
    confirmed: boolean;
  };
  reviews?: {
    farmerName: string;
    rating: number;
    reviewText: string;
    timestamp: any;
  }[];
}

// --- Components ---

const Button = ({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost', size?: 'sm' | 'md' | 'lg' }) => {
  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
    secondary: 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm',
    outline: 'border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50',
    ghost: 'text-emerald-600 hover:bg-emerald-50',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg font-semibold',
  };
  return (
    <button
      className={cn(
        'rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
};

const Input = ({ label, error, icon: Icon, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string, error?: string, icon?: React.ElementType }) => (
  <div className="w-full space-y-1">
    {label && (
      <label className="text-sm font-medium text-slate-700 ml-1 flex items-center gap-1.5">
        {Icon && <Icon size={14} className="text-emerald-600" />}
        {label}
      </label>
    )}
    <div className="relative">
      <input
        className={cn(
          "w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all bg-white",
          error && "border-red-500 focus:ring-red-500"
        )}
        {...props}
      />
    </div>
    {error && <p className="text-xs text-red-500 ml-1">{error}</p>}
  </div>
);

const Card = ({ children, className, onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) => (
  <motion.div
    whileTap={onClick ? { scale: 0.98 } : undefined}
    onClick={onClick}
    className={cn("bg-white rounded-2xl p-4 shadow-sm border border-slate-100", className)}
  >
    {children}
  </motion.div>
);

const FileUpload = ({ label, value, onChange, icon: Icon = FileText, accept = ".pdf,.csv,image/*" }: { label: string, value: { name: string, data: string } | null, onChange: (file: { name: string, data: string } | null) => void, icon?: React.ElementType, accept?: string }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange({ name: file.name, data: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700 ml-1 flex items-center gap-1.5">
        {Icon && <Icon size={14} className="text-emerald-600" />}
        {label}
      </label>
      <div
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative w-full h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden",
          value ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
        )}
      >
        {value ? (
          <div className="flex flex-col items-center space-y-2 p-4">
            <Icon size={32} className="text-emerald-600" />
            <span className="text-sm font-medium text-emerald-800 text-center truncate max-w-full px-4">{value.name}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="text-xs font-bold text-emerald-600 hover:underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <>
            <Icon size={32} className="text-slate-400" />
            <span className="text-xs mt-2 font-medium text-slate-500 uppercase tracking-wider text-center px-4">Click to Upload Soil Report</span>
          </>
        )}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept={accept}
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};

// --- Error Boundary ---
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-6">
          <Card className="p-8 max-w-md w-full space-y-4 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-red-900">Application Error</h2>
            <p className="text-red-700">{this.state.error?.message}</p>
            <Button onClick={() => window.location.reload()} className="w-full bg-red-600 hover:bg-red-700">
              Reload Application
            </Button>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Main App ---
export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeRole, setActiveRole] = useState<'farmer' | 'manufacturer' | 'distributor' | 'retailer'>('farmer');
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [loading, setLoading] = useState(true);
  const [predictionResult, setPredictionResult] = useState<{ crop: string, info: string, image?: string, reportName?: string } | null>(null);
  const [trackingBatch, setTrackingBatch] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ active_batches: 0 });
  const [sharedBatches, setSharedBatches] = useState<any[]>([]);

  useEffect(() => {
    if (currentScreen === 'dashboard') {
      getStats().then(setStats);
      listBatchesSQL()
        .then((res) => setSharedBatches(res?.batches || []))
        .catch(() => setSharedBatches([]));
    }
  }, [currentScreen]);

  // Ensure the connected wallet is authorized for the logged-in role on-chain.
  // The contract enforces role gating; without this, actions revert with "Not <role>".
  useEffect(() => {
    const ensureOnChainRole = async () => {
      if (!profile) return;
      if (profile.role === 'farmer') return;
      if (typeof window.ethereum === 'undefined') return;

      try {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();

        if (profile.role === 'manufacturer') {
          await addManufacturerBC(address);
        } else if (profile.role === 'distributor') {
          await addDistributorBC(address);
        } else if (profile.role === 'retailer') {
          await addRetailerBC(address);
        }
      } catch (e) {
        // Non-fatal: user can still browse/trace; role tx may fail if backend/chain is down.
        console.error("Failed to bootstrap on-chain role", e);
      }
    };

    ensureOnChainRole();
  }, [profile]);

  useEffect(() => {
    const savedUser = localStorage.getItem('agro_user');
    if (savedUser) {
      const p = JSON.parse(savedUser) as UserProfile;
      setProfile(p);
      setActiveRole(p.role);
      setCurrentScreen('dashboard');
    } else {
      setCurrentScreen('login');
    }
    setLoading(false);
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('agro_user');
    setProfile(null);
    setCurrentScreen('login');
  };

  const navigate = (screen: Screen) => {
    setError(null);
    setCurrentScreen(screen);
  };

  const buildJourneyFromSql = (batch: any) => {
    const steps: any[] = [];
    if (!batch) return steps;
    if (batch.created_at || batch.seed_name) {
      steps.push({
        stage: 'Manufactured',
        timestamp: batch.created_at,
        location: 'Manufacturer',
        details: `${batch.seed_name || 'Seed'} batch created`
      });
    }
    if (batch.warehouse_location) {
      steps.push({
        stage: 'At Distributor',
        timestamp: batch.updated_at || batch.created_at,
        location: batch.warehouse_location,
        details: 'Received at distributor warehouse'
      });
    }
    if (batch.vehicle_number || batch.transport_mode) {
      steps.push({
        stage: 'Dispatched',
        timestamp: batch.updated_at || batch.created_at,
        location: batch.transport_mode || 'Road',
        details: `Vehicle ${batch.vehicle_number || 'N/A'}`
      });
    }
    if ((batch.status || '').toLowerCase().includes('retailer') || batch.selling_price) {
      steps.push({
        stage: 'At Retailer',
        timestamp: batch.updated_at || batch.created_at,
        location: 'Retailer',
        details: batch.selling_price ? `Price: ${batch.selling_price}` : 'Received by retailer'
      });
    }
    return steps;
  };

  // --- Screens ---

  const AuthScreen = ({ mode }: { mode: 'login' | 'register' }) => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [authLoading, setAuthLoading] = useState(false);

    const onSubmit = async (data: any) => {
      setAuthLoading(true);
      setError(null);
      try {
        if (mode === 'register') {
          const res = await registerUser({
            name: data.name,
            email: data.email,
            password: data.password,
            role: data.role || 'farmer'
          });
          const newUser = res.user;
          setProfile(newUser);
          setActiveRole(newUser.role);
          localStorage.setItem('agro_user', JSON.stringify(newUser));
          setCurrentScreen('dashboard');
        } else {
          const res = await loginUser(data.email, data.password);
          const loggedUser = res.user;
          setProfile(loggedUser);
          setActiveRole(loggedUser.role);
          localStorage.setItem('agro_user', JSON.stringify(loggedUser));
          setCurrentScreen('dashboard');
        }
      } catch (err: any) {
        setError(err.error || err.message || "Authentication failed");
      } finally {
        setAuthLoading(false);
      }
    };

    return (
      <div className="min-h-screen bg-white flex">
        {/* Left Side: Branding/Image (Hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 bg-emerald-600 items-center justify-center p-12 relative overflow-hidden">
          <div className="relative z-10 max-w-lg text-white space-y-6">
            <div className="inline-flex p-4 bg-white/10 rounded-3xl backdrop-blur-xl">
              <Leaf size={48} />
            </div>
            <h1 className="text-5xl font-black leading-tight">Revolutionizing Agriculture with AI & Blockchain.</h1>
            <p className="text-emerald-50/80 text-xl font-medium">Join thousands of farmers and suppliers in the most transparent agricultural ecosystem.</p>

            <div className="grid grid-cols-2 gap-6 pt-8">
              <div className="space-y-2">
                <p className="text-3xl font-bold">98%</p>
                <p className="text-emerald-100/60 text-sm uppercase tracking-widest font-bold">Accuracy</p>
              </div>
              <div className="space-y-2">
                <p className="text-3xl font-bold">100%</p>
                <p className="text-emerald-100/60 text-sm uppercase tracking-widest font-bold">Traceable</p>
              </div>
            </div>
          </div>
          {/* Decorative circles */}
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500 rounded-full blur-3xl opacity-50" />
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-teal-500 rounded-full blur-3xl opacity-50" />
        </div>

        {/* Right Side: Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full max-w-md space-y-8"
          >
            <div className="lg:hidden text-center space-y-2 mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 text-white mb-4 shadow-lg">
                <Leaf size={32} />
              </div>
              <h1 className="text-3xl font-bold text-emerald-900">Smart Agro AI</h1>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-900">{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
              <p className="text-slate-500 font-medium">{mode === 'login' ? 'Enter your details to access your account' : 'Start your journey with Smart Agro AI today'}</p>
            </div>

            <Card className="p-8 shadow-xl border-none">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {mode === 'register' && (
                  <>
                    <Input label="Full Name" placeholder="John Doe" {...register('name', { required: 'Name is required' })} error={errors.name?.message as string} />
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700 ml-1 uppercase tracking-wider">Account Role</label>
                      <select {...register('role', { required: 'Role is required' })} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none">
                        <option value="farmer">Farmer</option>
                        <option value="manufacturer">Manufacturer</option>
                        <option value="distributor">Distributor</option>
                        <option value="retailer">Retailer</option>
                      </select>
                    </div>
                  </>
                )}
                <Input label="Email Address" type="email" placeholder="name@company.com" {...register('email', { required: 'Email is required' })} error={errors.email?.message as string} />
                <Input label="Password" type="password" placeholder="••••••••" {...register('password', { required: 'Password is required' })} error={errors.password?.message as string} />

                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-sm animate-shake">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <Button type="submit" className="w-full py-4 text-lg font-bold shadow-emerald-200 shadow-lg" disabled={authLoading}>
                  {authLoading ? <Loader2 className="animate-spin mx-auto" /> : mode === 'login' ? 'Sign In' : 'Get Started'}
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                <button
                  onClick={() => navigate(mode === 'login' ? 'register' : 'login')}
                  className="text-slate-500 font-medium hover:text-emerald-600 transition-colors"
                >
                  {mode === 'login' ? "New here? Create an account" : "Already have an account? Sign in"}
                </button>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  };

  const Dashboard = () => {
    return (
      <div className="space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              Welcome back, <span className="text-emerald-600">{profile?.name}</span>
            </h2>
            <p className="text-slate-500 font-medium">Here's what's happening with your agricultural data.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Account Type</span>
              <span className="text-sm font-bold text-emerald-600 capitalize">{activeRole}</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6 border-none bg-emerald-600 text-white flex flex-col justify-between overflow-hidden relative">
            <div className="relative z-10">
              <p className="text-emerald-100 font-medium mb-1 text-sm">Supply Chain Records</p>
              <h3 className="text-2xl font-bold">{sharedBatches.length} Shared Batches</h3>
            </div>
            <div className="mt-8 relative z-10">
              <Button
                variant="outline"
                className="bg-white/10 border-white/20 hover:bg-white/20 text-white w-full"
                onClick={() => navigate('profile')}
              >
                View Profile
              </Button>
            </div>
            <Leaf className="absolute -bottom-6 -right-6 text-white/10" size={140} />
          </Card>

          <Card className="p-6 flex flex-col justify-between">
            <div>
              <p className="text-slate-400 font-medium mb-1 text-sm">Active Batches</p>
              <h3 className="text-2xl font-bold text-slate-900">{stats.active_batches} Tracking</h3>
            </div>
            <div className="mt-8">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => navigate('traceability')}
              >
                Trace History
              </Button>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Latest Shared Supply Chain Updates</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('traceability')}>Open Traceability</Button>
          </div>
          {sharedBatches.length === 0 ? (
            <p className="text-sm text-slate-500">No shared batches yet. Create a batch as Manufacturer to begin.</p>
          ) : (
            <div className="space-y-3">
              {sharedBatches.slice(0, 5).map((b: any) => (
                <div key={b.batch_id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                  <div>
                    <p className="font-semibold text-slate-900">{b.batch_id}</p>
                    <p className="text-xs text-slate-500">{b.seed_name || 'Seed'} {b.seed_variety ? `• ${b.seed_variety}` : ''}</p>
                  </div>
                  <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                    {b.status || 'Tracked'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {activeRole === 'farmer' && (
            <Card className="overflow-hidden border-none shadow-xl group">
              <div className="bg-emerald-600 p-8 text-white relative">
                <Leaf className="absolute top-4 right-4 text-white/20 group-hover:rotate-12 transition-transform" size={64} />
                <h3 className="text-2xl font-bold mb-2">AI Crop Recommendation</h3>
                <p className="text-emerald-50/80 mb-6 max-w-sm">Use our advanced machine learning model to find the best crops for your soil conditions and current season.</p>
                <Button
                  onClick={() => navigate('crop-form')}
                  className="bg-white text-emerald-600 hover:bg-emerald-50 border-none px-8"
                >
                  Analyze Soil Now
                </Button>
              </div>
            </Card>
          )}

          <Card className="p-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-2xl text-amber-600">
                <Package size={28} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Management Panel</h3>
                <p className="text-slate-500 text-sm">Quick access to role-specific tools</p>
              </div>
            </div>

            <div className="space-y-3">
              {activeRole === 'manufacturer' && (
                <Button onClick={() => navigate('manufacturer')} className="w-full py-4 h-auto flex items-center justify-between group">
                  <span>Create New Seed Batch</span>
                  <Plus className="group-hover:rotate-90 transition-transform" />
                </Button>
              )}
              {activeRole === 'distributor' && (
                <Button onClick={() => navigate('distributor')} className="w-full py-4 h-auto flex items-center justify-between">
                  <span>Distributor Workflow</span>
                  <Truck />
                </Button>
              )}
              {activeRole === 'retailer' && (
                <Button onClick={() => navigate('retailer')} className="w-full py-4 h-auto flex items-center justify-between">
                  <span>Retailer Inventory</span>
                  <Store />
                </Button>
              )}
              {activeRole === 'farmer' && (
                <div className="grid grid-cols-1 gap-3">
                  <Button onClick={() => navigate('traceability')} className="w-full py-4 h-auto flex items-center justify-between">
                    <span>Track Batch History</span>
                    <Search size={20} />
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const CropForm = () => {
    const { register, handleSubmit, setValue, formState: { errors } } = useForm();
    const [predicting, setPredicting] = useState(false);
    const [location, setLocation] = useState<any>(null);
    const [soilReport, setSoilReport] = useState<any>(null);
    const [citySearch, setCitySearch] = useState("");
    const [showCityDropdown, setShowCityDropdown] = useState(false);

    useEffect(() => {
      const extractData = async () => {
        if (soilReport && (
          soilReport.name.toLowerCase().endsWith('.pdf') ||
          soilReport.name.toLowerCase().endsWith('.png') ||
          soilReport.name.toLowerCase().endsWith('.jpg') ||
          soilReport.name.toLowerCase().endsWith('.jpeg')
        )) {
          setPredicting(true);
          try {
            // Convert dataURL to Blob for FormData
            const blob = await fetch(soilReport.data).then(res => res.blob());
            const formData = new FormData();
            formData.append('file', blob, soilReport.name);

            const res = await axios.post("http://localhost:5000/extract_pdf", formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });

            const extracted = res.data;
            if (extracted) {
              if (extracted.N !== null) setValue('nitrogen', String(extracted.N));
              if (extracted.P !== null) setValue('phosphorus', String(extracted.P));
              if (extracted.K !== null) setValue('potassium', String(extracted.K));
              if (extracted.pH !== null) setValue('ph', String(extracted.pH));
              if (extracted.Moisture !== null) setValue('moisture', String(extracted.Moisture));
            }
          } catch (err) {
            console.error("Failed to extract soil data", err);
          } finally {
            setPredicting(false);
          }
        }
      };
      extractData();
    }, [soilReport, setValue]);

    const handleGetLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setLocation({ lat, lng, name: "Detected Location" });
          setCitySearch("Detected Location");
        },
        (err) => console.error(err)
      );
    };

    const handleCitySelect = (city: any) => {
      setCitySearch(city.name);
      setLocation({ lat: city.lat, lng: city.lng, name: city.name });
      setShowCityDropdown(false);
    };

    const isLocationValid = sortedCities.some(c => c.name === citySearch) || citySearch === "Detected Location";

    const onSubmit = async (data: any) => {
      if (!isLocationValid) { alert("Please select a valid city from the list."); return; }
      if (!location) { alert("Please get location first"); return; }
      setPredicting(true);
      try {
        const response = await axios.post("http://localhost:5000/predict", {
          ...data,
          location: citySearch,
          lat: location.lat,
          lng: location.lng
        });
        setPredictionResult({
          crop: response.data.recommended_crops[0],
          info: response.data.justification || `Recommended based on ${response.data.season} season.`,
        });
        navigate('crop-result');
      } catch (err) {
        alert("Failed to predict crop.");
      } finally {
        setPredicting(false);
      }
    };

    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('dashboard')} className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-3xl font-black text-slate-900">Crop Recommendation</h2>
            <p className="text-slate-500">Provide soil details for AI analysis</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <Card className="p-8 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <Beaker className="text-emerald-600" />
                <h3 className="font-bold text-lg">Soil Nutrient Profile</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Input
                  label="Nitrogen (N) 0-500 mg/kg"
                  type="number"
                  step="any"
                  placeholder="0-500 mg/kg"
                  min={0}
                  max={500}
                  error={errors.nitrogen?.message as string}
                  {...register('nitrogen', {
                    required: 'Nitrogen is required',
                    min: { value: 0, message: 'Nitrogen must be at least 0 mg/kg' },
                    max: { value: 500, message: 'Nitrogen must be at most 500 mg/kg' }
                  })}
                />
                <Input
                  label="Phosphorus (P) 0-500 mg/kg"
                  type="number"
                  step="any"
                  placeholder="0-500 mg/kg"
                  min={0}
                  max={500}
                  error={errors.phosphorus?.message as string}
                  {...register('phosphorus', {
                    required: 'Phosphorus is required',
                    min: { value: 0, message: 'Phosphorus must be at least 0 mg/kg' },
                    max: { value: 500, message: 'Phosphorus must be at most 500 mg/kg' }
                  })}
                />
                <Input
                  label="Potassium (K) 0-500 mg/kg"
                  type="number"
                  step="any"
                  placeholder="0-500 mg/kg"
                  min={0}
                  max={500}
                  error={errors.potassium?.message as string}
                  {...register('potassium', {
                    required: 'Potassium is required',
                    min: { value: 0, message: 'Potassium must be at least 0 mg/kg' },
                    max: { value: 500, message: 'Potassium must be at most 500 mg/kg' }
                  })}
                />
                <Input
                  label="pH Level 6-8"
                  type="number"
                  step="any"
                  placeholder="6-8"
                  min={0}
                  max={14}
                  error={errors.ph?.message as string}
                  {...register('ph', {
                    required: 'pH level is required',
                    min: { value: 0, message: 'pH must be at least 0' },
                    max: { value: 14, message: 'pH must be at most 14' }
                  })}
                />
                <Input
                  label="Moisture Content"
                  type="number"
                  step="any"
                  placeholder="0-100%"
                  min={0}
                  max={100}
                  error={errors.moisture?.message as string}
                  {...register('moisture', {
                    required: 'Moisture is required',
                    min: { value: 0, message: 'Moisture must be at least 0%' },
                    max: { value: 100, message: 'Moisture must be at most 100%' }
                  })}
                  className="sm:col-span-2"
                />
              </div>
            </Card>

            <Button type="submit" className="w-full py-4 text-lg" disabled={predicting}>
              {predicting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin" /> Analyzing Soil Data...
                </span>
              ) : 'Run AI Prediction'}
            </Button>
          </div>

          <div className="space-y-6">
            <Card className="p-6 space-y-4 bg-slate-100/50 border-dashed relative">
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin size={18} />
                <h4 className="font-bold">Location Data</h4>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Manual City Selection</label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                    placeholder="Search Indian cities..."
                    value={citySearch}
                    onChange={(e) => {
                      setCitySearch(e.target.value);
                      setShowCityDropdown(true);
                      if (location?.name !== e.target.value) setLocation(null);
                    }}
                    onFocus={() => setShowCityDropdown(true)}
                  />
                  {showCityDropdown && (
                    <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg">
                      {sortedCities
                        .filter(c => c.name.toLowerCase().includes(citySearch.toLowerCase()))
                        .map(city => (
                          <div
                            key={city.name}
                            className="px-4 py-2 hover:bg-emerald-50 cursor-pointer text-sm font-medium text-slate-700"
                            onClick={() => handleCitySelect(city)}
                          >
                            {city.name}
                          </div>
                        ))}
                      {sortedCities.filter(c => c.name.toLowerCase().includes(citySearch.toLowerCase())).length === 0 && (
                        <div className="px-4 py-2 text-sm text-slate-400 italic">No cities found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 py-2">
                <div className="h-px flex-1 bg-slate-200"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">OR</span>
                <div className="h-px flex-1 bg-slate-200"></div>
              </div>

              <Button type="button" variant="outline" className="w-full text-xs py-2 bg-white" onClick={handleGetLocation}>
                Detect Current Location
              </Button>

              {location && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="text-[10px] text-center font-mono text-emerald-600 bg-emerald-50 py-2 rounded-lg border border-emerald-100">
                    <span className="font-bold">Verified:</span> Lat {location.lat.toFixed(4)}, Lng {location.lng.toFixed(4)}
                  </div>
                </div>
              )}
              {citySearch && !isLocationValid && (
                <p className="text-[10px] text-red-500 text-center font-medium">Invalid city. Please select from dropdown.</p>
              )}
            </Card>

            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-slate-600">
                <FileText size={18} />
                <h4 className="font-bold">Soil Report</h4>
              </div>
              <FileUpload label="Visual Analysis (Optional)" value={soilReport} onChange={setSoilReport} />
              <p className="text-[10px] text-slate-400">Upload a photo of your lab report for OCR extraction.</p>
            </Card>
          </div>
        </form>
      </div>
    );
  };

  const CropResult = () => {
    if (!predictionResult) return null;
    
    // Parse the Gemini justification info into bullets
    const rawInfo = predictionResult.info || '';
    const bulletPoints = rawInfo
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.replace(/^[-*•]\s*|^\d+\.\s*/, '').trim()) // remove leading bullets or numbers
      .filter(line => line.length > 5 && !line.toLowerCase().startsWith('here are')); // filter out intro text

    return (
      <div className="max-w-5xl mx-auto p-6 space-y-8 pb-24">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('crop-form')} className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">AI Analysis Complete</h2>
            <p className="text-slate-500 font-medium">Based on your exact field conditions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Recommendation Hero Component */}
          <Card className="md:col-span-1 border-none shadow-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white p-8 flex flex-col items-center justify-center text-center space-y-8 relative overflow-hidden h-fit">
             <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
             <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-black/20 rounded-full blur-3xl"></div>
             
             <motion.div 
               initial={{ scale: 0.8, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="relative z-10 w-28 h-28 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center shadow-2xl border border-white/20"
             >
               <Leaf size={56} className="text-white drop-shadow-md" />
             </motion.div>
             
             <div className="relative z-10 space-y-3">
               <p className="text-emerald-100/90 font-bold uppercase tracking-widest text-xs">Top Recommended Crop</p>
               <h3 className="text-5xl font-black text-white drop-shadow-lg">{predictionResult.crop}</h3>
             </div>
             
             <div className="relative z-10 w-full pt-8">
               <Button onClick={() => navigate('dashboard')} className="w-full bg-white text-emerald-800 hover:bg-emerald-50 shadow-xl py-4 font-bold border-none">
                 Return to Dashboard
               </Button>
             </div>
          </Card>

          {/* Justification List Component */}
          <Card className="md:col-span-2 p-8 shadow-xl border-slate-100 bg-white">
            <h3 className="text-2xl font-black flex items-center gap-3 mb-8 text-slate-900 border-b border-slate-100 pb-5">
              <CheckCircle2 className="text-emerald-500" size={28} />
              Why this is the best choice
            </h3>
            
            {bulletPoints.length > 0 ? (
              <div className="space-y-4">
                {bulletPoints.map((point, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    key={idx} 
                    className="flex gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-lg hover:-translate-y-1 hover:bg-white transition-all duration-300 group"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm shadow-inner group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                        {idx + 1}
                      </div>
                    </div>
                    <p className="text-slate-700 leading-relaxed font-medium mt-1">{point}</p>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100">
                <p className="text-amber-800 font-medium leading-relaxed italic">
                  {rawInfo || "No detailed justification was provided by the AI."}
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  };

  const TraceabilityScreen = () => {
    const [batchId, setBatchId] = useState('');
    const [searching, setSearching] = useState(false);

    const handleTrack = async () => {
      if (!batchId) return;
      setSearching(true);
      try {
        const normalizedBatchId = batchId.trim();
        const sqlRes = await getBatchSQL(normalizedBatchId);
        const sqlBatch = sqlRes?.batch_data;
        if (!sqlBatch) throw new Error('Batch not found in SQL');

        let chainData: any = null;
        try {
          const contract = await getContract();
          if (contract) {
            const batchBytes = ethers.id(normalizedBatchId);
            const manufacturerData = await contract.manufacturerData(batchBytes);
            const fullHistory = await contract.getFullBatchHistory(batchBytes);
            chainData = { manufacturerData, fullHistory };
          }
        } catch (chainErr) {
          console.warn('Blockchain read unavailable, using SQL snapshot only', chainErr);
        }

        setTrackingBatch({
          seedName: chainData?.manufacturerData?.seedName || sqlBatch.seed_name,
          seedVariety: chainData?.manufacturerData?.seedVariety || sqlBatch.seed_variety,
          cropType: chainData?.manufacturerData?.cropType || sqlBatch.crop_type,
          status: sqlBatch.status || 'Tracked',
          journey: buildJourneyFromSql(sqlBatch),
          blockchainVerified: !!chainData
        });
      } catch (err) {
        console.error(err);
        alert("Batch not found. Make sure it is synced from Manufacturer.");
      } finally {
        setSearching(false);
      }
    };

    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('dashboard')} className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <div>
              <h2 className="text-3xl font-black text-slate-900">Seed Traceability</h2>
              <p className="text-slate-500">Verify the journey of your seeds via Blockchain</p>
            </div>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <div className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="Enter Batch ID..."
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <Button onClick={handleTrack} disabled={searching || !batchId} className="px-6">
              {searching ? <Loader2 className="animate-spin" /> : 'Track'}
            </Button>
          </div>
        </div>

        {trackingBatch ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <Card className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 rounded-2xl inline-block text-emerald-600">
                    <Package size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">{trackingBatch.seedName}</h3>
                    <p className="text-emerald-600 font-bold">{trackingBatch.seedVariety}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-6 border-t border-slate-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 font-medium">Batch ID</span>
                    <span className="text-slate-900 font-mono font-bold">{batchId}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 font-medium">Crop Type</span>
                    <span className="text-slate-900 font-bold">{trackingBatch.cropType}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 font-medium">Status</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-black uppercase tracking-wider">{trackingBatch.status || 'Tracked'}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-slate-900 text-white border-none">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 className="text-emerald-400" />
                  <h4 className="font-bold">{trackingBatch.blockchainVerified ? 'Blockchain Verified' : 'SQL Synced'}</h4>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {trackingBatch.blockchainVerified
                    ? 'This batch is registered on the Ethereum network. History is shared across all user accounts.'
                    : 'Showing latest shared SQL status. Blockchain data is currently unavailable from this session.'}
                </p>
              </Card>
            </div>

            <Card className="lg:col-span-2 p-8">
              <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                <History className="text-emerald-600" />
                Supply Chain Journey
              </h3>

              <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:bg-slate-100">
                {trackingBatch.journey && trackingBatch.journey.map((h: any, i: number) => (
                  <div key={i} className="relative flex items-start gap-6 group">
                    <div className={cn(
                      "absolute left-0 w-10 h-10 rounded-full border-4 border-white shadow-sm flex items-center justify-center transition-colors z-10",
                      i === 0 ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600"
                    )}>
                      <div className="w-2 h-2 rounded-full bg-current" />
                    </div>
                    <div className="ml-12 pt-1.5 space-y-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-bold text-slate-900">{h.stage || 'Status Update'}</h4>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border">
                          {h.timestamp ? new Date(h.timestamp).toLocaleDateString() : 'Latest'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <MapPin size={14} />
                        <span>{h.location || 'Location shared via node'}</span>
                      </div>
                      <p className="text-sm text-slate-400 pt-1 italic">{h.details || 'Supply chain update synced.'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : (
          <Card className="p-20 text-center space-y-4 border-dashed bg-transparent border-2">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
              <Search size={40} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">No batch selected</h3>
              <p className="text-slate-500">Enter a valid Batch ID above to view its journey</p>
            </div>
          </Card>
        )}
      </div>
    );
  };

  const ManufacturerPanel = () => {
    const { register, handleSubmit } = useForm();
    const [creating, setCreating] = useState(false);

    const onSubmit = async (data: any) => {
      setCreating(true);
      try {
        const contract = await getContract();
        if (!contract) return;
        const normalizedBatchId = (data.batchId || '').trim();
        const batchBytes = ethers.id(normalizedBatchId);
        const tx = await contract.createBatch(batchBytes, data.seedName, data.seedVariety, data.cropType);
        const receipt = await tx.wait();

        // Sync with backend for SQL trace/list support
        let syncOk = true;
        try {
          await axios.post('http://127.0.0.1:5000/bc/create_batch', {
            batch_id: normalizedBatchId,
            seed_name: data.seedName,
            variety: data.seedVariety,
            crop_type: data.cropType,
            role: 'manufacturer',
            manufacturer_id: profile?.user_id,
            already_on_blockchain: true,
            tx_hash: (receipt as any)?.hash ?? tx.hash
          });
        } catch (e) {
          console.error("Backend sync failed", e);
          syncOk = false;
        }

        if (syncOk) {
          alert("Batch created on blockchain and stored in SQL.");
        } else {
          alert("Batch created on blockchain, but SQL sync failed.");
        }
        navigate('dashboard');
      } catch (err) {
        console.error(err);
        alert("Failed to create batch.");
      } finally {
        setCreating(false);
      }
    };

    return (
      <div className="p-6 space-y-6 pb-24">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('dashboard')} className="p-2 rounded-xl bg-white border border-slate-100"><ChevronLeft size={20} /></button>
          <h2 className="text-2xl font-bold">Create Batch</h2>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Batch ID" {...register('batchId', { required: true })} />
          <Input label="Seed Name" {...register('seedName', { required: true })} />
          <Input label="Seed Variety" {...register('seedVariety', { required: true })} />
          <Input label="Crop Type" {...register('cropType', { required: true })} />
          <Button type="submit" className="w-full" disabled={creating}>{creating ? 'Creating...' : 'Create Batch'}</Button>
        </form>
      </div>
    );
  };

  const DistributorPanel = () => {
    const { register, handleSubmit } = useForm();
    const [loading, setLoading] = useState(false);
    const transportModeMap: Record<number, string> = {
      1: 'Road',
      2: 'Rail',
      3: 'Air',
      4: 'Sea'
    };

    const onSubmit = async (data: any, type: 'receive' | 'dispatch') => {
      setLoading(true);
      try {
        const contract = await getContract();
        if (!contract) return;
        const normalizedBatchId = (data.batchId || '').trim();
        const batchBytes = ethers.id(normalizedBatchId);
        const transportModeCode = Number(data.transportMode || 1);
        let tx;
        if (type === 'receive') {
          tx = await contract.distributorReceive(batchBytes, data.warehouse);
        } else {
          tx = await contract.distributorDispatch(batchBytes, transportModeCode, data.vehicle);
        }
        const receipt = await tx.wait();
        if (type === 'receive') {
          await syncDistributorReceiveBC({
            batch_id: normalizedBatchId,
            warehouse: data.warehouse || '',
            tx_hash: (receipt as any)?.hash ?? tx.hash
          });
        } else {
          await syncDistributorDispatchBC({
            batch_id: normalizedBatchId,
            mode: transportModeMap[transportModeCode] || 'Road',
            vehicle: data.vehicle || '',
            tx_hash: (receipt as any)?.hash ?? tx.hash
          });
        }
        alert("Distributor update synced for all users.");
      } catch (err) {
        console.error(err);
        alert("Update failed.");
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="p-6 space-y-8 pb-24">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('dashboard')} className="p-2 rounded-xl bg-white border border-slate-100"><ChevronLeft size={20} /></button>
          <h2 className="text-2xl font-bold">Distributor</h2>
        </div>
        <Card className="p-6 space-y-4">
          <Input label="Batch ID" {...register('batchId')} />
          <Input label="Warehouse Location (for Receive)" {...register('warehouse')} />
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 ml-1">Transport Mode (for Dispatch)</label>
            <select
              {...register('transportMode')}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
              defaultValue="1"
            >
              <option value="1">Road</option>
              <option value="2">Rail</option>
              <option value="3">Air</option>
              <option value="4">Sea</option>
            </select>
          </div>
          <Input label="Vehicle Number (for Dispatch)" {...register('vehicle')} />
          <div className="flex gap-2">
            <Button onClick={handleSubmit((d) => onSubmit(d, 'receive'))} className="flex-1" disabled={loading}>Receive</Button>
            <Button onClick={handleSubmit((d) => onSubmit(d, 'dispatch'))} variant="secondary" className="flex-1" disabled={loading}>Dispatch</Button>
          </div>
        </Card>
      </div>
    );
  };

  const RetailerScreen = () => {
    const { register, handleSubmit } = useForm();
    const [loading, setLoading] = useState(false);

    const onSubmit = async (data: any) => {
      setLoading(true);
      try {
        const contract = await getContract();
        if (!contract) return;
        const normalizedBatchId = (data.batchId || '').trim();
        const batchBytes = ethers.id(normalizedBatchId);
        const tx = await contract.retailerReceive(batchBytes, ethers.parseEther(data.price));
        const receipt = await tx.wait();
        await syncRetailerReceiveBC({
          batch_id: normalizedBatchId,
          price: data.price,
          tx_hash: (receipt as any)?.hash ?? tx.hash
        });
        alert("Retailer status synced for all users.");
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="p-6 space-y-6 pb-24">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('dashboard')} className="p-2 rounded-xl bg-white border border-slate-100"><ChevronLeft size={20} /></button>
          <h2 className="text-2xl font-bold">Retailer</h2>
        </div>
        <Card className="p-6 space-y-4">
          <Input label="Batch ID" {...register('batchId')} />
          <Input label="Price (ETH)" type="number" step="0.01" {...register('price')} />
          <Button onClick={handleSubmit(onSubmit)} className="w-full" disabled={loading}>Update Retailer</Button>
        </Card>
      </div>
    );
  };

  const ReviewScreen = () => {
    const { register, handleSubmit } = useForm();
    const [loading, setLoading] = useState(false);

    const onSubmit = async (data: any) => {
      setLoading(true);
      try {
        const contract = await getContract();
        if (!contract) return;
        const batchBytes = ethers.id((data.batchId || '').trim());
        const tx = await contract.submitReview(batchBytes, profile?.name || 'Farmer', 5, data.reviewText);
        await tx.wait();
        alert("Review submitted!");
        navigate('dashboard');
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="p-6 space-y-6 pb-24">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('dashboard')} className="p-2 rounded-xl bg-white border border-slate-100"><ChevronLeft size={20} /></button>
          <h2 className="text-2xl font-bold">Review</h2>
        </div>
        <Card className="p-6 space-y-4">
          <Input label="Batch ID" {...register('batchId')} />
          <textarea {...register('reviewText')} className="w-full p-4 border rounded-xl" placeholder="Review details" />
          <Button onClick={handleSubmit(onSubmit)} className="w-full" disabled={loading}>Submit</Button>
        </Card>
      </div>
    );
  };

  const ProfileScreen = () => {
    return (
      <div className="p-6 space-y-6 pb-24">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('dashboard')} className="p-2 rounded-xl bg-white border border-slate-100"><ChevronLeft size={20} /></button>
          <h2 className="text-2xl font-bold">Profile</h2>
        </div>
        <Card className="p-8 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-emerald-100 mx-auto flex items-center justify-center text-emerald-600"><User size={40} /></div>
          <div><h3 className="text-xl font-bold">{profile?.name}</h3><p>{profile?.email}</p></div>
          <Button variant="outline" onClick={handleLogout} className="w-full text-red-600 border-red-100">Logout</Button>
        </Card>
      </div>
    );
  };

  const TopNav = () => (
    <nav className="sticky top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('dashboard')}>
          <div className="bg-emerald-600 p-1.5 rounded-lg text-white">
            <Leaf size={20} />
          </div>
          <span className="text-xl font-bold text-emerald-900 hidden sm:inline">Smart Agro AI</span>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-4">
          <button
            onClick={() => navigate('dashboard')}
            className={cn(
              "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              currentScreen === 'dashboard' ? "bg-emerald-50 text-emerald-600" : "text-slate-600 hover:bg-slate-50"
            )}
          >
            Dashboard
          </button>
          <button
            onClick={() => navigate('traceability')}
            className={cn(
              "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              currentScreen === 'traceability' ? "bg-emerald-50 text-emerald-600" : "text-slate-600 hover:bg-slate-50"
            )}
          >
            Traceability
          </button>
          <div className="h-6 w-px bg-slate-200 mx-2" />
          <button
            onClick={() => navigate('profile')}
            className={cn(
              "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              currentScreen === 'profile' ? "bg-emerald-50 text-emerald-600" : "text-slate-600 hover:bg-slate-50"
            )}
          >
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <User size={16} />
            </div>
            <span className="hidden md:inline">{profile?.name}</span>
          </button>
        </div>
      </div>
    </nav>
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-emerald-600" size={48} /></div>;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-emerald-100">
        {profile && !['login', 'register'].includes(currentScreen) && <TopNav />}

        <main className={cn(
          "transition-all duration-300",
          profile && !['login', 'register'].includes(currentScreen) ? "max-w-7xl mx-auto px-4 py-8" : ""
        )}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScreen}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {currentScreen === 'login' && <AuthScreen mode='login' />}
              {currentScreen === 'register' && <AuthScreen mode='register' />}
              {currentScreen === 'dashboard' && <Dashboard />}
              {currentScreen === 'crop-form' && <CropForm />}
              {currentScreen === 'crop-result' && <CropResult />}
              {currentScreen === 'traceability' && <TraceabilityScreen />}
              {currentScreen === 'manufacturer' && <ManufacturerPanel />}
              {currentScreen === 'distributor' && <DistributorPanel />}
              {currentScreen === 'retailer' && <RetailerScreen />}
              {currentScreen === 'review' && <ReviewScreen />}
              {currentScreen === 'profile' && <ProfileScreen />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </ErrorBoundary>
  );
}
