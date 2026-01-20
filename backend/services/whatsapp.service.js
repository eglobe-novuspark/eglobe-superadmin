// services/whatsapp.service.js
const axios = require('axios');

class WhatsAppService {
  constructor() {
    this.apiUrl = 'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/';
    this.authKey = process.env.MSG91_AUTH_KEY;
    this.whatsappNumber = '916200422830'; // Your MSG91 WhatsApp number
    this.templateNamespace = '188e31b2_1263_4796_b81b_735ee544ed83';
  }

  async sendSchoolOnboarding(schoolData, adminData) {
    try {
      // Format phone number: +919876543210 → 919876543210
      const formattedPhone = adminData.phone.replace('+', '');
      
      const payload = {
        integrated_number: this.whatsappNumber,
        content_type: "template",
        payload: {
          messaging_product: "whatsapp",
          type: "template",
          template: {
            name: "school_onboarding", // Your template name
            language: { code: "en_US", policy: "deterministic" },
            namespace: this.templateNamespace,
            to_and_components: [
              {
                to: [formattedPhone],
                components: {
                  body_1: { type: "text", value: adminData.name },
                  body_2: { type: "text", value: schoolData.name },
                  body_3: { type: "text", value: schoolData.code },
                  body_4: { type: "text", value: "https://app.edglobe.com/login" },
                  body_5: { type: "text", value: adminData.username },
                  body_6: { type: "text", value: "1800-123-4567" }
                }
              }
            ]
          }
        }
      };

      console.log('Sending WhatsApp with payload:', JSON.stringify(payload, null, 2));

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'authkey': this.authKey
        }
      });

      console.log('MSG91 WhatsApp Response:', response.data);

      return {
        success: true,
        messageId: response.data?.message_id,
        response: response.data
      };

    } catch (error) {
      console.error('MSG91 WhatsApp Error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  // Fallback: Send SMS via MSG91 if WhatsApp fails
  async sendSMSFallback(schoolData, adminData) {
    try {
      const smsPayload = {
        sender: 'EDGLBE',
        route: '4', // Transactional route
        country: '91',
        sms: [
          {
            message: `Welcome to EDGlobe Family! Hi ${adminData.name}, your school "${schoolData.name}" (Code: ${schoolData.code}) is ready! Login: https://app.edglobe.com/login Username: ${adminData.username}`,
            to: [adminData.phone.replace('+', '')]
          }
        ]
      };

      const response = await axios.post(
        'https://control.msg91.com/api/v5/flow/',
        smsPayload,
        {
          headers: {
            'authkey': this.authKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return { success: true, type: 'sms', response: response.data };
      
    } catch (error) {
      console.error('SMS fallback error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new WhatsAppService();