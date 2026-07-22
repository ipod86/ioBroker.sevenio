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
const SMS_STATUS = {
  100: "Success",
  101: "Transfer to SMS center failed",
  201: "Invalid recipient number",
  202: "Invalid sender ID",
  301: "Insufficient credits",
  305: "Invalid scheduled date/time",
  401: "Illegal endpoint",
  403: "Sender is blacklisted",
  500: "Unknown error",
  600: "Carrier error",
  700: "Network delivery timeout",
  900: "Required parameter is empty",
  901: "Invalid parameter value",
  902: "Parameter value too long"
};
function smsStatusText(result) {
  var _a;
  let code;
  if (typeof result === "number" || typeof result === "string") {
    code = String(result);
  } else if (typeof result === "object" && result !== null) {
    const raw = result.success;
    code = typeof raw === "string" || typeof raw === "number" ? String(raw) : "";
  } else {
    return "Unknown status";
  }
  return (_a = SMS_STATUS[code]) != null ? _a : `Unknown status ${code}`;
}
const VOICE_STATUS = {
  100: "Success",
  301: "Call failed",
  500: "Unknown error"
};
function voiceStatusText(result) {
  var _a;
  const code = String(result.success);
  return (_a = VOICE_STATUS[code]) != null ? _a : `Unknown status ${code}`;
}
function voiceIsSuccess(result) {
  return result.success === 100;
}
function smsIsSuccess(result) {
  if (typeof result === "number" || typeof result === "string") {
    return String(result) === "100";
  }
  if (typeof result === "object" && result !== null) {
    const raw = result.success;
    return String(raw) === "100";
  }
  return false;
}
function enrichSmsResult(result) {
  const base = typeof result === "object" && result !== null ? { ...result } : { success: result };
  return { ...base, statusText: smsStatusText(result) };
}
class Sevenio extends utils.Adapter {
  _balanceTimer = null;
  _inboundTimer = null;
  _pendingDeliveryTimer = null;
  _lastInboundId = null;
  _contacts = [];
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
    this.subscribeStates("contacts.new.save");
    this.subscribeStates("pricing.refresh");
    this.subscribeStates("stats.refresh");
    await this.refreshContacts();
    this.scheduleBalance();
    if (this.cfg.inboundInterval > 0) {
      await this.initInbound();
      this.scheduleInbound();
    }
    await this.fetchPricing();
    await this.fetchStats();
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
    } else if (localId === "contacts.new.save" && state.val === true) {
      void this.setState("contacts.new.save", { val: false, ack: true });
      void this.triggerCreateContact();
    } else if (localId === "pricing.refresh" && state.val === true) {
      void this.setState("pricing.refresh", { val: false, ack: true });
      void this.fetchPricing();
    } else if (localId === "stats.refresh" && state.val === true) {
      void this.setState("stats.refresh", { val: false, ack: true });
      void this.fetchStats();
    }
  }
  onMessage(obj) {
    var _a, _b, _c, _d;
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
        const smsOpts = {
          ...msg,
          to: this.resolveRecipient(msg.to),
          getReplies: (_b = (_a = msg.getReplies) != null ? _a : this.cfg.defaultGetReplies) != null ? _b : false
        };
        void this.sendSms(smsOpts).then(async (result) => {
          var _a2, _b2, _c2;
          const enriched = enrichSmsResult(result);
          await this.setState("sms.to", { val: msg.to, ack: true });
          await this.setState("sms.text", { val: smsOpts.text, ack: true });
          await this.setState("sms.from", { val: (_a2 = smsOpts.from) != null ? _a2 : "", ack: true });
          await this.setState("sms.flash", { val: (_b2 = smsOpts.flash) != null ? _b2 : false, ack: true });
          await this.setState("sms.getReplies", {
            val: (_c2 = smsOpts.getReplies) != null ? _c2 : false,
            ack: true
          });
          const status = smsStatusText(enriched);
          if (smsIsSuccess(enriched)) {
            this.log.debug(`SMS to ${msg.to}: ${status}`);
          } else {
            this.log.info(`SMS to ${msg.to}: ${status}`);
          }
          await this.setState("sms.lastResult", { val: JSON.stringify(enriched), ack: true });
          await this.setState("sms.lastStatus", { val: status, ack: true });
          this.scheduleDeliveryCheck(this.extractMessageIds(enriched));
          respond(enriched);
        }).catch((e) => respond({ error: e.message }));
        break;
      }
      case "voice": {
        const msg = obj.message;
        void this.sendVoice(msg).then(async (result) => {
          var _a2, _b2;
          await this.setState("voice.to", { val: msg.to, ack: true });
          await this.setState("voice.text", { val: msg.text, ack: true });
          await this.setState("voice.from", { val: (_a2 = msg.from) != null ? _a2 : "", ack: true });
          await this.setState("voice.ringtime", { val: (_b2 = msg.ringtime) != null ? _b2 : 30, ack: true });
          const vStatus = voiceStatusText(result);
          if (voiceIsSuccess(result)) {
            this.log.debug(`Voice call to ${msg.to}: ${vStatus}`);
          } else {
            this.log.info(`Voice call to ${msg.to}: ${vStatus}`);
          }
          await this.setState("voice.lastResult", { val: JSON.stringify(result), ack: true });
          await this.setState("voice.lastStatus", { val: vStatus, ack: true });
          respond(result);
        }).catch((e) => respond({ error: e.message }));
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
      case "create_contact": {
        const { name, number } = obj.message;
        void this.apiPost("/contacts", { firstname: name, mobile_number: number }).then(async (result) => {
          await this.refreshContacts();
          respond(result);
        }).catch((e) => respond({ error: e.message }));
        break;
      }
      case "test_sms": {
        const tmsg = obj.message;
        void this.sendSms({ to: tmsg.to, text: (_c = tmsg.text) != null ? _c : "seven.io adapter test" }).then((result) => respond(enrichSmsResult(result))).catch((e) => respond({ error: e.message }));
        break;
      }
      case "test_voice": {
        const tvmsg = obj.message;
        void this.sendVoice({
          to: tvmsg.to,
          text: (_d = tvmsg.text) != null ? _d : "This is a test call from the seven.io ioBroker adapter."
        }).then(respond).catch((e) => respond({ error: e.message }));
        break;
      }
      default:
        respond({ error: `Unknown command: ${obj.command}` });
    }
  }
  async createObjectTree() {
    for (const [id, name] of [
      ["account", "Account"],
      ["contacts", "Contacts"],
      ["contacts.new", "New contact"],
      ["contacts.list", "Contact list"],
      ["sms", "SMS"],
      ["sms.inbound", "Last received SMS"],
      ["voice", "Voice"],
      ["pricing", "Pricing"],
      ["stats", "Statistics (last 30 days)"]
    ]) {
      await this.setObjectNotExistsAsync(id, { type: "channel", common: { name }, native: {} });
    }
    const states = [
      ["account.balance", { name: "Balance", type: "number", role: "value", read: true, write: false, unit: "" }],
      ["account.currency", { name: "Currency", type: "string", role: "text", read: true, write: false }],
      [
        "account.lastCheck",
        { name: "Last balance check", type: "string", role: "date", read: true, write: false }
      ],
      [
        "contacts.json",
        { name: "All contacts (JSON)", type: "string", role: "json", read: true, write: false, def: "[]" }
      ],
      [
        "contacts.count",
        { name: "Number of contacts", type: "number", role: "value", read: true, write: false, def: 0 }
      ],
      [
        "contacts.refresh",
        { name: "Refresh contacts", type: "boolean", role: "button", read: false, write: true, def: false }
      ],
      ["contacts.new.name", { name: "Name", type: "string", role: "text", read: true, write: true, def: "" }],
      [
        "contacts.new.number",
        { name: "Phone number", type: "string", role: "text.phone", read: true, write: true, def: "" }
      ],
      [
        "contacts.new.save",
        { name: "Save contact", type: "boolean", role: "button", read: false, write: true, def: false }
      ],
      ["sms.to", { name: "Recipient", type: "string", role: "text.phone", read: true, write: true, def: "" }],
      [
        "sms.from",
        { name: "Sender ID (empty = default)", type: "string", role: "text", read: true, write: true, def: "" }
      ],
      ["sms.text", { name: "Message text", type: "string", role: "text", read: true, write: true, def: "" }],
      ["sms.flash", { name: "Flash SMS", type: "boolean", role: "switch", read: true, write: true, def: false }],
      [
        "sms.getReplies",
        {
          name: "Enable replies (shared pool or own number)",
          type: "boolean",
          role: "switch",
          read: true,
          write: true,
          def: false
        }
      ],
      ["sms.send", { name: "Send SMS", type: "boolean", role: "button", read: false, write: true, def: false }],
      [
        "sms.lastResult",
        { name: "Last send result (JSON)", type: "string", role: "json", read: true, write: false, def: "" }
      ],
      [
        "sms.lastStatus",
        { name: "Last send status", type: "string", role: "text", read: true, write: false, def: "" }
      ],
      [
        "sms.lastDelivery",
        {
          name: "Last delivery status (JSON)",
          type: "string",
          role: "json",
          read: true,
          write: false,
          def: ""
        }
      ],
      ["sms.inbound.id", { name: "Message ID", type: "string", role: "text", read: true, write: false, def: "" }],
      [
        "sms.inbound.from",
        { name: "Sender number", type: "string", role: "text.phone", read: true, write: false, def: "" }
      ],
      [
        "sms.inbound.text",
        { name: "Message text", type: "string", role: "text", read: true, write: false, def: "" }
      ],
      [
        "sms.inbound.timestamp",
        { name: "Received at", type: "string", role: "date", read: true, write: false, def: "" }
      ],
      ["voice.to", { name: "Recipient", type: "string", role: "text.phone", read: true, write: true, def: "" }],
      [
        "voice.from",
        {
          name: "Verified caller number",
          type: "string",
          role: "text.phone",
          read: true,
          write: true,
          def: ""
        }
      ],
      ["voice.text", { name: "Text to speak", type: "string", role: "text", read: true, write: true, def: "" }],
      [
        "voice.ringtime",
        {
          name: "Ring time in seconds (5-60)",
          type: "number",
          role: "level",
          read: true,
          write: true,
          def: 30,
          min: 5,
          max: 60,
          unit: "s"
        }
      ],
      [
        "voice.send",
        { name: "Start call", type: "boolean", role: "button", read: false, write: true, def: false }
      ],
      [
        "voice.lastResult",
        { name: "Last call result (JSON)", type: "string", role: "json", read: true, write: false, def: "" }
      ],
      [
        "voice.lastStatus",
        { name: "Last call status", type: "string", role: "text", read: true, write: false, def: "" }
      ],
      [
        "pricing.json",
        { name: "Pricing data (JSON)", type: "string", role: "json", read: true, write: false, def: "" }
      ],
      [
        "pricing.lastUpdate",
        { name: "Last pricing update", type: "string", role: "date", read: true, write: false, def: "" }
      ],
      [
        "pricing.refresh",
        { name: "Refresh pricing", type: "boolean", role: "button", read: false, write: true, def: false }
      ],
      [
        "stats.json",
        { name: "Analytics by date (JSON)", type: "string", role: "json", read: true, write: false, def: "" }
      ],
      [
        "stats.smsSent",
        { name: "SMS sent (30 days)", type: "number", role: "value", read: true, write: false, def: 0 }
      ],
      [
        "stats.voiceCalls",
        { name: "Voice calls (30 days)", type: "number", role: "value", read: true, write: false, def: 0 }
      ],
      [
        "stats.inbound",
        { name: "Inbound SMS (30 days)", type: "number", role: "value", read: true, write: false, def: 0 }
      ],
      [
        "stats.totalCost",
        {
          name: "Total cost EUR (30 days)",
          type: "number",
          role: "value",
          read: true,
          write: false,
          def: 0,
          unit: "\u20AC"
        }
      ],
      [
        "stats.lastUpdate",
        { name: "Last stats update", type: "string", role: "date", read: true, write: false, def: "" }
      ],
      [
        "stats.refresh",
        { name: "Refresh statistics", type: "boolean", role: "button", read: false, write: true, def: false }
      ]
    ];
    for (const [id, common] of states) {
      await this.extendObjectAsync(id, { type: "state", common, native: {} });
    }
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
    for (const m of newMessages) {
      const preview = m.text.length > 60 ? `${m.text.substring(0, 60)}\u2026` : m.text;
      this.log.info(`Inbound SMS from ${m.from}: ${preview}`);
    }
    if (newMessages.length > 1) {
      this.log.info(`${newMessages.length} new inbound messages \u2014 data points contain the latest only`);
    }
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
      this._contacts = contacts;
      await this.setState("contacts.json", { val: JSON.stringify(contacts), ack: true });
      await this.setState("contacts.count", { val: contacts.length, ack: true });
      const newKeys = new Set(contacts.map((c) => this.sanitizeName(this.contactDisplayName(c))));
      const existingObjs = await this.getObjectViewAsync("system", "state", {
        startkey: `${this.namespace}.contacts.list.`,
        endkey: `${this.namespace}.contacts.list.\u9999`
      });
      for (const row of existingObjs.rows) {
        const shortId = row.id.replace(`${this.namespace}.`, "");
        const key = shortId.replace("contacts.list.", "");
        if (!newKeys.has(key)) {
          await this.delObjectAsync(shortId);
        }
      }
      await this.setObjectNotExistsAsync("contacts.list", {
        type: "channel",
        common: { name: "Contact list" },
        native: {}
      });
      for (const c of contacts) {
        const displayName = this.contactDisplayName(c);
        const stateId = `contacts.list.${this.sanitizeName(displayName)}`;
        await this.extendObjectAsync(stateId, {
          type: "state",
          common: {
            name: displayName,
            type: "string",
            role: "text",
            read: true,
            write: false
          },
          native: {}
        });
        await this.setState(stateId, { val: this.contactNumber(c), ack: true });
      }
      this.log.debug(`Contacts refreshed: ${contacts.length} entries`);
    } catch (e) {
      this.log.warn(`Failed to refresh contacts: ${e.message}`);
    }
  }
  async triggerCreateContact() {
    var _a, _b;
    const [nameState, numberState] = await Promise.all([
      this.getStateAsync("contacts.new.name"),
      this.getStateAsync("contacts.new.number")
    ]);
    const name = String((_a = nameState == null ? void 0 : nameState.val) != null ? _a : "").trim();
    const number = String((_b = numberState == null ? void 0 : numberState.val) != null ? _b : "").trim().replace(/^\+/, "");
    if (!name || !number) {
      this.log.warn("Create contact: name and number must not be empty");
      return;
    }
    this.log.debug(`Creating contact: firstname="${name}", mobile_number="${number}"`);
    try {
      await this.apiPost("/contacts", { firstname: name, mobile_number: number });
      await this.setState("contacts.new.name", { val: "", ack: true });
      await this.setState("contacts.new.number", { val: "", ack: true });
      await this.refreshContacts();
      this.log.info(`Contact "${name}" created`);
    } catch (e) {
      this.log.error(`Create contact failed: ${e.message}`);
    }
  }
  contactDisplayName(c) {
    if (c.properties.fullname) {
      return c.properties.fullname;
    }
    return [c.properties.firstname, c.properties.lastname].filter(Boolean).join(" ") || `Contact_${c.id}`;
  }
  contactNumber(c) {
    return c.properties.mobile_number || c.properties.home_number || "";
  }
  sanitizeName(name) {
    return name.trim().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue").replace(/ß/g, "ss").replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "") || "contact";
  }
  resolveRecipient(to) {
    const trimmed = to.trim();
    if (/^[+\d]/.test(trimmed)) {
      return trimmed;
    }
    const lower = trimmed.toLowerCase();
    const match = this._contacts.find((c) => this.contactDisplayName(c).toLowerCase() === lower);
    if (match) {
      this.log.debug(`Resolved contact "${trimmed}" \u2192 ${this.contactNumber(match)}`);
      return this.contactNumber(match);
    }
    this.log.warn(`Contact "${trimmed}" not found, using value as-is`);
    return trimmed;
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
          const statuses = matched.map((e) => ({ id: e.id, to: e.to, status: e.dlr }));
          await this.setState("sms.lastDelivery", { val: JSON.stringify(statuses), ack: true });
          this.log.debug(`Delivery status: ${JSON.stringify(statuses)}`);
        }
      } catch (e) {
        this.log.warn(`Delivery status check failed: ${e.message}`);
      }
    }, 6e4);
  }
  async triggerSms() {
    var _a, _b, _c, _d, _e, _f;
    await this.setState("sms.send", { val: false, ack: true });
    const [to, text, from, flash, getReplies] = await Promise.all([
      this.getStateAsync("sms.to"),
      this.getStateAsync("sms.text"),
      this.getStateAsync("sms.from"),
      this.getStateAsync("sms.flash"),
      this.getStateAsync("sms.getReplies")
    ]);
    const opts = {
      to: this.resolveRecipient(String((_a = to == null ? void 0 : to.val) != null ? _a : "")),
      text: String((_b = text == null ? void 0 : text.val) != null ? _b : ""),
      from: String((_c = from == null ? void 0 : from.val) != null ? _c : ""),
      flash: Boolean((_d = flash == null ? void 0 : flash.val) != null ? _d : false),
      getReplies: Boolean((_f = (_e = getReplies == null ? void 0 : getReplies.val) != null ? _e : this.cfg.defaultGetReplies) != null ? _f : false)
    };
    if (!opts.to || !opts.text) {
      this.log.warn('SMS send triggered but "to" or "text" is empty');
      return;
    }
    try {
      const result = enrichSmsResult(await this.sendSms(opts));
      const status = smsStatusText(result);
      if (smsIsSuccess(result)) {
        this.log.debug(`SMS to ${opts.to}: ${status}`);
      } else {
        this.log.info(`SMS to ${opts.to}: ${status}`);
      }
      await this.setState("sms.lastResult", { val: JSON.stringify(result), ack: true });
      await this.setState("sms.lastStatus", { val: status, ack: true });
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
      const vStatus = voiceStatusText(result);
      if (voiceIsSuccess(result)) {
        this.log.debug(`Voice call to ${opts.to}: ${vStatus}`);
      } else {
        this.log.info(`Voice call to ${opts.to}: ${vStatus}`);
      }
      await this.setState("voice.lastResult", { val: JSON.stringify(result), ack: true });
      await this.setState("voice.lastStatus", { val: vStatus, ack: true });
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
    if (opts.getReplies) {
      body.get_replies = "1";
    }
    if (opts.delay) {
      body.delay = opts.delay;
    }
    this.log.debug(`Sending SMS to ${opts.to}${opts.getReplies ? " (replies enabled)" : ""}`);
    return this.apiPost("/sms", body);
  }
  async sendVoice(opts) {
    var _a, _b, _c, _d;
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
    const raw = await this.apiPostText("/voice", body);
    const lines = raw.trim().split("\n").map((l) => l.trim());
    return {
      success: parseInt((_b = lines[0]) != null ? _b : "500", 10),
      id: (_c = lines[1]) != null ? _c : "",
      cost: parseFloat((_d = lines[2]) != null ? _d : "0") || 0
    };
  }
  async fetchPricing() {
    try {
      const params = {};
      if (this.cfg.pricingCountry) {
        params.country = this.cfg.pricingCountry.toLowerCase();
      }
      const res = await this.apiGet("/pricing", Object.keys(params).length ? params : void 0);
      await this.setState("pricing.json", { val: JSON.stringify(res), ack: true });
      await this.setState("pricing.lastUpdate", { val: (/* @__PURE__ */ new Date()).toISOString(), ack: true });
      this.log.debug("Pricing data fetched");
    } catch (e) {
      this.log.warn(`Pricing fetch failed: ${e.message}`);
    }
  }
  async fetchStats() {
    try {
      const end = /* @__PURE__ */ new Date();
      const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1e3);
      const params = {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10)
      };
      const res = await this.apiGet("/analytics/date", params);
      const entries = Array.isArray(res) ? res : [];
      const totals = entries.reduce(
        (acc, e) => {
          var _a, _b, _c, _d;
          return {
            sms: acc.sms + ((_a = e.sms) != null ? _a : 0),
            voice: acc.voice + ((_b = e.voice) != null ? _b : 0),
            inbound: acc.inbound + ((_c = e.inbound) != null ? _c : 0),
            cost: acc.cost + ((_d = e.usage_eur) != null ? _d : 0)
          };
        },
        { sms: 0, voice: 0, inbound: 0, cost: 0 }
      );
      await this.setState("stats.json", { val: JSON.stringify(entries), ack: true });
      await this.setState("stats.smsSent", { val: totals.sms, ack: true });
      await this.setState("stats.voiceCalls", { val: totals.voice, ack: true });
      await this.setState("stats.inbound", { val: totals.inbound, ack: true });
      await this.setState("stats.totalCost", { val: Math.round(totals.cost * 1e4) / 1e4, ack: true });
      await this.setState("stats.lastUpdate", { val: (/* @__PURE__ */ new Date()).toISOString(), ack: true });
      this.log.debug(
        `Stats: ${totals.sms} SMS, ${totals.voice} voice, ${totals.inbound} inbound, ${totals.cost.toFixed(4)} EUR (last 30 days)`
      );
    } catch (e) {
      this.log.warn(`Stats fetch failed: ${e.message}`);
    }
  }
  async apiPostText(path, body) {
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
      const errBody = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText}${errBody ? ` \u2014 ${errBody}` : ""}`);
    }
    return res.text();
  }
  parseBody(text) {
    try {
      return JSON.parse(text);
    } catch {
      const first = text.trim().split("\n")[0].trim();
      const n = Number(first);
      return Number.isNaN(n) ? first : n;
    }
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
    return this.parseBody(await res.text());
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
      const errBody = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText}${errBody ? ` \u2014 ${errBody}` : ""}`);
    }
    return this.parseBody(await res.text());
  }
}
if (require.main !== module) {
  module.exports = (options) => new Sevenio(options);
} else {
  (() => new Sevenio())();
}
//# sourceMappingURL=main.js.map
