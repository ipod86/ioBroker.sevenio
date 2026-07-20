'use strict';

if (typeof goog !== 'undefined') {
    goog.provide('Blockly.Blocks.sevenio');
    goog.require('Blockly.Blocks');
}

// ── Block definition ──────────────────────────────────────────────────────────

Blockly.Blocks['sevenio_send'] = {
    init: function () {
        this.appendDummyInput('HEADER')
            .appendField('seven.io  |  SMS')
            .appendField(new Blockly.FieldCheckbox('TRUE'), 'SEND_SMS')
            .appendField('  Anruf')
            .appendField(new Blockly.FieldCheckbox('FALSE'), 'SEND_VOICE');
        this.appendValueInput('TO')
            .setCheck('String')
            .appendField('Empfänger');
        this.appendValueInput('TEXT')
            .setCheck('String')
            .appendField('Nachricht');
        this.appendDummyInput('SMS_OPTS')
            .appendField('Flash-SMS')
            .appendField(new Blockly.FieldCheckbox('FALSE'), 'FLASH');
        this.appendDummyInput('VOICE_OPTS')
            .appendField('Klingelzeit (s)')
            .appendField(new Blockly.FieldNumber(30, 5, 60), 'RINGTIME');
        this.appendDummyInput('INST')
            .appendField('Instanz sevenio.')
            .appendField(new Blockly.FieldNumber(0, 0, 9), 'INSTANCE');
        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour('#1c73b7');
        this.setTooltip(
            'SMS senden und/oder Sprachanruf auslösen via seven.io. ' +
            'Beide Optionen gleichzeitig möglich (parallel).'
        );
        this.setHelpUrl('https://github.com/ipod86/ioBroker.sevenio');
    },
};

// ── Code generator ────────────────────────────────────────────────────────────

Blockly.JavaScript['sevenio_send'] = function (block) {
    const to   = Blockly.JavaScript.valueToCode(block, 'TO',   Blockly.JavaScript.ORDER_ATOMIC) || "''";
    const text = Blockly.JavaScript.valueToCode(block, 'TEXT', Blockly.JavaScript.ORDER_ATOMIC) || "''";
    const sendSms   = block.getFieldValue('SEND_SMS')   === 'TRUE';
    const sendVoice = block.getFieldValue('SEND_VOICE') === 'TRUE';
    const flash     = block.getFieldValue('FLASH')      === 'TRUE';
    const ringtime  = parseInt(block.getFieldValue('RINGTIME'), 10);
    const instance  = parseInt(block.getFieldValue('INSTANCE'), 10);
    const target    = `'sevenio.${instance}'`;

    // Both calls fire without await → run in parallel
    const lines = [];
    if (sendSms) {
        lines.push(`sendTo(${target}, 'send', { to: ${to}, text: ${text}, flash: ${flash} });`);
    }
    if (sendVoice) {
        lines.push(`sendTo(${target}, 'voice', { to: ${to}, text: ${text}, ringtime: ${ringtime} });`);
    }
    return lines.join('\n') + '\n';
};
