import * as utils from '@iobroker/adapter-core';

interface SevenioConfig extends ioBroker.AdapterConfig {
	apiKey: string;
	defaultSender: string;
	balanceInterval: number;
}

const API_BASE = 'https://gateway.seven.io/api';

interface SmsOpts {
	to: string;
	text: string;
	from?: string;
	flash?: boolean;
	delay?: string;
}

interface VoiceOpts {
	to: string;
	text: string;
	from?: string;
	ringtime?: number;
}

interface BalanceResponse {
	amount: number;
	currency: string;
}

class Sevenio extends utils.Adapter {
	private _balanceTimer: ioBroker.Timeout | null | undefined = null;
	private _stopped = false;

	private get cfg(): SevenioConfig {
		return this.config as unknown as SevenioConfig;
	}

	public constructor(options: Partial<utils.AdapterOptions> = {}) {
		super({ ...options, name: 'sevenio' });
		this.on('ready', this.onReady.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	private async onReady(): Promise<void> {
		if (!this.cfg.apiKey) {
			this.log.error('No API key configured — please set the API key in the adapter settings');
			return;
		}

		await this.createObjectTree();
		await this.validateConnection();
		this.subscribeStates('sms.send');
		this.subscribeStates('voice.send');
		this.scheduleBalance();
	}

	private onUnload(callback: () => void): void {
		this._stopped = true;
		if (this._balanceTimer != null) {
			this.clearTimeout(this._balanceTimer);
			this._balanceTimer = null;
		}
		callback();
	}

	private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
		if (!state || state.ack) {
			return;
		}
		const localId = id.replace(`${this.namespace}.`, '');
		if (localId === 'sms.send' && state.val === true) {
			void this.triggerSms();
		} else if (localId === 'voice.send' && state.val === true) {
			void this.triggerVoice();
		}
	}

	private onMessage(obj: ioBroker.Message): void {
		if (!obj || typeof obj !== 'object') {
			return;
		}
		const respond = (result: unknown): void => {
			if (obj.callback) {
				this.sendTo(obj.from, obj.command, result, obj.callback);
			}
		};

		switch (obj.command) {
			case 'send': {
				const msg = obj.message as SmsOpts;
				void this.sendSms(msg)
					.then(respond)
					.catch((e: Error) => respond({ error: e.message }));
				break;
			}
			case 'voice': {
				const msg = obj.message as VoiceOpts;
				void this.sendVoice(msg)
					.then(respond)
					.catch((e: Error) => respond({ error: e.message }));
				break;
			}
			case 'get_balance': {
				void this.fetchBalance()
					.then(respond)
					.catch((e: Error) => respond({ error: e.message }));
				break;
			}
			default:
				respond({ error: `Unknown command: ${obj.command}` });
		}
	}

	private async createObjectTree(): Promise<void> {
		await this.setObjectNotExistsAsync('account', {
			type: 'channel',
			common: { name: 'Account' },
			native: {},
		});
		await this.setObjectNotExistsAsync('account.balance', {
			type: 'state',
			common: { name: 'Balance', type: 'number', role: 'value', read: true, write: false, unit: '' },
			native: {},
		});
		await this.setObjectNotExistsAsync('account.currency', {
			type: 'state',
			common: { name: 'Currency', type: 'string', role: 'text', read: true, write: false },
			native: {},
		});
		await this.setObjectNotExistsAsync('account.lastCheck', {
			type: 'state',
			common: { name: 'Last balance check', type: 'string', role: 'date', read: true, write: false },
			native: {},
		});

		await this.setObjectNotExistsAsync('sms', {
			type: 'channel',
			common: { name: 'SMS' },
			native: {},
		});
		await this.setObjectNotExistsAsync('sms.to', {
			type: 'state',
			common: { name: 'Recipient', type: 'string', role: 'text', read: true, write: true, def: '' },
			native: {},
		});
		await this.setObjectNotExistsAsync('sms.from', {
			type: 'state',
			common: {
				name: 'Sender ID (empty = default)',
				type: 'string',
				role: 'text',
				read: true,
				write: true,
				def: '',
			},
			native: {},
		});
		await this.setObjectNotExistsAsync('sms.text', {
			type: 'state',
			common: { name: 'Message text', type: 'string', role: 'text', read: true, write: true, def: '' },
			native: {},
		});
		await this.setObjectNotExistsAsync('sms.flash', {
			type: 'state',
			common: { name: 'Flash SMS', type: 'boolean', role: 'switch', read: true, write: true, def: false },
			native: {},
		});
		await this.setObjectNotExistsAsync('sms.send', {
			type: 'state',
			common: {
				name: 'Send SMS (set to true to trigger)',
				type: 'boolean',
				role: 'button',
				read: true,
				write: true,
				def: false,
			},
			native: {},
		});
		await this.setObjectNotExistsAsync('sms.lastResult', {
			type: 'state',
			common: {
				name: 'Last send result (JSON)',
				type: 'string',
				role: 'json',
				read: true,
				write: false,
				def: '',
			},
			native: {},
		});

		await this.setObjectNotExistsAsync('voice', {
			type: 'channel',
			common: { name: 'Voice' },
			native: {},
		});
		await this.setObjectNotExistsAsync('voice.to', {
			type: 'state',
			common: { name: 'Recipient', type: 'string', role: 'text', read: true, write: true, def: '' },
			native: {},
		});
		await this.setObjectNotExistsAsync('voice.from', {
			type: 'state',
			common: { name: 'Verified caller number', type: 'string', role: 'text', read: true, write: true, def: '' },
			native: {},
		});
		await this.setObjectNotExistsAsync('voice.text', {
			type: 'state',
			common: {
				name: 'Text to speak (or TwiML)',
				type: 'string',
				role: 'text',
				read: true,
				write: true,
				def: '',
			},
			native: {},
		});
		await this.setObjectNotExistsAsync('voice.ringtime', {
			type: 'state',
			common: {
				name: 'Ring time in seconds (5-60)',
				type: 'number',
				role: 'value',
				read: true,
				write: true,
				def: 30,
				min: 5,
				max: 60,
				unit: 's',
			},
			native: {},
		});
		await this.setObjectNotExistsAsync('voice.send', {
			type: 'state',
			common: {
				name: 'Start call (set to true to trigger)',
				type: 'boolean',
				role: 'button',
				read: true,
				write: true,
				def: false,
			},
			native: {},
		});
		await this.setObjectNotExistsAsync('voice.lastResult', {
			type: 'state',
			common: {
				name: 'Last call result (JSON)',
				type: 'string',
				role: 'json',
				read: true,
				write: false,
				def: '',
			},
			native: {},
		});
	}

	private async validateConnection(): Promise<void> {
		try {
			await this.fetchBalance();
			await this.setState('info.connection', { val: true, ack: true });
			this.log.info('Connected to seven.io API');
		} catch (e) {
			await this.setState('info.connection', { val: false, ack: true });
			this.log.error(`Cannot connect to seven.io API: ${(e as Error).message}`);
		}
	}

	private scheduleBalance(): void {
		if (this._stopped) {
			return;
		}
		const intervalMs = Math.max(1, this.cfg.balanceInterval ?? 30) * 60_000;
		this._balanceTimer = this.setTimeout(async () => {
			this._balanceTimer = null;
			if (this._stopped) {
				return;
			}
			try {
				await this.fetchBalance();
			} catch (e) {
				this.log.warn(`Balance polling failed: ${(e as Error).message}`);
			}
			this.scheduleBalance();
		}, intervalMs);
	}

	private async fetchBalance(): Promise<BalanceResponse> {
		const res = await this.apiGet('/balance');
		this.log.debug(`Balance raw response: ${JSON.stringify(res)}`);

		let amount: number;
		let currency: string;

		if (typeof res === 'object' && res !== null && 'amount' in res) {
			amount = (res as BalanceResponse).amount;
			currency = (res as BalanceResponse).currency ?? 'EUR';
		} else if (typeof res === 'number') {
			amount = res;
			currency = 'EUR';
		} else if (typeof res === 'string') {
			amount = parseFloat(res);
			currency = 'EUR';
		} else {
			throw new Error(`Unexpected balance response format: ${JSON.stringify(res)}`);
		}

		await this.setState('account.balance', { val: amount, ack: true });
		await this.setState('account.currency', { val: currency, ack: true });
		await this.setState('account.lastCheck', { val: new Date().toISOString(), ack: true });
		return { amount, currency };
	}

	private async triggerSms(): Promise<void> {
		await this.setState('sms.send', { val: false, ack: true });
		const [to, text, from, flash] = await Promise.all([
			this.getStateAsync('sms.to'),
			this.getStateAsync('sms.text'),
			this.getStateAsync('sms.from'),
			this.getStateAsync('sms.flash'),
		]);
		const opts: SmsOpts = {
			to: String(to?.val ?? ''),
			text: String(text?.val ?? ''),
			from: String(from?.val ?? ''),
			flash: Boolean(flash?.val ?? false),
		};
		if (!opts.to || !opts.text) {
			this.log.warn('SMS send triggered but "to" or "text" is empty');
			return;
		}
		try {
			const result = await this.sendSms(opts);
			await this.setState('sms.lastResult', { val: JSON.stringify(result), ack: true });
		} catch (e) {
			this.log.error(`SMS send failed: ${(e as Error).message}`);
			await this.setState('sms.lastResult', { val: JSON.stringify({ error: (e as Error).message }), ack: true });
		}
	}

	private async triggerVoice(): Promise<void> {
		await this.setState('voice.send', { val: false, ack: true });
		const [to, text, from, ringtime] = await Promise.all([
			this.getStateAsync('voice.to'),
			this.getStateAsync('voice.text'),
			this.getStateAsync('voice.from'),
			this.getStateAsync('voice.ringtime'),
		]);
		const opts: VoiceOpts = {
			to: String(to?.val ?? ''),
			text: String(text?.val ?? ''),
			from: String(from?.val ?? ''),
			ringtime: Number(ringtime?.val ?? 30),
		};
		if (!opts.to || !opts.text) {
			this.log.warn('Voice call triggered but "to" or "text" is empty');
			return;
		}
		try {
			const result = await this.sendVoice(opts);
			await this.setState('voice.lastResult', { val: JSON.stringify(result), ack: true });
		} catch (e) {
			this.log.error(`Voice call failed: ${(e as Error).message}`);
			await this.setState('voice.lastResult', {
				val: JSON.stringify({ error: (e as Error).message }),
				ack: true,
			});
		}
	}

	async sendSms(opts: SmsOpts): Promise<unknown> {
		if (!opts.to || !opts.text) {
			throw new Error('"to" and "text" are required');
		}
		const body: Record<string, string> = {
			to: opts.to,
			text: opts.text,
			from: opts.from || this.cfg.defaultSender || '',
		};
		if (opts.flash) {
			body.flash = '1';
		}
		if (opts.delay) {
			body.delay = opts.delay;
		}
		this.log.debug(`Sending SMS to ${opts.to}`);
		return this.apiPost('/sms', body);
	}

	async sendVoice(opts: VoiceOpts): Promise<unknown> {
		if (!opts.to || !opts.text) {
			throw new Error('"to" and "text" are required');
		}
		const ringtime = Math.min(60, Math.max(5, opts.ringtime ?? 30));
		const body: Record<string, string> = {
			to: opts.to,
			text: opts.text,
			ringtime: String(ringtime),
		};
		if (opts.from) {
			body.from = opts.from;
		}
		this.log.debug(`Initiating voice call to ${opts.to}`);
		return this.apiPost('/voice', body);
	}

	private async apiGet(path: string): Promise<unknown> {
		const res = await fetch(`${API_BASE}${path}`, {
			headers: { 'X-Api-Key': this.cfg.apiKey },
			signal: AbortSignal.timeout(30_000),
		});
		if (!res.ok) {
			throw new Error(`HTTP ${res.status} ${res.statusText}`);
		}
		return res.json();
	}

	private async apiPost(path: string, body: Record<string, string>): Promise<unknown> {
		const res = await fetch(`${API_BASE}${path}`, {
			method: 'POST',
			headers: {
				'X-Api-Key': this.cfg.apiKey,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams(body).toString(),
			signal: AbortSignal.timeout(30_000),
		});
		if (!res.ok) {
			throw new Error(`HTTP ${res.status} ${res.statusText}`);
		}
		return res.json();
	}
}

if (require.main !== module) {
	module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Sevenio(options);
} else {
	(() => new Sevenio())();
}
