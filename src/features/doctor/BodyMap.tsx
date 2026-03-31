import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface Point {
  x: number;
  y: number;
  quality: string;
  endX?: number;
  endY?: number;
}

interface BodyMapProps {
  points: Point[];
  onChange: (points: Point[]) => void;
}

const PAIN_QUALITIES = ['Sharp', 'Dull', 'Burning', 'Aching', 'Throbbing', 'Radiating'];

export default function BodyMap({ points, onChange }: BodyMapProps) {
  const [selectedQuality, setSelectedQuality] = useState(PAIN_QUALITIES[0]);
  const [dragStart, setDragStart] = useState<{ x: number, y: number } | null>(null);
  const [currentDrag, setCurrentDrag] = useState<{ x: number, y: number } | null>(null);

  const getSvgPoint = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 200; // ViewBox is 100x200
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const point = getSvgPoint(e);
    if (selectedQuality === 'Radiating') {
      setDragStart(point);
      setCurrentDrag(point);
    } else {
      const newPoint = { x: point.x, y: point.y, quality: selectedQuality };
      onChange([...points, newPoint]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (dragStart && selectedQuality === 'Radiating') {
      setCurrentDrag(getSvgPoint(e));
    }
  };

  const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    if (dragStart && selectedQuality === 'Radiating') {
      const endPoint = getSvgPoint(e);
      const newPoint = { 
        x: dragStart.x, 
        y: dragStart.y, 
        quality: 'Radiating',
        endX: endPoint.x,
        endY: endPoint.y
      };
      onChange([...points, newPoint]);
      setDragStart(null);
      setCurrentDrag(null);
    }
  };

  const removePoint = (index: number) => {
    onChange(points.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {PAIN_QUALITIES.map(q => (
          <button
            key={q}
            type="button"
            onClick={() => setSelectedQuality(q)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              selectedQuality === q 
                ? 'bg-doctor-accent text-doctor-sidebar shadow-lg shadow-doctor-accent/20' 
                : 'bg-primary/5 text-primary/40 hover:bg-primary/10'
            }`}
          >
            {q}
          </button>
        ))}
      </div>

      <div className="flex gap-8 justify-center items-start">
        {/* Anterior View */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary/30">Anterior</span>
          <div className="relative w-48 h-96 bg-surface-muted rounded-3xl border border-primary/5 overflow-hidden">
            <svg 
              viewBox="0 0 100 200" 
              className="w-full h-full cursor-crosshair select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              {/* Simplified Human Figure SVG */}
              <path 
                d="M50,10 c5,0 10,5 10,10 s-5,10 -10,10 s-10,-5 -10,-10 s5,-10 10,-10 M40,30 l20,0 l5,40 l-5,60 l-10,60 l-10,0 l-10,-60 l-5,-60 z" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1"
                className="text-primary/10"
              />
              
              {points.map((p, i) => (
                <React.Fragment key={i}>
                  {p.quality === 'Radiating' && p.endX !== undefined && p.endY !== undefined ? (
                    <>
                      <line 
                        x1={p.x} y1={p.y} x2={p.endX} y2={p.endY} 
                        stroke="#E8A838" strokeWidth="2" strokeDasharray="4 2"
                        className="animate-pulse"
                      />
                      <circle cx={p.x} cy={p.y} r="2" fill="#E8A838" />
                      <circle 
                        cx={p.endX} cy={p.endY} r="3" fill="#E8A838" 
                        className="cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); removePoint(i); }}
                      />
                    </>
                  ) : (
                    <circle 
                      cx={p.x} cy={p.y} r="3" 
                      fill="#FF4444" 
                      className="animate-pulse cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); removePoint(i); }}
                    />
                  )}
                </React.Fragment>
              ))}

              {dragStart && currentDrag && (
                <line 
                  x1={dragStart.x} y1={dragStart.y} x2={currentDrag.x} y2={currentDrag.y} 
                  stroke="#E8A838" strokeWidth="2" strokeDasharray="4 2"
                />
              )}
            </svg>
          </div>
        </div>

        {/* Posterior View */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary/30">Posterior</span>
          <div className="relative w-48 h-96 bg-surface-muted rounded-3xl border border-primary/5 overflow-hidden">
            <svg 
              viewBox="0 0 100 200" 
              className="w-full h-full cursor-crosshair select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <path 
                d="M50,10 c5,0 10,5 10,10 s-5,10 -10,10 s-10,-5 -10,-10 s5,-10 10,-10 M40,30 l20,0 l5,40 l-5,60 l-10,60 l-10,0 l-10,-60 l-5,-60 z" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1"
                className="text-primary/10"
              />
              {/* Points are shared in this simplified version */}
              {points.map((p, i) => (
                <React.Fragment key={i}>
                  {p.quality === 'Radiating' && p.endX !== undefined && p.endY !== undefined ? (
                    <>
                      <line 
                        x1={p.x} y1={p.y} x2={p.endX} y2={p.endY} 
                        stroke="#E8A838" strokeWidth="2" strokeDasharray="4 2"
                      />
                      <circle cx={p.x} cy={p.y} r="2" fill="#E8A838" />
                      <circle cx={p.endX} cy={p.endY} r="3" fill="#E8A838" onClick={() => removePoint(i)} />
                    </>
                  ) : (
                    <circle cx={p.x} cy={p.y} r="3" fill="#FF4444" onClick={() => removePoint(i)} />
                  )}
                </React.Fragment>
              ))}
            </svg>
          </div>
        </div>
      </div>

      <div className="text-[10px] text-primary/30 italic text-center">
        {selectedQuality === 'Radiating' 
          ? 'Drag to draw a radiation path. Click an end point to remove.' 
          : 'Click on the body map to mark pain locations. Click a point to remove it.'}
      </div>
    </div>
  );
}
