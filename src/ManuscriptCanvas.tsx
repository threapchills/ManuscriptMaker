import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { LockKeyhole } from 'lucide-react';
import type { CanvasProps, Layer } from './types';
import { transformText } from './text';
import './canvas.css';

type Handle = 'nw' | 'ne' | 'sw' | 'se';
type Interaction = {
  id: string;
  pointerId: number;
  mode: 'drag' | 'resize' | 'rotate';
  handle?: Handle;
  clientX: number;
  clientY: number;
  startAngle: number;
  original: Layer;
  patch: Partial<Layer>;
};

const radians = (degrees: number) => degrees * Math.PI / 180;
const rounded = (value: number) => Math.round(value * 100) / 100;

/** A full-size page whose enclosing frame accounts for the editor zoom. */
export default function ManuscriptCanvas({
  manuscript, selectedId, onSelect, onChangeLayer, onDropAsset, onEditText, zoom, showGuides,
}: CanvasProps) {
  const pageRef = useRef<HTMLDivElement>(null);
  const interaction = useRef<Interaction | null>(null);
  const [isOver, setIsOver] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [textOverflows, setTextOverflows] = useState(false);
  const scale = Math.max(0.05, zoom);
  const selectedLayer = manuscript.layers.find(layer => layer.id === selectedId);
  const selectedText = selectedLayer?.type === 'text' ? selectedLayer : undefined;

  useEffect(() => {
    if (!selectedText || selectedText.hidden) { setTextOverflows(false); return; }
    const layerElement = Array.from(pageRef.current?.querySelectorAll<HTMLElement>('[data-layer-id]') || []).find(element => element.dataset.layerId === selectedId);
    const textElement = layerElement?.querySelector<HTMLElement>('.manuscript-text');
    if (!textElement) { setTextOverflows(false); return; }
    let disposed = false;
    const measure = () => { if (!disposed) setTextOverflows(textElement.scrollHeight > textElement.clientHeight + 1 || textElement.scrollWidth > textElement.clientWidth + 1); };
    const observer = new ResizeObserver(measure);
    observer.observe(textElement);
    measure();
    void document.fonts.ready.then(measure);
    return () => { disposed = true; observer.disconnect(); };
  }, [selectedId, selectedText?.text, selectedText?.width, selectedText?.height, selectedText?.fontFamily, selectedText?.fontSize, selectedText?.lineHeight, selectedText?.letterSpacing, selectedText?.bold, selectedText?.italic, selectedText?.glyphs, selectedText?.hidden]);

  function pagePosition(clientX: number, clientY: number) {
    const bounds = pageRef.current!.getBoundingClientRect();
    return { x: (clientX - bounds.left) / scale, y: (clientY - bounds.top) / scale };
  }

  function begin(event: ReactPointerEvent<HTMLElement>, layer: Layer, mode: Interaction['mode'], handle?: Handle) {
    if (event.button !== 0 || interaction.current) return;
    event.stopPropagation();
    onSelect(layer.id);
    if (layer.locked) return;
    event.preventDefault();
    const position = pagePosition(event.clientX, event.clientY);
    interaction.current = {
      id: layer.id, pointerId: event.pointerId, mode, handle,
      clientX: event.clientX, clientY: event.clientY,
      startAngle: Math.atan2(position.y - layer.y - layer.height / 2, position.x - layer.x - layer.width / 2),
      original: { ...layer }, patch: {},
    };
    // Capturing on the layer keeps the gesture alive outside the page or handle.
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsInteracting(true);
  }

  function move(event: ReactPointerEvent<HTMLElement>) {
    const active = interaction.current;
    if (!active || active.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const { original: layer } = active;
    const dx = (event.clientX - active.clientX) / scale;
    const dy = (event.clientY - active.clientY) / scale;
    let patch: Partial<Layer>;

    if (active.mode === 'drag') {
      let x = layer.x + dx;
      let y = layer.y + dy;
      if (event.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) y = layer.y;
        else x = layer.x;
      }
      patch = { x: rounded(x), y: rounded(y) };
    } else if (active.mode === 'rotate') {
      const point = pagePosition(event.clientX, event.clientY);
      const angle = Math.atan2(point.y - layer.y - layer.height / 2, point.x - layer.x - layer.width / 2);
      let rotation = layer.rotation + (angle - active.startAngle) * 180 / Math.PI;
      if (event.shiftKey) rotation = Math.round(rotation / 15) * 15;
      patch = { rotation: rounded(((rotation + 180) % 360 + 360) % 360 - 180) };
    } else {
      const cos = Math.cos(radians(layer.rotation));
      const sin = Math.sin(radians(layer.rotation));
      const localDX = dx * cos + dy * sin;
      const localDY = -dx * sin + dy * cos;
      const sx = active.handle!.endsWith('e') ? 1 : -1;
      const sy = active.handle!.startsWith('s') ? 1 : -1;
      let width = Math.max(32, layer.width + sx * localDX);
      let height = Math.max(24, layer.height + sy * localDY);
      if (layer.type === 'image' || event.shiftKey) {
        const ratio = Math.max(
          32 / layer.width, 24 / layer.height,
          1 + (sx * localDX * layer.width + sy * localDY * layer.height) / (layer.width ** 2 + layer.height ** 2),
        );
        width = layer.width * ratio;
        height = layer.height * ratio;
      }
      // Hold the opposite corner still, including on rotated objects.
      const centerX = layer.x + layer.width / 2 + sx * (width - layer.width) / 2 * cos - sy * (height - layer.height) / 2 * sin;
      const centerY = layer.y + layer.height / 2 + sx * (width - layer.width) / 2 * sin + sy * (height - layer.height) / 2 * cos;
      patch = { x: rounded(centerX - width / 2), y: rounded(centerY - height / 2), width: rounded(width), height: rounded(height) };
    }
    active.patch = patch;
    onChangeLayer(active.id, patch, false);
  }

  function finish(event: ReactPointerEvent<HTMLElement>) {
    const active = interaction.current;
    if (!active || active.pointerId !== event.pointerId) return;
    event.stopPropagation();
    interaction.current = null;
    setIsInteracting(false);
    if (Object.keys(active.patch).length) onChangeLayer(active.id, active.patch, true);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  const pageStyle: CSSProperties = { width: manuscript.width, height: manuscript.height, transform: `scale(${scale})` };

  return (
    <div className={`manuscript-frame${isOver ? ' manuscript-frame--drop' : ''}${isInteracting ? ' manuscript-frame--active' : ''}`} style={{ width: manuscript.width * scale, height: manuscript.height * scale }}>
      <div
        ref={pageRef}
        id="manuscript-page"
        className={`manuscript-page manuscript-paper--${manuscript.paper}`}
        style={pageStyle}
        aria-label={`${manuscript.title || 'Untitled manuscript'} canvas`}
        onPointerDown={event => { if (event.target === event.currentTarget) onSelect(null); }}
        onDragOver={event => {
          if (event.dataTransfer.types.includes('application/x-manuscript-asset')) {
            event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; setIsOver(true);
          }
        }}
        onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsOver(false); }}
        onDrop={event => {
          event.preventDefault(); setIsOver(false);
          const assetId = event.dataTransfer.getData('application/x-manuscript-asset');
          if (!assetId) return;
          const point = pagePosition(event.clientX, event.clientY);
          onDropAsset(assetId, point.x, point.y);
        }}
      >
        {manuscript.border !== 'none' && (
          <div className={`manuscript-border manuscript-border--${manuscript.border}`} aria-hidden="true">
            {manuscript.border === 'illuminated' && <>
              <span className="manuscript-corner manuscript-corner--nw" /><span className="manuscript-corner manuscript-corner--ne" />
              <span className="manuscript-corner manuscript-corner--sw" /><span className="manuscript-corner manuscript-corner--se" />
              <span className="manuscript-border-gem manuscript-border-gem--top" /><span className="manuscript-border-gem manuscript-border-gem--bottom" />
            </>}
          </div>
        )}
        {showGuides && <div className="manuscript-guides" data-export-ignore="true" aria-hidden="true"><i /><b /></div>}
        {manuscript.layers.map(layer => !layer.hidden && (
          <div
            key={layer.id}
            className={`manuscript-layer${selectedId === layer.id ? ' is-selected' : ''}${layer.locked ? ' is-locked' : ''}`}
            data-layer-id={layer.id}
            style={{ left: layer.x, top: layer.y, width: layer.width, height: layer.height, transform: `rotate(${layer.rotation}deg)` }}
            onPointerDown={event => begin(event, layer, 'drag')}
            onPointerMove={move}
            onPointerUp={finish}
            onPointerCancel={finish}
            onLostPointerCapture={finish}
            onDoubleClick={event => { event.stopPropagation(); if (layer.type === 'text' && !layer.locked) onEditText(layer.id); }}
            aria-label={`${layer.name}${layer.locked ? ', locked' : ''}`}
          >
            <div className="manuscript-layer-content" style={{ opacity: layer.opacity, transform: `scale(${layer.flipX ? -1 : 1}, ${layer.flipY ? -1 : 1})` }}>
              {layer.type === 'image' ? (
                <img src={layer.src} alt={layer.name} draggable={false} decoding="async" style={{objectFit:layer.imageFit||'contain'}} />
              ) : (
                <div className="manuscript-text" style={{
                  fontFamily: layer.fontFamily, fontSize: layer.fontSize, color: layer.color,
                  fontWeight: layer.bold ? 700 : 400, fontStyle: layer.italic ? 'italic' : 'normal',
                  textAlign: layer.align, lineHeight: layer.lineHeight, letterSpacing: layer.letterSpacing,
                }}>{transformText(layer.text, layer.glyphs)}</div>
              )}
            </div>

          </div>
        ))}
            {selectedLayer && !selectedLayer.hidden && (
              <div className={`manuscript-controls${selectedLayer.locked ? ' is-locked' : ''}`} data-export-ignore="true" style={{left:selectedLayer.x,top:selectedLayer.y,width:selectedLayer.width,height:selectedLayer.height,transform:`rotate(${selectedLayer.rotation}deg)`}} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}><div className="manuscript-selection">
                <span className="manuscript-selection-label">{selectedLayer.locked && <LockKeyhole size={10} />}{selectedLayer.name}</span>
                {selectedLayer.type === 'text' && textOverflows && <span className="manuscript-overflow-note">Text exceeds frame · resize to fit</span>}
                {!selectedLayer.locked && <>
                  <span className="manuscript-rotation-stem" />
                  <button type="button" className="manuscript-rotate-handle" title="Rotate · hold Shift to snap" aria-label="Rotate selected layer" tabIndex={-1} onPointerDown={event => begin(event, selectedLayer, 'rotate')}>↻</button>
                  {(['nw', 'ne', 'sw', 'se'] as Handle[]).map(handle => <button key={handle} type="button" className={`manuscript-resize-handle manuscript-resize-handle--${handle}`} title="Resize selected layer" aria-label={`Resize ${handle} corner`} tabIndex={-1} onPointerDown={event => begin(event, selectedLayer, 'resize', handle)} />)}
                </>}
              </div></div>
            )}
      </div>
      {isOver && <div className="manuscript-drop-cue" data-export-ignore="true">Release to illuminate your page</div>}
    </div>
  );
}

export { ManuscriptCanvas };
