import { geocodeAddress } from './apis/geocoding';
import { getParcelByCoords } from './apis/gugik';
import { getSolarPotential } from './apis/pvgis';
import { getFloodRisk } from './apis/flood';
import { getNearestAirQuality } from './apis/airquality';
import { getAccessibilityData } from './apis/openroute';
import { generateJson } from './llm';
import type { GeoData, Report } from './types';

// Zbiera dane ze wszystkich API równolegle (Promise.allSettled)
async function collectGeoData(address: string): Promise<GeoData | null> {
  // Krok 1: Geocoding — WYMAGANY
  const geocode = await geocodeAddress(address);
  if (!geocode) return null;

  const { lat, lng } = geocode;

  // Krok 2: Pozostałe API równolegle (jeśli jedno padnie, reszta działa)
  const [parcel, solar, flood, airQuality, accessibility] = await Promise.allSettled([
    getParcelByCoords(lat, lng),
    getSolarPotential(lat, lng),
    getFloodRisk(lat, lng),
    getNearestAirQuality(lat, lng),
    getAccessibilityData(lat, lng),
  ]);

  return {
    address: geocode.displayName,
    addressNormalized: address.toLowerCase().trim(),
    city: geocode.city,
    county: geocode.county,
    province: geocode.province,
    coords: { lat, lng },
    parcelId: parcel.status === 'fulfilled' ? parcel.value?.parcelId : undefined,
    floodRisk: flood.status === 'fulfilled' ? flood.value : 'none',
    solarPotential: solar.status === 'fulfilled' ? solar.value?.yearlyEnergy : undefined,
    airQualityIndex: airQuality.status === 'fulfilled' ? (airQuality.value?.aqi ?? undefined) : undefined,
    walkScore: accessibility.status === 'fulfilled' ? (accessibility.value?.walkable15min ?? undefined) : undefined,
  };
}

// Buduje prompt dla modelu AI z prawdziwymi danymi
function buildPrompt(address: string, geoData: GeoData): string {
  const dataContext = `
ADRES: ${address}
MIASTO: ${geoData.city}
POWIAT: ${geoData.county}
WOJEWÓDZTWO: ${geoData.province}
WSPÓŁRZĘDNE: ${geoData.coords.lat.toFixed(5)}, ${geoData.coords.lng.toFixed(5)}
${geoData.parcelId ? `ID DZIAŁKI (ULDK): ${geoData.parcelId}` : ''}
${geoData.floodRisk ? `ZAGROŻENIE POWODZIOWE (ISOK): ${geoData.floodRisk}` : ''}
${geoData.solarPotential ? `POTENCJAŁ SOLARNY (PVGIS): ${geoData.solarPotential.toFixed(0)} kWh/kWp/rok` : ''}
${geoData.airQualityIndex !== undefined ? `INDEKS JAKOŚCI POWIETRZA (OpenAQ): ${geoData.airQualityIndex} AQI` : ''}
${geoData.walkScore !== undefined ? `OBIEKTY W 15 MIN PIESZO (OSM): ${geoData.walkScore}` : ''}
`;

  return `Jesteś ekspertem od analizy nieruchomości w Polsce z dostępem do rzeczywistych danych publicznych.

Poniżej masz PRAWDZIWE dane pobrane z oficjalnych API dla tej lokalizacji:

${dataContext}

Na podstawie tych danych oraz swojej wiedzy o tej lokalizacji w Polsce, wygeneruj kompletny raport.

ZASADY:
1. Pisz prostym, zrozumiałym językiem — jakbyś tłumaczył sąsiadowi, nie prawnikom
2. Każde wyjaśnienie (pole "explain") musi mówić CO TO ZNACZY dla mieszkańca/inwestora
3. Używaj konkretnych liczb i porównań (np. "to jak mieszkanie przy drodze ekspresowej")
4. Jeśli masz prawdziwe dane z API (PVGIS, OpenAQ, ISOK) — używaj ICH, nie wymyślaj
5. Jeśli danych brakuje — szacuj na podstawie charakterystyki lokalizacji w Polsce
6. Status: "good" = zielony (dobrze), "ok" = żółty (przeciętnie), "bad" = czerwony (uwaga), "neutral" = szary

Zwróć TYLKO JSON (bez markdown, bez backticks, bez komentarzy) w tej strukturze:
{
  "address": "pełny sformatowany adres",
  "city": "miasto",
  "score": <liczba całkowita 1-100>,
  "scoreLabel": "<krótki label np. 'Dobra lokalizacja'>",
  "scoreSummary": "<2-3 zdania ogólnego podsumowania dla tej konkretnej lokalizacji>",
  "sections": [
    {
      "id": "halas",
      "icon": "🔊",
      "title": "Poziom hałasu",
      "status": "good|ok|bad|neutral",
      "items": [
        {
          "icon": "🚗",
          "label": "Hałas od ruchu drogowego",
          "value": "<konkretna wartość, np. '52 dB — umiarkowany'>",
          "meter": <liczba 0-100>,
          "meterColor": "<#2D7A4F lub #C8852A lub #B94040>",
          "explain": "<2-3 zdania: co to znaczy praktycznie, jak to wpływa na codzienne życie>"
        }
      ]
    },
    {
      "id": "powietrze",
      "icon": "💨",
      "title": "Jakość powietrza",
      "status": "good|ok|bad|neutral",
      "items": [
        {
          "icon": "😷",
          "label": "Indeks jakości powietrza (AQI)",
          "value": "${geoData.airQualityIndex !== undefined ? geoData.airQualityIndex + ' AQI' : 'brak danych ze stacji'}",
          "meter": ${geoData.airQualityIndex !== undefined ? Math.min(100, geoData.airQualityIndex / 3) : 40},
          "meterColor": "${geoData.airQualityIndex !== undefined ? (geoData.airQualityIndex < 50 ? '#2D7A4F' : geoData.airQualityIndex < 100 ? '#C8852A' : '#B94040') : '#C8852A'}",
          "explain": "UZUPEŁNIJ realistycznym opisem jakości powietrza dla tej lokalizacji"
        }
      ]
    },
    {
      "id": "komunikacja",
      "icon": "🚌",
      "title": "Komunikacja i dojazd",
      "status": "good|ok|bad|neutral",
      "items": []
    },
    {
      "id": "bezpieczenstwo",
      "icon": "🛡️",
      "title": "Bezpieczeństwo okolicy",
      "status": "good|ok|bad|neutral",
      "items": []
    },
    {
      "id": "infrastruktura",
      "icon": "🏥",
      "title": "Infrastruktura w pobliżu",
      "status": "good|ok|bad|neutral",
      "items": []
    },
    {
      "id": "zagrozenia",
      "icon": "⚠️",
      "title": "Zagrożenia i ograniczenia",
      "status": "${geoData.floodRisk === 'high' ? 'bad' : geoData.floodRisk === 'medium' ? 'ok' : 'good'}",
      "items": [
        {
          "icon": "🌊",
          "label": "Zagrożenie powodziowe",
          "value": "${geoData.floodRisk === 'none' ? 'Brak zagrożenia' : geoData.floodRisk === 'low' ? 'Niskie zagrożenie (Q500)' : geoData.floodRisk === 'medium' ? 'Średnie zagrożenie (Q100)' : 'WYSOKIE ZAGROŻENIE (Q10)'}",
          "meter": ${geoData.floodRisk === 'none' ? 5 : geoData.floodRisk === 'low' ? 25 : geoData.floodRisk === 'medium' ? 60 : 90},
          "meterColor": "${geoData.floodRisk === 'none' ? '#2D7A4F' : geoData.floodRisk === 'low' ? '#8B9E6B' : geoData.floodRisk === 'medium' ? '#C8852A' : '#B94040'}",
          "explain": "UZUPEŁNIJ wyjaśnienie co oznacza dla właściciela (ubezpieczenie, budowa, kredyt)"
        }
      ]
    },
    {
      "id": "solar",
      "icon": "☀️",
      "title": "Potencjał solarny",
      "status": "neutral",
      "items": [
        {
          "icon": "⚡",
          "label": "Roczna produkcja energii (1 kWp)",
          "value": "${geoData.solarPotential ? geoData.solarPotential.toFixed(0) + ' kWh/rok' : 'brak danych'}",
          "meter": ${geoData.solarPotential ? Math.min(100, (geoData.solarPotential / 12) * 100) : 50},
          "meterColor": "#C8852A",
          "explain": "UZUPEŁNIJ ile to oznacza paneli i oszczędności w złotówkach rocznie"
        }
      ]
    },
    {
      "id": "rynek",
      "icon": "📈",
      "title": "Rynek nieruchomości",
      "status": "neutral",
      "items": []
    }
  ]
}

Uzupełnij wszystkie sekcje konkretnymi pozycjami (2-4 per sekcja). Dla sekcji "komunikacja", "bezpieczenstwo", "infrastruktura", "rynek" — generuj dane na podstawie wiedzy o ${geoData.city} i tej dzielnicy. Bądź konkretny, nie ogólnikowy.`;
}

// Główna funkcja generowania raportu
export async function generateReport(address: string): Promise<Report | null> {
  // Zbierz dane z API
  const geoData = await collectGeoData(address);
  if (!geoData) {
    throw new Error('Nie mogę zlokalizować podanego adresu. Sprawdź czy adres jest w Polsce i spróbuj ponownie.');
  }

  // Wygeneruj raport przez wybranego dostawcę AI (domyślnie OpenAI gpt-4o-mini)
  const prompt = buildPrompt(address, geoData);
  const rawText = await generateJson(prompt);

  // Parsuj JSON
  let report: Report;
  try {
    report = JSON.parse(rawText.replace(/```json|```/g, '').trim());
  } catch {
    throw new Error('Błąd parsowania odpowiedzi AI. Spróbuj ponownie.');
  }

  // Dodaj dane geo
  report.geoData = geoData;
  report.coords = geoData.coords;

  return report;
}
