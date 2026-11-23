'use client';

import {useEffect, useRef, type PointerEvent, type KeyboardEvent, type DragEvent} from 'react';

type Option = {id:string; image?:string|null};

/** Swipe the hero using the same selection callback as its swatches. */
export function useVariantSwipe(options:Option[], selectedId:string|undefined, onSelect:(id:string)=>void) {
  const gesture = useRef<{id:number;x:number;y:number;time:number}|null>(null);
  const index = Math.max(0, options.findIndex(option=>option.id===selectedId));
  const previous = options[(index-1+options.length)%options.length];
  const next = options[(index+1)%options.length];
  useEffect(()=>{
    const connection=(navigator as Navigator & {connection?:{saveData?:boolean;effectiveType?:string}}).connection;
    if(connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType??''))return;
    const timer=setTimeout(()=>{
      for (const src of new Set([previous?.image,next?.image])) {
        if (!src) continue;
        const image = new Image(); image.decoding='async'; image.fetchPriority='low'; image.src=src;
      }
    },800);
    return()=>clearTimeout(timer);
  },[previous?.image,next?.image]);
  if(options.length<2)return {};
  const step = (direction:1|-1) => onSelect(options[(index+direction+options.length)%options.length].id);
  const interactive = (target:EventTarget) => target instanceof Element && Boolean(target.closest('button,a,input,select,textarea,video'));
  return {
    tabIndex:0,
    role:'group',
    'aria-label':`Product image, variant ${index+1} of ${options.length}. Swipe or use left and right arrow keys to change variant.`,
    style:{touchAction:'pan-y pinch-zoom'},
    onPointerDown:(event:PointerEvent<HTMLDivElement>)=>{
      if(event.button!==0||interactive(event.target))return;
      if(gesture.current){gesture.current=null;return;}
      gesture.current={id:event.pointerId,x:event.clientX,y:event.clientY,time:performance.now()};
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    onPointerUp:(event:PointerEvent<HTMLDivElement>)=>{
      const start=gesture.current;gesture.current=null;
      if(!start||start.id!==event.pointerId)return;
      const dx=event.clientX-start.x,dy=event.clientY-start.y;
      const threshold=Math.min(80,Math.max(40,event.currentTarget.clientWidth*.12));
      if(Math.abs(dx)<threshold||Math.abs(dx)<Math.abs(dy)*1.4||performance.now()-start.time>1000)return;
      step(dx<0?1:-1);
    },
    onPointerCancel:()=>{gesture.current=null;},
    onDragStart:(event:DragEvent<HTMLDivElement>)=>event.preventDefault(),
    onKeyDown:(event:KeyboardEvent<HTMLDivElement>)=>{
      if(event.target!==event.currentTarget||!['ArrowLeft','ArrowRight'].includes(event.key))return;
      event.preventDefault();step(event.key==='ArrowRight'?1:-1);
    },
  };
}
