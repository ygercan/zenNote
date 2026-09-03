import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, X, Type, Palette, Layout, Globe, Check } from 'lucide-react';
import { Language, translations } from '../utils/i18n';

interface SettingsProps {
  fontSize: number;
  setFontSize: (size: number) => void;
  fontFamily: string;
  setFontFamily: (family: string) => void;
  color: string;
  setColor: (color: string) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  spellcheckEnabled: boolean;
  setSpellcheckEnabled: (enabled: boolean) => void;
}

const FONTS = [
  { name: 'Poppins', value: 'var(--font-poppins)' },
  { name: 'Montserrat', value: 'var(--font-montserrat)' },
  { name: 'Inter', value: 'var(--font-sans)' },
  { name: 'Mono', value: 'var(--font-mono)' },
  { name: 'Serif', value: 'serif' },
];

const COLORS = [
  { name: 'Default', value: 'var(--color-ink)' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Green', value: '#059669' },
  { name: 'Purple', value: '#7c3aed' },
  { name: 'Red', value: '#dc2626' },
];

export default function SettingsHUD({ 
  fontSize, 
  setFontSize, 
  fontFamily, 
  setFontFamily, 
  color, 
  setColor,
  language,
  setLanguage,
  spellcheckEnabled,
  setSpellcheckEnabled
}: SettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hudRef = useRef<HTMLDivElement>(null);
  const t = translations[language];

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (hudRef.current && !hudRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        setIsOpen(prev => !prev);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="relative" ref={hudRef}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-10 right-0 w-64 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-gray-100 dark:border-neutral-800 p-5 z-50"
          >
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white dark:bg-neutral-900 z-10 pb-2 border-b border-gray-100 dark:border-neutral-800">
              <h3 className="font-sans font-semibold text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Settings size={14} /> {t.settings}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-5">
              {/* Language */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-2">
                  <Globe size={12} /> {t.language}
                </label>
                <div className="flex gap-2">
                  {(['en', 'tr'] as Language[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      className={`px-3 py-1 text-xs rounded border transition-all uppercase font-bold ${
                        language === lang 
                          ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-black dark:border-white' 
                          : 'border-gray-100 dark:border-neutral-800 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-2">
                  <Layout size={12} /> {t.fontSize}: {fontSize}px
                </label>
                <input 
                  type="range" 
                  min="12" 
                  max="32" 
                  value={fontSize} 
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="w-full h-1 bg-gray-100 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-gray-900 dark:accent-white"
                />
              </div>

              {/* Font Family */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-2">
                  <Type size={12} /> {t.fontFamily}
                </label>
                <div className="flex flex-wrap gap-2">
                  {FONTS.map((f) => (
                    <button
                      key={f.name}
                      onClick={() => setFontFamily(f.value)}
                      className={`px-2 py-1 text-xs rounded border transition-all ${
                        fontFamily === f.value 
                          ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-black dark:border-white' 
                          : 'border-gray-100 dark:border-neutral-800 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-2">
                  <Palette size={12} /> {t.inkColor}
                </label>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setColor(c.value)}
                      title={c.name}
                      className={`w-5 h-5 rounded-full border-2 transition-all ${
                        color === c.value ? 'border-gray-400 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c.value.startsWith('var') ? 'currentColor' : c.value }}
                    />
                  ))}
                </div>
              </div>

              {/* Spellcheck */}
              <div className="pt-2 border-t border-gray-100 dark:border-neutral-800">
                <button
                  onClick={() => setSpellcheckEnabled(!spellcheckEnabled)}
                  className="w-full flex items-center justify-between group"
                >
                  <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-2">
                    <Check size={12} className={spellcheckEnabled ? 'text-emerald-500' : 'text-gray-300'} /> {t.spellcheck}
                  </span>
                  <div className={`w-8 h-4 rounded-full transition-colors relative ${spellcheckEnabled ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-neutral-800'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${spellcheckEnabled ? 'left-4.5' : 'left-0.5'}`} />
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ opacity: 1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 transition-all duration-300 ${
          isOpen 
            ? 'opacity-100 text-gray-900 dark:text-white' 
            : 'opacity-40 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
        }`}
      >
        <span className="text-[10px] uppercase tracking-wider font-semibold">{t.settings}</span>
        <Settings size={12} strokeWidth={2.5} />
      </motion.button>
    </div>
  );
}
