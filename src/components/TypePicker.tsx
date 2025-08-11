import React, { useMemo, useState } from 'react';

interface TypePickerProps {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

const TypePicker: React.FC<TypePickerProps> = ({ options, value, onChange, placeholder = 'Etiket Türü Seçiniz' }) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => o.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e)=>setQuery(e.target.value)}
          placeholder="Tür ara..."
          className="w-full p-2 pl-9 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
      </div>

      {options.length === 0 ? (
        <div className="text-sm text-gray-500">Yükleniyor...</div>
      ) : (
        <div className="flex flex-wrap gap-2 max-h-36 overflow-auto p-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          {filtered.length === 0 ? (
            <div className="text-sm text-gray-500 p-2">Sonuç yok</div>
          ) : (
            filtered.map(name => (
              <button
                key={name}
                type="button"
                onClick={() => onChange(name)}
                className={`px-3 py-1.5 text-sm rounded-full border transition ${
                  value === name
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 hover:bg-gray-50'
                }`}
                title={name}
              >
                {name}
              </button>
            ))
          )}
        </div>
      )}

      {!value && (
        <div className="text-xs text-gray-500">{placeholder}</div>
      )}
    </div>
  );
};

export default TypePicker;


