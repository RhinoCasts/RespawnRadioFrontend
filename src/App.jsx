import React, { useState, useEffect, useCallback } from "react";
import './index.css'

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const SHORT_DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const HOURS = Array.from({length:24},(_,i)=>i);

function fmt12(h){
  if(h===0)return"12:00 AM";
  if(h<12)return`${h}:00 AM`;
  if(h===12)return"12:00 PM";
  return`${h-12}:00 PM`;
}

function dateKey(d){
  return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function getNext7Days(){
  const days=[];
  const now=new Date();
  for(let i=0;i<7;i++){
    const d=new Date(now);
    d.setDate(now.getDate()+i);
    days.push(d);
  }
  return days;
}

const INITIAL_USERS=[
  {id:"admin",username:"admin",password:"admin123",role:"admin",displayName:"Admin"},
  {id:"host1",username:"djnova",password:"pass123",role:"host",displayName:"DJ Nova"},
  {id:"host2",username:"pixelwave",password:"pass123",role:"host",displayName:"Pixel Wave"},
];

const INITIAL_SHOWS=(()=>{
  const shows=[];
  const now=new Date();
  const base=new Date(now);
  base.setMinutes(0,0,0);

  // pre-seed some shows
  const seed=[
    {hostId:"host1",displayName:"DJ Nova",title:"Morning Boost",dayOffset:0,hour:8,duration:2},
    {hostId:"host2",displayName:"Pixel Wave",title:"Chillwave Sessions",dayOffset:1,hour:14,duration:1},
    {hostId:"host1",displayName:"DJ Nova",title:"Evening Drive",dayOffset:2,hour:18,duration:2},
    {hostId:"host2",displayName:"Pixel Wave",title:"Late Night Vibes",dayOffset:3,hour:22,duration:1},
  ];

  seed.forEach((s,i)=>{
    const start=new Date(base);
    start.setDate(base.getDate()+s.dayOffset);
    start.setHours(s.hour,0,0,0);
    const end=new Date(start);
    end.setHours(start.getHours()+s.duration);
    shows.push({
      id:`seed-${i}`,
      hostId:s.hostId,
      hostDisplayName:s.displayName,
      title:s.title,
      start:start.toISOString(),
      end:end.toISOString(),
      recurringGroupId:null,
    });
  });
  return shows;
})();

// ── helpers ──────────────────────────────────────────────────────────────────
function overlaps(showsArr, startISO, endISO, excludeId=null){
  const s=new Date(startISO).getTime();
  const e=new Date(endISO).getTime();
  return showsArr.some(sh=>{
    if(sh.id===excludeId)return false;
    const ss=new Date(sh.start).getTime();
    const se=new Date(sh.end).getTime();
    return s<se && e>ss;
  });
}

function getCurrentAndNext(shows){
  const now=new Date();
  const active=shows.filter(s=>new Date(s.start)<=now && new Date(s.end)>now);
  const upcoming=shows.filter(s=>new Date(s.start)>now).sort((a,b)=>new Date(a.start)-new Date(b.start));
  const current=active[0]||null;
  const next=upcoming[0]||null;
  return{current,next};
}

// ── sub-components ────────────────────────────────────────────────────────────

function Badge({color,children}){
  const map={
    green:{bg:"#e6f4ea",text:"#1e6b3a"},
    blue:{bg:"#e3eeff",text:"#1a3d8f"},
    amber:{bg:"#fff3cd",text:"#7a5200"},
    red:{bg:"#fdecea",text:"#8b1a1a"},
    purple:{bg:"#f0eaff",text:"#4a2d8f"},
    gray:{bg:"#f1f1f1",text:"#444"},
  };
  const c=map[color]||map.gray;
  return(
    <span style={{background:c.bg,color:c.text,fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,letterSpacing:.5,whiteSpace:"nowrap"}}>
      {children}
    </span>
  );
}

function Modal({title,onClose,children,width=480}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:"#111820",border:"1px solid #2a3a4a",borderRadius:16,width:"100%",maxWidth:width,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,.6)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 24px 0"}}>
          <h2 style={{margin:0,fontSize:18,fontWeight:700,color:"#e8f0fe"}}>{title}</h2>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#8899aa",fontSize:22,cursor:"pointer",lineHeight:1,padding:4}}>&times;</button>
        </div>
        <div style={{padding:24}}>{children}</div>
      </div>
    </div>
  );
}

function Input({label,value,onChange,type="text",placeholder="",required=false,autoFocus=false}){
  return(
    <div style={{marginBottom:16}}>
      {label&&<label style={{display:"block",fontSize:12,fontWeight:600,color:"#7a8fa8",marginBottom:6,textTransform:"uppercase",letterSpacing:.8}}>{label}</label>}
      <input
        type={type} value={value} onChange={e=>onChange(e.target.value)}
        placeholder={placeholder} required={required} autoFocus={autoFocus}
        style={{width:"100%",background:"#0d1520",border:"1px solid #2a3a4a",borderRadius:8,padding:"10px 14px",color:"#e8f0fe",fontSize:14,outline:"none",boxSizing:"border-box"}}
      />
    </div>
  );
}

function Select({label,value,onChange,options}){
  return(
    <div style={{marginBottom:16}}>
      {label&&<label style={{display:"block",fontSize:12,fontWeight:600,color:"#7a8fa8",marginBottom:6,textTransform:"uppercase",letterSpacing:.8}}>{label}</label>}
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{width:"100%",background:"#0d1520",border:"1px solid #2a3a4a",borderRadius:8,padding:"10px 14px",color:"#e8f0fe",fontSize:14,outline:"none",boxSizing:"border-box"}}>
        {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Btn({onClick,children,variant="primary",style={},disabled=false}){
  const styles={
    primary:{background:"#00e5ff",color:"#040d18",fontWeight:700},
    secondary:{background:"transparent",color:"#8899aa",border:"1px solid #2a3a4a"},
    danger:{background:"#ff4444",color:"#fff",fontWeight:700},
    ghost:{background:"transparent",color:"#00e5ff",fontWeight:600},
  };
  return(
    <button onClick={onClick} disabled={disabled}
      style={{...{padding:"10px 20px",borderRadius:8,border:"none",fontSize:14,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1,transition:"opacity .2s"},
        ...styles[variant],...style}}>
      {children}
    </button>
  );
}

// ── LIVE STATUS BAR ───────────────────────────────────────────────────────────
function LiveBar({shows, autoDJImage}){
  const {current,next}=getCurrentAndNext(shows);
  const[tick,setTick]=useState(0);
  useEffect(()=>{const t=setInterval(()=>setTick(x=>x+1),60000);return()=>clearInterval(t);},[]);

  const artwork=current?.image||autoDJImage||null;
  const title=current?current.title:"Music";
  const host=current?current.hostDisplayName:"AutoDJ";

  return(
    <div style={{background:"#060f1e",border:"1px solid #1a3050",borderRadius:12,padding:16,display:"flex",alignItems:"center",gap:20,flexWrap:"wrap",marginBottom:24}}>
      {/* Artwork */}
      <div style={{width:80,height:80,borderRadius:10,flexShrink:0,overflow:"hidden",background:"#0d1a28",border:"1px solid #1a2a3a",display:"flex",alignItems:"center",justifyContent:"center"}}>
        {artwork ? (
          <img src={artwork} alt={title} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        ) : (
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <span style={{fontSize:28}}>🎵</span>
          </div>
        )}
      </div>
      {/* Now playing info */}
      <div style={{flex:1,minWidth:160}}>
        <div style={{fontSize:11,color:"#7a8fa8",marginBottom:4,textTransform:"uppercase",letterSpacing:1,fontWeight:600}}>Now Playing</div>
        <div style={{fontSize:17,fontWeight:700,color:"#e8f0fe",lineHeight:1.2,marginBottom:4}}>{title}</div>
        <div style={{fontSize:13,color:"#00e5ff"}}>{host}</div>
      </div>
      {/* Up next */}
      {next&&(
        <div style={{borderLeft:"1px solid #1a2a3a",paddingLeft:20,minWidth:150}}>
          <div style={{fontSize:11,color:"#7a8fa8",marginBottom:4,textTransform:"uppercase",letterSpacing:1,fontWeight:600}}>Up Next</div>
          <div style={{fontSize:14,fontWeight:600,color:"#c0d8f0",lineHeight:1.2,marginBottom:4}}>{next.title}</div>
          <div style={{fontSize:12,color:"#7a8fa8"}}>{next.hostDisplayName}</div>
          <div style={{fontSize:11,color:"#4a6a8a",marginTop:2}}>{new Date(next.start).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div>
        </div>
      )}
      {/* Stream buttons */}
      <div style={{display:"flex",gap:10,marginLeft:"auto",flexShrink:0}}>
        <a href="https://twitch.tv/RespawnRadio" target="_blank" rel="noreferrer"
          style={{display:"flex",alignItems:"center",gap:6,background:"#9147ff",color:"#fff",fontWeight:700,fontSize:13,padding:"8px 16px",borderRadius:8,textDecoration:"none"}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>
          Twitch
        </a>
        <a href="https://youtube.com/@respawn-radio" target="_blank" rel="noreferrer"
          style={{display:"flex",alignItems:"center",gap:6,background:"#ff0000",color:"#fff",fontWeight:700,fontSize:13,padding:"8px 16px",borderRadius:8,textDecoration:"none"}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.55 3.5 12 3.5 12 3.5s-7.55 0-9.38.55A3.02 3.02 0 00.5 6.19C0 8.03 0 12 0 12s0 3.97.5 5.81a3.02 3.02 0 002.12 2.14c1.83.55 9.38.55 9.38.55s7.55 0 9.38-.55a3.02 3.02 0 002.12-2.14C24 15.97 24 12 24 12s0-3.97-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg>
          YouTube
        </a>
      </div>
    </div>
  );
}

// ── 7-DAY SCHEDULE GRID ───────────────────────────────────────────────────────
function ScheduleGrid({shows, days, onSlotClick, currentUser}){
  const now=new Date();
  const hourH=48;
  const labelW=52;

  function getShowsForDay(day){
    const dk=dateKey(day);
    return shows.filter(s=>dateKey(new Date(s.start))===dk);
  }

  function isSlotTaken(day, hour){
    return shows.some(s=>{
      const ss=new Date(s.start);
      const se=new Date(s.end);
      const slotStart=new Date(day);
      slotStart.setHours(hour,0,0,0);
      const slotEnd=new Date(slotStart);
      slotEnd.setHours(hour+1);
      return ss<slotEnd && se>slotStart;
    });
  }

  return(
    <div style={{overflowX:"auto"}}>
      <div style={{minWidth:700}}>
        {/* Header */}
        <div style={{display:"flex",marginLeft:labelW}}>
          {days.map((d,i)=>{
            const isToday=dateKey(d)===dateKey(now);
            return(
              <div key={i} style={{flex:1,textAlign:"center",padding:"8px 4px",borderLeft:"1px solid #1a2a3a"}}>
                <div style={{fontSize:11,color:"#7a8fa8",fontWeight:600,textTransform:"uppercase"}}>{SHORT_DAYS[d.getDay()]}</div>
                <div style={{fontSize:18,fontWeight:700,color:isToday?"#00e5ff":"#e8f0fe",
                  background:isToday?"rgba(0,229,255,.1)":"transparent",borderRadius:8,padding:"2px 0",marginTop:2}}>
                  {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>
        {/* Grid */}
        <div style={{position:"relative",display:"flex"}}>
          {/* Hour labels */}
          <div style={{width:labelW,flexShrink:0}}>
            {HOURS.map(h=>(
              <div key={h} style={{height:hourH,display:"flex",alignItems:"center",paddingRight:8,justifyContent:"flex-end"}}>
                <span style={{fontSize:10,color:"#4a5a6a",whiteSpace:"nowrap"}}>{fmt12(h)}</span>
              </div>
            ))}
          </div>
          {/* Day columns */}
          {days.map((day,di)=>{
            const dayShows=getShowsForDay(day);
            const dayStart=new Date(day);
            dayStart.setHours(0,0,0,0);
            const isPast=day<new Date(now.getFullYear(),now.getMonth(),now.getDate());

            return(
              <div key={di} style={{flex:1,borderLeft:"1px solid #1a2a3a",position:"relative",height:hourH*24}}>
                {/* Hour slots (clickable for logged-in hosts) */}
                {HOURS.map(h=>{
                  const slotTime=new Date(day);
                  slotTime.setHours(h,0,0,0);
                  const slotPast=slotTime<now;
                  const taken=isSlotTaken(day,h);
                  const canClick=currentUser && !slotPast && !taken;
                  return(
                    <div key={h} onClick={()=>canClick&&onSlotClick(day,h)}
                      style={{position:"absolute",top:h*hourH,left:0,right:0,height:hourH,
                        borderBottom:"1px solid #0d1a28",
                        background:slotPast?"#060d18":canClick?"transparent":"transparent",
                        cursor:canClick?"pointer":"default",
                        transition:"background .15s"}}
                      onMouseEnter={e=>{if(canClick)e.currentTarget.style.background="rgba(0,229,255,.07)";}}
                      onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}
                    />
                  );
                })}
                {/* Current time line */}
                {dateKey(day)===dateKey(now)&&(
                  <div style={{position:"absolute",top:(now.getHours()*60+now.getMinutes())/60*hourH,left:0,right:0,height:2,background:"#00e5ff",zIndex:5,boxShadow:"0 0 8px #00e5ff"}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:"#00e5ff",marginTop:-3,marginLeft:-4}}/>
                  </div>
                )}
                {/* Shows */}
                {dayShows.map(show=>{
                  const ss=new Date(show.start);
                  const se=new Date(show.end);
                  const topPct=(ss.getHours()*60+ss.getMinutes())/60*hourH;
                  const heightPct=((se-ss)/3600000)*hourH;
                  const isOwn=currentUser&&show.hostId===currentUser.id;
                  const isNow=ss<=now&&se>now;
                  return(
                    <div key={show.id}
                      style={{position:"absolute",top:topPct+1,left:3,right:3,height:heightPct-2,
                        background:isNow?"#003d50":isOwn?"#002a3a":"#0d2035",
                        border:`1px solid ${isNow?"#00e5ff":isOwn?"#0070a0":"#1a3050"}`,
                        borderRadius:6,padding:"4px 6px",overflow:"hidden",zIndex:4,cursor:"default"}}>
                      <div style={{fontSize:11,fontWeight:700,color:isNow?"#00e5ff":"#c0d8f0",lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{show.title}</div>
                      <div style={{fontSize:10,color:"#7a9ab8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{show.hostDisplayName}</div>
                      {heightPct>50&&(
                        <div style={{fontSize:9,color:"#4a6a8a",marginTop:2}}>{fmt12(ss.getHours())}–{fmt12(se.getHours())}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── BOOK SLOT MODAL ───────────────────────────────────────────────────────────
function BookSlotModal({day, hour, onClose, onBook, shows}){
  const [title,setTitle]=useState("");
  const [duration,setDuration]=useState("1");
  const [recurring,setRecurring]=useState(false);
  const [recurType,setRecurType]=useState("weekly");
  const [recurDays,setRecurDays]=useState([day.getDay()]);
  const [error,setError]=useState("");
  const [image,setImage]=useState(null);

  const slotStart=new Date(day);
  slotStart.setHours(hour,0,0,0);
  const slotEnd=new Date(slotStart);
  slotEnd.setHours(hour+parseInt(duration));

  function toggleDay(d){
    setRecurDays(prev=>prev.includes(d)?prev.filter(x=>x!==d):[...prev,d].sort((a,b)=>a-b));
  }

  // Auto-deselect any chosen days that become blocked when duration changes
  useEffect(()=>{
    setRecurDays(prev=>prev.filter(d=>!blockedDays.includes(d)));
  },[duration]);

  function handleImageChange(e){
    const file=e.target.files[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>setImage(ev.target.result);
    reader.readAsDataURL(file);
  }

  function validate(){
    if(!title.trim())return "Please enter a show title.";
    if(recurring&&recurType==="daily"&&recurDays.length===0)return "Please select at least one day.";
    if(overlaps(shows,slotStart.toISOString(),slotEnd.toISOString()))return "This time slot overlaps with an existing show.";
    return null;
  }

  function handleBook(){
    const err=validate();
    if(err){setError(err);return;}
    onBook({
      title:title.trim(),
      startISO:slotStart.toISOString(),
      endISO:slotEnd.toISOString(),
      durationHours:parseInt(duration),
      recurring,
      recurType,
      recurDays: recurType==="daily"?recurDays:[day.getDay()],
      image,
    });
  }

  const DAY_LABELS=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const DAY_VALUES=[1,2,3,4,5,6,0];

  // Work out which days are blocked due to existing shows in the next 4 weeks
  const blockedDays=DAY_VALUES.filter(dow=>{
    // Find the next occurrence of this dow on or after today
    const base=new Date(day);
    const diff=(dow-base.getDay()+7)%7;
    for(let w=0;w<4;w++){
      const s=new Date(base);
      s.setDate(base.getDate()+diff+w*7);
      s.setHours(hour,0,0,0);
      const e=new Date(s);
      e.setHours(hour+parseInt(duration));
      if(overlaps(shows,s.toISOString(),e.toISOString()))return true;
    }
    return false;
  });

  return(
    <Modal title="Book a Slot" onClose={onClose}>
      <div style={{fontSize:13,color:"#7a8fa8",marginBottom:20,background:"#0d1a28",borderRadius:8,padding:"10px 14px"}}>
        📅 {DAYS[day.getDay()]}, {day.toLocaleDateString()} · {fmt12(hour)} – {fmt12(hour+parseInt(duration))}
      </div>
      <Input label="Show Title" value={title} onChange={setTitle} placeholder="e.g. Morning Boost" autoFocus />
      <Select label="Duration" value={duration} onChange={setDuration}
        options={[{value:"1",label:"1 Hour"},{value:"2",label:"2 Hours"}]}/>
      {/* Show image upload */}
      <div style={{marginBottom:16}}>
        <label style={{display:"block",fontSize:12,fontWeight:600,color:"#7a8fa8",marginBottom:6,textTransform:"uppercase",letterSpacing:.8}}>Show Artwork <span style={{color:"#4a6a8a",fontWeight:400,textTransform:"none"}}>(optional)</span></label>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:56,height:56,borderRadius:8,background:"#0d1520",border:"1px solid #2a3a4a",overflow:"hidden",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {image ? <img src={image} alt="preview" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <span style={{fontSize:22}}>🎵</span>}
          </div>
          <div style={{flex:1}}>
            <label style={{display:"inline-block",background:"#1a2a3a",border:"1px solid #2a3a4a",borderRadius:6,padding:"7px 14px",fontSize:13,color:"#c0d8f0",cursor:"pointer"}}>
              {image?"Change Image":"Upload Image"}
              <input type="file" accept="image/*" onChange={handleImageChange} style={{display:"none"}}/>
            </label>
            {image&&(
              <button onClick={()=>setImage(null)} style={{marginLeft:8,background:"none",border:"none",color:"#ff6666",fontSize:12,cursor:"pointer"}}>Remove</button>
            )}
            <div style={{fontSize:11,color:"#4a6a8a",marginTop:5}}>Displays in the Now Playing bar. Falls back to AutoDJ image if not set.</div>
          </div>
        </div>
      </div>
      {/* Recurring toggle */}
      <div style={{marginBottom:16}}>
        <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
          <input type="checkbox" checked={recurring} onChange={e=>setRecurring(e.target.checked)}
            style={{width:16,height:16,accentColor:"#00e5ff"}}/>
          <span style={{fontSize:14,color:"#c0d8f0",fontWeight:600}}>Recurring show</span>
        </label>
      </div>
      {recurring&&(
        <div style={{background:"#0d1a28",borderRadius:8,padding:16,marginBottom:16,border:"1px solid #1a3050"}}>
          <Select label="Repeats" value={recurType} onChange={v=>{setRecurType(v);}}
            options={[{value:"weekly",label:"Weekly (same day & time)"},{value:"daily",label:"Select days of the week"}]}/>
          {recurType==="daily"&&(
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"#7a8fa8",marginBottom:8,textTransform:"uppercase",letterSpacing:.8}}>Airs on</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {DAY_LABELS.map((label,i)=>{
                  const dow=DAY_VALUES[i];
                  const active=recurDays.includes(dow);
                  const blocked=blockedDays.includes(dow);
                  return(
                    <button key={dow} onClick={()=>!blocked&&toggleDay(dow)}
                      title={blocked?"A show already exists in this slot":""}
                      style={{padding:"6px 12px",borderRadius:6,
                        border:`1px solid ${blocked?"#2a2020":active?"#00e5ff":"#2a3a4a"}`,
                        background:blocked?"#1a1010":active?"rgba(0,229,255,.12)":"transparent",
                        color:blocked?"#3a2a2a":active?"#00e5ff":"#7a8fa8",
                        fontSize:13,fontWeight:active?700:400,
                        cursor:blocked?"not-allowed":"pointer",
                        textDecoration:blocked?"line-through":"none",
                        transition:"all .15s"}}>
                      {label}
                    </button>
                  );
                })}
              </div>
              <div style={{fontSize:11,color:"#4a6a8a",marginTop:10}}>
                Your show will air on the selected days each week, rolling 4 weeks ahead automatically.
              </div>
            </div>
          )}
          {recurType==="weekly"&&(
            <div style={{fontSize:11,color:"#4a6a8a",marginTop:4}}>
              Repeats every {DAYS[day.getDay()]} at {fmt12(hour)}, rolling 4 weeks ahead automatically.
            </div>
          )}
        </div>
      )}
      {error&&<div style={{color:"#ff6666",fontSize:13,marginBottom:12,background:"#2a0d0d",borderRadius:6,padding:"8px 12px"}}>{error}</div>}
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn onClick={handleBook}>Book Slot</Btn>
      </div>
    </Modal>
  );
}

// ── MY SHOWS PANEL ────────────────────────────────────────────────────────────
function MyShowsPanel({shows, currentUser, onDelete}){
  const now=new Date();
  const myShows=shows
    .filter(s=>s.hostId===currentUser.id && new Date(s.start)>now)
    .sort((a,b)=>new Date(a.start)-new Date(b.start));

  return (
    <div>
      {myShows.length === 0 ? (
        <div style={{color:"#4a6a8a",fontSize:14,padding:"20px 0",textAlign:"center"}}>No upcoming shows booked.</div>
      ) : myShows.map(show => {
        const ss=new Date(show.start);
        const se=new Date(show.end);
        return (
          <div key={show.id} style={{display:"flex",alignItems:"center",background:"#0d1a28",borderRadius:8,padding:"10px 14px",marginBottom:8,border:"1px solid #1a2a3a",gap:12}}>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:"#e8f0fe"}}>{show.title}</div>
              <div style={{fontSize:12,color:"#7a8fa8"}}>{ss.toLocaleDateString()} · {fmt12(ss.getHours())}–{fmt12(se.getHours())}</div>
              {show.recurringGroupId && (
                <div style={{marginTop:4}}><Badge color="purple">Recurring</Badge></div>
              )}
            </div>
            <button onClick={()=>onDelete(show)} style={{background:"none",border:"none",color:"#ff6666",cursor:"pointer",fontSize:18,padding:4}} title="Delete show">🗑</button>
          </div>
        );
      })}
    </div>
  );
}

// ── DELETE CONFIRM MODAL ──────────────────────────────────────────────────────
function DeleteConfirmModal({show, shows, onClose, onDelete}){
  const hasGroup=!!show.recurringGroupId;
  const futureGroupShows=hasGroup?shows.filter(s=>s.recurringGroupId===show.recurringGroupId&&new Date(s.start)>=new Date(show.start)):[];

  return(
    <Modal title="Delete Show" onClose={onClose} width={400}>
      <p style={{color:"#c0d8f0",fontSize:14,marginBottom:20}}>
        Delete <strong style={{color:"#e8f0fe"}}>{show.title}</strong> on {new Date(show.start).toLocaleDateString()}?
      </p>
      {hasGroup&&futureGroupShows.length>1&&(
        <div style={{background:"#1a1000",border:"1px solid #3a2a00",borderRadius:8,padding:12,marginBottom:20}}>
          <p style={{color:"#ffcc66",fontSize:13,margin:"0 0 12px"}}>This is a recurring show with {futureGroupShows.length} future occurrence{futureGroupShows.length>1?"s":""}. What would you like to do?</p>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <Btn variant="danger" onClick={()=>onDelete("all")}>Delete all {futureGroupShows.length} future occurrences</Btn>
            <Btn variant="secondary" onClick={()=>onDelete("one")} style={{borderColor:"#ff6666",color:"#ff6666"}}>Delete only this occurrence</Btn>
          </div>
        </div>
      )}
      {(!hasGroup||futureGroupShows.length<=1)&&(
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn variant="danger" onClick={()=>onDelete("one")}>Delete</Btn>
        </div>
      )}
      <div style={{display:"flex",justifyContent:"center",marginTop:8}}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
      </div>
    </Modal>
  );
}

// ── CHANGE PASSWORD MODAL ─────────────────────────────────────────────────────
function ChangePasswordModal({onClose, onSave}){
  const[curr,setCurr]=useState("");
  const[next,setNext]=useState("");
  const[conf,setConf]=useState("");
  const[err,setErr]=useState("");
  const[ok,setOk]=useState(false);

  function handle(){
    if(!curr||!next||!conf){setErr("All fields required.");return;}
    if(next.length<6){setErr("Password must be at least 6 characters.");return;}
    if(next!==conf){setErr("Passwords do not match.");return;}
    onSave(curr,next,(success,msg)=>{
      if(success){setOk(true);}else{setErr(msg);}
    });
  }

  return ok ? (
    <Modal title="Password Changed" onClose={onClose} width={360}>
      <p style={{color:"#66ff99",textAlign:"center",fontSize:15}}>Password updated successfully!</p>
      <div style={{textAlign:"center",marginTop:12}}><Btn onClick={onClose}>Done</Btn></div>
    </Modal>
  ) : (
    <Modal title="Change Password" onClose={onClose} width={360}>
      <Input label="Current Password" type="password" value={curr} onChange={setCurr} autoFocus/>
      <Input label="New Password" type="password" value={next} onChange={setNext}/>
      <Input label="Confirm New Password" type="password" value={conf} onChange={setConf}/>
      {err&&<div style={{color:"#ff6666",fontSize:13,marginBottom:12}}>{err}</div>}
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn onClick={handle}>Save</Btn>
      </div>
    </Modal>
  );
}

// ── LOGIN MODAL ───────────────────────────────────────────────────────────────
function LoginModal({onClose, onLogin}){
  const[username,setUsername]=useState("");
  const[password,setPassword]=useState("");
  const[err,setErr]=useState("");

  function handle(){
    const result=onLogin(username,password);
    if(!result)setErr("Invalid username or password.");
  }

  return(
    <Modal title="Host Login" onClose={onClose} width={360}>
      <Input label="Username" value={username} onChange={setUsername} autoFocus placeholder="username"/>
      <Input label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••"/>
      {err&&<div style={{color:"#ff6666",fontSize:13,marginBottom:12}}>{err}</div>}
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn onClick={handle}>Login</Btn>
      </div>
      <p style={{fontSize:12,color:"#4a6a8a",marginTop:16,textAlign:"center"}}>Hosts: contact admin for your credentials.</p>
    </Modal>
  );
}

// ── ADMIN PANEL ───────────────────────────────────────────────────────────────
function AdminPanel({users, shows, invites, autoDJImage, onSetAutoDJImage, onAddUser, onDeleteUser, onDeleteShow, onGenerateInvite}){
  const[newName,setNewName]=useState("");
  const[newUser,setNewUser]=useState("");
  const[newPass,setNewPass]=useState("");
  const[newRole,setNewRole]=useState("host");
  const[err,setErr]=useState("");
  const[ok,setOk]=useState("");
  const[generatedLink,setGeneratedLink]=useState("");
  const[linkCopied,setLinkCopied]=useState(false);

  function handleAdd(){
    if(!newName||!newUser||!newPass){setErr("All fields required.");setOk("");return;}
    if(users.find(u=>u.username===newUser)){setErr("Username already taken.");setOk("");return;}
    onAddUser({id:`user-${Date.now()}`,username:newUser,password:newPass,role:newRole,displayName:newName});
    setNewName("");setNewUser("");setNewPass("");setErr("");setOk(`User "${newUser}" created!`);
  }

  function handleGenerateInvite(){
    const token=onGenerateInvite();
    const base=window.location.href.split("?")[0];
    setGeneratedLink(`${base}?invite=${token}`);
    setLinkCopied(false);
  }

  function handleCopyLink(){
    navigator.clipboard.writeText(generatedLink).then(()=>{setLinkCopied(true);setTimeout(()=>setLinkCopied(false),2500);});
  }

  function handleAutoDJImage(e){
    const file=e.target.files[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>onSetAutoDJImage(ev.target.result);
    reader.readAsDataURL(file);
  }

  const now=new Date();
  const allUpcoming=shows.filter(s=>new Date(s.start)>now).sort((a,b)=>new Date(a.start)-new Date(b.start));
  const THIRTY_DAYS=30*24*60*60*1000;
  const pendingInvites=invites.filter(i=>!i.used&&(Date.now()-i.createdAt)<THIRTY_DAYS);

  return(
    <div>
      {/* ── AutoDJ Image ── */}
      <h3 style={{color:"#e8f0fe",fontSize:16,fontWeight:700,marginBottom:12,marginTop:0}}>AutoDJ Artwork</h3>
      <div style={{background:"#0d1a28",borderRadius:10,padding:16,marginBottom:24,border:"1px solid #1a2a3a"}}>
        <p style={{color:"#7a8fa8",fontSize:13,margin:"0 0 14px"}}>
          This image displays in the Now Playing bar whenever no host show is currently airing, or when a host hasn't set their own show artwork.
        </p>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div style={{width:72,height:72,borderRadius:10,background:"#060d18",border:"1px solid #2a3a4a",overflow:"hidden",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {autoDJImage ? <img src={autoDJImage} alt="AutoDJ" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <span style={{fontSize:30}}>🎵</span>}
          </div>
          <div>
            <label style={{display:"inline-block",background:"#1a2a3a",border:"1px solid #2a3a4a",borderRadius:6,padding:"8px 16px",fontSize:13,color:"#c0d8f0",cursor:"pointer",marginBottom:6}}>
              {autoDJImage?"Change AutoDJ Image":"Upload AutoDJ Image"}
              <input type="file" accept="image/*" onChange={handleAutoDJImage} style={{display:"none"}}/>
            </label>
            {autoDJImage&&(
              <div>
                <button onClick={()=>onSetAutoDJImage(null)} style={{background:"none",border:"none",color:"#ff6666",fontSize:12,cursor:"pointer",padding:0}}>Remove image</button>
              </div>
            )}
          </div>
        </div>
      </div>
      <h3 style={{color:"#e8f0fe",fontSize:16,fontWeight:700,marginBottom:12,marginTop:0}}>Invite a New Host</h3>
      <div style={{background:"#0d1a28",borderRadius:10,padding:16,marginBottom:24,border:"1px solid #1a2a3a"}}>
        <p style={{color:"#7a8fa8",fontSize:13,margin:"0 0 14px"}}>
          Generate a single-use invite link and send it to your new host. Once they register, the link is automatically invalidated.
        </p>
        <Btn onClick={handleGenerateInvite} style={{marginBottom: generatedLink?14:0}}>Generate Invite Link</Btn>
        {generatedLink&&(
          <div style={{marginTop:14}}>
            <div style={{fontSize:11,color:"#7a8fa8",marginBottom:6,textTransform:"uppercase",letterSpacing:.8,fontWeight:600}}>Invite Link (single use)</div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <div style={{flex:1,background:"#060d18",border:"1px solid #1a3050",borderRadius:6,padding:"8px 12px",fontSize:12,color:"#00e5ff",fontFamily:"monospace",overflowX:"auto",whiteSpace:"nowrap"}}>
                {generatedLink}
              </div>
              <button onClick={handleCopyLink}
                style={{flexShrink:0,background:linkCopied?"#0a2a0d":"#1a2a3a",border:`1px solid ${linkCopied?"#44cc88":"#2a3a4a"}`,
                  color:linkCopied?"#44cc88":"#c0d8f0",borderRadius:6,padding:"8px 14px",fontSize:12,cursor:"pointer",fontWeight:600,transition:"all .2s"}}>
                {linkCopied?"✓ Copied":"Copy"}
              </button>
            </div>
            <p style={{fontSize:11,color:"#4a6a8a",margin:"8px 0 0"}}>
              Expires in 30 days · {pendingInvites.length} unused invite{pendingInvites.length!==1?"s":""} outstanding
            </p>
          </div>
        )}
      </div>

      {/* ── Create User Manually ── */}
      <h3 style={{color:"#e8f0fe",fontSize:16,fontWeight:700,marginBottom:12}}>Create User Manually</h3>
      <div style={{background:"#0d1a28",borderRadius:10,padding:16,marginBottom:24,border:"1px solid #1a2a3a"}}>
        <Input label="Display Name" value={newName} onChange={setNewName} placeholder="DJ Example"/>
        <Input label="Username" value={newUser} onChange={setNewUser} placeholder="djexample"/>
        <Input label="Password" type="password" value={newPass} onChange={setNewPass} placeholder="••••••••"/>
        <Select label="Role" value={newRole} onChange={setNewRole}
          options={[{value:"host",label:"Host"},{value:"admin",label:"Admin"}]}/>
        {err&&<div style={{color:"#ff6666",fontSize:13,marginBottom:8}}>{err}</div>}
        {ok&&<div style={{color:"#66ff99",fontSize:13,marginBottom:8}}>{ok}</div>}
        <Btn onClick={handleAdd}>Create User</Btn>
      </div>

      <h3 style={{color:"#e8f0fe",fontSize:16,fontWeight:700,marginBottom:12}}>All Users</h3>
      <div style={{marginBottom:24}}>
        {users.filter(u=>u.id!=="admin").map(u=>(
          <div key={u.id} style={{display:"flex",alignItems:"center",background:"#0d1a28",borderRadius:8,padding:"8px 12px",marginBottom:6,border:"1px solid #1a2a3a",gap:10}}>
            <div style={{flex:1}}>
              <span style={{fontSize:14,fontWeight:600,color:"#e8f0fe"}}>{u.displayName}</span>
              <span style={{fontSize:12,color:"#4a6a8a",marginLeft:8}}>@{u.username}</span>
              <span style={{marginLeft:8}}><Badge color={u.role==="admin"?"amber":"blue"}>{u.role}</Badge></span>
            </div>
            <button onClick={()=>onDeleteUser(u.id)} style={{background:"none",border:"none",color:"#ff6666",cursor:"pointer",fontSize:16}}>🗑</button>
          </div>
        ))}
      </div>

      <h3 style={{color:"#e8f0fe",fontSize:16,fontWeight:700,marginBottom:12}}>All Upcoming Shows</h3>
      {allUpcoming.length===0&&<p style={{color:"#4a6a8a",fontSize:13}}>No upcoming shows.</p>}
      {allUpcoming.map(s=>{
        const ss=new Date(s.start);
        const se=new Date(s.end);
        return(
          <div key={s.id} style={{display:"flex",alignItems:"center",background:"#0d1a28",borderRadius:8,padding:"8px 12px",marginBottom:6,border:"1px solid #1a2a3a",gap:10}}>
            <div style={{flex:1}}>
              <span style={{fontSize:13,fontWeight:600,color:"#e8f0fe"}}>{s.title}</span>
              <span style={{fontSize:12,color:"#7a8fa8",marginLeft:8}}>by {s.hostDisplayName}</span>
              <div style={{fontSize:11,color:"#4a6a8a"}}>{ss.toLocaleDateString()} {fmt12(ss.getHours())}–{fmt12(se.getHours())}</div>
            </div>
            <button onClick={()=>onDeleteShow(s)} style={{background:"none",border:"none",color:"#ff6666",cursor:"pointer",fontSize:16}}>🗑</button>
          </div>
        );
      })}
    </div>
  );
}

// ── API DOCS PANEL ────────────────────────────────────────────────────────────
function APIPanel({shows}){
  const{current,next}=getCurrentAndNext(shows);
  const[copied,setCopied]=useState("");

  const currentResp=JSON.stringify(current?{show:current.title,host:current.hostDisplayName,start:current.start,end:current.end}:{show:"Music",host:"AutoDJ"},null,2);
  const nextResp=JSON.stringify(next?{show:next.title,host:next.hostDisplayName,start:next.start}:{show:"Music",host:"AutoDJ"},null,2);

  function copy(text,key){
    navigator.clipboard.writeText(text).then(()=>{setCopied(key);setTimeout(()=>setCopied(""),2000);});
  }

  const endpoints=[
    {method:"GET",path:"/api/GetCurrentShow",desc:"Returns the currently airing show, or Music/AutoDJ if nothing is scheduled.",response:currentResp,key:"current"},
    {method:"GET",path:"/api/GetNextShow",desc:"Returns the next scheduled show.",response:nextResp,key:"next"},
  ];

  return(
    <div>
      <p style={{color:"#7a8fa8",fontSize:13,marginBottom:20}}>These endpoints expose live schedule data for use in stream overlays, bots, or external integrations.</p>
      {endpoints.map(ep=>(
        <div key={ep.key} style={{background:"#0d1a28",borderRadius:10,padding:16,marginBottom:16,border:"1px solid #1a2a3a"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
            <Badge color={ep.method==="GET"?"green":"blue"}>{ep.method}</Badge>
            <code style={{fontSize:14,color:"#00e5ff",fontFamily:"monospace"}}>{ep.path}</code>
          </div>
          <p style={{fontSize:13,color:"#7a8fa8",margin:"0 0 10px"}}>{ep.desc}</p>
          <div style={{position:"relative"}}>
            <pre style={{background:"#060d18",border:"1px solid #1a2a3a",borderRadius:6,padding:12,fontSize:12,color:"#88cc88",fontFamily:"monospace",margin:0,overflowX:"auto"}}>
              {ep.response}
            </pre>
            <button onClick={()=>copy(ep.response,ep.key)}
              style={{position:"absolute",top:8,right:8,background:"#1a2a3a",border:"none",color:"#7a8fa8",fontSize:11,padding:"4px 10px",borderRadius:4,cursor:"pointer"}}>
              {copied===ep.key?"✅ Copied":"Copy"}
            </button>
          </div>
          <div style={{marginTop:10}}>
            <p style={{fontSize:11,color:"#4a5a6a",margin:0}}>Example curl:</p>
            <code style={{fontSize:11,color:"#7a9ab8",fontFamily:"monospace",display:"block",marginTop:4,background:"#060d18",padding:"6px 10px",borderRadius:4}}>
              {`curl -X GET "https://your-domain.com${ep.path}"`}
            </code>
          </div>
        </div>
      ))}
      <div style={{background:"#0d1520",borderRadius:8,padding:12,border:"1px dashed #1a2a3a",marginTop:8}}>
        <p style={{fontSize:12,color:"#4a6a8a",margin:0}}>💡 <strong style={{color:"#7a8fa8"}}>Integration tip:</strong> Poll GetCurrentShow every 30–60 seconds from your stream overlay or Nightbot to auto-update your "Now Playing" display.</p>
      </div>
    </div>
  );
}

// ── REGISTER PAGE (invite flow) ───────────────────────────────────────────────
function RegisterPage({token, invites, users, onRegister, onInvalidToken}){
  const THIRTY_DAYS=30*24*60*60*1000;
  const invite=invites.find(i=>i.token===token&&!i.used&&(Date.now()-i.createdAt)<THIRTY_DAYS);
  const[displayName,setDisplayName]=useState("");
  const[username,setUsername]=useState("");
  const[password,setPassword]=useState("");
  const[confirm,setConfirm]=useState("");
  const[err,setErr]=useState("");
  const[done,setDone]=useState(false);

  function handleSubmit(){
    if(!displayName.trim()||!username.trim()||!password||!confirm){setErr("All fields are required.");return;}
    if(password.length<6){setErr("Password must be at least 6 characters.");return;}
    if(password!==confirm){setErr("Passwords do not match.");return;}
    if(users.find(u=>u.username===username.trim())){setErr("That username is already taken.");return;}
    onRegister(token,{id:`user-${Date.now()}`,username:username.trim(),password,role:"host",displayName:displayName.trim()});
    setDone(true);
  }

  if(!invite){
    return(
      <div style={{fontFamily:"'Rajdhani',system-ui,sans-serif",background:"#040d18",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"#e8f0fe"}}>
        <div style={{textAlign:"center",maxWidth:400,padding:32}}>
          <div style={{fontSize:48,marginBottom:16}}>🔗</div>
          <h2 style={{color:"#ff6666",fontSize:22,marginBottom:12}}>Invalid or Expired Invite</h2>
          <p style={{color:"#7a8fa8",fontSize:14,marginBottom:24}}>This invite link has already been used or doesn't exist. Please ask the admin for a new one.</p>
          <Btn onClick={onInvalidToken}>Go to Respawn Radio</Btn>
        </div>
      </div>
    );
  }

  return(
    <div style={{fontFamily:"'Rajdhani',system-ui,sans-serif",background:"#040d18",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"#e8f0fe"}}>
      <div style={{width:"100%",maxWidth:420,padding:32}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:48,height:48,background:"linear-gradient(135deg,#00e5ff,#0070ff)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,margin:"0 auto 12px"}}>🎮</div>
          <div style={{fontSize:22,fontWeight:800,color:"#00e5ff",letterSpacing:1}}>RESPAWN RADIO</div>
          <div style={{fontSize:13,color:"#7a8fa8",marginTop:6}}>You've been invited to join as a host</div>
        </div>
        {done ? (
          <div style={{background:"#0a1f10",border:"1px solid #0d3d1a",borderRadius:12,padding:32,textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:12}}>🎉</div>
            <h3 style={{color:"#44cc88",fontSize:18,marginBottom:8}}>Account created!</h3>
            <p style={{color:"#7a8fa8",fontSize:14,marginBottom:24}}>Welcome to Respawn Radio, {displayName}. You can now log in with your new credentials.</p>
            <Btn onClick={onInvalidToken}>Go to Login</Btn>
          </div>
        ) : (
          <div style={{background:"#0d1a28",border:"1px solid #1a2a3a",borderRadius:12,padding:28}}>
            <h3 style={{color:"#e8f0fe",fontSize:17,fontWeight:700,marginBottom:20,marginTop:0}}>Create your host account</h3>
            <Input label="Display Name" value={displayName} onChange={setDisplayName} placeholder="e.g. DJ Nova" autoFocus/>
            <Input label="Username" value={username} onChange={setUsername} placeholder="e.g. djnova"/>
            <Input label="Password" type="password" value={password} onChange={setPassword} placeholder="Min. 6 characters"/>
            <Input label="Confirm Password" type="password" value={confirm} onChange={setConfirm} placeholder="Repeat password"/>
            {err&&<div style={{color:"#ff6666",fontSize:13,marginBottom:14,background:"#2a0d0d",borderRadius:6,padding:"8px 12px"}}>{err}</div>}
            <Btn onClick={handleSubmit} style={{width:"100%",textAlign:"center"}}>Create Account</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App(){
  const[users,setUsers]=useState(INITIAL_USERS);
  const[shows,setShows]=useState(INITIAL_SHOWS);
  const[currentUser,setCurrentUser]=useState(null);
  const[invites,setInvites]=useState([]);
  const[autoDJImage,setAutoDJImage]=useState(null);

  // Check for ?invite=TOKEN in URL
  const[inviteToken]=useState(()=>{
    try{const p=new URLSearchParams(window.location.search);return p.get("invite")||null;}catch{return null;}
  });

  const[tab,setTab]=useState("schedule");
  const[showLogin,setShowLogin]=useState(false);
  const[bookSlot,setBookSlot]=useState(null);
  const[deleteShow,setDeleteShow]=useState(null);
  const[showChangePw,setShowChangePw]=useState(false);
  const[showAdmin,setShowAdmin]=useState(false);

  const days=getNext7Days();

  function handleLogin(username,password){
    const u=users.find(u=>u.username===username&&u.password===password);
    if(u){setCurrentUser(u);setShowLogin(false);return true;}
    return false;
  }

  function handleLogout(){setCurrentUser(null);setTab("schedule");}

  // ── Rolling top-up: keep recurring shows populated 4 weeks ahead ─────────────
  useEffect(()=>{
    function topUp(){
      setShows(prev=>{
        const now=new Date();
        const FOUR_WEEKS=28*24*60*60*1000;
        const additions=[];

        // Find all unique recurring groups
        const groups=[...new Set(prev.filter(s=>s.recurringGroupId).map(s=>s.recurringGroupId))];

        groups.forEach(gid=>{
          const groupShows=prev.filter(s=>s.recurringGroupId===gid);
          const template=groupShows[0]; // all shows in a group share the same metadata
          if(!template||!template.recurMeta)return;

          const {recurType,recurDays,hour,durationHours}=template.recurMeta;
          const futureShows=groupShows.filter(s=>new Date(s.start)>now);

          if(recurType==="weekly"){
            // Find the latest future show in this group
            const latest=futureShows.reduce((a,b)=>new Date(a.start)>new Date(b.start)?a:b, futureShows[0]||groupShows[groupShows.length-1]);
            if(!latest)return;
            const latestStart=new Date(latest.start);
            // If the latest is less than 4 weeks from now, add one more week out
            while(latestStart.getTime()-now.getTime()<FOUR_WEEKS){
              const ns=new Date(latestStart);
              ns.setDate(ns.getDate()+7);
              const ne=new Date(ns);
              ne.setHours(ns.getHours()+durationHours);
              const alreadyExists=prev.some(s=>s.recurringGroupId===gid&&dateKey(new Date(s.start))===dateKey(ns));
              const alreadyAdded=additions.some(s=>s.recurringGroupId===gid&&dateKey(new Date(s.start))===dateKey(ns));
              if(!alreadyExists&&!alreadyAdded&&!overlaps([...prev,...additions],ns.toISOString(),ne.toISOString())){
                additions.push({...latest,id:`show-topup-${Date.now()}-${Math.random()}`,start:ns.toISOString(),end:ne.toISOString()});
              }
              latestStart.setDate(latestStart.getDate()+7);
            }
          } else {
            // daily — per recurDay, find the latest future show for that day and top up
            recurDays.forEach(dow=>{
              const dayShows=futureShows.filter(s=>new Date(s.start).getDay()===dow);
              const allDayShows=groupShows.filter(s=>new Date(s.start).getDay()===dow);
              const latest=dayShows.length>0
                ?dayShows.reduce((a,b)=>new Date(a.start)>new Date(b.start)?a:b)
                :allDayShows.reduce((a,b)=>new Date(a.start)>new Date(b.start)?a:b, allDayShows[allDayShows.length-1]);
              if(!latest)return;
              const latestStart=new Date(latest.start);
              while(latestStart.getTime()-now.getTime()<FOUR_WEEKS){
                const ns=new Date(latestStart);
                ns.setDate(ns.getDate()+7);
                const ne=new Date(ns);
                ne.setHours(ns.getHours()+durationHours);
                const alreadyExists=prev.some(s=>s.recurringGroupId===gid&&dateKey(new Date(s.start))===dateKey(ns));
                const alreadyAdded=additions.some(s=>s.recurringGroupId===gid&&dateKey(new Date(s.start))===dateKey(ns));
                if(!alreadyExists&&!alreadyAdded&&!overlaps([...prev,...additions],ns.toISOString(),ne.toISOString())){
                  additions.push({...latest,id:`show-topup-${Date.now()}-${Math.random()}`,start:ns.toISOString(),end:ne.toISOString()});
                }
                latestStart.setDate(latestStart.getDate()+7);
              }
            });
          }
        });

        return additions.length>0?[...prev,...additions]:prev;
      });
    }

    topUp(); // run immediately on mount
    const t=setInterval(topUp,60000); // then every minute
    return()=>clearInterval(t);
  },[]);

  function handleBook({title,startISO,endISO,durationHours,recurring,recurType,recurDays,image}){
    const newShows=[];
    const groupId=recurring?`grp-${Date.now()}`:null;
    const recurMeta=recurring?{recurType,recurDays,hour:new Date(startISO).getHours(),durationHours}:null;

    if(!recurring){
      // Single show
      newShows.push({
        id:`show-${Date.now()}`,
        hostId:currentUser.id,
        hostDisplayName:currentUser.displayName,
        title,image:image||null,
        start:startISO,end:endISO,
        recurringGroupId:null,recurMeta:null,
      });
    } else if(recurType==="weekly"){
      // 4 weeks of weekly shows
      for(let i=0;i<4;i++){
        const s=new Date(startISO);s.setDate(s.getDate()+i*7);
        const e=new Date(endISO);e.setDate(e.getDate()+i*7);
        if(overlaps([...shows,...newShows],s.toISOString(),e.toISOString()))continue;
        newShows.push({
          id:`show-${Date.now()}-${i}`,
          hostId:currentUser.id,hostDisplayName:currentUser.displayName,
          title,image:image||null,
          start:s.toISOString(),end:e.toISOString(),
          recurringGroupId:groupId,recurMeta,
        });
      }
    } else {
      // daily — for each selected day, generate 4 weeks of shows
      const baseStart=new Date(startISO);
      const baseDow=baseStart.getDay();
      recurDays.forEach(dow=>{
        // Find date of first occurrence of this dow on or after baseStart
        let first=new Date(baseStart);
        const diff=(dow-baseDow+7)%7;
        first.setDate(first.getDate()+diff);
        for(let w=0;w<4;w++){
          const s=new Date(first);s.setDate(first.getDate()+w*7);
          const e=new Date(s);e.setHours(s.getHours()+durationHours);
          if(overlaps([...shows,...newShows],s.toISOString(),e.toISOString()))continue;
          newShows.push({
            id:`show-${Date.now()}-${dow}-${w}`,
            hostId:currentUser.id,hostDisplayName:currentUser.displayName,
            title,image:image||null,
            start:s.toISOString(),end:e.toISOString(),
            recurringGroupId:groupId,recurMeta,
          });
        }
      });
    }

    setShows(prev=>[...prev,...newShows]);
    setBookSlot(null);
  }

  function handleDeleteShow(show, mode){
    if(mode==="all"&&show.recurringGroupId){
      const cutoff=new Date(show.start);
      setShows(prev=>prev.filter(s=>!(s.recurringGroupId===show.recurringGroupId&&new Date(s.start)>=cutoff)));
    } else {
      setShows(prev=>prev.filter(s=>s.id!==show.id));
    }
    setDeleteShow(null);
  }

  function handleChangePassword(curr,next,cb){
    if(currentUser.password!==curr){cb(false,"Current password is incorrect.");return;}
    setUsers(prev=>prev.map(u=>u.id===currentUser.id?{...u,password:next}:u));
    setCurrentUser(prev=>({...prev,password:next}));
    cb(true);
  }

  function handleAddUser(u){setUsers(prev=>[...prev,u]);}
  function handleDeleteUser(id){
    setUsers(prev=>prev.filter(u=>u.id!==id));
    setShows(prev=>prev.filter(s=>s.hostId!==id));
  }

  function handleGenerateInvite(){
    const token=Math.random().toString(36).slice(2,10)+Math.random().toString(36).slice(2,10);
    setInvites(prev=>[...prev,{token,used:false,createdAt:Date.now()}]);
    return token;
  }

  function handleRegister(token,newUser){
    setUsers(prev=>[...prev,newUser]);
    setInvites(prev=>prev.map(i=>i.token===token?{...i,used:true}:i));
  }

  // Show registration page if a valid invite token is in the URL
  if(inviteToken){
    return(
      <RegisterPage
        token={inviteToken}
        invites={invites}
        users={users}
        onRegister={handleRegister}
        onInvalidToken={()=>{ try{window.history.replaceState({},"",window.location.pathname);}catch{} window.location.reload(); }}
      />
    );
  }

  const TABS=[
    {key:"schedule",label:"📅 Schedule"},
    ...(currentUser?[{key:"myshows",label:"🎙 My Shows"}]:[]),
    ...(currentUser?[{key:"api",label:"⚙️ API"}]:[]),
    ...(currentUser?.role==="admin"?[{key:"admin",label:"🛡 Admin"}]:[]),
  ];

  return(
    <div style={{fontFamily:"'Rajdhani','Orbitron',system-ui,sans-serif",background:"#040d18",minHeight:"100vh",color:"#e8f0fe"}}>
      {/* Top Nav */}
      <div style={{background:"#060f1e",borderBottom:"1px solid #1a2a3a",padding:"12px 24px",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,background:"linear-gradient(135deg,#00e5ff,#0070ff)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🎮</div>
          <div>
            <div style={{fontSize:18,fontWeight:800,color:"#00e5ff",letterSpacing:1,lineHeight:1}}>RESPAWN RADIO</div>
            <div style={{fontSize:10,color:"#4a6a8a",letterSpacing:2,textTransform:"uppercase"}}>Live Music & Shows</div>
          </div>
        </div>
        <div style={{flex:1}}/>
        {currentUser?(
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:13,color:"#7a8fa8"}}>
              <Badge color={currentUser.role==="admin"?"amber":"blue"}>{currentUser.role}</Badge>
              <span style={{marginLeft:8}}>{currentUser.displayName}</span>
            </span>
            <Btn variant="ghost" onClick={()=>setShowChangePw(true)} style={{fontSize:12,padding:"6px 12px"}}>Change Password</Btn>
            <Btn variant="secondary" onClick={handleLogout} style={{fontSize:12,padding:"6px 12px"}}>Log Out</Btn>
          </div>
        ):(
          <Btn onClick={()=>setShowLogin(true)} style={{fontSize:13,padding:"8px 18px"}}>🎙 Host Login</Btn>
        )}
      </div>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"24px 16px"}}>
        <LiveBar shows={shows} autoDJImage={autoDJImage}/>

        {/* Hint for logged-in hosts */}
        {currentUser&&(
          <div style={{background:"#0a1f10",border:"1px solid #0d3d1a",borderRadius:8,padding:"10px 16px",marginBottom:20,fontSize:13,color:"#44cc88"}}>
            💡 <strong>Tip:</strong> Click any empty slot on the schedule to book your show!
          </div>
        )}

        {/* Tab Bar */}
        <div style={{display:"flex",gap:4,marginBottom:20,borderBottom:"1px solid #1a2a3a",paddingBottom:0}}>
          {TABS.map(t=>(
            <button key={t.key} onClick={()=>setTab(t.key)}
              style={{background:"none",border:"none",borderBottom:`2px solid ${tab===t.key?"#00e5ff":"transparent"}`,
                color:tab===t.key?"#00e5ff":"#7a8fa8",fontSize:14,fontWeight:tab===t.key?700:500,
                padding:"8px 16px",cursor:"pointer",transition:"all .2s",marginBottom:-1}}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Schedule Tab */}
        {tab==="schedule"&&(
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10}}>
              <h2 style={{margin:0,fontSize:20,fontWeight:700,color:"#e8f0fe"}}>7-Day Schedule</h2>
              <div style={{display:"flex",gap:12,fontSize:12,color:"#4a6a8a",alignItems:"center"}}>
                <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"#003d50",border:"1px solid #00e5ff",display:"inline-block"}}/> Live Now</span>
                <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"#002a3a",border:"1px solid #0070a0",display:"inline-block"}}/> Your Show</span>
                <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:"#0d2035",border:"1px solid #1a3050",display:"inline-block"}}/> Scheduled</span>
              </div>
            </div>
            <div style={{background:"#060f1e",borderRadius:12,border:"1px solid #1a2a3a",overflow:"hidden",padding:"0 0 16px"}}>
              <ScheduleGrid shows={shows} days={days} onSlotClick={(day,hour)=>setBookSlot({day,hour})} currentUser={currentUser}/>
            </div>
            {!currentUser&&(
              <p style={{textAlign:"center",color:"#4a6a8a",fontSize:13,marginTop:16}}>
                <button onClick={()=>setShowLogin(true)} style={{background:"none",border:"none",color:"#00e5ff",cursor:"pointer",fontWeight:700,fontSize:13}}>Log in as a host</button> to book shows.
              </p>
            )}
          </div>
        )}

        {/* My Shows Tab */}
        {tab==="myshows"&&currentUser&&(
          <div>
            <h2 style={{margin:"0 0 16px",fontSize:20,fontWeight:700,color:"#e8f0fe"}}>My Upcoming Shows</h2>
            <MyShowsPanel shows={shows} currentUser={currentUser} onDelete={setDeleteShow}/>
          </div>
        )}

        {/* API Tab */}
        {tab==="api"&&(
          <div>
            <h2 style={{margin:"0 0 16px",fontSize:20,fontWeight:700,color:"#e8f0fe"}}>API Reference</h2>
            <APIPanel shows={shows}/>
          </div>
        )}

        {/* Admin Tab */}
        {tab==="admin"&&currentUser?.role==="admin"&&(
          <div>
            <h2 style={{margin:"0 0 16px",fontSize:20,fontWeight:700,color:"#e8f0fe"}}>Admin Panel</h2>
            <AdminPanel users={users} shows={shows} invites={invites} autoDJImage={autoDJImage} onSetAutoDJImage={setAutoDJImage} onAddUser={handleAddUser} onDeleteUser={handleDeleteUser} onDeleteShow={setDeleteShow} onGenerateInvite={handleGenerateInvite}/>
          </div>
        )}
      </div>

      {/* Modals */}
      {showLogin&&<LoginModal onClose={()=>setShowLogin(false)} onLogin={handleLogin}/>}
      {bookSlot&&<BookSlotModal day={bookSlot.day} hour={bookSlot.hour} shows={shows} onClose={()=>setBookSlot(null)} onBook={handleBook}/>}
      {deleteShow&&<DeleteConfirmModal show={deleteShow} shows={shows} onClose={()=>setDeleteShow(null)} onDelete={(mode)=>handleDeleteShow(deleteShow,mode)}/>}
      {showChangePw&&<ChangePasswordModal onClose={()=>setShowChangePw(false)} onSave={handleChangePassword}/>}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Orbitron:wght@700;900&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #060f1e; }
        ::-webkit-scrollbar-thumb { background: #1a3050; border-radius: 3px; }
      `}</style>
    </div>
  );
}
