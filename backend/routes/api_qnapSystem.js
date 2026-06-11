import express from 'express';
import Base62Token from 'base62-token';
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

const BASE62ToAsciiPaded = (text) => {
  return "A" + Array.from(text).map(char => char.charCodeAt(0).toString().padStart(3, 0)).join('');
}

const deBASE62ToAsciiPaded = (text) => {
  return text.slice(1).match(new RegExp('.{1,' + 3 + '}', 'g')).map(x => String.fromCharCode(x)).join('')
}

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const b62Token = Base62Token.create(BASE62);

function genPasswd() {
  return b62Token.generate("", 2);
}

function toBase62(str) {
  if (!str) return '';
  // Encode input string bytes as a BigInt, then convert to base-62
  const bytes = new TextEncoder().encode(str);
  let num = 0n;
  for (const byte of bytes) {
    num = num * 256n + BigInt(byte);
  }
  if (num === 0n) return '0';
  let result = '';
  while (num > 0n) {
    result = BASE62[Number(num % 62n)] + result;
    num = num / 62n;
  }
  return result;
}

// Check user is exists
router.get('/user_create/check_user/:uname', async (req, res) => {
  console.log(`[Route] /api/qnap/user_create/check_user accessed using SID: ${req.sid}, checking username: ${req.params.uname}`);

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
      const exists = xmlParsed.QDocRoot.func.ownContent.return == -1
      if (exists) {
        req.needUserInfo = true;
        req.params.userName = req.params.uname
        getUserInfo(req, res);
      } else {
        res.json({ status: true, data: { exists: false } });
      }
    } else {
      res.json({ status: false });
    }
  } catch (error) {
    console.error('[Route] Failed to retrieve connection list:', error.message);
    res.status(500).json({ status: false, error: error.message });
  }
});

// Add User
router.post('/user_create/add_user', async (req, res) => {
  const { uname, email, given_name, department } = req.body;
  console.log(`[Route] /api/qnap/user_create/add_user accessed using SID: ${req.sid}, creating user: ${uname}`);

  // console.log('uname', uname, "a_tel", String(toBase62(uname)),)
  const client = req.app.get('qnapClient');
  const baseUrl = client.getBaseUrl();
  const bodyParams = new URLSearchParams({
    set_app_privilege: '1',
    rd_share_len: '1',
    rd_share0: 'Public',
    rw_share_len: '0',
    no_share_len: '0',
    a_tel_country_code: '',
    a_tel: BASE62ToAsciiPaded(String(toBase62(uname))) || '',
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
    a_fullname: given_name,
    a_passwd: stringToBase64(toBase62(uname)) || 'UGVhQDEyMzQ%3D',
    a_email: email || '',
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


const getUserInfo = async (req, res) => {
  console.log(`[Route] /api/qnap/user/info accessed using SID: ${req.sid}`);

  const client = req.app.get('qnapClient');
  const baseUrl = client.getBaseUrl();

  try {
    const urlSearchParams = new URLSearchParams({ sid: req.sid, wiz_func: 'user_edit', userName: req.params.userName, type: 0 });
    const response = await axiosInstance.post(
      `${baseUrl}/cgi-bin/priv/privWizard.cgi`,
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
      const userInfoData = {
        userInfo: xmlParsed.QDocRoot.userInfo
      }

      if (req.needUserInfo) {
        res.json({ status: true, data: { exists: true, ...userInfoData } });
      } else {
        res.json({ status: true, response: userInfoData });
      }
    } else {
      res.json({ status: false });
    }
  } catch (error) {
    console.error('[Route] Failed to retrieve userInfo:', error.message);
    res.status(500).json({ status: false, error: error.message });
  }
}

// Get UserInfo
router.get('/user/info/:userName', getUserInfo);

// Update UserInfo
const updateUserInfo = async (req, res) => {
  const { userName } = req.params;
  const { a_fullname, a_tel, a_description, } = req.body;
  console.log(`[Route] POST /api/qnap/user/info/${userName} accessed using SID: ${req.sid}`);

  const client = req.app.get('qnapClient');
  const baseUrl = client.getBaseUrl();

  try {
    const urlSearchParams = new URLSearchParams({
      wiz_func: 'user_edit', action: 'account_edit', type: '0',
      username: userName,
      a_fullname: a_fullname || '',
      a_tel: a_tel || '',
      a_description: a_description || '',
    });

    const response = await axiosInstance.post(
      `${baseUrl}/cgi-bin/priv/privWizard.cgi?sid=${req.sid}`,
      urlSearchParams,
      {
        headers: {
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Connection': 'keep-alive',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Origin': baseUrl,
          'Referer': `${baseUrl}/cgi-bin/`,
          'X-Requested-With': 'XMLHttpRequest'
        }
      }
    );

    if (response.status === 200) {
      const xmlText = response.data;
      const xmlParsed = new XMLParser().parse(typeof xmlText === 'string' ? xmlText.trim() : xmlText);
      const authPassed = xmlParsed?.QDocRoot?.authPassed;
      res.json({ status: true, data: { authPassed } });
    } else {
      res.json({ status: false });
    }
  } catch (error) {
    console.error(`[Route] Failed to update user info for ${userName}:`, error.message);
    res.status(500).json({ status: false, error: error.message });
  }
};
router.post('/user/info/:userName', updateUserInfo);

// User change password
router.post('/user/passwd/:userName', async (req, res) => {
  const { userName } = req.params;
  const { fullname, description } = req.body;

  console.log(`[Route] POST /api/qnap/user/passwd/${userName} accessed using SID: ${req.sid}`);

  const client = req.app.get('qnapClient');
  const baseUrl = client.getBaseUrl();

  const newPasswd = genPasswd();
  try {
    const urlSearchParams = new URLSearchParams({
      wiz_func: 'user_password_edit', action: 'user_password_edit',
      username: userName,
      password: stringToBase64(newPasswd) || 'UGVhQDEyMzQ=',
      old_password: '',
      need_check: 'no',
    });

    const response = await axiosInstance.post(
      `${baseUrl}/cgi-bin/priv/privWizard.cgi?sid=${req.sid}&wiz_func=user_password_edit&action=user_password_edit`,
      urlSearchParams,
      {
        headers: {
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Connection': 'keep-alive',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Origin': baseUrl,
          'Referer': `${baseUrl}/cgi-bin/`,
          'X-Requested-With': 'XMLHttpRequest'
        }
      }
    );

    if (response.status === 200) {
      const xmlText = response.data;
      const xmlParsed = new XMLParser().parse(typeof xmlText === 'string' ? xmlText.trim() : xmlText);
      const authPassed = xmlParsed?.QDocRoot?.authPassed;

      req.body.a_fullname = fullname;
      req.body.a_tel = BASE62ToAsciiPaded(newPasswd);
      req.body.a_description = description;

      updateUserInfo(req, res);
    } else {
      res.json({ status: false });
    }
  } catch (error) {
    console.error(`[Route] Failed to update user info for ${userName}:`, error.message);
    res.status(500).json({ status: false, error: error.message });
  }
});

export default router;
