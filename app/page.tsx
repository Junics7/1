"use client";

import {useMemo, useState} from "react";

type Country="thailand"|"vietnam";
type Mode="packages"|"flights"|"hotels";

const data={
  thailand:{name:"Таиланд",flag:"🇹🇭",cities:["Пхукет","Паттайя","Бангкок","Самуи","Краби"]},
  vietnam:{name:"Вьетнам",flag:"🇻🇳",cities:["Нячанг","Фукуок","Дананг","Хошимин","Ханой"]}
};

const deals=[
  ["thailand","Пхукет","10 ночей",64000],
  ["thailand","Паттайя","9 ночей",52000],
  ["vietnam","Нячанг","10 ночей",57000],
  ["vietnam","Фукуок","10 ночей",69000]
] as const;

const money=(n:number)=>new Intl.NumberFormat("ru-RU").format(n)+" ₽";

function addDays(date:string, days:number){
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

  const d=data[country];
  const budgetNumber=Number(budget.replace(/\D/g,""))||0;
  const nightsNumber=Number(nights)||10;
  const guestsNumber=Number(guests)||2;
  const checkout=addDays(date,nightsNumber);

  const changeCountry=(c:Country)=>{
    setCountry(c);
    setCity(data[c].cities[0]);
    setSearched(false);
  };

  const flight=useMemo(()=>(
    "https://www.google.com/travel/flights?q="+encodeURIComponent(
      "Flights from "+origin+" to "+city+", "+d.name+
      (date?" on "+date:"")+
      " "+guestsNumber+" passengers"+
      (budgetNumber?" budget up to "+budgetNumber+" RUB":"")
    )
  ),[origin,city,d.name,date,guestsNumber,budgetNumber]);

  const hotel=useMemo(()=>(
    "https://www.booking.com/searchresults.html?ss="+encodeURIComponent(city+", "+d.name)+
    (date?"&checkin="+date:"")+
    (checkout?"&checkout="+checkout:"")+
    "&group_adults="+guestsNumber+
    "&no_rooms=1"+
    "&selected_currency=RUB"
  ),[city,d.name,date,checkout,guestsNumber]);

  const tour=useMemo(()=>(
    "https://www.google.com/search?q="+encodeURIComponent(
      "тур "+d.name+" "+city+" из "+origin+
      " "+nightsNumber+" ночей "+guestsNumber+" чел."+
      (date?" дата "+date:"")+
      (budgetNumber?" бюджет до "+budgetNumber+" рублей":"")
    )
  ),[d.name,city,origin,nightsNumber,guestsNumber,date,budgetNumber]);

  const visibleDeals=deals.filter(x=>x[0]===country && (!budgetNumber || x[3]<=budgetNumber));

  const runSearch=()=>{
    if(!budgetNumber){
      setError("Укажите максимальный бюджет.");
      setSearched(false);
      return;
    }
    if(mode!=="packages" && !date){
      setError("Укажите дату поездки.");
      setSearched(false);
      return;
    }
    setError("");
    setSearched(true);
  };

  const resultUrl=mode==="flights"?flight:mode==="hotels"?hotel:tour;
  const resultTitle=mode==="flights"?"Авиабилеты":mode==="hotels"?"Отели":"Пакетные туры";

  return <main>
    <header><div className="wrap nav">
      <div className="logo">✈ <b>Азия</b>Бюджет</div>
      <nav><a href="#search">Поиск</a><a href="#deals">Варианты</a><a href="#how">Как работает</a></nav>
      <a className="navBtn" href="#search">Найти поездку</a>
    </div></header>

    <section className="hero"><div className="wrap heroGrid"><div>
      <small className="eyebrow">БЮДЖЕТНЫЕ ПУТЕШЕСТВИЯ • 2026–2027</small>
      <h1>Таиланд и Вьетнам<br/><em>по разумной цене</em></h1>
      <p>Пакетные туры, отдельные перелёты и отели — с поиском по городу вылета, датам, гостям и максимальному бюджету.</p>
      <div className="badges"><span>✓ Без комиссии за поиск</span><span>✓ Гибкие даты</span><span>✓ Бюджет учитывается</span></div>
    </div><div className="heroCard">
      <small>ПОПУЛЯРНЫЕ НАПРАВЛЕНИЯ</small>
      <div className="pop">🇹🇭 <div><b>Таиланд</b><span>Пхукет • Паттайя • Самуи</span></div><strong>от 52 000 ₽</strong></div>
      <div className="pop">🇻🇳 <div><b>Вьетнам</b><span>Нячанг • Фукуок • Дананг</span></div><strong>от 57 000 ₽</strong></div>
      <p className="note">Цены карточек — ориентиры. Актуальные предложения открываются у поставщика.</p>
    </div></div></section>

    <section className="search" id="search"><div className="wrap"><div className="searchBox">
      <div className="tabs">
        <button className={mode==="packages"?"active":""} onClick={()=>{setMode("packages");setSearched(false);setError("")}}>🏝 Пакетные туры</button>
        <button className={mode==="flights"?"active":""} onClick={()=>{setMode("flights");setSearched(false);setError("")}}>✈ Авиабилеты</button>
        <button className={mode==="hotels"?"active":""} onClick={()=>{setMode("hotels");setSearched(false);setError("")}}>🏨 Отели</button>
      </div>

      <div className="countries">
        <button className={country==="thailand"?"active":""} onClick={()=>changeCountry("thailand")}>🇹🇭 Таиланд</button>
        <button className={country==="vietnam"?"active":""} onClick={()=>changeCountry("vietnam")}>🇻🇳 Вьетнам</button>
      </div>

      <div className="fields">
        <label>Откуда<input value={origin} onChange={e=>setOrigin(e.target.value)} placeholder="Москва"/></label>
        <label>Куда<select value={city} onChange={e=>setCity(e.target.value)}>{d.cities.map(c=><option key={c}>{c}</option>)}</select></label>
        <label>Дата<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
        {mode!=="flights"&&<label>Ночей<select value={nights} onChange={e=>setNights(e.target.value)}><option>7</option><option>10</option><option>12</option><option>14</option><option>21</option></select></label>}
        {mode!=="hotels"&&<label>Гости<select value={guests} onChange={e=>setGuests(e.target.value)}><option>1</option><option>2</option><option>3</option><option>4</option></select></label>}
        {mode==="hotels"&&<label>Гости<select value={guests} onChange={e=>setGuests(e.target.value)}><option>1</option><option>2</option><option>3</option><option>4</option></select></label>}
        <label>Макс. бюджет<input value={budget} onChange={e=>setBudget(e.target.value)} inputMode="numeric" placeholder="100000"/> <span className="fieldHint">руб.</span></label>
        <button className="find" onClick={runSearch}>Найти →</button>
      </div>

      {error&&<div className="formError">⚠ {error}</div>}

      {searched&&<div className="result">
        <div><b>{resultTitle}: параметры сформированы</b>
          <span>{d.flag} {d.name} · {city} · {origin} · {guestsNumber} чел. · до {money(budgetNumber)}{date?" · "+date:""}</span>
          {mode==="hotels"&&date&&<small>Заезд {date} → выезд {checkout} · {nightsNumber} ночей</small>}
        </div>
        <a target="_blank" rel="noreferrer" href={resultUrl}>Открыть предложения →</a>
      </div>}
    </div></div></section>

    <section className="section" id="deals"><div className="wrap">
      <div className="head"><div><small className="eyebrow dark">ИДЕИ ДЛЯ ПОЕЗДКИ</small><h2>Варианты в вашем бюджете</h2></div>
      <p>Карточки ниже используют заданный максимальный бюджет. Цены являются демонстрационными ориентирами, а актуальную стоимость проверяет внешний поставщик.</p></div>

      {visibleDeals.length>0?<div className="cards">{visibleDeals.map((x,i)=><article className="card" key={x[1]}>
        <div className={"visual v"+i}><span>{country==="thailand"?"🇹🇭":"🇻🇳"}</span><small>от {money(x[3])}</small></div>
        <div className="body"><div className="row"><h3>{x[1]}</h3><span>{x[2]}</span></div>
          <p>перелёт + отель · {guestsNumber} чел. · в пределах бюджета</p>
          <div className="bottom"><b>{money(x[3])}</b>
            <button onClick={()=>{setCity(x[1]);setMode("packages");document.getElementById("search")?.scrollIntoView({behavior:"smooth"})}}>Подобрать →</button>
          </div>
        </div>
      </article>)}</div>:<div className="empty">По демонстрационным вариантам в бюджете до <b>{money(budgetNumber)}</b> ничего не найдено. Увеличьте бюджет или проверьте внешний поиск.</div>}
    </div></section>

    <section className="section light" id="how"><div className="wrap">
      <small className="eyebrow dark">ТРИ СПОСОБА</small><h2>Как найти дешевле</h2>
      <div className="steps">
        <div><b>01</b><h3>Сначала пакетный тур</h3><p>Проверьте стоимость перелёта и отеля вместе — иногда пакет оказывается выгоднее.</p></div>
        <div><b>02</b><h3>Затем авиабилеты</h3><p>Сравните даты и направления с учётом вашего максимального бюджета.</p></div>
        <div><b>03</b><h3>Потом отель</h3><p>Дата выезда автоматически рассчитывается из даты заезда и количества ночей.</p></div>
      </div>
    </div></section>

    <section className="cta"><div className="wrap ctaIn"><div><small className="eyebrow">ГОТОВЫ К ПУТЕШЕСТВИЮ?</small><h2>Начните с вашего бюджета</h2></div><a href="#search">Подобрать поездку →</a></div></section>
    <footer><div className="wrap foot"><div className="logo">✈ <b>Азия</b>Бюджет</div><p>Сервис поиска и сравнения туристических вариантов. Цены и наличие уточняются на сайтах поставщиков.</p><small>© 2026</small></div></footer>
  </main>;
}
