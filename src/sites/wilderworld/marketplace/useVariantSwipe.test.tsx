import {useState} from 'react';
import {cleanup,fireEvent,render} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {useVariantSwipe} from './useVariantSwipe';

const options=[{id:'chalk'},{id:'moss'},{id:'copper'}];
function Hero(){const [id,setId]=useState('chalk');const swipe=useVariantSwipe(options,id,setId);return <div data-testid="hero" {...swipe}><span>{id}</span><video controls/></div>;}
beforeEach(()=>{
  class Pointer extends MouseEvent {pointerId:number;constructor(type:string,init:any){super(type,init);this.pointerId=init.pointerId??1;}}
  vi.stubGlobal('PointerEvent',Pointer);
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});

it('swipes both directions and wraps through the same selected variant state',()=>{
  const ui=render(<Hero/>);const hero=ui.getByTestId('hero');
  fireEvent.pointerDown(hero,{clientX:200,clientY:100,button:0});fireEvent.pointerUp(hero,{clientX:70,clientY:105});
  expect(hero).toHaveTextContent('moss');expect(hero).toHaveAttribute('aria-label',expect.stringContaining('variant 2 of 3'));
  fireEvent.pointerDown(hero,{clientX:70,clientY:100,button:0});fireEvent.pointerUp(hero,{clientX:200,clientY:102});
  expect(hero).toHaveTextContent('chalk');
  fireEvent.keyDown(hero,{key:'ArrowLeft'});expect(hero).toHaveTextContent('copper');
  fireEvent.keyDown(hero,{key:'ArrowRight'});expect(hero).toHaveTextContent('chalk');
});

it('ignores taps, vertical scrolls and cancelled gestures',()=>{
  const ui=render(<Hero/>);const hero=ui.getByTestId('hero');
  fireEvent.pointerDown(hero,{clientX:100,clientY:100,button:0});fireEvent.pointerUp(hero,{clientX:90,clientY:100});
  fireEvent.pointerDown(hero,{clientX:100,clientY:100,button:0});fireEvent.pointerUp(hero,{clientX:150,clientY:250});
  fireEvent.pointerDown(hero,{clientX:200,clientY:100,button:0});fireEvent.pointerCancel(hero);fireEvent.pointerUp(hero,{clientX:50,clientY:100});
  expect(hero).toHaveTextContent('chalk');expect(hero.style.touchAction).toBe('pan-y pinch-zoom');
});

it('preserves pinch gestures and video controls',()=>{
  const ui=render(<Hero/>);const hero=ui.getByTestId('hero');
  fireEvent.pointerDown(hero,{clientX:200,clientY:100,button:0,pointerId:1});
  fireEvent.pointerDown(hero,{clientX:210,clientY:100,button:0,pointerId:2});
  fireEvent.pointerUp(hero,{clientX:50,clientY:100,pointerId:1});
  const video=hero.querySelector('video')!;
  fireEvent.pointerDown(video,{clientX:200,clientY:100,button:0});fireEvent.pointerUp(video,{clientX:50,clientY:100});
  expect(hero).toHaveTextContent('chalk');
});
