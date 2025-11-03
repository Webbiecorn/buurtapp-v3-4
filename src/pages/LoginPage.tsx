import React, { useEffect, useState } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { FirebaseError } from 'firebase/app';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';

const LoginPage: React.FC = () => {
  const { login, isInitialLoading } = useAppContext();
  const navigate = ReactRouterDOM.useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberEmail, setRememberEmail] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Optional custom left-top brand image from /public/brand-logo.png with fallback
  const [brandSrc, setBrandSrc] = useState<string>('/brand-logo.png');

  // Laad onthouden e-mailadres voorkeur
  useEffect(() => {
    try {
      const remember = localStorage.getItem('rememberEmail') === 'true';
      const rememberedEmail = localStorage.getItem('rememberedEmail') || '';
      setRememberEmail(remember);
      if (remember && rememberedEmail) setEmail(rememberedEmail);
    } catch {}
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      await login(email, password);
      // Onthoud e-mailadres indien aangevinkt
      try {
        if (rememberEmail) {
          localStorage.setItem('rememberEmail', 'true');
          localStorage.setItem('rememberedEmail', email);
        } else {
          localStorage.removeItem('rememberEmail');
          localStorage.removeItem('rememberedEmail');
        }
      } catch {}
      navigate('/');
  } catch (err) {
      if (err instanceof FirebaseError) {
        switch (err.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            setError('Ongeldige e-mail of wachtwoord.');
            break;
          case 'auth/invalid-email':
            setError('Voer een geldig e-mailadres in.');
            break;
          default:
            setError('Er is een onbekende fout opgetreden. Probeer het opnieuw.');
            break;
        }
      } else {
        setError('Er is een onbekende fout opgetreden. Probeer het opnieuw.');
      }
  // Laat de ingevulde waarden staan, toon foutmelding
  setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setInfo(null);
    if (!email) {
      setError('Vul eerst je e-mailadres in.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setInfo('Als dit e-mailadres bekend is, is een herstelmail verstuurd.');
    } catch (err) {
      if (err instanceof FirebaseError) {
        switch (err.code) {
          case 'auth/invalid-email':
            setError('Voer een geldig e-mailadres in.');
            break;
          case 'auth/user-not-found':
            // Veiligheidsredenen: zelfde boodschap als succes
            setInfo('Als dit e-mailadres bekend is, is een herstelmail verstuurd.');
            break;
          default:
            setError('Wachtwoord herstellen is nu niet mogelijk. Probeer later opnieuw.');
        }
      } else {
        setError('Wachtwoord herstellen is nu niet mogelijk. Probeer later opnieuw.');
      }
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Gradient background with soft blobs */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-50 via-sky-50 to-teal-50 dark:from-[#0a0a0f] dark:via-[#0b1420] dark:to-[#0a0f14]" />
      <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-indigo-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-[28rem] w-[28rem] rounded-full bg-teal-400/10 blur-3xl" />

      <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="mx-auto">
          {/* Single Login card */}
          <div className="rounded-2xl p-8 bg-white/90 dark:bg-dark-surface/95 backdrop-blur-md border border-white/40 dark:border-dark-border shadow-xl">
            <div className="flex items-center gap-2 mb-6">
              <img
                src={brandSrc}
                onError={() => setBrandSrc('/favicon.svg')}
                alt="BuurtTeam"
                className="h-16 w-16 md:h-20 md:w-20 object-contain rounded-xl shadow-md"
              />
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">BuurtTeam</h1>
                <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                  {isInitialLoading ? 'Authenticatie controleren...' : 'Log in om door te gaan'}
                </p>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleLogin}>
              <div className="space-y-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">E-mailadres</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 text-gray-900 dark:text-dark-text-primary bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-primary/30 focus:border-brand-primary transition"
                  placeholder="naam@voorbeeld.nl"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Wachtwoord</label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pr-12 px-4 py-3 text-gray-900 dark:text-dark-text-primary bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-primary/30 focus:border-brand-primary transition"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute inset-y-0 right-0 px-3 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    aria-label={showPassword ? 'Verberg wachtwoord' : 'Toon wachtwoord'}
                  >
                    {showPassword ? 'Verberg' : 'Toon'}
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <label className="inline-flex items-center text-sm text-gray-600 dark:text-dark-text-secondary">
                    <input type="checkbox" className="mr-2 rounded border-gray-300" checked={rememberEmail} onChange={(e)=>setRememberEmail(e.target.checked)} />
                    E-mailadres onthouden
                  </label>
                  <button type="button" onClick={handleForgotPassword} className="text-sm font-medium text-brand-primary hover:underline">
                    Wachtwoord vergeten?
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 text-center text-red-800 bg-red-100 rounded-lg dark:bg-red-900/30 dark:text-red-300">
                  {error}
                </div>
              )}
              {info && (
                <div className="p-3 text-center text-emerald-800 bg-emerald-100 rounded-lg dark:bg-emerald-900/30 dark:text-emerald-300">
                  {info}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || isInitialLoading}
                  className="w-full px-4 py-3 font-semibold text-white bg-brand-primary rounded-xl hover:bg-brand-secondary focus:outline-none focus:ring-4 focus:ring-brand-primary/30 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Inloggen...' : 'Inloggen'}
                </button>
              </div>
            </form>

            <p className="mt-6 text-[13px] text-gray-500 dark:text-gray-400">
              Door in te loggen ga je akkoord met onze voorwaarden.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
