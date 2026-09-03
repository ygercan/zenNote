import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info, X } from 'lucide-react';

import { Language, translations } from '../utils/i18n';

export default function ShortcutsHUD({ language }: { language: Language }) {
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
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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
            className="absolute bottom-10 right-0 w-72 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-gray-100 dark:border-neutral-800 p-5 max-h-[calc(100vh-200px)] overflow-y-auto z-50"
          >
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white dark:bg-neutral-900 z-10 pb-2 border-b border-gray-100 dark:border-neutral-800">
              <h3 className="font-sans font-semibold text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t.shortcuts}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <ShortcutItem command={language === 'tr' ? 'Matematik' : 'Math'} description={language === 'tr' ? "'10 * 5 =' yazıp Enter'a basın" : "Type '10 * 5 =' then Enter"} />
              <ShortcutItem command={language === 'tr' ? 'Döviz' : 'Currency'} description={language === 'tr' ? "'100 USD' yazıp Enter'a basın" : "Type '100 USD' then Enter"} />
              <ShortcutItem command={language === 'tr' ? 'Tarih' : 'Date'} description={language === 'tr' ? "'yarın saat 15' yazıp Enter'a basın" : "Type 'tomorrow at 3 PM' then Enter"} />
              
              <div className="h-px bg-gray-100 dark:bg-neutral-800 my-2" />
              
              <ShortcutItem command={language === 'tr' ? 'Başlık' : 'Heading'} description={language === 'tr' ? "Satıra '# ' ile başlayın" : "Start line with '# '"} />
              <ShortcutItem command={language === 'tr' ? 'Alıntı' : 'Quote'} description={language === 'tr' ? "Satıra '> ' ile başlayın" : "Start line with '> '"} />
              <ShortcutItem command={language === 'tr' ? 'Liste' : 'List'} description={language === 'tr' ? "'- ', '* ' veya '1. ' ile başlayın" : "Start with '- ', '* ', or '1. '"} />
              <ShortcutItem command={language === 'tr' ? 'Görev Listesi' : 'Task List'} description={language === 'tr' ? "'[] ' veya '[x] ' ile başlayın" : "Start with '[] ' or '[x] '"} />
              
              <div className="h-px bg-gray-100 dark:bg-neutral-800 my-2" />
              
              <ShortcutItem command={language === 'tr' ? 'Kalın' : 'Bold'} description={language === 'tr' ? "Metni **yıldızlar** içine alın" : "Wrap text in **asterisks**"} />
              <ShortcutItem command={language === 'tr' ? 'Kod' : 'Code'} description={language === 'tr' ? "Metni `ters tırnak` içine alın" : "Wrap text in `backticks`"} />
              
              <div className="h-px bg-gray-100 dark:bg-neutral-800 my-2" />
              
              <ShortcutItem command={language === 'tr' ? 'Ayarlar' : 'Settings'} description="Ctrl/Cmd + Shift + S" />
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-neutral-800">
              <p className="text-xs text-center text-gray-400">
                ZenNote v1.1
              </p>
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
        <span className="text-[10px] uppercase tracking-wider font-semibold">{t.shortcuts}</span>
        <Info size={12} strokeWidth={2.5} />
      </motion.button>
    </div>
  );
}

function ShortcutItem({ command, description }: { command: string; description: string }) {
  return (
    <div className="flex justify-between items-start text-sm">
      <span className="font-medium text-gray-900 dark:text-gray-100">{command}</span>
      <span className="text-gray-500 dark:text-gray-400 text-right max-w-[60%]">{description}</span>
    </div>
  );
}
