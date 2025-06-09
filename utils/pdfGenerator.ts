import { PrayerTime } from "@/types/prayer";
import {
  extractPrayersFromTime,
  formatTimeForDisplay,
  getMonthName,
} from "./dateHelpers";

export const generatePDFHTML = (
  data: PrayerTime[],
  type: "day" | "month" | "year"
): string => {
  // Base64 encoded mosque logo - you should replace this with your actual logo
  const mosqueLogoBase64 = getMosqueLogoBase64();

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
            margin: 10mm;
          }

          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #212121;
            line-height: 1.6;
          }

          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #1B5E20;
          }

          .logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 20px;
          }

          .mosque-name {
            font-size: 24px;
            font-weight: 800;
            color: #1B5E20;
            margin-bottom: 5px;
          }

          .document-title {
            font-size: 20px;
            font-weight: 600;
            color: #333;
            margin-bottom: 5px;
          }

          .location {
            font-size: 14px;
            color: #666;
          }

          .content {
            margin-top: 20px;
          }

          /* Day View Styles */
          .day-prayer {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 15px;
            border-left: 4px solid #1B5E20;
          }

          .day-prayer-name {
            font-size: 18px;
            font-weight: 700;
            color: #1B5E20;
            margin-bottom: 10px;
          }

          .day-prayer-times {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .prayer-time-item {
            text-align: center;
          }

          .prayer-time-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .prayer-time-value {
            font-size: 16px;
            font-weight: 600;
            color: #212121;
            margin-top: 2px;
          }

          /* Month View Styles */
          .month-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }

          .month-table th {
            background-color: #1B5E20;
            color: white;
            padding: 8px 4px;
            text-align: center;
            font-weight: 600;
            font-size: 11px;
          }

          .month-table td {
            padding: 6px 4px;
            text-align: center;
            border-bottom: 1px solid #e0e0e0;
          }

          .month-table tr:nth-child(even) {
            background-color: #f8f9fa;
          }

          .month-table .date-cell {
            font-weight: 600;
            color: #1B5E20;
            text-align: left;
            padding-left: 8px;
          }

          .month-table .weekend {
            background-color: #E8F5E9;
          }

          .month-table .ramadan {
            background-color: #FFF3E0;
          }

          .ramadan-indicator {
            font-size: 10px;
            margin-left: 4px;
          }

          /* Year View Styles */
          .year-month {
            page-break-inside: avoid;
            margin-bottom: 30px;
          }

          .year-month-title {
            font-size: 18px;
            font-weight: 700;
            color: #1B5E20;
            margin-bottom: 10px;
            padding: 10px;
            background-color: #E8F5E9;
            border-radius: 6px;
          }

          .year-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }

          .year-table th {
            background-color: #1B5E20;
            color: white;
            padding: 6px 3px;
            text-align: center;
            font-weight: 600;
            font-size: 9px;
          }

          .year-table td {
            padding: 4px 3px;
            text-align: center;
            border-bottom: 1px solid #e0e0e0;
          }

          .year-table .date-cell {
            font-weight: 600;
            color: #1B5E20;
            text-align: left;
            padding-left: 6px;
          }

          /* Footer */
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            text-align: center;
            font-size: 12px;
            color: #666;
          }

          .generated-date {
            margin-bottom: 10px;
          }

          .disclaimer {
            font-style: italic;
            font-size: 11px;
          }

          /* Print optimizations */
          @media print {
            .year-month {
              page-break-inside: avoid;
            }
            
            .month-table {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${mosqueLogoBase64}" alt="Mosque Logo" class="logo">
          <div class="mosque-name">Islamic Center</div>
          <div class="document-title">${title}</div>
          <div class="location">Prayer Times Schedule</div>
        </div>

        <div class="content">
          ${content}
        </div>

        <div class="footer">
          <div class="generated-date">
            Generated on ${new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
          <div class="disclaimer">
            Prayer times are calculated based on standard Islamic methods. 
            Please verify with your local mosque for any adjustments.
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
      <h2 style="color: #1B5E20; margin-bottom: 20px; text-align: center;">
        ${date.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
        ${isRamadan ? '<span class="ramadan-indicator">🌙 Ramadan</span>' : ""}
      </h2>
    </div>
  `;

  prayers.forEach((prayer) => {
    content += `
      <div class="day-prayer">
        <div class="day-prayer-name">${prayer.name}</div>
        <div class="day-prayer-times">
          <div class="prayer-time-item">
            <div class="prayer-time-label">Adhan</div>
            <div class="prayer-time-value">${formatTimeForDisplay(
              prayer.jamah
            )}</div>
          </div>
          <div class="prayer-time-item">
            <div class="prayer-time-label">Iqamah</div>
            <div class="prayer-time-value">${formatTimeForDisplay(
              prayer.begins
            )}</div>
          </div>
        </div>
      </div>
    `;
  });

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
          <th>Date</th>
          <th>Fajr</th>
          <th>Fajr Iq.</th>
          <th>Sunrise</th>
          <th>Dhuhr</th>
          <th>Dhuhr Iq.</th>
          <th>Asr</th>
          <th>Asr Iq.</th>
          <th>Maghrib</th>
          <th>Maghrib Iq.</th>
          <th>Isha</th>
          <th>Isha Iq.</th>
        </tr>
      </thead>
      <tbody>
  `;

  sortedData.forEach((prayerTime) => {
    const date = new Date(prayerTime.d_date);
    const prayers = extractPrayersFromTime(prayerTime);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const isRamadan = prayerTime.is_ramadan === 1;

    const rowClass = isRamadan ? "ramadan" : isWeekend ? "weekend" : "";

    content += `
      <tr class="${rowClass}">
        <td class="date-cell">
          ${date.getDate()}
          ${isRamadan ? '<span class="ramadan-indicator">🌙</span>' : ""}
        </td>
    `;

    prayers.forEach((prayer) => {
      if (prayer.name !== "Sunrise") {
        content += `
          <td>${formatTimeForDisplay(prayer.jamah)}</td>
          <td>${formatTimeForDisplay(prayer.begins)}</td>
        `;
      } else {
        content += `<td>${formatTimeForDisplay(prayer.jamah)}</td>`;
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

  Object.keys(monthlyData).forEach((monthKey) => {
    const monthData = monthlyData[monthKey];
    const firstDate = new Date(monthData[0].d_date);
    const monthName = getMonthName(firstDate.getMonth());
    const year = firstDate.getFullYear();

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

    monthData.forEach((prayerTime) => {
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

      prayers.forEach((prayer) => {
        if (prayer.name !== "Sunrise") {
          content += `
            <td>${formatTimeForDisplay(prayer.jamah)}</td>
            <td>${formatTimeForDisplay(prayer.begins)}</td>
          `;
        } else {
          content += `<td>${formatTimeForDisplay(prayer.jamah)}</td>`;
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

  return content;
};

const getMosqueLogoBase64 = (): string => {
  // This is a simple SVG mosque icon encoded as base64
  // Replace this with your actual mosque logo
  const svgIcon = `
    <svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mosqueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#2E7D32;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1B5E20;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Main dome -->
      <ellipse cx="40" cy="35" rx="25" ry="20" fill="url(#mosqueGradient)"/>
      
      <!-- Minaret -->
      <rect x="15" y="25" width="8" height="35" fill="url(#mosqueGradient)"/>
      <rect x="57" y="25" width="8" height="35" fill="url(#mosqueGradient)"/>
      
      <!-- Minaret tops -->
      <ellipse cx="19" cy="25" rx="6" ry="8" fill="url(#mosqueGradient)"/>
      <ellipse cx="61" cy="25" rx="6" ry="8" fill="url(#mosqueGradient)"/>
      
      <!-- Main building -->
      <rect x="20" y="45" width="40" height="25" fill="url(#mosqueGradient)"/>
      
      <!-- Door -->
      <rect x="35" y="55" width="10" height="15" fill="#FFF" opacity="0.8"/>
      
      <!-- Crescent moon on dome -->
      <path d="M 40 15 Q 35 20 40 25 Q 42 20 40 15" fill="#FFD700"/>
      
      <!-- Stars -->
      <circle cx="30" cy="20" r="1" fill="#FFD700"/>
      <circle cx="50" cy="18" r="1" fill="#FFD700"/>
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svgIcon)}`;
};
