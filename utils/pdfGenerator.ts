import { PrayerTime } from "@/types/prayer";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import {
  extractPrayersFromTime,
  formatTimeForDisplay,
  getMonthName,
} from "./dateHelpers";

export const generatePDFHTML = async (
  data: PrayerTime[],
  type: "day" | "month" | "year"
): Promise<string> => {
  // Load the actual mosque logo
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
      content = generateDayContent(data[0]);
      break;

    case "month":
      const monthDate = new Date(data[0].d_date);
      title = `Prayer Times - ${getMonthName(
        monthDate.getMonth()
      )} ${monthDate.getFullYear()}`;
      content = generateMonthContent(data);
      break;

    case "year":
      const yearDate = new Date(data[0].d_date);
      title = `Prayer Times - ${yearDate.getFullYear()}`;
      content = generateYearContent(data);
      break;
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          @page {
            size: A4;
            margin: 8mm;
          }

          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #212121;
            line-height: 1.3;
          }

          .header {
            text-align: center;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 2px solid #1B5E20;
            flex-shrink: 0;
          }

          .logo {
            width: 50px;
            height: 50px;
            margin: 0;
            object-fit: contain;
          }

          .mosque-name {
            font-size: 16px;
            font-weight: 800;
            color: #1B5E20;
            margin-bottom: 3px;
          }

          .document-title {
            font-size: 14px;
            font-weight: 600;
            color: #333;
            margin-bottom: 2px;
          }

          .location {
            font-size: 10px;
            color: #666;
          }

          .content {
            flex: 1;
            overflow: hidden;
          }

          /* Day View Styles - Optimized for single page */
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

          /* Month View Styles - Maximized sizing for optimal page usage */
          .month-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            table-layout: fixed;
          }

          .month-table th {
            background-color: #1B5E20;
            color: white;
            padding: 8px 3px;
            text-align: center;
            font-weight: 600;
            font-size: 11px;
            white-space: nowrap;
            overflow: hidden;
            height: 32px;
          }

          .month-table td {
            padding: 5px 3px;
            text-align: center;
            border-bottom: 1px solid #e0e0e0;
            font-size: 10px;
            white-space: nowrap;
            overflow: hidden;
            height: 22px;
          }

          .month-table tr:nth-child(even) {
            background-color: #f8f9fa;
          }

          .month-table .date-cell {
            font-weight: 700;
            color: #1B5E20;
            text-align: center;
            width: 6%;
            font-size: 12px;
          }

          .month-table .day-cell {
            font-weight: 600;
            color: #1B5E20;
            text-align: center;
            width: 6%;
            font-size: 9px;
          }

          .month-table .time-cell {
            width: 7%;
            font-size: 10px;
          }

          .month-table .header-cell {
            font-size: 8px;
            line-height: 1.1;
            padding: 4px 2px;
          }

          .month-table .monday-row {
            background-color: #FFEB3B !important;
          }

          .month-table .monday-row td {
            background-color: #FFEB3B !important;
          }

          .month-table .weekend {
            background-color: #E8F5E9;
          }

          .month-table .ramadan {
            background-color: #FFF3E0;
          }

          .ramadan-indicator {
            font-size: 8px;
            margin-left: 3px;
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

          /* Footer - Balanced size for optimal page usage */
          .footer {
            margin-top: 8px;
            padding-top: 6px;
            border-top: 1px solid #e0e0e0;
            text-align: center;
            font-size: 8px;
            color: #666;
            flex-shrink: 0;
            height: 30px;
          }

          .generated-date {
            margin-bottom: 3px;
          }

          /* Specific optimizations for day view */
          .day-view .content {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            height: 100%;
          }

          .prayers-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 8px;
          }

          /* Month view optimizations - Natural content sizing */
          .month-view .content {
            display: block;
          }

          .month-view .month-table-container {
            width: 100%;
          }

          .month-view .month-table {
            width: 100%;
          }

          .month-view .month-table th:first-child {
            width: 6%;
          }

          .month-view .month-table th:nth-child(2) {
            width: 6%;
          }

          .month-view .month-table th:not(:first-child):not(:nth-child(2)) {
            width: 7%;
          }

          /* Print optimizations */
          @media print {
            body {
              height: auto;
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
          .compact-layout {
            transform: scale(0.95);
            transform-origin: top center;
          }
        </style>
      </head>
      <body class="${type}-view">
        <div class="header">
          <img src="${mosqueLogoBase64}" alt="Mosque Logo" class="logo">
          <div class="mosque-name">Masjid Abubakr Siddique</div>
          <div class="document-title">${title}</div>
          <div class="location">Birmingham, United Kingdom</div>
        </div>

        <div class="content ${
          type === "month" && data.length > 25 ? "compact-layout" : ""
        }">
          ${
            type === "month"
              ? `<div class="month-table-container">${content}</div>`
              : content
          }
        </div>

        <div class="footer">
          <div class="generated-date">
            Generated: ${new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        </div>
      </body>
    </html>
  `;
};

const generateDayContent = (prayerTime: PrayerTime): string => {
  const prayers = extractPrayersFromTime(prayerTime);
  const date = new Date(prayerTime.d_date);
  const isRamadan = prayerTime.is_ramadan === 1;

  let content = `
    <div class="day-info">
      <h2>
        ${date.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
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

const generateMonthContent = (data: PrayerTime[]): string => {
  const sortedData = data.sort(
    (a, b) => new Date(a.d_date).getTime() - new Date(b.d_date).getTime()
  );

  let content = `
    <table class="month-table">
      <thead>
        <tr>
          <th class="header-cell">Date</th>
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

    // Debug: Add Monday indicator to the day column for testing
    const dayDisplay = dayAbbr;

    let rowClass = "";
    let cellStyle = "";

    if (isMonday) {
      rowClass = "monday-row";
      cellStyle =
        "border: 3px solid #FF9800; border-left: 8px solid #FF9800; font-weight: bold; color: #E65100;";
    } else if (isRamadan) {
      rowClass = "ramadan";
    } else if (isWeekend) {
      rowClass = "weekend";
    }

    content += `
      <tr class="${rowClass}" style="${cellStyle}">
        <td class="date-cell" style="${
          isMonday
            ? "border-left: 8px solid #FF9800; border-top: 3px solid #FF9800; border-bottom: 3px solid #FF9800; font-weight: bold; color: #E65100;"
            : ""
        }">
          ${date.getDate()}
          ${isRamadan ? '<span class="ramadan-indicator">🌙</span>' : ""}
        </td>
        <td class="day-cell" style="${
          isMonday
            ? "border-top: 3px solid #FF9800; border-bottom: 3px solid #FF9800; font-weight: bold; color: #E65100;"
            : ""
        }">${dayDisplay}</td>
    `;

    // Add prayer times in the correct order
    const prayerOrder = ["Fajr", "Sunrise", "Zuhr", "Asr", "Maghrib", "Isha"];

    let cellIndex = 2; // Start after date and day columns
    prayerOrder.forEach((prayerName) => {
      const prayer = prayers.find((p) => p.name === prayerName);
      if (prayer) {
        const isLastCell = cellIndex === 12; // Last column (Isha Iqamah)
        const mondayStyle = isMonday
          ? `border-top: 3px solid #FF9800; border-bottom: 3px solid #FF9800; ${
              isLastCell ? "border-right: 3px solid #FF9800;" : ""
            } font-weight: bold; color: #E65100;`
          : "";

        content += `<td class="time-cell" style="${mondayStyle}">${formatTimeForDisplay(
          prayer.begins
        )}</td>`;
        cellIndex++;

        if (prayer.name !== "Sunrise") {
          const isLastCellIqamah = cellIndex === 12;
          const mondayStyleIqamah = isMonday
            ? `border-top: 3px solid #FF9800; border-bottom: 3px solid #FF9800; ${
                isLastCellIqamah ? "border-right: 3px solid #FF9800;" : ""
              } font-weight: bold; color: #E65100;`
            : "";
          content += `<td class="time-cell" style="${mondayStyleIqamah}">${
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
            ${isRamadan ? '<span class="ramadan-indicator">🌙</span>' : ""}
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

    if (!asset.localUri) {
      throw new Error("Could not get local URI for PNG asset");
    }

    // Read as base64 directly for PNG
    const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error("Error loading mosque logo:", error);

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
