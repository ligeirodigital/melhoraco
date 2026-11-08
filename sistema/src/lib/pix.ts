
export function generatePixPayload(key: string, amount: number, name: string, city: string, txId: string) {
  const payloadFormatIndicator = "000201";
  
  const merchantAccountInformation = (key: string) => {
    const gui = "0014br.gov.bcb.pix";
    const keyFormatted = `01${key.length.toString().padStart(2, '0')}${key}`;
    const info = `${gui}${keyFormatted}`;
    return `26${info.length.toString().padStart(2, '0')}${info}`;
  };

  const merchantCategoryCode = "52040000";
  const transactionCurrency = "5303986";
  const transactionAmount = amount > 0 ? `54${amount.toFixed(2).length.toString().padStart(2, '0')}${amount.toFixed(2)}` : "";
  const countryCode = "5802BR";
  const merchantName = `59${name.length.toString().padStart(2, '0')}${name}`;
  const merchantCity = `60${city.length.toString().padStart(2, '0')}${city}`;
  
  const additionalDataFieldTemplate = (txId: string) => {
    const tag = `05${txId.length.toString().padStart(2, '0')}${txId}`;
    return `62${tag.length.toString().padStart(2, '0')}${tag}`;
  };

  const payload = [
    payloadFormatIndicator,
    merchantAccountInformation(key),
    merchantCategoryCode,
    transactionCurrency,
    transactionAmount,
    countryCode,
    merchantName,
    merchantCity,
    additionalDataFieldTemplate(txId),
    "6304"
  ].join("");

  return payload + crc16(payload);
}

function crc16(str: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
    }
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}
