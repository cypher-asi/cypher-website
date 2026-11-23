import {act,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {DeferredSection} from './DeferredProductSections';

afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
it('does not load offscreen work; entering the viewport loads it with the latest props',async()=>{
  let notify:(entries:unknown[])=>void=()=>{};
  vi.stubGlobal('IntersectionObserver',class{constructor(callback:typeof notify){notify=callback;}observe(){}disconnect(){}});
  const load=vi.fn(async()=>({default:({name}:{name:string})=><p>{name}</p>}));
  const ui=render(<DeferredSection load={load} componentProps={{name:'First'}} label="Reviews"/>);
  expect(load).not.toHaveBeenCalled();
  ui.rerender(<DeferredSection load={load} componentProps={{name:'Selected finish'}} label="Reviews"/>);
  act(()=>notify([{isIntersecting:true}]));
  expect(await screen.findByText('Selected finish')).toBeInTheDocument();
  expect(load).toHaveBeenCalledTimes(1);
});
it('a ratings anchor activates its section and failed chunks can be retried',async()=>{
  vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){}});
  const load=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({default:()=> <p>Reviews ready</p>});
  render(<><a href="#ratings">Read ratings</a><DeferredSection load={load} componentProps={{}} label="Reviews" anchor="ratings"/></>);
  fireEvent.click(screen.getByText('Read ratings'));
  fireEvent.click(await screen.findByRole('button',{name:'Try again'}));
  expect(await screen.findByText('Reviews ready')).toBeInTheDocument();
  expect(load).toHaveBeenCalledTimes(2);
});
