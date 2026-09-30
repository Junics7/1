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

export async function POST(request:Request){
  try{
    const login=process.env.TRAVELATA_LOGIN;
    const password=process.env.TRAVELATA_PASSWORD;
    if(!login||!password) return Response.json({error:"Не настроены TRAVELATA_LOGIN и TRAVELATA_PASSWORD."},{status:503});

    const body=await request.json();
    const countryName=String(body.country||"");
    const departureName=String(body.origin||"Москва");
    const city=String(body.city||"");
    const date=String(body.date||"");
    const nights=Number(body.nights)||10;
    const guests=Math.max(1,Number(body.guests)||2);
    const budget=Math.max(0,Number(body.budget)||0);

    const [countriesRes,departuresRes,resortsRes]=await Promise.all([
      travelata("/directory/countries",login,password),
      travelata("/directory/departureCities",login,password),
      travelata("/directory/resorts?limit=1000",login,password)
    ]);
    const [countries,departures,resorts]=await Promise.all([countriesRes.json(),departuresRes.json(),resortsRes.json()]);
    if(!countriesRes.ok||!departuresRes.ok||!resortsRes.ok) return Response.json({error:"Travelata не вернула справочники.",details:{countries,departures,resorts}},{status:502});

    const country=(countries.result||[]).find((x:any)=>x.name===countryName&&!x.disabled);
    const departure=(departures.result||[]).find((x:any)=>x.name===departureName&&!x.disabled);
    const resort=(resorts.result||[]).find((x:any)=>x.name===city&&x.country===country?.id&&!x.disabled);

    if(!country||!departure) return Response.json({error:"Не удалось определить страну или город вылета в Travelata.",countryFound:!!country,departureFound:!!departure},{status:422});

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
    if(resort) params.append("resorts[]",String(resort.id));

    const res=await travelata("/statistic/cheapestTours?"+params.toString(),login,password);
    const data=await res.json();
    if(!res.ok) return Response.json({error:"Travelata вернула ошибку поиска туров.",details:data},{status:res.status});

    const rows=(data.result||[]).filter((x:any)=>!budget||Number(x.price)<=budget);
    return Response.json({success:data.success,result:rows});
  }catch(error){
    return Response.json({error:error instanceof Error?error.message:"Ошибка сервера."},{status:500});
  }
}
