import {headers} from "next/headers";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(request:Request){
  try{
    const apiKey=process.env.BOOKING_API_KEY;
    const affiliateId=process.env.BOOKING_AFFILIATE_ID;
    if(!apiKey||!affiliateId) return Response.json({error:"Не настроены BOOKING_API_KEY и BOOKING_AFFILIATE_ID."},{status:503});

    const body=await request.json();
    const city=String(body.city||"");
    const country=String(body.country||"").toLowerCase()==="таиланд"?"th":String(body.country||"").toLowerCase()==="вьетнам"?"vn":"ru";
    const checkin=String(body.checkin||"");
    const checkout=String(body.checkout||"");
    const adults=Math.max(1,Number(body.guests)||2);
    const budget=Math.max(0,Number(body.budget)||0);

    const requestBody={
      booker:{country,platform:"desktop"},
      checkin,checkout,
      guests:{number_of_adults:adults,number_of_rooms:1},
      search_query:city,
      extras:["products","extra_charges"],
      rows:100,
      sort:{by:"price",direction:"ascending"}
    };

    const h=await headers();
    const res=await fetch("https://demandapi.booking.com/3.2/accommodations/smart-search",{
      method:"POST",
      headers:{
        "Authorization":"Bearer "+apiKey,
        "X-Affiliate-Id":affiliateId,
        "Content-Type":"application/json",
        "Accept":"application/json",
        "User-Agent":h.get("user-agent")||"AsiaBudgetTravel/1.0"
      },
      body:JSON.stringify(requestBody),
      cache:"no-store"
    });
    const data=await res.json();
    if(!res.ok) return Response.json({error:"Booking API вернул ошибку.",details:data},{status:res.status});

    const rows=Array.isArray(data?.data)?data.data:[];
    const filtered=budget?rows.filter((x:any)=>{
      const total=Number(x?.price?.total??x?.price?.book??x?.price?.base??0);
      return !total||total<=budget;
    }):rows;

    return Response.json({request_id:data.request_id,data:filtered,metadata:data.metadata});
  }catch(error){
    return Response.json({error:error instanceof Error?error.message:"Ошибка сервера."},{status:500});
  }
}
