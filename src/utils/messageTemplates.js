// 返信テンプレート（相手の言語 + 日本語訳）

const TEMPLATES = {
  inventory: {
    en: `Thank you for your message.
This item is currently available.
Please note that stock status may change, so we recommend purchasing soon if you are interested.`,
    es: `Gracias por su mensaje.
Este artículo está disponible actualmente.
Tenga en cuenta que el stock puede cambiar, por lo que recomendamos comprar pronto si está interesado.`,
    ja: `お問い合わせありがとうございます。
こちらの商品は現在ご購入いただけます。
在庫は変動する場合がありますので、ご希望の際はお早めのご購入をおすすめいたします。`,
  },
  shipping_schedule: {
    en: `Thank you for your message.
We plan to ship within {{handling_days}} business days after payment confirmation.
Once shipped, we will upload the tracking number to eBay.`,
    es: `Gracias por su mensaje.
Planeamos enviar dentro de {{handling_days}} días hábiles después de confirmar el pago.
Una vez enviado, subiremos el número de seguimiento a eBay.`,
    ja: `お問い合わせありがとうございます。
お支払い確認後、{{handling_days}}営業日以内の発送を予定しています。
発送後、追跡番号をeBayに登録いたします。`,
  },
  tracking: {
    en: `Thank you for your message.
If your order has already been shipped, the tracking number should be available on eBay in your order details.
If you do not see it yet, we are checking and will update you shortly.`,
    es: `Gracias por su mensaje.
Si su pedido ya fue enviado, el número de seguimiento debería estar en los detalles del pedido en eBay.
Si aún no lo ve, lo estamos verificando y le informaremos pronto.`,
    ja: `お問い合わせありがとうございます。
発送済みの場合、追跡番号はeBayの注文詳細に表示されます。
まだ表示されない場合は確認中ですので、少々お待ちください。`,
  },
  customs: {
    en: `Thank you for your message.
Import duties, taxes, and customs fees may be charged by your country.
These fees are usually the buyer's responsibility and are not included in the item price or shipping cost.
Please check with your local customs office for details.`,
    es: `Gracias por su mensaje.
Su país puede cobrar aranceles, impuestos y tasas de aduana.
Estos gastos suelen ser responsabilidad del comprador y no están incluidos en el precio ni en el envío.
Consulte su oficina de aduanas local para más detalles.`,
    ja: `お問い合わせありがとうございます。
お住まいの国で関税・輸入税等がかかる場合があります。
これらは通常バイヤー負担で、商品代金・送料には含まれません。
詳細は各国の税関にお問い合わせください。`,
  },
  high_risk_placeholder: {
    en: `Thank you for your message.
We are reviewing your request carefully and will reply shortly.
Thank you for your patience.`,
    es: `Gracias por su mensaje.
Estamos revisando su solicitud con atención y responderemos pronto.
Gracias por su paciencia.`,
    ja: `お問い合わせありがとうございます。
内容を確認しております。追ってご連絡いたします。
少々お時間をいただけますと幸いです。`,
  },
};

function pickLang(language) {
  if (language === "es") return "es";
  if (language === "ja") return "ja";
  return "en";
}

function fillVars(text, vars) {
  let out = text;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, String(value));
  }
  return out;
}

export function buildTemplateReply(intent, language, options = {}) {
  const lang = pickLang(language);
  const vars = { handling_days: options.handlingDays ?? 3 };

  if (["cancel", "return_refund", "damage", "claim"].includes(intent)) {
    return {
      draftOriginal: TEMPLATES.high_risk_placeholder[lang],
      draftJapanese: TEMPLATES.high_risk_placeholder.ja,
      usedTemplate: "high_risk_placeholder",
    };
  }

  const pack = TEMPLATES[intent];
  if (!pack) {
    return {
      draftOriginal: TEMPLATES.high_risk_placeholder[lang],
      draftJapanese: TEMPLATES.high_risk_placeholder.ja,
      usedTemplate: "high_risk_placeholder",
    };
  }

  return {
    draftOriginal: fillVars(pack[lang] || pack.en, vars),
    draftJapanese: fillVars(pack.ja, vars),
    usedTemplate: intent,
  };
}
