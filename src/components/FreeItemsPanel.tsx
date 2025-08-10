import React from 'react';

export type FreeItemType = 'text' | 'barcode' | 'image' | 'line' | 'circle' | 'ring';
export interface FreeItem {
  id: string;
  type: FreeItemType;
  x: number;
  y: number;
  widthMm?: number;
  heightMm?: number;
  text?: string;
  fontMm?: number;
  wrapWidthMm?: number;
  src?: string;
  zIndex?: number;
}

interface FreeItemsPanelProps {
  items: FreeItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMoveLayer: (id: string, dir: 'up' | 'down') => void;
  onReorder: (dragId: string, dropId: string) => void;
  onClear: () => void;
}

const FreeItemsPanel: React.FC<FreeItemsPanelProps> = ({ items, selectedId, onSelect, onMoveLayer, onReorder, onClear }) => {
  const [dragId, setDragId] = React.useState<string | null>(null);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Öğeler</div>
        <button type="button" className="flex items-center gap-1 px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50" onClick={onClear}>
          Temizle
        </button>
      </div>
      <div className="max-h-40 overflow-auto rounded border bg-gray-50 dark:bg-gray-700/40">
        {items.length===0 ? (
          <div className="text-xs text-gray-500 p-2">Henüz öğe yok. Soldan ekleyin.</div>
        ) : (
          <ul className="divide-y text-sm">
            {[...items].sort((a,b)=> (b.zIndex||0)-(a.zIndex||0)).map((it) => (
              <li
                key={it.id}
                className="px-2 py-1 flex items-center gap-2 cursor-move"
                draggable
                onDragStart={()=> setDragId(it.id)}
                onDragOver={(e)=> e.preventDefault()}
                onDrop={()=>{ if(dragId) onReorder(dragId, it.id); setDragId(null); }}
              >
                <span className="inline-flex w-4 h-4 items-center justify-center text-[10px] rounded bg-gray-200 text-gray-700">
                  {it.type==='text' ? 'T' : it.type==='barcode' ? 'B' : 'G'}
                </span>
                <button className={`text-left truncate flex-1 ${selectedId===it.id ? 'font-medium text-purple-700' : ''}`} onClick={()=>onSelect(it.id)}>
                  {it.type==='text' ? (it.text||'Metin') : it.type==='barcode' ? (it.text||'Barkod') : 'Görsel'}
                </button>
                <div className="flex items-center gap-2">
                  <button className="text-xs px-1 py-0.5 rounded border" onClick={()=> onMoveLayer(it.id, 'down')}>Alt</button>
                  <button className="text-xs px-1 py-0.5 rounded border" onClick={()=> onMoveLayer(it.id, 'up')}>Üst</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default FreeItemsPanel;



