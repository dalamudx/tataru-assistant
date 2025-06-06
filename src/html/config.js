'use strict';

// electron
const { ipcRenderer } = require('electron');

// Cache for translated button texts
let translatedButtonSelectAll = 'Select All'; // Default/fallback
let translatedButtonDeselectAll = 'Deselect All'; // Default/fallback

// DOMContentLoaded
window.addEventListener('DOMContentLoaded', async () => {
  setIPC();
  await setView();
  setEvent();
  setButton();

  // Listen for the custom 'change-ui-text' event to update cached translations for the toggle button
  // This ensures that if the language changes, our cached strings are updated.
  document.addEventListener('change-ui-text', () => {
    const selectAllTextElement = document.getElementById('text-select-all-helper');
    const deselectAllTextElement = document.getElementById('text-deselect-all-helper');
    
    if (selectAllTextElement && selectAllTextElement.innerText) {
        translatedButtonSelectAll = selectAllTextElement.innerText;
    }
    if (deselectAllTextElement && deselectAllTextElement.innerText) {
        translatedButtonDeselectAll = deselectAllTextElement.innerText;
    }
    // After language change, or initial load, update the button text
    updateChannelSelectAllButtonState(); 
  });
});

// Helper function to update the Select/Deselect All button's text
function updateChannelSelectAllButtonState() {
    const selectAllButton = document.getElementById('button-channel-select-all');
    if (!selectAllButton) return;

    const channelCheckboxes = document.querySelectorAll('#div-channel-list input[type="checkbox"].form-check-input');
    let allCurrentlySelected = channelCheckboxes.length > 0; // Assume true if list is not empty and all are checked

    if (channelCheckboxes.length === 0) { // If no channels, button might be "Select All" or disabled
        allCurrentlySelected = false; // No items to select
    } else {
        for (const checkbox of channelCheckboxes) {
            if (!checkbox.checked) {
                allCurrentlySelected = false;
                break;
            }
        }
    }
    
    // Ensure helper texts are loaded if this is called before the first 'change-ui-text'
    // This is a bit redundant if 'change-ui-text' listener always runs first, but safe.
    const selectAllTextElement = document.getElementById('text-select-all-helper');
    const deselectAllTextElement = document.getElementById('text-deselect-all-helper');
    if (selectAllTextElement && selectAllTextElement.innerText) translatedButtonSelectAll = selectAllTextElement.innerText;
    if (deselectAllTextElement && deselectAllTextElement.innerText) translatedButtonDeselectAll = deselectAllTextElement.innerText;

    selectAllButton.innerText = allCurrentlySelected ? translatedButtonDeselectAll : translatedButtonSelectAll;
}

// set IPC
function setIPC() {
  // change UI text
  ipcRenderer.on('change-ui-text', async () => {
    const config = await ipcRenderer.invoke('get-config');
    document.dispatchEvent(new CustomEvent('change-ui-text', { detail: config }));
  });

  // send data
  ipcRenderer.on('send-data', (event, divId) => {
    document.getElementById('select-option').value = divId;
    document.querySelectorAll('.config-page').forEach((value) => {
      document.getElementById(value.id).hidden = true;
    });
    document.getElementById(divId).hidden = false;
  });
}

// set view
async function setView() {
  document.getElementById('select-engine').innerHTML = await ipcRenderer.invoke('get-engine-select');

  document.getElementById('select-from').innerHTML = await ipcRenderer.invoke('get-source-select');

  document.getElementById('select-from-player').innerHTML = await ipcRenderer.invoke('get-player-source-select');

  document.getElementById('select-to').innerHTML = await ipcRenderer.invoke('get-target-select');

  //document.getElementById('select-app-language').innerHTML = await ipcRenderer.invoke('get-ui-select');

  // Populate font selector options BEFORE reading config that sets its value
  await populateFontSelector(); 
  await readConfig();

  // change UI text
  ipcRenderer.send('change-ui-text');
}

// set event
function setEvent() {
  // move window
  document.addEventListener('move-window', (e) => {
    ipcRenderer.send('move-window', e.detail, false);
  });

  // background color
  setOnInputEvent('input-background-color', 'span-background-color');

  // background transparency
  setOnInputEvent('input-background-transparency', 'span-background-transparency');

  // speech speed
  setOnInputEvent('input-speech-speed', 'span-speech-speed');

  // dialog color
  setOnInputEvent('input-dialog-color', 'span-dialog-color');

  // dialog transparency
  setOnInputEvent('input-dialog-transparency', 'span-dialog-transparency');

  // select-engine
  document.getElementById('select-engine').addEventListener('change', () => {
    ipcRenderer.send('check-api', document.getElementById('select-engine').value);
  });
}

// set button
function setButton() {
  // close
  document.getElementById('img-button-close').onclick = () => {
    ipcRenderer.send('close-window');
  };

  // page
  document.getElementById('select-option').onchange = () => {
    const value = document.getElementById('select-option').value;
    document.querySelectorAll('.config-page').forEach((page) => {
      document.getElementById(page.id).hidden = true;
    });
    document.getElementById(value).hidden = false;

    // When channel page is selected, update the select all button text
    if (value === 'div-channel') {
        updateChannelSelectAllButtonState();
    }
  };

  // download json
  document.getElementById('button-download-json').onclick = () => {
    ipcRenderer.send('download-json');
  };

  // delete temp
  document.getElementById('button-delete-temp').onclick = () => {
    ipcRenderer.send('delete-temp');
  };

  // restart sharlayan reader
  document.getElementById('button-restart-sharlayan-reader').onclick = () => {
    ipcRenderer.send('restart-sharlayan-reader');
  };

  // version check
  document.getElementById('button-version-check').onclick = () => {
    ipcRenderer.send('version-check');
  };

  // fix reader
  document.getElementById('button-fix-reader').onclick = () => {
    ipcRenderer.send('fix-reader');
  };

  // get set google vision
  document.getElementById('a-set-google-vision').onclick = async () => {
    const path = await ipcRenderer.invoke('get-root-path', 'src', 'data', 'text', 'readme', 'sub-google-vision-api.html');
    ipcRenderer.send('execute-command', `explorer "${path}"`);
  };

  // set cohere api
  document.getElementById('a-set-gemini-api').onclick = async () => {
    const path = await ipcRenderer.invoke('get-root-path', 'src', 'data', 'text', 'readme', 'sub-gemini-api.html');
    ipcRenderer.send('execute-command', `explorer "${path}"`);
  };

  // set cohere api
  document.getElementById('a-set-cohere-api').onclick = async () => {
    const path = await ipcRenderer.invoke('get-root-path', 'src', 'data', 'text', 'readme', 'sub-cohere-api.html');
    ipcRenderer.send('execute-command', `explorer "${path}"`);
  };

  document.getElementById('a-set-kimi-api').onclick = async () => {
    const path = await ipcRenderer.invoke('get-root-path', 'src', 'data', 'text', 'readme', 'sub-kimi-api.html');
    ipcRenderer.send('execute-command', `explorer "${path}"`);
  };

  // set gpt api
  document.getElementById('a-set-gpt-api').onclick = async () => {
    const path = await ipcRenderer.invoke('get-root-path', 'src', 'data', 'text', 'readme', 'sub-gpt-api.html');
    ipcRenderer.send('execute-command', `explorer "${path}"`);
  };

  // set LLM API
  document.getElementById('a-set-llm-api').onclick = async () => {
    const path = await ipcRenderer.invoke('get-root-path', 'src', 'data', 'text', 'readme', 'sub-llm-api.html');
    ipcRenderer.send('execute-command', `explorer "${path}"`);
  };

  // set google credential
  document.getElementById('button-google-credential').onclick = () => {
    ipcRenderer.send('set-google-credential');
  };

  // set img-visibility
  const imgVisibilityButtons = document.getElementsByClassName('img-visibility');
  for (let index = 0; index < imgVisibilityButtons.length; index++) {
    let isVisible = false;
    const element = imgVisibilityButtons[index];
    element.onclick = () => {
      const imgId = element.id;
      const inputId = imgId.replace('img-visibility', 'input');
      isVisible = !isVisible;
      if (isVisible) {
        document.getElementById(imgId).setAttribute('src', './img/ui/visibility_white_48dp.svg');
        document.getElementById(inputId).setAttribute('type', 'text');
      } else {
        document.getElementById(imgId).setAttribute('src', './img/ui/visibility_off_white_48dp.svg');
        document.getElementById(inputId).setAttribute('type', 'password');
      }
    };
  }

  // readme
  document.getElementById('a-readme').onclick = async () => {
    const path = await ipcRenderer.invoke('get-root-path', 'src', 'data', 'text', 'readme', 'index.html');
    ipcRenderer.send('execute-command', `explorer "${path}"`);
  };

  // bug report
  document.getElementById('a-bug-report').onclick = () => {
    ipcRenderer.send('execute-command', 'explorer "https://forms.gle/1iX2Gq4G1itCy3UH9"');
  };

  // view response
  document.getElementById('a-view-response').onclick = () => {
    ipcRenderer.send(
      'execute-command',
      'explorer "https://docs.google.com/spreadsheets/d/1unaPwKFwJAQ9iSnNJ063BAjET5bRGybp5fxxvcG-Wr8/edit?usp=sharing"'
    );
  };

  // github
  document.getElementById('a-github').onclick = () => {
    ipcRenderer.send('execute-command', 'explorer "https://github.com/winw1010/tataru-assistant"');
  };

  // author
  document.getElementById('a-author').onclick = () => {
    ipcRenderer.send('execute-command', 'explorer "https://home.gamer.com.tw/artwork.php?sn=5323128"');
  };

  // donate
  document.getElementById('a-donate').onclick = () => {
    ipcRenderer.send('execute-command', 'explorer "https://www.buymeacoffee.com/winw1010"');
  };

  // default
  document.getElementById('button-save-default-config').onclick = async () => {
    await saveDefaultConfig();
  };

  // save
  document.getElementById('button-save-config').onclick = async () => {
    await saveConfig();
  };

  // Channel Select/Deselect All button
  const channelSelectAllButton = document.getElementById('button-channel-select-all');
  if (channelSelectAllButton) {
    channelSelectAllButton.onclick = () => {
        const channelCheckboxes = document.querySelectorAll('#div-channel-list input[type="checkbox"].form-check-input');
        if (channelCheckboxes.length === 0) return;

        // Determine the target state based on current state of checkboxes
        let allCurrentlySelected = true;
        for (const checkbox of channelCheckboxes) {
            if (!checkbox.checked) {
                allCurrentlySelected = false;
                break;
            }
        }
        
        const newCheckedState = !allCurrentlySelected;

        channelCheckboxes.forEach(checkbox => {
            checkbox.checked = newCheckedState;
        });

        // Update button text using cached translated strings
        channelSelectAllButton.innerText = newCheckedState ? translatedButtonDeselectAll : translatedButtonSelectAll;
    };
  }
}

// read config
async function readConfig() {
  try {
    const config = await ipcRenderer.invoke('get-config');
    const chatCode = await ipcRenderer.invoke('get-chat-code');
    const version = await ipcRenderer.invoke('get-version');

    // Ensure config is valid before proceeding
    if (!config) {
      console.error(' Tataru Assistant: Failed to load config, or config is null/undefined in readConfig.');
      document.body.style.fontFamily = ''; // Fallback to default font
      // Optionally display a minimal error message in the body if critical elements can't be populated
      // document.body.innerHTML = 'Error: Could not load configuration.';
      return; // Exit early if config is fundamentally broken
    }

    // read options (this function has its own try-catch for individual items)
    readOptions(config);

    // channel (ensure chatCode is available if readChannel depends on it)
    if (chatCode) {
      readChannel(config, chatCode);
    } else {
      console.warn('Tataru Assistant: chatCode is not available for readChannel.');
    }

    // about (ensure version is available)
    if (document.getElementById('span-version')) {
      document.getElementById('span-version').innerText = version || 'N/A';
    } else {
      console.warn('Tataru Assistant: span-version element not found.');
    }

    // Apply selected font to the config window itself
    if (config.dialog && typeof config.dialog.fontFamily === 'string') {
      if (config.dialog.fontFamily !== '') {
        document.body.style.fontFamily = `\"${config.dialog.fontFamily}\", sans-serif`;
      } else {
        document.body.style.fontFamily = ''; // Revert to default CSS for the body
      }
    } else {
      console.warn('Tataru Assistant: config.dialog.fontFamily not found or not a string, using default body font.');
      document.body.style.fontFamily = ''; 
    }
  } catch (error) {
    console.error('Tataru Assistant: Critical error during readConfig:', error);
    // Fallback for the entire body font in case of any error in readConfig
    try {
      document.body.style.fontFamily = ''; // Attempt to set a known safe default stylesheet font
      // Display a user-friendly error message in the config window
      // document.body.innerHTML = 'Error loading configuration window. Please try restarting or resetting settings.';
    } catch (bodyStyleError) {
      console.error('Tataru Assistant: Error setting fallback body font style:', bodyStyleError);
    }
  }
}

// save config
async function saveConfig() {
  const config = await ipcRenderer.invoke('get-config');
  const chatCode = await ipcRenderer.invoke('get-chat-code');

  // save options
  saveOptions(config);

  // window backgroundColor
  const windowColor = document.getElementById('input-background-color').value;
  const windowTransparent = parseInt(document.getElementById('input-background-transparency').value).toString(16);
  config.indexWindow.backgroundColor = windowColor + windowTransparent.padStart(2, '0');

  // dialog backgroundColor
  const dialogColor = document.getElementById('input-dialog-color').value;
  const dialogTransparent = parseInt(document.getElementById('input-dialog-transparency').value).toString(16);
  config.dialog.backgroundColor = dialogColor + dialogTransparent.padStart(2, '0');

  // save channel
  saveChannel(config, chatCode);

  // set config
  await ipcRenderer.invoke('set-config', config);

  // set chat code
  await ipcRenderer.invoke('set-chat-code', chatCode);

  // reset app
  resetApp(config);

  // reset config
  await readConfig();

  // add notification
  ipcRenderer.send('add-notification', 'SETTINGS_SAVED');
}

// save default config
async function saveDefaultConfig() {
  // set default config
  const config = await ipcRenderer.invoke('set-default-config');

  // set default chat code
  await ipcRenderer.invoke('set-default-chat-code');

  // reset app
  resetApp(config);

  // reset config
  await readConfig();

  // add notification
  ipcRenderer.send('add-notification', 'RESTORED_TO_DEFAULT_SETTINGS');
}

// reset app
function resetApp(config) {
  // load json
  ipcRenderer.send('load-json');

  // reset view
  ipcRenderer.send('send-index', 'reset-view', config);

  // change UI text
  ipcRenderer.send('change-ui-text');

  // set global shortcut
  ipcRenderer.send('set-global-shortcut');
}

// set on input event
function setOnInputEvent(inputId = '', spanId = '') {
  document.getElementById(inputId).oninput = () => {
    document.getElementById(spanId).innerText = document.getElementById(inputId).value;
  };
}

// read channel
function readChannel(config, chatCode) {
  const channel = document.getElementById('div-channel-list');
  let newInnerHTML = '';

  if (!chatCode || chatCode.length === 0) {
      channel.innerHTML = '<p>No channels available.</p>'; // Or some other placeholder
      updateChannelSelectAllButtonState(); // Update button state if no channels
      return;
  }
  
  for (let index = 0; index < chatCode.length; index++) {
    const element = chatCode[index];
    const checkboxId = `checkbox-${element.ChatCode}`;
    const labelId = `label-${element.ChatCode}`;
    const spanId = `span-${element.ChatCode}`;
    const inputId = `input-${element.ChatCode}`;
    const checked = config.channel[element.ChatCode] ? 'checked' : '';
    const color = element.Color;

    newInnerHTML += `
            <hr />
            <div class="row align-items-center">
                <div class="col">
                    <div class="form-check form-switch">
                        <input type="checkbox" class="form-check-input" role="switch" value="" id="${checkboxId}" ${checked} />
                        <label class="form-check-label" for="${checkboxId}" id="${labelId}">${element.Name}</label>
                    </div>
                </div>
                <div class="col-auto">
                    <span id="${spanId}" style="color:${color};">${color}</span>
                </div>
                <div class="col-auto">
                    <input type="color" class="form-control form-control-color" value="${color}" id="${inputId}" />
                </div>
            </div>
        `;
  }

  channel.innerHTML = newInnerHTML;

  for (let index = 0; index < chatCode.length; index++) {
    const element = chatCode[index];
    setOnInputEvent(`input-${element.ChatCode}`, `span-${element.ChatCode}`);
  }
  // After channels are populated, update the select-all button's state
  updateChannelSelectAllButtonState();
}

function saveChannel(config = {}, chatCode = {}) {
  config.channel = {};

  // save checked name
  const checkedArray = document.querySelectorAll('#div-channel input[type="checkbox"]:checked');
  for (let index = 0; index < checkedArray.length; index++) {
    const code = checkedArray[index].id.replaceAll('checkbox-', '');
    const label = document.getElementById(`label-${code}`);

    if (label) {
      config.channel[code] = label.innerText;
    }
  }

  // save color
  const channelArray = document.querySelectorAll('#div-channel input[type="checkbox"]');
  for (let index = 0; index < channelArray.length; index++) {
    const code = channelArray[index].id.replaceAll('checkbox-', '');
    const input = document.getElementById(`input-${code}`);

    if (input) {
      chatCode[index].Color = input.value;
    }
  }
}

function readOptions(config = {}) {
  getOptionList().forEach((value) => {
    const elementId = value[0][0];
    const elementProperty = value[0][1];
    const configIndex1 = value[1][0];
    const configIndex2 = value[1][1];
    const valueFunction = value[2];

    let configValue = config[configIndex1][configIndex2];
    if (valueFunction) {
      configValue = valueFunction(configValue);
    }

    try {
      document.getElementById(elementId)[elementProperty] = configValue;
    } catch (error) {
      console.log(error);
    }
  });
}

function saveOptions(config = {}) {
  getOptionList().forEach((value) => {
    const elementId = value[0][0];
    const elementProperty = value[0][1];
    const configIndex1 = value[1][0];
    const configIndex2 = value[1][1];

    if (configIndex2 !== 'backgroundColor') {
      try {
        config[configIndex1][configIndex2] = document.getElementById(elementId)[elementProperty];
      } catch (error) {
        console.log(error);
      }
    }
  });
}

function getOptionList() {
  return [
    // window
    [
      ['checkbox-top', 'checked'],
      ['indexWindow', 'alwaysOnTop'],
    ],
    [
      ['checkbox-focusable', 'checked'],
      ['indexWindow', 'focusable'],
    ],
    [
      ['checkbox-shortcut', 'checked'],
      ['indexWindow', 'shortcut'],
    ],
    [
      ['checkbox-min-size', 'checked'],
      ['indexWindow', 'minSize'],
    ],
    [
      ['checkbox-hide-button', 'checked'],
      ['indexWindow', 'hideButton'],
    ],
    [
      ['checkbox-hide-dialog', 'checked'],
      ['indexWindow', 'hideDialog'],
    ],
    [
      ['input-hide-dialog', 'value'],
      ['indexWindow', 'hideDialogTimeout'],
    ],
    [
      ['span-background-color', 'innerText'],
      ['indexWindow', 'backgroundColor'],
      (value) => {
        return value.slice(0, 7);
      },
    ],
    [
      ['input-background-color', 'value'],
      ['indexWindow', 'backgroundColor'],
      (value) => {
        return value.slice(0, 7);
      },
    ],
    [
      ['span-background-transparency', 'innerText'],
      ['indexWindow', 'backgroundColor'],
      (value) => {
        return parseInt(value.slice(7), 16);
      },
    ],
    [
      ['input-background-transparency', 'value'],
      ['indexWindow', 'backgroundColor'],
      (value) => {
        return parseInt(value.slice(7), 16);
      },
    ],
    [
      ['span-speech-speed', 'innerText'],
      ['indexWindow', 'speechSpeed'],
    ],
    [
      ['input-speech-speed', 'value'],
      ['indexWindow', 'speechSpeed'],
    ],

    // font
    [
      ['select-font-family', 'value'],
      ['dialog', 'fontFamily'],
    ],
    [
      ['select-font-weight', 'value'],
      ['dialog', 'weight'],
    ],
    [
      ['input-font-size', 'value'],
      ['dialog', 'fontSize'],
    ],
    [
      ['input-dialog-spacing', 'value'],
      ['dialog', 'spacing'],
    ],
    [
      ['input-dialog-radius', 'value'],
      ['dialog', 'radius'],
    ],
    [
      ['span-dialog-color', 'innerText'],
      ['dialog', 'backgroundColor'],
      (value) => {
        return value.slice(0, 7);
      },
    ],
    [
      ['input-dialog-color', 'value'],
      ['dialog', 'backgroundColor'],
      (value) => {
        return value.slice(0, 7);
      },
    ],
    [
      ['span-dialog-transparency', 'innerText'],
      ['dialog', 'backgroundColor'],
      (value) => {
        return parseInt(value.slice(7), 16);
      },
    ],
    [
      ['input-dialog-transparency', 'value'],
      ['dialog', 'backgroundColor'],
      (value) => {
        return parseInt(value.slice(7), 16);
      },
    ],

    // translation
    [
      ['checkbox-auto-change', 'checked'],
      ['translation', 'autoChange'],
    ],
    [
      ['checkbox-fix-translation', 'checked'],
      ['translation', 'fix'],
    ],
    [
      ['checkbox-skip-system', 'checked'],
      ['translation', 'skip'],
    ],
    [
      ['checkbox-skip-chinese', 'checked'],
      ['translation', 'skipChinese'],
    ],
    [
      ['select-engine', 'value'],
      ['translation', 'engine'],
    ],
    [
      ['select-from', 'value'],
      ['translation', 'from'],
    ],
    [
      ['select-from-player', 'value'],
      ['translation', 'fromPlayer'],
    ],
    [
      ['select-to', 'value'],
      ['translation', 'to'],
    ],

    // api
    [
      ['input-google-vision-api-key', 'value'],
      ['api', 'googleVisionApiKey'],
    ],
    [
      ['input-gemini-api-key', 'value'],
      ['api', 'geminiApiKey'],
    ],
    [
      ['input-gemini-model', 'value'],
      ['api', 'geminiModel'],
    ],

    [
      ['input-gpt-api-key', 'value'],
      ['api', 'gptApiKey'],
    ],
    [
      ['input-gpt-model', 'value'],
      ['api', 'gptModel'],
    ],

    [
      ['input-cohere-token', 'value'],
      ['api', 'cohereToken'],
    ],
    [
      ['input-cohere-model', 'value'],
      ['api', 'cohereModel'],
    ],

    [
      ['input-kimi-token', 'value'],
      ['api', 'kimiToken'],
    ],
    [
      ['input-kimi-model', 'value'],
      ['api', 'kimiModel'],
    ],
    [
      ['input-kimi-custom-prompt', 'value'],
      ['api', 'kimiCustomPrompt'],
    ],

    [
      ['input-llm-api-url', 'value'],
      ['api', 'llmApiUrl'],
    ],
    [
      ['input-llm-api-key', 'value'],
      ['api', 'llmApiKey'],
    ],
    [
      ['input-llm-model', 'value'],
      ['api', 'llmApiModel'],
    ],
    [
      ['input-llm-custom-prompt', 'value'],
      ['api', 'llmCustomPrompt'],
    ],

    [
      ['input-ai-chat-enable', 'checked'],
      ['ai', 'useChat'],
    ],
    [
      ['input-ai-chat-length', 'value'],
      ['ai', 'chatLength'],
    ],
    [
      ['input-ai-temperature', 'value'],
      ['ai', 'temperature'],
    ],

    // proxy
    [
      ['input-proxy-enable', 'checked'],
      ['proxy', 'enable'],
    ],
    [
      ['select-proxy-protocol', 'value'],
      ['proxy', 'protocol'],
    ],
    [
      ['input-proxy-hostname', 'value'],
      ['proxy', 'hostname'],
    ],
    [
      ['input-proxy-port', 'value'],
      ['proxy', 'port'],
    ],
    [
      ['input-proxy-username', 'value'],
      ['proxy', 'username'],
    ],
    [
      ['input-proxy-password', 'value'],
      ['proxy', 'password'],
    ],

    // system
    [
      ['select-app-language', 'value'],
      ['system', 'appLanguage'],
    ],
    [
      ['checkbox-auto-download-json', 'checked'],
      ['system', 'autoDownloadJson'],
    ],
    [
      ['checkbox-ssl-certificate', 'checked'],
      ['system', 'sslCertificate'],
    ],
  ];
}

// Functions for font selection (NEW)
async function populateFontSelector() {
  const selectElement = document.getElementById('select-font-family');
  if (!selectElement) return;

  const result = await ipcRenderer.invoke('get-system-fonts');

  if (result.success && result.fonts) {
    result.fonts.forEach(font => {
      // Basic filtering for some common CJK fonts that might not be ideal for main UI
      // This list can be adjusted or made more sophisticated later.
      const lowerFont = font.toLowerCase();
      if (lowerFont.includes('mingliu') || lowerFont.includes('simsun') || 
          lowerFont.includes('ms jhenghei') || lowerFont.includes('ms yahei') ||
          lowerFont.includes('gulim') || lowerFont.includes('batang')) {
        // Skip these for now
      } else {
        const option = document.createElement('option');
        option.value = font; // Use original font name as value
        option.textContent = font; // Display original font name
        /* try { // Optimized: Remove per-option font preview to prevent lag
          // Attempt to apply font preview to the option itself
          option.style.fontFamily = font;
        } catch (e) {
          console.warn(`Could not apply preview for font: ${font}`, e);
        } */
        selectElement.appendChild(option);
      }
    });
  } else {
    console.error('Failed to populate font selector:', result.error);
    const option = document.createElement('option');
    option.textContent = '无法加载字体列表'; // This text should be handled by i18n
    option.id = 'option-font-load-error'; // ID for i18n
    option.disabled = true;
    selectElement.appendChild(option);
  }
}
// END New functions
