const fetch = require('node-fetch'); // Ensure you have node-fetch installed if needed

exports.handler = async (event) => {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL || 'n8n@aussiebb.com.au';
  const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'senioros@example.com';

  if (!RESEND_API_KEY) {
    console.error('Email service is not configured.');
    return { statusCode: 500, body: JSON.stringify({ error: 'Email service is not configured.' }) };
  }

  try {
    let data;
    try {
      data = JSON.parse(event.body);
    } catch (error) {
      console.error('Invalid request:', error.message);
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request.' }) };
    }

    const name = String(data.name || '').trim();
    const email = String(data.email || '').trim();
    const amount = String(data.amount || '').trim();
    const message = String(data.message || '').trim();

    if (!name || !email || !amount || !/^\S+@\S+\.\S+$/.test(email)) {
      console.error('Invalid input:', name, email, amount);
      return { statusCode: 400, body: JSON.stringify({ error: 'Please provide a valid name, email address and donation amount.' }) };
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [RECIPIENT_EMAIL],
        reply_to: email,
        subject: `New SeniorsOS donation message — $${amount} AUD`,
        text: [
          'New donation message from the SeniorsOS website',
          '',
          `Name: ${name}`,
          `Email: ${email}`,
          `Donation amount: $${amount} AUD`,
          '',
          'Message:',
          message || '(No additional message provided.)'
        ].join('\n')
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resend error:', errorText);
      return { statusCode: 502, body: JSON.stringify({ error: 'The message could not be sent. Please try again later.' }) };
    }

    console.log('Email sent successfully.');
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };

  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: 'An unexpected error occurred.' }) };
  }
};