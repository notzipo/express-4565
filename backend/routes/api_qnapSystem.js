import express from 'express';
import xml from 'xml';
import { XMLParser } from 'fast-xml-parser';
import axios from 'axios';

const router = express.Router();
const axiosInstance = axios.create();

function stringToBase64(str) {
  // 1. Convert string to a stream of UTF-8 bytes
  const utf8Bytes = new TextEncoder().encode(str);
  // 2. Convert bytes to a binary string
  const binaryString = String.fromCharCode(...utf8Bytes);
  // 3. Encode the binary string to Base64
  return btoa(binaryString);
}

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function encodeBase62(num) {
    if (num === 0) return ALPHABET[0];
    let encoded = "";
    while (num > 0) {
        encoded = ALPHABET[num % 62] + encoded;
        num = Math.floor(num / 62);
    }
    return encoded;
}

function decodeBase62(str) {
    let decoded = 0;
    for (let i = 0; i < str.length; i++) {
        decoded = decoded * 62 + ALPHABET.indexOf(str[i]);
    }
    return decoded;
}

// Check Exist QNAP Local Username
// GET /api/qnap/user_create/check_user/:uname
router.get('/user_create/check_user/:uname', async (req, res) => {
  console.log(`[Route] /qnap/check_user accessed using SID: ${req.sid}, checking username: ${req.params.uname}`);
  
  const client = req.app.get('qnapClient');
  const baseUrl = client.getBaseUrl();

  try {
    const urlSearchParams = new URLSearchParams({ 
      sid: req.sid,
      wiz_func: 'user_create',
      action: 'check_user',
      uname: req.params.uname
    });
    const response = await axiosInstance.post(
      `${baseUrl}/cgi-bin/wizReq.cgi`,
      urlSearchParams,
      {
        headers: {
          'accept': '*/*',
          'cache-control': 'no-cache, no-store',
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'origin': baseUrl,
          'pragma': 'no-cache',
          'sec-fetch-mode': 'cors'
        }
      }
    );

    if (response.status === 200) {
      const xmlText = await response.data;
      const xmlParsed = new XMLParser().parse(xmlText.trim());
      res.json({ status: true, data: { exists: xmlParsed.QDocRoot.func.ownContent.return == -1} });
    } else {
      res.json({ status: false });
    }
  } catch (error) {
    console.error('[Route] Failed to retrieve connection list:', error.message);
    res.status(500).json({ status: false, error: error.message });
  }
});

// Add QNAP new Local Username
// POST /api/qnap/user_create/add_user
router.post('/user_create/add_user', async (req, res) => {
  const { uname, email, given_name, department } = req.body;
  console.log(`[Route] /api/qnap/user_create/add_user accessed using SID: ${req.sid}, creating user: ${uname}`);
  // return res.json({ status: true, data: { settingResult: true } });
  // exit(0);

  const client = req.app.get('qnapClient');
  const baseUrl = client.getBaseUrl();
  const bodyParams = new URLSearchParams({
    set_app_privilege: '1',
    rd_share_len: '1',
    rd_share0: 'Public',
    rw_share_len: '0',
    no_share_len: '0',
    a_tel_country_code: '',
    a_tel: '',
    email: email || '',
    ps: '',
    gp_len: '2',
    gp0: 'everyone',
    gp1: 'PEAUsers',
    hidden: 'no',
    oplocks: '1',
    create_priv: '0',
    comment: '',
    vol_no: '1',
    a_username: uname,
    a_passwd: stringToBase64(encodeBase62(uname)) || 'UGVhQDEyMzQ%3D', // Base64 of 'Pea@1234'
    a_email: '',
    a_description: `${given_name} [${department || 'N/A'}]`,
    recursive: '1',
    force_change_pw: '0',
    send_mail: '0',
    app_name1: 'AFP',
    app_privilege1: '1',
    app_name2: 'FTP',
    app_privilege2: '1',
    app_name3: 'SAMBA',
    app_privilege3: '1',
    app_name4: 'WEBDAV',
    app_privilege4: '1',
    app_name5: 'WFM',
    app_privilege5: '1',
    recycle_bin: '0',
    recycle_bin_administrators_only: '0'
  });

  try {
    const response = await axiosInstance.post(
      `${baseUrl}/cgi-bin/wizReq.cgi?sid=${req.sid}&wiz_func=user_create&action=add_user`,
      {
        headers: {
          'accept': '*/*',
          'cache-control': 'no-cache, no-store',
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'origin': baseUrl,
          'pragma': 'no-cache',
          'sec-fetch-mode': 'cors'
        },
        body: bodyParams.toString()
      },
    );
    if (response.status === 200) {
      const xmlText = await response.data;
      const xmlParsed = new XMLParser().parse(xmlText.trim());
      res.json({ status: true, data: { settingResult: xmlParsed.setting_result ? false : true } });
    } else {
      res.json({ status: false });
    }
  } catch (error) {
    console.error('[Route] Failed to retrieve connection list:', error.message);
    res.status(500).json({ status: false, error: error.message });
  }
});

export default router;
