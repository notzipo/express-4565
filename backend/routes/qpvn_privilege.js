import express from 'express';
import axios from 'axios';

const router = express.Router();
const axiosInstance = axios.create();

// POST /privilege/set
router.post('/set', async (req, res) => {
  console.log(`[Route] /qvpn/privilege/set accessed using SID: ${req.sid}`);
  const requestBody = req.body;
  console.log(`[Route] requestBody:`, requestBody);

  const client = req.app.get('qnapClient');
  const baseUrl = client.getBaseUrl();

  try {
    const response = await axios.post(
      `${baseUrl}/qvpn/privilege/set`,
      new URLSearchParams({
        'user[0]': `${requestBody.user}|4`,
        'sid': req.sid,
        '_': new Date().getTime()
      }),
      {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache, no-store',
          'Connection': 'keep-alive',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Origin': baseUrl,
          'Pragma': 'no-cache'
        }
      }
    );

    if (response.status === 200) {
      res.json({ status: true, response: response.data });
    } else {
      res.json({ status: false });
    }
  } catch (error) {
    console.error('[Route] Failed:', error.message);
    res.status(500).json({ status: false, error: error.message });
  }
});

// POST /privilege/get
router.post('/get', async (req, res) => {
  console.log(`[Route] /qvpn/privilege/get accessed using SID: ${req.sid}`);
  const bodyParams = new URLSearchParams({
    lower: 0,
    upper: 50,
    sid: req.sid,
    _: new Date().getTime()
  });
  // exit(0); // Terminate the server after responding to the request

  const client = req.app.get('qnapClient');
  const baseUrl = client.getBaseUrl();

  try {
    const response = await axiosInstance.post(
      `${baseUrl}/qvpn/privilege/get`,
      bodyParams,
      {
        headers: {
          'accept': 'application/json, text/plain, */*',
          'cache-control': 'no-cache, no-store',
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'origin': baseUrl,
        },
      }
    );

    if (response.status === 200) {
      res.json({ status: true, response: response.data });
    } else {
      res.json({ status: false });
    }
  } catch (error) {
    console.error('[Route] Failed:', error.message);
    res.status(500).json({ status: false, error: error.message });
  }
});


// curl 'http://182.168.1.110:8080/qvpn/privilege/block_show' \
//   -H 'Accept: application/json, text/plain, */*' \
//   -H 'Accept-Language: en-US,en;q=0.9,th;q=0.8' \
//   -H 'Cache-Control: no-cache, no-store' \
//   -H 'Connection: keep-alive' \
//   -H 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8' \
//   -H 'Origin: http://182.168.1.110:8080' \
//   -H 'Pragma: no-cache' \
//   -H 'Referer: http://182.168.1.110:8080/qvpn/?v=3.3.1552&date=2026-05-27&windowId=q-app-QVPN-1626' \
//   --data-raw 'sid=gknv1imi&_=1781147842833' \
//   --insecure

// fetch("http://182.168.1.110:8080/qvpn/privilege/block_show", {
//   "headers": {
//     "accept": "application/json, text/plain, */*",
//     "accept-language": "en-US,en;q=0.9,th;q=0.8",
//     "cache-control": "no-cache, no-store",
//     "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
//     "pragma": "no-cache",
//     "cookie": "NAS_PW_STATUS=0; showAllAp=true; isvideoenabled=true; nas_lang=ENG; diskErrCode=none; PHPSESSID=024c6a34fffd284be8c31b2aa37795e6; NAS_USER=omd; NAS_SID=gknv1imi; home=1; QMonitor=1781147835578; QT=1781147841265",
//     "Referer": "http://182.168.1.110:8080/qvpn/?v=3.3.1552&date=2026-05-27&windowId=q-app-QVPN-1626"
//   },
//   "body": "sid=gknv1imi&_=1781147842833",
//   "method": "POST"
// });


// GET /privilege/block_show
router.get('/block_show', async (req, res) => {
  console.log(`[Route] /qvpn/privilege/block_show accessed using SID: ${req.sid}`);
  const bodyParams = new URLSearchParams({
    sid: req.sid,
    _: new Date().getTime()
  });
  // exit(0); // Terminate the server after responding to the request

  const client = req.app.get('qnapClient');
  const baseUrl = client.getBaseUrl();

  try {
    const response = await axiosInstance.post(
      `${baseUrl}/qvpn/privilege/block_show`,
      bodyParams,
      {
        headers: {
          'accept': 'application/json, text/plain, */*',
          'cache-control': 'no-cache, no-store',
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'origin': baseUrl,
        },
      }
    );

    if (response.status === 200) {
      res.json({ status: true, response: response.data });
    } else {
      res.json({ status: false });
    }
  } catch (error) {
    console.error('[Route] Failed:', error.message);
    res.status(500).json({ status: false, error: error.message });
  }
});

// fetch("http://182.168.1.110:8080/qvpn/privilege/remove_block_user", {
//   "headers": {
//     "accept": "application/json, text/plain, */*",
//     "cache-control": "no-cache, no-store",
//     "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
//     "pragma": "no-cache",
//     "Referer": "http://182.168.1.110:8080/qvpn/?v=3.3.1552&date=2026-05-27&windowId=q-app-QVPN-1648"
//   },
//   "body": "user=495277&sid=gknv1imi&_=1781158979609",
//   "method": "POST"
// });

// GET /privilege/remove_block_user
router.get('/remove_block_user/:user', async (req, res) => {
  console.log(`[Route] GET /qvpn/privilege/remove_block_user accessed using SID: ${req.sid}`);
  const bodyParams = new URLSearchParams({
    user: req.params.user,
    sid: req.sid,
    _: new Date().getTime()
  });

  const client = req.app.get('qnapClient');
  const baseUrl = client.getBaseUrl();
  try {
    const response = await axiosInstance.post(
      `${baseUrl}/qvpn/privilege/remove_block_user`,
      bodyParams,
      {
        headers: {
          'accept': 'application/json, text/plain, */*',
          'cache-control': 'no-cache, no-store',
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'origin': baseUrl,
        },
      }
    );

    if (response.status === 200) {
      res.json({ status: true, response: response.data });
    } else {
      res.json({ status: false });
    }
  } catch (error) {
    console.error('[Route] Failed:', error.message);
    res.status(500).json({ status: false, error: error.message });
  }
});

export default router;
