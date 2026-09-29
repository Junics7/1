"use client";

import {useMemo, useState} from "react";

type Country="thailand"|"vietnam";
type Mode="packages"|"flights"|"hotels";
type Sort="price"|"popular";

const data={
  thailand:{name:"Таиланд",flag:"🇹🇭",cities:["Пхукет","Паттайя","Бангкок","Самуи","Краби"]},
  vietnam:{name:"Вьетнам",flag:"🇻🇳",cities:["Нячанг","Фукуок","Дананг","Хошимин","Ханой"]}
};

const packageOffers=[
  {country:"thailand",city:"Пхукет",nights:10,price:64000,source:"Поиск туров"},
  {country:"thailand",city:"Паттайя",nights:9,price:52000,source:"Поиск туров"},
  {country:"thailand",city:"Бангкок",nights:7,price:49000,source:"Поиск туров"},
  {country:"thailand",city:"Самуи",nights:10,price:76000,source:"Поиск туров"},
  {country:"vietnam",city:"Нячанг",nights:10,price:57000,source:"Поиск туров"},
  {country:"vietnam",city:"Фукуок",nights:10,price:69000,source:"Поиск туров"},
  {country:"vietnam",city:"Дананг",nights:9,price:61000,source:"Поиск туров"},
  {country:"vietnam",city:"Хошимин",nights:7,price:53000,source:"Поиск туров"}
] as const;

const flightOffers=[
  {country:"thailand",city:"Пхукет",price:42000,airline:"Авиапоиск",source:"Google Flights"},
  {country:"thailand",city:"Паттайя",price:45500,airline:"Авиапоиск",source:"Google Flights"},
  {country:"thailand",city:"Бангкок",price:38000,airline:"Авиапоиск",source:"Google Flights"},
  {country:"thailand",city:"Самуи",price:51000,airline:"Авиапоиск",source:"Google Flights"},
  {country:"vietnam",city:"Нячанг",price:41000,airline:"Авиапоиск",source:"Google Flights"},
  {country:"vietnam",city:"Фукуок",price:44000,airline:"Авиапоиск",source:"Google Flights"},
  {country:"vietnam",city:"Дананг",price:43000,airline:"Авиапоиск",source:"Google Flights"},
  {country:"vietnam",city:"Хошимин",price:36000,airline:"Авиапоиск",source:"Google Flights"}
] as const;

const hotelOffers=[
  {country:"thailand",city:"Пхукет",price:3900,rating:8.7,name:"Отели Пхукета"},
  {country:"thailand",city:"Паттайя",price:2900,rating:8.5,name:"Отели Паттайи"},
  {country:"thailand",city:"Бангкок",price:3200,rating:8.6,name:"Отели Бангкока"},
  {country:"thailand",city:"Самуи",price:4700,rating:8.8,name:"Отели Самуи"},
  {country:"vietnam",city:"Нячанг",price:2500,rating:8.8,name:"Отели Нячанга"},
  {country:"vietnam",city:"Фукуок",price:3600,rating:8.9,name:"Отели Фукуока"},
  {country:"vietnam",city:"Дананг",price:2700,rating:8.7,name:"Отели Дананга"},
  {country:"vietnam",city:"Хошимина",price:2400,rating:8.6,name:"Отели Хошимина"}
] as const;

const money=(n:number)=>new Intl.NumberFormat("ru-RU").format(Math.round(n))+" ₽";

function addDays(date:string,days:number){
  if(!date) return "";
  const d=new Date(date+"T12:00:00");
  d.setDate(d.getDate()+days);
  return d.toISOString().slice(0,10);
}

export default function Home(){
  const [mode,setMode]=useState<Mode>("packages");
  const [country,setCountry]=useState<Country>("thailand");
  const [origin,setOrigin]=useState("Москва");
  const [city,setCity]=useState("Пхукет");
  const [date,setDate]=useState("");
  const [nights,setNights]=useState("10");
  const [guests,setGuests]=useState("2");
  const [budget,setBudget]=useState("100000");
  const [searched,setSearched]=useState(false);
  const [error,setError]=useState("");
  const [sort,setSort]=useState<Sort>("price");

  const d=data[country];
  const budgetNumber=Number(budget.replace(/\D/g,""))||0;
  const nightsNumber=Number(nights)||10;
  const guestsNumber=Number(guests)||2;
  const checkout=addDays(date,nightsNumber);

  const changeCountry=(c:Country)=>{
    setCountry(c);
    setCity(data[c].cities[0]);
    setSearched(false);
    setError("");
  };

  const flightUrl=useMemo(()=>(
    "https://www.google.com/travel/flights?q="+encodeURIComponent(
      "Flights from "+origin+" to "+city+", "+d.name+
      (date?" on "+date:"")+
      " "+guestsNumber+" passengers"+
      (budgetNumber?" budget up to "+budgetNumber+" RUB":"")
    )
  ),[origin,city,d.name,date,guestsNumber,budgetNumber]);

  const hotelUrl=useMemo(()=>(
    "https://www.booking.com/searchresults.html?ss="+encodeURIComponent(city+", "+d.name)+
    (date?"&checkin="+date:"")+
    (checkout?"&checkout="+checkout:"")+
    "&group_adults="+guestsNumber+
    "&no_rooms=1"+
    "&selected_currency=RUB"
  ),[city,d.name,date,checkout,guestsNumber]);

  const tourUrl=useMemo(()=>(
    "https://www.google.com/search?q="+encodeURIComponent(
      "тур "+d.name+" "+city+" из "+origin+
      " "+nightsNumber+" ночей "+guestsNumber+" чел."+
      (date?" дата "+date:"")+
      (budgetNumber?" бюджет до "+budgetNumber+" рублей":"")
    )
  ),[d.name,city,origin,nightsNumber,guestsNumber,date,budgetNumber]);

  const results=useMemo(()=>{
    if(!searched) return [];
    if(mode==="packages"){
      return packageOffers
        .filter(x=>x.country===country && x.price<=budgetNumber)
        .map(x=>({
          id:x.city,title:x.city,price:x.price,meta:x.nights+" ночей · "+guestsNumber+" чел.",
          badge:"Пакетный тур",source:x.source,url:
            "https://www.google.com/search?q="+encodeURIComponent(
              "тур "+d.name+" "+x.city+" из "+origin+" "+x.nights+" ночей "+
              guestsNumber+" чел. бюджет до "+budgetNumber+" рублей"
            )
        }))
        .sort((a,b)=>sort==="price"?a.price-b.price:0);
    }
    if(mode==="flights"){
      return flightOffers
        .filter(x=>x.country===country && x.city===city && x.price<=budgetNumber)
        .map(x=>({
          id:x.city,title:"Перелёт "+origin+" → "+x.city,price:x.price,
          meta:"туда и обратно · "+guestsNumber+" чел.",
          badge:"Авиабилеты",source:x.source,url:flightUrl
        }))
        .sort((a,b)=>sort==="price"?a.price-b.price:0);
    }
    return hotelOffers
      .filter(x=>x.country===country && x.city===city && x.price*nightsNumber<=budgetNumber)
      .map(x=>({
        id:x.city,title:x.name,price:x.price*nightsNumber,
        meta:x.price+" ₽/ночь · "+nightsNumber+" ночей · "+guestsNumber+" чел.",
        badge:"Отель",source:"Booking.com",rating:x.rating,url:hotelUrl
      }))
      .sort((a,b)=>sort==="price"?a.price-b.price:0);
  },[searched,mode,country,city,budgetNumber,guestsNumber,nightsNumber,sort,d.name,origin,flightUrl,hotelUrl]);

  const runSearch=()=>{
    if(!budgetNumber){
      setError("Укажите максимальный бюджет.");
      setSearched(false);
      return;
    }
    if(!city){
      setError("Выберите направление.");
      setSearched(false);
      return;
    }
    if(!date){
      setError("Укажите дату поездки.");
      setSearched(false);
      return;
    }
    setError("");
    setSearched(true);
    document.getElementById("results")?.scrollIntoView({behavior:"smooth",block:"start"});
  };

  const resultTitle=mode==="flights"?"Авиабилеты":mode==="hotels"?"Отели":"Пакетные туры";

  const selectMode=(m:Mode)=>{
    setMode(m);
    setSearched(false);
    setError("");
  };

  return <main>
    <header><div className="wrap nav">
      <div className="logo">✈ <b>Азия</b>Бюджет</div>
      <nav><a href="#search">Поиск</a><a href="#results">Результаты</a><a href="#how">Как работает</a></nav>
      <a className="navBtn" href="#search">Найти поездку</a>
    </div></header>

    <section className="hero"><div className="wrap heroGrid"><div>
      <small className="eyebrow">БЮДЖЕТНЫЕ ПУТЕШЕСТВИЯ • 2026–2027</small>
      <h1>Таиланд и Вьетнам<br/><em>по разумной цене</em></h1>
      <p>Пакетные туры, отдельные перелёты и отели — с поиском по городу вылета, датам, гостям и максимальному бюджету.</p>
      <div className="badges"><span>✓ Бюджет учитывается</span><span>✓ Дата и ночи</span><span>✓ Сортировка по цене</span></div>
    </div><div className="heroCard">
      <small>ПОПУЛЯРНЫЕ НАПРАВЛЕНИЯ</small>
      <div className="pop">🇹🇭 <div><b>Таиланд</b><span>Пхукет • Паттайя • Самуи</span></div><strong>от 52 000 ₽</strong></div>
      <div className="pop">🇻🇳 <div><b>Вьетнам</b><span>Нячанг • Фукуок • Дананг</span></div><strong>от 57 000 ₽</strong></div>
      <p className="note">Карточки показывают ориентиры. Актуальная цена открывается у поставщика.</p>
    </div></div></section>

    <section className="search" id="search"><div className="wrap"><div className="searchBox">
      <div className="tabs">
        <button className={mode==="packages"?"active":""} onClick={()=>selectMode("packages")}>🏝 Пакетные туры</button>
        <button className={mode==="flights"?"active":""} onClick={()=>selectMode("flights")}>✈ Авиабилеты</button>
        <button className={mode==="hotels"?"active":""} onClick={()=>selectMode("hotels")}>🏨 Отели</button>
      </div>

      <div className="countries">
        <button className={country==="thailand"?"active":""} onClick={()=>changeCountry("thailand")}>🇹🇭 Таиланд</button>
        <button className={country==="vietnam"?"active":""} onClick={()=>changeCountry("vietnam")}>🇻🇳 Вьетнам</button>
      </div>

      <div className="fields">
        <label>Откуда<input value={origin} onChange={e=>setOrigin(e.target.value)} placeholder="Москва"/></label>
        <label>Куда<select value={city} onChange={e=>setCity(e.target.value)}>{d.cities.map(c=><option key={c}>{c}</option>)}</select></label>
        <label>Дата<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
        <label>Ночей<select value={nights} onChange={e=>setNights(e.target.value)}><option>7</option><option>10</option><option>12</option><option>14</option><option>21</option></select></label>
        <label>Гости<select value={guests} onChange={e=>setGuests(e.target.value)}><option>1</option><option>2</option><option>3</option><option>4</option></select></label>
        <label>Макс. бюджет<input value={budget} onChange={e=>setBudget(e.target.value)} inputMode="numeric" placeholder="100000"/> <span className="fieldHint">руб.</span></label>
        <button className="find" onClick={runSearch}>Найти →</button>
      </div>

      {error&&<div className="formError">⚠ {error}</div>}
    </div></div></section>

    {searched&&<section className="section resultsSection" id="results"><div className="wrap">
      <div className="resultsTop">
        <div><small className="eyebrow dark">РЕЗУЛЬТАТ ПОИСКА</small><h2>{resultTitle}</h2>
          <p>{d.flag} {d.name} · {city} · {origin} · {guestsNumber} чел. · {date} · до {money(budgetNumber)}</p>
          {mode==="hotels"&&<small>Заезд {date} → выезд {checkout} · {nightsNumber} ночей</small>}
        </div>
        <div className="sort"><span>Сортировать:</span><button className={sort==="price"?"active":""} onClick={()=>setSort("price")}>по цене</button><button className={sort==="popular"?"active":""} onClick={()=>setSort("popular")}>популярные</button></div>
      </div>

      {results.length>0?<div className="resultCards">{results.map((r,i)=><article className="resultCard" key={r.id}>
        <div className="resultIcon">{mode==="flights"?"✈":mode==="hotels"?"🏨":"🏝"}</div>
        <div className="resultMain"><div className="resultLine"><span className="resultBadge">{r.badge}</span>{r.rating&&<span className="rating">★ {r.rating}</span>}</div>
          <h3>{r.title}</h3><p>{r.meta}</p><small>{r.source} · вариант {i+1}</small>
        </div>
        <div className="resultPrice"><b>{money(r.price)}</b><span>в пределах бюджета</span><a href={r.url} target="_blank" rel="noreferrer">Открыть →</a></div>
      </article>)}</div>:<div className="empty">По выбранным параметрам вариантов в бюджете до <b>{money(budgetNumber)}</b> не найдено. Попробуйте увеличить бюджет, изменить дату или направление.</div>}

      <div className="resultNotice">Важно: эти карточки являются ориентировочным слоем поиска. Фактическая цена, наличие, багаж, условия отмены и состав тура проверяются на сайте поставщика перед покупкой.</div>
    </div></section>}

    <section className="section" id="how"><div className="wrap">
      <small className="eyebrow dark">ТРИ СПОСОБА</small><h2>Как найти дешевле</h2>
      <div className="steps">
        <div><b>01</b><h3>Сначала пакетный тур</h3><p>Сравните стоимость перелёта и отеля вместе — пакет иногда оказывается выгоднее.</p></div>
        <div><b>02</b><h3>Затем авиабилеты</h3><p>Проверьте перелёт отдельно с тем же городом вылета, датой и бюджетом.</p></div>
        <div><b>03</b><h3>Потом отель</h3><p>Дата выезда автоматически рассчитывается из даты заезда и количества ночей.</p></div>
      </div>
    </div></section>

    <section className="cta"><div className="wrap ctaIn"><div><small className="eyebrow">ГОТОВЫ К ПУТЕШЕСТВИЮ?</small><h2>Начните с вашего бюджета</h2></div><a href="#search">Подобрать поездку →</a></div></section>
    <footer><div className="wrap foot"><div className="logo">✈ <b>Азия</b>Бюджет</div><p>Сервис поиска и сравнения туристических вариантов. Цены и наличие уточняются на сайтах поставщиков.</p><small>© 2026</small></div></footer>
  </main>;
}
