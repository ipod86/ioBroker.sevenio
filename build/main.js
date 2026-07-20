"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var utils = __toESM(require("@iobroker/adapter-core"));
const API_BASE = "https://gateway.seven.io/api";
class Sevenio extends utils.Adapter {
  _balanceTimer = null;
  _inboundTimer = null;
  _pendingDeliveryTimer = null;
  _lastInboundId = null;
  _stopped = false;
  get cfg() {
    return this.config;
  }
  constructor(options = {}) {
    super({ ...options, name: "sevenio" });
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("message", this.onMessage.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }
  async onReady() {
    if (!this.cfg.apiKey) {
      this.log.error("No API key configured \u2014 please set the API key in the adapter settings");
      return;
    }
    await this.createObjectTree();
    await this.validateConnection();
    this.subscribeStates("sms.send");
    this.subscribeStates("voice.send");
    this.subscribeStates("contacts.refresh");
    await this.refreshContacts();
    this.scheduleBalance();
    if (this.cfg.inboundInterval > 0) {
      await this.initInbound();
      this.scheduleInbound();
    }
  }
  onUnload(callback) {
    this._stopped = true;
    if (this._balanceTimer != null) {
      this.clearTimeout(this._balanceTimer);
      this._balanceTimer = null;
    }
    if (this._inboundTimer != null) {
      this.clearTimeout(this._inboundTimer);
      this._inboundTimer = null;
    }
    if (this._pendingDeliveryTimer != null) {
      this.clearTimeout(this._pendingDeliveryTimer);
      this._pendingDeliveryTimer = null;
    }
    callback();
  }
  onStateChange(id, state) {
    if (!state || state.ack) {
      return;
    }
    const localId = id.replace(`${this.namespace}.`, "");
    if (localId === "sms.send" && state.val === true) {
      void this.triggerSms();
    } else if (localId === "voice.send" && state.val === true) {
      void this.triggerVoice();
    } else if (localId === "contacts.refresh" && state.val === true) {
      void this.setState("contacts.refresh", { val: false, ack: true });
      void this.refreshContacts();
    }
  }
  onMessage(obj) {
    if (!obj || typeof obj !== "object") {
      return;
    }
    const respond = (result) => {
      if (obj.callback) {
        this.sendTo(obj.from, obj.command, result, obj.callback);
      }
    };
    switch (obj.command) {
      case "send": {
        const msg = obj.message;
        void this.sendSms(msg).then((result) => {
          this.scheduleDeliveryCheck(this.extractMessageIds(result));
          respond(result);
        }).catch((e) => respond({ error: e.message }));
        break;
      }
      case "voice": {
        const msg = obj.message;
        void this.sendVoice(msg).then(respond).catch((e) => respond({ error: e.message }));
        break;
      }
      case "get_balance": {
        void this.fetchBalance().then(respond).catch((e) => respond({ error: e.message }));
        break;
      }
      case "get_contacts": {
        void this.fetchContacts().then(respond).catch((e) => respond({ error: e.message }));
        break;
      }
      default:
        respond({ error: `Unknown command: ${obj.command}` });
    }
  }
  async createObjectTree() {
    await this.setObjectNotExistsAsync("account", {
      type: "channel",
      common: { name: "Account" },
      native: {}
    });
    await this.setObjectNotExistsAsync("account.balance", {
      type: "state",
      common: { name: "Balance", type: "number", role: "value", read: true, write: false, unit: "" },
      native: {}
    });
    await this.setObjectNotExistsAsync("account.currency", {
      type: "state",
      common: { name: "Currency", type: "string", role: "text", read: true, write: false },
      native: {}
    });
    await this.setObjectNotExistsAsync("account.lastCheck", {
      type: "state",
      common: { name: "Last balance check", type: "string", role: "date", read: true, write: false },
      native: {}
    });
    await this.setObjectNotExistsAsync("contacts", {
      type: "channel",
      common: { name: "Contacts" },
      native: {}
    });
    await this.setObjectNotExistsAsync("contacts.json", {
      type: "state",
      common: {
        name: "All contacts (JSON)",
        type: "string",
        role: "json",
        read: true,
        write: false,
        def: "[]"
      },
      native: {}
    });
    await this.setObjectNotExistsAsync("contacts.count", {
      type: "state",
      common: { name: "Number of contacts", type: "number", role: "value", read: true, write: false, def: 0 },
      native: {}
    });
    await this.setObjectNotExistsAsync("contacts.refresh", {
      type: "state",
      common: {
        name: "Refresh contacts (set to true to trigger)",
        type: "boolean",
        role: "button",
        read: true,
        write: true,
        def: false
      },
      native: {}
    });
    await this.setObjectNotExistsAsync("sms", {
      type: "channel",
      common: { name: "SMS" },
      native: {}
    });
    await this.setObjectNotExistsAsync("sms.to", {
      type: "state",
      common: { name: "Recipient", type: "string", role: "text", read: true, write: true, def: "" },
      native: {}
    });
    await this.setObjectNotExistsAsync("sms.from", {
      type: "state",
      common: {
        name: "Sender ID (empty = default)",
        type: "string",
        role: "text",
        read: true,
        write: true,
        def: ""
      },
      native: {}
    });
    await this.setObjectNotExistsAsync("sms.text", {
      type: "state",
      common: { name: "Message text", type: "string", role: "text", read: true, write: true, def: "" },
      native: {}
    });
    await this.setObjectNotExistsAsync("sms.flash", {
      type: "state",
      common: { name: "Flash SMS", type: "boolean", role: "switch", read: true, write: true, def: false },
      native: {}
    });
    await this.setObjectNotExistsAsync("sms.send", {
      type: "state",
      common: {
        name: "Send SMS (set to true to trigger)",
        type: "boolean",
        role: "button",
        read: true,
        write: true,
        def: false
      },
      native: {}
    });
    await this.setObjectNotExistsAsync("sms.lastResult", {
      type: "state",
      common: {
        name: "Last send result (JSON)",
        type: "string",
        role: "json",
        read: true,
        write: false,
        def: ""
      },
      native: {}
    });
    await this.setObjectNotExistsAsync("sms.lastDelivery", {
      type: "state",
      common: {
        name: "Last delivery status (JSON)",
        type: "string",
        role: "json",
        read: true,
        write: false,
        def: ""
      },
      native: {}
    });
    await this.setObjectNotExistsAsync("sms.inbound", {
      type: "channel",
      common: { name: "Last received SMS" },
      native: {}
    });
    await this.setObjectNotExistsAsync("sms.inbound.id", {
      type: "state",
      common: { name: "Message ID", type: "string", role: "text", read: true, write: false, def: "" },
      native: {}
    });
    await this.setObjectNotExistsAsync("sms.inbound.from", {
      type: "state",
      common: { name: "Sender number", type: "string", role: "text", read: true, write: false, def: "" },
      native: {}
    });
    await this.setObjectNotExistsAsync("sms.inbound.text", {
      type: "state",
      common: { name: "Message text", type: "string", role: "text", read: true, write: false, def: "" },
      native: {}
    });
    await this.setObjectNotExistsAsync("sms.inbound.timestamp", {
      type: "state",
      common: { name: "Received at", type: "string", role: "date", read: true, write: false, def: "" },
      native: {}
    });
    await this.setObjectNotExistsAsync("voice", {
      type: "channel",
      common: { name: "Voice" },
      native: {}
    });
    await this.setObjectNotExistsAsync("voice.to", {
      type: "state",
      common: { name: "Recipient", type: "string", role: "text", read: true, write: true, def: "" },
      native: {}
    });
    await this.setObjectNotExistsAsync("voice.from", {
      type: "state",
      common: { name: "Verified caller number", type: "string", role: "text", read: true, write: true, def: "" },
      native: {}
    });
    await this.setObjectNotExistsAsync("voice.text", {
      type: "state",
      common: {
        name: "Text to speak (or TwiML)",
        type: "string",
        role: "text",
        read: true,
        write: true,
        def: ""
      },
      native: {}
    });
    await this.setObjectNotExistsAsync("voice.ringtime", {
      type: "state",
      common: {
        name: "Ring time in seconds (5-60)",
        type: "number",
        role: "value",
        read: true,
        write: true,
        def: 30,
        min: 5,
        max: 60,
        unit: "s"
      },
      native: {}
    });
    await this.setObjectNotExistsAsync("voice.send", {
      type: "state",
      common: {
        name: "Start call (set to true to trigger)",
        type: "boolean",
        role: "button",
        read: true,
        write: true,
        def: false
      },
      native: {}
    });
    await this.setObjectNotExistsAsync("voice.lastResult", {
      type: "state",
      common: {
        name: "Last call result (JSON)",
        type: "string",
        role: "json",
        read: true,
        write: false,
        def: ""
      },
      native: {}
    });
  }
  async validateConnection() {
    try {
      await this.fetchBalance();
      await this.setState("info.connection", { val: true, ack: true });
      this.log.info("Connected to seven.io API");
    } catch (e) {
      await this.setState("info.connection", { val: false, ack: true });
      this.log.error(`Cannot connect to seven.io API: ${e.message}`);
    }
  }
  scheduleBalance() {
    var _a;
    if (this._stopped) {
      return;
    }
    const intervalMs = Math.max(1, (_a = this.cfg.balanceInterval) != null ? _a : 30) * 6e4;
    this._balanceTimer = this.setTimeout(async () => {
      this._balanceTimer = null;
      if (this._stopped) {
        return;
      }
      try {
        await this.fetchBalance();
      } catch (e) {
        this.log.warn(`Balance polling failed: ${e.message}`);
      }
      this.scheduleBalance();
    }, intervalMs);
  }
  async initInbound() {
    const saved = await this.getStateAsync("sms.inbound.id");
    if (saved == null ? void 0 : saved.val) {
      this._lastInboundId = String(saved.val);
      this.log.debug(`Inbound polling: resuming after message id ${this._lastInboundId}`);
      return;
    }
    const messages = await this.fetchInboundMessages();
    if (messages.length > 0) {
      this._lastInboundId = messages[0].id;
      this.log.debug(`Inbound polling: initialized at latest id ${this._lastInboundId}`);
    }
  }
  scheduleInbound() {
    if (this._stopped) {
      return;
    }
    const intervalMs = Math.max(1, this.cfg.inboundInterval) * 6e4;
    this._inboundTimer = this.setTimeout(async () => {
      this._inboundTimer = null;
      if (this._stopped) {
        return;
      }
      try {
        await this.pollInbound();
      } catch (e) {
        this.log.warn(`Inbound polling failed: ${e.message}`);
      }
      this.scheduleInbound();
    }, intervalMs);
  }
  async pollInbound() {
    const messages = await this.fetchInboundMessages();
    if (messages.length === 0) {
      return;
    }
    const newMessages = this._lastInboundId ? messages.filter((m) => m.id > this._lastInboundId) : messages;
    if (newMessages.length === 0) {
      return;
    }
    this.log.info(`${newMessages.length} new inbound SMS received`);
    const latest = newMessages[0];
    this._lastInboundId = latest.id;
    await this.setState("sms.inbound.id", { val: latest.id, ack: true });
    await this.setState("sms.inbound.from", { val: latest.from, ack: true });
    await this.setState("sms.inbound.text", { val: latest.text, ack: true });
    await this.setState("sms.inbound.timestamp", { val: latest.timestamp, ack: true });
  }
  async fetchInboundMessages() {
    const res = await this.apiGet("/journal/inbound", { limit: "50" });
    if (!Array.isArray(res)) {
      return [];
    }
    return res;
  }
  async fetchBalance() {
    var _a;
    const res = await this.apiGet("/balance");
    this.log.debug(`Balance raw response: ${JSON.stringify(res)}`);
    let amount;
    let currency;
    if (typeof res === "object" && res !== null && "amount" in res) {
      amount = res.amount;
      currency = (_a = res.currency) != null ? _a : "EUR";
    } else if (typeof res === "number") {
      amount = res;
      currency = "EUR";
    } else if (typeof res === "string") {
      amount = parseFloat(res);
      currency = "EUR";
    } else {
      throw new Error(`Unexpected balance response format: ${JSON.stringify(res)}`);
    }
    await this.setState("account.balance", { val: amount, ack: true });
    await this.setState("account.currency", { val: currency, ack: true });
    await this.setState("account.lastCheck", { val: (/* @__PURE__ */ new Date()).toISOString(), ack: true });
    return { amount, currency };
  }
  async fetchContacts() {
    const res = await this.apiGet("/contacts");
    if (Array.isArray(res)) {
      return res;
    }
    if (typeof res === "object" && res !== null && "data" in res && Array.isArray(res.data)) {
      return res.data;
    }
    return [];
  }
  async refreshContacts() {
    try {
      const contacts = await this.fetchContacts();
      await this.setState("contacts.json", { val: JSON.stringify(contacts), ack: true });
      await this.setState("contacts.count", { val: contacts.length, ack: true });
      this.log.debug(`Contacts refreshed: ${contacts.length} entries`);
    } catch (e) {
      this.log.warn(`Failed to refresh contacts: ${e.message}`);
    }
  }
  extractMessageIds(result) {
    if (typeof result !== "object" || result === null) {
      return [];
    }
    const r = result;
    if (Array.isArray(r.messages)) {
      return r.messages.map((m) => typeof m.id === "string" || typeof m.id === "number" ? String(m.id) : "").filter((id) => id !== "");
    }
    return [];
  }
  scheduleDeliveryCheck(messageIds) {
    if (messageIds.length === 0 || this._stopped) {
      return;
    }
    if (this._pendingDeliveryTimer != null) {
      this.clearTimeout(this._pendingDeliveryTimer);
    }
    this._pendingDeliveryTimer = this.setTimeout(async () => {
      this._pendingDeliveryTimer = null;
      if (this._stopped) {
        return;
      }
      try {
        const res = await this.apiGet("/journal/outbound", { limit: "20" });
        const entries = Array.isArray(res) ? res : [];
        const matched = entries.filter((e) => messageIds.includes(e.id));
        if (matched.length > 0) {
          const statuses = matched.map((e) => ({ id: e.id, to: e.to, status: e.status }));
          await this.setState("sms.lastDelivery", { val: JSON.stringify(statuses), ack: true });
          this.log.debug(`Delivery status: ${JSON.stringify(statuses)}`);
        }
      } catch (e) {
        this.log.warn(`Delivery status check failed: ${e.message}`);
      }
    }, 6e4);
  }
  async triggerSms() {
    var _a, _b, _c, _d;
    await this.setState("sms.send", { val: false, ack: true });
    const [to, text, from, flash] = await Promise.all([
      this.getStateAsync("sms.to"),
      this.getStateAsync("sms.text"),
      this.getStateAsync("sms.from"),
      this.getStateAsync("sms.flash")
    ]);
    const opts = {
      to: String((_a = to == null ? void 0 : to.val) != null ? _a : ""),
      text: String((_b = text == null ? void 0 : text.val) != null ? _b : ""),
      from: String((_c = from == null ? void 0 : from.val) != null ? _c : ""),
      flash: Boolean((_d = flash == null ? void 0 : flash.val) != null ? _d : false)
    };
    if (!opts.to || !opts.text) {
      this.log.warn('SMS send triggered but "to" or "text" is empty');
      return;
    }
    try {
      const result = await this.sendSms(opts);
      await this.setState("sms.lastResult", { val: JSON.stringify(result), ack: true });
      this.scheduleDeliveryCheck(this.extractMessageIds(result));
    } catch (e) {
      this.log.error(`SMS send failed: ${e.message}`);
      await this.setState("sms.lastResult", { val: JSON.stringify({ error: e.message }), ack: true });
    }
  }
  async triggerVoice() {
    var _a, _b, _c, _d;
    await this.setState("voice.send", { val: false, ack: true });
    const [to, text, from, ringtime] = await Promise.all([
      this.getStateAsync("voice.to"),
      this.getStateAsync("voice.text"),
      this.getStateAsync("voice.from"),
      this.getStateAsync("voice.ringtime")
    ]);
    const opts = {
      to: String((_a = to == null ? void 0 : to.val) != null ? _a : ""),
      text: String((_b = text == null ? void 0 : text.val) != null ? _b : ""),
      from: String((_c = from == null ? void 0 : from.val) != null ? _c : ""),
      ringtime: Number((_d = ringtime == null ? void 0 : ringtime.val) != null ? _d : 30)
    };
    if (!opts.to || !opts.text) {
      this.log.warn('Voice call triggered but "to" or "text" is empty');
      return;
    }
    try {
      const result = await this.sendVoice(opts);
      await this.setState("voice.lastResult", { val: JSON.stringify(result), ack: true });
    } catch (e) {
      this.log.error(`Voice call failed: ${e.message}`);
      await this.setState("voice.lastResult", {
        val: JSON.stringify({ error: e.message }),
        ack: true
      });
    }
  }
  async sendSms(opts) {
    if (!opts.to || !opts.text) {
      throw new Error('"to" and "text" are required');
    }
    const body = {
      to: opts.to,
      text: opts.text,
      from: opts.from || this.cfg.defaultSender || ""
    };
    if (opts.flash) {
      body.flash = "1";
    }
    if (opts.delay) {
      body.delay = opts.delay;
    }
    this.log.debug(`Sending SMS to ${opts.to}`);
    return this.apiPost("/sms", body);
  }
  async sendVoice(opts) {
    var _a;
    if (!opts.to || !opts.text) {
      throw new Error('"to" and "text" are required');
    }
    const ringtime = Math.min(60, Math.max(5, (_a = opts.ringtime) != null ? _a : 30));
    const body = {
      to: opts.to,
      text: opts.text,
      ringtime: String(ringtime)
    };
    if (opts.from) {
      body.from = opts.from;
    }
    this.log.debug(`Initiating voice call to ${opts.to}`);
    return this.apiPost("/voice", body);
  }
  async apiGet(path, params) {
    const url = new URL(`${API_BASE}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }
    const res = await fetch(url.toString(), {
      headers: { "X-Api-Key": this.cfg.apiKey },
      signal: AbortSignal.timeout(3e4)
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    return res.json();
  }
  async apiPost(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        "X-Api-Key": this.cfg.apiKey,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams(body).toString(),
      signal: AbortSignal.timeout(3e4)
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    return res.json();
  }
}
if (require.main !== module) {
  module.exports = (options) => new Sevenio(options);
} else {
  (() => new Sevenio())();
}
//# sourceMappingURL=main.js.map
