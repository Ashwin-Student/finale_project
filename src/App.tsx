/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, Component, ReactNode, ErrorInfo } from 'react';
import { 
  Leaf, 
  Search, 
  History, 
  User, 
  Home, 
  ChevronRight, 
  Plus, 
  ArrowRight, 
  Package, 
  Truck, 
  Store, 
  Star, 
  Camera, 
  CheckCircle2, 
  AlertCircle,
  LogOut,
  ChevronLeft,
  MapPin,
  Droplets,
  FlaskConical,
  Beaker,
  Loader2,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useForm } from 'react-hook-form';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  arrayUnion,
  serverTimestamp,
  Timestamp,
  getDocFromServer
} from 'firebase/firestore';
import { auth, db } from './firebase';

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
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
      let message = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error?.message || "");
        if (parsed.error && parsed.error.includes("Missing or insufficient permissions")) {
          message = "You do not have permission to perform this action. Please check your account role.";
        }
      } catch (e) {
        message = this.state.error?.message || message;
      }

      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-6">
          <Card className="p-8 max-w-md w-full space-y-4 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-red-900">Application Error</h2>
            <p className="text-red-700">{message}</p>
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
  uid: string;
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

const ImageUpload = ({ label, value, onChange, icon: Icon = Camera }: { label: string, value: string | null, onChange: (base64: string | null) => void, icon?: React.ElementType }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange(reader.result as string);
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
          "relative w-full h-40 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden",
          value ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
        )}
      >
        {value ? (
          <img src={value} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <>
            <Icon size={32} className="text-slate-400" />
            <span className="text-xs mt-2 font-medium text-slate-500 uppercase tracking-wider">Click to Capture or Upload</span>
          </>
        )}
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden" 
          accept="image/*" 
          capture="environment"
          onChange={handleFileChange}
        />
      </div>
      {!value && <p className="text-[10px] text-slate-400 text-center italic">No image selected</p>}
    </div>
  );
};

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
            <span className="text-xs mt-2 font-medium text-slate-500 uppercase tracking-wider text-center px-4">Click to Upload Soil Report (PDF, CSV, Image)</span>
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
      {!value && <p className="text-[10px] text-slate-400 text-center italic">No file selected</p>}
    </div>
  );
};

const Card = ({ children, className, onClick }: { children: React.ReactNode, className?: string, onClick?: () => void, key?: React.Key }) => (
  <motion.div 
    whileTap={onClick ? { scale: 0.98 } : undefined}
    onClick={onClick}
    className={cn("bg-white rounded-2xl p-4 shadow-sm border border-slate-100", className)}
  >
    {children}
  </motion.div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeRole, setActiveRole] = useState<'farmer' | 'manufacturer' | 'distributor' | 'retailer'>('farmer');
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [loading, setLoading] = useState(true);
  const [predictionResult, setPredictionResult] = useState<{ crop: string, info: string, image: string, reportName?: string } | null>(null);
  const [trackingBatch, setTrackingBatch] = useState<Batch | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
          setError("Firebase connection failed. Please check your internet or configuration.");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const docRef = doc(db, 'users', u.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const p = docSnap.data() as UserProfile;
            setProfile(p);
            setActiveRole(p.role);
            setCurrentScreen('dashboard');
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${u.uid}`);
        }
      } else {
        setProfile(null);
        setCurrentScreen('login');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const navigate = (screen: Screen) => {
    setError(null);
    setCurrentScreen(screen);
  };

  // --- Auth Logic ---
  const AuthScreen = ({ mode }: { mode: 'login' | 'register' }) => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [authLoading, setAuthLoading] = useState(false);

    const onSubmit = async (data: any) => {
      setAuthLoading(true);
      setError(null);
      try {
        if (mode === 'register') {
          const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
          const newUser: UserProfile = {
            uid: userCredential.user.uid,
            name: data.name,
            email: data.email,
            role: data.role || 'farmer'
          };
          try {
            await setDoc(doc(db, 'users', newUser.uid), newUser);
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `users/${newUser.uid}`);
          }
          setProfile(newUser);
          setActiveRole(newUser.role);
        } else {
          await signInWithEmailAndPassword(auth, data.email, data.password);
        }
      } catch (err: any) {
        let message = "An unexpected error occurred.";
        if (err.code === 'auth/operation-not-allowed') {
          message = "Email/Password authentication is not enabled in the Firebase Console. Please enable it under Authentication > Sign-in method.";
        } else if (err.code === 'auth/email-already-in-use') {
          message = "This email is already registered. Please login instead.";
        } else if (err.code === 'auth/invalid-email') {
          message = "Please enter a valid email address.";
        } else if (err.code === 'auth/weak-password') {
          message = "Password should be at least 6 characters.";
        } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          message = "Invalid email or password.";
        } else if (err.code === 'auth/invalid-api-key') {
          message = "The Firebase API key is invalid. Please check your configuration.";
        } else {
          message = err.message;
        }
        setError(message);
      } finally {
        setAuthLoading(false);
      }
    };

    return (
      <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-600 text-white mb-4 shadow-lg">
              <Leaf size={40} />
            </div>
            <h1 className="text-3xl font-bold text-emerald-900">Smart Agro AI</h1>
            <p className="text-emerald-700/70">Empowering farmers with AI & Blockchain</p>
          </div>

          <Card className="p-8 space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {mode === 'register' && (
                <>
                  <Input label="Full Name" {...register('name', { required: 'Name is required' })} error={errors.name?.message as string} />
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700 ml-1">Select Your Role</label>
                    <select 
                      {...register('role', { required: 'Role is required' })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      <option value="farmer">Farmer</option>
                      <option value="manufacturer">Manufacturer</option>
                      <option value="distributor">Distributor</option>
                      <option value="retailer">Retailer</option>
                    </select>
                  </div>
                </>
              )}
              <Input label="Email" type="email" {...register('email', { required: 'Email is required' })} error={errors.email?.message as string} />
              <Input label="Password" type="password" {...register('password', { required: 'Password is required' })} error={errors.password?.message as string} />
              
              {error && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-3 text-red-600 text-sm animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="shrink-0 mt-0.5" size={18} />
                  <div className="space-y-1">
                    <p className="font-semibold">Authentication Error</p>
                    <p className="leading-relaxed">{error}</p>
                  </div>
                </div>
              )}
              
              <Button type="submit" className="w-full" size="lg" disabled={authLoading}>
                {authLoading ? 'Processing...' : mode === 'login' ? 'Login' : 'Register'}
              </Button>
            </form>

            <div className="text-center">
              <button 
                onClick={() => navigate(mode === 'login' ? 'register' : 'login')}
                className="text-emerald-600 font-medium hover:underline"
              >
                {mode === 'login' ? "Don't have an account? Register" : "Already have an account? Login"}
              </button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  };

  // --- Dashboard ---
  const Dashboard = () => {
    const [batchIdInput, setBatchIdInput] = useState('');

    return (
      <div className="p-6 space-y-8 pb-24 bg-slate-50/50 min-h-screen">
        {/* Header Section */}
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              Hello, <span className="text-emerald-600">{profile?.name}</span>!
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                <User size={10} />
                Logged in as {activeRole}
              </div>
              <p className="text-slate-500 text-xs font-medium">Farm Command Center</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleLogout} 
              className="p-2.5 rounded-xl bg-white shadow-sm border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-100 transition-all"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Main Sections Grid */}
        <div className="grid grid-cols-1 gap-6">
          
          {/* Farmer Specific: AI Crop Recommendation */}
          {activeRole === 'farmer' && (
            <Card 
              onClick={() => navigate('crop-form')}
              className="group relative overflow-hidden p-6 border-none bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-xl shadow-emerald-200/50 cursor-pointer hover:scale-[1.02] transition-transform"
            >
              <div className="relative z-10 flex items-center gap-6">
                <div className="p-4 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30">
                  <Leaf size={32} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black tracking-tight">AI Crop Recommendation</h3>
                  <p className="text-emerald-50/80 text-sm mt-1 font-medium">Analyze soil data for optimal crop yields</p>
                </div>
                <ArrowRight className="text-white/50 group-hover:text-white transition-colors" />
              </div>
              <Leaf className="absolute -right-8 -bottom-8 text-white/10 rotate-12" size={180} />
            </Card>
          )}

          {/* Seed Batch Management - Role Based Actions */}
          <Card className="p-6 space-y-5 border-2 border-slate-100 bg-white shadow-lg shadow-slate-200/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                  <Package size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Seed Batch Management</h3>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Supply Chain Operations</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {(activeRole === 'distributor' || activeRole === 'retailer' || activeRole === 'farmer') && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <Input 
                    placeholder="Reference Batch ID..." 
                    value={batchIdInput} 
                    onChange={(e) => setBatchIdInput(e.target.value)}
                    className="pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                  />
                </div>
              )}
              
              <div className="grid grid-cols-1 gap-3">
                {activeRole === 'manufacturer' && (
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-100" onClick={() => navigate('manufacturer')}>
                    <Plus size={18} />
                    Create Seed Batch
                  </Button>
                )}
                
                {activeRole === 'distributor' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="secondary" className="bg-slate-100 hover:bg-slate-200 text-slate-900" onClick={() => navigate('distributor')}>
                      <Package size={18} />
                      Distributor Receive
                    </Button>
                    <Button variant="secondary" className="bg-slate-100 hover:bg-slate-200 text-slate-900" onClick={() => navigate('distributor')}>
                      <Truck size={18} />
                      Dispatch Seeds
                    </Button>
                  </div>
                )}
                
                {activeRole === 'retailer' && (
                  <Button variant="outline" className="w-full border-slate-200 hover:bg-slate-50" onClick={() => navigate('retailer')}>
                    <Store size={18} />
                    Retailer Receive
                  </Button>
                )}
                
                {activeRole === 'farmer' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="border-slate-200 hover:bg-slate-50" onClick={() => navigate('review')}>
                      <Star size={18} />
                      Submit Review
                    </Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => navigate('traceability')}>
                      <History size={18} />
                      View Batch History
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Farmer Specific: Blockchain Traceability tracking is already covered by "View History" but keeping the card for visual consistency if needed, or removing if redundant */}
          {activeRole === 'farmer' && (
            <Card 
              onClick={() => navigate('traceability')}
              className="group p-6 border-2 border-slate-100 bg-white shadow-lg shadow-slate-200/50 cursor-pointer hover:border-emerald-200 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <History size={28} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Blockchain Traceability</h3>
                  <p className="text-sm text-slate-500 font-medium">Verify seed origin and journey in real-time</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all">
                  <ChevronRight size={20} />
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Quick Stats / Info */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 bg-white border-slate-100 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Star size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Trust Score</p>
              <p className="text-lg font-black text-slate-900">98.4%</p>
            </div>
          </Card>
          <Card className="p-4 bg-white border-slate-100 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Truck size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Active Batches</p>
              <p className="text-lg font-black text-slate-900">12</p>
            </div>
          </Card>
        </div>

        {/* Footer Tip */}
        <Card className="bg-slate-900 text-white p-6 relative overflow-hidden rounded-3xl">
          <div className="relative z-10 flex items-center gap-4">
            <div className="p-2 bg-emerald-500 rounded-lg">
              <Star size={16} className="text-white" />
            </div>
            <div>
              <h4 className="text-sm font-bold">Pro Tip</h4>
              <p className="text-xs text-slate-400 mt-0.5">Blockchain ensures your seeds are 100% authentic.</p>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  // --- Crop Recommendation ---
  const CropForm = () => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [predicting, setPredicting] = useState(false);
    const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [soilReport, setSoilReport] = useState<{ name: string, data: string } | null>(null);

    const handleGetLocation = () => {
      setLocationLoading(true);
      setLocationError(null);
      if (!navigator.geolocation) {
        setLocationError("Geolocation is not supported by your browser.");
        setLocationLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationLoading(false);
        },
        (error) => {
          setLocationError("Unable to access GPS location. Please enable location services.");
          setLocationLoading(false);
        }
      );
    };

    const onSubmit = async (data: any) => {
      if (!location) {
        setLocationError("Please provide your location first.");
        return;
      }
      if (!soilReport) {
        setError("Please upload a soil report.");
        return;
      }
      setPredicting(true);
      try {
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        setPredictionResult({
          crop: "Crop Suggestions",
          info: `Recommended Crops for your location (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}):\n- Rice\n- Maize\n- Cotton\n\nAlternative Crops:\n- Millet\n- Sugarcane\n- Pulses`,
          image: `https://picsum.photos/seed/farm/800/600`,
          reportName: soilReport.name
        });
        navigate('crop-result');
      } catch (err: any) {
        setError("Failed to predict crop. Please try again.");
      } finally {
        setPredicting(false);
      }
    };

    return (
      <div className="p-6 space-y-6 pb-24 relative min-h-screen">
        <AnimatePresence>
          {predicting && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center"
            >
              <div className="bg-white p-8 rounded-3xl shadow-xl border border-emerald-100 flex flex-col items-center space-y-4">
                <Loader2 className="text-emerald-600 animate-spin" size={48} />
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-900">Analyzing soil data...</h3>
                  <p className="text-sm text-slate-500 font-medium">Our AI is determining the best crops for you</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-4">
          <button onClick={() => navigate('dashboard')} className="p-2 rounded-xl bg-white shadow-sm border border-slate-100">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold text-slate-900">Crop Recommendation</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card className="p-6 space-y-4 border-emerald-100">
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700 ml-1 flex items-center gap-1.5">
                <MapPin size={14} className="text-emerald-600" />
                Farm Location
              </label>
              
              {!location ? (
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full py-6 border-dashed border-2"
                  onClick={handleGetLocation}
                  disabled={locationLoading}
                >
                  {locationLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Fetching your location...
                    </>
                  ) : (
                    <>
                      <MapPin size={18} />
                      Get Current Location
                    </>
                  )}
                </Button>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-600 text-white">
                      <MapPin size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Coordinates Detected</p>
                      <p className="text-sm font-medium text-emerald-700">
                        {location.lat.toFixed(4)}°N, {location.lng.toFixed(4)}°E
                      </p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setLocation(null)}
                    className="text-xs font-bold text-emerald-600 hover:underline"
                  >
                    Reset
                  </button>
                </div>
              )}
              
              {locationError && (
                <p className="text-xs text-red-500 font-medium ml-1 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {locationError}
                </p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Input label="Nitrogen (N)" type="number" icon={Beaker} {...register('n', { required: true })} />
              <Input label="Phosphorus (P)" type="number" icon={Beaker} {...register('p', { required: true })} />
              <Input label="Potassium (K)" type="number" icon={Beaker} {...register('k', { required: true })} />
              <Input label="Soil pH" type="number" step="0.1" icon={FlaskConical} {...register('ph', { required: true })} />
            </div>
            
            <Input label="Soil Moisture (%)" type="number" icon={Droplets} {...register('moisture', { required: true })} />
          </Card>
          
          <Card className="p-4 border-slate-100">
            <FileUpload 
              label="Upload Soil Report" 
              value={soilReport} 
              onChange={setSoilReport} 
            />
          </Card>

          <Button type="submit" className="w-full" size="lg" disabled={predicting}>
            {predicting ? 'Analyzing Soil...' : 'Predict Crop'}
          </Button>
        </form>
      </div>
    );
  };

  const CropResult = () => {
    if (!predictionResult) return null;

    const saveResult = async () => {
      if (!user) return;
      try {
        await addDoc(collection(db, 'recommendations'), {
          uid: user.uid,
          recommendedCrop: predictionResult.crop,
          cropInfo: predictionResult.info,
          imageUrl: predictionResult.image,
          reportName: predictionResult.reportName || null,
          timestamp: serverTimestamp()
        });
        alert("Result saved successfully!");
        navigate('dashboard');
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'recommendations');
      }
    };

    return (
      <div className="p-6 space-y-6 pb-24">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('crop-form')} className="p-2 rounded-xl bg-white shadow-sm border border-slate-100">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold text-slate-900">Recommended Crop</h2>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          <div className="relative rounded-3xl overflow-hidden aspect-video shadow-lg">
            <img 
              src={predictionResult.image} 
              alt={predictionResult.crop} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
              <h3 className="text-3xl font-bold text-white">{predictionResult.crop}</h3>
            </div>
          </div>

          <Card className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                <AlertCircle size={20} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Why this crop?</h4>
                <p className="text-slate-600 text-sm leading-relaxed mt-1 whitespace-pre-line">
                  {predictionResult.info}
                </p>
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-100 flex gap-3">
              <Button onClick={saveResult} className="flex-1">Save Result</Button>
              <Button variant="outline" onClick={() => navigate('dashboard')} className="flex-1">Dashboard</Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  };

  // --- Seed Traceability ---
  const TraceabilityScreen = () => {
    const [batchId, setBatchId] = useState('');
    const [searching, setSearching] = useState(false);

    const handleTrack = async () => {
      if (!batchId) return;
      setSearching(true);
      setError(null);
      try {
        const q = query(collection(db, 'batches'), where('batchId', '==', batchId));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const data = querySnapshot.docs[0].data() as Batch;
          setTrackingBatch({ ...data, id: querySnapshot.docs[0].id });
        } else {
          setError("Batch ID not found.");
          setTrackingBatch(null);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'batches');
      } finally {
        setSearching(false);
      }
    };

    const getStatus = (step: string) => {
      if (!trackingBatch) return 'pending';
      const history = trackingBatch.history || [];
      const reviews = trackingBatch.reviews || [];

      switch (step) {
        case 'Manufactured':
          return history.some(h => h.stage === 'Manufacturer') ? 'completed' : 'pending';
        case 'At Distributor':
          return history.some(h => h.stage === 'Distributor' && h.details.includes('Received')) ? 'completed' : 'pending';
        case 'Dispatched':
          return history.some(h => h.stage === 'Distributor' && h.details.includes('Dispatched')) ? 'completed' : 'pending';
        case 'At Retailer':
          return history.some(h => h.stage === 'Retailer') ? 'completed' : 'pending';
        case 'Farmer Review':
          return reviews.length > 0 ? 'completed' : 'pending';
        default:
          return 'pending';
      }
    };

    const steps = [
      { id: 'Manufactured', label: 'Manufactured', icon: <Package size={18} /> },
      { id: 'At Distributor', label: 'At Distributor', icon: <Truck size={18} /> },
      { id: 'Dispatched', label: 'Dispatched', icon: <ArrowRight size={18} /> },
      { id: 'At Retailer', label: 'At Retailer', icon: <Store size={18} /> },
      { id: 'Farmer Review', label: 'Farmer Review', icon: <Star size={18} /> },
    ];

    return (
      <div className="p-6 space-y-6 pb-24">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('dashboard')} className="p-2 rounded-xl bg-white shadow-sm border border-slate-100">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold text-slate-900">Seed Traceability</h2>
        </div>

        <div className="flex gap-2">
          <Input 
            placeholder="Enter Batch ID (e.g. BATCH-123)" 
            value={batchId} 
            onChange={(e) => setBatchId(e.target.value)} 
          />
          <Button onClick={handleTrack} disabled={searching}>
            {searching ? '...' : <Search size={20} />}
          </Button>
        </div>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        {trackingBatch && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="p-6 bg-emerald-50 border-emerald-100">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-emerald-900">{trackingBatch.seedName}</h3>
                  <p className="text-emerald-700 text-sm">{trackingBatch.seedVariety} • {trackingBatch.cropType}</p>
                </div>
                <div className="bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                  {trackingBatch.batchId}
                </div>
              </div>
            </Card>

            <div className="space-y-0 relative pl-4">
              <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-slate-100" />
              
              {steps.map((step, i) => {
                const status = getStatus(step.id);
                const isCompleted = status === 'completed';
                const historyItem = trackingBatch.history.find(h => {
                  if (step.id === 'Manufactured') return h.stage === 'Manufacturer';
                  if (step.id === 'At Distributor') return h.stage === 'Distributor' && h.details.includes('Received');
                  if (step.id === 'Dispatched') return h.stage === 'Distributor' && h.details.includes('Dispatched');
                  if (step.id === 'At Retailer') return h.stage === 'Retailer';
                  return false;
                });
                
                const reviewItem = step.id === 'Farmer Review' ? trackingBatch.reviews?.[0] : null;

                return (
                  <div key={step.id} className="flex gap-6 pb-8 relative">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center z-10 shrink-0 transition-colors duration-300",
                      isCompleted ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" : "bg-white text-slate-300 border-2 border-slate-100"
                    )}>
                      {isCompleted ? <CheckCircle2 size={16} /> : step.icon}
                    </div>
                    
                    <div className="flex-1 pt-1">
                      <div className="flex justify-between items-start">
                        <h4 className={cn(
                          "font-bold transition-colors",
                          isCompleted ? "text-slate-900" : "text-slate-400"
                        )}>
                          {step.label}
                        </h4>
                        {isCompleted && (
                          <span className="text-[10px] text-slate-400 font-medium bg-slate-50 px-2 py-0.5 rounded-full">
                            {historyItem?.timestamp?.toDate?.() ? historyItem.timestamp.toDate().toLocaleDateString() : 
                             reviewItem?.timestamp?.toDate?.() ? reviewItem.timestamp.toDate().toLocaleDateString() : 'Completed'}
                          </span>
                        )}
                      </div>
                      
                      {isCompleted && (
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {historyItem?.details || (reviewItem ? `Rated ${reviewItem.rating}/5 by ${reviewItem.farmerName}` : 'Step verified on blockchain')}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    );
  };

  // --- Role Panels ---
  const ManufacturerPanel = () => {
    const { register, handleSubmit, reset } = useForm({
      defaultValues: {
        batchId: `BATCH-${Math.floor(1000 + Math.random() * 9000)}`,
        seedName: '',
        seedVariety: '',
        cropType: ''
      }
    });
    const [creating, setCreating] = useState(false);

    const onSubmit = async (data: any) => {
      if (!user) return;
      setCreating(true);
      try {
        const batchId = data.batchId || `BATCH-${Math.floor(1000 + Math.random() * 9000)}`;
        await addDoc(collection(db, 'batches'), {
          batchId,
          seedName: data.seedName,
          seedVariety: data.seedVariety,
          cropType: data.cropType,
          manufacturerUid: user.uid,
          createdAt: serverTimestamp(),
          history: [{
            stage: 'Manufacturer',
            timestamp: new Date(),
            location: 'Main Factory',
            details: 'Seed batch produced and quality checked',
            actor: profile?.name || 'Manufacturer'
          }]
        });
        alert(`Batch ${batchId} created!`);
        reset();
        navigate('dashboard');
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'batches');
      } finally {
        setCreating(false);
      }
    };

    return (
      <div className="p-6 space-y-6 pb-24">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('dashboard')} className="p-2 rounded-xl bg-white shadow-sm border border-slate-100">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold text-slate-900">Create Batch</h2>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input 
            label="Batch ID" 
            placeholder="e.g. BATCH-2024-001"
            {...register('batchId', { required: true })} 
          />
          <Input label="Seed Name" {...register('seedName', { required: true })} />
          <Input label="Seed Variety" {...register('seedVariety', { required: true })} />
          <Input label="Crop Type" {...register('cropType', { required: true })} />
          <Button type="submit" className="w-full" size="lg" disabled={creating}>
            {creating ? 'Creating...' : 'Create Batch'}
          </Button>
        </form>
      </div>
    );
  };

  const DistributorPanel = () => {
    const { register, handleSubmit, reset } = useForm();
    const [updating, setUpdating] = useState(false);

    const onSubmit = async (data: any, type: 'receive' | 'dispatch') => {
      setUpdating(true);
      try {
        const q = query(collection(db, 'batches'), where('batchId', '==', data.batchId));
        const snap = await getDocs(q);
        if (snap.empty) throw new Error("Batch not found");
        
        const batchDoc = snap.docs[0];
        await updateDoc(doc(db, 'batches', batchDoc.id), {
          history: arrayUnion({
            stage: 'Distributor',
            timestamp: new Date(),
            location: data.location || 'Logistics Hub',
            details: type === 'receive' ? `Received at warehouse: ${data.location}` : `Dispatched via ${data.transport} (Vehicle: ${data.vehicle})`,
            actor: profile?.name || 'Distributor'
          })
        });
        alert("Batch history updated!");
        reset();
      } catch (err: any) {
        handleFirestoreError(err, OperationType.UPDATE, 'batches');
      } finally {
        setUpdating(false);
      }
    };

    return (
      <div className="p-6 space-y-8 pb-24">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('dashboard')} className="p-2 rounded-xl bg-white shadow-sm border border-slate-100">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold text-slate-900">Distributor Panel</h2>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <ArrowRight size={18} className="text-emerald-500" /> Receive Batch
          </h3>
          <Card className="p-6 space-y-4">
            <Input label="Batch ID" {...register('batchId')} />
            <Input label="Warehouse Location" {...register('location')} />
            <Button onClick={handleSubmit((d) => onSubmit(d, 'receive'))} className="w-full" disabled={updating}>Confirm Receipt</Button>
          </Card>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <Truck size={18} className="text-amber-500" /> Dispatch Batch
          </h3>
          <Card className="p-6 space-y-4">
            <Input label="Batch ID" {...register('batchId')} />
            <Input label="Transport Mode" {...register('transport')} />
            <Input label="Vehicle Number" {...register('vehicle')} />
            <Button onClick={handleSubmit((d) => onSubmit(d, 'dispatch'))} variant="secondary" className="w-full" disabled={updating}>Confirm Dispatch</Button>
          </Card>
        </div>
      </div>
    );
  };

  const RetailerScreen = () => {
    const { register, handleSubmit, reset } = useForm();
    const [updating, setUpdating] = useState(false);

    const onSubmit = async (data: any) => {
      setUpdating(true);
      try {
        const q = query(collection(db, 'batches'), where('batchId', '==', data.batchId));
        const snap = await getDocs(q);
        if (snap.empty) throw new Error("Batch not found");
        
        const batchDoc = snap.docs[0];
        await updateDoc(doc(db, 'batches', batchDoc.id), {
          retailerInfo: {
            price: Number(data.price),
            confirmed: true
          },
          history: arrayUnion({
            stage: 'Retailer',
            timestamp: new Date(),
            location: 'Local Retail Store',
            details: `Seeds available for sale at $${data.price}`,
            actor: profile?.name || 'Retailer'
          })
        });
        alert("Retail status updated!");
        reset();
      } catch (err: any) {
        handleFirestoreError(err, OperationType.UPDATE, 'batches');
      } finally {
        setUpdating(false);
      }
    };

    return (
      <div className="p-6 space-y-6 pb-24">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('dashboard')} className="p-2 rounded-xl bg-white shadow-sm border border-slate-100">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold text-slate-900">Retailer Panel</h2>
        </div>
        <Card className="p-6 space-y-4">
          <Input label="Batch ID" {...register('batchId', { required: true })} />
          <Input label="Selling Price ($)" type="number" {...register('price', { required: true })} />
          <Button onClick={handleSubmit(onSubmit)} className="w-full" size="lg" disabled={updating}>
            Confirm Received & Set Price
          </Button>
        </Card>
      </div>
    );
  };

  const ReviewScreen = () => {
    const { register, handleSubmit, reset, setValue, watch } = useForm<{ batchId: string, rating: number, reviewText: string }>({
      defaultValues: { batchId: '', rating: 5, reviewText: '' }
    });
    const [submitting, setSubmitting] = useState(false);
    const rating = watch('rating');

    const onSubmit = async (data: any) => {
      setSubmitting(true);
      try {
        const q = query(collection(db, 'batches'), where('batchId', '==', data.batchId));
        const snap = await getDocs(q);
        if (snap.empty) throw new Error("Batch not found");
        
        const batchDoc = snap.docs[0];
        await updateDoc(doc(db, 'batches', batchDoc.id), {
          reviews: arrayUnion({
            farmerName: profile?.name || 'Farmer',
            rating: data.rating,
            reviewText: data.reviewText,
            timestamp: new Date()
          })
        });
        alert("Review submitted! Thank you.");
        reset();
        navigate('dashboard');
      } catch (err: any) {
        handleFirestoreError(err, OperationType.UPDATE, 'batches');
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="p-6 space-y-6 pb-24">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('dashboard')} className="p-2 rounded-xl bg-white shadow-sm border border-slate-100">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold text-slate-900">Farmer Review</h2>
        </div>
        <Card className="p-6 space-y-6">
          <Input label="Batch ID" {...register('batchId', { required: true })} />
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 ml-1">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button 
                  key={s} 
                  type="button"
                  onClick={() => setValue('rating', s)}
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    rating >= s ? "text-amber-400" : "text-slate-200"
                  )}
                >
                  <Star size={32} fill={rating >= s ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 ml-1">Review Text</label>
            <textarea 
              {...register('reviewText', { required: true })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white min-h-[120px]"
              placeholder="How was the seed quality and yield?"
            />
          </div>

          <Button onClick={handleSubmit(onSubmit)} className="w-full" size="lg" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </Card>
      </div>
    );
  };

  // --- Profile ---
  const ProfileScreen = () => {
    return (
      <div className="p-6 space-y-6 pb-24">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('dashboard')} className="p-2 rounded-xl bg-white shadow-sm border border-slate-100">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold text-slate-900">My Profile</h2>
        </div>

        <Card className="p-8 flex flex-col items-center text-center space-y-4">
          <div className="w-24 h-24 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center border-4 border-white shadow-md">
            <User size={48} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">{profile?.name}</h3>
            <p className="text-slate-500">{profile?.email}</p>
            <div className="mt-2 inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider">
              {profile?.role}
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          <Button variant="outline" className="w-full justify-start gap-4" onClick={() => navigate('dashboard')}>
            <Home size={20} /> Dashboard
          </Button>
          <Button variant="outline" className="w-full justify-start gap-4 text-red-600 border-red-100 hover:bg-red-50" onClick={handleLogout}>
            <LogOut size={20} /> Logout
          </Button>
        </div>
      </div>
    );
  };

  // --- Navigation ---
  const BottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-3 flex justify-between items-center z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
      <button onClick={() => navigate('dashboard')} className={cn("p-2 rounded-xl transition-all", currentScreen === 'dashboard' ? "text-emerald-600 bg-emerald-50" : "text-slate-400")}>
        <Home size={24} />
      </button>
      {activeRole === 'farmer' && (
        <button onClick={() => navigate('crop-form')} className={cn("p-2 rounded-xl transition-all", currentScreen === 'crop-form' ? "text-emerald-600 bg-emerald-50" : "text-slate-400")}>
          <Leaf size={24} />
        </button>
      )}
      <button onClick={() => navigate('traceability')} className={cn("p-2 rounded-xl transition-all", currentScreen === 'traceability' ? "text-emerald-600 bg-emerald-50" : "text-slate-400")}>
        <History size={24} />
      </button>
      <button onClick={() => navigate('profile')} className={cn("p-2 rounded-xl transition-all", currentScreen === 'profile' ? "text-emerald-600 bg-emerald-50" : "text-slate-400")}>
        <User size={24} />
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="text-emerald-600"
        >
          <Leaf size={48} />
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 max-w-md mx-auto shadow-2xl relative overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {currentScreen === 'login' && <AuthScreen mode="login" />}
            {currentScreen === 'register' && <AuthScreen mode="register" />}
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

        {user && currentScreen !== 'login' && currentScreen !== 'register' && <BottomNav />}
      </div>
    </ErrorBoundary>
  );
}
