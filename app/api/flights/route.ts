import {createHash} from "node:crypto";
import {headers} from "next/headers";

export const runtime="nodejs";
export const dynamic="force-dynamic";

function valuesForSignature(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(valuesForSignature);
  if (value && typeof value==="object") {
    return Object.keys(value as Record<string,unknown>).sort().flatMap(k=>valuesForSignature((value as Record<string,unknown>)[k]));
  }
  return [String(value ?? "")];
}

function md5Signature(payload: Record<string,unknown>, apiKey:string){
  const sorted={...payload};
  delete (sorted as Record<string,unknown>).signature;
  return createHash("md5").update([apiKey,...valuesForSignature(sorted)].join(":")).digest("hex");
}

function config(){
  const apiKey=process.env.TRAVELPAYOUTS_API_KEY;
  const marker=process.env.TRAVELPAYOUTS_MARKER;
  if(!apiKey||!marker) throw new Error("Не настроены TRAVELPAYOUTS_API_KEY и TRAVELPAYOUTS_MARKER.");
  return {apiKey,marker};
}

async function clientHeaders(){
  const h=await headers();
  const forwarded=h.get("x-forwarded-for")||h.get("x-real-ip")||"";
  const ip=forwarded.split(",")[0].trim();
  return {
    "Content-Type":"application/json",
    "x-user-ip":ip,
    "x-affiliate-user-id":config().apiKey,
    "Referer":h.get("referer")||"https://asia-budget-travel.vercel.app/",
    "User-Agent":h.get("user-agent")||"Mozilla/5.0"
  };
}

export async function POST(request:Request){
  try{
    const body=await request.json();
    const action=body.action||"start";
    const {apiKey,marker}=config();
    const common=await clientHeaders();

    if(action==="start"){
      const payload={
        marker,
        locale:"ru",
        currency_code:"RUB",
        market_code:"RU",
        search_params:{
          trip_class:"Y",
          passengers:{adults:Number(body.guests)||2,children:0,infants:0},
          directions:[
            {origin:String(body.origin||"Москва"),destination:String(body.destination||""),date:String(body.date)},
            {origin:String(body.destination||""),destination:String(body.origin||"Москва"),date:String(body.returnDate||body.date)}
          ]
        }
      };
      const signature=md5Signature(payload,apiKey);
      const res=await fetch("https://tickets-api.travelpayouts.com/search/affiliate/start",{
        method:"POST",
        headers:{...common,"x-signature":signature},
        body:JSON.stringify({...payload,signature}),
        cache:"no-store"
      });
      const data=await res.json();
      if(!res.ok) return Response.json({error:data?.message||"Ошибка запуска поиска авиабилетов.",details:data},{status:res.status});
      return Response.json(data);
    }

    if(action==="results"){
      const resultsUrl=String(body.resultsUrl||"").replace(/\\/$/,"");
      if(!resultsUrl.startsWith("http")) return Response.json({error:"Некорректный resultsUrl."},{status:400});
      const url=resultsUrl+"/search/affiliate/results";
      const res=await fetch(url,{
        method:"POST",
        headers:common,
        body:JSON.stringify({search_id:String(body.searchId),last_update_timestamp:Number(body.lastUpdateTimestamp)||0}),
        cache:"no-store"
      });
      const data=await res.json();
      if(!res.ok) return Response.json({error:data?.message||"Ошибка получения результатов авиапоиска.",details:data},{status:res.status});
      return Response.json(data);
    }

    if(action==="click"){
      const resultsUrl=String(body.resultsUrl||"").replace(/\\/$/,"");
      const url=resultsUrl+"/searches/"+encodeURIComponent(String(body.searchId))+"/clicks/"+encodeURIComponent(String(body.proposalId));
      const res=await fetch(url,{headers:{"x-affiliate-user-id":apiKey,"marker":marker},cache:"no-store"});
      const data=await res.json();
      if(!res.ok) return Response.json({error:"Не удалось получить ссылку покупки.",details:data},{status:res.status});
      return Response.json(data);
    }

    return Response.json({error:"Неизвестное действие."},{status:400});
  }catch(error){
    return Response.json({error:error instanceof Error?error.message:"Ошибка сервера."},{status:500});
  }
}
