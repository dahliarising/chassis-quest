(function(root){
  'use strict';
  const P=typeof module!=='undefined'&&module.exports?require('./advanced-physics.js'):root.VehiclePhysics;
  const Q=typeof module!=='undefined'&&module.exports?require('./prediction.js'):root.VehiclePrediction;
  const id='cornering-01',tolerancePercent=3;
  const reference={speed:50,Cf:80000,Cr:90000,delta:1};
  const changed={...reference,Cf:60000};
  const controls={min:.2,max:2,step:.01,unit:'°'};
  function baseline(){return P.simulate('cornering',reference);}
  function fault(){return P.simulate('cornering',changed);}
  function question(){return Q.create(baseline(),fault());}
  function checkDelta(delta){
    if(typeof delta!=='number'||!Number.isFinite(delta)||delta<controls.min||delta>controls.max)throw new Error('앞바퀴 조향각은 0.2°부터 2° 사이여야 합니다.');
    return delta;
  }
  function radiusOf(result){return result.metrics.find(metric=>metric.label==='정상 회전 반경').value;}
  function evaluate(delta){
    checkDelta(delta);
    const before=baseline(),after=P.simulate('cornering',{...changed,delta});
    const targetRadius=radiusOf(before),radius=radiusOf(after);
    const signedErrorPercent=(radius-targetRadius)/targetRadius*100,errorPercent=Math.abs(signedErrorPercent);
    return {before,after,targetRadius,radius,delta,errorPercent,signedErrorPercent,tolerancePercent,
      success:after.valid!==false&&errorPercent<=tolerancePercent+1e-9,
      solutionDelta:delta*radius/targetRadius,
      direction:signedErrorPercent>1e-9?'wider':signedErrorPercent< -1e-9?'tighter':'same'};
  }
  // Show the model's steady circle with initial velocity directions aligned.
  // R=U/r uses the same small-angle approximation as the model's radius metric.
  // Body heading differs from the path tangent by the steady sideslip beta.
  function path(result,{duration=12,step=.1}={}){
    if(!result||result.kind!=='cornering'||result.valid===false||!result.steady||!result.geometry)throw new Error('유효한 선형 코너링 계산이 필요합니다.');
    if(!Number.isFinite(duration)||duration<=0||duration>60||!Number.isFinite(step)||step<.01||step>duration)throw new Error('재생 시간과 간격이 올바르지 않습니다.');
    const {yawRate,beta}=result.steady,U=result.geometry.U,R=U/yawRate;
    if(![yawRate,beta,U,R].every(Number.isFinite)||U<=0||yawRate<=0)throw new Error('정상 원선회 조건이 올바르지 않습니다.');
    const samples=[],count=Math.ceil(duration/step);
    for(let i=0;i<=count;i++){
      const t=Math.min(duration,i*step),angle=yawRate*t;
      samples.push({t,x:R*Math.sin(angle),y:R*(1-Math.cos(angle)),yaw:angle-beta,yawRate,beta,speed:U});
    }
    return samples;
  }
  const object=value=>{
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)return false;
    return Reflect.ownKeys(value).every(key=>typeof key==='string'&&Object.getOwnPropertyDescriptor(value,key).enumerable&&Object.prototype.hasOwnProperty.call(Object.getOwnPropertyDescriptor(value,key),'value'));
  };
  const keys=(value,expected)=>object(value)&&Object.keys(value).length===expected.length&&expected.every(key=>Object.prototype.hasOwnProperty.call(value,key));
  const validDate=day=>typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)&&Number.isFinite(Date.parse(day))&&new Date(day).toISOString().slice(0,10)===day;
  function validate(world){
    if(!keys(world,['completed'])||!object(world.completed))throw new Error('오픈월드 임무 기록이 올바르지 않습니다.');
    const result={completed:{}};
    for(const [mission,record] of Object.entries(world.completed)){
      if(mission!==id||!keys(record,['date','delta'])||!validDate(record.date)||!evaluate(record.delta).success)throw new Error('오픈월드 완료 기록이 올바르지 않습니다.');
      result.completed[mission]={date:record.date,delta:record.delta};
    }
    return result;
  }
  function complete(world,delta,day){
    validate(world);
    if(!validDate(day))throw new Error('임무 완료 날짜가 올바르지 않습니다.');
    if(!evaluate(delta).success)throw new Error('목표 반경의 ±3% 안에 들어오면 임무를 완료할 수 있습니다.');
    // Keep the first earned badge when the same mission is played again.
    if(!Object.prototype.hasOwnProperty.call(world.completed,id))world.completed[id]={date:day,delta};
    return {...world.completed[id]};
  }
  const api={id,tolerancePercent,controls,baseline,fault,question,evaluate,path,complete,validate};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WorldMission=api;
})(typeof window!=='undefined'?window:globalThis);
