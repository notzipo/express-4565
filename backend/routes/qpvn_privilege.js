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
        '_': Date.now()
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
    _: Date.now()
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

// GET /privilege/block_show
router.get('/block_show', async (req, res) => {
  console.log(`[Route] /qvpn/privilege/block_show accessed using SID: ${req.sid}`);
  const bodyParams = new URLSearchParams({
    sid: req.sid,
    _: Date.now()
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

// GET /privilege/remove_block_user
router.get('/remove_block_user/:user', async (req, res) => {
  console.log(`[Route] GET /qvpn/privilege/remove_block_user accessed using SID: ${req.sid}`);
  const bodyParams = new URLSearchParams({
    user: req.params.user,
    sid: req.sid,
    _: Date.now()
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
