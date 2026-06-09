import http from 'http';
import url from 'url';
import dotenv from 'dotenv';

dotenv.config();

const port = process.env.MOCK_SERVER_PORT || 3000;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  console.log(`[MockServer] Received request: ${req.method} ${req.url}`);

  if (pathname === '/cgi-bin/authLogin.cgi') {
    const { user, plain_pwd, sid, renew } = parsedUrl.query;

    res.setHeader('Content-Type', 'text/xml; charset=utf-8');

    // Case 1: Session check endpoint
    if (sid !== undefined) {
      if (sid === 'pl9ejof1' || sid === 'ral08opo' || sid === 'renewed_sid_xyz789') {
        console.log(`[MockServer] Session check successful for SID: ${sid}`);
        const successXml = `<?xml version="1.0" encoding="UTF-8" ?>
<QDocRoot version="1.0">
    <authPassed><![CDATA[1]]></authPassed>
</QDocRoot>`;
        res.writeHead(200);
        res.end(successXml);
      } else {
        console.log(`[MockServer] Session check failed for SID: ${sid}`);
        const failureXml = `<?xml version="1.0" encoding="UTF-8" ?>
<QDocRoot version="1.0">
    <authPassed>0</authPassed>
</QDocRoot>`;
        res.writeHead(200);
        res.end(failureXml);
      }
    } else if (renew !== undefined) {
      // Case 2: Session renewal endpoint
      if (user === 'omd' && plain_pwd === '1234') {
        console.log(`[MockServer] Session renewal successful for user: ${user}`);
        const successXml = `<?xml version="1.0" encoding="UTF-8" ?>
<QDocRoot version="1.0">
    <qtoken><![CDATA[renewed_qtoken_abc123]]></qtoken>
    <authPassed><![CDATA[1]]></authPassed>
    <authSid><![CDATA[renewed_sid_xyz789]]></authSid>
    <isAdmin><![CDATA[1]]></isAdmin>
</QDocRoot>`;
        res.writeHead(200);
        res.end(successXml);
      } else {
        console.log(`[MockServer] Session renewal failed for user: ${user}`);
        const failureXml = `<?xml version="1.0" encoding="UTF-8" ?>
<QDocRoot version="1.0">
    <qtoken>0</qtoken>
    <authPassed>0</authPassed>
    <errorValue>-1</errorValue>
</QDocRoot>`;
        res.writeHead(200);
        res.end(failureXml);
      }
    } else {
      // Case 3: Standard authentication endpoint
      if (user === 'omd' && plain_pwd === '1234') {
        console.log(`[MockServer] Authentication successful for user: ${user}`);
        const successXml = `<?xml version="1.0" encoding="UTF-8" ?>
<QDocRoot version="1.0">
    <qtoken><![CDATA[1e29b890910e8135f1692ed4030256fe]]></qtoken>
    <authPassed><![CDATA[1]]></authPassed>
    <authSid><![CDATA[ral08opo]]></authSid>
    <isAdmin><![CDATA[1]]></isAdmin>
</QDocRoot>`;
        res.writeHead(200);
        res.end(successXml);
      } else {
        console.log(`[MockServer] Authentication failed for user: ${user}`);
        const failureXml = `<?xml version="1.0" encoding="UTF-8" ?>
<QDocRoot version="1.0">
    <qtoken>0</qtoken>
    <authPassed>0</authPassed>
    <errorValue>-1</errorValue>
</QDocRoot>`;
        res.writeHead(200);
        res.end(failureXml);
      }
    }
  } else if (pathname === '/qvpn/connection/list') {
    console.log('[MockServer] Connection list requested.');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.writeHead(200);
    res.end(JSON.stringify({
      status: true,
      connections: [
        {
          username: 'john_doe',
          connectionType: 'OpenVPN',
          ipAddress: '10.8.0.2',
          loginTime: '2026-06-03T18:00:00Z',
          duration: '01:50:00'
        }
      ]
    }));
  } else if (pathname === '/qvpn/misc/interface_rate') {
    console.log('[MockServer] Interface rate requested.');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.writeHead(200);
    res.end(JSON.stringify({
      status: true,
      txRate: 1024,
      rxRate: 2048
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(port, () => {
  console.log(`[MockServer] QNAP Auth Mock Server running at http://localhost:${port}/`);
});
