export class Audio{
  constructor(){this.ctx=null;this.vol={master:0.8,music:0.5,sfx:0.8};this.rainAmt=0}
  init(){if(this.ctx){this.ctx.resume();return}
    const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=this.ctx=new C();
    this.master=c.createGain();this.master.connect(c.destination);
    this.sfxG=c.createGain();this.sfxG.connect(this.master);this.musG=c.createGain();this.ambG=c.createGain();this.ambG.connect(this.master);
    // reverb for music
    const len=c.sampleRate*3,ir=c.createBuffer(2,len,c.sampleRate);for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.5)}
    this.rev=c.createConvolver();this.rev.buffer=ir;const wet=c.createGain();wet.gain.value=0.55;this.musG.connect(this.rev);this.rev.connect(wet);wet.connect(this.master);const dry=c.createGain();dry.gain.value=0.6;this.musG.connect(dry);dry.connect(this.master);
    const nb=c.createBuffer(1,c.sampleRate*4,c.sampleRate),d=nb.getChannelData(0);let last=0;for(let i=0;i<d.length;i++){const w=Math.random()*2-1;last=(last+0.02*w)/1.02;d[i]=last*3.5}
    this.noise=nb;const wb=c.createBuffer(1,c.sampleRate*2,c.sampleRate),wd=wb.getChannelData(0);for(let i=0;i<wd.length;i++)wd[i]=Math.random()*2-1;this.white=wb;
    const mk=(buf,f,type='lowpass',g=0.5)=>{const s=c.createBufferSource();s.buffer=buf;s.loop=true;const fl=c.createBiquadFilter();fl.type=type;fl.frequency.value=f;const gg=c.createGain();gg.gain.value=g;s.connect(fl);fl.connect(gg);gg.connect(this.ambG);s.start();return{gain:gg,filter:fl}};
    this.waves=mk(nb,500,'lowpass',0.55);this.waves2=mk(nb,1400,'bandpass',0.12);this.rain=mk(wb,2600,'highpass',0);this.wind=mk(wb,800,'bandpass',0.03);
    this.apply();this.t0=c.currentTime;this.nextNote=c.currentTime+1.5;
  }
  apply(){if(!this.ctx)return;this.master.gain.value=this.vol.master;this.musG.gain.value=this.vol.music*0.22;this.sfxG.gain.value=this.vol.sfx*0.6;this.ambG.gain.value=0.6}
  update(dt,{rain=0,night=0,storm=0}={}){const c=this.ctx;if(!c)return;const t=c.currentTime;
    this.waves.gain.gain.value=0.45+Math.sin(t*0.5)*0.18+storm*0.3;this.waves.filter.frequency.value=420+Math.sin(t*0.37)*120;this.waves2.gain.gain.value=0.08+Math.max(0,Math.sin(t*0.5+1))*0.1;
    this.rain.gain.gain.value=rain*0.12;this.wind.gain.gain.value=0.03+storm*0.08;
    if(t>this.nextNote){const sc=night>0.5?[220,261.6,293.7,329.6,392,440]:[261.6,293.7,329.6,392,440,523.3,587.3];const f=sc[Math.random()*sc.length|0]*(Math.random()<0.3?0.5:1);this.note(f,2.5);if(Math.random()<0.25)this.note(f*1.5,2.5,0.4);this.nextNote=t+0.7+Math.random()*1.6+(Math.random()<0.15?3:0)}
  }
  note(f,d=2,v=1){const c=this.ctx,t=c.currentTime,o=c.createOscillator(),o2=c.createOscillator(),g=c.createGain();o.type='sine';o2.type='triangle';o.frequency.value=f;o2.frequency.value=f*2.001;const g2=c.createGain();g2.gain.value=0.15;o2.connect(g2);g2.connect(g);o.connect(g);g.connect(this.musG);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.5*v,t+0.02);g.gain.exponentialRampToValueAtTime(0.001,t+d);o.start(t);o2.start(t);o.stop(t+d);o2.stop(t+d)}
  tone(f,d,type='sine',v=0.4,f2=null,delay=0){const c=this.ctx;if(!c)return;const t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(0.001,t+d);o.connect(g);g.connect(this.sfxG);o.start(t);o.stop(t+d)}
  burst(d,f,type='bandpass',v=0.5,f2=null,delay=0){const c=this.ctx;if(!c)return;const t=c.currentTime+delay,s=c.createBufferSource();s.buffer=this.white;const fl=c.createBiquadFilter();fl.type=type;fl.frequency.setValueAtTime(f,t);if(f2)fl.frequency.exponentialRampToValueAtTime(f2,t+d);const g=c.createGain();g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(0.001,t+d);s.connect(fl);fl.connect(g);g.connect(this.sfxG);s.start(t,Math.random());s.stop(t+d)}
  play(n){if(!this.ctx)return;switch(n){
    case'click':this.tone(880,0.06,'triangle',0.15);break;case'hover':this.tone(1200,0.03,'sine',0.05);break;
    case'splash':this.burst(0.5,1800,'bandpass',0.5,300);break;case'bigsplash':this.burst(0.9,1200,'lowpass',0.8,200);break;
    case'pickup':this.tone(660,0.12,'triangle',0.25);this.tone(990,0.18,'triangle',0.22,null,0.07);break;
    case'coin':this.tone(1320,0.12,'square',0.08);this.tone(1760,0.3,'square',0.07,null,0.06);break;
    case'build':this.tone(140,0.2,'sine',0.6,60);this.burst(0.15,900,'lowpass',0.5);break;
    case'hammer':this.tone(300,0.06,'square',0.12,120);this.burst(0.05,2000,'bandpass',0.3);break;
    case'cast':this.burst(0.35,3000,'bandpass',0.25,600);break;case'bite':this.tone(500,0.15,'sine',0.4,250);this.burst(0.3,1500,'bandpass',0.4,400);break;
    case'catch':[523,659,784,1046].forEach((f,i)=>this.tone(f,0.25,'triangle',0.2,null,i*0.07));break;
    case'fail':this.tone(330,0.3,'triangle',0.2,200);break;
    case'eat':for(let i=0;i<3;i++)this.burst(0.07,1800,'bandpass',0.35,null,i*0.12);break;
    case'drink':for(let i=0;i<3;i++)this.tone(300,0.1,'sine',0.25,180,i*0.18);break;
    case'meow':{const c=this.ctx,t=c.currentTime,o=c.createOscillator(),g=c.createGain(),f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=1400;f.Q.value=3;o.type='sawtooth';o.frequency.setValueAtTime(500,t);o.frequency.linearRampToValueAtTime(800,t+0.15);o.frequency.linearRampToValueAtTime(450,t+0.5);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.25,t+0.05);g.gain.exponentialRampToValueAtTime(0.001,t+0.55);o.connect(f);f.connect(g);g.connect(this.sfxG);o.start(t);o.stop(t+0.6);break}
    case'gull':for(let i=0;i<3;i++)this.tone(1500,0.18,'sawtooth',0.03,900,i*0.22);break;
    case'warn':this.tone(110,0.8,'sawtooth',0.15,90);this.tone(116,0.8,'sawtooth',0.12,95);break;
    case'quest':[392,523,659,784].forEach((f,i)=>this.tone(f,0.5,'sine',0.25,null,i*0.1));break;
    case'sizzle':this.burst(1.2,4000,'highpass',0.12);break;case'boil':for(let i=0;i<5;i++)this.tone(200+Math.random()*200,0.08,'sine',0.15,null,i*0.1);break;
    case'hit':this.tone(90,0.25,'sine',0.7,40);this.burst(0.2,700,'lowpass',0.6);break;
  }}
}
