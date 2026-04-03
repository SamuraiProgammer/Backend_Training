const axios = require("axios");

async function sendMobileSMS(number, otp) {
  const params = {
    username: "manopath",
    message: `Your OTP is ${otp}. Please do not share this OTP with anyone. This OTP is valid for the next 10 minutes. – OneKeyCare`,
    sendername: "OKPATH",
    smstype: "TRANS",
    numbers: number,
    apikey: "b1fe9169-8a78-4b2a-acbb-6d21707d5be1",
    peid: "1201159411077301063",
    templateid: "1207174825812250890",
  };

  const url = "https://sms.bulksmsind.in/v2/sendSMS";

  // Use URLSearchParams for query string construction
  const qs = new URLSearchParams(params);

  try {
    const response = await axios.get(`${url}?${qs.toString()}`);
    // You may want to check the response for success/failure
    return response.data;
  } catch (error) {
    console.error(
      "SMS error:",
      error.response ? error.response.data : error.message
    );
    throw error;
  }
}

module.exports = sendMobileSMS;
