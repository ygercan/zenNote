import { useState, useEffect, useRef, ChangeEvent, KeyboardEvent, useMemo, CSSProperties } from 'react';
import { evaluateMath, getListMarker, getNextListPrefix, convertCurrency, tokenize, Token, parseDate } from '../utils/smartEngine';
import { Check, Loader2, Copy, Eye, Edit3, Moon, Sun, Monitor } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import ShortcutsHUD from './ShortcutsHUD';
import SettingsHUD from './SettingsHUD';

import { Language, translations } from '../utils/i18n';

const COMMON_STYLES = "w-full h-full p-8 md:p-16 leading-relaxed whitespace-pre-wrap break-words font-medium transition-all duration-300";

export default function Editor() {
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  
  // Settings state
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState('var(--font-poppins)');
  const [color, setColor] = useState('var(--color-ink)');
  const [language, setLanguage] = useState<Language>('en');
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [spellcheckEnabled, setSpellcheckEnabled] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [currencyPicker, setCurrencyPicker] = useState<{
    show: boolean;
    amount: number;
    from: string;
    position: { top: number; left: number };
    selectedIndex: number;
  }>({ show: false, amount: 0, from: '', position: { top: 0, left: 0 }, selectedIndex: 0 });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch rates on mount
  useEffect(() => {
    fetch('/api/rates')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setRates(data);
        }
      })
      .catch(err => console.error('Failed to fetch rates:', err));
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    const savedContent = localStorage.getItem('zen-note-content');
    if (savedContent) {
      setContent(savedContent);
    }
    
    const savedSettings = localStorage.getItem('zen-note-settings');
    if (savedSettings) {
      try {
        const { fontSize, fontFamily, color, language, spellcheckEnabled, theme: savedTheme } = JSON.parse(savedSettings);
        if (fontSize) setFontSize(fontSize);
        if (fontFamily) setFontFamily(fontFamily);
        if (color) setColor(color);
        if (language) setLanguage(language);
        if (spellcheckEnabled !== undefined) setSpellcheckEnabled(spellcheckEnabled);
        if (savedTheme) setTheme(savedTheme);
      } catch (e) {
        console.error('Failed to parse settings');
      }
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('zen-note-settings', JSON.stringify({ fontSize, fontFamily, color, language, spellcheckEnabled, theme }));
  }, [fontSize, fontFamily, color, language, spellcheckEnabled, theme]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) root.classList.add('dark');
      else root.classList.remove('dark');
    } else if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Listen for system theme changes if set to system
  useEffect(() => {
    if (theme !== 'system') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      if (e.matches) root.classList.add('dark');
      else root.classList.remove('dark');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Auto-save effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem('zen-note-content', content);
      setSaveStatus('saved');
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [content]);

  // Save on unmount
  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.setItem('zen-note-content', content);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [content]);

  // Auto-save effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem('zen-note-content', content);
      setSaveStatus('saved');
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [content]);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setSaveStatus('saving');

    // Handle cursor visibility
    setIsTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000); // Show cursor after 1 second of inactivity
  };

  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle currency picker navigation
    if (currencyPicker.show) {
      const targetCurrencies = language === 'tr' ? ['TRY', 'EUR', 'GBP', 'USD'] : ['USD', 'EUR', 'GBP', 'TRY'];
      const filteredTargets = targetCurrencies.filter(c => c !== currencyPicker.from);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCurrencyPicker(prev => ({ ...prev, selectedIndex: (prev.selectedIndex + 1) % filteredTargets.length }));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCurrencyPicker(prev => ({ ...prev, selectedIndex: (prev.selectedIndex - 1 + filteredTargets.length) % filteredTargets.length }));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const target = filteredTargets[currencyPicker.selectedIndex];
        insertCurrencyResult(currencyPicker.amount, currencyPicker.from, target);
        return;
      }
      if (e.key === 'Escape') {
        setCurrencyPicker(prev => ({ ...prev, show: false }));
        return;
      }
    }

    if (e.key === 'Enter') {
      const textarea = e.currentTarget;
      const cursorPosition = textarea.selectionStart;
      const textBeforeCursor = content.substring(0, cursorPosition);
      const textAfterCursor = content.substring(cursorPosition);
      
      // Get current line
      const lines = textBeforeCursor.split('\n');
      const currentLine = lines[lines.length - 1];

      // Check for quick currency (e.g., "100 USD")
      const quickCurrencyMatch = currentLine.trim().match(/^(\d+(?:\.\d+)?)\s+([a-zA-Z]{3})$/i);
      if (quickCurrencyMatch && !currentLine.includes(' to ') && !currentLine.includes(' kaç ')) {
        const amount = parseFloat(quickCurrencyMatch[1]);
        const from = quickCurrencyMatch[2].toUpperCase();
        
        if (rates && rates[from]) {
          e.preventDefault();
          
          // Calculate position for the picker
          // This is a simplified approach, ideally we'd use a hidden span to measure text
          const rect = textarea.getBoundingClientRect();
          const lineHeight = 28; // Approximate
          const linesCount = textBeforeCursor.split('\n').length;
          
          setCurrencyPicker({
            show: true,
            amount,
            from,
            position: { 
              top: (linesCount * lineHeight) + 20, 
              left: 60 // Approximate indentation
            },
            selectedIndex: 0
          });
          return;
        }
      }

      // Check for date parsing
      const dateMatch = currentLine.trim().match(/(?:today|tomorrow|next\s+\w+|\w+|bugün|yarın|gelecek\s+\w+)(?:\s+(?:at|saat)\s+\d+)?/i);
      if (dateMatch) {
        const result = parseDate(currentLine, language);
        if (result) {
          e.preventDefault();
          const newText = textBeforeCursor + '\n' + result + '\n' + textAfterCursor;
          setContent(newText);
          setSaveStatus('saving');
          
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = textareaRef.current.selectionEnd = cursorPosition + 1 + result.length + 1;
              handleScroll();
            }
          }, 0);
          return;
        }
      }

      // Check for math
      // If line ends with '=', calculate
      if (currentLine.trim().endsWith('=')) {
        const expression = currentLine.trim().slice(0, -1); // Remove '='
        const result = evaluateMath(expression);
        
        if (result) {
          e.preventDefault();
          const newText = textBeforeCursor + ' ' + result + '\n' + textAfterCursor;
          setContent(newText);
          setSaveStatus('saving');
          
          // Move cursor after the result and newline
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = textareaRef.current.selectionEnd = cursorPosition + result.length + 2; // +2 for space and newline
              // Sync scroll after cursor move
              handleScroll();
            }
          }, 0);
          return;
        }
      }

      // Check for currency conversion
      const currencyResult = convertCurrency(currentLine, rates);
      if (currencyResult) {
        e.preventDefault();
        const newText = textBeforeCursor + '\n' + currencyResult + '\n' + textAfterCursor;
        setContent(newText);
        setSaveStatus('saving');
        
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = cursorPosition + 1 + currencyResult.length + 1;
            handleScroll();
          }
        }, 0);
        return;
      }

      // Check for list
      const listMarker = getListMarker(currentLine);
      if (listMarker) {
        e.preventDefault();
        
        // If line is just the marker, remove it (user wants to exit list)
        if (currentLine.trim() === listMarker.trim()) {
           const newTextBefore = textBeforeCursor.slice(0, -currentLine.length); // Remove the empty list item
           const newText = newTextBefore + textAfterCursor;
           setContent(newText);
           setSaveStatus('saving');
           
           setTimeout(() => {
             if (textareaRef.current) {
               textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newTextBefore.length;
               handleScroll();
             }
           }, 0);
           return;
        }

        // Add new list item
        const nextPrefix = getNextListPrefix(currentLine);
        if (nextPrefix) {
          const newText = textBeforeCursor + '\n' + nextPrefix + textAfterCursor;
          setContent(newText);
          setSaveStatus('saving');
          
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = textareaRef.current.selectionEnd = cursorPosition + 1 + nextPrefix.length;
              handleScroll();
            }
          }, 0);
          return;
        }
      }
    }
  };

  // Auto-focus on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback(text);
      setTimeout(() => setCopyFeedback(null), 2000);
    });
  };

  const insertCurrencyResult = (amount: number, from: string, to: string) => {
    if (!rates || !textareaRef.current) return;
    
    const inUSD = amount / rates[from];
    const result = inUSD * rates[to];
    const resultText = `${result.toFixed(2)} ${to}`;
    
    const textarea = textareaRef.current;
    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = content.substring(0, cursorPosition);
    const textAfterCursor = content.substring(cursorPosition);
    
    const newText = textBeforeCursor + '\n' + resultText + '\n' + textAfterCursor;
    setContent(newText);
    setSaveStatus('saving');
    setCurrencyPicker(prev => ({ ...prev, show: false }));
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = cursorPosition + 1 + resultText.length + 1;
        handleScroll();
      }
    }, 0);
  };

  const tokens = useMemo(() => tokenize(content), [content]);
  const t = translations[language];

  const editorStyles = {
    fontSize: `${fontSize}px`,
    fontFamily: fontFamily,
    color: color,
    lineHeight: '1.6',
  } as CSSProperties;

  return (
    <div className="w-full h-full flex flex-col bg-[var(--color-paper)] relative overflow-hidden">
      {/* Main Editor Area */}
      <div className="flex-1 relative overflow-hidden" style={editorStyles}>
        {/* Highlighter Overlay - Now on top but with pointer-events-none except for smart tokens */}
        <div 
          ref={highlightRef}
          className={`absolute inset-0 pointer-events-none overflow-hidden z-20 ${COMMON_STYLES}`}
          aria-hidden="true"
          style={{ color: 'inherit' }}
        >
          {tokens.map((token, index) => {
            const isSmart = token.type === 'math' || token.type === 'currency';
            
            switch (token.type) {
              case 'heading':
                return <span key={index} className="font-bold opacity-90">{token.content}</span>;
              case 'quote':
                return <span key={index} className="italic opacity-60 border-l-4 border-gray-300 dark:border-neutral-700 pl-4 inline-block w-full">{token.content}</span>;
              case 'code':
                return <span key={index} className="bg-black/5 dark:bg-white/5 rounded px-1">{token.content}</span>;
              case 'bold':
                return <span key={index} className="font-bold">{token.content}</span>;
              case 'italic':
                return <span key={index} className="italic">{token.content}</span>;
              case 'math':
              case 'currency':
              case 'date':
                return (
                  <span 
                    key={index} 
                    onClick={() => handleCopy(token.content)}
                    className={`cursor-pointer pointer-events-auto transition-colors px-0.5 rounded ${
                      token.type === 'math' 
                        ? 'text-blue-600 dark:text-blue-400 hover:bg-blue-500/10' 
                        : token.type === 'currency'
                        ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                        : 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
                    } font-bold`}
                    title={t.clickToCopy}
                  >
                    {token.content}
                  </span>
                );
              case 'list':
              case 'list-done':
                return <span key={index} className="text-orange-600 dark:text-orange-400 font-bold">{token.content}</span>;
              default:
                return <span key={index}>{token.content}</span>;
            }
          })}
          {/* Add a trailing newline if content ends with one, to match textarea behavior */}
          {content.endsWith('\n') && <br />}
        </div>

        {/* Editor Input - Now below the overlay but still functional for non-smart areas */}
        {viewMode === 'editor' ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            onClick={() => setCurrencyPicker(prev => ({ ...prev, show: false }))}
            placeholder={t.startTyping}
            className={`absolute inset-0 resize-none outline-none border-none bg-transparent z-10 overflow-auto hide-scrollbar show-scrollbar-on-interaction ${COMMON_STYLES} placeholder:text-gray-300`}
            spellCheck={spellcheckEnabled}
            style={{ 
              color: spellcheckEnabled ? 'rgba(0,0,0,0.01)' : 'transparent',
              caretColor: isTyping ? 'transparent' : 'currentColor'
            }}
          />
        ) : (
          <div className={`absolute inset-0 overflow-auto z-30 bg-[var(--color-paper)] prose dark:prose-invert max-w-none ${COMMON_STYLES}`}>
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}

        {/* Currency Picker Popover */}
        <AnimatePresence>
          {currencyPicker.show && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{ 
                top: currencyPicker.position.top, 
                left: currencyPicker.position.left 
              }}
              className="absolute z-50 bg-white dark:bg-neutral-900 rounded-lg shadow-2xl border border-gray-100 dark:border-neutral-800 p-1 min-w-[120px]"
            >
              {(language === 'tr' ? ['TRY', 'EUR', 'GBP', 'USD'] : ['USD', 'EUR', 'GBP', 'TRY'])
                .filter(c => c !== currencyPicker.from)
                .map((target, idx) => (
                  <button
                    key={target}
                    onClick={() => insertCurrencyResult(currencyPicker.amount, currencyPicker.from, target)}
                    onMouseEnter={() => setCurrencyPicker(prev => ({ ...prev, selectedIndex: idx }))}
                    className={`w-full text-left px-3 py-2 text-sm rounded flex justify-between items-center transition-colors ${
                      currencyPicker.selectedIndex === idx 
                        ? 'bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-white' 
                        : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-neutral-800/50'
                    }`}
                  >
                    <span className="font-bold">{target}</span>
                    {rates && (
                      <span className="text-[10px] opacity-50 ml-4">
                        1 {currencyPicker.from} = {(rates[target] / rates[currencyPicker.from]).toFixed(4)}
                      </span>
                    )}
                  </button>
                ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Copy Feedback Toast */}
        <AnimatePresence>
          {copyFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 20, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 20, x: '-50%' }}
              className="absolute bottom-8 left-1/2 z-50 bg-gray-900 text-white text-xs py-2 px-4 rounded-full shadow-lg flex items-center gap-2"
            >
              <Copy size={12} />
              <span>{t.copied}: {copyFeedback}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Area */}
      <div className="h-7 px-6 flex items-center justify-between border-t border-gray-100 dark:border-neutral-800/50 bg-[var(--color-paper)] z-20">
        {/* Save Status Indicator */}
        <div className="flex items-center gap-2 opacity-60 transition-opacity duration-300">
          {saveStatus === 'saving' ? (
            <>
              <Loader2 size={12} className="animate-spin text-gray-400" />
              <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">{t.saving}</span>
            </>
          ) : (
            <>
              <Check size={12} className="text-gray-300 dark:text-gray-600" />
              <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-300 dark:text-gray-600">{t.saved}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Theme Toggle Button */}
          <button
            onClick={() => {
              if (theme === 'system') setTheme('light');
              else if (theme === 'light') setTheme('dark');
              else setTheme('system');
            }}
            className="flex items-center gap-1.5 opacity-40 hover:opacity-100 transition-all duration-300 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            {theme === 'system' && (
              <>
                <span className="text-[10px] uppercase tracking-wider font-semibold">{t.themeSystem}</span>
                <Monitor size={12} />
              </>
            )}
            {theme === 'light' && (
              <>
                <span className="text-[10px] uppercase tracking-wider font-semibold">{t.themeLight}</span>
                <Sun size={12} />
              </>
            )}
            {theme === 'dark' && (
              <>
                <span className="text-[10px] uppercase tracking-wider font-semibold">{t.themeDark}</span>
                <Moon size={12} />
              </>
            )}
          </button>

          <button
            onClick={() => setViewMode(viewMode === 'editor' ? 'preview' : 'editor')}
            className="flex items-center gap-1.5 opacity-40 hover:opacity-100 transition-all duration-300 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            {viewMode === 'editor' ? (
              <>
                <span className="text-[10px] uppercase tracking-wider font-semibold">{t.previewMode}</span>
                <Eye size={12} />
              </>
            ) : (
              <>
                <span className="text-[10px] uppercase tracking-wider font-semibold">{t.editorMode}</span>
                <Edit3 size={12} />
              </>
            )}
          </button>

          <SettingsHUD 
            fontSize={fontSize} 
            setFontSize={setFontSize} 
            fontFamily={fontFamily} 
            setFontFamily={setFontFamily}
            color={color}
            setColor={setColor}
            language={language}
            setLanguage={setLanguage}
            spellcheckEnabled={spellcheckEnabled}
            setSpellcheckEnabled={setSpellcheckEnabled}
          />
          <ShortcutsHUD language={language} />
        </div>
      </div>
    </div>
  );
}
