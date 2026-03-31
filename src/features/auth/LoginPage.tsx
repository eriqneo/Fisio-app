import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { userService, tenantService } from '@/db/services';
import { authLib } from '@/lib/auth';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

export default function LoginPage() {
  const [step, setStep] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Registration state
  const [regClinicName, setRegClinicName] = useState('');
  const [regSlug, setRegSlug] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();

  const from = location.state?.from?.pathname || '/';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const normalizedEmail = email.toLowerCase().trim();
      const user = await userService.findByEmail(normalizedEmail);
      
      if (!user) {
        setError('Invalid credentials.');
        return;
      }

      const tenant = await tenantService.findById(user.tenantId);
      if (!tenant) {
        setError('Clinic not found.');
        return;
      }

      const isValid = await authLib.verifyPassword(password, user.passwordHash);
      if (!isValid) {
        setError('Invalid credentials.');
        return;
      }

      const token = await authLib.createToken({ 
        sub: user.id, 
        email: user.email, 
        role: user.role,
        tenantId: user.tenantId 
      });

      setAuth(user, tenant, token);
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const slugLower = regSlug.toLowerCase().trim();
      const emailLower = regEmail.toLowerCase().trim();

      if (!slugLower) {
        setError('Slug is required.');
        return;
      }

      // 1. Check if slug exists
      const existingTenant = await tenantService.findBySlug(slugLower);
      if (existingTenant) {
        setError('Clinic slug already taken.');
        return;
      }

      // 2. Check if email exists
      const existingUser = await userService.findByEmail(emailLower);
      if (existingUser) {
        setError('Email already registered.');
        return;
      }

      // 3. Create Tenant
      const tenantId = await tenantService.create({
        slug: slugLower,
        name: regClinicName,
        plan: 'pro',
        createdAt: Date.now()
      });

      // 4. Create Admin User
      const passwordHash = await authLib.hashPassword(regPassword);
      const userId = await userService.create({
        tenantId,
        name: regName,
        email: emailLower,
        passwordHash,
        role: 'admin'
      });

      const user = await userService.findById(userId);
      const tenant = await tenantService.findById(tenantId);

      if (user && tenant) {
        const token = await authLib.createToken({ 
          sub: user.id, 
          email: user.email, 
          role: user.role,
          tenantId: user.tenantId 
        });

        setAuth(user, tenant, token);
        navigate(from, { replace: true });
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetDemo = async () => {
    setIsLoading(true);
    try {
      const { db } = await import('@/db/schema');
      await db.delete();
      window.location.reload();
    } catch (err) {
      setError('Reset failed.');
    } finally {
      setIsLoading(false);
      setIsResetConfirmOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md bg-white rounded-3xl border border-primary/5 shadow-2xl shadow-primary/5 overflow-hidden relative z-10"
      >
        <div className="p-10">
          <header className="text-center mb-10">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/10">
              <Shield className="text-accent" size={32} />
            </div>
            <h1 className="text-3xl font-serif text-primary mb-2">PhysioFlow</h1>
            <p className="text-primary/40 text-sm font-medium uppercase tracking-widest">
              {step === 'register' ? 'Clinic Registration' : 'Log In'}
            </p>
          </header>

          <AnimatePresence mode="wait">
            {step === 'login' ? (
              <motion.form 
                key="login-step"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleLogin}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-primary/40 uppercase tracking-widest ml-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/20" size={18} />
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="physio@example.com"
                        className="w-full pl-12 pr-4 py-4 bg-surface-muted border-none rounded-2xl text-sm focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-primary/20"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-primary/40 uppercase tracking-widest ml-1">Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/20 group-focus-within:text-accent transition-colors" size={18} />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-12 py-4 bg-surface-muted border-none rounded-2xl text-sm focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-primary/20"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-primary/20 hover:text-primary transition-colors p-1"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-error text-xs font-bold bg-error/5 p-3 rounded-xl">
                    <AlertCircle size={14} />
                    {error}
                  </div>
                )}

                <div className="space-y-3">
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/10"
                  >
                    {isLoading ? 'Authenticating...' : 'Log In'}
                  </button>
                  
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setError('Demo Hint: Use admin@demo.com / password123');
                      }}
                      className="text-[10px] text-primary/30 font-bold uppercase tracking-widest hover:text-primary transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-primary/5"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-primary/20 font-bold">New to PhysioFlow?</span>
                    </div>
                  </div>

                  <button 
                    type="button"
                    onClick={() => {
                      setError('');
                      setStep('register');
                    }}
                    className="w-full py-4 border-2 border-primary/5 text-primary rounded-2xl font-bold text-sm hover:bg-surface-muted transition-all"
                  >
                    Create New Clinic
                  </button>
                </div>
              </motion.form>
            ) : (
              <motion.form 
                key="register-step"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleRegister}
                className="space-y-4"
              >
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-primary/40 uppercase tracking-widest ml-1">Clinic Name</label>
                    <input 
                      type="text" 
                      value={regClinicName}
                      onChange={(e) => setRegClinicName(e.target.value)}
                      placeholder="City Physiotherapy"
                      className="w-full px-4 py-3 bg-surface-muted border-none rounded-xl text-sm focus:ring-2 focus:ring-accent/20 transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-primary/40 uppercase tracking-widest ml-1">Clinic Slug (URL)</label>
                    <input 
                      type="text" 
                      value={regSlug}
                      onChange={(e) => setRegSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                      placeholder="city-physio"
                      className="w-full px-4 py-3 bg-surface-muted border-none rounded-xl text-sm focus:ring-2 focus:ring-accent/20 transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-primary/40 uppercase tracking-widest ml-1">Admin Name</label>
                    <input 
                      type="text" 
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Dr. Smith"
                      className="w-full px-4 py-3 bg-surface-muted border-none rounded-xl text-sm focus:ring-2 focus:ring-accent/20 transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-primary/40 uppercase tracking-widest ml-1">Admin Email</label>
                    <input 
                      type="email" 
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="admin@clinic.com"
                      className="w-full px-4 py-3 bg-surface-muted border-none rounded-xl text-sm focus:ring-2 focus:ring-accent/20 transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-primary/40 uppercase tracking-widest ml-1">Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/20 group-focus-within:text-accent transition-colors" size={16} />
                      <input 
                        type={showRegPassword ? "text" : "password"} 
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-3 bg-surface-muted border-none rounded-xl text-sm focus:ring-2 focus:ring-accent/20 transition-all"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/20 hover:text-primary transition-colors p-1"
                      >
                        {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-error text-xs font-bold bg-error/5 p-3 rounded-xl">
                    <AlertCircle size={14} />
                    {error}
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/10"
                  >
                    {isLoading ? 'Setting up Clinic...' : 'Finish Registration'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setStep('login')}
                    className="w-full py-2 text-primary/40 text-xs font-bold uppercase tracking-widest hover:text-primary transition-colors"
                  >
                    Back to Log In
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
        
        <div className="bg-surface-muted p-6 text-center space-y-3">
          <p className="text-[10px] text-primary/30 font-bold uppercase tracking-widest">
            Secure Medical-Grade Authentication
          </p>
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="text-[9px] text-primary/20 hover:text-error font-bold uppercase tracking-widest transition-colors"
          >
            Reset Demo Data
          </button>
        </div>
      </motion.div>

      <ConfirmationModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetDemo}
        title="Reset Demo Environment"
        description="This will permanently clear all local clinic data, patients, and billing records to reset the demo environment. This action cannot be undone."
        variant="danger"
        confirmText="Reset Everything"
      />
    </div>
  );
}
