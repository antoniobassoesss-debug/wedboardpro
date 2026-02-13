export interface DemoBookingData {
  id: string;
  email: string;
  name: string;
  company?: string;
  date: string;
  time: string;
  goal?: string;
  team_size?: string;
  meeting_link: string;
}

export function generateDemoBookingEmailHTML(data: DemoBookingData): string {
  const formattedDate = new Date(data.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Demo is Confirmed!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
        <!-- Header -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background-color: #111827; padding: 32px 24px; text-align: center;">
              <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
                <img src="https://www.wedboardpro.com/logo/iconlogo.png" alt="WedBoardPro" width="40" height="40" style="display: block;">
                <span style="font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.025em;">WedBoardPro</span>
              </div>
            </td>
          </tr>
        </table>

        <!-- Content -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: 32px 24px;">
              <!-- Success Icon -->
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 64px; height: 64px; background-color: #dcfce7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12L10 17L19 8" stroke="#16a34a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <h1 style="font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 8px 0;">You're booked!</h1>
                <p style="font-size: 16px; color: #6b7280; margin: 0;">Your demo is confirmed. Check your calendar for the invite!</p>
              </div>

              <!-- Booking Details -->
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding-bottom: 12px; border-bottom: 1px solid #e5e7eb;">
                      <span style="font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Date & Time</span>
                      <div style="font-size: 18px; font-weight: 600; color: #111827; margin-top: 4px;">
                        ${formattedDate} at ${data.time}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top: 12px;">
                      <span style="font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Meeting Link</span>
                      <div style="margin-top: 8px;">
                        <a href="${data.meeting_link}" style="display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">
                          Join Google Meet
                        </a>
                      </div>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- What to Expect -->
              <div style="margin-bottom: 24px;">
                <h3 style="font-size: 16px; font-weight: 600; color: #111827; margin: 0 0 12px 0;">What to expect</h3>
                <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
                  <li>Quick intro (2 min)</li>
                  <li>Live tour tailored to your needs (10 min)</li>
                  <li>Your questions answered (5-8 min)</li>
                </ul>
              </div>

              <!-- Prepare -->
              <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 14px; color: #0c4a6e;">
                  <strong>Tip:</strong> Come prepared with 1-2 specific workflows you'd like to see, and we'll focus the demo on those!
                </p>
              </div>

              <!-- Questions -->
              <div style="text-align: center; padding-top: 8px;">
                <p style="font-size: 14px; color: #6b7280; margin: 0 0 8px 0;">Questions before your demo?</p>
                <a href="mailto:hello@wedboardpro.com" style="font-size: 14px; color: #2563eb; text-decoration: none; font-weight: 500;">hello@wedboardpro.com</a>
              </div>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 12px; color: #9ca3af; margin: 0 0 8px 0;">
                © ${new Date().getFullYear()} WedBoardPro · António Basso, Portugal
              </p>
              <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                <a href="https://www.wedboardpro.com/privacy" style="color: #9ca3af; text-decoration: none;">Privacy</a>
                ·
                <a href="https://www.wedboardpro.com/terms" style="color: #9ca3af; text-decoration: none;">Terms</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

export function generateICSAttachment(data: DemoBookingData): string {
  const startDate = new Date(`${data.date}T${convertTo24Hour(data.time)}:00`);
  const endDate = new Date(startDate.getTime() + 20 * 60 * 1000);

  const formatICSDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//WedBoardPro//Demo Booking//EN
BEGIN:VEVENT
UID:${data.id}@wedboardpro.com
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:WedBoardPro Demo - ${data.name}
DESCRIPTION:Your personalized demo with WedBoardPro\\n\\nName: ${data.name}\\nCompany: ${data.company || 'N/A'}\\nGoal: ${data.goal || 'N/A'}
LOCATION:${data.meeting_link}
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Reminder: WedBoardPro Demo in 15 minutes
END:VALARM
END:VEVENT
END:VCALENDAR`;
}

function convertTo24Hour(time12h: string): string {
  const parts = time12h.split(' ');
  const time = parts[0] ?? '00:00';
  const modifier = parts[1] ?? '';
  const [hours = '00', minutes = '00'] = time.split(':');

  let hours24 = parseInt(hours, 10);

  if (hours === '12') {
    hours24 = 0;
  }

  if (modifier === 'PM') {
    hours24 = hours24 + 12;
  }

  return `${String(hours24).padStart(2, '0')}:${minutes}`;
}
