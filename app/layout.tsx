import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"Азия Бюджет — туры в Таиланд и Вьетнам",description:"Поиск бюджетных туров, авиабилетов и отелей в Таиланде и Вьетнаме."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ru"><body>{children}</body></html>}