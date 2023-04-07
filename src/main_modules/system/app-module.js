'use strict';

// child process
const { exec } = require('child_process');

// electron
const { app, globalShortcut, ipcMain } = require('electron');

// file module
const fileModule = require('./file-module');

// config module
const configModule = require('./config-module');

// chat code module
const chatCodeModule = require('./chat-code-module');

// memory module
const memoryModule = require('./memory-module');

// window module
const windowModule = require('./window-module');

// ipc module
const ipcModule = require('./ipc-module');

// start app
function startApp() {
    // start sharlayan test
    memoryModule.start();

    // disable http cache
    app.commandLine.appendSwitch('disable-http-cache');

    // directory check
    fileModule.directoryCheck();

    // load config
    configModule.loadConfig();

    // load chat code
    chatCodeModule.loadChatCode();

    // set IPC
    ipcModule.setIPC();

    // detect user language
    detectUserLanguage();

    // set global shortcut
    setGlobalShortcut();

    // set shortcut IPC
    ipcMain.on('set-global-shortcut', () => {
        setGlobalShortcut();
    });
}

// detect user language
function detectUserLanguage() {
    const config = configModule.getConfig();

    if (config.system.firstTime) {
        const systemLocale = app.getSystemLocale();

        if (/zh-(TW|HK|MO|CHT|Hant)/i.test(systemLocale)) {
            config.translation.to = 'Traditional-Chinese';
        } else if (/zh-(CN|SG|CHS|Hans)/i.test(systemLocale)) {
            config.translation.to = 'Simplified-Chinese';
        } else {
            config.translation.to = 'Traditional-Chinese';
        }
    }
}

// set global shortcut
function setGlobalShortcut() {
    if (configModule.getConfig().indexWindow.shortcut) {
        registerGlobalShortcut();
    } else {
        unregisterGlobalShortcut();
    }
}

// register global shortcut
function registerGlobalShortcut() {
    globalShortcut.unregisterAll();

    globalShortcut.register('CommandOrControl+F8', () => {
        let config = configModule.getConfig();
        config.translation.getCutsceneText = !config.translation.getCutsceneText;
        configModule.setConfig(config);
        windowModule.sendIndex('change-reccord-icon', config.translation.getCutsceneText);
    });

    globalShortcut.register('CommandOrControl+F9', () => {
        exec(`explorer "${fileModule.getRootPath('src', 'json', 'text', 'readme', 'index.html')}"`);
    });

    globalShortcut.register('CommandOrControl+F10', () => {
        try {
            windowModule.closeWindow('config');
        } catch (error) {
            windowModule.createWindow('config');
        }
    });

    globalShortcut.register('CommandOrControl+F11', () => {
        try {
            windowModule.closeWindow('capture');
        } catch (error) {
            windowModule.createWindow('capture');
        }
    });

    globalShortcut.register('CommandOrControl+F12', () => {
        windowModule.openDevTools();
    });
}

// unregister global shortcut
function unregisterGlobalShortcut() {
    globalShortcut.unregisterAll();
}

// module exports
module.exports = { startApp };
