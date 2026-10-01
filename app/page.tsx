"use client";

import {useState} from "react";

type Country="thailand"|"vietnam";
type Mode="packages"|"flights"|"hotels";

const data={
  thailand:{name:"Таиланд",flag:"🇹🇭",cities:["Пхукет","Паттайя","Бангкок","Самуи","Краби"]},
  vietnam:{name:"Вьетнам",flag:"🇻🇳",cities:["Нячанг","Фукуок","Дананг","Хошимин","Ханой"]}
};

const money=(n:number)=>new Intl.NumberFormat("ru-RU",{maximumFractionDigits:0}).format(Math.round(n))+" ₽";
function addDays(date:string,days:number){const d=new Date(date+"T12:00:00");d.setDate(d.getDate()+days);return d.toISOString().slice(0,10);}

type Result={id:string;title:string;price:number;meta:string;badge:string;source:string;url?:string;purchase?:()=>void;rating?:number};

export default function Home(){
  const [mode,setMode]=useState<Mode>("packages");
  const [country,setCountry]=useState<Country>("thailand");
  const [origin,setOrigin]=useState("Москва");
  const [city,setCity]=useState("Пхукет");
  const [date,setDate]=useState("");
  const [nights,setNights]=useState("10");
  const [guests,setGuests]=useState("2");
  const [budget,setBudget]=useState("100000");
  const [results,setResults]=useState<Result[]>([]);
  const [searched,setSearched]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [sort,setSort]=useState<"price"|"popular">("price");
  const [flightContext,setFlightContext]=useState<{searchId:string;resultsUrl:string;lastUpdate:number}|null>(null);

  const d=data[country];
  const budgetNumber=Number(budget.replace(/\D/g,""))||0;
  const nightsNumber=Number(nights)||10;
  const guestsNumber=Number(guests)||2;
  const checkout=date?addDays(date,nightsNumber):"";

  const changeCountry=(c:Country)=>{setCountry(c);setCity(data[c].cities[0]);setSearched(false);setResults([]);setError("");};
  const selectMode=(m:Mode)=>{setMode(m);setSearched(false);setResults([]);setError("");};

  const searchFlights=async()=>{
    const start=await fetch("/api/flights",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"start",origin,destination:city,date,returnDate:checkout,guests:guestsNumber})});
    const startData=await start.json();
    if(!start.ok) throw new Error(startData.error||"Не удалось запустить поиск авиабилетов.");
    let lastUpdate=0;
    for(let i=0;i<12;i++){
      await new Promise(r=>setTimeout(r,i===0?2500:2500));
      const r=await fetch("/api/flights",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"results",searchId:startData.search_id,resultsUrl:startData.results_url,lastUpdateTimestamp:lastUpdate})});
      const payload=await r.json();
      if(!r.ok) throw new Error(payload.error||"Ошибка получения авиабилетов.");
      lastUpdate=Number(payload.last_update_timestamp)||lastUpdate;
      const rows:Array<any>=[];
      for(const ticket of payload.tickets||[]){
        for(const proposal of ticket.proposals||[]){
          const raw=proposal.price?.value??proposal.price?.amount??proposal.price??proposal.value;
          const price=Number(raw);
          if(!price||price>budgetNumber) continue;
          const first=ticket.segments?.[0];
          const firstLeg=first?.flights?.[0];
          const leg=payload.flight_legs?.[firstLeg]||{};
          rows.push({
            id:String(proposal.id),title:(leg.origin||origin)+" → "+(leg.destination||city),
            price,meta:"туда и обратно · "+guestsNumber+" чел.",badge:"Реальный результат",source:proposal.flight_terms?.airline_id||"Aviasales",
            purchase:async()=>{
              const c=await fetch("/api/flights",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"click",searchId:startData.search_id,resultsUrl:startData.results_url,proposalId:proposal.id})});
              const cd=await c.json();
              if(cd.url) window.open(cd.url,"_blank","noopener,noreferrer"); else alert(cd.error||"Не удалось получить ссылку покупки.");
            }
          });
          if(rows.length>=30) break;
        }
        if(rows.length>=30) break;
      }
      if(rows.length){setResults(rows);setFlightContext({searchId:startData.search_id,resultsUrl:startData.results_url,lastUpdate});}
      if(payload.is_over) break;
    }
  };

  const searchHotels=async()=>{
    const r=await fetch("/api/hotels",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({city,country:d.name,checkin:date,checkout,guests:guestsNumber,budget:budgetNumber})});
    const payload=await r.json();
    if(!r.ok) throw new Error(payload.error||"Не удалось выполнить поиск отелей.");
    const rows=(payload.data||[]).map((x:any)=>({
      id:String(x.id),title:x.name||"Отель",price:Number(x.price?.total??x.price?.book??x.price?.base??0),
      meta:"за весь срок · "+nightsNumber+" ночей · "+guestsNumber+" чел.",badge:"Реальное предложение",source:"Booking.com",
      rating:Number(x.review_score?.value??x.review_score??0)||undefined,
      url:typeof x.url==="string"?x.url:x.url?.web
    })).filter((x:Result)=>x.price>0&&x.price<=budgetNumber);
    setResults(rows);
  };

  const searchPackages=async()=>{
    const r=await fetch("/api/packages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({country:d.name,origin,city,date,nights:nightsNumber,guests:guestsNumber,budget:budgetNumber})});
    const payload=await r.json();
    if(!r.ok) throw new Error(payload.error||"Не удалось выполнить поиск пакетных туров.");
    const packageRows=(payload.result||[])
      .filter((x:any)=>String(x.destinationName||"").trim()===city.trim())
      .map((x:any)=>({
        id:String(x.tourIdentity||x.hotelId),
        title:x.hotelName||("Тур в "+city),
        price:Number(x.price||0),
        meta:city+" · "+String(x.nights||nightsNumber)+" ночей · "+guestsNumber+" чел. · "+(x.hotelCategoryName||""),
        badge:"Реальный тур",
        source:"Travelata",
        rating:x.hotelRating?Number(x.hotelRating):undefined,
        url:x.tourPageUrl||x.searchPageUrl
      }))
      .filter((x:Result)=>x.price>0&&x.price<=budgetNumber);
    setResults(packageRows);
  };

  const runSearch=async()=>{
    if(!budgetNumber){setError("Укажите максимальный бюджет.");return;}
    if(!date){setError("Укажите дату поездки.");return;}
    setError("");setLoading(true);setSearched(true);setResults([]);setFlightContext(null);
    try{
      if(mode==="flights") await searchFlights();
      else if(mode==="hotels") await searchHotels();
      else await searchPackages();
      setTimeout(()=>document.getElementById("results")?.scrollIntoView({behavior:"smooth",block:"start"}),50);
    }catch(e){setError(e instanceof Error?e.message:"Ошибка поиска.");}
    finally{setLoading(false);}
  };

  const sorted=[...results].sort((a,b)=>sort==="price"?a.price-b.price:(b.rating||0)-(a.rating||0));

  return <main>
    <header><div className="wrap nav"><div className="logo">✈ <b>Азия</b>Бюджет</div><nav><a href="#search">Поиск</a><a href="#results">Результаты</a><a href="#how">Как работает</a></nav><a className="navBtn" href="#search">Найти поездку</a></div></header>

    <section className="hero"><div className="wrap heroGrid"><div>
      <small className="eyebrow">БЮДЖЕТНЫЕ ПУТЕШЕСТВИЯ • 2026–2027</small>
      <h1>Таиланд и Вьетнам<br/><em>по разумной цене</em></h1>
      <p>Ищите реальные предложения по пакетным турам, авиабилетам и отелям с учётом даты, количества туристов и максимального бюджета.</p>
      <div className="badges"><span>✓ Реальные API</span><span>✓ Бюджет — фильтр</span><span>✓ Актуальная выдача</span></div>
    </div><div className="heroCard"><small>ВАЖНО</small><div className="pop">🔎 <div><b>Реальный поиск</b><span>Результаты приходят от подключённых поставщиков.</span></div></div><p className="note">Для работы API поставщиков необходимы партнёрские доступы. Ключи хранятся только на сервере Vercel.</p></div></div></section>

    <section className="search" id="search"><div className="wrap"><div className="searchBox">
      <div className="tabs"><button className={mode==="packages"?"active":""} onClick={()=>selectMode("packages")}>🏝 Пакетные туры</button><button className={mode==="flights"?"active":""} onClick={()=>selectMode("flights")}>✈ Авиабилеты</button><button className={mode==="hotels"?"active":""} onClick={()=>selectMode("hotels")}>🏨 Отели</button></div>
      <div className="countries"><button className={country==="thailand"?"active":""} onClick={()=>changeCountry("thailand")}>🇹🇭 Таиланд</button><button className={country==="vietnam"?"active":""} onClick={()=>changeCountry("vietnam")}>🇻🇳 Вьетнам</button></div>
      <div className="fields">
        <label>Откуда<input value={origin} onChange={e=>setOrigin(e.target.value)} placeholder="Москва"/></label>
        <label>Куда<select value={city} onChange={e=>setCity(e.target.value)}>{d.cities.map(c=><option key={c}>{c}</option>)}</select></label>
        <label>Дата<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
        <label>Ночей<select value={nights} onChange={e=>setNights(e.target.value)}><option>7</option><option>10</option><option>12</option><option>14</option><option>21</option></select></label>
        <label>Гости<select value={guests} onChange={e=>setGuests(e.target.value)}><option>1</option><option>2</option><option>3</option><option>4</option></select></label>
        <label>Макс. бюджет<input value={budget} onChange={e=>setBudget(e.target.value)} inputMode="numeric" placeholder="100000"/><span className="fieldHint">руб.</span></label>
        <button className="find" onClick={runSearch} disabled={loading}>{loading?"Ищем…":"Найти →"}</button>
      </div>
      {error&&<div className="formError">⚠ {error}</div>}
    </div></div></section>

    {searched&&<section className="section resultsSection" id="results"><div className="wrap">
      <div className="resultsTop"><div><small className="eyebrow dark">РЕЗУЛЬТАТ ПОИСКА</small><h2>{mode==="flights"?"Авиабилеты":mode==="hotels"?"Отели":"Пакетные туры"}</h2><p>{d.flag} {d.name} · {city} · {origin} · {guestsNumber} чел. · {date} · до {money(budgetNumber)}</p>{mode==="hotels"&&<small>Заезд {date} → выезд {checkout} · {nightsNumber} ночей</small>}</div><div className="sort"><span>Сортировать:</span><button className={sort==="price"?"active":""} onClick={()=>setSort("price")}>по цене</button><button className={sort==="popular"?"active":""} onClick={()=>setSort("popular")}>по рейтингу</button></div></div>

      {loading?<div className="empty">Получаем актуальные предложения от поставщика… Для авиабилетов сбор выдачи может занимать до 30–60 секунд.</div>:sorted.length>0?<div className="resultCards">{sorted.map((r,i)=><article className="resultCard" key={r.id}><div className="resultIcon">{mode==="flights"?"✈":mode==="hotels"?"🏨":"🏝"}</div><div className="resultMain"><div className="resultLine"><span className="resultBadge">{r.badge}</span>{r.rating&&<span className="rating">★ {r.rating}</span>}</div><h3>{r.title}</h3><p>{r.meta}</p><small>{r.source} · вариант {i+1}</small></div><div className="resultPrice"><b>{money(r.price)}</b><span>в пределах бюджета</span>{mode==="flights"&&r.purchase?<button onClick={r.purchase}>Купить →</button>:r.url?<a href={r.url} target="_blank" rel="noreferrer">Забронировать →</a>:null}</div></article>)}</div>:<div className="empty">По выбранным параметрам реальных предложений в бюджете до <b>{money(budgetNumber)}</b> не найдено.</div>}

      {flightContext&&<div className="resultNotice">Поиск авиабилетов выполняется через серверный API. Ссылка на покупку формируется только после нажатия «Купить».</div>}
    </div></section>}

    <section className="section" id="how"><div className="wrap"><small className="eyebrow dark">КАК ЭТО РАБОТАЕТ</small><h2>Поиск реальных предложений</h2><div className="steps"><div><b>01</b><h3>Введите параметры</h3><p>Город вылета, направление, дату, ночи, туристов и максимальный бюджет.</p></div><div><b>02</b><h3>Сайт обращается к API</h3><p>Ключи поставщиков не видны посетителю и используются только серверными маршрутами Next.js.</p></div><div><b>03</b><h3>Получите актуальную выдачу</h3><p>В результатах показываются только предложения, соответствующие установленному бюджету.</p></div></div></div></section>

    <section className="cta"><div className="wrap ctaIn"><div><small className="eyebrow">ГОТОВЫ К ПУТЕШЕСТВИЮ?</small><h2>Начните с вашего бюджета</h2></div><a href="#search">Подобрать поездку →</a></div></section>
    <footer><div className="wrap foot"><div className="logo">✈ <b>Азия</b>Бюджет</div><p>Сервис поиска туристических вариантов. Цены и наличие предоставляются подключёнными поставщиками и должны быть проверены перед покупкой.</p><small>© 2026</small></div></footer>
  </main>;
}
