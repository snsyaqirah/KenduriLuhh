import { useState } from 'react';
import { Users, Wallet, MapPin, Calendar, Utensils, FileText, Percent, User, Globe } from 'lucide-react';
import { ModeToggle } from './ModeToggle';
import type { CateringRequest, Language, Mode } from '../types';

interface Props {
  onSubmit: (req: CateringRequest) => void;
  disabled?: boolean;
}

export function ChatInput({ onSubmit, disabled }: Props) {
  const [mode, setMode]         = useState<Mode>('katering');
  const [language, setLanguage] = useState<Language>('ms');
  const [eventType, setEventType]     = useState('');
  const [pax, setPax]                 = useState('');
  const [budget, setBudget]           = useState('');
  const [location, setLocation]       = useState('');
  const [date, setDate]               = useState('');
  const [dietary, setDietary]         = useState('');
  const [special, setSpecial]         = useState('');
  const [margin, setMargin]           = useState('');
  const [coordinator, setCoordinator] = useState('');

  // today in YYYY-MM-DD for min date
  const today = new Date().toISOString().split('T')[0];

  const valid =
    eventType.trim() &&
    Number(pax) >= 10 &&
    Number(budget) > 0 &&
    date >= today &&
    location.trim();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || disabled) return;
    onSubmit({
      mode,
      language,
      event_type: eventType.trim(),
      pax: Number(pax),
      budget_myr: Number(budget),
      event_date: date,
      event_location: location.trim(),
      dietary_notes: dietary.trim() || undefined,
      special_requests: special.trim() || undefined,
      profit_margin_percent: margin ? Number(margin) : undefined,
      coordinator_name: coordinator.trim() || undefined,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 flex flex-col gap-6"
    >
      {/* Top row: Mode + Language */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex flex-col gap-2 flex-1">
          <label className="text-xs font-semibold text-stone-400 uppercase tracking-widest">
            Pilih Mod / Mode
          </label>
          <ModeToggle value={mode} onChange={setMode} disabled={disabled} />
        </div>

        <div className="flex flex-col gap-2 sm:w-48">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-400 uppercase tracking-widest">
            <Globe size={12} className="text-emerald-600" />
            Language
          </label>
          <div className="relative flex rounded-xl bg-stone-100 p-1 gap-0">
            {(['ms', 'en'] as Language[]).map((lang) => (
              <button
                key={lang}
                type="button"
                disabled={disabled}
                onClick={() => setLanguage(lang)}
                className={[
                  'relative flex-1 rounded-lg py-2.5 text-xs font-semibold transition-colors duration-200 cursor-pointer z-10',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                  disabled ? 'cursor-not-allowed' : '',
                  language === lang ? 'text-white' : 'text-stone-500 hover:text-stone-700',
                ].join(' ')}
              >
                {language === lang && (
                  <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 shadow-sm" />
                )}
                <span className="relative z-10">{lang === 'ms' ? '🇲🇾 BM' : '🇬🇧 EN'}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FloatField label="Jenis Majlis *" icon={<Utensils size={15} />}>
          <input
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            disabled={disabled}
            placeholder="Wedding, Aqiqah, Corporate Dinner…"
            className={inputCls}
            required
          />
        </FloatField>

        <FloatField label="Bilangan Tetamu (pax) *" icon={<Users size={15} />}>
          <input
            type="number"
            min={10}
            max={5000}
            value={pax}
            onChange={(e) => setPax(e.target.value)}
            disabled={disabled}
            placeholder="cth: 300"
            className={inputCls}
            required
          />
        </FloatField>

        <FloatField label="Bajet (RM) *" icon={<Wallet size={15} />}>
          <input
            type="number"
            min={1}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            disabled={disabled}
            placeholder="cth: 15000"
            className={inputCls}
            required
          />
        </FloatField>

        <FloatField label="Lokasi Majlis *" icon={<MapPin size={15} />}>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={disabled}
            placeholder="cth: Shah Alam, Selangor"
            className={inputCls}
            required
          />
        </FloatField>

        <FloatField label="Tarikh Majlis *" icon={<Calendar size={15} />}>
          <input
            type="date"
            min={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={disabled}
            className={inputCls}
            required
          />
        </FloatField>

        <FloatField label="Keperluan Pemakanan / Halal" icon={<Utensils size={15} />}>
          <input
            value={dietary}
            onChange={(e) => setDietary(e.target.value)}
            disabled={disabled}
            placeholder="cth: Halal, tiada kacang"
            className={inputCls}
          />
        </FloatField>

        {mode === 'katering' && (
          <FloatField label="Target Margin Untung (%)" icon={<Percent size={15} />}>
            <input
              type="number"
              min={0}
              max={100}
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
              disabled={disabled}
              placeholder="cth: 20"
              className={inputCls}
            />
          </FloatField>
        )}

        {mode === 'rewang' && (
          <FloatField label="Nama Penyelaras Rewang" icon={<User size={15} />}>
            <input
              value={coordinator}
              onChange={(e) => setCoordinator(e.target.value)}
              disabled={disabled}
              placeholder="cth: Mak Cik Rohani"
              className={inputCls}
            />
          </FloatField>
        )}
      </div>

      <FloatField label="Permintaan Khas" icon={<FileText size={15} />}>
        <textarea
          rows={2}
          value={special}
          onChange={(e) => setSpecial(e.target.value)}
          disabled={disabled}
          placeholder="cth: Tema tradisional, nak ada live cooking, set buffet…"
          className={`${inputCls} resize-none`}
        />
      </FloatField>

      <button
        type="submit"
        disabled={!valid || disabled}
        className={[
          'w-full rounded-xl py-3.5 font-semibold text-sm transition-all duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
          valid && !disabled
            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-200 cursor-pointer'
            : 'bg-stone-100 text-stone-400 cursor-not-allowed',
        ].join(' ')}
      >
        {disabled ? 'Ejen sedang berunding…' : '🚀 Mulakan Perancangan'}
      </button>
    </form>
  );
}

function FloatField({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-xs font-medium text-stone-500">
        <span className="text-emerald-600">{icon}</span>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-800 ' +
  'placeholder:text-stone-400 focus:outline-none focus:border-emerald-400 focus:bg-white ' +
  'focus:ring-2 focus:ring-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all';
