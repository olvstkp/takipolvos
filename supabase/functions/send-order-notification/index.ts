import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const NOTIFICATION_EMAIL = Deno.env.get('NOTIFICATION_EMAIL') || 'info@olivosltd.com'

interface OrderData {
  order_number: string
  company_name: string
  contact_person: string
  email: string
  phone: string
  country: string
  estimated_value: number
  currency: string
  total_items: number
  order_date: string
  additional_message?: string
}

serve(async (req) => {
  const { method } = req

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const orderData: OrderData = await req.json()

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a365d; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
          🛒 Yeni Sipariş Bildirimi
        </h2>
        
        <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2d3748; margin-top: 0;">Sipariş Detayları</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Sipariş No:</td>
              <td style="padding: 8px 0; color: #2d3748;">${orderData.order_number}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Tarih:</td>
              <td style="padding: 8px 0; color: #2d3748;">${new Date(orderData.order_date).toLocaleDateString('tr-TR')}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Tahmini Değer:</td>
              <td style="padding: 8px 0; color: #2d3748; font-weight: bold; color: #38a169;">${orderData.currency} ${orderData.estimated_value.toFixed(2)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Toplam Kalem:</td>
              <td style="padding: 8px 0; color: #2d3748;">${orderData.total_items}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #edf2f7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2d3748; margin-top: 0;">Müşteri Bilgileri</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #cbd5e0;">
              <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Şirket:</td>
              <td style="padding: 8px 0; color: #2d3748;">${orderData.company_name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #cbd5e0;">
              <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">İletişim Kişisi:</td>
              <td style="padding: 8px 0; color: #2d3748;">${orderData.contact_person}</td>
            </tr>
            <tr style="border-bottom: 1px solid #cbd5e0;">
              <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">E-posta:</td>
              <td style="padding: 8px 0; color: #2d3748;">
                <a href="mailto:${orderData.email}" style="color: #3182ce; text-decoration: none;">
                  ${orderData.email}
                </a>
              </td>
            </tr>
            <tr style="border-bottom: 1px solid #cbd5e0;">
              <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Telefon:</td>
              <td style="padding: 8px 0; color: #2d3748;">
                <a href="tel:${orderData.phone}" style="color: #3182ce; text-decoration: none;">
                  ${orderData.phone}
                </a>
              </td>
            </tr>
            <tr style="border-bottom: 1px solid #cbd5e0;">
              <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Ülke:</td>
              <td style="padding: 8px 0; color: #2d3748;">${orderData.country}</td>
            </tr>
          </table>
        </div>

        ${orderData.additional_message ? `
          <div style="background-color: #fef5e7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ed8936;">
            <h3 style="color: #744210; margin-top: 0;">📝 Müşteri Mesajı</h3>
            <p style="color: #744210; margin: 0; font-style: italic;">
              "${orderData.additional_message}"
            </p>
          </div>
        ` : ''}

        <div style="background-color: #e6fffa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <p style="color: #285e61; margin: 0;">
            🌿 Bu sipariş Olivos Takip Sistemi üzerinden otomatik olarak gönderilmiştir.
          </p>
        </div>
      </div>
    `

    // Resend API kullanarak email gönder
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev', // Domainsiz için Resend'in default adresi
        to: [NOTIFICATION_EMAIL],
        subject: `🛒 Yeni Sipariş: ${orderData.order_number} - ${orderData.company_name}`,
        html: emailHtml,
        reply_to: orderData.email,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } else {
      const error = await res.text()
      throw new Error(`Resend API error: ${error}`)
    }

  } catch (error) {
    console.error('Error sending email notification:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
