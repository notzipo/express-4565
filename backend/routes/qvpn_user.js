import express from 'express';
import axios from 'axios';

const router = express.Router();
const axiosInstance = axios.create();

router.get('/query', async (req, res) => {
  console.log(`[Route] /qvpn/user/query accessed using SID: ${req.sid}`);

  const client = req.app.get('qnapClient');
  const baseUrl = client.getBaseUrl();

  try {
    const urlSearchParams = new URLSearchParams({ sid: req.sid });
    const response = await axiosInstance.post(
      `${baseUrl}/qvpn/user/query`,
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
    console.error('[Route] Failed to retrieve connection list:', error.message);
    res.status(500).json({ status: false, error: error.message });
  }
});

export default router;
