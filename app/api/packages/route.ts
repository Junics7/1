export const runtime="nodejs";
export const dynamic="force-dynamic";

const base="https://api-gateway.travelata.ru/partners";

async function travelata(path:string,login:string,password:string){
  return fetch(base+path,{
    headers:{
      Authorization:"Basic "+Buffer.from(login+":"+password).toString("base64"),
      Accept:"application/json"
    },
    cache:"no-store"
  });
}

function norm(value:string){
  return value
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g,"е")
    .replace(/[^a-zа-я0-9]+/gi,"")
    .trim();
}

export async function POST(request:Request){
  try{
    const login=process.env.TRAVELATA_LOGIN;
    const password=process.env.TRAVELATA_PASSWORD;
    if(!login||!password){
      return Response.json(
        {error:"Не настроены TRAVELATA_LOGIN и TRAVELATA_PASSWORD."},
        {status:503}
      );
    }

    const body=await request.json();
    const countryName=String(body.country||"");
    const departureName=String(body.origin||"Москва");
    const city=String(body.city||"");
    const date=String(body.date||"");
    const nights=Number(body.nights)||10;
    const guests=Math.max(1,Number(body.guests)||2);
    const budget=Math.max(0,Number(body.budget)||0);

    if(!date){
      return Response.json({error:"Не указана дата поездки."},{status:422});
    }

    const [countriesRes,departuresRes,resortsRes]=await Promise.all([
      travelata("/directory/countries",login,password),
      travelata("/directory/departureCities",login,password),
      travelata("/directory/resorts?limit=1000",login,password)
    ]);

    const [countries,departures,resorts]=await Promise.all([
      countriesRes.json(),
      departuresRes.json(),
      resortsRes.json()
    ]);

    if(!countriesRes.ok||!departuresRes.ok||!resortsRes.ok){
      return Response.json(
        {error:"Travelata не вернула справочники.",details:{countries,departures,resorts}},
        {status:502}
      );
    }

    const country=(countries.result||[]).find(
      (x:any)=>norm(String(x.name||""))===norm(countryName)&&!x.disabled
    );
    const departure=(departures.result||[]).find(
      (x:any)=>norm(String(x.name||""))===norm(departureName)&&!x.disabled
    );

    if(!country||!departure){
      return Response.json({
        error:"Не удалось определить страну или город вылета в Travelata.",
        countryFound:!!country,
        departureFound:!!departure
      },{status:422});
    }

    const countryId=Number(country.id);
    const resortsForCountry=(resorts.result||[]).filter(
      (x:any)=>Number(x.country)===countryId&&!x.disabled
    );
    const resort=resortsForCountry.find(
      (x:any)=>norm(String(x.name||""))===norm(city)
    );

    // Никогда не выполняем поиск по всей стране, если пользователь выбрал конкретный город.
    // Иначе в выдачу могут попасть, например, Самуи при поиске Бангкока.
    if(!resort){
      const suggestions=resortsForCountry
        .filter((x:any)=>norm(String(x.name||"")).includes(norm(city))||norm(city).includes(norm(String(x.name||""))))
        .slice(0,5)
        .map((x:any)=>({id:x.id,name:x.name}));

      return Response.json({
        error:"Выбранный город назначения не найден в справочнике Travelata. Поиск по другой локации не выполнялся.",
        city,
        country:countryName,
        suggestions
      },{status:422});
    }

    const params=new URLSearchParams();
    params.append("countries[]",String(country.id));
    params.set("departureCity",String(departure.id));
    params.set("touristGroup[adults]",String(guests));
    params.set("touristGroup[kids]","0");
    params.set("touristGroup[infants]","0");
    params.set("checkInDateRange[from]",date);
    params.set("checkInDateRange[to]",date);
    params.set("nightRange[from]",String(nights));
    params.set("nightRange[to]",String(nights));
    params.append("resorts[]",String(resort.id));

    const res=await travelata("/statistic/cheapestTours?"+params.toString(),login,password);
    const data=await res.json();

    if(!res.ok){
      return Response.json(
        {error:"Travelata вернула ошибку поиска туров.",details:data},
        {status:res.status}
      );
    }

    const rows=(data.result||[])
      .filter((x:any)=>Number(x.resortId)===Number(resort.id))
      .filter((x:any)=>Number(x.price)>0&&(!budget||Number(x.price)<=budget))
      .sort((a:any,b:any)=>Number(a.price)-Number(b.price))
      .map((x:any)=>({
        ...x,
        destinationName:resort.name
      }));

    return Response.json({
      success:data.success,
      destination:{id:resort.id,name:resort.name},
      result:rows
    });
  }catch(error){
    return Response.json(
      {error:error instanceof Error?error.message:"Ошибка сервера."},
      {status:500}
    );
  }
}
