// The main script for the extension
// The following are examples of some basic extension functionality

//You'll likely need to import extension_settings, getContext, and loadExtensionSettings from extensions.js
import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";

//You'll likely need to import some other functions from the main script
import { 
  saveSettingsDebounced,
  eventSource,
  event_types,
  updateMessageBlock,
 } from "../../../../script.js";
import { regexFromString } from '../../../utils.js';
import { MacrosParser } from '../../../macros.js';
import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';

// Keep track of where your extension is located, name should match repo name
const extensionName = "MHY-image-auto";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

//储存变量
const storeVariable = {
  regexCount: 5,
  text: '',
  regexInput: [`/<prompt>[\\s\\S]+?</prompt>/g`,`/(?<=<prompt>[\\s\\S]+prompt=")[\\s\\S]+?(?="[\\s\\S]+</prompt>)/g`],
  regexText: [],
  regexName: ['replace','prompt','negativePrompt','image','lora'],
};
storeVariable.regexCount = storeVariable.regexName.length;
const defaultSettings = storeVariable;
const storeData = extension_settings[extensionName];
const macrosData = [];
const response = await fetch('/scripts/extensions/third-party/MHY-image-auto/name.json').then(res => res.json());
 
// Loads the extension settings if they exist, otherwise initializes them to the defaults.
async function loadSettings() {
  //Create the settings if they don't exist
  extension_settings[extensionName] = extension_settings[extensionName] || {};
  if (Object.keys(extension_settings[extensionName]).length === 0) {
    Object.assign(extension_settings[extensionName], defaultSettings);
  }
}

// This function is called when the extension settings are changed in the UI
function onExampleInput(event) {
  const value = Boolean($(event.target).prop("checked"));
  extension_settings[extensionName].example_setting = value;
  saveSettingsDebounced();
}

// This function is called when the button is clicked
/*function onButtonClick() {
  // You can do whatever you want here
  // Let's make a popup appear with the checked setting
  toastr.info(
    `The checkbox is ${extension_settings[extensionName].example_setting ? "checked" : "not checked"}`,
    "A popup appeared because you clicked the button!"
  );
}
*/
// This function is called when the extension is loaded


//获取正文
async function getText() {
  const context = getContext();
  const message = context.chat[context.chat.length - 1];
  $('#text').val(message.mes,);
}


//加载数据
function loadData() {
  $('#text').val(storeData.text);
  for (let i = 0; i < storeData.regexCount; i++) {
    const newRegexHtml = $(
      `
      <div id="regex_model" class="flex-container">
        <div id="${storeData.regexName[i]}" class="menu_button menu_button_icon interactable" data-i18n="[title]get_text" title="获取正文" tabindex="0"
        role="button">
        提取${storeData.regexName[i]}
        </div>
        <textarea id="regex_input_${storeData.regexName[i]}" placeholder="输入正则" rows="2"></textarea>
        <textarea id="regex_text_${storeData.regexName[i]}" placeholder="提取文本" rows="2"></textarea>
      </div>`
    );
    $('#regex_container').append(newRegexHtml);
    $(`#regex_input_${storeData.regexName[i]}`).val(storeData.regexInput[i]);
    $(`#regex_text_${storeData.regexName[i]}`).val(storeData.regexText[i]);
  }
}

//初始化
jQuery(async () => {
  // This is an example of loading HTML from a file
  const settingsHtml = await $.get(`${extensionFolderPath}/setting.html`);


  // Append settingsHtml to extensions_settings
  // extension_settings and extensions_settings2 are the left and right columns of the settings menu
  // Left should be extensions that deal with system functions and right should be visual/UI related 
  $('#extensions_settings').append(settingsHtml);
  loadSettings();
  loadData();
  //触发条件
  eventSource.on(event_types.MESSAGE_UPDATED, getText);
  eventSource.on(event_types.MESSAGE_RECEIVED, getText);
  $('#get_text').on('click', function() {
    getText();
    //正文保存
    storeData.text =$('#text').val();
    saveSettingsDebounced();
  });
  // 正文处理
  for (let i = 0; i < storeData.regexCount; i++) {
    $(`#${storeData.regexName[i]}`).on('click', function() {
        if (storeData.regexInput[i]) {
        storeData.regexText[i] = [...storeData.text.matchAll(regexFromString(storeData.regexInput[i]))];
        $(`#regex_text_${storeData.regexName[i]}`).val(storeData.regexText[i]);
        }
      });
    }
  //添加正则
  $('#add_regex').on('click', function () {
    storeData.regexCount++;
    const newRegex = $(`
    <div id="regex_model" class="flex-container">
      <div id="start_regex" class="menu_button menu_button_icon interactable" data-i18n="[title]get_text" title="获取正文" tabindex="0"
      role="button">
      提取
      </div>
      <textarea id="regex_input${storeData.regexCount}" placeholder="输入正则" rows="2"></textarea>
      <textarea id="regex_text${storeData.regexCount}" placeholder="提取文本" rows="2"></textarea>
    </div>`);
    newRegex.attr('id','regex' + storeData.regexCount);
    $('#regex_container').append(newRegex);
  });
  //删除正则
  $('#delete_regex').on('click', function () {
    storeData.regexCount--;
    $('#regex_container').children().last().remove();
  });
  //恢复默认
  $('#reset_defaults').on('click', function () {
    Object.assign(extension_settings[extensionName], defaultSettings);
    saveSettingsDebounced();
    loadData();
  });
  //保存数据
  $('#text').on('input', function () {
    storeData.text = $(this).val();
    saveSettingsDebounced();
  }); 
  for (let i = 0; i <storeData.regexCount; i++) {
    $(`#regex_input_${storeData.regexName[i]}`).on('input', function () {
      storeData.regexInput[i] = $(this).val();
      saveSettingsDebounced();
    }); 
    $(`#regex_text_${storeData.regexName[i]}`).on('input', function () {
      storeData.regexText[i] = $(this).val();
      saveSettingsDebounced();
    }); 
  } 
  //生成图片
  $('#generate_image').on('click', async function () {
    for (let i = 0; i < storeData.regexCount; i++) {
        if (storeData.regexInput[i]) {
        storeData.regexText[i] = [...storeData.text.matchAll(regexFromString(storeData.regexInput[i]))];
        $(`#regex_text_${storeData.regexName[i]}`).val(storeData.regexText[i]);
        }
      }
    toastr.info(`开始生成图片，共${storeData.regexText[0].length}张`);
    for (let i = 0; i < storeData.regexText[0].length; i++) {
      //取值保护
      for (let j = 0; j < storeData.regexCount; j++) {
        if (!storeData.regexText?.[j]?.[i]) {
          storeData.regexText[j] = storeData.regexText[j] || [];
          storeData.regexText[j][i] = '';
        }
      }
      storeData.regexText[3] = storeData.regexText[3] || [];
      storeData.regexText[3][i] = storeData.regexText?.[3]?.[i]?.trim() || randomItem(response);
      //提示生成
      toastr.info(`macros更新${i}`);
      //macros更新
      for (let k = 0; k < storeData.regexCount; k++) {
        if (storeData.regexText?.[k]?.[i]) {
        macrosData[k] = storeData.regexText[k][i];
        }
      }
      //生成图片
      const result = await generateImage(storeData.regexText[1][i], storeData.regexText[2][i]);
      // 插入图片
      const context = getContext();
      const message = context.chat[context.chat.length - 1];
      const imageUrl = `<img src="${result}" title="${storeData.regexText[1][i]}" prompt="${storeData.regexText[1][i]}">`;
      message.mes = message.mes.replace(storeData.regexText[0][i], storeData.regexText[0][i] + imageUrl);
      // 试验输出
      console.log(randomItem(imageUrl));
      // 保存更新
      updateMessageBlock(context.chat.length - 1, message,);
      await eventSource.emit(event_types.MESSAGE_UPDATED,context.chat.length - 1,);
      await context.saveChat();

      toastr.info(`成功生成图片${i + 1}`);
      i === storeData.regexText[0].length-1 && toastr.info(`全部图片生成完成`);
    }
  });
  //调试
  $('#debug').on('click', async function () {
    console.log('1');
  });
});
//声明macros
for (let i = 0; i < storeData.regexCount; i++) {
  MacrosParser.registerMacro(
    storeData.regexName[i], () => macrosData[i], "获取" + storeData.regexName[i],
  );
}
  
//生成图片
async function generateImage(prompt, negativePrompt) {
  const result = await SlashCommandParser.commands['sd'].callback({
    quiet: 'true',
    negative: negativePrompt},
    prompt,
  );
  return result;
}
//随机选择
function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}
