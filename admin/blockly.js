'use strict';

if (typeof goog !== 'undefined') {
    goog.provide('Blockly.JavaScript.Sendto');
    goog.require('Blockly.JavaScript');
}

Blockly.Translate = Blockly.Translate || function (word, lang) {
    lang = lang || systemLang;
    if (Blockly.Words && Blockly.Words[word]) {
        return Blockly.Words[word][lang] || Blockly.Words[word].en;
    } else {
        return word;
    }
};

// --- i18n strings -------------------------------------------------
Blockly.Words['sevenio_send'] = {
    en: 'seven.io', de: 'seven.io', ru: 'seven.io', pt: 'seven.io',
    nl: 'seven.io', fr: 'seven.io', it: 'seven.io', es: 'seven.io',
    pl: 'seven.io', uk: 'seven.io', 'zh-cn': 'seven.io',
};
Blockly.Words['sevenio_sms'] = {
    en: 'SMS', de: 'SMS', ru: 'SMS', pt: 'SMS',
    nl: 'SMS', fr: 'SMS', it: 'SMS', es: 'SMS',
    pl: 'SMS', uk: 'SMS', 'zh-cn': '短信',
};
Blockly.Words['sevenio_voice'] = {
    en: 'voice call',         de: 'Anruf',                ru: 'голосовой звонок',
    pt: 'chamada de voz',     nl: 'spraakoproep',         fr: 'appel vocal',
    it: 'chiamata vocale',    es: 'llamada de voz',       pl: 'połączenie głosowe',
    uk: 'голосовий дзвінок',  'zh-cn': '语音通话',
};
Blockly.Words['sevenio_contact'] = {
    en: 'contact',   de: 'Kontakt',  ru: 'контакт',  pt: 'contato',
    nl: 'contact',   fr: 'contact',  it: 'contatto', es: 'contacto',
    pl: 'kontakt',   uk: 'контакт',  'zh-cn': '联系人',
};
Blockly.Words['sevenio_contact_ph'] = {
    en: '── or type number ──',      de: '── oder Nummer eingeben ──',
    ru: '── или введите номер ──',   pt: '── ou digite o número ──',
    nl: '── of typ een nummer ──',   fr: '── ou saisir un numéro ──',
    it: '── o inserisci numero ──',  es: '── o escribe un número ──',
    pl: '── lub wpisz numer ──',     uk: '── або введіть номер ──',
    'zh-cn': '── 或输入号码 ──',
};
Blockly.Words['sevenio_to'] = {
    en: 'number',  de: 'Nummer',  ru: 'номер',   pt: 'número',
    nl: 'nummer',  fr: 'numéro',  it: 'numero',  es: 'número',
    pl: 'numer',   uk: 'номер',   'zh-cn': '号码',
};
Blockly.Words['sevenio_text'] = {
    en: 'message',      de: 'Nachricht',    ru: 'сообщение',    pt: 'mensagem',
    nl: 'bericht',      fr: 'message',      it: 'messaggio',    es: 'mensaje',
    pl: 'wiadomość',    uk: 'повідомлення', 'zh-cn': '消息',
};
Blockly.Words['sevenio_flash'] = {
    en: 'flash SMS', de: 'Flash-SMS', ru: 'Flash-SMS', pt: 'Flash SMS',
    nl: 'flash SMS', fr: 'Flash SMS', it: 'Flash SMS', es: 'Flash SMS',
    pl: 'Flash SMS', uk: 'Flash SMS', 'zh-cn': '闪信',
};
Blockly.Words['sevenio_ringtime'] = {
    en: 'ring time (s)',         de: 'Klingelzeit (s)',       ru: 'время звонка (с)',
    pt: 'tempo de toque (s)',    nl: 'beltijd (s)',           fr: 'durée sonnerie (s)',
    it: 'tempo squillo (s)',     es: 'tiempo llamada (s)',    pl: 'czas dzwonienia (s)',
    uk: 'час дзвінка (с)',       'zh-cn': '响铃时间 (秒)',
};
Blockly.Words['sevenio_anyInstance'] = {
    en: 'all instances',        de: 'Alle Instanzen',       ru: 'все экземпляры',
    pt: 'todas as instâncias',  nl: 'alle instanties',      fr: 'toutes les instances',
    it: 'tutte le istanze',     es: 'todas las instancias', pl: 'wszystkie instancje',
    uk: 'всі екземпляри',       'zh-cn': '所有实例',
};
Blockly.Words['sevenio_tooltip'] = {
    en: 'Send SMS and/or trigger a voice call via seven.io. Pick a contact from the dropdown or type a number manually — the contact takes priority if both are set.',
    de: 'SMS senden und/oder Anruf auslösen via seven.io. Kontakt aus der Liste wählen oder Nummer manuell eingeben — bei beiden gewinnt der Kontakt.',
    ru: 'Отправить SMS и/или совершить голосовой звонок через seven.io. Выберите контакт из списка или введите номер вручную — при обоих вариантах приоритет у контакта.',
    pt: 'Enviar SMS e/ou iniciar chamada de voz via seven.io. Selecione um contato ou insira um número — o contato tem prioridade se ambos estiverem definidos.',
    nl: 'Stuur een SMS en/of start een spraakoproep via seven.io. Kies een contact of typ een nummer — het contact heeft prioriteit als beide zijn ingesteld.',
    fr: 'Envoyer un SMS et/ou déclencher un appel vocal via seven.io. Sélectionnez un contact ou saisissez un numéro — le contact est prioritaire si les deux sont définis.',
    it: 'Invia SMS e/o avvia una chiamata vocale via seven.io. Seleziona un contatto o inserisci un numero — il contatto ha la priorità se entrambi sono impostati.',
    es: 'Enviar SMS y/o iniciar llamada de voz via seven.io. Seleccione un contacto o escriba un número — el contacto tiene prioridad si ambos están definidos.',
    pl: 'Wyślij SMS i/lub wyzwól połączenie głosowe przez seven.io. Wybierz kontakt lub wpisz numer — kontakt ma pierwszeństwo, jeśli oba są ustawione.',
    uk: 'Надіслати SMS та/або ініціювати голосовий дзвінок через seven.io. Виберіть контакт або введіть номер — контакт має пріоритет, якщо обидва задані.',
    'zh-cn': '通过seven.io发送短信和/或触发语音通话。从列表中选择联系人或手动输入号码——如果两者都设置，联系人优先。',
};
Blockly.Words['sevenio_help'] = {
    en: 'https://github.com/ipod86/ioBroker.sevenio',
    de: 'https://github.com/ipod86/ioBroker.sevenio',
    ru: 'https://github.com/ipod86/ioBroker.sevenio',
    pt: 'https://github.com/ipod86/ioBroker.sevenio',
    nl: 'https://github.com/ipod86/ioBroker.sevenio',
    fr: 'https://github.com/ipod86/ioBroker.sevenio',
    it: 'https://github.com/ipod86/ioBroker.sevenio',
    es: 'https://github.com/ipod86/ioBroker.sevenio',
    pl: 'https://github.com/ipod86/ioBroker.sevenio',
    uk: 'https://github.com/ipod86/ioBroker.sevenio',
    'zh-cn': 'https://github.com/ipod86/ioBroker.sevenio',
};

// --- Build contact list from adapter states ----------------------
var _sevenioContactNames = [];

(function () {
    var CONTACT_RE = /^sevenio\.\d+\.contacts\.list\.([^.]+)$/;

    function extract(source) {
        var ids = Array.isArray(source)
            ? source.map(function (r) { return r.id || r._id || ''; })
            : Object.keys(source || {});
        var found = [];
        ids.forEach(function (id) {
            var m = id.match(CONTACT_RE);
            if (m) found.push(m[1].replace(/_/g, ' '));
        });
        if (found.length) _sevenioContactNames = found.sort();
    }

    // Classic admin: main.objects is already loaded
    if (typeof main !== 'undefined' && main && main.objects) {
        extract(main.objects);
    }

    // New admin / fallback: ask the socket directly
    if (!_sevenioContactNames.length) {
        try {
            var sock = (typeof socket !== 'undefined' && socket) ||
                       (typeof window !== 'undefined' && window.socket);
            if (sock && sock.emit) {
                sock.emit(
                    'getObjectView', 'system', 'state',
                    { startkey: 'sevenio.', endkey: 'sevenio.香' },
                    function (err, res) {
                        if (!err && res) extract(res.rows || res);
                    }
                );
            }
        } catch (e) { /* ignore */ }
    }
})();

function _sevenioContactOptions() {
    var opts = [[Blockly.Translate('sevenio_contact_ph'), '']];
    _sevenioContactNames.forEach(function (name) {
        opts.push([name, name]);
    });
    if (opts.length === 1) opts.push(['(no contacts)', '']);
    return opts;
}

// --- Toolbox registration (appears in sendTo category) -----------
Blockly.Sendto.blocks['sevenio_send'] =
    '<block type="sevenio_send">' +
    '  <field name="INSTANCE"></field>' +
    '  <field name="SEND_SMS">TRUE</field>' +
    '  <field name="SEND_VOICE">FALSE</field>' +
    '  <field name="CONTACT"></field>' +
    '  <field name="FLASH">FALSE</field>' +
    '  <field name="RINGTIME">30</field>' +
    '  <value name="TO">' +
    '    <shadow type="text">' +
    '      <field name="TEXT"></field>' +
    '    </shadow>' +
    '  </value>' +
    '  <value name="TEXT">' +
    '    <shadow type="text">' +
    '      <field name="TEXT">Nachricht</field>' +
    '    </shadow>' +
    '  </value>' +
    '</block>';

// --- Block definition --------------------------------------------
Blockly.Blocks['sevenio_send'] = {
    init: function () {
        // Instance dropdown
        const options = [[Blockly.Translate('sevenio_anyInstance'), '']];
        if (typeof main !== 'undefined' && main.instances) {
            for (let i = 0; i < main.instances.length; i++) {
                const m = main.instances[i].match(/^system\.adapter\.sevenio\.(\d+)$/);
                if (m) {
                    const k = parseInt(m[1], 10);
                    options.push(['sevenio.' + k, '.' + k]);
                }
            }
        }
        if (options.length <= 1) {
            for (let n = 0; n <= 4; n++) {
                options.push(['sevenio.' + n, '.' + n]);
            }
        }

        this.appendDummyInput('INSTANCE_ROW')
            .appendField(Blockly.Translate('sevenio_send'))
            .appendField(new Blockly.FieldDropdown(options), 'INSTANCE');

        this.appendDummyInput('TYPE')
            .appendField(Blockly.Translate('sevenio_sms'))
            .appendField(new Blockly.FieldCheckbox('TRUE'), 'SEND_SMS')
            .appendField('  ' + Blockly.Translate('sevenio_voice'))
            .appendField(new Blockly.FieldCheckbox('FALSE'), 'SEND_VOICE');

        // Contact dropdown — populated from sevenio.N.contacts.list.* objects
        this.appendDummyInput('CONTACT_ROW')
            .appendField(Blockly.Translate('sevenio_contact'))
            .appendField(new Blockly.FieldDropdown(_sevenioContactOptions), 'CONTACT');

        // Manual number input — used when no contact is selected
        this.appendValueInput('TO')
            .setCheck('String')
            .appendField(Blockly.Translate('sevenio_to'));

        this.appendValueInput('TEXT')
            .setCheck('String')
            .appendField(Blockly.Translate('sevenio_text'));

        this.appendDummyInput('SMS_OPTS')
            .appendField(Blockly.Translate('sevenio_flash'))
            .appendField(new Blockly.FieldCheckbox('FALSE'), 'FLASH');

        this.appendDummyInput('VOICE_OPTS')
            .appendField(Blockly.Translate('sevenio_ringtime'))
            .appendField(new Blockly.FieldNumber(30, 5, 60), 'RINGTIME');

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(Blockly.Sendto.HUE);
        this.setTooltip(Blockly.Translate('sevenio_tooltip'));
        this.setHelpUrl(Blockly.Translate('sevenio_help'));
    },
};

// --- Code generator ----------------------------------------------
Blockly.JavaScript['sevenio_send'] = function (block) {
    const instance    = block.getFieldValue('INSTANCE');
    const sendSms     = block.getFieldValue('SEND_SMS')   === 'TRUE';
    const sendVoice   = block.getFieldValue('SEND_VOICE') === 'TRUE';
    const flash       = block.getFieldValue('FLASH')      === 'TRUE';
    const ringtime    = parseInt(block.getFieldValue('RINGTIME'), 10);
    const contactVal  = block.getFieldValue('CONTACT') || '';
    const manualTo    = Blockly.JavaScript.valueToCode(block, 'TO',   Blockly.JavaScript.ORDER_ATOMIC) || "''";
    const text        = Blockly.JavaScript.valueToCode(block, 'TEXT', Blockly.JavaScript.ORDER_ATOMIC) || "''";

    // Contact from dropdown takes priority over manually typed number
    const to = contactVal ? JSON.stringify(contactVal) : manualTo;

    const target = `'sevenio${instance}'`;
    const lines = [];
    if (sendSms) {
        lines.push(`sendTo(${target}, 'send', { to: ${to}, text: ${text}, flash: ${flash} });`);
    }
    if (sendVoice) {
        lines.push(`sendTo(${target}, 'voice', { to: ${to}, text: ${text}, ringtime: ${ringtime} });`);
    }
    return lines.join('\n') + '\n';
};
