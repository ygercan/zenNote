export function evaluateMath(expression: string): string | null {
  // Remove non-math characters (allow numbers, operators, parens, spaces)
  const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
  
  // If empty or just spaces, return null
  if (!sanitized.trim()) return null;

  try {
    // Use Function constructor as a safer alternative to eval for simple math
    // This is still not 100% safe but better than direct eval for this context
    // In a real app, use a math parser library
    const result = new Function(`return (${sanitized})`)();
    
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      // Format to avoid long decimals
      return Number.isInteger(result) ? result.toString() : result.toFixed(2);
    }
  } catch (e) {
    return null;
  }
  return null;
}

export function getListMarker(line: string): string | null {
  const trimmed = line.trim();
  if (trimmed.startsWith('- ')) return '- ';
  if (trimmed.startsWith('* ')) return '* ';
  if (trimmed.startsWith('[] ')) return '[] ';
  if (trimmed.startsWith('[x] ')) return '[x] ';
  
  const match = trimmed.match(/^(\d+)\.\s/);
  if (match) return match[0];
  
  return null;
}

export function getNextListPrefix(line: string): string | null {
  const marker = getListMarker(line);
  if (!marker) return null;
  
  if (marker === '- ') return '- ';
  if (marker === '* ') return '* ';
  if (marker === '[] ') return '[] ';
  if (marker === '[x] ') return '[] '; // Next item should be unchecked
  
  const match = marker.match(/^(\d+)\.\s/);
  if (match) {
    const num = parseInt(match[1], 10);
    return `${num + 1}. `;
  }
  
  return null;
}

export function convertCurrency(expression: string, rates: Record<string, number> | null): string | null {
  if (!rates) return null;
  
  // Pattern: "100 USD to TRY" or "100 USD kaç TRY"
  const match = expression.trim().match(/^(\d+(?:\.\d+)?)\s+([a-zA-Z]{3})\s+(?:to|kaç)\s+([a-zA-Z]{3})$/i);
  
  if (!match) return null;
  
  const amount = parseFloat(match[1]);
  const from = match[2].toUpperCase();
  const to = match[3].toUpperCase();
  
  if (!rates[from] || !rates[to]) return null;
  
  // Convert to USD then to target
  const inUSD = amount / rates[from];
  const result = inUSD * rates[to];
  
  return `${amount} ${from} = ${result.toFixed(2)} ${to}`;
}

// Regex patterns for highlighting
export const PATTERNS = {
  // Code Block: ```code```
  CODE_BLOCK: /(`{3}[\s\S]*?`{3})/g,
  
  // Inline Code: `code`
  CODE_INLINE: /(`[^`\n]+`)/g,

  // Heading: # Heading
  HEADING: /^(#+\s.*)$/gm,

  // Quote: > Quote
  QUOTE: /^(>.*)$/gm,

  // Math: numbers and operators, e.g., "10 + 5", "3.14 * 2"
  // We look for sequences of numbers and operators, ensuring at least one operator exists
  MATH: /(?:^|[\s])(\d+(?:\.\d+)?(?:\s*[\+\-\*\/]\s*\d+(?:\.\d+)?)+)(?=[\s=]|$)/g,
  
  // Currency: "100 USD to TRY"
  CURRENCY: /(\d+(?:\.\d+)?\s+[a-zA-Z]{3}\s+to\s+[a-zA-Z]{3})/gi,
  
  // Lists: "- ", "* ", "1. ", "[] " at start of line
  LIST_MARKER: /^(\s*(?:[-*]\s|\d+\.\s|\[\]\s))/gm,
  
  // Completed List Item: "[x] "
  LIST_DONE: /^(\s*\[x\]\s)/gm,

  // Bold: **bold**
  BOLD: /(\*\*[^*]+\*\*)/g,
  
  // Date: "tomorrow at 3 PM", "next Friday", "today", "bugün", "yarın", "gelecek cuma", "mart 15", "march 15"
  DATE: /(?:^|[\s])(today|tomorrow|next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|bugün|yarın|gelecek\s+(?:pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar)|(?:pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar)|(?:january|february|march|april|may|june|july|august|september|october|november|december|ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık)\s+\d{1,2})(?:\s+(?:at|saat)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?))?/gi,
};

export type Token = {
  type: 'text' | 'math' | 'currency' | 'list' | 'list-done' | 'heading' | 'quote' | 'code' | 'bold' | 'italic' | 'date';
  content: string;
};

export function tokenize(text: string): Token[] {
  const tokens: Token[] = [{ type: 'text', content: text }];

  // Helper to split tokens by regex
  const splitTokens = (
    currentTokens: Token[], 
    regex: RegExp, 
    type: Token['type']
  ): Token[] => {
    const newTokens: Token[] = [];
    
    for (const token of currentTokens) {
      if (token.type !== 'text') {
        newTokens.push(token);
        continue;
      }

      const matches = Array.from(token.content.matchAll(regex));
      
      if (matches.length === 0) {
        newTokens.push(token);
        continue;
      }

      let lastIndex = 0;
      for (const match of matches) {
        const matchText = match[0]; // The full match
        const targetText = match[1] || match[0]; 
        const startIndex = match.index! + match[0].indexOf(targetText);
        
        // Text before match
        if (startIndex > lastIndex) {
          newTokens.push({ type: 'text', content: token.content.slice(lastIndex, startIndex) });
        }
        
        // The match
        newTokens.push({ type, content: targetText });
        
        lastIndex = startIndex + targetText.length;
      }
      
      // Remaining text
      if (lastIndex < token.content.length) {
        newTokens.push({ type: 'text', content: token.content.slice(lastIndex) });
      }
    }
    return newTokens;
  };

  // Apply tokenizers in order of specificity
  let result = tokens;
  
  // Block elements first
  result = splitTokens(result, PATTERNS.CODE_BLOCK, 'code');
  result = splitTokens(result, PATTERNS.HEADING, 'heading');
  result = splitTokens(result, PATTERNS.QUOTE, 'quote');
  result = splitTokens(result, PATTERNS.LIST_DONE, 'list-done');
  result = splitTokens(result, PATTERNS.LIST_MARKER, 'list');
  
  // Inline elements
  result = splitTokens(result, PATTERNS.CODE_INLINE, 'code');
  result = splitTokens(result, PATTERNS.CURRENCY, 'currency');
  result = splitTokens(result, PATTERNS.MATH, 'math');
  result = splitTokens(result, PATTERNS.DATE, 'date');
  result = splitTokens(result, PATTERNS.BOLD, 'bold');
  result = splitTokens(result, /(\*[^*]+\*)/g, 'italic'); 

  return result;
}

export function parseDate(expression: string, language: 'en' | 'tr' = 'en'): string | null {
  const now = new Date();
  const lower = expression.toLowerCase().trim();
  
  let targetDate = new Date(now);
  
  // 1. Check for explicit Month Day
  const monthsEn = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const monthsTr = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'];
  
  let monthIndex = -1;
  let day = -1;
  
  // Try to find month and day
  for (let i = 0; i < 12; i++) {
    if (lower.includes(monthsEn[i])) {
      monthIndex = i;
      const match = lower.match(new RegExp(`${monthsEn[i]}\\s+(\\d{1,2})`));
      if (match) day = parseInt(match[1], 10);
      break;
    }
    if (lower.includes(monthsTr[i])) {
      monthIndex = i;
      const match = lower.match(new RegExp(`${monthsTr[i]}\\s+(\\d{1,2})`));
      if (match) day = parseInt(match[1], 10);
      break;
    }
  }

  if (monthIndex !== -1 && day !== -1) {
    targetDate.setMonth(monthIndex);
    targetDate.setDate(day);
    // If date is in the past, assume next year
    if (targetDate < now && !lower.includes('last')) {
      targetDate.setFullYear(now.getFullYear() + 1);
    }
  } else {
    // 2. Existing logic for today/tomorrow/days
    const isToday = lower.includes('today') || lower.includes('bugün');
    const isTomorrow = lower.includes('tomorrow') || lower.includes('yarın');
    const isNext = lower.includes('next') || lower.includes('gelecek') || lower.includes('haftaya');

    if (isToday) {
      // Already set to now
    } else if (isTomorrow) {
      targetDate.setDate(now.getDate() + 1);
    } else {
      const enDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const trDays = ['pazar', 'pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma', 'cumartesi'];
      
      let targetDay = enDays.findIndex(d => lower.includes(d));
      if (targetDay === -1) {
        targetDay = trDays.findIndex(d => lower.includes(d));
      }

      if (targetDay !== -1) {
        let diff = targetDay - now.getDay();
        if (isNext) {
          if (diff <= 0) diff += 7;
        } else {
          if (diff < 0) diff += 7;
        }
        targetDate.setDate(now.getDate() + diff);
      } else if (!isToday && !isTomorrow) {
        return null; // No date found
      }
    }
  }

  // Handle "at 3 PM" or "saat 15:00"
  const timeMatch = lower.match(/(?:at|saat)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2] || '0', 10);
    const ampm = timeMatch[3];

    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;

    targetDate.setHours(hours, minutes, 0, 0);
  } else {
    targetDate.setHours(9, 0, 0, 0); // Default to 9 AM if no time
  }

  return targetDate.toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: language !== 'tr' 
  });
}
