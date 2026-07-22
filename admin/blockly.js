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
    en: 'voice call',        de: 'Anruf',               ru: 'голосовой звонок',
    pt: 'chamada de voz',    nl: 'spraakoproep',        fr: 'appel vocal',
    it: 'chiamata vocale',   es: 'llamada de voz',      pl: 'połączenie głosowe',
    uk: 'голосовий дзвінок', 'zh-cn': '语音通话',
};
Blockly.Words['sevenio_to'] = {
    en: 'recipient',     de: 'Empfänger',    ru: 'получатель',   pt: 'destinatário',
    nl: 'ontvanger',     fr: 'destinataire', it: 'destinatario', es: 'destinatario',
    pl: 'odbiorca',      uk: 'одержувач',    'zh-cn': '收件人',
};
Blockly.Words['sevenio_from'] = {
    en: 'sender (optional)',  de: 'Absender (optional)',  ru: 'отправитель (необязательно)',
    pt: 'remetente (opcional)', nl: 'afzender (optioneel)', fr: 'expéditeur (optionnel)',
    it: 'mittente (opzionale)', es: 'remitente (opcional)', pl: 'nadawca (opcjonalnie)',
    uk: 'відправник (необов\'язково)', 'zh-cn': '发件人（可选）',
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
Blockly.Words['sevenio_get_replies'] = {
    en: 'enable replies (shared pool)',
    de: 'Antworten aktivieren (Shared Pool)',
    ru: 'разрешить ответы (общий пул)',
    pt: 'ativar respostas (pool compartilhado)',
    nl: 'antwoorden inschakelen (gedeelde pool)',
    fr: 'activer les réponses (pool partagé)',
    it: 'abilita risposte (pool condiviso)',
    es: 'habilitar respuestas (pool compartido)',
    pl: 'włącz odpowiedzi (pula wspólna)',
    uk: 'увімкнути відповіді (спільний пул)',
    'zh-cn': '启用回复（共享号码池）',
};
Blockly.Words['sevenio_ringtime'] = {
    en: 'ring time (s)',        de: 'Klingelzeit (s)',      ru: 'время звонка (с)',
    pt: 'tempo de toque (s)',   nl: 'beltijd (s)',          fr: 'durée sonnerie (s)',
    it: 'tempo squillo (s)',    es: 'tiempo llamada (s)',   pl: 'czas dzwonienia (s)',
    uk: 'час дзвінка (с)',      'zh-cn': '响铃时间 (秒)',
};
Blockly.Words['sevenio_anyInstance'] = {
    en: 'all instances',        de: 'Alle Instanzen',       ru: 'все экземпляры',
    pt: 'todas as instâncias',  nl: 'alle instanties',      fr: 'toutes les instances',
    it: 'tutte le istanze',     es: 'todas las instancias', pl: 'wszystkie instancje',
    uk: 'всі екземпляри',       'zh-cn': '所有实例',
};
Blockly.Words['sevenio_tooltip'] = {
    en: 'Send SMS and/or trigger a voice call via seven.io. Both options can run in parallel.',
    de: 'SMS senden und/oder Anruf auslösen via seven.io. Beide Optionen gleichzeitig möglich.',
    ru: 'Отправить SMS и/или совершить голосовой звонок через seven.io. Оба варианта работают одновременно.',
    pt: 'Enviar SMS e/ou iniciar chamada de voz via seven.io. Ambas as opções podem ser executadas em paralelo.',
    nl: 'Stuur een SMS en/of start een spraakoproep via seven.io. Beide opties kunnen tegelijkertijd worden uitgevoerd.',
    fr: 'Envoyer un SMS et/ou déclencher un appel vocal via seven.io. Les deux options peuvent s\'exécuter en parallèle.',
    it: 'Invia SMS e/o avvia una chiamata vocale via seven.io. Entrambe le opzioni possono essere eseguite in parallelo.',
    es: 'Enviar SMS y/o iniciar llamada de voz via seven.io. Ambas opciones pueden ejecutarse en paralelo.',
    pl: 'Wyślij SMS i/lub wyzwól połączenie głosowe przez seven.io. Obie opcje mogą działać równolegle.',
    uk: 'Надіслати SMS та/або ініціювати голосовий дзвінок через seven.io. Обидва варіанти можуть виконуватися паралельно.',
    'zh-cn': '通过seven.io发送短信和/或触发语音通话。两个选项可以同时执行。',
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

// --- Toolbox registration (appears in sendTo category) -----------
Blockly.Sendto.blocks['sevenio_send'] =
    '<block type="sevenio_send">' +
    '  <field name="INSTANCE"></field>' +
    '  <field name="SEND_SMS">TRUE</field>' +
    '  <field name="SEND_VOICE">FALSE</field>' +
    '  <field name="FLASH">FALSE</field>' +
    '  <field name="GET_REPLIES">FALSE</field>' +
    '  <field name="RINGTIME">30</field>' +
    '  <value name="FROM">' +
    '    <shadow type="text">' +
    '      <field name="TEXT"></field>' +
    '    </shadow>' +
    '  </value>' +
    '  <value name="TO">' +
    '    <shadow type="text">' +
    '      <field name="TEXT">+491234567890</field>' +
    '    </shadow>' +
    '  </value>' +
    '  <value name="TEXT">' +
    '    <shadow type="text">' +
    '      <field name="TEXT">Hello</field>' +
    '    </shadow>' +
    '  </value>' +
    '</block>';

// --- Block definition --------------------------------------------
Blockly.Blocks['sevenio_send'] = {
    init: function () {
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

        this.appendValueInput('FROM')
            .setCheck('String')
            .appendField(Blockly.Translate('sevenio_from'));

        this.appendValueInput('TO')
            .setCheck('String')
            .appendField(Blockly.Translate('sevenio_to'));

        this.appendValueInput('TEXT')
            .setCheck('String')
            .appendField(Blockly.Translate('sevenio_text'));

        this.appendDummyInput('SMS_OPTS')
            .appendField(Blockly.Translate('sevenio_flash'))
            .appendField(new Blockly.FieldCheckbox('FALSE'), 'FLASH')
            .appendField('  ' + Blockly.Translate('sevenio_get_replies'))
            .appendField(new Blockly.FieldCheckbox('FALSE'), 'GET_REPLIES');

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
    const instance  = block.getFieldValue('INSTANCE');
    const sendSms   = block.getFieldValue('SEND_SMS')   === 'TRUE';
    const sendVoice = block.getFieldValue('SEND_VOICE') === 'TRUE';
    const flash      = block.getFieldValue('FLASH')       === 'TRUE';
    const getReplies = block.getFieldValue('GET_REPLIES') === 'TRUE';
    const ringtime  = parseInt(block.getFieldValue('RINGTIME'), 10);
    const from = Blockly.JavaScript.valueToCode(block, 'FROM', Blockly.JavaScript.ORDER_ATOMIC) || "''";
    const to   = Blockly.JavaScript.valueToCode(block, 'TO',   Blockly.JavaScript.ORDER_ATOMIC) || "''";
    const text = Blockly.JavaScript.valueToCode(block, 'TEXT', Blockly.JavaScript.ORDER_ATOMIC) || "''";

    const target = `'sevenio${instance}'`;
    const lines = [];
    if (sendSms) {
        lines.push(`sendTo(${target}, 'send', { to: ${to}, text: ${text}, from: ${from}, flash: ${flash}, getReplies: ${getReplies} });`);
    }
    if (sendVoice) {
        lines.push(`sendTo(${target}, 'voice', { to: ${to}, text: ${text}, from: ${from}, ringtime: ${ringtime} });`);
    }
    return lines.join('\n') + '\n';
};
