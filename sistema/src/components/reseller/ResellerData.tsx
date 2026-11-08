import { ShieldCheck, Award, Star, MapPin, Truck, Check } from "lucide-react";
import React from "react";

export const WHATSAPP_NUMBER = "5585992753337";
export const WHATSAPP_MESSAGE = encodeURIComponent("Olá! Tenho interesse nos números residenciais em inox. Pode me passar mais informações?");
export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`;

export interface PricingRow {
  qty: string;
  face: string;
  "3d": string;
  highlight?: boolean;
}

export const PRICING_DATA: PricingRow[] = [
  { qty: "10 unidades", face: "R$ 24,00", "3d": "R$ 39,00" },
  { qty: "20 unidades", face: "R$ 23,00", "3d": "R$ 38,00" },
  { qty: "30 unidades", face: "R$ 22,00", "3d": "R$ 37,00" },
  { qty: "40 unidades", face: "R$ 21,00", "3d": "R$ 36,00" },
  { qty: "50+ unidades", face: "R$ 20,00", "3d": "R$ 35,00", highlight: true },
];

export interface Differential {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

export const DIFFERENTIALS_DATA = (IconClass: string): Differential[] => [
  { icon: <ShieldCheck className={IconClass} />, title: "Aço Inox AISI 304", desc: "O padrão ouro em resistência à corrosão e maresia." },
  { icon: <Award className={IconClass} />, title: "Polido Espelhado", desc: "Reflexo cristalino que define o alto padrão da peça." },
  { icon: <Star className={IconClass} />, title: "Legado desde 2011", desc: "Mais de uma década de excelência artesanal." },
  { icon: <MapPin className={IconClass} />, title: "Fábrica em Fortaleza", desc: "Controle total de qualidade e logística eficiente." },
  { icon: <Truck className={IconClass} />, title: "Logística Nacional", desc: "Rede de parceiros para entrega em todo o território." },
  { icon: <Check className={IconClass} />, title: "Fixação Inteligente", desc: "Sistema invisível que valoriza a estética final." },
];

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_DATA: FaqItem[] = [
  {
    question: "Qual o prazo de produção?",
    answer: "Nossa linha de produção opera com precisão artesanal. O prazo médio é de 3 a 5 dias úteis, garantindo que cada peça passe por nosso rigoroso controle de qualidade."
  },
  {
    question: "Como funciona o frete para minha região?",
    answer: "Possuímos parcerias com as principais transportadoras do país. O custo é otimizado via inteligência logística, baseado na cubagem e destino final."
  },
  {
    question: "Quais as formas de pagamento?",
    answer: "Facilitamos sua jornada: PIX com liquidação imediata e desconto, ou cartões de crédito em até 12x para otimizar seu fluxo de caixa."
  },
  {
    question: "O material resiste a ambientes litorâneos?",
    answer: "Absolutamente. O AISI 304 é especificamente escolhido por sua composição rica em Cromo e Níquel, imune à ação da salinidade."
  }
];

export const FADE_IN_VARIANTS = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.8, ease: [0.21, 0.45, 0.32, 0.9] }
} as const;
