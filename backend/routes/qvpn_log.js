import express from 'express';
import axios from 'axios';

const router = express.Router();
const axiosInstance = axios.create();

// GET /logs/server
router.get('/server', async (req, res) => {
  console.log(`[Route] /qvpn/log/server accessed using SID: ${req.sid}`);

  const client = req.app.get('qnapClient');
  const baseUrl = client.getBaseUrl();

  try {
    const urlSearchParams = new URLSearchParams({
        sid: req.sid,
        lower: '0',
        upper: '50',
        field: '4',
        order: 'desc',
      });
    const response = await axiosInstance.post(
      `${baseUrl}/qvpn/log/server`,
      urlSearchParams,
      {
        headers: {
          'accept': 'application/json',
          'cache-control': 'no-cache, no-store',
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'origin': baseUrl,
          'pragma': 'no-cache',
          'sec-fetch-mode': 'cors'
        }
      }
    );

    if (response.status === 200) {
      res.json({ status: true, response: response.data });
    } else {
      res.json({ status: false });
    }
  } catch (error) {
    console.error('[Route] Failed to retrieve server logs:', error.message);
    res.status(500).json({ status: false, error: error.message });
  }
});

// GET /logs/event
router.get('/event', async (req, res) => {
  console.log(`[Route] /qvpn/log/event accessed using SID: ${req.sid}`);

  const client = req.app.get('qnapClient');
  const baseUrl = client.getBaseUrl();

  try {
    const urlSearchParams = new URLSearchParams({ 
      sid: req.sid,
      lower: '0',
      upper: '50',
      sort: '1'
    });
    const response = await axiosInstance.post(
      `${baseUrl}/qvpn/log/event`,
      urlSearchParams,
      {
        headers: {
          'accept': 'application/json',
          'cache-control': 'no-cache, no-store',
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'origin': baseUrl,
          'pragma': 'no-cache',
          'sec-fetch-mode': 'cors'
        }
      }
    );

    if (response.status === 200) {
      res.json({ status: true, response: response.data });
    } else {
      res.json({ status: false });
    }
  } catch (error) {
    console.error('[Route] Failed to retrieve event logs:', error.message);
    res.status(500).json({ status: false, error: error.message });
  }
});

export default router;
