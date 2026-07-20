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
Blockly.Words['sevenio_send']        = { en: 'seven.io',           de: 'seven.io'              };
Blockly.Words['sevenio_sms']         = { en: 'SMS',                de: 'SMS'                   };
Blockly.Words['sevenio_voice']       = { en: 'voice call',         de: 'Anruf'                 };
Blockly.Words['sevenio_to']          = { en: 'recipient',          de: 'Empfänger'             };
Blockly.Words['sevenio_text']        = { en: 'message',            de: 'Nachricht'             };
Blockly.Words['sevenio_flash']       = { en: 'flash SMS',          de: 'Flash-SMS'             };
Blockly.Words['sevenio_ringtime']    = { en: 'ring time (s)',       de: 'Klingelzeit (s)'       };
Blockly.Words['sevenio_anyInstance'] = { en: 'all instances',      de: 'Alle Instanzen'        };
Blockly.Words['sevenio_tooltip']     = {
    en: 'Send SMS and/or trigger a voice call via seven.io. Both options can run in parallel.',
    de: 'SMS senden und/oder Anruf auslösen via seven.io. Beide Optionen gleichzeitig möglich.',
};
Blockly.Words['sevenio_help']        = {
    en: 'https://github.com/ipod86/ioBroker.sevenio',
    de: 'https://github.com/ipod86/ioBroker.sevenio',
};

// --- Toolbox registration (appears in sendTo category) -----------
Blockly.Sendto.blocks['sevenio_send'] =
    '<block type="sevenio_send">' +
    '  <field name="INSTANCE"></field>' +
    '  <field name="SEND_SMS">TRUE</field>' +
    '  <field name="SEND_VOICE">FALSE</field>' +
    '  <field name="FLASH">FALSE</field>' +
    '  <field name="RINGTIME">30</field>' +
    '  <value name="TO">' +
    '    <shadow type="text">' +
    '      <field name="TEXT">+491234567890</field>' +
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
        // Build instance dropdown from running instances
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

        this.appendDummyInput('INSTANCE')
            .appendField(Blockly.Translate('sevenio_send'))
            .appendField(new Blockly.FieldDropdown(options), 'INSTANCE');

        this.appendDummyInput('TYPE')
            .appendField(Blockly.Translate('sevenio_sms'))
            .appendField(new Blockly.FieldCheckbox('TRUE'), 'SEND_SMS')
            .appendField('  ' + Blockly.Translate('sevenio_voice'))
            .appendField(new Blockly.FieldCheckbox('FALSE'), 'SEND_VOICE');

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
    const instance  = block.getFieldValue('INSTANCE');
    const sendSms   = block.getFieldValue('SEND_SMS')   === 'TRUE';
    const sendVoice = block.getFieldValue('SEND_VOICE') === 'TRUE';
    const flash     = block.getFieldValue('FLASH')      === 'TRUE';
    const ringtime  = parseInt(block.getFieldValue('RINGTIME'), 10);
    const to   = Blockly.JavaScript.valueToCode(block, 'TO',   Blockly.JavaScript.ORDER_ATOMIC) || "''";
    const text = Blockly.JavaScript.valueToCode(block, 'TEXT', Blockly.JavaScript.ORDER_ATOMIC) || "''";

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
