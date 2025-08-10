import React from 'react';

type AnchorKey = 'title' | 'productName' | 'details' | 'barcode';

type Pos = { x: number; y: number };

type ElementStyles = {
  title: { font: number; widthMm: number };
  productName: { font: number; wrapWidth: number };
  details: { font: number; lineGap: number; widthMm: number };
  barcode: { height: number; widthMm: number };
};

type FreeItemType = 'text' | 'barcode' | 'image' | 'line' | 'circle' | 'ring';
type FreeItem = {
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
};

interface PreviewCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  overlayRef: React.RefObject<HTMLDivElement>;
  labelWidth: number;
  labelHeight: number;
  zoom: number;
  showGrid: boolean;
  gridMm: number;
  showPreview: boolean;

  activeTab: 'standart' | 'serbest';
  editMode: boolean;

  visible: Record<AnchorKey, boolean>;
  anchors: Record<AnchorKey, Pos>;
  styles: ElementStyles;

  freeItems: FreeItem[];
  selectedFreeId: string | null;

  setDragKey: (k: AnchorKey | null) => void;
  setDraggingAnchorKey: (k: AnchorKey | null) => void;
  setDragOffset: (o: { dx: number; dy: number }) => void;
  setResizingKey: (k: AnchorKey | null) => void;
  setResizingAnchorKeyGlobal: (k: AnchorKey | null) => void;
  setResizeStart: (v: {
    x0: number; y0: number; wMm: number; hMm: number;
    productFont: number; productWrap: number; titleFont: number;
    detailsGap: number; detailsFont: number; bcHeight: number; bcScale: number;
  }) => void;

  setDraggingFreeId: (id: string | null) => void;
  setSelectedFreeId: (id: string | null) => void;
  setEditingFreeId: (id: string | null) => void;
  setFreeDraft: (v: any) => void;
  setShowFreeDialog: (v: boolean) => void;
  setRemoveTarget: (k: AnchorKey | null) => void;
  setRemoveFreeId: (id: string | null) => void;
  setResizingFreeIdGlobal: (id: string | null) => void;
}

const PreviewCanvas: React.FC<PreviewCanvasProps> = (props) => {
  const {
    canvasRef,
    overlayRef,
    labelWidth,
    labelHeight,
    zoom,
    showGrid,
    gridMm,
    showPreview,
    activeTab,
    editMode,
    visible,
    anchors,
    styles,
    freeItems,
    selectedFreeId,
    setDragKey,
    setDraggingAnchorKey,
    setDragOffset,
    setResizingKey,
    setResizingAnchorKeyGlobal,
    setResizeStart,
    setDraggingFreeId,
    setSelectedFreeId,
    setEditingFreeId,
    setFreeDraft,
    setShowFreeDialog,
    setRemoveTarget,
    setRemoveFreeId,
    setResizingFreeIdGlobal,
  } = props;

  if (!showPreview) return null;

  return (
    <div
      className={`bg-gray-50 dark:bg-gray-700 rounded-md p-4 mb-4 ${showGrid ? 'bg-[linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)]' : ''}`}
      style={showGrid ? { backgroundSize: `${gridMm*3.78*zoom}px ${gridMm*3.78*zoom}px` } : undefined}
    >
      <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md p-4 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-auto border border-gray-300"
          style={{
            width: `${labelWidth * 3.78 * zoom}px`,
            height: `${labelHeight * 3.78 * zoom}px`,
            maxWidth: '100%'
          }}
        />

        {editMode && (
          <div ref={overlayRef} className="absolute inset-4 pointer-events-none select-none z-10">
            {/* Standart şablon öğeleri (yalnızca Standart sekmesinde) */}
            {activeTab==='standart' && (['title','productName','details','barcode'] as const).filter(k=>visible[k]).map((key) => (
              <div
                key={key}
                className="absolute bg-blue-500/10 border border-blue-500 text-[10px] text-blue-800 rounded pointer-events-auto z-20"
                style={{
                  left: `${anchors[key].x * 3.78 * zoom}px`,
                  top: `${anchors[key].y * 3.78 * zoom}px`,
                  width: (() => {
                    const base = 3.78 * zoom;
                    if (key==='productName') return `${styles.productName.wrapWidth * base}px`;
                    if (key==='barcode') return `${styles.barcode.widthMm * base}px`;
                    if (key==='details') return `${styles.details.widthMm * base}px`;
                    return `${styles.title.widthMm * base}px`;
                  })(),
                  height: (() => {
                    const base = 3.78 * zoom;
                    if (key==='title') return `${(styles.title.font + 2) * base}px`;
                    if (key==='productName') return `${(styles.productName.font * 2 + styles.details.lineGap) * base}px`;
                    if (key==='details') return `${(styles.details.lineGap * 6) * base}px`;
                    return `${(styles.barcode.height + 8) * base}px`;
                  })(),
                  cursor: 'move'
                }}
                onMouseDown={(e) => {
                  setDragKey(key);
                  setDraggingAnchorKey(key);
                  const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                  setDragOffset({ dx: e.clientX - (rect.left + anchors[key].x * 3.78 * zoom), dy: e.clientY - (rect.top + anchors[key].y * 3.78 * zoom) });
                }}
                onMouseUp={() => { setDragKey(null); setDraggingAnchorKey(null); }}
              >
                <div className="absolute left-1 top-1 text-[10px] px-1 py-0.5 bg-white/60 rounded">{key}</div>
                {/* Remove button */}
                <button
                  type="button"
                  className="absolute right-1 top-1 w-4 h-4 leading-4 text-[10px] bg-red-600 text-white rounded hover:bg-red-700"
                  onClick={(e) => { e.stopPropagation(); setRemoveTarget(key); }}
                  title="Kaldır"
                >×</button>
                {/* Resize handle */}
                <div
                  className="absolute right-0 bottom-0 w-3 h-3 bg-blue-600 cursor-se-resize"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setResizingKey(key);
                    setResizingAnchorKeyGlobal(key);
                    const parent = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                    setResizeStart({
                      x0: e.clientX,
                      y0: e.clientY,
                      wMm: parseFloat(((parent.width)/(3.78*zoom)).toFixed(2)),
                      hMm: parseFloat(((parent.height)/(3.78*zoom)).toFixed(2)),
                      productFont: styles.productName.font,
                      productWrap: styles.productName.wrapWidth,
                      titleFont: styles.title.font,
                      detailsGap: styles.details.lineGap,
                      detailsFont: styles.details.font,
                      bcHeight: styles.barcode.height,
                      bcScale: 1
                    });
                  }}
                  onMouseUp={() => { setResizingKey(null); setResizingAnchorKeyGlobal(null); }}
                />
              </div>
            ))}

            {/* Serbest mod öğeleri (sadece editMode'da görünür) */}
            {activeTab==='serbest' && freeItems.map((item) => (
              <div
                key={item.id}
                className={`absolute bg-purple-500/10 border border-purple-500 text-[10px] text-purple-800 rounded pointer-events-auto z-20 ${selectedFreeId===item.id ? 'ring-2 ring-purple-500' : ''}`}
                style={{
                  left: `${item.x * 3.78 * zoom}px`,
                  top: `${item.y * 3.78 * zoom}px`,
                  width: `${(item.widthMm || 40) * 3.78 * zoom}px`,
                  height: `${(item.heightMm || (item.type==='text' ? (item.fontMm||4)+6 : item.type==='line' ? 0.6 : 12)) * 3.78 * zoom}px`,
                  cursor: 'move'
                }}
                onMouseDown={(e) => {
                  setSelectedFreeId(item.id);
                  setDragKey('title');
                  setDraggingFreeId(item.id);
                  const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                  setDragOffset({ dx: e.clientX - (rect.left + item.x * 3.78 * zoom), dy: e.clientY - (rect.top + item.y * 3.78 * zoom) });
                }}
                onMouseUp={() => {
                  setDragKey(null);
                  setDraggingFreeId(null);
                }}
              >
                <div className="absolute left-1 top-1 text-[10px] px-1 py-0.5 bg-white/60 rounded">{item.type}</div>
                {/* Çift tık: düzenleme dialogu */}
                <div
                  className="absolute inset-0"
                  onDoubleClick={(e)=>{
                    e.stopPropagation();
                    setEditingFreeId(item.id);
                    setFreeDraft({ ...item, type: item.type });
                    setShowFreeDialog(true);
                  }}
                />
                <button
                  type="button"
                  className="absolute right-1 top-1 w-4 h-4 leading-4 text-[10px] bg-red-600 text-white rounded hover:bg-red-700"
                  onClick={(e) => { e.stopPropagation(); setRemoveFreeId(item.id); }}
                  title="Kaldır"
                >×</button>
                <div
                  className="absolute right-0 bottom-0 w-3 h-3 bg-purple-600 cursor-se-resize"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setResizingKey('productName');
                    setResizingFreeIdGlobal(item.id);
                    const parent = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                    setResizeStart({
                      x0: e.clientX,
                      y0: e.clientY,
                      wMm: parseFloat(((parent.width)/(3.78*zoom)).toFixed(2)),
                      hMm: parseFloat(((parent.height)/(3.78*zoom)).toFixed(2)),
                      productFont: item.fontMm || 4,
                      productWrap: item.wrapWidthMm || 60,
                      titleFont: 0,
                      detailsGap: 0,
                      detailsFont: 0,
                      bcHeight: item.heightMm || 12,
                      bcScale: 1
                    });
                  }}
                  onMouseUp={() => { setResizingKey(null); setResizingFreeIdGlobal(null); }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewCanvas;


