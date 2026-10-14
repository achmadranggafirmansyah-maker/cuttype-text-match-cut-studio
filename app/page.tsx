 "use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Settings = {
  ratio: string; fps: number; duration: number; cuts: number;
  fontSize: number; highlight: string; background: string;
  sound: boolean; grain: boolean; motion: string; soundLevel: number;
};
const DEFAULTS: Settings = {
  ratio:"9:16", fps:30, duration:10, cuts:8, fontSize:76,
  highlight:"#f2e34b", background:"#f4f1e8", sound:true, grain:true,
  motion:"mix", soundLevel:70
};
type Segment = { text:string; words:string[]; start:number; end:number; index:number; match:string };
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const ease=(t:number)=>{t=clamp(t,0,1);return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2};
const easeOut=(t:number)=>1-Math.pow(1-clamp(t,0,1),3);
function dimensions(r:string):[number,number] {
  if(r==="16:9") return [1280,720];
  if(r==="1:1") return [900,900];
  if(r==="4:5") return [864,1080];
  return [720,1280];
}
function cleanLines(raw:string) {
  return raw.split(/\n/).map(s=>s.trim()).filter(Boolean).slice(0,40);
}
function makeSegments(lines:string[],duration:number,cuts:number):Segment[] {
  const count=Math.max(1,Math.min(cuts,Math.max(lines.length,1)));
  const expanded=Array.from({length:count},(_,i)=>lines[i%Math.max(1,lines.length)]||"TULIS KALIMAT");
  return expanded.map((text,i)=>{
    const words=text.split(/\s+/).filter(Boolean);
    const prev=i?expanded[i-1].split(/\s+/):[];
    const shared=words.find(w=>prev.some(p=>p.toLowerCase().replace(/[^\p{L}\p{N}]/gu,"")===w.toLowerCase().replace(/[^\p{L}\p{N}]/gu,"")))||"";
    return {text,words,start:i*duration/count,end:(i+1)*duration/count,index:i,match:shared};
  });
}
function wrapText(ctx:CanvasRenderingContext2D,text:string,maxWidth:number):string[] {
  const words=text.split(/\s+/); const lines:string[]=[]; let line="";
  for(const word of words) {
    const candidate=line?line+" "+word:word;
    if(ctx.measureText(candidate).width>maxWidth&&line){lines.push(line);line=word;} else line=candidate;
  }
  if(line) lines.push(line);
  return lines;
}
function roundedRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number) {
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);
}
function drawFrame(ctx:CanvasRenderingContext2D,w:number,h:number,segments:Segment[],time:number,s:Settings,preview=false) {
  const bg=s.background; ctx.clearRect(0,0,w,h);ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  // restrained editorial paper texture
  if(s.grain) {
    for(let i=0;i<Math.floor(w*h/1700);i++){
      const x=(i*7919%w),y=(i*3571%h);
      ctx.fillStyle=i%2?"rgba(55,45,25,.025)":"rgba(255,255,255,.13)";
      ctx.fillRect(x,y,1.2,1.2);
    }
  }
  const seg=segments.find(v=>time>=v.start&&time<v.end)||segments[segments.length-1];
  const idx=Math.max(0,seg?.index||0),local=clamp((time-seg.start)/Math.max(.001,seg.end-seg.start),0,1);
  const intro=easeOut(local/.19),outro=ease((local-.79)/.21);
  const inX=(1-intro)*w*.62, outX=outro*w*.48;
  const p=w*.075, contentW=w-p*2;
  ctx.save();
  // paper editorial header
  ctx.fillStyle="#77746b";ctx.font=`500 ${Math.max(10,w*.014)}px Arial`;
  ctx.fillText("CATATAN / IDE & STRATEGI",p,h*.073);
  ctx.strokeStyle="rgba(45,42,35,.19)";ctx.lineWidth=Math.max(1,w*.001);
  ctx.beginPath();ctx.moveTo(p,h*.092);ctx.lineTo(w-p,h*.092);ctx.stroke();
  // a quiet index that moves between cuts
  ctx.textAlign="right";ctx.fillStyle="rgba(45,42,35,.42)";
  ctx.font=`${Math.max(11,w*.015)}px Arial`;ctx.fillText(`${String(idx+1).padStart(2,"0")} / ${String(segments.length).padStart(2,"0")}`,w-p,h*.073);ctx.textAlign="left";
  // subtle background ghost of next phrase creates visual continuity
  const next=segments[(idx+1)%segments.length];
  ctx.save();ctx.globalAlpha=.045*(1-local);ctx.translate(p+contentW*.12,h*.69);ctx.rotate(-.035);
  ctx.fillStyle="#171714";ctx.font=`900 ${w*.09}px Arial`;ctx.fillText(next?.text.toUpperCase()||"",0,0,contentW);ctx.restore();

  let baseSize=Math.min(s.fontSize,w*.105);
  let fontSize=baseSize;let lines=wrapText(ctx,seg.text.toLocaleUpperCase("id-ID"),contentW);
  ctx.font=`900 ${fontSize}px Arial`;
  while(lines.length>4&&fontSize>20){fontSize-=2;ctx.font=`900 ${fontSize}px Arial`;lines=wrapText(ctx,seg.text.toLocaleUpperCase("id-ID"),contentW);}
  const lineH=fontSize*1.08;
  const targetY=h*(idx%3===1?.39:idx%3===2?.47:.34);
  // different motion motifs, selected deterministically so each cut has a distinct feel
  const mode=s.motion==="mix"?idx%4:s.motion==="slide"?0:s.motion==="zoom"?1:s.motion==="word"?2:3;
  const scale=mode===1?(.72+.28*intro)*(1+.12*Math.sin(local*Math.PI)):mode===3?(1+.08*Math.sin(local*Math.PI*2)):1;
  const xShift=mode===0?inX-outX:mode===2?(1-intro)*-w*.25:0;
  ctx.translate(p+xShift,targetY);ctx.scale(scale,scale);
  // tiny rotation only during entrance, settles to a clean editorial lockup
  ctx.rotate((1-intro)*(mode===3?-.035:.012));
  const highlightWords=seg.text.split(/\s+/);
  let yy=0;
  lines.forEach((line,li)=>{
    const lineWidth=ctx.measureText(line).width;
    const lineY=li*lineH;
    const words=line.split(/\s+/);
    let xx=0;
    words.forEach((word,wi)=>{
      const ww=ctx.measureText(word).width;
      const gap=ctx.measureText(" ").width;
      // highlight a key phrase/word, alternating to avoid a static repeated bar
      const shouldHighlight=(wi===words.length-1&&li===lines.length-1)||(idx%2===0&&wi===0&&li===0);
      if(shouldHighlight){
        const padX=fontSize*.10,padY=fontSize*.08;
        ctx.fillStyle=s.highlight;
        const pop=mode===1?(.92+.08*intro):1;
        ctx.save();ctx.translate(xx+ww/2,lineY-fontSize*.43);ctx.scale(pop, pop);
        roundedRect(ctx,-ww/2-padX,-fontSize*.56-padY,ww+padX*2,fontSize*1.02+padY*2,Math.max(2,fontSize*.025));ctx.fill();ctx.restore();
      }
      ctx.fillStyle="#181816";ctx.textBaseline="alphabetic";ctx.fillText(word,xx,lineY);
      xx+=ww+gap;
    });
    yy=lineY;
  });
  ctx.restore();

  // Small supporting copy gives the layout editorial depth, but stays secondary.
  const supportY=targetY+lines.length*lineH+fontSize*.45;
  ctx.fillStyle="#25241f";ctx.font=`700 ${Math.max(17,fontSize*.38)}px Arial`;
  const support=segments[(idx+1)%segments.length]?.text||"";
  wrapText(ctx,support,contentW).slice(0,2).forEach((line,i)=>ctx.fillText(line,p,supportY+i*fontSize*.49));
  ctx.fillStyle="rgba(40,38,32,.46)";ctx.font=`${Math.max(12,w*.014)}px Arial`;
  const filler="STRATEGI • KEBIASAAN • IDE BARU • CERITA • ";
  const fillerLines=wrapText(ctx,(filler+filler+filler),contentW);
  fillerLines.slice(0,3).forEach((line,i)=>ctx.fillText(line,p,supportY+fontSize*1.65+i*fontSize*.30));
  // transition flash / motion streak, only for the first 7% of each cut
  const phase=(time% (s.duration/segments.length))/(s.duration/segments.length);
  if(phase<.085&&idx>0){
    const a=(1-phase/.085)*.16;ctx.fillStyle=`rgba(255,255,255,${a})`;ctx.fillRect(0,0,w,h);
    if(mode===0){ctx.fillStyle=`rgba(20,20,20,${a*.25})`;ctx.fillRect(0,h*.23,w*(1-phase/.085),h*.003);}
  }
  ctx.fillStyle="#77746b";ctx.font=`${Math.max(10,w*.013)}px Arial`;
  ctx.fillText("FIELD NOTES — "+String(idx+1).padStart(2,"0"),p,h*.925);
  ctx.restore();
}
function playSfx(ac:AudioContext,dest:AudioNode,kind:number,volume:number) {
  const now=ac.currentTime, gain=ac.createGain();gain.gain.value=volume;
  gain.connect(dest);
  if(kind%4===0) { // short airy whoosh
    const n=Math.floor(ac.sampleRate*.12),buf=ac.createBuffer(1,n,ac.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
    const src=ac.createBufferSource(),filter=ac.createBiquadFilter(),env=ac.createGain();
    src.buffer=buf;filter.type="highpass";filter.frequency.setValueAtTime(650,now);filter.frequency.exponentialRampToValueAtTime(1800,now+.09);
    env.gain.setValueAtTime(.0001,now);env.gain.linearRampToValueAtTime(.55,now+.018);env.gain.exponentialRampToValueAtTime(.0001,now+.12);
    src.connect(filter);filter.connect(env);env.connect(gain);src.start(now);src.stop(now+.13);
  } else if(kind%4===1) { // click
    const o=ac.createOscillator(),env=ac.createGain();o.type="square";o.frequency.setValueAtTime(1250,now);o.frequency.exponentialRampToValueAtTime(520,now+.028);
    env.gain.setValueAtTime(.0001,now);env.gain.exponentialRampToValueAtTime(.5,now+.003);env.gain.exponentialRampToValueAtTime(.0001,now+.045);o.connect(env);env.connect(gain);o.start(now);o.stop(now+.05);
  } else if(kind%4===2) { // pop
    const o=ac.createOscillator(),env=ac.createGain();o.type="sine";o.frequency.setValueAtTime(260,now);o.frequency.exponentialRampToValueAtTime(95,now+.075);
    env.gain.setValueAtTime(.0001,now);env.gain.exponentialRampToValueAtTime(.65,now+.006);env.gain.exponentialRampToValueAtTime(.0001,now+.09);o.connect(env);env.connect(gain);o.start(now);o.stop(now+.1);
  } else { // muted low thump
    const o=ac.createOscillator(),env=ac.createGain();o.type="triangle";o.frequency.setValueAtTime(110,now);o.frequency.exponentialRampToValueAtTime(48,now+.085);
    env.gain.setValueAtTime(.0001,now);env.gain.exponentialRampToValueAtTime(.5,now+.005);env.gain.exponentialRampToValueAtTime(.0001,now+.11);o.connect(env);env.connect(gain);o.start(now);o.stop(now+.12);
  }
  gain.gain.setValueAtTime(volume,now);
  gain.gain.exponentialRampToValueAtTime(.0001,now+.14);
  setTimeout(()=>{try{gain.disconnect()}catch{}},250);
}
export default function Home() {
  const [text,setText]=useState("RUMUS 3 LANGKAH KAYA\nSejarah dan evolusi strategi finansial\nKebiasaan kecil yang mengubah cara berpikir\nMulai dari satu keputusan sederhana\nPahami pola sebelum mengambil keputusan\nSatu perubahan kecil berdampak besar\nBangun sistem yang konsisten");
  const [s,setS]=useState<Settings>(DEFAULTS);
  const [busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[videoUrl,setVideoUrl]=useState(""),[error,setError]=useState("");
  const canvasRef=useRef<HTMLCanvasElement>(null),rafRef=useRef<number|undefined>(undefined),previewStart=useRef<number|undefined>(undefined);
  const lines=cleanLines(text);
  const segments=makeSegments(lines,s.duration,s.cuts);
  const update=(key:keyof Settings,value:any)=>setS(prev=>({...prev,[key]:value}));
  const paint=useCallback((time:number)=>{
    const c=canvasRef.current;if(!c)return;
    const [w,h]=dimensions(s.ratio);if(c.width!==w||c.height!==h){c.width=w;c.height=h;}
    const ctx=c.getContext("2d");if(ctx)drawFrame(ctx,w,h,makeSegments(cleanLines(text),s.duration,s.cuts),time,s,true);
  },[text,s]);
  useEffect(()=>{
    let active=true;const loop=(now:number)=>{
      if(!active)return;
      if(previewStart.current===undefined)previewStart.current=now;
      const elapsed=((now-previewStart.current)/1000)%s.duration;
      paint(elapsed);rafRef.current=requestAnimationFrame(loop);
    };
    rafRef.current=requestAnimationFrame(loop);
    return ()=>{active=false;if(rafRef.current!==undefined)cancelAnimationFrame(rafRef.current);};
  },[paint,s.duration]);
  useEffect(()=>()=>{if(videoUrl)URL.revokeObjectURL(videoUrl)},[videoUrl]);
  async function renderVideo(){
    setError("");setVideoUrl("");
    if(!lines.length){setError("Masukkan minimal satu baris teks dulu.");return;}
    if(!canvasRef.current||!("MediaRecorder" in window)||!("captureStream" in canvasRef.current)){setError("Browser ini belum mendukung render canvas. Coba Chrome/Edge versi terbaru di desktop.");return;}
    setBusy(true);setProgress(0);
    let ac:AudioContext|undefined,stream:MediaStream|undefined;
    try{
      const [w,h]=dimensions(s.ratio),canvas=canvasRef.current,ctx=canvas.getContext("2d");
      if(!ctx)throw new Error("Canvas tidak tersedia.");
      canvas.width=w;canvas.height=h;
      stream=canvas.captureStream(s.fps);
      let audioDest:MediaStreamAudioDestinationNode|undefined;
      if(s.sound){
        ac=new AudioContext();await ac.resume();
        audioDest=ac.createMediaStreamDestination();
        audioDest.stream.getAudioTracks().forEach(t=>stream!.addTrack(t));
      }
      const mime=["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"].find(m=>MediaRecorder.isTypeSupported(m));
      if(!mime)throw new Error("Browser tidak mendukung encoding WebM. Coba Chrome terbaru.");
      const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:6500000,audioBitsPerSecond:160000});
      const chunks:BlobPart[]=[];
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
      const finished=new Promise<Blob>((resolve,reject)=>{
        recorder.onerror=()=>reject(new Error("Perekaman gagal. Coba durasi lebih pendek."));
        recorder.onstop=()=>resolve(new Blob(chunks,{type:mime}));
      });
      recorder.start(100);
      const start=performance.now(),total=s.duration*1000,step=1000/s.fps;
      let lastCut=-1,nextTick=start;
      await new Promise<void>((resolve,reject)=>{
        const frame=(now:number)=>{
          const elapsed=now-start,t=Math.min(s.duration,elapsed/1000);
          drawFrame(ctx,w,h,segments,t,s);
          const cut=Math.floor(t/(s.duration/segments.length));
          if(s.sound&&ac&&audioDest&&cut!==lastCut&&cut>0){
            playSfx(ac,audioDest,cut-1,s.soundLevel/100*.14);lastCut=cut;
          }
          setProgress(Math.min(99,Math.round(elapsed/total*100)));
          if(elapsed>=total){resolve();return;}
          nextTick+=step;
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
      recorder.stop();
      const blob=await finished;
      if(!blob.size)throw new Error("File video kosong. Coba render ulang di Chrome.");
      setVideoUrl(URL.createObjectURL(blob));setProgress(100);
    }catch(e){setError(e instanceof Error?e.message:"Render gagal. Coba lagi.");}
    finally{stream?.getTracks().forEach(t=>t.stop());if(ac)await ac.close().catch(()=>{});setBusy(false);}
  }
  const reset=()=>{setVideoUrl("");setError("");setProgress(0);};
  return <main className="appShell">
    <header className="topbar"><a className="logo"><span className="logoMark">C</span><span>CutType <small>MOTION STUDIO</small></span></a><span className="local"><i/> BROWSER RENDER</span></header>
    {!videoUrl?<><section className="hero"><div className="eyebrow">KINETIC TYPOGRAPHY / MATCH CUT ENGINE</div><h1>Words in <em>motion.</em></h1><p>Susun kalimat. Bikin kata bergerak, menyambung, dan menghantam beat.</p></section>
      <div className="layout">
        <div className="controls">
          <section className="panel"><div className="panelHead"><span className="num">01</span><div><h2>Copy & sequence</h2><p>Satu baris = satu beat teks. Kata yang sama akan dipakai sebagai titik sambung bila tersedia.</p></div></div>
            <textarea value={text} onChange={e=>setText(e.target.value)} rows={8} placeholder={"Tulis satu kalimat per baris..."} />
            <div className="between"><span>{lines.length} baris · {s.cuts} cut</span><button className="textBtn" onClick={()=>setText("IDE BESAR DIMULAI DARI HAL KECIL\nSatu kebiasaan mengubah semuanya\nFOKUS PADA YANG PENTING\nBukan lebih cepat, tapi lebih tepat\nUBAH CARA KAMU MELIHATNYA\nSatu ide. Satu gerakan. Satu cerita.")}>Muat contoh ↗</button></div>
          </section>
          <section className="panel"><div className="panelHead"><span className="num">02</span><div><h2>Motion settings</h2><p>Atur format, tempo, dan karakter gerakan.</p></div></div>
            <div className="settingsGrid">
              <label>RASIO ASPEK<select value={s.ratio} onChange={e=>update("ratio",e.target.value)}><option value="9:16">9:16 · Reels / TikTok</option><option value="16:9">16:9 · YouTube</option><option value="1:1">1:1 · Square</option><option value="4:5">4:5 · Feed</option></select></label>
              <label>FRAME RATE<select value={s.fps} onChange={e=>update("fps",+e.target.value)}><option value="24">24 FPS</option><option value="30">30 FPS</option><option value="60">60 FPS</option></select></label>
              <label>DURASI<select value={s.duration} onChange={e=>update("duration",+e.target.value)}>{[5,8,10,12,15,20].map(v=><option key={v} value={v}>{v} detik</option>)}</select></label>
              <label>JUMLAH CUT<select value={s.cuts} onChange={e=>update("cuts",+e.target.value)}>{[4,6,8,10,12,16].map(v=><option key={v} value={v}>{v} cut</option>)}</select></label>
              <label>UKURAN TEKS<select value={s.fontSize} onChange={e=>update("fontSize",+e.target.value)}><option value="52">Compact</option><option value="66">Medium</option><option value="76">Bold</option><option value="92">Oversized</option></select></label>
              <label>GAYA TRANSISI<select value={s.motion} onChange={e=>update("motion",e.target.value)}><option value="mix">Auto mix (recommended)</option><option value="slide">Fast slide</option><option value="zoom">Punch zoom</option><option value="word">Word carry</option><option value="tilt">Micro tilt</option></select></label>
              <label>WARNA HIGHLIGHT<div className="colorControl"><input type="color" value={s.highlight} onChange={e=>update("highlight",e.target.value)}/><span>{s.highlight.toUpperCase()}</span></div></label>
              <label>WARNA LATAR<div className="colorControl"><input type="color" value={s.background} onChange={e=>update("background",e.target.value)}/><span>{s.background.toUpperCase()}</span></div></label>
            </div>
            <div className="switchRow"><div><b>Sound effects sync</b><small>Whoosh, click, pop, dan thump berbeda per transisi.</small></div><input type="checkbox" checked={s.sound} onChange={e=>update("sound",e.target.checked)}/></div>
            <div className="switchRow"><div><b>Paper grain</b><small>Tekstur halus untuk look editorial.</small></div><input type="checkbox" checked={s.grain} onChange={e=>update("grain",e.target.checked)}/></div>
            <label className="rangeLabel">VOLUME EFEK SUARA <span>{s.soundLevel}%</span><input type="range" min="15" max="100" step="5" value={s.soundLevel} onChange={e=>update("soundLevel",+e.target.value)}/></label>
          </section>
          <div className="renderArea">{error&&<div className="error">{error}</div>}{busy&&<div className="progressWrap"><div><b>Rendering motion typography</b><span>{progress}%</span></div><div className="progress"><i style={{width:`${progress}%`}}/></div><small>Biarkan tab ini terbuka sampai selesai.</small></div>}<button className="renderBtn" onClick={renderVideo} disabled={busy}>{busy?`RENDERING ${progress}% ...`:"▶  RENDER TEXT MATCH CUT"}</button><p>Render di browser · tanpa API key · tanpa backend</p></div>
        </div>
        <aside className="previewColumn"><div className="previewTitle"><div><span className="num">LIVE</span><b>Preview motion</b></div><span className="pulse">● PREVIEW</span></div><div className="previewStage"><canvas ref={canvasRef}/></div><div className="previewMeta"><span>{s.ratio}</span><span>{s.fps} FPS</span><span>{s.duration}s</span></div><div className="hint"><b>Motion recipe</b><p>Setiap cut punya entrance/exit, perubahan skala dan arah gerak. Sound effect dipicu di titik cut saat render.</p></div></aside>
      </div>
    </>:<section className="resultPanel"><div className="eyebrow">RENDER COMPLETE</div><h1>Your words, <em>in motion.</em></h1><p>Preview hasil render, lalu download file WebM.</p><video src={videoUrl} controls playsInline/><div className="resultActions"><a className="renderBtn download" href={videoUrl} download="cuttype-match-cut.webm">↓ DOWNLOAD VIDEO</a><button className="backBtn" onClick={reset}>← KEMBALI KE EDITING</button></div><div className="formatNote">Format ekspor: WebM. Bisa dikonversi ke MP4 melalui editor video jika dibutuhkan.</div></section>}
    <footer><span>CutType Motion Studio © 2026</span><span>MAKE EVERY WORD LAND.</span></footer>
  </main>;
}
