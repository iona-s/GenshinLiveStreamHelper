// ==UserScript==
// @name         原神/崩坏：星穹铁道/绝区零b站直播活动抢码助手
// @namespace    GenshinLiveStreamHelper
// @version      5.7-3.3-2.0-2025.6.26-0
// @description  一款用于原神/崩坏：星穹铁道/绝区零b站直播活动的抢码助手
// @author       原作者ifeng0188 由ionase修改
// @match        *://www.bilibili.com/blackboard/*award-exchange.html?task_id=*
// @icon         https://ys.mihoyo.com/main/favicon.ico
// @grant        unsafeWindow
// @grant        GM_log
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @homepageURL  https://github.com/iona-s/GenshinLiveStreamHelper
// @supportURL   https://github.com/iona-s/GenshinLiveStreamHelper/issues
// @downloadURL  https://mirror.ghproxy.com/https://raw.githubusercontent.com/iona-s/GenshinLiveStreamHelper/main/demo.js
// @updateURL    https://mirror.ghproxy.com/https://raw.githubusercontent.com/iona-s/GenshinLiveStreamHelper/main/demo.js
// @license      GPL-3.0 license
// ==/UserScript==
(function main() {
  // region 配置和参数初始化
  if (!GM_getValue('gh_start_time')) {
    GM_setValue('gh_start_time', '00:59:40');
  }
  if (!GM_getValue('gh_interval')) {
    GM_setValue('gh_interval', '1000');
  }
  if (!GM_getValue('gh_biliExtraButton')) {
    GM_setValue('gh_biliExtraButton', true);
  }
  if (!GM_getValue('gh_biliExtraInfo')) {
    GM_setValue('gh_biliExtraInfo', false);
  }

  const newApi = (function getGame() {
    if (document.location.href.includes('new-award-exchange')) return true; // 用于判断b站，目前原神用的new-award-exchange
    return false;
  }());
  // endregion

  // region 脚本菜单相关
  function setStartTime() {
    const temp = prompt('请输入抢码时间，格式示例：01:59:59', GM_getValue('gh_start_time'));
    if (temp == null) return;
    if (/^(\d{2}):(\d{2}):(\d{2})$/.test(temp)) {
      GM_setValue('gh_start_time', temp);
      alert('设置成功，即将刷新页面使之生效');
      document.location.reload();
    } else {
      alert('格式错误，请重新输入');
    }
  }

  function setTimeInterval() {
    const temp = prompt('请输入抢码间隔，格式示例：1000，单位毫秒', GM_getValue('gh_interval'));
    if (temp == null) return;
    if (/^(\d+)$/.test(temp)) {
      GM_setValue('gh_interval', temp);
      alert('设置成功，即将刷新页面使之生效');
      document.location.reload();
    } else {
      alert('格式错误，请重新输入');
    }
  }

  function biliExtraButton() {
    GM_setValue('gh_biliExtraButton', !GM_getValue('gh_biliExtraButton'));
    alert('切换成功，即将刷新页面使之生效');
    document.location.reload();
  }

  function biliExtraInfo() {
    GM_setValue('gh_biliExtraInfo', !GM_getValue('gh_biliExtraInfo'));
    alert('切换成功，即将刷新页面使之生效');
    document.location.reload();
  }

  // 注册菜单
  GM_registerMenuCommand(`设定抢码时间：${GM_getValue('gh_start_time')}（点击修改）`, setStartTime);
  GM_registerMenuCommand(`设定抢码间隔：${GM_getValue('gh_interval')} 毫秒（点击修改）`, setTimeInterval);
  GM_registerMenuCommand(`${GM_getValue('gh_biliExtraButton') ? '✅' : '❌'}启用主动开始按钮（点击切换）`, biliExtraButton);
  GM_registerMenuCommand(`${GM_getValue('gh_biliExtraInfo') ? '✅' : '❌'}启用b站额外信息（点击切换）`, biliExtraInfo);
  // endregion

  // region 杂项函数
  // 日志
  function log(msg) {
    console.info(`【b站直播活动抢码助手】${msg}`);
  }

  // 获取ck，主要是b站csrf
  function getCookie(cname) {
    const name = `${cname}=`;
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i += 1) {
      let c = ca[i];
      while (c.charAt(0) === ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) === 0) {
        return c.substring(name.length, c.length);
      }
    }
    return '';
  }
  // endregion

  // region 一些变量/常量
  const csrfToken = getCookie('bili_jct');
  const taskId = new URLSearchParams(window.location.href.split('?')[1]).get('task_id');
  const webLocation = document.querySelector('meta[name="spm_prefix"]').content;
  // eslint-disable-next-line
  let img_key, sub_key;
  let activityId;
  let activityName;
  let taskName;
  let rewardName;
  let receiveId;
  let taskIdReceive;
  let manualStart = false;

  const queryInterval = 3000;
  // endregion

  // region wbi签名
  // source: https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/misc/sign/wbi.md#JavaScript
  /* eslint-disable */
  const mixinKeyEncTab = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
    33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
    61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
    36, 20, 34, 44, 52
  ]

  // source: https://stackoverflow.com/questions/14733374/how-to-generate-an-md5-hash-from-a-string-in-javascript-node-js
  var md5 = function(d){var r = M(V(Y(X(d),8*d.length)));return r.toLowerCase()};function M(d){for(var _,m="0123456789ABCDEF",f="",r=0;r<d.length;r++)_=d.charCodeAt(r),f+=m.charAt(_>>>4&15)+m.charAt(15&_);return f}function X(d){for(var _=Array(d.length>>2),m=0;m<_.length;m++)_[m]=0;for(m=0;m<8*d.length;m+=8)_[m>>5]|=(255&d.charCodeAt(m/8))<<m%32;return _}function V(d){for(var _="",m=0;m<32*d.length;m+=8)_+=String.fromCharCode(d[m>>5]>>>m%32&255);return _}function Y(d,_){d[_>>5]|=128<<_%32,d[14+(_+64>>>9<<4)]=_;for(var m=1732584193,f=-271733879,r=-1732584194,i=271733878,n=0;n<d.length;n+=16){var h=m,t=f,g=r,e=i;f=md5_ii(f=md5_ii(f=md5_ii(f=md5_ii(f=md5_hh(f=md5_hh(f=md5_hh(f=md5_hh(f=md5_gg(f=md5_gg(f=md5_gg(f=md5_gg(f=md5_ff(f=md5_ff(f=md5_ff(f=md5_ff(f,r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+0],7,-680876936),f,r,d[n+1],12,-389564586),m,f,d[n+2],17,606105819),i,m,d[n+3],22,-1044525330),r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+4],7,-176418897),f,r,d[n+5],12,1200080426),m,f,d[n+6],17,-1473231341),i,m,d[n+7],22,-45705983),r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+8],7,1770035416),f,r,d[n+9],12,-1958414417),m,f,d[n+10],17,-42063),i,m,d[n+11],22,-1990404162),r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+12],7,1804603682),f,r,d[n+13],12,-40341101),m,f,d[n+14],17,-1502002290),i,m,d[n+15],22,1236535329),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+1],5,-165796510),f,r,d[n+6],9,-1069501632),m,f,d[n+11],14,643717713),i,m,d[n+0],20,-373897302),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+5],5,-701558691),f,r,d[n+10],9,38016083),m,f,d[n+15],14,-660478335),i,m,d[n+4],20,-405537848),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+9],5,568446438),f,r,d[n+14],9,-1019803690),m,f,d[n+3],14,-187363961),i,m,d[n+8],20,1163531501),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+13],5,-1444681467),f,r,d[n+2],9,-51403784),m,f,d[n+7],14,1735328473),i,m,d[n+12],20,-1926607734),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+5],4,-378558),f,r,d[n+8],11,-2022574463),m,f,d[n+11],16,1839030562),i,m,d[n+14],23,-35309556),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+1],4,-1530992060),f,r,d[n+4],11,1272893353),m,f,d[n+7],16,-155497632),i,m,d[n+10],23,-1094730640),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+13],4,681279174),f,r,d[n+0],11,-358537222),m,f,d[n+3],16,-722521979),i,m,d[n+6],23,76029189),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+9],4,-640364487),f,r,d[n+12],11,-421815835),m,f,d[n+15],16,530742520),i,m,d[n+2],23,-995338651),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+0],6,-198630844),f,r,d[n+7],10,1126891415),m,f,d[n+14],15,-1416354905),i,m,d[n+5],21,-57434055),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+12],6,1700485571),f,r,d[n+3],10,-1894986606),m,f,d[n+10],15,-1051523),i,m,d[n+1],21,-2054922799),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+8],6,1873313359),f,r,d[n+15],10,-30611744),m,f,d[n+6],15,-1560198380),i,m,d[n+13],21,1309151649),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+4],6,-145523070),f,r,d[n+11],10,-1120210379),m,f,d[n+2],15,718787259),i,m,d[n+9],21,-343485551),m=safe_add(m,h),f=safe_add(f,t),r=safe_add(r,g),i=safe_add(i,e)}return Array(m,f,r,i)}function md5_cmn(d,_,m,f,r,i){return safe_add(bit_rol(safe_add(safe_add(_,d),safe_add(f,i)),r),m)}function md5_ff(d,_,m,f,r,i,n){return md5_cmn(_&m|~_&f,d,_,r,i,n)}function md5_gg(d,_,m,f,r,i,n){return md5_cmn(_&f|m&~f,d,_,r,i,n)}function md5_hh(d,_,m,f,r,i,n){return md5_cmn(_^m^f,d,_,r,i,n)}function md5_ii(d,_,m,f,r,i,n){return md5_cmn(m^(_|~f),d,_,r,i,n)}function safe_add(d,_){var m=(65535&d)+(65535&_);return(d>>16)+(_>>16)+(m>>16)<<16|65535&m}function bit_rol(d,_){return d<<_|d>>>32-_}
  // 对 imgKey 和 subKey 进行字符顺序打乱编码
  const getMixinKey = (orig) => mixinKeyEncTab.map(n => orig[n]).join('').slice(0, 32)

  // 获取最新的 img_key 和 sub_key
  async function getWbiKeys() {
    const res = await fetch('https://api.bilibili.com/x/web-interface/nav', {
        credentials: 'include',
    })
    const { data: { wbi_img: { img_url, sub_url } } } = await res.json()

    return {
      img_key: img_url.slice(
        img_url.lastIndexOf('/') + 1,
        img_url.lastIndexOf('.')
      ),
      sub_key: sub_url.slice(
        sub_url.lastIndexOf('/') + 1,
        sub_url.lastIndexOf('.')
      )
    }
  }

  // 为请求参数进行 wbi 签名
  function encWbi(params, returnObj = false) {
    const mixin_key = getMixinKey(img_key + sub_key),
      curr_time = Math.round(Date.now() / 1000),
      chr_filter = /[!'()*]/g;

    Object.assign(params, { wts: curr_time }) // 添加 wts 字段
    // 按照 key 重排参数
    const query = Object
      .keys(params)
      .sort()
      .map(key => {
        // 过滤 value 中的 "!'()*" 字符
        const value = params[key].toString().replace(chr_filter, '')
        return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
      })
      .join('&')
    const wbi_sign = md5(query + mixin_key) // 计算 w_rid
    if (returnObj) {
      Object.assign(params, { w_rid: wbi_sign })
      return params
    }
    return query + '&w_rid=' + wbi_sign
  }
  /* eslint-enable */
  // endregion

  // region b站的一些api
  function getTaskInfo() {
    let url;
    if (newApi) {
      const params = {
        task_id: taskId,
        web_location: webLocation,
      };
      const query = encWbi(params);
      url = `https://api.bilibili.com/x/activity_components/mission/info?${query}`;
    } else {
      const params = {
        csrf: csrfToken,
        id: taskId,
        web_location: webLocation,
      };
      const query = encWbi(params);
      url = `https://api.bilibili.com/x/activity/mission/single_task?${query}`;
    }

    return fetch(url, {
      credentials: 'include',
      headers: {
        Accept: 'application/json, text/plain, */*',
      },
    });
  }

  function postReceive() {
    let url;
    let data;
    if (newApi) {
      url = 'https://api.bilibili.com/x/activity_components/mission/receive';
      data = {
        task_id: taskId,
        activity_id: activityId,
        activity_name: activityName,
        task_name: taskName,
        reward_name: rewardName,
        gaia_vtoken: '',
        receive_from: 'missionPage',
        csrf: csrfToken,
      };
    } else {
      url = 'https://api.bilibili.com/x/activity/mission/task/reward/receive';
      data = {
        act_id: activityId,
        act_name: activityName,
        csrf: csrfToken,
        gaia_vtoken: '',
        group_id: 0,
        receive_from: 'missionPage',
        receive_id: receiveId,
        reward_name: rewardName,
        task_id: taskIdReceive,
        task_name: taskName,
      };
    }

    data = encWbi(data, true);

    return fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json, text/plain, */*',
      },
      body: new URLSearchParams(data),
    });
  }
  // endregion

  // region 修改详细信息相关
  function modifyBiliInfoPanelTask(status) {
    const infoPanel = document.querySelector('.bili-task');
    infoPanel.innerText = status;
  }

  function modifyBiliInfoPanelStock(status) {
    const infoPanel = document.querySelector('.bili-stock_remain');
    infoPanel.innerText = status;
  }

  function modifyBiliInfoPanel(status) {
    const infoPanel = document.querySelector('.bili-status');
    infoPanel.innerText = status;
  }

  function modifyBiliInfoPanelCaptcha(status) {
    const infoPanel = document.querySelector('.bili-captcha');
    infoPanel.innerText = status;
  }
  // endregion

  // region 功能拆分
  function checkCaptchaStatus() {
    const waitTimer = setInterval(() => {
      if (!(activityId === undefined)) {
        clearInterval(waitTimer);
        postReceive().then((response) => {
          if (response.status === 200) {
            response.json().then((data) => {
              const statusCode = data.code;
              if (statusCode === 202101) {
                alert('当前账号行为异常，无法领奖');
              } else if (statusCode === 202102) {
                log('风控系统异常');
              } else if (statusCode === 202100) {
                modifyBiliInfoPanelCaptcha('需要过验证码');
              } else {
                modifyBiliInfoPanelCaptcha('好了');
              }
            });
          }
        });
      }
    }, queryInterval);
  }

  function initData() {
    /* eslint-disable */
    getWbiKeys().then(keys => {
      img_key = keys.img_key
      sub_key = keys.sub_key
    });
    /* eslint-enable */
    if (newApi) {
      const receiveIdTimer = setInterval(() => {
        getTaskInfo().then((response) => {
          if (response.status === 200) {
            response.json().then((data) => {
              if (data.code !== 0) return;
              const stockInfo = data.data.stock_info;
              const Stock = `总：${stockInfo.total_stock}% 今日：${stockInfo.day_stock}%`;
              modifyBiliInfoPanelTask('N/A');
              modifyBiliInfoPanelStock(Stock);
              activityId = data.data.act_id;
              activityName = data.data.act_name;
              taskName = data.data.task_name;
              rewardName = data.data.reward_info.award_name;
              clearInterval(receiveIdTimer);
            });
          }
        });
      }, queryInterval);
      return;
    }
    const receiveIdTimer = setInterval(() => {
      getTaskInfo().then((response) => {
        if (response.status === 200) {
          response.json().then((data) => {
            if (data.code !== 0) return;
            const taskInfo = data.data.task_info;
            const groupList = taskInfo.group_list[0];
            const taskProgress = `${groupList.group_complete_num}/${groupList.group_base_num}`;
            const remainStock = taskInfo.reward_period_stock_num;
            modifyBiliInfoPanelTask(taskProgress);
            modifyBiliInfoPanelStock(remainStock);
            activityId = data.data.act_info.id;
            activityName = data.data.act_info.act_name;
            taskName = taskInfo.task_name;
            rewardName = taskInfo.reward_info.reward_name;
            receiveId = taskInfo.receive_id;
            taskIdReceive = taskInfo.id;
            clearInterval(receiveIdTimer);
          });
        }
      });
    }, queryInterval);
  }

  function addExtras() {
    const noticeWarp = document.querySelector('.tool-wrap');
    const infoPanel = document.createElement('div');
    infoPanel.className = 'task-progress-tip';
    let baseInfo = `<div style="margin-bottom: 10px;">抢码开始时间：${GM_getValue('gh_start_time')}</div>
        <div style="margin-bottom: 10px;">抢码间隔：${GM_getValue('gh_interval')} 毫秒</div>`;
    if (GM_getValue('gh_biliExtraInfo')) {
      if (!newApi) {
        baseInfo += `<div style="margin-bottom: 10px;">
          任务完成情况：
          <span className="bili-task">
          获取中
          </span>
        </div>`;
      }
      baseInfo += `
        <div style="margin-bottom: 10px;">
          剩余库存：
          <span class="bili-stock_remain">
          获取中
          </span>
        </div>
        <div style="margin-bottom: 10px;">
          验证码状态：
          <span class="bili-captcha">
          获取中
          </span>
        </div>`;
    }
    baseInfo += `<div style="margin-bottom: 10px;">
          当前状态：
          <span class="bili-status">
          等待开始
          </span>
        </div>`;
    infoPanel.innerHTML = baseInfo;
    noticeWarp.appendChild(infoPanel);

    if (GM_getValue('gh_biliExtraButton')) {
      if (GM_getValue('gh_biliExtraInfo')) {
        const checkCaptchaButton = document.createElement('button');
        checkCaptchaButton.innerText = '检查验证码状态';
        checkCaptchaButton.className = 'button exchange-button';
        checkCaptchaButton.onclick = () => {
          checkCaptchaStatus();
        };
        noticeWarp.appendChild(checkCaptchaButton);
      }
      const summonCaptchaButton = document.createElement('button');
      summonCaptchaButton.innerText = '手动抢一次->召唤验证码';
      summonCaptchaButton.className = 'button exchange-button';
      summonCaptchaButton.onclick = () => { document.querySelector('.exchange-button').click(); };
      noticeWarp.appendChild(summonCaptchaButton);
      const manualStartButton = document.createElement('button');
      manualStartButton.innerText = '手动开抢';
      manualStartButton.className = 'button exchange-button';
      manualStartButton.onclick = () => { manualStart = true; };
      noticeWarp.appendChild(manualStartButton);
    }

    if (GM_getValue('gh_biliExtraInfo')) {
      initData();
      checkCaptchaStatus();
    }
  }

  // 抢码进程
  function runRobProcess() {
    // 变量初始化
    const startTime = GM_getValue('gh_start_time').split(':');
    const startHour = parseInt(startTime[0], 10);
    const startMin = parseInt(startTime[1], 10);
    const startSec = parseInt(startTime[2], 10);

    log(`助手计划于${startHour}点${startMin}分${startSec}秒开始领取奖励`);

    let robTimer = null;

    function startRob() {
      if (!robTimer) {
        const selector = document.querySelector('.exchange-button');
        modifyBiliInfoPanel('开抢中');
        robTimer = setInterval(() => {
          selector.click();
        }, GM_getValue('gh_interval'));
      }
    }

    // 抢码实现
    function rob() {
      startRob();
      let remainStock = 0;
      if (GM_getValue('gh_biliExtraInfo')) {
        const receiveIdTimer = setInterval(() => {
          if (newApi) {
            getTaskInfo()
              .then((response) => {
                if (response.status === 200) {
                  response.json()
                    .then((data) => {
                      if (data.code !== 0) return;
                      const stockInfo = data.data.stock_info;
                      const Stock = `总：${stockInfo.total_stock}% 今日：${stockInfo.day_stock}%`;
                      modifyBiliInfoPanelStock(Stock);
                      const statusCode = data.data.status;
                      if (statusCode === 7) {
                        modifyBiliInfoPanel('任务还未完成');
                      } else if (statusCode === 0) {
                        modifyBiliInfoPanel('任务已完成，在抢了');
                      } else if (statusCode === 6) {
                        clearInterval(receiveIdTimer);
                        clearInterval(robTimer);
                        modifyBiliInfoPanel('抢到了');
                      }
                      if (stockInfo.day_stock === 0 && remainStock !== 0) {
                        clearInterval(receiveIdTimer);
                        clearInterval(robTimer);
                        modifyBiliInfoPanel('寄');
                      }
                      remainStock = stockInfo.day_stock;
                    });
                }
              });
            return;
          }

          getTaskInfo()
            .then((response) => {
              if (response.status === 200) {
                response.json()
                  .then((data) => {
                    if (data.code !== 0) return;
                    const taskInfo = data.data.task_info;
                    const groupList = taskInfo.group_list[0];
                    modifyBiliInfoPanelTask(`${groupList.group_complete_num}/${groupList.group_base_num}`);
                    const receiveStatus = taskInfo.receive_status;
                    if (receiveStatus === 0) {
                      modifyBiliInfoPanel('任务还未完成');
                    } else if (receiveStatus === 1) {
                      modifyBiliInfoPanel('任务已完成，在抢了');
                    } else if (receiveStatus === 3) {
                      clearInterval(receiveIdTimer);
                      clearInterval(robTimer);
                      modifyBiliInfoPanel('抢到了');
                    }
                    if (taskInfo.reward_period_stock_num === 0 && remainStock !== 0) {
                      clearInterval(receiveIdTimer);
                      clearInterval(robTimer);
                      modifyBiliInfoPanel('寄');
                    }
                    remainStock = taskInfo.reward_period_stock_num;
                    modifyBiliInfoPanelStock(remainStock);
                  });
              }
            });
        }, queryInterval);
      }
    }
    // 等待开抢
    const timer = setInterval(() => {
      const date = new Date();
      if (manualStart || (date.getHours() === startHour && date.getMinutes() === startMin && date.getSeconds() >= startSec)) {
        clearInterval(timer);
        rob();
      }
    }, 100);
  }
  // endregion

  // Run
  log('助手开始运行');
  addExtras();
  runRobProcess();
}());
