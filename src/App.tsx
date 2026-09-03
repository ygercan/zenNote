/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Editor from './components/Editor';

export default function App() {
  return (
    <main className="min-h-screen w-full relative flex items-center justify-center bg-gray-100 dark:bg-neutral-900 p-4 md:p-8">
      <div className="w-full max-w-4xl h-[80vh] shadow-2xl rounded-2xl overflow-hidden resize min-h-[300px] min-w-[300px] relative bg-[var(--color-paper)] group">
        <Editor />
        {/* Visual indicator for resize handle */}
        <div className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-end justify-end p-1 opacity-20 group-hover:opacity-50 transition-opacity pointer-events-none">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="text-[var(--color-ink)]">
            <path d="M12 12L12 0L0 12Z" />
          </svg>
        </div>
      </div>
    </main>
  );
}
