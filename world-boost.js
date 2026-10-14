(function(root){
  'use strict';
  const create=()=>({energy:1,active:false,locked:false});
  // Exploration-only energy budget: three seconds on, six seconds to refill.
  // The caller excludes braking, reverse, off-road, and learning comparisons.
  function step(previous,{requested=false,eligible=false,dt=0}={}){
    const elapsed=Number.isFinite(dt)?Math.min(.25,Math.max(0,dt)):0;
    const active=Boolean(requested&&eligible&&!previous.locked&&previous.energy>0);
    let energy=active?previous.energy-elapsed/3:previous.energy+elapsed/6;
    energy=Math.min(1,Math.max(0,energy));
    if(energy<1e-8)energy=0;
    if(energy>1-1e-8)energy=1;
    const locked=energy===0||previous.locked&&energy<1;
    return {energy,active:active&&energy>0,locked};
  }
  const api={create,step};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WorldBoost=api;
})(typeof window!=='undefined'?window:globalThis);
