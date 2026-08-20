import React, { useEffect, useState } from 'react';
import { BalloonLogo } from './BalloonLogo';
import { CurrencySymbol } from './CurrencySymbol';
import { getUsers, saveUsers, setCurrentUser } from '../data/storage';
import { User } from '../types';
import { CheckCircle2, ShieldCheck, UserCheck, Smartphone, Cpu, KeyRound, AlertCircle, ArrowRight, UserPlus, LogIn, Sparkles } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

type AuthStep = 'login_pin' | 'login_password' | 'register_form' | 'verifying_20s' | 'pin_setup' | 'completed';

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [step, setStep] = useState<AuthStep>('login_pin');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Easter egg: 20 clicks on logo
  const [logoClicks, setLogoClicks] = useState(0);
  const [isDeveloperSecret, setIsDeveloperSecret] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // PIN inputs
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // 20s Verification Timer State
  const [countdown, setCountdown] = useState(20);
  const [verifProgress, setVerifProgress] = useState(0);
  const [currentDiagMessage, setCurrentDiagMessage] = useState('Nawiązywanie bezpiecznego połączenia z węzłem Neisser...');
  const [errorMsg, setErrorMsg] = useState('');

  const users = getUsers();

  useEffect(() => {
    if (users.length > 0 && !selectedUser) {
      setSelectedUser(users[0]);
    }
  }, [users, selectedUser]);

  const handleLogoClick = () => {
    const nextCount = logoClicks + 1;
    setLogoClicks(nextCount);
    if (nextCount >= 20) {
      setIsDeveloperSecret(true);
    }
  };

  // 20 seconds verification countdown handler
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'verifying_20s') {
      if (countdown > 0) {
        timer = setInterval(() => {
          setCountdown((prev) => {
            const next = prev - 1;
            setVerifProgress(((20 - next) / 20) * 100);

            if (next === 16) setCurrentDiagMessage('Skanowanie podpisu sprzętowego urządzenia...');
            if (next === 12) setCurrentDiagMessage('Weryfikacja unikalności danych w rejestrze Neisser Core...');
            if (next === 8) setCurrentDiagMessage('Generowanie 16-cyfrowego numeru wirtualnej karty debetowej...');
            if (next === 4) setCurrentDiagMessage('Szyfrowanie kluczy kryptograficznych portfela NSD...');
            if (next === 1) setCurrentDiagMessage('Finalizacja protokołu bezpieczeństwa...');

            return next;
          });
        }, 1000);
      } else {
        // Exactly 20s passed -> Ready for 6-digit PIN setup!
        setStep('pin_setup');
      }
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  if (!isOpen) return null;

  const handleStartRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim() || !surname.trim() || !city.trim() || !email.trim() || !password) {
      setErrorMsg('Wszystkie pola są wymagane.');
      return;
    }

    if (password.length < 4) {
      setErrorMsg('Hasło musi mieć co najmniej 4 znaki.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Hasła nie są identyczne.');
      return;
    }

    // Start strict 20-second verification screen
    setCountdown(20);
    setVerifProgress(0);
    setCurrentDiagMessage('Nawiązywanie bezpiecznego połączenia z węzłem Neisser...');
    setStep('verifying_20s');
  };

  const handleCompletePinSetup = () => {
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setErrorMsg('Kod PIN musi składać się z dokładnie 6 cyfr.');
      return;
    }
    if (pin !== confirmPin) {
      setErrorMsg('Wpisane kody PIN się nie zgadzają.');
      return;
    }

    // Generate unique card number ID: "4820 XXXX XXXX XXXX"
    const randomBlock1 = Math.floor(1000 + Math.random() * 9000);
    const randomBlock2 = Math.floor(1000 + Math.random() * 9000);
    const randomBlock3 = Math.floor(1000 + Math.random() * 9000);
    const generatedCardId = `4820 ${randomBlock1} ${randomBlock2} ${randomBlock3}`;

    const newUser: User = {
      id: generatedCardId,
      name: name.trim(),
      surname: surname.trim(),
      city: city.trim(),
      email: email.trim(),
      pin: pin,
      password: password,
      role: isDeveloperSecret ? 'developer' : 'user',
      balanceNSD: 75.0, // Standard starting balance 75 NSD for everyone including developer
      level: 1,
      avatarUrl: '',
      bio: isDeveloperSecret
        ? 'Główny Deweloper i Założyciel ekosystemu Neisser.'
        : `Nowy mieszkaniec miasta ${city.trim()} w Neisserze.`,
      createdAt: new Date().toISOString().slice(0, 10),
      expressTransfersRemainingToday: 2,
      friends: ['4820 1192 8834 0001'], // Connected with Developer by default
      ownedCatCards: ['cat-4'], // Starting starter cat card
      cryptoPortfolio: {},
    };

    const currentUsers = getUsers();
    currentUsers.push(newUser);
    saveUsers(currentUsers);
    setCurrentUser(newUser.id);

    onSuccess(newUser);
    onClose();
  };

  const handlePinLogin = (pinCode: string) => {
    if (!selectedUser) return;
    if (selectedUser.pin === pinCode) {
      setCurrentUser(selectedUser.id);
      onSuccess(selectedUser);
      onClose();
    } else {
      setErrorMsg('Niepoprawny 6-cyfrowy kod PIN.');
      setPin('');
    }
  };

  const handleNumberClick = (digit: string) => {
    setErrorMsg('');
    if (step === 'login_pin') {
      if (pin.length < 6) {
        const nextPin = pin + digit;
        setPin(nextPin);
        if (nextPin.length === 6) {
          setTimeout(() => handlePinLogin(nextPin), 150);
        }
      }
    } else if (step === 'pin_setup') {
      if (pin.length < 6) {
        setPin(pin + digit);
      } else if (confirmPin.length < 6) {
        setConfirmPin(confirmPin + digit);
      }
    }
  };

  const handleBackspace = () => {
    if (step === 'login_pin') {
      setPin((prev) => prev.slice(0, -1));
    } else if (step === 'pin_setup') {
      if (confirmPin.length > 0) {
        setConfirmPin((prev) => prev.slice(0, -1));
      } else {
        setPin((prev) => prev.slice(0, -1));
      }
    }
  };

  return (
    <div
      id="neisser-auth-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
    >
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950 p-6 text-white shadow-2xl">
        {/* Brand Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <button
            type="button"
            onClick={handleLogoClick}
            className="cursor-pointer transition-transform active:scale-95 focus:outline-none"
            title="Logo Neisser"
          >
            <BalloonLogo size="lg" className="mb-3" />
          </button>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Neisser
          </h2>
          <p className="text-xs text-neutral-400">
            Bankowość społeczności i rodziny w walucie NSD
          </p>

          {isDeveloperSecret && (
            <div className="mt-2.5 rounded-lg border border-purple-500/60 bg-purple-950/60 px-3 py-1.5 text-xs text-purple-200 flex items-center gap-2 animate-pulse">
              <Sparkles className="h-3.5 w-3.5 text-purple-300 shrink-0" />
              <span>Odblokowano uprawnienia Dewelopera</span>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Quick PIN Login */}
        {step === 'login_pin' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-3">
              <label className="block text-[11px] font-medium text-neutral-400 mb-1.5">
                Wybierz konto użytkownika:
              </label>
              <select
                id="auth-user-selector"
                value={selectedUser?.id || ''}
                onChange={(e) => {
                  const u = users.find((x) => x.id === e.target.value);
                  if (u) {
                    setSelectedUser(u);
                    setPin('');
                    setErrorMsg('');
                  }
                }}
                className="w-full rounded-lg border border-neutral-700 bg-black px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.surname} ({u.role === 'developer' ? '👑 Deweloper' : u.city}) • {u.id}
                  </option>
                ))}
              </select>
            </div>

            {selectedUser && (
              <div className="text-center py-2">
                <p className="text-xs text-neutral-400 mb-2">
                  Wpisz 6-cyfrowy kod PIN dla <span className="text-white font-medium">{selectedUser.name} {selectedUser.surname}</span>
                </p>
                {/* 6 Dots PIN preview */}
                <div className="flex justify-center gap-3 my-3">
                  {[0, 1, 2, 3, 4, 5].map((idx) => (
                    <div
                      key={idx}
                      className={`h-4 w-4 rounded-full border transition-all ${
                        pin.length > idx
                          ? 'border-white bg-white scale-110'
                          : 'border-neutral-700 bg-neutral-900'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Custom PIN Keypad */}
            <div className="grid grid-cols-3 gap-2 pt-2 max-w-[280px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((item, idx) => {
                if (item === '') return <div key={idx} />;
                if (item === '⌫') {
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={handleBackspace}
                      className="flex h-12 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-sm font-semibold text-neutral-400 active:bg-neutral-800"
                    >
                      Usuń
                    </button>
                  );
                }
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleNumberClick(item)}
                    className="flex h-12 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-lg font-bold text-white transition-colors active:bg-white active:text-black"
                  >
                    {item}
                  </button>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-neutral-800 flex justify-between items-center text-xs">
              <button
                type="button"
                onClick={() => {
                  setStep('register_form');
                  setErrorMsg('');
                }}
                className="inline-flex items-center gap-1.5 text-neutral-300 hover:text-white underline underline-offset-4"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Zarejestruj nowe konto
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedUser) {
                    setCurrentUser(selectedUser.id);
                    onSuccess(selectedUser);
                    onClose();
                  }
                }}
                className="text-neutral-400 hover:text-white"
              >
                Szybkie wejście →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Registration Form */}
        {step === 'register_form' && (
          <form onSubmit={handleStartRegistration} className="space-y-3">
            <div className="text-left mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Krok 1: Wypełnij formularz
              </span>
              <h3 className="text-lg font-bold text-white">Rejestracja w Neisser</h3>
            </div>

            {isDeveloperSecret && (
              <div className="rounded-lg border border-purple-500/50 bg-purple-950/40 p-2.5 text-xs text-purple-200 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />
                <span>
                  <strong>Tryb Dewelopera:</strong> Konto tworzone ze standardowym saldem startowym 75 NSD i dostępem do panelu zarządzania.
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Imię</label>
                <input
                  id="reg-name"
                  type="text"
                  placeholder=""
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Nazwisko</label>
                <input
                  id="reg-surname"
                  type="text"
                  placeholder=""
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Miasto</label>
              <input
                id="reg-city"
                type="text"
                placeholder=""
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Adres E-mail</label>
              <input
                id="reg-email"
                type="email"
                placeholder=""
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Hasło</label>
                <input
                  id="reg-password"
                  type="password"
                  placeholder=""
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Potwierdź hasło</label>
                <input
                  id="reg-confirm-password"
                  type="password"
                  placeholder=""
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                id="reg-submit-button"
                type="submit"
                className="w-full rounded-xl bg-white py-3 text-sm font-bold text-black transition-colors hover:bg-neutral-200 active:scale-[0.99] flex items-center justify-center gap-2"
              >
                Rozpocznij weryfikację bezpieczeństwa (20s)
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep('login_pin');
                  setErrorMsg('');
                }}
                className="text-xs text-neutral-400 hover:text-white"
              >
                Masz już konto? Zaloguj się kodem PIN
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Strict 20-second Device & Data Verification */}
        {step === 'verifying_20s' && (
          <div className="text-center py-6 space-y-6">
            <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900">
              <Cpu className="h-10 w-10 text-white animate-pulse" />
              <div className="absolute inset-0 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            </div>

            <div>
              <div className="text-3xl font-mono font-bold text-white mb-1">
                {countdown}s
              </div>
              <h3 className="text-base font-bold text-white">
                Weryfikacja urządzenia i rejestracja danych
              </h3>
              <p className="text-xs text-neutral-400 mt-2 min-h-[32px] px-4 font-mono">
                {currentDiagMessage}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-white h-2 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${verifProgress}%` }}
              />
            </div>

            <div className="flex items-center justify-center gap-4 text-[11px] text-neutral-500">
              <span className="flex items-center gap-1">
                <Smartphone className="h-3.5 w-3.5" /> Urządzenie: OK
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Szyfrowanie: AES-256
              </span>
            </div>
          </div>
        )}

        {/* STEP 4: 6-digit PIN Setup */}
        {step === 'pin_setup' && (
          <div className="space-y-4 text-center">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-neutral-900 border border-neutral-800 text-white mb-1">
              <KeyRound className="h-6 w-6" />
            </div>

            <div>
              <span className="inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-white mb-2">
                Gotowe! Weryfikacja zakończona sukcesem
              </span>
              <h3 className="text-lg font-bold text-white">
                {pin.length < 6 ? 'Ustaw swój 6-cyfrowy kod PIN' : 'Potwierdź swój 6-cyfrowy kod PIN'}
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Będziesz go używać do codziennego szybkiego logowania w Neisserze.
              </p>
            </div>

            {/* PIN Dots Preview */}
            <div className="space-y-2 my-2">
              <p className="text-[11px] text-neutral-400">
                {pin.length < 6 ? 'Nowy PIN:' : 'Potwierdzenie:'}
              </p>
              <div className="flex justify-center gap-3">
                {[0, 1, 2, 3, 4, 5].map((idx) => {
                  const isFilled = pin.length < 6 ? pin.length > idx : confirmPin.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`h-4 w-4 rounded-full border transition-all ${
                        isFilled
                          ? 'border-white bg-white scale-110'
                          : 'border-neutral-700 bg-neutral-900'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2 pt-2 max-w-[280px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((item, idx) => {
                if (item === '') return <div key={idx} />;
                if (item === '⌫') {
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={handleBackspace}
                      className="flex h-12 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-sm font-semibold text-neutral-400 active:bg-neutral-800"
                    >
                      Usuń
                    </button>
                  );
                }
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleNumberClick(item)}
                    className="flex h-12 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-lg font-bold text-white transition-colors active:bg-white active:text-black"
                  >
                    {item}
                  </button>
                );
              })}
            </div>

            {pin.length === 6 && confirmPin.length === 6 && (
              <button
                type="button"
                onClick={handleCompletePinSetup}
                className="w-full rounded-xl bg-white py-3 text-sm font-bold text-black transition-colors hover:bg-neutral-200 mt-2"
              >
                Zatwierdź PIN i wejdź do Neissera
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
