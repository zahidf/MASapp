import { PrayerTime } from "@/types/prayer";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import {
  extractPrayersFromTime,
  formatTimeForDisplay,
  getMonthName,
} from "./dateHelpers";
import {
  formatHijriDate,
  formatHijriMonthYear,
  gregorianToHijri
} from "./hijriDateUtils";

interface MosqueDetails {
  donation_account?: {
    account_number: string;
    name: string;
    sort_code: string;
  };
  android_qr?: string;
  android_url?: string;
  ios_qr?: string;
  ios_url?: string;
  website_qr?: string;
  website_url?: string;
  services?: { [key: string]: string };
}

interface JumaahTimes {
  khutbah_begins: string;
  prayer_begins: string;
}

export const generatePDFHTML = async (
  data: PrayerTime[],
  type: "day" | "month" | "year",
  calendarType: 'gregorian' | 'hijri' = 'gregorian',
  mosqueDetails?: MosqueDetails,
  jumaahTimes?: JumaahTimes
): Promise<string> => {
  const mosqueLogoBase64 = await getMosqueLogoBase64();

  let title = "";
  let content = "";

  switch (type) {
    case "day":
      const dayDate = new Date(data[0].d_date);
      title = `Prayer Times - ${dayDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`;
      content = generateDayContent(data[0], calendarType);
      break;

    case "month":
      const monthDate = new Date(data[0].d_date);
      if (calendarType === 'hijri') {
        const hijriDate = gregorianToHijri(monthDate);
        title = `Prayer Times - ${formatHijriMonthYear(hijriDate, 'en')}`;
      } else {
        title = `Prayer Times - ${getMonthName(
          monthDate.getMonth()
        )} ${monthDate.getFullYear()}`;
      }
      content = generateMonthContent(data, calendarType);
      break;

    case "year":
      const yearDate = new Date(data[0].d_date);
      title = `Prayer Times - ${yearDate.getFullYear()}`;
      content = generateYearContent(data);
      break;
  }

  return `
    <!DOCTYPE html>
    <html style="height: 100%; margin: 0; padding: 0; overflow: hidden;">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
          
          @page {
            size: A4;
            margin: 8mm;
          }
          
          @media print {
            html, body {
              height: auto !important;
              overflow: visible !important;
            }
            .page-wrapper {
              page-break-after: avoid !important;
              page-break-inside: avoid !important;
              height: auto !important;
              max-height: 260mm !important;
              overflow: hidden !important;
            }
            .content {
              height: auto !important;
            }
            .side-content {
              height: auto !important;
              overflow: visible !important;
            }
          }

          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          /* Prevent orphaned content */
          .month-table tr {
            page-break-inside: avoid;
          }
          
          /* Force single page */
          @media print {
            @page :first {
              margin: 8mm;
            }
            @page :left {
              display: none;
            }
            @page :right {
              display: none;
            }
            @page :blank {
              display: none;
            }
          }

          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #1a1a1a;
            line-height: 1.4;
            font-size: 10px;
            background-color: #ffffff;
            position: relative;
            margin: 0;
            padding: 0;
            height: 100%;
            overflow: hidden;
          }
          

          .header {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 6px;
            padding: 8px;
            background: white;
            border: 2px solid #1B5E20;
            border-radius: 8px;
            gap: 8px;
            flex-shrink: 0;
          }
          
          .header-center {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .logo {
            width: 50px;
            height: 50px;
            object-fit: contain;
            margin-bottom: 8px;
          }

          .mosque-name {
            font-size: 16px;
            font-weight: 800;
            color: #1B5E20;
            margin-bottom: 2px;
            letter-spacing: 0.5px;
          }

          .document-title {
            font-size: 12px;
            font-weight: 600;
            color: #2E7D32;
            margin-bottom: 1px;
          }

          .date-range {
            font-size: 9px;
            color: #666;
            font-weight: 500;
          }
          
          .date-range-hijri {
            font-size: 8px;
            color: #2E7D32;
            font-style: italic;
          }

          .content {
            flex: 1;
            overflow: hidden;
            display: flex !important;
            gap: 10px;
            width: 100%;
            align-items: flex-start;
            min-height: 0;
          }
          
          .main-content {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          
          .side-content {
            width: 180px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            flex-shrink: 0;
            overflow: hidden;
          }

          /* Day View Styles - Optimized for single page */
          .day-view .content {
            display: block !important;
          }
          
          .day-info h2 {
            color: #1B5E20;
            margin-bottom: 12px;
            text-align: center;
            font-size: 16px;
          }

          .day-prayer {
            background-color: #f8f9fa;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 8px;
            border-left: 3px solid #1B5E20;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .day-prayer-name {
            font-size: 14px;
            font-weight: 700;
            color: #1B5E20;
            min-width: 80px;
          }

          .day-prayer-times {
            display: flex;
            gap: 20px;
            align-items: center;
          }

          .prayer-time-item {
            text-align: center;
            min-width: 60px;
          }

          .prayer-time-label {
            font-size: 9px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-bottom: 2px;
          }

          .prayer-time-value {
            font-size: 12px;
            font-weight: 600;
            color: #212121;
          }

          /* Month View Styles - Enhanced design */
          .month-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 7px;
            table-layout: fixed;
            background: white;
            border: 1px solid #ddd;
            margin: 0;
          }

          .month-table th {
            background: linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%);
            color: white;
            padding: 8px 3px;
            text-align: center;
            font-weight: 600;
            font-size: 8px;
            white-space: nowrap;
            overflow: hidden;
            height: 32px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 2px solid #1B5E20;
          }
          
          .month-table th:first-child {
            border-top-left-radius: 8px;
          }
          
          .month-table th:last-child {
            border-top-right-radius: 8px;
          }

          .month-table td {
            padding: 5px 2px;
            text-align: center;
            border-bottom: 1px solid #f0f0f0;
            font-size: 8px;
            white-space: nowrap;
            overflow: hidden;
            height: 24px;
            font-weight: 500;
            color: #333;
            background: white;
            transition: background-color 0.2s;
          }

          .month-table tr:nth-child(even) td {
            background-color: #fafbfc;
          }
          
          .month-table tr:hover td {
            background-color: #f0f7f0;
          }

          .month-table .date-cell {
            font-weight: 700;
            color: #1B5E20;
            text-align: center;
            width: 5%;
            font-size: 10px;
            background: linear-gradient(90deg, rgba(27, 94, 32, 0.05) 0%, transparent 100%);
          }

          .month-table .day-cell {
            font-weight: 600;
            color: #1B5E20;
            text-align: center;
            width: 3%;
            font-size: 6px;
          }

          .month-table .time-cell {
            width: auto;
            font-size: 6px;
          }

          .month-table .header-cell {
            font-size: 7px;
            line-height: 1.2;
            padding: 4px 1px;
            font-weight: 700;
          }

          .month-table .monday-row {
            background: linear-gradient(90deg, #FFF8E1 0%, #FFFEF7 100%) !important;
            font-weight: 600;
          }

          .month-table .monday-row td {
            background: inherit !important;
            color: #F57C00;
            font-weight: 600;
            border-bottom: 2px solid #FFE082;
          }
          
          .month-table .monday-row .date-cell,
          .month-table .monday-row .day-cell {
            color: #E65100;
            font-weight: 700;
          }

          .month-table .weekend td {
            background-color: #F1F8F4;
            color: #2E7D32;
          }

          .month-table .ramadan td {
            background: linear-gradient(90deg, #FFF3E0 0%, #FFFEF7 100%);
            position: relative;
          }
          
          .month-table .ramadan td::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, #FF9800 0%, transparent 100%);
          }

          .ramadan-indicator {
            font-size: 10px;
            margin-left: 2px;
            display: inline-block;
            animation: pulse 2s infinite;
          }
          
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
          }

          /* Year View Styles - Very compact */
          .year-month {
            page-break-inside: avoid;
            margin-bottom: 15px;
          }

          .year-month-title {
            font-size: 12px;
            font-weight: 700;
            color: #1B5E20;
            margin-bottom: 6px;
            padding: 6px;
            background-color: #E8F5E9;
            border-radius: 4px;
          }

          .year-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 6px;
            table-layout: fixed;
          }

          .year-table th {
            background-color: #1B5E20;
            color: white;
            padding: 3px 1px;
            text-align: center;
            font-weight: 600;
            font-size: 6px;
            white-space: nowrap;
          }

          .year-table td {
            padding: 2px 1px;
            text-align: center;
            border-bottom: 1px solid #e0e0e0;
            font-size: 6px;
            white-space: nowrap;
          }

          .year-table .date-cell {
            font-weight: 600;
            color: #1B5E20;
            text-align: center;
            width: 8%;
          }


          .generated-date {
            margin-bottom: 3px;
          }


          .prayers-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 8px;
          }

          /* Month view optimizations - Two column layout */
          .month-view .content {
            display: flex !important;
            gap: 10px;
            align-items: flex-start;
          }

          .month-view .main-content {
            flex: 1;
            min-width: 0;
          }

          .month-view .side-content {
            width: 180px;
            flex-shrink: 0;
          }

          .month-view .month-table-container {
            width: 100%;
          }

          .month-view .month-table {
            width: 100%;
          }

          /* Print optimizations */
          @media print {
            body {
              height: auto;
            }
            
            .content {
              display: flex !important;
            }
            
            .month-view .content {
              display: flex !important;
            }
            
            .month-table {
              page-break-inside: avoid;
            }
            
            .year-month {
              page-break-inside: avoid;
            }

            .day-prayer {
              page-break-inside: avoid;
            }
          }

          /* Special layout for fitting content */
          
          .page-wrapper {
            display: flex;
            flex-direction: column;
            padding: 10px;
            background: white;
            overflow: hidden;
            box-sizing: border-box;
            max-height: 280mm;
            page-break-after: avoid;
            page-break-inside: avoid;
          }

          /* Additional sections for mosque details */
          .info-section {
            margin-top: 12px;
            padding: 0;
            background-color: transparent;
          }

          .info-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 10px;
            margin-bottom: 8px;
          }

          .info-column {
            flex: 1;
          }

          .qr-codes-box {
            background: #F5F5F5;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 6px;
            margin-bottom: 6px;
          }
          
          .qr-codes-title {
            font-size: 10px;
            font-weight: 700;
            color: #1B5E20;
            margin-bottom: 8px;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .qr-codes-grid {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          
          .qr-code-item {
            text-align: center;
            transition: transform 0.2s;
          }
          
          .qr-code-item:hover {
            transform: scale(1.05);
          }
          
          .large-qr {
            width: 80px;
            height: 80px;
            border-radius: 6px;
            border: 2px solid #1B5E20;
            padding: 4px;
            background: white;
            margin: 0 auto;
          }
          
          .qr-code-label {
            font-size: 9px;
            color: #1B5E20;
            font-weight: 600;
            margin-top: 4px;
            text-transform: uppercase;
          }

          .donation-box {
            background: #FFF8E1;
            border: 2px solid #F57C00;
            border-radius: 6px;
            padding: 6px;
            text-align: center;
          }

          .donation-title {
            font-size: 11px;
            font-weight: 800;
            color: #E65100;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          

          .donation-plea {
            font-size: 8px;
            color: #5D4037;
            margin-bottom: 6px;
            line-height: 1.4;
            font-weight: 500;
            font-style: italic;
          }

          .donation-details {
            background-color: rgba(255, 255, 255, 0.8);
            border-radius: 4px;
            padding: 6px;
            margin-top: 6px;
            border: 1px solid #FFE082;
          }

          .donation-detail {
            font-size: 8px;
            margin: 2px 0;
            text-align: center;
          }

          .donation-detail strong {
            color: #E65100;
            font-weight: 600;
          }
          
          .donation-detail span {
            font-weight: 600;
            color: #5D4037;
            font-family: 'Courier New', monospace;
            font-size: 9px;
          }

          .jumaah-box {
            background: #E8F5E9;
            border: 1px solid #2E7D32;
            border-radius: 6px;
            padding: 6px;
            text-align: center;
            margin-bottom: 6px;
          }
          

          .jumaah-title {
            font-size: 11px;
            font-weight: 700;
            color: #1B5E20;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .jumaah-time {
            font-size: 9px;
            margin: 2px 0;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 6px;
          }
          
          .jumaah-time strong {
            color: #1B5E20;
            font-weight: 600;
            min-width: 90px;
            text-align: right;
          }
          
          .jumaah-time span {
            font-weight: 600;
            color: #2E7D32;
            font-size: 10px;
          }

          .services-box {
            padding: 8px;
            background: #FFF3E0;
            border-radius: 6px;
            border: 2px solid #FF9800;
            margin-bottom: 6px;
          }

          .services-title {
            font-size: 11px;
            font-weight: 700;
            color: #E65100;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            text-align: center;
          }
          

          .services-grid {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .service-item {
            font-size: 9px;
            background: white;
            padding: 6px 8px;
            border-radius: 4px;
            color: #5D4037;
            font-weight: 600;
            border: 1px solid #FFE082;
            text-align: left;
            line-height: 1.4;
            word-break: break-word;
          }

          /* Hijri date column styles */
          .hijri-cell {
            font-size: 7px;
            color: #2E7D32;
            font-style: italic;
            font-weight: 500;
            width: 4%;
          }
        </style>
      </head>
      <body class="${type}-view" style="margin: 0; padding: 0; height: 100%; overflow: hidden;">
        <div class="page-wrapper">
        ${generateHeader(title, mosqueLogoBase64, mosqueDetails, data, calendarType)}
        
        <div class="content">
          <div class="main-content">
            ${
              type === "month"
                ? `<div class="month-table-container">${content}</div>`
                : content
            }
          </div>
          
          ${type === "month" ? `
            <div class="side-content">
              ${jumaahTimes ? generateJumaahSection(jumaahTimes) : ''}
              ${mosqueDetails ? generateSideSection(mosqueDetails) : ''}
            </div>
          ` : ''}
        </div>
        </div>
      </body>
    </html>
  `;
};

const generateDayContent = (prayerTime: PrayerTime, calendarType: 'gregorian' | 'hijri' = 'gregorian'): string => {
  const prayers = extractPrayersFromTime(prayerTime);
  const date = new Date(prayerTime.d_date);
  const isRamadan = prayerTime.is_ramadan === 1;
  
  const hijriDate = gregorianToHijri(date);
  const dateDisplay = calendarType === 'hijri' 
    ? formatHijriDate(hijriDate, 'en')
    : date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });

  let content = `
    <div class="day-info">
      <h2>
        ${dateDisplay}
        ${isRamadan ? '<span class="ramadan-indicator">🌙 Ramadan</span>' : ""}
      </h2>
    </div>
    <div class="prayers-container">
  `;

  prayers.forEach((prayer) => {
    content += `
      <div class="day-prayer">
        <div class="day-prayer-name">${prayer.name}</div>
        <div class="day-prayer-times">
          <div class="prayer-time-item">
            <div class="prayer-time-label">Begins</div>
            <div class="prayer-time-value">${formatTimeForDisplay(
              prayer.begins
            )}</div>
          </div>
          ${
            prayer.jamah &&
            prayer.jamah.trim() !== "" &&
            prayer.name !== "Sunrise"
              ? `
          <div class="prayer-time-item">
            <div class="prayer-time-label">Jamah</div>
            <div class="prayer-time-value">${formatTimeForDisplay(
              prayer.jamah
            )}</div>
          </div>
          `
              : ""
          }
        </div>
      </div>
    `;
  });

  content += `</div>`;
  return content;
};

const generateMonthContent = (data: PrayerTime[], calendarType: 'gregorian' | 'hijri' = 'gregorian'): string => {
  const sortedData = data.sort(
    (a, b) => new Date(a.d_date).getTime() - new Date(b.d_date).getTime()
  );

  let content = `
    <table class="month-table">
      <thead>
        <tr>
          <th class="header-cell">Date</th>
          <th class="header-cell">Hijri</th>
          <th class="header-cell">Day</th>
          <th class="header-cell">Fajr<br/>Begins</th>
          <th class="header-cell">Fajr<br/>Iqamah</th>
          <th class="header-cell">Sunrise</th>
          <th class="header-cell">Dhuhr<br/>Begins</th>
          <th class="header-cell">Dhuhr<br/>Iqamah</th>
          <th class="header-cell">Asr<br/>Begins</th>
          <th class="header-cell">Asr<br/>Iqamah</th>
          <th class="header-cell">Maghrib<br/>Begins</th>
          <th class="header-cell">Maghrib<br/>Iqamah</th>
          <th class="header-cell">Isha<br/>Begins</th>
          <th class="header-cell">Isha<br/>Iqamah</th>
        </tr>
      </thead>
      <tbody>
  `;

  sortedData.forEach((prayerTime) => {
    const date = new Date(prayerTime.d_date);
    const prayers = extractPrayersFromTime(prayerTime);
    const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, 2=Tuesday, etc.
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isMonday = dayOfWeek === 1;
    const isRamadan = prayerTime.is_ramadan === 1;

    // Get day abbreviation
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayAbbr = dayNames[dayOfWeek];

    // Get date display based on calendar type
    const hijriDate = gregorianToHijri(date);
    const dateDisplay = calendarType === 'hijri' ? hijriDate.day : date.getDate();
    const dayDisplay = dayAbbr;

    let rowClass = "";
    let cellStyle = "";

    if (isMonday) {
      rowClass = "monday-row";
      cellStyle = "";
    } else if (isRamadan) {
      rowClass = "ramadan";
    } else if (isWeekend) {
      rowClass = "weekend";
    }

    content += `
      <tr class="${rowClass}" style="${cellStyle}">
        <td class="date-cell">
          ${dateDisplay}
          ${isRamadan ? '<span class="ramadan-indicator">(R)</span>' : ""}
        </td>
        <td class="hijri-cell">${hijriDate.day}</td>
        <td class="day-cell">${dayDisplay}</td>
    `;

    // Add prayer times in the correct order
    const prayerOrder = ["Fajr", "Sunrise", "Zuhr", "Asr", "Maghrib", "Isha"];

    let cellIndex = 3; // Start after date, hijri and day columns
    prayerOrder.forEach((prayerName) => {
      const prayer = prayers.find((p) => p.name === prayerName);
      if (prayer) {
        content += `<td class="time-cell">${formatTimeForDisplay(
          prayer.begins
        )}</td>`;
        cellIndex++;

        if (prayer.name !== "Sunrise") {
          content += `<td class="time-cell">${
            prayer.jamah && prayer.jamah.trim() !== ""
              ? formatTimeForDisplay(prayer.jamah)
              : "-"
          }</td>`;
          cellIndex++;
        }
      }
    });

    content += "</tr>";
  });

  content += `
      </tbody>
    </table>
  `;

  return content;
};

const generateYearContent = (data: PrayerTime[]): string => {
  const sortedData = data.sort(
    (a, b) => new Date(a.d_date).getTime() - new Date(b.d_date).getTime()
  );

  // Group data by month
  const monthlyData: { [key: string]: PrayerTime[] } = {};
  sortedData.forEach((prayerTime) => {
    const date = new Date(prayerTime.d_date);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = [];
    }
    monthlyData[monthKey].push(prayerTime);
  });

  let content = "";

  Object.keys(monthlyData).forEach((monthKey, index) => {
    const monthData = monthlyData[monthKey];
    const firstDate = new Date(monthData[0].d_date);
    const monthName = getMonthName(firstDate.getMonth());
    const year = firstDate.getFullYear();

    // Only show first 4 months to fit on one page
    if (index >= 4) return;

    content += `
      <div class="year-month">
        <div class="year-month-title">${monthName} ${year}</div>
        <table class="year-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Fajr</th>
              <th>F.Iq</th>
              <th>Sunrise</th>
              <th>Dhuhr</th>
              <th>D.Iq</th>
              <th>Asr</th>
              <th>A.Iq</th>
              <th>Maghrib</th>
              <th>M.Iq</th>
              <th>Isha</th>
              <th>I.Iq</th>
            </tr>
          </thead>
          <tbody>
    `;

    // Only show first 10 days of each month to fit
    monthData.slice(0, 10).forEach((prayerTime) => {
      const date = new Date(prayerTime.d_date);
      const prayers = extractPrayersFromTime(prayerTime);
      const isRamadan = prayerTime.is_ramadan === 1;

      content += `
        <tr ${isRamadan ? 'class="ramadan"' : ""}>
          <td class="date-cell">
            ${date.getDate()}
            ${isRamadan ? '<span class="ramadan-indicator">(R)</span>' : ""}
          </td>
      `;

      const prayerOrder = ["Fajr", "Sunrise", "Zuhr", "Asr", "Maghrib", "Isha"];

      prayerOrder.forEach((prayerName) => {
        const prayer = prayers.find((p) => p.name === prayerName);
        if (prayer) {
          content += `<td>${formatTimeForDisplay(prayer.begins)}</td>`;

          if (prayer.name !== "Sunrise") {
            content += `<td>${
              prayer.jamah && prayer.jamah.trim() !== ""
                ? formatTimeForDisplay(prayer.jamah)
                : "-"
            }</td>`;
          }
        }
      });

      content += "</tr>";
    });

    content += `
          </tbody>
        </table>
      </div>
    `;
  });

  if (Object.keys(monthlyData).length > 4) {
    content += `
      <div style="text-align: center; margin-top: 10px; font-size: 8px; color: #666;">
        Showing first 4 months with 10 days each. Full year data available in app.
      </div>
    `;
  }

  return content;
};

const getMosqueLogoBase64 = async (): Promise<string> => {
  try {
    const asset = Asset.fromModule(require("../assets/logos/mosqueLogo.png"));
    await asset.downloadAsync();

    // Use localUri if available (iOS), otherwise fall back to uri (Android)
    const uri = asset.localUri || asset.uri;
    if (!uri) {
      throw new Error("Could not get URI for PNG asset");
    }

    // Read as base64 directly
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error('Error loading mosque logo:', error);
    // Error loading mosque logo

    // Fallback to a simple mosque icon if the file can't be loaded
    const fallbackSvg = `
      <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="mosqueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#2E7D32;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1B5E20;stop-opacity:1" />
          </linearGradient>
        </defs>
        
        <!-- Main dome -->
        <ellipse cx="25" cy="22" rx="15" ry="12" fill="url(#mosqueGradient)"/>
        
        <!-- Minarets -->
        <rect x="10" y="16" width="5" height="22" fill="url(#mosqueGradient)"/>
        <rect x="35" y="16" width="5" height="22" fill="url(#mosqueGradient)"/>
        
        <!-- Minaret tops -->
        <ellipse cx="12.5" cy="16" rx="4" ry="5" fill="url(#mosqueGradient)"/>
        <ellipse cx="37.5" cy="16" rx="4" ry="5" fill="url(#mosqueGradient)"/>
        
        <!-- Main building -->
        <rect x="12" y="28" width="26" height="15" fill="url(#mosqueGradient)"/>
        
        <!-- Door -->
        <rect x="21" y="34" width="8" height="9" fill="#FFF" opacity="0.8"/>
        
        <!-- Crescent moon -->
        <path d="M 25 10 Q 21 13 25 16 Q 26 13 25 10" fill="#FFD700"/>
      </svg>
    `;

    return `data:image/svg+xml;base64,${btoa(fallbackSvg)}`;
  }
};

const generateHeader = (title: string, mosqueLogoBase64: string, mosqueDetails?: MosqueDetails, data?: PrayerTime[], calendarType?: string): string => {
  // Get date range for the month
  let dateRangeText = '';
  let hijriRangeText = '';
  
  if (data && data.length > 0) {
    const firstDate = new Date(data[0].d_date);
    const lastDate = new Date(data[data.length - 1].d_date);
    
    // Gregorian date range
    const monthYear = firstDate.toLocaleDateString('en-US', { month: 'numeric', year: 'numeric' });
    dateRangeText = monthYear;
    
    // Hijri date range
    const firstHijri = gregorianToHijri(firstDate);
    const lastHijri = gregorianToHijri(lastDate);
    
    if (firstHijri.month === lastHijri.month) {
      hijriRangeText = `${firstHijri.month}/${firstHijri.year} AH`;
    } else {
      hijriRangeText = `${firstHijri.month}-${lastHijri.month}/${firstHijri.year} AH`;
    }
  }
  
  return `
    <div class="header">
      <div class="header-center">
        <img src="${mosqueLogoBase64}" alt="Mosque Logo" class="logo">
        <div class="mosque-name">Masjid Abubakr Siddique</div>
        <div class="document-title">${title}</div>
        <div class="date-range">${dateRangeText}</div>
        <div class="date-range-hijri">${hijriRangeText}</div>
      </div>
    </div>
  `;
};

const generateJumaahSection = (jumaahTimes: JumaahTimes): string => {
  return `
    <div class="jumaah-box">
      <div class="jumaah-title">Friday Prayer (Jumu'ah)</div>
      <div class="jumaah-time"><strong>Khutbah Begins:</strong> <span>${jumaahTimes.khutbah_begins}</span></div>
      <div class="jumaah-time"><strong>Prayer Begins:</strong> <span>${jumaahTimes.prayer_begins}</span></div>
    </div>
  `;
};

const generateSideSection = (mosqueDetails: MosqueDetails): string => {
  let content = '';
  
  // QR Codes section
  const hasQRCodes = mosqueDetails.ios_qr || mosqueDetails.android_qr || mosqueDetails.website_qr;
  if (hasQRCodes) {
    content += `
      <div class="qr-codes-box">
        <div class="qr-codes-title">Scan QR Codes Below</div>
        <div class="qr-codes-grid">
    `;
    
    if (mosqueDetails.ios_qr) {
      content += `
        <div class="qr-code-item">
          <img src="${convertSvgToBase64(mosqueDetails.ios_qr)}" class="large-qr" alt="iOS App">
          <div class="qr-code-label">iOS App</div>
        </div>
      `;
    }
    
    if (mosqueDetails.android_qr) {
      content += `
        <div class="qr-code-item">
          <img src="${convertSvgToBase64(mosqueDetails.android_qr)}" class="large-qr" alt="Android App">
          <div class="qr-code-label">Android App</div>
        </div>
      `;
    }
    
    if (mosqueDetails.website_qr) {
      content += `
        <div class="qr-code-item">
          <img src="${convertSvgToBase64(mosqueDetails.website_qr)}" class="large-qr" alt="Website">
          <div class="qr-code-label">Website</div>
        </div>
      `;
    }
    
    content += `
        </div>
      </div>
    `;
  }
  
  // Services section - Always show even if empty for debugging
  content += `
    <div class="services-box">
      <div class="services-title">Our Services</div>
      <div class="services-grid">
  `;
  
  if (mosqueDetails.services && Object.keys(mosqueDetails.services).length > 0) {
    Object.entries(mosqueDetails.services).forEach(([key, value]) => {
      // Handle both string values and nested objects
      const displayValue = typeof value === 'string' ? value : (value as any).toString();
      // Replace underscores with spaces for better display
      const displayKey = key.replace(/_/g, ' ');
      content += `<div class="service-item"><strong>${displayKey}:</strong> ${displayValue}</div>`;
    });
  } else {
    // Show placeholder if no services
    content += `<div class="service-item">Services information will be displayed here</div>`;
  }
  
  content += `
      </div>
    </div>
  `;
  
  // Donation section
  if (mosqueDetails.donation_account) {
    content += `
      <div class="donation-box">
        <div class="donation-title">Support Your Mosque</div>
        <div class="donation-plea">
          We are waiting for your support and donation to carry out this holy task.<br/>
          PLEASE make a secure donation VIA bank account.
        </div>
        <div class="donation-details">
          <div class="donation-detail"><strong>Account Name:</strong> <span>${mosqueDetails.donation_account.name}</span></div>
          <div class="donation-detail"><strong>Sort Code:</strong> <span>${mosqueDetails.donation_account.sort_code}</span></div>
          <div class="donation-detail"><strong>Account Number:</strong> <span>${mosqueDetails.donation_account.account_number}</span></div>
        </div>
      </div>
    `;
  }
  
  return content;
};

const convertSvgToBase64 = (svgString: string): string => {
  return svgString.startsWith('<svg') 
    ? `data:image/svg+xml;base64,${btoa(svgString)}`
    : svgString;
};
