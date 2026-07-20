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
Blockly.Words['sevenio_send']        = { en: 'seven.io',              de: 'seven.io'                };
Blockly.Words['sevenio_sms']         = { en: 'SMS',                   de: 'SMS'                     };
Blockly.Words['sevenio_voice']       = { en: 'voice call',            de: 'Anruf'                   };
Blockly.Words['sevenio_contact']     = { en: 'contact',               de: 'Kontakt'                 };
Blockly.Words['sevenio_contact_ph']  = { en: '── or type number ──',  de: '── oder Nummer eingeben ──' };
Blockly.Words['sevenio_to']          = { en: 'number',                de: 'Nummer'                  };
Blockly.Words['sevenio_text']        = { en: 'message',               de: 'Nachricht'               };
Blockly.Words['sevenio_flash']       = { en: 'flash SMS',             de: 'Flash-SMS'               };
Blockly.Words['sevenio_ringtime']    = { en: 'ring time (s)',          de: 'Klingelzeit (s)'         };
Blockly.Words['sevenio_anyInstance'] = { en: 'all instances',         de: 'Alle Instanzen'          };
Blockly.Words['sevenio_tooltip']     = {
    en: 'Send SMS and/or trigger a voice call via seven.io. Pick a contact from the dropdown or type a number manually — the contact takes priority if both are set.',
    de: 'SMS senden und/oder Anruf auslösen via seven.io. Kontakt aus der Liste wählen oder Nummer manuell eingeben — bei beiden gewinnt der Kontakt.',
};
Blockly.Words['sevenio_help']        = {
    en: 'https://github.com/ipod86/ioBroker.sevenio',
    de: 'https://github.com/ipod86/ioBroker.sevenio',
};

// --- Build contact list from adapter states ----------------------
function _sevenioContactOptions() {
    const opts = [[Blockly.Translate('sevenio_contact_ph'), '']];
    if (typeof main !== 'undefined' && main.objects) {
        Object.keys(main.objects)
            .filter(function (id) {
                return /^sevenio\.\d+\.contacts\.list\.[^.]+$/.test(id);
            })
            .sort()
            .forEach(function (id) {
                const key = id.replace(/^sevenio\.\d+\.contacts\.list\./, '');
                const label = key.replace(/_/g, ' ');
                opts.push([label, label]);
            });
    }
    // Always provide a second option so Blockly doesn't collapse a single-item dropdown
    if (opts.length === 1) {
        opts.push(['(no contacts)', '']);
    }
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
