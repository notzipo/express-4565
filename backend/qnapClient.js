import { XMLParser } from 'fast-xml-parser';
import fs from 'node:fs/promises';

/**
 * QnapClient handles connection and authentication with a QNAP server.
 */
export class QnapClient {
  /**
   * Create a QnapClient instance.
   * @param {Object} config - Configuration options
   * @param {string} config.ip - QNAP server IP address
   * @param {number|string} [config.port=8080] - QNAP server port
   * @param {string} config.username - Username for login
   * @param {string} config.password - Password for login
   * @param {string} [config.currentSid=null] - Pre-existing session ID (SID) to validate
   * @param {boolean} [config.useMockServer=false] - Whether to use local mock server
   * @param {number|string} [config.mockPort=3000] - Port of local mock server
   * @param {string} [config.sessionFilePath='./session.json'] - Path to save/load session credentials
   */
  constructor({ ip, port = 8080, username, password, currentSid = null, useMockServer = false, mockPort = 3000, sessionFilePath = './session.json' } = {}) {
    this.ip = ip;
    this.port = port;
    this.username = username;
    this.password = password;
    this.currentSid = currentSid;
    this.useMockServer = useMockServer;
    this.mockPort = mockPort;
    this.sessionFilePath = sessionFilePath;
    this.sid = null;
    this.qtoken = null;
    this.parser = new XMLParser();
    this.renewalIntervalId = null;
  }

  /**
   * Get the base URL for the QNAP service
   * @returns {string}
   */
  getBaseUrl() {
    if (this.useMockServer) {
      return `http://localhost:${this.mockPort}`;
    }
    return `http://${this.ip}:${this.port}`;
  }

  /**
   * Load session from the local file system.
   * @returns {Promise<{sid: string, qtoken: string}|null>}
   */
  async loadSession() {
    try {
      const data = await fs.readFile(this.sessionFilePath, 'utf8');
      const session = JSON.parse(data);
      if (session?.sid) {
        this.sid = session.sid;
        this.qtoken = session.qtoken;
        return session;
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn(`[QnapClient] Failed to load session from ${this.sessionFilePath}:`, error.message);
      }
    }
    return null;
  }

  /**
   * Save session to the local file system.
   * @param {string} sid 
   * @param {string|number} qtoken 
   */
  async saveSession(sid, qtoken) {
    try {
      this.sid = sid;
      this.qtoken = qtoken;
      const data = JSON.stringify({
        sid,
        qtoken,
        lastUpdated: new Date().toISOString()
      }, null, 2);
      await fs.writeFile(this.sessionFilePath, data, 'utf8');
      console.log(`[QnapClient] Session stored in ${this.sessionFilePath}`);
    } catch (error) {
      console.error(`[QnapClient] Failed to save session to ${this.sessionFilePath}:`, error.message);
    }
  }

  /**
   * Log into QNAP authentication service and retrieve the Session ID (SID).
   * @returns {Promise<{success: boolean, sid?: string, qtoken?: string|number, isAdmin?: boolean, errorValue?: any}>}
   */
  async login() {
    const baseUrl = this.getBaseUrl();
    
    // Construct the login URL as requested
    const loginUrl = `${baseUrl}/cgi-bin/authLogin.cgi?user=${encodeURIComponent(this.username)}&plain_pwd=${encodeURIComponent(this.password)}&remme=1`;

    console.log(`[QnapClient] Initiating login request to: ${baseUrl}/cgi-bin/authLogin.cgi`);

    try {
      const response = await fetch(loginUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const xmlText = await response.text();
      console.log(`[QnapClient] Raw response received`);

      const result = this.parser.parse(xmlText);

      if (!result?.QDocRoot) {
        throw new Error('Invalid response structure received from QNAP server (missing QDocRoot)');
      }

      const qdoc = result.QDocRoot;
      const authPassed = Number(qdoc.authPassed);

      if (authPassed === 1) {
        const sid = qdoc.authSid;
        const qtoken = qdoc.qtoken;
        await this.saveSession(sid, qtoken);
        return {
          success: true,
          sid: this.sid,
          qtoken: this.qtoken,
          isAdmin: Number(qdoc.isAdmin) === 1
        };
      } else {
        return {
          success: false,
          errorValue: qdoc.errorValue == undefined ? -1 : Number(qdoc.errorValue),
          qtoken: qdoc.qtoken
        };
      }
    } catch (error) {
      console.error(`[QnapClient] Connection or parsing error:`, error.message);
      throw error;
    }
  }

  /**
   * Checks if a session ID (SID) is still valid.
   * @param {string} sid - The session ID to check
   * @returns {Promise<boolean>} True if valid, false otherwise
   */
  async checkSession(sid) {
    if (!sid) return false;

    const baseUrl = this.getBaseUrl();
    const checkUrl = `${baseUrl}/cgi-bin/authLogin.cgi?sid=${encodeURIComponent(sid)}`;

    console.log(`[QnapClient] Checking session ID validity: ${sid}`);

    try {
      const response = await fetch(checkUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const xmlText = await response.text();
      console.log(`[QnapClient] Raw session check response received`);

      const result = this.parser.parse(xmlText);
      if (!result?.QDocRoot) {
        throw new Error('Invalid response structure received from QNAP server (missing QDocRoot)');
      }

      const qdoc = result.QDocRoot;
      const authPassed = Number(qdoc.authPassed);

      return authPassed === 1;
    } catch (error) {
      console.error(`[QnapClient] Session validation check error:`, error.message);
      return false;
    }
  }

  /**
   * Renew the session ID (SID) and qtoken using credentials.
   * @returns {Promise<{success: boolean, sid?: string, qtoken?: string|number, isAdmin?: boolean, errorValue?: any}>}
   */
  async renew() {
    const baseUrl = this.getBaseUrl();
    const renewUrl = `${baseUrl}/cgi-bin/authLogin.cgi?user=${encodeURIComponent(this.username)}&plain_pwd=${encodeURIComponent(this.password)}&remme=1&renew=1`;

    console.log(`[QnapClient] Initiating session renewal request to: ${baseUrl}/cgi-bin/authLogin.cgi?renew=1`);

    try {
      const response = await fetch(renewUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const xmlText = await response.text();
      console.log(`[QnapClient] Raw renewal response received`);

      const result = this.parser.parse(xmlText);

      if (!result?.QDocRoot) {
        throw new Error('Invalid response structure received from QNAP server (missing QDocRoot)');
      }

      const qdoc = result.QDocRoot;
      const authPassed = Number(qdoc.authPassed);

      if (authPassed === 1) {
        const sid = qdoc.authSid;
        const qtoken = qdoc.qtoken;
        await this.saveSession(sid, qtoken);
        return {
          success: true,
          sid: this.sid,
          qtoken: this.qtoken,
          isAdmin: Number(qdoc.isAdmin) === 1
        };
      } else {
        return {
          success: false,
          errorValue: qdoc.errorValue == undefined ? -1 : Number(qdoc.errorValue),
          qtoken: qdoc.qtoken
        };
      }
    } catch (error) {
      console.error(`[QnapClient] Renewal connection or parsing error:`, error.message);
      throw error;
    }
  }

  /**
   * Start a background auto-renewal timer.
   * @param {number} [intervalMs=3600000] - Interval in milliseconds (default 60 minutes)
   */
  startAutoRenewal(intervalMs = 60 * 60 * 1000) {
    if (this.renewalIntervalId) {
      this.stopAutoRenewal();
    }
    console.log(`[QnapClient] Starting auto-renewal timer. Will renew session every ${intervalMs / 1000 / 60} minutes.`);
    this.renewalIntervalId = setInterval(async () => {
      console.log('[QnapClient] Background auto-renewal timer triggered.');
      try {
        await this.renew();
      } catch (error) {
        console.error('[QnapClient] Background session renewal failed:', error.message);
      }
    }, intervalMs);

    if (this.renewalIntervalId.unref) {
      this.renewalIntervalId.unref();
    }
  }

  /**
   * Stop the background auto-renewal timer.
   */
  stopAutoRenewal() {
    if (this.renewalIntervalId) {
      clearInterval(this.renewalIntervalId);
      this.renewalIntervalId = null;
      console.log('[QnapClient] Auto-renewal timer stopped.');
    }
  }

  /**
   * Authenticate with the QNAP server.
   * Checks if there is an active session in local storage first, validates it, and reuses it if possible.
   * Falls back to credentials login.
   * @returns {Promise<{success: boolean, sid?: string, qtoken?: string|number, isAdmin?: boolean, errorValue?: any, cached?: boolean}>}
   */
  async authenticate() {
    let activeSid = this.currentSid || this.sid;

    if (!activeSid) {
      const session = await this.loadSession();
      if (session) {
        activeSid = session.sid;
      }
    }

    if (activeSid) {
      console.log(`[QnapClient] Found session ID: ${activeSid}. Validating...`);
      const isValid = await this.checkSession(activeSid);
      if (isValid) {
        console.log(`[QnapClient] Session ID ${activeSid} is valid. Skipping credentials login.`);
        this.sid = activeSid;
        return {
          success: true,
          sid: this.sid,
          qtoken: this.qtoken,
          cached: true
        };
      }
      console.log(`[QnapClient] Session ID ${activeSid} is invalid or expired. Proceeding to credentials login.`);
    }

    return this.login();
  }
}
